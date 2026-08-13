import 'package:barbarian/core/models/market_snapshot.dart';
import 'package:barbarian/core/models/price_freshness.dart';
import 'package:barbarian/core/models/quote_snapshot.dart';
import 'package:barbarian/core/networking/document_source.dart';
import 'package:barbarian/core/widgets/nav.dart';
import 'package:barbarian/features/company/company_screen.dart';
import 'package:barbarian/features/market/market_screen.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

void main() {
  setUp(useInMemoryPreferences);

  group('quote conversion', () {
    // The published documents store a fraction and the feed sends a percentage.
    // Confusing the two shows every move on the exchange a hundred times too
    // large, which is the single most damaging thing this file can catch.
    test('percent change becomes a fraction', () {
      final quote = const LiveQuote(
        close: 108.44,
        previousClose: 107.11,
        changePercent: 1.2417,
      ).toStockQuote();

      expect(quote.changePercent, closeTo(0.012417, 1e-9));
      expect(quote.resolvedChangePercent, closeTo(0.012417, 1e-9));
    });

    test('absolute change is derived from the previous close', () {
      final quote = const LiveQuote(
        close: 306,
        previousClose: 295,
        changePercent: 3.7288,
      ).toStockQuote();

      expect(quote.change, closeTo(11, 1e-9));
      expect(quote.isUp, isTrue);
    });

    test('a quote with no previous close still renders a price', () {
      final quote = const LiveQuote(close: 42).toStockQuote();

      expect(quote.close, 42);
      expect(quote.change, isNull);
      expect(quote.resolvedChangePercent, isNull);
    });
  });

  group('merging over the published snapshot', () {
    const published = MarketSnapshot(
      date: '2026-08-13',
      stocks: {
        'COMI': StockQuote(close: 139.99, previousClose: 139.0),
        'SWDY': StockQuote(close: 107.11, previousClose: 109.3),
      },
    );

    test('live prices win', () {
      final merged = fakeQuotes({'COMI': 139.25}).mergedOver(published);

      expect(merged.quoteFor('COMI')!.close, 139.25);
    });

    test('a company the feed does not carry keeps its published close', () {
      final merged = fakeQuotes({'COMI': 139.25}).mergedOver(published);

      expect(merged.quoteFor('SWDY')!.close, 107.11);
    });

    test('an empty snapshot changes nothing', () {
      final merged = const QuoteSnapshot(asOf: '').mergedOver(published);

      expect(merged, same(published));
    });

    test('the session date is not overwritten by the live feed', () {
      final merged = fakeQuotes({'COMI': 139.25}).mergedOver(published);

      expect(merged.date, '2026-08-13');
    });
  });

  group('how the age is worded', () {
    test('a trading session names the delay and the collection time', () {
      final freshness = PriceFreshness(
        kind: PriceFreshnessKind.live,
        delay: const Duration(minutes: 15),
        readAt: DateTime.now().subtract(const Duration(minutes: 3)),
        sessionOpen: true,
        sessionDate: '2026-08-13',
      );

      expect(freshness.caption, '15-min delayed · updated 3 min ago');
    });

    test('outside the session it is a close, not a delayed price', () {
      final freshness = PriceFreshness(
        kind: PriceFreshnessKind.live,
        delay: const Duration(minutes: 15),
        readAt: DateTime.now(),
        // Stated rather than left to the default: a closed session is the whole
        // subject of this test.
        // ignore: avoid_redundant_argument_values
        sessionOpen: false,
        sessionDate: '2026-08-13',
      );

      expect(freshness.caption, 'Market closed · last close 2026-08-13');
      expect(freshness.caption, isNot(contains('delayed')));
    });

    test('with no feed it falls back to the published close', () {
      expect(
        const PriceFreshness.published('2026-08-13').caption,
        'Last close · 2026-08-13',
      );
    });

    test('never claims real-time while a delay exists', () {
      for (final open in [true, false]) {
        final caption = PriceFreshness(
          kind: PriceFreshnessKind.live,
          delay: const Duration(minutes: 15),
          readAt: DateTime.now(),
          sessionOpen: open,
        ).caption;

        expect(caption.toLowerCase(), isNot(contains('real-time')));
        expect(caption.toLowerCase(), isNot(contains('live')));
      }
    });

    test('the elapsed part tracks the clock rather than the poll', () {
      final freshness = PriceFreshness(
        kind: PriceFreshnessKind.live,
        delay: const Duration(minutes: 15),
        readAt: DateTime.now().subtract(const Duration(minutes: 47)),
        sessionOpen: true,
      );

      expect(freshness.caption, contains('47 min ago'));
    });
  });

  group('on screen', () {
    testWidgets('Market states the delay while the exchange is trading', (
      tester,
    ) async {
      usePhoneSurface(tester);
      await tester.pumpWidget(
        harness(
          const MarketScreen(),
          quotes: fakeQuotes({'COMI': 139.25}),
        ),
      );
      await pumpUntil(tester, find.textContaining('delayed'));

      expect(find.textContaining('15-min delayed'), findsOneWidget);
    });

    testWidgets('Market falls back to the last close when the feed is down', (
      tester,
    ) async {
      usePhoneSurface(tester);
      await tester.pumpWidget(harness(const MarketScreen()));
      await pumpUntil(tester, find.textContaining('Last close'));

      expect(find.textContaining('Last close'), findsOneWidget);
      expect(find.textContaining('delayed'), findsNothing);
    });

    testWidgets('a live price reaches the company screen', (tester) async {
      usePhoneSurface(tester);
      await tester.pumpWidget(
        harness(
          const CompanyScreen(ticker: 'SWDY', parentTab: BNavTab.market),
          quotes: fakeQuotes({'SWDY': 1234.5}),
        ),
      );
      await pumpUntil(tester, find.textContaining('1234.50'));

      expect(find.textContaining('1234.50'), findsWidgets);
      expect(find.textContaining('15-min delayed'), findsOneWidget);
    });
  });

  group('seeded network source', () {
    test('the network answer wins when there is one', () async {
      final source = SeededNetworkDocumentSource(
        network: const _StubSource({'a.json': 'from network'}),
        seed: const _StubSource({'a.json': 'from bundle'}),
      );

      expect(await source.fetch('a.json'), 'from network');
    });

    test('the bundle covers a failed request', () async {
      final source = SeededNetworkDocumentSource(
        network: const _StubSource({}),
        seed: const _StubSource({'a.json': 'from bundle'}),
      );

      expect(await source.fetch('a.json'), 'from bundle');
    });

    test('a miss on both reports the network reason, not the bundle', () async {
      final source = SeededNetworkDocumentSource(
        network: const _StubSource({}, reason: 'http 503'),
        seed: const _StubSource({}),
      );

      await expectLater(
        source.fetch('a.json'),
        throwsA(
          isA<DocumentUnavailable>().having(
            (e) => e.reason,
            'reason',
            'http 503',
          ),
        ),
      );
    });
  });
}

class _StubSource implements DocumentSource {
  const _StubSource(this.documents, {this.reason = 'missing'});

  final Map<String, String> documents;
  final String reason;

  @override
  bool get isRefreshable => true;

  @override
  Future<String> fetch(String path) async {
    final body = documents[path];
    if (body == null) throw DocumentUnavailable(path, reason);
    return body;
  }
}
