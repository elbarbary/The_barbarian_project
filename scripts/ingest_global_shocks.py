#!/usr/bin/env python3
"""Ingest global shock series for EGX Fragility Engine V2 (Engine B).

Pulls:
- VIX Index (^VIX): Volatility regime and sudden global spikes.
- MSCI Emerging Markets ETF (EEM): Emerging market stress and capital flows.
- US Dollar Index (DX-Y.NYB): Global dollar liquidity squeeze.
- US 10-Year Treasury Yield (^TNX): Global cost of capital and risk-free hurdle rate.
- Wheat Futures (ZW=F): Food price shock / import bill pressure (vital for Egypt balance of payments).
- Brent Crude Futures (BZ=F) & WTI (CL=F): Energy price shock.

Saves normalized JSON files into `data-source/fragility/global_shocks/`.
"""

from __future__ import annotations

import datetime as dt
import json
import pathlib
import urllib.request

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = REPO / "data-source" / "fragility" / "global_shocks"
OUT_DIR.mkdir(parents=True, exist_ok=True)

GLOBAL_SYMBOLS = {
    "vix": "^VIX",
    "msci_em": "EEM",
    "dxy": "DX-Y.NYB",
    "us10y": "^TNX",
    "wheat": "ZW=F",
    "brent": "BZ=F",
    "wti": "CL=F",
}


def fetch_yahoo_history(ticker: str) -> dict[str, float]:
    """Fetch daily closes for a Yahoo Finance symbol back to 1998."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?period1=883612800&period2=1800000000&interval=1d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        d = json.loads(resp.read().decode("utf-8"))

    result = d["chart"]["result"][0]
    stamps = result.get("timestamp", [])
    closes = result["indicators"]["quote"][0].get("close", [])

    out: dict[str, float] = {}
    for ts, close in zip(stamps, closes):
        if ts is None or close is None:
            continue
        day = dt.datetime.fromtimestamp(ts, dt.timezone.utc).strftime("%Y-%m-%d")
        try:
            val = float(close)
            if val > 0:
                out[day] = round(val, 4)
        except (ValueError, TypeError):
            continue

    return dict(sorted(out.items()))


def main() -> int:
    print("── Fetching Global Shock Indicators from Yahoo Finance...")
    for name, sym in GLOBAL_SYMBOLS.items():
        print(f"   Fetching {name} ({sym})...", end="", flush=True)
        try:
            series = fetch_yahoo_history(sym)
            out_file = OUT_DIR / f"{name}.json"
            out_file.write_text(json.dumps(series, indent=1), encoding="utf-8")
            days = sorted(series)
            print(f" OK: {len(series)} bars ({days[0]} .. {days[-1]})")
        except Exception as e:
            print(f" FAILED: {e}")

    print("\n✓ Global shock ingestion complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
