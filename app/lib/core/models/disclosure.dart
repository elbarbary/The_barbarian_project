import 'package:freezed_annotation/freezed_annotation.dart';

part 'disclosure.freezed.dart';
part 'disclosure.g.dart';

/// Filings made to the exchange, each one stamped with its company by EGX.
///
/// The difference between this and the newspaper feed is the difference
/// between a company telling the exchange something and a paper writing about
/// it. These are the actual corporate events, and the ticker is in the title
/// because the exchange put it there — no matching, no inference.
@freezed
abstract class DisclosureFeed with _$DisclosureFeed {
  const factory DisclosureFeed({
    DisclosureSource? source,
    @Default(<Disclosure>[]) List<Disclosure> items,

    /// The published volume band a filing is weighed against.
    @Default(2.0) double threshold,
  }) = _DisclosureFeed;

  const DisclosureFeed._();

  factory DisclosureFeed.fromJson(Map<String, dynamic> json) =>
      _$DisclosureFeedFromJson(json);

  bool get isEmpty => items.isEmpty;

  /// Filings whose company also had an unusual session.
  List<Disclosure> get worthALook =>
      items.where((i) => i.weight == 'check').toList();
}

@freezed
abstract class DisclosureSource with _$DisclosureSource {
  const factory DisclosureSource({
    @Default('') String name,
    @JsonKey(name: 'name_ar') @Default('') String nameAr,
    @Default('') String home,
  }) = _DisclosureSource;

  factory DisclosureSource.fromJson(Map<String, dynamic> json) =>
      _$DisclosureSourceFromJson(json);
}

@freezed
abstract class Disclosure with _$Disclosure {
  const factory Disclosure({
    required String id,
    required String title,
    @Default('') String date,
    @Default('') String link,

    /// Stamped into the title by the exchange as `(TICKER.CA)`.
    @Default(<String>[]) List<String> tickers,

    /// Which kind of filing this is, from a closed list.
    @Default('statement') String event,
    @JsonKey(name: 'event_label') @Default('Statement') String eventLabel,
    @JsonKey(name: 'event_label_ar') @Default('') String eventLabelAr,

    /// What this kind of filing does to somebody holding the share. Written by
    /// a person once per type and reviewed — never generated per filing.
    @Default('') String meaning,
    @JsonKey(name: 'meaning_ar') @Default('') String meaningAr,

    /// check · filed · other. Never a view on the filing itself.
    @Default('filed') String weight,
    @Default('') String because,
    DisclosureEvidence? evidence,

    /// Whether the type came from a published pattern or from the model.
    /// Carried so a mislabelled filing can be traced to which decided it.
    @Default('') String by,
  }) = _Disclosure;

  const Disclosure._();

  /// The explanation, in the language being read.
  ///
  /// The Arabic is the point rather than a courtesy: an Arabic filing beside an
  /// English explanation is the one part of this screen that fails the reader
  /// it was written for. Falls back to English when a type has no Arabic yet,
  /// which is better than a blank where the meaning should be.
  String meaningFor(bool arabic) =>
      arabic && meaningAr.isNotEmpty ? meaningAr : meaning;

  factory Disclosure.fromJson(Map<String, dynamic> json) =>
      _$DisclosureFromJson(json);

  DateTime? get filedAt => DateTime.tryParse(date);
}

@freezed
abstract class DisclosureEvidence with _$DisclosureEvidence {
  const factory DisclosureEvidence({
    @Default('') String ticker,
    @Default(0) num volume,
    @JsonKey(name: 'median_volume_20d') @Default(0) num medianVolume20d,
    @Default(0) double ratio,
    @Default(2.0) double threshold,
    String? date,
  }) = _DisclosureEvidence;

  factory DisclosureEvidence.fromJson(Map<String, dynamic> json) =>
      _$DisclosureEvidenceFromJson(json);
}
