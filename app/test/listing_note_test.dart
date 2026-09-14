import 'dart:convert';

import 'package:barbarian/core/models/company.dart';
import 'package:barbarian/core/models/market_snapshot.dart';
import 'package:barbarian/core/networking/document_source.dart';
import 'package:barbarian/core/widgets/nav.dart';
import 'package:barbarian/features/company/company_screen.dart';
import 'package:barbarian/features/home/busiest.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// A company the exchange delisted keeps its page, and says it trades OTC.
///
/// Nile Cotton Ginning left the exchange in June 2021 (EGX NewsID 211501) and
/// still changes hands on the over-the-counter system, so hiding it would
/// hide a real share from the people who hold it. The pipeline writes a
/// `listing` note on its directory row and its company document; the app
/// prints it and composes nothing.
const _note = {
  'status': 'delisted',
  'market': 'OTC',
  'delisted_on': '2021-06-14',
  'news_id': 211501,
  'link': 'https://www.egx.com.eg/en/NewsDetails.aspx?NewsID=211501',
  'kind': 'voluntary',
  'note':
      'Delisted from the Egyptian Exchange — final delisting notice of '
      '2021-06-14 (EGX NewsID 211501). Its shares trade over the counter, '
      'not on the exchange.',
  'note_ar':
      'مشطوبة من البورصة المصرية — إخطار الشطب النهائي بتاريخ 2021-06-14 '
      '(رقم 211501). تُتداول أسهمها خارج المقصورة، وليس في البورصة.',
};

/// The bundled fixtures, with the note written onto one real company's
/// document — the fixtures carry no delisted company to open.
class _NotedSource implements DocumentSource {
  const _NotedSource(this.ticker);

  final String ticker;

  @override
  bool get isRefreshable => false;

  @override
  Future<String> fetch(String path) async {
    final body = await const DiskFixtureSource().fetch(path);
    if (path != 'companies/$ticker.json') return body;
    final doc = jsonDecode(body) as Map<String, dynamic>;
    return jsonEncode({...doc, 'listing': _note});
  }
}

void main() {
  group('the note', () {
    test('parses on the directory row and on the company document', () {
      final row = CompanySummary.fromJson({
        'ticker': 'NCGC',
        'name_en': 'Nile Cotton Ginning',
        'listing': _note,
      });
      expect(row.listing?.newsId, 211501);
      expect(row.listing?.delistedOn, '2021-06-14');

      final doc = Company.fromJson({
        'ticker': 'NCGC',
        'name': {'en': 'Nile Cotton Ginning'},
        'listing': _note,
      });
      expect(doc.listing?.link, contains('211501'));

      final listed = CompanySummary.fromJson({
        'ticker': 'COMI',
        'name_en': 'CIB',
      });
      expect(listed.listing, isNull);
    });

    test(
      'is printed in the reader\'s language, English where none was written',
      () {
        final note = CompanyListing.fromJson(_note);
        expect(note.noteFor(arabic: false), startsWith('Delisted from'));
        expect(note.noteFor(arabic: true), contains('خارج المقصورة'));
        final englishOnly = note.copyWith(noteAr: '');
        expect(englishOnly.noteFor(arabic: true), startsWith('Delisted from'));
      },
    );
  });

  test('an over-the-counter print is not a busy session on the exchange', () {
    // NCGC's real 13 September 2026 print, priced so it clears the value
    // floor: the only thing keeping it off the list is the note.
    CompanyDirectory directory({required bool noted}) => CompanyDirectory(
      companies: [
        CompanySummary(
          ticker: 'NCGC',
          nameEn: 'Nile Cotton Ginning',
          medianVolume20d: 95,
          listing: noted ? CompanyListing.fromJson(_note) : null,
        ),
        const CompanySummary(
          ticker: 'COMI',
          nameEn: 'Commercial International Bank',
          medianVolume20d: 100000,
        ),
      ],
    );
    const snapshot = MarketSnapshot(
      date: '2026-09-09',
      stocks: {
        'NCGC': StockQuote(close: 50000, volume: 800),
        'COMI': StockQuote(close: 139.28, volume: 1000000),
      },
    );
    expect(
      busiest(
        directory: directory(noted: true),
        snapshot: snapshot,
      ).map((r) => r.ticker),
      ['COMI'],
    );
    expect(
      busiest(
        directory: directory(noted: false),
        snapshot: snapshot,
      ).map((r) => r.ticker),
      contains('NCGC'),
      reason:
          'without the note the same print qualifies, so the test above '
          'is about the note and not the numbers',
    );
  });

  for (final (locale, words, tag) in [
    (const Locale('en'), 'Delisted from the Egyptian Exchange', 'OTC'),
    (const Locale('ar'), 'مشطوبة من البورصة المصرية', 'خارج المقصورة'),
  ]) {
    testWidgets('the company page keeps the share and says where it trades '
        '(${locale.languageCode})', (tester) async {
      usePhoneSurface(tester);
      await tester.pumpWidget(
        harness(
          const CompanyScreen(ticker: 'COMI', parentTab: BNavTab.home),
          locale: locale,
          source: const _NotedSource('COMI'),
        ),
      );
      await pumpUntil(tester, find.textContaining(words));
      expect(find.textContaining(words), findsOneWidget);
      expect(find.textContaining('211501'), findsOneWidget);
      expect(find.text(tag), findsOneWidget);
    });
  }

  testWidgets('a listed company carries no note', (tester) async {
    usePhoneSurface(tester);
    await tester.pumpWidget(
      harness(const CompanyScreen(ticker: 'COMI', parentTab: BNavTab.home)),
    );
    await pumpUntil(tester, find.text('Financials'));
    expect(
      find.textContaining('Delisted from the Egyptian Exchange'),
      findsNothing,
    );
    expect(find.text('OTC'), findsNothing);
  });
}
