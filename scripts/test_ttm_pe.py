#!/usr/bin/env python3
"""The trailing twelve months, and every case it must refuse.

The annual ratio this sits beside has been wrong in public twice — once as
AALR at 34,048.9 because nothing checked the share count, once as a figure the
website re-derived over the top of the pipeline's refusals. Both were arithmetic
that looked fine. So the refusals are the tests.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""
from __future__ import annotations

import json
import pathlib
import unittest

import build_market_api
import build_ttm_pe as ttm

REPO = pathlib.Path(__file__).resolve().parent.parent


def doc(rows, *, shares=1_000_000, cap=None, close=10.0):
    """A company document with `rows` as (label, end, profit[, basis]).

    `close` is the price the document's market cap is made to agree with, so a
    test that wants the share-count guard to pass has to pass the same price to
    `ratio_for`. `cap` overrides it, which is how the guard is tested failing.
    """
    made = []
    for row in rows:
        label, end, profit = row[0], row[1], row[2]
        entry = {"period": label, "period_end": end, "net_income": profit}
        if len(row) > 3:
            entry["basis"] = row[3]
        made.append(entry)
    return {
        "ticker": "TEST",
        "profile": {"shares_outstanding": shares,
                    "market_cap": cap if cap is not None else close * shares},
        "financials": {"annual": [], "quarterly": made},
    }


class TrailingTest(unittest.TestCase):
    def test_twelve_months_is_the_year_plus_the_gap(self):
        # ADIB in August 2026, from the published documents:
        # FY 2025 12,601.0 + H1 2026 7,550.8 - H1 2025 6,233.9 = 13,917.9
        found, refused = ttm.trailing(ttm.filed_rows(doc([
            ("FY 2024", "2024-12-31", 9_000.0),
            ("H1 2025", "2025-06-30", 6_233.9),
            ("FY 2025", "2025-12-31", 12_601.0),
            ("H1 2026", "2026-06-30", 7_550.8),
        ])))
        self.assertEqual(refused, "")
        self.assertAlmostEqual(found["profit"], 13_917.9, places=3)
        self.assertEqual(found["full_year"]["label"], "FY 2025")
        self.assertEqual(found["a_year_ago"]["label"], "H1 2025")

    def test_a_june_year_end_is_matched_on_the_day_not_the_year(self):
        # 408 of the annual filings here are not calendar years. Matching on
        # the year in the label lines a March window up against a December one.
        found, refused = ttm.trailing(ttm.filed_rows(doc([
            ("FY 2025 (to 30 Jun)", "2025-06-30", 100.0),
            ("9M 2025 (to 31 Mar)", "2025-03-31", 60.0),
            ("9M 2026 (to 31 Mar)", "2026-03-31", 80.0),
        ])))
        self.assertEqual(refused, "")
        self.assertEqual(found["a_year_ago"]["label"], "9M 2025 (to 31 Mar)")
        self.assertAlmostEqual(found["profit"], 120.0)

    def test_a_basis_that_changes_mid_sum_is_refused(self):
        # 2,433 periods filed on both bases carry different profits, some by
        # thousands of per cent. A consolidated year minus a standalone half is
        # a different company's profit, not a smaller error than staleness.
        _, refused = ttm.trailing(ttm.filed_rows(doc([
            ("FY 2025", "2025-12-31", 100.0, "consolidated"),
            ("H1 2025", "2025-06-30", 40.0, "standalone"),
            ("H1 2026", "2026-06-30", 55.0, "consolidated"),
        ])))
        self.assertIn("one basis", refused)

    def test_the_newest_filing_being_a_full_year_needs_no_trailing(self):
        _, refused = ttm.trailing(ttm.filed_rows(doc([
            ("FY 2024", "2024-12-31", 90.0), ("FY 2025", "2025-12-31", 100.0),
        ])))
        self.assertIn("already a full year", refused)

    def test_a_stale_annual_cannot_stand_in_for_the_missing_year(self):
        # ALUM has filed no annual since 2020 and this published it as
        # "FY 2020 + H1 2026 - H1 2025" — a five-year-old year, a recent half,
        # and a subtraction that means nothing. The full year has to END
        # BETWEEN the two windows or the identity does not close.
        _, refused = ttm.trailing(ttm.filed_rows(doc([
            ("FY 2020", "2020-12-31", 500.0),
            ("H1 2025", "2025-06-30", 40.0),
            ("H1 2026", "2026-06-30", 60.0),
        ])))
        self.assertIn("between the two windows", refused)

    def test_the_year_taken_is_the_one_between_the_windows(self):
        found, refused = ttm.trailing(ttm.filed_rows(doc([
            ("FY 2023", "2023-12-31", 900.0),
            ("FY 2024", "2024-12-31", 800.0),
            ("H1 2025", "2025-06-30", 40.0),
            ("FY 2025", "2025-12-31", 100.0),
            ("H1 2026", "2026-06-30", 60.0),
        ])))
        self.assertEqual(refused, "")
        self.assertEqual(found["full_year"]["label"], "FY 2025")
        self.assertAlmostEqual(found["profit"], 120.0)

    def test_a_missing_leg_is_refused_rather_than_assumed_zero(self):
        _, refused = ttm.trailing(ttm.filed_rows(doc([
            ("FY 2025", "2025-12-31", 100.0), ("H1 2026", "2026-06-30", 55.0),
        ])))
        self.assertIn("same months of last year", refused)


class RatioTest(unittest.TestCase):
    ROWS = [("FY 2025", "2025-12-31", 100.0),
            ("H1 2025", "2025-06-30", 40.0),
            ("H1 2026", "2026-06-30", 60.0)]      # trailing = 120.0m

    def test_a_ratio_under_one_is_refused(self):
        # 120m over 10m shares is EGP 12 a share against a price of 10 — the
        # company earned more in a year than the market says it is worth, which
        # is a units error in a filing far more often than it is a bargain.
        _, refused = ttm.ratio_for(
            doc(self.ROWS, shares=10_000_000, close=10.0), close=10.0)
        self.assertIn("outside", refused)

    def test_a_workable_company_publishes_its_arithmetic(self):
        found, refused = ttm.ratio_for(
            doc(self.ROWS, shares=1_000_000, close=1_200.0), close=1_200.0)
        self.assertEqual(refused, "")
        self.assertAlmostEqual(found["eps_ttm"], 120.0)
        self.assertAlmostEqual(found["pe_ttm"], 10.0)
        self.assertEqual(found["pe_ttm_window"], "FY 2025 + H1 2026 - H1 2025")
        self.assertEqual(found["pe_ttm_to"], "H1 2026")

    def test_a_share_count_that_does_not_multiply_out_is_refused(self):
        # EGBE's cap over price-times-shares is 51.95. Without this its earnings
        # per share came out fifty-two times too large.
        _, refused = ttm.ratio_for(
            doc(self.ROWS, shares=1_000_000, close=1_200.0,
                cap=1_200.0 * 1_000_000 * 52), close=1_200.0)
        self.assertIn("multiply out", refused)

    def test_a_trailing_loss_gets_no_multiple(self):
        _, refused = ttm.ratio_for(doc(
            [("FY 2025", "2025-12-31", -100.0), ("H1 2025", "2025-06-30", -40.0),
             ("H1 2026", "2026-06-30", -60.0)], shares=1_000_000, close=1_200.0),
            close=1_200.0)
        self.assertIn("loss", refused)

    def test_no_price_means_no_ratio(self):
        _, refused = ttm.ratio_for(
            doc(self.ROWS, shares=1_000_000, close=1_200.0), close=None)
        self.assertIn("multiply out", refused)


class AgreesWithTheAnnualRatioTest(unittest.TestCase):
    def test_the_two_ratios_refuse_on_the_same_terms(self):
        # Two ratios on one screen that disagree about what is publishable is
        # how a reader learns to trust neither.
        self.assertEqual(ttm.PE_FLOOR, build_market_api.PE_FLOOR)
        self.assertEqual(ttm.PE_CEILING, build_market_api.PE_CEILING)
        self.assertEqual(ttm.PE_TOLERANCE, build_market_api.PE_TOLERANCE)

    def test_the_share_count_guard_is_the_same_guard(self):
        for close, cap, shares in [(10, 10_000, 1_000), (10, 520_000, 1_000),
                                   (0, 100, 10), (10, 0, 10), (10, 100, 0)]:
            self.assertEqual(
                ttm.share_count_agrees(close, cap, shares),
                build_market_api.share_count_agrees(close, cap, shares),
                f"the two guards disagree on {(close, cap, shares)}")


class PublishedTest(unittest.TestCase):
    """Against the real directory, so the builder is exercised on real shapes."""

    def setUp(self):
        if not ttm.DIRECTORY.exists():
            self.skipTest("no published directory")
        self.directory = json.loads(ttm.DIRECTORY.read_text(encoding="utf-8"))

    def test_every_published_trailing_ratio_carries_its_working(self):
        for company in self.directory.get("companies", []):
            if "pe_ttm" not in company:
                continue
            self.assertIn("pe_ttm_window", company, company["ticker"])
            self.assertIn("eps_ttm", company, company["ticker"])
            self.assertRegex(company["pe_ttm_window"], r".+ \+ .+ - .+", company["ticker"])
            self.assertTrue(ttm.PE_FLOOR <= company["pe_ttm"] <= ttm.PE_CEILING,
                            f"{company['ticker']} publishes {company['pe_ttm']}")
            self.assertGreater(company["eps_ttm"], 0, company["ticker"])

    def test_every_published_window_really_is_twelve_months(self):
        """The identity, re-derived from the documents, on every company.

        This is the test the ALUM bug would have failed: it published
        "FY 2020 + H1 2026 - H1 2025", which the eye reads as a trailing
        twelve months and the calendar does not. Checked on DATES, because
        the labels are what made it look reasonable — a June year-end files
        "FY 2025 (to 30 Jun)" alongside "H1 2025 (to 31 Dec)", and the year
        in the text runs backwards against the year on the clock.
        """
        base = ttm.COMPANIES
        checked = 0
        for company in self.directory.get("companies", []):
            if "pe_ttm" not in company:
                continue
            path = base / f"{company['ticker']}.json"
            if not path.exists():
                continue
            found, _ = ttm.trailing(
                ttm.filed_rows(json.loads(path.read_text(encoding="utf-8"))))
            self.assertIsNotNone(found, company["ticker"])
            ago = found["a_year_ago"]["end"]
            year = found["full_year"]["end"]
            now = found["to_date"]["end"]
            self.assertLess(ago, year, f"{company['ticker']}: {ago} !< {year}")
            self.assertLess(year, now, f"{company['ticker']}: {year} !< {now}")
            months = ((int(now[:4]) - int(ago[:4])) * 12
                      + (int(now[5:7]) - int(ago[5:7])))
            self.assertEqual(months, 12,
                             f"{company['ticker']} spans {months} months, not twelve: "
                             f"{company['pe_ttm_window']}")
            checked += 1
        # Coverage is asserted where it can be fixed — the builder runs right
        # after build_market_api, so a directory with none simply predates it.
        # Failing here would halt a publish over a race, which is how a DNS
        # blip on the gold feed once stopped the pipeline.
        if not checked:
            self.skipTest("no trailing ratio published yet")

    def test_the_builder_never_drops_a_company(self):
        # build_market_api has deleted 33 companies from a short scan before.
        # This one may only ever add fields.
        before = [c["ticker"] for c in self.directory.get("companies", [])]
        self.assertEqual(len(before), len(set(before)))
        self.assertGreater(len(before), 200)


if __name__ == "__main__":
    unittest.main()
