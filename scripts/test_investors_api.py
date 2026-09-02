#!/usr/bin/env python3
"""The investor split carries the exchange's own date, not only ours."""
from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_investors_api as B


def payload(**stamp):
    row = {"clientType": "Egyptians", "clientTypeA": "مصريين", "buyPerc": 81.25,
           "sellPerc": 64.21, "totalPerc": 72.73, "buyValue": 11616176491.4,
           "sellValue": 9179636121.97, "netValue": 2436540369.43}
    party = {"nationalityEnglish": "Egyptians", "nationality": "مصريين",
             "buyValue": 1.0, "sellValue": 2.0, "netValue": -1.0}
    data = {"investorsType": [row], "individiualInvestorsByNationality": [party],
            "institutionInvestorsByNationality": [party]}
    if stamp:
        data["invsetorsStatistics"] = stamp
    return {"data": data}


class Stamp(unittest.TestCase):
    def test_the_exchanges_date_and_window_total_are_carried(self):
        doc = B.build(payload(tradeDate="2026-09-02T11:39:41", totalValue=14296755539.5593))
        self.assertEqual(doc["as_of"], "2026-09-02T11:39:41")
        self.assertEqual(doc["total_value"], 14296755539.5593)
        # Ours is still there, and is not the same thing.
        self.assertTrue(doc["updated_at"].endswith("Z"))

    def test_no_stamp_is_no_date_rather_than_ours(self):
        """A missing exchange date must not be filled with the fetch time."""
        doc = B.build(payload())
        self.assertIsNone(doc["as_of"])
        self.assertIsNone(doc["total_value"])

    def test_a_non_numeric_total_is_absent(self):
        doc = B.build(payload(tradeDate="2026-09-02T11:39:41", totalValue="n/a"))
        self.assertIsNone(doc["total_value"])

    def test_the_combined_row_is_still_flagged(self):
        p = payload(tradeDate="2026-09-02T11:39:41", totalValue=1.0)
        p["data"]["investorsType"].append({**p["data"]["investorsType"][0],
                                           "clientType": B.COMBINED})
        doc = B.build(p)
        self.assertEqual([r["combined"] for r in doc["by_nationality"]], [False, True])


if __name__ == "__main__":
    unittest.main()
