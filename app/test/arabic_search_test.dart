import 'dart:convert';
import 'dart:io';

import 'package:barbarian/core/models/company.dart';
import 'package:flutter_test/flutter_test.dart';

/// Searching the directory in Arabic.
///
/// An exact substring test made most of the directory unreachable to an
/// Arabic reader: the names come from two sources that spell hamza and ta
/// marbuta differently from each other, and readers do not type them
/// consistently either. Run against the shipped directory rather than against
/// invented names, because the whole problem is what the real data looks like.
void main() {
  final directory = CompanyDirectory.fromJson(
    jsonDecode(File('assets/fixtures/companies.json').readAsStringSync())
        as Map<String, dynamic>,
  );
  final folded = foldArabicNames(directory.companies);

  List<String> search(String query) {
    final q = arabicFold(query.trim().toLowerCase());
    return [
      for (final c in directory.companies)
        if (c.matches(q, foldedNameAr: folded[c.ticker])) c.ticker,
    ];
  }

  test('the fixture is worth testing against', () {
    expect(directory.companies.length, greaterThan(200));
    expect(folded.length, greaterThan(200));
  });

  group('folding', () {
    test('the hamza forms collapse onto alif', () {
      expect(arabicFold('الإسكندرية'), arabicFold('الاسكندرية'));
      expect(arabicFold('أبو'), 'ابو');
      expect(arabicFold('آمون'), 'امون');
    });

    test('ta marbuta reads as ha, and alif maqsura as ya', () {
      expect(arabicFold('المصرية'), arabicFold('المصريه'));
      expect(arabicFold('مصطفى'), arabicFold('مصطفي'));
    });

    test('harakat and tatweel are dropped', () {
      expect(arabicFold('مُحَمَّد'), 'محمد');
      expect(arabicFold('الـــقاهرة'), arabicFold('القاهره'));
    });

    test('Latin and digits pass through untouched', () {
      expect(arabicFold('COMI 2026'), 'COMI 2026');
    });
  });

  group('what the reader can now find', () {
    // Each of these returned far fewer, or none at all, before folding.
    test('a name typed without its hamza still finds the company', () {
      final withHamza = search('الإسكندرية');
      final without = search('الاسكندرية');

      expect(without, isNotEmpty);
      expect(without, equals(withHamza));
    });

    test('a name typed with ha instead of ta marbuta finds the same set', () {
      expect(search('المصريه'), equals(search('المصرية')));
      expect(search('المصريه').length, greaterThan(5));
    });

    test('"القاهره" reaches the Cairo companies', () {
      expect(search('القاهره'), isNotEmpty);
      expect(search('القاهره'), equals(search('القاهرة')));
    });
  });

  test('an English or ticker search is unchanged by any of this', () {
    expect(search('comi'), contains('COMI'));
    expect(search('commercial'), contains('COMI'));
    expect(search(''), hasLength(directory.companies.length));
  });
}
