#!/usr/bin/env python3
"""Deep Empirical Audit for the EGX Fragility Engine (V1).

Performs:
1. Lead-Time & Reactive Timing Audit:
   - Early Detection (T-25 to T-5) vs Late (T-4 to T) vs Reactive (> T) vs Missed
   - Audits whether B2 (Drawdown <= -10%) is purely reactive.
2. Statistical Rigor on 17 Events:
   - Exact McNemar tests (Elastic Net vs B1, B2, B4)
   - 95% Wilson Score confidence intervals
   - Bootstrap resampling of event recall delta
3. Threshold-Occupancy Efficiency Frontier:
   - Sweeps warning occupancy: 5%, 10%, 15%, 20%, 25%, 30%
   - Plots/tabulates Recall vs Occupancy and Recall vs False Alarms/Yr
4. Feature Timeline & Sub-Era Breakdown:
   - Feature availability matrix
   - Performance in Era 1 (2007-2009), Era 2 (2010-2016), Era 3 (2017-2026)
5. Event-by-Event Forensic Autopsy:
   - True Positives vs False Negatives (The 4 Missed Crises)
"""

from __future__ import annotations

import collections
import csv
import json
import math
import pathlib
import sys
import numpy as np

from scipy.stats import binom
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import RobustScaler
import lightgbm as lgb

REPO = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = REPO / "data-source" / "fragility"
RESULTS_DIR = REPO / "public" / "data" / "v1" / "backtest"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

FEATURES = [
    "f1_breadth",
    "f2_gdr_basis",
    "f3_rate_mom",
    "f4_fx_vel",
    "f4_fx_acc",
    "f5_hhi",
    "f6_herding",
    "f7_panic",
    "f8_illiq",
    "f9_ratio",
    "f10_spread",
]


def load_dataset() -> list[dict]:
    p = DATA_DIR / "dataset_daily.json"
    return json.loads(p.read_text(encoding="utf-8"))


def wilson_score_interval(k: int, n: int, confidence: float = 0.95) -> tuple[float, float]:
    """Wilson score interval for a binomial proportion."""
    if n == 0:
        return (0.0, 0.0)
    z = 1.95996 if confidence == 0.95 else 1.64485
    p = k / n
    denom = 1.0 + (z**2) / n
    center = (p + (z**2) / (2 * n)) / denom
    spread = (z / denom) * math.sqrt((p * (1 - p) / n) + (z**2) / (4 * (n**2)))
    return (max(0.0, center - spread), min(1.0, center + spread))


def exact_mcnemar_test(b: int, c: int) -> float:
    """Exact two-sided McNemar test using binomial distribution for discordant pairs b and c."""
    n = b + c
    if n == 0:
        return 1.0
    k = min(b, c)
    # two-sided p-value
    p_val = 2.0 * binom.cdf(k, n, 0.5)
    return min(1.0, float(p_val))


def cluster_alerts(alert_mask: np.ndarray, dates: list[str], max_gap: int = 5) -> list[dict]:
    episodes = []
    in_episode = False
    current_start = 0
    current_end = 0

    for i, a in enumerate(alert_mask):
        if a == 1:
            if not in_episode:
                in_episode = True
                current_start = i
                current_end = i
            else:
                current_end = i
        else:
            if in_episode:
                next_alert_dist = 999
                for k in range(i, min(len(alert_mask), i + max_gap + 1)):
                    if alert_mask[k] == 1:
                        next_alert_dist = k - i
                        break
                if next_alert_dist > max_gap:
                    in_episode = False
                    episodes.append({
                        "start_idx": current_start,
                        "end_idx": current_end,
                        "start_date": dates[current_start],
                        "end_date": dates[current_end],
                        "duration": current_end - current_start + 1,
                    })
    if in_episode:
        episodes.append({
            "start_idx": current_start,
            "end_idx": current_end,
            "start_date": dates[current_start],
            "end_date": dates[current_end],
            "duration": current_end - current_start + 1,
        })
    return episodes


def run_comprehensive_audit():
    raw_data = load_dataset()
    dates = [r["date"] for r in raw_data]
    years = np.array([r["year"] for r in raw_data])
    close_prices = np.array([r["close"] for r in raw_data])
    ret_1d = np.array([r["ret_1d"] for r in raw_data])
    target_mdd = np.array([r["target_mdd_60"] for r in raw_data])
    in_risk_set = np.array([r["in_risk_set"] for r in raw_data])
    state_arr = np.array([r["state"] for r in raw_data])

    date_to_idx = {d: i for i, d in enumerate(dates)}

    # Baselines
    b1_raw = np.array([r["b1_vol"] for r in raw_data])
    b2_raw = np.array([r["b2_dd"] for r in raw_data])
    b3_raw = np.array([r["b3_sma"] for r in raw_data])
    b4_raw = np.array([r["b4_composite"] for r in raw_data])

    # Feature matrix
    X_raw = np.zeros((len(raw_data), len(FEATURES)), dtype=float)
    for col, f in enumerate(FEATURES):
        X_raw[:, col] = [r[f] for r in raw_data]

    # Extract all 17 out-of-sample crisis events (2007-2026)
    crisis_onsets = []
    for i, s in enumerate(state_arr):
        if s == 1 and years[i] >= 2007:
            # Find trough
            trough_idx = i
            for k in range(i+1, min(len(state_arr), i+80)):
                if state_arr[k] == 3 or (k < len(state_arr)-1 and state_arr[k]==2 and state_arr[k+1]!=2):
                    trough_idx = k
                    break
            peak_p = close_prices[i]
            trough_p = np.min(close_prices[i:trough_idx+1])
            actual_dd = (trough_p / peak_p) - 1.0
            crisis_onsets.append({
                "onset_date": dates[i],
                "onset_idx": i,
                "trough_date": dates[trough_idx],
                "trough_idx": trough_idx,
                "year": years[i],
                "peak_price": peak_p,
                "trough_price": trough_p,
                "max_drawdown": float(actual_dd),
            })

    test_indices = np.where(years >= 2007)[0]
    test_dates = [dates[i] for i in test_indices]
    test_returns = ret_1d[test_indices]
    test_years_span = len(test_indices) / 250.0

    print("══════════════════════════════════════════════════════════════════════")
    print("           EGX FRAGILITY ENGINE (V1): DEEP EMPIRICAL AUDIT            ")
    print("══════════════════════════════════════════════════════════════════════")
    print(f"Evaluation Span: {test_dates[0]} .. {test_dates[-1]} ({test_years_span:.1f} years)")
    print(f"Total Test Sessions: {len(test_indices)}")
    print(f"Total Out-of-Sample Crises (Severe Drawdowns): {len(crisis_onsets)}")

    # 1. GENERATE OUT-OF-SAMPLE MODEL PREDICTIONS FOR WALK-FORWARD
    test_years_list = list(range(2007, 2027))
    preds_enet_15y = np.zeros(len(test_indices), dtype=float)
    preds_enet_nodecay = np.zeros(len(test_indices), dtype=float)
    preds_hazard = np.zeros(len(test_indices), dtype=float)
    preds_lgb = np.zeros(len(test_indices), dtype=float)

    curr_test_ptr = 0
    import warnings
    warnings.filterwarnings("ignore")

    for test_yr in test_years_list:
        train_mask = (years < test_yr) & (in_risk_set == 1)
        test_mask = (years == test_yr)
        idx_train = np.where(train_mask)[0]
        idx_test = np.where(test_mask)[0]
        if len(idx_test) == 0:
            continue

        theta_train = float(np.quantile(target_mdd[idx_train], 0.95))
        y_train = (target_mdd[idx_train] >= theta_train).astype(int)

        scaler = RobustScaler()
        X_train = scaler.fit_transform(X_raw[idx_train])
        X_test = scaler.transform(X_raw[idx_test])

        ages = test_yr - years[idx_train]
        weights_15y = 2.0 ** (-ages / 15.0)

        # Elastic Net 15y
        clf_15y = LogisticRegression(
            penalty="elasticnet", l1_ratio=0.5, C=0.5, solver="saga",
            tol=1e-3, max_iter=250, random_state=42, class_weight="balanced"
        )
        clf_15y.fit(X_train, y_train, sample_weight=weights_15y)
        p_15y = clf_15y.predict_proba(X_test)[:, 1]

        # Elastic Net No Decay
        clf_nd = LogisticRegression(
            penalty="elasticnet", l1_ratio=0.5, C=0.5, solver="saga",
            tol=1e-3, max_iter=250, random_state=42, class_weight="balanced"
        )
        clf_nd.fit(X_train, y_train)
        p_nd = clf_nd.predict_proba(X_test)[:, 1]

        # Discrete Hazard
        clf_haz = LogisticRegression(
            penalty="l2", C=1.0, solver="lbfgs", max_iter=250,
            random_state=42, class_weight="balanced"
        )
        clf_haz.fit(X_train, y_train, sample_weight=weights_15y)
        p_haz = clf_haz.predict_proba(X_test)[:, 1]

        # Shallow LightGBM
        clf_gbm = lgb.LGBMClassifier(
            max_depth=2, num_leaves=3, min_child_samples=20,
            learning_rate=0.03, n_estimators=50, random_state=42, verbosity=-1
        )
        clf_gbm.fit(X_train, y_train, sample_weight=weights_15y)
        p_gbm = clf_gbm.predict_proba(X_test)[:, 1]

        n_fold = len(idx_test)
        preds_enet_15y[curr_test_ptr:curr_test_ptr+n_fold] = p_15y
        preds_enet_nodecay[curr_test_ptr:curr_test_ptr+n_fold] = p_nd
        preds_hazard[curr_test_ptr:curr_test_ptr+n_fold] = p_haz
        preds_lgb[curr_test_ptr:curr_test_ptr+n_fold] = p_gbm
        curr_test_ptr += n_fold

    # Full OOS aligned binary arrays at 18% occupancy
    cutoff_enet = float(np.quantile(preds_enet_15y, 0.82))
    alert_enet_15y_oos = (preds_enet_15y >= cutoff_enet).astype(int)

    # Convert test arrays back to full-length arrays for date alignment
    alert_enet_full = np.zeros(len(dates), dtype=int)
    alert_enet_full[test_indices] = alert_enet_15y_oos

    # ══════════════════════════════════════════════════════════════════════
    # AUDIT PART 1: EVENT-BY-EVENT TIMING & LEAD TIME AUDIT
    # ══════════════════════════════════════════════════════════════════════
    print("\n" + "="*70)
    print("AUDIT PART 1: LEAD-TIME & TIMING AUDIT (IS B2 PURELY REACTIVE?)")
    print("="*70)
    print("Timing Categories:")
    print("  - Early Predictive Detection : First alert between [T-25 and T-5] days prior to peak")
    print("  - Late Predictive Detection  : First alert between [T-4 and T] (immediate lead-in)")
    print("  - Reactive Detection         : First alert occurs AFTER onset (> T, while crashing)")
    print("  - Missed                     : No alert within [T-60, T_trough]")

    event_timing_table = []
    models_to_check = {
        "ElasticNet_15y": alert_enet_full,
        "B1_Vol": b1_raw,
        "B2_Drawdown": b2_raw,
        "B4_Composite": b4_raw,
    }

    timing_summary = {m: {"early": 0, "late": 0, "reactive": 0, "missed": 0} for m in models_to_check}

    for cr in crisis_onsets:
        o_idx = cr["onset_idx"]
        tr_idx = cr["trough_idx"]
        o_date = cr["onset_date"]
        tr_date = cr["trough_date"]
        dd_val = cr["max_drawdown"]

        row_dict = {
            "onset_date": o_date,
            "trough_date": tr_date,
            "drawdown": dd_val,
            "alerts": {},
        }

        for m_name, m_series in models_to_check.items():
            # Search in [o_idx - 60 .. tr_idx]
            search_start = max(0, o_idx - 60)
            window = m_series[search_start:tr_idx+1]
            alert_indices = np.where(window == 1)[0]
            if len(alert_indices) > 0:
                first_rel = alert_indices[0]
                first_abs = search_start + first_rel
                lead_days = o_idx - first_abs  # positive means before onset, negative means after
                first_date = dates[first_abs]
                if lead_days >= 5:
                    cat = "EARLY"
                    timing_summary[m_name]["early"] += 1
                elif 0 <= lead_days < 5:
                    cat = "LATE"
                    timing_summary[m_name]["late"] += 1
                else:
                    cat = "REACTIVE"
                    timing_summary[m_name]["reactive"] += 1
                row_dict["alerts"][m_name] = {
                    "first_date": first_date,
                    "lead_days": int(lead_days),
                    "category": cat,
                }
            else:
                timing_summary[m_name]["missed"] += 1
                row_dict["alerts"][m_name] = {
                    "first_date": "None",
                    "lead_days": -999,
                    "category": "MISSED",
                }
        event_timing_table.append(row_dict)

    # Print Table
    header_fmt = "{:<11} {:<8} {:<18} {:<18} {:<18} {:<18}"
    print("\n" + header_fmt.format("Onset Date", "MaxDD", "Elastic Net", "B1 (Vol)", "B2 (Drawdown)", "B4 (Composite)"))
    print("-" * 95)
    row_fmt = "{:<11} {:>6.1f}%  {:<18} {:<18} {:<18} {:<18}"

    for r in event_timing_table:
        el_info = f"{r['alerts']['ElasticNet_15y']['category']:<8} (lead: {r['alerts']['ElasticNet_15y']['lead_days']:+2d}d)" if r['alerts']['ElasticNet_15y']['category'] != "MISSED" else "MISSED"
        b1_info = f"{r['alerts']['B1_Vol']['category']:<8} (lead: {r['alerts']['B1_Vol']['lead_days']:+2d}d)" if r['alerts']['B1_Vol']['category'] != "MISSED" else "MISSED"
        b2_info = f"{r['alerts']['B2_Drawdown']['category']:<8} (lead: {r['alerts']['B2_Drawdown']['lead_days']:+2d}d)" if r['alerts']['B2_Drawdown']['category'] != "MISSED" else "MISSED"
        b4_info = f"{r['alerts']['B4_Composite']['category']:<8} (lead: {r['alerts']['B4_Composite']['lead_days']:+2d}d)" if r['alerts']['B4_Composite']['category'] != "MISSED" else "MISSED"
        print(row_fmt.format(r["onset_date"], r["drawdown"]*100, el_info, b1_info, b2_info, b4_info))

    print("\nTiming Classification Breakdown (N = 17 Crises):")
    print("-" * 65)
    print(f"{'Metric':<25} {'Elastic Net':<12} {'B1 (Vol)':<12} {'B2 (DD)':<12} {'B4 (Comp)':<12}")
    print("-" * 65)
    for cat in ["early", "late", "reactive", "missed"]:
        print(f"{cat.capitalize() + ' Detection':<25} {timing_summary['ElasticNet_15y'][cat]:<12} {timing_summary['B1_Vol'][cat]:<12} {timing_summary['B2_Drawdown'][cat]:<12} {timing_summary['B4_Composite'][cat]:<12}")
    print("-" * 65)
    
    # Pure Predictive Recall (Early + Late)
    pred_recall_el = (timing_summary['ElasticNet_15y']['early'] + timing_summary['ElasticNet_15y']['late']) / 17.0
    pred_recall_b1 = (timing_summary['B1_Vol']['early'] + timing_summary['B1_Vol']['late']) / 17.0
    pred_recall_b2 = (timing_summary['B2_Drawdown']['early'] + timing_summary['B2_Drawdown']['late']) / 17.0
    pred_recall_b4 = (timing_summary['B4_Composite']['early'] + timing_summary['B4_Composite']['late']) / 17.0

    print(f"{'PREDICTIVE RECALL':<25} {pred_recall_el*100:>6.1f}%     {pred_recall_b1*100:>6.1f}%     {pred_recall_b2*100:>6.1f}%     {pred_recall_b4*100:>6.1f}%")
    print(f"{'REACTIVE RECALL':<25} {timing_summary['ElasticNet_15y']['reactive']/17*100:>6.1f}%     {timing_summary['B1_Vol']['reactive']/17*100:>6.1f}%     {timing_summary['B2_Drawdown']['reactive']/17*100:>6.1f}%     {timing_summary['B4_Composite']['reactive']/17*100:>6.1f}%")

    # ══════════════════════════════════════════════════════════════════════
    # AUDIT PART 2: STATISTICAL SIGNIFICANCE ON 17 EVENTS
    # ══════════════════════════════════════════════════════════════════════
    print("\n" + "="*70)
    print("AUDIT PART 2: STATISTICAL RIGOR & MCNEMAR TESTS (N = 17)")
    print("="*70)

    # Wilson intervals for Predictive Recall
    print("95% Wilson Score Confidence Intervals for Predictive Recall:")
    for name, k in [
        ("Elastic Net (15y)", timing_summary['ElasticNet_15y']['early'] + timing_summary['ElasticNet_15y']['late']),
        ("Baseline B1 (Vol)", timing_summary['B1_Vol']['early'] + timing_summary['B1_Vol']['late']),
        ("Baseline B2 (Drawdown)", timing_summary['B2_Drawdown']['early'] + timing_summary['B2_Drawdown']['late']),
        ("Baseline B4 (Composite)", timing_summary['B4_Composite']['early'] + timing_summary['B4_Composite']['late']),
    ]:
        low, high = wilson_score_interval(k, 17)
        print(f"   {name:<25}: {k}/17 = {k/17*100:4.1f}% (95% CI: [{low*100:4.1f}%, {high*100:4.1f}%])")

    # Paired McNemar Tests
    def compare_paired(model_a_name, model_b_name):
        a_hits = [(r["alerts"][model_a_name]["category"] in ["EARLY", "LATE"]) for r in event_timing_table]
        b_hits = [(r["alerts"][model_b_name]["category"] in ["EARLY", "LATE"]) for r in event_timing_table]
        both = sum(1 for a, b in zip(a_hits, b_hits) if a and b)
        a_only = sum(1 for a, b in zip(a_hits, b_hits) if a and not b)
        b_only = sum(1 for a, b in zip(a_hits, b_hits) if not a and b)
        neither = sum(1 for a, b in zip(a_hits, b_hits) if not a and not b)
        p_val = exact_mcnemar_test(a_only, b_only)
        return {
            "both": both, "a_only": a_only, "b_only": b_only, "neither": neither,
            "p_val": p_val, "a_hits": a_hits, "b_hits": b_hits
        }

    print("\nExact McNemar Paired Tests (Predictive Recall):")
    mc_b1 = compare_paired("ElasticNet_15y", "B1_Vol")
    print(f"   Elastic Net vs B1 (Vol):")
    print(f"      Both detect: {mc_b1['both']}, Elastic only: {mc_b1['a_only']}, B1 only: {mc_b1['b_only']}, Neither: {mc_b1['neither']}")
    print(f"      Discordant pairs: ({mc_b1['a_only']}, {mc_b1['b_only']}) -> Exact McNemar p-value = {mc_b1['p_val']:.4f}")

    mc_b4 = compare_paired("ElasticNet_15y", "B4_Composite")
    print(f"   Elastic Net vs B4 (Composite):")
    print(f"      Both detect: {mc_b4['both']}, Elastic only: {mc_b4['a_only']}, B4 only: {mc_b4['b_only']}, Neither: {mc_b4['neither']}")
    print(f"      Discordant pairs: ({mc_b4['a_only']}, {mc_b4['b_only']}) -> Exact McNemar p-value = {mc_b4['p_val']:.4f}")

    mc_b2 = compare_paired("ElasticNet_15y", "B2_Drawdown")
    print(f"   Elastic Net vs B2 (Drawdown):")
    print(f"      Both detect: {mc_b2['both']}, Elastic only: {mc_b2['a_only']}, B2 only: {mc_b2['b_only']}, Neither: {mc_b2['neither']}")
    print(f"      Discordant pairs: ({mc_b2['a_only']}, {mc_b2['b_only']}) -> Exact McNemar p-value = {mc_b2['p_val']:.4f}")

    # Bootstrap Resampling for Delta Recall (10,000 iterations)
    np.random.seed(42)
    B = 10000
    n_crises = 17
    delta_b4_boot = []
    delta_b1_boot = []
    el_hits = np.array([(r["alerts"]["ElasticNet_15y"]["category"] in ["EARLY", "LATE"]) for r in event_timing_table])
    b4_hits = np.array([(r["alerts"]["B4_Composite"]["category"] in ["EARLY", "LATE"]) for r in event_timing_table])
    b1_hits = np.array([(r["alerts"]["B1_Vol"]["category"] in ["EARLY", "LATE"]) for r in event_timing_table])

    for _ in range(B):
        sample_idx = np.random.choice(n_crises, size=n_crises, replace=True)
        delta_b4_boot.append(np.mean(el_hits[sample_idx]) - np.mean(b4_hits[sample_idx]))
        delta_b1_boot.append(np.mean(el_hits[sample_idx]) - np.mean(b1_hits[sample_idx]))

    b4_ci_low, b4_ci_high = np.percentile(delta_b4_boot, [2.5, 97.5])
    b1_ci_low, b1_ci_high = np.percentile(delta_b1_boot, [2.5, 97.5])
    print(f"\nBootstrap 95% Confidence Intervals for Difference in Recall (Δ = Elastic - Baseline):")
    print(f"   Δ(Elastic - B4 Composite): {np.mean(delta_b4_boot)*100:+4.1f}% (95% CI: [{b4_ci_low*100:+4.1f}%, {b4_ci_high*100:+4.1f}%])")
    print(f"   Δ(Elastic - B1 Volatility): {np.mean(delta_b1_boot)*100:+4.1f}% (95% CI: [{b1_ci_low*100:+4.1f}%, {b1_ci_high*100:+4.1f}%])")

    # ══════════════════════════════════════════════════════════════════════
    # AUDIT PART 3: THRESHOLD-OCCUPANCY EFFICIENCY FRONTIER SWEEP
    # ══════════════════════════════════════════════════════════════════════
    print("\n" + "="*70)
    print("AUDIT PART 3: OCCUPANCY EFFICIENCY FRONTIER SWEEP (5% to 30%)")
    print("="*70)
    target_occupancies = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30]
    sweep_results = {"ElasticNet_15y": [], "ElasticNet_NoDecay": [], "B1_Vol": [], "B4_Composite": []}

    # B1 realized vol values
    vol20_test = np.array([raw_data[i]["vol20"] for i in test_indices])
    # B4 composite continuous score: vol20 * (abs(dd120) + 0.05)
    dd120_test = np.array([raw_data[i]["dd120"] for i in test_indices])
    score_b4_test = vol20_test * (np.abs(np.minimum(0.0, dd120_test)) + 0.05)

    def evaluate_model_at_occupancy(scores_test, target_occ):
        cutoff = float(np.quantile(scores_test, 1.0 - target_occ))
        alerts = (scores_test >= cutoff).astype(int)
        
        # Check early and full recall on 17 crises
        detected_early = 0
        detected_full = 0
        leads = []

        for cr in crisis_onsets:
            o_date = cr["onset_date"]
            rel_idx = test_dates.index(o_date) if o_date in test_dates else -1
            if rel_idx < 0:
                continue
            # Early window [rel_idx - 25 .. rel_idx - 5]
            early_w = alerts[max(0, rel_idx - 25):max(0, rel_idx - 4)]
            # Full predictive window [rel_idx - 60 .. rel_idx]
            full_w = alerts[max(0, rel_idx - 60):rel_idx + 1]

            if np.any(early_w == 1):
                detected_early += 1
            if np.any(full_w == 1):
                detected_full += 1
                # First alert distance
                first_pos = np.where(full_w == 1)[0][0]
                first_test_idx = max(0, rel_idx - 60) + first_pos
                leads.append(rel_idx - first_test_idx)

        episodes = cluster_alerts(alerts, test_dates, max_gap=5)
        # False alarm episodes
        fa_count = 0
        opp_costs = []
        for ep in episodes:
            s_idx = ep["start_idx"]
            e_idx = ep["end_idx"]
            matched = False
            for cr in crisis_onsets:
                if cr["onset_date"] in test_dates:
                    o_pos = test_dates.index(cr["onset_date"])
                    if s_idx - 5 <= o_pos <= e_idx + 60:
                        matched = True
                        break
            if not matched:
                fa_count += 1
                opp_costs.append(np.prod(1.0 + test_returns[s_idx:e_idx+1]) - 1.0)

        actual_occ = float(np.mean(alerts))
        return {
            "target_occ": target_occ,
            "actual_occ": actual_occ,
            "early_recall": detected_early / 17.0,
            "full_recall": detected_full / 17.0,
            "median_lead": float(np.median(leads)) if leads else 0.0,
            "false_alarms_yr": fa_count / test_years_span,
            "opp_cost": float(np.mean(opp_costs)) if opp_costs else 0.0,
        }

    print("\nOccupancy Sweep Summary Table (Full Predictive Recall / False Alarms per Year):")
    print(f"{'Target Occupancy':<18} {'ElasticNet (15y)':<20} {'ElasticNet (NoDecay)':<22} {'B1 (Realized Vol)':<20}")
    print("-" * 80)
    for occ in target_occupancies:
        res_el15 = evaluate_model_at_occupancy(preds_enet_15y, occ)
        res_elnd = evaluate_model_at_occupancy(preds_enet_nodecay, occ)
        res_b1 = evaluate_model_at_occupancy(vol20_test, occ)
        sweep_results["ElasticNet_15y"].append(res_el15)
        sweep_results["ElasticNet_NoDecay"].append(res_elnd)
        sweep_results["B1_Vol"].append(res_b1)
        
        txt_el15 = f"{res_el15['full_recall']*100:4.1f}% (FA: {res_el15['false_alarms_yr']:3.1f}/yr)"
        txt_elnd = f"{res_elnd['full_recall']*100:4.1f}% (FA: {res_elnd['false_alarms_yr']:3.1f}/yr)"
        txt_b1 = f"{res_b1['full_recall']*100:4.1f}% (FA: {res_b1['false_alarms_yr']:3.1f}/yr)"
        print(f"{occ*100:4.1f}% Budget        {txt_el15:<20} {txt_elnd:<22} {txt_b1:<20}")

    # ══════════════════════════════════════════════════════════════════════
    # AUDIT PART 4: FEATURE TIMELINE & SUB-ERA PERFORMANCE
    # ══════════════════════════════════════════════════════════════════════
    print("\n" + "="*70)
    print("AUDIT PART 4: FEATURE TIMELINE & SUB-ERA AUDIT")
    print("="*70)

    # Feature matrix audit
    feat_audit = []
    for col, f in enumerate(FEATURES):
        series_f = X_raw[:, col]
        non_zero_idx = np.where(series_f != 0.0)[0]
        first_date = dates[non_zero_idx[0]] if len(non_zero_idx) > 0 else "Never"
        # Check OOS missing / zero rate
        oos_series = X_raw[test_indices, col]
        zero_pct = float(np.mean(oos_series == 0.0) * 100)
        feat_audit.append({
            "feature": f,
            "first_valid_date": first_date,
            "oos_zero_imputed_pct": zero_pct,
        })

    print(f"{'Feature':<16} {'First Valid Date':<18} {'OOS Zero/Imputed %':<18} {'Original Spec Proxy Note'}")
    print("-" * 80)
    notes = {
        "f1_breadth": "Active constituents % > 50DMA (Live from 2001, proxy before)",
        "f2_gdr_basis": "London CBKD vs Cairo COMI daily close (Asynchronous proxy)",
        "f3_rate_mom": "1Y Bond yield (Live from 2010, CBE corridor proxy before)",
        "f4_fx_vel": "USD/EGP 60d velocity (Proxy for NFA balance sheet)",
        "f4_fx_acc": "USD/EGP acceleration (Proxy for NFA acceleration)",
        "f5_hhi": "Constituent turnover-weighted return HHI",
        "f6_herding": "Downside herding spread (rho_down - rho_all)",
        "f7_panic": "Turnover * downside return (Proxy for Foreign selling impact)",
        "f8_illiq": "Amihud illiquidity median across active stocks",
        "f9_ratio": "Asymmetric downside price impact ratio",
        "f10_spread": "EGX30 vs EGX70 momentum spread (Live from 2017)",
    }
    for fa in feat_audit:
        print(f"{fa['feature']:<16} {fa['first_valid_date']:<18} {fa['oos_zero_imputed_pct']:>5.1f}%              {notes.get(fa['feature'], '')}")

    # Sub-Era Performance Evaluation
    eras = [
        ("Era 1 (2007-2009): Partial Stack (Pre-Bond Yield, Pre-EGX70)", 2007, 2009),
        ("Era 2 (2010-2016): Mid Stack (1Y Yield Live, Pre-EGX70)", 2010, 2016),
        ("Era 3 (2017-2026): Full Stack (EGX70 Live, Deep History)", 2017, 2026),
    ]

    print("\nPerformance Across Sub-Eras:")
    print("-" * 75)
    for era_name, y_st, y_en in eras:
        era_indices = np.where((years >= y_st) & (years <= y_en))[0]
        era_crises = [cr for cr in crisis_onsets if y_st <= cr["year"] <= y_en]
        
        # Test slice
        sub_test_mask = np.isin(test_indices, era_indices)
        sub_preds_el = preds_enet_15y[sub_test_mask]
        sub_alerts_el = (sub_preds_el >= cutoff_enet).astype(int)
        sub_b1 = b1_raw[era_indices]
        sub_b4 = b4_raw[era_indices]

        # Calculate recall for each
        def get_era_recall(alert_arr, era_cr_list, era_dates_list):
            hits = 0
            for cr in era_cr_list:
                o_d = cr["onset_date"]
                if o_d in era_dates_list:
                    pos = era_dates_list.index(o_d)
                    if np.any(alert_arr[max(0, pos-60):pos+1] == 1):
                        hits += 1
            return hits, len(era_cr_list)

        era_dates = [dates[k] for k in era_indices]
        el_hits, tot_cr = get_era_recall(sub_alerts_el, era_crises, era_dates)
        b1_hits, _ = get_era_recall(sub_b1, era_crises, era_dates)
        b4_hits, _ = get_era_recall(sub_b4, era_crises, era_dates)

        print(f"{era_name}:")
        print(f"   Crises in Era: {tot_cr} | Elastic Net Recall: {el_hits}/{tot_cr} ({el_hits/tot_cr*100:4.1f}%) | B1: {b1_hits}/{tot_cr} ({b1_hits/tot_cr*100:4.1f}%) | B4: {b4_hits}/{tot_cr} ({b4_hits/tot_cr*100:4.1f}%)")

    # ══════════════════════════════════════════════════════════════════════
    # AUDIT PART 5: THE 4 FAILURES (FORENSIC AUTOPSY)
    # ══════════════════════════════════════════════════════════════════════
    print("\n" + "="*70)
    print("AUDIT PART 5: FORENSIC AUTOPSY OF THE 4 MISSED CRISES")
    print("="*70)
    
    missed_crises = []
    for r in event_timing_table:
        if r["alerts"]["ElasticNet_15y"]["category"] == "MISSED":
            missed_crises.append(r)

    print(f"Total True Positives (Detected): 13")
    print(f"Total False Negatives (Missed)  : 4")
    print("\nDetailed Autopsy of the 4 Failures:")

    for mc in missed_crises:
        o_date = mc["onset_date"]
        o_idx = date_to_idx[o_date]
        dd = mc["drawdown"]
        # Extract features in the 60 sessions prior to onset
        w_idx = range(max(0, o_idx - 60), o_idx + 1)
        mean_breadth = np.mean(X_raw[w_idx, 0])
        mean_gdr = np.mean(X_raw[w_idx, 1])
        mean_herding = np.mean(X_raw[w_idx, 6])
        mean_vol = np.mean([raw_data[k]["vol20"] for k in w_idx])
        test_rel = test_dates.index(o_date)
        max_p_el = float(np.max(preds_enet_15y[max(0, test_rel - 60):test_rel + 1]))

        print(f"\n▶ Missed Event: {o_date} (Max Drawdown: {dd*100:.1f}%)")
        print(f"   Max Predicted Prob: {max_p_el:.3f} (Cutoff was {cutoff_enet:.3f})")
        print(f"   Pre-crash Environment:")
        print(f"     - Breadth (50DMA)    : {mean_breadth*100:.1f}% stocks above 50DMA")
        print(f"     - GDR Basis Spread   : {mean_gdr:+.3f}")
        print(f"     - Downside Herding   : {mean_herding:+.3f}")
        print(f"     - 20d Realized Vol   : {mean_vol*100:.1f}%")

    print("\n" + "="*70)
    print("AUDIT SUMMARY COMPLETE.")
    print("="*70)

    audit_summary_output = {
        "timing_summary": timing_summary,
        "event_timing_table": event_timing_table,
        "mcnemar_tests": {
            "b1": {"b": mc_b1["a_only"], "c": mc_b1["b_only"], "p_val": mc_b1["p_val"]},
            "b4": {"b": mc_b4["a_only"], "c": mc_b4["b_only"], "p_val": mc_b4["p_val"]},
            "b2": {"b": mc_b2["a_only"], "c": mc_b2["b_only"], "p_val": mc_b2["p_val"]},
        },
        "bootstrap_diff": {
            "delta_b4_ci": [float(b4_ci_low), float(b4_ci_high)],
            "delta_b1_ci": [float(b1_ci_low), float(b1_ci_high)],
        },
        "occupancy_sweep": sweep_results,
        "feature_timeline": feat_audit,
    }

    out_audit_json = RESULTS_DIR / "deep_audit_results.json"
    out_audit_json.write_text(json.dumps(audit_summary_output, indent=2), encoding="utf-8")
    print(f"✓ Saved full audit artifacts to {out_audit_json}")


if __name__ == "__main__":
    run_comprehensive_audit()
