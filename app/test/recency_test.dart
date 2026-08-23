import 'package:barbarian/core/models/recency.dart';
import 'package:barbarian/l10n/app_localizations.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

/// §49 — every screen shows its data age.
///
/// Filings were breaking it outright: a disclosure card showed the company, the
/// type and the meaning, and nothing about when it was filed. On an exchange
/// feed that is the difference between news and history.
void main() {
  late AppLocalizations en;
  late AppLocalizations ar;

  setUpAll(() async {
    en = await AppLocalizations.delegate.load(const Locale('en'));
    ar = await AppLocalizations.delegate.load(const Locale('ar'));
  });

  String isoDay(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

  group('news, which publishes a real timestamp', () {
    test('reads in minutes, then hours', () {
      final now = DateTime.now().toUtc();
      expect(
        Recency.newsAge(now.subtract(const Duration(seconds: 20)), en),
        'just now',
      );
      expect(
        Recency.newsAge(now.subtract(const Duration(minutes: 12)), en),
        '12m ago',
      );
      expect(
        Recency.newsAge(now.subtract(const Duration(hours: 5)), en),
        '5h ago',
      );
    });

    test('a clock ahead of ours never prints a negative age', () {
      // The device clock and the outlet's are not the same clock, and "-3m ago"
      // is the kind of thing that ships.
      final ahead = DateTime.now().toUtc().add(const Duration(minutes: 5));
      expect(Recency.newsAge(ahead, en), 'just now');
    });

    test('null in, null out — a missing timestamp is not an age', () {
      expect(Recency.newsAge(null, en), isNull);
    });
  });

  group('filings, which publish a day and no time', () {
    test("today's filing says Today, and never invents an hour", () {
      // The trap this pins: `DateTime.parse('2026-08-21')` yields *local*
      // midnight, so converting it to UTC walks it back by the offset. Egypt
      // is UTC+3, which made every filing lodged today announce itself as
      // "Yesterday" to every Egyptian reader.
      final label = Recency.filingAge(isoDay(DateTime.now()), en);
      expect(label, 'Today');
      expect(label, isNot(contains('ago')));
      expect(label, isNot(contains('h')));
    });

    test('yesterday is the previous calendar day', () {
      final y = DateTime.now().subtract(const Duration(days: 1));
      expect(Recency.filingAge(isoDay(y), en), 'Yesterday');
    });

    test('older than a week becomes a date, not a growing day count', () {
      final old = DateTime.now().subtract(const Duration(days: 30));
      final label = Recency.filingAge(isoDay(old), en);
      expect(label, isNotNull);
      expect(label, isNot(contains('ago')));
    });

    test('an unparseable or empty date yields nothing rather than a guess', () {
      expect(Recency.filingAge('', en), isNull);
      expect(Recency.filingAge(null, en), isNull);
      expect(Recency.filingAge('not a date', en), isNull);
    });
  });

  test('Arabic is translated, not passed through in English', () {
    final now = DateTime.now().toUtc();
    expect(
      Recency.newsAge(now.subtract(const Duration(hours: 3)), ar),
      isNot(contains('ago')),
    );
    expect(Recency.filingAge(isoDay(DateTime.now()), ar), 'اليوم');
    expect(
      Recency.filingAge(
        isoDay(DateTime.now().subtract(const Duration(days: 1))),
        ar,
      ),
      'أمس',
    );
  });
}
