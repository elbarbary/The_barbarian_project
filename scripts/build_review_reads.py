#!/usr/bin/env python3
"""A natural-language read of each company's metric pattern — grounded, vetted.

The review sheet computes every metric, its direction, and the deterministic
"probable cause" that points at the sibling row. This adds one thing on top:
a short paragraph that reads the whole pattern at once, in plain Arabic and
English, so a person sees the story before the grid.

    "Profit, earnings per share and both returns have climbed over the last
     three years, while cash conversion has fallen — the growth shows in the
     reported figures, and the question is how much of it is being collected.
     Debt has come down over the same period."

THE GUARDS, BECAUSE THIS IS A MODEL WRITING ABOUT A NAMED SECURITY
-----------------------------------------------------------------
This is the one place a model composes prose about a specific company's
prospects, which is exactly what §8 forbids the app from doing in its own
voice. So the model is handed only the **computed directions** — never asked to
judge, only to narrate what the arithmetic already found — and every output is
refused unless it passes three checks:

1. **No advice.** The same Arabic-and-English directive detector the briefs and
   the macro insights use. One hit and the read is dropped.
2. **No invented figures.** The read is told to describe directions, not quote
   numbers; the numbers are on the graph. Any digit that is not a four-digit
   year is treated as a figure the model reached for on its own, and the read
   is refused. The pattern is a closed set of facts, which is what makes that
   checkable — the same reasoning as the story's stake guard.
3. **Budget.** A hard dollar ceiling, counted from real usage.

Nothing here runs on a phone (§43). The output is a committed JSON store a
person can read before it reaches a reader, and `build_review.py` merges it in
on the next build.
"""

from __future__ import annotations

import argparse
import datetime
import glob
import json
import pathlib
import re
import time

import gemini
import macro_types

REPO = pathlib.Path(__file__).resolve().parent.parent
REVIEW = REPO / "public" / "data" / "v1" / "review"
DIRECTORY = REPO / "public" / "data" / "v1" / "companies.json"
STORE = pathlib.Path(__file__).resolve().parent / "review_reads.json"

# gemini-3.7-flash introductory rate, per million tokens.
IN_PER_M, OUT_PER_M = 0.75, 3.75

# Plain-language names for the prompt — the model should not have to know that
# `cash_conversion` is a key.
NAMES = {
    "pe": "price-to-earnings",
    "pb": "price-to-book",
    "dividend_yield": "dividend yield",
    "profit": "net profit",
    "eps": "earnings per share",
    "assets": "total assets",
    "cash_conversion": "cash conversion (cash versus reported profit)",
    "roe": "return on equity",
    "roa": "return on assets",
    "debt_equity": "debt to equity",
}

# A four-digit year is allowed in the prose; any other run of digits is a
# figure the model produced on its own, and the read is refused for it.
YEAR = re.compile(r"\b(19|20)\d{2}\b")
DIGITS = re.compile(r"\d")


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def facts(doc: dict) -> str:
    lines = []
    for metric in doc.get("metrics", []):
        name = NAMES.get(metric["key"], metric["key"])
        direction = metric.get("direction", "unknown")
        peer = metric.get("peer")
        bit = f"- {name}: {direction}"
        if peer:
            bit += f", {peer} its sector"
        lines.append(bit)
    pattern = doc.get("pattern") or {}
    if pattern:
        lines.append(
            f"- across the readable metrics, {len(pattern.get('improving', []))} "
            f"are improving and {len(pattern.get('deteriorating', []))} "
            f"deteriorating"
        )
    return "\n".join(lines)


def prompt_for(name: str, doc: dict) -> str:
    return f"""You are reading a computed financial dashboard for {name}, a company listed on the Egyptian Exchange. Each line is a metric and the direction it has moved over this company's own reported history:

{facts(doc)}

Write a short reading of this pattern as a whole. Return ONLY a JSON object with two keys:

"read": 2 to 3 sentences of English. Describe what the directions say together — where they agree, and where they contradict each other. When they contradict, name the one metric whose row settles the question. Name the metrics in words. Write in the third person about the company; never address anyone and never use the words "should", "must" or "consider".

"read_ar": the same, in Arabic.

RULES, which override everything above:
- Describe ONLY the directions given. Do not quote any number, ratio, percentage or figure — those are shown separately. You may mention a year.
- Never say whether the company is good, bad, cheap, expensive, a buy, a sell, promising or risky.
- Never advise buying, selling or holding. Never address the reader, and never write "readers should", "you should", "one should" or any instruction.
- Never predict a price, a return or a future figure.
- If the metrics broadly agree, say so plainly. If they contradict, say what the contradiction is and which metric to read next to resolve it.
- This is a description of a pattern, not a recommendation."""


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
    if len(read) < 30:
        return None, "no read"
    for field in (read, read_ar):
        if hit := macro_types.directive(field):
            return None, f"directive: {hit!r}"
        # Any digit that is not part of a four-digit year is a figure the model
        # invented; the numbers belong on the graph, not in the prose.
        stripped = YEAR.sub(" ", field)
        if DIGITS.search(stripped):
            return None, "quoted a figure"
    return {"read": read, "read_ar": read_ar}, ""


def directory() -> dict[str, str]:
    try:
        doc = json.loads(DIRECTORY.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return {
        c["ticker"]: c.get("name_en") or c["ticker"]
        for c in doc.get("companies", []) if c.get("ticker")
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--budget", type=float, default=20.0)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only")
    ap.add_argument("--refresh", action="store_true")
    args = ap.parse_args()

    print("── Review reads")
    if not gemini.available():
        print("   no Gemini transport — leaving the reads alone")
        return 0

    held = load(STORE)
    names = directory()
    docs = {}
    for path in sorted(glob.glob(str(REVIEW / "*.json"))):
        doc = load(pathlib.Path(path))
        ticker = doc.get("ticker") or pathlib.Path(path).stem
        # A read needs a pattern to read; a company with one lone metric has
        # nothing to narrate.
        if len([m for m in doc.get("metrics", [])
                if m.get("direction") in ("rising", "falling")]) >= 2:
            docs[ticker] = doc

    targets = [args.only] if args.only else sorted(docs)
    spent = 0.0
    done = refused = skipped = 0

    for ticker in targets:
        doc = docs.get(ticker)
        if not doc:
            continue
        if ticker in held and not args.refresh and not args.only:
            skipped += 1
            continue
        if spent >= args.budget:
            print(f"   budget reached (${spent:.2f}) — stopping")
            break
        if args.limit and done >= args.limit:
            break

        text = prompt_for(names.get(ticker, ticker), doc)
        raw = usage = None
        for attempt in range(3):
            try:
                raw, usage = gemini.generate(text)
                break
            except gemini.GeminiUnavailable as error:
                print(f"   {ticker}: {error}")
                raw = None
                break
            except Exception as error:  # noqa: BLE001 — a transient socket or
                # SSL error is not a reason to abandon 200 remaining companies;
                # one dropped connection ended the first run at 34.
                if attempt == 2:
                    print(f"   {ticker}: gave up after retries — {error}",
                          flush=True)
                    raw = None
                else:
                    time.sleep(4 * (attempt + 1))
        if raw is None and usage is None:
            # Terminal GeminiUnavailable stops the run; a retry-exhausted
            # transient skips this one and moves on.
            if not gemini.available():
                break
            refused += 1
            continue
        spent += (usage.get("prompt", 0) / 1e6) * IN_PER_M
        spent += (usage.get("candidates", 0) / 1e6) * OUT_PER_M

        obj = parse(raw)
        clean, why = vet(obj) if obj else (None, "no json")
        if not clean:
            print(f"   {ticker}: refused — {why}", flush=True)
            refused += 1
            continue
        clean["generated"] = datetime.date.today().isoformat()
        held[ticker] = clean
        done += 1
        if done % 20 == 0:
            print(f"   {done} written, {refused} refused, ${spent:.2f}", flush=True)
            STORE.write_text(json.dumps(held, ensure_ascii=False, indent=1),
                             encoding="utf-8")

    STORE.write_text(json.dumps(held, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"   {done} reads written, {refused} refused, {skipped} already held")
    print(f"   spent ${spent:.2f} of ${args.budget:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
