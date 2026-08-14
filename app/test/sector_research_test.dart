import 'package:barbarian/core/models/opportunity.dart';
import 'package:barbarian/core/widgets/nav.dart';
import 'package:barbarian/features/opportunities/opportunity_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// The scanner page is rewritten often — the signal board, the evidence gates
/// and the sector block all arrived in a single afternoon. These pin the two
/// things that must survive such a rewrite: the new research reaches the app,
/// and the trade mechanics beside it on the website do not (spec §8).
void main() {
  setUp(useInMemoryPreferences);

  group('the published report', () {
    late OpportunityReport report;

    setUpAll(() async {
      report = OpportunityReport.fromJson(
        await readFixtureObject('opportunities/latest.json'),
      );
    });

    test('carries the sector cohort', () {
      final sector = report.sector;
      expect(sector, isNotNull);
      expect(sector!.title, isNotEmpty);
      expect(sector.members, isNotEmpty);
      expect(sector.timeline, isNotEmpty);
    });

    test('names every company in the cohort', () {
      final tickers = report.sector!.members.map((m) => m.ticker).toList();
      expect(tickers, containsAll(<String>['COSG', 'MOSC', 'ZEOT', 'AJWA']));
    });

    test('decodes HTML entities rather than passing them through', () {
      // "Edible oils &amp; soap" would otherwise reach the screen verbatim.
      expect(report.sector!.title, isNot(contains('&amp;')));
      expect(report.sector!.title, isNot(matches(RegExp(r'&[a-z]+;'))));
    });

    test('carries the evidence gates for watched names', () {
      final withGates = report.watching.where((w) => w.gates.isNotEmpty);
      expect(withGates, isNotEmpty);
      for (final entry in withGates) {
        for (final gate in entry.gates) {
          expect(gate.label, isNotEmpty);
          expect(gate.outcome, isIn(<String>['pass', 'fail', 'warn']));
        }
      }
    });

    // sanitize() splits on em-dash, semicolon and middle dot to isolate a
    // trade clause. Those alternatives are consumed by the split, so rejoining
    // has to put them back — otherwise "No holding period — no entry." ships as
    // "No holding period no entry." and every "· volume 1.22× normal" runs on.
    test('keeps the punctuation between clauses it keeps', () {
      final tape = report.watching.firstWhere((w) => w.tape != null).tape!;
      expect(tape.detail, contains('·'));
      expect(tape.detail, isNot(matches(RegExp(r'%\s+volume'))));

      final preserved = report.outcomes
          .map((o) => o.note ?? '')
          .where((n) => n.contains('No holding period'));
      expect(preserved, isNotEmpty);
      for (final note in preserved) {
        expect(note, contains('No holding period — no entry'));
      }
    });

    // The sector header restated the members' "hard 18 Aug" as "Expires after
    // 18 August without fresh breadth" — the same deadline, in the one part of
    // the block that is read. Skipping the members' <dl> while publishing the
    // header's paraphrase of it was self-defeating.
    test('publishes no deadline for the cohort', () {
      for (final fact in report.sector!.timeline) {
        final blob = '${fact.value} ${fact.detail ?? ''}'.toLowerCase();
        expect(blob, isNot(contains('expires')));
        expect(blob, isNot(contains('deadline')));
      }
    });

    // A row can cover a pair — "ARVA / AMII". Requiring a lone ticker dropped
    // it silently, publishing 21 of the page's 22 results. Deleting a result is
    // the one thing this series exists not to do.
    test('keeps an outcome row that names more than one company', () {
      final pair = report.outcomes.where((o) => o.label != null);
      expect(pair, isNotEmpty);
      expect(pair.first.label, contains('/'));
      // The ticker must stay a single symbol so the row can still open a
      // company screen.
      expect(pair.first.ticker, matches(RegExp(r'^[A-Z]{3,6}$')));
    });

    test('carries the research written out in full', () {
      final withResearch = report.watching.where((w) => w.research.isNotEmpty);
      expect(withResearch, isNotEmpty);
      final first = withResearch.first.research.first;
      expect(first.heading, isNotNull);
      expect(first.body, isNotEmpty);
      expect(first.body.first.length, greaterThan(60));
    });

    // The website now spells out entry triggers, stop prices, profit targets
    // and holding clocks in plain English. None of it may reach the app.
    test('carries no trade mechanics anywhere in the document', () {
      final blob = report
          .toJson()
          .toString()
          .toLowerCase()
          // Deliberately kept: it records the absence of a trade.
          .replaceAll('no holding period', '')
          .replaceAll('no entry', '');
      for (final banned in <String>[
        'hard stop',
        'exit below',
        'profit target',
        'holding period',
        'stop loss',
        'target price',
      ]) {
        expect(blob, isNot(contains(banned)), reason: 'leaked: $banned');
      }
      for (final pattern in <RegExp>[
        RegExp(r'\b(close|confirmation)\w*\s+(above|below)\s+egp'),
        RegExp(r'\binvalidation\b'),
        RegExp(r'\bholding clock\b'),
        RegExp(r'\btarget level'),
        RegExp(r'\breview \d'),
        RegExp(r'\bif confirmed'),
        RegExp(r'\d+\s*[–-]\s*\d+\s+(trading )?sessions'),
      ]) {
        expect(
          pattern.hasMatch(blob),
          isFalse,
          reason: 'leaked: ${pattern.pattern}',
        );
      }
    });
  });

  group('on screen', () {
    testWidgets('the scanner shows the sector cohort', (tester) async {
      usePhoneSurface(tester);
      await tester.pumpWidget(
        harness(const OpportunityScreen(parentTab: BNavTab.home)),
      );
      await pumpUntil(tester, find.textContaining('Edible oils'));

      expect(find.textContaining('Edible oils'), findsOneWidget);
      expect(find.text('COSG'), findsWidgets);
    });

    testWidgets('a watched name shows what was checked', (tester) async {
      usePhoneSurface(tester);
      await tester.pumpWidget(
        harness(const OpportunityScreen(parentTab: BNavTab.home)),
      );
      await pumpUntil(tester, find.byType(BScanGates));

      expect(find.byType(BScanGates), findsWidgets);
    });

    // A screen reader hears a bare ✓/✕/! as punctuation or skips it, leaving
    // the chip tint as the only signal — which spec §42 forbids.
    testWidgets('each gate states its outcome in words', (tester) async {
      usePhoneSurface(tester);
      await tester.pumpWidget(
        harness(const OpportunityScreen(parentTab: BNavTab.home)),
      );
      await pumpUntil(tester, find.byType(BScanGates));

      final spoken = tester
          .widgetList<Semantics>(find.byType(Semantics))
          .map((s) => s.properties.label)
          .whereType<String>()
          .toList();

      expect(spoken.where((l) => l.startsWith('Passed: ')), isNotEmpty);
      expect(spoken.where((l) => l.startsWith('Failed: ')), isNotEmpty);
      expect(spoken.where((l) => l.startsWith('Unresolved: ')), isNotEmpty);
    });

    testWidgets('no entry or stop wording reaches the screen', (tester) async {
      usePhoneSurface(tester);
      await tester.pumpWidget(
        harness(const OpportunityScreen(parentTab: BNavTab.home)),
      );
      await pumpUntil(tester, find.textContaining('Edible oils'));

      for (final banned in <String>[
        'Profit target',
        'hard stop',
        'Exit below',
        'close above EGP',
      ]) {
        expect(find.textContaining(banned), findsNothing, reason: banned);
      }
    });
  });
}
