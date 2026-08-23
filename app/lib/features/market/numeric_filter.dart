import '../../core/models/company.dart';
import '../../core/models/market_snapshot.dart';
import '../../l10n/app_localizations.dart';

/// A number a reader can narrow the directory by.
///
/// Two hundred and eighty names is more than anyone reads, and the only ways
/// in were the alphabet, a sector, and three fixed sorts. "Companies worth
/// more than a billion" or "priced under ten times earnings" were questions
/// the app held every figure for and could not answer.
///
/// Where each one comes from matters, and is not the same place:
///
///   * [marketCap], [avgVolume] and [pe] ride on the directory document, which
///     is rebuilt three times a trading day.
///   * [price], [changePercent] and [volume] come from the live snapshot the
///     screen already watches, which is a quarter of an hour old at worst.
///
/// So a filter on volume is answering about *today* and a filter on market cap
/// is answering about this morning's rebuild. Mixing them in one list is fine;
/// pretending they are equally fresh would not be, which is why each field
/// says where it reads from.
enum FilterField {
  marketCap,
  price,
  changePercent,
  volume,
  avgVolume,
  pe,
  eps,
  netIncome,
  relativeVolume;

  String labelFor(AppLocalizations l) => switch (this) {
    FilterField.marketCap => l.filterMarketCap,
    FilterField.price => l.filterPrice,
    FilterField.changePercent => l.filterChange,
    FilterField.volume => l.filterVolume,
    FilterField.avgVolume => l.filterAvgVolume,
    FilterField.pe => l.filterPe,
    FilterField.eps => l.filterEps,
    FilterField.netIncome => l.filterProfit,
    FilterField.relativeVolume => l.filterBusy,
  };

  /// What this figure is, in a sentence, for whoever does not already know.
  ///
  /// The chips carry the names the market actually uses — P/E, EPS, market cap
  /// — because somebody who knows what they came for scans for those words and
  /// a paraphrase makes them hunt. The paraphrase goes here instead, under the
  /// one they picked, where it teaches without getting in the way.
  ///
  /// Each also says where the figure comes from, because they are not equally
  /// fresh: price, change and today's volume are the live feed, and the rest
  /// is this morning's rebuild.
  String noteFor(AppLocalizations l) => switch (this) {
    FilterField.marketCap => l.noteMarketCap,
    FilterField.price => l.notePrice,
    FilterField.changePercent => l.noteChange,
    FilterField.volume => l.noteVolume,
    FilterField.avgVolume => l.noteAvgVolume,
    FilterField.pe => l.notePe,
    FilterField.eps => l.noteEps,
    FilterField.netIncome => l.noteProfit,
    FilterField.relativeVolume => l.noteBusy,
  };

  /// A word for the unit, so an empty input box is not a guess.
  String unitFor(AppLocalizations l) => switch (this) {
    FilterField.marketCap => l.filterUnitEgp,
    FilterField.price => l.filterUnitEgp,
    FilterField.changePercent => l.filterUnitPercent,
    FilterField.volume => l.filterUnitShares,
    FilterField.avgVolume => l.filterUnitShares,
    FilterField.pe => l.filterUnitTimes,
    FilterField.eps => l.filterUnitEgp,
    FilterField.netIncome => l.filterUnitMillions,
    FilterField.relativeVolume => l.filterUnitTimes,
  };

  /// The figure for one company, or null when this company has none.
  ///
  /// Null is not zero and must never be filtered as if it were: a company with
  /// no published P/E is not a company with a P/E of nothing. Every absence
  /// here drops the row out of a filtered list rather than sorting it to one
  /// end.
  double? read(CompanySummary company, StockQuote? quote) => switch (this) {
    FilterField.marketCap => company.marketCap,
    FilterField.avgVolume => company.avgVolume30d,
    FilterField.pe => company.pe,
    FilterField.price => quote?.close,
    FilterField.changePercent => quote?.changePercent,
    FilterField.volume => quote?.volume?.toDouble(),
    FilterField.eps => company.eps,
    FilterField.netIncome => company.netIncome,
    // Today against a normal day, which is what "busy" means for a share.
    //
    // Worked out here rather than published, because one half of it is the
    // live volume and the other is this morning's twenty-day median — a
    // precomputed ratio would be stale the moment the session moved. 1 is a
    // normal day; the app's filings feed calls 2 unusual.
    FilterField.relativeVolume => switch ((
      quote?.volume,
      company.medianVolume20d,
    )) {
      (final int traded, final double normal) when normal > 0 =>
        traded / normal,
      _ => null,
    },
  };
}

enum FilterOperator {
  above,
  below,
  between;

  String labelFor(AppLocalizations l) => switch (this) {
    FilterOperator.above => l.filterAbove,
    FilterOperator.below => l.filterBelow,
    FilterOperator.between => l.filterBetween,
  };
}

/// One condition: a field, a comparison, and the number or numbers it needs.
class NumericFilter {
  const NumericFilter({
    required this.field,
    required this.operator,
    required this.low,
    this.high,
  });

  final FilterField field;
  final FilterOperator operator;

  /// For [FilterOperator.above] and [FilterOperator.below] this is the only
  /// bound. For [FilterOperator.between] it is the lower one.
  final double low;
  final double? high;

  /// Both bounds, in order, whichever way round they were typed.
  ///
  /// A reader entering "between 50 and 10" means the same thing as "between 10
  /// and 50", and refusing that is pedantry rather than precision.
  (double, double) get bounds {
    final other = high ?? low;
    return low <= other ? (low, other) : (other, low);
  }

  bool matches(CompanySummary company, StockQuote? quote) {
    final value = field.read(company, quote);
    // A company with no figure is not a company whose figure is zero.
    if (value == null) return false;
    return switch (operator) {
      FilterOperator.above => value > low,
      FilterOperator.below => value < low,
      FilterOperator.between => value >= bounds.$1 && value <= bounds.$2,
    };
  }

  NumericFilter copyWith({
    FilterField? field,
    FilterOperator? operator,
    double? low,
    double? high,
  }) => NumericFilter(
    field: field ?? this.field,
    operator: operator ?? this.operator,
    low: low ?? this.low,
    high: operator == FilterOperator.between ? (high ?? this.high) : null,
  );
}

/// Every filter has to pass, not any of them.
///
/// Two conditions a reader has set are two things they meant, and an OR would
/// widen the list each time they tried to narrow it.
List<CompanySummary> applyFilters(
  List<CompanySummary> companies,
  List<NumericFilter> filters,
  StockQuote? Function(String ticker) quoteFor,
) {
  if (filters.isEmpty) return companies;
  return [
    for (final company in companies)
      if (filters.every((f) => f.matches(company, quoteFor(company.ticker))))
        company,
  ];
}
