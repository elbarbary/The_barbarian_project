#!/usr/bin/env python3
"""Publish the deep price series as its own document per company.

§19 anticipated this: *"Do not make these files unnecessarily huge. If price
history becomes large, split it: `prices/SWDY.json`."* The company document is
capped at a year because it ships inside the app binary; twenty years of 282
companies is fourteen megabytes nobody would want in a download. So the long
series lives here instead, and the app fetches it only when a reader actually
opens a chart.

The plumbing for it already existed and was waiting for the data:
`AppConfig.priceHistoryUrl`, `MarketRepository.getPriceHistory` — which tries
this document and falls back to the company file when there is none — and
`priceHistoryProvider`. Nothing in the app changes; these files simply start
existing, and `5Y` and `MAX` start being windows the data can fill.

**Close and date only.** The chart draws a line; it does not draw volume, and
the recent year in the company document still carries volume for anything that
needs it. Halving the payload is worth more than a field nothing reads.

Source is `data-source/prices`, which `fetch_price_history.py` fills and
verifies against closes we already publish. Nothing is re-verified here: this
step is a projection of already-checked data, not a second opinion on it.

Usage:
    python3 scripts/build_prices_api.py [--check]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import shutil

REPO = pathlib.Path(__file__).resolve().parent.parent
STAGE = REPO / "data-source" / "prices"
OUT = REPO / "public" / "data" / "v1" / "prices"

# Below this a split document earns nothing: the company file already carries a
# year, and a shorter series here would be a second copy of the same line.
MIN_SESSIONS = 300

# And above this it stops earning its cost. The deepest series here runs to
# 6,120 sessions — Commercial International Bank, back to May 2001 — and
# publishing every company in full is 28 MB. These files are committed and §23
# rebuilds the data daily, so that is 28 MB of churn a day for history nobody
# asked to see: §13's deepest named window is 5Y, which is 1,250 sessions.
#
# Six years, so `5Y` fills completely and `MAX` still means something more than
# `5Y` rather than being the same line under another label.
MAX_SESSIONS = 1500


def series_for(path: pathlib.Path) -> list[dict] | None:
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    bars = [
        {"date": b["date"], "close": b["close"]}
        for b in doc.get("bars") or []
        if b.get("date") and b.get("close") is not None
    ]
    bars.sort(key=lambda b: b["date"])
    return bars or None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    print("── Deep price documents")
    staged = sorted(STAGE.glob("*.json"))
    if not staged:
        print("   nothing staged; run fetch_price_history.py first")
        return 0

    written = skipped = rows = 0
    payloads: dict[str, list[dict]] = {}
    for path in staged:
        ticker = path.stem
        bars = series_for(path)
        if bars is None or len(bars) < MIN_SESSIONS:
            skipped += 1
            continue
        payloads[ticker] = bars[-MAX_SESSIONS:]
        rows += len(payloads[ticker])
        written += 1

    print(f"   {written} companies, {rows:,} sessions "
          f"({skipped} too short to be worth splitting)")
    if args.check:
        return 0

    # Rebuilt rather than merged, so a company that loses its series loses its
    # document too instead of leaving a stale one behind.
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True, exist_ok=True)
    for ticker, bars in payloads.items():
        (OUT / f"{ticker}.json").write_text(
            json.dumps({"ticker": ticker, "price_history": bars},
                       separators=(",", ":")),
            encoding="utf-8",
        )

    size = sum(f.stat().st_size for f in OUT.glob("*.json"))
    print(f"   {size / 1e6:.1f} MB written to {OUT.relative_to(REPO)}")
    longest = max(payloads.items(), key=lambda kv: len(kv[1]))
    print(f"   deepest: {longest[0]} with {len(longest[1]):,} sessions "
          f"from {longest[1][0]['date']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
