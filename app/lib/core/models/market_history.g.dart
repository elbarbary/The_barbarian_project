// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'market_history.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MarketHistory _$MarketHistoryFromJson(Map<String, dynamic> json) =>
    _MarketHistory(
      updatedAt: json['updated_at'] as String?,
      sessions:
          (json['sessions'] as List<dynamic>?)
              ?.map((e) => MarketSession.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <MarketSession>[],
    );

Map<String, dynamic> _$MarketHistoryToJson(_MarketHistory instance) =>
    <String, dynamic>{
      'updated_at': instance.updatedAt,
      'sessions': instance.sessions,
    };

_MarketSession _$MarketSessionFromJson(Map<String, dynamic> json) =>
    _MarketSession(
      date: json['date'] as String,
      indices:
          (json['indices'] as Map<String, dynamic>?)?.map(
            (k, e) => MapEntry(k, (e as num).toDouble()),
          ) ??
          const <String, double>{},
      breadth: json['breadth'] == null
          ? null
          : MarketBreadth.fromJson(json['breadth'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$MarketSessionToJson(_MarketSession instance) =>
    <String, dynamic>{
      'date': instance.date,
      'indices': instance.indices,
      'breadth': instance.breadth,
    };

_MarketBreadth _$MarketBreadthFromJson(Map<String, dynamic> json) =>
    _MarketBreadth(
      up: (json['up'] as num?)?.toInt() ?? 0,
      down: (json['down'] as num?)?.toInt() ?? 0,
      flat: (json['flat'] as num?)?.toInt() ?? 0,
      counted: (json['counted'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$MarketBreadthToJson(_MarketBreadth instance) =>
    <String, dynamic>{
      'up': instance.up,
      'down': instance.down,
      'flat': instance.flat,
      'counted': instance.counted,
    };
