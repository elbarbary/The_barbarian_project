#!/usr/bin/env python3
"""Who wins a collision between the two publishing jobs.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'

The case these exist for happened on 6 Sep 2026. publish-app-data runs for
about an hour and commits last, and both jobs resolved conflicts by taking
"the commit being replayed" — so the hour-old snapshot won. News went
backward twelve minutes, the newest story was un-published, and three of that
morning's filings were deleted from the disclosures feed while the exchange
was still listing them.
"""

from __future__ import annotations

import gzip
import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import resolve_generated as resolver  # noqa: E402


def doc(**fields) -> bytes:
    return json.dumps(fields, ensure_ascii=False).encode()


class StampTest(unittest.TestCase):
    """A document that says when it was made is compared on that."""

    def test_the_newer_news_document_wins_whichever_side_it_is_on(self):
        fresh = doc(generated_at="2026-09-06T07:01:44+00:00", items=[])
        stale = doc(generated_at="2026-09-06T06:48:47+00:00", items=[])
        # The real orientation: the slow build replays last, so its stale copy
        # arrives as "theirs" and used to win unconditionally.
        choice, _, why = resolver.decide(fresh, stale)
        self.assertEqual(choice, "ours", why)
        # And symmetrically, so the rule is about the documents, not the jobs.
        choice, _, why = resolver.decide(stale, fresh)
        self.assertEqual(choice, "theirs", why)

    def test_each_document_is_compared_on_the_stamp_it_actually_uses(self):
        for key in ("generated_at", "fetched_at", "updated_at", "captured_at", "as_of"):
            with self.subTest(stamp=key):
                new = doc(**{key: "2026-09-06T07:01:44+00:00"})
                old = doc(**{key: "2026-09-06T06:48:47+00:00"})
                self.assertEqual(resolver.decide(new, old)[0], "ours")

    def test_a_naive_stamp_is_read_as_utc_rather_than_declined(self):
        # Every writer here means UTC; refusing to compare would hand the
        # decision back to "whoever pushed last", which is the bug.
        new = doc(generated_at="2026-09-06T07:01:44")
        old = doc(generated_at="2026-09-06T06:48:47+00:00")
        self.assertEqual(resolver.decide(new, old)[0], "ours")

    def test_an_equal_or_unreadable_stamp_yields_no_opinion(self):
        same = doc(generated_at="2026-09-06T07:01:44+00:00")
        self.assertIsNone(resolver.decide(same, same)[0])
        junk = doc(generated_at="the day before yesterday")
        self.assertIsNone(resolver.decide(junk, junk)[0])


class RecordTest(unittest.TestCase):
    """A feed of filings only grows, so neither side's absence is evidence."""

    def filings(self, ids):
        return doc(items=[{"id": i, "title": f"filing {i}"} for i in ids])

    def test_the_three_filings_that_were_deleted_survive(self):
        live = self.filings([294338, 294340, 294341, 294342, 294344])
        build = self.filings([294338, 294340])
        choice, payload, why = resolver.decide(live, build)
        self.assertEqual(choice, "merged", why)
        kept = {r["id"] for r in json.loads(payload)["items"]}
        self.assertEqual(kept, {294338, 294340, 294341, 294342, 294344})

    def test_a_filing_only_the_slow_build_saw_is_kept_too(self):
        # The slow build harvests before it starts; the fast lane reads what
        # is committed. Each can hold one the other does not, and picking a
        # side by any rule loses that one.
        live = self.filings([1, 2, 3])
        build = self.filings([1, 2, 9])
        choice, payload, why = resolver.decide(live, build)
        self.assertEqual(choice, "merged", why)
        self.assertEqual({r["id"] for r in json.loads(payload)["items"]}, {1, 2, 3, 9})

    def test_the_union_keeps_the_rest_of_the_document(self):
        live = json.dumps({"count": 5, "items": [{"id": 1}], "note": "live"}).encode()
        build = json.dumps({"count": 2, "items": [{"id": 2}], "note": "build"}).encode()
        _, payload, _ = resolver.decide(live, build)
        merged = json.loads(payload)
        self.assertEqual({r["id"] for r in merged["items"]}, {1, 2})
        self.assertEqual(merged["note"], "live", "the larger side keeps the frame")

    def test_identical_record_sets_are_left_alone(self):
        same = self.filings([1, 2, 3])
        self.assertIsNone(resolver.decide(same, same)[0])

    def test_a_stamp_decides_before_a_union_is_considered(self):
        # News carries both a stamp and an items list, and its items are a
        # window over a feed, not a cumulative ledger — unioning them would
        # resurrect stories that have aged out.
        new = doc(generated_at="2026-09-06T07:01:44+00:00", items=[{"id": 1}])
        old = doc(generated_at="2026-09-06T06:48:47+00:00", items=[{"id": 2}])
        choice, payload, _ = resolver.decide(new, old)
        self.assertEqual(choice, "ours")
        self.assertIsNone(payload, "it must not merge a windowed feed")


class SafetyTest(unittest.TestCase):
    """It would rather have no opinion than stop the pipeline publishing."""

    def test_anything_unparseable_is_handed_back_to_the_caller(self):
        for ours, theirs in (
            (b"not json", doc(generated_at="2026-09-06T07:00:00+00:00")),
            (doc(generated_at="2026-09-06T07:00:00+00:00"), b"<<<<<<< HEAD"),
            (b"", b""),
            (b"[1,2,3]", b"[1,2]"),                       # a bare list, no frame
        ):
            with self.subTest(ours=ours[:12]):
                self.assertIsNone(resolver.decide(ours, theirs)[0])

    def test_a_gzipped_document_is_read(self):
        new = gzip.compress(doc(generated_at="2026-09-06T07:01:44+00:00"))
        old = gzip.compress(doc(generated_at="2026-09-06T06:48:47+00:00"))
        self.assertEqual(resolver.decide(new, old)[0], "ours")

    def test_records_without_a_stable_identity_are_not_unioned(self):
        # Without an id there is no way to tell one record from another, and
        # concatenating them would duplicate every row on every conflict.
        a = doc(items=[{"headline": "one"}, {"headline": "two"}])
        b = doc(items=[{"headline": "one"}])
        self.assertIsNone(resolver.decide(a, b)[0])

    def test_a_merge_written_to_a_gz_path_stays_gzipped(self):
        # The filing archive is stored gzipped, and it is exactly the document
        # this unions. Plain JSON over a .gz path is an archive nothing reads.
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            ours, theirs = root / "a.json.gz", root / "b.json.gz"
            out = root / "2026-09.json.gz"
            ours.write_bytes(gzip.compress(doc(items=[{"id": 1}])))
            theirs.write_bytes(gzip.compress(doc(items=[{"id": 2}])))
            resolver.main(["x", str(ours), str(theirs), str(out)])
            merged = json.loads(gzip.decompress(out.read_bytes()))
            self.assertEqual({r["id"] for r in merged["items"]}, {1, 2})

    def test_the_command_line_never_fails_a_build(self):
        # Called on files that do not exist, it says "none" and exits 0.
        self.assertEqual(resolver.main(["x", "/nope/a", "/nope/b", "/nope/out"]), 0)


class RealDocumentTest(unittest.TestCase):
    """Against the documents actually published, not only fixtures."""

    ROOT = pathlib.Path(__file__).resolve().parent.parent / "public" / "data" / "v1"

    def test_the_published_news_and_disclosures_are_recognised(self):
        news = self.ROOT / "news" / "latest.json"
        if news.exists():
            self.assertIsNotNone(resolver._moment(json.loads(news.read_bytes())),
                                 "news no longer carries a stamp this can compare")
        for archive in sorted((self.ROOT / "disclosures" / "archive").glob("2*.json"))[:1]:
            found = resolver._records(json.loads(archive.read_bytes()))
            self.assertIsNotNone(found, f"{archive.name} records are no longer identifiable")
            self.assertEqual(found[0], "items")


if __name__ == "__main__":
    unittest.main()
