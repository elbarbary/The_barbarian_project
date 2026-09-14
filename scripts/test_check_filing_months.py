"""A short month must never become the archive.

The harvester writes whatever it managed to read, which is right for a
harvester and wrong for a commit. These tests pin down the three things that
decide whether a month file is allowed to stand: the exchange's own count,
what happens when there is a committed copy to fall back to, and what happens
when there is not.
"""

import gzip
import json
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import check_filing_months as check


def month(path: pathlib.Path, *, held: int, expected) -> None:
    body = {"month": "2026-09", "expected": expected,
            "items": [{"code": f"c{i}"} for i in range(held)]}
    path.write_bytes(gzip.compress(json.dumps(body).encode(), mtime=0))


class ShortfallTest(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = pathlib.Path(self.tmp.name)
        self.addCleanup(self.tmp.cleanup)

    def test_a_month_holding_what_the_exchange_reported_is_whole(self):
        path = self.dir / "2026-09.json.gz"
        month(path, held=430, expected=430)
        self.assertIsNone(check.shortfall(path))

    def test_a_month_holding_more_than_reported_is_not_short(self):
        # The count moves while a month is open; holding more than the
        # snapshot said is a filing published mid-harvest, not a fault.
        path = self.dir / "2026-09.json.gz"
        month(path, held=431, expected=430)
        self.assertIsNone(check.shortfall(path))

    def test_a_month_holding_fewer_is_short_and_says_by_how_much(self):
        path = self.dir / "2026-09.json.gz"
        month(path, held=400, expected=1467)
        self.assertEqual(check.shortfall(path), (400, 1467))

    def test_a_month_with_no_recorded_count_is_not_judged(self):
        # Written before the harvester stored the exchange's own total.
        # Calling it short on no evidence would restore a good archive daily.
        path = self.dir / "2026-01.json.gz"
        month(path, held=10, expected=None)
        self.assertIsNone(check.shortfall(path))

    def test_an_unreadable_file_is_not_judged_short(self):
        path = self.dir / "2026-09.json.gz"
        path.write_bytes(b"not gzip at all")
        self.assertIsNone(check.shortfall(path))


class RestoreTest(unittest.TestCase):
    """What happens to a short month when there is nothing to restore."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = pathlib.Path(self.tmp.name)
        self.addCleanup(self.tmp.cleanup)

    def test_a_short_month_with_no_committed_copy_is_removed(self):
        # `git checkout` fails outside the repository, which is the same
        # answer as a month that has never been harvested completely: there
        # is nothing to go back to. Removed rather than left, so a partial
        # first read cannot become the archive by being the only one.
        path = self.dir / "2026-09.json.gz"
        month(path, held=400, expected=1467)
        check.main(["--restore", "--filings", str(self.dir)])
        self.assertFalse(path.exists())

    def test_a_whole_month_is_left_alone(self):
        path = self.dir / "2026-09.json.gz"
        month(path, held=430, expected=430)
        before = path.read_bytes()
        check.main(["--restore", "--filings", str(self.dir)])
        self.assertEqual(path.read_bytes(), before)

    def test_without_restore_nothing_is_touched(self):
        # The check has to be usable as a report on a laptop without it
        # reaching for the working tree.
        path = self.dir / "2026-09.json.gz"
        month(path, held=400, expected=1467)
        check.main(["--filings", str(self.dir)])
        self.assertTrue(path.exists())

    def test_a_missing_archive_is_not_an_error(self):
        self.assertEqual(check.main(["--filings", str(self.dir / "nope")]), 0)


if __name__ == "__main__":
    unittest.main()
