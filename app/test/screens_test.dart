import 'package:barbarian/core/models/company.dart';
import 'package:barbarian/core/models/opportunity.dart';
import 'package:barbarian/core/widgets/motion.dart';
import 'package:barbarian/core/widgets/arc_gauge.dart';
import 'package:barbarian/core/widgets/composites.dart';
import 'package:barbarian/core/widgets/legal.dart';
import 'package:barbarian/core/widgets/nav.dart';
import 'package:barbarian/features/cash_or_trash/cash_or_trash_screen.dart';
import 'package:barbarian/features/company/company_screen.dart';
import 'package:barbarian/features/home/home_screen.dart';
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
        const MarketScreen(parentTab: BNavTab.home),
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
        const MarketScreen(parentTab: BNavTab.home),
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
        const MarketScreen(parentTab: BNavTab.home),
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
        const MarketScreen(parentTab: BNavTab.home),
        until: find.textContaining(fixtureSessionDate),
      );

      expect(find.textContaining(fixtureSessionDate), findsWidgets);
      expect(find.textContaining('Live'), findsNothing);
      expect(find.textContaining('Real-time'), findsNothing);
      expect(find.textContaining('delayed 15 min'), findsNothing);
    });
  });

  group('Six Pillars', () {
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

      // Spec §42, and §8.2: the word beside the colour describes the
      // scorecard rather than naming a verdict.
      expect(find.textContaining('POSITIVE'), findsWidgets);
      expect(find.textContaining('NEGATIVE'), findsWidgets);
      // Exact matches, not substrings: "PENDING CASH CALL" is a published
      // flag about a rights issue and "NO CASH BEHIND THE PROFIT" is an
      // earnings-quality observation. Both are facts about the filings. What
      // may not appear is a BAND called one of these.
      for (final banned in ['Cash', 'Trash', 'Toxic', 'Recyclable',
                            'CASH', 'TRASH', 'TOXIC', 'RECYCLABLE']) {
        expect(
          find.text(banned),
          findsNothing,
          reason: '"$banned" standing alone is a verdict on a named issuer',
        );
      }
    });
  });

  group('Scanner', () {
    Finder loaded() => find.text('Scanner');

    testWidgets('offers all three buckets including the ones that failed', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const OpportunityScreen(parentTab: BNavTab.home),
        until: loaded(),
      );

      expect(find.textContaining('Cleared all'), findsWidgets);
      expect(find.textContaining('Partly'), findsWidgets);
      expect(find.textContaining('Not cleared'), findsWidgets);
      expect(
        find.textContaining('Rule log'),
        findsWidgets,
        reason: 'the published outcome record is never hidden',
      );
    });

    testWidgets('never calls a share "qualified"', (tester) async {
      // The founder pulled the word on 21 Aug 2026. "Qualified" reads as *this
      // share qualifies* — a recommendation from a publisher with no FRA
      // licence. What was measured is that the name cleared the published
      // rules, which is a fact about the rules and not a view on the company.
      await pumpScreen(
        tester,
        const OpportunityScreen(parentTab: BNavTab.home),
        until: loaded(),
      );

      for (final word in ['Qualified', 'qualified', 'Opportunity']) {
        expect(
          find.textContaining(word),
          findsNothing,
          reason: 'the scanner must not say "$word"',
        );
      }
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
        const OpportunityScreen(parentTab: BNavTab.home),
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
        const OpportunityScreen(parentTab: BNavTab.home),
        until: loaded(),
      );
      await tapVisible(tester, find.textContaining('Rule log'));
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

      expect(find.textContaining('No study published'), findsOneWidget);
    });

    // The verdict dial used to live here, filled from the centre so a −50 read
    // as a −50. It is gone: board v2 deleted it because a needle sweeping
    // toward the right edge is a verdict shape whatever the caption says, and
    // a screenshot of one is a rating published by somebody unlicensed to
    // rate. What replaced it is a ledger — six rows, six signs, no needle.
    testWidgets('a researched company shows a signed ledger, not a dial', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const CompanyScreen(ticker: 'KWIN', parentTab: BNavTab.today),
        until: find.textContaining('El Kahera El Watania'),
      );

      await tester.tap(find.text('Research'));
      await tester.pump();
      await pumpUntil(tester, find.byType(BPillarLedger));

      // KWIN scored −50, and the sum is stated as a sum.
      expect(find.text('-50'), findsWidgets);
      expect(find.text('Sum of the six'), findsOneWidget);

      // No gauge on this screen is anchored to the verdict scale any more.
      final centred = tester
          .widgetList<BArcGauge>(find.byType(BArcGauge))
          .where((g) => g.mode == BGaugeMode.fromCentre);
      expect(
        centred,
        isEmpty,
        reason: 'the verdict dial was removed on purpose (board v2)',
      );

      // And the mandatory conditional card is under it (spec §8.2).
      expect(find.byType(BWhatWouldChangeThis), findsOneWidget);
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
      await pumpScreen(tester, const PitScreen(parentTab: BNavTab.home), until: find.text('The Pit'));

      expect(
        find.textContaining('Coming in the next development phase'),
        findsOneWidget,
      );
    });

    testWidgets('promises no calls, targets or leaderboards', (tester) async {
      await pumpScreen(tester, const PitScreen(parentTab: BNavTab.home), until: find.text('The Pit'));

      expect(find.textContaining('No buy or sell calls'), findsOneWidget);
    });
  });

  group('dark theme', () {
    // The canvas ships no dark tokens at all, so the dark ramp is derived.
    // These prove every screen at least builds and paints under it.
    for (final (name, screen) in <(String, Widget)>[
      ('Home', const HomeScreen()),
      ('Market', const MarketScreen(parentTab: BNavTab.home)),
      ('You', const YouScreen()),
      ('The Pit', const PitScreen(parentTab: BNavTab.home)),
      ('Six Pillars', const CashOrTrashScreen(parentTab: BNavTab.home)),
      ('Scanner', const OpportunityScreen(parentTab: BNavTab.home)),
      ('Company', const CompanyScreen(ticker: 'COMI', parentTab: BNavTab.today)),
    ]) {
      testWidgets('$name builds in dark mode', (tester) async {
        await pumpScreen(tester, screen, themeMode: ThemeMode.dark);
        expect(tester.takeException(), isNull);
      });
    }
  });

  testWidgets('the company file says what its figures mean', (tester) async {
    // Eight rows of arithmetic leave the joining-up undone. The founder's
    // point: we say a company did X and never why anybody should care.
    await pumpScreen(
      tester,
      const CompanyScreen(ticker: 'COMI', parentTab: BNavTab.home),
    );
    // Case-insensitive: BSectionLabel uppercases Latin script.
    final heading =
        find.textContaining(RegExp('what that means', caseSensitive: false));
    await pumpUntil(tester, heading);

    expect(heading, findsOneWidget);
    // Each line is a fact with its mechanism attached, not a view on the share.
    expect(
      find.textContaining(RegExp('one session|did not trade|net profit')),
      findsWidgets,
    );
  });

  group('narrow layout', () {
    // 320pt is the narrowest phone the app will meet.
    for (final (name, screen) in <(String, Widget)>[
      ('Home', const HomeScreen()),
      ('Market', const MarketScreen(parentTab: BNavTab.home)),
      ('You', const YouScreen()),
      ('Six Pillars', const CashOrTrashScreen(parentTab: BNavTab.home)),
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
