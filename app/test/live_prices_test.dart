import 'package:barbarian/core/models/market_snapshot.dart';
import 'package:barbarian/core/models/price_freshness.dart';
import 'package:barbarian/core/models/quote_snapshot.dart';
import 'package:barbarian/core/networking/document_source.dart';
import 'package:barbarian/core/networking/static_api.dart';
import 'package:barbarian/core/storage/document_cache.dart';
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

    // The app has no licence for a real-time EGX feed, so a zero delay means
    // the feed stopped stating its tier — not that it was upgraded. Rendering
    // that as "Real-time" put a false claim beside a quarter-hour-old price.
    test('a zero delay is treated as unknown, never as real-time', () {
      final freshness = PriceFreshness(
        kind: PriceFreshnessKind.live,
        // ignore: avoid_redundant_argument_values
        delay: Duration.zero,
        readAt: DateTime.now(),
        sessionOpen: true,
      );

      expect(freshness.caption, '15-min delayed · updated just now');
      expect(freshness.shortCaption, '15-min delayed');
      expect(freshness.caption.toLowerCase(), isNot(contains('real-time')));
    });

    test('a snapshot that parsed without a delay field still says delayed', () {
      // delay_seconds absent entirely -> the model default.
      final parsed = QuoteSnapshot.fromJson(const {
        'as_of': '2026-08-13T10:00:00Z',
        'quotes': <String, dynamic>{},
      });

      expect(parsed.delay, const Duration(seconds: 900));
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

    testWidgets('Market falls back to the published prices when the feed is down', (
      tester,
    ) async {
      usePhoneSurface(tester);
      await tester.pumpWidget(harness(const MarketScreen()));
      await pumpUntil(tester, find.textContaining(fixtureSessionDate));

      // Dated by the publish, and making no claim about a live feed.
      expect(find.textContaining(fixtureSessionDate), findsWidgets);
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

  group('the bundled seed', () {
    const manifest =
        '{"schema_version":1,"data_version":"v1","versions":{"market":42}}';

    StaticApi api({
      required Map<String, String> network,
      Map<String, String> seed = const {},
      required DocumentCache cache,
    }) => StaticApi(
      source: _StubSource(network),
      cache: cache,
      seed: _StubSource(seed),
    );

    test('the network answer wins when there is one', () async {
      final api1 = api(
        network: {'manifest.json': manifest, 'market.json': 'from network'},
        seed: {'market.json': 'from bundle'},
        cache: MemoryDocumentCache(),
      );

      final snapshot = await api1.loadOnce('market.json', resource: 'market');
      expect(snapshot!.body, 'from network');
      expect(snapshot.origin, DocumentOrigin.network);
    });

    test('the bundle covers a failed request', () async {
      final snapshot = await api(
        network: {'manifest.json': manifest},
        seed: {'market.json': 'from bundle'},
        cache: MemoryDocumentCache(),
      ).loadOnce('market.json', resource: 'market');

      expect(snapshot!.body, 'from bundle');
      expect(snapshot.origin, DocumentOrigin.fixture);
    });

    // The regression that matters. Caching the bundle under the live manifest's
    // version made every later launch believe it already held current data, so
    // one timed-out fetch on a fresh install froze the app on build-time
    // content permanently.
    test('is never written to the cache', () async {
      final cache = MemoryDocumentCache();
      await api(
        network: {'manifest.json': manifest},
        seed: {'market.json': 'from bundle'},
        cache: cache,
      ).loadOnce('market.json', resource: 'market');

      expect(await cache.read('market.json'), isNull);
    });

    test('a later launch with a working network gets the real document', () async {
      final cache = MemoryDocumentCache();
      await api(
        network: {'manifest.json': manifest},
        seed: {'market.json': 'from bundle'},
        cache: cache,
      ).loadOnce('market.json', resource: 'market');

      // Same cache, network now reachable — as after a bad first launch.
      final snapshot = await api(
        network: {'manifest.json': manifest, 'market.json': 'from network'},
        seed: {'market.json': 'from bundle'},
        cache: cache,
      ).loadOnce('market.json', resource: 'market');

      expect(snapshot!.body, 'from network');
    });

    test('a miss on both reports the network reason, not the bundle', () async {
      await expectLater(
        api(
          network: {'manifest.json': manifest},
          cache: MemoryDocumentCache(),
        ).loadOnce('market.json', resource: 'market'),
        throwsA(
          isA<DocumentUnavailable>().having(
            (e) => e.reason,
            'reason',
            'missing',
          ),
        ),
      );
    });
  });
}

class _StubSource implements DocumentSource {
  const _StubSource(this.documents);

  final Map<String, String> documents;
  static const String reason = 'missing';

  @override
  bool get isRefreshable => true;

  @override
  Future<String> fetch(String path) async {
    final body = documents[path];
    if (body == null) throw DocumentUnavailable(path, reason);
    return body;
  }
}
