// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'cash_or_trash.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CashOrTrashIndex {

@JsonKey(name: 'updated_at') String? get updatedAt; int get studied; int get total; List<CashOrTrashEntry> get companies;
/// Create a copy of CashOrTrashIndex
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CashOrTrashIndexCopyWith<CashOrTrashIndex> get copyWith => _$CashOrTrashIndexCopyWithImpl<CashOrTrashIndex>(this as CashOrTrashIndex, _$identity);

  /// Serializes this CashOrTrashIndex to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CashOrTrashIndex&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.studied, studied) || other.studied == studied)&&(identical(other.total, total) || other.total == total)&&const DeepCollectionEquality().equals(other.companies, companies));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,updatedAt,studied,total,const DeepCollectionEquality().hash(companies));

@override
String toString() {
  return 'CashOrTrashIndex(updatedAt: $updatedAt, studied: $studied, total: $total, companies: $companies)';
}


}

/// @nodoc
abstract mixin class $CashOrTrashIndexCopyWith<$Res>  {
  factory $CashOrTrashIndexCopyWith(CashOrTrashIndex value, $Res Function(CashOrTrashIndex) _then) = _$CashOrTrashIndexCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'updated_at') String? updatedAt, int studied, int total, List<CashOrTrashEntry> companies
});




}
/// @nodoc
class _$CashOrTrashIndexCopyWithImpl<$Res>
    implements $CashOrTrashIndexCopyWith<$Res> {
  _$CashOrTrashIndexCopyWithImpl(this._self, this._then);

  final CashOrTrashIndex _self;
  final $Res Function(CashOrTrashIndex) _then;

/// Create a copy of CashOrTrashIndex
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? updatedAt = freezed,Object? studied = null,Object? total = null,Object? companies = null,}) {
  return _then(_self.copyWith(
updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,studied: null == studied ? _self.studied : studied // ignore: cast_nullable_to_non_nullable
as int,total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as int,companies: null == companies ? _self.companies : companies // ignore: cast_nullable_to_non_nullable
as List<CashOrTrashEntry>,
  ));
}

}


/// Adds pattern-matching-related methods to [CashOrTrashIndex].
extension CashOrTrashIndexPatterns on CashOrTrashIndex {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CashOrTrashIndex value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CashOrTrashIndex() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CashOrTrashIndex value)  $default,){
final _that = this;
switch (_that) {
case _CashOrTrashIndex():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CashOrTrashIndex value)?  $default,){
final _that = this;
switch (_that) {
case _CashOrTrashIndex() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'updated_at')  String? updatedAt,  int studied,  int total,  List<CashOrTrashEntry> companies)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CashOrTrashIndex() when $default != null:
return $default(_that.updatedAt,_that.studied,_that.total,_that.companies);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'updated_at')  String? updatedAt,  int studied,  int total,  List<CashOrTrashEntry> companies)  $default,) {final _that = this;
switch (_that) {
case _CashOrTrashIndex():
return $default(_that.updatedAt,_that.studied,_that.total,_that.companies);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'updated_at')  String? updatedAt,  int studied,  int total,  List<CashOrTrashEntry> companies)?  $default,) {final _that = this;
switch (_that) {
case _CashOrTrashIndex() when $default != null:
return $default(_that.updatedAt,_that.studied,_that.total,_that.companies);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CashOrTrashIndex extends CashOrTrashIndex {
  const _CashOrTrashIndex({@JsonKey(name: 'updated_at') this.updatedAt, this.studied = 0, this.total = 0, final  List<CashOrTrashEntry> companies = const <CashOrTrashEntry>[]}): _companies = companies,super._();
  factory _CashOrTrashIndex.fromJson(Map<String, dynamic> json) => _$CashOrTrashIndexFromJson(json);

@override@JsonKey(name: 'updated_at') final  String? updatedAt;
@override@JsonKey() final  int studied;
@override@JsonKey() final  int total;
 final  List<CashOrTrashEntry> _companies;
@override@JsonKey() List<CashOrTrashEntry> get companies {
  if (_companies is EqualUnmodifiableListView) return _companies;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_companies);
}


/// Create a copy of CashOrTrashIndex
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CashOrTrashIndexCopyWith<_CashOrTrashIndex> get copyWith => __$CashOrTrashIndexCopyWithImpl<_CashOrTrashIndex>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CashOrTrashIndexToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CashOrTrashIndex&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.studied, studied) || other.studied == studied)&&(identical(other.total, total) || other.total == total)&&const DeepCollectionEquality().equals(other._companies, _companies));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,updatedAt,studied,total,const DeepCollectionEquality().hash(_companies));

@override
String toString() {
  return 'CashOrTrashIndex(updatedAt: $updatedAt, studied: $studied, total: $total, companies: $companies)';
}


}

/// @nodoc
abstract mixin class _$CashOrTrashIndexCopyWith<$Res> implements $CashOrTrashIndexCopyWith<$Res> {
  factory _$CashOrTrashIndexCopyWith(_CashOrTrashIndex value, $Res Function(_CashOrTrashIndex) _then) = __$CashOrTrashIndexCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'updated_at') String? updatedAt, int studied, int total, List<CashOrTrashEntry> companies
});




}
/// @nodoc
class __$CashOrTrashIndexCopyWithImpl<$Res>
    implements _$CashOrTrashIndexCopyWith<$Res> {
  __$CashOrTrashIndexCopyWithImpl(this._self, this._then);

  final _CashOrTrashIndex _self;
  final $Res Function(_CashOrTrashIndex) _then;

/// Create a copy of CashOrTrashIndex
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? updatedAt = freezed,Object? studied = null,Object? total = null,Object? companies = null,}) {
  return _then(_CashOrTrashIndex(
updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,studied: null == studied ? _self.studied : studied // ignore: cast_nullable_to_non_nullable
as int,total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as int,companies: null == companies ? _self._companies : companies // ignore: cast_nullable_to_non_nullable
as List<CashOrTrashEntry>,
  ));
}


}


/// @nodoc
mixin _$CashOrTrashEntry {

 String get ticker; String get name; int get score; String get verdictId; String? get summary;@JsonKey(name: 'article_url') String? get articleUrl;@JsonKey(name: 'studied_at') String? get studiedAt; List<String> get flags; List<PillarScore> get pillars;
/// Create a copy of CashOrTrashEntry
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CashOrTrashEntryCopyWith<CashOrTrashEntry> get copyWith => _$CashOrTrashEntryCopyWithImpl<CashOrTrashEntry>(this as CashOrTrashEntry, _$identity);

  /// Serializes this CashOrTrashEntry to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CashOrTrashEntry&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.name, name) || other.name == name)&&(identical(other.score, score) || other.score == score)&&(identical(other.verdictId, verdictId) || other.verdictId == verdictId)&&(identical(other.summary, summary) || other.summary == summary)&&(identical(other.articleUrl, articleUrl) || other.articleUrl == articleUrl)&&(identical(other.studiedAt, studiedAt) || other.studiedAt == studiedAt)&&const DeepCollectionEquality().equals(other.flags, flags)&&const DeepCollectionEquality().equals(other.pillars, pillars));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,name,score,verdictId,summary,articleUrl,studiedAt,const DeepCollectionEquality().hash(flags),const DeepCollectionEquality().hash(pillars));

@override
String toString() {
  return 'CashOrTrashEntry(ticker: $ticker, name: $name, score: $score, verdictId: $verdictId, summary: $summary, articleUrl: $articleUrl, studiedAt: $studiedAt, flags: $flags, pillars: $pillars)';
}


}

/// @nodoc
abstract mixin class $CashOrTrashEntryCopyWith<$Res>  {
  factory $CashOrTrashEntryCopyWith(CashOrTrashEntry value, $Res Function(CashOrTrashEntry) _then) = _$CashOrTrashEntryCopyWithImpl;
@useResult
$Res call({
 String ticker, String name, int score, String verdictId, String? summary,@JsonKey(name: 'article_url') String? articleUrl,@JsonKey(name: 'studied_at') String? studiedAt, List<String> flags, List<PillarScore> pillars
});




}
/// @nodoc
class _$CashOrTrashEntryCopyWithImpl<$Res>
    implements $CashOrTrashEntryCopyWith<$Res> {
  _$CashOrTrashEntryCopyWithImpl(this._self, this._then);

  final CashOrTrashEntry _self;
  final $Res Function(CashOrTrashEntry) _then;

/// Create a copy of CashOrTrashEntry
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? name = null,Object? score = null,Object? verdictId = null,Object? summary = freezed,Object? articleUrl = freezed,Object? studiedAt = freezed,Object? flags = null,Object? pillars = null,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as int,verdictId: null == verdictId ? _self.verdictId : verdictId // ignore: cast_nullable_to_non_nullable
as String,summary: freezed == summary ? _self.summary : summary // ignore: cast_nullable_to_non_nullable
as String?,articleUrl: freezed == articleUrl ? _self.articleUrl : articleUrl // ignore: cast_nullable_to_non_nullable
as String?,studiedAt: freezed == studiedAt ? _self.studiedAt : studiedAt // ignore: cast_nullable_to_non_nullable
as String?,flags: null == flags ? _self.flags : flags // ignore: cast_nullable_to_non_nullable
as List<String>,pillars: null == pillars ? _self.pillars : pillars // ignore: cast_nullable_to_non_nullable
as List<PillarScore>,
  ));
}

}


/// Adds pattern-matching-related methods to [CashOrTrashEntry].
extension CashOrTrashEntryPatterns on CashOrTrashEntry {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CashOrTrashEntry value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CashOrTrashEntry() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CashOrTrashEntry value)  $default,){
final _that = this;
switch (_that) {
case _CashOrTrashEntry():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CashOrTrashEntry value)?  $default,){
final _that = this;
switch (_that) {
case _CashOrTrashEntry() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker,  String name,  int score,  String verdictId,  String? summary, @JsonKey(name: 'article_url')  String? articleUrl, @JsonKey(name: 'studied_at')  String? studiedAt,  List<String> flags,  List<PillarScore> pillars)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CashOrTrashEntry() when $default != null:
return $default(_that.ticker,_that.name,_that.score,_that.verdictId,_that.summary,_that.articleUrl,_that.studiedAt,_that.flags,_that.pillars);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker,  String name,  int score,  String verdictId,  String? summary, @JsonKey(name: 'article_url')  String? articleUrl, @JsonKey(name: 'studied_at')  String? studiedAt,  List<String> flags,  List<PillarScore> pillars)  $default,) {final _that = this;
switch (_that) {
case _CashOrTrashEntry():
return $default(_that.ticker,_that.name,_that.score,_that.verdictId,_that.summary,_that.articleUrl,_that.studiedAt,_that.flags,_that.pillars);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker,  String name,  int score,  String verdictId,  String? summary, @JsonKey(name: 'article_url')  String? articleUrl, @JsonKey(name: 'studied_at')  String? studiedAt,  List<String> flags,  List<PillarScore> pillars)?  $default,) {final _that = this;
switch (_that) {
case _CashOrTrashEntry() when $default != null:
return $default(_that.ticker,_that.name,_that.score,_that.verdictId,_that.summary,_that.articleUrl,_that.studiedAt,_that.flags,_that.pillars);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CashOrTrashEntry extends CashOrTrashEntry {
  const _CashOrTrashEntry({required this.ticker, required this.name, this.score = 0, this.verdictId = 'recyclable', this.summary, @JsonKey(name: 'article_url') this.articleUrl, @JsonKey(name: 'studied_at') this.studiedAt, final  List<String> flags = const <String>[], final  List<PillarScore> pillars = const <PillarScore>[]}): _flags = flags,_pillars = pillars,super._();
  factory _CashOrTrashEntry.fromJson(Map<String, dynamic> json) => _$CashOrTrashEntryFromJson(json);

@override final  String ticker;
@override final  String name;
@override@JsonKey() final  int score;
@override@JsonKey() final  String verdictId;
@override final  String? summary;
@override@JsonKey(name: 'article_url') final  String? articleUrl;
@override@JsonKey(name: 'studied_at') final  String? studiedAt;
 final  List<String> _flags;
@override@JsonKey() List<String> get flags {
  if (_flags is EqualUnmodifiableListView) return _flags;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_flags);
}

 final  List<PillarScore> _pillars;
@override@JsonKey() List<PillarScore> get pillars {
  if (_pillars is EqualUnmodifiableListView) return _pillars;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_pillars);
}


/// Create a copy of CashOrTrashEntry
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CashOrTrashEntryCopyWith<_CashOrTrashEntry> get copyWith => __$CashOrTrashEntryCopyWithImpl<_CashOrTrashEntry>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CashOrTrashEntryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CashOrTrashEntry&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.name, name) || other.name == name)&&(identical(other.score, score) || other.score == score)&&(identical(other.verdictId, verdictId) || other.verdictId == verdictId)&&(identical(other.summary, summary) || other.summary == summary)&&(identical(other.articleUrl, articleUrl) || other.articleUrl == articleUrl)&&(identical(other.studiedAt, studiedAt) || other.studiedAt == studiedAt)&&const DeepCollectionEquality().equals(other._flags, _flags)&&const DeepCollectionEquality().equals(other._pillars, _pillars));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,name,score,verdictId,summary,articleUrl,studiedAt,const DeepCollectionEquality().hash(_flags),const DeepCollectionEquality().hash(_pillars));

@override
String toString() {
  return 'CashOrTrashEntry(ticker: $ticker, name: $name, score: $score, verdictId: $verdictId, summary: $summary, articleUrl: $articleUrl, studiedAt: $studiedAt, flags: $flags, pillars: $pillars)';
}


}

/// @nodoc
abstract mixin class _$CashOrTrashEntryCopyWith<$Res> implements $CashOrTrashEntryCopyWith<$Res> {
  factory _$CashOrTrashEntryCopyWith(_CashOrTrashEntry value, $Res Function(_CashOrTrashEntry) _then) = __$CashOrTrashEntryCopyWithImpl;
@override @useResult
$Res call({
 String ticker, String name, int score, String verdictId, String? summary,@JsonKey(name: 'article_url') String? articleUrl,@JsonKey(name: 'studied_at') String? studiedAt, List<String> flags, List<PillarScore> pillars
});




}
/// @nodoc
class __$CashOrTrashEntryCopyWithImpl<$Res>
    implements _$CashOrTrashEntryCopyWith<$Res> {
  __$CashOrTrashEntryCopyWithImpl(this._self, this._then);

  final _CashOrTrashEntry _self;
  final $Res Function(_CashOrTrashEntry) _then;

/// Create a copy of CashOrTrashEntry
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? name = null,Object? score = null,Object? verdictId = null,Object? summary = freezed,Object? articleUrl = freezed,Object? studiedAt = freezed,Object? flags = null,Object? pillars = null,}) {
  return _then(_CashOrTrashEntry(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as int,verdictId: null == verdictId ? _self.verdictId : verdictId // ignore: cast_nullable_to_non_nullable
as String,summary: freezed == summary ? _self.summary : summary // ignore: cast_nullable_to_non_nullable
as String?,articleUrl: freezed == articleUrl ? _self.articleUrl : articleUrl // ignore: cast_nullable_to_non_nullable
as String?,studiedAt: freezed == studiedAt ? _self.studiedAt : studiedAt // ignore: cast_nullable_to_non_nullable
as String?,flags: null == flags ? _self._flags : flags // ignore: cast_nullable_to_non_nullable
as List<String>,pillars: null == pillars ? _self._pillars : pillars // ignore: cast_nullable_to_non_nullable
as List<PillarScore>,
  ));
}


}


/// @nodoc
mixin _$PillarScore {

 String get pillar; int get score; String? get basis;
/// Create a copy of PillarScore
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PillarScoreCopyWith<PillarScore> get copyWith => _$PillarScoreCopyWithImpl<PillarScore>(this as PillarScore, _$identity);

  /// Serializes this PillarScore to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PillarScore&&(identical(other.pillar, pillar) || other.pillar == pillar)&&(identical(other.score, score) || other.score == score)&&(identical(other.basis, basis) || other.basis == basis));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,pillar,score,basis);

@override
String toString() {
  return 'PillarScore(pillar: $pillar, score: $score, basis: $basis)';
}


}

/// @nodoc
abstract mixin class $PillarScoreCopyWith<$Res>  {
  factory $PillarScoreCopyWith(PillarScore value, $Res Function(PillarScore) _then) = _$PillarScoreCopyWithImpl;
@useResult
$Res call({
 String pillar, int score, String? basis
});




}
/// @nodoc
class _$PillarScoreCopyWithImpl<$Res>
    implements $PillarScoreCopyWith<$Res> {
  _$PillarScoreCopyWithImpl(this._self, this._then);

  final PillarScore _self;
  final $Res Function(PillarScore) _then;

/// Create a copy of PillarScore
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? pillar = null,Object? score = null,Object? basis = freezed,}) {
  return _then(_self.copyWith(
pillar: null == pillar ? _self.pillar : pillar // ignore: cast_nullable_to_non_nullable
as String,score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as int,basis: freezed == basis ? _self.basis : basis // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [PillarScore].
extension PillarScorePatterns on PillarScore {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PillarScore value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PillarScore() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PillarScore value)  $default,){
final _that = this;
switch (_that) {
case _PillarScore():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PillarScore value)?  $default,){
final _that = this;
switch (_that) {
case _PillarScore() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String pillar,  int score,  String? basis)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PillarScore() when $default != null:
return $default(_that.pillar,_that.score,_that.basis);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String pillar,  int score,  String? basis)  $default,) {final _that = this;
switch (_that) {
case _PillarScore():
return $default(_that.pillar,_that.score,_that.basis);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String pillar,  int score,  String? basis)?  $default,) {final _that = this;
switch (_that) {
case _PillarScore() when $default != null:
return $default(_that.pillar,_that.score,_that.basis);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PillarScore extends PillarScore {
  const _PillarScore({required this.pillar, required this.score, this.basis}): super._();
  factory _PillarScore.fromJson(Map<String, dynamic> json) => _$PillarScoreFromJson(json);

@override final  String pillar;
@override final  int score;
@override final  String? basis;

/// Create a copy of PillarScore
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PillarScoreCopyWith<_PillarScore> get copyWith => __$PillarScoreCopyWithImpl<_PillarScore>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PillarScoreToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PillarScore&&(identical(other.pillar, pillar) || other.pillar == pillar)&&(identical(other.score, score) || other.score == score)&&(identical(other.basis, basis) || other.basis == basis));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,pillar,score,basis);

@override
String toString() {
  return 'PillarScore(pillar: $pillar, score: $score, basis: $basis)';
}


}

/// @nodoc
abstract mixin class _$PillarScoreCopyWith<$Res> implements $PillarScoreCopyWith<$Res> {
  factory _$PillarScoreCopyWith(_PillarScore value, $Res Function(_PillarScore) _then) = __$PillarScoreCopyWithImpl;
@override @useResult
$Res call({
 String pillar, int score, String? basis
});




}
/// @nodoc
class __$PillarScoreCopyWithImpl<$Res>
    implements _$PillarScoreCopyWith<$Res> {
  __$PillarScoreCopyWithImpl(this._self, this._then);

  final _PillarScore _self;
  final $Res Function(_PillarScore) _then;

/// Create a copy of PillarScore
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? pillar = null,Object? score = null,Object? basis = freezed,}) {
  return _then(_PillarScore(
pillar: null == pillar ? _self.pillar : pillar // ignore: cast_nullable_to_non_nullable
as String,score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as int,basis: freezed == basis ? _self.basis : basis // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
