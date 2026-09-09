#!/usr/bin/env python3
"""Forensic Autopsy of all 42 V4 False Warning Episodes.

Extracts:
- Exact date bounds, duration, score trajectory, and specialist contributions.
- Microstructure & contagion features (breadth, illiquidity, volatility accel, global stress, transmission beta).
- Forward market outcomes: 5d, 10d, 25d forward returns, MAE_25d, MFE_25d.
- Distance to nearest crisis onset.
- Interpretable taxonomy clustering:
  A: isolated short spike (<= 2 days)
  B: prolonged harmless regime (duration >= 8 days, MAE < 6%)
  C: global stress without domestic transmission (stress_breadth >= 0.40, beta/breadth benign)
  D: local deterioration without follow-through (breadth low, but market rallied MFE > 5%)
  E: duplicate alert associated with same eventual crisis (onset within 30-60 days)
  F: post-crisis / rebound contamination (within 60 days after trough)
  G: near-miss correction (MAE >= 8.0% but did not reach the -18% mechanical crisis threshold)

Outputs:
- `public/data/v1/backtest/v5_false_alarm_autopsy.csv`
"""

import csv
import json
import math
import pathlib
import sys
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import RobustScaler

REPO = pathlib.Path(__file__).resolve().parent.parent
sys.path.append(str(REPO))

DATA_DIR = REPO / "data-source" / "fragility"
SHOCKS_DIR = DATA_DIR / "global_shocks"
EM_DIR = DATA_DIR / "em_panel"
OUT_DIR = REPO / "public" / "data" / "v1" / "backtest"

def cluster_episodes(alert_mask: np.ndarray, max_gap: int = 5) -> list[tuple[int, int]]:
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

def run_autopsy():
    raw = json.loads((DATA_DIR / "v2_dataset_daily.json").read_text(encoding="utf-8"))
    rows = raw["rows"]
    metadata = raw["metadata"]
    episodes = [ep for ep in metadata["episodes"] if ep["onset_date"] >= "2008-01-01"]
    dates = [r["date"] for r in rows]
    returns = np.array([r["return_egx30"] for r in rows], dtype=float)
    prices = np.array([r["price_egx30"] for r in rows], dtype=float)
    T = len(rows)
    years = np.array([int(d[:4]) for d in dates])
    test_indices = np.where(years >= 2008)[0]
    test_years = sorted(list(set(years[test_indices])))

    # Targets & Censoring
    y_tactical = np.zeros(T, dtype=int)
    y_early = np.zeros(T, dtype=int)
    y_strategic = np.zeros(T, dtype=int)
    in_clean_risk_set = np.ones(T, dtype=bool)

    for ep in metadata["episodes"]:
        onset = ep["onset_idx"]
        trough = ep["trough_idx"]
        cooldown = ep["cooldown_end_idx"]
        st_s = max(0, onset - 60)
        en_s = max(0, onset - 26)
        if en_s >= st_s: y_strategic[st_s : en_s + 1] = 1
        st_e = max(0, onset - 25)
        en_e = max(0, onset - 5)
        if en_e >= st_e: y_early[st_e : en_e + 1] = 1
        st_t = max(0, onset - 4)
        en_t = onset
        if en_t >= st_t: y_tactical[st_t : en_t + 1] = 1
        in_clean_risk_set[onset + 1 : cooldown + 1] = False

    # Features
    feat_a_names = [
        "f1_breadth", "f2_basis_smoothed", "f3_rate_mom", "f4_fx_vel", "f4_fx_acc",
        "f5_hhi", "f6_herding", "f7_panic", "f8_illiq_smoothed", "f9_ratio",
        "f10_spread", "f11_concentration", "f12_fx_strain"
    ]
    X_a = np.array([[r[f] for f in feat_a_names] for r in rows], dtype=float)

    feat_b_names = [
        "g1_vix_level", "g1_vix_zscore", "g2_vix_delta5", "g2_vix_accel20",
        "g3_eem_ret20", "g3_eem_dd60", "g4_dxy_mom20", "g4_dxy_mom60",
        "g5_us10y_surge20", "g6_wheat_shock20", "g6_oil_shock20", "g6_commodity_composite",
        "g7_peer_ret20", "g7_peer_dd60"
    ]
    X_b = np.array([[r[f] for f in feat_b_names] for r in rows], dtype=float)

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
    for i in range(20, T): breadth_mom20[i] = breadth[i] - breadth[i-20]
    breadth_collapse = np.maximum(0.0, 0.25 - breadth)
    ret20 = np.zeros(T, dtype=float)
    for i in range(20, T): ret20[i] = (prices[i] / prices[i-20]) - 1.0
    illiq = np.array([r["f8_illiq_smoothed"] for r in rows], dtype=float)
    peer_ret20 = np.array([r["g7_peer_ret20"] for r in rows], dtype=float)

    # Expanding Walk-Forward
    s_a_oof = np.zeros(T, dtype=float)
    s_b_oof = np.zeros(T, dtype=float)
    p_strat_oof = np.zeros(T, dtype=float)
    p_early_oof = np.zeros(T, dtype=float)
    p_tact_oof = np.zeros(T, dtype=float)

    for y in test_years:
        idx_te = np.where(years == y)[0]
        if len(idx_te) == 0: continue
        te_start = idx_te[0]
        max_tr_idx = max(0, te_start - 25)
        idx_tr = np.where((np.arange(T) <= max_tr_idx) & in_clean_risk_set)[0]
        if len(idx_tr) < 200: continue
        ages = (te_start - idx_tr) / 250.0
        weights = 2.0 ** (-ages / 15.0)

        sc_a = RobustScaler()
        X_tr_a = sc_a.fit_transform(X_a[idx_tr])
        X_te_a = sc_a.transform(X_a[idx_te])
        clf_a = LogisticRegression(C=0.5, class_weight="balanced", max_iter=1000, random_state=42)
        clf_a.fit(X_tr_a, y_strategic[idx_tr], sample_weight=weights)
        s_a_oof[idx_te] = clf_a.predict_proba(X_te_a)[:, 1]

        y_tr_ext = np.maximum(y_early[idx_tr], y_tactical[idx_tr])
        sc_b = RobustScaler()
        X_tr_b = sc_b.fit_transform(X_b[idx_tr])
        X_te_b = sc_b.transform(X_b[idx_te])
        clf_b = LogisticRegression(C=0.5, class_weight="balanced", max_iter=1000, random_state=42)
        clf_b.fit(X_tr_b, y_tr_ext, sample_weight=weights)
        s_b_oof[idx_te] = clf_b.predict_proba(X_te_b)[:, 1]

    meta_features = np.column_stack([
        s_a_oof, s_b_oof, np.maximum(s_a_oof, s_b_oof), s_a_oof * s_b_oof,
        vol20, b1_vol, np.maximum(0.0, vol_shock), np.maximum(0.0, vol_accel),
        stress_breadth, delta_beta, breadth_collapse, breadth_mom20, ret20,
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

        clf_e = LogisticRegression(C=0.4, class_weight="balanced", max_iter=1000, random_state=42)
        clf_e.fit(X_tr_m, y_early[idx_tr], sample_weight=weights)
        p_early_oof[idx_te] = clf_e.predict_proba(X_te_m)[:, 1]

        clf_s = LogisticRegression(C=0.4, class_weight="balanced", max_iter=1000, random_state=42)
        clf_s.fit(X_tr_m, y_strategic[idx_tr], sample_weight=weights)
        p_strat_oof[idx_te] = clf_s.predict_proba(X_te_m)[:, 1]

    raw_int = 0.50 * s_a_oof + 0.30 * p_strat_oof + 0.20 * p_early_oof
    raw_ext = (
        0.40 * b1_vol
        + 0.30 * np.maximum(0.0, np.minimum(3.0, vol_shock)) / 3.0
        + 0.30 * stress_breadth
    ) * np.where(ret20 <= 0.03, 1.0, 0.4)

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

    # Reconstruct V4 recommended alerts: th=0.920, hold=8, cd=20
    th = 0.920
    hold_days = 8
    cooldown_days = 20

    al = np.zeros(T, dtype=int)
    i = 2
    while i < T:
        if s_v4[i] >= th and s_v4[i-1] >= th:
            end_hold = min(T, i + hold_days)
            al[i:end_hold] = 1
            i = end_hold + cooldown_days
        else:
            i += 1

    eval_al = al[test_indices]
    clusters = cluster_episodes(eval_al, max_gap=5)

    print(f"Total warning episodes in V4 (test): {len(clusters)}")

    false_episodes_data = []
    false_count = 0

    for c_idx, (st_c, en_c) in enumerate(clusters):
        g_st = test_indices[st_c]
        g_en = test_indices[en_c]
        dur = g_en - g_st + 1

        is_valid = False
        matching_ep = None
        for ep in episodes:
            if (ep["onset_idx"] - 25) <= g_en and g_st <= ep["trough_idx"]:
                is_valid = True
                matching_ep = ep
                break

        if is_valid:
            continue

        false_count += 1
        ep_slice = slice(g_st, g_en + 1)
        max_score = float(np.max(s_v4[ep_slice]))
        avg_score = float(np.mean(s_v4[ep_slice]))
        
        pre_idx = max(0, g_st - 5)
        score_slope = float((s_v4[g_en] - s_v4[pre_idx]) / max(1, g_en - pre_idx))

        mean_sa = float(np.mean(s_a_oof[ep_slice]))
        mean_sb = float(np.mean(s_b_oof[ep_slice]))
        mean_vol20 = float(np.mean(vol20[ep_slice]))
        mean_volacc = float(np.mean(vol_accel[ep_slice]))
        min_breadth = float(np.min(breadth[ep_slice]))
        mean_illiq = float(np.mean(illiq[ep_slice]))
        mean_stress_breadth = float(np.mean(stress_breadth[ep_slice]))
        mean_peer_ret20 = float(np.mean(peer_ret20[ep_slice]))
        mean_delta_beta = float(np.mean(delta_beta[ep_slice]))

        fwd_5 = float((prices[min(T-1, g_en + 5)] / prices[g_en]) - 1.0)
        fwd_10 = float((prices[min(T-1, g_en + 10)] / prices[g_en]) - 1.0)
        fwd_25 = float((prices[min(T-1, g_en + 25)] / prices[g_en]) - 1.0)

        fwd_window_prices = prices[g_st : min(T, g_st + 26)]
        base_p = prices[g_st]
        mae_25 = float(np.min(fwd_window_prices / base_p - 1.0))
        mfe_25 = float(np.max(fwd_window_prices / base_p - 1.0))

        onset_diffs = [(ep["onset_idx"] - g_en, ep["onset_date"]) for ep in episodes]
        onset_diffs.sort(key=lambda x: abs(x[0]))
        dist_to_onset, nearest_onset_date = onset_diffs[0]

        trough_diffs = [(g_st - ep["trough_idx"], ep["trough_date"]) for ep in episodes]
        post_troughs = [x for x in trough_diffs if 0 <= x[0] <= 60]

        # Categorize
        if mae_25 <= -0.08:
            cat = "G_NearMiss_Correction"
        elif len(post_troughs) > 0 and post_troughs[0][0] <= 45:
            cat = "F_PostCrisis_Contamination"
        elif 0 < dist_to_onset <= 50:
            cat = "E_Duplicate_PrematureWave"
        elif mean_stress_breadth >= 0.40 and min_breadth >= 0.45:
            cat = "C_GlobalStress_NoTransmission"
        elif dur <= 2:
            cat = "A_Isolated_ShortSpike"
        elif min_breadth < 0.35 and mfe_25 > 0.05:
            cat = "D_LocalDeterioration_NoFollowThrough"
        elif dur >= 8 and mae_25 > -0.06:
            cat = "B_Prolonged_HarmlessRegime"
        else:
            cat = "G_Other"

        is_near_miss = (mae_25 <= -0.08)
        is_hard_false = not is_near_miss

        false_episodes_data.append({
            "episode_id": false_count,
            "start_date": dates[g_st],
            "end_date": dates[g_en],
            "duration": dur,
            "max_v4_score": round(max_score, 4),
            "avg_v4_score": round(avg_score, 4),
            "score_slope": round(score_slope, 4),
            "internal_score": round(mean_sa, 4),
            "external_score": round(mean_sb, 4),
            "realized_volatility": round(mean_vol20, 4),
            "volatility_accel": round(mean_volacc, 4),
            "breadth": round(min_breadth, 4),
            "liquidity_stress": round(mean_illiq, 4),
            "global_stress_breadth": round(mean_stress_breadth, 4),
            "peer_em_return20": round(mean_peer_ret20, 4),
            "egx_eem_delta_beta": round(mean_delta_beta, 4),
            "fwd_ret_5d": round(fwd_5, 4),
            "fwd_ret_10d": round(fwd_10, 4),
            "fwd_ret_25d": round(fwd_25, 4),
            "mae_25d": round(mae_25, 4),
            "mfe_25d": round(mfe_25, 4),
            "dist_to_nearest_onset": dist_to_onset,
            "nearest_onset_date": nearest_onset_date,
            "cluster_type": cat,
            "is_near_miss": is_near_miss,
            "is_hard_false_alarm": is_hard_false,
        })

    print(f"Total false episodes audited: {len(false_episodes_data)}")

    out_csv = OUT_DIR / "v5_false_alarm_autopsy.csv"
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(false_episodes_data[0].keys()))
        writer.writeheader()
        writer.writerows(false_episodes_data)
    print(f"✓ Saved false alarm autopsy to {out_csv}")

    from collections import Counter
    counts = Counter(r["cluster_type"] for r in false_episodes_data)
    near_misses = sum(1 for r in false_episodes_data if r["is_near_miss"])
    hard_falses = sum(1 for r in false_episodes_data if r["is_hard_false_alarm"])

    print("\n" + "=" * 80)
    print("V4 FALSE-ALARM AUTOPSY BREAKDOWN (42 EPISODES)")
    print("=" * 80)
    for c_type, count in counts.most_common():
        pct = count / len(false_episodes_data)
        print(f"   * {c_type:<38}: {count:>2} episodes ({pct:>5.1%})")
    print("-" * 80)
    print(f"   * Near-Miss Corrections (MAE <= -8%):    {near_misses:>2} episodes ({near_misses/len(false_episodes_data):>5.1%})")
    print(f"   * Hard False Alarms (MAE > -8%):        {hard_falses:>2} episodes ({hard_falses/len(false_episodes_data):>5.1%})")
    print("=" * 80)

if __name__ == "__main__":
    run_autopsy()
