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
SIGNALS = REPO / "public" / "data" / "v1" / "signals"

TICKER = re.compile(r"\(([A-Z0-9]{2,8})\.CA\)")

# gemini-3.7-flash, per million tokens, introductory rate.
IN_PER_M, OUT_PER_M = 0.75, 3.75

# What goes in front of the model, and why it is not the whole archive.
#
# The instinct was to send everything: 500 titles per company, the median
# company having filed 504 times. It works and it costs about six dollars, but
# it takes over two hours and it buys almost nothing, because the *history* is
# now written from `facts_block` — which is computed over the entire record no
# matter what is in the prompt — and the only thing the titles are needed for
# is quoting a filing id against a plan. Plans are limited to the last three
# years by [PLAN_YEARS], so the listing is too: 108 filings for the median
# company, 270 for the busiest, and a batch that finishes in half an hour.
PROMPT_YEARS = 3
WINDOW = 300

# A history has to contain something only this company's record could produce.
#
# This is not a style preference. The first batch of 110 briefs was measured
# and 68 of them contained the phrase "and extraordinary general meetings";
# 41 contained "standalone and consolidated financial". They were accurate and
# they were interchangeable, because "files results, holds assemblies" is the
# definition of a listed company rather than a fact about any one of them. So
# two mechanical guards now stand between the model and the app: a history must
# quote at least this many of the company's own computed figures, and it must
# not read like one already accepted for a different company.
MIN_SPECIFICS = 2
SIMILARITY = 0.45

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


def facts_block(record: dict, signals: dict) -> tuple[str, set[str]]:
    """The numbers that make this company's record different from any other's.

    Returned twice over: as prose for the prompt, and as the set of tokens a
    history has to quote at least [MIN_SPECIFICS] of. The second return is the
    guard — a paragraph that mentions none of these numbers is a paragraph
    about listed companies in general.
    """
    profile = signals.get("profile") or {}
    lines: list[str] = []
    tokens: set[str] = set()

    def fact(text: str, *values) -> None:
        lines.append(f"- {text}")
        for value in values:
            if value not in (None, "", 0):
                tokens.add(str(value))

    span_from = (profile.get("first_filing") or "")[:4]
    span_to = (profile.get("last_filing") or "")[:4]
    if span_from:
        fact(f"{record['filings']} filings on the exchange's record, "
             f"from {span_from} to {span_to}.", record["filings"], span_from, span_to)
    if profile.get("busiest_year"):
        fact(f"Busiest year: {profile['busiest_year']}, with "
             f"{profile['busiest_year_filings']} filings.",
             profile["busiest_year"], profile["busiest_year_filings"])
    if record.get("trading_suspensions"):
        fact(f"Trading suspended {record['trading_suspensions']} times, resumed "
             f"{record['trading_resumptions']} times.",
             record["trading_suspensions"], record["trading_resumptions"])
    if record.get("capital_increases"):
        fact(f"{record['capital_increases']} capital-increase filings.",
             record["capital_increases"])
    if profile.get("periods_reported"):
        fact(f"{profile['periods_reported']} periods of reported profit or loss, "
             f"{profile['loss_making_periods']} of them loss-making, from "
             f"{(profile.get('first_reported') or '')[:4]} to "
             f"{(profile.get('last_reported') or '')[:4]}.",
             profile["periods_reported"], profile["loss_making_periods"],
             (profile.get("first_reported") or "")[:4],
             (profile.get("last_reported") or "")[:4])
    # Millions, which is the unit the filings are in and the unit every screen
    # in the app already labels. Said in the prompt because a model handed a
    # bare number will pick one, and it picked thousands.
    if best := profile.get("best_period"):
        fact(f"Highest reported net profit: {best['period']} at "
             f"{best['net_income']:,.0f} million EGP.",
             best["period"], best["period"].split()[-1])
    if worst := profile.get("worst_period"):
        fact(f"Lowest reported net result: {worst['period']} at "
             f"{worst['net_income']:,.0f} million EGP.",
             worst["period"], worst["period"].split()[-1])

    for row in signals.get("streaks") or []:
        if row["kind"] == "first_loss":
            fact(f"{row['period']} was its first loss after {row['run']} "
                 f"consecutive profitable reported periods.",
                 row["period"], row["run"], row["period"][-4:])
        else:
            fact(f"{row['period']} returned to profit after {row['run']} "
                 f"consecutive loss-making periods.",
                 row["period"], row["run"], row["period"][-4:])
    for row in signals.get("firsts") or []:
        years = row["gap_days"] // 365
        fact(f"Its {row['label']} on {row['date']} was the first in {years} years.",
             row["date"][:4], years)
    if quiet := signals.get("quiet"):
        fact(f"It files every {quiet['typical_gap']} days on average and has "
             f"filed nothing for {quiet['silent_days']}.",
             quiet["typical_gap"], quiet["silent_days"])

    types = (profile.get("by_type") or {})
    if types:
        spread = ", ".join(f"{k} {v}" for k, v in list(types.items())[:8])
        lines.append(f"- Filings by type: {spread}.")
        tokens.update(str(v) for v in list(types.values())[:8])

    return "\n".join(lines), {t for t in tokens if len(str(t)) >= 2}


# How far back an announcement can be and still be called a plan. Beyond
# this a stated intention is a thing that either happened or did not, and the
# record shows which — calling it a plan would be the app's own guess.
PLAN_YEARS = 3


def prompt_window(filings: list[dict]) -> list[dict]:
    """The filings the model sees: the last [PROMPT_YEARS], capped at [WINDOW].

    Newest first, as they arrive. The cap exists for the handful of issuers
    that file every other day; for everyone else the date floor is what binds.
    """
    floor = (
        datetime.date.today() - datetime.timedelta(days=PROMPT_YEARS * 365)
    ).isoformat()
    recent = [i for i in filings if (i.get("dateStamp") or "")[:10] >= floor]
    # A company that has filed nothing for three years would otherwise get an
    # empty listing and no plans to cite; fall back to its newest filings.
    return (recent or filings)[:WINDOW]


def prompt_for(ticker: str, name: str, filings: list[dict], record: dict,
               signals: dict) -> tuple[str, set[str]]:
    plan_floor = (
        datetime.date.today() - datetime.timedelta(days=PLAN_YEARS * 365)
    ).isoformat()
    lines = []
    for item in prompt_window(filings):
        title = (item.get("heading") or item.get("headingArabic") or "").strip()
        lines.append(f"[egx-{item['code']}] {(item.get('dateStamp') or '')[:10]} {title}")
    listing = "\n".join(lines)
    facts, tokens = facts_block(record, signals)

    prompt = f"""You are reading the filing record of {name} ({ticker}), a company listed on the Egyptian Exchange.

FACTS ALREADY COMPUTED FROM THAT RECORD. These are counted, not estimated, and you may rely on them. A "reported period" is one year-to-date filing — Egyptian issuers file Q1, H1, 9M and FY cumulatively — so never call them quarters:

{facts}

ITS FILINGS, newest first, each with an id in square brackets:

{listing}

Return ONLY a JSON object with exactly these keys:

"history": 45-80 words of English describing what is DISTINCTIVE about this company's record — what somebody who had read every filing would know that somebody who had read none would not. Anchor it in the computed facts above: quote specific years, counts and period names. Do NOT describe activities every listed company performs (filing results, holding assemblies, publishing disclosure forms) unless this company does them at a rate the facts show is unusual. Do not evaluate the company, do not use adjectives of quality, do not mention share price.

"history_ar": the same paragraph in Arabic.

"plans": an array of at most 5 objects, each {{"text": "...", "text_ar": "...", "id": "egx-NNNNNN"}}. Each must be something the COMPANY ITSELF announced it WOULD DO, at the time it announced it — a planned capital increase, a proposed acquisition, a facility it intends to build, a rights issue it has called, a contract it has signed and not yet delivered. An action the filings show was already completed is NOT a plan; leave it out. Only use filings from {plan_floor} onwards, because an intention announced longer ago than that is history. "text" is one factual sentence in English beginning with the company's action. "id" MUST be copied exactly from the square brackets of the filing that says it. If the record contains no such announcement, return an empty array.

RULES, which override anything above:
- Never say whether anything is good, bad, cheap, expensive, promising or risky.
- Never advise buying, selling or holding, and never address the reader.
- Never state or imply a future share price, return or forecast of your own.
- Only report what the filings and the computed facts say. Invent nothing.
- Every id must appear in the list above."""
    return prompt, tokens


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


def shingles(text: str) -> set[str]:
    """Four-word runs, for comparing one history against another."""
    words = re.findall(r"[a-z0-9]+", (text or "").lower())
    return {" ".join(words[i:i + 4]) for i in range(max(0, len(words) - 3))}


def overlap(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def vet(brief: dict, allowed: set[str], specifics: set[str],
        accepted: list[set[str]]) -> tuple[dict | None, str]:
    """The guards. Returns the cleaned brief, or None and a reason.

    Five now, and the last two exist because the first three let a batch of
    interchangeable paragraphs through: they check that a claim is *legal*,
    not that it is *about this company*.
    """
    history = (brief.get("history") or "").strip()
    history_ar = (brief.get("history_ar") or "").strip()
    if len(history) < 30:
        return None, "no history"

    for field in (history, history_ar):
        if hit := macro_types.directive(field):
            return None, f"directive: {hit!r}"

    # Specificity. At least [MIN_SPECIFICS] of the company's own computed
    # figures have to appear in the paragraph, so "this company" is doing work
    # in the sentence rather than standing in for "a company".
    hits = sum(1 for token in specifics if re.search(rf"\b{re.escape(token)}\b", history))
    if hits < MIN_SPECIFICS:
        return None, f"generic — {hits} of its own figures quoted"

    # Distinctness. Compared against every history already accepted in this
    # run: two companies whose paragraphs are four-fifths the same words are
    # one paragraph with two names on it.
    mine = shingles(history)
    for other in accepted:
        if overlap(mine, other) > SIMILARITY:
            return None, "reads like another company's history"

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

    accepted.append(mine)
    return {
        "history": history,
        "history_ar": history_ar,
        "plans": plans[:5],
    }, ""


def load_signals(ticker: str) -> dict:
    """What `build_signals.py` computed for this company, or nothing."""
    try:
        return json.loads((SIGNALS / f"{ticker}.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def publish(held: dict) -> None:
    """Write the store and every per-company document.

    Called after each batch rather than once at the end. The first run of this
    script lost 167 companies to a single read timeout, because everything it
    had generated lived in memory until the loop finished.
    """
    STORE.write_text(json.dumps(held, ensure_ascii=False, indent=1), encoding="utf-8")
    for folder in (OUT, FIXTURES):
        if folder is FIXTURES and not folder.parent.exists():
            continue
        folder.mkdir(parents=True, exist_ok=True)
        for ticker, brief in held.items():
            (folder / f"{ticker}.json").write_text(
                json.dumps({"ticker": ticker, **brief}, ensure_ascii=False,
                           separators=(",", ":")),
                encoding="utf-8",
            )


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
        # `name_en`, which is the field companies.json actually carries. This
        # read `(c.get("name") or {}).get("en")` and so found nothing for any
        # company: every prompt in the first batch opened by naming the ticker
        # twice instead of the company once.
        directory = {
            c["ticker"]: c.get("name_en") or c["ticker"]
            for c in json.loads(
                (REPO / "public" / "data" / "v1" / "companies.json").read_text()
            ).get("companies", [])
            if c.get("ticker")
        }
    except (OSError, json.JSONDecodeError, KeyError):
        pass

    targets = [args.only] if args.only else sorted(
        t for t in by_ticker if t in directory
    )
    spent = 0.0
    done = refused = skipped = 0
    # Every history accepted this run, as word-run sets, so the next one can be
    # compared against all of them.
    accepted: list[set[str]] = [
        shingles(brief.get("history", "")) for brief in held.values()
    ]

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

        # Ids the model may cite at all, and the narrower set a *plan* may
        # cite: an intention announced four years ago is not a plan, and the
        # guard enforces what the prompt asks for rather than trusting it.
        window = prompt_window(filings)
        allowed = {f"egx-{i['code']}" for i in window}
        floor = (datetime.date.today()
                 - datetime.timedelta(days=PLAN_YEARS * 365)).isoformat()
        recent = {
            f"egx-{i['code']}" for i in window
            if (i.get("dateStamp") or "")[:10] >= floor
        }
        text, specifics = prompt_for(
            ticker, directory.get(ticker, ticker), filings, record,
            load_signals(ticker),
        )
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
        clean, why = vet(brief, recent or allowed, specifics, accepted)
        if not clean:
            print(f"   {ticker}: refused — {why}", flush=True)
            refused += 1
            continue
        clean["record"] = record
        clean["generated"] = datetime.date.today().isoformat()
        held[ticker] = clean
        done += 1
        if done % 10 == 0:
            print(f"   {done} written, {refused} refused, ${spent:.2f} spent",
                  flush=True)
            publish(held)

    publish(held)
    print(f"   {done} briefs written, {refused} refused, {skipped} already held")
    print(f"   spent ${spent:.2f} of ${args.budget:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
