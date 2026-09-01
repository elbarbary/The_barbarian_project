#!/usr/bin/env python3
"""Every published company document, on the exchange's classification.

`companies.json` carries the sector EGX itself files a company under; the vendor
scan carries the sector a US data provider guessed. The two disagree for 217 of
284 companies, because the vendor files real estate developers, banks, brokers,
contractors and hotels under one word.

The market build resolves that — and then wrote the vendor's raw column into the
per-company document anyway. So the company screen said "Finance" over a
contractor while the market table one tap away said "Contracting & Construction
Engineering", and the sector screen grouped it a third way.

WHY THIS IS A SEPARATE STEP AND NOT A ONE-LINE FIX

The one-line fix is in `build_market_api` and is made. But that build needs the
daily scan, which is a 2 MB file living outside the repository and present only
on the machine that runs the monitor — in CI there is no scan and the company
documents are not rewritten at all. A correctness rule that only holds when an
optional input is present is not a rule. This runs everywhere, costs nothing,
and makes the contradiction structurally impossible rather than conditionally
absent.

It reads the directory and writes the same string into the document beside it.
No sector is invented: a company the exchange does not classify keeps whatever
the directory holds for it, which is the vendor's guess, and is marked as such
in `sector_source` upstream.
"""

from __future__ import annotations

import argparse
import json
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
V1 = REPO / "public" / "data" / "v1"
DIRECTORY = V1 / "companies.json"
COMPANIES = V1 / "companies"
FIXTURES = REPO / "app" / "assets" / "fixtures"


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def apply(write: bool = True) -> int:
    print("── Company sector alignment")
    directory = load(DIRECTORY).get("companies") or []
    if not directory:
        print("   no directory — leaving the documents alone")
        return 0

    wanted = {c["ticker"]: (c.get("sector"), c.get("sector_ar"))
              for c in directory if c.get("ticker")}

    changed = missing = 0
    for ticker, (sector, sector_ar) in sorted(wanted.items()):
        if not sector:
            continue
        for root in (COMPANIES, FIXTURES / "companies"):
            path = root / f"{ticker}.json"
            doc = load(path)
            if not doc:
                continue
            if doc.get("sector") == sector and \
                    (doc.get("sector_ar") or None) == (sector_ar or None):
                continue
            if root is COMPANIES:
                changed += 1
            if not write:
                continue
            doc["sector"] = sector
            if sector_ar:
                doc["sector_ar"] = sector_ar
            else:
                doc.pop("sector_ar", None)
            path.write_text(
                json.dumps(doc, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8")

    for ticker in wanted:
        if not (COMPANIES / f"{ticker}.json").exists():
            missing += 1

    verb = "would be realigned" if not write else "realigned"
    print(f"   {changed} company documents {verb} to the exchange's sectors")
    if missing:
        print(f"   {missing} companies in the directory have no document yet")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="report without writing")
    args = parser.parse_args()
    return apply(write=not args.check)


if __name__ == "__main__":
    raise SystemExit(main())
