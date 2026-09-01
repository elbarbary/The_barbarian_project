import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import harvest_cbe


class CbeTests(unittest.TestCase):
    def test_exchange_rates(self):
        page = """Rates for Date: 26/08/2026
        <table><tr><th>Currency</th><th>Buy</th><th>Sell</th></tr>
        <tr><td>US Dollar</td><td>50.1481</td><td>50.2880</td></tr></table>"""
        result = harvest_cbe.parse_fx(page)
        self.assertEqual(result["ratesForDate"], "26/08/2026")
        self.assertEqual(result["currencies"][0]["sell"], 50.288)

    def test_interbank_keeps_empty_future_date_null(self):
        page = """Daily Interbank Rates* on EGP for 2026
        <table><tr><th>Date</th><th>25/08</th><th>26/08</th></tr>
        <tr><td>Overnight</td><td>19.623%</td><td></td></tr></table>
        <table><tr><th>Date</th><th>25/08</th><th>26/08</th></tr>
        <tr><td>Overnight</td><td>41,906.0</td><td></td></tr></table>"""
        result = harvest_cbe.parse_interbank(page)
        self.assertAlmostEqual(result["rates"][0]["observations"][0]["value"], 0.19623)
        self.assertIsNone(result["volumesEgpMillions"][0]["observations"][1]["value"])


if __name__ == "__main__":
    unittest.main()


class Sentinels(unittest.TestCase):
    """A rate of zero per cent in a nineteen per cent market is not a rate."""

    TABLE = [
        ["Date", "18/08", "19/08", "20/08"],
        ["Overnight", "19.565%", "19.537%", "19.578%"],
        ["One Month", "0.000%", "0.000%", "19.700%"],
    ]

    def test_a_tenor_nothing_traded_at_is_null_not_zero(self):
        rows = harvest_cbe._matrix(self.TABLE, percent=True, zero_means_no_trade=True)
        month = next(r for r in rows if r["tenor"] == "One Month")
        values = [o["value"] for o in month["observations"]]
        self.assertEqual(values[:2], [None, None])
        self.assertAlmostEqual(values[2], 0.197)

    def test_a_real_rate_is_untouched(self):
        rows = harvest_cbe._matrix(self.TABLE, percent=True, zero_means_no_trade=True)
        overnight = next(r for r in rows if r["tenor"] == "Overnight")
        for got, want in zip((o["value"] for o in overnight["observations"]),
                             (0.19565, 0.19537, 0.19578)):
            self.assertAlmostEqual(got, want)

    def test_a_volume_of_zero_is_the_fact_and_is_kept(self):
        """No trades IS a volume of nought; the rate table is the one lying."""
        volumes = [["Date", "18/08"], ["One Month", "0"]]
        rows = harvest_cbe._matrix(volumes, percent=False)
        self.assertEqual(rows[0]["observations"][0]["value"], 0.0)

    def test_the_two_tables_corroborate_each_other(self):
        """A null rate should sit against a zero volume, not against a number."""
        rates = harvest_cbe._matrix(self.TABLE, percent=True, zero_means_no_trade=True)
        month = next(r for r in rates if r["tenor"] == "One Month")
        traded = [o["date"] for o in month["observations"] if o["value"] is not None]
        self.assertEqual(traded, ["20/08"])
