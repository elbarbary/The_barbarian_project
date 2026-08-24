import 'package:freezed_annotation/freezed_annotation.dart';

part 'filed.freezed.dart';
part 'filed.g.dart';

/// The filings that have already been lodged, indexed by the day they landed.
///
/// The calendar's other half. Above the line is what a company *said* would
/// happen — a dividend date, an assembly it called, results it usually files
/// around now. This is what actually did: the exchange's own record for that
/// day, the same rows a company page shows, turned around so the key is the
/// date instead of the company.
///
/// Month-sharded and fetched only when a month is opened, because twelve
/// months of it is five megabytes and nobody scrolls a year.
@freezed
abstract class FiledMonth with _$FiledMonth {
  const factory FiledMonth({
    @Default('') String month,
    @Default(0) int count,
    @Default(<FiledFiling>[]) List<FiledFiling> items,
  }) = _FiledMonth;

  const FiledMonth._();

  factory FiledMonth.fromJson(Map<String, dynamic> json) =>
      _$FiledMonthFromJson(json);

  static const FiledMonth empty = FiledMonth();

  /// What was filed on one day, in ticker order.
  List<FiledFiling> on(DateTime day) {
    final key = _iso(day);
    return [
      for (final item in items)
        if (item.date == key) item,
    ];
  }

  /// How many filings landed on each day of the month, for the grid.
  Map<String, int> get countsByDay {
    final out = <String, int>{};
    for (final item in items) {
      out.update(item.date, (n) => n + 1, ifAbsent: () => 1);
    }
    return out;
  }

  /// `YYYY-MM-DD`, which is how the builder writes every date in this file.
  static String _iso(DateTime day) => day.toIso8601String().split('T').first;
}

@freezed
abstract class FiledFiling with _$FiledFiling {
  const factory FiledFiling({
    @Default('') String date,
    String? ticker,

    /// The exchange's own heading, Arabic first — that is the language it
    /// files in, and the English one is its own translation, not ours.
    @Default('') String title,
    @JsonKey(name: 'title_en') @Default('') String titleEn,

    /// What kind of filing, when `filing_types.classify_rules` could place it
    /// from a published pattern. Null when it could not, which is honest and
    /// free — the title still says what it is.
    String? type,
    @Default('') String section,
    @Default('') String id,
    @Default('') String link,
  }) = _FiledFiling;

  const FiledFiling._();

  factory FiledFiling.fromJson(Map<String, dynamic> json) =>
      _$FiledFilingFromJson(json);

  String titleFor(bool arabic) {
    if (arabic && title.isNotEmpty) return title;
    return titleEn.isEmpty ? title : titleEn;
  }
}

/// Which months of lodged filings exist to be asked for.
@freezed
abstract class FiledIndex with _$FiledIndex {
  const factory FiledIndex({
    String? generated,
    @Default(<FiledIndexMonth>[]) List<FiledIndexMonth> months,
  }) = _FiledIndex;

  const FiledIndex._();

  factory FiledIndex.fromJson(Map<String, dynamic> json) =>
      _$FiledIndexFromJson(json);

  static const FiledIndex empty = FiledIndex();

  bool has(String month) => months.any((m) => m.month == month);
}

@freezed
abstract class FiledIndexMonth with _$FiledIndexMonth {
  const factory FiledIndexMonth({
    @Default('') String month,
    @Default(0) int count,
    @Default('') String first,
    @Default('') String last,
  }) = _FiledIndexMonth;

  factory FiledIndexMonth.fromJson(Map<String, dynamic> json) =>
      _$FiledIndexMonthFromJson(json);
}
