#!/usr/bin/env python3
"""Collect each company's own filings, one company at a time.

The disclosures feed is read newest-first across the whole exchange, and page
one is all the pager will give us — roughly ten filings against the sixty-seven
a single session can produce. Everything else was unreachable.

**The search takes a company.** `NewsSearch.aspx?com=COMI` answers with that
issuer's filings and nothing else, so page one becomes the newest ten *for that
company* rather than the newest ten overall. Two hundred and eighty-two
companies at ten each is two thousand eight hundred filings, against the ten a
whole-exchange query returns — and every one of them is a filing the exchange
will eventually stop serving.

It also reaches the thing the feed never did: a company's results
announcements, which are the filings that carry the statement PDFs.

**Walking backwards.** Ten is still a page. Narrowing `to` to the day before
the oldest row seen asks the same question of an earlier window, so `--passes`
walks a company back through its own history ten filings at a time.

**One browser, serialised, spaced.** This exchange blocked us once for fanning
three agents at it.

Usage:
    python3 scripts/harvest_company_filings.py [--limit 40] [--passes 2]
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import subprocess
import sys
import urllib.parse

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_disclosures_api as disclosures  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
COMPANIES = REPO / "public" / "data" / "v1" / "companies.json"
STATE = pathlib.Path(__file__).resolve().parent / "company_filings_seen.json"

SCRAPLING_PY = pathlib.Path(
    "/Users/barbary/Library/Application Support/pipx/venvs/scrapling/bin/python"
)

# How far back to ask.
#
# A wide window on an unfiltered company query times the server out — it counts
# the whole result set before it renders a page, and a company with hundreds of
# filings never answers. Filtered by word the set is small and four and a half
# years comes back fine, which is what makes the results query below workable.
START = "01/01/2020"

# The word that finds a company's results announcements.
#
# This is the point of the whole job. `نتائج` — "results" — is in the title of
# every results filing the exchange publishes, and those are the filings that
# carry the audited statement as an attachment. COMI alone has 57 of them since
# 2022, none of which the whole-exchange feed could ever have reached.
#
# Latin does not work here: `word=COMI` returns nothing at all, because the
# search reads the Arabic title and the ticker in it is inside a bracket the
# tokeniser does not split on.
RESULTS = "نتائج"


def fetch_many(urls: list[str], spacing: int) -> dict[str, str]:
    """Each URL's HTML, in one browser session, taking what the host allows."""
    script = r'''
import sys, json
from scrapling.fetchers import StealthyFetcher

urls, spacing = json.loads(sys.argv[1]), int(sys.argv[2])
SENTINEL = "NewsSearch"
out = {}

def settled(page):
    """The rendered result table, once the challenge stops interposing.

    Polls for a filing link rather than for network idle: a company with no
    filings in the window renders a valid empty table and would otherwise be
    waited on until the timeout.
    """
    for _ in range(30):
        html = page.content()
        if "NewsDetails.aspx?NewsID=" in html:
            return html
        if "ctl00_C_lblCount" in html or "GridView" in html:
            return html
        page.wait_for_timeout(500)
    return page.content()

def walk(page):
    """One company after another, skipping the ones that will not answer.

    A single slow company used to end the whole run: the first `goto` timeout
    broke the loop and 277 companies went unasked. Most of those timeouts are
    one issuer with an unusually large result set, not the host refusing us —
    so a failure now skips that company and the walk carries on. Six failures
    in a row is a different thing, and that does stop it.
    """
    out[urls[0]] = settled(page)
    misses = 0
    for url in urls[1:]:
        page.wait_for_timeout(spacing * 1000)
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            html = settled(page)
        except Exception as exc:
            html = None
            sys.stderr.write(f"skip: {str(exc)[:60]}\n")
        if not html or len(html) < 5000:
            misses += 1
            if misses >= 6:
                sys.stderr.write("stop: six in a row would not answer\n")
                break
            continue
        misses = 0
        out[url] = html

StealthyFetcher.fetch(urls[0], headless=True, network_idle=True,
                      timeout=120000, page_action=walk)
sys.stdout.write(json.dumps(out))
'''
    result = subprocess.run(
        [str(SCRAPLING_PY), "-c", script, json.dumps(urls), str(spacing)],
        capture_output=True,
        text=True,
        timeout=3600,
    )
    for line in (result.stderr or "").splitlines():
        if line.startswith(("stop", "skip")):
            print(f"   · {line.strip()[:100]}")
    if result.returncode != 0:
        print(f"   ! fetcher failed: {(result.stderr or '')[:200]}", file=sys.stderr)
        return {}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {}


def url_for(ticker: str, end: str, word: str) -> str:
    return (
        f"{disclosures.BASE}?com={ticker}&word={urllib.parse.quote(word)}"
        f"&from={START}&to={end}&isin=&sec_id={disclosures.DISCLOSURES_SECTION}"
    )


def load_state() -> dict:
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def tickers() -> list[str]:
    directory = json.loads(COMPANIES.read_text(encoding="utf-8"))
    return [c["ticker"] for c in directory["companies"] if c.get("ticker")]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=40)
    parser.add_argument("--passes", type=int, default=1,
                        help="how far back to walk each company")
    parser.add_argument("--spacing", type=int, default=4)
    parser.add_argument("--only", help="a single ticker, for checking")
    parser.add_argument("--word", default=RESULTS,
                        help="title filter; the default finds results filings")
    args = parser.parse_args()

    print("── Company filings")
    state = load_state()
    held = disclosures.archive_read()
    print(f"   archive holds {len(held)} filings")

    queue = [args.only] if args.only else [
        t for t in tickers() if t not in state
    ]
    if not queue:
        print("   every company has been asked once — delete "
              f"{STATE.name} to go round again")
        return 0
    queue = queue[: args.limit]
    print(f"   asking {len(queue)} companies, {args.passes} pass(es), "
          f"{args.spacing}s apart")

    today = datetime.date.today().strftime("%d/%m/%Y")
    ends = {t: today for t in queue}
    added = 0

    for step in range(args.passes):
        urls = {
            url_for(t, ends[t], args.word): t
            for t in queue
            if ends.get(t)
        }
        if not urls:
            break
        pages = fetch_many(list(urls), args.spacing)
        if not pages:
            print("   the host answered nothing — stopping")
            break
        for url, html in pages.items():
            ticker = urls[url]
            rows = disclosures.parse(html)
            fresh = [r for r in rows if r["id"] not in held]
            for row in rows:
                held.setdefault(row["id"], row)
            added += len(fresh)
            state.setdefault(ticker, {})
            state[ticker]["asked"] = datetime.date.today().isoformat()
            state[ticker]["seen"] = state[ticker].get("seen", 0) + len(rows)
            if rows:
                oldest = min(r["date"] for r in rows)
                state[ticker]["oldest"] = oldest
                # The day before the oldest row, so the next pass asks an
                # earlier window rather than the same one.
                previous = datetime.date.fromisoformat(oldest) - datetime.timedelta(days=1)
                ends[ticker] = previous.strftime("%d/%m/%Y")
            else:
                ends[ticker] = ""
        print(f"   pass {step + 1}: {len(pages)} answered, {added} new so far")
        STATE.write_text(
            json.dumps(state, ensure_ascii=False, indent=1, sort_keys=True),
            encoding="utf-8",
        )

    if not added:
        print("   nothing new")
        return 0

    everything = sorted(
        held.values(), key=lambda i: (i["date"], i["id"]), reverse=True
    )
    # Classify and explain the newcomers the same way the feed does, so the
    # archive is one document type rather than two.
    disclosures.learn_names(everything)
    disclosures.classify_all([i for i in everything if not i.get("event")])
    import filing_types as ft

    for item in everything:
        item.setdefault("event", "statement")
        item["event_label"] = ft.label(item["event"])
        item["event_label_ar"] = ft.label_ar(item["event"])
        item["meaning"] = ft.meaning(item["event"])
        item["meaning_ar"] = ft.meaning_ar(item["event"])
        item.setdefault("weight", "named" if item.get("tickers") else "market")
        item.setdefault("because", "")

    months = disclosures.archive_write(everything)
    print(f"\n   +{added} filings · archive now {len(everything)} "
          f"across {len(months)} month(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
