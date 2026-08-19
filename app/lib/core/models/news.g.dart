// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'news.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_NewsFeed _$NewsFeedFromJson(Map<String, dynamic> json) => _NewsFeed(
  sources:
      (json['sources'] as List<dynamic>?)
          ?.map((e) => NewsSource.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <NewsSource>[],
  items:
      (json['items'] as List<dynamic>?)
          ?.map((e) => NewsItem.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <NewsItem>[],
  threshold: (json['threshold'] as num?)?.toDouble() ?? 2.0,
  droppedForAdvice: (json['dropped_for_advice'] as num?)?.toInt() ?? 0,
  unavailable:
      (json['unavailable'] as List<dynamic>?)
          ?.map((e) => NewsOutage.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <NewsOutage>[],
);

Map<String, dynamic> _$NewsFeedToJson(_NewsFeed instance) => <String, dynamic>{
  'sources': instance.sources,
  'items': instance.items,
  'threshold': instance.threshold,
  'dropped_for_advice': instance.droppedForAdvice,
  'unavailable': instance.unavailable,
};

_NewsSource _$NewsSourceFromJson(Map<String, dynamic> json) => _NewsSource(
  id: json['id'] as String,
  name: json['name'] as String,
  nameAr: json['name_ar'] as String?,
  home: json['home'] as String?,
);

Map<String, dynamic> _$NewsSourceToJson(_NewsSource instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'name_ar': instance.nameAr,
      'home': instance.home,
    };

_NewsOutage _$NewsOutageFromJson(Map<String, dynamic> json) => _NewsOutage(
  name: json['name'] as String,
  note: json['note'] as String? ?? '',
);

Map<String, dynamic> _$NewsOutageToJson(_NewsOutage instance) =>
    <String, dynamic>{'name': instance.name, 'note': instance.note};

_NewsItem _$NewsItemFromJson(Map<String, dynamic> json) => _NewsItem(
  id: json['id'] as String,
  source: json['source'] as String,
  headline: json['headline'] as String,
  link: json['link'] as String? ?? '',
  published: json['published'] as String? ?? '',
  tickers:
      (json['tickers'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const <String>[],
  weight: json['weight'] as String? ?? 'market',
  because: json['because'] as String? ?? '',
  evidence: json['evidence'] == null
      ? null
      : NewsEvidence.fromJson(json['evidence'] as Map<String, dynamic>),
);

Map<String, dynamic> _$NewsItemToJson(_NewsItem instance) => <String, dynamic>{
  'id': instance.id,
  'source': instance.source,
  'headline': instance.headline,
  'link': instance.link,
  'published': instance.published,
  'tickers': instance.tickers,
  'weight': instance.weight,
  'because': instance.because,
  'evidence': instance.evidence,
};

_NewsEvidence _$NewsEvidenceFromJson(Map<String, dynamic> json) =>
    _NewsEvidence(
      ticker: json['ticker'] as String,
      volume: json['volume'] as num? ?? 0,
      medianVolume20d: json['median_volume_20d'] as num? ?? 0,
      ratio: (json['ratio'] as num?)?.toDouble() ?? 0,
      threshold: (json['threshold'] as num?)?.toDouble() ?? 2.0,
      date: json['date'] as String?,
    );

Map<String, dynamic> _$NewsEvidenceToJson(_NewsEvidence instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'volume': instance.volume,
      'median_volume_20d': instance.medianVolume20d,
      'ratio': instance.ratio,
      'threshold': instance.threshold,
      'date': instance.date,
    };
