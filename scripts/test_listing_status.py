#!/usr/bin/env python3
"""A company is delisted when the exchange's last word on it says so — and only then.

The synthetic notices below are shaped on real ones, named beside each test.
The archive tests at the bottom freeze the record at 13 September 2026, the day
the NCGC case was found, so a relisting announced next month cannot turn this
suite red and hold up a publish.
"""
import datetime
import gzip
import json
import pathlib
import tempfile
import unittest

import listing_status as ls

FROZEN = "2026-09-13"


def notice(code, stamp, heading, arabic="", *, sec=11, isin="", body=""):
    return {"code": code, "dateStamp": f"{stamp}T10:00:00", "heading": heading,
            "headingArabic": arabic, "secId": sec, "isin": isin, "content": body}


def filing(code, stamp, ticker, *, sec=3, isin=""):
    return notice(code, stamp, f"Some Company ({ticker}.CA) - Board of Directors' Decisions",
                  sec=sec, isin=isin)


# Enough ordinary filings to pair a ticker with its ISIN, dated before every
# notice the tests below decide — a filing AFTER a delisting is evidence
# against it, which is a test of its own.
def history(ticker, isin, start=1000):
    return [filing(start + i, "2009-01-01", ticker, isin=isin) for i in range(3)]


class Classify(unittest.TestCase):
    def test_the_final_approval_is_a_delisting(self):
        # NewsID 211501.
        got = ls.classify(notice(1, "2021-06-14",
                                 "Approving the Final Voluntary Deli-sting for Nile Cotton "
                                 "Ginning Co. (NCGC.CA)",
                                 "الشطب النهائى لشركة النيل لحليج الاقطان (NCGC.CA)"))
        self.assertEqual(got, ("delisted", "voluntary"))

    def test_the_request_and_the_permission_are_steps_not_a_delisting(self):
        # NewsIDs 208259 and 208831, two and ten weeks before 211501.
        self.assertIsNone(ls.classify(notice(1, "2021-03-25",
                                             "De-listing Request: The Nile Cotton Ginning Co.",
                                             "طلب شطب قيد: النيل لحليج الاقطان")))
        self.assertIsNone(ls.classify(notice(2, "2021-04-05",
                                             "Allowing The Nile Cotton Ginning Co. (NCGC.CA) to "
                                             "Go through the Procedures of the Voluntary De-listing",
                                             "السير فى اجراءات الشطب لشركة النيل لحليج الاقطان")))

    def test_an_arabic_step_outranks_an_english_heading_that_does_not_say(self):
        # NewsID 271913: "Mandatory Delisting for Golden Coast Company" opened the
        # procedure; the decision was 278009, four months later.
        self.assertIsNone(ls.classify(notice(1, "2025-06-19",
                                             "Mandatory Delisting for Golden Coast Company",
                                             "السير فى اجراءات الشطب لشركة جولدن كوست السخنة")))

    def test_every_spelling_the_exchange_used(self):
        for heading in ("De – Listing of  \" El Ezz Aldekhela Steel - Alexandria\"(Main Market)",
                        "Final De–Listing of Paint & Chemicals Industries (Pachin) (PACH.CA)",
                        "Delisting the Shares of Odin for Investment & Development (ODID.CA) "
                        "Due to Restructuring by Merger",
                        "Compulsory delisting for Al oroba trading , mining and supplying company"):
            self.assertIsNotNone(ls.classify(notice(1, "2023-10-04", heading)), heading)

    def test_a_committee_decision_filed_under_general_is_read_by_its_body(self):
        # NewsID 205160: no "delist" anywhere in the heading.
        got = ls.classify(notice(
            1, "2020-12-13",
            "Advanced Pharmaceutical Packaging Co. (APPC.CA) - Decision of the Listing Committee",
            "العبوات الدوائية المتطورة (APPC.CA) - قرار لجنة القيد", sec=3,
            body="Content: The Listing Committee held on 10/12/2020 decided to delist Advanced "
                 "Pharmaceutical Packaging Co. (APP) a compulsory delisting from The Egyptian "
                 "Exchange main market."))
        self.assertEqual(got, ("delisted", "mandatory"))

    def test_a_company_release_about_its_own_delisting_is_not_the_decision(self):
        # NewsID 189695, and DCRC's 2015 lawsuit release (139201), whose body
        # says a court "decided to delisting the suit".
        self.assertIsNone(ls.classify(notice(
            1, "2019-09-11",
            "Release from Global Telecom Holding (GTHE.CA) Concerning the Voluntary De-listing",
            sec=3)))
        self.assertIsNone(ls.classify(notice(
            2, "2015-06-01", "Release From Delta Construction & Rebuilding (DCRC.CA) Concerning a "
                             "Lawsuit", sec=3, body="the court decided to delisting the suit")))

    def test_a_listing_committee_warning_is_not_a_decision(self):
        # NewsID 189942: "in case the company does not comply ... to consider the
        # compulsory delisting". RMTV was delisted two years later, by 218644.
        self.assertIsNone(ls.classify(notice(
            1, "2019-09-23",
            'Companies not complying with Article "53" of the Listing Rules - Rowad Misr',
            "عرض موقف الشركات الغير ملتزمة بالمادة 53 قواعد القيد- رواد مصر",
            body="the case of the company shall be re-brought to the listing committee to "
                 "consider the compulsory delisting")))

    def test_the_monthly_treasury_bill_delisting_is_not_a_company(self):
        self.assertIsNone(ls.classify(notice(1, "2024-01-02",
                                             "De-Listing of Treasury Bills 02 January 2024")))
        self.assertIsNone(ls.classify(notice(2, "2011-04-21",
                                             "New Urban Communities Authority -1st Issue- Tranche B",
                                             "شطب قيد الشريحة (ب) من الاصدار الأول من سندات هيئة")))

    def test_a_listing_and_a_lapsed_listing(self):
        # NewsIDs 293978 and 287373.
        self.assertEqual(ls.classify(notice(
            1, "2026-08-26", "Listing the Shares of Tourism Urbanization Company (TOUR.CA) on the "
                             "SMEs Market (Temporary Listing)")), ("listed", None))
        self.assertEqual(ls.classify(notice(
            2, "2026-04-30", "Consider Listing the Shares of  Al Safwa Hospital (SFWA.CA), as if "
                             "it Did not Exist")), ("voided", None))


class Kind(unittest.TestCase):
    def test_the_word_that_qualifies_the_delisting_wins_over_a_tender_offer(self):
        # NewsID 202743 (EITP): "voluntary de-listing", then a "mandatory tender offer".
        got = ls.classify(notice(
            1, "2020-10-11", "Final de-listing for the shares of The Egyptian Company For "
                             "International Touristic Projects",
            body="In light of the company's commitment to the provisions of voluntary de-listing "
                 "... at the same price of the mandatory tender offer"))
        self.assertEqual(got, ("delisted", "voluntary"))

    def test_the_heading_outranks_the_body(self):
        # NewsID 231876: the body says "final mandatory delisting", the heading
        # says why — a merger.
        got = ls.classify(notice(
            1, "2022-11-20", "Delisting the Shares of Odin for Investment & Development (ODID.CA) "
                             "Due to Restructuring by Merger",
            body="has approved the final mandatory delisting of the shares"))
        self.assertEqual(got, ("delisted", "merger"))


class Derive(unittest.TestCase):
    FINAL = "Approving the Final Voluntary De-listing for Shorouk (SMPP.CA)"

    def test_the_latest_final_notice_names_the_company(self):
        items = history("SMPP", "EGS3A0A1C016") + [
            notice(218236, "2021-12-08", self.FINAL, isin="EGS3A0A1C016")]
        gone, disputed = ls.derive(items)
        self.assertEqual(gone["SMPP"]["news_id"], 218236)
        self.assertEqual(gone["SMPP"]["delisted_on"], "2021-12-08")
        self.assertEqual(gone["SMPP"]["link"],
                         "https://www.egx.com.eg/en/NewsDetails.aspx?NewsID=218236")
        self.assertEqual(disputed, {})

    def test_a_notice_with_no_ticker_is_matched_by_its_isin(self):
        # NewsID 202053, "Final de-listing for Alexandria Cement", carries no
        # ticker at all.
        items = history("ALEX", "EGS3H051C012") + [
            notice(202053, "2020-09-10", "Final de-listing for Alexandria Cement",
                   isin="EGS3H051C012")]
        self.assertIn("ALEX", ls.derive(items)[0])

    def test_a_truncated_isin_field_still_finds_its_company(self):
        # NewsID 189645's field is "‏EGS74081C01" — marked and one short.
        items = history("GTHE", "EGS74081C018") + [
            notice(189645, "2019-09-09", "De-Listing of Global Telecom Holding",
                   isin="‏EGS74081C01")]
        self.assertIn("GTHE", ls.derive(items)[0])

    def test_a_ticker_loose_in_the_body_is_not_the_subject(self):
        # A merger notice names the company doing the absorbing, too.
        items = history("EMDE", "EGS214B1C018") + history("BUYR", "EGS000000001", 2000) + [
            notice(231874, "2022-11-20", "Delisting the Shares of Emerald (EMDE.CA) Due to "
                                         "Restructuring by Merger",
                   body="due to the company's merger with Buyer Holding (BUYR.CA)")]
        gone = ls.derive(items)[0]
        self.assertIn("EMDE", gone)
        self.assertNotIn("BUYR", gone)

    def test_a_later_listing_ends_the_delisting(self):
        # CIRA: delisted 135085 (2015), listed again 177242 (2018).
        items = history("CIRA", "EGS65541C012") + [
            notice(135085, "2015-02-18", "De-listing of Cairo Investment & Real Estate "
                                         "Development (CIRA.CA) (Voluntary De-listing)"),
            notice(177242, "2018-09-02", "Listing the shares of Cairo for Investment and Real "
                                         "Estate Development", isin="EGS65541C012")]
        self.assertEqual(ls.derive(items)[0], {})

    def test_a_lapsed_temporary_listing_restores_the_delisting(self):
        # MMHC today is 2010's delisting plus June 2026's temporary listing. If
        # that listing lapses, the exchange says so in these words.
        items = history("MMHC", "EGS651F1C014") + [
            notice(88946, "2010-08-26", "De-listing of El Mamoura Company (MMHC.CA)"),
            notice(290516, "2026-06-28", "Listing the Shares of El MAAMOURA (MMHC.CA) "
                                         "(Temporary Listing) (Main Market)")]
        self.assertEqual(ls.derive(items)[0], {})
        items.append(notice(299999, "2027-01-10", "Consider Listing the Shares of El MAAMOURA "
                                                  "(MMHC.CA), as if it Did not Exist"))
        self.assertEqual(ls.derive(items)[0]["MMHC"]["news_id"], 88946)

    def test_the_exchange_quoting_it_afterwards_disputes_the_notice(self):
        items = history("SMPP", "EGS3A0A1C016") + [
            notice(218236, "2021-12-08", self.FINAL, isin="EGS3A0A1C016")]
        gone, disputed = ls.derive(items, {"EGS3A0A1C016": "2026-09-10"})
        self.assertEqual(gone, {})
        self.assertIn("market-watch", disputed["SMPP"]["contradicted_by"])

    def test_the_exchange_publishing_about_it_afterwards_disputes_the_notice(self):
        items = history("SMPP", "EGS3A0A1C016") + [
            notice(218236, "2021-12-08", self.FINAL, isin="EGS3A0A1C016"),
            filing(230000, "2022-06-01", "SMPP")]
        gone, disputed = ls.derive(items)
        self.assertEqual(gone, {})
        self.assertIn("230000", disputed["SMPP"]["contradicted_by"])

    def test_a_release_inside_the_grace_window_does_not(self):
        # GTHE released a statement about its own delisting two days after it.
        items = history("SMPP", "EGS3A0A1C016") + [
            notice(218236, "2021-12-08", self.FINAL, isin="EGS3A0A1C016"),
            filing(218300, "2021-12-10", "SMPP")]
        self.assertIn("SMPP", ls.derive(items)[0])

    def test_no_archive_means_nobody_is_delisted(self):
        with tempfile.TemporaryDirectory() as folder:
            empty = pathlib.Path(folder)
            self.assertEqual(ls.delisted(empty, empty, empty / "session.json"), {})


class AfterDelisting(unittest.TestCase):
    RECORD = {"delisted_on": "2022-02-10"}

    def test_the_day_of_the_notice_counts(self):
        # NBKE left the trading system at the start of that day's session.
        self.assertTrue(ls.after_delisting(self.RECORD, "2022-02-10"))
        self.assertTrue(ls.after_delisting(self.RECORD, "2026-09-09"))
        self.assertFalse(ls.after_delisting(self.RECORD, "2022-02-09"))

    def test_no_record_is_never_after(self):
        self.assertFalse(ls.after_delisting(None, "2026-09-09"))


class QuotedOnExchange(unittest.TestCase):
    def test_captures_and_the_session_both_count_but_a_carried_currency_does_not(self):
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            day = root / "snapshots" / "2026-09-10"
            day.mkdir(parents=True)
            payload = {"payload": {"data": {"data": [
                {"reuters": "CIRA.CA", "isin": "EGS65541C012",
                 "lastTradeDate": "2026-09-10T00:00:00"}]}}}
            (day / "095450-market-watch.json.gz").write_bytes(
                gzip.compress(json.dumps(payload).encode()))
            (root / "session.json").write_text(json.dumps({
                "harvested": "2026-09-14",
                "securities": {"ABUK": {"market_cap": 1.0},
                               "SAIB": {"currency": "US$", "currency_stated": "2026-08-28"}}}))
            got = ls.quoted_on_exchange(root / "snapshots", root / "session.json")
        self.assertEqual(got["CIRA"], "2026-09-10")
        self.assertEqual(got["EGS65541C012"], "2026-09-10")
        self.assertEqual(got["ABUK"], "2026-09-14")
        self.assertNotIn("SAIB", got)


@unittest.skipUnless(any(ls.FILINGS.glob("*.json.gz")), "no filings archive on disk")
class TheArchiveAsFound(unittest.TestCase):
    """The committed record, frozen on the day the NCGC case was reported."""

    @classmethod
    def setUpClass(cls):
        items = [i for i in ls.load_items() if str(i.get("dateStamp") or "")[:10] <= FROZEN]
        quoted = {k: v for k, v in ls.quoted_on_exchange().items() if v <= FROZEN}
        cls.gone, cls.disputed = ls.derive(items, quoted)

    def test_nile_cotton_ginning_is_delisted_by_211501(self):
        record = self.gone["NCGC"]
        self.assertEqual(record["news_id"], 211501)
        self.assertEqual(record["delisted_on"], "2021-06-14")
        self.assertEqual(record["isin"], "EGS32131C012")

    def test_the_fourteen_directory_tickers_and_their_notices(self):
        expected = {
            "GTHE": 189645, "ALEX": 202053, "EITP": 202743, "WATP": 204923,
            "APPC": 205160, "SUCE": 206684, "TORA": 206682, "NCGC": 211501,
            "SMPP": 218236, "RMTV": 218644, "NBKE": 220046, "IRAX": 243733,
            "PACH": 245885, "DCRC": 246478,
        }
        for ticker, code in expected.items():
            self.assertEqual(self.gone.get(ticker, {}).get("news_id"), code, ticker)

    def test_the_three_that_were_listed_again_are_not(self):
        for ticker in ("CIRA", "MMHC", "TOUR"):
            self.assertNotIn(ticker, self.gone, ticker)

    def test_nothing_on_the_record_disputes_itself(self):
        self.assertEqual(self.disputed, {})


if __name__ == "__main__":
    unittest.main()
