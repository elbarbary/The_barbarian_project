import 'package:barbarian/core/models/rates.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// Every published rate has to carry its Arabic.
///
/// `rates/latest.json` shipped sixteen rows and not one Arabic string — the
/// substring `_ar` did not appear anywhere in the document. So an Arabic
/// reader met "One US dollar costs 50.89 pounds", the gold card's prose, and
/// all three index rows on Home in English, on a screen where everything
/// around them was translated. The prose is composed in Python, so this
/// guards the pipeline rather than the widgets.
void main() {
  test('every rate row is written in both languages', () {
    final doc = RatesDoc.fromJson(readFixtureObjectSync('rates/latest.json'));

    final rows = <(String, String, String, String, String)>[
      for (final r in [...doc.indices, ...doc.world, ...doc.currencies])
        (
          r.id.isEmpty ? r.code : r.id,
          r.labelAr,
          r.plainAr,
          r.workingsAr,
          r.yardstickAr,
        ),
      for (final m in doc.metals)
        (m.id, m.labelAr, m.plainAr, m.workingsAr, m.yardstickAr),
    ];

    expect(rows, isNotEmpty);
    for (final (id, label, plain, workings, yardstick) in rows) {
      expect(label, isNotEmpty, reason: '$id has no Arabic label');
      expect(plain, isNotEmpty, reason: '$id has no Arabic sentence');
      expect(yardstick, isNotEmpty, reason: '$id has no Arabic yardstick');
      // Workings are a sum with numbers in them; the metals' are long enough
      // that only the currencies and indices carry an Arabic mirror today.
      expect(workings, isA<String>());

      // And the Arabic has to actually be Arabic — an English string copied
      // into an `_ar` field would satisfy "is not empty" and nothing else.
      expect(
        RegExp('[؀-ۿ]').hasMatch(plain),
        isTrue,
        reason: '$id\'s Arabic sentence is not in Arabic: $plain',
      );
    }
  });
}
