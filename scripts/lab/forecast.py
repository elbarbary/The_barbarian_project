#!/usr/bin/env python3
"""What a model is asked, what it must answer, and the cheap answers.

THE CONTRACT
------------
Every registered model — a 12-billion-candle foundation model or three lines
of arithmetic — answers the same question in the same shape:

    given this company's completed bars up to a basis session,
    what return do you expect over 1, 5 and 20 further sessions?

`Forecast` is that answer. A model may also decline, and declining is a first
class result: `abstain()` records that the model was asked and could not
answer, with the reason. A model that silently skips the companies it finds
hard looks better than it is, and the coverage counts are what catch it.

WHY THE BASELINES ARE IN THE SAME FILE AS THE CONTRACT
-----------------------------------------------------
Because they are not optional and they are not lesser. Measured over eight
frozen forecast dates in late August 2026, on ~200 companies each:

    Kronos-small    mean rank IC  +0.050     6/8 dates positive
    reversal-1                    +0.022     6/8
    reversal-5                    +0.019     5/8
    momentum-20                   -0.056     2/8
    momentum-60                   -0.098     1/8

Kronos was ahead. It was also only +0.028 ahead of a one-session reversal,
which on eight observations is indistinguishable from nothing — and momentum
was reliably NEGATIVE, which is a sturdier finding than anything about the
foundation model. A number like +0.050 means nothing at all until the cheap
alternatives have been scored on the same dates, the same companies and the
same outcomes. So they ship together and they run together, every night.

SESSIONS, NOT DAYS
------------------
Every horizon is counted in completed exchange sessions. The exchange trades
Sunday to Thursday and closes for holidays, so "five days" and "five
sessions" are different questions and only one of them is answerable.
"""

from __future__ import annotations

import dataclasses
import statistics

# The horizons every model answers, in completed sessions.
#
# One is the tape. Five is a trading week here. Twenty is about a month and is
# the horizon the playbook's own cohorts run to. Adding a horizon is adding a
# question every model must answer and every evaluation must carry, so this
# list is short on purpose.
HORIZONS = (1, 5, 20)


@dataclasses.dataclass(frozen=True)
class Forecast:
    """One model's answer for one company at one basis session.

    `returns` is keyed by horizon and holds the expected return as a
    PERCENTAGE — +2.5 is two and a half per cent, matching every other
    percentage this project publishes.

    `ranked_by` is what the evaluation sorts on when a model does not claim
    to predict a magnitude. Momentum has no view on how far a share will move
    and pretending otherwise would put a meaningless number in a column that
    looks like all the others; it ranks, and says so.
    """

    ticker: str
    basis: str
    model: str
    returns: dict[int, float]
    ranked_by: dict[int, float] | None = None
    quantiles: dict[int, dict[str, float]] | None = None
    note: str = ""
    # Central daily closing-price path, NOT a probability interval. Retained
    # before sealing so window low/high/mean never need to be invented later.
    price_path: list[float] | None = None
    basis_close: float | None = None

    def rank_value(self, horizon: int) -> float | None:
        """What to sort this company by at this horizon."""
        if self.ranked_by and horizon in self.ranked_by:
            return self.ranked_by[horizon]
        return self.returns.get(horizon)


@dataclasses.dataclass(frozen=True)
class Abstention:
    """The model was asked and could not answer.

    Recorded rather than dropped. A model that quietly skips the companies it
    finds hard — the thin ones, the newly listed, the ones with a gap in
    their history — is scored only on the easy half of the market and looks
    better than it is. The coverage count is what makes that visible.
    """

    ticker: str
    basis: str
    model: str
    reason: str


def closes(bars: list[dict]) -> list[float]:
    return [b["close"] for b in bars if isinstance(b.get("close"), (int, float))]


def _change(series: list[float], span: int) -> float | None:
    if len(series) < span + 1 or not series[-(span + 1)]:
        return None
    return (series[-1] / series[-(span + 1)] - 1) * 100


# ── the baselines ───────────────────────────────────────────────────────────
#
# Each takes a company's completed bars and returns a Forecast or an
# Abstention. None of them is allowed to be sloppier than the models they
# judge: same horizons, same abstention rules, same units.


def flat(ticker: str, basis: str, bars: list[dict]) -> Forecast | Abstention:
    """Expect nothing to happen.

    The honest null. A share's best single guess for tomorrow is today, and a
    model that cannot beat this has told you nothing. It ranks every company
    identically, which makes its rank IC undefined rather than zero — and the
    evaluation says undefined rather than scoring it as a draw.
    """
    if not closes(bars):
        return Abstention(ticker, basis, "flat", "no usable close")
    return Forecast(ticker, basis, "flat", {h: 0.0 for h in HORIZONS},
                    ranked_by={h: 0.0 for h in HORIZONS},
                    price_path=[closes(bars)[-1]] * max(HORIZONS), basis_close=closes(bars)[-1])


def drift(ticker: str, basis: str, bars: list[dict], window: int = 60) -> Forecast | Abstention:
    """Carry this company's own average session return forward.

    A random walk WITH drift. Slightly less naive than flat and much harder
    to beat than it looks over short horizons, because most of what a share
    does over one session is its own mean plus noise.
    """
    series = closes(bars)
    if len(series) < window + 1:
        return Abstention(ticker, basis, "drift", f"{len(series)} closes, {window + 1} needed")
    steps = [series[i] / series[i - 1] - 1
             for i in range(len(series) - window, len(series)) if series[i - 1]]
    if not steps:
        return Abstention(ticker, basis, "drift", "no usable session returns")
    per_session = statistics.mean(steps)
    return Forecast(ticker, basis, "drift",
                    {h: ((1 + per_session) ** h - 1) * 100 for h in HORIZONS},
                    price_path=[series[-1] * (1 + per_session) ** h for h in range(1, max(HORIZONS) + 1)],
                    basis_close=series[-1])


def momentum(ticker: str, basis: str, bars: list[dict], look: int = 20) -> Forecast | Abstention:
    """What has risen keeps rising. Measured here: it does not.

    Over the eight scored dates momentum-20 averaged a rank IC of -0.056 and
    was on the wrong side on six of eight days; momentum-60 was worse. That
    is not a reason to drop it — a baseline that is reliably wrong is as
    informative as one that is reliably right, and both say the window was
    mean-reverting. It is a reason never to let it quietly become a default.

    Ranking only. Momentum has no view on how far a share will move, and a
    number in the returns column would be a magnitude nobody claimed.
    """
    series = closes(bars)
    if len(series) < look + 1:
        return Abstention(ticker, basis, f"momentum{look}",
                          f"{len(series)} closes, {look + 1} needed")
    value = _change(series, look)
    if value is None:
        return Abstention(ticker, basis, f"momentum{look}", "a close of zero")
    return Forecast(ticker, basis, f"momentum{look}",
                    {}, ranked_by={h: value for h in HORIZONS})


def reversal(ticker: str, basis: str, bars: list[dict], look: int = 1) -> Forecast | Abstention:
    """What has fallen comes back — momentum with its sign turned over.

    The one baseline that was actually competitive: reversal-1 averaged
    +0.022 at a session and +0.033 at five, positive on six of eight dates.
    If that holds up it is the more interesting finding of the two, because
    it costs one subtraction.
    """
    series = closes(bars)
    if len(series) < look + 1:
        return Abstention(ticker, basis, f"reversal{look}",
                          f"{len(series)} closes, {look + 1} needed")
    value = _change(series, look)
    if value is None:
        return Abstention(ticker, basis, f"reversal{look}", "a close of zero")
    return Forecast(ticker, basis, f"reversal{look}",
                    {}, ranked_by={h: -value for h in HORIZONS})


def mean_reversion(ticker: str, basis: str, bars: list[dict],
                   look: int = 90) -> Forecast | Abstention:
    """How far the last close sits BELOW the average of the window's closes.

    Registered as `reversal90`, and deliberately not `reversal(look=90)`. The
    reversal family is point to point — today's close against the close `look`
    sessions ago. This is today's close against the MEAN of the last ninety.
    Different statistics, and on this market they score differently: over the
    23 validation origins of the Kronos retraining, mean distance averaged a
    rank IC of +0.1124 at twenty sessions and was positive on 19 of 23, where
    point to point managed +0.1031 on 16 of 23.

    It is in the lab because of what the retraining found. Kronos-small's own
    twenty-session ranking correlates **+0.97** with this number — the
    foundation model was mostly computing it — and it does so less well:
    +0.1047 against this baseline's +0.1124 on validation, +0.0372 against
    +0.0382 over the retraining's held-out months. A model that cannot beat
    one subtraction at a horizon has not earned that column, and until this
    ran there was nothing in the lab that would say so: `reversal1` and
    `reversal5` look back one session and five, and both are near zero at
    twenty (+0.0112 and −0.0054 on those months).

    Its live record starts the night it is added. The sealed nights before
    that are not backfilled, even though the arithmetic is deterministic and
    the candles are already in them: this baseline was chosen for the lab
    AFTER its backtest was read, and a record that quietly includes dates
    picked with that knowledge is not a sealed record.
    """
    series = closes(bars)
    if len(series) < look:
        return Abstention(ticker, basis, f"reversal{look}",
                          f"{len(series)} closes, {look} needed")
    window = series[-look:]
    last = window[-1]
    if not last:
        return Abstention(ticker, basis, f"reversal{look}", "a close of zero")
    value = (statistics.fmean(window) / last - 1) * 100
    return Forecast(ticker, basis, f"reversal{look}",
                    {}, ranked_by={h: value for h in HORIZONS})


# Every baseline, by the name it is registered and scored under.
#
# The two momentum lookbacks and the two reversal lookbacks are separate
# models, not one model with a parameter. They disagree — momentum-60 is
# twice as wrong as momentum-20 — and averaging them would hide that.
BASELINES = {
    "flat": flat,
    "drift": drift,
    "momentum20": lambda t, b, x: momentum(t, b, x, 20),
    "momentum60": lambda t, b, x: momentum(t, b, x, 60),
    "reversal1": lambda t, b, x: reversal(t, b, x, 1),
    "reversal5": lambda t, b, x: reversal(t, b, x, 5),
    # NOT reversal(t, b, x, 90). Distance below the window's MEAN, which is a
    # different statistic from the point-to-point return the two above use,
    # and the one Kronos-small's twenty-session ranking turned out to be.
    "reversal90": lambda t, b, x: mean_reversion(t, b, x, 90),
}


def run_baseline(name: str, ticker: str, basis: str,
                 bars: list[dict]) -> Forecast | Abstention:
    maker = BASELINES.get(name)
    if maker is None:
        return Abstention(ticker, basis, name, "no such baseline")
    return maker(ticker, basis, bars)
