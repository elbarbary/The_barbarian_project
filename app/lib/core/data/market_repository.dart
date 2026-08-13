import 'dart:async';
import 'dart:convert';

import '../models/company.dart';
import '../models/manifest.dart';
import '../models/market_snapshot.dart';
import '../networking/static_api.dart';
import 'sourced.dart';

/// Reads the static market API (spec §38).
///
/// Nothing in here knows what produced the data. The ingestion side may switch
/// from yfinance to a licensed EGX provider without a single change on this
/// side of the wire (spec §14).
class MarketRepository {
  const MarketRepository(this._api);

  final StaticApi _api;

  Future<Manifest?> getManifest({bool forceRefresh = false}) =>
      _api.manifest(forceRefresh: forceRefresh);

  /// The whole market in one document (spec §18). Never called per-ticker.
  Stream<Sourced<MarketSnapshot>> getMarketSnapshot() =>
      _parsed('market.json', 'market', MarketSnapshot.fromJson);

  Stream<Sourced<CompanyDirectory>> getCompanies() =>
      _parsed('companies.json', 'companies', CompanyDirectory.fromJson);

  Stream<Sourced<Company>> getCompany(String ticker) =>
      _parsed('companies/$ticker.json', null, Company.fromJson);

  /// Price history lives in its own document when it grows large (spec §19).
  /// Falls back to whatever the company document carries.
  Stream<Sourced<List<PricePoint>>> getPriceHistory(String ticker) async* {
    var yieldedFromPriceFile = false;

    try {
      await for (final snapshot in _api.load('prices/$ticker.json')) {
        final decoded = jsonDecode(snapshot.body);
        final points = _pricePointsFrom(decoded);
        if (points.isNotEmpty) {
          yieldedFromPriceFile = true;
          yield Sourced(
            value: points,
            origin: snapshot.origin,
            storedAt: snapshot.storedAt,
          );
        }
      }
    } on Object {
      // No split price file for this ticker; fall through to the company doc.
    }

    if (yieldedFromPriceFile) return;

    await for (final company in getCompany(ticker)) {
      yield company.map((c) => c.priceHistory);
    }
  }

  static List<PricePoint> _pricePointsFrom(Object? decoded) {
    final list = switch (decoded) {
      final List<dynamic> l => l,
      final Map<String, dynamic> m when m['price_history'] is List =>
        m['price_history'] as List<dynamic>,
      final Map<String, dynamic> m when m['prices'] is List =>
        m['prices'] as List<dynamic>,
      _ => const <dynamic>[],
    };
    return [
      for (final item in list)
        if (item is Map<String, dynamic>) PricePoint.fromJson(item),
    ];
  }

  Stream<Sourced<T>> _parsed<T>(
    String path,
    String? resource,
    T Function(Map<String, dynamic>) parse,
  ) async* {
    await for (final snapshot in _api.load(path, resource: resource)) {
      yield Sourced(
        value: parse(snapshot.decodeObject()),
        origin: snapshot.origin,
        storedAt: snapshot.storedAt,
      );
    }
  }
}
