#!/usr/bin/env python3
"""Build the news API: headlines from Egyptian financial outlets, triaged.

The product argument, in one line: everybody else hands you a feed and leaves
you to work out whether any of it matters. This says which items touch a listed
company, whether that company's session was unusual, and why — and says so with
arithmetic rather than an adjective.

WHAT IS REPUBLISHED, AND WHAT IS NOT
------------------------------------
Headline, outlet, timestamp and a link to the original. Never the body, never a
photograph, never a summary long enough to substitute for the article. The
excerpt is fetched because it makes ticker-matching far better, used at build
time, and then **discarded** — it is not in the published document.

That is the same shape stockastic.app uses (their bundle maps an
`ingestion_source` to an outlet logo and keeps an `article_link` per source),
and it is the shape that keeps an aggregator on the right side of copyright:
a headline is a fact and a pointer, an article body is somebody's work.

IMPORTANCE IS NOT AN OPINION
----------------------------
The app is published by somebody with no FRA licence, so "this is big news" in
its own voice is exactly the sentence it cannot write. What it can do is join
two published facts:

    this headline names a listed company
  + that company's session was outside its own published band
  = worth a second look, and here is the arithmetic

Everything else is labelled for what it is — a company named on an ordinary
session, or a story about the market and not about any listed name.

Usage:
    python3 scripts/build_news_api.py [--check]
"""

from __future__ import annotations

import argparse
import html as html_lib
import json
import pathlib
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

import filing_types as ft
import translations

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "public" / "data" / "v1" / "news"
FIXTURES = REPO / "app" / "assets" / "fixtures" / "news"
COMPANIES = REPO / "public" / "data" / "v1" / "companies.json"
DETAILS = REPO / "public" / "data" / "v1" / "companies"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ESTHMR/1.0"

# The outlets stockastic.app aggregates, checked one by one on 19 August 2026.
#
# Only Al Borsa answers. Mubasher — the one most people would name first — has
# served a maintenance page on both mubasher.info and english.mubasher.info,
# copyright notice frozen at 2017. Arab Finance's feed returns 410 Gone. Zawya's
# RSS endpoints answer 200 with no items. Al Mal has no feed path that resolves.
#
# The others stay listed rather than deleted: this file is also the record of
# what was tried, and a source that comes back should be a one-line change.
SOURCES = [
    {
        "id": "alborsa",
        "name": "Al Borsa",
        "name_ar": "جريدة البورصة",
        "home": "https://www.alborsaanews.com",
        # WordPress REST rather than the RSS feed: same content, but it carries
        # ids, category ids and an ISO timestamp instead of an RFC-822 string.
        "endpoint": "https://www.alborsaanews.com/wp-json/wp/v2/posts?per_page=40",
        "kind": "wp",
        "live": True,
    },
    {
        "id": "hapi",
        "name": "Hapi Journal",
        "name_ar": "حابي",
        "home": "https://www.hapijournal.com",
        "endpoint": "https://www.hapijournal.com/wp-json/wp/v2/posts?per_page=30",
        "kind": "wp",
        "live": True,
    },
    {
        "id": "arabfinance",
        "name": "Arab Finance",
        "name_ar": "عرب فاينانس",
        "home": "https://www.arabfinance.com",
        # No feed and no REST API, but robots.txt points at a Google-News
        # sitemap whose URL slugs *are* the headlines, in both languages, with
        # a lastmod date. Published for machines to read, which is what this is.
        "endpoint": "https://www.arabfinance.com/autositemapnews",
        "kind": "newsmap",
        "live": True,
    },
    {
        "id": "mubasher",
        "name": "Mubasher",
        "name_ar": "مباشر",
        "home": "https://www.mubasher.info",
        "endpoint": None,
        "kind": "none",
        "live": False,
        "note": "site serving a maintenance page; no feed reachable 19 Aug 2026",
    },
    {
        "id": "almal",
        "name": "Al Mal News",
        "name_ar": "المال",
        "home": "https://almalnews.com",
        "endpoint": None,
        "kind": "none",
        "live": False,
        "note": "sitemaps are archives — sitemap75 carries 2007 dates",
    },
    {
        "id": "zawya",
        "name": "Zawya",
        "name_ar": "زاوية",
        "home": "https://www.zawya.com",
        "endpoint": None,
        "kind": "none",
        "live": False,
        "note": "rss answers 200 with zero items",
    },
]

# A wire headline is not written under this app's constraints, and some of them
# are outright recommendations — "توصية بشراء", "سهم يستحق الشراء". Those may not
# be republished in a product that is not licensed to advise, however clearly
# they are attributed. Matching the ingestion Voice Gate, an item that trips one
# of these is dropped and counted, never silently edited.
ADVICE_PATTERNS = (
    re.compile(r"\bتوصي(ة|ات)?\b"),
    re.compile(r"\bننصح\b|\bنوصي\b"),
    re.compile(r"\bفرصة شراء\b|\bفرص شراء\b"),
    re.compile(r"\bيستحق الشراء\b|\bاشتر\b|\bاشترِ\b"),
    re.compile(r"\bسعر مستهدف\b|\bالسعر المستهدف\b"),
    re.compile(r"\bوقف (خسارة|الخسارة)\b"),
    re.compile(r"\bادخل\b|\bالدخول عند\b"),
    re.compile(r"\b(buy|sell)\s+(now|rating|call|recommendation)\b", re.I),
    re.compile(r"\bprice target\b|\bstop loss\b|\btarget price\b", re.I),
    re.compile(r"\b(strong|top)\s+(buy|sell)\b", re.I),
)


def text(raw: str) -> str:
    """Strip tags, decode entities, collapse whitespace."""
    return " ".join(html_lib.unescape(re.sub(r"<[^>]+>", " ", raw or "")).split())


def get(url: str, timeout: int = 25) -> bytes | None:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read()
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        print(f"   ! {url.split('/')[2]}: {error}", file=sys.stderr)
        return None


def fetch_wp(source: dict) -> list[dict]:
    raw = get(source["endpoint"])
    if raw is None:
        return []
    try:
        posts = json.loads(raw)
    except json.JSONDecodeError:
        print(f"   ! {source['id']}: response was not JSON", file=sys.stderr)
        return []

    items = []
    for post in posts:
        headline = text(post.get("title", {}).get("rendered", ""))
        if not headline:
            continue
        items.append(
            {
                "id": f"{source['id']}-{post.get('id')}",
                "source": source["id"],
                "headline": headline,
                "link": post.get("link", ""),
                "published": post.get("date_gmt", "") + "Z",
                # Build-time only. Never written to the published document.
                "_excerpt": text(post.get("excerpt", {}).get("rendered", "")),
                "_tags": post.get("tags") or [],
            }
        )
    return items


def fetch_newsmap(source: dict) -> list[dict]:
    """Headlines recovered from a news sitemap's URL slugs.

    Arab Finance publishes no feed, but its Google-News sitemap lists every
    recent article with a `lastmod`, and the slug is the headline with hyphens
    for spaces — in Arabic as well as English, percent-encoded. That is a
    weaker source than a REST API and it is honest about it: the headline is
    reconstructed, so anything that does not decode to real words is dropped.
    """
    raw = get(source["endpoint"])
    if raw is None:
        return []

    body = raw.decode("utf-8", "replace")
    items = []
    for block in re.findall(r"<url>(.*?)</url>", body, re.S):
        loc = re.search(r"<loc>(.*?)</loc>", block)
        mod = re.search(r"<lastmod>(.*?)</lastmod>", block)
        if not loc:
            continue
        url = loc.group(1).strip()
        slug = urllib.parse.unquote(url.rstrip("/").rsplit("/", 1)[-1])
        headline = slug.replace("-", " ").strip()
        # A slug that is an id, a date or a stub is not a headline.
        if len(headline) < 18 or not re.search(r"[A-Za-z\u0600-\u06ff]", headline):
            continue
        date = (mod.group(1).strip() if mod else "")[:10]
        items.append(
            {
                "id": f"{source['id']}-{abs(hash(url)) % 10**10}",
                "source": source["id"],
                "headline": headline,
                "link": url,
                "published": f"{date}T00:00:00Z" if date else "",
                "_excerpt": "",
                "_tags": [],
                # Said out loud in the document: this headline was rebuilt from
                # a URL, not read from a title field.
                "reconstructed": True,
            }
        )
    return items


# ------------------------------------------------------------ ticker matching
#
# Matching is done on the OUTLET'S OWN company tags, not on the words in the
# headline. Al Borsa maintains a tag per company — "هيرميس" carries 1,246
# articles, "البنك التجارى الدولى" 624 — and using their taxonomy makes the
# match exact instead of probabilistic.
#
# The first version of this file matched free text, splitting each Arabic name
# into words and accepting any long one. It tagged a story about cotton exports
# with a medical-services company, a factory investment with Talaat Moustafa on
# the word "مصطفى", and a story about the Financial Regulatory Authority with
# two brokers because both their names contain "المالية". A wrong tag puts a
# company's name against a story it has nothing to do with, and the entire
# value of the screen is that the connection can be trusted. Exact or nothing.

TAG_MAP = REPO / "scripts" / "news_tag_map.json"


def normalise_ar(value: str) -> str:
    """Fold the letter forms Egyptian writers use interchangeably.

    Without this, "الاسكندرية" in a tag never matches "الإسكندرية" in the
    directory, and they are the same word — alef with and without hamza, teh
    marbuta against heh, and the yeh/alef-maqsura pair.
    """
    value = re.sub(r"[\u064b-\u0652\u0640]", "", value)
    value = re.sub(r"[أإآٱ]", "ا", value)
    value = value.replace("ة", "ه").replace("ى", "ي").replace("ؤ", "و")
    value = value.replace("ئ", "ي")
    return " ".join(value.split())


def resolve_tags(source: dict, refresh: bool) -> dict[str, int]:
    """ticker → the outlet's tag id, resolved once and cached in the repo.

    Cached because it is a slow, chatty lookup against somebody else's server
    and the answer changes about never. Delete the file or pass --refresh-tags
    to rebuild it.
    """
    if TAG_MAP.exists() and not refresh:
        return {k: v for k, v in json.loads(TAG_MAP.read_text()).items()}

    directory = json.loads(COMPANIES.read_text())
    resolved: dict[str, int] = {}

    for company in directory["companies"]:
        name_ar = company.get("name_ar")
        if not name_ar:
            continue
        wanted = normalise_ar(name_ar)
        url = (
            f"{source['home']}/wp-json/wp/v2/tags?per_page=20&search="
            + urllib.parse.quote(name_ar)
        )
        raw = get(url, timeout=20)
        if raw is None:
            continue
        try:
            tags = json.loads(raw)
        except json.JSONDecodeError:
            continue

        for tag in tags:
            got = normalise_ar(tag.get("name", ""))
            # Accept only an exact fold-match, or a tag that is the whole
            # published name with a leading article dropped. Anything looser
            # is how "المالية" became a broker.
            if got == wanted or wanted.endswith(got) and len(got) >= 8:
                resolved[company["ticker"]] = tag["id"]
                print(f"   {company['ticker']:6} → {tag['name']} ({tag['count']})")
                break

    TAG_MAP.write_text(
        json.dumps(resolved, ensure_ascii=False, indent=1, sort_keys=True),
        encoding="utf-8",
    )
    return resolved


def match_tickers(item: dict, tag_map: dict[str, int]) -> list[str]:
    """Which listed companies the outlet itself says the story is about."""
    by_tag = {tag_id: ticker for ticker, tag_id in tag_map.items()}
    hits = {by_tag[t] for t in item.get("_tags", []) if t in by_tag}

    # A ticker printed verbatim is unambiguous — "SCCD" is not a word.
    blob = f"{item['headline']} {item.get('_excerpt', '')}"
    for ticker in tag_map:
        if re.search(rf"\b{re.escape(ticker)}\b", blob):
            hits.add(ticker)

    return sorted(hits)


# ------------------------------------------------------------------ clustering


def shingle(headline: str) -> set[str]:
    """The words a headline is made of, folded and stripped of furniture."""
    folded = normalise_ar(headline)
    folded = re.sub(r"[^\w\u0600-\u06ff ]+", " ", folded)
    words = [w for w in folded.split() if len(w) > 2]
    return set(words)


def cluster(items: list[dict], threshold: float = 0.55) -> list[dict]:
    """Fold the same story, told by three outlets, into one row.

    Three papers covering one ministry announcement is one thing that happened,
    not three. Stockastic's own rows carry a `sources` array for exactly this
    reason, and a feed that does not do it makes a reader scroll past the same
    headline until they stop reading.

    Jaccard over word sets, which is crude and right for this: Arabic headlines
    about the same event share proper nouns and numbers, and the threshold is
    set high enough that two different stories about the same ministry stay
    apart. Merged rows keep the earliest timestamp — the first outlet to
    publish is the one that broke it.
    """
    clusters: list[dict] = []
    signatures: list[set[str]] = []

    for item in items:
        words = shingle(item["headline"])
        if not words:
            continue
        placed = False
        for index, existing in enumerate(signatures):
            overlap = len(words & existing) / max(1, len(words | existing))
            if overlap >= threshold:
                head = clusters[index]
                # Never twice from the same outlet.
                if item["source"] not in {s["id"] for s in head["sources"]}:
                    head["sources"].append(
                        {"id": item["source"], "link": item["link"]}
                    )
                if item["published"] and (
                    not head["published"] or item["published"] < head["published"]
                ):
                    head["published"] = item["published"]
                # A headline read from a title field beats one rebuilt from a
                # URL slug, whichever arrived first.
                if head.get("reconstructed") and not item.get("reconstructed"):
                    head["headline"] = item["headline"]
                    head["reconstructed"] = False
                head["tickers"] = sorted(set(head["tickers"]) | set(item["tickers"]))
                placed = True
                break
        if placed:
            continue

        item["sources"] = [{"id": item["source"], "link": item["link"]}]
        clusters.append(item)
        signatures.append(words)

    return clusters


# ------------------------------------------------------------ what happened
#
# The classification that replaces a sentiment badge.
#
# Stockastic tags each headline positive / negative / neutral. That is a view
# on a named issuer, published by somebody with no licence to hold one, and it
# is the same exposure as a price target with the number removed — a reader
# sees "positive" beside a company and reads "good for the stock".
#
# What kind of event it is, on the other hand, is a fact about the story, and
# it is the more useful half anyway: "capital increase" tells a reader more
# than "negative" ever did, and it can be checked against the article.
EVENTS = [
    ("results", "Results", (
        r"نتائج أعمال|أرباح|خسائر|القوائم المالية|الربع (الأول|الثاني|الثالث|الرابع)"
        r"|صافي الربح|earnings|net profit|quarterly results"
    )),
    ("capital", "Capital change", (
        r"زيادة رأس ?المال|تخفيض رأس ?المال|رأسمال|أسهم مجانية|طرح|اكتتاب"
        r"|capital increase|rights issue|share buyback|إعادة شراء"
    )),
    ("stake", "Ownership change", (
        r"حصة|حصتها|استحواذ|يستحوذ|اندماج|بيع (حصة|أسهم)|صفقة"
        r"|stake|acquisition|merger|acquires"
    )),
    ("distribution", "Distribution", (
        r"توزيعات|كوبون|أرباح نقدية|dividend|coupon"
    )),
    ("contract", "Contract or project", (
        r"عقد|تعاقد|بروتوكول|أمر توريد|مشروع|تستثمر|استثمارات|توقيع"
        r"|contract|agreement|signs|project|invests"
    )),
    ("board", "Board or management", (
        r"مجلس (الإدارة|إدارة)|تعيين|استقالة|رئيسًا|الرئيس التنفيذي"
        r"|board|appoint|resign|chief executive"
    )),
    ("regulatory", "Regulator or exchange", (
        r"الرقابة المالية|البورصة تقرر|إيقاف|شطب|تعليق التداول|ضوابط|قرار"
        r"|regulator|suspend|delist|FRA"
    )),
    ("funding", "Funding or debt", (
        r"قرض|تمويل|سندات|صكوك|ائتمان|تسهيل"
        r"|loan|financing|bond|sukuk|credit facility"
    )),
    ("macro", "Economy and policy", (
        r"البنك المركزي|سعر الفائدة|التضخم|الدولار|الجنيه|الناتج المحلي|الموازنة"
        r"|central bank|interest rate|inflation|GDP|budget"
    )),
]


def classify(headline: str) -> tuple[str, str]:
    """What kind of thing happened. Never whether it was good."""
    folded = normalise_ar(headline)
    for key, label, pattern in EVENTS:
        if re.search(normalise_ar(pattern), folded):
            return key, label
    return "other", "Other"


# ------------------------------------------------------------ the triage step


def session_facts(ticker: str) -> dict | None:
    """The published session numbers behind an importance claim."""
    path = DETAILS / f"{ticker}.json"
    if not path.exists():
        return None
    doc = json.loads(path.read_text())
    market = doc.get("market") or {}
    profile = doc.get("profile") or {}
    volume = market.get("volume")
    median = profile.get("median_volume_20d")
    if not volume or not median:
        return None
    return {
        "ticker": ticker,
        "volume": volume,
        "median_volume_20d": median,
        "rv": volume / median,
        "date": market.get("date"),
    }


# The band, published and identical for every one of the 282 names.
UNUSUAL_VOLUME = 2.0


def triage(item: dict) -> dict:
    """Attach the reason an item is, or is not, worth a second look."""
    facts = [f for f in (session_facts(t) for t in item["tickers"]) if f]
    unusual = [f for f in facts if f["rv"] >= UNUSUAL_VOLUME]

    if unusual:
        top = max(unusual, key=lambda f: f["rv"])
        return {
            "weight": "check",
            # Stated as the join of two facts, with both of them shown.
            "because": (
                f"Names {top['ticker']}, which traded "
                f"{top['rv']:.2f}× its own normal volume that session."
            ),
            "evidence": {
                "ticker": top["ticker"],
                "volume": top["volume"],
                "median_volume_20d": round(top["median_volume_20d"]),
                "ratio": round(top["rv"], 2),
                "threshold": UNUSUAL_VOLUME,
                "date": top["date"],
            },
        }

    if facts:
        top = max(facts, key=lambda f: f["rv"])
        return {
            "weight": "named",
            "because": (
                f"Names {top['ticker']}. Its session was ordinary — "
                f"{top['rv']:.2f}× its normal volume, against a "
                f"{UNUSUAL_VOLUME:g}× threshold."
            ),
            "evidence": {
                "ticker": top["ticker"],
                "volume": top["volume"],
                "median_volume_20d": round(top["median_volume_20d"]),
                "ratio": round(top["rv"], 2),
                "threshold": UNUSUAL_VOLUME,
                "date": top["date"],
            },
        }

    if item["tickers"]:
        return {
            "weight": "named",
            "because": (
                f"Names {', '.join(item['tickers'])}. No session data is "
                "published for it, so there is nothing to measure the story "
                "against."
            ),
            "evidence": None,
        }

    return {
        "weight": "market",
        "because": (
            "Names no listed company we can match, so this is about the "
            "market or the economy rather than about a share."
        ),
        "evidence": None,
    }


def advice_leak(headline: str) -> str | None:
    for pattern in ADVICE_PATTERNS:
        if match := pattern.search(headline):
            return match.group(0)
    return None


def build(refresh_tags: bool = False) -> dict:
    tag_map: dict[str, int] = {}
    items: list[dict] = []
    dropped: list[dict] = []
    live_sources = []

    for source in SOURCES:
        if not source["live"]:
            print(f"── {source['name']}: {source.get('note', 'not reachable')}")
            continue
        print(f"── {source['name']}")
        if not tag_map:
            tag_map = resolve_tags(source, refresh_tags)
            print(f"   {len(tag_map)} companies mapped to the outlet's own tags")
        fetched = {
            "wp": fetch_wp,
            "newsmap": fetch_newsmap,
        }.get(source["kind"], lambda _s: [])(source)
        if not fetched:
            continue
        live_sources.append(source)
        for item in fetched:
            if leak := advice_leak(item["headline"]):
                dropped.append({"headline": item["headline"], "matched": leak})
                continue
            item["tickers"] = match_tickers(item, tag_map)
            item.update(triage(item))
            # The excerpt was for matching. It does not get published.
            item.pop("_excerpt", None)
            item.pop("_tags", None)
            items.append(item)
        print(f"   {len(fetched)} headlines")

    # Newest first before clustering, so the earliest-published rule inside a
    # cluster has something to compare against.
    items.sort(key=lambda i: i["published"], reverse=True)
    before = len(items)
    items = cluster(items)
    merged = before - len(items)
    print(f"\n{before} headlines → {len(items)} stories after merging duplicates")

    for item in items:
        item["event"], item["event_label"] = classify(item["headline"])
        # The same glossary the filings feed uses — but only where the story
        # names a listed company.
        #
        # The filings classifier reads EGX's own formulaic titles and is
        # reliable. This one guesses from a free-text headline and is not: it
        # read a gold-price story as "results" and printed "the company
        # published what it earned or lost over a period" under it, and read a
        # central bank story as a filing. A wrong explanation is worse than
        # none, because a reader has no way to know which they are looking at.
        #
        # A ticker match is the corroboration that makes the classification
        # worth publishing. Today that is 1 story in 120, which is the honest
        # number rather than a disappointing one.
        if len(item.get("tickers") or []) == 1 and item["event"] != "other":
            item["meaning"] = ft.meaning(item["event"])
            item["meaning_ar"] = ft.meaning_ar(item["event"])
        item.pop("link", None)
        item.pop("source", None)

    items.sort(key=lambda i: i["published"], reverse=True)
    items = items[:120]

    return {
        "sources": [
            {
                "id": s["id"],
                "name": s["name"],
                "name_ar": s["name_ar"],
                "home": s["home"],
            }
            for s in live_sources
        ],
        "unavailable": [
            {"name": s["name"], "note": s.get("note", "")}
            for s in SOURCES
            if not s["live"]
        ],
        "threshold": UNUSUAL_VOLUME,
        "dropped_for_advice": len(dropped),
        "merged": merged,
        "items": items,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--refresh-tags", action="store_true")
    args = parser.parse_args()

    doc = build(refresh_tags=args.refresh_tags)

    if not doc["items"]:
        print("no headlines fetched — leaving the published document alone")
        return 1

    # English for an English reader. The Arabic stays on every item — the
    # translation sits beside it, never over it.
    english = translations.english_for(
        [i["headline"] for i in doc["items"]], label="headlines"
    )
    for item in doc["items"]:
        if (rendered := english.get(item["headline"])) is not None:
            item["headline_en"] = rendered

    checks = sum(1 for i in doc["items"] if i["weight"] == "check")
    named = sum(1 for i in doc["items"] if i["weight"] == "named")
    print(f"\n{len(doc['items'])} headlines · {checks} worth a check · {named} name a company")
    if doc["dropped_for_advice"]:
        print(f"{doc['dropped_for_advice']} dropped as advice")
    for item in doc["items"][:6]:
        print(f"  [{item['weight']:7}] {item['headline'][:70]}")

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
    raise SystemExit(main())
