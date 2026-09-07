#!/usr/bin/env python3
"""The crossing sentences, and the guard between them and a reader.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import contextlib
import datetime
import io
import itertools
import json
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_connections_api as dots  # noqa: E402
import filing_types  # noqa: E402
import macro_types  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent

# The variables each clause turns on, at the values that change its shape.
#
# The sentence space has to stay finite or the exhaustiveness below stops being
# exhaustive — that is the constraint on adding a clause, and it is why nothing
# in this file is drafted by a model (§43).
KINDS = ("filing", "news", "session")
RATIOS = (None, 2.0, 3.45, 141.75)
CHANGES = (None, 0.0, 0.0623, -0.0597)
OUTLETS = (1, 2, 3, 11)
# Every filing type, plus the no-shared-type case.
EVENTS = (None,) + tuple(filing_types.FILING_TYPES)
# Around each Arabic counting boundary: dual, the 3–10 plural, and past ten.
COUNTS = (0, 1, 2, 3, 9, 10, 11, 25)


def every_sentence(reachable_only: bool = True):
    """Every sentence the templates can emit.

    A session strand only exists where the ratio cleared the band, so
    `{"session"}` with no ratio is a state `main` cannot reach. It is excluded
    by default and tested separately, because the answer there is an empty
    string rather than a sentence.
    """
    for mask in range(1, 8):
        chosen = {k for i, k in enumerate(KINDS) if mask & (1 << i)}
        for ratio, change, outlets, event in itertools.product(
            RATIOS, CHANGES, OUTLETS, EVENTS
        ):
            if reachable_only and "session" in chosen and ratio is None:
                if chosen == {"session"}:
                    continue
            label = filing_types.filed_as(event) if event else None
            label_ar = filing_types.filed_as_ar(event) if event else None
            yield chosen, dots.sentence(
                "COMI", chosen, ratio, change, label, label_ar, outlets
            )


def every_insight():
    for peers, filings, same_sector, event in itertools.product(
        COUNTS, COUNTS, COUNTS, EVENTS
    ):
        label = filing_types.filed_as(event) if event else None
        label_ar = filing_types.filed_as_ar(event) if event else None
        yield dots.insight(peers, label, label_ar, filings, same_sector)


class SentenceTest(unittest.TestCase):
    def test_every_sentence_the_templates_can_produce_is_safe(self):
        """§8 — a crossing states what happened, never what to do about it.

        Exhaustive over the template space rather than over a sample. The
        space grew when the sentence learned to name the filing's type, the
        day's move and how many outlets carried the story, so the enumeration
        grew with it.
        """
        checked = 0
        for chosen, (en, ar) in every_sentence():
            for lang, text in (("en", en), ("ar", ar)):
                found = macro_types.directive(text)
                if found is not None:
                    self.fail(
                        f"{sorted(chosen)} {lang} instructs: {found!r}\n{text}"
                    )
                self.assertTrue(text.strip())
                checked += 1
        # If a refactor collapses the enumeration, this notices.
        self.assertGreater(checked, 2000, "the sentence space stopped being enumerated")

    def test_every_insight_the_templates_can_produce_is_safe(self):
        checked = 0
        for en, ar in every_insight():
            for lang, text in (("en", en), ("ar", ar)):
                found = macro_types.directive(text)
                if found is not None:
                    self.fail(f"insight {lang} instructs: {found!r}\n{text}")
                checked += 1
        self.assertGreater(checked, 2000)

    def test_the_insight_is_counts_and_nothing_else(self):
        """It may say what the day had in common. It may not say what follows.

        The clause list is the thing to guard: a future clause that reads
        "which usually precedes…" would pass the directive guard and still be
        a prediction.
        """
        banned = (
            "usually", "tends to", "often", "expect", "likely", "suggests",
            "signal", "means the", "ahead of", "before it", "about to",
            "عادة", "يتوقع", "يشير إلى", "قبل أن", "على وشك",
        )
        for en, ar in every_insight():
            for text in (en.lower(), ar):
                for word in banned:
                    self.assertNotIn(
                        word, text, f"an insight clause forecasts: {text!r}"
                    )

    def test_a_filing_type_never_lands_in_prose_as_a_chip(self):
        """"filed a results" is not English.

        The chip label and the sentence phrase are different strings on
        purpose; this fails if a type is ever given the chip by mistake.
        """
        for event in filing_types.FILING_TYPES:
            phrase = filing_types.filed_as(event)
            if phrase is None:
                self.assertEqual(event, "other")
                continue
            self.assertEqual(phrase, phrase.lstrip().rstrip())
            self.assertTrue(phrase[0].islower(), f"{event}: {phrase!r}")
            en, _ar = dots.sentence(
                "COMI", {"filing"}, None, None, phrase,
                filing_types.filed_as_ar(event), 1,
            )
            self.assertNotIn(" a results", en)
            self.assertNotIn(" a board decisions", en)
            self.assertNotIn(" a trading resumed", en)

    def test_arabic_counts_its_nouns_the_way_arabic_counts(self):
        # Two takes the dual, three to ten takes a plural, past ten a singular.
        self.assertEqual(dots.ar_companies(2), "شركتان")
        self.assertIn("شركات", dots.ar_companies(3))
        self.assertIn("شركة", dots.ar_companies(11))
        self.assertEqual(dots.ar_filings(2), "إفصاحين")
        self.assertIn("إفصاحات", dots.ar_filings(4))
        self.assertEqual(dots.ar_outlets(2), "جهتان")
        # P10 — the front page counts stories too, and the hundreds rule: at
        # an exact hundred (and the hundred-and-one, -two) the noun is the bare
        # singular, at hundred-and-three to -ten the plural comes back.
        self.assertEqual(dots.ar_stories(1), "خبر واحد")
        self.assertEqual(dots.ar_stories(2), "خبران")
        self.assertEqual(dots.ar_stories(3), "ثلاثة أخبار")
        self.assertEqual(dots.ar_stories(10), "عشرة أخبار")
        self.assertEqual(dots.ar_stories(11), "11 خبرًا")
        self.assertEqual(dots.ar_stories(185), "185 خبرًا")
        self.assertEqual(dots.ar_stories(400), "400 خبر")
        self.assertEqual(dots.ar_filings(400), "400 إفصاح")
        self.assertEqual(dots.ar_filings(434), "434 إفصاحًا")
        self.assertEqual(dots.ar_companies(138), "138 شركة")
        self.assertEqual(dots.ar_companies(103), "103 شركات")
        self.assertEqual(dots.ar_companies(1), "شركة واحدة")
        self.assertEqual(dots.ar_filings(0), "لا إفصاحات")

    def test_the_arabic_is_arabic_and_joins_the_way_arabic_joins(self):
        _en, ar = dots.sentence("COMI", {"filing", "news"}, None, None, None, None, 1)
        self.assertTrue(any("؀" <= ch <= "ۿ" for ch in ar))
        # The waw attaches to the word it joins.
        self.assertNotIn(" و ", ar)

    def test_the_ticker_is_isolated_from_the_arabic_around_it(self):
        _en, ar = dots.sentence("COMI", {"filing", "session"}, 2.5, None, None, None, 1)
        self.assertIn("⁨COMI⁩", ar)

    def test_the_day_s_move_reaches_the_sentence(self):
        """It shipped as null on every session strand for the life of the file.

        The builder read `change_percent` from the company document, which
        carries close, date, open, high, low and volume and no move at all.
        """
        en, ar = dots.sentence("COMI", {"session"}, 3.45, -0.0597, None, None, 1)
        self.assertIn("down 5.97%", en)
        self.assertIn("منخفضة", ar)
        up, _ = dots.sentence("COMI", {"session"}, 3.45, 0.0623, None, None, 1)
        self.assertIn("up 6.23%", up)

    def test_a_state_with_nothing_to_say_says_nothing(self):
        """Rather than raising, which is what the joiner used to do.

        `{"session"}` with no ratio adds no clause, and the joiner then
        indexed `parts[-1]` on an empty list. `main` cannot reach it — a
        session strand implies a ratio — but the function is public.
        """
        self.assertEqual(dots.sentence("COMI", {"session"}, None, None, None, None, 1),
                         ("", ""))

    def test_no_move_is_absent_rather_than_zero(self):
        en, _ = dots.sentence("COMI", {"session"}, 3.45, None, None, None, 1)
        self.assertNotIn("closing", en)


    def test_two_companies_take_the_dual_verb(self):
        """Arabic agrees the verb with a dual subject: «شركتان ظهرتا», «شركتان
        وردتا». One and eleven-plus take the feminine singular, and so does a
        plural of things (three to ten). The demo tree already spells the dual
        this way; the builder must too. Fails when the verb stops agreeing."""
        self.assertIn("شركتان ظهرتا في أكثر من مكان", dots.s_count(2)[1])
        self.assertIn("شركتان وردتا في الأخبار", dots.s_week(5, 5, 2, False)[1])
        for n, subject in ((1, "شركة واحدة ظهرت"), (7, "سبع شركات ظهرت"), (12, "12 شركة ظهرت")):
            with self.subTest(n=n):
                self.assertIn(subject, dots.s_count(n)[1])
                self.assertNotIn("ظهرتا", dots.s_count(n)[1])
        for n, subject in ((1, "شركة واحدة وردت"), (9, "تسع شركات وردت"), (15, "15 شركة وردت")):
            with self.subTest(n=n):
                self.assertIn(subject, dots.s_week(5, 5, n, False)[1])
                self.assertNotIn("وردتا", dots.s_week(5, 5, n, False)[1])
        # And the agreed dual still passes every guard with its dates in.
        for lang, text in zip(("en", "ar"), dots.s_count(2)):
            self.assertIsNone(dots.vet(dots.with_sample_dates(text, lang)))
        for lang, text in zip(("en", "ar"), dots.s_week(5, 5, 2, False)):
            self.assertIsNone(dots.vet(dots.with_sample_dates(text, lang)))


class PublishedTest(unittest.TestCase):
    def setUp(self):
        path = REPO / "public" / "data" / "v1" / "connections.json"
        if not path.exists():
            self.skipTest("nothing published yet")
        self.doc = json.loads(path.read_text(encoding="utf-8"))

    def test_one_kind_is_not_a_crossing(self):
        for item in self.doc.get("items", []):
            with self.subTest(item["ticker"]):
                self.assertGreaterEqual(len(item["kinds"]), 2)
                # And every strand points at something a reader can open, or
                # is the session, which is a number rather than a document.
                for strand in item["strands"]:
                    if strand["kind"] != "session":
                        self.assertTrue(
                            strand.get("link"),
                            f"{item['ticker']} {strand['kind']} has no link",
                        )

    def test_the_private_carriers_do_not_ship(self):
        """`_event`, `_outlets` and friends are working fields, not payload."""
        for item in self.doc.get("items", []):
            for strand in item["strands"]:
                for key in strand:
                    self.assertFalse(
                        key.startswith("_"),
                        f"{item['ticker']} ships a private field {key!r}",
                    )

    def test_the_peer_count_agrees_with_the_filings_feed(self):
        """The insight claims a number; the number has to be true.

        Counted here from the disclosures document rather than from anything
        this builder kept, so the two would have to be wrong in the same way.
        """
        feed = json.loads(
            (REPO / "public" / "data" / "v1" / "disclosures" / "latest.json")
            .read_text(encoding="utf-8")
        )
        by_day_event: dict[tuple[str, str], set[str]] = {}
        for filing in feed.get("items", []):
            event = filing.get("event")
            if not event or event == "other":
                continue
            for ticker in filing.get("tickers") or []:
                by_day_event.setdefault((filing.get("date", ""), event), set()).add(
                    ticker
                )

        for item in self.doc.get("items", []):
            event = item.get("event")
            if not event or not item.get("peers"):
                continue
            days = {
                s["date"] for s in item["strands"] if s["kind"] == "filing"
            }
            expected: set[str] = set()
            for day in days:
                expected |= by_day_event.get((day, event), set())
            expected.discard(item["ticker"])
            self.assertEqual(
                set(item["peers"]),
                expected,
                f"{item['ticker']} names peers the filings feed does not agree with",
            )



class BuildOrderTest(unittest.TestCase):
    """Connections reads the disclosures feed, so it must be built after it.

    `build_connections_api.py` loads `public/data/v1/disclosures/latest.json`
    — the published feed, not the archive. Any job that writes that feed and
    then builds crossings in the wrong order publishes a pair that disagrees
    with itself, and `PublishedTest` above is what notices.

    That is not hypothetical. `publish-live-data.yml` ran connections BEFORE
    disclosures for as long as both were in it, so every run crossed today's
    headlines against the previous run's filings. Nothing showed while no
    filing arrived between runs. On 6 Sep 2026 the local harvest pushed one,
    PRDC's insider filing reached the archive and the disclosures feed and was
    missing from the connections committed beside it, and four CI runs went
    red on the test above.

    Parsed with a regex rather than PyYAML, as `test_prices_workflow` does and
    for the same reason: the runner has no PyYAML, and a test that skips on
    the machine it protects is not a test.
    """

    WORKFLOWS = REPO / ".github" / "workflows"

    def test_connections_is_never_built_before_the_feed_it_reads(self):
        for path in sorted(self.WORKFLOWS.glob("*.yml")):
            source = path.read_text(encoding="utf-8")
            if "build_connections_api.py" not in source:
                continue
            with self.subTest(workflow=path.name):
                self.assertIn("build_disclosures_api.py", source,
                              f"{path.name} builds crossings from a feed it never writes")
                self.assertLess(
                    source.index("python3 scripts/build_disclosures_api.py"),
                    source.index("python3 scripts/build_connections_api.py"),
                    f"{path.name} crosses today's headlines against "
                    "the previous run's filings")

    def test_the_daily_build_keeps_the_same_order(self):
        source = (REPO / "scripts" / "build_all.py").read_text(encoding="utf-8")
        self.assertLess(source.index('"build_disclosures_api.py"'),
                        source.index('"build_connections_api.py"'),
                        "build_all builds crossings before the filings they cross")


# ── Fixtures ────────────────────────────────────────────────────────────────
#
# A small data directory in the shape `build()` reads — the two feeds, the
# market file and the directory — so the window, the session source and the
# front page can be tested against documents whose dates and volumes are
# chosen, not found. The published document is tested separately below.

DAY = "2026-09-06"


def days_before(day: str, n: int) -> str:
    return (datetime.date.fromisoformat(day) - datetime.timedelta(days=n)).isoformat()


def story(sid: str, tickers: list[str], published: str, *, outlets: int = 1,
          headline: str = "خبر عن الشركة",
          headline_en: str = "A story about the company") -> dict:
    return {
        "id": sid, "headline": headline, "headline_en": headline_en,
        "published": published, "tickers": tickers,
        "sources": [{"link": f"https://example.com/{sid}/{i}"} for i in range(outlets)],
    }


def filing(fid: str, tickers: list[str], date: str, *, event: str = "statement",
           title: str = "بيان من الشركة",
           title_en: str = "A statement from the company") -> dict:
    return {
        "id": fid, "title": title, "title_en": title_en, "date": date,
        "link": f"https://egx.example/{fid}", "tickers": tickers, "event": event,
        "event_label": event, "event_label_ar": event,
    }


def company(ticker: str, median: float | None = 100.0) -> dict:
    row = {"ticker": ticker, "name_en": f"{ticker} Company",
           "name_ar": f"شركة {ticker}", "sector": "Real estate"}
    if median is not None:
        row["median_volume_20d"] = median
    return row


def market(date: str, is_close: bool, stocks: dict) -> dict:
    return {"date": date, "is_close": is_close, "stocks": stocks}


def quote(volume: float, change: float = -0.0247) -> dict:
    return {"close": 10.0, "volume": volume, "change_percent": change}


def build_from(stories: list[dict], filings: list[dict], market_doc: dict,
               companies: list[dict]) -> dict:
    def write(path: pathlib.Path, doc) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")

    with tempfile.TemporaryDirectory() as tmp:
        api = pathlib.Path(tmp)
        write(api / "news" / "latest.json", {"items": stories})
        write(api / "disclosures" / "latest.json", {"items": filings})
        write(api / "market.json", market_doc)
        write(api / "companies.json", {"companies": companies})
        with contextlib.redirect_stdout(io.StringIO()):
            return dots.build(api)


def two_kind_set(stories: list[dict], filings: list[dict], market_doc: dict,
                 companies: list[dict], start: str, end: str) -> set[str]:
    """The crossing set recomputed from the feeds, with none of the builder's
    bookkeeping: two kinds of thread inside [start, end]."""
    kinds: dict[str, set[str]] = {}
    for f in filings:
        if start <= f.get("date", "") <= end:
            for t in f.get("tickers") or []:
                kinds.setdefault(t, set()).add("filing")
    for s in stories:
        if start <= dots.cairo_day(s.get("published") or "") <= end:
            for t in s.get("tickers") or []:
                kinds.setdefault(t, set()).add("news")
    median = {c["ticker"]: c.get("median_volume_20d") for c in companies if c.get("ticker")}
    if market_doc.get("is_close") and start <= market_doc.get("date", "") <= end:
        for t in list(kinds):
            volume = (market_doc.get("stocks") or {}).get(t, {}).get("volume")
            if volume and median.get(t) and volume / median[t] >= dots.UNUSUAL_VOLUME:
                kinds[t].add("session")
    return {t for t, k in kinds.items() if len(k) >= 2}


# Around each Arabic counting boundary plus the hundreds: the values the front
# page's shapes turn on.
FP_COUNTS = (0, 1, 2, 3, 9, 10, 11, 25, 100, 185, 400)


def every_frontpage_sentence():
    for n in FP_COUNTS:
        yield "count", dots.s_count(n)
    for f, s in itertools.product((None,) + FP_COUNTS, (None,) + FP_COUNTS):
        yield "day", dots.s_day(f, s)
    for f, s, b, short in itertools.product(FP_COUNTS, FP_COUNTS, FP_COUNTS, (False, True)):
        yield "week", dots.s_week(f, s, b, short)
    for f, c in itertools.product(FP_COUNTS, FP_COUNTS):
        yield "since", dots.s_since(f, c)


class WindowTest(unittest.TestCase):
    """The window is the four newest published days, anchored on documents."""

    def setUp(self):
        path = REPO / "public" / "data" / "v1" / "connections.json"
        self.doc = json.loads(path.read_text(encoding="utf-8")) if path.exists() else None

    def test_the_window_is_four_dates_and_the_sentence_says_four(self):
        """P1 — end − start is three days, every strand is inside, and every
        sentence's "within four days" is true. Fails when the window is
        `today − WINDOW_DAYS` again (five dates, clock-anchored)."""
        # A fixture with documents on five consecutive dates: the oldest is
        # outside, so the company whose only filing is there does not cross.
        filings = [filing(f"f{i}", ["AAA"], days_before(DAY, i)) for i in range(5)]
        filings.append(filing("old", ["OLD"], days_before(DAY, 4)))
        stories = [story("s1", ["AAA"], f"{DAY}T08:00:00Z"),
                   story("s2", ["OLD"], f"{DAY}T08:00:00Z")]
        doc = build_from(stories, filings, market(DAY, True, {}),
                         [company("AAA"), company("OLD")])
        self.assertEqual(doc["window_end"], DAY)
        self.assertEqual(doc["window_start"], days_before(DAY, dots.WINDOW_DAYS - 1))
        self.assertEqual([i["ticker"] for i in doc["items"]], ["AAA"])
        dates = {s["date"] for s in doc["items"][0]["strands"]}
        self.assertNotIn(days_before(DAY, 4), dates)
        self.assertEqual(len(dates), 4)

        if self.doc is None:
            return
        start = datetime.date.fromisoformat(self.doc["window_start"])
        end = datetime.date.fromisoformat(self.doc["window_end"])
        self.assertEqual((end - start).days, dots.WINDOW_DAYS - 1)
        self.assertEqual(self.doc["window_days"], 4)
        for item in self.doc["items"]:
            with self.subTest(item["ticker"]):
                self.assertIn("within four days", item["why"])
                self.assertIn("خلال أربعة أيام", item["why_ar"])
                for strand in item["strands"]:
                    self.assertTrue(
                        self.doc["window_start"] <= strand["date"] <= self.doc["window_end"],
                        f"{item['ticker']} {strand['kind']} {strand['date']} is outside the window",
                    )

    def test_the_window_is_anchored_on_the_newest_published_day(self):
        """P2 — window_end is the newest document date, and a session that has
        not closed is not a document yet. Fails when the clock returns or a
        live session anchors the window."""
        filings = [filing("f1", ["AAA"], DAY)]
        stories = [story("s1", ["AAA"], f"{DAY}T08:00:00Z")]
        later = days_before(DAY, -1)
        live = build_from(stories, filings, market(later, False, {"AAA": quote(500)}),
                          [company("AAA")])
        self.assertEqual(live["window_end"], DAY, "a live session anchored the window")
        self.assertEqual(live["frontpage"]["newest_day"], DAY)
        closed = build_from(stories, filings, market(later, True, {"AAA": quote(500)}),
                            [company("AAA")])
        self.assertEqual(closed["window_end"], later)

        if self.doc is None:
            return
        api = REPO / "public" / "data" / "v1"
        stories = json.loads((api / "news" / "latest.json").read_text(encoding="utf-8"))["items"]
        filings = json.loads((api / "disclosures" / "latest.json").read_text(encoding="utf-8"))["items"]
        market_doc = json.loads((api / "market.json").read_text(encoding="utf-8"))
        days = [dots.cairo_day(s["published"]) for s in stories if s.get("published")]
        days += [f["date"] for f in filings if f.get("date")]
        if market_doc.get("is_close"):
            days.append(market_doc["date"])
        self.assertEqual(self.doc["window_end"], max(days))
        self.assertNotEqual(self.doc["window_end"], "", "no document anchored the window")

    def test_stories_are_dated_in_cairo(self):
        """P8 — a story at 22:30Z on the 6th ran on the 7th in Cairo, and that
        is the day it counts on: for the window, the day count and the newest
        day. Fails when the UTC prefix returns."""
        self.assertEqual(dots.cairo_day("2026-09-06T22:30:00Z"), "2026-09-07")
        self.assertEqual(dots.cairo_day("2026-09-06T08:00:00Z"), "2026-09-06")
        next_day = days_before(DAY, -1)
        doc = build_from(
            [story("late", ["AAA"], f"{DAY}T22:30:00Z")],
            [filing("f1", ["AAA"], DAY)],
            market(DAY, True, {}),
            [company("AAA")],
        )
        self.assertEqual(doc["window_end"], next_day)
        self.assertEqual(doc["frontpage"]["newest_day"], next_day)
        self.assertEqual(doc["frontpage"]["day"]["stories"], 1)
        self.assertEqual(doc["frontpage"]["feeds"]["news"]["newest"], next_day)
        (item,) = doc["items"]
        news = next(s for s in item["strands"] if s["kind"] == "news")
        self.assertEqual(news["date"], next_day)


class SessionTest(unittest.TestCase):
    """The session thread is the close in market.json, or nothing."""

    def test_session_ratio_comes_from_the_close(self):
        """P3 — ratio = market volume ÷ directory median at the close; volume 0
        or no median is not a thread; P3b: no close, no session strand at all.
        Fails when the companies/<T>.json source or a mid-session strand
        returns."""
        tickers = ("AAA", "ZER", "NOM", "LOW", "NOQ")
        filings = [filing(f"f-{t}", [t], DAY) for t in tickers]
        stories = [story(f"s-{t}", [t], f"{DAY}T08:00:00Z") for t in tickers]
        # An untickered story the next morning: the newest published day is
        # then NOT the market date, and the session strand must still carry
        # the close's own date rather than the window's end.
        next_day = days_before(DAY, -1)
        stories.append(story("s-late", [], f"{next_day}T08:00:00Z"))
        # NOQ is a company market.json does not carry at all — no quote, no
        # volume, nothing to divide. It crosses on its documents and the
        # build does not trip over it.
        stocks = {"AAA": quote(267), "ZER": quote(0, -0.1667), "NOM": quote(900), "LOW": quote(150)}
        companies = [company("AAA"), company("ZER"), company("NOM", median=None),
                     company("LOW"), company("NOQ")]
        doc = build_from(stories, filings, market(DAY, True, stocks), companies)
        self.assertEqual(doc["window_end"], next_day)
        by = {i["ticker"]: i for i in doc["items"]}
        self.assertEqual(set(by), set(tickers))
        self.assertEqual(by["AAA"]["kinds"], ["filing", "news", "session"])
        session = next(s for s in by["AAA"]["strands"] if s["kind"] == "session")
        self.assertEqual(session["ratio"], round(267 / 100.0, 2))
        self.assertEqual(session["date"], DAY, "the session is dated the window, not the close")
        self.assertEqual(by["NOQ"]["kinds"], ["filing", "news"])
        self.assertIsNone(by["NOQ"]["ratio"])
        self.assertEqual(session["change_percent"], -0.0247)
        self.assertIn("2.67×", by["AAA"]["why"])
        # Unmeasured is not a thread — the DEIN case: a move on zero volume.
        self.assertEqual(by["ZER"]["kinds"], ["filing", "news"])
        self.assertIsNone(by["ZER"]["ratio"])
        self.assertNotIn("traded", by["ZER"]["why"])
        self.assertEqual(by["NOM"]["kinds"], ["filing", "news"])
        # Under the band is measured and quiet, not a thread either.
        self.assertEqual(by["LOW"]["kinds"], ["filing", "news"])
        self.assertEqual(by["LOW"]["ratio"], 1.5)

        # P3b — the same file before the close carries no session anywhere.
        live = build_from(stories, filings, market(DAY, False, stocks), companies)
        for item in live["items"]:
            self.assertNotIn("session", item["kinds"], f"{item['ticker']} has a mid-session strand")

        path = REPO / "public" / "data" / "v1" / "connections.json"
        if not path.exists():
            return
        doc = json.loads(path.read_text(encoding="utf-8"))
        api = REPO / "public" / "data" / "v1"
        market_doc = json.loads((api / "market.json").read_text(encoding="utf-8"))
        directory = json.loads((api / "companies.json").read_text(encoding="utf-8"))["companies"]
        median = {c["ticker"]: c.get("median_volume_20d") for c in directory if c.get("ticker")}
        stocks = market_doc.get("stocks") or {}
        for item in doc["items"]:
            with self.subTest(item["ticker"]):
                volume = (stocks.get(item["ticker"]) or {}).get("volume")
                sessions = [s for s in item["strands"] if s["kind"] == "session"]
                if not volume or not median.get(item["ticker"]):
                    self.assertEqual(sessions, [], f"{item['ticker']} has a session on no measure")
                    continue
                for s in sessions:
                    self.assertTrue(market_doc.get("is_close"))
                    self.assertEqual(s["date"], market_doc["date"])
                    self.assertEqual(s["ratio"], round(volume / median[item["ticker"]], 2))


class CardinalityTest(unittest.TestCase):
    def test_nothing_is_cut(self):
        """P4 — total == len(items) == the two-kind set recomputed from the
        feeds; eleven crossings publish eleven. Fails when MAX_ITEMS or any
        [:N] returns."""
        tickers = [f"T{i:02d}" for i in range(11)]
        filings = [filing(f"f-{t}", [t], DAY) for t in tickers]
        stories = [story(f"s-{t}", [t], f"{DAY}T09:00:00Z") for t in tickers]
        # And one company with a single kind of thread: in the feeds, not a
        # crossing, and not in the total either.
        filings.append(filing("f-SOLO", ["SOLO"], DAY))
        doc = build_from(stories, filings, market(DAY, True, {}),
                         [company(t) for t in tickers] + [company("SOLO")])
        self.assertEqual(doc["total"], 11)
        self.assertEqual(len(doc["items"]), 11)
        self.assertEqual({i["ticker"] for i in doc["items"]}, set(tickers))
        self.assertEqual({i["ticker"] for i in doc["items"]},
                         two_kind_set(stories, filings, market(DAY, True, {}),
                                      [company(t) for t in tickers] + [company("SOLO")],
                                      doc["window_start"], doc["window_end"]))
        self.assertFalse(hasattr(dots, "MAX_ITEMS"), "the cap is back")

        path = REPO / "public" / "data" / "v1" / "connections.json"
        if not path.exists():
            return
        doc = json.loads(path.read_text(encoding="utf-8"))
        api = REPO / "public" / "data" / "v1"
        stories = json.loads((api / "news" / "latest.json").read_text(encoding="utf-8"))["items"]
        filings = json.loads((api / "disclosures" / "latest.json").read_text(encoding="utf-8"))["items"]
        market_doc = json.loads((api / "market.json").read_text(encoding="utf-8"))
        directory = json.loads((api / "companies.json").read_text(encoding="utf-8"))["companies"]
        expected = two_kind_set(stories, filings, market_doc, directory,
                                doc["window_start"], doc["window_end"])
        self.assertEqual(doc["total"], len(doc["items"]))
        self.assertEqual({i["ticker"] for i in doc["items"]}, expected)


class FrontpageTest(unittest.TestCase):
    """The block Home reads: dates the feeds own, counts off the feeds, and
    sentences from fixed shapes through all three guards."""

    def test_every_frontpage_sentence_is_safe(self):
        """P5 — every shape at every count, both languages, with sample dates
        in, through directive, speculative and causal. And a planted connective
        is refused by vet(). Fails when a template gains a hedge or connector,
        or a guard is dropped from vet()."""
        checked = 0
        for name, (en, ar) in every_frontpage_sentence():
            for lang, text in (("en", en), ("ar", ar)):
                filled = dots.with_sample_dates(text, lang)
                self.assertNotIn("{", filled, f"{name} {lang} left a placeholder: {text!r}")
                for guard in (macro_types.directive, macro_types.speculative, macro_types.causal):
                    found = guard(filled)
                    if found is not None:
                        self.fail(f"{name} {lang} {guard.__name__}: {found!r}\n{text}")
                self.assertIsNone(dots.vet(filled))
                self.assertTrue(text.strip())
                checked += 1
        self.assertGreater(checked, 300, "the front-page sentence space stopped being enumerated")
        # The guard has to be the sum of its parts, in this order.
        self.assertEqual(dots.vet("12 companies filed, so the shares may rise"), "may rise")
        self.assertEqual(dots.vet("It filed, so it is about to move."), ", so")
        self.assertIsNotNone(dots.vet("Investors should buy before results"))
        self.assertIsNotNone(dots.vet("أودعت الشركة إفصاحًا بسبب النتائج"))
        self.assertIsNone(dots.vet("20 filings and 189 stories on 6 Sep."))

    def test_a_lagging_feed_is_never_a_zero(self):
        """P6 — news newest 7 Sep, filings newest 6 Sep: day.filings is None
        and the sentence says "filings to", never "0 filings". Fails when lag
        is counted as zero."""
        next_day = days_before(DAY, -1)
        doc = build_from(
            [story("s1", ["AAA"], f"{DAY}T08:00:00Z"), story("s2", [], f"{next_day}T08:00:00Z")],
            [filing("f1", ["AAA"], DAY)],
            market(DAY, True, {}),
            [company("AAA")],
        )
        fp = doc["frontpage"]
        self.assertEqual(fp["newest_day"], next_day)
        self.assertIsNone(fp["day"]["filings"])
        self.assertEqual(fp["day"]["stories"], 1)
        self.assertEqual(fp["feeds"]["filings"]["newest"], DAY)
        en, ar = fp["sentences"]["day"], fp["sentences"]["day_ar"]
        self.assertIn("filings to {fdate}", en)
        self.assertIn("الإفصاحات حتى {fdate}", ar)
        self.assertIn("1 story on {date}", en)
        for text in (en, ar):
            self.assertNotIn("0 filings", text)
            self.assertNotIn("لا إفصاحات", text)
            self.assertNotIn("0 stories", text)
        # The other way round: filings ahead of the stories.
        doc = build_from(
            [story("s1", ["AAA"], f"{DAY}T08:00:00Z")],
            [filing("f1", ["AAA"], DAY), filing("f2", ["BBB"], next_day)],
            market(DAY, True, {}),
            [company("AAA"), company("BBB")],
        )
        fp = doc["frontpage"]
        self.assertIsNone(fp["day"]["stories"])
        self.assertEqual(fp["day"]["filings"], 1)
        self.assertIn("stories to {sdate}", fp["sentences"]["day"])
        self.assertIn("الأخبار حتى {sdate}", fp["sentences"]["day_ar"])
        self.assertNotIn("0 stories", fp["sentences"]["day"])
        self.assertNotIn("لا أخبار", fp["sentences"]["day_ar"])

    def test_the_week_says_where_the_stories_start(self):
        """P7 — news oldest after week.from ⇒ "(stories from …)" in both
        languages; a feed that covers the span ⇒ no clause. Fails when the
        clause is dropped or made unconditional."""
        filings = [filing("f1", ["AAA"], DAY)]
        short = build_from(
            [story("s1", ["AAA"], f"{DAY}T08:00:00Z"),
             story("s2", [], f"{days_before(DAY, 2)}T08:00:00Z")],
            filings, market(DAY, True, {}), [company("AAA")],
        )
        fp = short["frontpage"]
        self.assertEqual(fp["week"]["from"], days_before(DAY, 6))
        self.assertEqual(fp["week"]["news_from"], days_before(DAY, 2))
        self.assertIn("(stories from {nfrom})", fp["sentences"]["week"])
        self.assertIn("(الأخبار من {nfrom})", fp["sentences"]["week_ar"])

        full = build_from(
            [story("s1", ["AAA"], f"{DAY}T08:00:00Z"),
             story("s2", [], f"{days_before(DAY, 6)}T08:00:00Z")],
            filings, market(DAY, True, {}), [company("AAA")],
        )
        fp = full["frontpage"]
        self.assertEqual(fp["week"]["news_from"], fp["week"]["from"])
        self.assertNotIn("stories from", fp["sentences"]["week"])
        self.assertNotIn("الأخبار من", fp["sentences"]["week_ar"])
        self.assertIn("1 company appeared" if False else "One company appeared", fp["sentences"]["week"])

    def test_no_monthly_story_count(self):
        """P9 — since is the filings feed's own span: no stories key, no story
        word in either sentence. Fails when a month news count is added."""
        doc = build_from(
            [story("s1", ["AAA"], f"{DAY}T08:00:00Z")],
            [filing("f1", ["AAA"], DAY), filing("f2", ["BBB"], days_before(DAY, 28))],
            market(DAY, True, {}), [company("AAA"), company("BBB")],
        )
        docs = [doc]
        path = REPO / "public" / "data" / "v1" / "connections.json"
        if path.exists():
            docs.append(json.loads(path.read_text(encoding="utf-8")))
        for d in docs:
            since = d["frontpage"]["since"]
            self.assertNotIn("stories", since)
            self.assertEqual(set(since), {"from", "filings", "companies"})
            self.assertNotIn("stor", (d["frontpage"]["sentences"]["since"] or "").lower())
            self.assertNotIn("خبر", d["frontpage"]["sentences"]["since_ar"] or "")
        self.assertEqual(doc["frontpage"]["since"]["from"], days_before(DAY, 28))
        self.assertEqual(doc["frontpage"]["since"]["filings"], 2)
        self.assertEqual(doc["frontpage"]["since"]["companies"], 2)
        self.assertEqual(doc["frontpage"]["sentences"]["since"],
                         "2 filings from 2 companies since {ffrom}.")

    def test_titles_are_vetted_not_edited(self):
        """P11 — a title the guards refuse ships byte-identical with
        title_ok false; a plain exchange title ships title_ok true. Fails when
        titles are edited or the flag is dropped."""
        planted = "Investors should buy before results"
        plain = "Alexandria Containers (ALCN.CA) - board decisions"
        doc = build_from(
            [story("s1", ["AAA"], f"{DAY}T08:00:00Z", headline_en=plain,
                   headline="الاسكندرية لتداول الحاويات (ALCN.CA) - قرارات مجلس الإدارة")],
            [filing("f1", ["AAA"], DAY, title_en=planted, title="بيان من الشركة")],
            market(DAY, True, {}), [company("AAA")],
        )
        (item,) = doc["items"]
        by_kind = {s["kind"]: s for s in item["strands"]}
        self.assertIs(by_kind["filing"]["title_ok"], False)
        self.assertEqual(by_kind["filing"]["title"], planted)
        self.assertIs(by_kind["news"]["title_ok"], True)
        self.assertEqual(by_kind["news"]["title"], plain)
        # The Arabic side is vetted too, on its own.
        doc = build_from(
            [story("s1", ["AAA"], f"{DAY}T08:00:00Z", headline="ننصح بشراء السهم قبل النتائج")],
            [filing("f1", ["AAA"], DAY)],
            market(DAY, True, {}), [company("AAA")],
        )
        news = next(s for s in doc["items"][0]["strands"] if s["kind"] == "news")
        self.assertIs(news["title_ok"], False)
        self.assertEqual(news["title_ar"], "ننصح بشراء السهم قبل النتائج")

    def test_the_frontpage_counts_agree_with_the_feeds(self):
        """P14 — day, week and since counts and `touched` recomputed from the
        two feeds equal the published block. Fails when a count is taken off
        the crossing set instead of the feed."""
        # On a fixture whose crossing set is smaller than its feeds.
        fixture_stories = [
            story("s1", ["AAA"], f"{DAY}T08:00:00Z"),
            story("s2", ["BBB"], f"{days_before(DAY, 1)}T08:00:00Z"),
            story("s3", [], f"{DAY}T10:00:00Z"),
            story("s4", ["CCC"], f"{days_before(DAY, 5)}T10:00:00Z"),
        ]
        fixture_filings = [
            filing("f1", ["AAA"], DAY),
            filing("f2", ["CCC"], days_before(DAY, 5)),
            filing("f3", ["DDD"], days_before(DAY, 20)),
            filing("f4", ["DDD"], DAY),
        ]
        fixture_market = market(DAY, True, {"AAA": quote(50)})
        fixture_companies = [company(t) for t in ("AAA", "BBB", "CCC", "DDD")]
        cases = [(build_from(fixture_stories, fixture_filings, fixture_market, fixture_companies),
                  fixture_stories, fixture_filings)]
        path = REPO / "public" / "data" / "v1" / "connections.json"
        if path.exists():
            api = REPO / "public" / "data" / "v1"
            cases.append((
                json.loads(path.read_text(encoding="utf-8")),
                json.loads((api / "news" / "latest.json").read_text(encoding="utf-8"))["items"],
                json.loads((api / "disclosures" / "latest.json").read_text(encoding="utf-8"))["items"],
            ))
        for doc, stories, filings in cases:
            fp = doc["frontpage"]
            newest = fp["newest_day"]
            story_days = [dots.cairo_day(s["published"]) for s in stories]
            filing_days = [f["date"] for f in filings]
            week_from = days_before(newest, 6)

            def tickers(rows):
                return {t for r in rows for t in (r.get("tickers") or [])}

            with self.subTest(newest=newest, part="day"):
                self.assertEqual(fp["day"]["date"], newest)
                self.assertEqual(
                    fp["day"]["filings"],
                    filing_days.count(newest) if max(filing_days) == newest else None)
                self.assertEqual(
                    fp["day"]["stories"],
                    story_days.count(newest) if max(story_days) == newest else None)
            with self.subTest(newest=newest, part="week"):
                wf = [f for f in filings if week_from <= f["date"] <= newest]
                ws = [s for s in stories if week_from <= dots.cairo_day(s["published"]) <= newest]
                self.assertEqual(fp["week"]["from"], week_from)
                self.assertEqual(fp["week"]["to"], newest)
                self.assertEqual(fp["week"]["filings"], len(wf))
                self.assertEqual(fp["week"]["stories"], len(ws))
                self.assertEqual(fp["week"]["both"], len(tickers(ws) & tickers(wf)))
                self.assertEqual(fp["week"]["news_from"], min(story_days))
            with self.subTest(newest=newest, part="since"):
                self.assertEqual(fp["since"], {"from": min(filing_days), "filings": len(filings),
                                               "companies": len(tickers(filings))})
            with self.subTest(newest=newest, part="feeds"):
                self.assertEqual(fp["feeds"]["news"]["newest"], max(story_days))
                self.assertEqual(fp["feeds"]["news"]["oldest"], min(story_days))
                self.assertEqual(fp["feeds"]["news"]["items"], len(stories))
                self.assertEqual(fp["feeds"]["filings"]["newest"], max(filing_days))
                self.assertEqual(fp["feeds"]["filings"]["oldest"], min(filing_days))
                self.assertEqual(fp["feeds"]["filings"]["items"], len(filings))
            with self.subTest(newest=newest, part="touched"):
                self.assertEqual(fp["touched"], sorted(
                    i["ticker"] for i in doc["items"]
                    if any(s["date"] == newest for s in i["strands"])))
            with self.subTest(newest=newest, part="sentences"):
                s = fp["sentences"]
                self.assertEqual(set(s), {"count", "count_ar", "day", "day_ar",
                                          "week", "week_ar", "since", "since_ar"})
                self.assertEqual((s["count"], s["count_ar"]), dots.s_count(doc["total"]))

        # The fixture's numbers, spelled out: the feeds, not the crossing set.
        fp = cases[0][0]["frontpage"]
        self.assertEqual({i["ticker"] for i in cases[0][0]["items"]}, {"AAA"})
        self.assertEqual(fp["day"], {"date": DAY, "filings": 2, "stories": 2})
        self.assertEqual(fp["week"]["filings"], 3)
        self.assertEqual(fp["week"]["stories"], 4)
        self.assertEqual(fp["week"]["both"], 2)
        self.assertEqual(fp["since"], {"from": days_before(DAY, 20), "filings": 4, "companies": 3})
        self.assertEqual(fp["touched"], ["AAA"])
        self.assertEqual(fp["sentences"]["count"],
                         "One company turned up in more than one place between {from} and {to}.")
        self.assertEqual(fp["sentences"]["day"], "2 filings and 2 stories on {date}.")
        self.assertEqual(fp["sentences"]["day_ar"], "إفصاحين وخبران يوم {date}.")


class PublishedShapeTest(unittest.TestCase):
    """The additive contract Home reads, on the document actually published."""

    def setUp(self):
        path = REPO / "public" / "data" / "v1" / "connections.json"
        if not path.exists():
            self.skipTest("nothing published yet")
        self.doc = json.loads(path.read_text(encoding="utf-8"))

    def test_the_document_carries_the_window_the_total_and_the_frontpage(self):
        for key in ("window_start", "window_end", "total", "frontpage"):
            self.assertIn(key, self.doc)
        self.assertEqual(self.doc["total"], len(self.doc["items"]))
        for item in self.doc["items"]:
            for strand in item["strands"]:
                self.assertIn("title_ok", strand)
                self.assertIsInstance(strand["title_ok"], bool)
        fixture = FIXTURE_DIR / "connections.json"
        if fixture.exists():
            self.assertEqual(json.loads(fixture.read_text(encoding="utf-8")), self.doc,
                             "the app fixture and the published document disagree")


FIXTURE_DIR = REPO / "app" / "assets" / "fixtures"


if __name__ == "__main__":
    unittest.main()
