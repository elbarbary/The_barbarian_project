#!/usr/bin/env python3
"""Naming a company from an Arabic headline, and refusing to guess.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import company_match as cm  # noqa: E402


class KeyTest(unittest.TestCase):
    def test_a_key_is_always_two_words(self):
        """One word is a category, not a name.

        Every single-word key the first version produced was a description:
        ICID reduced to "العالمية" (global) and matched a story about Forbes
        and one about world food prices; ARCC reduced to "للاسمنت" (for
        cement) and would have matched any cement company on the exchange.
        """
        for name in (
            "العالمية للاستثمار والتنمية",
            "العربية للأسمنت",
            "المصرية للاتصالات",
        ):
            with self.subTest(name):
                key = cm.key_for(name)
                if key is not None:
                    self.assertIn(" ", key, f"{name!r} yielded {key!r}")

    def test_the_street_name_and_the_legal_name_both_key(self):
        """Papers use whichever they like, so both have to work."""
        keys = cm.keys_for("أبو قير للاسمدة و الصناعات الكيماوية (ابوقير للاسمدة)")
        self.assertGreaterEqual(len(keys), 2)

    def test_generic_furniture_is_stripped_before_the_head_is_taken(self):
        # "مجموعة" and "القابضة" name a hundred companies between them; the
        # key has to reach the part that names one.
        self.assertEqual(cm.key_for("مجموعة طلعت مصطفى القابضة"), "طلعت مصطفي")

    def test_a_region_is_where_a_company_is_not_who_it_is(self):
        """MEGM keyed on "الشرق الاوسط" and matched a story about a factory
        being opened "in the Middle East"."""
        keys = cm.keys_for("الشرق الأوسط لصناعة الزجاج ش م م")
        for key in keys:
            self.assertNotIn("الشرق", key)
        # And the industry words stay usable, because dropping those too cost
        # two companies their keys and gained nothing.
        self.assertEqual(cm.key_for("مصر لصناعة الكيماويات"), "لصناعه الكيماويات")

    def test_a_key_two_companies_claim_is_dropped(self):
        built = cm.build(
            {
                "AAAA": "الشركة المصرية للتنمية العقارية",
                "BBBB": "الشركة المصرية للتنمية الصناعية",
                "CCCC": "بالم هيلز للتعمير",
            }
        )
        self.assertIn("بالم هيلز", built)
        # Both of the first two reduce to the same head, so neither may claim it.
        self.assertNotIn("العقارية الصناعية", built)
        for ticker in built.values():
            self.assertNotEqual(ticker, "AAAA")


    def test_a_key_inside_another_name_identifies_neither(self):
        """Distinct keys are not the same thing as distinguishable ones.

        Mixed Oils reduces to "للزيوت والصابون", which is most of Cairo Oils &
        Soap's name — so a headline about Cairo Oils came back carrying both
        companies. The keys differed; the discrimination did not.
        """
        built = cm.build(
            {
                "MOSC": "مصر للزيوت والصابون",
                "COSG": "القاهرة للزيوت والصابون",
            }
        )
        self.assertNotIn("MOSC", built.values())


class MatchTest(unittest.TestCase):
    def setUp(self):
        self.keys = cm.build(
            {
                "PHDC": "بالم هيلز للتعمير",
                "TMGH": "مجموعة طلعت مصطفى القابضة",
                "SWDY": "السويدي اليكتريك ش م م",
            }
        )

    def test_it_names_the_company_a_headline_names(self):
        self.assertEqual(
            cm.match("بالم هيلز ترتفع بأرباحها النصفية", self.keys), ["PHDC"]
        )
        self.assertEqual(
            cm.match("أرباح مجموعة طلعت مصطفى في النصف الأول", self.keys),
            ["TMGH"],
        )

    def test_it_names_nobody_when_nobody_is_named(self):
        for headline in (
            "الذهب يتجه لتحقيق مكاسب للأسبوع الثالث",
            "البنك المركزي يثبت سعر الفائدة",
            # The single word that produced the original false positive.
            "وزير التموين مصطفى يفتتح معرضًا",
        ):
            with self.subTest(headline):
                self.assertEqual(cm.match(headline, self.keys), [])

    def test_matching_is_whole_tokens_not_substrings(self):
        # "بالم هيلز" inside a longer word must not count.
        self.assertEqual(cm.match("بالمهيلز", self.keys), [])

    def test_spelling_variants_fold_together(self):
        # Alef with and without hamza, teh marbuta against heh.
        self.assertEqual(
            cm.match("السويدى اليكتريك تعلن نتائجها", self.keys), ["SWDY"]
        )


class PublishedTest(unittest.TestCase):
    def test_the_map_holds_and_keys_cleanly(self):
        keys = cm.load()
        if not keys:
            self.skipTest("no names harvested yet")
        self.assertTrue(all(" " in k for k in keys), "a one-word key survived")
        # Every key names exactly one company, by construction.
        self.assertEqual(len(set(keys)), len(keys))


if __name__ == "__main__":
    unittest.main()
