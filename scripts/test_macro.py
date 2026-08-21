#!/usr/bin/env python3
"""The macro glossary, and the guard that stands between a model and a reader.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import macro_insight  # noqa: E402
import macro_types as glossary  # noqa: E402


class GlossaryTest(unittest.TestCase):
    """§8 — every line here describes a mechanism and none recommends a trade."""

    def test_every_entry_is_complete_in_both_languages(self):
        # An Arabic reader meeting an English explanation is the failure this
        # app was built to avoid, and a half-filled entry is how it happens.
        for key, parts in glossary.MACRO_TYPES.items():
            self.assertEqual(len(parts), 6, key)
            for i, part in enumerate(parts):
                self.assertTrue(part.strip(), f"{key} part {i} is empty")

    def test_the_arabic_is_actually_arabic(self):
        import re

        arabic = re.compile(r"[؀-ۿ]")
        for key in glossary.MACRO_TYPES:
            for text in (glossary.label_ar(key), glossary.meaning_ar(key),
                         glossary.chain_ar(key)):
                self.assertTrue(arabic.search(text), f"{key}: not Arabic")

    def test_no_entry_instructs_the_reader(self):
        """The whole licence position rests on this.

        Checked for the *shape* of an instruction, not for a verb. "Egypt buys
        more oil than it sells" is a fact about a trade balance; "buy oil
        companies" is advice. Running the blunt model-guard over hand-written
        prose only makes the prose worse — it rewrote three clear sentences
        into worse ones before that became obvious.
        """
        for key in glossary.MACRO_TYPES:
            for field, text in (
                ("meaning", glossary.meaning(key)),
                ("chain", glossary.chain(key)),
                ("meaning_ar", glossary.meaning_ar(key)),
                ("chain_ar", glossary.chain_ar(key)),
            ):
                found = glossary.directive(text)
                self.assertIsNone(
                    found, f"{key}.{field} instructs the reader: {found!r}"
                )

    def test_the_directive_check_catches_real_advice(self):
        for advice in (
            "Investors should buy exporters.",
            "Sell industrials into this move.",
            "Industrials look cheap at this level.",
            "This is an opportunity to rotate into banks.",
            "We recommend adding energy names.",
        ):
            self.assertIsNotNone(
                glossary.directive(advice), f"let through: {advice!r}"
            )

    def test_the_directive_check_allows_plain_description(self):
        for fine in (
            "Egypt buys more oil than it sells.",
            "Listed companies sell into this economy.",
            "Money brought into Egypt to build or buy something real.",
            "Importers pay more for dollars when they are scarcer.",
        ):
            self.assertIsNone(
                glossary.directive(fine), f"wrongly refused: {fine!r}"
            )


class GuardTest(unittest.TestCase):
    """What happens when the model reaches for advice, which it will."""

    def test_a_plain_mechanism_is_accepted(self):
        self.assertIsNone(macro_insight.acceptable(
            "Fewer ships means fewer dollars in canal dues, which makes "
            "imported raw materials costlier for listed manufacturers."
        ))

    def test_a_recommendation_is_refused(self):
        for advice in (
            "Industrials look cheap at this level.",
            "Investors should buy exporters while the pound is weak.",
            "This is an opportunity to avoid energy-heavy names.",
            "Sell industrials into this move.",
        ):
            self.assertIsNotNone(
                macro_insight.acceptable(advice),
                f"the guard let this through: {advice!r}",
            )

    def test_a_wall_of_text_is_refused(self):
        # Asked for one sentence, answering with an essay means it is not
        # answering the question — and the rest of the essay is unreviewed.
        self.assertIsNotNone(macro_insight.acceptable("word " * 60))

    def test_an_empty_reply_is_refused(self):
        self.assertIsNotNone(macro_insight.acceptable(""))

    def test_a_reading_with_no_draft_falls_back_to_the_glossary(self):
        # The model is unavailable more often than not — no credits today — and
        # the app must be exactly as good as the hand-written glossary when it
        # is, rather than empty.
        doc = {
            "series": [
                {
                    "id": "suez", "as_of": "2026-08-16", "latest": 41,
                    "unit": "vessels", "chain": glossary.chain("suez"),
                    "label": glossary.label("suez"),
                }
            ],
            "correlations": [],
        }
        out = macro_insight.annotate(doc, dry_run=True)
        entry = out["series"][0]
        self.assertNotIn("insight", entry)
        self.assertTrue(entry["chain"], "the glossary line must survive")


if __name__ == "__main__":
    unittest.main()
