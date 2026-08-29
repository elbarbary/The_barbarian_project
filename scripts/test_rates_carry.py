#!/usr/bin/env python3
"""A source having a bad minute must not delete a published figure.

On 29 August 2026 `api.gold-api.com` failed to resolve for one build:

    ! api.gold-api.com: <urlopen error [Errno -2] Name or service not known>

`metals()` skips a metal it cannot fetch and `main()` wrote the list wholesale,
so gold and its karat breakdown left the Exchange screen entirely — and would
have stayed gone until a fetch happened to succeed, with nothing saying the
figure had been there. The published document went from two metals to one and
the only thing that noticed was a website test.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""
from __future__ import annotations

import unittest

import build_rates_api as rates


GOLD = {"id": "XAU", "label": "Gold", "egp_gram": 7200.02,
        "karats": [{"karat": 21}], "source": "api.gold-api.com, 2026-08-29T14:12:03Z"}
SILVER = {"id": "XAG", "label": "Silver", "egp_gram": 107.45,
          "source": "api.gold-api.com, 2026-08-29T14:12:02Z"}


class CarryForwardTest(unittest.TestCase):
    def test_a_metal_the_host_would_not_answer_for_is_kept(self):
        kept = rates.carry_forward([SILVER], [GOLD, SILVER], "metals")
        labels = [row["label"] for row in kept]
        self.assertIn("Gold", labels, "gold was deleted rather than carried")
        self.assertIn("Silver", labels)

    def test_a_carried_row_says_it_is_carried(self):
        [carried] = [r for r in rates.carry_forward([], [GOLD], "metals")
                     if r["label"] == "Gold"]
        self.assertTrue(carried["carried"])
        # And it still dates itself: the source it was read from is untouched,
        # so the stamp ages in public rather than being refreshed silently.
        self.assertEqual(carried["source"], GOLD["source"])
        self.assertEqual(carried["egp_gram"], GOLD["egp_gram"])

    def test_a_fresh_row_is_not_marked_carried(self):
        kept = rates.carry_forward([GOLD, SILVER], [GOLD, SILVER], "metals")
        self.assertEqual(len(kept), 2)
        for row in kept:
            self.assertNotIn("carried", row, f"{row['label']} was marked stale while fresh")

    def test_the_previous_row_is_not_mutated(self):
        before = [dict(GOLD)]
        rates.carry_forward([], before, "metals")
        self.assertNotIn("carried", before[0])

    def test_nothing_published_before_carries_nothing(self):
        self.assertEqual(rates.carry_forward([SILVER], [], "metals"), [SILVER])

    def test_the_same_guard_covers_the_pound(self):
        # open.er-api.com is the same shape of third party, and if it fails
        # `metals()` cannot run either — so both lists degrade together.
        usd = {"label": "US dollar", "source": "open.er-api.com, 2026-08-29"}
        kept = rates.carry_forward([], [usd], "the pound")
        self.assertEqual(kept[0]["label"], "US dollar")
        self.assertTrue(kept[0]["carried"])


class PublishedTest(unittest.TestCase):
    def test_the_published_document_still_has_both_metals(self):
        doc = rates.published()
        if not doc:
            self.skipTest("nothing published yet")
        labels = {row.get("label") for row in doc.get("metals") or []}
        self.assertIn("Gold", labels,
                      "gold is missing from the published rates — the Exchange "
                      "screen has lost its karat breakdown")
        self.assertIn("Silver", labels)


if __name__ == "__main__":
    unittest.main()
