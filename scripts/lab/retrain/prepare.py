"""Freeze the pilot's data and write down its evaluation before any training.

    python prepare.py <candles dir> <companies.json> <out dir>

Writes `manifest.json` (every company's candles by SHA-256, what cleaning
dropped, window counts by split) and `preregistration.json` (the validation
origins, companies and window sample the stop rule is read on, and the three
thresholds). Both are written once. Nothing about the pilot's results can
change them, because the pilot does not exist yet.
"""

import collections
import json
import pathlib
import random
import sys

import candles as cd

SEED = 100            # upstream's finetune seed
VALIDATION_WINDOWS = 20_000   # upstream: 400 iterations x batch 50
ORIGIN_EVERY = 10     # every 10th session of the validation year
COMPANIES = 120

RULES = {
    "pullAt20": {"max": 0.5, "what": "median over validation origins of the cross-company Pearson correlation "
                 "between the 20-session forecast and the move back to the 90-candle average close"},
    "steadyRiseAt20": {"min": -5.0, "what": "mean 20-session forecast, in %, over 5 made-up steady rises "
                       "from 100 to 130 in 90 sessions (the original drew -16.2%)"},
    "validationLoss": {"below": "original", "what": "mean next-token loss over the fixed validation windows, "
                       "both models scaled by the past alone"},
}


def main(argv):
    candles_dir, directory_path, out = map(pathlib.Path, argv)
    directory = {r["ticker"]: r for r in json.loads(directory_path.read_text())["companies"]}
    companies, manifest = cd.load(candles_dir, directory)
    panel = cd.Panel(companies)
    manifest["windows"] = {k: len(v) for k, v in panel.windows.items()}
    manifest["segments"] = len(panel.names)
    manifest["settings"] = {"lookback": cd.LOOKBACK, "horizon": cd.HORIZON, "window": cd.WINDOW,
                            "clip": cd.CLIP, "gapDays": cd.GAP_DAYS, "step": cd.STEP, "splits": cd.SPLITS}

    # The market's sessions: dates on which at least half the companies with a
    # candle that year traded, so a quiet holiday print is not a session.
    by_year = collections.defaultdict(collections.Counter)
    active = collections.defaultdict(set)
    for ticker, bars in companies.items():
        for b in bars:
            by_year[b["date"][:4]][b["date"]] += 1
            active[b["date"][:4]].add(ticker)
    first, last = cd.SPLITS["validation"]
    year = first[:4]
    sessions = sorted(d for d, n in by_year[year].items() if n >= len(active[year]) / 2)
    # An origin needs its 20 sessions inside the validation year.
    usable = [d for i, d in enumerate(sessions) if i + cd.HORIZON < len(sessions)]
    origins = usable[::ORIGIN_EVERY]

    # Companies with one clean segment that covers the whole validation year
    # with 90 candles to spare before its first origin.
    covering = []
    for s, (ticker, _) in enumerate(panel.names):
        dates = panel.dates[s]
        if dates[-1] >= origins[-1] and sum(1 for d in dates if d < origins[0]) >= cd.LOOKBACK:
            covering.append(ticker)
    covering = sorted(set(covering))
    rng = random.Random(SEED)
    chosen = sorted(rng.sample(covering, min(COMPANIES, len(covering))))

    rng = random.Random(SEED + 1)
    validation = panel.windows["validation"]
    sample = sorted(rng.sample(range(len(validation)), min(VALIDATION_WINDOWS, len(validation))))
    sample_pairs = [validation[i] for i in sample]

    prereg = {
        "writtenBeforeTraining": True,
        "manifestSha256": manifest["sha256"],
        "rules": RULES,
        "origins": origins,
        "companies": chosen,
        "companiesCovering": len(covering),
        "validationWindows": [[panel.names[s][0], panel.names[s][1], start] for s, start in sample_pairs],
        "forecast": {"lookback": cd.LOOKBACK, "horizon": cd.HORIZON, "samples": 5, "T": 1.0, "top_p": 0.9,
                     "seed": "sha256(f'{origin}:{ticker}') as scripts/lab/neural.py _seed",
                     "future": "scripts/lab/neural.py future_sessions (Sun-Thu)"},
    }
    out.mkdir(parents=True, exist_ok=True)
    for name, doc in (("manifest.json", manifest), ("preregistration.json", prereg)):
        path = out / name
        if path.exists():
            raise SystemExit(f"{path} already exists; it is written once")
        path.write_text(json.dumps(doc, indent=1))
    print(f"{len(companies)} companies, {manifest['segments']} segments, windows {manifest['windows']}; "
          f"{len(origins)} validation origins ({origins[0]} to {origins[-1]}), {len(chosen)} of {len(covering)} "
          f"covering companies, {len(sample_pairs)} validation windows; manifest {manifest['sha256'][:16]}")


if __name__ == "__main__":
    main(sys.argv[1:])
