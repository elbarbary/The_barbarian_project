#!/usr/bin/env python3
"""Build the Cash or Trash static API from the published criteria document.

Spec §25 asks for a single source that can produce both the website page and the
app's JSON without duplicated manual editing. Getting there in one step would
mean rewriting how the live `cash-or-trash.html` is generated, which §58 forbids
risking. So this is step one of two:

    step 1 (this script)  criteria.md  ->  public/data/v1/cash-or-trash/index.json
    step 2 (later)        a structured source -> both the HTML and the JSON

One direction only. The existing page is read by nobody here and written by
nothing here.

Usage:
    python3 scripts/build_cash_or_trash_api.py [--check]

    --check   parse and report, write nothing (used by CI)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CRITERIA = REPO / "public" / "evidence" / "cash-or-trash" / "criteria.md"
OUT = REPO / "public" / "data" / "v1" / "cash-or-trash" / "index.json"

# Total EGX companies covered by the series' universe. Spec §7 records the
# Thndr-tradable count as the denominator the series has always used.
UNIVERSE = 224

# The five bands, in the order spec §9 defines them.
BANDS = {
    "CASH": "cash",
    "LOOSE CHANGE": "loose_change",
    "RECYCLABLE": "recyclable",
    "TRASH": "trash",
    "TOXIC": "toxic",
}

BAND_HEADING = re.compile(r"^###\s+\S*\s*([A-Z][A-Z ]+?)\s*$", re.M)

# **MCQE — Misr Cement Qena · score +20 · 11 Aug 2026**  (optional trailing note)
ENTRY = re.compile(
    r"^\*\*(?P<ticker>[A-Z]{3,6}) — (?P<name>.+?) · score (?P<score>[+\-−]?\d+) · "
    r"(?P<date>\d{1,2} \w+ \d{4})\*\*(?P<note>.*)$",
    re.M,
)

FLAGS_LINE = re.compile(r"^Flags:\s*(.+)$", re.M)
FIRST_ITALIC = re.compile(r"^\*([^*].*?)\*\s*$", re.M)
PILLAR_ROW = re.compile(
    r"^\|\s*(?P<pillar>[A-Za-z][A-Za-z &]+?)\s*\|\s*\**(?P<score>[+\-−]?\d+)\**\s*\|\s*(?P<basis>.*?)\s*\|$",
    re.M,
)

_MONTH_NAMES = (
    "January February March April May June July August "
    "September October November December".split()
)
# The document writes dates as "6 Aug 2026"; accept the full name too.
MONTHS = {name: i + 1 for i, name in enumerate(_MONTH_NAMES)}
MONTHS.update({name[:3]: i + 1 for i, name in enumerate(_MONTH_NAMES)})


def parse_score(raw: str) -> int:
    """Scores in the document use the Unicode minus sign, not ASCII hyphen."""
    return int(raw.replace("−", "-").replace("+", ""))


def parse_date(raw: str) -> str:
    day, month_name, year = raw.split()
    month = MONTHS.get(month_name) or MONTHS.get(month_name.capitalize())
    if month is None:
        raise ValueError(f"unrecognised month in date: {raw!r}")
    return f"{int(year):04d}-{month:02d}-{int(day):02d}"


def strip_markdown(text: str) -> str:
    """Flatten emphasis and links to plain text for a summary line."""
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"`(.+?)`", r"\1", text)
    return " ".join(text.split())


@dataclass
class Entry:
    ticker: str
    name: str
    score: int
    verdict: str
    studied_at: str
    summary: str = ""
    flags: list[str] = field(default_factory=list)
    pillars: list[dict] = field(default_factory=list)
    article_url: str | None = None

    def to_json(self) -> dict:
        payload = {
            "ticker": self.ticker,
            "name": self.name,
            "score": self.score,
            "verdictId": self.verdict,
            "studied_at": self.studied_at,
        }
        if self.summary:
            payload["summary"] = self.summary
        if self.flags:
            payload["flags"] = self.flags
        if self.pillars:
            payload["pillars"] = self.pillars
        if self.article_url:
            payload["article_url"] = self.article_url
        return payload


def band_spans(text: str) -> list[tuple[str, int, int]]:
    """Return (verdict_id, start, end) for each band heading in document order."""
    spans: list[tuple[str, int, int]] = []
    matches = [m for m in BAND_HEADING.finditer(text) if m.group(1).strip() in BANDS]
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        spans.append((BANDS[m.group(1).strip()], m.end(), end))
    return spans


def article_for(ticker: str) -> str | None:
    """Link to a dedicated investigation page when one has been published."""
    candidate = f"{ticker.lower()}-investigation.html"
    return f"/{candidate}" if (REPO / "public" / candidate).exists() else None


def parse(text: str) -> list[Entry]:
    entries: list[Entry] = []

    for verdict, start, end in band_spans(text):
        section = text[start:end]
        found = list(ENTRY.finditer(section))

        for i, m in enumerate(found):
            body_end = found[i + 1].start() if i + 1 < len(found) else len(section)
            body = section[m.end() : body_end]

            flags: list[str] = []
            if fm := FLAGS_LINE.search(body):
                flags = [
                    strip_markdown(f) for f in fm.group(1).split("·") if f.strip()
                ]

            summary = ""
            if im := FIRST_ITALIC.search(body):
                summary = strip_markdown(im.group(1))

            pillars = [
                {
                    "pillar": pm.group("pillar").strip(),
                    "score": parse_score(pm.group("score")),
                    "basis": strip_markdown(pm.group("basis")),
                }
                for pm in PILLAR_ROW.finditer(body)
                if pm.group("pillar").strip().lower() != "pillar"
            ]

            entries.append(
                Entry(
                    ticker=m.group("ticker"),
                    name=strip_markdown(m.group("name")),
                    score=parse_score(m.group("score")),
                    verdict=verdict,
                    studied_at=parse_date(m.group("date")),
                    summary=summary,
                    flags=flags,
                    pillars=pillars,
                    article_url=article_for(m.group("ticker")),
                )
            )

    return entries


def validate(entries: list[Entry]) -> list[str]:
    """Refuse to publish something obviously wrong (spec §21)."""
    problems: list[str] = []

    if not entries:
        problems.append("no entries parsed — the document format has changed")

    seen: dict[str, str] = {}
    for e in entries:
        if e.ticker in seen:
            problems.append(f"{e.ticker}: appears in both {seen[e.ticker]} and {e.verdict}")
        seen[e.ticker] = e.verdict

        if not -60 <= e.score <= 60:
            problems.append(f"{e.ticker}: score {e.score} outside the -60..+60 range")

        if e.pillars:
            total = sum(p["score"] for p in e.pillars)
            if total != e.score:
                problems.append(
                    f"{e.ticker}: pillars sum to {total} but headline score is {e.score}"
                )
            if len(e.pillars) != 6:
                problems.append(f"{e.ticker}: {len(e.pillars)} pillars, expected 6")

        if not e.name:
            problems.append(f"{e.ticker}: missing company name")

    return problems


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="parse only, write nothing")
    args = parser.parse_args()

    if not CRITERIA.exists():
        print(f"error: {CRITERIA} not found", file=sys.stderr)
        return 1

    entries = parse(CRITERIA.read_text(encoding="utf-8"))
    problems = validate(entries)

    order = list(BANDS.values())
    entries.sort(key=lambda e: (order.index(e.verdict), -e.score))

    for e in entries:
        pillars = f"{len(e.pillars)} pillars" if e.pillars else "no pillar table"
        print(f"  {e.ticker:5} {e.score:+4d}  {e.verdict:12} {e.studied_at}  {pillars}")

    if problems:
        print("\nvalidation problems:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        # Spec §21: never overwrite good published data with bad.
        print("\nrefusing to write; last good dataset preserved", file=sys.stderr)
        return 1

    document = {
        "updated_at": max(e.studied_at for e in entries),
        "studied": len(entries),
        "total": UNIVERSE,
        "companies": [e.to_json() for e in entries],
    }

    if args.check:
        print(f"\nok: {len(entries)} entries parsed, nothing written")
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nwrote {OUT.relative_to(REPO)} ({len(entries)} entries)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
