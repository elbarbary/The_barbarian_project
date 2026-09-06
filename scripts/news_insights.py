#!/usr/bin/env python3
"""AI-powered economic insights for Egyptian financial news headlines.

Law 95/1992 §8 Compliance:
--------------------------
Every generated sentence MUST strictly describe the objective economic or
market mechanism (e.g. impact on supply chain, dollar demand, free float,
operating costs, or corporate governance). It NEVER provides advice, never
speculates on future stock price directions, and never suggests buying or selling.
Every result is verified against `macro_types.directive()` for an instruction
and `macro_types.speculative()` for a forecast. The second check exists because
the first one cannot see a sentence like "…potentially opening new revenue
streams and export channels" — no trade verb, no valuation word, and a claim
about a named company's future all the same. It shipped, on this feed.

Non-Blocking Cache:
-------------------
Headlines are enriched newest/highest-priority first up to a per-run limit.
An insight is cached in `news_insights.json` and never asked for twice.

A REFUSAL IS NOT AN ANSWER ABOUT THE HEADLINE, only about one sample. The model
samples, and the same prompt returns different prose: four headlines were
refused in the first backfill, and re-asking one of them produced a clean
present-tense mechanism. So a refusal is counted, not final — `MAX_REFUSALS`
attempts across runs, then the headline is left alone so a story that genuinely
invites a forecast cannot be paid for forever.

A FAILURE TO REACH THE MODEL IS NOT AN ANSWER EITHER and is not cached at all:
the earlier code wrote an empty entry for it, and because both paths below skip
any headline already in the store, one rate-limited minute blacklisted those
headlines for good. If the model is unreachable the run stops asking and the
feed publishes anyway.
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
- Write in the PRESENT TENSE about what this arrangement IS and HOW it works.
- NEVER forecast an outcome. Do not write that anything will, could, may, or is
  expected to increase, improve, boost, support, reduce or open anything, and do
  not describe potential revenue, margins, growth or demand. "Localising
  production adds a second manufacturing line" is the register; "potentially
  opening new revenue streams" is a forecast and will be rejected.
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


# Why a headline came back without an insight. The three are not the same
# thing and must not be cached the same way: a REFUSED sentence is an answer
# about that headline and asking again returns it, while UNREACHABLE and
# UNUSABLE say nothing about the headline at all.
OK, REFUSED, UNREACHABLE, UNUSABLE = "ok", "refused", "unreachable", "unusable"

# How many times one headline may be refused before it is left alone. Three
# samples is enough to tell an unlucky draw from a story that cannot be
# described without forecasting — "Citigroup delays its rate-cut forecast" is
# the second kind more often than the first.
MAX_REFUSALS = 3


def generate_insight(headline: str) -> tuple[tuple[str, str] | None, str]:
    """The insight for a headline, and why there is none when there is none."""
    if not gemini.available():
        return None, UNREACHABLE

    prompt = PROMPT_TEMPLATE.format(headline=headline)
    try:
        response_text, _usage = gemini.generate(prompt)
    except Exception as err:
        print(f"   [news_insights] Gemini call skipped: {err}", file=sys.stderr)
        return None, UNREACHABLE

    data = extract_json(response_text)
    if not data:
        return None, UNUSABLE

    meaning = str(data.get("meaning") or "").strip()
    meaning_ar = str(data.get("meaning_ar") or "").strip()

    if not meaning or not meaning_ar:
        return None, UNUSABLE

    # §8, in both languages and on both counts: an instruction aimed at a
    # reader, and a forecast about a company this publisher may not make.
    for label, text in (("EN", meaning), ("AR", meaning_ar)):
        broke = macro_types.directive(text) or macro_types.speculative(text)
        if broke:
            print(
                f"   [news_insights] Refused ({label}: {broke!r}): {headline[:70]}",
                file=sys.stderr,
            )
            return None, REFUSED

    return (meaning, meaning_ar), OK


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
    changed = False

    # 0. Re-check what is already on the item.
    #
    # `merge_with_published` brings a story back from the last published
    # document carrying the meaning it was published WITH, and the fill below
    # skips any item that already has one — so a published insight was
    # immortal. Retiring the Iraq/agriculture forecast in the store did
    # nothing: it was still on the live feed on the next run, because it never
    # came from the store again. `build_news_api` already makes this argument
    # about scoring — "a stored item is re-scored from scratch, so a change to
    # the rules reaches the archive on the next run" — and the §8 rules are the
    # ones where it matters most. Drop both languages together; half an item is
    # worse than none.
    retired = 0
    for item in items:
        broke = next((macro_types.directive(item[f]) or macro_types.speculative(item[f])
                      for f in ("meaning", "meaning_ar")
                      if item.get(f) and (macro_types.directive(item[f])
                                          or macro_types.speculative(item[f]))), None)
        if broke:
            item.pop("meaning", None)
            item.pop("meaning_ar", None)
            retired += 1
    if retired:
        print(f"   news insights: {retired} published insight(s) withdrawn "
              f"— they do not pass the rules now in force")

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

    refused = 0
    for item in items:
        if generated >= limit:
            break
        if item.get("meaning"):
            continue

        headline = item.get("headline") or ""
        if not headline.strip():
            continue

        k = key_for(headline)
        # An insight is final; a refusal is only final once it has happened
        # MAX_REFUSALS times. `refused` was a bool before it was a count, and
        # True == 1, so an old entry simply has two attempts left.
        held = store.get(k)
        if held is not None and (held.get("meaning")
                                 or int(held.get("refused") or 0) >= MAX_REFUSALS):
            continue

        result, why = generate_insight(headline)
        if result:
            meaning, meaning_ar = result
            store[k] = {"meaning": meaning, "meaning_ar": meaning_ar}
            item["meaning"] = meaning
            item["meaning_ar"] = meaning_ar
            generated += 1
            gained += 1
            changed = True
            # Write as we go. A backfill is a few hundred paid calls over
            # twenty minutes, and a single write at the end means an
            # interruption at call 190 buys nothing at all.
            if generated % 10 == 0:
                save_store(store)
        elif why == REFUSED:
            # One sample broke a rule. Count it and let a later run try again;
            # only the count reaching MAX_REFUSALS retires the headline.
            attempts = int((store.get(k) or {}).get("refused") or 0) + 1
            store[k] = {"meaning": "", "meaning_ar": "", "refused": attempts}
            refused += 1
            changed = True
        elif why == UNREACHABLE:
            # Not an answer about anything. Marking it here is what blacklisted
            # headlines for good; stop asking this run and leave the store alone.
            print("   news insights: the model is unreachable; stopping this run",
                  file=sys.stderr)
            break
        # UNUSABLE: a malformed reply, also not an answer. Move on and let a
        # later run ask again.

    if changed:
        save_store(store)

    print(f"   news insights: {gained} filled ({generated} generated, "
          f"{refused} refused, {len(store)} cached)")
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
