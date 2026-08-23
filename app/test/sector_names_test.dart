import 'dart:convert';
import 'dart:io';

import 'package:barbarian/core/models/sector.dart';
import 'package:barbarian/l10n/app_localizations_ar.dart';
import 'package:barbarian/l10n/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

/// The sector a company is filed under, in the reader's language.
///
/// These arrive from the scan as English category codes and were printed raw,
/// so an Arabic reader met a row of chips reading "Commercial Services",
/// "Non-Energy Minerals" and "Consumer Non-Durables" above a directory
/// otherwise entirely in Arabic — and the same English word again on every
/// company page under the heading "القطاع".
void main() {
  final en = AppLocalizationsEn();
  final ar = AppLocalizationsAr();

  test('every sector in the published directory has a name in both', () {
    final directory =
        jsonDecode(File('assets/fixtures/companies.json').readAsStringSync())
            as Map<String, dynamic>;
    final published = {
      for (final c
          in (directory['companies'] as List).cast<Map<String, dynamic>>())
        if (c['sector'] case final String s) s,
    };

    expect(published, isNotEmpty);
    expect(
      published.difference(knownSectors),
      isEmpty,
      reason:
          'a sector arrived from the scan that nobody has written the Arabic '
          'for — add it to sector.dart and to both ARB files',
    );

    for (final sector in published) {
      expect(sectorLabel(sector, en), isNotEmpty);
      final arabic = sectorLabel(sector, ar);
      expect(
        arabic,
        isNot(matches(RegExp(r'[A-Za-z]'))),
        reason: '$sector still reads in Latin on an Arabic screen',
      );
    }
  });

  // A sector this app has no word for is better shown as filed than guessed
  // at, and the test above is what tells us one has appeared.
  test('an unknown sector is passed through untouched', () {
    expect(sectorLabel('Space Freight', ar), 'Space Freight');
  });
}
