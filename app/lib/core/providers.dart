import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'config/app_config.dart';
import 'data/market_repository.dart';
import 'data/research_repository.dart';
import 'data/sourced.dart';
import 'data/user_repository.dart';
import 'models/cash_or_trash.dart';
import 'models/disclosure.dart';
import 'models/news.dart';
import 'models/rates.dart';
import 'models/company.dart';
import 'models/market_snapshot.dart';
import 'models/opportunity.dart';
import 'models/price_freshness.dart';
import 'models/quote_snapshot.dart';
import 'networking/document_source.dart';
import 'networking/quote_client.dart';
import 'networking/static_api.dart';
import 'storage/document_cache.dart';

// ------------------------------------------------------------------ plumbing

final appConfigProvider = Provider<AppConfig>(
  (ref) => AppConfig.fromEnvironment(),
);

final documentSourceProvider = Provider<DocumentSource>((ref) {
  final config = ref.watch(appConfigProvider);
  if (config.useBundledFixtures) return const FixtureDocumentSource();
  return NetworkDocumentSource(config: config);
});

/// The compiled-in snapshot [StaticApi] falls back to, and never caches.
///
/// Null in fixture builds, where the primary source is already the bundle.
final documentSeedProvider = Provider<DocumentSource?>((ref) {
  return ref.watch(appConfigProvider).useBundledFixtures
      ? null
      : const FixtureDocumentSource();
});

final documentCacheProvider = Provider<DocumentCache>(
  (ref) => FileDocumentCache(),
);

final staticApiProvider = Provider<StaticApi>(
  (ref) => StaticApi(
    source: ref.watch(documentSourceProvider),
    cache: ref.watch(documentCacheProvider),
    seed: ref.watch(documentSeedProvider),
  ),
);

final marketRepositoryProvider = Provider<MarketRepository>(
  (ref) => MarketRepository(ref.watch(staticApiProvider)),
);

final researchRepositoryProvider = Provider<ResearchRepository>(
  (ref) => ResearchRepository(ref.watch(staticApiProvider)),
);

final sharedPreferencesProvider = Provider<SharedPreferencesAsync>(
  (ref) => SharedPreferencesAsync(),
);

final userRepositoryProvider = Provider<UserRepository>(
  (ref) => LocalUserRepository(ref.watch(sharedPreferencesProvider)),
);

/// True when the app is reading bundled fixtures, so screens can mark sample
/// prices rather than letting them pass as real (spec §49).
final isSampleDataProvider = Provider<bool>(
  (ref) => ref.watch(appConfigProvider).useBundledFixtures,
);

// --------------------------------------------------------------------- data
//
// Every one of these is a Stream, not a Future, because the contract is
// cache-first: the first event is whatever was on disk and a second event
// follows if the manifest says that resource moved (spec §17, §36).

final marketSnapshotProvider = StreamProvider<Sourced<MarketSnapshot>>(
  (ref) => ref.watch(marketRepositoryProvider).getMarketSnapshot(),
);

final companyDirectoryProvider = StreamProvider<Sourced<CompanyDirectory>>(
  (ref) => ref.watch(marketRepositoryProvider).getCompanies(),
);

final opportunityReportProvider = StreamProvider<Sourced<OpportunityReport>>(
  (ref) => ref.watch(researchRepositoryProvider).getOpportunityScanner(),
);

final cashOrTrashProvider = StreamProvider<Sourced<CashOrTrashIndex>>(
  (ref) => ref.watch(researchRepositoryProvider).getCashOrTrashIndex(),
);

final newsProvider = StreamProvider<Sourced<NewsFeed>>(
  (ref) => ref.watch(researchRepositoryProvider).getNews(),
);

final disclosuresProvider = StreamProvider<Sourced<DisclosureFeed>>(
  (ref) => ref.watch(researchRepositoryProvider).getDisclosures(),
);

final ratesProvider = StreamProvider<Sourced<RatesDoc>>(
  (ref) => ref.watch(researchRepositoryProvider).getRates(),
);

final companyProvider = StreamProvider.family<Sourced<Company>, String>(
  (ref, ticker) => ref.watch(marketRepositoryProvider).getCompany(ticker),
);

final priceHistoryProvider =
    StreamProvider.family<Sourced<List<PricePoint>>, String>(
      (ref, ticker) =>
          ref.watch(marketRepositoryProvider).getPriceHistory(ticker),
    );

/// The session date to show beside prices. Comes from the data, never the clock.
final marketDateProvider = Provider<String?>((ref) {
  return ref
      .watch(marketSnapshotProvider)
      .whenOrNull(data: (snapshot) => snapshot.value.date);
});

// -------------------------------------------------------------- live quotes
//
// The published documents above move once a day. These move every five minutes.
// They are kept apart on purpose: the static API is cache-first and gated on a
// manifest version, which is right for research and wrong for a price.

/// Re-checks the published research whenever the app comes back to the front.
///
/// A phone does not restart an app between readings — the process survives for
/// days — so without this the only way to see a second publish was to kill the
/// app. Someone who updated the site twice in a morning saw the first update
/// and nothing after it.
///
/// The manifest is forgotten first; invalidating the content providers alone
/// re-asks the cached manifest and changes nothing.
final contentRefreshProvider = Provider<void>((ref) {
  final lifecycle = AppLifecycleListener(
    onResume: () {
      ref.read(staticApiProvider).invalidateManifest();
      ref.invalidate(marketSnapshotProvider);
      ref.invalidate(companyDirectoryProvider);
      ref.invalidate(opportunityReportProvider);
      ref.invalidate(cashOrTrashProvider);
      ref.invalidate(newsProvider);
      ref.invalidate(ratesProvider);
      ref.invalidate(disclosuresProvider);
    },
  );
  ref.onDispose(lifecycle.dispose);
});

final quoteClientProvider = Provider<QuoteClient>((ref) => HttpQuoteClient());

/// Polls the quote Worker while the app is in front.
///
/// Errors are swallowed rather than surfaced. A failed poll means the reader
/// keeps seeing the last published closes, correctly labelled — which is a
/// worse price but not a wrong one. Turning it into an error state would blank
/// working screens over a dropped request.
final liveQuotesProvider = StreamProvider<QuoteSnapshot>((ref) {
  // Fixture builds have no business making network calls; the tests assert this.
  if (ref.watch(appConfigProvider).useBundledFixtures) {
    return const Stream<QuoteSnapshot>.empty();
  }

  final client = ref.watch(quoteClientProvider);
  final controller = StreamController<QuoteSnapshot>();
  Timer? timer;
  var disposed = false;
  var inFlight = false;

  Future<void> poll() async {
    // A slow request must not stack up behind the timer.
    if (disposed || inFlight) return;
    inFlight = true;
    try {
      final snapshot = await client.latest();
      if (!disposed && !controller.isClosed) controller.add(snapshot);
    } on Object {
      // Keep the last good snapshot on screen.
    } finally {
      inFlight = false;
    }
  }

  void start() {
    timer?.cancel();
    timer = Timer.periodic(AppConfig.quoteRefresh, (_) => poll());
  }

  // Backgrounded apps should not poll: the timer would fire on resume anyway and
  // the reader is not looking. Coming back to the front refetches immediately,
  // because the snapshot on screen is by then as old as the time spent away.
  final lifecycle = AppLifecycleListener(
    onResume: () {
      poll();
      start();
    },
    onHide: () {
      timer?.cancel();
      timer = null;
    },
  );

  poll();
  start();

  ref.onDispose(() {
    disposed = true;
    timer?.cancel();
    lifecycle.dispose();
    controller.close();
  });

  return controller.stream;
});

/// The published snapshot with live prices written over it.
///
/// Every screen that shows a price reads this rather than [marketSnapshotProvider],
/// so there is exactly one definition of "the current price" in the app.
final livePricesProvider = Provider<MarketSnapshot?>((ref) {
  final published = ref
      .watch(marketSnapshotProvider)
      .whenOrNull(data: (snapshot) => snapshot.value);
  if (published == null) return null;
  final live = ref.watch(liveQuotesProvider).whenOrNull(data: (q) => q);
  return live == null ? published : live.mergedOver(published);
});

/// How the prices currently on screen must be described (spec §49).
final priceFreshnessProvider = Provider<PriceFreshness>((ref) {
  return ref.watch(priceFreshnessForProvider(null));
});

/// The same, narrowed to one company.
///
/// The live feed is merged per ticker but the caption was written once for the
/// whole screen, so a company the feed does not carry — a suspended listing, a
/// name that dropped off the scan — sat under "15-min delayed" while showing a
/// price from the daily publish. Passing the ticker makes the caption describe
/// the number actually above it. Pass null on a screen showing many companies.
final priceFreshnessForProvider = Provider.family<PriceFreshness, String?>((
  ref,
  ticker,
) {
  if (ref.watch(isSampleDataProvider)) return const PriceFreshness.sample();

  final date = ref.watch(marketDateProvider);
  final published = ref
      .watch(marketSnapshotProvider)
      .whenOrNull(data: (s) => s.value);
  final fallback = date == null
      ? const PriceFreshness.unknown()
      : PriceFreshness.published(date, isClose: published?.isClose ?? true);

  final live = ref.watch(liveQuotesProvider).whenOrNull(data: (q) => q);
  if (live == null || live.isEmpty) return fallback;
  if (ticker != null && !live.quotes.containsKey(ticker)) return fallback;

  return PriceFreshness(
    kind: PriceFreshnessKind.live,
    delay: live.delay,
    readAt: live.readAt,
    sessionDate: date,
    sessionOpen: live.isSessionOpen,
  );
});

// --------------------------------------------------------------------- user

class WatchlistNotifier extends AsyncNotifier<List<String>> {
  UserRepository get _repo => ref.read(userRepositoryProvider);

  @override
  Future<List<String>> build() => _repo.watchlist();

  Future<void> add(String ticker) async {
    await _repo.addToWatchlist(ticker);
    state = AsyncData(await _repo.watchlist());
  }

  Future<void> remove(String ticker) async {
    await _repo.removeFromWatchlist(ticker);
    state = AsyncData(await _repo.watchlist());
  }

  Future<void> toggle(String ticker) async {
    final current = state.value ?? const <String>[];
    if (current.contains(ticker)) {
      await remove(ticker);
    } else {
      await add(ticker);
    }
  }

  Future<void> reorder(List<String> tickers) async {
    state = AsyncData(tickers);
    await _repo.reorderWatchlist(tickers);
  }
}

final watchlistProvider =
    AsyncNotifierProvider<WatchlistNotifier, List<String>>(
      WatchlistNotifier.new,
    );

class BookmarksNotifier extends AsyncNotifier<List<Bookmark>> {
  UserRepository get _repo => ref.read(userRepositoryProvider);

  @override
  Future<List<Bookmark>> build() => _repo.bookmarks();

  Future<void> toggle(Bookmark bookmark) async {
    final saved = await _repo.isBookmarked(bookmark.kind, bookmark.id);
    if (saved) {
      await _repo.removeBookmark(bookmark.kind, bookmark.id);
    } else {
      await _repo.addBookmark(bookmark);
    }
    state = AsyncData(await _repo.bookmarks());
  }
}

final bookmarksProvider =
    AsyncNotifierProvider<BookmarksNotifier, List<Bookmark>>(
      BookmarksNotifier.new,
    );

// -------------------------------------------------------------------- theme

class ThemeModeNotifier extends Notifier<ThemeMode> {
  static const String _key = 'settings.themeMode';

  @override
  ThemeMode build() {
    // Light by default, not the system's choice.
    //
    // The design boards are light, so the light theme is the one that was
    // actually drawn — every colour in it comes off them. The dark ramp is
    // derived. Defaulting to the system meant a phone set to dark opened the
    // app in the theme nobody drew.
    //
    // "Follow the system" is still offered in You, and a stored choice still
    // wins; this only changes what a fresh install opens in.
    //
    // The read is deferred rather than started inline: touching another
    // provider synchronously inside build() means a failure there — or a
    // synchronous completion — surfaces as "markNeedsBuild called during
    // build", which turns a missing preference into a crashed screen.
    Future<void>.microtask(_restore);
    return ThemeMode.light;
  }

  Future<void> _restore() async {
    try {
      final prefs = ref.read(sharedPreferencesProvider);
      final stored = await prefs.getString(_key);
      final mode = switch (stored) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        'system' => ThemeMode.system,
        // No stored choice: keep the light default rather than fall back to
        // the system, which would undo it on every launch.
        _ => ThemeMode.light,
      };
      if (mode != state) state = mode;
    } on Object {
      // No stored preference, or no preference store at all. The light default
      // stands.
    }
  }

  Future<void> set(ThemeMode mode) async {
    state = mode;
    await ref.read(sharedPreferencesProvider).setString(_key, mode.name);
  }
}

final themeModeProvider = NotifierProvider<ThemeModeNotifier, ThemeMode>(
  ThemeModeNotifier.new,
);

// ------------------------------------------------------------------- search

/// Search runs against the cached directory — no network per keystroke
/// (spec §35).
class SearchQueryNotifier extends Notifier<String> {
  @override
  String build() => '';

  void set(String query) => state = query;

  void clear() => state = '';
}

final searchQueryProvider = NotifierProvider<SearchQueryNotifier, String>(
  SearchQueryNotifier.new,
);

final searchResultsProvider = Provider<List<CompanySummary>>((ref) {
  final query = ref.watch(searchQueryProvider).trim().toLowerCase();
  final directory = ref
      .watch(companyDirectoryProvider)
      .whenOrNull(data: (d) => d.value);
  if (directory == null) return const [];

  final all = directory.companies;
  if (query.isEmpty) {
    return [...all]..sort((a, b) => a.ticker.compareTo(b.ticker));
  }

  final matches = all.where((c) => c.matches(query)).toList()
    ..sort((a, b) {
      final byRelevance = a.relevance(query).compareTo(b.relevance(query));
      return byRelevance != 0 ? byRelevance : a.ticker.compareTo(b.ticker);
    });
  return matches;
});
