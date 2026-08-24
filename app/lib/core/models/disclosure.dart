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

    /// The exchange files in Arabic without exception. This is the cached
    /// English, beside it rather than over it.
    @JsonKey(name: 'title_en') String? titleEn,
    @Default('') String date,
    @Default('') String link,

    /// Stamped into the title by the exchange as `(TICKER.CA)`.
    @Default(<String>[]) List<String> tickers,

    /// The documents the company actually lodged, as links to the exchange's
    /// own PDFs — the signed statement, the auditor's report, the board
    /// minute. Read from the anchors on the filing's detail page, never from
    /// its prose: a filing can say the report is "مرفق" and attach nothing.
    ///
    /// Not every filing carries one, and an empty list is a fact about that
    /// filing rather than a gap in our reading — `detail_read` is what tells
    /// the two apart, and it is not published because the app has no use for
    /// the difference.
    @Default(<String>[]) List<String> attachments,

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
    @JsonKey(name: 'because_ar') @Default('') String becauseAr,
    DisclosureEvidence? evidence,

    /// Whether the type came from a published pattern or from the model.
    /// Carried so a mislabelled filing can be traced to which decided it.
    @Default('') String by,
  }) = _Disclosure;

  const Disclosure._();

  /// The filing title in the language being read, falling back to the Arabic
  /// the exchange published.
  String titleFor(bool arabic) => arabic ? title : (titleEn ?? title);

  /// The explanation, in the language being read.
  ///
  /// The Arabic is the point rather than a courtesy: an Arabic filing beside an
  /// English explanation is the one part of this screen that fails the reader
  /// it was written for. Falls back to English when a type has no Arabic yet,
  /// which is better than a blank where the meaning should be.
  /// Whether the exchange published a document with this filing.
  bool get hasDocument => attachments.isNotEmpty;

  String meaningFor(bool arabic) =>
      arabic && meaningAr.isNotEmpty ? meaningAr : meaning;

  /// The filing type in the language being read.
  ///
  /// On the model rather than at each call site, because it was written out by
  /// hand on Home and forgotten on Today — so the identical row rendered an
  /// English chip and an English explanation to an Arabic reader on one tab
  /// and the Arabic on the other, from the same document.
  String eventLabelFor(bool arabic) =>
      arabic && eventLabelAr.isNotEmpty ? eventLabelAr : eventLabel;

  /// The measured sentence, in the language being read.
  ///
  /// It shipped in English on three Arabic surfaces — Today's filings, Home's
  /// exchange rows and the filed hero — while every other line on those rows
  /// was translated. The Arabic wraps the Latin ticker and the `2.57×` in a
  /// directional isolate, because a run of Latin inside Arabic otherwise
  /// reorders and can put the number where the ticker should be.
  String becauseFor(bool arabic) =>
      arabic && becauseAr.isNotEmpty ? becauseAr : because;

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

/// One month of the kept record.
///
/// The exchange serves the newest page of a search and nothing behind it, so
/// a filing that ages out of the window is gone from the source. These
/// documents are the only place it still exists, which is why they are written
/// per month and never trimmed.
@freezed
abstract class DisclosureMonth with _$DisclosureMonth {
  const factory DisclosureMonth({
    @Default('') String month,
    @Default(<Disclosure>[]) List<Disclosure> items,
  }) = _DisclosureMonth;

  factory DisclosureMonth.fromJson(Map<String, dynamic> json) =>
      _$DisclosureMonthFromJson(json);
}

/// What months of filings exist to be asked for.
@freezed
abstract class DisclosureArchive with _$DisclosureArchive {
  const factory DisclosureArchive({
    @Default(<ArchivedMonth>[]) List<ArchivedMonth> months,

    /// Every filing held, across every month.
    @Default(0) int count,
  }) = _DisclosureArchive;

  const DisclosureArchive._();

  factory DisclosureArchive.fromJson(Map<String, dynamic> json) =>
      _$DisclosureArchiveFromJson(json);

  /// Newest first, which is the order they are offered in.
  List<ArchivedMonth> get newestFirst =>
      [...months]..sort((a, b) => b.month.compareTo(a.month));
}

@freezed
abstract class ArchivedMonth with _$ArchivedMonth {
  const factory ArchivedMonth({
    @Default('') String month,
    @Default(0) int count,
    @Default('') String first,
    @Default('') String last,

    /// How many of them name a listed company.
    @Default(0) int named,
  }) = _ArchivedMonth;

  factory ArchivedMonth.fromJson(Map<String, dynamic> json) =>
      _$ArchivedMonthFromJson(json);
}

/// Everything one company has told the exchange, across the whole kept record.
///
/// Written per company at build time rather than filtered in the app, because
/// the alternative is downloading every month of the archive to render one
/// card. Each row carries its own attachments, so the same document answers
/// both "what has this company filed" and "show me the statements".
@freezed
abstract class CompanyDocuments with _$CompanyDocuments {
  const factory CompanyDocuments({
    @Default('') String ticker,

    /// How many filings this company has lodged in total, which is very often
    /// more than [items] holds: the page document carries the newest fifty so
    /// a phone does not download seven hundred to show a list. The complete
    /// record is a separate document, fetched only when a reader asks.
    @Default(0) int total,
    @Default(<FiledDocument>[]) List<FiledDocument> items,
  }) = _CompanyDocuments;

  const CompanyDocuments._();

  factory CompanyDocuments.fromJson(Map<String, dynamic> json) =>
      _$CompanyDocumentsFromJson(json);

  /// The filings that carry a document a reader can open.
  List<FiledDocument> get withDocuments =>
      items.where((i) => i.attachments.isNotEmpty).toList();
}

@freezed
abstract class FiledDocument with _$FiledDocument {
  const factory FiledDocument({
    @Default('') String id,
    @Default('') String date,
    @Default('') String title,
    @JsonKey(name: 'title_en') String? titleEn,
    @Default('') String event,
    @JsonKey(name: 'event_label') @Default('') String eventLabel,
    @JsonKey(name: 'event_label_ar') @Default('') String eventLabelAr,
    @Default('') String link,
    @Default('') String meaning,
    @JsonKey(name: 'meaning_ar') @Default('') String meaningAr,
    @Default(<String>[]) List<String> attachments,
  }) = _FiledDocument;

  const FiledDocument._();

  factory FiledDocument.fromJson(Map<String, dynamic> json) =>
      _$FiledDocumentFromJson(json);

  String titleFor(bool arabic) => arabic ? title : (titleEn ?? title);

  String labelFor(bool arabic) =>
      arabic && eventLabelAr.isNotEmpty ? eventLabelAr : eventLabel;

  String meaningFor(bool arabic) =>
      arabic && meaningAr.isNotEmpty ? meaningAr : meaning;
}
