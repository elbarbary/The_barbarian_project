#!/usr/bin/env python3
"""The table a reader's rulebook runs over, held to what it may contain.

This file is the shape gate. The words on the screen can be perfect and the
product still be a recommendation, because what makes it one is the shape of
what is published — and the shape that would do it here is a column. A
predicted return arriving as `expected_return`, a composite arriving as
`score`: a reader selecting on either does not make it less of a published
forecast about a named security.

So the checks below are about columns and cardinality, not about copy.
"""

from __future__ import annotations

import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_measures as bm  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
PUBLISHED = REPO / "public" / "data" / "v1" / "measures.json"


def published() -> dict | None:
    if not PUBLISHED.exists():
        return None
    return json.loads(PUBLISHED.read_text(encoding="utf-8"))


class ForecastGateTest(unittest.TestCase):
    """Nothing that predicts, scores or ranks may become a column."""

    def test_a_forecast_column_fails_the_build(self):
        for name in ("expected_return", "predicted_close", "price_target",
                     "opportunity_score", "rank", "upside_probability",
                     "model_conviction"):
            with self.subTest(column=name):
                bm.COLUMNS[name] = "a forecast that should never ship"
                try:
                    with self.assertRaises(SystemExit) as caught:
                        bm.no_forecasts([{"ticker": "AAA", name: 1.0}])
                    self.assertIn(name, str(caught.exception))
                finally:
                    bm.COLUMNS.pop(name, None)

    def test_an_undeclared_column_fails_the_build(self):
        # The route a forecast would actually take: added to the builder,
        # never written down. A column nobody described is a column nobody
        # reviewed.
        with self.assertRaises(SystemExit) as caught:
            bm.no_forecasts([{"ticker": "AAA", "quietly_added": 3}])
        self.assertIn("quietly_added", str(caught.exception))

    def test_the_expected_results_window_is_not_treated_as_a_forecast(self):
        # A window in which a company's own filing history says it will
        # REPORT is a statement about a disclosure date, not about a price.
        # A name check that cannot tell those apart would delete a column
        # build_signals.py already publishes with its reasoning.
        bm.no_forecasts([{"ticker": "AAA", "results_due_from": "2026-11-01",
                          "results_due_to": "2026-12-02"}])

    def test_every_declared_column_survives_its_own_gate(self):
        # The gate must pass the table it is shipped with, or the first
        # honest column added will look like a forecast and be removed.
        bm.no_forecasts([{name: None for name in bm.COLUMNS}])


class NoCompositeTest(unittest.TestCase):
    def test_no_column_assembles_the_components_into_a_judgment(self):
        # The playbook's points table adds a disclosure's freshness to a
        # volume ratio to an ownership event and calls the total an
        # opportunity. That assembly is the reader's to make, or nobody's.
        # Components only.
        assembled = [n for n in bm.COLUMNS
                     if any(word in n.lower() for word in
                            ("total", "composite", "overall", "points", "grade"))]
        self.assertEqual(assembled, [])

    def test_the_document_says_what_it_is_in_both_languages(self):
        doc = published()
        if not doc:
            self.skipTest("no measures.json built yet")
        for key in ("basis", "basis_ar"):
            self.assertIn(key, doc)
            self.assertGreater(len(doc[key]), 80, key)
        self.assertIn("forecast", doc["basis"])
        self.assertIn("publisher", doc["basis"])


class CardinalityTest(unittest.TestCase):
    """The publisher publishes everything, and chooses nothing."""

    def test_the_table_holds_every_listed_company(self):
        doc = published()
        if not doc:
            self.skipTest("no measures.json built yet")
        market = json.loads((REPO / "public" / "data" / "v1" / "market.json")
                            .read_text(encoding="utf-8"))
        listed = set(market.get("stocks") or {})
        rows = {r["ticker"] for r in doc["rows"]}
        self.assertEqual(rows, listed,
                         "the table is not the whole market — something cut it")
        self.assertEqual(doc["companies"], len(doc["rows"]))

    def test_the_rows_are_in_no_order_that_means_anything(self):
        # Alphabetical. Any other order is the publisher saying which company
        # to read first, which is the whole thing this table exists to avoid
        # — and a reader's own rule can sort it however they like afterwards.
        doc = published()
        if not doc:
            self.skipTest("no measures.json built yet")
        tickers = [r["ticker"] for r in doc["rows"]]
        self.assertEqual(tickers, sorted(tickers))

    def test_coverage_is_published_so_a_rule_can_be_judged(self):
        # A rule written against a column two thirds of the market cannot
        # answer is a rule about data availability wearing the costume of a
        # rule about companies. The reader has to be able to see which.
        doc = published()
        if not doc:
            self.skipTest("no measures.json built yet")
        cover = doc["coverage"]
        total = len(doc["rows"])
        for name in ("relative_volume_20", "revenue", "market_cap"):
            self.assertIn(name, cover)
            self.assertLessEqual(cover[name], total)
        # And the counts are real, not copied from a previous run.
        for name, count in cover.items():
            self.assertEqual(count, sum(1 for r in doc["rows"] if name in r), name)


class AbsenceTest(unittest.TestCase):
    def test_a_row_names_what_it_could_not_answer(self):
        doc = published()
        if not doc:
            self.skipTest("no measures.json built yet")
        for row in doc["rows"]:
            gaps = set(row["missing"])
            self.assertEqual(gaps & set(row), set(),
                             f"{row['ticker']} lists a column it actually has")
            self.assertEqual(gaps | set(row), set(bm.COLUMNS),
                             f"{row['ticker']} accounts for the wrong column set")

    def test_an_absent_measurement_is_absent_rather_than_zero(self):
        # The four companies with a twenty-session median volume of nought
        # must have no relative volume at all, not a relative volume of 0 and
        # not a large number. Either would sort them to an end of any list a
        # reader orders by unusual volume.
        doc = published()
        if not doc:
            self.skipTest("no measures.json built yet")
        for row in doc["rows"]:
            if row.get("median_volume_20") == 0:
                self.assertNotIn("relative_volume_20", row, row["ticker"])

    def test_no_sentinel_stands_in_for_a_missing_number(self):
        # A magic number survives one refactor and then somebody sorts by it.
        #
        # Checked by column rather than blanket, because -1 is a sentinel in a
        # count and an ordinary Tuesday in a percentage: HRHO really did fall
        # 1.00% and a blanket rule called it a sentinel.
        doc = published()
        if not doc:
            self.skipTest("no measures.json built yet")
        never_negative = ("volume", "traded_value", "median_volume_20",
                          "median_traded_value_20", "relative_volume_20",
                          "big_move_5", "sessions_held", "filings_30d",
                          "sessions_since_filing", "market_cap", "close",
                          "first_in_years_gap_days", "quiet_days")
        for row in doc["rows"]:
            for name, value in row.items():
                if name == "missing":
                    continue
                if isinstance(value, str):
                    self.assertNotIn(value.strip().lower(), ("n/a", "na", "-", "none", ""),
                                     f"{row['ticker']}.{name} is a placeholder string")
                if name in never_negative and isinstance(value, (int, float)):
                    self.assertGreaterEqual(value, 0,
                                            f"{row['ticker']}.{name} is negative")


class ProvenanceTest(unittest.TestCase):
    def test_every_row_dates_itself_to_its_own_newest_session(self):
        # The archive is not uniformly fresh. A market-wide date would
        # compare one company's Thursday with another's Wednesday and nothing
        # on the row would say so.
        doc = published()
        if not doc:
            self.skipTest("no measures.json built yet")
        stamps = {r["as_of"] for r in doc["rows"] if "as_of" in r}
        self.assertTrue(stamps)
        for row in doc["rows"]:
            self.assertIn("as_of", row, f"{row['ticker']} is dated by nothing")

    def test_a_filing_column_carries_the_filing_it_came_from(self):
        # "Filed two sessions ago" is a claim until the reader can open the
        # document that says so.
        doc = published()
        if not doc:
            self.skipTest("no measures.json built yet")
        for row in doc["rows"]:
            if "sessions_since_filing" in row:
                self.assertIn("last_filing_id", row, row["ticker"])
                self.assertIn("last_filing_date", row, row["ticker"])

    def test_a_ratio_carries_its_denominator(self):
        doc = published()
        if not doc:
            self.skipTest("no measures.json built yet")
        for row in doc["rows"]:
            if "relative_volume_20" in row:
                self.assertIn("median_volume_20", row, row["ticker"])
                self.assertGreater(row["median_volume_20"], 0, row["ticker"])


if __name__ == "__main__":
    unittest.main()
