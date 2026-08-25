// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'review.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CompanyReview _$CompanyReviewFromJson(Map<String, dynamic> json) =>
    _CompanyReview(
      ticker: json['ticker'] as String? ?? '',
      generated: json['generated'] as String?,
      sector: json['sector'] as String?,
      metrics:
          (json['metrics'] as List<dynamic>?)
              ?.map((e) => ReviewMetric.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ReviewMetric>[],
      pattern: json['pattern'] == null
          ? null
          : ReviewPattern.fromJson(json['pattern'] as Map<String, dynamic>),
      read: json['read'] as String? ?? '',
      readAr: json['read_ar'] as String? ?? '',
    );

Map<String, dynamic> _$CompanyReviewToJson(_CompanyReview instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'generated': instance.generated,
      'sector': instance.sector,
      'metrics': instance.metrics,
      'pattern': instance.pattern,
      'read': instance.read,
      'read_ar': instance.readAr,
    };

_ReviewMetric _$ReviewMetricFromJson(Map<String, dynamic> json) =>
    _ReviewMetric(
      key: json['key'] as String? ?? '',
      value: (json['value'] as num?)?.toDouble() ?? 0,
      unit: json['unit'] as String? ?? 'ratio',
      direction: json['direction'] as String? ?? 'unknown',
      points: (json['points'] as num?)?.toInt() ?? 0,
      series: json['series'] == null
          ? const <ReviewPoint>[]
          : reviewPointsFromJson(json['series'] as List?),
      cause: json['cause'] as String?,
      peer: json['peer'] as String?,
      peerMedian: (json['peer_median'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$ReviewMetricToJson(_ReviewMetric instance) =>
    <String, dynamic>{
      'key': instance.key,
      'value': instance.value,
      'unit': instance.unit,
      'direction': instance.direction,
      'points': instance.points,
      'series': instance.series,
      'cause': instance.cause,
      'peer': instance.peer,
      'peer_median': instance.peerMedian,
    };

_ReviewPoint _$ReviewPointFromJson(Map<String, dynamic> json) => _ReviewPoint(
  period: json['p'] as String? ?? '',
  value: (json['v'] as num?)?.toDouble() ?? 0,
);

Map<String, dynamic> _$ReviewPointToJson(_ReviewPoint instance) =>
    <String, dynamic>{'p': instance.period, 'v': instance.value};

_ReviewPattern _$ReviewPatternFromJson(Map<String, dynamic> json) =>
    _ReviewPattern(
      readable: (json['readable'] as num?)?.toInt() ?? 0,
      improving:
          (json['improving'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const <String>[],
      deteriorating:
          (json['deteriorating'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const <String>[],
    );

Map<String, dynamic> _$ReviewPatternToJson(_ReviewPattern instance) =>
    <String, dynamic>{
      'readable': instance.readable,
      'improving': instance.improving,
      'deteriorating': instance.deteriorating,
    };
