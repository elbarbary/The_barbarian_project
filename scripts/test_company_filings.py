#!/usr/bin/env python3
"""A company's filings page carries what it filed under every code it has had.

Arab Valves filed as ARVA.CA from 2010 until the Listing Committee changed its
name and code to AMII.CA on 22 Jul 2026 (NewsID 291839). The page is built
for directory tickers only, and ARVA is not one, so on 17 Sep 2026 AMII's page
could reach 13 of the 477 filings titled with either code.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import gzip
import json
import pathlib
import tempfile
import unittest
from unittest import mock

import build_company_filings as bcf

ARVA_ISIN = "EGS3E1E1C013"


def egx(news_id, stamp, heading, arabic=""):
    return {"code": news_id, "dateStamp": f"{stamp}T10:00:00", "heading": heading,
            "headingArabic": arabic, "section": "General", "secId": 3,
            "isin": ARVA_ISIN, "content": ""}


class EarlierCodes(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = pathlib.Path(tmp.name)
        archive, session, companies = root / "archive", root / "watch.json", root / "companies.json"
        archive.mkdir()
        items = [
            egx(85000, "2010-02-03", "Arab Valves Company (ARVA.CA) - Board of Directors' Decisions"),
            egx(277098, "2025-10-02", "Arab Valves Company (ARVA.CA) - Listing Committee Decision"),
            # Titled with both: ARVA in English, AMII in Arabic.
            egx(291943, "2026-07-27",
                "Arab Valves Company (ARVA.CA) - Auditor's Report on Corporate Governance Report",
                "العربية للمحابس (AMII.CA) - تقرير مراقب الحسابات على تقرير الحوكمة"),
            egx(291940, "2026-07-27", "Arab Valves Company (AMII.CA) - Minutes of the BoD Meeting"),
            # A company that never changed its code, beside it.
            {**egx(291950, "2026-07-27", "Commercial International Bank (COMI.CA) - AGM"),
             "isin": "EGS60121C018"},
        ]
        (archive / "2026-07.json.gz").write_bytes(
            gzip.compress(json.dumps({"items": items}).encode("utf-8")))
        session.write_text(json.dumps({"isins": {ARVA_ISIN: {"code": "AMII"},
                                                 "EGS60121C018": {"code": "COMI"}}}),
                           encoding="utf-8")
        companies.write_text(json.dumps({"companies": [{"ticker": "AMII"}, {"ticker": "COMI"}]}),
                             encoding="utf-8")
        for name, value in (("FILINGS", archive), ("SESSION", session), ("DIRECTORY", companies)):
            patcher = mock.patch.object(bcf, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_the_page_carries_the_filings_titled_with_the_earlier_code(self):
        pages = bcf.collect()
        self.assertEqual([r["id"] for r in pages["AMII"]],
                         ["egx-291943", "egx-291940", "egx-277098", "egx-85000"])

    def test_there_is_no_page_for_the_earlier_code(self):
        self.assertNotIn("ARVA", bcf.collect())

    def test_a_company_that_kept_its_code_is_untouched(self):
        self.assertEqual([r["id"] for r in bcf.collect()["COMI"]], ["egx-291950"])


if __name__ == "__main__":
    unittest.main()
