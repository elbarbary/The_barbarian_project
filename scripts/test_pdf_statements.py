#!/usr/bin/env python3
"""Guards for the vision-read EGX statement pipeline."""

from __future__ import annotations

import json
import pathlib
import tempfile
import unittest

import apply_pdf_statements as APPLY
import build_pdf_statements as BUILD
import egx_pdf_statements as V


def reading(**values) -> dict:
    return {
        "currency": "EGP",
        "period_end": "2026-06-30",
        "fields": {
            name: {"value_m": value, "page": 5, "printed": str(value)}
            for name, value in values.items()
        },
    }


class VerificationTest(unittest.TestCase):
    def test_two_reads_anchor_and_balance_produce_verified_fields(self):
        first = reading(
            revenue=23_525, net_income=10_012, assets=36_870,
            liabilities=7_410, equity=29_460,
        )
        second = reading(
            revenue=23_525, net_income=10_012, assets=36_870,
            liabilities=7_410, equity=29_462,
        )
        verified = V.verify_readings(
            first, second, known_net_m=10_011.520,
            expected_period_end="2026-06-30",
        )

        self.assertEqual(verified["fields"]["net_income"], 10_011.52)
        self.assertEqual(verified["fields"]["equity"], 29_462)
        self.assertEqual(verified["checks"]["balance_identity"], "passed")

    def test_a_field_seen_by_only_one_read_is_not_published(self):
        first = reading(net_income=100, assets=500, liabilities=200, equity=300)
        second = reading(net_income=100, assets=500)
        verified = V.verify_readings(
            first, second, known_net_m=100,
            expected_period_end="2026-06-30",
        )
        self.assertEqual(verified["fields"], {"assets": 500, "net_income": 100})

    def test_wrong_filing_is_stopped_by_the_structured_profit_anchor(self):
        with self.assertRaisesRegex(ValueError, "does not match"):
            V.verify_readings(
                reading(net_income=800, assets=500),
                reading(net_income=800, assets=500),
                known_net_m=100,
                expected_period_end="2026-06-30",
            )

    def test_a_banks_deposits_are_not_published_as_borrowings(self):
        # The expensive misread: a model asked for borrowings answers with the
        # liabilities total (or a bank's customer deposits, which are the same
        # size). Anything at or above everything the company owes is refused
        # rather than published under a heading that says "debt".
        with self.assertRaisesRegex(ValueError, "borrowings exceed"):
            V.verify_readings(
                reading(net_income=100, liabilities=7_410, debt=7_400_000),
                reading(net_income=100, liabilities=7_410, debt=7_400_000),
                known_net_m=100,
                expected_period_end="2026-06-30",
            )

    def test_maturities_that_do_not_sum_to_the_printed_total_are_refused(self):
        with self.assertRaisesRegex(ValueError, "maturities do not sum"):
            V.verify_readings(
                reading(net_income=100, debt=900,
                        short_term_debt=100, long_term_debt=300),
                reading(net_income=100, debt=900,
                        short_term_debt=100, long_term_debt=300),
                known_net_m=100,
                expected_period_end="2026-06-30",
            )

    def test_two_maturities_without_a_printed_total_are_summed(self):
        # The ordinary presentation: the balance sheet prints the current and
        # non-current halves and never a combined line. Each half was proved by
        # both reads, so their sum is evidence rather than an invention.
        verified = V.verify_readings(
            reading(net_income=100, short_term_debt=120, long_term_debt=380),
            reading(net_income=100, short_term_debt=120, long_term_debt=380),
            known_net_m=100,
            expected_period_end="2026-06-30",
        )
        self.assertEqual(verified["fields"]["debt"], 500)
        self.assertEqual(verified["checks"]["debt_maturities_sum"], "summed")

    def test_a_negative_holding_is_refused(self):
        with self.assertRaisesRegex(ValueError, "read as negative"):
            V.verify_readings(
                reading(net_income=100, cash=-250),
                reading(net_income=100, cash=-250),
                known_net_m=100,
                expected_period_end="2026-06-30",
            )

    def test_a_broken_balance_is_refused(self):
        bad = reading(net_income=100, assets=500, liabilities=200, equity=100)
        with self.assertRaisesRegex(ValueError, "assets do not equal"):
            V.verify_readings(
                bad, bad, known_net_m=100,
                expected_period_end="2026-06-30",
            )

    def test_profit_only_attachment_is_not_called_an_enrichment(self):
        profit = reading(net_income=100)
        with self.assertRaisesRegex(ValueError, "no verified enrichment"):
            V.verify_readings(
                profit, profit, known_net_m=100,
                expected_period_end="2026-06-30",
            )


class MirrorLinkTest(unittest.TestCase):
    def test_statement_and_english_copies_are_ranked_first(self):
        page = '''
        <a href="/disclosures/PHAR.CA/board_agm/2026-08-16_293147_1.pdf">Board report</a>
        <a href="/disclosures/OTHER.CA/financial_statement/wrong.pdf">English financial statements</a>
        <a href="/disclosures/PHAR.CA/financial_statement/2026-08-16_293146_4.pdf">Arabic financial statements</a>
        <a href="/disclosures/PHAR.CA/financial_statement/2026-08-16_293146_2.pdf">English financial statements</a>
        '''
        self.assertEqual(
            BUILD._disclosure_links(page, "PHAR"),
            [
                "https://foudalens.com/disclosures/PHAR.CA/financial_statement/2026-08-16_293146_2.pdf",
                "https://foudalens.com/disclosures/PHAR.CA/financial_statement/2026-08-16_293146_4.pdf",
                "https://foudalens.com/disclosures/PHAR.CA/board_agm/2026-08-16_293147_1.pdf",
            ],
        )

    def test_preharvested_official_attachments_are_reused(self):
        document = {"items": [
            {"id": "egx-1", "attachments": ["https://example.test/other.pdf"]},
            {"id": "egx-293147", "attachments": [
                "https://www.egx.com.eg/downloads/Bulletins/342735_1.pdf",
                "https://www.egx.com.eg/not-a-pdf",
            ]},
        ]}
        self.assertEqual(
            BUILD._filed_document_attachments(document, "293147"),
            ["https://www.egx.com.eg/downloads/Bulletins/342735_1.pdf"],
        )

    def test_same_day_sibling_attachment_is_used_for_results_flash(self):
        document = {"items": [
            {
                "id": "egx-293904", "date": "2026-08-26",
                "attachments": [],
            },
            {
                "id": "egx-293902", "date": "2026-08-26",
                "attachments": [
                    "https://www.egx.com.eg/downloads/Bulletins/343498_1.pdf",
                ],
            },
            {
                # Same ticker and date, but too far away to be treated as the
                # results flash's companion filing.
                "id": "egx-293890", "date": "2026-08-26",
                "attachments": ["https://example.test/unrelated.pdf"],
            },
        ]}
        self.assertEqual(
            BUILD._sibling_document_attachments(document, "293904", "2026-08-26"),
            ["https://www.egx.com.eg/downloads/Bulletins/343498_1.pdf"],
        )


class PageImageTest(unittest.TestCase):
    def test_browser_pages_keep_their_pdf_page_numbers(self):
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            page_two = root / "two.png"
            page_five = root / "five.png"
            page_two.write_bytes(b"page two")
            page_five.write_bytes(b"page five")

            pages = BUILD.parse_page_images([
                f"5={page_five}",
                f"2={page_two}",
            ])

            self.assertEqual([number for number, _ in pages], [2, 5])
            parts = BUILD._page_image_parts(pages)
            self.assertEqual(parts[0]["text"], "The next image is PDF page 2.")
            self.assertEqual(parts[2]["text"], "The next image is PDF page 5.")

    def test_a_named_evidence_page_must_have_been_captured(self):
        with tempfile.TemporaryDirectory() as temp:
            image = pathlib.Path(temp) / "page-2.png"
            image.write_bytes(b"page two")
            with self.assertRaisesRegex(RuntimeError, "missing browser-rendered"):
                BUILD.audit_images([(2, image)], reading(net_income=100), "2026-06-30")


class RefusedPdfReviewTest(unittest.TestCase):
    def test_retrieved_pdf_is_kept_with_review_metadata(self):
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            source = root / "source.pdf"
            source.write_bytes(b"%PDF" + b"x" * 10_000)
            original = BUILD.PDF_REVIEW
            BUILD.PDF_REVIEW = root / "review"
            try:
                review = BUILD.archive_refused_pdf(
                    {"ticker": "TEST", "code": "123"},
                    "https://example.test/statement.pdf",
                    source,
                    1,
                    ValueError("net income mismatch"),
                )
            finally:
                BUILD.PDF_REVIEW = original

            self.assertIsNotNone(review)
            kept = pathlib.Path(review["local_path"])
            self.assertTrue(kept.exists())
            self.assertEqual(review["reason"], "net income mismatch")
            self.assertEqual(review["bytes"], 10_004)


class ApplyTest(unittest.TestCase):
    def test_apply_fills_gaps_without_overwriting_existing_values(self):
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            companies = root / "companies"
            fixtures = root / "fixtures"
            companies.mkdir(), fixtures.mkdir()
            doc = {
                "ticker": "ABUK",
                "financials": {"annual": [], "quarterly": [{
                    "period": "H1 2026",
                    "net_income": 10_011.52,
                    # A structured value already on the row must win.
                    "assets": 36_871.0,
                }]},
            }
            for folder in (companies, fixtures):
                (folder / "ABUK.json").write_text(json.dumps(doc))
            store = root / "pdf_store.json"
            store.write_text(json.dumps({"filings": {"293025": {
                "ticker": "ABUK", "period": "H1 2026", "months": 6,
                "source": "https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID=293025",
                "filed_on": "2026-08-13",
                "fields": {
                    "net_income": 10_011.52, "assets": 36_870,
                    "liabilities": 7_410, "equity": 29_462,
                },
            }}}))

            original = APPLY.STORE, APPLY.COMPANIES, APPLY.FIXTURES
            APPLY.STORE, APPLY.COMPANIES, APPLY.FIXTURES = store, companies, fixtures
            try:
                self.assertEqual(APPLY.apply(False), 0)
            finally:
                APPLY.STORE, APPLY.COMPANIES, APPLY.FIXTURES = original

            row = json.loads((companies / "ABUK.json").read_text())["financials"]["quarterly"][0]
            self.assertEqual(row["assets"], 36_871.0)
            self.assertEqual(row["liabilities"], 7_410)
            self.assertEqual(row["equity"], 29_462)
            self.assertEqual(
                (companies / "ABUK.json").read_text(),
                (fixtures / "ABUK.json").read_text(),
            )


if __name__ == "__main__":
    unittest.main()
