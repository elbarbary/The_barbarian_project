// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'company.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CompanyDirectory {

@JsonKey(name: 'updated_at') DateTime? get updatedAt; List<CompanySummary> get companies;
/// Create a copy of CompanyDirectory
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CompanyDirectoryCopyWith<CompanyDirectory> get copyWith => _$CompanyDirectoryCopyWithImpl<CompanyDirectory>(this as CompanyDirectory, _$identity);

  /// Serializes this CompanyDirectory to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CompanyDirectory&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&const DeepCollectionEquality().equals(other.companies, companies));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,updatedAt,const DeepCollectionEquality().hash(companies));

@override
String toString() {
  return 'CompanyDirectory(updatedAt: $updatedAt, companies: $companies)';
}


}

/// @nodoc
abstract mixin class $CompanyDirectoryCopyWith<$Res>  {
  factory $CompanyDirectoryCopyWith(CompanyDirectory value, $Res Function(CompanyDirectory) _then) = _$CompanyDirectoryCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'updated_at') DateTime? updatedAt, List<CompanySummary> companies
});




}
/// @nodoc
class _$CompanyDirectoryCopyWithImpl<$Res>
    implements $CompanyDirectoryCopyWith<$Res> {
  _$CompanyDirectoryCopyWithImpl(this._self, this._then);

  final CompanyDirectory _self;
  final $Res Function(CompanyDirectory) _then;

/// Create a copy of CompanyDirectory
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? updatedAt = freezed,Object? companies = null,}) {
  return _then(_self.copyWith(
updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,companies: null == companies ? _self.companies : companies // ignore: cast_nullable_to_non_nullable
as List<CompanySummary>,
  ));
}

}


/// Adds pattern-matching-related methods to [CompanyDirectory].
extension CompanyDirectoryPatterns on CompanyDirectory {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CompanyDirectory value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CompanyDirectory() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CompanyDirectory value)  $default,){
final _that = this;
switch (_that) {
case _CompanyDirectory():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CompanyDirectory value)?  $default,){
final _that = this;
switch (_that) {
case _CompanyDirectory() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'updated_at')  DateTime? updatedAt,  List<CompanySummary> companies)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CompanyDirectory() when $default != null:
return $default(_that.updatedAt,_that.companies);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'updated_at')  DateTime? updatedAt,  List<CompanySummary> companies)  $default,) {final _that = this;
switch (_that) {
case _CompanyDirectory():
return $default(_that.updatedAt,_that.companies);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'updated_at')  DateTime? updatedAt,  List<CompanySummary> companies)?  $default,) {final _that = this;
switch (_that) {
case _CompanyDirectory() when $default != null:
return $default(_that.updatedAt,_that.companies);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CompanyDirectory extends CompanyDirectory {
  const _CompanyDirectory({@JsonKey(name: 'updated_at') this.updatedAt, final  List<CompanySummary> companies = const <CompanySummary>[]}): _companies = companies,super._();
  factory _CompanyDirectory.fromJson(Map<String, dynamic> json) => _$CompanyDirectoryFromJson(json);

@override@JsonKey(name: 'updated_at') final  DateTime? updatedAt;
 final  List<CompanySummary> _companies;
@override@JsonKey() List<CompanySummary> get companies {
  if (_companies is EqualUnmodifiableListView) return _companies;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_companies);
}


/// Create a copy of CompanyDirectory
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CompanyDirectoryCopyWith<_CompanyDirectory> get copyWith => __$CompanyDirectoryCopyWithImpl<_CompanyDirectory>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CompanyDirectoryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CompanyDirectory&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&const DeepCollectionEquality().equals(other._companies, _companies));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,updatedAt,const DeepCollectionEquality().hash(_companies));

@override
String toString() {
  return 'CompanyDirectory(updatedAt: $updatedAt, companies: $companies)';
}


}

/// @nodoc
abstract mixin class _$CompanyDirectoryCopyWith<$Res> implements $CompanyDirectoryCopyWith<$Res> {
  factory _$CompanyDirectoryCopyWith(_CompanyDirectory value, $Res Function(_CompanyDirectory) _then) = __$CompanyDirectoryCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'updated_at') DateTime? updatedAt, List<CompanySummary> companies
});




}
/// @nodoc
class __$CompanyDirectoryCopyWithImpl<$Res>
    implements _$CompanyDirectoryCopyWith<$Res> {
  __$CompanyDirectoryCopyWithImpl(this._self, this._then);

  final _CompanyDirectory _self;
  final $Res Function(_CompanyDirectory) _then;

/// Create a copy of CompanyDirectory
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? updatedAt = freezed,Object? companies = null,}) {
  return _then(_CompanyDirectory(
updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,companies: null == companies ? _self._companies : companies // ignore: cast_nullable_to_non_nullable
as List<CompanySummary>,
  ));
}


}


/// @nodoc
mixin _$CompanySummary {

 String get ticker;@JsonKey(name: 'name_en') String get nameEn;@JsonKey(name: 'name_ar') String? get nameAr; String? get sector; String get exchange;@JsonKey(name: 'has_cash_or_trash') bool get hasCashOrTrash;@JsonKey(name: 'has_research') bool get hasResearch;/// Numbers the directory can narrow itself by without opening 282 files.
///
/// Slow-moving ones only. Price, change and volume are not here because
/// they move through the session and the screen already watches the live
/// snapshot, which is fresher than this document will ever be.
@JsonKey(name: 'market_cap') double? get marketCap;@JsonKey(name: 'avg_volume_30d') double? get avgVolume30d;/// The last traded price over the company's own filed annual earnings.
///
/// Absent for more than a third of the exchange, and every absence is
/// deliberate — a loss, no filed figure, or two independent routes to the
/// ratio disagreeing. See `price_earnings` in build_market_api.py.
 double? get pe;/// The financial year the earnings in [pe] were filed for. A newest annual
/// filing can be eighteen months old, and "P/E 8" against 2023 earnings is
/// a different claim from the same number against 2025.
@JsonKey(name: 'pe_period') String? get pePeriod;/// What the company earned per share, in pounds, over [epsPeriod].
///
/// **Losses are here.** Minus two pounds a share is a fact about a year and
/// reads as one; it is only a ratio like [pe] that a negative breaks, where
/// the minus sign silently becomes "cheapest on the exchange".
 double? get eps;@JsonKey(name: 'eps_period') String? get epsPeriod;/// The company's own filed annual profit, in the millions of pounds it was
/// filed in, over [netIncomePeriod].
@JsonKey(name: 'net_income') double? get netIncome;@JsonKey(name: 'net_income_period') String? get netIncomePeriod;/// Shares traded on a normal day — the twenty-day median.
///
/// Carried so the list can answer "busier than usual" for itself: today's
/// volume comes from the live snapshot, and this is what it is unusual
/// against.
@JsonKey(name: 'median_volume_20d') double? get medianVolume20d;
/// Create a copy of CompanySummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CompanySummaryCopyWith<CompanySummary> get copyWith => _$CompanySummaryCopyWithImpl<CompanySummary>(this as CompanySummary, _$identity);

  /// Serializes this CompanySummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CompanySummary&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.nameEn, nameEn) || other.nameEn == nameEn)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.exchange, exchange) || other.exchange == exchange)&&(identical(other.hasCashOrTrash, hasCashOrTrash) || other.hasCashOrTrash == hasCashOrTrash)&&(identical(other.hasResearch, hasResearch) || other.hasResearch == hasResearch)&&(identical(other.marketCap, marketCap) || other.marketCap == marketCap)&&(identical(other.avgVolume30d, avgVolume30d) || other.avgVolume30d == avgVolume30d)&&(identical(other.pe, pe) || other.pe == pe)&&(identical(other.pePeriod, pePeriod) || other.pePeriod == pePeriod)&&(identical(other.eps, eps) || other.eps == eps)&&(identical(other.epsPeriod, epsPeriod) || other.epsPeriod == epsPeriod)&&(identical(other.netIncome, netIncome) || other.netIncome == netIncome)&&(identical(other.netIncomePeriod, netIncomePeriod) || other.netIncomePeriod == netIncomePeriod)&&(identical(other.medianVolume20d, medianVolume20d) || other.medianVolume20d == medianVolume20d));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,nameEn,nameAr,sector,exchange,hasCashOrTrash,hasResearch,marketCap,avgVolume30d,pe,pePeriod,eps,epsPeriod,netIncome,netIncomePeriod,medianVolume20d);

@override
String toString() {
  return 'CompanySummary(ticker: $ticker, nameEn: $nameEn, nameAr: $nameAr, sector: $sector, exchange: $exchange, hasCashOrTrash: $hasCashOrTrash, hasResearch: $hasResearch, marketCap: $marketCap, avgVolume30d: $avgVolume30d, pe: $pe, pePeriod: $pePeriod, eps: $eps, epsPeriod: $epsPeriod, netIncome: $netIncome, netIncomePeriod: $netIncomePeriod, medianVolume20d: $medianVolume20d)';
}


}

/// @nodoc
abstract mixin class $CompanySummaryCopyWith<$Res>  {
  factory $CompanySummaryCopyWith(CompanySummary value, $Res Function(CompanySummary) _then) = _$CompanySummaryCopyWithImpl;
@useResult
$Res call({
 String ticker,@JsonKey(name: 'name_en') String nameEn,@JsonKey(name: 'name_ar') String? nameAr, String? sector, String exchange,@JsonKey(name: 'has_cash_or_trash') bool hasCashOrTrash,@JsonKey(name: 'has_research') bool hasResearch,@JsonKey(name: 'market_cap') double? marketCap,@JsonKey(name: 'avg_volume_30d') double? avgVolume30d, double? pe,@JsonKey(name: 'pe_period') String? pePeriod, double? eps,@JsonKey(name: 'eps_period') String? epsPeriod,@JsonKey(name: 'net_income') double? netIncome,@JsonKey(name: 'net_income_period') String? netIncomePeriod,@JsonKey(name: 'median_volume_20d') double? medianVolume20d
});




}
/// @nodoc
class _$CompanySummaryCopyWithImpl<$Res>
    implements $CompanySummaryCopyWith<$Res> {
  _$CompanySummaryCopyWithImpl(this._self, this._then);

  final CompanySummary _self;
  final $Res Function(CompanySummary) _then;

/// Create a copy of CompanySummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? nameEn = null,Object? nameAr = freezed,Object? sector = freezed,Object? exchange = null,Object? hasCashOrTrash = null,Object? hasResearch = null,Object? marketCap = freezed,Object? avgVolume30d = freezed,Object? pe = freezed,Object? pePeriod = freezed,Object? eps = freezed,Object? epsPeriod = freezed,Object? netIncome = freezed,Object? netIncomePeriod = freezed,Object? medianVolume20d = freezed,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,nameEn: null == nameEn ? _self.nameEn : nameEn // ignore: cast_nullable_to_non_nullable
as String,nameAr: freezed == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String?,sector: freezed == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String?,exchange: null == exchange ? _self.exchange : exchange // ignore: cast_nullable_to_non_nullable
as String,hasCashOrTrash: null == hasCashOrTrash ? _self.hasCashOrTrash : hasCashOrTrash // ignore: cast_nullable_to_non_nullable
as bool,hasResearch: null == hasResearch ? _self.hasResearch : hasResearch // ignore: cast_nullable_to_non_nullable
as bool,marketCap: freezed == marketCap ? _self.marketCap : marketCap // ignore: cast_nullable_to_non_nullable
as double?,avgVolume30d: freezed == avgVolume30d ? _self.avgVolume30d : avgVolume30d // ignore: cast_nullable_to_non_nullable
as double?,pe: freezed == pe ? _self.pe : pe // ignore: cast_nullable_to_non_nullable
as double?,pePeriod: freezed == pePeriod ? _self.pePeriod : pePeriod // ignore: cast_nullable_to_non_nullable
as String?,eps: freezed == eps ? _self.eps : eps // ignore: cast_nullable_to_non_nullable
as double?,epsPeriod: freezed == epsPeriod ? _self.epsPeriod : epsPeriod // ignore: cast_nullable_to_non_nullable
as String?,netIncome: freezed == netIncome ? _self.netIncome : netIncome // ignore: cast_nullable_to_non_nullable
as double?,netIncomePeriod: freezed == netIncomePeriod ? _self.netIncomePeriod : netIncomePeriod // ignore: cast_nullable_to_non_nullable
as String?,medianVolume20d: freezed == medianVolume20d ? _self.medianVolume20d : medianVolume20d // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [CompanySummary].
extension CompanySummaryPatterns on CompanySummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CompanySummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CompanySummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CompanySummary value)  $default,){
final _that = this;
switch (_that) {
case _CompanySummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CompanySummary value)?  $default,){
final _that = this;
switch (_that) {
case _CompanySummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker, @JsonKey(name: 'name_en')  String nameEn, @JsonKey(name: 'name_ar')  String? nameAr,  String? sector,  String exchange, @JsonKey(name: 'has_cash_or_trash')  bool hasCashOrTrash, @JsonKey(name: 'has_research')  bool hasResearch, @JsonKey(name: 'market_cap')  double? marketCap, @JsonKey(name: 'avg_volume_30d')  double? avgVolume30d,  double? pe, @JsonKey(name: 'pe_period')  String? pePeriod,  double? eps, @JsonKey(name: 'eps_period')  String? epsPeriod, @JsonKey(name: 'net_income')  double? netIncome, @JsonKey(name: 'net_income_period')  String? netIncomePeriod, @JsonKey(name: 'median_volume_20d')  double? medianVolume20d)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CompanySummary() when $default != null:
return $default(_that.ticker,_that.nameEn,_that.nameAr,_that.sector,_that.exchange,_that.hasCashOrTrash,_that.hasResearch,_that.marketCap,_that.avgVolume30d,_that.pe,_that.pePeriod,_that.eps,_that.epsPeriod,_that.netIncome,_that.netIncomePeriod,_that.medianVolume20d);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker, @JsonKey(name: 'name_en')  String nameEn, @JsonKey(name: 'name_ar')  String? nameAr,  String? sector,  String exchange, @JsonKey(name: 'has_cash_or_trash')  bool hasCashOrTrash, @JsonKey(name: 'has_research')  bool hasResearch, @JsonKey(name: 'market_cap')  double? marketCap, @JsonKey(name: 'avg_volume_30d')  double? avgVolume30d,  double? pe, @JsonKey(name: 'pe_period')  String? pePeriod,  double? eps, @JsonKey(name: 'eps_period')  String? epsPeriod, @JsonKey(name: 'net_income')  double? netIncome, @JsonKey(name: 'net_income_period')  String? netIncomePeriod, @JsonKey(name: 'median_volume_20d')  double? medianVolume20d)  $default,) {final _that = this;
switch (_that) {
case _CompanySummary():
return $default(_that.ticker,_that.nameEn,_that.nameAr,_that.sector,_that.exchange,_that.hasCashOrTrash,_that.hasResearch,_that.marketCap,_that.avgVolume30d,_that.pe,_that.pePeriod,_that.eps,_that.epsPeriod,_that.netIncome,_that.netIncomePeriod,_that.medianVolume20d);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker, @JsonKey(name: 'name_en')  String nameEn, @JsonKey(name: 'name_ar')  String? nameAr,  String? sector,  String exchange, @JsonKey(name: 'has_cash_or_trash')  bool hasCashOrTrash, @JsonKey(name: 'has_research')  bool hasResearch, @JsonKey(name: 'market_cap')  double? marketCap, @JsonKey(name: 'avg_volume_30d')  double? avgVolume30d,  double? pe, @JsonKey(name: 'pe_period')  String? pePeriod,  double? eps, @JsonKey(name: 'eps_period')  String? epsPeriod, @JsonKey(name: 'net_income')  double? netIncome, @JsonKey(name: 'net_income_period')  String? netIncomePeriod, @JsonKey(name: 'median_volume_20d')  double? medianVolume20d)?  $default,) {final _that = this;
switch (_that) {
case _CompanySummary() when $default != null:
return $default(_that.ticker,_that.nameEn,_that.nameAr,_that.sector,_that.exchange,_that.hasCashOrTrash,_that.hasResearch,_that.marketCap,_that.avgVolume30d,_that.pe,_that.pePeriod,_that.eps,_that.epsPeriod,_that.netIncome,_that.netIncomePeriod,_that.medianVolume20d);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CompanySummary extends CompanySummary {
  const _CompanySummary({required this.ticker, @JsonKey(name: 'name_en') required this.nameEn, @JsonKey(name: 'name_ar') this.nameAr, this.sector, this.exchange = 'EGX', @JsonKey(name: 'has_cash_or_trash') this.hasCashOrTrash = false, @JsonKey(name: 'has_research') this.hasResearch = false, @JsonKey(name: 'market_cap') this.marketCap, @JsonKey(name: 'avg_volume_30d') this.avgVolume30d, this.pe, @JsonKey(name: 'pe_period') this.pePeriod, this.eps, @JsonKey(name: 'eps_period') this.epsPeriod, @JsonKey(name: 'net_income') this.netIncome, @JsonKey(name: 'net_income_period') this.netIncomePeriod, @JsonKey(name: 'median_volume_20d') this.medianVolume20d}): super._();
  factory _CompanySummary.fromJson(Map<String, dynamic> json) => _$CompanySummaryFromJson(json);

@override final  String ticker;
@override@JsonKey(name: 'name_en') final  String nameEn;
@override@JsonKey(name: 'name_ar') final  String? nameAr;
@override final  String? sector;
@override@JsonKey() final  String exchange;
@override@JsonKey(name: 'has_cash_or_trash') final  bool hasCashOrTrash;
@override@JsonKey(name: 'has_research') final  bool hasResearch;
/// Numbers the directory can narrow itself by without opening 282 files.
///
/// Slow-moving ones only. Price, change and volume are not here because
/// they move through the session and the screen already watches the live
/// snapshot, which is fresher than this document will ever be.
@override@JsonKey(name: 'market_cap') final  double? marketCap;
@override@JsonKey(name: 'avg_volume_30d') final  double? avgVolume30d;
/// The last traded price over the company's own filed annual earnings.
///
/// Absent for more than a third of the exchange, and every absence is
/// deliberate — a loss, no filed figure, or two independent routes to the
/// ratio disagreeing. See `price_earnings` in build_market_api.py.
@override final  double? pe;
/// The financial year the earnings in [pe] were filed for. A newest annual
/// filing can be eighteen months old, and "P/E 8" against 2023 earnings is
/// a different claim from the same number against 2025.
@override@JsonKey(name: 'pe_period') final  String? pePeriod;
/// What the company earned per share, in pounds, over [epsPeriod].
///
/// **Losses are here.** Minus two pounds a share is a fact about a year and
/// reads as one; it is only a ratio like [pe] that a negative breaks, where
/// the minus sign silently becomes "cheapest on the exchange".
@override final  double? eps;
@override@JsonKey(name: 'eps_period') final  String? epsPeriod;
/// The company's own filed annual profit, in the millions of pounds it was
/// filed in, over [netIncomePeriod].
@override@JsonKey(name: 'net_income') final  double? netIncome;
@override@JsonKey(name: 'net_income_period') final  String? netIncomePeriod;
/// Shares traded on a normal day — the twenty-day median.
///
/// Carried so the list can answer "busier than usual" for itself: today's
/// volume comes from the live snapshot, and this is what it is unusual
/// against.
@override@JsonKey(name: 'median_volume_20d') final  double? medianVolume20d;

/// Create a copy of CompanySummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CompanySummaryCopyWith<_CompanySummary> get copyWith => __$CompanySummaryCopyWithImpl<_CompanySummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CompanySummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CompanySummary&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.nameEn, nameEn) || other.nameEn == nameEn)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.exchange, exchange) || other.exchange == exchange)&&(identical(other.hasCashOrTrash, hasCashOrTrash) || other.hasCashOrTrash == hasCashOrTrash)&&(identical(other.hasResearch, hasResearch) || other.hasResearch == hasResearch)&&(identical(other.marketCap, marketCap) || other.marketCap == marketCap)&&(identical(other.avgVolume30d, avgVolume30d) || other.avgVolume30d == avgVolume30d)&&(identical(other.pe, pe) || other.pe == pe)&&(identical(other.pePeriod, pePeriod) || other.pePeriod == pePeriod)&&(identical(other.eps, eps) || other.eps == eps)&&(identical(other.epsPeriod, epsPeriod) || other.epsPeriod == epsPeriod)&&(identical(other.netIncome, netIncome) || other.netIncome == netIncome)&&(identical(other.netIncomePeriod, netIncomePeriod) || other.netIncomePeriod == netIncomePeriod)&&(identical(other.medianVolume20d, medianVolume20d) || other.medianVolume20d == medianVolume20d));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,nameEn,nameAr,sector,exchange,hasCashOrTrash,hasResearch,marketCap,avgVolume30d,pe,pePeriod,eps,epsPeriod,netIncome,netIncomePeriod,medianVolume20d);

@override
String toString() {
  return 'CompanySummary(ticker: $ticker, nameEn: $nameEn, nameAr: $nameAr, sector: $sector, exchange: $exchange, hasCashOrTrash: $hasCashOrTrash, hasResearch: $hasResearch, marketCap: $marketCap, avgVolume30d: $avgVolume30d, pe: $pe, pePeriod: $pePeriod, eps: $eps, epsPeriod: $epsPeriod, netIncome: $netIncome, netIncomePeriod: $netIncomePeriod, medianVolume20d: $medianVolume20d)';
}


}

/// @nodoc
abstract mixin class _$CompanySummaryCopyWith<$Res> implements $CompanySummaryCopyWith<$Res> {
  factory _$CompanySummaryCopyWith(_CompanySummary value, $Res Function(_CompanySummary) _then) = __$CompanySummaryCopyWithImpl;
@override @useResult
$Res call({
 String ticker,@JsonKey(name: 'name_en') String nameEn,@JsonKey(name: 'name_ar') String? nameAr, String? sector, String exchange,@JsonKey(name: 'has_cash_or_trash') bool hasCashOrTrash,@JsonKey(name: 'has_research') bool hasResearch,@JsonKey(name: 'market_cap') double? marketCap,@JsonKey(name: 'avg_volume_30d') double? avgVolume30d, double? pe,@JsonKey(name: 'pe_period') String? pePeriod, double? eps,@JsonKey(name: 'eps_period') String? epsPeriod,@JsonKey(name: 'net_income') double? netIncome,@JsonKey(name: 'net_income_period') String? netIncomePeriod,@JsonKey(name: 'median_volume_20d') double? medianVolume20d
});




}
/// @nodoc
class __$CompanySummaryCopyWithImpl<$Res>
    implements _$CompanySummaryCopyWith<$Res> {
  __$CompanySummaryCopyWithImpl(this._self, this._then);

  final _CompanySummary _self;
  final $Res Function(_CompanySummary) _then;

/// Create a copy of CompanySummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? nameEn = null,Object? nameAr = freezed,Object? sector = freezed,Object? exchange = null,Object? hasCashOrTrash = null,Object? hasResearch = null,Object? marketCap = freezed,Object? avgVolume30d = freezed,Object? pe = freezed,Object? pePeriod = freezed,Object? eps = freezed,Object? epsPeriod = freezed,Object? netIncome = freezed,Object? netIncomePeriod = freezed,Object? medianVolume20d = freezed,}) {
  return _then(_CompanySummary(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,nameEn: null == nameEn ? _self.nameEn : nameEn // ignore: cast_nullable_to_non_nullable
as String,nameAr: freezed == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String?,sector: freezed == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String?,exchange: null == exchange ? _self.exchange : exchange // ignore: cast_nullable_to_non_nullable
as String,hasCashOrTrash: null == hasCashOrTrash ? _self.hasCashOrTrash : hasCashOrTrash // ignore: cast_nullable_to_non_nullable
as bool,hasResearch: null == hasResearch ? _self.hasResearch : hasResearch // ignore: cast_nullable_to_non_nullable
as bool,marketCap: freezed == marketCap ? _self.marketCap : marketCap // ignore: cast_nullable_to_non_nullable
as double?,avgVolume30d: freezed == avgVolume30d ? _self.avgVolume30d : avgVolume30d // ignore: cast_nullable_to_non_nullable
as double?,pe: freezed == pe ? _self.pe : pe // ignore: cast_nullable_to_non_nullable
as double?,pePeriod: freezed == pePeriod ? _self.pePeriod : pePeriod // ignore: cast_nullable_to_non_nullable
as String?,eps: freezed == eps ? _self.eps : eps // ignore: cast_nullable_to_non_nullable
as double?,epsPeriod: freezed == epsPeriod ? _self.epsPeriod : epsPeriod // ignore: cast_nullable_to_non_nullable
as String?,netIncome: freezed == netIncome ? _self.netIncome : netIncome // ignore: cast_nullable_to_non_nullable
as double?,netIncomePeriod: freezed == netIncomePeriod ? _self.netIncomePeriod : netIncomePeriod // ignore: cast_nullable_to_non_nullable
as String?,medianVolume20d: freezed == medianVolume20d ? _self.medianVolume20d : medianVolume20d // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}


/// @nodoc
mixin _$CompanyDebt {

 String get period;@JsonKey(name: 'as_of') String? get asOf;@JsonKey(name: 'filing_id') String? get filingId; String? get source;/// `finance` for a bank or lender, where borrowing funds the book it lends
/// out of, and `operating` for everybody else, where it has to be repaid
/// out of what the business earns. The same figures, a different question.
 String get frame; double get borrowings;@JsonKey(name: 'short_term') double? get shortTerm;@JsonKey(name: 'long_term') double? get longTerm; double? get cash;@JsonKey(name: 'net_debt') double? get netDebt;@JsonKey(name: 'finance_cost') double? get financeCost;/// Share of borrowings falling due inside a year, 0-1.
@JsonKey(name: 'due_within_year') double? get dueWithinYear;/// Operating profit divided by what the borrowings cost for the same
/// period, and borrowings divided by equity.
 double? get cover; double? get gearing; String? get pattern; DebtChange? get change; CompanyDebtRead? get read;
/// Create a copy of CompanyDebt
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CompanyDebtCopyWith<CompanyDebt> get copyWith => _$CompanyDebtCopyWithImpl<CompanyDebt>(this as CompanyDebt, _$identity);

  /// Serializes this CompanyDebt to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CompanyDebt&&(identical(other.period, period) || other.period == period)&&(identical(other.asOf, asOf) || other.asOf == asOf)&&(identical(other.filingId, filingId) || other.filingId == filingId)&&(identical(other.source, source) || other.source == source)&&(identical(other.frame, frame) || other.frame == frame)&&(identical(other.borrowings, borrowings) || other.borrowings == borrowings)&&(identical(other.shortTerm, shortTerm) || other.shortTerm == shortTerm)&&(identical(other.longTerm, longTerm) || other.longTerm == longTerm)&&(identical(other.cash, cash) || other.cash == cash)&&(identical(other.netDebt, netDebt) || other.netDebt == netDebt)&&(identical(other.financeCost, financeCost) || other.financeCost == financeCost)&&(identical(other.dueWithinYear, dueWithinYear) || other.dueWithinYear == dueWithinYear)&&(identical(other.cover, cover) || other.cover == cover)&&(identical(other.gearing, gearing) || other.gearing == gearing)&&(identical(other.pattern, pattern) || other.pattern == pattern)&&(identical(other.change, change) || other.change == change)&&(identical(other.read, read) || other.read == read));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,period,asOf,filingId,source,frame,borrowings,shortTerm,longTerm,cash,netDebt,financeCost,dueWithinYear,cover,gearing,pattern,change,read);

@override
String toString() {
  return 'CompanyDebt(period: $period, asOf: $asOf, filingId: $filingId, source: $source, frame: $frame, borrowings: $borrowings, shortTerm: $shortTerm, longTerm: $longTerm, cash: $cash, netDebt: $netDebt, financeCost: $financeCost, dueWithinYear: $dueWithinYear, cover: $cover, gearing: $gearing, pattern: $pattern, change: $change, read: $read)';
}


}

/// @nodoc
abstract mixin class $CompanyDebtCopyWith<$Res>  {
  factory $CompanyDebtCopyWith(CompanyDebt value, $Res Function(CompanyDebt) _then) = _$CompanyDebtCopyWithImpl;
@useResult
$Res call({
 String period,@JsonKey(name: 'as_of') String? asOf,@JsonKey(name: 'filing_id') String? filingId, String? source, String frame, double borrowings,@JsonKey(name: 'short_term') double? shortTerm,@JsonKey(name: 'long_term') double? longTerm, double? cash,@JsonKey(name: 'net_debt') double? netDebt,@JsonKey(name: 'finance_cost') double? financeCost,@JsonKey(name: 'due_within_year') double? dueWithinYear, double? cover, double? gearing, String? pattern, DebtChange? change, CompanyDebtRead? read
});


$DebtChangeCopyWith<$Res>? get change;$CompanyDebtReadCopyWith<$Res>? get read;

}
/// @nodoc
class _$CompanyDebtCopyWithImpl<$Res>
    implements $CompanyDebtCopyWith<$Res> {
  _$CompanyDebtCopyWithImpl(this._self, this._then);

  final CompanyDebt _self;
  final $Res Function(CompanyDebt) _then;

/// Create a copy of CompanyDebt
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? period = null,Object? asOf = freezed,Object? filingId = freezed,Object? source = freezed,Object? frame = null,Object? borrowings = null,Object? shortTerm = freezed,Object? longTerm = freezed,Object? cash = freezed,Object? netDebt = freezed,Object? financeCost = freezed,Object? dueWithinYear = freezed,Object? cover = freezed,Object? gearing = freezed,Object? pattern = freezed,Object? change = freezed,Object? read = freezed,}) {
  return _then(_self.copyWith(
period: null == period ? _self.period : period // ignore: cast_nullable_to_non_nullable
as String,asOf: freezed == asOf ? _self.asOf : asOf // ignore: cast_nullable_to_non_nullable
as String?,filingId: freezed == filingId ? _self.filingId : filingId // ignore: cast_nullable_to_non_nullable
as String?,source: freezed == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String?,frame: null == frame ? _self.frame : frame // ignore: cast_nullable_to_non_nullable
as String,borrowings: null == borrowings ? _self.borrowings : borrowings // ignore: cast_nullable_to_non_nullable
as double,shortTerm: freezed == shortTerm ? _self.shortTerm : shortTerm // ignore: cast_nullable_to_non_nullable
as double?,longTerm: freezed == longTerm ? _self.longTerm : longTerm // ignore: cast_nullable_to_non_nullable
as double?,cash: freezed == cash ? _self.cash : cash // ignore: cast_nullable_to_non_nullable
as double?,netDebt: freezed == netDebt ? _self.netDebt : netDebt // ignore: cast_nullable_to_non_nullable
as double?,financeCost: freezed == financeCost ? _self.financeCost : financeCost // ignore: cast_nullable_to_non_nullable
as double?,dueWithinYear: freezed == dueWithinYear ? _self.dueWithinYear : dueWithinYear // ignore: cast_nullable_to_non_nullable
as double?,cover: freezed == cover ? _self.cover : cover // ignore: cast_nullable_to_non_nullable
as double?,gearing: freezed == gearing ? _self.gearing : gearing // ignore: cast_nullable_to_non_nullable
as double?,pattern: freezed == pattern ? _self.pattern : pattern // ignore: cast_nullable_to_non_nullable
as String?,change: freezed == change ? _self.change : change // ignore: cast_nullable_to_non_nullable
as DebtChange?,read: freezed == read ? _self.read : read // ignore: cast_nullable_to_non_nullable
as CompanyDebtRead?,
  ));
}
/// Create a copy of CompanyDebt
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DebtChangeCopyWith<$Res>? get change {
    if (_self.change == null) {
    return null;
  }

  return $DebtChangeCopyWith<$Res>(_self.change!, (value) {
    return _then(_self.copyWith(change: value));
  });
}/// Create a copy of CompanyDebt
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CompanyDebtReadCopyWith<$Res>? get read {
    if (_self.read == null) {
    return null;
  }

  return $CompanyDebtReadCopyWith<$Res>(_self.read!, (value) {
    return _then(_self.copyWith(read: value));
  });
}
}


/// Adds pattern-matching-related methods to [CompanyDebt].
extension CompanyDebtPatterns on CompanyDebt {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CompanyDebt value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CompanyDebt() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CompanyDebt value)  $default,){
final _that = this;
switch (_that) {
case _CompanyDebt():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CompanyDebt value)?  $default,){
final _that = this;
switch (_that) {
case _CompanyDebt() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String period, @JsonKey(name: 'as_of')  String? asOf, @JsonKey(name: 'filing_id')  String? filingId,  String? source,  String frame,  double borrowings, @JsonKey(name: 'short_term')  double? shortTerm, @JsonKey(name: 'long_term')  double? longTerm,  double? cash, @JsonKey(name: 'net_debt')  double? netDebt, @JsonKey(name: 'finance_cost')  double? financeCost, @JsonKey(name: 'due_within_year')  double? dueWithinYear,  double? cover,  double? gearing,  String? pattern,  DebtChange? change,  CompanyDebtRead? read)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CompanyDebt() when $default != null:
return $default(_that.period,_that.asOf,_that.filingId,_that.source,_that.frame,_that.borrowings,_that.shortTerm,_that.longTerm,_that.cash,_that.netDebt,_that.financeCost,_that.dueWithinYear,_that.cover,_that.gearing,_that.pattern,_that.change,_that.read);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String period, @JsonKey(name: 'as_of')  String? asOf, @JsonKey(name: 'filing_id')  String? filingId,  String? source,  String frame,  double borrowings, @JsonKey(name: 'short_term')  double? shortTerm, @JsonKey(name: 'long_term')  double? longTerm,  double? cash, @JsonKey(name: 'net_debt')  double? netDebt, @JsonKey(name: 'finance_cost')  double? financeCost, @JsonKey(name: 'due_within_year')  double? dueWithinYear,  double? cover,  double? gearing,  String? pattern,  DebtChange? change,  CompanyDebtRead? read)  $default,) {final _that = this;
switch (_that) {
case _CompanyDebt():
return $default(_that.period,_that.asOf,_that.filingId,_that.source,_that.frame,_that.borrowings,_that.shortTerm,_that.longTerm,_that.cash,_that.netDebt,_that.financeCost,_that.dueWithinYear,_that.cover,_that.gearing,_that.pattern,_that.change,_that.read);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String period, @JsonKey(name: 'as_of')  String? asOf, @JsonKey(name: 'filing_id')  String? filingId,  String? source,  String frame,  double borrowings, @JsonKey(name: 'short_term')  double? shortTerm, @JsonKey(name: 'long_term')  double? longTerm,  double? cash, @JsonKey(name: 'net_debt')  double? netDebt, @JsonKey(name: 'finance_cost')  double? financeCost, @JsonKey(name: 'due_within_year')  double? dueWithinYear,  double? cover,  double? gearing,  String? pattern,  DebtChange? change,  CompanyDebtRead? read)?  $default,) {final _that = this;
switch (_that) {
case _CompanyDebt() when $default != null:
return $default(_that.period,_that.asOf,_that.filingId,_that.source,_that.frame,_that.borrowings,_that.shortTerm,_that.longTerm,_that.cash,_that.netDebt,_that.financeCost,_that.dueWithinYear,_that.cover,_that.gearing,_that.pattern,_that.change,_that.read);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CompanyDebt extends CompanyDebt {
  const _CompanyDebt({this.period = '', @JsonKey(name: 'as_of') this.asOf, @JsonKey(name: 'filing_id') this.filingId, this.source, this.frame = 'operating', this.borrowings = 0, @JsonKey(name: 'short_term') this.shortTerm, @JsonKey(name: 'long_term') this.longTerm, this.cash, @JsonKey(name: 'net_debt') this.netDebt, @JsonKey(name: 'finance_cost') this.financeCost, @JsonKey(name: 'due_within_year') this.dueWithinYear, this.cover, this.gearing, this.pattern, this.change, this.read}): super._();
  factory _CompanyDebt.fromJson(Map<String, dynamic> json) => _$CompanyDebtFromJson(json);

@override@JsonKey() final  String period;
@override@JsonKey(name: 'as_of') final  String? asOf;
@override@JsonKey(name: 'filing_id') final  String? filingId;
@override final  String? source;
/// `finance` for a bank or lender, where borrowing funds the book it lends
/// out of, and `operating` for everybody else, where it has to be repaid
/// out of what the business earns. The same figures, a different question.
@override@JsonKey() final  String frame;
@override@JsonKey() final  double borrowings;
@override@JsonKey(name: 'short_term') final  double? shortTerm;
@override@JsonKey(name: 'long_term') final  double? longTerm;
@override final  double? cash;
@override@JsonKey(name: 'net_debt') final  double? netDebt;
@override@JsonKey(name: 'finance_cost') final  double? financeCost;
/// Share of borrowings falling due inside a year, 0-1.
@override@JsonKey(name: 'due_within_year') final  double? dueWithinYear;
/// Operating profit divided by what the borrowings cost for the same
/// period, and borrowings divided by equity.
@override final  double? cover;
@override final  double? gearing;
@override final  String? pattern;
@override final  DebtChange? change;
@override final  CompanyDebtRead? read;

/// Create a copy of CompanyDebt
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CompanyDebtCopyWith<_CompanyDebt> get copyWith => __$CompanyDebtCopyWithImpl<_CompanyDebt>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CompanyDebtToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CompanyDebt&&(identical(other.period, period) || other.period == period)&&(identical(other.asOf, asOf) || other.asOf == asOf)&&(identical(other.filingId, filingId) || other.filingId == filingId)&&(identical(other.source, source) || other.source == source)&&(identical(other.frame, frame) || other.frame == frame)&&(identical(other.borrowings, borrowings) || other.borrowings == borrowings)&&(identical(other.shortTerm, shortTerm) || other.shortTerm == shortTerm)&&(identical(other.longTerm, longTerm) || other.longTerm == longTerm)&&(identical(other.cash, cash) || other.cash == cash)&&(identical(other.netDebt, netDebt) || other.netDebt == netDebt)&&(identical(other.financeCost, financeCost) || other.financeCost == financeCost)&&(identical(other.dueWithinYear, dueWithinYear) || other.dueWithinYear == dueWithinYear)&&(identical(other.cover, cover) || other.cover == cover)&&(identical(other.gearing, gearing) || other.gearing == gearing)&&(identical(other.pattern, pattern) || other.pattern == pattern)&&(identical(other.change, change) || other.change == change)&&(identical(other.read, read) || other.read == read));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,period,asOf,filingId,source,frame,borrowings,shortTerm,longTerm,cash,netDebt,financeCost,dueWithinYear,cover,gearing,pattern,change,read);

@override
String toString() {
  return 'CompanyDebt(period: $period, asOf: $asOf, filingId: $filingId, source: $source, frame: $frame, borrowings: $borrowings, shortTerm: $shortTerm, longTerm: $longTerm, cash: $cash, netDebt: $netDebt, financeCost: $financeCost, dueWithinYear: $dueWithinYear, cover: $cover, gearing: $gearing, pattern: $pattern, change: $change, read: $read)';
}


}

/// @nodoc
abstract mixin class _$CompanyDebtCopyWith<$Res> implements $CompanyDebtCopyWith<$Res> {
  factory _$CompanyDebtCopyWith(_CompanyDebt value, $Res Function(_CompanyDebt) _then) = __$CompanyDebtCopyWithImpl;
@override @useResult
$Res call({
 String period,@JsonKey(name: 'as_of') String? asOf,@JsonKey(name: 'filing_id') String? filingId, String? source, String frame, double borrowings,@JsonKey(name: 'short_term') double? shortTerm,@JsonKey(name: 'long_term') double? longTerm, double? cash,@JsonKey(name: 'net_debt') double? netDebt,@JsonKey(name: 'finance_cost') double? financeCost,@JsonKey(name: 'due_within_year') double? dueWithinYear, double? cover, double? gearing, String? pattern, DebtChange? change, CompanyDebtRead? read
});


@override $DebtChangeCopyWith<$Res>? get change;@override $CompanyDebtReadCopyWith<$Res>? get read;

}
/// @nodoc
class __$CompanyDebtCopyWithImpl<$Res>
    implements _$CompanyDebtCopyWith<$Res> {
  __$CompanyDebtCopyWithImpl(this._self, this._then);

  final _CompanyDebt _self;
  final $Res Function(_CompanyDebt) _then;

/// Create a copy of CompanyDebt
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? period = null,Object? asOf = freezed,Object? filingId = freezed,Object? source = freezed,Object? frame = null,Object? borrowings = null,Object? shortTerm = freezed,Object? longTerm = freezed,Object? cash = freezed,Object? netDebt = freezed,Object? financeCost = freezed,Object? dueWithinYear = freezed,Object? cover = freezed,Object? gearing = freezed,Object? pattern = freezed,Object? change = freezed,Object? read = freezed,}) {
  return _then(_CompanyDebt(
period: null == period ? _self.period : period // ignore: cast_nullable_to_non_nullable
as String,asOf: freezed == asOf ? _self.asOf : asOf // ignore: cast_nullable_to_non_nullable
as String?,filingId: freezed == filingId ? _self.filingId : filingId // ignore: cast_nullable_to_non_nullable
as String?,source: freezed == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String?,frame: null == frame ? _self.frame : frame // ignore: cast_nullable_to_non_nullable
as String,borrowings: null == borrowings ? _self.borrowings : borrowings // ignore: cast_nullable_to_non_nullable
as double,shortTerm: freezed == shortTerm ? _self.shortTerm : shortTerm // ignore: cast_nullable_to_non_nullable
as double?,longTerm: freezed == longTerm ? _self.longTerm : longTerm // ignore: cast_nullable_to_non_nullable
as double?,cash: freezed == cash ? _self.cash : cash // ignore: cast_nullable_to_non_nullable
as double?,netDebt: freezed == netDebt ? _self.netDebt : netDebt // ignore: cast_nullable_to_non_nullable
as double?,financeCost: freezed == financeCost ? _self.financeCost : financeCost // ignore: cast_nullable_to_non_nullable
as double?,dueWithinYear: freezed == dueWithinYear ? _self.dueWithinYear : dueWithinYear // ignore: cast_nullable_to_non_nullable
as double?,cover: freezed == cover ? _self.cover : cover // ignore: cast_nullable_to_non_nullable
as double?,gearing: freezed == gearing ? _self.gearing : gearing // ignore: cast_nullable_to_non_nullable
as double?,pattern: freezed == pattern ? _self.pattern : pattern // ignore: cast_nullable_to_non_nullable
as String?,change: freezed == change ? _self.change : change // ignore: cast_nullable_to_non_nullable
as DebtChange?,read: freezed == read ? _self.read : read // ignore: cast_nullable_to_non_nullable
as CompanyDebtRead?,
  ));
}

/// Create a copy of CompanyDebt
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DebtChangeCopyWith<$Res>? get change {
    if (_self.change == null) {
    return null;
  }

  return $DebtChangeCopyWith<$Res>(_self.change!, (value) {
    return _then(_self.copyWith(change: value));
  });
}/// Create a copy of CompanyDebt
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CompanyDebtReadCopyWith<$Res>? get read {
    if (_self.read == null) {
    return null;
  }

  return $CompanyDebtReadCopyWith<$Res>(_self.read!, (value) {
    return _then(_self.copyWith(read: value));
  });
}
}


/// @nodoc
mixin _$DebtChange {

 String get period;/// The balance-sheet date being compared against, and how it was found.
///
/// `balance_sheet` means the statement's own prior column, which is
/// normally the last year-end rather than the same period a year earlier —
/// a shorter window, and the only one obtainable, because the interim
/// filings a year back carry no attachment to read. `year_earlier` means a
/// genuine twelve months. The screen names [since] rather than saying
/// "a year ago", so the two can never be confused.
 String? get since; String get basis; double get borrowings; double get delta; String get direction;
/// Create a copy of DebtChange
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DebtChangeCopyWith<DebtChange> get copyWith => _$DebtChangeCopyWithImpl<DebtChange>(this as DebtChange, _$identity);

  /// Serializes this DebtChange to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DebtChange&&(identical(other.period, period) || other.period == period)&&(identical(other.since, since) || other.since == since)&&(identical(other.basis, basis) || other.basis == basis)&&(identical(other.borrowings, borrowings) || other.borrowings == borrowings)&&(identical(other.delta, delta) || other.delta == delta)&&(identical(other.direction, direction) || other.direction == direction));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,period,since,basis,borrowings,delta,direction);

@override
String toString() {
  return 'DebtChange(period: $period, since: $since, basis: $basis, borrowings: $borrowings, delta: $delta, direction: $direction)';
}


}

/// @nodoc
abstract mixin class $DebtChangeCopyWith<$Res>  {
  factory $DebtChangeCopyWith(DebtChange value, $Res Function(DebtChange) _then) = _$DebtChangeCopyWithImpl;
@useResult
$Res call({
 String period, String? since, String basis, double borrowings, double delta, String direction
});




}
/// @nodoc
class _$DebtChangeCopyWithImpl<$Res>
    implements $DebtChangeCopyWith<$Res> {
  _$DebtChangeCopyWithImpl(this._self, this._then);

  final DebtChange _self;
  final $Res Function(DebtChange) _then;

/// Create a copy of DebtChange
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? period = null,Object? since = freezed,Object? basis = null,Object? borrowings = null,Object? delta = null,Object? direction = null,}) {
  return _then(_self.copyWith(
period: null == period ? _self.period : period // ignore: cast_nullable_to_non_nullable
as String,since: freezed == since ? _self.since : since // ignore: cast_nullable_to_non_nullable
as String?,basis: null == basis ? _self.basis : basis // ignore: cast_nullable_to_non_nullable
as String,borrowings: null == borrowings ? _self.borrowings : borrowings // ignore: cast_nullable_to_non_nullable
as double,delta: null == delta ? _self.delta : delta // ignore: cast_nullable_to_non_nullable
as double,direction: null == direction ? _self.direction : direction // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [DebtChange].
extension DebtChangePatterns on DebtChange {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DebtChange value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DebtChange() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DebtChange value)  $default,){
final _that = this;
switch (_that) {
case _DebtChange():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DebtChange value)?  $default,){
final _that = this;
switch (_that) {
case _DebtChange() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String period,  String? since,  String basis,  double borrowings,  double delta,  String direction)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DebtChange() when $default != null:
return $default(_that.period,_that.since,_that.basis,_that.borrowings,_that.delta,_that.direction);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String period,  String? since,  String basis,  double borrowings,  double delta,  String direction)  $default,) {final _that = this;
switch (_that) {
case _DebtChange():
return $default(_that.period,_that.since,_that.basis,_that.borrowings,_that.delta,_that.direction);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String period,  String? since,  String basis,  double borrowings,  double delta,  String direction)?  $default,) {final _that = this;
switch (_that) {
case _DebtChange() when $default != null:
return $default(_that.period,_that.since,_that.basis,_that.borrowings,_that.delta,_that.direction);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DebtChange implements DebtChange {
  const _DebtChange({this.period = '', this.since, this.basis = 'balance_sheet', this.borrowings = 0, this.delta = 0, this.direction = ''});
  factory _DebtChange.fromJson(Map<String, dynamic> json) => _$DebtChangeFromJson(json);

@override@JsonKey() final  String period;
/// The balance-sheet date being compared against, and how it was found.
///
/// `balance_sheet` means the statement's own prior column, which is
/// normally the last year-end rather than the same period a year earlier —
/// a shorter window, and the only one obtainable, because the interim
/// filings a year back carry no attachment to read. `year_earlier` means a
/// genuine twelve months. The screen names [since] rather than saying
/// "a year ago", so the two can never be confused.
@override final  String? since;
@override@JsonKey() final  String basis;
@override@JsonKey() final  double borrowings;
@override@JsonKey() final  double delta;
@override@JsonKey() final  String direction;

/// Create a copy of DebtChange
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DebtChangeCopyWith<_DebtChange> get copyWith => __$DebtChangeCopyWithImpl<_DebtChange>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DebtChangeToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DebtChange&&(identical(other.period, period) || other.period == period)&&(identical(other.since, since) || other.since == since)&&(identical(other.basis, basis) || other.basis == basis)&&(identical(other.borrowings, borrowings) || other.borrowings == borrowings)&&(identical(other.delta, delta) || other.delta == delta)&&(identical(other.direction, direction) || other.direction == direction));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,period,since,basis,borrowings,delta,direction);

@override
String toString() {
  return 'DebtChange(period: $period, since: $since, basis: $basis, borrowings: $borrowings, delta: $delta, direction: $direction)';
}


}

/// @nodoc
abstract mixin class _$DebtChangeCopyWith<$Res> implements $DebtChangeCopyWith<$Res> {
  factory _$DebtChangeCopyWith(_DebtChange value, $Res Function(_DebtChange) _then) = __$DebtChangeCopyWithImpl;
@override @useResult
$Res call({
 String period, String? since, String basis, double borrowings, double delta, String direction
});




}
/// @nodoc
class __$DebtChangeCopyWithImpl<$Res>
    implements _$DebtChangeCopyWith<$Res> {
  __$DebtChangeCopyWithImpl(this._self, this._then);

  final _DebtChange _self;
  final $Res Function(_DebtChange) _then;

/// Create a copy of DebtChange
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? period = null,Object? since = freezed,Object? basis = null,Object? borrowings = null,Object? delta = null,Object? direction = null,}) {
  return _then(_DebtChange(
period: null == period ? _self.period : period // ignore: cast_nullable_to_non_nullable
as String,since: freezed == since ? _self.since : since // ignore: cast_nullable_to_non_nullable
as String?,basis: null == basis ? _self.basis : basis // ignore: cast_nullable_to_non_nullable
as String,borrowings: null == borrowings ? _self.borrowings : borrowings // ignore: cast_nullable_to_non_nullable
as double,delta: null == delta ? _self.delta : delta // ignore: cast_nullable_to_non_nullable
as double,direction: null == direction ? _self.direction : direction // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$CompanyDebtRead {

 String get read;@JsonKey(name: 'read_ar') String get readAr;
/// Create a copy of CompanyDebtRead
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CompanyDebtReadCopyWith<CompanyDebtRead> get copyWith => _$CompanyDebtReadCopyWithImpl<CompanyDebtRead>(this as CompanyDebtRead, _$identity);

  /// Serializes this CompanyDebtRead to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CompanyDebtRead&&(identical(other.read, read) || other.read == read)&&(identical(other.readAr, readAr) || other.readAr == readAr));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,read,readAr);

@override
String toString() {
  return 'CompanyDebtRead(read: $read, readAr: $readAr)';
}


}

/// @nodoc
abstract mixin class $CompanyDebtReadCopyWith<$Res>  {
  factory $CompanyDebtReadCopyWith(CompanyDebtRead value, $Res Function(CompanyDebtRead) _then) = _$CompanyDebtReadCopyWithImpl;
@useResult
$Res call({
 String read,@JsonKey(name: 'read_ar') String readAr
});




}
/// @nodoc
class _$CompanyDebtReadCopyWithImpl<$Res>
    implements $CompanyDebtReadCopyWith<$Res> {
  _$CompanyDebtReadCopyWithImpl(this._self, this._then);

  final CompanyDebtRead _self;
  final $Res Function(CompanyDebtRead) _then;

/// Create a copy of CompanyDebtRead
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? read = null,Object? readAr = null,}) {
  return _then(_self.copyWith(
read: null == read ? _self.read : read // ignore: cast_nullable_to_non_nullable
as String,readAr: null == readAr ? _self.readAr : readAr // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [CompanyDebtRead].
extension CompanyDebtReadPatterns on CompanyDebtRead {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CompanyDebtRead value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CompanyDebtRead() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CompanyDebtRead value)  $default,){
final _that = this;
switch (_that) {
case _CompanyDebtRead():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CompanyDebtRead value)?  $default,){
final _that = this;
switch (_that) {
case _CompanyDebtRead() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String read, @JsonKey(name: 'read_ar')  String readAr)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CompanyDebtRead() when $default != null:
return $default(_that.read,_that.readAr);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String read, @JsonKey(name: 'read_ar')  String readAr)  $default,) {final _that = this;
switch (_that) {
case _CompanyDebtRead():
return $default(_that.read,_that.readAr);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String read, @JsonKey(name: 'read_ar')  String readAr)?  $default,) {final _that = this;
switch (_that) {
case _CompanyDebtRead() when $default != null:
return $default(_that.read,_that.readAr);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CompanyDebtRead implements CompanyDebtRead {
  const _CompanyDebtRead({this.read = '', @JsonKey(name: 'read_ar') this.readAr = ''});
  factory _CompanyDebtRead.fromJson(Map<String, dynamic> json) => _$CompanyDebtReadFromJson(json);

@override@JsonKey() final  String read;
@override@JsonKey(name: 'read_ar') final  String readAr;

/// Create a copy of CompanyDebtRead
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CompanyDebtReadCopyWith<_CompanyDebtRead> get copyWith => __$CompanyDebtReadCopyWithImpl<_CompanyDebtRead>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CompanyDebtReadToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CompanyDebtRead&&(identical(other.read, read) || other.read == read)&&(identical(other.readAr, readAr) || other.readAr == readAr));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,read,readAr);

@override
String toString() {
  return 'CompanyDebtRead(read: $read, readAr: $readAr)';
}


}

/// @nodoc
abstract mixin class _$CompanyDebtReadCopyWith<$Res> implements $CompanyDebtReadCopyWith<$Res> {
  factory _$CompanyDebtReadCopyWith(_CompanyDebtRead value, $Res Function(_CompanyDebtRead) _then) = __$CompanyDebtReadCopyWithImpl;
@override @useResult
$Res call({
 String read,@JsonKey(name: 'read_ar') String readAr
});




}
/// @nodoc
class __$CompanyDebtReadCopyWithImpl<$Res>
    implements _$CompanyDebtReadCopyWith<$Res> {
  __$CompanyDebtReadCopyWithImpl(this._self, this._then);

  final _CompanyDebtRead _self;
  final $Res Function(_CompanyDebtRead) _then;

/// Create a copy of CompanyDebtRead
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? read = null,Object? readAr = null,}) {
  return _then(_CompanyDebtRead(
read: null == read ? _self.read : read // ignore: cast_nullable_to_non_nullable
as String,readAr: null == readAr ? _self.readAr : readAr // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$Company {

 String get ticker; LocalizedName get name; String? get sector; CompanyMarket? get market;/// Whatever the ingestion source knew about the company beyond price —
/// market cap, shares outstanding, free float. Deliberately loose: the
/// fields available differ by provider and a missing one must simply not
/// render (spec §49).
 Map<String, dynamic>? get profile;@JsonKey(name: 'price_history') List<PricePoint> get priceHistory; CompanyFinancials get financials; List<ResearchLink> get research;/// What the company is doing with its borrowings, when it has any it
/// filed. Absent for a company that reported none, which is an answer
/// rather than a gap.
 CompanyDebt? get debt;
/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CompanyCopyWith<Company> get copyWith => _$CompanyCopyWithImpl<Company>(this as Company, _$identity);

  /// Serializes this Company to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Company&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.name, name) || other.name == name)&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.market, market) || other.market == market)&&const DeepCollectionEquality().equals(other.profile, profile)&&const DeepCollectionEquality().equals(other.priceHistory, priceHistory)&&(identical(other.financials, financials) || other.financials == financials)&&const DeepCollectionEquality().equals(other.research, research)&&(identical(other.debt, debt) || other.debt == debt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,name,sector,market,const DeepCollectionEquality().hash(profile),const DeepCollectionEquality().hash(priceHistory),financials,const DeepCollectionEquality().hash(research),debt);

@override
String toString() {
  return 'Company(ticker: $ticker, name: $name, sector: $sector, market: $market, profile: $profile, priceHistory: $priceHistory, financials: $financials, research: $research, debt: $debt)';
}


}

/// @nodoc
abstract mixin class $CompanyCopyWith<$Res>  {
  factory $CompanyCopyWith(Company value, $Res Function(Company) _then) = _$CompanyCopyWithImpl;
@useResult
$Res call({
 String ticker, LocalizedName name, String? sector, CompanyMarket? market, Map<String, dynamic>? profile,@JsonKey(name: 'price_history') List<PricePoint> priceHistory, CompanyFinancials financials, List<ResearchLink> research, CompanyDebt? debt
});


$LocalizedNameCopyWith<$Res> get name;$CompanyMarketCopyWith<$Res>? get market;$CompanyFinancialsCopyWith<$Res> get financials;$CompanyDebtCopyWith<$Res>? get debt;

}
/// @nodoc
class _$CompanyCopyWithImpl<$Res>
    implements $CompanyCopyWith<$Res> {
  _$CompanyCopyWithImpl(this._self, this._then);

  final Company _self;
  final $Res Function(Company) _then;

/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? name = null,Object? sector = freezed,Object? market = freezed,Object? profile = freezed,Object? priceHistory = null,Object? financials = null,Object? research = null,Object? debt = freezed,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as LocalizedName,sector: freezed == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String?,market: freezed == market ? _self.market : market // ignore: cast_nullable_to_non_nullable
as CompanyMarket?,profile: freezed == profile ? _self.profile : profile // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,priceHistory: null == priceHistory ? _self.priceHistory : priceHistory // ignore: cast_nullable_to_non_nullable
as List<PricePoint>,financials: null == financials ? _self.financials : financials // ignore: cast_nullable_to_non_nullable
as CompanyFinancials,research: null == research ? _self.research : research // ignore: cast_nullable_to_non_nullable
as List<ResearchLink>,debt: freezed == debt ? _self.debt : debt // ignore: cast_nullable_to_non_nullable
as CompanyDebt?,
  ));
}
/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LocalizedNameCopyWith<$Res> get name {
  
  return $LocalizedNameCopyWith<$Res>(_self.name, (value) {
    return _then(_self.copyWith(name: value));
  });
}/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CompanyMarketCopyWith<$Res>? get market {
    if (_self.market == null) {
    return null;
  }

  return $CompanyMarketCopyWith<$Res>(_self.market!, (value) {
    return _then(_self.copyWith(market: value));
  });
}/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CompanyFinancialsCopyWith<$Res> get financials {
  
  return $CompanyFinancialsCopyWith<$Res>(_self.financials, (value) {
    return _then(_self.copyWith(financials: value));
  });
}/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CompanyDebtCopyWith<$Res>? get debt {
    if (_self.debt == null) {
    return null;
  }

  return $CompanyDebtCopyWith<$Res>(_self.debt!, (value) {
    return _then(_self.copyWith(debt: value));
  });
}
}


/// Adds pattern-matching-related methods to [Company].
extension CompanyPatterns on Company {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Company value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Company() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Company value)  $default,){
final _that = this;
switch (_that) {
case _Company():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Company value)?  $default,){
final _that = this;
switch (_that) {
case _Company() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker,  LocalizedName name,  String? sector,  CompanyMarket? market,  Map<String, dynamic>? profile, @JsonKey(name: 'price_history')  List<PricePoint> priceHistory,  CompanyFinancials financials,  List<ResearchLink> research,  CompanyDebt? debt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Company() when $default != null:
return $default(_that.ticker,_that.name,_that.sector,_that.market,_that.profile,_that.priceHistory,_that.financials,_that.research,_that.debt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker,  LocalizedName name,  String? sector,  CompanyMarket? market,  Map<String, dynamic>? profile, @JsonKey(name: 'price_history')  List<PricePoint> priceHistory,  CompanyFinancials financials,  List<ResearchLink> research,  CompanyDebt? debt)  $default,) {final _that = this;
switch (_that) {
case _Company():
return $default(_that.ticker,_that.name,_that.sector,_that.market,_that.profile,_that.priceHistory,_that.financials,_that.research,_that.debt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker,  LocalizedName name,  String? sector,  CompanyMarket? market,  Map<String, dynamic>? profile, @JsonKey(name: 'price_history')  List<PricePoint> priceHistory,  CompanyFinancials financials,  List<ResearchLink> research,  CompanyDebt? debt)?  $default,) {final _that = this;
switch (_that) {
case _Company() when $default != null:
return $default(_that.ticker,_that.name,_that.sector,_that.market,_that.profile,_that.priceHistory,_that.financials,_that.research,_that.debt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Company extends Company {
  const _Company({required this.ticker, required this.name, this.sector, this.market, final  Map<String, dynamic>? profile, @JsonKey(name: 'price_history') final  List<PricePoint> priceHistory = const <PricePoint>[], this.financials = const CompanyFinancials(), final  List<ResearchLink> research = const <ResearchLink>[], this.debt}): _profile = profile,_priceHistory = priceHistory,_research = research,super._();
  factory _Company.fromJson(Map<String, dynamic> json) => _$CompanyFromJson(json);

@override final  String ticker;
@override final  LocalizedName name;
@override final  String? sector;
@override final  CompanyMarket? market;
/// Whatever the ingestion source knew about the company beyond price —
/// market cap, shares outstanding, free float. Deliberately loose: the
/// fields available differ by provider and a missing one must simply not
/// render (spec §49).
 final  Map<String, dynamic>? _profile;
/// Whatever the ingestion source knew about the company beyond price —
/// market cap, shares outstanding, free float. Deliberately loose: the
/// fields available differ by provider and a missing one must simply not
/// render (spec §49).
@override Map<String, dynamic>? get profile {
  final value = _profile;
  if (value == null) return null;
  if (_profile is EqualUnmodifiableMapView) return _profile;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(value);
}

 final  List<PricePoint> _priceHistory;
@override@JsonKey(name: 'price_history') List<PricePoint> get priceHistory {
  if (_priceHistory is EqualUnmodifiableListView) return _priceHistory;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_priceHistory);
}

@override@JsonKey() final  CompanyFinancials financials;
 final  List<ResearchLink> _research;
@override@JsonKey() List<ResearchLink> get research {
  if (_research is EqualUnmodifiableListView) return _research;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_research);
}

/// What the company is doing with its borrowings, when it has any it
/// filed. Absent for a company that reported none, which is an answer
/// rather than a gap.
@override final  CompanyDebt? debt;

/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CompanyCopyWith<_Company> get copyWith => __$CompanyCopyWithImpl<_Company>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CompanyToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Company&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.name, name) || other.name == name)&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.market, market) || other.market == market)&&const DeepCollectionEquality().equals(other._profile, _profile)&&const DeepCollectionEquality().equals(other._priceHistory, _priceHistory)&&(identical(other.financials, financials) || other.financials == financials)&&const DeepCollectionEquality().equals(other._research, _research)&&(identical(other.debt, debt) || other.debt == debt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,name,sector,market,const DeepCollectionEquality().hash(_profile),const DeepCollectionEquality().hash(_priceHistory),financials,const DeepCollectionEquality().hash(_research),debt);

@override
String toString() {
  return 'Company(ticker: $ticker, name: $name, sector: $sector, market: $market, profile: $profile, priceHistory: $priceHistory, financials: $financials, research: $research, debt: $debt)';
}


}

/// @nodoc
abstract mixin class _$CompanyCopyWith<$Res> implements $CompanyCopyWith<$Res> {
  factory _$CompanyCopyWith(_Company value, $Res Function(_Company) _then) = __$CompanyCopyWithImpl;
@override @useResult
$Res call({
 String ticker, LocalizedName name, String? sector, CompanyMarket? market, Map<String, dynamic>? profile,@JsonKey(name: 'price_history') List<PricePoint> priceHistory, CompanyFinancials financials, List<ResearchLink> research, CompanyDebt? debt
});


@override $LocalizedNameCopyWith<$Res> get name;@override $CompanyMarketCopyWith<$Res>? get market;@override $CompanyFinancialsCopyWith<$Res> get financials;@override $CompanyDebtCopyWith<$Res>? get debt;

}
/// @nodoc
class __$CompanyCopyWithImpl<$Res>
    implements _$CompanyCopyWith<$Res> {
  __$CompanyCopyWithImpl(this._self, this._then);

  final _Company _self;
  final $Res Function(_Company) _then;

/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? name = null,Object? sector = freezed,Object? market = freezed,Object? profile = freezed,Object? priceHistory = null,Object? financials = null,Object? research = null,Object? debt = freezed,}) {
  return _then(_Company(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as LocalizedName,sector: freezed == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String?,market: freezed == market ? _self.market : market // ignore: cast_nullable_to_non_nullable
as CompanyMarket?,profile: freezed == profile ? _self._profile : profile // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,priceHistory: null == priceHistory ? _self._priceHistory : priceHistory // ignore: cast_nullable_to_non_nullable
as List<PricePoint>,financials: null == financials ? _self.financials : financials // ignore: cast_nullable_to_non_nullable
as CompanyFinancials,research: null == research ? _self._research : research // ignore: cast_nullable_to_non_nullable
as List<ResearchLink>,debt: freezed == debt ? _self.debt : debt // ignore: cast_nullable_to_non_nullable
as CompanyDebt?,
  ));
}

/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LocalizedNameCopyWith<$Res> get name {
  
  return $LocalizedNameCopyWith<$Res>(_self.name, (value) {
    return _then(_self.copyWith(name: value));
  });
}/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CompanyMarketCopyWith<$Res>? get market {
    if (_self.market == null) {
    return null;
  }

  return $CompanyMarketCopyWith<$Res>(_self.market!, (value) {
    return _then(_self.copyWith(market: value));
  });
}/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CompanyFinancialsCopyWith<$Res> get financials {
  
  return $CompanyFinancialsCopyWith<$Res>(_self.financials, (value) {
    return _then(_self.copyWith(financials: value));
  });
}/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CompanyDebtCopyWith<$Res>? get debt {
    if (_self.debt == null) {
    return null;
  }

  return $CompanyDebtCopyWith<$Res>(_self.debt!, (value) {
    return _then(_self.copyWith(debt: value));
  });
}
}


/// @nodoc
mixin _$LocalizedName {

 String get en; String? get ar;
/// Create a copy of LocalizedName
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LocalizedNameCopyWith<LocalizedName> get copyWith => _$LocalizedNameCopyWithImpl<LocalizedName>(this as LocalizedName, _$identity);

  /// Serializes this LocalizedName to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LocalizedName&&(identical(other.en, en) || other.en == en)&&(identical(other.ar, ar) || other.ar == ar));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,en,ar);

@override
String toString() {
  return 'LocalizedName(en: $en, ar: $ar)';
}


}

/// @nodoc
abstract mixin class $LocalizedNameCopyWith<$Res>  {
  factory $LocalizedNameCopyWith(LocalizedName value, $Res Function(LocalizedName) _then) = _$LocalizedNameCopyWithImpl;
@useResult
$Res call({
 String en, String? ar
});




}
/// @nodoc
class _$LocalizedNameCopyWithImpl<$Res>
    implements $LocalizedNameCopyWith<$Res> {
  _$LocalizedNameCopyWithImpl(this._self, this._then);

  final LocalizedName _self;
  final $Res Function(LocalizedName) _then;

/// Create a copy of LocalizedName
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? en = null,Object? ar = freezed,}) {
  return _then(_self.copyWith(
en: null == en ? _self.en : en // ignore: cast_nullable_to_non_nullable
as String,ar: freezed == ar ? _self.ar : ar // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [LocalizedName].
extension LocalizedNamePatterns on LocalizedName {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LocalizedName value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LocalizedName() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LocalizedName value)  $default,){
final _that = this;
switch (_that) {
case _LocalizedName():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LocalizedName value)?  $default,){
final _that = this;
switch (_that) {
case _LocalizedName() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String en,  String? ar)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LocalizedName() when $default != null:
return $default(_that.en,_that.ar);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String en,  String? ar)  $default,) {final _that = this;
switch (_that) {
case _LocalizedName():
return $default(_that.en,_that.ar);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String en,  String? ar)?  $default,) {final _that = this;
switch (_that) {
case _LocalizedName() when $default != null:
return $default(_that.en,_that.ar);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LocalizedName extends LocalizedName {
  const _LocalizedName({required this.en, this.ar}): super._();
  factory _LocalizedName.fromJson(Map<String, dynamic> json) => _$LocalizedNameFromJson(json);

@override final  String en;
@override final  String? ar;

/// Create a copy of LocalizedName
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LocalizedNameCopyWith<_LocalizedName> get copyWith => __$LocalizedNameCopyWithImpl<_LocalizedName>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LocalizedNameToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LocalizedName&&(identical(other.en, en) || other.en == en)&&(identical(other.ar, ar) || other.ar == ar));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,en,ar);

@override
String toString() {
  return 'LocalizedName(en: $en, ar: $ar)';
}


}

/// @nodoc
abstract mixin class _$LocalizedNameCopyWith<$Res> implements $LocalizedNameCopyWith<$Res> {
  factory _$LocalizedNameCopyWith(_LocalizedName value, $Res Function(_LocalizedName) _then) = __$LocalizedNameCopyWithImpl;
@override @useResult
$Res call({
 String en, String? ar
});




}
/// @nodoc
class __$LocalizedNameCopyWithImpl<$Res>
    implements _$LocalizedNameCopyWith<$Res> {
  __$LocalizedNameCopyWithImpl(this._self, this._then);

  final _LocalizedName _self;
  final $Res Function(_LocalizedName) _then;

/// Create a copy of LocalizedName
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? en = null,Object? ar = freezed,}) {
  return _then(_LocalizedName(
en: null == en ? _self.en : en // ignore: cast_nullable_to_non_nullable
as String,ar: freezed == ar ? _self.ar : ar // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$CompanyMarket {

@JsonKey(name: 'last_close') double? get lastClose; String? get date; double? get open; double? get high; double? get low; num? get volume;
/// Create a copy of CompanyMarket
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CompanyMarketCopyWith<CompanyMarket> get copyWith => _$CompanyMarketCopyWithImpl<CompanyMarket>(this as CompanyMarket, _$identity);

  /// Serializes this CompanyMarket to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CompanyMarket&&(identical(other.lastClose, lastClose) || other.lastClose == lastClose)&&(identical(other.date, date) || other.date == date)&&(identical(other.open, open) || other.open == open)&&(identical(other.high, high) || other.high == high)&&(identical(other.low, low) || other.low == low)&&(identical(other.volume, volume) || other.volume == volume));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,lastClose,date,open,high,low,volume);

@override
String toString() {
  return 'CompanyMarket(lastClose: $lastClose, date: $date, open: $open, high: $high, low: $low, volume: $volume)';
}


}

/// @nodoc
abstract mixin class $CompanyMarketCopyWith<$Res>  {
  factory $CompanyMarketCopyWith(CompanyMarket value, $Res Function(CompanyMarket) _then) = _$CompanyMarketCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'last_close') double? lastClose, String? date, double? open, double? high, double? low, num? volume
});




}
/// @nodoc
class _$CompanyMarketCopyWithImpl<$Res>
    implements $CompanyMarketCopyWith<$Res> {
  _$CompanyMarketCopyWithImpl(this._self, this._then);

  final CompanyMarket _self;
  final $Res Function(CompanyMarket) _then;

/// Create a copy of CompanyMarket
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? lastClose = freezed,Object? date = freezed,Object? open = freezed,Object? high = freezed,Object? low = freezed,Object? volume = freezed,}) {
  return _then(_self.copyWith(
lastClose: freezed == lastClose ? _self.lastClose : lastClose // ignore: cast_nullable_to_non_nullable
as double?,date: freezed == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String?,open: freezed == open ? _self.open : open // ignore: cast_nullable_to_non_nullable
as double?,high: freezed == high ? _self.high : high // ignore: cast_nullable_to_non_nullable
as double?,low: freezed == low ? _self.low : low // ignore: cast_nullable_to_non_nullable
as double?,volume: freezed == volume ? _self.volume : volume // ignore: cast_nullable_to_non_nullable
as num?,
  ));
}

}


/// Adds pattern-matching-related methods to [CompanyMarket].
extension CompanyMarketPatterns on CompanyMarket {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CompanyMarket value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CompanyMarket() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CompanyMarket value)  $default,){
final _that = this;
switch (_that) {
case _CompanyMarket():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CompanyMarket value)?  $default,){
final _that = this;
switch (_that) {
case _CompanyMarket() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'last_close')  double? lastClose,  String? date,  double? open,  double? high,  double? low,  num? volume)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CompanyMarket() when $default != null:
return $default(_that.lastClose,_that.date,_that.open,_that.high,_that.low,_that.volume);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'last_close')  double? lastClose,  String? date,  double? open,  double? high,  double? low,  num? volume)  $default,) {final _that = this;
switch (_that) {
case _CompanyMarket():
return $default(_that.lastClose,_that.date,_that.open,_that.high,_that.low,_that.volume);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'last_close')  double? lastClose,  String? date,  double? open,  double? high,  double? low,  num? volume)?  $default,) {final _that = this;
switch (_that) {
case _CompanyMarket() when $default != null:
return $default(_that.lastClose,_that.date,_that.open,_that.high,_that.low,_that.volume);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CompanyMarket extends CompanyMarket {
  const _CompanyMarket({@JsonKey(name: 'last_close') this.lastClose, this.date, this.open, this.high, this.low, this.volume}): super._();
  factory _CompanyMarket.fromJson(Map<String, dynamic> json) => _$CompanyMarketFromJson(json);

@override@JsonKey(name: 'last_close') final  double? lastClose;
@override final  String? date;
@override final  double? open;
@override final  double? high;
@override final  double? low;
@override final  num? volume;

/// Create a copy of CompanyMarket
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CompanyMarketCopyWith<_CompanyMarket> get copyWith => __$CompanyMarketCopyWithImpl<_CompanyMarket>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CompanyMarketToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CompanyMarket&&(identical(other.lastClose, lastClose) || other.lastClose == lastClose)&&(identical(other.date, date) || other.date == date)&&(identical(other.open, open) || other.open == open)&&(identical(other.high, high) || other.high == high)&&(identical(other.low, low) || other.low == low)&&(identical(other.volume, volume) || other.volume == volume));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,lastClose,date,open,high,low,volume);

@override
String toString() {
  return 'CompanyMarket(lastClose: $lastClose, date: $date, open: $open, high: $high, low: $low, volume: $volume)';
}


}

/// @nodoc
abstract mixin class _$CompanyMarketCopyWith<$Res> implements $CompanyMarketCopyWith<$Res> {
  factory _$CompanyMarketCopyWith(_CompanyMarket value, $Res Function(_CompanyMarket) _then) = __$CompanyMarketCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'last_close') double? lastClose, String? date, double? open, double? high, double? low, num? volume
});




}
/// @nodoc
class __$CompanyMarketCopyWithImpl<$Res>
    implements _$CompanyMarketCopyWith<$Res> {
  __$CompanyMarketCopyWithImpl(this._self, this._then);

  final _CompanyMarket _self;
  final $Res Function(_CompanyMarket) _then;

/// Create a copy of CompanyMarket
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? lastClose = freezed,Object? date = freezed,Object? open = freezed,Object? high = freezed,Object? low = freezed,Object? volume = freezed,}) {
  return _then(_CompanyMarket(
lastClose: freezed == lastClose ? _self.lastClose : lastClose // ignore: cast_nullable_to_non_nullable
as double?,date: freezed == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String?,open: freezed == open ? _self.open : open // ignore: cast_nullable_to_non_nullable
as double?,high: freezed == high ? _self.high : high // ignore: cast_nullable_to_non_nullable
as double?,low: freezed == low ? _self.low : low // ignore: cast_nullable_to_non_nullable
as double?,volume: freezed == volume ? _self.volume : volume // ignore: cast_nullable_to_non_nullable
as num?,
  ));
}


}


/// @nodoc
mixin _$PricePoint {

 String get date; double get close; double? get open; double? get high; double? get low; int? get volume;
/// Create a copy of PricePoint
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PricePointCopyWith<PricePoint> get copyWith => _$PricePointCopyWithImpl<PricePoint>(this as PricePoint, _$identity);

  /// Serializes this PricePoint to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PricePoint&&(identical(other.date, date) || other.date == date)&&(identical(other.close, close) || other.close == close)&&(identical(other.open, open) || other.open == open)&&(identical(other.high, high) || other.high == high)&&(identical(other.low, low) || other.low == low)&&(identical(other.volume, volume) || other.volume == volume));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,close,open,high,low,volume);

@override
String toString() {
  return 'PricePoint(date: $date, close: $close, open: $open, high: $high, low: $low, volume: $volume)';
}


}

/// @nodoc
abstract mixin class $PricePointCopyWith<$Res>  {
  factory $PricePointCopyWith(PricePoint value, $Res Function(PricePoint) _then) = _$PricePointCopyWithImpl;
@useResult
$Res call({
 String date, double close, double? open, double? high, double? low, int? volume
});




}
/// @nodoc
class _$PricePointCopyWithImpl<$Res>
    implements $PricePointCopyWith<$Res> {
  _$PricePointCopyWithImpl(this._self, this._then);

  final PricePoint _self;
  final $Res Function(PricePoint) _then;

/// Create a copy of PricePoint
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? close = null,Object? open = freezed,Object? high = freezed,Object? low = freezed,Object? volume = freezed,}) {
  return _then(_self.copyWith(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,close: null == close ? _self.close : close // ignore: cast_nullable_to_non_nullable
as double,open: freezed == open ? _self.open : open // ignore: cast_nullable_to_non_nullable
as double?,high: freezed == high ? _self.high : high // ignore: cast_nullable_to_non_nullable
as double?,low: freezed == low ? _self.low : low // ignore: cast_nullable_to_non_nullable
as double?,volume: freezed == volume ? _self.volume : volume // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [PricePoint].
extension PricePointPatterns on PricePoint {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PricePoint value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PricePoint() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PricePoint value)  $default,){
final _that = this;
switch (_that) {
case _PricePoint():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PricePoint value)?  $default,){
final _that = this;
switch (_that) {
case _PricePoint() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  double close,  double? open,  double? high,  double? low,  int? volume)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PricePoint() when $default != null:
return $default(_that.date,_that.close,_that.open,_that.high,_that.low,_that.volume);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  double close,  double? open,  double? high,  double? low,  int? volume)  $default,) {final _that = this;
switch (_that) {
case _PricePoint():
return $default(_that.date,_that.close,_that.open,_that.high,_that.low,_that.volume);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  double close,  double? open,  double? high,  double? low,  int? volume)?  $default,) {final _that = this;
switch (_that) {
case _PricePoint() when $default != null:
return $default(_that.date,_that.close,_that.open,_that.high,_that.low,_that.volume);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PricePoint extends PricePoint {
  const _PricePoint({required this.date, required this.close, this.open, this.high, this.low, this.volume}): super._();
  factory _PricePoint.fromJson(Map<String, dynamic> json) => _$PricePointFromJson(json);

@override final  String date;
@override final  double close;
@override final  double? open;
@override final  double? high;
@override final  double? low;
@override final  int? volume;

/// Create a copy of PricePoint
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PricePointCopyWith<_PricePoint> get copyWith => __$PricePointCopyWithImpl<_PricePoint>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PricePointToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PricePoint&&(identical(other.date, date) || other.date == date)&&(identical(other.close, close) || other.close == close)&&(identical(other.open, open) || other.open == open)&&(identical(other.high, high) || other.high == high)&&(identical(other.low, low) || other.low == low)&&(identical(other.volume, volume) || other.volume == volume));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,close,open,high,low,volume);

@override
String toString() {
  return 'PricePoint(date: $date, close: $close, open: $open, high: $high, low: $low, volume: $volume)';
}


}

/// @nodoc
abstract mixin class _$PricePointCopyWith<$Res> implements $PricePointCopyWith<$Res> {
  factory _$PricePointCopyWith(_PricePoint value, $Res Function(_PricePoint) _then) = __$PricePointCopyWithImpl;
@override @useResult
$Res call({
 String date, double close, double? open, double? high, double? low, int? volume
});




}
/// @nodoc
class __$PricePointCopyWithImpl<$Res>
    implements _$PricePointCopyWith<$Res> {
  __$PricePointCopyWithImpl(this._self, this._then);

  final _PricePoint _self;
  final $Res Function(_PricePoint) _then;

/// Create a copy of PricePoint
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? close = null,Object? open = freezed,Object? high = freezed,Object? low = freezed,Object? volume = freezed,}) {
  return _then(_PricePoint(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,close: null == close ? _self.close : close // ignore: cast_nullable_to_non_nullable
as double,open: freezed == open ? _self.open : open // ignore: cast_nullable_to_non_nullable
as double?,high: freezed == high ? _self.high : high // ignore: cast_nullable_to_non_nullable
as double?,low: freezed == low ? _self.low : low // ignore: cast_nullable_to_non_nullable
as double?,volume: freezed == volume ? _self.volume : volume // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}


/// @nodoc
mixin _$CompanyFinancials {

 List<FinancialPeriod> get annual; List<FinancialPeriod> get quarterly;
/// Create a copy of CompanyFinancials
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CompanyFinancialsCopyWith<CompanyFinancials> get copyWith => _$CompanyFinancialsCopyWithImpl<CompanyFinancials>(this as CompanyFinancials, _$identity);

  /// Serializes this CompanyFinancials to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CompanyFinancials&&const DeepCollectionEquality().equals(other.annual, annual)&&const DeepCollectionEquality().equals(other.quarterly, quarterly));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(annual),const DeepCollectionEquality().hash(quarterly));

@override
String toString() {
  return 'CompanyFinancials(annual: $annual, quarterly: $quarterly)';
}


}

/// @nodoc
abstract mixin class $CompanyFinancialsCopyWith<$Res>  {
  factory $CompanyFinancialsCopyWith(CompanyFinancials value, $Res Function(CompanyFinancials) _then) = _$CompanyFinancialsCopyWithImpl;
@useResult
$Res call({
 List<FinancialPeriod> annual, List<FinancialPeriod> quarterly
});




}
/// @nodoc
class _$CompanyFinancialsCopyWithImpl<$Res>
    implements $CompanyFinancialsCopyWith<$Res> {
  _$CompanyFinancialsCopyWithImpl(this._self, this._then);

  final CompanyFinancials _self;
  final $Res Function(CompanyFinancials) _then;

/// Create a copy of CompanyFinancials
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? annual = null,Object? quarterly = null,}) {
  return _then(_self.copyWith(
annual: null == annual ? _self.annual : annual // ignore: cast_nullable_to_non_nullable
as List<FinancialPeriod>,quarterly: null == quarterly ? _self.quarterly : quarterly // ignore: cast_nullable_to_non_nullable
as List<FinancialPeriod>,
  ));
}

}


/// Adds pattern-matching-related methods to [CompanyFinancials].
extension CompanyFinancialsPatterns on CompanyFinancials {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CompanyFinancials value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CompanyFinancials() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CompanyFinancials value)  $default,){
final _that = this;
switch (_that) {
case _CompanyFinancials():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CompanyFinancials value)?  $default,){
final _that = this;
switch (_that) {
case _CompanyFinancials() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<FinancialPeriod> annual,  List<FinancialPeriod> quarterly)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CompanyFinancials() when $default != null:
return $default(_that.annual,_that.quarterly);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<FinancialPeriod> annual,  List<FinancialPeriod> quarterly)  $default,) {final _that = this;
switch (_that) {
case _CompanyFinancials():
return $default(_that.annual,_that.quarterly);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<FinancialPeriod> annual,  List<FinancialPeriod> quarterly)?  $default,) {final _that = this;
switch (_that) {
case _CompanyFinancials() when $default != null:
return $default(_that.annual,_that.quarterly);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CompanyFinancials extends CompanyFinancials {
  const _CompanyFinancials({final  List<FinancialPeriod> annual = const <FinancialPeriod>[], final  List<FinancialPeriod> quarterly = const <FinancialPeriod>[]}): _annual = annual,_quarterly = quarterly,super._();
  factory _CompanyFinancials.fromJson(Map<String, dynamic> json) => _$CompanyFinancialsFromJson(json);

 final  List<FinancialPeriod> _annual;
@override@JsonKey() List<FinancialPeriod> get annual {
  if (_annual is EqualUnmodifiableListView) return _annual;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_annual);
}

 final  List<FinancialPeriod> _quarterly;
@override@JsonKey() List<FinancialPeriod> get quarterly {
  if (_quarterly is EqualUnmodifiableListView) return _quarterly;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_quarterly);
}


/// Create a copy of CompanyFinancials
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CompanyFinancialsCopyWith<_CompanyFinancials> get copyWith => __$CompanyFinancialsCopyWithImpl<_CompanyFinancials>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CompanyFinancialsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CompanyFinancials&&const DeepCollectionEquality().equals(other._annual, _annual)&&const DeepCollectionEquality().equals(other._quarterly, _quarterly));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_annual),const DeepCollectionEquality().hash(_quarterly));

@override
String toString() {
  return 'CompanyFinancials(annual: $annual, quarterly: $quarterly)';
}


}

/// @nodoc
abstract mixin class _$CompanyFinancialsCopyWith<$Res> implements $CompanyFinancialsCopyWith<$Res> {
  factory _$CompanyFinancialsCopyWith(_CompanyFinancials value, $Res Function(_CompanyFinancials) _then) = __$CompanyFinancialsCopyWithImpl;
@override @useResult
$Res call({
 List<FinancialPeriod> annual, List<FinancialPeriod> quarterly
});




}
/// @nodoc
class __$CompanyFinancialsCopyWithImpl<$Res>
    implements _$CompanyFinancialsCopyWith<$Res> {
  __$CompanyFinancialsCopyWithImpl(this._self, this._then);

  final _CompanyFinancials _self;
  final $Res Function(_CompanyFinancials) _then;

/// Create a copy of CompanyFinancials
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? annual = null,Object? quarterly = null,}) {
  return _then(_CompanyFinancials(
annual: null == annual ? _self._annual : annual // ignore: cast_nullable_to_non_nullable
as List<FinancialPeriod>,quarterly: null == quarterly ? _self._quarterly : quarterly // ignore: cast_nullable_to_non_nullable
as List<FinancialPeriod>,
  ));
}


}


/// @nodoc
mixin _$FinancialPeriod {

/// Display label, e.g. "FY25" or "Q2 FY25".
 String get period; double? get revenue;@JsonKey(name: 'gross_profit') double? get grossProfit;@JsonKey(name: 'operating_income') double? get operatingIncome;@JsonKey(name: 'net_income') double? get netIncome; double? get assets; double? get liabilities; double? get equity; double? get cash; double? get debt;/// Borrowings by when they fall due, and what carrying them cost.
///
/// `debt` is the total, and on its own it does not answer the question a
/// reader actually has. Money owed inside a year has to be found or rolled
/// inside a year; money owed beyond one does not. `financeCost` is the
/// period's own charge, which is what turns a balance into a burden — or
/// shows that it isn't one.
///
/// All three are read from the issuer's filed statement, where the
/// borrowing lines are listed separately and summed; none is derived from
/// the liabilities total, which is a different and much larger thing.
@JsonKey(name: 'short_term_debt') double? get shortTermDebt;@JsonKey(name: 'long_term_debt') double? get longTermDebt;@JsonKey(name: 'finance_cost') double? get financeCost;@JsonKey(name: 'operating_cash_flow') double? get operatingCashFlow;/// The rest of the cash flow statement, and what was paid out of it.
///
/// Published by the same source as the line above and read from the same
/// filing; five of Mubasher's ten financial rows were being collected and
/// these are four of the five that were not. Together with operating cash
/// flow they are the whole statement, which is why the collector can check
/// that the three add to the change in cash instead of taking it on trust.
@JsonKey(name: 'investing_cash_flow') double? get investingCashFlow;@JsonKey(name: 'financing_cash_flow') double? get financingCashFlow;@JsonKey(name: 'net_change_in_cash') double? get netChangeInCash;@JsonKey(name: 'dividends_paid') double? get dividendsPaid; double? get capex;@JsonKey(name: 'free_cash_flow') double? get freeCashFlow;/// `consolidated` or `standalone`. Companies file both for the same
/// period and the two differ, so a figure shown without its basis is
/// ambiguous rather than merely unlabelled.
 String? get basis;/// The filing this figure was read from (spec §50). A reported number the
/// reader cannot trace back is not worth much more than one we invented —
/// which is exactly what was here before.
 String? get source;/// Where the NET PROFIT came from, when that is not where the rest came
/// from.
///
/// 575 periods carry a balance sheet Mubasher published and a profit the
/// exchange filed, because the exchange's own submission wins that line.
/// The footnote named one source for the whole block and so named Mubasher
/// over a figure Mubasher never reported. A row with two sources has to
/// say two.
@JsonKey(name: 'net_income_source') String? get netIncomeSource;@JsonKey(name: 'filed_on') String? get filedOn;
/// Create a copy of FinancialPeriod
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FinancialPeriodCopyWith<FinancialPeriod> get copyWith => _$FinancialPeriodCopyWithImpl<FinancialPeriod>(this as FinancialPeriod, _$identity);

  /// Serializes this FinancialPeriod to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FinancialPeriod&&(identical(other.period, period) || other.period == period)&&(identical(other.revenue, revenue) || other.revenue == revenue)&&(identical(other.grossProfit, grossProfit) || other.grossProfit == grossProfit)&&(identical(other.operatingIncome, operatingIncome) || other.operatingIncome == operatingIncome)&&(identical(other.netIncome, netIncome) || other.netIncome == netIncome)&&(identical(other.assets, assets) || other.assets == assets)&&(identical(other.liabilities, liabilities) || other.liabilities == liabilities)&&(identical(other.equity, equity) || other.equity == equity)&&(identical(other.cash, cash) || other.cash == cash)&&(identical(other.debt, debt) || other.debt == debt)&&(identical(other.shortTermDebt, shortTermDebt) || other.shortTermDebt == shortTermDebt)&&(identical(other.longTermDebt, longTermDebt) || other.longTermDebt == longTermDebt)&&(identical(other.financeCost, financeCost) || other.financeCost == financeCost)&&(identical(other.operatingCashFlow, operatingCashFlow) || other.operatingCashFlow == operatingCashFlow)&&(identical(other.investingCashFlow, investingCashFlow) || other.investingCashFlow == investingCashFlow)&&(identical(other.financingCashFlow, financingCashFlow) || other.financingCashFlow == financingCashFlow)&&(identical(other.netChangeInCash, netChangeInCash) || other.netChangeInCash == netChangeInCash)&&(identical(other.dividendsPaid, dividendsPaid) || other.dividendsPaid == dividendsPaid)&&(identical(other.capex, capex) || other.capex == capex)&&(identical(other.freeCashFlow, freeCashFlow) || other.freeCashFlow == freeCashFlow)&&(identical(other.basis, basis) || other.basis == basis)&&(identical(other.source, source) || other.source == source)&&(identical(other.netIncomeSource, netIncomeSource) || other.netIncomeSource == netIncomeSource)&&(identical(other.filedOn, filedOn) || other.filedOn == filedOn));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,period,revenue,grossProfit,operatingIncome,netIncome,assets,liabilities,equity,cash,debt,shortTermDebt,longTermDebt,financeCost,operatingCashFlow,investingCashFlow,financingCashFlow,netChangeInCash,dividendsPaid,capex,freeCashFlow,basis,source,netIncomeSource,filedOn]);

@override
String toString() {
  return 'FinancialPeriod(period: $period, revenue: $revenue, grossProfit: $grossProfit, operatingIncome: $operatingIncome, netIncome: $netIncome, assets: $assets, liabilities: $liabilities, equity: $equity, cash: $cash, debt: $debt, shortTermDebt: $shortTermDebt, longTermDebt: $longTermDebt, financeCost: $financeCost, operatingCashFlow: $operatingCashFlow, investingCashFlow: $investingCashFlow, financingCashFlow: $financingCashFlow, netChangeInCash: $netChangeInCash, dividendsPaid: $dividendsPaid, capex: $capex, freeCashFlow: $freeCashFlow, basis: $basis, source: $source, netIncomeSource: $netIncomeSource, filedOn: $filedOn)';
}


}

/// @nodoc
abstract mixin class $FinancialPeriodCopyWith<$Res>  {
  factory $FinancialPeriodCopyWith(FinancialPeriod value, $Res Function(FinancialPeriod) _then) = _$FinancialPeriodCopyWithImpl;
@useResult
$Res call({
 String period, double? revenue,@JsonKey(name: 'gross_profit') double? grossProfit,@JsonKey(name: 'operating_income') double? operatingIncome,@JsonKey(name: 'net_income') double? netIncome, double? assets, double? liabilities, double? equity, double? cash, double? debt,@JsonKey(name: 'short_term_debt') double? shortTermDebt,@JsonKey(name: 'long_term_debt') double? longTermDebt,@JsonKey(name: 'finance_cost') double? financeCost,@JsonKey(name: 'operating_cash_flow') double? operatingCashFlow,@JsonKey(name: 'investing_cash_flow') double? investingCashFlow,@JsonKey(name: 'financing_cash_flow') double? financingCashFlow,@JsonKey(name: 'net_change_in_cash') double? netChangeInCash,@JsonKey(name: 'dividends_paid') double? dividendsPaid, double? capex,@JsonKey(name: 'free_cash_flow') double? freeCashFlow, String? basis, String? source,@JsonKey(name: 'net_income_source') String? netIncomeSource,@JsonKey(name: 'filed_on') String? filedOn
});




}
/// @nodoc
class _$FinancialPeriodCopyWithImpl<$Res>
    implements $FinancialPeriodCopyWith<$Res> {
  _$FinancialPeriodCopyWithImpl(this._self, this._then);

  final FinancialPeriod _self;
  final $Res Function(FinancialPeriod) _then;

/// Create a copy of FinancialPeriod
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? period = null,Object? revenue = freezed,Object? grossProfit = freezed,Object? operatingIncome = freezed,Object? netIncome = freezed,Object? assets = freezed,Object? liabilities = freezed,Object? equity = freezed,Object? cash = freezed,Object? debt = freezed,Object? shortTermDebt = freezed,Object? longTermDebt = freezed,Object? financeCost = freezed,Object? operatingCashFlow = freezed,Object? investingCashFlow = freezed,Object? financingCashFlow = freezed,Object? netChangeInCash = freezed,Object? dividendsPaid = freezed,Object? capex = freezed,Object? freeCashFlow = freezed,Object? basis = freezed,Object? source = freezed,Object? netIncomeSource = freezed,Object? filedOn = freezed,}) {
  return _then(_self.copyWith(
period: null == period ? _self.period : period // ignore: cast_nullable_to_non_nullable
as String,revenue: freezed == revenue ? _self.revenue : revenue // ignore: cast_nullable_to_non_nullable
as double?,grossProfit: freezed == grossProfit ? _self.grossProfit : grossProfit // ignore: cast_nullable_to_non_nullable
as double?,operatingIncome: freezed == operatingIncome ? _self.operatingIncome : operatingIncome // ignore: cast_nullable_to_non_nullable
as double?,netIncome: freezed == netIncome ? _self.netIncome : netIncome // ignore: cast_nullable_to_non_nullable
as double?,assets: freezed == assets ? _self.assets : assets // ignore: cast_nullable_to_non_nullable
as double?,liabilities: freezed == liabilities ? _self.liabilities : liabilities // ignore: cast_nullable_to_non_nullable
as double?,equity: freezed == equity ? _self.equity : equity // ignore: cast_nullable_to_non_nullable
as double?,cash: freezed == cash ? _self.cash : cash // ignore: cast_nullable_to_non_nullable
as double?,debt: freezed == debt ? _self.debt : debt // ignore: cast_nullable_to_non_nullable
as double?,shortTermDebt: freezed == shortTermDebt ? _self.shortTermDebt : shortTermDebt // ignore: cast_nullable_to_non_nullable
as double?,longTermDebt: freezed == longTermDebt ? _self.longTermDebt : longTermDebt // ignore: cast_nullable_to_non_nullable
as double?,financeCost: freezed == financeCost ? _self.financeCost : financeCost // ignore: cast_nullable_to_non_nullable
as double?,operatingCashFlow: freezed == operatingCashFlow ? _self.operatingCashFlow : operatingCashFlow // ignore: cast_nullable_to_non_nullable
as double?,investingCashFlow: freezed == investingCashFlow ? _self.investingCashFlow : investingCashFlow // ignore: cast_nullable_to_non_nullable
as double?,financingCashFlow: freezed == financingCashFlow ? _self.financingCashFlow : financingCashFlow // ignore: cast_nullable_to_non_nullable
as double?,netChangeInCash: freezed == netChangeInCash ? _self.netChangeInCash : netChangeInCash // ignore: cast_nullable_to_non_nullable
as double?,dividendsPaid: freezed == dividendsPaid ? _self.dividendsPaid : dividendsPaid // ignore: cast_nullable_to_non_nullable
as double?,capex: freezed == capex ? _self.capex : capex // ignore: cast_nullable_to_non_nullable
as double?,freeCashFlow: freezed == freeCashFlow ? _self.freeCashFlow : freeCashFlow // ignore: cast_nullable_to_non_nullable
as double?,basis: freezed == basis ? _self.basis : basis // ignore: cast_nullable_to_non_nullable
as String?,source: freezed == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String?,netIncomeSource: freezed == netIncomeSource ? _self.netIncomeSource : netIncomeSource // ignore: cast_nullable_to_non_nullable
as String?,filedOn: freezed == filedOn ? _self.filedOn : filedOn // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [FinancialPeriod].
extension FinancialPeriodPatterns on FinancialPeriod {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FinancialPeriod value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FinancialPeriod() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FinancialPeriod value)  $default,){
final _that = this;
switch (_that) {
case _FinancialPeriod():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FinancialPeriod value)?  $default,){
final _that = this;
switch (_that) {
case _FinancialPeriod() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String period,  double? revenue, @JsonKey(name: 'gross_profit')  double? grossProfit, @JsonKey(name: 'operating_income')  double? operatingIncome, @JsonKey(name: 'net_income')  double? netIncome,  double? assets,  double? liabilities,  double? equity,  double? cash,  double? debt, @JsonKey(name: 'short_term_debt')  double? shortTermDebt, @JsonKey(name: 'long_term_debt')  double? longTermDebt, @JsonKey(name: 'finance_cost')  double? financeCost, @JsonKey(name: 'operating_cash_flow')  double? operatingCashFlow, @JsonKey(name: 'investing_cash_flow')  double? investingCashFlow, @JsonKey(name: 'financing_cash_flow')  double? financingCashFlow, @JsonKey(name: 'net_change_in_cash')  double? netChangeInCash, @JsonKey(name: 'dividends_paid')  double? dividendsPaid,  double? capex, @JsonKey(name: 'free_cash_flow')  double? freeCashFlow,  String? basis,  String? source, @JsonKey(name: 'net_income_source')  String? netIncomeSource, @JsonKey(name: 'filed_on')  String? filedOn)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FinancialPeriod() when $default != null:
return $default(_that.period,_that.revenue,_that.grossProfit,_that.operatingIncome,_that.netIncome,_that.assets,_that.liabilities,_that.equity,_that.cash,_that.debt,_that.shortTermDebt,_that.longTermDebt,_that.financeCost,_that.operatingCashFlow,_that.investingCashFlow,_that.financingCashFlow,_that.netChangeInCash,_that.dividendsPaid,_that.capex,_that.freeCashFlow,_that.basis,_that.source,_that.netIncomeSource,_that.filedOn);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String period,  double? revenue, @JsonKey(name: 'gross_profit')  double? grossProfit, @JsonKey(name: 'operating_income')  double? operatingIncome, @JsonKey(name: 'net_income')  double? netIncome,  double? assets,  double? liabilities,  double? equity,  double? cash,  double? debt, @JsonKey(name: 'short_term_debt')  double? shortTermDebt, @JsonKey(name: 'long_term_debt')  double? longTermDebt, @JsonKey(name: 'finance_cost')  double? financeCost, @JsonKey(name: 'operating_cash_flow')  double? operatingCashFlow, @JsonKey(name: 'investing_cash_flow')  double? investingCashFlow, @JsonKey(name: 'financing_cash_flow')  double? financingCashFlow, @JsonKey(name: 'net_change_in_cash')  double? netChangeInCash, @JsonKey(name: 'dividends_paid')  double? dividendsPaid,  double? capex, @JsonKey(name: 'free_cash_flow')  double? freeCashFlow,  String? basis,  String? source, @JsonKey(name: 'net_income_source')  String? netIncomeSource, @JsonKey(name: 'filed_on')  String? filedOn)  $default,) {final _that = this;
switch (_that) {
case _FinancialPeriod():
return $default(_that.period,_that.revenue,_that.grossProfit,_that.operatingIncome,_that.netIncome,_that.assets,_that.liabilities,_that.equity,_that.cash,_that.debt,_that.shortTermDebt,_that.longTermDebt,_that.financeCost,_that.operatingCashFlow,_that.investingCashFlow,_that.financingCashFlow,_that.netChangeInCash,_that.dividendsPaid,_that.capex,_that.freeCashFlow,_that.basis,_that.source,_that.netIncomeSource,_that.filedOn);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String period,  double? revenue, @JsonKey(name: 'gross_profit')  double? grossProfit, @JsonKey(name: 'operating_income')  double? operatingIncome, @JsonKey(name: 'net_income')  double? netIncome,  double? assets,  double? liabilities,  double? equity,  double? cash,  double? debt, @JsonKey(name: 'short_term_debt')  double? shortTermDebt, @JsonKey(name: 'long_term_debt')  double? longTermDebt, @JsonKey(name: 'finance_cost')  double? financeCost, @JsonKey(name: 'operating_cash_flow')  double? operatingCashFlow, @JsonKey(name: 'investing_cash_flow')  double? investingCashFlow, @JsonKey(name: 'financing_cash_flow')  double? financingCashFlow, @JsonKey(name: 'net_change_in_cash')  double? netChangeInCash, @JsonKey(name: 'dividends_paid')  double? dividendsPaid,  double? capex, @JsonKey(name: 'free_cash_flow')  double? freeCashFlow,  String? basis,  String? source, @JsonKey(name: 'net_income_source')  String? netIncomeSource, @JsonKey(name: 'filed_on')  String? filedOn)?  $default,) {final _that = this;
switch (_that) {
case _FinancialPeriod() when $default != null:
return $default(_that.period,_that.revenue,_that.grossProfit,_that.operatingIncome,_that.netIncome,_that.assets,_that.liabilities,_that.equity,_that.cash,_that.debt,_that.shortTermDebt,_that.longTermDebt,_that.financeCost,_that.operatingCashFlow,_that.investingCashFlow,_that.financingCashFlow,_that.netChangeInCash,_that.dividendsPaid,_that.capex,_that.freeCashFlow,_that.basis,_that.source,_that.netIncomeSource,_that.filedOn);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FinancialPeriod extends FinancialPeriod {
  const _FinancialPeriod({required this.period, this.revenue, @JsonKey(name: 'gross_profit') this.grossProfit, @JsonKey(name: 'operating_income') this.operatingIncome, @JsonKey(name: 'net_income') this.netIncome, this.assets, this.liabilities, this.equity, this.cash, this.debt, @JsonKey(name: 'short_term_debt') this.shortTermDebt, @JsonKey(name: 'long_term_debt') this.longTermDebt, @JsonKey(name: 'finance_cost') this.financeCost, @JsonKey(name: 'operating_cash_flow') this.operatingCashFlow, @JsonKey(name: 'investing_cash_flow') this.investingCashFlow, @JsonKey(name: 'financing_cash_flow') this.financingCashFlow, @JsonKey(name: 'net_change_in_cash') this.netChangeInCash, @JsonKey(name: 'dividends_paid') this.dividendsPaid, this.capex, @JsonKey(name: 'free_cash_flow') this.freeCashFlow, this.basis, this.source, @JsonKey(name: 'net_income_source') this.netIncomeSource, @JsonKey(name: 'filed_on') this.filedOn}): super._();
  factory _FinancialPeriod.fromJson(Map<String, dynamic> json) => _$FinancialPeriodFromJson(json);

/// Display label, e.g. "FY25" or "Q2 FY25".
@override final  String period;
@override final  double? revenue;
@override@JsonKey(name: 'gross_profit') final  double? grossProfit;
@override@JsonKey(name: 'operating_income') final  double? operatingIncome;
@override@JsonKey(name: 'net_income') final  double? netIncome;
@override final  double? assets;
@override final  double? liabilities;
@override final  double? equity;
@override final  double? cash;
@override final  double? debt;
/// Borrowings by when they fall due, and what carrying them cost.
///
/// `debt` is the total, and on its own it does not answer the question a
/// reader actually has. Money owed inside a year has to be found or rolled
/// inside a year; money owed beyond one does not. `financeCost` is the
/// period's own charge, which is what turns a balance into a burden — or
/// shows that it isn't one.
///
/// All three are read from the issuer's filed statement, where the
/// borrowing lines are listed separately and summed; none is derived from
/// the liabilities total, which is a different and much larger thing.
@override@JsonKey(name: 'short_term_debt') final  double? shortTermDebt;
@override@JsonKey(name: 'long_term_debt') final  double? longTermDebt;
@override@JsonKey(name: 'finance_cost') final  double? financeCost;
@override@JsonKey(name: 'operating_cash_flow') final  double? operatingCashFlow;
/// The rest of the cash flow statement, and what was paid out of it.
///
/// Published by the same source as the line above and read from the same
/// filing; five of Mubasher's ten financial rows were being collected and
/// these are four of the five that were not. Together with operating cash
/// flow they are the whole statement, which is why the collector can check
/// that the three add to the change in cash instead of taking it on trust.
@override@JsonKey(name: 'investing_cash_flow') final  double? investingCashFlow;
@override@JsonKey(name: 'financing_cash_flow') final  double? financingCashFlow;
@override@JsonKey(name: 'net_change_in_cash') final  double? netChangeInCash;
@override@JsonKey(name: 'dividends_paid') final  double? dividendsPaid;
@override final  double? capex;
@override@JsonKey(name: 'free_cash_flow') final  double? freeCashFlow;
/// `consolidated` or `standalone`. Companies file both for the same
/// period and the two differ, so a figure shown without its basis is
/// ambiguous rather than merely unlabelled.
@override final  String? basis;
/// The filing this figure was read from (spec §50). A reported number the
/// reader cannot trace back is not worth much more than one we invented —
/// which is exactly what was here before.
@override final  String? source;
/// Where the NET PROFIT came from, when that is not where the rest came
/// from.
///
/// 575 periods carry a balance sheet Mubasher published and a profit the
/// exchange filed, because the exchange's own submission wins that line.
/// The footnote named one source for the whole block and so named Mubasher
/// over a figure Mubasher never reported. A row with two sources has to
/// say two.
@override@JsonKey(name: 'net_income_source') final  String? netIncomeSource;
@override@JsonKey(name: 'filed_on') final  String? filedOn;

/// Create a copy of FinancialPeriod
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FinancialPeriodCopyWith<_FinancialPeriod> get copyWith => __$FinancialPeriodCopyWithImpl<_FinancialPeriod>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FinancialPeriodToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _FinancialPeriod&&(identical(other.period, period) || other.period == period)&&(identical(other.revenue, revenue) || other.revenue == revenue)&&(identical(other.grossProfit, grossProfit) || other.grossProfit == grossProfit)&&(identical(other.operatingIncome, operatingIncome) || other.operatingIncome == operatingIncome)&&(identical(other.netIncome, netIncome) || other.netIncome == netIncome)&&(identical(other.assets, assets) || other.assets == assets)&&(identical(other.liabilities, liabilities) || other.liabilities == liabilities)&&(identical(other.equity, equity) || other.equity == equity)&&(identical(other.cash, cash) || other.cash == cash)&&(identical(other.debt, debt) || other.debt == debt)&&(identical(other.shortTermDebt, shortTermDebt) || other.shortTermDebt == shortTermDebt)&&(identical(other.longTermDebt, longTermDebt) || other.longTermDebt == longTermDebt)&&(identical(other.financeCost, financeCost) || other.financeCost == financeCost)&&(identical(other.operatingCashFlow, operatingCashFlow) || other.operatingCashFlow == operatingCashFlow)&&(identical(other.investingCashFlow, investingCashFlow) || other.investingCashFlow == investingCashFlow)&&(identical(other.financingCashFlow, financingCashFlow) || other.financingCashFlow == financingCashFlow)&&(identical(other.netChangeInCash, netChangeInCash) || other.netChangeInCash == netChangeInCash)&&(identical(other.dividendsPaid, dividendsPaid) || other.dividendsPaid == dividendsPaid)&&(identical(other.capex, capex) || other.capex == capex)&&(identical(other.freeCashFlow, freeCashFlow) || other.freeCashFlow == freeCashFlow)&&(identical(other.basis, basis) || other.basis == basis)&&(identical(other.source, source) || other.source == source)&&(identical(other.netIncomeSource, netIncomeSource) || other.netIncomeSource == netIncomeSource)&&(identical(other.filedOn, filedOn) || other.filedOn == filedOn));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,period,revenue,grossProfit,operatingIncome,netIncome,assets,liabilities,equity,cash,debt,shortTermDebt,longTermDebt,financeCost,operatingCashFlow,investingCashFlow,financingCashFlow,netChangeInCash,dividendsPaid,capex,freeCashFlow,basis,source,netIncomeSource,filedOn]);

@override
String toString() {
  return 'FinancialPeriod(period: $period, revenue: $revenue, grossProfit: $grossProfit, operatingIncome: $operatingIncome, netIncome: $netIncome, assets: $assets, liabilities: $liabilities, equity: $equity, cash: $cash, debt: $debt, shortTermDebt: $shortTermDebt, longTermDebt: $longTermDebt, financeCost: $financeCost, operatingCashFlow: $operatingCashFlow, investingCashFlow: $investingCashFlow, financingCashFlow: $financingCashFlow, netChangeInCash: $netChangeInCash, dividendsPaid: $dividendsPaid, capex: $capex, freeCashFlow: $freeCashFlow, basis: $basis, source: $source, netIncomeSource: $netIncomeSource, filedOn: $filedOn)';
}


}

/// @nodoc
abstract mixin class _$FinancialPeriodCopyWith<$Res> implements $FinancialPeriodCopyWith<$Res> {
  factory _$FinancialPeriodCopyWith(_FinancialPeriod value, $Res Function(_FinancialPeriod) _then) = __$FinancialPeriodCopyWithImpl;
@override @useResult
$Res call({
 String period, double? revenue,@JsonKey(name: 'gross_profit') double? grossProfit,@JsonKey(name: 'operating_income') double? operatingIncome,@JsonKey(name: 'net_income') double? netIncome, double? assets, double? liabilities, double? equity, double? cash, double? debt,@JsonKey(name: 'short_term_debt') double? shortTermDebt,@JsonKey(name: 'long_term_debt') double? longTermDebt,@JsonKey(name: 'finance_cost') double? financeCost,@JsonKey(name: 'operating_cash_flow') double? operatingCashFlow,@JsonKey(name: 'investing_cash_flow') double? investingCashFlow,@JsonKey(name: 'financing_cash_flow') double? financingCashFlow,@JsonKey(name: 'net_change_in_cash') double? netChangeInCash,@JsonKey(name: 'dividends_paid') double? dividendsPaid, double? capex,@JsonKey(name: 'free_cash_flow') double? freeCashFlow, String? basis, String? source,@JsonKey(name: 'net_income_source') String? netIncomeSource,@JsonKey(name: 'filed_on') String? filedOn
});




}
/// @nodoc
class __$FinancialPeriodCopyWithImpl<$Res>
    implements _$FinancialPeriodCopyWith<$Res> {
  __$FinancialPeriodCopyWithImpl(this._self, this._then);

  final _FinancialPeriod _self;
  final $Res Function(_FinancialPeriod) _then;

/// Create a copy of FinancialPeriod
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? period = null,Object? revenue = freezed,Object? grossProfit = freezed,Object? operatingIncome = freezed,Object? netIncome = freezed,Object? assets = freezed,Object? liabilities = freezed,Object? equity = freezed,Object? cash = freezed,Object? debt = freezed,Object? shortTermDebt = freezed,Object? longTermDebt = freezed,Object? financeCost = freezed,Object? operatingCashFlow = freezed,Object? investingCashFlow = freezed,Object? financingCashFlow = freezed,Object? netChangeInCash = freezed,Object? dividendsPaid = freezed,Object? capex = freezed,Object? freeCashFlow = freezed,Object? basis = freezed,Object? source = freezed,Object? netIncomeSource = freezed,Object? filedOn = freezed,}) {
  return _then(_FinancialPeriod(
period: null == period ? _self.period : period // ignore: cast_nullable_to_non_nullable
as String,revenue: freezed == revenue ? _self.revenue : revenue // ignore: cast_nullable_to_non_nullable
as double?,grossProfit: freezed == grossProfit ? _self.grossProfit : grossProfit // ignore: cast_nullable_to_non_nullable
as double?,operatingIncome: freezed == operatingIncome ? _self.operatingIncome : operatingIncome // ignore: cast_nullable_to_non_nullable
as double?,netIncome: freezed == netIncome ? _self.netIncome : netIncome // ignore: cast_nullable_to_non_nullable
as double?,assets: freezed == assets ? _self.assets : assets // ignore: cast_nullable_to_non_nullable
as double?,liabilities: freezed == liabilities ? _self.liabilities : liabilities // ignore: cast_nullable_to_non_nullable
as double?,equity: freezed == equity ? _self.equity : equity // ignore: cast_nullable_to_non_nullable
as double?,cash: freezed == cash ? _self.cash : cash // ignore: cast_nullable_to_non_nullable
as double?,debt: freezed == debt ? _self.debt : debt // ignore: cast_nullable_to_non_nullable
as double?,shortTermDebt: freezed == shortTermDebt ? _self.shortTermDebt : shortTermDebt // ignore: cast_nullable_to_non_nullable
as double?,longTermDebt: freezed == longTermDebt ? _self.longTermDebt : longTermDebt // ignore: cast_nullable_to_non_nullable
as double?,financeCost: freezed == financeCost ? _self.financeCost : financeCost // ignore: cast_nullable_to_non_nullable
as double?,operatingCashFlow: freezed == operatingCashFlow ? _self.operatingCashFlow : operatingCashFlow // ignore: cast_nullable_to_non_nullable
as double?,investingCashFlow: freezed == investingCashFlow ? _self.investingCashFlow : investingCashFlow // ignore: cast_nullable_to_non_nullable
as double?,financingCashFlow: freezed == financingCashFlow ? _self.financingCashFlow : financingCashFlow // ignore: cast_nullable_to_non_nullable
as double?,netChangeInCash: freezed == netChangeInCash ? _self.netChangeInCash : netChangeInCash // ignore: cast_nullable_to_non_nullable
as double?,dividendsPaid: freezed == dividendsPaid ? _self.dividendsPaid : dividendsPaid // ignore: cast_nullable_to_non_nullable
as double?,capex: freezed == capex ? _self.capex : capex // ignore: cast_nullable_to_non_nullable
as double?,freeCashFlow: freezed == freeCashFlow ? _self.freeCashFlow : freeCashFlow // ignore: cast_nullable_to_non_nullable
as double?,basis: freezed == basis ? _self.basis : basis // ignore: cast_nullable_to_non_nullable
as String?,source: freezed == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String?,netIncomeSource: freezed == netIncomeSource ? _self.netIncomeSource : netIncomeSource // ignore: cast_nullable_to_non_nullable
as String?,filedOn: freezed == filedOn ? _self.filedOn : filedOn // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$ResearchLink {

 String get kind; String get title; String? get kicker; String? get url;@JsonKey(name: 'published_at') String? get publishedAt;@JsonKey(name: 'read_minutes') int? get readMinutes;
/// Create a copy of ResearchLink
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ResearchLinkCopyWith<ResearchLink> get copyWith => _$ResearchLinkCopyWithImpl<ResearchLink>(this as ResearchLink, _$identity);

  /// Serializes this ResearchLink to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ResearchLink&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.title, title) || other.title == title)&&(identical(other.kicker, kicker) || other.kicker == kicker)&&(identical(other.url, url) || other.url == url)&&(identical(other.publishedAt, publishedAt) || other.publishedAt == publishedAt)&&(identical(other.readMinutes, readMinutes) || other.readMinutes == readMinutes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,kind,title,kicker,url,publishedAt,readMinutes);

@override
String toString() {
  return 'ResearchLink(kind: $kind, title: $title, kicker: $kicker, url: $url, publishedAt: $publishedAt, readMinutes: $readMinutes)';
}


}

/// @nodoc
abstract mixin class $ResearchLinkCopyWith<$Res>  {
  factory $ResearchLinkCopyWith(ResearchLink value, $Res Function(ResearchLink) _then) = _$ResearchLinkCopyWithImpl;
@useResult
$Res call({
 String kind, String title, String? kicker, String? url,@JsonKey(name: 'published_at') String? publishedAt,@JsonKey(name: 'read_minutes') int? readMinutes
});




}
/// @nodoc
class _$ResearchLinkCopyWithImpl<$Res>
    implements $ResearchLinkCopyWith<$Res> {
  _$ResearchLinkCopyWithImpl(this._self, this._then);

  final ResearchLink _self;
  final $Res Function(ResearchLink) _then;

/// Create a copy of ResearchLink
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? kind = null,Object? title = null,Object? kicker = freezed,Object? url = freezed,Object? publishedAt = freezed,Object? readMinutes = freezed,}) {
  return _then(_self.copyWith(
kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,kicker: freezed == kicker ? _self.kicker : kicker // ignore: cast_nullable_to_non_nullable
as String?,url: freezed == url ? _self.url : url // ignore: cast_nullable_to_non_nullable
as String?,publishedAt: freezed == publishedAt ? _self.publishedAt : publishedAt // ignore: cast_nullable_to_non_nullable
as String?,readMinutes: freezed == readMinutes ? _self.readMinutes : readMinutes // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [ResearchLink].
extension ResearchLinkPatterns on ResearchLink {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ResearchLink value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ResearchLink() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ResearchLink value)  $default,){
final _that = this;
switch (_that) {
case _ResearchLink():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ResearchLink value)?  $default,){
final _that = this;
switch (_that) {
case _ResearchLink() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String kind,  String title,  String? kicker,  String? url, @JsonKey(name: 'published_at')  String? publishedAt, @JsonKey(name: 'read_minutes')  int? readMinutes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ResearchLink() when $default != null:
return $default(_that.kind,_that.title,_that.kicker,_that.url,_that.publishedAt,_that.readMinutes);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String kind,  String title,  String? kicker,  String? url, @JsonKey(name: 'published_at')  String? publishedAt, @JsonKey(name: 'read_minutes')  int? readMinutes)  $default,) {final _that = this;
switch (_that) {
case _ResearchLink():
return $default(_that.kind,_that.title,_that.kicker,_that.url,_that.publishedAt,_that.readMinutes);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String kind,  String title,  String? kicker,  String? url, @JsonKey(name: 'published_at')  String? publishedAt, @JsonKey(name: 'read_minutes')  int? readMinutes)?  $default,) {final _that = this;
switch (_that) {
case _ResearchLink() when $default != null:
return $default(_that.kind,_that.title,_that.kicker,_that.url,_that.publishedAt,_that.readMinutes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ResearchLink extends ResearchLink {
  const _ResearchLink({required this.kind, required this.title, this.kicker, this.url, @JsonKey(name: 'published_at') this.publishedAt, @JsonKey(name: 'read_minutes') this.readMinutes}): super._();
  factory _ResearchLink.fromJson(Map<String, dynamic> json) => _$ResearchLinkFromJson(json);

@override final  String kind;
@override final  String title;
@override final  String? kicker;
@override final  String? url;
@override@JsonKey(name: 'published_at') final  String? publishedAt;
@override@JsonKey(name: 'read_minutes') final  int? readMinutes;

/// Create a copy of ResearchLink
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ResearchLinkCopyWith<_ResearchLink> get copyWith => __$ResearchLinkCopyWithImpl<_ResearchLink>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ResearchLinkToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ResearchLink&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.title, title) || other.title == title)&&(identical(other.kicker, kicker) || other.kicker == kicker)&&(identical(other.url, url) || other.url == url)&&(identical(other.publishedAt, publishedAt) || other.publishedAt == publishedAt)&&(identical(other.readMinutes, readMinutes) || other.readMinutes == readMinutes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,kind,title,kicker,url,publishedAt,readMinutes);

@override
String toString() {
  return 'ResearchLink(kind: $kind, title: $title, kicker: $kicker, url: $url, publishedAt: $publishedAt, readMinutes: $readMinutes)';
}


}

/// @nodoc
abstract mixin class _$ResearchLinkCopyWith<$Res> implements $ResearchLinkCopyWith<$Res> {
  factory _$ResearchLinkCopyWith(_ResearchLink value, $Res Function(_ResearchLink) _then) = __$ResearchLinkCopyWithImpl;
@override @useResult
$Res call({
 String kind, String title, String? kicker, String? url,@JsonKey(name: 'published_at') String? publishedAt,@JsonKey(name: 'read_minutes') int? readMinutes
});




}
/// @nodoc
class __$ResearchLinkCopyWithImpl<$Res>
    implements _$ResearchLinkCopyWith<$Res> {
  __$ResearchLinkCopyWithImpl(this._self, this._then);

  final _ResearchLink _self;
  final $Res Function(_ResearchLink) _then;

/// Create a copy of ResearchLink
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? kind = null,Object? title = null,Object? kicker = freezed,Object? url = freezed,Object? publishedAt = freezed,Object? readMinutes = freezed,}) {
  return _then(_ResearchLink(
kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,kicker: freezed == kicker ? _self.kicker : kicker // ignore: cast_nullable_to_non_nullable
as String?,url: freezed == url ? _self.url : url // ignore: cast_nullable_to_non_nullable
as String?,publishedAt: freezed == publishedAt ? _self.publishedAt : publishedAt // ignore: cast_nullable_to_non_nullable
as String?,readMinutes: freezed == readMinutes ? _self.readMinutes : readMinutes // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}

// dart format on
