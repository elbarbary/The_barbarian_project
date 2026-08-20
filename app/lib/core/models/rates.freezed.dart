// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'rates.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RatesDoc {

 List<RateRow> get indices;/// The markets and commodities an Egyptian holding is priced against —
/// the S&P, the Tadawul, oil, copper. Here so a reader can tell whether a
/// bad day was Egypt or was everywhere, which are different facts.
 List<RateRow> get world; List<RateRow> get currencies; List<MetalRow> get metals;
/// Create a copy of RatesDoc
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RatesDocCopyWith<RatesDoc> get copyWith => _$RatesDocCopyWithImpl<RatesDoc>(this as RatesDoc, _$identity);

  /// Serializes this RatesDoc to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RatesDoc&&const DeepCollectionEquality().equals(other.indices, indices)&&const DeepCollectionEquality().equals(other.world, world)&&const DeepCollectionEquality().equals(other.currencies, currencies)&&const DeepCollectionEquality().equals(other.metals, metals));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(indices),const DeepCollectionEquality().hash(world),const DeepCollectionEquality().hash(currencies),const DeepCollectionEquality().hash(metals));

@override
String toString() {
  return 'RatesDoc(indices: $indices, world: $world, currencies: $currencies, metals: $metals)';
}


}

/// @nodoc
abstract mixin class $RatesDocCopyWith<$Res>  {
  factory $RatesDocCopyWith(RatesDoc value, $Res Function(RatesDoc) _then) = _$RatesDocCopyWithImpl;
@useResult
$Res call({
 List<RateRow> indices, List<RateRow> world, List<RateRow> currencies, List<MetalRow> metals
});




}
/// @nodoc
class _$RatesDocCopyWithImpl<$Res>
    implements $RatesDocCopyWith<$Res> {
  _$RatesDocCopyWithImpl(this._self, this._then);

  final RatesDoc _self;
  final $Res Function(RatesDoc) _then;

/// Create a copy of RatesDoc
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? indices = null,Object? world = null,Object? currencies = null,Object? metals = null,}) {
  return _then(_self.copyWith(
indices: null == indices ? _self.indices : indices // ignore: cast_nullable_to_non_nullable
as List<RateRow>,world: null == world ? _self.world : world // ignore: cast_nullable_to_non_nullable
as List<RateRow>,currencies: null == currencies ? _self.currencies : currencies // ignore: cast_nullable_to_non_nullable
as List<RateRow>,metals: null == metals ? _self.metals : metals // ignore: cast_nullable_to_non_nullable
as List<MetalRow>,
  ));
}

}


/// Adds pattern-matching-related methods to [RatesDoc].
extension RatesDocPatterns on RatesDoc {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RatesDoc value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RatesDoc() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RatesDoc value)  $default,){
final _that = this;
switch (_that) {
case _RatesDoc():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RatesDoc value)?  $default,){
final _that = this;
switch (_that) {
case _RatesDoc() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<RateRow> indices,  List<RateRow> world,  List<RateRow> currencies,  List<MetalRow> metals)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RatesDoc() when $default != null:
return $default(_that.indices,_that.world,_that.currencies,_that.metals);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<RateRow> indices,  List<RateRow> world,  List<RateRow> currencies,  List<MetalRow> metals)  $default,) {final _that = this;
switch (_that) {
case _RatesDoc():
return $default(_that.indices,_that.world,_that.currencies,_that.metals);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<RateRow> indices,  List<RateRow> world,  List<RateRow> currencies,  List<MetalRow> metals)?  $default,) {final _that = this;
switch (_that) {
case _RatesDoc() when $default != null:
return $default(_that.indices,_that.world,_that.currencies,_that.metals);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RatesDoc extends RatesDoc {
  const _RatesDoc({final  List<RateRow> indices = const <RateRow>[], final  List<RateRow> world = const <RateRow>[], final  List<RateRow> currencies = const <RateRow>[], final  List<MetalRow> metals = const <MetalRow>[]}): _indices = indices,_world = world,_currencies = currencies,_metals = metals,super._();
  factory _RatesDoc.fromJson(Map<String, dynamic> json) => _$RatesDocFromJson(json);

 final  List<RateRow> _indices;
@override@JsonKey() List<RateRow> get indices {
  if (_indices is EqualUnmodifiableListView) return _indices;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_indices);
}

/// The markets and commodities an Egyptian holding is priced against —
/// the S&P, the Tadawul, oil, copper. Here so a reader can tell whether a
/// bad day was Egypt or was everywhere, which are different facts.
 final  List<RateRow> _world;
/// The markets and commodities an Egyptian holding is priced against —
/// the S&P, the Tadawul, oil, copper. Here so a reader can tell whether a
/// bad day was Egypt or was everywhere, which are different facts.
@override@JsonKey() List<RateRow> get world {
  if (_world is EqualUnmodifiableListView) return _world;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_world);
}

 final  List<RateRow> _currencies;
@override@JsonKey() List<RateRow> get currencies {
  if (_currencies is EqualUnmodifiableListView) return _currencies;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_currencies);
}

 final  List<MetalRow> _metals;
@override@JsonKey() List<MetalRow> get metals {
  if (_metals is EqualUnmodifiableListView) return _metals;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_metals);
}


/// Create a copy of RatesDoc
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RatesDocCopyWith<_RatesDoc> get copyWith => __$RatesDocCopyWithImpl<_RatesDoc>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RatesDocToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RatesDoc&&const DeepCollectionEquality().equals(other._indices, _indices)&&const DeepCollectionEquality().equals(other._world, _world)&&const DeepCollectionEquality().equals(other._currencies, _currencies)&&const DeepCollectionEquality().equals(other._metals, _metals));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_indices),const DeepCollectionEquality().hash(_world),const DeepCollectionEquality().hash(_currencies),const DeepCollectionEquality().hash(_metals));

@override
String toString() {
  return 'RatesDoc(indices: $indices, world: $world, currencies: $currencies, metals: $metals)';
}


}

/// @nodoc
abstract mixin class _$RatesDocCopyWith<$Res> implements $RatesDocCopyWith<$Res> {
  factory _$RatesDocCopyWith(_RatesDoc value, $Res Function(_RatesDoc) _then) = __$RatesDocCopyWithImpl;
@override @useResult
$Res call({
 List<RateRow> indices, List<RateRow> world, List<RateRow> currencies, List<MetalRow> metals
});




}
/// @nodoc
class __$RatesDocCopyWithImpl<$Res>
    implements _$RatesDocCopyWith<$Res> {
  __$RatesDocCopyWithImpl(this._self, this._then);

  final _RatesDoc _self;
  final $Res Function(_RatesDoc) _then;

/// Create a copy of RatesDoc
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? indices = null,Object? world = null,Object? currencies = null,Object? metals = null,}) {
  return _then(_RatesDoc(
indices: null == indices ? _self._indices : indices // ignore: cast_nullable_to_non_nullable
as List<RateRow>,world: null == world ? _self._world : world // ignore: cast_nullable_to_non_nullable
as List<RateRow>,currencies: null == currencies ? _self._currencies : currencies // ignore: cast_nullable_to_non_nullable
as List<RateRow>,metals: null == metals ? _self._metals : metals // ignore: cast_nullable_to_non_nullable
as List<MetalRow>,
  ));
}


}


/// @nodoc
mixin _$RateRow {

 String get id; String get code; String get label; String get plain; String get token; String get workings; String get yardstick; String get source; double? get level;@JsonKey(name: 'change_percent') double? get changePercent; double? get egp;
/// Create a copy of RateRow
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RateRowCopyWith<RateRow> get copyWith => _$RateRowCopyWithImpl<RateRow>(this as RateRow, _$identity);

  /// Serializes this RateRow to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RateRow&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code)&&(identical(other.label, label) || other.label == label)&&(identical(other.plain, plain) || other.plain == plain)&&(identical(other.token, token) || other.token == token)&&(identical(other.workings, workings) || other.workings == workings)&&(identical(other.yardstick, yardstick) || other.yardstick == yardstick)&&(identical(other.source, source) || other.source == source)&&(identical(other.level, level) || other.level == level)&&(identical(other.changePercent, changePercent) || other.changePercent == changePercent)&&(identical(other.egp, egp) || other.egp == egp));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,code,label,plain,token,workings,yardstick,source,level,changePercent,egp);

@override
String toString() {
  return 'RateRow(id: $id, code: $code, label: $label, plain: $plain, token: $token, workings: $workings, yardstick: $yardstick, source: $source, level: $level, changePercent: $changePercent, egp: $egp)';
}


}

/// @nodoc
abstract mixin class $RateRowCopyWith<$Res>  {
  factory $RateRowCopyWith(RateRow value, $Res Function(RateRow) _then) = _$RateRowCopyWithImpl;
@useResult
$Res call({
 String id, String code, String label, String plain, String token, String workings, String yardstick, String source, double? level,@JsonKey(name: 'change_percent') double? changePercent, double? egp
});




}
/// @nodoc
class _$RateRowCopyWithImpl<$Res>
    implements $RateRowCopyWith<$Res> {
  _$RateRowCopyWithImpl(this._self, this._then);

  final RateRow _self;
  final $Res Function(RateRow) _then;

/// Create a copy of RateRow
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? code = null,Object? label = null,Object? plain = null,Object? token = null,Object? workings = null,Object? yardstick = null,Object? source = null,Object? level = freezed,Object? changePercent = freezed,Object? egp = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,plain: null == plain ? _self.plain : plain // ignore: cast_nullable_to_non_nullable
as String,token: null == token ? _self.token : token // ignore: cast_nullable_to_non_nullable
as String,workings: null == workings ? _self.workings : workings // ignore: cast_nullable_to_non_nullable
as String,yardstick: null == yardstick ? _self.yardstick : yardstick // ignore: cast_nullable_to_non_nullable
as String,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String,level: freezed == level ? _self.level : level // ignore: cast_nullable_to_non_nullable
as double?,changePercent: freezed == changePercent ? _self.changePercent : changePercent // ignore: cast_nullable_to_non_nullable
as double?,egp: freezed == egp ? _self.egp : egp // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [RateRow].
extension RateRowPatterns on RateRow {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RateRow value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RateRow() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RateRow value)  $default,){
final _that = this;
switch (_that) {
case _RateRow():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RateRow value)?  $default,){
final _that = this;
switch (_that) {
case _RateRow() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String code,  String label,  String plain,  String token,  String workings,  String yardstick,  String source,  double? level, @JsonKey(name: 'change_percent')  double? changePercent,  double? egp)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RateRow() when $default != null:
return $default(_that.id,_that.code,_that.label,_that.plain,_that.token,_that.workings,_that.yardstick,_that.source,_that.level,_that.changePercent,_that.egp);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String code,  String label,  String plain,  String token,  String workings,  String yardstick,  String source,  double? level, @JsonKey(name: 'change_percent')  double? changePercent,  double? egp)  $default,) {final _that = this;
switch (_that) {
case _RateRow():
return $default(_that.id,_that.code,_that.label,_that.plain,_that.token,_that.workings,_that.yardstick,_that.source,_that.level,_that.changePercent,_that.egp);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String code,  String label,  String plain,  String token,  String workings,  String yardstick,  String source,  double? level, @JsonKey(name: 'change_percent')  double? changePercent,  double? egp)?  $default,) {final _that = this;
switch (_that) {
case _RateRow() when $default != null:
return $default(_that.id,_that.code,_that.label,_that.plain,_that.token,_that.workings,_that.yardstick,_that.source,_that.level,_that.changePercent,_that.egp);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RateRow implements RateRow {
  const _RateRow({this.id = '', this.code = '', this.label = '', this.plain = '', this.token = '', this.workings = '', this.yardstick = '', this.source = '', this.level, @JsonKey(name: 'change_percent') this.changePercent, this.egp});
  factory _RateRow.fromJson(Map<String, dynamic> json) => _$RateRowFromJson(json);

@override@JsonKey() final  String id;
@override@JsonKey() final  String code;
@override@JsonKey() final  String label;
@override@JsonKey() final  String plain;
@override@JsonKey() final  String token;
@override@JsonKey() final  String workings;
@override@JsonKey() final  String yardstick;
@override@JsonKey() final  String source;
@override final  double? level;
@override@JsonKey(name: 'change_percent') final  double? changePercent;
@override final  double? egp;

/// Create a copy of RateRow
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RateRowCopyWith<_RateRow> get copyWith => __$RateRowCopyWithImpl<_RateRow>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RateRowToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RateRow&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code)&&(identical(other.label, label) || other.label == label)&&(identical(other.plain, plain) || other.plain == plain)&&(identical(other.token, token) || other.token == token)&&(identical(other.workings, workings) || other.workings == workings)&&(identical(other.yardstick, yardstick) || other.yardstick == yardstick)&&(identical(other.source, source) || other.source == source)&&(identical(other.level, level) || other.level == level)&&(identical(other.changePercent, changePercent) || other.changePercent == changePercent)&&(identical(other.egp, egp) || other.egp == egp));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,code,label,plain,token,workings,yardstick,source,level,changePercent,egp);

@override
String toString() {
  return 'RateRow(id: $id, code: $code, label: $label, plain: $plain, token: $token, workings: $workings, yardstick: $yardstick, source: $source, level: $level, changePercent: $changePercent, egp: $egp)';
}


}

/// @nodoc
abstract mixin class _$RateRowCopyWith<$Res> implements $RateRowCopyWith<$Res> {
  factory _$RateRowCopyWith(_RateRow value, $Res Function(_RateRow) _then) = __$RateRowCopyWithImpl;
@override @useResult
$Res call({
 String id, String code, String label, String plain, String token, String workings, String yardstick, String source, double? level,@JsonKey(name: 'change_percent') double? changePercent, double? egp
});




}
/// @nodoc
class __$RateRowCopyWithImpl<$Res>
    implements _$RateRowCopyWith<$Res> {
  __$RateRowCopyWithImpl(this._self, this._then);

  final _RateRow _self;
  final $Res Function(_RateRow) _then;

/// Create a copy of RateRow
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? code = null,Object? label = null,Object? plain = null,Object? token = null,Object? workings = null,Object? yardstick = null,Object? source = null,Object? level = freezed,Object? changePercent = freezed,Object? egp = freezed,}) {
  return _then(_RateRow(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,plain: null == plain ? _self.plain : plain // ignore: cast_nullable_to_non_nullable
as String,token: null == token ? _self.token : token // ignore: cast_nullable_to_non_nullable
as String,workings: null == workings ? _self.workings : workings // ignore: cast_nullable_to_non_nullable
as String,yardstick: null == yardstick ? _self.yardstick : yardstick // ignore: cast_nullable_to_non_nullable
as String,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String,level: freezed == level ? _self.level : level // ignore: cast_nullable_to_non_nullable
as double?,changePercent: freezed == changePercent ? _self.changePercent : changePercent // ignore: cast_nullable_to_non_nullable
as double?,egp: freezed == egp ? _self.egp : egp // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}


/// @nodoc
mixin _$MetalRow {

 String get id; String get label; String get plain; String get token; String get workings; String get yardstick; String get source;@JsonKey(name: 'egp_gram') double? get egpGram;@JsonKey(name: 'egp_ounce') double? get egpOunce;@JsonKey(name: 'usd_ounce') double? get usdOunce;/// 24, 21 and 18 karat, each with the purity sum that produced it. Only
/// gold carries these; silver is sold by weight, not by karat.
 List<KaratRow> get karats;
/// Create a copy of MetalRow
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MetalRowCopyWith<MetalRow> get copyWith => _$MetalRowCopyWithImpl<MetalRow>(this as MetalRow, _$identity);

  /// Serializes this MetalRow to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MetalRow&&(identical(other.id, id) || other.id == id)&&(identical(other.label, label) || other.label == label)&&(identical(other.plain, plain) || other.plain == plain)&&(identical(other.token, token) || other.token == token)&&(identical(other.workings, workings) || other.workings == workings)&&(identical(other.yardstick, yardstick) || other.yardstick == yardstick)&&(identical(other.source, source) || other.source == source)&&(identical(other.egpGram, egpGram) || other.egpGram == egpGram)&&(identical(other.egpOunce, egpOunce) || other.egpOunce == egpOunce)&&(identical(other.usdOunce, usdOunce) || other.usdOunce == usdOunce)&&const DeepCollectionEquality().equals(other.karats, karats));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,label,plain,token,workings,yardstick,source,egpGram,egpOunce,usdOunce,const DeepCollectionEquality().hash(karats));

@override
String toString() {
  return 'MetalRow(id: $id, label: $label, plain: $plain, token: $token, workings: $workings, yardstick: $yardstick, source: $source, egpGram: $egpGram, egpOunce: $egpOunce, usdOunce: $usdOunce, karats: $karats)';
}


}

/// @nodoc
abstract mixin class $MetalRowCopyWith<$Res>  {
  factory $MetalRowCopyWith(MetalRow value, $Res Function(MetalRow) _then) = _$MetalRowCopyWithImpl;
@useResult
$Res call({
 String id, String label, String plain, String token, String workings, String yardstick, String source,@JsonKey(name: 'egp_gram') double? egpGram,@JsonKey(name: 'egp_ounce') double? egpOunce,@JsonKey(name: 'usd_ounce') double? usdOunce, List<KaratRow> karats
});




}
/// @nodoc
class _$MetalRowCopyWithImpl<$Res>
    implements $MetalRowCopyWith<$Res> {
  _$MetalRowCopyWithImpl(this._self, this._then);

  final MetalRow _self;
  final $Res Function(MetalRow) _then;

/// Create a copy of MetalRow
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? label = null,Object? plain = null,Object? token = null,Object? workings = null,Object? yardstick = null,Object? source = null,Object? egpGram = freezed,Object? egpOunce = freezed,Object? usdOunce = freezed,Object? karats = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,plain: null == plain ? _self.plain : plain // ignore: cast_nullable_to_non_nullable
as String,token: null == token ? _self.token : token // ignore: cast_nullable_to_non_nullable
as String,workings: null == workings ? _self.workings : workings // ignore: cast_nullable_to_non_nullable
as String,yardstick: null == yardstick ? _self.yardstick : yardstick // ignore: cast_nullable_to_non_nullable
as String,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String,egpGram: freezed == egpGram ? _self.egpGram : egpGram // ignore: cast_nullable_to_non_nullable
as double?,egpOunce: freezed == egpOunce ? _self.egpOunce : egpOunce // ignore: cast_nullable_to_non_nullable
as double?,usdOunce: freezed == usdOunce ? _self.usdOunce : usdOunce // ignore: cast_nullable_to_non_nullable
as double?,karats: null == karats ? _self.karats : karats // ignore: cast_nullable_to_non_nullable
as List<KaratRow>,
  ));
}

}


/// Adds pattern-matching-related methods to [MetalRow].
extension MetalRowPatterns on MetalRow {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MetalRow value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MetalRow() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MetalRow value)  $default,){
final _that = this;
switch (_that) {
case _MetalRow():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MetalRow value)?  $default,){
final _that = this;
switch (_that) {
case _MetalRow() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String label,  String plain,  String token,  String workings,  String yardstick,  String source, @JsonKey(name: 'egp_gram')  double? egpGram, @JsonKey(name: 'egp_ounce')  double? egpOunce, @JsonKey(name: 'usd_ounce')  double? usdOunce,  List<KaratRow> karats)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MetalRow() when $default != null:
return $default(_that.id,_that.label,_that.plain,_that.token,_that.workings,_that.yardstick,_that.source,_that.egpGram,_that.egpOunce,_that.usdOunce,_that.karats);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String label,  String plain,  String token,  String workings,  String yardstick,  String source, @JsonKey(name: 'egp_gram')  double? egpGram, @JsonKey(name: 'egp_ounce')  double? egpOunce, @JsonKey(name: 'usd_ounce')  double? usdOunce,  List<KaratRow> karats)  $default,) {final _that = this;
switch (_that) {
case _MetalRow():
return $default(_that.id,_that.label,_that.plain,_that.token,_that.workings,_that.yardstick,_that.source,_that.egpGram,_that.egpOunce,_that.usdOunce,_that.karats);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String label,  String plain,  String token,  String workings,  String yardstick,  String source, @JsonKey(name: 'egp_gram')  double? egpGram, @JsonKey(name: 'egp_ounce')  double? egpOunce, @JsonKey(name: 'usd_ounce')  double? usdOunce,  List<KaratRow> karats)?  $default,) {final _that = this;
switch (_that) {
case _MetalRow() when $default != null:
return $default(_that.id,_that.label,_that.plain,_that.token,_that.workings,_that.yardstick,_that.source,_that.egpGram,_that.egpOunce,_that.usdOunce,_that.karats);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MetalRow implements MetalRow {
  const _MetalRow({this.id = '', this.label = '', this.plain = '', this.token = '', this.workings = '', this.yardstick = '', this.source = '', @JsonKey(name: 'egp_gram') this.egpGram, @JsonKey(name: 'egp_ounce') this.egpOunce, @JsonKey(name: 'usd_ounce') this.usdOunce, final  List<KaratRow> karats = const <KaratRow>[]}): _karats = karats;
  factory _MetalRow.fromJson(Map<String, dynamic> json) => _$MetalRowFromJson(json);

@override@JsonKey() final  String id;
@override@JsonKey() final  String label;
@override@JsonKey() final  String plain;
@override@JsonKey() final  String token;
@override@JsonKey() final  String workings;
@override@JsonKey() final  String yardstick;
@override@JsonKey() final  String source;
@override@JsonKey(name: 'egp_gram') final  double? egpGram;
@override@JsonKey(name: 'egp_ounce') final  double? egpOunce;
@override@JsonKey(name: 'usd_ounce') final  double? usdOunce;
/// 24, 21 and 18 karat, each with the purity sum that produced it. Only
/// gold carries these; silver is sold by weight, not by karat.
 final  List<KaratRow> _karats;
/// 24, 21 and 18 karat, each with the purity sum that produced it. Only
/// gold carries these; silver is sold by weight, not by karat.
@override@JsonKey() List<KaratRow> get karats {
  if (_karats is EqualUnmodifiableListView) return _karats;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_karats);
}


/// Create a copy of MetalRow
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MetalRowCopyWith<_MetalRow> get copyWith => __$MetalRowCopyWithImpl<_MetalRow>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MetalRowToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MetalRow&&(identical(other.id, id) || other.id == id)&&(identical(other.label, label) || other.label == label)&&(identical(other.plain, plain) || other.plain == plain)&&(identical(other.token, token) || other.token == token)&&(identical(other.workings, workings) || other.workings == workings)&&(identical(other.yardstick, yardstick) || other.yardstick == yardstick)&&(identical(other.source, source) || other.source == source)&&(identical(other.egpGram, egpGram) || other.egpGram == egpGram)&&(identical(other.egpOunce, egpOunce) || other.egpOunce == egpOunce)&&(identical(other.usdOunce, usdOunce) || other.usdOunce == usdOunce)&&const DeepCollectionEquality().equals(other._karats, _karats));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,label,plain,token,workings,yardstick,source,egpGram,egpOunce,usdOunce,const DeepCollectionEquality().hash(_karats));

@override
String toString() {
  return 'MetalRow(id: $id, label: $label, plain: $plain, token: $token, workings: $workings, yardstick: $yardstick, source: $source, egpGram: $egpGram, egpOunce: $egpOunce, usdOunce: $usdOunce, karats: $karats)';
}


}

/// @nodoc
abstract mixin class _$MetalRowCopyWith<$Res> implements $MetalRowCopyWith<$Res> {
  factory _$MetalRowCopyWith(_MetalRow value, $Res Function(_MetalRow) _then) = __$MetalRowCopyWithImpl;
@override @useResult
$Res call({
 String id, String label, String plain, String token, String workings, String yardstick, String source,@JsonKey(name: 'egp_gram') double? egpGram,@JsonKey(name: 'egp_ounce') double? egpOunce,@JsonKey(name: 'usd_ounce') double? usdOunce, List<KaratRow> karats
});




}
/// @nodoc
class __$MetalRowCopyWithImpl<$Res>
    implements _$MetalRowCopyWith<$Res> {
  __$MetalRowCopyWithImpl(this._self, this._then);

  final _MetalRow _self;
  final $Res Function(_MetalRow) _then;

/// Create a copy of MetalRow
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? label = null,Object? plain = null,Object? token = null,Object? workings = null,Object? yardstick = null,Object? source = null,Object? egpGram = freezed,Object? egpOunce = freezed,Object? usdOunce = freezed,Object? karats = null,}) {
  return _then(_MetalRow(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,plain: null == plain ? _self.plain : plain // ignore: cast_nullable_to_non_nullable
as String,token: null == token ? _self.token : token // ignore: cast_nullable_to_non_nullable
as String,workings: null == workings ? _self.workings : workings // ignore: cast_nullable_to_non_nullable
as String,yardstick: null == yardstick ? _self.yardstick : yardstick // ignore: cast_nullable_to_non_nullable
as String,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String,egpGram: freezed == egpGram ? _self.egpGram : egpGram // ignore: cast_nullable_to_non_nullable
as double?,egpOunce: freezed == egpOunce ? _self.egpOunce : egpOunce // ignore: cast_nullable_to_non_nullable
as double?,usdOunce: freezed == usdOunce ? _self.usdOunce : usdOunce // ignore: cast_nullable_to_non_nullable
as double?,karats: null == karats ? _self._karats : karats // ignore: cast_nullable_to_non_nullable
as List<KaratRow>,
  ));
}


}


/// @nodoc
mixin _$KaratRow {

 int get karat;@JsonKey(name: 'egp_gram') double get egpGram; String get workings;
/// Create a copy of KaratRow
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$KaratRowCopyWith<KaratRow> get copyWith => _$KaratRowCopyWithImpl<KaratRow>(this as KaratRow, _$identity);

  /// Serializes this KaratRow to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is KaratRow&&(identical(other.karat, karat) || other.karat == karat)&&(identical(other.egpGram, egpGram) || other.egpGram == egpGram)&&(identical(other.workings, workings) || other.workings == workings));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,karat,egpGram,workings);

@override
String toString() {
  return 'KaratRow(karat: $karat, egpGram: $egpGram, workings: $workings)';
}


}

/// @nodoc
abstract mixin class $KaratRowCopyWith<$Res>  {
  factory $KaratRowCopyWith(KaratRow value, $Res Function(KaratRow) _then) = _$KaratRowCopyWithImpl;
@useResult
$Res call({
 int karat,@JsonKey(name: 'egp_gram') double egpGram, String workings
});




}
/// @nodoc
class _$KaratRowCopyWithImpl<$Res>
    implements $KaratRowCopyWith<$Res> {
  _$KaratRowCopyWithImpl(this._self, this._then);

  final KaratRow _self;
  final $Res Function(KaratRow) _then;

/// Create a copy of KaratRow
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? karat = null,Object? egpGram = null,Object? workings = null,}) {
  return _then(_self.copyWith(
karat: null == karat ? _self.karat : karat // ignore: cast_nullable_to_non_nullable
as int,egpGram: null == egpGram ? _self.egpGram : egpGram // ignore: cast_nullable_to_non_nullable
as double,workings: null == workings ? _self.workings : workings // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [KaratRow].
extension KaratRowPatterns on KaratRow {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _KaratRow value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _KaratRow() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _KaratRow value)  $default,){
final _that = this;
switch (_that) {
case _KaratRow():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _KaratRow value)?  $default,){
final _that = this;
switch (_that) {
case _KaratRow() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int karat, @JsonKey(name: 'egp_gram')  double egpGram,  String workings)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _KaratRow() when $default != null:
return $default(_that.karat,_that.egpGram,_that.workings);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int karat, @JsonKey(name: 'egp_gram')  double egpGram,  String workings)  $default,) {final _that = this;
switch (_that) {
case _KaratRow():
return $default(_that.karat,_that.egpGram,_that.workings);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int karat, @JsonKey(name: 'egp_gram')  double egpGram,  String workings)?  $default,) {final _that = this;
switch (_that) {
case _KaratRow() when $default != null:
return $default(_that.karat,_that.egpGram,_that.workings);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _KaratRow implements KaratRow {
  const _KaratRow({this.karat = 24, @JsonKey(name: 'egp_gram') this.egpGram = 0, this.workings = ''});
  factory _KaratRow.fromJson(Map<String, dynamic> json) => _$KaratRowFromJson(json);

@override@JsonKey() final  int karat;
@override@JsonKey(name: 'egp_gram') final  double egpGram;
@override@JsonKey() final  String workings;

/// Create a copy of KaratRow
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$KaratRowCopyWith<_KaratRow> get copyWith => __$KaratRowCopyWithImpl<_KaratRow>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$KaratRowToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _KaratRow&&(identical(other.karat, karat) || other.karat == karat)&&(identical(other.egpGram, egpGram) || other.egpGram == egpGram)&&(identical(other.workings, workings) || other.workings == workings));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,karat,egpGram,workings);

@override
String toString() {
  return 'KaratRow(karat: $karat, egpGram: $egpGram, workings: $workings)';
}


}

/// @nodoc
abstract mixin class _$KaratRowCopyWith<$Res> implements $KaratRowCopyWith<$Res> {
  factory _$KaratRowCopyWith(_KaratRow value, $Res Function(_KaratRow) _then) = __$KaratRowCopyWithImpl;
@override @useResult
$Res call({
 int karat,@JsonKey(name: 'egp_gram') double egpGram, String workings
});




}
/// @nodoc
class __$KaratRowCopyWithImpl<$Res>
    implements _$KaratRowCopyWith<$Res> {
  __$KaratRowCopyWithImpl(this._self, this._then);

  final _KaratRow _self;
  final $Res Function(_KaratRow) _then;

/// Create a copy of KaratRow
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? karat = null,Object? egpGram = null,Object? workings = null,}) {
  return _then(_KaratRow(
karat: null == karat ? _self.karat : karat // ignore: cast_nullable_to_non_nullable
as int,egpGram: null == egpGram ? _self.egpGram : egpGram // ignore: cast_nullable_to_non_nullable
as double,workings: null == workings ? _self.workings : workings // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
