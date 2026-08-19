import 'package:barbarian/core/models/cash_or_trash.dart';
import 'package:barbarian/core/models/company.dart';
import 'package:barbarian/core/models/opportunity.dart';
import 'package:barbarian/core/widgets/motion.dart';
import 'package:barbarian/core/widgets/arc_gauge.dart';
import 'package:barbarian/core/widgets/composites.dart';
import 'package:barbarian/core/widgets/nav.dart';
import 'package:barbarian/features/cash_or_trash/cash_or_trash_screen.dart';
import 'package:barbarian/features/company/company_screen.dart';
import 'package:barbarian/features/market/market_screen.dart';
import 'package:barbarian/features/opportunities/opportunity_screen.dart';
import 'package:barbarian/features/pit/pit_screen.dart';
import 'package:barbarian/features/profile/you_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// Spec §52. These pump the real screens against the real bundled fixtures, so
/// a failure means a screen genuinely broke — not that a mock drifted.
///
/// Every test waits on a *condition* rather than a fixed number of frames; see
/// `pumpUntil` for why a pump count is always a race here.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(useInMemoryPreferences);

  group('Market', () {
    testWidgets('lists companies from the directory', (tester) async {
      await pumpScreen(
        tester,
        const MarketScreen(parentTab: BNavTab.ask),
        until: find.textContaining('El Sewedy Electric'),
      );

      expect(find.text('The full directory'), findsOneWidget);
      expect(find.textContaining('Commercial International Bank'), findsWidgets);
    });

    testWidgets('search narrows the list without a network call', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const MarketScreen(parentTab: BNavTab.ask),
        until: find.textContaining('El Sewedy Electric'),
      );

      await tester.enterText(find.byType(TextField).first, 'swdy');
      await tester.pump();

      expect(find.textContaining('El Sewedy Electric'), findsOneWidget);
      expect(find.textContaining('Commercial International Bank'), findsNothing);
    });

    testWidgets('a query with no match shows the empty state, not a blank', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const MarketScreen(parentTab: BNavTab.ask),
        until: find.textContaining('El Sewedy Electric'),
      );

      await tester.enterText(find.byType(TextField).first, 'zamalek holding');
      await tester.pump();

      expect(find.text('No listed company matches that'), findsOneWidget);
      expect(find.byType(BEmptyState), findsOneWidget);
    });

    // The wording depends on when the scan was taken — "Last close" after the
    // session, "During session" while it was still trading — so this asserts
    // the invariant rather than one phrasing: the prices are dated, and nothing
    // on screen calls them live.
    testWidgets('dates its prices and never calls them live', (tester) async {
      await pumpScreen(
        tester,
        const MarketScreen(parentTab: BNavTab.ask),
        until: find.textContaining(fixtureSessionDate),
      );

      expect(find.textContaining(fixtureSessionDate), findsWidgets);
      expect(find.textContaining('Live'), findsNothing);
      expect(find.textContaining('Real-time'), findsNothing);
      expect(find.textContaining('delayed 15 min'), findsNothing);
    });
  });

  group('Cash or Trash', () {
    Finder loaded() => find.textContaining('of 224 investigated');

    testWidgets('shows every published investigation', (tester) async {
      await pumpScreen(
        tester,
        const CashOrTrashScreen(parentTab: BNavTab.ask),
        until: loaded(),
      );

      expect(find.byType(BVerdictBadge), findsWidgets);
    });

    testWidgets('renders signed scores with their sign', (tester) async {
      await pumpScreen(
        tester,
        const CashOrTrashScreen(parentTab: BNavTab.ask),
        until: loaded(),
      );

      // MCQE is +20 and KWIN is −50; both signs must survive to the screen.
      expect(find.text('+20'), findsWidgets);
      expect(find.text('-50'), findsWidgets);
    });

    testWidgets('verdicts carry a word, not only a colour', (tester) async {
      await pumpScreen(
        tester,
        const CashOrTrashScreen(parentTab: BNavTab.ask),
        until: loaded(),
      );

      // Spec §42.
      expect(find.textContaining('CASH'), findsWidgets);
      expect(find.textContaining('TOXIC'), findsWidgets);
    });
  });

  group('Opportunity Scanner', () {
    Finder loaded() => find.text('Opportunity Scanner');

    testWidgets('offers all three buckets including rejected', (tester) async {
      await pumpScreen(
        tester,
        const OpportunityScreen(parentTab: BNavTab.ask),
        until: loaded(),
      );

      expect(find.textContaining('Qualified'), findsWidgets);
      expect(find.textContaining('Watch'), findsWidgets);
      expect(find.textContaining('Rejected'), findsWidgets);
      expect(
        find.textContaining('Record'),
        findsWidgets,
        reason: 'the published outcome record is never hidden',
      );
    });

    testWidgets('is never renamed "Daily Insights"', (tester) async {
      await pumpScreen(
        tester,
        const OpportunityScreen(parentTab: BNavTab.ask),
        until: loaded(),
      );

      // Spec §4.
      expect(find.textContaining('Daily Insight'), findsNothing);
      expect(find.textContaining('Daily insight'), findsNothing);
    });

    testWidgets('shows no trading semantics anywhere', (tester) async {
      await pumpScreen(
        tester,
        const OpportunityScreen(parentTab: BNavTab.ask),
        until: loaded(),
      );

      // Spec §8.
      for (final banned in [
        'BUY',
        'SELL',
        'BUY NOW',
        'TARGET PRICE',
        'STOP LOSS',
        'EXPECTED RETURN',
        'BEST STOCK TODAY',
      ]) {
        expect(
          find.text(banned),
          findsNothing,
          reason: '"$banned" must never appear',
        );
      }
    });

    // A card whose narrative was a model position keeps its score, its gates
    // and its tape, and loses its words. Rendering that silently produces a
    // card that looks half-built; the screen says which half is missing and
    // why, because "the publisher is not licensed to repeat this" is a fact
    // about the app rather than a fault in it.
    testWidgets('names the reason a withheld card has no reasoning', (
      tester,
    ) async {
      final report = OpportunityReport.fromJson(
        readFixtureObjectSync('opportunities/latest.json'),
      );
      final withheld = report.watching.where((w) => w.positionWithheld);
      if (withheld.isEmpty) return; // no open position in today's report

      await pumpScreen(
        tester,
        const OpportunityScreen(parentTab: BNavTab.ask),
        until: loaded(),
      );

      await pumpUntil(tester, find.text(withheld.first.ticker));
      expect(find.text('NOT REPUBLISHED'), findsWidgets);
      expect(find.textContaining('not licensed'), findsWidgets);
    });

    // MKIT was compulsorily delisted while its result was still on the board.
    // The row stays — deleting a published result is the one thing this series
    // exists not to do — but it cannot open a company screen that has no
    // document behind it.
    testWidgets('a delisted outcome is shown and is not a link', (
      tester,
    ) async {
      final report = OpportunityReport.fromJson(
        readFixtureObjectSync('opportunities/latest.json'),
      );
      final directory = CompanyDirectory.fromJson(
        readFixtureObjectSync('companies.json'),
      );
      final gone = report.outcomes
          .where((o) => directory.byTicker(o.ticker) == null)
          .toList();
      if (gone.isEmpty) return; // every result's company is still listed

      await pumpScreen(
        tester,
        const OpportunityScreen(parentTab: BNavTab.ask),
        until: loaded(),
      );
      await tapVisible(tester, find.textContaining('Record'));
      await pumpUntil(tester, find.text(gone.first.ticker));

      final row = find.ancestor(
        of: find.text(gone.first.ticker),
        matching: find.byType(BPressable),
      );
      expect(row, findsWidgets);
      // The row is a link until the directory arrives and says otherwise, so
      // this waits for that answer rather than reading the first frame.
      await pumpUntilTrue(
        tester,
        () => tester.widget<BPressable>(row.first).onTap == null,
        reason: '${gone.first.ticker} is not in the directory, so its row must '
            'not offer a company screen that cannot load',
      );
    });
  });

  group('Company', () {
    testWidgets('renders the header and range gauge for SWDY', (tester) async {
      await pumpScreen(
        tester,
        const CompanyScreen(ticker: 'COMI', parentTab: BNavTab.today),
        until: find.textContaining('Commercial International Bank'),
      );

      expect(find.text('COMI'), findsWidgets);
      expect(find.byType(BArcGauge), findsOneWidget);
    });

    testWidgets('states its data age rather than implying it is live', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const CompanyScreen(ticker: 'COMI', parentTab: BNavTab.today),
        until: find.textContaining(fixtureSessionDate),
      );

      expect(find.textContaining(fixtureSessionDate), findsWidgets);
      expect(find.textContaining('Real-time'), findsNothing);
    });

    testWidgets('a company with no research says so plainly', (tester) async {
      await pumpScreen(
        tester,
        const CompanyScreen(ticker: 'ETEL', parentTab: BNavTab.today),
        until: find.textContaining('Telecom Egypt'),
      );

      await tester.tap(find.text('Research'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      expect(find.textContaining('No Barbarian research'), findsOneWidget);
    });

    testWidgets('a researched company shows a centre-anchored signed gauge', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const CompanyScreen(ticker: 'KWIN', parentTab: BNavTab.today),
        until: find.textContaining('El Kahera El Watania'),
      );

      await tester.tap(find.text('Research'));
      await tester.pump();
      // The header already has a range gauge, so wait on a label only the
      // verdict gauge draws.
      await pumpUntil(tester, find.text('Trash'));

      // Pick the verdict gauge by its scale rather than by position.
      final gauge = tester
          .widgetList<BArcGauge>(find.byType(BArcGauge))
          .firstWhere((g) => g.mode == BGaugeMode.fromCentre);
      // KWIN scored −50. Filled from the west like the canvas's own gauge it
      // would read as a small positive score, misstating published research.
      expect(gauge.mode, BGaugeMode.fromCentre);
      expect(gauge.value, -50);
      expect(gauge.min, CashOrTrashEntry.minScore.toDouble());
      expect(gauge.max, CashOrTrashEntry.maxScore.toDouble());
      expect(gauge.lowLabel, 'Trash');
      expect(gauge.highLabel, 'Cash');
    });
  });

  group('You', () {
    testWidgets('an empty watchlist explains itself', (tester) async {
      await pumpScreen(
        tester,
        const YouScreen(),
        until: find.text('Empty watchlist'),
      );

      expect(find.text('Browse companies'), findsOneWidget);
    });

    testWidgets('a populated watchlist lists tickers and nothing else', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const YouScreen(),
        watchlist: ['SWDY', 'COMI'],
        until: find.text('SWDY'),
      );

      expect(find.text('COMI'), findsWidgets);

      // Spec §33: a watchlist is following, never holding.
      for (final banned in [
        'Shares',
        'shares owned',
        'Cost basis',
        'Buy price',
        'Portfolio',
        'Risk tolerance',
      ]) {
        expect(find.textContaining(banned), findsNothing);
      }
    });

    testWidgets('states that prices are not real-time', (tester) async {
      await pumpScreen(
        tester,
        const YouScreen(),
        until: find.textContaining('No real-time feed'),
      );

      expect(find.textContaining('No real-time feed'), findsOneWidget);
    });
  });

  group('The Pit', () {
    testWidgets('states its phase without looking broken', (tester) async {
      await pumpScreen(tester, const PitScreen(parentTab: BNavTab.ask), until: find.text('The Pit'));

      expect(
        find.textContaining('Coming in the next development phase'),
        findsOneWidget,
      );
    });

    testWidgets('promises no calls, targets or leaderboards', (tester) async {
      await pumpScreen(tester, const PitScreen(parentTab: BNavTab.ask), until: find.text('The Pit'));

      expect(find.textContaining('No buy or sell calls'), findsOneWidget);
    });
  });

  group('dark theme', () {
    // The canvas ships no dark tokens at all, so the dark ramp is derived.
    // These prove every screen at least builds and paints under it.
    for (final (name, screen) in <(String, Widget)>[
      ('Market', const MarketScreen(parentTab: BNavTab.ask)),
      ('You', const YouScreen()),
      ('The Pit', const PitScreen(parentTab: BNavTab.ask)),
      ('Cash or Trash', const CashOrTrashScreen(parentTab: BNavTab.ask)),
      ('Opportunity Scanner', const OpportunityScreen(parentTab: BNavTab.ask)),
      ('Company', const CompanyScreen(ticker: 'COMI', parentTab: BNavTab.today)),
    ]) {
      testWidgets('$name builds in dark mode', (tester) async {
        await pumpScreen(tester, screen, themeMode: ThemeMode.dark);
        expect(tester.takeException(), isNull);
      });
    }
  });

  group('narrow layout', () {
    // 320pt is the narrowest phone the app will meet.
    for (final (name, screen) in <(String, Widget)>[
      ('Market', const MarketScreen(parentTab: BNavTab.ask)),
      ('You', const YouScreen()),
      ('Cash or Trash', const CashOrTrashScreen(parentTab: BNavTab.ask)),
      ('Company', const CompanyScreen(ticker: 'COMI', parentTab: BNavTab.today)),
    ]) {
      testWidgets('$name does not overflow at 320pt', (tester) async {
        tester.view.physicalSize = const Size(320 * 3, 700 * 3);
        tester.view.devicePixelRatio = 3.0;
        addTearDown(tester.view.reset);

        await pumpScreen(tester, screen, phoneSurface: false);
        expect(tester.takeException(), isNull);
      });
    }
  });
}
