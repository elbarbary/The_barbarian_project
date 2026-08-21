import 'package:barbarian/features/home/home_screen.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// The proportion bar under "What rose and what fell".
///
/// Three counts tell a reader who is counting; the bar tells one who is
/// glancing. It was reported missing from the screen while sitting correctly
/// in the widget tree — `Expanded` gives a child a tight width and a loose
/// height, and a `ColoredBox` with no child takes the least height it is
/// allowed, which is zero. Three segments laid out at 64, 54 and 198 points
/// wide, and nought tall.
///
/// So this measures the **painted segments**, not the presence of a widget. A
/// test that only asked whether the bar existed passed the entire time it was
/// invisible, which is the more useful lesson of the two.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(useInMemoryPreferences);

  testWidgets('the breadth bar paints three segments with height', (
    tester,
  ) async {
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.textContaining(RegExp(r'of \d+ shares')));

    final bar = find.byKey(const Key('breadth-bar'));
    expect(bar, findsOneWidget, reason: 'the proportion bar is not on screen');

    final size = tester.getSize(bar);
    expect(size.width, greaterThan(100));
    expect(size.height, greaterThanOrEqualTo(10));

    final segments = find.descendant(
      of: bar,
      matching: find.byType(DecoratedBox),
    );
    expect(
      segments,
      findsNWidgets(3),
      reason: 'rose, unchanged and fell are three segments',
    );

    var widest = 0.0;
    for (var i = 0; i < 3; i++) {
      final box = tester.getSize(segments.at(i));
      expect(
        box.height,
        greaterThanOrEqualTo(10),
        reason: 'segment $i painted ${box.height}pt tall — it is invisible',
      );
      expect(box.width, greaterThan(0));
      widest = box.width > widest ? box.width : widest;
    }

    // The segments divide the bar rather than each filling it.
    expect(widest, lessThan(size.width));
  });

  testWidgets('each count carries its own share of the market', (tester) async {
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.textContaining(RegExp(r'of \d+ shares')));

    // Three percentages, one under each count, in the bar's own order. They
    // used to sit in a row of their own spaced by the bar's proportions, which
    // put the unchanged share directly beneath the word "fell".
    expect(find.textContaining(RegExp(r'^\d+%$')), findsNWidgets(3));
  });
}
