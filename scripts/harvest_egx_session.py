#!/usr/bin/env python3
"""The exchange's own session figures: market value, trades and turnover.

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

It also carries two figures nothing else on this site has: how many TRADES a
share went through, and the VALUE those trades came to. The quotes Worker
serves both live during a session, and a live-only figure disappears at the
close — so the last harvest of the day, which runs at 14:45 against a 14:30
close, is what makes them survive into the evening.

Carried forward on refusal, like every other best-effort read of this host: a
company does not lose its market value because a WAF had a bad minute.

Usage:
    python3 scripts/harvest_egx_session.py [--check]
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
OUT = REPO / "data-source" / "egx-beta" / "session.json"
SOURCE = "beta.egx.com.eg /api/bff/egx/market-watch"
TICKER = re.compile(r"^[A-Z]{3,6}$")


def number(value, *, whole: bool = False):
    """A positive number, or None. Zero is a fact and is kept."""
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return None
    if value < 0:
        return None
    return int(round(value)) if whole else float(value)


def fetch() -> tuple[dict[str, dict], str | None]:
    payload = beta.request("/api/bff/egx/market-watch?Page=1&PageSize=500")
    rows = ((payload.get("data") or {}).get("data")) or []
    if not isinstance(rows, list) or not rows:
        raise RuntimeError("market-watch returned no rows")
    out: dict[str, dict] = {}
    written = None
    for row in rows:
        ticker = str(row.get("reuters") or "").split(".")[0].strip().upper()
        # `mc` is whole pounds; `mcMillion` is the same number in millions and
        # is NOT used, because two units for one figure in one document is how
        # a market value ends up a thousand times wrong.
        cap = number(row.get("mc"))
        if not TICKER.match(ticker) or not cap:
            continue
        if row.get("writeTime"):
            written = str(row["writeTime"])
        held = {"market_cap": cap}
        # The exchange's own classification, in both languages.
        #
        # The vendor's taxonomy files real estate developers, banks, brokers,
        # contractors, hotels and a textile company all under one word:
        # "Finance". On 1 September that made a 75-company bucket out of seven
        # industries — MASR, TMGH and OCDI are property developers and were
        # being read, ranked and drawn as financials. 218 of the 220 companies
        # the exchange names a sector for disagreed with the vendor.
        #
        # The exchange publishes 18 sectors against the vendor's coarser set,
        # and it is the authority on how an Egyptian listing is classified.
        # The Arabic name comes with it, which retires a hand-kept map that had
        # to be extended by hand every time a sector appeared.
        sector = (row.get("sector") or "").strip()
        sector_ar = (row.get("sectorA") or "").strip()
        if sector:
            held["sector"] = sector
            if sector_ar:
                held["sector_ar"] = sector_ar
        trades = number(row.get("trades"), whole=True)
        value = number(row.get("value"), whole=True)
        if trades is not None:
            held["trades"] = trades
        if value is not None:
            held["value"] = value
        out[ticker] = held
    if not out:
        raise RuntimeError(f"market-watch returned {len(rows)} rows and no usable cap")
    return out, written


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
        rows, written = fetch()
    except Exception as error:                                # noqa: BLE001
        kept = held.get("securities") or {}
        if not kept:
            print(f"! {error} — and nothing held to fall back on")
            return 0
        print(f"! {error} — holding {len(kept)} from {held.get('harvested')}")
        return 0

    document = {
        "harvested": datetime.date.today().isoformat(),
        "source": SOURCE,
        # The exchange stamps the rows itself, in Cairo time. Kept because a
        # trade count is a figure about a MOMENT, and one with no moment on it
        # is the thing §49 is about.
        "write_time": written,
        "count": len(rows),
        "securities": {k: rows[k] for k in sorted(rows)},
    }
    traded = sum(1 for v in rows.values() if v.get("trades"))
    classified = sum(1 for v in rows.values() if v.get("sector"))
    print(f"   {len(rows)} securities carry a market value, {traded} a trade count,"
          f" {classified} the exchange's own sector"
          f"{f' (written {written})' if written else ''}")
    if args.check:
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(document, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"   wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
