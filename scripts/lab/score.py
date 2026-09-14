#!/usr/bin/env python3
"""Marking a frozen forecast against what the market then did.

WHAT IS MEASURED, AND WHY IT IS RANK
------------------------------------
Rank IC — the Spearman correlation between what a model ranked highest and
what actually rose — is the metric because it asks the only question that
survives this market's shape. A share that rose 19.8% on the day it hit the
band did not rise 19.8% because a model was 19.8% right; the band decided the
number. Rank does not care about the magnitude, only the ordering, and the
ordering is what a reader would actually have used.

Directional accuracy is reported beside it and is the weaker of the two: on
a market where most shares move the same way most days, 52% is what a coin
gets for knowing which way the wind blows.

TIES ARE NOT A DRAW
-------------------
`flat` ranks every company identically. Its rank IC is UNDEFINED, not zero,
and scoring it as zero would quietly enter it in the league table on equal
terms with a model that made distinctions and got them half right. The same
holds for a day where every company fell: the outcome ranking is degenerate,
and nothing can be correlated with it.

THE COMPARISON IS PAIRED
------------------------
A model's mean IC across dates says almost nothing on its own — eight dates
has a standard error wide enough to swallow any of these numbers. What is
worth reading is the DIFFERENCE against a baseline on the same dates, where
the market's own mood cancels out. `against()` does that.
"""

from __future__ import annotations

import math
import statistics


def _ranks(values: list[float]) -> list[float]:
    """Average ranks, so a tie does not silently become an ordering."""
    order = sorted(range(len(values)), key=lambda i: values[i])
    out = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        shared = (i + j) / 2 + 1
        for k in range(i, j + 1):
            out[order[k]] = shared
        i = j + 1
    return out


# Below this many companies a correlation is a coincidence with a number on
# it. The market has ~280 listings; a date scoring fewer than this has had
# something go wrong upstream and should not enter the record as a result.
MIN_COMPANIES = 30


def rank_ic(pairs: list[tuple[float, float]]) -> float | None:
    """Spearman between predicted rank and realised rank, or None.

    None when: too few companies, every prediction identical, or every
    outcome identical. Each of those is a day the model could not be
    distinguished from any other, and a zero would be a claim that it drew.
    """
    if len(pairs) < MIN_COMPANIES:
        return None
    predicted = [p[0] for p in pairs]
    actual = [p[1] for p in pairs]
    if len(set(predicted)) < 2 or len(set(actual)) < 2:
        return None
    xs, ys = _ranks(predicted), _ranks(actual)
    n = len(pairs)
    mx, my = sum(xs) / n, sum(ys) / n
    top = sum((a - mx) * (b - my) for a, b in zip(xs, ys))
    bottom = (sum((a - mx) ** 2 for a in xs) * sum((b - my) ** 2 for b in ys)) ** 0.5
    return round(top / bottom, 6) if bottom else None


def directional_accuracy(pairs: list[tuple[float, float]]) -> float | None:
    """How often the sign was right, ignoring companies that did not move.

    A share that closed unchanged has no direction to have been right about,
    and counting it as a miss punishes a model for a session that did not
    happen.
    """
    moved = [(p, a) for p, a in pairs if a != 0]
    if len(moved) < MIN_COMPANIES:
        return None
    hits = sum(1 for p, a in moved if (p > 0) == (a > 0))
    return round(hits / len(moved), 6)


def summarise(ics: list[float]) -> dict:
    """A model's record across dates, with the uncertainty in plain sight.

    `t` is the mean over its own standard error. It is reported rather than a
    p-value because a p-value invites a verdict, and on eight dates there is
    no verdict to be had — a t of 1.9 over eight observations is a direction,
    not a discovery.
    """
    usable = [v for v in ics if v is not None]
    if not usable:
        return {"dates": 0, "mean": None, "median": None, "positive": 0, "t": None}
    mean = statistics.mean(usable)
    out = {
        "dates": len(usable),
        "mean": round(mean, 6),
        "median": round(statistics.median(usable), 6),
        "positive": sum(1 for v in usable if v > 0),
        "t": None,
    }
    if len(usable) >= 3:
        spread = statistics.stdev(usable)
        error = spread / math.sqrt(len(usable))
        out["sd"] = round(spread, 6)
        out["se"] = round(error, 6)
        out["t"] = round(mean / error, 4) if error else None
    return out


def against(model_ics: dict[str, float | None],
            rival_ics: dict[str, float | None]) -> dict:
    """One model against another on the dates BOTH scored.

    Paired, because the alternative is not a comparison. A month where
    everything mean-reverted lifts every model's IC at once; the difference
    on the same date with the same companies is what removes it.
    """
    shared = [(model_ics[d], rival_ics[d]) for d in model_ics
              if d in rival_ics and model_ics[d] is not None
              and rival_ics[d] is not None]
    if len(shared) < 3:
        return {"dates": len(shared), "mean_difference": None, "t": None, "ahead": 0}
    differences = [a - b for a, b in shared]
    mean = statistics.mean(differences)
    error = statistics.stdev(differences) / math.sqrt(len(differences))
    return {
        "dates": len(shared),
        "mean_difference": round(mean, 6),
        "t": round(mean / error, 4) if error else None,
        "ahead": sum(1 for d in differences if d > 0),
    }


def forward_return(bars: list[dict], basis: str, horizon: int) -> float | None:
    """What a company actually did, in percent, from the basis close.

    Counted in this company's OWN completed sessions. A share that did not
    trade has not had a session, and stepping forward by calendar days would
    mark the forecast against a close nobody paid.
    """
    usable = [b for b in bars if isinstance(b.get("close"), (int, float))]
    usable.sort(key=lambda b: b.get("date", ""))
    at = next((i for i, b in enumerate(usable) if b.get("date") == basis), None)
    if at is None or at + horizon >= len(usable):
        return None
    start = usable[at]["close"]
    if not start:
        return None
    return (usable[at + horizon]["close"] / start - 1) * 100
