#!/usr/bin/env python3
"""What the published ownership file must and must not say.

The map on the website draws these numbers as a claim about who owns a real
company, so the tests here are about the claims rather than the plumbing: a
holder is not two holders, a trade filed twice is not two trades, and a stake
read down to zero is not the same as a stake nobody ever held.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import contextlib
import io
import json
import pathlib
import tempfile
import unittest

import audit_accuracy
import build_insider_people as bip


def reading(filing, name, ticker, date, before, after, shares=1000, price=10.0,
            action="sell", name_en=None):
    return {
        "filingId": filing, "investorName": name, "investorNameEn": name_en or name,
        "ticker": ticker, "sessionDate": date, "action": action,
        "shares": shares, "price": price,
        "ownershipBeforePercent": before, "ownershipAfterPercent": after,
        "nameScript": "ar", "source": f"https://example.invalid/{filing}.pdf",
    }


def register(ticker, holders, board=(), as_of="2026-06-30", filing="900"):
    return {
        "filingId": filing, "ticker": ticker, "asOfDate": as_of,
        "publishedAt": f"{as_of}T10:00:00", "sessionDate": as_of,
        "source": f"https://example.invalid/{filing}.pdf", "totalShares": 100_000_000,
        "board": [{"nameArabic": n, "role": r, "representing": None}
                  for n, r in board],
        "shareholders": [{"nameArabic": n, "percent": p, "shares": None,
                          "kind": "person"} for n, p in holders],
    }


def build(readings, companies=None, books=()):
    """Run the builder against throwaway stores and read back what it wrote.

    `REGISTERS` has to be redirected with the rest. Left pointing at the real
    file, every test in here silently merged in the whole exchange — which is
    how a test asking for one position got a filing id from a company it had
    never heard of.
    """
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        store, out = root / "store.json", root / "out.json"
        companies_file = root / "companies.json"
        registers_file = root / "registers.json"
        store.write_text(json.dumps({"readings": {r["filingId"]: r for r in readings}}),
                         encoding="utf-8")
        registers_file.write_text(
            json.dumps({"readings": {b["filingId"]: b for b in books}}), encoding="utf-8")
        companies_file.write_text(json.dumps({"companies": companies or []}),
                                  encoding="utf-8")
        saved = (bip.STORE, bip.OUT, bip.FIXTURE, bip.COMPANIES, bip.REGISTERS)
        bip.STORE, bip.OUT, bip.COMPANIES = store, out, companies_file
        bip.REGISTERS = registers_file
        bip.FIXTURE = root / "missing" / "fixture.json"
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                bip.main([])
            return json.loads(out.read_text(encoding="utf-8"))
        finally:
            (bip.STORE, bip.OUT, bip.FIXTURE, bip.COMPANIES,
             bip.REGISTERS) = saved


AMWAL = "شركة اموال العربيه للاقطان"
AMWAL_HAA = "شركه اموال العربيه للاقطان"


class Weeks(unittest.TestCase):
    def test_the_week_opens_on_sunday(self):
        # The EGX trades Sunday to Thursday. A Monday-anchored week would put
        # each Sunday's filings in with the week before.
        self.assertEqual(bip.week_of("2026-08-16"), "2026-08-16")  # a Sunday
        self.assertEqual(bip.week_of("2026-08-20"), "2026-08-16")  # the Thursday
        self.assertEqual(bip.week_of("2026-08-15"), "2026-08-09")  # the Saturday

    def test_a_week_inside_one_month_is_labelled_once(self):
        self.assertEqual(bip.week_label("2026-08-16", "2026-08-20", bip._MONTHS_EN),
                         "16–20 Aug")

    def test_a_week_across_two_months_names_both(self):
        self.assertEqual(bip.week_label("2026-08-30", "2026-09-03", bip._MONTHS_EN),
                         "30 Aug – 3 Sep")


class OneHolderPerParty(unittest.TestCase):
    def test_two_spellings_of_one_firm_are_one_holder(self):
        doc = build([
            reading("1", AMWAL_HAA, "KABO", "2026-08-19", 45.29, 44.07),
            reading("2", AMWAL, "KABO", "2026-08-30", 44.07, 41.81),
        ])
        self.assertEqual(doc["peopleCount"], 1)

    def test_the_company_is_not_shown_as_owned_twice_over(self):
        doc = build([
            reading("1", AMWAL_HAA, "KABO", "2026-08-19", 45.29, 44.07),
            reading("2", AMWAL, "KABO", "2026-08-30", 44.07, 41.81),
        ])
        held = sum(p["percent"] for p in doc["positions"] if p["ticker"] == "KABO")
        self.assertAlmostEqual(held, 41.81)

    def test_the_spellings_that_were_merged_are_still_published(self):
        doc = build([
            reading("1", AMWAL_HAA, "KABO", "2026-08-19", 45.29, 44.07),
            reading("2", AMWAL, "KABO", "2026-08-30", 44.07, 41.81),
        ])
        self.assertIn(AMWAL_HAA, doc["people"][0]["aliases"] or [])

    def test_a_parent_and_child_filing_on_one_company_stay_apart(self):
        doc = build([
            reading("1", "السيد صابر السيد حميد", "AIH", "2026-08-05", 9.0, 8.0),
            reading("2", "تولين السيد صابر السيد حميد", "AIH", "2026-08-06", 8.0, 7.0),
        ])
        self.assertEqual(doc["peopleCount"], 2)


class OneTradePerExecution(unittest.TestCase):
    def _twice_filed(self):
        return [
            reading("294186", "اميرالد للاتصالات وتكنولوجيا المعلومات", "IEEC",
                    "2026-08-31", 11.09, 9.04, shares=30_000_000, price=1.5),
            reading("294272", "اميرالد للاتصالات وتكنولوجيا المعلومات", "IEEC",
                    "2026-08-31", 11.09, 9.04, shares=30_000_000, price=1.5),
        ]

    def test_one_execution_filed_twice_counts_once(self):
        self.assertEqual(build(self._twice_filed())["tradeCount"], 1)

    def test_the_value_is_not_doubled_by_a_refiling(self):
        doc = build(self._twice_filed())
        self.assertAlmostEqual(doc["people"][0]["value"], 45_000_000.0)

    def test_two_real_trades_on_one_day_are_both_kept(self):
        doc = build([
            reading("1", "محمد اشرف عمر عمر", "HBCO", "2026-08-31", 11.0, 10.0),
            reading("2", "محمد اشرف عمر عمر", "HBCO", "2026-08-31", 10.0, 9.0),
        ])
        self.assertEqual(doc["tradeCount"], 2)


class StandingStakes(unittest.TestCase):
    def test_a_position_is_the_latest_form_not_a_sum_of_moves(self):
        doc = build([
            reading("1", "محمد اشرف عمر عمر", "HBCO", "2026-08-03", 12.0, 11.0),
            reading("2", "محمد اشرف عمر عمر", "HBCO", "2026-08-20", 10.9, 10.728),
        ])
        self.assertAlmostEqual(doc["positions"][0]["percent"], 10.728)

    def test_a_holding_sold_out_stays_in_the_list_at_zero(self):
        # Dropping it would say nobody ever held it, which is a different and
        # untrue claim.
        doc = build([reading("1", "الحصن للاستشارات", "UNIP", "2026-08-16", 3.01, 0.0)])
        self.assertEqual([p["percent"] for p in doc["positions"]], [0.0])

    def test_a_position_carries_the_filing_it_came_from(self):
        doc = build([reading("77", "الحصن للاستشارات", "UNIP", "2026-08-16", 3.01, 0.003)])
        self.assertEqual(doc["positions"][0]["filingId"], "77")

    def test_a_holder_of_two_companies_gets_two_positions(self):
        doc = build([
            reading("1", "وادي للاستشارات", "GGCC", "2026-09-01", 1.5, 0.84),
            reading("2", "وادي للاستشارات", "AIH", "2026-09-02", 4.0, 3.2),
        ])
        self.assertEqual({p["ticker"] for p in doc["positions"]}, {"GGCC", "AIH"})


class WhatMoved(unittest.TestCase):
    def test_a_week_reports_the_move_end_to_end_not_trade_by_trade(self):
        doc = build([
            reading("1", "محمد اشرف عمر عمر", "HBCO", "2026-08-17", 12.0, 11.0),
            reading("2", "محمد اشرف عمر عمر", "HBCO", "2026-08-19", 11.0, 9.5),
        ])
        self.assertEqual(len(doc["periods"]), 1)
        move = doc["periods"][0]["moves"][0]
        self.assertEqual((move["from"], move["to"], move["trades"]), (12.0, 9.5, 2))

    def test_filings_in_different_weeks_are_different_periods(self):
        doc = build([
            reading("1", "محمد اشرف عمر عمر", "HBCO", "2026-08-17", 12.0, 11.0),
            reading("2", "محمد اشرف عمر عمر", "HBCO", "2026-08-25", 11.0, 9.5),
        ])
        self.assertEqual([p["start"] for p in doc["periods"]],
                         ["2026-08-16", "2026-08-23"])

    def test_a_holder_is_labelled_a_person_or_a_firm(self):
        doc = build([
            reading("1", "الحصن للاستشارات", "UNIP", "2026-08-16", 3.01, 0.003),
            reading("2", "محمد اشرف عمر عمر", "HBCO", "2026-08-17", 12.0, 11.0),
        ])
        self.assertEqual({p["nameEn"]: p["kind"] for p in doc["people"]},
                         {"الحصن للاستشارات": "firm", "محمد اشرف عمر عمر": "person"})


class NeverShrinks(unittest.TestCase):
    """A thin store must not overwrite a fat file.

    The readings live outside git. A CI runner rebuilding from an empty store
    would otherwise replace every named holder on the map with the six forms
    it managed to read that morning, and report success doing it.
    """

    def _build_into(self, out, readings, force=False):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            store = root / "store.json"
            companies_file = root / "companies.json"
            store.write_text(json.dumps({"readings": {r["filingId"]: r for r in readings}}),
                             encoding="utf-8")
            companies_file.write_text(json.dumps({"companies": []}), encoding="utf-8")
            registers_file = root / "registers.json"
            registers_file.write_text(json.dumps({"readings": {}}), encoding="utf-8")
            saved = (bip.STORE, bip.OUT, bip.FIXTURE, bip.COMPANIES, bip.REGISTERS)
            bip.STORE, bip.OUT, bip.COMPANIES = store, out, companies_file
            bip.REGISTERS = registers_file
            bip.FIXTURE = root / "missing" / "fixture.json"
            try:
                with contextlib.redirect_stdout(io.StringIO()) as said:
                    bip.main(["--force"] if force else [])
                return said.getvalue()
            finally:
                (bip.STORE, bip.OUT, bip.FIXTURE, bip.COMPANIES,
                 bip.REGISTERS) = saved

    def _fat(self, out):
        self._build_into(out, [
            reading("1", "الحصن للاستشارات", "UNIP", "2026-08-16", 3.01, 0.003),
            reading("2", "محمد اشرف عمر عمر", "HBCO", "2026-08-17", 12.0, 11.0),
            reading("3", "وادي للاستشارات", "GGCC", "2026-09-01", 1.5, 0.84),
        ])

    def test_a_thinner_rebuild_leaves_the_published_file_alone(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = pathlib.Path(tmp) / "out.json"
            self._fat(out)
            self._build_into(out, [reading("9", "محمد اشرف عمر عمر", "HBCO",
                                           "2026-08-17", 12.0, 11.0)])
            kept = json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(kept["peopleCount"], 3)

    def test_it_says_why_it_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = pathlib.Path(tmp) / "out.json"
            self._fat(out)
            said = self._build_into(out, [reading("9", "محمد اشرف عمر عمر", "HBCO",
                                                  "2026-08-17", 12.0, 11.0)])
            self.assertIn("refusing to publish", said)

    def test_the_same_size_still_publishes(self):
        # Only a LOSS is refused. A rebuild that names the same holders with
        # corrected figures has to be able to land.
        with tempfile.TemporaryDirectory() as tmp:
            out = pathlib.Path(tmp) / "out.json"
            self._fat(out)
            self._build_into(out, [
                reading("1", "الحصن للاستشارات", "UNIP", "2026-08-16", 3.01, 0.5),
                reading("2", "محمد اشرف عمر عمر", "HBCO", "2026-08-17", 12.0, 11.0),
                reading("3", "وادي للاستشارات", "GGCC", "2026-09-01", 1.5, 0.84),
            ])
            after = json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual([p["percent"] for p in after["positions"]
                              if p["ticker"] == "UNIP"], [0.5])

    def test_force_publishes_the_loss_deliberately(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = pathlib.Path(tmp) / "out.json"
            self._fat(out)
            self._build_into(out, [reading("9", "محمد اشرف عمر عمر", "HBCO",
                                           "2026-08-17", 12.0, 11.0)], force=True)
            self.assertEqual(json.loads(out.read_text(encoding="utf-8"))["peopleCount"], 1)


class TheRegister(unittest.TestCase):
    """The other form: the board and the whole shareholder structure."""

    def test_a_holder_who_never_traded_still_gets_a_position(self):
        # The point of reading registers: most holders of most companies have
        # never filed a trade, and nothing else on this site can name them.
        doc = build([], books=[register("AALR", [("سعيد محمد على حسن", 41.5)])])
        self.assertEqual([(p["ticker"], p["percent"], p["basis"]) for p in doc["positions"]],
                         [("AALR", 41.5, "register")])

    def test_a_newer_register_supersedes_an_older_trade(self):
        doc = build([reading("1", "محمد اشرف عمر عمر", "HBCO", "2026-05-01", 12.0, 11.0)],
                    books=[register("HBCO", [("محمد اشرف عمر عمر", 9.25)],
                                    as_of="2026-06-30")])
        self.assertEqual([(p["percent"], p["basis"]) for p in doc["positions"]],
                         [(9.25, "register")])

    def test_a_newer_trade_beats_an_older_register(self):
        doc = build([reading("1", "محمد اشرف عمر عمر", "HBCO", "2026-08-17", 12.0, 11.0)],
                    books=[register("HBCO", [("محمد اشرف عمر عمر", 9.25)],
                                    as_of="2026-06-30")])
        self.assertEqual([(p["percent"], p["basis"]) for p in doc["positions"]],
                         [(11.0, "trade")])

    def test_a_register_of_the_same_date_beats_the_trade(self):
        # One states the holding; the other states what a single transaction
        # left behind. On the same day the register is the better answer.
        doc = build([reading("1", "محمد اشرف عمر عمر", "HBCO", "2026-06-30", 12.0, 11.0)],
                    books=[register("HBCO", [("محمد اشرف عمر عمر", 9.25)],
                                    as_of="2026-06-30")])
        self.assertEqual([(p["percent"], p["basis"]) for p in doc["positions"]],
                         [(9.25, "register")])

    def test_a_register_row_at_zero_is_not_a_holding(self):
        # `build_ownership_structure` strips these before they reach the store,
        # but a store written by an older build still has them, and a director
        # at zero is not an owner of anything.
        doc = build([], books=[register("AALR", [("سعيد محمد على حسن", 41.5),
                                                 ("هشام حسين الخازندار", 0.0)])])
        self.assertEqual([p["holder"] for p in doc["positions"]], ["سعيد محمد على حسن"])

    def test_one_holder_in_both_documents_is_one_holder(self):
        doc = build([reading("1", "محمد اشرف عمر عمر", "HBCO", "2026-05-01", 12.0, 11.0)],
                    books=[register("HBCO", [("محمد اشرف عمر عمر", 9.25)])])
        self.assertEqual(doc["peopleCount"], 1)
        self.assertEqual(len(doc["positions"]), 1)

    def test_the_board_is_published_and_is_not_a_shareholding(self):
        doc = build([], books=[register(
            "AALR", [("سعيد محمد على حسن", 41.5)],
            board=[("علاء محمد سالم الغاوي", "رئيس مجلس الاداره"),
                   ("حمدي محمد الشاطر محمود", "عضو منتدب")])])
        self.assertEqual(doc["seatCount"], 2)
        self.assertEqual([s["name"] for s in doc["boards"][0]["seats"]],
                         ["علاء محمد سالم الغاوي", "حمدي محمد الشاطر محمود"])
        # Two directors, one holder. A seat is not a stake.
        self.assertEqual(len(doc["positions"]), 1)

    def test_a_director_who_also_holds_is_joined_to_their_holding(self):
        doc = build([], books=[register(
            "AALR", [("علاء محمد سالم الغاوي", 12.0)],
            board=[("علاء محمد سالم الغاوي", "رئيس مجلس الاداره")])])
        seat = doc["boards"][0]["seats"][0]
        self.assertEqual(seat["holder"], doc["positions"][0]["holder"])

    def test_a_register_that_contradicts_itself_is_declared_rather_than_scaled(self):
        # Two names inside ONE register, adding to more than the company.
        # Nothing can adjudicate that — both came from the same document, so
        # there is no better document to prefer. It is published as the
        # contradiction it is, and the map marks the ring.
        doc = build([], books=[register("ASCM", [("Citadel Capital", 60.0),
                                                 ("القلعة للاستشارات المالية", 50.76)])])
        self.assertEqual([(r["ticker"], r["holders"]) for r in doc["overDisclosed"]],
                         [("ASCM", 2)])
        self.assertGreater(doc["overDisclosed"][0]["percent"], 100)
        self.assertEqual(doc["supersededByRegister"], [],
                         "there is no trade form here to set aside")

    def test_a_company_that_adds_up_is_not_declared(self):
        doc = build([], books=[register("AALR", [("سعيد محمد على حسن", 41.5),
                                                 ("محمود عاطف محمود عيسي", 12.0)])])
        self.assertEqual(doc["overDisclosed"], [])


class OnePartyTwoAlphabets(unittest.TestCase):
    """`Citadel Capital` and `القلعة للاستشارات المالية` are one firm.

    القلعة IS citadel. A translation is not a transliteration and no folding
    of letters reaches from one to the other, so the names cannot settle it.
    What settles it is the kind of document: a register enumerates a company's
    holders in one internally consistent filing, and a trade form names one
    party and says nothing about who else holds.
    """

    def _both(self, register_pct, trade_pct):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            store, books = root / "store.json", root / "books.json"
            out, companies_file = root / "out.json", root / "companies.json"
            store.write_text(json.dumps({"readings": {"1": reading(
                "1", "القلعة للاستشارات المالية", "ASCM", "2026-08-17",
                trade_pct + 2.6, trade_pct)}}), encoding="utf-8")
            books.write_text(json.dumps({"readings": {"9": {
                "filingId": "9", "ticker": "ASCM", "asOfDate": "2026-06-30",
                "publishedAt": "2026-07-01T00:00:00", "source": "x",
                "totalShares": None, "board": [],
                "shareholders": [
                    {"nameArabic": "Citadel Capital", "percent": register_pct},
                    {"nameArabic": "Financial Holdings International LTD",
                     "percent": 15.83},
                ],
            }}}), encoding="utf-8")
            companies_file.write_text(json.dumps({"companies": []}), encoding="utf-8")
            saved = (bip.STORE, bip.REGISTERS, bip.OUT, bip.FIXTURE, bip.COMPANIES)
            bip.STORE, bip.REGISTERS, bip.OUT = store, books, out
            bip.COMPANIES = companies_file
            bip.FIXTURE = root / "missing" / "fixture.json"
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    bip.main([])
                return json.loads(out.read_text(encoding="utf-8"))
            finally:
                bip.STORE, bip.REGISTERS, bip.OUT, bip.FIXTURE, bip.COMPANIES = saved

    def test_the_register_wins_when_both_cannot_be_true(self):
        doc = self._both(53.35, 50.76)          # 119.94% between them
        held = sum(p["percent"] for p in doc["positions"] if p["ticker"] == "ASCM")
        self.assertLessEqual(held, 100.0001)
        self.assertEqual([p["holder"] for p in doc["positions"]
                          if p["basis"] == "trade"], [])

    def test_what_was_set_aside_is_published_with_its_reason(self):
        doc = self._both(53.35, 50.76)
        aside = doc["supersededByRegister"]
        self.assertEqual([x["holder"] for x in aside], ["القلعة للاستشارات المالية"])
        self.assertIn("119.94%", aside[0]["why"])

    def test_a_trade_the_register_leaves_room_for_is_kept(self):
        # Below the disclosure threshold, or acquired after the register was
        # filed. Nothing contradicts it, so nothing is set aside.
        doc = self._both(20.0, 9.0)             # 44.83% between them
        self.assertIn("trade", [p["basis"] for p in doc["positions"]])
        self.assertEqual(doc["supersededByRegister"], [])


class TheAudit(unittest.TestCase):
    """The published file is checked for the contradiction the merge prevents."""

    def test_a_company_owned_twice_over_is_reported(self):
        faults = audit_accuracy.audit_ownership({"positions": [
            {"holder": "one", "ticker": "HBCO", "percent": 47.261},
            {"holder": "two", "ticker": "HBCO", "percent": 45.39},
            {"holder": "three", "ticker": "HBCO", "percent": 10.728},
        ]})
        self.assertEqual([f["kind"] for f in faults], ["stake_over_100"])
        self.assertIn("103.38%", faults[0]["detail"])

    def test_a_company_that_adds_up_is_not_reported(self):
        self.assertEqual(audit_accuracy.audit_ownership({"positions": [
            {"holder": "one", "ticker": "HBCO", "percent": 45.39},
            {"holder": "three", "ticker": "HBCO", "percent": 10.728},
        ]}), [])

    def test_holdings_read_down_to_zero_do_not_count_against_the_company(self):
        self.assertEqual(audit_accuracy.audit_ownership({"positions": [
            {"holder": "one", "ticker": "HBCO", "percent": 99.0},
            {"holder": "gone", "ticker": "HBCO", "percent": 0.0},
        ]}), [])

    def test_every_contradiction_in_the_published_file_is_declared(self):
        # Merging the filed registers in made this reachable: a register in
        # English and a trade form in Arabic can name one firm twice, and no
        # folding crosses a translation. The claim is not that it never
        # happens — it is that the file never hides it.
        published = json.loads(
            (pathlib.Path(bip.REPO) / "public" / "data" / "v1"
             / "insider-people.json").read_text(encoding="utf-8"))
        found = sorted(f["ticker"] for f in audit_accuracy.audit_ownership(published))
        declared = sorted(r["ticker"] for r in published.get("overDisclosed") or ())
        self.assertEqual(found, declared)


if __name__ == "__main__":
    unittest.main()
