#!/usr/bin/env python3
"""What the lab shows a reader: the models' record, and what they say now.

TWO KINDS OF DOCUMENT, AND THEY ARE DIFFERENT IN KIND
-----------------------------------------------------
`research/top5.json` is a statement about MODELS. "Kronos's five
highest-ranked companies returned this much on average over the next five
sessions, against this much for the market" names no security, ranks no
company, and is the same category of claim as the rank-IC leaderboard beside
it: a track record of forecasters. It is public, like everything under
`research/`, because a record a stranger cannot fetch is not a record anybody
can check. Home's hero card is drawn from it signed-out and signed-in alike.

`lab/scenarios.json`, `lab/picks.json` and `lab/rerank/<reading>.json` are
statements about SECURITIES: every model's predicted return for every named
company, the five companies each model and each reading put highest night by
night with what those five then did, and every re-rank reading's score for
every named company. They are NOT under `research/`. The worker opens `research/` to anybody
and gates everything else under `/data/v1/` behind a session — and for one
evening in September this file wrote the per-company document into
`research/`, where it was served to anybody who asked. The path is the gate,
so the path is the fix, and `LegacyTest` keeps the old file from coming back.

WHY PUBLISHING THE FORECAST DOES NOT BREAK THE COMMITMENT
---------------------------------------------------------
The commitment was designed to keep forecasts secret until their horizons
matured. Publishing them the same night changes what it is FOR, not whether
it works: the Merkle root and its RFC 3161 timestamp still fix what was
sealed that night. The screen does not verify the root, and does not claim to.

THE TOP FIVE IS A BACKTEST AND SAYS SO
--------------------------------------
Every number in `top5.json` is computed from forecasts that were frozen
before the outcome existed — the same runs the leaderboard scores, with the
same withholding rule: a horizon whose answer already existed when the model
(or the reading) was written is not counted. A model with fewer than
`MINIMUM_SESSIONS` scored sessions is published with its count and without a
headline figure, because five companies over three nights is a coincidence
with a percentage on it.
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import re
import statistics
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import evaluate as ev
import forecast as fc
import panel as pricing
import rerank as rr
import score as sc

REPO = pathlib.Path(__file__).resolve().parent.parent.parent
RUNS = REPO / "data-source" / "lab"
RESEARCH = REPO / "public" / "data" / "v1" / "research"
TOP5 = RESEARCH / "top5.json"
# Behind the session gate: see the module docstring for why the path matters.
LAB = REPO / "public" / "data" / "v1" / "lab"
SCENARIOS = LAB / "scenarios.json"
PICKS = LAB / "picks.json"
READINGS = LAB / "rerank"
# Where the per-company document must never be written again.
LEGACY_SCENARIOS = RESEARCH / "scenarios.json"
WORKFLOW = REPO / ".github" / "workflows" / "lab-nightly.yml"

# How many of a model's own highest-ranked companies the backtest follows.
# Five because that is what a reader would look at, and stated everywhere it
# is used so the number is never mistaken for a discovered optimum.
TOP = 5

# Below this many scored sessions a model's row carries its count and no
# average. Stated in the file, so the screen reads it rather than guessing.
MINIMUM_SESSIONS = 5

# How far back the workbench draws what actually happened before the basis.
PATH_SESSIONS = 20

# How many nights of each model's five the workbench lists, newest first. The
# averages in `top5.json` still cover every night; this bounds the list of
# names, and the file says how many older nights it left out.
PICK_NIGHTS = 20

# The models a reader meets on Home, in the order the record keeps them. The
# screen may sort by the record; the file does not.
ORDER = ["rerank", "kronos", "chronos2", "timesfm25",
         "momentum20", "momentum60", "reversal1", "reversal5", "drift", "flat"]

LABELS = {
    "kronos": ("Kronos-small", "Kronos-small", "neural"),
    "chronos2": ("Chronos-2", "Chronos-2", "neural"),
    "timesfm25": ("TimesFM 2.5", "TimesFM 2.5", "neural"),
    "rerank": ("Gemini re-rank", "إعادة ترتيب Gemini", "rerank"),
    "momentum20": ("Momentum, 20 sessions", "الزخم، 20 جلسة", "baseline"),
    "momentum60": ("Momentum, 60 sessions", "الزخم، 60 جلسة", "baseline"),
    "reversal1": ("Reversal, 1 session", "الانعكاس، جلسة", "baseline"),
    "reversal5": ("Reversal, 5 sessions", "الانعكاس، 5 جلسات", "baseline"),
    "drift": ("Drift", "الانجراف", "baseline"),
    "flat": ("Flat, says nothing", "ثابت، لا يقول شيئًا", "baseline"),
}

# The forecasters whose middle estimate stands for "what the models think" when
# a reading is compared with them. Only models that publish a return: a
# momentum score is an ordering, and a median of orderings and percentages is
# a number that means nothing.
CONSENSUS = ("kronos", "chronos2", "timesfm25", "drift")


def label(name: str) -> tuple[str, str, str]:
    return LABELS.get(name, (name, name, "rerank" if rr.is_reading(name) else "baseline"))


def ranked(block: dict, horizon: int, panel: dict | None = None,
           basis: str | None = None) -> list[tuple[float, str]]:
    """(what the model said, ticker) for every company it answered, best first.

    Ties broken by ticker so the same run always picks the same five. Without
    that the backtest is a fact about dictionary order.
    """
    out = []
    for record in block.get("forecasts") or []:
        ticker = record.get("ticker")
        value = ev.predicted(record, horizon)
        # Only a company with an exchange ticker and, where the prices are to
        # hand, one readable run of closes to the basis: `evaluate.readable`.
        if value is None or not ev.lab.listed(ticker):
            continue
        if panel is not None and basis and not ev.readable(panel, ticker, basis):
            continue
        out.append((value, ticker))
    out.sort(key=lambda r: (-r[0], r[1]))
    return out


def followed(block: dict, basis: str, horizon: int, panel: dict,
             n: int = TOP) -> tuple[list, dict, list] | None:
    """(its order, what every company did, the `n` it is scored on).

    The `n` are its highest-ranked companies that actually traded to the
    horizon: a share with no close that many sessions later has no return, so
    the next one down takes its place. The record and the workbench's list of
    names both come from here, so they cannot follow different companies.
    """
    order = ranked(block, horizon, panel, basis)
    if len(order) < n:
        return None

    realised = {}
    for _, ticker in order:
        got = sc.forward_return(ev.bars_of(panel, ticker), basis, horizon)
        if got is not None:
            realised[ticker] = got
    if len(realised) < sc.MIN_COMPANIES:
        return None

    chosen = [t for _, t in order if t in realised][:n]
    if len(chosen) < n:
        return None
    return order, realised, chosen


def top_slice(block: dict, basis: str, horizon: int, panel: dict,
              n: int = TOP) -> dict | None:
    """What this model's `n` highest-ranked companies actually did.

    Beside what everything it scored did, because the difference is the only
    part that means anything: a month when the whole market rose four per cent
    is not a month in which picking five names was clever.
    """
    got = followed(block, basis, horizon, panel, n)
    if got is None:
        return None
    _, realised, chosen = got
    return outcome(realised, chosen, n)


def outcome(realised: dict[str, float], chosen: list[str], n: int = TOP) -> dict:
    """The five's mean beside the mean of everything scored — one arithmetic
    for the public record and for the gated list of names."""
    theirs = statistics.mean(realised[t] for t in chosen)
    market = statistics.mean(realised.values())
    return {
        "followed": n,
        "scored": len(realised),
        "chosenReturn": round(theirs, 4),
        "marketReturn": round(market, 4),
        "advantage": round(theirs - market, 4),
        "beatTheMarket": theirs > market,
    }


def backtest(nights: list[dict], panel: dict, sessions: list[str],
             names: list[str] | None = None) -> dict:
    """Every model's top five, every night, every horizon."""
    table: dict = {}
    for name in names or ORDER:
        per_horizon = {}
        nights_run = 0
        told_apart = False
        for night in nights:
            block = (night["document"].get("models") or {}).get(name)
            if block and block.get("answered"):
                nights_run += 1
                told_apart = told_apart or distinguishes(block)
        for horizon in fc.HORIZONS:
            rows = []
            for night in nights:
                block = (night["document"].get("models") or {}).get(name)
                if not block:
                    continue
                basis = night["basis"]
                # The same rule the leaderboard uses: a horizon whose answer
                # already existed when the forecast was written is not
                # evidence. A reading folded in from a second pass is judged
                # by when IT was written.
                written = block.get("ranAt") or night["document"].get("ranAt")
                if ev.outcome_already_known(sessions, basis, horizon, written):
                    continue
                got = top_slice(block, basis, horizon, panel)
                if got:
                    rows.append({"basisSession": basis, **got})
            per_horizon[str(horizon)] = summarise(rows)
        english, arabic, group = label(name)
        table[name] = {"label": english, "labelAr": arabic, "group": group,
                       "nights": nights_run,
                       # A model that ranks every company alike has no five of
                       # its own: its "top five" is whichever tickers sort first.
                       # Said in the file so the screen can leave it out of a
                       # list of choices rather than show a record of nothing.
                       "distinguishes": told_apart,
                       "horizons": per_horizon}
    return table


def distinguishes(block: dict) -> bool:
    """Whether a model's answers tell any two companies apart."""
    seen = set()
    for record in block.get("forecasts") or []:
        for horizon in fc.HORIZONS:
            value = ev.predicted(record, horizon)
            if value is not None:
                seen.add(value)
                if len(seen) > 1:
                    return True
    return False


def summarise(rows: list[dict]) -> dict:
    """The average of a handful of sessions, with the handful said out loud."""
    if not rows:
        return {"sessions": 0, "meanReturn": None, "meanMarket": None,
                "meanAdvantage": None, "ahead": 0, "byDate": []}
    advantages = [r["advantage"] for r in rows]
    out = {
        "sessions": len(rows),
        "meanReturn": round(statistics.mean(r["chosenReturn"] for r in rows), 4),
        "meanMarket": round(statistics.mean(r["marketReturn"] for r in rows), 4),
        "meanAdvantage": round(statistics.mean(advantages), 4),
        "ahead": sum(1 for a in advantages if a > 0),
        # How often the sign of the advantage changed from one scored session
        # to the next — the screen's "this has flipped" is this number, not a
        # sentence somebody wrote once.
        "signChanges": sum(1 for a, b in zip(advantages, advantages[1:])
                           if (a > 0) != (b > 0)),
        "byDate": rows,
    }
    if len(advantages) >= 3:
        spread = statistics.stdev(advantages)
        error = spread / (len(advantages) ** 0.5)
        out["sd"] = round(spread, 4)
        out["t"] = round(out["meanAdvantage"] / error, 3) if error else None
    return out


# ── each night's five, by name (behind the gate) ─────────────────────────────

def says(name: str) -> dict:
    """What a model's number is, so the screen can put it in words.

    A forecaster's number is a return it expects. A momentum or reversal
    baseline's is a change that has ALREADY happened, which it ranks by —
    reversal with the sign turned over. A reading's is a score out of 100.
    Printing all three as "expects +4%" would put a forecast in the mouth of a
    subtraction.
    """
    if rr.is_reading(name):
        return {"kind": "score", "outOf": 100}
    match = re.fullmatch(r"(momentum|reversal)(\d+)", name)
    if match:
        return {"kind": match.group(1), "sessions": int(match.group(2))}
    return {"kind": "return"}


def tied(order: list[tuple[float, str]], n: int = TOP) -> int:
    """How many companies below the fifth share the fifth's number.

    The record breaks that tie by ticker. A reader told "these five" should
    also be told when fifth place was a draw the alphabet settled.
    """
    if len(order) <= n:
        return 0
    edge = order[n - 1][0]
    return sum(1 for value, _ in order[n:] if value == edge)


def night_of(block: dict, document: dict, horizon: int, panel: dict,
             sessions: list[str], n: int = TOP) -> dict | None:
    """One model's five on one night at one horizon, and where they stand.

      waiting     the horizon has not closed: the five are named, and nobody
                  knows yet how they do;
      scored      it has closed: the five the record averaged, each with what
                  it returned, beside every company the model scored;
      withheld    its answer existed when the forecast was written, so it is
                  not evidence, and its names are not listed as if it were;
      unscorable  it closed, but too few companies traded to score it.

    None when the model ranked fewer than `n` companies at this horizon, or
    ranked every company alike — its "five" would be the alphabet's.
    """
    basis = document["basisSession"]
    order = ranked(block, horizon, panel, basis)
    if len(order) < n or not distinguishes(block):
        return None
    after = sum(1 for d in sessions if d > basis)
    night: dict = {"basisSession": basis, "sessionsClosed": min(after, horizon)}
    if document.get("reconstructed"):
        night["reconstructed"] = True
    written = block.get("ranAt") or document.get("ranAt")
    if ev.outcome_already_known(sessions, basis, horizon, written):
        night["status"] = "withheld"
        return night

    said = {ticker: value for value, ticker in order}
    got = followed(block, basis, horizon, panel, n) if after >= horizon else None
    if got is None:
        night["status"] = "waiting" if after < horizon else "unscorable"
        night["picks"] = [{"ticker": t, "said": round(v, 4)} for v, t in order[:n]]
        night["tied"] = tied(order, n)
        return night

    _, realised, chosen = got
    tickers = [t for _, t in order]
    last = tickers.index(chosen[-1])
    night.update(outcome(realised, chosen, n))
    night["status"] = "scored"
    night["picks"] = [{"ticker": t, "said": round(said[t], 4),
                       "returned": round(realised[t], 4)} for t in chosen]
    # Ranked above the last of the five but never closed again inside the
    # horizon: named, so the night's five and the five scored reconcile.
    night["skipped"] = [t for t in tickers[:last] if t not in realised]
    night["tied"] = tied([(v, t) for v, t in order if t in realised], n)
    return night


def picks(nights: list[dict], panel: dict, sessions: list[str],
          names: list[str]) -> dict:
    """Every named model's five, night by night, newest first."""
    table: dict = {}
    for name in names:
        horizons = {}
        for horizon in fc.HORIZONS:
            listed = []
            for night in reversed(nights):
                block = (night["document"].get("models") or {}).get(name)
                one = block and night_of(block, night["document"], horizon, panel, sessions)
                if one:
                    listed.append(one)
            horizons[str(horizon)] = {"nights": listed[:PICK_NIGHTS],
                                      "older": max(0, len(listed) - PICK_NIGHTS)}
        if not any(h["nights"] for h in horizons.values()):
            continue
        english, arabic, group = label(name)
        entry = {"label": english, "labelAr": arabic, "group": group,
                 "says": says(name), "horizons": horizons}
        if rr.is_reading(name):
            # What the reading said about its own night — how many were worth
            # anything and why — once per night rather than once per horizon.
            entry["layers"] = list(rr.layers_of(name))
            entry["default"] = name == rr.NAME
            entry["notes"] = {}
            for night in nights:
                block = (night["document"].get("models") or {}).get(name)
                if block and block.get("answered"):
                    entry["notes"][night["basis"]] = {"count": block.get("count"),
                                                      "note": block.get("note")}
        table[name] = entry
    return table


# ── what the models say now (behind the gate) ────────────────────────────────

def path_of(panel: dict, ticker: str, dates: list[str]) -> list[float | None]:
    """What the company actually did over the sessions before the basis, as a
    percentage of the basis close. None where it did not trade."""
    held = panel.get(ticker) or {}
    basis = held.get(dates[-1]) if dates else None
    start = basis.get("close") if basis else None
    if not isinstance(start, (int, float)) or not start:
        return [None] * len(dates)
    out = []
    for date in dates:
        bar = held.get(date)
        close = bar.get("close") if bar else None
        out.append(round((close / start - 1) * 100, 2)
                   if isinstance(close, (int, float)) else None)
    return out


def scenarios(document: dict, panel: dict, sessions: list[str]) -> dict:
    """Every forecaster's number for every company, for the night just sealed.

    The re-rank's readings are not here: each has its own file, fetched when a
    reader asks for that combination of evidence.
    """
    basis = document["basisSession"]
    dates = [d for d in sessions if d <= basis][-(PATH_SESSIONS + 1):]
    companies: dict = {}
    left: dict = {}
    for name in ORDER:
        if rr.is_reading(name):
            continue
        block = (document.get("models") or {}).get(name)
        if not block:
            continue
        for record in block.get("forecasts") or []:
            ticker = record.get("ticker")
            if not ev.readable(panel, ticker, basis):
                # Named with the reason, so the screen can say how many were
                # left out and a reader can ask why.
                if ticker and ticker not in left:
                    left[ticker] = ("no exchange ticker" if not ev.lab.listed(ticker)
                                    else ev.lab.unreadable(
                                        [b for b in ev.bars_of(panel, ticker) if b["date"] <= basis]))
                continue
            row = companies.setdefault(ticker, {"ticker": ticker, "models": {}})
            returns = {h: record["returns"].get(str(h))
                       for h in fc.HORIZONS if record.get("returns", {}).get(str(h)) is not None}
            entry = {"returns": {str(k): round(v, 4) for k, v in returns.items()}}
            ranked_by = record.get("ranked_by") or {}
            if ranked_by:
                entry["rankedBy"] = {k: round(v, 4) for k, v in ranked_by.items()}
            row["models"][name] = entry

    # The close every percentage is measured from, and what the company did
    # before it. Without the first a reader has a number and no idea what it
    # is a number of; without the second the chart has no "before".
    for ticker, row in companies.items():
        bars = ev.bars_of(panel, ticker)
        at = next((b for b in reversed(bars) if b.get("date") == basis), None)
        if at and isinstance(at.get("close"), (int, float)):
            row["close"] = round(at["close"], 4)
        if dates and dates[-1] == basis:
            row["path"] = path_of(panel, ticker, dates)

    return {"dates": dates if dates and dates[-1] == basis else [],
            "companies": {k: companies[k] for k in sorted(companies)},
            "leftOut": dict(sorted(left.items()))}


def positions(scores: dict[str, float]) -> dict[str, int]:
    """Where each company sits in a reading's order, 1 first, ties by ticker."""
    order = sorted(scores, key=lambda t: (-scores[t], t))
    return {ticker: i + 1 for i, ticker in enumerate(order)}


def consensus(document: dict, horizon: int = 5, panel: dict | None = None) -> dict[str, float]:
    """The middle of the return forecasters' estimates, company by company."""
    values: dict[str, list[float]] = {}
    for name in CONSENSUS:
        for record in ((document.get("models") or {}).get(name) or {}).get("forecasts") or []:
            got = (record.get("returns") or {}).get(str(horizon))
            if (isinstance(got, (int, float)) and ev.lab.listed(record.get("ticker"))
                    and (panel is None or ev.readable(panel, record["ticker"], document["basisSession"]))):
                values.setdefault(record["ticker"], []).append(float(got))
    return {t: statistics.median(v) for t, v in values.items() if v}


def scores_of(block: dict, panel: dict | None = None, basis: str | None = None) -> dict[str, float]:
    out = {}
    for record in block.get("forecasts") or []:
        value = ev.predicted(record, 5)
        if value is None or not ev.lab.listed(record.get("ticker")):
            continue
        if panel is not None and basis and not ev.readable(panel, record["ticker"], basis):
            continue
        out[record["ticker"]] = value
    return out


def standing(scores: dict[str, float]) -> dict[str, float]:
    """Where each company stands, 1 first, a tie sharing its average place.

    For movement. A reading that gives most of the market the same bottom
    score has not ordered those companies, and breaking the tie by ticker
    would count the alphabet as the evidence moving them.
    """
    order = sorted(scores, key=lambda t: -scores[t])
    out: dict[str, float] = {}
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and scores[order[j + 1]] == scores[order[i]]:
            j += 1
        for k in range(i, j + 1):
            out[order[k]] = (i + j) / 2 + 1
        i = j + 1
    return out


def agreement(scores: dict[str, float], other: dict[str, float],
              count: int | None, other_count: int | None) -> dict:
    """How far one reading's order is from another's, in three plain numbers."""
    shared = sorted(set(scores) & set(other))
    rho = sc.rank_ic([(scores[t], other[t]) for t in shared])
    here = standing({t: scores[t] for t in shared})
    there = standing({t: other[t] for t in shared})
    moved = sum(1 for t in shared if abs(here[t] - there[t]) > 20)
    # The kept set is taken the way the evaluation takes it: highest first,
    # ties by ticker.
    mine, theirs = positions({t: scores[t] for t in shared}), positions({t: other[t] for t in shared})
    kept = None
    if isinstance(count, int) and isinstance(other_count, int):
        a = {t for t in shared if mine[t] <= count}
        b = {t for t in shared if theirs[t] <= other_count}
        kept = len(a ^ b)
    return {"rho": rho, "movedOverTwenty": moved, "keptChanged": kept,
            "compared": len(shared)}


def reading_documents(document: dict, built: str, panel: dict | None = None) -> dict[str, dict]:
    """One gated file per reading: its scores, and how its order compares."""
    models = document.get("models") or {}
    basis = document.get("basisSession")
    plain = models.get(rr.name_of(())) or {}
    plain_scores = scores_of(plain, panel, basis)
    middle = consensus(document, panel=panel)
    out = {}
    for layers in rr.readings():
        name = rr.name_of(layers)
        block = models.get(name)
        if not block:
            continue
        scores = scores_of(block, panel, basis)
        against_forecasters = sc.rank_ic([(scores[t], middle[t])
                                          for t in sorted(set(scores) & set(middle))])
        compared = (agreement(scores, plain_scores, block.get("count"), plain.get("count"))
                    if layers and plain_scores and scores else None)
        out[rr.key_of(layers)] = {
            "schemaVersion": 1,
            "builtAt": built,
            "basisSession": document["basisSession"],
            "ranAt": block.get("ranAt"),
            "key": rr.key_of(layers),
            "name": name,
            "layers": list(layers),
            "default": name == rr.NAME,
            "asked": bool(block.get("asked")),
            "answered": block.get("answered", 0),
            "abstained": block.get("abstained", 0),
            "abstentions": block.get("abstentions") or {},
            "count": block.get("count"),
            "note": block.get("note"),
            "invented": block.get("invented") or [],
            "seconds": block.get("seconds"),
            "scores": {t: scores[t] for t in sorted(scores)},
            "agreement": {
                "withForecasters": against_forecasters,
                "withModelsOnly": compared,
            },
            "warning": "A language model's scores for named companies, published "
                       "as an experiment. Only the order is meaningful, the count "
                       "is its own answer to how many are worth anything tonight, "
                       "and none of it is advice.",
        }
    return out


def latest_night(nights: list[dict]) -> dict | None:
    """The newest night that was frozen on the night — never a reconstruction.
    A screen saying "this is what the models say now" may only show one."""
    for night in reversed(nights):
        if not night["document"].get("reconstructed"):
            return night["document"]
    return None


def commitment_for(stem: str) -> dict | None:
    path = RESEARCH / "commitments" / f"{stem}.json"
    try:
        held = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    stamp = held.get("timestamp") or {}
    return {"merkleRoot": held.get("merkleRoot"), "leaves": held.get("leaves"),
            "timestamped": bool(stamp.get("timestamped")),
            "authority": stamp.get("authority"),
            "committedBeforeOpen": held.get("committedBeforeOpen")}


def schedule(workflow: pathlib.Path = WORKFLOW) -> list[str]:
    """The lab's own cron lines, read from the workflow rather than restated.

    A screen that says when the next reading is due is quoting this file; a
    copy of the times kept anywhere else would be right until the day the
    schedule moved.
    """
    try:
        text = workflow.read_text(encoding="utf-8")
    except OSError:
        return []
    return re.findall(r"^\s*-\s*cron:\s*['\"]([^'\"]+)['\"]", text, re.M)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scans", nargs="*", type=pathlib.Path)
    parser.add_argument("--runs", type=pathlib.Path, default=RUNS)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--no-today", action="store_true",
                        help="do not ask the exchange for the newest session")
    args = parser.parse_args(argv)

    scans = [p for p in args.scans if p.is_file()]
    if not scans:
        raise SystemExit("publish: no scan given — there are no realised bars")
    # The session that has just finished, from the exchange. The vendor's scan
    # does not carry it for hours, and without it the workbench has no close
    # to measure tonight's percentages from and no "today" to draw to. Best
    # effort, and for drawing only: `closed_bars` is never handed to a model.
    today = {}
    if not args.no_today:
        try:
            watch, status = pricing.fetch_today()
            when, today = pricing.closed_bars(watch, status)
            print(f"   the exchange's newest finished session: {when or 'none'}"
                  + (f", {len(today)} companies" if today else ""))
        except Exception as error:  # noqa: BLE001 — any refusal, same answer
            print(f"   the exchange did not answer ({type(error).__name__})")
    panel = ev.bar_panel(scans, today=today)
    sessions = ev.calendar(panel)
    if not sessions:
        raise SystemExit("publish: the scans hold no session a majority shares")

    nights = [{"basis": document["basisSession"], "document": document}
              for _, document in ev.documents(args.runs)]
    if not nights:
        raise SystemExit(f"publish: no runs under {args.runs}")

    built = (datetime.datetime.now(datetime.timezone.utc)
             .isoformat(timespec="seconds").replace("+00:00", "Z"))

    table = backtest(nights, panel, sessions)
    for name in ORDER:
        one = table[name]["horizons"]["5"]
        if one["sessions"]:
            print(f"   {name:<12} top {TOP} over 5 sessions: "
                  f"{one['meanReturn']:+.2f}% vs market {one['meanMarket']:+.2f}% "
                  f"({one['meanAdvantage']:+.2f}, ahead on {one['ahead']}/{one['sessions']})")
        else:
            print(f"   {name:<12} not yet scorable")

    # Every reading's record, beside the default one Home reports. Keyed by
    # the evidence it read, so the workbench can say what reading the filings
    # has done for the re-rank once there is a record to say it with.
    reading_names = [rr.name_of(layers) for layers in rr.readings()]
    reading_table = backtest(nights, panel, sessions, reading_names)
    readings_record = {rr.key_of(rr.layers_of(name)): dict(reading_table[name],
                                                           layers=list(rr.layers_of(name)))
                       for name in reading_names}

    latest = latest_night(nights)
    latest_models = (latest or {}).get("models") or {}
    top5 = {
        "schemaVersion": 1, "builtAt": built, "topCount": TOP,
        "minimumSessions": MINIMUM_SESSIONS,
        "horizons": list(fc.HORIZONS),
        "dates": [n["basis"] for n in nights],
        "latest": None if not latest else {
            "basisSession": latest["basisSession"],
            "ranAt": latest.get("ranAt"),
            "universeSize": latest.get("universeSize"),
            "forecasters": sum(1 for m, b in latest_models.items()
                               if not rr.is_reading(m) and b.get("answered")),
            "readings": sum(1 for m, b in latest_models.items()
                            if rr.is_reading(m) and b.get("answered")),
            "rerankedAt": (latest_models.get(rr.NAME) or {}).get("ranAt"),
            # What the re-rank Home reports reads, so the sentence describing
            # it is built from the record rather than written beside it.
            "rerankReads": list(rr.DEFAULT),
        },
        "what": f"For each model, the {TOP} companies it ranked highest on a "
                "session, and what those returned against what everything it "
                "scored returned. Every forecast was frozen before the outcome "
                "existed. A horizon whose answer already existed when the "
                "forecast was written is not counted.",
        "reading": f"{TOP} companies over a handful of sessions is a very small "
                   "sample. `sessions` is how many nights are behind each "
                   "average and `ahead` how many of them the model's five beat "
                   "the market on; both are the size of the evidence and the "
                   f"average means nothing without them. Below {MINIMUM_SESSIONS} "
                   "sessions the screen shows the count and not the average.",
        "benchmark": "The market figure is the equal-weighted return of every "
                     "company the model scored that session — not an index.",
        "notAdvice": "A record of forecasting models. It names no security and "
                     "recommends nothing.",
        "models": table,
        "readings": readings_record,
    }
    ev._no_companies(top5, {t for n in nights for t in (n["document"].get("universe") or [])})
    print("   top5 names none of the securities in the universe")

    # The same fives by name, behind the gate: what each model put highest
    # tonight, and what its earlier fives went on to do.
    reading_picks = picks(nights, panel, sessions, reading_names)
    named = {
        "schemaVersion": 1, "builtAt": built, "topCount": TOP,
        "minimumSessions": MINIMUM_SESSIONS,
        "horizons": list(fc.HORIZONS),
        "latestSession": sessions[-1],
        "what": f"Night by night, newest first, the {TOP} companies each model "
                "and each re-rank reading put highest, and — once the horizon "
                "has closed — what each of them returned beside every company "
                "the model scored. The same fives research/top5.json averages.",
        "warning": "Model output about named companies, published as an "
                   "experiment whether it turns out right or wrong. Not advice.",
        "models": picks(nights, panel, sessions, [n for n in ORDER if not rr.is_reading(n)]),
        "readings": {rr.key_of(rr.layers_of(name)): entry
                     for name, entry in reading_picks.items()},
    }
    print(f"   picks: {len(named['models'])} models and {len(named['readings'])} "
          f"readings, newest session {named['latestSession']}")

    scenes, reading_files = None, {}
    if latest:
        drawn = scenarios(latest, panel, sessions)
        reading_files = reading_documents(latest, built, panel)
        default = reading_files.get(rr.key_of(rr.DEFAULT))
        scenes = {
            "schemaVersion": 2, "builtAt": built,
            "basisSession": latest["basisSession"], "ranAt": latest.get("ranAt"),
            "horizons": list(fc.HORIZONS),
            "schedule": {"cron": schedule(), "timezone": "UTC"},
            "commitment": commitment_for(latest["basisSession"]),
            "models": {n: {"label": label(n)[0], "labelAr": label(n)[1],
                           "group": label(n)[2],
                           "returns": any((f.get("returns") or {})
                                          for f in latest_models[n].get("forecasts") or []),
                           "distinguishes": distinguishes(latest_models[n]),
                           "answered": latest_models[n].get("answered", 0)}
                       for n in ORDER if n in latest_models and not rr.is_reading(n)},
            "dates": drawn["dates"],
            # Companies the models answered that night but no reader should
            # rank: no exchange ticker, or recent closes that are not one
            # series. `run.listed`, `run.unreadable`.
            "leftOut": drawn["leftOut"],
            "rerank": None if not reading_files else {
                "ranAt": (default or next(iter(reading_files.values())))["ranAt"],
                "layers": list(rr.LAYERS),
                "default": list(rr.DEFAULT),
                "evidence": ((latest.get("layers") or {}).get(rr.NAME) or {}).get("evidence"),
                "commitment": commitment_for(f"{latest['basisSession']}.{rr.NAME}"),
                "readings": {key: {"name": doc["name"], "layers": doc["layers"],
                                   "default": doc["default"], "asked": doc["asked"],
                                   "answered": doc["answered"], "count": doc["count"],
                                   "reason": (next(iter(doc["abstentions"]), None)
                                              if not doc["answered"] else None)}
                             for key, doc in reading_files.items()},
            },
            "what": "What each model predicted for each company from the close "
                    "of this session, as a percentage of that close, and what the "
                    "company did in the sessions before it.",
            "warning": "These are model outputs, not forecasts this publisher "
                       "endorses, and not advice. The models have been running "
                       "for weeks, not years, and their record is published "
                       "beside them precisely because it is too short to rely on.",
            "companies": drawn["companies"],
        }
        print(f"   scenarios: {len(drawn['companies'])} companies × "
              f"{len(scenes['models'])} models, basis {scenes['basisSession']}, "
              f"{len(reading_files)} re-rank readings")

    if args.check:
        return 0

    RESEARCH.mkdir(parents=True, exist_ok=True)
    if ev.write_unless_unchanged(TOP5, top5, indent=1):
        print(f"   wrote {TOP5.relative_to(REPO)}")
    else:
        print(f"   {TOP5.name} unchanged")

    if LEGACY_SCENARIOS.exists():
        # It named securities from a folder served to anybody. Gone, not moved
        # beside the new one: the new one is written below, behind the gate.
        LEGACY_SCENARIOS.unlink()
        print(f"   removed {LEGACY_SCENARIOS.relative_to(REPO)} — it is not public")

    if scenes and ev.write_unless_unchanged(SCENARIOS, scenes):
        print(f"   wrote {SCENARIOS.relative_to(REPO)} "
              f"({SCENARIOS.stat().st_size // 1024} KB)")
    elif scenes:
        print(f"   {SCENARIOS.name} unchanged")

    if ev.write_unless_unchanged(PICKS, named):
        print(f"   wrote {PICKS.relative_to(REPO)} ({PICKS.stat().st_size // 1024} KB)")
    else:
        print(f"   {PICKS.name} unchanged")

    written = 0
    if reading_files:
        READINGS.mkdir(parents=True, exist_ok=True)
        written = sum(1 for key, doc in reading_files.items()
                      if ev.write_unless_unchanged(READINGS / f"{key}.json", doc))
    # A reading file from an older night that tonight has no reading for would
    # be read as tonight's. Removed rather than left to be believed — including
    # every one of them on a night the re-rank did not answer at all.
    if READINGS.exists():
        for stale in READINGS.glob("*.json"):
            if stale.stem not in reading_files:
                stale.unlink()
    if reading_files:
        print(f"   wrote {written} of {len(reading_files)} re-rank readings "
              f"under {READINGS.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
