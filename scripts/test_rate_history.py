#!/usr/bin/env python3
"""The series ids have to be the ones the site joins on.

Four of the seven were fetched, verified, published and then joined to
nothing, because the ids here were tidier versions of the document's own —
`NASDAQ` for `NASDAQ_IXIC`. Nothing failed: the file was correct, the site
drew no line, and the only symptom was an absence.
"""

from __future__ import annotations

import json
import pathlib
import sys
import tempfile
import unittest
import unittest.mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_rates_api as bra  # noqa: E402
import rate_history as rh  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent


def rates() -> dict:
    return json.loads((REPO / "public" / "data" / "v1" / "rates" / "latest.json")
                      .read_text(encoding="utf-8"))


def published_ids(doc) -> set:
    """Every id rates/latest.json offers a series to join on.

    The currency rows call it `code`, not `id` — a row for the dollar is
    `{"code": "USD", "label": "US dollar", "egp": 51.34}`. Collecting only
    `id` is the same joins-to-nothing trap this whole file exists for, one
    level up: the five pairs were fetched, verified and published, and this
    guard said they matched no row because it was looking at the wrong key.
    """
    out = {row.get("id") for key in ("indices", "world", "metals")
           for row in doc.get(key) or []}
    out |= {row.get("code") for row in doc.get("currencies") or []}
    out |= {row.get("id") for row in doc.get("egypt") or []}
    return out - {None}


def published_labels(doc) -> dict:
    by = {row.get("id"): row.get("label") for key in ("world", "metals")
          for row in doc.get(key) or []}
    by.update({row.get("code"): row.get("label")
               for row in doc.get("currencies") or []})
    by.update({row.get("id"): row.get("label") for row in doc.get("egypt") or []})
    return by


class IdsTest(unittest.TestCase):
    def test_every_series_id_names_a_row_the_site_publishes(self):
        doc = rates()
        known = published_ids(doc)
        for our_id, _instrument, _where, label in rh.INSTRUMENTS:
            self.assertIn(our_id, known,
                          f"{label}: no row in rates/latest.json is called {our_id}")

    def test_every_series_id_names_the_row_it_claims_to(self):
        doc = rates()
        label_of = published_labels(doc)
        for our_id, _instrument, _where, label in rh.INSTRUMENTS:
            self.assertEqual(label_of.get(our_id), label)

    def test_the_published_history_joins_to_the_published_rates(self):
        path = REPO / "public" / "data" / "v1" / "rates" / "history.json"
        if not path.exists():
            self.skipTest("no history committed yet")
        doc = rates()
        known = published_ids(doc)
        history = json.loads(path.read_text(encoding="utf-8"))
        self.assertTrue(history["series"])
        for series in history["series"]:
            self.assertIn(series["id"], known, f"{series['id']} joins to nothing")
            self.assertGreater(len(series["sessions"]), 30)


class ToleranceTest(unittest.TestCase):
    def test_a_wrong_instrument_is_refused_and_a_right_one_is_not(self):
        # The Tadawul candidates came back at 1,985 and 66,405 against a
        # published 11,238; the real instruments land within a percent.
        rh.ih.series = lambda _id, _since, _until: {"2026-08-28": 1985.03}
        with self.assertRaises(rh.Refused):
            rh.verified(39932, "Tadawul", 11237.93, "2026-08-01")
        rh.ih.series = lambda _id, _since, _until: {"2026-08-28": 4455.15}
        self.assertEqual(rh.verified(68, "Gold", 4456.40, "2026-08-01"),
                         {"2026-08-28": 4455.15})
        # And an empty answer is a refusal, not an empty series.
        rh.ih.series = lambda _id, _since, _until: {}
        with self.assertRaises(rh.Refused):
            rh.verified(40977, "Tadawul", 11237.93, "2026-08-01")


class WindowTest(unittest.TestCase):
    """Whether the published level is FOUND in the series, not whether it is
    the last bar of it.

    It used to be the last bar, which assumed the two sides were never a day
    apart. They are, in both directions — rates/latest.json carries no date for
    its world rows, and its levels are a previous close. Oil was refused on 31
    August at 86.39 against a published 83.40 with both figures right and three
    sessions apart.
    """

    def series(self, closes):
        rh.ih.INSTRUMENTS = {}
        rh.ih.series = lambda *a, **k: closes
        return closes

    def test_a_level_a_few_sessions_back_still_verifies(self):
        self.series({"2026-08-26": 83.40, "2026-08-27": 84.10,
                     "2026-08-28": 85.02, "2026-08-31": 86.39})
        rows = rh.verified(8849, "Oil", 83.40, "2026-08-01")
        self.assertEqual(len(rows), 4)

    def test_the_wrong_instrument_still_misses_every_session(self):
        # Tadawul's plausible candidates came back at 1,985 and 66,405 against
        # a published 11,238. A window five wide does not rescue those.
        self.series({f"2026-08-{d:02d}": 1985.0 + d for d in range(20, 32)})
        with self.assertRaises(rh.Refused) as caught:
            rh.verified(39932, "Tadawul", 11237.93, "2026-08-01")
        self.assertIn("nearest", str(caught.exception))

    def test_a_match_outside_the_window_does_not_count(self):
        # Far enough back and it is not evidence about this instrument any
        # more, it is a coincidence with an old price.
        closes = {f"2026-08-{d:02d}": 400.0 for d in range(1, 26)}
        closes["2026-08-10"] = 83.40
        closes.update({f"2026-08-{d:02d}": 400.0 for d in range(26, 32)})
        self.series(closes)
        with self.assertRaises(rh.Refused):
            rh.verified(8849, "Oil", 83.40, "2026-08-01")

    def test_an_empty_series_is_refused(self):
        self.series({})
        with self.assertRaises(rh.Refused):
            rh.verified(8849, "Oil", 83.40, "2026-08-01")


class EgyptsOwnRateTest(unittest.TestCase):
    """The row this file said for a long time it could not have.

    It could not while nothing published an Egyptian level to check a series
    against. `harvest_cbe.py` had been taking the central bank's own daily
    interbank page the whole time, and that is a genuinely different source
    from the histories here — which is the entire point of the check.

    These drive the reader against a made-up page rather than reading the
    published file, because a test that only reads the output cannot fail
    until something rebuilds it. The conversion was mutated to publish the
    fraction and every output-reading assertion still passed.
    """

    CORRIDOR = {"effectiveFrom": "2026-02-15",
                "rates": {"overnightDeposit": 0.19, "overnightLending": 0.20,
                          "mainOperation": 0.195, "discount": 0.195}}

    def build(self, interbank, policy=None) -> list[dict]:
        document = {"interbank": interbank,
                    "policyRates": self.CORRIDOR if policy is None else policy}
        with tempfile.TemporaryDirectory() as folder:
            page = pathlib.Path(folder) / "cbe-context.json"
            page.write_text(json.dumps(document), encoding="utf-8")
            with unittest.mock.patch.object(bra, "CBE_CONTEXT", page):
                return bra.egypt()

    def market(self, interbank, policy=None) -> list[dict]:
        """Only the interbank row — the four set rates come first."""
        return [row for row in self.build(interbank, policy)
                if row["kind"] == "market"]

    def month(self, observations, year=2026) -> dict:
        return {"year": year,
                "rates": [{"tenor": "Overnight", "observations": observations}]}

    def test_a_rate_is_a_percent_and_not_a_fraction(self):
        # The CBE publishes 0.19433 and means 19.433%. Published as the
        # fraction it would be checked against a series quoting percent and
        # refused for being a hundred times out — or worse, matched against
        # some other instrument that happens to sit near 0.19.
        row, = self.market(self.month([{"date": "10/09", "value": 0.19433}]))
        self.assertAlmostEqual(row["percent"], 19.433, places=3)
        self.assertEqual(row["token"], "19.433%")

    def test_the_day_read_is_the_newest_the_bank_has_reached(self):
        rows = self.market(self.month([{"date": "08/09", "value": 0.19100},
                                      {"date": "09/09", "value": 0.19250},
                                      {"date": "10/09", "value": 0.19433}]))
        self.assertEqual(rows[0]["as_of"], "2026-09-10")
        # The source names the central bank, not the vendor the history comes
        # from. `verified()` checks the series against this level; if both
        # sides cited Investing.com it would be checking a number against
        # itself and passing every time.
        self.assertEqual(rows[0]["source"], "cbe.org.eg daily interbank rates, 2026-09-10")

    def test_a_day_the_bank_has_not_reached_is_not_a_zero(self):
        # The page prints the whole month and leaves the rest of it empty.
        # Reading the last cell rather than the last *value* publishes 0%,
        # which is a number a reader would believe.
        rows = self.market(self.month([{"date": "10/09", "value": 0.19433},
                                       {"date": "11/09", "value": None},
                                       {"date": "12/09", "value": None}]))
        self.assertEqual(rows[0]["as_of"], "2026-09-10")
        self.assertAlmostEqual(rows[0]["percent"], 19.433, places=3)

    def test_nothing_is_published_when_the_page_says_nothing(self):
        self.assertEqual(self.market(self.month([])), [])
        self.assertEqual(self.market({"year": 2026, "rates": []}), [])
        self.assertEqual(self.market(self.month([{"date": "10/09", "value": 0.19}],
                                                year=None)), [])

    def test_the_level_the_series_is_checked_against_is_the_bank_s_own(self):
        # One source asserting a number is not evidence; two agreeing is the
        # whole test. If this row ever cited the same vendor the history comes
        # from, `verified()` would be checking a number against itself.
        levels = rh.published()
        self.assertIn("Overnight interbank", levels)
        row = next(r for r in rates().get("egypt") or [] if r["id"] == "EGY_ON")
        self.assertAlmostEqual(levels["Overnight interbank"], row["percent"], places=3)
        self.assertIn("cbe.org.eg", str(row.get("source")))
        self.assertNotIn("investing", str(row.get("source")).lower())

    def test_the_corridor_the_committee_set_is_published_first(self):
        # The order is the argument. Somebody asking what the interest rate in
        # Egypt is means one of these four, and meets them before the daily
        # number that moves between them.
        rows = self.build(self.month([{"date": "10/09", "value": 0.19433}]))
        self.assertEqual([row["id"] for row in rows],
                         ["EGY_DEPOSIT", "EGY_LENDING", "EGY_MAIN",
                          "EGY_DISCOUNT", "EGY_ON"])
        floor, ceiling = rows[0], rows[1]
        self.assertAlmostEqual(floor["percent"], 19.00, places=2)
        self.assertAlmostEqual(ceiling["percent"], 20.00, places=2)
        # Dated by the decision, not by the day this ran. A rate set in
        # February is seven months old and still current.
        self.assertEqual(floor["as_of"], "2026-02-15")

    def test_a_rate_outside_the_corridor_is_refused(self):
        # The corridor binds by construction: no bank lends below what the
        # central bank pays it, none pays more than the central bank charges.
        # A reading outside is a parse, not a market — a slipped decimal, the
        # volume table read as the rate table, the wrong tenor row.
        for impossible in (1.9433, 0.019433, 123.45):
            rows = self.market(self.month([{"date": "10/09", "value": impossible}]))
            self.assertEqual(rows, [], f"{impossible} was published")

    def test_a_rate_inside_the_corridor_is_not_refused(self):
        for real in (0.19, 0.195, 0.19433, 0.20):
            rows = self.market(self.month([{"date": "10/09", "value": real}]))
            self.assertEqual(len(rows), 1, f"{real} was refused")

    def test_the_check_is_not_so_tight_it_refuses_a_real_day(self):
        # A percentage point of slack on each side. The point is to catch a
        # parse, not to police a market that can sit at the edge of its walls.
        self.assertEqual(len(self.market(self.month(
            [{"date": "10/09", "value": 0.1950}]))), 1)
        self.assertEqual(len(self.market(self.month(
            [{"date": "10/09", "value": 0.2090}]))), 1)

    def test_a_rate_with_no_effective_date_is_not_published(self):
        # The danger is not a page that failed entirely — that one is obvious.
        # It is a page whose four cards still read but whose date line the CBE
        # reworded, which would publish four undated rates that look exactly
        # like current ones and could be a year old. The corridor goes, the
        # check goes with it, and the interbank rate — which carries its own
        # date — still publishes.
        rows = self.build(self.month([{"date": "10/09", "value": 0.19433}]),
                          policy={"effectiveFrom": None,
                                  "rates": dict(self.CORRIDOR["rates"])})
        self.assertEqual([row["id"] for row in rows], ["EGY_ON"])

    def test_an_unreadable_corridor_publishes_nothing_rather_than_last_month(self):
        # These change only when the MPC decides, so there is no such thing as
        # a stale-but-fine policy rate: a page that did not parse is a page
        # that did not parse.
        rows = self.build(self.month([{"date": "10/09", "value": 0.19433}]),
                          policy={"effectiveFrom": None, "rates": {}})
        self.assertEqual([row["id"] for row in rows], ["EGY_ON"])

    def test_the_interbank_rate_still_publishes_without_a_corridor(self):
        # It is the CBE's own figure either way. Losing the check is a reason
        # to stop checking, not a reason to stop publishing.
        rows = self.market(self.month([{"date": "10/09", "value": 0.19433}]),
                           policy={"effectiveFrom": None, "rates": {}})
        self.assertEqual(len(rows), 1)
        self.assertNotIn("corridor", rows[0]["yardstick"])

    def test_the_reader_is_told_where_the_walls_are(self):
        row, = self.market(self.month([{"date": "10/09", "value": 0.19433}]))
        self.assertIn("19.00% to 20.00%", row["yardstick"])


if __name__ == "__main__":
    unittest.main()
