import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../config/app_config.dart';

/// Thrown when a document could not be obtained. Callers are expected to fall
/// back to cache rather than surface an error screen (spec §49).
class DocumentUnavailable implements Exception {
  const DocumentUnavailable(this.path, this.reason);

  final String path;
  final String reason;

  @override
  String toString() => 'DocumentUnavailable($path): $reason';
}

/// Resolves a logical document path — relative to the static API root, e.g.
/// `manifest.json` or `companies/SWDY.json` — to its raw JSON text.
///
/// Two implementations exist so phase 1 can run entirely on bundled fixtures
/// (spec §57) and switch to the real Cloudflare-hosted API (spec §26) without
/// a single change above this line.
abstract interface class DocumentSource {
  Future<String> fetch(String path);

  /// Whether this source can be expected to have anything newer than what is
  /// already cached. Fixtures never change at runtime.
  bool get isRefreshable;
}

/// Reads from `https://<host>/data/v1/<path>`.
class NetworkDocumentSource implements DocumentSource {
  NetworkDocumentSource({required AppConfig config, Dio? dio})
    : _config = config,
      _dio =
          dio ??
          Dio(
            BaseOptions(
              connectTimeout: config.connectTimeout,
              receiveTimeout: config.receiveTimeout,
              // The static API is plain JSON text; decoding is done by the
              // repositories so a malformed body can be reported precisely.
              responseType: ResponseType.plain,
              headers: const {'Accept': 'application/json'},
            ),
          );

  final AppConfig _config;
  final Dio _dio;

  @override
  bool get isRefreshable => true;

  @override
  Future<String> fetch(String path) async {
    final url = '${_config.dataRoot}/$path';
    try {
      final response = await _dio.get<String>(url);
      final body = response.data;
      if (body == null || body.isEmpty) {
        throw DocumentUnavailable(path, 'empty response from $url');
      }
      return body;
    } on DioException catch (e) {
      throw DocumentUnavailable(path, _describe(e));
    }
  }

  static String _describe(DioException e) => switch (e.type) {
    DioExceptionType.connectionTimeout => 'connection timed out',
    DioExceptionType.receiveTimeout => 'receive timed out',
    DioExceptionType.sendTimeout => 'send timed out',
    DioExceptionType.connectionError => 'no connection',
    DioExceptionType.badResponse => 'http ${e.response?.statusCode ?? "error"}',
    DioExceptionType.cancel => 'cancelled',
    _ => e.message ?? 'request failed',
  };
}

// A `SeededNetworkDocumentSource` used to live here, substituting the bundled
// copy whenever a request failed. It was removed rather than fixed: because the
// substitution was invisible to the caller, `StaticApi` wrote build-time bytes
// into the cache stamped with the live manifest's version, and a single timed-out
// fetch on a fresh install pinned the app to its compiled-in data permanently.
//
// The seed now belongs to `StaticApi`, which knows not to cache it. Do not
// reintroduce a source that silently answers for another one.

/// Reads from `assets/fixtures/<path>` (spec §57).
///
/// This is what makes the app useful before the data pipeline of phase 2
/// exists, and it is also what the widget tests run against.
class FixtureDocumentSource implements DocumentSource {
  const FixtureDocumentSource({AssetBundle? bundle}) : _bundle = bundle;

  final AssetBundle? _bundle;

  @override
  bool get isRefreshable => false;

  @override
  Future<String> fetch(String path) async {
    final bundle = _bundle ?? rootBundle;
    try {
      return await bundle.loadString('assets/fixtures/$path');
    } on FlutterError {
      throw DocumentUnavailable(path, 'no fixture bundled for this path');
    }
  }
}

/// The document source a **guest** reads — the bundled fixtures, rewritten on
/// the way through so nothing real reaches a logged-out screen.
///
/// The product rule is that a guest gets a working demo, not the live market:
/// real tickers become `DEMO1..N`, every company name becomes `Sample Co …`,
/// and every price, volume and reported figure becomes an obviously-round fake.
/// A reader who wants the actual EGX must sign in. It wraps the real
/// [FixtureDocumentSource] rather than shipping a second dataset, so it can
/// never drift from the schema the app expects — the *shape* is preserved and
/// only the *values* are faked, which is what keeps it from crashing a screen.
///
/// Tickers are also file paths (`companies/COMI.json`), so the mapping has to be
/// reversible: the app, holding only `DEMO5`, will ask for `companies/DEMO5.json`,
/// and this maps that back to the real file before reading it. The map is built
/// once from `companies.json` (sorted, so `DEMO5` is the same company every
/// launch) and cached.
class DemoDocumentSource implements DocumentSource {
  DemoDocumentSource(this._inner);

  final DocumentSource _inner;

  Map<String, String>? _toDemo; // real ticker -> DEMOn
  Map<String, String>? _toReal; // DEMOn -> real ticker

  static final RegExp _demoToken = RegExp(r'DEMO\d+');

  // Only these keys carry a company name or a figure worth hiding; everything
  // else (dates, period labels, sectors, ids, counts, flags) passes through so
  // the app still has the structure it parses against.
  static const Set<String> _tickerKeys = {'ticker', 'symbol', 'code'};
  static const Set<String> _nameKeys = {
    'name', 'name_en', 'name_ar', 'name_arabic', 'company', 'company_name',
    'short_name',
  };
  static const Set<String> _numKeys = {
    'close', 'previous_close', 'last_close', 'open', 'high', 'low', 'change',
    'change_percent', 'volume', 'avg_volume_30d', 'median_volume_20d',
    'relative_volume_10d', 'rv20', 'normal_value_30d', 'market_cap',
    'shares_outstanding', 'free_float', 'float_shares', 'perf_1w', 'perf_1m',
    'perf_3m', 'five_session_change', 'eps', 'net_income', 'value',
    'peer_median', 'median', 'v', 'ratio', 'dividend_yield', 'pe', 'pb', 'roa',
    'roe', 'revenue', 'equity', 'assets', 'turnover',
  };

  @override
  bool get isRefreshable => false;

  Future<void> _ensureMap() async {
    if (_toDemo != null) return;
    final toDemo = <String, String>{};
    final toReal = <String, String>{};
    try {
      final decoded = jsonDecode(await _inner.fetch('companies.json'));
      final List<dynamic> list;
      if (decoded is List) {
        list = decoded;
      } else if (decoded is Map) {
        final rows = decoded['companies'] ?? decoded['items'];
        list = rows is List ? rows : const <dynamic>[];
      } else {
        list = const <dynamic>[];
      }
      final tickers = <String>[];
      for (final entry in list) {
        final t = entry is Map ? entry['ticker'] : null;
        if (t is String && t.isNotEmpty) tickers.add(t);
      }
      tickers.sort();
      for (var i = 0; i < tickers.length; i++) {
        final demo = 'DEMO${i + 1}';
        toDemo[tickers[i]] = demo;
        toReal[demo] = tickers[i];
      }
    } catch (_) {
      // No directory to map against — the name/number faking below still runs;
      // only the ticker relabelling is skipped.
    }
    _toDemo = toDemo;
    _toReal = toReal;
  }

  @override
  Future<String> fetch(String path) async {
    await _ensureMap();
    final real = _toReal!.isEmpty
        ? path
        : path.replaceAllMapped(_demoToken, (m) => _toReal![m[0]!] ?? m[0]!);
    final raw = await _inner.fetch(real);
    final dynamic decoded;
    try {
      decoded = jsonDecode(raw);
    } catch (_) {
      return raw; // not JSON we can rewrite; hand it back untouched.
    }
    return jsonEncode(_demoize(decoded, null));
  }

  dynamic _demoize(dynamic node, String? key) {
    if (node is Map) {
      // A name given as an object — the company document's `{"en": …, "ar": …}`
      // — is faked wholesale rather than recursed into, since its child keys
      // (`en`/`ar`) are not names anywhere else and must not be relabelled there.
      if (key != null && _nameKeys.contains(key)) {
        // Seed each localisation off its OWN source string, so the flat
        // `name_en` in the directory and the nested `name.en` in the company
        // document land on the SAME "Sample Co" for one company.
        return <String, dynamic>{
          for (final entry in node.entries)
            '${entry.key}': _sampleName(entry.value?.toString() ?? '',
                arabic: entry.key == 'ar' ||
                    _isArabic(entry.value?.toString() ?? '')),
        };
      }
      final out = <String, dynamic>{};
      node.forEach((k, v) {
        // A map keyed by ticker (market.json's `stocks`) has its keys relabelled
        // too, so the row for DEMO5 lines up with the DEMO5 the app navigates to.
        final key = k is String ? k : k.toString();
        final nk = _toDemo!.containsKey(key) ? _toDemo![key]! : key;
        out[nk] = _demoize(v, key);
      });
      return out;
    }
    if (node is List) return [for (final e in node) _demoize(e, key)];
    if (node is String) return _demoString(node, key);
    if (node is num) return _demoNum(node, key);
    return node;
  }

  String _demoString(String value, String? key) {
    if (key != null && _tickerKeys.contains(key)) {
      return _toDemo![value] ?? value;
    }
    if (key != null && _nameKeys.contains(key)) {
      final arabic = key == 'name_ar' || key == 'name_arabic' || _isArabic(value);
      return _sampleName(value, arabic: arabic);
    }
    return value;
  }

  // A stable placeholder name for one company, seeded off its real name so the
  // same company reads the same everywhere it appears.
  String _sampleName(String seed, {required bool arabic}) {
    final h = _hash(seed);
    return arabic
        ? 'شركة تجريبية ${h % 900 + 100}'
        : 'Sample Co ${String.fromCharCode(65 + h % 26)}';
  }

  num _demoNum(num value, String? key) {
    if (key == null || !_numKeys.contains(key) || value == 0) return value;
    // An obviously-round fake of the same magnitude and sign as the original, so
    // charts and columns stay sane while the figure itself is plainly invented.
    final magnitude = value.abs().toDouble();
    final exp = (math.log(magnitude) / math.ln10).floor();
    final lead = _hash('$key:$value') % 9 + 1; // 1..9
    final fake = lead * math.pow(10, exp).toDouble();
    final signed = value.isNegative ? -fake : fake;
    if (value is int) return signed.round();
    final decimals = exp < 0 ? (-exp + 1).clamp(0, 6) : 2;
    return double.parse(signed.toStringAsFixed(decimals));
  }

  static bool _isArabic(String s) =>
      s.runes.any((r) => r >= 0x0600 && r <= 0x06FF);

  static int _hash(String s) {
    var h = 0;
    for (final c in s.codeUnits) {
      h = (h * 31 + c) & 0x7fffffff;
    }
    return h;
  }
}
