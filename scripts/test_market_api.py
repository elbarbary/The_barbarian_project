#!/usr/bin/env python3
"""What session a scan belongs to.

`build()` used `scan["asOf"][:10]` verbatim, so a scan that ran at the weekend
stamped a day the exchange does not trade. On 22 August the pipeline published
`market.json {"date": "2026-08-21", "is_close": true}` — a Friday — and that
date travelled: `build_disclosures_api` copies `market["date"]` into each
filing's `evidence.date`, and Home's unusual rail renders it under a field
whose docstring names it "the session the multiple was measured on (§49)".
"""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from build_market_api import is_after_close, session_date  # noqa: E402


class SessionDateTest(unittest.TestCase):
    def test_a_trading_day_is_itself(self):
        # Sunday through Thursday are trading days and are left alone.
        for stamp, expected in [
            ("2026-08-23T13:00:00Z", "2026-08-23"),  # Sunday
            ("2026-08-24T13:00:00Z", "2026-08-24"),  # Monday
            ("2026-08-20T15:00:00Z", "2026-08-20"),  # Thursday
        ]:
            self.assertEqual(session_date(stamp), expected, stamp)

    def test_the_weekend_is_dated_to_the_thursday_it_is_reading(self):
        # This is the bug: a Friday scan reads Thursday's closes.
        self.assertEqual(session_date("2026-08-21T16:00:00Z"), "2026-08-20")
        self.assertEqual(session_date("2026-08-22T09:00:00Z"), "2026-08-20")

    def test_the_published_friday_would_not_be_published_again(self):
        # The exact scan stamp that shipped 2026-08-21.
        self.assertNotEqual(session_date("2026-08-21T16:00:00Z"), "2026-08-21")

    def test_an_unreadable_stamp_is_passed_through_rather_than_guessed(self):
        self.assertIsNone(session_date(None))
        self.assertEqual(session_date("not a date"), "not a date"[:10])

    def test_it_agrees_with_the_close_check_about_which_days_trade(self):
        # `is_after_close` already knows the exchange's week for its own
        # purpose. If the two ever disagree about the weekend, one of them is
        # wrong and a reader gets a date from the loser.
        for stamp in ["2026-08-21T11:00:00Z", "2026-08-22T11:00:00Z"]:
            self.assertTrue(is_after_close(stamp), stamp)
            self.assertNotEqual(session_date(stamp), stamp[:10], stamp)


if __name__ == "__main__":
    unittest.main(verbosity=2)
