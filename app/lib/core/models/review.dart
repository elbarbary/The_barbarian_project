import 'package:freezed_annotation/freezed_annotation.dart';

part 'review.freezed.dart';
part 'review.g.dart';

/// The stock review sheet — every metric, its direction, and what to ask next.
///
/// Built by `build_review.py` from the exchange's filed statements, its own
/// `stock-info` endpoint, and the market scan. The founder's Investing 101
/// framework, computed for every listed company and refreshed by the same
/// pipeline as everything else.
///
/// **There is no score, and there will not be one.** The moment nine arrows
/// become a number out of ten it is a recommendation wearing arithmetic, and
/// this publisher has no licence to make one (§8). What the sheet does instead
/// is state each figure, which way it has moved in this company's own history,
/// where it sits against its sector — and then ask the reader a question. That
/// last part is not decoration: "P/E fell while earnings rose" plus "why is it
/// cheaper than its sector?" is the same information as a verdict, with the
/// judgement left where it belongs.
@freezed
abstract class CompanyReview with _$CompanyReview {
  const factory CompanyReview({
    @Default('') String ticker,
    String? generated,
    String? sector,
    @Default(<ReviewMetric>[]) List<ReviewMetric> metrics,
    ReviewPattern? pattern,
  }) = _CompanyReview;

  const CompanyReview._();

  factory CompanyReview.fromJson(Map<String, dynamic> json) =>
      _$CompanyReviewFromJson(json);

  static const CompanyReview empty = CompanyReview();

  bool get isEmpty => metrics.isEmpty;

  /// The metrics in the order the framework teaches them: what am I paying,
  /// is the business improving, what is it earning on, how is it financed.
  List<ReviewMetric> get ordered {
    const rank = <String, int>{
      'pe': 0, 'pb': 1, 'dividend_yield': 2,
      'profit': 3, 'eps': 4, 'assets': 5, 'cash_conversion': 6,
      'roe': 7, 'roa': 8,
      'debt_equity': 9,
    };
    return [...metrics]
      ..sort((a, b) => (rank[a.key] ?? 99).compareTo(rank[b.key] ?? 99));
  }
}

/// Which way a metric has moved against this company's own history.
///
/// [unknown] is a real answer and is shown as one: a single published figure
/// with no series behind it has no direction, and drawing a flat arrow would
/// claim a stability nobody measured.
enum ReviewDirection {
  rising,
  falling,
  flat,
  unknown;

  static ReviewDirection of(String raw) => switch (raw) {
    'rising' => ReviewDirection.rising,
    'falling' => ReviewDirection.falling,
    'flat' => ReviewDirection.flat,
    _ => ReviewDirection.unknown,
  };

  bool get isKnown => this != ReviewDirection.unknown;
}

@freezed
abstract class ReviewMetric with _$ReviewMetric {
  const factory ReviewMetric({
    @Default('') String key,
    @Default(0) double value,

    /// `ratio`, `percent`, `egp_m` or `egp` — how to print [value].
    @Default('ratio') String unit,
    @Default('unknown') String direction,

    /// How many reported periods the direction was read from. Shown, because a
    /// direction off three periods is a weaker claim than one off nine and the
    /// reader is entitled to know which they have.
    @Default(0) int points,

    /// The last ten readings, oldest first, for a sparkline.
    @Default(<double>[]) List<double> series,

    /// `above` or `below` the sector median — absent when the sector has fewer
    /// than five companies carrying this metric, because a median of four is
    /// not a benchmark.
    String? peer,
    @JsonKey(name: 'peer_median') double? peerMedian,
  }) = _ReviewMetric;

  const ReviewMetric._();

  factory ReviewMetric.fromJson(Map<String, dynamic> json) =>
      _$ReviewMetricFromJson(json);

  ReviewDirection get way => ReviewDirection.of(direction);

  bool get isAbovePeers => peer == 'above';

  bool get hasPeers => peer != null && peerMedian != null;
}

/// Where the numbers agree, and where they contradict each other.
///
/// The whole argument of the sheet: no single figure says anything, and the
/// story appears when several move together — or when one refuses to. Counts
/// and names only. A company with six metrics improving and one deteriorating
/// is described exactly that way, never summed.
@freezed
abstract class ReviewPattern with _$ReviewPattern {
  const factory ReviewPattern({
    /// How many metrics had a direction that could be read at all.
    @Default(0) int readable,
    @Default(<String>[]) List<String> improving,
    @Default(<String>[]) List<String> deteriorating,
  }) = _ReviewPattern;

  const ReviewPattern._();

  factory ReviewPattern.fromJson(Map<String, dynamic> json) =>
      _$ReviewPatternFromJson(json);

  /// True when everything readable moved the same way — the case the framework
  /// calls out, in either direction.
  bool get agrees => improving.isEmpty || deteriorating.isEmpty;
}
