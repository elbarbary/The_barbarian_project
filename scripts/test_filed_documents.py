#!/usr/bin/env python3
"""A filing's documents, once read, stay read.

Filed documents logged "read 8" in 61 of the 116 app-data builds from 3 to
16 Sep 2026, and every one of those builds started from between 289 and 297
filings read. The eight were the newest unread filings, and the next
disclosures fetch replaced each with a copy that had never been read, so the
step spent eight requests a run at a host that rate-limits hard, on the same
eight filings, for two weeks.

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

import build_disclosures_api as bdi  # noqa: E402
import enrich_disclosures as enrich  # noqa: E402
import translations  # noqa: E402
from step_outcome import NO_PROGRESS  # noqa: E402

ATTACHMENTS = [{"title": "القوائم المالية", "url": "https://www.egx.com.eg/downloads/Bulletins/1_1.pdf"}]


def fetched(ident: str) -> dict:
    """A filing as `fetch_beta` returns it: nothing from its detail page."""
    return {"id": ident, "title": "بيان عن نتائج الأعمال (MBSC.CA)", "date": "2026-09-15",
            "link": "", "tickers": []}


def labelled(batch, held=None, deadline=None):
    for item in batch:
        item.setdefault("event", "statement")
        item.setdefault("by", "rule")


class TheFetchKeepsWhatWasRead(unittest.TestCase):
    def test_carry_detail_keeps_the_reading_and_nothing_else(self):
        held = {**fetched("egx-1"), "title": "an older title", "detail_read": True,
                "attachments": ATTACHMENTS}
        item = bdi.carry_detail(fetched("egx-1"), held)
        self.assertTrue(item["detail_read"])
        self.assertEqual(item["attachments"], ATTACHMENTS)
        # The fetched copy is still the fresher one for everything the feed does say.
        self.assertEqual(item["title"], fetched("egx-1")["title"])

    def test_a_filing_never_held_is_untouched(self):
        self.assertEqual(bdi.carry_detail(fetched("egx-2"), None), fetched("egx-2"))

    def test_a_refetched_filing_is_published_still_read(self):
        """Through the real merge in `main`, which is where the reading was lost."""
        held = {"egx-1": {**fetched("egx-1"), "event": "statement", "by": "rule",
                          "detail_read": True, "attachments": ATTACHMENTS}}
        written = {}
        with tempfile.TemporaryDirectory() as out, tempfile.TemporaryDirectory() as fixtures, \
                mock.patch.object(bdi, "OUT", pathlib.Path(out)), \
                mock.patch.object(bdi, "FIXTURES", pathlib.Path(fixtures)), \
                mock.patch.object(bdi, "archive_read", lambda: {k: dict(v) for k, v in held.items()}), \
                mock.patch.object(bdi, "archive_write",
                                  lambda items: written.update({i["id"]: i for i in items}) or []), \
                mock.patch.object(bdi, "fetch_beta", lambda days: [fetched("egx-1"), fetched("egx-2")]), \
                mock.patch.object(bdi, "learn_names", lambda batch: None), \
                mock.patch.object(bdi, "classify_all", labelled), \
                mock.patch.object(translations, "english_for", lambda texts, **_: {}), \
                mock.patch.object(sys, "argv", ["build_disclosures_api.py"]), \
                redirect_stdout(io.StringIO()):
            self.assertEqual(bdi.main(), 0)
        self.assertTrue(written["egx-1"].get("detail_read"), "the fetch un-read the filing")
        self.assertEqual(written["egx-1"].get("attachments"), ATTACHMENTS)
        self.assertNotIn("detail_read", written["egx-2"])


class EnrichSaysWhenNothingCameBack(unittest.TestCase):
    """"The host answered nothing" was exit 1, a WAF page every time was exit 0."""

    def setUp(self):
        self.items = {f"egx-{n}": {**fetched(f"egx-{n}"), "event": "statement"} for n in range(3)}
        self.written = []

    def run_main(self, pages, detail, find=lambda: pathlib.Path(sys.executable)):
        with tempfile.TemporaryDirectory() as out, \
                mock.patch.object(enrich, "load", lambda: self.items), \
                mock.patch.object(enrich.scrapling_python, "find", find), \
                mock.patch.object(enrich, "_fetch_details", lambda ids, spacing: pages(ids)), \
                mock.patch.object(enrich, "parse_detail", detail), \
                mock.patch.object(enrich.disclosures, "OUT", pathlib.Path(out)), \
                mock.patch.object(enrich.disclosures, "archive_write", self.written.append), \
                mock.patch.object(sys, "argv", ["enrich_disclosures.py", "--limit", "3"]), \
                redirect_stdout(io.StringIO()) as log:
            return enrich.main(), log.getvalue()

    def test_a_host_that_answered_nothing_is_no_progress(self):
        code, log = self.run_main(lambda ids: {}, lambda page: None)
        self.assertEqual(code, NO_PROGRESS, log)
        self.assertEqual(self.written, [])

    def test_pages_that_are_never_a_filing_are_no_progress(self):
        code, log = self.run_main(lambda ids: {i: "<html>challenge</html>" for i in ids},
                                  lambda page: None)
        self.assertEqual(code, NO_PROGRESS, log)
        self.assertEqual(self.written, [], "nothing was learned, so nothing is written")

    def test_no_browser_is_no_progress_and_asks_nothing(self):
        def pages(ids):
            raise AssertionError("fetched with no interpreter")
        code, _ = self.run_main(pages, lambda page: None, find=lambda: None)
        self.assertEqual(code, NO_PROGRESS)

    def test_one_filing_read_is_progress(self):
        def detail(page):
            return {"attachments": ATTACHMENTS} if page == "filing" else None
        code, log = self.run_main(
            lambda ids: {ids[0]: "filing", **{i: "<html>challenge</html>" for i in ids[1:]}},
            detail)
        self.assertEqual(code, 0, log)
        self.assertEqual(sum(1 for i in self.items.values() if i.get("detail_read")), 1)
        self.assertEqual(len(self.written), 1)


if __name__ == "__main__":
    unittest.main()
