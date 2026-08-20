import 'package:freezed_annotation/freezed_annotation.dart';

part 'market_history.freezed.dart';
part 'market_history.g.dart';

/// Where the indices closed, and how the market split, session by session.
///
/// Both series are written down one day at a time by
/// `scripts/build_market_history.py` rather than fetched: there is no
/// historical index feed we can reach, and no breadth feed at all. So the file
/// starts with a single row and the charts grow into it. That is visible in the
/// app — a one-session chart is a dot — and it is the honest alternative to
/// backfilling a shape from something nobody published.
@freezed
abstract class MarketHistory with _$MarketHistory {
  const factory MarketHistory({
    @JsonKey(name: 'updated_at') String? updatedAt,
    @Default(<MarketSession>[]) List<MarketSession> sessions,
  }) = _MarketHistory;

  const MarketHistory._();

  factory MarketHistory.fromJson(Map<String, dynamic> json) =>
      _$MarketHistoryFromJson(json);

  static const MarketHistory empty = MarketHistory();

  /// The closing levels of one index, oldest first.
  ///
  /// Sessions where that index was not published are skipped rather than
  /// interpolated: a straight line drawn through a missing day is a claim that
  /// nothing happened on it.
  List<double> levelsOf(String indexId) => [
    for (final session in sessions)
      if (session.indices[indexId] case final double level) level,
  ];

  MarketSession? get latest => sessions.isEmpty ? null : sessions.last;
}

@freezed
abstract class MarketSession with _$MarketSession {
  const factory MarketSession({
    required String date,
    @Default(<String, double>{}) Map<String, double> indices,
    MarketBreadth? breadth,
  }) = _MarketSession;

  const MarketSession._();

  factory MarketSession.fromJson(Map<String, dynamic> json) =>
      _$MarketSessionFromJson(json);
}

/// How many shares rose, fell and did not move.
///
/// The most useful sentence about a session: "57 up against 177 down" says
/// whether a green index was the whole market or three heavyweights carrying
/// it. Shares with no published change are not counted at all — "did not move"
/// is a real state and a missing figure is a different one.
@freezed
abstract class MarketBreadth with _$MarketBreadth {
  const factory MarketBreadth({
    @Default(0) int up,
    @Default(0) int down,
    @Default(0) int flat,
    @Default(0) int counted,
  }) = _MarketBreadth;

  const MarketBreadth._();

  factory MarketBreadth.fromJson(Map<String, dynamic> json) =>
      _$MarketBreadthFromJson(json);

  bool get isEmpty => counted == 0;

  /// Which way the session leaned, without saying whether that is good.
  bool get roseMore => up > down;
}
