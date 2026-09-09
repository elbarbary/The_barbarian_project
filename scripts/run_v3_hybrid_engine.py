#!/usr/bin/env python3
"""EGX Fragility Engine V3: Specialist Hybrid Meta-Model.

Combines:
1. S_V2: Out-of-fold Strategic Internal Fragility (H=60, Engine A)
2. S_Vol: Realized Volatility Level (20d vol & B1 baseline indicator)
3. VolShock: Short-term Volatility Shock Z(vol5d - vol20d)
4. VolAccel: Intermediate Volatility Acceleration Z(vol20d) - Z(vol60d)
5. GlobalStressBreadth: Cross-market peer stress (% of peers down >2% or below 20DMA)
6. ShockTransmissionBeta: Rolling EGX vs EEM Beta Acceleration (Delta Beta)
7. BreadthCollapse: Domestic constituent breadth collapse (<25%) and 20d momentum
8. GlobalMacroShock: Composite VIX spike, Wheat price shock, and DXY surge
9. Specialist Interaction: S_V2 x VolShock and GlobalStressBreadth x S_Vol

Target:
- Dedicated Pre-Crash Early Warning: Y_early = 1 if crash onset is in [T_onset - 25, T_onset - 5]
- Drawdown and cooldown regimes strictly CENSORED from training risk set.

Persistence Filter:
- 2 consecutive sessions above threshold with positive score acceleration (S_t > S_{t-2}).
- 5-session debouncing / episode clustering.

Outputs:
- `public/data/v1/backtest/v3_experiment_results.json`
"""

from __future__ import annotations

import collections
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


def load_data() -> tuple[list[dict], dict]:
    raw = json.loads((DATA_DIR / "v2_dataset_daily.json").read_text(encoding="utf-8"))
    return raw["rows"], raw["metadata"]


def cluster_episodes(alert_mask: np.ndarray, max_gap: int = 5) -> list[tuple[int, int]]:
    """Group alerts separated by <= max_gap into cohesive warning episodes."""
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


def run_v3_hybrid_backtest() -> dict:
    print("── 1. Loading Ingested Datasets...")
    rows, metadata = load_data()
    episodes = [ep for ep in metadata["episodes"] if ep["onset_date"] >= "2008-01-01"]
    dates = [r["date"] for r in rows]
    returns = np.array([r["return_egx30"] for r in rows], dtype=float)
    T = len(rows)
    years = np.array([int(d[:4]) for d in dates])
    test_indices = np.where(years >= 2008)[0]
    test_years = sorted(list(set(years[test_indices])))
    eval_years = len(test_indices) / 250.0

    print(f"   Sessions: {T} ({dates[0]} to {dates[-1]})")
    print(f"   Test sessions: {len(test_indices)} ({test_years[0]} to {test_years[-1]}, {eval_years:.1f} years)")
    print(f"   Evaluated mechanical crises: {len(episodes)}")

    # ── 2. Constructing Dedicated Target (Y_early: 5 to 25 sessions prior to onset) ──
    y_early = np.zeros(T, dtype=int)
    y_imminent = np.zeros(T, dtype=int)
    in_clean_risk_set = np.ones(T, dtype=bool)

    for ep in metadata["episodes"]:
        onset = ep["onset_idx"]
        trough = ep["trough_idx"]
        cooldown = ep["cooldown_end_idx"]

        # Early window: [onset - 25 .. onset - 5]
        st_e = max(0, onset - 25)
        en_e = max(0, onset - 5)
        y_early[st_e:en_e+1] = 1

        # Imminent window: [onset - 4 .. onset]
        st_i = max(0, onset - 4)
        y_imminent[st_i:onset+1] = 1

        # Censor unfolding drawdown and cooldown
        in_clean_risk_set[onset+1:cooldown+1] = False

    print(f"   Clean risk set: {np.sum(in_clean_risk_set)} sessions (Base rate: {np.mean(y_early[in_clean_risk_set]):.2%})")

    # ── 3. Computing Engine A Out-of-Fold Specialist Score (S_V2) ──
    print("── 3. Generating Out-of-Fold Engine A (Internal Fragility) Scores...", flush=True)
    feat_a = [
        "f1_breadth", "f2_basis_smoothed", "f3_rate_mom", "f4_fx_vel", "f4_fx_acc",
        "f5_hhi", "f6_herding", "f7_panic", "f8_illiq_smoothed", "f9_ratio",
        "f10_spread", "f11_concentration", "f12_fx_strain"
    ]
    X_a = np.array([[r[f] for f in feat_a] for r in rows], dtype=float)
    mdd_60 = np.array([r["target_mdd_60"] for r in rows], dtype=float)

    s_v2_oof = np.zeros(T, dtype=float)
    for y in test_years:
        idx_tr = np.where((years < y) & in_clean_risk_set)[0]
        idx_te = np.where(years == y)[0]
        if len(idx_te) == 0:
            continue

        ages = y - years[idx_tr]
        weights = 2.0 ** (-ages / 15.0)
        theta = np.quantile(mdd_60[idx_tr], 0.88)
        y_tr_a = (mdd_60[idx_tr] >= theta).astype(int)

        sc_a = RobustScaler()
        X_tr_sc = sc_a.fit_transform(X_a[idx_tr])
        X_te_sc = sc_a.transform(X_a[idx_te])

        clf_a = LogisticRegression(C=0.5, class_weight="balanced", max_iter=1000, random_state=42)
        clf_a.fit(X_tr_sc, y_tr_a, sample_weight=weights)
        s_v2_oof[idx_te] = clf_a.predict_proba(X_te_sc)[:, 1]

    # ── 4. Engineering Meta-Features (Volatility Acceleration & Global Stress) ──
    print("── 4. Engineering Specialist Meta-Features...", flush=True)
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

    # Rolling Transmission Beta (EGX30 vs EEM)
    eem_raw = json.load(open(SHOCKS_DIR / "msci_em.json"))
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

    # Peer Stress Breadth
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
                sma20 = np.mean(arr[i-19:i+1])
                if r5 < -0.02 or arr[i] < sma20 * 0.985:
                    stressed += 1
                total_p += 1
        if total_p > 0:
            stress_breadth[i] = stressed / total_p

    breadth = np.array([r["f1_breadth"] for r in rows], dtype=float)
    breadth_mom20 = np.zeros(T, dtype=float)
    for i in range(20, T):
        breadth_mom20[i] = breadth[i] - breadth[i-20]
    breadth_collapse = np.maximum(0.0, 0.25 - breadth)

    vix_level = np.array([r["g1_vix_level"] for r in rows], dtype=float)
    vix_d5 = np.array([r["g2_vix_delta5"] for r in rows], dtype=float)
    wheat_shock = np.array([r["g6_wheat_shock20"] for r in rows], dtype=float)
    dxy_mom = np.array([r["g4_dxy_mom20"] for r in rows], dtype=float)

    global_macro_shock = (
        np.maximum(0.0, (vix_level - 20.0) / 10.0)
        + np.maximum(0.0, vix_d5 / 4.0)
        + np.maximum(0.0, wheat_shock / 0.15)
        + np.maximum(0.0, dxy_mom / 0.02)
    )

    meta_feats = np.column_stack([
        s_v2_oof,            # 1. Structural Fragility (V2)
        vol20,               # 2. Realized Volatility Level
        b1_vol,              # 3. High Volatility Regime
        vol_shock,           # 4. Volatility Shock Z(vol5 - vol20)
        vol_accel,           # 5. Volatility Acceleration Z(vol20) - Z(vol60)
        stress_breadth,      # 6. Global EM Stress Breadth
        delta_beta,          # 7. Transmission Beta Acceleration
        breadth_collapse,    # 8. Breadth Collapse (< 25%)
        breadth_mom20,       # 9. Breadth 20d Momentum
        global_macro_shock,  # 10. Composite Global Macro Shock
        s_v2_oof * vol_shock,# 11. Interaction: Fragility x Vol Shock
        stress_breadth * b1_vol # 12. Interaction: Global Stress x Local Vol
    ])

    # ── 5. Expanding Walk-Forward Meta-Model Training ──
    print("── 5. Training Walk-Forward Hybrid Meta-Model on Y_early...", flush=True)
    prob_v3 = np.zeros(T, dtype=float)

    for y in test_years:
        idx_tr = np.where((years < y) & in_clean_risk_set)[0]
        idx_te = np.where(years == y)[0]
        if len(idx_te) == 0:
            continue

        ages = y - years[idx_tr]
        weights = 2.0 ** (-ages / 15.0)

        sc_m = RobustScaler()
        X_tr_sc = sc_m.fit_transform(meta_feats[idx_tr])
        X_te_sc = sc_m.transform(meta_feats[idx_te])

        clf_meta = LogisticRegression(C=0.4, class_weight="balanced", max_iter=1000, random_state=42)
        clf_meta.fit(X_tr_sc, y_early[idx_tr], sample_weight=weights)
        prob_v3[idx_te] = clf_meta.predict_proba(X_te_sc)[:, 1]

    # ── 6. Persistence Filtering & Operational Threshold Calibration ──
    print("── 6. Calibrating Operating Points with Persistence Filtering...", flush=True)

    def apply_persistence(scores: np.ndarray, cutoff: float) -> np.ndarray:
        raw_al = (scores >= cutoff).astype(int)
        al = np.zeros(len(scores), dtype=int)
        for i in range(2, len(scores)):
            # 2 consecutive sessions above threshold + positive score acceleration
            if raw_al[i] == 1 and raw_al[i-1] == 1 and scores[i] > scores[i-2]:
                al[i] = 1
        return al

    def audit_alerts(model_label: str, alert_mask: np.ndarray) -> dict:
        eval_al = alert_mask[test_indices]
        occupancy = float(np.mean(eval_al))

        detected_count = 0
        early_count = 0
        reactive_count = 0
        missed_count = 0
        lead_days = []
        crisis_details = []

        for ep in episodes:
            onset_idx = ep["onset_idx"]
            trough_idx = ep["trough_idx"]
            window = alert_mask[max(0, onset_idx - 60):trough_idx + 1]

            if np.any(window == 1):
                detected_count += 1
                f_rel = int(np.where(window == 1)[0][0])
                f_idx = max(0, onset_idx - 60) + f_rel
                ld = onset_idx - f_idx
                lead_days.append(ld)

                if ld > 0:
                    cat = "EARLY"
                    early_count += 1
                elif ld == 0:
                    cat = "ON_TIME"
                    early_count += 1
                else:
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
                "drawdown": ep["max_drawdown"],
                "detected": (cat != "MISSED"),
                "first_alert_date": f_date,
                "lead_days": ld,
                "category": cat,
            })

        # Cluster alerts into cohesive warning episodes (max_gap=5)
        clusters = cluster_episodes(eval_al, max_gap=5)
        false_clusters = 0
        opp_costs = []
        for st_c, en_c in clusters:
            g_st = test_indices[st_c]
            g_en = test_indices[en_c]
            is_valid = False
            for ep in episodes:
                if (ep["onset_idx"] - 60) <= g_en and g_st <= ep["trough_idx"]:
                    is_valid = True
                    break
            if not is_valid:
                false_clusters += 1
                opp_costs.append(float(np.prod(1.0 + returns[g_st:g_en+1]) - 1.0))

        fa_per_year = round(false_clusters / max(1.0, eval_years), 2)
        mean_opp_cost = round(float(np.mean(opp_costs)) * 100, 2) if opp_costs else 0.0
        med_lead = float(np.median([l for l in lead_days if l >= 0])) if [l for l in lead_days if l >= 0] else 0.0

        return {
            "model_name": model_label,
            "recall": round(detected_count / len(episodes), 4),
            "early_recall": round(early_count / len(episodes), 4),
            "early_count": early_count,
            "reactive_count": reactive_count,
            "missed_count": missed_count,
            "total_crises": len(episodes),
            "occupancy": round(occupancy, 4),
            "warning_episodes": len(clusters),
            "false_episodes": false_clusters,
            "false_alarms_per_year": fa_per_year,
            "median_lead_days": med_lead,
            "mean_opp_cost_pct": mean_opp_cost,
            "episodes": crisis_details,
        }

    # Calibrate V3 at multiple budget tiers
    cuts = np.linspace(np.quantile(prob_v3[test_indices], 0.60), np.quantile(prob_v3[test_indices], 0.99), 400)

    def get_budget_alerts(target_occ: float) -> tuple[np.ndarray, float]:
        best_c = cuts[0]
        min_d = 999.0
        for c in cuts:
            al_c = apply_persistence(prob_v3[test_indices], c)
            occ = np.mean(al_c)
            if abs(occ - target_occ) < min_d:
                min_d = abs(occ - target_occ)
                best_c = c
        al_out = np.zeros(T, dtype=int)
        al_out[test_indices] = apply_persistence(prob_v3[test_indices], best_c)
        return al_out, best_c

    al_v3_10, cut_10 = get_budget_alerts(0.10)
    al_v3_12, cut_12 = get_budget_alerts(0.12)
    al_v3_14, cut_14 = get_budget_alerts(0.14)
    al_v3_15, cut_15 = get_budget_alerts(0.15)
    al_v3_18, cut_18 = get_budget_alerts(0.18)

    # Baselines
    b1_raw = np.array([r["b1_vol_alert"] for r in rows], dtype=int)
    b4_raw = np.array([r["b4_composite_alert"] for r in rows], dtype=int)
    bvix_raw = np.array([r["b_vix_alert"] for r in rows], dtype=int)

    audit_b1 = audit_alerts("Baseline B1: Realized Volatility", b1_raw)
    audit_b4 = audit_alerts("Baseline B4: Composite Vol+DD", b4_raw)
    audit_bvix = audit_alerts("Baseline VIX: Global VIX Spike", bvix_raw)

    audit_v3_10 = audit_alerts("V3 Hybrid: Tight Budget (10.0% Occ)", al_v3_10)
    audit_v3_12 = audit_alerts("V3 Hybrid: Conservative (12.0% Occ)", al_v3_12)
    audit_v3_14 = audit_alerts("V3 Hybrid: Balanced (14.0% Occ)", al_v3_14)
    audit_v3_15 = audit_alerts("V3 Hybrid: Theoretical Union (15.0% Occ)", al_v3_15)
    audit_v3_18 = audit_alerts("V3 Hybrid: High-Sensitivity (18.0% Occ)", al_v3_18)

    # Statistical Significance: McNemar Paired Tests
    def mcnemar(m1: dict, m2: dict) -> float:
        b, c = 0, 0
        for ep1, ep2 in zip(m1["episodes"], m2["episodes"]):
            d1, d2 = (ep1["category"] == "EARLY"), (ep2["category"] == "EARLY")
            if d1 and not d2: b += 1
            elif not d1 and d2: c += 1
        if b + c == 0: return 1.0
        return float(stats.binomtest(min(b, c), b + c, 0.5).pvalue)

    p_val_vs_b1 = mcnemar(audit_v3_15, audit_b1)
    p_val_vs_b4 = mcnemar(audit_v3_15, audit_b4)
    p_val_vs_bvix = mcnemar(audit_v3_15, audit_bvix)

    # Display Results
    print("\n" + "="*96)
    print("EGX FRAGILITY ENGINE V3: SPECIALIST HYBRID META-MODEL AUDIT")
    print("="*96)
    print(f"{'Model / Architecture':<44} | {'Early Recall':<12} | {'Occupancy':<10} | {'FA/Yr':<8} | {'Med Lead':<8} | {'OppCost'}")
    print("-" * 96)
    for m in [audit_b1, audit_b4, audit_bvix, audit_v3_10, audit_v3_12, audit_v3_14, audit_v3_15, audit_v3_18]:
        print(f"{m['model_name']:<44} | {m['early_recall']:<6.1%} ({m['early_count']}/{m['total_crises']}) | {m['occupancy']:<9.1%} | {m['false_alarms_per_year']:<8.2f} | {m['median_lead_days']:<6.0f}d | {m['mean_opp_cost_pct']:+5.1f}%")
    print("="*96)

    # Detailed Crisis Breakdown for V3 15% Model
    print("\n── Crisis-by-Crisis Audit for V3 Hybrid (15.0% Occupancy):")
    print(f"{'Onset Date':<12} | {'Drawdown':<8} | {'B1 (Vol)':<14} | {'B4 (Comp)':<14} | {'VIX Spike':<14} | {'V3 Hybrid (15%)'}")
    print("-" * 96)
    for i, ep in enumerate(episodes):
        d_on = ep["onset_date"]
        dd_str = f"{ep['max_drawdown']:.1%}"
        c_b1 = audit_b1["episodes"][i]
        c_b4 = audit_b4["episodes"][i]
        c_vix = audit_bvix["episodes"][i]
        c_v3 = audit_v3_15["episodes"][i]

        def fmt(c):
            if not c["detected"]: return "MISSED"
            return f"{c['category'][:5]} {c['lead_days']:>2}d"

        print(f"{d_on:<12} | {dd_str:<8} | {fmt(c_b1):<14} | {fmt(c_b4):<14} | {fmt(c_vix):<14} | {fmt(c_v3)}")

    # Save to JSON
    output_payload = {
        "metadata": {
            "version": "3.0",
            "architecture": "Specialist Hybrid Meta-Model with Persistence Filtering",
            "test_sessions": len(test_indices),
            "eval_years": round(eval_years, 2),
            "crises_count": len(episodes),
        },
        "models": {
            "b1_vol": audit_b1,
            "b4_composite": audit_b4,
            "b_vix": audit_bvix,
            "v3_hybrid_10pct": audit_v3_10,
            "v3_hybrid_12pct": audit_v3_12,
            "v3_hybrid_14pct": audit_v3_14,
            "v3_hybrid_15pct": audit_v3_15,
            "v3_hybrid_18pct": audit_v3_18,
        },
        "statistical_tests": {
            "mcnemar_v3_vs_b1_early_pvalue": p_val_vs_b1,
            "mcnemar_v3_vs_b4_early_pvalue": p_val_vs_b4,
            "mcnemar_v3_vs_bvix_early_pvalue": p_val_vs_bvix,
        }
    }

    out_file = OUT_DIR / "v3_experiment_results.json"
    out_file.write_text(json.dumps(output_payload, indent=2), encoding="utf-8")
    print(f"\n✓ Saved V3 results to {out_file}")
    return output_payload


if __name__ == "__main__":
    run_v3_hybrid_backtest()
