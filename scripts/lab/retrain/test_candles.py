"""The pilot's promises about its training windows (plan, stage 1, step 2)."""

import datetime
import unittest

import numpy as np

import candles as cd


def daily(closes, start="2023-01-01", step_days=1):
    day = datetime.date.fromisoformat(start)
    out = []
    for c in closes:
        out.append({"date": day.isoformat(), "open": c, "high": c * 1.01, "low": c * 0.99, "close": c, "volume": 1000})
        day += datetime.timedelta(days=step_days)
    return out


class ScaleTest(unittest.TestCase):
    def test_no_future_candle_reaches_the_scale(self):
        rng = np.random.default_rng(1)
        x = rng.normal(100, 5, size=(cd.WINDOW, 6)).astype(np.float32)
        changed = x.copy()
        changed[cd.LOOKBACK:] *= 3.0   # a future that tripled
        a, b = cd.scale(x), cd.scale(changed)
        np.testing.assert_array_equal(a[:cd.LOOKBACK], b[:cd.LOOKBACK])
        past = x[:cd.LOOKBACK].astype(np.float64)
        expected = np.clip((changed[cd.LOOKBACK:] - past.mean(0)) / (past.std(0) + 1e-5), -cd.CLIP, cd.CLIP)
        np.testing.assert_allclose(b[cd.LOOKBACK:], expected, rtol=1e-5)

    def test_a_trend_that_continues_stays_above_the_past(self):
        # Scaled over the whole window, a steady rise is centred on zero and its
        # last candles sit where its first ones mirror them. Scaled by the past,
        # a future that kept rising stays above every past value.
        x = np.tile(np.linspace(100, 160, cd.WINDOW, dtype=np.float32)[:, None], (1, 6))
        z = cd.scale(x)
        self.assertGreater(z[cd.LOOKBACK:, 3].min(), z[:cd.LOOKBACK, 3].max())
        whole = (x - x.mean(0)) / (x.std(0) + 1e-5)
        self.assertAlmostEqual(float(whole[:, 3].mean()), 0.0, places=4)


class SegmentTest(unittest.TestCase):
    def test_a_long_gap_or_an_impossible_step_cuts_the_series(self):
        bars = daily([10.0] * 5) + daily([10.0] * 5, start="2023-03-01")
        self.assertEqual([len(s) for s in cd.segments(bars)], [5, 5])
        bars = daily([10.0] * 5 + [21.0] + [21.0] * 4)
        self.assertEqual([len(s) for s in cd.segments(bars)], [5, 5])
        self.assertEqual([len(s) for s in cd.segments(daily([10.0, 12.0, 14.4, 17.28]))], [4])

    def test_windows_never_cross_a_cut(self):
        first = daily(list(np.linspace(10, 11, 150)), start="2020-01-01")
        second = daily(list(np.linspace(30, 31, 150)), start=first[-1]["date"])[1:]
        second = [dict(b, date=(datetime.date.fromisoformat(b["date"]) + datetime.timedelta(days=60)).isoformat()) for b in second]
        panel = cd.Panel({"AAA": first + second})
        self.assertEqual(len(panel.names), 2)
        for s, start in panel.windows["train"]:
            self.assertLessEqual(start + cd.WINDOW, len(panel.x[s]))


class SplitTest(unittest.TestCase):
    def test_a_window_straddling_a_boundary_belongs_to_neither_side(self):
        self.assertEqual(cd.split_of("2023-06-01", "2023-06-30"), "train")
        self.assertIsNone(cd.split_of("2023-12-20", "2024-01-15"))
        self.assertEqual(cd.split_of("2024-03-01", "2024-03-28"), "validation")
        self.assertIsNone(cd.split_of("2024-12-20", "2025-01-10"))
        self.assertEqual(cd.split_of("2026-07-01", "2026-07-29"), "test")
        self.assertIsNone(cd.split_of("2026-07-31", "2026-08-27"))

    def test_every_window_sits_wholly_inside_its_split(self):
        bars = daily(list(100 + np.cumsum(np.full(900, 0.01))), start="2023-06-01")
        panel = cd.Panel({"AAA": bars})
        seen = set()
        for split, pairs in panel.windows.items():
            first, last = cd.SPLITS[split]
            for s, start in pairs:
                dates = panel.dates[s][start:start + cd.WINDOW]
                origin = dates[cd.LOOKBACK - 1]
                self.assertTrue(first <= origin <= last and first <= dates[-1] <= last)
                seen.add(split)
        self.assertEqual(seen, {"train", "validation", "test"})


class CleanTest(unittest.TestCase):
    def test_bad_candles_and_over_the_counter_trades_are_dropped(self):
        bars = daily([10.0] * 6)
        bars[1] = dict(bars[1], low=0)
        bars[2] = dict(bars[2], high=bars[2]["close"] * 0.9)
        bars[3] = dict(bars[3], volume=None)
        kept, dropped = cd.clean(bars + [dict(bars[4])], delisted_on=bars[5]["date"])
        self.assertEqual([b["date"] for b in kept], [bars[0]["date"], bars[3]["date"], bars[4]["date"]])
        self.assertEqual(kept[1]["volume"], 0.0)
        self.assertEqual(dropped, {"malformed": 2, "duplicate": 1, "afterDelisting": 1})

    def test_amount_is_what_the_predictor_would_have_built(self):
        x = cd.features([{"open": 1, "high": 3, "low": 1, "close": 3, "volume": 10}])
        self.assertAlmostEqual(float(x[0, 5]), 10 * 2.0)


if __name__ == "__main__":
    unittest.main()
