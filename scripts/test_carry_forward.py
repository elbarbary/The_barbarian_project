#!/usr/bin/env python3
"""A partial scan must not delete what a full one established.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import json
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_market_api as market  # noqa: E402


class CarryForwardTest(unittest.TestCase):
    def setUp(self):
        self._api = market.API
        self._dir = tempfile.TemporaryDirectory()
        self.addCleanup(self._dir.cleanup)
        market.API = pathlib.Path(self._dir.name)
        self.addCleanup(lambda: setattr(market, "API", self._api))

        companies = market.API / "companies"
        companies.mkdir(parents=True)
        (companies / "COMI.json").write_text(
            json.dumps(
                {
                    "ticker": "COMI",
                    "profile": {
                        "median_volume_20d": 1234567,
                        "rv20": 1.4,
                        "market_cap": 999,
                    },
                }
            ),
            encoding="utf-8",
        )

    def test_a_missing_history_figure_is_kept(self):
        """`median_volume_20d` is the figure behind "3.45x its own normal
        volume". A scan that reaches the exchange but not the history socket
        would otherwise delete it from every company at once."""
        profile = {"market_cap": 1000}
        carried = market.carry_forward("COMI", profile)

        self.assertEqual(profile["median_volume_20d"], 1234567)
        self.assertIn("median_volume_20d", carried)
        self.assertIn("rv20", carried)

    def test_what_the_scan_supplied_is_never_overwritten(self):
        profile = {"median_volume_20d": 7, "market_cap": 1000}
        carried = market.carry_forward("COMI", profile)

        self.assertEqual(profile["median_volume_20d"], 7)
        self.assertNotIn("median_volume_20d", carried)

    def test_scanner_columns_are_not_carried(self):
        """Only history-derived fields.

        The scanner's own columns are all-or-nothing — no record exists without
        them — so carrying a stale market cap forward would be inventing a
        company rather than filling a gap.
        """
        profile = {}
        market.carry_forward("COMI", profile)
        self.assertNotIn("market_cap", profile)

    def test_a_company_never_published_carries_nothing(self):
        profile = {}
        self.assertEqual(market.carry_forward("NEWCO", profile), [])
        self.assertEqual(profile, {})


if __name__ == "__main__":
    unittest.main()
