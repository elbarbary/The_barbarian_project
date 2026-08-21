#!/usr/bin/env python3
"""The checks that stop somebody else's prices becoming this company's chart.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import fetch_price_history as fp  # noqa: E402
from fetch_price_history import align as align_series  # noqa: E402

# Real El Sewedy rows, in the order the file publishes them. There is no header
# line, so this order is the thing under test.
SAMPLE = "\n".join(
    [
        "2026-08-11/00:00:00,108.0,111.0,106.51,109.3,1234567",
        "2026-08-12/00:00:00,109.3,112.12,107.0,107.11,987654",
        "2026-08-16/00:00:00,107.53,128.9,108.0,120.9,4166754",
        "2026-08-18/00:00:00,122.12,133.98,121.0,127.25,2711205",
        "2026-08-20/00:00:00,118.11,120.97,115.0,116.0,649885",
    ]
)


class ParseTest(unittest.TestCase):
    def test_the_fifth_column_is_the_close(self):
        # Established by matching 233 overlapping sessions against our own
        # closes. Reading the first number as the close — the obvious guess,
        # since it is the one nearest the date — yields the open.
        bars = fp.parse_csv(SAMPLE)
        self.assertEqual(len(bars), 5)
        self.assertEqual(bars[-1]["date"], "2026-08-20")
        self.assertEqual(bars[-1]["close"], 116.0)
        self.assertEqual(bars[-1]["volume"], 649885)

    def test_rows_come_back_oldest_first(self):
        bars = fp.parse_csv(SAMPLE)
        self.assertEqual([b["date"] for b in bars], sorted(b["date"] for b in bars))

    def test_a_suspended_session_is_dropped_not_charted_as_zero(self):
        body = SAMPLE + "\n2026-08-21/00:00:00,0,0,0,0,0"
        self.assertEqual(len(fp.parse_csv(body)), 5)

    def test_junk_lines_are_ignored(self):
        self.assertEqual(fp.parse_csv("nonsense\n\n,,,,,\n"), [])


class VerifyTest(unittest.TestCase):
    def setUp(self):
        self._stored = fp.stored_closes

    def tearDown(self):
        fp.stored_closes = self._stored

    def _ours(self, mapping):
        fp.stored_closes = lambda _t: mapping

    def test_a_matching_series_is_accepted(self):
        self._ours({
            "2026-08-11": 109.3, "2026-08-12": 107.11, "2026-08-16": 120.9,
            "2026-08-18": 127.25, "2026-08-20": 116.0,
        })
        fp.verify("SWDY", fp.parse_csv(SAMPLE))

    def test_another_company_series_is_refused(self):
        # The failure this exists for: an opaque hash in a URL is not a name,
        # and the wrong file yields a complete, plausible chart.
        self._ours({
            "2026-08-11": 12.4, "2026-08-12": 12.1, "2026-08-16": 13.0,
            "2026-08-18": 12.8, "2026-08-20": 12.9,
        })
        with self.assertRaises(fp.PriceHistoryUnavailable) as caught:
            fp.verify("SWDY", fp.parse_csv(SAMPLE))
        self.assertIn("different company", str(caught.exception))

    def test_a_single_matching_close_is_enough(self):
        # 23 listings have no stored history at all and were refused for having
        # nothing to compare, while the market snapshot held a close for all
        # 282 the whole time. One dated close is a weaker anchor than sixty and
        # it still catches a series belonging to somebody else.
        self._ours({"2026-08-20": 116.0})
        fp.verify("SWDY", fp.parse_csv(SAMPLE))

    def test_a_single_close_that_differs_is_refused(self):
        # With one point there is no co-movement to measure, so it has to match
        # outright rather than merely hold a steady ratio.
        self._ours({"2026-08-20": 58.0})
        with self.assertRaises(fp.PriceHistoryUnavailable) as caught:
            fp.verify("SWDY", fp.parse_csv(SAMPLE))
        self.assertIn("same company", str(caught.exception))

    def test_nothing_stored_means_nothing_to_trust(self):
        # 23 listings hold no history at all, and an unverifiable series for
        # one of them is exactly how a wrong one would get in unnoticed.
        self._ours({})
        with self.assertRaises(fp.PriceHistoryUnavailable):
            fp.verify("SWDY", fp.parse_csv(SAMPLE))

    def test_an_empty_series_is_refused(self):
        self._ours({"2026-08-20": 116.0})
        with self.assertRaises(fp.PriceHistoryUnavailable):
            fp.verify("SWDY", [])

    def test_two_honest_feeds_rounding_apart_still_match(self):
        """The real near-miss, and why the tolerance is a whole percent.

        Al Arafa's 1 June is 7.32 on our feed and 7.35 on Mubasher's — three
        tenths of a percent, because the two round differently and sometimes
        take a different last print. At a tenth of a percent this rejected 121
        companies, nearly all at 81-89% agreement, while the failures it exists
        to catch sit at 12% and 53%.
        """
        body = "\n".join(
            f"2026-06-{d:02d}/00:00:00,1,1,1,{p},100" for d, p in [
                (1, 7.35), (2, 7.34), (3, 7.30), (4, 7.41), (5, 8.11),
            ]
        )
        self._ours({
            "2026-06-01": 7.32, "2026-06-02": 7.36, "2026-06-03": 7.30,
            "2026-06-04": 7.39, "2026-06-05": 8.14,
        })
        fp.verify("ADRI", fp.parse_csv(body))

    def test_a_whole_multiple_out_is_still_refused(self):
        # What the check is actually for: identity, not accuracy. A wrong
        # company is wrong by multiples, not by a rounding place.
        body = "\n".join(
            f"2026-06-{d:02d}/00:00:00,1,1,1,{p},100" for d, p in [
                (1, 73.2), (2, 73.6), (3, 73.0), (4, 73.9), (5, 81.4),
            ]
        )
        self._ours({
            "2026-06-01": 7.32, "2026-06-02": 7.36, "2026-06-03": 7.30,
            "2026-06-04": 7.39, "2026-06-05": 8.14,
        })
        with self.assertRaises(fp.PriceHistoryUnavailable):
            fp.verify("ADRI", fp.parse_csv(body))

    def test_rounding_is_not_a_disagreement(self):
        self._ours({
            "2026-08-11": 109.3, "2026-08-12": 107.11, "2026-08-16": 120.9,
            "2026-08-18": 127.2501, "2026-08-20": 115.999,
        })
        fp.verify("SWDY", fp.parse_csv(SAMPLE))


class AlignTest(unittest.TestCase):
    """Putting a raw series onto our adjusted basis.

    Our stored closes are split- and dividend-adjusted; Mubasher prints what
    traded. Joined unchanged, the chart steps on the day of every corporate
    action — a price that never happened, exactly where a reader is looking.
    """

    def test_a_corporate_action_is_adjusted_away(self):
        # The real case: Assiut Islamic Trading is 0.257 on ours against 0.310
        # on theirs in May, and matches exactly by August.
        bars = [
            {"date": "2026-05-13", "close": 0.310, "volume": 1},
            {"date": "2026-05-14", "close": 0.310, "volume": 1},
            {"date": "2026-08-16", "close": 0.540, "volume": 1},
        ]
        ours = {"2026-05-13": 0.257, "2026-05-14": 0.256, "2026-08-16": 0.540}
        out = {b["date"]: b["close"] for b in align_series(bars, ours)}
        self.assertAlmostEqual(out["2026-05-13"], 0.257, places=3)
        # Already on the same basis, so untouched.
        self.assertAlmostEqual(out["2026-08-16"], 0.540, places=3)

    def test_history_older_than_the_overlap_takes_the_oldest_factor(self):
        bars = [
            {"date": "2020-01-02", "close": 10.0, "volume": 1},
            {"date": "2026-05-13", "close": 0.310, "volume": 1},
            {"date": "2026-08-16", "close": 0.540, "volume": 1},
        ]
        ours = {"2026-05-13": 0.257, "2026-08-16": 0.540}
        out = {b["date"]: b["close"] for b in align_series(bars, ours)}
        # 10.0 * (0.257 / 0.310)
        self.assertAlmostEqual(out["2020-01-02"], 8.29, places=1)

    def test_ordinary_noise_is_left_alone(self):
        # Two feeds rounding differently is not a corporate action, and
        # rewriting every close to chase a third of a percent would be worse
        # than leaving them as filed.
        bars = [{"date": "2026-08-16", "close": 7.35, "volume": 1}]
        ours = {"2026-08-16": 7.32}
        out = align_series(bars, ours)
        self.assertAlmostEqual(out[0]["close"], 7.35, places=2)

    def test_nothing_to_align_against_returns_the_bars_unchanged(self):
        bars = [{"date": "2026-08-16", "close": 7.35, "volume": 1}]
        self.assertEqual(align_series(bars, {}), bars)


class SeamTest(unittest.TestCase):
    def setUp(self):
        self._stored = fp.stored_closes

    def tearDown(self):
        fp.stored_closes = self._stored

    def test_an_old_divergence_no_longer_rejects_a_real_match(self):
        """Judged over the whole overlap this reads as a different company."""
        rows, ours = [], {}
        for day in range(1, 25):
            rows.append(f"2026-06-{day:02d}/00:00:00,1,1,1,0.310,100")
            ours[f"2026-06-{day:02d}"] = 0.257          # pre-action, 20% apart
        for day in range(1, 25):
            rows.append(f"2026-08-{day:02d}/00:00:00,1,1,1,0.540,100")
            ours[f"2026-08-{day:02d}"] = 0.540          # post-action, identical
        fp.stored_closes = lambda _t: ours
        fp.verify("ASPI", fp.parse_csv("\n".join(rows)))


if __name__ == "__main__":
    unittest.main()
