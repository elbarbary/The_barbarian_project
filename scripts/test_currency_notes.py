#!/usr/bin/env python3
"""A currency exposure is a figure somebody filed, or it is not an exposure.

Three things can turn this collector into a confident liar, and there is a test
here for each: reading the translation policy every statement carries as though
it were a position, accepting a number only one of the two reads saw, and
publishing a number at the wrong magnitude because the two reads disagreed
about the column heading rather than the digits.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import contextlib
import hashlib
import json
import pathlib
import re
import tempfile
import unittest
from unittest import mock

import build_currency_notes as notes


def reading(position=None, result=None, unit="units", denominated="EGP"):
    document = {"position": None, "fxResult": None}
    if position is not None:
        document["position"] = {"page": 30, "asOf": "2026-06-30", "unit": unit,
                                "denominatedIn": denominated,
                                "currencies": position}
    if result is not None:
        document["fxResult"] = {"page": 11, "unit": unit, "amount": result,
                                "printed": "أرباح فروق عملة"}
    return document


class Flattening(unittest.TestCase):
    def test_presentation_forms_become_the_letters_they_draw(self):
        # This is the whole reason a search for the note found nothing:
        # pdftotext hands these filings their glyphs, and ﺍﻟﻌﻤﻼﺕ is not a
        # string that contains العملات until it is normalised.
        drawn = "ﺍﻟﻌﻤﻻﺕ"       # ﺍﻟﻌﻤﻼﺕ, as glyphs
        self.assertNotIn("العملات", drawn)
        self.assertIn("العملات", notes.flatten(drawn))

    def test_bidi_controls_are_not_part_of_the_word(self):
        self.assertEqual(notes.flatten("‫دولار‬"), "دولار")

    def test_arabic_indic_digits_are_digits(self):
        self.assertEqual(notes.flatten("١٢٣٤٥٦٧٨٩٠"), "1234567890")
        self.assertEqual(notes.flatten("۱۲۳"), "123")


class NumberTokens(unittest.TestCase):
    def test_a_figure_is_a_whole_token_not_a_substring(self):
        # With the separators stripped from the whole document, 785782 is
        # "present" inside 1785782 and the grounding check waves through a
        # figure that was never printed.
        tokens = notes.number_tokens("1 785 782")
        self.assertTrue(notes.printed(1785782, tokens))
        self.assertFalse(notes.printed(785782, tokens))

    def test_separators_are_not_part_of_the_number(self):
        for printed_form in ("785 782", "785,782", "785٬782"):
            self.assertTrue(notes.printed(785782, notes.number_tokens(printed_form)),
                            printed_form)

    def test_a_deficit_is_printed_without_its_sign(self):
        # The note prints a deficit as (232 981). The minus is ours.
        self.assertTrue(notes.printed(-232981, notes.number_tokens("(232 981)")))

    def test_a_figure_nobody_printed_is_not_printed(self):
        self.assertFalse(notes.printed(999999, notes.number_tokens("785 782")))

    def test_nothing_is_grounded_against_an_empty_document(self):
        self.assertFalse(notes.printed(785782, set()))


class ColumnsAndNumbers(unittest.TestCase):
    def test_two_cells_on_one_line_are_two_numbers(self):
        # ASCM's note prints two columns of one row as
        # `349,543,948          186,321,432`. Read as one number that is an
        # eighteen-digit figure in no filing anywhere — and every figure ASCM
        # and ADIB had filed was thrown away as "not printed" because of it.
        tokens = notes.number_tokens("349,543,948          186,321,432")
        self.assertTrue(notes.printed(349543948, tokens))
        self.assertTrue(notes.printed(186321432, tokens))
        self.assertFalse(notes.printed(349543948186321432, tokens))

    def test_a_number_grouped_with_spaces_is_still_one_number(self):
        # And LCSW prints four million as `4 248 345`, in the same archive.
        tokens = notes.number_tokens("4 248 345")
        self.assertTrue(notes.printed(4248345, tokens))

    def test_a_period_can_group_thousands_or_mark_a_decimal(self):
        tokens = notes.number_tokens("71.711.402")
        self.assertTrue(notes.printed(71711402, tokens))
        self.assertTrue(notes.printed(71.711402, notes.number_tokens("71.711402")))

    def test_a_page_that_prints_no_numbers_is_nothing_to_check_against(self):
        # ADIB's currency note is a page of Arabic prose with the table pasted
        # in as a picture: twenty numbers extract from it, every one a note
        # number or a year. Checking a filed figure against that page is
        # checking it against nothing, and it dropped all five currencies the
        # bank disclosed and both readers had agreed on.
        prose = "الإيضاحات المتممة 3 إدارة المخاطر المالية 2026 30 15 21"
        self.assertEqual(notes.checkable(prose), set())
        table = " ".join(f"{n},{n:03d},{n:03d}" for n in range(100, 140))
        self.assertGreaterEqual(len(notes.checkable(table)), notes.NUMERIC_PAGE)


class WhichColumn(unittest.TestCase):
    def test_both_readers_are_told_which_period_to_read(self):
        # The note prints the current period beside its comparative. Told
        # neither, LCSW's two readers took 30 June 2026 and 31 December 2025 —
        # both correct — and all four of its currencies were thrown away as a
        # disagreement.
        seen = []

        def remember(parts, **kw):
            seen.append(" ".join(p.get("text", "") for p in parts))
            return None

        with mock.patch.object(notes, "_ask", remember):
            notes.discover(pathlib.Path(__file__), "2026-06-30")
            notes.audit([], "2026-06-30")
        self.assertEqual(len(seen), 2)
        for prompt in seen:
            self.assertIn("2026-06-30", prompt)
            self.assertIn("never the comparative", prompt)
        self.assertNotIn("{period_end}", " ".join(seen))

    def test_a_loss_is_negative_even_where_it_is_printed_without_a_sign(self):
        for prompt in (notes.DISCOVERY_PROMPT, notes.AUDIT_PROMPT):
            self.assertIn("خسائر", prompt)
            self.assertIn("negative", prompt)


class WhichDocument(unittest.TestCase):
    def test_the_filing_is_the_document_the_statement_was_read_from(self):
        # One filing id names several attachments and they are different
        # documents: LCSW's consolidated note puts the net dollar position at
        # 785,782 and its standalone one at 376,446. Picking by filename took
        # the wrong document for 24 of the 65 filings that had one on disk, and
        # the currency figure would then have been divided by a net income out
        # of a different set of accounts.
        with tempfile.TemporaryDirectory() as folder:
            cache = pathlib.Path(folder)
            (cache / "review").mkdir()
            wrong = cache / "egx-291.pdf"
            wrong.write_bytes(b"%PDF-1.4 the consolidated one")
            right = cache / "review" / "AAAA-egx-291-3-deadbeef.pdf"
            right.write_bytes(b"%PDF-1.4 the one the statement was read from")
            want = hashlib.sha256(right.read_bytes()).hexdigest()
            notes._cached_documents.cache_clear()
            with mock.patch.object(notes, "CACHE", cache), \
                 mock.patch.object(notes, "NOTES_CACHE", cache / "notes"), \
                 mock.patch.object(notes, "REVIEW", cache / "review"):
                self.assertEqual(notes.local_pdf({"pdf_sha256": want}), right)
                notes._cached_documents.cache_clear()
                self.assertIsNone(notes.local_pdf({"pdf_sha256": "0" * 64}))
                notes._cached_documents.cache_clear()
                self.assertIsNone(notes.local_pdf({}))
        notes._cached_documents.cache_clear()


class Units(unittest.TestCase):
    def test_the_column_heading_sets_the_magnitude(self):
        self.assertEqual(notes.in_millions(121034153, "units"), 121.034153)
        self.assertEqual(notes.in_millions(121034, "thousands"), 121.034)
        self.assertEqual(notes.in_millions(121.034, "millions"), 121.034)

    def test_a_unit_that_is_not_one_of_the_three_is_refused(self):
        self.assertIsNone(notes.in_millions(1, "billions"))
        self.assertIsNone(notes.in_millions(1, None))


class NetPosition(unittest.TestCase):
    def test_the_two_sides_make_the_net_when_the_net_is_not_printed(self):
        self.assertEqual(notes._net({"assets": 900, "liabilities": 250}), 650.0)

    def test_the_printed_net_is_preferred_to_arithmetic(self):
        self.assertEqual(notes._net({"assets": 900, "liabilities": 250, "net": 640}), 640.0)

    def test_a_currency_outside_the_closed_vocabulary_is_dropped(self):
        rows = [{"code": "USD", "net": 1_000_000}, {"code": "GOLD", "net": 5_000_000}]
        self.assertEqual(notes._positions(reading(position=rows)), {"USD": 1.0})


class Agreement(unittest.TestCase):
    def test_a_figure_both_reads_saw_is_kept(self):
        rows = [{"code": "USD", "net": 785782}]
        kept, dropped = notes.agree(reading(rows, 18003398), reading(rows, 18003398), set())
        self.assertEqual(kept["position"], {"USD": 0.785782})
        self.assertEqual(kept["fxResult"], 18.003398)
        self.assertEqual(dropped, [])

    def test_a_figure_only_one_read_saw_is_dropped(self):
        first = reading([{"code": "USD", "net": 785782}, {"code": "EUR", "net": 5709737}])
        second = reading([{"code": "USD", "net": 785782}])
        kept, dropped = notes.agree(first, second, set())
        self.assertEqual(list(kept["position"]), ["USD"])
        self.assertIn("only one of the two reads", dropped[0]["why"])

    def test_a_disagreement_that_changes_the_published_figure_is_dropped(self):
        # BIOC's two reads gave 207,103,972 and 207,013,972 — a transposition,
        # and 207.104 against 207.014 once published.
        first = reading(result=207103972)
        second = reading(result=207013972)
        kept, dropped = notes.agree(first, second, set())
        self.assertIsNone(kept["fxResult"])
        self.assertIn("disagree", dropped[0]["why"])
        self.assertEqual(dropped[0]["first"], 207.103972)
        self.assertEqual(dropped[0]["second"], 207.013972)

    def test_agreement_is_judged_at_the_precision_the_document_publishes(self):
        # The two have to move together. Loosened by one place, agreement is
        # judged to the nearest ten thousand pounds while the screen still
        # prints thousands — and the published figure stops being the thing
        # the two readers agreed on, which is the only claim this makes.
        a, b = 207104100, 207104900        # 207.104 against 207.105, but both 207.10
        self.assertNotEqual(round(a * 1e-6, notes.PLACES), round(b * 1e-6, notes.PLACES))
        kept, dropped = notes.agree(reading(result=a), reading(result=b), set())
        self.assertIsNone(kept["fxResult"], "agreed on a figure it does not publish")
        self.assertIn("disagree", dropped[0]["why"])

    def test_what_is_published_is_rounded_to_that_same_precision(self):
        store = {"291": {"position": {"USD": 1.0825551}, "fxResult": 1.0825551,
                         "ticker": "AAAA"}}
        filings = {"291": {"ticker": "AAAA", "period_end": "2026-06-30", "fields": {}}}
        with publishing(store, filings) as document:
            row = document["companies"][0]
            self.assertEqual(row["fxResult"], round(1.0825551, notes.PLACES))
            self.assertEqual(row["position"][0]["net"], round(1.0825551, notes.PLACES))

    def test_a_disagreement_below_the_published_figure_is_kept_and_written_down(self):
        # These are scans, and the last digit is the one an eye gets wrong:
        # BONY's reads gave 1,082,172 and 1,082,173. Both support the same
        # published number, so dropping them threw away a figure neither
        # reading contradicts — but the tolerance is recorded, because a
        # tolerance nobody can see afterwards looks like no check at all.
        kept, dropped = notes.agree(reading(result=1082172),
                                    reading(result=1082173), set())
        self.assertEqual(kept["fxResult"], 1.082172)
        self.assertEqual(dropped, [])
        self.assertEqual(kept["narrowed"],
                         [{"what": "fxResult", "first": 1.082172, "second": 1.082173}])

    def test_agreement_to_the_digit_is_not_written_down(self):
        kept, _ = notes.agree(reading(result=1082172), reading(result=1082172), set())
        self.assertEqual(kept["narrowed"], [])

    def test_a_figure_that_rounds_away_to_nothing_is_not_a_figure(self):
        # CIRA's two reads put its sterling position at 311 and 211 pounds.
        # Both publish as 0.000, and a row saying GBP 0.000m is noise wearing
        # the clothes of a disclosure.
        rows = [{"code": "GBP", "net": 311}]
        kept, dropped = notes.agree(reading(rows), reading(rows), set())
        self.assertEqual(kept["position"], {})
        self.assertIn("rounds away", dropped[0]["why"])

    def test_reads_that_share_the_digits_but_not_the_magnitude_are_dropped(self):
        # The failure this is here for: both readers see 121 034, one reads the
        # column heading as thousands and the other does not, and the published
        # figure is out by a factor of a thousand. Agreeing on the digits is
        # not agreeing on the number.
        first = reading([{"code": "USD", "net": 121034}], unit="units")
        second = reading([{"code": "USD", "net": 121034}], unit="thousands")
        kept, dropped = notes.agree(first, second, set())
        self.assertEqual(kept["position"], {})
        self.assertIn("disagree", dropped[0]["why"])

    def test_a_position_the_reads_denominate_differently_is_dropped(self):
        # The table is printed either in the foreign currency or in its pound
        # equivalent, and those differ by about fifty times. Publishing a
        # dollar figure labelled as pounds is the worst outcome available here.
        rows = [{"code": "USD", "net": 785782}]
        first = reading(rows, denominated="EGP")
        second = reading(rows, denominated="foreign")
        kept, dropped = notes.agree(first, second, set())
        self.assertEqual(kept["position"], {})
        self.assertIn("denominated in", dropped[0]["why"])

    def test_an_agreed_denomination_lets_the_position_through(self):
        rows = [{"code": "USD", "net": 785782}]
        kept, _ = notes.agree(reading(rows, denominated="foreign"),
                              reading(rows, denominated="foreign"), set())
        self.assertEqual(kept["position"], {"USD": 0.785782})

    def test_an_fx_result_only_one_read_saw_is_dropped(self):
        kept, dropped = notes.agree(reading(result=18003398), reading(), set())
        self.assertIsNone(kept["fxResult"])
        self.assertEqual(dropped[0]["what"], "fxResult")

    def test_a_document_with_its_own_text_must_also_print_the_figure(self):
        rows = [{"code": "USD", "net": 785782}]
        both = reading(rows, 18003398)
        tokens = notes.number_tokens("دولار أمريكى 785 782")      # the result is absent
        kept, dropped = notes.agree(both, both, tokens)
        self.assertEqual(kept["position"], {"USD": 0.785782})
        self.assertIsNone(kept["fxResult"])
        self.assertIn("not printed", " ".join(d["why"] for d in dropped))

    def test_a_scan_carries_no_text_to_check_and_is_not_punished_for_it(self):
        # Most of these filings are scans. Requiring a text match there would
        # drop every true figure in the archive.
        rows = [{"code": "USD", "net": 785782}]
        kept, _ = notes.agree(reading(rows), reading(rows), set())
        self.assertEqual(kept["position"], {"USD": 0.785782})


class Boilerplate(unittest.TestCase):
    def test_the_translation_policy_is_not_an_exposure(self):
        # Every Egyptian statement says monetary items are translated at the
        # closing rate. A reader that counted it would report that every
        # company on the exchange is currency exposed.
        policy = reading()                                    # no figures at all
        kept, dropped = notes.agree(policy, policy, set())
        self.assertEqual(kept["position"], {})
        self.assertIsNone(kept["fxResult"])
        self.assertEqual(dropped, [])

    def test_a_company_with_no_figure_is_not_published(self):
        with publishing({"291": {"position": {}, "fxResult": None, "ticker": "AAAA"}},
                        {"291": {"ticker": "AAAA", "period_end": "2026-06-30",
                                 "fields": {"net_income": 10.0}}}) as document:
            self.assertEqual(document["companyCount"], 0)


class TheQueue(unittest.TestCase):
    FILINGS = {
        "a2": {"ticker": "AAAA", "period_end": "2026-06-30", "fields": {}},
        "a1": {"ticker": "AAAA", "period_end": "2025-12-31", "fields": {}},
        "b2": {"ticker": "BBBB", "period_end": "2026-06-30", "fields": {}},
        "b1": {"ticker": "BBBB", "period_end": "2025-12-31", "fields": {}},
    }

    def queue(self, readings):
        return [(t, f) for t, f, _ in
                notes.outstanding(self.FILINGS, {"readings": readings}, set(), set())]

    def test_every_company_is_asked_its_newest_filing_first(self):
        # A run cut short by --limit must have given every company its best
        # filing before it gives any company a second one.
        self.assertEqual(self.queue({})[:2], [("AAAA", "a2"), ("BBBB", "b2")])

    def test_a_company_that_answered_is_not_asked_again(self):
        # ABUK's H1 attachment is seventeen pages and prints no currency note;
        # the annual filing behind it carries the full set. That fallback must
        # not also re-read companies that already answered.
        answered = {"a2": {"ticker": "AAAA", "position": {"USD": 1.0}, "fxResult": None}}
        self.assertEqual(self.queue(answered), [("BBBB", "b2"), ("BBBB", "b1")])

    def test_refresh_reaches_a_filing_the_queue_would_otherwise_skip(self):
        # A filing asked for again is usually one whose figures were dropped,
        # so its company has often already answered on a newer filing — which
        # is precisely what the skip rule uses to pass over the older one.
        answered = {"a2": {"ticker": "AAAA", "position": {"USD": 1.0}, "fxResult": None},
                    "a1": {"ticker": "AAAA", "position": {}, "fxResult": None}}
        plain = [(t, f) for t, f, _ in
                 notes.outstanding(self.FILINGS, {"readings": answered}, set(), set())]
        self.assertNotIn(("AAAA", "a1"), plain)
        asked = [(t, f) for t, f, _ in
                 notes.outstanding(self.FILINGS, {"readings": answered}, set(), {"a1"})]
        self.assertIn(("AAAA", "a1"), asked)

    def test_a_company_whose_newest_filing_said_nothing_is_asked_the_one_before(self):
        silent = {"a2": {"ticker": "AAAA", "position": {}, "fxResult": None},
                  "b2": {"ticker": "BBBB", "position": {}, "fxResult": None}}
        self.assertEqual(self.queue(silent), [("AAAA", "a1"), ("BBBB", "b1")])


class Publishing(unittest.TestCase):
    def test_the_share_of_profit_divides_the_numbers_it_prints(self):
        # A reader who divides the two published figures has to get the
        # published share back — the AMPI lesson from the margin channel.
        store = {"291": {"position": {}, "fxResult": 121.0341534, "ticker": "AMOC"}}
        filings = {"291": {"ticker": "AMOC", "period_end": "2026-06-30",
                           "fields": {"net_income": 377.0004}}}
        with publishing(store, filings) as document:
            row = document["companies"][0]
            self.assertEqual(row["shareOfNetIncome"],
                             round(row["fxResult"] / row["netIncome"] * 100, 1))

    def test_a_loss_making_company_gets_no_share_of_profit(self):
        store = {"291": {"position": {}, "fxResult": 12.0, "ticker": "AAAA"}}
        filings = {"291": {"ticker": "AAAA", "period_end": "2026-06-30",
                           "fields": {"net_income": -40.0}}}
        with publishing(store, filings) as document:
            row = document["companies"][0]
            self.assertIsNone(row["shareOfNetIncome"])
            self.assertEqual(row["netIncome"], -40.0)

    def test_a_dropped_figure_takes_its_citation_with_it(self):
        # A reading whose fx result the two reads disagreed on still holds the
        # line the first read quoted. Published beside no figure, that line
        # says the note was read for something this document does not carry.
        store = {"291": {"position": {}, "fxResult": None, "ticker": "AAAA",
                         "printed": "أرباح فروق عملة", "asOf": "2026-06-30",
                         "denominatedIn": "EGP"}}
        filings = {"291": {"ticker": "AAAA", "period_end": "2026-06-30", "fields": {}}}
        with publishing(store, filings) as document:
            self.assertEqual(document["companyCount"], 0)
        store["291"]["position"] = {"USD": 1.0}
        with publishing(store, filings) as document:
            row = document["companies"][0]
            self.assertIsNone(row["printed"], "a citation without its figure")
            self.assertEqual(row["positionAsOf"], "2026-06-30")

    def test_the_newest_filing_wins(self):
        store = {"1": {"position": {}, "fxResult": 5.0, "ticker": "AAAA"},
                 "2": {"position": {}, "fxResult": 9.0, "ticker": "AAAA"}}
        filings = {"1": {"ticker": "AAAA", "period_end": "2026-03-31", "fields": {}},
                   "2": {"ticker": "AAAA", "period_end": "2026-06-30", "fields": {}}}
        with publishing(store, filings) as document:
            self.assertEqual(document["companyCount"], 1)
            self.assertEqual(document["companies"][0]["fxResult"], 9.0)
            self.assertEqual(document["companies"][0]["filingId"], "2")

    def test_the_company_list_is_alphabetical_and_complete(self):
        # §8: a stated filter returning however many companies it returns is a
        # filter. A list cut to a leaderboard is a recommendation.
        store = {str(i): {"position": {}, "fxResult": float(i), "ticker": t}
                 for i, t in enumerate(["ZZZZ", "AAAA", "MMMM"])}
        filings = {str(i): {"ticker": t, "period_end": "2026-06-30", "fields": {}}
                   for i, t in enumerate(["ZZZZ", "AAAA", "MMMM"])}
        with publishing(store, filings) as document:
            self.assertEqual([c["ticker"] for c in document["companies"]],
                             ["AAAA", "MMMM", "ZZZZ"])


class WhatTheWordsPromise(unittest.TestCase):
    FORBIDDEN = ("forecast", "predict", "expect", "recommend", "buy", "sell",
                 "should", "will rise", "will fall", "target")

    def test_the_basis_promises_nothing_about_a_price(self):
        store = {"291": {"position": {}, "fxResult": 1.0, "ticker": "AAAA"}}
        filings = {"291": {"ticker": "AAAA", "period_end": "2026-06-30", "fields": {}}}
        with publishing(store, filings) as document:
            for sentence in re.split(r"(?<=[.!?])\s+", document["basis"]):
                lowered = sentence.lower()
                # A sentence carrying its own negation is the disclaimer, not
                # the thing disclaimed.
                if "nothing here says" in lowered or "never" in lowered:
                    continue
                for word in self.FORBIDDEN:
                    self.assertNotIn(word, lowered, sentence)


@contextlib.contextmanager
def publishing(readings, filings):
    """Run publish() against a constructed store, writing nowhere real."""
    with tempfile.TemporaryDirectory() as folder:
        out = pathlib.Path(folder) / "currency-notes.json"
        directory = pathlib.Path(folder) / "companies.json"
        tickers = sorted({row["ticker"] for row in filings.values()})
        directory.write_text(json.dumps({"companies": [
            {"ticker": t, "name_en": f"{t} Co.", "sector": "Test"} for t in tickers]}))
        with mock.patch.object(notes, "OUT", out), \
             mock.patch.object(notes, "DIRECTORY", directory):
            yield notes.publish({"readings": readings}, filings)


if __name__ == "__main__":
    unittest.main()
