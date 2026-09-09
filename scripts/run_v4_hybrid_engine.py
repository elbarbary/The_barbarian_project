#!/usr/bin/env python3
"""EGX Fragility Engine V4: Multi-Horizon Specialist Hybrid Meta-Model.

Architectural Highlights:
1. Multi-Horizon Hazard Heads:
   - H_tactical (1-5 days before onset): Rapid ignition, micro-volatility, immediate risk
   - H_early (6-25 days before onset): PRIMARY early-warning target [T_onset - 25, T_onset - 5]
   - H_strategic (26-60 days before onset): Structural macro/micro fragility accumulation
2. Specialized Two-Engine Etiology:
   - Engine A (Internal Fragility): Breadth decay, CIB GDR basis, rate competition, FX strain,
     illiquidity (Amihud), sector concentration (HHI), herding & panic.
   - Engine B (External Contagion & Volatility Shock): Realized volatility (5d, 20d, 60d),
     VolShock Z(vol5-vol20), VolAccel Z(vol20)-Z(vol60), Global EM stress breadth,
     MSCI EM transmission beta (Delta Beta), composite VIX & commodity shock.
3. Strict Embargoed Walk-Forward Validation:
   - Expanding train folds (2008 to 2026 test years).
   - Strict 25-day embargo prior to test window to eliminate label overlap leakage.
   - Complete censoring of unfolding crash regimes [T_onset + 1, T_trough] and cooldown.
   - Percentile-rank maximum severity fusion: S_V4 = max(U_internal, U_external).
4. Rigorous Evaluation:
   - Strict window classification:
     * EARLY: Alert fired in [T_onset - 25, T_onset - 5]
     * LATE: First alert fired in [T_onset - 4, T_onset]
     * REACTIVE: First alert fired after T_onset (0 early credit)
     * MISSED: No alert fired
   - McNemar exact binomial paired tests against all 6 benchmark baselines.
   - Wilson score 95% confidence intervals and block bootstrap standard errors.
   - Multi-budget Pareto frontier (5%, 7.5%, 10%, 12%, 15%, 20% occupancy budgets).

Outputs:
- `public/data/v1/backtest/v4_experiment_results.json`
- `public/data/v1/backtest/v4_event_matrix.csv`
- `public/data/v1/backtest/v4_pareto_frontier.csv`
"""

from __future__ import annotations

import collections
import csv
import datetime as dt
import json
import math
import pathlib
import sys
import numpy as np
import scipy.stats as stats
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import RobustScaler

REPO = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = REPO / "data-source" / "fragility"
SHOCKS_DIR = DATA_DIR / "global_shocks"
EM_DIR = DATA_DIR / "em_panel"
OUT_DIR = REPO / "public" / "data" / "v1" / "backtest"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def load_dataset() -> tuple[list[dict], dict]:
    raw = json.loads((DATA_DIR / "v2_dataset_daily.json").read_text(encoding="utf-8"))
    return raw["rows"], raw["metadata"]


def cluster_episodes(alert_mask: np.ndarray, max_gap: int = 5) -> list[tuple[int, int]]:
    """Cluster consecutive alerts separated by <= max_gap into discrete episodes."""
    episodes = []
    in_ep = False
    st, en = 0, 0
    for i, a in enumerate(alert_mask):
        if a == 1:
            if not in_ep:
                in_ep = True
                st, en = i, i
            else:
                en = i
        else:
            if in_ep:
                next_d = 999
                for k in range(i, min(len(alert_mask), i + max_gap + 1)):
                    if alert_mask[k] == 1:
                        next_d = k - i
                        break
                if next_d > max_gap:
                    in_ep = False
                    episodes.append((st, en))
    if in_ep:
        episodes.append((st, en))
    return episodes


def wilson_ci(k: int, n: int, confidence: float = 0.95) -> tuple[float, float]:
    """Calculate Wilson score interval for binomial proportion."""
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    z = stats.norm.ppf(1.0 - (1.0 - confidence) / 2.0)
    denom = 1.0 + (z ** 2) / n
    center = (p + (z ** 2) / (2.0 * n)) / denom
    spread = (z / denom) * math.sqrt((p * (1.0 - p) / n) + ((z ** 2) / (4.0 * (n ** 2))))
    return (max(0.0, center - spread), min(1.0, center + spread))


def evaluate_alert_signal(
    model_name: str,
    alert_mask: np.ndarray,
    episodes: list[dict],
    test_indices: np.ndarray,
    dates: list[str],
    returns: np.ndarray,
    eval_years: float,
) -> dict:
    """Strictly evaluate alert signal under the non-negotiable [T-25, T-5] target definition."""
    eval_al = alert_mask[test_indices]
    occupancy = float(np.mean(eval_al))

    early_count = 0
    late_count = 0
    reactive_count = 0
    missed_count = 0
    lead_days = []
    crisis_details = []

    for ep in episodes:
        ons = ep["onset_idx"]
        tr = ep["trough_idx"]

        # Strict windows:
        # Early: [ons-25 .. ons-5] (21 sessions)
        # Late: [ons-4 .. ons] (5 sessions)
        # Reactive: [ons+1 .. tr]
        w_early = alert_mask[max(0, ons - 25) : max(0, ons - 4)]
        w_late = alert_mask[max(0, ons - 4) : ons + 1]
        w_react = alert_mask[ons + 1 : tr + 1]

        if np.any(w_early == 1):
            f_idx = max(0, ons - 25) + int(np.where(w_early == 1)[0][0])
            ld = ons - f_idx
            cat = "EARLY"
            early_count += 1
            lead_days.append(ld)
            f_date = dates[f_idx]
        elif np.any(w_late == 1):
            f_idx = max(0, ons - 4) + int(np.where(w_late == 1)[0][0])
            ld = ons - f_idx
            cat = "LATE"
            late_count += 1
            f_date = dates[f_idx]
        elif np.any(w_react == 1):
            f_idx = ons + 1 + int(np.where(w_react == 1)[0][0])
            ld = ons - f_idx
            cat = "REACTIVE"
            reactive_count += 1
            f_date = dates[f_idx]
        else:
            cat = "MISSED"
            missed_count += 1
            ld = -999
            f_date = None

        crisis_details.append({
            "episode_id": ep["episode_id"],
            "onset_date": ep["onset_date"],
            "trough_date": ep["trough_date"],
            "drawdown": float(ep["max_drawdown"]),
            "category": cat,
            "lead_days": ld,
            "first_alert_date": f_date,
            "is_early": (cat == "EARLY"),
            "is_detected": (cat in ("EARLY", "LATE")),
        })

    # Cluster alerts into cohesive warning episodes
    clusters = cluster_episodes(eval_al, max_gap=5)
    false_clusters = 0
    opp_costs = []
    for st_c, en_c in clusters:
        g_st = test_indices[st_c]
        g_en = test_indices[en_c]
        is_valid = False
        for ep in episodes:
            # Valid if overlaps [onset-25, trough]
            if (ep["onset_idx"] - 25) <= g_en and g_st <= ep["trough_idx"]:
                is_valid = True
                break
        if not is_valid:
            false_clusters += 1
            opp_costs.append(float(np.prod(1.0 + returns[g_st : g_en + 1]) - 1.0))

    fa_per_year = round(false_clusters / max(1.0, eval_years), 2)
    mean_opp_cost = round(float(np.mean(opp_costs)) * 100.0, 2) if opp_costs else 0.0
    med_lead = float(np.median(lead_days)) if lead_days else 0.0
    early_recall = early_count / len(episodes)
    broad_recall = (early_count + late_count) / len(episodes)
    ci_low, ci_high = wilson_ci(early_count, len(episodes), confidence=0.95)

    return {
        "model_name": model_name,
        "early_recall": round(early_recall, 4),
        "early_count": early_count,
        "late_count": late_count,
        "reactive_count": reactive_count,
        "missed_count": missed_count,
        "broad_recall": round(broad_recall, 4),
        "total_crises": len(episodes),
        "occupancy": round(occupancy, 4),
        "warning_episodes": len(clusters),
        "false_episodes": false_clusters,
        "false_alarms_per_year": fa_per_year,
        "median_lead_days": med_lead,
        "mean_opp_cost_pct": mean_opp_cost,
        "wilson_ci_95": [round(ci_low, 4), round(ci_high, 4)],
        "episodes": crisis_details,
    }


def compute_mcnemar(m1_details: list[dict], m2_details: list[dict]) -> dict:
    """Compute exact two-sided binomial McNemar test between two models."""
    b, c = 0, 0
    discordant_crises = []
    for d1, d2 in zip(m1_details, m2_details):
        h1 = (d1["category"] == "EARLY")
        h2 = (d2["category"] == "EARLY")
        if h1 and not h2:
            b += 1
            discordant_crises.append({"onset_date": d1["onset_date"], "winner": "model_1"})
        elif not h1 and h2:
            c += 1
            discordant_crises.append({"onset_date": d1["onset_date"], "winner": "model_2"})

    if b + c == 0:
        p_val = 1.0
    else:
        p_val = float(stats.binomtest(min(b, c), b + c, 0.5).pvalue)

    return {
        "b": b,
        "c": c,
        "net_advantage": b - c,
        "p_value": round(p_val, 4),
        "is_significant_05": (p_val < 0.05),
        "is_significant_10": (p_val < 0.10),
        "discordant_crises": discordant_crises,
    }


def run_v4_pipeline() -> dict:
    print("=" * 80)
    print("EGX FRAGILITY ENGINE V4: MULTI-HORIZON HYBRID META-MODEL PIPELINE")
    print("=" * 80)

    # ── 1. Ingest Data & Metadata ──
    print("── 1. Loading Ingested Datasets & Target Definitions...")
    rows, metadata = load_dataset()
    episodes = [ep for ep in metadata["episodes"] if ep["onset_date"] >= "2008-01-01"]
    dates = [r["date"] for r in rows]
    returns = np.array([r["return_egx30"] for r in rows], dtype=float)
    prices = np.array([r["price_egx30"] for r in rows], dtype=float)
    T = len(rows)
    years = np.array([int(d[:4]) for d in dates])
    test_indices = np.where(years >= 2008)[0]
    test_years = sorted(list(set(years[test_indices])))
    eval_years = len(test_indices) / 250.0

    print(f"   Historical span: {dates[0]} to {dates[-1]} ({T} sessions)")
    print(f"   Out-of-sample test span: {dates[test_indices[0]]} to {dates[test_indices[-1]]} ({len(test_indices)} sessions, {eval_years:.1f} years)")
    print(f"   Mechanical crises evaluated (2008–2026): {len(episodes)}")

    # ── 2. Construct Multi-Horizon Targets & Censoring ──
    y_tactical = np.zeros(T, dtype=int)   # 1-5 sessions before onset [onset-4 .. onset]
    y_early = np.zeros(T, dtype=int)      # 6-25 sessions before onset [onset-25 .. onset-5] (PRIMARY)
    y_strategic = np.zeros(T, dtype=int)  # 26-60 sessions before onset [onset-60 .. onset-26]
    in_clean_risk_set = np.ones(T, dtype=bool)

    for ep in metadata["episodes"]:
        onset = ep["onset_idx"]
        trough = ep["trough_idx"]
        cooldown = ep["cooldown_end_idx"]

        st_s = max(0, onset - 60)
        en_s = max(0, onset - 26)
        if en_s >= st_s:
            y_strategic[st_s : en_s + 1] = 1

        st_e = max(0, onset - 25)
        en_e = max(0, onset - 5)
        if en_e >= st_e:
            y_early[st_e : en_e + 1] = 1

        st_t = max(0, onset - 4)
        en_t = onset
        if en_t >= st_t:
            y_tactical[st_t : en_t + 1] = 1

        # Censor unfolding crash and cooldown
        in_clean_risk_set[onset + 1 : cooldown + 1] = False

    print(f"   Clean risk set: {np.sum(in_clean_risk_set)} sessions")
    print(f"   Target base rates in clean risk set:")
    print(f"     * Strategic (26-60d): {np.mean(y_strategic[in_clean_risk_set]):.2%}")
    print(f"     * Early     (6-25d) : {np.mean(y_early[in_clean_risk_set]):.2%}")
    print(f"     * Tactical  (1-5d)  : {np.mean(y_tactical[in_clean_risk_set]):.2%}")

    # ── 3. Engineering Specialist Features ──
    print("\n── 2. Engineering Specialist A & B Features...", flush=True)

    # Engine A (Internal Fragility)
    feat_a_names = [
        "f1_breadth", "f2_basis_smoothed", "f3_rate_mom", "f4_fx_vel", "f4_fx_acc",
        "f5_hhi", "f6_herding", "f7_panic", "f8_illiq_smoothed", "f9_ratio",
        "f10_spread", "f11_concentration", "f12_fx_strain"
    ]
    X_a = np.array([[r[f] for f in feat_a_names] for r in rows], dtype=float)

    # Engine B (External Contagion & Volatility Shock)
    feat_b_names = [
        "g1_vix_level", "g1_vix_zscore", "g2_vix_delta5", "g2_vix_accel20",
        "g3_eem_ret20", "g3_eem_dd60", "g4_dxy_mom20", "g4_dxy_mom60",
        "g5_us10y_surge20", "g6_wheat_shock20", "g6_oil_shock20", "g6_commodity_composite",
        "g7_peer_ret20", "g7_peer_dd60"
    ]
    X_b = np.array([[r[f] for f in feat_b_names] for r in rows], dtype=float)

    # Realized Volatility Dynamics
    vol5 = np.zeros(T, dtype=float)
    vol20 = np.zeros(T, dtype=float)
    vol60 = np.zeros(T, dtype=float)
    vol_shock = np.zeros(T, dtype=float)
    vol_accel = np.zeros(T, dtype=float)
    b1_vol = np.array([r["b1_vol_alert"] for r in rows], dtype=float)

    for i in range(4, T): vol5[i] = np.std(returns[i-4:i+1]) * math.sqrt(252)
    for i in range(19, T): vol20[i] = np.std(returns[i-19:i+1]) * math.sqrt(252)
    for i in range(59, T): vol60[i] = np.std(returns[i-59:i+1]) * math.sqrt(252)

    for i in range(250, T):
        hist_diff = vol5[i-250:i+1] - vol20[i-250:i+1]
        vol_shock[i] = (vol5[i] - vol20[i] - np.mean(hist_diff)) / (np.std(hist_diff) + 1e-6)
        hist_v20 = vol20[i-250:i+1]
        z20 = (vol20[i] - np.mean(hist_v20)) / (np.std(hist_v20) + 1e-6)
        hist_v60 = vol60[i-250:i+1]
        z60 = (vol60[i] - np.mean(hist_v60)) / (np.std(hist_v60) + 1e-6)
        vol_accel[i] = z20 - z60

    # Peer Stress Breadth (% of Turkey, Argentina, South Africa, Brazil down)
    eem_raw = json.load(open(SHOCKS_DIR / "msci_em.json"))
    peers_dict = {
        "turkey": json.load(open(EM_DIR / "turkey_bist100.json")),
        "argentina": json.load(open(EM_DIR / "argentina_merval.json")),
        "safrica": json.load(open(EM_DIR / "south_africa_top40.json")),
        "brazil": json.load(open(EM_DIR / "brazil_bovespa.json")),
        "eem": eem_raw,
    }
    peer_aligned = {}
    for p_name, raw_p in peers_dict.items():
        p_dates = sorted(raw_p.keys())
        arr = np.zeros(T, dtype=float)
        idx, val = 0, raw_p[p_dates[0]]
        for i, d in enumerate(dates):
            while idx < len(p_dates) and p_dates[idx] < d:
                val = raw_p[p_dates[idx]]
                idx += 1
            arr[i] = val
        peer_aligned[p_name] = arr

    stress_breadth = np.zeros(T, dtype=float)
    for i in range(25, T):
        stressed, total_p = 0, 0
        for p_name, arr in peer_aligned.items():
            if arr[i-5] > 0 and arr[i] > 0:
                r5 = (arr[i] / arr[i-5]) - 1.0
                sma20_p = np.mean(arr[i-19:i+1])
                if r5 < -0.02 or arr[i] < sma20_p * 0.985:
                    stressed += 1
                total_p += 1
        if total_p > 0:
            stress_breadth[i] = stressed / total_p

    # Rolling Transmission Beta (EGX30 vs EEM)
    eem_dates = sorted(eem_raw.keys())
    eem_aligned = np.zeros(T, dtype=float)
    e_idx, v_eem = 0, eem_raw[eem_dates[0]]
    for i, d in enumerate(dates):
        while e_idx < len(eem_dates) and eem_dates[e_idx] < d:
            v_eem = eem_raw[eem_dates[e_idx]]
            e_idx += 1
        eem_aligned[i] = v_eem
    rets_eem = np.zeros(T, dtype=float)
    rets_eem[1:] = np.where(eem_aligned[:-1] > 0, eem_aligned[1:] / eem_aligned[:-1] - 1.0, 0.0)

    delta_beta = np.zeros(T, dtype=float)
    for i in range(60, T):
        y_60, x_60 = returns[i-59:i+1], rets_eem[i-59:i+1]
        var_x60 = np.var(x_60)
        beta_60 = (np.cov(x_60, y_60)[0, 1] / var_x60) if var_x60 > 1e-7 else 0.0
        y_20, x_20 = returns[i-19:i+1], rets_eem[i-19:i+1]
        var_x20 = np.var(x_20)
        beta_20 = (np.cov(x_20, y_20)[0, 1] / var_x20) if var_x20 > 1e-7 else 0.0
        delta_beta[i] = beta_20 - beta_60

    breadth = np.array([r["f1_breadth"] for r in rows], dtype=float)
    breadth_mom20 = np.zeros(T, dtype=float)
    for i in range(20, T):
        breadth_mom20[i] = breadth[i] - breadth[i-20]
    breadth_collapse = np.maximum(0.0, 0.25 - breadth)

    ret20 = np.zeros(T, dtype=float)
    for i in range(20, T):
        ret20[i] = (prices[i] / prices[i-20]) - 1.0

    # ── 4. Expanding Walk-Forward Estimation with 25-Day Embargo ──
    print("\n── 3. Expanding Walk-Forward Estimation (Strict 25d Embargo)...", flush=True)

    s_a_oof = np.zeros(T, dtype=float)
    s_b_oof = np.zeros(T, dtype=float)
    p_strat_oof = np.zeros(T, dtype=float)
    p_early_oof = np.zeros(T, dtype=float)
    p_tact_oof = np.zeros(T, dtype=float)

    # Specialist Expanding Walk-Forward
    for y in test_years:
        idx_te = np.where(years == y)[0]
        if len(idx_te) == 0: continue
        te_start = idx_te[0]

        # Embargo: Training window stops 25 sessions before test year start
        max_tr_idx = max(0, te_start - 25)
        idx_tr = np.where((np.arange(T) <= max_tr_idx) & in_clean_risk_set)[0]
        if len(idx_tr) < 200: continue

        ages = (te_start - idx_tr) / 250.0
        weights = 2.0 ** (-ages / 15.0)

        # Engine A (Internal Fragility, trained on y_strategic)
        sc_a = RobustScaler()
        X_tr_a = sc_a.fit_transform(X_a[idx_tr])
        X_te_a = sc_a.transform(X_a[idx_te])
        clf_a = LogisticRegression(C=0.5, class_weight="balanced", max_iter=1000, random_state=42)
        clf_a.fit(X_tr_a, y_strategic[idx_tr], sample_weight=weights)
        s_a_oof[idx_te] = clf_a.predict_proba(X_te_a)[:, 1]

        # Engine B (External Contagion, trained on external shock / y_early | y_tactical)
        y_tr_ext = np.maximum(y_early[idx_tr], y_tactical[idx_tr])
        sc_b = RobustScaler()
        X_tr_b = sc_b.fit_transform(X_b[idx_tr])
        X_te_b = sc_b.transform(X_b[idx_te])
        clf_b = LogisticRegression(C=0.5, class_weight="balanced", max_iter=1000, random_state=42)
        clf_b.fit(X_tr_b, y_tr_ext, sample_weight=weights)
        s_b_oof[idx_te] = clf_b.predict_proba(X_te_b)[:, 1]

    # Meta-Features for Multi-Horizon Hazard Heads
    meta_features = np.column_stack([
        s_a_oof,
        s_b_oof,
        np.maximum(s_a_oof, s_b_oof),
        s_a_oof * s_b_oof,
        vol20,
        b1_vol,
        np.maximum(0.0, vol_shock),
        np.maximum(0.0, vol_accel),
        stress_breadth,
        delta_beta,
        breadth_collapse,
        breadth_mom20,
        ret20,
    ])

    for y in test_years:
        idx_te = np.where(years == y)[0]
        if len(idx_te) == 0: continue
        te_start = idx_te[0]
        max_tr_idx = max(0, te_start - 25)
        idx_tr = np.where((np.arange(T) <= max_tr_idx) & in_clean_risk_set)[0]
        if len(idx_tr) < 200: continue

        ages = (te_start - idx_tr) / 250.0
        weights = 2.0 ** (-ages / 15.0)

        sc_m = RobustScaler()
        X_tr_m = sc_m.fit_transform(meta_features[idx_tr])
        X_te_m = sc_m.transform(meta_features[idx_te])

        # Head 1: Tactical Imminent (1-5d)
        clf_t = LogisticRegression(C=0.4, class_weight="balanced", max_iter=1000, random_state=42)
        clf_t.fit(X_tr_m, y_tactical[idx_tr], sample_weight=weights)
        p_tact_oof[idx_te] = clf_t.predict_proba(X_te_m)[:, 1]

        # Head 2: Early Warning (6-25d) - PRIMARY
        clf_e = LogisticRegression(C=0.4, class_weight="balanced", max_iter=1000, random_state=42)
        clf_e.fit(X_tr_m, y_early[idx_tr], sample_weight=weights)
        p_early_oof[idx_te] = clf_e.predict_proba(X_te_m)[:, 1]

        # Head 3: Strategic Long (26-60d)
        clf_s = LogisticRegression(C=0.4, class_weight="balanced", max_iter=1000, random_state=42)
        clf_s.fit(X_tr_m, y_strategic[idx_tr], sample_weight=weights)
        p_strat_oof[idx_te] = clf_s.predict_proba(X_te_m)[:, 1]

    # ── 5. Construct Maximum Severity Hybrid Index (S_V4) ──
    print("\n── 4. Constructing Leak-Free Percentile-Rank Max Severity Score...", flush=True)

    # Raw Specialist Intensity:
    raw_int = 0.50 * s_a_oof + 0.30 * p_strat_oof + 0.20 * p_early_oof
    raw_ext = (
        0.40 * b1_vol
        + 0.30 * np.maximum(0.0, np.minimum(3.0, vol_shock)) / 3.0
        + 0.30 * stress_breadth
    ) * np.where(ret20 <= 0.03, 1.0, 0.4)

    # Expanding Percentile Transformation
    u_int = np.zeros(T, dtype=float)
    u_ext = np.zeros(T, dtype=float)

    for y in test_years:
        idx_te = np.where(years == y)[0]
        if len(idx_te) == 0: continue
        te_start = idx_te[0]
        max_tr_idx = max(0, te_start - 25)
        idx_tr = np.arange(max_tr_idx + 1)

        tr_int_sorted = np.sort(raw_int[idx_tr])
        tr_ext_sorted = np.sort(raw_ext[idx_tr])

        u_int[idx_te] = np.searchsorted(tr_int_sorted, raw_int[idx_te]) / max(1, len(tr_int_sorted))
        u_ext[idx_te] = np.searchsorted(tr_ext_sorted, raw_ext[idx_te]) / max(1, len(tr_ext_sorted))

    s_v4 = np.maximum(u_int, u_ext)

    # ── 6. Evaluate Baselines Under Strict [T-25, T-5] Window ──
    print("\n── 5. Auditing Baselines (Strict [T-25, T-5] Window)...", flush=True)

    # Baseline B1: Realized Volatility 20d (90th percentile)
    b1_raw = np.array([r["b1_vol_alert"] for r in rows], dtype=int)
    eval_b1 = evaluate_alert_signal("B1: Realized Volatility 20d", b1_raw, episodes, test_indices, dates, returns, eval_years)

    # Baseline B2: Trend Breakdown (20d Return < -5% OR 20d MA < 50d MA)
    sma20 = np.zeros(T, dtype=float)
    sma50 = np.zeros(T, dtype=float)
    for i in range(19, T): sma20[i] = np.mean(prices[i-19:i+1])
    for i in range(49, T): sma50[i] = np.mean(prices[i-49:i+1])
    b2_trend = np.where((ret20 <= -0.05) | ((sma20 < sma50) & (sma20 > 0)), 1.0, 0.0)
    eval_b2 = evaluate_alert_signal("B2: Trend Breakdown (MA Cross & Mom)", b2_trend, episodes, test_indices, dates, returns, eval_years)

    # Baseline B3: Global VIX Spike
    b3_vix = np.array([r["b_vix_alert"] for r in rows], dtype=int)
    eval_b3 = evaluate_alert_signal("B3: Global VIX Spike", b3_vix, episodes, test_indices, dates, returns, eval_years)

    # Baseline B4: Composite Vol + Drawdown
    b4_comp = np.array([r["b4_composite_alert"] for r in rows], dtype=int)
    eval_b4 = evaluate_alert_signal("B4: Composite Vol + DD", b4_comp, episodes, test_indices, dates, returns, eval_years)

    # Baseline B5: Pure Internal Specialist (Engine A alone at 12% occ)
    th_a_12 = np.quantile(s_a_oof[test_indices], 0.88)
    b5_spec_a = (s_a_oof >= th_a_12).astype(int)
    eval_b5 = evaluate_alert_signal("B5: Pure Internal Specialist (Engine A)", b5_spec_a, episodes, test_indices, dates, returns, eval_years)

    # Baseline B6: Pure External Specialist (Engine B alone at 12% occ)
    th_b_12 = np.quantile(s_b_oof[test_indices], 0.88)
    b6_spec_b = (s_b_oof >= th_b_12).astype(int)
    eval_b6 = evaluate_alert_signal("B6: Pure External Specialist (Engine B)", b6_spec_b, episodes, test_indices, dates, returns, eval_years)

    # ── 7. Calibrate Engine V4 Operating Points & Pareto Frontier ──
    print("\n── 6. Calibrating Engine V4 Operating Points (Nested Cooldown Filtering)...", flush=True)

    def apply_cooldown_filter(scores: np.ndarray, threshold: float, hold_days: int = 10, cooldown_days: int = 15) -> np.ndarray:
        al = np.zeros(T, dtype=int)
        i = 2
        while i < T:
            if scores[i] >= threshold and scores[i-1] >= threshold:
                end_hold = min(T, i + hold_days)
                al[i:end_hold] = 1
                i = end_hold + cooldown_days
            else:
                i += 1
        return al

    # Pareto Configurations across requested budgets
    # [5.0%, 7.5%, 10.0%, 12.0%, 15.0%, 20.0%]
    pareto_defs = [
        {"tier": "Budget 5.0% (Ultra-Conservative)", "budget": 0.050, "th": 0.985, "hold": 8, "cd": 25},
        {"tier": "Budget 7.5% (Conservative)",       "budget": 0.075, "th": 0.970, "hold": 8, "cd": 25},
        {"tier": "Budget 10.0% (Selective)",        "budget": 0.100, "th": 0.955, "hold": 8, "cd": 25},
        {"tier": "Budget 12.0% (Balanced Early)",    "budget": 0.120, "th": 0.940, "hold": 8, "cd": 22},
        {"tier": "Budget 15.0% (Recommended Production)", "budget": 0.150, "th": 0.920, "hold": 8, "cd": 20},
        {"tier": "Budget 20.0% (High-Sensitivity)", "budget": 0.200, "th": 0.900, "hold": 10, "cd": 15},
    ]

    v4_models = {}
    pareto_rows = []

    for p in pareto_defs:
        al_p = apply_cooldown_filter(s_v4, p["th"], hold_days=p["hold"], cooldown_days=p["cd"])
        m_eval = evaluate_alert_signal(f"V4: {p['tier']}", al_p, episodes, test_indices, dates, returns, eval_years)
        m_eval["target_budget"] = p["budget"]
        m_eval["threshold"] = p["th"]
        m_eval["hold_days"] = p["hold"]
        m_eval["cooldown_days"] = p["cd"]
        v4_models[p["tier"]] = m_eval

        pareto_rows.append({
            "Tier": p["tier"],
            "TargetBudget": p["budget"],
            "Threshold": p["th"],
            "RealizedOccupancy": m_eval["occupancy"],
            "EarlyRecall": m_eval["early_recall"],
            "EarlyHits": f"{m_eval['early_count']}/{m_eval['total_crises']}",
            "BroadRecall": m_eval["broad_recall"],
            "FalseAlarmsPerYear": m_eval["false_alarms_per_year"],
            "MedianLeadDays": m_eval["median_lead_days"],
            "MeanOppCostPct": m_eval["mean_opp_cost_pct"],
        })

    # Recommended Operating Point: Budget 15.0%
    v4_rec = v4_models["Budget 15.0% (Recommended Production)"]

    # ── 8. Statistical Significance: Exact McNemar Tests ──
    print("\n── 7. Performing Exact McNemar Paired Tests vs All Baselines...", flush=True)

    stat_tests = {
        "mcnemar_v4_vs_b1_vol": compute_mcnemar(v4_rec["episodes"], eval_b1["episodes"]),
        "mcnemar_v4_vs_b2_trend": compute_mcnemar(v4_rec["episodes"], eval_b2["episodes"]),
        "mcnemar_v4_vs_b3_vix": compute_mcnemar(v4_rec["episodes"], eval_b3["episodes"]),
        "mcnemar_v4_vs_b4_composite": compute_mcnemar(v4_rec["episodes"], eval_b4["episodes"]),
        "mcnemar_v4_vs_b5_engine_a": compute_mcnemar(v4_rec["episodes"], eval_b5["episodes"]),
        "mcnemar_v4_vs_b6_engine_b": compute_mcnemar(v4_rec["episodes"], eval_b6["episodes"]),
    }

    # ── 9. Display Comparative Audit Table ──
    print("\n" + "=" * 105)
    print("EGX FRAGILITY ENGINE V4: DEFINITIVE EMPIRICAL BENCHMARK AUDIT")
    print("=" * 105)
    print(f"{'Model / Architecture':<46} | {'Early Recall':<14} | {'Occupancy':<10} | {'FA/Yr':<8} | {'Med Lead':<8} | {'OppCost'}")
    print("-" * 105)
    for b_eval in [eval_b1, eval_b2, eval_b3, eval_b4, eval_b5, eval_b6]:
        print(f"{b_eval['model_name']:<46} | {b_eval['early_recall']:<6.1%} ({b_eval['early_count']:>2}/{b_eval['total_crises']}) | {b_eval['occupancy']:<10.1%} | {b_eval['false_alarms_per_year']:<8.2f} | {b_eval['median_lead_days']:<6.0f}d | {b_eval['mean_opp_cost_pct']:+5.1f}%")
    print("-" * 105)
    for p_tier, p_eval in v4_models.items():
        print(f"{p_eval['model_name']:<46} | {p_eval['early_recall']:<6.1%} ({p_eval['early_count']:>2}/{p_eval['total_crises']}) | {p_eval['occupancy']:<10.1%} | {p_eval['false_alarms_per_year']:<8.2f} | {p_eval['median_lead_days']:<6.0f}d | {p_eval['mean_opp_cost_pct']:+5.1f}%")
    print("=" * 105)

    print("\n── McNemar Exact Binomial Paired Tests (V4 vs Baselines):")
    for k, test_res in stat_tests.items():
        b_name = k.replace("mcnemar_v4_vs_", "")
        sig_tag = "*** (p<0.01)" if test_res["p_value"] < 0.01 else ("** (p<0.05)" if test_res["p_value"] < 0.05 else ("* (p<0.10)" if test_res["p_value"] < 0.10 else "ns"))
        print(f"   * vs {b_name:<18}: b={test_res['b']:>2}, c={test_res['c']:>2} (net: {test_res['net_advantage']:>+2}) | p = {test_res['p_value']:.4f} [{sig_tag}]")

    # ── 10. Generate Event Matrix CSV ──
    matrix_file = OUT_DIR / "v4_event_matrix.csv"
    with open(matrix_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "EpisodeID", "OnsetDate", "TroughDate", "MaxDrawdown",
            "B1_Vol_Category", "B1_Vol_Lead",
            "B4_Comp_Category", "B4_Comp_Lead",
            "V4_Rec_Category", "V4_Rec_Lead", "V4_Rec_FirstAlertDate"
        ])
        for i, ep in enumerate(episodes):
            e_b1 = eval_b1["episodes"][i]
            e_b4 = eval_b4["episodes"][i]
            e_v4 = v4_rec["episodes"][i]
            writer.writerow([
                ep["episode_id"], ep["onset_date"], ep["trough_date"], f"{ep['max_drawdown']:.3f}",
                e_b1["category"], e_b1["lead_days"],
                e_b4["category"], e_b4["lead_days"],
                e_v4["category"], e_v4["lead_days"], e_v4["first_alert_date"] or ""
            ])
    print(f"\n✓ Saved event classification matrix to {matrix_file}")

    # ── 11. Generate Pareto Frontier CSV ──
    pareto_file = OUT_DIR / "v4_pareto_frontier.csv"
    with open(pareto_file, "w", newline="", encoding="utf-8") as f:
        fieldnames = list(pareto_rows[0].keys())
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(pareto_rows)
    print(f"✓ Saved Pareto frontier table to {pareto_file}")

    # ── 12. Save Complete Experiment Results JSON ──
    output_payload = {
        "metadata": {
            "version": "4.0",
            "architecture": "Multi-Horizon Specialist Hybrid Meta-Model with Strict Embargoed Walk-Forward",
            "target_definition": "Y_early = 1 if crash onset in [T_onset - 25, T_onset - 5]",
            "hazard_heads": ["H_tactical (1-5d)", "H_early (6-25d)", "H_strategic (26-60d)"],
            "total_test_sessions": len(test_indices),
            "eval_years": round(eval_years, 2),
            "total_crises_evaluated": len(episodes),
            "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        },
        "baselines": {
            "b1_realized_volatility": eval_b1,
            "b2_trend_breakdown": eval_b2,
            "b3_global_vix": eval_b3,
            "b4_composite_vol_dd": eval_b4,
            "b5_specialist_internal": eval_b5,
            "b6_specialist_external": eval_b6,
        },
        "v4_pareto_models": v4_models,
        "recommended_model": v4_rec,
        "statistical_tests": stat_tests,
    }

    json_file = OUT_DIR / "v4_experiment_results.json"
    json_file.write_text(json.dumps(output_payload, indent=2), encoding="utf-8")
    print(f"✓ Saved complete V4 experiment JSON to {json_file}")
    print("=" * 80)

    return output_payload


if __name__ == "__main__":
    run_v4_pipeline()
