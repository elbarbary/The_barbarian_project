#!/usr/bin/env python3
"""One company, one day, one ratio — on News as on everything else.

The news feed rebuilds every fifteen minutes and the market scan three times a
day, so for most of a session the company documents on disk hold a partial day.
The triage used to measure a story once, whenever it first arrived, and keep
that answer: CFGH was triaged against the 12:08 Cairo scan on 2 September
(280,216 shares against a 42,112 median) and still said "6.65× their usual
volume" after the close capture had put it at 427,947 against 70,740 — 6.05×,
which is what market.json, the company screen and Connecting the dots all said.

These tests pin the two rules that resolve it: a ratio is only ever measured on
a capture whose session has closed, and while a session is open the evidence
stays on the last completed one and is dated as that session.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import datetime
import json
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_news_api as news  # noqa: E402
import macro_types  # noqa: E402

# The 2 September session, as the exchange finished it and as the midday scan
# had it. Both pairs are real: they are what the published documents carried at
# `ff7d1226` (14:31 Cairo, after the close) and `df05862d` (12:08, mid session).
CLOSED = {"volume": 427947, "median": 70740}       # 6.05×
MID_SESSION = {"volume": 280216, "median": 42112}  # 6.65×


class EvidenceBasisTest(unittest.TestCase):
    def setUp(self):
        self._dir = tempfile.TemporaryDirectory()
        self.addCleanup(self._dir.cleanup)
        root = pathlib.Path(self._dir.name)

        self._paths = (news.OUT, news.DETAILS, news.MARKET)
        news.OUT = root / "news"
        news.DETAILS = root / "companies"
        news.MARKET = root / "market.json"
        news.OUT.mkdir(parents=True)
        news.DETAILS.mkdir(parents=True)
        self.addCleanup(self._restore)

    def _restore(self):
        news.OUT, news.DETAILS, news.MARKET = self._paths

    # ------------------------------------------------------------- fixtures

    def capture(self, date: str, is_close: bool, at: str = "2026-09-02T14:13:17Z"):
        news.MARKET.write_text(
            json.dumps({"date": date, "captured_at": at, "is_close": is_close}),
            encoding="utf-8",
        )

    def company(self, ticker: str, date: str, volume: int, median: float):
        (news.DETAILS / f"{ticker}.json").write_text(
            json.dumps(
                {
                    "ticker": ticker,
                    "market": {"date": date, "volume": volume},
                    "profile": {"median_volume_20d": median},
                }
            ),
            encoding="utf-8",
        )

    def published(self, doc: dict):
        (news.OUT / "latest.json").write_text(
            json.dumps(doc, ensure_ascii=False), encoding="utf-8"
        )

    def story(self, ident="alborsa-1989954", ticker="CFGH", evidence=None):
        """A headline as the feed stores it, with whatever evidence it was
        written with. `published` is now, so the merge's fortnight window keeps
        it whatever day these tests run."""
        item = {
            "id": ident,
            "headline": "أرباح ​”كونكريت فاشون” تتراجع 13.2% خلال النصف الأول",
            "published": datetime.datetime.now(datetime.UTC)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z"),
            "tickers": [ticker],
            "weight": "check",
            "because": "",
            "evidence": evidence,
        }
        return item

    # ---------------------------------------------------------------- tests

    def test_a_closed_capture_divides_the_company_document(self):
        """The same two figures Connecting the dots divides, so the two feeds
        cannot disagree about one company on one day."""
        self.capture("2026-09-02", is_close=True)
        self.company("CFGH", "2026-09-02", CLOSED["volume"], CLOSED["median"])

        basis = news.evidence_basis()
        block = news.triage({"tickers": ["CFGH"]}, basis)["evidence"]

        self.assertEqual(block["ratio"], 6.05)
        self.assertEqual(block["volume"], CLOSED["volume"])
        self.assertEqual(block["date"], "2026-09-02")

    def test_the_sentence_only_says_that_day_when_it_is_that_day(self):
        """The app shows `because` and nothing else, so a sentence that says
        "that day" over a volume from a different session is a false sentence
        wherever the evidence date is not on screen."""
        self.capture("2026-09-02", is_close=True)
        self.company("CFGH", "2026-09-02", CLOSED["volume"], CLOSED["median"])
        basis = news.evidence_basis()

        same = news.triage(
            {"tickers": ["CFGH"], "published": "2026-09-02T08:30:15Z"}, basis
        )
        older = news.triage(
            {"tickers": ["CFGH"], "published": "2026-08-30T08:30:15Z"}, basis
        )

        self.assertIn("volume that day", same["because"])
        self.assertIn("في ذلك اليوم", same["because_ar"])
        self.assertIn("in the last completed session", older["because"])
        self.assertIn("في آخر جلسة مكتملة", older["because_ar"])
        # Both name the same session in the field the site reads.
        self.assertEqual(older["evidence"]["date"], "2026-09-02")

    def test_a_session_in_progress_is_never_published_as_the_session(self):
        """The defect itself. Mid session the company document holds half a
        day; dividing it by a whole day's median is the 6.65× that shipped."""
        self.capture("2026-09-02", is_close=False, at="2026-09-02T09:08:56Z")
        self.company(
            "CFGH", "2026-09-02", MID_SESSION["volume"], MID_SESSION["median"]
        )
        self.published(
            {
                "evidence_session": {
                    "date": "2026-09-01",
                    "captured_at": "2026-09-01T13:38:30Z",
                },
                "items": [
                    self.story(
                        evidence={
                            "ticker": "CFGH",
                            "volume": 139217,
                            "median_volume_20d": 42112,
                            "ratio": 3.31,
                            "threshold": 2.0,
                            "date": "2026-09-01",
                        }
                    )
                ],
            }
        )

        basis = news.evidence_basis()
        block = news.triage({"tickers": ["CFGH"]}, basis)["evidence"]

        self.assertEqual(block["ratio"], 3.31)
        self.assertEqual(block["volume"], 139217)
        # And it says which day that volume was traded on, which is the field
        # the site prints when it differs from the story's own date.
        self.assertEqual(block["date"], "2026-09-01")
        self.assertEqual(basis.session["date"], "2026-09-01")

    def test_with_no_completed_session_on_file_nothing_is_claimed(self):
        """A document that has never recorded which session it measured cannot
        have its blocks attested, so they are dropped rather than re-published.
        An absent figure is absent; it is not the snapshot lying beside it."""
        self.capture("2026-09-02", is_close=False, at="2026-09-02T09:08:56Z")
        self.company(
            "CFGH", "2026-09-02", MID_SESSION["volume"], MID_SESSION["median"]
        )
        self.published({"items": [self.story()]})

        basis = news.evidence_basis()
        triaged = news.triage({"tickers": ["CFGH"]}, basis)

        self.assertIsNone(basis.session)
        self.assertIsNone(triaged["evidence"])
        self.assertEqual(triaged["weight"], "named")
        # And it does not claim the company has no published figures, which is
        # a different and false statement while a session is running.
        self.assertNotIn("No trading figures are published", triaged["because"])

    def test_a_stored_story_is_re_measured_on_every_merge(self):
        """The frozen block is the bug: the story keeps whatever the scan said
        on the run that first saw it. After the close it must read the close."""
        self.capture("2026-09-02", is_close=True)
        self.company("CFGH", "2026-09-02", CLOSED["volume"], CLOSED["median"])
        stale = {
            "ticker": "CFGH",
            "volume": MID_SESSION["volume"],
            "median_volume_20d": MID_SESSION["median"],
            "ratio": 6.65,
            "threshold": 2.0,
            "date": "2026-09-02",
        }
        self.published({"items": [self.story(evidence=stale)]})

        basis = news.evidence_basis()
        kept = news.merge_with_published([], basis)

        self.assertEqual(len(kept), 1)
        self.assertEqual(kept[0]["evidence"]["ratio"], 6.05)
        self.assertEqual(kept[0]["evidence"]["volume"], CLOSED["volume"])
        self.assertIn("6.05×", kept[0]["because"])

    def test_a_company_left_behind_by_the_scan_is_not_divided(self):
        """A company the scan missed keeps the session it last had. Dividing
        that volume by the capture's median would be two different days in one
        fraction, and nothing on the card would say so."""
        self.capture("2026-09-02", is_close=True)
        self.company("CFGH", "2026-08-31", CLOSED["volume"], CLOSED["median"])

        basis = news.evidence_basis()
        self.assertIsNone(news.session_facts("CFGH", basis))
        self.assertIsNone(news.triage({"tickers": ["CFGH"]}, basis)["evidence"])

    def test_the_document_says_when_it_ran_and_what_it_measured(self):
        self.capture("2026-09-02", is_close=True)
        basis = news.evidence_basis()

        self.assertEqual(
            basis.session,
            {"date": "2026-09-02", "captured_at": "2026-09-02T14:13:17Z"},
        )
        # `build` is the only place the document is assembled; these are the
        # two keys the fifteen-minute cadence made necessary.
        source = pathlib.Path(news.__file__).read_text(encoding="utf-8")
        self.assertIn('"generated_at"', source)
        self.assertIn('"evidence_session": basis.session', source)

    def test_an_unchanged_feed_keeps_the_stamp_it_published(self):
        """Ninety-six runs a day, most of them finding the same headlines. A
        timestamp that moves on its own commits a no-op to main and sends every
        phone to re-download a document it already holds."""
        self.published(
            {"generated_at": "2026-09-02T14:45:00+00:00", "items": [self.story()]}
        )
        same = {"generated_at": "2026-09-03T09:00:00+00:00",
                "items": [self.story()]}
        moved = {"generated_at": "2026-09-03T09:00:00+00:00",
                 "items": [self.story(), self.story(ident="hapi-415579")]}

        self.assertEqual(news.stamped(same), "2026-09-02T14:45:00+00:00")
        self.assertEqual(news.stamped(moved), "2026-09-03T09:00:00+00:00")

    def test_no_triage_sentence_instructs_the_reader(self):
        """§8. The branches are enumerated here because adding one is exactly
        the moment somebody writes "worth buying" into this file."""
        self.capture("2026-09-02", is_close=True)
        self.company("CFGH", "2026-09-02", CLOSED["volume"], CLOSED["median"])
        self.company("EDFM", "2026-09-02", 4157, 3276)
        basis = news.evidence_basis()
        sentences = [
            news.triage({"tickers": [t], "published": published}, basis)
            for t in ("CFGH", "EDFM")
            for published in ("2026-09-02T08:30:15Z", "2026-08-30T08:30:15Z")
        ]

        self.capture("2026-09-02", is_close=True)
        unmeasured = news.triage({"tickers": ["XXXX"]}, news.evidence_basis())

        self.capture("2026-09-02", is_close=False)
        self.published({"items": []})
        no_session = news.triage({"tickers": ["CFGH"]}, news.evidence_basis())
        no_company = news.triage({"tickers": []}, news.evidence_basis())

        for triaged in sentences + [unmeasured, no_session, no_company]:
            for key in ("because", "because_ar"):
                directive = macro_types.directive(triaged[key])
                self.assertIsNone(
                    directive, f"{triaged[key]!r} reads as advice: {directive}"
                )


    def test_with_no_session_it_says_nothing_rather_than_apologising(self):
        """The block adds a measured fact; with no fact there is no block.

        Apologising filled 46 of 400 cards with "We hold no completed
        session's trading figures", displacing the sentences that were there.
        """
        basis = news.Basis(None, {}, {})
        out = news.triage({"tickers": ["COMI"], "headline": "h"}, basis)
        self.assertEqual(out["because"], "")
        self.assertEqual(out["because_ar"], "")
        self.assertIsNone(out["evidence"])

if __name__ == "__main__":
    unittest.main()
