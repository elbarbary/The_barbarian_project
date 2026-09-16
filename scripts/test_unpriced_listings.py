#!/usr/bin/env python3
"""A listed company the scan has no price for: named, never dropped, never faked.

On 16 September 2026 TradingView's market listing left NBCC and POCO out of
its 13:01, 14:01 and 14:31 Cairo captures. Its own `totalCount` fell with them
(295, then 293), so the scan was complete by the scanner's count and the
short-scan guard let it through. `build_market_api.py` kept only records with a
close, so:

  * `market.json` at 13:01 and 14:01 carried 282 quotes beside a 284-company
    directory, and `test_build_measures.CardinalityTest` failed on main;
  * the daily build that scanned at 14:31 deleted both company documents;
  * the price job at 15:02, with both back in the listing and HALN newly in
    it, published 285 quotes beside a 282-company directory.

Neither company was suspended. NBCC is a temporary listing that has not traded
and POCO has not traded since 2023. EHDR, which trades millions of shares a
day, had gone the same way on 10 September and was still missing six days later.

The fixtures below are those companies. `egx_scan.mjs` now asks the scanner by
name for every published company its listing leaves out
(`site-worker/test/egx-listing.test.mjs`); these hold the builders to what they
do with the answer.
"""

from __future__ import annotations

import datetime
import json
import pathlib
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_market_api as bma  # noqa: E402
import build_measures as bm  # noqa: E402

# 13:01 Cairo on 16 September 2026, the first capture without NBCC and POCO.
IN_SESSION = "2026-09-16T10:01:35.510Z"
EARLIER = "2026-09-16T09:01:37.294Z"

# Enough traded companies that the capture is dated by the clock, as the real
# one was, and a directory row for each.
TRADED = [f"TR{chr(65 + i)}{chr(65 + j)}" for i in range(5) for j in range(5)]


def quote(ticker, close, volume=100_000, change=0.5):
    return {"ticker": ticker, "company": f"{ticker} Co.", "close": close,
            "volume": volume, "change": change, "sector": "Finance"}


def untraded(ticker, close=5):
    # What the scanner sends for a listing that has not traded: the reference
    # price, no shares, and no move. NBCC at 12:01 Cairo on 16 September.
    return {"ticker": ticker, "company": f"{ticker} Co.", "close": close,
            "volume": 0, "change": None}


def scan(*records, as_of=IN_SESSION, **by_name):
    """A scan as `egx_scan.mjs` writes it. Priced companies, then extras."""
    body = [quote(t, 10.0 + i / 10) for i, t in enumerate(TRADED)] + list(records)
    return {"asOf": as_of, "scannerTotal": len(body), "scannerReturned": len(body),
            "records": body, **by_name}


class Harness(unittest.TestCase):
    """Both published roots and every store in a temporary tree."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.api = self.root / "api"
        self.fixtures = self.root / "fixtures"
        self.prices = self.root / "prices"
        for d in (self.api, self.fixtures, self.root / "work"):
            d.mkdir(parents=True)
        for p in (mock.patch.object(bma, "REPO", self.root),
                  mock.patch.object(bma, "API", self.api),
                  mock.patch.object(bma, "FIXTURES", self.fixtures),
                  mock.patch.object(bma, "PRICES", self.prices),
                  mock.patch.object(bma, "WORK", self.root / "work"),
                  mock.patch.object(bma, "EGX_SESSION", {}),
                  mock.patch.object(bma, "EGX_MARKET_CAP", {})):
            p.start()
            self.addCleanup(p.stop)

    def publish_directory(self, *extra, notes=None):
        """The directory as the last daily build left it."""
        notes = notes or {}
        rows = [{"ticker": t, "name_en": f"{t} Co.", "exchange": "EGX",
                 **({"listing": notes[t]} if t in notes else {})}
                for t in sorted([*TRADED, *extra])]
        for root in (self.api, self.fixtures):
            (root / "companies.json").write_text(
                json.dumps({"companies": rows}), encoding="utf-8")
            (root / "companies").mkdir(exist_ok=True)
            for row in rows:
                (root / "companies" / f"{row['ticker']}.json").write_text(
                    json.dumps({"ticker": row["ticker"]}), encoding="utf-8")
        return {r["ticker"] for r in rows}

    def build(self, body, quotes_only):
        path = self.root / "scan.json"
        path.write_text(json.dumps(body), encoding="utf-8")
        return bma.build(path, True, quotes_only=quotes_only)

    def market(self):
        return json.loads((self.api / "market.json").read_text(encoding="utf-8"))

    def unquoted(self, market=None):
        return (market or self.market()).get("unquoted")

    def accounted(self, market=None):
        """Every company the market file answers for, priced or named."""
        market = market or self.market()
        return set(market["stocks"]) | set(market.get("unquoted") or [])

    def directory(self):
        body = json.loads((self.api / "companies.json").read_text(encoding="utf-8"))
        return {r["ticker"] for r in body["companies"]}

    def published_bytes(self):
        return {str(p.relative_to(self.root)): p.read_bytes()
                for p in sorted(self.root.rglob("*.json")) if p.name != "scan.json"}


class AnUntradedListing(Harness):
    """NBCC and POCO: listed, not trading, and left out of the vendor's listing."""

    def test_left_out_of_the_listing_it_is_named_as_unquoted_not_dropped(self):
        listed = self.publish_directory("NBCC", "POCO")
        # The 13:01 scan: no NBCC, no POCO, and nothing asked by name.
        self.assertEqual(self.build(scan(), quotes_only=True), 0)
        market = self.market()
        self.assertEqual(self.accounted(market), listed,
                         "a listed company fell out of the market file")
        self.assertEqual(self.unquoted(market), ["NBCC", "POCO"])
        self.assertNotIn("NBCC", market["stocks"])
        self.assertEqual(len(market["stocks"]) + len(self.unquoted(market)), len(listed))

    def test_the_price_of_an_earlier_capture_never_stands_in_for_this_one(self):
        self.publish_directory("NBCC", "POCO")
        # 12:01 Cairo: in the listing, at its reference price.
        self.assertEqual(self.build(scan(untraded("NBCC"), untraded("POCO"), as_of=EARLIER),
                                    quotes_only=True), 0)
        self.assertEqual(self.market()["stocks"]["NBCC"], {"close": 5, "volume": 0})
        # 13:01 Cairo: gone from the listing. Its 12:01 close must not be
        # published under 13:01's capture.
        self.assertEqual(self.build(scan(), quotes_only=True), 0)
        market = self.market()
        self.assertEqual(market["captured_at"], IN_SESSION)
        self.assertNotIn("NBCC", market["stocks"])
        self.assertNotIn('"close": 5', json.dumps(market["stocks"]))
        self.assertIn("NBCC", self.unquoted(market) or [], "NBCC fell out of the market file")

    def test_asked_for_by_name_it_comes_back_with_the_quote_the_scanner_gave(self):
        listed = self.publish_directory("NBCC", "POCO")
        body = scan(untraded("NBCC"), untraded("POCO"),
                    askedByName=["NBCC", "POCO"], recoveredByName=["NBCC", "POCO"],
                    unknownToScanner=[], unaskedByName=[], unpricedByName=[])
        body["scannerTotal"] = body["scannerReturned"] = len(TRADED)
        for quotes_only in (True, False):
            with self.subTest(quotes_only=quotes_only):
                self.assertEqual(self.build(body, quotes_only=quotes_only), 0)
                market = self.market()
                self.assertEqual(market["stocks"]["POCO"], {"close": 5, "volume": 0})
                self.assertEqual(self.unquoted(market), [])
                self.assertEqual(set(market["stocks"]), listed)
                self.assertEqual(self.directory(), listed)

    def test_the_daily_build_refuses_rather_than_delete_it(self):
        self.publish_directory("NBCC", "POCO")
        before = self.published_bytes()
        for why in ({},                                         # a scan from before the check
                    {"askedByName": ["NBCC", "POCO"], "unaskedByName": ["NBCC", "POCO"],
                     "unknownToScanner": []},                   # the request failed
                    {"askedByName": ["NBCC", "POCO"], "unpricedByName": ["NBCC", "POCO"],
                     "unknownToScanner": []}):                  # answered with no close
            with self.subTest(why=why):
                self.assertEqual(self.build(scan(**why), quotes_only=False), 1)
                self.assertEqual(self.published_bytes(), before,
                                 "the refused build changed a published document")

    def test_a_row_sent_with_no_close_is_unquoted_too(self):
        listed = self.publish_directory("HALN")
        blank = dict(untraded("HALN"), close=None)
        self.assertEqual(self.build(scan(blank, askedByName=["HALN"], unpricedByName=["HALN"],
                                         unknownToScanner=[]), quotes_only=True), 0)
        market = self.market()
        self.assertEqual(self.accounted(market), listed, "HALN fell out of the market file")
        self.assertEqual(self.unquoted(market), ["HALN"])


class ANewListing(Harness):
    """HALN: in the vendor's listing before the directory has it."""

    def test_the_price_job_leaves_it_to_the_daily_build(self):
        listed = self.publish_directory()
        self.assertEqual(self.build(scan(quote("HALN", 0.1, volume=0, change=None)),
                                    quotes_only=True), 0)
        market = self.market()
        self.assertEqual(self.accounted(market), listed,
                         "the market file names a company the directory does not")

    def test_the_daily_build_adds_it_to_both_documents_at_once(self):
        self.publish_directory()
        self.assertEqual(self.build(scan(quote("HALN", 0.1, volume=0, change=None)),
                                    quotes_only=False), 0)
        self.assertIn("HALN", self.directory())
        self.assertIn("HALN", self.market()["stocks"])
        # And from then on the price job quotes it.
        self.assertEqual(self.build(scan(quote("HALN", 0.1, volume=0, change=None),
                                         as_of="2026-09-16T11:01:16.406Z"),
                                    quotes_only=True), 0)
        self.assertIn("HALN", self.market()["stocks"])


class ADelistedCompany(Harness):
    NOTE = {"status": "delisted", "market": "OTC", "delisted_on": "2021-06-14",
            "news_id": 211501}

    def test_one_kept_over_the_counter_keeps_its_quote_on_both_paths(self):
        # NCGC: final delisting 14 June 2021, still quoted by the vendor, kept
        # in the directory with a note (the owner's call, 14 Sep 2026).
        listed = self.publish_directory("NCGC", notes={"NCGC": self.NOTE})
        body = scan(untraded("NCGC", close=50))
        self.assertEqual(self.build(body, quotes_only=True), 0)
        self.assertEqual(self.market()["stocks"]["NCGC"], {"close": 50, "volume": 0})
        self.assertEqual(self.accounted(), listed)
        self.assertEqual(self.build(body, quotes_only=False), 0)
        self.assertIn("NCGC", self.directory())
        self.assertIn("NCGC", self.market()["stocks"])
        self.assertEqual(self.directory(), listed)

    def test_one_the_scanner_no_longer_carries_leaves_both_documents_together(self):
        # MKIT: mandatory delisting 12 August 2026. The vendor renamed it to
        # its ISIN, and asked for EGX:MKIT by name it sends no row.
        self.publish_directory("MKIT")
        body = scan(askedByName=["MKIT"], unknownToScanner=["MKIT"],
                    recoveredByName=[], unaskedByName=[], unpricedByName=[])
        # The price job keeps the directory's word until the daily build.
        self.assertEqual(self.build(body, quotes_only=True), 0)
        self.assertEqual(self.accounted(), self.directory())
        self.assertEqual(self.unquoted(), ["MKIT"])
        self.assertNotIn("MKIT", self.market()["stocks"])
        # The daily build takes it out of everything in one write.
        self.assertEqual(self.build(dict(body, asOf="2026-09-16T11:01:16.406Z"),
                                    quotes_only=False), 0)
        self.assertNotIn("MKIT", self.directory())
        self.assertNotIn("MKIT", self.accounted())
        self.assertFalse((self.api / "companies" / "MKIT.json").exists())
        self.assertEqual(self.accounted(), self.directory())


class WithNoPublishedDirectory(Harness):
    def test_the_first_build_takes_every_priced_record(self):
        self.assertEqual(self.build(scan(untraded("NBCC")), quotes_only=False), 0)
        self.assertEqual(self.directory(), set(TRADED) | {"NBCC"})
        self.assertEqual(self.accounted(), self.directory())

    def test_the_price_job_publishes_what_it_priced(self):
        self.assertEqual(self.build(scan(untraded("NBCC")), quotes_only=True), 0)
        self.assertEqual(self.accounted(), set(TRADED) | {"NBCC"})


class TheMarketFileAndTheMeasuresTableAgree(Harness):
    """`CardinalityTest` holds the published pair to one set of companies."""

    def measures(self):
        signals = self.root / "signals"
        signals.mkdir(exist_ok=True)
        with mock.patch.object(bm, "MARKET", self.api / "market.json"), \
                mock.patch.object(bm, "DIRECTORY", self.api / "companies.json"), \
                mock.patch.object(bm, "COMPANIES", self.api / "companies"), \
                mock.patch.object(bm, "PRICES", self.prices), \
                mock.patch.object(bm, "SIGNALS", signals), \
                mock.patch.object(bm, "FILINGS", self.root / "filings"):
            return bm.build(datetime.date(2026, 9, 16))

    def test_every_company_in_the_directory_has_a_row_while_the_listing_leaves_two_out(self):
        listed = self.publish_directory("NBCC", "POCO")
        self.assertEqual(self.build(scan(), quotes_only=True), 0)
        doc = self.measures()
        rows = {r["ticker"] for r in doc["rows"]}
        # The published check, and the directory behind it.
        self.assertEqual(rows, self.accounted())
        self.assertEqual(rows, listed, "the measures table lost a listed company")
        self.assertEqual(doc["companies"], len(doc["rows"]))
        breadth = doc["breadth"]
        self.assertEqual(breadth["listed"], len(listed))
        self.assertEqual(breadth["rose"] + breadth["fell"] + breadth["level"]
                         + breadth["idle"] + breadth["unmeasured"], breadth["listed"])
        self.assertGreaterEqual(breadth["unmeasured"], 2)

    def test_an_unquoted_row_is_dated_by_its_own_archive_and_never_by_the_capture(self):
        self.publish_directory("NBCC", "POCO")
        # POCO's two sessions, August 2023. NBCC has none.
        self.prices.mkdir()
        (self.prices / "POCO.json").write_text(json.dumps({"ticker": "POCO", "bars": [
            {"date": "2023-08-20", "close": 5.2, "volume": 1_000},
            {"date": "2023-08-21", "close": 5.0, "volume": 400}]}), encoding="utf-8")
        self.assertEqual(self.build(scan(), quotes_only=True), 0)
        rows = {r["ticker"]: r for r in self.measures()["rows"]}
        self.assertIn("POCO", set(rows), "the measures table lost POCO")
        self.assertIn("NBCC", set(rows), "the measures table lost NBCC")
        self.assertEqual((rows["POCO"]["as_of"], rows["POCO"]["close"]), ("2023-08-21", 5.0))
        self.assertNotIn("close", rows["NBCC"])
        self.assertNotIn("as_of", rows["NBCC"])
        self.assertIn("close", rows["NBCC"]["missing"])

    def test_the_daily_build_writes_a_pair_the_check_accepts(self):
        listed = self.publish_directory("NBCC", "MKIT")
        body = scan(untraded("NBCC"), askedByName=["MKIT", "NBCC"], recoveredByName=["NBCC"],
                    unknownToScanner=["MKIT"], unaskedByName=[], unpricedByName=[])
        self.assertEqual(self.build(body, quotes_only=False), 0)
        rows = {r["ticker"] for r in self.measures()["rows"]}
        self.assertEqual(rows, self.accounted())
        self.assertEqual(rows, listed - {"MKIT"})
        self.assertEqual(rows, self.directory())


if __name__ == "__main__":
    unittest.main(verbosity=2)
