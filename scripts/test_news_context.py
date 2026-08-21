#!/usr/bin/env python3
"""The news glossary, and the regression that produced it.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_news_api as build  # noqa: E402
import macro_types  # noqa: E402
import news_context as nc  # noqa: E402

PUBLISHED = (
    pathlib.Path(__file__).resolve().parent.parent
    / "public" / "data" / "v1" / "news" / "latest.json"
)


def sentences() -> list[tuple[str, str]]:
    """(where it came from, the sentence) for every string a reader can see."""
    out = []
    for key, _pattern, en, ar in nc.SUBJECTS:
        out.append((f"subject {key} en", en))
        out.append((f"subject {key} ar", ar))
    for key, (en, ar) in nc.EVENT_MEANING.items():
        out.append((f"event {key} en", en))
        out.append((f"event {key} ar", ar))
    return out


class GlossaryTest(unittest.TestCase):
    def test_no_line_instructs_the_reader(self):
        """§8 — the publisher holds no FRA licence."""
        for where, text in sentences():
            with self.subTest(where):
                found = macro_types.directive(text)
                self.assertIsNone(
                    found, f"{where} reads as an instruction: {found!r}"
                )

    def test_every_entry_is_written_in_both_languages(self):
        # An Arabic reader meeting an English explanation is the failure this
        # app exists to avoid.
        for where, text in sentences():
            with self.subTest(where):
                self.assertTrue(text.strip(), f"{where} is empty")
        for key, _p, _en, ar in nc.SUBJECTS:
            with self.subTest(key):
                self.assertTrue(
                    any("؀" <= ch <= "ۿ" for ch in ar),
                    f"{key}: the Arabic is not Arabic",
                )

    def test_every_event_has_an_arabic_label(self):
        for key, _label, _pattern in build.EVENTS:
            with self.subTest(key):
                self.assertIn(key, nc.EVENT_LABEL_AR)

    def test_subjects_are_unique(self):
        keys = [k for k, *_ in nc.SUBJECTS]
        self.assertEqual(len(keys), len(set(keys)))


class MatchTest(unittest.TestCase):
    def fold(self, headline: str) -> str:
        return nc.normalise_ar(headline)

    def test_the_subject_beats_a_wrong_event_guess(self):
        """The regression the ticker-gate was originally written for.

        A gold-price story was once published carrying "the company published
        what it earned or lost over a period", because the free-text event
        classifier read it as results. A subject match reads what the story is
        actually about, so it survives a bad guess.
        """
        en, _ar, subject = nc.meaning_for(
            self.fold("ارتفاع أسعار الذهب وتراجع أرباح المضاربين"), "results"
        )
        self.assertEqual(subject, "gold")
        self.assertIn("Gold", en)

    def test_an_unrelated_story_gets_no_line(self):
        # Silence is the honest answer, and it is the whole reason this file
        # exists — a sentence printed on every row teaches a reader to skip it.
        en, ar, subject = nc.meaning_for(
            self.fold("الصحة توفر 300 ألف جرعة من لقاح الإنفلونزا"), "other"
        )
        self.assertIsNone(subject)
        self.assertEqual((en, ar), ("", ""))

    def test_the_fold_matches_spelling_variants(self):
        for spelling in ("قناة السويس", "قناه السويس", "قناة السويس"):
            with self.subTest(spelling):
                self.assertEqual(nc.subject(self.fold(spelling)), "suez")

    def test_known_subjects_are_recognised(self):
        cases = {
            "تراجع أسعار النفط عالميًا": "oil",
            "البنك المركزي يثبت سعر الفائدة": "rates",
            "ارتفاع تحويلات المصريين بالخارج": "remittances",
            "الجنيه يستقر أمام الدولار": "currency",
            "صندوق النقد يراجع البرنامج المصري": "sovereign",
        }
        for headline, expected in cases.items():
            with self.subTest(headline):
                self.assertEqual(nc.subject(self.fold(headline)), expected)


class ScopeTest(unittest.TestCase):
    """Every one of these was wrong on a real run of the live feed."""

    def silent(self, headline: str):
        en, ar, subject = nc.meaning_for(nc.normalise_ar(headline), "other")
        self.assertIsNone(subject, f"{headline!r} got {subject!r}")
        self.assertEqual((en, ar), ("", ""))

    def fires(self, headline: str, expected: str):
        _en, _ar, subject = nc.meaning_for(nc.normalise_ar(headline), "other")
        self.assertEqual(subject, expected, headline)

    def test_a_foreign_story_gets_no_egyptian_mechanism(self):
        # Published to the simulator carrying "Egypt is among the world's
        # largest wheat buyers" and "Gulf states are the largest foreign buyers
        # of Egyptian assets" respectively.
        self.silent("لكبح تضخم الغذاء الأمريكي.. ترامب يسمح باستيراد لحم البقر")
        self.silent("الصين تضغط على الاتحاد الأوروبي في نزاع الدعم الحكومي للشركات")
        self.silent("السعودية والعراق يبحثان تعزيز التعاون وجهود دعم أمن الطاقة")
        self.silent("الأسهم الأوروبية تتجه لخسارة أسبوعية مع صعود النفط")

    def test_a_golden_licence_is_not_gold(self):
        # "الرخصة الذهبية" is an investment permit. It led the feed carrying
        # the mechanism for the metal.
        self.silent("مجلس الوزراء يوافق على منح نيفير منيا الرخصة الذهبية")
        self.fires("الذهب يتجه لتحقيق مكاسب للأسبوع الثالث", "gold")

    def test_an_egyptian_ministry_is_egypt_even_naming_a_foreign_firm(self):
        # Egypt's petroleum ministry; the only country named is Greece.
        self.fires(
            "وزير البترول يبحث مع إنرجين اليونانية زيادة الاستثمارات", "oil"
        )


class PublishedFeedTest(unittest.TestCase):
    """The measurement that started this: one sentence across every story.

    Before this glossary, all 174 published stories carried the identical line
    because the ticker matcher resolves 9 companies out of 282. These bounds
    are deliberately loose — they are here to catch the feed collapsing back to
    a single sentence, not to pin an exact number that moves with the news.
    """

    def setUp(self):
        if not PUBLISHED.exists():
            self.skipTest("no published feed to measure")
        self.items = json.loads(PUBLISHED.read_text(encoding="utf-8"))["items"]

    def test_the_feed_says_more_than_one_thing(self):
        distinct = set()
        explained = 0
        for item in self.items:
            en, _ar, _s = nc.meaning_for(
                nc.normalise_ar(item["headline"]), item["event"]
            )
            if en:
                explained += 1
                distinct.add(en)
        self.assertGreaterEqual(
            len(distinct), 12, "the feed has collapsed to a handful of sentences"
        )
        self.assertGreaterEqual(
            explained, len(self.items) // 3, "most of the feed explains nothing"
        )


if __name__ == "__main__":
    unittest.main()
