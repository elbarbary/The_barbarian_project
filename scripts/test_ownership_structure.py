#!/usr/bin/env python3
"""What the shareholder-structure reader refuses.

This builder attaches named individuals to a company's share register. A
misread digit here does not look wrong on screen — it looks like a fact about
who controls a listed company. Every guard is a way that is stopped, and every
test fails when its guard is removed.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import contextlib
import io
import json
import pathlib
import tempfile
import unittest

import build_ownership_structure as structure


def form(**over):
    base = {
        "companyArabic": "مرسيليا المصرية الخليجية للاستثمار العقارى",
        "asOfDate": "2025-09-30",
        "totalShares": 207648000,
        "board": [{"nameArabic": "أ/ سامي عبد الرحيم فؤاد عبد الرواف",
                   "role": "رئيس مجلس الإدارة", "representing": "عن نفسه"}],
        "shareholders": [
            {"nameArabic": "سامي عبد الرحيم فؤاد", "percent": 29.71,
             "shares": 61711854, "kind": "person"},
            {"nameArabic": "ياسر علي أحمد رجب", "percent": 34.23,
             "shares": 71083700, "kind": "person"},
        ],
        "legible": True,
    }
    base.update(over)
    return base


ISSUER = "مرسيليا المصرية الخليجية للاستثمار العقارى"


class Reading(unittest.TestCase):
    def test_a_form_whose_numbers_agree_is_kept(self):
        self.assertIsNone(structure.vet(form(), "MAAL", ISSUER))

    def test_a_share_count_that_contradicts_its_percentage_is_refused(self):
        # 215,515,685 of 62,400,000 shares is 345%, and the form printed 34.54.
        # One of the two numbers was misread and there is no way to know which.
        why = structure.vet(form(totalShares=62400000, shareholders=[
            {"nameArabic": "شركة قره لمشروعات الطاقة", "percent": 34.54,
             "shares": 215515685, "kind": "firm"}]), "QARA",
            "الشركة المصرية لخدمات التليفون المحمول")
        self.assertIn("345.38%", why or "")

    def test_rounding_between_the_two_is_allowed(self):
        # 29.71% of 207,648,000 is 61,692,020; the form prints 61,711,854.
        # That is the percentage being printed to two places, not a misread.
        self.assertIsNone(structure.vet(form(), "MAAL", ISSUER))

    def test_a_company_cannot_be_more_than_wholly_owned(self):
        why = structure.vet(form(totalShares=None, shareholders=[
            {"nameArabic": "أحمد محمد علي حسن", "percent": 70.0, "shares": None, "kind": "person"},
            {"nameArabic": "محمود سعيد فؤاد كامل", "percent": 45.0, "shares": None, "kind": "person"}]),
            "AAA", "شركة ألفا")
        self.assertIn("115.00%", why or "")

    def test_a_director_who_owns_nothing_does_not_void_the_register(self):
        # These forms print the board in the same table as the holders, and a
        # director with no shares is printed at zero. Refusing the document
        # over that threw away twelve complete registers — every one of them
        # naming people who DO hold.
        self.assertIsNone(structure.vet(form(totalShares=None, shareholders=[
            {"nameArabic": "هشام حسين الخازندار", "percent": 0.0, "shares": None,
             "kind": "person"},
            {"nameArabic": "محمد اشرف عمر عمر", "percent": 12.5, "shares": None,
             "kind": "person"}]), "AAA", "شركة ألفا للاستثمار"))

    def test_a_row_with_no_stake_is_not_published_as_a_holding(self):
        rows = [{"nameArabic": "هشام حسين الخازندار", "percent": 0.0},
                {"nameArabic": "ليلي رمزي نجيب خله", "percent": None},
                {"nameArabic": "محمد اشرف عمر عمر", "percent": 12.5}]
        self.assertEqual([r["nameArabic"] for r in structure.owning(rows)],
                         ["محمد اشرف عمر عمر"])

    def test_a_form_of_nothing_but_zero_holders_and_no_board_is_still_refused(self):
        why = structure.vet(form(board=[], totalShares=None, shareholders=[
            {"nameArabic": "هشام حسين الخازندار", "percent": 0.0}]),
            "AAA", "شركة ألفا للاستثمار")
        self.assertIn("neither a director nor a holder", why or "")

    def test_a_stake_outside_nought_to_a_hundred_is_refused(self):
        for bad in (-3, 140):
            why = structure.vet(form(totalShares=None, shareholders=[
                {"nameArabic": "أحمد محمد علي حسن", "percent": bad, "shares": None,
                 "kind": "person"}]), "AAA", "شركة ألفا")
            self.assertIn("outside 0-100%", why or "", f"{bad} was accepted")

    def test_the_same_holder_listed_twice_is_refused(self):
        why = structure.vet(form(totalShares=None, shareholders=[
            {"nameArabic": "أحمد محمد علي حسن", "percent": 20.0, "shares": None, "kind": "person"},
            {"nameArabic": "احمد محمد علي حسن", "percent": 15.0, "shares": None, "kind": "person"}]),
            "AAA", "شركة ألفا")
        self.assertIn("listed twice", why or "")

    def test_the_issuer_is_not_a_shareholder_in_itself_here(self):
        why = structure.vet(form(totalShares=None, shareholders=[
            {"nameArabic": ISSUER, "percent": 12.0, "shares": None, "kind": "firm"}]),
            "MAAL", ISSUER)
        self.assertIn("the issuer itself", why or "")

    def test_a_director_with_no_name_is_refused(self):
        why = structure.vet(form(board=[{"nameArabic": "-", "role": None,
                                         "representing": None}]), "MAAL", ISSUER)
        self.assertIn("no usable name", why or "")

    def test_an_illegible_scan_is_refused_rather_than_guessed_at(self):
        self.assertIn("could not read", structure.vet({"legible": False}, "MAAL", ISSUER) or "")

    def test_a_form_with_neither_a_director_nor_a_holder_is_refused(self):
        why = structure.vet(form(board=[], shareholders=[]), "MAAL", ISSUER)
        self.assertIn("neither a director nor a holder", why or "")

    def test_a_board_with_no_shareholder_section_still_counts(self):
        # Some forms print the board and leave the structure table to a later
        # filing. Half a document is not a bad document.
        self.assertIsNone(structure.vet(form(shareholders=[]), "MAAL", ISSUER))


class ReaderFailures(unittest.TestCase):
    """A reader that timed out has said nothing about the document."""

    def test_no_answer_is_not_a_refusal(self):
        self.assertTrue(structure.incomplete(None))
        self.assertTrue(structure.incomplete({}))
        self.assertTrue(structure.incomplete({"companyArabic": "x"}))

    def test_an_illegibility_verdict_is_an_answer(self):
        self.assertFalse(structure.incomplete({"legible": False}))

    def test_a_list_of_any_kind_is_an_answer(self):
        self.assertFalse(structure.incomplete({"board": []}))
        self.assertFalse(structure.incomplete({"shareholders": []}))


class Queue(unittest.TestCase):
    def test_only_the_newest_form_per_company_is_read(self):
        ledger = {"documents": [
            {"kind": "ownership_structure", "ticker": "AAA", "filingId": "1",
             "publishedAt": "2025-01-01T00:00:00", "attachments": ["a.pdf"]},
            {"kind": "ownership_structure", "ticker": "AAA", "filingId": "2",
             "publishedAt": "2026-06-01T00:00:00", "attachments": ["b.pdf"]},
            {"kind": "post_execution_disclosure", "ticker": "BBB", "filingId": "3",
             "publishedAt": "2026-06-01T00:00:00", "attachments": ["c.pdf"]},
        ]}
        newest = structure.latest_per_company(ledger)
        self.assertEqual(list(newest), ["AAA"])
        self.assertEqual(newest["AAA"]["filingId"], "2")

    def test_a_filing_with_no_attachment_is_not_queued(self):
        ledger = {"documents": [
            {"kind": "ownership_structure", "ticker": "AAA", "filingId": "1",
             "publishedAt": "2026-06-01T00:00:00", "attachments": []},
        ]}
        self.assertEqual(structure.latest_per_company(ledger), {})


if __name__ == "__main__":
    unittest.main()


class SharedBacklog(unittest.TestCase):
    """Several workers on one backlog, and the file they must not share.

    The store is read once at the start of a run and written at the end, so two
    runs against the same file lose one run's work. Shards give each worker its
    own file and a disjoint slice; `merge` folds them back.
    """

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.saved = (structure.STORE, structure.LEDGER, structure.PDF_DIR)
        structure.STORE = self.root / "shared.json"
        structure.LEDGER = self.root / "ledger.json"
        structure.PDF_DIR = self.root / "pdfs"
        self.addCleanup(self.restore)
        docs = [{"filingId": str(900 + i), "kind": "ownership_structure",
                 "ticker": f"T{i:02d}", "publishedAt": f"2026-06-{i + 1:02d}T10:00:00",
                 "sessionDate": "2026-06-30",
                 "attachments": [f"https://example.invalid/{900 + i}.pdf"]}
                for i in range(9)]
        structure.LEDGER.write_text(json.dumps(
            {"schemaVersion": 1, "documents": docs}), encoding="utf-8")

    def restore(self):
        structure.STORE, structure.LEDGER, structure.PDF_DIR = self.saved

    def run_builder(self, argv):
        with contextlib.redirect_stdout(io.StringIO()) as out:
            structure.main(argv)
        return out.getvalue()

    def store(self, path=None):
        path = path or structure.STORE
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}

    def test_three_shards_divide_the_backlog_and_do_not_overlap(self):
        taken = []
        for part in range(3):
            out = self.run_builder(["--check", "--shard", f"{part}/3"])
            taken.append(out)
        # `--check` reports the slice without reading anything.
        for part, out in enumerate(taken):
            self.assertIn(f"shard {part + 1} of 3: 3 of them", out)

    def test_a_shard_skips_what_the_shared_store_already_holds(self):
        structure.STORE.write_text(json.dumps({
            "schemaVersion": 1,
            "readings": {"900": {"ticker": "T00"}, "901": {"ticker": "T01"}},
            "refused": {"902": "unreadable"}}), encoding="utf-8")
        out = self.run_builder(["--check", "--shard", "0/2"])
        self.assertIn("6 outstanding", out)
        self.assertIn("shard 1 of 2: 3 of them", out)

    def test_merge_folds_the_shards_in_and_never_overwrites(self):
        structure.STORE.write_text(json.dumps({
            "schemaVersion": 1,
            "readings": {"900": {"ticker": "T00", "from": "shared"}},
            "refused": {}}), encoding="utf-8")
        one = self.root / "shard-0.json"
        one.write_text(json.dumps({
            "schemaVersion": 1,
            "readings": {"900": {"ticker": "T00", "from": "worker"},
                         "901": {"ticker": "T01", "from": "worker"}},
            "refused": {"902": "a share count that contradicts itself"}}),
            encoding="utf-8")
        self.run_builder(["--merge", str(one)])
        held = self.store()
        # The shared reading wins: the same scan read twice is not the same
        # text, and replacing a vetted reading buys nothing.
        self.assertEqual(held["readings"]["900"]["from"], "shared")
        self.assertEqual(held["readings"]["901"]["from"], "worker")
        self.assertIn("902", held["refused"])

    def test_a_worker_writes_after_every_document_not_at_the_end(self):
        # A read is minutes of somebody else's machine. Written once at the
        # end, a batch of twenty holds an hour of work that one kill signal
        # throws away — which is how the batch this replaced was lost.
        shard = self.root / "shard.json"
        seen = []

        def reader(pdf):
            seen.append(pdf)
            if len(seen) == 2:
                raise KeyboardInterrupt("killed halfway")
            return form()

        real_reader, real_fetch = structure.read_structure_agy, structure.named.fetch_pdf
        structure.read_structure_agy = reader
        structure.named.fetch_pdf = lambda url, path: path.write_bytes(b"%PDF-") or True
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaises(KeyboardInterrupt):
                    structure.main(["--limit", "5", "--store", str(shard)])
        finally:
            structure.read_structure_agy = real_reader
            structure.named.fetch_pdf = real_fetch
        self.assertEqual(len(self.store(shard).get("readings") or {}), 1,
                         "the first document was lost with the second")


class NamesOnTheForm(unittest.TestCase):
    """Two things these forms print that a name rule has to allow for."""

    def test_a_joint_holding_is_one_party_under_every_name_in_it(self):
        # NARE's register prints seven names against one percentage, 206
        # characters in one field. Refused on length, the whole register goes.
        group = ("هشام محمد مدحت يوسف الفار ، فاطمة الزهراء على السيد على ، "
                 "محمد على السيد على ، على يوسف محمد مدحت يوسف الفار ، "
                 "لى لى يوسف محمد مدحت يوسف الفار ، "
                 "جيزيل يوسف محمد مدحت يوسف الفار ، Regional Investment Holding")
        self.assertGreater(len(group), structure.named.NAME_CEILING)
        self.assertIsNone(structure.vet(form(shareholders=[
            {"nameArabic": group, "percent": 41.0, "shares": None, "kind": "person"}]),
            "NARE", ISSUER))

    def test_the_group_is_not_split_into_a_stake_each(self):
        # The form gives one percentage for the group. Dividing it between the
        # names would state a holding no document prints.
        group = "أحمد محمد على حسن ، فاطمة الزهراء السيد على ، محمد على السيد على " * 3
        kept = structure.owning([{ "nameArabic": group, "percent": 41.0,
                                   "shares": None, "kind": "person"}])
        self.assertEqual(len(kept), 1)
        self.assertEqual(kept[0]["percent"], 41.0)

    def test_a_paragraph_is_still_not_a_name(self):
        # The ceiling was built to catch a sentence captured instead of a name,
        # and that is still what it catches — length alone is not the test.
        prose = "هذا نص طويل جدا يصف حالة الشركة وأعمالها خلال العام الماضي " * 4
        self.assertGreater(len(prose), structure.named.NAME_CEILING)
        why = structure.vet(form(shareholders=[
            {"nameArabic": prose, "percent": 10.0, "shares": None, "kind": "person"}]),
            "AAA", ISSUER)
        self.assertIn("no usable name", why or "")

    def test_a_seat_the_form_does_not_name_keeps_the_register(self):
        # NIPH prints `عضو مجلس الإدارة الممثل عن الشركة القابضة` with the name
        # column blank. Refusing the document over it is the same mistake the
        # zero-percent director once made twelve times over.
        reading = form(board=[])
        reading["board"] = [
            {"nameArabic": "أ/ سامي عبد الرحيم فؤاد", "role": "رئيس", "representing": None},
            {"nameArabic": None, "role": "عضو مجلس الإدارة الممثل عن الشركة القابضة",
             "representing": "الشركة القابضة"}]
        self.assertIsNone(structure.vet(reading, "NIPH", ISSUER))

    def test_a_seat_with_neither_a_name_nor_a_role_is_still_refused(self):
        # That row says nothing at all, which is a reading that went wrong
        # rather than a board with a vacancy on it.
        reading = form()
        reading["board"] = [{"nameArabic": None, "role": None, "representing": None}]
        self.assertIn("no usable name", structure.vet(reading, "AAA", ISSUER) or "")
