import 'package:barbarian/core/widgets/charts.dart';
import 'package:flutter_test/flutter_test.dart';

/// Suez traffic is 400 daily readings and a card gives it 76 points of width.
/// Every pixel was carrying five sessions, and the chart read as a band of
/// noise — technically the data, and useless.
void main() {
  test('a long series is reduced to what the width can show', () {
    final values = [for (var i = 0; i < 400; i++) 40 + (i % 7).toDouble()];
    final out = BSparkline.downsample(values, 76);

    expect(out.length, lessThan(values.length));
    expect(out.length, lessThanOrEqualTo(38)); // 76pt at 2pt a point
    expect(out.length, greaterThan(2));
  });

  test('a short series is left exactly as it is', () {
    final values = [1.0, 2.0, 3.0, 4.0];
    expect(BSparkline.downsample(values, 200), same(values));
  });

  test('the ends always survive', () {
    // The card prints the first and last readings beside the chart. A shape
    // whose ends disagree with the numbers next to it is worse than no shape.
    final values = [for (var i = 0; i < 500; i++) i.toDouble()];
    final out = BSparkline.downsample(values, 80);
    expect(out.first, values.first);
    expect(out.last, values.last);
  });

  test('it averages rather than samples', () {
    // Sampling every nth point lets one unusual session stand in for a
    // fortnight. Averaging lets it register at its real weight: a single spike
    // in a flat series should lift its bucket a little, not become it.
    final values = [for (var i = 0; i < 100; i++) 10.0]..[50] = 1000.0;
    final out = BSparkline.downsample(values, 20);
    expect(out.reduce((a, b) => a > b ? a : b), lessThan(1000.0));
    expect(out.reduce((a, b) => a > b ? a : b), greaterThan(10.0));
  });

  test('a width too small to draw in leaves the series alone', () {
    final values = [for (var i = 0; i < 50; i++) i.toDouble()];
    expect(BSparkline.downsample(values, 1), same(values));
  });
}
