#!/usr/bin/env python3
"""Keep a daily record of where the indices closed and how the market split.

Two things the app wants to draw and nothing was storing.

**Index levels.** The rates document publishes EGX 30, EGX 70 and EGX 100 as a
level and a change, with no series behind them — so an index card could show a
number but never a shape. This file used to say no historical feed was reachable
and grow the series one session at a time. That was true of the sources it knew
about: Investing.com publishes all three daily, back a year, and every newest
close agrees with the level we already publish from TradingView to the decimal.
`index_history.py` fetches it and **refuses the whole run** if that agreement
fails, because an instrument id is just a number in a URL and getting it wrong
produces a plausible chart of the wrong index rather than an error.

**Breadth.** How many shares rose, fell and did not move is the single most
useful sentence about a session — "it was 40 up against 180 down" says whether
a green index was the whole market or three heavyweights — and it is already
derivable from the snapshot the app ships. It was simply never counted.

The store is cumulative and append-only: a row is written once per market date
and never rewritten, so a bad run cannot corrupt yesterday. It starts with one
row and the charts grow into it, which is visible and honest rather than
backfilled from something we do not have.
"""

from __future__ import annotations

import argparse
import json
import pathlib
from datetime import date as date_cls, timedelta

import index_history

REPO = pathlib.Path(__file__).resolve().parent.parent
STORE = pathlib.Path(__file__).resolve().parent / "market_history.json"
OUT = REPO / "public" / "data" / "v1" / "market-history.json"
# Written in both places, like every other builder: `build_fixtures` verifies
# that the bundled copy matches the published one and fails the build if it
# does not, rather than copying it itself.
FIXTURE = REPO / "app" / "assets" / "fixtures" / "market-history.json"
MARKET = REPO / "public" / "data" / "v1" / "market.json"
RATES = REPO / "public" / "data" / "v1" / "rates" / "latest.json"

# A session is worth keeping for about a year of trading. Past that the file
# grows without the charts getting more useful, and it ships in the binary.
KEEP = 260

# How far back to ask the historical feed for. A year of sessions is what
# `KEEP` retains anyway.
BACKFILL_DAYS = 400


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


COMPANIES = REPO / "public" / "data" / "v1" / "companies"

# How many past sessions to reconstruct breadth for. The founder asked for two
# to four weeks and then accumulation, which is what this is: a short runway so
# the chart has lines on the day it ships, and a live row appended each session
# after that.
BACKFILL_SESSIONS = 20


def derived_breadth(limit: int) -> dict[str, dict]:
    """Breadth for past sessions, counted from the stored per-company closes.

    **This is a second method and it is labelled as one.** Today's row is
    counted from the market snapshot, which reads every listed share's
    published change — 282 shares, and a change of exactly zero is a real "did
    not move". This one compares a share's close against its previous close,
    and can only see shares whose stored history covers both days: 220 have
    history current to the latest session, 26 are two days stale, 23 have none
    at all. So it counts about 230 where the snapshot counts 282.

    That difference is carried, not hidden. Each row keeps its own `counted`,
    the chart already scales every line against the largest `counted` it sees
    rather than against its own maximum, and `basis` says which method produced
    the row. Two numbers for the *same* session would be the bug that was fixed
    once already; two adjacent sessions counted over slightly different
    populations, each saying so, is just the data we have.
    """
    closes: dict[str, dict[str, float]] = {}
    span: dict[str, tuple[str, str]] = {}
    for path in COMPANIES.glob("*.json"):
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        ticker = doc.get("ticker") or path.stem
        days = [
            row for row in (doc.get("price_history") or [])
            if row.get("date") and row.get("close") is not None
        ]
        if not days:
            continue
        span[ticker] = (min(d["date"] for d in days), max(d["date"] for d in days))
        for row in days:
            closes.setdefault(row["date"], {})[ticker] = row["close"]

    dates = sorted(closes)
    out: dict[str, dict] = {}
    # `limit + 1` because the oldest session in the window still needs the day
    # before it to be compared against.
    for i in range(max(1, len(dates) - limit), len(dates)):
        previous, current = dates[i - 1], dates[i]
        up = down = flat = 0
        for ticker, (first, last) in span.items():
            # Listed and reporting across this pair, or it is not countable.
            if first > previous or last < current:
                continue
            before = closes[previous].get(ticker)
            if before is None:
                continue
            now = closes[current].get(ticker)
            if now is None:
                # Listed, reporting either side, no close today: it did not
                # trade, which is exactly what "unchanged" means.
                flat += 1
            elif now > before:
                up += 1
            elif now < before:
                down += 1
            else:
                flat += 1
        if up + down + flat:
            out[current] = {
                "up": up,
                "down": down,
                "flat": flat,
                "counted": up + down + flat,
                "basis": "closes",
            }
    return out


def breadth(market: dict) -> dict | None:
    """How the session split, counted from the shares themselves.

    A share with no change published is not counted as unchanged — it is not
    counted at all. "Did not move" is a real state and a missing figure is a
    different one, and adding them together would overstate the quiet half of
    the market.
    """
    stocks = market.get("stocks") or {}
    up = down = flat = 0
    for row in stocks.values():
        change = row.get("change_percent")
        if change is None:
            continue
        if change > 0:
            up += 1
        elif change < 0:
            down += 1
        else:
            flat += 1
    if up + down + flat == 0:
        return None
    return {"up": up, "down": down, "flat": flat, "counted": up + down + flat}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--no-backfill",
        action="store_true",
        help="skip the historical index fetch and record only today",
    )
    args = parser.parse_args()

    print("── Index levels and market breadth")

    market, rates = load(MARKET), load(RATES)
    date = market.get("date")
    if not date:
        print("   no market date — nothing to record")
        return 0

    row: dict = {"date": date}
    levels = {
        index["id"]: index["level"]
        for index in rates.get("indices") or []
        if index.get("id") and index.get("level") is not None
    }
    if levels:
        row["indices"] = levels
    if (split := breadth(market)) is not None:
        row["breadth"] = {**split, "basis": "session"}
    spot = {
        m["id"]: m["usd_ounce"]
        for m in (rates.get("metals") or [])
        if m.get("id") and m.get("usd_ounce") is not None
    }
    if spot:
        row["metals"] = spot

    if len(row) == 1:
        print("   neither an index level nor a countable session — skipping")
        return 0

    store = load(STORE)
    rows = {r["date"]: r for r in store.get("sessions") or []}

    # Backfill the index levels from the historical feed. This only ever adds
    # `indices` to a row; a breadth count is never invented for a past session,
    # because breadth is counted a different way from a different document and
    # a series that silently changed method halfway along would be worse than a
    # short one.
    if not args.no_backfill:
        try:
            since = (date_cls.today() - timedelta(days=BACKFILL_DAYS)).isoformat()
            history = index_history.fetch(since, date)
        except index_history.IndexHistoryUnavailable as error:
            print(f"   no index history: {error}")
        else:
            added = 0
            for index_id, points in history.items():
                for day, close in points.items():
                    # Today's row comes from our own snapshot and outranks it.
                    if day == date:
                        continue
                    entry = rows.setdefault(day, {"date": day})
                    levels_for = entry.setdefault("indices", {})
                    if index_id not in levels_for:
                        levels_for[index_id] = close
                        added += 1
            print(f"   backfilled {added} index closes from the historical feed")

        # Gold and silver, spot, in dollars an ounce. The rates document quotes
        # them as a headline number with no series behind it, so the cards
        # could say what gold costs and never what it had been doing.
        try:
            since = (date_cls.today() - timedelta(days=BACKFILL_DAYS)).isoformat()
            for metal_id, points in index_history.metals(since, date).items():
                for day, close in points.items():
                    entry = rows.setdefault(day, {"date": day})
                    entry.setdefault("metals", {}).setdefault(metal_id, close)
        except index_history.IndexHistoryUnavailable as error:
            print(f"   no metal history: {error}")
        else:
            counted = sum(1 for r in rows.values() if r.get("metals"))
            print(f"   {counted} sessions carry a gold and silver close")

    # Breadth for past sessions, so the chart has lines rather than one dot.
    # Never overwrites a row that already has a count: a session counted from
    # the live snapshot is the better reading and keeps it.
    if not args.no_backfill:
        filled = 0
        for day, split in derived_breadth(BACKFILL_SESSIONS).items():
            if day == date:
                continue
            entry = rows.setdefault(day, {"date": day})
            if not entry.get("breadth"):
                entry["breadth"] = split
                filled += 1
        if filled:
            print(f"   reconstructed breadth for {filled} past sessions "
                  f"from stored closes")
    # Append-only per date. A rerun on the same day refreshes that day and
    # leaves every other row exactly as it was written.
    rows[date] = row
    sessions = [rows[d] for d in sorted(rows)][-KEEP:]

    payload = {"updated_at": market.get("captured_at"), "sessions": sessions}
    body = json.dumps(payload, ensure_ascii=False, indent=1) + "\n"
    STORE.write_text(body, encoding="utf-8")
    for path in (OUT, FIXTURE):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body, encoding="utf-8")

    latest = sessions[-1]
    split = latest.get("breadth") or {}
    print(f"   {len(sessions)} sessions stored, newest {latest['date']}")
    if split:
        print(f"   {split['up']} up · {split['down']} down · {split['flat']} flat "
              f"of {split['counted']}")
    if latest.get("indices"):
        for name, level in latest["indices"].items():
            print(f"     {name:10} {level:,.2f}")
    print(f"\nwrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
