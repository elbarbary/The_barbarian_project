// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'company.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CompanyDirectory _$CompanyDirectoryFromJson(Map<String, dynamic> json) =>
    _CompanyDirectory(
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
      companies:
          (json['companies'] as List<dynamic>?)
              ?.map((e) => CompanySummary.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <CompanySummary>[],
    );

Map<String, dynamic> _$CompanyDirectoryToJson(_CompanyDirectory instance) =>
    <String, dynamic>{
      'updated_at': instance.updatedAt?.toIso8601String(),
      'companies': instance.companies,
    };

_CompanySummary _$CompanySummaryFromJson(Map<String, dynamic> json) =>
    _CompanySummary(
      ticker: json['ticker'] as String,
      nameEn: json['name_en'] as String,
      nameAr: json['name_ar'] as String?,
      sector: json['sector'] as String?,
      exchange: json['exchange'] as String? ?? 'EGX',
      hasCashOrTrash: json['has_cash_or_trash'] as bool? ?? false,
      hasResearch: json['has_research'] as bool? ?? false,
      marketCap: (json['market_cap'] as num?)?.toDouble(),
      avgVolume30d: (json['avg_volume_30d'] as num?)?.toDouble(),
      pe: (json['pe'] as num?)?.toDouble(),
      pePeriod: json['pe_period'] as String?,
      eps: (json['eps'] as num?)?.toDouble(),
      epsPeriod: json['eps_period'] as String?,
      netIncome: (json['net_income'] as num?)?.toDouble(),
      netIncomePeriod: json['net_income_period'] as String?,
      medianVolume20d: (json['median_volume_20d'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$CompanySummaryToJson(_CompanySummary instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'name_en': instance.nameEn,
      'name_ar': instance.nameAr,
      'sector': instance.sector,
      'exchange': instance.exchange,
      'has_cash_or_trash': instance.hasCashOrTrash,
      'has_research': instance.hasResearch,
      'market_cap': instance.marketCap,
      'avg_volume_30d': instance.avgVolume30d,
      'pe': instance.pe,
      'pe_period': instance.pePeriod,
      'eps': instance.eps,
      'eps_period': instance.epsPeriod,
      'net_income': instance.netIncome,
      'net_income_period': instance.netIncomePeriod,
      'median_volume_20d': instance.medianVolume20d,
    };

_CompanyDebt _$CompanyDebtFromJson(Map<String, dynamic> json) => _CompanyDebt(
  period: json['period'] as String? ?? '',
  asOf: json['as_of'] as String?,
  filingId: json['filing_id'] as String?,
  source: json['source'] as String?,
  frame: json['frame'] as String? ?? 'operating',
  borrowings: (json['borrowings'] as num?)?.toDouble() ?? 0,
  shortTerm: (json['short_term'] as num?)?.toDouble(),
  longTerm: (json['long_term'] as num?)?.toDouble(),
  cash: (json['cash'] as num?)?.toDouble(),
  netDebt: (json['net_debt'] as num?)?.toDouble(),
  financeCost: (json['finance_cost'] as num?)?.toDouble(),
  dueWithinYear: (json['due_within_year'] as num?)?.toDouble(),
  cover: (json['cover'] as num?)?.toDouble(),
  gearing: (json['gearing'] as num?)?.toDouble(),
  pattern: json['pattern'] as String?,
  change: json['change'] == null
      ? null
      : DebtChange.fromJson(json['change'] as Map<String, dynamic>),
  read: json['read'] == null
      ? null
      : CompanyDebtRead.fromJson(json['read'] as Map<String, dynamic>),
);

Map<String, dynamic> _$CompanyDebtToJson(_CompanyDebt instance) =>
    <String, dynamic>{
      'period': instance.period,
      'as_of': instance.asOf,
      'filing_id': instance.filingId,
      'source': instance.source,
      'frame': instance.frame,
      'borrowings': instance.borrowings,
      'short_term': instance.shortTerm,
      'long_term': instance.longTerm,
      'cash': instance.cash,
      'net_debt': instance.netDebt,
      'finance_cost': instance.financeCost,
      'due_within_year': instance.dueWithinYear,
      'cover': instance.cover,
      'gearing': instance.gearing,
      'pattern': instance.pattern,
      'change': instance.change,
      'read': instance.read,
    };

_DebtChange _$DebtChangeFromJson(Map<String, dynamic> json) => _DebtChange(
  period: json['period'] as String? ?? '',
  borrowings: (json['borrowings'] as num?)?.toDouble() ?? 0,
  delta: (json['delta'] as num?)?.toDouble() ?? 0,
  direction: json['direction'] as String? ?? '',
);

Map<String, dynamic> _$DebtChangeToJson(_DebtChange instance) =>
    <String, dynamic>{
      'period': instance.period,
      'borrowings': instance.borrowings,
      'delta': instance.delta,
      'direction': instance.direction,
    };

_CompanyDebtRead _$CompanyDebtReadFromJson(Map<String, dynamic> json) =>
    _CompanyDebtRead(
      read: json['read'] as String? ?? '',
      readAr: json['read_ar'] as String? ?? '',
    );

Map<String, dynamic> _$CompanyDebtReadToJson(_CompanyDebtRead instance) =>
    <String, dynamic>{'read': instance.read, 'read_ar': instance.readAr};

_Company _$CompanyFromJson(Map<String, dynamic> json) => _Company(
  ticker: json['ticker'] as String,
  name: LocalizedName.fromJson(json['name'] as Map<String, dynamic>),
  sector: json['sector'] as String?,
  market: json['market'] == null
      ? null
      : CompanyMarket.fromJson(json['market'] as Map<String, dynamic>),
  profile: json['profile'] as Map<String, dynamic>?,
  priceHistory:
      (json['price_history'] as List<dynamic>?)
          ?.map((e) => PricePoint.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <PricePoint>[],
  financials: json['financials'] == null
      ? const CompanyFinancials()
      : CompanyFinancials.fromJson(json['financials'] as Map<String, dynamic>),
  research:
      (json['research'] as List<dynamic>?)
          ?.map((e) => ResearchLink.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <ResearchLink>[],
  debt: json['debt'] == null
      ? null
      : CompanyDebt.fromJson(json['debt'] as Map<String, dynamic>),
);

Map<String, dynamic> _$CompanyToJson(_Company instance) => <String, dynamic>{
  'ticker': instance.ticker,
  'name': instance.name,
  'sector': instance.sector,
  'market': instance.market,
  'profile': instance.profile,
  'price_history': instance.priceHistory,
  'financials': instance.financials,
  'research': instance.research,
  'debt': instance.debt,
};

_LocalizedName _$LocalizedNameFromJson(Map<String, dynamic> json) =>
    _LocalizedName(en: json['en'] as String, ar: json['ar'] as String?);

Map<String, dynamic> _$LocalizedNameToJson(_LocalizedName instance) =>
    <String, dynamic>{'en': instance.en, 'ar': instance.ar};

_CompanyMarket _$CompanyMarketFromJson(Map<String, dynamic> json) =>
    _CompanyMarket(
      lastClose: (json['last_close'] as num?)?.toDouble(),
      date: json['date'] as String?,
      open: (json['open'] as num?)?.toDouble(),
      high: (json['high'] as num?)?.toDouble(),
      low: (json['low'] as num?)?.toDouble(),
      volume: json['volume'] as num?,
    );

Map<String, dynamic> _$CompanyMarketToJson(_CompanyMarket instance) =>
    <String, dynamic>{
      'last_close': instance.lastClose,
      'date': instance.date,
      'open': instance.open,
      'high': instance.high,
      'low': instance.low,
      'volume': instance.volume,
    };

_PricePoint _$PricePointFromJson(Map<String, dynamic> json) => _PricePoint(
  date: json['date'] as String,
  close: (json['close'] as num).toDouble(),
  open: (json['open'] as num?)?.toDouble(),
  high: (json['high'] as num?)?.toDouble(),
  low: (json['low'] as num?)?.toDouble(),
  volume: (json['volume'] as num?)?.toInt(),
);

Map<String, dynamic> _$PricePointToJson(_PricePoint instance) =>
    <String, dynamic>{
      'date': instance.date,
      'close': instance.close,
      'open': instance.open,
      'high': instance.high,
      'low': instance.low,
      'volume': instance.volume,
    };

_CompanyFinancials _$CompanyFinancialsFromJson(Map<String, dynamic> json) =>
    _CompanyFinancials(
      annual:
          (json['annual'] as List<dynamic>?)
              ?.map((e) => FinancialPeriod.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <FinancialPeriod>[],
      quarterly:
          (json['quarterly'] as List<dynamic>?)
              ?.map((e) => FinancialPeriod.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <FinancialPeriod>[],
    );

Map<String, dynamic> _$CompanyFinancialsToJson(_CompanyFinancials instance) =>
    <String, dynamic>{
      'annual': instance.annual,
      'quarterly': instance.quarterly,
    };

_FinancialPeriod _$FinancialPeriodFromJson(Map<String, dynamic> json) =>
    _FinancialPeriod(
      period: json['period'] as String,
      revenue: (json['revenue'] as num?)?.toDouble(),
      grossProfit: (json['gross_profit'] as num?)?.toDouble(),
      operatingIncome: (json['operating_income'] as num?)?.toDouble(),
      netIncome: (json['net_income'] as num?)?.toDouble(),
      assets: (json['assets'] as num?)?.toDouble(),
      liabilities: (json['liabilities'] as num?)?.toDouble(),
      equity: (json['equity'] as num?)?.toDouble(),
      cash: (json['cash'] as num?)?.toDouble(),
      debt: (json['debt'] as num?)?.toDouble(),
      shortTermDebt: (json['short_term_debt'] as num?)?.toDouble(),
      longTermDebt: (json['long_term_debt'] as num?)?.toDouble(),
      financeCost: (json['finance_cost'] as num?)?.toDouble(),
      operatingCashFlow: (json['operating_cash_flow'] as num?)?.toDouble(),
      investingCashFlow: (json['investing_cash_flow'] as num?)?.toDouble(),
      financingCashFlow: (json['financing_cash_flow'] as num?)?.toDouble(),
      netChangeInCash: (json['net_change_in_cash'] as num?)?.toDouble(),
      dividendsPaid: (json['dividends_paid'] as num?)?.toDouble(),
      capex: (json['capex'] as num?)?.toDouble(),
      freeCashFlow: (json['free_cash_flow'] as num?)?.toDouble(),
      basis: json['basis'] as String?,
      source: json['source'] as String?,
      filedOn: json['filed_on'] as String?,
    );

Map<String, dynamic> _$FinancialPeriodToJson(_FinancialPeriod instance) =>
    <String, dynamic>{
      'period': instance.period,
      'revenue': instance.revenue,
      'gross_profit': instance.grossProfit,
      'operating_income': instance.operatingIncome,
      'net_income': instance.netIncome,
      'assets': instance.assets,
      'liabilities': instance.liabilities,
      'equity': instance.equity,
      'cash': instance.cash,
      'debt': instance.debt,
      'short_term_debt': instance.shortTermDebt,
      'long_term_debt': instance.longTermDebt,
      'finance_cost': instance.financeCost,
      'operating_cash_flow': instance.operatingCashFlow,
      'investing_cash_flow': instance.investingCashFlow,
      'financing_cash_flow': instance.financingCashFlow,
      'net_change_in_cash': instance.netChangeInCash,
      'dividends_paid': instance.dividendsPaid,
      'capex': instance.capex,
      'free_cash_flow': instance.freeCashFlow,
      'basis': instance.basis,
      'source': instance.source,
      'filed_on': instance.filedOn,
    };

_ResearchLink _$ResearchLinkFromJson(Map<String, dynamic> json) =>
    _ResearchLink(
      kind: json['kind'] as String,
      title: json['title'] as String,
      kicker: json['kicker'] as String?,
      url: json['url'] as String?,
      publishedAt: json['published_at'] as String?,
      readMinutes: (json['read_minutes'] as num?)?.toInt(),
    );

Map<String, dynamic> _$ResearchLinkToJson(_ResearchLink instance) =>
    <String, dynamic>{
      'kind': instance.kind,
      'title': instance.title,
      'kicker': instance.kicker,
      'url': instance.url,
      'published_at': instance.publishedAt,
      'read_minutes': instance.readMinutes,
    };
