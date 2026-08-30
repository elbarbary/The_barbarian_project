#!/usr/bin/env python3
"""Daily closes for the world rows on the Exchange screen.

The three EGX indices have had a series since `index_history.py`; everything
else on that screen — the world indices, the oil and copper prices, gold and
silver — was a single number with no shape at all. This fetches the same daily
history for them, from the same source and under the same rule.

THE RULE, WHICH IS THE WHOLE OF THE SAFETY HERE
An instrument id is not a name. `/indices/egx-70` is a real page whose own
instrument is a different index, and the first id `index_history.py` tried
returned a series closing around 16 against an index at 54,737. So an id is
never trusted because it looks right: every series is checked against the level
this site ALREADY publishes for the same instrument, and refused outright when
they disagree. Two independent sources agreeing is evidence; one source
asserting a number is not.

A wrong instrument is wrong by orders of magnitude, not by a rounding place —
Tadawul's plausible candidates came back at 1,985 and 66,405 against a
published 11,238 — so the tolerance below is loose enough to allow the real gap
between an intraday reading and the previous session's close, and nowhere near
loose enough to let a different instrument through.

WHAT IS NOT HERE, AND WHY
Tadawul and the five currency pairs. No candidate id matched their published
level, and open.er-api.com — where the pound rates come from — publishes today
and no history at all. They keep their number and get no curve. A drawn line is
a claim about the past; there is no honest one to draw.

Usage:
    python3 scripts/rate_history.py [--since 2025-01-01] [--check]
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import index_history as ih  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
RATES = REPO / "public" / "data" / "v1" / "rates" / "latest.json"
OUT = REPO / "public" / "data" / "v1" / "rates" / "history.json"

# How far a fetched close may sit from the level we publish and still be
# accepted as the same instrument. Ours is often an intraday reading and the
# newest close is the previous session's, so a real gap of a percent or so is
# ordinary. A wrong instrument misses by 80% or more.
TOLERANCE = 0.02

# Our id for the row, the Investing.com instrument, and where in
# rates/latest.json the level to check it against lives.
#
# Verified 30 Aug 2026 against the level published in the same minute:
#   S&P 500     166    7,711.76  vs ours 7,711.76   exact
#   Nasdaq    14958   26,402.42  vs ours 26,402.42  exact
#   FTSE 100     27   10,824.26  vs ours 10,824.27
#   Oil (WTI)  8849       83.40  vs ours 83.40      exact
#   Copper     8831        6.59  vs ours 6.66       1.0%, two sessions apart
#   Gold spot    68    4,455.15  vs ours 4,456.40   0.03%
#   Silver spot  69       66.38  vs ours 66.50      0.18%
# The ids on the left are rates/latest.json's own — `NASDAQ_IXIC`, not
# `NASDAQ`. They are what the site joins on, and inventing a tidier one here
# means the series is fetched, verified, published and then silently joined to
# nothing: four of these seven drew no line for exactly that reason.
INSTRUMENTS = [
    ("SP_SPX", 166, "world", "S&P 500"),
    ("NASDAQ_IXIC", 14958, "world", "Nasdaq"),
    ("TVC_UKX", 27, "world", "FTSE 100"),
    ("NYMEX_CL1!", 8849, "world", "Oil"),
    ("COMEX_HG1!", 8831, "world", "Copper"),
    ("XAU", 68, "metals", "Gold"),
    ("XAG", 69, "metals", "Silver"),
]


class Refused(Exception):
    """The series does not match the instrument it claims to be."""


def published() -> dict[str, float]:
    """The level this site currently shows for each row, by label."""
    doc = json.loads(RATES.read_text(encoding="utf-8"))
    out: dict[str, float] = {}
    for row in doc.get("world") or []:
        if isinstance(row.get("level"), (int, float)):
            out[str(row.get("label"))] = float(row["level"])
    for row in doc.get("metals") or []:
        if isinstance(row.get("usd_ounce"), (int, float)):
            out[str(row.get("label"))] = float(row["usd_ounce"])
    return out


def verified(instrument: int, label: str, level: float, since: str) -> dict[str, float]:
    """The daily closes, or nothing at all if the newest one disagrees."""
    ih.INSTRUMENTS["_probe"] = instrument
    today = datetime.date.today().isoformat()
    rows = ih.series("_probe", since, today)
    if not rows:
        raise Refused(f"{label}: instrument {instrument} returned no rows")
    newest_date, newest = sorted(rows.items())[-1]
    gap = abs(newest - level) / max(abs(level), 1e-9)
    if gap > TOLERANCE:
        raise Refused(
            f"{label}: instrument {instrument} closed {newest:,.4f} on {newest_date}"
            f" against a published {level:,.4f} — {gap * 100:.1f}% apart, refused"
        )
    return rows


def build(since: str) -> dict:
    levels = published()
    held = {}
    if OUT.exists():
        try:
            held = {s["id"]: s for s in json.loads(OUT.read_text(encoding="utf-8")).get("series", [])}
        except (OSError, ValueError):
            held = {}

    out = []
    for our_id, instrument, _where, label in INSTRUMENTS:
        level = levels.get(label)
        if level is None:
            print(f"   ! {label}: nothing published to check it against — skipped")
            continue
        try:
            rows = verified(instrument, label, level, since)
        except (Refused, ih.IndexHistoryUnavailable) as error:
            kept = held.get(our_id)
            if kept:
                print(f"   ! {error} — held {len(kept.get('sessions', []))} sessions")
                out.append(kept)
            else:
                print(f"   ! {error}")
            continue
        sessions = [{"date": d, "close": c} for d, c in sorted(rows.items())]
        out.append({"id": our_id, "label": label, "instrument": instrument,
                    "source": "investing.com", "sessions": sessions})
        print(f"   {label}: {len(sessions)} sessions,"
              f" {sessions[0]['date']} → {sessions[-1]['date']}")
    return {"updated_at": datetime.datetime.now(datetime.UTC).isoformat(timespec="seconds"),
            "series": out}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--since", default=None,
                        help="first session to fetch (default: two years back)")
    parser.add_argument("--check", action="store_true", help="fetch and report, write nothing")
    args = parser.parse_args()

    since = args.since or (datetime.date.today() - datetime.timedelta(days=730)).isoformat()
    document = build(since)
    if not document["series"]:
        print("! nothing verified and nothing held — writing nothing")
        return 0
    if args.check:
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")
    print(f"   wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
