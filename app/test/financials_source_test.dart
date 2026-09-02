import 'package:flutter_test/flutter_test.dart';
import 'package:barbarian/core/models/company.dart';

/// A period with two sources has to name two.
///
/// 575 periods carry a balance sheet Mubasher published and a net profit the
/// exchange filed, because the exchange's own submission wins that line. The
/// footnote named one source for the whole block and took it from `source`, so
/// it printed "Mubasher" over a figure Mubasher never reported.
void main() {
  FinancialPeriod parse(Map<String, dynamic> extra) =>
      FinancialPeriod.fromJson(<String, dynamic>{
        'period': 'FY 2024',
        'net_income': 3254.945,
        'assets': 91234.5,
        'source': 'https://english.mubasher.info/markets/EGX/stocks/PHDC/x',
        ...extra,
      });

  test('the profit source is read off the document', () {
    final period = parse(<String, dynamic>{
      'net_income_source': 'https://www.egx.com.eg',
    });
    expect(period.netIncomeSource, 'https://www.egx.com.eg');
    expect(period.source, contains('mubasher'));
  });

  test('a row from one source carries no second one', () {
    expect(parse(const <String, dynamic>{}).netIncomeSource, isNull);
  });

  test('the field survives a round trip', () {
    final period = parse(<String, dynamic>{
      'net_income_source': 'https://www.egx.com.eg',
    });
    expect(
      FinancialPeriod.fromJson(period.toJson()).netIncomeSource,
      'https://www.egx.com.eg',
    );
  });
}
