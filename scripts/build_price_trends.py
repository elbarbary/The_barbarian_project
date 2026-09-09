#!/usr/bin/env python3
"""Compute price trends, 52-week highs/lows, and momentum metrics across EGX.

Reads committed daily bars from `data-source/prices/<TICKER>.json` and outputs
`public/data/v1/trends.json` and `app/assets/fixtures/trends.json`.

Usage:
    python3 scripts/build_price_trends.py
    python3 scripts/build_price_trends.py --check
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
BARS = REPO / "data-source" / "prices"
FALLBACK_BARS = REPO / "public" / "data" / "v1" / "prices"
API = REPO / "public" / "data" / "v1"
FIXTURES = REPO / "app" / "assets" / "fixtures"
NAME = "trends.json"


def compute_trends(source_dir: pathlib.Path) -> dict:
    trends = {}
    json_files = sorted(source_dir.glob("*.json"))
    last_date = ""
    
    for path in json_files:
        ticker = path.stem
        try:
            content = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
            
        rows = content if isinstance(content, list) else (content.get("price_history") or content.get("bars") or [])
        if not rows or len(rows) < 5:
            continue
            
        valid_bars = [r for r in rows if isinstance(r.get("close"), (int, float)) and r["close"] > 0]
        if len(valid_bars) < 5:
            continue
            
        last = valid_bars[-1]
        close = float(last["close"])
        date = str(last.get("date") or "")
        if date > last_date:
            last_date = date
        
        # 52-week window (last 250 trading days)
        w52 = valid_bars[-250:]
        high52 = max(b["close"] for b in w52)
        low52 = min(b["close"] for b in w52)
        
        high_bar = next((b for b in reversed(w52) if b["close"] == high52), w52[-1])
        low_bar = next((b for b in reversed(w52) if b["close"] == low52), w52[0])
        
        # 1-month (21 sessions), 3-months (63 sessions), 1-year (250 sessions)
        p1m = valid_bars[-22]["close"] if len(valid_bars) >= 22 else valid_bars[0]["close"]
        p3m = valid_bars[-64]["close"] if len(valid_bars) >= 64 else valid_bars[0]["close"]
        p1y = w52[0]["close"]
        
        dist_high = ((close - high52) / high52) * 100.0
        dist_low = ((close - low52) / low52) * 100.0
        chg_1m = ((close - p1m) / p1m) * 100.0
        chg_3m = ((close - p3m) / p3m) * 100.0
        chg_1y = ((close - p1y) / p1y) * 100.0
        
        w50 = valid_bars[-50:]
        ma50 = sum(b["close"] for b in w50) / float(len(w50))
        
        trends[ticker] = {
            "ticker": ticker,
            "close": close,
            "date": date,
            "high52": round(high52, 2),
            "high52Date": str(high_bar.get("date") or ""),
            "low52": round(low52, 2),
            "low52Date": str(low_bar.get("date") or ""),
            "distHigh52": round(dist_high, 1),
            "distLow52": round(dist_low, 1),
            "chg1m": round(chg_1m, 1),
            "chg3m": round(chg_3m, 1),
            "chg1y": round(chg_1y, 1),
            "ma50": round(ma50, 2),
            "aboveMa50": close >= ma50,
            "isNearHigh52": dist_high >= -5.0,
            "isNewHigh": dist_high >= -0.5,
            "sessions": len(valid_bars),
        }
        
    return {
        "generated_at": last_date,
        "window_sessions": 250,
        "count": len(trends),
        "items": trends,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate without writing")
    args = parser.parse_args()

    src = BARS if BARS.exists() and any(BARS.glob("*.json")) else FALLBACK_BARS
    if not src.exists():
        print(f"No price directory found at {BARS} or {FALLBACK_BARS}", file=sys.stderr)
        sys.exit(0)

    data = compute_trends(src)
    encoded = json.dumps(data, ensure_ascii=False, indent=2) + "\n"

    if args.check:
        print(f"Check OK: {data['count']} trends computed")
        return

    out_api = API / NAME
    out_fix = FIXTURES / NAME

    out_api.parent.mkdir(parents=True, exist_ok=True)
    out_api.write_text(encoded, encoding="utf-8")
    print(f"Wrote {out_api} ({data['count']} companies)")

    if out_fix.parent.exists():
        out_fix.write_text(encoded, encoding="utf-8")
        print(f"Wrote {out_fix}")


if __name__ == "__main__":
    main()
