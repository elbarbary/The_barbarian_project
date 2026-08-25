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
///
/// **Every counter the manifest carries, not a list of five.**
///
/// This was a freezed class with a named field per resource and a `switch` that
/// returned 0 for anything else. The pipeline publishes twelve counters; the
/// class knew five. The other seven — news, disclosures, rates, connections,
/// calendar, market_history, signals — all resolved to 0, and
/// `StaticApi._expectedVersion` compared that 0 against the 0 the cache had
/// been written with. They matched, so `isCurrent` was true, so **those
/// documents were fetched once on a device and never again**. The website
/// could publish all it liked.
///
/// Hand-written rather than generated precisely so that adding a resource to
/// `build_fixtures.RESOURCES` needs no matching Dart change: a counter this
/// class has never heard of still works. That is the failure this class kept
/// having, so it is the one thing its shape now prevents.
class ManifestVersions {
  const ManifestVersions({this.counters = const <String, int>{}});

  factory ManifestVersions.fromJson(Map<String, dynamic> json) =>
      ManifestVersions(
        counters: {
          for (final entry in json.entries)
            if (entry.value is num) entry.key: (entry.value as num).toInt(),
        },
      );

  final Map<String, int> counters;

  Map<String, dynamic> toJson() => Map<String, dynamic>.from(counters);

  /// The counter guarding this resource, or 0 when the manifest carries none.
  /// Callers must treat 0 as "no counter" and fall back to `data_version`,
  /// never as a version that happens to be zero — see [has].
  int versionOf(String resource) => counters[resource] ?? 0;

  /// Whether the manifest actually published a counter for this resource.
  bool has(String resource) => counters.containsKey(resource);

  int get market => versionOf('market');
  int get companies => versionOf('companies');
  int get cashOrTrash => versionOf('cash_or_trash');

  /// The world outside the exchange — Suez transits, oil, gold, and Egypt's
  /// own annual line — with the mechanism by which each reaches a share.
  int get macro => versionOf('macro');

  static const List<String> resources = [
    'market',
    'companies',
    'cash_or_trash',
    'macro',
    'news',
    'rates',
    'disclosures',
    'connections',
    'calendar',
    'signals',
    'review',
    'sectors',
    'market_history',
  ];

  @override
  bool operator ==(Object other) =>
      other is ManifestVersions &&
      other.counters.length == counters.length &&
      other.counters.entries.every((e) => counters[e.key] == e.value);

  @override
  int get hashCode => Object.hashAll([
    for (final key in counters.keys.toList()..sort()) Object.hash(key, counters[key]),
  ]);
}
