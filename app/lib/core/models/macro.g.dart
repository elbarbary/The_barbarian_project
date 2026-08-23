// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'macro.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MacroDoc _$MacroDocFromJson(Map<String, dynamic> json) => _MacroDoc(
  updatedAt: json['updated_at'] as String?,
  series:
      (json['series'] as List<dynamic>?)
          ?.map((e) => MacroSeries.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <MacroSeries>[],
  indicators:
      (json['indicators'] as List<dynamic>?)
          ?.map((e) => MacroIndicator.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <MacroIndicator>[],
  correlations:
      (json['correlations'] as List<dynamic>?)
          ?.map((e) => MacroCorrelation.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <MacroCorrelation>[],
  unavailable:
      (json['unavailable'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const <String>[],
);

Map<String, dynamic> _$MacroDocToJson(_MacroDoc instance) => <String, dynamic>{
  'updated_at': instance.updatedAt,
  'series': instance.series,
  'indicators': instance.indicators,
  'correlations': instance.correlations,
  'unavailable': instance.unavailable,
};

_MacroSeries _$MacroSeriesFromJson(Map<String, dynamic> json) => _MacroSeries(
  id: json['id'] as String,
  label: json['label'] as String? ?? '',
  labelAr: json['label_ar'] as String? ?? '',
  meaning: json['meaning'] as String? ?? '',
  meaningAr: json['meaning_ar'] as String? ?? '',
  chain: json['chain'] as String? ?? '',
  chainAr: json['chain_ar'] as String? ?? '',
  yardstick: json['yardstick'] as String? ?? '',
  yardstickAr: json['yardstick_ar'] as String? ?? '',
  cadence: json['cadence'] as String? ?? '',
  cadenceAr: json['cadence_ar'] as String? ?? '',
  insight: json['insight'] as String?,
  unit: json['unit'] as String? ?? '',
  asOf: json['as_of'] as String? ?? '',
  latest: (json['latest'] as num?)?.toDouble() ?? 0,
  previous: (json['previous'] as num?)?.toDouble(),
  history:
      (json['history'] as List<dynamic>?)
          ?.map((e) => MacroPoint.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <MacroPoint>[],
  coverage:
      (json['coverage'] as List<dynamic>?)
          ?.map((e) => MacroCoverage.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <MacroCoverage>[],
  source: json['source'] as String? ?? '',
);

Map<String, dynamic> _$MacroSeriesToJson(_MacroSeries instance) =>
    <String, dynamic>{
      'id': instance.id,
      'label': instance.label,
      'label_ar': instance.labelAr,
      'meaning': instance.meaning,
      'meaning_ar': instance.meaningAr,
      'chain': instance.chain,
      'chain_ar': instance.chainAr,
      'yardstick': instance.yardstick,
      'yardstick_ar': instance.yardstickAr,
      'cadence': instance.cadence,
      'cadence_ar': instance.cadenceAr,
      'insight': instance.insight,
      'unit': instance.unit,
      'as_of': instance.asOf,
      'latest': instance.latest,
      'previous': instance.previous,
      'history': instance.history,
      'coverage': instance.coverage,
      'source': instance.source,
    };

_MacroPoint _$MacroPointFromJson(Map<String, dynamic> json) => _MacroPoint(
  date: json['date'] as String,
  value: (json['value'] as num).toDouble(),
);

Map<String, dynamic> _$MacroPointToJson(_MacroPoint instance) =>
    <String, dynamic>{'date': instance.date, 'value': instance.value};

_MacroIndicator _$MacroIndicatorFromJson(Map<String, dynamic> json) =>
    _MacroIndicator(
      id: json['id'] as String,
      label: json['label'] as String? ?? '',
      labelAr: json['label_ar'] as String? ?? '',
      meaning: json['meaning'] as String? ?? '',
      meaningAr: json['meaning_ar'] as String? ?? '',
      chain: json['chain'] as String? ?? '',
      chainAr: json['chain_ar'] as String? ?? '',
      year: json['year'] as String? ?? '',
      value: (json['value'] as num?)?.toDouble() ?? 0,
      source: json['source'] as String? ?? '',
    );

Map<String, dynamic> _$MacroIndicatorToJson(_MacroIndicator instance) =>
    <String, dynamic>{
      'id': instance.id,
      'label': instance.label,
      'label_ar': instance.labelAr,
      'meaning': instance.meaning,
      'meaning_ar': instance.meaningAr,
      'chain': instance.chain,
      'chain_ar': instance.chainAr,
      'year': instance.year,
      'value': instance.value,
      'source': instance.source,
    };

_MacroCorrelation _$MacroCorrelationFromJson(Map<String, dynamic> json) =>
    _MacroCorrelation(
      id: json['id'] as String,
      against: json['against'] as String? ?? 'EGX30',
      r: (json['r'] as num?)?.toDouble() ?? 0,
      sessions: (json['sessions'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$MacroCorrelationToJson(_MacroCorrelation instance) =>
    <String, dynamic>{
      'id': instance.id,
      'against': instance.against,
      'r': instance.r,
      'sessions': instance.sessions,
    };

_MacroCoverage _$MacroCoverageFromJson(Map<String, dynamic> json) =>
    _MacroCoverage(
      title: json['title'] as String,
      domain: json['domain'] as String? ?? '',
      url: json['url'] as String? ?? '',
      date: json['date'] as String? ?? '',
    );

Map<String, dynamic> _$MacroCoverageToJson(_MacroCoverage instance) =>
    <String, dynamic>{
      'title': instance.title,
      'domain': instance.domain,
      'url': instance.url,
      'date': instance.date,
    };
