#!/usr/bin/env python3
"""Finding the browser, and coping without one.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import os
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import scrapling_python  # noqa: E402


class FindTest(unittest.TestCase):
    def setUp(self):
        self._saved = os.environ.get("SCRAPLING_PYTHON")

    def tearDown(self):
        if self._saved is None:
            os.environ.pop("SCRAPLING_PYTHON", None)
        else:
            os.environ["SCRAPLING_PYTHON"] = self._saved

    def test_an_explicit_path_is_used_when_it_exists(self):
        os.environ["SCRAPLING_PYTHON"] = sys.executable
        self.assertEqual(scrapling_python.find(), pathlib.Path(sys.executable))

    def test_an_explicit_path_that_is_missing_returns_none(self):
        """No falling through to a guess.

        Falling back when the stated path is wrong is how a CI box silently
        uses something other than what it was told to — and how a test of
        "what happens with no browser" quietly finds one and passes.
        """
        os.environ["SCRAPLING_PYTHON"] = "/nonexistent/python"
        self.assertIsNone(scrapling_python.find())

    def test_nothing_is_hardcoded_to_one_developers_home(self):
        """The bug this module exists for.

        Four scripts pointed at an absolute path inside one home directory. On
        a runner it did not exist, the disclosures step returned 1, `--check`
        treated that as a validation failure, and the daily build aborted
        before writing anything — so the market snapshot, the company
        documents, the macro series and the crossings stopped updating for
        three days while the fifteen-minute news job kept succeeding and the
        app looked alive.
        """
        here = pathlib.Path(__file__).resolve().parent
        for name in (
            "build_disclosures_api.py",
            "build_financials_api.py",
            "harvest_company_names.py",
            "harvest_company_filings.py",
        ):
            with self.subTest(name):
                body = (here / name).read_text(encoding="utf-8")
                self.assertNotIn(
                    "/Users/",
                    body.split("SCRAPLING_PY")[0][-400:] if "SCRAPLING_PY" in body else "",
                    f"{name} still hardcodes a home directory",
                )
                self.assertIn("scrapling_python.find()", body)


if __name__ == "__main__":
    unittest.main()
