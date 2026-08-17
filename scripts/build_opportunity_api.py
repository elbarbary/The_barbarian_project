#!/usr/bin/env python3
"""Build the Opportunity Scanner API from the published field note.

Source is `public/egx-insights.html` — the real report. Read direction only;
the page is never written (spec §24, §58).

Two things the page carries that the app deliberately does **not** republish:

  * the forward-looking trade mechanics — "exit below EGP 64.70", "hard stop
    1 September", buyer price, holding horizon. Spec §8 keeps entries, stops
    and targets out of the app entirely.
  * nothing else. Everything factual — the ranked watch cohort, each name's
    score out of 13, the rationale, and the whole outcome record including the
    misses — is carried across, because the record of what failed is the point
    of the series (spec §7).

Usage:
    python3 scripts/build_opportunity_api.py [--check]
"""

from __future__ import annotations

import argparse
import json
import html as html_lib
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
SOURCE = REPO / "public" / "egx-insights.html"
OUT = REPO / "public" / "data" / "v1" / "opportunities"
FIXTURES = REPO / "app" / "assets" / "fixtures" / "opportunities"

MONTHS = {
    m: i + 1
    for i, m in enumerate(
        "January February March April May June July August "
        "September October November December".split()
    )
}

# The report's own status vocabulary, mapped onto the three buckets the app
# groups by. The original wording is kept and shown — it is more precise than
# the bucket, and the series' readers know it.
BUCKETS = {
    "Persistent watch": "watching",
    "Watch only": "watching",
    "Tape watch": "watching",
    "Expired watch": "rejected",
    "Denied / rejected": "rejected",
    "Rejected": "rejected",
    "Timing/execution miss": "rejected",
    "Model trade closed": "qualified",
    "Qualified": "qualified",
}


def text(raw: str) -> str:
    """Strip tags, decode entities and collapse whitespace.

    Decoding matters: the page is HTML and writes `&amp;`, `&gt;` and `&#39;`,
    which are correct there and wrong everywhere else. Left encoded they reach
    the app as literal "Edible oils &amp; soap" and "five-session &gt;20%".
    """
    return " ".join(html_lib.unescape(re.sub(r"<[^>]+>", " ", raw)).split())


BANNED = ("hard stop", "exit below", "buyer price", "review session",
          "holding period", "holding horizon")

# Trade mechanics the report writes as a dated clause rather than a phrase, so
# a literal word list cannot see them. The report's house style is
#
#   If confirmed: 3–5 sessions · review 16 August · hard 20 August · exit on …
#
# which carries a holding horizon, a review date, a stop date and an exit
# condition — every one of them forward-looking trade mechanics (spec §8).
# These survived because the clauses are joined by "·", which the splitter did
# not break on, and because "review 16 August" matches none of BANNED.
BANNED_PATTERNS = (
    re.compile(r"\bif (independently )?confirmed\b", re.I),
    re.compile(r"\b\d+\s*[–—-]\s*\d+\s+(trading\s+)?sessions?\b", re.I),
    re.compile(r"\breview\s+\d", re.I),
    re.compile(r"\bhard\s+(stop\s+)?\d", re.I),
    re.compile(r"\bexit\s+(on|below|at|before)\b", re.I),
    re.compile(r"\bfirst review\b", re.I),
    # A price a reader is told to act at is a trade instruction however
    # conversationally it is phrased. The rewritten page states these in prose —
    # "a completed close above EGP 76.50", "confirmation above EGP 309" — which
    # no keyword list would have caught.
    re.compile(
        r"\b(close[sd]?|closing|confirmation|confirm|break[s]?|rise[s]?|move[s]?)"
        r"\s+(above|below|through|past)\s+EGP",
        re.I,
    ),
    re.compile(r"\bEGP\s*[\d.,]+\s*(trigger|cap|invalidation|stop|target)", re.I),
    re.compile(r"\b(invalidation|profit target|target level)", re.I),
    re.compile(r"\bholding clock\b", re.I),
    re.compile(r"\bthe (model|decision) (actually )?enters\b", re.I),
    # A date the cohort stops being valid is a deadline, and a deadline is
    # forward-looking. The sector header restates the members' "hard 18 Aug" as
    # "Expires after 18 August without fresh breadth" — the same window's end,
    # in the one part of the block that is read. Skipping the members' <dl>
    # while publishing the header's paraphrase of it was self-defeating.
    #
    # Present tense only: "expires" is a deadline, "its clock expired without
    # entry" is a record of something that already happened, and the record is
    # the point of the series (spec §7).
    re.compile(r"\bexpires?\b", re.I),
    re.compile(r"\b(deadline|expiry)\b", re.I),
)

# Evidence headings the app republishes, matched loosely.
#
# This is an **allow-list**, and deliberately so. The report's headings are
# rewritten constantly — "Price, depth and technical context" one day, "Depth /
# technical context" the next, "Depth" the day after — while the forward-looking
# ones multiply faster still: "Invalidate", "Confirmation", "What would upgrade
# it", "Plain-English entry test", "Five things must all happen". A deny-list
# has to predict the next name somebody invents. An allow-list drops what it
# does not recognise, which is the only safe default when the thing being
# dropped is a trade instruction (spec §8).
EVIDENCE_HEADINGS = (
    re.compile(r"\bdepth\b", re.I),
    re.compile(r"\bcontext\b", re.I),
    re.compile(r"pre-news", re.I),
    re.compile(r"volume trail", re.I),
)

# Whole research sections that exist to say what must happen before a trade.
# Dropping them by heading is more honest than filtering their sentences: the
# section is *about* the entry conditions, so what survives sentence-level
# filtering is a paragraph with its subject removed.
FORWARD_LOOKING_SECTIONS = (
    re.compile(r"what is missing", re.I),
    re.compile(r"what would change the decision", re.I),
    re.compile(r"what (must|has to|needs to) happen", re.I),
    re.compile(r"before (a|the) (model )?entry", re.I),
    re.compile(r"entry (rules|conditions|checklist)", re.I),
)


def sanitize(note: str | None) -> str | None:
    """Drop sentences that carry forward-looking trade mechanics (spec §8).

    The report is written for a reader who follows model trades; the app is
    not. Removing whole sentences rather than words keeps what is left
    readable, and keeps entries, stops and horizons out of the product
    entirely.

    "No holding period — no entry." is kept: it states the absence of a trade,
    which is part of the honest record rather than an instruction.
    """
    if not note:
        return None

    # Split on sentence ends *and* on the separators the report uses to append
    # a stop, a horizon or a review date as a clause: em-dash, semicolon and
    # the middle dot it strings mechanics together with.
    #
    # The group is **capturing**, so the separators come back and can be put
    # where they were. Only the sentence-end alternative is a lookbehind; the
    # other three are consumed by the split, and rejoining with a plain space
    # silently deleted them. "No holding period — no entry." shipped as "No
    # holding period no entry." — the one phrase this function exists to
    # preserve — and every "+1.77% · volume 1.22× normal" ran together.
    tokens = re.split(r"((?<=[.!?])\s+|\s+—\s+|;\s+|\s*·\s*)", note)

    kept: list[tuple[str, str]] = []
    separator = ""
    for index, token in enumerate(tokens):
        if index % 2:
            # Odd positions are the captured separators. Hold the most recent
            # one; it belongs to whichever clause comes next.
            separator = token
            continue

        clause = token.strip()
        if not clause:
            continue

        low = clause.lower()
        allowed = "no holding period" in low or "no entry" in low
        if not allowed:
            if any(word in low for word in BANNED):
                continue
            if any(p.search(clause) for p in BANNED_PATTERNS):
                continue

        # The first surviving clause opens the string, so it takes no
        # separator even if it was not first in the original.
        kept.append(("" if not kept else _separator(separator), clause))

    cleaned = "".join(sep + clause for sep, clause in kept).strip()
    # A clause dropped mid-sentence can leave a dangling connector.
    cleaned = re.sub(r"\s+([.,;:])", r"\1", cleaned)
    cleaned = re.sub(r"[,;:]\s*$", ".", cleaned).strip()
    return cleaned or None


def _separator(raw: str) -> str:
    """The captured separator, normalised to how it should be re-typeset.

    A sentence end captures only the whitespace after the full stop, which the
    clause before it already carries — so that becomes a plain space.
    """
    mark = raw.strip()
    if not mark:
        return " "
    if mark == ";":
        return "; "
    return f" {mark} "


def signal_cards(html: str) -> dict[str, dict]:
    """The evidence attached to each name on the signal board, keyed by ticker.

    The board is newer than the scorecard the watch list is built from, and it
    carries two things the scorecard does not: a pass/fail gate checklist, and
    the research written out in plain English.

    Both are *evidence* — what was verified, what failed, and why the name is
    still being looked at. What the board also carries, and what is deliberately
    not read here, is the model's trade plumbing: the entry checklist, the stop
    price, the profit targets and the holding clock. Those live in
    `signal-levels`, which this function never touches (spec §8).
    """
    cards: dict[str, dict] = {}
    for block in re.findall(r'<article class="signal-card.*?</article>', html, re.S):
        # The ticker heads the identity block: `<h4>GIHD <small>8/13 …</small></h4>`.
        # Matching the first <strong> instead finds the quoted price, which is
        # not a ticker, so every card was silently skipped and no gates arrived.
        ticker = re.search(r"<h4[^>]*>\s*([A-Z]{3,6})", block)
        if not ticker:
            continue

        gates = []
        for cls, label in re.findall(
            r'<li class="gate-(pass|fail|warn)">([^<]+)</li>', block
        ):
            gates.append({"outcome": cls, "label": text(label)})

        # The reasoning now lives in the card's action block: the decision the
        # report reached, and why. The old <details> walkthrough is gone from
        # the page entirely, so nothing here looks for it any more.
        #
        # The decision itself is worth republishing because every one of them
        # says *not* to trade — "Wait for today's close — no model entry",
        # "Wait for a wholly new base". Recording the absence of a trade is
        # exactly what spec §8 permits, and it is the most useful line on the
        # card.
        action = None
        if a := re.search(
            r'<div class="signal-action">\s*<span>(.*?)</span>\s*'
            r"<strong>(.*?)</strong>(.*?)</div>",
            block,
            re.S,
        ):
            reasoning = [
                c for c in (sanitize(text(p)) for p in re.findall(r"<p>(.*?)</p>", a.group(3), re.S)) if c
            ]
            action = {
                "label": text(a.group(1)),
                "decision": sanitize(text(a.group(2))),
                "reasoning": reasoning,
            }

        # The <dl> mixes evidence with trade plumbing. Only the recognised
        # evidence headings are carried across.
        research = []
        for term, desc in re.findall(r"<dt>(.*?)</dt>\s*<dd>(.*?)</dd>", block, re.S):
            heading = text(term)
            if not any(p.search(heading) for p in EVIDENCE_HEADINGS):
                continue
            body = sanitize(text(desc))
            if body:
                research.append({"heading": heading, "body": [body]})
        research = research or None

        rank = re.search(r'<div class="signal-rank">(\d+)</div>', block)
        score = re.search(r"<h4[^>]*>\s*[A-Z]{3,6}\s*<small>(\d+)\s*/\s*(\d+)", block)
        state = re.search(r'<span class="signal-state[^"]*">([^<]+)</span>', block)
        # The quote block reads "12 Aug close / EGP 68.50 / +1.77% · volume …".
        quote = re.search(
            r'<div class="signal-quote">\s*<span>(.*?)</span>\s*'
            r"<strong>(.*?)</strong>\s*<small>(.*?)</small>",
            block,
            re.S,
        )

        cards[ticker.group(1)] = {
            "rank": int(rank.group(1)) if rank else None,
            "score": int(score.group(1)) if score else None,
            "max_score": int(score.group(2)) if score else None,
            "gates": gates,
            "research": research,
            "action": action,
            "state": text(state.group(1)) if state else None,
            "tape": {
                "label": text(quote.group(1)),
                "price": text(quote.group(2)),
                "detail": sanitize(text(quote.group(3))),
            }
            if quote
            else None,
        }
    return cards


def sector_context(html: str) -> dict | None:
    """The sector cohort block, when the report carries one.

    A sector read is a research finding in its own right — four names moving
    together for one reason is evidence no single-name card can show — so it is
    published as its own object rather than folded into a note.

    Each member's `<dl>` is skipped wholesale. It holds "Entry signal", "Exit
    signal" and "Clock if confirmed", which is precisely the forward-looking
    trade plumbing spec §8 keeps out of the app. What is kept is who is in the
    cohort, what role each plays, and what the tape actually did.
    """
    block = re.search(
        r'<section class="sector-context[^"]*".*?</section>', html, re.S
    )
    if not block:
        return None
    body = block.group(0)

    kicker = re.search(r'<p class="kicker">(.*?)</p>', body, re.S)
    title = re.search(r"<h3[^>]*>(.*?)</h3>", body, re.S)
    if not title:
        return None
    # The thesis is the paragraph directly after the heading, inside the header.
    thesis = re.search(r"</h3>\s*<p>(.*?)</p>", body, re.S)

    def facts(container: str) -> list[dict]:
        """`<span>label</span><strong>value</strong><small>detail</small>` rows."""
        m = re.search(rf'<div class="{container}">(.*?)</div>\s*(?:<div|</)', body, re.S)
        region = re.search(rf'<div class="{container}">(.*)', body, re.S)
        if not region:
            return []
        out = []
        for span, strong, small in re.findall(
            r"<span>(.*?)</span>\s*<strong>(.*?)</strong>\s*<small>(.*?)</small>",
            region.group(1),
            re.S,
        ):
            out.append(
                {
                    "label": text(span),
                    "value": text(strong),
                    "detail": sanitize(text(small)),
                }
            )
        return out

    rows = facts("sector-stage") + facts("sector-evidence")
    # `facts` scans to the end of the block, so both calls see the same rows;
    # dedupe by label while keeping order.
    seen, timeline = set(), []
    for row in rows:
        if row["label"] in seen:
            continue
        seen.add(row["label"])
        timeline.append(row)

    members = []
    grid = re.search(r'<div class="sector-member-grid">(.*)', body, re.S)
    if grid:
        for article in re.findall(r"<article>(.*?)</article>", grid.group(1), re.S):
            ticker = re.search(r"<strong>([A-Z]{3,6})</strong>", article)
            if not ticker:
                continue
            role = re.search(r"<span>(.*?)</span>", article, re.S)
            price = re.search(r"<p>\s*<b>(.*?)</b>(.*?)</p>", article, re.S)
            members.append(
                {
                    "ticker": ticker.group(1),
                    "role": text(role.group(1)) if role else None,
                    "price": text(price.group(1)) if price else None,
                    # "provisional" and similar qualifiers ride in the tail.
                    "qualifier": text(price.group(2)) if price else None,
                }
            )

    return {
        "kicker": text(kicker.group(1)) if kicker else None,
        "title": text(title.group(1)),
        "thesis": sanitize(text(thesis.group(1))) if thesis else None,
        "timeline": timeline,
        "members": members,
    }


def directory_tickers() -> set[str]:
    """Tickers the company directory actually carries.

    Used only to disambiguate a row that names a company more than one way.
    Read best-effort: on a fresh clone the directory has not been built yet,
    and a missing file must not stop the scanner report from publishing.
    """
    published = REPO / "public" / "data" / "v1" / "companies.json"
    try:
        doc = json.loads(published.read_text(encoding="utf-8"))
        return {c["ticker"] for c in doc.get("companies", []) if c.get("ticker")}
    except (OSError, json.JSONDecodeError, KeyError, TypeError):
        return set()


def parse_date(raw: str, year: int) -> str | None:
    m = re.match(r"(\d{1,2})\s+(\w+)", raw.strip())
    if not m:
        return None
    day, month = int(m.group(1)), MONTHS.get(m.group(2))
    return f"{year:04d}-{month:02d}-{day:02d}" if month else None


def rubric(html: str) -> list[dict]:
    """The nine scoring components and their weights, from the page itself.

    The report publishes how a name is scored — five components that add
    evidence, four that subtract for being late or already too risky. The app
    showed a bare "8/13" with no way to learn what the 13 are; carrying the
    criteria across lets the score explain itself (spec §50).
    """
    rows = re.search(r'<ul class="div-rows scoring-rows".*?</ul>', html, re.S)
    if not rows:
        return []

    items = []
    for m in re.finditer(
        r'<span class="div-name">(.*?)(?:<small>(.*?)</small>)?</span>.*?'
        r'<b class="div-val [^"]*">([+\-−]\d+)</b>',
        rows.group(0),
        re.S,
    ):
        label = text(m.group(1))
        # The <small> sits inside the name span, so strip it off the label.
        if m.group(2):
            label = text(m.group(1).split("<small>")[0])
        items.append(
            {
                "label": label,
                "detail": text(m.group(2)) if m.group(2) else None,
                "weight": int(m.group(3).replace("−", "-")),
            }
        )
    return items


def scoring(html: str) -> dict:
    """The bands and the explanation that go with the rubric.

    The nine components on their own do not explain the scale. The page also
    publishes the bands (+13 best, +6 the research line, −14 worst) and the
    reason the four penalties outweigh the five positives — which is the whole
    character of the test, and why most days nothing qualifies.
    """
    bands = []
    for m in re.finditer(
        r'<div class="scoring-band[^"]*"><b>([+\-−]?\d+)</b><span>([^<]+)</span></div>',
        html,
    ):
        bands.append(
            {
                "score": int(m.group(1).replace("−", "-")),
                "label": text(m.group(2)),
            }
        )
    notes = [
        text(m.group(1))
        for m in re.finditer(r'<p class="scoring-note[^"]*">(.*?)</p>', html, re.S)
    ]
    return {"bands": bands, "notes": notes}


def parse(html: str) -> dict:
    updated = re.search(r"updated\s+(\d{1,2}\s+\w+\s+\d{4})", html)
    year = int(updated.group(1).split()[-1]) if updated else 2026
    report_date = parse_date(updated.group(1), year) if updated else None

    headline = None
    if h := re.search(r"<h2[^>]*>\s*(No qualified[^<]*)</h2>", html):
        headline = text(h.group(1))

    cards = signal_cards(html)

    # The scorecard, keyed by ticker. It carries the move since the name was
    # flagged and the one-line summary; the board carries the ranking and the
    # decision. Neither is a superset of the other.
    scored = {}
    order = []
    for block in re.findall(
        r'<article class="scorecard-feature"[^>]*>(.*?)</article>', html, re.S
    ):
        ticker = re.search(r"<h4[^>]*>([A-Z]{3,6})</h4>", block)
        if not ticker:
            continue
        badge = re.search(r'<span class="result-badge[^"]*">([^<]+)</span>', block)
        meta = re.search(r"<span>([^<]*?·[^<]*?)</span>", block)
        note = re.search(r"<p>(.*?)</p>", block, re.S)
        move = re.search(
            r'<div class="scorecard-feature-move">\s*<strong>([+\-−][\d.]+%)</strong>',
            block,
        )
        score = max_score = seen = None
        if meta:
            if m2 := re.search(r"(\d+)\s*/\s*(\d+)", meta.group(1)):
                score, max_score = int(m2.group(1)), int(m2.group(2))
            seen = parse_date(meta.group(1).split("·")[0], year)
        scored[ticker.group(1)] = {
            "status_label": badge.group(1).strip() if badge else "Watch only",
            "score": score,
            "max_score": max_score,
            "seen_at": seen,
            "research_summary": sanitize(text(note.group(1))) if note else None,
            "move_percent": move.group(1).replace("−", "-") if move else None,
        }
        order.append(ticker.group(1))

    # Ranked board first, in its own order, then anything the scorecard covers
    # that the board does not.
    #
    # The board is the report's ranking and the scorecard is its results table,
    # and they do not hold the same names. Building the watch list from the
    # scorecard alone dropped AMOC — the report's number one, and the subject of
    # its own headline — out of the app completely.
    watch = []
    for ticker in sorted(cards, key=lambda t: cards[t]["rank"] or 99):
        card, extra = cards[ticker], scored.get(ticker, {})
        label = extra.get("status_label") or card.get("state") or "Watch only"
        watch.append(
            {
                "ticker": ticker,
                "rank": card.get("rank"),
                "status": BUCKETS.get(label, "watching"),
                "status_label": label,
                "state": card.get("state"),
                "score": card.get("score") or extra.get("score") or 0,
                "max_score": card.get("max_score") or extra.get("max_score") or 13,
                "seen_at": extra.get("seen_at"),
                "research_summary": extra.get("research_summary"),
                "move_percent": extra.get("move_percent"),
                "gates": card.get("gates") or [],
                "research": card.get("research") or [],
                "action": card.get("action"),
                "tape": card.get("tape"),
            }
        )
    for ticker in order:
        if ticker in cards:
            continue
        extra = scored[ticker]
        label = extra["status_label"]
        watch.append(
            {
                "ticker": ticker,
                "rank": None,
                "status": BUCKETS.get(label, "watching"),
                "status_label": label,
                "state": None,
                "score": extra["score"] or 0,
                "max_score": extra["max_score"] or 13,
                "seen_at": extra["seen_at"],
                "research_summary": extra["research_summary"],
                "move_percent": extra["move_percent"],
                "gates": [],
                "research": [],
                "action": None,
                "tape": None,
            }
        )

    known_tickers = directory_tickers()
    outcomes = []
    for block in re.findall(
        r'<article class="outcome-row([^"]*)"[^>]*>(.*?)</article>', html, re.S
    ):
        cls, body = block
        # An outcome can name more than one company — "ARVA / AMII" is one row
        # covering a pair. Requiring a lone ticker silently dropped it, so the
        # app's ledger showed 21 of the page's 22 outcomes with no warning.
        # Dropping a result is the one thing this series must never do (spec §7).
        ticker = re.search(r"<strong>\s*([A-Z][A-Z0-9 /]*[A-Z0-9])\s*</strong>", body)
        badge = re.search(r'<span class="result-badge[^"]*">([^<]+)</span>', body)
        ret = re.search(r'<strong class="outcome-return">([^<]+)</strong>', body)
        note = re.search(r"<p>(.*?)</p>", body, re.S)
        if not ticker:
            continue
        raw_name = text(ticker.group(1))
        names = re.findall(r"[A-Z]{3,6}", raw_name)
        if not names:
            continue
        # A paired row is written in the report's own order, which is not
        # necessarily the exchange's. "ARVA / AMII" names the same company
        # twice — the scan lists it as AMII — so linking to the first would
        # open a company screen for a ticker the directory has never heard of.
        primary = next((n for n in names if n in known_tickers), names[0])
        label = badge.group(1).strip() if badge else ""
        outcomes.append(
            {
                # `ticker` stays a single symbol so it can still open a company;
                # `label` keeps the row's own wording for display.
                "ticker": primary,
                "label": raw_name if len(names) > 1 else None,
                "status": BUCKETS.get(label, "rejected"),
                "status_label": label,
                "return_percent": text(ret.group(1)).replace("−", "-") if ret else None,
                "direction": "up" if "outcome-up" in cls else "down",
                "note": sanitize(text(note.group(1))) if note else None,
            }
        )

    # The masthead's "updated" line lags the cards — the note says 6 August
    # while the cohort is dated 12 August. The honest "last updated" is the
    # newest date the report actually carries.
    seen = [w["seen_at"] for w in watch if w.get("seen_at")]
    last_updated = max(seen + ([report_date] if report_date else [])) if (
        seen or report_date
    ) else None

    return {
        "date": last_updated,
        "masthead_date": report_date,
        "headline": headline,
        "rubric": rubric(html),
        "scoring": scoring(html),
        "sector": sector_context(html),
        "watch": watch,
        "outcomes": outcomes,
    }


def validate(doc: dict, html: str | None = None) -> list[str]:
    problems = []

    # Every outcome row on the page must reach the app.
    #
    # An "ARVA / AMII" row — one result covering a pair — matched no single
    # ticker and was skipped in silence, so the ledger published 21 of 22 and
    # the build reported success. Deleting a result is the one thing this series
    # exists not to do (spec §7), so a count mismatch fails the build.
    if html is not None:
        rows = len(re.findall(r'<article class="outcome-row', html))
        if rows != len(doc["outcomes"]):
            problems.append(
                f"page has {rows} outcome rows but only "
                f"{len(doc['outcomes'])} parsed — a result is being dropped"
            )

        # Every ranked card must reach the app.
        #
        # The page is rewritten often, and each rewrite has quietly cost the app
        # something: the ranked board appeared and the watch list kept coming
        # from the scorecard, so AMOC — the report's own number one, and the
        # subject of its headline — was absent from the app entirely while the
        # build reported success. A parser that finds nothing must fail, not
        # shrug.
        cards = len(re.findall(r'<article class="signal-card', html))
        ranked = sum(1 for w in doc["watch"] if w.get("rank"))
        if cards and ranked < cards:
            problems.append(
                f"page ranks {cards} names but only {ranked} carry a rank — "
                "the signal board markup has changed"
            )
        decided = sum(1 for w in doc["watch"] if w.get("action"))
        if cards and not decided:
            problems.append(
                "no decisions parsed from the signal board — the action markup "
                "has changed and the app would show scores with no reasoning"
            )
    if not doc["date"]:
        problems.append("no report date found")
    if not doc["watch"] and not doc["outcomes"]:
        problems.append("nothing parsed — the page format has changed")
    for w in doc["watch"]:
        if not 0 <= w["score"] <= w["max_score"]:
            problems.append(f"{w['ticker']}: score {w['score']}/{w['max_score']}")
    # The sanitiser should already have removed these; this is the backstop
    # that stops a format change from quietly republishing them.
    #
    # It sweeps every published string rather than two named fields. The page is
    # rewritten often — the signal board, the gates and the sector block all
    # arrived in one afternoon — and a backstop that only knows the fields that
    # existed when it was written stops being a backstop the moment a new one
    # appears.
    def strings(node) -> list[str]:
        if isinstance(node, str):
            return [node]
        if isinstance(node, dict):
            return [s for v in node.values() for s in strings(v)]
        if isinstance(node, list):
            return [s for v in node for s in strings(v)]
        return []

    # Everything that gets published, not just the parts that get sanitised.
    #
    # `rubric`, `scoring` and `headline` are read straight off the page and
    # never pass through sanitize(), because they describe the method rather
    # than a name. That makes them the *only* published strings with no filter
    # in front of them — so a stop or a target written into the hand-maintained
    # scoring panel would have gone out unexamined. They are checked here
    # instead of sanitised, because silently rewriting a description of the
    # method would be worse than refusing to publish it.
    subjects = (
        doc["watch"]
        + doc["outcomes"]
        + ([doc["sector"]] if doc["sector"] else [])
        + doc["rubric"]
        + [doc["scoring"], {"title": "headline", "text": doc["headline"] or ""}]
    )

    for item in subjects:
        label = item.get("ticker") or item.get("title") or "document"
        for value in strings(item):
            blob = value.lower()
            # "No holding period — no entry." is deliberately kept; it records
            # the absence of a trade rather than instructing one.
            blob = blob.replace("no holding period", "").replace("no entry", "")
            for word in BANNED:
                if word in blob:
                    problems.append(f"{label}: trade mechanics survived ({word!r})")
            for pattern in BANNED_PATTERNS:
                if pattern.search(blob):
                    problems.append(
                        f"{label}: trade mechanics survived ({pattern.pattern!r})"
                    )
    return problems


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    if not SOURCE.exists():
        sys.exit(f"error: {SOURCE} not found")

    source = SOURCE.read_text(encoding="utf-8")
    doc = parse(source)
    problems = validate(doc, source)

    qualified = [w for w in doc["watch"] if w["status"] == "qualified"]
    watching = [w for w in doc["watch"] if w["status"] == "watching"]
    rejected = [w for w in doc["watch"] if w["status"] == "rejected"]

    payload = {
        "date": doc["date"],
        "masthead_date": doc["masthead_date"],
        "headline": doc["headline"],
        "rubric": doc["rubric"],
        "scoring": doc["scoring"],
        "sector": doc["sector"],
        "coverage": {"thndr": 224, "egx": 293, "adjusted_histories": 221},
        "summary": {
            "qualified": len(qualified),
            "watching": len(watching),
            "rejected": len(rejected),
        },
        "qualified": qualified,
        "watching": watching,
        "rejected": rejected,
        "outcomes": doc["outcomes"],
    }

    print(f"updated  {doc['date']}  (masthead says {doc['masthead_date']})")
    print(f"rubric   {len(doc['rubric'])} components, "
          f"{len(doc['scoring']['bands'])} bands, "
          f"{len(doc['scoring']['notes'])} notes")
    if doc["headline"]:
        print(f"headline {doc['headline']}")
    if doc["sector"]:
        s = doc["sector"]
        print(f"sector   {s['title']}  "
              f"({len(s['members'])} names, {len(s['timeline'])} evidence rows)")
    print(f"watch    {len(doc['watch'])}  ({len(qualified)} qualified, "
          f"{len(watching)} watching, {len(rejected)} rejected)")
    for w in doc["watch"]:
        gates = w.get("gates") or []
        passed = sum(1 for g in gates if g["outcome"] == "pass")
        detail = f"  {passed}/{len(gates)} gates" if gates else ""
        research = f", {len(w['research'])} para" if w.get("research") else ""
        print(f"   {w['ticker']:5} {w['score']:>2}/{w['max_score']}  "
              f"{w['status_label']}{detail}{research}")
    print(f"outcomes {len(doc['outcomes'])}")
    for o in doc["outcomes"][:6]:
        print(f"   {o['ticker']:5} {str(o['return_percent']):>8}  {o['status_label']}")
    if len(doc["outcomes"]) > 6:
        print(f"   … {len(doc['outcomes']) - 6} more")

    if problems:
        print("\nvalidation problems:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        print("refusing to write; last good dataset preserved", file=sys.stderr)
        return 1

    if args.check:
        print("\nok, nothing written")
        return 0

    for root in (OUT, FIXTURES):
        root.mkdir(parents=True, exist_ok=True)
        body = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
        (root / "latest.json").write_text(body, encoding="utf-8")
        if doc["date"]:
            hist = root / "history"
            hist.mkdir(exist_ok=True)
            (hist / f"{doc['date']}.json").write_text(body, encoding="utf-8")
    print(f"\nwrote {(OUT / 'latest.json').relative_to(REPO)} and the app fixture")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
