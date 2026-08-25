#!/usr/bin/env python3
"""What the review sheet may say, and what it must refuse to.

Two kinds of test here. The first kind guards arithmetic that is easy to get
subtly wrong — a percentage off a negative base, a balance compared against a
flow, a "latest value" that is really the latest row. Every one of these was a
real defect caught by measuring coverage rather than by reading the code.

The second kind guards the line: this sheet is one screen of ratios about a
named security, which is the closest this app comes to looking like advice. It
may name patterns. It may never grade one.
"""
import unittest

import build_review as r


class PeriodKey(unittest.TestCase):
    """Six sevenths of the balance-sheet data hangs on this function.

    `period_end` is written only by the exchange merge — 577 of the 4,063 rows
    carrying a balance sheet. The rest come from Mubasher with a label and
    nothing else, and filtering on `period_end` dropped them all.
    """

    def test_an_explicit_period_end_wins(self):
        self.assertEqual(
            r.period_key({"period": "FY 2021", "period_end": "2021-12-31"}),
            "2021-12-31",
        )

    def test_a_label_is_enough(self):
        self.assertEqual(r.period_key({"period": "FY 2021"}), "2021-12-31")
        self.assertEqual(r.period_key({"period": "H1 2024"}), "2024-06-30")
        self.assertEqual(r.period_key({"period": "9M 2023"}), "2023-09-30")
        self.assertEqual(r.period_key({"period": "Q1 2026"}), "2026-03-31")

    def test_labels_sort_chronologically_as_strings(self):
        rows = [{"period": p} for p in ("FY 2021", "Q1 2021", "9M 2020", "H1 2021")]
        got = [x["period"] for x in sorted(rows, key=r.period_key)]
        self.assertEqual(got, ["9M 2020", "Q1 2021", "H1 2021", "FY 2021"])

    def test_nonsense_is_dropped_not_guessed(self):
        self.assertIsNone(r.period_key({"period": "sometime"}))
        self.assertIsNone(r.period_key({}))


class StocksAndFlows(unittest.TestCase):
    """A balance has no span; a flow does. They cannot share a series.

    Restricting balances to annual rows cost 128 companies their debt ratio.
    Letting flows use quarterly rows would compare three months against twelve
    and read as collapse.
    """

    DOC = {"financials": {
        "annual": [{"period": "FY 2023", "net_income": 10, "assets": 100},
                   {"period": "FY 2024", "net_income": 12}],
        "quarterly": [{"period": "H1 2024", "net_income": 5, "assets": 110},
                      {"period": "9M 2024", "net_income": 8, "assets": 120}],
    }}

    def test_flows_take_annual_rows_only(self):
        self.assertEqual([x["period"] for x in r.annual(self.DOC)],
                         ["FY 2023", "FY 2024"])

    def test_balances_take_every_period(self):
        self.assertEqual([x["period"] for x in r.balances(self.DOC)],
                         ["FY 2023", "H1 2024", "9M 2024", "FY 2024"])

    def test_newest_reads_the_field_not_the_row(self):
        # FY 2024 is the newest annual row and carries no assets at all. The
        # newest *asset* figure is FY 2023's. Reading the row loses it, which
        # is what cost 59 companies their asset figure.
        self.assertEqual(r.newest(r.annual(self.DOC), "assets"), 100)
        self.assertEqual(r.newest(r.annual(self.DOC), "net_income"), 12)

    def test_newest_is_none_when_nothing_carries_it(self):
        self.assertIsNone(r.newest(r.annual(self.DOC), "equity"))


class Direction(unittest.TestCase):
    def test_two_points_is_not_a_trend(self):
        self.assertEqual(r.direction([1.0, 2.0])[0], "unknown")

    def test_a_clear_rise_is_read(self):
        self.assertEqual(r.direction([1.0, 1.0, 1.0, 2.0])[0], "rising")

    def test_a_clear_fall_is_read(self):
        self.assertEqual(r.direction([2.0, 2.0, 2.0, 1.0])[0], "falling")

    def test_a_wobble_is_flat(self):
        # Below the floor. These ratios are built from figures rounded to
        # thousands; a 2% move is the rounding, not the business.
        self.assertEqual(r.direction([1.00, 1.01, 0.99, 1.02])[0], "flat")

    def test_one_freak_year_does_not_set_the_baseline(self):
        # The median ignores the outlier; a mean would be dragged to 4.2 and
        # call the latest reading a collapse.
        self.assertEqual(r.direction([1.0, 1.0, 20.0, 1.0, 1.0])[0], "flat")


class Growth(unittest.TestCase):
    """Profit can be negative, and that breaks percentages."""

    def test_a_recovery_is_not_a_percentage(self):
        # −100 to +50 is not "+150%". It is a company that stopped losing
        # money, and `build_signals` publishes that crossing as a streak break.
        self.assertEqual(r.growth([-100.0, -80.0, -40.0, 50.0])[0], "rising")

    def test_deepening_losses_read_as_falling(self):
        self.assertEqual(r.growth([-10.0, -20.0, -40.0, -80.0])[0], "falling")

    def test_a_zigzag_is_flat(self):
        self.assertEqual(r.growth([10.0, 20.0, 10.0, 20.0, 10.0])[0], "flat")


class Sanity(unittest.TestCase):
    def test_a_ratio_on_a_near_zero_denominator_is_refused(self):
        # AALR's net income rounds to zero in EGP millions, which is how a
        # "P/E" of 39,873 got published once.
        self.assertIsNone(r.sane("pe", 39873.0))
        self.assertEqual(r.sane("pe", 9.2), 9.2)

    def test_negative_equity_cannot_produce_a_book_ratio(self):
        self.assertIsNone(r.sane("pb", -4.0))

    def test_an_unbounded_metric_passes_through(self):
        self.assertEqual(r.sane("assets", 1e9), 1e9)


class Peers(unittest.TestCase):
    def test_a_sector_of_four_gets_no_median(self):
        # The median EGX sector holds four companies and the smallest holds
        # one. "Below its sector" against three others is not a comparison.
        rows = {f"T{i}": [{"key": "pe", "value": float(i)}] for i in range(4)}
        sectors = {f"T{i}": "Thin" for i in range(4)}
        self.assertEqual(r.peers(rows, sectors), {})

    def test_a_sector_of_five_does(self):
        rows = {f"T{i}": [{"key": "pe", "value": float(i)}] for i in range(5)}
        sectors = {f"T{i}": "Real" for i in range(5)}
        self.assertEqual(r.peers(rows, sectors), {("Real", "pe"): 2.0})

    def test_a_company_with_no_sector_is_not_counted(self):
        rows = {f"T{i}": [{"key": "pe", "value": 1.0}] for i in range(5)}
        sectors = {f"T{i}": None for i in range(5)}
        self.assertEqual(r.peers(rows, sectors), {})


class Pattern(unittest.TestCase):
    """It may count. It may not grade."""

    def rows(self, **directions):
        return [{"key": k, "direction": v} for k, v in directions.items()]

    def test_it_names_which_way_each_metric_went(self):
        got = r.pattern(self.rows(
            profit="rising", eps="rising", roe="rising", debt_equity="rising"))
        self.assertEqual(got["improving"], ["eps", "profit", "roe"])
        # Debt rising is on the other side of the ledger, not "bad".
        self.assertEqual(got["deteriorating"], ["debt_equity"])

    def test_falling_debt_counts_as_moving_with_the_others(self):
        got = r.pattern(self.rows(
            profit="rising", roe="rising", debt_equity="falling"))
        self.assertEqual(got["deteriorating"], [])

    def test_too_few_readable_directions_names_nothing(self):
        self.assertIsNone(r.pattern(self.rows(profit="rising", eps="flat")))

    def test_there_is_no_score_anywhere_in_the_output(self):
        got = r.pattern(self.rows(
            profit="rising", eps="rising", roe="rising", roa="rising"))
        # Exact keys, not substrings — "deteriorating" contains "rating", and
        # a substring check here fails on the very word that describes the
        # honest half of the output.
        self.assertEqual(set(got), {"readable", "improving", "deteriorating"})
        self.assertTrue({"score", "rating", "grade", "verdict", "rank"}
                        .isdisjoint(got))
        # And the counts are lists of metric names, never a computed total.
        self.assertIsInstance(got["improving"], list)
        self.assertIsInstance(got["deteriorating"], list)


class Causes(unittest.TestCase):
    """The probable cause is a pointer at the next row, never a verdict.

    Every branch here is one the founder's own notes make: profit up while
    cash lags, a return that might be leverage, growth outrunning profit.
    """

    def attach(self, **dirs):
        metrics = [{"key": k, "direction": v} for k, v in dirs.items()]
        r.attach_causes(metrics)
        return {m["key"]: m.get("cause") for m in metrics}

    def test_rising_profit_with_falling_cash_points_at_the_cash(self):
        got = self.attach(profit="rising", cash_conversion="falling")
        self.assertEqual(got["profit"], "profit_ahead_of_cash")

    def test_rising_profit_with_healthy_cash_says_so(self):
        got = self.attach(profit="rising", cash_conversion="rising")
        self.assertEqual(got["profit"], "profit_with_cash")

    def test_rising_roe_with_rising_debt_flags_leverage(self):
        got = self.attach(roe="rising", debt_equity="rising")
        self.assertEqual(got["roe"], "roe_leverage")

    def test_rising_roe_without_rising_debt_is_operational(self):
        got = self.attach(roe="rising", debt_equity="falling")
        self.assertEqual(got["roe"], "roe_operational")

    def test_growth_outrunning_profit_is_flagged(self):
        got = self.attach(assets="rising", profit="flat")
        self.assertEqual(got["assets"], "assets_ahead_of_profit")

    def test_a_metric_with_no_sibling_gets_no_cause(self):
        # ROE rising but nothing to compare debt against — no invented cause.
        got = self.attach(roe="rising")
        self.assertIsNone(got["roe"])

    def test_a_flat_metric_has_no_cause(self):
        got = self.attach(profit="flat", cash_conversion="rising")
        self.assertIsNone(got["profit"])


class PeriodLabel(unittest.TestCase):
    def test_a_full_label_is_shortened_to_two_digits(self):
        self.assertEqual(r.plabel({"period": "FY 2021"}), "FY 21")
        self.assertEqual(r.plabel({"period": "H1 2024"}), "H1 24")

    def test_a_labelless_row_falls_back_to_the_date(self):
        self.assertEqual(r.plabel({"period_end": "2021-12-31"}), "21-12-31")


if __name__ == "__main__":
    unittest.main()
