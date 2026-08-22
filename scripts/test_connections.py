#!/usr/bin/env python3
"""The crossing sentences, and the guard between them and a reader.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_connections_api as dots  # noqa: E402
import macro_types  # noqa: E402


class SentenceTest(unittest.TestCase):
    def test_every_sentence_the_templates_can_produce_is_safe(self):
        """§8 — a crossing states what happened, never what to do about it.

        Exhaustive over the template space rather than over a sample: there
        are three kinds and seven non-empty combinations, so every sentence
        this file can ever emit is checked here.
        """
        kinds = ("filing", "news", "session")
        for mask in range(1, 8):
            chosen = {k for i, k in enumerate(kinds) if mask & (1 << i)}
            en, ar = dots.sentence("COMI", chosen, 3.45)
            for label, text in (("en", en), ("ar", ar)):
                with self.subTest(kinds=sorted(chosen), lang=label):
                    found = macro_types.directive(text)
                    self.assertIsNone(
                        found, f"{sorted(chosen)} {label} instructs: {found!r}"
                    )
                    self.assertTrue(text.strip())

    def test_the_arabic_is_arabic_and_joins_the_way_arabic_joins(self):
        _en, ar = dots.sentence("COMI", {"filing", "news"}, None)
        self.assertTrue(any("؀" <= ch <= "ۿ" for ch in ar))
        # The waw attaches to the word it joins.
        self.assertNotIn(" و ", ar)

    def test_the_ticker_is_isolated_from_the_arabic_around_it(self):
        _en, ar = dots.sentence("COMI", {"filing", "session"}, 2.5)
        self.assertIn("⁨COMI⁩", ar)

    def test_one_kind_is_not_a_crossing(self):
        """The published document may only carry items with two or more."""
        import json

        path = (
            pathlib.Path(__file__).resolve().parent.parent
            / "public" / "data" / "v1" / "connections.json"
        )
        if not path.exists():
            self.skipTest("nothing published yet")
        doc = json.loads(path.read_text(encoding="utf-8"))
        for item in doc.get("items", []):
            with self.subTest(item["ticker"]):
                self.assertGreaterEqual(len(item["kinds"]), 2)
                # And every strand points at something a reader can open, or
                # is the session, which is a number rather than a document.
                for strand in item["strands"]:
                    if strand["kind"] != "session":
                        self.assertTrue(
                            strand.get("link"),
                            f"{item['ticker']} {strand['kind']} has no link",
                        )


if __name__ == "__main__":
    unittest.main()
