#!/usr/bin/env python3
"""What the named-insider reader refuses.

This is the one builder in the repository that attaches a REAL PERSON'S NAME to
a share trade, read by a model off a scan. A misread that produced a plausible
name would put a named individual against a transaction they did not make, and
no reader could tell from the page. Every test here is one way that is stopped.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import unittest

import build_named_insiders as named


def reading(**over):
    base = {
        "investorName": "ياسر فاروق مصطفى محمد",
        "investorNameEn": "Yasser Farouk Mostafa Mohamed",
        "relationship": "insider",
        "company": "شركة مصر بني سويف للاسمنت",
        "action": "sell",
        "shares": 9400,
        "price": 246.87,
        "ownershipBeforePercent": 6.01,
        "ownershipAfterPercent": 5.99,
        "legible": True,
    }
    base.update(over)
    return base


class NameTest(unittest.TestCase):
    def test_a_real_name_is_kept(self):
        self.assertTrue(named.usable_name("ياسر فاروق مصطفى محمد"))
        self.assertTrue(named.usable_name("Hesham Ibrahim Abdel Moneim El Nahas"))

    def test_a_relationship_is_not_a_name(self):
        """The daily summary already carries these, and they are not people.

        If one of them survived, the screen would say "insider" bought shares
        as though that were somebody's name.
        """
        for value in ("insider", "Insider", "related parties of insider",
                      "major shareholder", "Treasury Shares",
                      "مساهم رئيسي", "أطراف مرتبطة"):
            self.assertFalse(named.usable_name(value), value)

    def test_a_company_IS_a_usable_name(self):
        """Deliberate, and a reversal.

        The first rule refused anything starting `شركة`, which threw away
        Derayah Financial and other real corporate holders. A company can hold
        shares; whether it is the WRONG company is `is_the_issuer`'s question,
        not this one's.
        """
        for value in ("شركة دراية المالية مساهمة مقفلة",
                      "شركه اموال العربيه للاقطان",
                      "Al Hosn Consulting"):
            self.assertTrue(named.usable_name(value), value)

    def test_a_single_word_is_not_a_person(self):
        self.assertFalse(named.usable_name("Mohamed"))
        self.assertFalse(named.usable_name("محمد"))

    def test_junk_is_refused(self):
        for value in (None, 12, "", "  ", "ab", "x" * 200):
            self.assertFalse(named.usable_name(value), repr(value))


class VetTest(unittest.TestCase):
    def keep(self, **over):
        return named.vet(reading(**over), "MBSC", None)

    def test_a_clean_form_is_kept(self):
        rec, why = self.keep()
        self.assertIsNotNone(rec, why)
        self.assertEqual(rec["investorName"], "ياسر فاروق مصطفى محمد")
        self.assertEqual(rec["ownershipBeforePercent"], 6.01)
        self.assertEqual(rec["nameScript"], "ar")

    def test_an_illegible_scan_is_refused(self):
        rec, why = self.keep(legible=False)
        self.assertIsNone(rec)
        self.assertIn("illegible", why)

    def test_a_sale_that_raises_the_stake_is_refused(self):
        """The check that catches a transposed pair of percentages.

        It is the likeliest way a scan is misread and the least visible
        afterwards: both numbers are plausible, and only their ORDER is wrong.
        """
        rec, why = self.keep(action="sell", ownershipBeforePercent=5.99,
                             ownershipAfterPercent=6.01)
        self.assertIsNone(rec)
        self.assertIn("raises the stake", why)

    def test_a_purchase_that_lowers_the_stake_is_refused(self):
        rec, why = self.keep(action="buy", ownershipBeforePercent=6.01,
                             ownershipAfterPercent=5.99)
        self.assertIsNone(rec)
        self.assertIn("lowers the stake", why)

    def test_a_stake_outside_nought_to_a_hundred_is_refused(self):
        for pct in (-1, 101, 1000):
            rec, why = self.keep(ownershipAfterPercent=pct)
            self.assertIsNone(rec, pct)
            self.assertIn("0-100", why)

    def test_shares_must_be_a_positive_whole_number(self):
        for shares in (0, -5, None, "9400", 9.4):
            rec, why = self.keep(shares=shares)
            self.assertIsNone(rec, repr(shares))

    def test_an_unreadable_action_is_refused(self):
        for action in (None, "", "transfer", "hold"):
            rec, _ = self.keep(action=action)
            self.assertIsNone(rec, repr(action))

    def test_a_missing_stake_pair_is_allowed_through(self):
        """Not every form prints both. Absent is not the same as wrong."""
        rec, why = self.keep(ownershipBeforePercent=None,
                             ownershipAfterPercent=None)
        self.assertIsNotNone(rec, why)
        self.assertIsNone(rec["ownershipBeforePercent"])

    def test_a_price_that_is_not_a_number_becomes_absent_not_invented(self):
        rec, _ = self.keep(price="٢٤٦")
        self.assertIsNotNone(rec)
        self.assertIsNone(rec["price"])


class ScriptTest(unittest.TestCase):
    def test_a_latin_name_is_labelled_latin(self):
        rec, _ = named.vet(reading(investorName="Hesham Ibrahim El Nahas"),
                           "COPR", None)
        self.assertEqual(rec["nameScript"], "latin")


class CleanNameTest(unittest.TestCase):
    """The form prints a registry code beside the name, and the scan hands both
    back as one string. Publishing "الحصن للاستشارات كود موحد ٢٢١٧٣٠٢" as
    somebody's name is wrong in a way no reader could detect.
    """

    def test_a_unified_code_is_stripped(self):
        self.assertEqual(named.clean_name("الحصن للاستشارات كود موحد ۲۲۱۷۳۰۲"),
                         "الحصن للاستشارات")

    def test_a_trailing_latin_code_on_an_arabic_name_is_stripped(self):
        self.assertEqual(
            named.clean_name("شركه ام جي سي للتجاره والاستثمار العقاري MJC"),
            "شركه ام جي سي للتجاره والاستثمار العقاري")

    def test_a_latin_name_is_never_trimmed(self):
        """The narrow part of the rule, and the reason it is narrow.

        Both of these end in a Latin word; neither ends in a registry code.
        """
        for name in ("Al Hosn Consulting",
                     "Hesham Ibrahim Abdel Moneim El Nahas",
                     "Yasser Farouk Mostafa Mohamed"):
            self.assertEqual(named.clean_name(name), name)

    def test_an_arabic_name_without_a_code_is_untouched(self):
        for name in ("ياسر فاروق مصطفى محمد", "إيهاب شكري رياض"):
            self.assertEqual(named.clean_name(name), name)

    def test_whitespace_is_normalised(self):
        self.assertEqual(named.clean_name("  محمد   أشرف  عمر  "), "محمد أشرف عمر")

    def test_the_cleaned_name_is_what_gets_stored(self):
        rec, why = named.vet(reading(investorName="الحصن للاستشارات كود موحد ۲۲۱۷۳۰۲"),
                             "ELEC", None)
        self.assertIsNotNone(rec, why)
        self.assertEqual(rec["investorName"], "الحصن للاستشارات")


class IssuerTest(unittest.TestCase):
    """A company can hold shares; the company whose shares they are cannot hold
    its own in this field.

    The first rule here refused anything starting `شركة`, which threw away
    Derayah Financial — a real corporate holder — while letting through
    `شركه اموال العربيه`, the same word spelled with a haa instead of a taa
    marbuta. The question is not "is this a company" but "is this THE issuer".
    """

    KABO = "النصر للملابس والمنسوجات - كابو"

    def test_the_issuers_own_name_is_caught(self):
        self.assertTrue(named.is_the_issuer(
            "شركة النصر للملابس والمنسوجات كابو", self.KABO))

    def test_a_corporate_holder_is_not_the_issuer(self):
        for holder in ("شركة دراية المالية مساهمة مقفلة",
                       "شركه اموال العربيه للاقطان",
                       "شركه ام جي سي للتجاره والاستثمار العقاري"):
            self.assertFalse(named.is_the_issuer(holder, self.KABO), holder)

    def test_a_person_is_never_the_issuer(self):
        self.assertFalse(named.is_the_issuer("ياسر فاروق مصطفى محمد",
                                             "مصر بنى سويف للاسمنت"))

    def test_spelling_drift_still_matches(self):
        """Scans swap taa marbuta for haa and drop the article; an issuer that
        matched only on an exact string would slip straight through."""
        self.assertTrue(named.is_the_issuer("شركه النصر للملابس والمنسوجات كابو",
                                            self.KABO))

    def test_an_absent_issuer_never_refuses(self):
        self.assertFalse(named.is_the_issuer("أي اسم كان", ""))

    def test_vet_refuses_the_issuer_and_keeps_the_holder(self):
        bad, why = named.vet(reading(investorName="شركة النصر للملابس والمنسوجات كابو"),
                             "KABO", None, self.KABO)
        self.assertIsNone(bad)
        self.assertIn("issuer", why)
        good, why2 = named.vet(reading(investorName="شركة دراية المالية مساهمة مقفلة"),
                               "KABO", None, self.KABO)
        self.assertIsNotNone(good, why2)

    def test_the_issuer_name_comes_off_the_filing_title(self):
        form = {"titleArabic": "مصر بنى سويف للاسمنت (MBSC.CA) - بيان بخصوص نموذج إفصاح",
                "title": "Misr Beni Suef Cement (MBSC.CA) - Release Regarding a Disclosure Form"}
        self.assertEqual(named.issuer_name(form, "MBSC"), "مصر بنى سويف للاسمنت")
