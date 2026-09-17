#!/usr/bin/env python3
"""The code the directory publishes a listing under, for every code it filed under.

A company keeps its ISIN when the exchange changes its code, and nothing else
about it moves: Arab Valves Company filed as ARVA.CA from 2010 until the
Listing Committee renamed it Arabian Metal Industries and Industrial
Investments, code AMII.CA, on 22 July 2026 (NewsID 291839). Every filing keeps
the code it was titled with, so anything keyed by the code in a title splits
one company in two. On 17 Sep 2026 the ownership board drew AMII's register and
14 of its holders under ARVA, which the directory does not list, and the same
holder under both codes; FCMD's was split between ICMI and FCMD. The calendar's
ticker chip opened a company screen for ARVA that does not exist, and AMII's
own filings page carried 13 of its 477 filings.

Nothing here is typed by hand. The exchange states both halves:

* **Which listing a code belongs to.** The filing archive files each item with
  the code in its title and the ISIN in its own field. ARVA's 462 filings that
  carry an ISIN all carry EGS3E1E1C013.
* **What that listing is called today.** The exchange's market watch pairs
  every ISIN it quotes with its code (`session.json` `isins`): EGS3E1E1C013 is
  AMII.

A code folds into a directory ticker only when all four hold, each paid for by
a real case in the archive:

1. **Its filings name one ISIN.** At least `SHARE` of the code's filings that
   carry an ISIN carry the same one. The pairing is occasionally wrong at
   source, one filing in hundreds (NAHO carries another company's ISIN 10 times
   in 4,839, PORT and AMER swapped two each when Porto Group was demerged), and
   a code used by two listings in turn would show both.
2. **The market watch quotes that ISIN, under a code the directory lists.**
   The archive alone is not enough. SIDC files once, on 13 Sep 2026, under the
   ISIN the directory's MITR filed its temporary listing with, and the watch
   quotes neither, so nothing says they are one listing. And Arabia Investments
   Holding is AIH in the directory while the watch quotes its ISIN as AIHC,
   a month after a demerger (NewsID 274173): which half kept which code is not
   something this can read, so AIHC folds into nothing.
3. **It is not a code anything lists today.** A directory ticker is never
   folded, which keeps the dollar and pound lines of one company apart (FAIT
   and FAITA, VLMR and VLMRA share a company and are two listings), and neither
   is a code the market watch quotes.
4. **It is the older code.** A code that first appears after the current one
   is not its former code. CAEG's two filings came five years after CIEB's
   first, and MGOI's forty sit inside AJWA's own record. Filers keep typing the
   old code for years (MBEN until Aug 2026, two years after MBEG), so the test
   is when a code began, not when it stopped.

Chains need no second pass: QNBA and NSGB both fold straight into QNBE, the
code the watch quotes today, and a folded code never becomes a target.

Measured on 17 Sep 2026: 30 codes fold, among them the subject of every Name &
Ticker's Code Modification notice whose ISIN the watch quotes under a directory
ticker. PORT folds into ARAB with no such notice: Porto Group became Arab
Developers Holding under one ISIN, and filed as PORT.CA until June 2026. HAVC
(renamed GROV, NewsID 293979) waits until the watch quotes its ISIN.

Usage:
    python3 scripts/listing_codes.py          # the table and the evidence
    python3 scripts/listing_codes.py --json
"""

from __future__ import annotations

import argparse
import collections
import functools
import json
import pathlib

import listing_status

REPO = pathlib.Path(__file__).resolve().parent.parent
FILINGS = listing_status.FILINGS
SESSION = listing_status.SESSION
DIRECTORY = REPO / "public" / "data" / "v1" / "companies.json"

# The share of a code's ISIN-carrying filings that must name one ISIN. Every
# renamed code in the archive is at 99.1% or above (NSGB, 116 of 117); the only
# codes below 95% are MITR (2 of 3) and a money-market fund's (3 of 4).
SHARE = 0.95


def market_watch(session: pathlib.Path = SESSION) -> dict[str, str]:
    """ISIN → the code the exchange's market watch quotes it under."""
    try:
        held = json.loads(session.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    out = {}
    for isin, row in (held.get("isins") or {}).items():
        code = row.get("code") if isinstance(row, dict) else None
        if isinstance(code, str) and code:
            out[str(isin).strip().upper()] = code.strip().upper()
    return out


def listed(directory: pathlib.Path = DIRECTORY) -> set[str]:
    """The tickers the directory publishes."""
    try:
        doc = json.loads(directory.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return set()
    return {c["ticker"] for c in doc.get("companies") or []
            if isinstance(c, dict) and c.get("ticker")}


def derive(items: list[dict], watch: dict[str, str],
           directory: set[str]) -> dict[str, dict]:
    """old code → the evidence for folding it, `code` being where it folds."""
    pairs: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    first: dict[str, str] = {}
    for item in items:
        heading = f"{item.get('heading') or ''} {item.get('headingArabic') or ''}"
        tickers = set(listing_status.TICKER.findall(heading))
        stamp = str(item.get("dateStamp") or "")[:10]
        for ticker in tickers:
            if stamp and (ticker not in first or stamp < first[ticker]):
                first[ticker] = stamp
        field = listing_status._isin_field(item)
        if len(tickers) == 1 and len(field) == 12:
            pairs[next(iter(tickers))][field] += 1

    quoted = set(watch.values())
    out: dict[str, dict] = {}
    for code, counts in pairs.items():
        if code in directory or code in quoted:
            continue
        isin, named = counts.most_common(1)[0]
        carried = sum(counts.values())
        if named < SHARE * carried:
            continue
        target = watch.get(isin)
        if not target or target == code or target not in directory:
            continue
        if target in first and first[code] >= first[target]:
            continue
        out[code] = {"code": target, "isin": isin, "filings": named,
                     "withIsin": carried, "since": first.get(code),
                     "currentSince": first.get(target)}
    return out


@functools.lru_cache(maxsize=None)
def _cached(folder: str, session: str, directory: str) -> dict[str, dict]:
    watch = market_watch(pathlib.Path(session))
    names = listed(pathlib.Path(directory))
    if not watch or not names:
        return {}
    items = listing_status.load_items(pathlib.Path(folder))
    return derive(items, watch, names) if items else {}


def evidence(folder: pathlib.Path = FILINGS, session: pathlib.Path = SESSION,
             directory: pathlib.Path = DIRECTORY) -> dict[str, dict]:
    """old code → the evidence behind folding it. Empty when an input is missing."""
    return _cached(str(folder), str(session), str(directory))


def renamed(folder: pathlib.Path = FILINGS, session: pathlib.Path = SESSION,
            directory: pathlib.Path = DIRECTORY) -> dict[str, str]:
    """old code → the directory ticker it folds into.

    Empty when the archive, the market watch or the directory is not on disk,
    which leaves every caller keying by the code a filing printed, exactly as
    before this existed.
    """
    return {old: row["code"] for old, row in
            evidence(folder, session, directory).items()}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--json", action="store_true", help="print JSON")
    args = parser.parse_args()
    table = evidence()
    if args.json:
        print(json.dumps(table, ensure_ascii=False, indent=1, sort_keys=True))
        return 0
    print(f"── Listing codes: {len(table)} earlier codes fold into a directory ticker")
    for old, row in sorted(table.items(), key=lambda kv: (kv[1]["code"], kv[0])):
        print(f"   {old:<7} → {row['code']:<6} {row['isin']}  {row['filings']}/"
              f"{row['withIsin']} filings, from {row['since']} "
              f"(the current code from {row['currentSince'] or 'none yet'})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
