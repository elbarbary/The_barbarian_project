import 'package:barbarian/core/models/company.dart';
import 'package:barbarian/core/models/market_snapshot.dart';
import 'package:barbarian/core/widgets/breadth_chart.dart';
import 'package:barbarian/core/widgets/charts.dart';
import 'package:barbarian/core/widgets/legal.dart';
import 'package:barbarian/core/widgets/nav.dart';
import 'package:barbarian/features/exchange/exchange_screen.dart';
import 'package:barbarian/features/exchange/index_levels.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// The screen behind the Home hero.
///
/// The hero answers "what did the exchange do" with one index level and a
/// breadth bar. This is where the other two indices, the shares that actually
/// moved and the sessions before today live. Its whole risk is §8: a screen
/// listing the day's biggest risers is one careless heading away from reading
/// as a tip sheet.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(useInMemoryPreferences);

  group('the ranking', () {
    late CompanyDirectory directory;

    setUp(() async {
      directory = CompanyDirectory.fromJson(
        await readFixtureObject('companies.json'),
      );
    });

    MarketSnapshot snapshotOf(Map<String, StockQuote> stocks) =>
        MarketSnapshot(date: '2026-08-23', stocks: stocks);

    test('a percentage taken from a nine-thousand-pound session is dropped', () {
      // The real case this exists for: SAIB closed +19.91% on a session worth
      // about nine thousand pounds. True, and not a fact about the exchange.
      final ticker = directory.companies.first.ticker;
      final thin = snapshotOf({
        ticker: const StockQuote(
          close: 3.0,
          previousClose: 2.5,
          volume: 3000,
        ),
      });

      expect(movers(directory: directory, snapshot: thin), isEmpty);
    });

    test('a real session survives it, and the order runs high to low', () {
      final tickers = directory.companies.take(3).map((c) => c.ticker).toList();
      final snapshot = snapshotOf({
        tickers[0]: const StockQuote(
          close: 100,
          previousClose: 95,
          volume: 500000,
        ),
        tickers[1]: const StockQuote(
          close: 90,
          previousClose: 100,
          volume: 500000,
        ),
        tickers[2]: const StockQuote(
          close: 50,
          previousClose: 50,
          volume: 500000,
        ),
      });

      final rows = movers(directory: directory, snapshot: snapshot);

      // The flat one is not a mover in either direction, and "did not move" is
      // a real state rather than a small rise.
      expect(rows.map((m) => m.ticker), [tickers[0], tickers[1]]);
      expect(rows.first.change, greaterThan(0));
      expect(rows.last.change, lessThan(0));
    });

    test('the feed cannot invent a company the directory has never heard of', () {
      // The phantom-listing bug, in the one place that would repeat it: the
      // universe is the directory, never the quote map.
      final snapshot = snapshotOf({
        'NOTREAL': const StockQuote(
          close: 10,
          previousClose: 5,
          volume: 5000000,
        ),
      });

      expect(movers(directory: directory, snapshot: snapshot), isEmpty);
    });
  });

  group('the screen', () {
    testWidgets('it draws all three indices, the movers and the breadth', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const ExchangeScreen(parentTab: BNavTab.home),
        until: find.byType(BIndexPanel),
      );
      await pumpUntil(tester, find.byType(BSparkline));

      // The selector is the point of the panel: the hero prints the 30 large
      // and the other two small, and a reader who came here about the 70
      // should be able to have it at the same size.
      expect(find.text('EGX 30'), findsWidgets);
      expect(find.text('EGX 70'), findsWidgets);
      expect(find.text('EGX 100'), findsWidgets);

      await pumpUntil(tester, find.text('WHAT ROSE AND WHAT FELL'));
      await pumpUntil(tester, find.byType(BBreadthChart));
    });

    testWidgets('choosing another index redraws the panel', (tester) async {
      await pumpScreen(
        tester,
        const ExchangeScreen(parentTab: BNavTab.home),
        until: find.byType(BIndexPanel),
      );
      await pumpUntil(tester, find.byType(BSparkline));

      final before = tester.widget<BSparkline>(find.byType(BSparkline).first);
      await tapVisible(tester, find.text('EGX 70').first);
      final after = tester.widget<BSparkline>(find.byType(BSparkline).first);

      expect(
        after.values,
        isNot(equals(before.values)),
        reason: 'the chart still shows the EGX 30 after picking the 70',
      );
    });

    testWidgets('§8 it ranks a session, never a decision', (tester) async {
      await pumpScreen(
        tester,
        const ExchangeScreen(parentTab: BNavTab.home),
        until: find.byType(BIndexPanel),
      );
      await pumpUntil(tester, find.text('WHAT ROSE AND WHAT FELL'));

      // A screen of the day's biggest risers is the easiest place in the app
      // to write a recommendation by accident.
      //
      // The footnote is exempt, and only the footnote: it is the sentence
      // that says this is not advice, and it cannot say so without using the
      // words. Everything else on the screen has to manage without them.
      bool insideFootnote(Element element) {
        var found = false;
        element.visitAncestorElements((ancestor) {
          if (ancestor.widget is BLegalFootnote) {
            found = true;
            return false;
          }
          return true;
        });
        return found;
      }

      const forbidden = [
        r'\bbuy\b',
        r'\bsell\b',
        r'\bhold\b',
        r'\bshould\b',
        r'\btop pick',
        r'\bopportunit',
        r'\bprice target\b',
        r'\bbest\b',
      ];

      for (final pattern in forbidden) {
        final offenders = find
            .textContaining(RegExp(pattern, caseSensitive: false))
            .evaluate()
            .where((element) => !insideFootnote(element))
            .map((element) => (element.widget as Text).data)
            .toList();

        expect(
          offenders,
          isEmpty,
          reason: 'the exchange screen said "$pattern": $offenders',
        );
      }
    });
  });
}
