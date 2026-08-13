import 'package:barbarian/core/models/cash_or_trash.dart';
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
        const MarketScreen(),
        until: find.textContaining('El Sewedy Electric'),
      );

      expect(find.text('Market'), findsOneWidget);
      expect(find.textContaining('Commercial International Bank'), findsWidgets);
    });

    testWidgets('search narrows the list without a network call', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const MarketScreen(),
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
        const MarketScreen(),
        until: find.textContaining('El Sewedy Electric'),
      );

      await tester.enterText(find.byType(TextField).first, 'zamalek holding');
      await tester.pump();

      expect(find.text('No listed company matches that'), findsOneWidget);
      expect(find.byType(BEmptyState), findsOneWidget);
    });

    testWidgets('labels the data as end-of-day, never as live', (tester) async {
      await pumpScreen(
        tester,
        const MarketScreen(),
        until: find.textContaining('Last close'),
      );

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
        const CashOrTrashScreen(parentTab: BNavTab.home),
        until: loaded(),
      );

      expect(find.byType(BVerdictBadge), findsWidgets);
    });

    testWidgets('renders signed scores with their sign', (tester) async {
      await pumpScreen(
        tester,
        const CashOrTrashScreen(parentTab: BNavTab.home),
        until: loaded(),
      );

      // MCQE is +20 and KWIN is −50; both signs must survive to the screen.
      expect(find.text('+20'), findsWidgets);
      expect(find.text('-50'), findsWidgets);
    });

    testWidgets('verdicts carry a word, not only a colour', (tester) async {
      await pumpScreen(
        tester,
        const CashOrTrashScreen(parentTab: BNavTab.home),
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
        const OpportunityScreen(parentTab: BNavTab.home),
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
        const OpportunityScreen(parentTab: BNavTab.home),
        until: loaded(),
      );

      // Spec §4.
      expect(find.textContaining('Daily Insight'), findsNothing);
      expect(find.textContaining('Daily insight'), findsNothing);
    });

    testWidgets('shows no trading semantics anywhere', (tester) async {
      await pumpScreen(
        tester,
        const OpportunityScreen(parentTab: BNavTab.home),
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
  });

  group('Company', () {
    testWidgets('renders the header and range gauge for SWDY', (tester) async {
      await pumpScreen(
        tester,
        const CompanyScreen(ticker: 'COMI', parentTab: BNavTab.market),
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
        const CompanyScreen(ticker: 'COMI', parentTab: BNavTab.market),
        until: find.textContaining('Last close'),
      );

      expect(find.textContaining('Last close'), findsWidgets);
    });

    testWidgets('a company with no research says so plainly', (tester) async {
      await pumpScreen(
        tester,
        const CompanyScreen(ticker: 'ETEL', parentTab: BNavTab.market),
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
        const CompanyScreen(ticker: 'KWIN', parentTab: BNavTab.market),
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
      await pumpScreen(tester, const PitScreen(), until: find.text('The Pit'));

      expect(
        find.textContaining('Coming in the next development phase'),
        findsOneWidget,
      );
    });

    testWidgets('promises no calls, targets or leaderboards', (tester) async {
      await pumpScreen(tester, const PitScreen(), until: find.text('The Pit'));

      expect(find.textContaining('No buy or sell calls'), findsOneWidget);
    });
  });

  group('dark theme', () {
    // The canvas ships no dark tokens at all, so the dark ramp is derived.
    // These prove every screen at least builds and paints under it.
    for (final (name, screen) in <(String, Widget)>[
      ('Market', const MarketScreen()),
      ('You', const YouScreen()),
      ('The Pit', const PitScreen()),
      ('Cash or Trash', const CashOrTrashScreen(parentTab: BNavTab.home)),
      ('Opportunity Scanner', const OpportunityScreen(parentTab: BNavTab.home)),
      ('Company', const CompanyScreen(ticker: 'COMI', parentTab: BNavTab.market)),
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
      ('Market', const MarketScreen()),
      ('You', const YouScreen()),
      ('Cash or Trash', const CashOrTrashScreen(parentTab: BNavTab.home)),
      ('Company', const CompanyScreen(ticker: 'COMI', parentTab: BNavTab.market)),
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
