// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'news.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$NewsFeed {

 List<NewsSource> get sources; List<NewsItem> get items;/// The published volume band an item is judged against. Shown, not hidden:
/// "unusual" means nothing without the number that defines it.
 double get threshold;/// Headlines withheld because the wire wrote a recommendation. Counted so
/// the screen can say the filter ran, rather than silently shrinking.
@JsonKey(name: 'dropped_for_advice') int get droppedForAdvice;/// How many headlines collapsed into an existing story. Published so the
/// screen can say the feed was deduplicated rather than thin.
 int get merged;/// Outlets that were tried and could not be reached. Published because a
/// missing source is a fact about the feed, not an embarrassment to hide.
 List<NewsOutage> get unavailable;
/// Create a copy of NewsFeed
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$NewsFeedCopyWith<NewsFeed> get copyWith => _$NewsFeedCopyWithImpl<NewsFeed>(this as NewsFeed, _$identity);

  /// Serializes this NewsFeed to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is NewsFeed&&const DeepCollectionEquality().equals(other.sources, sources)&&const DeepCollectionEquality().equals(other.items, items)&&(identical(other.threshold, threshold) || other.threshold == threshold)&&(identical(other.droppedForAdvice, droppedForAdvice) || other.droppedForAdvice == droppedForAdvice)&&(identical(other.merged, merged) || other.merged == merged)&&const DeepCollectionEquality().equals(other.unavailable, unavailable));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(sources),const DeepCollectionEquality().hash(items),threshold,droppedForAdvice,merged,const DeepCollectionEquality().hash(unavailable));

@override
String toString() {
  return 'NewsFeed(sources: $sources, items: $items, threshold: $threshold, droppedForAdvice: $droppedForAdvice, merged: $merged, unavailable: $unavailable)';
}


}

/// @nodoc
abstract mixin class $NewsFeedCopyWith<$Res>  {
  factory $NewsFeedCopyWith(NewsFeed value, $Res Function(NewsFeed) _then) = _$NewsFeedCopyWithImpl;
@useResult
$Res call({
 List<NewsSource> sources, List<NewsItem> items, double threshold,@JsonKey(name: 'dropped_for_advice') int droppedForAdvice, int merged, List<NewsOutage> unavailable
});




}
/// @nodoc
class _$NewsFeedCopyWithImpl<$Res>
    implements $NewsFeedCopyWith<$Res> {
  _$NewsFeedCopyWithImpl(this._self, this._then);

  final NewsFeed _self;
  final $Res Function(NewsFeed) _then;

/// Create a copy of NewsFeed
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? sources = null,Object? items = null,Object? threshold = null,Object? droppedForAdvice = null,Object? merged = null,Object? unavailable = null,}) {
  return _then(_self.copyWith(
sources: null == sources ? _self.sources : sources // ignore: cast_nullable_to_non_nullable
as List<NewsSource>,items: null == items ? _self.items : items // ignore: cast_nullable_to_non_nullable
as List<NewsItem>,threshold: null == threshold ? _self.threshold : threshold // ignore: cast_nullable_to_non_nullable
as double,droppedForAdvice: null == droppedForAdvice ? _self.droppedForAdvice : droppedForAdvice // ignore: cast_nullable_to_non_nullable
as int,merged: null == merged ? _self.merged : merged // ignore: cast_nullable_to_non_nullable
as int,unavailable: null == unavailable ? _self.unavailable : unavailable // ignore: cast_nullable_to_non_nullable
as List<NewsOutage>,
  ));
}

}


/// Adds pattern-matching-related methods to [NewsFeed].
extension NewsFeedPatterns on NewsFeed {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _NewsFeed value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _NewsFeed() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _NewsFeed value)  $default,){
final _that = this;
switch (_that) {
case _NewsFeed():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _NewsFeed value)?  $default,){
final _that = this;
switch (_that) {
case _NewsFeed() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<NewsSource> sources,  List<NewsItem> items,  double threshold, @JsonKey(name: 'dropped_for_advice')  int droppedForAdvice,  int merged,  List<NewsOutage> unavailable)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _NewsFeed() when $default != null:
return $default(_that.sources,_that.items,_that.threshold,_that.droppedForAdvice,_that.merged,_that.unavailable);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<NewsSource> sources,  List<NewsItem> items,  double threshold, @JsonKey(name: 'dropped_for_advice')  int droppedForAdvice,  int merged,  List<NewsOutage> unavailable)  $default,) {final _that = this;
switch (_that) {
case _NewsFeed():
return $default(_that.sources,_that.items,_that.threshold,_that.droppedForAdvice,_that.merged,_that.unavailable);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<NewsSource> sources,  List<NewsItem> items,  double threshold, @JsonKey(name: 'dropped_for_advice')  int droppedForAdvice,  int merged,  List<NewsOutage> unavailable)?  $default,) {final _that = this;
switch (_that) {
case _NewsFeed() when $default != null:
return $default(_that.sources,_that.items,_that.threshold,_that.droppedForAdvice,_that.merged,_that.unavailable);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _NewsFeed extends NewsFeed {
  const _NewsFeed({final  List<NewsSource> sources = const <NewsSource>[], final  List<NewsItem> items = const <NewsItem>[], this.threshold = 2.0, @JsonKey(name: 'dropped_for_advice') this.droppedForAdvice = 0, this.merged = 0, final  List<NewsOutage> unavailable = const <NewsOutage>[]}): _sources = sources,_items = items,_unavailable = unavailable,super._();
  factory _NewsFeed.fromJson(Map<String, dynamic> json) => _$NewsFeedFromJson(json);

 final  List<NewsSource> _sources;
@override@JsonKey() List<NewsSource> get sources {
  if (_sources is EqualUnmodifiableListView) return _sources;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_sources);
}

 final  List<NewsItem> _items;
@override@JsonKey() List<NewsItem> get items {
  if (_items is EqualUnmodifiableListView) return _items;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_items);
}

/// The published volume band an item is judged against. Shown, not hidden:
/// "unusual" means nothing without the number that defines it.
@override@JsonKey() final  double threshold;
/// Headlines withheld because the wire wrote a recommendation. Counted so
/// the screen can say the filter ran, rather than silently shrinking.
@override@JsonKey(name: 'dropped_for_advice') final  int droppedForAdvice;
/// How many headlines collapsed into an existing story. Published so the
/// screen can say the feed was deduplicated rather than thin.
@override@JsonKey() final  int merged;
/// Outlets that were tried and could not be reached. Published because a
/// missing source is a fact about the feed, not an embarrassment to hide.
 final  List<NewsOutage> _unavailable;
/// Outlets that were tried and could not be reached. Published because a
/// missing source is a fact about the feed, not an embarrassment to hide.
@override@JsonKey() List<NewsOutage> get unavailable {
  if (_unavailable is EqualUnmodifiableListView) return _unavailable;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_unavailable);
}


/// Create a copy of NewsFeed
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$NewsFeedCopyWith<_NewsFeed> get copyWith => __$NewsFeedCopyWithImpl<_NewsFeed>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$NewsFeedToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _NewsFeed&&const DeepCollectionEquality().equals(other._sources, _sources)&&const DeepCollectionEquality().equals(other._items, _items)&&(identical(other.threshold, threshold) || other.threshold == threshold)&&(identical(other.droppedForAdvice, droppedForAdvice) || other.droppedForAdvice == droppedForAdvice)&&(identical(other.merged, merged) || other.merged == merged)&&const DeepCollectionEquality().equals(other._unavailable, _unavailable));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_sources),const DeepCollectionEquality().hash(_items),threshold,droppedForAdvice,merged,const DeepCollectionEquality().hash(_unavailable));

@override
String toString() {
  return 'NewsFeed(sources: $sources, items: $items, threshold: $threshold, droppedForAdvice: $droppedForAdvice, merged: $merged, unavailable: $unavailable)';
}


}

/// @nodoc
abstract mixin class _$NewsFeedCopyWith<$Res> implements $NewsFeedCopyWith<$Res> {
  factory _$NewsFeedCopyWith(_NewsFeed value, $Res Function(_NewsFeed) _then) = __$NewsFeedCopyWithImpl;
@override @useResult
$Res call({
 List<NewsSource> sources, List<NewsItem> items, double threshold,@JsonKey(name: 'dropped_for_advice') int droppedForAdvice, int merged, List<NewsOutage> unavailable
});




}
/// @nodoc
class __$NewsFeedCopyWithImpl<$Res>
    implements _$NewsFeedCopyWith<$Res> {
  __$NewsFeedCopyWithImpl(this._self, this._then);

  final _NewsFeed _self;
  final $Res Function(_NewsFeed) _then;

/// Create a copy of NewsFeed
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? sources = null,Object? items = null,Object? threshold = null,Object? droppedForAdvice = null,Object? merged = null,Object? unavailable = null,}) {
  return _then(_NewsFeed(
sources: null == sources ? _self._sources : sources // ignore: cast_nullable_to_non_nullable
as List<NewsSource>,items: null == items ? _self._items : items // ignore: cast_nullable_to_non_nullable
as List<NewsItem>,threshold: null == threshold ? _self.threshold : threshold // ignore: cast_nullable_to_non_nullable
as double,droppedForAdvice: null == droppedForAdvice ? _self.droppedForAdvice : droppedForAdvice // ignore: cast_nullable_to_non_nullable
as int,merged: null == merged ? _self.merged : merged // ignore: cast_nullable_to_non_nullable
as int,unavailable: null == unavailable ? _self._unavailable : unavailable // ignore: cast_nullable_to_non_nullable
as List<NewsOutage>,
  ));
}


}


/// @nodoc
mixin _$NewsSource {

 String get id; String get name;@JsonKey(name: 'name_ar') String? get nameAr; String? get home;
/// Create a copy of NewsSource
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$NewsSourceCopyWith<NewsSource> get copyWith => _$NewsSourceCopyWithImpl<NewsSource>(this as NewsSource, _$identity);

  /// Serializes this NewsSource to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is NewsSource&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.home, home) || other.home == home));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,nameAr,home);

@override
String toString() {
  return 'NewsSource(id: $id, name: $name, nameAr: $nameAr, home: $home)';
}


}

/// @nodoc
abstract mixin class $NewsSourceCopyWith<$Res>  {
  factory $NewsSourceCopyWith(NewsSource value, $Res Function(NewsSource) _then) = _$NewsSourceCopyWithImpl;
@useResult
$Res call({
 String id, String name,@JsonKey(name: 'name_ar') String? nameAr, String? home
});




}
/// @nodoc
class _$NewsSourceCopyWithImpl<$Res>
    implements $NewsSourceCopyWith<$Res> {
  _$NewsSourceCopyWithImpl(this._self, this._then);

  final NewsSource _self;
  final $Res Function(NewsSource) _then;

/// Create a copy of NewsSource
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? nameAr = freezed,Object? home = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,nameAr: freezed == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String?,home: freezed == home ? _self.home : home // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [NewsSource].
extension NewsSourcePatterns on NewsSource {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _NewsSource value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _NewsSource() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _NewsSource value)  $default,){
final _that = this;
switch (_that) {
case _NewsSource():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _NewsSource value)?  $default,){
final _that = this;
switch (_that) {
case _NewsSource() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name, @JsonKey(name: 'name_ar')  String? nameAr,  String? home)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _NewsSource() when $default != null:
return $default(_that.id,_that.name,_that.nameAr,_that.home);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name, @JsonKey(name: 'name_ar')  String? nameAr,  String? home)  $default,) {final _that = this;
switch (_that) {
case _NewsSource():
return $default(_that.id,_that.name,_that.nameAr,_that.home);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name, @JsonKey(name: 'name_ar')  String? nameAr,  String? home)?  $default,) {final _that = this;
switch (_that) {
case _NewsSource() when $default != null:
return $default(_that.id,_that.name,_that.nameAr,_that.home);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _NewsSource implements NewsSource {
  const _NewsSource({required this.id, required this.name, @JsonKey(name: 'name_ar') this.nameAr, this.home});
  factory _NewsSource.fromJson(Map<String, dynamic> json) => _$NewsSourceFromJson(json);

@override final  String id;
@override final  String name;
@override@JsonKey(name: 'name_ar') final  String? nameAr;
@override final  String? home;

/// Create a copy of NewsSource
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$NewsSourceCopyWith<_NewsSource> get copyWith => __$NewsSourceCopyWithImpl<_NewsSource>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$NewsSourceToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _NewsSource&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.home, home) || other.home == home));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,nameAr,home);

@override
String toString() {
  return 'NewsSource(id: $id, name: $name, nameAr: $nameAr, home: $home)';
}


}

/// @nodoc
abstract mixin class _$NewsSourceCopyWith<$Res> implements $NewsSourceCopyWith<$Res> {
  factory _$NewsSourceCopyWith(_NewsSource value, $Res Function(_NewsSource) _then) = __$NewsSourceCopyWithImpl;
@override @useResult
$Res call({
 String id, String name,@JsonKey(name: 'name_ar') String? nameAr, String? home
});




}
/// @nodoc
class __$NewsSourceCopyWithImpl<$Res>
    implements _$NewsSourceCopyWith<$Res> {
  __$NewsSourceCopyWithImpl(this._self, this._then);

  final _NewsSource _self;
  final $Res Function(_NewsSource) _then;

/// Create a copy of NewsSource
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? nameAr = freezed,Object? home = freezed,}) {
  return _then(_NewsSource(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,nameAr: freezed == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String?,home: freezed == home ? _self.home : home // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$NewsOutage {

 String get name; String get note;
/// Create a copy of NewsOutage
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$NewsOutageCopyWith<NewsOutage> get copyWith => _$NewsOutageCopyWithImpl<NewsOutage>(this as NewsOutage, _$identity);

  /// Serializes this NewsOutage to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is NewsOutage&&(identical(other.name, name) || other.name == name)&&(identical(other.note, note) || other.note == note));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,note);

@override
String toString() {
  return 'NewsOutage(name: $name, note: $note)';
}


}

/// @nodoc
abstract mixin class $NewsOutageCopyWith<$Res>  {
  factory $NewsOutageCopyWith(NewsOutage value, $Res Function(NewsOutage) _then) = _$NewsOutageCopyWithImpl;
@useResult
$Res call({
 String name, String note
});




}
/// @nodoc
class _$NewsOutageCopyWithImpl<$Res>
    implements $NewsOutageCopyWith<$Res> {
  _$NewsOutageCopyWithImpl(this._self, this._then);

  final NewsOutage _self;
  final $Res Function(NewsOutage) _then;

/// Create a copy of NewsOutage
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = null,Object? note = null,}) {
  return _then(_self.copyWith(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,note: null == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [NewsOutage].
extension NewsOutagePatterns on NewsOutage {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _NewsOutage value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _NewsOutage() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _NewsOutage value)  $default,){
final _that = this;
switch (_that) {
case _NewsOutage():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _NewsOutage value)?  $default,){
final _that = this;
switch (_that) {
case _NewsOutage() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String name,  String note)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _NewsOutage() when $default != null:
return $default(_that.name,_that.note);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String name,  String note)  $default,) {final _that = this;
switch (_that) {
case _NewsOutage():
return $default(_that.name,_that.note);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String name,  String note)?  $default,) {final _that = this;
switch (_that) {
case _NewsOutage() when $default != null:
return $default(_that.name,_that.note);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _NewsOutage implements NewsOutage {
  const _NewsOutage({required this.name, this.note = ''});
  factory _NewsOutage.fromJson(Map<String, dynamic> json) => _$NewsOutageFromJson(json);

@override final  String name;
@override@JsonKey() final  String note;

/// Create a copy of NewsOutage
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$NewsOutageCopyWith<_NewsOutage> get copyWith => __$NewsOutageCopyWithImpl<_NewsOutage>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$NewsOutageToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _NewsOutage&&(identical(other.name, name) || other.name == name)&&(identical(other.note, note) || other.note == note));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,note);

@override
String toString() {
  return 'NewsOutage(name: $name, note: $note)';
}


}

/// @nodoc
abstract mixin class _$NewsOutageCopyWith<$Res> implements $NewsOutageCopyWith<$Res> {
  factory _$NewsOutageCopyWith(_NewsOutage value, $Res Function(_NewsOutage) _then) = __$NewsOutageCopyWithImpl;
@override @useResult
$Res call({
 String name, String note
});




}
/// @nodoc
class __$NewsOutageCopyWithImpl<$Res>
    implements _$NewsOutageCopyWith<$Res> {
  __$NewsOutageCopyWithImpl(this._self, this._then);

  final _NewsOutage _self;
  final $Res Function(_NewsOutage) _then;

/// Create a copy of NewsOutage
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = null,Object? note = null,}) {
  return _then(_NewsOutage(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,note: null == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$NewsItem {

 String get id; String get headline;/// The headline in English, when a translation has been cached for it.
/// The Arabic is never replaced — this sits beside it, and an English
/// reader gets this one.
@JsonKey(name: 'headline_en') String? get headlineEn; String get published;/// Every outlet that carried this story, with its own link. One story told
/// by three papers is one row, not three — and each of them is credited.
 List<NewsAttribution> get sources;/// What kind of event it is — results, a capital change, a contract, a
/// board appointment. Never whether it was good news.
 String get event;@JsonKey(name: 'event_label') String get eventLabel;@JsonKey(name: 'event_label_ar') String get eventLabelAr;/// What this kind of story does to somebody holding the share. Shared with
/// the filings feed: one glossary, written once per type by a person.
 String get meaning;@JsonKey(name: 'meaning_ar') String get meaningAr;/// True when the headline was rebuilt from a URL slug rather than read
/// from a title field. Said out loud because it is a weaker reading.
 bool get reconstructed;/// Listed companies the outlet itself tagged the story with.
 List<String> get tickers;/// check · named · market. Never a judgement about the news itself.
 String get weight;/// Why it carries that weight, in a sentence, with the arithmetic in it.
 String get because; NewsEvidence? get evidence;
/// Create a copy of NewsItem
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$NewsItemCopyWith<NewsItem> get copyWith => _$NewsItemCopyWithImpl<NewsItem>(this as NewsItem, _$identity);

  /// Serializes this NewsItem to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is NewsItem&&(identical(other.id, id) || other.id == id)&&(identical(other.headline, headline) || other.headline == headline)&&(identical(other.headlineEn, headlineEn) || other.headlineEn == headlineEn)&&(identical(other.published, published) || other.published == published)&&const DeepCollectionEquality().equals(other.sources, sources)&&(identical(other.event, event) || other.event == event)&&(identical(other.eventLabel, eventLabel) || other.eventLabel == eventLabel)&&(identical(other.eventLabelAr, eventLabelAr) || other.eventLabelAr == eventLabelAr)&&(identical(other.meaning, meaning) || other.meaning == meaning)&&(identical(other.meaningAr, meaningAr) || other.meaningAr == meaningAr)&&(identical(other.reconstructed, reconstructed) || other.reconstructed == reconstructed)&&const DeepCollectionEquality().equals(other.tickers, tickers)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.because, because) || other.because == because)&&(identical(other.evidence, evidence) || other.evidence == evidence));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,headline,headlineEn,published,const DeepCollectionEquality().hash(sources),event,eventLabel,eventLabelAr,meaning,meaningAr,reconstructed,const DeepCollectionEquality().hash(tickers),weight,because,evidence);

@override
String toString() {
  return 'NewsItem(id: $id, headline: $headline, headlineEn: $headlineEn, published: $published, sources: $sources, event: $event, eventLabel: $eventLabel, eventLabelAr: $eventLabelAr, meaning: $meaning, meaningAr: $meaningAr, reconstructed: $reconstructed, tickers: $tickers, weight: $weight, because: $because, evidence: $evidence)';
}


}

/// @nodoc
abstract mixin class $NewsItemCopyWith<$Res>  {
  factory $NewsItemCopyWith(NewsItem value, $Res Function(NewsItem) _then) = _$NewsItemCopyWithImpl;
@useResult
$Res call({
 String id, String headline,@JsonKey(name: 'headline_en') String? headlineEn, String published, List<NewsAttribution> sources, String event,@JsonKey(name: 'event_label') String eventLabel,@JsonKey(name: 'event_label_ar') String eventLabelAr, String meaning,@JsonKey(name: 'meaning_ar') String meaningAr, bool reconstructed, List<String> tickers, String weight, String because, NewsEvidence? evidence
});


$NewsEvidenceCopyWith<$Res>? get evidence;

}
/// @nodoc
class _$NewsItemCopyWithImpl<$Res>
    implements $NewsItemCopyWith<$Res> {
  _$NewsItemCopyWithImpl(this._self, this._then);

  final NewsItem _self;
  final $Res Function(NewsItem) _then;

/// Create a copy of NewsItem
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? headline = null,Object? headlineEn = freezed,Object? published = null,Object? sources = null,Object? event = null,Object? eventLabel = null,Object? eventLabelAr = null,Object? meaning = null,Object? meaningAr = null,Object? reconstructed = null,Object? tickers = null,Object? weight = null,Object? because = null,Object? evidence = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,headline: null == headline ? _self.headline : headline // ignore: cast_nullable_to_non_nullable
as String,headlineEn: freezed == headlineEn ? _self.headlineEn : headlineEn // ignore: cast_nullable_to_non_nullable
as String?,published: null == published ? _self.published : published // ignore: cast_nullable_to_non_nullable
as String,sources: null == sources ? _self.sources : sources // ignore: cast_nullable_to_non_nullable
as List<NewsAttribution>,event: null == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as String,eventLabel: null == eventLabel ? _self.eventLabel : eventLabel // ignore: cast_nullable_to_non_nullable
as String,eventLabelAr: null == eventLabelAr ? _self.eventLabelAr : eventLabelAr // ignore: cast_nullable_to_non_nullable
as String,meaning: null == meaning ? _self.meaning : meaning // ignore: cast_nullable_to_non_nullable
as String,meaningAr: null == meaningAr ? _self.meaningAr : meaningAr // ignore: cast_nullable_to_non_nullable
as String,reconstructed: null == reconstructed ? _self.reconstructed : reconstructed // ignore: cast_nullable_to_non_nullable
as bool,tickers: null == tickers ? _self.tickers : tickers // ignore: cast_nullable_to_non_nullable
as List<String>,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as String,because: null == because ? _self.because : because // ignore: cast_nullable_to_non_nullable
as String,evidence: freezed == evidence ? _self.evidence : evidence // ignore: cast_nullable_to_non_nullable
as NewsEvidence?,
  ));
}
/// Create a copy of NewsItem
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$NewsEvidenceCopyWith<$Res>? get evidence {
    if (_self.evidence == null) {
    return null;
  }

  return $NewsEvidenceCopyWith<$Res>(_self.evidence!, (value) {
    return _then(_self.copyWith(evidence: value));
  });
}
}


/// Adds pattern-matching-related methods to [NewsItem].
extension NewsItemPatterns on NewsItem {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _NewsItem value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _NewsItem() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _NewsItem value)  $default,){
final _that = this;
switch (_that) {
case _NewsItem():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _NewsItem value)?  $default,){
final _that = this;
switch (_that) {
case _NewsItem() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String headline, @JsonKey(name: 'headline_en')  String? headlineEn,  String published,  List<NewsAttribution> sources,  String event, @JsonKey(name: 'event_label')  String eventLabel, @JsonKey(name: 'event_label_ar')  String eventLabelAr,  String meaning, @JsonKey(name: 'meaning_ar')  String meaningAr,  bool reconstructed,  List<String> tickers,  String weight,  String because,  NewsEvidence? evidence)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _NewsItem() when $default != null:
return $default(_that.id,_that.headline,_that.headlineEn,_that.published,_that.sources,_that.event,_that.eventLabel,_that.eventLabelAr,_that.meaning,_that.meaningAr,_that.reconstructed,_that.tickers,_that.weight,_that.because,_that.evidence);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String headline, @JsonKey(name: 'headline_en')  String? headlineEn,  String published,  List<NewsAttribution> sources,  String event, @JsonKey(name: 'event_label')  String eventLabel, @JsonKey(name: 'event_label_ar')  String eventLabelAr,  String meaning, @JsonKey(name: 'meaning_ar')  String meaningAr,  bool reconstructed,  List<String> tickers,  String weight,  String because,  NewsEvidence? evidence)  $default,) {final _that = this;
switch (_that) {
case _NewsItem():
return $default(_that.id,_that.headline,_that.headlineEn,_that.published,_that.sources,_that.event,_that.eventLabel,_that.eventLabelAr,_that.meaning,_that.meaningAr,_that.reconstructed,_that.tickers,_that.weight,_that.because,_that.evidence);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String headline, @JsonKey(name: 'headline_en')  String? headlineEn,  String published,  List<NewsAttribution> sources,  String event, @JsonKey(name: 'event_label')  String eventLabel, @JsonKey(name: 'event_label_ar')  String eventLabelAr,  String meaning, @JsonKey(name: 'meaning_ar')  String meaningAr,  bool reconstructed,  List<String> tickers,  String weight,  String because,  NewsEvidence? evidence)?  $default,) {final _that = this;
switch (_that) {
case _NewsItem() when $default != null:
return $default(_that.id,_that.headline,_that.headlineEn,_that.published,_that.sources,_that.event,_that.eventLabel,_that.eventLabelAr,_that.meaning,_that.meaningAr,_that.reconstructed,_that.tickers,_that.weight,_that.because,_that.evidence);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _NewsItem extends NewsItem {
  const _NewsItem({required this.id, required this.headline, @JsonKey(name: 'headline_en') this.headlineEn, this.published = '', final  List<NewsAttribution> sources = const <NewsAttribution>[], this.event = 'other', @JsonKey(name: 'event_label') this.eventLabel = 'Other', @JsonKey(name: 'event_label_ar') this.eventLabelAr = '', this.meaning = '', @JsonKey(name: 'meaning_ar') this.meaningAr = '', this.reconstructed = false, final  List<String> tickers = const <String>[], this.weight = 'market', this.because = '', this.evidence}): _sources = sources,_tickers = tickers,super._();
  factory _NewsItem.fromJson(Map<String, dynamic> json) => _$NewsItemFromJson(json);

@override final  String id;
@override final  String headline;
/// The headline in English, when a translation has been cached for it.
/// The Arabic is never replaced — this sits beside it, and an English
/// reader gets this one.
@override@JsonKey(name: 'headline_en') final  String? headlineEn;
@override@JsonKey() final  String published;
/// Every outlet that carried this story, with its own link. One story told
/// by three papers is one row, not three — and each of them is credited.
 final  List<NewsAttribution> _sources;
/// Every outlet that carried this story, with its own link. One story told
/// by three papers is one row, not three — and each of them is credited.
@override@JsonKey() List<NewsAttribution> get sources {
  if (_sources is EqualUnmodifiableListView) return _sources;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_sources);
}

/// What kind of event it is — results, a capital change, a contract, a
/// board appointment. Never whether it was good news.
@override@JsonKey() final  String event;
@override@JsonKey(name: 'event_label') final  String eventLabel;
@override@JsonKey(name: 'event_label_ar') final  String eventLabelAr;
/// What this kind of story does to somebody holding the share. Shared with
/// the filings feed: one glossary, written once per type by a person.
@override@JsonKey() final  String meaning;
@override@JsonKey(name: 'meaning_ar') final  String meaningAr;
/// True when the headline was rebuilt from a URL slug rather than read
/// from a title field. Said out loud because it is a weaker reading.
@override@JsonKey() final  bool reconstructed;
/// Listed companies the outlet itself tagged the story with.
 final  List<String> _tickers;
/// Listed companies the outlet itself tagged the story with.
@override@JsonKey() List<String> get tickers {
  if (_tickers is EqualUnmodifiableListView) return _tickers;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tickers);
}

/// check · named · market. Never a judgement about the news itself.
@override@JsonKey() final  String weight;
/// Why it carries that weight, in a sentence, with the arithmetic in it.
@override@JsonKey() final  String because;
@override final  NewsEvidence? evidence;

/// Create a copy of NewsItem
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$NewsItemCopyWith<_NewsItem> get copyWith => __$NewsItemCopyWithImpl<_NewsItem>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$NewsItemToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _NewsItem&&(identical(other.id, id) || other.id == id)&&(identical(other.headline, headline) || other.headline == headline)&&(identical(other.headlineEn, headlineEn) || other.headlineEn == headlineEn)&&(identical(other.published, published) || other.published == published)&&const DeepCollectionEquality().equals(other._sources, _sources)&&(identical(other.event, event) || other.event == event)&&(identical(other.eventLabel, eventLabel) || other.eventLabel == eventLabel)&&(identical(other.eventLabelAr, eventLabelAr) || other.eventLabelAr == eventLabelAr)&&(identical(other.meaning, meaning) || other.meaning == meaning)&&(identical(other.meaningAr, meaningAr) || other.meaningAr == meaningAr)&&(identical(other.reconstructed, reconstructed) || other.reconstructed == reconstructed)&&const DeepCollectionEquality().equals(other._tickers, _tickers)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.because, because) || other.because == because)&&(identical(other.evidence, evidence) || other.evidence == evidence));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,headline,headlineEn,published,const DeepCollectionEquality().hash(_sources),event,eventLabel,eventLabelAr,meaning,meaningAr,reconstructed,const DeepCollectionEquality().hash(_tickers),weight,because,evidence);

@override
String toString() {
  return 'NewsItem(id: $id, headline: $headline, headlineEn: $headlineEn, published: $published, sources: $sources, event: $event, eventLabel: $eventLabel, eventLabelAr: $eventLabelAr, meaning: $meaning, meaningAr: $meaningAr, reconstructed: $reconstructed, tickers: $tickers, weight: $weight, because: $because, evidence: $evidence)';
}


}

/// @nodoc
abstract mixin class _$NewsItemCopyWith<$Res> implements $NewsItemCopyWith<$Res> {
  factory _$NewsItemCopyWith(_NewsItem value, $Res Function(_NewsItem) _then) = __$NewsItemCopyWithImpl;
@override @useResult
$Res call({
 String id, String headline,@JsonKey(name: 'headline_en') String? headlineEn, String published, List<NewsAttribution> sources, String event,@JsonKey(name: 'event_label') String eventLabel,@JsonKey(name: 'event_label_ar') String eventLabelAr, String meaning,@JsonKey(name: 'meaning_ar') String meaningAr, bool reconstructed, List<String> tickers, String weight, String because, NewsEvidence? evidence
});


@override $NewsEvidenceCopyWith<$Res>? get evidence;

}
/// @nodoc
class __$NewsItemCopyWithImpl<$Res>
    implements _$NewsItemCopyWith<$Res> {
  __$NewsItemCopyWithImpl(this._self, this._then);

  final _NewsItem _self;
  final $Res Function(_NewsItem) _then;

/// Create a copy of NewsItem
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? headline = null,Object? headlineEn = freezed,Object? published = null,Object? sources = null,Object? event = null,Object? eventLabel = null,Object? eventLabelAr = null,Object? meaning = null,Object? meaningAr = null,Object? reconstructed = null,Object? tickers = null,Object? weight = null,Object? because = null,Object? evidence = freezed,}) {
  return _then(_NewsItem(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,headline: null == headline ? _self.headline : headline // ignore: cast_nullable_to_non_nullable
as String,headlineEn: freezed == headlineEn ? _self.headlineEn : headlineEn // ignore: cast_nullable_to_non_nullable
as String?,published: null == published ? _self.published : published // ignore: cast_nullable_to_non_nullable
as String,sources: null == sources ? _self._sources : sources // ignore: cast_nullable_to_non_nullable
as List<NewsAttribution>,event: null == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as String,eventLabel: null == eventLabel ? _self.eventLabel : eventLabel // ignore: cast_nullable_to_non_nullable
as String,eventLabelAr: null == eventLabelAr ? _self.eventLabelAr : eventLabelAr // ignore: cast_nullable_to_non_nullable
as String,meaning: null == meaning ? _self.meaning : meaning // ignore: cast_nullable_to_non_nullable
as String,meaningAr: null == meaningAr ? _self.meaningAr : meaningAr // ignore: cast_nullable_to_non_nullable
as String,reconstructed: null == reconstructed ? _self.reconstructed : reconstructed // ignore: cast_nullable_to_non_nullable
as bool,tickers: null == tickers ? _self._tickers : tickers // ignore: cast_nullable_to_non_nullable
as List<String>,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as String,because: null == because ? _self.because : because // ignore: cast_nullable_to_non_nullable
as String,evidence: freezed == evidence ? _self.evidence : evidence // ignore: cast_nullable_to_non_nullable
as NewsEvidence?,
  ));
}

/// Create a copy of NewsItem
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$NewsEvidenceCopyWith<$Res>? get evidence {
    if (_self.evidence == null) {
    return null;
  }

  return $NewsEvidenceCopyWith<$Res>(_self.evidence!, (value) {
    return _then(_self.copyWith(evidence: value));
  });
}
}


/// @nodoc
mixin _$NewsAttribution {

 String get id; String get link;
/// Create a copy of NewsAttribution
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$NewsAttributionCopyWith<NewsAttribution> get copyWith => _$NewsAttributionCopyWithImpl<NewsAttribution>(this as NewsAttribution, _$identity);

  /// Serializes this NewsAttribution to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is NewsAttribution&&(identical(other.id, id) || other.id == id)&&(identical(other.link, link) || other.link == link));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,link);

@override
String toString() {
  return 'NewsAttribution(id: $id, link: $link)';
}


}

/// @nodoc
abstract mixin class $NewsAttributionCopyWith<$Res>  {
  factory $NewsAttributionCopyWith(NewsAttribution value, $Res Function(NewsAttribution) _then) = _$NewsAttributionCopyWithImpl;
@useResult
$Res call({
 String id, String link
});




}
/// @nodoc
class _$NewsAttributionCopyWithImpl<$Res>
    implements $NewsAttributionCopyWith<$Res> {
  _$NewsAttributionCopyWithImpl(this._self, this._then);

  final NewsAttribution _self;
  final $Res Function(NewsAttribution) _then;

/// Create a copy of NewsAttribution
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? link = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [NewsAttribution].
extension NewsAttributionPatterns on NewsAttribution {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _NewsAttribution value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _NewsAttribution() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _NewsAttribution value)  $default,){
final _that = this;
switch (_that) {
case _NewsAttribution():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _NewsAttribution value)?  $default,){
final _that = this;
switch (_that) {
case _NewsAttribution() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String link)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _NewsAttribution() when $default != null:
return $default(_that.id,_that.link);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String link)  $default,) {final _that = this;
switch (_that) {
case _NewsAttribution():
return $default(_that.id,_that.link);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String link)?  $default,) {final _that = this;
switch (_that) {
case _NewsAttribution() when $default != null:
return $default(_that.id,_that.link);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _NewsAttribution implements NewsAttribution {
  const _NewsAttribution({required this.id, this.link = ''});
  factory _NewsAttribution.fromJson(Map<String, dynamic> json) => _$NewsAttributionFromJson(json);

@override final  String id;
@override@JsonKey() final  String link;

/// Create a copy of NewsAttribution
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$NewsAttributionCopyWith<_NewsAttribution> get copyWith => __$NewsAttributionCopyWithImpl<_NewsAttribution>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$NewsAttributionToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _NewsAttribution&&(identical(other.id, id) || other.id == id)&&(identical(other.link, link) || other.link == link));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,link);

@override
String toString() {
  return 'NewsAttribution(id: $id, link: $link)';
}


}

/// @nodoc
abstract mixin class _$NewsAttributionCopyWith<$Res> implements $NewsAttributionCopyWith<$Res> {
  factory _$NewsAttributionCopyWith(_NewsAttribution value, $Res Function(_NewsAttribution) _then) = __$NewsAttributionCopyWithImpl;
@override @useResult
$Res call({
 String id, String link
});




}
/// @nodoc
class __$NewsAttributionCopyWithImpl<$Res>
    implements _$NewsAttributionCopyWith<$Res> {
  __$NewsAttributionCopyWithImpl(this._self, this._then);

  final _NewsAttribution _self;
  final $Res Function(_NewsAttribution) _then;

/// Create a copy of NewsAttribution
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? link = null,}) {
  return _then(_NewsAttribution(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$NewsEvidence {

 String get ticker; num get volume;@JsonKey(name: 'median_volume_20d') num get medianVolume20d; double get ratio; double get threshold; String? get date;
/// Create a copy of NewsEvidence
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$NewsEvidenceCopyWith<NewsEvidence> get copyWith => _$NewsEvidenceCopyWithImpl<NewsEvidence>(this as NewsEvidence, _$identity);

  /// Serializes this NewsEvidence to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is NewsEvidence&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.volume, volume) || other.volume == volume)&&(identical(other.medianVolume20d, medianVolume20d) || other.medianVolume20d == medianVolume20d)&&(identical(other.ratio, ratio) || other.ratio == ratio)&&(identical(other.threshold, threshold) || other.threshold == threshold)&&(identical(other.date, date) || other.date == date));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,volume,medianVolume20d,ratio,threshold,date);

@override
String toString() {
  return 'NewsEvidence(ticker: $ticker, volume: $volume, medianVolume20d: $medianVolume20d, ratio: $ratio, threshold: $threshold, date: $date)';
}


}

/// @nodoc
abstract mixin class $NewsEvidenceCopyWith<$Res>  {
  factory $NewsEvidenceCopyWith(NewsEvidence value, $Res Function(NewsEvidence) _then) = _$NewsEvidenceCopyWithImpl;
@useResult
$Res call({
 String ticker, num volume,@JsonKey(name: 'median_volume_20d') num medianVolume20d, double ratio, double threshold, String? date
});




}
/// @nodoc
class _$NewsEvidenceCopyWithImpl<$Res>
    implements $NewsEvidenceCopyWith<$Res> {
  _$NewsEvidenceCopyWithImpl(this._self, this._then);

  final NewsEvidence _self;
  final $Res Function(NewsEvidence) _then;

/// Create a copy of NewsEvidence
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


/// Adds pattern-matching-related methods to [NewsEvidence].
extension NewsEvidencePatterns on NewsEvidence {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _NewsEvidence value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _NewsEvidence() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _NewsEvidence value)  $default,){
final _that = this;
switch (_that) {
case _NewsEvidence():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _NewsEvidence value)?  $default,){
final _that = this;
switch (_that) {
case _NewsEvidence() when $default != null:
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
case _NewsEvidence() when $default != null:
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
case _NewsEvidence():
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
case _NewsEvidence() when $default != null:
return $default(_that.ticker,_that.volume,_that.medianVolume20d,_that.ratio,_that.threshold,_that.date);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _NewsEvidence implements NewsEvidence {
  const _NewsEvidence({required this.ticker, this.volume = 0, @JsonKey(name: 'median_volume_20d') this.medianVolume20d = 0, this.ratio = 0, this.threshold = 2.0, this.date});
  factory _NewsEvidence.fromJson(Map<String, dynamic> json) => _$NewsEvidenceFromJson(json);

@override final  String ticker;
@override@JsonKey() final  num volume;
@override@JsonKey(name: 'median_volume_20d') final  num medianVolume20d;
@override@JsonKey() final  double ratio;
@override@JsonKey() final  double threshold;
@override final  String? date;

/// Create a copy of NewsEvidence
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$NewsEvidenceCopyWith<_NewsEvidence> get copyWith => __$NewsEvidenceCopyWithImpl<_NewsEvidence>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$NewsEvidenceToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _NewsEvidence&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.volume, volume) || other.volume == volume)&&(identical(other.medianVolume20d, medianVolume20d) || other.medianVolume20d == medianVolume20d)&&(identical(other.ratio, ratio) || other.ratio == ratio)&&(identical(other.threshold, threshold) || other.threshold == threshold)&&(identical(other.date, date) || other.date == date));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,volume,medianVolume20d,ratio,threshold,date);

@override
String toString() {
  return 'NewsEvidence(ticker: $ticker, volume: $volume, medianVolume20d: $medianVolume20d, ratio: $ratio, threshold: $threshold, date: $date)';
}


}

/// @nodoc
abstract mixin class _$NewsEvidenceCopyWith<$Res> implements $NewsEvidenceCopyWith<$Res> {
  factory _$NewsEvidenceCopyWith(_NewsEvidence value, $Res Function(_NewsEvidence) _then) = __$NewsEvidenceCopyWithImpl;
@override @useResult
$Res call({
 String ticker, num volume,@JsonKey(name: 'median_volume_20d') num medianVolume20d, double ratio, double threshold, String? date
});




}
/// @nodoc
class __$NewsEvidenceCopyWithImpl<$Res>
    implements _$NewsEvidenceCopyWith<$Res> {
  __$NewsEvidenceCopyWithImpl(this._self, this._then);

  final _NewsEvidence _self;
  final $Res Function(_NewsEvidence) _then;

/// Create a copy of NewsEvidence
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? volume = null,Object? medianVolume20d = null,Object? ratio = null,Object? threshold = null,Object? date = freezed,}) {
  return _then(_NewsEvidence(
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
