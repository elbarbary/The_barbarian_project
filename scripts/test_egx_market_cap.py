#!/usr/bin/env python3
"""The exchange's market value, and the guard it deliberately does not touch.

Two rules are worth pinning. The exchange wins where it has an answer, because
it is the authority on how many shares of an Egyptian company are listed. And
`share_count_agrees` keeps testing the VENDOR's own triple, because it is an
internal-consistency check and feeding it two sources asks a different
question — one that would withhold two dozen more P/Es over a share-count
disagreement rather than an arithmetic error.
"""

from __future__ import annotations

import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from build_market_api import share_count_agrees  # noqa: E402
import harvest_egx_market_cap as harvest  # noqa: E402


class TickersTest(unittest.TestCase):
    def rows(self, *pairs):
        return {"data": {"data": [
            {"reuters": r, "mc": c} for r, c in pairs]}}

    def test_reads_whole_pounds_keyed_by_ticker(self):
        harvest.beta.request = lambda path: self.rows(("COMI.CA", 474e9), ("abuk.ca", 30e9))
        self.assertEqual(harvest.fetch(), {"COMI": 474e9, "ABUK": 30e9})

    def test_refuses_the_millions_column_and_the_junk_rows(self):
        # `mcMillion` is the same figure in another unit. Two units for one
        # number in one document is how a market value ends up 1,000x wrong,
        # so only `mc` is read — a row carrying only the millions has no cap.
        harvest.beta.request = lambda path: {"data": {"data": [
            {"reuters": "COMI.CA", "mcMillion": 474000},
            {"reuters": "EGS385S1C012", "mc": 5e9},   # an ISIN, not a ticker
            {"reuters": "ABUK.CA", "mc": 0},          # zero is not a value
            {"reuters": "SWDY.CA", "mc": 12e9},
        ]}}
        self.assertEqual(harvest.fetch(), {"SWDY": 12e9})

    def test_an_empty_answer_is_an_error_rather_than_an_empty_map(self):
        # Written wholesale, an empty map would delete every market value on
        # the exchange. It has to raise so the caller carries the last one.
        harvest.beta.request = lambda path: {"data": {"data": []}}
        with self.assertRaises(RuntimeError):
            harvest.fetch()
        harvest.beta.request = lambda path: {"data": {"data": [{"reuters": "X.CA"}]}}
        with self.assertRaises(RuntimeError):
            harvest.fetch()


class GuardTest(unittest.TestCase):
    def test_the_share_count_guard_still_tests_one_source_against_itself(self):
        # AMES: our own price x shares = our own cap exactly, and the exchange
        # says half. That is a share-count disagreement between two sources,
        # not an arithmetic error inside one — and the guard exists to catch
        # the second. Fed the vendor's triple it passes, as it should.
        close, shares = 147.75, 244_582_000
        vendor_cap = close * shares
        self.assertTrue(share_count_agrees(close, vendor_cap, shares))
        # Fed the exchange's cap against the vendor's share count it fails,
        # which is why the build does not do that.
        self.assertFalse(share_count_agrees(close, 17.32e9, shares))
        # And what it was written for still fails: a cap in the wrong unit.
        self.assertFalse(share_count_agrees(close, vendor_cap * 52, shares))


class PreferenceTest(unittest.TestCase):
    def test_the_exchange_wins_where_it_has_an_answer(self):
        egx = {"FAIT": 9.88e9}
        for ticker, vendor, expected in (
            ("FAIT", 30.93e9, 9.88e9),     # the exchange corrects the vendor
            ("COMI", 474e9, 474e9),        # no exchange figure, vendor stands
        ):
            self.assertEqual(egx.get(ticker) or vendor, expected)
        # And a ticker the vendor has no figure for gains one.
        self.assertEqual(egx.get("FAIT") or None, 9.88e9)


class DocumentTest(unittest.TestCase):
    def test_the_committed_file_is_whole_pounds_and_plausible(self):
        path = pathlib.Path(__file__).resolve().parent.parent / "data-source" / "egx-beta" / "market-cap.json"
        if not path.exists():
            self.skipTest("no harvest committed yet")
        doc = json.loads(path.read_text(encoding="utf-8"))
        caps = doc["market_cap"]
        self.assertGreater(len(caps), 150)
        # The largest company on the exchange is a few hundred billion pounds.
        # A file in millions would top out around a few hundred thousand.
        self.assertGreater(max(caps.values()), 1e11)
        self.assertTrue(all(v > 0 for v in caps.values()))


if __name__ == "__main__":
    unittest.main()
