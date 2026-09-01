import pathlib
import sys
import json
import pathlib
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import build_official_completeness as completeness


class OfficialCompletenessTests(unittest.TestCase):
    def test_candidate_website_is_normalized_without_calling_it_verified(self):
        self.assertEqual(
            completeness.normalize_url("www.example.com/investors?tracking=1"),
            "https://www.example.com/investors",
        )
        self.assertIsNone(completeness.normalize_url(""))

    def test_ticker_is_read_from_official_heading(self):
        self.assertEqual(
            completeness.ticker_from({"heading": "Example (TEST.CA) - Filing"}),
            "TEST",
        )


if __name__ == "__main__":
    unittest.main()


class Reconciliation(unittest.TestCase):
    """Published totals that add up to the published total."""

    LEDGER = pathlib.Path(__file__).resolve().parent.parent / \
        "data-source" / "official" / "filing-completeness.json"

    def setUp(self):
        if not self.LEDGER.exists():
            self.skipTest("no completeness ledger on this machine")
        self.doc = json.loads(self.LEDGER.read_text(encoding="utf-8"))

    def test_every_filing_lands_in_exactly_one_bucket(self):
        """`items` said 191,892; the per-issuer rows summed to 126,661; the
        missing third was explained nowhere."""
        egx = self.doc["egx"]
        self.assertEqual(
            egx["withoutTickerInHeading"] + egx["tickerNotInThisDirectory"]
            + egx["attributedToAnIssuer"],
            egx["items"],
            "the three buckets must account for every filing in the archive")

    def test_the_attributed_count_is_the_one_the_issuer_rows_sum_to(self):
        """Or the reconciliation is arithmetic that describes nothing."""
        total = sum(row.get("egxFilingCount") or 0 for row in self.doc["issuers"])
        self.assertEqual(total, self.doc["egx"]["attributedToAnIssuer"])

    def test_a_regulator_that_refused_is_not_a_regulator_with_nothing_to_say(self):
        """Both render as fraItems 0, and only one of them is a problem."""
        self.assertIn("failures", self.doc["fra"])
