"""The debt block: what it computes, and what it refuses to say."""
from __future__ import annotations

import unittest

import build_debt as D
import build_debt_reads as R


class BorrowingsTest(unittest.TestCase):
    def test_liabilities_are_never_treated_as_debt(self):
        # The whole point of the field. A company with payables and provisions
        # but nothing borrowed has no debt block at all.
        self.assertIsNone(D.borrowings_of({"liabilities": 13_648, "equity": 8_742}))

    def test_the_maturities_make_the_total_when_none_is_printed(self):
        self.assertEqual(
            D.borrowings_of({"short_term_debt": 6_253.9, "long_term_debt": 2_236.3}),
            8_490.2,
        )

    def test_a_printed_total_wins_over_the_halves(self):
        self.assertEqual(
            D.borrowings_of(
                {"debt": 8_490.1, "short_term_debt": 6_253.9, "long_term_debt": 2_236.3}
            ),
            8_490.1,
        )

    def test_a_fiscal_period_is_compared_against_its_own_window(self):
        self.assertEqual(D.prior_label("9M 2026 (to 31 Mar)"), "9M 2025 (to 31 Mar)")
        self.assertEqual(D.prior_label("H1 2026"), "H1 2025")


class PatternTest(unittest.TestCase):
    def test_borrowing_that_covered_an_operating_shortfall_is_named_as_that(self):
        row = {"financing_cash_flow": 572, "operating_cash_flow": -372,
               "investing_cash_flow": -306}
        self.assertEqual(
            D.pattern_of(row, "operating"),
            "raised_while_operations_consumed_cash",
        )

    def test_a_lender_is_not_told_it_had_an_operating_shortfall(self):
        # A bank's lending runs through the operating line, so the sign there
        # says nothing about whether it needed funding. Only the direction of
        # the funding itself is reported.
        row = {"financing_cash_flow": 572, "operating_cash_flow": -372,
               "investing_cash_flow": -306}
        self.assertEqual(D.pattern_of(row, "finance"), "funding_raised")


class ReadGuardTest(unittest.TestCase):
    def vet(self, text: str):
        return R.vet({"read": text, "read_ar": ""})

    def test_a_read_that_grades_the_position_is_refused(self):
        for verdict in (
            "The company's borrowings are at a healthy level for its size.",
            "This leaves the balance sheet looking risky over the next year.",
            "Its funding position is comfortable given what it earns.",
        ):
            with self.subTest(verdict):
                vetted, why = self.vet(verdict)
                self.assertIsNone(vetted)
                self.assertIn("graded", why)

    def test_a_read_that_quotes_a_figure_is_refused(self):
        vetted, why = self.vet(
            "It repaid 1.2 billion pounds of borrowings over the period, "
            "and most of the rest falls due later."
        )
        self.assertIsNone(vetted)
        self.assertEqual(why, "quoted a figure")

    def test_a_plain_description_passes(self):
        vetted, why = self.vet(
            "During the period the company repaid more funding than it brought "
            "in, and most of what it owes falls due after more than a year."
        )
        self.assertIsNotNone(vetted, why)

    def test_arabic_words_that_only_look_like_verdicts_pass(self):
        # مبالغ is the plural of "amount", مخاطر contains خطر, and الصحية
        # contains صحي — a substring test refused all three.
        for innocent in ("مبالغ مستحقة على الشركة",
                         "مخاطر التمويل مذكورة في الإيضاحات",
                         "شركة الرعاية الصحية"):
            with self.subTest(innocent):
                self.assertIsNone(R.VERDICT_AR.search(innocent))

    def test_an_arabic_verdict_is_still_caught(self):
        for verdict in ("الوضع خطير", "السهم جذاب", "غير مستدام"):
            with self.subTest(verdict):
                self.assertIsNotNone(R.VERDICT_AR.search(verdict))


if __name__ == "__main__":
    unittest.main()
