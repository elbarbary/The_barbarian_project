#!/usr/bin/env python3
"""Collect reported net profit from EGX results filings.

The disclosures feed already tells us which filings are results and links each
one's detail page. That page carries the exchange's own results template, and
the template states the filed net profit plus the same figure for the
year-earlier period. This walks the filings we have not read yet, reads them,
and accumulates the figures.

**What this is and is not.** It is net profit, as filed, from the exchange —
a primary source, ticker-stamped, no model involved. It is *not* a set of
financial statements: there is no revenue, no balance sheet, no cash flow in
the template, and the attachments that do contain them are 1-bit fax scans with
zero extractable text. See `egx_filing_detail` for the measurements behind that.
Everything except net profit stays null and renders as "—".

**Rate limiting decides the shape of this script.** EGX resets the connection
readily: a 150-page run lost 148 pages, and detail pages have reset on the
*second* load at nine seconds' spacing. So this takes a small number of filings
per run, waits a long time between them, stops completely at the first refusal,
and never writes a partial run over a good store. Coverage accumulates across
runs the way the Arabic names do, rather than in one sweep.

Two other rules learned the hard way, both enforced in code:
  * A reset returns Chrome's error page with HTTP 200, and the WAF returns a
    7 KB challenge stub the same way. Both parse to nothing. Records are only
    stored when the page actually contains the filing (`looks_like_a_filing`).
  * Never run this concurrently with anything else that touches EGX. Two agents
    hitting it in parallel is what triggered the refusal that made this script
    necessary to write offline.

Usage:
    python3 scripts/build_financials_api.py [--limit 6] [--spacing 12]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys

from egx_filing_detail import financials_from_detail, parse_detail

import scrapling_python

REPO = pathlib.Path(__file__).resolve().parent.parent
STORE = pathlib.Path(__file__).resolve().parent / "financials_filed.json"
DISCLOSURES = REPO / "public" / "data" / "v1" / "disclosures" / "latest.json"

SCRAPLING_PY = scrapling_python.find()
DETAIL = "https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID={}"


def _fetch_details(news_ids: list[str], spacing: int) -> dict[str, str]:
    """Detail pages for the given NewsIDs, as many as the host will allow.

    Returns whatever it managed before being cut off, which is frequently
    fewer than asked for and occasionally none. That is the normal case here,
    not an error: the caller stores what arrived and tries the rest next run.
    """
    script = r'''
import sys, json
from scrapling.fetchers import StealthyFetcher


ids, spacing = json.loads(sys.argv[1]), int(sys.argv[2])
URL = "https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID={}"
SENTINEL = "ctl00_C_N_lblDetails"
out = {}

def settled(page):
    """The rendered filing, once the WAF stops interposing its challenge.

    The first content() after a navigation is often the bot-check stub, which
    re-renders into the real page a moment later. Polling for the sentinel is
    the difference between reading a filing and reading 7 KB of JavaScript.
    """
    for _ in range(24):
        html = page.content()
        if SENTINEL in html:
            return html
        page.wait_for_timeout(500)
    return None

def walk(page):
    html = settled(page)
    if html:
        out[ids[0]] = html
    else:
        sys.stderr.write("first page never rendered a filing\n")
        return
    for nid in ids[1:]:
        page.wait_for_timeout(spacing * 1000)
        try:
            page.goto(URL.format(nid), wait_until="domcontentloaded", timeout=40000)
        except Exception as exc:
            sys.stderr.write(f"stop at {nid}: {str(exc)[:70]}\n")
            break
        html = settled(page)
        if not html:
            # A page that will not render is the host telling us to stop. It
            # does not recover within a run; continuing only deepens the block.
            sys.stderr.write(f"stop at {nid}: no filing rendered\n")
            break
        out[nid] = html

StealthyFetcher.fetch(URL.format(ids[0]), headless=True, network_idle=True,
                      timeout=120000, page_action=walk)
sys.stdout.write(json.dumps(out))
'''
    result = subprocess.run(
        [str(SCRAPLING_PY), "-c", script, json.dumps(news_ids), str(spacing)],
        capture_output=True,
        text=True,
        timeout=1800,
    )
    for line in (result.stderr or "").splitlines():
        if line.startswith(("stop at", "first page")):
            print(f"   · {line.strip()[:100]}")
    if result.returncode != 0:
        print(f"   ! fetcher failed: {(result.stderr or '')[:160]}", file=sys.stderr)
        return {}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {}


def pending(store: dict, limit: int) -> list[dict]:
    """Results filings we have not read a figure from yet, newest first.

    Filings already read are skipped forever — the figures in a filing do not
    change once filed, so re-reading one spends a request the rate limit will
    not give back. Filings that were read and yielded nothing are recorded too,
    for the same reason.
    """
    if not DISCLOSURES.exists():
        return []
    try:
        items = json.loads(DISCLOSURES.read_text())["items"]
    except (json.JSONDecodeError, KeyError, OSError):
        return []

    seen = set(store.get("read", {}))
    wanted = []
    for item in sorted(items, key=lambda i: i.get("date", ""), reverse=True):
        if item.get("event") != "results":
            continue
        news_id = str(item["id"]).replace("egx-", "")
        if news_id in seen:
            continue
        wanted.append({
            "news_id": news_id,
            "tickers": item.get("tickers") or [],
            "link": item.get("link"),
            "date": item.get("date"),
        })
        if len(wanted) >= limit:
            break
    return wanted


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=6,
                        help="filings to read this run (the host is the limit)")
    parser.add_argument("--spacing", type=int, default=12,
                        help="seconds between detail pages")
    args = parser.parse_args()

    print("── Reported net profit, from EGX results filings")

    store = {"read": {}, "filings": {}}
    if STORE.exists():
        try:
            store = json.loads(STORE.read_text())
            store.setdefault("read", {})
            store.setdefault("filings", {})
        except json.JSONDecodeError:
            print("   ! store unreadable — refusing to overwrite it")
            return 1

    todo = pending(store, args.limit)
    if not todo:
        print(f"   nothing new ({len(store['filings'])} filings already read)")
        return 0
    print(f"   {len(todo)} unread results filings, {args.spacing}s apart")

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

    pages = _fetch_details([t["news_id"] for t in todo], args.spacing)
    if not pages:
        # Being refused outright is normal enough that it must not look like a
        # failure to the pipeline, and must not touch the store.
        print("   host refused every page — store left untouched")
        return 0
    print(f"   {len(pages)} of {len(todo)} pages fetched")

    by_id = {t["news_id"]: t for t in todo}
    added = 0
    for news_id, page in pages.items():
        detail = parse_detail(page)
        if detail is None:
            continue
        # Mark read whether or not it carried figures: a covering statement
        # never will, and re-reading it every run wastes the scarce resource.
        store["read"][news_id] = by_id[news_id].get("date")
        record = financials_from_detail(detail)
        if record is None:
            continue
        if "ticker" not in record:
            # The results template omits the Reuters code more often than not;
            # the disclosure title carries it, stamped by the exchange.
            tickers = by_id[news_id]["tickers"]
            if len(tickers) != 1:
                # Two tickers on one results filing has no single owner for the
                # figure. Skipped rather than guessed.
                continue
            record["ticker"] = tickers[0]
        record["news_id"] = news_id
        record["source"] = by_id[news_id].get("link") or DETAIL.format(news_id)
        record["filed_on"] = by_id[news_id].get("date")
        store["filings"][news_id] = record
        added += 1

    STORE.write_text(
        json.dumps(store, ensure_ascii=False, indent=1, sort_keys=True),
        encoding="utf-8",
    )
    companies = {r["ticker"] for r in store["filings"].values()}
    print(f"\n   +{added} figures — {len(store['filings'])} filings "
          f"across {len(companies)} companies")
    for record in list(store["filings"].values())[-3:]:
        print(f"     {record['ticker']:6} {record['period']:8} "
              f"{record['net_profit_egp']:>18,.0f} EGP  ({record['basis']})")
    print(f"\nwrote {STORE.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
