#!/usr/bin/env python3
"""Who a listed company is: its industry, its owners, and what it owns.

The app has never held a single sentence about what any of its 282 companies
actually **is**. It holds market metrics, a decade of filed net profit, and
191,484 filings — and none of that says that Ataqa makes steel.

That gap is not an oversight, it is a property of the sources. The exchange
publishes no business description anywhere: its BFF's `stock-info` is identity
and market metrics for 260 companies, its old site's `CompanyDetails.aspx` is
nineteen fields of the same kind, and the filings archive answers "is engaged
in" zero times across every row it holds. The filing bodies are one sentence
each and their attachments are unfetched pointers.

Mubasher's per-company profile page is the one machine-fetchable, whole-market
source anyone found. Keyed on the app's own ticker:

    https://english.mubasher.info/markets/EGX/stocks/{TICKER}/profile

Server-rendered HTML, no JS, no cookies — the same fetch this repo already
makes for financial statements, at a different path. Verified on ten tickers
nobody had touched, across health, steel, telecom, warehousing, leasing, real
estate, brokerage, dairy and cement: all ten answered with real content.

WHAT IT IS, AND WHAT IT IS NOT
------------------------------
It is an **identity card**, and the app must not oversell it. "Ataqa operates
within the Materials sector focusing on Steel, is based in Cairo and was
established in May 1998" tells a reader what kind of company this is; it does
not say how it earns, what its segments are, or where its plants sit.

What lifts it above a sector label is the rest of the page: **who owns it, and
what it owns**. Ajwa is 61.6% held by one person and holds 80% of a GCC arm
and 74.9% of Orouba Agrifoods. That is the shape of a business, from a source
that names itself.

POLITENESS
----------
`robots.txt` publishes `Crawl-delay: 5` for `User-agent: *` and does not
disallow `/markets/`. This waits six, asks for one company at a time, and
stops the moment the host refuses rather than pushing through it. A full pass
over 282 companies is under half an hour and only ever needs doing once —
after that only listings the directory has newly gained.
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
import transport

from mubasher_statements import BROWSER_UA

REPO = pathlib.Path(__file__).resolve().parent.parent
DIRECTORY = REPO / "public" / "data" / "v1" / "companies.json"
STORE = pathlib.Path(__file__).resolve().parent / "company_profiles.json"

PAGE = "https://english.mubasher.info/markets/EGX/stocks/{}/profile"
SOURCE = "Mubasher"

# One second over their published crawl-delay. This job has no reason to hurry
# and a source that answers everything is worth keeping on side.
DELAY = 6

# The labelled fields in the General Information block, and the key each maps
# to. Anything else on the page is ignored rather than guessed at.
WANTED = {
    "company name": "name",
    "company purpose": "purpose",
    "company establish date": "established",
    "financial year start": "financial_year_start",
    "auditor": "auditor",
}

PAIR = re.compile(
    r'general-information__text1"[^>]*>(.*?)</span>.*?'
    r'general-information__text2"[^>]*>(.*?)</span>',
    re.S,
)
HEADING = re.compile(r'global__h2"[^>]*>(.*?)</h2>')
ROW = re.compile(r"<li[^>]*>(.*?)</li>", re.S)
PERCENT = re.compile(r'number"[^>]*>\s*([\d.]+)\s*%?\s*</span>')
# The value is a `<span>` for most labels and an `<a href=...>` for Website,
# so the tag and its attributes are matched loosely rather than assumed.
CONTACT = re.compile(
    r'contact-information__text1[^>]*>(.*?)</\w+>.*?'
    r'contact-information__text2[^>]*>(.*?)</\w+>',
    re.S,
)


class Refused(RuntimeError):
    """The host said no. Stop, do not retry, try again another day."""


def text(raw: str) -> str:
    return " ".join(html_lib.unescape(re.sub(r"<[^>]+>", " ", raw or "")).split())


def fetch(ticker: str, timeout: int = 30) -> str | None:
    request = urllib.request.Request(
        PAGE.format(ticker),
        headers={
            "User-Agent": BROWSER_UA,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        if error.code in (403, 429, 503):
            raise Refused(f"HTTP {error.code}") from error
        return None
    except transport.TRANSPORT:
        return None


def section(page: str, name: str) -> str:
    """The markup between one `global__h2` heading and the next.

    Ownership and Subsidiaries use identical row markup, so a pattern run over
    the whole page returns a company's majority shareholder as one of its
    subsidiaries. The heading is the only thing separating them.
    """
    headings = list(HEADING.finditer(page))
    for index, match in enumerate(headings):
        if text(match.group(1)).lower() != name.lower():
            continue
        start = match.end()
        end = headings[index + 1].start() if index + 1 < len(headings) else len(page)
        return page[start:end]
    return ""


def holdings(page: str, name: str, limit: int = 12) -> list[dict]:
    """`[{"name": ..., "stake": 61.6}]` from one section of the page."""
    out = []
    for row in ROW.findall(section(page, name)):
        # The percentage sits in its own span inside a parenthesised wrapper.
        # Stripping tags first would glue it to the name; stripping only the
        # span leaves the brackets behind — "Mohamed Essa Al Jaber (".
        percent = PERCENT.search(row)
        label = text(PERCENT.sub(" ", row)).strip(" ()،,-")
        if not label:
            continue
        entry: dict = {"name": label[:120]}
        if percent:
            try:
                entry["stake"] = float(percent.group(1))
            except ValueError:
                pass
        out.append(entry)
        if len(out) >= limit:
            break
    return out


def parse(page: str) -> dict | None:
    profile: dict = {}
    for label, value in PAIR.findall(page):
        key = WANTED.get(text(label).rstrip(":").lower())
        if key:
            profile[key] = text(value)

    # No purpose line means no page worth keeping — Mubasher answers 200 with
    # a shell for tickers it does not carry.
    if not profile.get("purpose"):
        return None

    profile["owners"] = holdings(page, "Ownership")
    profile["subsidiaries"] = holdings(page, "Subsidiaries")

    for label, value in CONTACT.findall(page):
        if text(label).rstrip(":").lower() == "website":
            profile["website"] = text(value)[:200]
            break

    profile["source"] = SOURCE
    profile["source_url"] = None  # filled by the caller, which knows the ticker
    return profile


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def tickers() -> list[str]:
    try:
        doc = json.loads(DIRECTORY.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    return sorted(c["ticker"] for c in doc.get("companies", []) if c.get("ticker"))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=0,
                    help="stop after N companies (0 = every one still missing)")
    ap.add_argument("--only", help="one ticker, for checking")
    ap.add_argument("--refresh", action="store_true",
                    help="re-fetch companies already held")
    args = ap.parse_args()

    print("── Company profiles")
    held = load(STORE)
    wanted = [args.only] if args.only else tickers()
    if not wanted:
        print("   no company directory to work from")
        return 0

    todo = [t for t in wanted if args.refresh or args.only or t not in held]
    if not todo:
        print(f"   {len(held)} held, nothing new in the directory")
        return 0

    done = missed = 0
    try:
        for ticker in todo:
            if args.limit and done + missed >= args.limit:
                break
            if done or missed:
                time.sleep(DELAY)
            page = fetch(ticker)
            profile = parse(page) if page else None
            if not profile:
                # Mubasher does not carry every EGX listing. Recorded as a miss
                # so a later run does not keep asking for it.
                held[ticker] = {"source": SOURCE, "missing": True,
                                "checked": datetime.date.today().isoformat()}
                missed += 1
                continue
            profile["source_url"] = PAGE.format(ticker)
            profile["fetched"] = datetime.date.today().isoformat()
            held[ticker] = profile
            done += 1
            if done % 20 == 0:
                print(f"   {done} profiles, {missed} not carried", flush=True)
                STORE.write_text(json.dumps(held, ensure_ascii=False, indent=1),
                                 encoding="utf-8")
    except Refused as error:
        print(f"!! Mubasher refused — stopping: {error}", file=sys.stderr)

    STORE.write_text(json.dumps(held, ensure_ascii=False, indent=1), encoding="utf-8")
    carried = sum(1 for v in held.values() if not v.get("missing"))
    print(f"   {done} fetched this run, {missed} not carried by Mubasher")
    print(f"   {carried} of {len(wanted)} companies now have a profile")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
