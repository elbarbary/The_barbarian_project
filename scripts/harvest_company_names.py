#!/usr/bin/env python3
"""Harvest Arabic company names from the exchange's own filing titles.

Every EGX disclosure is titled `ARABIC NAME (TICKER.CA) — what happened`, which
makes the exchange itself a free, authoritative source of ticker→Arabic-name
pairs. No model, no matching, no guessing: the two are printed side by side by
the people who maintain the register.

**Why not ask a model.** Tried, measured, discarded. Gemini returns the formal
registered name — "شركة أبو قير للأسمدة والصناعات الكيماوية" — while newspapers
and the exchange both use the street name, "أبو قير". Verification against Al
Borsa's tag taxonomy matched 0 of 4 before the free tier refused more calls, and
loosening the match is what produced the "Arabian Cement → أرابيا انفستمنتس"
class of error. The filing titles give the street name directly, which is the
form that is actually useful.

**Why not the autocomplete service.** The search page has one — `GetCompanyList_ar`
on `WebService.asmx` — and it would enumerate the register in a handful of
calls. It sits behind an F5 bot-defence WAF that answers a JavaScript challenge
instead of JSON, even from inside the browser session.

Companies that never file never appear, which is honest — and they are also
the ones nobody writes about.

Coverage accumulates on its own: `build_disclosures_api.py` extracts names on
every run at no extra cost, because it is already reading the same titles. This
script only exists to catch up history, and it paces itself when it does.

Usage:
    python3 scripts/harvest_company_names.py [--days 20]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import subprocess
import sys
from datetime import date, timedelta

import scrapling_python

REPO = pathlib.Path(__file__).resolve().parent.parent
MAP = pathlib.Path(__file__).resolve().parent / "company_names_ar.json"
COMPANIES = REPO / "public" / "data" / "v1" / "companies.json"

SCRAPLING_PY = scrapling_python.find()
BASE = "https://www.egx.com.eg/ar/NewsSearch.aspx"

TITLE = re.compile(
    r'lblTitle"?>(.*?)</span>', re.S
)

# Boilerplate the exchange prefixes a company name with. Stripped so the stored
# name is the company, not the sentence it appeared in.
LEAD = re.compile(
    r"^(?:بيان\s+من|بيان\s+بخصوص|بيان|إفصاح\s+من|إفصاح|"
    r"إيقاف\s+التعامل\s+على|إعادة\s+التعامل\s+على|وقف\s+التعامل\s+على|"
    r"استئناف\s+التعامل\s+على|تعديل|رد\s+من|ردا\s+على|إعلان\s+من)\s+",
    re.U,
)

ARABIC = re.compile(r"[؀-ۿ]")


def text(raw: str) -> str:
    import html as html_lib

    return " ".join(html_lib.unescape(re.sub(r"<[^>]+>", " ", raw or "")).split())


def fetch_days(days: int) -> list[str]:
    """One browser session, one navigation per day."""
    script = r'''
import sys, json
from scrapling.fetchers import StealthyFetcher


urls = json.loads(sys.argv[1])
pages = []

def walk(page):
    pages.append(page.content())
    for u in urls[1:]:
        # Paced deliberately. An unthrottled run of 150 navigations had this
        # host reset the connection on 148 of them — a ten-day run at full
        # speed was fine, so the limit sits somewhere below that. This is a
        # public exchange serving regulatory filings, not a competitor's API,
        # and a catch-up harvest is never urgent enough to lean on it.
        page.wait_for_timeout(2500)
        try:
            page.goto(u, wait_until="domcontentloaded", timeout=40000)
            page.wait_for_selector("[id$='GVNews']", timeout=15000)
            pages.append(page.content())
        except Exception as exc:
            sys.stderr.write(f"skip: {str(exc)[:60]}\n")
            if "RESET" in str(exc) or "REFUSED" in str(exc):
                # Being cut off means stop, not retry harder.
                sys.stderr.write("halting: the host is refusing us\n")
                break

StealthyFetcher.fetch(urls[0], headless=True, network_idle=True,
                      timeout=120000, page_action=walk)
sys.stdout.write(json.dumps(pages))
'''
    today = date.today()
    urls = []
    for offset in range(days):
        day = today - timedelta(days=offset)
        urls.append(
            f"{BASE}?com=&word=&from={day:%d/%m/%Y}&to={day:%d/%m/%Y}"
            f"&isin=&sec_id=20"
        )

    print(f"   {days} days, one browser session")
    result = subprocess.run(
        [str(SCRAPLING_PY), "-c", script, json.dumps(urls)],
        capture_output=True,
        text=True,
        timeout=3600,
    )
    for line in (result.stderr or "").splitlines():
        if line.startswith("skip:"):
            print(f"   · {line[:90]}")
    if result.returncode != 0:
        print(f"   ! {result.stderr.strip()[:200]}", file=sys.stderr)
        return []
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return []


def names_from_title(title: str) -> dict[str, set[str]]:
    """The ticker→name pairs one filing title carries."""
    found: dict[str, set[str]] = {}
    for ticker in set(re.findall(r"\(([A-Z]{3,6})\.CA\)", title)):
        match = re.search(r"^(.*?)\s*\(" + ticker + r"\.CA\)", title)
        if not match:
            continue
        name = LEAD.sub("", match.group(1)).strip(" -–—:،.")
        # A name has to be mostly Arabic and long enough to be a name rather
        # than a fragment. Titles that put the ticker first leave nothing in
        # front of it, which is why this can come back empty.
        if len(name) < 4 or not ARABIC.search(name):
            continue
        found.setdefault(ticker, set()).add(name)
    return found


def names_from(html: str) -> dict[str, set[str]]:
    found: dict[str, set[str]] = {}
    for raw in TITLE.findall(html):
        for ticker, names in names_from_title(text(raw)).items():
            found.setdefault(ticker, set()).update(names)
    return found


def best(names: set[str]) -> str:
    """The cleanest of several spellings for one company.

    Titles sometimes carry a mangled bilingual run — "Raya Customer
    Experienceراية لخدمات مراكزالاتصالات" — where the English has been
    concatenated without a space. Prefer a purely Arabic form, then the
    shortest, which is the street name rather than a sentence that swallowed
    part of the description.
    """
    pure = [n for n in names if not re.search(r"[A-Za-z]", n)]
    return min(pure or list(names), key=len)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=20)
    args = parser.parse_args()

    # No browser here is a fact about the machine, not an error.
    #
    # This used to `return 1`, and `build_all` treated that as a failed step,
    # and `--check` treats a failed step as a validation failure — so on a
    # runner with no Scrapling the entire daily build aborted before writing
    # anything. The market snapshot, the company documents, the macro series
    # and the crossings all stopped updating on 20 August because of this line,
    # and it went unnoticed for three days: the fifteen-minute news job uses
    # plain HTTP and kept succeeding, so the app looked alive.
    if SCRAPLING_PY is None or not SCRAPLING_PY.exists():
        print(f"   {scrapling_python.missing_note()}")
        return 0

    print("── Harvesting Arabic names from EGX filings")
    pages = fetch_days(args.days)
    if not pages:
        print("nothing fetched — leaving the stored map alone")
        return 1
    print(f"   {len(pages)} pages")

    harvested: dict[str, set[str]] = {}
    for page in pages:
        for ticker, names in names_from(page).items():
            harvested.setdefault(ticker, set()).update(names)

    stored = json.loads(MAP.read_text()) if MAP.exists() else {}
    # `setdefault`, never overwrite: the map holds hand-entered seeds for the
    # largest listings, and a harvest favours small companies that file often.
    # Replacing rather than merging once cut tag resolution from 5 to 4.
    added = 0
    for ticker, names in harvested.items():
        if ticker not in stored:
            stored[ticker] = best(names)
            added += 1

    listed = {c["ticker"] for c in json.loads(COMPANIES.read_text())["companies"]}
    # Bonds, funds and securitisation vehicles file too, and they are not
    # listed shares. Keeping them would put names in the map for tickers the
    # app has no company behind.
    stored = {t: n for t, n in stored.items() if t in listed}

    MAP.write_text(
        json.dumps(stored, ensure_ascii=False, indent=1, sort_keys=True),
        encoding="utf-8",
    )
    print(f"\n   {len(stored)} of {len(listed)} listed companies named "
          f"({added} new this run)")
    for ticker in sorted(stored)[:8]:
        print(f"     {ticker:6} {stored[ticker]}")
    print(f"\nwrote {MAP.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
