#!/usr/bin/env python3
"""The guards on model-written company briefs.

A brief is the only place in this pipeline where a model composes a sentence
about a *named security*. Everything here is about what it is not allowed to
say, and about refusing anything that cannot be traced to a filing.
"""
import unittest

import build_company_briefs as b


def brief(**over):
    base = {
        "history": "The company filed annual results and held general assemblies "
                   "across the period, and increased its capital twice.",
        "history_ar": "أودعت الشركة نتائجها السنوية وعقدت جمعيات عامة.",
        "plans": [],
    }
    base.update(over)
    return base


ALLOWED = {"egx-1", "egx-2"}


class Citation(unittest.TestCase):
    def test_a_plan_citing_a_filing_we_supplied_survives(self):
        clean, why = b.vet(brief(plans=[
            {"text": "The company announced a rights issue.", "text_ar": "أعلنت", "id": "egx-1"},
        ]), ALLOWED)
        self.assertEqual(len(clean["plans"]), 1, why)

    def test_an_invented_id_drops_the_claim_attached_to_it(self):
        # The failure mode that matters: a plausible sentence with a made-up
        # source. The sentence goes with the citation.
        clean, _ = b.vet(brief(plans=[
            {"text": "The company announced a new factory.", "id": "egx-999999"},
        ]), ALLOWED)
        self.assertEqual(clean["plans"], [])

    def test_a_plan_with_no_citation_is_dropped(self):
        clean, _ = b.vet(brief(plans=[{"text": "The company will expand."}]), ALLOWED)
        self.assertEqual(clean["plans"], [])

    def test_at_most_five_plans_ship(self):
        many = [{"text": f"Announcement {i}.", "id": "egx-1"} for i in range(9)]
        clean, _ = b.vet(brief(plans=many), ALLOWED)
        self.assertEqual(len(clean["plans"]), 5)


class NoAdvice(unittest.TestCase):
    def test_a_directive_in_the_history_refuses_the_whole_brief(self):
        clean, why = b.vet(brief(history="Investors should buy this company."), ALLOWED)
        self.assertIsNone(clean)
        self.assertIn("directive", why)

    def test_a_valuation_judgement_refuses_it(self):
        clean, why = b.vet(brief(history="The company files regularly and looks cheap."), ALLOWED)
        self.assertIsNone(clean)
        self.assertIn("directive", why)

    def test_arabic_advice_refuses_it_too(self):
        # The Arabic half was never examined by anything for a while; it is now.
        clean, why = b.vet(brief(history_ar="نوصي بشراء السهم."), ALLOWED)
        self.assertIsNone(clean)
        self.assertIn("directive", why)

    def test_a_directive_inside_a_plan_refuses_the_brief(self):
        # Not merely dropped: a model reaching for advice in one field is not
        # to be trusted in the others.
        clean, why = b.vet(brief(plans=[
            {"text": "You should buy before the capital increase.", "id": "egx-1"},
        ]), ALLOWED)
        self.assertIsNone(clean)

    def test_a_target_price_refuses_it(self):
        clean, _ = b.vet(brief(history="The filings imply a target price of EGP 90."), ALLOWED)
        self.assertIsNone(clean)


class Shape(unittest.TestCase):
    def test_an_empty_history_is_refused(self):
        clean, why = b.vet(brief(history="short"), ALLOWED)
        self.assertIsNone(clean)
        self.assertEqual(why, "no history")

    def test_the_prompt_forbids_a_verdict_in_writing(self):
        text = b.prompt_for("X", "X Co", [{"code": 1, "heading": "h", "dateStamp": "2026-01-01"}], {})
        for rule in ("good, bad", "advise buying", "Invent nothing"):
            self.assertIn(rule, text)


class Record(unittest.TestCase):
    def test_the_countable_facts_are_counted_not_asked_for(self):
        filings = [
            {"heading": "Suspension of Trading on X (X.CA)", "dateStamp": "2020-01-01"},
            {"heading": "Resume of Trading on X (X.CA)", "dateStamp": "2020-01-05"},
            {"heading": "X (X.CA) Capital Increase", "dateStamp": "2021-01-01"},
            {"heading": "X AGM", "section": "General Assemblies", "dateStamp": "2022-01-01"},
        ]
        got = b.factual_record("NOSUCHTICKER", filings)
        self.assertEqual(got["trading_suspensions"], 1)
        self.assertEqual(got["trading_resumptions"], 1)
        self.assertEqual(got["capital_increases"], 1)
        self.assertEqual(got["general_assemblies"], 1)
        self.assertEqual(got["filings"], 4)


class Parsing(unittest.TestCase):
    def test_a_fenced_json_block_is_read(self):
        self.assertEqual(b.parse('```json\n{"history":"x"}\n```'), {"history": "x"})

    def test_prose_around_the_object_is_tolerated(self):
        self.assertEqual(b.parse('Here you go: {"history":"x"} hope that helps'),
                         {"history": "x"})

    def test_junk_is_none(self):
        self.assertIsNone(b.parse("no json here"))


if __name__ == "__main__":
    unittest.main()
