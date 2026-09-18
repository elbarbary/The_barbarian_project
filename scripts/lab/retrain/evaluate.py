"""Stage 1 stop rule, for one set of weights.

    python evaluate.py <data dir> <out.json> --weights original|<checkpoint dir> [--device cpu] [--threads 4]

Reads the preregistered validation origins and companies, forecasts each
company at each origin exactly as the lab does (90 candles in, 5 sampled paths,
T 1.0, top-p 0.9, seeded by night and company, Sunday-Thursday future dates),
and measures:

  pullAt20        the median, over origins, of the cross-company Pearson
                  correlation between the 20-session forecast and the move
                  back to the average close of the 90 candles read;
  steadyRiseAt20  the mean 20-session forecast over five made-up steady rises
                  from 100 to 130 in 90 sessions.

Progress is written origin by origin, so a killed run resumes where it stopped.
"""

import argparse
import datetime
import hashlib
import json
import os
import pathlib
import random
import statistics
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
os.environ.setdefault("HF_HOME", str(ROOT / "hf"))
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
sys.path.insert(0, str(ROOT / "source"))

import numpy as np
import pandas as pd
import torch

import candles as cd
from model import Kronos, KronosPredictor, KronosTokenizer
from train import MODEL, TOKENIZER


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


def forecast(predictor, bars, basis, seed_value):
    frame = pd.DataFrame(bars)
    torch.manual_seed(seed_value)
    out = predictor.predict(df=frame[["open", "high", "low", "close", "volume"]],
                            x_timestamp=pd.to_datetime(frame["date"]),
                            y_timestamp=pd.Series(pd.to_datetime(future_sessions(basis, cd.HORIZON))),
                            pred_len=cd.HORIZON, T=1.0, top_p=0.9, sample_count=5, verbose=False)
    return [float(v) for v in out["close"]]


def sessions_back(end: str, n: int) -> list[str]:
    day = datetime.date.fromisoformat(end)
    out = []
    while len(out) < n:
        if day.weekday() not in (4, 5):
            out.append(day.isoformat())
        day -= datetime.timedelta(days=1)
    return out[::-1]


def steady_rise(predictor, rep: int) -> float:
    """A rise from 100 to 130 over 90 sessions with 0.4% noise; its 20-session forecast in %."""
    rng = random.Random(rep)
    closes = [(100 + 30 * i / (cd.LOOKBACK - 1)) * (1 + rng.gauss(0, 0.004)) for i in range(cd.LOOKBACK)]
    bars, prev = [], closes[0]
    for day, close in zip(sessions_back("2026-09-15", cd.LOOKBACK), closes):
        high = max(prev, close) * (1 + rng.uniform(0, 0.006))
        low = min(prev, close) * (1 - rng.uniform(0, 0.006))
        bars.append({"date": day, "open": prev, "high": high, "low": low, "close": close,
                     "volume": rng.uniform(0.8, 1.2) * 1e6})
        prev = close
    path = forecast(predictor, bars, "2026-09-15", rep)
    return (path[cd.HORIZON - 1] / bars[-1]["close"] - 1) * 100


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("data", type=pathlib.Path)
    parser.add_argument("out", type=pathlib.Path)
    parser.add_argument("--weights", default="original")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--threads", type=int, default=4)
    parser.add_argument("--origins", type=int, default=None, help="smoke tests only")
    parser.add_argument("--companies", type=int, default=None, help="smoke tests only")
    args = parser.parse_args()
    torch.set_num_threads(args.threads)

    frozen = json.loads((args.data / "frozen" / "manifest.json").read_text())
    prereg = json.loads((args.data / "frozen" / "preregistration.json").read_text())
    directory = {r["ticker"]: r for r in json.loads((args.data / "companies.json").read_text())["companies"]}
    companies, manifest = cd.load(args.data / "candles", directory)
    if manifest["sha256"] != frozen["sha256"]:
        raise SystemExit("the candles are not the frozen set")

    tokenizer = KronosTokenizer.from_pretrained(TOKENIZER[0], revision=TOKENIZER[1]).eval()
    model = (Kronos.from_pretrained(MODEL[0], revision=MODEL[1]) if args.weights == "original"
             else Kronos.from_pretrained(args.weights)).eval()
    predictor = KronosPredictor(model, tokenizer, device=args.device, max_context=512)

    origins = prereg["origins"][:args.origins]
    chosen = prereg["companies"][:args.companies]
    segments = {t: cd.segments(companies[t]) for t in chosen}
    progress_path = args.out.with_suffix(".progress.jsonl")
    done = {}
    if progress_path.exists():
        for line in progress_path.read_text().splitlines():
            row = json.loads(line)
            done[row["origin"]] = row
    started = time.time()
    with progress_path.open("a") as progress:
        for origin in origins:
            if origin in done:
                continue
            rows = []
            for ticker in chosen:
                for seg in segments[ticker]:
                    dates = [b["date"] for b in seg]
                    if origin in dates and dates.index(origin) >= cd.LOOKBACK - 1:
                        k = dates.index(origin)
                        bars = seg[k - cd.LOOKBACK + 1:k + 1]
                        last = bars[-1]["close"]
                        move = (statistics.fmean(b["close"] for b in bars) / last - 1) * 100
                        path = forecast(predictor, bars, origin, seed(origin, ticker))
                        rows.append({"ticker": ticker, "move": round(move, 4),
                                     **{f"h{h}": round((path[h - 1] / last - 1) * 100, 4) for h in (1, 5, 20)}})
                        break
            r = (float(np.corrcoef([x["move"] for x in rows], [x["h20"] for x in rows])[0, 1])
                 if len(rows) >= 30 else None)
            row = {"origin": origin, "n": len(rows), "r": r, "rows": rows}
            progress.write(json.dumps(row) + "\n")
            progress.flush()
            done[origin] = row
            print(f"{time.strftime('%H:%M:%S')} {origin}: {len(rows)} companies, pull r {r if r is None else round(r, 3)}, "
                  f"median h20 {statistics.median(x['h20'] for x in rows):+.2f}%", flush=True)

    per_origin = [done[o] for o in origins]
    rs = [o["r"] for o in per_origin if o["r"] is not None]
    rises = [steady_rise(predictor, rep) for rep in range(5)]
    result = {
        "weights": args.weights, "device": args.device, "seconds": round(time.time() - started),
        "pullAt20": round(statistics.median(rs), 4) if rs else None,
        "originsScored": len(rs),
        "perOrigin": [{"origin": o["origin"], "n": o["n"], "r": o["r"],
                       "medianH20": statistics.median(x["h20"] for x in o["rows"]),
                       "medianMove": statistics.median(x["move"] for x in o["rows"])} for o in per_origin],
        "steadyRiseAt20": round(statistics.fmean(rises), 4),
        "steadyRises": [round(v, 4) for v in rises],
    }
    args.out.write_text(json.dumps(result, indent=1))
    print(json.dumps({k: v for k, v in result.items() if k != "perOrigin"}), flush=True)


if __name__ == "__main__":
    main()
