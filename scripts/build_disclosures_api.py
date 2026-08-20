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
import json
import os
import pathlib
import re
import subprocess
import sys
from datetime import date, datetime, timedelta

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "public" / "data" / "v1" / "disclosures"
FIXTURES = REPO / "app" / "assets" / "fixtures" / "disclosures"
DETAILS = REPO / "public" / "data" / "v1" / "companies"
COMPANIES = REPO / "public" / "data" / "v1" / "companies.json"

# The interpreter Scrapling lives in. Quoted everywhere because the path has a
# space in it, which is exactly the kind of thing that fails once in CI and
# never on the machine you tested on.
SCRAPLING_PY = pathlib.Path(
    "/Users/barbary/Library/Application Support/pipx/venvs/scrapling/bin/python"
)

BASE = "https://www.egx.com.eg/ar/NewsSearch.aspx"
# sec_id=20 is the disclosures section. The other sections are listing notices
# and press releases, which are a different kind of thing.
DISCLOSURES_SECTION = 20

# How long a published item stays in the document. Long enough that a reader
# opening the app on Sunday still sees Thursday's filings; short enough that
# the payload stays small.
KEEP_DAYS = 30

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
            "because": (
                f"{top['ticker']} filed this, and traded "
                f"{top['rv']:.2f}× its own normal volume that session."
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
                f"{top['ticker']} filed this. Its session was ordinary — "
                f"{top['rv']:.2f}× normal volume against a "
                f"{UNUSUAL_VOLUME:g}× threshold."
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
                f"Filed by {', '.join(item['tickers'])}. No session data is "
                "published for it, so there is nothing to measure it against."
            ),
            "evidence": None,
        }
    # Bond and securitisation notices carry no equity ticker at all.
    return {
        "weight": "other",
        "because": "This filing names no listed share.",
        "evidence": None,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=3)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    if not SCRAPLING_PY.exists():
        print(f"error: no scrapling interpreter at {SCRAPLING_PY}")
        return 1

    print("── EGX disclosures")
    html = fetch(args.days)
    if not html:
        print("nothing fetched — leaving the published document alone")
        return 1

    items = parse(html)
    claimed = TOTAL.search(html)
    expected = int(claimed.group(1)) if claimed else None
    print(f"   {len(items)} filings parsed" + (f" of {expected} the page reported" if expected else ""))
    if not items:
        print("parsed nothing — the page markup probably changed")
        return 1
    if expected and len(items) < expected:
        # Expected, not an error: page one is all we can reach, and it is the
        # newest ten. The count is printed so a run that suddenly returns two
        # filings against a reported ninety is visible rather than quiet.
        print(f"   newest {len(items)} of {expected} in the window "
              f"(page one only — see walk() for why)")

    learn_names(items)
    classify_all(items)
    for item in items:
        item.update(triage(item))

    # Merge with what is already published so a filing does not vanish the day
    # after it lands, then trim to the window.
    published = OUT / "latest.json"
    existing = {}
    if published.exists():
        try:
            existing = {
                i["id"]: i for i in json.loads(published.read_text())["items"]
            }
        except (json.JSONDecodeError, KeyError):
            existing = {}
    existing.update({i["id"]: i for i in items})

    # Re-label anything carrying a type the current taxonomy no longer knows.
    # Without this a merged document keeps whatever vocabulary was in force
    # when each item first landed, so a taxonomy change only reaches items
    # fetched after it — and the feed shows two schemes side by side, which is
    # exactly what happened when this moved off the newspaper labels.
    import filing_types as ft

    stale = [i for i in existing.values() if i.get("event") not in ft.FILING_TYPES]
    if stale:
        print(f"   re-typing {len(stale)} filings from an older taxonomy")
        classify_all(stale)

    # Labels and meanings come from the glossary every run, never from what
    # was stored. Editing a sentence in filing_types.py then reaches every
    # filing already published, not only the ones fetched afterwards.
    for item in existing.values():
        item["event_label"] = ft.label(item.get("event", "statement"))
        item["event_label_ar"] = ft.label_ar(item.get("event", "statement"))
        item["meaning"] = ft.meaning(item.get("event", "statement"))

    cutoff = (date.today() - timedelta(days=KEEP_DAYS)).isoformat()
    merged = sorted(
        (i for i in existing.values() if i["date"] >= cutoff),
        key=lambda i: (i["date"], i["id"]),
        reverse=True,
    )

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
        "items": merged,
    }

    if args.check:
        return 0

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
