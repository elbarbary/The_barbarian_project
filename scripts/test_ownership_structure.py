#!/usr/bin/env python3
"""What the shareholder-structure reader refuses.

This builder attaches named individuals to a company's share register. A
misread digit here does not look wrong on screen — it looks like a fact about
who controls a listed company. Every guard is a way that is stopped, and every
test fails when its guard is removed.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import unittest

import build_ownership_structure as structure


def form(**over):
    base = {
        "companyArabic": "مرسيليا المصرية الخليجية للاستثمار العقارى",
        "asOfDate": "2025-09-30",
        "totalShares": 207648000,
        "board": [{"nameArabic": "أ/ سامي عبد الرحيم فؤاد عبد الرواف",
                   "role": "رئيس مجلس الإدارة", "representing": "عن نفسه"}],
        "shareholders": [
            {"nameArabic": "سامي عبد الرحيم فؤاد", "percent": 29.71,
             "shares": 61711854, "kind": "person"},
            {"nameArabic": "ياسر علي أحمد رجب", "percent": 34.23,
             "shares": 71083700, "kind": "person"},
        ],
        "legible": True,
    }
    base.update(over)
    return base


ISSUER = "مرسيليا المصرية الخليجية للاستثمار العقارى"


class Reading(unittest.TestCase):
    def test_a_form_whose_numbers_agree_is_kept(self):
        self.assertIsNone(structure.vet(form(), "MAAL", ISSUER))

    def test_a_share_count_that_contradicts_its_percentage_is_refused(self):
        # 215,515,685 of 62,400,000 shares is 345%, and the form printed 34.54.
        # One of the two numbers was misread and there is no way to know which.
        why = structure.vet(form(totalShares=62400000, shareholders=[
            {"nameArabic": "شركة قره لمشروعات الطاقة", "percent": 34.54,
             "shares": 215515685, "kind": "firm"}]), "QARA",
            "الشركة المصرية لخدمات التليفون المحمول")
        self.assertIn("345.38%", why or "")

    def test_rounding_between_the_two_is_allowed(self):
        # 29.71% of 207,648,000 is 61,692,020; the form prints 61,711,854.
        # That is the percentage being printed to two places, not a misread.
        self.assertIsNone(structure.vet(form(), "MAAL", ISSUER))

    def test_a_company_cannot_be_more_than_wholly_owned(self):
        why = structure.vet(form(totalShares=None, shareholders=[
            {"nameArabic": "أحمد محمد علي حسن", "percent": 70.0, "shares": None, "kind": "person"},
            {"nameArabic": "محمود سعيد فؤاد كامل", "percent": 45.0, "shares": None, "kind": "person"}]),
            "AAA", "شركة ألفا")
        self.assertIn("115.00%", why or "")

    def test_a_director_who_owns_nothing_does_not_void_the_register(self):
        # These forms print the board in the same table as the holders, and a
        # director with no shares is printed at zero. Refusing the document
        # over that threw away twelve complete registers — every one of them
        # naming people who DO hold.
        self.assertIsNone(structure.vet(form(totalShares=None, shareholders=[
            {"nameArabic": "هشام حسين الخازندار", "percent": 0.0, "shares": None,
             "kind": "person"},
            {"nameArabic": "محمد اشرف عمر عمر", "percent": 12.5, "shares": None,
             "kind": "person"}]), "AAA", "شركة ألفا للاستثمار"))

    def test_a_row_with_no_stake_is_not_published_as_a_holding(self):
        rows = [{"nameArabic": "هشام حسين الخازندار", "percent": 0.0},
                {"nameArabic": "ليلي رمزي نجيب خله", "percent": None},
                {"nameArabic": "محمد اشرف عمر عمر", "percent": 12.5}]
        self.assertEqual([r["nameArabic"] for r in structure.owning(rows)],
                         ["محمد اشرف عمر عمر"])

    def test_a_form_of_nothing_but_zero_holders_and_no_board_is_still_refused(self):
        why = structure.vet(form(board=[], totalShares=None, shareholders=[
            {"nameArabic": "هشام حسين الخازندار", "percent": 0.0}]),
            "AAA", "شركة ألفا للاستثمار")
        self.assertIn("neither a director nor a holder", why or "")

    def test_a_stake_outside_nought_to_a_hundred_is_refused(self):
        for bad in (-3, 140):
            why = structure.vet(form(totalShares=None, shareholders=[
                {"nameArabic": "أحمد محمد علي حسن", "percent": bad, "shares": None,
                 "kind": "person"}]), "AAA", "شركة ألفا")
            self.assertIn("outside 0-100%", why or "", f"{bad} was accepted")

    def test_the_same_holder_listed_twice_is_refused(self):
        why = structure.vet(form(totalShares=None, shareholders=[
            {"nameArabic": "أحمد محمد علي حسن", "percent": 20.0, "shares": None, "kind": "person"},
            {"nameArabic": "احمد محمد علي حسن", "percent": 15.0, "shares": None, "kind": "person"}]),
            "AAA", "شركة ألفا")
        self.assertIn("listed twice", why or "")

    def test_the_issuer_is_not_a_shareholder_in_itself_here(self):
        why = structure.vet(form(totalShares=None, shareholders=[
            {"nameArabic": ISSUER, "percent": 12.0, "shares": None, "kind": "firm"}]),
            "MAAL", ISSUER)
        self.assertIn("the issuer itself", why or "")

    def test_a_director_with_no_name_is_refused(self):
        why = structure.vet(form(board=[{"nameArabic": "-", "role": None,
                                         "representing": None}]), "MAAL", ISSUER)
        self.assertIn("no usable name", why or "")

    def test_an_illegible_scan_is_refused_rather_than_guessed_at(self):
        self.assertIn("could not read", structure.vet({"legible": False}, "MAAL", ISSUER) or "")

    def test_a_form_with_neither_a_director_nor_a_holder_is_refused(self):
        why = structure.vet(form(board=[], shareholders=[]), "MAAL", ISSUER)
        self.assertIn("neither a director nor a holder", why or "")

    def test_a_board_with_no_shareholder_section_still_counts(self):
        # Some forms print the board and leave the structure table to a later
        # filing. Half a document is not a bad document.
        self.assertIsNone(structure.vet(form(shareholders=[]), "MAAL", ISSUER))


class ReaderFailures(unittest.TestCase):
    """A reader that timed out has said nothing about the document."""

    def test_no_answer_is_not_a_refusal(self):
        self.assertTrue(structure.incomplete(None))
        self.assertTrue(structure.incomplete({}))
        self.assertTrue(structure.incomplete({"companyArabic": "x"}))

    def test_an_illegibility_verdict_is_an_answer(self):
        self.assertFalse(structure.incomplete({"legible": False}))

    def test_a_list_of_any_kind_is_an_answer(self):
        self.assertFalse(structure.incomplete({"board": []}))
        self.assertFalse(structure.incomplete({"shareholders": []}))


class Queue(unittest.TestCase):
    def test_only_the_newest_form_per_company_is_read(self):
        ledger = {"documents": [
            {"kind": "ownership_structure", "ticker": "AAA", "filingId": "1",
             "publishedAt": "2025-01-01T00:00:00", "attachments": ["a.pdf"]},
            {"kind": "ownership_structure", "ticker": "AAA", "filingId": "2",
             "publishedAt": "2026-06-01T00:00:00", "attachments": ["b.pdf"]},
            {"kind": "post_execution_disclosure", "ticker": "BBB", "filingId": "3",
             "publishedAt": "2026-06-01T00:00:00", "attachments": ["c.pdf"]},
        ]}
        newest = structure.latest_per_company(ledger)
        self.assertEqual(list(newest), ["AAA"])
        self.assertEqual(newest["AAA"]["filingId"], "2")

    def test_a_filing_with_no_attachment_is_not_queued(self):
        ledger = {"documents": [
            {"kind": "ownership_structure", "ticker": "AAA", "filingId": "1",
             "publishedAt": "2026-06-01T00:00:00", "attachments": []},
        ]}
        self.assertEqual(structure.latest_per_company(ledger), {})


if __name__ == "__main__":
    unittest.main()
