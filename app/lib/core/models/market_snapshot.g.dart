// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'market_snapshot.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MarketSnapshot _$MarketSnapshotFromJson(Map<String, dynamic> json) =>
    _MarketSnapshot(
      date: json['date'] as String,
      isClose: json['is_close'] as bool? ?? true,
      capturedAt: json['captured_at'] as String?,
      stocks:
          (json['stocks'] as Map<String, dynamic>?)?.map(
            (k, e) =>
                MapEntry(k, StockQuote.fromJson(e as Map<String, dynamic>)),
          ) ??
          const <String, StockQuote>{},
    );

Map<String, dynamic> _$MarketSnapshotToJson(_MarketSnapshot instance) =>
    <String, dynamic>{
      'date': instance.date,
      'is_close': instance.isClose,
      'captured_at': instance.capturedAt,
      'stocks': instance.stocks,
    };

_StockQuote _$StockQuoteFromJson(Map<String, dynamic> json) => _StockQuote(
  close: (json['close'] as num).toDouble(),
  previousClose: (json['previous_close'] as num?)?.toDouble(),
  change: (json['change'] as num?)?.toDouble(),
  changePercent: (json['change_percent'] as num?)?.toDouble(),
  volume: (json['volume'] as num?)?.toInt(),
);

Map<String, dynamic> _$StockQuoteToJson(_StockQuote instance) =>
    <String, dynamic>{
      'close': instance.close,
      'previous_close': instance.previousClose,
      'change': instance.change,
      'change_percent': instance.changePercent,
      'volume': instance.volume,
    };
