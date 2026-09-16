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

**A 404 is an answer, and it is remembered for a week.** Fourteen listed
companies have no page on Mubasher under their exchange symbol — ANCC, CID,
EGOTH and eleven more answered 404 on 16 Sep 2026, with COMI answering 200
beside them — and the queue is in directory order, so the first twelve of
them were asked in 115 of the 116 builds from 3 to 16 Sep: a minute a run
for nothing. A ticker that 404s is not asked again for `ABSENT_FOR_DAYS`,
which is long enough to stop the waste and short enough that a new listing
whose page arrives a few days late is still picked up.

Usage:
    python3 scripts/harvest_names_mubasher.py [--limit 0] [--refresh]
"""

from __future__ import annotations

import argparse
import datetime
import html as html_lib
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from step_outcome import NO_PROGRESS  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
COMPANIES = REPO / "public" / "data" / "v1" / "companies.json"
NAMES = pathlib.Path(__file__).resolve().parent / "company_names_ar.json"
# Ticker -> the day Mubasher answered 404 for it.
ABSENT = pathlib.Path(__file__).resolve().parent / "company_names_ar_absent.json"
ABSENT_FOR_DAYS = 7

PAGE = "https://www.mubasher.info/markets/EGX/stocks/{}"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0 Safari/537.36"
)

# What their robots.txt asks for.
CRAWL_DELAY = 5

# The site's own suffix, and the separator it uses before it.
SUFFIX = re.compile(r"\s*-\s*معلومات مباشر\s*$")
# The whole title of the site's own not-found page, suffix and all. It is
# Arabic and long enough to pass for a name, so it has to be refused by name.
SITE = re.compile(r"^\s*معلومات مباشر\s*$")

TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.S)
ARABIC = re.compile(r"[؀-ۿ]")


def name_from(page: str) -> str | None:
    """The company's Arabic name, or None when the page is not one."""
    found = TITLE.search(page)
    if not found:
        return None
    title = html_lib.unescape(found.group(1)).strip()
    if SITE.match(title):
        return None
    title = SUFFIX.sub("", title).strip()
    # A title with no Arabic in it is an error page or an English fallback.
    if not ARABIC.search(title) or len(title) < 4:
        return None
    return " ".join(title.split())


def fetch(ticker: str, timeout: int = 25) -> tuple[int | None, str | None]:
    """(status, page). A status of None is no answer at all.

    Kept apart because they mean opposite things: 404 is Mubasher saying it
    has no such page, and a timeout or a 403 is Mubasher not saying anything.
    """
    request = urllib.request.Request(
        PAGE.format(ticker),
        headers={"User-Agent": UA, "Accept-Language": "ar,en;q=0.8"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        error.close()
        return error.code, None
    except Exception:
        return None, None


def recently_absent(absent: dict, today: datetime.date) -> set[str]:
    """Tickers Mubasher answered 404 for within the last ABSENT_FOR_DAYS."""
    fresh = set()
    for ticker, day in absent.items():
        try:
            asked = datetime.date.fromisoformat(day)
        except (TypeError, ValueError):
            continue
        if (today - asked).days < ABSENT_FOR_DAYS:
            fresh.add(ticker)
    return fresh


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
    try:
        absent = json.loads(ABSENT.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        absent = {}
    if not isinstance(absent, dict):
        absent = {}
    directory = json.loads(COMPANIES.read_text(encoding="utf-8"))
    tickers = [c["ticker"] for c in directory["companies"] if c.get("ticker")]
    today = datetime.date.today()
    skip = recently_absent(absent, today)

    if args.only:
        queue = [args.only]
    else:
        queue = [t for t in tickers
                 if (args.refresh or t not in known) and t not in skip]
    if args.limit:
        queue = queue[: args.limit]

    waiting = len([t for t in tickers if t not in known and t in skip])
    print(f"   {len(known)} of {len(tickers)} known · asking {len(queue)}, "
          f"{CRAWL_DELAY}s apart (~{len(queue) * CRAWL_DELAY // 60} min)"
          + (f" · {waiting} with no Mubasher page, asked again after "
             f"{ABSENT_FOR_DAYS} days" if waiting else ""))
    if not queue:
        print("   nothing to do")
        return 0

    added = missed = gone = 0
    for index, ticker in enumerate(queue):
        if index:
            time.sleep(CRAWL_DELAY)
        status, page = fetch(ticker)
        if status in (404, 410):
            absent[ticker] = today.isoformat()
            gone += 1
            continue
        name = name_from(page) if page else None
        if not name:
            missed += 1
            continue
        absent.pop(ticker, None)
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
    # Only tickers still unnamed: one named since, by this or by the filings,
    # has nothing left to wait for.
    absent = {t: day for t, day in absent.items() if t not in known}
    ABSENT.write_text(
        json.dumps(absent, ensure_ascii=False, indent=1, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"\n   +{added} names · {len(known)} of {len(tickers)} companies "
          f"· {gone} with no page · {missed} unreadable")
    # A 404 is Mubasher answering, and it takes the ticker out of the queue.
    # Nothing but unreadable pages and silence is no progress.
    if not added and not gone:
        print(f"   Mubasher answered none of the {len(queue)} asked — no progress this run")
        return NO_PROGRESS
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
