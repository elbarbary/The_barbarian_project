import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

/// A cached document plus the manifest version it was published under.
class CachedDocument {
  const CachedDocument({
    required this.body,
    required this.version,
    required this.storedAt,
  });

  final String body;
  final int version;
  final DateTime storedAt;
}

/// Persistence for the static API's documents (spec §36).
///
/// Deliberately an interface: the repositories above it must not know whether
/// this is files, a key-value store or a database.
abstract interface class DocumentCache {
  Future<CachedDocument?> read(String key);

  Future<void> write(String key, String body, {required int version});

  Future<void> delete(String key);

  Future<void> clear();
}

/// File-backed cache under the app's support directory.
///
/// Files rather than a database because every cached item is already a JSON
/// document keyed by name, and a database would add a dependency, a migration
/// surface and a build step for no gain (spec §47, §48).
class FileDocumentCache implements DocumentCache {
  FileDocumentCache({Directory? root}) : _root = root;

  Directory? _root;
  Future<Directory>? _pending;

  Future<Directory> _dir() {
    final existing = _root;
    if (existing != null) return Future.value(existing);
    return _pending ??= _resolve();
  }

  Future<Directory> _resolve() async {
    final support = await getApplicationSupportDirectory();
    final dir = Directory('${support.path}/static-cache');
    if (!dir.existsSync()) {
      await dir.create(recursive: true);
    }
    _root = dir;
    return dir;
  }

  /// Document keys contain slashes (`companies/SWDY.json`). Flattening them
  /// keeps the cache a single directory and avoids any chance of a key
  /// escaping it via `..`.
  static String _fileNameFor(String key) {
    final safe = key.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');
    return '$safe.cache.json';
  }

  Future<File> _fileFor(String key) async =>
      File('${(await _dir()).path}/${_fileNameFor(key)}');

  @override
  Future<CachedDocument?> read(String key) async {
    try {
      final file = await _fileFor(key);
      if (!file.existsSync()) return null;
      final raw = await file.readAsString();
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) return null;
      final body = decoded['body'];
      if (body is! String) return null;
      final version = decoded['version'];
      final storedAt = DateTime.tryParse(decoded['stored_at'] as String? ?? '');
      return CachedDocument(
        body: body,
        version: version is int ? version : 0,
        storedAt: storedAt ?? DateTime.fromMillisecondsSinceEpoch(0),
      );
    } on FormatException {
      // A truncated or corrupt cache entry is not an error worth surfacing —
      // it just means there is nothing cached (spec §49).
      await delete(key);
      return null;
    } on FileSystemException {
      return null;
    }
  }

  @override
  Future<void> write(String key, String body, {required int version}) async {
    try {
      final file = await _fileFor(key);
      final payload = jsonEncode({
        'body': body,
        'version': version,
        'stored_at': DateTime.now().toUtc().toIso8601String(),
      });
      // Write to a sibling then rename, so an interrupted write can never
      // leave a half-document that later reads as corrupt.
      final tmp = File('${file.path}.tmp');
      await tmp.writeAsString(payload, flush: true);
      await tmp.rename(file.path);
    } on FileSystemException {
      // Caching is an optimisation. Failing to cache must never fail a screen.
    }
  }

  @override
  Future<void> delete(String key) async {
    try {
      final file = await _fileFor(key);
      if (file.existsSync()) await file.delete();
    } on FileSystemException {
      // ignored, see write()
    }
  }

  @override
  Future<void> clear() async {
    try {
      final dir = await _dir();
      if (dir.existsSync()) {
        await dir.delete(recursive: true);
        await dir.create(recursive: true);
      }
    } on FileSystemException {
      // ignored, see write()
    }
  }
}

/// In-memory cache for tests and for the fixture-backed build.
class MemoryDocumentCache implements DocumentCache {
  final Map<String, CachedDocument> _entries = {};

  @override
  Future<CachedDocument?> read(String key) async => _entries[key];

  @override
  Future<void> write(String key, String body, {required int version}) async {
    _entries[key] = CachedDocument(
      body: body,
      version: version,
      storedAt: DateTime.now(),
    );
  }

  @override
  Future<void> delete(String key) async => _entries.remove(key);

  @override
  Future<void> clear() async => _entries.clear();
}
