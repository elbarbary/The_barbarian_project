import 'package:barbarian/app/router.dart';
import 'package:barbarian/core/models/quote_snapshot.dart';
import 'package:barbarian/core/auth/auth_controller.dart';
import 'package:barbarian/core/auth/identity.dart';
import 'package:barbarian/core/providers.dart';
import 'package:barbarian/core/storage/document_cache.dart';
import 'package:barbarian/core/theme/barbarian_theme.dart';
import 'package:barbarian/core/widgets/nav.dart';
import 'package:barbarian/features/exchange/index_levels.dart';
import 'package:barbarian/features/home/market_hero.dart';
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
      authInitialProvider.overrideWithValue(
        const Identity(mode: AuthMode.google, userId: 'test-account'),
      ),
      // The tests are a signed-in, live session; pinning this keeps the
      // auth notifier out of the document/freshness graph, which a fake-
      // async test does not set up and which would stall its streams.
      useFixturesProvider.overrideWithValue(false),
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
    await pumpUntil(tester, find.text('Search a company, or a symbol'));
    await tapVisible(tester, find.text('Search a company, or a symbol'));
    await pumpUntil(tester, find.byType(TextField));
  }

  group('bottom navigation', () {
    testWidgets('boots on Home with the Home slot lit', (tester) async {
      await boot(tester);

      expect(find.text('Egyptian shares, in plain words'), findsOneWidget);
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
        expect(
          nav.active,
          tab,
          reason: 'tapping ${tab.label} did not light it',
        );
        expect(tester.takeException(), isNull);
      }
    });

    testWidgets('Today, The Pit and You each render their own screen', (
      tester,
    ) async {
      await boot(tester);

      await tapTab(tester, BNavTab.today);
      await pumpUntil(tester, find.text('Today'));

      await tapTab(tester, BNavTab.calendar);
      await pumpUntil(tester, find.text('Calendar'));

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
      expect(
        find.textContaining('Commercial International Bank'),
        findsNothing,
      );

      await tapTab(tester, BNavTab.you);
      await pumpUntil(tester, find.text('No account needed to read'));

      // Coming back must not have reset the branch.
      await tapTab(tester, BNavTab.home);
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.textContaining('El Sewedy Electric'), findsOneWidget);
      expect(
        find.textContaining('Commercial International Bank'),
        findsNothing,
      );
    });
  });

  group('pushed routes', () {
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

    testWidgets('the search pill opens the directory, filters and all', (
      tester,
    ) async {
      // Home grew its own live search for one build, which answered with six
      // rows and no way to narrow them. The pill is a link again: what it
      // opens is the screen carrying the sector chips, the four sorts, the
      // researched toggle and the numeric filters.
      await boot(tester);
      await openSearch(tester);

      await pumpUntil(tester, find.text('The full directory'));
      // The chips are inside the directory's async view, so waiting on the
      // title alone would assert against a loading state.
      await pumpUntil(tester, find.text('Add a filter'));
      expect(find.text('Risers'), findsOneWidget);
      expect(find.text('Fallers'), findsOneWidget);
      expect(find.text('A–Z'), findsOneWidget);

      // Tapping a search box means the reader has already decided to type.
      final field = tester.widget<TextField>(find.byType(TextField).first);
      expect(field.autofocus, isTrue);

      final nav = tester.widget<BGlassNav>(find.byType(BGlassNav));
      expect(nav.active, BNavTab.home);
    });

    testWidgets('the hero opens the session at length', (tester) async {
      // The hero used to open the EGX 30's explainer sheet — one of the three
      // numbers on it, and none of the questions it provokes.
      await boot(tester);
      await tapTab(tester, BNavTab.home);
      // Waiting on the hero itself would tap its skeleton: the widget is in
      // the tree from the first frame and only becomes pressable once the
      // rates document lands.
      await pumpUntil(tester, find.byIcon(Icons.arrow_outward_rounded));

      await tapVisible(tester, find.byType(BMarketHero));
      await pumpUntil(tester, find.byType(BIndexPanel));

      expect(find.text('THE THREE INDICES'), findsOneWidget);

      final nav = tester.widget<BGlassNav>(find.byType(BGlassNav));
      expect(nav.active, BNavTab.home);
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

      // The account row sits above the watchlist now, so the empty-state
      // action can be below the fold — scroll it into view before tapping.
      await tapVisible(tester, find.text('Browse companies'));
      await pumpUntil(tester, find.text('The full directory'));

      final nav = tester.widget<BGlassNav>(find.byType(BGlassNav));
      expect(nav.active, BNavTab.you);
    });
  });
}
