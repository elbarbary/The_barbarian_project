#!/usr/bin/env python3
"""Connecting the dots — where a company shows up more than once on one day.

Everything this app publishes is filed under the surface it came from. The
filings are in the filings feed, the headlines are in the news feed, and the
session numbers are on the company screen — so a reader who wants to know that
Mixed Oils filed with the exchange, appeared in the press, and traded three
times its normal volume, all on the same day, has to notice it themselves
across three screens.

This joins them. Nothing here is new information: every strand is a document
already published, and the sentence is the strands counted.

**It states what happened, never what it means for a price.** "MICH filed with
the exchange, was written about, and traded 3.45× its own normal volume" is
three published facts and the word "and". "MICH filed with the exchange, so it
is about to move" is a prediction, and this publisher holds no FRA licence
(§8). The templates below stop at the join, and `macro_types.directive` is run
over every sentence this file can produce before any of them ship.

A company needs **at least two different kinds** of strand to appear. One
filing on its own is the filings feed; one headline on its own is the news
feed. The dot only exists where the lines cross.

Usage:
    python3 scripts/build_connections_api.py [--check]
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import macro_types  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
API = REPO / "public" / "data" / "v1"
FIXTURES = REPO / "app" / "assets" / "fixtures"
OUT = API / "connections.json"

# How far back a strand can be and still be part of the same story.
#
# The exchange does not trade on Friday or Saturday, so a Sunday reader looking
# at a Thursday filing beside a Thursday headline is looking at one day's news.
# Wider than that and this becomes a list of everything a company has ever
# done, which is the company screen.
WINDOW_DAYS = 4

# The band a session has to clear to count as a strand of its own — the same
# 2× the rest of the app uses, published on every card that shows it.
UNUSUAL_VOLUME = 2.0

# Not every company, and not a leaderboard.
#
# Ordered by how many strands crossed and then by how unusual the session was,
# because that is the order the evidence supports. Capped so the section stays
# something a reader finishes.
MAX_ITEMS = 8


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def isolate(value: str) -> str:
    return f"⁨{value}⁩"


def sentence(ticker: str, kinds: set[str], ratio: float | None) -> tuple[str, str]:
    """What crossed, in both languages. Facts joined by "and", and nothing else."""
    parts_en: list[str] = []
    parts_ar: list[str] = []
    if "filing" in kinds:
        parts_en.append("filed with the exchange")
        parts_ar.append("أودعت إفصاحًا لدى البورصة")
    if "news" in kinds:
        parts_en.append("was written about in the press")
        parts_ar.append("كُتب عنها في الصحافة")
    if "session" in kinds and ratio:
        parts_en.append(
            f"traded {ratio:.2f}× its own normal volume"
        )
        parts_ar.append(
            f"تداولت {isolate(f'{ratio:.2f}×')} حجمها المعتاد"
        )

    def join_en(parts: list[str]) -> str:
        if len(parts) == 1:
            return parts[0]
        return f"{', '.join(parts[:-1])} and {parts[-1]}"

    def join_ar(parts: list[str]) -> str:
        # The waw attaches to the word it joins — "وتداولت", not "و تداولت".
        if len(parts) == 1:
            return parts[0]
        return f"{'، '.join(parts[:-1])} و{parts[-1]}"

    en = f"{ticker} {join_en(parts_en)}, within four days."
    ar = f"{isolate(ticker)} {join_ar(parts_ar)}، خلال أربعة أيام."
    return en, ar


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    print("── Connecting the dots")

    today = datetime.date.today()
    cutoff = (today - datetime.timedelta(days=WINDOW_DAYS)).isoformat()

    strands: dict[str, list[dict]] = {}

    # Filings, from the window document.
    filings = load(API / "disclosures" / "latest.json").get("items") or []
    for item in filings:
        if item.get("date", "") < cutoff:
            continue
        for ticker in item.get("tickers") or []:
            strands.setdefault(ticker, []).append(
                {
                    "kind": "filing",
                    "id": item["id"],
                    "date": item["date"],
                    "title": item.get("title_en") or item.get("title", ""),
                    "title_ar": item.get("title", ""),
                    "link": item.get("link", ""),
                }
            )

    # Headlines that name a listed company.
    stories = load(API / "news" / "latest.json").get("items") or []
    for item in stories:
        published = (item.get("published") or "")[:10]
        if published and published < cutoff:
            continue
        for ticker in item.get("tickers") or []:
            strands.setdefault(ticker, []).append(
                {
                    "kind": "news",
                    "id": item["id"],
                    "date": published,
                    "title": item.get("headline_en") or item.get("headline", ""),
                    "title_ar": item.get("headline", ""),
                    "link": (item.get("sources") or [{}])[0].get("link", ""),
                }
            )

    # And the session itself, where it was outside the company's own band.
    ratios: dict[str, float] = {}
    for ticker in list(strands):
        company = load(API / "companies" / f"{ticker}.json")
        market = company.get("market") or {}
        profile = company.get("profile") or {}
        volume, median = market.get("volume"), profile.get("median_volume_20d")
        if not volume or not median:
            continue
        ratio = volume / median
        ratios[ticker] = ratio
        if ratio >= UNUSUAL_VOLUME:
            strands[ticker].append(
                {
                    "kind": "session",
                    "id": f"session-{ticker}",
                    "date": market.get("date", ""),
                    "ratio": round(ratio, 2),
                    "change_percent": market.get("change_percent"),
                }
            )

    items: list[dict] = []
    for ticker, rows in strands.items():
        kinds = {r["kind"] for r in rows}
        # One kind is not a crossing — it is whichever feed it came from.
        if len(kinds) < 2:
            continue
        ratio = ratios.get(ticker)
        why, why_ar = sentence(ticker, kinds, ratio)
        leak = macro_types.directive(why)
        if leak:
            # Refused rather than published. The templates are fixed, so this
            # firing means somebody changed one — which is exactly when a
            # sentence stops being safe.
            print(f"   ! refused {ticker}: reads as an instruction ({leak!r})")
            continue
        rows.sort(key=lambda r: (r.get("date") or ""), reverse=True)
        items.append(
            {
                "ticker": ticker,
                "kinds": sorted(kinds),
                "why": why,
                "why_ar": why_ar,
                "ratio": round(ratio, 2) if ratio else None,
                "strands": rows,
            }
        )

    # Most kinds first, then most strands, then the most unusual session.
    # A company that filed twice and was written about is a denser crossing
    # than one that filed once, and the order should say so.
    items.sort(
        key=lambda i: (len(i["kinds"]), len(i["strands"]), i["ratio"] or 0),
        reverse=True,
    )
    items = items[:MAX_ITEMS]

    for item in items:
        print(f"   {item['ticker']:6} {'+'.join(item['kinds']):22} "
              f"{len(item['strands'])} strands")
    if not items:
        print("   nothing crossed in the window")

    doc = {
        "updated_at": datetime.datetime.now(datetime.UTC).isoformat(
            timespec="seconds"
        ),
        "window_days": WINDOW_DAYS,
        "threshold": UNUSUAL_VOLUME,
        "items": items,
    }
    if args.check:
        return 0

    body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    for directory in (API, FIXTURES):
        (directory / "connections.json").write_text(body, encoding="utf-8")
    print(f"\nwrote {OUT.relative_to(REPO)} ({len(items)} crossings)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
