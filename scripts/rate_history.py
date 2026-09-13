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

THE FIVE CURRENCY PAIRS, FOUND AT LAST
They were absent for a while under the note "no candidate id matched their
published level". That was true and the conclusion was wrong: the ids had never
been found, not disproved. Investing's own search endpoint names them —
USD/EGP is 2122, and a blind probe of 2080-2120 had stopped two short — and
every one of the five then passed the same check as the rest, within 0.08% of
the level this site already publishes from a different source entirely
(open.er-api.com). Two sources agreeing is the whole test, and they agree.

It matters more than the other rows. Everything on the world screen is placed
against its own two years, and the pound was the one figure that could not be,
on the screen most about it: a reader was shown a dated level and told plainly
that nothing was claimed. It is measured like everything else now.

WHAT IS STILL NOT HERE, AND WHY
Tadawul, and any Egyptian interest rate. Tadawul has no id that matches. The
rate is the more painful gap — it is a whole channel of the world monitor —
but this site publishes no policy rate, T-bill yield or bond yield anywhere,
so there is nothing to check a fetched series against. Taking one source's word
for both the level and its history is precisely what the rule above forbids,
and a curve nobody can check is worth less than no curve. It needs a published
Egyptian rate from an independent source first.

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
    # Verified 13 Sep 2026 against rates/latest.json's own `egp` figure, which
    # comes from open.er-api.com and not from here:
    #   USD/EGP  2122   51.3600  vs ours 51.3422   0.03%
    #   EUR/EGP  1634   59.5800  vs ours 59.5729   0.01%
    #   GBP/EGP  1749   69.4400  vs ours 69.4330   0.01%
    #   SAR/EGP 10082   13.6800  vs ours 13.6912   0.08%
    #   AED/EGP  9325   13.9800  vs ours 13.9802   0.00%
    # The id on the left is the CODE in that document, because that is what the
    # site joins on — the same trap that left four of the first seven fetched,
    # verified, published and joined to nothing.
    ("USD", 2122, "currencies", "US dollar"),
    ("EUR", 1634, "currencies", "Euro"),
    ("GBP", 1749, "currencies", "Pound sterling"),
    ("SAR", 10082, "currencies", "Saudi riyal"),
    ("AED", 9325, "currencies", "UAE dirham"),
    # The price of money in Egypt, and the row this file said it could not
    # have. It could not while nothing published a level to check a series
    # against; harvest_cbe.py has been taking the central bank's own daily
    # interbank page all along, and build_rates_api.py now publishes the
    # newest dated reading from it. That is a genuinely different source from
    # the one below, which is the whole of the test.
    #
    # Verified 13 Sep 2026 against the CBE's own 10 September figure:
    #   Egypt Overnight  40647   19.430  vs the CBE's 19.433   0.0%
    # The two bond yields that came back from the same search are the reason
    # the check exists: Egypt 1-Year closed 25.320 and Egypt 10-Year 23.020
    # against the same 19.433, and both were refused.
    ("EGY_ON", 40647, "egypt", "Overnight interbank"),
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
    # The pound's own rows carry their level as `egp`, and it comes from a
    # different source than the histories below — which is what makes checking
    # one against the other worth anything.
    for row in doc.get("currencies") or []:
        if isinstance(row.get("egp"), (int, float)):
            out[str(row.get("label"))] = float(row["egp"])
    # Egypt's own rate, from the central bank's page rather than from the
    # source the series below comes from.
    for row in doc.get("egypt") or []:
        if isinstance(row.get("percent"), (int, float)):
            out[str(row.get("label"))] = float(row["percent"])
    return out


# How many recent sessions the published level is looked for in.
#
# It used to be one — the newest — which quietly assumed the two sides were
# never a day apart. They are, in both directions: rates/latest.json carries no
# date, and the world rows are a previous close that can be two sessions behind
# a series fetched at noon. Oil was refused on 31 August for exactly that,
# 86.39 against a published 83.40, when both figures were right and three days
# apart. Five is enough to cover a weekend and a holiday, and far too few for a
# wrong instrument to hit by accident.
WINDOW = 5


def verified(instrument: int, label: str, level: float, since: str) -> dict[str, float]:
    """The daily closes, or nothing at all if none of them is our figure.

    The test is whether the level this site publishes appears ANYWHERE in the
    instrument's recent history, not whether it equals the newest bar. A wrong
    instrument misses every session by an order of magnitude — Tadawul's
    candidates came back at 1,985 and 66,405 against a published 11,238 — and
    the right one matches on whichever day the two happen to share.
    """
    ih.INSTRUMENTS["_probe"] = instrument
    today = datetime.date.today().isoformat()
    rows = ih.series("_probe", since, today)
    if not rows:
        raise Refused(f"{label}: instrument {instrument} returned no rows")
    recent = sorted(rows.items())[-WINDOW:]
    best = min(recent, key=lambda row: abs(row[1] - level))
    gap = abs(best[1] - level) / max(abs(level), 1e-9)
    if gap > TOLERANCE:
        newest_date, newest = recent[-1]
        raise Refused(
            f"{label}: instrument {instrument} closed {newest:,.4f} on {newest_date}"
            f" and its nearest of {len(recent)} sessions is {best[1]:,.4f}"
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
    for our_id, instrument, group, label in INSTRUMENTS:
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
                    "source": "investing.com", "group": group,
                    "sessions": sessions})
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
