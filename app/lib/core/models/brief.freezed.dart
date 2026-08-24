// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'brief.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CompanyBrief {

 String get ticker; String get history;@JsonKey(name: 'history_ar') String get historyAr; List<BriefPlan> get plans; BriefRecord? get record; String? get generated;
/// Create a copy of CompanyBrief
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CompanyBriefCopyWith<CompanyBrief> get copyWith => _$CompanyBriefCopyWithImpl<CompanyBrief>(this as CompanyBrief, _$identity);

  /// Serializes this CompanyBrief to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CompanyBrief&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.history, history) || other.history == history)&&(identical(other.historyAr, historyAr) || other.historyAr == historyAr)&&const DeepCollectionEquality().equals(other.plans, plans)&&(identical(other.record, record) || other.record == record)&&(identical(other.generated, generated) || other.generated == generated));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,history,historyAr,const DeepCollectionEquality().hash(plans),record,generated);

@override
String toString() {
  return 'CompanyBrief(ticker: $ticker, history: $history, historyAr: $historyAr, plans: $plans, record: $record, generated: $generated)';
}


}

/// @nodoc
abstract mixin class $CompanyBriefCopyWith<$Res>  {
  factory $CompanyBriefCopyWith(CompanyBrief value, $Res Function(CompanyBrief) _then) = _$CompanyBriefCopyWithImpl;
@useResult
$Res call({
 String ticker, String history,@JsonKey(name: 'history_ar') String historyAr, List<BriefPlan> plans, BriefRecord? record, String? generated
});


$BriefRecordCopyWith<$Res>? get record;

}
/// @nodoc
class _$CompanyBriefCopyWithImpl<$Res>
    implements $CompanyBriefCopyWith<$Res> {
  _$CompanyBriefCopyWithImpl(this._self, this._then);

  final CompanyBrief _self;
  final $Res Function(CompanyBrief) _then;

/// Create a copy of CompanyBrief
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? history = null,Object? historyAr = null,Object? plans = null,Object? record = freezed,Object? generated = freezed,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,history: null == history ? _self.history : history // ignore: cast_nullable_to_non_nullable
as String,historyAr: null == historyAr ? _self.historyAr : historyAr // ignore: cast_nullable_to_non_nullable
as String,plans: null == plans ? _self.plans : plans // ignore: cast_nullable_to_non_nullable
as List<BriefPlan>,record: freezed == record ? _self.record : record // ignore: cast_nullable_to_non_nullable
as BriefRecord?,generated: freezed == generated ? _self.generated : generated // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}
/// Create a copy of CompanyBrief
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$BriefRecordCopyWith<$Res>? get record {
    if (_self.record == null) {
    return null;
  }

  return $BriefRecordCopyWith<$Res>(_self.record!, (value) {
    return _then(_self.copyWith(record: value));
  });
}
}


/// Adds pattern-matching-related methods to [CompanyBrief].
extension CompanyBriefPatterns on CompanyBrief {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CompanyBrief value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CompanyBrief() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CompanyBrief value)  $default,){
final _that = this;
switch (_that) {
case _CompanyBrief():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CompanyBrief value)?  $default,){
final _that = this;
switch (_that) {
case _CompanyBrief() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker,  String history, @JsonKey(name: 'history_ar')  String historyAr,  List<BriefPlan> plans,  BriefRecord? record,  String? generated)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CompanyBrief() when $default != null:
return $default(_that.ticker,_that.history,_that.historyAr,_that.plans,_that.record,_that.generated);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker,  String history, @JsonKey(name: 'history_ar')  String historyAr,  List<BriefPlan> plans,  BriefRecord? record,  String? generated)  $default,) {final _that = this;
switch (_that) {
case _CompanyBrief():
return $default(_that.ticker,_that.history,_that.historyAr,_that.plans,_that.record,_that.generated);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker,  String history, @JsonKey(name: 'history_ar')  String historyAr,  List<BriefPlan> plans,  BriefRecord? record,  String? generated)?  $default,) {final _that = this;
switch (_that) {
case _CompanyBrief() when $default != null:
return $default(_that.ticker,_that.history,_that.historyAr,_that.plans,_that.record,_that.generated);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CompanyBrief extends CompanyBrief {
  const _CompanyBrief({this.ticker = '', this.history = '', @JsonKey(name: 'history_ar') this.historyAr = '', final  List<BriefPlan> plans = const <BriefPlan>[], this.record, this.generated}): _plans = plans,super._();
  factory _CompanyBrief.fromJson(Map<String, dynamic> json) => _$CompanyBriefFromJson(json);

@override@JsonKey() final  String ticker;
@override@JsonKey() final  String history;
@override@JsonKey(name: 'history_ar') final  String historyAr;
 final  List<BriefPlan> _plans;
@override@JsonKey() List<BriefPlan> get plans {
  if (_plans is EqualUnmodifiableListView) return _plans;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_plans);
}

@override final  BriefRecord? record;
@override final  String? generated;

/// Create a copy of CompanyBrief
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CompanyBriefCopyWith<_CompanyBrief> get copyWith => __$CompanyBriefCopyWithImpl<_CompanyBrief>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CompanyBriefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CompanyBrief&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.history, history) || other.history == history)&&(identical(other.historyAr, historyAr) || other.historyAr == historyAr)&&const DeepCollectionEquality().equals(other._plans, _plans)&&(identical(other.record, record) || other.record == record)&&(identical(other.generated, generated) || other.generated == generated));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,history,historyAr,const DeepCollectionEquality().hash(_plans),record,generated);

@override
String toString() {
  return 'CompanyBrief(ticker: $ticker, history: $history, historyAr: $historyAr, plans: $plans, record: $record, generated: $generated)';
}


}

/// @nodoc
abstract mixin class _$CompanyBriefCopyWith<$Res> implements $CompanyBriefCopyWith<$Res> {
  factory _$CompanyBriefCopyWith(_CompanyBrief value, $Res Function(_CompanyBrief) _then) = __$CompanyBriefCopyWithImpl;
@override @useResult
$Res call({
 String ticker, String history,@JsonKey(name: 'history_ar') String historyAr, List<BriefPlan> plans, BriefRecord? record, String? generated
});


@override $BriefRecordCopyWith<$Res>? get record;

}
/// @nodoc
class __$CompanyBriefCopyWithImpl<$Res>
    implements _$CompanyBriefCopyWith<$Res> {
  __$CompanyBriefCopyWithImpl(this._self, this._then);

  final _CompanyBrief _self;
  final $Res Function(_CompanyBrief) _then;

/// Create a copy of CompanyBrief
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? history = null,Object? historyAr = null,Object? plans = null,Object? record = freezed,Object? generated = freezed,}) {
  return _then(_CompanyBrief(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,history: null == history ? _self.history : history // ignore: cast_nullable_to_non_nullable
as String,historyAr: null == historyAr ? _self.historyAr : historyAr // ignore: cast_nullable_to_non_nullable
as String,plans: null == plans ? _self._plans : plans // ignore: cast_nullable_to_non_nullable
as List<BriefPlan>,record: freezed == record ? _self.record : record // ignore: cast_nullable_to_non_nullable
as BriefRecord?,generated: freezed == generated ? _self.generated : generated // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

/// Create a copy of CompanyBrief
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$BriefRecordCopyWith<$Res>? get record {
    if (_self.record == null) {
    return null;
  }

  return $BriefRecordCopyWith<$Res>(_self.record!, (value) {
    return _then(_self.copyWith(record: value));
  });
}
}


/// @nodoc
mixin _$BriefPlan {

 String get text;@JsonKey(name: 'text_ar') String get textAr; String get id;
/// Create a copy of BriefPlan
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BriefPlanCopyWith<BriefPlan> get copyWith => _$BriefPlanCopyWithImpl<BriefPlan>(this as BriefPlan, _$identity);

  /// Serializes this BriefPlan to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BriefPlan&&(identical(other.text, text) || other.text == text)&&(identical(other.textAr, textAr) || other.textAr == textAr)&&(identical(other.id, id) || other.id == id));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,text,textAr,id);

@override
String toString() {
  return 'BriefPlan(text: $text, textAr: $textAr, id: $id)';
}


}

/// @nodoc
abstract mixin class $BriefPlanCopyWith<$Res>  {
  factory $BriefPlanCopyWith(BriefPlan value, $Res Function(BriefPlan) _then) = _$BriefPlanCopyWithImpl;
@useResult
$Res call({
 String text,@JsonKey(name: 'text_ar') String textAr, String id
});




}
/// @nodoc
class _$BriefPlanCopyWithImpl<$Res>
    implements $BriefPlanCopyWith<$Res> {
  _$BriefPlanCopyWithImpl(this._self, this._then);

  final BriefPlan _self;
  final $Res Function(BriefPlan) _then;

/// Create a copy of BriefPlan
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? text = null,Object? textAr = null,Object? id = null,}) {
  return _then(_self.copyWith(
text: null == text ? _self.text : text // ignore: cast_nullable_to_non_nullable
as String,textAr: null == textAr ? _self.textAr : textAr // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [BriefPlan].
extension BriefPlanPatterns on BriefPlan {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BriefPlan value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BriefPlan() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BriefPlan value)  $default,){
final _that = this;
switch (_that) {
case _BriefPlan():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BriefPlan value)?  $default,){
final _that = this;
switch (_that) {
case _BriefPlan() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String text, @JsonKey(name: 'text_ar')  String textAr,  String id)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BriefPlan() when $default != null:
return $default(_that.text,_that.textAr,_that.id);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String text, @JsonKey(name: 'text_ar')  String textAr,  String id)  $default,) {final _that = this;
switch (_that) {
case _BriefPlan():
return $default(_that.text,_that.textAr,_that.id);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String text, @JsonKey(name: 'text_ar')  String textAr,  String id)?  $default,) {final _that = this;
switch (_that) {
case _BriefPlan() when $default != null:
return $default(_that.text,_that.textAr,_that.id);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BriefPlan extends BriefPlan {
  const _BriefPlan({this.text = '', @JsonKey(name: 'text_ar') this.textAr = '', this.id = ''}): super._();
  factory _BriefPlan.fromJson(Map<String, dynamic> json) => _$BriefPlanFromJson(json);

@override@JsonKey() final  String text;
@override@JsonKey(name: 'text_ar') final  String textAr;
@override@JsonKey() final  String id;

/// Create a copy of BriefPlan
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BriefPlanCopyWith<_BriefPlan> get copyWith => __$BriefPlanCopyWithImpl<_BriefPlan>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BriefPlanToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _BriefPlan&&(identical(other.text, text) || other.text == text)&&(identical(other.textAr, textAr) || other.textAr == textAr)&&(identical(other.id, id) || other.id == id));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,text,textAr,id);

@override
String toString() {
  return 'BriefPlan(text: $text, textAr: $textAr, id: $id)';
}


}

/// @nodoc
abstract mixin class _$BriefPlanCopyWith<$Res> implements $BriefPlanCopyWith<$Res> {
  factory _$BriefPlanCopyWith(_BriefPlan value, $Res Function(_BriefPlan) _then) = __$BriefPlanCopyWithImpl;
@override @useResult
$Res call({
 String text,@JsonKey(name: 'text_ar') String textAr, String id
});




}
/// @nodoc
class __$BriefPlanCopyWithImpl<$Res>
    implements _$BriefPlanCopyWith<$Res> {
  __$BriefPlanCopyWithImpl(this._self, this._then);

  final _BriefPlan _self;
  final $Res Function(_BriefPlan) _then;

/// Create a copy of BriefPlan
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? text = null,Object? textAr = null,Object? id = null,}) {
  return _then(_BriefPlan(
text: null == text ? _self.text : text // ignore: cast_nullable_to_non_nullable
as String,textAr: null == textAr ? _self.textAr : textAr // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$BriefRecord {

 int get filings;@JsonKey(name: 'first_filing') String? get firstFiling;@JsonKey(name: 'trading_suspensions') int get suspensions;@JsonKey(name: 'trading_resumptions') int get resumptions;@JsonKey(name: 'capital_increases') int get capitalIncreases;@JsonKey(name: 'general_assemblies') int get assemblies;@JsonKey(name: 'periods_reported') int get periodsReported;@JsonKey(name: 'loss_making_periods') int get lossMakingPeriods;
/// Create a copy of BriefRecord
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BriefRecordCopyWith<BriefRecord> get copyWith => _$BriefRecordCopyWithImpl<BriefRecord>(this as BriefRecord, _$identity);

  /// Serializes this BriefRecord to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BriefRecord&&(identical(other.filings, filings) || other.filings == filings)&&(identical(other.firstFiling, firstFiling) || other.firstFiling == firstFiling)&&(identical(other.suspensions, suspensions) || other.suspensions == suspensions)&&(identical(other.resumptions, resumptions) || other.resumptions == resumptions)&&(identical(other.capitalIncreases, capitalIncreases) || other.capitalIncreases == capitalIncreases)&&(identical(other.assemblies, assemblies) || other.assemblies == assemblies)&&(identical(other.periodsReported, periodsReported) || other.periodsReported == periodsReported)&&(identical(other.lossMakingPeriods, lossMakingPeriods) || other.lossMakingPeriods == lossMakingPeriods));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,filings,firstFiling,suspensions,resumptions,capitalIncreases,assemblies,periodsReported,lossMakingPeriods);

@override
String toString() {
  return 'BriefRecord(filings: $filings, firstFiling: $firstFiling, suspensions: $suspensions, resumptions: $resumptions, capitalIncreases: $capitalIncreases, assemblies: $assemblies, periodsReported: $periodsReported, lossMakingPeriods: $lossMakingPeriods)';
}


}

/// @nodoc
abstract mixin class $BriefRecordCopyWith<$Res>  {
  factory $BriefRecordCopyWith(BriefRecord value, $Res Function(BriefRecord) _then) = _$BriefRecordCopyWithImpl;
@useResult
$Res call({
 int filings,@JsonKey(name: 'first_filing') String? firstFiling,@JsonKey(name: 'trading_suspensions') int suspensions,@JsonKey(name: 'trading_resumptions') int resumptions,@JsonKey(name: 'capital_increases') int capitalIncreases,@JsonKey(name: 'general_assemblies') int assemblies,@JsonKey(name: 'periods_reported') int periodsReported,@JsonKey(name: 'loss_making_periods') int lossMakingPeriods
});




}
/// @nodoc
class _$BriefRecordCopyWithImpl<$Res>
    implements $BriefRecordCopyWith<$Res> {
  _$BriefRecordCopyWithImpl(this._self, this._then);

  final BriefRecord _self;
  final $Res Function(BriefRecord) _then;

/// Create a copy of BriefRecord
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? filings = null,Object? firstFiling = freezed,Object? suspensions = null,Object? resumptions = null,Object? capitalIncreases = null,Object? assemblies = null,Object? periodsReported = null,Object? lossMakingPeriods = null,}) {
  return _then(_self.copyWith(
filings: null == filings ? _self.filings : filings // ignore: cast_nullable_to_non_nullable
as int,firstFiling: freezed == firstFiling ? _self.firstFiling : firstFiling // ignore: cast_nullable_to_non_nullable
as String?,suspensions: null == suspensions ? _self.suspensions : suspensions // ignore: cast_nullable_to_non_nullable
as int,resumptions: null == resumptions ? _self.resumptions : resumptions // ignore: cast_nullable_to_non_nullable
as int,capitalIncreases: null == capitalIncreases ? _self.capitalIncreases : capitalIncreases // ignore: cast_nullable_to_non_nullable
as int,assemblies: null == assemblies ? _self.assemblies : assemblies // ignore: cast_nullable_to_non_nullable
as int,periodsReported: null == periodsReported ? _self.periodsReported : periodsReported // ignore: cast_nullable_to_non_nullable
as int,lossMakingPeriods: null == lossMakingPeriods ? _self.lossMakingPeriods : lossMakingPeriods // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [BriefRecord].
extension BriefRecordPatterns on BriefRecord {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BriefRecord value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BriefRecord() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BriefRecord value)  $default,){
final _that = this;
switch (_that) {
case _BriefRecord():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BriefRecord value)?  $default,){
final _that = this;
switch (_that) {
case _BriefRecord() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int filings, @JsonKey(name: 'first_filing')  String? firstFiling, @JsonKey(name: 'trading_suspensions')  int suspensions, @JsonKey(name: 'trading_resumptions')  int resumptions, @JsonKey(name: 'capital_increases')  int capitalIncreases, @JsonKey(name: 'general_assemblies')  int assemblies, @JsonKey(name: 'periods_reported')  int periodsReported, @JsonKey(name: 'loss_making_periods')  int lossMakingPeriods)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BriefRecord() when $default != null:
return $default(_that.filings,_that.firstFiling,_that.suspensions,_that.resumptions,_that.capitalIncreases,_that.assemblies,_that.periodsReported,_that.lossMakingPeriods);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int filings, @JsonKey(name: 'first_filing')  String? firstFiling, @JsonKey(name: 'trading_suspensions')  int suspensions, @JsonKey(name: 'trading_resumptions')  int resumptions, @JsonKey(name: 'capital_increases')  int capitalIncreases, @JsonKey(name: 'general_assemblies')  int assemblies, @JsonKey(name: 'periods_reported')  int periodsReported, @JsonKey(name: 'loss_making_periods')  int lossMakingPeriods)  $default,) {final _that = this;
switch (_that) {
case _BriefRecord():
return $default(_that.filings,_that.firstFiling,_that.suspensions,_that.resumptions,_that.capitalIncreases,_that.assemblies,_that.periodsReported,_that.lossMakingPeriods);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int filings, @JsonKey(name: 'first_filing')  String? firstFiling, @JsonKey(name: 'trading_suspensions')  int suspensions, @JsonKey(name: 'trading_resumptions')  int resumptions, @JsonKey(name: 'capital_increases')  int capitalIncreases, @JsonKey(name: 'general_assemblies')  int assemblies, @JsonKey(name: 'periods_reported')  int periodsReported, @JsonKey(name: 'loss_making_periods')  int lossMakingPeriods)?  $default,) {final _that = this;
switch (_that) {
case _BriefRecord() when $default != null:
return $default(_that.filings,_that.firstFiling,_that.suspensions,_that.resumptions,_that.capitalIncreases,_that.assemblies,_that.periodsReported,_that.lossMakingPeriods);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BriefRecord extends BriefRecord {
  const _BriefRecord({this.filings = 0, @JsonKey(name: 'first_filing') this.firstFiling, @JsonKey(name: 'trading_suspensions') this.suspensions = 0, @JsonKey(name: 'trading_resumptions') this.resumptions = 0, @JsonKey(name: 'capital_increases') this.capitalIncreases = 0, @JsonKey(name: 'general_assemblies') this.assemblies = 0, @JsonKey(name: 'periods_reported') this.periodsReported = 0, @JsonKey(name: 'loss_making_periods') this.lossMakingPeriods = 0}): super._();
  factory _BriefRecord.fromJson(Map<String, dynamic> json) => _$BriefRecordFromJson(json);

@override@JsonKey() final  int filings;
@override@JsonKey(name: 'first_filing') final  String? firstFiling;
@override@JsonKey(name: 'trading_suspensions') final  int suspensions;
@override@JsonKey(name: 'trading_resumptions') final  int resumptions;
@override@JsonKey(name: 'capital_increases') final  int capitalIncreases;
@override@JsonKey(name: 'general_assemblies') final  int assemblies;
@override@JsonKey(name: 'periods_reported') final  int periodsReported;
@override@JsonKey(name: 'loss_making_periods') final  int lossMakingPeriods;

/// Create a copy of BriefRecord
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BriefRecordCopyWith<_BriefRecord> get copyWith => __$BriefRecordCopyWithImpl<_BriefRecord>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BriefRecordToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _BriefRecord&&(identical(other.filings, filings) || other.filings == filings)&&(identical(other.firstFiling, firstFiling) || other.firstFiling == firstFiling)&&(identical(other.suspensions, suspensions) || other.suspensions == suspensions)&&(identical(other.resumptions, resumptions) || other.resumptions == resumptions)&&(identical(other.capitalIncreases, capitalIncreases) || other.capitalIncreases == capitalIncreases)&&(identical(other.assemblies, assemblies) || other.assemblies == assemblies)&&(identical(other.periodsReported, periodsReported) || other.periodsReported == periodsReported)&&(identical(other.lossMakingPeriods, lossMakingPeriods) || other.lossMakingPeriods == lossMakingPeriods));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,filings,firstFiling,suspensions,resumptions,capitalIncreases,assemblies,periodsReported,lossMakingPeriods);

@override
String toString() {
  return 'BriefRecord(filings: $filings, firstFiling: $firstFiling, suspensions: $suspensions, resumptions: $resumptions, capitalIncreases: $capitalIncreases, assemblies: $assemblies, periodsReported: $periodsReported, lossMakingPeriods: $lossMakingPeriods)';
}


}

/// @nodoc
abstract mixin class _$BriefRecordCopyWith<$Res> implements $BriefRecordCopyWith<$Res> {
  factory _$BriefRecordCopyWith(_BriefRecord value, $Res Function(_BriefRecord) _then) = __$BriefRecordCopyWithImpl;
@override @useResult
$Res call({
 int filings,@JsonKey(name: 'first_filing') String? firstFiling,@JsonKey(name: 'trading_suspensions') int suspensions,@JsonKey(name: 'trading_resumptions') int resumptions,@JsonKey(name: 'capital_increases') int capitalIncreases,@JsonKey(name: 'general_assemblies') int assemblies,@JsonKey(name: 'periods_reported') int periodsReported,@JsonKey(name: 'loss_making_periods') int lossMakingPeriods
});




}
/// @nodoc
class __$BriefRecordCopyWithImpl<$Res>
    implements _$BriefRecordCopyWith<$Res> {
  __$BriefRecordCopyWithImpl(this._self, this._then);

  final _BriefRecord _self;
  final $Res Function(_BriefRecord) _then;

/// Create a copy of BriefRecord
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? filings = null,Object? firstFiling = freezed,Object? suspensions = null,Object? resumptions = null,Object? capitalIncreases = null,Object? assemblies = null,Object? periodsReported = null,Object? lossMakingPeriods = null,}) {
  return _then(_BriefRecord(
filings: null == filings ? _self.filings : filings // ignore: cast_nullable_to_non_nullable
as int,firstFiling: freezed == firstFiling ? _self.firstFiling : firstFiling // ignore: cast_nullable_to_non_nullable
as String?,suspensions: null == suspensions ? _self.suspensions : suspensions // ignore: cast_nullable_to_non_nullable
as int,resumptions: null == resumptions ? _self.resumptions : resumptions // ignore: cast_nullable_to_non_nullable
as int,capitalIncreases: null == capitalIncreases ? _self.capitalIncreases : capitalIncreases // ignore: cast_nullable_to_non_nullable
as int,assemblies: null == assemblies ? _self.assemblies : assemblies // ignore: cast_nullable_to_non_nullable
as int,periodsReported: null == periodsReported ? _self.periodsReported : periodsReported // ignore: cast_nullable_to_non_nullable
as int,lossMakingPeriods: null == lossMakingPeriods ? _self.lossMakingPeriods : lossMakingPeriods // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
