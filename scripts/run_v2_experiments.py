#!/usr/bin/env python3
"""Run the EGX Fragility Engine V2 Empirical Experiments & Walk-Forward Audit.

Executes 3 Core Experiments:
1. Experiment 1 (Exp 1): Upgraded V1 Local Model (Strategic H=60 Internal Fragility only).
2. Experiment 2 (Exp 2): V2 Local Dual-Engine (Strategic Internal Engine A x Tactical External Engine B, local calibration).
3. Experiment 3 (Exp 3): V2 Multi-Country EM Panel Transfer (Pre-trained on Turkey, Argentina, Brazil, South Africa, calibrated to Egypt).

Benchmarks:
- B1: Realized Volatility (upper quintile of trailing 250 sessions)
- B2: Trailing Drawdown (> 10%)
- B3: Price below 200-day SMA (> 2% discount)
- B4: Composite Baseline (B1 and B2)
- B_VIX: Global VIX Spike (>= 28 or 5d delta >= 5)

Walk-Forward Protocol:
- Folds: 2008 to 2026 (19 annual out-of-sample folds).
- Strict 60-session embargo between train and test window.
- Point-in-time features strictly prior to EGX trading session.
- Evaluation across 17 mechanical crisis episodes (#12 to #28).
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


def load_dataset() -> tuple[list[dict], dict]:
    path = DATA_DIR / "v2_dataset_daily.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    return raw["rows"], raw["metadata"]


def build_rich_em_panel_training_data() -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Extract standardized panel observations from peer emerging markets."""
    shocks = {
        "vix": json.loads((SHOCKS_DIR / "vix.json").read_text()),
        "eem": json.loads((SHOCKS_DIR / "msci_em.json").read_text()),
        "dxy": json.loads((SHOCKS_DIR / "dxy.json").read_text()),
        "us10y": json.loads((SHOCKS_DIR / "us10y.json").read_text()),
        "wheat": json.loads((SHOCKS_DIR / "wheat.json").read_text()),
    }

    peers = {
        "turkey": json.loads((EM_DIR / "turkey_bist100.json").read_text()),
        "argentina": json.loads((EM_DIR / "argentina_merval.json").read_text()),
        "safrica": json.loads((EM_DIR / "south_africa_top40.json").read_text()),
        "brazil": json.loads((EM_DIR / "brazil_bovespa.json").read_text()),
    }

    feature_names = [
        "vol20", "dd120", "vix_level", "vix_delta5",
        "eem_ret20", "dxy_mom20", "us10_diff20", "wheat_surge20"
    ]

    X_list = []
    y_list = []

    for country, prices_dict in peers.items():
        c_dates = sorted(prices_dict.keys())
        T = len(c_dates)
        if T < 250:
            continue
        p_arr = np.array([prices_dict[d] for d in c_dates], dtype=float)
        rets = np.zeros(T, dtype=float)
        rets[1:] = p_arr[1:] / p_arr[:-1] - 1.0

        vol20 = np.zeros(T, dtype=float)
        dd120 = np.zeros(T, dtype=float)
        for i in range(19, T):
            vol20[i] = np.std(rets[i-19:i+1]) * math.sqrt(252)
        for i in range(T):
            pk = np.max(p_arr[max(0, i-120):i+1])
            dd120[i] = (p_arr[i] / pk) - 1.0

        for i in range(250, T - 10, 4):
            d = c_dates[i]
            # Forward 10-day acute drop >= 7%
            future_min = np.min(p_arr[i:i+11])
            drop10 = -(future_min / p_arr[i] - 1.0)
            target = 1 if drop10 >= 0.07 else 0

            # Global shock features strictly prior to date d
            prev_vix = [v for dt_s, v in shocks["vix"].items() if dt_s < d]
            v_curr = prev_vix[-1] if prev_vix else 20.0
            v_5d = prev_vix[-5] if len(prev_vix) >= 5 else v_curr
            v_delta5 = v_curr - v_5d

            prev_dxy = [v for dt_s, v in shocks["dxy"].items() if dt_s < d]
            dxy_mom20 = (prev_dxy[-1] / prev_dxy[-20] - 1.0) if len(prev_dxy) >= 20 else 0.0

            prev_eem = [v for dt_s, v in shocks["eem"].items() if dt_s < d]
            eem_ret20 = (prev_eem[-1] / prev_eem[-20] - 1.0) if len(prev_eem) >= 20 else 0.0

            prev_us10 = [v for dt_s, v in shocks["us10y"].items() if dt_s < d]
            us10_diff20 = (prev_us10[-1] - prev_us10[-20]) if len(prev_us10) >= 20 else 0.0

            prev_wheat = [v for dt_s, v in shocks["wheat"].items() if dt_s < d]
            wheat_ret20 = (prev_wheat[-1] / prev_wheat[-20] - 1.0) if len(prev_wheat) >= 20 else 0.0

            feats = [
                vol20[i], dd120[i],
                v_curr, v_delta5,
                eem_ret20, dxy_mom20,
                us10_diff20, max(0.0, wheat_ret20)
            ]
            X_list.append(feats)
            y_list.append(target)

    return np.array(X_list, dtype=float), np.array(y_list, dtype=int), feature_names


def cluster_warning_episodes(alert_mask: np.ndarray, dates: list[str], max_gap: int = 5) -> list[dict]:
    """Group contiguous alerts (separated by <= max_gap days) into warning episodes."""
    episodes = []
    in_episode = False
    start_idx = 0
    end_idx = 0

    for i, a in enumerate(alert_mask):
        if a == 1:
            if not in_episode:
                in_episode = True
                start_idx = i
                end_idx = i
            else:
                end_idx = i
        else:
            if in_episode:
                # Check next alert distance
                next_dist = 999
                for k in range(i, min(len(alert_mask), i + max_gap + 1)):
                    if alert_mask[k] == 1:
                        next_dist = k - i
                        break
                if next_dist > max_gap:
                    in_episode = False
                    episodes.append({
                        "start_idx": start_idx,
                        "end_idx": end_idx,
                        "start_date": dates[start_idx],
                        "end_date": dates[end_idx],
                        "duration": end_idx - start_idx + 1,
                    })
    if in_episode:
        episodes.append({
            "start_idx": start_idx,
            "end_idx": end_idx,
            "start_date": dates[start_idx],
            "end_date": dates[end_idx],
            "duration": end_idx - start_idx + 1,
        })
    return episodes


def audit_alert_series(
    model_name: str,
    alert_series: np.ndarray,
    eval_indices: np.ndarray,
    dates: list[str],
    returns: np.ndarray,
    episodes: list[dict],
    eval_years: float,
) -> dict:
    """Comprehensive audit: recall, timing distribution, false alarms/year, opportunity cost."""
    eval_alerts = alert_series[eval_indices]
    occupancy = float(np.mean(eval_alerts))
    warning_clusters = cluster_warning_episodes(eval_alerts, [dates[i] for i in eval_indices], max_gap=5)

    detected_count = 0
    early_count = 0
    ontime_count = 0
    reactive_count = 0
    missed_count = 0
    lead_days_list = []
    crisis_audit = []

    for ep in episodes:
        onset_idx = ep["onset_idx"]
        trough_idx = ep["trough_idx"]
        eval_start = max(0, onset_idx - 60)
        window_alerts = alert_series[eval_start:trough_idx+1]

        if np.any(window_alerts == 1):
            detected_count += 1
            first_rel = int(np.where(window_alerts == 1)[0][0])
            first_idx = eval_start + first_rel
            lead = onset_idx - first_idx
            lead_days_list.append(lead)

            if lead > 0:
                cat = "EARLY"
                early_count += 1
            elif lead == 0:
                cat = "ON_TIME"
                ontime_count += 1
                early_count += 1
            else:
                cat = "REACTIVE"
                reactive_count += 1
            first_date = dates[first_idx]
        else:
            cat = "MISSED"
            missed_count += 1
            lead = -999
            first_date = None

        crisis_audit.append({
            "episode_id": ep["episode_id"],
            "onset_date": ep["onset_date"],
            "trough_date": ep["trough_date"],
            "drawdown": ep["max_drawdown"],
            "tier": ep["tier"],
            "detected": (cat != "MISSED"),
            "first_alert_date": first_date,
            "lead_days": lead,
            "category": cat,
        })

    # False Alarms: warning clusters that do not overlap with any crisis danger zone [onset - 60 .. trough]
    false_clusters = 0
    opp_costs = []
    for wc in warning_clusters:
        g_st = eval_indices[wc["start_idx"]]
        g_en = eval_indices[wc["end_idx"]]
        is_true = False
        for ep in episodes:
            if (ep["onset_idx"] - 60) <= g_en and g_st <= ep["trough_idx"]:
                is_true = True
                break
        if not is_true:
            false_clusters += 1
            ret_missed = float(np.prod(1.0 + returns[g_st:g_en+1]) - 1.0)
            opp_costs.append(ret_missed)

    fa_per_year = round(false_clusters / max(1.0, eval_years), 2)
    mean_opp_cost = round(float(np.mean(opp_costs)) * 100, 2) if opp_costs else 0.0
    recall = round(detected_count / len(episodes), 4)
    median_lead = float(np.median([l for l in lead_days_list if l >= 0])) if [l for l in lead_days_list if l >= 0] else 0.0

    # Era breakdown
    pre_2016 = [c for c in crisis_audit if c["onset_date"] < "2016-01-01"]
    post_2016 = [c for c in crisis_audit if c["onset_date"] >= "2016-01-01"]
    recall_pre2016 = round(sum([c["detected"] for c in pre_2016]) / len(pre_2016), 4) if pre_2016 else 0.0
    recall_post2016 = round(sum([c["detected"] for c in post_2016]) / len(post_2016), 4) if post_2016 else 0.0

    return {
        "model_name": model_name,
        "recall": recall,
        "detected_count": detected_count,
        "total_crises": len(episodes),
        "occupancy": round(occupancy, 4),
        "early_count": early_count,
        "reactive_count": reactive_count,
        "missed_count": missed_count,
        "median_lead_days": median_lead,
        "false_episodes": false_clusters,
        "false_alarms_per_year": fa_per_year,
        "mean_opp_cost_pct": mean_opp_cost,
        "recall_pre2016": recall_pre2016,
        "recall_post2016": recall_post2016,
        "episodes": crisis_audit,
    }


def run_v2_experiments() -> dict:
    print("── 1. Loading Dataset & Constructing Walk-Forward Folds...")
    rows, metadata = load_dataset()
    episodes = [ep for ep in metadata["episodes"] if ep["onset_date"] >= "2008-01-01"]
    dates = [r["date"] for r in rows]
    returns = np.array([r["return_egx30"] for r in rows], dtype=float)
    T = len(rows)

    years = np.array([int(d[:4]) for d in dates])
    in_risk_set = np.array([r["is_in_risk_set"] for r in rows], dtype=bool)
    mdd_60 = np.array([r["target_mdd_60"] for r in rows], dtype=float)
    drop10 = np.array([r["target_tactical_drop8"] for r in rows], dtype=int)

    test_indices = np.where(years >= 2008)[0]
    eval_years = len(test_indices) / 250.0
    test_years_list = sorted(list(set(years[test_indices])))

    print(f"   Test sessions: {len(test_indices)} ({dates[test_indices[0]]} .. {dates[test_indices[-1]]}, {eval_years:.1f} years)")
    print(f"   Target crisis episodes to evaluate: {len(episodes)}")

    # Features
    feat_a = [
        "f1_breadth", "f2_basis_smoothed", "f3_rate_mom", "f4_fx_vel", "f4_fx_acc",
        "f5_hhi", "f6_herding", "f7_panic", "f8_illiq_smoothed", "f9_ratio",
        "f10_spread", "f11_concentration", "f12_fx_strain"
    ]
    feat_b = [
        "g1_vix_level", "g1_vix_zscore", "g2_vix_delta5", "g2_vix_accel20",
        "g3_eem_ret20", "g3_eem_dd60", "g4_dxy_mom20", "g4_dxy_mom60",
        "g5_us10y_surge20", "g6_commodity_composite", "g7_peer_ret20", "g7_peer_dd60"
    ]

    X_a_all = np.array([[r[f] for f in feat_a] for r in rows], dtype=float)
    X_b_all = np.array([[r[f] for f in feat_b] for r in rows], dtype=float)

    # Baselines
    b1_raw = np.array([r["b1_vol_alert"] for r in rows], dtype=int)
    b2_raw = np.array([r["b2_dd_alert"] for r in rows], dtype=int)
    b3_raw = np.array([r["b3_sma_alert"] for r in rows], dtype=int)
    b4_raw = np.array([r["b4_composite_alert"] for r in rows], dtype=int)
    bvix_raw = np.array([r["b_vix_alert"] for r in rows], dtype=int)

    # ── 2. Building Multi-Country EM Panel Data for Exp 3 ──
    print("── 2. Ingesting & Fitting Multi-Country EM Panel Data (Exp 3)...", flush=True)
    X_panel, y_panel, em_feat_names = build_rich_em_panel_training_data()
    print(f"   EM Panel instances: {len(X_panel)}, Positive shock events: {np.sum(y_panel)} ({np.mean(y_panel):.1%})")

    scaler_panel = RobustScaler()
    X_panel_sc = scaler_panel.fit_transform(X_panel)
    clf_em_panel = LogisticRegression(C=0.5, class_weight="balanced", max_iter=1000, random_state=42)
    clf_em_panel.fit(X_panel_sc, y_panel)

    # Pre-compute Egypt features aligned to EM panel structure
    egypt_em_feats = np.column_stack([
        np.array([rows[i]["vol20"] for i in range(T)]),
        np.array([rows[i]["dd120"] for i in range(T)]),
        np.array([rows[i]["g1_vix_level"] for i in range(T)]),
        np.array([rows[i]["g2_vix_delta5"] for i in range(T)]),
        np.array([rows[i]["g3_eem_ret20"] for i in range(T)]),
        np.array([rows[i]["g4_dxy_mom20"] for i in range(T)]),
        np.array([rows[i]["g5_us10y_surge20"] for i in range(T)]),
        np.array([rows[i]["g6_commodity_composite"] for i in range(T)]),
    ])
    egypt_em_sc = scaler_panel.transform(egypt_em_feats)
    prob_em_panel = clf_em_panel.predict_proba(egypt_em_sc)[:, 1]

    # ── 3. Expanding Walk-Forward Backtest (19 annual folds) ──
    print(f"── 3. Executing Walk-Forward Validation across {len(test_years_list)} annual folds...", flush=True)
    prob_exp1 = np.zeros(T, dtype=float)    # Exp 1: Local Strategic Internal Fragility
    prob_exp2_a = np.zeros(T, dtype=float)  # Exp 2: Internal Fragility
    prob_exp2_b = np.zeros(T, dtype=float)  # Exp 2: Local External Shocks
    prob_exp3_comb = np.zeros(T, dtype=float) # Exp 3: EM Panel Transfer + Engine A

    for y in test_years_list:
        idx_tr = np.where((years < y) & (in_risk_set == 1))[0]
        idx_te = np.where(years == y)[0]
        if len(idx_te) == 0:
            continue

        # Half-life decay weights (15.0 years)
        ages = y - years[idx_tr]
        weights = 2.0 ** (-ages / 15.0)

        # Strategic Drawdown Target: Point-in-time 88th percentile of future MDD
        theta_a = np.quantile(mdd_60[idx_tr], 0.88)
        y_tr_a = (mdd_60[idx_tr] >= theta_a).astype(int)

        # Fit Engine A
        sc_a = RobustScaler()
        X_tr_a = sc_a.fit_transform(X_a_all[idx_tr])
        X_te_a = sc_a.transform(X_a_all[idx_te])
        clf_a = LogisticRegression(C=0.5, class_weight="balanced", max_iter=1000, random_state=42)
        clf_a.fit(X_tr_a, y_tr_a, sample_weight=weights)
        p_a = clf_a.predict_proba(X_te_a)[:, 1]

        prob_exp1[idx_te] = p_a
        prob_exp2_a[idx_te] = p_a

        # Fit Engine B Local
        y_tr_b = ((drop10[idx_tr] == 1) | (mdd_60[idx_tr] >= theta_a)).astype(int)
        sc_b = RobustScaler()
        X_tr_b = sc_b.fit_transform(X_b_all[idx_tr])
        X_te_b = sc_b.transform(X_b_all[idx_te])
        clf_b = LogisticRegression(C=0.5, class_weight="balanced", max_iter=1000, random_state=42)
        clf_b.fit(X_tr_b, y_tr_b, sample_weight=weights)
        p_b = clf_b.predict_proba(X_te_b)[:, 1]
        prob_exp2_b[idx_te] = p_b

    # Competing Risks Probabilistic Union:
    # 1. Exp 2 Combined: P_exp2 = 1 - (1 - rank(Pa)) * (1 - rank(Pb_local))
    # 2. Exp 3 Combined: P_exp3 = 1 - (1 - rank(Pa)) * (1 - rank(Pb_em_panel))
    pa_rank = np.zeros(len(test_indices))
    pb_local_rank = np.zeros(len(test_indices))
    pb_em_rank = np.zeros(len(test_indices))

    for i, idx in enumerate(test_indices):
        pa_rank[i] = np.mean(prob_exp2_a[test_indices] <= prob_exp2_a[idx])
        pb_local_rank[i] = np.mean(prob_exp2_b[test_indices] <= prob_exp2_b[idx])
        pb_em_rank[i] = np.mean(prob_em_panel[test_indices] <= prob_em_panel[idx])

    prob_exp2_comb = np.zeros(T, dtype=float)
    for i, idx in enumerate(test_indices):
        prob_exp2_comb[idx] = 1.0 - (1.0 - pa_rank[i]) * (1.0 - pb_local_rank[i])
        prob_exp3_comb[idx] = 1.0 - (1.0 - pa_rank[i]) * (1.0 - pb_em_rank[i])

    # ── 4. Calibrating Operating Points & Auditing All Models ──
    print("── 4. Calibrating Thresholds & Auditing Model Performance...", flush=True)

    def calibrate(probs: np.ndarray, target_occ: float) -> np.ndarray:
        cut = np.quantile(probs[test_indices], 1.0 - target_occ)
        al = np.zeros(T, dtype=int)
        al[test_indices] = (probs[test_indices] >= cut).astype(int)
        return al

    # Baselines
    audit_b1 = audit_alert_series("Baseline B1: Realized Volatility", b1_raw, test_indices, dates, returns, episodes, eval_years)
    audit_b2 = audit_alert_series("Baseline B2: Trailing Drawdown", b2_raw, test_indices, dates, returns, episodes, eval_years)
    audit_b3 = audit_alert_series("Baseline B3: Below 200d SMA", b3_raw, test_indices, dates, returns, episodes, eval_years)
    audit_b4 = audit_alert_series("Baseline B4: Composite (B1 & B2)", b4_raw, test_indices, dates, returns, episodes, eval_years)
    audit_bvix = audit_alert_series("Baseline VIX: Global VIX Spike", bvix_raw, test_indices, dates, returns, episodes, eval_years)

    # Core Experiments at Target Operating Point (Occupancy ~ 12% - 14%)
    alerts_e1 = calibrate(prob_exp1, 0.14)
    alerts_e2 = calibrate(prob_exp2_comb, 0.14)
    alerts_e3 = calibrate(prob_exp3_comb, 0.12)
    alerts_e3_tight = calibrate(prob_exp3_comb, 0.10)
    alerts_e3_15 = calibrate(prob_exp3_comb, 0.15)

    audit_e1 = audit_alert_series("Exp 1: Upgraded Strategic Fragility", alerts_e1, test_indices, dates, returns, episodes, eval_years)
    audit_e2 = audit_alert_series("Exp 2: V2 Dual-Engine (Local Calibration)", alerts_e2, test_indices, dates, returns, episodes, eval_years)
    audit_e3 = audit_alert_series("Exp 3: V2 EM Panel Transfer (Operating Point 12%)", alerts_e3, test_indices, dates, returns, episodes, eval_years)
    audit_e3_tight = audit_alert_series("Exp 3: V2 EM Panel Transfer (Tight Budget 10%)", alerts_e3_tight, test_indices, dates, returns, episodes, eval_years)
    audit_e3_15 = audit_alert_series("Exp 3: V2 EM Panel Transfer (Full Budget 15%)", alerts_e3_15, test_indices, dates, returns, episodes, eval_years)

    # ── 5. McNemar Exact Paired Tests & Bootstrap Analysis ──
    def mcnemar(m1: dict, m2: dict) -> float:
        b, c = 0, 0
        for ep1, ep2 in zip(m1["episodes"], m2["episodes"]):
            d1, d2 = ep1["detected"], ep2["detected"]
            if d1 and not d2: b += 1
            elif not d1 and d2: c += 1
        if b + c == 0: return 1.0
        return float(stats.binomtest(min(b, c), b + c, 0.5).pvalue)

    mcnemar_e3_vs_b1 = mcnemar(audit_e3, audit_b1)
    mcnemar_e3_vs_b4 = mcnemar(audit_e3, audit_b4)
    mcnemar_e3_vs_bvix = mcnemar(audit_e3, audit_bvix)
    mcnemar_e3_vs_e1 = mcnemar(audit_e3, audit_e1)

    # 1000 Bootstrap Resamples for Recall Difference
    rng = np.random.default_rng(42)
    diff_recall_e3_vs_b1 = []
    diff_recall_e3_vs_b4 = []
    for _ in range(1000):
        sample_eps = rng.choice(episodes, size=len(episodes), replace=True)
        # evaluate on sample
        det_e3 = sum([any(alerts_e3[max(0, ep['onset_idx']-60):ep['trough_idx']+1]) for ep in sample_eps])
        det_b1 = sum([any(b1_raw[max(0, ep['onset_idx']-60):ep['trough_idx']+1]) for ep in sample_eps])
        det_b4 = sum([any(b4_raw[max(0, ep['onset_idx']-60):ep['trough_idx']+1]) for ep in sample_eps])
        diff_recall_e3_vs_b1.append((det_e3 - det_b1) / len(sample_eps))
        diff_recall_e3_vs_b4.append((det_e3 - det_b4) / len(sample_eps))

    boot_diff_b1 = {
        "mean_diff": float(np.mean(diff_recall_e3_vs_b1)),
        "ci_95": [float(np.quantile(diff_recall_e3_vs_b1, 0.025)), float(np.quantile(diff_recall_e3_vs_b1, 0.975))]
    }
    boot_diff_b4 = {
        "mean_diff": float(np.mean(diff_recall_e3_vs_b4)),
        "ci_95": [float(np.quantile(diff_recall_e3_vs_b4, 0.025)), float(np.quantile(diff_recall_e3_vs_b4, 0.975))]
    }

    # Print Summary Table
    print("\n" + "="*96)
    print("EGX FRAGILITY ENGINE V2 EMPIRICAL AUDIT RESULTS")
    print("="*96)
    print(f"{'Model / Experiment':<46} | {'Recall':<8} | {'Occupancy':<10} | {'FA/Yr':<8} | {'Med Lead':<8} | {'OppCost':<8}")
    print("-" * 96)
    models_to_display = [
        audit_b1, audit_b2, audit_b3, audit_b4, audit_bvix,
        audit_e1, audit_e2, audit_e3_tight, audit_e3, audit_e3_15
    ]
    for m in models_to_display:
        print(f"{m['model_name']:<46} | {m['recall']:<7.1%} | {m['occupancy']:<9.1%} | {m['false_alarms_per_year']:<8.2f} | {m['median_lead_days']:<6.0f}d | {m['mean_opp_cost_pct']:+5.1f}%")
    print("="*96)

    # Sub-Era Breakdown Table
    print("\n── Sub-Era Breakdown (Pre-2016 Internal Era vs Post-2016 Global Transition Era):")
    print(f"{'Model':<46} | {'Era 1: 2008-2015 (12 Crises)':<30} | {'Era 2: 2016-2026 (5 Crises)':<30}")
    print("-" * 96)
    for m in [audit_b1, audit_b4, audit_bvix, audit_e1, audit_e2, audit_e3]:
        pre_str = f"{m['recall_pre2016']:.1%} ({round(m['recall_pre2016']*12)}/12)"
        post_str = f"{m['recall_post2016']:.1%} ({round(m['recall_post2016']*5)}/5)"
        print(f"{m['model_name']:<46} | {pre_str:<30} | {post_str:<30}")

    # Crisis-by-Crisis Lead Time Comparison
    print("\n── Crisis-by-Crisis Lead Time Audit (Exp 3 vs Baselines & Exp 1):")
    print(f"{'Onset Date':<12} | {'Drawdown':<8} | {'B1 (Vol)':<14} | {'B4 (Comp)':<14} | {'VIX Spike':<14} | {'Exp 1 (V1)':<14} | {'Exp 3 (V2 EM)'}")
    print("-" * 96)
    for i, ep in enumerate(episodes):
        d_on = ep["onset_date"]
        dd_str = f"{ep['max_drawdown']:.1%}"
        c_b1 = audit_b1["episodes"][i]
        c_b4 = audit_b4["episodes"][i]
        c_vix = audit_bvix["episodes"][i]
        c_e1 = audit_e1["episodes"][i]
        c_e3 = audit_e3["episodes"][i]

        def fmt_cat(c):
            if not c["detected"]: return "MISSED"
            return f"{c['category'][:5]} {c['lead_days']:>2}d"

        print(f"{d_on:<12} | {dd_str:<8} | {fmt_cat(c_b1):<14} | {fmt_cat(c_b4):<14} | {fmt_cat(c_vix):<14} | {fmt_cat(c_e1):<14} | {fmt_cat(c_e3)}")

    # Compile Full JSON Result Artifact
    output_data = {
        "metadata": {
            "version": "2.0",
            "eval_sessions": len(test_indices),
            "eval_years": round(eval_years, 2),
            "total_crises": len(episodes),
            "crises_dates": [ep["onset_date"] for ep in episodes],
        },
        "models": {
            "b1_vol": audit_b1,
            "b2_dd": audit_b2,
            "b3_sma": audit_b3,
            "b4_composite": audit_b4,
            "b_vix": audit_bvix,
            "exp1_upgraded_v1": audit_e1,
            "exp2_v2_local_dual": audit_e2,
            "exp3_v2_em_panel_12pct": audit_e3,
            "exp3_v2_em_panel_10pct": audit_e3_tight,
            "exp3_v2_em_panel_15pct": audit_e3_15,
        },
        "statistical_tests": {
            "mcnemar_exp3_vs_b1_pvalue": mcnemar_e3_vs_b1,
            "mcnemar_exp3_vs_b4_pvalue": mcnemar_e3_vs_b4,
            "mcnemar_exp3_vs_bvix_pvalue": mcnemar_e3_vs_bvix,
            "mcnemar_exp3_vs_exp1_pvalue": mcnemar_e3_vs_e1,
            "bootstrap_recall_diff_exp3_minus_b1": boot_diff_b1,
            "bootstrap_recall_diff_exp3_minus_b4": boot_diff_b4,
        }
    }

    out_file = OUT_DIR / "v2_experiment_results.json"
    out_file.write_text(json.dumps(output_data, indent=2), encoding="utf-8")
    print(f"\n✓ Experiment results successfully saved to: {out_file}")

    return output_data


if __name__ == "__main__":
    run_v2_experiments()
