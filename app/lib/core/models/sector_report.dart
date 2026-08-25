import 'package:freezed_annotation/freezed_annotation.dart';

part 'sector_report.freezed.dart';
part 'sector_report.g.dart';

/// A sector read against its own companies — where the group is moving, and the
/// middle of its range.
///
/// Built by `build_sectors.py` from the same figures the review sheet produces:
/// every company's metric directions, tallied per sector, and the sector
/// medians the review pipeline already computes. No new source, no score.
///
/// **Sectors are never ranked by how they are moving, and there is no sector
/// grade.** Movement is counts — how many companies rising, falling, flat — and
/// the order is by how many companies a sector holds, a structural fact. "The
/// sector that is moving most" a screen away from a price would be advice, and
/// this publisher has no licence to give it (§8). The prose read may say a
/// group is broadly widening its assets; it may never say it is a place to buy.

/// How many of a sector's companies move each way on one metric.
@freezed
abstract class SectorMovement with _$SectorMovement {
  const factory SectorMovement({
    @Default('') String key,
    @Default(0) int rising,
    @Default(0) int falling,
    @Default(0) int flat,
    @Default(0) int unknown,
  }) = _SectorMovement;

  const SectorMovement._();

  factory SectorMovement.fromJson(Map<String, dynamic> json) =>
      _$SectorMovementFromJson(json);

  /// The companies with a readable direction — the ones the bar is drawn from.
  /// `unknown` is left off the bar because a flat arrow it never earned would
  /// claim a stability nobody measured.
  int get read => rising + falling + flat;
}

/// The median company's figure for one metric, and how to print it.
@freezed
abstract class SectorMedian with _$SectorMedian {
  const factory SectorMedian({
    @Default('') String key,
    @Default(0) double value,
    @Default('ratio') String unit,
  }) = _SectorMedian;

  factory SectorMedian.fromJson(Map<String, dynamic> json) =>
      _$SectorMedianFromJson(json);
}

/// A company and how many of its measures are moving together — a count, never
/// a rank.
@freezed
abstract class SectorStandout with _$SectorStandout {
  const factory SectorStandout({
    @Default('') String ticker,
    @JsonKey(name: 'name_en') @Default('') String nameEn,
    @JsonKey(name: 'name_ar') String? nameAr,
    @Default(0) int improving,
    @Default(0) int deteriorating,
    @Default(0) int readable,
  }) = _SectorStandout;

  const SectorStandout._();

  factory SectorStandout.fromJson(Map<String, dynamic> json) =>
      _$SectorStandoutFromJson(json);

  String nameFor(bool arabic) =>
      arabic && (nameAr?.isNotEmpty ?? false) ? nameAr! : nameEn;
}

/// Every company in a sector, with its improving-measures count and where it
/// sits against the sector on its headline figure.
@freezed
abstract class SectorMember with _$SectorMember {
  const factory SectorMember({
    @Default('') String ticker,
    @JsonKey(name: 'name_en') @Default('') String nameEn,
    @JsonKey(name: 'name_ar') String? nameAr,
    @Default(0) int improving,
    @Default(0) int deteriorating,
    @Default(0) int readable,

    /// `above` or `below` the sector median on [peerKey], or null when the
    /// sector is too small to carry that median.
    String? peer,
    String? peerKey,
  }) = _SectorMember;

  const SectorMember._();

  factory SectorMember.fromJson(Map<String, dynamic> json) =>
      _$SectorMemberFromJson(json);

  String nameFor(bool arabic) =>
      arabic && (nameAr?.isNotEmpty ?? false) ? nameAr! : nameEn;

  /// A company with no readable pattern yet — shown, but sorted to the bottom.
  bool get hasPattern => readable > 0;
}

/// One sector's summary, for the section list and the home card.
@freezed
abstract class SectorSummary with _$SectorSummary {
  const factory SectorSummary({
    @Default('') String slug,
    @Default('') String sector,
    @Default(0) int companies,
    @Default('') String readTeaser,
    @Default(SectorMovement()) SectorMovement lead,
    @Default(<SectorMovement>[]) List<SectorMovement> movement,
    double? medianPe,
    double? medianDividendYield,
  }) = _SectorSummary;

  factory SectorSummary.fromJson(Map<String, dynamic> json) =>
      _$SectorSummaryFromJson(json);
}

/// A sector held below the five-company floor — named, and nothing more.
@freezed
abstract class SectorHeldBack with _$SectorHeldBack {
  const factory SectorHeldBack({
    @Default('') String sector,
    @Default(0) int companies,
  }) = _SectorHeldBack;

  factory SectorHeldBack.fromJson(Map<String, dynamic> json) =>
      _$SectorHeldBackFromJson(json);
}

/// The whole-market index: every sector big enough to read, plus the ones held
/// back and the day's featured pick.
@freezed
abstract class SectorIndex with _$SectorIndex {
  const factory SectorIndex({
    @Default('') String generated,
    @Default('') String source,
    @Default(0) int sectorCount,
    @Default('') String featured,
    @Default(<SectorSummary>[]) List<SectorSummary> sectors,
    @Default(<SectorHeldBack>[]) List<SectorHeldBack> heldBack,
  }) = _SectorIndex;

  const SectorIndex._();

  factory SectorIndex.fromJson(Map<String, dynamic> json) =>
      _$SectorIndexFromJson(json);

  static const SectorIndex empty = SectorIndex();

  bool get isEmpty => sectors.isEmpty;

  /// The featured summary the home card leads with, or the first sector.
  SectorSummary? get featuredSector {
    for (final s in sectors) {
      if (s.slug == featured) return s;
    }
    return sectors.isEmpty ? null : sectors.first;
  }
}

/// One sector in full: the read, the movement of every metric, the medians, the
/// standouts, and every member company.
@freezed
abstract class SectorReport with _$SectorReport {
  const factory SectorReport({
    @Default('') String slug,
    @Default('') String sector,
    @Default('') String generated,
    @Default(0) int companies,

    /// A build-time vetted paragraph reading the sector's movement as a whole.
    /// Null when no read has been generated yet — the screen falls back to a
    /// computed line rather than a blank.
    String? read,
    @JsonKey(name: 'read_ar') String? readAr,
    @Default(<SectorMovement>[]) List<SectorMovement> movement,
    @Default(<SectorMedian>[]) List<SectorMedian> medians,
    @Default(<SectorStandout>[]) List<SectorStandout> standouts,
    @Default(<SectorMember>[]) List<SectorMember> members,
  }) = _SectorReport;

  const SectorReport._();

  factory SectorReport.fromJson(Map<String, dynamic> json) =>
      _$SectorReportFromJson(json);

  static const SectorReport empty = SectorReport();

  bool get isEmpty => movement.isEmpty && medians.isEmpty;

  String? readFor(bool arabic) =>
      arabic && (readAr?.isNotEmpty ?? false) ? readAr : read;
}
