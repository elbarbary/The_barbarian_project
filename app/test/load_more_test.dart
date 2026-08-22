import 'package:barbarian/core/widgets/load_more.dart';
import 'package:barbarian/features/today/today_screen.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// The way through to the rest of the feed.
///
/// Both feeds hold far more than they show — 400 stories behind thirty, and a
/// kept archive of filings behind a thirty-day window. The control that opens
/// them used to be a bare `TextButton`, which at the bottom of a long column
/// reads as a caption rather than something to press.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(useInMemoryPreferences);

  testWidgets('both feeds offer a way to the rest of themselves', (
    tester,
  ) async {
    await pumpScreen(tester, const TodayScreen());
    await pumpUntil(tester, find.byType(BLoadMoreButton));

    final buttons = find.byType(BLoadMoreButton);
    expect(
      buttons,
      findsWidgets,
      reason: 'nothing on Today offers the rest of the feed',
    );

    // Big enough to read as a control. 52pt is above the 44pt tap target the
    // platform asks for, and the old TextButton was neither full width nor
    // bounded.
    for (var i = 0; i < buttons.evaluate().length; i++) {
      final size = tester.getSize(buttons.at(i));
      expect(size.height, greaterThanOrEqualTo(44));
      expect(size.width, greaterThan(200));
    }
  });
}
