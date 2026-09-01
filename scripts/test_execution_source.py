import pathlib
import sys
import gzip
import json
import pathlib
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import execution_source


class ExecutionSourceTests(unittest.TestCase):
    def test_valid_snapshot_keeps_missing_depth_null(self):
        rows = execution_source.validate({
            "capturedAt": "2026-08-28T10:45:00+03:00",
            "source": "licensed test",
            "rows": [{"ticker": "TEST", "bid": 9.9, "ask": 10.0, "volume": 5}],
        })
        self.assertEqual(rows[0]["ticker"], "TEST")
        self.assertIsNone(rows[0]["bidSize"])

    def test_crossed_book_is_rejected(self):
        with self.assertRaises(ValueError):
            execution_source.validate({
                "capturedAt": "2026-08-28T10:45:00+03:00",
                "source": "licensed test",
                "rows": [{"ticker": "TEST", "bid": 10.1, "ask": 10.0}],
            })


if __name__ == "__main__":
    unittest.main()


class Checkpoints(unittest.TestCase):
    """An empty capture is an observation about the exchange, not of a market."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self._repo, self._manifest = execution_source.REPO, execution_source.MANIFEST
        execution_source.REPO = self.root
        execution_source.MANIFEST = self.root / "manifest.jsonl"
        self.addCleanup(setattr, execution_source, "REPO", self._repo)
        self.addCleanup(setattr, execution_source, "MANIFEST", self._manifest)

    def capture(self, name, stamp, rows):
        rel = f"{stamp.replace(':', '')}-{name}.json.gz"
        body = {"payload": {"data": {"data": [{"x": i} for i in range(rows)]}}}
        (self.root / rel).write_bytes(gzip.compress(json.dumps(body).encode()))
        with (execution_source.MANIFEST).open("a", encoding="utf-8") as handle:
            handle.write(json.dumps({"name": name, "fetchedAt": stamp, "path": rel}) + "\n")

    def test_an_empty_capture_is_not_counted_as_an_observation(self):
        """Two of the five on disk were empty and both were counted, so the
        document named an empty capture as its latest checkpoint."""
        self.capture("market-watch", "2026-08-28T15:52:16Z", 222)
        self.capture("market-watch", "2026-08-30T11:48:47Z", 221)
        self.capture("market-watch", "2026-08-31T06:21:40Z", 0)
        rows, empty = execution_source.observations()
        self.assertEqual(len(rows), 2)
        self.assertEqual(empty, 1)
        self.assertEqual(rows[-1]["fetchedAt"], "2026-08-30T11:48:47Z")

    def test_only_market_watch_captures_count(self):
        self.capture("market-watch", "2026-08-28T15:52:16Z", 222)
        self.capture("gold-market-watch", "2026-08-28T15:52:24Z", 9)
        rows, _ = execution_source.observations()
        self.assertEqual(len(rows), 1)

    def test_an_unreadable_capture_is_nought_rather_than_a_crash(self):
        (self.root / "broken.json.gz").write_bytes(b"not gzip")
        with execution_source.MANIFEST.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps({"name": "market-watch", "fetchedAt": "2026-08-28T00:00:00Z",
                                     "path": "broken.json.gz"}) + "\n")
        rows, empty = execution_source.observations()
        self.assertEqual((len(rows), empty), (0, 1))

    def test_no_manifest_is_no_observations(self):
        self.assertEqual(execution_source.observations(), ([], 0))
