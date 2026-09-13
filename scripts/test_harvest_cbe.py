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


def policy_page(cards, *, effective="Effective from 15th of February 2026",
                updated="Last Updated: 23 Mar 2023") -> str:
    """The MPC page, as the CBE builds it — cards, then one line of terms."""
    blocks = "\n".join(
        '<div class="mpc-card">\n'
        f'    <span class="card-heading">{name}</span>\n'
        f'    <span class="percentage">\n        {value}\n    </span>\n'
        '    <div class="btn" role="button"><a href="/en/x">'
        '<span class="btn-text">Read more</span></a>\n    </div>\n'
        '</div>'
        for name, value in cards)
    return (f'<span class="newsupdateddata">{updated}</span>'
            f'<div class="mpc-cards">{blocks}</div>'
            f'<span class="terms">{effective}</span>')


CORRIDOR = [("Overnight Deposit Rate", "19.00%"),
            ("Overnight Lending Rate", "20.00%"),
            ("MAIN OPERATION", "19.50%"),
            ("Discount Rates", "19.50%")]


class PolicyRatesTest(unittest.TestCase):
    """The rates the MPC sets — what somebody means by "the interest rate".

    The interbank page above is what banks actually dealt at. This is the
    corridor that price has to live inside, and the two together are the
    only cross-check either of them gets.
    """

    def test_the_four_cards_are_read_as_fractions(self):
        # Same units as the interbank matrix, deliberately: one document, one
        # convention. 0.19 means 19.00%.
        result = harvest_cbe.parse_policy(policy_page(CORRIDOR))
        self.assertEqual(result["rates"], {"overnightDeposit": 0.19,
                                           "overnightLending": 0.20,
                                           "mainOperation": 0.195,
                                           "discount": 0.195})

    def test_the_date_is_when_the_rates_took_effect(self):
        # NOT the "Last Updated" banner above the cards. On the real page that
        # banner says 23 Mar 2023 over rates effective 15 February 2026 —
        # nobody has touched the CMS field in three years. Reading it would
        # date every rate this project publishes to 2023.
        result = harvest_cbe.parse_policy(policy_page(CORRIDOR))
        self.assertEqual(result["effectiveFrom"], "2026-02-15")

    def test_every_way_the_bank_writes_the_day(self):
        for written, expected in (("1st of March 2026", "2026-03-01"),
                                  ("2nd of April 2025", "2025-04-02"),
                                  ("3rd of May 2024", "2024-05-03"),
                                  ("22 of December 2023", "2023-12-22")):
            page = policy_page(CORRIDOR, effective=f"Effective from {written}")
            self.assertEqual(harvest_cbe.parse_policy(page)["effectiveFrom"],
                             expected, written)

    def test_an_undated_page_is_not_dated_by_the_banner(self):
        page = policy_page(CORRIDOR, effective="")
        self.assertIsNone(harvest_cbe.parse_policy(page)["effectiveFrom"])

    def test_a_card_whose_percentage_will_not_parse_is_dropped(self):
        # Not stored as zero. A policy rate of 0% in a country whose overnight
        # rate is 19.5% is a number a reader would act on — the same reason
        # the interbank matrix drops a tenor nothing traded at.
        page = policy_page([("Overnight Deposit Rate", "—"),
                            ("Overnight Lending Rate", "20.00%")])
        self.assertEqual(harvest_cbe.parse_policy(page)["rates"],
                         {"overnightLending": 0.20})

    def test_a_card_the_bank_renames_is_not_guessed_at(self):
        page = policy_page([("Reserve Requirement Ratio", "18.00%")])
        self.assertEqual(harvest_cbe.parse_policy(page)["rates"], {})

    def test_the_page_the_bank_actually_builds(self):
        # Everything above is markup written by the person writing the parser,
        # which proves the parser agrees with itself. This is the real thing,
        # captured verbatim: five levels of wrapper divs, the percentage on
        # its own line inside its span, and one card that closes differently
        # from the other three.
        page = (pathlib.Path(__file__).resolve().parent
                / "fixtures" / "cbe-mpc-cards.html").read_text(encoding="utf-8")
        result = harvest_cbe.parse_policy(page)
        self.assertEqual(result["effectiveFrom"], "2026-02-15")
        self.assertEqual(result["rates"], {"overnightDeposit": 0.19,
                                           "overnightLending": 0.20,
                                           "mainOperation": 0.195,
                                           "discount": 0.195})


if __name__ == "__main__":
    unittest.main()
