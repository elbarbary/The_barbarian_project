// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'signals.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CompanySignals _$CompanySignalsFromJson(Map<String, dynamic> json) =>
    _CompanySignals(
      ticker: json['ticker'] as String? ?? '',
      generated: json['generated'] as String?,
      streaks:
          (json['streaks'] as List<dynamic>?)
              ?.map((e) => StreakBreak.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <StreakBreak>[],
      firsts:
          (json['firsts'] as List<dynamic>?)
              ?.map((e) => FirstOfType.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <FirstOfType>[],
      quiet: json['quiet'] == null
          ? null
          : QuietSpell.fromJson(json['quiet'] as Map<String, dynamic>),
      resultsDue:
          (json['results_due'] as List<dynamic>?)
              ?.map((e) => ResultsDue.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ResultsDue>[],
      profile: json['profile'] == null
          ? null
          : SignalProfile.fromJson(json['profile'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$CompanySignalsToJson(_CompanySignals instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'generated': instance.generated,
      'streaks': instance.streaks,
      'firsts': instance.firsts,
      'quiet': instance.quiet,
      'results_due': instance.resultsDue,
      'profile': instance.profile,
    };

_StreakBreak _$StreakBreakFromJson(Map<String, dynamic> json) => _StreakBreak(
  kind: json['kind'] as String? ?? '',
  period: json['period'] as String? ?? '',
  periodEnd: json['period_end'] as String? ?? '',
  value: (json['value'] as num?)?.toDouble() ?? 0,
  run: (json['run'] as num?)?.toInt() ?? 0,
  since: json['since'] as String? ?? '',
  filed: json['filed'] as String? ?? '',
  id: json['id'] as String? ?? '',
  link: json['link'] as String? ?? '',
);

Map<String, dynamic> _$StreakBreakToJson(_StreakBreak instance) =>
    <String, dynamic>{
      'kind': instance.kind,
      'period': instance.period,
      'period_end': instance.periodEnd,
      'value': instance.value,
      'run': instance.run,
      'since': instance.since,
      'filed': instance.filed,
      'id': instance.id,
      'link': instance.link,
    };

_FirstOfType _$FirstOfTypeFromJson(Map<String, dynamic> json) => _FirstOfType(
  type: json['type'] as String? ?? '',
  label: json['label'] as String? ?? '',
  date: json['date'] as String? ?? '',
  previous: json['previous'] as String? ?? '',
  gapDays: (json['gap_days'] as num?)?.toInt() ?? 0,
  title: json['title'] as String? ?? '',
  titleAr: json['title_ar'] as String? ?? '',
  id: json['id'] as String? ?? '',
  link: json['link'] as String? ?? '',
);

Map<String, dynamic> _$FirstOfTypeToJson(_FirstOfType instance) =>
    <String, dynamic>{
      'type': instance.type,
      'label': instance.label,
      'date': instance.date,
      'previous': instance.previous,
      'gap_days': instance.gapDays,
      'title': instance.title,
      'title_ar': instance.titleAr,
      'id': instance.id,
      'link': instance.link,
    };

_QuietSpell _$QuietSpellFromJson(Map<String, dynamic> json) => _QuietSpell(
  lastFiled: json['last_filed'] as String? ?? '',
  silentDays: (json['silent_days'] as num?)?.toInt() ?? 0,
  typicalGap: (json['typical_gap'] as num?)?.toInt() ?? 0,
  filings: (json['filings'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$QuietSpellToJson(_QuietSpell instance) =>
    <String, dynamic>{
      'last_filed': instance.lastFiled,
      'silent_days': instance.silentDays,
      'typical_gap': instance.typicalGap,
      'filings': instance.filings,
    };

_ResultsDue _$ResultsDueFromJson(Map<String, dynamic> json) => _ResultsDue(
  label: json['label'] as String? ?? '',
  periodEnd: json['period_end'] as String? ?? '',
  expected: json['expected'] as String? ?? '',
  windowStart: json['window_start'] as String? ?? '',
  windowEnd: json['window_end'] as String? ?? '',
  observations: (json['observations'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$ResultsDueToJson(_ResultsDue instance) =>
    <String, dynamic>{
      'label': instance.label,
      'period_end': instance.periodEnd,
      'expected': instance.expected,
      'window_start': instance.windowStart,
      'window_end': instance.windowEnd,
      'observations': instance.observations,
    };

_SignalProfile _$SignalProfileFromJson(Map<String, dynamic> json) =>
    _SignalProfile(
      filings: (json['filings'] as num?)?.toInt() ?? 0,
      firstFiling: json['first_filing'] as String?,
      lastFiling: json['last_filing'] as String?,
      busiestYear: json['busiest_year'] as String?,
      busiestYearFilings: (json['busiest_year_filings'] as num?)?.toInt() ?? 0,
      periodsReported: (json['periods_reported'] as num?)?.toInt() ?? 0,
      lossMakingPeriods: (json['loss_making_periods'] as num?)?.toInt() ?? 0,
      profitablePeriods: (json['profitable_periods'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$SignalProfileToJson(_SignalProfile instance) =>
    <String, dynamic>{
      'filings': instance.filings,
      'first_filing': instance.firstFiling,
      'last_filing': instance.lastFiling,
      'busiest_year': instance.busiestYear,
      'busiest_year_filings': instance.busiestYearFilings,
      'periods_reported': instance.periodsReported,
      'loss_making_periods': instance.lossMakingPeriods,
      'profitable_periods': instance.profitablePeriods,
    };

_SignalsIndex _$SignalsIndexFromJson(Map<String, dynamic> json) =>
    _SignalsIndex(
      generated: json['generated'] as String?,
      firsts:
          (json['firsts'] as List<dynamic>?)
              ?.map((e) => MarketSignal.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <MarketSignal>[],
      quiet:
          (json['quiet'] as List<dynamic>?)
              ?.map((e) => MarketQuiet.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <MarketQuiet>[],
      companies: (json['companies'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$SignalsIndexToJson(_SignalsIndex instance) =>
    <String, dynamic>{
      'generated': instance.generated,
      'firsts': instance.firsts,
      'quiet': instance.quiet,
      'companies': instance.companies,
    };

_MarketSignal _$MarketSignalFromJson(Map<String, dynamic> json) =>
    _MarketSignal(
      ticker: json['ticker'] as String? ?? '',
      name: json['name'] as String? ?? '',
      nameAr: json['name_ar'] as String? ?? '',
      kind: json['kind'] as String? ?? '',
      period: json['period'] as String? ?? '',
      periodEnd: json['period_end'] as String? ?? '',
      value: (json['value'] as num?)?.toDouble() ?? 0,
      run: (json['run'] as num?)?.toInt() ?? 0,
      since: json['since'] as String? ?? '',
      label: json['label'] as String? ?? '',
      date: json['date'] as String? ?? '',
      gapDays: (json['gap_days'] as num?)?.toInt() ?? 0,
      link: json['link'] as String? ?? '',
    );

Map<String, dynamic> _$MarketSignalToJson(_MarketSignal instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'name': instance.name,
      'name_ar': instance.nameAr,
      'kind': instance.kind,
      'period': instance.period,
      'period_end': instance.periodEnd,
      'value': instance.value,
      'run': instance.run,
      'since': instance.since,
      'label': instance.label,
      'date': instance.date,
      'gap_days': instance.gapDays,
      'link': instance.link,
    };

_MarketQuiet _$MarketQuietFromJson(Map<String, dynamic> json) => _MarketQuiet(
  ticker: json['ticker'] as String? ?? '',
  name: json['name'] as String? ?? '',
  nameAr: json['name_ar'] as String? ?? '',
  lastFiled: json['last_filed'] as String? ?? '',
  silentDays: (json['silent_days'] as num?)?.toInt() ?? 0,
  typicalGap: (json['typical_gap'] as num?)?.toInt() ?? 0,
  filings: (json['filings'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$MarketQuietToJson(_MarketQuiet instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'name': instance.name,
      'name_ar': instance.nameAr,
      'last_filed': instance.lastFiled,
      'silent_days': instance.silentDays,
      'typical_gap': instance.typicalGap,
      'filings': instance.filings,
    };
