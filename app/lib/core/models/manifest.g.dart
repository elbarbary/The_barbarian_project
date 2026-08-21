// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'manifest.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Manifest _$ManifestFromJson(Map<String, dynamic> json) => _Manifest(
  schemaVersion: (json['schema_version'] as num?)?.toInt() ?? 1,
  dataVersion: json['data_version'] as String? ?? '',
  generatedAt: json['generated_at'] == null
      ? null
      : DateTime.parse(json['generated_at'] as String),
  marketDate: json['market_date'] as String? ?? '',
  versions: ManifestVersions.fromJson(json['versions'] as Map<String, dynamic>),
);

Map<String, dynamic> _$ManifestToJson(_Manifest instance) => <String, dynamic>{
  'schema_version': instance.schemaVersion,
  'data_version': instance.dataVersion,
  'generated_at': instance.generatedAt?.toIso8601String(),
  'market_date': instance.marketDate,
  'versions': instance.versions,
};

_ManifestVersions _$ManifestVersionsFromJson(Map<String, dynamic> json) =>
    _ManifestVersions(
      market: (json['market'] as num?)?.toInt() ?? 0,
      companies: (json['companies'] as num?)?.toInt() ?? 0,
      opportunities: (json['opportunities'] as num?)?.toInt() ?? 0,
      cashOrTrash: (json['cash_or_trash'] as num?)?.toInt() ?? 0,
      macro: (json['macro'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$ManifestVersionsToJson(_ManifestVersions instance) =>
    <String, dynamic>{
      'market': instance.market,
      'companies': instance.companies,
      'opportunities': instance.opportunities,
      'cash_or_trash': instance.cashOrTrash,
      'macro': instance.macro,
    };
