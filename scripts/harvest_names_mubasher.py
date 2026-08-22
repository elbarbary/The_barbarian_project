#!/usr/bin/env python3
"""Every listed company's Arabic name, from the one page that prints it.

The news matcher can only name a company whose Arabic name we hold, and we
held 86 of 282 — harvested a few at a time from the exchange's own filing
titles, which only teaches us about companies that happened to file. At the
exchange's rate limit that map fills over weeks, and every day it is short is a
day of headlines the app cannot join to a company.

Mubasher's Arabic company page puts the name in its `<title>`:

    البنك التجاري الدولي - مصر ( سي أي بي) - معلومات مباشر

and it answers plain HTTP — no browser, no challenge, no key. One request per
company at the `Crawl-delay: 5` their robots.txt publishes is twenty-five
minutes for the entire exchange.

**It is the street name, which is the better one.** The exchange files under
the full legal name — "ابوقير للاسمدة والصناعات الكيماوية" — and a newspaper
writes what this page prints. Matching wants the second.

Resumable and additive: a company already known is skipped, nothing is ever
removed, and a name that cannot be read leaves the existing one alone.

Usage:
    python3 scripts/harvest_names_mubasher.py [--limit 0] [--refresh]
"""

from __future__ import annotations

import argparse
import html as html_lib
import json
import pathlib
import re
import sys
import time
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

REPO = pathlib.Path(__file__).resolve().parent.parent
COMPANIES = REPO / "public" / "data" / "v1" / "companies.json"
NAMES = pathlib.Path(__file__).resolve().parent / "company_names_ar.json"

PAGE = "https://www.mubasher.info/markets/EGX/stocks/{}"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0 Safari/537.36"
)

# What their robots.txt asks for.
CRAWL_DELAY = 5

# The site's own suffix, and the separator it uses before it.
SUFFIX = re.compile(r"\s*-\s*معلومات مباشر\s*$")

TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.S)
ARABIC = re.compile(r"[؀-ۿ]")


def name_from(page: str) -> str | None:
    """The company's Arabic name, or None when the page is not one."""
    found = TITLE.search(page)
    if not found:
        return None
    title = html_lib.unescape(found.group(1)).strip()
    title = SUFFIX.sub("", title).strip()
    # A title with no Arabic in it is an error page or an English fallback.
    if not ARABIC.search(title) or len(title) < 4:
        return None
    return " ".join(title.split())


def fetch(ticker: str, timeout: int = 25) -> str | None:
    request = urllib.request.Request(
        PAGE.format(ticker),
        headers={"User-Agent": UA, "Accept-Language": "ar,en;q=0.8"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read().decode("utf-8", "replace")
    except Exception:
        return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="0 means all")
    parser.add_argument("--refresh", action="store_true",
                        help="re-read companies already held")
    parser.add_argument("--only", help="a single ticker, for checking")
    args = parser.parse_args()

    print("── Arabic company names")
    try:
        known = json.loads(NAMES.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        known = {}
    directory = json.loads(COMPANIES.read_text(encoding="utf-8"))
    tickers = [c["ticker"] for c in directory["companies"] if c.get("ticker")]

    if args.only:
        queue = [args.only]
    else:
        queue = [t for t in tickers if args.refresh or t not in known]
    if args.limit:
        queue = queue[: args.limit]

    print(f"   {len(known)} of {len(tickers)} known · asking {len(queue)}, "
          f"{CRAWL_DELAY}s apart (~{len(queue) * CRAWL_DELAY // 60} min)")
    if not queue:
        print("   nothing to do")
        return 0

    added = missed = 0
    for index, ticker in enumerate(queue):
        if index:
            time.sleep(CRAWL_DELAY)
        page = fetch(ticker)
        name = name_from(page) if page else None
        if not name:
            missed += 1
            continue
        # Never overwrite a name with a worse one: the exchange's own is the
        # authority where we have it and this only fills gaps, unless asked.
        if ticker not in known or args.refresh:
            known[ticker] = name
            added += 1
        if added and added % 20 == 0:
            NAMES.write_text(
                json.dumps(known, ensure_ascii=False, indent=1, sort_keys=True),
                encoding="utf-8",
            )
            print(f"   … {added} added, {missed} unreadable")

    NAMES.write_text(
        json.dumps(known, ensure_ascii=False, indent=1, sort_keys=True),
        encoding="utf-8",
    )
    print(f"\n   +{added} names · {len(known)} of {len(tickers)} companies "
          f"· {missed} unreadable")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
