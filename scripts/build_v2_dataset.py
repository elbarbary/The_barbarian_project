#!/usr/bin/env python3
"""Build the EGX Fragility Engine V2 Dataset (1998–2026).

Implements the Dual-Engine Architecture:
- Engine A: Internal Fragility (Strategic H=60 sessions)
  Features F1..F12: Breadth, CIB GDR Basis, Yield Gap, FX Velocity/Acceleration,
  Concentration HHI, Downside Herding, Panic Selling, Amihud Illiquidity,
  Asymmetric Impact, Large vs Retail Spread, Institutional Imbalance, FX Strain.

- Engine B: External Shock Pressure (Tactical H=5..10 sessions)
  Features G1..G7: VIX level/z-score, VIX delta/acceleration, MSCI EM drawdown/return,
  US Dollar Index surge, US 10Y Yield shock, Commodity Terms-of-Trade shock (Wheat & Oil),
  Peer EM Contagion Index (Turkey, Argentina, South Africa, Brazil).

Strict Point-in-Time Alignment:
  For any EGX session at date t, all global/external observations used are from
  calendar dates d < t (strictly prior to EGX trading session).

Outputs:
  - `data-source/fragility/v2_dataset_daily.json`
  - `data-source/fragility/v2_dataset_daily.csv`
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

REPO = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = REPO / "data-source" / "fragility"
SHOCKS_DIR = DATA_DIR / "global_shocks"
EM_DIR = DATA_DIR / "em_panel"
PRICES_DIR = REPO / "data-source" / "prices"


def load_json(path: pathlib.Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def get_aligned_point_in_time(series: dict[str, float], dates: list[str]) -> np.ndarray:
    """Forward-fill series aligning strictly to prior completed date (d_global < d_egx)."""
    sorted_s_dates = sorted(series.keys())
    if not sorted_s_dates:
        return np.zeros(len(dates), dtype=float)

    out = np.zeros(len(dates), dtype=float)
    s_idx = 0
    curr_val = series[sorted_s_dates[0]]

    for i, d in enumerate(dates):
        # Advance s_idx while the series date is strictly LESS than the EGX trading date d
        while s_idx < len(sorted_s_dates) and sorted_s_dates[s_idx] < d:
            curr_val = series[sorted_s_dates[s_idx]]
            s_idx += 1
        out[i] = curr_val
    return out


def build_v2_dataset() -> dict:
    print("── 1. Loading EGX & Domestic Series...")
    egx30_raw = load_json(DATA_DIR / "egx30.json")
    egx70_raw = load_json(DATA_DIR / "egx70ewi.json")
    egx100_raw = load_json(DATA_DIR / "egx100ewi.json")
    fx_raw = load_json(DATA_DIR / "usd_egp.json")
    gdr_raw = load_json(DATA_DIR / "cib_gdr_london.json")
    bond_raw = load_json(DATA_DIR / "egypt_1y_bond.json")

    all_dates = sorted(egx30_raw.keys())
    T = len(all_dates)
    print(f"   EGX30 sessions: {T} ({all_dates[0]} to {all_dates[-1]})")

    # Domestic alignment
    fx_arr = np.zeros(T, dtype=float)
    last_fx = 3.40
    for i, d in enumerate(all_dates):
        if d in fx_raw:
            last_fx = fx_raw[d]
        elif d < "2001-05-31":
            if d >= "2001-01-01":
                last_fx = 3.85
            elif d >= "2000-01-01":
                last_fx = 3.48
            else:
                last_fx = 3.40
        fx_arr[i] = last_fx

    gdr_series: dict[str, float] = {}
    last_gdr = None
    for d in all_dates:
        if d in gdr_raw:
            last_gdr = gdr_raw[d]
        gdr_series[d] = last_gdr

    bond_arr = np.zeros(T, dtype=float)
    last_bond = 10.5
    for i, d in enumerate(all_dates):
        if d in bond_raw:
            last_bond = bond_raw[d]
        elif d < "2010-08-09":
            if d >= "2008-09-01":
                last_bond = 11.5
            elif d >= "2006-01-01":
                last_bond = 9.0
            else:
                last_bond = 10.0
        bond_arr[i] = last_bond

    print("── 2. Loading Global Shock & Peer EM Series (Point-in-Time)...")
    vix_raw = load_json(SHOCKS_DIR / "vix.json")
    eem_raw = load_json(SHOCKS_DIR / "msci_em.json")
    dxy_raw = load_json(SHOCKS_DIR / "dxy.json")
    us10y_raw = load_json(SHOCKS_DIR / "us10y.json")
    wheat_raw = load_json(SHOCKS_DIR / "wheat.json")
    brent_raw = load_json(SHOCKS_DIR / "brent.json")
    wti_raw = load_json(SHOCKS_DIR / "wti.json")

    turkey_raw = load_json(EM_DIR / "turkey_bist100.json")
    argentina_raw = load_json(EM_DIR / "argentina_merval.json")
    safrica_raw = load_json(EM_DIR / "south_africa_top40.json")
    brazil_raw = load_json(EM_DIR / "brazil_bovespa.json")

    # Point-in-time forward-fill alignment strictly prior to EGX date
    vix_pit = get_aligned_point_in_time(vix_raw, all_dates)
    eem_pit = get_aligned_point_in_time(eem_raw, all_dates)
    dxy_pit = get_aligned_point_in_time(dxy_raw, all_dates)
    us10y_pit = get_aligned_point_in_time(us10y_raw, all_dates)
    wheat_pit = get_aligned_point_in_time(wheat_raw, all_dates)
    brent_pit = get_aligned_point_in_time(brent_raw, all_dates)
    wti_pit = get_aligned_point_in_time(wti_raw, all_dates)

    turkey_pit = get_aligned_point_in_time(turkey_raw, all_dates)
    argentina_pit = get_aligned_point_in_time(argentina_raw, all_dates)
    safrica_pit = get_aligned_point_in_time(safrica_raw, all_dates)
    brazil_pit = get_aligned_point_in_time(brazil_raw, all_dates)

    # Blend Brent & WTI for full 1998-2026 oil coverage
    oil_pit = np.where(brent_pit > 0, brent_pit, wti_pit)

    print("── 3. Loading Constituent Stocks from data-source/prices/...")
    stock_files = sorted(PRICES_DIR.glob("*.json"))
    stocks_data: dict[str, dict[str, tuple[float, float]]] = {}
    comi_series: dict[str, float] = {}

    for f in stock_files:
        ticker = f.stem
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
            bars = d.get("bars", [])
            if not bars:
                continue
            s_bars: dict[str, tuple[float, float]] = {}
            for b in bars:
                dt_str = b.get("date")
                c = b.get("close")
                v = b.get("volume", 0.0)
                if dt_str and c is not None and c > 0:
                    s_bars[dt_str] = (float(c), float(v))
            if s_bars:
                stocks_data[ticker] = s_bars
                if ticker == "COMI":
                    comi_series = {k: v[0] for k, v in s_bars.items()}
        except Exception:
            continue

    print(f"   Active listings loaded: {len(stocks_data)}, COMI local bars: {len(comi_series)}")

    # EGX30 Price and basic stats
    prices_egx30 = np.array([egx30_raw[d] for d in all_dates], dtype=float)
    returns_egx30 = np.zeros(T, dtype=float)
    returns_egx30[1:] = prices_egx30[1:] / prices_egx30[:-1] - 1.0

    # Realized 20d volatility
    vol20 = np.zeros(T, dtype=float)
    for i in range(19, T):
        vol20[i] = np.std(returns_egx30[i-19:i+1]) * math.sqrt(252)

    # 120d Drawdown from trailing peak
    dd120 = np.zeros(T, dtype=float)
    for i in range(T):
        start_w = max(0, i - 120)
        peak = np.max(prices_egx30[start_w:i+1])
        dd120[i] = (prices_egx30[i] / peak) - 1.0

    # 200d SMA distance
    sma200_dist = np.zeros(T, dtype=float)
    for i in range(T):
        if i >= 199:
            sma = np.mean(prices_egx30[i-199:i+1])
            sma200_dist[i] = (prices_egx30[i] - sma) / sma
        else:
            sma200_dist[i] = 0.0

    # ── ENGINE A: INTERNAL FRAGILITY FEATURES (F1 .. F12) ──
    print("── 4. Engineering Engine A (Internal Fragility) Features...", flush=True)

    # Pre-compute constituent metrics
    stock_sma50: dict[str, dict[str, float]] = {}
    stock_r20: dict[str, dict[str, float]] = {}
    stock_to20: dict[str, dict[str, float]] = {}
    stock_illiq_daily: dict[str, dict[str, float]] = {}

    for ticker, s_bars in stocks_data.items():
        sorted_s_dates = sorted(s_bars.keys())
        s_prices = [s_bars[sd][0] for sd in sorted_s_dates]
        s_vols = [s_bars[sd][1] for sd in sorted_s_dates]
        s_to = [s_prices[k] * s_vols[k] for k in range(len(s_prices))]

        sma_map: dict[str, float] = {}
        for k in range(49, len(sorted_s_dates)):
            sma_map[sorted_s_dates[k]] = sum(s_prices[k-49:k+1]) / 50.0
        stock_sma50[ticker] = sma_map

        r20_map: dict[str, float] = {}
        to20_map: dict[str, float] = {}
        for k in range(19, len(sorted_s_dates)):
            r20_map[sorted_s_dates[k]] = (s_prices[k] / s_prices[k-19]) - 1.0
            to20_map[sorted_s_dates[k]] = sum(s_to[k-19:k+1])
        stock_r20[ticker] = r20_map
        stock_to20[ticker] = to20_map

        illiq_map: dict[str, float] = {}
        for k in range(1, len(sorted_s_dates)):
            r_1d = abs(s_prices[k] / s_prices[k-1] - 1.0)
            illiq_map[sorted_s_dates[k]] = r_1d / (s_to[k] * 1e-6 + 1.0)
        stock_illiq_daily[ticker] = illiq_map

    f1_breadth = np.zeros(T, dtype=float)
    f5_hhi = np.zeros(T, dtype=float)
    f8_illiq = np.zeros(T, dtype=float)
    f11_top3_concentration = np.zeros(T, dtype=float)

    for i, d in enumerate(all_dates):
        above_sma50 = 0
        total_active_sma = 0
        c_weights = []
        c_returns = []
        illiq_vals = []
        turnovers = []

        for ticker in stocks_data:
            sma_val = stock_sma50[ticker].get(d)
            if sma_val is not None:
                p_curr = stocks_data[ticker][d][0]
                if p_curr > sma_val:
                    above_sma50 += 1
                total_active_sma += 1

            to_val = stock_to20[ticker].get(d)
            r_val = stock_r20[ticker].get(d)
            if to_val is not None and r_val is not None:
                c_weights.append(to_val)
                c_returns.append(r_val)
                turnovers.append(to_val)

            il_val = stock_illiq_daily[ticker].get(d)
            if il_val is not None:
                illiq_vals.append(il_val)

        if total_active_sma >= 5:
            f1_breadth[i] = above_sma50 / total_active_sma
        else:
            f1_breadth[i] = 1.0 if (i >= 50 and prices_egx30[i] > np.mean(prices_egx30[i-49:i+1])) else 0.4

        if len(c_weights) >= 5 and sum(c_weights) > 0:
            tot_to = sum(c_weights)
            weights_arr = np.array(c_weights) / tot_to
            ret_arr = np.array(c_returns)
            contributions = np.abs(weights_arr * ret_arr)
            sum_c = np.sum(contributions)
            if sum_c > 1e-9:
                norm_c = contributions / sum_c
                f5_hhi[i] = float(np.sum(norm_c ** 2))
            else:
                f5_hhi[i] = 0.1
            # Top 3 turnover concentration
            sorted_to = sorted(turnovers, reverse=True)
            f11_top3_concentration[i] = sum(sorted_to[:3]) / tot_to
        else:
            f5_hhi[i] = 0.15
            f11_top3_concentration[i] = 0.35

        if illiq_vals:
            f8_illiq[i] = float(np.median(illiq_vals))
        else:
            f8_illiq[i] = 0.05

    # 20d smooth illiquidity & concentration
    f8_illiq_smoothed = np.zeros(T, dtype=float)
    f11_concentration_smoothed = np.zeros(T, dtype=float)
    for i in range(T):
        st = max(0, i - 19)
        f8_illiq_smoothed[i] = np.mean(f8_illiq[st:i+1])
        f11_concentration_smoothed[i] = np.mean(f11_top3_concentration[st:i+1])

    # F2: CIB GDR Basis (London implied EGP vs Local COMI)
    f2_basis = np.zeros(T, dtype=float)
    last_valid_basis = 0.0
    for i, d in enumerate(all_dates):
        p_comi = comi_series.get(d)
        p_gdr = gdr_series.get(d)
        fx_val = fx_arr[i]
        if p_comi and p_gdr and p_comi > 0 and p_gdr > 0 and fx_val > 0:
            implied_egp = p_gdr * fx_val
            raw_basis = math.log(implied_egp / p_comi)
            last_valid_basis = raw_basis
        f2_basis[i] = last_valid_basis

    f2_basis_smoothed = np.zeros(T, dtype=float)
    for i in range(T):
        st = max(0, i - 4)
        f2_basis_smoothed[i] = np.mean(f2_basis[st:i+1])

    # F3: Equity-Cash Competition Momentum (60d change in 1Y yield)
    f3_rate_mom = np.zeros(T, dtype=float)
    for i in range(T):
        if i >= 60:
            f3_rate_mom[i] = bond_arr[i] - bond_arr[i-60]
        else:
            f3_rate_mom[i] = 0.0

    # F4: Macro FX Velocity & Acceleration
    f4_fx_vel = np.zeros(T, dtype=float)
    f4_fx_acc = np.zeros(T, dtype=float)
    for i in range(60, T):
        f4_fx_vel[i] = (fx_arr[i] - fx_arr[i-60]) / fx_arr[i-60]
        if i >= 120:
            prev_vel = (fx_arr[i-60] - fx_arr[i-120]) / fx_arr[i-120]
            f4_fx_acc[i] = f4_fx_vel[i] - prev_vel

    # F6: Downside Herding (rho_down - rho_all over rolling 120 sessions)
    f6_herding = np.zeros(T, dtype=float)
    top_tickers = sorted(stocks_data.keys(), key=lambda t: len(stocks_data[t]), reverse=True)[:20]
    top_returns = np.zeros((T, len(top_tickers)), dtype=float)
    for col, ticker in enumerate(top_tickers):
        s_bars = stocks_data[ticker]
        for row in range(1, T):
            d_curr = all_dates[row]
            d_prev = all_dates[row-1]
            if d_curr in s_bars and d_prev in s_bars:
                p_c = s_bars[d_curr][0]
                p_p = s_bars[d_prev][0]
                if p_p > 0:
                    top_returns[row, col] = (p_c / p_p) - 1.0

    for i in range(120, T):
        window_ret = top_returns[i-119:i+1, :]
        window_egx = returns_egx30[i-119:i+1]
        valid_cols = [c for c in range(window_ret.shape[1]) if np.count_nonzero(window_ret[:, c]) >= 30]
        if len(valid_cols) >= 5:
            sub_ret = window_ret[:, valid_cols]
            corr_all = np.corrcoef(sub_ret, rowvar=False)
            np.fill_diagonal(corr_all, np.nan)
            mean_corr_all = np.nanmean(corr_all)

            down_mask = (window_egx < 0)
            if np.sum(down_mask) >= 20:
                corr_down = np.corrcoef(sub_ret[down_mask, :], rowvar=False)
                np.fill_diagonal(corr_down, np.nan)
                mean_corr_down = np.nanmean(corr_down)
                f6_herding[i] = float(mean_corr_down - mean_corr_all)

    # F7: Volume Panic / Selling Pressure (trailing 20 sessions)
    f7_panic = np.zeros(T, dtype=float)
    for i in range(20, T):
        f7_panic[i] = float(np.sum(np.abs(np.minimum(0.0, returns_egx30[i-19:i+1]))))

    # F9: Asymmetric Downside Price Impact Ratio (over 60 sessions)
    f9_ratio = np.zeros(T, dtype=float)
    for i in range(60, T):
        w_ret = returns_egx30[i-59:i+1]
        down_ret = np.abs(w_ret[w_ret < 0])
        up_ret = w_ret[w_ret > 0]
        if len(down_ret) >= 10 and len(up_ret) >= 10:
            mean_down = np.mean(down_ret)
            mean_up = np.mean(up_ret)
            f9_ratio[i] = math.log((mean_down + 1e-6) / (mean_up + 1e-6))

    # F10: Large vs Retail Relative Momentum Spread (EGX30 vs EGX70)
    f10_spread = np.zeros(T, dtype=float)
    for i in range(60, T):
        d_curr = all_dates[i]
        d_prev60 = all_dates[i-60]
        r30 = (prices_egx30[i] / prices_egx30[i-60]) - 1.0
        if d_curr in egx70_raw and d_prev60 in egx70_raw:
            r70 = (egx70_raw[d_curr] / egx70_raw[d_prev60]) - 1.0
            f10_spread[i] = r30 - r70

    # F12: Macro FX Strain Index (Deviation of implied CIB FX vs official peg + velocity)
    f12_fx_strain = np.zeros(T, dtype=float)
    for i in range(T):
        basis_strain = max(0.0, f2_basis_smoothed[i])
        vel_strain = max(0.0, f4_fx_vel[i])
        f12_fx_strain[i] = basis_strain * 2.0 + vel_strain

    # ── ENGINE B: EXTERNAL SHOCK PRESSURE FEATURES (G1 .. G7) ──
    print("── 5. Engineering Engine B (External Shock Pressure) Features...", flush=True)

    # G1: VIX Level & Rolling Z-Score (trailing 250d window)
    g1_vix_level = np.zeros(T, dtype=float)
    g1_vix_zscore = np.zeros(T, dtype=float)
    for i in range(T):
        g1_vix_level[i] = vix_pit[i]
        if i >= 250:
            hist_vix = vix_pit[i-249:i+1]
            m = np.mean(hist_vix)
            s = np.std(hist_vix) + 1e-6
            g1_vix_zscore[i] = (vix_pit[i] - m) / s

    # G2: VIX Tactical Spike: 5-day delta and 20-day acceleration
    g2_vix_delta5 = np.zeros(T, dtype=float)
    g2_vix_accel20 = np.zeros(T, dtype=float)
    for i in range(40, T):
        g2_vix_delta5[i] = vix_pit[i] - vix_pit[i-5]
        v_diff1 = vix_pit[i] - vix_pit[i-20]
        v_diff2 = vix_pit[i-20] - vix_pit[i-40]
        g2_vix_accel20[i] = v_diff1 - v_diff2

    # G3: MSCI Emerging Markets Stress (EEM 20d return & 60d drawdown)
    g3_eem_ret20 = np.zeros(T, dtype=float)
    g3_eem_dd60 = np.zeros(T, dtype=float)
    for i in range(60, T):
        if eem_pit[i-20] > 0:
            g3_eem_ret20[i] = (eem_pit[i] / eem_pit[i-20]) - 1.0
        peak_eem = np.max(eem_pit[i-59:i+1])
        if peak_eem > 0:
            g3_eem_dd60[i] = (eem_pit[i] / peak_eem) - 1.0

    # G4: US Dollar Index Surge (DXY 20d and 60d momentum)
    g4_dxy_mom20 = np.zeros(T, dtype=float)
    g4_dxy_mom60 = np.zeros(T, dtype=float)
    for i in range(60, T):
        if dxy_pit[i-20] > 0:
            g4_dxy_mom20[i] = (dxy_pit[i] / dxy_pit[i-20]) - 1.0
        if dxy_pit[i-60] > 0:
            g4_dxy_mom60[i] = (dxy_pit[i] / dxy_pit[i-60]) - 1.0

    # G5: US 10-Year Treasury Yield Shock (20d rate surge)
    g5_us10y_surge20 = np.zeros(T, dtype=float)
    for i in range(20, T):
        g5_us10y_surge20[i] = us10y_pit[i] - us10y_pit[i-20]

    # G6: Commodity Terms-of-Trade Shock (Wheat surge + Oil shock)
    g6_wheat_shock20 = np.zeros(T, dtype=float)
    g6_oil_shock20 = np.zeros(T, dtype=float)
    g6_commodity_composite = np.zeros(T, dtype=float)
    for i in range(20, T):
        if wheat_pit[i-20] > 0:
            g6_wheat_shock20[i] = (wheat_pit[i] / wheat_pit[i-20]) - 1.0
        if oil_pit[i-20] > 0:
            g6_oil_shock20[i] = (oil_pit[i] / oil_pit[i-20]) - 1.0
        # Positive price shocks hurt Egypt's balance of payments
        w_surge = max(0.0, g6_wheat_shock20[i])
        o_surge = max(0.0, g6_oil_shock20[i])
        g6_commodity_composite[i] = w_surge * 0.7 + o_surge * 0.3

    # G7: Peer EM Contagion Index (Turkey, Argentina, South Africa, Brazil)
    g7_peer_ret20 = np.zeros(T, dtype=float)
    g7_peer_dd60 = np.zeros(T, dtype=float)
    for i in range(60, T):
        peers_r = []
        peers_dd = []
        for pit_arr in [turkey_pit, argentina_pit, safrica_pit, brazil_pit]:
            if pit_arr[i-20] > 0:
                peers_r.append((pit_arr[i] / pit_arr[i-20]) - 1.0)
            pk = np.max(pit_arr[i-59:i+1])
            if pk > 0:
                peers_dd.append((pit_arr[i] / pk) - 1.0)
        if peers_r:
            g7_peer_ret20[i] = float(np.mean(peers_r))
        if peers_dd:
            g7_peer_dd60[i] = float(np.mean(peers_dd))

    # ── FORWARD TARGETS: STRATEGIC (H=60) & TACTICAL (H=10) ──
    print("── 6. Computing Forward Targets & State Machine...", flush=True)
    H_strat = 60
    H_tact = 10

    # Strategic Targets (H=60)
    target_mae_60 = np.zeros(T, dtype=float)
    target_mdd_60 = np.zeros(T, dtype=float)
    target_severe_18 = np.zeros(T, dtype=int)  # Tier 2: Severe Drawdown Episode (>= 18%)
    target_crash_25 = np.zeros(T, dtype=int)   # Tier 3: Systemic Crash (>= 25%)

    # Tactical Targets (H=10)
    target_mae_10 = np.zeros(T, dtype=float)
    target_tactical_drop8 = np.zeros(T, dtype=int)  # Tactical acute drop (>= 8% in 10 sessions)

    for i in range(T - H_strat):
        p_now = prices_egx30[i]
        # Strategic window [i .. i+60]
        w_strat = prices_egx30[i:i+H_strat+1]
        target_mae_60[i] = float(-(np.min(w_strat) / p_now - 1.0))
        cummax_strat = np.maximum.accumulate(w_strat)
        dd_strat = (w_strat - cummax_strat) / cummax_strat
        mdd_val = float(-np.min(dd_strat))
        target_mdd_60[i] = mdd_val
        target_severe_18[i] = 1 if mdd_val >= 0.18 else 0
        target_crash_25[i] = 1 if mdd_val >= 0.25 else 0

        # Tactical window [i .. i+10]
        w_tact = prices_egx30[i:i+H_tact+1]
        t_mae = float(-(np.min(w_tact) / p_now - 1.0))
        target_mae_10[i] = t_mae
        target_tactical_drop8[i] = 1 if t_mae >= 0.08 else 0

    # Baselines B1..B4 and VIX Baseline
    b1_vol_alert = np.zeros(T, dtype=int)
    b2_dd_alert = np.zeros(T, dtype=int)
    b3_sma_alert = np.zeros(T, dtype=int)
    b4_composite_alert = np.zeros(T, dtype=int)
    b_vix_alert = np.zeros(T, dtype=int)

    for i in range(250, T):
        hist_vol = vol20[i-250:i+1]
        if vol20[i] > np.quantile(hist_vol, 0.80):
            b1_vol_alert[i] = 1

        if dd120[i] < -0.10:
            b2_dd_alert[i] = 1

        if sma200_dist[i] < -0.02:
            b3_sma_alert[i] = 1

        if b1_vol_alert[i] == 1 and b2_dd_alert[i] == 1:
            b4_composite_alert[i] = 1

        # VIX Baseline: VIX > 28 or 5d spike > 5 points
        if vix_pit[i] >= 28.0 or g2_vix_delta5[i] >= 5.0:
            b_vix_alert[i] = 1

    # Recurrent Hazard State Machine & Mechanical Crisis Identification
    # State flags: 0=Risk Set, 1=Onset, 2=Drawdown, 3=Cooldown (20 sessions post trough)
    state = np.zeros(T, dtype=int)
    episodes = []
    i = 0
    while i < T - H_strat:
        if target_mdd_60[i] >= 0.18:
            window = prices_egx30[i:i+H_strat+1]
            cummax = np.maximum.accumulate(window)
            dd_arr = (window - cummax) / cummax
            trough_rel = int(np.argmin(dd_arr))
            onset_rel = int(np.argmax(window[:trough_rel+1]))
            onset_idx = i + onset_rel
            trough_idx = i + trough_rel

            actual_loss = (prices_egx30[trough_idx] / prices_egx30[onset_idx]) - 1.0
            if actual_loss <= -0.18:
                cooldown_end = min(T - 1, trough_idx + 20)
                episodes.append({
                    "episode_id": len(episodes) + 1,
                    "onset_date": all_dates[onset_idx],
                    "onset_idx": onset_idx,
                    "trough_date": all_dates[trough_idx],
                    "trough_idx": trough_idx,
                    "cooldown_end_idx": cooldown_end,
                    "max_drawdown": float(actual_loss),
                    "tier": "Tier 3: Systemic Crash" if actual_loss <= -0.25 else "Tier 2: Severe Drawdown",
                })
                state[onset_idx] = 1
                state[onset_idx+1:trough_idx+1] = 2
                state[trough_idx+1:cooldown_end+1] = 3
                i = cooldown_end + 1
                continue
        i += 1

    print(f"   Identified {len(episodes)} mechanical crisis episodes (1998–2026).")

    # Assemble dataset rows
    rows = []
    fieldnames = [
        "date", "price_egx30", "return_egx30", "vol20", "dd120", "sma200_dist",
        # Engine A
        "f1_breadth", "f2_basis_smoothed", "f3_rate_mom", "f4_fx_vel", "f4_fx_acc",
        "f5_hhi", "f6_herding", "f7_panic", "f8_illiq_smoothed", "f9_ratio",
        "f10_spread", "f11_concentration", "f12_fx_strain",
        # Engine B
        "g1_vix_level", "g1_vix_zscore", "g2_vix_delta5", "g2_vix_accel20",
        "g3_eem_ret20", "g3_eem_dd60", "g4_dxy_mom20", "g4_dxy_mom60",
        "g5_us10y_surge20", "g6_wheat_shock20", "g6_oil_shock20", "g6_commodity_composite",
        "g7_peer_ret20", "g7_peer_dd60",
        # Targets
        "target_mae_60", "target_mdd_60", "target_severe_18", "target_crash_25",
        "target_mae_10", "target_tactical_drop8",
        # Baselines & State
        "b1_vol_alert", "b2_dd_alert", "b3_sma_alert", "b4_composite_alert", "b_vix_alert",
        "hazard_state", "is_onset", "is_in_risk_set"
    ]

    for i, d in enumerate(all_dates):
        row = {
            "date": d,
            "price_egx30": round(float(prices_egx30[i]), 2),
            "return_egx30": round(float(returns_egx30[i]), 5),
            "vol20": round(float(vol20[i]), 4),
            "dd120": round(float(dd120[i]), 4),
            "sma200_dist": round(float(sma200_dist[i]), 4),
            # Engine A
            "f1_breadth": round(float(f1_breadth[i]), 4),
            "f2_basis_smoothed": round(float(f2_basis_smoothed[i]), 4),
            "f3_rate_mom": round(float(f3_rate_mom[i]), 4),
            "f4_fx_vel": round(float(f4_fx_vel[i]), 4),
            "f4_fx_acc": round(float(f4_fx_acc[i]), 4),
            "f5_hhi": round(float(f5_hhi[i]), 4),
            "f6_herding": round(float(f6_herding[i]), 4),
            "f7_panic": round(float(f7_panic[i]), 4),
            "f8_illiq_smoothed": round(float(f8_illiq_smoothed[i]), 5),
            "f9_ratio": round(float(f9_ratio[i]), 4),
            "f10_spread": round(float(f10_spread[i]), 4),
            "f11_concentration": round(float(f11_concentration_smoothed[i]), 4),
            "f12_fx_strain": round(float(f12_fx_strain[i]), 4),
            # Engine B
            "g1_vix_level": round(float(g1_vix_level[i]), 2),
            "g1_vix_zscore": round(float(g1_vix_zscore[i]), 3),
            "g2_vix_delta5": round(float(g2_vix_delta5[i]), 2),
            "g2_vix_accel20": round(float(g2_vix_accel20[i]), 2),
            "g3_eem_ret20": round(float(g3_eem_ret20[i]), 4),
            "g3_eem_dd60": round(float(g3_eem_dd60[i]), 4),
            "g4_dxy_mom20": round(float(g4_dxy_mom20[i]), 4),
            "g4_dxy_mom60": round(float(g4_dxy_mom60[i]), 4),
            "g5_us10y_surge20": round(float(g5_us10y_surge20[i]), 3),
            "g6_wheat_shock20": round(float(g6_wheat_shock20[i]), 4),
            "g6_oil_shock20": round(float(g6_oil_shock20[i]), 4),
            "g6_commodity_composite": round(float(g6_commodity_composite[i]), 4),
            "g7_peer_ret20": round(float(g7_peer_ret20[i]), 4),
            "g7_peer_dd60": round(float(g7_peer_dd60[i]), 4),
            # Targets
            "target_mae_60": round(float(target_mae_60[i]), 4),
            "target_mdd_60": round(float(target_mdd_60[i]), 4),
            "target_severe_18": int(target_severe_18[i]),
            "target_crash_25": int(target_crash_25[i]),
            "target_mae_10": round(float(target_mae_10[i]), 4),
            "target_tactical_drop8": int(target_tactical_drop8[i]),
            # Baselines & Hazard
            "b1_vol_alert": int(b1_vol_alert[i]),
            "b2_dd_alert": int(b2_dd_alert[i]),
            "b3_sma_alert": int(b3_sma_alert[i]),
            "b4_composite_alert": int(b4_composite_alert[i]),
            "b_vix_alert": int(b_vix_alert[i]),
            "hazard_state": int(state[i]),
            "is_onset": int(state[i] == 1),
            "is_in_risk_set": int(state[i] == 0 or state[i] == 1),
        }
        rows.append(row)

    print("── 7. Writing V2 Dataset Files...")
    out_json = DATA_DIR / "v2_dataset_daily.json"
    out_json.write_text(json.dumps({
        "metadata": {
            "version": "2.0",
            "architecture": "Dual-Engine (Strategic Internal Fragility x Tactical External Shock)",
            "start_date": all_dates[0],
            "end_date": all_dates[-1],
            "total_sessions": T,
            "crises_count": len(episodes),
            "episodes": episodes,
        },
        "rows": rows,
    }, indent=1), encoding="utf-8")

    out_csv = DATA_DIR / "v2_dataset_daily.csv"
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"✓ V2 Dataset created successfully:")
    print(f"  JSON: {out_json} ({round(out_json.stat().st_size / 1e6, 2)} MB)")
    print(f"  CSV:  {out_csv} ({round(out_csv.stat().st_size / 1e6, 2)} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(build_v2_dataset())
