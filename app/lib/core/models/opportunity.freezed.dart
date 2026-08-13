// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'opportunity.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$OpportunityReport {

 String? get date;@JsonKey(name: 'updated_at') DateTime? get updatedAt;/// The report's own lead line, e.g. "No qualified early opportunity today."
 String? get headline;/// The masthead's stated date, which can lag the cards. [date] is the
/// newest date the report actually carries and is what the app shows.
@JsonKey(name: 'masthead_date') String? get mastheadDate;/// How a name is scored — the nine published components (spec §50).
 List<RubricComponent> get rubric;/// The bands and the reasoning that make the rubric mean something.
 ScoringGuide get scoring; ScannerCoverage get coverage; ScannerSummary get summary; List<ScannedCompany> get qualified; List<ScannedCompany> get watching; List<ScannedCompany> get rejected;/// The published track record, wins and misses alike (spec §7).
 List<ScanOutcome> get outcomes;
/// Create a copy of OpportunityReport
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OpportunityReportCopyWith<OpportunityReport> get copyWith => _$OpportunityReportCopyWithImpl<OpportunityReport>(this as OpportunityReport, _$identity);

  /// Serializes this OpportunityReport to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OpportunityReport&&(identical(other.date, date) || other.date == date)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.headline, headline) || other.headline == headline)&&(identical(other.mastheadDate, mastheadDate) || other.mastheadDate == mastheadDate)&&const DeepCollectionEquality().equals(other.rubric, rubric)&&(identical(other.scoring, scoring) || other.scoring == scoring)&&(identical(other.coverage, coverage) || other.coverage == coverage)&&(identical(other.summary, summary) || other.summary == summary)&&const DeepCollectionEquality().equals(other.qualified, qualified)&&const DeepCollectionEquality().equals(other.watching, watching)&&const DeepCollectionEquality().equals(other.rejected, rejected)&&const DeepCollectionEquality().equals(other.outcomes, outcomes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,updatedAt,headline,mastheadDate,const DeepCollectionEquality().hash(rubric),scoring,coverage,summary,const DeepCollectionEquality().hash(qualified),const DeepCollectionEquality().hash(watching),const DeepCollectionEquality().hash(rejected),const DeepCollectionEquality().hash(outcomes));

@override
String toString() {
  return 'OpportunityReport(date: $date, updatedAt: $updatedAt, headline: $headline, mastheadDate: $mastheadDate, rubric: $rubric, scoring: $scoring, coverage: $coverage, summary: $summary, qualified: $qualified, watching: $watching, rejected: $rejected, outcomes: $outcomes)';
}


}

/// @nodoc
abstract mixin class $OpportunityReportCopyWith<$Res>  {
  factory $OpportunityReportCopyWith(OpportunityReport value, $Res Function(OpportunityReport) _then) = _$OpportunityReportCopyWithImpl;
@useResult
$Res call({
 String? date,@JsonKey(name: 'updated_at') DateTime? updatedAt, String? headline,@JsonKey(name: 'masthead_date') String? mastheadDate, List<RubricComponent> rubric, ScoringGuide scoring, ScannerCoverage coverage, ScannerSummary summary, List<ScannedCompany> qualified, List<ScannedCompany> watching, List<ScannedCompany> rejected, List<ScanOutcome> outcomes
});


$ScoringGuideCopyWith<$Res> get scoring;$ScannerCoverageCopyWith<$Res> get coverage;$ScannerSummaryCopyWith<$Res> get summary;

}
/// @nodoc
class _$OpportunityReportCopyWithImpl<$Res>
    implements $OpportunityReportCopyWith<$Res> {
  _$OpportunityReportCopyWithImpl(this._self, this._then);

  final OpportunityReport _self;
  final $Res Function(OpportunityReport) _then;

/// Create a copy of OpportunityReport
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = freezed,Object? updatedAt = freezed,Object? headline = freezed,Object? mastheadDate = freezed,Object? rubric = null,Object? scoring = null,Object? coverage = null,Object? summary = null,Object? qualified = null,Object? watching = null,Object? rejected = null,Object? outcomes = null,}) {
  return _then(_self.copyWith(
date: freezed == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,headline: freezed == headline ? _self.headline : headline // ignore: cast_nullable_to_non_nullable
as String?,mastheadDate: freezed == mastheadDate ? _self.mastheadDate : mastheadDate // ignore: cast_nullable_to_non_nullable
as String?,rubric: null == rubric ? _self.rubric : rubric // ignore: cast_nullable_to_non_nullable
as List<RubricComponent>,scoring: null == scoring ? _self.scoring : scoring // ignore: cast_nullable_to_non_nullable
as ScoringGuide,coverage: null == coverage ? _self.coverage : coverage // ignore: cast_nullable_to_non_nullable
as ScannerCoverage,summary: null == summary ? _self.summary : summary // ignore: cast_nullable_to_non_nullable
as ScannerSummary,qualified: null == qualified ? _self.qualified : qualified // ignore: cast_nullable_to_non_nullable
as List<ScannedCompany>,watching: null == watching ? _self.watching : watching // ignore: cast_nullable_to_non_nullable
as List<ScannedCompany>,rejected: null == rejected ? _self.rejected : rejected // ignore: cast_nullable_to_non_nullable
as List<ScannedCompany>,outcomes: null == outcomes ? _self.outcomes : outcomes // ignore: cast_nullable_to_non_nullable
as List<ScanOutcome>,
  ));
}
/// Create a copy of OpportunityReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ScoringGuideCopyWith<$Res> get scoring {
  
  return $ScoringGuideCopyWith<$Res>(_self.scoring, (value) {
    return _then(_self.copyWith(scoring: value));
  });
}/// Create a copy of OpportunityReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ScannerCoverageCopyWith<$Res> get coverage {
  
  return $ScannerCoverageCopyWith<$Res>(_self.coverage, (value) {
    return _then(_self.copyWith(coverage: value));
  });
}/// Create a copy of OpportunityReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ScannerSummaryCopyWith<$Res> get summary {
  
  return $ScannerSummaryCopyWith<$Res>(_self.summary, (value) {
    return _then(_self.copyWith(summary: value));
  });
}
}


/// Adds pattern-matching-related methods to [OpportunityReport].
extension OpportunityReportPatterns on OpportunityReport {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OpportunityReport value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OpportunityReport() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OpportunityReport value)  $default,){
final _that = this;
switch (_that) {
case _OpportunityReport():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OpportunityReport value)?  $default,){
final _that = this;
switch (_that) {
case _OpportunityReport() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? date, @JsonKey(name: 'updated_at')  DateTime? updatedAt,  String? headline, @JsonKey(name: 'masthead_date')  String? mastheadDate,  List<RubricComponent> rubric,  ScoringGuide scoring,  ScannerCoverage coverage,  ScannerSummary summary,  List<ScannedCompany> qualified,  List<ScannedCompany> watching,  List<ScannedCompany> rejected,  List<ScanOutcome> outcomes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OpportunityReport() when $default != null:
return $default(_that.date,_that.updatedAt,_that.headline,_that.mastheadDate,_that.rubric,_that.scoring,_that.coverage,_that.summary,_that.qualified,_that.watching,_that.rejected,_that.outcomes);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? date, @JsonKey(name: 'updated_at')  DateTime? updatedAt,  String? headline, @JsonKey(name: 'masthead_date')  String? mastheadDate,  List<RubricComponent> rubric,  ScoringGuide scoring,  ScannerCoverage coverage,  ScannerSummary summary,  List<ScannedCompany> qualified,  List<ScannedCompany> watching,  List<ScannedCompany> rejected,  List<ScanOutcome> outcomes)  $default,) {final _that = this;
switch (_that) {
case _OpportunityReport():
return $default(_that.date,_that.updatedAt,_that.headline,_that.mastheadDate,_that.rubric,_that.scoring,_that.coverage,_that.summary,_that.qualified,_that.watching,_that.rejected,_that.outcomes);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? date, @JsonKey(name: 'updated_at')  DateTime? updatedAt,  String? headline, @JsonKey(name: 'masthead_date')  String? mastheadDate,  List<RubricComponent> rubric,  ScoringGuide scoring,  ScannerCoverage coverage,  ScannerSummary summary,  List<ScannedCompany> qualified,  List<ScannedCompany> watching,  List<ScannedCompany> rejected,  List<ScanOutcome> outcomes)?  $default,) {final _that = this;
switch (_that) {
case _OpportunityReport() when $default != null:
return $default(_that.date,_that.updatedAt,_that.headline,_that.mastheadDate,_that.rubric,_that.scoring,_that.coverage,_that.summary,_that.qualified,_that.watching,_that.rejected,_that.outcomes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OpportunityReport extends OpportunityReport {
  const _OpportunityReport({this.date, @JsonKey(name: 'updated_at') this.updatedAt, this.headline, @JsonKey(name: 'masthead_date') this.mastheadDate, final  List<RubricComponent> rubric = const <RubricComponent>[], this.scoring = const ScoringGuide(), this.coverage = const ScannerCoverage(), this.summary = const ScannerSummary(), final  List<ScannedCompany> qualified = const <ScannedCompany>[], final  List<ScannedCompany> watching = const <ScannedCompany>[], final  List<ScannedCompany> rejected = const <ScannedCompany>[], final  List<ScanOutcome> outcomes = const <ScanOutcome>[]}): _rubric = rubric,_qualified = qualified,_watching = watching,_rejected = rejected,_outcomes = outcomes,super._();
  factory _OpportunityReport.fromJson(Map<String, dynamic> json) => _$OpportunityReportFromJson(json);

@override final  String? date;
@override@JsonKey(name: 'updated_at') final  DateTime? updatedAt;
/// The report's own lead line, e.g. "No qualified early opportunity today."
@override final  String? headline;
/// The masthead's stated date, which can lag the cards. [date] is the
/// newest date the report actually carries and is what the app shows.
@override@JsonKey(name: 'masthead_date') final  String? mastheadDate;
/// How a name is scored — the nine published components (spec §50).
 final  List<RubricComponent> _rubric;
/// How a name is scored — the nine published components (spec §50).
@override@JsonKey() List<RubricComponent> get rubric {
  if (_rubric is EqualUnmodifiableListView) return _rubric;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_rubric);
}

/// The bands and the reasoning that make the rubric mean something.
@override@JsonKey() final  ScoringGuide scoring;
@override@JsonKey() final  ScannerCoverage coverage;
@override@JsonKey() final  ScannerSummary summary;
 final  List<ScannedCompany> _qualified;
@override@JsonKey() List<ScannedCompany> get qualified {
  if (_qualified is EqualUnmodifiableListView) return _qualified;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_qualified);
}

 final  List<ScannedCompany> _watching;
@override@JsonKey() List<ScannedCompany> get watching {
  if (_watching is EqualUnmodifiableListView) return _watching;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_watching);
}

 final  List<ScannedCompany> _rejected;
@override@JsonKey() List<ScannedCompany> get rejected {
  if (_rejected is EqualUnmodifiableListView) return _rejected;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_rejected);
}

/// The published track record, wins and misses alike (spec §7).
 final  List<ScanOutcome> _outcomes;
/// The published track record, wins and misses alike (spec §7).
@override@JsonKey() List<ScanOutcome> get outcomes {
  if (_outcomes is EqualUnmodifiableListView) return _outcomes;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_outcomes);
}


/// Create a copy of OpportunityReport
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OpportunityReportCopyWith<_OpportunityReport> get copyWith => __$OpportunityReportCopyWithImpl<_OpportunityReport>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OpportunityReportToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OpportunityReport&&(identical(other.date, date) || other.date == date)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.headline, headline) || other.headline == headline)&&(identical(other.mastheadDate, mastheadDate) || other.mastheadDate == mastheadDate)&&const DeepCollectionEquality().equals(other._rubric, _rubric)&&(identical(other.scoring, scoring) || other.scoring == scoring)&&(identical(other.coverage, coverage) || other.coverage == coverage)&&(identical(other.summary, summary) || other.summary == summary)&&const DeepCollectionEquality().equals(other._qualified, _qualified)&&const DeepCollectionEquality().equals(other._watching, _watching)&&const DeepCollectionEquality().equals(other._rejected, _rejected)&&const DeepCollectionEquality().equals(other._outcomes, _outcomes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,updatedAt,headline,mastheadDate,const DeepCollectionEquality().hash(_rubric),scoring,coverage,summary,const DeepCollectionEquality().hash(_qualified),const DeepCollectionEquality().hash(_watching),const DeepCollectionEquality().hash(_rejected),const DeepCollectionEquality().hash(_outcomes));

@override
String toString() {
  return 'OpportunityReport(date: $date, updatedAt: $updatedAt, headline: $headline, mastheadDate: $mastheadDate, rubric: $rubric, scoring: $scoring, coverage: $coverage, summary: $summary, qualified: $qualified, watching: $watching, rejected: $rejected, outcomes: $outcomes)';
}


}

/// @nodoc
abstract mixin class _$OpportunityReportCopyWith<$Res> implements $OpportunityReportCopyWith<$Res> {
  factory _$OpportunityReportCopyWith(_OpportunityReport value, $Res Function(_OpportunityReport) _then) = __$OpportunityReportCopyWithImpl;
@override @useResult
$Res call({
 String? date,@JsonKey(name: 'updated_at') DateTime? updatedAt, String? headline,@JsonKey(name: 'masthead_date') String? mastheadDate, List<RubricComponent> rubric, ScoringGuide scoring, ScannerCoverage coverage, ScannerSummary summary, List<ScannedCompany> qualified, List<ScannedCompany> watching, List<ScannedCompany> rejected, List<ScanOutcome> outcomes
});


@override $ScoringGuideCopyWith<$Res> get scoring;@override $ScannerCoverageCopyWith<$Res> get coverage;@override $ScannerSummaryCopyWith<$Res> get summary;

}
/// @nodoc
class __$OpportunityReportCopyWithImpl<$Res>
    implements _$OpportunityReportCopyWith<$Res> {
  __$OpportunityReportCopyWithImpl(this._self, this._then);

  final _OpportunityReport _self;
  final $Res Function(_OpportunityReport) _then;

/// Create a copy of OpportunityReport
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = freezed,Object? updatedAt = freezed,Object? headline = freezed,Object? mastheadDate = freezed,Object? rubric = null,Object? scoring = null,Object? coverage = null,Object? summary = null,Object? qualified = null,Object? watching = null,Object? rejected = null,Object? outcomes = null,}) {
  return _then(_OpportunityReport(
date: freezed == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,headline: freezed == headline ? _self.headline : headline // ignore: cast_nullable_to_non_nullable
as String?,mastheadDate: freezed == mastheadDate ? _self.mastheadDate : mastheadDate // ignore: cast_nullable_to_non_nullable
as String?,rubric: null == rubric ? _self._rubric : rubric // ignore: cast_nullable_to_non_nullable
as List<RubricComponent>,scoring: null == scoring ? _self.scoring : scoring // ignore: cast_nullable_to_non_nullable
as ScoringGuide,coverage: null == coverage ? _self.coverage : coverage // ignore: cast_nullable_to_non_nullable
as ScannerCoverage,summary: null == summary ? _self.summary : summary // ignore: cast_nullable_to_non_nullable
as ScannerSummary,qualified: null == qualified ? _self._qualified : qualified // ignore: cast_nullable_to_non_nullable
as List<ScannedCompany>,watching: null == watching ? _self._watching : watching // ignore: cast_nullable_to_non_nullable
as List<ScannedCompany>,rejected: null == rejected ? _self._rejected : rejected // ignore: cast_nullable_to_non_nullable
as List<ScannedCompany>,outcomes: null == outcomes ? _self._outcomes : outcomes // ignore: cast_nullable_to_non_nullable
as List<ScanOutcome>,
  ));
}

/// Create a copy of OpportunityReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ScoringGuideCopyWith<$Res> get scoring {
  
  return $ScoringGuideCopyWith<$Res>(_self.scoring, (value) {
    return _then(_self.copyWith(scoring: value));
  });
}/// Create a copy of OpportunityReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ScannerCoverageCopyWith<$Res> get coverage {
  
  return $ScannerCoverageCopyWith<$Res>(_self.coverage, (value) {
    return _then(_self.copyWith(coverage: value));
  });
}/// Create a copy of OpportunityReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ScannerSummaryCopyWith<$Res> get summary {
  
  return $ScannerSummaryCopyWith<$Res>(_self.summary, (value) {
    return _then(_self.copyWith(summary: value));
  });
}
}


/// @nodoc
mixin _$ScannerCoverage {

 int get thndr; int get egx;@JsonKey(name: 'adjusted_histories') int get adjustedHistories;
/// Create a copy of ScannerCoverage
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ScannerCoverageCopyWith<ScannerCoverage> get copyWith => _$ScannerCoverageCopyWithImpl<ScannerCoverage>(this as ScannerCoverage, _$identity);

  /// Serializes this ScannerCoverage to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ScannerCoverage&&(identical(other.thndr, thndr) || other.thndr == thndr)&&(identical(other.egx, egx) || other.egx == egx)&&(identical(other.adjustedHistories, adjustedHistories) || other.adjustedHistories == adjustedHistories));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,thndr,egx,adjustedHistories);

@override
String toString() {
  return 'ScannerCoverage(thndr: $thndr, egx: $egx, adjustedHistories: $adjustedHistories)';
}


}

/// @nodoc
abstract mixin class $ScannerCoverageCopyWith<$Res>  {
  factory $ScannerCoverageCopyWith(ScannerCoverage value, $Res Function(ScannerCoverage) _then) = _$ScannerCoverageCopyWithImpl;
@useResult
$Res call({
 int thndr, int egx,@JsonKey(name: 'adjusted_histories') int adjustedHistories
});




}
/// @nodoc
class _$ScannerCoverageCopyWithImpl<$Res>
    implements $ScannerCoverageCopyWith<$Res> {
  _$ScannerCoverageCopyWithImpl(this._self, this._then);

  final ScannerCoverage _self;
  final $Res Function(ScannerCoverage) _then;

/// Create a copy of ScannerCoverage
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? thndr = null,Object? egx = null,Object? adjustedHistories = null,}) {
  return _then(_self.copyWith(
thndr: null == thndr ? _self.thndr : thndr // ignore: cast_nullable_to_non_nullable
as int,egx: null == egx ? _self.egx : egx // ignore: cast_nullable_to_non_nullable
as int,adjustedHistories: null == adjustedHistories ? _self.adjustedHistories : adjustedHistories // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [ScannerCoverage].
extension ScannerCoveragePatterns on ScannerCoverage {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ScannerCoverage value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ScannerCoverage() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ScannerCoverage value)  $default,){
final _that = this;
switch (_that) {
case _ScannerCoverage():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ScannerCoverage value)?  $default,){
final _that = this;
switch (_that) {
case _ScannerCoverage() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int thndr,  int egx, @JsonKey(name: 'adjusted_histories')  int adjustedHistories)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ScannerCoverage() when $default != null:
return $default(_that.thndr,_that.egx,_that.adjustedHistories);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int thndr,  int egx, @JsonKey(name: 'adjusted_histories')  int adjustedHistories)  $default,) {final _that = this;
switch (_that) {
case _ScannerCoverage():
return $default(_that.thndr,_that.egx,_that.adjustedHistories);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int thndr,  int egx, @JsonKey(name: 'adjusted_histories')  int adjustedHistories)?  $default,) {final _that = this;
switch (_that) {
case _ScannerCoverage() when $default != null:
return $default(_that.thndr,_that.egx,_that.adjustedHistories);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ScannerCoverage extends ScannerCoverage {
  const _ScannerCoverage({this.thndr = 0, this.egx = 0, @JsonKey(name: 'adjusted_histories') this.adjustedHistories = 0}): super._();
  factory _ScannerCoverage.fromJson(Map<String, dynamic> json) => _$ScannerCoverageFromJson(json);

@override@JsonKey() final  int thndr;
@override@JsonKey() final  int egx;
@override@JsonKey(name: 'adjusted_histories') final  int adjustedHistories;

/// Create a copy of ScannerCoverage
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ScannerCoverageCopyWith<_ScannerCoverage> get copyWith => __$ScannerCoverageCopyWithImpl<_ScannerCoverage>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ScannerCoverageToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ScannerCoverage&&(identical(other.thndr, thndr) || other.thndr == thndr)&&(identical(other.egx, egx) || other.egx == egx)&&(identical(other.adjustedHistories, adjustedHistories) || other.adjustedHistories == adjustedHistories));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,thndr,egx,adjustedHistories);

@override
String toString() {
  return 'ScannerCoverage(thndr: $thndr, egx: $egx, adjustedHistories: $adjustedHistories)';
}


}

/// @nodoc
abstract mixin class _$ScannerCoverageCopyWith<$Res> implements $ScannerCoverageCopyWith<$Res> {
  factory _$ScannerCoverageCopyWith(_ScannerCoverage value, $Res Function(_ScannerCoverage) _then) = __$ScannerCoverageCopyWithImpl;
@override @useResult
$Res call({
 int thndr, int egx,@JsonKey(name: 'adjusted_histories') int adjustedHistories
});




}
/// @nodoc
class __$ScannerCoverageCopyWithImpl<$Res>
    implements _$ScannerCoverageCopyWith<$Res> {
  __$ScannerCoverageCopyWithImpl(this._self, this._then);

  final _ScannerCoverage _self;
  final $Res Function(_ScannerCoverage) _then;

/// Create a copy of ScannerCoverage
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? thndr = null,Object? egx = null,Object? adjustedHistories = null,}) {
  return _then(_ScannerCoverage(
thndr: null == thndr ? _self.thndr : thndr // ignore: cast_nullable_to_non_nullable
as int,egx: null == egx ? _self.egx : egx // ignore: cast_nullable_to_non_nullable
as int,adjustedHistories: null == adjustedHistories ? _self.adjustedHistories : adjustedHistories // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$ScannerSummary {

 int get qualified; int get watching; int get rejected;
/// Create a copy of ScannerSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ScannerSummaryCopyWith<ScannerSummary> get copyWith => _$ScannerSummaryCopyWithImpl<ScannerSummary>(this as ScannerSummary, _$identity);

  /// Serializes this ScannerSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ScannerSummary&&(identical(other.qualified, qualified) || other.qualified == qualified)&&(identical(other.watching, watching) || other.watching == watching)&&(identical(other.rejected, rejected) || other.rejected == rejected));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,qualified,watching,rejected);

@override
String toString() {
  return 'ScannerSummary(qualified: $qualified, watching: $watching, rejected: $rejected)';
}


}

/// @nodoc
abstract mixin class $ScannerSummaryCopyWith<$Res>  {
  factory $ScannerSummaryCopyWith(ScannerSummary value, $Res Function(ScannerSummary) _then) = _$ScannerSummaryCopyWithImpl;
@useResult
$Res call({
 int qualified, int watching, int rejected
});




}
/// @nodoc
class _$ScannerSummaryCopyWithImpl<$Res>
    implements $ScannerSummaryCopyWith<$Res> {
  _$ScannerSummaryCopyWithImpl(this._self, this._then);

  final ScannerSummary _self;
  final $Res Function(ScannerSummary) _then;

/// Create a copy of ScannerSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? qualified = null,Object? watching = null,Object? rejected = null,}) {
  return _then(_self.copyWith(
qualified: null == qualified ? _self.qualified : qualified // ignore: cast_nullable_to_non_nullable
as int,watching: null == watching ? _self.watching : watching // ignore: cast_nullable_to_non_nullable
as int,rejected: null == rejected ? _self.rejected : rejected // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [ScannerSummary].
extension ScannerSummaryPatterns on ScannerSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ScannerSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ScannerSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ScannerSummary value)  $default,){
final _that = this;
switch (_that) {
case _ScannerSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ScannerSummary value)?  $default,){
final _that = this;
switch (_that) {
case _ScannerSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int qualified,  int watching,  int rejected)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ScannerSummary() when $default != null:
return $default(_that.qualified,_that.watching,_that.rejected);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int qualified,  int watching,  int rejected)  $default,) {final _that = this;
switch (_that) {
case _ScannerSummary():
return $default(_that.qualified,_that.watching,_that.rejected);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int qualified,  int watching,  int rejected)?  $default,) {final _that = this;
switch (_that) {
case _ScannerSummary() when $default != null:
return $default(_that.qualified,_that.watching,_that.rejected);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ScannerSummary extends ScannerSummary {
  const _ScannerSummary({this.qualified = 0, this.watching = 0, this.rejected = 0}): super._();
  factory _ScannerSummary.fromJson(Map<String, dynamic> json) => _$ScannerSummaryFromJson(json);

@override@JsonKey() final  int qualified;
@override@JsonKey() final  int watching;
@override@JsonKey() final  int rejected;

/// Create a copy of ScannerSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ScannerSummaryCopyWith<_ScannerSummary> get copyWith => __$ScannerSummaryCopyWithImpl<_ScannerSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ScannerSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ScannerSummary&&(identical(other.qualified, qualified) || other.qualified == qualified)&&(identical(other.watching, watching) || other.watching == watching)&&(identical(other.rejected, rejected) || other.rejected == rejected));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,qualified,watching,rejected);

@override
String toString() {
  return 'ScannerSummary(qualified: $qualified, watching: $watching, rejected: $rejected)';
}


}

/// @nodoc
abstract mixin class _$ScannerSummaryCopyWith<$Res> implements $ScannerSummaryCopyWith<$Res> {
  factory _$ScannerSummaryCopyWith(_ScannerSummary value, $Res Function(_ScannerSummary) _then) = __$ScannerSummaryCopyWithImpl;
@override @useResult
$Res call({
 int qualified, int watching, int rejected
});




}
/// @nodoc
class __$ScannerSummaryCopyWithImpl<$Res>
    implements _$ScannerSummaryCopyWith<$Res> {
  __$ScannerSummaryCopyWithImpl(this._self, this._then);

  final _ScannerSummary _self;
  final $Res Function(_ScannerSummary) _then;

/// Create a copy of ScannerSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? qualified = null,Object? watching = null,Object? rejected = null,}) {
  return _then(_ScannerSummary(
qualified: null == qualified ? _self.qualified : qualified // ignore: cast_nullable_to_non_nullable
as int,watching: null == watching ? _self.watching : watching // ignore: cast_nullable_to_non_nullable
as int,rejected: null == rejected ? _self.rejected : rejected // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$ScannedCompany {

 String get ticker; int get score;@JsonKey(name: 'max_score') int get maxScore; String get status;/// The report's own wording — "Persistent watch", "Tape watch" — which is
/// more precise than the bucket and is what readers of the series know.
@JsonKey(name: 'status_label') String? get statusLabel;@JsonKey(name: 'seen_at') String? get seenAt;@JsonKey(name: 'move_percent') String? get movePercent; String? get headline; String? get catalyst;@JsonKey(name: 'published_at') DateTime? get publishedAt; ScanScores get scores;@JsonKey(name: 'research_summary') String? get researchSummary; List<ResearchSource> get sources;
/// Create a copy of ScannedCompany
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ScannedCompanyCopyWith<ScannedCompany> get copyWith => _$ScannedCompanyCopyWithImpl<ScannedCompany>(this as ScannedCompany, _$identity);

  /// Serializes this ScannedCompany to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ScannedCompany&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.score, score) || other.score == score)&&(identical(other.maxScore, maxScore) || other.maxScore == maxScore)&&(identical(other.status, status) || other.status == status)&&(identical(other.statusLabel, statusLabel) || other.statusLabel == statusLabel)&&(identical(other.seenAt, seenAt) || other.seenAt == seenAt)&&(identical(other.movePercent, movePercent) || other.movePercent == movePercent)&&(identical(other.headline, headline) || other.headline == headline)&&(identical(other.catalyst, catalyst) || other.catalyst == catalyst)&&(identical(other.publishedAt, publishedAt) || other.publishedAt == publishedAt)&&(identical(other.scores, scores) || other.scores == scores)&&(identical(other.researchSummary, researchSummary) || other.researchSummary == researchSummary)&&const DeepCollectionEquality().equals(other.sources, sources));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,score,maxScore,status,statusLabel,seenAt,movePercent,headline,catalyst,publishedAt,scores,researchSummary,const DeepCollectionEquality().hash(sources));

@override
String toString() {
  return 'ScannedCompany(ticker: $ticker, score: $score, maxScore: $maxScore, status: $status, statusLabel: $statusLabel, seenAt: $seenAt, movePercent: $movePercent, headline: $headline, catalyst: $catalyst, publishedAt: $publishedAt, scores: $scores, researchSummary: $researchSummary, sources: $sources)';
}


}

/// @nodoc
abstract mixin class $ScannedCompanyCopyWith<$Res>  {
  factory $ScannedCompanyCopyWith(ScannedCompany value, $Res Function(ScannedCompany) _then) = _$ScannedCompanyCopyWithImpl;
@useResult
$Res call({
 String ticker, int score,@JsonKey(name: 'max_score') int maxScore, String status,@JsonKey(name: 'status_label') String? statusLabel,@JsonKey(name: 'seen_at') String? seenAt,@JsonKey(name: 'move_percent') String? movePercent, String? headline, String? catalyst,@JsonKey(name: 'published_at') DateTime? publishedAt, ScanScores scores,@JsonKey(name: 'research_summary') String? researchSummary, List<ResearchSource> sources
});


$ScanScoresCopyWith<$Res> get scores;

}
/// @nodoc
class _$ScannedCompanyCopyWithImpl<$Res>
    implements $ScannedCompanyCopyWith<$Res> {
  _$ScannedCompanyCopyWithImpl(this._self, this._then);

  final ScannedCompany _self;
  final $Res Function(ScannedCompany) _then;

/// Create a copy of ScannedCompany
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? score = null,Object? maxScore = null,Object? status = null,Object? statusLabel = freezed,Object? seenAt = freezed,Object? movePercent = freezed,Object? headline = freezed,Object? catalyst = freezed,Object? publishedAt = freezed,Object? scores = null,Object? researchSummary = freezed,Object? sources = null,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as int,maxScore: null == maxScore ? _self.maxScore : maxScore // ignore: cast_nullable_to_non_nullable
as int,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,statusLabel: freezed == statusLabel ? _self.statusLabel : statusLabel // ignore: cast_nullable_to_non_nullable
as String?,seenAt: freezed == seenAt ? _self.seenAt : seenAt // ignore: cast_nullable_to_non_nullable
as String?,movePercent: freezed == movePercent ? _self.movePercent : movePercent // ignore: cast_nullable_to_non_nullable
as String?,headline: freezed == headline ? _self.headline : headline // ignore: cast_nullable_to_non_nullable
as String?,catalyst: freezed == catalyst ? _self.catalyst : catalyst // ignore: cast_nullable_to_non_nullable
as String?,publishedAt: freezed == publishedAt ? _self.publishedAt : publishedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,scores: null == scores ? _self.scores : scores // ignore: cast_nullable_to_non_nullable
as ScanScores,researchSummary: freezed == researchSummary ? _self.researchSummary : researchSummary // ignore: cast_nullable_to_non_nullable
as String?,sources: null == sources ? _self.sources : sources // ignore: cast_nullable_to_non_nullable
as List<ResearchSource>,
  ));
}
/// Create a copy of ScannedCompany
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ScanScoresCopyWith<$Res> get scores {
  
  return $ScanScoresCopyWith<$Res>(_self.scores, (value) {
    return _then(_self.copyWith(scores: value));
  });
}
}


/// Adds pattern-matching-related methods to [ScannedCompany].
extension ScannedCompanyPatterns on ScannedCompany {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ScannedCompany value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ScannedCompany() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ScannedCompany value)  $default,){
final _that = this;
switch (_that) {
case _ScannedCompany():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ScannedCompany value)?  $default,){
final _that = this;
switch (_that) {
case _ScannedCompany() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker,  int score, @JsonKey(name: 'max_score')  int maxScore,  String status, @JsonKey(name: 'status_label')  String? statusLabel, @JsonKey(name: 'seen_at')  String? seenAt, @JsonKey(name: 'move_percent')  String? movePercent,  String? headline,  String? catalyst, @JsonKey(name: 'published_at')  DateTime? publishedAt,  ScanScores scores, @JsonKey(name: 'research_summary')  String? researchSummary,  List<ResearchSource> sources)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ScannedCompany() when $default != null:
return $default(_that.ticker,_that.score,_that.maxScore,_that.status,_that.statusLabel,_that.seenAt,_that.movePercent,_that.headline,_that.catalyst,_that.publishedAt,_that.scores,_that.researchSummary,_that.sources);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker,  int score, @JsonKey(name: 'max_score')  int maxScore,  String status, @JsonKey(name: 'status_label')  String? statusLabel, @JsonKey(name: 'seen_at')  String? seenAt, @JsonKey(name: 'move_percent')  String? movePercent,  String? headline,  String? catalyst, @JsonKey(name: 'published_at')  DateTime? publishedAt,  ScanScores scores, @JsonKey(name: 'research_summary')  String? researchSummary,  List<ResearchSource> sources)  $default,) {final _that = this;
switch (_that) {
case _ScannedCompany():
return $default(_that.ticker,_that.score,_that.maxScore,_that.status,_that.statusLabel,_that.seenAt,_that.movePercent,_that.headline,_that.catalyst,_that.publishedAt,_that.scores,_that.researchSummary,_that.sources);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker,  int score, @JsonKey(name: 'max_score')  int maxScore,  String status, @JsonKey(name: 'status_label')  String? statusLabel, @JsonKey(name: 'seen_at')  String? seenAt, @JsonKey(name: 'move_percent')  String? movePercent,  String? headline,  String? catalyst, @JsonKey(name: 'published_at')  DateTime? publishedAt,  ScanScores scores, @JsonKey(name: 'research_summary')  String? researchSummary,  List<ResearchSource> sources)?  $default,) {final _that = this;
switch (_that) {
case _ScannedCompany() when $default != null:
return $default(_that.ticker,_that.score,_that.maxScore,_that.status,_that.statusLabel,_that.seenAt,_that.movePercent,_that.headline,_that.catalyst,_that.publishedAt,_that.scores,_that.researchSummary,_that.sources);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ScannedCompany extends ScannedCompany {
  const _ScannedCompany({required this.ticker, this.score = 0, @JsonKey(name: 'max_score') this.maxScore = 13, this.status = 'rejected', @JsonKey(name: 'status_label') this.statusLabel, @JsonKey(name: 'seen_at') this.seenAt, @JsonKey(name: 'move_percent') this.movePercent, this.headline, this.catalyst, @JsonKey(name: 'published_at') this.publishedAt, this.scores = const ScanScores(), @JsonKey(name: 'research_summary') this.researchSummary, final  List<ResearchSource> sources = const <ResearchSource>[]}): _sources = sources,super._();
  factory _ScannedCompany.fromJson(Map<String, dynamic> json) => _$ScannedCompanyFromJson(json);

@override final  String ticker;
@override@JsonKey() final  int score;
@override@JsonKey(name: 'max_score') final  int maxScore;
@override@JsonKey() final  String status;
/// The report's own wording — "Persistent watch", "Tape watch" — which is
/// more precise than the bucket and is what readers of the series know.
@override@JsonKey(name: 'status_label') final  String? statusLabel;
@override@JsonKey(name: 'seen_at') final  String? seenAt;
@override@JsonKey(name: 'move_percent') final  String? movePercent;
@override final  String? headline;
@override final  String? catalyst;
@override@JsonKey(name: 'published_at') final  DateTime? publishedAt;
@override@JsonKey() final  ScanScores scores;
@override@JsonKey(name: 'research_summary') final  String? researchSummary;
 final  List<ResearchSource> _sources;
@override@JsonKey() List<ResearchSource> get sources {
  if (_sources is EqualUnmodifiableListView) return _sources;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_sources);
}


/// Create a copy of ScannedCompany
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ScannedCompanyCopyWith<_ScannedCompany> get copyWith => __$ScannedCompanyCopyWithImpl<_ScannedCompany>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ScannedCompanyToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ScannedCompany&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.score, score) || other.score == score)&&(identical(other.maxScore, maxScore) || other.maxScore == maxScore)&&(identical(other.status, status) || other.status == status)&&(identical(other.statusLabel, statusLabel) || other.statusLabel == statusLabel)&&(identical(other.seenAt, seenAt) || other.seenAt == seenAt)&&(identical(other.movePercent, movePercent) || other.movePercent == movePercent)&&(identical(other.headline, headline) || other.headline == headline)&&(identical(other.catalyst, catalyst) || other.catalyst == catalyst)&&(identical(other.publishedAt, publishedAt) || other.publishedAt == publishedAt)&&(identical(other.scores, scores) || other.scores == scores)&&(identical(other.researchSummary, researchSummary) || other.researchSummary == researchSummary)&&const DeepCollectionEquality().equals(other._sources, _sources));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,score,maxScore,status,statusLabel,seenAt,movePercent,headline,catalyst,publishedAt,scores,researchSummary,const DeepCollectionEquality().hash(_sources));

@override
String toString() {
  return 'ScannedCompany(ticker: $ticker, score: $score, maxScore: $maxScore, status: $status, statusLabel: $statusLabel, seenAt: $seenAt, movePercent: $movePercent, headline: $headline, catalyst: $catalyst, publishedAt: $publishedAt, scores: $scores, researchSummary: $researchSummary, sources: $sources)';
}


}

/// @nodoc
abstract mixin class _$ScannedCompanyCopyWith<$Res> implements $ScannedCompanyCopyWith<$Res> {
  factory _$ScannedCompanyCopyWith(_ScannedCompany value, $Res Function(_ScannedCompany) _then) = __$ScannedCompanyCopyWithImpl;
@override @useResult
$Res call({
 String ticker, int score,@JsonKey(name: 'max_score') int maxScore, String status,@JsonKey(name: 'status_label') String? statusLabel,@JsonKey(name: 'seen_at') String? seenAt,@JsonKey(name: 'move_percent') String? movePercent, String? headline, String? catalyst,@JsonKey(name: 'published_at') DateTime? publishedAt, ScanScores scores,@JsonKey(name: 'research_summary') String? researchSummary, List<ResearchSource> sources
});


@override $ScanScoresCopyWith<$Res> get scores;

}
/// @nodoc
class __$ScannedCompanyCopyWithImpl<$Res>
    implements _$ScannedCompanyCopyWith<$Res> {
  __$ScannedCompanyCopyWithImpl(this._self, this._then);

  final _ScannedCompany _self;
  final $Res Function(_ScannedCompany) _then;

/// Create a copy of ScannedCompany
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? score = null,Object? maxScore = null,Object? status = null,Object? statusLabel = freezed,Object? seenAt = freezed,Object? movePercent = freezed,Object? headline = freezed,Object? catalyst = freezed,Object? publishedAt = freezed,Object? scores = null,Object? researchSummary = freezed,Object? sources = null,}) {
  return _then(_ScannedCompany(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as int,maxScore: null == maxScore ? _self.maxScore : maxScore // ignore: cast_nullable_to_non_nullable
as int,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,statusLabel: freezed == statusLabel ? _self.statusLabel : statusLabel // ignore: cast_nullable_to_non_nullable
as String?,seenAt: freezed == seenAt ? _self.seenAt : seenAt // ignore: cast_nullable_to_non_nullable
as String?,movePercent: freezed == movePercent ? _self.movePercent : movePercent // ignore: cast_nullable_to_non_nullable
as String?,headline: freezed == headline ? _self.headline : headline // ignore: cast_nullable_to_non_nullable
as String?,catalyst: freezed == catalyst ? _self.catalyst : catalyst // ignore: cast_nullable_to_non_nullable
as String?,publishedAt: freezed == publishedAt ? _self.publishedAt : publishedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,scores: null == scores ? _self.scores : scores // ignore: cast_nullable_to_non_nullable
as ScanScores,researchSummary: freezed == researchSummary ? _self.researchSummary : researchSummary // ignore: cast_nullable_to_non_nullable
as String?,sources: null == sources ? _self._sources : sources // ignore: cast_nullable_to_non_nullable
as List<ResearchSource>,
  ));
}

/// Create a copy of ScannedCompany
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ScanScoresCopyWith<$Res> get scores {
  
  return $ScanScoresCopyWith<$Res>(_self.scores, (value) {
    return _then(_self.copyWith(scores: value));
  });
}
}


/// @nodoc
mixin _$ScanScores {

@JsonKey(name: 'fresh_disclosure') int get freshDisclosure;@JsonKey(name: 'economic_importance') int get economicImportance;@JsonKey(name: 'volume_confirmation') int get volumeConfirmation;@JsonKey(name: 'ownership_cluster') int get ownershipCluster;@JsonKey(name: 'dated_catalyst') int get datedCatalyst;@JsonKey(name: 'anti_chasing') int get antiChasing;@JsonKey(name: 'limit_up_penalty') int get limitUpPenalty;@JsonKey(name: 'issuer_denial') int get issuerDenial;@JsonKey(name: 'risk_penalty') int get riskPenalty;
/// Create a copy of ScanScores
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ScanScoresCopyWith<ScanScores> get copyWith => _$ScanScoresCopyWithImpl<ScanScores>(this as ScanScores, _$identity);

  /// Serializes this ScanScores to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ScanScores&&(identical(other.freshDisclosure, freshDisclosure) || other.freshDisclosure == freshDisclosure)&&(identical(other.economicImportance, economicImportance) || other.economicImportance == economicImportance)&&(identical(other.volumeConfirmation, volumeConfirmation) || other.volumeConfirmation == volumeConfirmation)&&(identical(other.ownershipCluster, ownershipCluster) || other.ownershipCluster == ownershipCluster)&&(identical(other.datedCatalyst, datedCatalyst) || other.datedCatalyst == datedCatalyst)&&(identical(other.antiChasing, antiChasing) || other.antiChasing == antiChasing)&&(identical(other.limitUpPenalty, limitUpPenalty) || other.limitUpPenalty == limitUpPenalty)&&(identical(other.issuerDenial, issuerDenial) || other.issuerDenial == issuerDenial)&&(identical(other.riskPenalty, riskPenalty) || other.riskPenalty == riskPenalty));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,freshDisclosure,economicImportance,volumeConfirmation,ownershipCluster,datedCatalyst,antiChasing,limitUpPenalty,issuerDenial,riskPenalty);

@override
String toString() {
  return 'ScanScores(freshDisclosure: $freshDisclosure, economicImportance: $economicImportance, volumeConfirmation: $volumeConfirmation, ownershipCluster: $ownershipCluster, datedCatalyst: $datedCatalyst, antiChasing: $antiChasing, limitUpPenalty: $limitUpPenalty, issuerDenial: $issuerDenial, riskPenalty: $riskPenalty)';
}


}

/// @nodoc
abstract mixin class $ScanScoresCopyWith<$Res>  {
  factory $ScanScoresCopyWith(ScanScores value, $Res Function(ScanScores) _then) = _$ScanScoresCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'fresh_disclosure') int freshDisclosure,@JsonKey(name: 'economic_importance') int economicImportance,@JsonKey(name: 'volume_confirmation') int volumeConfirmation,@JsonKey(name: 'ownership_cluster') int ownershipCluster,@JsonKey(name: 'dated_catalyst') int datedCatalyst,@JsonKey(name: 'anti_chasing') int antiChasing,@JsonKey(name: 'limit_up_penalty') int limitUpPenalty,@JsonKey(name: 'issuer_denial') int issuerDenial,@JsonKey(name: 'risk_penalty') int riskPenalty
});




}
/// @nodoc
class _$ScanScoresCopyWithImpl<$Res>
    implements $ScanScoresCopyWith<$Res> {
  _$ScanScoresCopyWithImpl(this._self, this._then);

  final ScanScores _self;
  final $Res Function(ScanScores) _then;

/// Create a copy of ScanScores
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? freshDisclosure = null,Object? economicImportance = null,Object? volumeConfirmation = null,Object? ownershipCluster = null,Object? datedCatalyst = null,Object? antiChasing = null,Object? limitUpPenalty = null,Object? issuerDenial = null,Object? riskPenalty = null,}) {
  return _then(_self.copyWith(
freshDisclosure: null == freshDisclosure ? _self.freshDisclosure : freshDisclosure // ignore: cast_nullable_to_non_nullable
as int,economicImportance: null == economicImportance ? _self.economicImportance : economicImportance // ignore: cast_nullable_to_non_nullable
as int,volumeConfirmation: null == volumeConfirmation ? _self.volumeConfirmation : volumeConfirmation // ignore: cast_nullable_to_non_nullable
as int,ownershipCluster: null == ownershipCluster ? _self.ownershipCluster : ownershipCluster // ignore: cast_nullable_to_non_nullable
as int,datedCatalyst: null == datedCatalyst ? _self.datedCatalyst : datedCatalyst // ignore: cast_nullable_to_non_nullable
as int,antiChasing: null == antiChasing ? _self.antiChasing : antiChasing // ignore: cast_nullable_to_non_nullable
as int,limitUpPenalty: null == limitUpPenalty ? _self.limitUpPenalty : limitUpPenalty // ignore: cast_nullable_to_non_nullable
as int,issuerDenial: null == issuerDenial ? _self.issuerDenial : issuerDenial // ignore: cast_nullable_to_non_nullable
as int,riskPenalty: null == riskPenalty ? _self.riskPenalty : riskPenalty // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [ScanScores].
extension ScanScoresPatterns on ScanScores {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ScanScores value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ScanScores() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ScanScores value)  $default,){
final _that = this;
switch (_that) {
case _ScanScores():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ScanScores value)?  $default,){
final _that = this;
switch (_that) {
case _ScanScores() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'fresh_disclosure')  int freshDisclosure, @JsonKey(name: 'economic_importance')  int economicImportance, @JsonKey(name: 'volume_confirmation')  int volumeConfirmation, @JsonKey(name: 'ownership_cluster')  int ownershipCluster, @JsonKey(name: 'dated_catalyst')  int datedCatalyst, @JsonKey(name: 'anti_chasing')  int antiChasing, @JsonKey(name: 'limit_up_penalty')  int limitUpPenalty, @JsonKey(name: 'issuer_denial')  int issuerDenial, @JsonKey(name: 'risk_penalty')  int riskPenalty)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ScanScores() when $default != null:
return $default(_that.freshDisclosure,_that.economicImportance,_that.volumeConfirmation,_that.ownershipCluster,_that.datedCatalyst,_that.antiChasing,_that.limitUpPenalty,_that.issuerDenial,_that.riskPenalty);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'fresh_disclosure')  int freshDisclosure, @JsonKey(name: 'economic_importance')  int economicImportance, @JsonKey(name: 'volume_confirmation')  int volumeConfirmation, @JsonKey(name: 'ownership_cluster')  int ownershipCluster, @JsonKey(name: 'dated_catalyst')  int datedCatalyst, @JsonKey(name: 'anti_chasing')  int antiChasing, @JsonKey(name: 'limit_up_penalty')  int limitUpPenalty, @JsonKey(name: 'issuer_denial')  int issuerDenial, @JsonKey(name: 'risk_penalty')  int riskPenalty)  $default,) {final _that = this;
switch (_that) {
case _ScanScores():
return $default(_that.freshDisclosure,_that.economicImportance,_that.volumeConfirmation,_that.ownershipCluster,_that.datedCatalyst,_that.antiChasing,_that.limitUpPenalty,_that.issuerDenial,_that.riskPenalty);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'fresh_disclosure')  int freshDisclosure, @JsonKey(name: 'economic_importance')  int economicImportance, @JsonKey(name: 'volume_confirmation')  int volumeConfirmation, @JsonKey(name: 'ownership_cluster')  int ownershipCluster, @JsonKey(name: 'dated_catalyst')  int datedCatalyst, @JsonKey(name: 'anti_chasing')  int antiChasing, @JsonKey(name: 'limit_up_penalty')  int limitUpPenalty, @JsonKey(name: 'issuer_denial')  int issuerDenial, @JsonKey(name: 'risk_penalty')  int riskPenalty)?  $default,) {final _that = this;
switch (_that) {
case _ScanScores() when $default != null:
return $default(_that.freshDisclosure,_that.economicImportance,_that.volumeConfirmation,_that.ownershipCluster,_that.datedCatalyst,_that.antiChasing,_that.limitUpPenalty,_that.issuerDenial,_that.riskPenalty);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ScanScores extends ScanScores {
  const _ScanScores({@JsonKey(name: 'fresh_disclosure') this.freshDisclosure = 0, @JsonKey(name: 'economic_importance') this.economicImportance = 0, @JsonKey(name: 'volume_confirmation') this.volumeConfirmation = 0, @JsonKey(name: 'ownership_cluster') this.ownershipCluster = 0, @JsonKey(name: 'dated_catalyst') this.datedCatalyst = 0, @JsonKey(name: 'anti_chasing') this.antiChasing = 0, @JsonKey(name: 'limit_up_penalty') this.limitUpPenalty = 0, @JsonKey(name: 'issuer_denial') this.issuerDenial = 0, @JsonKey(name: 'risk_penalty') this.riskPenalty = 0}): super._();
  factory _ScanScores.fromJson(Map<String, dynamic> json) => _$ScanScoresFromJson(json);

@override@JsonKey(name: 'fresh_disclosure') final  int freshDisclosure;
@override@JsonKey(name: 'economic_importance') final  int economicImportance;
@override@JsonKey(name: 'volume_confirmation') final  int volumeConfirmation;
@override@JsonKey(name: 'ownership_cluster') final  int ownershipCluster;
@override@JsonKey(name: 'dated_catalyst') final  int datedCatalyst;
@override@JsonKey(name: 'anti_chasing') final  int antiChasing;
@override@JsonKey(name: 'limit_up_penalty') final  int limitUpPenalty;
@override@JsonKey(name: 'issuer_denial') final  int issuerDenial;
@override@JsonKey(name: 'risk_penalty') final  int riskPenalty;

/// Create a copy of ScanScores
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ScanScoresCopyWith<_ScanScores> get copyWith => __$ScanScoresCopyWithImpl<_ScanScores>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ScanScoresToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ScanScores&&(identical(other.freshDisclosure, freshDisclosure) || other.freshDisclosure == freshDisclosure)&&(identical(other.economicImportance, economicImportance) || other.economicImportance == economicImportance)&&(identical(other.volumeConfirmation, volumeConfirmation) || other.volumeConfirmation == volumeConfirmation)&&(identical(other.ownershipCluster, ownershipCluster) || other.ownershipCluster == ownershipCluster)&&(identical(other.datedCatalyst, datedCatalyst) || other.datedCatalyst == datedCatalyst)&&(identical(other.antiChasing, antiChasing) || other.antiChasing == antiChasing)&&(identical(other.limitUpPenalty, limitUpPenalty) || other.limitUpPenalty == limitUpPenalty)&&(identical(other.issuerDenial, issuerDenial) || other.issuerDenial == issuerDenial)&&(identical(other.riskPenalty, riskPenalty) || other.riskPenalty == riskPenalty));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,freshDisclosure,economicImportance,volumeConfirmation,ownershipCluster,datedCatalyst,antiChasing,limitUpPenalty,issuerDenial,riskPenalty);

@override
String toString() {
  return 'ScanScores(freshDisclosure: $freshDisclosure, economicImportance: $economicImportance, volumeConfirmation: $volumeConfirmation, ownershipCluster: $ownershipCluster, datedCatalyst: $datedCatalyst, antiChasing: $antiChasing, limitUpPenalty: $limitUpPenalty, issuerDenial: $issuerDenial, riskPenalty: $riskPenalty)';
}


}

/// @nodoc
abstract mixin class _$ScanScoresCopyWith<$Res> implements $ScanScoresCopyWith<$Res> {
  factory _$ScanScoresCopyWith(_ScanScores value, $Res Function(_ScanScores) _then) = __$ScanScoresCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'fresh_disclosure') int freshDisclosure,@JsonKey(name: 'economic_importance') int economicImportance,@JsonKey(name: 'volume_confirmation') int volumeConfirmation,@JsonKey(name: 'ownership_cluster') int ownershipCluster,@JsonKey(name: 'dated_catalyst') int datedCatalyst,@JsonKey(name: 'anti_chasing') int antiChasing,@JsonKey(name: 'limit_up_penalty') int limitUpPenalty,@JsonKey(name: 'issuer_denial') int issuerDenial,@JsonKey(name: 'risk_penalty') int riskPenalty
});




}
/// @nodoc
class __$ScanScoresCopyWithImpl<$Res>
    implements _$ScanScoresCopyWith<$Res> {
  __$ScanScoresCopyWithImpl(this._self, this._then);

  final _ScanScores _self;
  final $Res Function(_ScanScores) _then;

/// Create a copy of ScanScores
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? freshDisclosure = null,Object? economicImportance = null,Object? volumeConfirmation = null,Object? ownershipCluster = null,Object? datedCatalyst = null,Object? antiChasing = null,Object? limitUpPenalty = null,Object? issuerDenial = null,Object? riskPenalty = null,}) {
  return _then(_ScanScores(
freshDisclosure: null == freshDisclosure ? _self.freshDisclosure : freshDisclosure // ignore: cast_nullable_to_non_nullable
as int,economicImportance: null == economicImportance ? _self.economicImportance : economicImportance // ignore: cast_nullable_to_non_nullable
as int,volumeConfirmation: null == volumeConfirmation ? _self.volumeConfirmation : volumeConfirmation // ignore: cast_nullable_to_non_nullable
as int,ownershipCluster: null == ownershipCluster ? _self.ownershipCluster : ownershipCluster // ignore: cast_nullable_to_non_nullable
as int,datedCatalyst: null == datedCatalyst ? _self.datedCatalyst : datedCatalyst // ignore: cast_nullable_to_non_nullable
as int,antiChasing: null == antiChasing ? _self.antiChasing : antiChasing // ignore: cast_nullable_to_non_nullable
as int,limitUpPenalty: null == limitUpPenalty ? _self.limitUpPenalty : limitUpPenalty // ignore: cast_nullable_to_non_nullable
as int,issuerDenial: null == issuerDenial ? _self.issuerDenial : issuerDenial // ignore: cast_nullable_to_non_nullable
as int,riskPenalty: null == riskPenalty ? _self.riskPenalty : riskPenalty // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$ScoringGuide {

 List<ScoringBand> get bands; List<String> get notes;
/// Create a copy of ScoringGuide
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ScoringGuideCopyWith<ScoringGuide> get copyWith => _$ScoringGuideCopyWithImpl<ScoringGuide>(this as ScoringGuide, _$identity);

  /// Serializes this ScoringGuide to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ScoringGuide&&const DeepCollectionEquality().equals(other.bands, bands)&&const DeepCollectionEquality().equals(other.notes, notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(bands),const DeepCollectionEquality().hash(notes));

@override
String toString() {
  return 'ScoringGuide(bands: $bands, notes: $notes)';
}


}

/// @nodoc
abstract mixin class $ScoringGuideCopyWith<$Res>  {
  factory $ScoringGuideCopyWith(ScoringGuide value, $Res Function(ScoringGuide) _then) = _$ScoringGuideCopyWithImpl;
@useResult
$Res call({
 List<ScoringBand> bands, List<String> notes
});




}
/// @nodoc
class _$ScoringGuideCopyWithImpl<$Res>
    implements $ScoringGuideCopyWith<$Res> {
  _$ScoringGuideCopyWithImpl(this._self, this._then);

  final ScoringGuide _self;
  final $Res Function(ScoringGuide) _then;

/// Create a copy of ScoringGuide
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? bands = null,Object? notes = null,}) {
  return _then(_self.copyWith(
bands: null == bands ? _self.bands : bands // ignore: cast_nullable_to_non_nullable
as List<ScoringBand>,notes: null == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}

}


/// Adds pattern-matching-related methods to [ScoringGuide].
extension ScoringGuidePatterns on ScoringGuide {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ScoringGuide value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ScoringGuide() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ScoringGuide value)  $default,){
final _that = this;
switch (_that) {
case _ScoringGuide():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ScoringGuide value)?  $default,){
final _that = this;
switch (_that) {
case _ScoringGuide() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<ScoringBand> bands,  List<String> notes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ScoringGuide() when $default != null:
return $default(_that.bands,_that.notes);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<ScoringBand> bands,  List<String> notes)  $default,) {final _that = this;
switch (_that) {
case _ScoringGuide():
return $default(_that.bands,_that.notes);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<ScoringBand> bands,  List<String> notes)?  $default,) {final _that = this;
switch (_that) {
case _ScoringGuide() when $default != null:
return $default(_that.bands,_that.notes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ScoringGuide extends ScoringGuide {
  const _ScoringGuide({final  List<ScoringBand> bands = const <ScoringBand>[], final  List<String> notes = const <String>[]}): _bands = bands,_notes = notes,super._();
  factory _ScoringGuide.fromJson(Map<String, dynamic> json) => _$ScoringGuideFromJson(json);

 final  List<ScoringBand> _bands;
@override@JsonKey() List<ScoringBand> get bands {
  if (_bands is EqualUnmodifiableListView) return _bands;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_bands);
}

 final  List<String> _notes;
@override@JsonKey() List<String> get notes {
  if (_notes is EqualUnmodifiableListView) return _notes;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_notes);
}


/// Create a copy of ScoringGuide
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ScoringGuideCopyWith<_ScoringGuide> get copyWith => __$ScoringGuideCopyWithImpl<_ScoringGuide>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ScoringGuideToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ScoringGuide&&const DeepCollectionEquality().equals(other._bands, _bands)&&const DeepCollectionEquality().equals(other._notes, _notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_bands),const DeepCollectionEquality().hash(_notes));

@override
String toString() {
  return 'ScoringGuide(bands: $bands, notes: $notes)';
}


}

/// @nodoc
abstract mixin class _$ScoringGuideCopyWith<$Res> implements $ScoringGuideCopyWith<$Res> {
  factory _$ScoringGuideCopyWith(_ScoringGuide value, $Res Function(_ScoringGuide) _then) = __$ScoringGuideCopyWithImpl;
@override @useResult
$Res call({
 List<ScoringBand> bands, List<String> notes
});




}
/// @nodoc
class __$ScoringGuideCopyWithImpl<$Res>
    implements _$ScoringGuideCopyWith<$Res> {
  __$ScoringGuideCopyWithImpl(this._self, this._then);

  final _ScoringGuide _self;
  final $Res Function(_ScoringGuide) _then;

/// Create a copy of ScoringGuide
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? bands = null,Object? notes = null,}) {
  return _then(_ScoringGuide(
bands: null == bands ? _self._bands : bands // ignore: cast_nullable_to_non_nullable
as List<ScoringBand>,notes: null == notes ? _self._notes : notes // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}


}


/// @nodoc
mixin _$ScoringBand {

 int get score; String get label;
/// Create a copy of ScoringBand
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ScoringBandCopyWith<ScoringBand> get copyWith => _$ScoringBandCopyWithImpl<ScoringBand>(this as ScoringBand, _$identity);

  /// Serializes this ScoringBand to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ScoringBand&&(identical(other.score, score) || other.score == score)&&(identical(other.label, label) || other.label == label));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,score,label);

@override
String toString() {
  return 'ScoringBand(score: $score, label: $label)';
}


}

/// @nodoc
abstract mixin class $ScoringBandCopyWith<$Res>  {
  factory $ScoringBandCopyWith(ScoringBand value, $Res Function(ScoringBand) _then) = _$ScoringBandCopyWithImpl;
@useResult
$Res call({
 int score, String label
});




}
/// @nodoc
class _$ScoringBandCopyWithImpl<$Res>
    implements $ScoringBandCopyWith<$Res> {
  _$ScoringBandCopyWithImpl(this._self, this._then);

  final ScoringBand _self;
  final $Res Function(ScoringBand) _then;

/// Create a copy of ScoringBand
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? score = null,Object? label = null,}) {
  return _then(_self.copyWith(
score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as int,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [ScoringBand].
extension ScoringBandPatterns on ScoringBand {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ScoringBand value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ScoringBand() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ScoringBand value)  $default,){
final _that = this;
switch (_that) {
case _ScoringBand():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ScoringBand value)?  $default,){
final _that = this;
switch (_that) {
case _ScoringBand() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int score,  String label)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ScoringBand() when $default != null:
return $default(_that.score,_that.label);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int score,  String label)  $default,) {final _that = this;
switch (_that) {
case _ScoringBand():
return $default(_that.score,_that.label);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int score,  String label)?  $default,) {final _that = this;
switch (_that) {
case _ScoringBand() when $default != null:
return $default(_that.score,_that.label);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ScoringBand extends ScoringBand {
  const _ScoringBand({this.score = 0, this.label = ''}): super._();
  factory _ScoringBand.fromJson(Map<String, dynamic> json) => _$ScoringBandFromJson(json);

@override@JsonKey() final  int score;
@override@JsonKey() final  String label;

/// Create a copy of ScoringBand
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ScoringBandCopyWith<_ScoringBand> get copyWith => __$ScoringBandCopyWithImpl<_ScoringBand>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ScoringBandToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ScoringBand&&(identical(other.score, score) || other.score == score)&&(identical(other.label, label) || other.label == label));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,score,label);

@override
String toString() {
  return 'ScoringBand(score: $score, label: $label)';
}


}

/// @nodoc
abstract mixin class _$ScoringBandCopyWith<$Res> implements $ScoringBandCopyWith<$Res> {
  factory _$ScoringBandCopyWith(_ScoringBand value, $Res Function(_ScoringBand) _then) = __$ScoringBandCopyWithImpl;
@override @useResult
$Res call({
 int score, String label
});




}
/// @nodoc
class __$ScoringBandCopyWithImpl<$Res>
    implements _$ScoringBandCopyWith<$Res> {
  __$ScoringBandCopyWithImpl(this._self, this._then);

  final _ScoringBand _self;
  final $Res Function(_ScoringBand) _then;

/// Create a copy of ScoringBand
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? score = null,Object? label = null,}) {
  return _then(_ScoringBand(
score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as int,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$RubricComponent {

 String get label; String? get detail; int get weight;
/// Create a copy of RubricComponent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RubricComponentCopyWith<RubricComponent> get copyWith => _$RubricComponentCopyWithImpl<RubricComponent>(this as RubricComponent, _$identity);

  /// Serializes this RubricComponent to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RubricComponent&&(identical(other.label, label) || other.label == label)&&(identical(other.detail, detail) || other.detail == detail)&&(identical(other.weight, weight) || other.weight == weight));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,label,detail,weight);

@override
String toString() {
  return 'RubricComponent(label: $label, detail: $detail, weight: $weight)';
}


}

/// @nodoc
abstract mixin class $RubricComponentCopyWith<$Res>  {
  factory $RubricComponentCopyWith(RubricComponent value, $Res Function(RubricComponent) _then) = _$RubricComponentCopyWithImpl;
@useResult
$Res call({
 String label, String? detail, int weight
});




}
/// @nodoc
class _$RubricComponentCopyWithImpl<$Res>
    implements $RubricComponentCopyWith<$Res> {
  _$RubricComponentCopyWithImpl(this._self, this._then);

  final RubricComponent _self;
  final $Res Function(RubricComponent) _then;

/// Create a copy of RubricComponent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? label = null,Object? detail = freezed,Object? weight = null,}) {
  return _then(_self.copyWith(
label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,detail: freezed == detail ? _self.detail : detail // ignore: cast_nullable_to_non_nullable
as String?,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [RubricComponent].
extension RubricComponentPatterns on RubricComponent {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RubricComponent value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RubricComponent() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RubricComponent value)  $default,){
final _that = this;
switch (_that) {
case _RubricComponent():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RubricComponent value)?  $default,){
final _that = this;
switch (_that) {
case _RubricComponent() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String label,  String? detail,  int weight)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RubricComponent() when $default != null:
return $default(_that.label,_that.detail,_that.weight);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String label,  String? detail,  int weight)  $default,) {final _that = this;
switch (_that) {
case _RubricComponent():
return $default(_that.label,_that.detail,_that.weight);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String label,  String? detail,  int weight)?  $default,) {final _that = this;
switch (_that) {
case _RubricComponent() when $default != null:
return $default(_that.label,_that.detail,_that.weight);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RubricComponent extends RubricComponent {
  const _RubricComponent({required this.label, this.detail, this.weight = 0}): super._();
  factory _RubricComponent.fromJson(Map<String, dynamic> json) => _$RubricComponentFromJson(json);

@override final  String label;
@override final  String? detail;
@override@JsonKey() final  int weight;

/// Create a copy of RubricComponent
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RubricComponentCopyWith<_RubricComponent> get copyWith => __$RubricComponentCopyWithImpl<_RubricComponent>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RubricComponentToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RubricComponent&&(identical(other.label, label) || other.label == label)&&(identical(other.detail, detail) || other.detail == detail)&&(identical(other.weight, weight) || other.weight == weight));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,label,detail,weight);

@override
String toString() {
  return 'RubricComponent(label: $label, detail: $detail, weight: $weight)';
}


}

/// @nodoc
abstract mixin class _$RubricComponentCopyWith<$Res> implements $RubricComponentCopyWith<$Res> {
  factory _$RubricComponentCopyWith(_RubricComponent value, $Res Function(_RubricComponent) _then) = __$RubricComponentCopyWithImpl;
@override @useResult
$Res call({
 String label, String? detail, int weight
});




}
/// @nodoc
class __$RubricComponentCopyWithImpl<$Res>
    implements _$RubricComponentCopyWith<$Res> {
  __$RubricComponentCopyWithImpl(this._self, this._then);

  final _RubricComponent _self;
  final $Res Function(_RubricComponent) _then;

/// Create a copy of RubricComponent
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? label = null,Object? detail = freezed,Object? weight = null,}) {
  return _then(_RubricComponent(
label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,detail: freezed == detail ? _self.detail : detail // ignore: cast_nullable_to_non_nullable
as String?,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$ScanOutcome {

 String get ticker; String get status;@JsonKey(name: 'status_label') String? get statusLabel;@JsonKey(name: 'return_percent') String? get returnPercent; String get direction; String? get note;
/// Create a copy of ScanOutcome
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ScanOutcomeCopyWith<ScanOutcome> get copyWith => _$ScanOutcomeCopyWithImpl<ScanOutcome>(this as ScanOutcome, _$identity);

  /// Serializes this ScanOutcome to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ScanOutcome&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.status, status) || other.status == status)&&(identical(other.statusLabel, statusLabel) || other.statusLabel == statusLabel)&&(identical(other.returnPercent, returnPercent) || other.returnPercent == returnPercent)&&(identical(other.direction, direction) || other.direction == direction)&&(identical(other.note, note) || other.note == note));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,status,statusLabel,returnPercent,direction,note);

@override
String toString() {
  return 'ScanOutcome(ticker: $ticker, status: $status, statusLabel: $statusLabel, returnPercent: $returnPercent, direction: $direction, note: $note)';
}


}

/// @nodoc
abstract mixin class $ScanOutcomeCopyWith<$Res>  {
  factory $ScanOutcomeCopyWith(ScanOutcome value, $Res Function(ScanOutcome) _then) = _$ScanOutcomeCopyWithImpl;
@useResult
$Res call({
 String ticker, String status,@JsonKey(name: 'status_label') String? statusLabel,@JsonKey(name: 'return_percent') String? returnPercent, String direction, String? note
});




}
/// @nodoc
class _$ScanOutcomeCopyWithImpl<$Res>
    implements $ScanOutcomeCopyWith<$Res> {
  _$ScanOutcomeCopyWithImpl(this._self, this._then);

  final ScanOutcome _self;
  final $Res Function(ScanOutcome) _then;

/// Create a copy of ScanOutcome
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? status = null,Object? statusLabel = freezed,Object? returnPercent = freezed,Object? direction = null,Object? note = freezed,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,statusLabel: freezed == statusLabel ? _self.statusLabel : statusLabel // ignore: cast_nullable_to_non_nullable
as String?,returnPercent: freezed == returnPercent ? _self.returnPercent : returnPercent // ignore: cast_nullable_to_non_nullable
as String?,direction: null == direction ? _self.direction : direction // ignore: cast_nullable_to_non_nullable
as String,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ScanOutcome].
extension ScanOutcomePatterns on ScanOutcome {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ScanOutcome value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ScanOutcome() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ScanOutcome value)  $default,){
final _that = this;
switch (_that) {
case _ScanOutcome():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ScanOutcome value)?  $default,){
final _that = this;
switch (_that) {
case _ScanOutcome() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker,  String status, @JsonKey(name: 'status_label')  String? statusLabel, @JsonKey(name: 'return_percent')  String? returnPercent,  String direction,  String? note)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ScanOutcome() when $default != null:
return $default(_that.ticker,_that.status,_that.statusLabel,_that.returnPercent,_that.direction,_that.note);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker,  String status, @JsonKey(name: 'status_label')  String? statusLabel, @JsonKey(name: 'return_percent')  String? returnPercent,  String direction,  String? note)  $default,) {final _that = this;
switch (_that) {
case _ScanOutcome():
return $default(_that.ticker,_that.status,_that.statusLabel,_that.returnPercent,_that.direction,_that.note);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker,  String status, @JsonKey(name: 'status_label')  String? statusLabel, @JsonKey(name: 'return_percent')  String? returnPercent,  String direction,  String? note)?  $default,) {final _that = this;
switch (_that) {
case _ScanOutcome() when $default != null:
return $default(_that.ticker,_that.status,_that.statusLabel,_that.returnPercent,_that.direction,_that.note);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ScanOutcome extends ScanOutcome {
  const _ScanOutcome({required this.ticker, this.status = 'rejected', @JsonKey(name: 'status_label') this.statusLabel, @JsonKey(name: 'return_percent') this.returnPercent, this.direction = 'up', this.note}): super._();
  factory _ScanOutcome.fromJson(Map<String, dynamic> json) => _$ScanOutcomeFromJson(json);

@override final  String ticker;
@override@JsonKey() final  String status;
@override@JsonKey(name: 'status_label') final  String? statusLabel;
@override@JsonKey(name: 'return_percent') final  String? returnPercent;
@override@JsonKey() final  String direction;
@override final  String? note;

/// Create a copy of ScanOutcome
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ScanOutcomeCopyWith<_ScanOutcome> get copyWith => __$ScanOutcomeCopyWithImpl<_ScanOutcome>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ScanOutcomeToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ScanOutcome&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.status, status) || other.status == status)&&(identical(other.statusLabel, statusLabel) || other.statusLabel == statusLabel)&&(identical(other.returnPercent, returnPercent) || other.returnPercent == returnPercent)&&(identical(other.direction, direction) || other.direction == direction)&&(identical(other.note, note) || other.note == note));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,status,statusLabel,returnPercent,direction,note);

@override
String toString() {
  return 'ScanOutcome(ticker: $ticker, status: $status, statusLabel: $statusLabel, returnPercent: $returnPercent, direction: $direction, note: $note)';
}


}

/// @nodoc
abstract mixin class _$ScanOutcomeCopyWith<$Res> implements $ScanOutcomeCopyWith<$Res> {
  factory _$ScanOutcomeCopyWith(_ScanOutcome value, $Res Function(_ScanOutcome) _then) = __$ScanOutcomeCopyWithImpl;
@override @useResult
$Res call({
 String ticker, String status,@JsonKey(name: 'status_label') String? statusLabel,@JsonKey(name: 'return_percent') String? returnPercent, String direction, String? note
});




}
/// @nodoc
class __$ScanOutcomeCopyWithImpl<$Res>
    implements _$ScanOutcomeCopyWith<$Res> {
  __$ScanOutcomeCopyWithImpl(this._self, this._then);

  final _ScanOutcome _self;
  final $Res Function(_ScanOutcome) _then;

/// Create a copy of ScanOutcome
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? status = null,Object? statusLabel = freezed,Object? returnPercent = freezed,Object? direction = null,Object? note = freezed,}) {
  return _then(_ScanOutcome(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,statusLabel: freezed == statusLabel ? _self.statusLabel : statusLabel // ignore: cast_nullable_to_non_nullable
as String?,returnPercent: freezed == returnPercent ? _self.returnPercent : returnPercent // ignore: cast_nullable_to_non_nullable
as String?,direction: null == direction ? _self.direction : direction // ignore: cast_nullable_to_non_nullable
as String,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$ResearchSource {

 String get name; String? get url;
/// Create a copy of ResearchSource
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ResearchSourceCopyWith<ResearchSource> get copyWith => _$ResearchSourceCopyWithImpl<ResearchSource>(this as ResearchSource, _$identity);

  /// Serializes this ResearchSource to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ResearchSource&&(identical(other.name, name) || other.name == name)&&(identical(other.url, url) || other.url == url));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,url);

@override
String toString() {
  return 'ResearchSource(name: $name, url: $url)';
}


}

/// @nodoc
abstract mixin class $ResearchSourceCopyWith<$Res>  {
  factory $ResearchSourceCopyWith(ResearchSource value, $Res Function(ResearchSource) _then) = _$ResearchSourceCopyWithImpl;
@useResult
$Res call({
 String name, String? url
});




}
/// @nodoc
class _$ResearchSourceCopyWithImpl<$Res>
    implements $ResearchSourceCopyWith<$Res> {
  _$ResearchSourceCopyWithImpl(this._self, this._then);

  final ResearchSource _self;
  final $Res Function(ResearchSource) _then;

/// Create a copy of ResearchSource
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = null,Object? url = freezed,}) {
  return _then(_self.copyWith(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,url: freezed == url ? _self.url : url // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ResearchSource].
extension ResearchSourcePatterns on ResearchSource {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ResearchSource value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ResearchSource() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ResearchSource value)  $default,){
final _that = this;
switch (_that) {
case _ResearchSource():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ResearchSource value)?  $default,){
final _that = this;
switch (_that) {
case _ResearchSource() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String name,  String? url)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ResearchSource() when $default != null:
return $default(_that.name,_that.url);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String name,  String? url)  $default,) {final _that = this;
switch (_that) {
case _ResearchSource():
return $default(_that.name,_that.url);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String name,  String? url)?  $default,) {final _that = this;
switch (_that) {
case _ResearchSource() when $default != null:
return $default(_that.name,_that.url);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ResearchSource extends ResearchSource {
  const _ResearchSource({required this.name, this.url}): super._();
  factory _ResearchSource.fromJson(Map<String, dynamic> json) => _$ResearchSourceFromJson(json);

@override final  String name;
@override final  String? url;

/// Create a copy of ResearchSource
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ResearchSourceCopyWith<_ResearchSource> get copyWith => __$ResearchSourceCopyWithImpl<_ResearchSource>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ResearchSourceToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ResearchSource&&(identical(other.name, name) || other.name == name)&&(identical(other.url, url) || other.url == url));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,url);

@override
String toString() {
  return 'ResearchSource(name: $name, url: $url)';
}


}

/// @nodoc
abstract mixin class _$ResearchSourceCopyWith<$Res> implements $ResearchSourceCopyWith<$Res> {
  factory _$ResearchSourceCopyWith(_ResearchSource value, $Res Function(_ResearchSource) _then) = __$ResearchSourceCopyWithImpl;
@override @useResult
$Res call({
 String name, String? url
});




}
/// @nodoc
class __$ResearchSourceCopyWithImpl<$Res>
    implements _$ResearchSourceCopyWith<$Res> {
  __$ResearchSourceCopyWithImpl(this._self, this._then);

  final _ResearchSource _self;
  final $Res Function(_ResearchSource) _then;

/// Create a copy of ResearchSource
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = null,Object? url = freezed,}) {
  return _then(_ResearchSource(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,url: freezed == url ? _self.url : url // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
