#!/usr/bin/env python3
"""One company that never answers no longer stalls the harvest behind it.

The browser opens the first company's page before walking the rest, and when
that page never renders nobody is asked. The queue was in directory order, so
from 3 to 16 Sep 2026 the harvest answered nothing in 82 of 116 app-data
builds, in streaks of up to nineteen, with CAED at the head of the queue for
seventeen of them — and exited 0 every time.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import io
import json
import pathlib
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import harvest_company_filings as harvest  # noqa: E402
from step_outcome import NO_PROGRESS  # noqa: E402

TICKERS = ["AREH", "CAED", "CERA", "COMI", "ETEL"]


class TheQueue(unittest.TestCase):
    def test_directory_order_for_everyone_never_blamed(self):
        self.assertEqual(harvest.queue_for(TICKERS, {}), TICKERS)

    def test_a_company_that_sank_a_run_goes_behind_the_rest(self):
        state = {"AREH": {"unanswered": 1}, "CERA": {"asked": "2026-09-15"}}
        self.assertEqual(harvest.queue_for(TICKERS, state), ["CAED", "COMI", "ETEL", "AREH"])

    def test_the_most_often_blamed_go_last(self):
        state = {"AREH": {"unanswered": 2}, "CAED": {"unanswered": 1}}
        self.assertEqual(harvest.queue_for(TICKERS, state),
                         ["CERA", "COMI", "ETEL", "CAED", "AREH"])


class TheRun(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = pathlib.Path(tmp.name)
        self.state_path = root / "seen.json"
        companies = root / "companies.json"
        companies.write_text(json.dumps({"companies": [{"ticker": t} for t in TICKERS]}),
                             encoding="utf-8")
        for name, value in (("STATE", self.state_path), ("COMPANIES", companies),
                            ("SCRAPLING_PY", pathlib.Path(sys.executable))):
            patcher = mock.patch.object(harvest, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.batches = []

    def run_main(self, answer):
        def fetch_many(urls, spacing):
            self.batches.append(urls)
            return answer(urls)

        with mock.patch.object(harvest, "fetch_many", fetch_many), \
             mock.patch.object(harvest.disclosures, "archive_read", lambda: {}), \
             mock.patch.object(harvest.disclosures, "parse", lambda html: []), \
             mock.patch.object(sys, "argv", ["harvest_company_filings.py", "--limit", "2"]), \
             redirect_stdout(io.StringIO()) as log:
            return harvest.main(), log.getvalue()

    def state(self):
        return json.loads(self.state_path.read_text(encoding="utf-8"))

    def test_a_host_that_answered_nothing_is_no_progress(self):
        code, log = self.run_main(lambda urls: {})
        self.assertEqual(code, NO_PROGRESS, log)

    def test_the_company_it_opened_first_goes_to_the_back_and_the_next_run_starts_elsewhere(self):
        self.run_main(lambda urls: {})
        self.assertEqual(self.state()["AREH"]["unanswered"], 1)
        self.assertNotIn("asked", self.state()["AREH"])
        self.run_main(lambda urls: {})
        firsts = [batch[0] for batch in self.batches]
        self.assertIn("com=AREH", firsts[0])
        self.assertIn("com=CAED", firsts[1], "the same company sank the next run too")

    def test_pages_that_came_back_are_progress_even_with_nothing_new(self):
        code, log = self.run_main(lambda urls: {url: "<html></html>" for url in urls})
        self.assertEqual(code, 0, log)
        self.assertEqual(sorted(t for t, v in self.state().items() if "asked" in v),
                         ["AREH", "CAED"])

    def test_no_browser_with_companies_waiting_is_no_progress(self):
        with mock.patch.object(harvest, "SCRAPLING_PY", None):
            code, _ = self.run_main(lambda urls: self.fail("fetched with no browser"))
        self.assertEqual(code, NO_PROGRESS)

    def test_every_company_asked_is_a_quiet_day(self):
        self.state_path.write_text(json.dumps({t: {"asked": "2026-09-01"} for t in TICKERS}),
                                   encoding="utf-8")
        with mock.patch.object(harvest, "SCRAPLING_PY", None):
            code, _ = self.run_main(lambda urls: self.fail("asked with nothing to ask"))
        self.assertEqual(code, 0)


if __name__ == "__main__":
    unittest.main()
