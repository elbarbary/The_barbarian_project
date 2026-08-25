#!/usr/bin/env python3
"""What a probable answer may say, and what it must be refused for.

The read was already a model writing prose about a named security, and it is
vetted for it. The answers are the same risk one metric at a time: a short,
model-written reason a figure is moving. The bar is identical — no advice, no
invented figure — but the failure is handled differently. A bad *read* is
dropped whole; a bad *answer* is dropped on its own, so one over-reaching
sentence does not cost the paragraph or the other nine answers.
"""
import unittest

import build_review_reads as b


class Targets(unittest.TestCase):
    def test_only_a_moving_metric_earns_a_question(self):
        doc = {"metrics": [
            {"key": "profit", "direction": "rising"},
            {"key": "pe", "direction": "flat"},
            {"key": "dividend_yield", "direction": "unknown"},
            {"key": "roe", "direction": "falling"},
        ]}
        self.assertEqual([k for k, _, _ in b.targets(doc)], ["profit", "roe"])


class Answers(unittest.TestCase):
    BASE = {
        "read": "Profit and earnings per share have risen together over the "
                "last three years.",
        "read_ar": "ارتفع الربح ونصيب السهم معًا.",
    }

    def vet(self, answers):
        return b.vet({**self.BASE, "answers": answers})

    def test_a_clean_answer_is_kept_in_both_languages(self):
        clean, why = self.vet({"profit": {
            "en": "Profit rose alongside assets, consistent with the business "
                  "getting larger rather than a one-off.",
            "ar": "ارتفع الربح مع الأصول.",
        }})
        self.assertEqual(why, "")
        self.assertEqual(clean["answers"]["profit"]["ar"], "ارتفع الربح مع الأصول.")

    def test_an_answer_that_advises_is_dropped_and_the_read_survives(self):
        clean, why = self.vet({"roe": {
            "en": "Investors should buy this share now.", "ar": ""}})
        self.assertEqual(why, "")
        self.assertNotIn("roe", clean["answers"])
        self.assertTrue(clean["read"])

    def test_an_answer_that_quotes_a_figure_is_dropped(self):
        clean, _ = self.vet({"eps": {
            "en": "Earnings per share climbed 25 percent last year.", "ar": ""}})
        self.assertNotIn("eps", clean["answers"])

    def test_a_year_is_allowed(self):
        clean, _ = self.vet({"profit": {
            "en": "Profit has climbed every year since 2021, in step with "
                  "assets.", "ar": ""}})
        self.assertIn("profit", clean["answers"])

    def test_an_unknown_metric_key_is_ignored(self):
        clean, _ = self.vet({"mystery": {
            "en": "This does not correspond to any metric on the sheet.",
            "ar": ""}})
        self.assertEqual(clean["answers"], {})

    def test_a_figure_in_the_arabic_drops_only_the_arabic(self):
        clean, _ = self.vet({"profit": {
            "en": "Profit rose alongside assets, likely real growth.",
            "ar": "ارتفع الربح 25 بالمئة."}})
        self.assertIn("profit", clean["answers"])
        self.assertEqual(clean["answers"]["profit"]["ar"], "")


if __name__ == "__main__":
    unittest.main()
