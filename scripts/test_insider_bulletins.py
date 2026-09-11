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
import tempfile
import unittest

import build_insider_tracker as tracker


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
        saved = (tracker.PDF_DIR, tracker.LEDGER, tracker.PAUSE_SECONDS,
                 tracker.named_insiders.fetch_pdf)
        tracker.PDF_DIR, tracker.LEDGER, tracker.PAUSE_SECONDS = self.pdfs, self.ledger, 0
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


def setattr_all(module, saved):
    (module.PDF_DIR, module.LEDGER, module.PAUSE_SECONDS,
     module.named_insiders.fetch_pdf) = saved


if __name__ == "__main__":
    unittest.main()
