// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'manifest.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Manifest {

@JsonKey(name: 'schema_version') int get schemaVersion;@JsonKey(name: 'data_version') String get dataVersion;@JsonKey(name: 'generated_at') DateTime? get generatedAt;@JsonKey(name: 'market_date') String get marketDate; ManifestVersions get versions;
/// Create a copy of Manifest
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ManifestCopyWith<Manifest> get copyWith => _$ManifestCopyWithImpl<Manifest>(this as Manifest, _$identity);

  /// Serializes this Manifest to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Manifest&&(identical(other.schemaVersion, schemaVersion) || other.schemaVersion == schemaVersion)&&(identical(other.dataVersion, dataVersion) || other.dataVersion == dataVersion)&&(identical(other.generatedAt, generatedAt) || other.generatedAt == generatedAt)&&(identical(other.marketDate, marketDate) || other.marketDate == marketDate)&&(identical(other.versions, versions) || other.versions == versions));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,schemaVersion,dataVersion,generatedAt,marketDate,versions);

@override
String toString() {
  return 'Manifest(schemaVersion: $schemaVersion, dataVersion: $dataVersion, generatedAt: $generatedAt, marketDate: $marketDate, versions: $versions)';
}


}

/// @nodoc
abstract mixin class $ManifestCopyWith<$Res>  {
  factory $ManifestCopyWith(Manifest value, $Res Function(Manifest) _then) = _$ManifestCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'schema_version') int schemaVersion,@JsonKey(name: 'data_version') String dataVersion,@JsonKey(name: 'generated_at') DateTime? generatedAt,@JsonKey(name: 'market_date') String marketDate, ManifestVersions versions
});




}
/// @nodoc
class _$ManifestCopyWithImpl<$Res>
    implements $ManifestCopyWith<$Res> {
  _$ManifestCopyWithImpl(this._self, this._then);

  final Manifest _self;
  final $Res Function(Manifest) _then;

/// Create a copy of Manifest
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? schemaVersion = null,Object? dataVersion = null,Object? generatedAt = freezed,Object? marketDate = null,Object? versions = null,}) {
  return _then(_self.copyWith(
schemaVersion: null == schemaVersion ? _self.schemaVersion : schemaVersion // ignore: cast_nullable_to_non_nullable
as int,dataVersion: null == dataVersion ? _self.dataVersion : dataVersion // ignore: cast_nullable_to_non_nullable
as String,generatedAt: freezed == generatedAt ? _self.generatedAt : generatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,marketDate: null == marketDate ? _self.marketDate : marketDate // ignore: cast_nullable_to_non_nullable
as String,versions: null == versions ? _self.versions : versions // ignore: cast_nullable_to_non_nullable
as ManifestVersions,
  ));
}

}


/// Adds pattern-matching-related methods to [Manifest].
extension ManifestPatterns on Manifest {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Manifest value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Manifest() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Manifest value)  $default,){
final _that = this;
switch (_that) {
case _Manifest():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Manifest value)?  $default,){
final _that = this;
switch (_that) {
case _Manifest() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'schema_version')  int schemaVersion, @JsonKey(name: 'data_version')  String dataVersion, @JsonKey(name: 'generated_at')  DateTime? generatedAt, @JsonKey(name: 'market_date')  String marketDate,  ManifestVersions versions)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Manifest() when $default != null:
return $default(_that.schemaVersion,_that.dataVersion,_that.generatedAt,_that.marketDate,_that.versions);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'schema_version')  int schemaVersion, @JsonKey(name: 'data_version')  String dataVersion, @JsonKey(name: 'generated_at')  DateTime? generatedAt, @JsonKey(name: 'market_date')  String marketDate,  ManifestVersions versions)  $default,) {final _that = this;
switch (_that) {
case _Manifest():
return $default(_that.schemaVersion,_that.dataVersion,_that.generatedAt,_that.marketDate,_that.versions);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'schema_version')  int schemaVersion, @JsonKey(name: 'data_version')  String dataVersion, @JsonKey(name: 'generated_at')  DateTime? generatedAt, @JsonKey(name: 'market_date')  String marketDate,  ManifestVersions versions)?  $default,) {final _that = this;
switch (_that) {
case _Manifest() when $default != null:
return $default(_that.schemaVersion,_that.dataVersion,_that.generatedAt,_that.marketDate,_that.versions);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Manifest extends Manifest {
  const _Manifest({@JsonKey(name: 'schema_version') this.schemaVersion = 1, @JsonKey(name: 'data_version') this.dataVersion = '', @JsonKey(name: 'generated_at') this.generatedAt, @JsonKey(name: 'market_date') this.marketDate = '', required this.versions}): super._();
  factory _Manifest.fromJson(Map<String, dynamic> json) => _$ManifestFromJson(json);

@override@JsonKey(name: 'schema_version') final  int schemaVersion;
@override@JsonKey(name: 'data_version') final  String dataVersion;
@override@JsonKey(name: 'generated_at') final  DateTime? generatedAt;
@override@JsonKey(name: 'market_date') final  String marketDate;
@override final  ManifestVersions versions;

/// Create a copy of Manifest
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ManifestCopyWith<_Manifest> get copyWith => __$ManifestCopyWithImpl<_Manifest>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ManifestToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Manifest&&(identical(other.schemaVersion, schemaVersion) || other.schemaVersion == schemaVersion)&&(identical(other.dataVersion, dataVersion) || other.dataVersion == dataVersion)&&(identical(other.generatedAt, generatedAt) || other.generatedAt == generatedAt)&&(identical(other.marketDate, marketDate) || other.marketDate == marketDate)&&(identical(other.versions, versions) || other.versions == versions));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,schemaVersion,dataVersion,generatedAt,marketDate,versions);

@override
String toString() {
  return 'Manifest(schemaVersion: $schemaVersion, dataVersion: $dataVersion, generatedAt: $generatedAt, marketDate: $marketDate, versions: $versions)';
}


}

/// @nodoc
abstract mixin class _$ManifestCopyWith<$Res> implements $ManifestCopyWith<$Res> {
  factory _$ManifestCopyWith(_Manifest value, $Res Function(_Manifest) _then) = __$ManifestCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'schema_version') int schemaVersion,@JsonKey(name: 'data_version') String dataVersion,@JsonKey(name: 'generated_at') DateTime? generatedAt,@JsonKey(name: 'market_date') String marketDate, ManifestVersions versions
});




}
/// @nodoc
class __$ManifestCopyWithImpl<$Res>
    implements _$ManifestCopyWith<$Res> {
  __$ManifestCopyWithImpl(this._self, this._then);

  final _Manifest _self;
  final $Res Function(_Manifest) _then;

/// Create a copy of Manifest
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? schemaVersion = null,Object? dataVersion = null,Object? generatedAt = freezed,Object? marketDate = null,Object? versions = null,}) {
  return _then(_Manifest(
schemaVersion: null == schemaVersion ? _self.schemaVersion : schemaVersion // ignore: cast_nullable_to_non_nullable
as int,dataVersion: null == dataVersion ? _self.dataVersion : dataVersion // ignore: cast_nullable_to_non_nullable
as String,generatedAt: freezed == generatedAt ? _self.generatedAt : generatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,marketDate: null == marketDate ? _self.marketDate : marketDate // ignore: cast_nullable_to_non_nullable
as String,versions: null == versions ? _self.versions : versions // ignore: cast_nullable_to_non_nullable
as ManifestVersions,
  ));
}


}

// dart format on
