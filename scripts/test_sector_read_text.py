#!/usr/bin/env python3
"""The derived sector read, and the guards it has to pass to be publishable.

The model's read is refused unless it quotes no figure and instructs nobody.
This one is derived rather than generated, so it can be checked exhaustively
instead of sampled: every metric, in both directions, at every proportion the
vocabulary distinguishes, in both languages.
"""

from __future__ import annotations

import itertools
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_sector_reads
import build_sectors
import macro_types
import sector_read_text


def rows(*specs):
    return [{"key": k, "rising": r, "falling": f, "flat": t}
            for k, r, f, t in specs]


class DerivedRead(unittest.TestCase):
    def test_every_metric_and_split_passes_the_vetting(self):
        """No digit, no directive — over the whole space, not a sample."""
        keys = list(sector_read_text.PHRASE)
        # The proportions the vocabulary distinguishes, each side of the split.
        splits = [(20, 0, 0), (18, 2, 0), (12, 8, 0), (11, 9, 0), (10, 10, 0),
                  (9, 11, 0), (5, 15, 0), (0, 20, 0), (7, 6, 7), (1, 1, 18)]
        checked = 0
        for a, b in itertools.permutations(keys, 2):
            for left in splits:
                for right in splits:
                    read = sector_read_text.describe(
                        "Basic Resources",
                        rows((a, *left), (b, *right)), "الموارد الأساسية")
                    self.assertIsNotNone(read)
                    clean, why = build_sector_reads.vet(read)
                    self.assertIsNotNone(clean, f"{a}/{left} {b}/{right}: {why}")
                    checked += 1
        self.assertGreater(checked, 5000)

    def test_it_never_reaches_for_a_number(self):
        read = sector_read_text.describe(
            "Banks", rows(("assets", 11, 1, 0), ("pe", 5, 6, 1)))
        for field in (read["read"], read["read_ar"]):
            self.assertFalse([c for c in field if c.isdigit()], field)

    def test_it_says_where_the_sector_disagrees_with_itself(self):
        """The sentence a reader needs is the one where the metrics part."""
        read = sector_read_text.describe(
            "Real Estate",
            rows(("assets", 20, 2, 1), ("roe", 15, 5, 1),
                 ("cash_conversion", 9, 10, 1)))
        self.assertIn("widening their asset base", read["read"])
        self.assertIn("split reading", read["read"])
        self.assertIn("Is the reported profit arriving as cash?", read["read"])

    def test_arabic_is_a_sentence_not_a_transliteration(self):
        read = sector_read_text.describe(
            "Banks", rows(("profit", 9, 1, 0), ("roe", 8, 2, 0)), "البنوك")
        self.assertIn("في قطاع البنوك،", read["read_ar"])
        # "ومعظم منها" is not Arabic. The proportion words take الشركات.
        self.assertNotIn(" منها ", read["read_ar"])
        self.assertTrue(read["read_ar"].endswith("؟"))

    def test_the_exchanges_sector_names_get_their_article(self):
        """EGX files them indefinite: "بنوك" reads as "a sector called banks"."""
        self.assertEqual(sector_read_text._definite("بنوك"), "البنوك")
        self.assertEqual(sector_read_text._definite("العقارات"), "العقارات")
        # A Latin fallback name takes no Arabic article.
        self.assertEqual(sector_read_text._definite("Finance"), "Finance")
        self.assertEqual(sector_read_text._definite(None), "")

    def test_the_arabic_verb_agrees_with_its_subject(self):
        """"ويظل قاعدة الأصول" is the error that costs a reader's trust."""
        feminine = sector_read_text.describe(
            "Banks", rows(("roe", 9, 1, 0), ("assets", 5, 5, 0)), "البنوك")
        self.assertIn("وتظل قاعدة الأصول", feminine["read_ar"])
        masculine = sector_read_text.describe(
            "Banks", rows(("roe", 9, 1, 0), ("profit", 5, 5, 0)), "البنوك")
        self.assertIn("ويظل صافي الربح", masculine["read_ar"])

    def test_too_little_movement_is_no_read_rather_than_a_bad_one(self):
        self.assertIsNone(sector_read_text.describe("Banks", []))
        self.assertIsNone(sector_read_text.describe(
            "Banks", rows(("assets", 5, 1, 0))))
        # A metric nobody could read is not a metric.
        self.assertIsNone(sector_read_text.describe(
            "Banks", rows(("assets", 0, 0, 0), ("pe", 0, 0, 0))))
        self.assertIsNone(sector_read_text.describe("", rows(("assets", 5, 1, 0),
                                                            ("pe", 3, 2, 1))))

    def test_exactly_half_is_not_more_than_half(self):
        """Or the two sides of a split add to more than the sector."""
        self.assertEqual(sector_read_text._word(10, 20), "about half")
        self.assertEqual(sector_read_text._word(11, 20), "more than half")
        self.assertEqual(sector_read_text._word(20, 20), "nearly all")


class Fingerprint(unittest.TestCase):
    def test_a_read_is_tied_to_the_companies_it_describes(self):
        a = build_sectors.fingerprint(["COMI", "HRHO", "ADIB"])
        self.assertEqual(a, build_sectors.fingerprint(["ADIB", "COMI", "HRHO"]))
        # Finance kept its slug through the re-keying and lost 74 companies.
        self.assertNotEqual(a, build_sectors.fingerprint(["COMI", "HRHO"]))
        self.assertEqual(len(a), 12)


if __name__ == "__main__":
    unittest.main()
