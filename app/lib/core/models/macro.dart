import 'package:freezed_annotation/freezed_annotation.dart';

part 'macro.freezed.dart';
part 'macro.g.dart';

/// The world outside the exchange, and how it reaches an Egyptian share.
///
/// The app is company-first, and its one market-wide surface was a list of
/// numbers with nothing attached: it said gold cost $4,520 an ounce and never
/// said what that does to somebody holding EGX shares.
///
/// Every series here carries three different kinds of statement, and they are
/// deliberately not interchangeable (§50):
///
///   * the **reading** — a published figure, a fact
///   * the **correlation** — arithmetic over two published series
///   * the **chain** — how one reaches the other, which is ours and is the
///     strongest thing this app says anywhere
@freezed
abstract class MacroDoc with _$MacroDoc {
  const factory MacroDoc({
    @JsonKey(name: 'updated_at') String? updatedAt,
    @Default(<MacroSeries>[]) List<MacroSeries> series,
    @Default(<MacroIndicator>[]) List<MacroIndicator> indicators,
    @Default(<MacroCorrelation>[]) List<MacroCorrelation> correlations,

    /// Sources that could not be reached. Published rather than hidden: a
    /// missing source is a fact about the document, and a screen that quietly
    /// shrinks is lying by omission.
    @Default(<String>[]) List<String> unavailable,
  }) = _MacroDoc;

  const MacroDoc._();

  factory MacroDoc.fromJson(Map<String, dynamic> json) =>
      _$MacroDocFromJson(json);

  MacroSeries? byId(String id) {
    for (final s in series) {
      if (s.id == id) return s;
    }
    return null;
  }

  MacroCorrelation? correlationFor(String id) {
    for (final c in correlations) {
      if (c.id == id) return c;
    }
    return null;
  }
}

@freezed
abstract class MacroSeries with _$MacroSeries {
  const factory MacroSeries({
    required String id,
    @Default('') String label,
    @JsonKey(name: 'label_ar') @Default('') String labelAr,

    /// One sentence: what this is, for somebody who is not a trader.
    @Default('') String meaning,
    @JsonKey(name: 'meaning_ar') @Default('') String meaningAr,

    /// How it reaches an Egyptian share, step by published step.
    @Default('') String chain,
    @JsonKey(name: 'chain_ar') @Default('') String chainAr,

    /// What would count as an unusual reading — which for every series here is
    /// *nobody publishes a band*, said plainly rather than left blank.
    @Default('') String yardstick,
    @JsonKey(name: 'yardstick_ar') @Default('') String yardstickAr,

    /// How often the source publishes, and how far behind it runs.
    ///
    /// The difference between a reading that is a week old because the feed is
    /// weekly and one that is a week old because something broke. The Suez
    /// card sat at seven days looking like a fault; the IMF simply publishes
    /// it about a week behind, from satellite tracking.
    @Default('') String cadence,
    @JsonKey(name: 'cadence_ar') @Default('') String cadenceAr,

    /// A model's line about *this* reading, when one was drafted and passed
    /// review. Absent far more often than not — the glossary above is the
    /// floor and this only ever sits on top of it.
    String? insight,
    @Default('') String unit,
    @JsonKey(name: 'as_of') @Default('') String asOf,
    @Default(0) double latest,
    double? previous,
    @Default(<MacroPoint>[]) List<MacroPoint> history,

    /// Reporting that explains what this series has been doing.
    ///
    /// The only part of a macro card that is not ours: the reading is a
    /// published figure, the correlation is our arithmetic, the chain is our
    /// reasoning — and this is somebody else's journalism, carried with the
    /// domain that published it and linking back to them.
    @Default(<MacroCoverage>[]) List<MacroCoverage> coverage,
    @Default('') String source,
  }) = _MacroSeries;

  const MacroSeries._();

  factory MacroSeries.fromJson(Map<String, dynamic> json) =>
      _$MacroSeriesFromJson(json);

  String labelFor(bool arabic) =>
      arabic && labelAr.isNotEmpty ? labelAr : label;

  String meaningFor(bool arabic) =>
      arabic && meaningAr.isNotEmpty ? meaningAr : meaning;

  String chainFor(bool arabic) =>
      arabic && chainAr.isNotEmpty ? chainAr : chain;

  String yardstickFor(bool arabic) =>
      arabic && yardstickAr.isNotEmpty ? yardstickAr : yardstick;

  String cadenceFor(bool arabic) =>
      arabic && cadenceAr.isNotEmpty ? cadenceAr : cadence;

  List<double> get values => [for (final p in history) p.value];

  /// The move since the previous reading, or null when there is nothing to
  /// compare against. Never presented without its date — some of these series
  /// lag by days (§49).
  double? get changePercent {
    final before = previous;
    if (before == null || before == 0) return null;
    return (latest - before) / before * 100;
  }
}

@freezed
abstract class MacroPoint with _$MacroPoint {
  const factory MacroPoint({required String date, required double value}) =
      _MacroPoint;

  factory MacroPoint.fromJson(Map<String, dynamic> json) =>
      _$MacroPointFromJson(json);
}

@freezed
abstract class MacroIndicator with _$MacroIndicator {
  const factory MacroIndicator({
    required String id,
    @Default('') String label,
    @JsonKey(name: 'label_ar') @Default('') String labelAr,
    @Default('') String meaning,
    @JsonKey(name: 'meaning_ar') @Default('') String meaningAr,
    @Default('') String chain,
    @JsonKey(name: 'chain_ar') @Default('') String chainAr,
    @Default('') String year,
    @Default(0) double value,
    @Default('') String source,
  }) = _MacroIndicator;

  const MacroIndicator._();

  factory MacroIndicator.fromJson(Map<String, dynamic> json) =>
      _$MacroIndicatorFromJson(json);

  String labelFor(bool arabic) =>
      arabic && labelAr.isNotEmpty ? labelAr : label;

  String meaningFor(bool arabic) =>
      arabic && meaningAr.isNotEmpty ? meaningAr : meaning;
}

/// How closely a series has actually moved with the EGX 30.
///
/// Measured on daily **changes**, never on levels: any two series that drift
/// upward over a year correlate near 1 whether or not they have anything to do
/// with one another.
///
/// It is published beside the chain precisely so the two can disagree in front
/// of the reader. Suez traffic has a compelling mechanism and a correlation of
/// -0.006, which says the canal reaches the exchange over months rather than
/// sessions — and hiding that would turn an explanation into a claim.
@freezed
abstract class MacroCorrelation with _$MacroCorrelation {
  const factory MacroCorrelation({
    required String id,
    @Default('EGX30') String against,
    @Default(0) double r,
    @Default(0) int sessions,
  }) = _MacroCorrelation;

  const MacroCorrelation._();

  factory MacroCorrelation.fromJson(Map<String, dynamic> json) =>
      _$MacroCorrelationFromJson(json);

  /// Deliberately coarse. A reader does not need three decimals to know
  /// whether two things move together, and printing them invites a precision
  /// the number does not have.
  bool get isMeaningful => r.abs() >= 0.2;
}

/// One headline from an outlet, about a macro series.
///
/// Never rewritten and never summarised. A wire story reaches a dozen sites
/// verbatim, so these are deduplicated on the headline before they are stored —
/// four different domains saying the same sentence is not four sources.
@freezed
abstract class MacroCoverage with _$MacroCoverage {
  const factory MacroCoverage({
    required String title,
    @Default('') String domain,
    @Default('') String url,
    @Default('') String date,
  }) = _MacroCoverage;

  factory MacroCoverage.fromJson(Map<String, dynamic> json) =>
      _$MacroCoverageFromJson(json);
}
