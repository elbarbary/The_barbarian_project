import gzip
import json
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import harvest_egx_beta


class SnapshotArchiveTests(unittest.TestCase):
    def test_identical_observations_are_both_retained(self):
        original_out = harvest_egx_beta.OUT
        original_repo = harvest_egx_beta.REPO
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            harvest_egx_beta.REPO = root
            harvest_egx_beta.OUT = root / "data-source" / "egx-beta"
            try:
                first = harvest_egx_beta.archive_snapshot(
                    "market-watch", {"rows": [1]}, fetched_at="2026-08-28T09:00:00+00:00"
                )
                second = harvest_egx_beta.archive_snapshot(
                    "market-watch", {"rows": [1]}, fetched_at="2026-08-28T10:45:00+00:00"
                )
            finally:
                harvest_egx_beta.OUT = original_out
                harvest_egx_beta.REPO = original_repo
            self.assertNotEqual(first, second)
            manifest = (root / "data-source/egx-beta/snapshot-history/manifest.jsonl")
            rows = [json.loads(line) for line in manifest.read_text().splitlines()]
            self.assertEqual(len(rows), 2)
            self.assertEqual(rows[0]["sha256"], rows[1]["sha256"])
            wrapped = json.loads(gzip.decompress(first.read_bytes()))
            self.assertEqual(wrapped["payload"], {"rows": [1]})


if __name__ == "__main__":
    unittest.main()
