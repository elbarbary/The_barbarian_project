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
  if (value.endsWith('.json')) return false;
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

/// Whether a literal is a *label* — one or two words a reader still reads.
///
/// [_isCopy] wants two words and rejects anything that looks like an
/// identifier, which is right for prose and exactly wrong for the row labels
/// this app is full of. `('Open', _num(m.open))`, `('Volume', …)`,
/// `('Sector', sector)` sat in `(String, String)` records under Arabic
/// headings for months, invisible to every guard, because each one is a single
/// capitalised word.
///
/// Scoped hard: only literals sitting in the label slot of a record, and only
/// Latin words in title case. `'market_cap'` and `'consolidated'` are not
/// labels and do not match.
bool _isLabel(String text) {
  final value = text.trim();
  if (value.length < 3 || value.length > 40) return false;
  return RegExp(r'^[A-Z][a-z]+(?: [A-Za-z0-9%/-]+){0,3}$').hasMatch(value);
}

/// The text of the first argument to a call whose opening paren is at [open].
///
/// Balanced-paren scan rather than a regex, because the shape that mattered
/// most —
///
///     Text(
///       condition ? 'one thing' : 'another',
///
/// — has the literal *behind* an expression, and a regex anchored on the
/// paren never saw either branch. Nested calls, strings and comments are
/// stepped over rather than counted.
String _firstArgument(String code, int open) {
  var depth = 0;
  var i = open;
  final start = open + 1;
  while (i < code.length) {
    final ch = code[i];
    if (ch == "'" || ch == '"') {
      // Skip the string, honouring backslash escapes.
      final quote = ch;
      i++;
      while (i < code.length && code[i] != quote) {
        if (code[i] == r'\') i++;
        i++;
      }
    } else if (ch == '(' || ch == '[' || ch == '{') {
      depth++;
    } else if (ch == ')' || ch == ']' || ch == '}') {
      depth--;
      if (depth == 0) return code.substring(start, i);
    }
    i++;
  }
  return '';
}

/// Every run of adjacent string literals in [expression], as separate strings.
///
/// Adjacent literals are one sentence the formatter split and are joined.
/// Literals separated by anything else — the arms of a ternary, the cases of a
/// switch — are different sentences and stay apart.
List<String> _literalRuns(String expression) {
  final runs = <String>[];
  final literal = RegExp(r"'((?:[^'\\]|\\.)*)'");
  var current = <String>[];
  var previousEnd = -1;

  for (final m in literal.allMatches(expression)) {
    final between = previousEnd < 0
        ? null
        : expression.substring(previousEnd, m.start);
    if (between != null && between.trim().isEmpty) {
      current.add(m.group(1)!);
    } else {
      if (current.isNotEmpty) runs.add(current.join(' '));
      current = [m.group(1)!];
    }
    previousEnd = m.end;
  }
  if (current.isNotEmpty) runs.add(current.join(' '));

  return [for (final run in runs) run.replaceAll(RegExp(r'\s+'), ' ').trim()];
}

/// Where a named argument ends: the comma at this nesting level, or the close.
int _argumentEnd(String code) {
  var depth = 0;
  var i = 0;
  while (i < code.length) {
    final ch = code[i];
    if (ch == "'" || ch == '"') {
      final quote = ch;
      i++;
      while (i < code.length && code[i] != quote) {
        if (code[i] == r'\') i++;
        i++;
      }
    } else if (ch == '(' || ch == '[' || ch == '{') {
      depth++;
    } else if (ch == ')' || ch == ']' || ch == '}') {
      if (depth == 0) return i;
      depth--;
    } else if (ch == ',' && depth == 0) {
      return i;
    }
    i++;
  }
  return code.length;
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
    //
    // `value:` and `sentence:` are here because they were not, and that is
    // most of why this guard reported 24 offenders while the real surface was
    // an order of magnitude larger: a string returned from a model getter, or
    // passed as `value:` to a settings row, was invisible.
    final widgets = RegExp(
      r"\b(?:Text|BScreenTitle|BSectionLabel|BEmptyState|BKindChip"
      r"|BInsightLine|BNumText|BLoadMoreButton|Tooltip|BFiledDocument"
      r"|BStalenessCaption|BVerdictBadge|BChangeDelta)\(",
    );
    final params = RegExp(
      r"\b(?:label|title|subtitle|body|hint|hintText|semanticLabel|message"
      r"|note|caption|blurb|value|sentence|actionLabel|errorTitle|errorBody"
      r"|labelText|placeholder|delta|token|plain|workings|yardstick"
      r"|caveat|text|sentence)\s*:\s*",
    );
    // The label slot of a `(String, …)` record — the fact rows.
    final recordLabel = RegExp(r"\(\s*'((?:[^'\\]|\\.)*)'\s*,");
    // A model getter returning a sentence: `=> 'Prices loading',`.
    final arrowLiteral = RegExp(r"=>\s*((?:'(?:[^'\\]|\\.)*'\s*)+)");

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

      void report(String text) {
        if (!_isCopy(text)) return;
        if (allowed.containsKey(text)) return;
        offenders.add('${file.path}  "$text"');
      }

      // A widget that renders copy: everything in its first argument.
      for (final m in widgets.allMatches(code)) {
        for (final run in _literalRuns(_firstArgument(code, m.end - 1))) {
          report(run);
        }
      }

      // A named parameter that carries copy: the expression up to the comma
      // that closes it, ternaries and all.
      for (final m in params.allMatches(code)) {
        final tail = code.substring(m.end);
        final stop = _argumentEnd(tail);
        for (final run in _literalRuns(tail.substring(0, stop))) {
          report(run);
        }
      }

      // Row labels, which are one capitalised word and so slip past _isCopy.
      for (final m in recordLabel.allMatches(code)) {
        final text = m.group(1)!;
        if (!_isLabel(text)) continue;
        if (allowed.containsKey(text)) continue;
        offenders.add('${file.path}  "$text"');
      }

      // Sentences built inside a model and returned to a widget that has no
      // way of knowing they were never translated.
      if (file.path.contains('core/models/')) {
        for (final m in arrowLiteral.allMatches(code)) {
          for (final run in _literalRuns(m.group(1)!)) {
            report(run);
          }
        }
      }
    }

    // Ratchet, not a gate — and the baseline is now empty.
    //
    // It started at 46 under this guard (24 under the narrower one it
    // replaced, which could not see a string returned from a model getter,
    // sitting in a `(String, String)` record, or behind a ternary). Every one
    // of them is in the ARB now, screen-reader labels included. The mechanism
    // stays because it is what keeps that true: nothing new may appear, and
    // anything fixed must be struck from the file, so the number can only go
    // down — and from here, down means staying at zero.
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
