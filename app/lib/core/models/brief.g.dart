// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'brief.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CompanyBrief _$CompanyBriefFromJson(Map<String, dynamic> json) =>
    _CompanyBrief(
      ticker: json['ticker'] as String? ?? '',
      history: json['history'] as String? ?? '',
      historyAr: json['history_ar'] as String? ?? '',
      story: json['story'] as String? ?? '',
      storyAr: json['story_ar'] as String? ?? '',
      storySource: json['story_source'] as String? ?? '',
      storyUrl: json['story_url'] as String? ?? '',
      plans:
          (json['plans'] as List<dynamic>?)
              ?.map((e) => BriefPlan.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <BriefPlan>[],
      record: json['record'] == null
          ? null
          : BriefRecord.fromJson(json['record'] as Map<String, dynamic>),
      generated: json['generated'] as String?,
    );

Map<String, dynamic> _$CompanyBriefToJson(_CompanyBrief instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'history': instance.history,
      'history_ar': instance.historyAr,
      'story': instance.story,
      'story_ar': instance.storyAr,
      'story_source': instance.storySource,
      'story_url': instance.storyUrl,
      'plans': instance.plans,
      'record': instance.record,
      'generated': instance.generated,
    };

_BriefPlan _$BriefPlanFromJson(Map<String, dynamic> json) => _BriefPlan(
  text: json['text'] as String? ?? '',
  textAr: json['text_ar'] as String? ?? '',
  id: json['id'] as String? ?? '',
  date: json['date'] as String? ?? '',
  link: json['link'] as String? ?? '',
  title: json['title'] as String? ?? '',
  titleAr: json['title_ar'] as String? ?? '',
);

Map<String, dynamic> _$BriefPlanToJson(_BriefPlan instance) =>
    <String, dynamic>{
      'text': instance.text,
      'text_ar': instance.textAr,
      'id': instance.id,
      'date': instance.date,
      'link': instance.link,
      'title': instance.title,
      'title_ar': instance.titleAr,
    };

_BriefRecord _$BriefRecordFromJson(Map<String, dynamic> json) => _BriefRecord(
  filings: (json['filings'] as num?)?.toInt() ?? 0,
  firstFiling: json['first_filing'] as String?,
  suspensions: (json['trading_suspensions'] as num?)?.toInt() ?? 0,
  resumptions: (json['trading_resumptions'] as num?)?.toInt() ?? 0,
  capitalIncreases: (json['capital_increases'] as num?)?.toInt() ?? 0,
  assemblies: (json['general_assemblies'] as num?)?.toInt() ?? 0,
  periodsReported: (json['periods_reported'] as num?)?.toInt() ?? 0,
  lossMakingPeriods: (json['loss_making_periods'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$BriefRecordToJson(_BriefRecord instance) =>
    <String, dynamic>{
      'filings': instance.filings,
      'first_filing': instance.firstFiling,
      'trading_suspensions': instance.suspensions,
      'trading_resumptions': instance.resumptions,
      'capital_increases': instance.capitalIncreases,
      'general_assemblies': instance.assemblies,
      'periods_reported': instance.periodsReported,
      'loss_making_periods': instance.lossMakingPeriods,
    };
