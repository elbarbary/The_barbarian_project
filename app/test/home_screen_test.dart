import 'package:barbarian/core/widgets/composites.dart';
import 'package:barbarian/core/widgets/arc_gauge.dart';
import 'package:barbarian/core/widgets/legal.dart';
import 'package:barbarian/features/home/home_screen.dart';
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
    await pumpUntil(tester, find.textContaining('TODAY ·'));

    // A bare "Statement" says nothing about what happened, and it is the most
    // common filing type there is. Leading with one wastes the largest card on
    // the screen, so anything the classifier placed outranks it.
    expect(find.textContaining(RegExp(r'TODAY · (?!STATEMENT)')), findsWidgets);
  });

  testWidgets('the lead filing says why it is the lead', (tester) async {
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.textContaining('TODAY ·'));

    // The volume line is the only measured claim on the card. Without it the
    // hero is just the newest filing wearing a big font.
    expect(
      find.textContaining(RegExp('normal volume|filed this')),
      findsWidgets,
    );
  });

  testWidgets('it shows the index level', (tester) async {
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.textContaining('EGX30'));

    expect(find.textContaining('EGX30'), findsWidgets);
    // Split into an integer and a decimal part, so a five-figure index reads
    // at a glance without rounding away what moved.
    expect(find.textContaining(RegExp(r'^\.\d\d$')), findsWidgets);
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

  testWidgets('the research rail names the method, not a verdict', (
    tester,
  ) async {
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.textContaining('LATEST RESEARCH'));

    // §8.13 — the product is named for its method. "Cash or Trash" is a sell
    // call in one word, and the deleted version of this screen used it as the
    // rail's kicker.
    expect(
      find.textContaining(RegExp('cash or trash', caseSensitive: false)),
      findsNothing,
    );
    expect(find.textContaining('SIX PILLARS'), findsWidgets);
  });
}
