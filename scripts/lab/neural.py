#!/usr/bin/env python3
"""The pretrained forecasters, behind the same contract as three lines of arithmetic.

WHICH MODELS, AND WHY THESE
---------------------------
**Kronos-small** (24.7M parameters) is the only one of the three built for
this data. It is a candlestick model: it reads open, high, low, close and
volume as a sequence of discrete tokens, pretrained on 12 billion K-lines
from 45 exchanges, and it is the domain specialist among general
forecasters. It is also the only one with a measured record on this
exchange — eight frozen dates in late August 2026, mean rank IC +0.050
against +0.022 for a one-session reversal and -0.056 for 20-session
momentum.

**Chronos-2** and **TimesFM 2.5** are general time-series foundation models
and are here as the honest comparators. They see the close and nothing else,
which is the point: if a candlestick specialist cannot beat a model that was
never shown a candlestick, that is worth knowing.

**Toto 2.0** (Datadog, 313M) and **Sundial** (Tsinghua, 128M) were added on
15 September 2026 as two more close-only comparators, picked for being built
differently from the three above rather than for any score: Toto was
pretrained with a large share of observability metrics and predicts
quantiles in one pass; Sundial generates futures by flow matching. Both are
Apache-2.0 on their model cards, checked because this is a commercial site —
Moirai's weights are non-commercial and are not run here. Neither has a
record on this exchange; running them nightly is how they get one.

WHAT THEY ARE NOT ALLOWED TO DO
-------------------------------
Skip a company quietly. Every one of them abstains through the same
`Abstention` the baselines use, with a reason, and the run records how many.
A model scored on only the companies it found easy is a model scored on the
easy half of the market.

Take a bar from after the basis. `run.py` trims the history before any model
sees it; nothing here reaches for more.

Be loaded when it is not wanted. Importing torch costs seconds and half a
gigabyte, so each adapter loads on first use and `available()` reports what
the environment can actually run rather than what it wishes it could.

RUNNING WHERE
-------------
CPU, on an ordinary GitHub runner. Measured with MPS stubbed out and four
threads — the shape of `ubuntu-latest` — Kronos-small takes **1.2 seconds a
company, about five and a half minutes for 261 companies**, forecasting to
twenty sessions. (It is 0.3s to ten sessions; the model is autoregressive, so
the horizon is most of the bill. Twenty is what the evaluation needs.)

No GPU is bought or needed. For scale, this is less than the market scan that
feeds it.

Toto 2.0 and Sundial are far cheaper: 25 and 30 seconds for 241 companies
on the laptop, and on the runner itself — the dry run of 15 September, run
34965625837 — **73.7 and 100.7 seconds**, 241 of 241 answered each. Three
minutes a night for both, which is why they left `TRIAL` for `all`.
"""

from __future__ import annotations

import functools
import os
import pathlib

import forecast as fc

# Where the weights live. A single directory so a CI cache has one thing to
# restore, and so nothing writes into a home directory that will not exist.
#
# Expanded, because the workflow says `~/.cache/esthmr-lab` and nothing
# between YAML and Python expands a tilde. Unexpanded it was a folder named
# `~` inside the checkout: every night downloaded all the weights into it,
# while actions/cache restored and saved /home/runner/.cache/esthmr-lab, which
# stayed empty (9,397 bytes) under a key that matched exactly and so was never
# saved again.
CACHE = pathlib.Path(os.environ.get("ESTHMR_LAB_CACHE")
                     or (pathlib.Path.home() / ".cache" / "esthmr-lab")).expanduser()

# The Kronos checkout. It is not a pip package: the model class lives in the
# repository, so the source has to be on the path. `ESTHMR_KRONOS_SOURCE`
# points at it; without one, Kronos is simply unavailable and says so.
KRONOS_SOURCE = os.environ.get("ESTHMR_KRONOS_SOURCE", "")

# Pinned, every one of them.
#
# A foundation model is a moving target: the same repository name resolves to
# different weights over time, and a record that says "Kronos-small" without
# saying WHICH Kronos-small cannot be reproduced or verified. These are the
# exact revisions the August run used.
# The general forecasters, pinned by repository. Their weights move, and a
# record that cannot say which weights made a forecast cannot be verified.
CHRONOS2 = "amazon/chronos-2"
TIMESFM25 = "google/timesfm-2.5-200m-pytorch"

KRONOS = {
    "model": "NeoQuasar/Kronos-small",
    "model_revision": "901c26c1332695a2a8f243eb2f37243a37bea320",
    "tokenizer": "NeoQuasar/Kronos-Tokenizer-base",
    "context": 512,
}

# Pinned to the commit, not just the name. Sundial's model class is Python in
# its own repository, loaded with `trust_remote_code`, so the commit is also
# which code runs: that code was read at this commit before it was pinned
# (torch and transformers only; no network, file or shell calls).
TOTO2 = {"model": "Datadog/Toto-2.0-313m",
         "revision": "a7bab288f5e95f8606f8306f86659357e1c001ef"}
SUNDIAL = {"model": "thuml/sundial-base-128m",
           "revision": "3212e42564493f520593e5414af4367fc4b49226"}

# Sundial generates futures rather than predicting quantiles, and its
# forecast is the median of this many — the number its own quickstart draws.
# Pinned rather than tuned, like Kronos's five below.
SUNDIAL_SAMPLES = 20

# Models that run only when asked for by name (`run.py --models <name>`) and
# not in the nightly `all`: how a new model is timed on the four-core runner
# in a dry run before it joins. One that is slow there does not lose a single
# company's forecast — it runs the whole job past its timeout, and the night
# is lost for every model. Toto 2.0 and Sundial were on it until the runner
# timed them on 15 September 2026.
TRIAL: frozenset[str] = frozenset()

# The lookback every neural model is given, in completed sessions.
#
# 90 because that is what the measured August run used and changing it would
# make the new record incomparable with the old one. Kronos-small's context
# is 512, so this is well inside it; the binding constraint is the archive,
# which holds 120 bars a company.
LOOKBACK = 90

# How many paths Kronos samples. It is generative — each path is a different
# future — and the forecast is the median across them. Five is what the
# August run used. More would be steadier and slower; the number is pinned
# rather than tuned, because tuning it against outcomes already seen is how a
# backtest flatters itself.
SAMPLES = 5


def _seed(basis: str, ticker: str) -> int:
    """A seed fixed by the night and the company, and by nothing else.

    So a rerun of the same night produces the same forecasts. Without it a
    generative model answers differently every time it is asked, and "the
    forecast" quietly means whichever run somebody kept — which is the whole
    thing a frozen record exists to prevent.

    `hash()` is deliberately not used: Python salts it per process, so the
    same night would reseed differently tomorrow and the record would not
    reproduce.
    """
    import hashlib
    digest = hashlib.sha256(f"{basis}:{ticker}".encode()).digest()
    return int.from_bytes(digest[:4], "big") % (2 ** 31)


def _hugging_face() -> None:
    """Point the hub at the cache, and make it copy rather than symlink.

    The first CI run abstained on all 260 companies with

        FileNotFoundError: '../../blobs/050b676e...' -> '.../huggingface/...'

    The hub stores a file once as a blob and links every snapshot to it by a
    RELATIVE symlink. `actions/cache` restores the tree without preserving
    those links, so every snapshot points at a path that is not there, and a
    model that downloaded perfectly the first time cannot be loaded the
    second. `HF_HUB_DISABLE_SYMLINKS` makes it copy instead: a hundred
    megabytes twice over, against a model that never loads.

    `cache_dir` is deliberately NOT passed to `from_pretrained` alongside
    this. Setting both puts the hub root in one place and the snapshot in
    another, which is half of how the layout got confused to begin with.
    """
    os.environ.setdefault("HF_HOME", str(CACHE / "huggingface"))
    os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS", "1")
    os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")


@functools.lru_cache(maxsize=1)
def _kronos():
    """Load Kronos once, on CPU, with MPS and CUDA left out of it.

    Deliberately CPU even where an accelerator exists. The record has to be
    reproducible on the machine that will actually run it every night, and
    that machine is a four-core runner. Sampling on one device and scoring
    the result as though it came from another is a difference nobody would
    ever find.
    """
    import sys
    import torch

    if not KRONOS_SOURCE:
        raise RuntimeError("ESTHMR_KRONOS_SOURCE is not set")
    source = pathlib.Path(KRONOS_SOURCE)
    if not (source / "model").is_dir():
        raise RuntimeError(f"no Kronos source at {source}")
    if str(source) not in sys.path:
        sys.path.insert(0, str(source))

    _hugging_face()
    torch.set_num_threads(int(os.environ.get("ESTHMR_LAB_THREADS", "4")))

    from model import Kronos, KronosPredictor, KronosTokenizer  # noqa: PLC0415

    tokenizer = KronosTokenizer.from_pretrained(KRONOS["tokenizer"])
    weights = Kronos.from_pretrained(KRONOS["model"])
    return KronosPredictor(weights, tokenizer, device="cpu",
                           max_context=KRONOS["context"])


def kronos(ticker: str, basis: str, bars: list[dict]) -> fc.Forecast | fc.Abstention:
    """Kronos-small over this company's candles.

    The model returns a price path per sample. The forecast is the median
    across paths at each horizon, expressed as a return from the basis close
    — a median rather than a mean because one path that runs away should not
    move the answer, and because the August record was built on medians.
    """
    import pandas as pd

    # Only the sessions with a whole candle.
    #
    # This project's own price archive is DEEPER than the vendor's scan and
    # also wider: it records thin sessions the vendor dropped, which have a
    # close and a volume and no open, high or low. A candle model cannot read
    # those, and refusing the company over them cost fifteen listings on the
    # first night the archive was used — for sessions that were never in the
    # vendor's series in the first place.
    #
    # So the incomplete sessions are skipped rather than the company. That is
    # not a gap being filled: nothing is invented, and what is left is exactly
    # the series the model would have been given before the archive existed.
    # The forecast records how many were passed over, because a company whose
    # ninety candles span half a year is a different question from one whose
    # ninety are consecutive.
    whole = [b for b in bars
             if all(isinstance(b.get(f), (int, float))
                    for f in ("open", "high", "low", "close"))]
    window = whole[-LOOKBACK:]
    if len(window) < LOOKBACK:
        return fc.Abstention(ticker, basis, "kronos",
                             f"{len(window)} whole candles, {LOOKBACK} needed")
    if window[-1].get("date") != bars[-1].get("date"):
        # The basis session itself has no candle, so the newest thing the
        # model could read is older than the session it is forecasting from.
        return fc.Abstention(ticker, basis, "kronos",
                             "no candle for the basis session")
    skipped = len(bars) - len(whole)
    last = window[-1]["close"]
    if not last:
        return fc.Abstention(ticker, basis, "kronos", "a basis close of zero")

    try:
        predictor = _kronos()
    except Exception as error:  # noqa: BLE001
        return fc.Abstention(ticker, basis, "kronos",
                             f"{type(error).__name__}: {error}")

    frame = pd.DataFrame(window)
    frame["timestamps"] = pd.to_datetime(frame["date"])
    history = frame[["open", "high", "low", "close", "volume"]]
    stamps = frame["timestamps"]
    ahead = max(fc.HORIZONS)
    future = pd.Series(pd.date_range(stamps.iloc[-1] + pd.Timedelta(days=1),
                                     periods=ahead, freq="B"))

    # One call, `SAMPLES` paths — not a loop of single-path calls.
    #
    # The loop was five forward passes a company and cost 1.81s where the
    # batched call costs 1.22s — eight minutes across the market against five
    # and a half. Seeding once per company keeps the run reproducible, which
    # is the property that actually matters; seeding per path bought nothing
    # except the bill.
    import torch
    torch.manual_seed(_seed(basis, ticker))
    drawn = predictor.predict(df=history, x_timestamp=stamps,
                              y_timestamp=future, pred_len=ahead,
                              T=1.0, top_p=0.9, sample_count=SAMPLES,
                              verbose=False)
    # The predictor returns the median path across samples. Its own spread
    # is gone by then, so the agreement count below is over what it gives
    # back rather than over paths this file never sees.
    path = list(drawn["close"])

    import statistics
    returns, quantiles = {}, {}
    for horizon in fc.HORIZONS:
        if horizon > ahead or horizon > len(path):
            continue
        moves = [(path[horizon - 1] / last - 1) * 100]
        returns[horizon] = statistics.median(moves)
    if not returns:
        return fc.Abstention(ticker, basis, "kronos", "no path reached a horizon")
    return fc.Forecast(ticker, basis, "kronos", returns,
                       note=f"{SAMPLES} sampled paths, median"
                            + (f"; {skipped} sessions without a whole candle "
                               "were passed over" if skipped else ""))


@functools.lru_cache(maxsize=1)
def _pipeline(kind: str):
    """Chronos-2, TimesFM 2.5, Toto 2.0 or Sundial, loaded once, on CPU.

    One at a time (`maxsize=1`): the models run one after another, so the
    next one loading lets the last one's weights go.

    Both call shapes were wrong in the first CI run and both were wrong in
    the same way: written from how these libraries used to look rather than
    from how they look now. `Chronos2Pipeline.predict` takes `inputs`
    positionally, not a `context=` keyword; TimesFM 2.5 exposes
    `TimesFM_2p5_200M_torch` and has no `TimesFm` class at all, and it must
    be compiled with a `ForecastConfig` before it will forecast.

    Both were checked against the installed packages rather than guessed at
    a second time.
    """
    import torch
    torch.set_num_threads(int(os.environ.get("ESTHMR_LAB_THREADS", "4")))
    _hugging_face()
    if kind == "chronos2":
        from chronos import BaseChronosPipeline  # noqa: PLC0415
        return BaseChronosPipeline.from_pretrained(CHRONOS2, device_map="cpu")
    if kind == "timesfm25":
        import timesfm  # noqa: PLC0415
        model = timesfm.TimesFM_2p5_200M_torch.from_pretrained(TIMESFM25)
        model.compile(timesfm.ForecastConfig(
            max_context=LOOKBACK, max_horizon=max(fc.HORIZONS),
            # The series are prices on wildly different scales — 40 piastres
            # and 300 pounds — so each one is normalised before the model
            # sees it, or the batch is dominated by whichever company is
            # quoted in the largest numbers.
            normalize_inputs=True,
            # The forecast is the median path; the quantile head is what
            # produces one rather than a mean that a single runaway sample
            # can carry away.
            use_continuous_quantile_head=True,
            force_flip_invariance=True, infer_is_positive=True,
            fix_quantile_crossing=True))
        return model
    if kind == "toto2":
        from toto2 import Toto2Model  # noqa: PLC0415
        return Toto2Model.from_pretrained(TOTO2["model"], revision=TOTO2["revision"]).to("cpu").eval()
    if kind == "sundial":
        from transformers import AutoModelForCausalLM  # noqa: PLC0415
        return AutoModelForCausalLM.from_pretrained(
            SUNDIAL["model"], revision=SUNDIAL["revision"], trust_remote_code=True).eval()
    raise RuntimeError(f"no pipeline called {kind}")


def _toto2_median(model, series: list[float], ahead: int) -> list[float]:
    """Toto 2.0's median path, from one forward pass and no sampling.

    Its patches are 32 sessions long and it reads a context whole patches
    long, so the ninety closes are padded on the LEFT to 96 with values the
    mask marks as absent: the model is told six sessions are missing rather
    than shown six invented prices, and it sees the same ninety closes as
    every other model. `decode_block_size=None` is the single pass its
    authors recommend for short horizons and used for their leaderboard runs.
    """
    import torch  # noqa: PLC0415
    patch = model.config.patch_size
    pad = (-len(series)) % patch
    target = torch.cat([torch.zeros(pad), torch.tensor(series, dtype=torch.float32)]).view(1, 1, -1)
    seen = torch.cat([torch.zeros(pad, dtype=torch.bool),
                      torch.ones(len(series), dtype=torch.bool)]).view(1, 1, -1)
    with torch.no_grad():
        quantiles = model.forecast(
            {"target": target, "target_mask": seen, "series_ids": torch.zeros(1, 1, dtype=torch.long)},
            horizon=ahead, decode_block_size=None, has_missing_values=bool(pad))
    # (knots, batch, variates, horizon); the knot at 0.5 is the median.
    middle = list(model.output_head.knots).index(0.5)
    return quantiles[middle, 0, 0, :].tolist()


def _sundial_median(model, series: list[float], ahead: int, basis: str, ticker: str) -> list[float]:
    """Sundial's median across `SUNDIAL_SAMPLES` generated paths.

    One forward pass, not `generate`. Sundial's `generate` was written for an
    older transformers and fails on the one this lab installs ("DynamicCache
    has no attribute seen_tokens"). For a horizon inside a single output
    patch (720 sessions), `generate` is exactly these steps: scale the
    context by its own mean and deviation, run the decoder once, draw the
    paths from the last position, scale them back. Seeded by the night and
    the company, like Kronos, so a rerun of the night draws the same paths.
    """
    import torch  # noqa: PLC0415
    x = torch.tensor(series, dtype=torch.float32).view(1, -1)
    means = x.mean(dim=-1, keepdim=True)
    stdev = x.std(dim=-1, keepdim=True, unbiased=False) + 1e-5
    torch.manual_seed(_seed(basis, ticker))
    with torch.no_grad():
        out = model(input_ids=(x - means) / stdev, use_cache=False, return_dict=True,
                    max_output_length=ahead, revin=False, num_samples=SUNDIAL_SAMPLES)
    # (batch, samples, horizon), back on the price scale.
    paths = out.logits * stdev.unsqueeze(1) + means.unsqueeze(1)
    return torch.quantile(paths[0], 0.5, dim=0).tolist()


def _close_only(kind: str, ticker: str, basis: str,
                bars: list[dict]) -> fc.Forecast | fc.Abstention:
    """A general forecaster over the close series alone.

    The close and nothing else, which is what these models take. It is also
    the comparison that matters: if a model shown only the closing prices
    keeps up with one shown the whole candle, the candle was not carrying
    much.
    """
    series = [b["close"] for b in bars[-LOOKBACK:]
              if isinstance(b.get("close"), (int, float))]
    if len(series) < LOOKBACK:
        return fc.Abstention(ticker, basis, kind,
                             f"{len(series)} closes, {LOOKBACK} needed")
    last = series[-1]
    if not last:
        return fc.Abstention(ticker, basis, kind, "a basis close of zero")
    try:
        pipeline = _pipeline(kind)
    except Exception as error:  # noqa: BLE001
        return fc.Abstention(ticker, basis, kind,
                             f"{type(error).__name__}: {error}")

    ahead = max(fc.HORIZONS)
    try:
        if kind == "chronos2":
            import numpy as np  # noqa: PLC0415
            drawn = pipeline.predict([np.asarray(series, dtype="float32")],
                                     prediction_length=ahead)
            # One tensor per series, shaped (variates, quantiles, horizon) —
            # (1, 21, 20) here. One variate because this is a close series
            # alone, and the middle of the 21 quantiles is the median path.
            first = np.asarray(drawn[0])
            if first.ndim != 3:
                raise ValueError(f"unexpected chronos shape {first.shape}")
            median = first[0, first.shape[1] // 2, :].tolist()
        elif kind == "toto2":
            median = _toto2_median(pipeline, series, ahead)
        elif kind == "sundial":
            median = _sundial_median(pipeline, series, ahead, basis, ticker)
        else:
            import numpy as np  # noqa: PLC0415
            point, _ = pipeline.forecast(horizon=ahead,
                                         inputs=[np.asarray(series, dtype="float32")])
            # (batch, horizon) — one row because one series was asked about.
            drawn = np.asarray(point)
            median = list(drawn[0] if drawn.ndim > 1 else drawn)
    except Exception as error:  # noqa: BLE001
        return fc.Abstention(ticker, basis, kind,
                             f"{type(error).__name__}: {error}")

    # `float()` deliberately. TimesFM returns numpy scalars, which json
    # writes as "np.float32(-0.43)" or refuses outright depending on the
    # encoder — a forecast that cannot be serialised is a forecast that is
    # not in the record.
    returns = {h: float((median[h - 1] / last - 1) * 100)
               for h in fc.HORIZONS if h <= len(median)}
    if not returns:
        return fc.Abstention(ticker, basis, kind, "no horizon returned")
    return fc.Forecast(ticker, basis, kind, returns)


def chronos2(ticker, basis, bars):
    return _close_only("chronos2", ticker, basis, bars)


def timesfm25(ticker, basis, bars):
    return _close_only("timesfm25", ticker, basis, bars)


def toto2(ticker, basis, bars):
    return _close_only("toto2", ticker, basis, bars)


def sundial(ticker, basis, bars):
    return _close_only("sundial", ticker, basis, bars)


def available(include_trial: bool = False) -> dict:
    """The neural models this environment can actually run.

    Checked by import rather than assumed, and a model that cannot be loaded
    is left out of the run entirely rather than abstaining 261 times. The
    difference matters in the record: "this model was not run tonight" and
    "this model was asked and refused every company" are different facts.

    `TRIAL` models only when `include_trial`: they run when named, and join
    the nightly `all` once the runner has timed them.
    """
    import importlib.util  # noqa: PLC0415

    def installed(*modules: str) -> bool:
        # Found, not imported: toto2 pulls in Lightning, seconds before a model
        # is even asked for.
        return all(importlib.util.find_spec(m) is not None for m in modules)

    ready: dict = {}
    if KRONOS_SOURCE and (pathlib.Path(KRONOS_SOURCE) / "model").is_dir():
        try:
            import pandas  # noqa: F401,PLC0415
            import torch  # noqa: F401,PLC0415
            ready["kronos"] = kronos
        except ImportError:
            pass
    try:
        import chronos  # noqa: F401,PLC0415
        ready["chronos2"] = chronos2
    except ImportError:
        pass
    try:
        import timesfm  # noqa: F401,PLC0415
        ready["timesfm25"] = timesfm25
    except ImportError:
        pass
    if installed("torch", "toto2", "gluonts", "dd_unit_scaling"):
        ready["toto2"] = toto2
    if installed("torch", "transformers"):
        ready["sundial"] = sundial
    if not include_trial:
        ready = {name: ask for name, ask in ready.items() if name not in TRIAL}
    return ready
