import datetime as dt
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import build_source_health


class SourceHealthTests(unittest.TestCase):
    def test_public_gaps_never_become_available(self):
        document = build_source_health.build(
            now=dt.datetime(2026, 8, 28, 18, tzinfo=dt.timezone.utc)
        )
        capabilities = document["capabilities"]
        self.assertFalse(capabilities["namedInvestorFromDailySummary"])
        self.assertFalse(capabilities["completePublicShareholderRegister"])
        self.assertFalse(capabilities["orderBookDepth"])


if __name__ == "__main__":
    unittest.main()
