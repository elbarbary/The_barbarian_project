#!/usr/bin/env python3
"""What counts as unusual, and what does not.

Every claim `build_signals.py` publishes is arithmetic, which means the only
way it can be wrong is if the arithmetic is. These are the cases that decide
whether a row appears at all — the thresholds, the direction of a streak, and
the one rule that stopped the "gone quiet" idea from being a delisting
detector.
"""
import datetime
import unittest

import build_signals as s

TODAY = datetime.date(2026, 8, 24)


def period(end: str, net: float, label: str = "") -> dict:
    return {"period": label or end, "period_end": end, "net_income": net}


class Streaks(unittest.TestCase):
    def setUp(self):
        self._real = s.reported_periods

    def tearDown(self):
        s.reported_periods = self._real

    def given(self, rows):
        s.reported_periods = lambda _ticker: rows

    def test_a_first_loss_after_a_long_run_is_reported(self):
        self.given([
            period("2024-03-31", 10), period("2024-06-30", 20),
            period("2024-09-30", 30), period("2024-12-31", 40),
            period("2026-03-31", -5, "Q1 2026"),
        ])
        got = s.streak_breaks("X", TODAY)
        self.assertEqual(len(got), 1)
        self.assertEqual(got[0]["kind"], "first_loss")
        self.assertEqual(got[0]["run"], 4)
        self.assertEqual(got[0]["since"], "2024-03-31")

    def test_a_short_run_is_not_a_streak(self):
        # Three profitable periods then a loss is a quarter, not a record.
        self.given([
            period("2025-06-30", 10), period("2025-09-30", 20),
            period("2025-12-31", 30), period("2026-03-31", -5),
        ])
        self.assertEqual(s.streak_breaks("X", TODAY), [])

    def test_a_return_to_profit_reads_the_other_way(self):
        self.given([
            period("2025-03-31", -1), period("2025-06-30", -2),
            period("2025-09-30", -3), period("2025-12-31", -4),
            period("2026-03-31", 7, "Q1 2026"),
        ])
        got = s.streak_breaks("X", TODAY)
        self.assertEqual(got[0]["kind"], "back_to_profit")
        self.assertEqual(got[0]["run"], 4)

    def test_a_break_older_than_the_window_is_history_not_news(self):
        self.given([
            period("2019-03-31", 10), period("2019-06-30", 10),
            period("2019-09-30", 10), period("2019-12-31", 10),
            period("2020-03-31", -1),
        ])
        self.assertEqual(s.streak_breaks("X", TODAY), [])

    def test_a_second_loss_in_a_row_is_not_a_second_first_loss(self):
        self.given([
            period("2024-03-31", 10), period("2024-06-30", 10),
            period("2024-09-30", 10), period("2024-12-31", 10),
            period("2026-03-31", -1), period("2026-06-30", -2),
        ])
        self.assertEqual(len(s.streak_breaks("X", TODAY)), 1)

    def test_the_link_is_the_filing_not_the_exchange_homepage(self):
        rows = [period("2024-03-31", 1), period("2024-06-30", 1),
                period("2024-09-30", 1), period("2024-12-31", 1),
                period("2026-03-31", -1)]
        rows[-1]["filing_id"] = "egx-293764"
        rows[-1]["net_income_source"] = "https://www.egx.com.eg"
        self.given(rows)
        self.assertIn("293764", s.streak_breaks("X", TODAY)[0]["link"])


def filing(stamp: str, arabic: str = "", code: int = 1) -> dict:
    return {"dateStamp": stamp, "headingArabic": arabic, "heading": "", "code": code}


class Silence(unittest.TestCase):
    def test_a_weekly_filer_gone_six_weeks_is_quiet(self):
        days = [datetime.date(2026, 1, 1) + datetime.timedelta(days=7 * i)
                for i in range(26)]
        got = s.silence([filing(d.isoformat(), code=i) for i, d in enumerate(days)],
                        TODAY)
        self.assertIsNotNone(got)
        self.assertEqual(got["typical_gap"], 7)

    def test_a_twice_yearly_filer_is_not_quiet_three_weeks_later(self):
        # The floor exists for exactly this: four times a six-month gap is
        # two years, but three weeks of nothing from a company that files
        # twice a year is a Tuesday.
        days = [datetime.date(2020, 1, 1) + datetime.timedelta(days=182 * i)
                for i in range(22)]
        days.append(TODAY - datetime.timedelta(days=20))
        self.assertIsNone(
            s.silence([filing(d.isoformat(), code=i) for i, d in enumerate(days)],
                      TODAY)
        )

    def test_too_few_filings_means_no_rhythm_to_measure(self):
        days = [datetime.date(2026, 1, 1) + datetime.timedelta(days=7 * i)
                for i in range(5)]
        self.assertIsNone(
            s.silence([filing(d.isoformat(), code=i) for i, d in enumerate(days)],
                      TODAY)
        )


class FirstOfKind(unittest.TestCase):
    def test_a_capital_increase_after_a_decade_is_a_first(self):
        got = s.firsts_of_kind([
            filing("2026-08-01", "زيادة رأس المال", 2),
            filing("2013-05-05", "زيادة رأس المال", 1),
        ], TODAY)
        self.assertEqual(len(got), 1)
        self.assertEqual(got[0]["type"], "capital_increase")
        self.assertEqual(got[0]["previous"], "2013-05-05")

    def test_a_yearly_event_is_not_a_first(self):
        self.assertEqual(s.firsts_of_kind([
            filing("2026-08-01", "زيادة رأس المال", 2),
            filing("2025-08-01", "زيادة رأس المال", 1),
        ], TODAY), [])

    def test_the_only_one_ever_is_a_different_claim_and_is_not_made(self):
        # "First in N years" needs a previous one to measure the gap against.
        self.assertEqual(
            s.firsts_of_kind([filing("2026-08-01", "زيادة رأس المال", 1)], TODAY),
            [],
        )

    def test_an_old_first_has_stopped_being_news(self):
        self.assertEqual(s.firsts_of_kind([
            filing("2024-01-01", "زيادة رأس المال", 2),
            filing("2010-01-01", "زيادة رأس المال", 1),
        ], TODAY), [])


class ResultsWindow(unittest.TestCase):
    def setUp(self):
        self._real = s._lags

    def tearDown(self):
        s._lags = self._real

    def test_the_window_is_the_range_the_company_has_actually_filed_in(self):
        s._lags = lambda: {"X": {"9M": [36, 40, 44, 38]}}
        got = s.expected_results(TODAY)["X"]
        nine = [row for row in got if row["label"] == "9M"][0]
        self.assertEqual(nine["period_end"], "2026-09-30")
        self.assertEqual(nine["window_start"], "2026-11-05")   # +36 days
        self.assertEqual(nine["window_end"], "2026-11-13")     # +44 days
        self.assertEqual(nine["observations"], 4)

    def test_two_observations_is_an_anecdote_and_publishes_nothing(self):
        s._lags = lambda: {"X": {"9M": [36, 40]}}
        self.assertEqual(s.expected_results(TODAY), {})

    def test_a_label_never_borrows_another_label_lag(self):
        # A full year takes months longer to file than a first quarter. The
        # first version fell back to the all-period median when a label was
        # thin, which put FY results three months early.
        s._lags = lambda: {"X": {"9M": [36, 40, 44], "FY": [100]}}
        got = s.expected_results(TODAY)["X"]
        self.assertEqual([row["label"] for row in got], ["9M"])


class NextEnds(unittest.TestCase):
    def test_it_looks_forward_only(self):
        got = s._next_ends(datetime.date(2026, 8, 24))
        self.assertEqual([label for label, _ in got], ["9M", "FY"])

    def test_it_rolls_into_the_next_year_in_december(self):
        got = s._next_ends(datetime.date(2026, 12, 31))
        self.assertEqual([label for label, _ in got], ["Q1", "H1"])
        self.assertEqual(got[0][1].year, 2027)


if __name__ == "__main__":
    unittest.main()
