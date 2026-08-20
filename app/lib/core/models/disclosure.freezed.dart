// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'disclosure.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$DisclosureFeed {

 DisclosureSource? get source; List<Disclosure> get items;/// The published volume band a filing is weighed against.
 double get threshold;
/// Create a copy of DisclosureFeed
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DisclosureFeedCopyWith<DisclosureFeed> get copyWith => _$DisclosureFeedCopyWithImpl<DisclosureFeed>(this as DisclosureFeed, _$identity);

  /// Serializes this DisclosureFeed to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DisclosureFeed&&(identical(other.source, source) || other.source == source)&&const DeepCollectionEquality().equals(other.items, items)&&(identical(other.threshold, threshold) || other.threshold == threshold));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,source,const DeepCollectionEquality().hash(items),threshold);

@override
String toString() {
  return 'DisclosureFeed(source: $source, items: $items, threshold: $threshold)';
}


}

/// @nodoc
abstract mixin class $DisclosureFeedCopyWith<$Res>  {
  factory $DisclosureFeedCopyWith(DisclosureFeed value, $Res Function(DisclosureFeed) _then) = _$DisclosureFeedCopyWithImpl;
@useResult
$Res call({
 DisclosureSource? source, List<Disclosure> items, double threshold
});


$DisclosureSourceCopyWith<$Res>? get source;

}
/// @nodoc
class _$DisclosureFeedCopyWithImpl<$Res>
    implements $DisclosureFeedCopyWith<$Res> {
  _$DisclosureFeedCopyWithImpl(this._self, this._then);

  final DisclosureFeed _self;
  final $Res Function(DisclosureFeed) _then;

/// Create a copy of DisclosureFeed
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? source = freezed,Object? items = null,Object? threshold = null,}) {
  return _then(_self.copyWith(
source: freezed == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as DisclosureSource?,items: null == items ? _self.items : items // ignore: cast_nullable_to_non_nullable
as List<Disclosure>,threshold: null == threshold ? _self.threshold : threshold // ignore: cast_nullable_to_non_nullable
as double,
  ));
}
/// Create a copy of DisclosureFeed
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DisclosureSourceCopyWith<$Res>? get source {
    if (_self.source == null) {
    return null;
  }

  return $DisclosureSourceCopyWith<$Res>(_self.source!, (value) {
    return _then(_self.copyWith(source: value));
  });
}
}


/// Adds pattern-matching-related methods to [DisclosureFeed].
extension DisclosureFeedPatterns on DisclosureFeed {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DisclosureFeed value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DisclosureFeed() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DisclosureFeed value)  $default,){
final _that = this;
switch (_that) {
case _DisclosureFeed():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DisclosureFeed value)?  $default,){
final _that = this;
switch (_that) {
case _DisclosureFeed() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( DisclosureSource? source,  List<Disclosure> items,  double threshold)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DisclosureFeed() when $default != null:
return $default(_that.source,_that.items,_that.threshold);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( DisclosureSource? source,  List<Disclosure> items,  double threshold)  $default,) {final _that = this;
switch (_that) {
case _DisclosureFeed():
return $default(_that.source,_that.items,_that.threshold);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( DisclosureSource? source,  List<Disclosure> items,  double threshold)?  $default,) {final _that = this;
switch (_that) {
case _DisclosureFeed() when $default != null:
return $default(_that.source,_that.items,_that.threshold);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DisclosureFeed extends DisclosureFeed {
  const _DisclosureFeed({this.source, final  List<Disclosure> items = const <Disclosure>[], this.threshold = 2.0}): _items = items,super._();
  factory _DisclosureFeed.fromJson(Map<String, dynamic> json) => _$DisclosureFeedFromJson(json);

@override final  DisclosureSource? source;
 final  List<Disclosure> _items;
@override@JsonKey() List<Disclosure> get items {
  if (_items is EqualUnmodifiableListView) return _items;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_items);
}

/// The published volume band a filing is weighed against.
@override@JsonKey() final  double threshold;

/// Create a copy of DisclosureFeed
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DisclosureFeedCopyWith<_DisclosureFeed> get copyWith => __$DisclosureFeedCopyWithImpl<_DisclosureFeed>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DisclosureFeedToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DisclosureFeed&&(identical(other.source, source) || other.source == source)&&const DeepCollectionEquality().equals(other._items, _items)&&(identical(other.threshold, threshold) || other.threshold == threshold));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,source,const DeepCollectionEquality().hash(_items),threshold);

@override
String toString() {
  return 'DisclosureFeed(source: $source, items: $items, threshold: $threshold)';
}


}

/// @nodoc
abstract mixin class _$DisclosureFeedCopyWith<$Res> implements $DisclosureFeedCopyWith<$Res> {
  factory _$DisclosureFeedCopyWith(_DisclosureFeed value, $Res Function(_DisclosureFeed) _then) = __$DisclosureFeedCopyWithImpl;
@override @useResult
$Res call({
 DisclosureSource? source, List<Disclosure> items, double threshold
});


@override $DisclosureSourceCopyWith<$Res>? get source;

}
/// @nodoc
class __$DisclosureFeedCopyWithImpl<$Res>
    implements _$DisclosureFeedCopyWith<$Res> {
  __$DisclosureFeedCopyWithImpl(this._self, this._then);

  final _DisclosureFeed _self;
  final $Res Function(_DisclosureFeed) _then;

/// Create a copy of DisclosureFeed
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? source = freezed,Object? items = null,Object? threshold = null,}) {
  return _then(_DisclosureFeed(
source: freezed == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as DisclosureSource?,items: null == items ? _self._items : items // ignore: cast_nullable_to_non_nullable
as List<Disclosure>,threshold: null == threshold ? _self.threshold : threshold // ignore: cast_nullable_to_non_nullable
as double,
  ));
}

/// Create a copy of DisclosureFeed
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DisclosureSourceCopyWith<$Res>? get source {
    if (_self.source == null) {
    return null;
  }

  return $DisclosureSourceCopyWith<$Res>(_self.source!, (value) {
    return _then(_self.copyWith(source: value));
  });
}
}


/// @nodoc
mixin _$DisclosureSource {

 String get name;@JsonKey(name: 'name_ar') String get nameAr; String get home;
/// Create a copy of DisclosureSource
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DisclosureSourceCopyWith<DisclosureSource> get copyWith => _$DisclosureSourceCopyWithImpl<DisclosureSource>(this as DisclosureSource, _$identity);

  /// Serializes this DisclosureSource to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DisclosureSource&&(identical(other.name, name) || other.name == name)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.home, home) || other.home == home));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,nameAr,home);

@override
String toString() {
  return 'DisclosureSource(name: $name, nameAr: $nameAr, home: $home)';
}


}

/// @nodoc
abstract mixin class $DisclosureSourceCopyWith<$Res>  {
  factory $DisclosureSourceCopyWith(DisclosureSource value, $Res Function(DisclosureSource) _then) = _$DisclosureSourceCopyWithImpl;
@useResult
$Res call({
 String name,@JsonKey(name: 'name_ar') String nameAr, String home
});




}
/// @nodoc
class _$DisclosureSourceCopyWithImpl<$Res>
    implements $DisclosureSourceCopyWith<$Res> {
  _$DisclosureSourceCopyWithImpl(this._self, this._then);

  final DisclosureSource _self;
  final $Res Function(DisclosureSource) _then;

/// Create a copy of DisclosureSource
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = null,Object? nameAr = null,Object? home = null,}) {
  return _then(_self.copyWith(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,nameAr: null == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String,home: null == home ? _self.home : home // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [DisclosureSource].
extension DisclosureSourcePatterns on DisclosureSource {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DisclosureSource value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DisclosureSource() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DisclosureSource value)  $default,){
final _that = this;
switch (_that) {
case _DisclosureSource():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DisclosureSource value)?  $default,){
final _that = this;
switch (_that) {
case _DisclosureSource() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String name, @JsonKey(name: 'name_ar')  String nameAr,  String home)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DisclosureSource() when $default != null:
return $default(_that.name,_that.nameAr,_that.home);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String name, @JsonKey(name: 'name_ar')  String nameAr,  String home)  $default,) {final _that = this;
switch (_that) {
case _DisclosureSource():
return $default(_that.name,_that.nameAr,_that.home);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String name, @JsonKey(name: 'name_ar')  String nameAr,  String home)?  $default,) {final _that = this;
switch (_that) {
case _DisclosureSource() when $default != null:
return $default(_that.name,_that.nameAr,_that.home);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DisclosureSource implements DisclosureSource {
  const _DisclosureSource({this.name = '', @JsonKey(name: 'name_ar') this.nameAr = '', this.home = ''});
  factory _DisclosureSource.fromJson(Map<String, dynamic> json) => _$DisclosureSourceFromJson(json);

@override@JsonKey() final  String name;
@override@JsonKey(name: 'name_ar') final  String nameAr;
@override@JsonKey() final  String home;

/// Create a copy of DisclosureSource
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DisclosureSourceCopyWith<_DisclosureSource> get copyWith => __$DisclosureSourceCopyWithImpl<_DisclosureSource>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DisclosureSourceToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DisclosureSource&&(identical(other.name, name) || other.name == name)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.home, home) || other.home == home));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,nameAr,home);

@override
String toString() {
  return 'DisclosureSource(name: $name, nameAr: $nameAr, home: $home)';
}


}

/// @nodoc
abstract mixin class _$DisclosureSourceCopyWith<$Res> implements $DisclosureSourceCopyWith<$Res> {
  factory _$DisclosureSourceCopyWith(_DisclosureSource value, $Res Function(_DisclosureSource) _then) = __$DisclosureSourceCopyWithImpl;
@override @useResult
$Res call({
 String name,@JsonKey(name: 'name_ar') String nameAr, String home
});




}
/// @nodoc
class __$DisclosureSourceCopyWithImpl<$Res>
    implements _$DisclosureSourceCopyWith<$Res> {
  __$DisclosureSourceCopyWithImpl(this._self, this._then);

  final _DisclosureSource _self;
  final $Res Function(_DisclosureSource) _then;

/// Create a copy of DisclosureSource
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = null,Object? nameAr = null,Object? home = null,}) {
  return _then(_DisclosureSource(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,nameAr: null == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String,home: null == home ? _self.home : home // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$Disclosure {

 String get id; String get title;/// The exchange files in Arabic without exception. This is the cached
/// English, beside it rather than over it.
@JsonKey(name: 'title_en') String? get titleEn; String get date; String get link;/// Stamped into the title by the exchange as `(TICKER.CA)`.
 List<String> get tickers;/// Which kind of filing this is, from a closed list.
 String get event;@JsonKey(name: 'event_label') String get eventLabel;@JsonKey(name: 'event_label_ar') String get eventLabelAr;/// What this kind of filing does to somebody holding the share. Written by
/// a person once per type and reviewed — never generated per filing.
 String get meaning;@JsonKey(name: 'meaning_ar') String get meaningAr;/// check · filed · other. Never a view on the filing itself.
 String get weight; String get because; DisclosureEvidence? get evidence;/// Whether the type came from a published pattern or from the model.
/// Carried so a mislabelled filing can be traced to which decided it.
 String get by;
/// Create a copy of Disclosure
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DisclosureCopyWith<Disclosure> get copyWith => _$DisclosureCopyWithImpl<Disclosure>(this as Disclosure, _$identity);

  /// Serializes this Disclosure to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Disclosure&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.titleEn, titleEn) || other.titleEn == titleEn)&&(identical(other.date, date) || other.date == date)&&(identical(other.link, link) || other.link == link)&&const DeepCollectionEquality().equals(other.tickers, tickers)&&(identical(other.event, event) || other.event == event)&&(identical(other.eventLabel, eventLabel) || other.eventLabel == eventLabel)&&(identical(other.eventLabelAr, eventLabelAr) || other.eventLabelAr == eventLabelAr)&&(identical(other.meaning, meaning) || other.meaning == meaning)&&(identical(other.meaningAr, meaningAr) || other.meaningAr == meaningAr)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.because, because) || other.because == because)&&(identical(other.evidence, evidence) || other.evidence == evidence)&&(identical(other.by, by) || other.by == by));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,title,titleEn,date,link,const DeepCollectionEquality().hash(tickers),event,eventLabel,eventLabelAr,meaning,meaningAr,weight,because,evidence,by);

@override
String toString() {
  return 'Disclosure(id: $id, title: $title, titleEn: $titleEn, date: $date, link: $link, tickers: $tickers, event: $event, eventLabel: $eventLabel, eventLabelAr: $eventLabelAr, meaning: $meaning, meaningAr: $meaningAr, weight: $weight, because: $because, evidence: $evidence, by: $by)';
}


}

/// @nodoc
abstract mixin class $DisclosureCopyWith<$Res>  {
  factory $DisclosureCopyWith(Disclosure value, $Res Function(Disclosure) _then) = _$DisclosureCopyWithImpl;
@useResult
$Res call({
 String id, String title,@JsonKey(name: 'title_en') String? titleEn, String date, String link, List<String> tickers, String event,@JsonKey(name: 'event_label') String eventLabel,@JsonKey(name: 'event_label_ar') String eventLabelAr, String meaning,@JsonKey(name: 'meaning_ar') String meaningAr, String weight, String because, DisclosureEvidence? evidence, String by
});


$DisclosureEvidenceCopyWith<$Res>? get evidence;

}
/// @nodoc
class _$DisclosureCopyWithImpl<$Res>
    implements $DisclosureCopyWith<$Res> {
  _$DisclosureCopyWithImpl(this._self, this._then);

  final Disclosure _self;
  final $Res Function(Disclosure) _then;

/// Create a copy of Disclosure
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? title = null,Object? titleEn = freezed,Object? date = null,Object? link = null,Object? tickers = null,Object? event = null,Object? eventLabel = null,Object? eventLabelAr = null,Object? meaning = null,Object? meaningAr = null,Object? weight = null,Object? because = null,Object? evidence = freezed,Object? by = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,titleEn: freezed == titleEn ? _self.titleEn : titleEn // ignore: cast_nullable_to_non_nullable
as String?,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,tickers: null == tickers ? _self.tickers : tickers // ignore: cast_nullable_to_non_nullable
as List<String>,event: null == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as String,eventLabel: null == eventLabel ? _self.eventLabel : eventLabel // ignore: cast_nullable_to_non_nullable
as String,eventLabelAr: null == eventLabelAr ? _self.eventLabelAr : eventLabelAr // ignore: cast_nullable_to_non_nullable
as String,meaning: null == meaning ? _self.meaning : meaning // ignore: cast_nullable_to_non_nullable
as String,meaningAr: null == meaningAr ? _self.meaningAr : meaningAr // ignore: cast_nullable_to_non_nullable
as String,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as String,because: null == because ? _self.because : because // ignore: cast_nullable_to_non_nullable
as String,evidence: freezed == evidence ? _self.evidence : evidence // ignore: cast_nullable_to_non_nullable
as DisclosureEvidence?,by: null == by ? _self.by : by // ignore: cast_nullable_to_non_nullable
as String,
  ));
}
/// Create a copy of Disclosure
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DisclosureEvidenceCopyWith<$Res>? get evidence {
    if (_self.evidence == null) {
    return null;
  }

  return $DisclosureEvidenceCopyWith<$Res>(_self.evidence!, (value) {
    return _then(_self.copyWith(evidence: value));
  });
}
}


/// Adds pattern-matching-related methods to [Disclosure].
extension DisclosurePatterns on Disclosure {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Disclosure value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Disclosure() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Disclosure value)  $default,){
final _that = this;
switch (_that) {
case _Disclosure():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Disclosure value)?  $default,){
final _that = this;
switch (_that) {
case _Disclosure() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String title, @JsonKey(name: 'title_en')  String? titleEn,  String date,  String link,  List<String> tickers,  String event, @JsonKey(name: 'event_label')  String eventLabel, @JsonKey(name: 'event_label_ar')  String eventLabelAr,  String meaning, @JsonKey(name: 'meaning_ar')  String meaningAr,  String weight,  String because,  DisclosureEvidence? evidence,  String by)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Disclosure() when $default != null:
return $default(_that.id,_that.title,_that.titleEn,_that.date,_that.link,_that.tickers,_that.event,_that.eventLabel,_that.eventLabelAr,_that.meaning,_that.meaningAr,_that.weight,_that.because,_that.evidence,_that.by);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String title, @JsonKey(name: 'title_en')  String? titleEn,  String date,  String link,  List<String> tickers,  String event, @JsonKey(name: 'event_label')  String eventLabel, @JsonKey(name: 'event_label_ar')  String eventLabelAr,  String meaning, @JsonKey(name: 'meaning_ar')  String meaningAr,  String weight,  String because,  DisclosureEvidence? evidence,  String by)  $default,) {final _that = this;
switch (_that) {
case _Disclosure():
return $default(_that.id,_that.title,_that.titleEn,_that.date,_that.link,_that.tickers,_that.event,_that.eventLabel,_that.eventLabelAr,_that.meaning,_that.meaningAr,_that.weight,_that.because,_that.evidence,_that.by);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String title, @JsonKey(name: 'title_en')  String? titleEn,  String date,  String link,  List<String> tickers,  String event, @JsonKey(name: 'event_label')  String eventLabel, @JsonKey(name: 'event_label_ar')  String eventLabelAr,  String meaning, @JsonKey(name: 'meaning_ar')  String meaningAr,  String weight,  String because,  DisclosureEvidence? evidence,  String by)?  $default,) {final _that = this;
switch (_that) {
case _Disclosure() when $default != null:
return $default(_that.id,_that.title,_that.titleEn,_that.date,_that.link,_that.tickers,_that.event,_that.eventLabel,_that.eventLabelAr,_that.meaning,_that.meaningAr,_that.weight,_that.because,_that.evidence,_that.by);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Disclosure extends Disclosure {
  const _Disclosure({required this.id, required this.title, @JsonKey(name: 'title_en') this.titleEn, this.date = '', this.link = '', final  List<String> tickers = const <String>[], this.event = 'statement', @JsonKey(name: 'event_label') this.eventLabel = 'Statement', @JsonKey(name: 'event_label_ar') this.eventLabelAr = '', this.meaning = '', @JsonKey(name: 'meaning_ar') this.meaningAr = '', this.weight = 'filed', this.because = '', this.evidence, this.by = ''}): _tickers = tickers,super._();
  factory _Disclosure.fromJson(Map<String, dynamic> json) => _$DisclosureFromJson(json);

@override final  String id;
@override final  String title;
/// The exchange files in Arabic without exception. This is the cached
/// English, beside it rather than over it.
@override@JsonKey(name: 'title_en') final  String? titleEn;
@override@JsonKey() final  String date;
@override@JsonKey() final  String link;
/// Stamped into the title by the exchange as `(TICKER.CA)`.
 final  List<String> _tickers;
/// Stamped into the title by the exchange as `(TICKER.CA)`.
@override@JsonKey() List<String> get tickers {
  if (_tickers is EqualUnmodifiableListView) return _tickers;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tickers);
}

/// Which kind of filing this is, from a closed list.
@override@JsonKey() final  String event;
@override@JsonKey(name: 'event_label') final  String eventLabel;
@override@JsonKey(name: 'event_label_ar') final  String eventLabelAr;
/// What this kind of filing does to somebody holding the share. Written by
/// a person once per type and reviewed — never generated per filing.
@override@JsonKey() final  String meaning;
@override@JsonKey(name: 'meaning_ar') final  String meaningAr;
/// check · filed · other. Never a view on the filing itself.
@override@JsonKey() final  String weight;
@override@JsonKey() final  String because;
@override final  DisclosureEvidence? evidence;
/// Whether the type came from a published pattern or from the model.
/// Carried so a mislabelled filing can be traced to which decided it.
@override@JsonKey() final  String by;

/// Create a copy of Disclosure
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DisclosureCopyWith<_Disclosure> get copyWith => __$DisclosureCopyWithImpl<_Disclosure>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DisclosureToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Disclosure&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.titleEn, titleEn) || other.titleEn == titleEn)&&(identical(other.date, date) || other.date == date)&&(identical(other.link, link) || other.link == link)&&const DeepCollectionEquality().equals(other._tickers, _tickers)&&(identical(other.event, event) || other.event == event)&&(identical(other.eventLabel, eventLabel) || other.eventLabel == eventLabel)&&(identical(other.eventLabelAr, eventLabelAr) || other.eventLabelAr == eventLabelAr)&&(identical(other.meaning, meaning) || other.meaning == meaning)&&(identical(other.meaningAr, meaningAr) || other.meaningAr == meaningAr)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.because, because) || other.because == because)&&(identical(other.evidence, evidence) || other.evidence == evidence)&&(identical(other.by, by) || other.by == by));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,title,titleEn,date,link,const DeepCollectionEquality().hash(_tickers),event,eventLabel,eventLabelAr,meaning,meaningAr,weight,because,evidence,by);

@override
String toString() {
  return 'Disclosure(id: $id, title: $title, titleEn: $titleEn, date: $date, link: $link, tickers: $tickers, event: $event, eventLabel: $eventLabel, eventLabelAr: $eventLabelAr, meaning: $meaning, meaningAr: $meaningAr, weight: $weight, because: $because, evidence: $evidence, by: $by)';
}


}

/// @nodoc
abstract mixin class _$DisclosureCopyWith<$Res> implements $DisclosureCopyWith<$Res> {
  factory _$DisclosureCopyWith(_Disclosure value, $Res Function(_Disclosure) _then) = __$DisclosureCopyWithImpl;
@override @useResult
$Res call({
 String id, String title,@JsonKey(name: 'title_en') String? titleEn, String date, String link, List<String> tickers, String event,@JsonKey(name: 'event_label') String eventLabel,@JsonKey(name: 'event_label_ar') String eventLabelAr, String meaning,@JsonKey(name: 'meaning_ar') String meaningAr, String weight, String because, DisclosureEvidence? evidence, String by
});


@override $DisclosureEvidenceCopyWith<$Res>? get evidence;

}
/// @nodoc
class __$DisclosureCopyWithImpl<$Res>
    implements _$DisclosureCopyWith<$Res> {
  __$DisclosureCopyWithImpl(this._self, this._then);

  final _Disclosure _self;
  final $Res Function(_Disclosure) _then;

/// Create a copy of Disclosure
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? title = null,Object? titleEn = freezed,Object? date = null,Object? link = null,Object? tickers = null,Object? event = null,Object? eventLabel = null,Object? eventLabelAr = null,Object? meaning = null,Object? meaningAr = null,Object? weight = null,Object? because = null,Object? evidence = freezed,Object? by = null,}) {
  return _then(_Disclosure(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,titleEn: freezed == titleEn ? _self.titleEn : titleEn // ignore: cast_nullable_to_non_nullable
as String?,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,tickers: null == tickers ? _self._tickers : tickers // ignore: cast_nullable_to_non_nullable
as List<String>,event: null == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as String,eventLabel: null == eventLabel ? _self.eventLabel : eventLabel // ignore: cast_nullable_to_non_nullable
as String,eventLabelAr: null == eventLabelAr ? _self.eventLabelAr : eventLabelAr // ignore: cast_nullable_to_non_nullable
as String,meaning: null == meaning ? _self.meaning : meaning // ignore: cast_nullable_to_non_nullable
as String,meaningAr: null == meaningAr ? _self.meaningAr : meaningAr // ignore: cast_nullable_to_non_nullable
as String,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as String,because: null == because ? _self.because : because // ignore: cast_nullable_to_non_nullable
as String,evidence: freezed == evidence ? _self.evidence : evidence // ignore: cast_nullable_to_non_nullable
as DisclosureEvidence?,by: null == by ? _self.by : by // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

/// Create a copy of Disclosure
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DisclosureEvidenceCopyWith<$Res>? get evidence {
    if (_self.evidence == null) {
    return null;
  }

  return $DisclosureEvidenceCopyWith<$Res>(_self.evidence!, (value) {
    return _then(_self.copyWith(evidence: value));
  });
}
}


/// @nodoc
mixin _$DisclosureEvidence {

 String get ticker; num get volume;@JsonKey(name: 'median_volume_20d') num get medianVolume20d; double get ratio; double get threshold; String? get date;
/// Create a copy of DisclosureEvidence
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DisclosureEvidenceCopyWith<DisclosureEvidence> get copyWith => _$DisclosureEvidenceCopyWithImpl<DisclosureEvidence>(this as DisclosureEvidence, _$identity);

  /// Serializes this DisclosureEvidence to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DisclosureEvidence&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.volume, volume) || other.volume == volume)&&(identical(other.medianVolume20d, medianVolume20d) || other.medianVolume20d == medianVolume20d)&&(identical(other.ratio, ratio) || other.ratio == ratio)&&(identical(other.threshold, threshold) || other.threshold == threshold)&&(identical(other.date, date) || other.date == date));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,volume,medianVolume20d,ratio,threshold,date);

@override
String toString() {
  return 'DisclosureEvidence(ticker: $ticker, volume: $volume, medianVolume20d: $medianVolume20d, ratio: $ratio, threshold: $threshold, date: $date)';
}


}

/// @nodoc
abstract mixin class $DisclosureEvidenceCopyWith<$Res>  {
  factory $DisclosureEvidenceCopyWith(DisclosureEvidence value, $Res Function(DisclosureEvidence) _then) = _$DisclosureEvidenceCopyWithImpl;
@useResult
$Res call({
 String ticker, num volume,@JsonKey(name: 'median_volume_20d') num medianVolume20d, double ratio, double threshold, String? date
});




}
/// @nodoc
class _$DisclosureEvidenceCopyWithImpl<$Res>
    implements $DisclosureEvidenceCopyWith<$Res> {
  _$DisclosureEvidenceCopyWithImpl(this._self, this._then);

  final DisclosureEvidence _self;
  final $Res Function(DisclosureEvidence) _then;

/// Create a copy of DisclosureEvidence
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? volume = null,Object? medianVolume20d = null,Object? ratio = null,Object? threshold = null,Object? date = freezed,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,volume: null == volume ? _self.volume : volume // ignore: cast_nullable_to_non_nullable
as num,medianVolume20d: null == medianVolume20d ? _self.medianVolume20d : medianVolume20d // ignore: cast_nullable_to_non_nullable
as num,ratio: null == ratio ? _self.ratio : ratio // ignore: cast_nullable_to_non_nullable
as double,threshold: null == threshold ? _self.threshold : threshold // ignore: cast_nullable_to_non_nullable
as double,date: freezed == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [DisclosureEvidence].
extension DisclosureEvidencePatterns on DisclosureEvidence {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DisclosureEvidence value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DisclosureEvidence() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DisclosureEvidence value)  $default,){
final _that = this;
switch (_that) {
case _DisclosureEvidence():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DisclosureEvidence value)?  $default,){
final _that = this;
switch (_that) {
case _DisclosureEvidence() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker,  num volume, @JsonKey(name: 'median_volume_20d')  num medianVolume20d,  double ratio,  double threshold,  String? date)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DisclosureEvidence() when $default != null:
return $default(_that.ticker,_that.volume,_that.medianVolume20d,_that.ratio,_that.threshold,_that.date);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker,  num volume, @JsonKey(name: 'median_volume_20d')  num medianVolume20d,  double ratio,  double threshold,  String? date)  $default,) {final _that = this;
switch (_that) {
case _DisclosureEvidence():
return $default(_that.ticker,_that.volume,_that.medianVolume20d,_that.ratio,_that.threshold,_that.date);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker,  num volume, @JsonKey(name: 'median_volume_20d')  num medianVolume20d,  double ratio,  double threshold,  String? date)?  $default,) {final _that = this;
switch (_that) {
case _DisclosureEvidence() when $default != null:
return $default(_that.ticker,_that.volume,_that.medianVolume20d,_that.ratio,_that.threshold,_that.date);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DisclosureEvidence implements DisclosureEvidence {
  const _DisclosureEvidence({this.ticker = '', this.volume = 0, @JsonKey(name: 'median_volume_20d') this.medianVolume20d = 0, this.ratio = 0, this.threshold = 2.0, this.date});
  factory _DisclosureEvidence.fromJson(Map<String, dynamic> json) => _$DisclosureEvidenceFromJson(json);

@override@JsonKey() final  String ticker;
@override@JsonKey() final  num volume;
@override@JsonKey(name: 'median_volume_20d') final  num medianVolume20d;
@override@JsonKey() final  double ratio;
@override@JsonKey() final  double threshold;
@override final  String? date;

/// Create a copy of DisclosureEvidence
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DisclosureEvidenceCopyWith<_DisclosureEvidence> get copyWith => __$DisclosureEvidenceCopyWithImpl<_DisclosureEvidence>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DisclosureEvidenceToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DisclosureEvidence&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.volume, volume) || other.volume == volume)&&(identical(other.medianVolume20d, medianVolume20d) || other.medianVolume20d == medianVolume20d)&&(identical(other.ratio, ratio) || other.ratio == ratio)&&(identical(other.threshold, threshold) || other.threshold == threshold)&&(identical(other.date, date) || other.date == date));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,volume,medianVolume20d,ratio,threshold,date);

@override
String toString() {
  return 'DisclosureEvidence(ticker: $ticker, volume: $volume, medianVolume20d: $medianVolume20d, ratio: $ratio, threshold: $threshold, date: $date)';
}


}

/// @nodoc
abstract mixin class _$DisclosureEvidenceCopyWith<$Res> implements $DisclosureEvidenceCopyWith<$Res> {
  factory _$DisclosureEvidenceCopyWith(_DisclosureEvidence value, $Res Function(_DisclosureEvidence) _then) = __$DisclosureEvidenceCopyWithImpl;
@override @useResult
$Res call({
 String ticker, num volume,@JsonKey(name: 'median_volume_20d') num medianVolume20d, double ratio, double threshold, String? date
});




}
/// @nodoc
class __$DisclosureEvidenceCopyWithImpl<$Res>
    implements _$DisclosureEvidenceCopyWith<$Res> {
  __$DisclosureEvidenceCopyWithImpl(this._self, this._then);

  final _DisclosureEvidence _self;
  final $Res Function(_DisclosureEvidence) _then;

/// Create a copy of DisclosureEvidence
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? volume = null,Object? medianVolume20d = null,Object? ratio = null,Object? threshold = null,Object? date = freezed,}) {
  return _then(_DisclosureEvidence(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,volume: null == volume ? _self.volume : volume // ignore: cast_nullable_to_non_nullable
as num,medianVolume20d: null == medianVolume20d ? _self.medianVolume20d : medianVolume20d // ignore: cast_nullable_to_non_nullable
as num,ratio: null == ratio ? _self.ratio : ratio // ignore: cast_nullable_to_non_nullable
as double,threshold: null == threshold ? _self.threshold : threshold // ignore: cast_nullable_to_non_nullable
as double,date: freezed == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
