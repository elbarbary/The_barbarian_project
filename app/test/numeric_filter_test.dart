import 'package:barbarian/core/models/company.dart';
import 'package:barbarian/core/models/market_snapshot.dart';
import 'package:barbarian/features/market/numeric_filter.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// Narrowing 280 companies by a number.
///
/// The directory's only ways in were the alphabet, a sector and three fixed
/// sorts — so "worth more than a billion" or "under ten times earnings" were
/// questions the app held every figure for and could not answer.
void main() {
  CompanySummary company(
    String ticker, {
    double? cap,
    double? pe,
    double? avgVolume,
  }) => CompanySummary(
    ticker: ticker,
    nameEn: ticker,
    marketCap: cap,
    pe: pe,
    avgVolume30d: avgVolume,
  );

  StockQuote quote({double close = 10, double? change, int? volume}) =>
      StockQuote(close: close, changePercent: change, volume: volume);

  group('one condition', () {
    test('above and below are strict, and read the right field', () {
      final big = company('BIG', cap: 2_000_000_000);
      final small = company('SML', cap: 500_000_000);

      const over = NumericFilter(
        field: FilterField.marketCap,
        operator: FilterOperator.above,
        low: 1_000_000_000,
      );
      expect(over.matches(big, null), isTrue);
      expect(over.matches(small, null), isFalse);

      const under = NumericFilter(
        field: FilterField.marketCap,
        operator: FilterOperator.below,
        low: 1_000_000_000,
      );
      expect(under.matches(small, null), isTrue);
      expect(under.matches(big, null), isFalse);
    });

    test('between includes its bounds and does not care about their order', () {
      const asked = NumericFilter(
        field: FilterField.pe,
        operator: FilterOperator.between,
        low: 5,
        high: 15,
      );
      const backwards = NumericFilter(
        field: FilterField.pe,
        operator: FilterOperator.between,
        low: 15,
        high: 5,
      );

      for (final filter in [asked, backwards]) {
        expect(filter.matches(company('A', pe: 5), null), isTrue);
        expect(filter.matches(company('B', pe: 15), null), isTrue);
        expect(filter.matches(company('C', pe: 10), null), isTrue);
        expect(filter.matches(company('D', pe: 4.9), null), isFalse);
      }
    });

    test('a company with no figure is not a company with a figure of zero', () {
      // 121 of 280 companies have no P/E — a loss, nothing filed, or the two
      // routes to the ratio disagreeing. "Under 10" must not sweep all of them
      // in, and "over 10" must not read them as zero either.
      final unknown = company('NONE');
      for (final op in FilterOperator.values) {
        final filter = NumericFilter(
          field: FilterField.pe,
          operator: op,
          low: 10,
          high: 20,
        );
        expect(
          filter.matches(unknown, null),
          isFalse,
          reason: '$op matched a company with no P/E',
        );
      }
    });
  });

  group('live fields', () {
    test('price, change and volume come from the quote, not the directory', () {
      final row = company('X', cap: 1);
      const over = NumericFilter(
        field: FilterField.volume,
        operator: FilterOperator.above,
        low: 1000,
      );
      expect(over.matches(row, quote(volume: 5000)), isTrue);
      expect(over.matches(row, quote(volume: 10)), isFalse);
      // No quote yet is the same as no figure.
      expect(over.matches(row, null), isFalse);
    });

    test('a negative change is compared as a number, not as a magnitude', () {
      const falling = NumericFilter(
        field: FilterField.changePercent,
        operator: FilterOperator.below,
        low: 0,
      );
      expect(falling.matches(company('D'), quote(change: -2.5)), isTrue);
      expect(falling.matches(company('U'), quote(change: 2.5)), isFalse);
    });
  });

  group('several conditions', () {
    test('every filter has to pass, not any of them', () {
      // Two conditions a reader set are two things they meant; an OR would
      // widen the list each time they tried to narrow it.
      final rows = [
        company('AA', cap: 5_000_000_000, pe: 8),
        company('BB', cap: 5_000_000_000, pe: 40),
        company('CC', cap: 100_000_000, pe: 8),
      ];
      final filters = [
        const NumericFilter(
          field: FilterField.marketCap,
          operator: FilterOperator.above,
          low: 1_000_000_000,
        ),
        const NumericFilter(
          field: FilterField.pe,
          operator: FilterOperator.below,
          low: 10,
        ),
      ];

      final kept = applyFilters(rows, filters, (_) => null);
      expect(kept.map((c) => c.ticker), ['AA']);
    });

    test('no filters is every company, not none', () {
      final rows = [company('A'), company('B')];
      expect(applyFilters(rows, const [], (_) => null), hasLength(2));
    });
  });

  group('the published directory', () {
    test('the fields the filters need are actually there', () {
      final directory = CompanyDirectory.fromJson(
        readFixtureObjectSync('companies.json'),
      );
      final withCap = directory.companies.where((c) => c.marketCap != null);
      final withPe = directory.companies.where((c) => c.pe != null);

      expect(directory.companies.length, greaterThan(200));
      expect(withCap.length, greaterThan(100));
      expect(withPe.length, greaterThan(100));

      // Every published P/E survived the guards in build_market_api.py: no
      // losses, nothing past the ceiling, nothing under the floor.
      for (final company in withPe) {
        expect(company.pe, greaterThanOrEqualTo(1.0));
        expect(company.pe, lessThanOrEqualTo(200));
        expect(
          company.pePeriod,
          isNotNull,
          reason: '${company.ticker} has a P/E with no period behind it',
        );
      }
    });
  });
}
