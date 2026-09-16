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

A COMPANY THE SCAN HAS NO SESSIONS FOR
--------------------------------------
Has no series here, even when the archive holds years of it. Nothing checks
the archive when the vendor's sessions are not there, and the check cannot be
done with less. Every company whose archive disagreed with the vendor on 14
September — LUTS by 39%, GRCA by 25%, EEII by 17% — had a LATEST close that
agreed with the vendor's to the piastre: the corporate action sits in the
older sessions, and a comparison against the scan's `close` or its
`currentSessionBar` would have waved all of them through. LUTS and GRCA were
both among the companies the 15 September scan came back without.

Why a scan has no sessions for a company is the scan's to say. A listing that
has never traded has none to give (`historyStatus: "none"`); a fetch that did
not get them is `missing`, and `missing()` makes that refusable: a record
rebuilt from such a scan describes a smaller market than the one it is about.
An earlier scan that does hold the company can stand beside it — see
`evaluate.bar_panel`, which takes each company's series whole from one scan.
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


def missing(scan: dict) -> list[str]:
    """The listings whose history exists and this scan does not carry.

    `egx_scan.mjs` names them in `missingHistoryTickers`: no answer from the
    chart socket after every pass, or a "no sessions" answer for a company
    the scanner's own volume says trades. Empty on a complete scan.

    A scan written before that field says it another way. `historiesFetched`
    counted the listings the socket answered, so fewer answers than listings
    means some never came — and since such a scan cannot tell a listing with
    no sessions from a lost one, every company it holds no sessions for is
    counted. The scans of 14 September answered all 296; the one of 15
    September answered 241 of 294, and 53 are counted.
    """
    named = scan.get("missingHistoryTickers")
    if isinstance(named, list):
        return sorted(t for t in named if isinstance(t, str) and t)
    records = scan.get("records") or []
    answered = scan.get("historiesFetched")
    listed = scan.get("scannerReturned", len(records))
    if not isinstance(answered, int) or not isinstance(listed, int) or answered >= listed:
        return []
    return sorted(r["ticker"] for r in records
                  if r.get("ticker") and not r.get("recentSplitAdjustedBars"))


def uncovered(scans: list[dict]) -> list[str]:
    """What no scan given accounts for: missing from one, answered by none.

    A company one scan lost and another answered for is accounted for — with
    its sessions, which `evaluate.bar_panel` then takes whole from that scan,
    or with none, because it is a listing that has never traded. The second
    matters for scans written before `missingHistoryTickers`, which cannot
    tell the two apart on their own.
    """
    lost: set[str] = set()
    answered: set[str] = set()
    for scan in scans:
        gone = set(missing(scan))
        lost |= gone
        answered |= {r.get("ticker") for r in scan.get("records") or []} - gone
    return sorted(lost - answered)


def refusal(who: str, lost: list[str]) -> str:
    """Why a record is not rebuilt from these scans, in the words the log shows."""
    named = ", ".join(lost[:12]) + (f" and {len(lost) - 12} more" if len(lost) > 12 else "")
    count = f"{len(lost)} listing" + ("s" if len(lost) != 1 else "")
    return (f"{who}: the scan is missing the history of {count} ({named}). "
            "The fetch did not get it, which is not the same as there being none, "
            "and a record rebuilt from it would describe a smaller market than the one "
            "it is about. Refusing: fetch the scan again, or give an earlier scan that "
            "holds them beside it.")


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
    return when, _bars_of_rows(rows, when)


def closed_bars(watch, status) -> tuple[str | None, dict[str, dict]]:
    """The newest finished session's bars, for DRAWING what happened — never
    for a forecast. `last_closed`'s rule rather than `todays_bars`', so a
    publish that runs after midnight still has the close every percentage on
    the screen is measured from."""
    when = last_closed(watch, status)
    return (when, _bars_of_rows(rows_of(watch), when)) if when else (None, {})


def _bars_of_rows(rows: list[dict], when: str) -> dict[str, dict]:
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
    return out


def last_closed(watch, status) -> str | None:
    """The newest session the exchange has finished, while it stays closed.

    Not `todays_bars`, and deliberately looser than it. That function stamps
    a bar with a date and hands it to a model, so the status and the rows must
    name the SAME day. This answers a different question — "has anything
    traded since the session these rows are from?" — for the re-rank, which
    reads forecasts and never a bar.

    The difference is midnight. At 00:02 on the 15th the exchange said
    `Closed` with a status date of the 15th, and every row was still stamped
    the 14th: nothing had traded since the 14th's close, and `todays_bars`
    said "no session" because the two dates no longer matched. A schedule
    that runs late — and this repository's do, by hours — would have lost
    every reading after midnight to a rule written for something else.

    So: closed now, and the rows' session no later than the status. A feed
    that went stale through a whole session is caught by the commitment
    timing rule, which refuses a basis older than a session that has closed.
    """
    body = status.get("data") if isinstance(status, dict) else None
    if not isinstance(body, dict):
        return None
    if str(body.get("status") or "").strip().lower() != "closed":
        return None
    now = str(body.get("statusDate") or "")[:10]
    when = _session_date(rows_of(watch))
    if not when or len(now) != 10 or when > now:
        return None
    return when


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
    took the archive, which fell back to the scan and why, which had no
    sessions in the scan at all, and which gained today's session. The account
    is written into the run, because "where did this price come from" is the
    first question anybody auditing a forecast asks and the hardest one to
    answer afterwards.
    """
    today = today or {}
    panel: dict[str, list[dict]] = {}
    note = {"archive": [], "scanOnly": {}, "noHistory": {}, "extended": [],
            "notExtended": {}}
    lost = set(missing(scan))

    for record in scan.get("records") or []:
        ticker = record.get("ticker")
        if not ticker:
            continue
        scanned = sorted((b for b in (record.get("recentSplitAdjustedBars") or [])
                          if b.get("date")), key=lambda b: b["date"])
        if not scanned:
            # No series, not the archive's and not a lone session from the
            # exchange: there is nothing to check either against (see "A
            # COMPANY THE SCAN HAS NO SESSIONS FOR" above).
            note["noHistory"][ticker] = (
                "the scan is missing its history" if ticker in lost else
                "a listing with no sessions to fetch"
                if record.get("historyStatus") == "none" else
                "the scan carries no sessions for it")
            continue
        archived = deep_bars(ticker, root=root)
        gap, shared = agreement(archived, scanned)

        if gap is not None and gap <= AGREEMENT:
            # The archive is the longer series and the two agree, so the scan
            # contributes what the archive lacks: open, high and low, and
            # its newer completed sessions.
            shape = {b["date"]: b for b in scanned}
            bars = [dict(b, **{k: v for k, v in (shape.get(b["date"]) or {}).items()
                               if k in ("open", "high", "low")})
                    for b in archived]
            # The fresh scan may include completed sessions missing from
            # the checkout. Keep that tail before adding the official close.
            bars.extend(b for b in scanned if b["date"] > archived[-1]["date"])
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
    note["noHistoryCount"] = len(note["noHistory"])
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
