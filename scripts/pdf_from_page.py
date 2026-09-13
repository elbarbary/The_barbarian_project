#!/usr/bin/env python3
"""A disclosure link that answers with a page is pointing at the PDF, not refusing.

THE RULE
    When a filing's URL returns HTML rather than the attachment, that HTML
    carries one or more links to the actual PDF. Follow them.

It is how the exchange's own site is built: `egx.com.eg` answers a scripted
request for an attachment with the filing's page, and the page lists the
documents lodged with it. Every collector here has treated that as a refusal —
`download_mirror_pdf` raises "returned a non-PDF response" and DELETES the body
it was given, throwing away the links it was holding. Six of the twelve filings
the currency reader cannot reach are exactly this: not blocked, just answered
with the page that names the file.

WHAT IS NOT FOLLOWED, AND WHY
    A link inside a fetched page is content somebody else wrote, so it chooses
    where this pipeline points next. Only links on the page's own host are
    followed, and only a handful of them: a page offering forty PDFs is an
    index of the whole month, not a filing, and walking it would turn one
    refused download into forty requests at a host that just declined one.
"""

from __future__ import annotations

import html
import pathlib
import re
import urllib.parse

# A filing lodges a statement, an auditor's report, a board letter — a handful.
# Beyond this the page is an index rather than a document.
MAX_LINKS = 6

# Below this a "PDF" is an error page with a PDF header, which the exchange has
# served before. The same floor download_mirror_pdf uses.
MIN_BYTES = 10_000

_HREF = re.compile(r'<a\b[^>]*href=["\']([^"\']+)["\']', re.I | re.S)


def is_pdf(blob: bytes) -> bool:
    """A real PDF, not an error page wearing the extension."""
    return blob[:4] == b"%PDF" and len(blob) >= MIN_BYTES


def pdf_links(page: str, page_url: str) -> list[str]:
    """Every PDF this page points at: absolute, in document order, deduplicated.

    Same host only. The page is untrusted input — it is fetched from the
    internet — and a link is the one part of it that decides what gets
    requested next.
    """
    here = urllib.parse.urlparse(page_url)
    found: list[str] = []
    for href in _HREF.findall(page or ""):
        href = html.unescape(href).strip()
        if not href or href.startswith(("#", "mailto:", "javascript:")):
            continue
        url = urllib.parse.urljoin(page_url, href)
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            continue
        if (parsed.hostname or "").lower() != (here.hostname or "").lower():
            continue
        if not parsed.path.lower().endswith(".pdf"):
            continue
        if url not in found:
            found.append(url)
        if len(found) >= MAX_LINKS:
            break
    return found


def fetch(url: str, output: pathlib.Path, *, get) -> str:
    """Save the PDF `url` serves, or the one the page it serves points at.

    `get(url) -> bytes` is injected so the rule can be tested without a
    network and so each caller keeps its own headers, timeouts and retries.

    Returns the URL that actually produced the PDF — which is not always the
    one asked for, and the difference is worth recording.
    """
    blob = get(url)
    if is_pdf(blob):
        output.write_bytes(blob)
        return url

    page = blob.decode("utf-8", "replace")
    for link in pdf_links(page, url):
        if link == url:
            continue
        found = get(link)
        if is_pdf(found):
            output.write_bytes(found)
            return link
    # One hop only. A page that links to another page is a site map, and the
    # rule this implements is about a filing naming its own attachments.
    raise LookupError(f"{url} served a page naming no reachable PDF")
