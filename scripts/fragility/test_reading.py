#!/usr/bin/env python3
"""The daily reading is the research's model, session for session.

The code in reading.py was recovered from the research session that produced
the published series; it was never committed. These tests are why it can be
trusted: run on the research's own sessions, it must give back the published
reading of 9 September 2026 exactly, and every session of both simulation
series to the places they were rounded to. And adding sessions after the
research must not move a single figure the research published.

    python3 -m unittest discover -s scripts/fragility -p 'test_*.py'
"""
from __future__ import annotations

import datetime as dt
import json
import unittest

import numpy as np

import reading
import stores

BACKTEST = stores.REPO / "public" / "esthmr" / "backtest"
RESEARCH_DAY = json.loads((stores.REPO / "scripts" / "fragility" / "research_2026-09-09_inputs.json")
                          .read_text(encoding="utf-8"))


def research_read(name):
    """An input as the research read it: complete to 8 September, 9 September mid-session."""
    series = {day: value for day, value in stores.read(name).items() if day <= stores.COMPLETE_THROUGH}
    if RESEARCH_DAY[name] is not None:
        series[stores.RESEARCH_END] = RESEARCH_DAY[name]
    return series


def research():
    metadata, rows = reading.research_dataset()
    return metadata, rows, reading.compute(rows, metadata, research_read)


class TheResearchReplays(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.metadata, cls.rows, cls.c = research()
        cls.wm = json.loads((BACKTEST / "world_monitor_simulation_series.json").read_text(encoding="utf-8"))
        cls.v5 = json.loads((BACKTEST / "v5_simulation_series.json").read_text(encoding="utf-8"))

    def test_the_reading_of_9_september_is_the_published_one(self):
        doc = reading.document(self.c, research_read)
        live = self.wm["latest_live"]
        last = dict(zip(self.v5["columns"], self.v5["series"][-1]))
        self.assertEqual(doc["date"], stores.RESEARCH_END)
        self.assertEqual(
            {k: doc[k] for k in ("date", "egx30", "warning", "score", "outside", "gold", "oil", "swings",
                                 "vol20", "volBrakeActive", "equityPercent", "partialPercent")},
            {"date": live["date"], "egx30": live["price"], "warning": bool(live["al_v2"]), "score": live["s_v4"],
             "outside": live["wm_p"], "gold": live["gold_stress"], "oil": live["petrol_stress"],
             "swings": live["vol_stress"], "vol20": live["vol20"], "volBrakeActive": live["vol_brake_active"],
             "equityPercent": live["active_equity_exposure"], "partialPercent": live["dynamic_hedge_p"]})
        self.assertEqual((doc["engineInternal"], doc["engineExternal"], doc["stressGroups"], doc["transmission"]),
                         (last["u_int"], last["u_ext"], last["stress_count"], bool(last["has_trans"])))
        self.assertEqual(doc["sessions"], [], "the research's own session is not a session after it")

    def test_every_session_of_the_world_monitor_series(self):
        cols = self.wm["timeline_columns"]
        start = self.c["start"]
        mine = {
            "al": lambda i: int(self.c["warning"][i]),
            "s_v4": lambda i: round(float(self.c["s_v4"][i]), 3),
            "wm_p": lambda i: round(float(self.c["outside"][i]), 3),
            "g": lambda i: round(float(self.c["gold"][i]), 2),
            "p": lambda i: round(float(self.c["oil"][i]), 2),
            "v": lambda i: round(float(self.c["swings"][i]), 2),
            "vol20": lambda i: round(float(self.c["vol20"][i]), 3),
            "w_cv5_p": lambda i: round(float(self.c["partial"][i]), 3),
            "w_cv2_cash_sma": lambda i: round(float(self.c["rule"][i]), 3),
        }
        self.assertEqual(len(self.wm["timeline"]), len(self.c["dates"]) - start)
        for k, row in enumerate(self.wm["timeline"]):
            i = start + k
            self.assertEqual(row[0], self.c["dates"][i])
            for name, value in mine.items():
                self.assertEqual(value(i), row[cols.index(name)], f"{name} on {row[0]}")

    def test_every_session_of_the_engine_series(self):
        cols = self.v5["columns"]
        start = self.c["start"]
        for k, row in enumerate(self.v5["series"]):
            i = start + k
            self.assertEqual(row[0], self.c["dates"][i])
            for name, key in (("s_v4", "s_v4"), ("s_slope", "s_slope5"), ("u_int", "u_int"), ("u_ext", "u_ext")):
                self.assertAlmostEqual(float(self.c[key][i]), row[cols.index(name)], delta=5.01e-5,
                                       msg=f"{name} on {row[0]}")
            self.assertEqual(int(self.c["stress_count"][i]), row[cols.index("stress_count")])
            self.assertEqual(int(self.c["transmission"][i]), row[cols.index("has_trans")])
            # This series was written from 2 January 2008 with its 20-session
            # returns starting there, so its first 20 catalysts are zero where
            # the warning's own (and the world monitor series') are not.
            if k >= 20:
                for name in ("cat_comm", "cat_volrisk"):
                    self.assertAlmostEqual(float(self.c[name][i]), row[cols.index(name)], delta=5.01e-5,
                                           msg=f"{name} on {row[0]}")

    def test_the_warnings_are_the_published_episodes(self):
        episodes = json.loads((BACKTEST / "c_v2_alert_episodes.json").read_text(encoding="utf-8"))
        on = {self.c["dates"][i] for i in range(len(self.c["dates"])) if self.c["warning"][i]}
        published = set()
        for episode in episodes:
            published |= {d for d in self.c["dates"] if episode["start"] <= d <= episode["end"]}
        self.assertEqual(on - {d for d in on if d < "2008-01-01"}, published)


class TheSavedFits(unittest.TestCase):
    def test_every_research_year_has_its_four_classifiers(self):
        fits = reading.load_fits()
        years = sorted({int(key.split(":")[0]) for key in fits})
        self.assertEqual(years, list(range(2008, 2027)))
        for year in years:
            for name, width in (("a", 13), ("b", 14), ("early", 13), ("strategic", 13)):
                saved = fits[f"{year}:{name}"]
                self.assertEqual(saved["classes"], [0, 1])
                self.assertEqual(len(saved["coef"]), width, f"{year}:{name}")
                self.assertEqual(len(saved["intercept"]), 1)


class AddingSessionsMovesNothingBefore(unittest.TestCase):
    def test_the_research_figures_survive_sessions_into_the_next_year(self):
        metadata, rows, before = research()
        # 90 sessions after the research, into January 2027, which is a new
        # test year: its models are fitted, and must not reach back.
        day = dt.date.fromisoformat(stores.RESEARCH_END)
        extra = []
        last = rows[-1]
        while len(extra) < 90:
            day += dt.timedelta(days=1)
            if day.weekday() in (4, 5):
                continue
            step = 1.0 + 0.004 * np.sin(len(extra))
            last = {**last, "date": day.isoformat(), "price_egx30": round(last["price_egx30"] * step, 2),
                    "return_egx30": round(step - 1.0, 5)}
            extra.append(last)
        after = reading.compute(rows + extra, metadata, research_read)
        self.assertTrue(any(d.startswith("2027-") for d in after["dates"]))
        n = len(rows)
        for key in ("s_v4", "s_slope5", "u_int", "u_ext", "stress_count", "warning", "outside", "partial", "rule"):
            np.testing.assert_array_equal(np.asarray(after[key])[:n], np.asarray(before[key]), err_msg=key)
        doc = reading.document(after, research_read)
        self.assertEqual(len(doc["sessions"]), 90)
        self.assertGreater(doc["sessions"][0]["date"], stores.RESEARCH_END)


class TheStores(unittest.TestCase):
    def test_the_research_sessions_are_never_rewritten(self):
        held = {"2026-09-07": 1.0, "2026-09-08": 2.0, "2026-09-09": 3.0}
        fetched = {"2026-09-07": 9.0, "2026-09-08": 9.0, "2026-09-09": 4.0, "2026-09-10": 5.0}
        # 9 September was read mid-session, so its close replaces it.
        self.assertEqual(stores.merge(held, fetched, "2026-09-12"),
                         {"2026-09-07": 1.0, "2026-09-08": 2.0, "2026-09-09": 4.0, "2026-09-10": 5.0})

    def test_a_day_that_has_not_ended_is_not_taken(self):
        fetched = {"2026-09-16": 1.0, "2026-09-17": 2.0}
        self.assertEqual(stores.merge({}, fetched, "2026-09-17"), {"2026-09-16": 1.0})

    def test_a_session_the_fetch_left_out_is_kept(self):
        held = {"2026-09-14": 1.0, "2026-09-15": 2.0}
        self.assertEqual(stores.merge(held, {"2026-09-15": 3.0}, "2026-09-17"),
                         {"2026-09-14": 1.0, "2026-09-15": 3.0})

    def test_every_store_rewrites_to_its_own_bytes(self):
        for name in stores.STORES:
            raw = stores.path(name).read_text(encoding="utf-8")
            self.assertEqual(json.dumps(stores.read(name), indent=stores.STORES[name][1]), raw, name)

    def test_the_research_inputs_are_kept_for_the_replay(self):
        self.assertEqual(set(RESEARCH_DAY), set(stores.STORES))
        # EEM, the Merval and the Bovespa had no bar for 9 September yet.
        self.assertEqual({name for name, value in RESEARCH_DAY.items() if value is None},
                         {"msci_em", "argentina_merval", "brazil_bovespa"})
        self.assertEqual(RESEARCH_DAY["egx30"], 56280.3984)


class TheLiveDataset(unittest.TestCase):
    def test_it_is_the_research_then_the_sessions_after(self):
        research_meta, research_rows = reading.research_dataset()
        kept = [row for row in research_rows if row["date"] <= stores.COMPLETE_THROUGH]
        metadata, rows = reading.live_dataset()
        self.assertEqual(rows[:len(kept)], kept)
        self.assertTrue(all(row["date"] > stores.COMPLETE_THROUGH for row in rows[len(kept):]))
        self.assertEqual(metadata["episodes"][:len(research_meta["episodes"])], research_meta["episodes"])


class ThePublishedReading(unittest.TestCase):
    def test_its_shape(self):
        doc = json.loads(reading.OUT.read_text(encoding="utf-8"))
        self.assertEqual(doc["schemaVersion"], 2)
        self.assertGreaterEqual(doc["date"], stores.RESEARCH_END)
        self.assertEqual(doc["researchEnd"], stores.RESEARCH_END)
        self.assertGreater(doc["sessions"][0]["date"], stores.RESEARCH_END)
        self.assertEqual(doc["sessions"][-1]["date"], doc["date"])
        self.assertEqual(set(doc["inputs"]), set(stores.STORES))
        for key in ("score", "engineInternal", "engineExternal", "outside", "gold", "oil", "swings"):
            self.assertTrue(0.0 <= doc[key] <= 1.0, key)
        for key in ("rulePercent", "equityPercent", "partialPercent"):
            self.assertTrue(0.0 <= doc[key] <= 100.0, key)

    def test_a_stale_input_is_named(self):
        doc = {"date": "2026-09-16", "inputs": {"gold": "2026-09-01", "vix": "2026-09-16"}}
        said = reading.stale(doc, "2026-09-17")
        self.assertEqual(len(said), 1)
        self.assertIn("gold ends on 2026-09-01", said[0])
        self.assertEqual(reading.stale({"date": "2026-09-01", "inputs": {}}, "2026-09-17"),
                         ["the newest EGX 30 session is 2026-09-01, 16 days ago"])


if __name__ == "__main__":
    unittest.main()
