#!/usr/bin/env python3
"""Build the disclosures API from the exchange's own filing feed.

This is the keystone the news pipeline was missing. Newspaper headlines name
companies in prose, and matching that prose to a ticker failed twice — once on
word overlap, which tagged a cotton story with a medical company, and once on
transliteration, which mapped "Arabian Cement" to an investment house. EGX
stamps the ticker into the title itself:

    العربية للصناعات الهندسية (EEII.CA) تعلن عن توزيع أسهم مجانية

So the match is exact, it costs nothing, and it is made by the exchange rather
than inferred by us. It is also better news: these are the actual corporate
events — results, bonus shares, board decisions, capital changes — rather than
coverage of a ministry visit.

ACCESS
------
`urllib` and `curl` get a 7 KB stub from this host however good the headers
are; the real page needs a browser. Scrapling's StealthyFetcher does it, which
is the same answer the TradingView scanner needed and for the same reason. The
pipx venv path contains a space, so this script re-executes itself under that
interpreter rather than asking every caller to remember.

Results are paginated ten at a time behind an ASP.NET `__doPostBack`, which is
miserable over HTTP and trivial in a browser we are already driving: the page
action below clicks through and collects each page's HTML.

Usage:
    python3 scripts/build_disclosures_api.py [--days 3] [--check]
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import pathlib
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import UTC, date, datetime, timedelta

import translations

import scrapling_python

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "public" / "data" / "v1" / "disclosures"
FIXTURES = REPO / "app" / "assets" / "fixtures" / "disclosures"

# The permanent record, one document per calendar month.
#
# **The exchange is not an archive.** EGX serves page one of a search and the
# older pages are unreachable to us, so a filing we do not keep is a filing
# nobody can get back — not from them and not from anywhere else, because no
# Egyptian outlet republishes the disclosure feed in full. `latest.json` is a
# rolling thirty-day window and it used to be the only thing written, which
# meant every run quietly deleted whatever had aged past the cutoff. Two months
# of collection would have left one month of history.
#
# So: nothing here is ever dropped. The window is a view for the app to open
# with; this is the record. Sharded by month rather than kept as one file
# because it only grows — roughly 36 filings a session — and a reader who wants
# March should not download February to get it.
ARCHIVE = OUT / "archive"
ARCHIVE_FIXTURES = FIXTURES / "archive"

# One index per company of everything it has filed, so the company screen can
# answer "what has this issuer told the exchange" without downloading the
# archive to find out. Attachments ride along on each row, which is how the
# same document answers "show me the statements" as well.
DOCUMENTS = OUT / "documents"
DOCUMENT_FIXTURES = FIXTURES / "documents"

# Months bundled into the app so the archive is browsable before it is
# downloaded, and so fixtures mode can exercise the screen at all.
BUNDLED_MONTHS = 2
DETAILS = REPO / "public" / "data" / "v1" / "companies"
COMPANIES = REPO / "public" / "data" / "v1" / "companies.json"

# The interpreter Scrapling lives in. Quoted everywhere because the path has a
# space in it, which is exactly the kind of thing that fails once in CI and
# never on the machine you tested on.
SCRAPLING_PY = scrapling_python.find()

BASE = "https://www.egx.com.eg/ar/NewsSearch.aspx"
# sec_id=20 is the disclosures section. The other sections are listing notices
# and press releases, which are a different kind of thing.
DISCLOSURES_SECTION = 20

# The same scope, on the exchange's JSON API. `sec_id=20` on the old site maps
# to these beta categories — General, General Assemblies, Financial Results,
# Insider dealing, Trading Notices — verified by mapping every currently
# published filing back to its beta section. Press releases, member news and
# listing notices stay out, exactly as they did before.
BETA_BASE = "https://beta.egx.com.eg"
BETA_SECTIONS = [3, 5, 6, 7, 8]
BETA_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
)

# How long a published item stays in the document. Long enough that a reader
# opening the app on Sunday still sees Thursday's filings; short enough that
# the payload stays small.
KEEP_DAYS = 30

MONTH_FILE = re.compile(r"^\d{4}-\d{2}\.json$")

TICKER = re.compile(r"\(([A-Z]{3,6})\.CA\)")
# The page states its own result count. Parsed so the job can tell the
# difference between "there were nine filings" and "we only reached page one":
# two runs of the same query returned 250 rows and 30, because the search is
# session-stateful and quietly falls back to a narrower range. A scraper that
# cannot tell those apart publishes a quiet day that never happened.
TOTAL = re.compile(r"نتائج البحث\s*\((\d+)\)")
ROW = re.compile(
    r'<a href="NewsDetails\.aspx\?NewsID=(\d+)".{0,400}?'
    r'lblTitle"?>(.*?)</span>.{0,1200}?lblDate"?>([\d/]+)</span>',
    re.S,
)

# The volume band an item is judged against — the same 2× threshold, published
# and identical for all 282 names, that the news triage and the explainer use.
UNUSUAL_VOLUME = 2.0


def text(raw: str) -> str:
    import html as html_lib

    return " ".join(html_lib.unescape(re.sub(r"<[^>]+>", " ", raw or "")).split())


# ------------------------------------------------------------------ fetching


def _fetch_under_scrapling(url: str) -> str:
    """Run the fetch in the Scrapling venv and hand back the HTML.

    A subprocess rather than an import because Scrapling is installed with
    pipx and is not importable from the system python this pipeline otherwise
    runs on. Keeping the boundary here means the rest of the file is ordinary
    code that can be tested without a browser.
    """
    script = r'''
import sys, json
from scrapling.fetchers import StealthyFetcher


url = sys.argv[1]
pages = []
MAX_PAGES = 40

# Matched on the stable part of the id, not the whole thing: ASP.NET numbers
# the pager control by its position in the grid, so `ctl13` moves when the
# result count changes. Pinning it fetched page one and stopped.
SELECT = "select[id*='PageDropDownList']"

def walk(page):
    """Take page one, which is the ten most recent filings.

    **This deliberately does not paginate**, and the reason is worth writing
    down so nobody spends another afternoon on it. The pager is an ASP.NET
    GridView driven by `__doPostBack`, and on this host that function is
    *undefined* — the WebResource script defining it never loads, with resource
    blocking on or off. Five routes were tried and each failed differently:

      * `select_option` — sets the value; nothing reads it, no postback fires
      * clicking the pager anchors — same, they are `javascript:__doPostBack`
      * `form.submit()` — intercepted by an onsubmit handler that also needs
        the missing script
      * in-page `fetch` of the form action — "Failed to fetch", refused
      * Playwright's request context — the server answers **ECONNRESET**

    So the feed is consumed the way any newest-first feed without usable
    pagination is consumed: take the newest page often. Page one always holds
    the ten most recent filings, the job runs on a short cycle, and the merge
    in `main` accumulates them and dedupes by NewsID. Roughly thirty filings
    land per session; at a run every half hour that is 480 slots against 30
    arrivals, so nothing is lost unless more than ten land between two
    consecutive runs.
    """
    pages.append(page.content())


StealthyFetcher.fetch(url, headless=True, network_idle=True,
                      timeout=120000, page_action=walk)
sys.stdout.write(json.dumps(pages))
'''
    result = subprocess.run(
        [str(SCRAPLING_PY), "-c", script, url],
        capture_output=True,
        text=True,
        timeout=600,
    )
    # The browser side writes its progress to stderr; surface it either way,
    # because "how many pages did the pager actually walk" is the single most
    # useful thing to know when a fetch comes back short.
    for line in (result.stderr or "").strip().splitlines():
        if line.strip() and not line.startswith("["):
            print(f"   · {line.strip()[:120]}")
    if result.returncode != 0:
        return ""
    try:
        return "\n".join(json.loads(result.stdout))
    except json.JSONDecodeError:
        print("   ! scrapling returned no usable pages", file=sys.stderr)
        return ""


def fetch(days: int) -> str:
    end = date.today()
    start = end - timedelta(days=days)
    url = (
        f"{BASE}?com=&word="
        f"&from={start:%d/%m/%Y}&to={end:%d/%m/%Y}"
        f"&isin=&sec_id={DISCLOSURES_SECTION}"
    )
    print(f"   {start:%d %b} → {end:%d %b}")
    return _fetch_under_scrapling(url)


# ------------------------------------------------------------------- parsing


def fetch_beta(days: int) -> list[dict] | None:
    """Every disclosure in the window, from the exchange's JSON API.

    The browser scrape below can only ever read page one — the ten most recent
    filings — because the site's pager is broken on that host (see `walk`). On
    a quiet day that is enough; on a morning that files forty, the earlier ones
    scroll off page one before the job runs and are lost, because there is no
    pagination to recover them. 20 filings vanished this way on 24 Aug 2026.

    `beta.egx.com.eg` answers `news-search` with a date window and returns the
    whole window in one request — no page-one cap, no browser. This is that
    request. It returns None on any refusal or transport error so the caller
    falls back to the scrape: the step is best-effort, and a beta outage must
    never leave the app worse off than a scrape outage already did.

    Serialised and paced, per the standing rule that EGX is never hit in
    parallel — one page at a time, a second and a half apart. A three-day
    window is almost always a single page.
    """
    end = date.today()
    start = end - timedelta(days=days)
    collected: dict[str, dict] = {}
    page = 1
    while page <= 20:
        payload = json.dumps({
            "marketSessionNews": False,
            "secIds": BETA_SECTIONS,
            "interval": 50,
            "pageNumber": page,
            "pageSize": 200,
            "count": 50,
            "dateFrom": start.isoformat(),
            "dateTo": end.isoformat(),
        }).encode()
        req = urllib.request.Request(
            f"{BETA_BASE}/api/bff/egx/news-search",
            data=payload,
            headers={
                "user-agent": BETA_UA,
                "accept": "application/json",
                "content-type": "application/json",
                "x-egx-bff-request": "1",
                "referer": f"{BETA_BASE}/en",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                raw = response.read()
        except (urllib.error.URLError, OSError) as error:
            print(f"   beta: transport error ({error}) — will fall back")
            return None
        # The F5 answers 200 with an HTML rejection page rather than a status.
        if raw[:6] == b"<html":
            print("   beta: request rejected by the edge — will fall back")
            return None
        try:
            doc = json.loads(raw)
        except json.JSONDecodeError:
            print("   beta: unparseable response — will fall back")
            return None
        if not doc.get("success"):
            print(f"   beta: {doc.get('message', 'unsuccessful')} — will fall back")
            return None
        for row in doc.get("data") or []:
            code = row.get("code")
            if code is None:
                continue
            # The Arabic heading is what the app reads and what carries the
            # (TICKER.CA) the match depends on; fall back to English.
            title = (row.get("headingArabic") or row.get("heading") or "").strip()
            if not title:
                continue
            collected[str(code)] = {
                "id": f"egx-{code}",
                "title": title,
                "date": (row.get("dateStamp") or "")[:10],
                "link": f"https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID={code}",
                "tickers": sorted(set(TICKER.findall(title))),
            }
        if page >= (doc.get("totalPages") or 1):
            break
        page += 1
        time.sleep(1.5)
    return list(collected.values()) if collected else None


def parse(html: str) -> list[dict]:
    seen: dict[str, dict] = {}
    for news_id, raw_title, raw_date in ROW.findall(html):
        title = text(raw_title)
        if not title:
            continue
        try:
            day = datetime.strptime(raw_date.strip(), "%d/%m/%Y").date()
        except ValueError:
            continue
        # The same filing appears on every page we collected only if the pager
        # looped, but dedupe by id regardless — it is free and it makes the
        # page-walk above safe to be wrong about.
        seen[news_id] = {
            "id": f"egx-{news_id}",
            "title": title,
            "date": day.isoformat(),
            "link": f"https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID={news_id}",
            "tickers": sorted(set(TICKER.findall(title))),
        }
    return list(seen.values())


def learn_names(items: list[dict]) -> None:
    """Add any Arabic company names these titles reveal, for free.

    Every filing is titled `ARABIC NAME (TICKER.CA) — what happened`, so the
    pairing arrives with work already being done. There is no extra request
    and no model: the exchange prints both halves side by side, and the name
    it prints is the street name a reader would recognise rather than the
    formal registered title.
    """
    import harvest_company_names as harvest

    path = harvest.MAP
    stored = json.loads(path.read_text()) if path.exists() else {}
    before = len(stored)
    for item in items:
        for ticker, names in harvest.names_from_title(item["title"]).items():
            stored.setdefault(ticker, harvest.best(names))
    if len(stored) > before:
        path.write_text(
            json.dumps(stored, ensure_ascii=False, indent=1, sort_keys=True),
            encoding="utf-8",
        )
        print(f"   learned {len(stored) - before} Arabic names "
              f"({len(stored)} known)")


# ------------------------------------------------------------ classification


def classify_all(items: list[dict]) -> None:
    """Give every filing a type, its plain-language meaning, and its labels.

    Published patterns first, because EGX titles are formulaic and a regex that
    fires is auditable in a way a model is not. The model sees only what the
    rules could not place, and it picks from the same closed list — it never
    writes the explanation, which comes from the reviewed glossary.

    When the model is unreachable the filing falls to `statement`, which says
    what it is honestly. A missing key degrades the labelling; it never stops
    the build or invents a category.
    """
    import filing_types as ft

    unplaced = []
    for item in items:
        key = ft.classify_rules(item["title"])
        if key:
            item["event"] = key
            item["by"] = "rule"
        else:
            unplaced.append(item)

    asked = failed = 0
    if unplaced:
        import gemini

        prompt_head = (
            "You are labelling filings made to the Egyptian Exchange. "
            "Choose exactly one label from this list and reply with only that "
            "label, nothing else:\n" + ", ".join(ft.LABELS) + "\n\nFiling title:\n"
        )
        for item in unplaced:
            item["event"] = "statement"
            item["by"] = "fallback"
            if failed >= 3:
                # Three refusals in a row is an outage, not a hard filing.
                continue
            try:
                asked += 1
                if choice := gemini.choose(prompt_head + item["title"], ft.LABELS):
                    item["event"], item["by"] = choice, "model"
                failed = 0
            except gemini.GeminiUnavailable as error:
                failed += 1
                if failed == 1:
                    print(f"   ! gemini: {error}")

    for item in items:
        item["event_label"] = ft.label(item["event"])
        item["event_label_ar"] = ft.label_ar(item["event"])
        item["meaning"] = ft.meaning(item["event"])
        item["meaning_ar"] = ft.meaning_ar(item["event"])

    by_rule = sum(1 for i in items if i.get("by") == "rule")
    by_model = sum(1 for i in items if i.get("by") == "model")
    print(f"   typed: {by_rule} by rule, {by_model} by model, "
          f"{len(items) - by_rule - by_model} fell back")


# ------------------------------------------------------------------- triage


def session_facts(ticker: str) -> dict | None:
    path = DETAILS / f"{ticker}.json"
    if not path.exists():
        return None
    doc = json.loads(path.read_text())
    market, profile = doc.get("market") or {}, doc.get("profile") or {}
    volume, median = market.get("volume"), profile.get("median_volume_20d")
    if not volume or not median:
        return None
    return {
        "ticker": ticker,
        "volume": volume,
        "median": median,
        "rv": volume / median,
        "date": market.get("date"),
    }


# A Latin ticker inside an Arabic sentence.
#
# Bidirectional text reorders around a run of Latin letters, so "MOSC أودعت
# هذا، وتداول 2.57× حجمه المعتاد" can render with the ticker and the number
# swapped. U+2068 opens a first-strong isolate and U+2069 closes it, which
# tells the renderer to lay the run out on its own and put it back where the
# Arabic expects it.
def isolate(value: str) -> str:
    return f"\u2068{value}\u2069"


def triage(item: dict) -> dict:
    """Why this filing is, or is not, worth a second look.

    The same rule as the news feed, and the same reason: an unlicensed
    publisher may not say "this is big news", but it may join two published
    facts — the exchange says this filing is about this company, and this
    company's session was outside its own published band.
    """
    facts = [f for f in (session_facts(t) for t in item["tickers"]) if f]
    unusual = [f for f in facts if f["rv"] >= UNUSUAL_VOLUME]

    if unusual:
        top = max(unusual, key=lambda f: f["rv"])
        return {
            "weight": "check",
            # A multiple of the normal, not an addition to it: "2.21× more
            # than they normally do" says 3.21× the usual volume, which is not
            # the number in the same sentence.
            "because": (
                f"{top['ticker']} announced this, and its shares changed "
                f"hands {top['rv']:.2f}× their usual volume that day."
            ),
            "because_ar": (
                f"أعلنت {isolate(top['ticker'])} هذا، وتداول سهمها "
                f"{isolate(f'{top['rv']:.2f}×')} حجمه المعتاد في ذلك اليوم."
            ),
            "evidence": {
                "ticker": top["ticker"],
                "volume": top["volume"],
                "median_volume_20d": round(top["median"]),
                "ratio": round(top["rv"], 2),
                "threshold": UNUSUAL_VOLUME,
                "date": top["date"],
            },
        }
    if facts:
        top = max(facts, key=lambda f: f["rv"])
        return {
            "weight": "filed",
            "because": (
                f"{top['ticker']} announced this. Its trading that day was "
                f"ordinary — {top['rv']:.2f}× its usual, and we only point out "
                f"anything above {UNUSUAL_VOLUME:g}×."
            ),
            "because_ar": (
                f"أعلنت {isolate(top['ticker'])} هذا. وكان تداول سهمها في "
                f"ذلك اليوم عاديًا — {isolate(f'{top['rv']:.2f}×')} من "
                f"المعتاد، ولا ننبّه إلا لما يتجاوز "
                f"{isolate(f'{UNUSUAL_VOLUME:g}×')}."
            ),
            "evidence": {
                "ticker": top["ticker"],
                "volume": top["volume"],
                "median_volume_20d": round(top["median"]),
                "ratio": round(top["rv"], 2),
                "threshold": UNUSUAL_VOLUME,
                "date": top["date"],
            },
        }
    if item["tickers"]:
        return {
            "weight": "filed",
            "because": (
                f"Announced by {', '.join(item['tickers'])}. No trading "
                "figures are published for it, so there is nothing to compare "
                "it against."
            ),
            "because_ar": (
                f"أعلنته {isolate(', '.join(item['tickers']))}. لا توجد "
                "أرقام تداول منشورة له، فليس هناك ما يُقارن به."
            ),
            "evidence": None,
        }
    # Bond and securitisation notices carry no equity ticker at all.
    return {
        "weight": "other",
        "because": "This announcement does not name a listed company.",
        "because_ar": "لا يذكر هذا الإعلان شركة مقيدة بالبورصة.",
        "evidence": None,
    }


def archive_read() -> dict[str, dict]:
    """Every filing ever collected, by id.

    Read from the shards themselves rather than from any index, so a hand-edited
    or partially-written index cannot lose a month.
    """
    items: dict[str, dict] = {}
    if not ARCHIVE.exists():
        return items
    for path in sorted(ARCHIVE.iterdir()):
        if not MONTH_FILE.match(path.name):
            continue
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            # Loud, and then carry on. A month we cannot parse is a month we
            # must not silently overwrite with a fresh empty one, so the run
            # keeps going and the next write leaves that shard alone.
            print(f"   archive: {path.name} unreadable ({error}) — left alone")
            continue
        for item in doc.get("items") or []:
            if item.get("id"):
                items[item["id"]] = item
    return items


def archive_write(items: list[dict]) -> list[dict]:
    """Write the monthly shards and their index. Returns the index months.

    Every shard is rewritten from the full union each run, so a correction to a
    label or a translation reaches history rather than only the last thirty
    days. Nothing is removed.
    """
    months: dict[str, list[dict]] = collections.defaultdict(list)
    for item in items:
        stamp = (item.get("date") or "")[:7]
        if len(stamp) == 7:
            months[stamp].append(item)

    ARCHIVE.mkdir(parents=True, exist_ok=True)
    ARCHIVE_FIXTURES.mkdir(parents=True, exist_ok=True)

    index: list[dict] = []
    recent = sorted(months, reverse=True)[:BUNDLED_MONTHS]
    for stamp in sorted(months, reverse=True):
        rows = sorted(
            months[stamp], key=lambda i: (i["date"], i["id"]), reverse=True
        )
        doc = {
            "month": stamp,
            "items": rows,
        }
        body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
        (ARCHIVE / f"{stamp}.json").write_text(body, encoding="utf-8")
        # Only the newest months travel inside the app. The rest are a
        # download, which is the point of sharding them.
        if stamp in recent:
            (ARCHIVE_FIXTURES / f"{stamp}.json").write_text(body, encoding="utf-8")
        index.append(
            {
                "month": stamp,
                "count": len(rows),
                "first": min(i["date"] for i in rows),
                "last": max(i["date"] for i in rows),
                "named": sum(1 for i in rows if i.get("tickers")),
            }
        )

    # One small document per company, listing what that company has filed that
    # carries a document.
    #
    # The company screen needs "every statement this issuer lodged", and the
    # only other way to answer it is to download every month and filter — which
    # is the whole archive, to show one card. These are written from the same
    # union, so they cover history rather than the window.
    by_ticker: dict[str, list[dict]] = collections.defaultdict(list)
    for item in items:
        for ticker in item.get("tickers") or []:
            by_ticker[ticker].append(
                {
                    "id": item["id"],
                    "date": item["date"],
                    "title": item["title"],
                    "title_en": item.get("title_en"),
                    "event": item.get("event"),
                    "event_label": item.get("event_label"),
                    "event_label_ar": item.get("event_label_ar"),
                    "meaning": item.get("meaning"),
                    "meaning_ar": item.get("meaning_ar"),
                    "link": item["link"],
                    "attachments": item.get("attachments") or [],
                }
            )

    DOCUMENTS.mkdir(parents=True, exist_ok=True)
    DOCUMENT_FIXTURES.mkdir(parents=True, exist_ok=True)
    for ticker, rows in by_ticker.items():
        rows.sort(key=lambda r: (r["date"], r["id"]), reverse=True)
        body = json.dumps(
            {"ticker": ticker, "items": rows},
            ensure_ascii=False,
            separators=(",", ":"),
        )
        (DOCUMENTS / f"{ticker}.json").write_text(body, encoding="utf-8")
        (DOCUMENT_FIXTURES / f"{ticker}.json").write_text(body, encoding="utf-8")
    if by_ticker:
        withdoc = sum(
            1 for rows in by_ticker.values() for r in rows if r["attachments"]
        )
        print(
            f"   per company: {sum(len(v) for v in by_ticker.values())} filings "
            f"across {len(by_ticker)} companies, {withdoc} with a PDF"
        )

    manifest = {
        "months": index,
        "count": sum(m["count"] for m in index),
        "bundled": recent,
        "updated_at": datetime.now(UTC).isoformat(timespec="seconds"),
    }
    body = json.dumps(manifest, ensure_ascii=False, separators=(",", ":"))
    (ARCHIVE / "index.json").write_text(body, encoding="utf-8")
    (ARCHIVE_FIXTURES / "index.json").write_text(body, encoding="utf-8")
    return index


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=3)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    print("── EGX disclosures")

    # The exchange's JSON API first: one request, the whole window, no page-one
    # cap. It needs no browser, so it runs on a machine with no Scrapling too.
    items = fetch_beta(args.days)
    if items:
        print(f"   {len(items)} filings from the exchange API")
    else:
        # Fall back to the page-one browser scrape. No browser here is a fact
        # about the machine, not an error: this used to `return 1`, which
        # aborted the whole daily build on a runner with no Scrapling and went
        # unnoticed for three days because the fifteen-minute news job kept
        # succeeding over plain HTTP. Now it is a best-effort skip.
        if SCRAPLING_PY is None or not SCRAPLING_PY.exists():
            print(f"   beta unavailable and {scrapling_python.missing_note()}")
            return 0
        print("   beta unavailable — falling back to the page-one scrape")
        html = fetch(args.days)
        if not html:
            print("nothing fetched — leaving the published document alone")
            return 1
        items = parse(html)
        claimed = TOTAL.search(html)
        expected = int(claimed.group(1)) if claimed else None
        print(f"   {len(items)} filings parsed"
              + (f" of {expected} the page reported" if expected else ""))
        if not items:
            print("parsed nothing — the page markup probably changed")
            return 1
        if expected and len(items) < expected:
            # Page one is all the scrape can reach, and it is the newest ten.
            print(f"   newest {len(items)} of {expected} in the window "
                  f"(page one only — see walk() for why)")

    learn_names(items)
    classify_all(items)
    for item in items:
        item.update(triage(item))

    # Merge with everything already held so a filing does not vanish the day
    # after it lands. Three sources, oldest first so a fresh copy wins:
    # the permanent archive, the rolling window, then what this run fetched.
    existing = archive_read()
    if existing:
        print(f"   archive holds {len(existing)} filings")
    published = OUT / "latest.json"
    if published.exists():
        try:
            existing.update(
                {i["id"]: i for i in json.loads(published.read_text())["items"]}
            )
        except (json.JSONDecodeError, KeyError):
            pass
    existing.update({i["id"]: i for i in items})

    # Re-label anything carrying a type the current taxonomy no longer knows.
    # Without this a merged document keeps whatever vocabulary was in force
    # when each item first landed, so a taxonomy change only reaches items
    # fetched after it — and the feed shows two schemes side by side, which is
    # exactly what happened when this moved off the newspaper labels.
    import filing_types as ft

    # Two things get re-typed. A filing carrying a type the taxonomy no longer
    # knows, and a filing that only ever *fell back* to `statement` because the
    # model was unreachable when it landed. The second is not a stored answer,
    # it is a stored absence of one — and since the rules cost nothing, every
    # run is a free chance to place it properly. Adding a rule then reaches the
    # filings already published, which is the point of adding one.
    stale = [
        i for i in existing.values()
        if i.get("event") not in ft.FILING_TYPES
        or i.get("by") == "fallback"
        # A rule that fires outranks a stored model guess, exactly as it does
        # for a filing arriving now — `classify_all` never asks the model about
        # a title the rules can place. Without this the ordering holds only for
        # filings fetched after a rule lands, and the document carries a model
        # answer the current rules openly disagree with: one filing here sat as
        # `statement` while `لجنة القيد` had become an auditable pattern.
        or (
            (placed := ft.classify_rules(i.get("title", "")))
            and placed != i.get("event")
        )
    ]
    if stale:
        print(f"   re-typing {len(stale)} filings (new taxonomy or unplaced)")
        classify_all(stale)

    # Labels and meanings come from the glossary every run, never from what
    # was stored. Editing a sentence in filing_types.py then reaches every
    # filing already published, not only the ones fetched afterwards.
    for item in existing.values():
        item["event_label"] = ft.label(item.get("event", "statement"))
        item["event_label_ar"] = ft.label_ar(item.get("event", "statement"))
        item["meaning"] = ft.meaning(item.get("event", "statement"))
        item["meaning_ar"] = ft.meaning_ar(item.get("event", "statement"))

    # English for the whole merged document, not only what this run fetched —
    # the same rule as the labels above, and for the same reason. Only page one
    # is fetchable, so a filing is carried by the merge for days after it lands;
    # translating just the new ten left the older twenty-six Arabic-only for
    # good, with their English already sitting in the cache, unattached.
    # A cache hit costs nothing, so re-asking every run is free.
    # EGX files in Arabic without exception, so an English reader saw an
    # English interface wrapped around a title they could not read. The Arabic
    # title stays; this sits beside it.
    english = translations.english_for(
        [i["title"] for i in existing.values()], label="filing titles"
    )
    for item in existing.values():
        if (rendered := english.get(item["title"])) is not None:
            item["title_en"] = rendered

    everything = sorted(
        existing.values(), key=lambda i: (i["date"], i["id"]), reverse=True
    )

    # The window the app opens with. The archive below keeps the rest.
    cutoff = (date.today() - timedelta(days=KEEP_DAYS)).isoformat()
    merged = [i for i in everything if i["date"] >= cutoff]

    checks = sum(1 for i in merged if i["weight"] == "check")
    withTicker = sum(1 for i in merged if i["tickers"])
    print(
        f"   {len(merged)} in the window · {withTicker} name a share · "
        f"{checks} worth a look"
    )
    for item in merged[:6]:
        tag = ",".join(item["tickers"]) or "—"
        print(f"     [{item['event']:12}] {tag:12} {item['title'][:58]}")

    doc = {
        "source": {
            "name": "The Egyptian Exchange",
            "name_ar": "البورصة المصرية",
            "home": "https://www.egx.com.eg",
        },
        "threshold": UNUSUAL_VOLUME,
        # What the reader can reach beyond this window, so the app knows there
        # is more without having to ask for a document to find out.
        "archived": len(everything),
        "items": merged,
    }

    if args.check:
        return 0

    months = archive_write(everything)
    if months:
        span = f"{months[-1]['first']} → {months[0]['last']}"
        print(
            f"   archive: {len(everything)} filings across {len(months)} "
            f"month(s), {span}"
        )

    for directory in (OUT, FIXTURES):
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "latest.json").write_text(
            json.dumps(doc, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
    print(f"\nwrote {OUT / 'latest.json'} and the app fixture")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    raise SystemExit(main())
