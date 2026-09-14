#!/usr/bin/env python3
"""Marking every frozen run against what the market actually did.

WHY THIS EXISTS SEPARATELY FROM THE RUN
---------------------------------------
The run writes a forecast and must never look forward. This looks forward and
must never write a forecast. Keeping them in one file would put the bars from
after the basis session inside the same process that decides what to predict,
and the one mistake that would make the entire record worthless is a model
that saw part of its own answer.

So: `run.py` reads bars up to the basis and writes. This reads bars after the
basis and scores. Neither imports the other's job.

WHAT COMES OUT, AND WHICH HALF A READER SEES
--------------------------------------------
Two files.

  `data-source/lab/evaluation.json` is private and complete: every model, every
  date, every horizon, the per-company pairs counted but not named.

  `public/data/v1/research/leaderboard.json` is what a reader may see. It is a
  statement about MODELS — this one ranked the market better than that one
  over these dates — and it names no security, publishes no forecast and
  ranks no company. The difference matters legally, not stylistically: a
  ranked list of companies from an unlicensed publisher is a recommendation
  whatever the wording around it, and a ranked list of *forecasters* is not a
  statement about any security at all.

`_no_companies` enforces that rather than trusting it.

WHAT IS HONEST TO CLAIM FROM IT
-------------------------------
On ten dates, almost nothing. The mean rank IC of a model over ten sessions
has a standard error wide enough to swallow any number this market produces,
and the file reports `t` and the date count beside every mean so that is
visible rather than buried. What is worth reading even now is the PAIRED
difference against a baseline on the same dates, where the market's own mood
on the day cancels out.

Baselines on the back-loaded August dates were derived after the fact — they
are arithmetic that could not have been tuned, but they were not frozen, and
`frozenDates` against `dates` says exactly how much of each number rests on
which.
"""

from __future__ import annotations

import argparse
import collections
import datetime
import glob
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import forecast as fc
import panel as pricing
import run as lab
import score as sc

REPO = pathlib.Path(__file__).resolve().parent.parent.parent
RUNS = REPO / "data-source" / "lab"
PRIVATE = RUNS / "evaluation.json"
PUBLIC = REPO / "public" / "data" / "v1" / "research" / "leaderboard.json"


def bar_panel(scans: list[pathlib.Path], *, today=None,
              root: pathlib.Path = pricing.DEEP) -> dict[str, dict[str, dict]]:
    """Every bar this project holds, by ticker and date.

    Built by `panel.py` from the deep archive where it agrees with the scan
    and from the scan alone where it does not — the same series the forecast
    was made from, which is the only series it may honestly be scored
    against.

    The depth is the point. A scan reaches back six months; the archive
    reaches back years. Without it a night older than the newest scan's
    oldest bar stops being scorable, and the leaderboard would have gone on
    saying "8 dates" while the 8 slid quietly forward.

    Several scans still merge, later winning a collision: a bar is
    split-adjusted when it is read, and the newest reading of a session is
    the one adjusted for every corporate action since.
    """
    merged: dict[str, dict[str, dict]] = collections.defaultdict(dict)
    for path in sorted(scans):
        try:
            scan = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        built = pricing.build(scan, today=today, root=root)
        for ticker, bars in built["panel"].items():
            for bar in bars:
                if bar.get("date") and isinstance(bar.get("close"), (int, float)):
                    merged[ticker][bar["date"]] = bar
    return merged


def bars_of(panel: dict, ticker: str) -> list[dict]:
    held = panel.get(ticker) or {}
    return [held[d] for d in sorted(held)]


def calendar(panel: dict[str, dict[str, dict]]) -> list[str]:
    """The exchange's completed sessions, as the market itself shows them.

    A date counts when at least half the companies in the panel have a bar on
    it. One company trading on a day the exchange was shut is a data error,
    not a session, and counting it would mature a forecast a day early.
    """
    if not panel:
        return []
    seen: collections.Counter = collections.Counter()
    for dates in panel.values():
        seen.update(dates.keys())
    floor = len(panel) / 2
    return sorted(d for d, n in seen.items() if n >= floor)


def sessions_after(sessions: list[str], basis: str) -> int:
    return sum(1 for d in sessions if d > basis)


def nth_session_after(sessions: list[str], basis: str, horizon: int) -> str | None:
    """The session a horizon-`horizon` forecast is about."""
    ahead = [d for d in sessions if d > basis]
    return ahead[horizon - 1] if len(ahead) >= horizon else None


def last_session_complete_at(sessions: list[str], moment: str) -> str | None:
    """The newest session whose closing price existed at a given instant.

    Cairo time, because the exchange closes at 14:30 Cairo and a UTC
    timestamp four hours later is still the same afternoon.
    """
    try:
        when = datetime.datetime.fromisoformat(moment.replace("Z", "+00:00"))
    except (AttributeError, ValueError):
        return None
    local = when.astimezone(lab.CAIRO)
    day = local.date().isoformat()
    closed = local.timetz().replace(tzinfo=None) >= lab.CLOSES
    done = [d for d in sessions if d < day or (d == day and closed)]
    return done[-1] if done else None


def outcome_already_known(sessions: list[str], basis: str, horizon: int,
                          ran_at: str | None) -> bool:
    """Whether this horizon's answer existed when the run was committed.

    THE TEST THAT DECIDES WHETHER A NUMBER IS EVIDENCE
    --------------------------------------------------
    Three of the ten runs in this record were generated after the session
    their one-step horizon asks about had already closed — two August nights
    rebuilt days late, and the first CI run, which fired at 14:49 Cairo when
    the market had shut at 14:30. Nothing in those runs saw the outcome: the
    bars are trimmed to the basis and the models are deterministic. But that
    is an argument, and the whole point of this record is not to need one.

    So the horizon is not scored. Not discounted, not footnoted — withheld,
    and counted as withheld, so the leaderboard's date counts only ever cover
    sessions whose answers did not exist when the forecast was written down.
    """
    if not ran_at:
        return True
    outcome = nth_session_after(sessions, basis, horizon)
    if outcome is None:
        return False        # hasn't happened yet; it simply cannot be scored
    complete = last_session_complete_at(sessions, ran_at)
    return complete is not None and outcome <= complete


def predicted(record: dict, horizon: int) -> float | None:
    """What this record says to sort the company by at this horizon.

    `ranked_by` wins where a model publishes one, because a ranking model —
    one that scores companies against each other without claiming a return —
    has nothing in `returns` to sort by. A horizon the model did not publish
    is absent: Kronos forecast to ten sessions in August and the lab asks for
    twenty, so those rows simply have nothing to say at twenty rather than an
    extrapolation nobody made.
    """
    key = str(horizon)
    ranked = record.get("ranked_by") or {}
    if key in ranked and isinstance(ranked[key], (int, float)):
        return float(ranked[key])
    returns = record.get("returns") or {}
    value = returns.get(key)
    return float(value) if isinstance(value, (int, float)) else None


def pairs_for(block: dict, basis: str, horizon: int, panel: dict) -> list[tuple]:
    """(what the model said, what the company did) for every scorable company.

    A company the model abstained on is absent, not zero. A company whose
    outcome cannot be computed — it has not traded enough sessions since the
    basis, or the panel does not reach that far — is also absent. Neither is
    a miss, and counting either as one would punish a model for a session
    that has not happened yet.
    """
    out = []
    for record in block.get("forecasts") or []:
        ticker = record.get("ticker")
        guess = predicted(record, horizon)
        if not ticker or guess is None:
            continue
        actual = sc.forward_return(bars_of(panel, ticker), basis, horizon)
        if actual is None:
            continue
        out.append((guess, actual))
    return out


def score_run(document: dict, panel: dict, sessions: list[str]) -> dict:
    """One night, every model, every horizon."""
    basis = document.get("basisSession")
    ran_at = document.get("ranAt")
    withheld = {h: outcome_already_known(sessions, basis, h, ran_at)
                for h in fc.HORIZONS}
    rows = {}
    for name, block in (document.get("models") or {}).items():
        per_horizon = {}
        for horizon in fc.HORIZONS:
            pairs = pairs_for(block, basis, horizon, panel)
            if withheld[horizon]:
                per_horizon[str(horizon)] = {
                    "scored": len(pairs),
                    "rankIC": None,
                    "direction": None,
                    "withheld": "the session this horizon asks about had "
                                "already closed when the run was committed",
                }
                continue
            per_horizon[str(horizon)] = {
                "scored": len(pairs),
                "rankIC": sc.rank_ic(pairs),
                "direction": sc.directional_accuracy(pairs),
            }
        rows[name] = {
            "answered": block.get("answered", 0),
            "abstained": block.get("abstained", 0),
            # False only where a block says so. A run written by the nightly
            # job is frozen by construction; the August baselines were
            # rebuilt afterwards and say `frozen: false` themselves.
            "frozen": bool(block.get("frozen", True)),
            "horizons": per_horizon,
        }
    return {
        "basisSession": basis,
        "ranAt": document.get("ranAt"),
        "universeSize": document.get("universeSize"),
        "reconstructed": bool(document.get("reconstructed")),
        "withheldHorizons": sorted(str(h) for h, yes in withheld.items() if yes),
        "models": rows,
    }


def carried(stored: dict, sessions: list[str]) -> dict[str, dict]:
    """Nights already scored that the current bars can no longer reach.

    WHY THIS IS NOT AN OPTIMISATION
    -------------------------------
    A scan carries 120 sessions. The record is meant to run for years. Six
    months from now the August nights will be older than the oldest bar in
    any scan, and an evaluation rebuilt from scratch would quietly drop them
    — the leaderboard would keep saying "8 dates" while the 8 slid forward,
    and nobody would see the first months leave.

    So a night whose basis predates the panel keeps the score it was given
    when the bars were still there, marked `carried`. The test is the panel's
    own reach and not "did this score come out empty": a scan that failed
    today must not turn into yesterday's numbers wearing today's date.
    """
    if not sessions:
        return {}
    earliest = sessions[0]
    out = {}
    for night in stored.get("nights") or []:
        basis = night.get("basisSession")
        if basis and basis < earliest:
            night = dict(night)
            night["carried"] = True
            out[basis] = night
    return out


def write_unless_unchanged(path: pathlib.Path, document: dict, *,
                           indent=None, ignoring=("builtAt",)) -> bool:
    """Write only when something other than the clock moved.

    Both of these files carry a `builtAt`, so rewriting them unconditionally
    made every run a commit — and two runs finishing minutes apart a rebase
    conflict over a document whose only difference was the second it was
    produced. That conflict broke the lab's own commit step on the day it was
    written.

    Comparing on everything BUT the timestamp also keeps `builtAt` honest: it
    now says when this content was produced rather than when a job last ran.
    """
    fresh = {k: v for k, v in document.items() if k not in ignoring}
    held = read_stored(path)
    if held and {k: v for k, v in held.items() if k not in ignoring} == fresh:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(document, ensure_ascii=False, indent=indent,
                               separators=None if indent else (",", ":")),
                    encoding="utf-8")
    return True


def read_stored(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def series(nights: list[dict], model: str, horizon: int) -> dict[str, float | None]:
    """This model's IC by date at one horizon, including the dates it failed.

    Dates where it could not be scored are carried as None rather than
    dropped, because `against()` pairs on shared dates and a silently missing
    date would let two models be compared on two different sets of days.
    """
    key = str(horizon)
    out: dict[str, float | None] = {}
    for night in nights:
        block = (night.get("models") or {}).get(model)
        if not block:
            continue
        out[night["basisSession"]] = (block["horizons"].get(key) or {}).get("rankIC")
    return out


def leaderboard(nights: list[dict]) -> dict:
    """Every model's record, and every model against every baseline."""
    models = sorted({m for n in nights for m in (n.get("models") or {})})
    table: dict = {}
    for model in models:
        per_horizon = {}
        for horizon in fc.HORIZONS:
            by_date = series(nights, model, horizon)
            usable = [v for v in by_date.values() if v is not None]
            summary = sc.summarise(usable)

            # How much of this rests on evidence frozen before the fact.
            frozen = sum(1 for n in nights
                         if by_date.get(n["basisSession"]) is not None
                         and (n["models"].get(model) or {}).get("frozen", True))
            summary["frozenDates"] = frozen
            summary["reconstructedDates"] = summary["dates"] - frozen
            # Sessions this model forecast that are deliberately not scored,
            # because their answer existed when the forecast was written.
            summary["withheldDates"] = sum(
                1 for n in nights
                if "withheld" in ((n["models"].get(model) or {})
                                  .get("horizons", {}).get(str(horizon)) or {}))
            summary["scored"] = _median_scored(nights, model, horizon)
            summary["against"] = {
                rival: sc.against(by_date, series(nights, rival, horizon))
                for rival in sorted(fc.BASELINES) if rival != model
            }
            per_horizon[str(horizon)] = summary
        table[model] = per_horizon
    return table


def _median_scored(nights: list[dict], model: str, horizon: int) -> int | None:
    """How many companies a typical night actually scored for this model.

    Beside the IC because a correlation over 40 companies and one over 250
    are not the same evidence, and the mean alone hides which one it was.
    """
    key = str(horizon)
    counts = sorted((n["models"][model]["horizons"].get(key) or {}).get("scored", 0)
                    for n in nights if model in (n.get("models") or {}))
    counts = [c for c in counts if c]
    return counts[len(counts) // 2] if counts else None


# Every word that would turn a statement about models into a statement about
# a security. Checked against the public file's keys and its string values.
FORBIDDEN = ("ticker", "company", "symbol", "buy", "sell", "recommend",
             "target price", "opportunity", "pick")


def _no_companies(public: dict, universe: set[str]) -> None:
    """Refuse to publish a leaderboard that names a security.

    The guard, not a comment about the guard. The public file is allowed to
    say that one forecaster ranked this market better than another; it is not
    allowed to say anything whatever about a named company, and the easiest
    way for that to stop being true is somebody adding a helpful "best call
    of the night" field months from now.
    """
    text = json.dumps(public, ensure_ascii=False)
    blob = json.loads(text)

    def walk(node, path="$"):
        if isinstance(node, dict):
            for k, v in node.items():
                if any(word in k.lower() for word in FORBIDDEN):
                    raise SystemExit(f"leaderboard: '{k}' at {path} names companies")
                walk(v, f"{path}.{k}")
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f"{path}[{i}]")
        elif isinstance(node, str):
            for word in node.replace(",", " ").split():
                bare = word.strip(".,;:'\"()[]").upper()
                if bare in universe:
                    raise SystemExit(
                        f"leaderboard: '{bare}' at {path} is a listed security")

    walk(blob)


def public_document(table: dict, nights: list[dict], built: str) -> dict:
    return {
        "schemaVersion": 1,
        "builtAt": built,
        "dates": [n["basisSession"] for n in nights],
        "basisSessions": len(nights),
        "horizons": list(fc.HORIZONS),
        "metric": "Spearman rank correlation between what a model ranked "
                  "highest and what the market then did, one number per "
                  "session. Undefined — not zero — where a model ranked "
                  "every company alike or fewer than "
                  f"{sc.MIN_COMPANIES} companies could be scored.",
        "reading": "`t` is the mean over its own standard error. On this many "
                   "sessions it is a direction and not a finding. `against` "
                   "is the paired difference on the dates both models scored, "
                   "which is the number worth reading: it removes the market's "
                   "own mood on the day.",
        "evidence": "`frozenDates` counts sessions where the model's forecast "
                    "was written before the outcome existed. "
                    "`reconstructedDates` counts sessions rebuilt afterwards "
                    "from bars ending at the basis — arithmetic that could "
                    "not have been tuned, but computed after the fact. "
                    "`withheldDates` counts sessions dropped from the "
                    "scoring entirely because the session the horizon asks "
                    "about had already closed when the run was written down: "
                    "the models did not see it, but the record should not "
                    "have to argue that, so those days are not counted at "
                    "all.",
        "notAdvice": "A comparison of forecasting models. It names no "
                     "security, contains no forecast, and is not a "
                     "recommendation to buy or sell anything.",
        "models": table,
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scans", nargs="*", type=pathlib.Path,
                        help="daily_scan_*.json files for the realised bars")
    parser.add_argument("--runs", type=pathlib.Path, default=RUNS)
    parser.add_argument("--check", action="store_true", help="write nothing")
    args = parser.parse_args(argv)

    scans = [p for p in args.scans if p.is_file()]
    if not scans:
        raise SystemExit("evaluate: no scan given — there are no realised bars "
                         "to mark the forecasts against")
    panel = bar_panel(scans)
    sessions = calendar(panel)
    print(f"   {len(scans)} scans → {len(panel)} tickers, "
          f"{sum(len(v) for v in panel.values())} company-sessions")
    if not sessions:
        raise SystemExit("evaluate: the scans hold no session a majority of "
                         "the market shares")
    print(f"   calendar: {len(sessions)} sessions, "
          f"{sessions[0]} → {sessions[-1]}")

    kept = carried(read_stored(PRIVATE), sessions)
    if kept:
        print(f"   {len(kept)} nights are older than the oldest bar these "
              "scans hold and keep the scores they were given")

    paths = sorted(glob.glob(str(args.runs / "run-*.json")))
    nights = []
    universe: set[str] = set()
    for path in paths:
        try:
            document = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        universe.update(document.get("universe") or [])
        basis = document.get("basisSession")
        nights.append(kept[basis] if basis in kept
                      else score_run(document, panel, sessions))
    if not nights:
        raise SystemExit(f"evaluate: no runs under {args.runs}")
    nights.sort(key=lambda n: n["basisSession"])

    table = leaderboard(nights)
    dropped = [n["basisSession"] for n in nights if n["withheldHorizons"]]
    if dropped:
        print(f"   {len(dropped)} runs were committed after a horizon of "
              f"theirs had closed: {', '.join(dropped)}")
        for night in nights:
            if night["withheldHorizons"]:
                print(f"      {night['basisSession']}  withheld h="
                      f"{','.join(night['withheldHorizons'])}  "
                      f"(written {night['ranAt']})")

    for model in sorted(table):
        one = table[model]["1"]
        print(f"   {model:<12} h=1  IC {_show(one['mean'])}  "
              f"t {_show(one['t'], 2)}  {one['dates']:>2} dates "
              f"({one['frozenDates']} frozen, {one['withheldDates']} withheld)"
              f"  ~{one['scored'] or 0} scored")

    built = (datetime.datetime.now(datetime.timezone.utc)
             .isoformat(timespec="seconds").replace("+00:00", "Z"))
    public = public_document(table, nights, built)
    _no_companies(public, universe)
    print(f"   the public leaderboard names none of the {len(universe)} "
          "securities in the universe")

    if args.check:
        return 0

    args.runs.mkdir(parents=True, exist_ok=True)
    if write_unless_unchanged(PRIVATE, {"builtAt": built, "nights": nights,
                                        "models": table}):
        print(f"   wrote {PRIVATE.relative_to(REPO)}")
    else:
        print(f"   {PRIVATE.name} unchanged — no horizon matured since the "
              "last run")

    if write_unless_unchanged(PUBLIC, public, indent=1):
        print(f"   wrote {PUBLIC.relative_to(REPO)} "
              f"({PUBLIC.stat().st_size // 1024} KB, no company named)")
    else:
        print(f"   {PUBLIC.name} unchanged")
    return 0


def _show(value, places=4) -> str:
    return "    —" if value is None else f"{value:+.{places}f}"


if __name__ == "__main__":
    raise SystemExit(main())
