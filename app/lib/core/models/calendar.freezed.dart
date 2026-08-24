// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'calendar.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CalendarDoc {

 String? get generated;/// How many days of already-passed events the document keeps for context,
/// so a month view has something to show around today rather than only the
/// handful of things still ahead. Null when the document is the full
/// history.
@JsonKey(name: 'past_days') int? get pastDays; List<CalendarEvent> get events;
/// Create a copy of CalendarDoc
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CalendarDocCopyWith<CalendarDoc> get copyWith => _$CalendarDocCopyWithImpl<CalendarDoc>(this as CalendarDoc, _$identity);

  /// Serializes this CalendarDoc to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CalendarDoc&&(identical(other.generated, generated) || other.generated == generated)&&(identical(other.pastDays, pastDays) || other.pastDays == pastDays)&&const DeepCollectionEquality().equals(other.events, events));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,generated,pastDays,const DeepCollectionEquality().hash(events));

@override
String toString() {
  return 'CalendarDoc(generated: $generated, pastDays: $pastDays, events: $events)';
}


}

/// @nodoc
abstract mixin class $CalendarDocCopyWith<$Res>  {
  factory $CalendarDocCopyWith(CalendarDoc value, $Res Function(CalendarDoc) _then) = _$CalendarDocCopyWithImpl;
@useResult
$Res call({
 String? generated,@JsonKey(name: 'past_days') int? pastDays, List<CalendarEvent> events
});




}
/// @nodoc
class _$CalendarDocCopyWithImpl<$Res>
    implements $CalendarDocCopyWith<$Res> {
  _$CalendarDocCopyWithImpl(this._self, this._then);

  final CalendarDoc _self;
  final $Res Function(CalendarDoc) _then;

/// Create a copy of CalendarDoc
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? generated = freezed,Object? pastDays = freezed,Object? events = null,}) {
  return _then(_self.copyWith(
generated: freezed == generated ? _self.generated : generated // ignore: cast_nullable_to_non_nullable
as String?,pastDays: freezed == pastDays ? _self.pastDays : pastDays // ignore: cast_nullable_to_non_nullable
as int?,events: null == events ? _self.events : events // ignore: cast_nullable_to_non_nullable
as List<CalendarEvent>,
  ));
}

}


/// Adds pattern-matching-related methods to [CalendarDoc].
extension CalendarDocPatterns on CalendarDoc {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CalendarDoc value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CalendarDoc() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CalendarDoc value)  $default,){
final _that = this;
switch (_that) {
case _CalendarDoc():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CalendarDoc value)?  $default,){
final _that = this;
switch (_that) {
case _CalendarDoc() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? generated, @JsonKey(name: 'past_days')  int? pastDays,  List<CalendarEvent> events)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CalendarDoc() when $default != null:
return $default(_that.generated,_that.pastDays,_that.events);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? generated, @JsonKey(name: 'past_days')  int? pastDays,  List<CalendarEvent> events)  $default,) {final _that = this;
switch (_that) {
case _CalendarDoc():
return $default(_that.generated,_that.pastDays,_that.events);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? generated, @JsonKey(name: 'past_days')  int? pastDays,  List<CalendarEvent> events)?  $default,) {final _that = this;
switch (_that) {
case _CalendarDoc() when $default != null:
return $default(_that.generated,_that.pastDays,_that.events);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CalendarDoc extends CalendarDoc {
  const _CalendarDoc({this.generated, @JsonKey(name: 'past_days') this.pastDays, final  List<CalendarEvent> events = const <CalendarEvent>[]}): _events = events,super._();
  factory _CalendarDoc.fromJson(Map<String, dynamic> json) => _$CalendarDocFromJson(json);

@override final  String? generated;
/// How many days of already-passed events the document keeps for context,
/// so a month view has something to show around today rather than only the
/// handful of things still ahead. Null when the document is the full
/// history.
@override@JsonKey(name: 'past_days') final  int? pastDays;
 final  List<CalendarEvent> _events;
@override@JsonKey() List<CalendarEvent> get events {
  if (_events is EqualUnmodifiableListView) return _events;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_events);
}


/// Create a copy of CalendarDoc
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CalendarDocCopyWith<_CalendarDoc> get copyWith => __$CalendarDocCopyWithImpl<_CalendarDoc>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CalendarDocToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CalendarDoc&&(identical(other.generated, generated) || other.generated == generated)&&(identical(other.pastDays, pastDays) || other.pastDays == pastDays)&&const DeepCollectionEquality().equals(other._events, _events));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,generated,pastDays,const DeepCollectionEquality().hash(_events));

@override
String toString() {
  return 'CalendarDoc(generated: $generated, pastDays: $pastDays, events: $events)';
}


}

/// @nodoc
abstract mixin class _$CalendarDocCopyWith<$Res> implements $CalendarDocCopyWith<$Res> {
  factory _$CalendarDocCopyWith(_CalendarDoc value, $Res Function(_CalendarDoc) _then) = __$CalendarDocCopyWithImpl;
@override @useResult
$Res call({
 String? generated,@JsonKey(name: 'past_days') int? pastDays, List<CalendarEvent> events
});




}
/// @nodoc
class __$CalendarDocCopyWithImpl<$Res>
    implements _$CalendarDocCopyWith<$Res> {
  __$CalendarDocCopyWithImpl(this._self, this._then);

  final _CalendarDoc _self;
  final $Res Function(_CalendarDoc) _then;

/// Create a copy of CalendarDoc
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? generated = freezed,Object? pastDays = freezed,Object? events = null,}) {
  return _then(_CalendarDoc(
generated: freezed == generated ? _self.generated : generated // ignore: cast_nullable_to_non_nullable
as String?,pastDays: freezed == pastDays ? _self.pastDays : pastDays // ignore: cast_nullable_to_non_nullable
as int?,events: null == events ? _self._events : events // ignore: cast_nullable_to_non_nullable
as List<CalendarEvent>,
  ));
}


}


/// @nodoc
mixin _$CalendarEvent {

 String get date; String get kind;/// The one line the exchange wrote, in English — "Cash dividend payment".
 String get note; String? get ticker; String get title;@JsonKey(name: 'title_ar') String get titleAr;/// When the announcing filing was lodged — always before [date].
 String get filed; String get section; String get link; String get id;/// True only for a date nobody filed — see [CalendarKind.resultsExpected].
/// Every other row on this screen is a date an issuer published, and the
/// two must never be shown as if they were the same kind of thing.
 bool get estimated;/// The period the expected filing would report, and the range of dates
/// this company has historically filed it in. Empty on a filed event.
@JsonKey(name: 'period_end') String get periodEnd;@JsonKey(name: 'window_start') String get windowStart;@JsonKey(name: 'window_end') String get windowEnd;/// How many past filings of the same period the window is drawn from.
/// Shown on screen: a window from three years is a weaker claim than one
/// from twelve, and the reader is told which they are looking at.
 int get observations;
/// Create a copy of CalendarEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CalendarEventCopyWith<CalendarEvent> get copyWith => _$CalendarEventCopyWithImpl<CalendarEvent>(this as CalendarEvent, _$identity);

  /// Serializes this CalendarEvent to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CalendarEvent&&(identical(other.date, date) || other.date == date)&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.note, note) || other.note == note)&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.title, title) || other.title == title)&&(identical(other.titleAr, titleAr) || other.titleAr == titleAr)&&(identical(other.filed, filed) || other.filed == filed)&&(identical(other.section, section) || other.section == section)&&(identical(other.link, link) || other.link == link)&&(identical(other.id, id) || other.id == id)&&(identical(other.estimated, estimated) || other.estimated == estimated)&&(identical(other.periodEnd, periodEnd) || other.periodEnd == periodEnd)&&(identical(other.windowStart, windowStart) || other.windowStart == windowStart)&&(identical(other.windowEnd, windowEnd) || other.windowEnd == windowEnd)&&(identical(other.observations, observations) || other.observations == observations));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,kind,note,ticker,title,titleAr,filed,section,link,id,estimated,periodEnd,windowStart,windowEnd,observations);

@override
String toString() {
  return 'CalendarEvent(date: $date, kind: $kind, note: $note, ticker: $ticker, title: $title, titleAr: $titleAr, filed: $filed, section: $section, link: $link, id: $id, estimated: $estimated, periodEnd: $periodEnd, windowStart: $windowStart, windowEnd: $windowEnd, observations: $observations)';
}


}

/// @nodoc
abstract mixin class $CalendarEventCopyWith<$Res>  {
  factory $CalendarEventCopyWith(CalendarEvent value, $Res Function(CalendarEvent) _then) = _$CalendarEventCopyWithImpl;
@useResult
$Res call({
 String date, String kind, String note, String? ticker, String title,@JsonKey(name: 'title_ar') String titleAr, String filed, String section, String link, String id, bool estimated,@JsonKey(name: 'period_end') String periodEnd,@JsonKey(name: 'window_start') String windowStart,@JsonKey(name: 'window_end') String windowEnd, int observations
});




}
/// @nodoc
class _$CalendarEventCopyWithImpl<$Res>
    implements $CalendarEventCopyWith<$Res> {
  _$CalendarEventCopyWithImpl(this._self, this._then);

  final CalendarEvent _self;
  final $Res Function(CalendarEvent) _then;

/// Create a copy of CalendarEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? kind = null,Object? note = null,Object? ticker = freezed,Object? title = null,Object? titleAr = null,Object? filed = null,Object? section = null,Object? link = null,Object? id = null,Object? estimated = null,Object? periodEnd = null,Object? windowStart = null,Object? windowEnd = null,Object? observations = null,}) {
  return _then(_self.copyWith(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,note: null == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String,ticker: freezed == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String?,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,titleAr: null == titleAr ? _self.titleAr : titleAr // ignore: cast_nullable_to_non_nullable
as String,filed: null == filed ? _self.filed : filed // ignore: cast_nullable_to_non_nullable
as String,section: null == section ? _self.section : section // ignore: cast_nullable_to_non_nullable
as String,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,estimated: null == estimated ? _self.estimated : estimated // ignore: cast_nullable_to_non_nullable
as bool,periodEnd: null == periodEnd ? _self.periodEnd : periodEnd // ignore: cast_nullable_to_non_nullable
as String,windowStart: null == windowStart ? _self.windowStart : windowStart // ignore: cast_nullable_to_non_nullable
as String,windowEnd: null == windowEnd ? _self.windowEnd : windowEnd // ignore: cast_nullable_to_non_nullable
as String,observations: null == observations ? _self.observations : observations // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [CalendarEvent].
extension CalendarEventPatterns on CalendarEvent {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CalendarEvent value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CalendarEvent() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CalendarEvent value)  $default,){
final _that = this;
switch (_that) {
case _CalendarEvent():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CalendarEvent value)?  $default,){
final _that = this;
switch (_that) {
case _CalendarEvent() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  String kind,  String note,  String? ticker,  String title, @JsonKey(name: 'title_ar')  String titleAr,  String filed,  String section,  String link,  String id,  bool estimated, @JsonKey(name: 'period_end')  String periodEnd, @JsonKey(name: 'window_start')  String windowStart, @JsonKey(name: 'window_end')  String windowEnd,  int observations)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CalendarEvent() when $default != null:
return $default(_that.date,_that.kind,_that.note,_that.ticker,_that.title,_that.titleAr,_that.filed,_that.section,_that.link,_that.id,_that.estimated,_that.periodEnd,_that.windowStart,_that.windowEnd,_that.observations);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  String kind,  String note,  String? ticker,  String title, @JsonKey(name: 'title_ar')  String titleAr,  String filed,  String section,  String link,  String id,  bool estimated, @JsonKey(name: 'period_end')  String periodEnd, @JsonKey(name: 'window_start')  String windowStart, @JsonKey(name: 'window_end')  String windowEnd,  int observations)  $default,) {final _that = this;
switch (_that) {
case _CalendarEvent():
return $default(_that.date,_that.kind,_that.note,_that.ticker,_that.title,_that.titleAr,_that.filed,_that.section,_that.link,_that.id,_that.estimated,_that.periodEnd,_that.windowStart,_that.windowEnd,_that.observations);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  String kind,  String note,  String? ticker,  String title, @JsonKey(name: 'title_ar')  String titleAr,  String filed,  String section,  String link,  String id,  bool estimated, @JsonKey(name: 'period_end')  String periodEnd, @JsonKey(name: 'window_start')  String windowStart, @JsonKey(name: 'window_end')  String windowEnd,  int observations)?  $default,) {final _that = this;
switch (_that) {
case _CalendarEvent() when $default != null:
return $default(_that.date,_that.kind,_that.note,_that.ticker,_that.title,_that.titleAr,_that.filed,_that.section,_that.link,_that.id,_that.estimated,_that.periodEnd,_that.windowStart,_that.windowEnd,_that.observations);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CalendarEvent extends CalendarEvent {
  const _CalendarEvent({this.date = '', this.kind = '', this.note = '', this.ticker, this.title = '', @JsonKey(name: 'title_ar') this.titleAr = '', this.filed = '', this.section = '', this.link = '', this.id = '', this.estimated = false, @JsonKey(name: 'period_end') this.periodEnd = '', @JsonKey(name: 'window_start') this.windowStart = '', @JsonKey(name: 'window_end') this.windowEnd = '', this.observations = 0}): super._();
  factory _CalendarEvent.fromJson(Map<String, dynamic> json) => _$CalendarEventFromJson(json);

@override@JsonKey() final  String date;
@override@JsonKey() final  String kind;
/// The one line the exchange wrote, in English — "Cash dividend payment".
@override@JsonKey() final  String note;
@override final  String? ticker;
@override@JsonKey() final  String title;
@override@JsonKey(name: 'title_ar') final  String titleAr;
/// When the announcing filing was lodged — always before [date].
@override@JsonKey() final  String filed;
@override@JsonKey() final  String section;
@override@JsonKey() final  String link;
@override@JsonKey() final  String id;
/// True only for a date nobody filed — see [CalendarKind.resultsExpected].
/// Every other row on this screen is a date an issuer published, and the
/// two must never be shown as if they were the same kind of thing.
@override@JsonKey() final  bool estimated;
/// The period the expected filing would report, and the range of dates
/// this company has historically filed it in. Empty on a filed event.
@override@JsonKey(name: 'period_end') final  String periodEnd;
@override@JsonKey(name: 'window_start') final  String windowStart;
@override@JsonKey(name: 'window_end') final  String windowEnd;
/// How many past filings of the same period the window is drawn from.
/// Shown on screen: a window from three years is a weaker claim than one
/// from twelve, and the reader is told which they are looking at.
@override@JsonKey() final  int observations;

/// Create a copy of CalendarEvent
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CalendarEventCopyWith<_CalendarEvent> get copyWith => __$CalendarEventCopyWithImpl<_CalendarEvent>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CalendarEventToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CalendarEvent&&(identical(other.date, date) || other.date == date)&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.note, note) || other.note == note)&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.title, title) || other.title == title)&&(identical(other.titleAr, titleAr) || other.titleAr == titleAr)&&(identical(other.filed, filed) || other.filed == filed)&&(identical(other.section, section) || other.section == section)&&(identical(other.link, link) || other.link == link)&&(identical(other.id, id) || other.id == id)&&(identical(other.estimated, estimated) || other.estimated == estimated)&&(identical(other.periodEnd, periodEnd) || other.periodEnd == periodEnd)&&(identical(other.windowStart, windowStart) || other.windowStart == windowStart)&&(identical(other.windowEnd, windowEnd) || other.windowEnd == windowEnd)&&(identical(other.observations, observations) || other.observations == observations));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,kind,note,ticker,title,titleAr,filed,section,link,id,estimated,periodEnd,windowStart,windowEnd,observations);

@override
String toString() {
  return 'CalendarEvent(date: $date, kind: $kind, note: $note, ticker: $ticker, title: $title, titleAr: $titleAr, filed: $filed, section: $section, link: $link, id: $id, estimated: $estimated, periodEnd: $periodEnd, windowStart: $windowStart, windowEnd: $windowEnd, observations: $observations)';
}


}

/// @nodoc
abstract mixin class _$CalendarEventCopyWith<$Res> implements $CalendarEventCopyWith<$Res> {
  factory _$CalendarEventCopyWith(_CalendarEvent value, $Res Function(_CalendarEvent) _then) = __$CalendarEventCopyWithImpl;
@override @useResult
$Res call({
 String date, String kind, String note, String? ticker, String title,@JsonKey(name: 'title_ar') String titleAr, String filed, String section, String link, String id, bool estimated,@JsonKey(name: 'period_end') String periodEnd,@JsonKey(name: 'window_start') String windowStart,@JsonKey(name: 'window_end') String windowEnd, int observations
});




}
/// @nodoc
class __$CalendarEventCopyWithImpl<$Res>
    implements _$CalendarEventCopyWith<$Res> {
  __$CalendarEventCopyWithImpl(this._self, this._then);

  final _CalendarEvent _self;
  final $Res Function(_CalendarEvent) _then;

/// Create a copy of CalendarEvent
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? kind = null,Object? note = null,Object? ticker = freezed,Object? title = null,Object? titleAr = null,Object? filed = null,Object? section = null,Object? link = null,Object? id = null,Object? estimated = null,Object? periodEnd = null,Object? windowStart = null,Object? windowEnd = null,Object? observations = null,}) {
  return _then(_CalendarEvent(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,note: null == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String,ticker: freezed == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String?,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,titleAr: null == titleAr ? _self.titleAr : titleAr // ignore: cast_nullable_to_non_nullable
as String,filed: null == filed ? _self.filed : filed // ignore: cast_nullable_to_non_nullable
as String,section: null == section ? _self.section : section // ignore: cast_nullable_to_non_nullable
as String,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,estimated: null == estimated ? _self.estimated : estimated // ignore: cast_nullable_to_non_nullable
as bool,periodEnd: null == periodEnd ? _self.periodEnd : periodEnd // ignore: cast_nullable_to_non_nullable
as String,windowStart: null == windowStart ? _self.windowStart : windowStart // ignore: cast_nullable_to_non_nullable
as String,windowEnd: null == windowEnd ? _self.windowEnd : windowEnd // ignore: cast_nullable_to_non_nullable
as String,observations: null == observations ? _self.observations : observations // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
