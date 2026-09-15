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

import datetime
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


def published_table():
    """The table as last published, or None when it predates this builder.

    A publish that started from an older commit can rewrite the table after a
    builder change lands, and for the half hour until the next publish the
    artefact lags the code. A test that reads the artefact must say "stale"
    then, not "broken": the code under test is right and the file is simply
    from before it. `breadth` arrived with the same change that revived four
    empty columns and stripped the nulls, so its absence dates the file.
    """
    try:
        table = json.loads(bm.OUT.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return table if "breadth" in table else None


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


class SourceKeyTest(unittest.TestCase):
    """The keys this table reads must be keys the source documents have.

    `quiet_days` asked the signals document for `days`. The document calls it
    `silent_days`. So the column was declared, published, offered to readers
    to write rules against — and empty in all 283 rows, from the day it was
    written. Nothing crashed, because a missing measurement is a legitimate
    answer in this table; that is exactly what made it invisible.

    Coverage reporting did not catch it either: `quiet_days` is an event
    column, and event columns are excused from the thin-data warning because
    a streak break IS rare. Rare and impossible look the same in a count.

    So the test is on the key names themselves, against the real corpus.
    """

    @classmethod
    def setUpClass(cls):
        # Real signals documents, read through the REAL reader. An earlier
        # version of this test re-implemented the key lookups here, which
        # meant it checked the documents and not the code — reverting a key
        # in `own_signals` left it green.
        cls.tickers = [p.stem for p in sorted(bm.SIGNALS.glob("*.json"))][:400]
        cls.read = [bm.own_signals(t) for t in cls.tickers]

    def answered(self, column):
        return sum(1 for row in self.read if row.get(column) is not None)

    def test_the_signals_corpus_is_there_to_test_against(self):
        self.assertGreater(len(self.tickers), 100,
                           "no published signals documents to check keys against")

    def test_every_column_read_from_a_signal_can_be_answered_by_somebody(self):
        # A column no company on the exchange can answer is a key that does
        # not exist, not a rare event. Four were: `quiet_days` asked for
        # `days` where the document says `silent_days`, `streak_break_date`
        # for `date` where it says `filed`, and both results-due columns for
        # `from`/`to` where it says `window_start`/`window_end`. All four sat
        # in a published table, empty in all 283 rows, offered to readers to
        # write rules against.
        columns = set(bm.EVENT_COLUMNS) | {"results_due_from", "results_due_to"}
        for column in sorted(columns):
            with self.subTest(column=column):
                self.assertGreater(
                    self.answered(column), 0,
                    f"{column} reads a key no signals document has")

    def test_the_results_due_window_covers_most_of_the_market(self):
        # Not merely non-empty. This one is worth a floor because it is the
        # difference between "results due in the next fortnight" being a
        # question a reader can ask and one that silently answers nobody.
        self.assertGreater(self.answered("results_due_from"),
                           len(self.tickers) * 0.5)

    def test_the_build_refuses_a_column_nobody_can_answer(self):
        # The guard itself, exercised. Reverting any of the four key names
        # empties a column, and that must stop the build rather than publish
        # a measurement no reader can ever use.
        doc = {"rows": [{"ticker": "AAA"}, {"ticker": "BBB"}],
               "coverage": {"relative_volume_20": 2, "quiet_days": 0},
               "breadth": bm.breadth([{"ticker": "AAA"}, {"ticker": "BBB"}])}
        keep = bm.build
        bm.build = lambda: doc
        try:
            with self.assertRaises(SystemExit) as refused:
                bm.main(["--check"])
        finally:
            bm.build = keep
        self.assertIn("quiet_days", str(refused.exception))

    def test_a_column_that_is_merely_rare_still_builds(self):
        doc = {"rows": [{"ticker": "AAA"}, {"ticker": "BBB"}],
               "coverage": {"relative_volume_20": 2, "quiet_days": 1},
               "breadth": bm.breadth([{"ticker": "AAA"}, {"ticker": "BBB"}])}
        keep = bm.build
        bm.build = lambda: doc
        try:
            self.assertEqual(bm.main(["--check"]), 0)
        finally:
            bm.build = keep

    def test_the_published_table_answers_every_column_for_somebody(self):
        # The same claim from the other end: whatever the reader in this file
        # does, the table that shipped must not carry a column that is empty
        # for the entire market.
        table = published_table()
        if table is None:
            self.skipTest("the published table predates this builder — "
                          "the next publish rewrites it")
        empty = [name for name, count in (table.get("coverage") or {}).items()
                 if count == 0]
        self.assertEqual(empty, [],
                         f"published columns no company can answer: {empty}")


class NullTest(unittest.TestCase):
    """A column it could not answer leaves the row; it does not sit as null."""

    def test_a_column_with_no_value_leaves_the_row(self):
        row = {"ticker": "AAA", "close": 9.1, "net_income_growth": None,
               "revenue": 0}
        bm.drop_absent(row)
        self.assertNotIn("net_income_growth", row)
        # And nought stays, because nought is an answer.
        self.assertEqual(row["revenue"], 0)
        self.assertEqual(row["close"], 9.1)

    def test_no_published_row_carries_a_null(self):
        # Thirty-eight rows carried `net_income_growth: null`. The engine read
        # them correctly, so no reader got a wrong result — they got a wrong
        # explanation: the column was absent from `missing`, so the row
        # claimed a figure it did not have, and "why is this company not in my
        # results" pointed at a measurement that was never there.
        table = published_table()
        if table is None:
            self.skipTest("the published table predates this builder — "
                          "the next publish rewrites it")
        offenders = [(r.get("ticker"), name)
                     for r in table["rows"]
                     for name, value in r.items() if value is None]
        self.assertEqual(offenders[:5], [],
                         f"{len(offenders)} published cells are null")

    def test_a_null_is_reported_as_missing(self):
        table = published_table()
        if table is None:
            self.skipTest("the published table predates this builder")
        for row in table["rows"]:
            gaps = set(row.get("missing") or [])
            held = set(row) - {"missing"}
            self.assertEqual(gaps & held, set(),
                             f"{row.get('ticker')} lists a column it also holds")


class BreadthTest(unittest.TestCase):
    """The one figure Home leads with. It describes; it does not select."""

    def rows(self, *triples):
        return [{"ticker": t, "volume": v, "change_1": c} for t, v, c in triples]

    def test_a_company_that_found_no_buyer_is_not_a_company_that_held_steady(self):
        # The distinction the whole block exists for. Folding these together
        # reports a share nobody would buy as a share that was stable, and on
        # this exchange that is most of what a newcomer needs to understand.
        out = bm.breadth(self.rows(("AAA", 0, 0.0), ("BBB", 1000, 0.0)))
        self.assertEqual(out["idle"], 1)
        self.assertEqual(out["level"], 1)

    def test_every_listing_lands_in_exactly_one_state(self):
        out = bm.breadth(self.rows(
            ("A", 10, 1.5), ("B", 10, -2.0), ("C", 10, 0.0),
            ("D", 0, 0.0), ("E", None, 1.0), ("F", 10, None)))
        self.assertEqual(out["listed"], 6)
        self.assertEqual(out["rose"] + out["fell"] + out["level"]
                         + out["idle"] + out["unmeasured"], 6)
        self.assertEqual(out["traded"], 3)

    def test_a_missing_volume_is_a_gap_not_a_quiet_company(self):
        out = bm.breadth(self.rows(("AAA", None, -1.0)))
        self.assertEqual(out["unmeasured"], 1)
        self.assertEqual(out["idle"], 0)

    def test_a_traded_company_with_no_change_figure_is_not_counted_as_level(self):
        out = bm.breadth(self.rows(("AAA", 500, None)))
        self.assertEqual(out["level"], 0)
        self.assertEqual(out["unmeasured"], 1)

    def test_an_empty_market_is_zero_and_not_an_error(self):
        out = bm.breadth([])
        self.assertEqual(out["listed"], 0)
        self.assertEqual(out["traded"], 0)

    def test_the_published_breadth_accounts_for_the_whole_market(self):
        table = published_table()
        if table is None:
            self.skipTest("the published table predates this builder — "
                          "the next publish rewrites it")
        b = table.get("breadth")
        self.assertIsNotNone(b, "the published table carries no breadth block")
        self.assertEqual(
            b["rose"] + b["fell"] + b["level"] + b["idle"] + b["unmeasured"],
            b["listed"])
        self.assertEqual(b["listed"], len(table["rows"]))

    def test_breadth_names_no_company(self):
        # It is allowed to lead the page because it selects nothing. The day
        # it carries a ticker it has become a different kind of statement.
        out = bm.breadth(self.rows(("COMI", 10, 4.0), ("HRHO", 0, 0.0)))
        blob = json.dumps(out)
        self.assertNotIn("COMI", blob)
        self.assertNotIn("HRHO", blob)


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

    def test_the_table_the_builder_would_write_now_dates_every_row(self):
        # The same claim against a fresh build rather than the last publish.
        # Publish app data tests before it rebuilds, so the check above only
        # ever reads the PREVIOUS run's table: NBCC's undated row went out
        # through a green gate at 11:58 UTC on 15 September 2026 and then
        # failed every run after it, none of which could get as far as
        # rebuilding it. About a second over the real corpus.
        doc = bm.build()
        undated = [r["ticker"] for r in doc["rows"] if "as_of" not in r]
        self.assertEqual(undated, [], "rows dated by nothing")

    def test_a_listing_the_archive_holds_nothing_for_is_dated_by_its_session(self):
        # NBCC on 15 September 2026: listed, not yet traded, a close and a
        # volume in the market file and no archive at all.
        self.assertEqual(bm.bars_for("NOSUCH"), [])
        row = bm.row_for("NOSUCH", {"close": 5, "volume": 0}, {}, [],
                         datetime.date(2026, 9, 15), "2026-09-15")
        self.assertEqual(row["as_of"], "2026-09-15")
        self.assertEqual((row["close"], row["volume"]), (5, 0))
        self.assertNotIn("sessions_held", row)
        self.assertIn("sessions_held", row["missing"])
        self.assertNotIn("as_of", row["missing"])

    def test_the_archive_s_own_date_is_not_overwritten_by_the_market_s(self):
        # Only a row with no session of its own takes the market file's date;
        # a company the archive holds keeps the date of its newest bar.
        ticker = next(p.stem for p in sorted(bm.PRICES.glob("*.json"))
                      if bm.bars_for(p.stem))
        row = bm.row_for(ticker, {"close": 1, "volume": 1}, {}, [],
                         datetime.date(2099, 1, 1), "2099-01-01")
        self.assertEqual(row["as_of"], bm.ms.as_of(bm.bars_for(ticker)))

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


class TheDailyBuild(unittest.TestCase):
    """Where publish-app-data rebuilds this table, and why before its tests."""

    WORKFLOW = REPO / ".github" / "workflows" / "publish-app-data.yml"

    def test_the_table_is_rebuilt_before_the_tests_read_it(self):
        """The tests above read the table as the last commit left it, which
        only this job's rebuild replaces. Read as committed, one undated row
        failed every run before its rebuild on 15 Sep 2026 (34971269319,
        34990199243), and so did a listing publish-prices added to the market
        file before the table had it (34966943749)."""
        text = self.WORKFLOW.read_text(encoding="utf-8")
        rebuild = text.index("python3 scripts/build_measures.py")
        # The run before the rebuild. `python3 -m unittest discover` is now
        # the gate AFTER it, which any step before the rebuild would pass.
        self.assertLess(rebuild, text.index("python3 scripts/tests_before_rebuild.py"),
                        "the tests would hold an earlier commit's table again")
        self.assertLess(rebuild, text.index("name: Rebuild published data"))


if __name__ == "__main__":
    unittest.main()
