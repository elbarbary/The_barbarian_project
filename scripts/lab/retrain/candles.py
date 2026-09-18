"""EGX daily candles as Kronos training windows, scaled by their past alone.

The Kronos retraining pilot (docs/kronos-retraining-plan.md, stage 1). Pure
numpy: nothing here needs torch, so its tests run anywhere.

WHY PAST-ONLY SCALING
Kronos divides every window by its own mean and standard deviation. Upstream's
CSV fine-tuning script takes both over the whole window, future included
(`finetune_csv/finetune_base_model.py`, line 125 at 67b630e). A model trained
that way learns that a window's future balances its past around the average:
after a rise, a fall. Kronos-small's forecasts on EGX are mostly exactly that
(0.94-0.97 correlation with the move back to the 90-candle average, 13-16
September 2026). Here the scale comes from the 90 input candles only, which is
also how every forecast is scaled.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import math
import pathlib

import numpy as np

LOOKBACK = 90          # candles in, as the lab forecasts
HORIZON = 20           # sessions out, the lab's longest horizon
WINDOW = LOOKBACK + HORIZON + 1   # +1: inputs are tokens[:-1], targets tokens[1:]
CLIP = 5.0
# The lab's own readability rules (`scripts/lab/run.py`): a gap longer than
# this, or a close-to-close step beyond x2 either way, is not one series.
GAP_DAYS = 45
STEP = 2.0

# By the date of the window's LAST INPUT candle (its forecast origin). The
# window's final target candle must fall in the same split, so no target is
# shared across a boundary. Fixed before any training (plan, "Splits, by time").
SPLITS = {
    "train": ("0000-01-01", "2023-12-31"),
    "validation": ("2024-01-01", "2024-12-31"),
    "test": ("2025-01-01", "2026-07-31"),
}

FEATURES = ("open", "high", "low", "close", "volume", "amount")


def clean(bars: list[dict], delisted_on: str | None = None) -> tuple[list[dict], dict]:
    """Daily candles a model can read, oldest first, and what was dropped.

    Kept: one candle a date, positive finite open/high/low/close with the high
    and low bracketing the open and close. Volume missing or negative counts as
    zero traded. A delisted company's candles from its delisting date on are
    over-the-counter trades, not the exchange's, and are dropped.
    """
    dropped = {"malformed": 0, "duplicate": 0, "afterDelisting": 0}
    by_date: dict[str, dict] = {}
    for bar in bars:
        date = str(bar.get("date") or "")[:10]
        values = [bar.get(k) for k in ("open", "high", "low", "close")]
        if (len(date) != 10 or not all(isinstance(v, (int, float)) and math.isfinite(v) and v > 0 for v in values)
                or bar["high"] < max(bar["open"], bar["close"]) or bar["low"] > min(bar["open"], bar["close"])):
            dropped["malformed"] += 1
            continue
        if delisted_on and date >= delisted_on:
            dropped["afterDelisting"] += 1
            continue
        if date in by_date:
            dropped["duplicate"] += 1
        volume = bar.get("volume")
        by_date[date] = {"date": date, "open": float(bar["open"]), "high": float(bar["high"]),
                         "low": float(bar["low"]), "close": float(bar["close"]),
                         "volume": float(volume) if isinstance(volume, (int, float)) and math.isfinite(volume) and volume > 0 else 0.0}
    return [by_date[d] for d in sorted(by_date)], dropped


def segments(bars: list[dict]) -> list[list[dict]]:
    """The candles cut wherever they stop being one series (`run.unreadable`)."""
    out: list[list[dict]] = []
    current: list[dict] = []
    for bar in bars:
        if current:
            before = current[-1]
            gap = (datetime.date.fromisoformat(bar["date"]) - datetime.date.fromisoformat(before["date"])).days
            ratio = bar["close"] / before["close"]
            if gap > GAP_DAYS or not 1 / STEP < ratio < STEP:
                out.append(current)
                current = []
        current.append(bar)
    if current:
        out.append(current)
    return out


def split_of(origin: str, end: str) -> str | None:
    """The split a window belongs to, or None when origin and end straddle one."""
    for name, (first, last) in SPLITS.items():
        if first <= origin <= last and first <= end <= last:
            return name
    return None


def features(bars: list[dict]) -> np.ndarray:
    """open, high, low, close, volume, amount, as the predictor builds them:
    with no amount given, `KronosPredictor.predict` uses volume x mean(OHLC)."""
    x = np.array([[b["open"], b["high"], b["low"], b["close"], b["volume"]] for b in bars], dtype=np.float64)
    amount = x[:, 4] * x[:, :4].mean(axis=1)
    return np.column_stack([x, amount]).astype(np.float32)


def stamps(bars: list[dict]) -> np.ndarray:
    """minute, hour, weekday, day, month, as `calc_time_stamps` reads a
    date-only timestamp (the lab passes dates, so minute and hour are 0)."""
    rows = []
    for b in bars:
        d = datetime.date.fromisoformat(b["date"])
        rows.append((0, 0, d.weekday(), d.day, d.month))
    return np.array(rows, dtype=np.float32)


def scale(x: np.ndarray, lookback: int = LOOKBACK, clip: float = CLIP) -> np.ndarray:
    """A window divided by the mean and deviation of its first `lookback` rows."""
    past = x[:lookback].astype(np.float64)
    mean, std = past.mean(axis=0), past.std(axis=0)
    return np.clip((x - mean) / (std + 1e-5), -clip, clip).astype(np.float32)


class Panel:
    """Every company's clean segments, and every window's (segment, start) by split."""

    def __init__(self, companies: dict[str, list[dict]]):
        self.names: list[tuple[str, int]] = []      # (ticker, segment number)
        self.x: list[np.ndarray] = []
        self.stamps: list[np.ndarray] = []
        self.dates: list[list[str]] = []
        self.windows: dict[str, list[tuple[int, int]]] = {name: [] for name in SPLITS}
        for ticker in sorted(companies):
            for k, seg in enumerate(segments(companies[ticker])):
                if len(seg) < WINDOW:
                    continue
                s = len(self.names)
                self.names.append((ticker, k))
                self.x.append(features(seg))
                self.stamps.append(stamps(seg))
                self.dates.append([b["date"] for b in seg])
                for start in range(len(seg) - WINDOW + 1):
                    split = split_of(seg[start + LOOKBACK - 1]["date"], seg[start + WINDOW - 1]["date"])
                    if split:
                        self.windows[split].append((s, start))

    def window(self, s: int, start: int) -> tuple[np.ndarray, np.ndarray]:
        return scale(self.x[s][start:start + WINDOW]), self.stamps[s][start:start + WINDOW]

    def batch(self, pairs) -> tuple[np.ndarray, np.ndarray]:
        xs, ts = zip(*(self.window(s, start) for s, start in pairs))
        return np.stack(xs), np.stack(ts)


def load(candles_dir: pathlib.Path, directory: dict | None = None) -> tuple[dict[str, list[dict]], dict]:
    """Every fetched company, cleaned, with a manifest of what went in."""
    companies, manifest = {}, {"companies": {}}
    for path in sorted(candles_dir.glob("*.json")):
        raw = path.read_bytes()
        doc = json.loads(raw)
        listing = ((directory or {}).get(doc["ticker"]) or {}).get("listing") or {}
        delisted_on = listing.get("delisted_on") or listing.get("effective_on")
        bars, dropped = clean(doc["bars"], delisted_on)
        companies[doc["ticker"]] = bars
        manifest["companies"][doc["ticker"]] = {
            "sha256": hashlib.sha256(raw).hexdigest(), "fetched": len(doc["bars"]), "kept": len(bars),
            "first": bars[0]["date"] if bars else None, "last": bars[-1]["date"] if bars else None,
            "delistedOn": delisted_on, **dropped}
    manifest["sha256"] = hashlib.sha256("".join(
        f"{t}:{m['sha256']}" for t, m in sorted(manifest["companies"].items())).encode()).hexdigest()
    return companies, manifest
