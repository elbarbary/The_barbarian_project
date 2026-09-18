"""Run one model over every frozen test origin, and record what happened next.

    python forecast_test.py <data dir> <out.jsonl> --model kronos_egx \
        [--weights <checkpoint dir>] [--device cuda]

One row per company per origin, holding what the model said at 1, 5 and 20
sessions, what the company actually did over the same sessions, and the move
back to its window's average close. Scoring is a separate script that reads
these rows, so the numbers that decide stage 2 are computed from a file that
already exists rather than from a model still in memory.

Resumable: an origin already in the output is skipped, so a killed run
continues rather than starting over. The file is append-only.
"""

import argparse
import datetime
import hashlib
import json
import os
import pathlib
import statistics
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
os.environ.setdefault("HF_HOME", str(ROOT / "hf"))
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
sys.path.insert(0, str(ROOT / "source"))

import candles as cd
import forecast as fc      # the lab's own contract and baselines, unchanged
import score as sc         # the lab's own forward_return, unchanged

HORIZONS = (1, 5, 20)
KRONOS = {"kronos_original", "kronos_egx"}


def seed(basis: str, ticker: str) -> int:
    """`scripts/lab/neural.py` `_seed`: fixed by the night and the company."""
    digest = hashlib.sha256(f"{basis}:{ticker}".encode()).digest()
    return int.from_bytes(digest[:4], "big") % (2 ** 31)


def future_sessions(basis: str, count: int) -> list[str]:
    """`scripts/lab/neural.py` `future_sessions`: EGX weekdays after the basis."""
    day = datetime.date.fromisoformat(basis[:10])
    out = []
    while len(out) < count:
        day += datetime.timedelta(days=1)
        if day.weekday() not in (4, 5):
            out.append(day.isoformat())
    return out


def kronos_predictor(weights: str, device: str):
    import torch
    from model import Kronos, KronosPredictor, KronosTokenizer
    from train import MODEL, TOKENIZER
    tokenizer = KronosTokenizer.from_pretrained(TOKENIZER[0], revision=TOKENIZER[1]).eval()
    model = (Kronos.from_pretrained(MODEL[0], revision=MODEL[1]) if weights == "original"
             else Kronos.from_pretrained(weights)).eval()
    return KronosPredictor(model, tokenizer, device=device, max_context=512), torch


def kronos_returns(predictor, torch, bars, origin, ticker):
    import pandas as pd
    frame = pd.DataFrame(bars)
    torch.manual_seed(seed(origin, ticker))
    out = predictor.predict(df=frame[["open", "high", "low", "close", "volume"]],
                            x_timestamp=pd.to_datetime(frame["date"]),
                            y_timestamp=pd.Series(pd.to_datetime(future_sessions(origin, cd.HORIZON))),
                            pred_len=cd.HORIZON, T=1.0, top_p=0.9, sample_count=5, verbose=False)
    path = [float(v) for v in out["close"]]
    last = bars[-1]["close"]
    return {h: (path[h - 1] / last - 1) * 100 for h in HORIZONS}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("data", type=pathlib.Path)
    parser.add_argument("out", type=pathlib.Path)
    parser.add_argument("--model", required=True)
    parser.add_argument("--weights", default="original")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--origins", type=int, default=None, help="smoke tests only")
    args = parser.parse_args()

    frozen = json.loads((args.data / "frozen" / "manifest.json").read_text())
    prereg = json.loads((args.data / "frozen" / "test-preregistration.json").read_text())
    if args.model not in prereg["models"]:
        raise SystemExit(f"{args.model} is not one of the frozen models")
    directory = {r["ticker"]: r for r in json.loads((args.data / "companies.json").read_text())["companies"]}
    companies, manifest = cd.load(args.data / "candles", directory)
    if manifest["sha256"] != frozen["sha256"]:
        raise SystemExit("the candles are not the frozen set")

    predictor = torch = None
    if args.model in KRONOS:
        predictor, torch = kronos_predictor(args.weights, args.device)
        if args.model == "kronos_egx" and args.weights == "original":
            raise SystemExit("kronos_egx needs --weights pointing at the frozen checkpoint")
        if args.model == "kronos_original" and args.weights != "original":
            raise SystemExit("kronos_original is the pinned upstream revision, not a checkpoint")

    origins = prereg["origins"][:args.origins]
    roster = prereg["companies"]
    segments = {t: cd.segments(companies[t]) for t in roster}

    done = set()
    if args.out.exists():
        for line in args.out.read_text().splitlines():
            if line.strip():
                done.add(json.loads(line)["origin"])
    started = time.time()
    with args.out.open("a") as sink:
        for origin in origins:
            if origin in done:
                continue
            rows, abstained = [], 0
            for ticker in roster:
                window = None
                for seg in segments[ticker]:
                    dates = [b["date"] for b in seg]
                    if origin in dates and dates.index(origin) >= cd.LOOKBACK - 1:
                        k = dates.index(origin)
                        window = seg[k - cd.LOOKBACK + 1:k + 1]
                        break
                if window is None:
                    continue
                last = window[-1]["close"]
                # The outcome comes from the company's own completed sessions,
                # exactly as the lab marks a sealed night. A company that has
                # not traded 20 more times is absent at 20 and present at 1.
                actual = {h: sc.forward_return(companies[ticker], origin, h) for h in HORIZONS}
                if all(v is None for v in actual.values()):
                    continue

                if args.model in KRONOS:
                    ranked = kronos_returns(predictor, torch, window, origin, ticker)
                    returns = ranked
                else:
                    answer = fc.run_baseline(args.model, ticker, origin, window)
                    if isinstance(answer, fc.Abstention):
                        abstained += 1
                        continue
                    ranked = {h: answer.rank_value(h) for h in HORIZONS}
                    returns = {h: answer.returns.get(h) for h in HORIZONS}
                    if any(v is None for v in ranked.values()):
                        abstained += 1
                        continue

                rows.append({
                    "ticker": ticker,
                    "close": last,
                    # The stage 1 measure, kept so the pull can be read on the
                    # test months with the same definition it had on 2024.
                    "pullMove": round((statistics.fmean(b["close"] for b in window) / last - 1) * 100, 4),
                    "ranked": {str(h): round(ranked[h], 6) for h in HORIZONS},
                    "returns": {str(h): (None if returns[h] is None else round(returns[h], 6))
                                for h in HORIZONS},
                    "actual": {str(h): (None if actual[h] is None else round(actual[h], 6))
                               for h in HORIZONS},
                })

            sink.write(json.dumps({"model": args.model, "origin": origin,
                                   "answered": len(rows), "abstained": abstained,
                                   "rows": rows}) + "\n")
            sink.flush()
            print(f"{time.strftime('%H:%M:%S')} {origin}: {len(rows)} answered, {abstained} abstained, "
                  f"median h20 forecast {statistics.median(r['ranked']['20'] for r in rows):+.2f}%"
                  if rows else f"{time.strftime('%H:%M:%S')} {origin}: nothing scorable", flush=True)

    print(json.dumps({"model": args.model, "weights": args.weights, "origins": len(origins),
                      "seconds": round(time.time() - started)}), flush=True)


if __name__ == "__main__":
    main()
