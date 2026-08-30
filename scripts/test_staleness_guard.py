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
    def run_with(self, doc, today=THURSDAY, hour=12, ran=None):
        with mock.patch.object(G, "read_archive", return_value=doc), \
             mock.patch.object(G, "last_run", return_value=ran):
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

    def test_a_complete_archive_is_not_rewritten_so_the_marker_stands_in(self):
        """The 30 August 2026 failure, which cost a whole day's publish.

        The harvester returns early when the month it holds already has
        everything the exchange reports, so a complete archive keeps whatever
        `harvested` date it was last WRITTEN with. On a quiet stretch that
        date goes stale while the harvest keeps running and keeps finding
        nothing — and this guard read the stale date as "the harvest did not
        run today" and failed the build. It had run, four minutes earlier.

        The stamp cannot go on the archive: those are gzipped blobs of a third
        of a megabyte and git keeps every version. So the harvester writes a
        few bytes beside them, and the guard reads that when the archive's own
        date is older than today.
        """
        self.assertEqual(
            self.run_with(
                archive(harvested="2026-08-25", newest="2026-08-26"),
                ran={"harvested": "2026-08-27", "month": "2026-08",
                     "held": 3, "expected": 3}),
            0,
        )

    def test_the_marker_does_not_excuse_a_short_read(self):
        # Asking and being cut off mid-run is not the same as asking and being
        # told there is nothing — the archive would be truncated either way.
        self.assertEqual(
            self.run_with(
                archive(harvested="2026-08-25", newest="2026-08-26"),
                ran={"harvested": "2026-08-27", "month": "2026-08",
                     "held": 1, "expected": 3}),
            1,
        )

    def test_yesterdays_marker_does_not_excuse_today(self):
        self.assertEqual(
            self.run_with(
                archive(harvested="2026-08-25", newest="2026-08-26"),
                ran={"harvested": "2026-08-26", "month": "2026-08",
                     "held": 3, "expected": 3}),
            1,
        )

    def test_a_marker_for_another_month_is_not_this_month_s_evidence(self):
        self.assertEqual(
            self.run_with(
                archive(harvested="2026-08-25", newest="2026-08-26"),
                ran={"harvested": "2026-08-27", "month": "2026-07",
                     "held": 3, "expected": 3}),
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


class MarkerTest(unittest.TestCase):
    """The other half: the harvester has to WRITE the thing the guard reads."""

    def test_a_complete_month_records_that_it_was_asked(self):
        import harvest_egx_beta as H
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.object(H, "OUT", pathlib.Path(tmp)):
                H.note_run(2026, 8, held=1467, expected=1467)
                written = json.loads(
                    (pathlib.Path(tmp) / "filings" / "last-run.json")
                    .read_text(encoding="utf-8"))
        self.assertEqual(written["month"], "2026-08")
        self.assertEqual(written["held"], 1467)
        self.assertEqual(written["expected"], 1467)
        self.assertEqual(written["harvested"], datetime.date.today().isoformat())

    def test_the_guard_reads_what_the_harvester_writes(self):
        # The two halves agree on the filename and the field names, which is
        # the join a test in either file alone would miss.
        import harvest_egx_beta as H
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.object(H, "OUT", pathlib.Path(tmp)):
                H.note_run(2026, 8, held=3, expected=3)
            with mock.patch.object(G, "FILINGS", pathlib.Path(tmp) / "filings"):
                read = G.last_run()
        self.assertIsNotNone(read, "the guard cannot find the harvester's marker")
        self.assertEqual(read["month"], "2026-08")
        self.assertEqual(G._date(read["harvested"]), datetime.date.today())
