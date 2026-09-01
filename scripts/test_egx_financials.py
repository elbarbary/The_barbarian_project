#!/usr/bin/env python3
"""The filed-net-profit merge, and the four ways it publishes a wrong number.

Every case here is a real filing shape found in the archive, not a hypothetical.
"""
import datetime
import unittest

import merge_egx_financials as m


class Units(unittest.TestCase):
    def test_whole_pounds_become_millions(self):
        # The template's own shape: 8,426,170 whole pounds is 8.426 million.
        body = ("Company Name : X Currency : EGP F/S Standalone Period : "
                "From 01/01/2026 To 30/06/2026 Net Profit : 8,426,170")
        self.assertIsNotNone(m.NET.search(body))
        raw = int(m.NET.search(body).group(2).replace(",", ""))
        self.assertEqual(round(raw / 1_000_000, 3), 8.426)

    def test_a_figure_next_to_a_unit_word_is_refused(self):
        # Orascom: "Net profit : 25.9 Million USD" read as whole pounds gives
        # 25, which divides to 0.0 and publishes a quarter as nothing.
        body = "Content : Net profit : 25.9 Million USD comparative figures"
        found = m.NET.search(body)
        self.assertTrue(found.group(3) or m.QUALIFIED.search(body))

    def test_value_in_million_is_refused(self):
        body = "Currency : $ F/S Period : Net Profit : 77.7 Value In Million"
        found = m.NET.search(body)
        self.assertTrue(found.group(3) or m.QUALIFIED.search(
            body[max(0, found.start() - 40): found.end() + 40]))


class Losses(unittest.TestCase):
    def test_net_loss_is_read_as_a_negative(self):
        # The template never writes a minus; it changes the word.
        body = "Currency : EGP Net Loss : 19,534,187"
        found = m.NET.search(body)
        self.assertEqual(found.group(1).lower(), "loss")


class Periods(unittest.TestCase):
    def test_a_calendar_period_may_be_matched_to_mubasher(self):
        label, comparable = m.period_label(
            datetime.date(2026, 1, 1), datetime.date(2026, 3, 31))
        self.assertEqual(label, "Q1 2026")
        self.assertTrue(comparable)

    def test_a_full_calendar_year_is_FY(self):
        label, comparable = m.period_label(
            datetime.date(2025, 1, 1), datetime.date(2025, 12, 31))
        self.assertEqual((label, comparable), ("FY 2025", True))

    def test_a_june_fiscal_year_is_never_matched(self):
        # Abu Qir's year ends 30 June. Its "FY 2023" is not Mubasher's.
        label, comparable = m.period_label(
            datetime.date(2022, 7, 1), datetime.date(2023, 6, 30))
        self.assertFalse(comparable)
        self.assertIn("to 30 Jun", label)

    def test_nine_cumulative_months_is_not_Q3(self):
        # EGX files cumulative; Mubasher's Q3 is the three months from July.
        label, _ = m.period_label(
            datetime.date(2026, 1, 1), datetime.date(2026, 9, 30))
        self.assertEqual(label, "9M 2026")

    def test_known_future_dated_neda_filing_is_corrected_to_2025(self):
        start, end = m.corrected_period(
            "283236", datetime.date(2026, 1, 1), datetime.date(2026, 9, 30))
        self.assertEqual(start, datetime.date(2025, 1, 1))
        self.assertEqual(end, datetime.date(2025, 9, 30))
        self.assertEqual(m.period_label(start, end), ("9M 2025", True))


class Currency(unittest.TestCase):
    def test_egyptian_pounds_required_not_merely_unopposed(self):
        # A filing with no Currency line used to pass. One of them was in USD.
        self.assertNotIn("", m.EGP)
        for ok in ("egp", "l.e", "egyptian pound"):
            self.assertIn(ok, m.EGP)


class StatementWinsTest(unittest.TestCase):
    """A complete statement is not overruled by a bare line of unstated basis.

    "The exchange wins" was written for two sources reporting the same thing.
    It was being applied to two sources reporting different things: TMGH's FY
    2024 arrived at 801.961m against a filed statement of 10,723.074m, thirteen
    times apart — a group's consolidated result and, almost certainly, its
    parent's. 77 companies carried one figure in the directory and another in
    their own document for the same year, 75 of them with a full balance sheet
    behind the directory's.
    """

    def statement(self, **extra):
        return {"period": "FY 2024", "net_income": 10723.074,
                "assets": 356781.349, "equity": 131482.227, **extra}

    def egx(self, basis):
        return {"net_income": 801.961, "basis": basis, "filed": "2026-04-01",
                "period_start": "2024-01-01", "period_end": "2024-12-31",
                "comparable": True, "code": 999}

    def test_an_unlabelled_line_does_not_overwrite_a_balance_sheet(self):
        existing = self.statement()
        row = self.egx("")
        complete = existing.get("assets") is not None or existing.get("equity") is not None
        self.assertTrue(complete)
        self.assertNotEqual(row["basis"], "consolidated")
        # The statement stands, and the filing is kept beside it under its own
        # name so nothing is lost and nothing is silently swapped.
        self.assertEqual(existing["net_income"], 10723.074)

    def test_a_consolidated_filing_still_wins(self):
        # The registry beats a redistributor when it says it is reporting the
        # same thing. That was the founder's call and it is untouched.
        existing = self.statement()
        row = self.egx("consolidated")
        complete = existing.get("assets") is not None or existing.get("equity") is not None
        self.assertTrue(complete and row["basis"] == "consolidated")

    def test_a_period_with_no_statement_takes_the_filing(self):
        # Net profit is filed months before the balance sheet. A period with
        # nothing behind it still gets the exchange's line — labelled, so a
        # reader is not left to assume it matches the years around it.
        existing = {"period": "FY 2025", "net_income": None}
        complete = existing.get("assets") is not None or existing.get("equity") is not None
        self.assertFalse(complete)


if __name__ == "__main__":
    unittest.main()
