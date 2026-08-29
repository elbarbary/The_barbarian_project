"""The exchange files a period twice; a series must not read both."""
import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_review as B  # noqa: E402


class OneBasis(unittest.TestCase):
    def test_a_series_on_one_basis_is_left_alone(self):
        rows = [{"basis": "consolidated"}, {"basis": "consolidated"}]
        self.assertEqual(B.one_basis(rows), rows)

    def test_unlabelled_rows_survive(self):
        # Most of the archive states no basis. Dropping those would cost far
        # more than the handful of contaminated rows this exists to remove.
        rows = [{"period": "a"}, {"period": "b"}]
        self.assertEqual(B.one_basis(rows), rows)

    def test_the_minority_basis_is_dropped(self):
        rows = [
            {"period": "FY 2018", "basis": "consolidated"},
            {"period": "FY 2019", "basis": "consolidated"},
            {"period": "H1 2019", "basis": "standalone"},
            {"period": "FY 2020"},                       # unlabelled: kept
        ]
        kept = B.one_basis(rows)
        self.assertEqual([r["period"] for r in kept],
                         ["FY 2018", "FY 2019", "FY 2020"])

    def test_the_majority_wins_whichever_way_it_falls(self):
        rows = [{"basis": "standalone"}, {"basis": "standalone"},
                {"basis": "consolidated"}]
        self.assertEqual([r["basis"] for r in B.one_basis(rows)],
                         ["standalone", "standalone"])


class NoPublishedSeriesMixes(unittest.TestCase):
    def test_every_company(self):
        """The whole point, asserted against what is actually published.

        Standalone is the parent alone and consolidated is the group; 2,433
        periods carry different profits on the two, some by thousands of per
        cent. A series that switches between them shows a collapse or a leap
        the business never had, and every direction, ratio and peer comparison
        built on it inherits the error.
        """
        companies = pathlib.Path(__file__).resolve().parent.parent \
            / "public" / "data" / "v1" / "companies"
        if not companies.exists():
            self.skipTest("no published companies to check")
        mixed = []
        for path in sorted(companies.glob("*.json")):
            doc = json.loads(path.read_text(encoding="utf-8"))
            for rows in (B.annual(doc), B.balances(doc)):
                seen = {r.get("basis") for r in rows if r.get("basis")}
                if len(seen) > 1:
                    mixed.append(doc.get("ticker") or path.stem)
        self.assertEqual(sorted(set(mixed)), [], "these series read two bases at once")


class TheStoreIsUsable(unittest.TestCase):
    def test_it_names_a_basis_and_never_a_figure(self):
        store = pathlib.Path(__file__).resolve().parent / "statement_basis.json"
        if not store.exists():
            self.skipTest("no basis store")
        doc = json.loads(store.read_text(encoding="utf-8"))
        filings = doc["filings"]
        self.assertGreater(len(filings), 5000)
        for record in list(filings.values())[:500]:
            self.assertIn(record["basis"], ("standalone", "consolidated"))
            # No figures, deliberately: the filings state their amounts in
            # different units, so a number carried across from here could be
            # off by a thousand.
            for field in ("net_profit", "value", "amount"):
                self.assertNotIn(field, record)


if __name__ == "__main__":
    unittest.main()
