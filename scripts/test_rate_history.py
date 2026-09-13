#!/usr/bin/env python3
"""The series ids have to be the ones the site joins on.

Four of the seven were fetched, verified, published and then joined to
nothing, because the ids here were tidier versions of the document's own —
`NASDAQ` for `NASDAQ_IXIC`. Nothing failed: the file was correct, the site
drew no line, and the only symptom was an absence.
"""

from __future__ import annotations

import json
import pathlib
import sys
import tempfile
import unittest
import unittest.mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_rates_api as bra  # noqa: E402
import rate_history as rh  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent


def rates() -> dict:
    return json.loads((REPO / "public" / "data" / "v1" / "rates" / "latest.json")
                      .read_text(encoding="utf-8"))


def published_ids(doc) -> set:
    """Every id rates/latest.json offers a series to join on.

    The currency rows call it `code`, not `id` — a row for the dollar is
    `{"code": "USD", "label": "US dollar", "egp": 51.34}`. Collecting only
    `id` is the same joins-to-nothing trap this whole file exists for, one
    level up: the five pairs were fetched, verified and published, and this
    guard said they matched no row because it was looking at the wrong key.
    """
    out = {row.get("id") for key in ("indices", "world", "metals")
           for row in doc.get(key) or []}
    out |= {row.get("code") for row in doc.get("currencies") or []}
    out |= {row.get("id") for row in doc.get("egypt") or []}
    return out - {None}


def published_labels(doc) -> dict:
    by = {row.get("id"): row.get("label") for key in ("world", "metals")
          for row in doc.get(key) or []}
    by.update({row.get("code"): row.get("label")
               for row in doc.get("currencies") or []})
    by.update({row.get("id"): row.get("label") for row in doc.get("egypt") or []})
    return by


class IdsTest(unittest.TestCase):
    def test_every_series_id_names_a_row_the_site_publishes(self):
        doc = rates()
        known = published_ids(doc)
        for our_id, _instrument, _where, label in rh.INSTRUMENTS:
            self.assertIn(our_id, known,
                          f"{label}: no row in rates/latest.json is called {our_id}")

    def test_every_series_id_names_the_row_it_claims_to(self):
        doc = rates()
        label_of = published_labels(doc)
        for our_id, _instrument, _where, label in rh.INSTRUMENTS:
            self.assertEqual(label_of.get(our_id), label)

    def test_the_published_history_joins_to_the_published_rates(self):
        path = REPO / "public" / "data" / "v1" / "rates" / "history.json"
        if not path.exists():
            self.skipTest("no history committed yet")
        doc = rates()
        known = published_ids(doc)
        history = json.loads(path.read_text(encoding="utf-8"))
        self.assertTrue(history["series"])
        for series in history["series"]:
            self.assertIn(series["id"], known, f"{series['id']} joins to nothing")
            self.assertGreater(len(series["sessions"]), 30)


class ToleranceTest(unittest.TestCase):
    def test_a_wrong_instrument_is_refused_and_a_right_one_is_not(self):
        # The Tadawul candidates came back at 1,985 and 66,405 against a
        # published 11,238; the real instruments land within a percent.
        rh.ih.series = lambda _id, _since, _until: {"2026-08-28": 1985.03}
        with self.assertRaises(rh.Refused):
            rh.verified(39932, "Tadawul", 11237.93, "2026-08-01")
        rh.ih.series = lambda _id, _since, _until: {"2026-08-28": 4455.15}
        self.assertEqual(rh.verified(68, "Gold", 4456.40, "2026-08-01"),
                         {"2026-08-28": 4455.15})
        # And an empty answer is a refusal, not an empty series.
        rh.ih.series = lambda _id, _since, _until: {}
        with self.assertRaises(rh.Refused):
            rh.verified(40977, "Tadawul", 11237.93, "2026-08-01")


class WindowTest(unittest.TestCase):
    """Whether the published level is FOUND in the series, not whether it is
    the last bar of it.

    It used to be the last bar, which assumed the two sides were never a day
    apart. They are, in both directions — rates/latest.json carries no date for
    its world rows, and its levels are a previous close. Oil was refused on 31
    August at 86.39 against a published 83.40 with both figures right and three
    sessions apart.
    """

    def series(self, closes):
        rh.ih.INSTRUMENTS = {}
        rh.ih.series = lambda *a, **k: closes
        return closes

    def test_a_level_a_few_sessions_back_still_verifies(self):
        self.series({"2026-08-26": 83.40, "2026-08-27": 84.10,
                     "2026-08-28": 85.02, "2026-08-31": 86.39})
        rows = rh.verified(8849, "Oil", 83.40, "2026-08-01")
        self.assertEqual(len(rows), 4)

    def test_the_wrong_instrument_still_misses_every_session(self):
        # Tadawul's plausible candidates came back at 1,985 and 66,405 against
        # a published 11,238. A window five wide does not rescue those.
        self.series({f"2026-08-{d:02d}": 1985.0 + d for d in range(20, 32)})
        with self.assertRaises(rh.Refused) as caught:
            rh.verified(39932, "Tadawul", 11237.93, "2026-08-01")
        self.assertIn("nearest", str(caught.exception))

    def test_a_match_outside_the_window_does_not_count(self):
        # Far enough back and it is not evidence about this instrument any
        # more, it is a coincidence with an old price.
        closes = {f"2026-08-{d:02d}": 400.0 for d in range(1, 26)}
        closes["2026-08-10"] = 83.40
        closes.update({f"2026-08-{d:02d}": 400.0 for d in range(26, 32)})
        self.series(closes)
        with self.assertRaises(rh.Refused):
            rh.verified(8849, "Oil", 83.40, "2026-08-01")

    def test_an_empty_series_is_refused(self):
        self.series({})
        with self.assertRaises(rh.Refused):
            rh.verified(8849, "Oil", 83.40, "2026-08-01")


class EgyptsOwnRateTest(unittest.TestCase):
    """The row this file said for a long time it could not have.

    It could not while nothing published an Egyptian level to check a series
    against. `harvest_cbe.py` had been taking the central bank's own daily
    interbank page the whole time, and that is a genuinely different source
    from the histories here — which is the entire point of the check.

    These drive the reader against a made-up page rather than reading the
    published file, because a test that only reads the output cannot fail
    until something rebuilds it. The conversion was mutated to publish the
    fraction and every output-reading assertion still passed.
    """

    def build(self, interbank) -> list[dict]:
        with tempfile.TemporaryDirectory() as folder:
            page = pathlib.Path(folder) / "cbe-context.json"
            page.write_text(json.dumps({"interbank": interbank}), encoding="utf-8")
            with unittest.mock.patch.object(bra, "CBE_CONTEXT", page):
                return bra.egypt()

    def month(self, observations, year=2026) -> dict:
        return {"year": year,
                "rates": [{"tenor": "Overnight", "observations": observations}]}

    def test_a_rate_is_a_percent_and_not_a_fraction(self):
        # The CBE publishes 0.19433 and means 19.433%. Published as the
        # fraction it would be checked against a series quoting percent and
        # refused for being a hundred times out — or worse, matched against
        # some other instrument that happens to sit near 0.19.
        row, = self.build(self.month([{"date": "10/09", "value": 0.19433}]))
        self.assertAlmostEqual(row["percent"], 19.433, places=3)
        self.assertEqual(row["token"], "19.433%")

    def test_the_day_read_is_the_newest_the_bank_has_reached(self):
        rows = self.build(self.month([{"date": "08/09", "value": 0.19100},
                                      {"date": "09/09", "value": 0.19250},
                                      {"date": "10/09", "value": 0.19433}]))
        self.assertEqual(rows[0]["as_of"], "2026-09-10")
        # The source names the central bank, not the vendor the history comes
        # from. `verified()` checks the series against this level; if both
        # sides cited Investing.com it would be checking a number against
        # itself and passing every time.
        self.assertEqual(rows[0]["source"], "cbe.org.eg daily interbank rates, 2026-09-10")

    def test_a_day_the_bank_has_not_reached_is_not_a_zero(self):
        # The page prints the whole month and leaves the rest of it empty.
        # Reading the last cell rather than the last *value* publishes 0%,
        # which is a number a reader would believe.
        rows = self.build(self.month([{"date": "10/09", "value": 0.19433},
                                      {"date": "11/09", "value": None},
                                      {"date": "12/09", "value": None}]))
        self.assertEqual(rows[0]["as_of"], "2026-09-10")
        self.assertAlmostEqual(rows[0]["percent"], 19.433, places=3)

    def test_nothing_is_published_when_the_page_says_nothing(self):
        self.assertEqual(self.build(self.month([])), [])
        self.assertEqual(self.build({"year": 2026, "rates": []}), [])
        self.assertEqual(self.build(self.month([{"date": "10/09", "value": 0.19}],
                                               year=None)), [])

    def test_the_level_the_series_is_checked_against_is_the_bank_s_own(self):
        # One source asserting a number is not evidence; two agreeing is the
        # whole test. If this row ever cited the same vendor the history comes
        # from, `verified()` would be checking a number against itself.
        levels = rh.published()
        self.assertIn("Overnight interbank", levels)
        row = (rates().get("egypt") or [{}])[0]
        self.assertAlmostEqual(levels["Overnight interbank"], row["percent"], places=3)
        self.assertIn("cbe.org.eg", str(row.get("source")))
        self.assertNotIn("investing", str(row.get("source")).lower())


if __name__ == "__main__":
    unittest.main()
