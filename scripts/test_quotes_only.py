#!/usr/bin/env python3
"""The fast price path, and the two refusals that make it safe to run often.

`build_market_api.py` rewrites `companies/` from scratch — rmtree, then write —
and about fourteen later steps in `build_all.py` exist to put the filed
financials back into those documents afterwards. So the job that runs through
the trading session cannot be the same job: running the full build four times a
session either costs forty minutes a time or publishes stripped documents. It
runs `--quotes-only` instead, which owns `market.json` and nothing else.

Two things had to be true before that was safe to run on a short cadence:

  * a short scan must refuse rather than publish. Rebuilding `stocks` from a
    scan that came back with two thirds of the exchange does not shrink the
    market, it blanks the rest — 282 companies became 249 that way once, and
    every file still looked well-formed. At four runs a session that stops
    being a bad day and starts being a price blackout.

  * a stale scan must not overwrite a fresher one. Two workflows now write this
    file and they can be in flight together, so the one that commits second
    wins. Without a check, a slow build that started before the open lands
    after a fast run and puts a pre-open snapshot back on every screen.
"""

from __future__ import annotations

import json
import pathlib
import sys
import unittest
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_market_api as bma  # noqa: E402


def scan(records=2, listed=None, returned=None, as_of="2026-09-03T11:00:00.000Z"):
    """A scan the builder will accept, sized to order."""
    body = {
        "asOf": as_of,
        "records": [
            {
                "ticker": "ABCDEF"[: 3 + (i % 3)] + chr(ord("G") + i),
                "company": f"Company {i}",
                "close": 10.0 + i,
                "change": 0.5,
                "sector": "Banks",
            }
            for i in range(records)
        ],
    }
    body["scannerTotal"] = records if listed is None else listed
    if returned is not None:
        body["scannerReturned"] = returned
    return body


class Harness(unittest.TestCase):
    """Point every published root at a temp tree, so nothing real is touched."""

    def setUp(self):
        import tempfile

        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = pathlib.Path(self.tmp.name)
        self.api = root / "api"
        self.fixtures = root / "fixtures"
        self.prices = root / "prices"
        self.work = root / "work"
        for d in (self.api, self.fixtures, self.work):
            d.mkdir(parents=True)
        patches = [
            # REPO too, or `history_union` reads the real price store and
            # the tests stop being about the scan in front of them.
            mock.patch.object(bma, "REPO", root),
            mock.patch.object(bma, "API", self.api),
            mock.patch.object(bma, "FIXTURES", self.fixtures),
            mock.patch.object(bma, "PRICES", self.prices),
            mock.patch.object(bma, "WORK", self.work),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    def run_build(self, body, quotes_only=False):
        path = pathlib.Path(self.tmp.name) / "scan.json"
        path.write_text(json.dumps(body), encoding="utf-8")
        return bma.build(path, True, quotes_only=quotes_only)

    def published(self):
        return sorted(
            str(p.relative_to(pathlib.Path(self.tmp.name)))
            for p in pathlib.Path(self.tmp.name).rglob("*.json")
            if p.name != "scan.json"
        )


class AShortScanIsRefused(Harness):
    def test_it_refuses_and_writes_nothing_on_the_full_path(self):
        # Where 282 -> 249 actually happened, and where it would happen again.
        self.assertEqual(self.run_build(scan(records=249, listed=296)), 1)
        self.assertEqual(self.published(), [])

    def test_it_refuses_and_writes_nothing_on_the_quotes_path(self):
        self.assertEqual(
            self.run_build(scan(records=249, listed=296), quotes_only=True), 1
        )
        self.assertEqual(self.published(), [])

    def test_a_complete_scan_is_let_through(self):
        self.assertEqual(self.run_build(scan(records=4, listed=4)), 0)
        self.assertTrue(self.published())

    def test_the_scanners_own_count_is_believed_over_the_record_count(self):
        # `scannerReturned` is what egx_scan.mjs merged. When it is short the
        # file is short, however many records happen to be in it.
        self.assertEqual(
            self.run_build(scan(records=4, listed=296, returned=249)), 1
        )
        self.assertEqual(self.published(), [])

    def test_an_older_scan_without_the_field_falls_back_to_its_records(self):
        # Every scan archived before egx_scan.mjs recorded `scannerReturned`
        # carries only `scannerTotal`, and in all 37 of them it equals the
        # record count — so the fallback is exact, not a loosened threshold.
        body = scan(records=4, listed=4)
        self.assertNotIn("scannerReturned", body)
        self.assertEqual(self.run_build(body), 0)


class QuotesOnlyOwnsOneDocument(Harness):
    def test_it_writes_market_json_in_both_roots_and_nothing_else(self):
        self.assertEqual(self.run_build(scan(records=3), quotes_only=True), 0)
        self.assertEqual(
            self.published(),
            ["api/market.json", "fixtures/market.json"],
        )

    def test_it_leaves_the_company_documents_exactly_as_published(self):
        # The full build first, so there is enrichment to preserve.
        self.assertEqual(self.run_build(scan(records=3)), 0)
        enriched = next((self.api / "companies").glob("*.json"))
        doc = json.loads(enriched.read_text(encoding="utf-8"))
        doc["filed_net_profit"] = "put back by a later step in build_all"
        enriched.write_text(json.dumps(doc), encoding="utf-8")
        directory_before = (self.api / "companies.json").read_bytes()

        # Then a fast run over the top of it.
        self.assertEqual(
            self.run_build(scan(records=3, as_of="2026-09-03T12:00:00.000Z"),
                           quotes_only=True),
            0,
        )
        after = json.loads(enriched.read_text(encoding="utf-8"))
        self.assertEqual(after["filed_net_profit"], "put back by a later step in build_all")
        self.assertEqual((self.api / "companies.json").read_bytes(), directory_before)

    def test_it_does_not_write_the_price_store(self):
        # `data-source/prices` is a cumulative store the full build owns. The
        # fast path reads the union but never writes it, so the two can never
        # race over it.
        self.assertEqual(self.run_build(scan(records=3), quotes_only=True), 0)
        self.assertFalse(self.prices.exists())


class TheCaptureNeverGoesBackwards(Harness):
    def _publish(self, at):
        return self.run_build(scan(records=3, as_of=at), quotes_only=True)

    def test_an_older_capture_is_refused(self):
        self.assertEqual(self._publish("2026-09-03T12:00:00.000Z"), 0)
        before = (self.api / "market.json").read_bytes()
        self.assertEqual(self._publish("2026-09-03T09:00:00.000Z"), 1)
        self.assertEqual((self.api / "market.json").read_bytes(), before)

    def test_the_same_capture_is_allowed_through(self):
        # Re-running one scan is a no-op diff, not a rewind.
        self.assertEqual(self._publish("2026-09-03T12:00:00.000Z"), 0)
        self.assertEqual(self._publish("2026-09-03T12:00:00.000Z"), 0)

    def test_a_newer_capture_publishes(self):
        self.assertEqual(self._publish("2026-09-03T09:00:00.000Z"), 0)
        self.assertEqual(self._publish("2026-09-03T12:00:00.000Z"), 0)
        snapshot = json.loads((self.api / "market.json").read_text(encoding="utf-8"))
        self.assertEqual(snapshot["captured_at"], "2026-09-03T12:00:00.000Z")

    def test_the_full_build_cannot_rewind_a_fast_publish_either(self):
        # The guard is on the shared write, not on the flag, so the slow build
        # is held to it too — which is the direction the race actually runs.
        self.assertEqual(self._publish("2026-09-03T12:00:00.000Z"), 0)
        self.assertEqual(
            self.run_build(scan(records=3, as_of="2026-09-03T08:00:00.000Z")), 1
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
