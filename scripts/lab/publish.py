#!/usr/bin/env python3
"""What the lab shows a reader: the models' record, and what they say now.

TWO DOCUMENTS, AND THEY ARE DIFFERENT IN KIND
---------------------------------------------
`top5.json` is a statement about MODELS. "Kronos's five highest-ranked
companies returned this much on average over the next five sessions, against
this much for the market" names no security, ranks no company, and is the
same category of claim as the rank-IC leaderboard beside it: a track record
of forecasters.

`scenarios.json` is a statement about SECURITIES. It is every model's
predicted return for every named company at every horizon, published the
night it is made. That is a different thing to put on a screen and this file
does not pretend otherwise — it is why the reader-facing side of it sits
behind an acknowledgement, is labelled as an experiment, and is published
beside the model's own track record so nobody reads a number without seeing
how often that model has been right.

WHY PUBLISHING THE FORECAST DOES NOT BREAK THE COMMITMENT
---------------------------------------------------------
The commitment was designed to keep forecasts secret until their horizons
matured. Publishing them the same night changes what it is FOR, not whether
it works: the Merkle root and its RFC 3161 timestamp still prove that what
is on the screen tonight is exactly what was sealed tonight, and that it was
not edited afterwards. If anything the proof is stronger for being checkable
immediately — a reader can verify tonight's published forecast against
tonight's sealed root rather than waiting a month to find out.

So `scenarios.json` carries the root it belongs to, and `verify.py` can be
pointed at the pair.

THE TOP FIVE IS A BACKTEST AND SAYS SO
--------------------------------------
Every number in `top5.json` is computed from forecasts that were frozen
before the outcome existed — the same runs the leaderboard scores, with the
same withholding rule: a horizon whose answer already existed when the run
was written is not counted. It is a small sample said out loud on every row,
because five companies over eight sessions is forty observations and the
temptation to read a percentage as a promise is the whole risk here.
"""

from __future__ import annotations

import argparse
import datetime
import glob
import json
import pathlib
import statistics
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import evaluate as ev
import forecast as fc
import panel as pricing
import score as sc

REPO = pathlib.Path(__file__).resolve().parent.parent.parent
RUNS = REPO / "data-source" / "lab"
RESEARCH = REPO / "public" / "data" / "v1" / "research"
TOP5 = RESEARCH / "top5.json"
SCENARIOS = RESEARCH / "scenarios.json"

# How many of a model's own highest-ranked companies the backtest follows.
# Five because that is what a reader would look at, and stated everywhere it
# is used so the number is never mistaken for a discovered optimum.
TOP = 5

# The order the screen shows them in. Fixed, and never by score: the point of
# the table is that the record is on display beside its uncertainty, not that
# one row sits on top.
ORDER = ["kronos", "chronos2", "timesfm25", "rerank",
         "momentum20", "momentum60", "reversal1", "reversal5", "drift", "flat"]

LABELS = {
    "kronos": ("Kronos-small", "Kronos-small", "neural"),
    "chronos2": ("Chronos-2", "Chronos-2", "neural"),
    "timesfm25": ("TimesFM 2.5", "TimesFM 2.5", "neural"),
    "rerank": ("Gemini, reading the other nine", "Gemini يقرأ التسعة الآخرين", "rerank"),
    "momentum20": ("Momentum, 20 sessions", "الزخم، 20 جلسة", "baseline"),
    "momentum60": ("Momentum, 60 sessions", "الزخم، 60 جلسة", "baseline"),
    "reversal1": ("Reversal, 1 session", "الانعكاس، جلسة", "baseline"),
    "reversal5": ("Reversal, 5 sessions", "الانعكاس، 5 جلسات", "baseline"),
    "drift": ("Drift", "الانجراف", "baseline"),
    "flat": ("Flat, says nothing", "ثابت، لا يقول شيئًا", "baseline"),
}


def ranked(block: dict, horizon: int) -> list[tuple[float, str]]:
    """(what the model said, ticker) for every company it answered, best first.

    Ties broken by ticker so the same run always picks the same five. Without
    that the backtest is a fact about dictionary order.
    """
    out = []
    for record in block.get("forecasts") or []:
        ticker = record.get("ticker")
        value = ev.predicted(record, horizon)
        if ticker and value is not None:
            out.append((value, ticker))
    out.sort(key=lambda r: (-r[0], r[1]))
    return out


def top_slice(block: dict, basis: str, horizon: int, panel: dict,
              n: int = TOP) -> dict | None:
    """What this model's `n` highest-ranked companies actually did.

    Beside what everything it scored did, because the difference is the only
    part that means anything: a month when the whole market rose four per cent
    is not a month in which picking five names was clever.
    """
    order = ranked(block, horizon)
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


def backtest(nights: list[dict], panel: dict, sessions: list[str]) -> dict:
    """Every model's top five, every night, every horizon."""
    table: dict = {}
    for name in ORDER:
        per_horizon = {}
        for horizon in fc.HORIZONS:
            rows = []
            for night in nights:
                block = (night["document"].get("models") or {}).get(name)
                if not block:
                    continue
                basis = night["basis"]
                # The same rule the leaderboard uses: a horizon whose answer
                # already existed when the run was written is not evidence,
                # and is not counted here either.
                if ev.outcome_already_known(sessions, basis, horizon,
                                            night["document"].get("ranAt")):
                    continue
                got = top_slice(block, basis, horizon, panel)
                if got:
                    rows.append({"basisSession": basis, **got})
            per_horizon[str(horizon)] = summarise(rows)
        english, arabic, group = LABELS.get(name, (name, name, "baseline"))
        table[name] = {"label": english, "labelAr": arabic, "group": group,
                       "horizons": per_horizon}
    return table


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
        "byDate": rows,
    }
    if len(advantages) >= 3:
        spread = statistics.stdev(advantages)
        error = spread / (len(advantages) ** 0.5)
        out["sd"] = round(spread, 4)
        out["t"] = round(out["meanAdvantage"] / error, 3) if error else None
    return out


def scenarios(document: dict, panel: dict) -> dict:
    """Every model's number for every company, for the night just sealed.

    Published as it was sealed, with the root it belongs to, so the screen
    showing it can be checked against the timestamp rather than believed.
    """
    basis = document["basisSession"]
    companies: dict = {}
    for name in ORDER:
        block = (document.get("models") or {}).get(name)
        if not block:
            continue
        for record in block.get("forecasts") or []:
            ticker = record.get("ticker")
            if not ticker:
                continue
            row = companies.setdefault(ticker, {"ticker": ticker, "models": {}})
            returns = {h: record["returns"].get(str(h))
                       for h in fc.HORIZONS if record.get("returns", {}).get(str(h)) is not None}
            entry = {"returns": {str(k): round(v, 4) for k, v in returns.items()}}
            ranked_by = record.get("ranked_by") or {}
            if ranked_by:
                entry["rankedBy"] = {k: round(v, 4) for k, v in ranked_by.items()}
            row["models"][name] = entry

    # The close every percentage is measured from. Without it a reader has a
    # number and no idea what it is a number of.
    for ticker, row in companies.items():
        bars = ev.bars_of(panel, ticker)
        at = next((b for b in reversed(bars) if b.get("date") == basis), None)
        if at and isinstance(at.get("close"), (int, float)):
            row["close"] = round(at["close"], 4)

    return {k: companies[k] for k in sorted(companies)}


def newest_run(runs: pathlib.Path) -> dict | None:
    paths = sorted(glob.glob(str(runs / "run-*.json")))
    for path in reversed(paths):
        try:
            document = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        # Never a reconstruction: those were rebuilt from an archive and their
        # baselines were derived after the fact. A screen saying "this is what
        # the models say now" may only ever show a night that was frozen.
        if document.get("reconstructed"):
            continue
        return document
    return None


def commitment_for(basis: str) -> dict:
    path = RESEARCH / "commitments" / f"{basis}.json"
    try:
        held = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    stamp = held.get("timestamp") or {}
    return {"merkleRoot": held.get("merkleRoot"), "leaves": held.get("leaves"),
            "timestamped": bool(stamp.get("timestamped")),
            "authority": stamp.get("authority"),
            "committedBeforeOpen": held.get("committedBeforeOpen")}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scans", nargs="*", type=pathlib.Path)
    parser.add_argument("--runs", type=pathlib.Path, default=RUNS)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)

    scans = [p for p in args.scans if p.is_file()]
    if not scans:
        raise SystemExit("publish: no scan given — there are no realised bars")
    panel = ev.bar_panel(scans)
    sessions = ev.calendar(panel)
    if not sessions:
        raise SystemExit("publish: the scans hold no session a majority shares")

    nights = []
    for path in sorted(glob.glob(str(args.runs / "run-*.json"))):
        try:
            document = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if document.get("basisSession"):
            nights.append({"basis": document["basisSession"], "document": document})
    if not nights:
        raise SystemExit(f"publish: no runs under {args.runs}")
    nights.sort(key=lambda n: n["basis"])

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

    top5 = {
        "schemaVersion": 1, "builtAt": built, "topCount": TOP,
        "horizons": list(fc.HORIZONS),
        "dates": [n["basis"] for n in nights],
        "what": f"For each model, the {TOP} companies it ranked highest on a "
                "session, and what those returned against what everything it "
                "scored returned. Every forecast was frozen before the outcome "
                "existed. A horizon whose answer already existed when the run "
                "was written is not counted.",
        "reading": f"{TOP} companies over a handful of sessions is a very small "
                   "sample. `sessions` is how many nights are behind each "
                   "average and `ahead` how many of them the model's five beat "
                   "the market on; both are the size of the evidence and the "
                   "average means nothing without them.",
        "notAdvice": "A record of forecasting models. It names no security and "
                     "recommends nothing.",
        "models": table,
    }
    ev._no_companies(top5, {t for n in nights for t in (n["document"].get("universe") or [])})
    print(f"   top5 names none of the securities in the universe")

    latest = newest_run(args.runs)
    scenes = None
    if latest:
        rows = scenarios(latest, panel)
        scenes = {
            "schemaVersion": 1, "builtAt": built,
            "basisSession": latest["basisSession"], "ranAt": latest.get("ranAt"),
            "horizons": list(fc.HORIZONS),
            "commitment": commitment_for(latest["basisSession"]),
            "models": {n: {"label": LABELS[n][0], "labelAr": LABELS[n][1],
                           "group": LABELS[n][2]}
                       for n in ORDER if n in (latest.get("models") or {})},
            "what": "What each model predicted for each company from the close "
                    "of this session, as a percentage of that close. Sealed and "
                    "timestamped the night it was made; the root here is the one "
                    "an independent authority signed, so what is on the screen "
                    "can be checked against it rather than believed.",
            "warning": "These are model outputs, not forecasts this publisher "
                       "endorses, and not advice. The models have been running "
                       "for weeks, not years, and their record is published "
                       "beside them precisely because it is too short to rely on.",
            "companies": rows,
        }
        print(f"   scenarios: {len(rows)} companies × "
              f"{len(scenes['models'])} models, basis {scenes['basisSession']}"
              + (", root " + (scenes["commitment"].get("merkleRoot") or "—")[:16]))

    if args.check:
        return 0

    RESEARCH.mkdir(parents=True, exist_ok=True)
    if ev.write_unless_unchanged(TOP5, top5, indent=1):
        print(f"   wrote {TOP5.relative_to(REPO)}")
    else:
        print(f"   {TOP5.name} unchanged")
    if scenes and ev.write_unless_unchanged(SCENARIOS, scenes):
        print(f"   wrote {SCENARIOS.relative_to(REPO)} "
              f"({SCENARIOS.stat().st_size // 1024} KB)")
    elif scenes:
        print(f"   {SCENARIOS.name} unchanged")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
