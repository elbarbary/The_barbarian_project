#!/usr/bin/env python3
"""The checks that stop somebody else's prices becoming this company's chart.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import fetch_price_history as fp  # noqa: E402

# Real El Sewedy rows, in the order the file publishes them. There is no header
# line, so this order is the thing under test.
SAMPLE = "\n".join(
    [
        "2026-08-11/00:00:00,108.0,111.0,106.51,109.3,1234567",
        "2026-08-12/00:00:00,109.3,112.12,107.0,107.11,987654",
        "2026-08-16/00:00:00,107.53,128.9,108.0,120.9,4166754",
        "2026-08-18/00:00:00,122.12,133.98,121.0,127.25,2711205",
        "2026-08-20/00:00:00,118.11,120.97,115.0,116.0,649885",
    ]
)


class ParseTest(unittest.TestCase):
    def test_the_fifth_column_is_the_close(self):
        # Established by matching 233 overlapping sessions against our own
        # closes. Reading the first number as the close — the obvious guess,
        # since it is the one nearest the date — yields the open.
        bars = fp.parse_csv(SAMPLE)
        self.assertEqual(len(bars), 5)
        self.assertEqual(bars[-1]["date"], "2026-08-20")
        self.assertEqual(bars[-1]["close"], 116.0)
        self.assertEqual(bars[-1]["volume"], 649885)

    def test_rows_come_back_oldest_first(self):
        bars = fp.parse_csv(SAMPLE)
        self.assertEqual([b["date"] for b in bars], sorted(b["date"] for b in bars))

    def test_a_suspended_session_is_dropped_not_charted_as_zero(self):
        body = SAMPLE + "\n2026-08-21/00:00:00,0,0,0,0,0"
        self.assertEqual(len(fp.parse_csv(body)), 5)

    def test_junk_lines_are_ignored(self):
        self.assertEqual(fp.parse_csv("nonsense\n\n,,,,,\n"), [])


class VerifyTest(unittest.TestCase):
    def setUp(self):
        self._stored = fp.stored_closes

    def tearDown(self):
        fp.stored_closes = self._stored

    def _ours(self, mapping):
        fp.stored_closes = lambda _t: mapping

    def test_a_matching_series_is_accepted(self):
        self._ours({
            "2026-08-11": 109.3, "2026-08-12": 107.11, "2026-08-16": 120.9,
            "2026-08-18": 127.25, "2026-08-20": 116.0,
        })
        fp.verify("SWDY", fp.parse_csv(SAMPLE))

    def test_another_company_series_is_refused(self):
        # The failure this exists for: an opaque hash in a URL is not a name,
        # and the wrong file yields a complete, plausible chart.
        self._ours({
            "2026-08-11": 12.4, "2026-08-12": 12.1, "2026-08-16": 13.0,
            "2026-08-18": 12.8, "2026-08-20": 12.9,
        })
        with self.assertRaises(fp.PriceHistoryUnavailable) as caught:
            fp.verify("SWDY", fp.parse_csv(SAMPLE))
        self.assertIn("different company", str(caught.exception))

    def test_too_little_overlap_is_refused(self):
        self._ours({"2026-08-20": 116.0})
        with self.assertRaises(fp.PriceHistoryUnavailable) as caught:
            fp.verify("SWDY", fp.parse_csv(SAMPLE))
        self.assertIn("overlapping", str(caught.exception))

    def test_nothing_stored_means_nothing_to_trust(self):
        # 23 listings hold no history at all, and an unverifiable series for
        # one of them is exactly how a wrong one would get in unnoticed.
        self._ours({})
        with self.assertRaises(fp.PriceHistoryUnavailable):
            fp.verify("SWDY", fp.parse_csv(SAMPLE))

    def test_an_empty_series_is_refused(self):
        self._ours({"2026-08-20": 116.0})
        with self.assertRaises(fp.PriceHistoryUnavailable):
            fp.verify("SWDY", [])

    def test_rounding_is_not_a_disagreement(self):
        self._ours({
            "2026-08-11": 109.3, "2026-08-12": 107.11, "2026-08-16": 120.9,
            "2026-08-18": 127.2501, "2026-08-20": 115.999,
        })
        fp.verify("SWDY", fp.parse_csv(SAMPLE))


if __name__ == "__main__":
    unittest.main()
