#!/usr/bin/env python3
"""Market capitalisation, from the exchange rather than from the vendor.

The directory's market value came from TradingView's `marketCap` column, and
on 30 August 2026 five companies disagreed with the exchange's own figure by
half to two thirds:

    FAIT   ours 30.93bn   exchange  9.88bn
    VLMRA  ours 29.61bn   exchange 10.50bn
    AMES   ours 36.14bn   exchange 17.32bn
    SVCE   ours 10.61bn   exchange  5.18bn
    ASPI   ours  1.87bn   exchange  0.95bn

FAIT settles it: the exchange's figure is exactly its own price times its own
share count, and ours is 3.15 times that — so ours was simply wrong, on a real
ticker, in a column readers sort by. The rest are share-count disagreements
where our number is at least internally consistent, and the exchange is still
the better authority on how many shares of an Egyptian company are listed.

So the exchange wins where it has an answer, and the vendor fills the rest:
`/api/bff/egx/market-watch` covers 221 securities against a directory of 282,
including eight the vendor gave no market value at all.

Carried forward on refusal, like every other best-effort read of this host: a
company does not lose its market value because a WAF had a bad minute.

Usage:
    python3 scripts/harvest_egx_market_cap.py [--check]
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import harvest_egx_beta as beta  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "data-source" / "egx-beta" / "market-cap.json"
SOURCE = "beta.egx.com.eg /api/bff/egx/market-watch"
TICKER = re.compile(r"^[A-Z]{3,6}$")


def fetch() -> dict[str, float]:
    payload = beta.request("/api/bff/egx/market-watch?Page=1&PageSize=500")
    rows = ((payload.get("data") or {}).get("data")) or []
    if not isinstance(rows, list) or not rows:
        raise RuntimeError("market-watch returned no rows")
    out: dict[str, float] = {}
    for row in rows:
        ticker = str(row.get("reuters") or "").split(".")[0].strip().upper()
        cap = row.get("mc")
        # `mc` is whole pounds; `mcMillion` is the same number in millions and
        # is NOT used, because two units for one figure in one document is how
        # a market value ends up a thousand times wrong.
        if TICKER.match(ticker) and isinstance(cap, (int, float)) and cap > 0:
            out[ticker] = float(cap)
    if not out:
        raise RuntimeError(f"market-watch returned {len(rows)} rows and no usable cap")
    return out


def load() -> dict:
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fetch and report, write nothing")
    args = parser.parse_args()

    held = load()
    try:
        caps = fetch()
    except Exception as error:                                # noqa: BLE001
        kept = held.get("market_cap") or {}
        if not kept:
            print(f"! {error} — and nothing held to fall back on")
            return 0
        print(f"! {error} — holding {len(kept)} from {held.get('harvested')}")
        return 0

    document = {
        "harvested": datetime.date.today().isoformat(),
        "source": SOURCE,
        "count": len(caps),
        "market_cap": dict(sorted(caps.items())),
    }
    print(f"   {len(caps)} securities carry a market value")
    if args.check:
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(document, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"   wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
