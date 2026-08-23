import 'dart:io';

import 'package:barbarian/core/providers.dart';
import 'package:flutter_test/flutter_test.dart';

/// Pressing refresh has to refresh everything a reader is looking at.
///
/// There were two invalidation lists — one on app resume, one behind Home's
/// refresh button — written out by hand and drifted apart. Neither named
/// `connectionsProvider` or `macroProvider`, each of which is read at exactly
/// one call site, so on iOS, where the process survives for days,
/// Connect-the-dots and the macro block showed whatever loaded at cold start
/// and never asked again. `connections.json` is rewritten roughly fifty times
/// a day and no running app would ever have fetched a second copy.
///
/// Home's list also omitted `newsProvider`, the fastest-moving document in the
/// product — so the button a reader presses when they want fresh news was the
/// one that did not fetch it.
void main() {
  test('every document-backed provider is on the refresh list', () {
    final source = File('lib/core/providers.dart').readAsStringSync();

    // Every `StreamProvider<Sourced<…>>` — the shape this app uses for a
    // document it downloads. Families are excluded: those are per-company or
    // per-month and are fetched on demand rather than held open.
    final declared = RegExp(
      r'^final (\w+Provider) = StreamProvider<Sourced<',
      multiLine: true,
    ).allMatches(source).map((m) => m.group(1)!).toSet();

    expect(
      declared,
      isNotEmpty,
      reason: 'the shape this test recognises has changed',
    );

    // The list itself, read back from the source so the test sees the names
    // rather than the objects — two providers can be identical objects and
    // still be the wrong ones.
    final block = RegExp(
      r'publishedDocumentProviders = <ProviderOrFamily>\[(.*?)\];',
      dotAll: true,
    ).firstMatch(source);
    expect(block, isNotNull, reason: 'the refresh list moved or was renamed');
    final listed = RegExp(
      r'\b(\w+Provider)\b',
    ).allMatches(block!.group(1)!).map((m) => m.group(1)!).toSet();

    expect(
      declared.difference(listed),
      isEmpty,
      reason:
          'these documents are downloaded and never refreshed — a reader who '
          'leaves the app open sees whatever loaded at launch',
    );
  });

  test('the list is what both refresh paths actually call', () {
    // Not a second hand-written list. The whole point is that there is one.
    for (final path in [
      'lib/core/providers.dart',
      'lib/features/home/home_screen.dart',
    ]) {
      final source = File(path).readAsStringSync();
      expect(
        source,
        contains('refreshPublishedContent('),
        reason: '$path should refresh through the shared list',
      );
    }

    // And Home no longer names providers one by one.
    final home = File('lib/features/home/home_screen.dart').readAsStringSync();
    expect(
      RegExp(r'ref\.invalidate\(').allMatches(home),
      isEmpty,
      reason: 'Home is invalidating providers by hand again',
    );
  });

  test('the objects on the list are the real providers', () {
    // The source scan above proves the names match; this proves the list is
    // populated and holds distinct objects rather than one repeated.
    expect(publishedDocumentProviders.length, greaterThanOrEqualTo(10));
    expect(
      publishedDocumentProviders.toSet().length,
      publishedDocumentProviders.length,
      reason: 'a provider is on the refresh list twice',
    );
  });
}
