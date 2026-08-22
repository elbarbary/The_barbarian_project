import 'dart:io';
import 'package:barbarian/core/widgets/composites.dart';
import 'package:barbarian/core/widgets/arc_gauge.dart';
import 'package:barbarian/core/widgets/legal.dart';
import 'package:barbarian/features/home/home_screen.dart';
import 'package:barbarian/core/models/rates.dart';
import 'package:barbarian/core/models/market_history.dart';
import 'package:barbarian/core/models/macro.dart';
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
    await pumpUntil(tester, find.textContaining(RegExp('announced this|filed this')));

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
    await pumpUntil(tester, find.textContaining(RegExp('announced this|filed this')));

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
    await pumpUntil(tester, find.textContaining(RegExp('announced this|filed this')));

    // The kicker carries the measured reason this filing leads, and the body
    // carries it in words. Without either the hero is just the newest filing
    // wearing a big font.
    expect(
      find.textContaining(RegExp('normal volume|announced this|filed this|NORMAL',
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

  test('gold and silver carry a series, not just a headline price', () {
    // The rates document quotes gold as a number with nothing behind it, so
    // the card could say what an ounce costs and never what it had been doing.
    // Spot, not futures: the COMEX front month was trading 2.9% above spot,
    // and a chart of that under a spot headline contradicts the number
    // printed directly above it.
    final history = MarketHistory.fromJson(
      readFixtureObjectSync('market-history.json'),
    );

    for (final metal in ['XAU', 'XAG']) {
      final series = history.metalOf(metal);
      expect(
        series.length,
        greaterThan(100),
        reason: '$metal has nothing to draw',
      );
      expect(series.every((v) => v > 0), isTrue);
    }

    // Gold is worth vastly more an ounce than silver. If these two were ever
    // swapped or pointed at the same instrument, this is what would catch it.
    final gold = history.metalOf('XAU').last;
    final silver = history.metalOf('XAG').last;
    expect(gold / silver, greaterThan(10));
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

  testWidgets('the two feeds share a place and the reader picks', (
    tester,
  ) async {
    // They were stacked — a dozen headlines, a market block, then ten filings
    // further down — and both answer "what happened today", so a reader after
    // one had to scroll past the other to reach it.
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.text('News'));

    expect(find.text('News'), findsWidgets);
    expect(find.text('From the exchange'), findsWidgets);
    // News is the default: this is a news app.
    expect(find.textContaining('All news'), findsWidgets);
  });

  test('the feeds behind the tabs are short, and the rest is a tap away', () {
    // Five rows is enough to see there is a feed and short enough that the
    // screen keeps moving. Twelve under a lead story turned Home into a list
    // to be scrolled past rather than read.
    final source = File('lib/features/home/feed_tabs.dart').readAsStringSync();
    expect(source.contains('limit: 5'), isTrue);
    expect(
      source.contains('showHeader: false'),
      isTrue,
      reason: 'the tab already names the feed; a second header repeats it',
    );
  });

  testWidgets('§8 the macro block explains and never instructs', (tester) async {
    // This is the strongest claim the app makes anywhere: a chain of cause
    // from a number outside the exchange to a share inside it. It has to stop
    // at the mechanism.
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.textContaining(RegExp('announced this|filed this')));

    for (final word in [
      'you should',
      'investors should',
      'undervalued',
      'cheap',
      'opportunity to',
      'we recommend',
    ]) {
      expect(
        find.textContaining(RegExp(word, caseSensitive: false)),
        findsNothing,
        reason: 'the macro block must not say "\$word"',
      );
    }
  });

  test('macro carries a mechanism and a measured correlation for each series', () {
    // The two are published side by side so they can disagree in front of the
    // reader. Suez has a compelling chain and a correlation near zero, which
    // says the canal reaches the exchange over months rather than sessions —
    // and hiding that would turn an explanation into a claim.
    final doc = MacroDoc.fromJson(readFixtureObjectSync('macro.json'));

    expect(doc.series, isNotEmpty);
    for (final series in doc.series) {
      expect(series.chain, isNotEmpty, reason: '\${series.id} has no mechanism');
      expect(series.chainAr, isNotEmpty, reason: '\${series.id} has no Arabic');
      expect(series.asOf, isNotEmpty, reason: '\${series.id} is undated');
      expect(series.history.length, greaterThan(1));
    }
    expect(doc.correlations, isNotEmpty);
    for (final r in doc.correlations) {
      expect(r.r.abs(), lessThanOrEqualTo(1.0));
      expect(r.sessions, greaterThan(0));
    }
  });

  test('macro coverage is somebody else\'s reporting, credited and linked', () {
    // The only part of a macro card that is not ours. The reading is a
    // published figure, the correlation is our arithmetic, the chain is our
    // reasoning — this is journalism, and it carries the name of whoever wrote
    // it and a link back to them.
    final doc = MacroDoc.fromJson(readFixtureObjectSync('macro.json'));
    final withCoverage =
        doc.series.where((s) => s.coverage.isNotEmpty).toList();

    expect(
      withCoverage,
      isNotEmpty,
      reason: 'no series carries reporting; check the GDELT queries',
    );

    for (final series in withCoverage) {
      for (final item in series.coverage) {
        expect(item.title.trim(), isNotEmpty);
        expect(item.url, startsWith('http'), reason: 'unlinked coverage');
        expect(item.domain.trim(), isNotEmpty, reason: 'uncredited coverage');
      }
      // A wire story reaches a dozen sites verbatim; four domains repeating one
      // sentence is not four sources.
      final titles = series.coverage.map((c) => c.title.toLowerCase()).toSet();
      expect(titles.length, series.coverage.length, reason: 'duplicated wire');
    }
  });

  test('the filler domains the broad query returned are kept out', () {
    // A broad Egypt query came back as currency-rate listicles from two
    // domains. The tight queries avoid them; this proves they stayed avoided.
    final doc = MacroDoc.fromJson(readFixtureObjectSync('macro.json'));
    for (final series in doc.series) {
      for (final item in series.coverage) {
        expect(
          ['vetogate.com', 'dostor.org'],
          isNot(contains(item.domain)),
          reason: 'rate-table filler reached the macro card',
        );
      }
    }
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
    await pumpUntil(tester, find.textContaining(RegExp('announced this|filed this')));

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
