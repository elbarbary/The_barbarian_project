#!/usr/bin/env python3
"""A delisted company keeps its page and its price, and says what it is.

NCGC still changes hands over the counter, so hiding it would hide a real
share from the people who hold it. The note is what keeps it from reading as a
company that trades on the exchange.
"""
import json
import pathlib
import tempfile
import unittest
from unittest import mock

import apply_listing_status as apply
import build_all
import macro_types

NCGC = {"ticker": "NCGC", "isin": "EGS32131C012", "delisted_on": "2021-06-14",
        "news_id": 211501, "kind": "voluntary",
        "link": "https://www.egx.com.eg/en/NewsDetails.aspx?NewsID=211501"}


class TheNote(unittest.TestCase):
    def test_it_is_the_notice_in_both_languages(self):
        got = apply.note(NCGC)
        self.assertEqual(got["status"], "delisted")
        self.assertEqual(got["market"], "OTC")
        self.assertEqual((got["delisted_on"], got["news_id"], got["link"]),
                         ("2021-06-14", 211501, NCGC["link"]))
        for text in (got["note"], got["note_ar"]):
            self.assertIn("2021-06-14", text)
            self.assertIn("211501", text)
        self.assertIn("over the counter", got["note"])
        # The exchange's own phrase for where the shares went.
        self.assertIn("خارج المقصورة", got["note_ar"])

    def test_it_names_the_two_days_the_system_trades(self):
        # EGX's OTC overview: "weekly on Monday and Wednesday". A Thursday
        # price is Wednesday's, and a reader who is not told reads it as
        # Thursday's.
        got = apply.note(NCGC)
        self.assertEqual(got["trading_days"], ["monday", "wednesday"])
        self.assertEqual(got["trading_days_link"],
                         "https://www.egx.com.eg/en/OTC-Overview.aspx")
        self.assertIn("only on Mondays and Wednesdays", got["note"])
        self.assertIn("يومي الاثنين والأربعاء فقط", got["note_ar"])

    def test_it_states_a_fact_and_advises_nothing(self):
        # §8. "Trades over the counter" is where the shares are dealt, not a
        # suggestion to deal in them.
        got = apply.note(NCGC)
        for text in (got["note"], got["note_ar"]):
            self.assertFalse(any(p.search(text) for p in macro_types.DIRECTIVE), text)


class OnTheDocuments(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = pathlib.Path(tmp.name)
        self.api = root / "api"
        self.fixtures = root / "fixtures"
        for base in (self.api, self.fixtures):
            (base / "companies").mkdir(parents=True)
            body = json.dumps({"updated_at": "2026-09-14", "companies": [
                {"ticker": "NCGC", "name_en": "Nile Cotton Ginning", "market_cap": 2649625015},
                {"ticker": "COMI", "name_en": "Commercial International Bank"},
            ]}, separators=(",", ":")) + "\n"
            (base / "companies.json").write_text(body, encoding="utf-8")
            for ticker in ("NCGC", "COMI"):
                (base / "companies" / f"{ticker}.json").write_text(
                    json.dumps({"ticker": ticker, "market": {"last_close": 50.0}}),
                    encoding="utf-8")
        for name, value in (("DIRECTORY", self.api / "companies.json"),
                            ("COMPANIES", self.api / "companies"),
                            ("FIXTURES", self.fixtures)):
            patcher = mock.patch.object(apply, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def run_apply(self, notes, write=True):
        with mock.patch("builtins.print"):
            return apply.apply(write, notes=notes)

    def read(self, path):
        return json.loads(path.read_text(encoding="utf-8"))

    def rows(self, base):
        return {r["ticker"]: r for r in self.read(base / "companies.json")["companies"]}

    def test_the_company_stays_and_carries_the_note(self):
        self.run_apply({"NCGC": apply.note(NCGC)})
        for base in (self.api, self.fixtures):
            rows = self.rows(base)
            self.assertEqual(rows["NCGC"]["listing"]["news_id"], 211501)
            # Still there, figures and all: it is a real share, dealt in off
            # the exchange.
            self.assertEqual(rows["NCGC"]["market_cap"], 2649625015)
            self.assertNotIn("listing", rows["COMI"])
            doc = self.read(base / "companies" / "NCGC.json")
            self.assertEqual(doc["listing"]["status"], "delisted")
            self.assertEqual(doc["market"]["last_close"], 50.0)
            self.assertNotIn("listing", self.read(base / "companies" / "COMI.json"))

    def test_the_bundled_directory_is_byte_for_byte_the_published_one(self):
        self.run_apply({"NCGC": apply.note(NCGC)})
        published = (self.api / "companies.json").read_bytes()
        self.assertEqual((self.fixtures / "companies.json").read_bytes(), published)
        self.assertTrue(published.endswith(b"\n"))

    def test_a_second_run_changes_nothing(self):
        self.run_apply({"NCGC": apply.note(NCGC)})
        before = {p: p.read_bytes() for p in pathlib.Path(self.api).rglob("*.json")}
        self.run_apply({"NCGC": apply.note(NCGC)})
        self.assertEqual({p: p.read_bytes() for p in before}, before)

    def test_a_relisted_company_loses_the_note(self):
        # CIRA, MMHC and TOUR were all delisted once and listed again.
        self.run_apply({"NCGC": apply.note(NCGC)})
        self.run_apply({})
        self.assertNotIn("listing", self.rows(self.api)["NCGC"])
        self.assertNotIn("listing", self.read(self.api / "companies" / "NCGC.json"))

    def test_check_writes_nothing(self):
        before = (self.api / "companies.json").read_bytes()
        self.run_apply({"NCGC": apply.note(NCGC)}, write=False)
        self.assertEqual((self.api / "companies.json").read_bytes(), before)

    def test_no_archive_is_not_the_same_as_nobody_delisted(self):
        self.run_apply({"NCGC": apply.note(NCGC)})
        with mock.patch.object(apply.listing_status, "load_items", lambda: []), \
                mock.patch("builtins.print"):
            apply.apply(True)
        self.assertIn("listing", self.rows(self.api)["NCGC"])


class InTheBuild(unittest.TestCase):
    def test_it_runs_after_the_market_build_that_recreates_the_documents(self):
        names = [step[0] for step in build_all.STEPS]
        scripts = {step[0]: step[1] for step in build_all.STEPS}
        self.assertEqual(scripts["Listing status"], "apply_listing_status.py")
        self.assertGreater(names.index("Listing status"), names.index("Market"))


if __name__ == "__main__":
    unittest.main()
