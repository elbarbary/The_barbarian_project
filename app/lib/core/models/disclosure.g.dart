// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'disclosure.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_DisclosureFeed _$DisclosureFeedFromJson(Map<String, dynamic> json) =>
    _DisclosureFeed(
      source: json['source'] == null
          ? null
          : DisclosureSource.fromJson(json['source'] as Map<String, dynamic>),
      items:
          (json['items'] as List<dynamic>?)
              ?.map((e) => Disclosure.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <Disclosure>[],
      threshold: (json['threshold'] as num?)?.toDouble() ?? 2.0,
    );

Map<String, dynamic> _$DisclosureFeedToJson(_DisclosureFeed instance) =>
    <String, dynamic>{
      'source': instance.source,
      'items': instance.items,
      'threshold': instance.threshold,
    };

_DisclosureSource _$DisclosureSourceFromJson(Map<String, dynamic> json) =>
    _DisclosureSource(
      name: json['name'] as String? ?? '',
      nameAr: json['name_ar'] as String? ?? '',
      home: json['home'] as String? ?? '',
    );

Map<String, dynamic> _$DisclosureSourceToJson(_DisclosureSource instance) =>
    <String, dynamic>{
      'name': instance.name,
      'name_ar': instance.nameAr,
      'home': instance.home,
    };

_Disclosure _$DisclosureFromJson(Map<String, dynamic> json) => _Disclosure(
  id: json['id'] as String,
  title: json['title'] as String,
  titleEn: json['title_en'] as String?,
  date: json['date'] as String? ?? '',
  link: json['link'] as String? ?? '',
  tickers:
      (json['tickers'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const <String>[],
  event: json['event'] as String? ?? 'statement',
  eventLabel: json['event_label'] as String? ?? 'Statement',
  eventLabelAr: json['event_label_ar'] as String? ?? '',
  meaning: json['meaning'] as String? ?? '',
  meaningAr: json['meaning_ar'] as String? ?? '',
  weight: json['weight'] as String? ?? 'filed',
  because: json['because'] as String? ?? '',
  evidence: json['evidence'] == null
      ? null
      : DisclosureEvidence.fromJson(json['evidence'] as Map<String, dynamic>),
  by: json['by'] as String? ?? '',
);

Map<String, dynamic> _$DisclosureToJson(_Disclosure instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'title_en': instance.titleEn,
      'date': instance.date,
      'link': instance.link,
      'tickers': instance.tickers,
      'event': instance.event,
      'event_label': instance.eventLabel,
      'event_label_ar': instance.eventLabelAr,
      'meaning': instance.meaning,
      'meaning_ar': instance.meaningAr,
      'weight': instance.weight,
      'because': instance.because,
      'evidence': instance.evidence,
      'by': instance.by,
    };

_DisclosureEvidence _$DisclosureEvidenceFromJson(Map<String, dynamic> json) =>
    _DisclosureEvidence(
      ticker: json['ticker'] as String? ?? '',
      volume: json['volume'] as num? ?? 0,
      medianVolume20d: json['median_volume_20d'] as num? ?? 0,
      ratio: (json['ratio'] as num?)?.toDouble() ?? 0,
      threshold: (json['threshold'] as num?)?.toDouble() ?? 2.0,
      date: json['date'] as String?,
    );

Map<String, dynamic> _$DisclosureEvidenceToJson(_DisclosureEvidence instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'volume': instance.volume,
      'median_volume_20d': instance.medianVolume20d,
      'ratio': instance.ratio,
      'threshold': instance.threshold,
      'date': instance.date,
    };
