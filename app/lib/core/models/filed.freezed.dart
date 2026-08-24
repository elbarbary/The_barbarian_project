// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'filed.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$FiledMonth {

 String get month; int get count; List<FiledFiling> get items;
/// Create a copy of FiledMonth
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FiledMonthCopyWith<FiledMonth> get copyWith => _$FiledMonthCopyWithImpl<FiledMonth>(this as FiledMonth, _$identity);

  /// Serializes this FiledMonth to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FiledMonth&&(identical(other.month, month) || other.month == month)&&(identical(other.count, count) || other.count == count)&&const DeepCollectionEquality().equals(other.items, items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,month,count,const DeepCollectionEquality().hash(items));

@override
String toString() {
  return 'FiledMonth(month: $month, count: $count, items: $items)';
}


}

/// @nodoc
abstract mixin class $FiledMonthCopyWith<$Res>  {
  factory $FiledMonthCopyWith(FiledMonth value, $Res Function(FiledMonth) _then) = _$FiledMonthCopyWithImpl;
@useResult
$Res call({
 String month, int count, List<FiledFiling> items
});




}
/// @nodoc
class _$FiledMonthCopyWithImpl<$Res>
    implements $FiledMonthCopyWith<$Res> {
  _$FiledMonthCopyWithImpl(this._self, this._then);

  final FiledMonth _self;
  final $Res Function(FiledMonth) _then;

/// Create a copy of FiledMonth
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? month = null,Object? count = null,Object? items = null,}) {
  return _then(_self.copyWith(
month: null == month ? _self.month : month // ignore: cast_nullable_to_non_nullable
as String,count: null == count ? _self.count : count // ignore: cast_nullable_to_non_nullable
as int,items: null == items ? _self.items : items // ignore: cast_nullable_to_non_nullable
as List<FiledFiling>,
  ));
}

}


/// Adds pattern-matching-related methods to [FiledMonth].
extension FiledMonthPatterns on FiledMonth {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FiledMonth value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FiledMonth() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FiledMonth value)  $default,){
final _that = this;
switch (_that) {
case _FiledMonth():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FiledMonth value)?  $default,){
final _that = this;
switch (_that) {
case _FiledMonth() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String month,  int count,  List<FiledFiling> items)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FiledMonth() when $default != null:
return $default(_that.month,_that.count,_that.items);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String month,  int count,  List<FiledFiling> items)  $default,) {final _that = this;
switch (_that) {
case _FiledMonth():
return $default(_that.month,_that.count,_that.items);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String month,  int count,  List<FiledFiling> items)?  $default,) {final _that = this;
switch (_that) {
case _FiledMonth() when $default != null:
return $default(_that.month,_that.count,_that.items);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FiledMonth extends FiledMonth {
  const _FiledMonth({this.month = '', this.count = 0, final  List<FiledFiling> items = const <FiledFiling>[]}): _items = items,super._();
  factory _FiledMonth.fromJson(Map<String, dynamic> json) => _$FiledMonthFromJson(json);

@override@JsonKey() final  String month;
@override@JsonKey() final  int count;
 final  List<FiledFiling> _items;
@override@JsonKey() List<FiledFiling> get items {
  if (_items is EqualUnmodifiableListView) return _items;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_items);
}


/// Create a copy of FiledMonth
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FiledMonthCopyWith<_FiledMonth> get copyWith => __$FiledMonthCopyWithImpl<_FiledMonth>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FiledMonthToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _FiledMonth&&(identical(other.month, month) || other.month == month)&&(identical(other.count, count) || other.count == count)&&const DeepCollectionEquality().equals(other._items, _items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,month,count,const DeepCollectionEquality().hash(_items));

@override
String toString() {
  return 'FiledMonth(month: $month, count: $count, items: $items)';
}


}

/// @nodoc
abstract mixin class _$FiledMonthCopyWith<$Res> implements $FiledMonthCopyWith<$Res> {
  factory _$FiledMonthCopyWith(_FiledMonth value, $Res Function(_FiledMonth) _then) = __$FiledMonthCopyWithImpl;
@override @useResult
$Res call({
 String month, int count, List<FiledFiling> items
});




}
/// @nodoc
class __$FiledMonthCopyWithImpl<$Res>
    implements _$FiledMonthCopyWith<$Res> {
  __$FiledMonthCopyWithImpl(this._self, this._then);

  final _FiledMonth _self;
  final $Res Function(_FiledMonth) _then;

/// Create a copy of FiledMonth
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? month = null,Object? count = null,Object? items = null,}) {
  return _then(_FiledMonth(
month: null == month ? _self.month : month // ignore: cast_nullable_to_non_nullable
as String,count: null == count ? _self.count : count // ignore: cast_nullable_to_non_nullable
as int,items: null == items ? _self._items : items // ignore: cast_nullable_to_non_nullable
as List<FiledFiling>,
  ));
}


}


/// @nodoc
mixin _$FiledFiling {

 String get date; String? get ticker;/// The exchange's own heading, Arabic first — that is the language it
/// files in, and the English one is its own translation, not ours.
 String get title;@JsonKey(name: 'title_en') String get titleEn;/// What kind of filing, when `filing_types.classify_rules` could place it
/// from a published pattern. Null when it could not, which is honest and
/// free — the title still says what it is.
 String? get type; String get section; String get id; String get link;
/// Create a copy of FiledFiling
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FiledFilingCopyWith<FiledFiling> get copyWith => _$FiledFilingCopyWithImpl<FiledFiling>(this as FiledFiling, _$identity);

  /// Serializes this FiledFiling to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FiledFiling&&(identical(other.date, date) || other.date == date)&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.title, title) || other.title == title)&&(identical(other.titleEn, titleEn) || other.titleEn == titleEn)&&(identical(other.type, type) || other.type == type)&&(identical(other.section, section) || other.section == section)&&(identical(other.id, id) || other.id == id)&&(identical(other.link, link) || other.link == link));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,ticker,title,titleEn,type,section,id,link);

@override
String toString() {
  return 'FiledFiling(date: $date, ticker: $ticker, title: $title, titleEn: $titleEn, type: $type, section: $section, id: $id, link: $link)';
}


}

/// @nodoc
abstract mixin class $FiledFilingCopyWith<$Res>  {
  factory $FiledFilingCopyWith(FiledFiling value, $Res Function(FiledFiling) _then) = _$FiledFilingCopyWithImpl;
@useResult
$Res call({
 String date, String? ticker, String title,@JsonKey(name: 'title_en') String titleEn, String? type, String section, String id, String link
});




}
/// @nodoc
class _$FiledFilingCopyWithImpl<$Res>
    implements $FiledFilingCopyWith<$Res> {
  _$FiledFilingCopyWithImpl(this._self, this._then);

  final FiledFiling _self;
  final $Res Function(FiledFiling) _then;

/// Create a copy of FiledFiling
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? ticker = freezed,Object? title = null,Object? titleEn = null,Object? type = freezed,Object? section = null,Object? id = null,Object? link = null,}) {
  return _then(_self.copyWith(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,ticker: freezed == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String?,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,titleEn: null == titleEn ? _self.titleEn : titleEn // ignore: cast_nullable_to_non_nullable
as String,type: freezed == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String?,section: null == section ? _self.section : section // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [FiledFiling].
extension FiledFilingPatterns on FiledFiling {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FiledFiling value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FiledFiling() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FiledFiling value)  $default,){
final _that = this;
switch (_that) {
case _FiledFiling():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FiledFiling value)?  $default,){
final _that = this;
switch (_that) {
case _FiledFiling() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  String? ticker,  String title, @JsonKey(name: 'title_en')  String titleEn,  String? type,  String section,  String id,  String link)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FiledFiling() when $default != null:
return $default(_that.date,_that.ticker,_that.title,_that.titleEn,_that.type,_that.section,_that.id,_that.link);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  String? ticker,  String title, @JsonKey(name: 'title_en')  String titleEn,  String? type,  String section,  String id,  String link)  $default,) {final _that = this;
switch (_that) {
case _FiledFiling():
return $default(_that.date,_that.ticker,_that.title,_that.titleEn,_that.type,_that.section,_that.id,_that.link);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  String? ticker,  String title, @JsonKey(name: 'title_en')  String titleEn,  String? type,  String section,  String id,  String link)?  $default,) {final _that = this;
switch (_that) {
case _FiledFiling() when $default != null:
return $default(_that.date,_that.ticker,_that.title,_that.titleEn,_that.type,_that.section,_that.id,_that.link);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FiledFiling extends FiledFiling {
  const _FiledFiling({this.date = '', this.ticker, this.title = '', @JsonKey(name: 'title_en') this.titleEn = '', this.type, this.section = '', this.id = '', this.link = ''}): super._();
  factory _FiledFiling.fromJson(Map<String, dynamic> json) => _$FiledFilingFromJson(json);

@override@JsonKey() final  String date;
@override final  String? ticker;
/// The exchange's own heading, Arabic first — that is the language it
/// files in, and the English one is its own translation, not ours.
@override@JsonKey() final  String title;
@override@JsonKey(name: 'title_en') final  String titleEn;
/// What kind of filing, when `filing_types.classify_rules` could place it
/// from a published pattern. Null when it could not, which is honest and
/// free — the title still says what it is.
@override final  String? type;
@override@JsonKey() final  String section;
@override@JsonKey() final  String id;
@override@JsonKey() final  String link;

/// Create a copy of FiledFiling
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FiledFilingCopyWith<_FiledFiling> get copyWith => __$FiledFilingCopyWithImpl<_FiledFiling>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FiledFilingToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _FiledFiling&&(identical(other.date, date) || other.date == date)&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.title, title) || other.title == title)&&(identical(other.titleEn, titleEn) || other.titleEn == titleEn)&&(identical(other.type, type) || other.type == type)&&(identical(other.section, section) || other.section == section)&&(identical(other.id, id) || other.id == id)&&(identical(other.link, link) || other.link == link));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,ticker,title,titleEn,type,section,id,link);

@override
String toString() {
  return 'FiledFiling(date: $date, ticker: $ticker, title: $title, titleEn: $titleEn, type: $type, section: $section, id: $id, link: $link)';
}


}

/// @nodoc
abstract mixin class _$FiledFilingCopyWith<$Res> implements $FiledFilingCopyWith<$Res> {
  factory _$FiledFilingCopyWith(_FiledFiling value, $Res Function(_FiledFiling) _then) = __$FiledFilingCopyWithImpl;
@override @useResult
$Res call({
 String date, String? ticker, String title,@JsonKey(name: 'title_en') String titleEn, String? type, String section, String id, String link
});




}
/// @nodoc
class __$FiledFilingCopyWithImpl<$Res>
    implements _$FiledFilingCopyWith<$Res> {
  __$FiledFilingCopyWithImpl(this._self, this._then);

  final _FiledFiling _self;
  final $Res Function(_FiledFiling) _then;

/// Create a copy of FiledFiling
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? ticker = freezed,Object? title = null,Object? titleEn = null,Object? type = freezed,Object? section = null,Object? id = null,Object? link = null,}) {
  return _then(_FiledFiling(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,ticker: freezed == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String?,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,titleEn: null == titleEn ? _self.titleEn : titleEn // ignore: cast_nullable_to_non_nullable
as String,type: freezed == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String?,section: null == section ? _self.section : section // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$FiledIndex {

 String? get generated; List<FiledIndexMonth> get months;
/// Create a copy of FiledIndex
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FiledIndexCopyWith<FiledIndex> get copyWith => _$FiledIndexCopyWithImpl<FiledIndex>(this as FiledIndex, _$identity);

  /// Serializes this FiledIndex to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FiledIndex&&(identical(other.generated, generated) || other.generated == generated)&&const DeepCollectionEquality().equals(other.months, months));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,generated,const DeepCollectionEquality().hash(months));

@override
String toString() {
  return 'FiledIndex(generated: $generated, months: $months)';
}


}

/// @nodoc
abstract mixin class $FiledIndexCopyWith<$Res>  {
  factory $FiledIndexCopyWith(FiledIndex value, $Res Function(FiledIndex) _then) = _$FiledIndexCopyWithImpl;
@useResult
$Res call({
 String? generated, List<FiledIndexMonth> months
});




}
/// @nodoc
class _$FiledIndexCopyWithImpl<$Res>
    implements $FiledIndexCopyWith<$Res> {
  _$FiledIndexCopyWithImpl(this._self, this._then);

  final FiledIndex _self;
  final $Res Function(FiledIndex) _then;

/// Create a copy of FiledIndex
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? generated = freezed,Object? months = null,}) {
  return _then(_self.copyWith(
generated: freezed == generated ? _self.generated : generated // ignore: cast_nullable_to_non_nullable
as String?,months: null == months ? _self.months : months // ignore: cast_nullable_to_non_nullable
as List<FiledIndexMonth>,
  ));
}

}


/// Adds pattern-matching-related methods to [FiledIndex].
extension FiledIndexPatterns on FiledIndex {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FiledIndex value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FiledIndex() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FiledIndex value)  $default,){
final _that = this;
switch (_that) {
case _FiledIndex():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FiledIndex value)?  $default,){
final _that = this;
switch (_that) {
case _FiledIndex() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? generated,  List<FiledIndexMonth> months)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FiledIndex() when $default != null:
return $default(_that.generated,_that.months);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? generated,  List<FiledIndexMonth> months)  $default,) {final _that = this;
switch (_that) {
case _FiledIndex():
return $default(_that.generated,_that.months);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? generated,  List<FiledIndexMonth> months)?  $default,) {final _that = this;
switch (_that) {
case _FiledIndex() when $default != null:
return $default(_that.generated,_that.months);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FiledIndex extends FiledIndex {
  const _FiledIndex({this.generated, final  List<FiledIndexMonth> months = const <FiledIndexMonth>[]}): _months = months,super._();
  factory _FiledIndex.fromJson(Map<String, dynamic> json) => _$FiledIndexFromJson(json);

@override final  String? generated;
 final  List<FiledIndexMonth> _months;
@override@JsonKey() List<FiledIndexMonth> get months {
  if (_months is EqualUnmodifiableListView) return _months;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_months);
}


/// Create a copy of FiledIndex
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FiledIndexCopyWith<_FiledIndex> get copyWith => __$FiledIndexCopyWithImpl<_FiledIndex>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FiledIndexToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _FiledIndex&&(identical(other.generated, generated) || other.generated == generated)&&const DeepCollectionEquality().equals(other._months, _months));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,generated,const DeepCollectionEquality().hash(_months));

@override
String toString() {
  return 'FiledIndex(generated: $generated, months: $months)';
}


}

/// @nodoc
abstract mixin class _$FiledIndexCopyWith<$Res> implements $FiledIndexCopyWith<$Res> {
  factory _$FiledIndexCopyWith(_FiledIndex value, $Res Function(_FiledIndex) _then) = __$FiledIndexCopyWithImpl;
@override @useResult
$Res call({
 String? generated, List<FiledIndexMonth> months
});




}
/// @nodoc
class __$FiledIndexCopyWithImpl<$Res>
    implements _$FiledIndexCopyWith<$Res> {
  __$FiledIndexCopyWithImpl(this._self, this._then);

  final _FiledIndex _self;
  final $Res Function(_FiledIndex) _then;

/// Create a copy of FiledIndex
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? generated = freezed,Object? months = null,}) {
  return _then(_FiledIndex(
generated: freezed == generated ? _self.generated : generated // ignore: cast_nullable_to_non_nullable
as String?,months: null == months ? _self._months : months // ignore: cast_nullable_to_non_nullable
as List<FiledIndexMonth>,
  ));
}


}


/// @nodoc
mixin _$FiledIndexMonth {

 String get month; int get count; String get first; String get last;
/// Create a copy of FiledIndexMonth
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FiledIndexMonthCopyWith<FiledIndexMonth> get copyWith => _$FiledIndexMonthCopyWithImpl<FiledIndexMonth>(this as FiledIndexMonth, _$identity);

  /// Serializes this FiledIndexMonth to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FiledIndexMonth&&(identical(other.month, month) || other.month == month)&&(identical(other.count, count) || other.count == count)&&(identical(other.first, first) || other.first == first)&&(identical(other.last, last) || other.last == last));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,month,count,first,last);

@override
String toString() {
  return 'FiledIndexMonth(month: $month, count: $count, first: $first, last: $last)';
}


}

/// @nodoc
abstract mixin class $FiledIndexMonthCopyWith<$Res>  {
  factory $FiledIndexMonthCopyWith(FiledIndexMonth value, $Res Function(FiledIndexMonth) _then) = _$FiledIndexMonthCopyWithImpl;
@useResult
$Res call({
 String month, int count, String first, String last
});




}
/// @nodoc
class _$FiledIndexMonthCopyWithImpl<$Res>
    implements $FiledIndexMonthCopyWith<$Res> {
  _$FiledIndexMonthCopyWithImpl(this._self, this._then);

  final FiledIndexMonth _self;
  final $Res Function(FiledIndexMonth) _then;

/// Create a copy of FiledIndexMonth
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? month = null,Object? count = null,Object? first = null,Object? last = null,}) {
  return _then(_self.copyWith(
month: null == month ? _self.month : month // ignore: cast_nullable_to_non_nullable
as String,count: null == count ? _self.count : count // ignore: cast_nullable_to_non_nullable
as int,first: null == first ? _self.first : first // ignore: cast_nullable_to_non_nullable
as String,last: null == last ? _self.last : last // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [FiledIndexMonth].
extension FiledIndexMonthPatterns on FiledIndexMonth {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FiledIndexMonth value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FiledIndexMonth() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FiledIndexMonth value)  $default,){
final _that = this;
switch (_that) {
case _FiledIndexMonth():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FiledIndexMonth value)?  $default,){
final _that = this;
switch (_that) {
case _FiledIndexMonth() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String month,  int count,  String first,  String last)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FiledIndexMonth() when $default != null:
return $default(_that.month,_that.count,_that.first,_that.last);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String month,  int count,  String first,  String last)  $default,) {final _that = this;
switch (_that) {
case _FiledIndexMonth():
return $default(_that.month,_that.count,_that.first,_that.last);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String month,  int count,  String first,  String last)?  $default,) {final _that = this;
switch (_that) {
case _FiledIndexMonth() when $default != null:
return $default(_that.month,_that.count,_that.first,_that.last);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FiledIndexMonth implements FiledIndexMonth {
  const _FiledIndexMonth({this.month = '', this.count = 0, this.first = '', this.last = ''});
  factory _FiledIndexMonth.fromJson(Map<String, dynamic> json) => _$FiledIndexMonthFromJson(json);

@override@JsonKey() final  String month;
@override@JsonKey() final  int count;
@override@JsonKey() final  String first;
@override@JsonKey() final  String last;

/// Create a copy of FiledIndexMonth
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FiledIndexMonthCopyWith<_FiledIndexMonth> get copyWith => __$FiledIndexMonthCopyWithImpl<_FiledIndexMonth>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FiledIndexMonthToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _FiledIndexMonth&&(identical(other.month, month) || other.month == month)&&(identical(other.count, count) || other.count == count)&&(identical(other.first, first) || other.first == first)&&(identical(other.last, last) || other.last == last));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,month,count,first,last);

@override
String toString() {
  return 'FiledIndexMonth(month: $month, count: $count, first: $first, last: $last)';
}


}

/// @nodoc
abstract mixin class _$FiledIndexMonthCopyWith<$Res> implements $FiledIndexMonthCopyWith<$Res> {
  factory _$FiledIndexMonthCopyWith(_FiledIndexMonth value, $Res Function(_FiledIndexMonth) _then) = __$FiledIndexMonthCopyWithImpl;
@override @useResult
$Res call({
 String month, int count, String first, String last
});




}
/// @nodoc
class __$FiledIndexMonthCopyWithImpl<$Res>
    implements _$FiledIndexMonthCopyWith<$Res> {
  __$FiledIndexMonthCopyWithImpl(this._self, this._then);

  final _FiledIndexMonth _self;
  final $Res Function(_FiledIndexMonth) _then;

/// Create a copy of FiledIndexMonth
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? month = null,Object? count = null,Object? first = null,Object? last = null,}) {
  return _then(_FiledIndexMonth(
month: null == month ? _self.month : month // ignore: cast_nullable_to_non_nullable
as String,count: null == count ? _self.count : count // ignore: cast_nullable_to_non_nullable
as int,first: null == first ? _self.first : first // ignore: cast_nullable_to_non_nullable
as String,last: null == last ? _self.last : last // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
