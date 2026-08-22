import 'package:freezed_annotation/freezed_annotation.dart';

part 'rates.freezed.dart';
part 'rates.g.dart';

/// Index levels, the pound and the metals — the numbers people check daily.
///
/// Every row arrives from the pipeline already carrying its sentence, its
/// arithmetic and its yardstick, because the rule that a figure never appears
/// alone applies to these exactly as it does to a company's volume.
@freezed
abstract class RatesDoc with _$RatesDoc {
  const factory RatesDoc({
    @Default(<RateRow>[]) List<RateRow> indices,

    /// The markets and commodities an Egyptian holding is priced against —
    /// the S&P, the Tadawul, oil, copper. Here so a reader can tell whether a
    /// bad day was Egypt or was everywhere, which are different facts.
    @Default(<RateRow>[]) List<RateRow> world,
    @Default(<RateRow>[]) List<RateRow> currencies,
    @Default(<MetalRow>[]) List<MetalRow> metals,
  }) = _RatesDoc;

  const RatesDoc._();

  factory RatesDoc.fromJson(Map<String, dynamic> json) =>
      _$RatesDocFromJson(json);

  bool get isEmpty =>
      indices.isEmpty && world.isEmpty && currencies.isEmpty && metals.isEmpty;
}

@freezed
abstract class RateRow with _$RateRow {
  const factory RateRow({
    @Default('') String id,
    @Default('') String code,
    @Default('') String label,
    @Default('') String plain,
    @Default('') String token,
    @Default('') String workings,
    @Default('') String yardstick,
    @Default('') String source,
    @JsonKey(name: 'label_ar') @Default('') String labelAr,
    @JsonKey(name: 'plain_ar') @Default('') String plainAr,
    @JsonKey(name: 'workings_ar') @Default('') String workingsAr,
    @JsonKey(name: 'yardstick_ar') @Default('') String yardstickAr,
    double? level,
    @JsonKey(name: 'change_percent') double? changePercent,
    double? egp,
  }) = _RateRow;

  const RateRow._();

  /// The sentence in the language being read.
  ///
  /// `rates/latest.json` carried sixteen rows and not one Arabic string — the
  /// substring `_ar` did not appear in the file at all — so every rate on
  /// Today and all three index rows on Home rendered in English on an
  /// otherwise translated screen. The Arabic is written by hand in
  /// `scripts/rates_ar.py`, beside the numbers rather than over them.
  String labelFor(bool arabic) =>
      arabic && labelAr.isNotEmpty ? labelAr : label;

  String plainFor(bool arabic) =>
      arabic && plainAr.isNotEmpty ? plainAr : plain;

  String workingsFor(bool arabic) =>
      arabic && workingsAr.isNotEmpty ? workingsAr : workings;

  String yardstickFor(bool arabic) =>
      arabic && yardstickAr.isNotEmpty ? yardstickAr : yardstick;

  factory RateRow.fromJson(Map<String, dynamic> json) =>
      _$RateRowFromJson(json);
}

@freezed
abstract class MetalRow with _$MetalRow {
  const factory MetalRow({
    @Default('') String id,
    @Default('') String label,
    @Default('') String plain,
    @Default('') String token,
    @Default('') String workings,
    @Default('') String yardstick,
    @Default('') String source,
    @JsonKey(name: 'label_ar') @Default('') String labelAr,
    @JsonKey(name: 'plain_ar') @Default('') String plainAr,
    @JsonKey(name: 'workings_ar') @Default('') String workingsAr,
    @JsonKey(name: 'yardstick_ar') @Default('') String yardstickAr,
    @JsonKey(name: 'egp_gram') double? egpGram,
    @JsonKey(name: 'egp_ounce') double? egpOunce,
    @JsonKey(name: 'usd_ounce') double? usdOunce,

    /// 24, 21 and 18 karat, each with the purity sum that produced it. Only
    /// gold carries these; silver is sold by weight, not by karat.
    @Default(<KaratRow>[]) List<KaratRow> karats,
  }) = _MetalRow;

  const MetalRow._();

  /// The sentence in the language being read.
  ///
  /// `rates/latest.json` carried sixteen rows and not one Arabic string — the
  /// substring `_ar` did not appear in the file at all — so every rate on
  /// Today and all three index rows on Home rendered in English on an
  /// otherwise translated screen. The Arabic is written by hand in
  /// `scripts/rates_ar.py`, beside the numbers rather than over them.
  String labelFor(bool arabic) =>
      arabic && labelAr.isNotEmpty ? labelAr : label;

  String plainFor(bool arabic) =>
      arabic && plainAr.isNotEmpty ? plainAr : plain;

  String workingsFor(bool arabic) =>
      arabic && workingsAr.isNotEmpty ? workingsAr : workings;

  String yardstickFor(bool arabic) =>
      arabic && yardstickAr.isNotEmpty ? yardstickAr : yardstick;

  factory MetalRow.fromJson(Map<String, dynamic> json) =>
      _$MetalRowFromJson(json);
}

@freezed
abstract class KaratRow with _$KaratRow {
  const factory KaratRow({
    @Default(24) int karat,
    @JsonKey(name: 'egp_gram') @Default(0) double egpGram,
    @Default('') String workings,
  }) = _KaratRow;

  factory KaratRow.fromJson(Map<String, dynamic> json) =>
      _$KaratRowFromJson(json);
}
