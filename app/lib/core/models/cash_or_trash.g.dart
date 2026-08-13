// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cash_or_trash.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CashOrTrashIndex _$CashOrTrashIndexFromJson(Map<String, dynamic> json) =>
    _CashOrTrashIndex(
      updatedAt: json['updated_at'] as String?,
      studied: (json['studied'] as num?)?.toInt() ?? 0,
      total: (json['total'] as num?)?.toInt() ?? 0,
      companies:
          (json['companies'] as List<dynamic>?)
              ?.map((e) => CashOrTrashEntry.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <CashOrTrashEntry>[],
    );

Map<String, dynamic> _$CashOrTrashIndexToJson(_CashOrTrashIndex instance) =>
    <String, dynamic>{
      'updated_at': instance.updatedAt,
      'studied': instance.studied,
      'total': instance.total,
      'companies': instance.companies,
    };

_CashOrTrashEntry _$CashOrTrashEntryFromJson(Map<String, dynamic> json) =>
    _CashOrTrashEntry(
      ticker: json['ticker'] as String,
      name: json['name'] as String,
      score: (json['score'] as num?)?.toInt() ?? 0,
      verdictId: json['verdictId'] as String? ?? 'recyclable',
      summary: json['summary'] as String?,
      articleUrl: json['article_url'] as String?,
      studiedAt: json['studied_at'] as String?,
      flags:
          (json['flags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
          const <String>[],
      pillars:
          (json['pillars'] as List<dynamic>?)
              ?.map((e) => PillarScore.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <PillarScore>[],
    );

Map<String, dynamic> _$CashOrTrashEntryToJson(_CashOrTrashEntry instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'name': instance.name,
      'score': instance.score,
      'verdictId': instance.verdictId,
      'summary': instance.summary,
      'article_url': instance.articleUrl,
      'studied_at': instance.studiedAt,
      'flags': instance.flags,
      'pillars': instance.pillars,
    };

_PillarScore _$PillarScoreFromJson(Map<String, dynamic> json) => _PillarScore(
  pillar: json['pillar'] as String,
  score: (json['score'] as num).toInt(),
  basis: json['basis'] as String?,
);

Map<String, dynamic> _$PillarScoreToJson(_PillarScore instance) =>
    <String, dynamic>{
      'pillar': instance.pillar,
      'score': instance.score,
      'basis': instance.basis,
    };
