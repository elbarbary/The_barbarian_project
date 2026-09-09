#!/usr/bin/env python3
"""Build the point-in-time EGX Fragility Engine dataset (1998–2026).

Combines:
- EGX30, EGX70EWI, EGX100EWI index series
- Constituent OHLCV bars (294 stocks, 2001–2026)
- CIB London GDR (CBKD.IL) and USD/EGP (USDEGP=X)
- Egypt 1Y Bond Yield (40640) and CBE policy rates

Generates:
- Point-in-time features (F1 .. F10)
- Dual forward targets (MAE, true peak-to-trough MDD over H=60 sessions)
- Baselines (B1 .. B4)
- Recurrent Hazard state machine flags (in_risk_set, is_onset, is_drawdown, is_cooldown)

Output: `data-source/fragility/dataset_daily.json` and `dataset_daily.csv`.
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
PRICES_DIR = REPO / "data-source" / "prices"


def load_json(path: pathlib.Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def build_dataset() -> dict:
    print("── 1. Loading Ingested Historical Series...")
    egx30_raw = load_json(DATA_DIR / "egx30.json")
    egx70_raw = load_json(DATA_DIR / "egx70ewi.json")
    egx100_raw = load_json(DATA_DIR / "egx100ewi.json")
    fx_raw = load_json(DATA_DIR / "usd_egp.json")
    gdr_raw = load_json(DATA_DIR / "cib_gdr_london.json")
    bond_raw = load_json(DATA_DIR / "egypt_1y_bond.json")

    print(f"   EGX30 points: {len(egx30_raw)}")
    print(f"   EGX70 points: {len(egx70_raw)}")
    print(f"   EGX100 points: {len(egx100_raw)}")
    print(f"   USD/EGP points: {len(fx_raw)}")
    print(f"   CIB GDR points: {len(gdr_raw)}")
    print(f"   1Y Bond points: {len(bond_raw)}")

    # Sort trading dates of EGX30
    all_dates = sorted(egx30_raw.keys())
    print(f"   Time span: {all_dates[0]} to {all_dates[-1]} ({len(all_dates)} sessions)")

    # Pre-index FX (forward fill missing days)
    fx_series: dict[str, float] = {}
    last_fx = 3.40  # 1998 baseline before peg float
    for d in all_dates:
        if d in fx_raw:
            last_fx = fx_raw[d]
        elif d < "2001-05-31":
            # 1998-2001 pegged regime approx 3.40 - 3.85
            if d >= "2001-01-01":
                last_fx = 3.85
            elif d >= "2000-01-01":
                last_fx = 3.48
            else:
                last_fx = 3.40
        fx_series[d] = last_fx

    # Pre-index GDR (forward fill)
    gdr_series: dict[str, float] = {}
    last_gdr = None
    for d in all_dates:
        if d in gdr_raw:
            last_gdr = gdr_raw[d]
        gdr_series[d] = last_gdr

    # Pre-index 1Y Bond Yield (forward fill)
    bond_series: dict[str, float] = {}
    last_bond = 10.5  # historical benchmark around 2008-2010
    for d in all_dates:
        if d in bond_raw:
            last_bond = bond_raw[d]
        elif d < "2010-08-09":
            # Historical CBE corridor proxy (approx 9.5% - 11.5% during 2005-2010)
            if d >= "2008-09-01":
                last_bond = 11.5
            elif d >= "2006-01-01":
                last_bond = 9.0
            else:
                last_bond = 10.0
        bond_series[d] = last_bond

    print("\n── 2. Loading Constituent Stocks from data-source/prices/...")
    stock_files = sorted(PRICES_DIR.glob("*.json"))
    stocks_data: dict[str, dict[str, tuple[float, float]]] = {}  # ticker -> {date: (close, volume)}
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

    print(f"   Active stocks loaded: {len(stocks_data)} listings")
    print(f"   COMI local bars: {len(comi_series)}")

    # Pre-calculate constituent prices per date
    print("\n── 3. Engineering Daily Features across Time Series...")
    T = len(all_dates)
    dates_idx = {d: i for i, d in enumerate(all_dates)}

    # EGX30 Price Array
    prices_egx30 = np.array([egx30_raw[d] for d in all_dates], dtype=float)
    returns_egx30 = np.zeros(T, dtype=float)
    returns_egx30[1:] = prices_egx30[1:] / prices_egx30[:-1] - 1.0

    # Realized 20d volatility of EGX30
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

    # Feature 1: Market Breadth (% of active stocks > 50-day SMA)
    # Feature 5: Contribution HHI (Turnover-weighted return concentration)
    # Feature 8: Amihud Illiquidity
    f1_breadth = np.zeros(T, dtype=float)
    f5_hhi = np.zeros(T, dtype=float)
    f8_illiq = np.zeros(T, dtype=float)

    # Pre-convert stocks to structured arrays for fast date-based lookup
    print("   Computing constituent breadth, HHI, and Amihud illiquidity...", flush=True)
    
    # Pre-compute SMA50 and 20d returns for each stock
    stock_sma50: dict[str, dict[str, float]] = {}
    stock_r20: dict[str, dict[str, float]] = {}
    stock_to20: dict[str, dict[str, float]] = {}
    stock_illiq_daily: dict[str, dict[str, float]] = {}

    for ticker, s_bars in stocks_data.items():
        sorted_s_dates = sorted(s_bars.keys())
        s_prices = [s_bars[sd][0] for sd in sorted_s_dates]
        s_vols = [s_bars[sd][1] for sd in sorted_s_dates]
        s_to = [s_prices[k] * s_vols[k] for k in range(len(s_prices))]
        
        # SMA50
        sma_map: dict[str, float] = {}
        for k in range(49, len(sorted_s_dates)):
            sma_map[sorted_s_dates[k]] = sum(s_prices[k-49:k+1]) / 50.0
        stock_sma50[ticker] = sma_map

        # 20d Return and 20d Turnover
        r20_map: dict[str, float] = {}
        to20_map: dict[str, float] = {}
        for k in range(19, len(sorted_s_dates)):
            r20_map[sorted_s_dates[k]] = (s_prices[k] / s_prices[k-19]) - 1.0
            to20_map[sorted_s_dates[k]] = sum(s_to[k-19:k+1])
        stock_r20[ticker] = r20_map
        stock_to20[ticker] = to20_map

        # Daily Amihud: |r| / (Turnover / 1e6 + 1.0)
        illiq_map: dict[str, float] = {}
        for k in range(1, len(sorted_s_dates)):
            r_1d = abs(s_prices[k] / s_prices[k-1] - 1.0)
            illiq_map[sorted_s_dates[k]] = r_1d / (s_to[k] * 1e-6 + 1.0)
        stock_illiq_daily[ticker] = illiq_map

    # Aggregate cross-sectional values per calendar day
    for i, d in enumerate(all_dates):
        above_sma50 = 0
        total_active_sma = 0
        
        c_weights = []
        c_returns = []
        illiq_vals = []

        for ticker in stocks_data:
            sma_val = stock_sma50[ticker].get(d)
            if sma_val is not None:
                p_curr = stocks_data[ticker][d][0]
                if p_curr > sma_val:
                    above_sma50 += 1
                total_active_sma += 1
            
            # For HHI
            to_val = stock_to20[ticker].get(d)
            r_val = stock_r20[ticker].get(d)
            if to_val is not None and r_val is not None:
                c_weights.append(to_val)
                c_returns.append(r_val)

            # For Amihud
            il_val = stock_illiq_daily[ticker].get(d)
            if il_val is not None:
                illiq_vals.append(il_val)

        # F1: Breadth
        if total_active_sma >= 5:
            f1_breadth[i] = above_sma50 / total_active_sma
        else:
            # Backfill with index 50d SMA indicator prior to 2001
            f1_breadth[i] = 1.0 if (i >= 50 and prices_egx30[i] > np.mean(prices_egx30[i-49:i+1])) else 0.4

        # F5: HHI
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
        else:
            f5_hhi[i] = 0.15

        # F8: Amihud Illiquidity (Median of active stocks)
        if illiq_vals:
            f8_illiq[i] = float(np.median(illiq_vals))
        else:
            f8_illiq[i] = 0.05

    # Smooth F8 over 20 days
    f8_illiq_smoothed = np.zeros(T, dtype=float)
    for i in range(T):
        st = max(0, i - 19)
        f8_illiq_smoothed[i] = np.mean(f8_illiq[st:i+1])

    # Feature 2: CIB GDR Offshore-Onshore Basis
    print("   Computing CIB GDR Basis (F2)...", flush=True)
    f2_basis = np.zeros(T, dtype=float)
    last_valid_basis = 0.0
    for i, d in enumerate(all_dates):
        p_comi = comi_series.get(d)
        p_gdr = gdr_series.get(d)
        fx_val = fx_series.get(d, 50.0)
        if p_comi and p_gdr and p_comi > 0 and p_gdr > 0 and fx_val > 0:
            # London CIB GDR trades 1:1 with local CIB share (since 2017 split)
            implied_egp = p_gdr * fx_val
            raw_basis = math.log(implied_egp / p_comi)
            last_valid_basis = raw_basis
        f2_basis[i] = last_valid_basis

    # 5-day SMA of basis
    f2_basis_smoothed = np.zeros(T, dtype=float)
    for i in range(T):
        st = max(0, i - 4)
        f2_basis_smoothed[i] = np.mean(f2_basis[st:i+1])

    # Feature 3: Equity-Cash Competition Momentum (60d change in 1Y yield)
    print("   Computing Equity-Cash Competition Momentum (F3)...", flush=True)
    f3_rate_mom = np.zeros(T, dtype=float)
    bonds_arr = np.array([bond_series[d] for d in all_dates], dtype=float)
    for i in range(T):
        if i >= 60:
            f3_rate_mom[i] = bonds_arr[i] - bonds_arr[i-60]
        else:
            f3_rate_mom[i] = 0.0

    # Feature 4: FX Velocity and Acceleration
    print("   Computing Macro FX Velocity and Acceleration (F4)...", flush=True)
    fx_arr = np.array([fx_series[d] for d in all_dates], dtype=float)
    f4_fx_vel = np.zeros(T, dtype=float)
    f4_fx_acc = np.zeros(T, dtype=float)
    for i in range(60, T):
        f4_fx_vel[i] = (fx_arr[i] - fx_arr[i-60]) / fx_arr[i-60]
        if i >= 120:
            prev_vel = (fx_arr[i-60] - fx_arr[i-120]) / fx_arr[i-120]
            f4_fx_acc[i] = f4_fx_vel[i] - prev_vel

    # Feature 6: Downside Herding (rho_down - rho_all over rolling 120 sessions)
    print("   Computing Downside Herding over rolling 120 sessions (F6)...", flush=True)
    f6_herding = np.zeros(T, dtype=float)
    
    # Identify the top 20 consistently traded stocks
    top_tickers = sorted(stocks_data.keys(), key=lambda t: len(stocks_data[t]), reverse=True)[:20]

    # Pre-build 2D return matrix for top tickers aligned with all_dates
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
        window_ret = top_returns[i-119:i+1, :]  # 120 x K
        window_egx = returns_egx30[i-119:i+1]
        
        # Filter active stocks with non-zero returns in window
        valid_cols = [c for c in range(window_ret.shape[1]) if np.count_nonzero(window_ret[:, c]) >= 30]
        if len(valid_cols) >= 5:
            sub_ret = window_ret[:, valid_cols]
            # Overall correlation
            corr_all = np.corrcoef(sub_ret, rowvar=False)
            np.fill_diagonal(corr_all, np.nan)
            mean_corr_all = np.nanmean(corr_all)

            # Down sessions only
            down_mask = (window_egx < 0)
            if np.sum(down_mask) >= 20:
                corr_down = np.corrcoef(sub_ret[down_mask, :], rowvar=False)
                np.fill_diagonal(corr_down, np.nan)
                mean_corr_down = np.nanmean(corr_down)
                f6_herding[i] = float(mean_corr_down - mean_corr_all)
            else:
                f6_herding[i] = 0.0
        else:
            f6_herding[i] = 0.0

    # Feature 7: Directional High-Volume Downside Impact
    print("   Computing Volume Panic / Selling Pressure (F7)...", flush=True)
    f7_panic = np.zeros(T, dtype=float)
    for i in range(20, T):
        down_ret_sum = np.sum(np.abs(np.minimum(0.0, returns_egx30[i-19:i+1])))
        f7_panic[i] = float(down_ret_sum)

    # Feature 9: Asymmetric Downside Price Impact Ratio (over 60 sessions)
    print("   Computing Asymmetric Price Impact Ratio (F9)...", flush=True)
    f9_ratio = np.zeros(T, dtype=float)
    for i in range(60, T):
        w_ret = returns_egx30[i-59:i+1]
        down_ret = np.abs(w_ret[w_ret < 0])
        up_ret = w_ret[w_ret > 0]
        if len(down_ret) >= 10 and len(up_ret) >= 10:
            mean_down = np.mean(down_ret)
            mean_up = np.mean(up_ret)
            f9_ratio[i] = math.log((mean_down + 1e-6) / (mean_up + 1e-6))
        else:
            f9_ratio[i] = 0.0

    # Feature 10: EGX30 vs EGX70 Relative Momentum Spread
    print("   Computing Large-Cap vs Retail Spread (F10)...", flush=True)
    f10_spread = np.zeros(T, dtype=float)
    for i in range(60, T):
        d_curr = all_dates[i]
        d_prev60 = all_dates[i-60]
        r30 = (prices_egx30[i] / prices_egx30[i-60]) - 1.0
        if d_curr in egx70_raw and d_prev60 in egx70_raw:
            r70 = (egx70_raw[d_curr] / egx70_raw[d_prev60]) - 1.0
            f10_spread[i] = r30 - r70
        else:
            # Proxy using breadth or 0
            f10_spread[i] = 0.0

    print("\n── 4. Computing Forward Targets (H = 60 sessions)...")
    H = 60
    target_mae = np.zeros(T, dtype=float)
    target_mdd = np.zeros(T, dtype=float)

    for i in range(T - H):
        p_now = prices_egx30[i]
        future_window = prices_egx30[i:i+H+1]
        
        # Forward MAE: maximum loss from today's price
        min_future = np.min(future_window)
        target_mae[i] = float(-(min_future / p_now - 1.0))

        # True Peak-to-Trough MDD inside future window [i .. i+H]
        cummax = np.maximum.accumulate(future_window)
        drawdowns = (future_window - cummax) / cummax
        target_mdd[i] = float(-np.min(drawdowns))

    # Baselines B1..B4
    print("   Computing Benchmark Baselines B1..B4...", flush=True)
    b1_vol_alert = np.zeros(T, dtype=int)
    b2_dd_alert = np.zeros(T, dtype=int)
    b3_sma_alert = np.zeros(T, dtype=int)
    b4_composite_alert = np.zeros(T, dtype=int)

    for i in range(120, T):
        # B1: Volatility in upper quintile of trailing 250 sessions
        hist_vol = vol20[max(0, i-250):i+1]
        q80 = np.quantile(hist_vol, 0.80)
        if vol20[i] > q80:
            b1_vol_alert[i] = 1

        # B2: Trailing drawdown > 10%
        if dd120[i] < -0.10:
            b2_dd_alert[i] = 1

        # B3: Price below 200 SMA
        if sma200_dist[i] < -0.02:
            b3_sma_alert[i] = 1

        # B4: Composite (B1 and B2)
        if b1_vol_alert[i] == 1 and b2_dd_alert[i] == 1:
            b4_composite_alert[i] = 1

    print("\n── 5. Implementing Recurrent Hazard State Machine & Mechanical Onset...")
    # State flags:
    # 0 = Risk Set (clean active trading)
    # 1 = Onset Session (peak immediately preceding breach)
    # 2 = Censored Drawdown (unfolding crash)
    # 3 = Cooldown (20 sessions post trough)
    state = np.zeros(T, dtype=int)
    
    # We identify crash episodes using a rolling 18% MDD threshold
    i = 0
    episodes = []
    while i < T - H:
        if target_mdd[i] >= 0.18:
            # An upcoming drawdown >= 18% exists in [i .. i+H]
            # Find the actual peak in [i .. i+H] that begins this drawdown
            window = prices_egx30[i:i+H+1]
            cummax = np.maximum.accumulate(window)
            dd_arr = (window - cummax) / cummax
            trough_rel = int(np.argmin(dd_arr))
            # Onset is the peak prior to trough
            onset_rel = int(np.argmax(window[:trough_rel+1]))
            onset_idx = i + onset_rel
            trough_idx = i + trough_rel

            peak_price = prices_egx30[onset_idx]
            trough_price = prices_egx30[trough_idx]
            actual_loss = (trough_price / peak_price) - 1.0

            if actual_loss <= -0.18:
                cooldown_end = min(T - 1, trough_idx + 20)
                episodes.append({
                    "onset_date": all_dates[onset_idx],
                    "onset_idx": onset_idx,
                    "trough_date": all_dates[trough_idx],
                    "trough_idx": trough_idx,
                    "cooldown_end_idx": cooldown_end,
                    "max_drawdown": float(actual_loss),
                })
                # Mark states
                state[onset_idx] = 1  # Onset
                state[onset_idx+1:trough_idx+1] = 2  # Drawdown
                state[trough_idx+1:cooldown_end+1] = 3  # Cooldown
                i = cooldown_end + 1
                continue
        i += 1

    print(f"   Identified {len(episodes)} distinct mechanical crisis episodes:")
    for ep in episodes:
        print(f"   - Onset: {ep['onset_date']} → Trough: {ep['trough_date']} (MaxDD: {ep['max_drawdown']*100:.1f}%)")

    # Assemble dataset rows
    rows = []
    header = [
        "date", "year", "close", "ret_1d", "vol20", "dd120", "sma200_dist",
        "f1_breadth", "f2_gdr_basis", "f3_rate_mom", "f4_fx_vel", "f4_fx_acc",
        "f5_hhi", "f6_herding", "f7_panic", "f8_illiq", "f9_ratio", "f10_spread",
        "target_mae_60", "target_mdd_60", "state", "in_risk_set",
        "b1_vol", "b2_dd", "b3_sma", "b4_composite"
    ]

    for i, d in enumerate(all_dates):
        in_risk = 1 if state[i] == 0 or state[i] == 1 else 0
        r = {
            "date": d,
            "year": int(d[:4]),
            "close": float(round(prices_egx30[i], 2)),
            "ret_1d": float(round(returns_egx30[i], 5)),
            "vol20": float(round(vol20[i], 4)),
            "dd120": float(round(dd120[i], 4)),
            "sma200_dist": float(round(sma200_dist[i], 4)),
            "f1_breadth": float(round(f1_breadth[i], 4)),
            "f2_gdr_basis": float(round(f2_basis_smoothed[i], 4)),
            "f3_rate_mom": float(round(f3_rate_mom[i], 4)),
            "f4_fx_vel": float(round(f4_fx_vel[i], 4)),
            "f4_fx_acc": float(round(f4_fx_acc[i], 4)),
            "f5_hhi": float(round(f5_hhi[i], 4)),
            "f6_herding": float(round(f6_herding[i], 4)),
            "f7_panic": float(round(f7_panic[i], 4)),
            "f8_illiq": float(round(f8_illiq_smoothed[i], 5)),
            "f9_ratio": float(round(f9_ratio[i], 4)),
            "f10_spread": float(round(f10_spread[i], 4)),
            "target_mae_60": float(round(target_mae[i], 4)),
            "target_mdd_60": float(round(target_mdd[i], 4)),
            "state": int(state[i]),
            "in_risk_set": int(in_risk),
            "b1_vol": int(b1_vol_alert[i]),
            "b2_dd": int(b2_dd_alert[i]),
            "b3_sma": int(b3_sma_alert[i]),
            "b4_composite": int(b4_composite_alert[i]),
        }
        rows.append(r)

    # Save to JSON
    json_path = DATA_DIR / "dataset_daily.json"
    json_path.write_text(json.dumps(rows, indent=1), encoding="utf-8")
    print(f"\n✓ Saved JSON dataset: {json_path} ({len(rows)} records)")

    # Save to CSV
    csv_path = DATA_DIR / "dataset_daily.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=header)
        writer.writeheader()
        writer.writerows(rows)
    print(f"✓ Saved CSV dataset: {csv_path}")

    # Summary statistics
    risk_set_count = sum(r["in_risk_set"] for r in rows)
    censored_count = len(rows) - risk_set_count
    print(f"\nState Summary:")
    print(f"   Total sessions: {len(rows)}")
    print(f"   Risk Set sessions: {risk_set_count} ({risk_set_count/len(rows)*100:.1f}%)")
    print(f"   Censored sessions: {censored_count} ({censored_count/len(rows)*100:.1f}%)")
    
    return {"rows": len(rows), "episodes": len(episodes)}


if __name__ == "__main__":
    build_dataset()
