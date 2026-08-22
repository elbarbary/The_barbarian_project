import 'dart:convert';
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
import 'package:barbarian/core/models/explainer.dart';
import 'package:barbarian/core/widgets/explainer_sheet.dart';
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
      'Six Pillars': const CashOrTrashScreen(parentTab: BNavTab.home),
      'Scanner': const OpportunityScreen(parentTab: BNavTab.today),
      'Company': const CompanyScreen(
        ticker: 'COMI',
        parentTab: BNavTab.home,
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

  /// §8.8 — the legal voice gate speaks Arabic too.
  ///
  /// Every other §8 test in this file matches Latin script. The moment copy
  /// moved into `app_ar.arb` the whole safety net became a no-op for what is
  /// now the primary language — an Arabic-first app whose advice guard only
  /// reads English is not guarded at all.
  ///
  /// The ARB files are scanned directly rather than through AppLocalizations
  /// because a getter has to be named to be read, and the point is to catch a
  /// string nobody remembered to check.
  test('§8.8 no translated string gives an instruction', () {
    final blocked = <String, RegExp>{
      // English, in case a translation is left untranslated.
      'buy now': RegExp(r'\bbuy now\b', caseSensitive: false),
      'sell now': RegExp(r'\bsell now\b', caseSensitive: false),
      'price target': RegExp(r'\bprice target\b', caseSensitive: false),
      'stop loss': RegExp(r'\bstop loss\b', caseSensitive: false),
      // Arabic. No `\b` anywhere: Dart's word boundary is defined on ASCII
      // word characters, so it never matches beside an Arabic letter — a
      // pattern written with one looks right, compiles, and silently matches
      // nothing forever. The self-check below is what caught that.
      //
      // Explicit imperative forms rather than a stem, because the stem اشتر
      // also opens اشتراك (subscription) and اشترط (to stipulate), neither of
      // which is an instruction to anybody.
      'اشتر (buy, imperative)': RegExp('اشترِ|اشتري|اشتروا|اشتر الآن'),
      'توصية (recommendation)': RegExp('توصي[ةا]'),
      'هدف السعر (price target)': RegExp('هدف السعر'),
      'وقف الخسارة (stop loss)': RegExp('وقف الخسارة'),
      'عائد متوقع (expected return)': RegExp('عائد متوقع'),
      'ننصح (we advise)': RegExp('ننصح|نوصي'),
      // Addressing the reader as somebody about to trade.
      //
      // `exitHeadline` read "Before you buy anything: how the money comes
      // back", sitting above a per-company ladder of pound amounts captioned
      // "About this much can leave in one session". Each half is defensible
      // alone; together they are pre-trade sizing for a named issuer, put in
      // front of somebody the heading has just addressed as a buyer. The
      // subject is the share now, not the reader.
      'قبل أن تشتري (before you buy)': RegExp('قبل أن تشتري|قبل ان تشتري'),
      'لو استثمرت (if you invest)': RegExp('لو استثمرت|إذا استثمرت'),
      'before you buy': RegExp(r'\bbefore you (buy|invest)\b',
          caseSensitive: false),
      'if you put in': RegExp(r'\bif you put in\b', caseSensitive: false),
    };

    // The disclaimer is allowed to name what it denies. Nothing else is.
    //
    // This used to be a negation test: any string containing "no", "not",
    // "لا" or "ليست" anywhere in it was skipped unexamined. That is not a
    // carve-out for disclaimers, it is a carve-out for **any sentence with a
    // negation in it**, and the sentences this file exists to stop are mostly
    // written that way:
    //
    //   "Buy now — there is no better time to own it."
    //   "Our price target is EGP 120, not a recommendation."
    //   "اشترِ السهم الآن، لا تتردد."
    //
    // All three passed. The two keys below are the only strings in either ARB
    // that legitimately trip a pattern — measured, not assumed — so they are
    // named instead, and a new one has to be added here deliberately.
    const disclaimers = {
      'legalNotLicensed',
      'legalNotLicensedShort',
      'youNotAdvice',
    };

    // The patterns prove they can fire before they are trusted to pass. An
    // Arabic regex that silently matches nothing would make this test a
    // decoration, and the whole point is that nobody here reads every string.
    for (final (sample, expected) in <(String, String)>[
      ('اشترِ السهم الآن', 'اشتر (buy, imperative)'),
      ('توصية بالشراء', 'توصية (recommendation)'),
      ('هدف السعر ٧٥ جنيهًا', 'هدف السعر (price target)'),
      ('وقف الخسارة عند ٦٤', 'وقف الخسارة (stop loss)'),
      ('Buy now before it moves', 'buy now'),
      // The six that used to slip through, one per shape of negation.
      ('Buy now — there is no better time to own it.', 'buy now'),
      ('Our price target is EGP 120, not a recommendation.', 'price target'),
      ('Set a stop loss; do not hold past it.', 'stop loss'),
      ('اشترِ السهم الآن، لا تتردد.', 'اشتر (buy, imperative)'),
      ('هدف السعر ١٢٠ جنيهًا، وليست توصية.', 'هدف السعر (price target)'),
      ('نوصي بعدم الانتظار.', 'ننصح (we advise)'),
      ('قبل أن تشتري أي شيء: كيف تعود النقود', 'قبل أن تشتري (before you buy)'),
      ('Before you buy anything: how the money comes back', 'before you buy'),
      ('If you put in EGP 50,000', 'if you put in'),
      ('لو استثمرت ٥٠٬٠٠٠ جنيه', 'لو استثمرت (if you invest)'),
    ]) {
      expect(
        blocked[expected]!.hasMatch(sample),
        isTrue,
        reason: 'the "$expected" pattern no longer matches "$sample"',
      );
    }

    final offenders = <String>[];
    for (final file in Directory('lib/l10n').listSync()) {
      if (file is! File || !file.path.endsWith('.arb')) continue;
      final arb = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
      arb.forEach((key, value) {
        if (key.startsWith('@') || value is! String) return;
        if (disclaimers.contains(key)) return;
        blocked.forEach((name, pattern) {
          if (pattern.hasMatch(value)) {
            offenders.add('${file.path} [$key] matched $name: $value');
          }
        });
      });
    }
    expect(
      offenders,
      isEmpty,
      reason: 'A translated instruction is still an instruction:\n'
          '${offenders.join('\n')}',
    );
  });

  /// §8.9 — the non-licence line reaches every reader, in their language.
  test('§8.9 the disclosure is translated for every supported locale', () {
    final template =
        jsonDecode(File('lib/l10n/app_en.arb').readAsStringSync())
            as Map<String, dynamic>;
    expect(template['legalNotLicensed'], isNotNull);

    for (final file in Directory('lib/l10n').listSync()) {
      if (file is! File || !file.path.endsWith('.arb')) continue;
      final arb = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
      final line = arb['legalNotLicensed'];
      expect(
        line,
        isA<String>().having((s) => s.trim().isNotEmpty, 'not blank', isTrue),
        reason:
            'A disclosure the audience cannot read is not a disclosure. '
            '${file.path} has no legalNotLicensed.',
      );
    }
  });

  /// §8.7 — the data that ships inside the binary is held to the same rules
  /// as the code that renders it.
  ///
  /// Every §8 test in this file scans Dart string literals. None of them could
  /// see `app/assets/fixtures/**.json`, which is what an offline first-run
  /// reader is shown — and that is exactly where the worst copy in the project
  /// was found: a scoring note reading "the scanner is built to find things
  /// before they move" (a written claim that the product predicts price) and a
  /// research summary reading "near the EGP 64.70 risk line" (a stop-loss level
  /// against a named issuer). Both had been shipping for weeks behind a gate
  /// that only ever looked at the widgets.
  test('§8.7 no shipped fixture carries a prediction or a trade level', () {
    final blocked = <RegExp>[
      RegExp(r'before (they|it) move', caseSensitive: false),
      RegExp(r'marked[\s-]?to[\s-]?market', caseSensitive: false),
      RegExp(r'\brisk line\b', caseSensitive: false),
      RegExp(r'\bstop loss\b', caseSensitive: false),
      RegExp(r'\bprice target\b', caseSensitive: false),
      RegExp(r'\bexpected return\b', caseSensitive: false),
      RegExp(r'\bbuy now\b', caseSensitive: false),
      RegExp(r'\bsell now\b', caseSensitive: false),
      RegExp(r'\bhard stop\b', caseSensitive: false),
      RegExp(r'\bholding period\b', caseSensitive: false),
      // A price with a threshold noun beside it is a level to act at,
      // whichever order the two arrive in.
      RegExp(r'EGP\s*[\d.,]+[^.]{0,28}\b(line|floor|ceiling|trigger|stop)\b',
          caseSensitive: false),
    ];

    final offenders = <String>[];
    final dir = Directory('assets/fixtures');
    for (final file in dir.listSync(recursive: true)) {
      if (file is! File || !file.path.endsWith('.json')) continue;
      // "No holding period — no entry." records the absence of a trade
      // rather than instructing one, and the pipeline keeps it deliberately.
      final body = file
          .readAsStringSync()
          .replaceAll(RegExp('no holding period', caseSensitive: false), '')
          .replaceAll(RegExp('no entry', caseSensitive: false), '');
      for (final pattern in blocked) {
        final match = pattern.firstMatch(body);
        if (match != null) {
          offenders.add('${file.path}: ${match.group(0)}');
        }
      }
    }
    expect(
      offenders,
      isEmpty,
      reason:
          'Shipped data may not carry a prediction or a trade level:\n'
          '${offenders.join('\n')}',
    );
  });

  /// §8.2 — the anti-rating card must actually say something.
  ///
  /// `BWhatWouldChangeThis` is the one mechanism the codebase names as the
  /// thing that stops a score being a rating: a score with no stated way to
  /// move it is a grade on a company. It was rendering `conditions: []` on
  /// every studied company since the day it was written — a heading with
  /// nothing under it, which is worse than absent because it looks handled.
  testWidgets('§8.2 a studied company states what its score rests on', (
    tester,
  ) async {
    await pumpScreen(
      tester,
      const CompanyScreen(ticker: 'MCQE', parentTab: BNavTab.home),
    );
    // The card lives on Research, beside the pillar ledger it qualifies.
    await pumpUntil(tester, find.text('Research'));
    await tapVisible(tester, find.text('Research'));
    await pumpUntil(tester, find.textContaining('WHAT WOULD CHANGE THIS'));

    final card = tester.widget<BWhatWouldChangeThis>(
      find.byType(BWhatWouldChangeThis),
    );
    expect(
      card.conditions,
      isNotEmpty,
      reason: 'the score is a rating unless something states what moves it',
    );
    // Each line names its pillar and the published basis behind it, so a
    // reader can check the claim rather than take the number on trust.
    expect(card.conditions.first, contains('rests on'));
  });

  /// §50 — a reader can tell a published figure from our arithmetic.
  ///
  /// "Visually distinguish Fact, Calculation, Interpretation where the
  /// underlying data supports this distinction." An exchange-published close
  /// and this app's own ratio over it render in the same typeface, and without
  /// a marker a reader has no way to know which they are being asked to trust.
  testWidgets('§50 an explained figure states where it came from', (
    tester,
  ) async {
    await pumpScreen(tester, const TodayScreen());
    // Any explained row will do; the rates block is the one built entirely
    // from figures somebody else published.
    await pumpUntil(tester, find.byType(BPlainNumber));
    await tapVisible(tester, find.byType(BPlainNumber).first);
    await tester.pumpAndSettle();

    expect(
      find.textContaining(RegExp('FACT|CALCULATION|INTERPRETATION')),
      findsWidgets,
      reason: 'the sheet must say whether the figure is published or derived',
    );
  });

  test('§50 the default is calculation, never fact', () {
    // Defaulting to `fact` would quietly dress this app's own arithmetic as
    // somebody else's published figure, which is the exact confusion the
    // marker exists to prevent.
    const derived = Explainer(
      termId: 't',
      title: 'T',
      plain: 'p',
      token: 'x',
      workings: 'w',
      yardstick: 'y',
      notability: Notability.unjudged,
      source: 's',
    );
    expect(derived.provenance, Provenance.calculation);
  });

  /// §8.6 — the scanner may explain a score. It may not reach a decision.
  ///
  /// The scan report carries an `action` for each name: a decision ("wait"),
  /// a label for it, and the reasoning behind it. The reasoning is the product
  /// — it says why a rule scored what it scored. The decision is an
  /// instruction about a named company however gently it is worded, and it
  /// used to lead the card on both the scanner and its detail screen.
  ///
  /// This is a source scan rather than a widget test on purpose: the decision
  /// is absent from today's data, so a rendering test would pass while the
  /// code path sat there waiting for the pipeline to emit one.
  test('§8.6 no screen renders a scan decision', () {
    final offenders = <String>[];
    for (final file in Directory('lib').listSync(recursive: true)) {
      if (file is! File || !file.path.endsWith('.dart')) continue;
      if (file.path.contains('models/')) continue; // the model may carry it
      for (final (i, line) in file.readAsLinesSync().indexed) {
        final code = line.trim();
        if (code.startsWith('//') || code.startsWith('///')) continue;
        if (RegExp(r'\.decision\b').hasMatch(code) ||
            RegExp(r'action\??\.label').hasMatch(code)) {
          offenders.add('${file.path}:${i + 1}: $code');
        }
        // A single company chosen by score and rendered as the day's headline
        // is a best-stock-today element however it is assembled. The Today
        // hero did exactly this via `OpportunityReport.lead`.
        if (RegExp(r'\.score\s*[><]\s*\w+\.score').hasMatch(code) ||
            RegExp(r'\bget lead\b').hasMatch(code)) {
          offenders.add('${file.path}:${i + 1}: picks one name by score: $code');
        }
      }
    }
    expect(
      offenders,
      isEmpty,
      reason:
          'A scan decision is an instruction about a named company:\n'
          '${offenders.join('\n')}',
    );
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

    // **Nothing in `lib/` is exempt.**
    //
    // This used to skip any UI string containing "no", "not", "nothing" or
    // "cannot" — a carve-out for every sentence with a negation in it rather
    // than for the disclaimer it was written for. "Buy now — there is no
    // better time to own it" passed that gate untouched.
    //
    // There is no allowlist here because there is nothing left to allow: the
    // one string that legitimately named what it denied was a hardcoded
    // English disclaimer on the You screen, and it now lives in the ARB where
    // §8.8 handles it by key. A disclaimer belongs in the translated strings
    // anyway — it is the last sentence that should reach an Arabic reader in
    // English.
    final offenders = <String>[];
    for (final line in _uiStrings()) {
      for (final pattern in blocked) {
        if (pattern.hasMatch(line.text)) {
          offenders.add('${line.where}: ${line.text}');
        }
      }
    }

    // The gate proves it fires before it is trusted to pass, on the shapes it
    // used to wave through.
    for (final sample in <String>[
      'Buy now — there is no better time to own it.',
      'Our price target is EGP 120, not a recommendation.',
      'Nothing here says you should sell, but you should sell.',
    ]) {
      expect(
        blocked.any((p) => p.hasMatch(sample)),
        isTrue,
        reason: 'the §8.5 gate no longer catches "$sample"',
      );
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
    // The generated localisations are the ARB in Dart clothing. §8.8 reads the
    // ARB itself, by key, with a named allowlist for the two disclaimers —
    // scanning the generated mirror here as well means every disclaimer has to
    // be exempted twice, in two different shapes, and the weaker of the two
    // exemptions is the one that ends up governing.
    if (file.path.contains('/l10n/app_localizations')) continue;
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
