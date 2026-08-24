import 'dart:async';

import '../models/brief.dart';
import '../models/calendar.dart';
import '../models/cash_or_trash.dart';
import '../models/connection.dart';
import '../models/disclosure.dart';
import '../models/filed.dart';
import '../models/news.dart';
import '../models/opportunity.dart';
import '../models/rates.dart';
import '../models/signals.dart';
import '../networking/static_api.dart';
import 'sourced.dart';

/// Reads the static research API (spec §38).
class ResearchRepository {
  const ResearchRepository(this._api);

  final StaticApi _api;

  /// Today's Scanner report (spec §7).
  Stream<Sourced<OpportunityReport>> getOpportunityScanner() => _parsed(
    'opportunities/latest.json',
    'opportunities',
    OpportunityReport.fromJson,
  );

  /// A specific past report, by `YYYY-MM-DD` (spec §7).
  Stream<Sourced<OpportunityReport>> getOpportunityHistory(String date) =>
      _parsed(
        'opportunities/history/$date.json',
        null,
        OpportunityReport.fromJson,
      );

  Stream<Sourced<CashOrTrashIndex>> getCashOrTrashIndex() => _parsed(
    'cash-or-trash/index.json',
    'cash_or_trash',
    CashOrTrashIndex.fromJson,
  );

  /// Headlines from the outlets, with the triage attached at ingestion.
  Stream<Sourced<NewsFeed>> getNews() =>
      _parsed('news/latest.json', 'news', NewsFeed.fromJson);

  /// Index levels, the pound and the metals.
  Stream<Sourced<RatesDoc>> getRates() =>
      _parsed('rates/latest.json', 'rates', RatesDoc.fromJson);

  /// Filings made to the exchange, typed and explained at ingestion.
  Stream<Sourced<DisclosureFeed>> getDisclosures() => _parsed(
    'disclosures/latest.json',
    'disclosures',
    DisclosureFeed.fromJson,
  );

  /// Which months of kept filings exist to be asked for.
  Stream<Sourced<DisclosureArchive>> getDisclosureArchive() => _parsed(
    'disclosures/archive/index.json',
    'disclosures',
    DisclosureArchive.fromJson,
  );

  /// One month of them, fetched only when a reader asks for it. The archive is
  /// sharded precisely so that reading March does not cost February.
  Stream<Sourced<DisclosureMonth>> getDisclosureMonth(String month) => _parsed(
    'disclosures/archive/$month.json',
    'disclosures',
    DisclosureMonth.fromJson,
  );

  /// Where a company shows up in more than one feed in the same few days.
  Stream<Sourced<ConnectionDoc>> getConnections() =>
      _parsed('connections.json', 'connections', ConnectionDoc.fromJson);

  /// What a company has done and said it will do, read from its filings at
  /// build time. Absent for a company the briefs have not reached.
  Stream<Sourced<CompanyBrief>> getCompanyBrief(String ticker) =>
      _parsed('briefs/$ticker.json', 'disclosures', CompanyBrief.fromJson);

  /// The forward calendar — scheduled dates read out of the filings, plus the
  /// expected results dates computed from each company's own filing history.
  Stream<Sourced<CalendarDoc>> getCalendar() =>
      _parsed('calendar.json', 'calendar', CalendarDoc.fromJson);

  /// Which months of already-lodged filings exist to be asked for.
  Stream<Sourced<FiledIndex>> getFiledIndex() =>
      _parsed('calendar/filed/index.json', 'calendar', FiledIndex.fromJson);

  /// One month of them. Sharded for the same reason the disclosure archive is:
  /// opening September should not cost the reader August.
  Stream<Sourced<FiledMonth>> getFiledMonth(String month) =>
      _parsed('calendar/filed/$month.json', 'calendar', FiledMonth.fromJson);

  /// What is unusual about one company against its own record — streak breaks,
  /// silence, first-in-years filings, and when results are next due.
  Stream<Sourced<CompanySignals>> getCompanySignals(String ticker) =>
      _parsed('signals/$ticker.json', 'signals', CompanySignals.fromJson);

  /// The same, across the whole market, in one small document.
  Stream<Sourced<SignalsIndex>> getSignals() =>
      _parsed('signals.json', 'signals', SignalsIndex.fromJson);

  /// Every document one company has filed, across the whole kept record.
  Stream<Sourced<CompanyDocuments>> getCompanyDocuments(String ticker) =>
      _parsed(
        'disclosures/documents/$ticker.json',
        'disclosures',
        CompanyDocuments.fromJson,
      );

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
