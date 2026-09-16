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

import ast
import contextlib
import hashlib
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

    def test_a_table_filed_under_a_name_of_its_own_is_asked_for(self):
        # 293749 files the session of 20 Aug 2026 as `20-08-2026_english.pdf`
        # beside its Arabic `62936_1.pdf`, and was never fetched.
        self.ledger_of([{"filingId": "293749", "kind": "daily_insider_summary",
                         "publishedAt": "2026-08-23T13:25:29",
                         "attachments": ["https://example.invalid/62936_1.pdf",
                                         "https://example.invalid/20-08-2026_english.pdf"]}])
        self.reader(lambda url: b"%PDF-1.4 x")
        self.run_fetch()
        self.assertEqual(self.asked, ["https://example.invalid/20-08-2026_english.pdf"])
        self.assertEqual([p.name for p in self.pdfs.glob("egx-*")], ["egx-293749-20-08-2026_english.pdf"])

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
        self.store_of({"300": {"session": "2026-09-14", "rows": 26, "parser": tracker.PARSER}})
        self.reader(lambda url: b"%PDF-1.4 x")
        self.run_fetch()
        self.assertEqual(self.asked, ["https://example.invalid/200_101.pdf"])

    def test_the_store_as_it_was_before_keeps_its_rows_and_is_read_again(self):
        # A bare list of rows until 16 Sep 2026, from before any parser was
        # named: its rows stand until the bulletin is read again.
        self.ledger_of([bulletin(300, "2026-09-15")])
        self.store.write_text(json.dumps([{"filingId": "300", "date": "2026-09-14"}]),
                              encoding="utf-8")
        self.reader(lambda url: b"%PDF-1.4 x")
        self.run_fetch()
        self.assertEqual(self.asked, ["https://example.invalid/300_101.pdf"])
        self.assertEqual(len(tracker.load_store()["rows"]), 1)

    def test_a_bulletin_an_older_parser_read_is_asked_for_again_whatever_it_gave(self):
        # Rows are not a reading. 294700 gave 26 of its 29 trades and none of
        # its related parties, and a runner holding no PDF would have kept
        # them for as long as the store is kept.
        self.ledger_of([bulletin(300, "2026-09-15"), bulletin(200, "2026-09-14")])
        self.store_of({"300": {"session": "2026-09-14", "rows": 26, "parser": "251a12ab004f"},
                       "200": {"session": "2026-09-13", "rows": 31, "parser": tracker.PARSER}})
        self.reader(lambda url: b"%PDF-1.4 x")
        self.run_fetch()
        self.assertEqual(self.asked, ["https://example.invalid/300_101.pdf"])

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
        session, rows, unread = tracker.bulletin_rows(SESSION_14_SEP, "294700", ALIASES, {})
        self.assertEqual((session, unread), ("2026-09-14", []))
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

    def test_a_trade_printed_twice_in_a_bulletin_is_published_twice(self):
        # And once still, when a second bulletin prints the same session: it
        # adds only the copies beyond those the first printed.
        self.on_disk(294700, PAGE_ONE_14_SEP)
        self.on_disk(294701, PAGE_ONE_14_SEP)
        rows, _ = self.read()
        self.assertEqual([r["id"] for r in rows if r["shares"] == 100000],
                         ["bulletin-294700-16", "bulletin-294700-17"])
        self.assertEqual(len(rows), 22)

    def test_what_a_bulletin_left_out_is_kept_with_it_and_said(self):
        # So a runner, which keeps no PDF, still knows what was not published.
        self.on_disk(289734, BS_10_JUN)
        rows, out = self.read()
        self.assertEqual(len(rows), 4)
        self.assertEqual(self.held()["read"]["289734"]["unread"],
                         ['Credit Agricole Egypt, insider, 5,565 shares: the transaction reads "bs"'])
        self.assertIn("::warning title=Session bulletin partly read::", out)

    def test_each_session_a_bulletin_prints_is_checked_on_its_own(self):
        # 286467 prints two sessions. Checked by its first row alone, a second
        # printed a year early would stand.
        self.store.write_text(json.dumps([
            stored_row(286467, "2026-04-05", "El Ahram Co. For Printing And Packing", 16000, 1),
            stored_row(286467, "2025-04-02", "El Ahram Co. For Printing And Packing", 27764, 2)]),
            encoding="utf-8")
        self.ledger_of(("286467", "2026-04-15", "2026-04-02"))
        rows, _ = self.read()
        self.assertEqual([(r["shares"], r["date"]) for r in rows], [(16000, "2026-04-05"), (27764, "2026-04-02")])

    def test_rows_a_bulletins_reading_did_not_give_are_dropped(self):
        # Two builds racing union this store's rows by id. One that read 294700
        # with an older parser leaves its rows beside this reading's, under
        # ids this reading does not use, and the read record names this parser.
        reading = dict(stored_row(294700, "2026-09-14", "Mansourah Poultry", 33411, 1), parser=tracker.PARSER)
        left_over = stored_row(294700, "2026-09-14", "Mansourah Poultry", 33411, 971)
        self.store.write_text(json.dumps({
            "schemaVersion": 2,
            "read": {"294700": {"session": "2026-09-14", "rows": 1, "parser": tracker.PARSER}},
            "rows": [reading, left_over]}), encoding="utf-8")
        rows, _ = self.read()
        self.assertEqual([r["id"] for r in rows], ["bulletin-294700-1"])
        self.assertEqual([r["id"] for r in self.held()["rows"]], ["bulletin-294700-1"])
        self.assertNotIn("parser", rows[0], "which parser read a row is published")

    def test_an_unclear_date_counts_the_trades_it_leaves_undated(self):
        # Not every undated row in the bulletin: one already published without
        # a date was not left so by this check.
        self.store.write_text(json.dumps([
            stored_row(279878, None, "Somebody", 500, 1),
            stored_row(279878, "2025-10-20", "Somebody else", 700, 2)]), encoding="utf-8")
        self.ledger_of(("279878", "2025-11-23", "2025-10-20"))
        _, out = self.read()
        self.assertIn("Its 1 trades are published without a date.", out)

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


# ── What a bulletin prints, read row by row ──────────────────────────────────
#
# Each excerpt is `pdftotext -layout` output of a bulletin on the laptop, its
# lines whole and in order, trailing spaces stripped. Where rows are left out,
# whole rows are.

# 294700, the session of 14 Sep 2026: its first page and the first rows of its second.
PAGE_ONE_14_SEP = """\
Trading of Insiders, Major Shareholders & Their Related Parties on Listed Companies:
                              Trading Session14/09/2026

            Company Name                         Position         Transaction   Volume

           Mansourah Poultry                      Insider            Sell        33411

                                            related parties for
   International Agricultural Products                               Buy         5000
                                                  insider

Industrial & Engineering Enterprises Co.          Insider            Sell       1532001

        Upper Egypt Flour Mills                   Insider            Buy         10000

                                            related parties for
    Golden Textiles & Clothes Wool                                   Buy          500
                                                  insider

     Delta For Printing & Packaging               Insider            Sell         70

     Delta For Printing & Packaging               Insider            Buy          70

     FERCHEM MISR CO. FOR
                                                  Insider            Sell        9000
    FERTILLIZERS & CHEMICALS

The Arab Ceramic CO.- Ceramica Remas Major Shareholder               Sell       65500000

Future care for medical industries (FCMI)         Insider            Buy         25000

    Taaleem Management Services                   Insider            Sell       150000

 Commercial International Bank- Egypt
                                                  Insider            Sell        20000
                 (CIB)

           Heliopolis Housing                     Insider            Buy         65000

           Heliopolis Housing                     Insider            Sell        10000

   Palm Hills Development Company                 Insider            Buy         25000

   Palm Hills Development Company                 Insider            Buy        100000

   Palm Hills Development Company                 Insider            Buy        100000

                                            related parties for
Arabia for Investment and Development                                Buy        1000000
                                            Major Shareholder

                GB Corp                           Insider            Buy        135000

                                            related parties for
          EFG Holding Group                                          Sell        10000
                                                  insider
\f  Naeem Real Estate Holding Group               Insider         Buy    50000


  Naeem Real Estate Holding Group               Insider         Sell   5000000
"""

# 294700, further down its second page.
ALAM_14_SEP = """\
                                          related parties for
     Egyptian for Tourism Resorts                               Buy    55959
                                                insider

   Marsa Marsa Alam For Tourism           related parties for
                                                                Buy     1000
           Development                    Major Shareholder

     Cleopatra Hospital Company                 Insider         Buy     1000
"""

# 290139, which gave no rows: every volume a line below its transaction.
VOLUME_BELOW_17_JUN = """\
Trading of Insiders, Major Shareholders & Their Related Parties on Listed Companies: Trading
Session 17/06//2026

                    Company Name                             Position                 Volume
                                                                             Transa
                                                        related parties of
           International Agricultural Products                                buy
                                                        main shareholder                       900
    Creast Mark For Contracting And Real Estate
  DevelopmentCreast Mark For Contracting And Real             insider         buy
                Estate Development                                                      9923705
    Creast Mark For Contracting And Real Estate
                                                              insider         buy
                   Development                                                         15000000

               Juhayna Food Industries                        insider         sold
                                                                                               5500

                   Oriental Weavers                           insider         buy
                                                                                               7250

                     Extracted Oils                           insider         buy
                                                                                          50000

                     Extracted Oils                           insider         sold
                                                                                          50000
"""

# 294102, which gave no rows, with three of its rows left out.
VOLUME_TWO_BELOW_26_AUG = """\
Trading of Insiders, Major Shareholders & Their Related Parties on Listed Companies: Trading
Session 26/08/2026

                   Company Name                              Position                 Volume
                                                                             Transa
  Lotus For Agricultural Investments And Development          insider         sold
                                                                                        9000000
        Industrial & Engineering Enterprises Co.              insider         sold
                                                                                                 1
                                                        related parties of
     Alexandria Spinning & Weaving (SPINALEX)                                 sold
                                                              insider                    125868
                                                        related parties of
            Golden Textiles & Clothes Wool                                    sold
                                                              insider
                                                                                          15000

              Alexandria Pharmaceuticals                      insider         buy
                                                                                                11

              Alexandria Pharmaceuticals                      insider         sold
                                                                                                22
"""

# 292335, which gave no rows.
DOUBLE_SLASH_30_JUL = """\
Trading of Insiders, Major Shareholders & Their Related Parties on Listed Companies: Trading
Session30/07//2026

                   Company Name                              Position                 Volume
                                                                             Transa
                                                        related parties of
         Atlas for Investment & Food Industries                               buy
                                                              insider                  12000000
                                                        related parties of
         Atlas for Investment & Food Industries                               sold
                                                              insider                  12000000

        Industrial & Engineering Enterprises Co.              insider         buy
                                                                                        1900000
"""

# 280751, with seven of its rows left out.
WRAPPED_POSITIONS_9_DEC = """\
    Trading of Insiders, Major Shareholders & Their Related Parties on Listed
                     Companies: Trading Session 09/12/2025

         Company Name                     Position       Transaction   Volume
Industrial & Engineering Enterprises   related parties
                                                            buy        500000
                 Co.                      for insider

 El Nasr Clothes & Textiles (Kabo)         insider          buy        832205

                                       related parties
 El Nasr Clothes & Textiles (Kabo)                          sell       832205
                                          for insider
    Nozha International Hospital           insider          buy         2778

                                          Major
    Nozha International Hospital                            sell        50000
                                        Shareholder
"""

# 277293, the foot of its first page.
THREE_NAMES_WRAPPED_29_OCT = """\
   E-Finance For Digital and      related parties for
                                                        sell   263503
  Financial Investements SAE            insider
     Heibco for commercial
                                  related parties for
   investments & real estate                            sell   101555
                                        insider
         development
Union Pharmacist Company For
                                        insider         buy    30000
Medical Services and Investment
"""

# 289734.
BS_10_JUN = """\
AJWA for Food Industries company -
                                             insider            buy          850
              Egypt

         Oriental Weavers                    insider            buy          50

       Credit Agricole Egypt                 insider             bs         5565

 Commercial International Bank-
                                             insider            sell        7000
         Egypt (CIB)

        Egyptian Gulf Bank                   insider            sell        9961
"""

# 290042, the foot of its second page.
NO_TRANSACTION_16_JUN = """\
        Pyramisa Hotels                    insider         sell    2000
Fawry For Banking Technology And     related parties for
                                                           buy    750000
       Electronic Payment                  insider
Future care for medical industries
                                           insider                80000
              (FCMI)
Future care for medical industries
                                           insider                25000
              (FCMI)
Future care for medical industries
                                           insider                 1201
              (FCMI)
"""

# 283193, with some of its rows left out.
EPOS_4_FEB = """\
Trading of Insiders, Major Shareholders & Their Related Parties on Listed Companies: Trading
Session 04/02/2026

                   Company Name                              Position                 Volume
                                                                             Transa
Sabaa International Company For Pharmaceutical and
                                                        main share holder     sold
                      Chemical                                                           200000

            Taaleem Management Services                       insider         buy
                                                                                          30000

            Taaleem Management Services                       EPOS            sold
                                                                                          19828

                                                        related parties of
       The Egyptian Modern Education Systems                                  sold
                                                        main sharehloder                7100000
"""

# 294409.
NA_POSITION_6_SEP = """\
    Egyptian Financial & Industrial              Insider            Sell        55000

         U Consumer Finance                       #N/A              Sell       6911482

         U Consumer Finance                       #N/A              Sell       985792
"""

# 294355.
NA_COMPANY_3_SEP = """\
  Palm Hills Development Company                Insider         Sell   50000


                 #N/A                           Insider         Buy    60000


  Naeem Real Estate Holding Group               Insider         Sell   10000
"""

# 286467, a supplement for two sessions, whole.
TWO_SESSIONS = """\
Trading of Insiders, Major Shareholders & Their Related Parties on Listed
Companies: Trading Sessions 02/04/2026 05/04/2026

              Company Name                         Position                 Volume session
                                                                   Trans
                                              related parties of
   El Ahram Co. For Printing And Packing                           buy
                                              main shareholder               27764     02/04/2026
                                              related parties of
   El Ahram Co. For Printing And Packing                           buy
                                              main shareholder               16000     05/04/2026
"""

# 285427.
ARABIC_NAME = """\
    Minapharm Pharmaceuticals                      insider            sell       10790

   \u202bسبأ الدولية لألدوية والصناعات الكيماوية\u202c   Major Sharholder         sell       169217
"""

# 277127.
RIGHTS_1_OCT = """\
     MM Group Industrial &            related parties for
                                                               sell        250000
  International Trade (In Kind)             insider
 Subscription Rights Of Creast
                                            insider            buy        24358079
 Mark For Contracting& Real Est
   E-Finance For Digital and          related parties for
                                                               sell        616888
  Financial Investements SAE                insider
"""

def manual_aliases():
    """The tracker's own aliases without the published directory, so that a
    company is named the way its bulletin prints it."""
    with tempfile.TemporaryDirectory() as tmp:
        empty = pathlib.Path(tmp) / "companies.json"
        empty.write_text('{"companies": []}', encoding="utf-8")
        with mock.patch.object(tracker, "COMPANIES_FILE", empty):
            return tracker.load_company_directory()[1]


MANUAL_ALIASES = manual_aliases()


def read(text, filing="0"):
    return tracker.bulletin_rows(text, filing, MANUAL_ALIASES, {})


def trades(text):
    return [(r["company"], r["relationship"], r["action"], r["shares"]) for r in read(text)[1]]


class ReadingTheTable(unittest.TestCase):
    """Every row a bulletin prints, and nothing it does not.

    Read a line at a time until 16 Sep 2026, 7 of the 68 bulletins on the
    laptop gave no rows, 294700 gave 26 of its 29, and not one related party
    was published as one. Against the 5,501 trades the 230 bulletins filed
    since October 2025 print, read from each PDF's own table rules and word
    positions, that parser read 4,573, and 1,465 of those with the wrong
    relationship.
    """

    def test_every_trade_on_the_page_is_read(self):
        self.assertEqual(trades(PAGE_ONE_14_SEP), [
            ("Mansourah Poultry", "insider", "sold", 33411),
            ("International Agricultural Products", "related_party", "bought", 5000),
            ("Industrial & Engineering Enterprises Co.", "insider", "sold", 1532001),
            ("Upper Egypt Flour Mills", "insider", "bought", 10000),
            ("Golden Textiles & Clothes Wool", "related_party", "bought", 500),
            ("Delta For Printing & Packaging", "insider", "sold", 70),
            ("Delta For Printing & Packaging", "insider", "bought", 70),
            ("FERCHEM MISR CO. FOR FERTILLIZERS & CHEMICALS", "insider", "sold", 9000),
            ("The Arab Ceramic CO.- Ceramica Remas", "major_holder", "sold", 65500000),
            ("Future care for medical industries (FCMI)", "insider", "bought", 25000),
            ("Taaleem Management Services", "insider", "sold", 150000),
            ("Commercial International Bank- Egypt (CIB)", "insider", "sold", 20000),
            ("Heliopolis Housing", "insider", "bought", 65000),
            ("Heliopolis Housing", "insider", "sold", 10000),
            ("Palm Hills Development Company", "insider", "bought", 25000),
            ("Palm Hills Development Company", "insider", "bought", 100000),
            ("Palm Hills Development Company", "insider", "bought", 100000),
            ("Arabia for Investment and Development", "related_party", "bought", 1000000),
            ("GB Corp", "insider", "bought", 135000),
            ("EFG Holding Group", "related_party", "sold", 10000),
            ("Naeem Real Estate Holding Group", "insider", "bought", 50000),
            ("Naeem Real Estate Holding Group", "insider", "sold", 5000000)])

    def test_a_trade_under_a_hundred_shares_is_a_trade(self):
        # A volume had to be three digits long. Delta For Printing & Packaging's
        # insider sold 70 shares and bought 70 on the 14th, and 294102 prints
        # a sale of one share and an Alexandria Pharmaceuticals buy of eleven.
        self.assertIn(("Delta For Printing & Packaging", "insider", "sold", 70), trades(PAGE_ONE_14_SEP))
        self.assertIn(("Delta For Printing & Packaging", "insider", "bought", 70), trades(PAGE_ONE_14_SEP))
        self.assertEqual([r["shares"] for r in read(VOLUME_TWO_BELOW_26_AUG)[1]][1], 1)

    def test_a_related_party_is_one_when_its_position_wraps_round_the_trade(self):
        # "related parties for" prints a line above the trade and "insider" a
        # line below, and the trade was published as an insider's.
        rows = read(PAGE_ONE_14_SEP)[1]
        self.assertEqual(
            [(r["company"], r["positionRaw"], r["relationshipLabel"])
             for r in rows if r["relationship"] == "related_party"], [
                ("International Agricultural Products", "related parties for insider", "Connected Group"),
                ("Golden Textiles & Clothes Wool", "related parties for insider", "Connected Group"),
                ("Arabia for Investment and Development", "related parties for major shareholder",
                 "Connected Group"),
                ("EFG Holding Group", "related parties for insider", "Connected Group")])
        self.assertEqual(trades(ALAM_14_SEP)[1],
                         ("Marsa Marsa Alam For Tourism Development", "related_party", "bought", 1000))

    def test_a_position_can_wrap_at_any_word(self):
        # 280751 prints "related parties" above a trade and "for insider" below
        # it, and "Major" above and "Shareholder" below.
        self.assertEqual(trades(WRAPPED_POSITIONS_9_DEC), [
            ("Industrial & Engineering Enterprises Co.", "related_party", "bought", 500000),
            ("El Nasr Clothes & Textiles (Kabo)", "insider", "bought", 832205),
            ("El Nasr Clothes & Textiles (Kabo)", "related_party", "sold", 832205),
            ("Nozha International Hospital", "insider", "bought", 2778),
            ("Nozha International Hospital", "major_holder", "sold", 50000)])

    def test_a_word_a_position_could_start_with_stays_in_the_name_it_ends(self):
        # "FOR" would begin "for insider"; printed at the left, it is FERCHEM's.
        rows = read(PAGE_ONE_14_SEP)[1]
        self.assertEqual((rows[7]["company"], rows[7]["positionRaw"]),
                         ("FERCHEM MISR CO. FOR FERTILLIZERS & CHEMICALS", "insider"))

    def test_a_volume_printed_below_its_transaction_is_its_volume(self):
        session, rows, unread = read(VOLUME_BELOW_17_JUN)
        self.assertEqual(session, "2026-06-17")
        self.assertEqual([r["shares"] for r in rows], [900, 9923705, 15000000, 5500, 7250, 50000, 50000])
        self.assertEqual(unread, [])

    def test_a_volume_two_lines_below_its_transaction_is_its_volume(self):
        # Under a position that takes two lines, the volume is under both.
        self.assertEqual([r["shares"] for r in read(VOLUME_TWO_BELOW_26_AUG)[1]],
                         [9000000, 1, 125868, 15000, 11, 22])
        session, rows, _ = read(DOUBLE_SLASH_30_JUL)
        self.assertEqual((session, [r["shares"] for r in rows]),
                         ("2026-07-30", [12000000, 12000000, 1900000]))

    def test_a_wrapped_name_belongs_to_the_row_it_is_centred_on(self):
        # 290139 prints one row's name on three lines and the next row's on two
        # with nothing between them, and 277293 wraps three names in a row.
        # Handed to the nearest row a line at a time, they come apart.
        self.assertEqual([r["company"] for r in read(VOLUME_BELOW_17_JUN)[1]][1:3], [
            "Creast Mark For Contracting And Real Estate DevelopmentCreast Mark For Contracting "
            "And Real Estate Development",
            "Creast Mark For Contracting And Real Estate Development"])
        self.assertEqual([r["company"] for r in read(THREE_NAMES_WRAPPED_29_OCT)[1]], [
            "E-Finance For Digital and Financial Investements SAE",
            "Heibco for commercial investments & real estate development",
            "Union Pharmacist Company For Medical Services and Investment"])

    def test_the_first_row_on_a_page_is_read(self):
        # The line a page starts on carries its form feed, and was skipped.
        self.assertIn(("Naeem Real Estate Holding Group", "insider", "bought", 50000),
                      trades(PAGE_ONE_14_SEP))

    def test_a_trade_printed_twice_is_two_trades(self):
        # 294700 prints a Palm Hills insider buying 100,000 shares on two rows.
        self.assertEqual(trades(PAGE_ONE_14_SEP).count(
            ("Palm Hills Development Company", "insider", "bought", 100000)), 2)

    def test_a_transaction_that_is_not_a_direction_is_said_and_not_published(self):
        # 289734 prints "bs" for Credit Agricole Egypt. The rows round it keep
        # their companies, volumes and ids.
        _, rows, unread = read(BS_10_JUN, "289734")
        self.assertEqual([(r["id"], r["company"], r["shares"]) for r in rows], [
            ("bulletin-289734-1", "AJWA for Food Industries company - Egypt", 850),
            ("bulletin-289734-2", "Oriental Weavers", 50),
            ("bulletin-289734-4", "Commercial International Bank- Egypt (CIB)", 7000),
            ("bulletin-289734-5", "Egyptian Gulf Bank", 9961)])
        self.assertEqual(unread, ['Credit Agricole Egypt, insider, 5,565 shares: the transaction reads "bs"'])

    def test_a_row_with_no_transaction_is_said_and_not_published(self):
        # 290042 leaves three of FCMI's Transaction cells empty.
        _, rows, unread = read(NO_TRANSACTION_16_JUN, "290042")
        self.assertEqual([(r["company"], r["action"], r["shares"]) for r in rows], [
            ("Pyramisa Hotels", "sold", 2000),
            ("Fawry For Banking Technology And Electronic Payment", "bought", 750000)])
        self.assertEqual(unread, [
            f"Future care for medical industries (FCMI), insider, {n} shares: no transaction printed"
            for n in ("80,000", "25,000", "1,201")])

    def test_a_position_is_read_however_the_exchange_spells_it(self):
        self.assertEqual([(r["positionRaw"], r["relationship"]) for r in read(EPOS_4_FEB)[1]], [
            ("main share holder", "major_holder"),
            ("insider", "insider"),
            ("epos", "esop"),
            ("related parties of main sharehloder", "related_party")])

    def test_an_incentive_scheme_is_not_published_as_an_insider(self):
        # "ESOP", and once "EPOS": the Arabic bulletin names it
        # «نظام الإثابة والتحفيز». 51 rows were published as insiders' trades.
        row = read(EPOS_4_FEB)[1][2]
        self.assertEqual((row["relationship"], row["relationshipLabel"], row["relationshipLabelAr"]),
                         ("esop", "Employee Incentive Scheme (ESOP)", "نظام الإثابة والتحفيز"))

    def test_a_position_printed_as_na_is_not_given_one(self):
        # 294409 prints "#N/A". Its Arabic bulletin says related parties of the
        # main shareholder, and the English one does not say.
        self.assertEqual([(r["relationship"], r["relationshipLabel"]) for r in read(NA_POSITION_6_SEP)[1]],
                         [("insider", "Insider / Board"), ("unstated", "Position Not Stated"),
                          ("unstated", "Position Not Stated")])

    def test_a_company_printed_as_na_is_said_and_not_given_one(self):
        # 294355's "#N/A" buy of 60,000 shares was published as Delta
        # Construction & Rebuilding's.
        _, rows, unread = read(NA_COMPANY_3_SEP, "294355")
        self.assertEqual([(r["id"], r["company"]) for r in rows], [
            ("bulletin-294355-1", "Palm Hills Development Company"),
            ("bulletin-294355-3", "Naeem Real Estate Holding Group")])
        self.assertEqual(unread, ["#N/A, Insider, 60,000 shares: no company name printed"])

    def test_a_supplement_for_two_sessions_dates_each_row_with_its_own(self):
        _, rows, _ = read(TWO_SESSIONS, "286467")
        self.assertEqual([(r["date"], r["shares"]) for r in rows], [("2026-04-02", 27764), ("2026-04-05", 16000)])

    def test_an_arabic_name_is_read_without_its_marks_and_matched_to_nothing(self):
        # 285427 prints Sabaa International's name in Arabic, and its trade was
        # published under the first company in the directory.
        row = read(ARABIC_NAME)[1][1]
        self.assertEqual((row["company"], row["ticker"]), ("سبأ الدولية لألدوية والصناعات الكيماوية", None))

    def test_subscription_rights_are_not_the_companys_shares(self):
        rows = read(RIGHTS_1_OCT)[1]
        self.assertEqual((rows[1]["company"], rows[1]["ticker"], rows[1]["shares"]),
                         ("Subscription Rights Of Creast Mark For Contracting& Real Est", None, 24358079))


class Tickers(unittest.TestCase):
    def test_a_name_with_nothing_left_to_match_matches_no_company(self):
        for name in ("#N/A", "سبأ الدولية لألدوية والصناعات الكيماوية", "Co."):
            self.assertIsNone(tracker.resolve_ticker(name, MANUAL_ALIASES), name)

    def test_names_the_bulletins_print_are_the_tickers_the_directory_lists(self):
        # FCMI and ALIC were never tickers, so their trades carried no company.
        for printed, ticker in (
                ("E-Finance For Digital and Financial Investements SAE", "EFIH"),
                ("Arab Real Estate Investment CO.- ALICO", "RREI"),
                ("Future care for medical industries (FCMI)", "FCMD"),
                ("International company For Medical Industries -ICMI", "FCMD"),
                ("Medinet MASR Housing", "MASR"),
                ("Egyptian Arabian (cmar) Securities Brokerage and Bonds EAC", "EASB"),
                ("Alexandria Medical Services", "AMES"),
                ("Engineering Industries (ICON)", "ENGC"),
                ("Al Khair River For Development Agricultural Investment&Envir", "KRDI")):
            self.assertEqual(tracker.resolve_ticker(printed, MANUAL_ALIASES), ticker, printed)


class TheParserFingerprint(unittest.TestCase):
    def test_everything_a_bulletin_is_read_with_is_in_the_fingerprint(self):
        # PARSER hashes one section of the tracker, and a bulletin read by any
        # other parser is fetched again. A helper written outside that section
        # could change every reading and have none of them read again.
        source = pathlib.Path(tracker.__file__).read_text(encoding="utf-8")
        start = source.index("# ── How a session bulletin is read ")
        end = source.index("# ── end of how a session bulletin is read ", start)
        first, last = source.count("\n", 0, start) + 1, source.count("\n", 0, end) + 1
        defined = {}
        for node in ast.parse(source).body:
            if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                defined[node.name] = node
            for target in getattr(node, "targets", []):
                if isinstance(target, ast.Name):
                    defined[target.id] = node
        # The directory is looked up, not read from the page.
        looked_up = {"resolve_ticker"}
        seen, todo = set(), ["bulletin_rows"]
        while todo:
            name = todo.pop()
            if name in seen or name not in defined or name in looked_up:
                continue
            seen.add(name)
            node = defined[name]
            self.assertTrue(first <= node.lineno and node.end_lineno <= last,
                            f"{name} reads bulletins from outside the fingerprinted section")
            todo += [n.id for n in ast.walk(node) if isinstance(n, ast.Name)]
        self.assertLessEqual({"_page_trades", "_split_line", "_POSITION_WORDS"}, seen)
        self.assertEqual(tracker.PARSER, hashlib.sha256(source[start:end].encode("utf-8")).hexdigest()[:12])


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
