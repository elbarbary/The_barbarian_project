// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'market_snapshot.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MarketSnapshot {

/// Session the closes belong to. This is the date the UI must display —
/// the app shows the last *available* session, never "now" (spec §49).
 String get date; Map<String, StockQuote> get stocks;
/// Create a copy of MarketSnapshot
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MarketSnapshotCopyWith<MarketSnapshot> get copyWith => _$MarketSnapshotCopyWithImpl<MarketSnapshot>(this as MarketSnapshot, _$identity);

  /// Serializes this MarketSnapshot to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MarketSnapshot&&(identical(other.date, date) || other.date == date)&&const DeepCollectionEquality().equals(other.stocks, stocks));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,const DeepCollectionEquality().hash(stocks));

@override
String toString() {
  return 'MarketSnapshot(date: $date, stocks: $stocks)';
}


}

/// @nodoc
abstract mixin class $MarketSnapshotCopyWith<$Res>  {
  factory $MarketSnapshotCopyWith(MarketSnapshot value, $Res Function(MarketSnapshot) _then) = _$MarketSnapshotCopyWithImpl;
@useResult
$Res call({
 String date, Map<String, StockQuote> stocks
});




}
/// @nodoc
class _$MarketSnapshotCopyWithImpl<$Res>
    implements $MarketSnapshotCopyWith<$Res> {
  _$MarketSnapshotCopyWithImpl(this._self, this._then);

  final MarketSnapshot _self;
  final $Res Function(MarketSnapshot) _then;

/// Create a copy of MarketSnapshot
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? stocks = null,}) {
  return _then(_self.copyWith(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,stocks: null == stocks ? _self.stocks : stocks // ignore: cast_nullable_to_non_nullable
as Map<String, StockQuote>,
  ));
}

}


/// Adds pattern-matching-related methods to [MarketSnapshot].
extension MarketSnapshotPatterns on MarketSnapshot {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MarketSnapshot value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MarketSnapshot() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MarketSnapshot value)  $default,){
final _that = this;
switch (_that) {
case _MarketSnapshot():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MarketSnapshot value)?  $default,){
final _that = this;
switch (_that) {
case _MarketSnapshot() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  Map<String, StockQuote> stocks)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MarketSnapshot() when $default != null:
return $default(_that.date,_that.stocks);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  Map<String, StockQuote> stocks)  $default,) {final _that = this;
switch (_that) {
case _MarketSnapshot():
return $default(_that.date,_that.stocks);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  Map<String, StockQuote> stocks)?  $default,) {final _that = this;
switch (_that) {
case _MarketSnapshot() when $default != null:
return $default(_that.date,_that.stocks);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MarketSnapshot extends MarketSnapshot {
  const _MarketSnapshot({required this.date, final  Map<String, StockQuote> stocks = const <String, StockQuote>{}}): _stocks = stocks,super._();
  factory _MarketSnapshot.fromJson(Map<String, dynamic> json) => _$MarketSnapshotFromJson(json);

/// Session the closes belong to. This is the date the UI must display —
/// the app shows the last *available* session, never "now" (spec §49).
@override final  String date;
 final  Map<String, StockQuote> _stocks;
@override@JsonKey() Map<String, StockQuote> get stocks {
  if (_stocks is EqualUnmodifiableMapView) return _stocks;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_stocks);
}


/// Create a copy of MarketSnapshot
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MarketSnapshotCopyWith<_MarketSnapshot> get copyWith => __$MarketSnapshotCopyWithImpl<_MarketSnapshot>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MarketSnapshotToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MarketSnapshot&&(identical(other.date, date) || other.date == date)&&const DeepCollectionEquality().equals(other._stocks, _stocks));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,const DeepCollectionEquality().hash(_stocks));

@override
String toString() {
  return 'MarketSnapshot(date: $date, stocks: $stocks)';
}


}

/// @nodoc
abstract mixin class _$MarketSnapshotCopyWith<$Res> implements $MarketSnapshotCopyWith<$Res> {
  factory _$MarketSnapshotCopyWith(_MarketSnapshot value, $Res Function(_MarketSnapshot) _then) = __$MarketSnapshotCopyWithImpl;
@override @useResult
$Res call({
 String date, Map<String, StockQuote> stocks
});




}
/// @nodoc
class __$MarketSnapshotCopyWithImpl<$Res>
    implements _$MarketSnapshotCopyWith<$Res> {
  __$MarketSnapshotCopyWithImpl(this._self, this._then);

  final _MarketSnapshot _self;
  final $Res Function(_MarketSnapshot) _then;

/// Create a copy of MarketSnapshot
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? stocks = null,}) {
  return _then(_MarketSnapshot(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,stocks: null == stocks ? _self._stocks : stocks // ignore: cast_nullable_to_non_nullable
as Map<String, StockQuote>,
  ));
}


}


/// @nodoc
mixin _$StockQuote {

 double get close;@JsonKey(name: 'previous_close') double? get previousClose; double? get change;@JsonKey(name: 'change_percent') double? get changePercent; int? get volume;
/// Create a copy of StockQuote
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StockQuoteCopyWith<StockQuote> get copyWith => _$StockQuoteCopyWithImpl<StockQuote>(this as StockQuote, _$identity);

  /// Serializes this StockQuote to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is StockQuote&&(identical(other.close, close) || other.close == close)&&(identical(other.previousClose, previousClose) || other.previousClose == previousClose)&&(identical(other.change, change) || other.change == change)&&(identical(other.changePercent, changePercent) || other.changePercent == changePercent)&&(identical(other.volume, volume) || other.volume == volume));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,close,previousClose,change,changePercent,volume);

@override
String toString() {
  return 'StockQuote(close: $close, previousClose: $previousClose, change: $change, changePercent: $changePercent, volume: $volume)';
}


}

/// @nodoc
abstract mixin class $StockQuoteCopyWith<$Res>  {
  factory $StockQuoteCopyWith(StockQuote value, $Res Function(StockQuote) _then) = _$StockQuoteCopyWithImpl;
@useResult
$Res call({
 double close,@JsonKey(name: 'previous_close') double? previousClose, double? change,@JsonKey(name: 'change_percent') double? changePercent, int? volume
});




}
/// @nodoc
class _$StockQuoteCopyWithImpl<$Res>
    implements $StockQuoteCopyWith<$Res> {
  _$StockQuoteCopyWithImpl(this._self, this._then);

  final StockQuote _self;
  final $Res Function(StockQuote) _then;

/// Create a copy of StockQuote
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? close = null,Object? previousClose = freezed,Object? change = freezed,Object? changePercent = freezed,Object? volume = freezed,}) {
  return _then(_self.copyWith(
close: null == close ? _self.close : close // ignore: cast_nullable_to_non_nullable
as double,previousClose: freezed == previousClose ? _self.previousClose : previousClose // ignore: cast_nullable_to_non_nullable
as double?,change: freezed == change ? _self.change : change // ignore: cast_nullable_to_non_nullable
as double?,changePercent: freezed == changePercent ? _self.changePercent : changePercent // ignore: cast_nullable_to_non_nullable
as double?,volume: freezed == volume ? _self.volume : volume // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [StockQuote].
extension StockQuotePatterns on StockQuote {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _StockQuote value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _StockQuote() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _StockQuote value)  $default,){
final _that = this;
switch (_that) {
case _StockQuote():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _StockQuote value)?  $default,){
final _that = this;
switch (_that) {
case _StockQuote() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( double close, @JsonKey(name: 'previous_close')  double? previousClose,  double? change, @JsonKey(name: 'change_percent')  double? changePercent,  int? volume)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _StockQuote() when $default != null:
return $default(_that.close,_that.previousClose,_that.change,_that.changePercent,_that.volume);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( double close, @JsonKey(name: 'previous_close')  double? previousClose,  double? change, @JsonKey(name: 'change_percent')  double? changePercent,  int? volume)  $default,) {final _that = this;
switch (_that) {
case _StockQuote():
return $default(_that.close,_that.previousClose,_that.change,_that.changePercent,_that.volume);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( double close, @JsonKey(name: 'previous_close')  double? previousClose,  double? change, @JsonKey(name: 'change_percent')  double? changePercent,  int? volume)?  $default,) {final _that = this;
switch (_that) {
case _StockQuote() when $default != null:
return $default(_that.close,_that.previousClose,_that.change,_that.changePercent,_that.volume);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _StockQuote extends StockQuote {
  const _StockQuote({required this.close, @JsonKey(name: 'previous_close') this.previousClose, this.change, @JsonKey(name: 'change_percent') this.changePercent, this.volume}): super._();
  factory _StockQuote.fromJson(Map<String, dynamic> json) => _$StockQuoteFromJson(json);

@override final  double close;
@override@JsonKey(name: 'previous_close') final  double? previousClose;
@override final  double? change;
@override@JsonKey(name: 'change_percent') final  double? changePercent;
@override final  int? volume;

/// Create a copy of StockQuote
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StockQuoteCopyWith<_StockQuote> get copyWith => __$StockQuoteCopyWithImpl<_StockQuote>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StockQuoteToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _StockQuote&&(identical(other.close, close) || other.close == close)&&(identical(other.previousClose, previousClose) || other.previousClose == previousClose)&&(identical(other.change, change) || other.change == change)&&(identical(other.changePercent, changePercent) || other.changePercent == changePercent)&&(identical(other.volume, volume) || other.volume == volume));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,close,previousClose,change,changePercent,volume);

@override
String toString() {
  return 'StockQuote(close: $close, previousClose: $previousClose, change: $change, changePercent: $changePercent, volume: $volume)';
}


}

/// @nodoc
abstract mixin class _$StockQuoteCopyWith<$Res> implements $StockQuoteCopyWith<$Res> {
  factory _$StockQuoteCopyWith(_StockQuote value, $Res Function(_StockQuote) _then) = __$StockQuoteCopyWithImpl;
@override @useResult
$Res call({
 double close,@JsonKey(name: 'previous_close') double? previousClose, double? change,@JsonKey(name: 'change_percent') double? changePercent, int? volume
});




}
/// @nodoc
class __$StockQuoteCopyWithImpl<$Res>
    implements _$StockQuoteCopyWith<$Res> {
  __$StockQuoteCopyWithImpl(this._self, this._then);

  final _StockQuote _self;
  final $Res Function(_StockQuote) _then;

/// Create a copy of StockQuote
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? close = null,Object? previousClose = freezed,Object? change = freezed,Object? changePercent = freezed,Object? volume = freezed,}) {
  return _then(_StockQuote(
close: null == close ? _self.close : close // ignore: cast_nullable_to_non_nullable
as double,previousClose: freezed == previousClose ? _self.previousClose : previousClose // ignore: cast_nullable_to_non_nullable
as double?,change: freezed == change ? _self.change : change // ignore: cast_nullable_to_non_nullable
as double?,changePercent: freezed == changePercent ? _self.changePercent : changePercent // ignore: cast_nullable_to_non_nullable
as double?,volume: freezed == volume ? _self.volume : volume // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}

// dart format on
