import 'dart:io';
import 'package:barbarian/core/widgets/composites.dart';
import 'package:barbarian/core/widgets/arc_gauge.dart';
import 'package:barbarian/core/widgets/legal.dart';
import 'package:barbarian/features/home/home_screen.dart';
import 'dart:convert';
import 'package:barbarian/core/models/rates.dart';
import 'package:barbarian/core/models/news.dart';
import 'package:barbarian/core/models/market_history.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// Home — the dashboard the boards specify (`docs/design-specs/home.json`).
///
/// It was deleted once and rebuilt, so these tests pin the two things that
/// matter about it: that it shows the sections the board asks for, and that it
/// stays a read-and-browse surface. A dashboard is where a recommendation list
/// would be easiest to build by accident — four tiles the reader chose, each
/// carrying this app's opinion, is exactly what §8.4 forbids.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(useInMemoryPreferences);

  testWidgets('it leads with a filing the classifier could place', (
    tester,
  ) async {
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.textContaining(RegExp('filed this')));

    // A bare "Statement" says nothing about what happened, and it is the most
    // common filing type there is. Leading with one wastes the largest card on
    // the screen, so anything the classifier placed outranks it.
    //
    // Asserted about the lead alone. This used to search the whole screen,
    // which only held while Home showed four filings and no statement happened
    // to be among them — a statement further down the list is an ordinary
    // filing and says nothing about what the hero chose.
    final lead = tester.widget<Text>(find.byKey(const Key('home-lead-filing')));
    expect(
      lead.data,
      isNot(matches(RegExp(r'Statement$'))),
      reason: 'the largest card must not be spent on a bare "Statement"',
    );
  });

  testWidgets('§49 the hero dates itself and never backdates a claim', (
    tester,
  ) async {
    // The lead is chosen by rank before date, so the biggest card on the
    // screen can hold a filing from an earlier session. Its kicker said
    // "Filed today" regardless — and when this was found the entire feed was
    // one day old, so Home was stating something false in its largest type.
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.textContaining(RegExp('filed this')));

    final fixture = readFixtureObjectSync('disclosures/latest.json');
    final items = (fixture['items'] as List).cast<Map<String, dynamic>>();
    final today = DateTime.now();
    final isToday = items.any((i) {
      final d = DateTime.tryParse((i['date'] ?? '') as String);
      return d != null &&
          d.year == today.year &&
          d.month == today.month &&
          d.day == today.day;
    });

    if (!isToday) {
      expect(
        find.textContaining(RegExp('FILED TODAY', caseSensitive: false)),
        findsNothing,
        reason: 'no filing in the feed is from today, so nothing may say so',
      );
    }
  });

  testWidgets('the lead filing says why it is the lead', (tester) async {
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.textContaining(RegExp('filed this')));

    // The kicker carries the measured reason this filing leads, and the body
    // carries it in words. Without either the hero is just the newest filing
    // wearing a big font.
    expect(
      find.textContaining(RegExp('normal volume|filed this|NORMAL',
          caseSensitive: false)),
      findsWidgets,
    );
  });

  testWidgets('it shows all three index levels, not just the thirty', (
    tester,
  ) async {
    // The EGX 30 alone says whether the thirty largest listings moved, which
    // is a different question from whether the market did. The 70 and the 100
    // are equal-weighted, so the three disagreeing is the interesting case.
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.textContaining('EGX 30'));

    // Two is the assertion that matters: the screen used to carry the EGX 30
    // and nothing else. The third card sits further along a horizontal rail
    // that is itself below the fold, so it is not built in a test viewport —
    // the model test below covers that all three are offered.
    for (final name in ['EGX 30', 'EGX 70']) {
      expect(
        find.textContaining(name),
        findsWidgets,
        reason: '$name should have a card',
      );
    }
  });

  test('every published index is offered a card', () {
    // The rail renders whatever the rates document carries, so this is the
    // check that nothing is being dropped on the way to the screen.
    final rates = RatesDoc.fromJson(readFixtureObjectSync('rates/latest.json'));
    expect(rates.indices.map((i) => i.id), containsAll(<String>[
      'EGX30',
      'EGX70EWI',
      'EGX100EWI',
    ]));
  });

  test('§14 the indices carry a real series, not a single point', () {
    // These cards showed a number and never a shape: `market-history.json`
    // held one row and grew a session a day, because the builder believed no
    // index series was reachable anywhere. A year of daily closes is now
    // backfilled from a second source and checked against the level we
    // already publish before any of it is written.
    final history = MarketHistory.fromJson(
      readFixtureObjectSync('market-history.json'),
    );

    expect(history.sessions.length, greaterThan(100));
    for (final id in ['EGX30', 'EGX70EWI', 'EGX100EWI']) {
      final series = history.levelsOf(id);
      expect(
        series.length,
        greaterThan(100),
        reason: '$id has nothing to draw a sparkline from',
      );
      expect(
        series.every((v) => v > 0),
        isTrue,
        reason: '$id carries a non-positive level',
      );
    }
  });

  testWidgets('it counts what rose and what fell', (tester) async {
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.textContaining(RegExp('rose', caseSensitive: false)));

    // Counted from the shares themselves — no breadth figure is published for
    // this exchange.
    for (final label in ['rose', 'fell', 'unchanged']) {
      expect(
        find.textContaining(RegExp(label, caseSensitive: false)),
        findsWidgets,
      );
    }
    expect(find.textContaining(RegExp(r'of \d+ shares')), findsWidgets);
  });

  test('§49 one breadth count, from one source', () {
    // Today carried its own breadth card counted from the live 15-minute quote
    // feed while this one counts the published close, and the two disagreed on
    // screen — 107 rose against 57 for the same session. Two cards claiming
    // "the session" with different numbers is worse than either alone.
    final today = File('lib/features/today/today_screen.dart').readAsStringSync();
    expect(
      today.contains('_MarketPulse'),
      isFalse,
      reason: 'breadth belongs to one screen, counted once',
    );
  });

  testWidgets('Home offers a real amount of the feed, not a token four', (
    tester,
  ) async {
    // Four rows under a screen you can keep scrolling reads as "there is
    // nothing here". The exchange files a couple of dozen a session and the
    // news feed is already deduplicated to 120 stories, so four was hiding a
    // full feed rather than summarising it.
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.textContaining(RegExp('filed this')));

    final news = NewsFeed.fromJson(readFixtureObjectSync('news/latest.json'));
    expect(news.items.length, greaterThan(12));

    // Rendered rows are bounded by the viewport, so this asserts the limit the
    // screen applies rather than counting widgets: the section takes 12.
    final source = File('lib/features/home/home_screen.dart').readAsStringSync();
    expect(
      source.contains('.take(12)'),
      isTrue,
      reason: 'the news section should offer more than a token few',
    );
    // Deliberately not asserting that no `.take(4)` survives anywhere: the
    // watchlist grid takes four tiles and always did, which is a different
    // question from how much of the feed Home offers.
  });

  test('the breadth chart has lines to draw, and says how each was counted', () {
    // It drew a single dot: the store held one session, because breadth is not
    // published for this exchange and was only ever accumulated. Four weeks are
    // now reconstructed from stored per-company closes so there is a shape on
    // day one, and live sessions append from here.
    final history = MarketHistory.fromJson(
      readFixtureObjectSync('market-history.json'),
    );
    final counted = history.sessions
        .where((s) => !(s.breadth?.isEmpty ?? true))
        .toList();

    expect(
      counted.length,
      greaterThan(10),
      reason: 'three lines need more than a couple of points',
    );

    // The reconstruction sees ~230 shares and the live snapshot 282, so every
    // row has to carry its own denominator or the lines lie about each other.
    for (final session in counted) {
      final b = session.breadth!;
      expect(b.counted, greaterThan(0));
      expect(b.up + b.down + b.flat, b.counted);
      expect(['session', 'closes'], contains(b.basis));
    }

    // The newest session is the live count, never a reconstruction: the
    // snapshot is the better reading and must not be overwritten by backfill.
    expect(counted.last.breadth!.basis, 'session');
    expect(counted.any((s) => s.breadth!.isReconstructed), isTrue);
  });

  test('§13 a year of price history reaches most of the market', () {
    // The Price tab offers 1M/3M/1Y and could fill 1Y for sixteen companies:
    // sixteen had been fetched from Yahoo before it began refusing, and
    // everything else held the fifty to a hundred sessions the daily snapshot
    // had accumulated. Mubasher publishes the whole series and 210 companies
    // are now verified against closes we already held.
    final dir = Directory('assets/fixtures/companies');
    if (!dir.existsSync()) return;

    var deep = 0;
    var total = 0;
    for (final file in dir.listSync()) {
      if (file is! File || !file.path.endsWith('.json')) continue;
      total++;
      final doc = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
      final history = (doc['price_history'] as List?) ?? const [];
      if (history.length >= 250) deep++;
    }

    expect(total, greaterThan(0));
    expect(
      deep,
      greaterThan(total ~/ 2),
      reason: 'only $deep of $total companies can fill a 1Y window',
    );
  });

  testWidgets('an empty watchlist explains itself', (tester) async {
    await pumpScreen(tester, const HomeScreen(), watchlist: const []);
    await pumpUntil(
      tester,
      find.textContaining('Follow companies to build your watchlist'),
    );

    expect(
      find.textContaining('Follow companies to build your watchlist'),
      findsOneWidget,
    );
  });

  testWidgets('§8.4 watchlist tiles carry a price and no reading', (
    tester,
  ) async {
    await pumpScreen(
      tester,
      const HomeScreen(),
      watchlist: const ['COMI', 'SWDY'],
    );
    await pumpUntil(tester, find.text('COMI'));

    expect(find.text('COMI'), findsWidgets);
    expect(find.text('SWDY'), findsWidgets);

    // A list the reader assembled, each row carrying this app's assessment, is
    // a personalised recommendation list however it was built.
    expect(find.byType(BVerdictBadge), findsNothing);
    expect(find.byType(BPillarLedger), findsNothing);
    expect(find.byType(BArcGauge), findsNothing);
  });

  testWidgets('it offers no way to trade and no view on a price', (
    tester,
  ) async {
    await pumpScreen(
      tester,
      const HomeScreen(),
      watchlist: const ['COMI', 'SWDY'],
    );
    await pumpUntil(tester, find.text('COMI'));

    for (final word in [
      'buy now',
      'sell now',
      'price target',
      'undervalued',
      'cheap',
      'strong buy',
    ]) {
      expect(
        find.textContaining(RegExp(word, caseSensitive: false)),
        findsNothing,
        reason: 'the dashboard must not say "$word"',
      );
    }
  });

  testWidgets('it carries no research surface at all', (tester) async {
    // Research is no longer a pillar of this app: the founder pulled it from
    // the navigation and from here, on the view that publishing scored studies
    // on named issuers is exposure we have not cleared. Home must not be the
    // back door that puts it in front of everyone anyway.
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.textContaining(RegExp('filed this')));

    for (final absent in [
      'latest research',
      'six pillars',
      'cash or trash',
      'all studies',
      'investigated',
    ]) {
      expect(
        find.textContaining(RegExp(absent, caseSensitive: false)),
        findsNothing,
        reason: 'Home must not surface research: found "$absent"',
      );
    }
  });
}
