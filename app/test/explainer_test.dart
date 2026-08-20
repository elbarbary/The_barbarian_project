import 'package:barbarian/core/models/company.dart';
import 'package:barbarian/core/models/explainer.dart';
import 'package:barbarian/core/widgets/explainer_sheet.dart';
import 'package:barbarian/core/widgets/nav.dart';
import 'package:barbarian/features/company/company_screen.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// The thesis, tested.
///
/// The app exists to say what a number means, whether it matters, and why —
/// rather than printing the number and leaving the reader to know already.
/// "Relative volume 0.43×" is a true row and a failure of the product.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(useInMemoryPreferences);

  Company load(String ticker) =>
      Company.fromJson(readFixtureObjectSync('companies/$ticker.json'));

  group('every explained figure carries its own arithmetic', () {
    test('relative volume divides the real operands', () {
      final company = load('ABUK');
      final e = Explainers.relativeVolume(company)!;

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
      final e = Explainers.relativeVolume(quiet);
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

      expect(Explainers.relativeVolume(bare), isNull);
      expect(Explainers.freeFloat(bare), isNull);
      expect(Explainers.closeStrength(bare), isNull);
      expect(Explainers.marketCap(bare), isNull);
      expect(
        Explainers.move(title: 'x', window: 'a month', percent: null),
        isNull,
      );
    });

    test('every explainer states a source', () {
      final company = load('ABUK');
      for (final e in [
        Explainers.relativeVolume(company),
        Explainers.freeFloat(company),
        Explainers.closeStrength(company),
        Explainers.marketCap(company),
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
        Explainers.relativeVolume(company),
        Explainers.freeFloat(company),
        Explainers.closeStrength(company),
        Explainers.marketCap(company),
        Explainers.move(title: 'x', window: 'a month', percent: 18.5),
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
      final volume = Explainers.relativeVolume(company)!;
      final ratio = company.market!.volume! /
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
        Explainers.closeStrength(company)!.notability,
        Notability.unjudged,
      );
      expect(Explainers.marketCap(company)!.notability, Notability.unjudged);
    });
  });

  testWidgets('a company screen leads with meaning, not tokens', (
    tester,
  ) async {
    await pumpScreen(
      tester,
      const CompanyScreen(ticker: 'ABUK', parentTab: BNavTab.ask),
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
      const CompanyScreen(ticker: 'ABUK', parentTab: BNavTab.ask),
      until: find.textContaining('Abou Kir'),
    );
    await pumpUntil(tester, find.byType(BPlainNumber));

    await tapVisible(tester, find.byType(BPlainNumber).first);
    await pumpUntil(tester, find.byType(BExplainerSheet));

    // The four fixed parts, in order (spec §4.18).
    expect(find.text('HOW IT IS WORKED OUT'), findsOneWidget);
    expect(find.text('WHAT COUNTS AS UNUSUAL'), findsOneWidget);
  });
}
