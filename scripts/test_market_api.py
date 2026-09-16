#!/usr/bin/env python3
"""What session a scan belongs to.

`build()` used `scan["asOf"][:10]` verbatim, so a scan that ran at the weekend
stamped a day the exchange does not trade. On 22 August the pipeline published
`market.json {"date": "2026-08-21", "is_close": true}` — a Friday — and that
date travelled: `build_disclosures_api` copies `market["date"]` into each
filing's `evidence.date`, and Home's unusual rail renders it under a field
whose docstring names it "the session the multiple was measured on (§49)".

Before the open is the same trap at the other end of the night. The capture at
00:15 Cairo on 15 September held Monday's closes, every volume identical, and
shipped as `{"date": "2026-09-14", "is_close": false}`; the 09:31 capture on
14 September held Sunday's closes and shipped dated Monday.
"""

from __future__ import annotations

import datetime
import pathlib
import sys
import unittest
import zoneinfo

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from build_market_api import is_after_close, session_date  # noqa: E402


class SessionDateTest(unittest.TestCase):
    def test_a_trading_day_is_itself(self):
        # Sunday through Thursday are trading days and are left alone.
        for stamp, expected in [
            ("2026-08-23T13:00:00Z", "2026-08-23"),  # Sunday
            ("2026-08-24T13:00:00Z", "2026-08-24"),  # Monday
            ("2026-08-20T15:00:00Z", "2026-08-20"),  # Thursday
        ]:
            self.assertEqual(session_date(stamp), expected, stamp)

    def test_the_weekend_is_dated_to_the_thursday_it_is_reading(self):
        # This is the bug: a Friday scan reads Thursday's closes.
        self.assertEqual(session_date("2026-08-21T16:00:00Z"), "2026-08-20")
        self.assertEqual(session_date("2026-08-22T09:00:00Z"), "2026-08-20")

    def test_the_published_friday_would_not_be_published_again(self):
        # The exact scan stamp that shipped 2026-08-21.
        self.assertNotEqual(session_date("2026-08-21T16:00:00Z"), "2026-08-21")

    def test_an_unreadable_stamp_is_passed_through_rather_than_guessed(self):
        self.assertIsNone(session_date(None))
        self.assertEqual(session_date("not a date"), "not a date"[:10])

    def test_it_agrees_with_the_close_check_about_which_days_trade(self):
        # `is_after_close` already knows the exchange's week for its own
        # purpose. If the two ever disagree about the weekend, one of them is
        # wrong and a reader gets a date from the loser.
        for stamp in ["2026-08-21T11:00:00Z", "2026-08-22T11:00:00Z"]:
            self.assertTrue(is_after_close(stamp), stamp)
            self.assertNotEqual(session_date(stamp), stamp[:10], stamp)


class BeforeTheOpenTest(unittest.TestCase):
    """A scan before 10:00 Cairo is reading the previous session's close.

    Stamps are UTC, as the scanner writes them. Tuesday 15 September 2026 is
    UTC+3 in Cairo, so each is its Cairo time less three hours.
    """

    def test_after_midnight_is_the_previous_close(self):
        # 00:45 Cairo, Tuesday: the hour the failing build ran.
        self.assertTrue(is_after_close("2026-09-14T21:45:00Z"))
        self.assertEqual(session_date("2026-09-14T21:45:00Z"), "2026-09-14")

    def test_a_minute_before_the_open_is_still_the_previous_close(self):
        # 09:59 Cairo. The UTC prefix says Tuesday by now, and that prefix is
        # what the date used to be read from.
        self.assertTrue(is_after_close("2026-09-15T06:59:00Z"))
        self.assertEqual(session_date("2026-09-15T06:59:00Z"), "2026-09-14")

    def test_a_minute_after_the_open_is_a_session_in_progress(self):
        # 10:01 Cairo.
        self.assertFalse(is_after_close("2026-09-15T07:01:00Z"))
        self.assertEqual(session_date("2026-09-15T07:01:00Z"), "2026-09-15")

    def test_a_minute_after_the_close_is_that_days_close(self):
        # 14:31 Cairo.
        self.assertTrue(is_after_close("2026-09-15T11:31:00Z"))
        self.assertEqual(session_date("2026-09-15T11:31:00Z"), "2026-09-15")

    def test_the_captures_that_shipped_mislabelled(self):
        for stamp, session in [
            ("2026-09-14T21:15:57.094Z", "2026-09-14"),  # Tue 00:15, is_close false
            ("2026-09-14T06:31:33.720Z", "2026-09-13"),  # Mon 09:31, dated Monday
            ("2026-09-13T06:14:04.265Z", "2026-09-10"),  # Sun 09:14, dated Sunday
            ("2026-09-07T03:47:51.895Z", "2026-09-06"),  # Mon 06:47, dated Monday
        ]:
            with self.subTest(stamp):
                self.assertTrue(is_after_close(stamp))
                self.assertEqual(session_date(stamp), session)

    def test_winter_moves_the_utc_hours_not_the_cairo_ones(self):
        # Tuesday 15 December 2026 is UTC+2.
        for stamp, closed, session in [
            ("2026-12-14T22:45:00Z", True, "2026-12-14"),   # 00:45
            ("2026-12-15T00:30:00Z", True, "2026-12-14"),   # 02:30, UTC says the 15th
            ("2026-12-15T07:59:00Z", True, "2026-12-14"),   # 09:59
            ("2026-12-15T08:01:00Z", False, "2026-12-15"),  # 10:01
            ("2026-12-15T12:31:00Z", True, "2026-12-15"),   # 14:31
        ]:
            with self.subTest(stamp):
                self.assertEqual(is_after_close(stamp), closed)
                self.assertEqual(session_date(stamp), session)

    def test_an_unknown_stamp_is_still_not_a_close(self):
        for stamp in (None, "", "not a date"):
            self.assertFalse(is_after_close(stamp), stamp)

    def test_every_five_minutes_of_a_summer_and_a_winter_week(self):
        """In session means a trading day between 10:00 and 14:30 Cairo, and
        only then. The date is the newest trading day whose 10:00 had come,
        so a capture in session is dated the day it ran and a close is never
        dated a session that had not opened."""
        cairo = zoneinfo.ZoneInfo("Africa/Cairo")
        # Each start is Sunday 00:00 in Cairo.
        for start in ("2026-09-12T21:00:00+00:00", "2026-12-12T22:00:00+00:00"):
            first = datetime.datetime.fromisoformat(start)
            for step in range(7 * 24 * 12):
                moment = first + datetime.timedelta(minutes=5 * step)
                stamp = moment.strftime("%Y-%m-%dT%H:%M:%S.000Z")
                local = moment.astimezone(cairo)
                minute = local.hour * 60 + local.minute
                trading = local.weekday() not in (4, 5)
                in_session = trading and 10 * 60 <= minute <= 14 * 60 + 30
                with self.subTest(stamp):
                    self.assertEqual(is_after_close(stamp), not in_session)
                    session = datetime.date.fromisoformat(session_date(stamp))
                    self.assertNotIn(session.weekday(), (4, 5))
                    opened = datetime.datetime.combine(
                        session, datetime.time(10), tzinfo=cairo)
                    self.assertLessEqual(opened, local)
                    following = session + datetime.timedelta(days=1)
                    while following.weekday() in (4, 5):
                        following += datetime.timedelta(days=1)
                    self.assertLess(local, datetime.datetime.combine(
                        following, datetime.time(10), tzinfo=cairo))


if __name__ == "__main__":
    unittest.main(verbosity=2)


class TradeSessionHistoryTest(unittest.TestCase):
    def test_writer_normalizes_held_and_new_zero_bars_idempotently(self):
        import json
        import tempfile
        from unittest.mock import patch
        import build_market_api as bma
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            trade = {"date": "2026-09-09", "close": 23, "volume": 250}
            zero = {"date": "2026-09-10", "close": 23, "volume": 0}
            unknown = {"date": "2026-09-13", "close": 23}
            path = root / "AAA.json"
            path.write_text(json.dumps({"ticker": "AAA", "bars": [trade, zero]}))
            with patch.object(bma, "PRICES", root):
                self.assertEqual(bma.persist_history({"AAA": [trade, zero, unknown]}), 1)
                self.assertEqual(json.loads(path.read_text())["bars"], [trade, unknown])
                before = path.read_bytes()
                self.assertEqual(bma.persist_history({"AAA": [trade, zero, unknown]}), 0)
                self.assertEqual(path.read_bytes(), before)
                # An all-zero existing store becomes an empty series, not a
                # deleted listing, and a held trade is never replaced by zero.
                path.write_text(json.dumps({"ticker": "AAA", "bars": [zero]}))
                self.assertEqual(bma.persist_history({"AAA": []}), 1)
                self.assertEqual(json.loads(path.read_text())["bars"], [])

    def test_migration_reads_only_the_durable_archive(self):
        import json
        import tempfile
        from unittest.mock import patch
        import build_market_api as bma
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            prices = root / "prices"
            prices.mkdir()
            path = prices / "AAA.json"
            path.write_text(json.dumps({"ticker": "AAA", "bars": [
                {"date": "2026-09-09", "close": 23, "volume": 0}]}))
            (root / "daily_scan_stale.json").write_text(json.dumps({"records": [
                {"ticker": "AAA", "recentSplitAdjustedBars": [
                    {"date": "2026-09-10", "close": 23, "volume": 250}]}]}))
            with patch.object(bma, "PRICES", prices), patch.object(bma, "WORK", root):
                self.assertEqual(bma.normalize_history(), 1)
                self.assertEqual(json.loads(path.read_text())["bars"], [])
                self.assertEqual(bma.normalize_history(), 0)

    def test_night_and_morning_scans_produce_identical_history(self):
        import json
        import tempfile
        from unittest.mock import patch
        import build_market_api as bma
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            path = root / "daily_scan_test.json"
            trade = {"date": "2026-09-09", "close": 23, "volume": 250}
            zero = {"date": "2026-09-10", "close": 23, "volume": 0}
            with patch.object(bma, "WORK", root), patch.object(bma, "PRICES", root / "prices"):
                def history(bars):
                    path.write_text(json.dumps({"records": [{"ticker": "AAA", "recentSplitAdjustedBars": bars}]}))
                    return bma.history_union()
                self.assertEqual(history([trade, zero]), history([trade]))
                self.assertEqual(history([trade]), {"AAA": [trade]})
                bma.PRICES.mkdir()
                (bma.PRICES / "AAA.json").write_text(json.dumps({"ticker": "AAA", "bars": [trade]}))
                self.assertEqual(history([dict(trade, volume=0)]), {"AAA": [trade]})


class HolidayCaptureTest(unittest.TestCase):
    def fixture(self):
        # Same shape as 27 August: all active companies repeat 26 August,
        # plus an idle listing. Sized above the broad-market quorum.
        records = [{"ticker": f"T{i}", "close": 10+i, "volume": 100+i}
                   for i in range(25)]
        history = {r["ticker"]: [dict(r, date="2026-08-26")] for r in records}
        records.append({"ticker": "IDLE", "close": 5, "volume": 0})
        return {"asOf": "2026-08-27T16:00:00Z", "records": records}, history

    def test_holiday_and_following_weekend_keep_the_real_close(self):
        from build_market_api import capture_session
        scan, history = self.fixture()
        for stamp in ("2026-08-27T08:00:00Z", "2026-08-27T16:00:00Z", "2026-08-29T16:35:00Z"):
            scan["asOf"] = stamp
            self.assertEqual(capture_session(scan, history),
                             ("2026-08-26", True, "previous-session-replay"))

    def test_one_changed_quote_is_evidence_the_market_is_trading(self):
        from build_market_api import capture_session
        scan, history = self.fixture()
        scan["records"][0]["volume"] += 1
        self.assertEqual(capture_session(scan, history)[:2], ("2026-08-27", True))
        scan["asOf"] = "2026-08-27T08:00:00Z"
        self.assertEqual(capture_session(scan, history)[:2], ("2026-08-27", False))

    def test_thin_or_incomplete_evidence_never_relabels_the_market(self):
        from build_market_api import capture_session
        scan, history = self.fixture()
        self.assertEqual(capture_session(scan, {})[2], "clock")
        del history["T0"]
        self.assertEqual(capture_session(scan, history)[2], "clock")
        scan["records"] = scan["records"][:3]
        self.assertEqual(capture_session(scan, history)[2], "clock")

    def test_an_archive_already_holding_today_is_not_a_holiday(self):
        from build_market_api import capture_session
        scan, history = self.fixture()
        for bars in history.values():
            bars[0]["date"] = "2026-08-27"
        self.assertEqual(capture_session(scan, history)[2], "clock")


if __name__ == "__main__":
    unittest.main()
