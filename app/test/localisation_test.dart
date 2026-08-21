import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// §41 — "All UI strings should live in localization resources."
///
/// They did not. Forty-six were written straight into widgets, so an Arabic
/// reader met English section headings on Today, English labels on You, and
/// the whole nine-line scanner rubric in English whatever locale they chose.
/// One of them, `'OPPORTUNITY SCANNER'`, even survived a product rename —
/// because a hardcoded string is invisible both to the ARB and to a reader.
void main() {
  /// Strings that are deliberately not translated, and why.
  const allowed = {
    'The Pit': 'a product name, like Thndr or EGX',
    'A–Z': 'a sort order written the same way in both alphabets',
    'Today': 'only as a product/screen name where the ARB key is used elsewhere',
  };

  test('no user-facing string is hardcoded into a widget', () {
    final offenders = <String>[];
    final pattern = RegExp(
      r"""(?:BScreenTitle|BSectionLabel|BEmptyState|Text)\(\s*(?:const\s+)?'([^']{3,60})'"""
      r"""|(?:label|title|subtitle|semanticLabel)\s*:\s*'([^']{3,80})'""",
    );

    for (final file in Directory('lib').listSync(recursive: true)) {
      if (file is! File || !file.path.endsWith('.dart')) continue;
      if (file.path.contains('.g.dart') ||
          file.path.contains('.freezed.dart') ||
          file.path.contains('/l10n/')) {
        continue;
      }
      // Explainer prose is a known, tracked gap: its bodies are English too,
      // and an Arabic title over an English paragraph would be worse than
      // either. See docs/open-issues.md.
      if (file.path.endsWith('core/models/explainer.dart')) continue;

      final lines = file.readAsLinesSync();
      for (var i = 0; i < lines.length; i++) {
        for (final m in pattern.allMatches(lines[i])) {
          final text = (m.group(1) ?? m.group(2) ?? '').trim();
          if (text.isEmpty) continue;
          if (text == text.toUpperCase()) continue; // constants, tickers
          if (!RegExp(r'[a-z]{2}').hasMatch(text)) continue;
          if (text.contains(r'$') || text.contains('/')) continue;
          if (allowed.containsKey(text)) continue;
          offenders.add('${file.path}:${i + 1}  "$text"');
        }
      }
    }

    expect(
      offenders,
      isEmpty,
      reason:
          'these never reach an Arabic reader; put them in the ARB:\n'
          '${offenders.join('\n')}',
    );
  });

  test('the two ARB files carry the same keys', () {
    // A key present in English and missing in Arabic is a string that silently
    // falls back to English for the readers this app is built for first.
    //
    // Parsed rather than pattern-matched: `@key` blocks carry nested
    // `placeholders` objects, and a regex over the raw text counts those as
    // keys and then reports a difference that is not there.
    Set<String> keysOf(String path) {
      final doc = jsonDecode(File(path).readAsStringSync()) as Map<String, dynamic>;
      return doc.keys.where((k) => !k.startsWith('@')).toSet();
    }

    final en = keysOf('lib/l10n/app_en.arb');
    final ar = keysOf('lib/l10n/app_ar.arb');

    expect(en.difference(ar), isEmpty, reason: 'missing from Arabic');
    expect(ar.difference(en), isEmpty, reason: 'missing from English');
  });
}
