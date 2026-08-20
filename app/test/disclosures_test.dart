import 'package:barbarian/core/models/disclosure.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// The disclosure feed is where the app comes closest to saying something
/// about a named company, so these hold the two lines that matter: the link to
/// the company is the exchange's, and the explanation is a person's.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  DisclosureFeed load() =>
      DisclosureFeed.fromJson(readFixtureObjectSync('disclosures/latest.json'));

  test('every filing links to the exchange, never to us', () {
    final feed = load();
    expect(feed.items, isNotEmpty);
    for (final item in feed.items) {
      expect(item.title, isNotEmpty);
      expect(item.link, startsWith('https://www.egx.com.eg'));
    }
  });

  test('the ticker comes from the title, not from a guess', () {
    // Newspaper matching failed twice — on word overlap and on
    // transliteration. This never infers: EGX stamps (TICKER.CA) into the
    // title and the parser reads it back out, so every tagged ticker must be
    // literally present in the words of the filing.
    for (final item in load().items) {
      for (final ticker in item.tickers) {
        expect(
          item.title,
          contains(ticker),
          reason: '${item.id} is tagged $ticker, which is not in its title',
        );
      }
    }
  });

  test('every filing carries a type and its plain-language meaning', () {
    for (final item in load().items) {
      expect(item.eventLabel, isNotEmpty);
      expect(
        item.meaning,
        isNotEmpty,
        reason: '${item.id} has a type with no explanation behind it',
      );
      // The meaning is glossary prose, so it should be a sentence rather than
      // a label echoed back.
      expect(item.meaning.length, greaterThan(30));
    }
  });

  test('one taxonomy at a time', () {
    // A merged document used to carry whichever vocabulary was in force when
    // each item first landed, so two schemes appeared side by side. Labels are
    // re-derived from the glossary every run; this catches a regression.
    final byEvent = <String, Set<String>>{};
    for (final item in load().items) {
      byEvent.putIfAbsent(item.event, () => <String>{}).add(item.eventLabel);
    }
    for (final entry in byEvent.entries) {
      expect(
        entry.value.length,
        1,
        reason: '"${entry.key}" renders as ${entry.value} — more than one '
            'taxonomy is live in the same document',
      );
    }
  });

  test('"worth a look" always shows the arithmetic behind it', () {
    final feed = load();
    for (final item in feed.worthALook) {
      final evidence = item.evidence;
      expect(evidence, isNotNull, reason: '${item.id} claims weight with no evidence');
      expect(evidence!.ratio, greaterThanOrEqualTo(evidence.threshold));
      expect(evidence.threshold, feed.threshold);
      expect(item.because, contains(evidence.ticker));
    }
  });

  test('a filing naming no share claims nothing', () {
    for (final item in load().items.where((i) => i.tickers.isEmpty)) {
      expect(item.weight, isNot('check'));
      expect(item.evidence, isNull);
    }
  });

  test('the glossary never tells anybody what to do', () {
    // The meanings are the most opinion-shaped prose in the app — they explain
    // consequences. Explaining that a capital increase dilutes you is
    // mechanism; telling you what to do about it is advice.
    // Instruction shapes, not vocabulary. "Nobody can buy or sell it at any
    // price" is what a trading halt *is*; banning the bare word would force
    // that sentence to be written worse while changing nothing about whether
    // the app is telling anybody to do something. Same correction the
    // explainer tests needed.
    const banned = [
      'you should', 'you can profit', 'we recommend', 'worth buying',
      'worth selling', 'buy now', 'sell now', 'a good time to',
      'a bad time to', 'take advantage', 'opportunity to',
    ];
    final seen = <String>{};
    for (final item in load().items) {
      if (!seen.add(item.meaning)) continue;
      final text = item.meaning.toLowerCase();
      for (final phrase in banned) {
        expect(
          text,
          isNot(contains(phrase)),
          reason: '"${item.eventLabel}" says "$phrase"',
        );
      }
    }
  });
}
