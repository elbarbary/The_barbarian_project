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
        "history": "The company filed 999 disclosures between 2010 and 2026, "
                   "peaking in 2022, and increased its capital twice.",
        "history_ar": "أودعت الشركة 999 إفصاحاً بين 2010 و2026.",
        "plans": [],
    }
    base.update(over)
    return base


ALLOWED = {"egx-1", "egx-2"}

# The company's own computed figures, two of which every history above quotes.
SPECIFICS = {"999", "2010", "2026", "2022"}


def vet(doc, allowed=ALLOWED, specifics=None, accepted=None):
    """`b.vet` with the two guards that need per-run state defaulted.

    Each call gets its own `accepted` list unless a test passes one, so a test
    is never refused because an earlier test's history was similar.
    """
    return b.vet(doc, allowed,
                 SPECIFICS if specifics is None else specifics,
                 [] if accepted is None else accepted)


class Citation(unittest.TestCase):
    def test_a_plan_citing_a_filing_we_supplied_survives(self):
        clean, why = vet(brief(plans=[
            {"text": "The company announced a rights issue.", "text_ar": "أعلنت", "id": "egx-1"},
        ]))
        self.assertEqual(len(clean["plans"]), 1, why)

    def test_an_invented_id_drops_the_claim_attached_to_it(self):
        # The failure mode that matters: a plausible sentence with a made-up
        # source. The sentence goes with the citation.
        clean, _ = vet(brief(plans=[
            {"text": "The company announced a new factory.", "id": "egx-999999"},
        ]))
        self.assertEqual(clean["plans"], [])

    def test_a_plan_with_no_citation_is_dropped(self):
        clean, _ = vet(brief(plans=[{"text": "The company will expand."}]))
        self.assertEqual(clean["plans"], [])

    def test_at_most_five_plans_ship(self):
        many = [{"text": f"Announcement {i}.", "id": "egx-1"} for i in range(9)]
        clean, _ = vet(brief(plans=many))
        self.assertEqual(len(clean["plans"]), 5)


class NoAdvice(unittest.TestCase):
    def test_a_directive_in_the_history_refuses_the_whole_brief(self):
        clean, why = vet(brief(history="Investors should buy this company."))
        self.assertIsNone(clean)
        self.assertIn("directive", why)

    def test_a_valuation_judgement_refuses_it(self):
        clean, why = vet(brief(history="The company files regularly and looks cheap."))
        self.assertIsNone(clean)
        self.assertIn("directive", why)

    def test_arabic_advice_refuses_it_too(self):
        # The Arabic half was never examined by anything for a while; it is now.
        clean, why = vet(brief(history_ar="نوصي بشراء السهم."))
        self.assertIsNone(clean)
        self.assertIn("directive", why)

    def test_a_directive_inside_a_plan_refuses_the_brief(self):
        # Not merely dropped: a model reaching for advice in one field is not
        # to be trusted in the others.
        clean, why = vet(brief(plans=[
            {"text": "You should buy before the capital increase.", "id": "egx-1"},
        ]))
        self.assertIsNone(clean)

    def test_a_target_price_refuses_it(self):
        clean, _ = vet(brief(history="The filings imply a target price of EGP 90."))
        self.assertIsNone(clean)


class Shape(unittest.TestCase):
    def test_an_empty_history_is_refused(self):
        clean, why = vet(brief(history="short"))
        self.assertIsNone(clean)
        self.assertEqual(why, "no history")

    def test_the_prompt_forbids_a_verdict_in_writing(self):
        text, _ = b.prompt_for(
            "X", "X Co",
            [{"code": 1, "heading": "h", "dateStamp": "2026-01-01"}],
            {"filings": 1}, {},
        )
        for rule in ("good, bad", "advise buying", "Invent nothing"):
            self.assertIn(rule, text)


class Distinctive(unittest.TestCase):
    """The guards added after the first batch was measured.

    68 of the first 110 histories contained "and extraordinary general
    meetings", and 41 contained "standalone and consolidated financial". Every
    one passed the citation and directive guards, because those check whether
    a claim is *legal*, not whether it is *about this company*.
    """

    def test_a_history_quoting_none_of_the_company_figures_is_refused(self):
        clean, why = vet(brief(
            history="The company filed results and held general assemblies "
                    "across the period, as listed companies do.",
        ))
        self.assertIsNone(clean)
        self.assertIn("generic", why)

    def test_one_figure_is_not_enough(self):
        clean, why = vet(brief(
            history="The company filed results and held general assemblies "
                    "through 2022, as listed companies do.",
        ))
        self.assertIsNone(clean)
        self.assertIn("generic", why)

    def test_a_history_reading_like_one_already_accepted_is_refused(self):
        accepted = []
        first, _ = vet(brief(), accepted=accepted)
        self.assertIsNotNone(first)
        # The same paragraph offered for a second company.
        again, why = vet(brief(), accepted=accepted)
        self.assertIsNone(again)
        self.assertIn("another company", why)

    def test_a_genuinely_different_history_is_kept(self):
        accepted = []
        vet(brief(), accepted=accepted)
        other, why = vet(brief(
            history="Trading was suspended 17 times and resumed 16 times; "
                    "across 45 reported periods from 2010 the company was "
                    "loss-making in 9 of them, worst in 2026.",
        ), accepted=accepted)
        self.assertIsNotNone(other, why)

    def test_the_prompt_carries_the_computed_facts(self):
        text, tokens = b.prompt_for(
            "X", "X Co",
            [{"code": 1, "heading": "h", "dateStamp": "2026-01-01"}],
            {"filings": 999, "trading_suspensions": 17, "trading_resumptions": 16,
             "capital_increases": 3},
            {"profile": {"first_filing": "2010-01-01", "last_filing": "2026-01-01",
                         "busiest_year": "2022", "busiest_year_filings": 190}},
        )
        self.assertIn("999 filings", text)
        self.assertIn("Busiest year: 2022", text)
        self.assertIn("suspended 17 times", text)
        # And the same figures come back as the specificity guard's vocabulary.
        self.assertIn("999", tokens)
        self.assertIn("2022", tokens)


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


class Story(unittest.TestCase):
    """The one paragraph on the page that is not the exchange's own record.

    It is written from a short, closed list of facts Mubasher publishes, which
    is what makes it checkable: a percentage in the prose that is not on the
    register was invented, and this repository has published fabricated
    figures against a real ticker before.
    """

    STAKES = {"61.619", "8.3351", "80.0", "74.92"}

    def test_a_stake_from_the_register_survives(self):
        ok, why = b.vet_story(
            "Controlled by its majority shareholder with 61.619%.", "", self.STAKES)
        self.assertTrue(ok, why)

    def test_a_sensible_rounding_survives(self):
        # Mubasher writes 61.619; a model may reasonably say 61.6 or 62.
        for said in ("61.6%", "62%", "74.9%"):
            ok, why = b.vet_story(f"It holds {said}.", "", self.STAKES)
            self.assertTrue(ok, f"{said}: {why}")

    def test_an_invented_stake_drops_the_story(self):
        ok, why = b.vet_story("It owns 45% of a logistics arm.", "", self.STAKES)
        self.assertFalse(ok)
        self.assertIn("invented", why)

    def test_the_arabic_half_is_checked_too(self):
        ok, _ = b.vet_story("Fine.", "يمتلك 45% من شركة تابعة.", self.STAKES)
        self.assertFalse(ok)

    def test_advice_in_a_story_drops_it(self):
        ok, why = b.vet_story("A company worth buying at this price.", "", self.STAKES)
        self.assertFalse(ok)
        self.assertIn("directive", why)

    def test_no_profile_means_no_story_section(self):
        self.assertIsNone(b.profile_block({}))
        self.assertIsNone(b.profile_block({"missing": True}))
        self.assertIsNone(b.profile_block({"purpose": "   "}))

    def test_the_block_offers_only_published_stakes_as_vocabulary(self):
        block, stakes = b.profile_block({
            "purpose": "A steel maker based in Cairo.",
            "established": "May 1998",
            "owners": [{"name": "Holder", "stake": 51.0}],
            "subsidiaries": [{"name": "Arm Co", "stake": 99.9}],
        })
        self.assertIn("A steel maker", block)
        self.assertIn("Holder 51.0%", block)
        self.assertIn("Arm Co 99.9%", block)
        self.assertEqual(stakes, {"51.0", "99.9"})

    def test_a_story_never_reaches_a_brief_it_failed(self):
        clean = {}
        b.attach_story(clean, {"story": "It owns 45% of something.", "story_ar": ""},
                       self.STAKES, {"source": "Mubasher"})
        self.assertNotIn("story", clean)


if __name__ == "__main__":
    unittest.main()
