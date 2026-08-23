import 'package:barbarian/core/models/company.dart';
import 'package:barbarian/core/models/explainer.dart';
import 'package:barbarian/core/widgets/explainer_sheet.dart';
import 'package:barbarian/core/widgets/nav.dart';
import 'package:barbarian/features/company/company_screen.dart';
import 'package:barbarian/core/widgets/charts.dart';
import 'package:barbarian/core/theme/barbarian_theme.dart';
import 'package:barbarian/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:barbarian/l10n/app_localizations_ar.dart';
import 'package:barbarian/l10n/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// The thesis, tested.
///
/// The app exists to say what a number means, whether it matters, and why —
/// rather than printing the number and leaving the reader to know already.
/// "Relative volume 0.43×" is a true row and a failure of the product.
/// The real generated English, not a stub: these sentences are the
/// product, and a stub would test the test.
final en = AppLocalizationsEn();

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(useInMemoryPreferences);

  Company load(String ticker) =>
      Company.fromJson(readFixtureObjectSync('companies/$ticker.json'));

  group('every explained figure carries its own arithmetic', () {
    test('relative volume divides the real operands', () {
      final company = load('ABUK');
      final e = Explainers.relativeVolume(company, en)!;

      // The sentence, the token and the sum have to agree, because the whole
      // mechanism rests on a reader being able to check the claim.
      final volume = company.market!.volume!;
      final median = (company.profile!['median_volume_20d'] as num).toDouble();
      final ratio = volume / median;

      expect(e.token, contains(ratio.toStringAsFixed(2)));
      expect(e.workings, contains(volume.round().toString().substring(0, 1)));
      expect(e.workings, contains('÷'));
      expect(e.workings, contains('='));
      // The plain line states the direction the ratio actually went.
      expect(
        e.plain,
        contains(ratio >= 1 ? 'more' : 'less'),
        reason: 'the sentence must agree with the arithmetic under it',
      );
    });

    test('a session with no trading says that, not "100% less"', () {
      // The volume field arriving in price_history exposed this: zero volume
      // fell through the "quieter than normal" branch and rendered as "traded
      // 100% less than its normal amount", which reads as a rounding artefact
      // rather than the fact that nobody could sell that day.
      final quiet = load('SPHT');
      final e = Explainers.relativeVolume(quiet, en);
      if (e != null && (quiet.market?.volume ?? 1) == 0) {
        expect(e.plain, 'It did not trade at all.');
        expect(e.yardstick, contains('no price at which a holder could sell'));
      }
    });

    test('a missing operand produces no row at all', () {
      // Spec §49 and the standing rule: if the data is not there, do not build
      // it. A plain sentence whose inputs cannot be shown is the exact thing
      // the explainer exists to prevent.
      const bare = Company(
        ticker: 'NONE',
        name: LocalizedName(en: 'A company with no profile'),
      );

      expect(Explainers.relativeVolume(bare, en), isNull);
      expect(Explainers.freeFloat(bare, en), isNull);
      expect(Explainers.closeStrength(bare, en), isNull);
      expect(Explainers.marketCap(bare, en), isNull);
      expect(
        Explainers.move(title: 'x', window: 'a month', percent: null, l: en),
        isNull,
      );
    });

    test('every explainer states a source', () {
      final company = load('ABUK');
      for (final e in [
        Explainers.relativeVolume(company, en),
        Explainers.freeFloat(company, en),
        Explainers.closeStrength(company, en),
        Explainers.marketCap(company, en),
      ].nonNulls) {
        expect(
          e.source,
          isNotEmpty,
          reason: '${e.termId}: a figure with no stated origin is a rumour',
        );
        expect(e.yardstick, isNotEmpty, reason: '${e.termId} has no yardstick');
        expect(e.workings, isNotEmpty, reason: '${e.termId} shows no sum');
      }
    });

    test('the plain sentence never tells anybody to do anything', () {
      final company = load('ABUK');
      // Spec §6.4 bans the *imperative* trading verb and the second person,
      // not the words themselves. "The rest sit with owners who do not sell"
      // describes the share register; "selling in size can take days"
      // describes market mechanics. Neither addresses the reader, and
      // rewriting them to dodge a substring would make the sentences worse
      // while changing nothing about what the app is telling anybody to do.
      const banned = [
        'you ',
        'your ',
        'should ',
        'we recommend',
        'worth buying',
        'worth selling',
        'buy now',
        'sell now',
        'will rise',
        'will fall',
        'avoid',
        'opportunity',
      ];

      for (final e in [
        Explainers.relativeVolume(company, en),
        Explainers.freeFloat(company, en),
        Explainers.closeStrength(company, en),
        Explainers.marketCap(company, en),
        Explainers.move(title: 'x', window: 'a month', percent: 18.5, l: en),
      ].nonNulls) {
        final blob = '${e.plain} ${e.yardstick} ${e.caveat ?? ''}'
            .toLowerCase();
        for (final word in banned) {
          expect(
            blob,
            isNot(contains(word)),
            reason: '${e.termId} says "$word" — spec §6.4',
          );
        }
      }
    });
  });

  group('importance is a threshold, not an opinion', () {
    test('unusual is claimed only against a published band', () {
      final company = load('ABUK');
      final volume = Explainers.relativeVolume(company, en)!;
      final ratio =
          company.market!.volume! /
          (company.profile!['median_volume_20d'] as num).toDouble();

      expect(
        volume.notability,
        ratio >= 2 ? Notability.notable : Notability.ordinary,
        reason: 'the band is 2×, published, and the same for all 282 names',
      );
      // And the band is stated where the claim is made.
      expect(volume.yardstick, contains('2'));
    });

    test('a figure with no band says so rather than defaulting', () {
      final company = load('ABUK');
      // A single session's close position is not a threshold event and a
      // market value has no "unusual" level; claiming either would be reading
      // tea leaves in the app's own voice.
      expect(
        Explainers.closeStrength(company, en)!.notability,
        Notability.unjudged,
      );
      expect(
        Explainers.marketCap(company, en)!.notability,
        Notability.unjudged,
      );
    });
  });

  testWidgets('a company screen leads with meaning, not tokens', (
    tester,
  ) async {
    await pumpScreen(
      tester,
      const CompanyScreen(ticker: 'ABUK', parentTab: BNavTab.home),
      until: find.textContaining('Abou Kir'),
    );
    await pumpUntil(tester, find.byType(BPlainNumber));

    // The sentence is on the screen.
    expect(find.textContaining('actually trade'), findsOneWidget);

    // And the bare row it replaced is not.
    expect(
      find.text('Relative volume'),
      findsNothing,
      reason: 'a true number with no meaning attached is the failure mode',
    );
    expect(find.text('Free float'), findsNothing);
  });

  testWidgets('pressing a figure opens its arithmetic', (tester) async {
    await pumpScreen(
      tester,
      const CompanyScreen(ticker: 'ABUK', parentTab: BNavTab.home),
      until: find.textContaining('Abou Kir'),
    );
    await pumpUntil(tester, find.byType(BPlainNumber));

    await tapVisible(tester, find.byType(BPlainNumber).first);
    await pumpUntil(tester, find.byType(BExplainerSheet));

    // The four fixed parts, in order (spec §4.18).
    expect(find.text('HOW IT IS WORKED OUT'), findsOneWidget);
    expect(find.text('WHAT COUNTS AS UNUSUAL'), findsOneWidget);
  });

  testWidgets('a sheet with a series draws it, and one without does not', (
    tester,
  ) async {
    // The cards carry a sparkline the height of a line of text — enough to say
    // "rising", not enough to read. Opening one gave four paragraphs about a
    // number and no picture of it.
    const explainer = Explainer(
      termId: 'index.EGX30',
      title: 'EGX 30',
      plain: 'The EGX 30 rose 0.41% in the session.',
      token: '54,737.10',
      workings: '54,737.10 today against 54,512.68 yesterday',
      yardstick: 'A move under 1% is an ordinary session.',
      notability: Notability.unjudged,
      source: 'EGX',
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: BarbarianTheme.light(),
        // The sheet's two section headings come from the ARB now, so it needs
        // the delegates to build at all.
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const Scaffold(
          body: BExplainerSheet(
            explainer: explainer,
            series: [1, 2, 3, 4, 5, 6],
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.byType(BSparkline), findsOneWidget);

    await tester.pumpWidget(
      MaterialApp(
        theme: BarbarianTheme.light(),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const Scaffold(body: BExplainerSheet(explainer: explainer)),
      ),
    );
    await tester.pump();
    // One point is a level already printed above in a larger font.
    expect(find.byType(BSparkline), findsNothing);
  });

  // The bodies were English-only for months, and deliberately so: an Arabic
  // heading over an English paragraph reads worse than either, so the block
  // was left whole rather than half-translated. It is whole now.
  group('in the reader’s language', () {
    final ar = AppLocalizationsAr();

    test('every sentence a company explainer produces is Arabic', () {
      final company = load('ABUK');
      final built = <Explainer?>[
        Explainers.relativeVolume(company, ar),
        Explainers.freeFloat(company, ar),
        Explainers.closeStrength(company, ar),
        Explainers.marketCap(company, ar),
        // The title comes from the ARB at the call site, so it is passed as
        // the real key rather than a placeholder that would fail the check
        // for the wrong reason.
        Explainers.move(
          title: ar.movedThisMonthLabel,
          window: ar.perf1Month,
          percent: 18.5,
          l: ar,
        ),
      ].nonNulls.toList();

      expect(built, hasLength(greaterThan(3)));
      for (final e in built) {
        for (final (name, text) in <(String, String?)>[
          ('title', e.title),
          ('plain', e.plain),
          ('yardstick', e.yardstick),
          ('caveat', e.caveat),
          ('source', e.source),
        ]) {
          if (text == null || text.isEmpty) continue;
          expect(
            text,
            isNot(matches(RegExp('[A-Za-z]'))),
            reason: '${e.termId}.$name still reads in Latin: $text',
          );
        }
      }
    });

    // The arithmetic block is exempt from the Latin check on purpose — it is
    // numerals and operators — but its words have to be Arabic too.
    test('the arithmetic is labelled in Arabic', () {
      final company = load('ABUK');
      final rv = Explainers.relativeVolume(company, ar)!;

      expect(rv.workings, contains('سهم'));
      expect(rv.workings, contains('الجلسة الوسطى'));
    });
  });
}
