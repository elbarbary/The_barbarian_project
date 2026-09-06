#!/usr/bin/env python3
"""Sessions where a share traded far more than it usually does — and WHEN.

The site has always been able to say which shares are busy *today*: the market
document carries a session volume, the company row carries a twenty-session
median, and the ratio between them is the whole of it. What it could not say is
when. Every row on the unusual-volume screen came from one session — today's —
so there was no date to show and nothing to compare against, and a reader
watching it across a morning saw the same handful of names and concluded the
list was stuck. The list was not stuck. Measured over the last eight sessions,
the eight most unusual names turn over almost completely from one day to the
next: only two or three of eight repeat. What was missing was the date that
would have shown it moving.

So this reads the committed daily bars — `data-source/prices/<TICKER>.json`,
date, close and volume, going back years — and writes the sessions where a
share's volume reached `THRESHOLD` times its own trailing median. Most recent
session first, and within a session the most unusual first.

**Against its own median, never against the market.** The exchange's largest
names trade tens of millions of shares on a quiet day; ordering by raw volume
would print the same two or three companies every session — AIH and AIDC lead
six of the last eight days that way — which is the very complaint this exists
to answer. `rv` is what makes a small company's tenfold morning visible beside
a giant's ordinary one.

The median EXCLUDES the session being judged, or a share that trades once a
month scores itself against a window it dominates. Sessions with too few
observations behind them are not published at all: a ratio against four days
is arithmetic, not a normal.
"""

from __future__ import annotations

import argparse
import collections
import datetime
import json
import pathlib
import statistics

REPO = pathlib.Path(__file__).resolve().parent.parent
BARS = REPO / "data-source" / "prices"
API = REPO / "public" / "data" / "v1"
FIXTURES = REPO / "app" / "assets" / "fixtures"
NAME = "volume-events.json"

# Twice the usual is the same bar the market screen has always used, so the two
# views agree about what counts as unusual.
THRESHOLD = 2.0
# The window a session is judged against, and the fewest observations that make
# it a window rather than an anecdote.
WINDOW = 20
ENOUGH = 10
# How many sessions to publish, and the most rows to keep for any one of them.
# A day where two hundred names doubled is a market-wide event, not two hundred
# company stories, and no reader scrolls that far.
SESSIONS = 10
PER_SESSION = 40


def daily_bars(directory: pathlib.Path) -> dict[str, list[dict]]:
    """Every company's daily bars, keyed by ticker."""
    out: dict[str, list[dict]] = {}
    for path in sorted(directory.glob("*.json")):
        try:
            body = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        rows = body if isinstance(body, list) else (body.get("bars") or body.get("rows"))
        if isinstance(rows, list) and rows:
            out[path.stem] = rows
    return out


def unusual(rows: list[dict], threshold: float = THRESHOLD) -> list[dict]:
    """The sessions in one company's record that stand out against its own."""
    found = []
    volumes = [r.get("volume") for r in rows]
    for i in range(WINDOW, len(rows)):
        window = [v for v in volumes[i - WINDOW:i] if isinstance(v, (int, float)) and v > 0]
        volume = volumes[i]
        if len(window) < ENOUGH:
            continue
        if not isinstance(volume, (int, float)) or volume <= 0:
            continue
        median = statistics.median(window)
        if median <= 0 or volume / median < threshold:
            continue
        date = str(rows[i].get("date") or "")
        if not date:
            continue
        found.append({
            "date": date,
            "times": round(volume / median, 1),
            "volume": int(volume),
            "usual": int(median),
            "close": rows[i].get("close"),
        })
    return found


def build(bars: dict[str, list[dict]], sessions: int = SESSIONS) -> dict:
    by_day: dict[str, list[dict]] = collections.defaultdict(list)
    for ticker, rows in bars.items():
        for event in unusual(rows):
            by_day[event.pop("date")].append({"ticker": ticker, **event})

    days = sorted(by_day, reverse=True)[:sessions]
    out = []
    for day in days:
        # Most unusual first within the session, and the ticker as a
        # tie-break so a rebuild of the same data produces the same document.
        rows = sorted(by_day[day], key=lambda e: (-e["times"], e["ticker"]))
        out.append({
            "date": day,
            "counted": len(by_day[day]),
            "companies": rows[:PER_SESSION],
        })
    return {
        "generated_at": datetime.datetime.now(datetime.UTC)
        .replace(microsecond=0).isoformat().replace("+00:00", "+00:00"),
        "threshold": THRESHOLD,
        "window_sessions": WINDOW,
        # Said plainly, because the screen shows it to a reader who has not
        # met the phrase "relative volume".
        "measure": "A session's traded shares against this company's own "
                   "median over the previous 20 sessions.",
        "measure_ar": "عدد الأسهم المتداولة في الجلسة مقارنةً بوسيط "
                      "الشركة نفسها خلال ٢٠ جلسة سابقة.",
        "sessions": out,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sessions", type=int, default=SESSIONS)
    parser.add_argument("--check", action="store_true",
                        help="report what would be written and write nothing")
    args = parser.parse_args()

    bars = daily_bars(BARS)
    if not bars:
        print(f"── Unusual volume: no daily bars under {BARS} — nothing written")
        return 0

    doc = build(bars, args.sessions)
    if not doc["sessions"]:
        print("── Unusual volume: no session cleared the threshold — nothing written")
        return 0

    print("── Unusual volume")
    for session in doc["sessions"][:5]:
        top = session["companies"][0] if session["companies"] else None
        lead = f"{top['ticker']} {top['times']}×" if top else "—"
        print(f"   {session['date']}  {session['counted']:3} companies   most unusual: {lead}")

    if args.check:
        return 0

    body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    for directory in (API, FIXTURES):
        directory.mkdir(parents=True, exist_ok=True)
        (directory / NAME).write_text(body, encoding="utf-8")
    print(f"\nwrote {API / NAME} and the app fixture")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
