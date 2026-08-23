#!/usr/bin/env python3
"""The crossing sentences, and the guard between them and a reader.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import itertools
import json
import pathlib
import sys
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


if __name__ == "__main__":
    unittest.main()
