#!/usr/bin/env python3
"""Ingest historical daily series for Emerging-Market Multi-Country Panel (Exp 3).

Peers experiencing balance of payments, currency devaluations, and global risk-off shocks:
1. Turkey: BIST 100 (XU100.IS) and iShares MSCI Turkey (TUR)
2. Argentina: Merval (^MERV) and Global X Argentina (ARGT)
3. Pakistan: Global X MSCI Pakistan (PAK)
4. South Africa: JSE Top 40 (^J200.JO) and iShares MSCI South Africa (EZA)
5. Brazil: Bovespa (^BVSP) and iShares MSCI Brazil (EWZ)

Saves normalized JSON files into `data-source/fragility/em_panel/`.
"""

from __future__ import annotations

import datetime as dt
import json
import pathlib
import urllib.request

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = REPO / "data-source" / "fragility" / "em_panel"
OUT_DIR.mkdir(parents=True, exist_ok=True)

EM_PANEL_SYMBOLS = {
    "turkey_bist100": "XU100.IS",
    "turkey_etf": "TUR",
    "argentina_merval": "^MERV",
    "argentina_etf": "ARGT",
    "pakistan_etf": "PAK",
    "south_africa_top40": "^J200.JO",
    "south_africa_etf": "EZA",
    "brazil_bovespa": "^BVSP",
    "brazil_etf": "EWZ",
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
    print("── Fetching Emerging Market Multi-Country Panel Data...")
    for name, sym in EM_PANEL_SYMBOLS.items():
        print(f"   Fetching {name} ({sym})...", end="", flush=True)
        try:
            series = fetch_yahoo_history(sym)
            out_file = OUT_DIR / f"{name}.json"
            out_file.write_text(json.dumps(series, indent=1), encoding="utf-8")
            days = sorted(series)
            print(f" OK: {len(series)} bars ({days[0]} .. {days[-1]})")
        except Exception as e:
            print(f" FAILED: {e}")

    print("\n✓ EM Panel ingestion complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
