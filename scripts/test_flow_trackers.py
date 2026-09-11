import unittest
from build_flow_trackers import build


class FlowTrackersTest(unittest.TestCase):
    def fixture(self):
        companies = {'companies': [
            {'ticker': 'A', 'sector': 'Banks', 'market_cap': 900},
            {'ticker': 'B', 'sector': 'Banks', 'market_cap': 100},
            {'ticker': 'USD', 'sector': 'Banks', 'market_cap': 500, 'currency': 'USD'}]}
        market = {'date': '2026-09-10', 'is_close': False, 'stocks': {
            'A': {'close': 11, 'volume': 10}, 'B': {'close': 9, 'volume': 20},
            'USD': {'close': 2, 'volume': 100}}}
        docs = {t: {'profile': {'shares_outstanding': 100},
                     'market': {'date': '2026-09-10'},
                     'price_history': [{'date': '2026-09-09', 'close': 10, 'volume': 2}]}
                for t in ['A', 'B', 'USD']}
        events = {'asOf': '2026-09-10', 'items': [
            {'id': 'r1', 'ticker': 'A', 'shares': 5, 'date': '2026-09-09', 'action': 'bought'},
            {'id': 'r2', 'ticker': 'A', 'shares': None, 'date': '2026-09-10', 'action': 'disclosure'}]}
        return companies, market, docs, events

    def test_weighted_move_not_simple_mean(self):
        result = build(*self.fixture())
        day = result['sectors'][0]['history'][-1]
        self.assertAlmostEqual(day['change'], 8)
        self.assertEqual(day['upCap'], 900)
        self.assertEqual(day['downCap'], 100)
        self.assertEqual(day['value'], 290)
        self.assertFalse(result['isClose'])

    def test_currency_exclusion(self):
        result = build(*self.fixture())
        self.assertEqual(result['sectors'][0]['cap'], 1000)
        self.assertEqual(result['excludedCurrencyCount'], 1)

    def test_stake_reference_is_not_actual_ownership(self):
        result = build(*self.fixture())
        row = result['events'][0]
        self.assertEqual(row['referencePercent'], 5)
        self.assertEqual(row['currentMarkedValue'], 55)
        self.assertNotIn('ownershipAfterPercent', row)
        self.assertIsNone(result['events'][1]['referencePercent'])
        self.assertIsNone(result['events'][1]['currentMarkedValue'])

    def test_exact_value_must_match_session(self):
        args = self.fixture()
        args[2]['A']['profile']['turnover'] = 999
        result = build(*args)
        self.assertEqual(result['sectors'][0]['history'][-1]['value'], 1179)
        args[2]['A']['market']['date'] = '2026-09-08'
        result = build(*args)
        self.assertEqual(result['sectors'][0]['history'][-1]['value'], 290)

    def test_unknown_values_not_zero_and_discontinuities_withheld(self):
        args = self.fixture()
        args[1]['stocks']['A'] = {'close': 100, 'volume': None}
        args[1]['stocks']['B'] = {'close': 9, 'volume': None}
        result = build(*args)
        day = result['sectors'][0]['history'][-1]
        self.assertIsNone(day['value'])
        self.assertEqual(day['flagged'], 1)
        self.assertAlmostEqual(day['change'], -10)
        self.assertEqual(day['weightCoverage'], 10)

    def test_duplicate_ids_are_not_counted_twice(self):
        args = self.fixture()
        args[3]['items'].append(args[3]['items'][0].copy())
        self.assertEqual(len(build(*args)['events']), 2)

    def test_invalid_denominator_stays_unknown(self):
        args = self.fixture()
        args[2]['A']['profile']['shares_outstanding'] = 0
        self.assertIsNone(build(*args)['events'][0]['referencePercent'])

    def test_future_history_is_not_leaked(self):
        args = self.fixture()
        args[2]['A']['price_history'].append({'date': '2027-01-01', 'close': 50})
        self.assertEqual(build(*args)['sectors'][0]['history'][-1]['date'], '2026-09-10')

    def test_missing_previous_session_is_not_a_daily_return(self):
        args = self.fixture()
        args[2]['A']['price_history'] = [{'date': '2026-09-08', 'close': 10}]
        day = build(*args)['sectors'][0]['history'][-1]
        self.assertAlmostEqual(day['change'], -10)
        self.assertEqual(day['weightCoverage'], 10)

    def test_currency_history_is_retained_for_individual_company(self):
        args = self.fixture()
        args[3]['items'].append({'id': 'usd', 'ticker': 'USD', 'shares': 10})
        result = build(*args)
        self.assertEqual(result['profiles']['USD']['prices'][-1]['close'], 2)
        self.assertEqual(result['excludedCurrencyCount'], 1)


if __name__ == '__main__':
    unittest.main()


class MonthsOfMoney(unittest.TestCase):
    """Turnover added up by calendar month, and what makes a month comparable.

    The trap every one of these guards is the same: the archive has more
    companies in it now than it had a year ago, so a month aggregated without a
    coverage floor shows money arriving when what arrived was data.
    """

    def month_fixture(self, history_a, history_b=None, as_of='2026-09-10'):
        companies = {'companies': [
            {'ticker': 'A', 'sector': 'Banks', 'market_cap': 900},
            {'ticker': 'B', 'sector': 'Banks', 'market_cap': 100}]}
        market = {'date': as_of, 'is_close': True, 'stocks': {}}
        docs = {'A': {'profile': {}, 'market': {}, 'price_history': history_a},
                'B': {'profile': {}, 'market': {},
                      'price_history': history_b if history_b is not None else []}}
        return build(companies, market, docs, {'asOf': as_of, 'items': []})

    @staticmethod
    def bars(dates, close=10, volume=10):
        return [{'date': d, 'close': close, 'volume': volume} for d in dates]

    def full(self, month, days=(2, 10, 20, 27)):
        return [f'{month}-{d:02d}' for d in days]

    def test_a_month_is_the_sum_of_the_sessions_in_it(self):
        result = self.month_fixture(
            self.bars(self.full('2026-07') + self.full('2026-08')),
            self.bars(self.full('2026-07') + self.full('2026-08')))
        months = {m['month']: m for m in result['sectors'][0]['months']}
        # Two companies at 10 x 10 over four sessions each.
        self.assertEqual(months['2026-07']['value'], 800)
        self.assertEqual(months['2026-07']['sessions'], 4)
        self.assertEqual(months['2026-07']['companies'], 2)

    def test_a_month_carries_no_return_of_any_kind(self):
        # Compounding a month of daily moves at today's fixed market-cap
        # weights would state a sector return this project does not publish.
        result = self.month_fixture(self.bars(self.full('2026-07')))
        for month in result['sectors'][0]['months']:
            for key in month:
                self.assertNotIn(key, ('change', 'return', 'performance'))

    def test_a_thinly_covered_month_is_held_back_and_named(self):
        # July has one of the sector's two companies in it — 50%, under the
        # floor. August has both.
        result = self.month_fixture(
            self.bars(self.full('2026-07') + self.full('2026-08')),
            self.bars(self.full('2026-08')))
        self.assertEqual(result['monthly']['from_'], '2026-08')
        self.assertIn('2026-07', result['monthly']['held'])
        self.assertEqual([m['month'] for m in result['sectors'][0]['months']],
                         ['2026-08'])

    def test_every_sector_starts_at_the_same_month(self):
        companies = {'companies': [
            {'ticker': 'A', 'sector': 'Banks', 'market_cap': 900},
            {'ticker': 'C', 'sector': 'Food', 'market_cap': 500}]}
        docs = {'A': {'profile': {}, 'market': {},
                      'price_history': self.bars(self.full('2026-07') + self.full('2026-08'))},
                'C': {'profile': {}, 'market': {},
                      'price_history': self.bars(self.full('2026-07') + self.full('2026-08'))}}
        result = build(companies, {'date': '2026-09-10', 'stocks': {}}, docs,
                       {'asOf': '2026-09-10', 'items': []})
        starts = {s['id']: s['months'][0]['month'] for s in result['sectors']
                  if s['months']}
        self.assertEqual(len(set(starts.values())), 1, starts)

    def test_the_running_month_and_a_half_month_are_both_marked_partial(self):
        result = self.month_fixture(
            self.bars(self.full('2026-07')                 # whole month
                      + ['2026-08-18', '2026-08-27']       # joined late
                      + ['2026-09-01', '2026-09-08']),     # still running
            self.bars(self.full('2026-07')
                      + ['2026-08-18', '2026-08-27']
                      + ['2026-09-01', '2026-09-08']))
        months = {m['month']: m for m in result['sectors'][0]['months']}
        self.assertFalse(months['2026-07']['partial'])
        self.assertTrue(months['2026-08']['partial'], 'a month joined on the 18th')
        self.assertTrue(months['2026-09']['partial'], 'the month still running')

    def test_the_exchange_total_is_what_the_sectors_hold(self):
        result = self.month_fixture(
            self.bars(self.full('2026-07') + self.full('2026-08')),
            self.bars(self.full('2026-07') + self.full('2026-08')))
        for row in result['monthly']['months']:
            mine = sum(m['value'] for s in result['sectors']
                       for m in s['months'] if m['month'] == row['month'])
            self.assertAlmostEqual(row['value'], round(mine, 2), places=2)

    def test_no_months_at_all_rather_than_one_uncomparable_month(self):
        result = self.month_fixture([], [])
        self.assertEqual(result['monthly']['months'], [])
