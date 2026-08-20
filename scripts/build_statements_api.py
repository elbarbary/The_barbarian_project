#!/usr/bin/env python3
"""Collect filed annual statements for every listed company.

One page per company from Mubasher, five seconds apart because that is the
crawl delay their robots.txt publishes. The whole market takes about twenty-five
minutes, which is fine for something that changes four times a year.

Every company's figures are scale-checked against its market capitalisation
before being stored — see `mubasher_statements.scale_for` for why that check is
not optional — and any company that fails is skipped and named in the output
rather than quietly dropped.

The store is cumulative: a run that is interrupted, blocked or partial keeps
everything already collected. Nothing is ever removed by a failed run.

**Cadence, and why this is not in `build_all`.** Statements change four times a
year and the run takes half an hour, so it is not part of the daily build. The
store is committed, so the data ships without CI ever fetching it — the same
arrangement as the Arabic name map. Re-run it by hand after a reporting season,
with `--refresh` to re-read companies already held.

It is also deliberately not in a GitHub workflow: the fetch depends on getting
past Cloudflare with a browser user agent, and a datacentre IP is a much worse
place to try that from than this laptop.

Usage:
    python3 scripts/build_statements_api.py [--limit N] [--refresh] [--only TICKER]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import time

from mubasher_statements import CRAWL_DELAY, fetch_page, statements_for

REPO = pathlib.Path(__file__).resolve().parent.parent
STORE = pathlib.Path(__file__).resolve().parent / "statements_filed.json"
COMPANIES = REPO / "public" / "data" / "v1" / "companies.json"
DETAILS = REPO / "public" / "data" / "v1" / "companies"


def listed() -> list[dict]:
    """Tradable companies with a market capitalisation, largest first.

    The capitalisation is what the scale check is measured against, so a
    company without one cannot be published however good its statements are.
    Largest first means a partial run covers the companies most people hold.
    """
    try:
        companies = json.loads(COMPANIES.read_text())["companies"]
    except (json.JSONDecodeError, KeyError, OSError):
        return []
    rows = []
    for company in companies:
        ticker = company["ticker"]
        # The index carries names and sectors; the capitalisation lives in the
        # per-company document, which is where the scanner's profile lands.
        detail_path = DETAILS / f"{ticker}.json"
        cap = None
        if detail_path.exists():
            try:
                detail = json.loads(detail_path.read_text())
                cap = (detail.get("profile") or {}).get("market_cap")
            except (json.JSONDecodeError, OSError):
                cap = None
        rows.append({"ticker": ticker, "market_cap": cap})
    rows.sort(key=lambda r: r["market_cap"] or 0, reverse=True)
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="0 means all")
    parser.add_argument("--refresh", action="store_true",
                        help="re-read companies already stored")
    parser.add_argument("--only", help="a single ticker, for checking")
    args = parser.parse_args()

    print("── Filed annual statements")

    store: dict = {"companies": {}, "skipped": {}}
    if STORE.exists():
        try:
            store = json.loads(STORE.read_text())
            store.setdefault("companies", {})
            store.setdefault("skipped", {})
        except json.JSONDecodeError:
            print("   ! store unreadable — refusing to overwrite it")
            return 1

    rows = listed()
    if args.only:
        rows = [r for r in rows if r["ticker"] == args.only.upper()]
    if not args.refresh:
        rows = [r for r in rows if r["ticker"] not in store["companies"]]
    if args.limit:
        rows = rows[: args.limit]

    if not rows:
        print(f"   nothing to do ({len(store['companies'])} companies stored)")
        return 0

    print(f"   {len(rows)} companies, {CRAWL_DELAY}s apart "
          f"(~{len(rows) * CRAWL_DELAY // 60} min)")

    added = skipped = 0
    for index, row in enumerate(rows):
        if index:
            time.sleep(CRAWL_DELAY)
        ticker = row["ticker"]
        page = fetch_page(ticker)
        if page is None:
            store["skipped"][ticker] = "page could not be fetched"
            skipped += 1
            continue
        figures, why = statements_for(page, row["market_cap"])
        if figures is None:
            # Named, not silent. A company missing from the app because its
            # numbers could not be trusted is a decision worth being able to
            # audit later.
            store["skipped"][ticker] = why
            skipped += 1
            continue
        store["companies"][ticker] = figures
        store["skipped"].pop(ticker, None)
        added += 1
        if added % 25 == 0:
            # Written as we go: twenty-five minutes is long enough that losing
            # a run to a stray exception would be genuinely annoying.
            STORE.write_text(json.dumps(store, ensure_ascii=False, indent=1,
                                        sort_keys=True), encoding="utf-8")
            print(f"   … {added} stored, {skipped} skipped")

    STORE.write_text(
        json.dumps(store, ensure_ascii=False, indent=1, sort_keys=True),
        encoding="utf-8",
    )

    total = len(store["companies"])
    years = sum(len(v) for v in store["companies"].values())
    print(f"\n   +{added} companies, {skipped} skipped this run")
    print(f"   {total} companies carry statements, {years} company-years")
    if store["skipped"]:
        from collections import Counter
        for reason, count in Counter(store["skipped"].values()).most_common():
            print(f"     {count:4} skipped — {reason}")
    print(f"\nwrote {STORE.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
