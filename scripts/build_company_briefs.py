#!/usr/bin/env python3
"""What a company has done, and what it has said it will do — from its filings.

Every company page now carries the company's whole filing record, hundreds of
Arabic titles deep, plus a decade of filed net profit. That is a great deal of
primary source and almost no help: nobody reads seven hundred filings.

This reads them, once, at build time, and writes three things per company:

  * **history** — a plain paragraph of what the record shows the company has
    actually done. Filings, not adjectives.
  * **plans** — what the company *itself announced* about its future: a capital
    increase, a new plant, a rights issue, an acquisition. Each one quoted from
    a named filing, with that filing's id, so a reader can open it.
  * **record** — the countable facts a reader might weigh: how many times
    trading was suspended, how many periods were loss-making, how many capital
    increases. **Computed here, not asked of the model.**

WHAT THIS DOES NOT DO, AND WHY
------------------------------
It does not say whether any of it is good. A view on a named security's
prospects is investment advice, this publisher is not licensed to give it, and
§8 forbids it throughout. The founder's decision was explicit: the company's
own stated plans, and a factual record, with no verdict attached.

That is also the safer engineering. "Is this a good company" invites a model to
invent; "which filings mention a capital increase" invites it to read. This
repository has shipped fabricated financials for a real ticker once already.

THREE GUARDS, BECAUSE ONE IS NOT ENOUGH
---------------------------------------
1. **Citation.** Every plan must name a filing id that was in the prompt. An id
   the model invented, or borrowed from another company, is dropped with the
   claim attached to it.
2. **Directive.** Every sentence goes through `macro_types.directive`, the same
   Arabic-and-English instruction detector the macro insights use. One hit and
   the whole brief is refused.
3. **Budget.** The run stops at a hard dollar ceiling, counted from real token
   usage rather than estimated.

Nothing here runs on a phone (spec §43). The output is a committed JSON file a
person can read before it ever reaches a reader.
"""

from __future__ import annotations

import argparse
import collections
import datetime
import glob
import gzip
import json
import pathlib
import re

import gemini
import macro_types

REPO = pathlib.Path(__file__).resolve().parent.parent
FILINGS = REPO / "data-source" / "egx-beta" / "filings"
COMPANIES = REPO / "public" / "data" / "v1" / "companies"
OUT = REPO / "public" / "data" / "v1" / "briefs"
FIXTURES = REPO / "app" / "assets" / "fixtures" / "briefs"
STORE = pathlib.Path(__file__).resolve().parent / "company_briefs.json"

TICKER = re.compile(r"\(([A-Z0-9]{2,8})\.CA\)")

# gemini-3.7-flash, per million tokens, introductory rate.
IN_PER_M, OUT_PER_M = 0.75, 3.75

# How many filings to put in front of the model. Titles are short; a company's
# most recent 120 covers several years for most issuers and keeps one prompt
# well inside the context while costing about a cent.
WINDOW = 120

FORWARD = re.compile(
    r"(زيادة رأس ?المال|رأس ?المال|اكتتاب|استحواذ|اندماج|توسع|مصنع|خطة|"
    r"مشروع|عقد|تمويل|طرح|إنشاء|توقيع|اتفاق)"
)


def load_filings() -> dict[str, list[dict]]:
    by_ticker: dict[str, dict[str, dict]] = collections.defaultdict(dict)
    for path in sorted(glob.glob(str(FILINGS / "*.json.gz"))):
        for item in json.loads(
            gzip.decompress(pathlib.Path(path).read_bytes())
        ).get("items", []):
            head = (item.get("heading") or "") + " " + (item.get("headingArabic") or "")
            for ticker in set(TICKER.findall(head)):
                by_ticker[ticker][item["code"]] = item
    return {
        t: sorted(v.values(), key=lambda i: i.get("dateStamp") or "", reverse=True)
        for t, v in by_ticker.items()
    }


def factual_record(ticker: str, filings: list[dict]) -> dict:
    """The countable facts, computed rather than asked for.

    A model asked "how many times was this suspended" will answer with a number
    whether or not it counted. This counts.
    """
    suspensions = resumptions = capital = assemblies = 0
    for item in filings:
        head = ((item.get("heading") or "") + " " + (item.get("headingArabic") or "")).lower()
        section = (item.get("section") or "").strip()
        if "suspension" in head or "إيقاف" in head:
            suspensions += 1
        if "resume" in head or "استئناف" in head:
            resumptions += 1
        if "capital increase" in head or "زيادة رأس" in head:
            capital += 1
        if section == "General Assemblies":
            assemblies += 1

    losses = periods = 0
    doc = COMPANIES / f"{ticker}.json"
    if doc.exists():
        try:
            fin = json.loads(doc.read_text()).get("financials") or {}
            for bucket in ("annual", "quarterly"):
                for row in fin.get(bucket) or []:
                    value = row.get("net_income")
                    if value is None:
                        continue
                    periods += 1
                    if value < 0:
                        losses += 1
        except (OSError, json.JSONDecodeError):
            pass

    return {
        "filings": len(filings),
        "first_filing": (filings[-1].get("dateStamp") or "")[:10] if filings else None,
        "trading_suspensions": suspensions,
        "trading_resumptions": resumptions,
        "capital_increases": capital,
        "general_assemblies": assemblies,
        "periods_reported": periods,
        "loss_making_periods": losses,
    }


def prompt_for(ticker: str, name: str, filings: list[dict], record: dict) -> str:
    lines = []
    for item in filings[:WINDOW]:
        title = (item.get("heading") or item.get("headingArabic") or "").strip()
        lines.append(f"[egx-{item['code']}] {(item.get('dateStamp') or '')[:10]} {title}")
    listing = "\n".join(lines)
    return f"""You are reading the filing record of {name} ({ticker}), a company listed on the Egyptian Exchange. Below are its filings, newest first, each with an id in square brackets.

{listing}

Return ONLY a JSON object with exactly these keys:

"history": a factual paragraph, 40-70 words, in English, describing what this company's filing record shows it has DONE. Describe events that already happened. Do not evaluate the company, do not use adjectives of quality, do not mention share price.

"history_ar": the same paragraph in Arabic.

"plans": an array of at most 5 objects, each {{"text": "...", "text_ar": "...", "id": "egx-NNNNNN"}}. Each must describe something the COMPANY ITSELF announced it intends to do in the future — a capital increase, an acquisition, a new facility, a rights issue, a signed contract. "text" is one factual sentence in English beginning with the company's action. "id" MUST be copied exactly from the square brackets of the filing that says it. If the record contains no forward-looking announcement, return an empty array.

RULES, which override anything above:
- Never say whether anything is good, bad, cheap, expensive, promising or risky.
- Never advise buying, selling or holding, and never address the reader.
- Never state or imply a future share price, return or forecast of your own.
- Only report what the filings say. Invent nothing. If unsure, omit it.
- Every id must appear in the list above."""


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


def vet(brief: dict, allowed: set[str]) -> tuple[dict | None, str]:
    """The three guards. Returns the cleaned brief, or None and a reason."""
    history = (brief.get("history") or "").strip()
    history_ar = (brief.get("history_ar") or "").strip()
    if len(history) < 30:
        return None, "no history"

    for field in (history, history_ar):
        if hit := macro_types.directive(field):
            return None, f"directive: {hit!r}"

    plans = []
    for plan in brief.get("plans") or []:
        if not isinstance(plan, dict):
            continue
        text = (plan.get("text") or "").strip()
        text_ar = (plan.get("text_ar") or "").strip()
        cite = (plan.get("id") or "").strip()
        if not text or cite not in allowed:
            # An id the model invented, or one belonging to another company.
            continue
        if macro_types.directive(text) or macro_types.directive(text_ar):
            return None, "directive in a plan"
        plans.append({"text": text, "text_ar": text_ar, "id": cite})

    return {
        "history": history,
        "history_ar": history_ar,
        "plans": plans[:5],
    }, ""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--budget", type=float, default=20.0,
                    help="hard ceiling in US dollars (default 20)")
    ap.add_argument("--limit", type=int, default=0, help="stop after N companies")
    ap.add_argument("--only", help="one ticker, for checking")
    ap.add_argument("--refresh", action="store_true", help="redo companies already held")
    args = ap.parse_args()

    print("── Company briefs")
    if not gemini.available():
        print("   no Gemini transport — leaving the published briefs alone")
        return 0

    held = {}
    if STORE.exists():
        try:
            held = json.loads(STORE.read_text())
        except json.JSONDecodeError:
            held = {}

    by_ticker = load_filings()
    directory = {}
    try:
        directory = {
            c["ticker"]: (c.get("name") or {}).get("en") or c["ticker"]
            for c in json.loads(
                (REPO / "public" / "data" / "v1" / "companies.json").read_text()
            ).get("companies", [])
        }
    except (OSError, json.JSONDecodeError, KeyError):
        pass

    targets = [args.only] if args.only else sorted(
        t for t in by_ticker if t in directory
    )
    spent = 0.0
    done = refused = skipped = 0

    for ticker in targets:
        filings = by_ticker.get(ticker) or []
        if not filings:
            continue
        record = factual_record(ticker, filings)
        if ticker in held and not args.refresh and not args.only:
            held[ticker]["record"] = record  # facts are cheap; refresh them
            skipped += 1
            continue
        if spent >= args.budget:
            print(f"   budget reached (${spent:.2f}) — stopping")
            break
        if args.limit and done >= args.limit:
            break

        allowed = {f"egx-{i['code']}" for i in filings[:WINDOW]}
        text = prompt_for(ticker, directory.get(ticker, ticker), filings, record)
        try:
            raw, usage = gemini.generate(text)
        except gemini.GeminiUnavailable as error:
            print(f"   {ticker}: {error}")
            break
        spent += (usage.get("prompt", 0) / 1e6) * IN_PER_M
        spent += (usage.get("candidates", 0) / 1e6) * OUT_PER_M

        brief = parse(raw)
        if not brief:
            refused += 1
            continue
        clean, why = vet(brief, allowed)
        if not clean:
            print(f"   {ticker}: refused — {why}")
            refused += 1
            continue
        clean["record"] = record
        clean["generated"] = datetime.date.today().isoformat()
        held[ticker] = clean
        done += 1
        if done % 20 == 0:
            print(f"   {done} written, ${spent:.2f} spent")

    STORE.write_text(json.dumps(held, ensure_ascii=False, indent=1), encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)
    FIXTURES.mkdir(parents=True, exist_ok=True)
    for ticker, brief in held.items():
        body = json.dumps({"ticker": ticker, **brief}, ensure_ascii=False,
                          separators=(",", ":"))
        (OUT / f"{ticker}.json").write_text(body, encoding="utf-8")
    print(f"   {done} briefs written, {refused} refused, {skipped} already held")
    print(f"   spent ${spent:.2f} of ${args.budget:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
