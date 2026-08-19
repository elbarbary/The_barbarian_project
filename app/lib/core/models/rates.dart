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
    @Default(<RateRow>[]) List<RateRow> currencies,
    @Default(<MetalRow>[]) List<MetalRow> metals,
  }) = _RatesDoc;

  const RatesDoc._();

  factory RatesDoc.fromJson(Map<String, dynamic> json) =>
      _$RatesDocFromJson(json);

  bool get isEmpty => indices.isEmpty && currencies.isEmpty && metals.isEmpty;
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
    double? level,
    @JsonKey(name: 'change_percent') double? changePercent,
    double? egp,
  }) = _RateRow;

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
    @JsonKey(name: 'egp_gram') double? egpGram,
    @JsonKey(name: 'egp_ounce') double? egpOunce,
    @JsonKey(name: 'usd_ounce') double? usdOunce,

    /// 24, 21 and 18 karat, each with the purity sum that produced it. Only
    /// gold carries these; silver is sold by weight, not by karat.
    @Default(<KaratRow>[]) List<KaratRow> karats,
  }) = _MetalRow;

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
