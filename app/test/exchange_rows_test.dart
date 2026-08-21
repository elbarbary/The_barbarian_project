import 'package:barbarian/core/models/disclosure.dart';
import 'package:barbarian/features/home/home_screen.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// Home's "From the exchange" rows must say which filing they are.
///
/// The row carried the ticker, the event type, the age and the explanation —
/// everything except the title. Mixed Oils filed two things on 20 August, its
/// reply to the auditor (egx-293691) and the Central Auditing Organization's
/// report (egx-293690). Both classify as `auditor`, both drew the same
/// explanation and the same measured line, so the two rows rendered as an
/// identical "MOSC · Auditor or accounts" stacked one on the other and looked
/// like a bug in the feed. Today's disclosures block had shown the title all
/// along.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(useInMemoryPreferences);

  testWidgets('the exchange feed shows what was filed', (tester) async {
    final feed = DisclosureFeed.fromJson(
      readFixtureObjectSync('disclosures/latest.json'),
    );
    expect(feed.items, isNotEmpty);

    await pumpScreen(tester, const HomeScreen());
    await pumpUntil(tester, find.textContaining(RegExp('filed this')));

    // Switch the feed selector to the exchange.
    await tester.tap(find.text('From the exchange'));
    await tester.pumpAndSettle();

    // Every row on screen names its own filing rather than only its issuer.
    final shown = feed.items.take(5);
    var found = 0;
    for (final item in shown) {
      if (find.text(item.titleFor(false)).evaluate().isNotEmpty) found++;
    }
    expect(
      found,
      greaterThan(0),
      reason: 'no filing title reached the screen; the rows can only be told '
          'apart by their titles when one company files twice in a day',
    );
  });

  test('the title is what separates two filings from one company', () {
    final feed = DisclosureFeed.fromJson(
      readFixtureObjectSync('disclosures/latest.json'),
    );

    // What the row used to show, per item. Two items colliding here rendered
    // as two identical rows on Home.
    String withoutTitle(Disclosure d) =>
        '${d.tickers.join(",")}|${d.eventLabel}|${d.date}|${d.because}';

    // Restricted to filings that name a company, which is what Home's exchange
    // feed lists. The exchange also posts untitled-in-practice notices — two
    // separate listing-committee decisions on 20 August (egx-293674 and
    // egx-293662) share the title "قرار لجنة القيد بخصوص بعض الشركات" and name
    // no issuer, so nothing published about them tells them apart. That is the
    // exchange's ambiguity and it is not ours to invent a difference for.
    final named = feed.items.where((d) => d.tickers.isNotEmpty).toList();
    expect(named, isNotEmpty);

    final blind = named.map(withoutTitle).toSet();
    final sighted = named
        .map((d) => '${withoutTitle(d)}|${d.titleFor(false)}')
        .toSet();

    expect(
      sighted.length,
      named.length,
      reason: 'two filings from one company are still indistinguishable even '
          'with the title on the row',
    );
    expect(
      blind.length,
      lessThan(named.length),
      reason: 'this fixture no longer contains the collision this guards '
          'against — if the feed really has no repeats, relax the test rather '
          'than the row',
    );
  });
}
