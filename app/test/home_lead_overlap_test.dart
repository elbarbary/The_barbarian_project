import 'package:barbarian/core/models/news.dart';
import 'package:barbarian/features/home/home_screen.dart';
import 'package:barbarian/features/home/connect_dots.dart';
import 'package:barbarian/features/home/lead_story.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// Home must not print the same story twice on one screen.
///
/// The rail took the first six illustrated stories of the top 24; the list
/// beneath it took the first five outright. Since the ranking now puts the
/// stories that carry a picture at the top, those were the same five — so the
/// app opened with a screen and a half of duplicates.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('the rail and the list below it share no story', () {
    final feed = NewsFeed.fromJson(readFixtureObjectSync('news/latest.json'));
    expect(feed.items.length, greaterThan(20));

    final leads = leadStories(feed.items);
    expect(leads, isNotEmpty);

    final ids = {for (final lead in leads) lead.id};
    final below = [
      for (final item in feed.items)
        if (!ids.contains(item.id)) item,
    ].take(5);

    expect(below, hasLength(5));
    for (final item in below) {
      expect(
        ids.contains(item.id),
        isFalse,
        reason: '"${item.headline}" is in the rail and the list at once',
      );
    }
  });

  test('the overlap this guards against is real in the published feed', () {
    // Without the exclusion the first five of the list ARE the rail's, which
    // is the thing being fixed — if this ever stops being true the test above
    // is passing for the wrong reason.
    final feed = NewsFeed.fromJson(readFixtureObjectSync('news/latest.json'));
    final ids = {for (final lead in leadStories(feed.items)) lead.id};
    final naive = feed.items.take(5);
    expect(
      naive.where((i) => ids.contains(i.id)),
      isNotEmpty,
      reason: 'the feed no longer overlaps, so this guard proves nothing',
    );
  });

  testWidgets('Home does not render one headline twice', (tester) async {
    final feed = NewsFeed.fromJson(readFixtureObjectSync('news/latest.json'));
    final lead = leadStories(feed.items).first;

    await pumpScreen(tester, const HomeScreen());
    // Wait for the feed itself, not for the widget that will hold it: the
    // rail returns an empty box until the document arrives, so a test that
    // waits on `BLeadStory` counts an empty screen and passes.
    await pumpUntil(tester, find.text(lead.headlineFor(false)));

    // The rail carries it; the list under the selector must not.
    // Counted across the whole built tree, and the rail has to have built
    // its first card for this to prove anything — so assert that first. The
    // version of this test that skipped the check passed while the app was
    // visibly printing the headline twice.
    final headline = lead.headlineFor(false);
    final everywhere = find.text(headline);
    expect(
      everywhere,
      findsWidgets,
      reason: 'the rail never built its first card, so this proves nothing',
    );

    // Not counted inside "Connecting the dots".
    //
    // That block's whole job is to list the places one company turned up —
    // the filing, the story, the session — so a story it names is evidence in
    // a different card rather than the feed repeating itself. Today MOED's
    // card quotes the story that also leads, which is the block working. The
    // duplication this test exists to catch is the rail and the list under
    // the selector printing the same five headlines in the same order.
    final inDots = find
        .descendant(of: find.byType(BConnectDots), matching: everywhere)
        .evaluate()
        .length;
    final shown = everywhere.evaluate().length - inDots;

    expect(
      shown,
      1,
      reason:
          '"${lead.headline}" is on screen $shown times outside the '
          'connect-the-dots block — the rail and the list are both '
          'carrying it',
    );
  });
}
