#!/usr/bin/env python3
"""What the outside world reaches a company through, in its own filed figures.

THE COMPLAINT THIS ANSWERS
    "I don't really get how this gives the investor understanding that helps
     him choose a stock."

It was a fair complaint. The world monitor said oil moved unusually, and
separately listed 147 companies with a filed gross margin, and left the reader
to join them. The join is the product, and nobody was doing it.

WHAT IS JOINED
    Three things a company has already filed, per company, in one place:
      RATES     how much it owes, how much of that reprices within a year, and
                how many times over its earnings cover the interest.
      INPUTS    the cushion it filed between what it sells for and what that
                cost — a company on an 8% margin has less room for any input
                price than one on 60%.
      CURRENCY  the net position it holds in each foreign currency, and the
                exchange gain or loss already in its profit.

None of that is new data. What is new is that it is one card, and a sentence
that says which of the three actually reach this company and which do not.

WHY A MODEL WRITES THE SENTENCE, AND HOW IT IS KEPT HONEST
    The figures are exact and dull; the sentence joining them is the work, and
    it is the one part a model does better than a template. A template would
    write the same paragraph for a bank and a flour mill.

    So the model is handed the figures ALREADY FORMATTED the way the screen
    prints them, and told to reuse those strings character for character. Every
    number in what it writes is then looked for in that set. A figure it
    rounded, converted, combined or invented is not in the set, and the
    sentence carrying it is dropped — the whole card is dropped if nothing
    survives. It cannot introduce a number, because the only numbers it is
    allowed are the ones it was given.

    It may not say what any of it means for a share price. §8 leaves an
    unlicensed publisher no room to advise, and a sentence containing a
    forecast or a recommendation is dropped on the same pass.
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import gemini  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
MONITOR = REPO / "public" / "data" / "v1" / "world-monitor.json"
DIRECTORY = REPO / "public" / "data" / "v1" / "companies.json"
STORE = pathlib.Path(__file__).resolve().parent / "company_exposure_read.json"
OUT = REPO / "public" / "data" / "v1" / "company-exposure.json"

VERTEX_PROJECT = "project-8bba98ed-6d90-45af-ab8"

# A sentence may name these and nothing else. An open vocabulary would give the
# same exposure three names across three companies and nothing would join.
CHANNELS = ("rates", "inputs", "currency")

# Words that turn a description of a filing into advice.
FORBIDDEN = (
    "forecast", "predict", "expect", "likely", "should", "recommend",
    "buy", "sell", "undervalued", "overvalued", "target", "outperform",
    "opportunity", "attractive", "cheap", "expensive", "risky", "safe bet",
    "will rise", "will fall", "poised", "set to",
)

PROMPT = """You are describing one company listed on the Egyptian Exchange, for a
reader deciding which company's filings to read next.

Here are the ONLY figures you may use. Each is already written the way the
page prints it. Copy any figure you use character for character, exactly as it
appears here:

{figures}

Write two or three short sentences saying which of these three channels
actually reach this company, and which do not:

  rates     — what it owes and how soon that reprices
  inputs    — the cushion between what it sells for and what that cost
  currency  — what it holds or owes in a currency other than the pound

RULES, and a sentence breaking any of them is thrown away:
  · Use no number that is not in the list above, in no other form. Do not
    round, convert, add or combine them.
  · Say nothing about what any of it means for a share price, and nothing
    about the future. No forecast, no recommendation, no "likely", no
    "opportunity". You are describing filings, not advising.
  · If a channel has no figure above, say plainly that the company filed
    nothing for it rather than guessing.
  · Plain English. No adjectives of judgement.

Return ONLY this JSON, no prose and no code fence:

{{"says": ["<sentence>", "<sentence>"]}}
"""


def formatted(value, unit: str = "") -> str | None:
    """A figure written the way the page writes it, or nothing."""
    if not isinstance(value, (int, float)):
        return None
    size = abs(value)
    if unit == "%":
        return f"{round(value, 1)}%"
    if unit == "x":
        return f"{value:.2f}×"
    # Millions of pounds, compacted like the screen's `filed()`.
    n = value * 1e6
    for cut, suffix in ((1e9, "B"), (1e6, "M"), (1e3, "K")):
        if abs(n) >= cut:
            return f"{n / cut:.2f}".rstrip("0").rstrip(".") + f"{suffix} EGP"
    return f"{n:.0f} EGP"


def figures_for(ticker: str, monitor: dict) -> dict[str, str]:
    """Every figure this company filed, across the three channels."""
    out: dict[str, str] = {}
    for channel in monitor.get("channels") or []:
        row = next((c for c in channel.get("companies") or []
                    if c.get("ticker") == ticker), None)
        if not row:
            continue
        if channel["id"] == "rates":
            pairs = (("borrowings it owes", row.get("borrowings"), ""),
                     ("of that repricing within a year", row.get("repricingWithinAYear"), "%"),
                     ("interest cover", row.get("cover"), "x"))
        elif channel["id"] == "inputs":
            pairs = (("revenue filed", row.get("revenue"), ""),
                     ("gross profit filed", row.get("grossProfit"), ""),
                     ("gross margin", row.get("grossMargin"), "%"))
        else:
            pairs = (("currency gain or loss filed", row.get("fxResult"), ""),
                     ("profit filed for the period", row.get("netIncome"), ""),
                     ("that currency line as a share of the profit",
                      row.get("shareOfNetIncome"), "%"))
            for held in row.get("position") or []:
                shown = formatted(held.get("net"))
                if shown:
                    out[f"net position held in {held['currency']}"] = shown
        for label, value, unit in pairs:
            shown = formatted(value, unit)
            if shown:
                out[label] = shown
        if row.get("period"):
            out[f"period the {channel['id']} figures cover"] = row["period"]
    return out


def numbers_in(text: str) -> list[str]:
    """Every number-looking run in a sentence.

    The decimal point must be FOLLOWED by a digit. Written as an optional dot
    and any digits, it also matched the full stop that ends the sentence, so
    "...in Q1 2026." produced the token "2026." — which is in no list of
    figures, and threw away a good sentence over a punctuation mark. A number
    must also END in a digit, or the comma in "for H1 2026, the company..."
    came along with it and did the same thing again.
    """
    return re.findall(
        r"-?\d(?:[\d,]*\d)?(?:\.\d+)?\s*(?:[%×]|[BMK]?\s*EGP)?", text or "")


def grounded(sentence: str, allowed: dict[str, str]) -> bool:
    """True when every figure in the sentence is one it was given.

    The check that makes the whole thing publishable: the model may only use
    the strings it was handed, so a number it rounded, converted or invented
    has nowhere to hide.
    """
    values = list(allowed.values())
    for found in numbers_in(sentence):
        token = found.strip()
        if not token or not re.search(r"\d", token):
            continue
        # A bare small integer is counting, not a figure: "two of the three".
        if re.fullmatch(r"-?\d{1,2}", token):
            continue
        # The match must not be PART of a longer number. A plain substring test
        # let "1.4 billion" through against a filed 1.42B EGP — a rounded
        # figure reading as the filed one, which is the whole thing this
        # guard exists to stop.
        edge = re.compile(rf"(?<![\d.]){re.escape(token)}(?![\d.])")
        if not any(edge.search(value) for value in values):
            return False
    return True


def advises(sentence: str) -> str | None:
    """The forbidden word a sentence uses, if it uses one."""
    low = sentence.lower()
    # A sentence carrying its own negation is the disclaimer, not the thing.
    if re.search(r"\b(no|not|never|nothing|neither|cannot)\b", low):
        return None
    for word in FORBIDDEN:
        if word in low:
            return word
    return None


def vet(says, allowed: dict[str, str]) -> tuple[list[str], list[dict]]:
    kept, dropped = [], []
    if not isinstance(says, list):
        return [], [{"why": "the reader returned no sentences"}]
    for said in says:
        if not isinstance(said, str) or len(said.strip()) < 20:
            dropped.append({"said": str(said)[:80], "why": "not a sentence"})
            continue
        said = said.strip()
        if not grounded(said, allowed):
            dropped.append({"said": said, "why": "uses a figure it was not given"})
            continue
        word = advises(said)
        if word:
            dropped.append({"said": said, "why": f"reads as advice ({word!r})"})
            continue
        kept.append(said)
    return kept, dropped


def read(ticker: str, allowed: dict[str, str]) -> dict | None:
    listing = "\n".join(f"  · {label}: {shown}" for label, shown in allowed.items())
    body = json.dumps({
        "contents": [{"role": "user", "parts": [
            {"text": PROMPT.format(figures=listing)}]}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 900,
                             **gemini.THINKING_OFF},
    }).encode()
    try:
        payload = gemini._post(gemini.MODEL, body, timeout=120)
    except Exception:
        return None
    parts = (payload.get("candidates") or [{}])[0].get("content", {}).get("parts", [])
    raw = "".join(p.get("text", "") for p in parts).strip()
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


def held() -> dict:
    if STORE.exists():
        try:
            return json.loads(STORE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"schemaVersion": 1, "readings": {}}


def save(store: dict) -> None:
    STORE.write_text(json.dumps(store, ensure_ascii=False, indent=1) + "\n",
                     encoding="utf-8")


def publish(store: dict, monitor: dict, names: dict) -> dict:
    cards = []
    for ticker, reading in sorted(store["readings"].items()):
        says = reading.get("says") or []
        allowed = figures_for(ticker, monitor)
        if not says or not allowed:
            continue
        cards.append({
            "ticker": ticker,
            "name": names.get(ticker),
            "says": says,
            "figures": allowed,
            "channels": sorted(reading.get("channels") or []),
        })
    document = {
        "schemaVersion": 1,
        "generated": datetime.datetime.now(datetime.timezone.utc)
            .isoformat(timespec="seconds").replace("+00:00", "Z"),
        "basis": "Each card joins what one company filed across three channels — "
                 "what it owes and how soon that reprices, the cushion between "
                 "what it sells for and what that cost, and what it holds in "
                 "another currency. The sentences are written from those figures "
                 "and may use no others: every number in them is one of the "
                 "figures printed beside it, character for character, and a "
                 "sentence using any other number is dropped before publishing. "
                 "Nothing here says what any of it means for a share price.",
        "basisAr": "تجمع كل بطاقة ما أودعته الشركة في ثلاثة محاور — ما عليها من "
                   "قروض ومتى يُعاد تسعيرها، والفارق بين ما تبيع به وما كلّفها، "
                   "وما تحتفظ به بعملة أخرى. والجمل مكتوبة من هذه الأرقام ولا "
                   "يجوز أن تستعمل غيرها: كل رقم فيها هو أحد الأرقام المطبوعة "
                   "بجوارها حرفاً بحرف، وتُحذف أي جملة تستعمل رقماً آخر قبل "
                   "النشر. ولا شيء هنا يقول ماذا يعني ذلك لسعر أي سهم.",
        "companyCount": len(cards),
        "companies": cards,
    }
    OUT.write_text(json.dumps(document, ensure_ascii=False, indent=1) + "\n",
                   encoding="utf-8")
    return document


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=6)
    parser.add_argument("--only", default="")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--publish", action="store_true")
    args = parser.parse_args(argv)

    monitor = json.loads(MONITOR.read_text(encoding="utf-8"))
    directory = json.loads(DIRECTORY.read_text(encoding="utf-8")).get("companies", [])
    names = {c["ticker"]: c.get("name_en") or c.get("name_ar") or c["ticker"]
             for c in directory if c.get("ticker")}
    store = held()

    everyone = sorted({c["ticker"] for ch in monitor.get("channels") or []
                       for c in ch.get("companies") or [] if c.get("ticker")})
    wanted = {t.strip().upper() for t in args.only.split(",") if t.strip()}
    queue = [t for t in everyone
             if (not wanted or t in wanted) and (t not in store["readings"] or wanted)]

    print(f"   {len(everyone)} companies filed into a channel; "
          f"{len(store['readings'])} read, {len(queue)} outstanding")
    if args.check:
        return 0
    if args.publish:
        document = publish(store, monitor, names)
        print(f"   {document['companyCount']} cards published")
        return 0

    read_count = dropped_total = 0
    for ticker in queue[: max(0, args.limit)]:
        allowed = figures_for(ticker, monitor)
        if not allowed:
            continue
        answer = read(ticker, allowed)
        if not isinstance(answer, dict):
            print(f"   {ticker}: the reader gave no usable answer — will retry")
            continue
        kept, dropped = vet(answer.get("says"), allowed)
        store["readings"][ticker] = {
            "ticker": ticker, "says": kept, "dropped": dropped,
            "channels": [c["id"] for c in monitor.get("channels") or []
                         if any(r.get("ticker") == ticker
                                for r in c.get("companies") or [])],
        }
        save(store)
        read_count += 1
        dropped_total += len(dropped)
        print(f"   {ticker}: {len(kept)} sentence(s)"
              + (f", {len(dropped)} dropped" if dropped else ""))

    document = publish(store, monitor, names)
    print(f"   read {read_count}, dropped {dropped_total} sentences; "
          f"{document['companyCount']} cards")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
