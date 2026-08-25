// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'sector_report.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$SectorMovement {

 String get key; int get rising; int get falling; int get flat; int get unknown;
/// Create a copy of SectorMovement
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SectorMovementCopyWith<SectorMovement> get copyWith => _$SectorMovementCopyWithImpl<SectorMovement>(this as SectorMovement, _$identity);

  /// Serializes this SectorMovement to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SectorMovement&&(identical(other.key, key) || other.key == key)&&(identical(other.rising, rising) || other.rising == rising)&&(identical(other.falling, falling) || other.falling == falling)&&(identical(other.flat, flat) || other.flat == flat)&&(identical(other.unknown, unknown) || other.unknown == unknown));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,key,rising,falling,flat,unknown);

@override
String toString() {
  return 'SectorMovement(key: $key, rising: $rising, falling: $falling, flat: $flat, unknown: $unknown)';
}


}

/// @nodoc
abstract mixin class $SectorMovementCopyWith<$Res>  {
  factory $SectorMovementCopyWith(SectorMovement value, $Res Function(SectorMovement) _then) = _$SectorMovementCopyWithImpl;
@useResult
$Res call({
 String key, int rising, int falling, int flat, int unknown
});




}
/// @nodoc
class _$SectorMovementCopyWithImpl<$Res>
    implements $SectorMovementCopyWith<$Res> {
  _$SectorMovementCopyWithImpl(this._self, this._then);

  final SectorMovement _self;
  final $Res Function(SectorMovement) _then;

/// Create a copy of SectorMovement
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? key = null,Object? rising = null,Object? falling = null,Object? flat = null,Object? unknown = null,}) {
  return _then(_self.copyWith(
key: null == key ? _self.key : key // ignore: cast_nullable_to_non_nullable
as String,rising: null == rising ? _self.rising : rising // ignore: cast_nullable_to_non_nullable
as int,falling: null == falling ? _self.falling : falling // ignore: cast_nullable_to_non_nullable
as int,flat: null == flat ? _self.flat : flat // ignore: cast_nullable_to_non_nullable
as int,unknown: null == unknown ? _self.unknown : unknown // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [SectorMovement].
extension SectorMovementPatterns on SectorMovement {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SectorMovement value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SectorMovement() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SectorMovement value)  $default,){
final _that = this;
switch (_that) {
case _SectorMovement():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SectorMovement value)?  $default,){
final _that = this;
switch (_that) {
case _SectorMovement() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String key,  int rising,  int falling,  int flat,  int unknown)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SectorMovement() when $default != null:
return $default(_that.key,_that.rising,_that.falling,_that.flat,_that.unknown);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String key,  int rising,  int falling,  int flat,  int unknown)  $default,) {final _that = this;
switch (_that) {
case _SectorMovement():
return $default(_that.key,_that.rising,_that.falling,_that.flat,_that.unknown);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String key,  int rising,  int falling,  int flat,  int unknown)?  $default,) {final _that = this;
switch (_that) {
case _SectorMovement() when $default != null:
return $default(_that.key,_that.rising,_that.falling,_that.flat,_that.unknown);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SectorMovement extends SectorMovement {
  const _SectorMovement({this.key = '', this.rising = 0, this.falling = 0, this.flat = 0, this.unknown = 0}): super._();
  factory _SectorMovement.fromJson(Map<String, dynamic> json) => _$SectorMovementFromJson(json);

@override@JsonKey() final  String key;
@override@JsonKey() final  int rising;
@override@JsonKey() final  int falling;
@override@JsonKey() final  int flat;
@override@JsonKey() final  int unknown;

/// Create a copy of SectorMovement
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SectorMovementCopyWith<_SectorMovement> get copyWith => __$SectorMovementCopyWithImpl<_SectorMovement>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SectorMovementToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SectorMovement&&(identical(other.key, key) || other.key == key)&&(identical(other.rising, rising) || other.rising == rising)&&(identical(other.falling, falling) || other.falling == falling)&&(identical(other.flat, flat) || other.flat == flat)&&(identical(other.unknown, unknown) || other.unknown == unknown));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,key,rising,falling,flat,unknown);

@override
String toString() {
  return 'SectorMovement(key: $key, rising: $rising, falling: $falling, flat: $flat, unknown: $unknown)';
}


}

/// @nodoc
abstract mixin class _$SectorMovementCopyWith<$Res> implements $SectorMovementCopyWith<$Res> {
  factory _$SectorMovementCopyWith(_SectorMovement value, $Res Function(_SectorMovement) _then) = __$SectorMovementCopyWithImpl;
@override @useResult
$Res call({
 String key, int rising, int falling, int flat, int unknown
});




}
/// @nodoc
class __$SectorMovementCopyWithImpl<$Res>
    implements _$SectorMovementCopyWith<$Res> {
  __$SectorMovementCopyWithImpl(this._self, this._then);

  final _SectorMovement _self;
  final $Res Function(_SectorMovement) _then;

/// Create a copy of SectorMovement
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? key = null,Object? rising = null,Object? falling = null,Object? flat = null,Object? unknown = null,}) {
  return _then(_SectorMovement(
key: null == key ? _self.key : key // ignore: cast_nullable_to_non_nullable
as String,rising: null == rising ? _self.rising : rising // ignore: cast_nullable_to_non_nullable
as int,falling: null == falling ? _self.falling : falling // ignore: cast_nullable_to_non_nullable
as int,flat: null == flat ? _self.flat : flat // ignore: cast_nullable_to_non_nullable
as int,unknown: null == unknown ? _self.unknown : unknown // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$SectorMedian {

 String get key; double get value; String get unit;
/// Create a copy of SectorMedian
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SectorMedianCopyWith<SectorMedian> get copyWith => _$SectorMedianCopyWithImpl<SectorMedian>(this as SectorMedian, _$identity);

  /// Serializes this SectorMedian to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SectorMedian&&(identical(other.key, key) || other.key == key)&&(identical(other.value, value) || other.value == value)&&(identical(other.unit, unit) || other.unit == unit));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,key,value,unit);

@override
String toString() {
  return 'SectorMedian(key: $key, value: $value, unit: $unit)';
}


}

/// @nodoc
abstract mixin class $SectorMedianCopyWith<$Res>  {
  factory $SectorMedianCopyWith(SectorMedian value, $Res Function(SectorMedian) _then) = _$SectorMedianCopyWithImpl;
@useResult
$Res call({
 String key, double value, String unit
});




}
/// @nodoc
class _$SectorMedianCopyWithImpl<$Res>
    implements $SectorMedianCopyWith<$Res> {
  _$SectorMedianCopyWithImpl(this._self, this._then);

  final SectorMedian _self;
  final $Res Function(SectorMedian) _then;

/// Create a copy of SectorMedian
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? key = null,Object? value = null,Object? unit = null,}) {
  return _then(_self.copyWith(
key: null == key ? _self.key : key // ignore: cast_nullable_to_non_nullable
as String,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as double,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [SectorMedian].
extension SectorMedianPatterns on SectorMedian {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SectorMedian value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SectorMedian() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SectorMedian value)  $default,){
final _that = this;
switch (_that) {
case _SectorMedian():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SectorMedian value)?  $default,){
final _that = this;
switch (_that) {
case _SectorMedian() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String key,  double value,  String unit)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SectorMedian() when $default != null:
return $default(_that.key,_that.value,_that.unit);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String key,  double value,  String unit)  $default,) {final _that = this;
switch (_that) {
case _SectorMedian():
return $default(_that.key,_that.value,_that.unit);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String key,  double value,  String unit)?  $default,) {final _that = this;
switch (_that) {
case _SectorMedian() when $default != null:
return $default(_that.key,_that.value,_that.unit);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SectorMedian implements SectorMedian {
  const _SectorMedian({this.key = '', this.value = 0, this.unit = 'ratio'});
  factory _SectorMedian.fromJson(Map<String, dynamic> json) => _$SectorMedianFromJson(json);

@override@JsonKey() final  String key;
@override@JsonKey() final  double value;
@override@JsonKey() final  String unit;

/// Create a copy of SectorMedian
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SectorMedianCopyWith<_SectorMedian> get copyWith => __$SectorMedianCopyWithImpl<_SectorMedian>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SectorMedianToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SectorMedian&&(identical(other.key, key) || other.key == key)&&(identical(other.value, value) || other.value == value)&&(identical(other.unit, unit) || other.unit == unit));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,key,value,unit);

@override
String toString() {
  return 'SectorMedian(key: $key, value: $value, unit: $unit)';
}


}

/// @nodoc
abstract mixin class _$SectorMedianCopyWith<$Res> implements $SectorMedianCopyWith<$Res> {
  factory _$SectorMedianCopyWith(_SectorMedian value, $Res Function(_SectorMedian) _then) = __$SectorMedianCopyWithImpl;
@override @useResult
$Res call({
 String key, double value, String unit
});




}
/// @nodoc
class __$SectorMedianCopyWithImpl<$Res>
    implements _$SectorMedianCopyWith<$Res> {
  __$SectorMedianCopyWithImpl(this._self, this._then);

  final _SectorMedian _self;
  final $Res Function(_SectorMedian) _then;

/// Create a copy of SectorMedian
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? key = null,Object? value = null,Object? unit = null,}) {
  return _then(_SectorMedian(
key: null == key ? _self.key : key // ignore: cast_nullable_to_non_nullable
as String,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as double,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$SectorStandout {

 String get ticker;@JsonKey(name: 'name_en') String get nameEn;@JsonKey(name: 'name_ar') String? get nameAr; int get improving; int get deteriorating; int get readable;
/// Create a copy of SectorStandout
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SectorStandoutCopyWith<SectorStandout> get copyWith => _$SectorStandoutCopyWithImpl<SectorStandout>(this as SectorStandout, _$identity);

  /// Serializes this SectorStandout to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SectorStandout&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.nameEn, nameEn) || other.nameEn == nameEn)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.improving, improving) || other.improving == improving)&&(identical(other.deteriorating, deteriorating) || other.deteriorating == deteriorating)&&(identical(other.readable, readable) || other.readable == readable));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,nameEn,nameAr,improving,deteriorating,readable);

@override
String toString() {
  return 'SectorStandout(ticker: $ticker, nameEn: $nameEn, nameAr: $nameAr, improving: $improving, deteriorating: $deteriorating, readable: $readable)';
}


}

/// @nodoc
abstract mixin class $SectorStandoutCopyWith<$Res>  {
  factory $SectorStandoutCopyWith(SectorStandout value, $Res Function(SectorStandout) _then) = _$SectorStandoutCopyWithImpl;
@useResult
$Res call({
 String ticker,@JsonKey(name: 'name_en') String nameEn,@JsonKey(name: 'name_ar') String? nameAr, int improving, int deteriorating, int readable
});




}
/// @nodoc
class _$SectorStandoutCopyWithImpl<$Res>
    implements $SectorStandoutCopyWith<$Res> {
  _$SectorStandoutCopyWithImpl(this._self, this._then);

  final SectorStandout _self;
  final $Res Function(SectorStandout) _then;

/// Create a copy of SectorStandout
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? nameEn = null,Object? nameAr = freezed,Object? improving = null,Object? deteriorating = null,Object? readable = null,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,nameEn: null == nameEn ? _self.nameEn : nameEn // ignore: cast_nullable_to_non_nullable
as String,nameAr: freezed == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String?,improving: null == improving ? _self.improving : improving // ignore: cast_nullable_to_non_nullable
as int,deteriorating: null == deteriorating ? _self.deteriorating : deteriorating // ignore: cast_nullable_to_non_nullable
as int,readable: null == readable ? _self.readable : readable // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [SectorStandout].
extension SectorStandoutPatterns on SectorStandout {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SectorStandout value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SectorStandout() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SectorStandout value)  $default,){
final _that = this;
switch (_that) {
case _SectorStandout():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SectorStandout value)?  $default,){
final _that = this;
switch (_that) {
case _SectorStandout() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker, @JsonKey(name: 'name_en')  String nameEn, @JsonKey(name: 'name_ar')  String? nameAr,  int improving,  int deteriorating,  int readable)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SectorStandout() when $default != null:
return $default(_that.ticker,_that.nameEn,_that.nameAr,_that.improving,_that.deteriorating,_that.readable);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker, @JsonKey(name: 'name_en')  String nameEn, @JsonKey(name: 'name_ar')  String? nameAr,  int improving,  int deteriorating,  int readable)  $default,) {final _that = this;
switch (_that) {
case _SectorStandout():
return $default(_that.ticker,_that.nameEn,_that.nameAr,_that.improving,_that.deteriorating,_that.readable);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker, @JsonKey(name: 'name_en')  String nameEn, @JsonKey(name: 'name_ar')  String? nameAr,  int improving,  int deteriorating,  int readable)?  $default,) {final _that = this;
switch (_that) {
case _SectorStandout() when $default != null:
return $default(_that.ticker,_that.nameEn,_that.nameAr,_that.improving,_that.deteriorating,_that.readable);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SectorStandout extends SectorStandout {
  const _SectorStandout({this.ticker = '', @JsonKey(name: 'name_en') this.nameEn = '', @JsonKey(name: 'name_ar') this.nameAr, this.improving = 0, this.deteriorating = 0, this.readable = 0}): super._();
  factory _SectorStandout.fromJson(Map<String, dynamic> json) => _$SectorStandoutFromJson(json);

@override@JsonKey() final  String ticker;
@override@JsonKey(name: 'name_en') final  String nameEn;
@override@JsonKey(name: 'name_ar') final  String? nameAr;
@override@JsonKey() final  int improving;
@override@JsonKey() final  int deteriorating;
@override@JsonKey() final  int readable;

/// Create a copy of SectorStandout
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SectorStandoutCopyWith<_SectorStandout> get copyWith => __$SectorStandoutCopyWithImpl<_SectorStandout>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SectorStandoutToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SectorStandout&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.nameEn, nameEn) || other.nameEn == nameEn)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.improving, improving) || other.improving == improving)&&(identical(other.deteriorating, deteriorating) || other.deteriorating == deteriorating)&&(identical(other.readable, readable) || other.readable == readable));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,nameEn,nameAr,improving,deteriorating,readable);

@override
String toString() {
  return 'SectorStandout(ticker: $ticker, nameEn: $nameEn, nameAr: $nameAr, improving: $improving, deteriorating: $deteriorating, readable: $readable)';
}


}

/// @nodoc
abstract mixin class _$SectorStandoutCopyWith<$Res> implements $SectorStandoutCopyWith<$Res> {
  factory _$SectorStandoutCopyWith(_SectorStandout value, $Res Function(_SectorStandout) _then) = __$SectorStandoutCopyWithImpl;
@override @useResult
$Res call({
 String ticker,@JsonKey(name: 'name_en') String nameEn,@JsonKey(name: 'name_ar') String? nameAr, int improving, int deteriorating, int readable
});




}
/// @nodoc
class __$SectorStandoutCopyWithImpl<$Res>
    implements _$SectorStandoutCopyWith<$Res> {
  __$SectorStandoutCopyWithImpl(this._self, this._then);

  final _SectorStandout _self;
  final $Res Function(_SectorStandout) _then;

/// Create a copy of SectorStandout
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? nameEn = null,Object? nameAr = freezed,Object? improving = null,Object? deteriorating = null,Object? readable = null,}) {
  return _then(_SectorStandout(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,nameEn: null == nameEn ? _self.nameEn : nameEn // ignore: cast_nullable_to_non_nullable
as String,nameAr: freezed == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String?,improving: null == improving ? _self.improving : improving // ignore: cast_nullable_to_non_nullable
as int,deteriorating: null == deteriorating ? _self.deteriorating : deteriorating // ignore: cast_nullable_to_non_nullable
as int,readable: null == readable ? _self.readable : readable // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$SectorMember {

 String get ticker;@JsonKey(name: 'name_en') String get nameEn;@JsonKey(name: 'name_ar') String? get nameAr; int get improving; int get deteriorating; int get readable;/// `above` or `below` the sector median on [peerKey], or null when the
/// sector is too small to carry that median.
 String? get peer; String? get peerKey;
/// Create a copy of SectorMember
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SectorMemberCopyWith<SectorMember> get copyWith => _$SectorMemberCopyWithImpl<SectorMember>(this as SectorMember, _$identity);

  /// Serializes this SectorMember to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SectorMember&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.nameEn, nameEn) || other.nameEn == nameEn)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.improving, improving) || other.improving == improving)&&(identical(other.deteriorating, deteriorating) || other.deteriorating == deteriorating)&&(identical(other.readable, readable) || other.readable == readable)&&(identical(other.peer, peer) || other.peer == peer)&&(identical(other.peerKey, peerKey) || other.peerKey == peerKey));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,nameEn,nameAr,improving,deteriorating,readable,peer,peerKey);

@override
String toString() {
  return 'SectorMember(ticker: $ticker, nameEn: $nameEn, nameAr: $nameAr, improving: $improving, deteriorating: $deteriorating, readable: $readable, peer: $peer, peerKey: $peerKey)';
}


}

/// @nodoc
abstract mixin class $SectorMemberCopyWith<$Res>  {
  factory $SectorMemberCopyWith(SectorMember value, $Res Function(SectorMember) _then) = _$SectorMemberCopyWithImpl;
@useResult
$Res call({
 String ticker,@JsonKey(name: 'name_en') String nameEn,@JsonKey(name: 'name_ar') String? nameAr, int improving, int deteriorating, int readable, String? peer, String? peerKey
});




}
/// @nodoc
class _$SectorMemberCopyWithImpl<$Res>
    implements $SectorMemberCopyWith<$Res> {
  _$SectorMemberCopyWithImpl(this._self, this._then);

  final SectorMember _self;
  final $Res Function(SectorMember) _then;

/// Create a copy of SectorMember
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? nameEn = null,Object? nameAr = freezed,Object? improving = null,Object? deteriorating = null,Object? readable = null,Object? peer = freezed,Object? peerKey = freezed,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,nameEn: null == nameEn ? _self.nameEn : nameEn // ignore: cast_nullable_to_non_nullable
as String,nameAr: freezed == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String?,improving: null == improving ? _self.improving : improving // ignore: cast_nullable_to_non_nullable
as int,deteriorating: null == deteriorating ? _self.deteriorating : deteriorating // ignore: cast_nullable_to_non_nullable
as int,readable: null == readable ? _self.readable : readable // ignore: cast_nullable_to_non_nullable
as int,peer: freezed == peer ? _self.peer : peer // ignore: cast_nullable_to_non_nullable
as String?,peerKey: freezed == peerKey ? _self.peerKey : peerKey // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [SectorMember].
extension SectorMemberPatterns on SectorMember {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SectorMember value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SectorMember() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SectorMember value)  $default,){
final _that = this;
switch (_that) {
case _SectorMember():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SectorMember value)?  $default,){
final _that = this;
switch (_that) {
case _SectorMember() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker, @JsonKey(name: 'name_en')  String nameEn, @JsonKey(name: 'name_ar')  String? nameAr,  int improving,  int deteriorating,  int readable,  String? peer,  String? peerKey)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SectorMember() when $default != null:
return $default(_that.ticker,_that.nameEn,_that.nameAr,_that.improving,_that.deteriorating,_that.readable,_that.peer,_that.peerKey);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker, @JsonKey(name: 'name_en')  String nameEn, @JsonKey(name: 'name_ar')  String? nameAr,  int improving,  int deteriorating,  int readable,  String? peer,  String? peerKey)  $default,) {final _that = this;
switch (_that) {
case _SectorMember():
return $default(_that.ticker,_that.nameEn,_that.nameAr,_that.improving,_that.deteriorating,_that.readable,_that.peer,_that.peerKey);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker, @JsonKey(name: 'name_en')  String nameEn, @JsonKey(name: 'name_ar')  String? nameAr,  int improving,  int deteriorating,  int readable,  String? peer,  String? peerKey)?  $default,) {final _that = this;
switch (_that) {
case _SectorMember() when $default != null:
return $default(_that.ticker,_that.nameEn,_that.nameAr,_that.improving,_that.deteriorating,_that.readable,_that.peer,_that.peerKey);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SectorMember extends SectorMember {
  const _SectorMember({this.ticker = '', @JsonKey(name: 'name_en') this.nameEn = '', @JsonKey(name: 'name_ar') this.nameAr, this.improving = 0, this.deteriorating = 0, this.readable = 0, this.peer, this.peerKey}): super._();
  factory _SectorMember.fromJson(Map<String, dynamic> json) => _$SectorMemberFromJson(json);

@override@JsonKey() final  String ticker;
@override@JsonKey(name: 'name_en') final  String nameEn;
@override@JsonKey(name: 'name_ar') final  String? nameAr;
@override@JsonKey() final  int improving;
@override@JsonKey() final  int deteriorating;
@override@JsonKey() final  int readable;
/// `above` or `below` the sector median on [peerKey], or null when the
/// sector is too small to carry that median.
@override final  String? peer;
@override final  String? peerKey;

/// Create a copy of SectorMember
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SectorMemberCopyWith<_SectorMember> get copyWith => __$SectorMemberCopyWithImpl<_SectorMember>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SectorMemberToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SectorMember&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.nameEn, nameEn) || other.nameEn == nameEn)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.improving, improving) || other.improving == improving)&&(identical(other.deteriorating, deteriorating) || other.deteriorating == deteriorating)&&(identical(other.readable, readable) || other.readable == readable)&&(identical(other.peer, peer) || other.peer == peer)&&(identical(other.peerKey, peerKey) || other.peerKey == peerKey));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,nameEn,nameAr,improving,deteriorating,readable,peer,peerKey);

@override
String toString() {
  return 'SectorMember(ticker: $ticker, nameEn: $nameEn, nameAr: $nameAr, improving: $improving, deteriorating: $deteriorating, readable: $readable, peer: $peer, peerKey: $peerKey)';
}


}

/// @nodoc
abstract mixin class _$SectorMemberCopyWith<$Res> implements $SectorMemberCopyWith<$Res> {
  factory _$SectorMemberCopyWith(_SectorMember value, $Res Function(_SectorMember) _then) = __$SectorMemberCopyWithImpl;
@override @useResult
$Res call({
 String ticker,@JsonKey(name: 'name_en') String nameEn,@JsonKey(name: 'name_ar') String? nameAr, int improving, int deteriorating, int readable, String? peer, String? peerKey
});




}
/// @nodoc
class __$SectorMemberCopyWithImpl<$Res>
    implements _$SectorMemberCopyWith<$Res> {
  __$SectorMemberCopyWithImpl(this._self, this._then);

  final _SectorMember _self;
  final $Res Function(_SectorMember) _then;

/// Create a copy of SectorMember
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? nameEn = null,Object? nameAr = freezed,Object? improving = null,Object? deteriorating = null,Object? readable = null,Object? peer = freezed,Object? peerKey = freezed,}) {
  return _then(_SectorMember(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,nameEn: null == nameEn ? _self.nameEn : nameEn // ignore: cast_nullable_to_non_nullable
as String,nameAr: freezed == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String?,improving: null == improving ? _self.improving : improving // ignore: cast_nullable_to_non_nullable
as int,deteriorating: null == deteriorating ? _self.deteriorating : deteriorating // ignore: cast_nullable_to_non_nullable
as int,readable: null == readable ? _self.readable : readable // ignore: cast_nullable_to_non_nullable
as int,peer: freezed == peer ? _self.peer : peer // ignore: cast_nullable_to_non_nullable
as String?,peerKey: freezed == peerKey ? _self.peerKey : peerKey // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$SectorSummary {

 String get slug; String get sector; int get companies; String get readTeaser; SectorMovement get lead; List<SectorMovement> get movement; double? get medianPe; double? get medianDividendYield;
/// Create a copy of SectorSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SectorSummaryCopyWith<SectorSummary> get copyWith => _$SectorSummaryCopyWithImpl<SectorSummary>(this as SectorSummary, _$identity);

  /// Serializes this SectorSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SectorSummary&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.companies, companies) || other.companies == companies)&&(identical(other.readTeaser, readTeaser) || other.readTeaser == readTeaser)&&(identical(other.lead, lead) || other.lead == lead)&&const DeepCollectionEquality().equals(other.movement, movement)&&(identical(other.medianPe, medianPe) || other.medianPe == medianPe)&&(identical(other.medianDividendYield, medianDividendYield) || other.medianDividendYield == medianDividendYield));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,slug,sector,companies,readTeaser,lead,const DeepCollectionEquality().hash(movement),medianPe,medianDividendYield);

@override
String toString() {
  return 'SectorSummary(slug: $slug, sector: $sector, companies: $companies, readTeaser: $readTeaser, lead: $lead, movement: $movement, medianPe: $medianPe, medianDividendYield: $medianDividendYield)';
}


}

/// @nodoc
abstract mixin class $SectorSummaryCopyWith<$Res>  {
  factory $SectorSummaryCopyWith(SectorSummary value, $Res Function(SectorSummary) _then) = _$SectorSummaryCopyWithImpl;
@useResult
$Res call({
 String slug, String sector, int companies, String readTeaser, SectorMovement lead, List<SectorMovement> movement, double? medianPe, double? medianDividendYield
});


$SectorMovementCopyWith<$Res> get lead;

}
/// @nodoc
class _$SectorSummaryCopyWithImpl<$Res>
    implements $SectorSummaryCopyWith<$Res> {
  _$SectorSummaryCopyWithImpl(this._self, this._then);

  final SectorSummary _self;
  final $Res Function(SectorSummary) _then;

/// Create a copy of SectorSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? slug = null,Object? sector = null,Object? companies = null,Object? readTeaser = null,Object? lead = null,Object? movement = null,Object? medianPe = freezed,Object? medianDividendYield = freezed,}) {
  return _then(_self.copyWith(
slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,sector: null == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String,companies: null == companies ? _self.companies : companies // ignore: cast_nullable_to_non_nullable
as int,readTeaser: null == readTeaser ? _self.readTeaser : readTeaser // ignore: cast_nullable_to_non_nullable
as String,lead: null == lead ? _self.lead : lead // ignore: cast_nullable_to_non_nullable
as SectorMovement,movement: null == movement ? _self.movement : movement // ignore: cast_nullable_to_non_nullable
as List<SectorMovement>,medianPe: freezed == medianPe ? _self.medianPe : medianPe // ignore: cast_nullable_to_non_nullable
as double?,medianDividendYield: freezed == medianDividendYield ? _self.medianDividendYield : medianDividendYield // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}
/// Create a copy of SectorSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SectorMovementCopyWith<$Res> get lead {
  
  return $SectorMovementCopyWith<$Res>(_self.lead, (value) {
    return _then(_self.copyWith(lead: value));
  });
}
}


/// Adds pattern-matching-related methods to [SectorSummary].
extension SectorSummaryPatterns on SectorSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SectorSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SectorSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SectorSummary value)  $default,){
final _that = this;
switch (_that) {
case _SectorSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SectorSummary value)?  $default,){
final _that = this;
switch (_that) {
case _SectorSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String slug,  String sector,  int companies,  String readTeaser,  SectorMovement lead,  List<SectorMovement> movement,  double? medianPe,  double? medianDividendYield)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SectorSummary() when $default != null:
return $default(_that.slug,_that.sector,_that.companies,_that.readTeaser,_that.lead,_that.movement,_that.medianPe,_that.medianDividendYield);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String slug,  String sector,  int companies,  String readTeaser,  SectorMovement lead,  List<SectorMovement> movement,  double? medianPe,  double? medianDividendYield)  $default,) {final _that = this;
switch (_that) {
case _SectorSummary():
return $default(_that.slug,_that.sector,_that.companies,_that.readTeaser,_that.lead,_that.movement,_that.medianPe,_that.medianDividendYield);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String slug,  String sector,  int companies,  String readTeaser,  SectorMovement lead,  List<SectorMovement> movement,  double? medianPe,  double? medianDividendYield)?  $default,) {final _that = this;
switch (_that) {
case _SectorSummary() when $default != null:
return $default(_that.slug,_that.sector,_that.companies,_that.readTeaser,_that.lead,_that.movement,_that.medianPe,_that.medianDividendYield);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SectorSummary implements SectorSummary {
  const _SectorSummary({this.slug = '', this.sector = '', this.companies = 0, this.readTeaser = '', this.lead = const SectorMovement(), final  List<SectorMovement> movement = const <SectorMovement>[], this.medianPe, this.medianDividendYield}): _movement = movement;
  factory _SectorSummary.fromJson(Map<String, dynamic> json) => _$SectorSummaryFromJson(json);

@override@JsonKey() final  String slug;
@override@JsonKey() final  String sector;
@override@JsonKey() final  int companies;
@override@JsonKey() final  String readTeaser;
@override@JsonKey() final  SectorMovement lead;
 final  List<SectorMovement> _movement;
@override@JsonKey() List<SectorMovement> get movement {
  if (_movement is EqualUnmodifiableListView) return _movement;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_movement);
}

@override final  double? medianPe;
@override final  double? medianDividendYield;

/// Create a copy of SectorSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SectorSummaryCopyWith<_SectorSummary> get copyWith => __$SectorSummaryCopyWithImpl<_SectorSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SectorSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SectorSummary&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.companies, companies) || other.companies == companies)&&(identical(other.readTeaser, readTeaser) || other.readTeaser == readTeaser)&&(identical(other.lead, lead) || other.lead == lead)&&const DeepCollectionEquality().equals(other._movement, _movement)&&(identical(other.medianPe, medianPe) || other.medianPe == medianPe)&&(identical(other.medianDividendYield, medianDividendYield) || other.medianDividendYield == medianDividendYield));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,slug,sector,companies,readTeaser,lead,const DeepCollectionEquality().hash(_movement),medianPe,medianDividendYield);

@override
String toString() {
  return 'SectorSummary(slug: $slug, sector: $sector, companies: $companies, readTeaser: $readTeaser, lead: $lead, movement: $movement, medianPe: $medianPe, medianDividendYield: $medianDividendYield)';
}


}

/// @nodoc
abstract mixin class _$SectorSummaryCopyWith<$Res> implements $SectorSummaryCopyWith<$Res> {
  factory _$SectorSummaryCopyWith(_SectorSummary value, $Res Function(_SectorSummary) _then) = __$SectorSummaryCopyWithImpl;
@override @useResult
$Res call({
 String slug, String sector, int companies, String readTeaser, SectorMovement lead, List<SectorMovement> movement, double? medianPe, double? medianDividendYield
});


@override $SectorMovementCopyWith<$Res> get lead;

}
/// @nodoc
class __$SectorSummaryCopyWithImpl<$Res>
    implements _$SectorSummaryCopyWith<$Res> {
  __$SectorSummaryCopyWithImpl(this._self, this._then);

  final _SectorSummary _self;
  final $Res Function(_SectorSummary) _then;

/// Create a copy of SectorSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? slug = null,Object? sector = null,Object? companies = null,Object? readTeaser = null,Object? lead = null,Object? movement = null,Object? medianPe = freezed,Object? medianDividendYield = freezed,}) {
  return _then(_SectorSummary(
slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,sector: null == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String,companies: null == companies ? _self.companies : companies // ignore: cast_nullable_to_non_nullable
as int,readTeaser: null == readTeaser ? _self.readTeaser : readTeaser // ignore: cast_nullable_to_non_nullable
as String,lead: null == lead ? _self.lead : lead // ignore: cast_nullable_to_non_nullable
as SectorMovement,movement: null == movement ? _self._movement : movement // ignore: cast_nullable_to_non_nullable
as List<SectorMovement>,medianPe: freezed == medianPe ? _self.medianPe : medianPe // ignore: cast_nullable_to_non_nullable
as double?,medianDividendYield: freezed == medianDividendYield ? _self.medianDividendYield : medianDividendYield // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

/// Create a copy of SectorSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SectorMovementCopyWith<$Res> get lead {
  
  return $SectorMovementCopyWith<$Res>(_self.lead, (value) {
    return _then(_self.copyWith(lead: value));
  });
}
}


/// @nodoc
mixin _$SectorHeldBack {

 String get sector; int get companies;
/// Create a copy of SectorHeldBack
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SectorHeldBackCopyWith<SectorHeldBack> get copyWith => _$SectorHeldBackCopyWithImpl<SectorHeldBack>(this as SectorHeldBack, _$identity);

  /// Serializes this SectorHeldBack to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SectorHeldBack&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.companies, companies) || other.companies == companies));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,sector,companies);

@override
String toString() {
  return 'SectorHeldBack(sector: $sector, companies: $companies)';
}


}

/// @nodoc
abstract mixin class $SectorHeldBackCopyWith<$Res>  {
  factory $SectorHeldBackCopyWith(SectorHeldBack value, $Res Function(SectorHeldBack) _then) = _$SectorHeldBackCopyWithImpl;
@useResult
$Res call({
 String sector, int companies
});




}
/// @nodoc
class _$SectorHeldBackCopyWithImpl<$Res>
    implements $SectorHeldBackCopyWith<$Res> {
  _$SectorHeldBackCopyWithImpl(this._self, this._then);

  final SectorHeldBack _self;
  final $Res Function(SectorHeldBack) _then;

/// Create a copy of SectorHeldBack
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? sector = null,Object? companies = null,}) {
  return _then(_self.copyWith(
sector: null == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String,companies: null == companies ? _self.companies : companies // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [SectorHeldBack].
extension SectorHeldBackPatterns on SectorHeldBack {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SectorHeldBack value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SectorHeldBack() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SectorHeldBack value)  $default,){
final _that = this;
switch (_that) {
case _SectorHeldBack():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SectorHeldBack value)?  $default,){
final _that = this;
switch (_that) {
case _SectorHeldBack() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String sector,  int companies)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SectorHeldBack() when $default != null:
return $default(_that.sector,_that.companies);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String sector,  int companies)  $default,) {final _that = this;
switch (_that) {
case _SectorHeldBack():
return $default(_that.sector,_that.companies);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String sector,  int companies)?  $default,) {final _that = this;
switch (_that) {
case _SectorHeldBack() when $default != null:
return $default(_that.sector,_that.companies);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SectorHeldBack implements SectorHeldBack {
  const _SectorHeldBack({this.sector = '', this.companies = 0});
  factory _SectorHeldBack.fromJson(Map<String, dynamic> json) => _$SectorHeldBackFromJson(json);

@override@JsonKey() final  String sector;
@override@JsonKey() final  int companies;

/// Create a copy of SectorHeldBack
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SectorHeldBackCopyWith<_SectorHeldBack> get copyWith => __$SectorHeldBackCopyWithImpl<_SectorHeldBack>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SectorHeldBackToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SectorHeldBack&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.companies, companies) || other.companies == companies));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,sector,companies);

@override
String toString() {
  return 'SectorHeldBack(sector: $sector, companies: $companies)';
}


}

/// @nodoc
abstract mixin class _$SectorHeldBackCopyWith<$Res> implements $SectorHeldBackCopyWith<$Res> {
  factory _$SectorHeldBackCopyWith(_SectorHeldBack value, $Res Function(_SectorHeldBack) _then) = __$SectorHeldBackCopyWithImpl;
@override @useResult
$Res call({
 String sector, int companies
});




}
/// @nodoc
class __$SectorHeldBackCopyWithImpl<$Res>
    implements _$SectorHeldBackCopyWith<$Res> {
  __$SectorHeldBackCopyWithImpl(this._self, this._then);

  final _SectorHeldBack _self;
  final $Res Function(_SectorHeldBack) _then;

/// Create a copy of SectorHeldBack
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? sector = null,Object? companies = null,}) {
  return _then(_SectorHeldBack(
sector: null == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String,companies: null == companies ? _self.companies : companies // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$SectorIndex {

 String get generated; String get source; int get sectorCount; String get featured; List<SectorSummary> get sectors; List<SectorHeldBack> get heldBack;
/// Create a copy of SectorIndex
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SectorIndexCopyWith<SectorIndex> get copyWith => _$SectorIndexCopyWithImpl<SectorIndex>(this as SectorIndex, _$identity);

  /// Serializes this SectorIndex to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SectorIndex&&(identical(other.generated, generated) || other.generated == generated)&&(identical(other.source, source) || other.source == source)&&(identical(other.sectorCount, sectorCount) || other.sectorCount == sectorCount)&&(identical(other.featured, featured) || other.featured == featured)&&const DeepCollectionEquality().equals(other.sectors, sectors)&&const DeepCollectionEquality().equals(other.heldBack, heldBack));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,generated,source,sectorCount,featured,const DeepCollectionEquality().hash(sectors),const DeepCollectionEquality().hash(heldBack));

@override
String toString() {
  return 'SectorIndex(generated: $generated, source: $source, sectorCount: $sectorCount, featured: $featured, sectors: $sectors, heldBack: $heldBack)';
}


}

/// @nodoc
abstract mixin class $SectorIndexCopyWith<$Res>  {
  factory $SectorIndexCopyWith(SectorIndex value, $Res Function(SectorIndex) _then) = _$SectorIndexCopyWithImpl;
@useResult
$Res call({
 String generated, String source, int sectorCount, String featured, List<SectorSummary> sectors, List<SectorHeldBack> heldBack
});




}
/// @nodoc
class _$SectorIndexCopyWithImpl<$Res>
    implements $SectorIndexCopyWith<$Res> {
  _$SectorIndexCopyWithImpl(this._self, this._then);

  final SectorIndex _self;
  final $Res Function(SectorIndex) _then;

/// Create a copy of SectorIndex
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? generated = null,Object? source = null,Object? sectorCount = null,Object? featured = null,Object? sectors = null,Object? heldBack = null,}) {
  return _then(_self.copyWith(
generated: null == generated ? _self.generated : generated // ignore: cast_nullable_to_non_nullable
as String,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String,sectorCount: null == sectorCount ? _self.sectorCount : sectorCount // ignore: cast_nullable_to_non_nullable
as int,featured: null == featured ? _self.featured : featured // ignore: cast_nullable_to_non_nullable
as String,sectors: null == sectors ? _self.sectors : sectors // ignore: cast_nullable_to_non_nullable
as List<SectorSummary>,heldBack: null == heldBack ? _self.heldBack : heldBack // ignore: cast_nullable_to_non_nullable
as List<SectorHeldBack>,
  ));
}

}


/// Adds pattern-matching-related methods to [SectorIndex].
extension SectorIndexPatterns on SectorIndex {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SectorIndex value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SectorIndex() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SectorIndex value)  $default,){
final _that = this;
switch (_that) {
case _SectorIndex():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SectorIndex value)?  $default,){
final _that = this;
switch (_that) {
case _SectorIndex() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String generated,  String source,  int sectorCount,  String featured,  List<SectorSummary> sectors,  List<SectorHeldBack> heldBack)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SectorIndex() when $default != null:
return $default(_that.generated,_that.source,_that.sectorCount,_that.featured,_that.sectors,_that.heldBack);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String generated,  String source,  int sectorCount,  String featured,  List<SectorSummary> sectors,  List<SectorHeldBack> heldBack)  $default,) {final _that = this;
switch (_that) {
case _SectorIndex():
return $default(_that.generated,_that.source,_that.sectorCount,_that.featured,_that.sectors,_that.heldBack);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String generated,  String source,  int sectorCount,  String featured,  List<SectorSummary> sectors,  List<SectorHeldBack> heldBack)?  $default,) {final _that = this;
switch (_that) {
case _SectorIndex() when $default != null:
return $default(_that.generated,_that.source,_that.sectorCount,_that.featured,_that.sectors,_that.heldBack);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SectorIndex extends SectorIndex {
  const _SectorIndex({this.generated = '', this.source = '', this.sectorCount = 0, this.featured = '', final  List<SectorSummary> sectors = const <SectorSummary>[], final  List<SectorHeldBack> heldBack = const <SectorHeldBack>[]}): _sectors = sectors,_heldBack = heldBack,super._();
  factory _SectorIndex.fromJson(Map<String, dynamic> json) => _$SectorIndexFromJson(json);

@override@JsonKey() final  String generated;
@override@JsonKey() final  String source;
@override@JsonKey() final  int sectorCount;
@override@JsonKey() final  String featured;
 final  List<SectorSummary> _sectors;
@override@JsonKey() List<SectorSummary> get sectors {
  if (_sectors is EqualUnmodifiableListView) return _sectors;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_sectors);
}

 final  List<SectorHeldBack> _heldBack;
@override@JsonKey() List<SectorHeldBack> get heldBack {
  if (_heldBack is EqualUnmodifiableListView) return _heldBack;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_heldBack);
}


/// Create a copy of SectorIndex
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SectorIndexCopyWith<_SectorIndex> get copyWith => __$SectorIndexCopyWithImpl<_SectorIndex>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SectorIndexToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SectorIndex&&(identical(other.generated, generated) || other.generated == generated)&&(identical(other.source, source) || other.source == source)&&(identical(other.sectorCount, sectorCount) || other.sectorCount == sectorCount)&&(identical(other.featured, featured) || other.featured == featured)&&const DeepCollectionEquality().equals(other._sectors, _sectors)&&const DeepCollectionEquality().equals(other._heldBack, _heldBack));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,generated,source,sectorCount,featured,const DeepCollectionEquality().hash(_sectors),const DeepCollectionEquality().hash(_heldBack));

@override
String toString() {
  return 'SectorIndex(generated: $generated, source: $source, sectorCount: $sectorCount, featured: $featured, sectors: $sectors, heldBack: $heldBack)';
}


}

/// @nodoc
abstract mixin class _$SectorIndexCopyWith<$Res> implements $SectorIndexCopyWith<$Res> {
  factory _$SectorIndexCopyWith(_SectorIndex value, $Res Function(_SectorIndex) _then) = __$SectorIndexCopyWithImpl;
@override @useResult
$Res call({
 String generated, String source, int sectorCount, String featured, List<SectorSummary> sectors, List<SectorHeldBack> heldBack
});




}
/// @nodoc
class __$SectorIndexCopyWithImpl<$Res>
    implements _$SectorIndexCopyWith<$Res> {
  __$SectorIndexCopyWithImpl(this._self, this._then);

  final _SectorIndex _self;
  final $Res Function(_SectorIndex) _then;

/// Create a copy of SectorIndex
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? generated = null,Object? source = null,Object? sectorCount = null,Object? featured = null,Object? sectors = null,Object? heldBack = null,}) {
  return _then(_SectorIndex(
generated: null == generated ? _self.generated : generated // ignore: cast_nullable_to_non_nullable
as String,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String,sectorCount: null == sectorCount ? _self.sectorCount : sectorCount // ignore: cast_nullable_to_non_nullable
as int,featured: null == featured ? _self.featured : featured // ignore: cast_nullable_to_non_nullable
as String,sectors: null == sectors ? _self._sectors : sectors // ignore: cast_nullable_to_non_nullable
as List<SectorSummary>,heldBack: null == heldBack ? _self._heldBack : heldBack // ignore: cast_nullable_to_non_nullable
as List<SectorHeldBack>,
  ));
}


}


/// @nodoc
mixin _$SectorReport {

 String get slug; String get sector; String get generated; int get companies;/// A build-time vetted paragraph reading the sector's movement as a whole.
/// Null when no read has been generated yet — the screen falls back to a
/// computed line rather than a blank.
 String? get read;@JsonKey(name: 'read_ar') String? get readAr; List<SectorMovement> get movement; List<SectorMedian> get medians; List<SectorStandout> get standouts; List<SectorMember> get members;
/// Create a copy of SectorReport
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SectorReportCopyWith<SectorReport> get copyWith => _$SectorReportCopyWithImpl<SectorReport>(this as SectorReport, _$identity);

  /// Serializes this SectorReport to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SectorReport&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.generated, generated) || other.generated == generated)&&(identical(other.companies, companies) || other.companies == companies)&&(identical(other.read, read) || other.read == read)&&(identical(other.readAr, readAr) || other.readAr == readAr)&&const DeepCollectionEquality().equals(other.movement, movement)&&const DeepCollectionEquality().equals(other.medians, medians)&&const DeepCollectionEquality().equals(other.standouts, standouts)&&const DeepCollectionEquality().equals(other.members, members));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,slug,sector,generated,companies,read,readAr,const DeepCollectionEquality().hash(movement),const DeepCollectionEquality().hash(medians),const DeepCollectionEquality().hash(standouts),const DeepCollectionEquality().hash(members));

@override
String toString() {
  return 'SectorReport(slug: $slug, sector: $sector, generated: $generated, companies: $companies, read: $read, readAr: $readAr, movement: $movement, medians: $medians, standouts: $standouts, members: $members)';
}


}

/// @nodoc
abstract mixin class $SectorReportCopyWith<$Res>  {
  factory $SectorReportCopyWith(SectorReport value, $Res Function(SectorReport) _then) = _$SectorReportCopyWithImpl;
@useResult
$Res call({
 String slug, String sector, String generated, int companies, String? read,@JsonKey(name: 'read_ar') String? readAr, List<SectorMovement> movement, List<SectorMedian> medians, List<SectorStandout> standouts, List<SectorMember> members
});




}
/// @nodoc
class _$SectorReportCopyWithImpl<$Res>
    implements $SectorReportCopyWith<$Res> {
  _$SectorReportCopyWithImpl(this._self, this._then);

  final SectorReport _self;
  final $Res Function(SectorReport) _then;

/// Create a copy of SectorReport
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? slug = null,Object? sector = null,Object? generated = null,Object? companies = null,Object? read = freezed,Object? readAr = freezed,Object? movement = null,Object? medians = null,Object? standouts = null,Object? members = null,}) {
  return _then(_self.copyWith(
slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,sector: null == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String,generated: null == generated ? _self.generated : generated // ignore: cast_nullable_to_non_nullable
as String,companies: null == companies ? _self.companies : companies // ignore: cast_nullable_to_non_nullable
as int,read: freezed == read ? _self.read : read // ignore: cast_nullable_to_non_nullable
as String?,readAr: freezed == readAr ? _self.readAr : readAr // ignore: cast_nullable_to_non_nullable
as String?,movement: null == movement ? _self.movement : movement // ignore: cast_nullable_to_non_nullable
as List<SectorMovement>,medians: null == medians ? _self.medians : medians // ignore: cast_nullable_to_non_nullable
as List<SectorMedian>,standouts: null == standouts ? _self.standouts : standouts // ignore: cast_nullable_to_non_nullable
as List<SectorStandout>,members: null == members ? _self.members : members // ignore: cast_nullable_to_non_nullable
as List<SectorMember>,
  ));
}

}


/// Adds pattern-matching-related methods to [SectorReport].
extension SectorReportPatterns on SectorReport {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SectorReport value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SectorReport() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SectorReport value)  $default,){
final _that = this;
switch (_that) {
case _SectorReport():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SectorReport value)?  $default,){
final _that = this;
switch (_that) {
case _SectorReport() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String slug,  String sector,  String generated,  int companies,  String? read, @JsonKey(name: 'read_ar')  String? readAr,  List<SectorMovement> movement,  List<SectorMedian> medians,  List<SectorStandout> standouts,  List<SectorMember> members)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SectorReport() when $default != null:
return $default(_that.slug,_that.sector,_that.generated,_that.companies,_that.read,_that.readAr,_that.movement,_that.medians,_that.standouts,_that.members);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String slug,  String sector,  String generated,  int companies,  String? read, @JsonKey(name: 'read_ar')  String? readAr,  List<SectorMovement> movement,  List<SectorMedian> medians,  List<SectorStandout> standouts,  List<SectorMember> members)  $default,) {final _that = this;
switch (_that) {
case _SectorReport():
return $default(_that.slug,_that.sector,_that.generated,_that.companies,_that.read,_that.readAr,_that.movement,_that.medians,_that.standouts,_that.members);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String slug,  String sector,  String generated,  int companies,  String? read, @JsonKey(name: 'read_ar')  String? readAr,  List<SectorMovement> movement,  List<SectorMedian> medians,  List<SectorStandout> standouts,  List<SectorMember> members)?  $default,) {final _that = this;
switch (_that) {
case _SectorReport() when $default != null:
return $default(_that.slug,_that.sector,_that.generated,_that.companies,_that.read,_that.readAr,_that.movement,_that.medians,_that.standouts,_that.members);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SectorReport extends SectorReport {
  const _SectorReport({this.slug = '', this.sector = '', this.generated = '', this.companies = 0, this.read, @JsonKey(name: 'read_ar') this.readAr, final  List<SectorMovement> movement = const <SectorMovement>[], final  List<SectorMedian> medians = const <SectorMedian>[], final  List<SectorStandout> standouts = const <SectorStandout>[], final  List<SectorMember> members = const <SectorMember>[]}): _movement = movement,_medians = medians,_standouts = standouts,_members = members,super._();
  factory _SectorReport.fromJson(Map<String, dynamic> json) => _$SectorReportFromJson(json);

@override@JsonKey() final  String slug;
@override@JsonKey() final  String sector;
@override@JsonKey() final  String generated;
@override@JsonKey() final  int companies;
/// A build-time vetted paragraph reading the sector's movement as a whole.
/// Null when no read has been generated yet — the screen falls back to a
/// computed line rather than a blank.
@override final  String? read;
@override@JsonKey(name: 'read_ar') final  String? readAr;
 final  List<SectorMovement> _movement;
@override@JsonKey() List<SectorMovement> get movement {
  if (_movement is EqualUnmodifiableListView) return _movement;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_movement);
}

 final  List<SectorMedian> _medians;
@override@JsonKey() List<SectorMedian> get medians {
  if (_medians is EqualUnmodifiableListView) return _medians;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_medians);
}

 final  List<SectorStandout> _standouts;
@override@JsonKey() List<SectorStandout> get standouts {
  if (_standouts is EqualUnmodifiableListView) return _standouts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_standouts);
}

 final  List<SectorMember> _members;
@override@JsonKey() List<SectorMember> get members {
  if (_members is EqualUnmodifiableListView) return _members;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_members);
}


/// Create a copy of SectorReport
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SectorReportCopyWith<_SectorReport> get copyWith => __$SectorReportCopyWithImpl<_SectorReport>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SectorReportToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SectorReport&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.generated, generated) || other.generated == generated)&&(identical(other.companies, companies) || other.companies == companies)&&(identical(other.read, read) || other.read == read)&&(identical(other.readAr, readAr) || other.readAr == readAr)&&const DeepCollectionEquality().equals(other._movement, _movement)&&const DeepCollectionEquality().equals(other._medians, _medians)&&const DeepCollectionEquality().equals(other._standouts, _standouts)&&const DeepCollectionEquality().equals(other._members, _members));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,slug,sector,generated,companies,read,readAr,const DeepCollectionEquality().hash(_movement),const DeepCollectionEquality().hash(_medians),const DeepCollectionEquality().hash(_standouts),const DeepCollectionEquality().hash(_members));

@override
String toString() {
  return 'SectorReport(slug: $slug, sector: $sector, generated: $generated, companies: $companies, read: $read, readAr: $readAr, movement: $movement, medians: $medians, standouts: $standouts, members: $members)';
}


}

/// @nodoc
abstract mixin class _$SectorReportCopyWith<$Res> implements $SectorReportCopyWith<$Res> {
  factory _$SectorReportCopyWith(_SectorReport value, $Res Function(_SectorReport) _then) = __$SectorReportCopyWithImpl;
@override @useResult
$Res call({
 String slug, String sector, String generated, int companies, String? read,@JsonKey(name: 'read_ar') String? readAr, List<SectorMovement> movement, List<SectorMedian> medians, List<SectorStandout> standouts, List<SectorMember> members
});




}
/// @nodoc
class __$SectorReportCopyWithImpl<$Res>
    implements _$SectorReportCopyWith<$Res> {
  __$SectorReportCopyWithImpl(this._self, this._then);

  final _SectorReport _self;
  final $Res Function(_SectorReport) _then;

/// Create a copy of SectorReport
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? slug = null,Object? sector = null,Object? generated = null,Object? companies = null,Object? read = freezed,Object? readAr = freezed,Object? movement = null,Object? medians = null,Object? standouts = null,Object? members = null,}) {
  return _then(_SectorReport(
slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,sector: null == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String,generated: null == generated ? _self.generated : generated // ignore: cast_nullable_to_non_nullable
as String,companies: null == companies ? _self.companies : companies // ignore: cast_nullable_to_non_nullable
as int,read: freezed == read ? _self.read : read // ignore: cast_nullable_to_non_nullable
as String?,readAr: freezed == readAr ? _self.readAr : readAr // ignore: cast_nullable_to_non_nullable
as String?,movement: null == movement ? _self._movement : movement // ignore: cast_nullable_to_non_nullable
as List<SectorMovement>,medians: null == medians ? _self._medians : medians // ignore: cast_nullable_to_non_nullable
as List<SectorMedian>,standouts: null == standouts ? _self._standouts : standouts // ignore: cast_nullable_to_non_nullable
as List<SectorStandout>,members: null == members ? _self._members : members // ignore: cast_nullable_to_non_nullable
as List<SectorMember>,
  ));
}


}

// dart format on
