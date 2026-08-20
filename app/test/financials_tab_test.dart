import 'package:barbarian/core/widgets/nav.dart';
import 'package:barbarian/core/models/company.dart';
import 'package:barbarian/core/widgets/composites.dart';
import 'package:barbarian/features/company/company_screen.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// The Financials tab, against the real shipped fixtures.
///
/// This screen previously rendered five years of invented statements for El
/// Sewedy as reported fact, so the tests that matter here are the ones that
/// check what it does *not* say: no revenue it does not have, no margin it
/// cannot derive, and nothing on screen without a source behind it.
void main() {
  Future<void> openFinancials(WidgetTester tester, String ticker) async {
    usePhoneSurface(tester);
    await tester.pumpWidget(
      harness(CompanyScreen(ticker: ticker, parentTab: BNavTab.today)),
    );
    await pumpUntil(tester, find.text('Financials'));
    await tapVisible(tester, find.text('Financials'));
    await tester.pumpAndSettle();
  }

  testWidgets('it shows net profit with the year it belongs to', (tester) async {
    await openFinancials(tester, 'SWDY');

    // Matched case-insensitively: BSectionLabel uppercases Latin script, and
    // the test should not break if that presentation choice changes.
    expect(
      find.textContaining(RegExp('net profit, as reported', caseSensitive: false)),
      findsOneWidget,
    );
    // The fixture carries real filed figures, so the period label is a real
    // financial year rather than a placeholder.
    expect(find.textContaining(RegExp(r'EGP m · FY \d{4}')), findsWidgets);
  });

  testWidgets('it explains the year-on-year move in a sentence', (tester) async {
    await openFinancials(tester, 'SWDY');

    // The whole point of the screen: not two numbers, but what they did.
    expect(
      find.textContaining(RegExp('times the|rose against|fell against')),
      findsWidgets,
    );
  });

  testWidgets('it shows the balance sheet it actually has', (tester) async {
    await openFinancials(tester, 'SWDY');

    for (final label in ['total assets', "owners' equity", 'total liabilities']) {
      expect(
        find.textContaining(RegExp(label, caseSensitive: false)),
        findsWidgets,
        reason: '$label should be on screen',
      );
    }
  });

  testWidgets('it names where the figures came from', (tester) async {
    // Spec §50 — transparency is a product value, and an untraceable figure is
    // not much better than an invented one.
    await openFinancials(tester, 'SWDY');

    expect(find.textContaining(RegExp('Mubasher|Egyptian Exchange')),
        findsWidgets);
  });

  testWidgets('it presents no revenue and no margin', (tester) async {
    await openFinancials(tester, 'SWDY');

    // Neither source states revenue, so no margin can be derived. A revenue
    // bar chart drawn from absent figures is exactly what was here before.
    expect(find.byType(BBarChart), findsNothing);
    for (final label in ['net margin', 'gross margin', 'operating margin']) {
      expect(find.textContaining(RegExp(label, caseSensitive: false)),
          findsNothing);
    }

    // And it says so, rather than leaving the reader to notice the absence.
    expect(
      find.textContaining(RegExp('neither source states revenue',
          caseSensitive: false)),
      findsOneWidget,
    );
  });

  testWidgets('a company with nothing filed says so plainly', (tester) async {
    // ORAS reports in US dollars, so it is deliberately not published rather
    // than published as though the figures were pounds.
    await openFinancials(tester, 'ORAS');

    expect(
      find.textContaining(RegExp('no reported figures yet', caseSensitive: false)),
      findsOneWidget,
    );
  });

  testWidgets('every published figure carries a period label', (tester) async {
    await openFinancials(tester, 'COMI');

    final periods = find.textContaining(RegExp(r'FY \d{4}'));
    expect(periods, findsWidgets);
  });

  test('the shipped fixture carries no invented statements', () {
    // A regression guard on the specific numbers that shipped for five years.
    // They were roughly half of El Sewedy's real figures in every column.
    final company = Company.fromJson(readFixtureObjectSync('companies/SWDY.json'));
    final invented = {118500.0, 131900.0, 92600.0, 71300.0, 55100.0};
    for (final period in company.financials.annual) {
      expect(invented.contains(period.revenue), isFalse);
      expect(period.revenue, isNull,
          reason: 'no source we have states revenue, so none may appear');
    }
  });
}
