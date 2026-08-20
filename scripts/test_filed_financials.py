#!/usr/bin/env python3
"""Tests for shaping filed net profit into the published company document.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'

The store records below come from running the real parser over the real ELKA
filing (see `test_egx_filing_detail`), so the numbers here are the ones the
exchange published: EGP 447,077,873 for the first half of 2026 against
EGP 17,432,345 for the same half of 2025.
"""

from __future__ import annotations

import json
import pathlib
import tempfile
import unittest

from build_market_api import _filed_financials

ELKA_H1_2026 = {
    "ticker": "ELKA",
    "period": "H1 2026",
    "period_end": "2026-06-30",
    "months": 6,
    "basis": "standalone",
    "net_profit_egp": 447_077_873,
    "prior_period": "H1 2025",
    "prior_period_end": "2025-06-30",
    "prior_net_profit_egp": 17_432_345,
    "source": "https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID=293661",
    "filed_on": "2026-08-20",
}


def shape(*records, statements=None):
    """Shape the given filings, with both stores pinned to temporary files.

    Both paths must be passed. Leaving the statements store to its default
    picked up the real collected file and quietly added a couple of hundred
    companies to every assertion in here.
    """
    with tempfile.TemporaryDirectory() as tmp:
        filings = pathlib.Path(tmp) / "filings.json"
        filings.write_text(json.dumps(
            {"read": {}, "filings": {str(i): r for i, r in enumerate(records)}},
            ensure_ascii=False,
        ))
        statements_path = pathlib.Path(tmp) / "statements.json"
        statements_path.write_text(json.dumps(
            {"companies": statements or {}, "skipped": {}}, ensure_ascii=False,
        ))
        return _filed_financials(filings, statements_path)


class ShapeTest(unittest.TestCase):
    def test_whole_pounds_become_millions(self):
        # The filing states whole pounds; the app's tiles are labelled EGP m.
        # Getting this wrong by 10^6 is the single easiest way to publish a
        # number that is wildly wrong while looking entirely plausible.
        periods = shape(ELKA_H1_2026)["ELKA"]["quarterly"]
        latest = [p for p in periods if p["period"] == "H1 2026"][0]
        self.assertAlmostEqual(latest["net_income"], 447.078, places=2)

    def test_the_comparative_becomes_its_own_period(self):
        # One filing yields two periods, which is what lets a company show a
        # year-on-year move the first time we ever read it.
        periods = shape(ELKA_H1_2026)["ELKA"]["quarterly"]
        self.assertEqual(
            [p["period"] for p in periods], ["H1 2025", "H1 2026"]
        )
        prior = periods[0]
        self.assertAlmostEqual(prior["net_income"], 17.432, places=2)

    def test_interim_and_annual_go_to_different_buckets(self):
        annual = dict(ELKA_H1_2026, period="FY 2025", months=12,
                      period_end="2025-12-31", prior_period=None,
                      prior_net_profit_egp=None)
        out = shape(ELKA_H1_2026, annual)["ELKA"]
        self.assertEqual([p["period"] for p in out["annual"]], ["FY 2025"])
        self.assertIn("H1 2026", [p["period"] for p in out["quarterly"]])

    def test_consolidated_displaces_standalone_for_the_same_period(self):
        # Companies file both. The consolidated figure is the group's, which is
        # the one that matches how the company is discussed.
        consolidated = dict(ELKA_H1_2026, basis="consolidated",
                            net_profit_egp=500_000_000)
        periods = shape(ELKA_H1_2026, consolidated)["ELKA"]["quarterly"]
        h1 = [p for p in periods if p["period"] == "H1 2026"]
        self.assertEqual(len(h1), 1, "one period, not one per basis")
        self.assertEqual(h1[0]["basis"], "consolidated")
        self.assertAlmostEqual(h1[0]["net_income"], 500.0, places=1)

    def test_a_companys_own_filing_beats_anothers_comparative(self):
        # H1 2025 arrives twice: once as ELKA's own filing, once quoted as the
        # comparative inside the H1 2026 filing. The filed one wins.
        own = dict(ELKA_H1_2026, period="H1 2025", period_end="2025-06-30",
                   net_profit_egp=17_432_345, prior_period="H1 2024",
                   prior_period_end="2024-06-30",
                   prior_net_profit_egp=9_000_000,
                   source="https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID=1")
        periods = shape(ELKA_H1_2026, own)["ELKA"]["quarterly"]
        h1_2025 = [p for p in periods if p["period"] == "H1 2025"][0]
        self.assertTrue(h1_2025["source"].endswith("NewsID=1"))

    def test_basis_outranks_whether_it_was_filed_or_quoted(self):
        # H1 2025 arrives as ELKA's own standalone filing and as the
        # comparative inside a consolidated H1 2026 filing. Consolidated wins:
        # both come from the exchange, and the group figure is the one the
        # company is discussed as. This ordering used to fall out of the order
        # the branches happened to be written in; it is a decision now.
        own_standalone = dict(ELKA_H1_2026, period="H1 2025",
                              period_end="2025-06-30", basis="standalone",
                              net_profit_egp=17_432_345, prior_period=None,
                              prior_net_profit_egp=None)
        consolidated_2026 = dict(ELKA_H1_2026, basis="consolidated",
                                 prior_net_profit_egp=19_000_000)
        periods = shape(own_standalone, consolidated_2026)["ELKA"]["quarterly"]
        h1_2025 = [p for p in periods if p["period"] == "H1 2025"][0]
        self.assertEqual(h1_2025["basis"], "consolidated")
        self.assertAlmostEqual(h1_2025["net_income"], 19.0, places=1)

    def test_every_period_carries_its_filing(self):
        # Spec §50: a reported figure the reader cannot trace is not much
        # better than one we made up.
        for period in shape(ELKA_H1_2026)["ELKA"]["quarterly"]:
            self.assertIn("egx.com.eg", period["source"])
            self.assertEqual(period["filed_on"], "2026-08-20")

    def test_only_net_income_is_populated(self):
        # The template has no revenue or balance-sheet lines. Emitting zeros
        # for them would read as "this company earned nothing".
        period = shape(ELKA_H1_2026)["ELKA"]["quarterly"][0]
        for absent in ("revenue", "gross_profit", "assets", "equity", "debt"):
            self.assertNotIn(absent, period)

    def test_an_empty_store_publishes_nothing(self):
        self.assertEqual(shape(), {})

    def test_a_record_with_no_ticker_is_skipped(self):
        self.assertEqual(shape({k: v for k, v in ELKA_H1_2026.items()
                                if k != "ticker"}), {})


class TwoSourcesTest(unittest.TestCase):
    """Where the exchange and the aggregator describe the same year."""

    ANNUAL = {"ELKA": {"2025": {
        "assets": 10_000.0, "liabilities": 6_000.0, "equity": 4_000.0,
        "net_income": 500.0, "operating_cash_flow": 700.0,
    }}}

    def test_the_balance_sheet_and_the_filed_profit_land_on_one_period(self):
        # Mubasher has the balance sheet, the exchange has the profit. A reader
        # should see one FY 2025, not two half-populated ones.
        filed = dict(ELKA_H1_2026, period="FY 2025", months=12,
                     period_end="2025-12-31", net_profit_egp=512_000_000,
                     prior_period=None, prior_net_profit_egp=None)
        annual = shape(filed, statements=self.ANNUAL)["ELKA"]["annual"]

        self.assertEqual(len(annual), 1)
        period = annual[0]
        self.assertEqual(period["assets"], 10_000.0)
        self.assertEqual(period["equity"], 4_000.0)
        self.assertAlmostEqual(period["net_income"], 512.0, places=1)

    def test_the_exchange_outranks_the_aggregator_on_the_same_line(self):
        # Both carry net income for FY 2025 and they differ. The exchange's is
        # the one we can point a reader at, so it is the one shown.
        filed = dict(ELKA_H1_2026, period="FY 2025", months=12,
                     period_end="2025-12-31", net_profit_egp=512_000_000,
                     prior_period=None, prior_net_profit_egp=None)
        period = shape(filed, statements=self.ANNUAL)["ELKA"]["annual"][0]

        self.assertAlmostEqual(period["net_income"], 512.0, places=1)
        self.assertIn("egx.com.eg", period["source"])

    def test_the_aggregator_alone_still_publishes(self):
        # Most companies will never have an exchange filing we have read.
        annual = shape(statements=self.ANNUAL)["ELKA"]["annual"]

        self.assertEqual(len(annual), 1)
        self.assertEqual(annual[0]["net_income"], 500.0)
        self.assertIn("mubasher", annual[0]["source"])

    def test_annual_statements_do_not_displace_an_interim_filing(self):
        # FY 2025 and H1 2026 are different periods and both belong.
        out = shape(ELKA_H1_2026, statements=self.ANNUAL)["ELKA"]

        self.assertEqual([p["period"] for p in out["annual"]], ["FY 2025"])
        self.assertIn("H1 2026", [p["period"] for p in out["quarterly"]])


if __name__ == "__main__":
    unittest.main()
