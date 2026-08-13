import 'package:barbarian/app/router.dart';
import 'package:barbarian/core/models/quote_snapshot.dart';
import 'package:barbarian/core/providers.dart';
import 'package:barbarian/core/storage/document_cache.dart';
import 'package:barbarian/core/theme/barbarian_theme.dart';
import 'package:barbarian/core/widgets/nav.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// The whole app, router and all.
///
/// Everything else pumps one screen in isolation, which cannot catch a broken
/// shell: `selectTab` reaches for `StatefulNavigationShell.of(context)`, and if
/// that lookup fails every tab in the app is dead while every screen test still
/// passes.
Widget app({List<String>? watchlist, QuoteSnapshot? quotes}) {
  return ProviderScope(
    overrides: [
      documentSourceProvider.overrideWithValue(const DiskFixtureSource()),
      documentCacheProvider.overrideWithValue(MemoryDocumentCache()),
      quoteClientProvider.overrideWithValue(FakeQuoteClient(quotes)),
      userRepositoryProvider.overrideWithValue(
        FakeUserRepository(watchlist: watchlist),
      ),
    ],
    child: MaterialApp.router(
      routerConfig: buildRouter(),
      theme: BarbarianTheme.light(),
      darkTheme: BarbarianTheme.dark(),
    ),
  );
}

Future<void> boot(WidgetTester tester, {List<String>? watchlist}) async {
  usePhoneSurface(tester);
  await tester.pumpWidget(app(watchlist: watchlist));
  await pumpUntil(tester, find.byType(BGlassNav));
  await tester.pump(const Duration(seconds: 1));
}

/// Taps a bottom-nav destination by its accessibility label.
Future<void> tapTab(WidgetTester tester, BNavTab tab) async {
  await tester.tap(find.bySemanticsLabel(tab.label).last);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(useInMemoryPreferences);

  group('bottom navigation', () {
    testWidgets('boots on Home with the Home slot lit', (tester) async {
      await boot(tester);

      expect(find.text('Egyptian equities, unfiltered'), findsOneWidget);
      final nav = tester.widget<BGlassNav>(find.byType(BGlassNav));
      expect(nav.active, BNavTab.home);
    });

    testWidgets('every tab is reachable and lights its own slot', (
      tester,
    ) async {
      await boot(tester);

      for (final tab in BNavTab.values) {
        await tapTab(tester, tab);
        await pumpUntil(tester, find.byType(BGlassNav));

        final nav = tester.widget<BGlassNav>(find.byType(BGlassNav));
        expect(nav.active, tab, reason: 'tapping ${tab.label} did not light it');
        expect(tester.takeException(), isNull);
      }
    });

    testWidgets('Market, Pit and You each render their own screen', (
      tester,
    ) async {
      await boot(tester);

      await tapTab(tester, BNavTab.market);
      await pumpUntil(tester, find.byType(TextField));
      expect(find.text('Market'), findsOneWidget);

      await tapTab(tester, BNavTab.pit);
      await pumpUntil(tester, find.text('The Pit'));

      await tapTab(tester, BNavTab.you);
      await pumpUntil(tester, find.text('No account needed to read'));
    });

    testWidgets('each branch keeps its own scroll and state', (tester) async {
      await boot(tester);

      await tapTab(tester, BNavTab.market);
      await pumpUntil(tester, find.textContaining('El Sewedy Electric'));
      await tester.enterText(find.byType(TextField).first, 'swdy');
      await tester.pump();
      expect(find.textContaining('Commercial International Bank'), findsNothing);

      await tapTab(tester, BNavTab.you);
      await pumpUntil(tester, find.text('No account needed to read'));

      // Coming back must not have reset the branch.
      await tapTab(tester, BNavTab.market);
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.textContaining('El Sewedy Electric'), findsOneWidget);
      expect(find.textContaining('Commercial International Bank'), findsNothing);
    });
  });

  group('pushed routes', () {
    testWidgets('Home opens the Opportunity Scanner and comes back', (
      tester,
    ) async {
      await boot(tester);

      // The hero is only tappable once the scanner report has landed. Tap the
      // kicker, which is stable; the headline is now the report's own line.
      await pumpUntil(tester, find.text('OPPORTUNITY SCANNER'));
      await tester.tap(find.text('OPPORTUNITY SCANNER'));
      await pumpUntil(tester, find.text('Opportunity Scanner'));

      // Spec: a detail route never moves the app to another tab.
      final nav = tester.widget<BGlassNav>(find.byType(BGlassNav));
      expect(nav.active, BNavTab.home);

      await tester.tap(find.byIcon(Icons.arrow_back_ios_new_rounded).first);
      await pumpUntil(tester, find.text('Egyptian equities, unfiltered'));
    });

    testWidgets('Home opens Cash or Trash', (tester) async {
      await boot(tester);

      await pumpUntil(tester, find.text('Cash or Trash'));
      // The card sits low enough that a plain tap can land on the floating nav.
      await tapVisible(tester, find.text('Cash or Trash'));
      await pumpUntil(tester, find.textContaining('of 224 investigated'));

      final nav = tester.widget<BGlassNav>(find.byType(BGlassNav));
      expect(nav.active, BNavTab.home);
    });

    testWidgets('Market opens a company, keeping the Market slot lit', (
      tester,
    ) async {
      await boot(tester);

      await tapTab(tester, BNavTab.market);
      await pumpUntil(tester, find.byType(TextField));
      await tester.enterText(find.byType(TextField).first, 'COMI');
      await tester.pump();
      await pumpUntil(tester, find.textContaining('Commercial International'));

      await tapVisible(tester, find.textContaining('Commercial International'));
      // Waiting on 'SWDY' would be a false pass: the Market row's monogram
      // already renders that text. Wait for something only Company draws.
      await pumpUntil(tester, find.byIcon(Icons.bookmark_border_rounded));

      final nav = tester.widget<BGlassNav>(find.byType(BGlassNav));
      expect(
        nav.active,
        BNavTab.market,
        reason: 'opening a company must not move the app to another tab',
      );
    });

    testWidgets('following a company from its page reaches the watchlist', (
      tester,
    ) async {
      await boot(tester);

      await tapTab(tester, BNavTab.market);
      await pumpUntil(tester, find.byType(TextField));
      await tester.enterText(find.byType(TextField).first, 'COMI');
      await tester.pump();
      await pumpUntil(tester, find.textContaining('Commercial International'));
      await tapVisible(tester, find.textContaining('Commercial International'));
      await pumpUntil(tester, find.byIcon(Icons.bookmark_border_rounded));
      await tester.tap(find.byIcon(Icons.bookmark_border_rounded));
      // The follow control changes its icon, not just its fill (spec §42).
      await pumpUntil(tester, find.byIcon(Icons.bookmark_rounded));

      await tapTab(tester, BNavTab.you);
      await pumpUntil(tester, find.text('No account needed to read'));
      expect(find.text('COMI'), findsWidgets);
      expect(find.text('Empty watchlist'), findsNothing);
    });

    testWidgets('the empty-watchlist action moves the app to Market', (
      tester,
    ) async {
      await boot(tester);

      await tapTab(tester, BNavTab.you);
      await pumpUntil(tester, find.text('Empty watchlist'));

      await tester.tap(find.text('Browse companies'));
      await pumpUntil(tester, find.text('Market'));

      final nav = tester.widget<BGlassNav>(find.byType(BGlassNav));
      expect(nav.active, BNavTab.market);
    });
  });
}
