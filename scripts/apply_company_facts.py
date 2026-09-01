#!/usr/bin/env python3
"""The listing facts the directory knows, on the document beside it.

Three fields the directory carries and the per-company document did not, or
carried differently. Each was the same shape of bug: the market table read one
value and the company screen read another, with nothing to say which was right.

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

AND THE CURRENCY, for the same reason and with sharper consequences.

Eleven of the exchange's listings are quoted in dollars. The market table was
taught that; the company document was not, so the company screen printed CFGH's
0.118 in a column of pounds — eleven piastres for eleven cents — beside a market
value of 2.83 billion, which really is pounds. Price times shares came to a
fiftieth of the company. Nothing on the screen said the two figures were in
different money.

Absent means the pound, which is 273 of the 284 and does not need saying.

WHERE THESE COME FROM

`data-source/egx-beta/session.json` — the exchange's own market-watch, harvested
and committed. Not the directory, which is downstream of it, and not the vendor
scan, which is a 2 MB file outside the repository that CI does not have.

That distinction is the whole point. The market build reads the session, resolves
all three fields correctly, and writes them to the directory — and it only runs
where the scan is. So on the day the sectors were re-keyed, CI rebuilt everything
it could and left 217 company documents contradicting the directory, and the
eleven dollar listings reached no screen at all, because the one step that knew
could not run. Reading the committed session closes that: same authority, same
answer, everywhere, for no network at all.
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
SESSION = REPO / "data-source" / "egx-beta" / "session.json"

# What the exchange states, and what it is called on a published document.
FIELDS = (("sector", "sector"), ("sector_ar", "sector_ar"), ("currency", "currency"))


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def stated() -> dict[str, dict]:
    """What the exchange states about each listing, from the committed session."""
    securities = load(SESSION).get("securities") or {}
    out = {}
    for ticker, held in securities.items():
        facts = {name: held.get(key) for key, name in FIELDS if held.get(key)}
        if facts:
            out[str(ticker).strip().upper()] = facts
    return out


def align(doc: dict, facts: dict) -> bool:
    """Write the stated facts onto a document. True when anything moved.

    A field the exchange does not state is LEFT ALONE, not cleared: it does not
    classify every listing, and an absent sector is not a claim that a company
    has none. What is already published stays until the exchange says otherwise.
    """
    moved = False
    for _, name in FIELDS:
        value = facts.get(name)
        if value and doc.get(name) != value:
            doc[name] = value
            moved = True
    return moved


def apply(write: bool = True) -> int:
    print("── Company facts")
    facts = stated()
    if not facts:
        print("   no harvested session — leaving the documents alone")
        return 0

    directory = load(DIRECTORY)
    rows = directory.get("companies") or []
    docs = listed = 0

    for row in rows:
        ticker = str(row.get("ticker") or "").strip().upper()
        if ticker in facts and align(row, facts[ticker]):
            listed += 1
            # The directory records where its classification came from, so a
            # reader of the file can tell the exchange's answer from a guess.
            if facts[ticker].get("sector"):
                row["sector_source"] = "EGX"
    if listed and write:
        DIRECTORY.write_text(
            json.dumps(directory, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8")
        mirror = FIXTURES / "companies.json"
        if mirror.exists():
            mirror.write_text(
                json.dumps(directory, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8")

    for ticker, stated_facts in sorted(facts.items()):
        for root in (COMPANIES, FIXTURES / "companies"):
            path = root / f"{ticker}.json"
            doc = load(path)
            if not doc or not align(doc, stated_facts):
                continue
            if root is COMPANIES:
                docs += 1
            if write:
                path.write_text(
                    json.dumps(doc, ensure_ascii=False, separators=(",", ":")),
                    encoding="utf-8")

    verb = "would be" if not write else ""
    foreign = sum(1 for f in facts.values() if f.get("currency"))
    print(f"   {len(facts)} listings stated by the exchange, {foreign} priced "
          f"in another currency")
    print(f"   {listed} directory rows and {docs} company documents {verb} "
          f"realigned".replace("  ", " "))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="report without writing")
    args = parser.parse_args()
    return apply(write=not args.check)


if __name__ == "__main__":
    raise SystemExit(main())
