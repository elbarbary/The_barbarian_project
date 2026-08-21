import 'package:barbarian/core/models/company.dart';
import 'package:barbarian/features/company/price_chart.dart';
import 'package:flutter_test/flutter_test.dart';

/// §13 lists 1M 3M 1Y 5Y MAX, and the app offered all five on every company.
///
/// `apply` returns everything it holds when a window is longer than the series,
/// so on the ~240 EGX listings holding fifty to a hundred sessions, 1Y, 5Y and
/// MAX all drew the identical line as 3M. Five buttons where three do nothing
/// is a screen quietly overstating how much history it has.
void main() {
  List<String> labelsFor(int held) =>
      PriceRange.offeredFor(held).map((r) => r.label).toList();

  test('a few months offers the short windows only', () {
    // The common case here: 240 of 282 companies.
    expect(labelsFor(66), ['1M', '3M']);
    // With 80 sessions MAX shows a fifth more than 3M's 66, which is a real
    // difference and earns its button. At exactly 66 it would show nothing new.
    expect(labelsFor(80), ['1M', '3M', 'MAX']);
  });

  test('a year of sessions earns 1Y', () {
    expect(labelsFor(254), contains('1Y'));
    expect(labelsFor(254), isNot(contains('5Y')));
  });

  test('5Y appears only with five years behind it', () {
    expect(labelsFor(1300), contains('5Y'));
    // 254 sessions beats the 1Y window by four days. Calling that button "5Y"
    // would be a lie told by four days.
    expect(labelsFor(254), isNot(contains('5Y')));
  });

  test('MAX appears only when it beats every fixed window', () {
    // Otherwise MAX is just the longest fixed window wearing a different name.
    expect(labelsFor(254), isNot(contains('MAX')));
    expect(labelsFor(2000), contains('MAX'));
  });

  test('a series too short to draw offers nothing to choose between', () {
    expect(labelsFor(0), isEmpty);
    expect(labelsFor(1), isEmpty);
  });

  test('every offered window shows more than the one before it', () {
    // The property the whole thing exists for: no two buttons draw the same
    // line. Checked across the range of history the app actually holds.
    for (final held in [2, 22, 66, 99, 254, 700, 1300, 2000]) {
      final offered = PriceRange.offeredFor(held);
      final lengths = [
        for (final r in offered) r.apply(List.filled(held, _point)).length,
      ];
      expect(
        lengths.toSet().length,
        lengths.length,
        reason: 'with $held sessions two windows draw the same line: $lengths',
      );
    }
  });
}

const _point = PricePoint(date: '2026-08-20', close: 1.0);
