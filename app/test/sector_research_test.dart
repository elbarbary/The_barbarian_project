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

    // A cohort appears only on days when several names in one industry move
    // together — most days none does. These assert its *shape* when present
    // rather than its presence, so a quiet day is not a red build.
    test('a cohort, when there is one, is complete', () {
      final sector = report.sector;
      if (sector == null) return;
      expect(sector.title, isNotEmpty);
      expect(sector.members, isNotEmpty);
      expect(sector.timeline, isNotEmpty);
      for (final m in sector.members) {
        expect(m.ticker, matches(RegExp(r'^[A-Z]{3,6}$')));
      }
    });

    test('decodes HTML entities rather than passing them through', () {
      // "Edible oils &amp; soap" would otherwise reach the screen verbatim.
      final blob = report.toJson().toString();
      expect(blob, isNot(contains('&amp;')));
      expect(blob, isNot(contains('&gt;')));
      expect(blob, isNot(contains('&#39;')));
    });

    test('every gate that is published is well formed', () {
      final withGates = report.watching.where((w) => w.gates.isNotEmpty);
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
      // Not asserted on any one tape. A tape's second clause is often an entry
      // print, which the voice gate removes on purpose, so "the first tape
      // still has a middle dot" is a claim about today's document rather than
      // about the rejoin. What must never appear is the run-on the missing
      // separator produced.
      for (final entry in report.watching) {
        expect(entry.tape?.detail ?? '', isNot(matches(RegExp(r'%\s+volume'))));
      }

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
      for (final fact in report.sector?.timeline ?? const <SectorFact>[]) {
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

    // The ranked board is the report's own front page. If the app carries no
    // decisions, the parser has fallen behind another rewrite — which has
    // happened three times, each time silently.
    test('every ranked name carries reasoning, or says why it has none', () {
      // Across both buckets. A ranked name moves into `qualified` the moment
      // its badge reads Qualified, and looking only at `watching` made this
      // test go blind exactly when the top-ranked name cleared the rules.
      final ranked = [...report.qualified, ...report.watching]
          .where((w) => w.rank != null)
          .toList();
      expect(ranked, isNotEmpty, reason: 'the board produced no ranked names');
      for (final entry in ranked) {
        // A ranked name explains its score, or states that the explanation was
        // withheld. What it may never be is silently blank: a card with a
        // score and no words is indistinguishable from a parser that has
        // fallen behind.
        //
        // This used to require a `decision` too. §8.6 removed decisions from
        // every screen — an instruction about a named company is the one thing
        // an unlicensed publisher cannot print — so the reasoning is now the
        // whole of what a card may carry, and the whole of what is checked.
        if (entry.positionWithheld) continue;
        final reasoning = entry.action?.reasoning ?? const <String>[];
        expect(
          reasoning.isNotEmpty || (entry.researchSummary?.isNotEmpty ?? false),
          isTrue,
          reason: '${entry.ticker} has a score and nothing explaining it',
        );
      }
    });

    test('the ranked order is the report order', () {
      final ranks = report.watching
          .where((w) => w.rank != null)
          .map((w) => w.rank!)
          .toList();
      expect(ranks, orderedEquals(List.generate(ranks.length, (i) => i + 1)));
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
    late OpportunityReport report;
    late Finder loaded;
    setUpAll(() async {
      report = OpportunityReport.fromJson(
        await readFixtureObject('opportunities/latest.json'),
      );
      // Anchor on a ticker the report actually carries. Anchoring on the gates
      // was wrong: the page publishes them some days and not others, so the
      // anchor vanished and every test using it failed on a quiet day.
      loaded = find.text(report.watching.first.ticker);
    });

    testWidgets('the scanner opens on stocks, not on the sector', (
      tester,
    ) async {
      usePhoneSurface(tester);
      await tester.pumpWidget(
        harness(const OpportunityScreen(parentTab: BNavTab.home)),
      );
      await pumpUntil(tester, loaded);

      // A sector read scores nothing, so it must not be what the screen opens
      // on — the ranked names are the point.
      expect(find.textContaining('Edible oils'), findsNothing);
    });

    testWidgets('the sector tab shows a cohort, or says there is none', (
      tester,
    ) async {
      usePhoneSurface(tester);
      await tester.pumpWidget(
        harness(const OpportunityScreen(parentTab: BNavTab.home)),
      );
      await pumpUntil(tester, find.text('Sector'));
      await tapVisible(tester, find.text('Sector'));
      await pumpUntil(
        tester,
        find.byWidgetPredicate(
          (w) => w is Text &&
              (w.data?.contains('scores nothing') == true ||
                  w.data?.contains('No sector read') == true),
        ),
      );

      // Either the cohort with its disclaimer, or an honest empty state —
      // never a blank tab.
      final hasCohort = find.textContaining('scores nothing').evaluate().isNotEmpty;
      final saysNone = find.textContaining('No sector read').evaluate().isNotEmpty;
      expect(hasCohort || saysNone, isTrue);
    });

    testWidgets('a watched name shows what was checked', (tester) async {
      usePhoneSurface(tester);
      await tester.pumpWidget(
        harness(const OpportunityScreen(parentTab: BNavTab.home)),
      );
      await pumpUntil(tester, loaded);

      // Gates are published on some days only; assert them when they exist.
      if (report.watching.any((w) => w.gates.isNotEmpty)) {
        expect(find.byType(BScanGates), findsWidgets);
      } else {
        expect(loaded, findsWidgets);
      }
    });

    // A screen reader hears a bare ✓/✕/! as punctuation or skips it, leaving
    // the chip tint as the only signal — which spec §42 forbids.
    testWidgets('each gate states its outcome in words', (tester) async {
      usePhoneSurface(tester);
      await tester.pumpWidget(
        harness(const OpportunityScreen(parentTab: BNavTab.home)),
      );
      await pumpUntil(tester, loaded);

      final spoken = tester
          .widgetList<Semantics>(find.byType(Semantics))
          .map((s) => s.properties.label)
          .whereType<String>()
          .toList();

      // Assert against whatever states today's report actually contains —
      // "warn" gates are not published every day.
      final gates = [
        for (final w in report.watching) ...w.gates,
      ];
      if (gates.isEmpty) return;   // none published today
      for (final g in gates) {
        final word = switch (g.outcome) {
          'pass' => 'Passed',
          'fail' => 'Failed',
          _ => 'Unresolved',
        };
        expect(
          spoken.where((l) => l == '$word: ${g.label}'),
          isNotEmpty,
          reason: 'gate "${g.label}" (${g.outcome}) is not spoken',
        );
      }
    });

    testWidgets('no entry or stop wording reaches the screen', (tester) async {
      usePhoneSurface(tester);
      await tester.pumpWidget(
        harness(const OpportunityScreen(parentTab: BNavTab.home)),
      );
      await pumpUntil(tester, loaded);

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
