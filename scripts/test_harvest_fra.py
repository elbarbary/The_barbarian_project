import json
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import harvest_fra


class FraTests(unittest.TestCase):
    def test_normalize_keeps_pdf_and_plain_text(self):
        row = {
            "id": 7,
            "date": "2026-08-01T10:00:00",
            "modified": "2026-08-01T11:00:00",
            "link": "https://fra.gov.eg/item/7",
            "title": {"rendered": "Decision &amp; notice"},
            "excerpt": {"rendered": "<p>Short</p>"},
            "content": {"rendered": '<p>Body</p><a href="https://fra.gov.eg/file.pdf">PDF</a>'},
        }
        item = harvest_fra.normalize(row, "regulations")
        self.assertEqual(item["title"], "Decision & notice")
        self.assertEqual(item["bodyText"], "Body PDF")
        self.assertEqual(item["attachments"], ["https://fra.gov.eg/file.pdf"])


if __name__ == "__main__":
    unittest.main()


class Ledger(unittest.TestCase):
    """A record of what a regulator published must not be able to shrink."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self._out = harvest_fra.OUT
        harvest_fra.OUT = pathlib.Path(self.tmp.name)
        self.addCleanup(setattr, harvest_fra, "OUT", self._out)

    def write(self, items):
        (harvest_fra.OUT / "fra-ledger.json").write_text(
            json.dumps({"items": items}), encoding="utf-8")

    def item(self, ident, type_="fra_news", published="2026-03-01T00:00:00", title="t"):
        return {"id": str(ident), "type": type_, "publishedAt": published,
                "title": title, "attachments": []}

    def test_an_incremental_run_does_not_delete_the_year(self):
        """The bug: `--after <yesterday>` replaced 555 items with the nought
        published since, and source-health then called the regulator missing."""
        self.write([self.item(n) for n in range(1, 556)])
        merged = harvest_fra.merged_with_held({"items": [], "coverage": {}})
        self.assertEqual(merged["coverage"]["items"], 555)
        self.assertEqual(merged["newThisRun"], 0)

    def test_a_new_item_is_added_and_counted(self):
        self.write([self.item(1), self.item(2)])
        merged = harvest_fra.merged_with_held(
            {"items": [self.item(3, published="2026-04-01T00:00:00")], "coverage": {}})
        self.assertEqual(merged["coverage"]["items"], 3)
        self.assertEqual(merged["newThisRun"], 1)

    def test_the_same_item_refetched_updates_rather_than_duplicating(self):
        self.write([self.item(1, title="before")])
        merged = harvest_fra.merged_with_held(
            {"items": [self.item(1, title="after")], "coverage": {}})
        self.assertEqual(merged["coverage"]["items"], 1)
        self.assertEqual(merged["items"][0]["title"], "after")
        self.assertEqual(merged["newThisRun"], 0)

    def test_the_same_id_under_two_post_types_is_two_records(self):
        self.write([self.item(1, type_="fra_news")])
        merged = harvest_fra.merged_with_held(
            {"items": [self.item(1, type_="regulations")], "coverage": {}})
        self.assertEqual(merged["coverage"]["items"], 2)

    def test_it_reports_how_far_back_the_ledger_reaches(self):
        self.write([self.item(1, published="2026-01-04T15:15:40"),
                    self.item(2, published="2026-08-01T00:00:00")])
        merged = harvest_fra.merged_with_held({"items": [], "coverage": {}})
        self.assertEqual(merged["coversFrom"], "2026-01-04T15:15:40")

    def test_by_type_counts_the_merged_set_not_one_run(self):
        self.write([self.item(1, type_="regulations"), self.item(2, type_="fra_news")])
        merged = harvest_fra.merged_with_held(
            {"items": [self.item(3, type_="regulations")], "coverage": {}})
        self.assertEqual(merged["coverage"]["byType"]["regulations"], 2)
        self.assertEqual(merged["coverage"]["byType"]["fra_news"], 1)
        # Every declared type is present, so a reader can tell nought from absent.
        self.assertEqual(set(merged["coverage"]["byType"]), set(harvest_fra.TYPES))

    def test_no_ledger_yet_is_not_an_error(self):
        merged = harvest_fra.merged_with_held({"items": [self.item(1)], "coverage": {}})
        self.assertEqual(merged["coverage"]["items"], 1)
        self.assertEqual(merged["newThisRun"], 1)

    def test_raw_captures_are_pruned_to_a_stated_window(self):
        """300 KB a run is 110 MB of git history a year, for files nothing reads."""
        for n in range(harvest_fra.KEEP_RAW + 6):
            (harvest_fra.OUT / f"fra-raw-2026{n:04d}T000000Z.json.gz").write_bytes(b"x")
        self.assertEqual(harvest_fra.prune_raw(), 6)
        kept = sorted(harvest_fra.OUT.glob("fra-raw-*.json.gz"))
        self.assertEqual(len(kept), harvest_fra.KEEP_RAW)
        # The newest survive, not an arbitrary six.
        self.assertTrue(kept[-1].name.endswith(f"2026{harvest_fra.KEEP_RAW + 5:04d}T000000Z.json.gz"))
