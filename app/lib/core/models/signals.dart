import 'package:freezed_annotation/freezed_annotation.dart';

part 'signals.freezed.dart';
part 'signals.g.dart';

/// What is unusual about a company **against its own record**.
///
/// The app's argument everywhere else is "unusual against its own normal" — a
/// session is worth a look because this share traded twice its own median
/// volume, not because a number is large. `build_signals.py` applies the same
/// idea to the filing record, which is the bigger pile: 126,080 filings and
/// 10,073 filed net-profit figures.
///
/// Four things come out of it, and every one is counted rather than judged:
/// a run of profits or losses ending, a company gone quiet against its own
/// filing rhythm, a kind of filing appearing for the first time in years, and
/// when the next results are due.
///
/// **None of it says whether any of it is good.** A first loss is not a sell
/// signal and a return to profit is not a buy one; this publisher is not
/// licensed to imply either (§8). Every row carries the filing behind it so a
/// reader can go and read the thing itself.
@freezed
abstract class CompanySignals with _$CompanySignals {
  const factory CompanySignals({
    @Default('') String ticker,
    String? generated,
    @Default(<StreakBreak>[]) List<StreakBreak> streaks,
    @Default(<FirstOfType>[]) List<FirstOfType> firsts,
    QuietSpell? quiet,
    @JsonKey(name: 'results_due') @Default(<ResultsDue>[]) List<ResultsDue> resultsDue,
    SignalProfile? profile,
  }) = _CompanySignals;

  const CompanySignals._();

  factory CompanySignals.fromJson(Map<String, dynamic> json) =>
      _$CompanySignalsFromJson(json);

  static const CompanySignals empty = CompanySignals();

  bool get isEmpty =>
      streaks.isEmpty && firsts.isEmpty && quiet == null && resultsDue.isEmpty;
}

/// A run of profitable or loss-making reported periods, and the period that
/// ended it.
///
/// A "reported period" is one year-to-date filing: Egyptian issuers file Q1,
/// H1, 9M and FY cumulatively, so these are not quarters and the app never
/// calls them that.
@freezed
abstract class StreakBreak with _$StreakBreak {
  const factory StreakBreak({
    @Default('') String kind,
    @Default('') String period,
    @JsonKey(name: 'period_end') @Default('') String periodEnd,
    @Default(0) double value,

    /// How many consecutive periods ran the other way before this one.
    @Default(0) int run,

    /// The end of the first period in that run.
    @Default('') String since,
    @Default('') String filed,
    @Default('') String id,
    @Default('') String link,
  }) = _StreakBreak;

  const StreakBreak._();

  factory StreakBreak.fromJson(Map<String, dynamic> json) =>
      _$StreakBreakFromJson(json);

  bool get isFirstLoss => kind == 'first_loss';

  /// The year the run started, for "first loss since 2017".
  String get sinceYear => since.length >= 4 ? since.substring(0, 4) : '';
}

/// A kind of filing that had not been seen for years, and just was.
@freezed
abstract class FirstOfType with _$FirstOfType {
  const factory FirstOfType({
    @Default('') String type,

    /// The plain-English name of the type, from the builder's own table.
    @Default('') String label,
    @Default('') String date,
    @Default('') String previous,
    @JsonKey(name: 'gap_days') @Default(0) int gapDays,
    @Default('') String title,
    @JsonKey(name: 'title_ar') @Default('') String titleAr,
    @Default('') String id,
    @Default('') String link,
  }) = _FirstOfType;

  const FirstOfType._();

  factory FirstOfType.fromJson(Map<String, dynamic> json) =>
      _$FirstOfTypeFromJson(json);

  int get gapYears => gapDays ~/ 365;

  String get previousYear =>
      previous.length >= 4 ? previous.substring(0, 4) : '';
}

/// A company that files often and has stopped.
///
/// Measured against its own median gap, not a fixed number of days. A fixed
/// threshold turned out to be a delisting detector: every company it flagged
/// was already `tradable: false`, which the directory says without any of
/// this. Only tradable companies are ever given one of these.
@freezed
abstract class QuietSpell with _$QuietSpell {
  const factory QuietSpell({
    @JsonKey(name: 'last_filed') @Default('') String lastFiled,
    @JsonKey(name: 'silent_days') @Default(0) int silentDays,
    @JsonKey(name: 'typical_gap') @Default(0) int typicalGap,
    @Default(0) int filings,
  }) = _QuietSpell;

  factory QuietSpell.fromJson(Map<String, dynamic> json) =>
      _$QuietSpellFromJson(json);
}

/// When a company's next results are due — a window, never a date.
///
/// This is the one computed forward-looking thing in the app, and it is a
/// claim about a **disclosure date** rather than about a security: *this
/// company has filed its nine-month figures between 5 and 27 November in each
/// of the last twelve years*. The window and [observations] are both shown,
/// because a range drawn from three years is a weaker claim than one drawn
/// from twelve and the reader is entitled to know which they have.
@freezed
abstract class ResultsDue with _$ResultsDue {
  const factory ResultsDue({
    /// `Q1`, `H1`, `9M` or `FY` — the year-to-date period it would report.
    @Default('') String label,
    @JsonKey(name: 'period_end') @Default('') String periodEnd,
    @Default('') String expected,
    @JsonKey(name: 'window_start') @Default('') String windowStart,
    @JsonKey(name: 'window_end') @Default('') String windowEnd,
    @Default(0) int observations,
  }) = _ResultsDue;

  const ResultsDue._();

  factory ResultsDue.fromJson(Map<String, dynamic> json) =>
      _$ResultsDueFromJson(json);

  DateTime? get expectedDate => DateTime.tryParse(expected);
}

/// The counted shape of a company's whole record.
@freezed
abstract class SignalProfile with _$SignalProfile {
  const factory SignalProfile({
    @Default(0) int filings,
    @JsonKey(name: 'first_filing') String? firstFiling,
    @JsonKey(name: 'last_filing') String? lastFiling,
    @JsonKey(name: 'busiest_year') String? busiestYear,
    @JsonKey(name: 'busiest_year_filings') @Default(0) int busiestYearFilings,
    @JsonKey(name: 'periods_reported') @Default(0) int periodsReported,
    @JsonKey(name: 'loss_making_periods') @Default(0) int lossMakingPeriods,
    @JsonKey(name: 'profitable_periods') @Default(0) int profitablePeriods,
  }) = _SignalProfile;

  factory SignalProfile.fromJson(Map<String, dynamic> json) =>
      _$SignalProfileFromJson(json);
}

/// The market-wide roll-up: every recent streak break and current silence,
/// across every company, in one small document.
@freezed
abstract class SignalsIndex with _$SignalsIndex {
  const factory SignalsIndex({
    String? generated,
    @Default(<MarketSignal>[]) List<MarketSignal> firsts,
    @Default(<MarketQuiet>[]) List<MarketQuiet> quiet,
    @Default(0) int companies,
  }) = _SignalsIndex;

  const SignalsIndex._();

  factory SignalsIndex.fromJson(Map<String, dynamic> json) =>
      _$SignalsIndexFromJson(json);

  static const SignalsIndex empty = SignalsIndex();
}

/// One company's streak break or first-in-years, with the company named.
@freezed
abstract class MarketSignal with _$MarketSignal {
  const factory MarketSignal({
    @Default('') String ticker,
    @Default('') String name,
    @JsonKey(name: 'name_ar') @Default('') String nameAr,
    @Default('') String kind,

    // Present on a streak break.
    @Default('') String period,
    @JsonKey(name: 'period_end') @Default('') String periodEnd,
    @Default(0) double value,
    @Default(0) int run,
    @Default('') String since,

    // Present on a first-in-years.
    @Default('') String label,
    @Default('') String date,
    @JsonKey(name: 'gap_days') @Default(0) int gapDays,
    @Default('') String link,
  }) = _MarketSignal;

  const MarketSignal._();

  factory MarketSignal.fromJson(Map<String, dynamic> json) =>
      _$MarketSignalFromJson(json);

  /// The day this signal belongs on, whichever kind it is.
  String get when => date.isNotEmpty ? date : periodEnd;

  int get gapYears => gapDays ~/ 365;

  String nameFor(bool arabic) =>
      arabic && nameAr.isNotEmpty ? nameAr : (name.isEmpty ? ticker : name);
}

@freezed
abstract class MarketQuiet with _$MarketQuiet {
  const factory MarketQuiet({
    @Default('') String ticker,
    @Default('') String name,
    @JsonKey(name: 'name_ar') @Default('') String nameAr,
    @JsonKey(name: 'last_filed') @Default('') String lastFiled,
    @JsonKey(name: 'silent_days') @Default(0) int silentDays,
    @JsonKey(name: 'typical_gap') @Default(0) int typicalGap,
    @Default(0) int filings,
  }) = _MarketQuiet;

  const MarketQuiet._();

  factory MarketQuiet.fromJson(Map<String, dynamic> json) =>
      _$MarketQuietFromJson(json);

  String nameFor(bool arabic) =>
      arabic && nameAr.isNotEmpty ? nameAr : (name.isEmpty ? ticker : name);
}
