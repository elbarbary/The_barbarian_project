#!/usr/bin/env python3
"""The session bulletin is the only document that says which way a trade went.

Every row on the insider tracker that carries a direction and a share count is
read out of one PDF a session — the exchange's insider-dealings bulletin. For
months nothing fetched them: fourteen had been downloaded by hand and two
hundred and sixteen sat in the ledger as documents we knew existed and had
never opened, so every filing after 19 August reached the screen present and
silent about what it said.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import contextlib
import io
import json
import pathlib
import re
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

import build_all
import build_insider_tracker as tracker
import fetch_insider_bulletins
from step_outcome import NO_PROGRESS

WORKFLOWS = pathlib.Path(__file__).resolve().parent.parent / ".github" / "workflows"


def bulletin(filing, published, attachment=None):
    stem = attachment or f"{filing}_101"
    return {"filingId": str(filing), "kind": "daily_insider_summary",
            "publishedAt": f"{published}T10:00:00",
            "attachments": [f"https://example.invalid/{stem[:-4]}_1.pdf",
                            f"https://example.invalid/{stem}.pdf"]}


class Fetching(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = pathlib.Path(self.tmp.name)
        self.pdfs = root / "pdfs"
        self.pdfs.mkdir()
        self.ledger = root / "ledger.json"
        self.store = root / "insider_bulletin_rows.json"
        saved = (tracker.PDF_DIR, tracker.LEDGER, tracker.PAUSE_SECONDS,
                 tracker.named_insiders.fetch_pdf, tracker.BULLETIN_STORE)
        tracker.PDF_DIR, tracker.LEDGER, tracker.PAUSE_SECONDS = self.pdfs, self.ledger, 0
        # Never the repository's own store: what it has read would decide what
        # these tests see asked for.
        tracker.BULLETIN_STORE = self.store
        self.addCleanup(lambda: setattr_all(tracker, saved))
        self.asked = []

    def ledger_of(self, docs):
        self.ledger.write_text(json.dumps({"schemaVersion": 1, "documents": docs}),
                               encoding="utf-8")

    def reader(self, answer):
        """Stand in for the network. `answer` decides what each URL returns."""
        def fetch(url, into):
            self.asked.append(url)
            body = answer(url)
            into.write_bytes(body)
            return body[:4] == b"%PDF"
        tracker.named_insiders.fetch_pdf = fetch

    def run_fetch(self, limit=0):
        with contextlib.redirect_stderr(io.StringIO()) as err:
            got = tracker.fetch_bulletins(limit)
        return got, err.getvalue()

    def test_the_newest_session_is_fetched_first(self):
        # A run that is cut short must leave the most recent sessions read, not
        # the oldest: the screen shows the last few weeks.
        self.ledger_of([bulletin(100, "2025-10-01"), bulletin(300, "2026-09-10"),
                        bulletin(200, "2026-05-05")])
        self.reader(lambda url: b"%PDF-1.4 x")
        got, _ = self.run_fetch(limit=1)
        self.assertEqual(got, 1)
        self.assertIn("300", self.asked[0])

    def test_a_refused_fetch_leaves_nothing_behind(self):
        # The exchange serves a challenge page when it refuses. Written to the
        # slot, it reads as a bulletin already held — the document is never
        # asked for again and `pdftotext` fails on it silently every build.
        self.ledger_of([bulletin(300, "2026-09-10")])
        self.reader(lambda url: b"<html>Access denied</html>")
        got, _ = self.run_fetch()
        self.assertEqual(got, 0)
        self.assertEqual(list(self.pdfs.glob("egx-*")), [])

    def test_a_bulletin_already_held_is_not_fetched_again(self):
        self.ledger_of([bulletin(300, "2026-09-10")])
        (self.pdfs / "egx-300-300_101.pdf").write_bytes(b"%PDF- held")
        self.reader(lambda url: b"%PDF-1.4 x")
        got, _ = self.run_fetch()
        self.assertEqual(got, 0)
        self.assertEqual(self.asked, [])

    def test_it_stops_asking_once_the_exchange_stops_answering(self):
        # Fifty-odd in a burst is what turns a served document into a
        # connection reset, and each refusal costs a ninety-second timeout.
        self.ledger_of([bulletin(n, f"2026-0{1 + n % 9}-01") for n in range(40)])
        self.reader(lambda url: b"nope")
        got, log = self.run_fetch()
        self.assertEqual(got, 0)
        self.assertEqual(len(self.asked), tracker.STOP_AFTER)
        self.assertIn("stopped answering", log)

    def test_one_success_resets_the_patience(self):
        # Newest first, so the fifth asked is the 16th of the month. Refusing
        # everything but that one, the run must ask past its own patience: four
        # refusals, one served, then eight more before it gives up.
        self.ledger_of([bulletin(n, f"2026-09-{n:02d}") for n in range(1, 21)])
        self.reader(lambda url: b"%PDF- yes" if "/16_101.pdf" in url else b"no")
        got, log = self.run_fetch()
        self.assertEqual(got, 1)
        self.assertEqual(len(self.asked), 5 + tracker.STOP_AFTER)
        self.assertIn("stopped answering", log)

    def test_it_asks_for_the_latin_table_not_the_arabic_rendering(self):
        # `pdftotext -layout` is read for "Insider", "Buy"/"Sell" and a volume.
        self.ledger_of([bulletin(300, "2026-09-10")])
        self.reader(lambda url: b"%PDF-1.4 x")
        self.run_fetch()
        self.assertTrue(self.asked[0].endswith("_101.pdf"), self.asked)

    def test_a_missing_ledger_is_not_a_crash(self):
        self.reader(lambda url: b"%PDF-1.4 x")
        got, log = self.run_fetch()
        self.assertEqual(got, 0)
        self.assertIn("ledger", log)

    def store_of(self, read):
        self.store.write_text(json.dumps({"schemaVersion": 2, "read": read, "rows": []}),
                              encoding="utf-8")

    def test_a_bulletin_the_store_has_read_is_not_fetched_by_a_machine_without_it(self):
        # A runner starts every build with no PDFs. Knowing a bulletin only by
        # its file on disk, it would ask for all of them in every build.
        self.ledger_of([bulletin(300, "2026-09-15"), bulletin(200, "2026-09-14")])
        self.store_of({"300": {"session": "2026-09-14", "rows": 26, "parser": "older"}})
        self.reader(lambda url: b"%PDF-1.4 x")
        self.run_fetch()
        self.assertEqual(self.asked, ["https://example.invalid/200_101.pdf"])

    def test_the_store_as_it_was_before_still_counts_as_read(self):
        # A bare list of rows until 16 Sep 2026.
        self.ledger_of([bulletin(300, "2026-09-15")])
        self.store.write_text(json.dumps([{"filingId": "300", "date": "2026-09-14"}]),
                              encoding="utf-8")
        self.reader(lambda url: b"%PDF-1.4 x")
        self.run_fetch()
        self.assertEqual(self.asked, [])

    def test_one_read_as_empty_is_asked_for_again_only_by_a_new_parser(self):
        self.ledger_of([bulletin(300, "2026-09-15"), bulletin(200, "2026-09-14")])
        self.store_of({"300": {"session": None, "rows": 0, "parser": tracker.PARSER},
                       "200": {"session": None, "rows": 0, "parser": "an older parser"}})
        self.reader(lambda url: b"%PDF-1.4 x")
        self.run_fetch()
        self.assertEqual(self.asked, ["https://example.invalid/200_101.pdf"])

    def test_a_limit_counts_what_was_asked_not_what_came_back(self):
        # On a runner the limit is what caps the cost of a host that refuses.
        self.ledger_of([bulletin(n, f"2026-09-{n:02d}") for n in range(1, 21)])
        self.reader(lambda url: b"no")
        got, _ = self.run_fetch(limit=3)
        self.assertEqual((got, len(self.asked)), (0, 3))

    def test_patience_is_the_callers_to_set(self):
        self.ledger_of([bulletin(n, f"2026-09-{n:02d}") for n in range(1, 21)])
        self.reader(lambda url: b"no")
        with contextlib.redirect_stderr(io.StringIO()):
            got = tracker.fetch_bulletins(6, patience=2)
        self.assertEqual((got, len(self.asked)), (0, 2))


# The head of the bulletin for the session of 14 Sep 2026 (filing 294700), as
# `pdftotext -layout` gives it, with no space after "Session".
SESSION_14_SEP = """Trading of Insiders, Major Shareholders & Their Related Parties on Listed Companies:
                              Trading Session14/09/2026

            Company Name                         Position         Transaction   Volume

           Mansourah Poultry                      Insider            Sell        33411

Industrial & Engineering Enterprises Co.          Insider            Sell       1532001

        Upper Egypt Flour Mills                   Insider            Buy         10000
"""
ALIASES = {tracker.canonical("Industrial & Engineering Enterprises Co."): "IEEC"}


def stored_row(filing, date, company, shares, n=1):
    return {"id": f"bulletin-{filing}-{n}", "filingId": str(filing), "sourceType": "bulletin",
            "date": date, "ticker": None, "company": company, "action": "sold",
            "shares": shares, "relationship": "insider"}


class Reading(unittest.TestCase):
    """What a machine holding some of the bulletins, or none, publishes."""

    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = pathlib.Path(tmp.name)
        self.pdfs = root / "pdfs"
        self.pdfs.mkdir()
        self.store = root / "insider_bulletin_rows.json"
        # No ledger unless a test writes one, as in the live job.
        self.ledger = root / "ledger.json"
        for name, value in (("PDF_DIR", self.pdfs), ("BULLETIN_STORE", self.store),
                            ("LEDGER", self.ledger)):
            patcher = mock.patch.object(tracker, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.texts = {}

    def ledger_of(self, *docs):
        self.ledger.write_text(json.dumps({"documents": [
            {"filingId": filing, "kind": "daily_insider_summary",
             "publishedAt": f"{published}T14:00:00", "sessionDate": titled}
            for filing, published, titled in docs]}), encoding="utf-8")

    def on_disk(self, filing, text):
        (self.pdfs / f"egx-{filing}-{filing}_101.pdf").write_bytes(b"%PDF-1.4 test")
        self.texts[str(filing)] = text

    def read(self, write=True, which="/usr/bin/pdftotext"):
        def pdftotext(cmd, **kwargs):
            filing = re.search(r"egx-(\d+)-", cmd[2]).group(1)
            return subprocess.CompletedProcess(cmd, 0, stdout=self.texts[filing], stderr="")
        with mock.patch.object(tracker.subprocess, "run", side_effect=pdftotext), \
             mock.patch.object(tracker.shutil, "which", return_value=which), \
             contextlib.redirect_stdout(io.StringIO()) as out:
            rows = tracker.parse_bulletin_pdfs(ALIASES, {}, write=write)
        return rows, out.getvalue()

    def held(self):
        return json.loads(self.store.read_text(encoding="utf-8"))

    def test_a_bulletin_is_read_into_its_session_and_numbered_within_itself(self):
        session, rows = tracker.bulletin_rows(SESSION_14_SEP, "294700", ALIASES, {})
        self.assertEqual(session, "2026-09-14")
        self.assertEqual([(r["id"], r["ticker"], r["action"], r["shares"]) for r in rows], [
            ("bulletin-294700-1", None, "sold", 33411),
            ("bulletin-294700-2", "IEEC", "sold", 1532001),
            ("bulletin-294700-3", None, "bought", 10000)])

    def test_a_runner_that_read_one_bulletin_keeps_every_other_session(self):
        # The store used to be replaced by whatever was on disk: harmless on the
        # laptop that holds every PDF, and 1,605 rows cut to one session's thirty
        # the first time a runner fetched anything.
        self.store.write_text(json.dumps([stored_row(294551, "2026-09-09", "Fawry", 1000)]),
                              encoding="utf-8")
        self.on_disk(294700, SESSION_14_SEP)
        rows, _ = self.read()
        self.assertEqual([r["date"] for r in rows], ["2026-09-09"] + ["2026-09-14"] * 3)
        held = self.held()
        self.assertEqual(len(held["rows"]), 4)
        self.assertEqual(held["read"]["294700"],
                         {"session": "2026-09-14", "rows": 3, "parser": tracker.PARSER})
        self.assertEqual(held["read"]["294551"]["rows"], 1)

    def test_a_bulletin_read_again_replaces_its_own_rows(self):
        self.store.write_text(json.dumps({
            "schemaVersion": 2, "read": {"294700": {"rows": 5}},
            "rows": [stored_row(294700, "2026-09-14", "Misread", 990 + n, n) for n in range(1, 6)],
        }), encoding="utf-8")
        self.on_disk(294700, SESSION_14_SEP)
        rows, _ = self.read()
        self.assertEqual([r["shares"] for r in rows], [33411, 1532001, 10000])

    def test_one_trade_printed_in_two_bulletins_is_published_once(self):
        self.on_disk(294700, SESSION_14_SEP)
        self.on_disk(294701, SESSION_14_SEP)
        rows, _ = self.read()
        self.assertEqual([r["filingId"] for r in rows], ["294700"] * 3)
        self.assertEqual(len(self.held()["rows"]), 6, "the store keeps what each bulletin said")

    def test_bulletins_waiting_and_no_pdftotext_stop_the_build(self):
        # The read used to swallow every exception, a missing binary included,
        # and publish the store as though nothing had arrived.
        self.on_disk(294700, SESSION_14_SEP)
        with self.assertRaises(SystemExit) as stop:
            self.read(which=None)
        self.assertIn("pdftotext", str(stop.exception.code))

    def test_no_pdftotext_is_no_trouble_with_nothing_to_read(self):
        # The fifteen-minute live job rebuilds this document with no bulletin
        # on disk and no poppler installed.
        self.store.write_text(json.dumps([stored_row(294551, "2026-09-09", "Fawry", 1000)]),
                              encoding="utf-8")
        rows, _ = self.read(which=None)
        self.assertEqual(len(rows), 1)

    def test_an_empty_read_is_remembered_and_said_out_loud(self):
        self.on_disk(294102, "  Trading Session 26/08/2026\n  a layout this parser misses\n")
        rows, out = self.read()
        self.assertEqual(rows, [])
        self.assertIn("::warning title=Session bulletin read as empty::", out)
        entry = self.held()["read"]["294102"]
        self.assertEqual(entry, {"session": "2026-08-26", "rows": 0, "parser": tracker.PARSER})
        self.assertTrue(tracker.is_read(entry))

    def test_a_check_writes_nothing(self):
        self.on_disk(294700, SESSION_14_SEP)
        rows, _ = self.read(write=False)
        self.assertEqual(len(rows), 3)
        self.assertFalse(self.store.exists())

    def test_a_run_with_nothing_new_leaves_the_store_alone(self):
        # So the live job, which never has a bulletin on disk, never carries a
        # change of its own to this file into a rebase.
        self.on_disk(294700, SESSION_14_SEP)
        self.read()
        (self.pdfs / "egx-294700-294700_101.pdf").unlink()
        self.store.chmod(0o444)
        self.addCleanup(self.store.chmod, 0o644)
        rows, _ = self.read()
        self.assertEqual(len(rows), 3)

    def test_trades_published_a_year_early_take_the_date_they_were_filed_under(self):
        # 289403, filed 4 Jun 2026: `03/06/2025` inside, `03/06/2026` in its
        # title, and 26 trades on the lens dated a year before they happened.
        self.store.write_text(json.dumps(
            [stored_row(289403, "2025-06-03", "Arab Dairy", 1000 + n, n) for n in range(1, 4)]),
            encoding="utf-8")
        self.ledger_of(("289403", "2026-06-04", "2026-06-03"))
        rows, out = self.read()
        self.assertEqual({r["date"] for r in rows}, {"2026-06-03"})
        self.assertEqual(self.held()["read"]["289403"]["session"], "2026-06-03")
        self.assertNotIn("::warning", out)

    def test_a_correction_is_made_once(self):
        self.store.write_text(json.dumps(
            [stored_row(279878, "2025-10-20", "Somebody", 500)]), encoding="utf-8")
        self.ledger_of(("279878", "2025-11-23", "2025-10-20"))
        _, first = self.read()
        self.store.chmod(0o444)
        self.addCleanup(self.store.chmod, 0o644)
        rows, second = self.read()
        self.assertIn("::warning title=Session bulletin date unclear::Bulletin 279878", first)
        self.assertEqual(second, "", "said again, or the store rewritten, on a run that changed nothing")
        self.assertEqual(rows[0]["date"], None)

    def test_undated_trades_in_two_bulletins_are_two_trades(self):
        self.store.write_text(json.dumps(
            [stored_row(279878, None, "Somebody", 500), stored_row(279959, None, "Somebody", 500)]),
            encoding="utf-8")
        rows, _ = self.read()
        self.assertEqual(len(rows), 2)

    def test_a_check_fetches_nothing(self):
        with mock.patch.object(tracker, "fetch_bulletins") as fetch, \
             mock.patch.object(tracker, "parse_bulletin_pdfs", return_value=[]) as parse, \
             mock.patch.object(tracker, "parse_latest_disclosures"), \
             mock.patch.object(tracker, "load_company_directory", return_value=({}, {})), \
             mock.patch.object(sys, "argv", ["build_insider_tracker.py", "--check", "--fetch", "5"]), \
             contextlib.redirect_stderr(io.StringIO()):
            tracker.main()
        fetch.assert_not_called()
        self.assertFalse(parse.call_args.kwargs["write"])


class SessionDates(unittest.TestCase):
    """Which session a bulletin is for, when its two printed dates disagree."""

    @staticmethod
    def filed(published, titled):
        return {"publishedAt": f"{published}T14:00:00", "sessionDate": titled}

    def test_a_year_misprinted_inside_gives_way_to_the_title(self):
        self.assertEqual(tracker.session_of("2025-06-03", self.filed("2026-06-04", "2026-06-03")),
                         "2026-06-03")

    def test_a_month_misprinted_inside_gives_way_to_the_title(self):
        # 292658, filed 9 Aug 2026.
        self.assertEqual(tracker.session_of("2026-07-06", self.filed("2026-08-09", "2026-08-06")),
                         "2026-08-06")

    def test_a_month_misprinted_in_the_title_gives_way_to_the_page(self):
        # Filed 23 Nov 2025 and titled for 20 Oct.
        self.assertEqual(tracker.session_of("2025-11-20", self.filed("2025-11-23", "2025-10-20")),
                         "2025-11-20")

    def test_neither_possible_is_no_date_at_all(self):
        self.assertIsNone(tracker.session_of("2025-10-20", self.filed("2025-11-23", "2025-10-20")))

    def test_a_session_after_its_bulletin_was_filed_is_not_possible(self):
        self.assertEqual(tracker.session_of("2026-09-20", self.filed("2026-09-15", "2026-09-14")),
                         "2026-09-14")

    def test_a_bulletin_filed_two_weeks_late_around_eid_keeps_its_session(self):
        self.assertEqual(tracker.session_of("2026-05-18", self.filed("2026-06-01", "2026-05-18")),
                         "2026-05-18")

    def test_without_the_filing_the_date_stays_as_read(self):
        self.assertEqual(tracker.session_of("2025-06-03", None), "2025-06-03")


class TheStep(unittest.TestCase):
    """What the build hears from the step that asks the exchange."""

    def run_step(self, pending, got=0, browser="/usr/bin/python3"):
        with mock.patch.object(tracker, "unread_bulletins", return_value=pending), \
             mock.patch.object(tracker, "fetch_bulletins", return_value=got) as fetch, \
             mock.patch.object(fetch_insider_bulletins.scrapling_python, "find",
                               return_value=browser), \
             contextlib.redirect_stdout(io.StringIO()):
            code = fetch_insider_bulletins.main(["--limit", "6"])
        return code, fetch

    def test_nothing_unread_is_a_quiet_day(self):
        code, fetch = self.run_step([])
        self.assertEqual(code, 0)
        fetch.assert_not_called()

    def test_no_browser_with_bulletins_waiting_is_no_progress(self):
        code, fetch = self.run_step([bulletin(300, "2026-09-15")], browser=None)
        self.assertEqual(code, NO_PROGRESS)
        fetch.assert_not_called()

    def test_nothing_coming_back_is_no_progress(self):
        code, fetch = self.run_step([bulletin(300, "2026-09-15")], got=0)
        self.assertEqual(code, NO_PROGRESS)
        fetch.assert_called_once_with(6, patience=2)

    def test_one_bulletin_is_progress(self):
        code, _ = self.run_step([bulletin(300, "2026-09-15")], got=1)
        self.assertEqual(code, 0)


class TheBuild(unittest.TestCase):
    def test_the_ledger_lists_them_the_step_fetches_them_the_tracker_reads_them(self):
        # The tracker used to run before the ledger, which on a runner does not
        # exist until its own step writes it.
        names = [n for n, *_ in build_all.STEPS]
        self.assertLess(names.index("Ownership ledger"), names.index("Session bulletins"))
        self.assertLess(names.index("Session bulletins"), names.index("Insider tracker"))

    def test_the_fetch_is_best_effort_and_the_read_is_not(self):
        self.assertIn("Session bulletins", build_all.BEST_EFFORT)
        self.assertNotIn("Insider tracker", build_all.BEST_EFFORT)

    def test_the_daily_build_installs_pdftotext_before_it_rebuilds(self):
        text = (WORKFLOWS / "publish-app-data.yml").read_text(encoding="utf-8")
        install = text.find("      - name: Install pdftotext")
        self.assertGreater(install, 0, "nothing on the runner could read a fetched bulletin")
        step = text[install:text.find("\n      - ", install + 1)]
        self.assertIn("poppler-utils", step)
        self.assertNotIn("continue-on-error", step)
        self.assertLess(install, text.index("      - name: Rebuild published data"))


def setattr_all(module, saved):
    (module.PDF_DIR, module.LEDGER, module.PAUSE_SECONDS,
     module.named_insiders.fetch_pdf, module.BULLETIN_STORE) = saved


if __name__ == "__main__":
    unittest.main()
