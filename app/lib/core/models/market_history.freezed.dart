// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'market_history.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MarketHistory {

@JsonKey(name: 'updated_at') String? get updatedAt; List<MarketSession> get sessions;
/// Create a copy of MarketHistory
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MarketHistoryCopyWith<MarketHistory> get copyWith => _$MarketHistoryCopyWithImpl<MarketHistory>(this as MarketHistory, _$identity);

  /// Serializes this MarketHistory to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MarketHistory&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&const DeepCollectionEquality().equals(other.sessions, sessions));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,updatedAt,const DeepCollectionEquality().hash(sessions));

@override
String toString() {
  return 'MarketHistory(updatedAt: $updatedAt, sessions: $sessions)';
}


}

/// @nodoc
abstract mixin class $MarketHistoryCopyWith<$Res>  {
  factory $MarketHistoryCopyWith(MarketHistory value, $Res Function(MarketHistory) _then) = _$MarketHistoryCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'updated_at') String? updatedAt, List<MarketSession> sessions
});




}
/// @nodoc
class _$MarketHistoryCopyWithImpl<$Res>
    implements $MarketHistoryCopyWith<$Res> {
  _$MarketHistoryCopyWithImpl(this._self, this._then);

  final MarketHistory _self;
  final $Res Function(MarketHistory) _then;

/// Create a copy of MarketHistory
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? updatedAt = freezed,Object? sessions = null,}) {
  return _then(_self.copyWith(
updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,sessions: null == sessions ? _self.sessions : sessions // ignore: cast_nullable_to_non_nullable
as List<MarketSession>,
  ));
}

}


/// Adds pattern-matching-related methods to [MarketHistory].
extension MarketHistoryPatterns on MarketHistory {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MarketHistory value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MarketHistory() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MarketHistory value)  $default,){
final _that = this;
switch (_that) {
case _MarketHistory():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MarketHistory value)?  $default,){
final _that = this;
switch (_that) {
case _MarketHistory() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'updated_at')  String? updatedAt,  List<MarketSession> sessions)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MarketHistory() when $default != null:
return $default(_that.updatedAt,_that.sessions);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'updated_at')  String? updatedAt,  List<MarketSession> sessions)  $default,) {final _that = this;
switch (_that) {
case _MarketHistory():
return $default(_that.updatedAt,_that.sessions);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'updated_at')  String? updatedAt,  List<MarketSession> sessions)?  $default,) {final _that = this;
switch (_that) {
case _MarketHistory() when $default != null:
return $default(_that.updatedAt,_that.sessions);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MarketHistory extends MarketHistory {
  const _MarketHistory({@JsonKey(name: 'updated_at') this.updatedAt, final  List<MarketSession> sessions = const <MarketSession>[]}): _sessions = sessions,super._();
  factory _MarketHistory.fromJson(Map<String, dynamic> json) => _$MarketHistoryFromJson(json);

@override@JsonKey(name: 'updated_at') final  String? updatedAt;
 final  List<MarketSession> _sessions;
@override@JsonKey() List<MarketSession> get sessions {
  if (_sessions is EqualUnmodifiableListView) return _sessions;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_sessions);
}


/// Create a copy of MarketHistory
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MarketHistoryCopyWith<_MarketHistory> get copyWith => __$MarketHistoryCopyWithImpl<_MarketHistory>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MarketHistoryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MarketHistory&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&const DeepCollectionEquality().equals(other._sessions, _sessions));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,updatedAt,const DeepCollectionEquality().hash(_sessions));

@override
String toString() {
  return 'MarketHistory(updatedAt: $updatedAt, sessions: $sessions)';
}


}

/// @nodoc
abstract mixin class _$MarketHistoryCopyWith<$Res> implements $MarketHistoryCopyWith<$Res> {
  factory _$MarketHistoryCopyWith(_MarketHistory value, $Res Function(_MarketHistory) _then) = __$MarketHistoryCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'updated_at') String? updatedAt, List<MarketSession> sessions
});




}
/// @nodoc
class __$MarketHistoryCopyWithImpl<$Res>
    implements _$MarketHistoryCopyWith<$Res> {
  __$MarketHistoryCopyWithImpl(this._self, this._then);

  final _MarketHistory _self;
  final $Res Function(_MarketHistory) _then;

/// Create a copy of MarketHistory
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? updatedAt = freezed,Object? sessions = null,}) {
  return _then(_MarketHistory(
updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,sessions: null == sessions ? _self._sessions : sessions // ignore: cast_nullable_to_non_nullable
as List<MarketSession>,
  ));
}


}


/// @nodoc
mixin _$MarketSession {

 String get date; Map<String, double> get indices; MarketBreadth? get breadth;
/// Create a copy of MarketSession
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MarketSessionCopyWith<MarketSession> get copyWith => _$MarketSessionCopyWithImpl<MarketSession>(this as MarketSession, _$identity);

  /// Serializes this MarketSession to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MarketSession&&(identical(other.date, date) || other.date == date)&&const DeepCollectionEquality().equals(other.indices, indices)&&(identical(other.breadth, breadth) || other.breadth == breadth));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,const DeepCollectionEquality().hash(indices),breadth);

@override
String toString() {
  return 'MarketSession(date: $date, indices: $indices, breadth: $breadth)';
}


}

/// @nodoc
abstract mixin class $MarketSessionCopyWith<$Res>  {
  factory $MarketSessionCopyWith(MarketSession value, $Res Function(MarketSession) _then) = _$MarketSessionCopyWithImpl;
@useResult
$Res call({
 String date, Map<String, double> indices, MarketBreadth? breadth
});


$MarketBreadthCopyWith<$Res>? get breadth;

}
/// @nodoc
class _$MarketSessionCopyWithImpl<$Res>
    implements $MarketSessionCopyWith<$Res> {
  _$MarketSessionCopyWithImpl(this._self, this._then);

  final MarketSession _self;
  final $Res Function(MarketSession) _then;

/// Create a copy of MarketSession
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? indices = null,Object? breadth = freezed,}) {
  return _then(_self.copyWith(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,indices: null == indices ? _self.indices : indices // ignore: cast_nullable_to_non_nullable
as Map<String, double>,breadth: freezed == breadth ? _self.breadth : breadth // ignore: cast_nullable_to_non_nullable
as MarketBreadth?,
  ));
}
/// Create a copy of MarketSession
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$MarketBreadthCopyWith<$Res>? get breadth {
    if (_self.breadth == null) {
    return null;
  }

  return $MarketBreadthCopyWith<$Res>(_self.breadth!, (value) {
    return _then(_self.copyWith(breadth: value));
  });
}
}


/// Adds pattern-matching-related methods to [MarketSession].
extension MarketSessionPatterns on MarketSession {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MarketSession value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MarketSession() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MarketSession value)  $default,){
final _that = this;
switch (_that) {
case _MarketSession():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MarketSession value)?  $default,){
final _that = this;
switch (_that) {
case _MarketSession() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  Map<String, double> indices,  MarketBreadth? breadth)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MarketSession() when $default != null:
return $default(_that.date,_that.indices,_that.breadth);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  Map<String, double> indices,  MarketBreadth? breadth)  $default,) {final _that = this;
switch (_that) {
case _MarketSession():
return $default(_that.date,_that.indices,_that.breadth);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  Map<String, double> indices,  MarketBreadth? breadth)?  $default,) {final _that = this;
switch (_that) {
case _MarketSession() when $default != null:
return $default(_that.date,_that.indices,_that.breadth);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MarketSession extends MarketSession {
  const _MarketSession({required this.date, final  Map<String, double> indices = const <String, double>{}, this.breadth}): _indices = indices,super._();
  factory _MarketSession.fromJson(Map<String, dynamic> json) => _$MarketSessionFromJson(json);

@override final  String date;
 final  Map<String, double> _indices;
@override@JsonKey() Map<String, double> get indices {
  if (_indices is EqualUnmodifiableMapView) return _indices;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_indices);
}

@override final  MarketBreadth? breadth;

/// Create a copy of MarketSession
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MarketSessionCopyWith<_MarketSession> get copyWith => __$MarketSessionCopyWithImpl<_MarketSession>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MarketSessionToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MarketSession&&(identical(other.date, date) || other.date == date)&&const DeepCollectionEquality().equals(other._indices, _indices)&&(identical(other.breadth, breadth) || other.breadth == breadth));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,const DeepCollectionEquality().hash(_indices),breadth);

@override
String toString() {
  return 'MarketSession(date: $date, indices: $indices, breadth: $breadth)';
}


}

/// @nodoc
abstract mixin class _$MarketSessionCopyWith<$Res> implements $MarketSessionCopyWith<$Res> {
  factory _$MarketSessionCopyWith(_MarketSession value, $Res Function(_MarketSession) _then) = __$MarketSessionCopyWithImpl;
@override @useResult
$Res call({
 String date, Map<String, double> indices, MarketBreadth? breadth
});


@override $MarketBreadthCopyWith<$Res>? get breadth;

}
/// @nodoc
class __$MarketSessionCopyWithImpl<$Res>
    implements _$MarketSessionCopyWith<$Res> {
  __$MarketSessionCopyWithImpl(this._self, this._then);

  final _MarketSession _self;
  final $Res Function(_MarketSession) _then;

/// Create a copy of MarketSession
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? indices = null,Object? breadth = freezed,}) {
  return _then(_MarketSession(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,indices: null == indices ? _self._indices : indices // ignore: cast_nullable_to_non_nullable
as Map<String, double>,breadth: freezed == breadth ? _self.breadth : breadth // ignore: cast_nullable_to_non_nullable
as MarketBreadth?,
  ));
}

/// Create a copy of MarketSession
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$MarketBreadthCopyWith<$Res>? get breadth {
    if (_self.breadth == null) {
    return null;
  }

  return $MarketBreadthCopyWith<$Res>(_self.breadth!, (value) {
    return _then(_self.copyWith(breadth: value));
  });
}
}


/// @nodoc
mixin _$MarketBreadth {

 int get up; int get down; int get flat; int get counted;/// How this session was counted. `session` means the live market snapshot,
/// which reads every listed share's published change — 282 of them, where
/// a change of exactly zero is a real "did not move". `closes` means it was
/// reconstructed by comparing stored per-company closes, which can only see
/// shares whose history covers both days and so counts around 230.
///
/// Carried rather than hidden. Two counts of the *same* session by
/// different methods is the bug that put 107 rose beside 57 rose on two
/// screens; two adjacent sessions counted over slightly different
/// populations, each carrying its own [counted] and saying which method
/// produced it, is simply the data that exists.
 String get basis;
/// Create a copy of MarketBreadth
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MarketBreadthCopyWith<MarketBreadth> get copyWith => _$MarketBreadthCopyWithImpl<MarketBreadth>(this as MarketBreadth, _$identity);

  /// Serializes this MarketBreadth to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MarketBreadth&&(identical(other.up, up) || other.up == up)&&(identical(other.down, down) || other.down == down)&&(identical(other.flat, flat) || other.flat == flat)&&(identical(other.counted, counted) || other.counted == counted)&&(identical(other.basis, basis) || other.basis == basis));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,up,down,flat,counted,basis);

@override
String toString() {
  return 'MarketBreadth(up: $up, down: $down, flat: $flat, counted: $counted, basis: $basis)';
}


}

/// @nodoc
abstract mixin class $MarketBreadthCopyWith<$Res>  {
  factory $MarketBreadthCopyWith(MarketBreadth value, $Res Function(MarketBreadth) _then) = _$MarketBreadthCopyWithImpl;
@useResult
$Res call({
 int up, int down, int flat, int counted, String basis
});




}
/// @nodoc
class _$MarketBreadthCopyWithImpl<$Res>
    implements $MarketBreadthCopyWith<$Res> {
  _$MarketBreadthCopyWithImpl(this._self, this._then);

  final MarketBreadth _self;
  final $Res Function(MarketBreadth) _then;

/// Create a copy of MarketBreadth
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? up = null,Object? down = null,Object? flat = null,Object? counted = null,Object? basis = null,}) {
  return _then(_self.copyWith(
up: null == up ? _self.up : up // ignore: cast_nullable_to_non_nullable
as int,down: null == down ? _self.down : down // ignore: cast_nullable_to_non_nullable
as int,flat: null == flat ? _self.flat : flat // ignore: cast_nullable_to_non_nullable
as int,counted: null == counted ? _self.counted : counted // ignore: cast_nullable_to_non_nullable
as int,basis: null == basis ? _self.basis : basis // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [MarketBreadth].
extension MarketBreadthPatterns on MarketBreadth {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MarketBreadth value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MarketBreadth() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MarketBreadth value)  $default,){
final _that = this;
switch (_that) {
case _MarketBreadth():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MarketBreadth value)?  $default,){
final _that = this;
switch (_that) {
case _MarketBreadth() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int up,  int down,  int flat,  int counted,  String basis)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MarketBreadth() when $default != null:
return $default(_that.up,_that.down,_that.flat,_that.counted,_that.basis);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int up,  int down,  int flat,  int counted,  String basis)  $default,) {final _that = this;
switch (_that) {
case _MarketBreadth():
return $default(_that.up,_that.down,_that.flat,_that.counted,_that.basis);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int up,  int down,  int flat,  int counted,  String basis)?  $default,) {final _that = this;
switch (_that) {
case _MarketBreadth() when $default != null:
return $default(_that.up,_that.down,_that.flat,_that.counted,_that.basis);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MarketBreadth extends MarketBreadth {
  const _MarketBreadth({this.up = 0, this.down = 0, this.flat = 0, this.counted = 0, this.basis = 'session'}): super._();
  factory _MarketBreadth.fromJson(Map<String, dynamic> json) => _$MarketBreadthFromJson(json);

@override@JsonKey() final  int up;
@override@JsonKey() final  int down;
@override@JsonKey() final  int flat;
@override@JsonKey() final  int counted;
/// How this session was counted. `session` means the live market snapshot,
/// which reads every listed share's published change — 282 of them, where
/// a change of exactly zero is a real "did not move". `closes` means it was
/// reconstructed by comparing stored per-company closes, which can only see
/// shares whose history covers both days and so counts around 230.
///
/// Carried rather than hidden. Two counts of the *same* session by
/// different methods is the bug that put 107 rose beside 57 rose on two
/// screens; two adjacent sessions counted over slightly different
/// populations, each carrying its own [counted] and saying which method
/// produced it, is simply the data that exists.
@override@JsonKey() final  String basis;

/// Create a copy of MarketBreadth
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MarketBreadthCopyWith<_MarketBreadth> get copyWith => __$MarketBreadthCopyWithImpl<_MarketBreadth>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MarketBreadthToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MarketBreadth&&(identical(other.up, up) || other.up == up)&&(identical(other.down, down) || other.down == down)&&(identical(other.flat, flat) || other.flat == flat)&&(identical(other.counted, counted) || other.counted == counted)&&(identical(other.basis, basis) || other.basis == basis));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,up,down,flat,counted,basis);

@override
String toString() {
  return 'MarketBreadth(up: $up, down: $down, flat: $flat, counted: $counted, basis: $basis)';
}


}

/// @nodoc
abstract mixin class _$MarketBreadthCopyWith<$Res> implements $MarketBreadthCopyWith<$Res> {
  factory _$MarketBreadthCopyWith(_MarketBreadth value, $Res Function(_MarketBreadth) _then) = __$MarketBreadthCopyWithImpl;
@override @useResult
$Res call({
 int up, int down, int flat, int counted, String basis
});




}
/// @nodoc
class __$MarketBreadthCopyWithImpl<$Res>
    implements _$MarketBreadthCopyWith<$Res> {
  __$MarketBreadthCopyWithImpl(this._self, this._then);

  final _MarketBreadth _self;
  final $Res Function(_MarketBreadth) _then;

/// Create a copy of MarketBreadth
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? up = null,Object? down = null,Object? flat = null,Object? counted = null,Object? basis = null,}) {
  return _then(_MarketBreadth(
up: null == up ? _self.up : up // ignore: cast_nullable_to_non_nullable
as int,down: null == down ? _self.down : down // ignore: cast_nullable_to_non_nullable
as int,flat: null == flat ? _self.flat : flat // ignore: cast_nullable_to_non_nullable
as int,counted: null == counted ? _self.counted : counted // ignore: cast_nullable_to_non_nullable
as int,basis: null == basis ? _self.basis : basis // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
