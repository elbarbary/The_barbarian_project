#!/usr/bin/env python3
"""A link here puts one listed company's name on another's ownership.

Nearly every test below is an identity the builder must REFUSE. Egyptian
corporate names share their category words — `القابضة للاستثمارات المالية` is
carried by six listed companies — so a rule that is merely generous joins Raya
Holding to Prime Holding and publishes a stake one of them does not own.
"""

import json
import unittest

import build_sector_ownership as bso
import insider_identity as ii


def company(ticker, ar, sector, cap=1e9, en=None, source="EGX"):
    return {"ticker": ticker, "name_ar": ar, "name_en": en, "sector": sector,
            "sector_ar": sector, "market_cap": cap, "sector_source": source}


def position(holder, ticker, percent, kind="firm"):
    return {"holder": holder, "kind": kind, "ticker": ticker,
            "percent": percent, "asOf": "2026-06-30", "basis": "register",
            "filingId": "1", "source": "https://example.test/1"}


def run(companies, positions):
    return bso.build({"companies": companies},
                     {"positions": positions, "source": "s", "generated": "g"})


class Identity(unittest.TestCase):
    """`names_one_company` — the claim that two names are one company."""

    def test_the_category_words_do_not_make_two_holdings_one_company(self):
        # Four tokens, three shared, and the one that differs is the only one
        # that says which company it is.
        for other in ("راية القابضة للاستثمارات المالية",
                      "برايم القابضة للاستثمارات المالية",
                      "سي اي كابيتال القابضة للاستثمارات المالية"):
            self.assertFalse(
                ii.names_one_company("توسع القابضة للاستثمارات المالية", other),
                other)

    def test_a_bank_named_misr_is_not_another_bank_with_misr_in_it(self):
        self.assertFalse(ii.names_one_company("بنك مصر", "بنك البركة مصر"))

    def test_a_parent_is_not_its_egyptian_subsidiary(self):
        self.assertFalse(ii.names_one_company("بنك فيصل الإسلامي",
                                              "بنك فيصل الإسلامي المصري"))

    def test_an_employees_shareholding_union_is_not_the_company(self):
        self.assertFalse(ii.names_one_company(
            "اتحاد العاملين المساهمين بشركة مصر للأسواق الحرة",
            "مصر للأسواق الحرة"))

    def test_one_brand_word_apart_is_two_companies(self):
        self.assertFalse(ii.names_one_company("التلال للإسكان والتعمير ش.م.م",
                                              "القاهرة للاسكان والتعمير"))

    def test_a_key_of_nothing_but_category_words_names_no_company(self):
        # `B Investments Holding` reduces to {investments, holding} once a
        # single letter and the legal form are dropped — a key that would match
        # any holding company on the exchange.
        self.assertNotIn(frozenset({"investments", "holding"}),
                         ii.company_keys("B Investments Holding"))

    def test_the_legal_form_is_not_part_of_the_name(self):
        self.assertTrue(ii.names_one_company("بالم هيلز للتعمير ش م م",
                                             "بالم هيلز للتعمير"))
        self.assertTrue(ii.names_one_company("شركة الملتقى العربي للاستثمارات",
                                             "الملتقى العربي للاستثمارات"))

    def test_a_name_filed_in_both_scripts_at_once_still_matches(self):
        # Registers write one holder twice in one field. Each script is offered
        # as its own key so either may carry the match.
        self.assertTrue(ii.names_one_company(
            "بي انفستمنتس القابضة ش.م.م B-INVESTMENTS HOLDING SAE",
            "بى انفستمنتس القابضة"))

    def test_a_relationship_qualifier_is_not_part_of_the_name(self):
        self.assertTrue(ii.names_one_company(
            "شركة القاهرة للاسكان والتعمير (مجموعة مرتبطة )",
            "القاهرة للاسكان والتعمير"))


class Links(unittest.TestCase):
    def test_a_company_is_never_drawn_as_holding_itself(self):
        # QNB Alahli's register names Qatar National Bank, and the directory's
        # Arabic name for QNB Alahli is `بنك قطر الوطني`. From the name alone a
        # parent and its subsidiary cannot be told apart, so the link is
        # refused with the reason rather than drawn as a self-holding.
        out = run([company("QNBE", "بنك قطر الوطني", "Banks")],
                  [position("بنك قطر الوطني", "QNBE", 94.97)])
        self.assertEqual(out["links"], [])
        self.assertEqual(len(out["refused"]), 1)
        self.assertIn("same-named parent", out["refused"][0]["why"])

    def test_a_holder_who_is_not_listed_is_counted_not_dropped_silently(self):
        out = run([company("AAA", "الف للتعمير", "Real Estate")],
                  [position("صندوق أجنبي للاستثمار المباشر", "AAA", 12.0)])
        self.assertEqual(out["links"], [])
        self.assertEqual(out["outsideHolderCount"], 1)

    def test_the_exchange_taxonomy_decides_when_a_scan_disagrees(self):
        # One company, two listed lines, two classifications: one from the
        # exchange and one from a scan. That is not an ambiguity about the
        # company, and refusing it loses a real stake.
        out = run([company("SEIG", "السعودية المصرية للاستثمار والتمويل",
                           "Non-bank financial services"),
                   company("SEIGA", "السعودية المصرية للاستثمار والتمويل",
                           "Finance", source="scan"),
                   company("PHAR", "فاركو للادويه", "Health Care")],
                  [position("السعودية المصرية للإستثمار والتمويل", "PHAR", 0.086)])
        self.assertEqual(len(out["links"]), 1)
        self.assertEqual(out["links"][0]["owner"], "SEIG")
        self.assertEqual(out["links"][0]["ownerSector"],
                         "Non-bank financial services")

    def test_two_official_sectors_under_one_name_is_refused(self):
        out = run([company("AAA", "نفس الاسم للتعمير", "Real Estate"),
                   company("BBB", "نفس الاسم للتعمير", "Banks"),
                   company("CCC", "جيم للتعمير", "Food")],
                  [position("نفس الاسم للتعمير", "CCC", 10.0)])
        self.assertEqual(out["links"], [])
        self.assertIn("different sectors", out["refused"][0]["why"])

    def test_a_stakes_money_is_percent_of_the_held_companys_size(self):
        out = run([company("OWN", "المالكه للاستثمار", "Banks"),
                   company("HELD", "المملوكه للتعمير", "Real Estate", cap=2e9)],
                  [position("المالكه للاستثمار", "HELD", 25.0)])
        self.assertEqual(out["links"][0]["value"], 5e8)

    def test_a_held_company_with_no_published_size_gets_no_guessed_value(self):
        out = run([company("OWN", "المالكه للاستثمار", "Banks"),
                   company("HELD", "المملوكه للتعمير", "Real Estate", cap=None)],
                  [position("المالكه للاستثمار", "HELD", 25.0)])
        self.assertIsNone(out["links"][0]["value"])
        flow = out["flows"][0]
        self.assertIsNone(flow["value"])
        self.assertEqual(flow["valued"], 0)

    def test_percentages_are_never_added_across_companies(self):
        # 25% of one issuer and 40% of another is not 65% of anything. A sector
        # pair carries money and a count of links, and no percentage at all.
        out = run([company("OWN", "المالكه للاستثمار", "Banks"),
                   company("ONE", "الاولي للتعمير", "Real Estate", cap=1e9),
                   company("TWO", "الثانيه للتعمير", "Real Estate", cap=1e9)],
                  [position("المالكه للاستثمار", "ONE", 25.0),
                   position("المالكه للاستثمار", "TWO", 40.0)])
        flow = out["flows"][0]
        self.assertEqual(flow["links"], 2)
        self.assertEqual(flow["value"], 6.5e8)
        self.assertNotIn("percent", flow)
        self.assertFalse(any("percent" in k.lower() for k in flow))

    def test_a_persons_holding_is_not_a_sector_link(self):
        out = run([company("AAA", "الف للتعمير", "Real Estate")],
                  [position("محمد السيد صابر", "AAA", 9.0, kind="person")])
        self.assertEqual(out["links"], [])

    def test_a_holding_read_down_to_zero_is_not_a_link(self):
        out = run([company("OWN", "المالكه للاستثمار", "Banks"),
                   company("HELD", "المملوكه للتعمير", "Real Estate")],
                  [position("المالكه للاستثمار", "HELD", 0)])
        self.assertEqual(out["links"], [])

    def test_every_link_carries_the_document_it_came_from(self):
        out = run([company("OWN", "المالكه للاستثمار", "Banks"),
                   company("HELD", "المملوكه للتعمير", "Real Estate")],
                  [position("المالكه للاستثمار", "HELD", 25.0)])
        link = out["links"][0]
        for field in ("filingId", "source", "asOf", "basis"):
            self.assertTrue(link[field], field)


class Published(unittest.TestCase):
    """The file that ships, read back."""

    @classmethod
    def setUpClass(cls):
        cls.doc = json.loads((bso.OUT).read_text()) if bso.OUT.exists() else None

    def test_the_published_file_agrees_with_itself(self):
        if not self.doc:
            self.skipTest("nothing published yet")
        self.assertEqual(self.doc["linkCount"], len(self.doc["links"]))
        for link in self.doc["links"]:
            self.assertNotEqual(link["owner"], link["held"])
            self.assertGreater(link["percent"], 0)
            self.assertLessEqual(link["percent"], 100)
        pairs = {(f["fromSector"], f["toSector"]) for f in self.doc["flows"]}
        self.assertEqual(pairs, {(l["ownerSector"], l["heldSector"])
                                 for l in self.doc["links"]})

    def test_every_sector_total_is_the_money_its_links_carry(self):
        if not self.doc:
            self.skipTest("nothing published yet")
        for flow in self.doc["flows"]:
            mine = [l for l in self.doc["links"]
                    if l["ownerSector"] == flow["fromSector"]
                    and l["heldSector"] == flow["toSector"]]
            self.assertEqual(flow["links"], len(mine))
            valued = [l["value"] for l in mine if l["value"] is not None]
            if valued:
                self.assertAlmostEqual(flow["value"], round(sum(valued), 2), places=2)
            else:
                self.assertIsNone(flow["value"])


if __name__ == "__main__":
    unittest.main()
