"""The staleness guard: what it must alarm on, and what it must not."""
from __future__ import annotations

import datetime
import gzip
import json
import pathlib
import tempfile
import unittest
from unittest import mock

import build_staleness_guard as G

THURSDAY = datetime.date(2026, 8, 27)   # a trading day
FRIDAY = datetime.date(2026, 8, 28)     # not a trading day


def archive(harvested: str | None, newest: str, held: int = 3,
            expected: int | None = 3) -> dict:
    doc = {
        "month": "2026-08",
        "items": [{"dateStamp": f"{newest}T10:00:00"} for _ in range(held)],
    }
    if harvested is not None:
        doc["harvested"] = harvested
    if expected is not None:
        doc["expected"] = expected
    return doc


class GuardTest(unittest.TestCase):
    def run_with(self, doc, today=THURSDAY, hour=12):
        with mock.patch.object(G, "read_archive", return_value=doc):
            return G.check(today=today, hour_utc=hour)

    def test_a_quiet_exchange_is_not_an_outage(self):
        # The 27 August 2026 failure: the harvest ran and returned everything
        # the exchange had, which stopped at the 26th because nothing was filed
        # on the 27th. Three builds failed over a day off.
        self.assertEqual(
            self.run_with(archive(harvested="2026-08-27", newest="2026-08-26")),
            0,
        )

    def test_a_harvest_that_did_not_run_today_still_alarms(self):
        # The case the guard exists for: the archive is behind AND nothing
        # fetched it today, so filings the exchange published are missing.
        self.assertEqual(
            self.run_with(archive(harvested="2026-08-25", newest="2026-08-26")),
            1,
        )

    def test_a_truncated_harvest_alarms_even_though_it_ran_today(self):
        self.assertEqual(
            self.run_with(archive(harvested="2026-08-27", newest="2026-08-27",
                                  held=900, expected=1467)),
            1,
        )

    def test_an_archive_that_never_records_a_harvest_falls_back_to_dates(self):
        self.assertEqual(
            self.run_with(archive(harvested=None, newest="2026-08-26")),
            1,
        )

    def test_early_morning_tolerates_yesterday(self):
        # Before the session is an hour old, today's filings need not exist.
        self.assertEqual(
            self.run_with(archive(harvested="2026-08-25", newest="2026-08-26"),
                          hour=6),
            0,
        )

    def test_a_non_trading_day_is_skipped(self):
        self.assertEqual(
            self.run_with(archive(harvested="2026-08-25", newest="2026-08-26"),
                          today=FRIDAY),
            0,
        )

    def test_the_real_archive_parses(self):
        doc = G.read_archive("2026-08")
        if doc is None:
            self.skipTest("no August archive in this checkout")
        self.assertIsNotNone(G._date(doc.get("harvested")))
        self.assertIsNotNone(G.newest_filing_date(doc))


if __name__ == "__main__":
    unittest.main()
