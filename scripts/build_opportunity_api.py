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


def text(html: str) -> str:
    """Strip tags and collapse whitespace."""
    return " ".join(re.sub(r"<[^>]+>", " ", html).split())


BANNED = ("hard stop", "exit below", "buyer price", "review session",
          "holding period", "holding horizon")


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
    keep = []
    # Split on sentence ends *and* on em-dashes and semicolons: the report
    # often appends a stop or a review date as a clause rather than a sentence.
    for sentence in re.split(r"(?<=[.!?])\s+|\s+—\s+|;\s+", note):
        low = sentence.lower()
        if "no holding period" in low or "no entry" in low:
            keep.append(sentence)
            continue
        if any(word in low for word in BANNED):
            continue
        keep.append(sentence)
    cleaned = " ".join(keep).strip()
    return cleaned or None


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

    watch = []
    for block in re.findall(
        r'<article class="scorecard-feature"[^>]*>(.*?)</article>', html, re.S
    ):
        ticker = re.search(r"<h4[^>]*>([A-Z]{3,6})</h4>", block)
        badge = re.search(r'<span class="result-badge[^"]*">([^<]+)</span>', block)
        meta = re.search(r"<span>([^<]*?·[^<]*?)</span>", block)
        note = re.search(r"<p>(.*?)</p>", block, re.S)
        move = re.search(
            r'<div class="scorecard-feature-move">\s*<strong>([+\-−][\d.]+%)</strong>',
            block,
        )
        if not ticker:
            continue

        score = max_score = None
        seen = None
        if meta:
            if s := re.search(r"(\d+)\s*/\s*(\d+)", meta.group(1)):
                score, max_score = int(s.group(1)), int(s.group(2))
            seen = parse_date(meta.group(1).split("·")[0], year)

        label = badge.group(1).strip() if badge else "Watch only"
        watch.append(
            {
                "ticker": ticker.group(1),
                "status": BUCKETS.get(label, "watching"),
                "status_label": label,
                "score": score if score is not None else 0,
                "max_score": max_score or 13,
                "seen_at": seen,
                "research_summary": sanitize(text(note.group(1))) if note else None,
                "move_percent": move.group(1).replace("−", "-") if move else None,
            }
        )

    outcomes = []
    for block in re.findall(
        r'<article class="outcome-row([^"]*)"[^>]*>(.*?)</article>', html, re.S
    ):
        cls, body = block
        ticker = re.search(r"<strong>([A-Z]{3,6})</strong>", body)
        badge = re.search(r'<span class="result-badge[^"]*">([^<]+)</span>', body)
        ret = re.search(r'<strong class="outcome-return">([^<]+)</strong>', body)
        note = re.search(r"<p>(.*?)</p>", body, re.S)
        if not ticker:
            continue
        label = badge.group(1).strip() if badge else ""
        outcomes.append(
            {
                "ticker": ticker.group(1),
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
        "watch": watch,
        "outcomes": outcomes,
    }


def validate(doc: dict) -> list[str]:
    problems = []
    if not doc["date"]:
        problems.append("no report date found")
    if not doc["watch"] and not doc["outcomes"]:
        problems.append("nothing parsed — the page format has changed")
    for w in doc["watch"]:
        if not 0 <= w["score"] <= w["max_score"]:
            problems.append(f"{w['ticker']}: score {w['score']}/{w['max_score']}")
    # The sanitiser should already have removed these; this is the backstop
    # that stops a format change from quietly republishing them.
    for item in doc["watch"] + doc["outcomes"]:
        blob = (item.get("research_summary") or item.get("note") or "").lower()
        # "No holding period — no entry." is deliberately kept; it records the
        # absence of a trade rather than instructing one.
        blob = blob.replace("no holding period", "")
        for word in BANNED:
            if word in blob:
                problems.append(f"{item['ticker']}: trade mechanics survived ({word!r})")
    return problems


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    if not SOURCE.exists():
        sys.exit(f"error: {SOURCE} not found")

    doc = parse(SOURCE.read_text(encoding="utf-8"))
    problems = validate(doc)

    qualified = [w for w in doc["watch"] if w["status"] == "qualified"]
    watching = [w for w in doc["watch"] if w["status"] == "watching"]
    rejected = [w for w in doc["watch"] if w["status"] == "rejected"]

    payload = {
        "date": doc["date"],
        "masthead_date": doc["masthead_date"],
        "headline": doc["headline"],
        "rubric": doc["rubric"],
        "scoring": doc["scoring"],
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
    print(f"watch    {len(doc['watch'])}  ({len(qualified)} qualified, "
          f"{len(watching)} watching, {len(rejected)} rejected)")
    for w in doc["watch"]:
        print(f"   {w['ticker']:5} {w['score']:>2}/{w['max_score']}  {w['status_label']}")
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
