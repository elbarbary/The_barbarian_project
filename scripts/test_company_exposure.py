#!/usr/bin/env python3
"""A model may write the sentence; it may not introduce a number.

The card exists to turn three rows of filed figures into something a reader can
act on, and the only thing making that publishable is that every number in it
is one of the figures printed beside it. These are the ways that stops being
true: a rounded figure reading as the filed one, a sentence that quietly
becomes advice, and a guard so strict it throws away the good sentences.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import unittest

import build_company_exposure as ex

ALLOWED = {
    "borrowings it owes": "1.42B EGP",
    "of that repricing within a year": "96.5%",
    "interest cover": "-1.04×",
    "revenue filed": "564.04M EGP",
    "gross margin": "6.2%",
    "period the rates figures cover": "Q1 2026",
}


class NumbersItWasGiven(unittest.TestCase):
    def test_a_figure_it_was_given_passes(self):
        self.assertTrue(ex.grounded("It filed borrowings of 1.42B EGP.", ALLOWED))
        self.assertTrue(ex.grounded("Margin was 6.2% and revenue 564.04M EGP.", ALLOWED))

    def test_a_rounded_figure_is_not_the_filed_one(self):
        # "1.4 billion" against a filed 1.42B EGP. A plain substring test let
        # this through, because "1.4" is inside "1.42B EGP" — a rounded number
        # reading as the filed one is exactly what this guard is for.
        self.assertFalse(ex.grounded("Borrowings of 1.4 billion.", ALLOWED))
        self.assertFalse(ex.grounded("Margin was 6%.", ALLOWED))

    def test_a_neighbouring_figure_is_not_the_filed_one(self):
        self.assertFalse(ex.grounded("Borrowings of 1.43B EGP.", ALLOWED))
        self.assertFalse(ex.grounded("Cover of -1.05×.", ALLOWED))

    def test_an_invented_figure_is_refused(self):
        self.assertFalse(ex.grounded("It also holds 900M EGP in cash.", ALLOWED))

    def test_the_full_stop_at_the_end_is_not_part_of_the_number(self):
        # The regex used to swallow it, so "…in Q1 2026." produced the token
        # "2026." and a good sentence was dropped over punctuation.
        self.assertEqual(ex.numbers_in("It reaches in Q1 2026."), ["1 ", "2026"])
        self.assertTrue(ex.grounded("All three reach it in Q1 2026.", ALLOWED))

    def test_the_comma_after_a_year_is_not_part_of_the_number(self):
        # Same family as the full stop, and it cost nineteen good sentences
        # before it was found: "For H1 2026, the company filed…" produced the
        # token "2026," and the sentence was thrown away. A number must end in
        # a digit.
        self.assertTrue(ex.grounded("For Q1 2026, it filed 1.42B EGP.", ALLOWED))
        self.assertIn("2026", ex.numbers_in("For Q1 2026, it filed"))
        self.assertNotIn("2026,", ex.numbers_in("For Q1 2026, it filed"))

    def test_a_thousands_separator_inside_a_number_survives(self):
        self.assertTrue(ex.grounded("It filed 1,234 EGP.", {"x": "1,234 EGP"}))

    def test_counting_is_not_a_figure(self):
        self.assertTrue(ex.grounded("Two of the three channels reach it.", ALLOWED))

    def test_a_card_with_no_figures_grounds_nothing(self):
        self.assertFalse(ex.grounded("It filed 1.42B EGP.", {}))


class SentencesThatAdvise(unittest.TestCase):
    def test_a_recommendation_is_refused(self):
        for said in ("This looks attractive at these levels.",
                     "The margin is likely to improve.",
                     "Investors should buy on weakness.",
                     "The shares appear undervalued."):
            self.assertIsNotNone(ex.advises(said), said)

    def test_a_description_is_not_a_recommendation(self):
        for said in ("It filed a gross margin of 6.2%.",
                     "All of its borrowings reprice within a year.",
                     "It filed nothing for the currency channel."):
            self.assertIsNone(ex.advises(said), said)

    def test_a_sentence_carrying_its_own_negation_is_the_disclaimer(self):
        self.assertIsNone(
            ex.advises("Nothing here says whether the shares are cheap."))


class Vetting(unittest.TestCase):
    def test_it_keeps_the_good_and_names_why_it_dropped_the_rest(self):
        kept, dropped = ex.vet([
            "It filed borrowings of 1.42B EGP against a 6.2% gross margin.",
            "Borrowings of 1.4 billion make it attractive.",
            "short",
        ], ALLOWED)
        self.assertEqual(len(kept), 1)
        whys = " ".join(d["why"] for d in dropped)
        self.assertIn("was not given", whys)
        self.assertIn("not a sentence", whys)

    def test_nothing_survives_an_answer_that_is_not_a_list(self):
        kept, dropped = ex.vet("a paragraph", ALLOWED)
        self.assertEqual(kept, [])
        self.assertTrue(dropped)


class HowFiguresAreWritten(unittest.TestCase):
    def test_they_are_written_the_way_the_page_writes_them(self):
        self.assertEqual(ex.formatted(1419.314), "1.42B EGP")
        self.assertEqual(ex.formatted(564.04), "564.04M EGP")
        self.assertEqual(ex.formatted(96.5, "%"), "96.5%")
        self.assertEqual(ex.formatted(-1.0408, "x"), "-1.04×")

    def test_a_figure_that_is_not_a_number_is_not_offered(self):
        self.assertIsNone(ex.formatted(None))
        self.assertIsNone(ex.formatted("many"))


if __name__ == "__main__":
    unittest.main()
