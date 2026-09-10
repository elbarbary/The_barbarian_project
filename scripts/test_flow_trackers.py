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
