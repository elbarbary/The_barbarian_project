import 'package:freezed_annotation/freezed_annotation.dart';

part 'brief.freezed.dart';
part 'brief.g.dart';

/// What a company has done, and what it has said it will do.
///
/// Every company page carries hundreds of Arabic filing titles and a decade of
/// filed profit. That is a great deal of primary source and almost no help,
/// because nobody reads seven hundred filings. This is that record read once,
/// at build time, by `build_company_briefs.py`.
///
/// **Three things, and a hard line under them.** The history is what the
/// filings show the company did. The plans are what the company *itself*
/// announced it intends to do, each one carrying the id of the filing that
/// says it. The record is a set of counts — suspensions, loss-making periods,
/// capital increases — computed from the data rather than asked of a model.
///
/// Nothing here says whether any of it is good. A view on a named security's
/// prospects is investment advice and this publisher is not licensed to give
/// it (§8). The builder refuses a whole brief if any sentence reads as an
/// instruction in either language, and drops any plan whose citation is not a
/// filing that was actually put in front of the model.
@freezed
abstract class CompanyBrief with _$CompanyBrief {
  const factory CompanyBrief({
    @Default('') String ticker,
    @Default('') String history,
    @JsonKey(name: 'history_ar') @Default('') String historyAr,
    @Default(<BriefPlan>[]) List<BriefPlan> plans,
    BriefRecord? record,
    String? generated,
  }) = _CompanyBrief;

  const CompanyBrief._();

  factory CompanyBrief.fromJson(Map<String, dynamic> json) =>
      _$CompanyBriefFromJson(json);

  static const CompanyBrief empty = CompanyBrief();

  bool get isEmpty => history.isEmpty && plans.isEmpty;

  String historyFor(bool arabic) =>
      arabic && historyAr.isNotEmpty ? historyAr : history;
}

/// One thing the company announced it intends to do, and the filing that says
/// so. [id] is always a filing this company actually lodged — the builder
/// drops anything it cannot trace.
@freezed
abstract class BriefPlan with _$BriefPlan {
  const factory BriefPlan({
    @Default('') String text,
    @JsonKey(name: 'text_ar') @Default('') String textAr,
    @Default('') String id,
  }) = _BriefPlan;

  const BriefPlan._();

  factory BriefPlan.fromJson(Map<String, dynamic> json) =>
      _$BriefPlanFromJson(json);

  String textFor(bool arabic) => arabic && textAr.isNotEmpty ? textAr : text;
}

/// Counts, not judgements.
///
/// Every field here is arrived at by counting rows, which is why it can sit on
/// the same screen as the rest without a licence: "trading was suspended three
/// times" is a fact about the record, and what a reader makes of it is theirs.
@freezed
abstract class BriefRecord with _$BriefRecord {
  const factory BriefRecord({
    @Default(0) int filings,
    @JsonKey(name: 'first_filing') String? firstFiling,
    @JsonKey(name: 'trading_suspensions') @Default(0) int suspensions,
    @JsonKey(name: 'trading_resumptions') @Default(0) int resumptions,
    @JsonKey(name: 'capital_increases') @Default(0) int capitalIncreases,
    @JsonKey(name: 'general_assemblies') @Default(0) int assemblies,
    @JsonKey(name: 'periods_reported') @Default(0) int periodsReported,
    @JsonKey(name: 'loss_making_periods') @Default(0) int lossMakingPeriods,
  }) = _BriefRecord;

  const BriefRecord._();

  factory BriefRecord.fromJson(Map<String, dynamic> json) =>
      _$BriefRecordFromJson(json);
}
