#!/usr/bin/env python3
"""Tests for reading filed statements off a Mubasher company page.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'

The fixture is a real El Sewedy page, trimmed to two years and two periods. It
is kept real because the two things most likely to break here — the JavaScript
literal being not-quite-JSON, and the units differing between periods on one
page — are both properties of the actual bytes.

The cross-check at the bottom is the important one. El Sewedy published its own
FY2024 figures; if this pipeline does not reproduce them exactly, it is wrong,
and no amount of internal consistency would tell us so.
"""

from __future__ import annotations

import unittest

from mubasher_statements import (
    annual_rows,
    extract_literal,
    reports_in_egp,
    scale_for,
    statements_for,
)

# A real page, trimmed. Note the two periods disagree about units: the annual
# column is thousands, the first quarter is whole pounds.
STATEMENT = '{\'currency\': \'Egyptian Pound(EGP)\', \'periods\': [{\'attachments\': {}, \'label\': \'First Quarter\', \'sections\': [{\'label\': \'Balance Sheet\', \'records\': [{\'label\': "Total Liabilities & Shareholders\' Equity", \'values\': {\'2024\': 201164193251.0, \'2023\': 133514213176.0}}, {\'label\': "Total Owners\' Equity & Minority Interest Equity", \'values\': {\'2024\': 47541686293.0, \'2023\': 33094539197.0}}, {\'label\': \'Total Assets\', \'values\': {\'2024\': 201164193251.0, \'2023\': 133514213176.0}}, {\'label\': \'Total Liabilities\', \'values\': {\'2024\': 153622506958.0, \'2023\': 100419673979.0}}]}, {\'label\': \'Income Statement\', \'records\': [{\'label\': \'Net Income or Loss\', \'values\': {\'2024\': 3979976698.0, \'2023\': 2904669232.0}}, {\'label\': \'Gross Profit\', \'values\': {\'2024\': 10318314695.0, \'2023\': 6622077746.0}}]}, {\'label\': \'Cash Flow\', \'records\': [{\'label\': \'Net Cash Flow from (Used In) Investing Activities\', \'values\': {\'2024\': -2343540309.0, \'2023\': -546152696.0}}, {\'label\': \'Net Change In Cash & Cash Equivalents\', \'values\': {\'2024\': 5851429099.0, \'2023\': -1873058812.0}}, {\'label\': \'Net Cash Flow from (Used In) Financing Activities\', \'values\': {\'2024\': 11738675427.0, \'2023\': 3238080397.0}}, {\'label\': \'Net Cash Flow from (Used In) Operating Activities\', \'values\': {\'2024\': -3543706019.0, \'2023\': -4564986513.0}}]}], \'year\': \'2025\', \'years\': [\'2025\', \'2024\', \'2023\', \'2022\', \'2021\']}, {\'attachments\': {}, \'label\': \'annual budget\', \'sections\': [{\'label\': \'Balance Sheet\', \'records\': [{\'label\': "Total Liabilities & Shareholders\' Equity", \'values\': {\'2024\': 249527138.687, \'2023\': 151448654.828}}, {\'label\': "Total Owners\' Equity & Minority Interest Equity", \'values\': {\'2024\': 59526685.256, \'2023\': 38108479.528}}, {\'label\': \'Total Assets\', \'values\': {\'2024\': 249527138.687, \'2023\': 151448654.828}}, {\'label\': \'Total Liabilities\', \'values\': {\'2024\': 190000453.431, \'2023\': 113340175.3}}]}, {\'label\': \'Income Statement\', \'records\': [{\'label\': \'Net Income or Loss\', \'values\': {\'2024\': 17461358.714, \'2023\': 10115701.777}}, {\'label\': \'Gross Profit\', \'values\': {\'2024\': 45918167.774, \'2023\': 31198078.611}}]}, {\'label\': \'Cash Flow\', \'records\': [{\'label\': \'Net Cash Flow from (Used In) Investing Activities\', \'values\': {\'2024\': -8063575.501, \'2023\': -4046730.061}}, {\'label\': \'Net Change In Cash & Cash Equivalents\', \'values\': {\'2024\': 7822805.537, \'2023\': 5834439.258}}, {\'label\': \'Net Cash Flow from (Used In) Financing Activities\', \'values\': {\'2024\': 11906932.106, \'2023\': 4749846.662}}, {\'label\': \'Net Cash Flow from (Used In) Operating Activities\', \'values\': {\'2024\': 3979448.932, \'2023\': 5131322.657}}]}], \'year\': \'2024\', \'years\': [\'2024\', \'2023\', \'2022\', \'2021\', \'2020\']}]}'

PAGE = (
    "<html><body><script>midata.financialStatement = "
    + STATEMENT
    + ";</script></body></html>"
)

# El Sewedy Electric's own FY2024 earnings release, "Consolidated Income
# Statement / EGP 000" and "Consolidated Balance Sheet / EGP 000".
SWDY_MARKET_CAP = 272_233_014_465
OFFICIAL_FY2024 = {
    "assets": 249_527_139,
    "equity": 59_526_685,
    "liabilities": 190_000_453,
    "net_income": 17_461_359,
}


class ExtractTest(unittest.TestCase):
    def test_reads_a_javascript_literal_that_is_not_json(self):
        # Single-quoted keys and an escaped apostrophe in "Owners' Equity"
        # both make json.loads fail on this.
        statement = extract_literal(PAGE)
        self.assertIsNotNone(statement)
        self.assertIn("periods", statement)

    def test_a_page_without_the_block_yields_nothing(self):
        self.assertIsNone(extract_literal("<html>no statements here</html>"))
        self.assertIsNone(extract_literal(""))


class CurrencyTest(unittest.TestCase):
    def test_pounds_are_accepted(self):
        self.assertTrue(reports_in_egp({"currency": "Egyptian Pound(EGP)"}))

    def test_dollars_are_refused(self):
        # Orascom Construction files in USD. Publishing those as pounds would
        # be wrong by roughly fifty times and look entirely ordinary.
        self.assertFalse(reports_in_egp({"currency": "US Dollar(USD)"}))

    def test_an_unstated_currency_is_refused(self):
        self.assertFalse(reports_in_egp({}))


class AnnualTest(unittest.TestCase):
    def test_takes_the_annual_column_and_not_the_quarter(self):
        rows = annual_rows(extract_literal(PAGE))
        # The quarter states 201,164,193,251 of assets for 2024; the annual
        # column states 249,527,138.687 thousands. Picking the wrong one is a
        # 1000x error. Compared with a tolerance because the company's own
        # release rounds to whole thousands (249,527,139) and the page does
        # not — they agree to within 313 pounds out of 249 billion.
        self.assertAlmostEqual(rows["2024"]["assets"], 249_527_139, delta=1)


class ScaleTest(unittest.TestCase):
    def setUp(self):
        self.rows = annual_rows(extract_literal(PAGE))

    def test_thousands_are_detected(self):
        self.assertEqual(scale_for(self.rows, SWDY_MARKET_CAP), 1000)

    def test_no_market_cap_means_no_publication(self):
        # Without an independent number to check against there is nothing to
        # catch a scale error, so the company is not published at all.
        self.assertIsNone(scale_for(self.rows, None))
        self.assertIsNone(scale_for(self.rows, 0))

    def test_an_implausible_ratio_is_refused(self):
        # A market capitalisation a thousand times too small makes both
        # candidate scales absurd, and neither may be guessed.
        self.assertIsNone(scale_for(self.rows, 1000))


class BalanceTest(unittest.TestCase):
    """Assets = liabilities + equity, which is what a balance sheet is.

    A clean check on the parsing, and independent of the scale check: it holds
    whatever unit the page used. Every one of the first 279 company-years
    collected balanced, so a failure means a misread page.
    """

    def test_a_real_balance_sheet_balances(self):
        from mubasher_statements import balances
        rows = annual_rows(extract_literal(PAGE))
        self.assertTrue(balances(rows["2024"]))

    def test_a_misread_balance_sheet_is_refused(self):
        from mubasher_statements import balances
        self.assertFalse(balances(
            {"assets": 100.0, "liabilities": 10.0, "equity": 10.0}
        ))

    def test_a_partial_balance_sheet_is_not_judged(self):
        # A company that filed only some lines is normal and must still
        # publish; the check applies when there is something to check.
        from mubasher_statements import balances
        self.assertTrue(balances({"assets": 100.0}))
        self.assertTrue(balances({"net_income": 5.0}))

    def test_an_unbalanced_company_is_skipped_with_its_reason(self):
        # Built rather than patched: the real page carries the same figure in
        # two periods, so a string replacement hits the wrong one.
        broken = {
            "currency": "Egyptian Pound(EGP)",
            "periods": [{
                "label": "annual budget",
                "sections": [{
                    "label": "Balance Sheet",
                    "records": [
                        {"label": "Total Assets", "values": {"2024": 100.0}},
                        {"label": "Total Liabilities", "values": {"2024": 10.0}},
                        {"label": "Total Owners' Equity & Minority Interest "
                                  "Equity", "values": {"2024": 10.0}},
                    ],
                }],
            }],
        }
        page = ("<script>midata.financialStatement = "
                + repr(broken) + ";</script>")
        figures, why = statements_for(page, SWDY_MARKET_CAP)
        self.assertIsNone(figures)
        self.assertIn("does not add up", why)


class CrossCheckTest(unittest.TestCase):
    def test_it_reproduces_the_figures_the_company_published(self):
        figures, why = statements_for(PAGE, SWDY_MARKET_CAP)
        self.assertEqual(why, "ok")
        for line, official in OFFICIAL_FY2024.items():
            self.assertAlmostEqual(
                figures["2024"][line], official / 1000, places=2,
                msg=f"{line} does not match El Sewedy's own FY2024 release",
            )

    def test_a_dollar_reporter_is_refused_with_its_reason(self):
        page = PAGE.replace("Egyptian Pound(EGP)", "US Dollar(USD)")
        figures, why = statements_for(page, SWDY_MARKET_CAP)
        self.assertIsNone(figures)
        self.assertIn("USD", why)

    def test_no_revenue_or_gross_profit_is_carried(self):
        # The page has no revenue line at all, and its gross profit disagrees
        # with the company's own release, so neither is published and margins
        # stay underivable rather than approximated.
        figures, _ = statements_for(PAGE, SWDY_MARKET_CAP)
        for absent in ("revenue", "gross_profit"):
            self.assertNotIn(absent, figures["2024"])


if __name__ == "__main__":
    unittest.main()
