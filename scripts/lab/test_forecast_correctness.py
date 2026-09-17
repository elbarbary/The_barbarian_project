"""Offline correctness checks: no weights, external API calls or paid inference."""
import datetime
import gzip
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch

import eligibility as el
import forecast as fc
import neural
import publish as pb
import rerank as rr
import run


class ForecastCorrectness(unittest.TestCase):
    def test_thursday_forecasts_sunday_not_friday(self):
        self.assertEqual(neural.future_sessions('2026-09-17', 5),
                         ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24'])

    def test_announced_closures_are_skipped(self):
        self.assertEqual(neural.future_sessions('2026-09-17', 1, ['2026-09-20']), ['2026-09-21'])

    def test_path_horizons_and_basis_are_frozen(self):
        out = neural.path_forecast('AAA', '2026-09-17', 'kronos', list(range(101, 121)), 100)
        self.assertAlmostEqual(out.returns[1], 1)
        self.assertAlmostEqual(out.returns[5], 5)
        self.assertAlmostEqual(out.returns[20], 20)
        record = run.as_record(out)
        self.assertEqual(record['price_path'], list(range(101, 121)))
        self.assertEqual(record['basis_close'], 100)

    def test_incomplete_invalid_paths_abstain(self):
        for path in ([1] * 19, [1] * 19 + [float('nan')], [1] * 19 + [0], [1] * 19 + [-1]):
            self.assertIsInstance(neural.path_forecast('AAA', '2026-09-17', 'kronos', path, 1), fc.Abstention)
        for basis in [0, -1, float('nan'), float('inf')]:
            self.assertIsInstance(neural.path_forecast('AAA', '2026-09-17', 'kronos', [1] * 20, basis), fc.Abstention)

    def test_listing_effective_date(self):
        row = {'listing': {'status': 'delisted', 'market': 'OTC', 'delisted_on': '2026-09-01'}}
        self.assertIsNone(el.exclusion(row, '2026-08-31'))
        self.assertIn('OTC', el.exclusion(row, '2026-09-01'))
        self.assertIn('OTC', el.exclusion(row))

    def test_real_tora_overlay_is_used_without_hardcoding_the_ticker(self):
        self.assertIn('OTC', el.exclusion(el.directory()['TORA']))

    def test_stale_and_unknown_financials_not_treated_as_current(self):
        self.assertIn('financial period over 270 days old', el.risk_facts({'net_income_period': 'FY 2019'}, {}, '2026-09-16')['flags'])
        self.assertIn('financial recency unverified', el.risk_facts({}, {}, '2026-09-16')['flags'])
        self.assertEqual(el.risk_facts({}, {'net_income_period': 'H1 2026'}, '2026-09-16')['flags'], [])

    def test_risk_trail_requires_explicit_dated_body_not_title(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = pathlib.Path(tmp)
            item = {'code': 3, 'dateStamp': '2026-07-20T16:10:27', 'content':
                    'Reuters Code : BIOC.CA<br>There is no material information that justify the stock movement.'}
            doc = {'items': [item, dict(item, dateStamp='2026-09-30', code=4),
                             dict(item, content='Reuters Code : AAA.CA', heading='No material information')]}
            (path / '2026-07.json.gz').write_bytes(gzip.compress(json.dumps(doc).encode()))
            events = el.issuer_clarifications('2026-09-16', path)
            self.assertEqual(list(events), ['BIOC'])
            self.assertEqual([e['id'] for e in events['BIOC']], [3])
            self.assertEqual(el.issuer_clarifications('2026-11-16', path), {})

    def test_safety_is_mandatory_even_with_optional_context_off(self):
        context = {'safety': {'text': 'dated issuer denial; missing financials'}}
        for layers in rr.readings():
            prompt = rr.prompt('2026-09-16', 'AAA,1', 1, context, layers)
            self.assertIn('dated issuer denial; missing financials', prompt)
            self.assertIn('Never infer manipulation', prompt)

    def test_otc_does_not_reach_gemini_or_current_publication(self):
        document = {'basisSession': '2026-09-16', 'universe': ['AAA', 'TORA'],
                    'models': {'kronos': {'forecasts': [{'ticker': t, 'returns': {'1': 1, '5': 2, '20': 3}}
                                                       for t in ['AAA', 'TORA']]}}}
        asked = []
        def ask(text):
            asked.append(text)
            return '{"scores":{"AAA":30,"TORA":100},"count":1}', {}
        ranked = rr.rank(document, today='2026-09-16', ask=ask)
        self.assertNotIn('TORA', asked[0])
        self.assertEqual([r['ticker'] for r in ranked['forecasts']], ['AAA'])
        scenes = pb.scenarios(document, {}, ['2026-09-16'])
        self.assertNotIn('TORA', scenes['companies'])
        self.assertIn('OTC', scenes['leftOut']['TORA'])

    def test_stale_basis_is_not_sent_to_model(self):
        asked = []
        rows = [{'ticker': 'AAA', 'bars': [{'date': '2026-09-15', 'close': 1}] * 90}]
        out = run.run_models(rows, '2026-09-16', {'probe': lambda *args: asked.append(args)})
        self.assertEqual(asked, [])
        self.assertEqual(len(out['abstentions']['probe']), 1)

    def test_publisher_carries_prices_without_recomputing_model(self):
        record = run.as_record(neural.path_forecast('AAA', '2026-09-16', 'kronos', list(range(101, 121)), 100))
        doc = {'basisSession': '2026-09-16', 'models': {'kronos': {'forecasts': [record]}}}
        panel = {'AAA': {'2026-09-16': {'date': '2026-09-16', 'close': 100},
                         '2026-09-17': {'date': '2026-09-17', 'close': 200}}}
        row = pb.scenarios(doc, panel, ['2026-09-16', '2026-09-17'])['companies']['AAA']
        self.assertEqual(row['close'], 100)
        self.assertEqual(row['latestClose'], 200)
        self.assertEqual(row['models']['kronos']['basisClose'], 100)
        self.assertEqual(row['models']['kronos']['pricePath'][-1], 120)


if __name__ == '__main__':
    unittest.main()
