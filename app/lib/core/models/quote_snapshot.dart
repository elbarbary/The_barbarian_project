import 'package:freezed_annotation/freezed_annotation.dart';

import 'market_snapshot.dart';

part 'quote_snapshot.freezed.dart';
part 'quote_snapshot.g.dart';

/// A quote snapshot from the live feed.
///
/// This is the one document in the app that is *not* part of the versioned
/// static API: it has no manifest entry and no cache generation, because its
/// whole value is being newer than the last publish. It is fetched on a timer
/// and merged over the published [MarketSnapshot].
///
/// It is not real time, and the app never says it is. [delay] is read from the
/// feed's own tag rather than assumed, so the caption tracks reality even if the
/// tier changes underneath (spec §49).
@freezed
abstract class QuoteSnapshot with _$QuoteSnapshot {
  const factory QuoteSnapshot({
    /// When the server read the market. Not when the trade happened — that is
    /// this instant minus [delay].
    @JsonKey(name: 'as_of') required String asOf,
    @JsonKey(name: 'delay_seconds') @Default(900) int delaySeconds,
    @JsonKey(name: 'update_modes') @Default(<String>[]) List<String> updateModes,
    ExchangeSession? session,
    @Default(false) bool stale,
    @Default(<String, LiveQuote>{}) Map<String, LiveQuote> quotes,
  }) = _QuoteSnapshot;

  const QuoteSnapshot._();

  factory QuoteSnapshot.fromJson(Map<String, dynamic> json) =>
      _$QuoteSnapshotFromJson(json);

  /// How far behind the tape these prices are.
  Duration get delay => Duration(seconds: delaySeconds);

  DateTime? get readAt => DateTime.tryParse(asOf)?.toLocal();

  bool get isEmpty => quotes.isEmpty;

  /// Whether the exchange was trading when the snapshot was taken.
  ///
  /// Defaults to false when the server did not say, because the honest caption
  /// when we do not know is the quieter one.
  bool get isSessionOpen => session?.open ?? false;

  /// How long ago the server read the market, or null if the timestamp is
  /// unusable. A malformed date must degrade to "unknown", never crash.
  Duration? get sinceRead {
    final at = readAt;
    if (at == null) return null;
    final elapsed = DateTime.now().difference(at);
    // Clock skew between phone and edge can make this slightly negative; that
    // is not worth showing as "in 4 seconds".
    return elapsed.isNegative ? Duration.zero : elapsed;
  }

  /// The published snapshot with every live price written over it.
  ///
  /// Anything the feed does not carry keeps its published value, so a company
  /// that has dropped off the scanner still shows its last close rather than
  /// vanishing from the list.
  ///
  /// The feed may only **update** companies, never add them. The directory
  /// decides what exists: it drops rows the exchange keys by ISIN rather than
  /// ticker, and when the feed briefly stopped dropping them too they arrived
  /// here as ten phantom listings and were counted in Home's risers and
  /// fallers. Treating the published snapshot as the universe means a change of
  /// mind upstream cannot invent companies inside the app.
  MarketSnapshot mergedOver(MarketSnapshot published) {
    if (isEmpty) return published;
    final merged = Map<String, StockQuote>.of(published.stocks);
    for (final entry in quotes.entries) {
      if (!merged.containsKey(entry.key)) continue;
      merged[entry.key] = entry.value.toStockQuote();
    }
    return published.copyWith(stocks: merged);
  }
}

/// Whether the Egyptian Exchange was trading when the snapshot was taken.
@freezed
abstract class ExchangeSession with _$ExchangeSession {
  const factory ExchangeSession({
    @Default(false) bool open,
    String? weekday,
  }) = _ExchangeSession;

  factory ExchangeSession.fromJson(Map<String, dynamic> json) =>
      _$ExchangeSessionFromJson(json);
}

/// One live row. Keys are short because this document is fetched every five
/// minutes and carries every name on the exchange.
@freezed
abstract class LiveQuote with _$LiveQuote {
  const factory LiveQuote({
    @JsonKey(name: 'c') required double close,
    @JsonKey(name: 'o') double? open,
    @JsonKey(name: 'h') double? high,
    @JsonKey(name: 'l') double? low,
    @JsonKey(name: 'v') int? volume,

    /// Percent, as the feed publishes it: `1.24` means +1.24%.
    @JsonKey(name: 'ch') double? changePercent,
    @JsonKey(name: 'pc') double? previousClose,
  }) = _LiveQuote;

  const LiveQuote._();

  factory LiveQuote.fromJson(Map<String, dynamic> json) =>
      _$LiveQuoteFromJson(json);

  /// Converted into the shape every screen already renders.
  ///
  /// The one conversion that matters: [changePercent] arrives as a percentage
  /// and [StockQuote.changePercent] is a fraction. Getting this wrong shows
  /// every move on the exchange a hundred times too large.
  StockQuote toStockQuote() => StockQuote(
    close: close,
    previousClose: previousClose,
    change: previousClose == null ? null : close - previousClose!,
    changePercent: changePercent == null ? null : changePercent! / 100,
    volume: volume,
  );
}
