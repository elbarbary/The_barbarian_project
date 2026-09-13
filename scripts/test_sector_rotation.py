#!/usr/bin/env python3
"""A base rate is only worth publishing if the cases behind it are countable.

The three ways this becomes a lie: a change measured across a gap in the
archive, a rate quoted over too few cases to be one, and an arrow drawn between
two sectors because turnover happened to move in opposite directions.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import json
import re
import unittest

import build_sector_rotation as rot


def grid(*rows):
    """(month, {sector: share}) pairs → the share dict the functions take."""
    return {month: dict(shares) for month, shares in rows}


class Coverage(unittest.TestCase):
    def test_a_thin_month_is_not_compared_with_a_full_one(self):
        months = {"2024-01": {f"S{i}": 1.0 for i in range(10)},
                  "2024-02": {f"S{i}": 1.0 for i in range(10)}}
        reported = {"2024-01": set(range(80)), "2024-02": set(range(20))}
        self.assertEqual(rot.covered(months, reported, 100), ["2024-01"])

    def test_a_month_of_two_sectors_is_not_a_market(self):
        months = {"2024-01": {"A": 1.0, "B": 2.0}}
        reported = {"2024-01": set(range(100))}
        self.assertEqual(rot.covered(months, reported, 100), [])


class Changes(unittest.TestCase):
    def test_a_change_is_never_measured_across_a_gap(self):
        # 2024-02 failed the coverage bar and is absent. The difference between
        # January and March is two archives, not a month of rotation.
        share = grid(("2024-01", {"A": 40.0, "B": 60.0}),
                     ("2024-03", {"A": 50.0, "B": 50.0}))
        self.assertEqual(rot.changes(share, ["2024-01", "2024-03"]), {})

    def test_consecutive_months_are_differenced(self):
        share = grid(("2024-01", {"A": 40.0, "B": 60.0}),
                     ("2024-02", {"A": 43.0, "B": 57.0}))
        out = rot.changes(share, ["2024-01", "2024-02"])
        self.assertEqual(out["2024-02"]["A"], 3.0)
        self.assertEqual(out["2024-02"]["B"], -3.0)

    def test_a_year_boundary_is_still_one_month(self):
        share = grid(("2024-12", {"A": 40.0, "B": 60.0}),
                     ("2025-01", {"A": 41.0, "B": 59.0}))
        self.assertIn("2025-01", rot.changes(share, ["2024-12", "2025-01"]))

    def test_shares_are_a_share_of_the_month(self):
        months = {"2024-01": {"A": 25.0, "B": 75.0}}
        out = rot.shares(months, ["2024-01"])
        self.assertAlmostEqual(sum(out["2024-01"].values()), 100.0)
        self.assertAlmostEqual(out["2024-01"]["A"], 25.0)


class WhatFollowed(unittest.TestCase):
    def months(self, moves):
        """moves: {month: {sector: change}} already differenced."""
        return moves, sorted(moves)

    def test_every_case_is_listed_with_its_dates(self):
        delta = {"2024-02": {"A": 3.0}, "2024-03": {"A": -2.0},
                 "2024-04": {"A": 4.0}, "2024-05": {"A": 1.0}}
        out = rot.what_followed(delta, sorted(delta), "A")
        self.assertEqual(out["count"], 2)
        self.assertEqual(out["cases"][0],
                         {"month": "2024-02", "rose": 3.0,
                          "next": "2024-03", "then": -2.0})
        self.assertEqual(out["gaveBack"], 1)

    def test_a_rate_is_withheld_until_there_are_cases_to_rate(self):
        # One case rounded to "100%" is how a single month becomes a claim.
        delta = {"2024-02": {"A": 3.0}, "2024-03": {"A": -2.0}}
        out = rot.what_followed(delta, sorted(delta), "A")
        self.assertEqual(out["count"], 1)
        self.assertIsNone(out["share"])

    def test_with_enough_cases_the_rate_is_the_cases(self):
        delta = {}
        for i in range(1, 13):
            delta[f"2024-{i:02d}"] = {"A": 3.0 if i % 2 else -2.0}
        out = rot.what_followed(delta, sorted(delta), "A")
        self.assertGreaterEqual(out["count"], 5)
        self.assertEqual(out["share"], round(out["gaveBack"] / out["count"] * 100))

    def test_a_case_never_crosses_a_gap_either(self):
        delta = {"2024-02": {"A": 3.0}, "2024-05": {"A": -2.0}}
        self.assertEqual(rot.what_followed(delta, sorted(delta), "A")["count"], 0)


class TheHeadlineFrequency(unittest.TestCase):
    def test_it_is_withheld_below_thirty_cases(self):
        delta = {"2024-02": {"A": 3.0}, "2024-03": {"A": -2.0}}
        self.assertIsNone(rot.across_the_market(delta, sorted(delta), 1.0)["share"])

    def test_it_counts_only_sectors_present_in_both_months(self):
        delta = {"2024-02": {"A": 3.0, "B": 3.0}, "2024-03": {"A": -1.0}}
        out = rot.across_the_market(delta, sorted(delta), 1.0)
        self.assertEqual(out["cases"], 1, "a sector absent next month was counted")


class WhatIsNeverPublished(unittest.TestCase):
    """The statistical refusal, kept in the document rather than in a comment."""

    @classmethod
    def setUpClass(cls):
        cls.doc = rot.build()

    def test_no_pair_arrow_or_flow_between_sectors_is_emitted(self):
        # The strongest lead-lag pair in the record lifts a sector's own base
        # rate by 16.8 points; shuffling the months gives a best of 16.7. It is
        # the best of nine hundred pairs, and it is noise.
        text = json.dumps(self.doc, ensure_ascii=False)
        for word in ('"pairs"', '"flows"', '"arrows"', '"rotationPairs"',
                     '"movedTo"', '"destination"'):
            self.assertNotIn(word, text, f"{word} is a transfer this cannot evidence")

    def test_the_document_says_why_it_refuses(self):
        self.assertIn("noise", self.doc["refuses"])
        self.assertIn("not that money left one sector", self.doc["refuses"])

    def test_nothing_in_it_forecasts(self):
        forbidden = ("forecast", "predict", "expected to", "will rise",
                     "will fall", "recommend", "should buy", "target price")
        for field in ("basis", "refuses"):
            for sentence in re.split(r"(?<=[.!?])\s+", self.doc[field]):
                low = sentence.lower()
                if re.search(r"\b(no|not|never|cannot|nothing)\b", low):
                    continue          # a sentence carrying its own negation
                for word in forbidden:
                    self.assertNotIn(word, low, sentence)


class WhatIsPublished(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = rot.build()

    def test_the_record_is_deeper_than_the_screen_it_replaces(self):
        # The months chart showed fourteen. Fourteen cannot evidence a rate.
        self.assertGreater(len(self.doc["months"]), 60)

    def test_the_first_month_has_no_change_to_report(self):
        self.assertIsNone(self.doc["months"][0]["changes"])

    def test_each_month_s_shares_add_up(self):
        for row in self.doc["months"][:12]:
            self.assertAlmostEqual(sum(row["shares"].values()), 100.0, places=1)

    def test_both_halves_of_the_record_are_stated_separately(self):
        # A rate that holds in one half only is a period, not a pattern.
        halves = self.doc["byEra"]
        self.assertEqual(len(halves), 2)
        for half in halves:
            self.assertIsNotNone(half["share"], "an era too thin to state")

    def test_every_sector_on_the_grid_can_be_asked_what_followed(self):
        for sector in self.doc["sectors"]:
            self.assertIn(sector, self.doc["followed"])


if __name__ == "__main__":
    unittest.main()
