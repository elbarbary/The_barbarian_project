import 'package:barbarian/core/storage/document_cache.dart';
import 'package:barbarian/core/networking/document_source.dart';
import 'package:barbarian/core/networking/static_api.dart';
import 'package:flutter_test/flutter_test.dart';

/// A failed manifest fetch must not pin the app for the life of the process.
///
/// `manifest()` assigned its in-flight future and never cleared it, so the
/// `pending != null` short-circuit was permanently true after the first call.
/// Every later read replayed that first future — including reads made after
/// the TTL had lapsed, which is the only case the TTL exists for. On a cold
/// start with no network that meant a completed future holding `null` stayed
/// there forever: `_expectedVersion` pinned to 0 and no recovery in-session
/// even once the network returned.
void main() {
  const manifest =
      '{"schema_version":1,"data_version":"v1","versions":{"market":42}}';

  test('a manifest that failed once is fetched again', () async {
    final source = _FlakySource({'manifest.json': manifest}, failFirst: 1);
    final api = StaticApi(source: source, cache: MemoryDocumentCache());

    final first = await api.manifest();
    expect(first, isNull, reason: 'the first fetch was set up to fail');
    expect(source.attempts, 1);

    final second = await api.manifest();
    expect(
      source.attempts,
      2,
      reason: 'the second read replayed the failed future instead of retrying',
    );
    expect(
      second,
      isNotNull,
      reason: 'the app never recovers in-session once the network returns',
    );
  });
}

/// Fails the first `failFirst` fetches of any path, then behaves.
class _FlakySource implements DocumentSource {
  _FlakySource(this.documents, {required this.failFirst});

  final Map<String, String> documents;
  final int failFirst;
  int attempts = 0;

  @override
  bool get isRefreshable => true;

  @override
  Future<String> fetch(String path) async {
    attempts++;
    if (attempts <= failFirst) {
      throw DocumentUnavailable(path, 'offline');
    }
    final body = documents[path];
    if (body == null) throw DocumentUnavailable(path, 'missing');
    return body;
  }
}
