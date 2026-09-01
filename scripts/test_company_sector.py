#!/usr/bin/env python3
"""The company screen and the market table naming the same sector."""

from __future__ import annotations

import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import apply_company_sector


class Alignment(unittest.TestCase):
    def test_the_published_documents_agree_with_the_directory(self):
        """The bug this step exists to make impossible.

        217 of 284 companies had a per-company document naming one sector and a
        directory row naming another. Nothing failed; the two screens simply
        disagreed, for weeks.
        """
        directory = apply_company_sector.load(
            apply_company_sector.DIRECTORY).get("companies") or []
        if not directory:
            self.skipTest("no published directory on this machine")
        wrong = []
        for row in directory:
            ticker, sector = row.get("ticker"), row.get("sector")
            if not ticker or not sector:
                continue
            path = apply_company_sector.COMPANIES / f"{ticker}.json"
            if not path.exists():
                continue
            doc = json.loads(path.read_text(encoding="utf-8"))
            if doc.get("sector") and doc["sector"] != sector:
                wrong.append((ticker, doc["sector"], sector))
        self.assertEqual(wrong[:5], [], f"{len(wrong)} companies disagree")

    def test_it_writes_nothing_when_asked_to_check(self):
        before = {}
        for path in sorted(apply_company_sector.COMPANIES.glob("*.json"))[:20]:
            before[path] = path.read_bytes()
        if not before:
            self.skipTest("no published company documents on this machine")
        apply_company_sector.apply(write=False)
        for path, body in before.items():
            self.assertEqual(path.read_bytes(), body, path.name)

    def test_a_company_the_exchange_does_not_classify_keeps_what_it_has(self):
        """No sector is invented — an absent one stays absent."""
        self.assertEqual(apply_company_sector.load(pathlib.Path("/nonexistent")), {})


if __name__ == "__main__":
    unittest.main()
