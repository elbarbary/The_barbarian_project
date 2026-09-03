#!/usr/bin/env python3
"""The rates document must say how old each figure is.

Until 3 September 2026 `rates/latest.json` carried no date anywhere — not on
the document and not on a row. The only freshness signal on sixteen Exchange
cards was a static "Quotes delayed ~15 minutes" badge, which is true of a live
TradingView read and false of a pound rate open.er-api.com publishes once a
day at 00:02 UTC, and of any row `carry_forward` has kept. A frozen upstream
was indistinguishable from a fresh one: the 29 August gold outage was found by
a website test, not by anything on the page.

The fix is two fields. `fetched_at` on the document says when this run asked;
`as_of` on a row says what its source said about its own reading — the
scanner's `time` bar column, open.er-api.com's `time_last_update_unix`,
api.gold-api.com's `updatedAt`. Where a source gives no stamp the row gets no
`as_of`: filling it with `fetched_at` would be the frozen-upstream lie in a
different key.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""
from __future__ import annotations

import datetime
import json
import pathlib
import sys
import tempfile
import unittest
from unittest import mock

import build_rates_api as rates

# What the three hosts actually returned on 3 September 2026 at 06:51 UTC,
# trimmed to the fields the builder reads.
EGX_BAR = 1788332400          # 2026-09-02T07:00:00Z — 10:00 Cairo, the session open
OIL_BAR = 1788386400          # 2026-09-02T22:00:00Z — 18:00 New York, next trade date
ERAPI_UNIX = 1788393751       # Thu, 03 Sep 2026 00:02:31 +0000
ERAPI_UTC = "Thu, 03 Sep 2026 00:02:31 +0000"
GOLD_AT = "2026-09-03T06:51:24Z"


def scanner_egx(bar=EGX_BAR):
    return {"data": [
        {"s": "EGX:EGX30", "d": ["EGX30", 55679.7, 0.4481, 248.4, bar]},
        {"s": "EGX:EGX70EWI", "d": ["EGX70EWI", 21225.2, -0.4362, -93, bar]},
    ]}


def scanner_world(bar_spx=1788355800, bar_oil=OIL_BAR):
    return {"data": [
        {"s": "SP:SPX", "d": [7666.6, 0.4603, bar_spx]},
        {"s": "NYMEX:CL1!", "d": [90.14, -0.9559, bar_oil]},
    ]}


def erapi(**overrides):
    payload = {"result": "success",
               "time_last_update_unix": ERAPI_UNIX,
               "time_last_update_utc": ERAPI_UTC,
               "rates": {"EGP": 51.090409, "USD": 1, "EUR": 0.8625, "SAR": 3.75}}
    payload.update(overrides)
    return {k: v for k, v in payload.items() if v is not None}


def gold(updated_at=GOLD_AT):
    payload = {"name": "Gold", "price": 4425.200195, "symbol": "XAU", "updatedAt": updated_at}
    return {k: v for k, v in payload.items() if v is not None}


def silver():
    return {"name": "Silver", "price": 65.933998, "symbol": "XAG", "updatedAt": "2026-09-03T06:51:23Z"}


def fake_get(answers):
    """A `get` that answers by host, so a test can starve one source at a time."""
    def get(url, body=None, timeout=25):
        for key, payload in answers.items():
            if key in url:
                return payload
        return None
    return get


class StampShapeTest(unittest.TestCase):
    def test_epoch_seconds_become_a_utc_instant(self):
        self.assertEqual(rates.from_epoch(EGX_BAR), "2026-09-02T07:00:00+00:00")
        self.assertEqual(rates.from_epoch(OIL_BAR), "2026-09-02T22:00:00+00:00")

    def test_a_missing_or_nonsense_epoch_is_none_not_now(self):
        for bad in (None, 0, -1, "1788332400", True, [], {}):
            self.assertIsNone(rates.from_epoch(bad), repr(bad))

    def test_gold_apis_zulu_stamp_is_normalised(self):
        self.assertEqual(rates.from_iso(GOLD_AT), "2026-09-03T06:51:24+00:00")
        self.assertIsNone(rates.from_iso(""))
        self.assertIsNone(rates.from_iso(None))
        self.assertIsNone(rates.from_iso("a few seconds ago"))

    def test_erapis_rfc2822_string_is_readable_on_its_own(self):
        self.assertEqual(rates.from_rfc2822(ERAPI_UTC), "2026-09-03T00:02:31+00:00")
        self.assertIsNone(rates.from_rfc2822(""))
        self.assertIsNone(rates.from_rfc2822("yesterday"))

    def test_dated_leaves_the_key_absent_rather_than_null(self):
        self.assertNotIn("as_of", rates.dated({"label": "x"}, None))
        self.assertNotIn("as_of", rates.dated({"label": "x"}, ""))
        self.assertEqual(rates.dated({"label": "x"}, "2026-09-02T07:00:00+00:00")["as_of"],
                         "2026-09-02T07:00:00+00:00")


class IndicesTest(unittest.TestCase):
    def test_an_index_row_is_dated_by_the_scanners_bar_time(self):
        with mock.patch.object(rates, "get", fake_get({"scanner.tradingview.com": scanner_egx()})):
            rows = rates.indices()
        by_id = {r["id"]: r for r in rows}
        self.assertEqual(by_id["EGX30"]["as_of"], "2026-09-02T07:00:00+00:00")
        self.assertEqual(by_id["EGX70EWI"]["as_of"], "2026-09-02T07:00:00+00:00")
        # The figure itself is untouched by the extra column.
        self.assertEqual(by_id["EGX30"]["level"], 55679.7)
        self.assertEqual(by_id["EGX30"]["change_points"], 248.4)

    def test_a_bar_without_a_time_gets_no_as_of(self):
        with mock.patch.object(rates, "get", fake_get({"scanner.tradingview.com": scanner_egx(bar=None)})):
            rows = rates.indices()
        self.assertEqual(len(rows), 2)
        for row in rows:
            self.assertNotIn("as_of", row, f"{row['id']} was dated from nothing")

    def test_a_scanner_answer_without_the_column_at_all_still_builds(self):
        # The shape the scanner returned before `time` was asked for.
        short = {"data": [{"s": "EGX:EGX30", "d": ["EGX30", 55679.7, 0.4481, 248.4]}]}
        with mock.patch.object(rates, "get", fake_get({"scanner.tradingview.com": short})):
            rows = rates.indices()
        self.assertEqual(rows[0]["level"], 55679.7)
        self.assertNotIn("as_of", rows[0])


class WorldTest(unittest.TestCase):
    def test_world_rows_keep_the_bars_instant_not_a_date(self):
        # Oil's daily bar opens at 22:00 UTC — 18:00 New York, the start of the
        # NEXT trade date. Cut to a date it would be "2026-09-02"; NYMEX calls
        # it 3 September. The instant is the only thing the source said.
        with mock.patch.object(rates, "get", fake_get({"scanner.tradingview.com": scanner_world()})):
            rows = rates.world()
        by_id = {r["id"]: r for r in rows}
        self.assertEqual(by_id["SP_SPX"]["as_of"], "2026-09-02T13:30:00+00:00")
        self.assertEqual(by_id["NYMEX_CL1!"]["as_of"], "2026-09-02T22:00:00+00:00")

    def test_a_world_row_without_a_time_gets_no_as_of(self):
        with mock.patch.object(rates, "get",
                               fake_get({"scanner.tradingview.com": scanner_world(bar_oil=None)})):
            rows = rates.world()
        by_id = {r["id"]: r for r in rows}
        self.assertIn("as_of", by_id["SP_SPX"])
        self.assertNotIn("as_of", by_id["NYMEX_CL1!"])


class CurrenciesTest(unittest.TestCase):
    def test_every_pair_is_dated_by_the_feeds_last_update(self):
        with mock.patch.object(rates, "get", fake_get({"open.er-api.com": erapi()})):
            rows, usd_egp, _ = rates.currencies()
        self.assertEqual(usd_egp, 51.090409)
        self.assertEqual({r["code"] for r in rows}, {"USD", "EUR", "SAR"})
        for row in rows:
            self.assertEqual(row["as_of"], "2026-09-03T00:02:31+00:00", row["code"])
        # The source line still quotes the feed's own words, unchanged.
        self.assertEqual(rows[0]["source"], f"open.er-api.com, {ERAPI_UTC}")

    def test_the_rfc2822_string_is_the_fallback_when_the_unix_field_goes(self):
        with mock.patch.object(rates, "get",
                               fake_get({"open.er-api.com": erapi(time_last_update_unix=None)})):
            rows, _, _ = rates.currencies()
        self.assertEqual(rows[0]["as_of"], "2026-09-03T00:02:31+00:00")

    def test_no_stamp_from_the_feed_means_no_as_of(self):
        with mock.patch.object(rates, "get", fake_get({"open.er-api.com": erapi(
                time_last_update_unix=None, time_last_update_utc=None)})):
            rows, _, _ = rates.currencies()
        self.assertEqual(len(rows), 3)
        for row in rows:
            self.assertNotIn("as_of", row, row["code"])
        self.assertEqual(rows[0]["source"], "open.er-api.com")


class MetalsTest(unittest.TestCase):
    def test_gold_is_dated_by_its_quotes_updated_at(self):
        with mock.patch.object(rates, "get", fake_get({"api.gold-api.com": gold()})):
            rows = rates.metals(51.090409)
        [row] = [r for r in rows if r["id"] == "XAU"]
        self.assertEqual(row["as_of"], "2026-09-03T06:51:24+00:00")
        self.assertEqual(row["usd_ounce"], 4425.2)
        self.assertTrue(row["source"].startswith("api.gold-api.com, 2026-09-03T06:51:24Z"))

    def test_a_quote_without_updated_at_gets_no_as_of(self):
        with mock.patch.object(rates, "get", fake_get({"api.gold-api.com": gold(updated_at=None)})):
            rows = rates.metals(51.090409)
        [row] = [r for r in rows if r["id"] == "XAU"]
        self.assertNotIn("as_of", row)
        self.assertEqual(row["egp_gram"], round(4425.200195 * 51.090409 / rates.TROY_OUNCE_GRAMS, 2))


class CarriedRowTest(unittest.TestCase):
    def test_a_carried_row_keeps_the_stamp_it_was_read_at(self):
        # This is the whole point of the field: a gold row read on 29 August
        # and carried since must still say 29 August beside today's fetched_at.
        old = {"id": "XAU", "label": "Gold", "egp_gram": 7200.02,
               "as_of": "2026-08-29T14:12:03+00:00",
               "source": "api.gold-api.com, 2026-08-29T14:12:03Z"}
        [kept] = rates.carry_forward([], [old], "metals")
        self.assertTrue(kept["carried"])
        self.assertEqual(kept["as_of"], "2026-08-29T14:12:03+00:00")

    def test_a_carried_row_that_never_had_a_stamp_is_not_given_one(self):
        old = {"id": "XAG", "label": "Silver", "egp_gram": 107.45,
               "source": "api.gold-api.com"}
        [kept] = rates.carry_forward([], [old], "metals")
        self.assertNotIn("as_of", kept)


class DocumentTest(unittest.TestCase):
    """The written document, end to end, with every host answering."""

    def build(self, answers):
        with tempfile.TemporaryDirectory() as tmp:
            out = pathlib.Path(tmp) / "out"
            fixtures = pathlib.Path(tmp) / "fixtures"
            with mock.patch.object(rates, "get", fake_get(answers)), \
                    mock.patch.object(rates, "OUT", out), \
                    mock.patch.object(rates, "FIXTURES", fixtures), \
                    mock.patch.object(sys, "argv", ["build_rates_api.py"]):
                self.assertEqual(rates.main(), 0)
            doc = json.loads((out / "latest.json").read_text(encoding="utf-8"))
            fixture = json.loads((fixtures / "latest.json").read_text(encoding="utf-8"))
        self.assertEqual(doc, fixture, "the app fixture is a copy of the document")
        return doc

    def test_the_document_is_stamped_and_every_row_is_dated(self):
        before = datetime.datetime.now(datetime.UTC).replace(microsecond=0)
        doc = self.build({"scanner.tradingview.com/egypt": scanner_egx(),
                          "scanner.tradingview.com/global": scanner_world(),
                          "open.er-api.com": erapi(),
                          "api.gold-api.com/price/XAU": gold(),
                          "api.gold-api.com/price/XAG": silver()})
        after = datetime.datetime.now(datetime.UTC)

        fetched = datetime.datetime.fromisoformat(doc["fetched_at"])
        self.assertEqual(fetched.utcoffset(), datetime.timedelta(0), "fetched_at is not UTC")
        self.assertTrue(before <= fetched <= after, (before, fetched, after))

        rows = doc["indices"] + doc["world"] + doc["currencies"] + doc["metals"]
        self.assertEqual(len(rows), 2 + 2 + 3 + 2)
        for row in rows:
            self.assertIn("as_of", row, f"{row.get('label')} has no as_of")
            # Every as_of is the source's own stamp, and none of them is the
            # build's — the two must never be confused.
            self.assertNotEqual(row["as_of"], doc["fetched_at"], row.get("label"))
            stamp = datetime.datetime.fromisoformat(row["as_of"])
            self.assertEqual(stamp.utcoffset(), datetime.timedelta(0), row.get("label"))

    def test_a_source_without_a_stamp_leaves_its_rows_undated(self):
        doc = self.build({"scanner.tradingview.com/egypt": scanner_egx(bar=None),
                          "scanner.tradingview.com/global": scanner_world(),
                          "open.er-api.com": erapi(),
                          "api.gold-api.com/price/XAU": gold(),
                          "api.gold-api.com/price/XAG": silver()})
        self.assertIn("fetched_at", doc)
        for row in doc["indices"]:
            self.assertNotIn("as_of", row, row["id"])
        for row in doc["world"] + doc["currencies"] + doc["metals"]:
            self.assertIn("as_of", row, row.get("label"))


if __name__ == "__main__":
    unittest.main()
