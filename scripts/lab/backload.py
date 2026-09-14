#!/usr/bin/env python3
"""The August forecasts, brought into the record they should always have been in.

WHAT THIS IS AND IS NOT
-----------------------
Between 19 August and 6 September 2026, Kronos-small forecast this market
nightly from a laptop. Those runs were genuinely frozen: each one names the
completed session it was made from, the inputs it read, and the pinned model
revision, and each was written before the sessions it forecasts had
happened. That is the property the whole Arena rests on, and it cannot be
manufactured later — so the record starts at eight dates rather than nought.

It is NOT a backtest, and the distinction is the reason this file is
careful. A backtest is written by somebody who already knows what happened.
These were not. What this does is re-express them in the shape the nightly
run now writes, and re-derive the baselines for the same dates from the same
bars — which IS after the fact, and is marked as such on every row it
produces.

WHY THE BASELINES CAN BE ADDED AFTERWARDS AND THE MODEL CANNOT
--------------------------------------------------------------
A baseline here is arithmetic over the bars up to the basis session:
momentum is a division, reversal is the same division with a minus sign.
Computing one today from bars that end at the basis gives exactly the number
it would have given in August, because there is nothing in it that could
have been tuned. A neural forecast is not like that — it has weights, a
seed, a sampling temperature — so Kronos's numbers are read from the August
artifacts and never recomputed.

Every run this produces carries `reconstructed: true` and says which half
was frozen and which half was derived. A record that cannot tell a reader
which is which is worth less than no record.
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
import run as lab

# Where the August work lives. Outside the repository, on the machine that
# did it, which is most of why this exists.
ARCHIVE = pathlib.Path.home() / "Documents" / "Codex" / "2026-07-13" / "fin" / "work"


def bar_panel(scans: list[pathlib.Path]) -> dict[str, dict[str, dict]]:
    """Every bar every saved scan saw, by ticker and date.

    The scans overlap — each holds 120 sessions and they were taken days
    apart — so together they reconstruct a panel much longer than any one of
    them. Later scans win on a collision, which matters: a bar is
    split-adjusted at the time it is read, and the newest reading of a
    session is the one adjusted for every action since.
    """
    panel: dict[str, dict[str, dict]] = collections.defaultdict(dict)
    for path in sorted(scans):
        try:
            scan = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        for record in scan.get("records") or []:
            ticker = record.get("ticker")
            if not ticker:
                continue
            for bar in record.get("recentSplitAdjustedBars") or []:
                if bar.get("date") and isinstance(bar.get("close"), (int, float)):
                    panel[ticker][bar["date"]] = bar
    return panel


def bars_to(panel: dict, ticker: str, basis: str) -> list[dict]:
    """This company's bars up to and including a basis session.

    The same cut `run.py` makes, for the same reason: a baseline handed a bar
    from after the basis would be scored on a session it had already seen.
    """
    held = panel.get(ticker) or {}
    return [held[d] for d in sorted(held) if d <= basis]


def kronos_forecasts(artifact: dict) -> list[dict]:
    """Kronos's own numbers, read and not recomputed.

    The August artifacts carry `horizons` keyed "1", "5", "10" with a median
    return as a FRACTION — -0.0213 meaning -2.13%. The lab publishes
    percentages, so the sign and the scale are converted and nothing else is
    touched.

    Twenty sessions is absent from those runs: they forecast to ten. The
    horizon is left out rather than extrapolated, so the August rows simply
    have nothing to say at twenty and the evaluation counts them as absent
    instead of inventing a number to fill the column.
    """
    out = []
    for row in artifact.get("forecasts") or []:
        ticker = row.get("ticker")
        horizons = row.get("horizons") or {}
        returns = {}
        for horizon in fc.HORIZONS:
            block = horizons.get(str(horizon))
            if not isinstance(block, dict):
                continue
            median = block.get("median", block.get("mean"))
            if isinstance(median, (int, float)):
                returns[horizon] = round(median * 100, 6)
        if ticker and returns:
            out.append({"ticker": ticker,
                        "returns": {str(k): v for k, v in returns.items()},
                        "note": "read from the August artifact, not recomputed"})
    out.sort(key=lambda r: r["ticker"])
    return out


def rebuild(artifact: dict, panel: dict) -> dict | None:
    """One August night, in the shape the nightly run writes."""
    basis = artifact.get("basisSession")
    if not basis:
        return None
    kronos = kronos_forecasts(artifact)
    if not kronos:
        return None

    universe = sorted({r["ticker"] for r in kronos})
    models: dict = {"kronos": {
        "forecasts": kronos,
        "answered": len(kronos),
        # What the August run recorded as excluded. Not recoverable per
        # company from the artifact, so it is reported as a count with its
        # own explanation rather than invented reasons.
        "abstained": max(0, (artifact.get("coverage") or {}).get("excluded", 0)),
        "abstentions": {"recorded in the August run as excluded, "
                        "without a per-company reason":
                        max(0, (artifact.get("coverage") or {}).get("excluded", 0))},
        "frozen": True,
    }}

    for name in fc.BASELINES:
        made, declined = [], []
        for ticker in universe:
            bars = bars_to(panel, ticker, basis)
            if len(bars) < lab.MIN_BARS:
                declined.append(f"{len(bars)} bars to the basis")
                continue
            answer = fc.run_baseline(name, ticker, basis, bars)
            if isinstance(answer, fc.Forecast):
                made.append(lab.as_record(answer))
            else:
                declined.append(answer.reason)
        models[name] = {
            "forecasts": made,
            "answered": len(made),
            "abstained": len(declined),
            "abstentions": dict(collections.Counter(declined)),
            # The flag that keeps this honest. These numbers were derived
            # today from bars that end at the basis — arithmetic that could
            # not have been tuned, but arithmetic run after the fact.
            "frozen": False,
        }

    return {
        "schemaVersion": 1,
        "ranAt": artifact.get("generatedAt"),
        "basisSession": basis,
        "universe": universe,
        "universeSize": len(universe),
        "minimumBars": lab.MIN_BARS,
        "horizons": list(fc.HORIZONS),
        "reconstructed": True,
        "what": "An August run, re-expressed in the lab's shape. Kronos's "
                "forecasts were frozen at the time and are read unchanged. "
                "The baselines were derived afterwards from bars ending at "
                "the basis session — arithmetic that could not have been "
                "tuned, but computed after the fact, and every baseline "
                "block says so with `frozen: false`.",
        "source": artifact.get("artifactPath"),
        "models": models,
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=pathlib.Path, default=ARCHIVE)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)

    if not args.archive.is_dir():
        raise SystemExit(f"backload: nothing at {args.archive}")

    scans = [pathlib.Path(p) for p in glob.glob(str(args.archive / "daily_scan_*.json"))
             if "fused" not in pathlib.Path(p).name]
    panel = bar_panel(scans)
    print(f"   {len(scans)} scans → {len(panel)} tickers, "
          f"{sum(len(v) for v in panel.values())} company-sessions")

    artifacts = sorted(glob.glob(str(args.archive / "kronos_shadow_2026-*.json")))
    # Revisions are excluded on purpose: a night that was re-run has more
    # than one artifact, and taking them all would enter the same forecast
    # twice under two timestamps. The dated file is the one the August
    # process treated as final.
    artifacts = [a for a in artifacts if "revision" not in pathlib.Path(a).name]

    written, seen = 0, set()
    for path in artifacts:
        try:
            artifact = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        document = rebuild(artifact, panel)
        if not document:
            continue
        basis = document["basisSession"]
        if basis in seen:
            print(f"   {basis}: already rebuilt from an earlier artifact, skipped")
            continue
        seen.add(basis)
        document["fingerprint"] = lab.fingerprint(document)
        print(f"   {basis}  {document['universeSize']:>3} companies  "
              f"kronos {document['models']['kronos']['answered']:>3}  "
              f"+ {len(fc.BASELINES)} baselines")
        if args.check:
            continue
        lab.OUT.mkdir(parents=True, exist_ok=True)
        out = lab.OUT / f"run-{basis}.json"
        if out.exists():
            print(f"      {out.name} exists, left alone")
            continue
        out.write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")),
                       encoding="utf-8")
        written += 1

    print(f"   {len(seen)} basis sessions, {written} written")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
