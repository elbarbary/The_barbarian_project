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
import hashlib
import html as html_lib
import datetime
import json
import pathlib
import re
import sys
import typing
import urllib.error
import urllib.parse
import urllib.request

import company_match
import filing_types as ft
import news_context
import news_images
import news_insights
import translations
import transport

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "public" / "data" / "v1" / "news"
FIXTURES = REPO / "app" / "assets" / "fixtures" / "news"
COMPANIES = REPO / "public" / "data" / "v1" / "companies.json"
DETAILS = REPO / "public" / "data" / "v1" / "companies"
# The capture that says which session the company documents beside it hold,
# and whether that session has closed.
MARKET = REPO / "public" / "data" / "v1" / "market.json"

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
        "endpoint": "https://www.alborsaanews.com/wp-json/wp/v2/posts?per_page=40"
        "&_embed=wp:featuredmedia",
        "kind": "wp",
        "live": True,
    },
    {
        "id": "hapi",
        "name": "Hapi Journal",
        "name_ar": "حابي",
        "home": "https://www.hapijournal.com",
        "endpoint": "https://www.hapijournal.com/wp-json/wp/v2/posts?per_page=30"
        "&_embed=wp:featuredmedia",
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
        # Not a feed and not a sitemap. Al Mal moved to Next.js: there is no
        # `/feed/`, `/wp-json/` 404s, and the 75 sitemaps carry `lastmod`
        # values that run from 1899 to 2009 — which is what the old note here
        # meant by "archives". What does work is the paper's own latest-news
        # page, whose cards carry the full headline in a `title` attribute and
        # the article's picture, and whose article pages each carry a
        # `NewsArticle` JSON-LD block with a real `datePublished`.
        # Its own finance sections rather than `latest-news`, which is the
        # whole paper — sport, politics, education. Three pages, ~110 cards,
        # and the noise a general front page would put in a markets feed
        # never arrives.
        "endpoint": "https://almalnews.com/category/stocks/1/",
        "endpoints": [
            "https://almalnews.com/category/stocks/1/",
            "https://almalnews.com/category/economy-markets/1/",
            "https://almalnews.com/category/banks/1/",
        ],
        "kind": "listing",
        "live": True,
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "name_ar": "إنتربرايز",
        "home": "https://enterpriseam.com",
        # An ordinary WordPress RSS feed, and the only English-language
        # Egyptian business wire in this list. Its robots.txt allows `*` and
        # sets `Content-Signal: search=yes,ai-train=no,use=reference` — which
        # is exactly the bargain this file already makes with every outlet:
        # headline and link, never the body, nothing fed to a model.
        "endpoint": "https://enterpriseam.com/feed/",
        "kind": "rss",
        "live": True,
        # Published in English, so `translations.english_for` leaves these
        # alone (`needs_english` is false) and the headline is its own
        # translation.
        "english": True,
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
    except transport.TRANSPORT as error:
        print(f"   ! {url.split('/')[2]}: {error}", file=sys.stderr)
        return None


def featured_image(post: dict) -> str | None:
    """The article's own lead picture, if the outlet publishes one.

    A wall of text rows is hard to read at a glance and hard to tell apart;
    the picture the outlet chose is the cheapest way to make a story
    recognisable. This is the outlet's own image, shown on a card that links
    straight back to their article — the same bargain every reader app makes.

    Two places to look, because WordPress exposes it twice and neither is
    guaranteed. `_embed=wp:featuredmedia` is the documented route; the Yoast
    block is the fallback and is what survives when a post has no attachment
    record but does set an og:image. Arab Finance is read from a sitemap and
    has neither, so those stories simply have no picture.
    """
    embedded = (post.get("_embedded") or {}).get("wp:featuredmedia") or []
    for media in embedded:
        if url := (media.get("source_url") or "").strip():
            return url
    og = (post.get("yoast_head_json") or {}).get("og_image") or []
    for image in og:
        if url := (image.get("url") or "").strip():
            return url
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
                "image": featured_image(post),
                # Build-time only. Never written to the published document.
                "_excerpt": text(post.get("excerpt", {}).get("rendered", "")),
                "_tags": post.get("tags") or [],
            }
        )
    return items


def fetch_rss(source: dict) -> list[dict]:
    """An ordinary RSS 2.0 feed, read for the four fields that matter.

    Deliberately not `feedparser`: this repository ships no dependency it does
    not need, and an `<item>` is four regexes. The description is taken only
    as a build-time excerpt for ticker matching and is dropped before
    publication, like every other outlet's.
    """
    raw = get(source["endpoint"])
    if raw is None:
        return []
    body = raw.decode("utf-8", "replace")

    items = []
    for block in re.findall(r"<item>(.*?)</item>", body, re.S):
        def field(tag: str) -> str:
            match = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", block, re.S)
            if not match:
                return ""
            value = match.group(1).strip()
            cdata = re.match(r"^<!\[CDATA\[(.*?)\]\]>$", value, re.S)
            return (cdata.group(1) if cdata else value).strip()

        headline = text(field("title"))
        link = field("link")
        if not headline or not link:
            continue
        # The guid carries the post id — a stable key that survives a headline
        # being corrected, which a hash of the title would not.
        guid = field("guid")
        post = re.search(r"[?&]p=(\d+)", guid) or re.search(r"[?&]p=(\d+)", link)
        ident = post.group(1) if post else hashlib.sha1(link.encode()).hexdigest()[:12]

        # The picture the outlet chose, which RSS hides inside the description
        # HTML rather than exposing as a field.
        picture = re.search(r'<img[^>]+src="([^"]+)"', field("description"))

        items.append(
            {
                "id": f"{source['id']}-{ident}",
                "source": source["id"],
                "headline": headline,
                "link": link,
                "published": rfc822(field("pubDate")),
                "image": picture.group(1) if picture else None,
                "_excerpt": text(field("description"))[:400],
                "_tags": [],
            }
        )
    return items


# RFC-822 is what RSS specifies and what nothing else in this file uses, so the
# conversion lives here rather than in a shared helper nobody else would call.
RFC822 = "%a, %d %b %Y %H:%M:%S"


def rfc822(stamp: str) -> str:
    """`Mon, 24 Aug 2026 00:00:00 +0000` to an ISO instant, or empty."""
    cleaned = re.sub(r"\s+", " ", (stamp or "").strip())
    match = re.match(r"^([A-Za-z]{3}, \d{1,2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2})", cleaned)
    if not match:
        return ""
    try:
        when = datetime.datetime.strptime(match.group(1), RFC822)
    except ValueError:
        return ""
    return when.replace(tzinfo=datetime.UTC).isoformat().replace("+00:00", "Z")


# How many article pages one run will open to date Al Mal's headlines. The
# listing gives us everything except the timestamp; the timestamp needs the
# article. Ids already in the published feed are skipped, so this is a cost
# paid once per story and a normal quarter-hour brings a handful.
ARTICLE_READS = 40


def fetch_listing(source: dict, known: set[str]) -> list[dict]:
    """Headlines from a paper that publishes no feed at all.

    Al Mal's latest-news page is a list of cards; each card's anchor carries
    the article's full headline in `title=` and its picture in the `img`. That
    is headline, link and image in one request. The missing field is *when*,
    and the only place it exists is the article's own JSON-LD — so an article
    this feed has not seen before costs one extra request, and one that it has
    costs nothing.

    An article whose date cannot be read is dropped rather than stamped with
    the time of the build: a story dated "now" sorts above real news and would
    stay at the top of the feed until it aged out.
    """
    cards: list[tuple[str, str]] = []
    pictures: dict[str, str] = {}
    for endpoint in source.get("endpoints") or [source["endpoint"]]:
        raw = get(endpoint)
        if raw is None:
            continue
        page = raw.decode("utf-8", "replace")
        # Two capture groups per card, and the id is the path's first segment.
        cards += re.findall(r'href="(/\d{5,}/[^"]*)"\s+title="([^"]{8,})"', page)
        pictures.update(
            re.findall(r'href="(/\d{5,}/[^"]*)"[^>]*>\s*<img[^>]+src="([^"]+)"', page)
        )
    if not cards:
        return []

    seen: set[str] = set()

    items = []
    reads = 0
    for path, title in cards:
        ident = path.strip("/").split("/")[0]
        if not ident.isdigit():
            continue
        key = f"{source['id']}-{ident}"
        if key in seen:
            continue
        seen.add(key)
        headline = text(html_lib.unescape(title))
        if len(headline) < 12:
            continue
        # Al Mal's slugs are Arabic, and `http.client` encodes a request line
        # as ASCII — an unescaped path raises before the request is made. The
        # percent-encoded form is what the site itself serves and what the
        # dedupe key should be, so it is what gets published too.
        link = source["home"] + urllib.parse.quote(path, safe="/")
        if link in known:
            # Already published, already dated. `merge_with_published` keeps
            # the stored copy, so re-opening this article would buy nothing.
            continue
        if reads >= ARTICLE_READS:
            continue
        reads += 1
        published, picture = article_stamp(link)
        if not published:
            continue
        items.append(
            {
                "id": key,
                "source": source["id"],
                "headline": headline,
                "link": link,
                "published": published,
                "image": picture or pictures.get(path),
                "_excerpt": "",
                "_tags": [],
            }
        )
    return items


def article_stamp(link: str) -> tuple[str, str | None]:
    """`datePublished` and the lead picture, from an article's JSON-LD."""
    raw = get(link, timeout=20)
    if raw is None:
        return "", None
    body = raw.decode("utf-8", "replace")
    for script in re.findall(
        r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', body, re.S
    ):
        try:
            parsed = json.loads(script)
        except json.JSONDecodeError:
            continue
        for node in (parsed if isinstance(parsed, list) else [parsed]):
            if not isinstance(node, dict) or node.get("@type") != "NewsArticle":
                continue
            stamp = (node.get("datePublished") or "").strip()
            # "2026-08-24T15:51:47 +03:00" — a space before the offset, which
            # `fromisoformat` will not take.
            normalised = re.sub(r"\s+(?=[+-]\d{2}:\d{2}$)", "", stamp)
            try:
                when = datetime.datetime.fromisoformat(normalised)
            except ValueError:
                continue
            if when.tzinfo is None:
                when = when.replace(tzinfo=datetime.UTC)
            image = re.search(r'<meta property="og:image" content="([^"]+)"', body)
            return (
                when.astimezone(datetime.UTC).isoformat().replace("+00:00", "Z"),
                image.group(1) if image else None,
            )
    return "", None


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
                # A stable id, because the merge dedupes on it.
                #
                # This was `abs(hash(url)) % 10**10`, and Python randomises
                # string hashing per process — so every build minted a fresh
                # id for the same article and `merge_with_published` kept it
                # as a new story. The feed reached 400 items carrying 134
                # distinct headlines: eight copies of "CBE holds key interest
                # rates steady", eight of the Palm Hills financing note. It
                # looked like a feed that repeated itself because it was one.
                "id": (
                    f"{source['id']}-"
                    f"{hashlib.sha1(url.encode()).hexdigest()[:12]}"
                ),
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


# The fold lives in `news_context`, which is the file with the most Arabic in
# it, so there is exactly one implementation for tags, clustering and subjects
# to agree on.
normalise_ar = news_context.normalise_ar


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


def match_tickers(
    item: dict, tag_map: dict[str, int], name_keys: dict[str, str]
) -> list[str]:
    """Which listed companies this story is about.

    Three readings, strongest first, and all of them exact:

      * the outlet's own company tag, which is their taxonomy not our guess;
      * a ticker printed verbatim, since "SCCD" is not an Arabic word;
      * the company's name in the headline, matched on a two-word
        discriminative key — see `company_match` for why one word is not
        enough and free text is worse than either.

    The third is what makes this layer exist at all. Tags resolve nine
    companies out of 282, so before it every one of four hundred stories came
    back empty and `triage` stamped them all "market".
    """
    by_tag = {tag_id: ticker for ticker, tag_id in tag_map.items()}
    hits = {by_tag[t] for t in item.get("_tags", []) if t in by_tag}

    # A ticker printed verbatim is unambiguous — "SCCD" is not a word.
    blob = f"{item['headline']} {item.get('_excerpt', '')}"
    for ticker in tag_map:
        if re.search(rf"\b{re.escape(ticker)}\b", blob):
            hits.add(ticker)

    hits.update(company_match.match(item["headline"], name_keys))
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
            if overlap < threshold:
                continue
            head = clusters[index]

            # Two companies are never one story.
            #
            # Results announcements are near-identical by construction — "X
            # ترتفع بأرباحها إلى N مليون جنيه بنهاية يونيو" — so a Jaccard over
            # word sets happily merged Fawry's revenues with Talaat Moustafa's
            # profit, and then took the union of their tickers. One row came
            # out carrying four companies and naming one of them. Word overlap
            # cannot tell those apart; the tickers can, and they are the whole
            # point of the row.
            if head["tickers"] and item["tickers"]:
                if set(head["tickers"]) != set(item["tickers"]):
                    continue

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

# The session an "unusual volume" claim is measured on.
#
# This document is rebuilt every fifteen minutes; `market.json` is rebuilt three
# times a trading day, and only the last of those three runs after the close. So
# for most of a session the company documents on disk hold a *partial* day —
# `market.json {"is_close": false}` says so out loud — and a ratio taken from
# them is a fraction of a day divided by a whole one.
#
# It shipped that way. On 2 September the 12:08 Cairo scan had CFGH at 280,216
# shares against a 42,112 median, and the headline triaged in that window kept
# "6.65× their usual volume" for the rest of the day. The 14:31 capture, after
# the close, had 427,947 against 70,740 — 6.05× — which is what the company
# screen, market.json and Connecting the dots all printed for the same company
# on the same day. Sixteen of the seventeen blocks dated 2 September carried a
# volume smaller than the session's own; the seventeenth was DEIN, whose 66
# shares were the same 66 in both captures.
#
# Two rules follow, and between them one company on one day has one ratio
# everywhere:
#
#   1. A ratio is only ever measured on a capture whose session has closed —
#      the same capture `build_market_api` stamped `is_close` on and the same
#      company documents `build_connections_api` divides.
#   2. While a session is open the evidence stays on the last completed one,
#      dated as that session rather than as today. `evidence.date` names the
#      day the volume belongs to; the site prints it whenever it differs from
#      the story's own date.
#
# What it does not do is invent a figure to fill the gap. A document that has
# never carried a closed session — a first build, or a machine with no
# market.json — publishes headlines with no evidence block at all, because the
# honest answer to "how unusual was that session" before a session ends is that
# we do not know yet.


class Basis(typing.NamedTuple):
    """What this run is allowed to measure an unusual session against."""

    # {"date", "captured_at"} of the last completed session, or None when no
    # closed capture is reachable and nothing may be claimed.
    session: dict | None
    # Ticker → the evidence block already published against that session, used
    # while the current session is still open. None means the capture on disk
    # *is* that session, so read the company documents instead.
    carried: dict[str, dict] | None
    # One company document per ticker per run, not per item: the same company
    # is named by several headlines and triaged again on every merge.
    cache: dict


def evidence_basis() -> Basis:
    """The session every ratio in this document is measured on."""
    try:
        capture = json.loads(MARKET.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        capture = {}

    if capture.get("is_close") and capture.get("date"):
        # The company documents beside it were written by the same build, from
        # the same scan, so their volumes are that session's finished volumes.
        return Basis(
            {
                "date": capture["date"],
                "captured_at": capture.get("captured_at"),
            },
            None,
            {},
        )

    # Session in progress (or an unreadable capture). Whatever this document
    # last published against a closed session stands, unchanged, until the next
    # close — including the session it names.
    try:
        published = json.loads((OUT / "latest.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return Basis(None, {}, {})

    session = published.get("evidence_session")
    if not isinstance(session, dict) or not session.get("date"):
        # Written before this rule existed, so there is no record of which
        # session those blocks were measured on and no way to tell a closed
        # figure from a snapshot. They are dropped rather than re-published.
        return Basis(None, {}, {})

    carried: dict[str, dict] = {}
    for item in published.get("items") or []:
        block = item.get("evidence")
        if not block or block.get("date") != session["date"]:
            continue
        ticker = block.get("ticker")
        if ticker:
            carried[ticker] = block
    return Basis(session, carried, {})


def session_facts(ticker: str, basis: Basis) -> dict | None:
    """The published session numbers behind an importance claim."""
    if basis.session is None:
        return None
    if ticker in basis.cache:
        return basis.cache[ticker]
    facts = (
        _facts_from_company(ticker, basis.session)
        if basis.carried is None
        else _facts_carried(ticker, basis)
    )
    basis.cache[ticker] = facts
    return facts


def _facts_from_company(ticker: str, session: dict) -> dict | None:
    """Volume and median off the company document, as connections divides them."""
    path = DETAILS / f"{ticker}.json"
    if not path.exists():
        return None
    doc = json.loads(path.read_text())
    market = doc.get("market") or {}
    profile = doc.get("profile") or {}
    # The company document is rewritten by the same build that wrote the
    # capture, but a company the scan missed keeps the session it last had.
    # Dividing that volume by today's median would be two different days.
    if market.get("date") != session["date"]:
        return None
    volume = market.get("volume")
    median = profile.get("median_volume_20d")
    if not volume or not median:
        return None
    return {
        "ticker": ticker,
        "volume": volume,
        "median_volume_20d": median,
        "rv": volume / median,
        "date": session["date"],
    }


def _facts_carried(ticker: str, basis: Basis) -> dict | None:
    """The block this document already published against the closed session."""
    block = (basis.carried or {}).get(ticker)
    if not block:
        return None
    volume = block.get("volume")
    median = block.get("median_volume_20d")
    if not volume or not median:
        return None
    # Divided again rather than trusting the stored `ratio`, so a block can
    # never disagree with its own two numbers.
    return {
        "ticker": ticker,
        "volume": volume,
        "median_volume_20d": median,
        "rv": volume / median,
        "date": block["date"],
    }


# The band, published and identical for every one of the 282 names.
UNUSUAL_VOLUME = 2.0


def isolate(value: str) -> str:
    """Wrap a Latin run so Arabic does not reorder around it (U+2068/U+2069)."""
    return f"\u2068{value}\u2069"


def evidence_of(fact: dict) -> dict:
    """The arithmetic, published so a reader can redo it.

    `date` is the session the volume was traded in, not the day this ran and
    not the day the story was filed — those are three different dates while a
    session is open, and the block is only readable if it says which one it is.
    """
    return {
        "ticker": fact["ticker"],
        "volume": fact["volume"],
        "median_volume_20d": round(fact["median_volume_20d"]),
        "ratio": round(fact["rv"], 2),
        "threshold": UNUSUAL_VOLUME,
        "date": fact["date"],
    }


def when(fact: dict, item: dict) -> tuple[str, str]:
    """"That day" — but only when the volume really is from the story's day.

    The two dates are usually the same and were treated as always the same,
    which the fifteen-minute cadence makes wrong twice over: before the close
    the evidence is the previous session's, and a headline from last week is
    re-measured against the session that has since finished. The site prints
    `evidence.date` beside the sentence whenever they differ; the app shows the
    sentence alone, so the sentence has to be true on its own.
    """
    if (item.get("published") or "")[:10] == fact["date"]:
        return "that day", "في ذلك اليوم"
    return "in the last completed session", "في آخر جلسة مكتملة"


def triage(item: dict, basis: Basis) -> dict:
    """Attach the reason an item is, or is not, worth a second look."""
    facts = [f for f in (session_facts(t, basis) for t in item["tickers"]) if f]
    unusual = [f for f in facts if f["rv"] >= UNUSUAL_VOLUME]

    if unusual:
        top = max(unusual, key=lambda f: f["rv"])
        day_en, day_ar = when(top, item)
        return {
            "weight": "check",
            # Stated as the join of two facts, with both of them shown.
            # A multiple of the normal, not an addition to it.
            "because": (
                f"This is about {top['ticker']}, whose shares changed hands "
                f"{top['rv']:.2f}× their usual volume {day_en}."
            ),
            "because_ar": (
                f"هذا الخبر عن {isolate(top['ticker'])}، وتداول سهمها "
                f"{isolate(f'{top['rv']:.2f}×')} حجمه المعتاد {day_ar}."
            ),
            "evidence": evidence_of(top),
        }

    if facts:
        top = max(facts, key=lambda f: f["rv"])
        day_en, day_ar = when(top, item)
        return {
            "weight": "named",
            "because": (
                f"This is about {top['ticker']}. Its shares traded about as "
                f"much as usual {day_en} — {top['rv']:.2f}× their normal, and "
                f"we only point out anything above {UNUSUAL_VOLUME:g}×."
            ),
            "because_ar": (
                f"هذا الخبر عن {isolate(top['ticker'])}. وتداول سهمها "
                f"{day_ar} كالمعتاد تقريبًا — {isolate(f'{top['rv']:.2f}×')} من "
                f"المعتاد، ولا ننبّه إلا لما يتجاوز "
                f"{isolate(f'{UNUSUAL_VOLUME:g}×')}."
            ),
            "evidence": evidence_of(top),
        }

    if item["tickers"]:
        # Two different silences, and saying the wrong one is a false claim
        # about the company. "No figures are published" is true of a name the
        # scan does not reach; it is not true at ten in the morning, when the
        # figures exist and simply belong to a session nobody has finished.
        if basis.session is None:
            # SAY NOTHING, rather than apologising on every card.
            #
            # This block exists to add a measured fact. When there is no
            # completed session to measure against there is no fact, and an
            # apology in its place is worse than an empty space: it filled 46
            # of 400 cards with "We hold no completed session's trading
            # figures", displacing the sentences that were there — including
            # real ones like "0.84x their normal". The site gates the block on
            # `hasBecause`, so an empty string simply does not render and the
            # card keeps its headline, its outlet and its date.
            #
            # It is a transition state, not a resting one: the first run after
            # a close publishes `evidence_session`, and from then on an open
            # session carries those measured blocks forward instead of
            # reaching this branch at all.
            return {"weight": "named", "because": "", "because_ar": "", "evidence": None}
        return {
            "weight": "named",
            "because": (
                f"This is about {', '.join(item['tickers'])}. No trading "
                "figures are published for it, so there is nothing to compare "
                "the story against."
            ),
            "because_ar": (
                f"هذا الخبر عن {isolate(', '.join(item['tickers']))}. لا "
                "توجد أرقام تداول منشورة لها، فليس هناك ما يُقارن به الخبر."
            ),
            "evidence": None,
        }

    return {
        "weight": "market",
        "because": (
            "Names no listed company we can match, so this is about the "
            "market or the economy rather than about a share."
        ),
        "because_ar": (
            "لا يذكر شركة مقيدة نستطيع مطابقتها، فهذا خبر عن السوق أو "
            "الاقتصاد لا عن سهم بعينه."
        ),
        "evidence": None,
    }


# How many stories the document carries. The feed collects around 570 headlines
# a run and merges them to under 300; the cap is here so the file cannot grow
# without anybody noticing, not to ration what a reader may see.
MAX_ITEMS = 400

# What a story has to do with somebody holding Egyptian shares, in points.
#
# Every term is a published fact about the story rather than a judgement of it:
# whether it names a listed company, whether we hold a mechanism for its
# subject, whether it concerns Egypt at all. Nothing here says a story is good
# or bad news, and nothing here is about a share price (§8).
RELEVANCE = {
    "ticker": 4,   # names a listed company, corroborated by the outlet's own tag
    "unusual": 2,  # and that company had an unusual session
    "subject": 2,  # we hold a written mechanism for what it is about
    "egypt": 1,    # concerns Egypt
    "event": 1,    # a company event rather than general copy
    # A headline rebuilt from a URL slug is a weaker reading of what the outlet
    # actually wrote, and it arrives without the outlet's picture. Arab Finance
    # publishes no feed, so its 335 stories are all reconstructed — five sixths
    # of the document — and on a pure clock sort they buried the 65 headlines
    # that came with a title field and a photograph. This is a statement about
    # how well we read the story, not about the outlet.
    "reconstructed": -2,
}

# Relevance outranks recency for about a day, then recency takes over.
#
# Both matter and neither wins outright. A pure time sort is what put American
# beef tariffs at the top of an Egyptian investing app; a pure relevance sort
# would hold a three-day-old canal story above this morning's rate decision.
#
# One point of relevance is worth 12 hours. At 24 the balance tipped too far
# the other way: yesterday's high-relevance cluster (a rel-8 IPO wave) sat
# above this morning's rel-6 company results, so the feed opened on yesterday
# and read as if it had not refreshed. Halving it means today's genuine
# company news leads the day — a fresh rel-6 story now outranks a ~26-hour-old
# rel-8 one — while a full day of ageing still costs two relevance points, so
# yesterday's real news stays above today's foreign wire copy and forex ticks,
# and last week's does not surface at all.
HOURS_PER_POINT = 12.0


def relevance(item: dict) -> int:
    """The points this story scores, with the reasons kept on the record."""
    score = 0
    if item.get("tickers"):
        score += RELEVANCE["ticker"]
    if item.get("weight") == "check":
        score += RELEVANCE["unusual"]
    if item.get("subject"):
        score += RELEVANCE["subject"]
    if news_context.about_egypt(normalise_ar(item["headline"])):
        score += RELEVANCE["egypt"]
    if item.get("event") not in (None, "other"):
        score += RELEVANCE["event"]
    if item.get("reconstructed"):
        score += RELEVANCE["reconstructed"]
    return score


def rank(items: list[dict]) -> None:
    """Order the feed by relevance and recency together, in place.

    The score is published on every item so a reader — or a reviewer — can see
    why one story sits above another, rather than being asked to trust an
    order they cannot inspect.
    """
    if not items:
        return

    def when(item: dict) -> datetime.datetime:
        return datetime.datetime.fromisoformat(
            item["published"].replace("Z", "+00:00")
        )

    latest = max(when(i) for i in items)

    # Newest first, then a stable sort on score: two stories scoring the same
    # keep the order the clock gave them.
    items.sort(key=lambda i: i["published"], reverse=True)
    for item in items:
        item["relevance"] = relevance(item)
    items.sort(
        key=lambda i: -(
            i["relevance"]
            - (latest - when(i)).total_seconds() / 3600.0 / HOURS_PER_POINT
        )
    )


def advice_leak(headline: str) -> str | None:
    for pattern in ADVICE_PATTERNS:
        if match := pattern.search(headline):
            return match.group(0)
    return None


def published_links() -> set[str]:
    """Every article URL already in the published feed.

    Only `fetch_listing` uses this, and only to avoid re-opening an article it
    has already dated. Keyed on the **link** rather than the item id because
    clustering keeps one id per story and discards the others: a story of ours
    merged under another outlet's headline survives in the row's `sources` as
    a link and nowhere else as an id, so an id-keyed check would re-read it
    every quarter of an hour forever. A miss costs one request, never
    correctness.
    """
    try:
        doc = json.loads((OUT / "latest.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, KeyError):
        return set()
    links = {item.get("link") for item in doc.get("items", [])}
    for item in doc.get("items", []):
        for cited in item.get("sources", []) or []:
            links.add(cited.get("link"))
    return {link for link in links if link}


def build(basis: Basis, refresh_tags: bool = False) -> dict:
    published_links_seen = published_links()
    tag_map: dict[str, int] = {}
    # The company names the exchange has printed for us, keyed for matching.
    # Grows every run that reads a filing title, at no cost.
    name_keys = company_match.load()
    print(f"── {len(name_keys)} company names to match against")
    items: list[dict] = []
    dropped: list[dict] = []
    live_sources = []

    for source in SOURCES:
        if not source["live"]:
            print(f"── {source['name']}: {source.get('note', 'not reachable')}")
            continue
        print(f"── {source['name']}")
        # Tags come from a WordPress taxonomy, so only a WordPress outlet can
        # answer for them. Asking a sitemap or a Next.js paper would spend the
        # whole per-company lookup on 404s and cache an empty map.
        if not tag_map and source["kind"] == "wp":
            tag_map = resolve_tags(source, refresh_tags)
            print(f"   {len(tag_map)} companies mapped to the outlet's own tags")
        fetched = {
            "wp": fetch_wp,
            "newsmap": fetch_newsmap,
            "rss": fetch_rss,
            # The only fetcher that needs to know what is already out there,
            # because it pays a request per story it has not dated yet.
            "listing": lambda s: fetch_listing(s, published_links_seen),
        }.get(source["kind"], lambda _s: [])(source)
        if not fetched:
            continue
        live_sources.append(source)
        for item in fetched:
            if leak := advice_leak(item["headline"]):
                dropped.append({"headline": item["headline"], "matched": leak})
                continue
            item["tickers"] = match_tickers(item, tag_map, name_keys)
            item.update(triage(item, basis))
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
        item["event_label_ar"] = news_context.EVENT_LABEL_AR.get(
            item["event"], ""
        )

        # What this story does to somebody holding EGX shares.
        #
        # Read from the story's SUBJECT first — the canal, the pound, the rate,
        # the wheat bill — which sidesteps the failure described above entirely.
        # A subject is what the headline is about, not a guess at what kind of
        # corporate event it was, so "gold rose" earns the gold mechanism no
        # matter how the event classifier read it. It also makes no claim about
        # any company, which is *safer* than the ticker path rather than
        # riskier.
        #
        # Failing a subject we fall back to the event glossary, and there the
        # old rule still stands untouched: only with a single ticker to
        # corroborate the classification. That restriction was written after a
        # gold story was published as "results", and nothing here makes the
        # free-text classifier any more trustworthy than it was.
        folded = normalise_ar(item["headline"])
        meaning, meaning_ar, subject = news_context.meaning_for(
            folded, item["event"]
        )
        corroborated = (
            len(item.get("tickers") or []) == 1 and item["event"] != "other"
        )
        if subject is not None or corroborated:
            item["meaning"] = meaning
            item["meaning_ar"] = meaning_ar
            if subject:
                item["subject"] = subject
        item.pop("link", None)
        item.pop("source", None)

    items.sort(key=lambda i: i["published"], reverse=True)

    return {
        # When this ran, which is not when the market it describes was
        # captured and not when the outlets filed. A feed rebuilt every
        # fifteen minutes needs to say which of the three each date is.
        "generated_at": datetime.datetime.now(datetime.UTC).isoformat(
            timespec="seconds"
        ),
        # The session every `evidence` block below is measured on, and the
        # capture it was read from. Between the close and the next scan that
        # is yesterday — which is correct, because yesterday's close IS the
        # last completed session — and this is where the document says so.
        "evidence_session": basis.session,
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


# How much past to keep. Long enough that a weekend does not empty the feed,
# short enough that the document stays a document: 120 headlines a day against
# a 500-item ceiling is about a fortnight of reading.
KEEP_DAYS = 14
KEEP_ITEMS = 500


def merge_with_published(fresh: list[dict], basis: Basis) -> list[dict]:
    """Today's headlines on top of the ones already out there."""
    published = OUT / "latest.json"
    existing: list[dict] = []
    if published.exists():
        try:
            existing = json.loads(published.read_text(encoding="utf-8"))["items"]
        except (json.JSONDecodeError, OSError, KeyError):
            existing = []

    by_id: dict[str, dict] = {}
    # Oldest first, so a fresh copy of the same story overwrites the stored one
    # rather than being discarded by it.
    for item in existing + fresh:
        if item.get("id"):
            by_id[item["id"]] = item

    cutoff = (
        datetime.datetime.now(datetime.UTC) - datetime.timedelta(days=KEEP_DAYS)
    ).isoformat()
    kept = [
        item for item in by_id.values()
        if (item.get("published") or "")[:19] >= cutoff[:19] or not item.get("published")
    ]
    dropped = len(by_id) - len(kept)
    if dropped > 0:
        print(f"   {dropped} headlines aged past {KEEP_DAYS} days")

    # Ranked here rather than in `build`, because this is the first point at
    # which the whole feed exists. Stored items come back through this function
    # and would otherwise keep whatever order — and whatever missing score —
    # they were written with, which is how half a ranked feed ends up unranked.
    #
    # A stored item is re-scored from scratch, so a change to the rules reaches
    # the archive on the next run instead of only the fresh headlines.
    #
    # And **re-measured** from scratch, which is the half that was missing. The
    # session numbers were written once, on the run that first saw the story,
    # and then travelled with it forever: a headline picked up at noon kept the
    # half-day volume the noon scan had, while Connecting the dots — which
    # divides the same two documents on every run — moved to the close two
    # hours later. That is how CFGH came to be 6.65× on News and 6.05× on
    # Crossings on 2 September, off one company on one day. Measuring here
    # means both feeds read the same capture at the same moment, because
    # neither of them stores an answer.
    for item in kept:
        item.setdefault("event", "other")
        item.update(triage(item, basis))
    rank(kept)
    return kept[:MAX_ITEMS]


def stamped(doc: dict) -> str:
    """`generated_at` on the clock, unless nothing else moved.

    This runs every fifteen minutes and most of those runs find the same
    headlines they found last time. A timestamp stamped unconditionally makes
    the file differ every run, which commits a no-op to main, bumps the
    resource's fingerprint in the manifest, and sends every installed phone to
    re-download a document identical to the one it holds — ninety-six times a
    day. `build_fixtures` learned this about `manifest.json`; the rule is the
    same here, and it is what keeps "the file changed" meaning something.
    """
    def body(d: dict) -> str:
        return json.dumps(
            {k: v for k, v in d.items() if k != "generated_at"},
            ensure_ascii=False,
            sort_keys=True,
        )

    try:
        previous = json.loads((OUT / "latest.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return doc["generated_at"]
    if body(previous) == body(doc) and previous.get("generated_at"):
        return previous["generated_at"]
    return doc["generated_at"]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--refresh-tags", action="store_true")
    # How many article pages to read for a picture in one run. The cache is
    # permanent, so this only ever costs anything for stories nobody has read
    # yet — a normal day brings a few dozen.
    parser.add_argument("--images", type=int, default=60)
    # How many top headlines to enrich with AI insights if missing.
    # Non-blocking and permanently cached in news_insights.json.
    parser.add_argument("--insights", type=int, default=15)
    args = parser.parse_args()

    # Read once, before a single headline is fetched, so every item in this
    # run — the fresh ones and the fortnight already published — is measured
    # against one session rather than against whenever it happened to arrive.
    basis = evidence_basis()
    if basis.session:
        print(f"── volume measured on the {basis.session['date']} close"
              f"{' (carried, session in progress)' if basis.carried is not None else ''}")
    else:
        print("── no closed session on file: no volume evidence this run")

    doc = build(basis, refresh_tags=args.refresh_tags)

    if not doc["items"]:
        print("no headlines fetched — leaving the published document alone")
        return 1

    # Merged with what is already published, so the feed has a past.
    #
    # Every build used to replace the file, which meant the app could only ever
    # show what the outlets had on their front page — three days, and a story
    # that scrolled off was gone for good. The exchange has a memory and so
    # should this: a reader who opens the app on Sunday should be able to read
    # back through Thursday.
    #
    # Deduplicated on the id the outlet gave it, and the *new* copy wins so a
    # headline that was later corrected shows the correction.
    doc["items"] = merge_with_published(doc["items"], basis)

    # Name every outlet the merged items cite, not only the ones that answered
    # this run.
    #
    # The document is cumulative: a story Al Borsa published yesterday stays in
    # it whether or not Al Borsa answers today. `sources` was built from the
    # outlets reached on this run alone, so a single timeout stripped the
    # attribution from every story that outlet had ever contributed — the app
    # resolves an item's outlet id against this list and shows nothing when it
    # is missing. On the run that caught it, Al Borsa and Hapi both timed out
    # and 114 stories lost their byline while staying on screen.
    # The picture the outlet put on the story, for the outlet that has no feed
    # to hand us one. Cached per article and read once, ever.
    news_images.fill(doc["items"], limit=args.images)

    # The economic insight for stories missing one. Cached per headline and read
    # top-first so the most visible stories gain insights first without delaying
    # publication.
    news_insights.enrich(doc["items"], limit=args.insights)

    cited = {a["id"] for item in doc["items"] for a in item.get("sources", [])}
    named = {s["id"] for s in doc["sources"]} | cited
    doc["sources"] = [
        {
            "id": s["id"],
            "name": s["name"],
            "name_ar": s["name_ar"],
            "home": s["home"],
        }
        for s in SOURCES
        if s["id"] in named
    ]

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

    doc["generated_at"] = stamped(doc)
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
