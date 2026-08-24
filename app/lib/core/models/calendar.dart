import 'package:freezed_annotation/freezed_annotation.dart';

part 'calendar.freezed.dart';
part 'calendar.g.dart';

/// The dates the exchange's filings put on the record — a forward calendar.
///
/// The exchange has no "what is coming" feed; its own site's Events tab returns
/// an empty list. But a large share of disclosures name a date after they were
/// filed: a dividend's payment date, a rights issue's subscription window, a
/// called general assembly, the day a suspended share resumes. Those are facts
/// the issuer already lodged, and between them they are a calendar.
///
/// **Nothing here is a forecast.** Every event is a date a company or the
/// exchange has already published, read out of a labelled field in the filing
/// (`build_calendar.py`), and each one links back to the filing it came from.
/// The app makes no claim beyond "this was scheduled, here is the document".
@freezed
abstract class CalendarDoc with _$CalendarDoc {
  const factory CalendarDoc({
    String? generated,

    /// How many days of already-passed events the document keeps for context,
    /// so a month view has something to show around today rather than only the
    /// handful of things still ahead. Null when the document is the full
    /// history.
    @JsonKey(name: 'past_days') int? pastDays,
    @Default(<CalendarEvent>[]) List<CalendarEvent> events,
  }) = _CalendarDoc;

  const CalendarDoc._();

  factory CalendarDoc.fromJson(Map<String, dynamic> json) =>
      _$CalendarDocFromJson(json);

  static const CalendarDoc empty = CalendarDoc();

  /// Only the dates an issuer actually filed.
  List<CalendarEvent> get filed => [
    for (final event in events)
      if (!event.estimated) event,
  ];

  /// Only the computed ones.
  List<CalendarEvent> get expected => [
    for (final event in events)
      if (event.estimated) event,
  ];

  /// One company's rows, both kinds, soonest first.
  List<CalendarEvent> forTicker(String ticker) => [
    for (final event in events)
      if (event.ticker == ticker) event,
  ]..sort((a, b) => a.date.compareTo(b.date));

  /// Events on one calendar day, in filing order.
  List<CalendarEvent> on(DateTime day) => [
    for (final event in events)
      if (event.parsedDate case final DateTime at when _sameDay(at, day)) event,
  ];

  /// Every day that carries at least one event, as midnight-normalised dates.
  Set<DateTime> get days => {
    for (final event in events)
      if (event.parsedDate case final DateTime at)
        DateTime(at.year, at.month, at.day),
  };

  static bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}

/// What kind of scheduled thing an event is.
///
/// The string is the pipeline's own key; the enum is what the UI switches on,
/// so an unrecognised key from a newer builder degrades to [other] rather than
/// crashing a screen.
enum CalendarKind {
  dividendPayment,
  exDividend,
  rightsOpen,
  rightsClose,
  rightsEntitlement,
  assemblyAgm,
  assemblyEgm,
  tradingResume,
  tradingSuspend,
  listingEffective,

  /// The one kind on this screen the exchange did not publish: when this
  /// company's results are next due, computed from the dates it filed the
  /// same period in previous years. Always carries [CalendarEvent.estimated].
  resultsExpected,
  other;

  static CalendarKind of(String raw) => switch (raw) {
    'dividend_payment' => CalendarKind.dividendPayment,
    'ex_dividend' => CalendarKind.exDividend,
    'rights_open' => CalendarKind.rightsOpen,
    'rights_close' => CalendarKind.rightsClose,
    'rights_entitlement' => CalendarKind.rightsEntitlement,
    'assembly_agm' => CalendarKind.assemblyAgm,
    'assembly_egm' => CalendarKind.assemblyEgm,
    'trading_resume' => CalendarKind.tradingResume,
    'trading_suspend' => CalendarKind.tradingSuspend,
    'listing_effective' => CalendarKind.listingEffective,
    'results_expected' => CalendarKind.resultsExpected,
    _ => CalendarKind.other,
  };

  /// Which of three families the event belongs to, for colour and grouping.
  /// Not a judgement — a suspension is not "bad", it is a fact — only a way to
  /// tell a money event from a governance one at a glance.
  CalendarFamily get family => switch (this) {
    CalendarKind.dividendPayment ||
    CalendarKind.exDividend => CalendarFamily.cash,
    CalendarKind.rightsOpen ||
    CalendarKind.rightsClose ||
    CalendarKind.rightsEntitlement => CalendarFamily.rights,
    CalendarKind.assemblyAgm ||
    CalendarKind.assemblyEgm => CalendarFamily.assembly,
    CalendarKind.tradingResume ||
    CalendarKind.tradingSuspend => CalendarFamily.trading,
    CalendarKind.resultsExpected => CalendarFamily.expected,
    CalendarKind.listingEffective || CalendarKind.other => CalendarFamily.other,
  };
}

enum CalendarFamily { cash, rights, assembly, trading, expected, other }

@freezed
abstract class CalendarEvent with _$CalendarEvent {
  const factory CalendarEvent({
    @Default('') String date,
    @Default('') String kind,

    /// The one line the exchange wrote, in English — "Cash dividend payment".
    @Default('') String note,
    String? ticker,
    @Default('') String title,
    @JsonKey(name: 'title_ar') @Default('') String titleAr,

    /// When the announcing filing was lodged — always before [date].
    @Default('') String filed,
    @Default('') String section,
    @Default('') String link,
    @Default('') String id,

    /// True only for a date nobody filed — see [CalendarKind.resultsExpected].
    /// Every other row on this screen is a date an issuer published, and the
    /// two must never be shown as if they were the same kind of thing.
    @Default(false) bool estimated,

    /// The period the expected filing would report, and the range of dates
    /// this company has historically filed it in. Empty on a filed event.
    @JsonKey(name: 'period_end') @Default('') String periodEnd,
    @JsonKey(name: 'window_start') @Default('') String windowStart,
    @JsonKey(name: 'window_end') @Default('') String windowEnd,

    /// How many past filings of the same period the window is drawn from.
    /// Shown on screen: a window from three years is a weaker claim than one
    /// from twelve, and the reader is told which they are looking at.
    @Default(0) int observations,
  }) = _CalendarEvent;

  const CalendarEvent._();

  factory CalendarEvent.fromJson(Map<String, dynamic> json) =>
      _$CalendarEventFromJson(json);

  CalendarKind get kindOf => CalendarKind.of(kind);

  /// The scheduled date, or null when the string will not parse — a bad date
  /// drops the row from a day rather than crashing the calendar.
  DateTime? get parsedDate {
    final at = DateTime.tryParse(date);
    return at == null ? null : DateTime(at.year, at.month, at.day);
  }

  DateTime? get filedDate => DateTime.tryParse(filed);

  /// The headline in the language being read, falling back to the other.
  String titleFor(bool arabic) {
    if (arabic && titleAr.isNotEmpty) return titleAr;
    return title.isEmpty ? titleAr : title;
  }
}
