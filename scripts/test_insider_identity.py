#!/usr/bin/env python3
"""Every rule in here decides that two filings name the same real party.

The tests are written so that removing a guard turns one red: a merge rule
that has no test refusing it is a rule that will quietly merge a father into
his son the first time a family files twice.
"""

import unittest

import insider_identity as ii


def trade(date, before, after, ticker="AAA", filing="1"):
    return {"date": date, "ticker": ticker, "filingId": filing,
            "stakeBefore": before, "stakeAfter": after}


class Folding(unittest.TestCase):
    def test_taa_marbuta_and_haa_are_one_spelling(self):
        self.assertEqual(ii.fold("شركة اموال العربيه للاقطان"),
                         ii.fold("شركه اموال العربيه للاقطان"))

    def test_hamza_shapes_fold_to_bare_alif(self):
        self.assertEqual(ii.fold("أيهاب خليل"), ii.fold("ايهاب خليل"))

    def test_compound_abd_names_fold_together(self):
        self.assertEqual(ii.fold("جمال عبد الفتاح عثمان حسن"),
                         ii.fold("جمال عبدالفتاح عثمان حسن"))

    def test_trailing_punctuation_is_not_a_different_company(self):
        self.assertEqual(ii.fold("شركة أودن للإستثمارات المالية."),
                         ii.fold("شركة أودن للإستثمارات المالية"))

    def test_leading_company_word_is_dropped_from_the_key(self):
        self.assertEqual(ii.fold("شركه اموال العربيه للاقطان"),
                         ii.fold("اموال العربيه للاقطان"))

    def test_two_different_names_do_not_fold_together(self):
        self.assertNotEqual(ii.fold("محمد تيسير محمد على طباخ"),
                            ii.fold("محمد تيسير محمد علي طباع"))


class Classifying(unittest.TestCase):
    def test_the_lil_construction_names_a_firm(self):
        self.assertTrue(ii.is_firm("الحصن للاستشارات"))

    def test_a_company_word_survives_the_identity_fold(self):
        # `fold` strips the leading شركة, so a classifier reading the folded
        # key would call this closed joint-stock company a person.
        self.assertTrue(ii.is_firm("شركة دراية المالية مساهمة مقفلة"))

    def test_the_transliteration_can_carry_the_marker_alone(self):
        self.assertTrue(ii.is_firm("برايم سمارت لإدارة و تطوير المشروعات",
                                   "Prime Smart for Projects Management"))

    def test_a_four_part_personal_name_is_a_person(self):
        self.assertFalse(ii.is_firm("محمد اشرف عمر عمر", "Mohamed Ashraf Omar Omar"))

    def test_a_titled_personal_name_is_a_person(self):
        self.assertFalse(ii.is_firm("د/ هاشم السيد هاشم دسوقى.",
                                    "Dr. Hashem El Sayed Hashem Desouky"))


class NameMatching(unittest.TestCase):
    def test_an_inserted_middle_name_is_the_same_person(self):
        self.assertTrue(ii.name_matches("ابراهيم محمد ابراهيم هيبه",
                                        "ابراهيم محمد ابراهيم احمد هيبه"))

    def test_a_prepended_name_is_a_child_not_the_same_person(self):
        # `تولين السيد صابر السيد حميد` is the daughter of `السيد صابر السيد
        # حميد` and both file on the same company.
        self.assertFalse(ii.name_matches("السيد صابر السيد حميد",
                                         "تولين السيد صابر السيد حميد"))

    def test_a_different_family_name_is_a_different_person(self):
        self.assertFalse(ii.name_matches("ابراهيم محمد ابراهيم هيبه",
                                         "ابراهيم محمد ابراهيم نصار"))

    def test_two_token_names_are_too_short_to_merge(self):
        self.assertFalse(ii.name_matches("محمد هيبه", "محمد ابراهيم هيبه"))

    def test_a_firm_merges_on_reordered_words(self):
        self.assertTrue(ii.name_matches(
            "الاصدار الاول ثاندر للاستثمار في اسهم مؤشر egx70 - t70 للصندوق الرئيسي "
            "صندوق استثمار ثاندر للاسهم متعدد الاصدارات",
            "صندوق استثمار ثاندر للاسهم متعدد الاصدارات الاصدار الاول ثاندر "
            "للاستثمار فى اسهم مؤشر egx70t70"))

    def test_containment_is_not_applied_to_people(self):
        # The same overlap between two personal names is a lineage, and the
        # firm branch must not be reachable for them.
        self.assertFalse(ii.name_matches("سامح محمود حسن جاب الله",
                                         "محمد محمود حسن جاب الله"))

    def test_one_english_rendering_of_two_spellings_matches(self):
        self.assertTrue(ii.name_matches(
            "اميرالد للاتصالات وتكنولوجيا المعلومات",
            "اميرالد لالتصالات وتكنولوجيا المعلومات",
            "Emerald for Communication and Information Technology",
            "Emerald for Communication and Information Technology"))

    def test_two_firms_sharing_a_couple_of_words_do_not_merge(self):
        self.assertFalse(ii.name_matches("الحصن للاستشارات", "وادي للاستشارات"))

    def test_two_firms_alike_in_most_of_their_words_still_do_not_merge(self):
        # Three words in common out of four. Egyptian group companies are
        # named this way on purpose, and a loose containment threshold turns
        # a family of firms into one holder.
        self.assertFalse(ii.name_matches("النصر للتجاره والتوزيع والمقاولات",
                                         "النصر للتجاره والتوزيع للسيارات"))


class ChainJoining(unittest.TestCase):
    def test_an_exact_handover_joins(self):
        self.assertTrue(ii.chain_joins(
            [trade("2026-08-30", 44.07, 41.81)],
            [trade("2026-08-19", 45.29, 44.07), trade("2026-09-01", 41.81, 40.81)]))

    def test_a_small_undisclosed_gap_still_joins(self):
        self.assertTrue(ii.chain_joins([trade("2026-08-10", 48.025, 47.261)],
                                       [trade("2026-08-20", 46.12, 45.39)]))

    def test_a_gap_no_undisclosed_trading_explains_refuses(self):
        # 5.02% on the 18th and 0.60% on the 30th are two holders, however
        # close the names look.
        self.assertFalse(ii.chain_joins([trade("2026-08-30", 0.6019, 0.25153)],
                                        [trade("2026-08-18", 4.97, 5.02)]))

    def test_one_side_with_no_stake_pair_cannot_corroborate(self):
        self.assertFalse(ii.chain_joins([trade("2026-08-30", 44.07, 41.81)],
                                        [trade("2026-08-19", None, None)]))


class Resolving(unittest.TestCase):
    def _people(self):
        return [
            {"id": "شركة اموال العربيه للاقطان", "nameEn": "Amwal", "trades": [
                trade("2026-08-30", 44.07, 41.81, "KABO", "1")]},
            {"id": "شركه اموال العربيه للاقطان", "nameEn": "Amwal", "trades": [
                trade("2026-08-19", 45.29, 44.07, "KABO", "2"),
                trade("2026-09-01", 41.81, 40.81, "KABO", "3")]},
            {"id": "السيد صابر السيد حميد", "nameEn": "El Sayed", "trades": [
                trade("2026-08-05", 9.0, 8.0, "AIH", "4")]},
            {"id": "تولين السيد صابر السيد حميد", "nameEn": "Toleen", "trades": [
                trade("2026-08-06", 8.0, 7.0, "AIH", "5")]},
        ]

    def test_spelling_variants_become_one_holder(self):
        groups = [{m["id"] for m in g} for g in ii.resolve(self._people())]
        self.assertIn({"شركه اموال العربيه للاقطان", "شركة اموال العربيه للاقطان"},
                      groups)

    def test_a_parent_and_child_on_one_company_stay_apart(self):
        groups = ii.resolve(self._people())
        for g in groups:
            ids = {m["id"] for m in g}
            self.assertFalse({"السيد صابر السيد حميد",
                              "تولين السيد صابر السيد حميد"} <= ids)

    def test_every_filed_name_survives_into_exactly_one_group(self):
        people = self._people()
        seen = [m["id"] for g in ii.resolve(people) for m in g]
        self.assertEqual(sorted(seen), sorted(p["id"] for p in people))

    def test_a_near_identical_name_the_ledger_contradicts_is_not_merged(self):
        # Both hold FIRE, both read `محمد تيسير محمد ...`, and one is at 5.02%
        # twelve days before the other is at 0.60%. Names alone would merge
        # them; the stakes say two people.
        contradicted = [
            {"id": "محمد تيسير محمد علي طباع", "nameEn": "Tabbaa", "trades": [
                trade("2026-08-18", 4.97, 5.02, "FIRE", "1")]},
            {"id": "محمد تيسير محمد علي طباع الدين", "nameEn": "Tabbaa", "trades": [
                trade("2026-08-30", 0.6019, 0.25153, "FIRE", "2")]},
        ]
        self.assertEqual(len(ii.resolve(contradicted)), 2)

    def test_a_name_match_without_a_shared_company_is_not_merged(self):
        apart = [
            {"id": "بايونيرز بروبرتيز للتنميه العمرانيه", "nameEn": "Pioneers", "trades": [
                trade("2026-09-02", 60.01, 58.9, "GGCC", "1")]},
            {"id": "بايونيرز بروبرتيز للتنميه العمرانيه بي ار اي", "nameEn": "Pioneers", "trades": [
                trade("2026-09-03", 5.01, 2.81, "UEGC", "2")]},
        ]
        self.assertEqual(len(ii.resolve(apart)), 2)


if __name__ == "__main__":
    unittest.main()
