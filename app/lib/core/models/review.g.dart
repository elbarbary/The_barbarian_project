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
    );

Map<String, dynamic> _$CompanyReviewToJson(_CompanyReview instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'generated': instance.generated,
      'sector': instance.sector,
      'metrics': instance.metrics,
      'pattern': instance.pattern,
    };

_ReviewMetric _$ReviewMetricFromJson(Map<String, dynamic> json) =>
    _ReviewMetric(
      key: json['key'] as String? ?? '',
      value: (json['value'] as num?)?.toDouble() ?? 0,
      unit: json['unit'] as String? ?? 'ratio',
      direction: json['direction'] as String? ?? 'unknown',
      points: (json['points'] as num?)?.toInt() ?? 0,
      series:
          (json['series'] as List<dynamic>?)
              ?.map((e) => (e as num).toDouble())
              .toList() ??
          const <double>[],
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
      'peer': instance.peer,
      'peer_median': instance.peerMedian,
    };

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
