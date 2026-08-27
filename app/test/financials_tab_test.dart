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
/// check both sides of the boundary: no revenue it does not have, real lines
/// from a verified attachment where it does, and nothing without a source.
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

  testWidgets('it shows net profit with the year it belongs to', (
    tester,
  ) async {
    await openFinancials(tester, 'SWDY');

    // Matched case-insensitively: BSectionLabel uppercases Latin script, and
    // the test should not break if that presentation choice changes.
    expect(
      find.textContaining(
        RegExp('net profit, as reported', caseSensitive: false),
      ),
      findsOneWidget,
    );
    // The fixture carries real filed figures, so the period label is a real
    // financial year rather than a placeholder — and the unit beside it is
    // whatever this company's own figure makes it, not a fixed "m" the number
    // then contradicts.
    expect(
      find.textContaining(RegExp(r'(billion|million|thousand) EGP · FY \d{4}')),
      findsWidgets,
    );
  });

  testWidgets('it explains the year-on-year move in a sentence', (
    tester,
  ) async {
    await openFinancials(tester, 'SWDY');

    // The whole point of the screen: not two numbers, but what they did.
    expect(
      find.textContaining(RegExp('times the|rose against|fell against')),
      findsWidgets,
    );
  });

  testWidgets('it shows the balance sheet it actually has', (tester) async {
    await openFinancials(tester, 'SWDY');

    for (final label in [
      'total assets',
      "owners' equity",
      'total liabilities',
    ]) {
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

    expect(
      find.textContaining(RegExp('Mubasher|Egyptian Exchange')),
      findsWidgets,
    );
  });

  testWidgets('it leaves unfiled revenue absent and explains the blank', (
    tester,
  ) async {
    await openFinancials(tester, 'SWDY');

    // Neither source states revenue, so no margin can be derived. A revenue
    // bar chart drawn from absent figures is exactly what was here before.
    expect(find.byType(BBarChart), findsNothing);
    for (final label in ['net margin', 'gross margin', 'operating margin']) {
      expect(
        find.textContaining(RegExp(label, caseSensitive: false)),
        findsNothing,
      );
    }

    // And the general source note explains why any line may stay blank.
    expect(
      find.textContaining(RegExp('line stays blank', caseSensitive: false)),
      findsOneWidget,
    );
  });

  testWidgets('it shows lines verified from a recent EGX attachment', (
    tester,
  ) async {
    await openFinancials(tester, 'ABUK');

    for (final label in ['Revenue', 'Gross profit', 'Operating profit']) {
      expect(
        find.text(label),
        findsOneWidget,
        reason: '$label should be shown',
      );
    }
    final company = Company.fromJson(
      readFixtureObjectSync('companies/ABUK.json'),
    );
    final h1 = company.financials.quarterly.singleWhere(
      (period) => period.period == 'H1 2026',
    );
    expect(h1.revenue, 23525);
    expect(h1.assets, 36870);
    expect(h1.liabilities, 7410);
    expect(h1.equity, 29462);
  });

  testWidgets('a company with nothing filed says so plainly', (tester) async {
    // ORAS reports in US dollars, so it is deliberately not published rather
    // than published as though the figures were pounds.
    await openFinancials(tester, 'ORAS');

    expect(
      find.textContaining(
        RegExp('no reported figures yet', caseSensitive: false),
      ),
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
    final company = Company.fromJson(
      readFixtureObjectSync('companies/SWDY.json'),
    );
    final invented = {118500.0, 131900.0, 92600.0, 71300.0, 55100.0};
    for (final period in company.financials.annual) {
      expect(invented.contains(period.revenue), isFalse);
      expect(
        period.revenue,
        isNull,
        reason: 'SWDY has no verified revenue source, so none may appear',
      );
    }
  });

  group('what the company does with its borrowings', () {
    testWidgets('it shows the borrowings, when they fall due, and what they cost', (
      tester,
    ) async {
      await openFinancials(tester, 'KORA');

      // The heading, and the figures a holder actually asked for. Every one is
      // read off the borrowing lines of the filed statement.
      expect(find.textContaining('borrowings'), findsWidgets);
      expect(find.text('Falls due within a year'), findsOneWidget);
      expect(find.text('Cost over the period'), findsOneWidget);
    });

    testWidgets('§8 it describes the position without grading it', (
      tester,
    ) async {
      await openFinancials(tester, 'KORA');

      // The one place a model writes prose about a named company's solvency.
      // A credit opinion is exactly what this publisher is not licensed to
      // give, so none of these may reach the screen.
      for (final verdict in [
        'risky',
        'safe',
        'healthy',
        'unsustainable',
        'overleveraged',
        'comfortable',
        'strong balance sheet',
      ]) {
        expect(
          find.textContaining(RegExp(verdict, caseSensitive: false)),
          findsNothing,
          reason: 'the debt block must not call the position "$verdict"',
        );
      }
    });

    test('the block is built from borrowings, never from total liabilities', () {
      final company = Company.fromJson(
        readFixtureObjectSync('companies/KORA.json'),
      );
      final debt = company.debt;
      expect(debt, isNotNull);
      final period = company.financials.quarterly.firstWhere(
        (p) => p.period == debt!.period,
      );
      // The liabilities total carries payables, provisions and advances that
      // nobody lent the company, so it must never be the borrowings figure.
      expect(debt!.borrowings, isNot(equals(period.liabilities)));
      expect(debt.borrowings, lessThan(period.liabilities!));
      // And the halves the balance sheet actually lists add up to it.
      expect(
        (debt.shortTerm ?? 0) + (debt.longTerm ?? 0),
        closeTo(debt.borrowings, 0.01),
      );
    });
  });

  group('periods order by time, not by the label string they are stored in', () {
    FinancialPeriod p(String label) => FinancialPeriod(period: label);

    test('the interim figures the exchange files outrank an older quarter', () {
      // Alphabetically "H1 2026" and "Q1 2026" fall before "Q4 2024" — the very
      // ordering that hid this year's quarters behind 2024's and opened the
      // table on stale data.
      expect(p('H1 2026').chronoOrder, greaterThan(p('Q4 2024').chronoOrder));
      expect(p('Q1 2026').chronoOrder, greaterThan(p('Q4 2024').chronoOrder));
      expect(p('9M 2025').chronoOrder, greaterThan(p('Q1 2025').chronoOrder));
      expect(p('FY 2025').chronoOrder, greaterThan(p('FY 2024').chronoOrder));
    });

    test('sorting a shuffled quarter list puts the freshest first', () {
      final periods = [
        for (final l in ['Q4 2024', 'H1 2026', 'Q1 2021', '9M 2025', 'Q1 2026'])
          p(l),
      ]..sort((a, b) => b.chronoOrder.compareTo(a.chronoOrder));
      expect(periods.map((e) => e.period).toList(), [
        'H1 2026',
        'Q1 2026',
        '9M 2025',
        'Q4 2024',
        'Q1 2021',
      ]);
    });

    test('COMI opens on its freshest set — this year, under Quarterly', () {
      // The regression in the flesh: the shipped fixture combines Mubasher's
      // full statements with the exchange's net-profit-only 2026 quarters, and
      // the freshest of the two sets is the quarter filed this July.
      final company = Company.fromJson(
        readFixtureObjectSync('companies/COMI.json'),
      );
      FinancialPeriod newest(List<FinancialPeriod> ps) =>
          ps.reduce((a, b) => b.chronoOrder >= a.chronoOrder ? b : a);
      expect(newest(company.financials.quarterly).period, 'H1 2026');
      expect(
        newest(company.financials.quarterly).chronoOrder,
        greaterThan(newest(company.financials.annual).chronoOrder),
        reason: 'so the statement table must open on Quarterly, not Annual',
      );
    });
  });
}
