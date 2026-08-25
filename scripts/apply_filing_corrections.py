#!/usr/bin/env python3
"""Apply the reviewed corrections in `filing_corrections.json`, durably.

The exchange's net-profit template is inconsistent about its unit word: the same
issuer files "17,738,347 Value In Thousand" one quarter and a bare "16,713,467"
the next, and the automatic path — which can only assume whole pounds when no
unit word is present — then stores a bank's half-year a thousandfold too small.
`extract_unit_financials.py` fixes the *labelled* ones; the *unlabelled* ones
have no unit word to key on, so a person reviewed each against its raw filing
and the company's own quarter-by-quarter progression and pinned the verdict in
`filing_corrections.json`.

This runs that table every build (after `build_market_api` has recreated the
docs from scratch, which is why a one-off hand-edit would not survive). It never
trusts the table blindly:

  * the stored value must still be the mis-scaled one the correction targets —
    if the automatic path has changed, the correction is stale and is skipped;
  * for a rescale, the `figure` must still appear verbatim in one of the
    company's own Financial-Results filings, and rescaling it by the named unit
    must reproduce `value_m` — so the number published is the issuer's own,
    traceable to a filing, never one composed here;
  * a drop only removes a period whose stored value matches the wrong figure.

`--check` verifies all of that and writes nothing.
"""

from __future__ import annotations

import argparse
import glob
import gzip
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import merge_egx_financials as M

REPO = pathlib.Path(__file__).resolve().parent.parent
TABLE = pathlib.Path(__file__).resolve().parent / "filing_corrections.json"
COMPANIES = REPO / "public" / "data" / "v1" / "companies"
FIXTURES = REPO / "app" / "assets" / "fixtures" / "companies"
FACTOR = {"pounds": 1, "thousands": 1_000, "millions": 1_000_000}


def _filing_index(ticker: str) -> dict[str, int]:
    """Every net-profit figure string this ticker has filed → a filing code.

    The traceability check: a rescaled figure is only published if the exact
    digit string is still sitting in one of the issuer's own secId=6 filings.
    """
    figures: dict[str, int] = {}
    for path in sorted(glob.glob(str(M.FILINGS / "*.json.gz"))):
        for item in json.loads(gzip.decompress(pathlib.Path(path).read_bytes())).get("items", []):
            if item.get("secId") != 6:
                continue
            tick = M.TICKER.search(item.get("heading") or "")
            if not tick or tick.group(1) != ticker:
                continue
            body = M.flatten(item.get("content"))
            for m in M.NET.finditer(body):
                figures.setdefault(m.group(2) + (m.group(3) or ""), item["code"])
    return figures


def _find(doc: dict, label: str):
    fin = doc.get("financials") or {}
    for bucket in ("annual", "quarterly"):
        for i, period in enumerate(fin.get(bucket) or []):
            if period.get("period") == label:
                return bucket, i, period
    return None, None, None


def apply(check: bool) -> int:
    table = json.loads(TABLE.read_text())["corrections"]
    scaled = dropped = skipped = 0
    touched: dict[str, dict] = {}

    for c in table:
        ticker, label, action = c["ticker"], c["period"], c["action"]
        path = COMPANIES / f"{ticker}.json"
        if not path.exists():
            print(f"   skip {ticker} {label}: no company doc")
            skipped += 1
            continue
        doc = touched.get(ticker) or json.loads(path.read_text())
        bucket, idx, period = _find(doc, label)
        if period is None:
            print(f"   skip {ticker} {label}: period not present")
            skipped += 1
            continue

        held = period.get("net_income")
        # The correction targets one specific wrong value; if the automatic path
        # no longer produces it, the correction is stale — leave it alone.
        if held is None or abs(held - c["expect_stored_m"]) > max(0.01, abs(c["expect_stored_m"]) * 0.02):
            print(f"   skip {ticker} {label}: stored {held} is not the targeted "
                  f"{c['expect_stored_m']} (stale correction)")
            skipped += 1
            continue

        if action == "drop":
            if not check:
                doc["financials"][bucket].pop(idx)
                touched[ticker] = doc
            print(f"   drop {ticker} {label}: was {held}m — {c['note'][:60]}")
            dropped += 1
            continue

        # action == "scale": prove the number before publishing it.
        figures = _filing_index(ticker)
        code = figures.get(c["figure"])
        if code is None:
            print(f"   skip {ticker} {label}: figure {c['figure']} not in any filing")
            skipped += 1
            continue
        num = float(re.sub(r"[^\d.]", "", c["figure"]))
        want = round(num * FACTOR[c["scale"]] / 1_000_000, 3)
        if abs(want - c["value_m"]) > 0.01:
            print(f"   skip {ticker} {label}: {c['figure']} as {c['scale']} = "
                  f"{want}m, table says {c['value_m']}m (mismatch)")
            skipped += 1
            continue
        value = c["value_m"]
        if not check:
            period["net_income"] = value
            period["net_income_source"] = M.SOURCE
            period["filing_id"] = f"egx-{code}"
            period["source"] = M.SOURCE
            touched[ticker] = doc
        print(f"   scale {ticker} {label}: {held}m → {value}m  [{c['figure']} {c['scale']}]")
        scaled += 1

    if not check:
        for ticker, doc in touched.items():
            body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
            (COMPANIES / f"{ticker}.json").write_text(body, encoding="utf-8")
            mirror = FIXTURES / f"{ticker}.json"
            if mirror.parent.exists():
                mirror.write_text(body, encoding="utf-8")

    verb = "would apply" if check else "applied"
    print(f"── {verb}: {scaled} rescaled, {dropped} dropped, {skipped} skipped")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true")
    return apply(ap.parse_args().check)


if __name__ == "__main__":
    raise SystemExit(main())
