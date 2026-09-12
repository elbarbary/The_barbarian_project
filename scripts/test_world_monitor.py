#!/usr/bin/env python3
"""A monitor built to help somebody decide, held to what it can evidence.

Every claim here is either a record of a past move or a figure off a filing.
The tests are about the three ways that stops being true: a percentile computed
from too little history, a list of companies that ranks them, and a figure
published beside another figure it contradicts.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import unittest

import build_world_monitor as monitor


def rising(n, step=1.0, start=100.0):
    return [{"date": f"2026-01-{i % 28 + 1:02d}", "close": start + i * step} for i in range(n)]


class Moves(unittest.TestCase):
    def test_a_move_is_measured_against_its_own_length(self):
        # A 5% week and a 5% quarter are not the same event, and comparing one
        # against the other's distribution is how a calm week reads as a storm.
        closes = [100 * (1.01 ** i) for i in range(300)]
        week = monitor.moves(closes, 5)
        quarter = monitor.moves(closes, 63)
        self.assertAlmostEqual(week[0], (1.01 ** 5 - 1) * 100, places=6)
        self.assertAlmostEqual(quarter[0], (1.01 ** 63 - 1) * 100, places=6)

    def test_a_percentile_needs_a_distribution_behind_it(self):
        # Two dozen observations is a coincidence with a number on it.
        self.assertIsNone(monitor.unusual(5.0, [1.0] * (monitor.MIN_HISTORY - 1)))
        self.assertIsNotNone(monitor.unusual(5.0, [1.0] * monitor.MIN_HISTORY))

    def test_the_percentile_reads_as_how_many_moves_were_smaller(self):
        history = [float(n) for n in range(1, 101)] * 2      # 1..100, twice
        out = monitor.unusual(90.5, history)
        self.assertEqual(out["observations"], 200)
        # 90.5 is bigger than 90 of every hundred.
        self.assertAlmostEqual(out["percentile"], 90.0, places=1)
        self.assertAlmostEqual(out["typical"], 50.5, places=1)

    def test_direction_does_not_change_how_remarkable_a_move_is(self):
        # A 6% fall is as far from ordinary as a 6% rise. Ranking by signed
        # size would make every crash unremarkable.
        history = [float(n) for n in range(-100, 101)]
        self.assertEqual(monitor.unusual(60.0, history)["percentile"],
                         monitor.unusual(-60.0, history)["percentile"])

    def test_a_series_too_short_for_a_window_reports_nothing_for_it(self):
        out = monitor.series_moves(rising(30))
        self.assertIn("week", out)
        self.assertIn("month", out)
        self.assertNotIn("quarter", out)

    def test_a_move_with_no_distribution_still_reports_the_move(self):
        # The change is a fact; only the percentile needs history.
        out = monitor.series_moves(rising(30))
        self.assertIsNotNone(out["week"]["change"])
        self.assertIsNone(out["week"]["against"])


class Published(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = monitor.build()

    def test_every_list_is_alphabetical_and_never_ranked(self):
        # A list of named companies ordered by size of exposure is a
        # leaderboard whatever the caption says, and the publisher would be
        # the one choosing who is at the top of it.
        for channel in self.doc["channels"]:
            tickers = [c["ticker"] for c in channel["companies"]]
            self.assertEqual(tickers, sorted(tickers), channel["id"])
            self.assertEqual(channel["count"], len(channel["companies"]))

    def test_every_company_carries_the_filing_its_number_came_from(self):
        for channel in self.doc["channels"]:
            for row in channel["companies"]:
                self.assertTrue(row.get("period"), f"{row['ticker']} has no period")
                self.assertTrue(row.get("filingId") or row.get("source"),
                                f"{row['ticker']} cites no document")

    def test_a_finance_cost_bigger_than_the_debt_it_pays_for_is_flagged(self):
        # HDBK filed 165.9m of borrowings against 3,171m of finance cost. Shown
        # without a mark, a reader judging rate exposure from the balance sheet
        # alone is reading one of two numbers that do not describe each other.
        rates = next(c for c in self.doc["channels"] if c["id"] == "rates")
        for row in rates["companies"]:
            cost, total = row.get("financeCost"), row.get("borrowings")
            if isinstance(cost, (int, float)) and isinstance(total, (int, float)) and cost > total:
                self.assertTrue(row.get("costExceedsBorrowings"),
                                f"{row['ticker']} contradicts itself unflagged")

    def test_every_ratio_reconciles_with_the_numbers_printed_beside_it(self):
        # A reader who divides the two published figures must get the published
        # ratio. AMPI filed revenue of 377,000 pounds, and deriving its margin
        # before rounding moved the printed answer by a sixth of a point — a
        # document disagreeing with itself in the one place a reader checks.
        inputs = next(c for c in self.doc["channels"] if c["id"] == "inputs")
        for row in inputs["companies"]:
            self.assertAlmostEqual(row["grossMargin"],
                                   round(row["grossProfit"] / row["revenue"] * 100, 1),
                                   places=1, msg=row["ticker"])
        rates = next(c for c in self.doc["channels"] if c["id"] == "rates")
        for row in rates["companies"]:
            if row.get("repricingWithinAYear") is None:
                continue
            self.assertAlmostEqual(row["repricingWithinAYear"],
                                   round(row["shortTerm"] / row["borrowings"] * 100, 1),
                                   places=1, msg=row["ticker"])

    def test_the_exchange_is_measured_the_same_way_as_the_world(self):
        # The comparison is the point. A week remarkable for oil and ordinary
        # for this exchange is a different fact from one remarkable for both.
        self.assertTrue(self.doc["exchange"], "the exchange's own indices are missing")
        for row in self.doc["exchange"]:
            self.assertIn("week", row["moves"])
            self.assertIsNotNone(row["moves"]["week"]["against"])

    def test_nothing_in_the_basis_tells_a_reader_what_to_do(self):
        text = " ".join([self.doc["basis"]] + [c["question"] for c in self.doc["channels"]])
        for shape in ("should", "buy ", "sell ", "will rise", "will fall", "expect"):
            self.assertNotIn(shape, text.lower(), shape)

    def test_the_foreign_split_says_it_is_a_period_and_not_a_session(self):
        foreign = self.doc.get("foreignMoney")
        if foreign:
            self.assertIn("period", (foreign.get("note") or "").lower())


if __name__ == "__main__":
    unittest.main()
