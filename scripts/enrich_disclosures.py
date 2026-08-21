#!/usr/bin/env python3
"""Attach the filed PDF to every disclosure we hold.

Each disclosure links a detail page, and that page carries the anchors to the
documents the company actually lodged — the signed statement, the auditor's
report, the board minute. `egx_filing_detail.parse_detail` has read those
anchors all along; nothing was putting them in the published document, so the
app could tell a reader that Palm Hills filed something without being able to
show them the thing itself.

**Read once, kept forever.** A filing's attachments do not change after it is
filed, so an item that has been read is never read again — the flag is stored
on the item and the item lives in the archive. That matters because this host
rate-limits hard and stops answering mid-run; the job takes what it gets and
asks for the rest next time.

**Never parallel.** One browser, one page at a time, spaced. This exchange
blocked us once for fanning three agents at it, and the archive is worth more
than the hour saved.

Usage:
    python3 scripts/enrich_disclosures.py [--limit 20] [--spacing 6]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_disclosures_api as disclosures  # noqa: E402
from build_financials_api import _fetch_details  # noqa: E402
from egx_filing_detail import parse_detail  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent


def load() -> dict[str, dict]:
    """Everything held, archive and window alike, by id."""
    items = disclosures.archive_read()
    latest = disclosures.OUT / "latest.json"
    if latest.exists():
        try:
            for item in json.loads(latest.read_text(encoding="utf-8"))["items"]:
                items.setdefault(item["id"], item)
        except (OSError, json.JSONDecodeError, KeyError):
            pass
    return items


def pending(items: dict[str, dict], limit: int) -> list[dict]:
    """Filings whose detail page has not been read, newest first.

    Newest first because a reader is likeliest to open today's filing, and
    because the run will be cut off partway through — so the requests that do
    land should be the ones that matter most.
    """
    unread = [i for i in items.values() if not i.get("detail_read")]
    unread.sort(key=lambda i: (i.get("date") or "", i["id"]), reverse=True)
    return unread[:limit]


def news_id(item: dict) -> str:
    return item["id"].removeprefix("egx-")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument(
        "--spacing", type=int, default=6, help="seconds between detail pages"
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print("── Filed documents")
    items = load()
    if not items:
        print("   nothing held yet — run build_disclosures_api.py first")
        return 1

    read = sum(1 for i in items.values() if i.get("detail_read"))
    have = sum(1 for i in items.values() if i.get("attachments"))
    print(f"   {len(items)} filings held · {read} read · {have} carry a document")

    queue = pending(items, args.limit)
    if not queue:
        print("   every filing has been read")
        return 0
    print(f"   reading {len(queue)}, {args.spacing}s apart")
    if args.dry_run:
        for item in queue:
            print(f"     {item['id']}  {item['title'][:64]}")
        return 0

    pages = _fetch_details([news_id(i) for i in queue], args.spacing)
    if not pages:
        print("   the host answered nothing this run — nothing recorded")
        return 1

    found = 0
    for item in queue:
        page = pages.get(news_id(item))
        if not page:
            continue
        detail = parse_detail(page)
        if detail is None:
            # A page that rendered but is not a filing is the WAF, not an empty
            # filing. Left unread so the next run tries again rather than
            # recording a permanent "no documents" for a filing that has some.
            continue
        # Read, and recorded as read even when it carries nothing — a filing
        # with no attachment is a fact about that filing, and re-asking spends
        # a request the rate limit will not give back.
        item["detail_read"] = True
        if detail["attachments"]:
            item["attachments"] = detail["attachments"]
            found += 1

    print(f"   read {sum(1 for i in queue if i.get('detail_read'))}, "
          f"{found} carry a filed document")

    everything = sorted(
        items.values(), key=lambda i: (i["date"], i["id"]), reverse=True
    )
    disclosures.archive_write(everything)

    # The window document too, so the app sees the documents without waiting
    # for the next full build.
    latest = disclosures.OUT / "latest.json"
    if latest.exists():
        doc = json.loads(latest.read_text(encoding="utf-8"))
        by_id = {i["id"]: i for i in everything}
        doc["items"] = [by_id.get(i["id"], i) for i in doc["items"]]
        body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
        for directory in (disclosures.OUT, disclosures.FIXTURES):
            (directory / "latest.json").write_text(body, encoding="utf-8")
    print("   written to the archive and the window")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
