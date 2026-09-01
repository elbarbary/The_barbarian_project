#!/usr/bin/env python3
"""Harvest official FRA news, rules and enforcement records from WordPress.

The FRA site exposes its public post types through the standard WordPress REST
API. This collector keeps the original objects, a normalized searchable ledger
and every PDF link. It does not infer that a general FRA decision applies to a
listed issuer unless the document actually names that issuer.
"""

from __future__ import annotations

import argparse
import datetime as dt
import gzip
import hashlib
import html
import json
import pathlib
import re
import subprocess
import urllib.parse


REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "data-source" / "official" / "fra"
BASE = "https://fra.gov.eg/wp-json/wp/v2"
TYPES = (
    "fra_news",
    "regulations",
    "reg_procedure_compan",
    "companies_decrees",
    "admin_actions",
    "criminal_procedures",
    "f_criminal_procedure",
)
TAG = re.compile(r"<[^>]+>")
PDF = re.compile(r'https?://[^"\'\s<>]+\.pdf(?:\?[^"\'\s<>]*)?', re.I)


def text(value: str) -> str:
    return " ".join(html.unescape(TAG.sub(" ", value or "")).split())


def fetch_json(url: str, timeout: int = 60) -> list | dict:
    result = subprocess.run(
        ["curl", "--fail", "--location", "--max-time", str(timeout),
         "--silent", "--show-error", url],
        capture_output=True, timeout=timeout + 5,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode("utf-8", "replace")[:200])
    return json.loads(result.stdout)


def endpoint(rest_base: str, *, after: str, page: int, per_page: int = 100) -> str:
    query = urllib.parse.urlencode({
        "after": after,
        "page": page,
        "per_page": per_page,
        "orderby": "date",
        "order": "asc",
        "_fields": "id,date,modified,link,slug,title,content,excerpt",
    })
    return f"{BASE}/{rest_base}?{query}"


def normalize(row: dict, rest_base: str) -> dict:
    title = text((row.get("title") or {}).get("rendered") or "")
    content = (row.get("content") or {}).get("rendered") or ""
    excerpt = (row.get("excerpt") or {}).get("rendered") or ""
    urls = sorted(set(PDF.findall(html.unescape(content))))
    return {
        "id": str(row.get("id")),
        "type": rest_base,
        "publishedAt": row.get("date"),
        "modifiedAt": row.get("modified"),
        "title": title,
        "summary": text(excerpt),
        "bodyText": text(content),
        "link": row.get("link"),
        "attachments": urls,
        "source": "FRA WordPress REST API",
    }


def harvest(*, after: str, max_pages: int = 5) -> dict:
    raw: dict[str, list] = {}
    ledger: list[dict] = []
    failures: dict[str, str] = {}
    for rest_base in TYPES:
        held: dict[str, dict] = {}
        for page in range(1, max_pages + 1):
            try:
                rows = fetch_json(endpoint(rest_base, after=after, page=page))
            except Exception as error:
                # WordPress returns HTTP 400 when the requested page is past
                # the last page; that is a normal terminator after page one.
                if page == 1:
                    failures[rest_base] = str(error)[:200]
                break
            if not isinstance(rows, list) or not rows:
                break
            for row in rows:
                held[str(row.get("id"))] = row
            if len(rows) < 100:
                break
        raw[rest_base] = sorted(held.values(), key=lambda row: (row.get("date") or "", row.get("id") or 0))
        ledger.extend(normalize(row, rest_base) for row in raw[rest_base])
    ledger.sort(key=lambda row: (row.get("publishedAt") or "", row["type"], row["id"]))
    generated = dt.datetime.now(dt.timezone.utc).isoformat()
    return {
        "schemaVersion": 1,
        "fetchedAt": generated,
        "after": after,
        "source": BASE,
        "items": ledger,
        "failures": failures,
        "coverage": {
            "items": len(ledger),
            "byType": {name: len(rows) for name, rows in raw.items()},
            "attachments": sum(len(row["attachments"]) for row in ledger),
        },
        "raw": raw,
    }


def merged_with_held(document: dict) -> dict:
    """This run's items UNION the ledger already on disk.

    The ledger was overwritten with whatever one run happened to fetch, and
    `--after` takes a cursor. So a single incremental invocation replaced a
    555-item year-to-date ledger with the nought published since yesterday
    morning — which is what `fra-ledger.json` held: 553 bytes beside a 1.6 MB
    raw capture, and `source-health` reporting the regulator as "missing" while
    the harvest was working perfectly.

    A record of what a regulator has published must not be able to shrink. The
    same item fetched twice is keyed by (type, id) and the newer copy wins, so
    an edited notice updates rather than duplicating.
    """
    held = {}
    try:
        previous = json.loads((OUT / "fra-ledger.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        previous = {}
    for row in previous.get("items") or []:
        held[(row.get("type"), str(row.get("id")))] = row
    fresh = 0
    for row in document.get("items") or []:
        key = (row.get("type"), str(row.get("id")))
        if key not in held:
            fresh += 1
        held[key] = row

    items = sorted(held.values(),
                   key=lambda row: (row.get("publishedAt") or "",
                                    row.get("type") or "", str(row.get("id"))))
    by_type: dict[str, int] = {name: 0 for name in TYPES}
    for row in items:
        by_type[row.get("type")] = by_type.get(row.get("type"), 0) + 1

    document["items"] = items
    document["newThisRun"] = fresh
    # The earliest publication the ledger can account for, which is the honest
    # answer to "how far back does this go" once runs accumulate.
    document["coversFrom"] = min((row.get("publishedAt") or "" for row in items),
                                 default=None) or None
    document["coverage"] = {
        "items": len(items),
        "byType": by_type,
        "attachments": sum(len(row.get("attachments") or []) for row in items),
    }
    return document


# How many raw captures to keep beside the ledger.
#
# A full run stores ~300 KB compressed, so a daily schedule adds 110 MB of
# git history a year — for files nothing reads. The ledger is cumulative now
# and carries `rawSha256`, so the captures are a forensic trail rather than the
# record itself, and a fortnight of them is enough to answer "what did the
# regulator's API actually return that day".
KEEP_RAW = 14


def prune_raw() -> int:
    """Drop all but the newest KEEP_RAW captures. Returns how many went."""
    captures = sorted(OUT.glob("fra-raw-*.json.gz"))
    stale = captures[:-KEEP_RAW] if len(captures) > KEEP_RAW else []
    for path in stale:
        path.unlink()
    return len(stale)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--after", default=f"{dt.date.today().year}-01-01T00:00:00")
    parser.add_argument("--max-pages", type=int, default=5)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    document = harvest(after=args.after, max_pages=max(1, args.max_pages))
    print(json.dumps(document["coverage"] | {"failures": document["failures"]},
                     ensure_ascii=False, indent=2))
    if args.check:
        return 0
    OUT.mkdir(parents=True, exist_ok=True)
    document = merged_with_held(document)
    raw = document.pop("raw")
    raw_bytes = json.dumps(raw, ensure_ascii=False, separators=(",", ":")).encode()
    document["rawSha256"] = hashlib.sha256(raw_bytes).hexdigest()
    # Compact, like every other published document in this repo. The ledger is
    # cumulative and rewritten daily, and `indent=2` was costing 700 KB of
    # whitespace per version of a file whose content is 555 items of Arabic
    # body text.
    (OUT / "fra-ledger.json").write_text(
        json.dumps(document, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8"
    )
    stamp = dt.datetime.fromisoformat(document["fetchedAt"]).strftime("%Y%m%dT%H%M%SZ")
    (OUT / f"fra-raw-{stamp}.json.gz").write_bytes(gzip.compress(raw_bytes, mtime=0))
    prune_raw()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
