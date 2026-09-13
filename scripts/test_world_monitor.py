#!/usr/bin/env python3
"""A monitor built to help somebody decide, held to what it can evidence.

Every claim here is either a record of a past move or a figure off a filing.
The tests are about the three ways that stops being true: a percentile computed
from too little history, a list of companies that ranks them, and a figure
published beside another figure it contradicts.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import json
import unittest
from unittest import mock

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


class TheCurrencyChannel(unittest.TestCase):
    """The one channel fed by a separate, manual harvest."""

    def channels(self, rows):
        with mock.patch.object(monitor, "currency_notes", lambda: rows):
            return {c["id"]: c for c in monitor.build()["channels"]}

    def test_a_channel_with_nothing_in_it_is_not_published(self):
        # The reading is its own harvest, run by hand. A build taken before it
        # has run — or while it is part-way through a re-read — would otherwise
        # publish a heading, a count of nought and a search box over an empty
        # list, which reads as "no company on this exchange has a currency
        # figure" rather than "this has not been read yet".
        self.assertNotIn("currency", self.channels([]))
        self.assertIn("rates", self.channels([]))

    def test_a_channel_with_companies_carries_its_count_and_the_day_s_rate(self):
        rows = [{"ticker": "AAAA", "fxResult": 1.0, "position": []}]
        channel = self.channels(rows)["currency"]
        self.assertEqual(channel["count"], 1)
        self.assertEqual(channel["companies"], rows)
        # And the pound is a level with a date, never a percentile: this site
        # keeps no history for a currency to place it against.
        today = channel["today"]
        if today is not None:
            self.assertRegex(today["asOf"], r"^\d{4}-\d{2}-\d{2}$")
            self.assertNotIn("percentile", json.dumps(today))
            self.assertIn("for reading the positions below against", today["note"])
            # It said "this site keeps no history for the pound" until
            # rate_history.py went and fetched the five pairs.
            self.assertNotIn("keeps no history", today["note"])

def rates_doc(**over):
    """rates/latest.json as build_rates_api publishes it, egypt block only."""
    rows = {
        "EGY_DEPOSIT": {"id": "EGY_DEPOSIT", "label": "Overnight deposit rate",
                        "label_ar": "الإيداع", "percent": 19.0, "token": "19.00%",
                        "as_of": "2026-02-15",
                        "source": "cbe.org.eg monetary policy, effective 2026-02-15"},
        "EGY_LENDING": {"id": "EGY_LENDING", "label": "Overnight lending rate",
                        "label_ar": "الإقراض", "percent": 20.0, "token": "20.00%",
                        "as_of": "2026-02-15"},
        "EGY_MAIN": {"id": "EGY_MAIN", "label": "Main operation rate",
                     "label_ar": "الرئيسية", "percent": 19.5, "token": "19.50%",
                     "as_of": "2026-02-15"},
        "EGY_DISCOUNT": {"id": "EGY_DISCOUNT", "label": "Discount rate",
                         "label_ar": "الخصم", "percent": 19.5, "token": "19.50%",
                         "as_of": "2026-02-15"},
        "EGY_ON": {"id": "EGY_ON", "label": "Overnight interbank",
                   "label_ar": "بين البنوك", "percent": 19.433, "token": "19.433%",
                   "as_of": "2026-09-10"},
    }
    for key, value in over.items():
        if value is None:
            rows.pop(key, None)
        else:
            rows[key] = {**rows[key], **value}
    return {"egypt": list(rows.values())}


class TheCorridor(unittest.TestCase):
    """The four rates the MPC sets, drawn as walls rather than as lines.

    A policy rate does not move between decisions, so a series of one is flat
    and a percentile of it is meaningless — which is why these do not go
    through `world()` with everything else. The claim the figure makes is a
    relationship: where the one rate that moves sits between two that do not.
    """

    def corridor(self, document):
        with mock.patch.object(monitor, "RATES_LATEST") as path:
            path.exists.return_value = True
            path.read_text.return_value = json.dumps(document)
            return monitor.corridor()

    def test_the_marker_sits_where_the_rate_does(self):
        # 19.433 in a corridor of 19.00 to 20.00 is 43.3% of the way up. Drawn
        # from the numbers rather than passed through as one, because the two
        # walls move independently of it.
        out = self.corridor(rates_doc())
        self.assertAlmostEqual(out["at"], 0.433, places=3)
        self.assertTrue(out["inside"])
        self.assertEqual(out["floor"]["token"], "19.00%")
        self.assertEqual(out["ceiling"]["token"], "20.00%")
        self.assertEqual(out["paid"]["token"], "19.433%")

    def test_the_marker_is_placed_against_the_walls_that_are_published(self):
        # Not against a remembered 19–20. When the committee moves the
        # corridor the same rate is at a different place inside it, and a
        # figure that did not move with it would be quietly wrong.
        out = self.corridor(rates_doc(
            EGY_DEPOSIT={"percent": 18.0, "token": "18.00%"},
            EGY_LENDING={"percent": 19.5, "token": "19.50%"}))
        self.assertAlmostEqual(out["at"], (19.433 - 18.0) / 1.5, places=4)

    def test_one_wall_is_not_a_corridor(self):
        # Drawing a floor alone invites a reader to read the ceiling off where
        # the marker sits, which is a number nobody published.
        self.assertIsNone(self.corridor(rates_doc(EGY_LENDING=None)))
        self.assertIsNone(self.corridor(rates_doc(EGY_DEPOSIT=None)))

    def test_walls_the_wrong_way_round_are_refused(self):
        # A ceiling below its floor is a parse, not a corridor, and the
        # marker's own arithmetic would divide by a negative span and place it
        # off the far end.
        self.assertIsNone(self.corridor(rates_doc(
            EGY_LENDING={"percent": 18.0, "token": "18.00%"})))

    def test_the_walls_are_published_without_the_rate_that_moves(self):
        # The one series in this group comes from a vendor that answers 403
        # from a datacentre; the walls come from the central bank's own page.
        # The day the series is missing is exactly the day they are the only
        # Egyptian numbers on the screen.
        out = self.corridor(rates_doc(EGY_ON=None))
        self.assertIsNotNone(out)
        self.assertIsNone(out["paid"])
        self.assertNotIn("at", out)

    def test_a_rate_outside_the_walls_is_marked_at_the_end_and_said_so(self):
        # build_rates_api already refuses a reading more than a point outside,
        # so this is the last percent of slack rather than a parse. The marker
        # is clamped to the figure and `inside` carries the fact, because a
        # marker halfway off the track is a worse way to say it than the
        # number printed beside it.
        out = self.corridor(rates_doc(
            EGY_ON={"percent": 20.4, "token": "20.400%"}))
        self.assertEqual(out["at"], 1.0)
        self.assertFalse(out["inside"])

    def test_the_published_document_carries_the_figure(self):
        doc = Published.doc if getattr(Published, "doc", None) else monitor.build()
        corridor = doc.get("corridor")
        self.assertIsNotNone(corridor, "the monitor publishes no corridor")
        self.assertIn("cbe.org.eg", corridor["source"])
        # The walls and the marker are dated separately on purpose: the walls
        # were set in February and are still in force, the marker is one day.
        self.assertNotEqual(corridor["floor"]["asOf"], corridor["paid"]["asOf"])
