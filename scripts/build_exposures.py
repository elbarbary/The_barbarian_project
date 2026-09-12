#!/usr/bin/env python3
"""What reaches an EGX company from outside Egypt, and the sentence that says so.

A world monitor that draws oil against the EGX index is a picture. The question
an investor actually has is narrower and answerable: *when the pound moves, or
oil moves, which companies on this exchange have a documented reason to care?*
That is not a forecast and not a recommendation — it is a claim about what has
been written down, and it can be checked.

So each exposure here carries the sentence it came from and the document that
sentence is in. Two rules make that worth something:

EVIDENCE IS VERIFIED, NOT TRUSTED
    The model is asked for the exact sentence from the source that establishes
    the exposure, and the sentence is then looked for IN that source. If it is
    not there — paraphrased, tidied, or invented — the exposure is dropped. A
    model that cannot quote the text cannot have read it, and this is the one
    guard that a confident wrong answer cannot walk through.

THE VOCABULARY IS CLOSED
    Five factors, fixed, each tied to a world series this site already tracks
    daily. An open vocabulary would produce a different word for the same thing
    on every company and nothing would join.

Nothing here says what a move MEANS for a share price. `рates` exposure is not
read from prose at all: borrowings and finance cost come off the filed balance
sheet, which states it better than any description could.
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import re
import subprocess
import unicodedata

REPO = pathlib.Path(__file__).resolve().parent.parent
BRIEFS = REPO / "public" / "data" / "v1" / "briefs"
COMPANIES = REPO / "public" / "data" / "v1" / "companies"
DIRECTORY = REPO / "public" / "data" / "v1" / "companies.json"
# Deliberately NOT in public/data/v1 yet. Eight companies were read to test
# this and the model documented an exposure for three of them — correctly, and
# the guard dropped nothing, because the "descriptions" these briefs carry turn
# out to be incorporation dates and shareholder lists. ABUK's does not mention
# fertiliser, gas or exports; Elsewedy's does not mention copper. The reader is
# working; the source cannot carry the claim, so nothing is published from it
# until a source that can is found.
OUT = pathlib.Path(__file__).resolve().parent / "exposures_read_summary.json"
STORE = pathlib.Path(__file__).resolve().parent / "exposures_read.json"
AGY = pathlib.Path.home() / ".local" / "bin" / "agy"

# One factor per world series this site already publishes a history for. An
# open vocabulary would name the same exposure differently on every company.
FACTORS = {
    "currency": "the business earns, prices, imports or borrows in a currency "
                "other than the Egyptian pound",
    "oil": "fuel or energy is a stated input to the business, or the business "
           "produces, refines or distributes it",
    "metals": "a metal — steel, copper, aluminium, gold — is a stated input to "
              "the business or a product of it",
    "foreign_demand": "the business sells to customers outside Egypt, exports, "
                      "or operates abroad",
    "tourism": "the business depends on visitors to Egypt: hotels, resorts, "
               "travel, or tourist transport",
}

PROMPT = """You are reading one short description of an Egyptian listed company.

Decide which of these outside factors the description ESTABLISHES an exposure
to. Do not infer from the industry in general, and do not guess: a cement maker
is not "oil" exposed unless this text says energy or fuel is an input to it.

{factors}

Return ONLY a JSON object, no prose and no code fence:

{{"exposures": [{{"factor": "<one of the names above>",
                 "evidence": "<the exact sentence from the description, copied
                              character for character, that establishes it>"}}]}}

The evidence must be a sentence that appears in the description word for word.
If the description establishes none of them, return {{"exposures": []}}.
"""


def _json_from(text: str) -> dict | None:
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n", "", raw)
        raw = re.sub(r"\n```\s*$", "", raw)
    start, end = raw.find("{"), raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        return json.loads(raw[start:end + 1])
    except json.JSONDecodeError:
        return None


def normalise(text: str) -> str:
    """Whitespace and quote shapes only — never words.

    A model that reflows a line or straightens a curly apostrophe has still
    quoted the source. One that changes a word has not, and that is the whole
    point of the check.
    """
    text = unicodedata.normalize("NFKC", text or "")
    text = text.replace("’", "'").replace("‘", "'")
    text = text.replace("“", '"').replace("”", '"')
    text = text.replace("–", "-").replace("—", "-")
    return " ".join(text.split()).casefold()


def grounded(evidence: str, source: str) -> bool:
    """True when the evidence really is in the source."""
    quote = normalise(evidence)
    # One clause is not evidence; a sentence is.
    return len(quote) >= 25 and quote in normalise(source)


def vet(reading, source: str) -> tuple[list, list]:
    """The exposures worth keeping, and the reasons the others went."""
    kept, dropped = [], []
    if not isinstance(reading, dict) or not isinstance(reading.get("exposures"), list):
        return [], [{"why": "the reader returned no exposure list"}]
    for row in reading["exposures"]:
        if not isinstance(row, dict):
            dropped.append({"why": f"not an object: {row!r}"})
            continue
        factor = row.get("factor")
        evidence = row.get("evidence") or ""
        if factor not in FACTORS:
            dropped.append({"factor": factor, "why": "not one of the five factors"})
            continue
        if not grounded(evidence, source):
            # The failure this whole builder exists to catch.
            dropped.append({"factor": factor, "evidence": evidence,
                            "why": "the quoted sentence is not in the description"})
            continue
        if any(k["factor"] == factor for k in kept):
            continue
        kept.append({"factor": factor, "evidence": evidence.strip()})
    return kept, dropped


def read_story(story: str) -> dict | None:
    if not AGY.exists():
        return None
    factors = "\n".join(f"- {name}: {what}" for name, what in FACTORS.items())
    prompt = PROMPT.format(factors=factors) + "\n\nDESCRIPTION:\n" + story
    try:
        proc = subprocess.run(
            [str(AGY), "--dangerously-skip-permissions",
             "--model", "gemini-3.8-flash-low", "--print-timeout", "3m", "-p", prompt],
            capture_output=True, text=True, timeout=220,
        )
    except (subprocess.SubprocessError, OSError):
        return None
    return _json_from(proc.stdout)


def held() -> dict:
    if STORE.exists():
        try:
            return json.loads(STORE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"schemaVersion": 1, "readings": {}}


def borrowings(ticker: str) -> dict | None:
    """Rate exposure, off the filed balance sheet rather than out of prose.

    A description saying a company "uses leverage" is worth less than the
    number it filed, so this factor is never asked of the model.
    """
    path = COMPANIES / f"{ticker}.json"
    if not path.exists():
        return None
    try:
        debt = (json.loads(path.read_text(encoding="utf-8")) or {}).get("debt") or {}
    except (OSError, json.JSONDecodeError):
        return None
    total = debt.get("borrowings")
    if not isinstance(total, (int, float)) or total <= 0:
        return None
    return {
        "factor": "rates",
        "borrowings": total,
        "shortTerm": debt.get("short_term"),
        "financeCost": debt.get("finance_cost"),
        "cover": debt.get("cover"),
        "period": debt.get("period"),
        "asOf": debt.get("as_of"),
        "source": debt.get("source"),
        "filingId": debt.get("filing_id"),
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=8,
                        help="how many descriptions to read this run")
    parser.add_argument("--only", default="", help="read these tickers only")
    parser.add_argument("--check", action="store_true",
                        help="report what is outstanding and write nothing")
    args = parser.parse_args(argv)

    directory = json.loads(DIRECTORY.read_text(encoding="utf-8")).get("companies", [])
    tickers = [c["ticker"] for c in directory if c.get("ticker")]
    store = held()

    stories = {}
    for ticker in tickers:
        path = BRIEFS / f"{ticker}.json"
        if not path.exists():
            continue
        try:
            story = (json.loads(path.read_text(encoding="utf-8")) or {}).get("story")
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(story, str) and len(story.strip()) > 80:
            stories[ticker] = story.strip()

    wanted = [t.strip() for t in args.only.split(",") if t.strip()] or None
    queue = [t for t in sorted(stories)
             if (wanted is None and t not in store["readings"]) or (wanted and t in wanted)]
    print(f"   {len(stories)} companies describe themselves; "
          f"{len(store['readings'])} read, {len(queue)} outstanding")
    if args.check:
        return 0

    read = dropped_total = 0
    for ticker in queue[: max(0, args.limit)]:
        reading = read_story(stories[ticker])
        if reading is None:
            print(f"   {ticker}: the reader gave no usable answer — will retry")
            continue
        kept, dropped = vet(reading, stories[ticker])
        store["readings"][ticker] = {
            "ticker": ticker,
            "exposures": kept,
            "dropped": dropped,
            "source": (json.loads((BRIEFS / f"{ticker}.json").read_text(encoding="utf-8"))
                       or {}).get("story_url"),
        }
        STORE.write_text(json.dumps(store, ensure_ascii=False, indent=1), encoding="utf-8")
        read += 1
        dropped_total += len(dropped)
        names = ", ".join(k["factor"] for k in kept) or "nothing documented"
        print(f"   {ticker}: {names}" + (f"  ({len(dropped)} dropped)" if dropped else ""))

    publish(store, stories)
    print(f"   read {read}, dropped {dropped_total} ungrounded claims")
    return 0


def publish(store: dict, stories: dict) -> None:
    companies = []
    for ticker, reading in sorted(store["readings"].items()):
        rows = list(reading.get("exposures") or [])
        rate = borrowings(ticker)
        if rate:
            rows.append(rate)
        if not rows:
            continue
        companies.append({"ticker": ticker, "source": reading.get("source"),
                          "exposures": rows})
    by_factor = {name: sorted(c["ticker"] for c in companies
                              if any(e["factor"] == name for e in c["exposures"]))
                 for name in list(FACTORS) + ["rates"]}
    OUT.write_text(json.dumps({
        "schemaVersion": 1,
        "generated": datetime.datetime.now(datetime.timezone.utc)
            .isoformat(timespec="seconds").replace("+00:00", "Z"),
        "basis": "An exposure is a claim the company's own published description "
                 "makes, kept only when the sentence it came from is in that "
                 "description word for word. Borrowings come from the filed "
                 "balance sheet. Nothing here says what a move in any of these "
                 "means for a share price.",
        "basisAr": "التعرض هنا ما يذكره وصف الشركة المنشور، ولا يُحتفظ به إلا إذا "
                   "كانت الجملة المقتبسة موجودة في الوصف حرفياً. أما القروض فمن "
                   "الميزانية المودعة. ولا شيء هنا يقول ماذا تعني أي حركة لسعر السهم.",
        "factors": FACTORS,
        "companyCount": len(companies),
        "byFactor": by_factor,
        "companies": companies,
    }, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
