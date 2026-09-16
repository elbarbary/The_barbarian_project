#!/usr/bin/env python3
"""A listing the scanner files under its ISIN, published under the exchange's code.

TradingView's EGX listing carries eleven rows with an ISIN where the ticker
goes. `build_market_api.py` publishes only records named like a ticker, so two
companies that trade on the exchange's main market had never been in the
directory or the market file: National Printing (`EGS370O1C013`, NAPR,
1,882,239 shares at 42.10 on 16 September 2026) and Ferchem Misr
(`EGS385S1C012`, FERC, 54,726 shares at 77.53). Every row of the exchange's own
market watch carries the ISIN beside the code, so `harvest_egx_session.py`
keeps that pairing in `session.json` and `egx_scan.mjs` names those rows by it
(`site-worker/test/egx-listing.test.mjs`).

The other nine ISINs are in no market-watch capture. Three of them belong to
companies the exchange delisted, whose old tickers its filings do name: MKIT
(EGS659O1C015, NewsID 292918, 12 August 2026), Acrow Misr and International
Dry Ice. None of the three was ever published, and a filing's ISIN is not the
exchange saying the share trades under that code, so they stay unpublished.
The owner's rule for a delisted company (keep it, with an over-the-counter
note) is about one the directory already has, and a company published under
its code keeps that code when it is delisted later: the pairing is never
forgotten.
"""

from __future__ import annotations

import contextlib
import datetime
import gzip
import io
import json
import pathlib
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import apply_listing_status as apply  # noqa: E402
import build_market_api as bma  # noqa: E402
import build_measures as bm  # noqa: E402
import harvest_egx_session as harvest  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent

# The 11:32 UTC capture of 16 September 2026, cut down to what is read.
STATED = "2026-09-16T11:32:51Z"
AFTER_CLOSE = "2026-09-16T15:03:30.802Z"


def market_watch_row(code, isin, **extra):
    return {"reuters": f"{code}.CA", "isin": isin, **extra}


MARKET_WATCH = {"data": {"data": [
    market_watch_row("NAPR", "EGS370O1C013", mc=9065757964.9, closePrice=42.1,
                     name="National Printing"),
    market_watch_row("FERC", "EGS385S1C012", mc=31012000000, closePrice=77.53,
                     name="FERCHEM MISR CO. FOR FERTILLIZERS & CHEMICALS"),
    market_watch_row("COMI", "EGS60121C018", mc=473314334900.0, closePrice=139.0),
    # What else the market watch carries, none of it a share with a code: a
    # bond, the EGX 30 ETF and a subscription right, as captured.
    {"reuters": "EGBKRSK01CV", "isin": "EGB69881L018",
     "name": "Bokra Taskeek The First Issuance April 2032 V.R"},
    {"reuters": "EGX30ETF.CA", "isin": "EGS69491M015", "name": "EGX 30 INDEX ETF"},
    {"reuters": "LUTS_r1.CA", "isin": "EGS924K1C018",
     "name": "Subscription Rights Of Lotus For Agricultural Invest&Dev-1"},
    # An ISIN cut short, and a row that states neither.
    market_watch_row("ABUK", "EGS38191C0", mc=30e9),
    {"mc": 5e9},
]}}

# Enough traded companies that the capture is dated by the clock.
TRADED = [f"TR{chr(65 + i)}{chr(65 + j)}" for i in range(5) for j in range(5)]


def quote(ticker, close, volume=100_000, change=0.5, **extra):
    return {"symbol": f"EGX:{ticker}", "ticker": ticker, "company": f"{ticker} Co.",
            "close": close, "volume": volume, "change": change, "sector": "Finance", **extra}


def bars(*sessions):
    return [{"date": d, "open": c, "high": c, "low": c, "close": c, "volume": v}
            for d, c, v in sessions]


# National Printing as `egx_scan.mjs` writes it once the row is named: the
# exchange's code, and the scanner's own symbol, which the chart socket knows.
NAPR = quote("NAPR", 42.1, volume=1_882_239, change=19.98,
             symbol="EGX:EGS370O1C013", company="National Printing",
             recentSplitAdjustedBars=bars(("2026-09-14", 35.2, 902_114),
                                          ("2026-09-15", 35.09, 373_455)))
# The rows the exchange names no code for, as the scanner sent them.
MKIT_ROW = quote("EGS659O1C015", 0.81, volume=44_650, change=-1.22,
                 company="Misr Kuwait Investment & Trading Co.",
                 recentSplitAdjustedBars=bars(("2026-09-14", 0.82, 14_196)))
ESAC_ROW = quote("EGS48271C018-EGP", 0.15, volume=701_141, change=0,
                 company="Egypt - South Africa for Communication",
                 recentSplitAdjustedBars=bars(("2026-09-14", 0.15, 1_773_095)))
UNNAMED = {"unnamedIsins": ["EGX:EGS659O1C015", "EGX:EGS48271C018-EGP"]}


def scan(*records, as_of=AFTER_CLOSE, **fields):
    body = [quote(t, 10.0 + i / 10) for i, t in enumerate(TRADED)] + list(records)
    return {"asOf": as_of, "scannerTotal": len(body), "scannerReturned": len(body),
            "askedByName": [], "recoveredByName": [], "unpricedByName": [],
            "unknownToScanner": [], "unaskedByName": [], "records": body, **fields}


class TheExchangeNamesTheCode(unittest.TestCase):
    """`harvest_egx_session.py`: what the market watch says, and what is kept."""

    def test_a_market_watch_row_pairs_its_isin_with_its_code(self):
        self.assertEqual(harvest.pairs(MARKET_WATCH), [
            ("EGS370O1C013", "NAPR"), ("EGS385S1C012", "FERC"), ("EGS60121C018", "COMI")])

    def test_a_row_names_its_listing_with_or_without_a_market_value(self):
        payload = {"data": {"data": [market_watch_row("NAPR", "EGS370O1C013")]}}
        self.assertEqual(harvest.pairs(payload), [("EGS370O1C013", "NAPR")])
        # While the session figures still skip it: no value, nothing to hold.
        with self.assertRaises(RuntimeError):
            harvest.extract(payload)

    def test_a_capture_that_leaves_a_listing_out_does_not_forget_its_code(self):
        held = {"EGS385S1C012": {"code": "FERC", "stated": "2026-09-15T11:31:02Z"},
                "EGS370O1C013": {"code": "NAPR", "stated": "2026-09-15T11:31:02Z"}}
        got = harvest.isin_codes(held, [(STATED, "EGS370O1C013", "NAPR")])
        self.assertEqual(got, {
            "EGS370O1C013": {"code": "NAPR", "stated": STATED},
            "EGS385S1C012": {"code": "FERC", "stated": "2026-09-15T11:31:02Z"}})

    def test_the_newest_statement_decides_and_leaves_one_pairing(self):
        old, new = "2026-09-01T10:00:00Z", STATED
        got = harvest.isin_codes(
            {"EGS11111C011": {"code": "AAAA", "stated": old},      # renamed to BBBB
             "EGS22222C011": {"code": "CCCC", "stated": old}},     # CCCC moved to a new ISIN
            [(new, "EGS11111C011", "BBBB"), (new, "EGS33333C011", "CCCC")])
        self.assertEqual(got, {"EGS11111C011": {"code": "BBBB", "stated": new},
                               "EGS33333C011": {"code": "CCCC", "stated": new}})
        codes = [entry["code"] for entry in got.values()]
        self.assertEqual(len(codes), len(set(codes)), "a code is claimed twice")
        # An older capture read after a newer one changes nothing.
        self.assertEqual(harvest.isin_codes(got, [(old, "EGS11111C011", "AAAA")]), got)

    def test_a_malformed_held_entry_is_passed_over(self):
        got = harvest.isin_codes({"EGS370O1C013": "NAPR", "EGS385S1C012": {"code": "FERC"},
                                  "EGS60121C018": {"code": "comi", "stated": STATED}}, [])
        self.assertEqual(got, {})
        self.assertEqual(harvest.isin_codes(None, []), {})

    def test_the_archive_is_read_and_the_metals_are_not(self):
        with tempfile.TemporaryDirectory() as tmp:
            day = pathlib.Path(tmp) / "2026-09-16"
            day.mkdir()

            def archive(name, payload, stated=STATED):
                (day / name).write_bytes(gzip.compress(json.dumps(
                    {"source": "beta.egx.com.eg", "fetchedAt": stated,
                     "payload": payload}).encode()))

            archive("113251-market-watch.json.gz", MARKET_WATCH)
            # Shaped like a listing on purpose: it must still not be read.
            archive("113300-gold-market-watch.json.gz",
                    {"data": {"data": [market_watch_row("GOLD", "EGS00000G011")]}})
            (day / "113304-market-watch.json.gz").write_bytes(b"not gzip")
            got = harvest.archived(pathlib.Path(tmp))
        self.assertEqual(sorted(got), sorted([
            (STATED, "EGS370O1C013", "NAPR"), (STATED, "EGS385S1C012", "FERC"),
            (STATED, "EGS60121C018", "COMI")]))

    def test_a_delisted_companys_isin_is_named_by_no_capture(self):
        # The exchange's filings pair EGS659O1C015 with MKIT, and its final
        # notice delisted MKIT on 12 August 2026. The pairing is read from the
        # market watch only, so MKIT's ISIN gets no code here.
        got = harvest.isin_codes({}, [(STATED, i, c) for i, c in harvest.pairs(MARKET_WATCH)])
        self.assertNotIn("EGS659O1C015", got)
        self.assertNotIn("MKIT", {entry["code"] for entry in got.values()})

    def test_the_harvest_writes_the_pairing_and_holds_it_when_the_exchange_refuses(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = pathlib.Path(tmp) / "session.json"
            out.write_text(json.dumps({"harvested": "2026-09-15", "securities": {},
                                       "isins": {"EGS385S1C012": {
                                           "code": "FERC", "stated": "2026-09-15T11:31:02Z"}}}))
            capture = {"data": {"data": [MARKET_WATCH["data"]["data"][0]]}}
            with mock.patch.object(harvest, "OUT", out), \
                    mock.patch.object(harvest, "REPO", pathlib.Path(tmp)), \
                    mock.patch.object(harvest, "ARCHIVE", pathlib.Path(tmp) / "none"), \
                    mock.patch.object(harvest.beta, "request", lambda path: capture), \
                    mock.patch.object(sys, "argv", ["harvest_egx_session.py"]), \
                    contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(harvest.main(), 0)
            written = json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(written["isins"]["EGS370O1C013"]["code"], "NAPR")
            self.assertEqual(written["isins"]["EGS385S1C012"],
                             {"code": "FERC", "stated": "2026-09-15T11:31:02Z"})
            before = out.read_bytes()

            def refuse(path):
                raise RuntimeError("the WAF turned us away")

            with mock.patch.object(harvest, "OUT", out), \
                    mock.patch.object(harvest.beta, "request", refuse), \
                    mock.patch.object(sys, "argv", ["harvest_egx_session.py"]), \
                    contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(harvest.main(), 0)
            self.assertEqual(out.read_bytes(), before)

    def test_the_committed_pairing_is_one_to_one(self):
        path = REPO / "data-source" / "egx-beta" / "session.json"
        doc = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
        if "isins" not in doc:
            self.skipTest("no pairing committed yet")
        isins = doc["isins"]
        codes = [entry["code"] for entry in isins.values()]
        self.assertEqual(len(codes), len(set(codes)))
        self.assertEqual(harvest.isin_codes(isins, []), isins,
                         "the committed pairing is not what the harvest would keep")
        # What the build reads is the whole of it.
        with mock.patch.object(bma, "REPO", REPO):
            self.assertEqual(bma._egx_isins(), {i: e["code"] for i, e in isins.items()})


class TheBuildReadsThePairing(unittest.TestCase):
    def test_a_code_two_isins_claim_names_neither(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / "data-source" / "egx-beta").mkdir(parents=True)
            (root / "data-source" / "egx-beta" / "session.json").write_text(json.dumps({"isins": {
                "EGS370O1C013": {"code": "NAPR", "stated": STATED},
                "EGS99999C011": {"code": "NAPR", "stated": STATED},
                "EGS385S1C012": {"code": "FERC", "stated": STATED},
                "EGS60121C018": {"code": "LUTS_r1", "stated": STATED},
            }}))
            with mock.patch.object(bma, "REPO", root):
                self.assertEqual(bma._egx_isins(), {"EGS385S1C012": "FERC"})
            with mock.patch.object(bma, "REPO", root / "nowhere"):
                self.assertEqual(bma._egx_isins(), {})

    def test_the_suffix_does_not_hide_the_pairing(self):
        with mock.patch.object(bma, "EGX_ISINS", {"EGS48271C018": "ESAC"}):
            self.assertEqual(bma.exchange_code("EGS48271C018-EGP"), "ESAC")
            self.assertEqual(bma.exchange_code("EGS48271C018"), "ESAC")
            self.assertIsNone(bma.exchange_code("EGS659O1C015"))
            self.assertIsNone(bma.exchange_code("ESAC"))
            self.assertIsNone(bma.exchange_code(None))


class Harness(unittest.TestCase):
    """Both published roots and every store in a temporary tree."""

    ISINS = {"EGS370O1C013": "NAPR", "EGS385S1C012": "FERC"}

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.api = self.root / "api"
        self.fixtures = self.root / "fixtures"
        self.prices = self.root / "prices"
        for d in (self.api, self.fixtures, self.root / "work", self.prices):
            d.mkdir(parents=True)
        for p in (mock.patch.object(bma, "REPO", self.root),
                  mock.patch.object(bma, "API", self.api),
                  mock.patch.object(bma, "FIXTURES", self.fixtures),
                  mock.patch.object(bma, "PRICES", self.prices),
                  mock.patch.object(bma, "WORK", self.root / "work"),
                  mock.patch.object(bma, "EGX_SESSION", {}),
                  mock.patch.object(bma, "EGX_MARKET_CAP", {}),
                  mock.patch.object(bma, "EGX_ISINS", dict(self.ISINS))):
            p.start()
            self.addCleanup(p.stop)

    def publish_directory(self, *extra, notes=None):
        notes = notes or {}
        rows = [{"ticker": t, "name_en": f"{t} Co.", "exchange": "EGX",
                 **({"listing": notes[t]} if t in notes else {})}
                for t in sorted([*TRADED, *extra])]
        for root in (self.api, self.fixtures):
            (root / "companies.json").write_text(json.dumps({"companies": rows}), encoding="utf-8")
            (root / "companies").mkdir(exist_ok=True)
            for row in rows:
                (root / "companies" / f"{row['ticker']}.json").write_text(
                    json.dumps({"ticker": row["ticker"]}), encoding="utf-8")
        return {r["ticker"] for r in rows}

    def build(self, body, quotes_only):
        path = self.root / "work" / "daily_scan_2026-09-16.json"
        path.write_text(json.dumps(body), encoding="utf-8")
        log = io.StringIO()
        with contextlib.redirect_stdout(log):
            code = bma.build(path, True, quotes_only=quotes_only)
        self.log = log.getvalue()
        return code

    def read(self, path):
        return json.loads(path.read_text(encoding="utf-8"))

    def market(self):
        return self.read(self.api / "market.json")

    def directory(self):
        return {r["ticker"] for r in self.read(self.api / "companies.json")["companies"]}

    def accounted(self):
        market = self.market()
        return set(market["stocks"]) | set(market.get("unquoted") or [])

    def published_text(self):
        return "\n".join(p.read_text(encoding="utf-8")
                         for root in (self.api, self.fixtures) for p in sorted(root.rglob("*.json")))

    def archive(self, name, *sessions):
        (self.prices / f"{name}.json").write_text(json.dumps(
            {"ticker": name, "source": "scan",
             "bars": [{"date": d, "close": c, "volume": v} for d, c, v in sessions]}),
            encoding="utf-8")

    def held(self, name):
        path = self.prices / f"{name}.json"
        return [b["date"] for b in self.read(path)["bars"]] if path.exists() else None

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


class ATradedListingNamedByTheExchange(Harness):
    """NAPR: filed by the scanner under EGS370O1C013, traded on the main market."""

    def body(self):
        return scan(NAPR, namedByExchange={"EGX:EGS370O1C013": "NAPR"})

    def test_the_daily_build_publishes_it_under_its_code_in_every_document(self):
        self.publish_directory()
        self.assertEqual(self.build(self.body(), quotes_only=False), 0)
        self.assertIn("NAPR", self.directory())
        self.assertEqual(self.market()["stocks"]["NAPR"]["close"], 42.1)
        self.assertEqual(self.market()["stocks"]["NAPR"]["volume"], 1_882_239)
        doc = self.read(self.api / "companies" / "NAPR.json")
        self.assertEqual(doc["name"]["en"], "National Printing")
        self.assertEqual(doc["market"]["last_close"], 42.1)
        self.assertEqual(self.accounted(), self.directory())
        self.assertNotIn("EGS370O1C013", self.published_text())
        self.assertIn("named    1 listings the scanner files under an ISIN", self.log)
        self.assertIn("NAPR (EGS370O1C013)", self.log)

    def test_the_price_job_waits_for_the_directory_then_quotes_it(self):
        self.publish_directory()
        self.assertEqual(self.build(self.body(), quotes_only=True), 0)
        self.assertNotIn("NAPR", self.accounted(), "the price job listed a company")
        self.assertEqual(self.accounted(), self.directory())
        listed = self.publish_directory("NAPR")
        self.assertEqual(self.build(self.body(), quotes_only=True), 0)
        self.assertEqual(self.market()["stocks"]["NAPR"]["close"], 42.1)
        self.assertEqual(self.market()["unquoted"], [])
        self.assertEqual(self.accounted(), listed)

    def test_its_sessions_filed_under_the_isin_move_to_its_code(self):
        # 137 sessions since 17 February sit in EGS370O1C013.json; the scan
        # carries the last two.
        self.archive("EGS370O1C013", ("2026-02-17", 21.5, 40_210), ("2026-09-10", 30.1, 22_000),
                     ("2026-09-14", 35.2, 902_114), ("2026-09-15", 35.09, 373_455))
        self.publish_directory()
        store = {p.name: p.read_bytes() for p in self.prices.iterdir()}
        # The price job owns no store: both files as they were.
        self.assertEqual(self.build(self.body(), quotes_only=True), 0)
        self.assertEqual({p.name: p.read_bytes() for p in self.prices.iterdir()}, store)
        # The daily build moves them, and publishes the older sessions too.
        self.assertEqual(self.build(self.body(), quotes_only=False), 0)
        self.assertIsNone(self.held("EGS370O1C013"), "the ISIN's file is still in the store")
        self.assertEqual(self.held("NAPR"), ["2026-02-17", "2026-09-10", "2026-09-14", "2026-09-15"])
        history = self.read(self.api / "companies" / "NAPR.json")["price_history"]
        self.assertEqual(history[0], {"date": "2026-02-17", "close": 21.5, "volume": 40_210})
        self.assertIn("EGS370O1C013 → NAPR", self.log)
        # And a second build finds nothing left to move.
        self.assertEqual(self.build(self.body(), quotes_only=False), 0)
        self.assertNotIn("filed under an ISIN moved", self.log)

    def test_an_isin_file_the_code_does_not_hold_is_kept(self):
        self.archive("EGS370O1C013", ("2026-09-15", 35.09, 373_455))
        with mock.patch.object(bma, "PRICES", self.prices):
            self.assertEqual(bma.retire_isin_archives(), [])
            self.archive("NAPR", ("2026-09-14", 35.2, 902_114))
            self.assertEqual(bma.retire_isin_archives(), [])
            self.assertEqual(self.held("EGS370O1C013"), ["2026-09-15"])
            self.archive("NAPR", ("2026-09-14", 35.2, 902_114), ("2026-09-15", 35.09, 373_455))
            self.assertEqual(bma.retire_isin_archives(), ["EGS370O1C013 → NAPR"])

    def test_the_three_documents_agree(self):
        self.publish_directory("NBCC")
        body = scan(NAPR, quote("NBCC", 5, volume=0, change=None), MKIT_ROW, ESAC_ROW,
                    namedByExchange={"EGX:EGS370O1C013": "NAPR"}, **UNNAMED)
        self.assertEqual(self.build(body, quotes_only=False), 0)
        rows = {r["ticker"] for r in self.measures()["rows"]}
        self.assertEqual(rows, self.accounted())
        self.assertEqual(rows, self.directory())
        self.assertIn("NAPR", rows)
        # And after the next price tick, keyed by that directory.
        self.assertEqual(self.build(dict(body, asOf="2026-09-17T08:01:00.000Z"),
                                    quotes_only=True), 0)
        self.assertEqual({r["ticker"] for r in self.measures()["rows"]}, self.accounted())
        self.assertEqual(self.accounted(), self.directory())


class AnIsinTheExchangeDoesNotName(Harness):
    """Egypt - South Africa for Communication: no market-watch row, no notice."""

    def test_it_is_published_nowhere_and_named_in_the_log(self):
        listed = self.publish_directory()
        self.archive("EGS48271C018-EGP", ("2026-09-14", 0.15, 1_773_095))
        for quotes_only in (True, False):
            with self.subTest(quotes_only=quotes_only):
                self.assertEqual(self.build(scan(ESAC_ROW, **UNNAMED), quotes_only=quotes_only), 0)
                self.assertEqual(self.directory(), listed)
                self.assertEqual(self.accounted(), listed)
                self.assertNotIn("EGS48271C018", self.published_text())
        self.assertIn("skipped  1 records", self.log)
        self.assertIn("EGS48271C018-EGP Egypt - South Africa for Communication", self.log)
        # Its series stays under the vendor's name: nothing pairs it with a code.
        self.assertEqual(self.held("EGS48271C018-EGP"), ["2026-09-14"])


class ADelistedCompanysIsin(Harness):
    """MKIT: the scanner's EGS659O1C015, delisted by the exchange on 12 August 2026."""

    NOTE = {"ticker": "MKIT", "isin": "EGS659O1C015", "delisted_on": "2026-08-12",
            "news_id": 292918, "kind": "mandatory",
            "link": "https://www.egx.com.eg/en/NewsDetails.aspx?NewsID=292918"}

    def test_it_is_not_published_under_the_ticker_its_filings_name(self):
        # `listing_status` reads this ISIN as MKIT's from 354 filings, and the
        # vendor's EGX:MKIT sessions to 11 August match the ISIN's 35 of 35.
        # Neither is the exchange's market watch naming a code, and MKIT was
        # never published, so it is not published now.
        listed = self.publish_directory()
        self.archive("MKIT", ("2026-08-11", 2.67, 82_357))
        self.archive("EGS659O1C015", ("2026-08-11", 2.67, 82_357), ("2026-09-14", 0.82, 14_196))
        for quotes_only in (True, False):
            with self.subTest(quotes_only=quotes_only):
                self.assertEqual(self.build(scan(MKIT_ROW, **UNNAMED), quotes_only=quotes_only), 0)
                self.assertEqual(self.directory(), listed)
                self.assertEqual(self.accounted(), listed)
                self.assertNotIn("MKIT", self.published_text())
                self.assertNotIn("EGS659O1C015", self.published_text())
        self.assertIn("EGS659O1C015 Misr Kuwait Investment & Trading Co.", self.log)
        # The two series stay apart: no pairing moves one into the other.
        self.assertEqual(self.held("MKIT"), ["2026-08-11"])
        self.assertEqual(self.held("EGS659O1C015"), ["2026-08-11", "2026-09-14"])

    def test_a_company_published_under_its_code_keeps_it_when_delisted_later(self):
        # The owner's rule (14 Sep 2026): a delisted company the scanner still
        # quotes stays, with the over-the-counter note. Were NAPR delisted and
        # gone from the market watch, its pairing would be held, the scan would
        # still name its row, and both builds would keep it for the note.
        note = apply.note(dict(self.NOTE, ticker="NAPR", isin="EGS370O1C013"))
        listed = self.publish_directory("NAPR", notes={"NAPR": note})
        body = scan(NAPR, namedByExchange={"EGX:EGS370O1C013": "NAPR"})
        self.assertEqual(self.build(body, quotes_only=True), 0)
        self.assertIn("NAPR", self.market()["stocks"])
        self.assertEqual(self.accounted(), listed)
        self.assertEqual(self.build(dict(body, asOf="2026-09-17T08:01:00.000Z"),
                                    quotes_only=False), 0)
        self.assertEqual(self.directory(), listed)
        for name, value in (("DIRECTORY", self.api / "companies.json"),
                            ("COMPANIES", self.api / "companies"),
                            ("FIXTURES", self.fixtures)):
            patcher = mock.patch.object(apply, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        with contextlib.redirect_stdout(io.StringIO()):
            apply.apply(True, notes={"NAPR": note})
        rows = {r["ticker"]: r for r in self.read(self.api / "companies.json")["companies"]}
        self.assertEqual(rows["NAPR"]["listing"]["market"], "OTC")
        self.assertEqual(self.read(self.api / "companies" / "NAPR.json")["listing"], note)


if __name__ == "__main__":
    unittest.main(verbosity=2)
