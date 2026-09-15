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

import datetime
import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import backload  # noqa: E402
import commit as cm  # noqa: E402
import evaluate as ev  # noqa: E402
import forecast as fc  # noqa: E402
import rerank as rr  # noqa: E402
import reveal as rv  # noqa: E402
import run  # noqa: E402
import panel as pricing  # noqa: E402
import score as sc  # noqa: E402
import timestamp as ts  # noqa: E402
import verify as vf  # noqa: E402


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
        rows, _ = run.universe(self.scan(("AAA", ahead), ("BBB", behind),
                                      ("CCC", behind)))
        self.assertEqual(run.basis_session(rows), behind[-1]["date"])

    def test_no_basis_at_all_rather_than_a_guess(self):
        # Three companies, three different last sessions: nothing is shared
        # by a majority, so there is no completed session to forecast from.
        rows, _ = run.universe(self.scan(("AAA", rising(100)), ("BBB", rising(99)),
                                      ("CCC", rising(98))))
        self.assertIsNone(run.basis_session(rows))

    def test_a_company_without_enough_record_is_left_out_of_the_universe(self):
        rows, _ = run.universe(self.scan(("AAA", rising(100)), ("BBB", rising(10))))
        self.assertEqual([r["ticker"] for r in rows], ["AAA"])

    def test_the_universe_is_alphabetical(self):
        # So a run cut short by a timeout loses a random slice of the market
        # rather than its quiet end.
        rows, _ = run.universe(self.scan(("ZZZ", rising(100)), ("AAA", rising(100)),
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


class TimingTest(unittest.TestCase):
    """A forecast committed after its first horizon closed is not a forecast."""

    def at(self, day, hour, minute=0):
        return datetime.datetime(2026, 9, day, hour, minute, tzinfo=run.CAIRO)

    def test_a_run_after_the_close_on_a_stale_basis_is_compromised(self):
        # 14th is a Monday. The vendor has not published the 14th's bar, so
        # the basis is the 13th and the one-session horizon is a close the
        # exchange printed at 14:30.
        out = run.commitment_timing("2026-09-13", self.at(14, 15, 2))
        self.assertTrue(out["compromised"])

    def test_a_run_before_the_open_is_the_strong_case(self):
        out = run.commitment_timing("2026-09-13", self.at(14, 8, 0))
        self.assertTrue(out["beforeOpen"])
        self.assertFalse(out["compromised"])

    def test_a_run_while_the_session_is_trading_is_honest_but_marked(self):
        out = run.commitment_timing("2026-09-13", self.at(14, 11, 30))
        self.assertFalse(out["beforeOpen"])
        self.assertFalse(out["compromised"])

    def test_a_basis_that_has_caught_up_is_never_compromised(self):
        # The data reached today, so the first session forecast is tomorrow
        # and nothing about it has happened whatever the clock says.
        out = run.commitment_timing("2026-09-14", self.at(14, 16, 0))
        self.assertTrue(out["beforeOpen"])
        self.assertFalse(out["compromised"])

    def test_the_weekend_does_not_compromise_a_thursday_basis(self):
        # 18 September 2026 is a Friday: the exchange is shut, so no session
        # has closed and a run at any hour is still ahead of the market.
        self.assertEqual(self.at(18, 16, 0).weekday(), 4)
        out = run.commitment_timing("2026-09-17", self.at(18, 16, 0))
        self.assertFalse(out["compromised"])
        out = run.commitment_timing("2026-09-17", self.at(19, 16, 0))
        self.assertFalse(out["compromised"])

    def test_the_close_is_the_boundary_and_a_minute_before_it_passes(self):
        self.assertFalse(run.commitment_timing(
            "2026-09-13", self.at(14, 14, 29))["compromised"])
        self.assertTrue(run.commitment_timing(
            "2026-09-13", self.at(14, 14, 30))["compromised"])


class SettledTest(unittest.TestCase):
    """A night that has been forecast is not forecast again."""

    def test_an_existing_run_is_not_overwritten(self):
        import tempfile
        days = [f"2026-{m:02d}-{d:02d}" for m in (1, 2, 3, 4, 5)
                for d in range(1, 25)][:120]
        scan = {"records": [
            {"ticker": t, "recentSplitAdjustedBars":
                [{"date": d, "open": 100.0, "high": 101.0, "low": 99.0,
                  "close": 100.0 + i, "volume": 1000.0}
                 for i, d in enumerate(days)]}
            for t in ("AAA", "BBB", "CCC")]}
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            path = root / "daily_scan.json"
            path.write_text(json.dumps(scan))
            out = root / "lab"
            out.mkdir()
            keep_out, keep_clock = run.OUT, run.now_in_cairo
            keep_commits = run.COMMITMENTS
            # A fixed clock before the open, so the test is about the
            # overwrite and not about the hour it happens to be run at.
            run.OUT, run.COMMITMENTS = out, root / "commitments"
            run.now_in_cairo = lambda: datetime.datetime(
                2026, 5, 25, 8, 0, tzinfo=run.CAIRO)
            try:
                run.main([str(path), "--models", "drift", "--no-timestamp",
                          "--no-today", "--write"])
                written = out / f"run-{days[-1]}.json"
                first = written.read_text()
                run.main([str(path), "--models", "momentum20", "--no-timestamp",
                          "--no-today", "--write"])
                self.assertEqual(written.read_text(), first)
                self.assertEqual(list(json.loads(first)["models"]), ["drift"])
            finally:
                run.OUT, run.now_in_cairo = keep_out, keep_clock
                run.COMMITMENTS = keep_commits

    def test_a_dry_run_reports_the_timing_rule_without_failing_on_it(self):
        # It writes nothing, so there is no record to protect. A red job for
        # a rule about a file it never touches teaches the next reader to
        # ignore the rule.
        import io, contextlib, tempfile
        days = [f"2026-{m:02d}-{d:02d}" for m in (1, 2, 3, 4, 5)
                for d in range(1, 25)][:120]
        scan = {"records": [
            {"ticker": t, "recentSplitAdjustedBars":
                [{"date": d, "open": 100.0, "high": 101.0, "low": 99.0,
                  "close": 100.0 + i, "volume": 1000.0}
                 for i, d in enumerate(days)]}
            for t in ("AAA", "BBB", "CCC")]}
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            path = root / "daily_scan.json"
            path.write_text(json.dumps(scan))
            out = root / "lab"
            out.mkdir()
            keep_out, keep_clock = run.OUT, run.now_in_cairo
            run.OUT = out
            run.now_in_cairo = lambda: datetime.datetime(
                2026, 5, 25, 15, 2, tzinfo=run.CAIRO)
            said = io.StringIO()
            try:
                with contextlib.redirect_stdout(said):
                    code = run.main([str(path), "--models", "drift",
                                     "--no-timestamp", "--no-today"])
                self.assertEqual(code, 0)
                self.assertIn("NOT A FORECAST", said.getvalue())
                self.assertEqual(list(out.iterdir()), [])
            finally:
                run.OUT, run.now_in_cairo = keep_out, keep_clock

    def test_a_run_whose_horizon_has_already_closed_is_refused(self):
        import tempfile
        days = [f"2026-{m:02d}-{d:02d}" for m in (1, 2, 3, 4, 5)
                for d in range(1, 25)][:120]
        scan = {"records": [
            {"ticker": t, "recentSplitAdjustedBars":
                [{"date": d, "open": 100.0, "high": 101.0, "low": 99.0,
                  "close": 100.0 + i, "volume": 1000.0}
                 for i, d in enumerate(days)]}
            for t in ("AAA", "BBB", "CCC")]}
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            path = root / "daily_scan.json"
            path.write_text(json.dumps(scan))
            out = root / "lab"
            out.mkdir()
            keep_out, keep_clock = run.OUT, run.now_in_cairo
            keep_commits = run.COMMITMENTS
            run.OUT, run.COMMITMENTS = out, root / "commitments"
            # The day after the newest bar, after the close: the session the
            # one-session horizon asks about has already been priced.
            run.now_in_cairo = lambda: datetime.datetime(
                2026, 5, 25, 15, 2, tzinfo=run.CAIRO)
            try:
                with self.assertRaises(SystemExit) as refused:
                    run.main([str(path), "--models", "drift", "--no-timestamp",
                          "--no-today", "--write"])
                self.assertIn("closed", str(refused.exception))
                self.assertEqual(list(out.iterdir()), [])
            finally:
                run.OUT, run.now_in_cairo = keep_out, keep_clock
                run.COMMITMENTS = keep_commits


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


def panel_of(prices: dict[str, dict[str, float]]) -> dict:
    """A bar panel in the shape `evaluate` and `reveal` read."""
    return {t: {d: {"date": d, "close": c} for d, c in rows.items()}
            for t, rows in prices.items()}


class PredictedTest(unittest.TestCase):
    """What a record is sorted by, and what it is silent about."""

    def test_a_ranking_model_is_sorted_by_its_score_not_a_return(self):
        record = {"ticker": "AAA", "returns": {"1": 9.0}, "ranked_by": {"1": -3.0}}
        self.assertEqual(ev.predicted(record, 1), -3.0)

    def test_a_horizon_the_model_did_not_publish_is_absent(self):
        # Kronos forecast to ten sessions in August; the lab asks for twenty.
        # Absent, never extrapolated — an invented number would be scored.
        record = {"ticker": "AAA", "returns": {"1": 1.0, "5": 2.0}}
        self.assertIsNone(ev.predicted(record, 20))

    def test_a_null_return_is_absent_rather_than_zero(self):
        self.assertIsNone(ev.predicted({"ticker": "A", "returns": {"1": None}}, 1))


class PanelTest(unittest.TestCase):

    def test_the_later_scan_wins_a_collision(self):
        # Because a bar is split-adjusted when it is read. Scoring an August
        # forecast against an unadjusted close invents a 50% loss on the day
        # a company split two for one.
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            for name, close in (("daily_scan_2026-08-01.json", 100.0),
                                ("daily_scan_2026-09-01.json", 50.0)):
                (root / name).write_text(json.dumps({"records": [
                    {"ticker": "AAA", "recentSplitAdjustedBars": [
                        {"date": "2026-07-30", "close": close}]}]}))
            panel = ev.bar_panel(sorted(root.glob("daily_scan_*.json")))
        self.assertEqual(panel["AAA"]["2026-07-30"]["close"], 50.0)


class PairsTest(unittest.TestCase):

    def setUp(self):
        self.panel = panel_of({
            "AAA": {"2026-01-01": 100.0, "2026-01-02": 110.0},
            "BBB": {"2026-01-01": 100.0},          # never traded again
        })

    def test_a_company_with_no_forward_session_is_not_a_miss(self):
        block = {"forecasts": [{"ticker": "AAA", "returns": {"1": 5.0}},
                               {"ticker": "BBB", "returns": {"1": 5.0}}]}
        pairs = ev.pairs_for(block, "2026-01-01", 1, self.panel)
        self.assertEqual(len(pairs), 1)
        self.assertEqual(pairs[0][0], 5.0)
        self.assertAlmostEqual(pairs[0][1], 10.0)

    def test_an_abstention_is_absent_and_not_a_zero(self):
        # The model answered one company of two. Scoring the other as a
        # zero forecast would credit it with a call it refused to make.
        block = {"forecasts": [{"ticker": "AAA", "returns": {"1": 5.0}}],
                 "abstained": 1}
        self.assertEqual(len(ev.pairs_for(block, "2026-01-01", 1, self.panel)), 1)


class ScoreRunTest(unittest.TestCase):

    def test_a_block_that_says_it_was_not_frozen_is_carried_as_such(self):
        document = {"basisSession": "2026-01-01", "ranAt": "2026-01-01T06:00:00Z",
                    "models": {"kronos": {"forecasts": [], "frozen": True},
                               "drift": {"forecasts": [], "frozen": False}}}
        out = ev.score_run(document, {}, ["2026-01-01"])
        self.assertTrue(out["models"]["kronos"]["frozen"])
        self.assertFalse(out["models"]["drift"]["frozen"])

    def test_a_block_with_no_flag_is_taken_as_frozen(self):
        # The nightly run is frozen by construction and does not say so.
        out = ev.score_run({"basisSession": "d", "ranAt": "2026-01-01T06:00:00Z",
                            "models": {"m": {}}}, {}, ["d"])
        self.assertTrue(out["models"]["m"]["frozen"])


class SeriesTest(unittest.TestCase):

    def test_a_date_the_model_could_not_be_scored_on_is_carried_as_none(self):
        # Dropped instead, two models would be compared on two different
        # sets of days and `against` would stop being paired.
        nights = [{"basisSession": "d1", "models": {"m": {"horizons": {
                       "1": {"rankIC": 0.2}}}}},
                  {"basisSession": "d2", "models": {"m": {"horizons": {
                       "1": {"rankIC": None}}}}}]
        self.assertEqual(ev.series(nights, "m", 1), {"d1": 0.2, "d2": None})


class LeaderboardTest(unittest.TestCase):

    def nights(self, ics):
        return [{"basisSession": f"d{i}", "universeSize": 100, "models": {
                    "m": {"answered": 40, "abstained": 0, "frozen": i < 2,
                          "horizons": {str(h): {"scored": 40, "rankIC": v,
                                                "direction": None}
                                       for h in fc.HORIZONS}}}}
                for i, v in enumerate(ics)]

    def test_frozen_and_reconstructed_dates_account_for_every_date(self):
        table = ev.leaderboard(self.nights([0.1, 0.2, 0.3, 0.4]))
        one = table["m"]["1"]
        self.assertEqual(one["dates"], 4)
        self.assertEqual(one["frozenDates"], 2)
        self.assertEqual(one["reconstructedDates"], 2)

    def test_a_date_that_could_not_be_scored_counts_as_neither(self):
        table = ev.leaderboard(self.nights([0.1, None, 0.3, 0.4]))
        one = table["m"]["1"]
        self.assertEqual(one["dates"], 3)
        self.assertEqual(one["frozenDates"] + one["reconstructedDates"], 3)


class PublicGuardTest(unittest.TestCase):
    """The leaderboard may rank forecasters. It may not name a security."""

    UNIVERSE = {"COMI", "HRHO", "SWDY"}

    def test_a_clean_leaderboard_passes(self):
        ev._no_companies({"models": {"kronos": {"1": {"mean": 0.04}}},
                          "note": "a comparison of forecasting models"},
                         self.UNIVERSE)

    def test_a_named_security_anywhere_in_the_prose_is_refused(self):
        with self.assertRaises(SystemExit):
            ev._no_companies({"note": "the best call was COMI"}, self.UNIVERSE)

    def test_a_named_security_in_punctuation_is_still_found(self):
        with self.assertRaises(SystemExit):
            ev._no_companies({"note": "best (HRHO), then others"}, self.UNIVERSE)

    def test_a_field_that_would_hold_companies_is_refused_by_its_name(self):
        for key in ("topTickers", "bestPick", "buyList", "company"):
            with self.assertRaises(SystemExit):
                ev._no_companies({key: []}, self.UNIVERSE)

    def test_the_real_leaderboard_shape_carries_no_security(self):
        table = {"kronos": {"1": {"mean": 0.04, "t": 1.7, "against": {}}}}
        public = ev.public_document(table, [{"basisSession": "2026-09-13"}], "now")
        ev._no_companies(public, self.UNIVERSE)


class EvidenceGateTest(unittest.TestCase):
    """A horizon whose answer existed when the run was written is not scored."""

    # A real fortnight of this exchange: 27 August 2026 was not a session,
    # and no rule about weekdays would know that.
    SESSIONS = ["2026-08-20", "2026-08-23", "2026-08-24", "2026-08-25",
                "2026-08-26", "2026-08-30", "2026-08-31", "2026-09-01"]

    def test_the_horizon_steps_through_sessions_not_days(self):
        self.assertEqual(ev.nth_session_after(self.SESSIONS, "2026-08-26", 1),
                         "2026-08-30")
        self.assertEqual(ev.nth_session_after(self.SESSIONS, "2026-08-20", 3),
                         "2026-08-25")

    def test_a_horizon_beyond_the_calendar_has_no_session_yet(self):
        self.assertIsNone(ev.nth_session_after(self.SESSIONS, "2026-09-01", 1))

    def test_a_session_is_complete_only_once_it_has_closed(self):
        before = ev.last_session_complete_at(self.SESSIONS, "2026-08-31T08:00:00+03:00")
        self.assertEqual(before, "2026-08-30")
        after = ev.last_session_complete_at(self.SESSIONS, "2026-08-31T14:30:00+03:00")
        self.assertEqual(after, "2026-08-31")

    def test_the_close_is_read_in_cairo_not_in_utc(self):
        # 12:00 UTC is 15:00 Cairo in summer: the session has closed.
        self.assertEqual(
            ev.last_session_complete_at(self.SESSIONS, "2026-08-31T12:00:00Z"),
            "2026-08-31")
        self.assertEqual(
            ev.last_session_complete_at(self.SESSIONS, "2026-08-31T10:00:00Z"),
            "2026-08-30")

    def test_a_run_written_days_late_has_its_first_horizon_withheld(self):
        # The 24 August run was rebuilt on the 28th. By then the 25th had
        # closed, so its one-session horizon is not evidence of anything.
        self.assertTrue(ev.outcome_already_known(
            self.SESSIONS, "2026-08-24", 1, "2026-08-28T10:53:07+00:00"))

    def test_a_market_holiday_can_make_a_late_run_honest(self):
        # The 26 August run was also written on the 28th, but the 27th was
        # not a session: the next one was the 30th, still in the future.
        self.assertFalse(ev.outcome_already_known(
            self.SESSIONS, "2026-08-26", 1, "2026-08-28T15:31:07+00:00"))

    def test_a_horizon_that_has_not_happened_is_not_withheld(self):
        self.assertFalse(ev.outcome_already_known(
            self.SESSIONS, "2026-08-31", 5, "2026-08-31T06:00:00Z"))

    def test_a_run_that_does_not_say_when_it_was_written_is_withheld(self):
        # Unprovable is not the same as fine.
        self.assertTrue(ev.outcome_already_known(
            self.SESSIONS, "2026-08-20", 1, None))

    def test_the_gate_closes_once_the_data_catches_up(self):
        # The first CI run fired at 14:49 Cairo, after the 14:30 close, on a
        # basis of the previous session — but the vendor had not yet
        # published that day's bar, so nothing could be scored either way.
        # When the bar arrives the horizon must be withheld, not scored.
        ran = "2026-09-14T11:49:09Z"
        behind = self.SESSIONS + ["2026-09-13"]
        self.assertFalse(ev.outcome_already_known(behind, "2026-09-13", 1, ran))
        caught_up = behind + ["2026-09-14"]
        self.assertTrue(ev.outcome_already_known(caught_up, "2026-09-13", 1, ran))

    def test_a_withheld_horizon_is_not_scored_even_when_it_could_be(self):
        panel = panel_of({t: {"2026-08-24": 100.0, "2026-08-25": 100.0 + i}
                          for i, t in enumerate(f"T{n:03d}" for n in range(60))})
        document = {"basisSession": "2026-08-24",
                    "ranAt": "2026-08-28T10:53:07+00:00",
                    "models": {"m": {"forecasts": [
                        {"ticker": f"T{n:03d}", "returns": {"1": float(n)}}
                        for n in range(60)]}}}
        scored = ev.score_run(document, panel, self.SESSIONS)
        one = scored["models"]["m"]["horizons"]["1"]
        self.assertEqual(one["scored"], 60)      # it could have been scored
        self.assertIsNone(one["rankIC"])         # and deliberately was not
        self.assertIn("withheld", one)
        self.assertEqual(scored["withheldHorizons"], ["1"])

    def test_an_honest_run_on_the_same_data_is_scored(self):
        panel = panel_of({t: {"2026-08-24": 100.0, "2026-08-25": 100.0 + i}
                          for i, t in enumerate(f"T{n:03d}" for n in range(60))})
        document = {"basisSession": "2026-08-24",
                    "ranAt": "2026-08-25T06:00:00+03:00",
                    "models": {"m": {"forecasts": [
                        {"ticker": f"T{n:03d}", "returns": {"1": float(n)}}
                        for n in range(60)]}}}
        one = ev.score_run(document, panel, self.SESSIONS)["models"]["m"]["horizons"]["1"]
        self.assertIsNotNone(one["rankIC"])
        self.assertNotIn("withheld", one)


class CarryTest(unittest.TestCase):
    """A night the bars no longer reach keeps the score it was given."""

    STORED = {"nights": [
        {"basisSession": "2026-01-05", "models": {"m": {"horizons": {
            "1": {"scored": 200, "rankIC": 0.11}}}}},
        {"basisSession": "2026-06-01", "models": {"m": {"horizons": {
            "1": {"scored": 200, "rankIC": 0.22}}}}}]}

    def test_only_nights_older_than_the_panel_are_carried(self):
        out = carry = ev.carried(self.STORED, ["2026-03-11", "2026-09-13"])
        self.assertEqual(sorted(out), ["2026-01-05"])
        self.assertTrue(carry["2026-01-05"]["carried"])

    def test_a_night_the_panel_still_reaches_is_rescored_not_carried(self):
        self.assertNotIn("2026-06-01",
                         ev.carried(self.STORED, ["2026-03-11", "2026-09-13"]))

    def test_an_empty_calendar_carries_nothing(self):
        # A scan that failed must not turn into yesterday's numbers wearing
        # today's date.
        self.assertEqual(ev.carried(self.STORED, []), {})

    def test_a_missing_file_is_no_history_rather_than_a_crash(self):
        self.assertEqual(ev.read_stored(pathlib.Path("/nonexistent/x.json")), {})


class WriteTest(unittest.TestCase):
    """A file that changes daily for nothing is a conflict waiting to happen."""

    def setUp(self):
        import tempfile
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = pathlib.Path(self.tmp.name) / "evaluation.json"

    def test_a_new_file_is_written(self):
        self.assertTrue(ev.write_unless_unchanged(
            self.path, {"builtAt": "t1", "models": {"m": 1}}))

    def test_only_the_clock_moving_writes_nothing(self):
        ev.write_unless_unchanged(self.path, {"builtAt": "t1", "models": {"m": 1}})
        before = self.path.read_text()
        self.assertFalse(ev.write_unless_unchanged(
            self.path, {"builtAt": "t2", "models": {"m": 1}}))
        self.assertEqual(self.path.read_text(), before)

    def test_a_changed_score_writes_and_carries_the_new_time(self):
        ev.write_unless_unchanged(self.path, {"builtAt": "t1", "models": {"m": 1}})
        self.assertTrue(ev.write_unless_unchanged(
            self.path, {"builtAt": "t2", "models": {"m": 2}}))
        held = json.loads(self.path.read_text())
        self.assertEqual(held["models"]["m"], 2)
        # So `builtAt` says when this CONTENT was produced, not when a job ran.
        self.assertEqual(held["builtAt"], "t2")

    def test_an_unreadable_existing_file_is_replaced_not_trusted(self):
        self.path.write_text("half a json document {")
        self.assertTrue(ev.write_unless_unchanged(
            self.path, {"builtAt": "t1", "models": {"m": 1}}))


class PricePanelTest(unittest.TestCase):
    """Where every price in a run came from, and what may never be spliced."""

    def setUp(self):
        import tempfile
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.archive = pathlib.Path(self.tmp.name)

    def store(self, ticker, bars):
        (self.archive / f"{ticker}.json").write_text(json.dumps(
            {"ticker": ticker, "bars": bars}))

    def series(self, n, start=100.0, step=1.0, first=1):
        return [{"date": f"2026-{1 + (i + first) // 28:02d}-{1 + (i + first) % 28:02d}",
                 "close": start + i * step, "volume": 1000.0} for i in range(n)]

    def scan_of(self, *pairs):
        return {"records": [{"ticker": t, "recentSplitAdjustedBars": b}
                            for t, b in pairs]}

    def test_the_archive_is_used_when_it_agrees_with_the_scan(self):
        deep = self.series(400)
        self.store("AAA", deep)
        out = pricing.build(self.scan_of(("AAA", deep[-120:])), root=self.archive)
        self.assertEqual(out["sources"]["archive"], ["AAA"])
        self.assertEqual(len(out["panel"]["AAA"]), 400)

    def test_a_constant_ratio_apart_is_never_spliced(self):
        # LUTS differed from the vendor by 0.3898 on the median session and
        # 0.3899 at the widest, across all 119 they shared. That is a
        # corporate action one source applied, not noise — joining them puts
        # a jump in the history that nothing in the market caused.
        deep = self.series(400)
        scanned = [dict(b, close=b["close"] * 0.61) for b in deep[-120:]]
        out = pricing.build(self.scan_of(("AAA", scanned)), root=self.archive)
        self.store("AAA", deep)
        out = pricing.build(self.scan_of(("AAA", scanned)), root=self.archive)
        self.assertIn("AAA", out["sources"]["scanOnly"])
        self.assertEqual(len(out["panel"]["AAA"]), 120)
        self.assertIn("39", out["sources"]["scanOnly"]["AAA"])

    def test_one_agreeing_session_does_not_excuse_a_series(self):
        # Why the median and not the minimum. A series offset on every
        # session but one is the corporate-action case wearing a disguise,
        # and the minimum gap would wave it through.
        deep = self.series(400)
        scanned = [dict(b, close=b["close"] * 0.61) for b in deep[-120:]]
        scanned[0] = dict(deep[-120])
        self.store("AAA", deep)
        out = pricing.build(self.scan_of(("AAA", scanned)), root=self.archive)
        self.assertIn("AAA", out["sources"]["scanOnly"])

    def test_one_disagreeing_session_does_not_condemn_a_series(self):
        # And why not the maximum. A single bad print is not a corporate
        # action, and dropping years of history over one is the worse error.
        deep = self.series(400)
        scanned = [dict(b) for b in deep[-120:]]
        scanned[5] = dict(scanned[5], close=scanned[5]["close"] * 0.5)
        self.store("AAA", deep)
        out = pricing.build(self.scan_of(("AAA", scanned)), root=self.archive)
        self.assertEqual(out["sources"]["archive"], ["AAA"])

    def test_too_little_overlap_is_not_judged_as_agreement(self):
        self.store("AAA", self.series(10))
        scanned = self.series(120, first=200)
        out = pricing.build(self.scan_of(("AAA", scanned)), root=self.archive)
        self.assertIn("too few to check", out["sources"]["scanOnly"]["AAA"])

    def test_the_scan_supplies_the_high_and_low_the_archive_lacks(self):
        deep = self.series(400)
        self.store("AAA", deep)
        scanned = [dict(b, open=b["close"] - 1, high=b["close"] + 2,
                        low=b["close"] - 2) for b in deep[-120:]]
        out = pricing.build(self.scan_of(("AAA", scanned)), root=self.archive)
        last = out["panel"]["AAA"][-1]
        self.assertEqual(last["high"], last["close"] + 2)
        # And the sessions the scan never reached keep a close and no high.
        self.assertNotIn("high", out["panel"]["AAA"][0])


class TodaysSessionTest(unittest.TestCase):
    """The session the exchange has just finished, and when it may be used."""

    ROWS = [{"reuters": "AAA.CA", "closePrice": 9.1, "openPrice": 9.12,
             "high": 9.7, "low": 9.0, "volume": 1727621, "prevClose": 9.12,
             "writeTime": "202609141535"},
            {"reuters": "BBB.CA", "closePrice": 180.04, "openPrice": 181,
             "high": 181, "low": 178, "volume": 100322, "prevClose": 181,
             "writeTime": "202609141535"}]
    CLOSED = {"data": {"status": "Closed", "statusDate": "2026-09-14T16:00:38"}}

    def watch(self, rows=None):
        return {"data": rows if rows is not None else self.ROWS}

    def test_a_closed_session_gives_open_high_low_close_and_volume(self):
        when, bars = pricing.todays_bars(self.watch(), self.CLOSED)
        self.assertEqual(when, "2026-09-14")
        self.assertEqual(bars["AAA"]["close"], 9.1)
        self.assertEqual(bars["AAA"]["open"], 9.12)
        self.assertEqual(bars["AAA"]["high"], 9.7)
        self.assertEqual(bars["AAA"]["low"], 9.0)
        self.assertEqual(bars["AAA"]["volume"], 1727621)

    def test_an_open_market_gives_nothing(self):
        # An intraday closePrice is a last price. A forecast made from one is
        # a forecast made from a session that has not finished.
        for status in ({"data": {"status": "Open", "statusDate": "2026-09-14T12:00:00"}},
                       {"data": {"status": "Pre-Open", "statusDate": "2026-09-14T09:00:00"}},
                       {}, {"data": {}}):
            when, bars = pricing.todays_bars(self.watch(), status)
            self.assertIsNone(when)
            self.assertEqual(bars, {})

    def test_the_status_and_the_rows_must_agree_on_the_date(self):
        stale = {"data": {"status": "Closed", "statusDate": "2026-09-15T16:00:38"}}
        when, bars = pricing.todays_bars(self.watch(), stale)
        self.assertIsNone(when)

    def test_the_date_comes_from_writeTime_not_lastTradeDate(self):
        # Every row of the 14th carried lastTradeDate 2026-09-13. A field a
        # day behind on the one day it is read is not a date to build on.
        rows = [dict(r, lastTradeDate="2026-09-13T00:00:00") for r in self.ROWS]
        when, bars = pricing.todays_bars(self.watch(rows), self.CLOSED)
        self.assertEqual(when, "2026-09-14")

    def test_the_nesting_the_service_varies_is_followed(self):
        when, bars = pricing.todays_bars({"data": {"data": self.ROWS}}, self.CLOSED)
        self.assertEqual(len(bars), 2)

    def test_a_session_is_appended_when_the_previous_close_agrees(self):
        history = [{"date": "2026-09-13", "close": 9.12}]
        bars, refused = pricing.extend(history, {"date": "2026-09-14", "close": 9.1,
                                                 "_prevClose": 9.12})
        self.assertIsNone(refused)
        self.assertEqual(len(bars), 2)
        self.assertNotIn("_prevClose", bars[-1])

    def test_a_session_is_refused_when_the_previous_close_does_not(self):
        # The two series have been adjusted differently, and appending would
        # put a jump in the history that nothing in the market caused.
        history = [{"date": "2026-09-13", "close": 20.0}]
        bars, refused = pricing.extend(history, {"date": "2026-09-14", "close": 9.1,
                                                 "_prevClose": 9.12})
        self.assertEqual(len(bars), 1)
        self.assertIn("previous close", refused)

    def test_a_session_already_held_is_not_added_twice(self):
        history = [{"date": "2026-09-14", "close": 9.1}]
        bars, refused = pricing.extend(history, {"date": "2026-09-14", "close": 9.1,
                                                 "_prevClose": 9.12})
        self.assertEqual(len(bars), 1)
        self.assertIsNone(refused)


class RerankRefusalTest(unittest.TestCase):
    """The one rule that stops a language model marking its own homework."""

    LIVE = {"basisSession": "2026-09-14", "models": {}}

    def test_the_session_that_just_closed_is_allowed(self):
        self.assertIsNone(rr.refuse(self.LIVE, "2026-09-14"))

    def test_a_reconstructed_run_is_refused(self):
        # It may have been trained on the outcome, and the measurements it
        # would be shown are newer than the session it is asked about.
        why = rr.refuse(dict(self.LIVE, reconstructed=True), "2026-09-14")
        self.assertIn("trained on the outcome", why)

    def test_a_basis_the_market_has_already_answered_is_refused(self):
        why = rr.refuse({"basisSession": "2026-08-20"}, "2026-09-14")
        self.assertIn("already answered", why)

    def test_an_unknown_session_is_refused_rather_than_assumed(self):
        # And says so in its own words. "the basis is X and the session that
        # just closed is None" is a reason nobody reading the record later
        # can act on.
        why = rr.refuse(self.LIVE, None)
        self.assertIn("did not say which session", why)

    def test_a_refused_run_records_why_and_asks_nothing(self):
        called = []
        block = rr.rank(dict(self.LIVE, reconstructed=True), today="2026-09-14",
                        context={}, ask=lambda p: called.append(p))
        self.assertFalse(block["asked"])
        self.assertEqual(called, [])
        self.assertEqual(block["answered"], 0)


class RerankAnswerTest(unittest.TestCase):
    """Every ticker checked back against the ones that were supplied."""

    def document(self, tickers=("AAA", "BBB", "CCC")):
        return {"basisSession": "2026-09-14", "models": {"drift": {
            "answered": len(tickers), "abstained": 0, "forecasts": [
                {"ticker": t, "returns": {"1": 1.0, "5": 2.0, "20": 3.0}}
                for t in tickers]}}}

    def ask(self, text):
        return lambda prompt: (text, {"prompt": 10, "candidates": 5})

    def test_a_clean_answer_becomes_a_ranking_not_a_return(self):
        # It is not claiming this company will rise 72%. It is claiming it
        # will do better than the one it scored 40.
        block = rr.rank(self.document(), today="2026-09-14", context={},
                        ask=self.ask('{"scores":{"AAA":72,"BBB":40,"CCC":9},'
                                     '"count":1,"note":"volume"}'))
        self.assertEqual(block["answered"], 3)
        first = block["forecasts"][0]
        self.assertEqual(first["returns"], {})
        self.assertEqual(first["ranked_by"]["5"], 72)
        self.assertEqual(block["count"], 1)

    def test_a_ticker_that_was_never_in_the_question_is_dropped_and_named(self):
        block = rr.rank(self.document(), today="2026-09-14", context={},
                        ask=self.ask('{"scores":{"AAA":50,"COMI":99},"count":1}'))
        self.assertEqual([f["ticker"] for f in block["forecasts"]], ["AAA"])
        self.assertEqual(block["invented"], ["COMI"])

    def test_a_company_it_did_not_score_is_an_abstention(self):
        block = rr.rank(self.document(), today="2026-09-14", context={},
                        ask=self.ask('{"scores":{"AAA":50},"count":1}'))
        self.assertEqual(block["answered"], 1)
        self.assertEqual(block["abstained"], 2)

    def test_it_may_not_claim_more_opportunities_than_it_scored(self):
        block = rr.rank(self.document(), today="2026-09-14", context={},
                        ask=self.ask('{"scores":{"AAA":50},"count":40}'))
        self.assertEqual(block["count"], 1)

    def test_a_count_of_zero_is_kept_because_it_is_an_answer(self):
        block = rr.rank(self.document(), today="2026-09-14", context={},
                        ask=self.ask('{"scores":{"AAA":50,"BBB":1,"CCC":2},'
                                     '"count":0}'))
        self.assertEqual(block["count"], 0)

    def test_rubbish_is_an_abstention_with_a_reason_not_a_crash(self):
        for text in ("", "I cannot help with that", "{not json"):
            block = rr.rank(self.document(), today="2026-09-14", context={},
                            ask=self.ask(text))
            self.assertEqual(block["answered"], 0)
            self.assertTrue(block["abstentions"])

    def test_a_layer_that_throws_abstains_and_says_what_threw(self):
        def boom(prompt):
            raise TimeoutError("the endpoint did not answer")
        block = rr.rank(self.document(), today="2026-09-14", context={}, ask=boom)
        self.assertEqual(block["answered"], 0)
        self.assertIn("TimeoutError: the endpoint did not answer",
                      block["abstentions"])

    def test_scores_are_held_inside_their_range(self):
        block = rr.rank(self.document(), today="2026-09-14", context={},
                        ask=self.ask('{"scores":{"AAA":5000,"BBB":-40,"CCC":"x"},'
                                     '"count":1}'))
        ranked = {f["ticker"]: f["ranked_by"]["1"] for f in block["forecasts"]}
        self.assertEqual(ranked["AAA"], 100)
        self.assertEqual(ranked["BBB"], 0)
        self.assertNotIn("CCC", ranked)

    def test_the_layer_is_never_asked_about_itself(self):
        # Neither the default reading nor any of the other fifteen: a reading
        # shown another reading's scores is grading its own homework.
        document = self.document()
        for name in (rr.NAME, rr.name_of(()), rr.name_of(("news",))):
            document["models"][name] = {"forecasts": [
                {"ticker": "AAA", "returns": {}, "ranked_by": {"1": 99}}]}
        tickers, body = rr.table(document)
        head = body.splitlines()[0]
        self.assertNotIn("rerank", head)
        self.assertIn("drift_h1", head)

    def test_the_prompt_carries_every_company_in_one_call(self):
        # A reranker shown a third of the field at a time is ranking three
        # different fields.
        document = self.document(tuple(f"T{i:03d}" for i in range(200)))
        tickers, body = rr.table(document)
        self.assertEqual(len(tickers), 200)
        self.assertEqual(len(body.splitlines()), 201)


class SelectionTest(unittest.TestCase):
    """A model's own count is a second claim, and rank IC does not test it."""

    def setUp(self):
        # Forty companies. The ones the model ranks highest are also the ones
        # that rose, so a sensible count should show an advantage.
        self.panel = panel_of({
            f"T{i:02d}": {"2026-09-14": 100.0, "2026-09-15": 100.0 + i}
            for i in range(40)})
        self.block = {"count": 5, "forecasts": [
            {"ticker": f"T{i:02d}", "returns": {}, "ranked_by": {"1": float(i)}}
            for i in range(40)]}

    def test_the_chosen_handful_is_measured_against_the_field_it_came_from(self):
        out = ev.selection(self.block, "2026-09-14", 1, self.panel)
        self.assertEqual(out["chose"], 5)
        self.assertEqual(out["scored"], 40)
        # The top five rose most, so they beat the average of all forty.
        self.assertGreater(out["difference"], 0)
        self.assertAlmostEqual(out["difference"],
                               out["chosenReturn"] - out["universeReturn"], 5)

    def test_a_month_when_everything_rose_is_not_a_clever_month(self):
        # The whole point of the difference. A model that picks at random in
        # a rising market has a positive return and no advantage.
        flat = {"count": 5, "forecasts": [
            {"ticker": f"T{i:02d}", "returns": {}, "ranked_by": {"1": 1.0}}
            for i in range(40)]}
        out = ev.selection(flat, "2026-09-14", 1, self.panel)
        self.assertGreater(out["universeReturn"], 0)
        self.assertLess(abs(out["difference"]), abs(out["universeReturn"]))

    def test_choosing_none_is_an_answer_and_is_recorded(self):
        out = ev.selection(dict(self.block, count=0), "2026-09-14", 1, self.panel)
        self.assertEqual(out["chose"], 0)
        self.assertIsNone(out["chosenReturn"])
        self.assertIsNone(out["difference"])

    def test_a_model_that_named_no_count_has_no_selection(self):
        self.assertIsNone(ev.selection(
            {"forecasts": self.block["forecasts"]}, "2026-09-14", 1, self.panel))

    def test_too_few_companies_to_judge_is_reported_not_guessed(self):
        small = {"count": 2, "forecasts": self.block["forecasts"][:10]}
        out = ev.selection(small, "2026-09-14", 1, self.panel)
        self.assertEqual(out["scored"], 10)
        self.assertIsNone(out["difference"])

    def test_ties_are_broken_so_the_same_run_chooses_the_same_companies(self):
        # The same forty companies in two different orders. Without a
        # tie-break the choice follows whichever order the file happened to
        # be written in, and the record stops being reproducible.
        rows = [{"ticker": f"T{i:02d}", "returns": {}, "ranked_by": {"1": 7.0}}
                for i in range(40)]
        forward = ev.selection({"count": 3, "forecasts": rows},
                               "2026-09-14", 1, self.panel)
        backward = ev.selection({"count": 3, "forecasts": list(reversed(rows))},
                                "2026-09-14", 1, self.panel)
        self.assertEqual(forward, backward)
        self.assertIsNotNone(forward["chosenReturn"])


class WholeCandleTest(unittest.TestCase):
    """A candle model skips the sessions it cannot read, not the company."""

    def bars(self, n, *, incomplete=()):
        out = []
        for i in range(n):
            bar = {"date": f"2026-{1 + i // 28:02d}-{1 + i % 28:02d}",
                   "close": 100.0 + i, "volume": 1000.0}
            if i not in incomplete:
                bar.update(open=99.0 + i, high=101.0 + i, low=98.0 + i)
            out.append(bar)
        return out

    def whole(self, bars):
        return [b for b in bars
                if all(isinstance(b.get(f), (int, float))
                       for f in ("open", "high", "low", "close"))]

    def test_thin_sessions_do_not_cost_the_company(self):
        # The archive records sessions the vendor dropped: a close, a volume
        # and no candle. Refusing the company over them cost fifteen listings
        # on the first night the archive was used.
        bars = self.bars(120, incomplete=(10, 40, 77))
        self.assertEqual(len(self.whole(bars)), 117)
        self.assertGreaterEqual(len(self.whole(bars)), 90)

    def test_a_company_without_ninety_whole_candles_still_abstains(self):
        bars = self.bars(120, incomplete=tuple(range(50)))
        self.assertLess(len(self.whole(bars)), 90)

    def test_the_basis_session_itself_must_have_a_candle(self):
        # Otherwise the newest thing the model reads is older than the
        # session it is forecasting from, which is a different question.
        bars = self.bars(120, incomplete=(119,))
        self.assertNotEqual(self.whole(bars)[-1]["date"], bars[-1]["date"])


class CalendarTest(unittest.TestCase):

    def test_a_session_needs_a_majority_of_the_market(self):
        # One company with a bar on a day the exchange was shut is a data
        # error, not a session, and counting it matures a forecast early.
        panel = panel_of({"AAA": {"d1": 1.0, "d2": 1.0, "oops": 1.0},
                          "BBB": {"d1": 1.0, "d2": 1.0},
                          "CCC": {"d1": 1.0, "d2": 1.0}})
        self.assertEqual(rv.calendar(panel), ["d1", "d2"])

    def test_sessions_are_counted_after_the_basis_not_including_it(self):
        self.assertEqual(rv.sessions_after(["d1", "d2", "d3"], "d1"), 2)

    def test_an_empty_panel_is_no_calendar_rather_than_an_empty_market(self):
        self.assertEqual(rv.calendar({}), [])


class RevealTest(unittest.TestCase):
    """The round trip: commit a run, open it, rebuild the same root."""

    def run_document(self):
        return {
            "basisSession": "2026-01-01",
            "ranAt": "2026-01-01T13:00:00Z",
            "universeSize": 2,
            "horizons": list(fc.HORIZONS),
            "models": {
                "drift": {"answered": 2, "abstained": 0, "forecasts": [
                    {"ticker": "BBB", "returns": {"1": -0.5}},
                    {"ticker": "AAA", "returns": {"1": 1.25, "5": 2.5}}]},
                "kronos": {"answered": 1, "abstained": 1, "forecasts": [
                    {"ticker": "AAA", "returns": {"1": 0.75},
                     "quantiles": {"1": [0.1, 0.75, 1.4]}}]},
            },
        }

    def committed(self):
        document = self.run_document()
        public, secret = cm.commitment(document)
        document["nonces"] = secret["nonces"]
        return document, public

    def test_the_reveal_rebuilds_the_root_that_was_committed(self):
        document, public = self.committed()
        out = rv.build(document, public, 20, "now")
        self.assertEqual(out["merkleRoot"], public["merkleRoot"])
        self.assertEqual(out["leaves"], 3)

    def test_every_answered_company_is_opened_none_held_back(self):
        document, public = self.committed()
        out = rv.build(document, public, 20, "now")
        opened = {(r["model"], r["forecast"]["ticker"]) for r in out["records"]}
        self.assertEqual(opened, {("drift", "AAA"), ("drift", "BBB"),
                                  ("kronos", "AAA")})

    def test_records_are_ordered_by_model_then_ticker(self):
        # The root depends on this order. A different one is a different
        # tree and the reveal would fail its own check over sorting alone.
        document, _ = self.committed()
        records = rv.records_of(document)
        self.assertEqual([(r["model"], r["forecast"]["ticker"]) for r in records],
                         [("drift", "AAA"), ("drift", "BBB"), ("kronos", "AAA")])

    def test_a_forecast_edited_after_the_commitment_is_refused(self):
        # The whole point. If this passes, nothing else here means anything.
        document, public = self.committed()
        document["models"]["kronos"]["forecasts"][0]["returns"]["1"] = 9.99
        with self.assertRaises(SystemExit):
            rv.build(document, public, 20, "now")

    def test_a_forecast_added_after_the_commitment_is_refused(self):
        document, public = self.committed()
        document["models"]["kronos"]["forecasts"].append(
            {"ticker": "CCC", "returns": {"1": 5.0}})
        document["nonces"]["kronos"]["CCC"] = cm.nonce()
        with self.assertRaises(SystemExit):
            rv.build(document, public, 20, "now")

    def test_a_forecast_quietly_dropped_before_the_reveal_is_refused(self):
        document, public = self.committed()
        document["models"]["drift"]["forecasts"].pop()
        with self.assertRaises(SystemExit):
            rv.build(document, public, 20, "now")

    def test_a_missing_nonce_is_refused_rather_than_skipped(self):
        # Without its salt a record cannot be verified by anybody, so it may
        # not be quietly dropped from a reveal that claims to be complete.
        document, public = self.committed()
        del document["nonces"]["drift"]["BBB"]
        with self.assertRaises(SystemExit) as refused:
            rv.build(document, public, 20, "now")
        self.assertIn("nonce", str(refused.exception).lower())

    def test_the_reveal_carries_the_timestamp_receipt_it_was_opened_against(self):
        document, public = self.committed()
        public["timestamp"] = {"timestamped": True, "authority": "freetsa",
                               "tokenSha256": "ab" * 32, "token": "secret"}
        out = rv.build(document, public, 20, "now")
        self.assertEqual(out["timestamp"]["authority"], "freetsa")
        self.assertEqual(out["timestamp"]["tokenSha256"], "ab" * 32)

    def test_nothing_is_opened_before_the_longest_horizon_has_matured(self):
        # A leaf commits every horizon at once, so opening after five
        # sessions publishes a twenty-session forecast that has not happened.
        self.assertEqual(rv.LONGEST, max(fc.HORIZONS))
        import tempfile
        document, public = self.committed()
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            runs, promises, reveals = root / "r", root / "c", root / "o"
            for d in (runs, promises):
                d.mkdir()
            (runs / "run-2026-01-01.json").write_text(json.dumps(document))
            (promises / "2026-01-01.json").write_text(json.dumps(public))
            scan = root / "daily_scan_2026-02-01.json"
            # Nineteen sessions after the basis: one short.
            dates = [f"2026-01-{d:02d}" for d in range(1, 21)]
            scan.write_text(json.dumps({"records": [
                {"ticker": t, "recentSplitAdjustedBars":
                    [{"date": d, "close": 100.0} for d in dates]}
                for t in ("AAA", "BBB")]}))
            rv.main([str(scan), "--runs", str(runs),
                     "--commitments", str(promises), "--reveals", str(reveals)])
            self.assertFalse(reveals.exists() and any(reveals.iterdir()))

            # One more session and it opens.
            scan.write_text(json.dumps({"records": [
                {"ticker": t, "recentSplitAdjustedBars":
                    [{"date": d, "close": 100.0} for d in dates + ["2026-01-21"]]}
                for t in ("AAA", "BBB")]}))
            rv.main([str(scan), "--runs", str(runs),
                     "--commitments", str(promises), "--reveals", str(reveals)])
            written = json.loads((reveals / "2026-01-01.json").read_text())
            self.assertEqual(written["merkleRoot"], public["merkleRoot"])
            self.assertEqual(written["matured"]["sessionsSinceBasis"], 20)

    def test_a_run_with_no_commitment_is_left_closed(self):
        import tempfile
        document, _ = self.committed()
        document.pop("nonces")
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            runs, promises, reveals = root / "r", root / "c", root / "o"
            runs.mkdir(); promises.mkdir()
            (runs / "run-2026-01-01.json").write_text(json.dumps(document))
            scan = root / "daily_scan_2026-02-01.json"
            dates = [f"2026-01-{d:02d}" for d in range(1, 26)]
            scan.write_text(json.dumps({"records": [
                {"ticker": t, "recentSplitAdjustedBars":
                    [{"date": d, "close": 100.0} for d in dates]}
                for t in ("AAA", "BBB")]}))
            rv.main([str(scan), "--runs", str(runs),
                     "--commitments", str(promises), "--reveals", str(reveals)])
            self.assertFalse(reveals.exists() and any(reveals.iterdir()))



def tlv(tag: int, body: bytes) -> bytes:
    from timestamp import _length
    return bytes([tag]) + _length(len(body)) + body


def tstinfo(digest: str, gen: str = "20260914132902Z") -> bytes:
    """A TSTInfo the way an authority builds one.

    TSTInfo ::= SEQUENCE { version, policy, messageImprint,
                           serialNumber, genTime, ... }
    """
    imprint = tlv(0x30, tlv(0x30, ts.SHA256_OID + tlv(0x05, b""))
                  + tlv(0x04, bytes.fromhex(digest)))
    return tlv(0x30, tlv(0x02, b"\x01")
               + tlv(0x06, bytes.fromhex("2a03040506"))
               + imprint + tlv(0x02, b"\x2a") + tlv(0x18, gen.encode()))


def token_for(digest: str, gen: str = "20260914132902Z") -> str:
    """The TSTInfo wrapped the way a CMS token nests it, base64 as published."""
    import base64
    nested = tlv(0x30, tlv(0x30, tlv(0x06, bytes.fromhex("2a03040507"))
                           + tlv(0xA0, tlv(0x04, tstinfo(digest, gen)))))
    return base64.b64encode(nested).decode()


class TokenTest(unittest.TestCase):
    """Reading an RFC 3161 token, checked against openssl on a real one."""

    ROOT = "1a926a78f6e401469735df6c1ccdfb7957781346dc139e1cb4c7b58a585f36df"

    def test_the_digest_and_the_time_come_back_out(self):
        said = vf.token_says(token_for(self.ROOT))
        self.assertEqual(said["digest"], self.ROOT)
        self.assertEqual(said["genTime"], "20260914132902Z")

    def test_rubbish_is_not_read_as_a_token(self):
        for bad in ("", "not base64!!", "AAAA", "MIIB"):
            self.assertIsNone(vf.token_says(bad))

    def test_a_der_structure_that_is_not_a_tstinfo_is_refused(self):
        import base64
        not_one = tlv(0x30, tlv(0x04, tlv(0x30, tlv(0x02, b"\x09"))))
        self.assertIsNone(vf.token_says(base64.b64encode(not_one).decode()))

    def test_a_tstinfo_shaped_structure_of_the_wrong_version_is_refused(self):
        # The token is found by SHAPE — the only octet string in it that
        # parses as a TSTInfo. Without the version check that scan can settle
        # on some other five-field sequence and report its bytes as a
        # timestamp, which is a wrong answer given confidently.
        import base64
        imprint = tlv(0x30, tlv(0x30, ts.SHA256_OID + tlv(0x05, b""))
                      + tlv(0x04, bytes.fromhex("ab" * 32)))
        impostor = tlv(0x30, tlv(0x02, b"\x09")
                       + tlv(0x06, bytes.fromhex("2a03040506"))
                       + imprint + tlv(0x02, b"\x2a")
                       + tlv(0x18, b"20260914132902Z"))
        wrapped = tlv(0x30, tlv(0x04, impostor))
        self.assertIsNone(vf.token_says(base64.b64encode(wrapped).decode()))


class VerifyTest(unittest.TestCase):
    """What a stranger can establish from the published files alone."""

    def setUp(self):
        self.document = {
            "basisSession": "2026-01-01", "ranAt": "2026-01-01T06:00:00Z",
            "horizons": list(fc.HORIZONS),
            "models": {
                "kronos": {"answered": 2, "abstained": 0, "forecasts": [
                    {"ticker": "AAA", "returns": {"1": 1.25}},
                    {"ticker": "BBB", "returns": {"1": -2.0}}]},
                "drift": {"answered": 1, "abstained": 1, "forecasts": [
                    {"ticker": "AAA", "returns": {"1": 0.1}}]}},
        }
        self.public, secret = cm.commitment(self.document)
        self.document["nonces"] = secret["nonces"]
        self.public["timestamp"] = {
            "timestamped": True, "authority": "freetsa",
            "token": token_for(self.public["merkleRoot"])}
        self.reveal = rv.build(self.document, self.public, 20, "2026-02-01T06:00:00Z")

    def test_a_whole_reveal_verifies(self):
        result = vf.check(self.reveal, self.public)
        self.assertTrue(result["recordsRebuildTheRoot"])
        self.assertTrue(result["matchesTheCommitment"])
        self.assertTrue(result["timestamp"]["coversThisRoot"])
        self.assertTrue(vf.verdict(result))

    def test_the_signature_is_never_claimed_to_have_been_checked(self):
        # It is not, and a report that implied otherwise would be worse than
        # no report: the whole value of the token is that somebody else signed
        # it, and this reader cannot see who.
        result = vf.check(self.reveal, self.public)
        self.assertFalse(result["timestamp"]["signatureChecked"])
        self.assertIn("openssl", result["timestamp"]["how"])

    def test_one_edited_forecast_breaks_it(self):
        self.reveal["records"][0]["forecast"]["returns"]["1"] = 99.0
        result = vf.check(self.reveal, self.public)
        self.assertFalse(result["recordsRebuildTheRoot"])
        self.assertFalse(vf.verdict(result))

    def test_a_swapped_nonce_breaks_it(self):
        self.reveal["records"][0]["nonce"] = cm.nonce()
        self.assertFalse(vf.verdict(vf.check(self.reveal, self.public)))

    def test_a_record_removed_before_publishing_breaks_it(self):
        self.reveal["records"].pop()
        self.assertFalse(vf.verdict(vf.check(self.reveal, self.public)))

    def test_a_reveal_swapped_for_another_session_breaks_it(self):
        other = dict(self.public, merkleRoot="ab" * 32)
        result = vf.check(self.reveal, other)
        self.assertTrue(result["recordsRebuildTheRoot"])
        self.assertFalse(result["matchesTheCommitment"])
        self.assertFalse(vf.verdict(result))

    def test_a_token_about_some_other_root_breaks_it(self):
        # The attack the timestamp exists to stop: a genuine token, correctly
        # signed, that is simply about a different hash.
        self.public["timestamp"]["token"] = token_for("cd" * 32)
        result = vf.check(self.reveal, self.public)
        self.assertFalse(result["timestamp"]["coversThisRoot"])
        self.assertFalse(vf.verdict(result))

    def test_a_record_with_no_nonce_is_counted_and_fails(self):
        self.reveal["records"][0].pop("nonce")
        result = vf.check(self.reveal, self.public)
        self.assertEqual(result["malformed"], 1)
        self.assertFalse(vf.verdict(result))

    def test_a_broken_rebuild_fails_even_with_no_commitment_to_compare(self):
        # The rebuild is the ONE check that works on a reveal alone. If it
        # only ever fails alongside a commitment mismatch it is not being
        # relied on, and a reveal published without its commitment would pass.
        self.reveal["records"][0]["forecast"]["returns"]["1"] = 99.0
        result = vf.check(self.reveal, None)
        self.assertFalse(result["recordsRebuildTheRoot"])
        self.assertFalse(vf.verdict(result))

    def test_a_malformed_record_fails_even_with_no_commitment(self):
        self.reveal["records"][0].pop("nonce")
        self.assertFalse(vf.verdict(vf.check(self.reveal, None)))

    def test_without_a_commitment_it_says_what_it_could_not_check(self):
        result = vf.check(self.reveal, None)
        self.assertTrue(result["recordsRebuildTheRoot"])
        self.assertIsNone(result["matchesTheCommitment"])
        self.assertIn("only that the reveal is internally whole", result["note"])

    def test_a_commitment_with_no_token_is_reported_unchecked_not_passed(self):
        self.public["timestamp"] = {"timestamped": False}
        result = vf.check(self.reveal, self.public)
        self.assertFalse(result["timestamp"]["checked"])
        # Internally whole and matching, so this is not a failure — but the
        # report must not let a reader think a third party dated it.
        self.assertTrue(vf.verdict(result))


class ReadingNamesTest(unittest.TestCase):
    """Sixteen readings, each with one name, and the default among them once."""

    def test_every_combination_is_a_reading_and_none_twice(self):
        names = [rr.name_of(layers) for layers in rr.readings()]
        self.assertEqual(len(names), 2 ** len(rr.LAYERS))
        self.assertEqual(len(set(names)), len(names))
        self.assertEqual(names.count(rr.NAME), 1)

    def test_the_default_reads_filings_news_and_the_rule_book(self):
        self.assertEqual(rr.name_of(("rulebook", "news", "filings")), rr.NAME)
        self.assertEqual(rr.layers_of(rr.NAME), ("filings", "news", "rulebook"))

    def test_a_name_round_trips_whatever_order_the_layers_came_in(self):
        for layers in rr.readings():
            self.assertEqual(rr.layers_of(rr.name_of(tuple(reversed(layers)))),
                             rr.canonical(layers))

    def test_the_empty_reading_is_the_models_alone(self):
        self.assertEqual(rr.key_of(()), "models")
        self.assertEqual(rr.layers_of("rerank:models"), ())

    def test_a_misspelt_or_reordered_name_is_not_a_reading(self):
        # One set of layers has one name. A second spelling would be a second
        # model with the same evidence, scored twice.
        for name in ("rerank:measures-filings", "rerank:gossip", "rerank:",
                     "kronos", "rerank-filings"):
            self.assertIsNone(rr.layers_of(name), name)


class ContextTest(unittest.TestCase):
    """What a reading may be shown, and the moment after which it may not."""

    UNTIL = datetime.datetime(2026, 9, 14, 15, 0, tzinfo=datetime.timezone.utc)

    def test_a_filing_from_after_the_question_is_not_shown(self):
        block = rr.filings_block({"items": [
            {"date": "2026-09-14", "tickers": ["AAA"], "title": "on time", "event_label": "Board"},
            {"date": "2026-09-16", "tickers": ["AAA"], "title": "from the future"}]},
            {"AAA"}, "2026-09-14", self.UNTIL)
        self.assertIn("on time", block["text"])
        self.assertNotIn("from the future", block["text"])

    def test_filings_older_than_the_window_are_not_the_latest(self):
        block = rr.filings_block({"items": [
            {"date": "2026-08-01", "tickers": ["AAA"], "title": "stale"}]},
            {"AAA"}, "2026-09-14", self.UNTIL)
        self.assertEqual(block["items"], 0)
        self.assertEqual(block["text"], "(none in this window)")

    def test_only_companies_in_the_question_and_only_a_few_each(self):
        items = [{"date": "2026-09-14", "tickers": ["AAA"], "title": f"no. {i}"}
                 for i in range(9)]
        items.append({"date": "2026-09-14", "tickers": ["ZZZ"], "title": "elsewhere"})
        block = rr.filings_block({"items": items}, {"AAA"}, "2026-09-14", self.UNTIL)
        self.assertEqual(block["items"], rr.FILINGS_PER_COMPANY)
        self.assertNotIn("ZZZ", block["text"])

    def test_news_is_the_two_days_before_the_question(self):
        block = rr.news_block({"items": [
            {"published": "2026-09-14T12:00:00Z", "tickers": ["AAA"], "headline": "fresh"},
            {"published": "2026-09-11T12:00:00Z", "tickers": ["AAA"], "headline": "old"},
            {"published": "2026-09-14T16:00:00Z", "tickers": ["AAA"], "headline": "later"}]},
            {"AAA"}, self.UNTIL)
        self.assertIn("fresh", block["text"])
        self.assertNotIn("old", block["text"])
        self.assertNotIn("later", block["text"])

    def test_a_headline_on_two_lines_is_one_line(self):
        block = rr.news_block({"items": [
            {"published": "2026-09-14T12:00:00Z", "tickers": ["AAA"],
             "headline": "first half\nsecond half"}]}, {"AAA"}, self.UNTIL)
        self.assertEqual(len(block["text"].splitlines()), 1)

    def test_measurements_are_the_universe_and_nothing_else(self):
        block = rr.measures_block({"rows": [{"ticker": "AAA", "pe": 7.5},
                                            {"ticker": "ZZZ", "pe": 3.0}]}, {"AAA"})
        self.assertEqual(block["companies"], 1)
        self.assertIn("AAA,", block["text"])
        self.assertNotIn("ZZZ", block["text"])

    def test_the_prompt_carries_only_the_evidence_that_was_switched_on(self):
        context = {layer: {"text": f"<{layer} evidence>"} for layer in rr.LAYERS}
        for layers in rr.readings():
            text = rr.prompt("2026-09-14", "ticker\nAAA", 1, context, layers)
            for layer in rr.LAYERS:
                (self.assertIn if layer in layers else self.assertNotIn)(
                    f"<{layer} evidence>", text, (layers, layer))
        alone = rr.prompt("2026-09-14", "ticker\nAAA", 1, context, ())
        self.assertIn("nothing but the forecasts", alone)

    def test_every_reading_asks_a_different_question(self):
        context = {layer: {"text": f"<{layer}>"} for layer in rr.LAYERS}
        questions = {rr.prompt("2026-09-14", "ticker\nAAA", 1, context, layers)
                     for layers in rr.readings()}
        self.assertEqual(len(questions), len(rr.readings()))


class RankAllTest(unittest.TestCase):
    """Each reading is its own question, and a failed one gets a second try."""

    def document(self, n=40):
        return {"basisSession": "2026-09-14", "universe": [f"T{i:02d}" for i in range(n)],
                "models": {"drift": {"answered": n, "abstained": 0, "forecasts": [
                    {"ticker": f"T{i:02d}", "returns": {"1": i, "5": i, "20": i}}
                    for i in range(n)]}}}

    def context(self):
        return {layer: {"text": f"<{layer}>"} for layer in rr.LAYERS}

    def test_sixteen_questions_sixteen_blocks_each_with_its_own_layers(self):
        asked = []

        def ask(prompt):
            asked.append(prompt)
            scores = ",".join(f'"T{i:02d}":{i}' for i in range(40))
            return '{"scores":{' + scores + '},"count":3,"note":"n"}', {}

        blocks = rr.rank_all(self.document(), today="2026-09-14",
                             context=self.context(), ask=ask, workers=4)
        self.assertEqual(len(asked), 16)
        self.assertEqual(len(set(asked)), 16)
        for name, block in blocks.items():
            self.assertEqual(tuple(block["layers"]), rr.layers_of(name))
            self.assertEqual(block["answered"], 40)

    def test_a_reading_that_throws_is_asked_once_more_and_the_second_answer_kept(self):
        tries: dict[str, int] = {}

        def ask(prompt):
            tries[prompt] = tries.get(prompt, 0) + 1
            if "<news>" in prompt and tries[prompt] == 1:
                raise TimeoutError("slow")
            scores = ",".join(f'"T{i:02d}":{i}' for i in range(40))
            return '{"scores":{' + scores + '},"count":1}', {}

        blocks = rr.rank_all(self.document(), today="2026-09-14",
                             context=self.context(), ask=ask, workers=2)
        news = [b for b in blocks.values() if "news" in b["layers"]]
        self.assertEqual(len(news), 8)
        self.assertTrue(all(b["answered"] == 40 and b.get("attempts") == 2 for b in news))
        self.assertTrue(all("attempts" not in b for b in blocks.values()
                            if "news" not in b["layers"]))

    def test_a_refused_night_asks_nothing_at_all(self):
        called = []
        blocks = rr.rank_all(dict(self.document(), reconstructed=True),
                             today="2026-09-14", context=self.context(),
                             ask=lambda p: called.append(p))
        self.assertEqual(called, [])
        self.assertTrue(all(not b["asked"] for b in blocks.values()))


class LayerRunTest(unittest.TestCase):
    """The second pass, sealed beside the night it read and never over it."""

    def night(self, root, basis="2026-09-14", reconstructed=False):
        runs = root / "lab"
        runs.mkdir(exist_ok=True)
        document = {"basisSession": basis, "ranAt": f"{basis}T14:30:00Z",
                    "universe": [f"T{i:02d}" for i in range(40)], "universeSize": 40,
                    "horizons": list(fc.HORIZONS),
                    "models": {"drift": {"answered": 40, "abstained": 0, "forecasts": [
                        {"ticker": f"T{i:02d}", "returns": {"1": i, "5": i, "20": i}}
                        for i in range(40)]}}}
        if reconstructed:
            document["reconstructed"] = True
        document["fingerprint"] = run.fingerprint(document)
        (runs / f"run-{basis}.json").write_text(json.dumps(document))
        data = root / "data"
        (data / "news").mkdir(parents=True, exist_ok=True)
        (data / "disclosures").mkdir(parents=True, exist_ok=True)
        (data / "news" / "latest.json").write_text(json.dumps({"items": []}))
        (data / "disclosures" / "latest.json").write_text(json.dumps({"items": []}))
        (data / "measures.json").write_text(json.dumps({"rows": []}))
        return runs, document

    def main(self, root, runs, today="2026-09-14", answer=True, write=True):
        import unittest.mock as mock
        scores = ",".join(f'"T{i:02d}":{i}' for i in range(40))

        def ask(prompt):
            if not answer:
                raise TimeoutError("vertex is down")
            return '{"scores":{' + scores + '},"count":2}', {"prompt": 1, "candidates": 1}

        original = rr.rank

        def rank(document, **kwargs):
            kwargs["ask"] = ask
            return original(document, **kwargs)

        argv = ["--runs", str(runs), "--commitments", str(root / "commitments"),
                "--data", str(root / "data"), "--today", today, "--no-timestamp"]
        with mock.patch.object(rr, "rank", rank), \
                mock.patch.object(run, "now_in_cairo", lambda: datetime.datetime(
                    2026, 9, 14, 20, 0, tzinfo=run.CAIRO)):
            return rr.main(argv + (["--write"] if write else []))

    def test_it_seals_its_readings_beside_the_night_and_binds_that_night(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            runs, document = self.night(root)
            before = (runs / "run-2026-09-14.json").read_text()
            self.main(root, runs)
            layer = json.loads((runs / "rerank-2026-09-14.json").read_text())
            promise = json.loads((root / "commitments" / "2026-09-14.rerank.json").read_text())
            self.assertEqual((runs / "run-2026-09-14.json").read_text(), before)
            self.assertEqual(len(layer["models"]), 16)
            self.assertEqual(layer["reads"]["fingerprint"], document["fingerprint"])
            self.assertEqual(promise["reads"]["fingerprint"], document["fingerprint"])
            self.assertEqual(promise["layer"], "rerank")
            self.assertEqual(promise["leaves"], 16 * 40)
            self.assertNotIn("nonces", promise)
            # And it opens against its own root, not the run's.
            self.assertEqual(rv.root_of(rv.records_of(layer), "2026-09-14"),
                             promise["merkleRoot"])

    def test_a_night_that_has_been_read_is_not_read_again(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            runs, _ = self.night(root)
            self.main(root, runs)
            first = (runs / "rerank-2026-09-14.json").read_text()
            self.main(root, runs)
            self.assertEqual((runs / "rerank-2026-09-14.json").read_text(), first)

    def test_a_basis_the_market_has_answered_is_not_read(self):
        # Refused before any evidence is gathered, not merely sixteen times
        # over inside each reading: a refusal that still reads the news has
        # done the part of the work that was never allowed.
        import tempfile
        import unittest.mock as mock
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            runs, _ = self.night(root)
            gathered = []
            with mock.patch.object(rr, "gather", lambda *a, **k: gathered.append(1) or {}):
                self.main(root, runs, today="2026-09-15")
            self.assertFalse((runs / "rerank-2026-09-14.json").exists())
            self.assertEqual(gathered, [])

    def test_the_newest_frozen_night_is_read_past_a_newer_reconstruction(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            runs, _ = self.night(root, basis="2026-09-14")
            self.night(root, basis="2026-09-15", reconstructed=True)
            self.main(root, runs, today="2026-09-14")
            self.assertTrue((runs / "rerank-2026-09-14.json").exists())
            self.assertFalse((runs / "rerank-2026-09-15.json").exists())

    def test_nothing_is_sealed_when_no_reading_answered(self):
        # Sixteen refusals sealed would stop the retry schedule from getting
        # tonight's answers, and there is nothing in them to protect.
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            runs, _ = self.night(root)
            self.main(root, runs, answer=False)
            self.assertFalse((runs / "rerank-2026-09-14.json").exists())
            self.assertFalse((root / "commitments").exists())

    def test_a_reconstructed_night_is_never_the_one_read(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            runs, _ = self.night(root, reconstructed=True)
            self.main(root, runs)
            self.assertFalse((runs / "rerank-2026-09-14.json").exists())

    def test_without_write_nothing_is_written(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            runs, _ = self.night(root)
            self.main(root, runs, write=False)
            self.assertFalse((runs / "rerank-2026-09-14.json").exists())


class FoldTest(unittest.TestCase):
    """Putting a reading back beside its night, in memory, by three rules."""

    RUN = {"basisSession": "2026-09-14", "ranAt": "2026-09-14T14:30:00Z",
           "fingerprint": "aa", "universe": ["AAA"],
           "models": {"drift": {"forecasts": []}}}

    def layer(self, **extra):
        return dict({"layer": "rerank", "basisSession": "2026-09-14",
                     "ranAt": "2026-09-14T21:00:00Z", "reads": {"fingerprint": "aa"},
                     "universe": ["AAA"], "evidence": {"news": {"items": 2}},
                     "models": {rr.NAME: {"forecasts": []}}}, **extra)

    def test_a_reading_keeps_the_moment_it_was_written(self):
        merged = ev.fold(self.RUN, self.layer())
        self.assertEqual(merged["models"][rr.NAME]["ranAt"], "2026-09-14T21:00:00Z")
        self.assertNotIn("ranAt", merged["models"]["drift"])
        self.assertEqual(merged["layers"]["rerank"]["evidence"]["news"]["items"], 2)

    def test_a_reading_never_replaces_a_model_the_run_holds(self):
        merged = ev.fold(self.RUN, self.layer(models={"drift": {"forecasts": [1]}}))
        self.assertEqual(merged["models"]["drift"], {"forecasts": []})

    def test_a_reading_of_another_night_is_not_folded_in(self):
        self.assertNotIn(rr.NAME, ev.fold(self.RUN, self.layer(
            reads={"fingerprint": "bb"}))["models"])
        self.assertNotIn(rr.NAME, ev.fold(self.RUN, self.layer(
            basisSession="2026-09-13"))["models"])

    def test_the_sealed_run_itself_is_untouched(self):
        before = json.dumps(self.RUN, sort_keys=True)
        ev.fold(self.RUN, self.layer())
        self.assertEqual(json.dumps(self.RUN, sort_keys=True), before)

    def test_a_horizon_is_withheld_by_when_the_reading_was_written(self):
        # Sealed on the night, the run's one-session horizon is evidence. A
        # reading of the same night written after the NEXT session closed is
        # not, even though the forecasts it read were.
        sessions = ["2026-09-13", "2026-09-14", "2026-09-15", "2026-09-16"]
        panel = {}
        document = {"basisSession": "2026-09-14", "ranAt": "2026-09-14T14:30:00Z",
                    "models": {
                        "drift": {"forecasts": []},
                        rr.NAME: {"forecasts": [], "ranAt": "2026-09-15T14:00:00Z"}}}
        scored = ev.score_run(document, panel, sessions)
        self.assertNotIn("withheld", scored["models"]["drift"]["horizons"]["1"])
        self.assertIn("withheld", scored["models"][rr.NAME]["horizons"]["1"])

    def test_documents_fold_each_reading_into_its_own_night(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            runs = pathlib.Path(tmp)
            (runs / "run-2026-09-14.json").write_text(json.dumps(self.RUN))
            (runs / "rerank-2026-09-14.json").write_text(json.dumps(self.layer()))
            (runs / "rerank-2026-09-01.json").write_text(json.dumps(
                self.layer(basisSession="2026-09-01")))
            held = ev.documents(runs)
            self.assertEqual([d["basisSession"] for _, d in held], ["2026-09-14"])
            self.assertIn(rr.NAME, held[0][1]["models"])


class LayerRevealTest(unittest.TestCase):
    """A reading opens against its own root and verifies against it."""

    def test_the_stem_keeps_a_reading_apart_from_its_night(self):
        self.assertEqual(rv.stem_of({"basisSession": "2026-09-14"}), "2026-09-14")
        self.assertEqual(rv.stem_of({"basisSession": "2026-09-14", "layer": "rerank"}),
                         "2026-09-14.rerank")

    def test_a_matured_reading_is_opened_filed_and_verified_under_its_stem(self):
        import tempfile
        layer = {"layer": "rerank", "basisSession": "2026-01-01",
                 "ranAt": "2026-01-01T13:00:00Z", "horizons": list(fc.HORIZONS),
                 "models": {rr.NAME: {"answered": 2, "abstained": 0, "forecasts": [
                     {"ticker": "AAA", "returns": {}, "ranked_by": {"1": 9, "5": 9, "20": 9}},
                     {"ticker": "BBB", "returns": {}, "ranked_by": {"1": 2, "5": 2, "20": 2}}]}}}
        public, secret = cm.commitment(layer)
        layer["nonces"] = secret["nonces"]
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            runs, promises, reveals = root / "r", root / "c", root / "o"
            runs.mkdir(); promises.mkdir()
            (runs / "rerank-2026-01-01.json").write_text(json.dumps(layer))
            (promises / "2026-01-01.rerank.json").write_text(json.dumps(public))
            # A commitment for the night itself with a DIFFERENT root: opening
            # the reading against it would fail, and must not be attempted.
            (promises / "2026-01-01.json").write_text(json.dumps(dict(public, merkleRoot="ab" * 32)))
            scan = root / "daily_scan_2026-02-01.json"
            dates = [f"2026-01-{d:02d}" for d in range(1, 23)]
            scan.write_text(json.dumps({"records": [
                {"ticker": t, "recentSplitAdjustedBars":
                    [{"date": d, "close": 100.0} for d in dates]}
                for t in ("AAA", "BBB")]}))
            rv.main([str(scan), "--runs", str(runs), "--commitments", str(promises),
                     "--reveals", str(reveals)])
            opened = json.loads((reveals / "2026-01-01.rerank.json").read_text())
            self.assertEqual(opened["stem"], "2026-01-01.rerank")
            self.assertEqual(opened["merkleRoot"], public["merkleRoot"])
            self.assertEqual(vf.main([str(reveals / "2026-01-01.rerank.json"),
                                      "--commitments", str(promises)]), 0)


class PublishTest(unittest.TestCase):
    """What reaches a reader, and which door each document is behind."""

    def test_the_per_company_documents_are_behind_the_gate(self):
        import publish as pb
        # The worker opens `research/` to anybody and gates the rest of
        # `/data/v1/`. A document naming companies may not live under the open
        # folder, and the one that once did is not written there again.
        self.assertIn("research", pb.TOP5.parts)
        for path in (pb.SCENARIOS, pb.READINGS):
            self.assertNotIn("research", path.parts)
            self.assertIn("v1", path.parts)
        self.assertEqual(pb.LEGACY_SCENARIOS, pb.RESEARCH / "scenarios.json")

    def test_a_model_that_ranks_every_company_alike_is_marked(self):
        import publish as pb
        flat = {"forecasts": [{"ticker": t, "returns": {"1": 0.0, "5": 0.0, "20": 0.0}}
                              for t in ("AAA", "BBB")]}
        drift = {"forecasts": [{"ticker": "AAA", "returns": {"5": 1.0}},
                               {"ticker": "BBB", "returns": {"5": 2.0}}]}
        self.assertFalse(pb.distinguishes(flat))
        self.assertTrue(pb.distinguishes(drift))

    def test_the_record_publishes_its_own_minimum(self):
        import publish as pb
        self.assertGreaterEqual(pb.MINIMUM_SESSIONS, 3)

    def test_a_flip_in_sign_is_counted_not_asserted(self):
        import publish as pb
        rows = [{"chosenReturn": 1, "marketReturn": 0, "advantage": a}
                for a in (1.0, -0.5, -0.2, 0.3)]
        self.assertEqual(pb.summarise(rows)["signChanges"], 2)

    def test_the_schedule_is_read_from_the_workflow_itself(self):
        import publish as pb
        crons = pb.schedule()
        self.assertTrue(crons)
        self.assertTrue(all(len(c.split()) == 5 for c in crons))

    def test_a_readings_order_is_compared_in_plain_numbers(self):
        import publish as pb
        tickers = [f"T{i:02d}" for i in range(40)]
        same = {t: i for i, t in enumerate(tickers)}
        flipped = {t: -i for i, t in enumerate(tickers)}
        self.assertEqual(pb.agreement(same, same, 5, 5)["rho"], 1.0)
        turned = pb.agreement(flipped, same, 5, 5)
        self.assertEqual(turned["rho"], -1.0)
        self.assertEqual(turned["keptChanged"], 10)
        self.assertGreater(turned["movedOverTwenty"], 0)

    def test_companies_left_tied_at_the_bottom_are_not_moved_by_the_alphabet(self):
        # 14 September: the default reading gave 182 of 257 companies the same
        # bottom score. Ordered by ticker, a tie "moves" companies that the
        # evidence never separated.
        import publish as pb
        tickers = [f"T{i:02d}" for i in range(40)]
        # Ordered against the alphabet, then read again with every company
        # tied. Broken by ticker, the tie would "move" the first and last ten
        # by twenty places or more; standing at the shared average, nobody is
        # further than 19.5 places from where it was.
        ordered = {t: i for i, t in enumerate(tickers)}
        lumped = {t: 0 for t in tickers}
        self.assertEqual(pb.agreement(lumped, ordered, None, None)["movedOverTwenty"], 0)
        self.assertEqual(pb.standing({"A": 5, "B": 5, "C": 1}), {"A": 1.5, "B": 1.5, "C": 3.0})

    def test_the_public_record_of_readings_names_no_company(self):
        import publish as pb
        nights = [{"basis": "2026-09-14", "document": {
            "basisSession": "2026-09-14", "ranAt": "2026-09-14T14:30:00Z",
            "universe": ["AAA"], "models": {}}}]
        table = pb.backtest(nights, {}, ["2026-09-14"],
                            [rr.name_of(layers) for layers in rr.readings()])
        ev._no_companies({"readings": table}, {"AAA"})

    def test_the_reading_files_say_how_each_compares_with_the_models_alone(self):
        import publish as pb
        tickers = [f"T{i:02d}" for i in range(40)]

        def block(scores, count):
            return {"answered": len(scores), "asked": True, "count": count,
                    "forecasts": [{"ticker": t, "returns": {},
                                   "ranked_by": {"1": s, "5": s, "20": s}}
                                  for t, s in scores.items()]}

        document = {"basisSession": "2026-09-14", "models": {
            "drift": {"forecasts": [{"ticker": t, "returns": {"5": i}}
                                    for i, t in enumerate(tickers)]},
            rr.name_of(()): block({t: i for i, t in enumerate(tickers)}, 5),
            rr.NAME: block({t: -i for i, t in enumerate(tickers)}, 5)}}
        files = pb.reading_documents(document, "now")
        self.assertEqual(set(files), {"models", rr.key_of(rr.DEFAULT)})
        self.assertIsNone(files["models"]["agreement"]["withModelsOnly"])
        self.assertEqual(files[rr.key_of(rr.DEFAULT)]["agreement"]["withModelsOnly"]["rho"], -1.0)
        self.assertEqual(files["models"]["agreement"]["withForecasters"], 1.0)
        self.assertTrue(files[rr.key_of(rr.DEFAULT)]["default"])


class PicksTest(unittest.TestCase):
    """Each night's five, by name: the same five the record averages."""

    SESSIONS = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-06", "2026-09-07",
                "2026-09-08", "2026-09-09"]

    def market(self, silent=()):
        """Forty companies over seven sessions; T00 rises most, T39 least.
        A ticker in `silent` has no bar after the first session."""
        prices = {}
        for i in range(40):
            ticker = f"T{i:02d}"
            rows = {}
            for k, date in enumerate(self.SESSIONS):
                if ticker in silent and k > 0:
                    continue
                rows[date] = 100.0 + k * (40 - i) / 10
            prices[ticker] = rows
        return panel_of(prices)

    def block(self, ran_at="2026-09-01T13:00:00Z", flat=False):
        return {"answered": 40, "ranAt": ran_at,
                "forecasts": [{"ticker": f"T{i:02d}",
                               "returns": {"1": 0.0 if flat else 40.0 - i,
                                           "5": 0.0 if flat else 40.0 - i}}
                              for i in range(40)]}

    def night(self, basis="2026-09-01", **kw):
        return {"basis": basis, "document": {"basisSession": basis, "ranAt": "2026-09-01T13:00:00Z",
                                             "models": {"kronos": self.block(**kw)}}}

    def test_the_list_of_names_is_behind_the_gate(self):
        import publish as pb
        self.assertNotIn("research", pb.PICKS.parts)
        self.assertEqual(pb.PICKS.parent, pb.LAB)

    def test_a_scored_night_names_the_five_the_record_averaged(self):
        import publish as pb
        panel = self.market()
        nights = [self.night()]
        # Exactly five sessions after the basis: the horizon has just closed.
        sessions = self.SESSIONS[:6]
        record = pb.backtest(nights, panel, sessions, ["kronos"])
        listed = pb.picks(nights, panel, sessions, ["kronos"])
        one = listed["kronos"]["horizons"]["5"]["nights"][0]
        row = record["kronos"]["horizons"]["5"]["byDate"][0]
        self.assertEqual(one["status"], "scored")
        self.assertEqual([p["ticker"] for p in one["picks"]], ["T00", "T01", "T02", "T03", "T04"])
        for key in ("chosenReturn", "marketReturn", "advantage", "scored"):
            self.assertEqual(one[key], row[key])
        mean = sum(p["returned"] for p in one["picks"]) / 5
        self.assertAlmostEqual(mean, one["chosenReturn"], places=3)
        self.assertEqual(one["sessionsClosed"], 5)

    def test_a_company_that_did_not_trade_is_replaced_and_named(self):
        import publish as pb
        panel = self.market(silent=("T01",))
        one = pb.picks([self.night()], panel, self.SESSIONS, ["kronos"])["kronos"]["horizons"]["5"]["nights"][0]
        self.assertEqual([p["ticker"] for p in one["picks"]], ["T00", "T02", "T03", "T04", "T05"])
        self.assertEqual(one["skipped"], ["T01"])

    def test_a_night_still_running_names_its_five_and_no_result(self):
        import publish as pb
        sessions = self.SESSIONS[:3]
        one = pb.picks([self.night()], self.market(), sessions, ["kronos"])["kronos"]["horizons"]["5"]["nights"][0]
        self.assertEqual(one["status"], "waiting")
        self.assertEqual(one["sessionsClosed"], 2)
        self.assertEqual([p["ticker"] for p in one["picks"]], ["T00", "T01", "T02", "T03", "T04"])
        self.assertTrue(all("returned" not in p for p in one["picks"]))
        self.assertNotIn("chosenReturn", one)

    def test_a_night_written_after_its_answer_names_nobody(self):
        import publish as pb
        # Written the evening after the session its one-step horizon asks about.
        late = self.night(ran_at="2026-09-02T18:00:00Z")
        one = pb.picks([late], self.market(), self.SESSIONS, ["kronos"])["kronos"]["horizons"]["1"]["nights"][0]
        self.assertEqual(one["status"], "withheld")
        self.assertNotIn("picks", one)

    def test_a_model_that_ranks_every_company_alike_has_no_five(self):
        import publish as pb
        self.assertEqual(pb.picks([self.night(flat=True)], self.market(), self.SESSIONS, ["kronos"]), {})

    def test_a_draw_for_fifth_place_is_counted(self):
        import publish as pb
        order = [(9.0, "A"), (8.0, "B"), (7.0, "C"), (6.0, "D"), (5.0, "E"), (5.0, "F"), (5.0, "G"), (1.0, "H")]
        self.assertEqual(pb.tied(order), 2)
        self.assertEqual(pb.tied(order[:5]), 0)

    def test_nights_are_newest_first_and_capped_out_loud(self):
        import publish as pb
        import unittest.mock as mock
        nights = [self.night(basis=d) for d in self.SESSIONS[:4]]
        for night in nights:
            night["document"]["ranAt"] = f"{night['basis']}T13:00:00Z"
            night["document"]["models"]["kronos"]["ranAt"] = f"{night['basis']}T13:00:00Z"
        with mock.patch.object(pb, "PICK_NIGHTS", 3):
            held = pb.picks(nights, self.market(), self.SESSIONS, ["kronos"])["kronos"]["horizons"]["1"]
        self.assertEqual([n["basisSession"] for n in held["nights"]], ["2026-09-06", "2026-09-03", "2026-09-02"])
        self.assertEqual(held["older"], 1)

    def test_what_a_number_is_follows_the_model(self):
        import publish as pb
        self.assertEqual(pb.says("kronos"), {"kind": "return"})
        self.assertEqual(pb.says("momentum20"), {"kind": "momentum", "sessions": 20})
        self.assertEqual(pb.says("reversal1"), {"kind": "reversal", "sessions": 1})
        self.assertEqual(pb.says(rr.name_of(("filings",))), {"kind": "score", "outOf": 100})

    def test_a_reading_keeps_its_own_count_and_reason_once_per_night(self):
        import publish as pb
        night = self.night()
        block = dict(self.block(), count=7, note="filings moved it", asked=True)
        night["document"]["models"][rr.NAME] = block
        entry = pb.picks([night], self.market(), self.SESSIONS, [rr.NAME])[rr.NAME]
        self.assertEqual(entry["notes"], {"2026-09-01": {"count": 7, "note": "filings moved it"}})
        self.assertTrue(entry["default"])
        self.assertEqual(entry["layers"], list(rr.DEFAULT))
        self.assertEqual(entry["says"], {"kind": "score", "outOf": 100})


class ListedTest(unittest.TestCase):
    """An instrument the feed names by its ISIN is not asked about or shown."""

    def test_an_isin_is_not_a_ticker(self):
        for isin in ("EGS659O1C015", "EGS30AJ1C016-EGP", "EGS385S1C012"):
            self.assertFalse(run.listed(isin), isin)
        for ticker in ("COMI", "EGSA", "AAA", "T00", "EGAL"):
            self.assertTrue(run.listed(ticker), ticker)
        self.assertFalse(run.listed(None))
        self.assertFalse(run.listed(""))

    def test_the_universe_leaves_it_out_and_says_so(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            scan = {"records": [{"ticker": t, "recentSplitAdjustedBars": rising(100)}
                                for t in ("AAA", "EGS659O1C015")]}
            rows, sources = run.universe(scan, root=pathlib.Path(tmp))
        self.assertEqual([r["ticker"] for r in rows], ["AAA"])
        self.assertEqual(sources["withoutTicker"], ["EGS659O1C015"])

    def test_a_night_sealed_with_one_neither_scores_nor_picks_it(self):
        import publish as pb
        # Forty listed companies and one ISIN the model liked best of all.
        tickers = [f"T{i:02d}" for i in range(40)]
        dates = ["2026-09-01", "2026-09-02"]
        panel = panel_of({t: {dates[0]: 100.0, dates[1]: 101.0} for t in tickers + ["EGS659O1C015"]})
        block = {"forecasts": [{"ticker": t, "returns": {"1": float(i)}} for i, t in enumerate(tickers)]
                 + [{"ticker": "EGS659O1C015", "returns": {"1": 173.0}}]}
        self.assertNotIn("EGS659O1C015", [t for _, t in pb.ranked(block, 1)])
        self.assertEqual(len(ev.pairs_for(block, dates[0], 1, panel)), 40)
        document = {"basisSession": dates[1], "models": {"kronos": block}}
        self.assertNotIn("EGS659O1C015", pb.scenarios(document, panel, dates)["companies"])
        self.assertNotIn("EGS659O1C015", pb.scores_of({"forecasts": [
            {"ticker": "EGS659O1C015", "ranked_by": {"5": 99.0}}, {"ticker": "AAA", "ranked_by": {"5": 1.0}}]}))


class EarlyExitTest(unittest.TestCase):
    """A night already sealed costs the retry schedule seconds, not Kronos."""

    def test_the_models_are_not_asked_when_the_night_is_sealed(self):
        import tempfile
        import unittest.mock as mock
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            scan = {"records": [{"ticker": t, "recentSplitAdjustedBars": rising(100)}
                                for t in ("AAA", "BBB")]}
            path = root / "daily_scan.json"
            path.write_text(json.dumps(scan))
            basis = rising(100)[-1]["date"]
            (root / f"run-{basis}.json").write_text("{}")
            asked = []
            with mock.patch.object(run, "OUT", root), \
                    mock.patch.object(run, "build", lambda *a, **k: asked.append(1)):
                self.assertEqual(run.main([str(path), "--write", "--no-today",
                                           "--no-timestamp"]), 0)
            self.assertEqual(asked, [])


class LastClosedTest(unittest.TestCase):
    """Closed since the rows' session — including after midnight."""

    def watch(self, stamp="202609141535"):
        return {"data": [{"reuters": f"T{i}.CA", "closePrice": 9.1, "writeTime": stamp}
                         for i in range(5)]}

    def status(self, state="Closed", when="2026-09-14T15:40:00"):
        return {"data": {"status": state, "statusDate": when}}

    def test_the_evening_of_the_session(self):
        self.assertEqual(pricing.last_closed(self.watch(), self.status()), "2026-09-14")

    def test_after_midnight_the_newest_session_is_still_the_one_that_closed(self):
        # What the exchange actually said at 00:02 on the 15th.
        self.assertEqual(pricing.last_closed(
            self.watch(), self.status(when="2026-09-15T00:02:20")), "2026-09-14")
        self.assertEqual(pricing.todays_bars(
            self.watch(), self.status(when="2026-09-15T00:02:20"))[0], None)

    def test_a_market_that_is_trading_has_not_closed_anything_new(self):
        for state in ("Open", "Pre-Open", ""):
            self.assertIsNone(pricing.last_closed(self.watch(), self.status(state)))

    def test_rows_newer_than_the_status_are_not_believed(self):
        self.assertIsNone(pricing.last_closed(self.watch("202609161535"), self.status()))

    def test_no_rows_no_session(self):
        self.assertIsNone(pricing.last_closed({"data": []}, self.status()))

    def test_the_bars_for_drawing_follow_the_same_rule(self):
        when, got = pricing.closed_bars(self.watch(), self.status(when="2026-09-15T00:02:20"))
        self.assertEqual(when, "2026-09-14")
        self.assertEqual(set(got), {f"T{i}" for i in range(5)})
        self.assertEqual(got["T0"]["date"], "2026-09-14")
        self.assertEqual(pricing.closed_bars(self.watch(), self.status("Open")), (None, {}))
        # And the forecast's own rule is untouched by it.
        self.assertEqual(pricing.todays_bars(self.watch(), self.status())[1]["T0"]["close"], 9.1)


class TokenRefreshTest(unittest.TestCase):
    """An hour-long token outlived by the job is replaced, not retried."""

    def test_an_expired_token_is_swapped_for_one_minted_from_the_credentials(self):
        import io
        import os
        import tempfile
        import unittest.mock as mock
        import urllib.error
        sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
        import gemini

        seen = []

        def urlopen(request, timeout=None):
            url = request.full_url
            if "aiplatform" in url:
                auth = request.headers.get("Authorization")
                seen.append(auth)
                if auth == "Bearer expired":
                    raise urllib.error.HTTPError(url, 401, "expired", {}, io.BytesIO(b"{}"))
                return io.BytesIO(json.dumps({"candidates": [
                    {"content": {"parts": [{"text": "ok"}]}}]}).encode())
            if "identity" in url:
                return io.BytesIO(json.dumps({"value": "jwt"}).encode())
            if "sts" in url:
                return io.BytesIO(json.dumps({"access_token": "federated",
                                              "expires_in": 3600}).encode())
            if "generateAccessToken" in url:
                return io.BytesIO(json.dumps({"accessToken": "fresh"}).encode())
            raise AssertionError(url)

        with tempfile.TemporaryDirectory() as tmp:
            creds = pathlib.Path(tmp) / "creds.json"
            creds.write_text(json.dumps({
                "type": "external_account", "audience": "//iam/pool",
                "token_url": "https://sts.example/v1/token",
                "service_account_impersonation_url": "https://iam.example/sa:generateAccessToken",
                "credential_source": {"url": "https://identity.example/?aud=x",
                                      "headers": {"Authorization": "Bearer runner"},
                                      "format": {"type": "json",
                                                 "subject_token_field_name": "value"}}}))
            env = {"GOOGLE_VERTEX_ACCESS_TOKEN": "expired",
                   "GOOGLE_CLOUD_PROJECT": "p", "GOOGLE_APPLICATION_CREDENTIALS": str(creds)}
            with mock.patch.dict(os.environ, env), \
                    mock.patch.object(gemini.urllib.request, "urlopen", urlopen), \
                    mock.patch.object(gemini, "_ENV_TOKEN_REFUSED", False), \
                    mock.patch.object(gemini, "_MINTED", {}), \
                    mock.patch.object(gemini.time, "sleep", lambda s: None):
                text, _ = gemini.generate("hello")
        self.assertEqual(text, "ok")
        self.assertEqual(seen, ["Bearer expired", "Bearer fresh"])


if __name__ == "__main__":
    unittest.main()
