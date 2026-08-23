import 'dart:async';
import 'dart:convert';

import '../models/manifest.dart';
import '../storage/document_cache.dart';
import 'document_source.dart';

/// A document together with everything the UI needs to be honest about it:
/// where it came from and how old it is (spec §49).
class DocumentSnapshot {
  const DocumentSnapshot({
    required this.body,
    required this.origin,
    required this.storedAt,
  });

  final String body;
  final DocumentOrigin origin;

  /// When this copy was obtained. Null for fixtures, which have no age.
  final DateTime? storedAt;

  bool get isFromCache => origin == DocumentOrigin.cache;

  Map<String, dynamic> decodeObject() {
    final decoded = jsonDecode(body);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('expected a JSON object');
    }
    return decoded;
  }
}

enum DocumentOrigin { cache, network, fixture }

/// Reads the static app API, cache first (spec §17, §36).
///
/// The contract for every call site is: **you may be given a cached document
/// immediately and a fresher one shortly after**. Nothing here ever blocks
/// startup waiting on the network.
class StaticApi {
  StaticApi({
    required DocumentSource source,
    required DocumentCache cache,
    DocumentSource? seed,
  }) : _source = source,
       _cache = cache,
       _seed = seed;

  final DocumentSource _source;
  final DocumentCache _cache;

  /// The compiled-in snapshot, shown when there is neither a cached copy nor a
  /// reachable network — so a first launch on a bad connection has something
  /// honest on screen instead of four empty states.
  ///
  /// It is read **here** rather than hidden behind [_source] on purpose. When a
  /// seeded source substituted the bundle silently, [load] could not tell the
  /// two apart and wrote build-time bytes into the cache stamped with the live
  /// manifest's version. One timed-out fetch on a fresh install then pinned the
  /// app to its compiled-in data on every later launch, however good the
  /// connection — the exact failure the seed exists to avoid.
  ///
  /// Seed content is never cached and never claims a version.
  final DocumentSource? _seed;

  static const String manifestPath = 'manifest.json';

  Manifest? _manifest;
  Future<Manifest?>? _inFlightManifest;
  DateTime? _manifestAt;

  /// How long a fetched manifest is trusted before it is read again.
  ///
  /// The manifest used to be fetched once and kept for the life of the process,
  /// and nothing ever passed `forceRefresh`. On iOS a process survives for days,
  /// so an app that had been opened once never saw another publish — and the
  /// Refresh button did not help, because it invalidated the providers, which
  /// re-asked the *cached* manifest, got the same versions, and served the same
  /// cached documents. Two updates in a day, and only the first arrived.
  ///
  /// The document is a couple of hundred bytes, so re-reading it once a minute
  /// costs nothing next to being silently wrong for a day.
  static const Duration manifestTtl = Duration(minutes: 1);

  /// The version a document must match to be served from cache.
  ///
  /// This is what carries a website update through to an installed app. It is
  /// deliberately a **per-document comparison** rather than a global cache
  /// wipe: several screens subscribe at once, and clearing the directory
  /// underneath them deleted documents that were mid-write, which surfaced as
  /// "not downloaded yet" on a device that had the data.
  ///
  /// Resources named in the manifest use their own counter. Everything else —
  /// an individual company, a historical report — is guarded by the whole
  /// publication's `data_version`, so a republish invalidates those too.
  Future<int> _expectedVersion(String? resource) async {
    final m = await manifest();
    if (m == null) return 0;
    if (resource != null) return m.versions.versionOf(resource);
    return m.dataVersion.hashCode;
  }

  /// The manifest for this app session. Fetched at most once unless forced.
  ///
  /// Returns null when it cannot be obtained or is a schema this build does not
  /// understand — in both cases callers must keep serving cache rather than
  /// risk misparsing a newer format.
  Future<Manifest?> manifest({bool forceRefresh = false}) {
    if (!forceRefresh) {
      final cached = _manifest;
      final at = _manifestAt;
      final fresh = at != null && DateTime.now().difference(at) < manifestTtl;
      if (cached != null && fresh) return Future.value(cached);
      final pending = _inFlightManifest;
      if (pending != null) return pending;
    }
    // Cleared when it settles, or the TTL above is dead code.
    //
    // The future was assigned and never nulled, so the `pending != null` check
    // was permanently true after the first call and every later read got the
    // launch-time manifest back — including reads made *after* the TTL had
    // lapsed, which is the exact case the TTL exists for. The sharper version
    // of the same bug: a cold start with no network leaves a completed future
    // holding null pinned there for the life of the process, so the app cannot
    // recover in-session even once the network returns.
    //
    // Guarded on identity so a refresh that starts while this one is settling
    // does not have its own future cleared out from under it.
    final loading = _loadManifest();
    _inFlightManifest = loading;
    return loading.whenComplete(() {
      if (identical(_inFlightManifest, loading)) _inFlightManifest = null;
    });
  }

  /// Forget the manifest so the next read goes to the network.
  ///
  /// Called when the reader has said, or implied, that they want current data:
  /// tapping Refresh, or bringing the app back to the front after it has been
  /// away.
  void invalidateManifest() {
    _manifest = null;
    _manifestAt = null;
    _inFlightManifest = null;
  }

  Future<Manifest?> _loadManifest() async {
    if (!_source.isRefreshable) {
      // Fixture builds have a manifest too, and it changes whenever the build
      // scripts regenerate the bundled data.
      try {
        final body = await _source.fetch(manifestPath);
        final parsed = Manifest.fromJson(
          jsonDecode(body) as Map<String, dynamic>,
        );
        if (!parsed.isSupported) return null;
        _manifestAt = DateTime.now();
        return _manifest = parsed;
      } on Object {
        return null;
      }
    }

    try {
      final body = await _source.fetch(manifestPath);
      final parsed = Manifest.fromJson(
        jsonDecode(body) as Map<String, dynamic>,
      );
      if (!parsed.isSupported) return null;
      await _cache.write(manifestPath, body, version: parsed.schemaVersion);
      _manifestAt = DateTime.now();
      return _manifest = parsed;
    } on Object {
      // Offline. Fall back to the last manifest we successfully stored so the
      // version comparison still works against cached documents.
      //
      // The whole of this recovery is guarded, including the cache read. It is
      // an error handler, and an error handler that can throw is worse than no
      // error handler at all: a cache that threw here escaped `_loadManifest`
      // entirely and errored every document stream in the app.
      try {
        final cached = await _cache.read(manifestPath);
        if (cached == null) return null;
        final parsed = Manifest.fromJson(
          jsonDecode(cached.body) as Map<String, dynamic>,
        );
        _manifestAt = DateTime.now();
        return _manifest = parsed.isSupported ? parsed : null;
      } on Object {
        return null;
      }
    }
  }

  /// Yields the cached document first when one exists, then a fresh one if the
  /// manifest says that resource has moved on.
  ///
  /// [resource] names the manifest version counter guarding this document —
  /// one of [ManifestVersions.resources]. Pass null for documents with no
  /// counter (an individual company file, a historical scanner report); those
  /// are fetched once and then served from cache.
  Stream<DocumentSnapshot> load(String path, {String? resource}) async* {
    // The manifest decides whether the cache is still valid, so it is read
    // before the cache rather than after.
    final wanted = await _expectedVersion(resource);
    // The cache is an optimisation and is not allowed to break a screen. If it
    // throws, the honest state is "nothing cached", and the fetch below still
    // runs. An unguarded read here errored the whole stream before any request
    // was made, so every screen said "not downloaded yet" on a working
    // connection — with no network error anywhere, because none had occurred.
    CachedDocument? cached;
    try {
      cached = await _cache.read(path);
    } on Object {
      cached = null;
    }
    final isCurrent = cached != null && cached.version == wanted;

    if (cached != null) {
      yield DocumentSnapshot(
        body: cached.body,
        origin: DocumentOrigin.cache,
        storedAt: cached.storedAt,
      );
      if (isCurrent) return;
    }

    try {
      final body = await _source.fetch(path);
      // Storing the copy is the last thing that should be able to lose it: the
      // document is already in hand, and failing to write it is a slower next
      // launch, not a broken screen. A throw here is not a DocumentUnavailable,
      // so it sailed past the handler below and errored the stream.
      try {
        await _cache.write(path, body, version: wanted);
      } on Object {
        // Nothing to do — the document is served either way.
      }
      yield DocumentSnapshot(
        body: body,
        origin: _source.isRefreshable
            ? DocumentOrigin.network
            : DocumentOrigin.fixture,
        storedAt: _source.isRefreshable ? DateTime.now() : null,
      );
    } on DocumentUnavailable {
      // Nothing fresher available. If cache was already yielded the screen is
      // fine; if not, fall back to the compiled-in copy so a first launch on a
      // bad connection still shows something.
      if (cached != null) return;

      final body = await _seedBody(path);
      // Report the network's reason rather than the bundle's: "http 404" tells
      // the reader something, "no fixture bundled" does not.
      if (body == null) rethrow;

      yield DocumentSnapshot(
        body: body,
        origin: DocumentOrigin.fixture,
        // Deliberately not cached and given no timestamp: this is build-time
        // data standing in for a download that failed, and the next launch must
        // try the network again rather than find a current-looking cache entry
        // and stop there.
        storedAt: null,
      );
    }
  }

  Future<String?> _seedBody(String path) async {
    final seed = _seed;
    if (seed == null) return null;
    try {
      return await seed.fetch(path);
    } on Object {
      return null;
    }
  }

  /// One-shot fetch that prefers cache and never throws when cache exists.
  Future<DocumentSnapshot?> loadOnce(String path, {String? resource}) async {
    DocumentSnapshot? last;
    await for (final snapshot in load(path, resource: resource)) {
      last = snapshot;
    }
    return last;
  }

  /// Drops every cached document. Used by the "clear cache" affordance in You.
  Future<void> clearCache() async {
    _manifest = null;
    _inFlightManifest = null;
    await _cache.clear();
  }
}
