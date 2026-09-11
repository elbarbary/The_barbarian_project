#!/usr/bin/env python3
"""Leave-One-Crisis-Out (LOCO) & Walk-Forward Validation for Challenger C-v2.

Executes:
1. 17-Fold Leave-One-Crisis-Out Cross-Validation:
   - In each fold k (1..17), crisis k is completely withheld.
   - The optimal parameter set theta* is selected strictly on the 16 remaining training crises.
   - theta* is frozen and tested on the unseen Crisis k.
   - Reports Out-Of-Fold (OOF) Strict Hits, Broad Hits, and Lead Time.
2. Chronological Walk-Forward Validation:
   - Split 1: Train on 2008-2014 (Crises 12-22) -> Test Out-of-Sample on 2015-2017 (Crises 23-24)
   - Split 2: Train on 2008-2017 (Crises 12-24) -> Test Out-of-Sample on 2018-2020 (Crises 25-26)
   - Split 3: Train on 2008-2020 (Crises 12-26) -> Test Out-of-Sample on 2021-2024 (Crises 27-28)
"""

from __future__ import annotations

import json
import math
import pathlib
import sys
import numpy as np

REPO = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "scripts"))

from canonical_alert_evaluator import evaluate_canonical
import run_v5_precision_engine as v5

def main():
    rows_egx, meta_egx, ep_egx, dates_all, returns, prices, T_all, yrs_all, test_indices, te_yrs, eval_years = v5.load_data()
    crises_egx = [c for c in meta_egx["episodes"] if c["onset_date"] >= "2008-01-01"]
    assert len(crises_egx) == 17, f"Expected 17 crises, got {len(crises_egx)}"

    arrs = np.load(REPO / "scratch" / "v5_arrays.npz", allow_pickle=True)
    s_v4 = arrs["s_v4"]
    s_slope5 = arrs["s_slope5"]
    stress_count = arrs["stress_count"]

    # Load external global shocks
    SHOCK_DIR = REPO / "data-source" / "fragility" / "global_shocks"
    def load_shock(fn):
        with open(SHOCK_DIR / fn) as f: d = json.load(f)
        arr = np.zeros(T_all)
        last_val = 0.0
        for i, date in enumerate(dates_all):
            if date in d: last_val = float(d[date])
            arr[i] = last_val
        return arr

    brent_px = load_shock("brent.json")
    wheat_px = load_shock("wheat.json")
    vix_px = load_shock("vix.json")
    dxy_px = load_shock("dxy.json")
    eem_px = load_shock("msci_em.json")

    brent_ret20 = np.zeros(T_all)
    wheat_ret20 = np.zeros(T_all)
    vix_delta5 = np.zeros(T_all)
    dxy_ret20 = np.zeros(T_all)
    eem_ret20 = np.zeros(T_all)

    for i in range(20, T_all):
        if brent_px[i-20] > 0: brent_ret20[i] = (brent_px[i] - brent_px[i-20]) / brent_px[i-20]
        if wheat_px[i-20] > 0: wheat_ret20[i] = (wheat_px[i] - wheat_px[i-20]) / wheat_px[i-20]
        if dxy_px[i-20] > 0: dxy_ret20[i] = (dxy_px[i] - dxy_px[i-20]) / dxy_px[i-20]
        if eem_px[i-20] > 0: eem_ret20[i] = -(eem_px[i] - eem_px[i-20]) / eem_px[i-20]

    for i in range(5, T_all):
        vix_delta5[i] = vix_px[i] - vix_px[i-5]

    c_oil = np.clip(brent_ret20 / 0.25, 0.0, 1.0)
    c_wheat = np.clip(wheat_ret20 / 0.25, 0.0, 1.0)
    cat_comm = np.maximum(c_oil, c_wheat)

    c_vix_surge = np.clip(vix_delta5 / 8.0, 0.0, 1.0)
    c_vix_level = np.clip((vix_px - 20.0) / 20.0, 0.0, 1.0)
    c_dxy = np.clip(dxy_ret20 / 0.05, 0.0, 1.0)
    c_eem = np.clip(eem_ret20 / 0.10, 0.0, 1.0)
    cat_volrisk = 0.40 * c_vix_surge + 0.20 * c_vix_level + 0.20 * c_eem + 0.20 * c_dxy

    # Pre-generate alert series for grid combinations
    param_grid = []
    for sens_th in [0.920, 0.925, 0.930, 0.935]:
        for gate_comm in [0.88, 0.90]:
            for th_comm in [0.50, 0.60]:
                for gate_risk in [0.88, 0.90]:
                    for th_risk in [0.40, 0.45]:
                        param_grid.append({
                            "sens_th": sens_th,
                            "gate_comm": gate_comm,
                            "th_comm": th_comm,
                            "gate_risk": gate_risk,
                            "th_risk": th_risk,
                            "cool": 20,
                            "max_h": 8
                        })

    print(f"Precomputing alert series for {len(param_grid)} parameter combinations...")
    grid_alerts = []
    for p in param_grid:
        al = np.zeros(T_all, dtype=int)
        st = 0; hl = 0; rf = 0
        for i in range(2, T_all):
            if rf > 0: rf -= 1; continue
            sens_cons = True
            for k in range(2):
                if s_v4[i - k] < p["sens_th"]: sens_cons = False; break
            sens_trig = sens_cons and (s_slope5[i] >= 0.000) and (stress_count[i] >= 1)
            comm_trig = (s_v4[i] >= p["gate_comm"]) and (cat_comm[i] >= p["th_comm"]) and (stress_count[i] >= 1)
            risk_trig = (s_v4[i] >= p["gate_risk"]) and (cat_volrisk[i] >= p["th_risk"]) and (stress_count[i] >= 1)
            trig = sens_trig or comm_trig or risk_trig

            if st == 0:
                if trig: st = 1; hl = 1; al[i] = 1
            else:
                hl += 1; al[i] = 1
                if hl >= 5:
                    exit_cond = ((s_v4[i] < 0.885) and (cat_comm[i] < p["th_comm"] * 0.70) and (cat_volrisk[i] < p["th_risk"] * 0.70)) or hl >= p["max_h"]
                    if exit_cond: st = 0; rf = p["cool"]
        grid_alerts.append(al)

    print("Alert precomputations complete.")

    # =========================================================================
    # EXPERIMENT 1: LEAVE-ONE-CRISIS-OUT (LOCO) CROSS-VALIDATION (17 FOLDS)
    # =========================================================================
    print("\n" + "="*80)
    print("EXPERIMENT 1: LEAVE-ONE-CRISIS-OUT (LOCO) CROSS-VALIDATION (17 FOLDS)")
    print("="*80)

    loco_results = []
    oof_strict_hits = 0
    oof_broad_hits = 0

    for fold_idx in range(17):
        test_crisis = crises_egx[fold_idx]
        train_crises = [c for j, c in enumerate(crises_egx) if j != fold_idx]

        # Optimize on train_crises
        best_idx = None
        best_metrics = None

        for p_idx, al in enumerate(grid_alerts):
            res_train = evaluate_canonical(al, dates_all, prices, returns, train_crises, eval_indices=test_indices, eval_years=eval_years)
            b_hits = res_train["broad_buildup_hits"]
            s_hits = res_train["strict_early_hits"]
            occ = res_train["occupancy"]
            fa = res_train["hard_fa_rate"]

            # Pareto criteria: Maximize broad hits, maximize strict hits, minimize occupancy, minimize FA
            candidate_key = (-b_hits, -s_hits, occ, fa)
            if best_metrics is None or candidate_key < best_metrics:
                best_metrics = candidate_key
                best_idx = p_idx

        chosen_params = param_grid[best_idx]
        chosen_al = grid_alerts[best_idx]

        # Test Out-of-Fold on test_crisis
        res_test = evaluate_canonical(chosen_al, dates_all, prices, returns, [test_crisis], eval_indices=test_indices, eval_years=eval_years)
        t_crisis_rec = res_test["crises"][0]

        is_strict = t_crisis_rec["canonical_status"] == "STRICT_EARLY"
        is_broad = t_crisis_rec["broad_buildup_hit"]

        if is_strict: oof_strict_hits += 1
        if is_broad: oof_broad_hits += 1

        loco_results.append({
            "fold": fold_idx + 1,
            "omitted_crisis_id": test_crisis["episode_id"],
            "omitted_onset_date": test_crisis["onset_date"],
            "chosen_params": chosen_params,
            "train_broad_recall": f"{-best_metrics[0]}/16",
            "train_strict_recall": f"{-best_metrics[1]}/16",
            "train_occupancy": f"{best_metrics[2]:.2f}%",
            "oof_status": t_crisis_rec["canonical_status"],
            "oof_lead_sessions": t_crisis_rec["lead_sessions"],
            "oof_alert_date": t_crisis_rec["alert_date"],
            "oof_strict_hit": is_strict,
            "oof_broad_hit": is_broad
        })

        print(f"Fold {fold_idx+1:2d} (Omitted {test_crisis['episode_id']} on {test_crisis['onset_date']}): "
              f"Train={-best_metrics[0]}/16 B, {-best_metrics[1]}/16 S | "
              f"OOF Result = {t_crisis_rec['canonical_status']:22s} | Lead = {str(t_crisis_rec['lead_sessions']):>4s} sess | "
              f"Params: sens={chosen_params['sens_th']} comm_th={chosen_params['th_comm']} risk_th={chosen_params['th_risk']}")

    print("\n--- LOCO CROSS-VALIDATION SUMMARY ---")
    print(f"Out-of-Fold Strict Early Recall: {oof_strict_hits}/17 ({oof_strict_hits/17*100:.2f}%)")
    print(f"Out-of-Fold Broad Buildup Recall: {oof_broad_hits}/17 ({oof_broad_hits/17*100:.2f}%)")

    # =========================================================================
    # EXPERIMENT 2: CHRONOLOGICAL WALK-FORWARD VALIDATION
    # =========================================================================
    print("\n" + "="*80)
    print("EXPERIMENT 2: CHRONOLOGICAL WALK-FORWARD VALIDATION")
    print("="*80)

    # Split 1: Train 2008-2014 (Crises 12-22, N=11) -> Test 2015-2017 (Crises 23-24, N=2)
    # Split 2: Train 2008-2017 (Crises 12-24, N=13) -> Test 2018-2020 (Crises 25-26, N=2)
    # Split 3: Train 2008-2020 (Crises 12-26, N=15) -> Test 2021-2024 (Crises 27-28, N=2)

    walk_forward_splits = [
        {
            "split_name": "Split 1 (2008-2014 -> 2015-2017)",
            "train_range": ("2008-01-01", "2014-12-31"),
            "test_range": ("2015-01-01", "2017-12-31"),
        },
        {
            "split_name": "Split 2 (2008-2017 -> 2018-2020)",
            "train_range": ("2008-01-01", "2017-12-31"),
            "test_range": ("2018-01-01", "2020-12-31"),
        },
        {
            "split_name": "Split 3 (2008-2020 -> 2021-2024)",
            "train_range": ("2008-01-01", "2020-12-31"),
            "test_range": ("2021-01-01", "2026-09-09"),
        }
    ]

    wf_results = []
    total_oos_crises = 0
    total_oos_strict = 0
    total_oos_broad = 0

    for s_info in walk_forward_splits:
        tr_crises = [c for c in crises_egx if s_info["train_range"][0] <= c["onset_date"] <= s_info["train_range"][1]]
        te_crises = [c for c in crises_egx if s_info["test_range"][0] <= c["onset_date"] <= s_info["test_range"][1]]
        
        # Subsample indices for training period
        tr_indices = [idx for idx in test_indices if s_info["train_range"][0] <= dates_all[idx] <= s_info["train_range"][1]]
        te_indices = [idx for idx in test_indices if s_info["test_range"][0] <= dates_all[idx] <= s_info["test_range"][1]]
        
        # Select best parameter tuple strictly on tr_crises and tr_indices
        best_p_idx = None
        best_p_metrics = None
        for p_idx, al in enumerate(grid_alerts):
            res_tr = evaluate_canonical(al, dates_all, prices, returns, tr_crises, eval_indices=tr_indices)
            key = (-res_tr["broad_buildup_hits"], -res_tr["strict_early_hits"], res_tr["occupancy"], res_tr["hard_fa_rate"])
            if best_p_metrics is None or key < best_p_metrics:
                best_p_metrics = key
                best_p_idx = p_idx

        opt_p = param_grid[best_p_idx]
        opt_al = grid_alerts[best_p_idx]

        # Evaluate strictly out-of-sample on te_crises and te_indices
        res_te = evaluate_canonical(opt_al, dates_all, prices, returns, te_crises, eval_indices=te_indices)

        s_hits = res_te["strict_early_hits"]
        b_hits = res_te["broad_buildup_hits"]
        tot_c = len(te_crises)
        total_oos_crises += tot_c
        total_oos_strict += s_hits
        total_oos_broad += b_hits

        split_rec = {
            "split_name": s_info["split_name"],
            "train_crises_count": len(tr_crises),
            "test_crises_count": tot_c,
            "chosen_parameters": opt_p,
            "oos_strict_hits": f"{s_hits}/{tot_c}",
            "oos_broad_hits": f"{b_hits}/{tot_c}",
            "oos_occupancy": f"{res_te['occupancy']:.2f}%",
            "oos_crises": [
                {
                    "episode_id": c["episode_id"],
                    "onset_date": c["onset_date"],
                    "status": c["canonical_status"],
                    "lead_sessions": c["lead_sessions"]
                }
                for c in res_te["crises"]
            ]
        }
        wf_results.append(split_rec)

        print(f"\n{s_info['split_name']}:")
        print(f"  Train: {len(tr_crises)} crises | Parameters chosen: sens={opt_p['sens_th']} comm_th={opt_p['th_comm']} risk_th={opt_p['th_risk']}")
        print(f"  Test:  {tot_c} crises | OOS Strict: {s_hits}/{tot_c} | OOS Broad: {b_hits}/{tot_c} | OOS Occupancy: {res_te['occupancy']:.2f}%")
        for c in res_te["crises"]:
            print(f"    Crisis {c['episode_id']} ({c['onset_date']}): {c['canonical_status']} | Lead = {c['lead_sessions']} sess")

    print("\n" + "="*80)
    print("CHRONOLOGICAL WALK-FORWARD AGGREGATE OUT-OF-SAMPLE RESULTS")
    print("="*80)
    print(f"Total Out-Of-Sample Crises Evaluated: {total_oos_crises}")
    print(f"Aggregate OOS Strict Early Recall:   {total_oos_strict}/{total_oos_crises} ({total_oos_strict/total_oos_crises*100:.2f}%)")
    print(f"Aggregate OOS Broad Buildup Recall:  {total_oos_broad}/{total_oos_crises} ({total_oos_broad/total_oos_crises*100:.2f}%)")

    # Serialize results
    final_output = {
        "loco_cross_validation": {
            "folds": loco_results,
            "aggregate_oof_strict_early_hits": oof_strict_hits,
            "aggregate_oof_strict_early_recall_pct": round(oof_strict_hits / 17 * 100.0, 2),
            "aggregate_oof_broad_buildup_hits": oof_broad_hits,
            "aggregate_oof_broad_buildup_recall_pct": round(oof_broad_hits / 17 * 100.0, 2)
        },
        "chronological_walk_forward": {
            "splits": wf_results,
            "total_oos_crises": total_oos_crises,
            "aggregate_oos_strict_early_hits": total_oos_strict,
            "aggregate_oos_strict_early_recall_pct": round(total_oos_strict / total_oos_crises * 100.0, 2),
            "aggregate_oos_broad_buildup_hits": total_oos_broad,
            "aggregate_oos_broad_buildup_recall_pct": round(total_oos_broad / total_oos_crises * 100.0, 2)
        }
    }

    def default_j(o):
        if isinstance(o, (np.integer, int)): return int(o)
        if isinstance(o, (np.floating, float)): return float(o)
        return str(o)

    with open(REPO / "scratch" / "c_v2_loco_and_walkforward_results.json", "w") as f:
        json.dump(final_output, f, indent=2, default=default_j)
    print("\n✓ Saved scratch/c_v2_loco_and_walkforward_results.json")

if __name__ == "__main__":
    main()
