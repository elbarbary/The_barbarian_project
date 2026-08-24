#!/usr/bin/env python3
"""Every filing a company has ever lodged, on that company's own page.

The company screen used to show ten filings, because the feed it was built
from could only ever see the newest page of the exchange's news list. The
harvest in `data-source/egx-beta/filings` holds **152,079 ticker-tagged
filings across 451 companies**, back to 2010 — COMI alone has 701 — and that
record is the point of having harvested it.

Two documents per company, because "show me this company" and "show me
everything it has ever filed" are different requests and only one of them
should cost a phone a large download:

  * `documents/<TICKER>.json` — the most recent [RECENT] filings, plus the
    total, so the page can say "50 of 701" without fetching 701.
  * `documents/<TICKER>-all.json` — the complete record, fetched only when a
    reader asks for it.

Both carry the same rows, so nothing renders differently between them.

**Classification is by rule only.** `filing_types.classify_rules` reads the
title and returns a type or nothing; there is no model in this path. Typing
152,079 filings through one would cost real money to tell a reader that a
filing titled "بيان بخصوص نموذج إفصاح" is a disclosure form, which the rule
already knows. A filing the rules cannot place keeps its title and says
nothing about its type, which is honest and free.
"""

from __future__ import annotations

import argparse
import collections
import glob
import gzip
import json
import pathlib
import re

import filing_types as ft

REPO = pathlib.Path(__file__).resolve().parent.parent
FILINGS = REPO / "data-source" / "egx-beta" / "filings"
OUT = REPO / "public" / "data" / "v1" / "disclosures" / "documents"
FIXTURES = REPO / "app" / "assets" / "fixtures" / "disclosures" / "documents"

TICKER = re.compile(r"\(([A-Z0-9]{2,8})\.CA\)")
PDF = re.compile(r'href="([^"]+\.(?:pdf|xlsx?|docx?))"', re.I)

# What the company page shows without asking for more. Fifty is about a year
# for a busy issuer and a decade for a quiet one, which is the right shape: the
# page is a recent record, and the archive is behind one tap.
RECENT = 50

# Only the companies the app actually lists. The harvest carries tickers for
# funds, bonds and delisted names the directory has never heard of, and a
# document for a company that cannot be opened is bytes nobody fetches.
DIRECTORY = REPO / "public" / "data" / "v1" / "companies.json"


def known_tickers() -> set[str]:
    try:
        doc = json.loads(DIRECTORY.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return set()
    return {c.get("ticker") for c in doc.get("companies", []) if c.get("ticker")}


def row(item: dict) -> dict:
    """One filing, trimmed to what a list row and a tap need.

    The bodies stay in the harvest. A company page showing fifty filings does
    not need fifty filing bodies, and shipping them would multiply the download
    by twenty for text no row displays.
    """
    title = (item.get("headingArabic") or item.get("heading") or "").strip()
    english = (item.get("heading") or "").strip()
    event = ft.classify_rules(title) or ft.classify_rules(english)
    body = item.get("content") or ""
    attachments = [
        ("https://www.egx.com.eg" + href) if href.startswith("/") else href
        for href in PDF.findall(body)
    ]
    out = {
        "id": f"egx-{item['code']}",
        "date": (item.get("dateStamp") or "")[:10],
        "title": title,
        "link": f"https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID={item['code']}",
    }
    # English only when it is genuinely a different string — many filings carry
    # the same Arabic in both fields, and storing it twice is pure weight.
    if english and english != title:
        out["title_en"] = english
    if event:
        out["event"] = event
        out["event_label"] = ft.label(event)
        out["event_label_ar"] = ft.label_ar(event)
        out["meaning"] = ft.meaning(event)
        out["meaning_ar"] = ft.meaning_ar(event)
    if attachments:
        out["attachments"] = attachments[:6]
    if section := (item.get("section") or "").strip():
        out["section"] = section
    return out


def collect() -> dict[str, list[dict]]:
    known = known_tickers()
    by_ticker: dict[str, dict[str, dict]] = collections.defaultdict(dict)
    for path in sorted(glob.glob(str(FILINGS / "*.json.gz"))):
        for item in json.loads(
            gzip.decompress(pathlib.Path(path).read_bytes())
        ).get("items", []):
            heading = item.get("heading") or ""
            arabic = item.get("headingArabic") or ""
            tickers = set(TICKER.findall(heading)) | set(TICKER.findall(arabic))
            for ticker in tickers:
                if known and ticker not in known:
                    continue
                # Keyed by code so a filing naming two companies lands on both
                # pages once each, and a re-harvest cannot duplicate it.
                by_ticker[ticker][item["code"]] = item
    return {
        ticker: sorted(
            (row(i) for i in items.values()),
            key=lambda r: (r["date"], r["id"]),
            reverse=True,
        )
        for ticker, items in by_ticker.items()
    }


def write(ticker: str, rows: list[dict], *, dry_run: bool) -> tuple[int, int]:
    recent = {"ticker": ticker, "total": len(rows), "items": rows[:RECENT]}
    # Everything, on the founder's call: the complete record carries the same
    # rows as the page, explanations included. It costs about twenty megabytes
    # more across the whole exchange and it means the archive a reader opens is
    # not a thinner thing than the page they opened it from.
    full = {"ticker": ticker, "total": len(rows), "items": rows}
    small = json.dumps(recent, ensure_ascii=False, separators=(",", ":"))
    large = json.dumps(full, ensure_ascii=False, separators=(",", ":"))
    if not dry_run:
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / f"{ticker}.json").write_text(small, encoding="utf-8")
        # The complete record is published but **not bundled**: it is the one
        # document a reader asks for by name, and putting 701 filings in the
        # app binary would grow every install for a page most never open.
        if len(rows) > RECENT:
            (OUT / f"{ticker}-all.json").write_text(large, encoding="utf-8")
        if FIXTURES.exists():
            (FIXTURES / f"{ticker}.json").write_text(small, encoding="utf-8")
    return len(small), len(large)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    print("── Company filings")
    by_ticker = collect()
    if not by_ticker:
        print("   no harvest on disk — leaving the published documents alone")
        return 0

    small_total = large_total = 0
    for ticker, rows in sorted(by_ticker.items()):
        s, l = write(ticker, rows, dry_run=args.dry_run)
        small_total += s
        large_total += l if len(rows) > RECENT else 0

    counts = sorted((len(v) for v in by_ticker.values()), reverse=True)
    verb = "would write" if args.dry_run else "wrote"
    print(f"   {sum(counts)} filings across {len(by_ticker)} companies")
    print(f"   busiest: {counts[0]}, median: {counts[len(counts) // 2]}")
    print(f"   {verb} {len(by_ticker)} page documents ({small_total // 1024} KB "
          f"total) and {sum(1 for c in counts if c > RECENT)} full records "
          f"({large_total // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
