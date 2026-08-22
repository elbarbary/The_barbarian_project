import 'package:barbarian/core/widgets/async_view.dart';
import 'package:barbarian/features/home/home_screen.dart';
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

  testWidgets('the first frame does not claim nothing was filed', (
    tester,
  ) async {
    usePhoneSurface(tester);
    await tester.pumpWidget(harness(const HomeScreen()));

    // One frame in: providers have been created and nothing has resolved.
    await tester.pump();

    expect(
      find.text('Nothing filed yet today'),
      findsNothing,
      reason: 'said so before the document had arrived',
    );
    expect(
      find.byType(BLoadingBlocks),
      findsWidgets,
      reason: 'the slot should say it is still loading',
    );
  });
}
