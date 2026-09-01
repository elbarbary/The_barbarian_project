import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import harvest_mcdr


class McdrTests(unittest.TestCase):
    def test_public_issuer_rows_are_parsed(self):
        page = """
        <tr><td>Example &amp; Sons</td><td><button>EGS123456789</button></td></tr>
        <tr><td>Second Issuer</td><td><button>EGS987654321</button></td></tr>
        """
        rows = harvest_mcdr.parse(page)
        self.assertEqual(rows[0]["issuerName"], "Example & Sons")
        self.assertEqual(len(rows), 2)

    def test_unqueried_is_never_reported_as_missing(self):
        original = harvest_mcdr.egx_isins
        harvest_mcdr.egx_isins = lambda: {
            "HERE": "EGS123456789",
            "NOPE": "EGS000000001",
            "LATER": "EGS000000002",
        }
        try:
            document = harvest_mcdr.build(
                b"<tr><td>Example</td><td><button>EGS123456789</button></td></tr>",
                lookup_status={"EGS000000001": {"status": "not_found"}},
            )
        finally:
            harvest_mcdr.egx_isins = original
        result = document["egxReconciliation"]
        self.assertEqual(result["confirmedNotFoundAfterExactSearch"],
                         {"NOPE": "EGS000000001"})
        self.assertEqual(result["notYetIndividuallyQueried"],
                         {"LATER": "EGS000000002"})


if __name__ == "__main__":
    unittest.main()
