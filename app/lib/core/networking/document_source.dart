import 'dart:async';

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
