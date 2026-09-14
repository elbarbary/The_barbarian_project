#!/usr/bin/env python3
"""The arithmetic behind every measurement a reader's rulebook can test.

WHY THIS IS ITS OWN MODULE
--------------------------
A reader writes their own rulebook — "volume at least three times normal, a
filing in the last week, not already up twenty per cent" — and the site
evaluates it over every listed company and returns every match. That only
works if each column means exactly one thing, and if "I could not compute
this" is a different answer from "this is zero".

So the arithmetic lives here, alone, with the traps written down beside it.
`build_measures.py` assembles the table; this file decides what a number is.

THE THREE WAYS A MEASUREMENT CAN BE ABSENT
------------------------------------------
They are not interchangeable, and collapsing them is how a screen ends up
telling somebody a share trades at infinite relative volume.

``None``            The measurement could not be computed. Too little
                    history, a denominator of zero, a figure never filed.
                    A rule that tests this column does NOT match — see
                    `compare()`. It is never rendered as 0.

``0``               The measurement was computed and it is nought. No shares
                    changed hands; the price did not move; the company has
                    filed nothing this month. This is a fact and it is kept.

Never a sentinel    No -1, no 999, no "N/A" string. A magic number survives
                    one refactor and then somebody sorts by it.

POINT-IN-TIME
-------------
Every function takes the bars it is allowed to see and looks no further. The
archive is not uniformly fresh — on 14 September 2026 it held 227 companies
to the 13th, 40 to the 10th and 16 to the 9th — so "the last twenty sessions"
means the last twenty sessions THIS COMPANY has, and the row carries the date
of the newest bar that went into it. A market-wide calendar would silently
compare a company's Thursday with another's Wednesday.
"""

from __future__ import annotations

import datetime
import statistics

# The playbook's confirmation threshold: "relative volume of at least 3x"
# against "the median of the previous 20 sessions".
RV_WINDOW = 20

# A close-to-close move this large is at or beyond the exchange's daily band
# for an ordinary listing. Close-only data cannot prove a session LOCKED at
# the limit — that needs the high and the low, which this archive has held
# only since 28 August 2026 — so the column is named for what it measures:
# a move that reached the band, not a session that sat on it.
NEAR_LIMIT = 0.195


def _closes(bars: list[dict]) -> list[dict]:
    """Bars with a usable close, oldest first.

    A bar with no close is not a session at zero. It is a session this
    collector did not get, and averaging over it would invent a crash.
    """
    return [b for b in bars if isinstance(b.get("close"), (int, float))]


def as_of(bars: list[dict]) -> str | None:
    """The date of the newest bar behind every figure in this row."""
    usable = _closes(bars)
    return usable[-1].get("date") if usable else None


def rv20(bars: list[dict]) -> float | None:
    """Today's volume against the median of the previous 20 completed sessions.

    Two refusals, both of which have bitten this project before:

    The window EXCLUDES today. Including it pulls the median toward the very
    session being measured, so the day a share trades ten times its normal is
    also the day its "normal" rises — and the number that is supposed to say
    "unusual" quietly understates it.

    A median of zero returns None, not infinity and not a large number. Four
    companies on 14 September 2026 had not traded a share in twenty sessions
    (DCCC, MEGM, SEIGA, TOUR). Dividing by that median is undefined, and a
    screen that renders it as a big number puts the four deadest shares on
    the exchange at the top of anything sorted by unusual volume.
    """
    usable = _closes(bars)
    if len(usable) < RV_WINDOW + 1:
        return None
    today = usable[-1].get("volume")
    if not isinstance(today, (int, float)):
        return None
    window = [b.get("volume") or 0 for b in usable[-(RV_WINDOW + 1):-1]]
    normal = statistics.median(window)
    if normal <= 0:
        return None
    return round(today / normal, 3)


def median_volume(bars: list[dict], window: int = RV_WINDOW) -> float | None:
    """The company's own normal volume — the denominator, published beside it.

    A ratio nobody can check is a claim. `3.4x` means nothing until a reader
    can see that it is 340,000 against a normal of 100,000.
    """
    usable = _closes(bars)
    if len(usable) < window + 1:
        return None
    return statistics.median([b.get("volume") or 0 for b in usable[-(window + 1):-1]])


def traded_value(bars: list[dict]) -> float | None:
    """Today's close times today's volume, in pounds.

    The playbook asks whether a move happened on enough value to enter and
    exit without dominating the book. Volume alone cannot answer that: a
    million shares of a 40-piastre company and a million of a 300-pound one
    are not the same market.
    """
    usable = _closes(bars)
    if not usable:
        return None
    last = usable[-1]
    volume = last.get("volume")
    if not isinstance(volume, (int, float)):
        return None
    return round(last["close"] * volume, 2)


def median_traded_value(bars: list[dict], window: int = RV_WINDOW) -> float | None:
    """What this company's sessions are normally worth, on its own record."""
    usable = _closes(bars)
    if len(usable) < window + 1:
        return None
    values = [b["close"] * (b.get("volume") or 0) for b in usable[-(window + 1):-1]]
    return round(statistics.median(values), 2)


def change_over(bars: list[dict], sessions: int) -> float | None:
    """Percentage change across `sessions` completed sessions.

    Counted in the company's OWN sessions, not in calendar days. A share that
    did not trade for a week has not had five sessions, and treating the gap
    as sessions would date the comparison to a price nobody paid.

    Not corporate-action adjusted. The caller must say so, because HBCO's
    82% week in July 2026 reproduced almost exactly by applying its 0.8-for-1
    bonus multiplier to a price that moved from 8.04 to 8.13.
    """
    usable = _closes(bars)
    if len(usable) < sessions + 1:
        return None
    then = usable[-(sessions + 1)]["close"]
    if not then:
        return None
    return round((usable[-1]["close"] / then - 1) * 100, 3)


def near_limit_sessions(bars: list[dict], window: int = 5) -> int | None:
    """Completed sessions in the window whose close-to-close move reached the band.

    The playbook's hardest anti-chasing gate — "two or more completed
    limit-ups usually mean the discovery is late" — needs this count.

    It is deliberately NOT called `limit_ups`. A limit-up is a session that
    traded at the band and stopped, which needs the high, the low and that
    day's applicable band. This archive holds closes. A 19.6% close-to-close
    move is strong evidence of one and is not the same claim, and the column
    name has to carry the difference or somebody will later read it as proof.
    """
    usable = _closes(bars)
    if len(usable) < window + 1:
        return None
    hits = 0
    for before, after in zip(usable[-(window + 1):-1], usable[-window:]):
        if before["close"] and abs(after["close"] / before["close"] - 1) >= NEAR_LIMIT:
            hits += 1
    return hits


def sessions_since(bars: list[dict], when: str | None) -> int | None:
    """How many of this company's completed sessions have closed since a date.

    The unit a trader thinks in. "Filed eleven days ago" spans a weekend and
    a holiday; "filed four sessions ago" is four chances the market had to
    react, which is what the playbook's ten-session cohorts actually count.

    A date in the future — a filing stamped today, before today's session has
    completed — is zero sessions, never negative.
    """
    if not when:
        return None
    try:
        day = datetime.date.fromisoformat(str(when)[:10])
    except (TypeError, ValueError):
        return None
    usable = _closes(bars)
    if not usable:
        return None
    return sum(1 for b in usable
               if (b.get("date") or "") and datetime.date.fromisoformat(b["date"][:10]) > day)


def share_of(value: float | None, denominator: float | None) -> float | None:
    """One filed figure as a percentage of another, or None.

    The playbook's materiality tests are all this shape — a transaction
    against market capitalisation, a contract against annual revenue — and
    every one of them fails the same way: "do not rely on an impressive
    percentage without checking the denominator." So a denominator of zero,
    of None, or of the wrong sign returns None rather than a number, and the
    denominator itself is published in the row beside the ratio.
    """
    if not isinstance(value, (int, float)) or not isinstance(denominator, (int, float)):
        return None
    if denominator <= 0:
        return None
    return round(value / denominator * 100, 3)


def growth(now: float | None, before: float | None) -> float | None:
    """Period-on-period growth as a percentage, refused across a sign change.

    A loss of 10 becoming a profit of 5 is not "150% growth" — the phrase is
    arithmetic nonsense and, printed on a screen, a lie about a turnaround.
    It is a return to profit, which `build_signals.py` already reports as a
    streak break with the filings behind it. This returns None and lets that
    say it.
    """
    if not isinstance(now, (int, float)) or not isinstance(before, (int, float)):
        return None
    if before <= 0:
        return None
    return round((now / before - 1) * 100, 3)
