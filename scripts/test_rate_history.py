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
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import rate_history as rh  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent


def rates() -> dict:
    return json.loads((REPO / "public" / "data" / "v1" / "rates" / "latest.json")
                      .read_text(encoding="utf-8"))


class IdsTest(unittest.TestCase):
    def test_every_series_id_names_a_row_the_site_publishes(self):
        doc = rates()
        known = {row.get("id") for key in ("indices", "world", "metals")
                 for row in doc.get(key) or []}
        for our_id, _instrument, _where, label in rh.INSTRUMENTS:
            self.assertIn(our_id, known,
                          f"{label}: no row in rates/latest.json is called {our_id}")

    def test_every_series_id_names_the_row_it_claims_to(self):
        doc = rates()
        label_of = {row.get("id"): row.get("label") for key in ("world", "metals")
                    for row in doc.get(key) or []}
        for our_id, _instrument, _where, label in rh.INSTRUMENTS:
            self.assertEqual(label_of.get(our_id), label)

    def test_the_published_history_joins_to_the_published_rates(self):
        path = REPO / "public" / "data" / "v1" / "rates" / "history.json"
        if not path.exists():
            self.skipTest("no history committed yet")
        doc = rates()
        known = {row.get("id") for key in ("indices", "world", "metals")
                 for row in doc.get(key) or []}
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


if __name__ == "__main__":
    unittest.main()
