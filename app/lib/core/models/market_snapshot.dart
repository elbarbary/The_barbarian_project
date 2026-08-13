import 'package:freezed_annotation/freezed_annotation.dart';

part 'market_snapshot.freezed.dart';
part 'market_snapshot.g.dart';

/// One document carrying the latest close for every covered company (spec §18).
///
/// Deliberately a single request: the Market screen must never fan out one
/// request per ticker.
@freezed
abstract class MarketSnapshot with _$MarketSnapshot {
  const factory MarketSnapshot({
    /// Session the closes belong to. This is the date the UI must display —
    /// the app shows the last *available* session, never "now" (spec §49).
    required String date,

    /// Whether these prices are that session's *closing* prices.
    ///
    /// False when the scan was taken while the exchange was still trading, in
    /// which case calling them a close is untrue. Defaults to true so an older
    /// document without the field keeps its previous wording.
    @JsonKey(name: 'is_close') @Default(true) bool isClose,

    /// When the scan behind these prices was taken.
    @JsonKey(name: 'captured_at') String? capturedAt,
    @Default(<String, StockQuote>{}) Map<String, StockQuote> stocks,
  }) = _MarketSnapshot;

  const MarketSnapshot._();

  factory MarketSnapshot.fromJson(Map<String, dynamic> json) =>
      _$MarketSnapshotFromJson(json);

  static const MarketSnapshot empty = MarketSnapshot(date: '');

  StockQuote? quoteFor(String ticker) => stocks[ticker];

  bool get isEmpty => stocks.isEmpty;

  /// Parsed session date, or null when the field is absent or malformed —
  /// a bad date must degrade to "unknown", never crash a screen (spec §49).
  DateTime? get sessionDate => DateTime.tryParse(date);
}

/// An end-of-day quote. There is no intraday or real-time feed anywhere in this
/// product (spec §13, §61), so every field here describes a completed session.
@freezed
abstract class StockQuote with _$StockQuote {
  const factory StockQuote({
    required double close,
    @JsonKey(name: 'previous_close') double? previousClose,
    double? change,
    @JsonKey(name: 'change_percent') double? changePercent,
    int? volume,
  }) = _StockQuote;

  const StockQuote._();

  factory StockQuote.fromJson(Map<String, dynamic> json) =>
      _$StockQuoteFromJson(json);

  bool get isUp => (change ?? 0) > 0;
  bool get isDown => (change ?? 0) < 0;
  bool get isFlat => (change ?? 0) == 0;

  /// Falls back to deriving the move from the two closes when the publisher
  /// omitted it, so a partial document still renders correctly.
  double? get resolvedChange {
    if (change != null) return change;
    final prev = previousClose;
    if (prev == null) return null;
    return close - prev;
  }

  double? get resolvedChangePercent {
    if (changePercent != null) return changePercent;
    final prev = previousClose;
    if (prev == null || prev == 0) return null;
    return (close - prev) / prev;
  }
}
