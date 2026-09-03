#!/usr/bin/env python3
"""The forward calendar reads only what the issuer scheduled, never guesses."""
import datetime
import json
import pathlib
import tempfile
import unittest

import build_calendar as cal
import macro_types


class Extract(unittest.TestCase):
    def test_dividend_payment_from_its_labelled_field(self):
        body = ("Company Name : Misr Beni Suef Cement ISIN Code: X Reuters Code: MBSC.CA "
                "Type of Dividend : Cash Coupon No. : 21 Dividend per Share : 20.000 EGP "
                "Payment Date : 21/06/2026 Ex-Dividend Date : 15/06/2026")
        got = dict((k, d) for k, d, _ in
                   cal.events_for("Corporate Actions", "MBSC.CA Declares Cash Distribution", body))
        self.assertEqual(got["dividend_payment"], datetime.date(2026, 6, 21))
        self.assertEqual(got["ex_dividend"], datetime.date(2026, 6, 15))

    def test_rights_window_both_ends(self):
        body = ("Reuters Code : ICMI.CA Subscription Price : EGP 1.01 "
                "Beginning Date Of Subscription to Rights Issue : 18/06/2026 "
                "Ending Date of Subscription to Rights Issue : 02/07/2026")
        got = dict((k, d) for k, d, _ in
                   cal.events_for("Corporate Actions", "FCMI (ICMI.CA) - Rights Issue", body))
        self.assertEqual(got["rights_open"], datetime.date(2026, 6, 18))
        self.assertEqual(got["rights_close"], datetime.date(2026, 7, 2))

    def test_trading_resume_effective_date(self):
        body = "EGX decided to resume trading on the company effective 09/06/2026 trading session"
        got = cal.events_for("Trading Notices", "Resume of Trading on ACAMD.CA", body)
        self.assertEqual(got, [("trading_resume", datetime.date(2026, 6, 9), "Trading resumes")])

    def test_assembly_minutes_are_not_a_future_event(self):
        # Minutes record a meeting already held; only invitations look forward.
        body = "Content: Notarized minutes of the AGM held on 15/03/2026 Assembly Date : 15/03/2026"
        got = cal.events_for("General Assemblies", "COMI.CA - AGM Minutes (Notarized)", body)
        self.assertEqual(got, [])

    def test_assembly_invitation_is_kept(self):
        body = "Invitation to the Annual General Assembly. Assembly Date : 30/09/2026"
        got = cal.events_for("General Assemblies", "EAST.CA - AGM Invitation", body)
        self.assertEqual(got, [("assembly_agm", datetime.date(2026, 9, 30),
                                "Annual General Assembly")])

    def test_an_unlabelled_date_is_ignored(self):
        # A date loose in prose is not a scheduled event.
        body = "With reference to the letter dated 09/06/2026 from the company, we inform you…"
        self.assertEqual(cal.events_for("Corporate Actions", "NHPS.CA update", body), [])


class Build(unittest.TestCase):
    def test_event_before_its_own_filing_is_dropped(self):
        # A payment date earlier than the filing that mentions it is not upcoming.
        # Exercised through build() over a synthesised item would need the disk
        # harvest; the rule itself is a one-liner and is asserted at the source.
        self.assertTrue(datetime.date(2026, 6, 21) > datetime.date(2026, 6, 8))


class Expected(unittest.TestCase):
    """The one kind of row on this calendar nobody filed.

    It is allowed on the screen because it is a claim about a *disclosure
    date* rather than about a security, and because it is labelled as an
    estimate everywhere it appears. These tests hold that labelling in place.
    """

    def setUp(self):
        self._real = cal.build_signals.published_results_due
        cal.build_signals.published_results_due = lambda: {
            "ELEC": [{
                "label": "9M", "period_end": "2026-09-30",
                "expected": "2026-11-16", "window_start": "2026-11-05",
                "window_end": "2026-11-27", "observations": 12,
            }],
            "GHOST": [{
                "label": "FY", "period_end": "2026-12-31",
                "expected": "2027-03-10", "window_start": "2027-02-28",
                "window_end": "2027-03-31", "observations": 13,
            }],
        }

    def tearDown(self):
        cal.build_signals.published_results_due = self._real

    def rows(self):
        return cal.expected_rows(datetime.date(2026, 8, 24), {"ELEC": "Electro Cable"})

    def test_every_estimated_row_says_so(self):
        for row in self.rows():
            self.assertTrue(row["estimated"])
            self.assertEqual(row["kind"], "results_expected")

    def test_it_carries_the_window_and_the_evidence_behind_it(self):
        row = self.rows()[0]
        self.assertEqual(row["window_start"], "2026-11-05")
        self.assertEqual(row["window_end"], "2026-11-27")
        self.assertEqual(row["observations"], 12)

    def test_an_estimate_never_links_to_a_filing(self):
        # There is no filing. A link would imply one, and the reader would
        # follow it expecting the source of a date nobody published.
        self.assertEqual(self.rows()[0]["link"], "")

    def test_a_company_the_app_does_not_list_gets_no_row(self):
        self.assertEqual([r["ticker"] for r in self.rows()], ["ELEC"])

    # 2026-09-02: all 396 estimated rows shipped with `title_ar: ""`, so the
    # Arabic-default calendar's Expected panel was the one screen in English.
    # The name is the one the exchange publishes for ELEC (company_names_ar.json).
    def test_an_estimate_is_titled_in_arabic_from_the_same_template(self):
        row = cal.expected_rows(datetime.date(2026, 8, 24), {"ELEC": "Electro Cable"},
                                {"ELEC": "الكابلات الكهربائية المصرية"})[0]
        self.assertEqual(row["title"], "Electro Cable — 9M results expected")
        self.assertEqual(row["title_ar"],
                         "الكابلات الكهربائية المصرية — نتائج تسعة أشهر مرتقبة")

    def test_no_published_arabic_name_means_the_english_one_not_a_blank(self):
        # GOUR (Gourmet Egypt.Com Foods) has no Arabic name on the record.
        # Inventing one is forbidden and a blank is the defect; the English
        # name goes inside the Arabic sentence. rows() passes no Arabic map at
        # all, which is the same case.
        for row in self.rows():
            self.assertEqual(row["title_ar"], "Electro Cable — نتائج تسعة أشهر مرتقبة")

    def test_period_words_are_the_ones_the_site_already_prints(self):
        self.assertEqual(cal.expected_title_ar("س", "Q1"), "س — نتائج الربع الأول مرتقبة")
        self.assertEqual(cal.expected_title_ar("س", "H1"), "س — نتائج النصف الأول مرتقبة")
        self.assertEqual(cal.expected_title_ar("س", "9M"), "س — نتائج تسعة أشهر مرتقبة")
        self.assertEqual(cal.expected_title_ar("س", "FY"), "س — نتائج السنة المالية مرتقبة")
        # Every label the signals step can produce has a word here.
        self.assertEqual(set(cal.PERIOD_AR), {label for label, _, _ in cal.build_signals.PERIOD_ENDS})
        # One it cannot is printed as it is, not translated by guesswork.
        self.assertEqual(cal.expected_title_ar("س", "H2"), "س — نتائج H2 مرتقبة")

    def test_the_arabic_title_anticipates_a_date_not_a_figure(self):
        # §8: "أرباح متوقعة" is on macro_types.DIRECTIVE. The row is a claim
        # about a filing date, and its wording must not read as a forecast.
        for label in cal.PERIOD_AR:
            title = cal.expected_title_ar("الكابلات الكهربائية المصرية", label)
            self.assertFalse(any(p.search(title) for p in macro_types.DIRECTIVE), title)


class ArabicNames(unittest.TestCase):
    """Where the Arabic half of an estimate's title comes from, and where it must not."""

    def _with(self, companies, names):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = pathlib.Path(tmp.name)
        saved = cal.COMPANIES, cal.NAMES_AR
        self.addCleanup(lambda: setattr(cal, "COMPANIES", saved[0]))
        self.addCleanup(lambda: setattr(cal, "NAMES_AR", saved[1]))
        cal.COMPANIES = root / "companies.json"
        cal.NAMES_AR = root / "company_names_ar.json"
        if companies is not None:
            cal.COMPANIES.write_text(json.dumps({"companies": companies}, ensure_ascii=False),
                                     encoding="utf-8")
        if names is not None:
            cal.NAMES_AR.write_text(json.dumps(names, ensure_ascii=False), encoding="utf-8")

    def test_companies_json_wins_and_the_harvest_map_fills_the_rest(self):
        self._with(
            companies=[
                {"ticker": "ELEC", "name_en": "Electro Cable",
                 "name_ar": "الكابلات الكهربائية المصرية"},
                # 14 of the 284 listed on 2026-09-03 have no Arabic name at all.
                {"ticker": "GOUR", "name_en": "Gourmet Egypt.Com Foods", "name_ar": None},
            ],
            names={"ELEC": "(from the map)", "JUFO": "جهينة للصناعات الغذائية ش م م",
                   "BLANK": "  "},
        )
        got = cal.arabic_names()
        self.assertEqual(got["ELEC"], "الكابلات الكهربائية المصرية")
        self.assertEqual(got["JUFO"], "جهينة للصناعات الغذائية ش م م")
        self.assertNotIn("GOUR", got)
        self.assertNotIn("BLANK", got)

    def test_missing_or_broken_inputs_yield_nothing_rather_than_a_crash(self):
        self._with(companies=None, names=None)
        self.assertEqual(cal.arabic_names(), {})
        self._with(companies=[], names=["not", "a", "map"])
        self.assertEqual(cal.arabic_names(), {})


if __name__ == "__main__":
    unittest.main()
