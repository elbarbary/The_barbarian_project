#!/usr/bin/env python3
"""A plain-language read of what each company is doing with its borrowings.

`build_debt.py` computes the whole picture — how much is owed, when it falls
due, what it costs against what the business earns, which way it moved, and
which shape the cash flows make. That is a grid. This adds the sentence a
person actually wanted:

    "Borrowings came down over the year, and the repayment was made out of the
     cash the business generated rather than by raising more. Most of what is
     left falls due beyond a year."

THE GUARDS, BECAUSE THIS IS A MODEL WRITING ABOUT A NAMED SECURITY
-----------------------------------------------------------------
Debt is the subject where prose most easily turns into a credit opinion, and
§8 forbids this app from offering one. So the model is never shown a figure and
never asked whether the position is sound — only handed the directions the
arithmetic already found, and told to say them in a sentence. Every output is
refused unless it passes:

1. **No advice.** The same Arabic-and-English directive detector the briefs,
   the macro insights and the review reads use.
2. **No invented figures.** The prompt carries no numbers at all, so any digit
   in the answer that is not a four-digit year is something the model reached
   for on its own, and the read is dropped.
3. **No verdict words.** A closed list — risky, safe, healthy, unsustainable,
   overleveraged, comfortable and their Arabic equivalents — because those are
   the words that turn a description into the credit rating this publisher is
   not licensed to issue.
4. **Budget.** A hard dollar ceiling, counted from real usage.

Nothing here runs on a phone (§43). The output is a committed JSON store a
person can read before it reaches a reader, and `build_debt.py` merges it in on
the next build, keyed to the period it described — so a new filing drops the
old sentence rather than carrying it onto figures it never saw.

Usage:
    python3 scripts/build_debt_reads.py [--limit N] [--budget 2.00] [--refresh]
"""

from __future__ import annotations

import argparse
import glob
import json
import pathlib
import re
import time

import gemini
import macro_types

REPO = pathlib.Path(__file__).resolve().parent.parent
COMPANIES = REPO / "public" / "data" / "v1" / "companies"
STORE = pathlib.Path(__file__).resolve().parent / "debt_reads.json"

YEAR = re.compile(r"\b(19|20)\d{2}\b")
DIGITS = re.compile(r"\d")

# Words that state a verdict on a company's solvency. Describing what the
# filings show is the job; grading it is the licence this publisher lacks.
VERDICT = re.compile(
    r"\b(risky|risk[ie]r|safe|safer|healthy|unhealthy|strong|weak|sound|"
    r"unsustainable|sustainable|overleveraged|over-leveraged|comfortable|"
    r"prudent|reckless|distress|solvent|insolvent|dangerous|worrying|"
    r"attractive|cheap|expensive)\b",
    re.I,
)
# Arabic needs whole-word matching and unambiguous terms, because a bare
# substring test refuses perfectly good sentences: مبالغ is the ordinary plural
# of "amount", مخاطر contains خطر, تسليم contains سليم, and الصحية contains صحي
# — the last of which would have refused every healthcare company. So each term
# is matched only when no Arabic letter runs into it on either side, and the
# list carries phrases that can only be a verdict.
VERDICT_AR = re.compile(
    r"(?<![ء-ي])(?:"
    r"مبالغ\s+فيه|غير\s+مستدام|غير\s+آمن|محفوف\s+بالمخاطر|"
    r"خطير|خطيرة|متعثر|متعثرة|مقلق|مقلقة|جذاب|جذابة|رخيص|رخيصة|"
    r"مرتفع\s+المخاطر|ينبغي|يجب\s+على\s+المستثمر"
    r")(?![ء-ي])"
)

# What each computed pattern means in words the model may use. Handing over the
# vocabulary is what keeps the sentence inside the arithmetic.
PATTERNS = {
    "raised_and_invested":
        "it raised money during the period and spent on assets at the same time",
    "raised_while_operations_consumed_cash":
        "it raised money during the period while its operations were using cash "
        "rather than producing it",
    "raised_and_held":
        "it raised money during the period without spending it on assets",
    "repaid_from_operating_cash":
        "it repaid or returned money during the period, and its operations "
        "produced cash over the same period",
    "repaid_without_operating_cash":
        "it repaid or returned money during the period while its operations "
        "were not producing cash",
    "little_movement":
        "its borrowings barely moved during the period",
    "funding_raised":
        "it took in more funding than it repaid during the period",
    "funding_repaid":
        "it repaid more funding than it took in during the period",
}

PROMPT = """Write one short paragraph describing what this Egyptian listed
company did with its borrowings in the period it last reported. Then write the
same paragraph in Arabic.

{frame}

The facts, which are the only things you know:
{facts}

Rules:
- Two or three sentences. Plain language, for somebody who does not read
  financial statements.
- Describe only what is listed above. Do not add a cause, a consequence, or
  anything about the share price.
- Never say whether this position is good, bad, risky, safe, healthy, strong,
  weak, sustainable or comfortable. Describe; do not grade.
- Never tell anybody what to do, and never suggest what happens next.
- Use NO numbers at all. The figures are on the screen beside your sentence.

Return JSON only: {{"read": "...", "read_ar": "..."}}
"""

OPERATING_FRAME = (
    "This is an ordinary trading company, so borrowing is money it took in to "
    "fund itself and has to repay out of what the business earns."
)
FINANCE_FRAME = (
    "This is a bank or financial company. Borrowing is the raw material of its "
    "business rather than a burden on it: it funds the book it lends out of. "
    "Customer deposits are not counted as borrowings here. Describe it as "
    "funding, and do not treat repaying or raising it as a difficulty."
)


def facts_for(block: dict) -> str:
    lines = []
    if shape := PATTERNS.get(block.get("pattern") or ""):
        lines.append(f"- over the period, {shape}")
    change = block.get("change") or {}
    if change.get("direction") == "up":
        lines.append("- its borrowings are higher than a year earlier")
    elif change.get("direction") == "down":
        lines.append("- its borrowings are lower than a year earlier")
    elif change.get("direction") == "flat":
        lines.append("- its borrowings are about the same as a year earlier")
    if (due := block.get("due_within_year")) is not None:
        lines.append(
            "- most of what it owes falls due within a year"
            if due > 0.5 else
            "- most of what it owes falls due more than a year from now"
        )
    net = block.get("net_debt")
    if net is not None and net < 0:
        lines.append("- it holds more cash than it owes in borrowings")
    if (cover := block.get("cover")) is not None:
        lines.append(
            "- its operating profit for the period was larger than what the "
            "borrowings cost it"
            if cover > 1 else
            "- what the borrowings cost it over the period was more than its "
            "operating profit"
        )
    movement = block.get("movement") or {}
    if (movement.get("dividends_paid") or 0) < 0:
        lines.append("- it also paid money out to shareholders in the period")
    return "\n".join(lines)


def vet(obj: dict) -> tuple[dict | None, str]:
    read = (obj.get("read") or "").strip()
    read_ar = (obj.get("read_ar") or "").strip()
    if len(read) < 30:
        return None, "no read"
    for field in (read, read_ar):
        if hit := macro_types.directive(field):
            return None, f"directive: {hit!r}"
        if DIGITS.search(YEAR.sub(" ", field)):
            return None, "quoted a figure"
        if hit := VERDICT.search(field):
            return None, f"graded the position: {hit.group(0)!r}"
        if hit := VERDICT_AR.search(field):
            return None, f"graded the position: {hit.group(0)!r}"
    return {"read": read, "read_ar": read_ar}, ""


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def build(limit: int | None, budget: float, refresh: bool) -> int:
    store = load(STORE)
    done = refused = skipped = 0
    spent = 0.0
    for path in sorted(glob.glob(str(COMPANIES / "*.json"))):
        if limit and done >= limit:
            break
        if spent >= budget:
            print(f"   stopping at the ${budget:.2f} ceiling", flush=True)
            break
        doc = json.loads(pathlib.Path(path).read_text())
        block = doc.get("debt")
        ticker = doc.get("ticker")
        if not block or not ticker:
            continue
        key = f"{ticker}:{block.get('period')}"
        if key in store and not refresh:
            skipped += 1
            continue
        facts = facts_for(block)
        if not facts:
            continue
        text = PROMPT.format(
            frame=(FINANCE_FRAME if block.get("frame") == "finance"
                   else OPERATING_FRAME),
            facts=facts,
        )
        try:
            raw, usage = gemini.generate(text)
        except Exception as error:  # noqa: BLE001 — one company must not stop the run
            print(f"   {ticker}: {type(error).__name__}", flush=True)
            refused += 1
            continue
        spent += (usage.get("prompt", 0) * 0.30
                  + usage.get("candidates", 0) * 2.50) / 1_000_000
        try:
            parsed = json.loads(re.sub(r"^```(?:json)?|```$", "", raw.strip(),
                                       flags=re.M).strip())
        except json.JSONDecodeError:
            print(f"   {ticker}: unparseable answer", flush=True)
            refused += 1
            continue
        vetted, why = vet(parsed if isinstance(parsed, dict) else {})
        if not vetted:
            print(f"   {ticker}: refused — {why}", flush=True)
            refused += 1
            continue
        store[key] = vetted
        STORE.write_text(json.dumps(store, ensure_ascii=False, indent=1,
                                    sort_keys=True), encoding="utf-8")
        done += 1
        time.sleep(0.2)
    print(f"── Debt reads: {done} written, {refused} refused, "
          f"{skipped} already held, ${spent:.2f}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--budget", type=float, default=2.00)
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()
    return build(args.limit, args.budget, args.refresh)


if __name__ == "__main__":
    raise SystemExit(main())
