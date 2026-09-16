#!/usr/bin/env python3
"""Every measurement a reader's rulebook can test, held to one meaning.

A rulebook is written by somebody who is not here. They cannot ask what a
column meant on the day it disagreed with them, so each one has to mean the
same thing on every row, and "I could not compute this" has to be a different
answer from "this is nought".

The traps pinned here are the ones this project has already sprung once, in
other files: a denominator that includes the thing it is measuring, a zero
that becomes an infinity, a percentage across a sign change, and a calendar
day standing in for a trading session.
"""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import measures as m  # noqa: E402


def bars(*rows) -> list[dict]:
    """`(date, close, volume)` triples, oldest first."""
    return [{"date": d, "close": c, "volume": v} for d, c, v in rows]


def flat(n, close=10.0, volume=1000, start=1) -> list[dict]:
    return bars(*[(f"2026-08-{i + start:02d}", close, volume) for i in range(n)])


class RelativeVolumeTest(unittest.TestCase):
    def test_the_window_excludes_the_session_being_measured(self):
        # Including today drags the normal toward the very session that is
        # supposed to look unusual: the day a share trades ten times its
        # normal becomes the day its normal rises, and the number understates
        # exactly when it matters.
        rows = flat(20, volume=100) + bars(("2026-09-01", 10.0, 1000))
        self.assertAlmostEqual(m.rv20(rows), 10.0, places=3)

    def test_today_does_not_enter_its_own_denominator(self):
        # A flat history hides this: drop the newest bar in and the median of
        # twenty identical volumes does not move, so the window can be wrong
        # and the number still right. These twenty rise 1..20, where taking
        # the last twenty INCLUDING today shifts the median from 10.5 to 11.5
        # and quietly shrinks a 95x session to 87x.
        rising = bars(*[(f"2026-08-{i:02d}", 10.0, i) for i in range(1, 21)])
        rows = rising + bars(("2026-09-01", 10.0, 1000))
        self.assertAlmostEqual(m.median_volume(rows), 10.5, places=3)
        self.assertAlmostEqual(m.rv20(rows), 95.238, places=3)

    def test_a_normal_of_zero_is_undefined_not_infinite(self):
        # Four companies on 14 Sep 2026 had not traded a share in twenty
        # sessions. Divided by that median they are the most unusual shares
        # on the exchange, and they sort to the top of anything a reader
        # orders by unusual volume.
        rows = flat(20, volume=0) + bars(("2026-09-01", 10.0, 500))
        self.assertIsNone(m.rv20(rows))

    def test_a_short_history_is_undefined_not_computed_on_what_there_is(self):
        # 26 of 283 listed companies had fewer than 21 bars. A median of four
        # sessions is not this company's normal.
        self.assertIsNone(m.rv20(flat(12)))
        self.assertIsNotNone(m.rv20(flat(21)))

    def test_unknown_volume_is_not_a_zero_in_the_normal(self):
        rows = flat(21)
        rows[5].pop("volume")
        self.assertIsNone(m.rv20(rows))
        self.assertIsNone(m.median_volume(rows))
        self.assertIsNone(m.median_traded_value(rows))
        self.assertEqual(m.change_over(rows, 5), 0.0)

    def test_no_volume_on_the_newest_bar_is_undefined(self):
        rows = flat(20) + [{"date": "2026-09-01", "close": 10.0}]
        self.assertIsNone(m.rv20(rows))

    def test_the_denominator_is_published_beside_the_ratio(self):
        # "3.4x" is a claim until a reader can see 340,000 against 100,000.
        rows = flat(20, volume=100) + bars(("2026-09-01", 10.0, 340))
        self.assertEqual(m.median_volume(rows), 100)


class TradedValueTest(unittest.TestCase):
    def test_value_is_price_times_volume_not_volume(self):
        # A million shares of a 40-piastre company and a million of a
        # 300-pound one are not the same market, and the playbook's
        # entry/exit test is about the money.
        cheap = flat(1, close=0.40, volume=1_000_000)
        dear = flat(1, close=300.0, volume=1_000_000)
        self.assertEqual(m.traded_value(cheap), 400_000.0)
        self.assertEqual(m.traded_value(dear), 300_000_000.0)

    def test_its_own_normal_also_excludes_today(self):
        rows = flat(20, close=10.0, volume=100) + bars(("2026-09-01", 10.0, 9999))
        self.assertEqual(m.median_traded_value(rows), 1000.0)


class ChangeTest(unittest.TestCase):
    def test_change_is_counted_in_this_company_s_own_sessions(self):
        # Not calendar days. A share that did not trade for a week has not
        # had five sessions, and dating the comparison by the calendar prices
        # it at a close nobody paid.
        rows = bars(("2026-08-03", 100.0, 10), ("2026-08-17", 110.0, 10),
                    ("2026-08-31", 121.0, 10))
        self.assertAlmostEqual(m.change_over(rows, 1), 10.0, places=3)
        self.assertAlmostEqual(m.change_over(rows, 2), 21.0, places=3)

    def test_a_change_over_more_sessions_than_exist_is_undefined(self):
        self.assertIsNone(m.change_over(flat(3), 5))

    def test_a_previous_close_of_zero_is_undefined(self):
        rows = bars(("2026-08-03", 0.0, 10), ("2026-08-04", 5.0, 10))
        self.assertIsNone(m.change_over(rows, 1))


class BigMoveTest(unittest.TestCase):
    def test_it_counts_moves_at_or_beyond_the_threshold(self):
        rows = bars(("2026-09-01", 100.0, 10), ("2026-09-02", 120.0, 10),
                    ("2026-09-03", 144.0, 10), ("2026-09-06", 145.0, 10),
                    ("2026-09-07", 146.0, 10), ("2026-09-08", 147.0, 10))
        self.assertEqual(m.big_move_sessions(rows, window=5), 2)

    def test_a_fall_to_the_band_counts_as_much_as_a_rise(self):
        # The gate is about how much of the move is already spent, in either
        # direction; a 20% fall is as much evidence of a band as a 20% rise.
        rows = bars(("2026-09-01", 100.0, 10), ("2026-09-02", 80.0, 10),
                    ("2026-09-03", 80.5, 10), ("2026-09-06", 81.0, 10),
                    ("2026-09-07", 81.5, 10), ("2026-09-08", 82.0, 10))
        self.assertEqual(m.big_move_sessions(rows, window=5), 1)

    def test_nothing_here_claims_to_know_the_daily_band(self):
        # Establishing a limit-up needs the high, the low, and the band
        # applicable to THAT security on THAT date. This archive holds closes;
        # the band is not 20% for every listing and has not been 20% for
        # twenty-five years. So no function says the stronger thing under any
        # name — including the one this column was first given, which asserted
        # a band it could not know.
        self.assertTrue(hasattr(m, "big_move_sessions"))
        for claim in ("limit_ups", "limit_up_sessions", "near_limit_sessions"):
            self.assertFalse(hasattr(m, claim), claim)


class SessionsSinceTest(unittest.TestCase):
    def test_it_counts_sessions_not_days(self):
        # Eleven days spanning a weekend is four chances the market had to
        # react, which is what the playbook's ten-session cohorts count.
        rows = bars(("2026-09-01", 10.0, 1), ("2026-09-02", 10.0, 1),
                    ("2026-09-03", 10.0, 1), ("2026-09-06", 10.0, 1),
                    ("2026-09-07", 10.0, 1))
        self.assertEqual(m.sessions_since(rows, "2026-09-02"), 3)

    def test_a_filing_stamped_today_is_zero_sessions_never_negative(self):
        rows = flat(5, start=1)          # 2026-08-01 .. 2026-08-05
        self.assertEqual(m.sessions_since(rows, "2026-09-30"), 0)

    def test_no_date_is_undefined(self):
        self.assertIsNone(m.sessions_since(flat(5), None))
        self.assertIsNone(m.sessions_since(flat(5), "not a date"))


class ShareOfTest(unittest.TestCase):
    def test_a_ratio_needs_a_denominator_that_exists(self):
        # "Do not rely on an impressive percentage without checking the
        # denominator" — extreme subscription coverage came from a very small
        # number of shares remaining in a second stage.
        self.assertIsNone(m.share_of(500, None))
        self.assertIsNone(m.share_of(500, 0))
        self.assertIsNone(m.share_of(500, -100))
        self.assertAlmostEqual(m.share_of(500, 2000), 25.0, places=3)


class GrowthTest(unittest.TestCase):
    def test_growth_out_of_a_loss_is_refused(self):
        # A loss of 10 becoming a profit of 5 is not "150% growth" — the
        # phrase is arithmetic nonsense and, on a screen, a lie about a
        # turnaround. It is a return to profit, which build_signals.py
        # already reports as a streak break with the filings behind it.
        self.assertIsNone(m.growth(5, -10))
        self.assertIsNone(m.growth(-5, -10))
        self.assertIsNone(m.growth(5, 0))

    def test_a_fall_out_of_profit_is_a_number_because_the_base_is_real(self):
        # The refusal is about the DENOMINATOR, not about the sign of the
        # answer. Profit of 10 becoming a loss of 5 really is -150%: the base
        # it is measured against is a figure that was filed.
        self.assertAlmostEqual(m.growth(-5, 10), -150.0, places=3)

    def test_ordinary_growth_is_a_percentage(self):
        self.assertAlmostEqual(m.growth(150, 100), 50.0, places=3)


class AbsenceTest(unittest.TestCase):
    """The three absences are not interchangeable."""

    def test_nothing_returns_a_sentinel(self):
        # No -1, no 999, no "N/A". A magic number survives one refactor and
        # then somebody sorts by it.
        empty: list[dict] = []
        for value in (m.rv20(empty), m.traded_value(empty), m.change_over(empty, 1),
                      m.big_move_sessions(empty), m.median_volume(empty),
                      m.as_of(empty)):
            self.assertIsNone(value)

    def test_no_trade_placeholders_never_change_a_measurement_window(self):
        held = flat(21, volume=100)
        padded = held + bars(("2026-09-01", 10.0, 0))
        self.assertEqual(m.rv20(padded), m.rv20(held))
        self.assertEqual(m.traded_value(padded), m.traded_value(held))
        self.assertEqual(m.as_of(padded), m.as_of(held))
        self.assertEqual(m.change_over(padded, 5), m.change_over(held, 5))
        self.assertEqual(m.big_move_sessions(padded), m.big_move_sessions(held))
        self.assertEqual(m.sessions_since(padded, "2026-08-01"),
                         m.sessions_since(held, "2026-08-01"))
        self.assertEqual(m.change_over(held, 5), 0.0)  # real measured zero survives
        self.assertIsNone(m.as_of(flat(30, volume=0)))
        self.assertIsNone(m.rv20(flat(30, volume=0)))

    def test_a_bar_with_no_close_is_a_session_nobody_collected(self):
        # Not a session at zero. Reading a gap in the archive as a price of
        # nought invents a total collapse and then a total recovery — a -100%
        # session followed by an infinite one, on a share that did not move.
        gappy = bars(("2026-09-01", 100.0, 10)) \
            + [{"date": "2026-09-02", "volume": 10}] \
            + bars(("2026-09-03", 101.0, 10))
        self.assertEqual(m.as_of(gappy), "2026-09-03")
        # Two usable closes, so a one-session change is 101 against 100 —
        # the collected sessions either side of the hole, not through it.
        self.assertAlmostEqual(m.change_over(gappy, 1), 1.0, places=3)
        self.assertEqual(m.big_move_sessions(gappy, window=1), 0)

    def test_the_row_carries_the_date_of_its_newest_bar(self):
        # The archive is not uniformly fresh — 227 companies to the 13th, 40
        # to the 10th, 16 to the 9th on 14 Sep 2026. A market-wide date would
        # compare one company's Thursday with another's Wednesday.
        self.assertEqual(m.as_of(flat(3, start=1)), "2026-08-03")


if __name__ == "__main__":
    unittest.main()
