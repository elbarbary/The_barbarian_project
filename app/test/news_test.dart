import 'package:barbarian/core/models/news.dart';
import 'package:barbarian/core/theme/barbarian_theme.dart';
import 'package:barbarian/core/widgets/news_thumb.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:barbarian/core/widgets/filing_actions.dart';
import 'package:barbarian/core/widgets/nav.dart';

import 'support/harness.dart';

/// The news feed's job is triage, and triage is where an unlicensed publisher
/// gets into trouble. These hold the line between "two published facts joined"
/// and "our opinion of the news".
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  NewsFeed load() =>
      NewsFeed.fromJson(readFixtureObjectSync('news/latest.json'));

  test('the feed publishes headlines and links, never article bodies', () {
    final feed = load();
    expect(feed.items, isNotEmpty);

    for (final item in feed.items) {
      expect(item.headline, isNotEmpty);
      expect(item.sources.first.link, startsWith('http'));
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
    // Every story credits at least one named outlet, and every outlet it
    // credits is one we actually fetched — an unattributed headline is a
    // headline this app is claiming as its own.
    final ids = feed.sources.map((s) => s.id).toSet();
    for (final item in feed.items) {
      expect(item.sources, isNotEmpty, reason: '${item.id} credits nobody');
      for (final attribution in item.sources) {
        expect(ids, contains(attribution.id));
        expect(attribution.link, startsWith('http'));
      }
    }
  });

  test('a merged story credits every outlet that ran it', () {
    final feed = load();
    final multi = feed.items.where((i) => i.sources.length > 1);
    for (final item in multi) {
      // Never the same outlet twice: that would be one paper's two write-ups
      // presented as independent corroboration.
      final ids = item.sources.map((s) => s.id).toList();
      expect(
        ids.toSet().length,
        ids.length,
        reason: '${item.id} double-counts',
      );
    }
  });

  test('the event tag says what happened, never whether it was good', () {
    // The slot where every competitor puts positive/negative. A valence badge
    // beside a company name is a view on that company.
    const valence = [
      'positive',
      'negative',
      'neutral',
      'bullish',
      'bearish',
      'good',
      'bad',
      'strong',
      'weak',
      'risk',
      'warning',
    ];
    for (final item in load().items) {
      final label = item.eventLabel.toLowerCase();
      for (final word in valence) {
        expect(
          label,
          isNot(contains(word)),
          reason: '"${item.eventLabel}" characterises the news',
        );
      }
    }
  });

  group('the outlet\'s own picture', () {
    test('the feed carries pictures for a real share of stories', () {
      // Arab Finance is read from a sitemap and publishes none, so this will
      // never be all of them — but it should be a substantial part, and zero
      // means the `_embed` parameter fell off the endpoint again.
      final feed = NewsFeed.fromJson(readFixtureObjectSync('news/latest.json'));
      final withPicture = feed.items.where((i) => (i.image ?? '').isNotEmpty);

      expect(feed.items, isNotEmpty);
      expect(
        withPicture,
        isNotEmpty,
        reason: 'nothing carries a picture; check the news endpoint',
      );

      // Measured over the top of the feed rather than all of it, because that
      // is the part anybody sees and because the proportion across the whole
      // document says more about Arab Finance's sitemap than about us: it
      // files five of every six stories we hold and publishes no pictures at
      // all. The ranking puts a reconstructed headline below a published one,
      // so if this slips it means that ordering broke — which is the thing
      // worth catching.
      final lead = feed.items.take(30);
      expect(
        lead.where((i) => (i.image ?? '').isNotEmpty).length,
        greaterThan(20),
        reason:
            'the feed no longer leads with the outlets that publish '
            'a headline and a photograph',
      );
      for (final item in withPicture) {
        expect(item.image, startsWith('http'));
      }
    });

    testWidgets('no picture means no gap, not an empty box', (tester) async {
      // The row has to look deliberate when there is nothing to show. A
      // reserved 56-point hole reads as a bug.
      await tester.pumpWidget(
        MaterialApp(
          theme: BarbarianTheme.light(),
          home: const Scaffold(body: BNewsThumb(url: null)),
        ),
      );
      final size = tester.getSize(find.byType(BNewsThumb));
      expect(size.width, 0);
      expect(size.height, 0);
    });

    testWidgets('an empty address is treated as no picture', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: BarbarianTheme.light(),
          home: const Scaffold(body: BNewsThumb(url: '   ')),
        ),
      );
      expect(tester.getSize(find.byType(BNewsThumb)).width, 0);
    });
  });

  group('a story that names a company', () {
    // The card carried the ticker and its only tap left the app for the
    // outlet's page, while one segment across a filing row that looks
    // identical offered "Open PRDC". Same two meanings, same two choices.

    // Resolved against the directory rather than trusted from the tag: the
    // dead tap the filing rows already had came from offering a company the
    // app has no document for.
    test('the company is offered only when the app holds it', () {
      const item = NewsItem(id: 'x', headline: 'x', tickers: ['ANFI', 'PRDC']);

      expect(item.heldCompany((t) => t == 'PRDC'), 'PRDC');
      expect(item.heldCompany((t) => t == 'ANFI'), 'ANFI');
      expect(item.heldCompany((_) => false), isNull);
      expect(
        const NewsItem(id: 'y', headline: 'y').heldCompany((_) => true),
        isNull,
      );
    });

    // 367 of the 400 items name nothing this app holds, and those keep their
    // single tap rather than paying a modal for the rest.
    test('most of the published feed names nothing we hold', () {
      final feed = readFixtureObjectSync('news/latest.json');
      final directory = readFixtureObjectSync('companies.json');
      final known = {
        for (final c
            in (directory['companies'] as List).cast<Map<String, dynamic>>())
          c['ticker'] as String,
      };

      var tagged = 0;
      for (final raw in (feed['items'] as List).cast<Map<String, dynamic>>()) {
        final item = NewsItem.fromJson(raw);
        if (item.heldCompany(known.contains) != null) tagged++;
      }

      expect(tagged, greaterThan(0), reason: 'nothing to offer a company for');
      expect(
        tagged,
        lessThan((feed['items'] as List).length ~/ 2),
        reason: 'if most rows resolve, the modal is a tax on the whole feed',
      );
    });

    testWidgets('the sheet offers the company and the story', (tester) async {
      final feed = readFixtureObjectSync('news/latest.json');
      final directory = readFixtureObjectSync('companies.json');
      final known = {
        for (final c
            in (directory['companies'] as List).cast<Map<String, dynamic>>())
          c['ticker'] as String,
      };

      // Read from the fixture rather than named here: the pipeline rewrites
      // this file every day and a hardcoded headline fails the next morning.
      NewsItem? story;
      for (final raw in (feed['items'] as List).cast<Map<String, dynamic>>()) {
        final item = NewsItem.fromJson(raw);
        if (item.heldCompany(known.contains) != null) {
          story = item;
          break;
        }
      }
      expect(story, isNotNull);
      final ticker = story!.heldCompany(known.contains)!;

      usePhoneSurface(tester);
      await pumpScreen(
        tester,
        Scaffold(
          body: Builder(
            builder: (context) => Center(
              child: TextButton(
                onPressed: () => showNewsActions(
                  context,
                  item: story!,
                  ticker: ticker,
                  link: 'https://example.test/story',
                  from: BNavTab.today,
                  outlet: 'Al Borsa',
                ),
                child: const Text('tap'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('tap'));
      await tester.pumpAndSettle();

      expect(find.text('Open $ticker'), findsOneWidget);
      expect(find.text('Read the story'), findsOneWidget);

      // Both choices fully on screen, clear of the floating nav — the mistake
      // the filing sheet made twice.
      for (final label in ['Open $ticker', 'Read the story']) {
        final box = tester.getRect(find.text(label));
        expect(box.bottom, lessThan(tester.view.physicalSize.height));
      }
    });
  });
}
