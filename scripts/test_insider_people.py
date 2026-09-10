#!/usr/bin/env python3
"""What the published ownership file must and must not say.

The map on the website draws these numbers as a claim about who owns a real
company, so the tests here are about the claims rather than the plumbing: a
holder is not two holders, a trade filed twice is not two trades, and a stake
read down to zero is not the same as a stake nobody ever held.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import contextlib
import io
import json
import pathlib
import tempfile
import unittest

import audit_accuracy
import build_insider_people as bip


def reading(filing, name, ticker, date, before, after, shares=1000, price=10.0,
            action="sell", name_en=None):
    return {
        "filingId": filing, "investorName": name, "investorNameEn": name_en or name,
        "ticker": ticker, "sessionDate": date, "action": action,
        "shares": shares, "price": price,
        "ownershipBeforePercent": before, "ownershipAfterPercent": after,
        "nameScript": "ar", "source": f"https://example.invalid/{filing}.pdf",
    }


def build(readings, companies=None):
    """Run the builder against a throwaway store and read back what it wrote."""
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        store, out = root / "store.json", root / "out.json"
        companies_file = root / "companies.json"
        store.write_text(json.dumps({"readings": {r["filingId"]: r for r in readings}}),
                         encoding="utf-8")
        companies_file.write_text(json.dumps({"companies": companies or []}),
                                  encoding="utf-8")
        saved = (bip.STORE, bip.OUT, bip.FIXTURE, bip.COMPANIES)
        bip.STORE, bip.OUT, bip.COMPANIES = store, out, companies_file
        bip.FIXTURE = root / "missing" / "fixture.json"
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                bip.main([])
            return json.loads(out.read_text(encoding="utf-8"))
        finally:
            bip.STORE, bip.OUT, bip.FIXTURE, bip.COMPANIES = saved


AMWAL = "شركة اموال العربيه للاقطان"
AMWAL_HAA = "شركه اموال العربيه للاقطان"


class Weeks(unittest.TestCase):
    def test_the_week_opens_on_sunday(self):
        # The EGX trades Sunday to Thursday. A Monday-anchored week would put
        # each Sunday's filings in with the week before.
        self.assertEqual(bip.week_of("2026-08-16"), "2026-08-16")  # a Sunday
        self.assertEqual(bip.week_of("2026-08-20"), "2026-08-16")  # the Thursday
        self.assertEqual(bip.week_of("2026-08-15"), "2026-08-09")  # the Saturday

    def test_a_week_inside_one_month_is_labelled_once(self):
        self.assertEqual(bip.week_label("2026-08-16", "2026-08-20", bip._MONTHS_EN),
                         "16–20 Aug")

    def test_a_week_across_two_months_names_both(self):
        self.assertEqual(bip.week_label("2026-08-30", "2026-09-03", bip._MONTHS_EN),
                         "30 Aug – 3 Sep")


class OneHolderPerParty(unittest.TestCase):
    def test_two_spellings_of_one_firm_are_one_holder(self):
        doc = build([
            reading("1", AMWAL_HAA, "KABO", "2026-08-19", 45.29, 44.07),
            reading("2", AMWAL, "KABO", "2026-08-30", 44.07, 41.81),
        ])
        self.assertEqual(doc["peopleCount"], 1)

    def test_the_company_is_not_shown_as_owned_twice_over(self):
        doc = build([
            reading("1", AMWAL_HAA, "KABO", "2026-08-19", 45.29, 44.07),
            reading("2", AMWAL, "KABO", "2026-08-30", 44.07, 41.81),
        ])
        held = sum(p["percent"] for p in doc["positions"] if p["ticker"] == "KABO")
        self.assertAlmostEqual(held, 41.81)

    def test_the_spellings_that_were_merged_are_still_published(self):
        doc = build([
            reading("1", AMWAL_HAA, "KABO", "2026-08-19", 45.29, 44.07),
            reading("2", AMWAL, "KABO", "2026-08-30", 44.07, 41.81),
        ])
        self.assertIn(AMWAL_HAA, doc["people"][0]["aliases"] or [])

    def test_a_parent_and_child_filing_on_one_company_stay_apart(self):
        doc = build([
            reading("1", "السيد صابر السيد حميد", "AIH", "2026-08-05", 9.0, 8.0),
            reading("2", "تولين السيد صابر السيد حميد", "AIH", "2026-08-06", 8.0, 7.0),
        ])
        self.assertEqual(doc["peopleCount"], 2)


class OneTradePerExecution(unittest.TestCase):
    def _twice_filed(self):
        return [
            reading("294186", "اميرالد للاتصالات وتكنولوجيا المعلومات", "IEEC",
                    "2026-08-31", 11.09, 9.04, shares=30_000_000, price=1.5),
            reading("294272", "اميرالد للاتصالات وتكنولوجيا المعلومات", "IEEC",
                    "2026-08-31", 11.09, 9.04, shares=30_000_000, price=1.5),
        ]

    def test_one_execution_filed_twice_counts_once(self):
        self.assertEqual(build(self._twice_filed())["tradeCount"], 1)

    def test_the_value_is_not_doubled_by_a_refiling(self):
        doc = build(self._twice_filed())
        self.assertAlmostEqual(doc["people"][0]["value"], 45_000_000.0)

    def test_two_real_trades_on_one_day_are_both_kept(self):
        doc = build([
            reading("1", "محمد اشرف عمر عمر", "HBCO", "2026-08-31", 11.0, 10.0),
            reading("2", "محمد اشرف عمر عمر", "HBCO", "2026-08-31", 10.0, 9.0),
        ])
        self.assertEqual(doc["tradeCount"], 2)


class StandingStakes(unittest.TestCase):
    def test_a_position_is_the_latest_form_not_a_sum_of_moves(self):
        doc = build([
            reading("1", "محمد اشرف عمر عمر", "HBCO", "2026-08-03", 12.0, 11.0),
            reading("2", "محمد اشرف عمر عمر", "HBCO", "2026-08-20", 10.9, 10.728),
        ])
        self.assertAlmostEqual(doc["positions"][0]["percent"], 10.728)

    def test_a_holding_sold_out_stays_in_the_list_at_zero(self):
        # Dropping it would say nobody ever held it, which is a different and
        # untrue claim.
        doc = build([reading("1", "الحصن للاستشارات", "UNIP", "2026-08-16", 3.01, 0.0)])
        self.assertEqual([p["percent"] for p in doc["positions"]], [0.0])

    def test_a_position_carries_the_filing_it_came_from(self):
        doc = build([reading("77", "الحصن للاستشارات", "UNIP", "2026-08-16", 3.01, 0.003)])
        self.assertEqual(doc["positions"][0]["filingId"], "77")

    def test_a_holder_of_two_companies_gets_two_positions(self):
        doc = build([
            reading("1", "وادي للاستشارات", "GGCC", "2026-09-01", 1.5, 0.84),
            reading("2", "وادي للاستشارات", "AIH", "2026-09-02", 4.0, 3.2),
        ])
        self.assertEqual({p["ticker"] for p in doc["positions"]}, {"GGCC", "AIH"})


class WhatMoved(unittest.TestCase):
    def test_a_week_reports_the_move_end_to_end_not_trade_by_trade(self):
        doc = build([
            reading("1", "محمد اشرف عمر عمر", "HBCO", "2026-08-17", 12.0, 11.0),
            reading("2", "محمد اشرف عمر عمر", "HBCO", "2026-08-19", 11.0, 9.5),
        ])
        self.assertEqual(len(doc["periods"]), 1)
        move = doc["periods"][0]["moves"][0]
        self.assertEqual((move["from"], move["to"], move["trades"]), (12.0, 9.5, 2))

    def test_filings_in_different_weeks_are_different_periods(self):
        doc = build([
            reading("1", "محمد اشرف عمر عمر", "HBCO", "2026-08-17", 12.0, 11.0),
            reading("2", "محمد اشرف عمر عمر", "HBCO", "2026-08-25", 11.0, 9.5),
        ])
        self.assertEqual([p["start"] for p in doc["periods"]],
                         ["2026-08-16", "2026-08-23"])

    def test_a_holder_is_labelled_a_person_or_a_firm(self):
        doc = build([
            reading("1", "الحصن للاستشارات", "UNIP", "2026-08-16", 3.01, 0.003),
            reading("2", "محمد اشرف عمر عمر", "HBCO", "2026-08-17", 12.0, 11.0),
        ])
        self.assertEqual({p["nameEn"]: p["kind"] for p in doc["people"]},
                         {"الحصن للاستشارات": "firm", "محمد اشرف عمر عمر": "person"})


class NeverShrinks(unittest.TestCase):
    """A thin store must not overwrite a fat file.

    The readings live outside git. A CI runner rebuilding from an empty store
    would otherwise replace every named holder on the map with the six forms
    it managed to read that morning, and report success doing it.
    """

    def _build_into(self, out, readings, force=False):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            store = root / "store.json"
            companies_file = root / "companies.json"
            store.write_text(json.dumps({"readings": {r["filingId"]: r for r in readings}}),
                             encoding="utf-8")
            companies_file.write_text(json.dumps({"companies": []}), encoding="utf-8")
            saved = (bip.STORE, bip.OUT, bip.FIXTURE, bip.COMPANIES)
            bip.STORE, bip.OUT, bip.COMPANIES = store, out, companies_file
            bip.FIXTURE = root / "missing" / "fixture.json"
            try:
                with contextlib.redirect_stdout(io.StringIO()) as said:
                    bip.main(["--force"] if force else [])
                return said.getvalue()
            finally:
                bip.STORE, bip.OUT, bip.FIXTURE, bip.COMPANIES = saved

    def _fat(self, out):
        self._build_into(out, [
            reading("1", "الحصن للاستشارات", "UNIP", "2026-08-16", 3.01, 0.003),
            reading("2", "محمد اشرف عمر عمر", "HBCO", "2026-08-17", 12.0, 11.0),
            reading("3", "وادي للاستشارات", "GGCC", "2026-09-01", 1.5, 0.84),
        ])

    def test_a_thinner_rebuild_leaves_the_published_file_alone(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = pathlib.Path(tmp) / "out.json"
            self._fat(out)
            self._build_into(out, [reading("9", "محمد اشرف عمر عمر", "HBCO",
                                           "2026-08-17", 12.0, 11.0)])
            kept = json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(kept["peopleCount"], 3)

    def test_it_says_why_it_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = pathlib.Path(tmp) / "out.json"
            self._fat(out)
            said = self._build_into(out, [reading("9", "محمد اشرف عمر عمر", "HBCO",
                                                  "2026-08-17", 12.0, 11.0)])
            self.assertIn("refusing to publish", said)

    def test_the_same_size_still_publishes(self):
        # Only a LOSS is refused. A rebuild that names the same holders with
        # corrected figures has to be able to land.
        with tempfile.TemporaryDirectory() as tmp:
            out = pathlib.Path(tmp) / "out.json"
            self._fat(out)
            self._build_into(out, [
                reading("1", "الحصن للاستشارات", "UNIP", "2026-08-16", 3.01, 0.5),
                reading("2", "محمد اشرف عمر عمر", "HBCO", "2026-08-17", 12.0, 11.0),
                reading("3", "وادي للاستشارات", "GGCC", "2026-09-01", 1.5, 0.84),
            ])
            after = json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual([p["percent"] for p in after["positions"]
                              if p["ticker"] == "UNIP"], [0.5])

    def test_force_publishes_the_loss_deliberately(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = pathlib.Path(tmp) / "out.json"
            self._fat(out)
            self._build_into(out, [reading("9", "محمد اشرف عمر عمر", "HBCO",
                                           "2026-08-17", 12.0, 11.0)], force=True)
            self.assertEqual(json.loads(out.read_text(encoding="utf-8"))["peopleCount"], 1)


class TheAudit(unittest.TestCase):
    """The published file is checked for the contradiction the merge prevents."""

    def test_a_company_owned_twice_over_is_reported(self):
        faults = audit_accuracy.audit_ownership({"positions": [
            {"holder": "one", "ticker": "HBCO", "percent": 47.261},
            {"holder": "two", "ticker": "HBCO", "percent": 45.39},
            {"holder": "three", "ticker": "HBCO", "percent": 10.728},
        ]})
        self.assertEqual([f["kind"] for f in faults], ["stake_over_100"])
        self.assertIn("103.38%", faults[0]["detail"])

    def test_a_company_that_adds_up_is_not_reported(self):
        self.assertEqual(audit_accuracy.audit_ownership({"positions": [
            {"holder": "one", "ticker": "HBCO", "percent": 45.39},
            {"holder": "three", "ticker": "HBCO", "percent": 10.728},
        ]}), [])

    def test_holdings_read_down_to_zero_do_not_count_against_the_company(self):
        self.assertEqual(audit_accuracy.audit_ownership({"positions": [
            {"holder": "one", "ticker": "HBCO", "percent": 99.0},
            {"holder": "gone", "ticker": "HBCO", "percent": 0.0},
        ]}), [])

    def test_the_published_file_holds_no_such_contradiction(self):
        published = json.loads(
            (pathlib.Path(bip.REPO) / "public" / "data" / "v1"
             / "insider-people.json").read_text(encoding="utf-8"))
        self.assertEqual(audit_accuracy.audit_ownership(published), [])


if __name__ == "__main__":
    unittest.main()
