#!/usr/bin/env python3
"""One night's forecasts, from every registered model, frozen before the fact.

WHAT THIS RUN IS FOR
--------------------
Not to tell anybody what to buy. To produce a record that cannot be edited
after the outcome is known, so that in six weeks there is an honest answer to
"does any of this see anything on this exchange?"

That is why the shape is what it is: every model is asked about every company
in the same universe on the same basis session, every answer and every
refusal is written down, and the whole thing is hashed. A model that quietly
skipped the hard half of the market, or a run that was repeated until it
looked better, is visible in the record rather than absent from it.

WHAT IT PUBLISHES
-----------------
Nothing. The forecasts are private — a predicted return for a named security
is exactly the thing an unlicensed publisher may not put on a screen. What
eventually reaches a reader is the model leaderboard, months later, after the
horizons have matured: rank IC, coverage, and how each model did against the
baselines. `scripts/lab/` writes to `data-source/lab/`, which is not served.

THE BASIS SESSION
-----------------
Always a COMPLETED session, and always the one that has just finished.

That took three attempts to get right, and the thing that was wrong was never
the hour. The VENDOR does not publish a completed EGX daily bar for hours: a
scan taken at 15:14, forty-four minutes after the 14:30 close, still had the
previous session as the newest bar for every company on the exchange. So a
run "after the close" forecast from YESTERDAY, which made its one-session
horizon a price the market had already printed.

The exchange publishes its own. `panel.py` takes today's open, high, low,
close and volume from the EGX market-watch — settled by 15:35 Cairo on the
14th, with the exchange's own status endpoint saying "Closed" rather than a
clock being asked to guess — and the deep history from this project's price
archive, which is years rather than months. The vendor's scan supplies the
open, high and low the archive lacks, and only where the two agree that they
are the same series at all.

`commitment_timing` is the backstop: if today's session cannot be had, the
basis falls back to yesterday's, and a run in that position after the close
is refused rather than written with a caveat.
"""

from __future__ import annotations

import argparse
import collections
import datetime
import hashlib
import json
import pathlib
import sys
import time
import zoneinfo

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import commit as cm
import forecast as fc
import panel as pricing
import timestamp as ts

REPO = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = REPO / "data-source" / "lab"
# The public half of the commitment. A root, counts and a timestamp receipt —
# no forecast and no company name — so it can be published the same night
# while the forecasts themselves stay private until their horizons mature.
COMMITMENTS = REPO / "public" / "data" / "v1" / "research" / "commitments"

# A model needs at least this much of a company's record to be asked at all.
# Kronos ran on a 90-session lookback; below that the question is different
# for different models and the comparison stops being like for like.
MIN_BARS = 90

# The exchange's day, in the exchange's own time. Egypt keeps summer time, so
# this cannot be a fixed offset from UTC.
CAIRO = zoneinfo.ZoneInfo("Africa/Cairo")
OPENS = datetime.time(10, 0)
CLOSES = datetime.time(14, 30)
# Friday and Saturday. Python counts Monday as 0.
WEEKEND = (4, 5)


def commitment_timing(basis: str, now: datetime.datetime) -> dict:
    """Whether this run is a forecast at all, and how strong a one.

    THE DEFECT THIS EXISTS TO CATCH
    -------------------------------
    TradingView does not publish a completed EGX daily bar for hours after
    the 14:30 close — a scan taken at 15:14 on the 14th still had the 13th as
    its newest session for every company on the exchange. So a run scheduled
    "after the close" does not forecast from today's session at all. It
    forecasts from YESTERDAY's, which means its one-session horizon is
    today's close — a price that was fixed forty-four minutes before the
    commitment was timestamped.

    Nothing in the model sees it: the bars are trimmed to the basis. But the
    evidence is what this whole record is for, and "we committed this at
    15:02 to a number the market printed at 14:30" is not evidence anybody
    should accept. So a run in that position is refused outright rather than
    written with a caveat.

    Before the open is the strong case and is recorded as such. Between the
    open and the close the session is running and its close does not yet
    exist, so the forecast is real but a reader can see it was made with the
    tape moving, and decide what that is worth.
    """
    today = now.date().isoformat()
    trading_day = now.weekday() not in WEEKEND
    # A basis equal to today means the data has caught up: the first session
    # being forecast is a future day, and nothing about it has happened.
    if basis >= today or not trading_day:
        return {"beforeOpen": True, "afterClose": False, "compromised": False}
    clock = now.timetz().replace(tzinfo=None)
    return {"beforeOpen": clock < OPENS,
            "afterClose": clock >= CLOSES,
            "compromised": clock >= CLOSES}


def now_in_cairo() -> datetime.datetime:
    return datetime.datetime.now(CAIRO)


def read_scan(path: pathlib.Path) -> dict:
    """The daily scan `egx_scan.mjs` writes, with its OHLC history.

    This is the same file the market build already produces in CI — 296
    scanner rows, ~232 of them with 120 completed split-adjusted bars pulled
    from TradingView over a WebSocket. The lab reads it rather than fetching
    again: two fetches minutes apart are two different markets, and the
    forecast has to be made from the bars the record says it was made from.
    """
    return json.loads(path.read_text(encoding="utf-8"))


def universe(scan: dict, *, today=None,
             root: pathlib.Path = pricing.DEEP) -> tuple[list[dict], dict]:
    """Every company with enough completed history, and where it came from.

    The history is `panel.py`'s: this project's own archive where it agrees
    with the vendor's scan, the scan where it does not, and the session that
    has just closed taken from the exchange itself. That last part is why the
    lab can run after the close at all — the vendor does not publish a
    completed EGX daily bar for hours, and a run that cannot see today's
    session forecasts from yesterday's.

    Alphabetical rather than by anything else, so that a run truncated by a
    timeout loses a random slice of the market rather than its quiet end.
    """
    built = pricing.build(scan, today=today, root=root)
    rows = [{"ticker": ticker, "bars": bars}
            for ticker, bars in built["panel"].items() if len(bars) >= MIN_BARS]
    rows.sort(key=lambda r: r["ticker"])
    return rows, built["sources"]


def basis_session(rows: list[dict]) -> str | None:
    """The completed session this run forecasts from.

    The newest date a MAJORITY of the market shares. Individual companies lag
    — a share that did not trade has no bar — and taking the newest date any
    company holds would date the run to one company's Thursday.
    """
    if not rows:
        return None
    counts = collections.Counter(r["bars"][-1]["date"] for r in rows if r["bars"])
    if not counts:
        return None
    most, seen = counts.most_common(1)[0]
    return most if seen >= len(rows) / 2 else None


def trim(bars: list[dict], basis: str) -> list[dict]:
    """This company's bars up to and including the basis, and no further.

    The guard against the one mistake that would make every number here
    worthless. A model handed a bar from after the basis session has been
    shown part of its own answer, and would score beautifully.
    """
    return [b for b in bars if (b.get("date") or "") <= basis]


def run_models(rows: list[dict], basis: str, models: dict) -> dict:
    """Ask every model about every company, and write down every refusal.

    Each model is timed. Not for tuning — for the record: a model that took
    ten times as long tonight was doing something different tonight, and the
    only way that is ever visible afterwards is if somebody wrote it down. It
    is also the number the schedule has to be sized against, and guessing it
    is how a run gets killed by a job timeout three quarters of the way
    through, which is exactly what happened on 14 September.
    """
    answers: dict[str, list] = {}
    refusals: dict[str, list] = {}
    spent: dict[str, float] = {}
    for name, ask in models.items():
        started = time.monotonic()
        made, declined = [], []
        for row in rows:
            bars = trim(row["bars"], basis)
            if len(bars) < MIN_BARS:
                declined.append(fc.Abstention(row["ticker"], basis, name,
                                              f"{len(bars)} bars to the basis"))
                continue
            try:
                out = ask(row["ticker"], basis, bars)
            except Exception as error:  # noqa: BLE001 — a model that throws abstains
                declined.append(fc.Abstention(row["ticker"], basis, name,
                                              f"{type(error).__name__}: {error}"))
                continue
            (made if isinstance(out, fc.Forecast) else declined).append(out)
        answers[name] = made
        refusals[name] = declined
        spent[name] = round(time.monotonic() - started, 1)
        print(f"   {name:<12} {len(made):>4} answered  {len(declined):>3} "
              f"abstained  {spent[name]:>7.1f}s", flush=True)
    return {"forecasts": answers, "abstentions": refusals, "seconds": spent}


def as_record(f: fc.Forecast) -> dict:
    out = {"ticker": f.ticker, "returns": {str(k): round(v, 6)
                                           for k, v in f.returns.items()}}
    if f.ranked_by:
        out["ranked_by"] = {str(k): round(v, 6) for k, v in f.ranked_by.items()}
    if f.quantiles:
        out["quantiles"] = f.quantiles
    if f.note:
        out["note"] = f.note
    return out


def build(scan: dict, models: dict, ran_at: str, *, today=None,
          root: pathlib.Path = pricing.DEEP) -> dict:
    rows, sources = universe(scan, today=today, root=root)
    basis = basis_session(rows)
    if not basis:
        raise SystemExit("lab: no completed session a majority of the market shares")

    result = run_models(rows, basis, models)
    document = {
        "schemaVersion": 1,
        "ranAt": ran_at,
        "basisSession": basis,
        "universe": [r["ticker"] for r in rows],
        "universeSize": len(rows),
        "minimumBars": MIN_BARS,
        "horizons": list(fc.HORIZONS),
        # Said in the file because the file outlives the intention.
        # Where every price in this run came from, company by company. The
        # first question anybody auditing a forecast asks is "which series
        # was this made from", and it is the hardest one to answer after the
        # fact — so it is answered in the run itself.
        "prices": sources,
        "what": "Private forecasts, frozen before the outcome existed, for "
                "measuring the models against each other and against the "
                "baselines. Not published, not advice, not a selection: every "
                "company in the universe is asked of every model.",
        "models": {},
    }
    for name in models:
        made = result["forecasts"][name]
        declined = result["abstentions"][name]
        document["models"][name] = {
            "forecasts": [as_record(f) for f in made],
            "answered": len(made),
            "abstained": len(declined),
            # Grouped rather than listed one by one: 230 companies refused for
            # "84 bars to the basis" is one fact, not 230.
            "abstentions": dict(collections.Counter(a.reason for a in declined)),
            "seconds": result["seconds"][name],
        }
    # The re-rank is not here. It reads this night after it has been sealed,
    # from `rerank.py`, and seals its own readings beside it — see that file
    # for why a language model is a second pass rather than a tenth model.
    return document


def fingerprint(document: dict) -> str:
    """A hash over the forecasts, so the record can be shown not to have moved.

    Not yet a commitment — that needs canonical JSON and an independent
    timestamp, and is the next piece. This is the honest half of it: the same
    forecasts always hash the same, and a changed forecast always changes it.
    """
    body = json.dumps(document["models"], sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(body.encode()).hexdigest()


def _short(path: pathlib.Path) -> str:
    try:
        return str(path.relative_to(REPO))
    except ValueError:
        return str(path)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scan", type=pathlib.Path,
                        help="the daily_scan_<date>.json egx_scan.mjs wrote")
    parser.add_argument("--models", default="baselines",
                        help="baselines, all, or a comma-separated list")
    # Writing is the flag, not the default.
    #
    # Because the dangerous thing should be the one you have to ask for. A
    # run by hand against the real output path pre-empts the scheduled one:
    # the overwrite guard below then refuses the nightly nine-model run
    # because a four-model experiment already claimed the session, and the
    # record keeps the weaker of the two forever. That happened once, on
    # 14 September, minutes before the run it would have displaced.
    parser.add_argument("--write", action="store_true",
                        help="record this run; without it nothing is written")
    parser.add_argument("--no-timestamp", action="store_true",
                        help="skip the timestamping authority")
    parser.add_argument("--no-today", action="store_true",
                        help="do not ask the exchange for the session that "
                             "has just closed")
    args = parser.parse_args(argv)
    args.check = not args.write

    chosen: dict = {}
    wanted = args.models.strip()
    if wanted in ("baselines", "all"):
        chosen.update({n: (lambda n: lambda t, b, x: fc.run_baseline(n, t, b, x))(n)
                       for n in fc.BASELINES})
    else:
        for name in (w.strip() for w in wanted.split(",") if w.strip()):
            if name in fc.BASELINES:
                chosen[name] = (lambda n: lambda t, b, x: fc.run_baseline(n, t, b, x))(name)

    if wanted == "all":
        try:
            import neural
            chosen.update(neural.available())
        except Exception as error:  # noqa: BLE001
            print(f"   neural models unavailable ({type(error).__name__}), "
                  "baselines only")

    if not chosen:
        raise SystemExit(f"lab: no models selected from '{args.models}'")

    # The session that has just closed, from the exchange rather than the
    # vendor. This is the piece that lets the lab run after the close: the
    # vendor's daily bar for today does not exist for hours, and without this
    # the newest session anything holds is yesterday's.
    #
    # Best-effort on purpose. If the exchange does not answer, or says the
    # market is still open, the run proceeds on the history alone — and the
    # timing guard below refuses it if that leaves a basis whose first
    # horizon has already been priced.
    todays, when = {}, None
    if not args.no_today:
        try:
            watch, status = pricing.fetch_today()
            when, todays = pricing.todays_bars(watch, status)
            print(f"   the exchange calls {when or 'no session'} closed"
                  + (f", {len(todays)} companies priced" if todays else ""))
        except Exception as error:  # noqa: BLE001 — any refusal, same answer
            print(f"   the exchange did not answer ({type(error).__name__}) — "
                  "running on the history alone")

    scan = read_scan(args.scan)

    # Before a single model is asked. The retry schedule fires three hours
    # after the first run every trading day, and it used to spend half an hour
    # of Kronos finding out, at the very end, that the night had already been
    # sealed. The basis costs a few seconds to establish; the models do not.
    if not args.check:
        early = basis_session(universe(scan, today=todays)[0])
        if early and (OUT / f"run-{early}.json").exists():
            print(f"   run-{early}.json already exists — {early} has been "
                  "forecast and is not forecast again")
            return 0

    ran_at = (datetime.datetime.now(datetime.timezone.utc)
              .isoformat(timespec="seconds").replace("+00:00", "Z"))
    document = build(scan, chosen, ran_at, today=todays)
    document["fingerprint"] = fingerprint(document)

    basis = document["basisSession"]
    timing = commitment_timing(basis, now_in_cairo())
    document["commitment"] = timing
    if timing["compromised"]:
        complaint = (
            f"lab: the newest session the market shares is {basis}, and "
            "today's has already closed. The one-session horizon of this run "
            "would be a price the exchange printed before the commitment was "
            "made. Refusing to write it: run before the close, or wait for "
            "the vendor to publish today's bar.")
        # A dry run writes nothing, so there is no record to protect and no
        # reason to fail. It exists to prove the models load and answer, and
        # a red job for a rule about a file it never touches teaches whoever
        # reads it next to ignore the rule.
        if not args.check:
            raise SystemExit(complaint)
        print(f"   NOT A FORECAST — {complaint}")

    # A second run of the same night must not replace the first. "Re-run
    # until it looks better" is the failure this whole record is built to
    # make impossible, and the cheapest way for it to happen is a retried
    # workflow quietly overwriting a file.
    settled = OUT / f"run-{basis}.json"
    if settled.exists() and not args.check:
        print(f"   {settled.name} already exists — {basis} has been forecast "
              "and is not forecast again")
        return 0

    prices = document["prices"]
    print(f"   basis {basis}  ·  {document['universeSize']} companies  ·  "
          f"{len(chosen)} models  ·  "
          f"{'before the open' if timing['beforeOpen'] else 'session running'}")
    print(f"   prices: {prices['archiveCount']} from this project's archive, "
          f"{prices['scanOnlyCount']} from the vendor alone, "
          f"{prices['extendedCount']} carrying today's close from the exchange")
    print(f"   {sum(b['seconds'] for b in document['models'].values()):.0f}s "
          f"across {len(document['models'])} models")
    print(f"   fingerprint {document['fingerprint'][:16]}")

    # The commitment, built before anything is written.
    #
    # Every forecast is salted and hashed into one Merkle root, and a
    # timestamping authority is asked to date the root. That token is the
    # only part of this record that cannot be produced after the outcome is
    # known, which makes it the whole of the claim "frozen before the fact".
    public, secret = cm.commitment(document)
    # Said in the public half too, because it is a claim about the evidence
    # and not a detail of the run: a reader checking the timestamp should be
    # able to see whether the market was open when it was taken.
    public["committedBeforeOpen"] = timing["beforeOpen"]
    if not args.no_timestamp:
        public["timestamp"] = ts.stamp(public["merkleRoot"])
        state = ("stamped by " + public["timestamp"]["authority"]
                 if public["timestamp"]["timestamped"]
                 else "NOT stamped — no authority answered")
    else:
        state = "not stamped (asked not to)"
    print(f"   root {public['merkleRoot'][:16]}  {public['leaves']} leaves  ·  {state}")

    if args.check:
        return 0

    OUT.mkdir(parents=True, exist_ok=True)
    path = settled
    # The nonces travel with the private forecasts, never with the root. A
    # published nonce opens the leaf it belongs to, which would publish the
    # forecast the commitment exists to keep until its horizon matures.
    document["nonces"] = secret["nonces"]
    path.write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")),
                    encoding="utf-8")
    print(f"   wrote {_short(path)} ({path.stat().st_size // 1024} KB)")

    COMMITMENTS.mkdir(parents=True, exist_ok=True)
    stamp_path = COMMITMENTS / f"{document['basisSession']}.json"
    stamp_path.write_text(json.dumps(public, ensure_ascii=False, indent=1),
                          encoding="utf-8")
    print(f"   wrote {_short(stamp_path)} (public: a root, no forecasts)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
