#!/usr/bin/env python3
"""Name the basis every filed figure was prepared on.

The exchange files many periods TWICE — once standalone, once consolidated —
and the two disagree: 2,900 periods are filed on both bases and 2,433 of those
carry different profits, some by thousands of per cent. Standalone is the
parent company alone; consolidated is the group. Neither is wrong. Reading a
series that silently switches between them is.

The published rows carried no basis at all, so nothing downstream could tell
them apart, and 71 companies had a series that mixed the two.

WHAT THIS DOES NOT DO IS REWRITE A FIGURE. The obvious "fix" — swap the
standalone number for the consolidated one — is unsafe here: the filings state
their amounts in different units. Measured against rows that came from exactly
the same filing, 98% state whole pounds and 54 state thousands. A figure copied
across at the wrong scale is a fabricated financial figure, which is the one
thing this publisher must never emit. So the basis is NAMED and the figure is
left exactly as the filing stated it; what reads a series decides what to do
with a row that does not match its neighbours.

The store is committed (`statement_basis.json`) because the source it was
extracted from is gitignored, and a fix CI cannot reproduce is not a fix.
"""
from __future__ import annotations

import argparse
import collections
import json
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
STORE = pathlib.Path(__file__).resolve().parent / "statement_basis.json"
COMPANIES = REPO / "public" / "data" / "v1" / "companies"


def load_store() -> dict:
    if not STORE.exists():
        return {}
    return json.loads(STORE.read_text(encoding="utf-8")).get("filings", {})


def news_id(filing_id: object) -> str:
    return str(filing_id or "").replace("egx-", "").strip()


def rows_of(doc: dict) -> list:
    fin = doc.get("financials") or {}
    return list(fin.get("annual") or []) + list(fin.get("quarterly") or [])


def apply(*, write: bool) -> int:
    store = load_store()
    if not store:
        print("── Statement basis: no store; nothing to name")
        return 0

    stamped = 0
    mixed: dict[str, collections.Counter] = {}
    for path in sorted(COMPANIES.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        ticker = doc.get("ticker") or path.stem
        seen: collections.Counter = collections.Counter()
        changed = False
        for row in rows_of(doc):
            record = store.get(news_id(row.get("filing_id")))
            if not record:
                continue
            basis = record.get("basis")
            if not basis:
                continue
            seen[basis] += 1
            if row.get("basis") != basis:
                row["basis"] = basis
                changed = True
            stamped += 1
        if len(seen) > 1:
            mixed[ticker] = seen
        if changed and write:
            path.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n",
                            encoding="utf-8")

    verb = "named" if write else "would name"
    print(f"── Statement basis: {verb} the basis on {stamped} filed rows")
    if mixed:
        # Not an error. A company that files both is a fact about the company,
        # and saying so beats a series that quietly averages the two.
        worst = sorted(mixed.items(), key=lambda kv: -sum(kv[1].values()))[:6]
        print(f"   {len(mixed)} companies file on both bases; the readers know now")
        for ticker, seen in worst:
            print(f"     {ticker}: " + ", ".join(f"{n} {b}" for b, n in seen.most_common()))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="report without writing")
    args = parser.parse_args()
    return apply(write=not args.check)


if __name__ == "__main__":
    raise SystemExit(main())
