import 'dart:convert';
import 'dart:io';

import 'package:barbarian/core/data/user_repository.dart';
import 'package:barbarian/core/models/quote_snapshot.dart';
import 'package:barbarian/core/providers.dart';
import 'package:barbarian/core/networking/document_source.dart';
import 'package:barbarian/core/networking/quote_client.dart';
import 'package:barbarian/core/storage/document_cache.dart';
import 'package:barbarian/core/theme/barbarian_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';
import 'package:barbarian/l10n/app_localizations.dart';

/// Reads the bundled fixtures straight off disk.
///
/// The production [FixtureDocumentSource] goes through `rootBundle`, which in
/// widget tests resolves over the platform-channel mock and stops completing
/// after the first test in a run — every later screen would sit forever on its
/// loading state. Reading the same files with `dart:io` removes the channel
/// from the picture entirely and makes these deterministic. The asset path is
/// exercised for real on device.
class DiskFixtureSource implements DocumentSource {
  const DiskFixtureSource();

  @override
  bool get isRefreshable => false;

  @override
  Future<String> fetch(String path) async {
    final file = File('assets/fixtures/$path');
    if (!file.existsSync()) {
      throw DocumentUnavailable(path, 'no fixture on disk at ${file.path}');
    }
    return file.readAsString();
  }
}

/// The session date carried by the bundled fixtures.
///
/// Read from disk rather than written into the tests, because the pipeline
/// regenerates the fixtures every day and a hardcoded date turns every
/// caption assertion into a failure the next morning.
final String fixtureSessionDate =
    (jsonDecode(File('assets/fixtures/market.json').readAsStringSync())
            as Map<String, dynamic>)['date']
        as String;

/// Reads a bundled fixture straight off disk and decodes it.
///
/// Same reasoning as [DiskFixtureSource]: `rootBundle` is unreliable across a
/// widget-test run, and these assertions are about the published bytes rather
/// than about asset loading.
Future<Map<String, dynamic>> readFixtureObject(String path) async =>
    jsonDecode(await File('assets/fixtures/$path').readAsString())
        as Map<String, dynamic>;

/// The synchronous twin of [readFixtureObject], for widget tests.
///
/// `testWidgets` runs its body in a zone with fake time, and awaiting a real
/// `dart:io` future in there does not always complete — a test that read a
/// fixture with `await` inside `testWidgets` hung until the runner was killed.
/// Reading synchronously removes the event loop from the question entirely.
Map<String, dynamic> readFixtureObjectSync(String path) =>
    jsonDecode(File('assets/fixtures/$path').readAsStringSync())
        as Map<String, dynamic>;

/// A ticker whose published document carries no usable price series.
///
/// Read from the fixtures rather than named in a test: which listings are
/// sparse changes as the pipeline recovers history, so any hardcoded example
/// eventually asserts the opposite of the truth.
Future<String?> sparseTicker() async {
  final dir = Directory('assets/fixtures/companies');
  if (!dir.existsSync()) return null;
  for (final file in dir.listSync().whereType<File>()) {
    final doc = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
    final history = doc['price_history'] as List? ?? const [];
    if (history.length < 3) return doc['ticker'] as String?;
  }
  return null;
}

/// A quote feed under the test's control.
///
/// The real one reaches the network, and a widget test that makes an HTTP call
/// hangs on a pending timer rather than failing cleanly. Every harness gets one
/// of these; pass a [snapshot] to exercise the live-price path.
class FakeQuoteClient implements QuoteClient {
  const FakeQuoteClient([this.snapshot]);

  /// Behaves like an unreachable feed: the app must fall back to published
  /// closes and say so.
  const FakeQuoteClient.unavailable() : snapshot = null;

  final QuoteSnapshot? snapshot;

  @override
  Future<QuoteSnapshot> latest() async {
    final s = snapshot;
    if (s == null) throw const FormatException('no quote feed in this test');
    return s;
  }
}

/// A live snapshot for the tickers a test cares about.
QuoteSnapshot fakeQuotes(
  Map<String, double> closes, {
  int delaySeconds = 900,
  bool sessionOpen = true,
  DateTime? readAt,
}) {
  return QuoteSnapshot(
    asOf: (readAt ?? DateTime.now()).toUtc().toIso8601String(),
    delaySeconds: delaySeconds,
    updateModes: ['delayed_streaming_$delaySeconds'],
    session: ExchangeSession(open: sessionOpen),
    quotes: {
      for (final e in closes.entries)
        e.key: LiveQuote(
          close: e.value,
          previousClose: e.value,
          changePercent: 0,
        ),
    },
  );
}

/// Gives `SharedPreferencesAsync` somewhere to write in tests, so the real
/// provider graph is exercised rather than stubbed out.
void useInMemoryPreferences() {
  SharedPreferencesAsyncPlatform.instance =
      InMemorySharedPreferencesAsync.empty();
}

/// An in-memory watchlist/bookmark store, so tests never touch platform
/// channels or real preferences.
class FakeUserRepository implements UserRepository {
  FakeUserRepository({List<String>? watchlist}) : _watchlist = [...?watchlist];

  final List<String> _watchlist;
  final List<Bookmark> _bookmarks = [];

  @override
  Stream<void> get changes => const Stream<void>.empty();

  @override
  Future<List<String>> watchlist() async => List.unmodifiable(_watchlist);

  @override
  Future<bool> isWatched(String ticker) async => _watchlist.contains(ticker);

  @override
  Future<void> addToWatchlist(String ticker) async {
    if (!_watchlist.contains(ticker)) _watchlist.insert(0, ticker);
  }

  @override
  Future<void> removeFromWatchlist(String ticker) async =>
      _watchlist.remove(ticker);

  @override
  Future<void> reorderWatchlist(List<String> tickers) async {
    _watchlist
      ..clear()
      ..addAll(tickers);
  }

  @override
  Future<List<Bookmark>> bookmarks() async => List.unmodifiable(_bookmarks);

  @override
  Future<bool> isBookmarked(BookmarkKind kind, String id) async =>
      _bookmarks.any((b) => b.storageKey == '${kind.id}:$id');

  @override
  Future<void> addBookmark(Bookmark bookmark) async =>
      _bookmarks.insert(0, bookmark);

  @override
  Future<void> removeBookmark(BookmarkKind kind, String id) async =>
      _bookmarks.removeWhere((b) => b.storageKey == '${kind.id}:$id');
}

/// Wraps a screen in the real theme and the real fixture-backed providers.
///
/// Everything below the widget is production code: the same models, the same
/// repositories, the same bundled fixtures the app ships with. Only the
/// on-device stores are faked.
Widget harness(
  Widget child, {
  List<String>? watchlist,
  ThemeMode themeMode = ThemeMode.light,
  QuoteSnapshot? quotes,
  Locale? locale = const Locale('en'),
}) {
  return ProviderScope(
    overrides: [
      documentSourceProvider.overrideWithValue(const DiskFixtureSource()),
      documentCacheProvider.overrideWithValue(MemoryDocumentCache()),
      // Without this the live-quote provider makes a real request and the test
      // dies on a pending timer instead of on an assertion.
      quoteClientProvider.overrideWithValue(FakeQuoteClient(quotes)),
      userRepositoryProvider.overrideWithValue(
        FakeUserRepository(watchlist: watchlist),
      ),
    ],
    child: MaterialApp(
      // The app is Arabic-first, so every screen resolves its copy through
      // AppLocalizations. A harness without the delegates throws the moment a
      // widget asks for a string.
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      locale: locale,
      theme: BarbarianTheme.light(),
      darkTheme: BarbarianTheme.dark(),
      themeMode: themeMode,
      home: child,
    ),
  );
}

/// Sizes the test surface like a real phone (iPhone 14/15/16/17 logical size).
///
/// The default 800x600 test surface is both too wide and too short for this
/// app: the floating navigation sits 22pt from the bottom and is 66pt tall, so
/// on a 600pt-high surface it covers content a user would never have to reach
/// past. A tap "on a list row" then lands on the nav instead — which silently
/// turned one navigation test into a false pass.
void usePhoneSurface(WidgetTester tester) {
  tester.view.physicalSize = const Size(390 * 3, 844 * 3);
  tester.view.devicePixelRatio = 3.0;
  addTearDown(tester.view.reset);
}

/// Scrolls [finder] to the middle of the screen and taps it.
///
/// `ensureVisible` alone is not enough: it stops as soon as the target is
/// technically on screen, which often leaves it under the floating navigation,
/// and the tap then lands on the glass instead of the row. Centring it removes
/// the ambiguity whatever the screen's layout does.
Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder.first);
  await tester.pump();

  final screen = tester.view.physicalSize.height / tester.view.devicePixelRatio;
  for (var attempt = 0; attempt < 4; attempt++) {
    final centre = tester.getCenter(finder.first);
    final offset = screen / 2 - centre.dy;
    if (offset.abs() < 40) break;
    await tester.drag(find.byType(Scrollable).first, Offset(0, offset));
    await tester.pump();
  }

  await tester.tap(finder.first, warnIfMissed: false);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
}

/// Pumps until [finder] matches, giving the fixture pipeline real time between
/// frames.
///
/// Waiting on a condition rather than on a fixed number of frames is the only
/// way these stay deterministic: each screen makes a different number of async
/// hops (cache read -> fixture fetch -> cache write -> parse -> emit, once per
/// provider it watches), so any fixed pump count is a race.
Future<void> pumpUntil(
  WidgetTester tester,
  Finder finder, {
  int rounds = 60,
}) async {
  for (var i = 0; i < rounds; i++) {
    if (finder.evaluate().isNotEmpty) {
      await tester.pump();
      return;
    }
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 15)),
    );
    await tester.pump();
  }
  fail('timed out waiting for: ${finder.describeMatch(Plurality.one)}');
}

/// [pumpUntil] for a condition that is not "a widget exists".
///
/// Some state only settles after a provider the screen watches has resolved —
/// a row that stops being a link once the directory says its company is gone,
/// for instance. There is no finder for "has settled", and a fixed pump count
/// is the same race as everywhere else, so the timeout carries the assertion:
/// pass the invariant as [reason] and a failure reads as the invariant broken.
Future<void> pumpUntilTrue(
  WidgetTester tester,
  bool Function() done, {
  required String reason,
  int rounds = 60,
}) async {
  for (var i = 0; i < rounds; i++) {
    if (done()) {
      await tester.pump();
      return;
    }
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 15)),
    );
    await tester.pump();
  }
  fail(reason);
}

/// Pumps a screen and waits for it to have painted something real.
Future<void> pumpScreen(
  WidgetTester tester,
  Widget screen, {
  List<String>? watchlist,
  ThemeMode themeMode = ThemeMode.light,
  Finder? until,
  bool phoneSurface = true,
}) async {
  if (phoneSurface) usePhoneSurface(tester);
  await tester.pumpWidget(
    harness(screen, watchlist: watchlist, themeMode: themeMode),
  );
  await pumpUntil(tester, until ?? find.byType(Scaffold));
  // Let entry animations and gauge fills finish so nothing is mid-flight.
  await tester.pump(const Duration(seconds: 1));
}
