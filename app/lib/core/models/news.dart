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

    /// How many headlines collapsed into an existing story. Published so the
    /// screen can say the feed was deduplicated rather than thin.
    @Default(0) int merged,

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
    required String headline,

    /// The headline in English, when a translation has been cached for it.
    /// The Arabic is never replaced — this sits beside it, and an English
    /// reader gets this one.
    @JsonKey(name: 'headline_en') String? headlineEn,
    @Default('') String published,

    /// Every outlet that carried this story, with its own link. One story told
    /// by three papers is one row, not three — and each of them is credited.
    @Default(<NewsAttribution>[]) List<NewsAttribution> sources,

    /// What kind of event it is — results, a capital change, a contract, a
    /// board appointment. Never whether it was good news.
    @Default('other') String event,
    @JsonKey(name: 'event_label') @Default('Other') String eventLabel,
    @JsonKey(name: 'event_label_ar') @Default('') String eventLabelAr,

    /// What this kind of story does to somebody holding the share. Shared with
    /// the filings feed: one glossary, written once per type by a person.
    @Default('') String meaning,
    @JsonKey(name: 'meaning_ar') @Default('') String meaningAr,

    /// True when the headline was rebuilt from a URL slug rather than read
    /// from a title field. Said out loud because it is a weaker reading.
    @Default(false) bool reconstructed,

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

  /// The headline in the language being read, falling back to what the outlet
  /// actually wrote. A missing translation shows the Arabic rather than a gap.
  String headlineFor(bool arabic) =>
      arabic ? headline : (headlineEn ?? headline);

  /// The explanation, in the language being read.
  String meaningFor(bool arabic) =>
      arabic && meaningAr.isNotEmpty ? meaningAr : meaning;

  /// Only shown when the event is something other than the catch-all: a chip
  /// reading "Other" tells a reader nothing they did not already know.
  String? get eventTag => event == 'other' ? null : eventLabel;
}

/// One outlet's copy of a story.
@freezed
abstract class NewsAttribution with _$NewsAttribution {
  const factory NewsAttribution({required String id, @Default('') String link}) =
      _NewsAttribution;

  factory NewsAttribution.fromJson(Map<String, dynamic> json) =>
      _$NewsAttributionFromJson(json);
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
