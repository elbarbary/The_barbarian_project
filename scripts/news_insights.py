#!/usr/bin/env python3
"""AI-powered economic insights for Egyptian financial news headlines.

Law 95/1992 §8 Compliance:
--------------------------
Every generated sentence MUST strictly describe the objective economic or
market mechanism (e.g. impact on supply chain, dollar demand, free float,
operating costs, or corporate governance). It NEVER provides advice, never
speculates on future stock price directions, and never suggests buying or selling.
Every result is verified against `macro_types.directive()`.

Non-Blocking & Permanent Cache:
-------------------------------
Headlines are enriched newest/highest-priority first up to a per-run limit.
Results are cached permanently in `news_insights.json` so every headline is
only ever analyzed once. If Gemini is unreachable or rate-limited, the news
feed publishes immediately without delay.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys

import gemini
import macro_types
import news_context

STORE = pathlib.Path(__file__).resolve().parent / "news_insights.json"
REPO = pathlib.Path(__file__).resolve().parent.parent
PUBLISHED = REPO / "public" / "data" / "v1" / "news" / "latest.json"

PROMPT_TEMPLATE = """You are an Egyptian financial market analyst for an EGX data portal.
The publisher holds NO investment advisory license (Egyptian Capital Market Law 95/1992 §8).
Given this Egyptian news headline:
"{headline}"

Explain the objective economic or market mechanism in 1-2 concise factual sentences:
1. In English (meaning): what this means economically or operationally for the business/market.
2. In Arabic (meaning_ar): natural Arabic describing the exact same factual mechanism.

CRITICAL §8 COMPLIANCE RULES:
- Strictly factual mechanism only (explain operational, supply chain, balance sheet, or sector mechanism).
- NEVER give financial advice or opinion.
- NEVER use words like buy, sell, hold, invest, avoid, recommended, fair value, target price, or predict future share movements.
- Return ONLY valid JSON in this exact structure:
{{"meaning": "English mechanism here", "meaning_ar": "Arabic mechanism here"}}
"""


def load_store() -> dict[str, dict[str, str]]:
    """Load the permanent insights cache."""
    try:
        if STORE.exists():
            return json.loads(STORE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        pass
    return {}


def save_store(store: dict[str, dict[str, str]]) -> None:
    """Save the permanent insights cache."""
    STORE.write_text(
        json.dumps(store, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )


def extract_json(raw: str) -> dict | None:
    """Extract JSON object from model output."""
    raw = raw.strip()
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def generate_insight(headline: str) -> tuple[str, str] | None:
    """Call Gemini to generate objective insight for a headline."""
    if not gemini.available():
        return None

    prompt = PROMPT_TEMPLATE.format(headline=headline)
    try:
        response_text, _usage = gemini.generate(prompt)
    except Exception as err:
        print(f"   [news_insights] Gemini call skipped: {err}", file=sys.stderr)
        return None

    data = extract_json(response_text)
    if not data:
        return None

    meaning = str(data.get("meaning") or "").strip()
    meaning_ar = str(data.get("meaning_ar") or "").strip()

    if not meaning or not meaning_ar:
        return None

    # §8 verification: verify that neither language contains trade directives
    dir_en = macro_types.directive(meaning)
    dir_ar = macro_types.directive(meaning_ar)
    if dir_en or dir_ar:
        print(
            f"   [news_insights] Dropped non-compliant insight (EN: {dir_en}, AR: {dir_ar})",
            file=sys.stderr,
        )
        return None

    return meaning, meaning_ar


def key_for(headline: str) -> str:
    """Normalize headline to key the cache consistently."""
    return news_context.normalise_ar(headline).strip()


def enrich(items: list[dict], limit: int = 15) -> int:
    """Enrich news items missing insight, top/priority items first.

    Non-blocking: any failure or rate-limit returns gracefully, allowing the
    news pipeline to publish without delay.
    """
    store = load_store()
    gained = 0
    generated = 0

    # 1. Fill from cache first for all items
    for item in items:
        if item.get("meaning"):
            continue
        headline = item.get("headline") or ""
        k = key_for(headline)
        if k in store:
            cached = store[k]
            if cached.get("meaning"):
                item["meaning"] = cached["meaning"]
                item["meaning_ar"] = cached.get("meaning_ar") or ""
                gained += 1

    # 2. For remaining items without meaning, generate for top priority items
    if not gemini.available() or limit <= 0:
        if gained:
            print(f"   news insights: {gained} filled from cache ({len(store)} cached)")
        return gained

    for item in items:
        if generated >= limit:
            break
        if item.get("meaning"):
            continue

        headline = item.get("headline") or ""
        if not headline.strip():
            continue

        k = key_for(headline)
        if k in store:
            continue

        res = generate_insight(headline)
        if res:
            meaning, meaning_ar = res
            store[k] = {"meaning": meaning, "meaning_ar": meaning_ar}
            item["meaning"] = meaning
            item["meaning_ar"] = meaning_ar
            generated += 1
            gained += 1
        else:
            # Mark as attempted/empty to avoid endless loops on transient errors
            store[k] = {"meaning": "", "meaning_ar": ""}

    if generated > 0:
        save_store(store)

    print(f"   news insights: {gained} filled ({generated} generated, {len(store)} cached)")
    return gained


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill AI news insights")
    parser.add_argument("--limit", type=int, default=25, help="Max stories to generate for")
    args = parser.parse_args()

    if not PUBLISHED.exists():
        print(f"File not found: {PUBLISHED}")
        return 1

    data = json.loads(PUBLISHED.read_text(encoding="utf-8"))
    items = data.get("items", [])
    print(f"Loaded {len(items)} items from {PUBLISHED.name}")

    count = enrich(items, limit=args.limit)
    if count > 0:
        data["items"] = items
        PUBLISHED.write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        fixtures = REPO / "app" / "assets" / "fixtures" / "news" / "latest.json"
        if fixtures.parent.exists():
            fixtures.write_text(
                json.dumps(data, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
        print(f"Updated {PUBLISHED} and fixtures")
    return 0


if __name__ == "__main__":
    sys.exit(main())
