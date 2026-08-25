#!/usr/bin/env python3
"""Fill the net-profit figures the exchange files WITH a unit word.

`merge_egx_financials.py` reads the exchange's fixed template and, on purpose,
**skips** every figure that sits next to a unit word — "17,738,347 Value In
Thousand", "27 Value In Millions". It skips them because reading the digits off
one and dividing by a million (the rule for the whole-pounds template) would
publish a bank at a thousandth of its size, and the repo has shipped an invented
figure for a real ticker once already. So banks and the other large filers —
who all file in thousands — simply have no recent quarters.

This closes that gap without loosening the guard. A stronger model from the same
pipeline (`gemini.py`, Vertex-funded, thinking ON) READS each skipped filing and
reports the figure, its unit, its currency, its period and its basis — all
copied verbatim. The model is a reader, never an author: nothing it returns is
published until it survives four independent checks.

  1. VERBATIM   — the figure and the unit phrase it reports must both be exact
                  substrings of the filing text. A model that paraphrases a
                  number cannot get one through.
  2. AGREEMENT  — a plain regex parses the same line independently, scales it by
                  the same unit, and must land on the same figure. Two methods,
                  one answer, or the row is dropped.
  3. BAND       — no EGX issuer nets more than a few hundred billion pounds. A
                  figure past 600bn is a mislabelled unit ("43,477,352 Value In
                  million" is thousands wearing the wrong word), and it is
                  dropped, not scaled into the trillions.
  4. MAGNITUDE  — the writer it hands off to (`merge_egx_financials.write_rows`)
                  still refuses to override an existing figure by more than 100x.

Only Egyptian pounds. A dollar filing is skipped, never converted at a rate the
app does not hold. Output lands in the company JSON and its fixture mirror, in a
commit a person reviews before it reaches a phone.
"""

from __future__ import annotations

import argparse
import glob
import json
import pathlib
import re
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import egx_dates
import gemini
import merge_egx_financials as M

FILINGS = M.FILINGS
COMPANIES = M.COMPANIES
# A filing never changes once published, so a model read of one is cacheable
# forever by its numeric `code`. This turns a re-run — to fill a filing dropped
# by a transient 429, or a nightly cron pass — from 195 paid reads into a
# handful, and lets the writer replay against fresh company data for free.
CACHE_PATH = pathlib.Path(__file__).resolve().parent / "extract_unit_cache.json"

# A stored figure this many times larger or smaller than the exchange's freshly
# read one is not two sources rounding differently — it is one of them in the
# wrong unit. The reader's figure has passed three checks; the stored one has
# not, so the reader's wins, loudly, and the pair is printed for review.
CONFLICT_RATIO = 100

# thousand/million/billion → the factor that turns the written figure into whole
# pounds. "" (no unit) never reaches here: those are the template this file does
# not touch, handled whole-pounds by merge_egx_financials.
UNIT_FACTOR = {
    "thousand": 1_000, "thousands": 1_000,
    "million": 1_000_000, "millions": 1_000_000,
    "billion": 1_000_000_000, "billions": 1_000_000_000,
}

# No Egyptian company nets more than a few hundred billion pounds; CIB, the
# largest, is ~82bn. A figure past this is a mislabelled unit, not a fortune.
BAND_MILLIONS = 600_000

PROMPT = """You are reading ONE disclosure filed with the Egyptian Exchange. Report ONLY what the text literally states about the CURRENT-period net profit or net loss. Do not infer, compute, convert, or round. Copy every value exactly as written.

Return ONLY a JSON object with these keys:
- "figure": the net profit/loss amount for the CURRENT (first) period, exactly as written, keeping the digit grouping (e.g. "17,738,347" or "27" or "205.7"). Never the comparative period.
- "sign": "profit" or "loss", whichever the label uses.
- "unit": the unit phrase exactly as written next to that figure (e.g. "Value In Thousand", "(value in thousands)", "Value In Millions"); "" if the figure carries no unit phrase.
- "currency": the currency exactly as written (e.g. "EGP", "Egyptian Pound", "US Dollar"); "" if absent.
- "period_from": the CURRENT period start, exactly as written.
- "period_to": the CURRENT period end, exactly as written.
- "basis": "standalone" or "consolidated" if stated, else "".

If the text does not clearly state a current-period net profit or loss, return {"figure": ""}.

FILING TEXT:
"""

_JSON = re.compile(r"\{.*\}", re.S)


def read_filing(content: str, *, model: str) -> dict | None:
    """One filing → the issuer's figures as the model copied them, or None.

    Thinking ON: this is a read where a wrong unit costs three orders of
    magnitude, which is exactly the work the reasoning budget is for.
    """
    body = json.dumps({
        "contents": [{"role": "user", "parts": [{"text": PROMPT + content}]}],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 4000,
            "thinkingConfig": {"thinkingBudget": 1024},
        },
    }).encode()
    try:
        resp = gemini._post(model, body, timeout=120)
    except Exception as error:  # noqa: BLE001
        print(f"   model error: {str(error)[:100]}", file=sys.stderr)
        return None
    cands = resp.get("candidates") or []
    if not cands:
        return None
    text = "".join(p.get("text", "") for p in cands[0].get("content", {}).get("parts", []))
    match = _JSON.search(text)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def deterministic(body: str) -> tuple[float, str] | None:
    """Regex the current-period figure and its unit, independent of the model.

    Returns (whole_pounds, unit_word_lower) or None. This is agreement check #2:
    it must reach the same figure the model did, by a different route.
    """
    prof = M.NET.search(body)
    if not prof:
        return None
    window = body[max(0, prof.start() - 5): prof.end() + 40].lower()
    unit = None
    for word in ("thousands", "thousand", "millions", "million", "billions", "billion"):
        if word in window:
            unit = word
            break
    if unit is None:
        return None
    digits = prof.group(2) + (prof.group(3) or "")
    try:
        number = float(re.sub(r"[^\d.]", "", digits))
    except ValueError:
        return None
    whole = number * UNIT_FACTOR[unit]
    if prof.group(1).lower() == "loss":
        whole = -abs(whole)
    return whole, unit


def load_cache() -> dict:
    try:
        return json.loads(CACHE_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        return {}


def qualified_rows(limit: int | None, model: str, since_year: int,
                   cache: dict) -> tuple[dict, dict]:
    rows: dict[tuple[str, str], dict] = {}
    stats = {"seen": 0, "model_read": 0, "cached": 0, "no_json": 0,
             "not_verbatim": 0, "disagree": 0, "currency": 0, "band": 0,
             "no_period": 0, "no_label": 0, "no_ticker": 0, "added": 0}
    files = sorted(glob.glob(str(FILINGS / "*.json.gz")))
    for path in files:
        for item in json.loads(__import__("gzip").decompress(
                pathlib.Path(path).read_bytes())).get("items", []):
            if item.get("secId") != 6:
                continue
            body = M.flatten(item.get("content"))
            prof = M.NET.search(body)
            if not prof:
                continue
            window = body[max(0, prof.start() - 40): prof.end() + 40]
            # Only the figures merge_egx_financials SKIPS: a decimal or a unit
            # word near the number. Everything else it already handles.
            if not (prof.group(3) or M.QUALIFIED.search(window)):
                continue
            span = M.PERIOD.search(body)
            if not span:
                continue
            order = egx_dates.detect_order(body)
            start = egx_dates.parse(span.group(1), order)
            end = egx_dates.parse(span.group(2), order)
            if not start or not end or end <= start or end.year < since_year:
                continue
            tick = M.TICKER.search(item.get("heading") or "")
            if not tick:
                stats["no_ticker"] += 1
                continue

            stats["seen"] += 1
            code = str(item["code"])
            if code in cache:
                read = cache[code]
                stats["cached"] += 1
            else:
                if limit and stats["model_read"] >= limit:
                    return rows, stats
                read = read_filing(body, model=model)
                stats["model_read"] += 1
                time.sleep(0.3)
                # Only a genuine answer is cached — an empty figure the model
                # really returned, yes; a 429 or transport failure (read is
                # None), never, so a dropped filing is retried next run.
                if read is not None:
                    cache[code] = read
                    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False))
            if not read or not str(read.get("figure", "")).strip():
                stats["no_json"] += 1
                continue

            figure = str(read["figure"]).strip()
            unit = str(read.get("unit", "")).strip()
            currency = str(read.get("currency", "")).strip().lower()
            sign = str(read.get("sign", "profit")).strip().lower()

            # (1) VERBATIM — the figure and unit must be lifted from the text.
            if figure not in body or (unit and unit not in body):
                stats["not_verbatim"] += 1
                continue
            # currency must be Egyptian pounds, stated (never assumed).
            if currency not in M.EGP:
                stats["currency"] += 1
                continue

            unit_key = re.sub(r"[^a-z]", "", unit.lower())
            unit_key = next((w for w in UNIT_FACTOR if w in unit_key), None)
            if not unit_key:
                stats["disagree"] += 1
                continue
            number = float(re.sub(r"[^\d.]", "", figure))
            whole = number * UNIT_FACTOR[unit_key]
            if sign == "loss":
                whole = -abs(whole)

            # (2) AGREEMENT — an independent regex parse must land identically.
            det = deterministic(body)
            if not det or round(det[0]) != round(whole):
                stats["disagree"] += 1
                continue

            net_income = round(whole / 1_000_000, 3)
            # (3) BAND — a figure past a few hundred billion is a mislabel.
            if abs(net_income) > BAND_MILLIONS or net_income == 0:
                stats["band"] += 1
                continue

            labelled = M.period_label(start, end)
            if not labelled:
                stats["no_label"] += 1
                continue
            label, comparable = labelled
            basis = (M.BASIS.search(body).group(1).lower()
                     if M.BASIS.search(body) else "")

            key = (tick.group(1), label)
            held = rows.get(key)
            if held:
                if held["basis"] == "consolidated" and basis != "consolidated":
                    continue
                if held["basis"] == basis and held["filed"] >= item["dateStamp"][:10]:
                    continue
            rows[key] = {
                "net_income": net_income,
                "basis": basis,
                "filed": item["dateStamp"][:10],
                "period_start": start.isoformat(),
                "period_end": end.isoformat(),
                "comparable": comparable,
                "code": item["code"],
            }
            stats["added"] = len(rows)
    return rows, stats


def stored_figures() -> dict[tuple[str, str], float]:
    """Every net_income already in the company docs, keyed by (ticker, label)."""
    out: dict[tuple[str, str], float] = {}
    for path in glob.glob(str(COMPANIES / "*.json")):
        doc = json.loads(pathlib.Path(path).read_text())
        ticker = doc.get("ticker") or pathlib.Path(path).stem
        fin = doc.get("financials") or {}
        for bucket in ("annual", "quarterly"):
            for period in fin.get(bucket) or []:
                ni = period.get("net_income")
                if isinstance(ni, (int, float)):
                    out[(ticker, period.get("period"))] = ni
    return out


def conflicts(rows: dict, stored: dict) -> set:
    """The (ticker, label) pairs where a verified figure must override a stored
    one that is orders of magnitude off — the guard would otherwise keep the
    error. Fiscal (non-comparable) labels count too: two EGX filings can share
    one, and the unlabelled twin is exactly the thousandfold-small stored value
    this correction exists to replace."""
    keys = set()
    for (tick, label), row in rows.items():
        held = stored.get((tick, label))
        if held and abs(held) > 0:
            ratio = row["net_income"] / held
            if not (1 / CONFLICT_RATIO < ratio < CONFLICT_RATIO):
                keys.add((tick, label))
    return keys


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=None,
                    help="stop after N model reads (pilot runs)")
    ap.add_argument("--since", type=int, default=2025,
                    help="only periods ending in this year or later")
    ap.add_argument("--model", default=gemini.MODEL)
    args = ap.parse_args()

    cache = load_cache()
    print(f"Reading unit-qualified filings with {args.model} "
          f"(thinking on) — {len(cache)} cached…")
    rows, stats = qualified_rows(args.limit, args.model, args.since, cache)
    print("── stats:", json.dumps(stats))
    print(f"── {len(rows)} verified (ticker, period) figures")
    for (tick, label), row in sorted(rows.items()):
        print(f"   {tick:6} {label:16} {row['net_income']:>14,.3f}m  "
              f"[{row['basis'] or '—'}] filed {row['filed']}")

    stored = stored_figures()
    force = conflicts(rows, stored)
    if force:
        print(f"\n── {len(force)} figure(s) OVERRIDE a stored value >"
              f"{CONFLICT_RATIO}x off (a unit error the guard was preserving):")
        for tick, label in sorted(force):
            print(f"   {tick:6} {label:16} stored {stored[(tick, label)]:>14,.3f}m"
                  f"  →  filed {rows[(tick, label)]['net_income']:>14,.3f}m")

    if rows:
        M.write_rows(rows, {}, args.dry_run, force_keys=frozenset(force))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
