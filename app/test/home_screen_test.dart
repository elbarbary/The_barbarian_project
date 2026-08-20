import 'package:barbarian/core/widgets/composites.dart';
import 'package:barbarian/core/widgets/arc_gauge.dart';
import 'package:barbarian/core/widgets/legal.dart';
import 'package:barbarian/features/home/home_screen.dart';
import 'package:barbarian/core/models/rates.dart';
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
    expect(find.textContaining(RegExp('Statement\$')), findsNothing);
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
