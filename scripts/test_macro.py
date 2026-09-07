#!/usr/bin/env python3
"""The macro glossary, and the guard that stands between a model and a reader.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_connections_api as dots  # noqa: E402
import export_guards  # noqa: E402
import filing_types  # noqa: E402
import macro_insight  # noqa: E402
import macro_types as glossary  # noqa: E402
import test_connections as crossings  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent


class GlossaryTest(unittest.TestCase):
    """§8 — every line here describes a mechanism and none recommends a trade."""

    def test_every_entry_is_complete_in_both_languages(self):
        # An Arabic reader meeting an English explanation is the failure this
        # app was built to avoid, and a half-filled entry is how it happens.
        for key, parts in glossary.MACRO_TYPES.items():
            self.assertEqual(len(parts), 10, key)
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

    def test_the_arabic_arm_fires_and_does_not_over_fire(self):
        """The Arabic checks used to pass on everything, including advice.

        `DIRECTIVE` was seven Latin word regexes and half the prose it guards
        is Arabic, so `meaning_ar` and `chain_ar` were never examined by
        anything at all. Pinned in both directions, because a pattern that
        matches nothing and a pattern that matches everything both make the
        test above a decoration.
        """
        for text in (
            "اشترِ السهم الآن",
            "يجب أن تشتري هذا السهم",
            "توصية بالشراء",
            # A proclitic attached to the word. `\b` would miss this.
            "وتوصية بالشراء",
            "هدف السعر ١٢٠ جنيهًا",
            "نوصي بعدم الانتظار",
            "فرصة شراء نادرة",
        ):
            with self.subTest(text):
                self.assertIsNotNone(
                    glossary.directive(text), f"missed: {text}"
                )

        for text in (
            # A fact about a country's trade, not an instruction to trade.
            "تشتري مصر من النفط أكثر مما تبيع",
            "المعدن الآخر الذي يقتنيه المصريون",
            "ينافس الذهب البورصة على المدخرات نفسها",
        ):
            with self.subTest(text):
                found = glossary.directive(text)
                self.assertIsNone(found, f"over-fired on {text}: {found!r}")

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


class CausalTest(unittest.TestCase):
    """§8.4 — correlation is not causation, and the connectives are few.

    `directive()` catches an instruction and `speculative()` a forecast; both
    return None for "It filed, so it is about to move", which is the sentence
    the crossings card would ship if a template ever grew a connective. The
    third guard is scoped to what the crossings publish — sentences, insights,
    strand titles — and is pinned in both directions here, because a pattern
    that matches nothing and one that matches "also" both make it decoration.
    """

    # The controls the spec lists (P12). Between them they exercise every
    # entry of `CAUSAL`: the English connectives, ", so", "driving the", and
    # the Arabic list — so removing any one pattern fails this test.
    POSITIVES = (
        "It filed, so it is about to move.",
        "ahead of its results",
        "driving the sector higher",
        "because the filing landed",
        "بسبب الإفصاح",
        "مما أدى إلى ارتفاع",
        "على خلفية النتائج",
        "قبل إعلان النتائج",
    )
    # Records of appearance that share letters with a connective. "so far" and
    # "also" are the ones a widened ", so" pattern would refuse.
    NEGATIVES = (
        "closing down 16.67%",
        "في اليوم نفسه",
        "also traded",
        "so far",
    )

    def test_the_causal_check_catches_connectors_and_allows_records(self):
        for text in self.POSITIVES:
            with self.subTest(text):
                self.assertIsNotNone(glossary.causal(text), f"missed: {text!r}")

        for text in self.NEGATIVES:
            with self.subTest(text):
                found = glossary.causal(text)
                self.assertIsNone(found, f"over-fired on {text!r}: {found!r}")

        # Every sentence and insight the crossings grammar can emit, in both
        # languages, including the unreachable {"session"}-without-ratio state
        # (an empty string, which must also pass), and every FILED_AS phrase
        # that can be substituted into them.
        checked = 0
        for _, (en, ar) in crossings.every_sentence(reachable_only=False):
            for text in (en, ar):
                checked += 1
                found = glossary.causal(text)
                self.assertIsNone(found, f"the grammar reads as a cause: {text!r} ({found!r})")
        for en, ar in crossings.every_insight():
            for text in (en, ar):
                checked += 1
                found = glossary.causal(text)
                self.assertIsNone(found, f"an insight reads as a cause: {text!r} ({found!r})")
        for key, (en, ar) in filing_types.FILED_AS.items():
            for text in (en, ar):
                checked += 1
                found = glossary.causal(text)
                self.assertIsNone(found, f"FILED_AS[{key}] reads as a cause: {text!r} ({found!r})")
        # If a refactor collapses either enumeration, this notices.
        self.assertGreater(checked, 11_000, "the sentence space stopped being enumerated")

    def test_the_causal_check_is_scoped_to_what_the_crossings_publish(self):
        """The bonus-shares meaning says ", so this adds no value" and is right to.

        It is a taught meaning shown on the filings screen, not a crossing
        sentence, and `causal()` is not applied to it — widening the guard
        there would refuse a correct explanation, which is the false refusal
        this test exists to prevent. Pinned from both sides: the guard DOES
        fire on that meaning (so the scope is a real decision, not an
        accident of the pattern), and no line of the builder that calls
        `causal` reaches for a FILING_TYPES meaning.
        """
        meaning = filing_types.FILING_TYPES["bonus_shares"][2]
        self.assertEqual(glossary.causal(meaning), ", so")

        source = pathlib.Path(dots.__file__).read_text(encoding="utf-8")
        for number, line in enumerate(source.splitlines(), 1):
            if "causal(" in line or "vet(" in line:
                for forbidden in ("meaning", "FILING_TYPES", "meaning_ar"):
                    self.assertNotIn(
                        forbidden, line,
                        f"build_connections_api.py:{number} runs the causal guard "
                        f"over a taught meaning: {line.strip()!r}",
                    )

    def test_the_exported_guards_match_the_live_patterns(self):
        """P13 — the JS suite reads guards.json, so it must not go stale.

        A pattern changed here without `python3 scripts/export_guards.py`
        would leave the site tests passing against the old lists. Compared as
        parsed JSON and as bytes, so key order and the trailing newline are
        pinned as well as the patterns.
        """
        path = REPO / "site-worker" / "test" / "guards.json"
        self.assertTrue(path.exists(), "run: python3 scripts/export_guards.py")
        text = path.read_text(encoding="utf-8")
        self.assertEqual(
            json.loads(text), glossary.exported_guards(),
            "site-worker/test/guards.json is stale — run: python3 scripts/export_guards.py",
        )
        self.assertEqual(text, export_guards.render(), "guards.json bytes drifted from the exporter")

        # Every entry is what the JS side expects: a pattern string and a
        # flags string that is either "" or "i", for all three lists.
        exported = glossary.exported_guards()
        self.assertEqual(sorted(exported), ["causal", "directive", "speculative"])
        for name, rows in exported.items():
            self.assertTrue(rows, f"{name} exported empty")
            for row in rows:
                self.assertEqual(sorted(row), ["flags", "pattern"], name)
                self.assertIn(row["flags"], ("", "i"), name)
                self.assertTrue(row["pattern"], name)


if __name__ == "__main__":
    unittest.main()
