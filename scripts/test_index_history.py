#!/usr/bin/env python3
"""The guard that stops us charting the wrong instrument.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import index_history as ih  # noqa: E402


class VerifyTest(unittest.TestCase):
    def setUp(self) -> None:
        self._published = ih.published_levels
        ih.published_levels = lambda: {
            "EGX30": 54737.1,
            "EGX70EWI": 20816.0,
            "EGX100EWI": 27052.4,
        }

    def tearDown(self) -> None:
        ih.published_levels = self._published

    def test_agreeing_series_is_accepted(self):
        ih.verify(
            {
                "EGX30": {"2026-08-19": 54512.65, "2026-08-20": 54737.07},
                "EGX70EWI": {"2026-08-20": 20816.03},
                "EGX100EWI": {"2026-08-20": 27052.41},
            }
        )

    def test_the_wrong_instrument_is_refused(self):
        # The real failure this exists for: the first candidate id tried
        # returned a series closing around 16 against an index at 54,737, and
        # a chart of it would have looked perfectly plausible.
        with self.assertRaises(ih.IndexHistoryUnavailable) as caught:
            ih.verify(
                {
                    "EGX30": {"2026-08-20": 16.01},
                    "EGX70EWI": {"2026-08-20": 20816.03},
                    "EGX100EWI": {"2026-08-20": 27052.41},
                }
            )
        self.assertIn("wrong instrument", str(caught.exception))

    def test_an_empty_series_is_refused(self):
        with self.assertRaises(ih.IndexHistoryUnavailable):
            ih.verify({"EGX30": {}})

    def test_rounding_is_not_a_disagreement(self):
        # We publish one decimal place; the source gives two.
        ih.verify(
            {
                "EGX30": {"2026-08-20": 54737.07},
                "EGX70EWI": {"2026-08-20": 20816.03},
                "EGX100EWI": {"2026-08-20": 27052.41},
            }
        )

    def test_nothing_published_means_nothing_to_trust(self):
        ih.published_levels = dict
        with self.assertRaises(ih.IndexHistoryUnavailable):
            ih.verify({"EGX30": {"2026-08-20": 54737.07}})


if __name__ == "__main__":
    unittest.main()
