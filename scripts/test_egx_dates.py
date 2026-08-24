#!/usr/bin/env python3
"""The exchange writes dates two ways; reading them one way loses or breaks."""
import datetime
import unittest

import egx_dates as d


class Order(unittest.TestCase):
    def test_a_day_above_twelve_proves_day_first(self):
        self.assertEqual(d.detect_order("filed 30/06/2026"), "day_first")

    def test_a_month_slot_above_twelve_proves_month_first(self):
        self.assertEqual(d.detect_order("period to 03/31/2013"), "month_first")

    def test_no_evidence_falls_back_to_the_dominant_form(self):
        self.assertEqual(d.detect_order("dated 01/02/2026"), "day_first")

    def test_one_provable_sibling_decides_the_whole_filing(self):
        # 06/30 proves month-first; 01/02 is then 2 January, not 1 February.
        text = "From 01/02/2013 To 06/30/2013"
        self.assertEqual(d.detect_order(text), "month_first")
        self.assertEqual(d.find_all(text)[0], datetime.date(2013, 1, 2))


class Parse(unittest.TestCase):
    def test_day_first(self):
        self.assertEqual(d.parse("30/06/2026", "day_first"), datetime.date(2026, 6, 30))

    def test_month_first(self):
        self.assertEqual(d.parse("03/31/2013", "month_first"), datetime.date(2013, 3, 31))

    def test_an_impossible_reading_is_retried_the_other_way(self):
        # Day-first is claimed but 31 cannot be a month: read it the other way
        # rather than dropping the date, which is what used to happen.
        self.assertEqual(d.parse("03/31/2013", "day_first"), datetime.date(2013, 3, 31))

    def test_junk_is_none_not_an_exception(self):
        self.assertIsNone(d.parse("not a date", "day_first"))
        self.assertIsNone(d.parse("45/45/2026", "day_first"))


class Labels(unittest.TestCase):
    def test_reads_the_labelled_field_in_the_filings_own_order(self):
        text = "Coupon No. : 21 Payment Date : 21/06/2026 Ex-Dividend Date : 15/06/2026"
        self.assertEqual(d.after_label(text, "Payment Date"), datetime.date(2026, 6, 21))
        self.assertEqual(d.after_label(text, "Ex-Dividend Date"), datetime.date(2026, 6, 15))

    def test_missing_label_is_none(self):
        self.assertIsNone(d.after_label("nothing here", "Payment Date"))


if __name__ == "__main__":
    unittest.main()
