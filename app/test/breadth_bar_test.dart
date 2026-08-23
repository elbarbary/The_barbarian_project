import 'package:barbarian/features/home/home_screen.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// The proportion bar inside Home's market hero.
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
/// invisible, which is the more useful lesson of the two — and the reason the
/// key travelled with the bar when it moved into the hero rather than being
/// left behind with the block it came from.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(useInMemoryPreferences);

  Future<void> openHome(WidgetTester tester) async {
    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.byKey(const Key('breadth-bar')));
  }

  testWidgets('the breadth bar paints three segments with height', (
    tester,
  ) async {
    await openHome(tester);

    final bar = find.byKey(const Key('breadth-bar'));
    expect(bar, findsOneWidget, reason: 'the proportion bar is not on screen');

    final size = tester.getSize(bar);
    expect(size.width, greaterThan(100));
    expect(size.height, greaterThanOrEqualTo(10));

    final segments = find.descendant(
      of: bar,
      matching: find.byType(ColoredBox),
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

  testWidgets('the three counts are named, in the bar\'s own order', (
    tester,
  ) async {
    await openHome(tester);

    // The percentages went with the block this replaced. What matters is that
    // the three numbers are labelled in the same order the colours run, which
    // is the mistake the old block made: it printed rose / fell / unchanged
    // above a bar running rose / unchanged / fell, so the middle share sat
    // under the word "fell".
    final line = tester
        .widgetList<Text>(find.byType(Text))
        .map((t) => t.data ?? '')
        .firstWhere(
          (s) => s.contains('rose') && s.contains('fell'),
          orElse: () => '',
        );
    expect(line, isNotEmpty, reason: 'the counts are not on screen');
    expect(
      line.indexOf('rose'),
      lessThan(line.indexOf('unchanged')),
      reason: 'the words must run in the order the colours do',
    );
    expect(line.indexOf('unchanged'), lessThan(line.indexOf('fell')));

    // And the total the shares are out of.
    expect(find.textContaining(RegExp(r'of \d+ shares')), findsOneWidget);
  });
}
