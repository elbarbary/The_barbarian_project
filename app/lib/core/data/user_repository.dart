import 'dart:async';
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// On-device watchlist and bookmarks (spec §30, §33).
///
/// No account is required for any of this, and no account exists yet. When
/// sync arrives in phase 4 it becomes a second implementation behind the same
/// interface — the screens do not change.
///
/// A watchlist entry is **a ticker and nothing else**. It records that the user
/// wants to follow a company, not that they own it: no share count, no cost
/// basis, no risk tolerance (spec §33).
abstract interface class UserRepository {
  Future<List<String>> watchlist();
  Future<bool> isWatched(String ticker);
  Future<void> addToWatchlist(String ticker);
  Future<void> removeFromWatchlist(String ticker);
  Future<void> reorderWatchlist(List<String> tickers);

  Future<List<Bookmark>> bookmarks();
  Future<bool> isBookmarked(BookmarkKind kind, String id);
  Future<void> addBookmark(Bookmark bookmark);
  Future<void> removeBookmark(BookmarkKind kind, String id);

  /// Emits whenever the watchlist or bookmarks change, so Home and the company
  /// screen stay in step without polling.
  Stream<void> get changes;
}

enum BookmarkKind {
  cashOrTrash('cash_or_trash'),
  opportunity('opportunity'),
  research('research');

  const BookmarkKind(this.id);

  final String id;

  static BookmarkKind parse(String? raw) => switch (raw) {
    'opportunity' => BookmarkKind.opportunity,
    'research' => BookmarkKind.research,
    _ => BookmarkKind.cashOrTrash,
  };
}

class Bookmark {
  const Bookmark({
    required this.kind,
    required this.id,
    required this.title,
    this.subtitle,
    this.url,
  });

  final BookmarkKind kind;
  final String id;
  final String title;
  final String? subtitle;
  final String? url;

  String get storageKey => '${kind.id}:$id';

  Map<String, dynamic> toJson() => {
    'kind': kind.id,
    'id': id,
    'title': title,
    if (subtitle != null) 'subtitle': subtitle,
    if (url != null) 'url': url,
  };

  static Bookmark fromJson(Map<String, dynamic> json) => Bookmark(
    kind: BookmarkKind.parse(json['kind'] as String?),
    id: json['id'] as String? ?? '',
    title: json['title'] as String? ?? '',
    subtitle: json['subtitle'] as String?,
    url: json['url'] as String?,
  );
}

class LocalUserRepository implements UserRepository {
  LocalUserRepository(this._prefs, {this.namespace = 'guest'});

  final SharedPreferencesAsync _prefs;
  final StreamController<void> _changes = StreamController<void>.broadcast();

  /// Whose lists these are. Each identity keeps its own so a shared phone does
  /// not merge two people's watchlists. The original guest keeps the app's
  /// first, un-suffixed keys, so a device used before accounts existed does not
  /// look like it lost its list.
  final String namespace;

  String get _watchlistKey => namespace == 'guest'
      ? 'watchlist.tickers'
      : 'watchlist.tickers.$namespace';
  String get _bookmarksKey =>
      namespace == 'guest' ? 'bookmarks.entries' : 'bookmarks.entries.$namespace';

  @override
  Stream<void> get changes => _changes.stream;

  @override
  Future<List<String>> watchlist() async =>
      await _prefs.getStringList(_watchlistKey) ?? const [];

  @override
  Future<bool> isWatched(String ticker) async =>
      (await watchlist()).contains(ticker);

  @override
  Future<void> addToWatchlist(String ticker) async {
    final current = await watchlist();
    if (current.contains(ticker)) return;
    // Newest first: a company you just followed should be the one you see.
    await _prefs.setStringList(_watchlistKey, [ticker, ...current]);
    _notify();
  }

  @override
  Future<void> removeFromWatchlist(String ticker) async {
    final current = await watchlist();
    if (!current.contains(ticker)) return;
    await _prefs.setStringList(
      _watchlistKey,
      current.where((t) => t != ticker).toList(),
    );
    _notify();
  }

  @override
  Future<void> reorderWatchlist(List<String> tickers) async {
    await _prefs.setStringList(_watchlistKey, tickers);
    _notify();
  }

  @override
  Future<List<Bookmark>> bookmarks() async {
    final raw = await _prefs.getStringList(_bookmarksKey) ?? const [];
    return [
      for (final entry in raw)
        if (_decode(entry) case final Bookmark b) b,
    ];
  }

  @override
  Future<bool> isBookmarked(BookmarkKind kind, String id) async {
    final key = '${kind.id}:$id';
    return (await bookmarks()).any((b) => b.storageKey == key);
  }

  @override
  Future<void> addBookmark(Bookmark bookmark) async {
    final current = await bookmarks();
    if (current.any((b) => b.storageKey == bookmark.storageKey)) return;
    await _writeBookmarks([bookmark, ...current]);
  }

  @override
  Future<void> removeBookmark(BookmarkKind kind, String id) async {
    final key = '${kind.id}:$id';
    final current = await bookmarks();
    if (!current.any((b) => b.storageKey == key)) return;
    await _writeBookmarks(current.where((b) => b.storageKey != key).toList());
  }

  Future<void> _writeBookmarks(List<Bookmark> entries) async {
    await _prefs.setStringList(_bookmarksKey, [
      for (final b in entries) _encode(b),
    ]);
    _notify();
  }

  void _notify() {
    if (!_changes.isClosed) _changes.add(null);
  }

  Future<void> dispose() => _changes.close();

  static String _encode(Bookmark b) => jsonEncode(b.toJson());

  static Bookmark? _decode(String raw) {
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) return null;
      return Bookmark.fromJson(decoded);
    } on FormatException {
      // A single unreadable bookmark must not take the list down.
      return null;
    }
  }
}
