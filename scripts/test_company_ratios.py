#!/usr/bin/env python3
"""The ratios the market table filters on, and everything they must not be.

This step publishes six numbers per company that a reader will screen on —
"under book", "return on equity above 20%", "cash conversion below one" — so
every test here is about a wrong answer being indistinguishable from a right
one on a filtered list. A rescaled yield, a zero standing in for a company
that published nothing, a column half in percent: none of those look broken.
They just quietly return the wrong companies.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import json
import pathlib
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import apply_company_ratios as ratios


def review(**metrics) -> dict:
    """A review document stating `key=(value, unit)` for each metric given."""
    return {"ticker": "TEST",
            "metrics": [{"key": key, "value": value, "unit": unit,
                         "direction": "flat", "points": 3, "series": []}
                        for key, (value, unit) in metrics.items()]}


class WhatIsCarried(unittest.TestCase):
    def test_the_value_is_the_document_s_own(self):
        """Not rounded, not rescaled, not converted.

        `build_review` already rounds — four decimals, three for the yield —
        so a second rounding here would make the company screen and the market
        table disagree about the same company in the fourth decimal, and a
        rescale would leave a percentage in a file labelled `ratio`.
        """
        found = ratios.stated(review(pb=(2.0204, "ratio"),
                                     dividend_yield=(4.32, "percent")))
        self.assertEqual(found["pb"], (2.0204, "ratio"))
        self.assertEqual(found["dividend_yield"], (4.32, "percent"))

    def test_a_negative_ratio_is_a_real_answer(self):
        """32 published returns on equity are negative and 66 cash conversions.

        A company whose cash did not follow its profit is precisely what a
        cash-conversion filter is for; dropping the negatives would hide the
        only rows worth looking at.
        """
        found = ratios.stated(review(roe=(-2.6251, "ratio"),
                                     cash_conversion=(-8.5377, "ratio")))
        self.assertEqual(found["roe"][0], -2.6251)
        self.assertEqual(found["cash_conversion"][0], -8.5377)

    def test_the_row_s_own_fields_are_never_republished(self):
        """`pe` is on the row already, off a different price.

        The review sheet prices each year at that year's close (COMI 4.2637 at
        31 December 2025) and the row prices the same filing today (5.8). Both
        are right; two of them on one row is not.
        """
        self.assertNotIn("pe", ratios.RATIOS)
        self.assertEqual(set(ratios.RATIOS) & set(ratios.ROW_FIELDS), set())
        found = ratios.stated(review(pe=(4.2637, "ratio"), pb=(2.0204, "ratio")))
        self.assertEqual(list(found), ["pb"])

    def test_a_metric_the_document_does_not_carry_is_simply_missing(self):
        """Absent, never null and never zero.

        `null` sorts somewhere in a filter, so "roe under 5%" would return the
        226 companies that published one plus the 58 that did not; and zero
        lands in the middle of the real distribution, which runs from −2.63.
        """
        found = ratios.stated(review(pb=(2.0204, "ratio")))
        self.assertEqual(list(found), ["pb"])
        self.assertNotIn("roe", found)

    def test_a_stated_null_is_not_a_ratio(self):
        self.assertEqual(ratios.stated(review(roe=(None, "ratio"))), {})

    def test_a_figure_no_browser_could_parse_is_refused(self):
        """`json.loads` accepts bare NaN and `json.dumps` writes it back.

        One of those in `companies.json` is a file every browser's JSON.parse
        rejects — the whole market screen, not one column of it.
        """
        self.assertEqual(ratios.stated(review(roa=(float("nan"), "ratio"))), {})
        self.assertEqual(ratios.stated(review(roa=(float("inf"), "ratio"))), {})

    def test_a_word_or_a_flag_is_not_a_ratio(self):
        self.assertEqual(ratios.stated(review(pb=("cheap", "ratio"))), {})
        self.assertEqual(ratios.stated(review(pb=(True, "ratio"))), {})

    def test_a_metric_with_no_unit_cannot_be_labelled_so_is_not_carried(self):
        self.assertEqual(ratios.stated(review(pb=(2.0204, ""))), {})


class OneUnitPerColumn(unittest.TestCase):
    """A column is one unit or it is not a column.

    `dividend_yield` is a percent (4.32 means 4.32%) and the other five are
    bare ratios (roe 0.3612 means 36.12%). Publishing one label over both
    conventions mislabels half the column by a factor of a hundred.
    """

    def documents(self, docs: dict) -> tuple:
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            for ticker, doc in docs.items():
                (root / f"{ticker}.json").write_text(json.dumps(doc),
                                                     encoding="utf-8")
            with mock.patch.object(ratios, "REVIEW", root):
                return ratios.published()

    def test_the_unit_is_read_off_the_documents_not_hardcoded(self):
        held, units, disputed = self.documents({
            "AAA": review(pb=(2.0204, "ratio"), dividend_yield=(4.32, "percent")),
        })
        self.assertEqual(units, {"pb": "ratio", "dividend_yield": "percent"})
        self.assertEqual(disputed, {})
        self.assertEqual(held["AAA"], {"pb": 2.0204, "dividend_yield": 4.32})

    def test_two_units_for_one_key_refuses_the_key_on_every_row(self):
        """Including the rows that agreed.

        Picking the majority's label publishes the minority's numbers under
        it, which is a mislabelled figure against a real ticker — the thing
        this repository is least allowed to do. No label, no column.
        """
        held, units, disputed = self.documents({
            "AAA": review(roe=(0.3612, "ratio")),
            "BBB": review(roe=(36.12, "percent")),
            "CCC": review(roe=(0.1, "ratio"), pb=(2.0, "ratio")),
        })
        self.assertNotIn("roe", units)
        self.assertEqual(sorted(disputed["roe"]), ["percent", "ratio"])
        self.assertNotIn("AAA", held)
        self.assertEqual(held["CCC"], {"pb": 2.0})

    def test_a_document_with_none_of_the_six_contributes_nothing(self):
        """16 of the 259 published documents are like this."""
        held, units, _ = self.documents({
            "AAA": review(profit=(55196.394, "egp_m"), assets=(1.0, "egp_m")),
        })
        self.assertEqual(held, {})
        self.assertEqual(units, {})


class TheDocument(unittest.TestCase):
    def test_the_units_sit_above_the_rows_and_the_order_is_fixed(self):
        """Written once at the top, and the same bytes on a second run.

        CI commits whatever changed, so a step that reorders its own keys
        commits the whole file every build.
        """
        made = ratios.relabel({"updated_at": "x", "companies": [1, 2]},
                              {"roe": "ratio", "pb": "ratio"})
        self.assertEqual(list(made), ["updated_at", "ratio_units", "companies"])
        self.assertEqual(list(made["ratio_units"]), ["pb", "roe"])
        self.assertEqual(ratios.relabel(made, {"roe": "ratio", "pb": "ratio"}),
                         made)

    def test_no_units_means_no_label_left_behind(self):
        made = ratios.relabel({"companies": [], "ratio_units": {"pb": "ratio"}}, {})
        self.assertNotIn("ratio_units", made)


class Rerunning(unittest.TestCase):
    """What the second run does, which is where the build actually lives.

    `build_market_api` recreates these rows from scratch — but only where the
    daily scan exists, which is not CI, so in CI this step reads back its own
    previous output and has to be able to correct it.
    """

    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        root = pathlib.Path(self.folder.name)
        self.directory = root / "companies.json"
        self.fixture = root / "fixture.json"
        self.review = root / "review"
        self.review.mkdir()
        self.write({"updated_at": "2026-09-03",
                    "companies": [{"ticker": "AAA", "pe": 5.8},
                                  {"ticker": "BBB", "pe": 9.1}]})
        self.patch = mock.patch.multiple(ratios, DIRECTORY=self.directory,
                                         FIXTURE=self.fixture, REVIEW=self.review)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def write(self, doc):
        body = json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n"
        self.directory.write_text(body, encoding="utf-8")
        self.fixture.write_text(body, encoding="utf-8")

    def rows(self):
        return {r["ticker"]: r for r in
                json.loads(self.directory.read_text())["companies"]}

    def test_a_company_that_leaves_the_review_sheet_loses_its_ratios(self):
        """`build_review` deletes the document of a company it drops.

        A row that kept last run's price-to-book after the sheet stopped
        publishing one would be a figure with nothing behind it, sitting in a
        filter that cannot tell it from a current one.
        """
        (self.review / "AAA.json").write_text(json.dumps(review(pb=(2.0, "ratio"))))
        ratios.apply()
        self.assertEqual(self.rows()["AAA"]["ratios"], {"pb": 2.0})

        (self.review / "AAA.json").unlink()
        (self.review / "BBB.json").write_text(json.dumps(review(roe=(0.3, "ratio"))))
        ratios.apply()
        self.assertNotIn("ratios", self.rows()["AAA"])
        self.assertEqual(self.rows()["BBB"]["ratios"], {"roe": 0.3})
        self.assertEqual(json.loads(self.directory.read_text())["ratio_units"],
                         {"roe": "ratio"})

    def test_the_row_s_own_figures_are_left_where_they_are(self):
        (self.review / "AAA.json").write_text(json.dumps(review(pb=(2.0, "ratio"))))
        ratios.apply()
        self.assertEqual(self.rows()["AAA"]["pe"], 5.8)

    def test_two_runs_over_the_same_inputs_write_the_same_bytes(self):
        """CI commits whatever changed; a step that churns commits every build."""
        (self.review / "AAA.json").write_text(json.dumps(review(pb=(2.0, "ratio"))))
        ratios.apply()
        once = self.directory.read_bytes()
        ratios.apply()
        self.assertEqual(self.directory.read_bytes(), once)
        self.assertEqual(self.fixture.read_bytes(), once)

    def test_no_review_documents_leaves_the_published_directory_alone(self):
        """A checkout without the sheet must not strip a column off 243 rows."""
        (self.review / "AAA.json").write_text(json.dumps(review(pb=(2.0, "ratio"))))
        ratios.apply()
        published = self.directory.read_bytes()
        (self.review / "AAA.json").unlink()
        with mock.patch.object(ratios, "REVIEW", self.review / "gone"):
            ratios.apply()
        self.assertEqual(self.directory.read_bytes(), published)


class Published(unittest.TestCase):
    """The file as it stands on this machine."""

    def rows(self) -> list:
        return (ratios.load(ratios.DIRECTORY).get("companies") or [])

    def test_every_published_ratio_matches_its_review_document(self):
        rows = [r for r in self.rows() if r.get("ratios")]
        if not rows:
            self.skipTest("no ratios published on this machine")
        wrong = []
        for row in rows:
            doc = ratios.load(ratios.REVIEW / f"{row['ticker']}.json")
            stated = {k: v for k, (v, _) in ratios.stated(doc).items()}
            for key, value in row["ratios"].items():
                if stated.get(key) != value:
                    wrong.append((row["ticker"], key, value, stated.get(key)))
        self.assertEqual(wrong[:5], [], f"{len(wrong)} rows restate a ratio")

    def test_nothing_published_is_null_zero_or_off_the_list(self):
        rows = [r for r in self.rows() if r.get("ratios")]
        if not rows:
            self.skipTest("no ratios published on this machine")
        for row in rows:
            for key, value in row["ratios"].items():
                self.assertIn(key, ratios.RATIOS, row["ticker"])
                self.assertIsInstance(value, (int, float), f"{row['ticker']}.{key}")
                self.assertNotEqual(value, 0, f"{row['ticker']}.{key}")

    def test_every_ratio_on_a_row_has_a_unit_on_the_document(self):
        """The label is what makes 4.32 and 0.3612 readable as the same idea."""
        directory = ratios.load(ratios.DIRECTORY)
        rows = [r for r in (directory.get("companies") or []) if r.get("ratios")]
        if not rows:
            self.skipTest("no ratios published on this machine")
        units = directory.get("ratio_units") or {}
        for row in rows:
            for key in row["ratios"]:
                self.assertIn(key, units, f"{row['ticker']}.{key} has no unit")

    def test_checking_writes_nothing(self):
        if not ratios.DIRECTORY.exists():
            self.skipTest("no published directory on this machine")
        before = ratios.DIRECTORY.read_bytes()
        fixture = ratios.FIXTURE.read_bytes() if ratios.FIXTURE.exists() else None
        ratios.apply(write=False)
        self.assertEqual(ratios.DIRECTORY.read_bytes(), before)
        if fixture is not None:
            self.assertEqual(ratios.FIXTURE.read_bytes(), fixture)


if __name__ == "__main__":
    unittest.main()
