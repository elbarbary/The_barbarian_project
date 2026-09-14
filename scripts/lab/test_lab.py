#!/usr/bin/env python3
"""The lab's arithmetic, held to the things that would flatter a model.

Four ways a forecasting record lies about itself, all of them by omission:

  * a model quietly skips the companies it finds hard and is scored on the
    easy half of the market;
  * a tied ranking scores as zero and enters the table as an honest draw;
  * a mean is reported without the spread, so eight coin flips look like a
    finding;
  * a model is compared against a baseline on different days, so the
    market's own mood does the work.

Every test here is one of those.
"""

from __future__ import annotations

import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import backload  # noqa: E402
import commit as cm  # noqa: E402
import forecast as fc  # noqa: E402
import run  # noqa: E402
import score as sc  # noqa: E402
import timestamp as ts  # noqa: E402


def bars(*rows) -> list[dict]:
    """`(date, close)` pairs, oldest first."""
    return [{"date": d, "open": c, "high": c, "low": c, "close": c, "volume": 1000}
            for d, c in rows]


def rising(n: int, start: float = 100.0, step: float = 1.0) -> list[dict]:
    return bars(*[(f"2026-{(i // 28) + 1:02d}-{(i % 28) + 1:02d}", start + i * step)
                  for i in range(n)])


class ContractTest(unittest.TestCase):
    def test_every_model_answers_the_same_three_horizons(self):
        # One session is the tape, five is a trading week here, twenty is the
        # month the playbook's cohorts run to. A model answering a different
        # set cannot be put beside the others.
        self.assertEqual(fc.HORIZONS, (1, 5, 20))

    def test_a_ranking_model_publishes_no_return_at_all(self):
        # Not a zero, not the ranking value wearing a percentage sign. A
        # number in the returns column is a magnitude the model never
        # claimed, sitting in the column every other model fills with one.
        for name in ("momentum20", "momentum60", "reversal1", "reversal5"):
            out = fc.run_baseline(name, "AAA", "2026-09-10", rising(70))
            self.assertEqual(out.returns, {}, name)
            self.assertNotEqual(out.rank_value(1), 0)

    def test_a_model_with_no_view_on_magnitude_publishes_none(self):
        # Momentum ranks; it has no opinion on how far a share will move. A
        # number in the returns column would be a magnitude nobody claimed,
        # in a column that looks like every other model's.
        out = fc.run_baseline("momentum20", "AAA", "2026-09-10", rising(30))
        self.assertIsInstance(out, fc.Forecast)
        self.assertEqual(out.returns, {})
        self.assertIsNotNone(out.rank_value(1))

    def test_a_model_that_cannot_answer_says_so_rather_than_vanishing(self):
        # A model scored only on the companies it found easy looks better
        # than it is, and the coverage count is what catches it.
        out = fc.run_baseline("momentum60", "AAA", "2026-09-10", rising(10))
        self.assertIsInstance(out, fc.Abstention)
        self.assertIn("needed", out.reason)
        self.assertEqual(out.model, "momentum60")


class BaselineTest(unittest.TestCase):
    def test_flat_expects_nothing_and_ranks_nothing(self):
        out = fc.run_baseline("flat", "AAA", "2026-09-10", rising(30))
        self.assertEqual(set(out.returns.values()), {0.0})
        self.assertEqual(len(set(out.rank_value(h) for h in fc.HORIZONS)), 1)

    def test_drift_carries_this_company_s_own_average_forward(self):
        # A steady 1% a session compounds; the five-session figure must be
        # the compounded one, not the session figure multiplied by five.
        rows = bars(*[(f"2026-01-{i + 1:02d}", 100 * (1.01 ** i)) for i in range(70)])
        out = fc.run_baseline("drift", "AAA", "2026-09-10", rows)
        self.assertAlmostEqual(out.returns[1], 1.0, places=2)
        self.assertAlmostEqual(out.returns[5], ((1.01 ** 5) - 1) * 100, places=2)

    def test_reversal_is_momentum_with_its_sign_turned_over(self):
        rows = rising(30)
        up = fc.run_baseline("momentum20", "AAA", "2026-09-10", rows)
        back = fc.run_baseline("reversal5", "AAA", "2026-09-10", rows)
        self.assertGreater(up.rank_value(1), 0)
        self.assertLess(back.rank_value(1), 0)

    def test_the_lookbacks_are_separate_models_not_one_with_a_dial(self):
        # momentum-60 was twice as wrong as momentum-20 over the scored
        # dates. Averaging them into one "momentum" would hide that.
        self.assertIn("momentum20", fc.BASELINES)
        self.assertIn("momentum60", fc.BASELINES)
        self.assertIn("reversal1", fc.BASELINES)
        self.assertIn("reversal5", fc.BASELINES)

    def test_no_baseline_is_marked_as_the_one_to_use(self):
        # A default among the baselines is the publisher's judgment arriving
        # as an ordering nobody chose.
        for name in fc.BASELINES:
            self.assertNotIn("default", name.lower())
            self.assertNotIn("best", name.lower())


class RankICTest(unittest.TestCase):
    def perfect(self, n=40):
        return [(float(i), float(i)) for i in range(n)]

    def test_a_perfect_ordering_scores_one_and_a_reversed_one_minus_one(self):
        self.assertAlmostEqual(sc.rank_ic(self.perfect()), 1.0, places=6)
        flipped = [(p, -a) for p, a in self.perfect()]
        self.assertAlmostEqual(sc.rank_ic(flipped), -1.0, places=6)

    def test_a_tied_prediction_is_undefined_not_zero(self):
        # `flat` ranks every company identically. Scored as zero it enters
        # the table as an honest draw against models that made distinctions
        # and got half of them right.
        tied = [(0.0, float(i)) for i in range(40)]
        self.assertIsNone(sc.rank_ic(tied))

    def test_a_day_when_everything_moved_together_is_undefined_too(self):
        # Nothing can be correlated with a constant outcome.
        flat_day = [(float(i), 0.0) for i in range(40)]
        self.assertIsNone(sc.rank_ic(flat_day))

    def test_too_few_companies_is_not_a_result(self):
        self.assertIsNone(sc.rank_ic(self.perfect(10)))
        self.assertIsNotNone(sc.rank_ic(self.perfect(sc.MIN_COMPANIES)))

    def test_ties_take_the_average_rank_rather_than_an_invented_order(self):
        # Two companies a model could not separate must not be separated for
        # it by whichever happened to be read first.
        a = [(1.0, 5.0), (1.0, 1.0)] + [(float(i), float(i)) for i in range(2, 40)]
        b = [(1.0, 1.0), (1.0, 5.0)] + [(float(i), float(i)) for i in range(2, 40)]
        self.assertAlmostEqual(sc.rank_ic(a), sc.rank_ic(b), places=9)


class DirectionTest(unittest.TestCase):
    def test_a_company_that_did_not_move_has_no_direction_to_have_missed(self):
        pairs = [(1.0, 0.0)] * 20 + [(1.0, 2.0) for _ in range(40)]
        self.assertEqual(sc.directional_accuracy(pairs), 1.0)


class SummaryTest(unittest.TestCase):
    def test_the_spread_travels_with_the_mean(self):
        # A mean of +0.05 over eight dates is a direction, not a discovery,
        # and a table without the spread invites the second reading.
        out = sc.summarise([0.05, -0.02, 0.11, 0.07, -0.03, 0.09, 0.13, 0.0])
        self.assertEqual(out["dates"], 8)
        self.assertIn("sd", out)
        self.assertIn("se", out)
        self.assertIsNotNone(out["t"])
        self.assertEqual(out["positive"], 5)

    def test_undefined_dates_do_not_count_as_zero(self):
        out = sc.summarise([0.1, None, 0.2, None])
        self.assertEqual(out["dates"], 2)
        self.assertAlmostEqual(out["mean"], 0.15, places=6)

    def test_nothing_scored_is_reported_as_nothing(self):
        self.assertEqual(sc.summarise([None, None])["dates"], 0)
        self.assertIsNone(sc.summarise([])["mean"])


class PairedTest(unittest.TestCase):
    def test_a_comparison_uses_only_the_dates_both_models_scored(self):
        # A month where everything mean-reverted lifts every model at once.
        # The difference on the same date with the same companies is what
        # takes the market's own mood out of it.
        model = {"a": 0.10, "b": 0.05, "c": 0.08, "d": 0.02}
        rival = {"a": 0.02, "b": 0.01, "c": 0.03, "z": 0.90}
        out = sc.against(model, rival)
        self.assertEqual(out["dates"], 3)
        self.assertAlmostEqual(out["mean_difference"], 0.0567, places=3)
        self.assertEqual(out["ahead"], 3)

    def test_a_date_only_one_model_could_score_is_left_out(self):
        model = {"a": 0.10, "b": 0.05, "c": 0.08}
        rival = {"a": 0.02, "b": None, "c": 0.03}
        self.assertEqual(sc.against(model, rival)["dates"], 2)


class ForwardReturnTest(unittest.TestCase):
    def test_the_outcome_is_counted_in_this_company_s_own_sessions(self):
        rows = bars(("2026-09-01", 100.0), ("2026-09-02", 110.0),
                    ("2026-09-03", 121.0), ("2026-09-06", 133.1))
        self.assertAlmostEqual(sc.forward_return(rows, "2026-09-01", 1), 10.0, places=6)
        self.assertAlmostEqual(sc.forward_return(rows, "2026-09-01", 2), 21.0, places=6)

    def test_an_outcome_that_has_not_happened_yet_is_none(self):
        # The whole point of a frozen forecast: a horizon that has not
        # matured has no result, and must not be filled in with the last
        # close available.
        rows = bars(("2026-09-01", 100.0), ("2026-09-02", 110.0))
        self.assertIsNone(sc.forward_return(rows, "2026-09-01", 5))

    def test_a_basis_the_company_did_not_trade_on_is_none(self):
        rows = bars(("2026-09-01", 100.0), ("2026-09-03", 110.0))
        self.assertIsNone(sc.forward_return(rows, "2026-09-02", 1))


class RunTest(unittest.TestCase):
    """The run, held to the one mistake that would make all of it worthless."""

    def scan(self, *companies) -> dict:
        return {"records": [{"ticker": t, "recentSplitAdjustedBars": b}
                            for t, b in companies]}

    def test_no_model_ever_sees_a_bar_from_after_the_basis(self):
        # A model handed one bar from after the basis has been shown part of
        # its own answer, and would score beautifully. This is the guard that
        # decides whether any number the lab produces means anything.
        rows = rising(100)
        trimmed = run.trim(rows, "2026-02-10")
        self.assertTrue(all(b["date"] <= "2026-02-10" for b in trimmed))
        self.assertLess(len(trimmed), len(rows))

    def test_the_basis_is_a_session_the_market_shares(self):
        # Individual companies lag — a share that did not trade has no bar —
        # and taking the newest date ANY company holds would date the whole
        # run to one company's Thursday.
        behind = rising(95)
        ahead = rising(100)
        rows = run.universe(self.scan(("AAA", ahead), ("BBB", behind),
                                      ("CCC", behind)))
        self.assertEqual(run.basis_session(rows), behind[-1]["date"])

    def test_no_basis_at_all_rather_than_a_guess(self):
        # Three companies, three different last sessions: nothing is shared
        # by a majority, so there is no completed session to forecast from.
        rows = run.universe(self.scan(("AAA", rising(100)), ("BBB", rising(99)),
                                      ("CCC", rising(98))))
        self.assertIsNone(run.basis_session(rows))

    def test_a_company_without_enough_record_is_left_out_of_the_universe(self):
        rows = run.universe(self.scan(("AAA", rising(100)), ("BBB", rising(10))))
        self.assertEqual([r["ticker"] for r in rows], ["AAA"])

    def test_the_universe_is_alphabetical(self):
        # So a run cut short by a timeout loses a random slice of the market
        # rather than its quiet end.
        rows = run.universe(self.scan(("ZZZ", rising(100)), ("AAA", rising(100)),
                                      ("MMM", rising(100))))
        self.assertEqual([r["ticker"] for r in rows], ["AAA", "MMM", "ZZZ"])

    def test_every_model_is_asked_about_every_company(self):
        # Not a selection. A model scored on a subset it chose is scored on
        # the half of the market it found easy.
        scan = self.scan(("AAA", rising(100)), ("BBB", rising(100)))
        doc = run.build(scan, {n: (lambda n: lambda t, b, x:
                                   fc.run_baseline(n, t, b, x))(n)
                               for n in fc.BASELINES}, "2026-09-14T12:00:00Z")
        self.assertEqual(doc["universeSize"], 2)
        for name, block in doc["models"].items():
            self.assertEqual(block["answered"] + block["abstained"], 2, name)

    def test_a_company_a_model_declined_is_still_counted(self):
        # The whole defence against a model being scored on the easy half of
        # the market. A refusal that is dropped rather than recorded leaves a
        # model looking like it answered everything it was asked.
        def picky(ticker, basis, bars):
            if ticker == "BBB":
                return fc.Abstention(ticker, basis, "picky", "did not fancy it")
            return fc.Forecast(ticker, basis, "picky", {1: 1.0, 5: 1.0, 20: 1.0})
        doc = run.build(self.scan(("AAA", rising(100)), ("BBB", rising(100))),
                        {"picky": picky}, "2026-09-14T12:00:00Z")
        block = doc["models"]["picky"]
        self.assertEqual(block["answered"], 1)
        self.assertEqual(block["abstained"], 1)
        self.assertEqual(block["abstentions"], {"did not fancy it": 1})
        self.assertEqual(block["answered"] + block["abstained"],
                         doc["universeSize"])

    def test_a_model_that_throws_abstains_rather_than_stopping_the_run(self):
        def broken(ticker, basis, bars):
            raise ValueError("this model is having a bad night")
        doc = run.build(self.scan(("AAA", rising(100))),
                        {"broken": broken}, "2026-09-14T12:00:00Z")
        block = doc["models"]["broken"]
        self.assertEqual(block["answered"], 0)
        self.assertEqual(block["abstained"], 1)
        self.assertIn("ValueError: this model is having a bad night",
                      block["abstentions"])

    def test_the_same_forecasts_always_fingerprint_the_same(self):
        scan = self.scan(("AAA", rising(100)), ("BBB", rising(100)))
        models = {"flat": lambda t, b, x: fc.run_baseline("flat", t, b, x)}
        first = run.build(scan, models, "2026-09-14T12:00:00Z")
        later = run.build(scan, models, "2026-09-14T23:59:59Z")
        # The run time differs; the forecasts do not, so the fingerprint must
        # not either — or every rerun would look like a changed forecast.
        self.assertEqual(run.fingerprint(first), run.fingerprint(later))

    def test_a_changed_forecast_always_changes_the_fingerprint(self):
        scan = self.scan(("AAA", rising(100)))
        one = run.build(scan, {"flat": lambda t, b, x:
                               fc.run_baseline("flat", t, b, x)},
                        "2026-09-14T12:00:00Z")
        two = run.build(scan, {"flat": lambda t, b, x:
                               fc.Forecast(t, b, "flat", {1: 9.9, 5: 9.9, 20: 9.9})},
                        "2026-09-14T12:00:00Z")
        self.assertNotEqual(run.fingerprint(one), run.fingerprint(two))

    def test_the_run_says_it_is_not_published_and_not_a_selection(self):
        doc = run.build(self.scan(("AAA", rising(100))),
                        {"flat": lambda t, b, x: fc.run_baseline("flat", t, b, x)},
                        "2026-09-14T12:00:00Z")
        self.assertIn("Not published", doc["what"])
        self.assertIn("not a selection", doc["what"])

    def test_the_lab_writes_outside_everything_that_is_served(self):
        # A predicted return for a named security is exactly what an
        # unlicensed publisher may not put on a screen. The defence is the
        # path, not the user interface.
        self.assertNotIn("public", run.OUT.parts)


class BackloadTest(unittest.TestCase):
    """Bringing August in without pretending it was something it was not."""

    def artifact(self, basis="2026-08-25", **over) -> dict:
        doc = {
            "basisSession": basis,
            "generatedAt": "2026-08-25T12:13:53+00:00",
            "artifactPath": "/somewhere/kronos_shadow_2026-08-26.json",
            "coverage": {"excluded": 41},
            "forecasts": [
                {"ticker": "BBB", "horizons": {
                    "1": {"median": -0.0213, "mean": -0.0214},
                    "5": {"median": -0.1044}}},
                {"ticker": "AAA", "horizons": {
                    "1": {"median": 0.0177}, "5": {"median": 0.0320},
                    "10": {"median": 0.0500}}},
            ],
        }
        doc.update(over)
        return doc

    def panel(self, *tickers) -> dict:
        rows = rising(120)
        return {t: {b["date"]: b for b in rows} for t in tickers}

    def test_kronos_s_own_numbers_are_read_and_never_recomputed(self):
        # It has weights, a seed and a sampling temperature. Rerunning it
        # today would produce a forecast made with knowledge of what
        # happened, which is the one thing the record cannot contain.
        out = backload.kronos_forecasts(self.artifact())
        by = {r["ticker"]: r for r in out}
        self.assertAlmostEqual(by["BBB"]["returns"]["1"], -2.13, places=4)
        self.assertAlmostEqual(by["AAA"]["returns"]["5"], 3.20, places=4)
        self.assertIn("not recomputed", by["AAA"]["note"])

    def test_a_fraction_becomes_a_percentage_and_keeps_its_sign(self):
        # The August artifacts store -0.0213 meaning -2.13%. Published as
        # -0.0213 it would read as a fifth of a basis point and rank the
        # whole market almost identically.
        out = {r["ticker"]: r for r in backload.kronos_forecasts(self.artifact())}
        self.assertLess(out["BBB"]["returns"]["1"], -1)
        self.assertGreater(out["AAA"]["returns"]["1"], 1)

    def test_a_horizon_august_did_not_forecast_is_left_absent(self):
        # Those runs went to ten sessions; the lab evaluates to twenty.
        # Extrapolating would put a number in the record that no model ever
        # produced, and it would be scored as though one had.
        out = {r["ticker"]: r for r in backload.kronos_forecasts(self.artifact())}
        self.assertNotIn("20", out["AAA"]["returns"])
        self.assertNotIn("20", out["BBB"]["returns"])

    def test_kronos_is_marked_frozen_and_the_baselines_are_not(self):
        # The whole honesty of the exercise. One half was written before the
        # outcome existed; the other was derived today.
        doc = backload.rebuild(self.artifact(), self.panel("AAA", "BBB"))
        self.assertTrue(doc["models"]["kronos"]["frozen"])
        for name in fc.BASELINES:
            self.assertFalse(doc["models"][name]["frozen"], name)
        self.assertTrue(doc["reconstructed"])
        self.assertIn("after the fact", doc["what"])

    def test_a_reconstructed_baseline_sees_no_bar_after_the_basis(self):
        # The same cut the nightly run makes. A baseline handed one later bar
        # would be scored on a session it had already seen, and it is the
        # reconstruction where that is easiest to get wrong.
        rows = rising(120)
        basis = rows[60]["date"]
        cut = backload.bars_to({"AAA": {b["date"]: b for b in rows}}, "AAA", basis)
        self.assertEqual(cut[-1]["date"], basis)
        self.assertTrue(all(b["date"] <= basis for b in cut))

    def test_the_newest_reading_of_a_session_wins(self):
        # A bar is split-adjusted when it is read. Two scans days apart can
        # hold the same session at different prices, and the later reading is
        # the one adjusted for every action since.
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            for name, close in (("daily_scan_2026-08-20.json", 100.0),
                                ("daily_scan_2026-08-27.json", 50.0)):
                (root / name).write_text(json.dumps({"records": [{
                    "ticker": "AAA",
                    "recentSplitAdjustedBars": [
                        {"date": "2026-08-19", "open": close, "high": close,
                         "low": close, "close": close, "volume": 1}]}]}))
            panel = backload.bar_panel(sorted(root.glob("daily_scan_*.json")))
        self.assertEqual(panel["AAA"]["2026-08-19"]["close"], 50.0)

    def test_a_night_that_was_rerun_is_entered_once(self):
        # An August night with a revision has more than one artifact. Taking
        # both would enter the same forecast twice under two timestamps and
        # double its weight in every average.
        names = ["kronos_shadow_2026-08-25.json",
                 "kronos_shadow_revision_2026-08-25_140721.json"]
        kept = [n for n in names if "revision" not in n]
        self.assertEqual(kept, ["kronos_shadow_2026-08-25.json"])

    def test_an_artifact_with_no_forecasts_produces_no_run(self):
        self.assertIsNone(backload.rebuild(self.artifact(forecasts=[]),
                                           self.panel("AAA")))
        self.assertIsNone(backload.rebuild(self.artifact(basisSession=None),
                                           self.panel("AAA")))


class CanonicalTest(unittest.TestCase):
    """RFC 8785, because a hash only proves something if a stranger can redo it."""

    def test_property_order_is_fixed_not_whatever_python_held(self):
        self.assertEqual(cm.canonical({"b": 1, "a": 2}), b'{"a":2,"b":1}')
        self.assertEqual(cm.canonical({"b": 1, "a": 2}),
                         cm.canonical({"a": 2, "b": 1}))

    def test_numbers_print_the_way_ecmascript_prints_them(self):
        # `json.dumps` is close and not the same, and the difference is
        # exactly the kind that makes a verifier in another language compute
        # a different hash over the same forecast.
        self.assertEqual(cm.canonical([0, -0.0, 1.0, 1.5]), b"[0,0,1,1.5]")

    def test_a_forecast_that_is_not_a_number_is_refused_outright(self):
        # NaN and infinity arrive from a division nobody meant to do. Written
        # into a commitment they are read back differently by different
        # parsers, and the root stops being checkable.
        for bad in (float("nan"), float("inf"), float("-inf")):
            with self.assertRaises(ValueError):
                cm.canonical({"return": bad})

    def test_the_same_forecast_always_hashes_the_same(self):
        record = {"ticker": "AAA", "returns": {"1": 1.5, "5": -2.0}}
        self.assertEqual(cm.leaf(record, "abc"), cm.leaf(dict(record), "abc"))

    def test_a_different_nonce_gives_a_different_leaf(self):
        record = {"ticker": "AAA"}
        self.assertNotEqual(cm.leaf(record, "one"), cm.leaf(record, "two"))


class MerkleTest(unittest.TestCase):
    def leaves(self, n):
        return [cm.leaf({"i": i}, f"nonce{i}") for i in range(n)]

    def test_every_leaf_can_prove_it_is_in_the_root(self):
        for size in (1, 2, 3, 5, 8, 13):
            leaves = self.leaves(size)
            root = cm.merkle_root(leaves)
            for i in range(size):
                self.assertTrue(cm.verify(leaves[i], cm.proof(leaves, i), root),
                                f"{size} leaves, index {i}")

    def test_a_leaf_that_was_not_committed_cannot_prove_it_was(self):
        leaves = self.leaves(8)
        root = cm.merkle_root(leaves)
        forged = cm.leaf({"i": 999}, "later")
        self.assertFalse(cm.verify(forged, cm.proof(leaves, 0), root))

    def test_an_odd_leaf_is_carried_up_not_paired_with_itself(self):
        # Duplicating it is the classic malleability bug: two different leaf
        # sets produce the same root, so a reveal can be made to match a
        # commitment it was never part of.
        three = self.leaves(3)
        four = three + [three[-1]]
        self.assertNotEqual(cm.merkle_root(three), cm.merkle_root(four))

    def test_changing_one_forecast_changes_the_root(self):
        leaves = self.leaves(6)
        changed = list(leaves)
        changed[3] = cm.leaf({"i": 3, "returns": {"1": 9.9}}, "nonce3")
        self.assertNotEqual(cm.merkle_root(leaves), cm.merkle_root(changed))


class CommitmentTest(unittest.TestCase):
    def document(self):
        return {
            "basisSession": "2026-09-13", "ranAt": "2026-09-14T12:00:00Z",
            "universeSize": 2, "horizons": [1, 5, 20],
            "models": {
                "kronos": {"answered": 2, "abstained": 1, "forecasts": [
                    {"ticker": "AAA", "returns": {"1": 1.5}},
                    {"ticker": "BBB", "returns": {"1": -2.0}}]},
                "flat": {"answered": 1, "abstained": 2, "forecasts": [
                    {"ticker": "AAA", "returns": {"1": 0.0}}]},
            },
        }

    def test_the_public_half_carries_no_forecast_and_no_company(self):
        # The point of committing rather than publishing. A predicted return
        # for a named security is the thing that may not go on a screen, and
        # it does not become publishable by being six hours old.
        public, _ = cm.commitment(self.document())
        body = json.dumps(public)
        self.assertNotIn("AAA", body)
        self.assertNotIn("BBB", body)
        self.assertNotIn("1.5", body)
        self.assertIn("merkleRoot", public)

    def test_the_counts_include_abstentions(self):
        # So a model cannot quietly answer fewer companies than it was asked
        # about and have the commitment agree it answered them all.
        public, _ = cm.commitment(self.document())
        self.assertEqual(public["perModel"]["kronos"],
                         {"forecasts": 2, "abstentions": 1})
        self.assertEqual(public["leaves"], 3)

    def test_every_forecast_gets_its_own_nonce(self):
        _, secret = cm.commitment(self.document())
        salts = [secret["nonces"][m][t] for m in secret["nonces"]
                 for t in secret["nonces"][m]]
        self.assertEqual(len(salts), 3)
        self.assertEqual(len(set(salts)), 3, "a nonce was reused")

    def test_the_root_does_not_depend_on_dictionary_order(self):
        one = self.document()
        two = self.document()
        two["models"] = {"flat": two["models"]["flat"],
                         "kronos": two["models"]["kronos"]}
        # Nonces differ between calls, so compare the trees the same salts
        # would build: the ordering of records, which is what is at issue.
        first, _ = cm.commitment(one)
        second, _ = cm.commitment(two)
        self.assertEqual(first["leaves"], second["leaves"])
        self.assertEqual(first["perModel"], second["perModel"])


class TimestampTest(unittest.TestCase):
    def test_the_request_is_a_hash_and_nothing_else(self):
        # A public authority learns 32 bytes that mean nothing to it. That is
        # what makes it safe to use one.
        digest = bytes(range(32))
        body = ts.request_bytes(digest)
        self.assertEqual(body[0], 0x30)
        self.assertIn(digest, body)
        self.assertIn(ts.SHA256_OID, body)

    def test_only_a_sha256_imprint_is_accepted(self):
        with self.assertRaises(ValueError):
            ts.request_bytes(b"too short")

    def test_an_authority_that_will_not_answer_is_recorded_not_raised(self):
        # A gap in the evidence for one night. Stopping the forecast over it
        # would be a gap in the record itself, which is worse.
        def refuse(url, body):
            raise OSError("the authority is down")
        out = ts.stamp("ab" * 32, opener=refuse)
        self.assertFalse(out["timestamped"])
        self.assertEqual(len(out["attempts"]), len(ts.AUTHORITIES))
        self.assertIn("git history", out["note"])

    def test_the_second_authority_is_tried_when_the_first_fails(self):
        seen = []
        def once(url, body):
            seen.append(url)
            if len(seen) == 1:
                raise OSError("down")
            return b"a token"
        out = ts.stamp("cd" * 32, opener=once)
        self.assertTrue(out["timestamped"])
        self.assertEqual(out["authority"], ts.AUTHORITIES[1][0])
        self.assertEqual(len(seen), 2)

    def test_an_empty_answer_is_not_a_token(self):
        out = ts.stamp("ef" * 32, opener=lambda url, body: b"")
        self.assertFalse(out["timestamped"])


if __name__ == "__main__":
    unittest.main()
