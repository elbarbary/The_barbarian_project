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
/// Whether a string literal is a sentence somebody reads.
///
/// Deliberately not "does it contain a `$`" and not "is it all caps" — those
/// two exemptions are what let the section labels and every sentence with a
/// number in it through the old guard. What is excluded here is what is not
/// prose: asset paths, single identifiers, and strings that are mostly
/// interpolation with a word of glue around them.
bool _isCopy(String text) {
  final value = text.trim();
  if (value.length < 4) return false;
  // Paths, URLs, keys, format patterns.
  if (RegExp(r'^[\w./-]+$').hasMatch(value)) return false;
  if (value.startsWith('assets/') || value.startsWith('http')) return false;
  if (value.contains('://')) return false;
  // A Dart expression that happens to sit inside an interpolation is code.
  // `'\${switch (direction) { BDirection.up => …'` is not a sentence, and the
  // brace-matching a proper strip would need is not worth writing here.
  if (value.contains('=>') || value.contains('switch (')) return false;
  // What is left once the interpolations are removed has to still read as a
  // sentence — "\${a} · \${b}" is a layout, not copy.
  final bare = value
      .replaceAll(RegExp(r'\$\{[^}]*\}'), ' ')
      .replaceAll(RegExp(r'\$[A-Za-z_][A-Za-z0-9_]*'), ' ');
  final words = RegExp(r'[A-Za-z]{2,}').allMatches(bare).length;
  if (words < 2) return false;
  // Arabic is already the translation, not the thing needing one.
  if (RegExp('[؀-ۿ]').hasMatch(value)) return false;
  return true;
}

void main() {
  /// Strings that are deliberately not translated, and why.
  const allowed = {
    'The Pit': 'a product name, like Thndr or EGX',
    'A–Z': 'a sort order written the same way in both alphabets',
    'Today':
        'only as a product/screen name where the ARB key is used elsewhere',
  };

  test('no user-facing string is hardcoded into a widget', () {
    // Read as one buffer, not line by line.
    //
    // The previous version matched per line against dart-formatted source, so
    // the dominant shape in this codebase —
    //
    //     Text(
    //       'some prose',
    //
    // — never matched at all. It also skipped every all-caps string (which is
    // where the section labels live), and every string containing a `$`
    // (which is where the sentences with numbers in them live). It reported
    // zero offenders while `docs/open-issues.md` recorded localisation as
    // closed and guarded, and the real count was in the hundreds.
    final offenders = <String>{};

    // Widgets and parameters that carry copy. A literal reaching one of these
    // is a sentence a reader sees.
    final pattern = RegExp(
      r"(?:Text|BScreenTitle|BSectionLabel|BEmptyState|BKindChip|BInsightLine"
      r"|BNumText|BLoadMoreButton|Tooltip|BFiledDocument)\(\s*(?:const\s+)?"
      r"((?:'(?:[^'\\]|\\.)*'\s*)+)"
      r"|(?:label|title|subtitle|body|hint|hintText|semanticLabel|message"
      r"|note|caption|blurb)\s*:\s*((?:'(?:[^'\\]|\\.)*'\s*)+)",
      dotAll: true,
    );

    // Adjacent literals are one sentence the formatter split.
    final literal = RegExp(r"'((?:[^'\\]|\\.)*)'");

    for (final file in Directory('lib').listSync(recursive: true)) {
      if (file is! File || !file.path.endsWith('.dart')) continue;
      if (file.path.contains('.g.dart') ||
          file.path.contains('.freezed.dart') ||
          file.path.contains('/l10n/')) {
        continue;
      }
      // Explainer prose is a known, tracked gap: its bodies are English too,
      // and an Arabic heading over an English paragraph would be worse than
      // either. See docs/open-issues.md.
      if (file.path.endsWith('core/models/explainer.dart')) continue;

      final source = file.readAsStringSync();
      // Comments are not copy, and this codebase has a great deal of comment.
      final code = source
          .replaceAll(RegExp(r'^\s*///.*$', multiLine: true), '')
          .replaceAll(RegExp(r'^\s*//.*$', multiLine: true), '');

      for (final m in pattern.allMatches(code)) {
        final raw = m.group(1) ?? m.group(2) ?? '';
        // Collapsed to one line: an offender is a key in a line-based
        // baseline file, and a string with a newline in it cannot round-trip
        // through one.
        final joined = literal
            .allMatches(raw)
            .map((l) => l.group(1)!)
            .join(' ')
            .replaceAll(RegExp(r'\s+'), ' ')
            .trim();
        if (!_isCopy(joined)) continue;
        if (allowed.containsKey(joined)) continue;
        offenders.add('${file.path}  "$joined"');
      }
    }

    // Ratchet, not a gate.
    //
    // There are too many to fix in one change and a red suite that everybody
    // learns to ignore is worse than the silent one this replaces. The
    // baseline is checked in: nothing new may appear, and anything fixed must
    // be struck from the file, so the number can only go down.
    final baselineFile = File('test/localisation_baseline.txt');

    // Regenerate with:
    //
    //     UPDATE_LOCALISATION_BASELINE=1 flutter test test/localisation_test.dart
    //
    // Written by the test rather than by hand because the entries have to
    // match its own joining of adjacent literals exactly, and a baseline
    // typed out by a person is a baseline that silently stops matching.
    if (Platform.environment['UPDATE_LOCALISATION_BASELINE'] == '1') {
      final sorted = offenders.toList()..sort();
      baselineFile.writeAsStringSync(
        '# Hardcoded English still in the widgets, one per line.\n'
        '# Nothing may be added. Anything localised must be struck out, so\n'
        '# this file can only get shorter. See localisation_test.dart.\n'
        '${sorted.join('\n')}\n',
      );
      return;
    }

    final baseline = baselineFile
        .readAsLinesSync()
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty && !l.startsWith('#'))
        .toSet();

    final added = offenders.difference(baseline).toList()..sort();
    final fixed = baseline.difference(offenders).toList()..sort();

    expect(
      added,
      isEmpty,
      reason:
          'new hardcoded copy — these never reach an Arabic reader:\n'
          '${added.join('\n')}',
    );
    expect(
      fixed,
      isEmpty,
      reason:
          'these are localised now; strike them from '
          'test/localisation_baseline.txt so the count keeps falling:\n'
          '${fixed.join('\n')}',
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
      final doc =
          jsonDecode(File(path).readAsStringSync()) as Map<String, dynamic>;
      return doc.keys.where((k) => !k.startsWith('@')).toSet();
    }

    final en = keysOf('lib/l10n/app_en.arb');
    final ar = keysOf('lib/l10n/app_ar.arb');

    expect(en.difference(ar), isEmpty, reason: 'missing from Arabic');
    expect(ar.difference(en), isEmpty, reason: 'missing from English');
  });
}
