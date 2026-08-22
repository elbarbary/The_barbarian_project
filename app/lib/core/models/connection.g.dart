// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'connection.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ConnectionDoc _$ConnectionDocFromJson(Map<String, dynamic> json) =>
    _ConnectionDoc(
      windowDays: (json['window_days'] as num?)?.toInt() ?? 4,
      threshold: (json['threshold'] as num?)?.toDouble() ?? 2.0,
      items:
          (json['items'] as List<dynamic>?)
              ?.map((e) => Connection.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <Connection>[],
    );

Map<String, dynamic> _$ConnectionDocToJson(_ConnectionDoc instance) =>
    <String, dynamic>{
      'window_days': instance.windowDays,
      'threshold': instance.threshold,
      'items': instance.items,
    };

_Connection _$ConnectionFromJson(Map<String, dynamic> json) => _Connection(
  ticker: json['ticker'] as String? ?? '',
  kinds:
      (json['kinds'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const <String>[],
  why: json['why'] as String? ?? '',
  whyAr: json['why_ar'] as String? ?? '',
  ratio: (json['ratio'] as num?)?.toDouble(),
  strands:
      (json['strands'] as List<dynamic>?)
          ?.map((e) => Strand.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <Strand>[],
);

Map<String, dynamic> _$ConnectionToJson(_Connection instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'kinds': instance.kinds,
      'why': instance.why,
      'why_ar': instance.whyAr,
      'ratio': instance.ratio,
      'strands': instance.strands,
    };

_Strand _$StrandFromJson(Map<String, dynamic> json) => _Strand(
  kind: json['kind'] as String? ?? '',
  id: json['id'] as String? ?? '',
  date: json['date'] as String? ?? '',
  title: json['title'] as String? ?? '',
  titleAr: json['title_ar'] as String? ?? '',
  link: json['link'] as String? ?? '',
  ratio: (json['ratio'] as num?)?.toDouble(),
  changePercent: (json['change_percent'] as num?)?.toDouble(),
);

Map<String, dynamic> _$StrandToJson(_Strand instance) => <String, dynamic>{
  'kind': instance.kind,
  'id': instance.id,
  'date': instance.date,
  'title': instance.title,
  'title_ar': instance.titleAr,
  'link': instance.link,
  'ratio': instance.ratio,
  'change_percent': instance.changePercent,
};
