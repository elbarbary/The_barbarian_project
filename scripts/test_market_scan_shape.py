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
