#!/usr/bin/env python3
"""The one guard that a confident wrong answer cannot walk through.

A model asked which outside factors a company is exposed to will answer, and
will sound certain. The only cheap check on it is to demand the sentence from
the source that establishes the claim, and then look for that sentence IN the
source. A model that cannot quote the text has not read it.
"""

from __future__ import annotations

import unittest

import build_exposures as exposures

STORY = ("Abou Kir Fertilizers exports roughly 40% of its output to Europe and "
         "buys natural gas from the state at a regulated price. The company is "
         "listed on the EGX.")


class Grounding(unittest.TestCase):
    def test_a_sentence_really_in_the_source_is_kept(self):
        self.assertTrue(exposures.grounded(
            "exports roughly 40% of its output to Europe", STORY))

    def test_a_paraphrase_is_not_evidence(self):
        # The failure this exists to catch: true-sounding, unquotable.
        self.assertFalse(exposures.grounded(
            "the company exports around 40 percent of production to Europe", STORY))

    def test_an_invented_sentence_is_not_evidence(self):
        self.assertFalse(exposures.grounded(
            "The company hedges its currency exposure with forward contracts.", STORY))

    def test_reflowed_whitespace_and_curly_quotes_still_count(self):
        # A model that rewraps a line or straightens an apostrophe has still
        # quoted the source; one that changes a word has not.
        self.assertTrue(exposures.grounded(
            "buys natural   gas from the state\nat a regulated price", STORY))

    def test_a_fragment_is_not_a_sentence(self):
        self.assertFalse(exposures.grounded("gas", STORY))
        self.assertFalse(exposures.grounded("to Europe", STORY))

    def test_an_ungrounded_claim_is_dropped_with_its_reason(self):
        kept, dropped = exposures.vet({"exposures": [
            {"factor": "foreign_demand", "evidence": "exports roughly 40% of its output to Europe"},
            {"factor": "currency", "evidence": "The company hedges with forwards."},
        ]}, STORY)
        self.assertEqual([k["factor"] for k in kept], ["foreign_demand"])
        self.assertEqual(len(dropped), 1)
        self.assertIn("not in the description", dropped[0]["why"])

    def test_a_factor_outside_the_vocabulary_is_dropped(self):
        # An open vocabulary produces a different word for the same thing on
        # every company, and nothing joins.
        kept, dropped = exposures.vet({"exposures": [
            {"factor": "geopolitics", "evidence": "exports roughly 40% of its output to Europe"},
        ]}, STORY)
        self.assertEqual(kept, [])
        self.assertIn("five factors", dropped[0]["why"])

    def test_a_reader_that_answered_nothing_is_not_read_as_no_exposure(self):
        kept, dropped = exposures.vet(None, STORY)
        self.assertEqual(kept, [])
        self.assertTrue(dropped)

    def test_rates_is_never_asked_of_the_model(self):
        # Borrowings come off the filed balance sheet, which states it better
        # than any description could.
        self.assertNotIn("rates", exposures.FACTORS)
