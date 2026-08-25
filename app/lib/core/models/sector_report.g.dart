// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sector_report.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_SectorMovement _$SectorMovementFromJson(Map<String, dynamic> json) =>
    _SectorMovement(
      key: json['key'] as String? ?? '',
      rising: (json['rising'] as num?)?.toInt() ?? 0,
      falling: (json['falling'] as num?)?.toInt() ?? 0,
      flat: (json['flat'] as num?)?.toInt() ?? 0,
      unknown: (json['unknown'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$SectorMovementToJson(_SectorMovement instance) =>
    <String, dynamic>{
      'key': instance.key,
      'rising': instance.rising,
      'falling': instance.falling,
      'flat': instance.flat,
      'unknown': instance.unknown,
    };

_SectorMedian _$SectorMedianFromJson(Map<String, dynamic> json) =>
    _SectorMedian(
      key: json['key'] as String? ?? '',
      value: (json['value'] as num?)?.toDouble() ?? 0,
      unit: json['unit'] as String? ?? 'ratio',
    );

Map<String, dynamic> _$SectorMedianToJson(_SectorMedian instance) =>
    <String, dynamic>{
      'key': instance.key,
      'value': instance.value,
      'unit': instance.unit,
    };

_SectorStandout _$SectorStandoutFromJson(Map<String, dynamic> json) =>
    _SectorStandout(
      ticker: json['ticker'] as String? ?? '',
      nameEn: json['name_en'] as String? ?? '',
      nameAr: json['name_ar'] as String?,
      improving: (json['improving'] as num?)?.toInt() ?? 0,
      deteriorating: (json['deteriorating'] as num?)?.toInt() ?? 0,
      readable: (json['readable'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$SectorStandoutToJson(_SectorStandout instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'name_en': instance.nameEn,
      'name_ar': instance.nameAr,
      'improving': instance.improving,
      'deteriorating': instance.deteriorating,
      'readable': instance.readable,
    };

_SectorMember _$SectorMemberFromJson(Map<String, dynamic> json) =>
    _SectorMember(
      ticker: json['ticker'] as String? ?? '',
      nameEn: json['name_en'] as String? ?? '',
      nameAr: json['name_ar'] as String?,
      improving: (json['improving'] as num?)?.toInt() ?? 0,
      deteriorating: (json['deteriorating'] as num?)?.toInt() ?? 0,
      readable: (json['readable'] as num?)?.toInt() ?? 0,
      peer: json['peer'] as String?,
      peerKey: json['peerKey'] as String?,
    );

Map<String, dynamic> _$SectorMemberToJson(_SectorMember instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'name_en': instance.nameEn,
      'name_ar': instance.nameAr,
      'improving': instance.improving,
      'deteriorating': instance.deteriorating,
      'readable': instance.readable,
      'peer': instance.peer,
      'peerKey': instance.peerKey,
    };

_SectorSummary _$SectorSummaryFromJson(Map<String, dynamic> json) =>
    _SectorSummary(
      slug: json['slug'] as String? ?? '',
      sector: json['sector'] as String? ?? '',
      companies: (json['companies'] as num?)?.toInt() ?? 0,
      readTeaser: json['readTeaser'] as String? ?? '',
      lead: json['lead'] == null
          ? const SectorMovement()
          : SectorMovement.fromJson(json['lead'] as Map<String, dynamic>),
      movement:
          (json['movement'] as List<dynamic>?)
              ?.map((e) => SectorMovement.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <SectorMovement>[],
      medianPe: (json['medianPe'] as num?)?.toDouble(),
      medianDividendYield: (json['medianDividendYield'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$SectorSummaryToJson(_SectorSummary instance) =>
    <String, dynamic>{
      'slug': instance.slug,
      'sector': instance.sector,
      'companies': instance.companies,
      'readTeaser': instance.readTeaser,
      'lead': instance.lead,
      'movement': instance.movement,
      'medianPe': instance.medianPe,
      'medianDividendYield': instance.medianDividendYield,
    };

_SectorHeldBack _$SectorHeldBackFromJson(Map<String, dynamic> json) =>
    _SectorHeldBack(
      sector: json['sector'] as String? ?? '',
      companies: (json['companies'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$SectorHeldBackToJson(_SectorHeldBack instance) =>
    <String, dynamic>{
      'sector': instance.sector,
      'companies': instance.companies,
    };

_SectorIndex _$SectorIndexFromJson(Map<String, dynamic> json) => _SectorIndex(
  generated: json['generated'] as String? ?? '',
  source: json['source'] as String? ?? '',
  sectorCount: (json['sectorCount'] as num?)?.toInt() ?? 0,
  featured: json['featured'] as String? ?? '',
  sectors:
      (json['sectors'] as List<dynamic>?)
          ?.map((e) => SectorSummary.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <SectorSummary>[],
  heldBack:
      (json['heldBack'] as List<dynamic>?)
          ?.map((e) => SectorHeldBack.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <SectorHeldBack>[],
);

Map<String, dynamic> _$SectorIndexToJson(_SectorIndex instance) =>
    <String, dynamic>{
      'generated': instance.generated,
      'source': instance.source,
      'sectorCount': instance.sectorCount,
      'featured': instance.featured,
      'sectors': instance.sectors,
      'heldBack': instance.heldBack,
    };

_SectorReport _$SectorReportFromJson(Map<String, dynamic> json) =>
    _SectorReport(
      slug: json['slug'] as String? ?? '',
      sector: json['sector'] as String? ?? '',
      generated: json['generated'] as String? ?? '',
      companies: (json['companies'] as num?)?.toInt() ?? 0,
      read: json['read'] as String?,
      readAr: json['read_ar'] as String?,
      movement:
          (json['movement'] as List<dynamic>?)
              ?.map((e) => SectorMovement.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <SectorMovement>[],
      medians:
          (json['medians'] as List<dynamic>?)
              ?.map((e) => SectorMedian.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <SectorMedian>[],
      standouts:
          (json['standouts'] as List<dynamic>?)
              ?.map((e) => SectorStandout.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <SectorStandout>[],
      members:
          (json['members'] as List<dynamic>?)
              ?.map((e) => SectorMember.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <SectorMember>[],
    );

Map<String, dynamic> _$SectorReportToJson(_SectorReport instance) =>
    <String, dynamic>{
      'slug': instance.slug,
      'sector': instance.sector,
      'generated': instance.generated,
      'companies': instance.companies,
      'read': instance.read,
      'read_ar': instance.readAr,
      'movement': instance.movement,
      'medians': instance.medians,
      'standouts': instance.standouts,
      'members': instance.members,
    };
