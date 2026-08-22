import 'package:freezed_annotation/freezed_annotation.dart';

part 'connection.freezed.dart';
part 'connection.g.dart';

/// Where a company shows up more than once in the same few days.
///
/// Everything the app publishes is filed under the surface it came from: the
/// filings in the filings feed, the headlines in the news feed, the session
/// numbers on the company screen. A reader who wanted to notice that one
/// company did all three on one day had to do it themselves, across three
/// screens.
///
/// Nothing here is new information. Every strand is a document already
/// published, and each one is a link back to it.
@freezed
abstract class ConnectionDoc with _$ConnectionDoc {
  const factory ConnectionDoc({
    @JsonKey(name: 'window_days') @Default(4) int windowDays,
    @Default(2.0) double threshold,
    @Default(<Connection>[]) List<Connection> items,
  }) = _ConnectionDoc;

  factory ConnectionDoc.fromJson(Map<String, dynamic> json) =>
      _$ConnectionDocFromJson(json);
}

@freezed
abstract class Connection with _$Connection {
  const factory Connection({
    @Default('') String ticker,

    /// Which kinds crossed — `filing`, `news`, `session`. Two or more, always;
    /// one kind is not a crossing, it is whichever feed it came from.
    @Default(<String>[]) List<String> kinds,

    /// The published facts, joined by "and" and stopping there. Written at
    /// build time from fixed templates and refused if they ever read as an
    /// instruction (§8).
    @Default('') String why,
    @JsonKey(name: 'why_ar') @Default('') String whyAr,

    double? ratio,
    @Default(<Strand>[]) List<Strand> strands,
  }) = _Connection;

  const Connection._();

  factory Connection.fromJson(Map<String, dynamic> json) =>
      _$ConnectionFromJson(json);

  String whyFor(bool arabic) => arabic && whyAr.isNotEmpty ? whyAr : why;
}

/// One thread of the crossing, and where to read it.
@freezed
abstract class Strand with _$Strand {
  const factory Strand({
    @Default('') String kind,
    @Default('') String id,
    @Default('') String date,
    @Default('') String title,
    @JsonKey(name: 'title_ar') @Default('') String titleAr,
    @Default('') String link,
    double? ratio,
    @JsonKey(name: 'change_percent') double? changePercent,
  }) = _Strand;

  const Strand._();

  factory Strand.fromJson(Map<String, dynamic> json) => _$StrandFromJson(json);

  String titleFor(bool arabic) =>
      arabic && titleAr.isNotEmpty ? titleAr : (title.isEmpty ? titleAr : title);
}
