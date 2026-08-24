#!/usr/bin/env python3
"""Read the dates out of an EGX filing without guessing the wrong one.

The exchange writes `DD/MM/YYYY` most of the time and `MM/DD/YYYY` some of the
time, in the same feed, in every year of the archive. Measured over 191,484
filings: 165,890 dates are unambiguously day-first, **968 are unambiguously
month-first**, and 95,607 could be read either way. The month-first ones are not
a historical quirk that stopped — 2025 has more of them than 2013.

Three ways to be wrong, and only one of them is loud:

  * Parse `03/31/2013` as day-first and it raises, so the date is dropped. That
    is the quiet loss this module exists to stop.
  * Parse `01/02/2026` as month-first when it meant 1 February and the date is
    off by eleven months, silently, on a screen that says when a dividend pays.
  * Guess per-date and a single filing can end up with a period running
    backwards.

So the format is decided **per filing, not per date**. Every date in the text
votes: any date with a day above twelve proves that filing's format, and the
proof is applied to its ambiguous siblings. Only when a filing offers no proof
at all does it fall back to day-first, which is what 99.4% of provable filings
turn out to be.
"""

from __future__ import annotations

import datetime
import re

DATE = re.compile(r"\b(\d{1,2})/(\d{1,2})/(20\d{2})\b")


def detect_order(text: str) -> str:
    """`day_first`, `month_first`, or `day_first` when the text cannot say."""
    day_first = month_first = 0
    for a, b, _ in DATE.findall(text or ""):
        a, b = int(a), int(b)
        if a > 12 and b <= 12:
            day_first += 1
        elif b > 12 and a <= 12:
            month_first += 1
    if month_first > day_first:
        return "month_first"
    return "day_first"


def parse(raw: str, order: str) -> datetime.date | None:
    """One `DD/MM/YYYY`-shaped string, read in the given order.

    Returns None rather than raising: a date this cannot read is a row to skip,
    never a reason to lose the filing it came from.
    """
    match = DATE.fullmatch(raw.strip()) if raw else None
    if not match:
        return None
    a, b, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
    day, month = (b, a) if order == "month_first" else (a, b)
    # An impossible reading in the chosen order is retried the other way before
    # being given up on — a filing whose format was inferred from one sibling
    # can still contain a stray in the other.
    for d, m in ((day, month), (month, day)):
        try:
            return datetime.date(year, m, d)
        except ValueError:
            continue
    return None


def find_all(text: str) -> list[datetime.date]:
    """Every date in the text, read in that text's own order, in order of
    appearance."""
    order = detect_order(text)
    out = []
    for a, b, y in DATE.findall(text or ""):
        when = parse(f"{a}/{b}/{y}", order)
        if when:
            out.append(when)
    return out


def after_label(text: str, *labels: str) -> datetime.date | None:
    """The date following one of these field labels, in the text's own order.

    The labels are matched loosely on internal spacing because the exchange's
    template varies ("Ex-Dividend Date", "Ex Dividend Date").
    """
    order = detect_order(text)
    for label in labels:
        pattern = re.compile(
            re.escape(label).replace(r"\ ", r"\s*") + r"\s*:?\s*(\d{1,2}/\d{1,2}/20\d{2})",
            re.IGNORECASE,
        )
        found = pattern.search(text or "")
        if found:
            return parse(found.group(1), order)
    return None
