#!/usr/bin/env python3
"""Tests for the EGX detail-page parser.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'

The markup below is captured verbatim from live EGX pages, whitespace and all,
because the padding is load-bearing: the exchange aligns its field names with
runs of spaces ("اسم الشركة       :") and a parser that assumes single spaces
matches nothing. Keeping real bytes here is what makes these tests worth having
— the network side is rate-limited and cannot run in CI, so this file is the
only place the parsing is actually exercised.
"""

from __future__ import annotations

import unittest

from egx_filing_detail import (
    financials_from_detail,
    looks_like_a_filing,
    parse_detail,
)

# ELKA (Cairo Housing & Development), H1 2026 standalone results.
# https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID=293661
RESULTS_PAGE = (
    '<span id="ctl00_C_N_lblTitle">القاهرة للاسكان والتعمير (ELKA.CA) تعلن '
    'نتائج أعمالها غير المجمعة عن 6 أشهر</span>'
    '<span id="ctl00_C_N_lblDate">20/08/2026</span>'
    '<span id="ctl00_C_N_lblDetails">اسم الشركة       : القاهرة للاسكان والتعمير<br>'
    'كود الترقيم الدولي : EGS65071C010<br>'
    'العملة           : جنيه مصري<br>'
    'القوائم المالية غير المجمعة عن الفترة :من 01/01/2026 الى 30/06/2026<br>'
    'صافي الربح   : 447,077,873 <br>'
    'أرقام المقارنة غير المجمعة عن الفترة  : من 01/01/2025 الى 30/06/2025<br>'
    'صافي الربح لفترة المقارنة   : 17,432,345 <br>'
    'تقرير الفحص المحدود : مرفق<br>'
    'المصدر : القاهرة للاسكان والتعمير<br></span>'
)

# SVCE (South Valley Cement) — a covering statement with a PDF, not results.
# https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID=293676
STATEMENT_PAGE = (
    '<span id="ctl00_C_N_lblTitle">بيان من جنوب الوادى للاسمنت (SVCE.CA)</span>'
    '<span id="ctl00_C_N_lblDetails">اسم الشركة : جنوب الوادى للاسمنت<br>'
    'كود الترقيم الدولي : EGS3C351C011<br>'
    'كود رويترز : SVCE.CA<br>'
    'مضمون الإعلان : <br>'
    'بيان من الشركة بخصوص مبررات التأخير في إرسال القوائم المالية المستقلة عن '
    'الفترة المالية المنتهية في 30/06/2026 عن موعدها.<br><br>'
    '<img style="vertical-align: middle;padding:3px;" src="/images/pdf.gif"> '
    '<a href="/downloads/Bulletins/343198_1.pdf" target="_blank">'
    'بيان من الشركة (26 KB)</a></span>'
)

# What a reset actually returns: Chrome's own error document, HTTP 200.
CHROME_ERROR_PAGE = (
    "<title>www.egx.com.eg</title><body>"
    "/* Copyright 2017 The Chromium Authors */ ERR_CONNECTION_RESET</body>"
)


class GuardTest(unittest.TestCase):
    def test_a_results_page_is_a_filing(self):
        self.assertTrue(looks_like_a_filing(RESULTS_PAGE))

    def test_chrome_error_page_is_not_a_filing(self):
        # A reset is an HTTP 200 as far as the fetcher is concerned. Without
        # this guard a blocked run overwrites good records with nothing.
        self.assertFalse(looks_like_a_filing(CHROME_ERROR_PAGE))
        self.assertIsNone(parse_detail(CHROME_ERROR_PAGE))


class ParseDetailTest(unittest.TestCase):
    def test_reads_the_padded_field_names(self):
        detail = parse_detail(RESULTS_PAGE)
        self.assertEqual(detail["date"], "20/08/2026")
        self.assertIn("ELKA.CA", detail["title"])
        self.assertEqual(
            detail["fields"]["كود الترقيم الدولي"], "EGS65071C010"
        )

    def test_collects_attachments_as_absolute_urls(self):
        detail = parse_detail(STATEMENT_PAGE)
        self.assertEqual(
            detail["attachments"],
            ["https://www.egx.com.eg/downloads/Bulletins/343198_1.pdf"],
        )

    def test_the_word_attached_is_not_an_attachment(self):
        # ELKA's filing says "تقرير الفحص المحدود : مرفق" and renders no link.
        detail = parse_detail(RESULTS_PAGE)
        self.assertIn("مرفق", " ".join(detail["lines"]))
        self.assertEqual(detail["attachments"], [])


class FinancialsTest(unittest.TestCase):
    def setUp(self):
        self.record = financials_from_detail(parse_detail(RESULTS_PAGE))

    def test_reads_the_filed_net_profit_in_whole_pounds(self):
        self.assertEqual(self.record["net_profit_egp"], 447_077_873)
        self.assertEqual(self.record["prior_net_profit_egp"], 17_432_345)

    def test_does_not_mistake_the_comparative_for_the_period(self):
        # Both lines contain "صافي الربح"; the comparative extends it. Reading
        # them in iteration order would put last year's figure in this year.
        self.assertNotEqual(
            self.record["net_profit_egp"], self.record["prior_net_profit_egp"]
        )

    def test_names_the_period_by_its_length(self):
        self.assertEqual(self.record["period"], "H1 2026")
        self.assertEqual(self.record["period_start"], "2026-01-01")
        self.assertEqual(self.record["period_end"], "2026-06-30")
        self.assertEqual(self.record["months"], 6)
        self.assertEqual(self.record["prior_period"], "H1 2025")

    def test_reads_the_basis_including_its_negation(self):
        # "غير المجمعة" contains "المجمعة", so a naive substring test calls a
        # standalone filing consolidated — the opposite of what it says.
        self.assertEqual(self.record["basis"], "standalone")

    def test_carries_the_identifiers_the_exchange_stamped(self):
        self.assertEqual(self.record["isin"], "EGS65071C010")
        self.assertEqual(self.record["name_ar"], "القاهرة للاسكان والتعمير")

    def test_a_covering_statement_yields_no_figures(self):
        # It mentions "القوائم المالية" in prose but reports nothing. A partial
        # record here would publish a period with no profit against a company.
        self.assertIsNone(financials_from_detail(parse_detail(STATEMENT_PAGE)))


class ComparativePeriodTest(unittest.TestCase):
    """The consolidated template words the comparison line differently.

    Matching the exact phrase "أرقام المقارنة" read every standalone filing and
    silently missed every consolidated one: the comparative figure came through
    and the period it belonged to did not, so the year-on-year comparison was
    dropped on exactly the filings that matter most. ELKA's consolidated H1 2026
    filing carried a comparative of EGP 34,369,934 with no period attached.
    """

    def _record(self, comparison_line: str):
        page = RESULTS_PAGE.replace(
            "أرقام المقارنة غير المجمعة عن الفترة  : من 01/01/2025 الى 30/06/2025<br>",
            comparison_line,
        )
        return financials_from_detail(parse_detail(page))

    def test_any_comparison_line_carrying_dates_is_read(self):
        record = self._record(
            "القوائم المالية المجمعة لفترة المقارنة : من 01/01/2025 الى 30/06/2025<br>"
        )
        self.assertEqual(record["prior_period"], "H1 2025")
        self.assertEqual(record["prior_period_end"], "2025-06-30")

    def test_a_comparative_with_no_period_is_dated_a_year_back(self):
        # The figure is not thrown away for want of a label: a comparative is,
        # by definition, the same span one year earlier.
        record = self._record("")
        self.assertEqual(record["prior_net_profit_egp"], 17_432_345)
        self.assertEqual(record["prior_period"], "H1 2025")
        self.assertEqual(record["prior_period_start"], "2025-01-01")
        self.assertEqual(record["prior_period_end"], "2025-06-30")

    def test_the_current_period_is_not_mistaken_for_the_comparison(self):
        record = self._record("")
        self.assertEqual(record["period"], "H1 2026")
        self.assertEqual(record["net_profit_egp"], 447_077_873)


class NumberTest(unittest.TestCase):
    def _profit(self, filed: str):
        page = RESULTS_PAGE.replace("447,077,873", filed)
        return financials_from_detail(parse_detail(page))["net_profit_egp"]

    def test_losses_filed_in_parentheses_are_negative(self):
        self.assertEqual(self._profit("(12,500,000)"), -12_500_000)

    def test_a_trailing_sign_is_negative(self):
        self.assertEqual(self._profit("12,500,000-"), -12_500_000)

    def test_arabic_indic_digits_are_read(self):
        self.assertEqual(self._profit("١٢٬٥٠٠٬٠٠٠"), 12_500_000)

    def test_a_consolidated_filing_is_labelled_consolidated(self):
        page = RESULTS_PAGE.replace("غير المجمعة", "المجمعة")
        record = financials_from_detail(parse_detail(page))
        self.assertEqual(record["basis"], "consolidated")


if __name__ == "__main__":
    unittest.main()
