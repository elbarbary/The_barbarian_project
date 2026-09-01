import pathlib
import sys
import pathlib
import ssl
import subprocess
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


class Tls(unittest.TestCase):
    """Reaching a misconfigured host without lowering the bar to get there."""

    def test_the_intermediate_the_host_omits_is_committed(self):
        self.assertTrue(harvest_mcdr.INTERMEDIATE.exists(),
                        "www.mcdr.com.eg sends only its leaf; without this the "
                        "collector dies on every Linux runner")
        body = harvest_mcdr.INTERMEDIATE.read_text(encoding="utf-8")
        self.assertIn("BEGIN CERTIFICATE", body)

    def test_verification_is_still_required(self):
        """The tempting fix is CERT_NONE. It is never the fix."""
        context = harvest_mcdr.tls_context()
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(context.check_hostname)

    def test_nothing_in_the_collector_turns_verification_off(self):
        source = pathlib.Path(harvest_mcdr.__file__).read_text(encoding="utf-8")
        for banned in ("CERT_NONE", "check_hostname = False",
                       "check_hostname=False", "--insecure", "verify=False"):
            self.assertNotIn(banned, source, banned)

    def test_the_committed_intermediate_is_the_issuer_the_leaf_names(self):
        """A wrong PEM here would fail open into the curl fallback and hide."""
        body = harvest_mcdr.INTERMEDIATE.read_text(encoding="utf-8")
        result = subprocess.run(["openssl", "x509", "-noout", "-subject", "-issuer"],
                                input=body, capture_output=True, text=True)
        if result.returncode != 0:
            self.skipTest("no openssl here")
        self.assertIn("Thawte TLS RSA CA G1", result.stdout)
        self.assertIn("DigiCert Global Root G2", result.stdout)
