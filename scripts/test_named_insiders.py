#!/usr/bin/env python3
"""What the named-insider reader refuses.

This is the one builder in the repository that attaches a REAL PERSON'S NAME to
a share trade, read by a model off a scan. A misread that produced a plausible
name would put a named individual against a transaction they did not make, and
no reader could tell from the page. Every test here is one way that is stopped.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import contextlib
import io
import json
import pathlib
import sys
import tempfile
import unittest
from unittest import mock

import build_named_insiders as named
from step_outcome import NO_PROGRESS


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


class TheRun(unittest.TestCase):
    """What a build learns from this step, and what nothing answering costs it.

    From 10 to 16 Sep 2026 every build printed "0 read, 6 unreachable" and
    exited 0: the fetch looked for Scrapling at a path on one laptop, found
    nothing, and the build could not tell that from a quiet day.
    """

    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = pathlib.Path(tmp.name)
        for name, path in (("LEDGER", root / "ledger.json"), ("STORE", root / "store.json"),
                           ("PDF_DIR", root / "pdfs"), ("REPO", root)):
            patcher = mock.patch.object(named, name, path)
            patcher.start()
            self.addCleanup(patcher.stop)
        forms = [{"filingId": str(292240 + i), "ticker": "MBSC",
                  "titleArabic": "مصر بنى سويف للاسمنت (MBSC.CA) - بيان بخصوص نموذج إفصاح",
                  "publishedAt": "2026-09-01T10:00:00", "sessionDate": "2026-08-31",
                  "attachments": [f"https://example.invalid/{i}.pdf"]} for i in range(6)]
        named.LEDGER.write_text(json.dumps({"postExecutionDisclosures": forms}),
                                encoding="utf-8")
        self.fetched, self.read = [], []

    def fetch(self, ok):
        def fetch_pdf(url, into):
            self.fetched.append(url)
            ok_now = ok(len(self.fetched)) if callable(ok) else ok
            if ok_now:
                into.write_bytes(b"%PDF-1.6 test")
            return ok_now
        return fetch_pdf

    def reader(self, answer):
        def read_form(pdf, *args, **kwargs):
            self.read.append(pdf.name)
            return answer
        return read_form

    def run_main(self, fetch, read, *argv):
        with mock.patch.object(named, "fetch_pdf", fetch), \
             mock.patch.object(named, "read_form", read), \
             mock.patch.object(named, "read_form_agy", lambda pdf: self.fail("agy in CI")), \
             mock.patch.object(sys, "argv", ["build_named_insiders.py", "--limit", "6",
                                             "--engine", "vertex", *argv]), \
             contextlib.redirect_stdout(io.StringIO()) as out:
            code = named.main()
        return code, out.getvalue()

    def store(self):
        return json.loads(named.STORE.read_text(encoding="utf-8"))

    def test_a_run_that_fetches_nothing_says_so(self):
        code, out = self.run_main(self.fetch(False), self.reader(reading()))
        self.assertEqual(code, NO_PROGRESS, out)

    def test_it_stops_asking_once_nothing_comes_back_twice(self):
        # Six downloads the exchange refuses, each up to three minutes, is a
        # quarter of an hour of a runner that learns nothing.
        self.run_main(self.fetch(False), self.reader(reading()))
        self.assertEqual(len(self.fetched), named.GIVE_UP_AFTER)

    def test_a_model_that_answers_nothing_stops_the_run_too(self):
        code, _ = self.run_main(self.fetch(True), self.reader(None))
        self.assertEqual(code, NO_PROGRESS)
        self.assertEqual(len(self.read), named.GIVE_UP_AFTER)

    def test_one_refused_download_does_not_stop_the_run(self):
        code, _ = self.run_main(self.fetch(lambda n: n != 1), self.reader(reading()))
        self.assertEqual(code, 0)
        self.assertEqual(len(self.fetched), 6)
        self.assertEqual(len(self.store()["readings"]), 5)

    def test_a_reading_is_progress(self):
        code, _ = self.run_main(self.fetch(True), self.reader(reading()))
        self.assertEqual(code, 0)
        self.assertEqual(len(self.store()["readings"]), 6)

    def test_a_refusal_is_progress_too(self):
        """A verdict takes the form out of the queue for good."""
        code, _ = self.run_main(self.fetch(True), self.reader(reading(legible=False)))
        self.assertEqual(code, 0)
        self.assertEqual(len(self.store()["refused"]), 6)

    def test_nothing_left_to_read_is_a_quiet_day_not_a_failure(self):
        named.STORE.write_text(json.dumps({
            "schemaVersion": 1, "refused": {},
            "readings": {str(292240 + i): {} for i in range(6)}}), encoding="utf-8")
        code, _ = self.run_main(self.fetch(False), self.reader(None))
        self.assertEqual(code, 0)
        self.assertEqual(self.fetched, [])


class TheFetch(unittest.TestCase):
    def test_the_interpreter_is_looked_up_not_hardcoded(self):
        with mock.patch.object(named.scrapling_python, "find", lambda: None), \
             mock.patch.object(named.subprocess, "run",
                               side_effect=AssertionError("ran with no interpreter")):
            self.assertFalse(named.fetch_pdf("https://example.invalid/a.pdf",
                                             pathlib.Path("/nonexistent/a.pdf")))
        seen = []
        with tempfile.TemporaryDirectory() as tmp, \
             mock.patch.object(named.scrapling_python, "find",
                               lambda: pathlib.Path("/opt/runner/python3")), \
             mock.patch.object(named.subprocess, "run",
                               side_effect=lambda cmd, **kw: seen.append(cmd[0])):
            named.fetch_pdf("https://example.invalid/a.pdf", pathlib.Path(tmp) / "a.pdf")
        self.assertEqual(seen, ["/opt/runner/python3"])

    def test_the_reader_sends_the_prompt_it_is_given(self):
        sent = []

        def post(model, body, timeout):
            sent.append(json.loads(body))
            return {"candidates": [{"content": {"parts": [{"text": '{"legible": false}'}]}}]}

        with tempfile.TemporaryDirectory() as tmp, \
             mock.patch.object(named.gemini, "_post", post):
            pdf = pathlib.Path(tmp) / "a.pdf"
            pdf.write_bytes(b"%PDF-1.6 test")
            self.assertEqual(named.read_form(pdf), {"legible": False})
            named.read_form(pdf, prompt="another form", max_output_tokens=8000)
        texts = [body["contents"][0]["parts"][1]["text"] for body in sent]
        self.assertEqual(texts, [named.PROMPT, "another form"])
        self.assertEqual(sent[1]["generationConfig"]["maxOutputTokens"], 8000)
