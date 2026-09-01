import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import ownership_ledger


class OwnershipLedgerTests(unittest.TestCase):
    def test_daily_summary_rows_are_parsed_without_inventing_names(self):
        text = """
        Company Name Position Transa Volume
        Ibnsina Pharma insider buy 10000
        Arabia for Investment and Development related parties of
        mainshareholder buy 500000
        Eastern Tobacco insider sold 118061
        """
        aliases = {
            ownership_ledger.canonical_name("Ibnsina Pharma"): "ISPH",
            ownership_ledger.canonical_name("Eastern Tobacco"): "EAST",
        }
        rows = ownership_ledger.parse_daily_summary(
            text, aliases=aliases, filing_id="1", session_date="2026-08-02",
            source_pdf="source.pdf",
        )
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[0]["ticker"], "ISPH")
        self.assertEqual(rows[0]["shares"], 10000)
        self.assertIsNone(rows[0]["investorName"])
        self.assertEqual(rows[1]["relationship"], "related parties of mainshareholder")
        self.assertEqual(rows[2]["action"], "sell")

    def test_treasury_document_keeps_document_level_only(self):
        item = {
            "code": 9,
            "dateStamp": "2026-08-03T09:00:00",
            "heading": "Release from Example (TEST.CA) Concerning the Purchase of Treasury Stocks",
            "content": "purchase on 02/08/2026 <a href='/downloads/Bulletins/9_1.pdf'>PDF</a>",
            "isin": "EGS000000000",
        }
        row = ownership_ledger.document_record(item)
        self.assertEqual(row["kind"], "treasury_purchase")
        self.assertEqual(row["ticker"], "TEST")
        self.assertEqual(row["sessionDate"], "2026-08-02")
        self.assertEqual(len(row["attachments"]), 1)

    def test_government_treasury_bond_is_not_company_treasury_stock(self):
        item = {
            "code": 10,
            "heading": "Increasing the Issue Size of Treasury Bills 03 November 2026",
            "content": "Treasury issue",
        }
        self.assertIsNone(ownership_ledger.document_record(item))

    def test_generic_disclosure_is_not_assumed_post_execution(self):
        item = {
            "code": 11,
            "heading": "Example (TEST.CA) - Release Regarding a Disclosure Form",
        }
        row = ownership_ledger.document_record(item)
        self.assertEqual(row["kind"], "ownership_disclosure_unclassified")


if __name__ == "__main__":
    unittest.main()
