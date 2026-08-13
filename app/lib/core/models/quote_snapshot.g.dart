// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quote_snapshot.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_QuoteSnapshot _$QuoteSnapshotFromJson(Map<String, dynamic> json) =>
    _QuoteSnapshot(
      asOf: json['as_of'] as String,
      delaySeconds: (json['delay_seconds'] as num?)?.toInt() ?? 900,
      updateModes:
          (json['update_modes'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const <String>[],
      session: json['session'] == null
          ? null
          : ExchangeSession.fromJson(json['session'] as Map<String, dynamic>),
      stale: json['stale'] as bool? ?? false,
      quotes:
          (json['quotes'] as Map<String, dynamic>?)?.map(
            (k, e) =>
                MapEntry(k, LiveQuote.fromJson(e as Map<String, dynamic>)),
          ) ??
          const <String, LiveQuote>{},
    );

Map<String, dynamic> _$QuoteSnapshotToJson(_QuoteSnapshot instance) =>
    <String, dynamic>{
      'as_of': instance.asOf,
      'delay_seconds': instance.delaySeconds,
      'update_modes': instance.updateModes,
      'session': instance.session,
      'stale': instance.stale,
      'quotes': instance.quotes,
    };

_ExchangeSession _$ExchangeSessionFromJson(Map<String, dynamic> json) =>
    _ExchangeSession(
      open: json['open'] as bool? ?? false,
      weekday: json['weekday'] as String?,
    );

Map<String, dynamic> _$ExchangeSessionToJson(_ExchangeSession instance) =>
    <String, dynamic>{'open': instance.open, 'weekday': instance.weekday};

_LiveQuote _$LiveQuoteFromJson(Map<String, dynamic> json) => _LiveQuote(
  close: (json['c'] as num).toDouble(),
  open: (json['o'] as num?)?.toDouble(),
  high: (json['h'] as num?)?.toDouble(),
  low: (json['l'] as num?)?.toDouble(),
  volume: (json['v'] as num?)?.toInt(),
  changePercent: (json['ch'] as num?)?.toDouble(),
  previousClose: (json['pc'] as num?)?.toDouble(),
);

Map<String, dynamic> _$LiveQuoteToJson(_LiveQuote instance) =>
    <String, dynamic>{
      'c': instance.close,
      'o': instance.open,
      'h': instance.high,
      'l': instance.low,
      'v': instance.volume,
      'ch': instance.changePercent,
      'pc': instance.previousClose,
    };
