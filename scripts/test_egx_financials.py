#!/usr/bin/env python3
"""The filed-net-profit merge, and the four ways it publishes a wrong number.

Every case here is a real filing shape found in the archive, not a hypothetical.
"""
import datetime
import re
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


class BasisTemplates(unittest.TestCase):
    """The exchange writes this line two ways and the regex knew one."""

    OLD = re.compile(r"F/S\s+(Standalone|Consolidated)\s+Period", re.I)

    def test_both_templates_are_read(self):
        for body, want in (
            ("F/S Consolidated Period : From 01/01/2024 To 31/12/2024", "consolidated"),
            ("F/S (Standalone) Period: From 01/01/2024 to 31/12/2024", "standalone"),
            ("F/S (Consolidated) Period: From 01/01/2024 to 31/12/2024", "consolidated"),
            ("F/S Standalone Period : From 01/01/2024 To 31/12/2024", "standalone"),
        ):
            found = m.BASIS.search(body)
            self.assertIsNotNone(found, body)
            self.assertEqual(found.group(1).lower(), want, body)

    def test_the_parenthesised_form_is_the_one_that_was_missed(self):
        """2,468 filings stated a basis and were recorded as unstated.

        It disabled the rule directly below it — a consolidated filing is
        preferred over a standalone one for the same period, and it cannot be
        preferred if it cannot be seen. TMGH filed both for FY 2024, standalone
        801,960,651 and consolidated 14,467,525,731, and the site published the
        parent's figure beside the group's 356,781m of assets.
        """
        body = "F/S (Standalone) Period: From 01/01/2024 to 31/12/2024"
        self.assertIsNone(self.OLD.search(body))
        self.assertEqual(m.BASIS.search(body).group(1).lower(), "standalone")

    def test_a_line_stating_no_basis_still_states_none(self):
        self.assertIsNone(m.BASIS.search("F/S Period : From 01/01/2024 To 31/12/2024"))


class ExchangeWins(unittest.TestCase):
    """The filing wins the figure; the statement's own is kept beside it.

    The owner's rule: mix the two sources on the as-filed table and give the
    exchange priority where they intersect. A company's submission to its own
    regulator outranks a redistributor's copy of it.
    """

    def statement(self, **extra):
        return {"period": "FY 2024", "net_income": 10723.074, "assets": 356781.349,
                "equity": 131482.227, "source": "mubasher", **extra}

    def test_the_statement_figure_is_kept_beside_the_filing(self):
        row = self.statement()
        self.assertTrue(m.keep_statement_figure(row, 14467.526))
        self.assertEqual(row["statement_net_income"], 10723.074)
        self.assertEqual(row["statement_net_income_source"], "mubasher")

    def test_an_agreeing_filing_leaves_no_second_copy(self):
        """1,312 of the 1,480 intersecting periods agree; they need no sidecar."""
        row = self.statement()
        self.assertFalse(m.keep_statement_figure(row, 10723.074))
        self.assertNotIn("statement_net_income", row)

    def test_a_period_with_no_balance_sheet_has_nothing_to_preserve(self):
        row = {"period": "FY 2025", "net_income": 839.858}
        self.assertFalse(m.keep_statement_figure(row, 18201.981))
        self.assertNotIn("statement_net_income", row)

    def test_a_period_with_no_stated_profit_has_nothing_to_preserve(self):
        row = {"period": "FY 2025", "net_income": None, "assets": 12.0}
        self.assertFalse(m.keep_statement_figure(row, 18201.981))
        self.assertNotIn("statement_net_income", row)




class WhichSideIsWrong(unittest.TestCase):
    """A four-hundredfold gap does not say which of the two figures is the error."""

    def series(self, **override):
        rows = [{"period": "FY 2021", "net_income": 2028.149},
                {"period": "FY 2022", "net_income": 2709.883},
                {"period": "FY 2023", "net_income": 6559.603},
                {"period": "FY 2024", "net_income": 27.992},
                {"period": "FY 2025", "net_income": 18714.779}]
        for row in rows:
            if row["period"] in override:
                row["net_income"] = override[row["period"]]
        return rows

    def test_a_stored_figure_its_neighbours_disown_is_indicted(self):
        """HDBK sat at 27.992m between 6,559.603m and 18,714.779m, and its own
        filing reads "Net Profit : 12,453,812,253"."""
        self.assertTrue(m.indicted_by_its_own_series(
            self.series(), "FY 2024", 12453.812, 27.992))

    def test_a_stored_figure_that_belongs_is_not(self):
        """Eastern Tobacco: the stored figure fits, the filing states thousands."""
        self.assertFalse(m.indicted_by_its_own_series(
            self.series(**{"FY 2024": 6048.733}), "FY 2024", 6.048, 6048.733))

    def test_it_needs_neighbours_on_the_record_to_speak(self):
        self.assertFalse(m.indicted_by_its_own_series(
            [{"period": "FY 2024", "net_income": 27.992}], "FY 2024", 12453.812, 27.992))

    def test_a_period_that_is_not_in_the_series_is_not_judged(self):
        self.assertFalse(m.indicted_by_its_own_series(
            self.series(), "FY 2099", 1.0, 2.0))

    def test_the_year_orders_the_series_not_the_end_date(self):
        """3 of HDBK's 12 annual rows carry no `period_end`; sorting on the
        string put them after 2025 and handed FY 2024 the wrong neighbours."""
        rows = self.series()
        for row in rows:
            row["period_end"] = None if row["period"] == "FY 2024" else \
                f"{row['period'][3:]}-12-31"
        self.assertTrue(m.indicted_by_its_own_series(
            rows, "FY 2024", 12453.812, 27.992))




class Coherence(unittest.TestCase):
    """Replacing only the bottom line of an income statement it does not belong to."""

    def row(self, **over):
        r = {"period": "H1 2026", "net_income": 285.408, "revenue": 336.025,
             "assets": 1000.0, "source": "mubasher"}
        r.update(over)
        return r

    def test_a_consolidated_profit_is_refused_onto_a_parents_revenue(self):
        """TMGH H1 2026 would read 9,945.756m of profit on 336.025m of revenue."""
        self.assertTrue(m.breaks_the_income_statement(self.row(), 9945.756))

    def test_a_figure_that_fits_the_revenue_is_taken(self):
        self.assertFalse(m.breaks_the_income_statement(self.row(), 300.0))

    def test_a_row_already_above_its_revenue_is_not_this_step_s_doing(self):
        """Ten such rows were already published; a holding company earns most
        of its money below the revenue line."""
        self.assertFalse(m.breaks_the_income_statement(
            self.row(net_income=400.0), 9945.756))

    def test_a_loss_larger_than_revenue_is_ordinary_and_not_a_licence(self):
        """EPCO and CNFN each stored a loss bigger than revenue, which read as
        'already odd, leave it', and each then took a profit six times it."""
        self.assertTrue(m.breaks_the_income_statement(
            self.row(net_income=-18.455, revenue=14.729), 89.130))

    def test_an_incoming_loss_is_never_refused_on_these_grounds(self):
        """DAPH filed "Net Loss : 140,758,402" and it must reach the row."""
        self.assertFalse(m.breaks_the_income_statement(
            self.row(revenue=50.0, net_income=17.946), -140.758))

    def test_a_row_with_no_revenue_has_no_income_statement_to_break(self):
        self.assertFalse(m.breaks_the_income_statement(
            self.row(revenue=None), 9945.756))


class Attribution(unittest.TestCase):
    """`statement_net_income` must be what the STATEMENT said."""

    def test_an_exchange_figure_is_not_recorded_as_the_statements(self):
        """This step is idempotent, so on a second run the value it finds is
        often its own from the first. TMGH carried 801.961 under Mubasher's
        name; Mubasher never said 801.961, it said 10,723.074."""
        row = {"period": "FY 2024", "net_income": 801.961, "assets": 356781.349,
               "source": "mubasher", "net_income_source": m.SOURCE}
        self.assertFalse(m.keep_statement_figure(row, 14467.526))
        self.assertNotIn("statement_net_income", row)

    def test_a_genuine_statement_figure_is_recorded(self):
        row = {"period": "FY 2024", "net_income": 10723.074, "assets": 356781.349,
               "source": "mubasher"}
        self.assertTrue(m.keep_statement_figure(row, 14467.526))
        self.assertEqual(row["statement_net_income"], 10723.074)
        self.assertEqual(row["statement_net_income_source"], "mubasher")


class Entities(unittest.TestCase):
    """The template pads its labels with &nbsp;, and a regex cannot see through it."""

    def test_a_padded_label_still_matches(self):
        """"Net Profit&nbsp;&nbsp; : 15,195,209" is FCMD's own Q1 2026, and it was
        neither matched nor counted — 4,925 filings went the same way."""
        body = m.flatten("Net Profit&nbsp;&nbsp; : 15,195,209 F/S Consolidated Period")
        found = m.NET.search(body)
        self.assertIsNotNone(found)
        self.assertEqual(found.group(2), "15,195,209")

    def test_entities_decode_before_tags_are_stripped(self):
        """The other order turns an escaped tag into a real one."""
        self.assertEqual(m.flatten("<b>Net</b>&nbsp;Loss&nbsp;:&nbsp;1,209,667"),
                         "Net Loss : 1,209,667")
        self.assertEqual(m.flatten("Value &amp; Volume"), "Value & Volume")

    def test_whitespace_is_still_collapsed(self):
        self.assertEqual(m.flatten("Net\n\n  Profit&nbsp; : \t 5"), "Net Profit : 5")

    def test_empty_and_none_are_empty(self):
        self.assertEqual(m.flatten(None), "")
        self.assertEqual(m.flatten(""), "")


if __name__ == "__main__":
    unittest.main()
