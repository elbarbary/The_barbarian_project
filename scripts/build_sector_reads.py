#!/usr/bin/env python3
"""A natural-language read of each sector's movement — grounded, vetted.

build_sectors.py computes, per sector, how many of its companies are rising or
falling on each metric. This adds one thing on top: a short paragraph that reads
that pattern as a whole, in plain English and Arabic, so a person sees the shape
of the sector before the counts.

    "Across Finance, more companies are widening their asset base than shrinking
     it, and returns are rising at most names. Profit sits mostly flat, so the
     movement is in the balance sheet more than the income line. Cash conversion
     is the split reading. Is the growing asset base turning into cash?"

THE GUARDS — a model writing about a named market segment
---------------------------------------------------------
A sector is not a security, so this is a step safer than the company read — but
the line is the same and it is enforced the same way. The model is handed only
the **computed counts**, told to describe them in words (most / more than half /
split / few), and every output is refused unless it passes:

1. **No advice.** The Arabic-and-English directive detector the briefs and the
   review reads use. One hit and the read is dropped.
2. **No quoted figures.** The read describes proportions, never counts — the
   numbers are on the movement bars. Any digit that is not a four-digit year is
   treated as a figure the model reached for, and the read is refused.
3. **Budget.** A hard dollar ceiling, counted from real usage.

Nothing here runs on a phone (§43). The output is a committed JSON store a
person can read before it reaches a reader, and build_sectors.py merges it in on
the next build.
"""

from __future__ import annotations

import argparse
import datetime
import glob
import json
import pathlib
import re
import time

import build_sectors
import gemini
import macro_types

REPO = pathlib.Path(__file__).resolve().parent.parent
SECTORS = REPO / "public" / "data" / "v1" / "sectors"
STORE = pathlib.Path(__file__).resolve().parent / "sector_reads.json"

# gemini-3.7-flash introductory rate, per million tokens.
IN_PER_M, OUT_PER_M = 0.75, 3.75

# Plain-language metric names for the prompt.
NAMES = {
    "profit": "net profit",
    "eps": "earnings per share",
    "assets": "total assets",
    "roe": "return on equity",
    "roa": "return on assets",
    "cash_conversion": "cash conversion (cash versus reported profit)",
    "debt_equity": "debt to equity",
    "pe": "price-to-earnings",
}

YEAR = re.compile(r"\b(19|20)\d{2}\b")
DIGITS = re.compile(r"\d")


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def facts(shard: dict) -> str:
    total = shard.get("companies", 0)
    lines = [f"The sector holds {total} companies with a reading."]
    for row in shard.get("movement", []):
        name = NAMES.get(row["key"], row["key"])
        lines.append(
            f"- {name}: {row['rising']} rising, {row['falling']} falling, "
            f"{row['flat']} flat"
            + (f", {row['unknown']} with too little history"
               if row.get("unknown") else "")
        )
    return "\n".join(lines)


def prompt_for(name: str, shard: dict) -> str:
    return f"""You are reading a computed dashboard for the {name} sector of the Egyptian Exchange. Each line is a metric and how many of the sector's companies are moving each way over their own reported history:

{facts(shard)}

Write a short reading of this sector's pattern as a whole. Return ONLY a JSON object with two keys:

"read": 3 to 4 sentences of English. Describe, in words, where most companies are moving together and where the sector is split. Name the metrics in words. When one line contradicts another (say assets rising but cash conversion split), point to it. End on a single question a reader could carry into the companies. Write in the third person about the sector; never address anyone and never use the words "should", "must" or "consider".

"read_ar": the same, in Arabic.

RULES, which override everything above:
- Describe the counts in WORDS ONLY — "most", "more than half", "about half", "a split", "a handful", "few". Do NOT quote any number, count, ratio or percentage; the figures are shown separately. You may mention a year.
- Never say whether the sector is good, bad, cheap, expensive, a buy, a sell, attractive or one to avoid.
- Never advise buying, selling or holding. Never address the reader, and never write "investors should" or any instruction.
- Never predict a price, a return or a future figure.
- This is a description of where a group of companies is moving, not a recommendation."""


def parse(raw: str) -> dict | None:
    text = (raw or "").strip()
    fence = re.search(r"```(?:json)?\s*(.+?)```", text, re.S)
    if fence:
        text = fence.group(1).strip()
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        return json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        return None


def vet(obj: dict) -> tuple[dict | None, str]:
    read = (obj.get("read") or "").strip()
    read_ar = (obj.get("read_ar") or "").strip()
    if len(read) < 40:
        return None, "no read"
    for field in (read, read_ar):
        if not field:
            continue
        if hit := macro_types.directive(field):
            return None, f"directive: {hit!r}"
        if DIGITS.search(YEAR.sub(" ", field)):
            return None, "quoted a figure"
    return {"read": read, "read_ar": read_ar}, ""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--budget", type=float, default=1.0)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only")
    ap.add_argument("--refresh", action="store_true")
    args = ap.parse_args()

    print("── Sector reads")
    if not gemini.available():
        print("   no Gemini transport — leaving the reads alone")
        return 0

    held = load(STORE)
    shards = {}
    for path in sorted(glob.glob(str(SECTORS / "*.json"))):
        shard = load(pathlib.Path(path))
        slug = shard.get("slug") or pathlib.Path(path).stem
        if len(shard.get("movement", [])) >= 2:
            shards[slug] = shard

    targets = [args.only] if args.only else sorted(shards)
    spent = 0.0
    done = refused = skipped = 0

    for slug in targets:
        shard = shards.get(slug)
        if not shard:
            continue
        if slug in held and not args.refresh and not args.only:
            skipped += 1
            continue
        if spent >= args.budget:
            print(f"   budget reached (${spent:.2f}) — stopping")
            break
        if args.limit and done >= args.limit:
            break

        text = prompt_for(shard.get("sector", slug), shard)
        raw = usage = None
        for attempt in range(3):
            try:
                raw, usage = gemini.generate(text)
                break
            except gemini.GeminiUnavailable as error:
                print(f"   {slug}: {error}")
                raw = None
                break
            except Exception as error:  # noqa: BLE001 — a transient socket or
                # SSL error is not a reason to abandon the rest.
                if attempt == 2:
                    print(f"   {slug}: gave up after retries — {error}",
                          flush=True)
                    raw = None
                else:
                    time.sleep(4 * (attempt + 1))
        if raw is None and usage is None:
            if not gemini.available():
                break
            refused += 1
            continue
        spent += (usage.get("prompt", 0) / 1e6) * IN_PER_M
        spent += (usage.get("candidates", 0) / 1e6) * OUT_PER_M

        obj = parse(raw)
        clean, why = vet(obj) if obj else (None, "no json")
        if not clean:
            print(f"   {slug}: refused — {why}", flush=True)
            refused += 1
            continue
        clean["generated"] = datetime.date.today().isoformat()
        # Which companies this paragraph is about. A read outlives its sector
        # otherwise: re-keying to the exchange's taxonomy changed every
        # membership, and the slugs that survived by coincidence went on
        # serving prose about the companies that had moved out. build_sectors
        # drops a read whose fingerprint no longer matches.
        clean["members"] = build_sectors.fingerprint(
            m.get("ticker") for m in shard.get("members") or [])
        held[slug] = clean
        done += 1

    STORE.write_text(json.dumps(held, ensure_ascii=False, indent=1),
                     encoding="utf-8")
    print(f"   {done} reads written, {refused} refused, {skipped} already held")
    print(f"   spent ${spent:.2f} of ${args.budget:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
