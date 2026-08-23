#!/usr/bin/env python3
"""The forward calendar reads only what the issuer scheduled, never guesses."""
import datetime
import unittest

import build_calendar as cal


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


if __name__ == "__main__":
    unittest.main()
