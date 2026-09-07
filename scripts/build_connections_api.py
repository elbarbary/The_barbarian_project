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

**The window is the four newest published days, anchored on the documents.**
`window_end` is the newest day any document is dated — a story's Cairo date,
a filing's date, or the session's date once it has closed — and
`window_start` is three days before it. Never the clock: a Monday reader sees
Thursday to Sunday, not Friday to Monday, and "within four days" is true of
every sentence because every strand is inside those four dates. The session
thread is the close in `market.json` (volume ÷ the directory's 20-session
median) and only the close; a company with no volume or no median has no
session thread, because unmeasured is not quiet. Everything that crosses is
published — there is no cap, and `total` is the count — and Home reads the
`frontpage` block: per-feed newest and oldest dates, the day's and the seven
days' counts, the filings feed's own span, and the count sentences built here
from fixed shapes so the client never composes a number into prose.

**The grammar is bounded on purpose.** `test_connections.py` enumerates every
sentence this file can emit and runs the §8 guards over all of them, which only
works while the sentence space is finite. Each clause below has a fixed shape
with numbers substituted, so the space stays enumerable — that is the
constraint any future clause has to meet, and it is why nothing here is
drafted by a model (§43).

**It states what happened, never what it means for a price.** "MICH filed with
the exchange, was written about, and traded 3.45× its own normal volume" is
three published facts and the word "and". "MICH filed with the exchange, so it
is about to move" is a prediction, and this publisher holds no FRA licence
(§8). The templates below stop at the join, and `vet()` — `directive`,
`speculative` and `causal` from `macro_types` — is run over every sentence and
every strand title this file publishes. A sentence that fails is refused, never
edited; a title that fails ships with `title_ok: false` and its text untouched.

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
import re
import sys
import zoneinfo

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
# done, which is the company screen. Counted in dates, anchored on the newest
# published day: four dates, the newest included.
WINDOW_DAYS = 4

# The band a session has to clear to count as a strand of its own — the same
# 2× the rest of the app uses, published on every card that shows it.
UNUSUAL_VOLUME = 2.0

# The rolling span the front page counts over. Seven dates ending on the
# newest published day — never "this week", because a Sunday-start week is one
# day long on a Monday.
WEEK_DAYS = 7

# Stories are bucketed by the Cairo calendar date they ran on, the way
# data.js ymd() buckets them on the client. The UTC prefix undercounts an
# evening: a story at 22:30Z on the 6th ran on the 7th in Cairo.
CAIRO = zoneinfo.ZoneInfo("Africa/Cairo")


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def isolate(value: str) -> str:
    return f"⁨{value}⁩"


def cairo_day(published: str) -> str:
    """The Cairo calendar date a story ran on, as data.js ymd() buckets it."""
    try:
        at = datetime.datetime.fromisoformat(published.replace("Z", "+00:00"))
    except ValueError:
        return published[:10]
    if at.tzinfo is None:
        at = at.replace(tzinfo=datetime.UTC)
    return at.astimezone(CAIRO).date().isoformat()


def newest_published_day(stories: list[dict], filings: list[dict], market: dict) -> str:
    """The newest day any document is dated. The session counts once it has closed."""
    days = [cairo_day(s["published"]) for s in stories if s.get("published")]
    days += [f["date"] for f in filings if f.get("date")]
    if market.get("is_close") and market.get("date"):
        days.append(market["date"])
    return max(days) if days else ""


def days_before(day: str, n: int) -> str:
    return (datetime.date.fromisoformat(day) - datetime.timedelta(days=n)).isoformat()


def vet(text: str) -> str | None:
    """The first thing a guard finds, or None. All three, always, in this order."""
    for guard in (macro_types.directive, macro_types.speculative, macro_types.causal):
        found = guard(text or "")
        if found:
            return found
    return None


# Numbers as words, so a count reads as prose rather than opening with a
# numeral. Past twelve the numeral is clearer than the word.
_EN_WORDS = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six",
    7: "seven", 8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve",
}


def count_en(n: int) -> str:
    return _EN_WORDS.get(n, str(n))


def en_count(n: int, one: str, many: str) -> str:
    return f"{n} {one if n == 1 else many}"


# Arabic counts its nouns three different ways and the noun itself changes with
# the number, so these are written per phrase rather than composed from a
# numeral and a word. Two takes the dual; three to ten takes a feminine
# numeral with a plural noun; eleven and up takes a numeral with a singular
# accusative — except at the exact hundreds and the hundreds-and-one/two, where
# the noun is the bare singular ("400 إفصاح"), and the hundreds-and-three to
# -ten, where the plural returns ("103 شركات").
_AR_3_10_F = {3: "ثلاث", 4: "أربع", 5: "خمس", 6: "ست",
              7: "سبع", 8: "ثماني", 9: "تسع", 10: "عشر"}
_AR_3_10_M = {3: "ثلاثة", 4: "أربعة", 5: "خمسة", 6: "ستة",
              7: "سبعة", 8: "ثمانية", 9: "تسعة", 10: "عشرة"}


def ar_count(
    n: int,
    one: str,
    two: str,
    plural: str,
    singular_acc: str,
    singular: str,
    feminine: bool,
) -> str:
    words = _AR_3_10_F if feminine else _AR_3_10_M
    if n == 0:
        return f"لا {plural}"
    if n == 1:
        return one
    if n == 2:
        return two
    r = n % 100
    if 3 <= n <= 10:
        return f"{words[n]} {plural}"
    if n >= 100 and (r == 0 or r in (1, 2)):
        return f"{n} {singular}"
    if n >= 100 and 3 <= r <= 10:
        return f"{n} {plural}"
    return f"{n} {singular_acc}"


def ar_companies(n: int) -> str:
    return ar_count(n, "شركة واحدة", "شركتان", "شركات", "شركة", "شركة", True)


def ar_filings(n: int) -> str:
    return ar_count(n, "إفصاح واحد", "إفصاحين", "إفصاحات", "إفصاحًا", "إفصاح", False)


def ar_stories(n: int) -> str:
    return ar_count(n, "خبر واحد", "خبران", "أخبار", "خبرًا", "خبر", False)


def ar_outlets(n: int) -> str:
    if n == 2:
        return "جهتان"
    if n in _AR_3_10_F:
        return f"{_AR_3_10_F[n]} جهات"
    return f"{n} جهة"


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


# ── The front page's sentences ──────────────────────────────────────────────
#
# Fixed shapes with counts substituted. The date placeholders — {from} {to}
# {date} {fdate} {sdate} {nfrom} {ffrom} — are left in the published string on
# purpose: the client fills them with dayLabel (Arabic-Indic digits, Arabic
# month) and substitutes nothing else. Count agreement happens here, once, in
# both languages, so no client ever composes a number into prose.


def s_count(n: int) -> tuple[str, str]:
    """S1 — how many companies turned up in more than one place in the window."""
    if n == 0:
        return (
            "No company turned up in more than one place between {from} and {to}.",
            "لم تظهر أي شركة في أكثر من مكان بين {from} و{to}.",
        )
    en_n = "One company" if n == 1 else f"{count_en(n).capitalize()} companies"
    return (
        f"{en_n} turned up in more than one place between {{from}} and {{to}}.",
        # The verb agrees with a counted subject: the dual for two
        # («شركتان ظهرتا»), the feminine singular for one, for a plural of
        # things (3–10) and for a numeral-counted noun (11+).
        f"{ar_companies(n)} {'ظهرتا' if n == 2 else 'ظهرت'} في أكثر من مكان بين {{from}} و{{to}}.",
    )


def s_day(filings: int | None, stories: int | None) -> tuple[str, str]:
    """S3 — the newest day's counts. None means that feed has not reached it.

    A feed that lags the newest day is "to {fdate}", never zero: the absence is
    ours, not the exchange's.
    """
    if filings is None and stories is None:
        return (
            "Filings to {fdate}; stories to {sdate}.",
            "الإفصاحات حتى {fdate}؛ الأخبار حتى {sdate}.",
        )
    if filings is None:
        return (
            f"{en_count(stories, 'story', 'stories')} on {{date}}; filings to {{fdate}}.",
            f"{ar_stories(stories)} يوم {{date}}؛ الإفصاحات حتى {{fdate}}.",
        )
    if stories is None:
        return (
            f"{en_count(filings, 'filing', 'filings')} on {{date}}; stories to {{sdate}}.",
            f"{ar_filings(filings)} يوم {{date}}؛ الأخبار حتى {{sdate}}.",
        )
    return (
        f"{en_count(filings, 'filing', 'filings')} and "
        f"{en_count(stories, 'story', 'stories')} on {{date}}.",
        f"{ar_filings(filings)} و{ar_stories(stories)} يوم {{date}}.",
    )


def s_week(filings: int, stories: int, both: int, news_short: bool) -> tuple[str, str]:
    """S4 — the seven days to the newest day, and the both-feeds join.

    When the news feed is shorter than the span, the sentence says where the
    stories start, in the same breath as the count.
    """
    span_en = " (stories from {nfrom})" if news_short else ""
    span_ar = " (الأخبار من {nfrom})" if news_short else ""
    if both == 0:
        both_en = "No company appeared in both the stories and the filings."
        both_ar = "لم ترد أي شركة في الأخبار وفي الإفصاحات معًا."
    else:
        both_en = (
            ("One company appeared" if both == 1
             else f"{count_en(both).capitalize()} companies appeared")
            + " in both the stories and the filings."
        )
        both_ar = (
            f"{ar_companies(both)} {'وردتا' if both == 2 else 'وردت'} "
            "في الأخبار وفي الإفصاحات معًا."
        )
    return (
        f"{en_count(filings, 'filing', 'filings')} and "
        f"{en_count(stories, 'story', 'stories')} in the seven days to {{date}}"
        f"{span_en}. {both_en}",
        f"{ar_filings(filings)} و{ar_stories(stories)} في الأيام السبعة حتى {{date}}"
        f"{span_ar}. {both_ar}",
    )


def s_since(filings: int, companies: int) -> tuple[str, str]:
    """S5 — the filings feed's own span. Filings only: the news feed holds days."""
    return (
        f"{en_count(filings, 'filing', 'filings')} from "
        f"{en_count(companies, 'company', 'companies')} since {{ffrom}}.",
        f"{ar_filings(filings)} من {ar_companies(companies)} منذ {{ffrom}}.",
    )


# The sample dates a sentence is vetted with. The placeholders are the only
# thing the client fills, so the guards see what a reader will see.
_SAMPLE_DATE = {"en": "6 Sep", "ar": "٦ سبتمبر"}
_PLACEHOLDER = re.compile(r"\{(from|to|date|fdate|sdate|nfrom|ffrom)\}")


def with_sample_dates(text: str, lang: str) -> str:
    return _PLACEHOLDER.sub(_SAMPLE_DATE[lang], text or "")


def vetted_pair(name: str, pair: tuple[str, str]) -> dict[str, str | None]:
    """Both languages through the guards with sample dates in. A hit is null."""
    out: dict[str, str | None] = {}
    for key, lang, text in ((name, "en", pair[0]), (f"{name}_ar", "ar", pair[1])):
        found = vet(with_sample_dates(text, lang))
        if found:
            print(f"   ! refused frontpage {key}: {found!r}")
            out[key] = None
        else:
            out[key] = text
    return out


def frontpage(
    stories: list[dict],
    filings: list[dict],
    market: dict,
    items: list[dict],
    newest_day: str,
) -> dict:
    """What Home reads: per-feed dates, the counts, and the sentences.

    Every count is taken off the feed it describes, never off the crossing
    set — "20 filings on 6 Sep" is a claim about the exchange. A feed whose
    newest date is behind the newest day publishes `None` for the day, so the
    client prints "to {date}" and never a zero it cannot stand behind.
    """
    story_days = [cairo_day(s["published"]) for s in stories if s.get("published")]
    filing_days = [f["date"] for f in filings if f.get("date")]
    news_newest = max(story_days) if story_days else ""
    news_oldest = min(story_days) if story_days else ""
    filings_newest = max(filing_days) if filing_days else ""
    filings_oldest = min(filing_days) if filing_days else ""

    def tickers(rows: list[dict]) -> set[str]:
        return {t for r in rows for t in (r.get("tickers") or [])}

    day_filings = (
        sum(1 for f in filings if f.get("date") == newest_day)
        if newest_day and filings_newest == newest_day else None
    )
    day_stories = (
        sum(1 for d in story_days if d == newest_day)
        if newest_day and news_newest == newest_day else None
    )

    week_from = days_before(newest_day, WEEK_DAYS - 1) if newest_day else ""
    week_filings = [f for f in filings if week_from <= f.get("date", "") <= newest_day]
    week_stories = [
        s for s in stories
        if s.get("published") and week_from <= cairo_day(s["published"]) <= newest_day
    ]
    both = len(tickers(week_stories) & tickers(week_filings))
    news_short = bool(news_oldest) and news_oldest > week_from

    touched = sorted(
        item["ticker"] for item in items
        if any(s.get("date") == newest_day for s in item["strands"])
    )

    sentences: dict[str, str | None] = {}
    sentences.update(vetted_pair("count", s_count(len(items))))
    sentences.update(vetted_pair("day", s_day(day_filings, day_stories)))
    sentences.update(vetted_pair(
        "week", s_week(len(week_filings), len(week_stories), both, news_short)
    ))
    sentences.update(vetted_pair(
        "since", s_since(len(filings), len(tickers(filings)))
    ))

    return {
        "newest_day": newest_day,
        "feeds": {
            "news": {"newest": news_newest, "oldest": news_oldest, "items": len(stories)},
            "filings": {
                "newest": filings_newest,
                "oldest": filings_oldest,
                "items": len(filings),
                "companies": len(tickers(filings)),
            },
            "market": {
                "date": market.get("date", ""),
                "is_close": bool(market.get("is_close")),
            },
        },
        "day": {"date": newest_day, "filings": day_filings, "stories": day_stories},
        "week": {
            "from": week_from,
            "to": newest_day,
            "filings": len(week_filings),
            "stories": len(week_stories),
            "news_from": news_oldest,
            "both": both,
        },
        # Filings only, from the feed's own oldest date. No story count here:
        # the news feed holds days, and a month of it would be a lie.
        "since": {
            "from": filings_oldest,
            "filings": len(filings),
            "companies": len(tickers(filings)),
        },
        "touched": touched,
        "sentences": sentences,
    }


def build(api: pathlib.Path = API) -> dict:
    """The connections document for the data under `api`. Reads, never writes."""
    strands: dict[str, list[dict]] = {}

    # The directory, for names, sectors and the 20-session median. The card
    # showed a four-letter ticker and nothing else; 256 of 280 companies have a
    # sector on file and it is what makes the peer clause say something.
    directory = load(api / "companies.json").get("companies") or []
    profile_of = {c["ticker"]: c for c in directory if c.get("ticker")}

    filings = load(api / "disclosures" / "latest.json").get("items") or []
    stories = load(api / "news" / "latest.json").get("items") or []
    market_doc = load(api / "market.json")

    # The window: the four newest published days, anchored on the documents
    # and never on the clock. A Monday reader sees Thursday to Sunday.
    window_end = newest_published_day(stories, filings, market_doc)
    window_start = days_before(window_end, WINDOW_DAYS - 1) if window_end else ""

    def in_window(day: str) -> bool:
        return bool(day) and window_start <= day <= window_end

    # How many companies filed the same kind of thing on the same day, and how
    # many of those share a sector. This is the whole point of the second
    # sentence: a card about one company becomes a fact about the day.
    #
    # Counted over the entire feed, not just the companies that crossed —
    # "nine companies filed an insider form" is a claim about the exchange, and
    # narrowing it to our cards would understate it.
    same_day: dict[tuple[str, str], set[str]] = {}
    for item in filings:
        event = item.get("event")
        if not event or event == "other":
            continue
        for ticker in item.get("tickers") or []:
            same_day.setdefault((item.get("date", ""), event), set()).add(ticker)

    # Filings, from the window document.
    for item in filings:
        if not in_window(item.get("date", "")):
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

    # Headlines that name a listed company, on the Cairo date they ran.
    for item in stories:
        published = cairo_day(item.get("published") or "")
        if not in_window(published):
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
    # From market.json at the close, divided by the directory's 20-session
    # median — the same arithmetic as Home's busiest card, so the two surfaces
    # cannot disagree. Never mid-session: a ratio of a part-day is not a
    # multiple of anything. And never from the per-company document, which
    # carried a stale volume and no move at all. A company with no volume or no
    # median is unmeasured, and unmeasured is not a thread.
    quotes = market_doc.get("stocks") or {}
    session_day = market_doc.get("date", "")
    session_closed = bool(market_doc.get("is_close")) and in_window(session_day)
    ratios: dict[str, float] = {}
    for ticker in list(strands):
        if not session_closed:
            break
        quote = quotes.get(ticker) or {}
        volume = quote.get("volume")
        median = (profile_of.get(ticker) or {}).get("median_volume_20d")
        if not volume or not median:
            continue
        ratio = volume / median
        ratios[ticker] = ratio
        if ratio >= UNUSUAL_VOLUME:
            strands[ticker].append(
                {
                    "kind": "session",
                    "id": f"session-{ticker}",
                    "date": session_day,
                    "ratio": round(ratio, 2),
                    "change_percent": quote.get("change_percent"),
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

        if not why:
            # Unreachable while a session strand implies a ratio; here so it
            # stays unreachable rather than shipping an empty card.
            print(f"   ! skipped {ticker}: nothing to say about the crossing")
            continue

        # Every sentence goes through all three guards. The templates are
        # fixed, so a hit means somebody changed one — which is exactly when a
        # sentence stops being safe. A refused `why` is the whole card, so the
        # card goes; a refused insight is one sentence, so that sentence goes
        # and the crossing stays.
        leak = vet(why) or vet(why_ar)
        if leak:
            print(f"   ! refused {ticker}: reads as an instruction ({leak!r})")
            continue
        leak = vet(note) or vet(note_ar)
        if leak:
            print(f"   ! refused {ticker} insight: ({leak!r})")
            note = note_ar = ""

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
                # Private carriers dropped before publishing. Titles are the
                # documents' own and are never edited: a title the guards
                # refuse ships byte-identical with `title_ok: false`, and the
                # client shows the kind and date in its place.
                "strands": [
                    {
                        **{k: v for k, v in r.items() if not k.startswith("_")},
                        "title_ok": vet(r.get("title", "")) is None
                        and vet(r.get("title_ar", "")) is None,
                    }
                    for r in rows
                ],
            }
        )

    # Most kinds first, then whether there is an insight to read, then most
    # strands, then the most unusual session. This is the crossings screen's
    # reading order over a complete set, not a cut: everything that crossed is
    # in the list, and Home re-sorts it by calendar and alphabet.
    items.sort(
        key=lambda i: (
            len(i["kinds"]),
            1 if i["insight"] else 0,
            len(i["strands"]),
            i["ratio"] or 0,
        ),
        reverse=True,
    )

    return {
        "updated_at": datetime.datetime.now(datetime.UTC).isoformat(
            timespec="seconds"
        ),
        "window_days": WINDOW_DAYS,
        "window_start": window_start,
        "window_end": window_end,
        "threshold": UNUSUAL_VOLUME,
        "total": len(items),
        "items": items,
        "frontpage": frontpage(stories, filings, market_doc, items, window_end),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)

    print("── Connecting the dots")
    doc = build(API)
    items = doc["items"]

    print(f"   window {doc['window_start']} – {doc['window_end']}")
    for item in items:
        print(f"   {item['ticker']:6} {'+'.join(item['kinds']):22} "
              f"{len(item['strands'])} strands")
    if not items:
        print("   nothing crossed in the window")

    if args.check:
        return 0

    body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    for directory in (API, FIXTURES):
        (directory / "connections.json").write_text(body, encoding="utf-8")
    print(f"\nwrote {OUT.relative_to(REPO)} ({len(items)} crossings)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
