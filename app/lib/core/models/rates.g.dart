// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rates.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_RatesDoc _$RatesDocFromJson(Map<String, dynamic> json) => _RatesDoc(
  indices:
      (json['indices'] as List<dynamic>?)
          ?.map((e) => RateRow.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <RateRow>[],
  currencies:
      (json['currencies'] as List<dynamic>?)
          ?.map((e) => RateRow.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <RateRow>[],
  metals:
      (json['metals'] as List<dynamic>?)
          ?.map((e) => MetalRow.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <MetalRow>[],
);

Map<String, dynamic> _$RatesDocToJson(_RatesDoc instance) => <String, dynamic>{
  'indices': instance.indices,
  'currencies': instance.currencies,
  'metals': instance.metals,
};

_RateRow _$RateRowFromJson(Map<String, dynamic> json) => _RateRow(
  id: json['id'] as String? ?? '',
  code: json['code'] as String? ?? '',
  label: json['label'] as String? ?? '',
  plain: json['plain'] as String? ?? '',
  token: json['token'] as String? ?? '',
  workings: json['workings'] as String? ?? '',
  yardstick: json['yardstick'] as String? ?? '',
  source: json['source'] as String? ?? '',
  level: (json['level'] as num?)?.toDouble(),
  changePercent: (json['change_percent'] as num?)?.toDouble(),
  egp: (json['egp'] as num?)?.toDouble(),
);

Map<String, dynamic> _$RateRowToJson(_RateRow instance) => <String, dynamic>{
  'id': instance.id,
  'code': instance.code,
  'label': instance.label,
  'plain': instance.plain,
  'token': instance.token,
  'workings': instance.workings,
  'yardstick': instance.yardstick,
  'source': instance.source,
  'level': instance.level,
  'change_percent': instance.changePercent,
  'egp': instance.egp,
};

_MetalRow _$MetalRowFromJson(Map<String, dynamic> json) => _MetalRow(
  id: json['id'] as String? ?? '',
  label: json['label'] as String? ?? '',
  plain: json['plain'] as String? ?? '',
  token: json['token'] as String? ?? '',
  workings: json['workings'] as String? ?? '',
  yardstick: json['yardstick'] as String? ?? '',
  source: json['source'] as String? ?? '',
  egpGram: (json['egp_gram'] as num?)?.toDouble(),
  egpOunce: (json['egp_ounce'] as num?)?.toDouble(),
  usdOunce: (json['usd_ounce'] as num?)?.toDouble(),
  karats:
      (json['karats'] as List<dynamic>?)
          ?.map((e) => KaratRow.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <KaratRow>[],
);

Map<String, dynamic> _$MetalRowToJson(_MetalRow instance) => <String, dynamic>{
  'id': instance.id,
  'label': instance.label,
  'plain': instance.plain,
  'token': instance.token,
  'workings': instance.workings,
  'yardstick': instance.yardstick,
  'source': instance.source,
  'egp_gram': instance.egpGram,
  'egp_ounce': instance.egpOunce,
  'usd_ounce': instance.usdOunce,
  'karats': instance.karats,
};

_KaratRow _$KaratRowFromJson(Map<String, dynamic> json) => _KaratRow(
  karat: (json['karat'] as num?)?.toInt() ?? 24,
  egpGram: (json['egp_gram'] as num?)?.toDouble() ?? 0,
  workings: json['workings'] as String? ?? '',
);

Map<String, dynamic> _$KaratRowToJson(_KaratRow instance) => <String, dynamic>{
  'karat': instance.karat,
  'egp_gram': instance.egpGram,
  'workings': instance.workings,
};
