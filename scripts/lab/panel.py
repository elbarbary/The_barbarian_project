#!/usr/bin/env python3
"""The lab's prices, from the sources this project already keeps.

WHY NOT JUST THE SCAN
---------------------
The lab began by reading one TradingView scan: 120 split-adjusted bars a
company, fetched fresh each run. Two things are wrong with that.

The first is depth. A scan reaches back about six months, and the record this
lab is building is meant to run for years. The scorer marks a forecast against
what the market then did, so a night older than the oldest bar in the current
scan simply stops being scorable — in February the August nights would have
dropped out of the leaderboard while it went on saying "8 dates".

The second is the day that matters most. The vendor does not publish a
completed EGX daily bar for hours: a scan taken at 15:14, forty-four minutes
after the 14:30 close, still had the PREVIOUS session as the newest bar for
every company on the exchange.

This project already holds better. `data-source/prices/` is close and volume
for 299 listings, up to twenty-five years deep, built from Mubasher and
checked against prices already held — committed, so reading it costs no
request at all. And the exchange's own market-watch carries open, high, low,
close and volume for the session that has just ended: by 15:35 Cairo on the
14th it had settled, while the vendor still showed the 13th.

So: depth from the archive, open/high/low from the scan, and today from the
exchange itself.

THE RULE ABOUT MIXING SOURCES
-----------------------------
Never splice two series that disagree.

Comparing the archive against the scan over their overlap, 250 of 261
companies agree exactly. Eleven do not, and they are informative: LUTS
differs by 0.3898 on the median session and 0.3899 at the widest, over all
119 shared sessions. A CONSTANT ratio is a corporate action one source
adjusted for and the other did not. It is not noise and it cannot be averaged
away — joining the two makes a jump the models would read as a real move, on
a day nothing happened.

Where they disagree the archive is not used for that company, and the run
records which companies those were. Where they agree the archive is the
series, because it is the longer one.
"""

from __future__ import annotations

import json
import pathlib
import statistics
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

REPO = pathlib.Path(__file__).resolve().parent.parent.parent
DEEP = REPO / "data-source" / "prices"

MARKET_WATCH = "/api/bff/egx/market-watch?Page=1&PageSize=500"
MARKET_STATUS = "/api/bff/egx/market-status"

# How far the archive and the scan may differ over their overlap and still be
# treated as the same series. One per cent is far wider than rounding and far
# narrower than any corporate action: the closest disagreement measured was
# 2.7%, and the closest agreement was 0.
AGREEMENT = 0.01
OVERLAP = 40


def deep_bars(ticker: str, *, root: pathlib.Path = DEEP) -> list[dict]:
    """This company's archived sessions: date, close, volume."""
    path = root / f"{ticker}.json"
    try:
        held = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    bars = [b for b in (held.get("bars") or [])
            if b.get("date") and isinstance(b.get("close"), (int, float))]
    bars.sort(key=lambda b: b["date"])
    return bars


def agreement(deep: list[dict], scan: list[dict]) -> tuple[float | None, int]:
    """(median relative gap over shared sessions, how many were shared).

    None when there is not enough overlap to judge. Median rather than mean
    because one bad session should not condemn a series, and maximum would:
    the disagreements that matter here sit on EVERY shared session, which is
    exactly what makes them corporate actions rather than errors.
    """
    held = {b["date"]: b["close"] for b in deep if b.get("close")}
    shared = [(b["close"], held[b["date"]]) for b in scan
              if b.get("date") in held and isinstance(b.get("close"), (int, float))]
    if len(shared) < OVERLAP:
        return None, len(shared)
    return statistics.median(abs(a - b) / b for a, b in shared if b), len(shared)


def rows_of(payload) -> list[dict]:
    """The company rows inside a market-watch answer.

    The service nests `data` inside `data` on some pages and not on others,
    so this descends until it finds the list rather than naming a path that
    is right on the day it was written.
    """
    node = payload
    for _ in range(4):
        if isinstance(node, list):
            return [r for r in node if isinstance(r, dict)]
        if not isinstance(node, dict):
            return []
        node = node.get("data")
    return node if isinstance(node, list) else []


def _session_date(rows: list[dict]) -> str | None:
    """The date the exchange stamped on these rows.

    From `writeTime` — "202609141535" — and not from `lastTradeDate`, which
    on every row of the 14th said the 13th. A field that is a day behind on
    the one day it is read is not a date this can be built on.
    """
    stamps = [str(r.get("writeTime") or "")[:8] for r in rows]
    stamps = [s for s in stamps if len(s) == 8 and s.isdigit()]
    if not stamps:
        return None
    common = max(set(stamps), key=stamps.count)
    if stamps.count(common) < len(stamps) / 2:
        return None
    return f"{common[:4]}-{common[4:6]}-{common[6:]}"


def settled(status) -> str | None:
    """The date of a session the exchange itself calls closed, or None.

    An intraday `closePrice` is a last price, not a close, and a forecast
    made from one is a forecast made from an unfinished session. The exchange
    publishes its own status; this asks it rather than watching the clock,
    because the clock does not know about an early close.
    """
    body = status.get("data") if isinstance(status, dict) else None
    if not isinstance(body, dict):
        return None
    if str(body.get("status") or "").strip().lower() != "closed":
        return None
    when = str(body.get("statusDate") or "")[:10]
    return when if len(when) == 10 else None


def todays_bars(watch, status) -> tuple[str | None, dict[str, dict]]:
    """Open, high, low, close and volume for the session that has just ended.

    Empty unless the exchange says the market is closed AND the status agrees
    with the date on the rows. Two sources of the same fact, because the one
    thing this must never do is stamp an unfinished session with a date and
    hand it to a model as a completed bar.
    """
    closed = settled(status)
    if not closed:
        return None, {}
    rows = rows_of(watch)
    when = _session_date(rows)
    if not when or when != closed:
        return None, {}

    out = {}
    for row in rows:
        ticker = str(row.get("reuters") or "").split(".")[0].strip().upper()
        close = row.get("closePrice")
        if not ticker or not isinstance(close, (int, float)) or close <= 0:
            continue
        bar = {"date": when, "close": float(close)}
        for ours, theirs in (("open", "openPrice"), ("high", "high"),
                             ("low", "low"), ("volume", "volume")):
            value = row.get(theirs)
            if isinstance(value, (int, float)):
                bar[ours] = float(value)
        previous = row.get("prevClose")
        if isinstance(previous, (int, float)) and previous > 0:
            bar["_prevClose"] = float(previous)
        out[ticker] = bar
    return when, out


def extend(bars: list[dict], bar: dict | None) -> tuple[list[dict], str | None]:
    """Add today's session to a company's history, or say why not.

    `prevClose` is the check. The exchange publishes what it thinks yesterday
    closed at; if that disagrees with the last bar already held, the two
    series have been adjusted differently and appending would put a jump in
    the middle of the history that nothing in the market caused.
    """
    if not bar:
        return bars, "the exchange published no close for it"
    if bars and bars[-1]["date"] >= bar["date"]:
        return bars, None                      # already held; nothing to add
    previous = bar.get("_prevClose")
    if bars and previous:
        last = bars[-1]["close"]
        if last and abs(last - previous) / last > AGREEMENT:
            return bars, (f"the exchange says the previous close was "
                          f"{previous:g} and the history holds {last:g}")
    clean = {k: v for k, v in bar.items() if not k.startswith("_")}
    return bars + [clean], None


def build(scan: dict, *, today: dict[str, dict] | None = None,
          root: pathlib.Path = DEEP) -> dict:
    """Every company's history, from the deepest source that can be trusted.

    Returns the panel and an account of how it was assembled: which companies
    took the archive, which fell back to the scan and why, and which gained
    today's session. The account is written into the run, because "where did
    this price come from" is the first question anybody auditing a forecast
    asks and the hardest one to answer afterwards.
    """
    today = today or {}
    panel: dict[str, list[dict]] = {}
    note = {"archive": [], "scanOnly": {}, "extended": [], "notExtended": {}}

    for record in scan.get("records") or []:
        ticker = record.get("ticker")
        if not ticker:
            continue
        scanned = sorted((b for b in (record.get("recentSplitAdjustedBars") or [])
                          if b.get("date")), key=lambda b: b["date"])
        archived = deep_bars(ticker, root=root)
        gap, shared = agreement(archived, scanned)

        if gap is not None and gap <= AGREEMENT:
            # The archive is the longer series and the two agree, so the scan
            # contributes only what the archive lacks: open, high and low.
            shape = {b["date"]: b for b in scanned}
            bars = [dict(b, **{k: v for k, v in (shape.get(b["date"]) or {}).items()
                               if k in ("open", "high", "low")})
                    for b in archived]
            note["archive"].append(ticker)
        else:
            bars = scanned
            note["scanOnly"][ticker] = (
                f"the archive differs from the scan by {gap:.1%} of the price "
                f"across {shared} shared sessions"
                if gap is not None else
                f"only {shared} sessions overlap, too few to check")

        bars, refused = extend(bars, today.get(ticker))
        if refused is None and today.get(ticker):
            note["extended"].append(ticker)
        elif refused:
            note["notExtended"][ticker] = refused
        if bars:
            panel[ticker] = bars

    note["scanOnlyCount"] = len(note["scanOnly"])
    note["archiveCount"] = len(note["archive"])
    note["extendedCount"] = len(note["extended"])
    return {"panel": panel, "sources": note}


def fetch_today() -> tuple[dict, dict]:
    """The exchange's own market-watch and its status, now.

    Fetched here rather than read from the committed snapshot archive for the
    reason the scan is fetched rather than shared: the archive is written by
    another workflow on its own schedule, and a forecast has to be made from
    the prices the record says it was made from, not from whichever capture
    happened to land first.
    """
    import harvest_egx_beta as egx
    return egx.request(MARKET_WATCH), egx.request(MARKET_STATUS)
