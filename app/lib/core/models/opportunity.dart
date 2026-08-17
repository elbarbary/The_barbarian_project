import 'package:freezed_annotation/freezed_annotation.dart';

part 'opportunity.freezed.dart';
part 'opportunity.g.dart';

/// One day's Opportunity Scanner report (spec §7).
///
/// Note the product name: this is the **Opportunity Scanner**, never "Daily
/// Insights" (spec §4), and the rejected list is part of the report, not an
/// implementation detail to be hidden (spec §7).
@freezed
abstract class OpportunityReport with _$OpportunityReport {
  const factory OpportunityReport({
    String? date,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
    /// The report's own lead line, e.g. "No qualified early opportunity today."
    String? headline,
    /// The masthead's stated date, which can lag the cards. [date] is the
    /// newest date the report actually carries and is what the app shows.
    @JsonKey(name: 'masthead_date') String? mastheadDate,
    /// How a name is scored — the nine published components (spec §50).
    @Default(<RubricComponent>[]) List<RubricComponent> rubric,
    /// The bands and the reasoning that make the rubric mean something.
    @Default(ScoringGuide()) ScoringGuide scoring,
    /// A cohort the report read as one story rather than four names.
    SectorContext? sector,
    @Default(ScannerCoverage()) ScannerCoverage coverage,
    @Default(ScannerSummary()) ScannerSummary summary,
    @Default(<ScannedCompany>[]) List<ScannedCompany> qualified,
    @Default(<ScannedCompany>[]) List<ScannedCompany> watching,
    @Default(<ScannedCompany>[]) List<ScannedCompany> rejected,
    /// The published track record, wins and misses alike (spec §7).
    @Default(<ScanOutcome>[]) List<ScanOutcome> outcomes,
  }) = _OpportunityReport;

  const OpportunityReport._();

  factory OpportunityReport.fromJson(Map<String, dynamic> json) =>
      _$OpportunityReportFromJson(json);

  static const OpportunityReport empty = OpportunityReport();

  bool get isEmpty =>
      qualified.isEmpty &&
      watching.isEmpty &&
      rejected.isEmpty &&
      outcomes.isEmpty;

  DateTime? get reportDate => DateTime.tryParse(date ?? '');

  /// The strongest name on today's watch, if any — what Home previews.
  ScannedCompany? get lead {
    final all = [...qualified, ...watching];
    if (all.isEmpty) return null;
    return all.reduce((a, b) => b.score > a.score ? b : a);
  }

  /// Counts come from the lists themselves, not from the summary block, so a
  /// stale or wrong summary can never make the UI disagree with what it draws.
  int get qualifiedCount => qualified.length;
  int get watchingCount => watching.length;
  int get rejectedCount => rejected.length;

  List<ScannedCompany> forStatus(ScanStatus status) => switch (status) {
    ScanStatus.qualified => qualified,
    ScanStatus.watching => watching,
    ScanStatus.rejected => rejected,
  };

  /// Every scanner appearance of a ticker, across all three buckets. Used by
  /// the company screen's research tab.
  List<ScannedCompany> allFor(String ticker) => [
    ...qualified.where((c) => c.ticker == ticker),
    ...watching.where((c) => c.ticker == ticker),
    ...rejected.where((c) => c.ticker == ticker),
  ];
}

enum ScanStatus {
  @JsonValue('qualified')
  qualified,
  @JsonValue('watching')
  watching,
  @JsonValue('rejected')
  rejected;

  static ScanStatus parse(String? raw) => switch (raw) {
    'qualified' => ScanStatus.qualified,
    'watching' => ScanStatus.watching,
    _ => ScanStatus.rejected,
  };
}

@freezed
abstract class ScannerCoverage with _$ScannerCoverage {
  const factory ScannerCoverage({
    @Default(0) int thndr,
    @Default(0) int egx,
    @JsonKey(name: 'adjusted_histories') @Default(0) int adjustedHistories,
  }) = _ScannerCoverage;

  const ScannerCoverage._();

  factory ScannerCoverage.fromJson(Map<String, dynamic> json) =>
      _$ScannerCoverageFromJson(json);
}

@freezed
abstract class ScannerSummary with _$ScannerSummary {
  const factory ScannerSummary({
    @Default(0) int qualified,
    @Default(0) int watching,
    @Default(0) int rejected,
  }) = _ScannerSummary;

  const ScannerSummary._();

  factory ScannerSummary.fromJson(Map<String, dynamic> json) =>
      _$ScannerSummaryFromJson(json);
}

/// A company as the scanner saw it on one day.
///
/// There is intentionally no entry, target, stop, holding period or expected
/// return here. The V1 app presents catalyst, evidence and score only
/// (spec §8) — adding those fields to the model would be the first step
/// toward a UI that must not exist.
@freezed
abstract class ScannedCompany with _$ScannedCompany {
  const factory ScannedCompany({
    required String ticker,
    @Default(0) int score,
    @JsonKey(name: 'max_score') @Default(13) int maxScore,
    @Default('rejected') String status,
    /// The report's own wording — "Persistent watch", "Tape watch" — which is
    /// more precise than the bucket and is what readers of the series know.
    @JsonKey(name: 'status_label') String? statusLabel,
    @JsonKey(name: 'seen_at') String? seenAt,
    @JsonKey(name: 'move_percent') String? movePercent,
    String? headline,
    String? catalyst,
    @JsonKey(name: 'published_at') DateTime? publishedAt,
    @Default(ScanScores()) ScanScores scores,
    @JsonKey(name: 'research_summary') String? researchSummary,

    /// Where the report ranked this name today. Null for names it lists but
    /// does not rank.
    int? rank,

    /// The report's own wording for the state, which is longer and more
    /// specific than the bucket badge — "Fresh persistent earnings watch".
    String? state,

    /// The decision the report reached, and why. Every one of these says *not*
    /// to trade, which is the honest headline and what the website now leads
    /// with (spec §8 permits recording the absence of a trade).
    ScanAction? action,

    /// What was checked and what it showed — the report's own evidence
    /// checklist. Facts about the past, not conditions for a trade.
    @Default(<ScanGate>[]) List<ScanGate> gates,

    /// The reasoning written out in full, keeping the report's own sections.
    ///
    /// Sections whose whole subject is what must happen before a trade are
    /// dropped at ingestion, so what is here is why the name is being looked
    /// at and what the tape actually did (spec §8).
    @Default(<ResearchSection>[]) List<ResearchSection> research,

    /// The completed session this name was last read on.
    ScanTape? tape,
    @Default(<ResearchSource>[]) List<ResearchSource> sources,
  }) = _ScannedCompany;

  const ScannedCompany._();

  factory ScannedCompany.fromJson(Map<String, dynamic> json) =>
      _$ScannedCompanyFromJson(json);

  ScanStatus get scanStatus => ScanStatus.parse(status);

  /// 0..1, clamped. Scores can be negative once penalties bite, and a negative
  /// fraction would draw a gauge backwards.
  double get scoreFraction {
    if (maxScore <= 0) return 0;
    final f = score / maxScore;
    return f.clamp(0.0, 1.0);
  }
}

/// The scanner's rubric (spec §7). Penalties are negative contributions and are
/// displayed as such — the reason a name failed is the interesting part.
@freezed
abstract class ScanScores with _$ScanScores {
  const factory ScanScores({
    @JsonKey(name: 'fresh_disclosure') @Default(0) int freshDisclosure,
    @JsonKey(name: 'economic_importance') @Default(0) int economicImportance,
    @JsonKey(name: 'volume_confirmation') @Default(0) int volumeConfirmation,
    @JsonKey(name: 'ownership_cluster') @Default(0) int ownershipCluster,
    @JsonKey(name: 'dated_catalyst') @Default(0) int datedCatalyst,
    @JsonKey(name: 'anti_chasing') @Default(0) int antiChasing,
    @JsonKey(name: 'limit_up_penalty') @Default(0) int limitUpPenalty,
    @JsonKey(name: 'issuer_denial') @Default(0) int issuerDenial,
    @JsonKey(name: 'risk_penalty') @Default(0) int riskPenalty,
  }) = _ScanScores;

  const ScanScores._();

  factory ScanScores.fromJson(Map<String, dynamic> json) =>
      _$ScanScoresFromJson(json);

  /// Ordered for display, with human labels. Keeps the rubric in one place so
  /// a screen never hard-codes the list.
  List<({String label, int value})> get breakdown => [
    (label: 'Fresh disclosure', value: freshDisclosure),
    (label: 'Economic importance', value: economicImportance),
    (label: 'Volume confirmation', value: volumeConfirmation),
    (label: 'Ownership cluster', value: ownershipCluster),
    (label: 'Dated catalyst', value: datedCatalyst),
    (label: 'Anti-chasing', value: antiChasing),
    (label: 'Limit-up penalty', value: limitUpPenalty),
    (label: 'Issuer denial', value: issuerDenial),
    (label: 'Risk penalty', value: riskPenalty),
  ];
}

/// The scale the rubric is measured on, and why it is shaped that way.
@freezed
abstract class ScoringGuide with _$ScoringGuide {
  const factory ScoringGuide({
    @Default(<ScoringBand>[]) List<ScoringBand> bands,
    @Default(<String>[]) List<String> notes,
  }) = _ScoringGuide;

  const ScoringGuide._();

  factory ScoringGuide.fromJson(Map<String, dynamic> json) =>
      _$ScoringGuideFromJson(json);

  bool get isEmpty => bands.isEmpty && notes.isEmpty;

  int get best => bands.isEmpty
      ? 13
      : bands.map((b) => b.score).reduce((a, b) => a > b ? a : b);

  int get worst => bands.isEmpty
      ? -14
      : bands.map((b) => b.score).reduce((a, b) => a < b ? a : b);

  /// The score at which a name is worth reading, when the report names one.
  ScoringBand? get researchLine {
    for (final b in bands) {
      if (b.label.toLowerCase().contains('research line')) return b;
    }
    return null;
  }
}

@freezed
abstract class ScoringBand with _$ScoringBand {
  const factory ScoringBand({
    @Default(0) int score,
    @Default('') String label,
  }) = _ScoringBand;

  const ScoringBand._();

  factory ScoringBand.fromJson(Map<String, dynamic> json) =>
      _$ScoringBandFromJson(json);
}

/// One line of the published scoring rubric.
@freezed
abstract class RubricComponent with _$RubricComponent {
  const factory RubricComponent({
    required String label,
    String? detail,
    @Default(0) int weight,
  }) = _RubricComponent;

  const RubricComponent._();

  factory RubricComponent.fromJson(Map<String, dynamic> json) =>
      _$RubricComponentFromJson(json);

  bool get isCredit => weight > 0;
}

/// One published outcome: what happened to a name the scanner flagged.
///
/// Kept deliberately: a scanner that only publishes its wins is marketing.
@freezed
abstract class ScanOutcome with _$ScanOutcome {
  const factory ScanOutcome({
    required String ticker,

    /// The row's own wording when it names more than one company —
    /// "ARVA / AMII". [ticker] stays the first, so the row can still open a
    /// company screen; this is what gets displayed.
    String? label,
    @Default('rejected') String status,
    @JsonKey(name: 'status_label') String? statusLabel,
    @JsonKey(name: 'return_percent') String? returnPercent,
    @Default('up') String direction,
    String? note,
  }) = _ScanOutcome;

  const ScanOutcome._();

  factory ScanOutcome.fromJson(Map<String, dynamic> json) =>
      _$ScanOutcomeFromJson(json);

  bool get isUp => direction == 'up';
}

/// A citation. Source transparency is a core product value (spec §50).
@freezed
abstract class ResearchSource with _$ResearchSource {
  const factory ResearchSource({required String name, String? url}) =
      _ResearchSource;

  const ResearchSource._();

  factory ResearchSource.fromJson(Map<String, dynamic> json) =>
      _$ResearchSourceFromJson(json);

  bool get isLinked => (url ?? '').isNotEmpty;
}

/// One line of the report's evidence checklist.
///
/// A gate records something that was **checked and settled** — earnings
/// verified, volume below three times normal, closed too far from the high. It
/// is a statement about a completed session, which is why it belongs in the app
/// while the entry and stop levels beside it on the website do not (spec §8).
@freezed
abstract class ScanGate with _$ScanGate {
  const factory ScanGate({
    required String label,

    /// `pass`, `fail`, or `warn` — the report's own three states.
    @Default('warn') String outcome,
  }) = _ScanGate;

  const ScanGate._();

  factory ScanGate.fromJson(Map<String, dynamic> json) =>
      _$ScanGateFromJson(json);

  bool get passed => outcome == 'pass';
  bool get failed => outcome == 'fail';
}

/// The completed session a scanned name was last read on.
@freezed
abstract class ScanTape with _$ScanTape {
  const factory ScanTape({
    /// e.g. "12 Aug close".
    String? label,

    /// Pre-formatted by the publisher, currency and all.
    String? price,

    /// e.g. "+1.77% · volume 1.22× normal · closed 41% up its range".
    String? detail,
  }) = _ScanTape;

  const ScanTape._();

  factory ScanTape.fromJson(Map<String, dynamic> json) =>
      _$ScanTapeFromJson(json);
}

/// Several names read as one story.
///
/// A sector cohort is a finding no single-name card can carry: four companies
/// moving together for one reason is evidence about the reason. The report
/// publishes it with its own rotation stage and evidence trail, and the app
/// shows it as its own block rather than folding it into a note.
///
/// It carries no entry, stop or holding clock. The website's version of this
/// block has all three; they are dropped at ingestion (spec §8).
@freezed
abstract class SectorContext with _$SectorContext {
  const factory SectorContext({
    required String title,

    /// e.g. "Sector context · zero qualification points" — the report's own
    /// framing, which says plainly that this scores nothing.
    String? kicker,
    String? thesis,

    /// Rotation stage, first leader, breadth peer, fresh filing.
    @Default(<SectorFact>[]) List<SectorFact> timeline,
    @Default(<SectorMember>[]) List<SectorMember> members,
  }) = _SectorContext;

  const SectorContext._();

  factory SectorContext.fromJson(Map<String, dynamic> json) =>
      _$SectorContextFromJson(json);

  bool get isEmpty => timeline.isEmpty && members.isEmpty;
}

/// A labelled row of the sector's evidence trail.
@freezed
abstract class SectorFact with _$SectorFact {
  const factory SectorFact({
    required String label,
    required String value,
    String? detail,
  }) = _SectorFact;

  const SectorFact._();

  factory SectorFact.fromJson(Map<String, dynamic> json) =>
      _$SectorFactFromJson(json);
}

/// One company inside a sector cohort, and the part it plays in it.
@freezed
abstract class SectorMember with _$SectorMember {
  const factory SectorMember({
    required String ticker,

    /// "Tape leader", "Direct peer", "Extended peer", "Mixed filing".
    String? role,
    String? price,

    /// Whatever qualifies the price — "provisional", most often, because these
    /// are read mid-session.
    String? qualifier,
  }) = _SectorMember;

  const SectorMember._();

  factory SectorMember.fromJson(Map<String, dynamic> json) =>
      _$SectorMemberFromJson(json);
}

/// One headed part of a name's written research.
@freezed
abstract class ResearchSection with _$ResearchSection {
  const factory ResearchSection({
    String? heading,
    @Default(<String>[]) List<String> body,
  }) = _ResearchSection;

  const ResearchSection._();

  factory ResearchSection.fromJson(Map<String, dynamic> json) =>
      _$ResearchSectionFromJson(json);
}


/// The decision on a name, and the reasoning behind it.
@freezed
abstract class ScanAction with _$ScanAction {
  const factory ScanAction({
    /// The report's label for the block — "Action now".
    String? label,

    /// "Wait for today's close — no model entry", "Wait for a wholly new base".
    String? decision,
    @Default(<String>[]) List<String> reasoning,
  }) = _ScanAction;

  const ScanAction._();

  factory ScanAction.fromJson(Map<String, dynamic> json) =>
      _$ScanActionFromJson(json);
}
