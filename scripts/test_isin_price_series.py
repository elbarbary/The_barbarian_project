#!/usr/bin/env python3
"""A series the price store files under an ISIN publishes nothing under that name.

The market scan files a listing it has no ticker for under its ISIN, and the
price store keeps the series by the same name (`EGS659O1C015.json`). The
builders that walk the store keyed what they published by the file name, not
by the directory. On 16 September 2026 `volume-events.json` listed Misr Kuwait
Investment & Trading as `EGS659O1C015`, at 3.7 times its usual volume on
2 September, and Acrow Misr as `EGS3E071C013-EGP`, at 2.1 on 9 September.
The exchange had delisted both (NewsIDs 292918 and 283377), and delisted
companies are kept off that document. The notices name them by ticker, though,
so a series filed by ISIN never matched. `trends.json` keyed five ISINs, plus
MKIT, a real ticker the directory has never listed.

The owner's decision is that a company is published under a directory ticker
or not at all (see `test_isin_listings.py` for the two the exchange's market
watch does name). The fixtures here are a small store and a small directory in
a scratch folder, so no test outside `OverTheCommittedStore` reads a published
document.
"""

from __future__ import annotations

import contextlib
import datetime
import io
import json
import pathlib
import re
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_price_trends as trends  # noqa: E402
import build_prices_api as deep  # noqa: E402
import build_sector_rotation as rotation  # noqa: E402
import build_volume_events as vol  # noqa: E402

ISIN = re.compile(r"EG[A-Z0-9]{10}")

# The exchange's own notices, as `listing_status.derive` reads them from the
# committed archive, cut down to what is read. Each is keyed by ticker, with
# the ISIN beside it.
NOTICES = {
    "MKIT": {"ticker": "MKIT", "isin": "EGS659O1C015", "delisted_on": "2026-08-12",
             "news_id": 292918, "kind": "mandatory"},
    "ACRO": {"ticker": "ACRO", "isin": "EGS3E071C013", "delisted_on": "2026-02-11",
             "news_id": 283377, "kind": "voluntary"},
    "NCGC": {"ticker": "NCGC", "isin": "EGS32131C012", "delisted_on": "2021-06-14",
             "news_id": 211501, "kind": "voluntary"},
}

# COMI is listed. NCGC is in the directory with its over-the-counter note.
DIRECTORY = ("COMI", "NCGC")


def bars(start: str, count: int, *, spikes: dict[int, int] | None = None) -> list[dict]:
    """`count` daily sessions of 1,000 shares at 10.00, with the given spikes."""
    first = datetime.date.fromisoformat(start)
    spikes = spikes or {}
    return [{"date": (first + datetime.timedelta(days=i)).isoformat(), "close": 10.0,
             "volume": spikes.get(i, 1000)} for i in range(count)]


# Every series ends on the session named beside it.
STORE = {
    # 5.0x on 2026-09-12.
    "COMI": bars("2026-08-14", 30, spikes={29: 5000}),
    # 8.0x on 2026-09-12, five years after the notice.
    "NCGC": bars("2026-08-14", 30, spikes={29: 8000}),
    # MKIT's series filed by ISIN: 3.7x on 2026-09-02, after the notice.
    "EGS659O1C015": bars("2026-08-04", 30, spikes={29: 3700}),
    # Acrow Misr's, suffix and all: 2.1x on 2026-09-09, and on to 2026-09-14.
    "EGS3E071C013-EGP": bars("2026-08-16", 30, spikes={24: 2100}),
    # MKIT's ticker-named series: 4.0x on 2026-08-11, the day BEFORE the
    # notice, so only the directory can keep it out.
    "MKIT": bars("2026-07-13", 30, spikes={29: 4000}),
}


def write_store(folder: pathlib.Path, series: dict[str, list[dict]]) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    for name, rows in series.items():
        (folder / f"{name}.json").write_text(
            json.dumps({"ticker": name, "source": "scan", "bars": rows}), encoding="utf-8")


def write_directory(path: pathlib.Path, tickers=DIRECTORY) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"companies": [{"ticker": t, "name_en": t} for t in tickers]}),
                    encoding="utf-8")


def published(doc: dict) -> dict[tuple[str, str], dict]:
    return {(s["date"], c["ticker"]): c for s in doc["sessions"] for c in s["companies"]}


class Scratch(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = pathlib.Path(tmp.name)
        # Not the repository's layout. The clean-up opens each folder by its
        # bare name, which tests_before_rebuild.py resolves against the working
        # directory, so a folder called `data-source` counts as a read of the
        # real one and turns these tests into document tests.
        self.prices = self.root / "store"
        self.api = self.root / "v1"
        self.fixtures = self.root / "fixtures"
        self.directory = self.api / "companies.json"
        write_store(self.prices, STORE)
        write_directory(self.directory)
        self.fixtures.mkdir(parents=True)

    def patch(self, owner, name, value):
        patcher = mock.patch.object(owner, name, value)
        patcher.start()
        self.addCleanup(patcher.stop)

    def run_main(self, main, script: str) -> str:
        self.patch(sys, "argv", [script])
        out = io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            try:
                main()
            except SystemExit as stop:
                self.assertIn(stop.code, (0, None))
        return out.getvalue()


class VolumeEvents(Scratch):
    def test_an_isin_series_with_an_unusual_session_is_not_published(self):
        # No notice at all, so what keeps it out is the directory.
        doc = vol.build(vol.daily_bars(self.prices), delisted={}, companies=set(DIRECTORY))
        rows = published(doc)
        self.assertNotIn(("2026-09-02", "EGS659O1C015"), rows)
        self.assertEqual([t for _, t in rows if ISIN.match(t)], [])

    def test_the_same_store_keyed_by_file_name_would_have_published_it(self):
        # Proves the test above is about the directory and not about the data.
        store = vol.daily_bars(self.prices)
        rows = published(vol.build(store, delisted={}, companies=set(store)))
        self.assertEqual(rows[("2026-09-02", "EGS659O1C015")]["times"], 3.7)
        self.assertEqual(rows[("2026-09-09", "EGS3E071C013-EGP")]["times"], 2.1)

    def test_a_delisted_companys_isin_series_is_not_published(self):
        store = vol.daily_bars(self.prices)
        # What went wrong: the notices name MKIT and ACRO, so series keyed by
        # their ISINs passed straight through them.
        leaked = published(vol.build(store, delisted=NOTICES, companies=set(store)))
        self.assertIn(("2026-09-02", "EGS659O1C015"), leaked)
        self.assertIn(("2026-09-09", "EGS3E071C013-EGP"), leaked)

        rows = published(vol.build(store, delisted=NOTICES, companies=set(DIRECTORY)))
        for key in rows:
            self.assertNotIn(key[1], ("EGS659O1C015", "EGS3E071C013-EGP", "MKIT"), key)

    def test_a_directory_company_still_is(self):
        rows = published(vol.build(vol.daily_bars(self.prices), delisted=NOTICES,
                                   companies=set(DIRECTORY)))
        self.assertEqual(rows[("2026-09-12", "COMI")],
                         {"ticker": "COMI", "times": 5.0, "volume": 5000, "usual": 1000,
                          "close": 10.0})
        # And the delisting rule still holds for the directory's own
        # delisted company: its over-the-counter spike is not a session.
        self.assertEqual(sorted(rows), [("2026-09-12", "COMI")])

    def test_the_default_reads_the_directory(self):
        self.patch(vol, "DIRECTORY", self.directory)
        rows = published(vol.build(vol.daily_bars(self.prices), delisted={}))
        self.assertEqual(sorted(t for _, t in rows), ["COMI", "NCGC"])

    def test_the_build_writes_directory_tickers_and_names_what_it_left_out(self):
        self.patch(vol, "BARS", self.prices)
        self.patch(vol, "DIRECTORY", self.directory)
        self.patch(vol, "API", self.api)
        self.patch(vol, "FIXTURES", self.fixtures)
        self.patch(vol.listing_status, "delisted", lambda: NOTICES)
        log = self.run_main(vol.main, "build_volume_events.py")

        for folder in (self.api, self.fixtures):
            doc = json.loads((folder / vol.NAME).read_text(encoding="utf-8"))
            self.assertEqual(sorted(published(doc)), [("2026-09-12", "COMI")])
            self.assertEqual([s["counted"] for s in doc["sessions"]], [1])
        self.assertIn("left out 3 series with no directory ticker: "
                      "EGS3E071C013-EGP, EGS659O1C015, MKIT", log)

    def test_without_a_directory_nothing_is_written(self):
        self.patch(vol, "BARS", self.prices)
        self.patch(vol, "DIRECTORY", self.root / "missing.json")
        self.patch(vol, "API", self.api)
        self.patch(vol, "FIXTURES", self.fixtures)
        self.patch(vol.listing_status, "delisted", lambda: {})
        log = self.run_main(vol.main, "build_volume_events.py")
        self.assertFalse((self.api / vol.NAME).exists())
        self.assertIn("no directory", log)


class PriceTrends(Scratch):
    def test_only_directory_companies_get_a_trend(self):
        doc = trends.compute_trends(self.prices, set(DIRECTORY))
        self.assertEqual(sorted(doc["items"]), ["COMI", "NCGC"])
        self.assertEqual(doc["count"], 2)

    def test_a_series_left_out_does_not_date_the_document(self):
        # Acrow Misr's series runs to the 14th, the directory's to the 12th.
        doc = trends.compute_trends(self.prices, set(DIRECTORY))
        self.assertEqual(doc["generated_at"], "2026-09-12")

    def test_the_default_reads_the_directory(self):
        self.patch(trends, "DIRECTORY", self.directory)
        self.assertEqual(sorted(trends.compute_trends(self.prices)["items"]), ["COMI", "NCGC"])

    def test_the_build_writes_directory_tickers_and_names_what_it_left_out(self):
        self.patch(trends, "BARS", self.prices)
        self.patch(trends, "DIRECTORY", self.directory)
        self.patch(trends, "API", self.api)
        self.patch(trends, "FIXTURES", self.fixtures)
        log = self.run_main(trends.main, "build_price_trends.py")

        for folder in (self.api, self.fixtures):
            doc = json.loads((folder / trends.NAME).read_text(encoding="utf-8"))
            self.assertEqual(sorted(doc["items"]), ["COMI", "NCGC"])
        self.assertIn("Left out 3 series with no directory ticker: "
                      "EGS3E071C013-EGP, EGS659O1C015, MKIT", log)

    def test_without_a_directory_nothing_is_written(self):
        self.patch(trends, "BARS", self.prices)
        self.patch(trends, "DIRECTORY", self.root / "missing.json")
        self.patch(trends, "API", self.api)
        self.patch(trends, "FIXTURES", self.fixtures)
        self.run_main(trends.main, "build_price_trends.py")
        self.assertFalse((self.api / trends.NAME).exists())


class DeepPrices(Scratch):
    def setUp(self):
        super().setUp()
        # Long enough to earn a document of its own.
        long = bars("2025-01-01", deep.MIN_SESSIONS + 20)
        write_store(self.prices, {name: long for name in STORE})
        self.out = self.api / "prices"
        self.patch(deep, "REPO", self.root)
        self.patch(deep, "STAGE", self.prices)
        self.patch(deep, "OUT", self.out)
        self.patch(deep, "DIRECTORY", self.directory)

    def test_only_directory_companies_get_a_deep_document(self):
        log = self.run_main(deep.main, "build_prices_api.py")
        self.assertEqual(sorted(p.name for p in self.out.iterdir()), ["COMI.json", "NCGC.json"])
        self.assertIn("left out 3 series with no directory ticker", log)

    def test_without_a_directory_the_published_documents_stay(self):
        # The build removes the folder before writing it again, so a directory
        # that cannot be read must stop it first.
        self.out.mkdir(parents=True)
        (self.out / "COMI.json").write_text("{}", encoding="utf-8")
        self.patch(deep, "DIRECTORY", self.root / "missing.json")
        self.run_main(deep.main, "build_prices_api.py")
        self.assertEqual([p.name for p in self.out.iterdir()], ["COMI.json"])


class SectorRotation(Scratch):
    def test_an_isin_series_adds_no_turnover(self):
        # Already keyed by the directory's sectors. This keeps it that way.
        self.patch(rotation, "DEEP", self.prices)
        months, reported = rotation.turnover({"COMI": "Banks", "NCGC": "Textiles"})
        self.assertEqual({t for month in reported.values() for t in month}, {"COMI", "NCGC"})
        self.assertEqual(months["2026-09"], {"Banks": 10.0 * (11 * 1000 + 5000),
                                             "Textiles": 10.0 * (11 * 1000 + 8000)})


class OverTheCommittedStore(unittest.TestCase):
    """The builders over the committed store and directory, not the published documents."""

    @classmethod
    def setUpClass(cls):
        # Read here, not in a decorator: a decorator reads when the module is
        # imported, and would count as a read by every test in this file.
        cls.companies = vol.listed()
        cls.store = {path.stem for path in vol.BARS.glob("*.json")}
        if not cls.companies or not cls.store - cls.companies:
            raise unittest.SkipTest("no series outside the directory to test against")

    def test_no_volume_event_is_keyed_outside_the_directory(self):
        doc = vol.build(vol.daily_bars(vol.BARS), sessions=10_000)
        tickers = {c["ticker"] for s in doc["sessions"] for c in s["companies"]}
        self.assertTrue(tickers)
        self.assertEqual(sorted(tickers - self.companies), [])

    def test_no_trend_is_keyed_outside_the_directory(self):
        items = trends.compute_trends(trends.BARS)["items"]
        self.assertTrue(items)
        self.assertEqual(sorted(set(items) - self.companies), [])


if __name__ == "__main__":
    unittest.main()
