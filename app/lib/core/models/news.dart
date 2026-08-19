import 'package:freezed_annotation/freezed_annotation.dart';

part 'news.freezed.dart';
part 'news.g.dart';

/// Headlines from Egyptian financial outlets, with the reason each one is or is
/// not worth a second look.
@freezed
abstract class NewsFeed with _$NewsFeed {
  const factory NewsFeed({
    @Default(<NewsSource>[]) List<NewsSource> sources,
    @Default(<NewsItem>[]) List<NewsItem> items,

    /// The published volume band an item is judged against. Shown, not hidden:
    /// "unusual" means nothing without the number that defines it.
    @Default(2.0) double threshold,

    /// Headlines withheld because the wire wrote a recommendation. Counted so
    /// the screen can say the filter ran, rather than silently shrinking.
    @JsonKey(name: 'dropped_for_advice') @Default(0) int droppedForAdvice,

    /// Outlets that were tried and could not be reached. Published because a
    /// missing source is a fact about the feed, not an embarrassment to hide.
    @Default(<NewsOutage>[]) List<NewsOutage> unavailable,
  }) = _NewsFeed;

  const NewsFeed._();

  factory NewsFeed.fromJson(Map<String, dynamic> json) =>
      _$NewsFeedFromJson(json);

  bool get isEmpty => items.isEmpty;

  /// The ones that touch a listed company whose session was outside its band.
  List<NewsItem> get worthAChecking =>
      items.where((i) => i.weight == 'check').toList();
}

@freezed
abstract class NewsSource with _$NewsSource {
  const factory NewsSource({
    required String id,
    required String name,
    @JsonKey(name: 'name_ar') String? nameAr,
    String? home,
  }) = _NewsSource;

  factory NewsSource.fromJson(Map<String, dynamic> json) =>
      _$NewsSourceFromJson(json);
}

@freezed
abstract class NewsOutage with _$NewsOutage {
  const factory NewsOutage({required String name, @Default('') String note}) =
      _NewsOutage;

  factory NewsOutage.fromJson(Map<String, dynamic> json) =>
      _$NewsOutageFromJson(json);
}

/// One headline, and nothing of the article but a pointer to it.
@freezed
abstract class NewsItem with _$NewsItem {
  const factory NewsItem({
    required String id,
    required String source,
    required String headline,
    @Default('') String link,
    @Default('') String published,

    /// Listed companies the outlet itself tagged the story with.
    @Default(<String>[]) List<String> tickers,

    /// check · named · market. Never a judgement about the news itself.
    @Default('market') String weight,

    /// Why it carries that weight, in a sentence, with the arithmetic in it.
    @Default('') String because,

    NewsEvidence? evidence,
  }) = _NewsItem;

  const NewsItem._();

  factory NewsItem.fromJson(Map<String, dynamic> json) =>
      _$NewsItemFromJson(json);

  DateTime? get publishedAt => DateTime.tryParse(published);
}

/// The session numbers behind a weight, so the claim can be checked.
@freezed
abstract class NewsEvidence with _$NewsEvidence {
  const factory NewsEvidence({
    required String ticker,
    @Default(0) num volume,
    @JsonKey(name: 'median_volume_20d') @Default(0) num medianVolume20d,
    @Default(0) double ratio,
    @Default(2.0) double threshold,
    String? date,
  }) = _NewsEvidence;

  factory NewsEvidence.fromJson(Map<String, dynamic> json) =>
      _$NewsEvidenceFromJson(json);
}
