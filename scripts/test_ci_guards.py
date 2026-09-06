#!/usr/bin/env python3
"""The two guards that failed nine of twenty-two builds on 6 Sep 2026.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""
from __future__ import annotations

import datetime
import pathlib
import re
import sys
import unittest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import audit_accuracy  # noqa: E402
from build_staleness_guard import sessions_between  # noqa: E402


class StalenessUnitTest(unittest.TestCase):
    """The weekend is not staleness.

    Thursday is the last trading day; Friday and Saturday are not. Counting
    calendar days made Thursday's archive read as THREE days behind every
    Sunday morning, tripping the `behind >= 2` branch before the local
    harvest's first run of the week — two red builds at 05:34 and 05:41 UTC
    for an archive exactly as current as the exchange had left it.
    """

    def test_the_weekend_does_not_age_the_archive(self):
        thu, sun = datetime.date(2026, 9, 3), datetime.date(2026, 9, 6)
        self.assertEqual((sun - thu).days, 3, 'three calendar days, as it always was')
        self.assertEqual(sessions_between(thu, sun), 1, 'but one trading session')

    def test_a_frozen_archive_still_ages(self):
        thu = datetime.date(2026, 9, 3)
        # Sun, Mon, Tue — it climbs at the same rate it always did.
        self.assertEqual(sessions_between(thu, datetime.date(2026, 9, 7)), 2)
        self.assertEqual(sessions_between(thu, datetime.date(2026, 9, 8)), 3)
        self.assertEqual(sessions_between(thu, datetime.date(2026, 9, 10)), 5)

    def test_today_and_the_future_are_never_behind(self):
        d = datetime.date(2026, 9, 6)
        self.assertEqual(sessions_between(d, d), 0)
        self.assertEqual(sessions_between(d, datetime.date(2026, 9, 5)), 0)


class PriceEarningsTest(unittest.TestCase):
    """A multiple is checked against the price it was divided from.

    `companies.json` is rebuilt a few times a day; `market.json` every hour of
    the session. Reading the published P/E against the market document's close
    compares two different moments: SIPC's 133.75 came off a close of 5.35 and
    was read against 6.30 after a 20% move, and the audit called the gap a
    contradiction. That failed every build from mid-session on 6 Sep 2026.
    """

    def row(self, **over):
        base = {'ticker': 'SIPC', 'pe': 133.75, 'eps': 0.04, 'pe_close': 5.35,
                'sector': 'Banks', 'market_cap': 1e9}
        base.update(over)
        return base

    def kinds(self, row, quote):
        today = datetime.date(2026, 9, 6)
        faults = audit_accuracy.audit_one(row, None, quote, today, {})
        return {f['kind'] for f in faults}

    def test_a_price_that_moved_is_not_a_contradiction(self):
        # The multiple divides out against its own denominator; the market has
        # since moved 20%. That is a moving price, not a document disagreeing
        # with itself.
        got = self.kinds(self.row(), {'close': 6.30})
        self.assertNotIn('pe_vs_eps', got)

    def test_a_multiple_that_does_not_divide_out_is_still_caught(self):
        # Same denominator, wrong ratio: this is the fault the check exists for.
        got = self.kinds(self.row(pe=99.0), {'close': 5.35})
        self.assertIn('pe_vs_eps', got)

    def test_nothing_is_claimed_without_a_denominator(self):
        # A directory written before `pe_close` existed: there is nothing to
        # check against, so nothing is asserted rather than a fault invented
        # from a price the ratio never saw.
        row = self.row()
        del row['pe_close']
        self.assertNotIn('pe_vs_eps', self.kinds(row, {'close': 6.30}))


class WorkflowCeilingTest(unittest.TestCase):
    """Every workflow has a ceiling, because one of them wedged for 71 minutes.

    Regex rather than PyYAML, as the other workflow tests do: the runner has no
    PyYAML and a test that skips on the machine it protects is not a test.
    """

    WORKFLOWS = HERE.parent / '.github' / 'workflows'

    def test_every_workflow_bounds_itself(self):
        found = sorted(self.WORKFLOWS.glob('*.yml'))
        self.assertGreaterEqual(len(found), 5)
        for path in found:
            with self.subTest(workflow=path.name):
                source = path.read_text(encoding='utf-8')
                m = re.search(r'(?m)^\s*timeout-minutes:\s*(\d+)', source)
                self.assertIsNotNone(
                    m, f'{path.name} can run to GitHub\'s six-hour default')
                self.assertLessEqual(int(m.group(1)), 120,
                                     f'{path.name} bounds nothing useful')


if __name__ == '__main__':
    unittest.main()
