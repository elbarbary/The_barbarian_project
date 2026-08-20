import 'package:barbarian/core/models/company.dart';
import 'package:barbarian/core/models/profit_movement.dart';
import 'package:flutter_test/flutter_test.dart';

/// The sentence a reader actually takes away from two numbers.
///
/// This is the product thesis reduced to one function: "447.1 and 17.4" is
/// data, "26 times what it made in the same half last year" is the thing
/// somebody who does not do arithmetic in their head can use. So it is worth
/// pinning hard — including the cases where a percentage would be nonsense.
FinancialPeriod p(String period, double? netIncome) =>
    FinancialPeriod(period: period, netIncome: netIncome);

void main() {
  group('growth', () {
    test('a large multiple is stated as a multiple, not a percentage', () {
      // The real ELKA H1 2026 filing: EGP 447,077,873 against 17,432,345.
      // "+2,465%" is technically right and completely unreadable.
      final move = profitMovement(p('H1 2026', 447.078), p('H1 2025', 17.432))!;

      expect(move.delta, '26x');
      expect(move.direction, ProfitDirection.up);
      expect(move.sentence, contains('26 times'));
      expect(move.sentence, contains('H1 2025'));
    });

    test('a modest rise is stated as a percentage', () {
      final move = profitMovement(p('FY 2024', 110), p('FY 2023', 100))!;

      expect(move.delta, '10%');
      expect(move.direction, ProfitDirection.up);
      expect(move.sentence, contains('rose'));
    });

    test('a fall is a fall', () {
      final move = profitMovement(p('FY 2024', 80), p('FY 2023', 100))!;

      expect(move.delta, '20%');
      expect(move.direction, ProfitDirection.down);
      expect(move.sentence, contains('fell'));
    });

    test('an exact doubling crosses into multiples', () {
      expect(profitMovement(p('FY 2024', 200), p('FY 2023', 100))!.delta, '2.0x');
    });
  });

  group('sign changes, where a percentage would be meaningless', () {
    test('a loss becoming a profit is described, not divided', () {
      final move = profitMovement(p('FY 2024', 50), p('FY 2023', -30))!;

      expect(move.delta, 'to a profit');
      expect(move.direction, ProfitDirection.up);
      expect(move.sentence, contains('after losing'));
      // Dividing by a negative base would have produced "-267%", which reads
      // as a collapse in the year the company started making money.
      expect(move.sentence, isNot(contains('%')));
    });

    test('a profit becoming a loss is described', () {
      final move = profitMovement(p('FY 2024', -20), p('FY 2023', 45))!;

      expect(move.delta, 'to a loss');
      expect(move.direction, ProfitDirection.down);
      expect(move.sentence, contains('after making'));
    });

    test('breaking even last year is not called a loss', () {
      final move = profitMovement(p('FY 2024', 10), p('FY 2023', 0))!;

      expect(move.sentence, contains('breaking even'));
      expect(move.sentence, isNot(contains('losing')));
    });

    test('a widening loss points down', () {
      final move = profitMovement(p('FY 2024', -80), p('FY 2023', -30))!;

      expect(move.delta, 'wider loss');
      expect(move.direction, ProfitDirection.down);
      expect(move.sentence, contains('grew'));
    });

    test('a shrinking loss points up, though the figure is still negative', () {
      final move = profitMovement(p('FY 2024', -10), p('FY 2023', -60))!;

      expect(move.delta, 'smaller loss');
      expect(move.direction, ProfitDirection.up);
      expect(move.sentence, contains('shrank'));
    });
  });

  group('nothing to say', () {
    test('no prior period yields nothing', () {
      expect(profitMovement(p('FY 2024', 100), null), isNull);
    });

    test('a missing figure on either side yields nothing', () {
      expect(profitMovement(p('FY 2024', null), p('FY 2023', 100)), isNull);
      expect(profitMovement(p('FY 2024', 100), p('FY 2023', null)), isNull);
    });

    test('an unchanged figure is flat, not a 0% move', () {
      final move = profitMovement(p('FY 2024', 100), p('FY 2023', 100))!;

      expect(move.direction, ProfitDirection.flat);
      expect(move.delta, 'unchanged');
    });
  });

  test('formatMillions keeps small figures readable and large ones short', () {
    expect(formatMillions(null), '—');
    expect(formatMillions(447.078), '447');
    expect(formatMillions(17.432), '17');
    expect(formatMillions(4.2), '4.2');
    expect(formatMillions(249527), '249.5k');
    expect(formatMillions(-30), '-30');
  });

  group('comparing like with like', () {
    test('a half year is compared with the half year before it', () {
      final periods = [p('H1 2025', 10), p('H1 2026', 20)];

      expect(comparablePrior(periods, periods.last)!.period, 'H1 2025');
    });

    test('a half year is never compared with the quarter inside it', () {
      // EGX filings are cumulative from the start of the financial year, so
      // H1 2026 contains Q1 2026. Comparing them would report a rise that is
      // only the second quarter existing.
      final periods = [p('Q1 2026', 8), p('H1 2026', 20)];

      expect(comparablePrior(periods, periods.last), isNull);
    });

    test('it reaches past a mismatched period to the right one', () {
      final periods = [p('H1 2025', 10), p('Q1 2026', 8), p('H1 2026', 20)];

      expect(comparablePrior(periods, periods.last)!.period, 'H1 2025');
    });

    test('financial years compare with financial years', () {
      final periods = [p('FY 2023', 5), p('FY 2024', 9)];

      expect(comparablePrior(periods, periods.last)!.period, 'FY 2023');
    });

    test('a consolidated period is not compared with a standalone one', () {
      // Whichever source wins each period is decided per period, so these can
      // end up adjacent. The gap between them is an accounting boundary, not a
      // year of trading.
      const group = FinancialPeriod(
          period: 'H1 2026', netIncome: 463.8, basis: 'consolidated');
      const alone = FinancialPeriod(
          period: 'H1 2025', netIncome: 17.4, basis: 'standalone');

      expect(comparablePrior([alone, group], group), isNull);
    });

    test('two filings on the same basis do compare', () {
      const now = FinancialPeriod(
          period: 'H1 2026', netIncome: 447.1, basis: 'standalone');
      const was = FinancialPeriod(
          period: 'H1 2025', netIncome: 17.4, basis: 'standalone');

      expect(comparablePrior([was, now], now)!.period, 'H1 2025');
    });

    test('annual statements carry no basis and still compare', () {
      final periods = [p('FY 2023', 5), p('FY 2024', 9)];

      expect(comparablePrior(periods, periods.last)!.period, 'FY 2023');
    });

    test('the earliest period has nothing before it', () {
      final periods = [p('FY 2023', 5), p('FY 2024', 9)];

      expect(comparablePrior(periods, periods.first), isNull);
    });
  });

  /// §8.5 — this file generates prose about a named company's earnings, which
  /// makes it the likeliest place in the app to drift into advice. The source
  /// scan in legal_voice_test only sees string literals; these sentences are
  /// assembled, so they are checked as they actually come out.
  test('§8.5 no generated sentence advises, targets or predicts', () {
    final blocked = [
      RegExp(r'\bbuy\b', caseSensitive: false),
      RegExp(r'\bsell\b', caseSensitive: false),
      RegExp(r'\bhold\b', caseSensitive: false),
      RegExp(r'\bshould\b', caseSensitive: false),
      RegExp(r'\brecommend', caseSensitive: false),
      RegExp(r'\bcheap\b', caseSensitive: false),
      RegExp(r'\bexpensive\b', caseSensitive: false),
      RegExp(r'\bundervalued\b', caseSensitive: false),
      RegExp(r'\bopportunity\b', caseSensitive: false),
      RegExp(r'\bwill\b', caseSensitive: false),
      RegExp(r'\bexpect', caseSensitive: false),
      RegExp(r'\bforecast', caseSensitive: false),
      RegExp(r'\btarget\b', caseSensitive: false),
      RegExp(r'\bstrong\b', caseSensitive: false),
      RegExp(r'\bweak\b', caseSensitive: false),
      RegExp(r'\bgood\b', caseSensitive: false),
      RegExp(r'\bbad\b', caseSensitive: false),
    ];

    // Every branch of the function, including the ones a happy path misses.
    const figures = [-1000.0, -60.0, -1.0, 0.0, 1.0, 17.4, 100.0, 447.1, 99999.0];
    final sentences = <String>[];
    for (final now in figures) {
      for (final was in figures) {
        final move = profitMovement(p('H1 2026', now), p('H1 2025', was));
        if (move != null) {
          sentences..add(move.sentence)..add(move.delta);
        }
      }
    }
    expect(sentences, isNotEmpty);

    final offenders = <String>[];
    for (final sentence in sentences) {
      for (final pattern in blocked) {
        if (pattern.hasMatch(sentence)) offenders.add('$pattern :: $sentence');
      }
    }
    expect(offenders, isEmpty, reason: offenders.join('\n'));
  });
}
