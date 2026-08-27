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

/// Every Arabic name in a directory folded to one spelling, keyed by ticker.
///
/// Built once per directory rather than per keystroke. It lives out here
/// rather than on [CompanyDirectory] or [CompanySummary] because both are
/// freezed classes with const constructors, which cannot hold a computed
/// field; `foldedArabicNamesProvider` holds the result.
Map<String, String> foldArabicNames(Iterable<CompanySummary> companies) => {
  for (final c in companies)
    if (c.nameAr case final String name) c.ticker: arabicFold(name),
};

/// Arabic folded to one spelling, so a search can find a name however it was
/// typed.
///
/// The directory's Arabic names come from two sources that do not agree with
/// each other, and Egyptian readers do not type hamza or ta marbuta
/// consistently in the first place. An exact substring test made most of the
/// directory unreachable in Arabic: "المصريه" returned one company where this
/// returns twenty-two, "القاهره" returned none where this returns nine, and
/// "الاسكندرية" silently missed ALEX, AFMC and AMES because the source spells
/// them "الإسكندرية". 217 of the 266 Arabic names carry at least one of the
/// characters below.
///
/// This cannot be cleaned upstream — the two sources will keep disagreeing —
/// so both sides of the comparison are folded instead.
String arabicFold(String text) {
  final out = StringBuffer();
  for (final rune in text.runes) {
    final folded = switch (rune) {
      // أ إ آ ٱ -> ا
      0x0623 || 0x0625 || 0x0622 || 0x0671 => 0x0627,
      // ة -> ه
      0x0629 => 0x0647,
      // ى -> ي, ئ -> ي
      0x0649 || 0x0626 => 0x064A,
      // ؤ -> و
      0x0624 => 0x0648,
      // Harakat and tatweel carry no lexical weight in a name.
      >= 0x064B && <= 0x0652 => null,
      0x0640 || 0x0670 => null,
      _ => rune,
    };
    if (folded != null) out.writeCharCode(folded);
  }
  return out.toString();
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

    /// Numbers the directory can narrow itself by without opening 282 files.
    ///
    /// Slow-moving ones only. Price, change and volume are not here because
    /// they move through the session and the screen already watches the live
    /// snapshot, which is fresher than this document will ever be.
    @JsonKey(name: 'market_cap') double? marketCap,
    @JsonKey(name: 'avg_volume_30d') double? avgVolume30d,

    /// The last traded price over the company's own filed annual earnings.
    ///
    /// Absent for more than a third of the exchange, and every absence is
    /// deliberate — a loss, no filed figure, or two independent routes to the
    /// ratio disagreeing. See `price_earnings` in build_market_api.py.
    double? pe,

    /// The financial year the earnings in [pe] were filed for. A newest annual
    /// filing can be eighteen months old, and "P/E 8" against 2023 earnings is
    /// a different claim from the same number against 2025.
    @JsonKey(name: 'pe_period') String? pePeriod,

    /// What the company earned per share, in pounds, over [epsPeriod].
    ///
    /// **Losses are here.** Minus two pounds a share is a fact about a year and
    /// reads as one; it is only a ratio like [pe] that a negative breaks, where
    /// the minus sign silently becomes "cheapest on the exchange".
    double? eps,
    @JsonKey(name: 'eps_period') String? epsPeriod,

    /// The company's own filed annual profit, in the millions of pounds it was
    /// filed in, over [netIncomePeriod].
    @JsonKey(name: 'net_income') double? netIncome,
    @JsonKey(name: 'net_income_period') String? netIncomePeriod,

    /// Shares traded on a normal day — the twenty-day median.
    ///
    /// Carried so the list can answer "busier than usual" for itself: today's
    /// volume comes from the live snapshot, and this is what it is unusual
    /// against.
    @JsonKey(name: 'median_volume_20d') double? medianVolume20d,
  }) = _CompanySummary;

  const CompanySummary._();

  factory CompanySummary.fromJson(Map<String, dynamic> json) =>
      _$CompanySummaryFromJson(json);

  /// Whether this company answers to [query].
  ///
  /// Search runs against the cached directory on every keystroke, so this must
  /// stay allocation-cheap — no regexes, no intermediate lists (spec §35).
  ///
  /// [query] must be lowercased and folded, and [foldedNameAr] must be this
  /// company's Arabic name folded the same way; both come from the caller,
  /// which does each of them once rather than 280 times. See [arabicFold].
  bool matches(String query, {String? foldedNameAr}) {
    if (query.isEmpty) return true;
    if (ticker.toLowerCase().contains(query)) return true;
    if (nameEn.toLowerCase().contains(query)) return true;
    if (foldedNameAr != null && foldedNameAr.contains(query)) return true;
    final s = sector;
    if (s != null && s.toLowerCase().contains(query)) return true;
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

/// The borrowing picture for the last period a company filed one.
///
/// Computed by `build_debt.py` from the borrowing lines on the issuer's own
/// filed balance sheet — never from the liabilities total, which also carries
/// payables, provisions and customer advances that nobody lent the company.
///
/// `read` is a vetted sentence written at build time; it is refused if it
/// advises, quotes a figure, or grades the position, because this app is not
/// licensed to issue a credit opinion (§8).
@freezed
abstract class CompanyDebt with _$CompanyDebt {
  const factory CompanyDebt({
    @Default('') String period,
    @JsonKey(name: 'as_of') String? asOf,
    @JsonKey(name: 'filing_id') String? filingId,
    String? source,

    /// `finance` for a bank or lender, where borrowing funds the book it lends
    /// out of, and `operating` for everybody else, where it has to be repaid
    /// out of what the business earns. The same figures, a different question.
    @Default('operating') String frame,
    @Default(0) double borrowings,
    @JsonKey(name: 'short_term') double? shortTerm,
    @JsonKey(name: 'long_term') double? longTerm,
    double? cash,
    @JsonKey(name: 'net_debt') double? netDebt,
    @JsonKey(name: 'finance_cost') double? financeCost,

    /// Share of borrowings falling due inside a year, 0-1.
    @JsonKey(name: 'due_within_year') double? dueWithinYear,

    /// Operating profit divided by what the borrowings cost for the same
    /// period, and borrowings divided by equity.
    double? cover,
    double? gearing,
    String? pattern,
    DebtChange? change,
    CompanyDebtRead? read,
  }) = _CompanyDebt;

  const CompanyDebt._();

  factory CompanyDebt.fromJson(Map<String, dynamic> json) =>
      _$CompanyDebtFromJson(json);
}

@freezed
abstract class DebtChange with _$DebtChange {
  const factory DebtChange({
    @Default('') String period,
    @Default(0) double borrowings,
    @Default(0) double delta,
    @Default('') String direction,
  }) = _DebtChange;

  factory DebtChange.fromJson(Map<String, dynamic> json) =>
      _$DebtChangeFromJson(json);
}

@freezed
abstract class CompanyDebtRead with _$CompanyDebtRead {
  const factory CompanyDebtRead({
    @Default('') String read,
    @JsonKey(name: 'read_ar') @Default('') String readAr,
  }) = _CompanyDebtRead;

  factory CompanyDebtRead.fromJson(Map<String, dynamic> json) =>
      _$CompanyDebtReadFromJson(json);
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

    /// What the company is doing with its borrowings, when it has any it
    /// filed. Absent for a company that reported none, which is an answer
    /// rather than a gap.
    CompanyDebt? debt,
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

    /// Borrowings by when they fall due, and what carrying them cost.
    ///
    /// `debt` is the total, and on its own it does not answer the question a
    /// reader actually has. Money owed inside a year has to be found or rolled
    /// inside a year; money owed beyond one does not. `financeCost` is the
    /// period's own charge, which is what turns a balance into a burden — or
    /// shows that it isn't one.
    ///
    /// All three are read from the issuer's filed statement, where the
    /// borrowing lines are listed separately and summed; none is derived from
    /// the liabilities total, which is a different and much larger thing.
    @JsonKey(name: 'short_term_debt') double? shortTermDebt,
    @JsonKey(name: 'long_term_debt') double? longTermDebt,
    @JsonKey(name: 'finance_cost') double? financeCost,
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

  /// A time-ordered sort key parsed from the label, because the stored lists
  /// are sorted by label *string*. Alphabetically "H1 2026" and "Q1 2026" fall
  /// before "Q4 2024" — 'H' and 'Q1' sort under 'Q4' — so the newest quarters,
  /// which are exactly the interim figures the exchange files months before the
  /// audited year, hid behind older columns and the table opened on stale data.
  /// The key is year × 100 + the month the period ends (Q1→3, H1/Q2→6,
  /// 9M/Q3→9, FY/Q4→12), so a plain numeric sort is chronological.
  int get chronoOrder {
    final year = RegExp(r'(\d{4})').firstMatch(period);
    final y = year == null ? 0 : int.parse(year.group(1)!);
    final label = period.toUpperCase().trimLeft();
    final int endMonth;
    if (label.startsWith('FY')) {
      endMonth = 12;
    } else if (label.startsWith('9M')) {
      endMonth = 9;
    } else if (label.startsWith('H1')) {
      endMonth = 6;
    } else if (label.startsWith('Q')) {
      endMonth = (int.tryParse(label.substring(1, 2)) ?? 0) * 3;
    } else {
      endMonth = 0;
    }
    return y * 100 + endMonth;
  }

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
