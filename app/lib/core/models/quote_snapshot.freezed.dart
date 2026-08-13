// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'quote_snapshot.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$QuoteSnapshot {

/// When the server read the market. Not when the trade happened — that is
/// this instant minus [delay].
@JsonKey(name: 'as_of') String get asOf;@JsonKey(name: 'delay_seconds') int get delaySeconds;@JsonKey(name: 'update_modes') List<String> get updateModes; ExchangeSession? get session; bool get stale; Map<String, LiveQuote> get quotes;
/// Create a copy of QuoteSnapshot
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$QuoteSnapshotCopyWith<QuoteSnapshot> get copyWith => _$QuoteSnapshotCopyWithImpl<QuoteSnapshot>(this as QuoteSnapshot, _$identity);

  /// Serializes this QuoteSnapshot to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is QuoteSnapshot&&(identical(other.asOf, asOf) || other.asOf == asOf)&&(identical(other.delaySeconds, delaySeconds) || other.delaySeconds == delaySeconds)&&const DeepCollectionEquality().equals(other.updateModes, updateModes)&&(identical(other.session, session) || other.session == session)&&(identical(other.stale, stale) || other.stale == stale)&&const DeepCollectionEquality().equals(other.quotes, quotes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,asOf,delaySeconds,const DeepCollectionEquality().hash(updateModes),session,stale,const DeepCollectionEquality().hash(quotes));

@override
String toString() {
  return 'QuoteSnapshot(asOf: $asOf, delaySeconds: $delaySeconds, updateModes: $updateModes, session: $session, stale: $stale, quotes: $quotes)';
}


}

/// @nodoc
abstract mixin class $QuoteSnapshotCopyWith<$Res>  {
  factory $QuoteSnapshotCopyWith(QuoteSnapshot value, $Res Function(QuoteSnapshot) _then) = _$QuoteSnapshotCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'as_of') String asOf,@JsonKey(name: 'delay_seconds') int delaySeconds,@JsonKey(name: 'update_modes') List<String> updateModes, ExchangeSession? session, bool stale, Map<String, LiveQuote> quotes
});


$ExchangeSessionCopyWith<$Res>? get session;

}
/// @nodoc
class _$QuoteSnapshotCopyWithImpl<$Res>
    implements $QuoteSnapshotCopyWith<$Res> {
  _$QuoteSnapshotCopyWithImpl(this._self, this._then);

  final QuoteSnapshot _self;
  final $Res Function(QuoteSnapshot) _then;

/// Create a copy of QuoteSnapshot
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? asOf = null,Object? delaySeconds = null,Object? updateModes = null,Object? session = freezed,Object? stale = null,Object? quotes = null,}) {
  return _then(_self.copyWith(
asOf: null == asOf ? _self.asOf : asOf // ignore: cast_nullable_to_non_nullable
as String,delaySeconds: null == delaySeconds ? _self.delaySeconds : delaySeconds // ignore: cast_nullable_to_non_nullable
as int,updateModes: null == updateModes ? _self.updateModes : updateModes // ignore: cast_nullable_to_non_nullable
as List<String>,session: freezed == session ? _self.session : session // ignore: cast_nullable_to_non_nullable
as ExchangeSession?,stale: null == stale ? _self.stale : stale // ignore: cast_nullable_to_non_nullable
as bool,quotes: null == quotes ? _self.quotes : quotes // ignore: cast_nullable_to_non_nullable
as Map<String, LiveQuote>,
  ));
}
/// Create a copy of QuoteSnapshot
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ExchangeSessionCopyWith<$Res>? get session {
    if (_self.session == null) {
    return null;
  }

  return $ExchangeSessionCopyWith<$Res>(_self.session!, (value) {
    return _then(_self.copyWith(session: value));
  });
}
}


/// Adds pattern-matching-related methods to [QuoteSnapshot].
extension QuoteSnapshotPatterns on QuoteSnapshot {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _QuoteSnapshot value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _QuoteSnapshot() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _QuoteSnapshot value)  $default,){
final _that = this;
switch (_that) {
case _QuoteSnapshot():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _QuoteSnapshot value)?  $default,){
final _that = this;
switch (_that) {
case _QuoteSnapshot() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'as_of')  String asOf, @JsonKey(name: 'delay_seconds')  int delaySeconds, @JsonKey(name: 'update_modes')  List<String> updateModes,  ExchangeSession? session,  bool stale,  Map<String, LiveQuote> quotes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _QuoteSnapshot() when $default != null:
return $default(_that.asOf,_that.delaySeconds,_that.updateModes,_that.session,_that.stale,_that.quotes);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'as_of')  String asOf, @JsonKey(name: 'delay_seconds')  int delaySeconds, @JsonKey(name: 'update_modes')  List<String> updateModes,  ExchangeSession? session,  bool stale,  Map<String, LiveQuote> quotes)  $default,) {final _that = this;
switch (_that) {
case _QuoteSnapshot():
return $default(_that.asOf,_that.delaySeconds,_that.updateModes,_that.session,_that.stale,_that.quotes);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'as_of')  String asOf, @JsonKey(name: 'delay_seconds')  int delaySeconds, @JsonKey(name: 'update_modes')  List<String> updateModes,  ExchangeSession? session,  bool stale,  Map<String, LiveQuote> quotes)?  $default,) {final _that = this;
switch (_that) {
case _QuoteSnapshot() when $default != null:
return $default(_that.asOf,_that.delaySeconds,_that.updateModes,_that.session,_that.stale,_that.quotes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _QuoteSnapshot extends QuoteSnapshot {
  const _QuoteSnapshot({@JsonKey(name: 'as_of') required this.asOf, @JsonKey(name: 'delay_seconds') this.delaySeconds = 900, @JsonKey(name: 'update_modes') final  List<String> updateModes = const <String>[], this.session, this.stale = false, final  Map<String, LiveQuote> quotes = const <String, LiveQuote>{}}): _updateModes = updateModes,_quotes = quotes,super._();
  factory _QuoteSnapshot.fromJson(Map<String, dynamic> json) => _$QuoteSnapshotFromJson(json);

/// When the server read the market. Not when the trade happened — that is
/// this instant minus [delay].
@override@JsonKey(name: 'as_of') final  String asOf;
@override@JsonKey(name: 'delay_seconds') final  int delaySeconds;
 final  List<String> _updateModes;
@override@JsonKey(name: 'update_modes') List<String> get updateModes {
  if (_updateModes is EqualUnmodifiableListView) return _updateModes;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_updateModes);
}

@override final  ExchangeSession? session;
@override@JsonKey() final  bool stale;
 final  Map<String, LiveQuote> _quotes;
@override@JsonKey() Map<String, LiveQuote> get quotes {
  if (_quotes is EqualUnmodifiableMapView) return _quotes;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_quotes);
}


/// Create a copy of QuoteSnapshot
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$QuoteSnapshotCopyWith<_QuoteSnapshot> get copyWith => __$QuoteSnapshotCopyWithImpl<_QuoteSnapshot>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$QuoteSnapshotToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _QuoteSnapshot&&(identical(other.asOf, asOf) || other.asOf == asOf)&&(identical(other.delaySeconds, delaySeconds) || other.delaySeconds == delaySeconds)&&const DeepCollectionEquality().equals(other._updateModes, _updateModes)&&(identical(other.session, session) || other.session == session)&&(identical(other.stale, stale) || other.stale == stale)&&const DeepCollectionEquality().equals(other._quotes, _quotes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,asOf,delaySeconds,const DeepCollectionEquality().hash(_updateModes),session,stale,const DeepCollectionEquality().hash(_quotes));

@override
String toString() {
  return 'QuoteSnapshot(asOf: $asOf, delaySeconds: $delaySeconds, updateModes: $updateModes, session: $session, stale: $stale, quotes: $quotes)';
}


}

/// @nodoc
abstract mixin class _$QuoteSnapshotCopyWith<$Res> implements $QuoteSnapshotCopyWith<$Res> {
  factory _$QuoteSnapshotCopyWith(_QuoteSnapshot value, $Res Function(_QuoteSnapshot) _then) = __$QuoteSnapshotCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'as_of') String asOf,@JsonKey(name: 'delay_seconds') int delaySeconds,@JsonKey(name: 'update_modes') List<String> updateModes, ExchangeSession? session, bool stale, Map<String, LiveQuote> quotes
});


@override $ExchangeSessionCopyWith<$Res>? get session;

}
/// @nodoc
class __$QuoteSnapshotCopyWithImpl<$Res>
    implements _$QuoteSnapshotCopyWith<$Res> {
  __$QuoteSnapshotCopyWithImpl(this._self, this._then);

  final _QuoteSnapshot _self;
  final $Res Function(_QuoteSnapshot) _then;

/// Create a copy of QuoteSnapshot
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? asOf = null,Object? delaySeconds = null,Object? updateModes = null,Object? session = freezed,Object? stale = null,Object? quotes = null,}) {
  return _then(_QuoteSnapshot(
asOf: null == asOf ? _self.asOf : asOf // ignore: cast_nullable_to_non_nullable
as String,delaySeconds: null == delaySeconds ? _self.delaySeconds : delaySeconds // ignore: cast_nullable_to_non_nullable
as int,updateModes: null == updateModes ? _self._updateModes : updateModes // ignore: cast_nullable_to_non_nullable
as List<String>,session: freezed == session ? _self.session : session // ignore: cast_nullable_to_non_nullable
as ExchangeSession?,stale: null == stale ? _self.stale : stale // ignore: cast_nullable_to_non_nullable
as bool,quotes: null == quotes ? _self._quotes : quotes // ignore: cast_nullable_to_non_nullable
as Map<String, LiveQuote>,
  ));
}

/// Create a copy of QuoteSnapshot
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ExchangeSessionCopyWith<$Res>? get session {
    if (_self.session == null) {
    return null;
  }

  return $ExchangeSessionCopyWith<$Res>(_self.session!, (value) {
    return _then(_self.copyWith(session: value));
  });
}
}


/// @nodoc
mixin _$ExchangeSession {

 bool get open; String? get weekday;
/// Create a copy of ExchangeSession
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ExchangeSessionCopyWith<ExchangeSession> get copyWith => _$ExchangeSessionCopyWithImpl<ExchangeSession>(this as ExchangeSession, _$identity);

  /// Serializes this ExchangeSession to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ExchangeSession&&(identical(other.open, open) || other.open == open)&&(identical(other.weekday, weekday) || other.weekday == weekday));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,open,weekday);

@override
String toString() {
  return 'ExchangeSession(open: $open, weekday: $weekday)';
}


}

/// @nodoc
abstract mixin class $ExchangeSessionCopyWith<$Res>  {
  factory $ExchangeSessionCopyWith(ExchangeSession value, $Res Function(ExchangeSession) _then) = _$ExchangeSessionCopyWithImpl;
@useResult
$Res call({
 bool open, String? weekday
});




}
/// @nodoc
class _$ExchangeSessionCopyWithImpl<$Res>
    implements $ExchangeSessionCopyWith<$Res> {
  _$ExchangeSessionCopyWithImpl(this._self, this._then);

  final ExchangeSession _self;
  final $Res Function(ExchangeSession) _then;

/// Create a copy of ExchangeSession
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? open = null,Object? weekday = freezed,}) {
  return _then(_self.copyWith(
open: null == open ? _self.open : open // ignore: cast_nullable_to_non_nullable
as bool,weekday: freezed == weekday ? _self.weekday : weekday // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ExchangeSession].
extension ExchangeSessionPatterns on ExchangeSession {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ExchangeSession value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ExchangeSession() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ExchangeSession value)  $default,){
final _that = this;
switch (_that) {
case _ExchangeSession():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ExchangeSession value)?  $default,){
final _that = this;
switch (_that) {
case _ExchangeSession() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool open,  String? weekday)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ExchangeSession() when $default != null:
return $default(_that.open,_that.weekday);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool open,  String? weekday)  $default,) {final _that = this;
switch (_that) {
case _ExchangeSession():
return $default(_that.open,_that.weekday);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool open,  String? weekday)?  $default,) {final _that = this;
switch (_that) {
case _ExchangeSession() when $default != null:
return $default(_that.open,_that.weekday);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ExchangeSession implements ExchangeSession {
  const _ExchangeSession({this.open = false, this.weekday});
  factory _ExchangeSession.fromJson(Map<String, dynamic> json) => _$ExchangeSessionFromJson(json);

@override@JsonKey() final  bool open;
@override final  String? weekday;

/// Create a copy of ExchangeSession
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ExchangeSessionCopyWith<_ExchangeSession> get copyWith => __$ExchangeSessionCopyWithImpl<_ExchangeSession>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ExchangeSessionToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ExchangeSession&&(identical(other.open, open) || other.open == open)&&(identical(other.weekday, weekday) || other.weekday == weekday));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,open,weekday);

@override
String toString() {
  return 'ExchangeSession(open: $open, weekday: $weekday)';
}


}

/// @nodoc
abstract mixin class _$ExchangeSessionCopyWith<$Res> implements $ExchangeSessionCopyWith<$Res> {
  factory _$ExchangeSessionCopyWith(_ExchangeSession value, $Res Function(_ExchangeSession) _then) = __$ExchangeSessionCopyWithImpl;
@override @useResult
$Res call({
 bool open, String? weekday
});




}
/// @nodoc
class __$ExchangeSessionCopyWithImpl<$Res>
    implements _$ExchangeSessionCopyWith<$Res> {
  __$ExchangeSessionCopyWithImpl(this._self, this._then);

  final _ExchangeSession _self;
  final $Res Function(_ExchangeSession) _then;

/// Create a copy of ExchangeSession
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? open = null,Object? weekday = freezed,}) {
  return _then(_ExchangeSession(
open: null == open ? _self.open : open // ignore: cast_nullable_to_non_nullable
as bool,weekday: freezed == weekday ? _self.weekday : weekday // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$LiveQuote {

@JsonKey(name: 'c') double get close;@JsonKey(name: 'o') double? get open;@JsonKey(name: 'h') double? get high;@JsonKey(name: 'l') double? get low;@JsonKey(name: 'v') int? get volume;/// Percent, as the feed publishes it: `1.24` means +1.24%.
@JsonKey(name: 'ch') double? get changePercent;@JsonKey(name: 'pc') double? get previousClose;
/// Create a copy of LiveQuote
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LiveQuoteCopyWith<LiveQuote> get copyWith => _$LiveQuoteCopyWithImpl<LiveQuote>(this as LiveQuote, _$identity);

  /// Serializes this LiveQuote to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LiveQuote&&(identical(other.close, close) || other.close == close)&&(identical(other.open, open) || other.open == open)&&(identical(other.high, high) || other.high == high)&&(identical(other.low, low) || other.low == low)&&(identical(other.volume, volume) || other.volume == volume)&&(identical(other.changePercent, changePercent) || other.changePercent == changePercent)&&(identical(other.previousClose, previousClose) || other.previousClose == previousClose));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,close,open,high,low,volume,changePercent,previousClose);

@override
String toString() {
  return 'LiveQuote(close: $close, open: $open, high: $high, low: $low, volume: $volume, changePercent: $changePercent, previousClose: $previousClose)';
}


}

/// @nodoc
abstract mixin class $LiveQuoteCopyWith<$Res>  {
  factory $LiveQuoteCopyWith(LiveQuote value, $Res Function(LiveQuote) _then) = _$LiveQuoteCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'c') double close,@JsonKey(name: 'o') double? open,@JsonKey(name: 'h') double? high,@JsonKey(name: 'l') double? low,@JsonKey(name: 'v') int? volume,@JsonKey(name: 'ch') double? changePercent,@JsonKey(name: 'pc') double? previousClose
});




}
/// @nodoc
class _$LiveQuoteCopyWithImpl<$Res>
    implements $LiveQuoteCopyWith<$Res> {
  _$LiveQuoteCopyWithImpl(this._self, this._then);

  final LiveQuote _self;
  final $Res Function(LiveQuote) _then;

/// Create a copy of LiveQuote
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? close = null,Object? open = freezed,Object? high = freezed,Object? low = freezed,Object? volume = freezed,Object? changePercent = freezed,Object? previousClose = freezed,}) {
  return _then(_self.copyWith(
close: null == close ? _self.close : close // ignore: cast_nullable_to_non_nullable
as double,open: freezed == open ? _self.open : open // ignore: cast_nullable_to_non_nullable
as double?,high: freezed == high ? _self.high : high // ignore: cast_nullable_to_non_nullable
as double?,low: freezed == low ? _self.low : low // ignore: cast_nullable_to_non_nullable
as double?,volume: freezed == volume ? _self.volume : volume // ignore: cast_nullable_to_non_nullable
as int?,changePercent: freezed == changePercent ? _self.changePercent : changePercent // ignore: cast_nullable_to_non_nullable
as double?,previousClose: freezed == previousClose ? _self.previousClose : previousClose // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [LiveQuote].
extension LiveQuotePatterns on LiveQuote {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LiveQuote value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LiveQuote() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LiveQuote value)  $default,){
final _that = this;
switch (_that) {
case _LiveQuote():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LiveQuote value)?  $default,){
final _that = this;
switch (_that) {
case _LiveQuote() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'c')  double close, @JsonKey(name: 'o')  double? open, @JsonKey(name: 'h')  double? high, @JsonKey(name: 'l')  double? low, @JsonKey(name: 'v')  int? volume, @JsonKey(name: 'ch')  double? changePercent, @JsonKey(name: 'pc')  double? previousClose)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LiveQuote() when $default != null:
return $default(_that.close,_that.open,_that.high,_that.low,_that.volume,_that.changePercent,_that.previousClose);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'c')  double close, @JsonKey(name: 'o')  double? open, @JsonKey(name: 'h')  double? high, @JsonKey(name: 'l')  double? low, @JsonKey(name: 'v')  int? volume, @JsonKey(name: 'ch')  double? changePercent, @JsonKey(name: 'pc')  double? previousClose)  $default,) {final _that = this;
switch (_that) {
case _LiveQuote():
return $default(_that.close,_that.open,_that.high,_that.low,_that.volume,_that.changePercent,_that.previousClose);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'c')  double close, @JsonKey(name: 'o')  double? open, @JsonKey(name: 'h')  double? high, @JsonKey(name: 'l')  double? low, @JsonKey(name: 'v')  int? volume, @JsonKey(name: 'ch')  double? changePercent, @JsonKey(name: 'pc')  double? previousClose)?  $default,) {final _that = this;
switch (_that) {
case _LiveQuote() when $default != null:
return $default(_that.close,_that.open,_that.high,_that.low,_that.volume,_that.changePercent,_that.previousClose);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LiveQuote extends LiveQuote {
  const _LiveQuote({@JsonKey(name: 'c') required this.close, @JsonKey(name: 'o') this.open, @JsonKey(name: 'h') this.high, @JsonKey(name: 'l') this.low, @JsonKey(name: 'v') this.volume, @JsonKey(name: 'ch') this.changePercent, @JsonKey(name: 'pc') this.previousClose}): super._();
  factory _LiveQuote.fromJson(Map<String, dynamic> json) => _$LiveQuoteFromJson(json);

@override@JsonKey(name: 'c') final  double close;
@override@JsonKey(name: 'o') final  double? open;
@override@JsonKey(name: 'h') final  double? high;
@override@JsonKey(name: 'l') final  double? low;
@override@JsonKey(name: 'v') final  int? volume;
/// Percent, as the feed publishes it: `1.24` means +1.24%.
@override@JsonKey(name: 'ch') final  double? changePercent;
@override@JsonKey(name: 'pc') final  double? previousClose;

/// Create a copy of LiveQuote
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LiveQuoteCopyWith<_LiveQuote> get copyWith => __$LiveQuoteCopyWithImpl<_LiveQuote>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LiveQuoteToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LiveQuote&&(identical(other.close, close) || other.close == close)&&(identical(other.open, open) || other.open == open)&&(identical(other.high, high) || other.high == high)&&(identical(other.low, low) || other.low == low)&&(identical(other.volume, volume) || other.volume == volume)&&(identical(other.changePercent, changePercent) || other.changePercent == changePercent)&&(identical(other.previousClose, previousClose) || other.previousClose == previousClose));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,close,open,high,low,volume,changePercent,previousClose);

@override
String toString() {
  return 'LiveQuote(close: $close, open: $open, high: $high, low: $low, volume: $volume, changePercent: $changePercent, previousClose: $previousClose)';
}


}

/// @nodoc
abstract mixin class _$LiveQuoteCopyWith<$Res> implements $LiveQuoteCopyWith<$Res> {
  factory _$LiveQuoteCopyWith(_LiveQuote value, $Res Function(_LiveQuote) _then) = __$LiveQuoteCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'c') double close,@JsonKey(name: 'o') double? open,@JsonKey(name: 'h') double? high,@JsonKey(name: 'l') double? low,@JsonKey(name: 'v') int? volume,@JsonKey(name: 'ch') double? changePercent,@JsonKey(name: 'pc') double? previousClose
});




}
/// @nodoc
class __$LiveQuoteCopyWithImpl<$Res>
    implements _$LiveQuoteCopyWith<$Res> {
  __$LiveQuoteCopyWithImpl(this._self, this._then);

  final _LiveQuote _self;
  final $Res Function(_LiveQuote) _then;

/// Create a copy of LiveQuote
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? close = null,Object? open = freezed,Object? high = freezed,Object? low = freezed,Object? volume = freezed,Object? changePercent = freezed,Object? previousClose = freezed,}) {
  return _then(_LiveQuote(
close: null == close ? _self.close : close // ignore: cast_nullable_to_non_nullable
as double,open: freezed == open ? _self.open : open // ignore: cast_nullable_to_non_nullable
as double?,high: freezed == high ? _self.high : high // ignore: cast_nullable_to_non_nullable
as double?,low: freezed == low ? _self.low : low // ignore: cast_nullable_to_non_nullable
as double?,volume: freezed == volume ? _self.volume : volume // ignore: cast_nullable_to_non_nullable
as int?,changePercent: freezed == changePercent ? _self.changePercent : changePercent // ignore: cast_nullable_to_non_nullable
as double?,previousClose: freezed == previousClose ? _self.previousClose : previousClose // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}

// dart format on
