// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'signals.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CompanySignals {

 String get ticker; String? get generated; List<StreakBreak> get streaks; List<FirstOfType> get firsts; QuietSpell? get quiet;@JsonKey(name: 'results_due') List<ResultsDue> get resultsDue; SignalProfile? get profile;
/// Create a copy of CompanySignals
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CompanySignalsCopyWith<CompanySignals> get copyWith => _$CompanySignalsCopyWithImpl<CompanySignals>(this as CompanySignals, _$identity);

  /// Serializes this CompanySignals to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CompanySignals&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.generated, generated) || other.generated == generated)&&const DeepCollectionEquality().equals(other.streaks, streaks)&&const DeepCollectionEquality().equals(other.firsts, firsts)&&(identical(other.quiet, quiet) || other.quiet == quiet)&&const DeepCollectionEquality().equals(other.resultsDue, resultsDue)&&(identical(other.profile, profile) || other.profile == profile));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,generated,const DeepCollectionEquality().hash(streaks),const DeepCollectionEquality().hash(firsts),quiet,const DeepCollectionEquality().hash(resultsDue),profile);

@override
String toString() {
  return 'CompanySignals(ticker: $ticker, generated: $generated, streaks: $streaks, firsts: $firsts, quiet: $quiet, resultsDue: $resultsDue, profile: $profile)';
}


}

/// @nodoc
abstract mixin class $CompanySignalsCopyWith<$Res>  {
  factory $CompanySignalsCopyWith(CompanySignals value, $Res Function(CompanySignals) _then) = _$CompanySignalsCopyWithImpl;
@useResult
$Res call({
 String ticker, String? generated, List<StreakBreak> streaks, List<FirstOfType> firsts, QuietSpell? quiet,@JsonKey(name: 'results_due') List<ResultsDue> resultsDue, SignalProfile? profile
});


$QuietSpellCopyWith<$Res>? get quiet;$SignalProfileCopyWith<$Res>? get profile;

}
/// @nodoc
class _$CompanySignalsCopyWithImpl<$Res>
    implements $CompanySignalsCopyWith<$Res> {
  _$CompanySignalsCopyWithImpl(this._self, this._then);

  final CompanySignals _self;
  final $Res Function(CompanySignals) _then;

/// Create a copy of CompanySignals
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? generated = freezed,Object? streaks = null,Object? firsts = null,Object? quiet = freezed,Object? resultsDue = null,Object? profile = freezed,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,generated: freezed == generated ? _self.generated : generated // ignore: cast_nullable_to_non_nullable
as String?,streaks: null == streaks ? _self.streaks : streaks // ignore: cast_nullable_to_non_nullable
as List<StreakBreak>,firsts: null == firsts ? _self.firsts : firsts // ignore: cast_nullable_to_non_nullable
as List<FirstOfType>,quiet: freezed == quiet ? _self.quiet : quiet // ignore: cast_nullable_to_non_nullable
as QuietSpell?,resultsDue: null == resultsDue ? _self.resultsDue : resultsDue // ignore: cast_nullable_to_non_nullable
as List<ResultsDue>,profile: freezed == profile ? _self.profile : profile // ignore: cast_nullable_to_non_nullable
as SignalProfile?,
  ));
}
/// Create a copy of CompanySignals
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$QuietSpellCopyWith<$Res>? get quiet {
    if (_self.quiet == null) {
    return null;
  }

  return $QuietSpellCopyWith<$Res>(_self.quiet!, (value) {
    return _then(_self.copyWith(quiet: value));
  });
}/// Create a copy of CompanySignals
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SignalProfileCopyWith<$Res>? get profile {
    if (_self.profile == null) {
    return null;
  }

  return $SignalProfileCopyWith<$Res>(_self.profile!, (value) {
    return _then(_self.copyWith(profile: value));
  });
}
}


/// Adds pattern-matching-related methods to [CompanySignals].
extension CompanySignalsPatterns on CompanySignals {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CompanySignals value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CompanySignals() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CompanySignals value)  $default,){
final _that = this;
switch (_that) {
case _CompanySignals():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CompanySignals value)?  $default,){
final _that = this;
switch (_that) {
case _CompanySignals() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker,  String? generated,  List<StreakBreak> streaks,  List<FirstOfType> firsts,  QuietSpell? quiet, @JsonKey(name: 'results_due')  List<ResultsDue> resultsDue,  SignalProfile? profile)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CompanySignals() when $default != null:
return $default(_that.ticker,_that.generated,_that.streaks,_that.firsts,_that.quiet,_that.resultsDue,_that.profile);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker,  String? generated,  List<StreakBreak> streaks,  List<FirstOfType> firsts,  QuietSpell? quiet, @JsonKey(name: 'results_due')  List<ResultsDue> resultsDue,  SignalProfile? profile)  $default,) {final _that = this;
switch (_that) {
case _CompanySignals():
return $default(_that.ticker,_that.generated,_that.streaks,_that.firsts,_that.quiet,_that.resultsDue,_that.profile);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker,  String? generated,  List<StreakBreak> streaks,  List<FirstOfType> firsts,  QuietSpell? quiet, @JsonKey(name: 'results_due')  List<ResultsDue> resultsDue,  SignalProfile? profile)?  $default,) {final _that = this;
switch (_that) {
case _CompanySignals() when $default != null:
return $default(_that.ticker,_that.generated,_that.streaks,_that.firsts,_that.quiet,_that.resultsDue,_that.profile);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CompanySignals extends CompanySignals {
  const _CompanySignals({this.ticker = '', this.generated, final  List<StreakBreak> streaks = const <StreakBreak>[], final  List<FirstOfType> firsts = const <FirstOfType>[], this.quiet, @JsonKey(name: 'results_due') final  List<ResultsDue> resultsDue = const <ResultsDue>[], this.profile}): _streaks = streaks,_firsts = firsts,_resultsDue = resultsDue,super._();
  factory _CompanySignals.fromJson(Map<String, dynamic> json) => _$CompanySignalsFromJson(json);

@override@JsonKey() final  String ticker;
@override final  String? generated;
 final  List<StreakBreak> _streaks;
@override@JsonKey() List<StreakBreak> get streaks {
  if (_streaks is EqualUnmodifiableListView) return _streaks;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_streaks);
}

 final  List<FirstOfType> _firsts;
@override@JsonKey() List<FirstOfType> get firsts {
  if (_firsts is EqualUnmodifiableListView) return _firsts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_firsts);
}

@override final  QuietSpell? quiet;
 final  List<ResultsDue> _resultsDue;
@override@JsonKey(name: 'results_due') List<ResultsDue> get resultsDue {
  if (_resultsDue is EqualUnmodifiableListView) return _resultsDue;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_resultsDue);
}

@override final  SignalProfile? profile;

/// Create a copy of CompanySignals
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CompanySignalsCopyWith<_CompanySignals> get copyWith => __$CompanySignalsCopyWithImpl<_CompanySignals>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CompanySignalsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CompanySignals&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.generated, generated) || other.generated == generated)&&const DeepCollectionEquality().equals(other._streaks, _streaks)&&const DeepCollectionEquality().equals(other._firsts, _firsts)&&(identical(other.quiet, quiet) || other.quiet == quiet)&&const DeepCollectionEquality().equals(other._resultsDue, _resultsDue)&&(identical(other.profile, profile) || other.profile == profile));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,generated,const DeepCollectionEquality().hash(_streaks),const DeepCollectionEquality().hash(_firsts),quiet,const DeepCollectionEquality().hash(_resultsDue),profile);

@override
String toString() {
  return 'CompanySignals(ticker: $ticker, generated: $generated, streaks: $streaks, firsts: $firsts, quiet: $quiet, resultsDue: $resultsDue, profile: $profile)';
}


}

/// @nodoc
abstract mixin class _$CompanySignalsCopyWith<$Res> implements $CompanySignalsCopyWith<$Res> {
  factory _$CompanySignalsCopyWith(_CompanySignals value, $Res Function(_CompanySignals) _then) = __$CompanySignalsCopyWithImpl;
@override @useResult
$Res call({
 String ticker, String? generated, List<StreakBreak> streaks, List<FirstOfType> firsts, QuietSpell? quiet,@JsonKey(name: 'results_due') List<ResultsDue> resultsDue, SignalProfile? profile
});


@override $QuietSpellCopyWith<$Res>? get quiet;@override $SignalProfileCopyWith<$Res>? get profile;

}
/// @nodoc
class __$CompanySignalsCopyWithImpl<$Res>
    implements _$CompanySignalsCopyWith<$Res> {
  __$CompanySignalsCopyWithImpl(this._self, this._then);

  final _CompanySignals _self;
  final $Res Function(_CompanySignals) _then;

/// Create a copy of CompanySignals
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? generated = freezed,Object? streaks = null,Object? firsts = null,Object? quiet = freezed,Object? resultsDue = null,Object? profile = freezed,}) {
  return _then(_CompanySignals(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,generated: freezed == generated ? _self.generated : generated // ignore: cast_nullable_to_non_nullable
as String?,streaks: null == streaks ? _self._streaks : streaks // ignore: cast_nullable_to_non_nullable
as List<StreakBreak>,firsts: null == firsts ? _self._firsts : firsts // ignore: cast_nullable_to_non_nullable
as List<FirstOfType>,quiet: freezed == quiet ? _self.quiet : quiet // ignore: cast_nullable_to_non_nullable
as QuietSpell?,resultsDue: null == resultsDue ? _self._resultsDue : resultsDue // ignore: cast_nullable_to_non_nullable
as List<ResultsDue>,profile: freezed == profile ? _self.profile : profile // ignore: cast_nullable_to_non_nullable
as SignalProfile?,
  ));
}

/// Create a copy of CompanySignals
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$QuietSpellCopyWith<$Res>? get quiet {
    if (_self.quiet == null) {
    return null;
  }

  return $QuietSpellCopyWith<$Res>(_self.quiet!, (value) {
    return _then(_self.copyWith(quiet: value));
  });
}/// Create a copy of CompanySignals
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SignalProfileCopyWith<$Res>? get profile {
    if (_self.profile == null) {
    return null;
  }

  return $SignalProfileCopyWith<$Res>(_self.profile!, (value) {
    return _then(_self.copyWith(profile: value));
  });
}
}


/// @nodoc
mixin _$StreakBreak {

 String get kind; String get period;@JsonKey(name: 'period_end') String get periodEnd; double get value;/// How many consecutive periods ran the other way before this one.
 int get run;/// The end of the first period in that run.
 String get since; String get filed; String get id; String get link;
/// Create a copy of StreakBreak
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StreakBreakCopyWith<StreakBreak> get copyWith => _$StreakBreakCopyWithImpl<StreakBreak>(this as StreakBreak, _$identity);

  /// Serializes this StreakBreak to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is StreakBreak&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.period, period) || other.period == period)&&(identical(other.periodEnd, periodEnd) || other.periodEnd == periodEnd)&&(identical(other.value, value) || other.value == value)&&(identical(other.run, run) || other.run == run)&&(identical(other.since, since) || other.since == since)&&(identical(other.filed, filed) || other.filed == filed)&&(identical(other.id, id) || other.id == id)&&(identical(other.link, link) || other.link == link));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,kind,period,periodEnd,value,run,since,filed,id,link);

@override
String toString() {
  return 'StreakBreak(kind: $kind, period: $period, periodEnd: $periodEnd, value: $value, run: $run, since: $since, filed: $filed, id: $id, link: $link)';
}


}

/// @nodoc
abstract mixin class $StreakBreakCopyWith<$Res>  {
  factory $StreakBreakCopyWith(StreakBreak value, $Res Function(StreakBreak) _then) = _$StreakBreakCopyWithImpl;
@useResult
$Res call({
 String kind, String period,@JsonKey(name: 'period_end') String periodEnd, double value, int run, String since, String filed, String id, String link
});




}
/// @nodoc
class _$StreakBreakCopyWithImpl<$Res>
    implements $StreakBreakCopyWith<$Res> {
  _$StreakBreakCopyWithImpl(this._self, this._then);

  final StreakBreak _self;
  final $Res Function(StreakBreak) _then;

/// Create a copy of StreakBreak
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? kind = null,Object? period = null,Object? periodEnd = null,Object? value = null,Object? run = null,Object? since = null,Object? filed = null,Object? id = null,Object? link = null,}) {
  return _then(_self.copyWith(
kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,period: null == period ? _self.period : period // ignore: cast_nullable_to_non_nullable
as String,periodEnd: null == periodEnd ? _self.periodEnd : periodEnd // ignore: cast_nullable_to_non_nullable
as String,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as double,run: null == run ? _self.run : run // ignore: cast_nullable_to_non_nullable
as int,since: null == since ? _self.since : since // ignore: cast_nullable_to_non_nullable
as String,filed: null == filed ? _self.filed : filed // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [StreakBreak].
extension StreakBreakPatterns on StreakBreak {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _StreakBreak value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _StreakBreak() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _StreakBreak value)  $default,){
final _that = this;
switch (_that) {
case _StreakBreak():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _StreakBreak value)?  $default,){
final _that = this;
switch (_that) {
case _StreakBreak() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String kind,  String period, @JsonKey(name: 'period_end')  String periodEnd,  double value,  int run,  String since,  String filed,  String id,  String link)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _StreakBreak() when $default != null:
return $default(_that.kind,_that.period,_that.periodEnd,_that.value,_that.run,_that.since,_that.filed,_that.id,_that.link);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String kind,  String period, @JsonKey(name: 'period_end')  String periodEnd,  double value,  int run,  String since,  String filed,  String id,  String link)  $default,) {final _that = this;
switch (_that) {
case _StreakBreak():
return $default(_that.kind,_that.period,_that.periodEnd,_that.value,_that.run,_that.since,_that.filed,_that.id,_that.link);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String kind,  String period, @JsonKey(name: 'period_end')  String periodEnd,  double value,  int run,  String since,  String filed,  String id,  String link)?  $default,) {final _that = this;
switch (_that) {
case _StreakBreak() when $default != null:
return $default(_that.kind,_that.period,_that.periodEnd,_that.value,_that.run,_that.since,_that.filed,_that.id,_that.link);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _StreakBreak extends StreakBreak {
  const _StreakBreak({this.kind = '', this.period = '', @JsonKey(name: 'period_end') this.periodEnd = '', this.value = 0, this.run = 0, this.since = '', this.filed = '', this.id = '', this.link = ''}): super._();
  factory _StreakBreak.fromJson(Map<String, dynamic> json) => _$StreakBreakFromJson(json);

@override@JsonKey() final  String kind;
@override@JsonKey() final  String period;
@override@JsonKey(name: 'period_end') final  String periodEnd;
@override@JsonKey() final  double value;
/// How many consecutive periods ran the other way before this one.
@override@JsonKey() final  int run;
/// The end of the first period in that run.
@override@JsonKey() final  String since;
@override@JsonKey() final  String filed;
@override@JsonKey() final  String id;
@override@JsonKey() final  String link;

/// Create a copy of StreakBreak
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StreakBreakCopyWith<_StreakBreak> get copyWith => __$StreakBreakCopyWithImpl<_StreakBreak>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StreakBreakToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _StreakBreak&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.period, period) || other.period == period)&&(identical(other.periodEnd, periodEnd) || other.periodEnd == periodEnd)&&(identical(other.value, value) || other.value == value)&&(identical(other.run, run) || other.run == run)&&(identical(other.since, since) || other.since == since)&&(identical(other.filed, filed) || other.filed == filed)&&(identical(other.id, id) || other.id == id)&&(identical(other.link, link) || other.link == link));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,kind,period,periodEnd,value,run,since,filed,id,link);

@override
String toString() {
  return 'StreakBreak(kind: $kind, period: $period, periodEnd: $periodEnd, value: $value, run: $run, since: $since, filed: $filed, id: $id, link: $link)';
}


}

/// @nodoc
abstract mixin class _$StreakBreakCopyWith<$Res> implements $StreakBreakCopyWith<$Res> {
  factory _$StreakBreakCopyWith(_StreakBreak value, $Res Function(_StreakBreak) _then) = __$StreakBreakCopyWithImpl;
@override @useResult
$Res call({
 String kind, String period,@JsonKey(name: 'period_end') String periodEnd, double value, int run, String since, String filed, String id, String link
});




}
/// @nodoc
class __$StreakBreakCopyWithImpl<$Res>
    implements _$StreakBreakCopyWith<$Res> {
  __$StreakBreakCopyWithImpl(this._self, this._then);

  final _StreakBreak _self;
  final $Res Function(_StreakBreak) _then;

/// Create a copy of StreakBreak
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? kind = null,Object? period = null,Object? periodEnd = null,Object? value = null,Object? run = null,Object? since = null,Object? filed = null,Object? id = null,Object? link = null,}) {
  return _then(_StreakBreak(
kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,period: null == period ? _self.period : period // ignore: cast_nullable_to_non_nullable
as String,periodEnd: null == periodEnd ? _self.periodEnd : periodEnd // ignore: cast_nullable_to_non_nullable
as String,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as double,run: null == run ? _self.run : run // ignore: cast_nullable_to_non_nullable
as int,since: null == since ? _self.since : since // ignore: cast_nullable_to_non_nullable
as String,filed: null == filed ? _self.filed : filed // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$FirstOfType {

 String get type;/// The type's name, in both languages, from the builder's own table.
/// Both, because "its first trading halt in three years" is a sentence the
/// app writes in Arabic too, and an English noun dropped into the middle
/// of an Arabic clause is what the first build shipped.
 String get label;@JsonKey(name: 'label_ar') String get labelAr; String get date; String get previous;@JsonKey(name: 'gap_days') int get gapDays; String get title;@JsonKey(name: 'title_ar') String get titleAr; String get id; String get link;
/// Create a copy of FirstOfType
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FirstOfTypeCopyWith<FirstOfType> get copyWith => _$FirstOfTypeCopyWithImpl<FirstOfType>(this as FirstOfType, _$identity);

  /// Serializes this FirstOfType to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FirstOfType&&(identical(other.type, type) || other.type == type)&&(identical(other.label, label) || other.label == label)&&(identical(other.labelAr, labelAr) || other.labelAr == labelAr)&&(identical(other.date, date) || other.date == date)&&(identical(other.previous, previous) || other.previous == previous)&&(identical(other.gapDays, gapDays) || other.gapDays == gapDays)&&(identical(other.title, title) || other.title == title)&&(identical(other.titleAr, titleAr) || other.titleAr == titleAr)&&(identical(other.id, id) || other.id == id)&&(identical(other.link, link) || other.link == link));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,type,label,labelAr,date,previous,gapDays,title,titleAr,id,link);

@override
String toString() {
  return 'FirstOfType(type: $type, label: $label, labelAr: $labelAr, date: $date, previous: $previous, gapDays: $gapDays, title: $title, titleAr: $titleAr, id: $id, link: $link)';
}


}

/// @nodoc
abstract mixin class $FirstOfTypeCopyWith<$Res>  {
  factory $FirstOfTypeCopyWith(FirstOfType value, $Res Function(FirstOfType) _then) = _$FirstOfTypeCopyWithImpl;
@useResult
$Res call({
 String type, String label,@JsonKey(name: 'label_ar') String labelAr, String date, String previous,@JsonKey(name: 'gap_days') int gapDays, String title,@JsonKey(name: 'title_ar') String titleAr, String id, String link
});




}
/// @nodoc
class _$FirstOfTypeCopyWithImpl<$Res>
    implements $FirstOfTypeCopyWith<$Res> {
  _$FirstOfTypeCopyWithImpl(this._self, this._then);

  final FirstOfType _self;
  final $Res Function(FirstOfType) _then;

/// Create a copy of FirstOfType
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? type = null,Object? label = null,Object? labelAr = null,Object? date = null,Object? previous = null,Object? gapDays = null,Object? title = null,Object? titleAr = null,Object? id = null,Object? link = null,}) {
  return _then(_self.copyWith(
type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,labelAr: null == labelAr ? _self.labelAr : labelAr // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,previous: null == previous ? _self.previous : previous // ignore: cast_nullable_to_non_nullable
as String,gapDays: null == gapDays ? _self.gapDays : gapDays // ignore: cast_nullable_to_non_nullable
as int,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,titleAr: null == titleAr ? _self.titleAr : titleAr // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [FirstOfType].
extension FirstOfTypePatterns on FirstOfType {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FirstOfType value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FirstOfType() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FirstOfType value)  $default,){
final _that = this;
switch (_that) {
case _FirstOfType():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FirstOfType value)?  $default,){
final _that = this;
switch (_that) {
case _FirstOfType() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String type,  String label, @JsonKey(name: 'label_ar')  String labelAr,  String date,  String previous, @JsonKey(name: 'gap_days')  int gapDays,  String title, @JsonKey(name: 'title_ar')  String titleAr,  String id,  String link)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FirstOfType() when $default != null:
return $default(_that.type,_that.label,_that.labelAr,_that.date,_that.previous,_that.gapDays,_that.title,_that.titleAr,_that.id,_that.link);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String type,  String label, @JsonKey(name: 'label_ar')  String labelAr,  String date,  String previous, @JsonKey(name: 'gap_days')  int gapDays,  String title, @JsonKey(name: 'title_ar')  String titleAr,  String id,  String link)  $default,) {final _that = this;
switch (_that) {
case _FirstOfType():
return $default(_that.type,_that.label,_that.labelAr,_that.date,_that.previous,_that.gapDays,_that.title,_that.titleAr,_that.id,_that.link);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String type,  String label, @JsonKey(name: 'label_ar')  String labelAr,  String date,  String previous, @JsonKey(name: 'gap_days')  int gapDays,  String title, @JsonKey(name: 'title_ar')  String titleAr,  String id,  String link)?  $default,) {final _that = this;
switch (_that) {
case _FirstOfType() when $default != null:
return $default(_that.type,_that.label,_that.labelAr,_that.date,_that.previous,_that.gapDays,_that.title,_that.titleAr,_that.id,_that.link);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FirstOfType extends FirstOfType {
  const _FirstOfType({this.type = '', this.label = '', @JsonKey(name: 'label_ar') this.labelAr = '', this.date = '', this.previous = '', @JsonKey(name: 'gap_days') this.gapDays = 0, this.title = '', @JsonKey(name: 'title_ar') this.titleAr = '', this.id = '', this.link = ''}): super._();
  factory _FirstOfType.fromJson(Map<String, dynamic> json) => _$FirstOfTypeFromJson(json);

@override@JsonKey() final  String type;
/// The type's name, in both languages, from the builder's own table.
/// Both, because "its first trading halt in three years" is a sentence the
/// app writes in Arabic too, and an English noun dropped into the middle
/// of an Arabic clause is what the first build shipped.
@override@JsonKey() final  String label;
@override@JsonKey(name: 'label_ar') final  String labelAr;
@override@JsonKey() final  String date;
@override@JsonKey() final  String previous;
@override@JsonKey(name: 'gap_days') final  int gapDays;
@override@JsonKey() final  String title;
@override@JsonKey(name: 'title_ar') final  String titleAr;
@override@JsonKey() final  String id;
@override@JsonKey() final  String link;

/// Create a copy of FirstOfType
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FirstOfTypeCopyWith<_FirstOfType> get copyWith => __$FirstOfTypeCopyWithImpl<_FirstOfType>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FirstOfTypeToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _FirstOfType&&(identical(other.type, type) || other.type == type)&&(identical(other.label, label) || other.label == label)&&(identical(other.labelAr, labelAr) || other.labelAr == labelAr)&&(identical(other.date, date) || other.date == date)&&(identical(other.previous, previous) || other.previous == previous)&&(identical(other.gapDays, gapDays) || other.gapDays == gapDays)&&(identical(other.title, title) || other.title == title)&&(identical(other.titleAr, titleAr) || other.titleAr == titleAr)&&(identical(other.id, id) || other.id == id)&&(identical(other.link, link) || other.link == link));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,type,label,labelAr,date,previous,gapDays,title,titleAr,id,link);

@override
String toString() {
  return 'FirstOfType(type: $type, label: $label, labelAr: $labelAr, date: $date, previous: $previous, gapDays: $gapDays, title: $title, titleAr: $titleAr, id: $id, link: $link)';
}


}

/// @nodoc
abstract mixin class _$FirstOfTypeCopyWith<$Res> implements $FirstOfTypeCopyWith<$Res> {
  factory _$FirstOfTypeCopyWith(_FirstOfType value, $Res Function(_FirstOfType) _then) = __$FirstOfTypeCopyWithImpl;
@override @useResult
$Res call({
 String type, String label,@JsonKey(name: 'label_ar') String labelAr, String date, String previous,@JsonKey(name: 'gap_days') int gapDays, String title,@JsonKey(name: 'title_ar') String titleAr, String id, String link
});




}
/// @nodoc
class __$FirstOfTypeCopyWithImpl<$Res>
    implements _$FirstOfTypeCopyWith<$Res> {
  __$FirstOfTypeCopyWithImpl(this._self, this._then);

  final _FirstOfType _self;
  final $Res Function(_FirstOfType) _then;

/// Create a copy of FirstOfType
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? type = null,Object? label = null,Object? labelAr = null,Object? date = null,Object? previous = null,Object? gapDays = null,Object? title = null,Object? titleAr = null,Object? id = null,Object? link = null,}) {
  return _then(_FirstOfType(
type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,labelAr: null == labelAr ? _self.labelAr : labelAr // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,previous: null == previous ? _self.previous : previous // ignore: cast_nullable_to_non_nullable
as String,gapDays: null == gapDays ? _self.gapDays : gapDays // ignore: cast_nullable_to_non_nullable
as int,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,titleAr: null == titleAr ? _self.titleAr : titleAr // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$QuietSpell {

@JsonKey(name: 'last_filed') String get lastFiled;@JsonKey(name: 'silent_days') int get silentDays;@JsonKey(name: 'typical_gap') int get typicalGap; int get filings;
/// Create a copy of QuietSpell
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$QuietSpellCopyWith<QuietSpell> get copyWith => _$QuietSpellCopyWithImpl<QuietSpell>(this as QuietSpell, _$identity);

  /// Serializes this QuietSpell to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is QuietSpell&&(identical(other.lastFiled, lastFiled) || other.lastFiled == lastFiled)&&(identical(other.silentDays, silentDays) || other.silentDays == silentDays)&&(identical(other.typicalGap, typicalGap) || other.typicalGap == typicalGap)&&(identical(other.filings, filings) || other.filings == filings));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,lastFiled,silentDays,typicalGap,filings);

@override
String toString() {
  return 'QuietSpell(lastFiled: $lastFiled, silentDays: $silentDays, typicalGap: $typicalGap, filings: $filings)';
}


}

/// @nodoc
abstract mixin class $QuietSpellCopyWith<$Res>  {
  factory $QuietSpellCopyWith(QuietSpell value, $Res Function(QuietSpell) _then) = _$QuietSpellCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'last_filed') String lastFiled,@JsonKey(name: 'silent_days') int silentDays,@JsonKey(name: 'typical_gap') int typicalGap, int filings
});




}
/// @nodoc
class _$QuietSpellCopyWithImpl<$Res>
    implements $QuietSpellCopyWith<$Res> {
  _$QuietSpellCopyWithImpl(this._self, this._then);

  final QuietSpell _self;
  final $Res Function(QuietSpell) _then;

/// Create a copy of QuietSpell
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? lastFiled = null,Object? silentDays = null,Object? typicalGap = null,Object? filings = null,}) {
  return _then(_self.copyWith(
lastFiled: null == lastFiled ? _self.lastFiled : lastFiled // ignore: cast_nullable_to_non_nullable
as String,silentDays: null == silentDays ? _self.silentDays : silentDays // ignore: cast_nullable_to_non_nullable
as int,typicalGap: null == typicalGap ? _self.typicalGap : typicalGap // ignore: cast_nullable_to_non_nullable
as int,filings: null == filings ? _self.filings : filings // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [QuietSpell].
extension QuietSpellPatterns on QuietSpell {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _QuietSpell value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _QuietSpell() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _QuietSpell value)  $default,){
final _that = this;
switch (_that) {
case _QuietSpell():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _QuietSpell value)?  $default,){
final _that = this;
switch (_that) {
case _QuietSpell() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'last_filed')  String lastFiled, @JsonKey(name: 'silent_days')  int silentDays, @JsonKey(name: 'typical_gap')  int typicalGap,  int filings)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _QuietSpell() when $default != null:
return $default(_that.lastFiled,_that.silentDays,_that.typicalGap,_that.filings);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'last_filed')  String lastFiled, @JsonKey(name: 'silent_days')  int silentDays, @JsonKey(name: 'typical_gap')  int typicalGap,  int filings)  $default,) {final _that = this;
switch (_that) {
case _QuietSpell():
return $default(_that.lastFiled,_that.silentDays,_that.typicalGap,_that.filings);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'last_filed')  String lastFiled, @JsonKey(name: 'silent_days')  int silentDays, @JsonKey(name: 'typical_gap')  int typicalGap,  int filings)?  $default,) {final _that = this;
switch (_that) {
case _QuietSpell() when $default != null:
return $default(_that.lastFiled,_that.silentDays,_that.typicalGap,_that.filings);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _QuietSpell implements QuietSpell {
  const _QuietSpell({@JsonKey(name: 'last_filed') this.lastFiled = '', @JsonKey(name: 'silent_days') this.silentDays = 0, @JsonKey(name: 'typical_gap') this.typicalGap = 0, this.filings = 0});
  factory _QuietSpell.fromJson(Map<String, dynamic> json) => _$QuietSpellFromJson(json);

@override@JsonKey(name: 'last_filed') final  String lastFiled;
@override@JsonKey(name: 'silent_days') final  int silentDays;
@override@JsonKey(name: 'typical_gap') final  int typicalGap;
@override@JsonKey() final  int filings;

/// Create a copy of QuietSpell
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$QuietSpellCopyWith<_QuietSpell> get copyWith => __$QuietSpellCopyWithImpl<_QuietSpell>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$QuietSpellToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _QuietSpell&&(identical(other.lastFiled, lastFiled) || other.lastFiled == lastFiled)&&(identical(other.silentDays, silentDays) || other.silentDays == silentDays)&&(identical(other.typicalGap, typicalGap) || other.typicalGap == typicalGap)&&(identical(other.filings, filings) || other.filings == filings));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,lastFiled,silentDays,typicalGap,filings);

@override
String toString() {
  return 'QuietSpell(lastFiled: $lastFiled, silentDays: $silentDays, typicalGap: $typicalGap, filings: $filings)';
}


}

/// @nodoc
abstract mixin class _$QuietSpellCopyWith<$Res> implements $QuietSpellCopyWith<$Res> {
  factory _$QuietSpellCopyWith(_QuietSpell value, $Res Function(_QuietSpell) _then) = __$QuietSpellCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'last_filed') String lastFiled,@JsonKey(name: 'silent_days') int silentDays,@JsonKey(name: 'typical_gap') int typicalGap, int filings
});




}
/// @nodoc
class __$QuietSpellCopyWithImpl<$Res>
    implements _$QuietSpellCopyWith<$Res> {
  __$QuietSpellCopyWithImpl(this._self, this._then);

  final _QuietSpell _self;
  final $Res Function(_QuietSpell) _then;

/// Create a copy of QuietSpell
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? lastFiled = null,Object? silentDays = null,Object? typicalGap = null,Object? filings = null,}) {
  return _then(_QuietSpell(
lastFiled: null == lastFiled ? _self.lastFiled : lastFiled // ignore: cast_nullable_to_non_nullable
as String,silentDays: null == silentDays ? _self.silentDays : silentDays // ignore: cast_nullable_to_non_nullable
as int,typicalGap: null == typicalGap ? _self.typicalGap : typicalGap // ignore: cast_nullable_to_non_nullable
as int,filings: null == filings ? _self.filings : filings // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$ResultsDue {

/// `Q1`, `H1`, `9M` or `FY` — the year-to-date period it would report.
 String get label;@JsonKey(name: 'period_end') String get periodEnd; String get expected;@JsonKey(name: 'window_start') String get windowStart;@JsonKey(name: 'window_end') String get windowEnd; int get observations;
/// Create a copy of ResultsDue
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ResultsDueCopyWith<ResultsDue> get copyWith => _$ResultsDueCopyWithImpl<ResultsDue>(this as ResultsDue, _$identity);

  /// Serializes this ResultsDue to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ResultsDue&&(identical(other.label, label) || other.label == label)&&(identical(other.periodEnd, periodEnd) || other.periodEnd == periodEnd)&&(identical(other.expected, expected) || other.expected == expected)&&(identical(other.windowStart, windowStart) || other.windowStart == windowStart)&&(identical(other.windowEnd, windowEnd) || other.windowEnd == windowEnd)&&(identical(other.observations, observations) || other.observations == observations));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,label,periodEnd,expected,windowStart,windowEnd,observations);

@override
String toString() {
  return 'ResultsDue(label: $label, periodEnd: $periodEnd, expected: $expected, windowStart: $windowStart, windowEnd: $windowEnd, observations: $observations)';
}


}

/// @nodoc
abstract mixin class $ResultsDueCopyWith<$Res>  {
  factory $ResultsDueCopyWith(ResultsDue value, $Res Function(ResultsDue) _then) = _$ResultsDueCopyWithImpl;
@useResult
$Res call({
 String label,@JsonKey(name: 'period_end') String periodEnd, String expected,@JsonKey(name: 'window_start') String windowStart,@JsonKey(name: 'window_end') String windowEnd, int observations
});




}
/// @nodoc
class _$ResultsDueCopyWithImpl<$Res>
    implements $ResultsDueCopyWith<$Res> {
  _$ResultsDueCopyWithImpl(this._self, this._then);

  final ResultsDue _self;
  final $Res Function(ResultsDue) _then;

/// Create a copy of ResultsDue
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? label = null,Object? periodEnd = null,Object? expected = null,Object? windowStart = null,Object? windowEnd = null,Object? observations = null,}) {
  return _then(_self.copyWith(
label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,periodEnd: null == periodEnd ? _self.periodEnd : periodEnd // ignore: cast_nullable_to_non_nullable
as String,expected: null == expected ? _self.expected : expected // ignore: cast_nullable_to_non_nullable
as String,windowStart: null == windowStart ? _self.windowStart : windowStart // ignore: cast_nullable_to_non_nullable
as String,windowEnd: null == windowEnd ? _self.windowEnd : windowEnd // ignore: cast_nullable_to_non_nullable
as String,observations: null == observations ? _self.observations : observations // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [ResultsDue].
extension ResultsDuePatterns on ResultsDue {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ResultsDue value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ResultsDue() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ResultsDue value)  $default,){
final _that = this;
switch (_that) {
case _ResultsDue():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ResultsDue value)?  $default,){
final _that = this;
switch (_that) {
case _ResultsDue() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String label, @JsonKey(name: 'period_end')  String periodEnd,  String expected, @JsonKey(name: 'window_start')  String windowStart, @JsonKey(name: 'window_end')  String windowEnd,  int observations)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ResultsDue() when $default != null:
return $default(_that.label,_that.periodEnd,_that.expected,_that.windowStart,_that.windowEnd,_that.observations);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String label, @JsonKey(name: 'period_end')  String periodEnd,  String expected, @JsonKey(name: 'window_start')  String windowStart, @JsonKey(name: 'window_end')  String windowEnd,  int observations)  $default,) {final _that = this;
switch (_that) {
case _ResultsDue():
return $default(_that.label,_that.periodEnd,_that.expected,_that.windowStart,_that.windowEnd,_that.observations);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String label, @JsonKey(name: 'period_end')  String periodEnd,  String expected, @JsonKey(name: 'window_start')  String windowStart, @JsonKey(name: 'window_end')  String windowEnd,  int observations)?  $default,) {final _that = this;
switch (_that) {
case _ResultsDue() when $default != null:
return $default(_that.label,_that.periodEnd,_that.expected,_that.windowStart,_that.windowEnd,_that.observations);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ResultsDue extends ResultsDue {
  const _ResultsDue({this.label = '', @JsonKey(name: 'period_end') this.periodEnd = '', this.expected = '', @JsonKey(name: 'window_start') this.windowStart = '', @JsonKey(name: 'window_end') this.windowEnd = '', this.observations = 0}): super._();
  factory _ResultsDue.fromJson(Map<String, dynamic> json) => _$ResultsDueFromJson(json);

/// `Q1`, `H1`, `9M` or `FY` — the year-to-date period it would report.
@override@JsonKey() final  String label;
@override@JsonKey(name: 'period_end') final  String periodEnd;
@override@JsonKey() final  String expected;
@override@JsonKey(name: 'window_start') final  String windowStart;
@override@JsonKey(name: 'window_end') final  String windowEnd;
@override@JsonKey() final  int observations;

/// Create a copy of ResultsDue
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ResultsDueCopyWith<_ResultsDue> get copyWith => __$ResultsDueCopyWithImpl<_ResultsDue>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ResultsDueToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ResultsDue&&(identical(other.label, label) || other.label == label)&&(identical(other.periodEnd, periodEnd) || other.periodEnd == periodEnd)&&(identical(other.expected, expected) || other.expected == expected)&&(identical(other.windowStart, windowStart) || other.windowStart == windowStart)&&(identical(other.windowEnd, windowEnd) || other.windowEnd == windowEnd)&&(identical(other.observations, observations) || other.observations == observations));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,label,periodEnd,expected,windowStart,windowEnd,observations);

@override
String toString() {
  return 'ResultsDue(label: $label, periodEnd: $periodEnd, expected: $expected, windowStart: $windowStart, windowEnd: $windowEnd, observations: $observations)';
}


}

/// @nodoc
abstract mixin class _$ResultsDueCopyWith<$Res> implements $ResultsDueCopyWith<$Res> {
  factory _$ResultsDueCopyWith(_ResultsDue value, $Res Function(_ResultsDue) _then) = __$ResultsDueCopyWithImpl;
@override @useResult
$Res call({
 String label,@JsonKey(name: 'period_end') String periodEnd, String expected,@JsonKey(name: 'window_start') String windowStart,@JsonKey(name: 'window_end') String windowEnd, int observations
});




}
/// @nodoc
class __$ResultsDueCopyWithImpl<$Res>
    implements _$ResultsDueCopyWith<$Res> {
  __$ResultsDueCopyWithImpl(this._self, this._then);

  final _ResultsDue _self;
  final $Res Function(_ResultsDue) _then;

/// Create a copy of ResultsDue
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? label = null,Object? periodEnd = null,Object? expected = null,Object? windowStart = null,Object? windowEnd = null,Object? observations = null,}) {
  return _then(_ResultsDue(
label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,periodEnd: null == periodEnd ? _self.periodEnd : periodEnd // ignore: cast_nullable_to_non_nullable
as String,expected: null == expected ? _self.expected : expected // ignore: cast_nullable_to_non_nullable
as String,windowStart: null == windowStart ? _self.windowStart : windowStart // ignore: cast_nullable_to_non_nullable
as String,windowEnd: null == windowEnd ? _self.windowEnd : windowEnd // ignore: cast_nullable_to_non_nullable
as String,observations: null == observations ? _self.observations : observations // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$SignalProfile {

 int get filings;@JsonKey(name: 'first_filing') String? get firstFiling;@JsonKey(name: 'last_filing') String? get lastFiling;@JsonKey(name: 'busiest_year') String? get busiestYear;@JsonKey(name: 'busiest_year_filings') int get busiestYearFilings;@JsonKey(name: 'periods_reported') int get periodsReported;@JsonKey(name: 'loss_making_periods') int get lossMakingPeriods;@JsonKey(name: 'profitable_periods') int get profitablePeriods;
/// Create a copy of SignalProfile
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SignalProfileCopyWith<SignalProfile> get copyWith => _$SignalProfileCopyWithImpl<SignalProfile>(this as SignalProfile, _$identity);

  /// Serializes this SignalProfile to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SignalProfile&&(identical(other.filings, filings) || other.filings == filings)&&(identical(other.firstFiling, firstFiling) || other.firstFiling == firstFiling)&&(identical(other.lastFiling, lastFiling) || other.lastFiling == lastFiling)&&(identical(other.busiestYear, busiestYear) || other.busiestYear == busiestYear)&&(identical(other.busiestYearFilings, busiestYearFilings) || other.busiestYearFilings == busiestYearFilings)&&(identical(other.periodsReported, periodsReported) || other.periodsReported == periodsReported)&&(identical(other.lossMakingPeriods, lossMakingPeriods) || other.lossMakingPeriods == lossMakingPeriods)&&(identical(other.profitablePeriods, profitablePeriods) || other.profitablePeriods == profitablePeriods));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,filings,firstFiling,lastFiling,busiestYear,busiestYearFilings,periodsReported,lossMakingPeriods,profitablePeriods);

@override
String toString() {
  return 'SignalProfile(filings: $filings, firstFiling: $firstFiling, lastFiling: $lastFiling, busiestYear: $busiestYear, busiestYearFilings: $busiestYearFilings, periodsReported: $periodsReported, lossMakingPeriods: $lossMakingPeriods, profitablePeriods: $profitablePeriods)';
}


}

/// @nodoc
abstract mixin class $SignalProfileCopyWith<$Res>  {
  factory $SignalProfileCopyWith(SignalProfile value, $Res Function(SignalProfile) _then) = _$SignalProfileCopyWithImpl;
@useResult
$Res call({
 int filings,@JsonKey(name: 'first_filing') String? firstFiling,@JsonKey(name: 'last_filing') String? lastFiling,@JsonKey(name: 'busiest_year') String? busiestYear,@JsonKey(name: 'busiest_year_filings') int busiestYearFilings,@JsonKey(name: 'periods_reported') int periodsReported,@JsonKey(name: 'loss_making_periods') int lossMakingPeriods,@JsonKey(name: 'profitable_periods') int profitablePeriods
});




}
/// @nodoc
class _$SignalProfileCopyWithImpl<$Res>
    implements $SignalProfileCopyWith<$Res> {
  _$SignalProfileCopyWithImpl(this._self, this._then);

  final SignalProfile _self;
  final $Res Function(SignalProfile) _then;

/// Create a copy of SignalProfile
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? filings = null,Object? firstFiling = freezed,Object? lastFiling = freezed,Object? busiestYear = freezed,Object? busiestYearFilings = null,Object? periodsReported = null,Object? lossMakingPeriods = null,Object? profitablePeriods = null,}) {
  return _then(_self.copyWith(
filings: null == filings ? _self.filings : filings // ignore: cast_nullable_to_non_nullable
as int,firstFiling: freezed == firstFiling ? _self.firstFiling : firstFiling // ignore: cast_nullable_to_non_nullable
as String?,lastFiling: freezed == lastFiling ? _self.lastFiling : lastFiling // ignore: cast_nullable_to_non_nullable
as String?,busiestYear: freezed == busiestYear ? _self.busiestYear : busiestYear // ignore: cast_nullable_to_non_nullable
as String?,busiestYearFilings: null == busiestYearFilings ? _self.busiestYearFilings : busiestYearFilings // ignore: cast_nullable_to_non_nullable
as int,periodsReported: null == periodsReported ? _self.periodsReported : periodsReported // ignore: cast_nullable_to_non_nullable
as int,lossMakingPeriods: null == lossMakingPeriods ? _self.lossMakingPeriods : lossMakingPeriods // ignore: cast_nullable_to_non_nullable
as int,profitablePeriods: null == profitablePeriods ? _self.profitablePeriods : profitablePeriods // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [SignalProfile].
extension SignalProfilePatterns on SignalProfile {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SignalProfile value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SignalProfile() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SignalProfile value)  $default,){
final _that = this;
switch (_that) {
case _SignalProfile():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SignalProfile value)?  $default,){
final _that = this;
switch (_that) {
case _SignalProfile() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int filings, @JsonKey(name: 'first_filing')  String? firstFiling, @JsonKey(name: 'last_filing')  String? lastFiling, @JsonKey(name: 'busiest_year')  String? busiestYear, @JsonKey(name: 'busiest_year_filings')  int busiestYearFilings, @JsonKey(name: 'periods_reported')  int periodsReported, @JsonKey(name: 'loss_making_periods')  int lossMakingPeriods, @JsonKey(name: 'profitable_periods')  int profitablePeriods)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SignalProfile() when $default != null:
return $default(_that.filings,_that.firstFiling,_that.lastFiling,_that.busiestYear,_that.busiestYearFilings,_that.periodsReported,_that.lossMakingPeriods,_that.profitablePeriods);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int filings, @JsonKey(name: 'first_filing')  String? firstFiling, @JsonKey(name: 'last_filing')  String? lastFiling, @JsonKey(name: 'busiest_year')  String? busiestYear, @JsonKey(name: 'busiest_year_filings')  int busiestYearFilings, @JsonKey(name: 'periods_reported')  int periodsReported, @JsonKey(name: 'loss_making_periods')  int lossMakingPeriods, @JsonKey(name: 'profitable_periods')  int profitablePeriods)  $default,) {final _that = this;
switch (_that) {
case _SignalProfile():
return $default(_that.filings,_that.firstFiling,_that.lastFiling,_that.busiestYear,_that.busiestYearFilings,_that.periodsReported,_that.lossMakingPeriods,_that.profitablePeriods);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int filings, @JsonKey(name: 'first_filing')  String? firstFiling, @JsonKey(name: 'last_filing')  String? lastFiling, @JsonKey(name: 'busiest_year')  String? busiestYear, @JsonKey(name: 'busiest_year_filings')  int busiestYearFilings, @JsonKey(name: 'periods_reported')  int periodsReported, @JsonKey(name: 'loss_making_periods')  int lossMakingPeriods, @JsonKey(name: 'profitable_periods')  int profitablePeriods)?  $default,) {final _that = this;
switch (_that) {
case _SignalProfile() when $default != null:
return $default(_that.filings,_that.firstFiling,_that.lastFiling,_that.busiestYear,_that.busiestYearFilings,_that.periodsReported,_that.lossMakingPeriods,_that.profitablePeriods);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SignalProfile implements SignalProfile {
  const _SignalProfile({this.filings = 0, @JsonKey(name: 'first_filing') this.firstFiling, @JsonKey(name: 'last_filing') this.lastFiling, @JsonKey(name: 'busiest_year') this.busiestYear, @JsonKey(name: 'busiest_year_filings') this.busiestYearFilings = 0, @JsonKey(name: 'periods_reported') this.periodsReported = 0, @JsonKey(name: 'loss_making_periods') this.lossMakingPeriods = 0, @JsonKey(name: 'profitable_periods') this.profitablePeriods = 0});
  factory _SignalProfile.fromJson(Map<String, dynamic> json) => _$SignalProfileFromJson(json);

@override@JsonKey() final  int filings;
@override@JsonKey(name: 'first_filing') final  String? firstFiling;
@override@JsonKey(name: 'last_filing') final  String? lastFiling;
@override@JsonKey(name: 'busiest_year') final  String? busiestYear;
@override@JsonKey(name: 'busiest_year_filings') final  int busiestYearFilings;
@override@JsonKey(name: 'periods_reported') final  int periodsReported;
@override@JsonKey(name: 'loss_making_periods') final  int lossMakingPeriods;
@override@JsonKey(name: 'profitable_periods') final  int profitablePeriods;

/// Create a copy of SignalProfile
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SignalProfileCopyWith<_SignalProfile> get copyWith => __$SignalProfileCopyWithImpl<_SignalProfile>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SignalProfileToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SignalProfile&&(identical(other.filings, filings) || other.filings == filings)&&(identical(other.firstFiling, firstFiling) || other.firstFiling == firstFiling)&&(identical(other.lastFiling, lastFiling) || other.lastFiling == lastFiling)&&(identical(other.busiestYear, busiestYear) || other.busiestYear == busiestYear)&&(identical(other.busiestYearFilings, busiestYearFilings) || other.busiestYearFilings == busiestYearFilings)&&(identical(other.periodsReported, periodsReported) || other.periodsReported == periodsReported)&&(identical(other.lossMakingPeriods, lossMakingPeriods) || other.lossMakingPeriods == lossMakingPeriods)&&(identical(other.profitablePeriods, profitablePeriods) || other.profitablePeriods == profitablePeriods));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,filings,firstFiling,lastFiling,busiestYear,busiestYearFilings,periodsReported,lossMakingPeriods,profitablePeriods);

@override
String toString() {
  return 'SignalProfile(filings: $filings, firstFiling: $firstFiling, lastFiling: $lastFiling, busiestYear: $busiestYear, busiestYearFilings: $busiestYearFilings, periodsReported: $periodsReported, lossMakingPeriods: $lossMakingPeriods, profitablePeriods: $profitablePeriods)';
}


}

/// @nodoc
abstract mixin class _$SignalProfileCopyWith<$Res> implements $SignalProfileCopyWith<$Res> {
  factory _$SignalProfileCopyWith(_SignalProfile value, $Res Function(_SignalProfile) _then) = __$SignalProfileCopyWithImpl;
@override @useResult
$Res call({
 int filings,@JsonKey(name: 'first_filing') String? firstFiling,@JsonKey(name: 'last_filing') String? lastFiling,@JsonKey(name: 'busiest_year') String? busiestYear,@JsonKey(name: 'busiest_year_filings') int busiestYearFilings,@JsonKey(name: 'periods_reported') int periodsReported,@JsonKey(name: 'loss_making_periods') int lossMakingPeriods,@JsonKey(name: 'profitable_periods') int profitablePeriods
});




}
/// @nodoc
class __$SignalProfileCopyWithImpl<$Res>
    implements _$SignalProfileCopyWith<$Res> {
  __$SignalProfileCopyWithImpl(this._self, this._then);

  final _SignalProfile _self;
  final $Res Function(_SignalProfile) _then;

/// Create a copy of SignalProfile
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? filings = null,Object? firstFiling = freezed,Object? lastFiling = freezed,Object? busiestYear = freezed,Object? busiestYearFilings = null,Object? periodsReported = null,Object? lossMakingPeriods = null,Object? profitablePeriods = null,}) {
  return _then(_SignalProfile(
filings: null == filings ? _self.filings : filings // ignore: cast_nullable_to_non_nullable
as int,firstFiling: freezed == firstFiling ? _self.firstFiling : firstFiling // ignore: cast_nullable_to_non_nullable
as String?,lastFiling: freezed == lastFiling ? _self.lastFiling : lastFiling // ignore: cast_nullable_to_non_nullable
as String?,busiestYear: freezed == busiestYear ? _self.busiestYear : busiestYear // ignore: cast_nullable_to_non_nullable
as String?,busiestYearFilings: null == busiestYearFilings ? _self.busiestYearFilings : busiestYearFilings // ignore: cast_nullable_to_non_nullable
as int,periodsReported: null == periodsReported ? _self.periodsReported : periodsReported // ignore: cast_nullable_to_non_nullable
as int,lossMakingPeriods: null == lossMakingPeriods ? _self.lossMakingPeriods : lossMakingPeriods // ignore: cast_nullable_to_non_nullable
as int,profitablePeriods: null == profitablePeriods ? _self.profitablePeriods : profitablePeriods // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$SignalsIndex {

 String? get generated; List<MarketSignal> get firsts; List<MarketQuiet> get quiet; int get companies;
/// Create a copy of SignalsIndex
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SignalsIndexCopyWith<SignalsIndex> get copyWith => _$SignalsIndexCopyWithImpl<SignalsIndex>(this as SignalsIndex, _$identity);

  /// Serializes this SignalsIndex to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SignalsIndex&&(identical(other.generated, generated) || other.generated == generated)&&const DeepCollectionEquality().equals(other.firsts, firsts)&&const DeepCollectionEquality().equals(other.quiet, quiet)&&(identical(other.companies, companies) || other.companies == companies));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,generated,const DeepCollectionEquality().hash(firsts),const DeepCollectionEquality().hash(quiet),companies);

@override
String toString() {
  return 'SignalsIndex(generated: $generated, firsts: $firsts, quiet: $quiet, companies: $companies)';
}


}

/// @nodoc
abstract mixin class $SignalsIndexCopyWith<$Res>  {
  factory $SignalsIndexCopyWith(SignalsIndex value, $Res Function(SignalsIndex) _then) = _$SignalsIndexCopyWithImpl;
@useResult
$Res call({
 String? generated, List<MarketSignal> firsts, List<MarketQuiet> quiet, int companies
});




}
/// @nodoc
class _$SignalsIndexCopyWithImpl<$Res>
    implements $SignalsIndexCopyWith<$Res> {
  _$SignalsIndexCopyWithImpl(this._self, this._then);

  final SignalsIndex _self;
  final $Res Function(SignalsIndex) _then;

/// Create a copy of SignalsIndex
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? generated = freezed,Object? firsts = null,Object? quiet = null,Object? companies = null,}) {
  return _then(_self.copyWith(
generated: freezed == generated ? _self.generated : generated // ignore: cast_nullable_to_non_nullable
as String?,firsts: null == firsts ? _self.firsts : firsts // ignore: cast_nullable_to_non_nullable
as List<MarketSignal>,quiet: null == quiet ? _self.quiet : quiet // ignore: cast_nullable_to_non_nullable
as List<MarketQuiet>,companies: null == companies ? _self.companies : companies // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [SignalsIndex].
extension SignalsIndexPatterns on SignalsIndex {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SignalsIndex value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SignalsIndex() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SignalsIndex value)  $default,){
final _that = this;
switch (_that) {
case _SignalsIndex():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SignalsIndex value)?  $default,){
final _that = this;
switch (_that) {
case _SignalsIndex() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? generated,  List<MarketSignal> firsts,  List<MarketQuiet> quiet,  int companies)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SignalsIndex() when $default != null:
return $default(_that.generated,_that.firsts,_that.quiet,_that.companies);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? generated,  List<MarketSignal> firsts,  List<MarketQuiet> quiet,  int companies)  $default,) {final _that = this;
switch (_that) {
case _SignalsIndex():
return $default(_that.generated,_that.firsts,_that.quiet,_that.companies);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? generated,  List<MarketSignal> firsts,  List<MarketQuiet> quiet,  int companies)?  $default,) {final _that = this;
switch (_that) {
case _SignalsIndex() when $default != null:
return $default(_that.generated,_that.firsts,_that.quiet,_that.companies);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SignalsIndex extends SignalsIndex {
  const _SignalsIndex({this.generated, final  List<MarketSignal> firsts = const <MarketSignal>[], final  List<MarketQuiet> quiet = const <MarketQuiet>[], this.companies = 0}): _firsts = firsts,_quiet = quiet,super._();
  factory _SignalsIndex.fromJson(Map<String, dynamic> json) => _$SignalsIndexFromJson(json);

@override final  String? generated;
 final  List<MarketSignal> _firsts;
@override@JsonKey() List<MarketSignal> get firsts {
  if (_firsts is EqualUnmodifiableListView) return _firsts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_firsts);
}

 final  List<MarketQuiet> _quiet;
@override@JsonKey() List<MarketQuiet> get quiet {
  if (_quiet is EqualUnmodifiableListView) return _quiet;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_quiet);
}

@override@JsonKey() final  int companies;

/// Create a copy of SignalsIndex
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SignalsIndexCopyWith<_SignalsIndex> get copyWith => __$SignalsIndexCopyWithImpl<_SignalsIndex>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SignalsIndexToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SignalsIndex&&(identical(other.generated, generated) || other.generated == generated)&&const DeepCollectionEquality().equals(other._firsts, _firsts)&&const DeepCollectionEquality().equals(other._quiet, _quiet)&&(identical(other.companies, companies) || other.companies == companies));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,generated,const DeepCollectionEquality().hash(_firsts),const DeepCollectionEquality().hash(_quiet),companies);

@override
String toString() {
  return 'SignalsIndex(generated: $generated, firsts: $firsts, quiet: $quiet, companies: $companies)';
}


}

/// @nodoc
abstract mixin class _$SignalsIndexCopyWith<$Res> implements $SignalsIndexCopyWith<$Res> {
  factory _$SignalsIndexCopyWith(_SignalsIndex value, $Res Function(_SignalsIndex) _then) = __$SignalsIndexCopyWithImpl;
@override @useResult
$Res call({
 String? generated, List<MarketSignal> firsts, List<MarketQuiet> quiet, int companies
});




}
/// @nodoc
class __$SignalsIndexCopyWithImpl<$Res>
    implements _$SignalsIndexCopyWith<$Res> {
  __$SignalsIndexCopyWithImpl(this._self, this._then);

  final _SignalsIndex _self;
  final $Res Function(_SignalsIndex) _then;

/// Create a copy of SignalsIndex
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? generated = freezed,Object? firsts = null,Object? quiet = null,Object? companies = null,}) {
  return _then(_SignalsIndex(
generated: freezed == generated ? _self.generated : generated // ignore: cast_nullable_to_non_nullable
as String?,firsts: null == firsts ? _self._firsts : firsts // ignore: cast_nullable_to_non_nullable
as List<MarketSignal>,quiet: null == quiet ? _self._quiet : quiet // ignore: cast_nullable_to_non_nullable
as List<MarketQuiet>,companies: null == companies ? _self.companies : companies // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$MarketSignal {

 String get ticker; String get name;@JsonKey(name: 'name_ar') String get nameAr; String get kind;// Present on a streak break.
 String get period;@JsonKey(name: 'period_end') String get periodEnd; double get value; int get run; String get since;// Present on a first-in-years.
 String get label;@JsonKey(name: 'label_ar') String get labelAr; String get date;@JsonKey(name: 'gap_days') int get gapDays; String get link;
/// Create a copy of MarketSignal
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MarketSignalCopyWith<MarketSignal> get copyWith => _$MarketSignalCopyWithImpl<MarketSignal>(this as MarketSignal, _$identity);

  /// Serializes this MarketSignal to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MarketSignal&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.name, name) || other.name == name)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.period, period) || other.period == period)&&(identical(other.periodEnd, periodEnd) || other.periodEnd == periodEnd)&&(identical(other.value, value) || other.value == value)&&(identical(other.run, run) || other.run == run)&&(identical(other.since, since) || other.since == since)&&(identical(other.label, label) || other.label == label)&&(identical(other.labelAr, labelAr) || other.labelAr == labelAr)&&(identical(other.date, date) || other.date == date)&&(identical(other.gapDays, gapDays) || other.gapDays == gapDays)&&(identical(other.link, link) || other.link == link));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,name,nameAr,kind,period,periodEnd,value,run,since,label,labelAr,date,gapDays,link);

@override
String toString() {
  return 'MarketSignal(ticker: $ticker, name: $name, nameAr: $nameAr, kind: $kind, period: $period, periodEnd: $periodEnd, value: $value, run: $run, since: $since, label: $label, labelAr: $labelAr, date: $date, gapDays: $gapDays, link: $link)';
}


}

/// @nodoc
abstract mixin class $MarketSignalCopyWith<$Res>  {
  factory $MarketSignalCopyWith(MarketSignal value, $Res Function(MarketSignal) _then) = _$MarketSignalCopyWithImpl;
@useResult
$Res call({
 String ticker, String name,@JsonKey(name: 'name_ar') String nameAr, String kind, String period,@JsonKey(name: 'period_end') String periodEnd, double value, int run, String since, String label,@JsonKey(name: 'label_ar') String labelAr, String date,@JsonKey(name: 'gap_days') int gapDays, String link
});




}
/// @nodoc
class _$MarketSignalCopyWithImpl<$Res>
    implements $MarketSignalCopyWith<$Res> {
  _$MarketSignalCopyWithImpl(this._self, this._then);

  final MarketSignal _self;
  final $Res Function(MarketSignal) _then;

/// Create a copy of MarketSignal
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? name = null,Object? nameAr = null,Object? kind = null,Object? period = null,Object? periodEnd = null,Object? value = null,Object? run = null,Object? since = null,Object? label = null,Object? labelAr = null,Object? date = null,Object? gapDays = null,Object? link = null,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,nameAr: null == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,period: null == period ? _self.period : period // ignore: cast_nullable_to_non_nullable
as String,periodEnd: null == periodEnd ? _self.periodEnd : periodEnd // ignore: cast_nullable_to_non_nullable
as String,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as double,run: null == run ? _self.run : run // ignore: cast_nullable_to_non_nullable
as int,since: null == since ? _self.since : since // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,labelAr: null == labelAr ? _self.labelAr : labelAr // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,gapDays: null == gapDays ? _self.gapDays : gapDays // ignore: cast_nullable_to_non_nullable
as int,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [MarketSignal].
extension MarketSignalPatterns on MarketSignal {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MarketSignal value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MarketSignal() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MarketSignal value)  $default,){
final _that = this;
switch (_that) {
case _MarketSignal():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MarketSignal value)?  $default,){
final _that = this;
switch (_that) {
case _MarketSignal() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker,  String name, @JsonKey(name: 'name_ar')  String nameAr,  String kind,  String period, @JsonKey(name: 'period_end')  String periodEnd,  double value,  int run,  String since,  String label, @JsonKey(name: 'label_ar')  String labelAr,  String date, @JsonKey(name: 'gap_days')  int gapDays,  String link)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MarketSignal() when $default != null:
return $default(_that.ticker,_that.name,_that.nameAr,_that.kind,_that.period,_that.periodEnd,_that.value,_that.run,_that.since,_that.label,_that.labelAr,_that.date,_that.gapDays,_that.link);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker,  String name, @JsonKey(name: 'name_ar')  String nameAr,  String kind,  String period, @JsonKey(name: 'period_end')  String periodEnd,  double value,  int run,  String since,  String label, @JsonKey(name: 'label_ar')  String labelAr,  String date, @JsonKey(name: 'gap_days')  int gapDays,  String link)  $default,) {final _that = this;
switch (_that) {
case _MarketSignal():
return $default(_that.ticker,_that.name,_that.nameAr,_that.kind,_that.period,_that.periodEnd,_that.value,_that.run,_that.since,_that.label,_that.labelAr,_that.date,_that.gapDays,_that.link);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker,  String name, @JsonKey(name: 'name_ar')  String nameAr,  String kind,  String period, @JsonKey(name: 'period_end')  String periodEnd,  double value,  int run,  String since,  String label, @JsonKey(name: 'label_ar')  String labelAr,  String date, @JsonKey(name: 'gap_days')  int gapDays,  String link)?  $default,) {final _that = this;
switch (_that) {
case _MarketSignal() when $default != null:
return $default(_that.ticker,_that.name,_that.nameAr,_that.kind,_that.period,_that.periodEnd,_that.value,_that.run,_that.since,_that.label,_that.labelAr,_that.date,_that.gapDays,_that.link);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MarketSignal extends MarketSignal {
  const _MarketSignal({this.ticker = '', this.name = '', @JsonKey(name: 'name_ar') this.nameAr = '', this.kind = '', this.period = '', @JsonKey(name: 'period_end') this.periodEnd = '', this.value = 0, this.run = 0, this.since = '', this.label = '', @JsonKey(name: 'label_ar') this.labelAr = '', this.date = '', @JsonKey(name: 'gap_days') this.gapDays = 0, this.link = ''}): super._();
  factory _MarketSignal.fromJson(Map<String, dynamic> json) => _$MarketSignalFromJson(json);

@override@JsonKey() final  String ticker;
@override@JsonKey() final  String name;
@override@JsonKey(name: 'name_ar') final  String nameAr;
@override@JsonKey() final  String kind;
// Present on a streak break.
@override@JsonKey() final  String period;
@override@JsonKey(name: 'period_end') final  String periodEnd;
@override@JsonKey() final  double value;
@override@JsonKey() final  int run;
@override@JsonKey() final  String since;
// Present on a first-in-years.
@override@JsonKey() final  String label;
@override@JsonKey(name: 'label_ar') final  String labelAr;
@override@JsonKey() final  String date;
@override@JsonKey(name: 'gap_days') final  int gapDays;
@override@JsonKey() final  String link;

/// Create a copy of MarketSignal
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MarketSignalCopyWith<_MarketSignal> get copyWith => __$MarketSignalCopyWithImpl<_MarketSignal>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MarketSignalToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MarketSignal&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.name, name) || other.name == name)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.period, period) || other.period == period)&&(identical(other.periodEnd, periodEnd) || other.periodEnd == periodEnd)&&(identical(other.value, value) || other.value == value)&&(identical(other.run, run) || other.run == run)&&(identical(other.since, since) || other.since == since)&&(identical(other.label, label) || other.label == label)&&(identical(other.labelAr, labelAr) || other.labelAr == labelAr)&&(identical(other.date, date) || other.date == date)&&(identical(other.gapDays, gapDays) || other.gapDays == gapDays)&&(identical(other.link, link) || other.link == link));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,name,nameAr,kind,period,periodEnd,value,run,since,label,labelAr,date,gapDays,link);

@override
String toString() {
  return 'MarketSignal(ticker: $ticker, name: $name, nameAr: $nameAr, kind: $kind, period: $period, periodEnd: $periodEnd, value: $value, run: $run, since: $since, label: $label, labelAr: $labelAr, date: $date, gapDays: $gapDays, link: $link)';
}


}

/// @nodoc
abstract mixin class _$MarketSignalCopyWith<$Res> implements $MarketSignalCopyWith<$Res> {
  factory _$MarketSignalCopyWith(_MarketSignal value, $Res Function(_MarketSignal) _then) = __$MarketSignalCopyWithImpl;
@override @useResult
$Res call({
 String ticker, String name,@JsonKey(name: 'name_ar') String nameAr, String kind, String period,@JsonKey(name: 'period_end') String periodEnd, double value, int run, String since, String label,@JsonKey(name: 'label_ar') String labelAr, String date,@JsonKey(name: 'gap_days') int gapDays, String link
});




}
/// @nodoc
class __$MarketSignalCopyWithImpl<$Res>
    implements _$MarketSignalCopyWith<$Res> {
  __$MarketSignalCopyWithImpl(this._self, this._then);

  final _MarketSignal _self;
  final $Res Function(_MarketSignal) _then;

/// Create a copy of MarketSignal
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? name = null,Object? nameAr = null,Object? kind = null,Object? period = null,Object? periodEnd = null,Object? value = null,Object? run = null,Object? since = null,Object? label = null,Object? labelAr = null,Object? date = null,Object? gapDays = null,Object? link = null,}) {
  return _then(_MarketSignal(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,nameAr: null == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,period: null == period ? _self.period : period // ignore: cast_nullable_to_non_nullable
as String,periodEnd: null == periodEnd ? _self.periodEnd : periodEnd // ignore: cast_nullable_to_non_nullable
as String,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as double,run: null == run ? _self.run : run // ignore: cast_nullable_to_non_nullable
as int,since: null == since ? _self.since : since // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,labelAr: null == labelAr ? _self.labelAr : labelAr // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,gapDays: null == gapDays ? _self.gapDays : gapDays // ignore: cast_nullable_to_non_nullable
as int,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$MarketQuiet {

 String get ticker; String get name;@JsonKey(name: 'name_ar') String get nameAr;@JsonKey(name: 'last_filed') String get lastFiled;@JsonKey(name: 'silent_days') int get silentDays;@JsonKey(name: 'typical_gap') int get typicalGap; int get filings;
/// Create a copy of MarketQuiet
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MarketQuietCopyWith<MarketQuiet> get copyWith => _$MarketQuietCopyWithImpl<MarketQuiet>(this as MarketQuiet, _$identity);

  /// Serializes this MarketQuiet to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MarketQuiet&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.name, name) || other.name == name)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.lastFiled, lastFiled) || other.lastFiled == lastFiled)&&(identical(other.silentDays, silentDays) || other.silentDays == silentDays)&&(identical(other.typicalGap, typicalGap) || other.typicalGap == typicalGap)&&(identical(other.filings, filings) || other.filings == filings));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,name,nameAr,lastFiled,silentDays,typicalGap,filings);

@override
String toString() {
  return 'MarketQuiet(ticker: $ticker, name: $name, nameAr: $nameAr, lastFiled: $lastFiled, silentDays: $silentDays, typicalGap: $typicalGap, filings: $filings)';
}


}

/// @nodoc
abstract mixin class $MarketQuietCopyWith<$Res>  {
  factory $MarketQuietCopyWith(MarketQuiet value, $Res Function(MarketQuiet) _then) = _$MarketQuietCopyWithImpl;
@useResult
$Res call({
 String ticker, String name,@JsonKey(name: 'name_ar') String nameAr,@JsonKey(name: 'last_filed') String lastFiled,@JsonKey(name: 'silent_days') int silentDays,@JsonKey(name: 'typical_gap') int typicalGap, int filings
});




}
/// @nodoc
class _$MarketQuietCopyWithImpl<$Res>
    implements $MarketQuietCopyWith<$Res> {
  _$MarketQuietCopyWithImpl(this._self, this._then);

  final MarketQuiet _self;
  final $Res Function(MarketQuiet) _then;

/// Create a copy of MarketQuiet
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? name = null,Object? nameAr = null,Object? lastFiled = null,Object? silentDays = null,Object? typicalGap = null,Object? filings = null,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,nameAr: null == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String,lastFiled: null == lastFiled ? _self.lastFiled : lastFiled // ignore: cast_nullable_to_non_nullable
as String,silentDays: null == silentDays ? _self.silentDays : silentDays // ignore: cast_nullable_to_non_nullable
as int,typicalGap: null == typicalGap ? _self.typicalGap : typicalGap // ignore: cast_nullable_to_non_nullable
as int,filings: null == filings ? _self.filings : filings // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [MarketQuiet].
extension MarketQuietPatterns on MarketQuiet {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MarketQuiet value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MarketQuiet() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MarketQuiet value)  $default,){
final _that = this;
switch (_that) {
case _MarketQuiet():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MarketQuiet value)?  $default,){
final _that = this;
switch (_that) {
case _MarketQuiet() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker,  String name, @JsonKey(name: 'name_ar')  String nameAr, @JsonKey(name: 'last_filed')  String lastFiled, @JsonKey(name: 'silent_days')  int silentDays, @JsonKey(name: 'typical_gap')  int typicalGap,  int filings)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MarketQuiet() when $default != null:
return $default(_that.ticker,_that.name,_that.nameAr,_that.lastFiled,_that.silentDays,_that.typicalGap,_that.filings);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker,  String name, @JsonKey(name: 'name_ar')  String nameAr, @JsonKey(name: 'last_filed')  String lastFiled, @JsonKey(name: 'silent_days')  int silentDays, @JsonKey(name: 'typical_gap')  int typicalGap,  int filings)  $default,) {final _that = this;
switch (_that) {
case _MarketQuiet():
return $default(_that.ticker,_that.name,_that.nameAr,_that.lastFiled,_that.silentDays,_that.typicalGap,_that.filings);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker,  String name, @JsonKey(name: 'name_ar')  String nameAr, @JsonKey(name: 'last_filed')  String lastFiled, @JsonKey(name: 'silent_days')  int silentDays, @JsonKey(name: 'typical_gap')  int typicalGap,  int filings)?  $default,) {final _that = this;
switch (_that) {
case _MarketQuiet() when $default != null:
return $default(_that.ticker,_that.name,_that.nameAr,_that.lastFiled,_that.silentDays,_that.typicalGap,_that.filings);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MarketQuiet extends MarketQuiet {
  const _MarketQuiet({this.ticker = '', this.name = '', @JsonKey(name: 'name_ar') this.nameAr = '', @JsonKey(name: 'last_filed') this.lastFiled = '', @JsonKey(name: 'silent_days') this.silentDays = 0, @JsonKey(name: 'typical_gap') this.typicalGap = 0, this.filings = 0}): super._();
  factory _MarketQuiet.fromJson(Map<String, dynamic> json) => _$MarketQuietFromJson(json);

@override@JsonKey() final  String ticker;
@override@JsonKey() final  String name;
@override@JsonKey(name: 'name_ar') final  String nameAr;
@override@JsonKey(name: 'last_filed') final  String lastFiled;
@override@JsonKey(name: 'silent_days') final  int silentDays;
@override@JsonKey(name: 'typical_gap') final  int typicalGap;
@override@JsonKey() final  int filings;

/// Create a copy of MarketQuiet
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MarketQuietCopyWith<_MarketQuiet> get copyWith => __$MarketQuietCopyWithImpl<_MarketQuiet>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MarketQuietToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MarketQuiet&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.name, name) || other.name == name)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.lastFiled, lastFiled) || other.lastFiled == lastFiled)&&(identical(other.silentDays, silentDays) || other.silentDays == silentDays)&&(identical(other.typicalGap, typicalGap) || other.typicalGap == typicalGap)&&(identical(other.filings, filings) || other.filings == filings));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,name,nameAr,lastFiled,silentDays,typicalGap,filings);

@override
String toString() {
  return 'MarketQuiet(ticker: $ticker, name: $name, nameAr: $nameAr, lastFiled: $lastFiled, silentDays: $silentDays, typicalGap: $typicalGap, filings: $filings)';
}


}

/// @nodoc
abstract mixin class _$MarketQuietCopyWith<$Res> implements $MarketQuietCopyWith<$Res> {
  factory _$MarketQuietCopyWith(_MarketQuiet value, $Res Function(_MarketQuiet) _then) = __$MarketQuietCopyWithImpl;
@override @useResult
$Res call({
 String ticker, String name,@JsonKey(name: 'name_ar') String nameAr,@JsonKey(name: 'last_filed') String lastFiled,@JsonKey(name: 'silent_days') int silentDays,@JsonKey(name: 'typical_gap') int typicalGap, int filings
});




}
/// @nodoc
class __$MarketQuietCopyWithImpl<$Res>
    implements _$MarketQuietCopyWith<$Res> {
  __$MarketQuietCopyWithImpl(this._self, this._then);

  final _MarketQuiet _self;
  final $Res Function(_MarketQuiet) _then;

/// Create a copy of MarketQuiet
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? name = null,Object? nameAr = null,Object? lastFiled = null,Object? silentDays = null,Object? typicalGap = null,Object? filings = null,}) {
  return _then(_MarketQuiet(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,nameAr: null == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String,lastFiled: null == lastFiled ? _self.lastFiled : lastFiled // ignore: cast_nullable_to_non_nullable
as String,silentDays: null == silentDays ? _self.silentDays : silentDays // ignore: cast_nullable_to_non_nullable
as int,typicalGap: null == typicalGap ? _self.typicalGap : typicalGap // ignore: cast_nullable_to_non_nullable
as int,filings: null == filings ? _self.filings : filings // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
