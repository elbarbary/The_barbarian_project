#!/usr/bin/env python3
"""A company is one company under every code the exchange has given it.

The synthetic filings below are shaped on real ones, named beside each test.
The archive tests at the bottom read the committed record up to 17 September
2026, the day ARVA and ICMI were found splitting two companies on the
ownership board.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import gzip
import json
import pathlib
import tempfile
import unittest

import listing_codes as lc
import listing_status as ls

FROZEN = "2026-09-17"


def filing(news_id, stamp, ticker, isin):
    return {"code": news_id, "dateStamp": f"{stamp}T10:00:00",
            "heading": f"Some Company ({ticker}.CA) - Board of Directors' Decisions",
            "headingArabic": "", "secId": 3, "isin": isin, "content": ""}


def filings(ticker, isin, stamp, start, count=3):
    return [filing(start + n, stamp, ticker, isin) for n in range(count)]


def folds(items, watch, directory):
    return {old: row["code"] for old, row in lc.derive(items, watch, set(directory)).items()}


ARVA_ISIN = "EGS3E1E1C013"


class Derive(unittest.TestCase):
    def test_an_earlier_code_folds_into_the_code_the_watch_quotes(self):
        # ARVA.CA filed from 2010; the Listing Committee renamed it AMII.CA on
        # 22 Jul 2026 (NewsID 291839), and the market watch quotes EGS3E1E1C013
        # as AMII.
        items = (filings("ARVA", ARVA_ISIN, "2010-02-03", 1)
                 + filings("AMII", ARVA_ISIN, "2026-07-27", 100))
        self.assertEqual(folds(items, {ARVA_ISIN: "AMII"}, {"AMII"}), {"ARVA": "AMII"})

    def test_a_chain_folds_straight_into_todays_code(self):
        # NSGB became QNBA in 2014 and QNBA became QNBE in 2024 (NewsID 254852).
        isin = "EGS60081C014"
        items = (filings("NSGB", isin, "2010-02-18", 1)
                 + filings("QNBA", isin, "2014-01-02", 100)
                 + filings("QNBE", isin, "2024-07-08", 200))
        self.assertEqual(folds(items, {isin: "QNBE"}, {"QNBE"}),
                         {"NSGB": "QNBE", "QNBA": "QNBE"})

    def test_a_new_code_with_nothing_filed_under_it_yet_still_takes_the_old_one(self):
        # A rename announced this afternoon: the watch quotes the new code
        # before any filing has been titled with it.
        items = filings("HAVC", "EGS69921C012", "2025-07-31", 1)
        self.assertEqual(folds(items, {"EGS69921C012": "GROV"}, {"GROV"}), {"HAVC": "GROV"})

    def test_a_stray_pairing_does_not_stop_a_rename(self):
        # PORT's filings carry Amer Group's ISIN twice in 561, from the demerger
        # that created Porto Group.
        items = (filings("PORT", "EGS694A1C018", "2015-10-20", 1, count=40)
                 + [filing(900, "2016-01-01", "PORT", "EGS675S1C011")]
                 + filings("ARAB", "EGS694A1C018", "2022-03-08", 100))
        self.assertEqual(folds(items, {"EGS694A1C018": "ARAB"}, {"ARAB"}), {"PORT": "ARAB"})

    def test_a_code_two_listings_used_in_turn_is_not_folded(self):
        # Sixty filings for one listing and forty for another is not a stray
        # pairing. It is a code handed on, and neither listing owns its record.
        items = (filings("OLDC", "EGS000000001", "2010-01-01", 1, count=60)
                 + filings("OLDC", "EGS000000002", "2018-01-01", 100, count=40)
                 + filings("NEWC", "EGS000000001", "2020-01-01", 200))
        self.assertEqual(folds(items, {"EGS000000001": "NEWC"}, {"NEWC"}), {})

    def test_a_listed_ticker_is_never_folded(self):
        # SEIGA and SEIG file under one ISIN, and SEIGA's one filing is the
        # older. Both are directory tickers, and a listed line is not a former
        # code of the other one.
        isin = "EGS67031C012"
        items = (filings("SEIGA", isin, "2010-04-06", 1, count=1)
                 + filings("SEIG", isin, "2013-10-29", 100))
        self.assertEqual(folds(items, {isin: "SEIG"}, {"SEIG", "SEIGA"}), {})

    def test_a_code_the_watch_quotes_is_never_folded(self):
        # A code handed to a new listing that the watch quotes today is that
        # listing's code, whatever the archive filed under it before.
        items = (filings("OLDC", "EGS000000001", "2010-01-01", 1)
                 + filings("NEWC", "EGS000000001", "2020-01-01", 100))
        watch = {"EGS000000001": "NEWC", "EGS000000009": "OLDC"}
        self.assertEqual(folds(items, watch, {"NEWC", "OLDC2"}), {})

    def test_the_watch_has_to_quote_the_isin(self):
        # EBDP filed until Oct 2022 and BIDI, a directory ticker, since, under
        # one ISIN. The watch does not quote it, so nothing the exchange
        # publishes today says what that listing is called.
        isin = "EGS3A2Z1C015"
        items = (filings("EBDP", isin, "2010-03-11", 1)
                 + filings("BIDI", isin, "2022-10-27", 100))
        self.assertEqual(folds(items, {"EGS000000001": "COMI"}, {"BIDI", "COMI"}), {})

    def test_the_code_the_watch_quotes_has_to_be_a_listed_ticker(self):
        # Arabia Investments Holding: AIND, then AINH, then AIH (NewsID 184944),
        # and the watch now quotes the ISIN as AIHC, after a demerger (274173).
        # The directory lists AIH. Which half kept which code is not something
        # the archive says, so no code folds.
        isin = "EGS21351C019"
        items = (filings("AIND", isin, "2011-04-14", 1)
                 + filings("AINH", isin, "2019-04-01", 100)
                 + filings("AIH", isin, "2019-05-05", 200)
                 + filings("AIHC", isin, "2025-09-17", 300))
        self.assertEqual(folds(items, {isin: "AIHC"}, {"AIH"}), {})

    def test_a_code_that_began_after_the_current_one_is_not_its_former_code(self):
        # CAEG's two filings came in 2015 and 2017 under Credit Agricole
        # Egypt's ISIN, five years after CIEB's first.
        isin = "EGS60041C018"
        items = (filings("CIEB", isin, "2010-02-15", 1)
                 + filings("CAEG", isin, "2015-11-25", 100, count=1))
        self.assertEqual(folds(items, {isin: "CIEB"}, {"CIEB"}), {})

    def test_the_evidence_is_kept_beside_the_fold(self):
        items = (filings("ARVA", ARVA_ISIN, "2010-02-03", 1)
                 + filings("AMII", ARVA_ISIN, "2026-07-27", 100))
        row = lc.derive(items, {ARVA_ISIN: "AMII"}, {"AMII"})["ARVA"]
        self.assertEqual((row["isin"], row["filings"], row["since"], row["currentSince"]),
                         (ARVA_ISIN, 3, "2010-02-03", "2026-07-27"))


class OnDisk(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = pathlib.Path(tmp.name)

    def write(self, items, watch, directory):
        archive = self.root / "archive"
        archive.mkdir()
        (archive / "2026-07.json.gz").write_bytes(
            gzip.compress(json.dumps({"items": items}).encode("utf-8")))
        session = self.root / "watch.json"
        session.write_text(json.dumps({"isins": {isin: {"code": code, "stated": "x"}
                                                 for isin, code in watch.items()}}),
                           encoding="utf-8")
        companies = self.root / "companies.json"
        companies.write_text(json.dumps({"companies": [{"ticker": t} for t in directory]}),
                             encoding="utf-8")
        return archive, session, companies

    def test_the_three_inputs_are_read_off_disk(self):
        items = (filings("ARVA", ARVA_ISIN, "2010-02-03", 1)
                 + filings("AMII", ARVA_ISIN, "2026-07-27", 100))
        archive, session, companies = self.write(items, {ARVA_ISIN: "AMII"}, ["AMII"])
        self.assertEqual(lc.renamed(archive, session, companies), {"ARVA": "AMII"})

    def test_any_input_missing_folds_nothing(self):
        # Every caller then keys by the code its filing printed, as before.
        items = (filings("ARVA", ARVA_ISIN, "2010-02-03", 1)
                 + filings("AMII", ARVA_ISIN, "2026-07-27", 100))
        archive, session, companies = self.write(items, {ARVA_ISIN: "AMII"}, ["AMII"])
        missing = self.root / "missing"
        self.assertEqual(lc.renamed(missing, session, companies), {})
        self.assertEqual(lc.renamed(archive, missing, companies), {})
        self.assertEqual(lc.renamed(archive, session, missing), {})


class TheArchiveAsFound(unittest.TestCase):
    """The committed record, up to the day the split board was reported.

    The market watch and the directory are read as they are, so an expectation
    is what the watch quotes a notice's ISIN under, not a code typed here: a
    company renamed again next year still has to fold into its code then.
    """

    @classmethod
    def setUpClass(cls):
        cls.items = [i for i in ls.load_items() if str(i.get("dateStamp") or "")[:10] <= FROZEN]
        cls.watch = lc.market_watch()
        cls.directory = lc.listed()
        cls.codes = {old: row["code"] for old, row in
                     lc.derive(cls.items, cls.watch, cls.directory).items()}
        cls.notices = {int(i.get("code") or 0): i for i in cls.items}

    def quoted(self, isin):
        return self.watch[isin]

    def test_arva_and_icmi_fold_into_the_companies_the_watch_quotes(self):
        self.assertEqual(self.codes.get("ARVA"), self.quoted("EGS3E1E1C013"))
        self.assertEqual(self.codes.get("ICMI"), self.quoted("EGS3I0S1C019"))
        self.assertIn(self.codes["ARVA"], self.directory)
        self.assertIn(self.codes["ICMI"], self.directory)

    def test_every_code_modification_notice_for_a_quoted_listing_is_honoured(self):
        # The subject of each Name & Ticker's Code Modification (or Reuters Code)
        # notice, by NewsID, where the watch quotes its ISIN under a directory
        # ticker. The notices' own ISIN field names the listing; REAC's arrives
        # cut to eleven characters.
        subjects = {291839: "ARVA", 286906: "ANFI", 285693: "ICMI", 283073: "EIUD",
                    279691: "EKHO", 273587: "REAC", 267288: "EDBM", 261898: "CILB",
                    254852: "QNBA", 254326: "MBEN", 141493: "BCFI", 102295: "AICO"}
        for news_id, old in subjects.items():
            field = ls._isin_field(self.notices[news_id])
            isin = next(i for i in self.watch if i.startswith(field))
            self.assertEqual(self.codes.get(old), self.quoted(isin), f"{old} ({news_id})")

    def test_porto_group_folds_with_no_notice_to_read(self):
        # Porto Group became Arab Developers Holding under one ISIN and kept
        # filing as PORT.CA until June 2026. Its register split the board too.
        self.assertEqual(self.codes.get("PORT"), self.quoted("EGS694A1C018"))

    def test_what_the_board_still_names_outside_the_directory_stays_as_filed(self):
        # Delisted (GOCO, ACRO, MKIT), a fund's certificates (KASABF), and AIHC,
        # which the directory lists as AIH after a demerger nothing here reads.
        for code in ("GOCO", "ACRO", "MKIT", "KASABF", "AIHC"):
            self.assertNotIn(code, self.codes, code)

    def test_a_single_filing_under_another_listings_isin_folds_nothing(self):
        # SIDC's one filing (294617, Chemical Development Industries) carries
        # the ISIN of MITR's temporary listing; CAEG's and MGOI's sit inside
        # CIEB's and AJWA's own records.
        for code in ("SIDC", "CAEG", "MGOI"):
            self.assertNotIn(code, self.codes, code)

    def test_no_listed_ticker_is_folded_and_nothing_folds_twice(self):
        self.assertEqual(set(self.codes) & self.directory, set())
        self.assertEqual(set(self.codes) & set(self.codes.values()), set())
        self.assertLessEqual(set(self.codes.values()), self.directory)


if __name__ == "__main__":
    unittest.main()
