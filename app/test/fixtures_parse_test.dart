import 'dart:convert';
import 'dart:io';

import 'package:barbarian/core/models/cash_or_trash.dart';
import 'package:barbarian/core/models/company.dart';
import 'package:barbarian/core/models/manifest.dart';
import 'package:barbarian/core/models/market_snapshot.dart';
import 'package:barbarian/core/models/opportunity.dart';
import 'package:flutter_test/flutter_test.dart';

/// Spec §52: the shipped fixtures must parse into the shipped models.
///
/// These read the files from disk rather than the asset bundle so a failure
/// points at the fixture generator, not at Flutter's asset plumbing.
Map<String, dynamic> _read(String path) {
  final file = File('assets/fixtures/$path');
  expect(file.existsSync(), isTrue, reason: 'missing fixture: $path');
  return jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
}

void main() {
  group('manifest', () {
    test('parses and is a schema this build understands', () {
      final manifest = Manifest.fromJson(_read('manifest.json'));

      expect(manifest.schemaVersion, Manifest.supportedSchemaVersion);
      expect(manifest.isSupported, isTrue);
      expect(manifest.marketDate, isNotEmpty);
      expect(DateTime.tryParse(manifest.marketDate), isNotNull);
    });

    test('exposes a version for every declared resource', () {
      final manifest = Manifest.fromJson(_read('manifest.json'));

      for (final resource in ManifestVersions.resources) {
        expect(
          manifest.versions.versionOf(resource),
          greaterThan(0),
          reason: '$resource has no version counter',
        );
      }
    });

    test('an unknown resource resolves to 0 rather than throwing', () {
      final manifest = Manifest.fromJson(_read('manifest.json'));
      expect(manifest.versions.versionOf('not_a_resource'), 0);
    });
  });

  group('company directory', () {
    test('parses and every entry has a canonical ticker', () {
      final directory = CompanyDirectory.fromJson(_read('companies.json'));

      expect(directory.companies, isNotEmpty);
      for (final c in directory.companies) {
        expect(c.ticker, matches(RegExp(r'^[A-Z]{3,6}$')));
        expect(c.nameEn, isNotEmpty);
        expect(c.exchange, 'EGX');
      }
    });

    test('tickers are unique', () {
      final directory = CompanyDirectory.fromJson(_read('companies.json'));
      final tickers = directory.companies.map((c) => c.ticker).toList();

      expect(tickers.toSet().length, tickers.length);
    });

    test('search ranks an exact ticker above a name match', () {
      final directory = CompanyDirectory.fromJson(_read('companies.json'));
      final comi = directory.byTicker('COMI')!;

      expect(comi.matches('comi'), isTrue);
      expect(comi.relevance('comi'), 0);
      expect(comi.relevance('bank'), greaterThan(comi.relevance('comi')));
    });

    test('Arabic names are present where they are known', () {
      final directory = CompanyDirectory.fromJson(_read('companies.json'));

      // The exchange scan carries English names only, so most companies have
      // no Arabic name. A machine translation of a legal name would be worse
      // than none, so the field stays null and the UI omits the line.
      for (final ticker in ['COMI', 'SWDY', 'ETEL', 'MCQE']) {
        expect(
          directory.byTicker(ticker)?.nameAr,
          isNotNull,
          reason: '$ticker should carry its Arabic legal name',
        );
      }
      expect(
        directory.companies.where((c) => (c.nameAr ?? '').isNotEmpty),
        isNotEmpty,
      );
    });
  });

  group('market snapshot', () {
    test('parses and carries a session date', () {
      final snapshot = MarketSnapshot.fromJson(_read('market.json'));

      expect(snapshot.stocks, isNotEmpty);
      expect(snapshot.sessionDate, isNotNull);
    });

    test('every quote agrees with its own previous close', () {
      final snapshot = MarketSnapshot.fromJson(_read('market.json'));

      var checked = 0;
      snapshot.stocks.forEach((ticker, quote) {
        expect(quote.close, greaterThan(0), reason: '$ticker close');
        // Not every listing has two sessions of history in the scan, and a
        // quote with no previous close correctly has no change rather than a
        // fabricated one.
        final prev = quote.previousClose;
        if (prev == null) {
          expect(quote.change, isNull, reason: '$ticker invented a change');
          return;
        }
        checked++;
        expect(
          quote.resolvedChange,
          closeTo(quote.close - prev, 0.011),
          reason: '$ticker change disagrees with its closes',
        );
      });
      expect(checked, greaterThan(100));
    });

    test('direction helpers are mutually exclusive', () {
      final snapshot = MarketSnapshot.fromJson(_read('market.json'));

      for (final quote in snapshot.stocks.values) {
        final flags = [quote.isUp, quote.isDown, quote.isFlat];
        expect(flags.where((f) => f).length, 1);
      }
    });

    test('covers every company in the directory', () {
      final directory = CompanyDirectory.fromJson(_read('companies.json'));
      final snapshot = MarketSnapshot.fromJson(_read('market.json'));

      for (final c in directory.companies) {
        expect(
          snapshot.quoteFor(c.ticker),
          isNotNull,
          reason: 'no quote for ${c.ticker}',
        );
      }
    });
  });

  group('cash or trash', () {
    // The count is not pinned: the series publishes a new investigation every
    // few days, and hardcoding "seven" turned each one into a failing build.
    // What must hold is that the document agrees with itself.
    test('parses every published investigation', () {
      final index = CashOrTrashIndex.fromJson(_read('cash-or-trash/index.json'));

      expect(index.companies, isNotEmpty);
      expect(index.total, 224);
      expect(index.studiedCount, index.companies.length);
      for (final c in index.companies) {
        expect(c.ticker, matches(RegExp(r'^[A-Z]{3,6}$')));
        expect(c.pillars, hasLength(6));
      }
    });

    test('scores are signed and inside the six-pillar range', () {
      final index = CashOrTrashIndex.fromJson(_read('cash-or-trash/index.json'));

      expect(
        index.companies.any((c) => c.score < 0),
        isTrue,
        reason: 'the scale must be signed, not 0-100',
      );
      for (final c in index.companies) {
        expect(c.score, inInclusiveRange(
          CashOrTrashEntry.minScore,
          CashOrTrashEntry.maxScore,
        ));
      }
    });

    test('pillars sum to the headline score', () {
      final index = CashOrTrashIndex.fromJson(_read('cash-or-trash/index.json'));

      for (final c in index.companies) {
        if (c.pillars.isEmpty) continue;
        expect(c.pillars, hasLength(6), reason: '${c.ticker} pillar count');
        final total = c.pillars.fold(0, (sum, p) => sum + p.score);
        expect(total, c.score, reason: '${c.ticker} pillars vs headline');
      }
    });

    test('the gauge puts a zero score at the centre', () {
      const neutral = CashOrTrashEntry(ticker: 'TEST', name: 'Test');

      expect(neutral.gaugeFraction, closeTo(0.5, 0.0001));
    });

    test('gauge fraction is clamped and ordered', () {
      final index = CashOrTrashIndex.fromJson(_read('cash-or-trash/index.json'));
      final kwin = index.byTicker('KWIN')!;
      final mcqe = index.byTicker('MCQE')!;

      expect(kwin.score, -50);
      expect(mcqe.score, 20);
      expect(mcqe.gaugeFraction, greaterThan(kwin.gaugeFraction));
      for (final c in index.companies) {
        expect(c.gaugeFraction, inInclusiveRange(0.0, 1.0));
      }
    });

    test('every verdict carries a word and a mark, not just a colour', () {
      for (final verdict in Verdict.values) {
        expect(verdict.label, isNotEmpty);
        expect(verdict.mark, isNotEmpty);
        expect(Verdict.parse(verdict.id), verdict);
      }
      expect(Verdict.parse('nonsense'), Verdict.recyclable);
    });

    test('present verdicts come back in Cash-to-Toxic order', () {
      final index = CashOrTrashIndex.fromJson(_read('cash-or-trash/index.json'));
      final present = index.presentVerdicts;

      final indices = present.map(Verdict.values.indexOf).toList();
      final sorted = [...indices]..sort();
      expect(indices, sorted);
      expect(present, contains(Verdict.cash));
      expect(present, contains(Verdict.toxic));
    });
  });

  group('opportunity scanner', () {
    test('parses the real published report', () {
      final report = OpportunityReport.fromJson(
        _read('opportunities/latest.json'),
      );

      expect(report.watching, isNotEmpty);
      expect(
        report.outcomes,
        isNotEmpty,
        reason: 'the outcome record is the point of the series',
      );
      expect(report.reportDate, isNotNull);
    });

    test('carries the report own status wording, not just the bucket', () {
      final report = OpportunityReport.fromJson(
        _read('opportunities/latest.json'),
      );

      expect(
        report.watching.every((c) => (c.statusLabel ?? '').isNotEmpty),
        isTrue,
      );
      expect(
        report.watching.map((c) => c.statusLabel),
        contains('Persistent watch'),
      );
    });

    test('the outcome record keeps losses, not only wins', () {
      final report = OpportunityReport.fromJson(
        _read('opportunities/latest.json'),
      );

      expect(report.outcomes.any((o) => o.isUp), isTrue);
      expect(
        report.outcomes.any((o) => !o.isUp),
        isTrue,
        reason: 'a scanner that publishes only its wins is marketing',
      );
    });

    test('no forward-looking trade mechanics survive extraction', () {
      final report = OpportunityReport.fromJson(
        _read('opportunities/latest.json'),
      );
      final prose = [
        ...report.watching.map((c) => c.researchSummary ?? ''),
        ...report.outcomes.map((o) => o.note ?? ''),
      ].join(' ').toLowerCase();

      // Spec §8. "no holding period" is allowed: it records the absence of a
      // trade rather than instructing one.
      for (final banned in [
        'hard stop',
        'exit below',
        'buyer price',
        'review session',
      ]) {
        expect(prose, isNot(contains(banned)), reason: banned);
      }
    });

    test('counts are derived from the lists, not the summary block', () {
      final report = OpportunityReport.fromJson(
        _read('opportunities/latest.json'),
      );

      expect(report.qualifiedCount, report.qualified.length);
      expect(report.watchingCount, report.watching.length);
      expect(report.rejectedCount, report.rejected.length);
    });

    test('status strings resolve to the right bucket', () {
      final report = OpportunityReport.fromJson(
        _read('opportunities/latest.json'),
      );

      for (final c in report.qualified) {
        expect(c.scanStatus, ScanStatus.qualified);
      }
      for (final c in report.rejected) {
        expect(c.scanStatus, ScanStatus.rejected);
      }
      expect(ScanStatus.parse('nonsense'), ScanStatus.rejected);
    });

    test('a negative score never drives the gauge backwards', () {
      const negative = ScannedCompany(ticker: 'TEST', score: -8);

      expect(negative.scoreFraction, 0.0);
    });

    test('the rubric breakdown is complete and ordered', () {
      const breakdownSource = ScanScores();
      final breakdown = breakdownSource.breakdown;

      expect(breakdown, hasLength(9));
      expect(breakdown.first.label, 'Fresh disclosure');
      expect(breakdown.last.label, 'Risk penalty');
    });

    test('carries no entry, target, stop or expected-return field', () {
      // Spec §8. If any of these ever appear in the published JSON, the model
      // must not quietly start surfacing them.
      final raw = _read('opportunities/latest.json');
      final text = jsonEncode(raw).toLowerCase();

      for (final banned in [
        '"entry"',
        '"target"',
        '"stop"',
        '"stop_loss"',
        '"expected_return"',
        '"holding_period"',
      ]) {
        expect(text, isNot(contains(banned)), reason: '$banned must not exist');
      }
    });
  });

  group('cross-document consistency', () {
    test('every researched company is in the directory and flagged', () {
      final directory = CompanyDirectory.fromJson(_read('companies.json'));
      final index = CashOrTrashIndex.fromJson(_read('cash-or-trash/index.json'));

      for (final entry in index.companies) {
        final company = directory.byTicker(entry.ticker);
        expect(company, isNotNull, reason: '${entry.ticker} missing from directory');
        expect(
          company!.hasCashOrTrash,
          isTrue,
          reason: '${entry.ticker} is studied but not flagged',
        );
      }
    });

    test('every scanned ticker exists in the directory', () {
      final directory = CompanyDirectory.fromJson(_read('companies.json'));
      final report = OpportunityReport.fromJson(
        _read('opportunities/latest.json'),
      );

      for (final status in ScanStatus.values) {
        for (final c in report.forStatus(status)) {
          expect(
            directory.byTicker(c.ticker),
            isNotNull,
            reason: '${c.ticker} scanned but not in directory',
          );
        }
      }
      // Outcomes are deliberately not held to this. The record outlives the
      // listing: MKIT was compulsorily delisted on 13 August while its result
      // was still on the board, and deleting a published result because the
      // exchange stopped carrying the share is the one thing this series
      // exists not to do (spec §7). What must hold is that the row does not
      // pretend to be a link — see the screen test.
      final unlisted = report.outcomes
          .where((o) => directory.byTicker(o.ticker) == null)
          .map((o) => o.ticker);
      expect(
        unlisted.length,
        lessThan(report.outcomes.length),
        reason: 'no outcome matched the directory at all — the directory is '
            'probably empty or the tickers are formatted differently',
      );
    });

    test('the directory covers the whole exchange, not a sample', () {
      final directory = CompanyDirectory.fromJson(_read('companies.json'));

      expect(directory.count, greaterThan(250));
      expect(directory.sectors.length, greaterThan(10));
    });

    test('every company detail document parses and matches its directory row', () {
      final directory = CompanyDirectory.fromJson(_read('companies.json'));
      var withHistory = 0;

      for (final summary in directory.companies) {
        final company = Company.fromJson(
          _read('companies/${summary.ticker}.json'),
        );

        expect(company.ticker, summary.ticker);
        expect(company.name.en, summary.nameEn);
        expect(company.sector, summary.sector);
        if (company.hasPriceHistory) withHistory++;
      }

      // The scan does not fetch history for every listing. Most have it; the
      // rest render "Not enough history to draw" rather than an empty chart.
      expect(withHistory, greaterThan(directory.count ~/ 2));
    });

    test('price history is chronological with no duplicate sessions', () {
      final company = Company.fromJson(_read('companies/COMI.json'));
      final dates = company.priceHistory.map((p) => p.date).toList();

      expect(dates.toSet().length, dates.length, reason: 'duplicate sessions');
      for (var i = 1; i < company.priceHistory.length; i++) {
        final prev = company.priceHistory[i - 1].parsedDate!;
        final curr = company.priceHistory[i].parsedDate!;
        expect(curr.isAfter(prev), isTrue, reason: 'out of order at index $i');
      }
    });

    test('price history sits overwhelmingly on EGX trading days', () {
      // The EGX trades Sunday to Thursday. These are real exchange bars, so
      // the assertion is on the shape of the whole series rather than on
      // every row: a holiday-shifted session is the feed's truth, not a bug.
      final company = Company.fromJson(_read('companies/COMI.json'));
      final weekend = company.priceHistory
          .where((p) => const [DateTime.friday, DateTime.saturday]
              .contains(p.parsedDate!.weekday))
          .length;

      expect(company.priceHistory.length, greaterThan(20));
      expect(weekend / company.priceHistory.length, lessThan(0.05));
    });

    test('the last close agrees with the market snapshot', () {
      final snapshot = MarketSnapshot.fromJson(_read('market.json'));
      final directory = CompanyDirectory.fromJson(_read('companies.json'));

      for (final summary in directory.companies) {
        final company = Company.fromJson(
          _read('companies/${summary.ticker}.json'),
        );
        final quote = snapshot.quoteFor(summary.ticker)!;

        expect(
          company.market!.lastClose,
          quote.close,
          reason: '${summary.ticker} detail and snapshot disagree',
        );
        expect(company.market!.date, snapshot.date);
      }
    });
  });

  group('financials', () {
    // These once ran against a hand-entered SWDY table that turned out to be
    // invented — El Sewedy's real FY24 revenue is EGP 232bn, the table said
    // 118.5bn. Testing derivation against a fixture also meant the fixture had
    // to carry numbers for a real, named issuer just to exercise arithmetic.
    // The arithmetic is what these cover, so they construct their own period
    // and name nobody.
    test('margins derive from the reported lines', () {
      const period = FinancialPeriod(
        period: 'FY24',
        revenue: 1000,
        grossProfit: 250,
        operatingIncome: 180,
        netIncome: 120,
      );

      expect(period.grossMargin, 0.25);
      expect(period.operatingMargin, 0.18);
      expect(period.netMargin, 0.12);
    });

    test('free cash flow is derived when not reported', () {
      const period = FinancialPeriod(
        period: 'FY24',
        operatingCashFlow: 900,
        capex: -350,
      );

      expect(period.freeCashFlow, isNull);
      // Capex is subtracted by magnitude, so the sign it was filed with does
      // not flip the result.
      expect(period.resolvedFreeCashFlow, 550);
    });

    test('a reported free cash flow wins over the derived one', () {
      const period = FinancialPeriod(
        period: 'FY24',
        operatingCashFlow: 900,
        capex: -350,
        freeCashFlow: 500,
      );

      expect(period.resolvedFreeCashFlow, 500);
    });

    test('a period with no revenue yields null margins rather than zero', () {
      const empty = FinancialPeriod(period: 'FY99');

      expect(empty.grossMargin, isNull);
      expect(empty.netMargin, isNull);
      expect(empty.netDebt, isNull);
      expect(empty.resolvedFreeCashFlow, isNull);
    });
  });
}
