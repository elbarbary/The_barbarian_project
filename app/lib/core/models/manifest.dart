import 'package:freezed_annotation/freezed_annotation.dart';

part 'manifest.freezed.dart';
part 'manifest.g.dart';

/// The first document the app fetches (spec §17).
///
/// Startup never blocks on it: cached content renders first, then the manifest
/// arrives and only the resources whose version changed are refetched (spec §36).
@freezed
abstract class Manifest with _$Manifest {
  const factory Manifest({
    @JsonKey(name: 'schema_version') @Default(1) int schemaVersion,
    @JsonKey(name: 'data_version') @Default('') String dataVersion,
    @JsonKey(name: 'generated_at') DateTime? generatedAt,
    @JsonKey(name: 'market_date') @Default('') String marketDate,
    required ManifestVersions versions,
  }) = _Manifest;

  const Manifest._();

  factory Manifest.fromJson(Map<String, dynamic> json) =>
      _$ManifestFromJson(json);

  /// The app understands exactly one schema. A newer one means this build is
  /// too old to read the data safely, and it should keep serving its cache
  /// rather than misparse (spec §49).
  static const int supportedSchemaVersion = 1;

  bool get isSupported => schemaVersion == supportedSchemaVersion;
}

/// Monotonic counters, one per published resource. A resource is refetched
/// only when its counter differs from the cached one.
@freezed
abstract class ManifestVersions with _$ManifestVersions {
  const factory ManifestVersions({
    @Default(0) int market,
    @Default(0) int companies,
    @Default(0) int opportunities,
    @JsonKey(name: 'cash_or_trash') @Default(0) int cashOrTrash,
  }) = _ManifestVersions;

  const ManifestVersions._();

  factory ManifestVersions.fromJson(Map<String, dynamic> json) =>
      _$ManifestVersionsFromJson(json);

  /// Named lookup so the cache layer can diff generically instead of
  /// enumerating fields at every call site.
  int versionOf(String resource) => switch (resource) {
    'market' => market,
    'companies' => companies,
    'opportunities' => opportunities,
    'cash_or_trash' => cashOrTrash,
    _ => 0,
  };

  static const List<String> resources = [
    'market',
    'companies',
    'opportunities',
    'cash_or_trash',
  ];
}
