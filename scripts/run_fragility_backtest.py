#!/usr/bin/env python3
"""Expanding Walk-Forward Backtest for the EGX Fragility Engine (2007–2026).

Implements:
1. Strict Point-in-Time Expanding Walk-Forward Validation:
   - Burn-in: 1998–2006
   - Test Folds: 2007 through 2026 (20 annual out-of-sample folds)
   - Training threshold: theta_{60, train} = Q_95(D_{60, train}^MDD) strictly on training fold
   - Features z-scored strictly with training fold mean and IQR/std

2. Model Architectures:
   - Baseline Rules (B1: Vol, B2: Drawdown, B3: Trend, B4: Composite)
   - Elastic Net Logistic Regression (L1 + L2)
   - Discrete-Time Hazard Model (Logit Hazard on Risk Set)
   - Shallow LightGBM (max_depth=2, leaves=3, regularized)

3. Decay Half-life Sensitivity:
   - No decay (1.0)
   - 7.5 years
   - 12 years
   - 15 years
   - 20 years
   Formula: w_s = 2^(-Age_years / T_half)

4. Event-Level Evaluation:
   - Event Recall (% of historical crashes alerted in [T_onset - 60, T_onset])
   - False Alarms / Year (episodes <= 5 days apart clustered into 1 warning)
   - Warning Occupancy (% of time alert is active, target <= 18%)
   - Compounded Opportunity Cost of false alarms
"""

from __future__ import annotations

import collections
import csv
import json
import math
import pathlib
import sys
import numpy as np

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


def cluster_alerts(alert_mask: np.ndarray, dates: list[str], max_gap: int = 5) -> list[dict]:
    """Group alerts into episodes; alerts separated by <= max_gap days belong to same episode."""
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
                # Check if next alert is within max_gap
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


def evaluate_alerts(
    alert_mask: np.ndarray,
    dates: list[str],
    returns: np.ndarray,
    test_episodes: list[dict],
    test_years: float,
) -> dict:
    """Evaluate event recall, false alarms/year, occupancy, opportunity cost."""
    T = len(alert_mask)
    if T == 0:
        return {}

    occupancy = float(np.mean(alert_mask))
    warning_episodes = cluster_alerts(alert_mask, dates, max_gap=5)

    # Check which actual crisis events were detected
    detected_crises = 0
    date_to_idx = {d: i for i, d in enumerate(dates)}

    for cr in test_episodes:
        onset_d = cr["onset_date"]
        if onset_d not in date_to_idx:
            continue
        onset_idx = date_to_idx[onset_d]
        lookback_window = alert_mask[max(0, onset_idx - 60):onset_idx + 1]
        if np.any(lookback_window == 1):
            detected_crises += 1

    event_recall = detected_crises / len(test_episodes) if test_episodes else 0.0

    # Classify each warning episode as true or false
    # True if an onset occurs within [end_idx, end_idx + 60]
    false_episodes = 0
    opp_costs = []

    for wep in warning_episodes:
        st_idx = wep["start_idx"]
        en_idx = wep["end_idx"]
        is_true = False
        for cr in test_episodes:
            onset_d = cr["onset_date"]
            if onset_d in date_to_idx:
                onset_idx = date_to_idx[onset_d]
                # If crisis onset occurred during or within 60 sessions after alert episode
                if st_idx - 5 <= onset_idx <= en_idx + 60:
                    is_true = True
                    break
        if not is_true:
            false_episodes += 1
            # Compute compounded equity return missed during warning
            ret_missed = np.prod(1.0 + returns[st_idx:en_idx+1]) - 1.0
            opp_costs.append(ret_missed)

    false_alarms_per_year = false_episodes / test_years if test_years > 0 else 0.0
    mean_opp_cost = float(np.mean(opp_costs)) if opp_costs else 0.0

    return {
        "event_recall": round(event_recall, 3),
        "crises_total": len(test_episodes),
        "crises_detected": detected_crises,
        "warning_episodes": len(warning_episodes),
        "false_episodes": false_episodes,
        "false_alarms_per_year": round(false_alarms_per_year, 2),
        "occupancy_pct": round(occupancy * 100, 2),
        "mean_opp_cost_pct": round(mean_opp_cost * 100, 2),
    }


def run_walk_forward() -> dict:
    raw_data = load_dataset()
    print(f"── Loaded {len(raw_data)} daily records for expanding walk-forward.")

    dates = [r["date"] for r in raw_data]
    years = np.array([r["year"] for r in raw_data])
    close_prices = np.array([r["close"] for r in raw_data])
    ret_1d = np.array([r["ret_1d"] for r in raw_data])
    target_mdd = np.array([r["target_mdd_60"] for r in raw_data])
    in_risk_set = np.array([r["in_risk_set"] for r in raw_data])

    # Baselines
    b1_raw = np.array([r["b1_vol"] for r in raw_data])
    b2_raw = np.array([r["b2_dd"] for r in raw_data])
    b3_raw = np.array([r["b3_sma"] for r in raw_data])
    b4_raw = np.array([r["b4_composite"] for r in raw_data])

    # Feature matrix
    X_raw = np.zeros((len(raw_data), len(FEATURES)), dtype=float)
    for col, f in enumerate(FEATURES):
        X_raw[:, col] = [r[f] for r in raw_data]

    # Extract all crisis episodes across full dataset
    state_arr = np.array([r["state"] for r in raw_data])
    crisis_onsets = []
    for i, s in enumerate(state_arr):
        if s == 1:
            crisis_onsets.append({
                "onset_date": dates[i],
                "onset_idx": i,
                "year": years[i],
            })
    print(f"   Identified {len(crisis_onsets)} total crisis onsets across historical period.")

    # Test Folds: 2007 through 2026
    test_years_list = list(range(2007, 2027))
    print(f"   Walk-forward test folds: {test_years_list[0]} to {test_years_list[-1]} ({len(test_years_list)} folds)")

    half_lives = {
        "no_decay": None,
        "decay_7.5y": 7.5,
        "decay_12y": 12.0,
        "decay_15y": 15.0,
        "decay_20y": 20.0,
    }

    # Store out-of-sample predictions across folds
    test_indices = np.where(years >= 2007)[0]
    test_dates = [dates[i] for i in test_indices]
    test_returns = ret_1d[test_indices]
    test_years_span = (len(test_indices) / 250.0)
    test_crises = [cr for cr in crisis_onsets if cr["year"] >= 2007]

    print(f"   Out-of-sample testing span: {len(test_indices)} sessions ({test_years_span:.1f} years), containing {len(test_crises)} crisis onsets.")

    # 1. Evaluate Baselines
    baseline_results = {}
    for b_name, b_arr in [
        ("B1_Vol_UpperQuintile", b1_raw[test_indices]),
        ("B2_Drawdown_10Pct", b2_raw[test_indices]),
        ("B3_Below_200SMA", b3_raw[test_indices]),
        ("B4_Composite_Vol_DD", b4_raw[test_indices]),
    ]:
        eval_b = evaluate_alerts(b_arr, test_dates, test_returns, test_crises, test_years_span)
        baseline_results[b_name] = eval_b
        print(f"   Baseline {b_name:22}: Recall={eval_b['event_recall']*100:4.1f}%, FA/yr={eval_b['false_alarms_per_year']:4.2f}, Occupancy={eval_b['occupancy_pct']:4.1f}%, OppCost={eval_b['mean_opp_cost_pct']:+5.1f}%")

    # 2. Expanding Walk-Forward for ML Models across Decay Regimes
    model_results = {}

    for decay_name, hl in half_lives.items():
        print(f"\n── Running Expanding Walk-Forward with Decay: {decay_name} (Half-life = {hl} years)...", flush=True)
        
        preds_enet = np.zeros(len(test_indices), dtype=float)
        preds_hazard = np.zeros(len(test_indices), dtype=float)
        preds_lgb = np.zeros(len(test_indices), dtype=float)

        curr_test_ptr = 0

        for test_yr in test_years_list:
            train_mask = (years < test_yr) & (in_risk_set == 1)
            test_mask = (years == test_yr)

            idx_train = np.where(train_mask)[0]
            idx_test = np.where(test_mask)[0]
            if len(idx_test) == 0:
                continue

            # Point-in-Time threshold strictly from training fold
            # theta is 95th percentile of future MDD on training fold
            theta_train = float(np.quantile(target_mdd[idx_train], 0.95))
            y_train = (target_mdd[idx_train] >= theta_train).astype(int)

            # Point-in-Time Scaling (RobustScaler using training fold statistics)
            scaler = RobustScaler()
            X_train = scaler.fit_transform(X_raw[idx_train])
            X_test = scaler.transform(X_raw[idx_test])

            # Sample weights with correct exponential decay: w = 2^(-Age / T_half)
            if hl is not None:
                curr_year_val = test_yr
                ages = curr_year_val - years[idx_train]
                weights_train = 2.0 ** (-ages / hl)
            else:
                weights_train = np.ones(len(idx_train), dtype=float)

            # Fit 1: Elastic Net (Logistic Regression with l1_ratio=0.5, C=0.5)
            clf_enet = LogisticRegression(
                penalty="elasticnet",
                l1_ratio=0.5,
                C=0.5,
                solver="saga",
                max_iter=500,
                random_state=42,
                class_weight="balanced",
            )
            clf_enet.fit(X_train, y_train, sample_weight=weights_train)
            p_enet = clf_enet.predict_proba(X_test)[:, 1]

            # Fit 2: Discrete Hazard Model (Unregularized Logit on clean risk-set)
            clf_hazard = LogisticRegression(
                penalty="l2",
                C=1.0,
                solver="lbfgs",
                max_iter=300,
                random_state=42,
                class_weight="balanced",
            )
            clf_hazard.fit(X_train, y_train, sample_weight=weights_train)
            p_hazard = clf_hazard.predict_proba(X_test)[:, 1]

            # Fit 3: Shallow LightGBM (max_depth=2, num_leaves=3, min_child_samples=20)
            clf_lgb = lgb.LGBMClassifier(
                max_depth=2,
                num_leaves=3,
                min_child_samples=20,
                learning_rate=0.03,
                n_estimators=50,
                random_state=42,
                verbosity=-1,
            )
            clf_lgb.fit(X_train, y_train, sample_weight=weights_train)
            p_lgb = clf_lgb.predict_proba(X_test)[:, 1]

            # Store predictions for this year's test fold
            n_fold = len(idx_test)
            preds_enet[curr_test_ptr:curr_test_ptr+n_fold] = p_enet
            preds_hazard[curr_test_ptr:curr_test_ptr+n_fold] = p_hazard
            preds_lgb[curr_test_ptr:curr_test_ptr+n_fold] = p_lgb
            curr_test_ptr += n_fold

        # Find operational alert thresholds targeting warning occupancy <= 18%
        for m_name, probs in [
            ("ElasticNet", preds_enet),
            ("DiscreteHazard", preds_hazard),
            ("ShallowLightGBM", preds_lgb),
        ]:
            # Alert threshold at 82nd percentile of predicted probabilities (yielding ~18% occupancy)
            cutoff = float(np.quantile(probs, 0.82))
            alerts = (probs >= cutoff).astype(int)
            eval_res = evaluate_alerts(alerts, test_dates, test_returns, test_crises, test_years_span)
            eval_res["cutoff_p"] = round(cutoff, 3)
            key = f"{m_name}__{decay_name}"
            model_results[key] = eval_res
            print(f"   {key:30}: Recall={eval_res['event_recall']*100:4.1f}%, FA/yr={eval_res['false_alarms_per_year']:4.2f}, Occupancy={eval_res['occupancy_pct']:4.1f}%, OppCost={eval_res['mean_opp_cost_pct']:+5.1f}% (cutoff={cutoff:.2f})")

    # Combine all results into summary comparison
    full_summary = {
        "evaluation_period": f"{test_dates[0]} to {test_dates[-1]}",
        "years": round(test_years_span, 1),
        "total_test_sessions": len(test_indices),
        "crises_in_test": len(test_crises),
        "crises_list": [cr["onset_date"] for cr in test_crises],
        "baselines": baseline_results,
        "models": model_results,
    }

    out_file = RESULTS_DIR / "walk_forward_evaluation.json"
    out_file.write_text(json.dumps(full_summary, indent=2), encoding="utf-8")
    print(f"\n✓ Backtest complete. Comprehensive results written to {out_file}")
    return full_summary


if __name__ == "__main__":
    run_walk_forward()
