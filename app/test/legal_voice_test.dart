import 'dart:io';

import 'package:barbarian/core/models/cash_or_trash.dart';
import 'package:barbarian/core/widgets/legal.dart';
import 'package:barbarian/core/widgets/nav.dart';
import 'package:barbarian/features/cash_or_trash/cash_or_trash_screen.dart';
import 'package:barbarian/features/company/company_screen.dart';
import 'package:barbarian/features/opportunities/opportunity_screen.dart';
import 'package:barbarian/core/widgets/composites.dart';
import 'package:barbarian/features/profile/you_screen.dart';
import 'package:barbarian/features/today/today_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// The rules from spec §8, enforced.
///
/// Every test in this file exists because a lawyer flagged a specific shape as
/// the thing that turns a research publisher into an unlicensed adviser. The
/// publisher is not registered with Egypt's Financial Regulatory Authority, so
/// these are not style preferences — under CML 95/1992 securities advisory is
/// licensed, and a public graded opinion on a named issuer is the exposure.
///
/// A failure here is not a broken widget. It is a sentence that should not be
/// published.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(useInMemoryPreferences);

  /// §8.12 — the non-licence line sits at the foot of every scored screen.
  ///
  /// Present-or-fail, and deliberately a list that a new screen has to be added
  /// to: a disclosure that is easy to forget is a disclosure that gets
  /// forgotten, and one buried on a provenance page reaches nobody.
  group('§8.12 the non-licence line is on every scored screen', () {
    final scored = <String, Widget>{
      'Six Pillars': const CashOrTrashScreen(parentTab: BNavTab.research),
      'Opportunity Scanner': const OpportunityScreen(parentTab: BNavTab.today),
      'Company': const CompanyScreen(
        ticker: 'COMI',
        parentTab: BNavTab.ask,
      ),
      'Today': const TodayScreen(),
    };

    for (final entry in scored.entries) {
      testWidgets('${entry.key} carries it', (tester) async {
        await pumpScreen(tester, entry.value);
        await pumpUntil(tester, find.byType(BLegalFootnote));

        expect(
          find.byType(BLegalFootnote),
          findsWidgets,
          reason:
              '${entry.key} shows a score and must state that the publisher '
              'is not licensed. Spec §8.12.',
        );
      });
    }

    test('the statement says the three things it has to say', () {
      final text = BLegalFootnote.statement.toLowerCase();
      expect(text, contains('not licensed'));
      expect(text, contains('financial regulatory authority'));
      expect(
        text,
        contains('nothing here is a recommendation'),
        reason: 'the sentence has to deny advice, not merely omit it',
      );
    });
  });

  /// §8.2 — the five bands describe the scorecard, never the security and
  /// never an action.
  group('§8.2 the bands describe the scorecard', () {
    test('no band names a verdict or an action', () {
      // Every one of these was a band name in the shipped app. "Trash" is a
      // sell call in one word; there is no version of it that survives being
      // read aloud in a hearing.
      const forbidden = [
        'cash',
        'trash',
        'toxic',
        'recyclable',
        'loose change',
        'buy',
        'sell',
        'hold',
        'avoid',
        'strong',
        'weak',
        'good',
        'bad',
        'overvalued',
        'undervalued',
      ];

      for (final verdict in Verdict.values) {
        final blob = '${verdict.label} ${verdict.sentence}'.toLowerCase();
        for (final word in forbidden) {
          expect(
            blob,
            isNot(contains(word)),
            reason:
                '${verdict.id} reads "${verdict.label}" — "$word" is a '
                'judgement about the security, not a description of the '
                'scorecard. Spec §8.2.',
          );
        }
      }
    });

    test('every band names the pillars', () {
      for (final verdict in Verdict.values) {
        expect(
          verdict.sentence.toLowerCase(),
          contains('pillar'),
          reason:
              'the subject of the sentence has to be the scorecard. '
              '${verdict.id} says "${verdict.sentence}".',
        );
      }
    });

    test('the mark is a sign, not a symbol of worth', () {
      // A money bag at one end and a skull at the other is a rating with the
      // words taken out.
      for (final verdict in Verdict.values) {
        expect(
          RegExp(r'^[＋−＝+\-=]+$').hasMatch(verdict.mark),
          isTrue,
          reason:
              '${verdict.id} uses "${verdict.mark}" — the glyph must state '
              'which way the ledger summed and nothing else.',
        );
      }
    });
  });

  /// §8.13 — the product is named for its method, not its verdict.
  test('§8.13 no screen calls itself Cash or Trash', () {
    final offenders = <String>[];
    for (final file in Directory('lib').listSync(recursive: true)) {
      if (file is! File || !file.path.endsWith('.dart')) continue;
      for (final line in file.readAsLinesSync()) {
        final code = line.trim();
        // Comments may discuss the old name; strings may not carry it.
        if (code.startsWith('//') || code.startsWith('///')) continue;
        if (RegExp(r"""['"][^'"]*Cash or Trash""").hasMatch(code)) {
          offenders.add('${file.path}: $code');
        }
      }
    }
    expect(
      offenders,
      isEmpty,
      reason:
          'The name is a sell call in one word and was renamed to Six Pillars '
          '(spec §8.13):\n${offenders.join('\n')}',
    );
  });

  /// §8.3 — a name that did not clear the rules is a rule outcome, never a
  /// view on the company.
  test('§8.3 the app never says it passed on a name', () {
    // "We looked and passed" is an adverse view on a named issuer delivered at
    // the moment somebody is deciding. The blocked words are the ones that
    // make the app, rather than the checklist, the subject of the sentence.
    const blocked = [
      'we passed',
      'passed on it',
      'we rejected',
      'not worth',
      'stay away',
      'steer clear',
      'we would avoid',
      'avoid this',
      'bad company',
      'poor company',
    ];

    final offenders = <String>[];
    for (final line in _uiStrings()) {
      for (final phrase in blocked) {
        if (line.text.toLowerCase().contains(phrase)) {
          offenders.add('${line.where}: $phrase');
        }
      }
    }
    expect(offenders, isEmpty, reason: offenders.join('\n'));
  });

  /// §8.1 — the outcome record is a methodology audit, not an accuracy claim.
  test('§8.1 the app publishes no hit rate', () {
    // "14 of 22 turned out as stated" is an accuracy claim, and an accuracy
    // claim is a written admission that the outputs are price predictions.
    final blocked = [
      RegExp(r'\bhit rate\b', caseSensitive: false),
      RegExp(r'\bwin rate\b', caseSensitive: false),
      RegExp(r'\baccuracy\b', caseSensitive: false),
      RegExp(r'\bwe called\b', caseSensitive: false),
      RegExp(r'\bcorrect calls?\b', caseSensitive: false),
      RegExp(r'\bsuccess rate\b', caseSensitive: false),
      RegExp(r'\btrack record\b', caseSensitive: false),
    ];

    final offenders = <String>[];
    for (final line in _uiStrings()) {
      for (final pattern in blocked) {
        if (pattern.hasMatch(line.text)) {
          offenders.add('${line.where}: ${line.text}');
        }
      }
    }
    expect(offenders, isEmpty, reason: offenders.join('\n'));
  });

  _watchlistIsFactsOnly();

  /// §8.2 — "verdict" is the word for what this app must never deliver.
  ///
  /// The scorecard produces a sum. A verdict is what a court returns, and an
  /// app that labels its output one has characterised it for any reader,
  /// including a regulator, before they have read a line of the method.
  test('§8.2 no screen calls its output a verdict', () {
    final offenders = <String>[];
    for (final line in _uiStrings()) {
      if (RegExp(r'\bverdicts?\b', caseSensitive: false).hasMatch(line.text)) {
        offenders.add('${line.where}: ${line.text}');
      }
    }
    expect(offenders, isEmpty, reason: offenders.join('\n'));
  });

  /// §8.5 — no instruction, no size, no target, anywhere in the UI.
  ///
  /// The Voice Gate stops these at ingestion; this stops the app writing one
  /// of its own, which the ingestion gate would never see.
  test('§8.5 no screen writes a trade instruction', () {
    final blocked = [
      RegExp(r'\bbuy now\b', caseSensitive: false),
      RegExp(r'\bsell now\b', caseSensitive: false),
      RegExp(r'\bprice target\b', caseSensitive: false),
      RegExp(r'\bstop loss\b', caseSensitive: false),
      RegExp(r'\bposition siz', caseSensitive: false),
      RegExp(r'\bexpected return\b', caseSensitive: false),
      RegExp(r'\bshould (buy|sell|hold)\b', caseSensitive: false),
      RegExp(r'\brecommend(ed|ation)? to (buy|sell)\b', caseSensitive: false),
      RegExp(r'\bentry price\b', caseSensitive: false),
      RegExp(r'\btake profit\b', caseSensitive: false),
    ];

    final offenders = <String>[];
    for (final line in _uiStrings()) {
      // The app may DENY advising; it may not advise. A sentence carrying its
      // own negation is the disclaimer, not the thing being disclaimed.
      final negated = RegExp(
        r"\b(not|never|no|nothing|cannot|does not|do not)\b",
        caseSensitive: false,
      ).hasMatch(line.text);
      for (final pattern in blocked) {
        if (pattern.hasMatch(line.text) && !negated) {
          offenders.add('${line.where}: ${line.text}');
        }
      }
    }
    expect(offenders, isEmpty, reason: offenders.join('\n'));
  });
}

/// §8.4 — a watchlist row is a price, not a reading.
///
/// A list of names each carrying this app's assessment is a personalised
/// recommendation list, and the user having assembled it themselves does not
/// cure that: the app is what put a score beside each one.
void _watchlistIsFactsOnly() {
  testWidgets('§8.4 a watchlist row carries no score or band', (tester) async {
    await pumpScreen(
      tester,
      const YouScreen(),
      watchlist: const ['COMI', 'SWDY'],
    );
    await pumpUntil(tester, find.text('COMI'));

    expect(find.byType(BVerdictBadge), findsNothing);
    expect(find.byType(BPillarLedger), findsNothing);
    for (final verdict in Verdict.values) {
      expect(
        find.text(verdict.label),
        findsNothing,
        reason: 'a band on a watchlist row makes the list a recommendation',
      );
    }
    // The screen has to say what it is withholding, not merely withhold it.
    expect(find.textContaining('Prices only'), findsOneWidget);
  });
}

/// One quoted string from the app, with where it came from.
typedef _UiString = ({String where, String text});

/// Every string literal in `lib/`, which is every word the app can say.
///
/// Scanning whole files caught comments — "the next poll is not worth having"
/// is about an HTTP round trip, not about a company — and a blocklist that
/// cries wolf is a blocklist people start ignoring. Only what a reader can see
/// is in scope, so only quoted strings are read.
///
/// Generated files are skipped: freezed copies doc comments into `.g` and
/// `.freezed` output, so a flagged phrase there is the same phrase already
/// checked at its source.
List<_UiString> _uiStrings() {
  final out = <_UiString>[];
  // Single-quoted strings only, which is the project's style for every piece
  // of user-facing copy.
  final quoted = RegExp(r"'((?:[^'\\]|\\.){4,})'");

  for (final file in Directory('lib').listSync(recursive: true)) {
    if (file is! File || !file.path.endsWith('.dart')) continue;
    if (file.path.endsWith('.g.dart') || file.path.endsWith('.freezed.dart')) {
      continue;
    }
    final lines = file.readAsLinesSync();
    for (var i = 0; i < lines.length; i++) {
      final code = lines[i].trim();
      if (code.startsWith('//') || code.startsWith('///')) continue;
      // An import path is not a sentence.
      if (code.startsWith('import ') || code.startsWith('export ')) continue;
      for (final match in quoted.allMatches(code)) {
        out.add((
          where: '${file.path}:${i + 1}',
          // An interpolation is code, not copy. "\${verdict.label}" is a
          // variable called verdict; what it RESOLVES to is checked by the
          // band tests above, and reading the identifier here flagged four
          // compliant strings for the name of the variable holding them.
          text: match
              .group(1)!
              .replaceAll(RegExp(r'\$\{[^}]*\}'), '')
              .replaceAll(RegExp(r'\$[A-Za-z_][A-Za-z0-9_]*'), ''),
        ));
      }
    }
  }
  return out;
}
