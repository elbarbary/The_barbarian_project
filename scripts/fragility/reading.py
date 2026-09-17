#!/usr/bin/env python3
"""The crash-warning model's reading for the newest session, from the owner's own code.

Until 17 September 2026 the reading on the site was the research run's last
session, 9 September, copied out of its files: nothing recomputed it, because
the code that made two of those files had never been committed. It was found
in the research session that wrote it (the world monitor study of 11–12
September), and replaying it against the committed inputs gives back every
published session. This runs that code on the newest sessions.

WHAT RUNS, IN ORDER
-------------------
1. The dataset. The research's rows up to stores.COMPLETE_THROUGH as
   published, then every session after it, built by build_v2_dataset.py from
   the inputs fetch.py adds to. stores.py says why history is never rebuilt,
   and why the research's own last day, 9 September, is taken again.
2. The engine. run_v5_precision_engine.score_arrays: the stress score S_v4,
   its internal and external halves, its five-session slope and the count of
   stressed groups. The same function main() evaluates, with one difference:
   each year's logistic regressions are not fitted again but rebuilt from
   data-source/fragility/engine_fits.json, the fits the research machine made.
   Fitted again on a GitHub runner, the same code on the same data scored
   9 September 0.4540 on Linux and 0.4534 on macOS against the published
   0.4528, because the solver stops at a slightly different point on each
   maths library. A year with no saved fit (2027 onwards) is fitted once, on
   sessions at least 25 before it starts, and saved beside the others.
3. The warning. Challenger C-v2 as frozen on 11 September 2026: S_v4 at 0.930
   or more on two sessions in a row with a non-negative slope, or at 0.90 with
   a commodity shock (0.60) or a global risk shock (0.45); at least one
   stressed group; a hold of 5 to 8 sessions; 20 sessions before it can fire
   again. Its alert episodes are c_v2_alert_episodes.json.
4. The world monitor. Gold, oil and market-swing stress, each 0 to 1, and
   their 45/35/20 blend, which sizes the partial protection at 25% plus 35%
   of the blend.
5. Where the approaches stood. The rule (cash until the EGX 30 closes above
   its 20-session average) and the partial protection (C-v5-P), session by
   session, as executed_trades_history.json and the simulation series record.

test_reading.py replays all five on the research's own sessions and requires
every published figure back, which is what keeps this the research's model
rather than a lookalike of it.

    python3 scripts/fragility/reading.py                 # write the reading
    python3 scripts/fragility/reading.py --check-inputs  # fail on a stale input
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import sys

import numpy as np

import stores

sys.path.insert(0, str(stores.REPO / "scripts"))
import build_v2_dataset as builder  # noqa: E402
import run_v5_precision_engine as v5  # noqa: E402

DATASET = stores.FRAGILITY / "v2_dataset_daily.json"
FITS = stores.FRAGILITY / "engine_fits.json"
RESULTS = stores.REPO / "public" / "data" / "v1" / "backtest" / "v5_experiment_results.json"
OUT = stores.REPO / "public" / "esthmr" / "backtest" / "model_reading.json"

# The groups the engine counts stress in; stress_count never exceeds it.
STRESS_GROUPS = 7
# The warning's consensus line, as the notebook states it. fragility-overview.js
# holds the same number as ALERT_LINE.
ALERT_LINE = 0.93
# The volatility brake: the partial protection does not step back in while the
# EGX 30's 20-session volatility is above this and rising.
VOL_BRAKE = 0.28
# C-v5-P, the partial protection the page shows: gold, oil, swings.
WEIGHTS = (0.45, 0.35, 0.20)
# An input this many days older than the session it is read for is stale.
STALE_AFTER_DAYS = 7


def research_dataset() -> tuple[dict, list[dict]]:
    """The research's dataset exactly as it was published."""
    doc = json.loads(DATASET.read_text(encoding="utf-8"))
    return doc["metadata"], doc["rows"]


def live_dataset() -> tuple[dict, list[dict]]:
    """The research's complete rows, then every session after them from today's inputs."""
    research_meta, research_rows = research_dataset()
    kept = [row for row in research_rows if row["date"] <= stores.COMPLETE_THROUGH]
    metadata, built, _ = builder.compute_v2_dataset()
    if [row["date"] for row in built[:len(kept)]] != [row["date"] for row in kept]:
        raise SystemExit("the EGX 30 store no longer begins with the research's sessions")
    if metadata["episodes"][:len(research_meta["episodes"])] != research_meta["episodes"]:
        raise SystemExit("the crash episodes found in the EGX 30 store differ from the research's")
    return metadata, kept + [row for row in built if row["date"] > stores.COMPLETE_THROUGH]


def load_fits() -> dict:
    return json.loads(FITS.read_text(encoding="utf-8")) if FITS.exists() else {}


def save_fits(fits: dict) -> bool:
    """Write the fits only when one was added. True if the file changed."""
    body = json.dumps(dict(sorted(fits.items())), indent=1) + "\n"
    if FITS.exists() and FITS.read_text(encoding="utf-8") == body:
        return False
    FITS.write_text(body, encoding="utf-8")
    return True


def compute(rows: list[dict], metadata: dict, read=stores.read, fits: dict | None = None) -> dict:
    """Every series the reading is taken from, one value per session.

    `read` gives an input's closes by name; the replay passes one that holds
    the research's own 9 September inputs. `fits` holds each year's
    classifiers; a year missing from it is fitted and added to it.
    """
    dates = [row["date"] for row in rows]
    returns = np.array([row["return_egx30"] for row in rows], dtype=float)
    prices = np.array([row["price_egx30"] for row in rows], dtype=float)
    T = len(rows)
    years = np.array([int(day[:4]) for day in dates])
    test_years = sorted(list(set(years[np.where(years >= 2008)[0]])))
    engine = v5.score_arrays(rows, metadata, dates, returns, prices, T, years, test_years,
                             fitted=fits if fits is not None else load_fits())
    s_v4, s_slope5, stress_count = engine["s_v4"], engine["s_slope5"], engine["stress_count"]
    if int(np.max(stress_count)) > STRESS_GROUPS:
        raise SystemExit(f"a stress count of {int(np.max(stress_count))} is more groups than the engine has")

    # From here to the weights, the world monitor study's generator, as it ran.
    def align(name: str) -> np.ndarray:
        series = read(name)
        out = np.zeros(T)
        last = 0.0
        for i, day in enumerate(dates):
            if day in series:
                last = float(series[day])
            out[i] = last
        return out

    vol20 = np.zeros(T, dtype=float)
    for i in range(19, T):
        vol20[i] = np.std(returns[i - 19:i + 1]) * math.sqrt(252.0)

    gold, ovx = align("gold"), align("ovx")
    bvol = align("brent_realized_vol20") * 100.0
    go_ratio = align("gold_oil_ratio")
    brent, wheat, vix, dxy, eem = (align(n) for n in ("brent", "wheat", "vix", "dxy", "msci_em"))

    gret20, bret20, wret20, dret20, eret20 = (np.zeros(T) for _ in range(5))
    for i in range(20, T):
        if gold[i - 20] > 0: gret20[i] = (gold[i] - gold[i - 20]) / gold[i - 20]
        if brent[i - 20] > 0: bret20[i] = (brent[i] - brent[i - 20]) / brent[i - 20]
        if wheat[i - 20] > 0: wret20[i] = (wheat[i] - wheat[i - 20]) / wheat[i - 20]
        if dxy[i - 20] > 0: dret20[i] = (dxy[i] - dxy[i - 20]) / dxy[i - 20]
        if eem[i - 20] > 0: eret20[i] = -(eem[i] - eem[i - 20]) / eem[i - 20]
    vix_delta5 = np.zeros(T)
    for i in range(5, T):
        vix_delta5[i] = vix[i] - vix[i - 5]
    goz60 = np.zeros(T)
    for i in range(60, T):
        window = go_ratio[i - 60:i]
        spread = np.std(window)
        if spread > 1e-4:
            goz60[i] = (go_ratio[i] - np.mean(window)) / spread

    cat_comm = np.maximum(np.clip(bret20 / 0.25, 0.0, 1.0), np.clip(wret20 / 0.25, 0.0, 1.0))
    cat_volrisk = (0.40 * np.clip(vix_delta5 / 8.0, 0.0, 1.0) + 0.20 * np.clip((vix - 20.0) / 20.0, 0.0, 1.0)
                   + 0.20 * np.clip(eret20 / 0.10, 0.0, 1.0) + 0.20 * np.clip(dret20 / 0.05, 0.0, 1.0))

    warning = np.zeros(T, dtype=int)
    state = held = refractory = 0
    for i in range(2, T):
        if refractory > 0:
            refractory -= 1
            continue
        consensus = s_v4[i] >= 0.930 and s_v4[i - 1] >= 0.930
        triggered = ((consensus and s_slope5[i] >= 0.000 and stress_count[i] >= 1)
                     or (s_v4[i] >= 0.90 and cat_comm[i] >= 0.60 and stress_count[i] >= 1)
                     or (s_v4[i] >= 0.90 and cat_volrisk[i] >= 0.45 and stress_count[i] >= 1))
        if state == 0:
            if triggered:
                state = held = 1
                warning[i] = 1
        else:
            held += 1
            warning[i] = 1
            if held >= 5 and (((s_v4[i] < 0.885) and (cat_comm[i] < 0.42) and (cat_volrisk[i] < 0.315))
                              or held >= 8):
                state = 0
                refractory = 20

    G = np.maximum(np.clip(gret20 / 0.08, 0.0, 1.0), np.clip((goz60 - 1.0) / 2.0, 0.0, 1.0))
    P = np.maximum(np.clip(bret20 / 0.25, 0.0, 1.0), np.clip((bvol - 30.0) / 30.0, 0.0, 1.0))
    V = np.maximum(np.clip((ovx - 35.0) / 30.0, 0.0, 1.0), np.clip((vix - 20.0) / 20.0, 0.0, 1.0))
    outside = WEIGHTS[0] * G + WEIGHTS[1] * P + WEIGHTS[2] * V

    # The approaches trade from 2008, as the research's simulations do.
    start = int(np.where(years >= 2008)[0][0])
    partial = _partial_weights(warning[start:], vol20[start:], G[start:], P[start:], V[start:])
    rule = _rule_weights(warning[start:], prices[start:])

    transmission = ((engine["breadth"] <= 0.45) | (engine["delta_beta"] > 0.0) | (engine["ret20"] <= 0.0)
                    | (engine["vol_accel"] > 0.0) | (engine["fx_strain"] > 0.0))
    return {
        "dates": dates, "prices": prices, "start": start, "s_v4": s_v4, "s_slope5": s_slope5,
        "u_int": engine["u_int"], "u_ext": engine["u_ext"], "stress_count": stress_count,
        "transmission": transmission, "cat_comm": cat_comm, "cat_volrisk": cat_volrisk,
        "warning": warning, "vol20": vol20, "gold": G, "oil": P, "swings": V, "outside": outside,
        "partial": np.concatenate([np.ones(start), partial]), "rule": np.concatenate([np.ones(start), rule]),
    }


def _partial_weights(al, vol20, G, P, V):
    """C-v5-P's share in the index: a hedge sized by the world monitor, stepped back in over three sessions."""
    wg, wp, wv = WEIGHTS
    n = len(al)
    w = np.ones(n)
    state = 0
    hedge = 0.40
    step = 0
    for i in range(1, n):
        vol = vol20[i - 1]
        vol_prev = vol20[i - 2] if i >= 2 else vol
        paused = (vol > VOL_BRAKE) and (vol > vol_prev)
        if al[i - 1] == 1:
            hedge = 0.25 + 0.35 * min(1.0, wg * G[i - 1] + wp * P[i - 1] + wv * V[i - 1])
            w[i] = 1.0 - hedge
            state = 1
            step = 0
        elif state in [1, 2]:
            if paused:
                w[i] = 1.0 - hedge
                state = 2
            else:
                step = 1
                w[i] = (1.0 - hedge) + (1.0 / 3.0) * hedge
                state = 3
        elif state == 3:
            step += 1
            if step == 2:
                w[i] = (1.0 - hedge) + (2.0 / 3.0) * hedge
            elif step >= 3:
                w[i] = 1.00
                state = 0
                step = 0
        else:
            w[i] = 1.00
            state = 0
    return w


def _rule_weights(al, prices):
    """The rule's share in the index: all out on a warning, back when the EGX 30 closes above its 20-session average."""
    n = len(al)
    sma20 = np.zeros(n)
    for i in range(19, n):
        sma20[i] = np.mean(prices[i - 19:i + 1])
    w = np.ones(n)
    defending = False
    for t in range(n - 1):
        warned = al[t] == 1
        if not defending:
            if warned:
                defending = True
                w[t + 1] = 0.0
        elif (not warned) and prices[t] > sma20[t]:
            defending = False
            w[t + 1] = 1.0
        else:
            w[t + 1] = 0.0
    return w


def document(c: dict, read=stores.read) -> dict:
    """The published reading: the newest session, the sessions after the research, the inputs' ages."""
    results = json.loads(RESULTS.read_text(encoding="utf-8"))
    production = results["v5_recommended_production"]
    i = len(c["dates"]) - 1
    vol20 = c["vol20"]
    return {
        "schemaVersion": 2,
        "date": c["dates"][i],
        "researchEnd": stores.RESEARCH_END,
        "egx30": float(c["prices"][i]),
        "warning": bool(c["warning"][i]),
        "score": round(float(c["s_v4"][i]), 4),
        "alertLine": ALERT_LINE,
        "engineInternal": round(float(c["u_int"][i]), 4),
        "engineExternal": round(float(c["u_ext"][i]), 4),
        "stressGroups": int(c["stress_count"][i]),
        "stressGroupsOf": STRESS_GROUPS,
        "transmission": bool(c["transmission"][i]),
        "outside": round(float(c["outside"][i]), 2),
        "gold": round(float(c["gold"][i]), 2),
        "oil": round(float(c["oil"][i]), 2),
        "swings": round(float(c["swings"][i]), 2),
        "vol20": round(float(vol20[i]) * 100.0, 1),
        "volBrakeActive": bool(vol20[i] > VOL_BRAKE and vol20[i] > vol20[i - 1]),
        "rulePercent": round(float(c["rule"][i]) * 100.0, 1),
        "equityPercent": round(float(c["partial"][i]) * 100.0, 1),
        "partialPercent": round((0.25 + 0.35 * float(c["outside"][i])) * 100.0, 1),
        "sessions": [
            {"date": c["dates"][k], "egx30": float(c["prices"][k]), "score": round(float(c["s_v4"][k]), 4),
             "warning": bool(c["warning"][k]), "outside": round(float(c["outside"][k]), 2),
             "rulePercent": round(float(c["rule"][k]) * 100.0, 1),
             "equityPercent": round(float(c["partial"][k]) * 100.0, 1)}
            for k in range(len(c["dates"])) if c["dates"][k] > stores.RESEARCH_END
        ],
        "inputs": {name: max(read(name)) for name in stores.STORES},
        "v5": {
            "model": results["metadata"]["recommended_model_name"],
            "years": results["metadata"]["eval_years"],
            "earlyHits": production["early"],
            "crises": production["total_crises"],
            "hardFalseAlarmsPerYear": production["hard_fa_yr"],
            "occupancyPercent": production["occ"],
            "precisionPercent": production["precision"],
            "leadSessions": production["lead"],
            "utility": production["utility"],
        },
    }


def stale(doc: dict, today: str) -> list[str]:
    """The inputs that have fallen behind, as sentences."""
    session = dt.date.fromisoformat(doc["date"])
    out = []
    for name, newest in sorted(doc["inputs"].items()):
        gap = (session - dt.date.fromisoformat(newest)).days
        if gap > STALE_AFTER_DAYS:
            out.append(f"{name} ends on {newest}, {gap} days before the session it is read for")
    behind = (dt.date.fromisoformat(today) - session).days
    if behind > STALE_AFTER_DAYS + 3:
        out.append(f"the newest EGX 30 session is {doc['date']}, {behind} days ago")
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check-inputs", action="store_true",
                        help="fail when the published reading's inputs have fallen behind")
    args = parser.parse_args(argv)
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()

    if args.check_inputs:
        behind = stale(json.loads(OUT.read_text(encoding="utf-8")), today)
        for sentence in behind:
            print(f"::error title=Crash-warning input behind::{sentence}")
        return 1 if behind else 0

    metadata, rows = live_dataset()
    fits = load_fits()
    doc = document(compute(rows, metadata, fits=fits))
    if save_fits(fits):
        print("   a new year's classifiers were fitted and saved to engine_fits.json")
    text = json.dumps(doc, ensure_ascii=False, indent=1) + "\n"
    held = OUT.read_text(encoding="utf-8") if OUT.exists() else None
    if held != text:
        OUT.write_text(text, encoding="utf-8")
    print(f"── Crash-warning reading for {doc['date']}: score {doc['score']}, "
          f"warning {'on' if doc['warning'] else 'off'}, outside {doc['outside']}, "
          f"rule {doc['rulePercent']}% in the index, partial {doc['equityPercent']}% "
          f"({len(doc['sessions'])} sessions since the research)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
