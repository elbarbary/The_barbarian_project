#!/usr/bin/env python3
"""Which money a listing's figures are in, and the two questions that asks.

The exchange answers this twice and the answers are not the same question.
`currShort` on the market-watch row says what the SHARE IS QUOTED IN; the
"Currency :" line on a results filing says what the BOOKS ARE KEPT IN. They
agree for 218 of the 222 listings that carry both, and the four that do not are
the reason these tests exist rather than a single merged field:

    ORAS   filing "$"               market-watch "L.E"   trades at EGP 822.50
    EALR   filing "$"               market-watch "L.E"
    EGBE   filing "Egyptian Pound"  market-watch "US$"
    TRTO   filing "Egyptian Pound"  market-watch "US$"

Reading either one alone publishes a wrong price for two companies. Reading the
newest capture alone published a wrong price for ten, because the endpoint
returns a different set of securities every time it is called: on 3 September
the 10:00 capture held 223 rows and ten dollar listings, and the 10:08 harvest
held 202 rows and three.
"""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import apply_company_facts as facts  # noqa: E402
import harvest_egx_session as harvest  # noqa: E402

# The two templates the exchange files this line in, verbatim from the archive:
# NDRL's code 292959 and SAIB's code 293027, the filings that named the two
# listings this whole exercise started from.
NDRL = ("Company Name: National Drilling<br />ISIN Code: EGS735N2C012<br />"
        "Currency: US Dollar<br />F/S  Period: From 01/01/2026 to 30/06/2026<br />"
        "Net profit: 3,908,623 <br />Source: National Drilling")
SAIB = ("Company Name : Societe Arabe Internationale De Banque (SAIB)<br />"
        "ISIN Code    : EGS60142C014<br />Currency     : $<br />"
        "F/S Period : From 01/01/2026 To 30/06/2026<br />Net Profit   : 9,318,910")
# The padded form, which is 3,779 filings and every one of them a pound.
PADDED = ("Company Name&nbsp;&nbsp;&nbsp;&nbsp; : X<br />"
          "Currency&nbsp;&nbsp;&nbsp;&nbsp; : LE<br />Net Profit : 1,000")


class Vocabulary(unittest.TestCase):
    """Only what the exchange wrote, and the pound told apart from silence."""

    def test_every_spelling_of_the_dollar_in_the_archive(self):
        for written in ("$", "US Dollar", "US$", "USD", "us dollars", " $ "):
            self.assertEqual(facts.symbol(written), "US$", written)

    def test_the_other_two_currencies_it_has_published(self):
        self.assertEqual(facts.symbol("Kuwaiti Dinar"), "KWD")
        self.assertEqual(facts.symbol("Swiss Franc"), "CHF")
        # Typed by a filer, so the typos are in the list too.
        self.assertEqual(facts.symbol("Swess Franc"), "CHF")

    def test_a_stated_pound_is_not_the_same_answer_as_no_answer(self):
        """False outranks a filing; None must not.

        ORAS is captured as "L.E" and files in "$". If a stated pound came back
        None it would fall through to the filing and a 90.7bn company would
        print at $822.50 a share.
        """
        for written in ("LE", "L.E", "EGP", "Egyptian Pound", "EGB"):
            self.assertIs(facts.symbol(written), False, written)
        self.assertIsNone(facts.symbol(""))
        self.assertIsNone(facts.symbol(None))

    def test_prose_that_contains_the_word_currency_records_nothing(self):
        """The same regex over the same archive also catches sentences."""
        self.assertIsNone(facts.symbol("IDR at 'BB+'. Both ratings have a"))
        self.assertIsNone(facts.symbol("from US Dollar to Egyptian Pound"))


class FilingLine(unittest.TestCase):
    def test_it_reads_both_templates_the_exchange_files(self):
        for body, expected in ((NDRL, "US Dollar"), (SAIB, "$"), (PADDED, "LE")):
            found = facts.CURRENCY_LINE.search(facts.flatten(body))
            self.assertIsNotNone(found, body[:40])
            self.assertEqual(found.group(1).strip(), expected)

    def test_the_entity_padding_is_decoded_before_the_line_is_read(self):
        """`&nbsp;` is not `\\s`, and skipping the decode drops the pounds."""
        self.assertNotIn("&nbsp;", facts.flatten(PADDED))


class Resolution(unittest.TestCase):
    """A capture always wins where one exists. The filing fills silence only."""

    def test_a_pound_capture_beats_a_dollar_filing(self):
        """ORAS reports in dollars and trades at 822.50 pounds."""
        out = facts.currency_of({"ORAS": None}, {"ORAS": "US$"})
        self.assertNotIn("currency", out["ORAS"])
        # But the books are still in dollars, and the screen has to say so —
        # that is why the financials merge has nothing to show for this one.
        self.assertEqual(out["ORAS"]["statement_currency"], "US$")

    def test_a_dollar_capture_beats_a_pound_filing(self):
        """EGBE trades in dollars and reports in pounds."""
        out = facts.currency_of({"EGBE": "US$"}, {})
        self.assertEqual(out["EGBE"]["currency"], "US$")
        self.assertEqual(out["EGBE"]["currency_source"], "EGX market-watch")

    def test_the_filing_answers_only_where_no_capture_ever_did(self):
        """NDRL, and nothing else in the archive.

        63 of the 284 directory rows have never appeared in a market-watch
        capture, and NDRL is the only one whose filing states a foreign
        currency at all.
        """
        out = facts.currency_of({}, {"NDRL": "US$"})
        self.assertEqual(out["NDRL"]["currency"], "US$")
        self.assertEqual(out["NDRL"]["currency_source"], "EGX filing")

    def test_nothing_is_recorded_for_a_listing_neither_source_names(self):
        self.assertEqual(facts.currency_of({"COMI": None}, {}), {})

    def test_a_capture_spelling_nobody_recognises_is_not_a_pound(self):
        """The harvest copies `currShort` through verbatim.

        So an unseen spelling reaches `session.json` unchanged, and reading it
        as the pound would let a listing outrank its own filing on the strength
        of not being understood.
        """
        session = {"securities": {"XXXX": {"currency": "Euro"},
                                  "COMI": {"market_cap": 473e9}}}
        real, facts.load = facts.load, lambda path: (
            session if path == facts.SESSION else real(path))
        try:
            quotes = facts.quoted()
        finally:
            facts.load = real
        self.assertNotIn("XXXX", quotes)     # not stated, so the filing may answer
        self.assertIsNone(quotes["COMI"])    # absent key IS the pound stated


class HeldAcrossCaptures(unittest.TestCase):
    """The row that fell out of one capture and took its currency with it."""

    def test_a_ticker_absent_from_todays_capture_keeps_what_was_stated(self):
        rows = {"CFGH": {"market_cap": 2.9e9, "currency": "US$"}}
        held = {"harvested": "2026-08-28",
                "securities": {"CFGH": {"currency": "US$"},
                               "SAIB": {"market_cap": 4.2e9, "currency": "US$"}}}
        carried = harvest.carry_currency(rows, held)
        self.assertEqual(carried, {"SAIB": "US$"})
        self.assertEqual(rows["SAIB"], {"currency": "US$",
                                        "currency_stated": "2026-08-28"})

    def test_it_dates_the_statement_and_not_the_run_that_carried_it(self):
        held = {"harvested": "2026-09-03",
                "securities": {"GPPL": {"currency": "US$",
                                        "currency_stated": "2026-09-01"}}}
        rows: dict[str, dict] = {}
        harvest.carry_currency(rows, held)
        self.assertEqual(rows["GPPL"]["currency_stated"], "2026-09-01")

    def test_a_ticker_that_comes_back_quoting_pounds_loses_the_flag(self):
        """The exchange saying "L.E" today beats anything held from before.

        Without this a company that redenominates keeps a dollar flag forever,
        which is the original bug pointing the other way.
        """
        rows = {"EKHO": {"market_cap": 1e9}}          # captured, no currency key
        held = {"harvested": "2026-08-28",
                "securities": {"EKHO": {"currency": "US$"}}}
        self.assertEqual(harvest.carry_currency(rows, held), {})
        self.assertNotIn("currency", rows["EKHO"])

    def test_a_held_currency_does_not_count_as_a_captured_security(self):
        """`count` means what the capture returned, or the source health lies."""
        rows = {"COMI": {"market_cap": 473e9}}
        harvest.carry_currency(rows, {"harvested": "2026-09-01",
                                      "securities": {"SAIB": {"currency": "US$"}}})
        self.assertEqual(len(rows), 2)
        self.assertEqual(sum(1 for v in rows.values() if v.get("market_cap")), 1)


class Archive(unittest.TestCase):
    """The regression itself, against the committed archives on this machine.

    Pinned on what the step RESOLVES rather than on what is currently in
    `public/data`, because those files are rewritten by the build and a test
    that reads them only asks when the build last ran.
    """

    def test_no_currency_the_exchange_has_stated_is_dropped(self):
        """The bug: nine of the twelve dollar listings published as pounds.

        `session.json` on 3 September held three of them. Every capture on disk
        holds twelve, and the difference is entirely which securities the
        endpoint happened to return.
        """
        if not facts.SNAPSHOTS.exists():
            self.skipTest("no capture archive here")
        quotes = facts.quoted()
        foreign = {t for t, c in quotes.items() if c}
        if not foreign:
            self.skipTest("no capture on disk states a foreign currency")
        resolved = facts.stated()
        dropped = sorted(t for t in foreign
                         if not (resolved.get(t) or {}).get("currency"))
        self.assertEqual(dropped, [],
                         f"{len(dropped)} listings the exchange quotes in a "
                         f"foreign currency would publish as pound listings")

    def test_no_price_is_labelled_by_a_filing_the_exchange_contradicts(self):
        """The ORAS guard, on the real archive rather than a fixture."""
        if not facts.FILINGS.exists() or not facts.SNAPSHOTS.exists():
            self.skipTest("no capture or filing archive here")
        quotes = facts.quoted()
        wrong = [t for t, money in facts.currency_of(quotes, facts.filed()).items()
                 if money.get("currency") and t in quotes and not quotes[t]]
        self.assertEqual(wrong, [], "a filing overrode a captured pound quote")

    def test_nothing_published_claims_a_currency_no_source_states(self):
        """The other direction: a currency on a row has to be traceable."""
        directory = facts.load(facts.DIRECTORY).get("companies") or []
        if not directory or not facts.SNAPSHOTS.exists():
            self.skipTest("no published directory or capture archive here")
        resolved = facts.stated()
        invented = [(row["ticker"], row["currency"]) for row in directory
                    if row.get("currency")
                    and (resolved.get(row["ticker"]) or {}).get("currency")
                    != row["currency"]]
        self.assertEqual(invented, [], "published without a source saying so")


if __name__ == "__main__":
    unittest.main()
