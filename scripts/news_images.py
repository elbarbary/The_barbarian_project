#!/usr/bin/env python3
"""The picture an outlet put on a story, where its feed does not carry one.

Al Borsa and Hapi publish through WordPress and hand us the lead image with the
post. Arab Finance has no feed at all — its headlines are recovered from a
Google-News sitemap that carries `<loc>` and `<lastmod>` and nothing else — so
every one of its stories arrived without a picture.

That is 287 of 400 items. On a list where the other rows have a thumbnail it
does not read as "this outlet has no photo", it reads as a broken app: the text
column jumps width every third row.

Their article pages carry a perfectly good `og:image`, over plain HTTP with no
browser and no challenge. So we read it once per article and keep it forever —
**an article's picture does not change after it is published**, which is what
makes a permanent cache the right shape rather than a risk.

Cached misses count. A story whose page has no `og:image` is recorded as
having none, so the next run spends its budget on articles nobody has read yet
rather than on the same failures.

Usage is through `build_news_api`; the limit keeps one run's cost bounded.
"""

from __future__ import annotations

import html as html_lib
import json
import pathlib
import re
import urllib.parse
import urllib.request

STORE = pathlib.Path(__file__).resolve().parent / "news_images.json"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0 Safari/537.36"
)

# Both attribute orders, because a page is allowed to write them either way and
# only one of these two patterns is usually the one that matches.
OG = (
    re.compile(
        r'<meta[^>]+property=["\']og:image["\'][^>]*content=["\']([^"\']+)',
        re.I,
    ),
    re.compile(
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']',
        re.I,
    ),
)


def load() -> dict[str, str]:
    try:
        return json.loads(STORE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def save(store: dict[str, str]) -> None:
    STORE.write_text(
        json.dumps(store, ensure_ascii=False, indent=1, sort_keys=True),
        encoding="utf-8",
    )


def encode(url: str) -> str:
    """A URL safe to put in a request or hand to an image loader.

    Arab Finance's own image paths contain spaces — "chemicals 4
    reupload_Thumb.png" — and their article slugs are Arabic. Both have to be
    percent-encoded or the fetch raises and the phone silently shows nothing.
    """
    return urllib.parse.quote(url, safe=":/?&=#%")


def from_page(page: str) -> str | None:
    for pattern in OG:
        found = pattern.search(page)
        if found:
            url = html_lib.unescape(found.group(1)).strip()
            if url.startswith("http"):
                return url
    return None


def fetch(url: str, timeout: int = 20) -> str | None:
    request = urllib.request.Request(encode(url), headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read().decode("utf-8", "replace")
    except Exception:
        return None


def fill(items: list[dict], limit: int = 60) -> int:
    """Give image-less items the picture their article page carries.

    Returns how many gained one. Reads the cache for everything and the network
    only for articles never read before, newest first — the stories a reader is
    most likely to be looking at are the ones worth spending the budget on.
    """
    store = load()
    spent = 0
    gained = 0

    for item in items:
        if item.get("image"):
            continue
        link = next(
            (a.get("link") for a in item.get("sources") or [] if a.get("link")),
            None,
        )
        if not link:
            continue

        if link in store:
            found = store[link]
        elif spent < limit:
            spent += 1
            page = fetch(link)
            # A page that would not load is not the same as a page with no
            # picture, and recording it as one would be permanent. Left unread.
            if page is None:
                continue
            found = from_page(page) or ""
            store[link] = found
        else:
            continue

        if found:
            item["image"] = encode(found)
            gained += 1

    if spent:
        save(store)
    print(f"   images: {gained} filled · {spent} pages read · {len(store)} cached")
    return gained
