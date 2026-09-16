#!/usr/bin/env python3
"""A 404 from Mubasher is an answer; silence is not.

Fourteen listed companies have no Mubasher page under their symbol, and the
harvest asked the first twelve of them in 115 of the 116 app-data builds from
3 to 16 Sep 2026 — "+0 names · 12 unreadable" and exit 0, a minute each time.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import datetime
import io
import json
import pathlib
import sys
import tempfile
import unittest
import urllib.error
from contextlib import redirect_stdout
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import harvest_names_mubasher as names  # noqa: E402
from step_outcome import NO_PROGRESS  # noqa: E402

PAGE = "<html><head><title>البنك التجاري الدولي - مصر ( سي أي بي) - معلومات مباشر</title></head></html>"


class TheHarvest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = pathlib.Path(tmp.name)
        for name, path in (("NAMES", root / "names.json"), ("ABSENT", root / "absent.json"),
                           ("COMPANIES", root / "companies.json")):
            patcher = mock.patch.object(names, name, path)
            patcher.start()
            self.addCleanup(patcher.stop)
        names.COMPANIES.write_text(json.dumps({"companies": [
            {"ticker": t} for t in ("COMI", "ANCC", "CID")]}), encoding="utf-8")
        names.NAMES.write_text(json.dumps({"COMI": "البنك التجاري الدولي"}), encoding="utf-8")
        self.asked = []
        self.today = datetime.date.today()

    def run_main(self, answers):
        def fetch(ticker, timeout=25):
            self.asked.append(ticker)
            return answers[ticker]

        with mock.patch.object(names, "fetch", fetch), \
             mock.patch.object(names.time, "sleep", lambda s: None), \
             mock.patch.object(sys, "argv", ["harvest_names_mubasher.py", "--limit", "12"]), \
             redirect_stdout(io.StringIO()) as log:
            return names.main(), log.getvalue()

    def absent(self):
        return json.loads(names.ABSENT.read_text(encoding="utf-8"))

    def test_a_404_is_remembered_and_not_asked_again_that_week(self):
        code, log = self.run_main({"ANCC": (404, None), "CID": (404, None)})
        self.assertEqual(code, 0, log)
        self.assertEqual(self.absent(), {"ANCC": self.today.isoformat(),
                                         "CID": self.today.isoformat()})
        self.asked.clear()
        code, log = self.run_main({})
        self.assertEqual(code, 0, log)
        self.assertEqual(self.asked, [], "a dead ticker was asked again the same week")
        self.assertIn("nothing to do", log)

    def test_after_a_week_it_is_asked_again(self):
        old = (self.today - datetime.timedelta(days=names.ABSENT_FOR_DAYS)).isoformat()
        recent = (self.today - datetime.timedelta(days=names.ABSENT_FOR_DAYS - 1)).isoformat()
        names.ABSENT.write_text(json.dumps({"ANCC": old, "CID": recent}), encoding="utf-8")
        self.run_main({"ANCC": (404, None)})
        self.assertEqual(self.asked, ["ANCC"])
        self.assertEqual(self.absent()["ANCC"], self.today.isoformat())

    def test_silence_is_no_progress(self):
        code, log = self.run_main({"ANCC": (None, None), "CID": (403, None)})
        self.assertEqual(code, NO_PROGRESS, log)
        self.assertEqual(self.absent(), {}, "a refusal was remembered as a missing page")

    def test_a_page_without_a_name_is_no_progress(self):
        # The title of Mubasher's own not-found page, measured on 16 Sep 2026.
        # Arabic and long enough, so without its own rule it was a name.
        blank = (200, "<html><title>معلومات مباشر </title></html>")
        self.assertIsNone(names.name_from(blank[1]))
        code, _ = self.run_main({"ANCC": blank, "CID": blank})
        self.assertEqual(code, NO_PROGRESS)
        self.assertNotIn("ANCC", json.loads(names.NAMES.read_text(encoding="utf-8")))

    def test_a_name_found_is_progress_and_ends_its_absence(self):
        old = (self.today - datetime.timedelta(days=30)).isoformat()
        names.ABSENT.write_text(json.dumps({"ANCC": old, "CID": old}), encoding="utf-8")
        code, _ = self.run_main({"ANCC": (200, PAGE), "CID": (None, None)})
        self.assertEqual(code, 0)
        self.assertIn("ANCC", json.loads(names.NAMES.read_text(encoding="utf-8")))
        self.assertNotIn("ANCC", self.absent())
        self.assertIn("CID", self.absent(), "silence is not a reason to forget a 404")


class TheFetch(unittest.TestCase):
    def test_a_404_and_silence_come_back_as_different_things(self):
        def not_found(request, timeout):
            raise urllib.error.HTTPError(request.full_url, 404, "Not Found", {}, None)

        def silent(request, timeout):
            raise TimeoutError("timed out")

        with mock.patch.object(names.urllib.request, "urlopen", not_found):
            self.assertEqual(names.fetch("ANCC"), (404, None))
        with mock.patch.object(names.urllib.request, "urlopen", silent):
            self.assertEqual(names.fetch("ANCC"), (None, None))


if __name__ == "__main__":
    unittest.main()
