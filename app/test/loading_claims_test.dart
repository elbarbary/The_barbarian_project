import 'package:barbarian/core/widgets/controls.dart';
import 'package:barbarian/features/home/home_screen.dart';
import 'package:barbarian/features/today/today_screen.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// The app must not state an absence it has not finished checking.
///
/// `_DailyInsight` read the filings with `whenOrNull(data:)`, which collapses
/// loading and error into the same null as a genuinely empty feed — so the
/// landing screen printed "Nothing filed yet today", an affirmative claim
/// about the exchange, while the document was still downloading. The manifest
/// is awaited before the cache is read, with a ten-second connect timeout, so
/// that window is not brief on a bad connection.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(useInMemoryPreferences);

  testWidgets('the first frame does not claim the day was quiet', (
    tester,
  ) async {
    // The lead-filing hero this used to guard is gone — the filings live on
    // Today, in full. Home's own version of the same mistake would be to say
    // "no company traded far outside its own normal today" before the
    // directory and the snapshot have arrived, which is a claim about the
    // exchange made from an empty cache.
    usePhoneSurface(tester);
    await tester.pumpWidget(harness(const HomeScreen()));

    // One frame in: providers have been created and nothing has resolved.
    await tester.pump();

    expect(
      find.textContaining('No company traded'),
      findsNothing,
      reason: 'said so before the documents had arrived',
    );
    expect(
      find.byType(BSkeletonBlock),
      findsWidgets,
      reason: 'the hero should say it is still loading',
    );
  });

  testWidgets('and Today does not claim nothing was filed', (tester) async {
    usePhoneSurface(tester);
    await tester.pumpWidget(harness(const TodayScreen()));
    await tester.pump();

    expect(
      find.textContaining('has not published yet'),
      findsNothing,
      reason: 'said so before the document had arrived',
    );
  });
}
