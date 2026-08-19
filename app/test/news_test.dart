import 'package:barbarian/core/models/news.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// The news feed's job is triage, and triage is where an unlicensed publisher
/// gets into trouble. These hold the line between "two published facts joined"
/// and "our opinion of the news".
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  NewsFeed load() => NewsFeed.fromJson(readFixtureObjectSync('news/latest.json'));

  test('the feed publishes headlines and links, never article bodies', () {
    final feed = load();
    expect(feed.items, isNotEmpty);

    for (final item in feed.items) {
      expect(item.headline, isNotEmpty);
      expect(item.link, startsWith('http'));
      // A headline is a fact and a pointer. An excerpt long enough to stand in
      // for the article is somebody else's work, and the pipeline strips it.
      expect(
        item.headline.length,
        lessThan(200),
        reason: 'a headline this long is a summary: ${item.headline}',
      );
    }
  });

  test('every weight carries the reason it was given', () {
    for (final item in load().items) {
      expect(item.weight, isIn(['check', 'named', 'market']));
      expect(
        item.because,
        isNotEmpty,
        reason: '${item.id} is weighted "${item.weight}" with no reason given',
      );
    }
  });

  test('"worth a look" always shows the arithmetic behind it', () {
    final feed = load();
    for (final item in feed.worthAChecking) {
      final evidence = item.evidence;
      expect(
        evidence,
        isNotNull,
        reason: '${item.id} claims importance with nothing to check it by',
      );
      // The claim and the numbers must agree, and the threshold must be the
      // published one rather than something tuned per story.
      expect(evidence!.ratio, greaterThanOrEqualTo(evidence.threshold));
      expect(evidence.threshold, feed.threshold);
      expect(item.because, contains(evidence.ticker));
    }
  });

  test('an item that names no company says so, and claims nothing', () {
    final unmatched = load().items.where((i) => i.tickers.isEmpty);
    for (final item in unmatched) {
      expect(item.weight, isNot('check'));
      expect(item.evidence, isNull);
    }
  });

  test('the feed never characterises the news itself', () {
    // The failure mode this replaces: a sentiment badge. "Positive" on a
    // headline about a named issuer is a view on that issuer, published by
    // somebody with no licence to hold one.
    const banned = [
      'positive',
      'negative',
      'bullish',
      'bearish',
      'good news',
      'bad news',
      'opportunity',
      'buy',
      'sell',
    ];
    for (final item in load().items) {
      final blob = item.because.toLowerCase();
      for (final word in banned) {
        expect(
          blob,
          isNot(contains(word)),
          reason: '${item.id} calls the news "$word"',
        );
      }
    }
  });

  test('the outlets are named, and so are the ones that failed', () {
    final feed = load();
    expect(feed.sources, isNotEmpty);
    for (final source in feed.sources) {
      expect(source.name, isNotEmpty);
    }
    // Every published item belongs to a named outlet — an unattributed
    // headline is a headline this app is claiming as its own.
    final ids = feed.sources.map((s) => s.id).toSet();
    for (final item in feed.items) {
      expect(ids, contains(item.source));
    }
  });
}
