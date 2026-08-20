import 'dart:async';

import '../models/cash_or_trash.dart';
import '../models/disclosure.dart';
import '../models/news.dart';
import '../models/rates.dart';
import '../models/opportunity.dart';
import '../networking/static_api.dart';
import 'sourced.dart';

/// Reads the static research API (spec §38).
class ResearchRepository {
  const ResearchRepository(this._api);

  final StaticApi _api;

  /// Today's Opportunity Scanner report (spec §7).
  Stream<Sourced<OpportunityReport>> getOpportunityScanner() =>
      _parsed('opportunities/latest.json', 'opportunities', OpportunityReport.fromJson);

  /// A specific past report, by `YYYY-MM-DD` (spec §7).
  Stream<Sourced<OpportunityReport>> getOpportunityHistory(String date) =>
      _parsed('opportunities/history/$date.json', null, OpportunityReport.fromJson);

  Stream<Sourced<CashOrTrashIndex>> getCashOrTrashIndex() =>
      _parsed('cash-or-trash/index.json', 'cash_or_trash', CashOrTrashIndex.fromJson);

  /// Headlines from the outlets, with the triage attached at ingestion.
  Stream<Sourced<NewsFeed>> getNews() =>
      _parsed('news/latest.json', 'news', NewsFeed.fromJson);

  /// Index levels, the pound and the metals.
  Stream<Sourced<RatesDoc>> getRates() =>
      _parsed('rates/latest.json', 'rates', RatesDoc.fromJson);

  /// Filings made to the exchange, typed and explained at ingestion.
  Stream<Sourced<DisclosureFeed>> getDisclosures() =>
      _parsed('disclosures/latest.json', 'disclosures', DisclosureFeed.fromJson);

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
