#!/usr/bin/env python3
"""Connecting the dots — where a company shows up more than once on one day.

Everything this app publishes is filed under the surface it came from. The
filings are in the filings feed, the headlines are in the news feed, and the
session numbers are on the company screen — so a reader who wants to know that
Mixed Oils filed with the exchange, appeared in the press, and traded three
times its normal volume, all on the same day, has to notice it themselves
across three screens.

This joins them. Nothing here is new information: every strand is a document
already published, and the sentence is the strands counted.

**And it says what the crossing has in common**, which is the part that was
missing. The old sentence named the feeds — "filed with the exchange, was
written about, and traded 3.45× its own normal volume" — and stopped. A reader
looking at three documents wants the thing they share, and the material to say
it was already on disk and unread: every filing carries a 23-key event
taxonomy with a person-written meaning, the same taxonomy makes same-day
clusters countable across companies, the directory carries a sector for 256 of
280 names, and the per-company archive goes back to May 2025.

So each card now carries a second sentence built from counts:

    "Nine companies filed an insider dealing form that day."
    "Its second in one day."
    "Three of the nine are in the same sector."

Those are joins over published documents, not predictions, and every one of
them is a number a reader can go and check.

**The grammar is bounded on purpose.** `test_connections.py` enumerates every
sentence this file can emit and runs the §8 guard over all of them, which only
works while the sentence space is finite. Each clause below has a fixed shape
with numbers substituted, so the space stays enumerable — that is the
constraint any future clause has to meet, and it is why nothing here is
drafted by a model (§43).

**It states what happened, never what it means for a price.** "MICH filed with
the exchange, was written about, and traded 3.45× its own normal volume" is
three published facts and the word "and". "MICH filed with the exchange, so it
is about to move" is a prediction, and this publisher holds no FRA licence
(§8). The templates below stop at the join, and `macro_types.directive` is run
over every sentence this file can produce before any of them ship.

A company needs **at least two different kinds** of strand to appear. One
filing on its own is the filings feed; one headline on its own is the news
feed. The dot only exists where the lines cross.

Usage:
    python3 scripts/build_connections_api.py [--check]
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import filing_types  # noqa: E402
import macro_types  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
API = REPO / "public" / "data" / "v1"
FIXTURES = REPO / "app" / "assets" / "fixtures"
OUT = API / "connections.json"

# How far back a strand can be and still be part of the same story.
#
# The exchange does not trade on Friday or Saturday, so a Sunday reader looking
# at a Thursday filing beside a Thursday headline is looking at one day's news.
# Wider than that and this becomes a list of everything a company has ever
# done, which is the company screen.
WINDOW_DAYS = 4

# The band a session has to clear to count as a strand of its own — the same
# 2× the rest of the app uses, published on every card that shows it.
UNUSUAL_VOLUME = 2.0

# Not every company, and not a leaderboard.
#
# Ordered by how many strands crossed and then by how unusual the session was,
# because that is the order the evidence supports. Capped so the section stays
# something a reader finishes.
MAX_ITEMS = 8


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def isolate(value: str) -> str:
    return f"⁨{value}⁩"

# Numbers as words, so a count reads as prose rather than opening with a
# numeral. Past twelve the numeral is clearer than the word.
_EN_WORDS = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six",
    7: "seven", 8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve",
}


def count_en(n: int) -> str:
    return _EN_WORDS.get(n, str(n))




# Arabic counts its nouns three different ways and the noun itself changes with
# the number, so these are written per phrase rather than composed from a
# numeral and a word. Two takes the dual; three to ten takes a feminine
# numeral with a plural noun; eleven and up takes a numeral with a singular.
_AR_3_10_F = {3: "ثلاث", 4: "أربع", 5: "خمس", 6: "ست",
              7: "سبع", 8: "ثماني", 9: "تسع", 10: "عشر"}
_AR_3_10_M = {3: "ثلاثة", 4: "أربعة", 5: "خمسة", 6: "ستة",
              7: "سبعة", 8: "ثمانية", 9: "تسعة", 10: "عشرة"}


def ar_companies(n: int) -> str:
    if n == 2:
        return "شركتان"
    if n in _AR_3_10_F:
        return f"{_AR_3_10_F[n]} شركات"
    return f"{n} شركة"


def ar_outlets(n: int) -> str:
    if n == 2:
        return "جهتان"
    if n in _AR_3_10_F:
        return f"{_AR_3_10_F[n]} جهات"
    return f"{n} جهة"


def ar_filings(n: int) -> str:
    if n == 2:
        return "إفصاحين"
    if n in _AR_3_10_M:
        return f"{_AR_3_10_M[n]} إفصاحات"
    return f"{n} إفصاحًا"


def ar_of_them(n: int) -> str:
    if n == 2:
        return "اثنتان"
    return _AR_3_10_F.get(n, str(n))


def sentence(
    ticker: str,
    kinds: set[str],
    ratio: float | None,
    change: float | None,
    event_label: str | None,
    event_label_ar: str | None,
    outlets: int,
) -> tuple[str, str]:
    """What crossed, in both languages. Facts joined by "and", and nothing else."""
    parts_en: list[str] = []
    parts_ar: list[str] = []
    if "filing" in kinds:
        # The filing's own type, where every filing in the window shares one.
        # More use than "filed with the exchange", and it is the exchange's own
        # word for the thing.
        parts_en.append(
            f"filed {event_label}" if event_label else "filed with the exchange"
        )
        parts_ar.append(
            f"أودعت {event_label_ar}" if event_label_ar
            else "أودعت إفصاحًا لدى البورصة"
        )
    if "news" in kinds:
        if outlets > 1:
            parts_en.append(f"was written about by {count_en(outlets)} outlets")
            parts_ar.append(f"كتبت عنها {ar_outlets(outlets)}")
        else:
            parts_en.append("was written about in the press")
            parts_ar.append("كُتب عنها في الصحافة")
    if "session" in kinds and ratio:
        # The move belongs beside the multiple. It shipped as `null` on every
        # session strand for the life of this file, because the builder read
        # `change_percent` from the company document, which does not carry it
        # — the value was one file away in `market.json` all along.
        moved_en = moved_ar = ""
        if change is not None:
            pct = f"{abs(change) * 100:.2f}%"
            up = change >= 0
            moved_en = f", closing {'up' if up else 'down'} {pct}"
            moved_ar = f"، وأغلقت {'مرتفعة' if up else 'منخفضة'} {isolate(pct)}"
        parts_en.append(f"traded {ratio:.2f}× its own normal volume{moved_en}")
        parts_ar.append(
            f"تداولت {isolate(f'{ratio:.2f}×')} حجمها المعتاد{moved_ar}"
        )

    # A session strand only exists where the ratio cleared the band, so an
    # empty clause list is unreachable from `main` — but `sentence` is a
    # public function and the exhaustive test calls it with every combination,
    # including `{"session"}` with no ratio, which used to raise IndexError
    # inside the joiner. Nothing to say is said by saying nothing.
    if not parts_en:
        return "", ""

    def join_en(parts: list[str]) -> str:
        if len(parts) == 1:
            return parts[0]
        return f"{', '.join(parts[:-1])} and {parts[-1]}"

    def join_ar(parts: list[str]) -> str:
        # The waw attaches to the word it joins — "وتداولت", not "و تداولت".
        if len(parts) == 1:
            return parts[0]
        return f"{'، '.join(parts[:-1])} و{parts[-1]}"

    en = f"{ticker} {join_en(parts_en)}, within four days."
    ar = f"{isolate(ticker)} {join_ar(parts_ar)}، خلال أربعة أيام."
    return en, ar


def insight(
    peers: int,
    event_label: str | None,
    event_label_ar: str | None,
    filings: int,
    same_sector: int,
) -> tuple[str, str]:
    """The thing the strands have in common, as counts over published files.

    Every clause is a number a reader can check by opening the filings feed and
    counting. None of them says what any of it means for a price — this is the
    join, and it stops at the join (§8).
    """
    en: list[str] = []
    ar: list[str] = []

    # The peer clause — the one that turns a card about one company into a
    # fact about the day.
    if peers >= 1 and event_label:
        total = peers + 1
        en.append(
            f"{count_en(total).capitalize()} companies filed {event_label} "
            "that day."
        )
        ar.append(f"أودعت {ar_companies(total)} {event_label_ar} في اليوم نفسه.")
        if same_sector >= 2:
            en.append(
                f"{count_en(same_sector).capitalize()} of them are in the "
                "same sector."
            )
            ar.append(f"{ar_of_them(same_sector)} منها في القطاع نفسه.")

    # And what this company itself did more than once.
    if filings > 1:
        en.append(f"This one filed {count_en(filings)} in the window.")
        ar.append(f"وقد أودعت هذه الشركة {ar_filings(filings)} في هذه الفترة.")

    return " ".join(en), " ".join(ar)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    print("── Connecting the dots")

    today = datetime.date.today()
    cutoff = (today - datetime.timedelta(days=WINDOW_DAYS)).isoformat()

    strands: dict[str, list[dict]] = {}

    # The directory, for names and sectors. The card showed a four-letter
    # ticker and nothing else; 256 of 280 companies have a sector on file and
    # it is what makes the peer clause say something.
    directory = load(API / "companies.json").get("companies") or []
    profile_of = {c["ticker"]: c for c in directory if c.get("ticker")}

    # Filings, from the window document.
    filings = load(API / "disclosures" / "latest.json").get("items") or []

    # How many companies filed the same kind of thing on the same day, and how
    # many of those share a sector. This is the whole point of the second
    # sentence: a card about one company becomes a fact about the day.
    #
    # Counted over the entire feed, not just the companies that made the cut —
    # "nine companies filed an insider form" is a claim about the exchange, and
    # narrowing it to our eight cards would understate it.
    same_day: dict[tuple[str, str], set[str]] = {}
    for item in filings:
        event = item.get("event")
        if not event or event == "other":
            continue
        for ticker in item.get("tickers") or []:
            same_day.setdefault((item.get("date", ""), event), set()).add(ticker)

    for item in filings:
        if item.get("date", "") < cutoff:
            continue
        for ticker in item.get("tickers") or []:
            strands.setdefault(ticker, []).append(
                {
                    "kind": "filing",
                    "id": item["id"],
                    "date": item["date"],
                    "title": item.get("title_en") or item.get("title", ""),
                    "title_ar": item.get("title", ""),
                    "link": item.get("link", ""),
                    # Carried so the sentence can name the filing's own type
                    # and find its peers. Not rendered as a strand field.
                    "_event": item.get("event"),
                    "_event_label": item.get("event_label"),
                    "_event_label_ar": item.get("event_label_ar"),
                }
            )

    # Headlines that name a listed company.
    stories = load(API / "news" / "latest.json").get("items") or []
    for item in stories:
        published = (item.get("published") or "")[:10]
        if published and published < cutoff:
            continue
        for ticker in item.get("tickers") or []:
            strands.setdefault(ticker, []).append(
                {
                    "kind": "news",
                    "id": item["id"],
                    "date": published,
                    "title": item.get("headline_en") or item.get("headline", ""),
                    "title_ar": item.get("headline", ""),
                    "link": (item.get("sources") or [{}])[0].get("link", ""),
                    # A story three papers carried is better established than
                    # one a single paper ran, and the feed already knows which.
                    "_outlets": len(item.get("sources") or []),
                }
            )

    # And the session itself, where it was outside the company's own band.
    #
    # `change_percent` comes from market.json rather than from the company
    # document: the company file's `market` block carries close, date, open,
    # high, low and volume and no move at all, so every session strand this
    # file ever published had `"change_percent": null` in it.
    quotes = (load(API / "market.json").get("stocks") or {})
    ratios: dict[str, float] = {}
    for ticker in list(strands):
        company = load(API / "companies" / f"{ticker}.json")
        market = company.get("market") or {}
        profile = company.get("profile") or {}
        volume, median = market.get("volume"), profile.get("median_volume_20d")
        if not volume or not median:
            continue
        ratio = volume / median
        ratios[ticker] = ratio
        if ratio >= UNUSUAL_VOLUME:
            strands[ticker].append(
                {
                    "kind": "session",
                    "id": f"session-{ticker}",
                    "date": market.get("date", ""),
                    "ratio": round(ratio, 2),
                    "change_percent": (quotes.get(ticker) or {}).get(
                        "change_percent"
                    ),
                }
            )

    items: list[dict] = []
    for ticker, rows in strands.items():
        kinds = {r["kind"] for r in rows}
        # One kind is not a crossing — it is whichever feed it came from.
        if len(kinds) < 2:
            continue
        ratio = ratios.get(ticker)
        company = profile_of.get(ticker) or {}

        filed = [r for r in rows if r["kind"] == "filing"]
        # The filing's own type, but only when every filing in the window
        # agrees. Two different kinds of form is not "a" anything, and naming
        # one of them would be picking a favourite.
        events = {r.get("_event") for r in filed if r.get("_event")}
        event = events.pop() if len(events) == 1 else None
        # The phrase a sentence wants, not the chip. "Results" is a fine
        # chip and "filed a results" is not English, so filing_types carries
        # the noun phrase with its article and plurality already decided.
        label = filing_types.filed_as(event) if event else None
        label_ar = filing_types.filed_as_ar(event) if event else None

        # The peers: other companies that filed the same kind of thing on the
        # same day. Counted on the day this company filed, not across the
        # window, because "that day" is what the sentence claims.
        peers: set[str] = set()
        if event:
            for row in filed:
                peers |= same_day.get((row.get("date", ""), event), set())
            peers.discard(ticker)
        sector = company.get("sector")
        same_sector = (
            sum(
                1
                for peer in peers | {ticker}
                if (profile_of.get(peer) or {}).get("sector") == sector
            )
            if sector
            else 0
        )

        outlets = max(
            (r.get("_outlets") or 1 for r in rows if r["kind"] == "news"),
            default=1,
        )
        change = next(
            (r.get("change_percent") for r in rows if r["kind"] == "session"),
            None,
        )

        why, why_ar = sentence(
            ticker, kinds, ratio, change, label, label_ar, outlets
        )
        note, note_ar = insight(len(peers), label, label_ar, len(filed), same_sector)

        # Both sentences go through the §8 guard. The templates are fixed, so
        # a hit means somebody changed one — which is exactly when a sentence
        # stops being safe.
        if not why:
            # Unreachable while a session strand implies a ratio; here so it
            # stays unreachable rather than shipping an empty card.
            print(f"   ! skipped {ticker}: nothing to say about the crossing")
            continue

        leak = macro_types.directive(why) or macro_types.directive(note)
        if leak:
            print(f"   ! refused {ticker}: reads as an instruction ({leak!r})")
            continue

        rows.sort(key=lambda r: (r.get("date") or ""), reverse=True)
        items.append(
            {
                "ticker": ticker,
                # The card showed four letters and nothing else. 266 of 280
                # companies have an Arabic name on file.
                "name": company.get("name_en"),
                "name_ar": company.get("name_ar"),
                "sector": sector,
                "kinds": sorted(kinds),
                "event": event,
                "event_label": label,
                "event_label_ar": label_ar,
                "peers": sorted(peers),
                "same_sector": same_sector if same_sector >= 2 else 0,
                "why": why,
                "why_ar": why_ar,
                "insight": note or None,
                "insight_ar": note_ar or None,
                "ratio": round(ratio, 2) if ratio else None,
                "change_percent": change,
                # Private carriers, dropped before publishing.
                "strands": [
                    {k: v for k, v in r.items() if not k.startswith("_")}
                    for r in rows
                ],
            }
        )

    # Most kinds first, then whether there is an insight to read, then most
    # strands, then the most unusual session. A company that filed twice and
    # was written about is a denser crossing than one that filed once, and a
    # card that can say what the day had in common is worth more than one that
    # can only list its own documents.
    items.sort(
        key=lambda i: (
            len(i["kinds"]),
            1 if i["insight"] else 0,
            len(i["strands"]),
            i["ratio"] or 0,
        ),
        reverse=True,
    )
    items = items[:MAX_ITEMS]

    for item in items:
        print(f"   {item['ticker']:6} {'+'.join(item['kinds']):22} "
              f"{len(item['strands'])} strands")
    if not items:
        print("   nothing crossed in the window")

    doc = {
        "updated_at": datetime.datetime.now(datetime.UTC).isoformat(
            timespec="seconds"
        ),
        "window_days": WINDOW_DAYS,
        "threshold": UNUSUAL_VOLUME,
        "items": items,
    }
    if args.check:
        return 0

    body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    for directory in (API, FIXTURES):
        (directory / "connections.json").write_text(body, encoding="utf-8")
    print(f"\nwrote {OUT.relative_to(REPO)} ({len(items)} crossings)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
