// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'macro.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MacroDoc {

@JsonKey(name: 'updated_at') String? get updatedAt; List<MacroSeries> get series; List<MacroIndicator> get indicators; List<MacroCorrelation> get correlations;/// Sources that could not be reached. Published rather than hidden: a
/// missing source is a fact about the document, and a screen that quietly
/// shrinks is lying by omission.
 List<String> get unavailable;
/// Create a copy of MacroDoc
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MacroDocCopyWith<MacroDoc> get copyWith => _$MacroDocCopyWithImpl<MacroDoc>(this as MacroDoc, _$identity);

  /// Serializes this MacroDoc to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MacroDoc&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&const DeepCollectionEquality().equals(other.series, series)&&const DeepCollectionEquality().equals(other.indicators, indicators)&&const DeepCollectionEquality().equals(other.correlations, correlations)&&const DeepCollectionEquality().equals(other.unavailable, unavailable));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,updatedAt,const DeepCollectionEquality().hash(series),const DeepCollectionEquality().hash(indicators),const DeepCollectionEquality().hash(correlations),const DeepCollectionEquality().hash(unavailable));

@override
String toString() {
  return 'MacroDoc(updatedAt: $updatedAt, series: $series, indicators: $indicators, correlations: $correlations, unavailable: $unavailable)';
}


}

/// @nodoc
abstract mixin class $MacroDocCopyWith<$Res>  {
  factory $MacroDocCopyWith(MacroDoc value, $Res Function(MacroDoc) _then) = _$MacroDocCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'updated_at') String? updatedAt, List<MacroSeries> series, List<MacroIndicator> indicators, List<MacroCorrelation> correlations, List<String> unavailable
});




}
/// @nodoc
class _$MacroDocCopyWithImpl<$Res>
    implements $MacroDocCopyWith<$Res> {
  _$MacroDocCopyWithImpl(this._self, this._then);

  final MacroDoc _self;
  final $Res Function(MacroDoc) _then;

/// Create a copy of MacroDoc
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? updatedAt = freezed,Object? series = null,Object? indicators = null,Object? correlations = null,Object? unavailable = null,}) {
  return _then(_self.copyWith(
updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,series: null == series ? _self.series : series // ignore: cast_nullable_to_non_nullable
as List<MacroSeries>,indicators: null == indicators ? _self.indicators : indicators // ignore: cast_nullable_to_non_nullable
as List<MacroIndicator>,correlations: null == correlations ? _self.correlations : correlations // ignore: cast_nullable_to_non_nullable
as List<MacroCorrelation>,unavailable: null == unavailable ? _self.unavailable : unavailable // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}

}


/// Adds pattern-matching-related methods to [MacroDoc].
extension MacroDocPatterns on MacroDoc {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MacroDoc value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MacroDoc() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MacroDoc value)  $default,){
final _that = this;
switch (_that) {
case _MacroDoc():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MacroDoc value)?  $default,){
final _that = this;
switch (_that) {
case _MacroDoc() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'updated_at')  String? updatedAt,  List<MacroSeries> series,  List<MacroIndicator> indicators,  List<MacroCorrelation> correlations,  List<String> unavailable)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MacroDoc() when $default != null:
return $default(_that.updatedAt,_that.series,_that.indicators,_that.correlations,_that.unavailable);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'updated_at')  String? updatedAt,  List<MacroSeries> series,  List<MacroIndicator> indicators,  List<MacroCorrelation> correlations,  List<String> unavailable)  $default,) {final _that = this;
switch (_that) {
case _MacroDoc():
return $default(_that.updatedAt,_that.series,_that.indicators,_that.correlations,_that.unavailable);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'updated_at')  String? updatedAt,  List<MacroSeries> series,  List<MacroIndicator> indicators,  List<MacroCorrelation> correlations,  List<String> unavailable)?  $default,) {final _that = this;
switch (_that) {
case _MacroDoc() when $default != null:
return $default(_that.updatedAt,_that.series,_that.indicators,_that.correlations,_that.unavailable);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MacroDoc extends MacroDoc {
  const _MacroDoc({@JsonKey(name: 'updated_at') this.updatedAt, final  List<MacroSeries> series = const <MacroSeries>[], final  List<MacroIndicator> indicators = const <MacroIndicator>[], final  List<MacroCorrelation> correlations = const <MacroCorrelation>[], final  List<String> unavailable = const <String>[]}): _series = series,_indicators = indicators,_correlations = correlations,_unavailable = unavailable,super._();
  factory _MacroDoc.fromJson(Map<String, dynamic> json) => _$MacroDocFromJson(json);

@override@JsonKey(name: 'updated_at') final  String? updatedAt;
 final  List<MacroSeries> _series;
@override@JsonKey() List<MacroSeries> get series {
  if (_series is EqualUnmodifiableListView) return _series;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_series);
}

 final  List<MacroIndicator> _indicators;
@override@JsonKey() List<MacroIndicator> get indicators {
  if (_indicators is EqualUnmodifiableListView) return _indicators;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_indicators);
}

 final  List<MacroCorrelation> _correlations;
@override@JsonKey() List<MacroCorrelation> get correlations {
  if (_correlations is EqualUnmodifiableListView) return _correlations;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_correlations);
}

/// Sources that could not be reached. Published rather than hidden: a
/// missing source is a fact about the document, and a screen that quietly
/// shrinks is lying by omission.
 final  List<String> _unavailable;
/// Sources that could not be reached. Published rather than hidden: a
/// missing source is a fact about the document, and a screen that quietly
/// shrinks is lying by omission.
@override@JsonKey() List<String> get unavailable {
  if (_unavailable is EqualUnmodifiableListView) return _unavailable;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_unavailable);
}


/// Create a copy of MacroDoc
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MacroDocCopyWith<_MacroDoc> get copyWith => __$MacroDocCopyWithImpl<_MacroDoc>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MacroDocToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MacroDoc&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&const DeepCollectionEquality().equals(other._series, _series)&&const DeepCollectionEquality().equals(other._indicators, _indicators)&&const DeepCollectionEquality().equals(other._correlations, _correlations)&&const DeepCollectionEquality().equals(other._unavailable, _unavailable));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,updatedAt,const DeepCollectionEquality().hash(_series),const DeepCollectionEquality().hash(_indicators),const DeepCollectionEquality().hash(_correlations),const DeepCollectionEquality().hash(_unavailable));

@override
String toString() {
  return 'MacroDoc(updatedAt: $updatedAt, series: $series, indicators: $indicators, correlations: $correlations, unavailable: $unavailable)';
}


}

/// @nodoc
abstract mixin class _$MacroDocCopyWith<$Res> implements $MacroDocCopyWith<$Res> {
  factory _$MacroDocCopyWith(_MacroDoc value, $Res Function(_MacroDoc) _then) = __$MacroDocCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'updated_at') String? updatedAt, List<MacroSeries> series, List<MacroIndicator> indicators, List<MacroCorrelation> correlations, List<String> unavailable
});




}
/// @nodoc
class __$MacroDocCopyWithImpl<$Res>
    implements _$MacroDocCopyWith<$Res> {
  __$MacroDocCopyWithImpl(this._self, this._then);

  final _MacroDoc _self;
  final $Res Function(_MacroDoc) _then;

/// Create a copy of MacroDoc
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? updatedAt = freezed,Object? series = null,Object? indicators = null,Object? correlations = null,Object? unavailable = null,}) {
  return _then(_MacroDoc(
updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,series: null == series ? _self._series : series // ignore: cast_nullable_to_non_nullable
as List<MacroSeries>,indicators: null == indicators ? _self._indicators : indicators // ignore: cast_nullable_to_non_nullable
as List<MacroIndicator>,correlations: null == correlations ? _self._correlations : correlations // ignore: cast_nullable_to_non_nullable
as List<MacroCorrelation>,unavailable: null == unavailable ? _self._unavailable : unavailable // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}


}


/// @nodoc
mixin _$MacroSeries {

 String get id; String get label;@JsonKey(name: 'label_ar') String get labelAr;/// One sentence: what this is, for somebody who is not a trader.
 String get meaning;@JsonKey(name: 'meaning_ar') String get meaningAr;/// How it reaches an Egyptian share, step by published step.
 String get chain;@JsonKey(name: 'chain_ar') String get chainAr;/// A model's line about *this* reading, when one was drafted and passed
/// review. Absent far more often than not — the glossary above is the
/// floor and this only ever sits on top of it.
 String? get insight; String get unit;@JsonKey(name: 'as_of') String get asOf; double get latest; double? get previous; List<MacroPoint> get history; String get source;
/// Create a copy of MacroSeries
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MacroSeriesCopyWith<MacroSeries> get copyWith => _$MacroSeriesCopyWithImpl<MacroSeries>(this as MacroSeries, _$identity);

  /// Serializes this MacroSeries to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MacroSeries&&(identical(other.id, id) || other.id == id)&&(identical(other.label, label) || other.label == label)&&(identical(other.labelAr, labelAr) || other.labelAr == labelAr)&&(identical(other.meaning, meaning) || other.meaning == meaning)&&(identical(other.meaningAr, meaningAr) || other.meaningAr == meaningAr)&&(identical(other.chain, chain) || other.chain == chain)&&(identical(other.chainAr, chainAr) || other.chainAr == chainAr)&&(identical(other.insight, insight) || other.insight == insight)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.asOf, asOf) || other.asOf == asOf)&&(identical(other.latest, latest) || other.latest == latest)&&(identical(other.previous, previous) || other.previous == previous)&&const DeepCollectionEquality().equals(other.history, history)&&(identical(other.source, source) || other.source == source));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,label,labelAr,meaning,meaningAr,chain,chainAr,insight,unit,asOf,latest,previous,const DeepCollectionEquality().hash(history),source);

@override
String toString() {
  return 'MacroSeries(id: $id, label: $label, labelAr: $labelAr, meaning: $meaning, meaningAr: $meaningAr, chain: $chain, chainAr: $chainAr, insight: $insight, unit: $unit, asOf: $asOf, latest: $latest, previous: $previous, history: $history, source: $source)';
}


}

/// @nodoc
abstract mixin class $MacroSeriesCopyWith<$Res>  {
  factory $MacroSeriesCopyWith(MacroSeries value, $Res Function(MacroSeries) _then) = _$MacroSeriesCopyWithImpl;
@useResult
$Res call({
 String id, String label,@JsonKey(name: 'label_ar') String labelAr, String meaning,@JsonKey(name: 'meaning_ar') String meaningAr, String chain,@JsonKey(name: 'chain_ar') String chainAr, String? insight, String unit,@JsonKey(name: 'as_of') String asOf, double latest, double? previous, List<MacroPoint> history, String source
});




}
/// @nodoc
class _$MacroSeriesCopyWithImpl<$Res>
    implements $MacroSeriesCopyWith<$Res> {
  _$MacroSeriesCopyWithImpl(this._self, this._then);

  final MacroSeries _self;
  final $Res Function(MacroSeries) _then;

/// Create a copy of MacroSeries
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? label = null,Object? labelAr = null,Object? meaning = null,Object? meaningAr = null,Object? chain = null,Object? chainAr = null,Object? insight = freezed,Object? unit = null,Object? asOf = null,Object? latest = null,Object? previous = freezed,Object? history = null,Object? source = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,labelAr: null == labelAr ? _self.labelAr : labelAr // ignore: cast_nullable_to_non_nullable
as String,meaning: null == meaning ? _self.meaning : meaning // ignore: cast_nullable_to_non_nullable
as String,meaningAr: null == meaningAr ? _self.meaningAr : meaningAr // ignore: cast_nullable_to_non_nullable
as String,chain: null == chain ? _self.chain : chain // ignore: cast_nullable_to_non_nullable
as String,chainAr: null == chainAr ? _self.chainAr : chainAr // ignore: cast_nullable_to_non_nullable
as String,insight: freezed == insight ? _self.insight : insight // ignore: cast_nullable_to_non_nullable
as String?,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as String,asOf: null == asOf ? _self.asOf : asOf // ignore: cast_nullable_to_non_nullable
as String,latest: null == latest ? _self.latest : latest // ignore: cast_nullable_to_non_nullable
as double,previous: freezed == previous ? _self.previous : previous // ignore: cast_nullable_to_non_nullable
as double?,history: null == history ? _self.history : history // ignore: cast_nullable_to_non_nullable
as List<MacroPoint>,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [MacroSeries].
extension MacroSeriesPatterns on MacroSeries {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MacroSeries value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MacroSeries() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MacroSeries value)  $default,){
final _that = this;
switch (_that) {
case _MacroSeries():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MacroSeries value)?  $default,){
final _that = this;
switch (_that) {
case _MacroSeries() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String label, @JsonKey(name: 'label_ar')  String labelAr,  String meaning, @JsonKey(name: 'meaning_ar')  String meaningAr,  String chain, @JsonKey(name: 'chain_ar')  String chainAr,  String? insight,  String unit, @JsonKey(name: 'as_of')  String asOf,  double latest,  double? previous,  List<MacroPoint> history,  String source)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MacroSeries() when $default != null:
return $default(_that.id,_that.label,_that.labelAr,_that.meaning,_that.meaningAr,_that.chain,_that.chainAr,_that.insight,_that.unit,_that.asOf,_that.latest,_that.previous,_that.history,_that.source);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String label, @JsonKey(name: 'label_ar')  String labelAr,  String meaning, @JsonKey(name: 'meaning_ar')  String meaningAr,  String chain, @JsonKey(name: 'chain_ar')  String chainAr,  String? insight,  String unit, @JsonKey(name: 'as_of')  String asOf,  double latest,  double? previous,  List<MacroPoint> history,  String source)  $default,) {final _that = this;
switch (_that) {
case _MacroSeries():
return $default(_that.id,_that.label,_that.labelAr,_that.meaning,_that.meaningAr,_that.chain,_that.chainAr,_that.insight,_that.unit,_that.asOf,_that.latest,_that.previous,_that.history,_that.source);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String label, @JsonKey(name: 'label_ar')  String labelAr,  String meaning, @JsonKey(name: 'meaning_ar')  String meaningAr,  String chain, @JsonKey(name: 'chain_ar')  String chainAr,  String? insight,  String unit, @JsonKey(name: 'as_of')  String asOf,  double latest,  double? previous,  List<MacroPoint> history,  String source)?  $default,) {final _that = this;
switch (_that) {
case _MacroSeries() when $default != null:
return $default(_that.id,_that.label,_that.labelAr,_that.meaning,_that.meaningAr,_that.chain,_that.chainAr,_that.insight,_that.unit,_that.asOf,_that.latest,_that.previous,_that.history,_that.source);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MacroSeries extends MacroSeries {
  const _MacroSeries({required this.id, this.label = '', @JsonKey(name: 'label_ar') this.labelAr = '', this.meaning = '', @JsonKey(name: 'meaning_ar') this.meaningAr = '', this.chain = '', @JsonKey(name: 'chain_ar') this.chainAr = '', this.insight, this.unit = '', @JsonKey(name: 'as_of') this.asOf = '', this.latest = 0, this.previous, final  List<MacroPoint> history = const <MacroPoint>[], this.source = ''}): _history = history,super._();
  factory _MacroSeries.fromJson(Map<String, dynamic> json) => _$MacroSeriesFromJson(json);

@override final  String id;
@override@JsonKey() final  String label;
@override@JsonKey(name: 'label_ar') final  String labelAr;
/// One sentence: what this is, for somebody who is not a trader.
@override@JsonKey() final  String meaning;
@override@JsonKey(name: 'meaning_ar') final  String meaningAr;
/// How it reaches an Egyptian share, step by published step.
@override@JsonKey() final  String chain;
@override@JsonKey(name: 'chain_ar') final  String chainAr;
/// A model's line about *this* reading, when one was drafted and passed
/// review. Absent far more often than not — the glossary above is the
/// floor and this only ever sits on top of it.
@override final  String? insight;
@override@JsonKey() final  String unit;
@override@JsonKey(name: 'as_of') final  String asOf;
@override@JsonKey() final  double latest;
@override final  double? previous;
 final  List<MacroPoint> _history;
@override@JsonKey() List<MacroPoint> get history {
  if (_history is EqualUnmodifiableListView) return _history;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_history);
}

@override@JsonKey() final  String source;

/// Create a copy of MacroSeries
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MacroSeriesCopyWith<_MacroSeries> get copyWith => __$MacroSeriesCopyWithImpl<_MacroSeries>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MacroSeriesToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MacroSeries&&(identical(other.id, id) || other.id == id)&&(identical(other.label, label) || other.label == label)&&(identical(other.labelAr, labelAr) || other.labelAr == labelAr)&&(identical(other.meaning, meaning) || other.meaning == meaning)&&(identical(other.meaningAr, meaningAr) || other.meaningAr == meaningAr)&&(identical(other.chain, chain) || other.chain == chain)&&(identical(other.chainAr, chainAr) || other.chainAr == chainAr)&&(identical(other.insight, insight) || other.insight == insight)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.asOf, asOf) || other.asOf == asOf)&&(identical(other.latest, latest) || other.latest == latest)&&(identical(other.previous, previous) || other.previous == previous)&&const DeepCollectionEquality().equals(other._history, _history)&&(identical(other.source, source) || other.source == source));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,label,labelAr,meaning,meaningAr,chain,chainAr,insight,unit,asOf,latest,previous,const DeepCollectionEquality().hash(_history),source);

@override
String toString() {
  return 'MacroSeries(id: $id, label: $label, labelAr: $labelAr, meaning: $meaning, meaningAr: $meaningAr, chain: $chain, chainAr: $chainAr, insight: $insight, unit: $unit, asOf: $asOf, latest: $latest, previous: $previous, history: $history, source: $source)';
}


}

/// @nodoc
abstract mixin class _$MacroSeriesCopyWith<$Res> implements $MacroSeriesCopyWith<$Res> {
  factory _$MacroSeriesCopyWith(_MacroSeries value, $Res Function(_MacroSeries) _then) = __$MacroSeriesCopyWithImpl;
@override @useResult
$Res call({
 String id, String label,@JsonKey(name: 'label_ar') String labelAr, String meaning,@JsonKey(name: 'meaning_ar') String meaningAr, String chain,@JsonKey(name: 'chain_ar') String chainAr, String? insight, String unit,@JsonKey(name: 'as_of') String asOf, double latest, double? previous, List<MacroPoint> history, String source
});




}
/// @nodoc
class __$MacroSeriesCopyWithImpl<$Res>
    implements _$MacroSeriesCopyWith<$Res> {
  __$MacroSeriesCopyWithImpl(this._self, this._then);

  final _MacroSeries _self;
  final $Res Function(_MacroSeries) _then;

/// Create a copy of MacroSeries
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? label = null,Object? labelAr = null,Object? meaning = null,Object? meaningAr = null,Object? chain = null,Object? chainAr = null,Object? insight = freezed,Object? unit = null,Object? asOf = null,Object? latest = null,Object? previous = freezed,Object? history = null,Object? source = null,}) {
  return _then(_MacroSeries(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,labelAr: null == labelAr ? _self.labelAr : labelAr // ignore: cast_nullable_to_non_nullable
as String,meaning: null == meaning ? _self.meaning : meaning // ignore: cast_nullable_to_non_nullable
as String,meaningAr: null == meaningAr ? _self.meaningAr : meaningAr // ignore: cast_nullable_to_non_nullable
as String,chain: null == chain ? _self.chain : chain // ignore: cast_nullable_to_non_nullable
as String,chainAr: null == chainAr ? _self.chainAr : chainAr // ignore: cast_nullable_to_non_nullable
as String,insight: freezed == insight ? _self.insight : insight // ignore: cast_nullable_to_non_nullable
as String?,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as String,asOf: null == asOf ? _self.asOf : asOf // ignore: cast_nullable_to_non_nullable
as String,latest: null == latest ? _self.latest : latest // ignore: cast_nullable_to_non_nullable
as double,previous: freezed == previous ? _self.previous : previous // ignore: cast_nullable_to_non_nullable
as double?,history: null == history ? _self._history : history // ignore: cast_nullable_to_non_nullable
as List<MacroPoint>,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$MacroPoint {

 String get date; double get value;
/// Create a copy of MacroPoint
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MacroPointCopyWith<MacroPoint> get copyWith => _$MacroPointCopyWithImpl<MacroPoint>(this as MacroPoint, _$identity);

  /// Serializes this MacroPoint to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MacroPoint&&(identical(other.date, date) || other.date == date)&&(identical(other.value, value) || other.value == value));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,value);

@override
String toString() {
  return 'MacroPoint(date: $date, value: $value)';
}


}

/// @nodoc
abstract mixin class $MacroPointCopyWith<$Res>  {
  factory $MacroPointCopyWith(MacroPoint value, $Res Function(MacroPoint) _then) = _$MacroPointCopyWithImpl;
@useResult
$Res call({
 String date, double value
});




}
/// @nodoc
class _$MacroPointCopyWithImpl<$Res>
    implements $MacroPointCopyWith<$Res> {
  _$MacroPointCopyWithImpl(this._self, this._then);

  final MacroPoint _self;
  final $Res Function(MacroPoint) _then;

/// Create a copy of MacroPoint
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? value = null,}) {
  return _then(_self.copyWith(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as double,
  ));
}

}


/// Adds pattern-matching-related methods to [MacroPoint].
extension MacroPointPatterns on MacroPoint {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MacroPoint value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MacroPoint() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MacroPoint value)  $default,){
final _that = this;
switch (_that) {
case _MacroPoint():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MacroPoint value)?  $default,){
final _that = this;
switch (_that) {
case _MacroPoint() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  double value)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MacroPoint() when $default != null:
return $default(_that.date,_that.value);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  double value)  $default,) {final _that = this;
switch (_that) {
case _MacroPoint():
return $default(_that.date,_that.value);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  double value)?  $default,) {final _that = this;
switch (_that) {
case _MacroPoint() when $default != null:
return $default(_that.date,_that.value);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MacroPoint implements MacroPoint {
  const _MacroPoint({required this.date, required this.value});
  factory _MacroPoint.fromJson(Map<String, dynamic> json) => _$MacroPointFromJson(json);

@override final  String date;
@override final  double value;

/// Create a copy of MacroPoint
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MacroPointCopyWith<_MacroPoint> get copyWith => __$MacroPointCopyWithImpl<_MacroPoint>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MacroPointToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MacroPoint&&(identical(other.date, date) || other.date == date)&&(identical(other.value, value) || other.value == value));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,value);

@override
String toString() {
  return 'MacroPoint(date: $date, value: $value)';
}


}

/// @nodoc
abstract mixin class _$MacroPointCopyWith<$Res> implements $MacroPointCopyWith<$Res> {
  factory _$MacroPointCopyWith(_MacroPoint value, $Res Function(_MacroPoint) _then) = __$MacroPointCopyWithImpl;
@override @useResult
$Res call({
 String date, double value
});




}
/// @nodoc
class __$MacroPointCopyWithImpl<$Res>
    implements _$MacroPointCopyWith<$Res> {
  __$MacroPointCopyWithImpl(this._self, this._then);

  final _MacroPoint _self;
  final $Res Function(_MacroPoint) _then;

/// Create a copy of MacroPoint
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? value = null,}) {
  return _then(_MacroPoint(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as double,
  ));
}


}


/// @nodoc
mixin _$MacroIndicator {

 String get id; String get label;@JsonKey(name: 'label_ar') String get labelAr; String get meaning;@JsonKey(name: 'meaning_ar') String get meaningAr; String get chain;@JsonKey(name: 'chain_ar') String get chainAr; String get year; double get value; String get source;
/// Create a copy of MacroIndicator
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MacroIndicatorCopyWith<MacroIndicator> get copyWith => _$MacroIndicatorCopyWithImpl<MacroIndicator>(this as MacroIndicator, _$identity);

  /// Serializes this MacroIndicator to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MacroIndicator&&(identical(other.id, id) || other.id == id)&&(identical(other.label, label) || other.label == label)&&(identical(other.labelAr, labelAr) || other.labelAr == labelAr)&&(identical(other.meaning, meaning) || other.meaning == meaning)&&(identical(other.meaningAr, meaningAr) || other.meaningAr == meaningAr)&&(identical(other.chain, chain) || other.chain == chain)&&(identical(other.chainAr, chainAr) || other.chainAr == chainAr)&&(identical(other.year, year) || other.year == year)&&(identical(other.value, value) || other.value == value)&&(identical(other.source, source) || other.source == source));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,label,labelAr,meaning,meaningAr,chain,chainAr,year,value,source);

@override
String toString() {
  return 'MacroIndicator(id: $id, label: $label, labelAr: $labelAr, meaning: $meaning, meaningAr: $meaningAr, chain: $chain, chainAr: $chainAr, year: $year, value: $value, source: $source)';
}


}

/// @nodoc
abstract mixin class $MacroIndicatorCopyWith<$Res>  {
  factory $MacroIndicatorCopyWith(MacroIndicator value, $Res Function(MacroIndicator) _then) = _$MacroIndicatorCopyWithImpl;
@useResult
$Res call({
 String id, String label,@JsonKey(name: 'label_ar') String labelAr, String meaning,@JsonKey(name: 'meaning_ar') String meaningAr, String chain,@JsonKey(name: 'chain_ar') String chainAr, String year, double value, String source
});




}
/// @nodoc
class _$MacroIndicatorCopyWithImpl<$Res>
    implements $MacroIndicatorCopyWith<$Res> {
  _$MacroIndicatorCopyWithImpl(this._self, this._then);

  final MacroIndicator _self;
  final $Res Function(MacroIndicator) _then;

/// Create a copy of MacroIndicator
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? label = null,Object? labelAr = null,Object? meaning = null,Object? meaningAr = null,Object? chain = null,Object? chainAr = null,Object? year = null,Object? value = null,Object? source = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,labelAr: null == labelAr ? _self.labelAr : labelAr // ignore: cast_nullable_to_non_nullable
as String,meaning: null == meaning ? _self.meaning : meaning // ignore: cast_nullable_to_non_nullable
as String,meaningAr: null == meaningAr ? _self.meaningAr : meaningAr // ignore: cast_nullable_to_non_nullable
as String,chain: null == chain ? _self.chain : chain // ignore: cast_nullable_to_non_nullable
as String,chainAr: null == chainAr ? _self.chainAr : chainAr // ignore: cast_nullable_to_non_nullable
as String,year: null == year ? _self.year : year // ignore: cast_nullable_to_non_nullable
as String,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as double,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [MacroIndicator].
extension MacroIndicatorPatterns on MacroIndicator {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MacroIndicator value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MacroIndicator() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MacroIndicator value)  $default,){
final _that = this;
switch (_that) {
case _MacroIndicator():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MacroIndicator value)?  $default,){
final _that = this;
switch (_that) {
case _MacroIndicator() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String label, @JsonKey(name: 'label_ar')  String labelAr,  String meaning, @JsonKey(name: 'meaning_ar')  String meaningAr,  String chain, @JsonKey(name: 'chain_ar')  String chainAr,  String year,  double value,  String source)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MacroIndicator() when $default != null:
return $default(_that.id,_that.label,_that.labelAr,_that.meaning,_that.meaningAr,_that.chain,_that.chainAr,_that.year,_that.value,_that.source);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String label, @JsonKey(name: 'label_ar')  String labelAr,  String meaning, @JsonKey(name: 'meaning_ar')  String meaningAr,  String chain, @JsonKey(name: 'chain_ar')  String chainAr,  String year,  double value,  String source)  $default,) {final _that = this;
switch (_that) {
case _MacroIndicator():
return $default(_that.id,_that.label,_that.labelAr,_that.meaning,_that.meaningAr,_that.chain,_that.chainAr,_that.year,_that.value,_that.source);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String label, @JsonKey(name: 'label_ar')  String labelAr,  String meaning, @JsonKey(name: 'meaning_ar')  String meaningAr,  String chain, @JsonKey(name: 'chain_ar')  String chainAr,  String year,  double value,  String source)?  $default,) {final _that = this;
switch (_that) {
case _MacroIndicator() when $default != null:
return $default(_that.id,_that.label,_that.labelAr,_that.meaning,_that.meaningAr,_that.chain,_that.chainAr,_that.year,_that.value,_that.source);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MacroIndicator extends MacroIndicator {
  const _MacroIndicator({required this.id, this.label = '', @JsonKey(name: 'label_ar') this.labelAr = '', this.meaning = '', @JsonKey(name: 'meaning_ar') this.meaningAr = '', this.chain = '', @JsonKey(name: 'chain_ar') this.chainAr = '', this.year = '', this.value = 0, this.source = ''}): super._();
  factory _MacroIndicator.fromJson(Map<String, dynamic> json) => _$MacroIndicatorFromJson(json);

@override final  String id;
@override@JsonKey() final  String label;
@override@JsonKey(name: 'label_ar') final  String labelAr;
@override@JsonKey() final  String meaning;
@override@JsonKey(name: 'meaning_ar') final  String meaningAr;
@override@JsonKey() final  String chain;
@override@JsonKey(name: 'chain_ar') final  String chainAr;
@override@JsonKey() final  String year;
@override@JsonKey() final  double value;
@override@JsonKey() final  String source;

/// Create a copy of MacroIndicator
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MacroIndicatorCopyWith<_MacroIndicator> get copyWith => __$MacroIndicatorCopyWithImpl<_MacroIndicator>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MacroIndicatorToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MacroIndicator&&(identical(other.id, id) || other.id == id)&&(identical(other.label, label) || other.label == label)&&(identical(other.labelAr, labelAr) || other.labelAr == labelAr)&&(identical(other.meaning, meaning) || other.meaning == meaning)&&(identical(other.meaningAr, meaningAr) || other.meaningAr == meaningAr)&&(identical(other.chain, chain) || other.chain == chain)&&(identical(other.chainAr, chainAr) || other.chainAr == chainAr)&&(identical(other.year, year) || other.year == year)&&(identical(other.value, value) || other.value == value)&&(identical(other.source, source) || other.source == source));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,label,labelAr,meaning,meaningAr,chain,chainAr,year,value,source);

@override
String toString() {
  return 'MacroIndicator(id: $id, label: $label, labelAr: $labelAr, meaning: $meaning, meaningAr: $meaningAr, chain: $chain, chainAr: $chainAr, year: $year, value: $value, source: $source)';
}


}

/// @nodoc
abstract mixin class _$MacroIndicatorCopyWith<$Res> implements $MacroIndicatorCopyWith<$Res> {
  factory _$MacroIndicatorCopyWith(_MacroIndicator value, $Res Function(_MacroIndicator) _then) = __$MacroIndicatorCopyWithImpl;
@override @useResult
$Res call({
 String id, String label,@JsonKey(name: 'label_ar') String labelAr, String meaning,@JsonKey(name: 'meaning_ar') String meaningAr, String chain,@JsonKey(name: 'chain_ar') String chainAr, String year, double value, String source
});




}
/// @nodoc
class __$MacroIndicatorCopyWithImpl<$Res>
    implements _$MacroIndicatorCopyWith<$Res> {
  __$MacroIndicatorCopyWithImpl(this._self, this._then);

  final _MacroIndicator _self;
  final $Res Function(_MacroIndicator) _then;

/// Create a copy of MacroIndicator
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? label = null,Object? labelAr = null,Object? meaning = null,Object? meaningAr = null,Object? chain = null,Object? chainAr = null,Object? year = null,Object? value = null,Object? source = null,}) {
  return _then(_MacroIndicator(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,labelAr: null == labelAr ? _self.labelAr : labelAr // ignore: cast_nullable_to_non_nullable
as String,meaning: null == meaning ? _self.meaning : meaning // ignore: cast_nullable_to_non_nullable
as String,meaningAr: null == meaningAr ? _self.meaningAr : meaningAr // ignore: cast_nullable_to_non_nullable
as String,chain: null == chain ? _self.chain : chain // ignore: cast_nullable_to_non_nullable
as String,chainAr: null == chainAr ? _self.chainAr : chainAr // ignore: cast_nullable_to_non_nullable
as String,year: null == year ? _self.year : year // ignore: cast_nullable_to_non_nullable
as String,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as double,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$MacroCorrelation {

 String get id; String get against; double get r; int get sessions;
/// Create a copy of MacroCorrelation
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MacroCorrelationCopyWith<MacroCorrelation> get copyWith => _$MacroCorrelationCopyWithImpl<MacroCorrelation>(this as MacroCorrelation, _$identity);

  /// Serializes this MacroCorrelation to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MacroCorrelation&&(identical(other.id, id) || other.id == id)&&(identical(other.against, against) || other.against == against)&&(identical(other.r, r) || other.r == r)&&(identical(other.sessions, sessions) || other.sessions == sessions));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,against,r,sessions);

@override
String toString() {
  return 'MacroCorrelation(id: $id, against: $against, r: $r, sessions: $sessions)';
}


}

/// @nodoc
abstract mixin class $MacroCorrelationCopyWith<$Res>  {
  factory $MacroCorrelationCopyWith(MacroCorrelation value, $Res Function(MacroCorrelation) _then) = _$MacroCorrelationCopyWithImpl;
@useResult
$Res call({
 String id, String against, double r, int sessions
});




}
/// @nodoc
class _$MacroCorrelationCopyWithImpl<$Res>
    implements $MacroCorrelationCopyWith<$Res> {
  _$MacroCorrelationCopyWithImpl(this._self, this._then);

  final MacroCorrelation _self;
  final $Res Function(MacroCorrelation) _then;

/// Create a copy of MacroCorrelation
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? against = null,Object? r = null,Object? sessions = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,against: null == against ? _self.against : against // ignore: cast_nullable_to_non_nullable
as String,r: null == r ? _self.r : r // ignore: cast_nullable_to_non_nullable
as double,sessions: null == sessions ? _self.sessions : sessions // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [MacroCorrelation].
extension MacroCorrelationPatterns on MacroCorrelation {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MacroCorrelation value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MacroCorrelation() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MacroCorrelation value)  $default,){
final _that = this;
switch (_that) {
case _MacroCorrelation():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MacroCorrelation value)?  $default,){
final _that = this;
switch (_that) {
case _MacroCorrelation() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String against,  double r,  int sessions)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MacroCorrelation() when $default != null:
return $default(_that.id,_that.against,_that.r,_that.sessions);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String against,  double r,  int sessions)  $default,) {final _that = this;
switch (_that) {
case _MacroCorrelation():
return $default(_that.id,_that.against,_that.r,_that.sessions);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String against,  double r,  int sessions)?  $default,) {final _that = this;
switch (_that) {
case _MacroCorrelation() when $default != null:
return $default(_that.id,_that.against,_that.r,_that.sessions);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MacroCorrelation extends MacroCorrelation {
  const _MacroCorrelation({required this.id, this.against = 'EGX30', this.r = 0, this.sessions = 0}): super._();
  factory _MacroCorrelation.fromJson(Map<String, dynamic> json) => _$MacroCorrelationFromJson(json);

@override final  String id;
@override@JsonKey() final  String against;
@override@JsonKey() final  double r;
@override@JsonKey() final  int sessions;

/// Create a copy of MacroCorrelation
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MacroCorrelationCopyWith<_MacroCorrelation> get copyWith => __$MacroCorrelationCopyWithImpl<_MacroCorrelation>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MacroCorrelationToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MacroCorrelation&&(identical(other.id, id) || other.id == id)&&(identical(other.against, against) || other.against == against)&&(identical(other.r, r) || other.r == r)&&(identical(other.sessions, sessions) || other.sessions == sessions));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,against,r,sessions);

@override
String toString() {
  return 'MacroCorrelation(id: $id, against: $against, r: $r, sessions: $sessions)';
}


}

/// @nodoc
abstract mixin class _$MacroCorrelationCopyWith<$Res> implements $MacroCorrelationCopyWith<$Res> {
  factory _$MacroCorrelationCopyWith(_MacroCorrelation value, $Res Function(_MacroCorrelation) _then) = __$MacroCorrelationCopyWithImpl;
@override @useResult
$Res call({
 String id, String against, double r, int sessions
});




}
/// @nodoc
class __$MacroCorrelationCopyWithImpl<$Res>
    implements _$MacroCorrelationCopyWith<$Res> {
  __$MacroCorrelationCopyWithImpl(this._self, this._then);

  final _MacroCorrelation _self;
  final $Res Function(_MacroCorrelation) _then;

/// Create a copy of MacroCorrelation
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? against = null,Object? r = null,Object? sessions = null,}) {
  return _then(_MacroCorrelation(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,against: null == against ? _self.against : against // ignore: cast_nullable_to_non_nullable
as String,r: null == r ? _self.r : r // ignore: cast_nullable_to_non_nullable
as double,sessions: null == sessions ? _self.sessions : sessions // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
