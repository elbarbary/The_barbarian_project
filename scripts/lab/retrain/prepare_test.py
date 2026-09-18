"""Freeze stage 2 before a single test origin is read.

    python prepare_test.py <data dir> <checkpoint dir> <out dir>

Stage 1 asked whether the retrained model still pulls every forecast back to
its window's average. It does not. That question was answered on 2024, which
is also the year the checkpoint was CHOSEN on — early stopping read a
validation loss computed from 2024 windows — so 2024 cannot also be the exam.

This writes the exam paper. It records the weights by SHA-256, the origins,
the companies, the settings and the pass rule, and it is written ONCE. After
this file exists, the only honest thing left to do is run the models and read
the result. The plan's rule: one reading. A failed test is not retuned against
the test months, because a backtest that is allowed a second attempt is only
measuring how many attempts it was allowed.
"""

import collections
import hashlib
import json
import pathlib
import sys

import candles as cd

ORIGIN_EVERY = 5          # plan, stage 2: "forecast every 5th test session"

# The models the test runs, by the name they are scored under. The two Kronos
# variants see identical inputs; the six baselines are the lab's own, taken
# unchanged from `scripts/lab/forecast.py` so that "no lower than the
# original's" is measured against the same code the nightly run uses.
MODELS = ["kronos_original", "kronos_egx",
          "flat", "drift", "momentum20", "momentum60", "reversal1", "reversal5"]

# The plan's pass rule, copied here so the decision reads its own copy and
# never the prose. Both must hold.
RULES = {
    "pullAt20": {
        "max": 0.5,
        "what": "median over test origins of the cross-company Pearson correlation "
                "between the 20-session forecast and the move back to the 90-candle "
                "average close",
    },
    "rankIC": {
        "notBelowOriginalAt": [5, 20],
        "aboveZeroAt": [5],
        "what": "mean rank IC (Spearman, scripts/lab/score.py) over test origins; "
                "kronos_egx must not be below kronos_original at 5 and at 20 "
                "sessions, and must be above zero at 5",
    },
}

# Every baseline gets the same 90 candles Kronos gets, not the company's whole
# history. The lab hands its baselines everything, which is right for a nightly
# run; here the question is narrower — which model reads the SAME window
# better — and a baseline with a longer memory would be answering a different
# one. momentum60 and drift need 61 closes, and 90 is enough for both.
BASELINE_LOOKBACK = cd.LOOKBACK


def digest(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def market_sessions(companies: dict, first: str, last: str) -> list[str]:
    """Dates the market traded, so a lone holiday print is not a session.

    Counted per calendar year against the companies that have any candle that
    year — the listed universe changes, and a fixed denominator would drop
    2026's sessions for having fewer names than 2025.
    """
    by_year = collections.defaultdict(collections.Counter)
    active = collections.defaultdict(set)
    for ticker, bars in companies.items():
        for b in bars:
            by_year[b["date"][:4]][b["date"]] += 1
            active[b["date"][:4]].add(ticker)
    out = []
    for year, counts in by_year.items():
        floor = len(active[year]) / 2
        out += [d for d, n in counts.items() if n >= floor and first <= d <= last]
    return sorted(out)


def main(argv):
    data, checkpoint, out = map(pathlib.Path, argv)
    frozen = json.loads((data / "frozen" / "manifest.json").read_text())
    train_metrics = json.loads((checkpoint.parent / "metrics.json").read_text())
    directory = {r["ticker"]: r for r in json.loads((data / "companies.json").read_text())["companies"]}
    companies, manifest = cd.load(data / "candles", directory)
    if manifest["sha256"] != frozen["sha256"]:
        raise SystemExit("the candles are not the frozen set")

    first, last = cd.SPLITS["test"]
    sessions = market_sessions(companies, first, last)
    # An origin needs its 20th following session to exist, or there is no
    # outcome to mark the 20-session forecast against.
    usable = [d for i, d in enumerate(sessions) if i + cd.HORIZON < len(sessions)]
    origins = usable[::ORIGIN_EVERY]

    # Every company in the frozen set is asked. There is no sampling: a
    # company that cannot be forecast at an origin — too little history, a
    # gap, no outcome yet — is ABSENT from that origin, which is what the lab
    # does, and is not the same as being wrong. Fixing the roster here and
    # letting coverage vary is the only version of this that cannot be tuned.
    roster = sorted(companies)

    scorable = collections.Counter()
    for ticker in roster:
        dates_by_segment = [[b["date"] for b in seg] for seg in cd.segments(companies[ticker])]
        for origin in origins:
            for dates in dates_by_segment:
                if origin in dates and dates.index(origin) >= cd.LOOKBACK - 1:
                    scorable[origin] += 1
                    break

    best = min(train_metrics["epochs"], key=lambda e: e["validation"]["loss"])
    prereg = {
        "writtenBeforeAnyTestOriginWasRead": True,
        "stage": 2,
        "manifestSha256": manifest["sha256"],
        "checkpoint": {
            "epoch": best["epoch"],
            "validationLoss": best["validation"]["loss"],
            "originalValidationLoss": train_metrics["original"]["loss"],
            "modelSha256": digest(checkpoint / "model.safetensors"),
            "configSha256": digest(checkpoint / "config.json"),
        },
        "split": {"test": list(cd.SPLITS["test"])},
        "originEvery": ORIGIN_EVERY,
        "origins": origins,
        "companies": roster,
        "companiesScorablePerOrigin": {
            "min": min(scorable.values()), "max": max(scorable.values()),
            "median": sorted(scorable.values())[len(scorable) // 2],
        },
        "models": MODELS,
        "settings": {
            "lookback": cd.LOOKBACK, "horizons": [1, 5, 20],
            "samples": 5, "T": 1.0, "top_p": 0.9,
            "seed": "sha256(f'{origin}:{ticker}') as scripts/lab/neural.py _seed",
            "future": "scripts/lab/neural.py future_sessions (Sun-Thu)",
            "baselineLookback": BASELINE_LOOKBACK,
            "realised": "scripts/lab/score.py forward_return, on the company's own "
                        "completed sessions",
            "rankIC": "scripts/lab/score.py rank_ic (Spearman, average ranks, "
                      "None below 30 companies or on a degenerate ranking)",
        },
        "rules": RULES,
        "oneReading": "A failed test is not retuned against these months. A second "
                      "attempt would need test months that do not exist yet, and "
                      "would be labelled as one.",
    }

    out.mkdir(parents=True, exist_ok=True)
    path = out / "test-preregistration.json"
    if path.exists():
        raise SystemExit(f"{path} already exists; it is written once")
    path.write_text(json.dumps(prereg, indent=1))
    print(f"{len(origins)} test origins ({origins[0]} to {origins[-1]}) of {len(sessions)} sessions; "
          f"{len(roster)} companies, {prereg['companiesScorablePerOrigin']['median']} scorable at the "
          f"median origin; checkpoint epoch {best['epoch']} "
          f"sha256 {prereg['checkpoint']['modelSha256'][:16]}")


if __name__ == "__main__":
    main(sys.argv[1:])
