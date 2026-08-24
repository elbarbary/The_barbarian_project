// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'calendar.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CalendarDoc _$CalendarDocFromJson(Map<String, dynamic> json) => _CalendarDoc(
  generated: json['generated'] as String?,
  pastDays: (json['past_days'] as num?)?.toInt(),
  events:
      (json['events'] as List<dynamic>?)
          ?.map((e) => CalendarEvent.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <CalendarEvent>[],
);

Map<String, dynamic> _$CalendarDocToJson(_CalendarDoc instance) =>
    <String, dynamic>{
      'generated': instance.generated,
      'past_days': instance.pastDays,
      'events': instance.events,
    };

_CalendarEvent _$CalendarEventFromJson(Map<String, dynamic> json) =>
    _CalendarEvent(
      date: json['date'] as String? ?? '',
      kind: json['kind'] as String? ?? '',
      note: json['note'] as String? ?? '',
      ticker: json['ticker'] as String?,
      title: json['title'] as String? ?? '',
      titleAr: json['title_ar'] as String? ?? '',
      filed: json['filed'] as String? ?? '',
      section: json['section'] as String? ?? '',
      link: json['link'] as String? ?? '',
      id: json['id'] as String? ?? '',
    );

Map<String, dynamic> _$CalendarEventToJson(_CalendarEvent instance) =>
    <String, dynamic>{
      'date': instance.date,
      'kind': instance.kind,
      'note': instance.note,
      'ticker': instance.ticker,
      'title': instance.title,
      'title_ar': instance.titleAr,
      'filed': instance.filed,
      'section': instance.section,
      'link': instance.link,
      'id': instance.id,
    };
