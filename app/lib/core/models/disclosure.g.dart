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
  attachments:
      (json['attachments'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
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
      'attachments': instance.attachments,
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

_DisclosureMonth _$DisclosureMonthFromJson(Map<String, dynamic> json) =>
    _DisclosureMonth(
      month: json['month'] as String? ?? '',
      items:
          (json['items'] as List<dynamic>?)
              ?.map((e) => Disclosure.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <Disclosure>[],
    );

Map<String, dynamic> _$DisclosureMonthToJson(_DisclosureMonth instance) =>
    <String, dynamic>{'month': instance.month, 'items': instance.items};

_DisclosureArchive _$DisclosureArchiveFromJson(Map<String, dynamic> json) =>
    _DisclosureArchive(
      months:
          (json['months'] as List<dynamic>?)
              ?.map((e) => ArchivedMonth.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ArchivedMonth>[],
      count: (json['count'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$DisclosureArchiveToJson(_DisclosureArchive instance) =>
    <String, dynamic>{'months': instance.months, 'count': instance.count};

_ArchivedMonth _$ArchivedMonthFromJson(Map<String, dynamic> json) =>
    _ArchivedMonth(
      month: json['month'] as String? ?? '',
      count: (json['count'] as num?)?.toInt() ?? 0,
      first: json['first'] as String? ?? '',
      last: json['last'] as String? ?? '',
      named: (json['named'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$ArchivedMonthToJson(_ArchivedMonth instance) =>
    <String, dynamic>{
      'month': instance.month,
      'count': instance.count,
      'first': instance.first,
      'last': instance.last,
      'named': instance.named,
    };

_CompanyDocuments _$CompanyDocumentsFromJson(Map<String, dynamic> json) =>
    _CompanyDocuments(
      ticker: json['ticker'] as String? ?? '',
      items:
          (json['items'] as List<dynamic>?)
              ?.map((e) => FiledDocument.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <FiledDocument>[],
    );

Map<String, dynamic> _$CompanyDocumentsToJson(_CompanyDocuments instance) =>
    <String, dynamic>{'ticker': instance.ticker, 'items': instance.items};

_FiledDocument _$FiledDocumentFromJson(Map<String, dynamic> json) =>
    _FiledDocument(
      id: json['id'] as String? ?? '',
      date: json['date'] as String? ?? '',
      title: json['title'] as String? ?? '',
      titleEn: json['title_en'] as String?,
      event: json['event'] as String? ?? '',
      eventLabel: json['event_label'] as String? ?? '',
      eventLabelAr: json['event_label_ar'] as String? ?? '',
      link: json['link'] as String? ?? '',
      attachments:
          (json['attachments'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const <String>[],
    );

Map<String, dynamic> _$FiledDocumentToJson(_FiledDocument instance) =>
    <String, dynamic>{
      'id': instance.id,
      'date': instance.date,
      'title': instance.title,
      'title_en': instance.titleEn,
      'event': instance.event,
      'event_label': instance.eventLabel,
      'event_label_ar': instance.eventLabelAr,
      'link': instance.link,
      'attachments': instance.attachments,
    };
