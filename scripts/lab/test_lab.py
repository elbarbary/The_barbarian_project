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

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import forecast as fc  # noqa: E402
import run  # noqa: E402
import score as sc  # noqa: E402


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


if __name__ == "__main__":
    unittest.main()
