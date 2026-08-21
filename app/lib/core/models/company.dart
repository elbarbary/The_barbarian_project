import 'package:freezed_annotation/freezed_annotation.dart';

part 'company.freezed.dart';
part 'company.g.dart';

/// The company directory (spec §12).
///
/// The `ticker` on every entry is the app's **canonical identifier**. Whatever
/// a market-data vendor calls an instrument is mapped into this at ingestion
/// time and never leaks into the app (spec §12, §14).
@freezed
abstract class CompanyDirectory with _$CompanyDirectory {
  const factory CompanyDirectory({
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
    @Default(<CompanySummary>[]) List<CompanySummary> companies,
  }) = _CompanyDirectory;

  const CompanyDirectory._();

  factory CompanyDirectory.fromJson(Map<String, dynamic> json) =>
      _$CompanyDirectoryFromJson(json);

  static const CompanyDirectory empty = CompanyDirectory();

  int get count => companies.length;

  CompanySummary? byTicker(String ticker) {
    for (final c in companies) {
      if (c.ticker == ticker) return c;
    }
    return null;
  }

  /// Distinct sectors, alphabetical, ignoring entries with no sector.
  List<String> get sectors {
    final set = <String>{};
    for (final c in companies) {
      final s = c.sector;
      if (s != null && s.isNotEmpty) set.add(s);
    }
    final list = set.toList()..sort();
    return list;
  }
}

@freezed
abstract class CompanySummary with _$CompanySummary {
  const factory CompanySummary({
    required String ticker,
    @JsonKey(name: 'name_en') required String nameEn,
    @JsonKey(name: 'name_ar') String? nameAr,
    String? sector,
    @Default('EGX') String exchange,
    @JsonKey(name: 'has_cash_or_trash') @Default(false) bool hasCashOrTrash,
    @JsonKey(name: 'has_research') @Default(false) bool hasResearch,
  }) = _CompanySummary;

  const CompanySummary._();

  factory CompanySummary.fromJson(Map<String, dynamic> json) =>
      _$CompanySummaryFromJson(json);

  /// Search runs against the cached directory on every keystroke, so this must
  /// stay allocation-cheap — no regexes, no intermediate lists (spec §35).
  bool matches(String lowercaseQuery) {
    if (lowercaseQuery.isEmpty) return true;
    if (ticker.toLowerCase().contains(lowercaseQuery)) return true;
    if (nameEn.toLowerCase().contains(lowercaseQuery)) return true;
    final ar = nameAr;
    if (ar != null && ar.contains(lowercaseQuery)) return true;
    final s = sector;
    if (s != null && s.toLowerCase().contains(lowercaseQuery)) return true;
    return false;
  }

  /// Ticker matches rank above name matches so typing "COMI" surfaces COMI first.
  int relevance(String lowercaseQuery) {
    final t = ticker.toLowerCase();
    if (t == lowercaseQuery) return 0;
    if (t.startsWith(lowercaseQuery)) return 1;
    if (t.contains(lowercaseQuery)) return 2;
    if (nameEn.toLowerCase().startsWith(lowercaseQuery)) return 3;
    if (nameEn.toLowerCase().contains(lowercaseQuery)) return 4;
    return 5;
  }
}

/// The per-company document (spec §19).
@freezed
abstract class Company with _$Company {
  const factory Company({
    required String ticker,
    required LocalizedName name,
    String? sector,
    CompanyMarket? market,
    /// Whatever the ingestion source knew about the company beyond price —
    /// market cap, shares outstanding, free float. Deliberately loose: the
    /// fields available differ by provider and a missing one must simply not
    /// render (spec §49).
    Map<String, dynamic>? profile,
    @JsonKey(name: 'price_history')
    @Default(<PricePoint>[])
    List<PricePoint> priceHistory,
    @Default(CompanyFinancials()) CompanyFinancials financials,
    @Default(<ResearchLink>[]) List<ResearchLink> research,
  }) = _Company;

  const Company._();

  factory Company.fromJson(Map<String, dynamic> json) =>
      _$CompanyFromJson(json);

  bool get hasPriceHistory => priceHistory.length > 1;
}

@freezed
abstract class LocalizedName with _$LocalizedName {
  const factory LocalizedName({required String en, String? ar}) =
      _LocalizedName;

  const LocalizedName._();

  factory LocalizedName.fromJson(Map<String, dynamic> json) =>
      _$LocalizedNameFromJson(json);
}

@freezed
abstract class CompanyMarket with _$CompanyMarket {
  const factory CompanyMarket({
    @JsonKey(name: 'last_close') double? lastClose,
    String? date,
    double? open,
    double? high,
    double? low,
    num? volume,
  }) = _CompanyMarket;

  const CompanyMarket._();

  factory CompanyMarket.fromJson(Map<String, dynamic> json) =>
      _$CompanyMarketFromJson(json);
}

/// One end-of-day bar.
@freezed
abstract class PricePoint with _$PricePoint {
  const factory PricePoint({
    required String date,
    required double close,
    double? open,
    double? high,
    double? low,
    int? volume,
  }) = _PricePoint;

  const PricePoint._();

  factory PricePoint.fromJson(Map<String, dynamic> json) =>
      _$PricePointFromJson(json);

  DateTime? get parsedDate => DateTime.tryParse(date);
}

@freezed
abstract class CompanyFinancials with _$CompanyFinancials {
  const factory CompanyFinancials({
    @Default(<FinancialPeriod>[]) List<FinancialPeriod> annual,
    @Default(<FinancialPeriod>[]) List<FinancialPeriod> quarterly,
  }) = _CompanyFinancials;

  const CompanyFinancials._();

  factory CompanyFinancials.fromJson(Map<String, dynamic> json) =>
      _$CompanyFinancialsFromJson(json);

  bool get isEmpty => annual.isEmpty && quarterly.isEmpty;
}

/// A reported period. Every figure is nullable because a filing that omits a
/// line is normal and must render as "—", never as zero (spec §49).
@freezed
abstract class FinancialPeriod with _$FinancialPeriod {
  const factory FinancialPeriod({
    /// Display label, e.g. "FY25" or "Q2 FY25".
    required String period,
    double? revenue,
    @JsonKey(name: 'gross_profit') double? grossProfit,
    @JsonKey(name: 'operating_income') double? operatingIncome,
    @JsonKey(name: 'net_income') double? netIncome,
    double? assets,
    double? liabilities,
    double? equity,
    double? cash,
    double? debt,
    @JsonKey(name: 'operating_cash_flow') double? operatingCashFlow,

    /// The rest of the cash flow statement, and what was paid out of it.
    ///
    /// Published by the same source as the line above and read from the same
    /// filing; five of Mubasher's ten financial rows were being collected and
    /// these are four of the five that were not. Together with operating cash
    /// flow they are the whole statement, which is why the collector can check
    /// that the three add to the change in cash instead of taking it on trust.
    @JsonKey(name: 'investing_cash_flow') double? investingCashFlow,
    @JsonKey(name: 'financing_cash_flow') double? financingCashFlow,
    @JsonKey(name: 'net_change_in_cash') double? netChangeInCash,
    @JsonKey(name: 'dividends_paid') double? dividendsPaid,
    double? capex,
    @JsonKey(name: 'free_cash_flow') double? freeCashFlow,

    /// `consolidated` or `standalone`. Companies file both for the same
    /// period and the two differ, so a figure shown without its basis is
    /// ambiguous rather than merely unlabelled.
    String? basis,

    /// The filing this figure was read from (spec §50). A reported number the
    /// reader cannot trace back is not worth much more than one we invented —
    /// which is exactly what was here before.
    String? source,
    @JsonKey(name: 'filed_on') String? filedOn,
  }) = _FinancialPeriod;

  const FinancialPeriod._();

  factory FinancialPeriod.fromJson(Map<String, dynamic> json) =>
      _$FinancialPeriodFromJson(json);

  double? get grossMargin => _ratio(grossProfit, revenue);
  double? get operatingMargin => _ratio(operatingIncome, revenue);
  double? get netMargin => _ratio(netIncome, revenue);

  /// Free cash flow is derived only when it was not reported directly.
  double? get resolvedFreeCashFlow {
    if (freeCashFlow != null) return freeCashFlow;
    final cfo = operatingCashFlow;
    final cx = capex;
    if (cfo == null || cx == null) return null;
    return cfo - cx.abs();
  }

  double? get netDebt {
    final d = debt;
    final c = cash;
    if (d == null || c == null) return null;
    return d - c;
  }

  static double? _ratio(double? numerator, double? denominator) {
    if (numerator == null || denominator == null || denominator == 0) {
      return null;
    }
    return numerator / denominator;
  }
}

/// A pointer from a company to a published study (spec §19, §50).
@freezed
abstract class ResearchLink with _$ResearchLink {
  const factory ResearchLink({
    required String kind,
    required String title,
    String? kicker,
    String? url,
    @JsonKey(name: 'published_at') String? publishedAt,
    @JsonKey(name: 'read_minutes') int? readMinutes,
  }) = _ResearchLink;

  const ResearchLink._();

  factory ResearchLink.fromJson(Map<String, dynamic> json) =>
      _$ResearchLinkFromJson(json);
}
