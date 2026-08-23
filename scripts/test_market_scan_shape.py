#!/usr/bin/env python3
"""What the market builder needs from a scan, and how it copes without it.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_market_api as market  # noqa: E402


class TradableTest(unittest.TestCase):
    """`tradable` comes from a broker page that only one machine has.

    `bool(None)` would publish `tradable: false` against all 291 companies — a
    confident false statement about every listing on the exchange, produced by
    an absence. Nothing in the app reads the field today, which makes it
    exactly the kind of thing that stays wrong for months.
    """

    def test_a_scan_with_scope_reports_it(self):
        self.assertIs(market.tradable_flag({"thndrScope": True}, True), True)
        self.assertIs(market.tradable_flag({"thndrScope": None}, True), False)

    def test_a_scan_without_scope_says_nothing(self):
        self.assertIsNone(market.tradable_flag({}, False))
        self.assertIsNone(market.tradable_flag({"close": 12}, False))


class ScanScriptTest(unittest.TestCase):
    def test_the_port_exists_and_has_no_absolute_paths(self):
        """The research script opens five paths on one particular laptop."""
        port = pathlib.Path(__file__).resolve().parent / "egx_scan.mjs"
        self.assertTrue(port.exists(), "scripts/egx_scan.mjs is missing")
        body = port.read_text(encoding="utf-8")
        # Comments explain what was dropped and name the old paths, so only
        # code lines are checked.
        code = "\n".join(
            line for line in body.splitlines() if not line.strip().startswith("//")
        )
        self.assertNotIn("/Users/", code)

    def test_it_only_needs_ws(self):
        port = pathlib.Path(__file__).resolve().parent / "egx_scan.mjs"
        body = port.read_text(encoding="utf-8")
        imports = [
            line for line in body.splitlines() if line.startswith("import ")
        ]
        for line in imports:
            self.assertTrue(
                'from "node:' in line or 'from "ws"' in line,
                f"unexpected dependency: {line}",
            )


if __name__ == "__main__":
    unittest.main()


class PerShareTest(unittest.TestCase):
    """Per-share arithmetic is only as good as the share count.

    Market cap is price times shares by definition, so if the three published
    figures do not multiply out then one is in the wrong unit and everything
    divided by the share count is wrong with it. EGBE's came out 51.95x off:
    its earnings per share fifty-two times too large, its P/E fifty-two times
    too small at 0.11 — which on a "lowest P/E" sort is the first row a reader
    sees.
    """

    def test_a_coherent_company_passes(self):
        # 100 shares at 10 pounds is a 1,000 pound company.
        self.assertTrue(market.share_count_agrees(10.0, 1000.0, 100))

    def test_a_share_count_in_the_wrong_unit_is_caught(self):
        self.assertFalse(market.share_count_agrees(10.0, 1000.0, 5200))
        self.assertFalse(market.share_count_agrees(10.0, 1000.0, 2))

    def test_missing_inputs_are_not_agreement(self):
        for args in (
            (None, 1000.0, 100),
            (10.0, None, 100),
            (10.0, 1000.0, None),
            (0.0, 1000.0, 100),
        ):
            with self.subTest(args):
                self.assertFalse(market.share_count_agrees(*args))

    def test_a_loss_keeps_its_earnings_per_share_but_loses_its_ratio(self):
        profile = {"shares_outstanding": 100, "market_cap": 1000.0}
        filed = {"annual": [{"period": "FY 2024", "net_income": -0.05}]}

        eps, period = market.per_share(profile, filed, 10.0)
        self.assertLess(eps, 0, "a loss must survive as a negative EPS")
        self.assertEqual(period, "FY 2024")

        ratio, _ = market.price_earnings(10.0, profile, filed)
        self.assertIsNone(ratio, "a negative P/E reads as the cheapest share")
