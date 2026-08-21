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
import 'package:barbarian/l10n/app_localizations.dart';

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
      // Mirrors main.dart: every screen resolves its copy through
      // AppLocalizations, so a router harness without the delegates throws on
      // the first string.
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      locale: const Locale('en'),
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

  /// Home's search pill is a link, not a field: the boards give the directory
  /// and its search their own surface. Everything that used to type on the
  /// front door now goes through here.
  Future<void> openSearch(WidgetTester tester) async {
    await pumpUntil(tester, find.text('Search by company name or symbol…'));
    await tapVisible(tester, find.text('Search by company name or symbol…'));
    await pumpUntil(tester, find.byType(TextField));
  }

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

    testWidgets('Today, The Pit and You each render their own screen', (
      tester,
    ) async {
      await boot(tester);

      await tapTab(tester, BNavTab.today);
      await pumpUntil(tester, find.text('Today'));

      await tapTab(tester, BNavTab.pit);
      await pumpUntil(tester, find.textContaining('The Pit'));

      await tapTab(tester, BNavTab.you);
      await pumpUntil(tester, find.text('No account needed to read'));
    });

    testWidgets('each branch keeps its own state', (tester) async {
      await boot(tester);

      // The search query is the branch state that has to survive a round
      // trip: it is what somebody typed, and losing it is losing their
      // question. It now lives on the directory, pushed onto Home's stack.
      await openSearch(tester);
      await tester.enterText(find.byType(TextField).first, 'swdy');
      await tester.pump();
      await pumpUntil(tester, find.textContaining('El Sewedy Electric'));
      expect(find.textContaining('Commercial International Bank'), findsNothing);

      await tapTab(tester, BNavTab.you);
      await pumpUntil(tester, find.text('No account needed to read'));

      // Coming back must not have reset the branch.
      await tapTab(tester, BNavTab.home);
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.textContaining('El Sewedy Electric'), findsOneWidget);
      expect(find.textContaining('Commercial International Bank'), findsNothing);
    });
  });

  group('pushed routes', () {
    testWidgets('asking Today for a section does not take the tab down', (
      tester,
    ) async {
      // Clearing the request inside `build` modified a provider while the
      // widget tree was building. Riverpod refuses that outright, and the
      // whole Today tab rendered as a red error screen instead.
      await boot(tester);
      await tapTab(tester, BNavTab.home);
      await pumpUntil(tester, find.textContaining(RegExp('All filings')));

      await tapVisible(tester, find.textContaining('All filings').first);
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pump(const Duration(milliseconds: 400));

      expect(
        find.textContaining('Tried to modify a provider'),
        findsNothing,
        reason: 'Today fell over when asked to scroll to a section',
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('Today opens the Scanner and comes back', (
      tester,
    ) async {
      await boot(tester);
      await tapTab(tester, BNavTab.today);

      // The hero is only tappable once the scanner report has landed. Tap the
      // kicker, which is stable; the headline is now the report's own line.
      await pumpUntil(tester, find.text('SCANNER'));
      await tester.tap(find.text('SCANNER'));
      await pumpUntil(tester, find.text('Scanner'));

      // Spec: a detail route never moves the app to another tab.
      final nav = tester.widget<BGlassNav>(find.byType(BGlassNav));
      expect(nav.active, BNavTab.today);

      await tester.tap(find.byIcon(Icons.arrow_back_ios_new_rounded).first);
      await pumpUntil(tester, find.text('Today'));
    });

    testWidgets('search opens a company, keeping the Home slot lit', (
      tester,
    ) async {
      await boot(tester);

      await openSearch(tester);
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
        BNavTab.home,
        reason: 'opening a company must not move the app to another tab',
      );
    });

    testWidgets('following a company from its page reaches the watchlist', (
      tester,
    ) async {
      await boot(tester);

      await openSearch(tester);
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

    // Market stopped being a destination, so this no longer moves the app to
    // another tab — it pushes the directory onto You's own stack, and You
    // stays lit. Same rule as every other detail route.
    testWidgets('the empty-watchlist action opens the directory', (
      tester,
    ) async {
      await boot(tester);

      await tapTab(tester, BNavTab.you);
      await pumpUntil(tester, find.text('Empty watchlist'));

      await tester.tap(find.text('Browse companies'));
      await pumpUntil(tester, find.text('The full directory'));

      final nav = tester.widget<BGlassNav>(find.byType(BGlassNav));
      expect(nav.active, BNavTab.you);
    });
  });
}
