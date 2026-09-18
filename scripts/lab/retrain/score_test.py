"""Score every model's frozen test rows with the lab's own marking code.

    python score_test.py <data dir> <runs dir> <out.json>

Reads one `<model>.jsonl` per model from the runs directory and produces the
stage 2 record. Nothing here is a new metric: rank IC, the summary and the
paired comparison are imported from `scripts/lab/score.py`, so the sentence
"not lower than the original's" means the same thing it means on any night
the lab has ever published.

Three things are reported for each model and horizon:

  rankIC        Spearman between what the model ranked highest and what
                actually rose, per origin, then summarised across origins.
  topFive       what its own five best did, minus what the whole scored
                market did. A month when everything rose is not a month in
                which picking five names was clever.
  pullAt20      the stage 1 measure, recomputed on the test months.

The t-statistic is given twice. Origins sit five sessions apart, so at 20
sessions consecutive origins overlap and their errors are not independent;
`tIndependent` recomputes it on the widest non-overlapping subset. The first
number flatters, the second is the one to read.
"""

import json
import math
import pathlib
import statistics
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import score as sc

HORIZONS = (1, 5, 20)
ORIGIN_EVERY = 5
TOP = 5


def pearson(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) < sc.MIN_COMPANIES:
        return None
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    top = sum((a - mx) * (b - my) for a, b in zip(xs, ys))
    bottom = math.sqrt(sum((a - mx) ** 2 for a in xs) * sum((b - my) ** 2 for b in ys))
    return top / bottom if bottom else None


def independent(ics: dict[str, float | None], origins: list[str], horizon: int) -> dict:
    """The same summary on origins far enough apart not to share sessions."""
    stride = max(1, math.ceil(horizon / ORIGIN_EVERY))
    kept = origins[::stride]
    return sc.summarise([ics[o] for o in kept if o in ics])


def load(path: pathlib.Path) -> dict[str, list[dict]]:
    out = {}
    for line in path.read_text().splitlines():
        if line.strip():
            row = json.loads(line)
            out[row["origin"]] = row["rows"]
    return out


def main(argv):
    data, runs, out = map(pathlib.Path, argv)
    prereg = json.loads((data / "frozen" / "test-preregistration.json").read_text())
    origins = prereg["origins"]

    runs_by_model = {}
    for name in prereg["models"]:
        path = runs / f"{name}.jsonl"
        if path.exists():
            runs_by_model[name] = load(path)
        else:
            print(f"  (missing: {name})", file=sys.stderr)

    report = {"origins": len(origins), "first": origins[0], "last": origins[-1],
              "checkpoint": prereg["checkpoint"], "models": {}}

    for name, by_origin in runs_by_model.items():
        block = {"origins": len(by_origin), "horizons": {}}
        for horizon in HORIZONS:
            key = str(horizon)
            ics, tops, coverage = {}, [], []
            for origin in origins:
                rows = by_origin.get(origin) or []
                pairs = [(r["ranked"][key], r["actual"][key]) for r in rows
                         if r["ranked"][key] is not None and r["actual"][key] is not None]
                if not pairs:
                    continue
                coverage.append(len(pairs))
                ics[origin] = sc.rank_ic(pairs)
                if len(pairs) >= sc.MIN_COMPANIES:
                    best = sorted(pairs, key=lambda p: -p[0])[:TOP]
                    tops.append(statistics.fmean(a for _, a in best)
                                - statistics.fmean(a for _, a in pairs))
            summary = sc.summarise([ics[o] for o in origins if o in ics])
            block["horizons"][key] = {
                "rankIC": summary,
                "tIndependent": independent(ics, origins, horizon)["t"],
                "topFiveMinusMarket": (round(statistics.fmean(tops), 4) if tops else None),
                "topFiveDates": len(tops),
                "companiesMedian": (sorted(coverage)[len(coverage) // 2] if coverage else 0),
                "perOrigin": {o: ics[o] for o in origins if o in ics},
            }

        # The stage 1 measure, on the test months.
        pulls, medians = [], []
        for origin in origins:
            rows = by_origin.get(origin) or []
            usable = [r for r in rows if r["ranked"]["20"] is not None]
            if len(usable) < sc.MIN_COMPANIES:
                continue
            r = pearson([x["pullMove"] for x in usable], [x["ranked"]["20"] for x in usable])
            if r is not None:
                pulls.append(r)
            realised = [x["actual"]["20"] for x in usable if x["actual"]["20"] is not None]
            medians.append({
                "origin": origin,
                "forecast": round(statistics.median(x["ranked"]["20"] for x in usable), 4),
                "realised": round(statistics.median(realised), 4) if realised else None,
            })
        block["pullAt20"] = round(statistics.median(pulls), 4) if pulls else None
        block["pullOrigins"] = len(pulls)
        block["medianAt20"] = medians
        report["models"][name] = block

    # Paired against the original, on the origins both scored.
    if "kronos_egx" in report["models"] and "kronos_original" in report["models"]:
        report["kronosEgxAgainstOriginal"] = {
            str(h): sc.against(report["models"]["kronos_egx"]["horizons"][str(h)]["perOrigin"],
                               report["models"]["kronos_original"]["horizons"][str(h)]["perOrigin"])
            for h in HORIZONS}

    out.write_text(json.dumps(report, indent=1))

    width = max(len(n) for n in report["models"])
    print(f"{'model':<{width}}  {'h':>3}  {'rankIC':>9} {'t':>7} {'tInd':>7} {'+/dates':>9}  {'top5-mkt':>9}  {'n':>4}")
    for name, block in report["models"].items():
        for h in HORIZONS:
            b = block["horizons"][str(h)]
            s = b["rankIC"]
            mean = "  undef" if s["mean"] is None else f"{s['mean']:+9.4f}"
            t = "      -" if s["t"] is None else f"{s['t']:+7.2f}"
            ti = "      -" if b["tIndependent"] is None else f"{b['tIndependent']:+7.2f}"
            top = "        -" if b["topFiveMinusMarket"] is None else f"{b['topFiveMinusMarket']:+9.2f}"
            print(f"{name:<{width}}  {h:>3}  {mean} {t} {ti} {s['positive']:>4}/{s['dates']:<4}  {top}  {b['companiesMedian']:>4}")
        print(f"{name:<{width}}  pull@20 {block['pullAt20']}  ({block['pullOrigins']} origins)")


if __name__ == "__main__":
    main(sys.argv[1:])
