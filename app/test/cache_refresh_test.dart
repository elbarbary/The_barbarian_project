import 'dart:convert';

import 'package:barbarian/core/networking/document_source.dart';
import 'package:barbarian/core/networking/static_api.dart';
import 'package:barbarian/core/storage/document_cache.dart';
import 'package:flutter_test/flutter_test.dart';

/// A source whose documents can be edited between reads, standing in for the
/// website being republished.
class _MutableSource implements DocumentSource {
  _MutableSource(this.docs, {required this.isRefreshable});

  Map<String, String> docs;

  /// Both paths matter: `false` is a bundled-fixture build, `true` is the
  /// live site. The stale-cache bug only showed on the fixture path.
  @override
  final bool isRefreshable;

  int fetches = 0;

  @override
  Future<String> fetch(String path) async {
    fetches++;
    final body = docs[path];
    if (body == null) throw DocumentUnavailable(path, 'not published');
    return body;
  }
}

String _manifest(String dataVersion, {int market = 1}) => jsonEncode({
  'schema_version': 1,
  'data_version': dataVersion,
  'market_date': '2026-08-12',
  'versions': {'market': market},
});

void main() {
  group('publishing an update reaches the app', () {
    test('a new data_version drops the stale cache', () async {
      final source = _MutableSource({
        'manifest.json': _manifest('v1'),
        'market.json': '{"date":"2026-08-12","stocks":{}}',
      }, isRefreshable: true);
      final cache = MemoryDocumentCache();
      final api = StaticApi(source: source, cache: cache);

      final first = await api.loadOnce('market.json', resource: 'market');
      expect(first!.body, contains('2026-08-12'));

      // The site republishes: new content, new fingerprint.
      source.docs = {
        'manifest.json': _manifest('v2', market: 2),
        'market.json': '{"date":"2026-08-13","stocks":{}}',
      };

      // A fresh session, same cache — exactly what reopening the app does.
      final next = StaticApi(source: source, cache: cache);
      final second = await next.loadOnce('market.json', resource: 'market');

      expect(
        second!.body,
        contains('2026-08-13'),
        reason: 'a republished document must reach the app, not the old cache',
      );
    });

    test('an unchanged data_version keeps serving the cache', () async {
      final source = _MutableSource({
        'manifest.json': _manifest('v1'),
        'market.json': '{"date":"2026-08-12","stocks":{}}',
      }, isRefreshable: true);
      final cache = MemoryDocumentCache();

      await StaticApi(source: source, cache: cache)
          .loadOnce('market.json', resource: 'market');
      final afterFirst = source.fetches;

      await StaticApi(source: source, cache: cache)
          .loadOnce('market.json', resource: 'market');

      // The manifest is re-read each session, but a resource whose counter has
      // not moved is served from cache rather than downloaded again.
      expect(source.fetches, afterFirst + 1);
    });

    test('bundled fixtures invalidate too, so a new build is never stale',
        () async {
      // The bug this covers: fixtures were treated as immutable, so the very
      // first launch's copy survived every later app build.
      final source = _MutableSource({
        'manifest.json': _manifest('build-1'),
        'opportunities/latest.json': '{"date":"2026-08-01"}',
      }, isRefreshable: false);
      final cache = MemoryDocumentCache();

      final before = await StaticApi(source: source, cache: cache)
          .loadOnce('opportunities/latest.json');
      expect(before!.body, contains('2026-08-01'));

      source.docs = {
        'manifest.json': _manifest('build-2'),
        'opportunities/latest.json': '{"date":"2026-08-06"}',
      };

      final after = await StaticApi(source: source, cache: cache)
          .loadOnce('opportunities/latest.json');
      expect(after!.body, contains('2026-08-06'));
    });

    test('an unreadable manifest leaves the cache intact', () async {
      final source = _MutableSource({
        'manifest.json': _manifest('v1'),
        'market.json': '{"date":"2026-08-12","stocks":{}}',
      }, isRefreshable: true);
      final cache = MemoryDocumentCache();
      await StaticApi(source: source, cache: cache).loadOnce('market.json');

      // Publisher breaks; the app must keep what it already has (spec §49).
      source.docs = {'manifest.json': 'not json at all'};
      final offline = StaticApi(source: source, cache: cache);
      final snapshot = await offline.loadOnce('market.json');

      expect(snapshot, isNotNull);
      expect(snapshot!.body, contains('2026-08-12'));
    });
  });
}
