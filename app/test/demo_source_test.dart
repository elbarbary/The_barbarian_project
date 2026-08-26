import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:barbarian/core/networking/document_source.dart';

import 'support/harness.dart';

/// A guest must never see real market data: every ticker becomes DEMOn, every
/// name becomes a Sample Co, every figure an obviously-round fake — and the
/// app must still be able to open a company by its demo ticker.
void main() {
  final demo = DemoDocumentSource(const DiskFixtureSource());

  test('the directory is relabelled — no real ticker or name survives', () async {
    final raw = await demo.fetch('companies.json');
    final list = (jsonDecode(raw) as Map<String, dynamic>)['companies'] as List;
    expect(list, isNotEmpty);
    for (final e in list.cast<Map<String, dynamic>>()) {
      expect(e['ticker'], matches(RegExp(r'^DEMO\d+$')));
      expect(e['name_en'], startsWith('Sample Co'));
    }
    expect(raw.contains('"COMI"'), isFalse);
    expect(raw.contains('Commercial International Bank'), isFalse);
  });

  test('market rows are keyed by demo tickers with faked, round numbers', () async {
    final market = jsonDecode(await demo.fetch('market.json')) as Map<String, dynamic>;
    final stocks = market['stocks'] as Map<String, dynamic>;
    expect(stocks.keys, everyElement(matches(RegExp(r'^DEMO\d+$'))));
    final row = stocks.values.first as Map<String, dynamic>;
    final close = (row['close'] as num).abs().toDouble();
    final lead = close / math.pow(10, (math.log(close) / math.ln10).floor());
    expect((lead - lead.round()).abs() < 1e-9, isTrue,
        reason: 'close $close should be a single-significant-digit fake');
  });

  test('a company opens by its demo ticker (reverse path mapping)', () async {
    final list = (jsonDecode(await demo.fetch('companies.json')) as Map<String, dynamic>)['companies'] as List;
    final demoTicker = (list.first as Map)['ticker'] as String;
    final doc = jsonDecode(await demo.fetch('companies/$demoTicker.json'))
        as Map<String, dynamic>;
    expect(doc['ticker'], demoTicker);
    expect((doc['name'] as Map)['en'], startsWith('Sample Co'));
    expect(doc['financials'], isNotNull);
  });

  test('a company reads the same Sample Co in the list and on its page', () async {
    final list = (jsonDecode(await demo.fetch('companies.json'))
        as Map<String, dynamic>)['companies'] as List;
    final entry = list.first as Map<String, dynamic>;
    final demoTicker = entry['ticker'] as String;
    final listName = entry['name_en'] as String;
    final doc = jsonDecode(await demo.fetch('companies/$demoTicker.json'))
        as Map<String, dynamic>;
    final pageName = (doc['name'] as Map)['en'] as String;
    expect(pageName, listName,
        reason: 'the directory and the company page must agree on the name');
  });
}
