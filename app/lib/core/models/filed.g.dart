// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'filed.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_FiledMonth _$FiledMonthFromJson(Map<String, dynamic> json) => _FiledMonth(
  month: json['month'] as String? ?? '',
  count: (json['count'] as num?)?.toInt() ?? 0,
  items:
      (json['items'] as List<dynamic>?)
          ?.map((e) => FiledFiling.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <FiledFiling>[],
);

Map<String, dynamic> _$FiledMonthToJson(_FiledMonth instance) =>
    <String, dynamic>{
      'month': instance.month,
      'count': instance.count,
      'items': instance.items,
    };

_FiledFiling _$FiledFilingFromJson(Map<String, dynamic> json) => _FiledFiling(
  date: json['date'] as String? ?? '',
  ticker: json['ticker'] as String?,
  title: json['title'] as String? ?? '',
  titleEn: json['title_en'] as String? ?? '',
  type: json['type'] as String?,
  section: json['section'] as String? ?? '',
  id: json['id'] as String? ?? '',
  link: json['link'] as String? ?? '',
);

Map<String, dynamic> _$FiledFilingToJson(_FiledFiling instance) =>
    <String, dynamic>{
      'date': instance.date,
      'ticker': instance.ticker,
      'title': instance.title,
      'title_en': instance.titleEn,
      'type': instance.type,
      'section': instance.section,
      'id': instance.id,
      'link': instance.link,
    };

_FiledIndex _$FiledIndexFromJson(Map<String, dynamic> json) => _FiledIndex(
  generated: json['generated'] as String?,
  months:
      (json['months'] as List<dynamic>?)
          ?.map((e) => FiledIndexMonth.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <FiledIndexMonth>[],
);

Map<String, dynamic> _$FiledIndexToJson(_FiledIndex instance) =>
    <String, dynamic>{
      'generated': instance.generated,
      'months': instance.months,
    };

_FiledIndexMonth _$FiledIndexMonthFromJson(Map<String, dynamic> json) =>
    _FiledIndexMonth(
      month: json['month'] as String? ?? '',
      count: (json['count'] as num?)?.toInt() ?? 0,
      first: json['first'] as String? ?? '',
      last: json['last'] as String? ?? '',
    );

Map<String, dynamic> _$FiledIndexMonthToJson(_FiledIndexMonth instance) =>
    <String, dynamic>{
      'month': instance.month,
      'count': instance.count,
      'first': instance.first,
      'last': instance.last,
    };
