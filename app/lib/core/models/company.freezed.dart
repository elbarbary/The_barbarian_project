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

 String get ticker;@JsonKey(name: 'name_en') String get nameEn;@JsonKey(name: 'name_ar') String? get nameAr; String? get sector; String get exchange;@JsonKey(name: 'has_cash_or_trash') bool get hasCashOrTrash;@JsonKey(name: 'has_research') bool get hasResearch;
/// Create a copy of CompanySummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CompanySummaryCopyWith<CompanySummary> get copyWith => _$CompanySummaryCopyWithImpl<CompanySummary>(this as CompanySummary, _$identity);

  /// Serializes this CompanySummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CompanySummary&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.nameEn, nameEn) || other.nameEn == nameEn)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.exchange, exchange) || other.exchange == exchange)&&(identical(other.hasCashOrTrash, hasCashOrTrash) || other.hasCashOrTrash == hasCashOrTrash)&&(identical(other.hasResearch, hasResearch) || other.hasResearch == hasResearch));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,nameEn,nameAr,sector,exchange,hasCashOrTrash,hasResearch);

@override
String toString() {
  return 'CompanySummary(ticker: $ticker, nameEn: $nameEn, nameAr: $nameAr, sector: $sector, exchange: $exchange, hasCashOrTrash: $hasCashOrTrash, hasResearch: $hasResearch)';
}


}

/// @nodoc
abstract mixin class $CompanySummaryCopyWith<$Res>  {
  factory $CompanySummaryCopyWith(CompanySummary value, $Res Function(CompanySummary) _then) = _$CompanySummaryCopyWithImpl;
@useResult
$Res call({
 String ticker,@JsonKey(name: 'name_en') String nameEn,@JsonKey(name: 'name_ar') String? nameAr, String? sector, String exchange,@JsonKey(name: 'has_cash_or_trash') bool hasCashOrTrash,@JsonKey(name: 'has_research') bool hasResearch
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
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? nameEn = null,Object? nameAr = freezed,Object? sector = freezed,Object? exchange = null,Object? hasCashOrTrash = null,Object? hasResearch = null,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,nameEn: null == nameEn ? _self.nameEn : nameEn // ignore: cast_nullable_to_non_nullable
as String,nameAr: freezed == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String?,sector: freezed == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String?,exchange: null == exchange ? _self.exchange : exchange // ignore: cast_nullable_to_non_nullable
as String,hasCashOrTrash: null == hasCashOrTrash ? _self.hasCashOrTrash : hasCashOrTrash // ignore: cast_nullable_to_non_nullable
as bool,hasResearch: null == hasResearch ? _self.hasResearch : hasResearch // ignore: cast_nullable_to_non_nullable
as bool,
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker, @JsonKey(name: 'name_en')  String nameEn, @JsonKey(name: 'name_ar')  String? nameAr,  String? sector,  String exchange, @JsonKey(name: 'has_cash_or_trash')  bool hasCashOrTrash, @JsonKey(name: 'has_research')  bool hasResearch)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CompanySummary() when $default != null:
return $default(_that.ticker,_that.nameEn,_that.nameAr,_that.sector,_that.exchange,_that.hasCashOrTrash,_that.hasResearch);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker, @JsonKey(name: 'name_en')  String nameEn, @JsonKey(name: 'name_ar')  String? nameAr,  String? sector,  String exchange, @JsonKey(name: 'has_cash_or_trash')  bool hasCashOrTrash, @JsonKey(name: 'has_research')  bool hasResearch)  $default,) {final _that = this;
switch (_that) {
case _CompanySummary():
return $default(_that.ticker,_that.nameEn,_that.nameAr,_that.sector,_that.exchange,_that.hasCashOrTrash,_that.hasResearch);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker, @JsonKey(name: 'name_en')  String nameEn, @JsonKey(name: 'name_ar')  String? nameAr,  String? sector,  String exchange, @JsonKey(name: 'has_cash_or_trash')  bool hasCashOrTrash, @JsonKey(name: 'has_research')  bool hasResearch)?  $default,) {final _that = this;
switch (_that) {
case _CompanySummary() when $default != null:
return $default(_that.ticker,_that.nameEn,_that.nameAr,_that.sector,_that.exchange,_that.hasCashOrTrash,_that.hasResearch);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CompanySummary extends CompanySummary {
  const _CompanySummary({required this.ticker, @JsonKey(name: 'name_en') required this.nameEn, @JsonKey(name: 'name_ar') this.nameAr, this.sector, this.exchange = 'EGX', @JsonKey(name: 'has_cash_or_trash') this.hasCashOrTrash = false, @JsonKey(name: 'has_research') this.hasResearch = false}): super._();
  factory _CompanySummary.fromJson(Map<String, dynamic> json) => _$CompanySummaryFromJson(json);

@override final  String ticker;
@override@JsonKey(name: 'name_en') final  String nameEn;
@override@JsonKey(name: 'name_ar') final  String? nameAr;
@override final  String? sector;
@override@JsonKey() final  String exchange;
@override@JsonKey(name: 'has_cash_or_trash') final  bool hasCashOrTrash;
@override@JsonKey(name: 'has_research') final  bool hasResearch;

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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CompanySummary&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.nameEn, nameEn) || other.nameEn == nameEn)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.exchange, exchange) || other.exchange == exchange)&&(identical(other.hasCashOrTrash, hasCashOrTrash) || other.hasCashOrTrash == hasCashOrTrash)&&(identical(other.hasResearch, hasResearch) || other.hasResearch == hasResearch));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,nameEn,nameAr,sector,exchange,hasCashOrTrash,hasResearch);

@override
String toString() {
  return 'CompanySummary(ticker: $ticker, nameEn: $nameEn, nameAr: $nameAr, sector: $sector, exchange: $exchange, hasCashOrTrash: $hasCashOrTrash, hasResearch: $hasResearch)';
}


}

/// @nodoc
abstract mixin class _$CompanySummaryCopyWith<$Res> implements $CompanySummaryCopyWith<$Res> {
  factory _$CompanySummaryCopyWith(_CompanySummary value, $Res Function(_CompanySummary) _then) = __$CompanySummaryCopyWithImpl;
@override @useResult
$Res call({
 String ticker,@JsonKey(name: 'name_en') String nameEn,@JsonKey(name: 'name_ar') String? nameAr, String? sector, String exchange,@JsonKey(name: 'has_cash_or_trash') bool hasCashOrTrash,@JsonKey(name: 'has_research') bool hasResearch
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
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? nameEn = null,Object? nameAr = freezed,Object? sector = freezed,Object? exchange = null,Object? hasCashOrTrash = null,Object? hasResearch = null,}) {
  return _then(_CompanySummary(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,nameEn: null == nameEn ? _self.nameEn : nameEn // ignore: cast_nullable_to_non_nullable
as String,nameAr: freezed == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String?,sector: freezed == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String?,exchange: null == exchange ? _self.exchange : exchange // ignore: cast_nullable_to_non_nullable
as String,hasCashOrTrash: null == hasCashOrTrash ? _self.hasCashOrTrash : hasCashOrTrash // ignore: cast_nullable_to_non_nullable
as bool,hasResearch: null == hasResearch ? _self.hasResearch : hasResearch // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$Company {

 String get ticker; LocalizedName get name; String? get sector; CompanyMarket? get market;/// Whatever the ingestion source knew about the company beyond price —
/// market cap, shares outstanding, free float. Deliberately loose: the
/// fields available differ by provider and a missing one must simply not
/// render (spec §49).
 Map<String, dynamic>? get profile;@JsonKey(name: 'price_history') List<PricePoint> get priceHistory; CompanyFinancials get financials; List<ResearchLink> get research;
/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CompanyCopyWith<Company> get copyWith => _$CompanyCopyWithImpl<Company>(this as Company, _$identity);

  /// Serializes this Company to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Company&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.name, name) || other.name == name)&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.market, market) || other.market == market)&&const DeepCollectionEquality().equals(other.profile, profile)&&const DeepCollectionEquality().equals(other.priceHistory, priceHistory)&&(identical(other.financials, financials) || other.financials == financials)&&const DeepCollectionEquality().equals(other.research, research));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,name,sector,market,const DeepCollectionEquality().hash(profile),const DeepCollectionEquality().hash(priceHistory),financials,const DeepCollectionEquality().hash(research));

@override
String toString() {
  return 'Company(ticker: $ticker, name: $name, sector: $sector, market: $market, profile: $profile, priceHistory: $priceHistory, financials: $financials, research: $research)';
}


}

/// @nodoc
abstract mixin class $CompanyCopyWith<$Res>  {
  factory $CompanyCopyWith(Company value, $Res Function(Company) _then) = _$CompanyCopyWithImpl;
@useResult
$Res call({
 String ticker, LocalizedName name, String? sector, CompanyMarket? market, Map<String, dynamic>? profile,@JsonKey(name: 'price_history') List<PricePoint> priceHistory, CompanyFinancials financials, List<ResearchLink> research
});


$LocalizedNameCopyWith<$Res> get name;$CompanyMarketCopyWith<$Res>? get market;$CompanyFinancialsCopyWith<$Res> get financials;

}
/// @nodoc
class _$CompanyCopyWithImpl<$Res>
    implements $CompanyCopyWith<$Res> {
  _$CompanyCopyWithImpl(this._self, this._then);

  final Company _self;
  final $Res Function(Company) _then;

/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? name = null,Object? sector = freezed,Object? market = freezed,Object? profile = freezed,Object? priceHistory = null,Object? financials = null,Object? research = null,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as LocalizedName,sector: freezed == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String?,market: freezed == market ? _self.market : market // ignore: cast_nullable_to_non_nullable
as CompanyMarket?,profile: freezed == profile ? _self.profile : profile // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,priceHistory: null == priceHistory ? _self.priceHistory : priceHistory // ignore: cast_nullable_to_non_nullable
as List<PricePoint>,financials: null == financials ? _self.financials : financials // ignore: cast_nullable_to_non_nullable
as CompanyFinancials,research: null == research ? _self.research : research // ignore: cast_nullable_to_non_nullable
as List<ResearchLink>,
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker,  LocalizedName name,  String? sector,  CompanyMarket? market,  Map<String, dynamic>? profile, @JsonKey(name: 'price_history')  List<PricePoint> priceHistory,  CompanyFinancials financials,  List<ResearchLink> research)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Company() when $default != null:
return $default(_that.ticker,_that.name,_that.sector,_that.market,_that.profile,_that.priceHistory,_that.financials,_that.research);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker,  LocalizedName name,  String? sector,  CompanyMarket? market,  Map<String, dynamic>? profile, @JsonKey(name: 'price_history')  List<PricePoint> priceHistory,  CompanyFinancials financials,  List<ResearchLink> research)  $default,) {final _that = this;
switch (_that) {
case _Company():
return $default(_that.ticker,_that.name,_that.sector,_that.market,_that.profile,_that.priceHistory,_that.financials,_that.research);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker,  LocalizedName name,  String? sector,  CompanyMarket? market,  Map<String, dynamic>? profile, @JsonKey(name: 'price_history')  List<PricePoint> priceHistory,  CompanyFinancials financials,  List<ResearchLink> research)?  $default,) {final _that = this;
switch (_that) {
case _Company() when $default != null:
return $default(_that.ticker,_that.name,_that.sector,_that.market,_that.profile,_that.priceHistory,_that.financials,_that.research);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Company extends Company {
  const _Company({required this.ticker, required this.name, this.sector, this.market, final  Map<String, dynamic>? profile, @JsonKey(name: 'price_history') final  List<PricePoint> priceHistory = const <PricePoint>[], this.financials = const CompanyFinancials(), final  List<ResearchLink> research = const <ResearchLink>[]}): _profile = profile,_priceHistory = priceHistory,_research = research,super._();
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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Company&&(identical(other.ticker, ticker) || other.ticker == ticker)&&(identical(other.name, name) || other.name == name)&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.market, market) || other.market == market)&&const DeepCollectionEquality().equals(other._profile, _profile)&&const DeepCollectionEquality().equals(other._priceHistory, _priceHistory)&&(identical(other.financials, financials) || other.financials == financials)&&const DeepCollectionEquality().equals(other._research, _research));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,name,sector,market,const DeepCollectionEquality().hash(_profile),const DeepCollectionEquality().hash(_priceHistory),financials,const DeepCollectionEquality().hash(_research));

@override
String toString() {
  return 'Company(ticker: $ticker, name: $name, sector: $sector, market: $market, profile: $profile, priceHistory: $priceHistory, financials: $financials, research: $research)';
}


}

/// @nodoc
abstract mixin class _$CompanyCopyWith<$Res> implements $CompanyCopyWith<$Res> {
  factory _$CompanyCopyWith(_Company value, $Res Function(_Company) _then) = __$CompanyCopyWithImpl;
@override @useResult
$Res call({
 String ticker, LocalizedName name, String? sector, CompanyMarket? market, Map<String, dynamic>? profile,@JsonKey(name: 'price_history') List<PricePoint> priceHistory, CompanyFinancials financials, List<ResearchLink> research
});


@override $LocalizedNameCopyWith<$Res> get name;@override $CompanyMarketCopyWith<$Res>? get market;@override $CompanyFinancialsCopyWith<$Res> get financials;

}
/// @nodoc
class __$CompanyCopyWithImpl<$Res>
    implements _$CompanyCopyWith<$Res> {
  __$CompanyCopyWithImpl(this._self, this._then);

  final _Company _self;
  final $Res Function(_Company) _then;

/// Create a copy of Company
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? name = null,Object? sector = freezed,Object? market = freezed,Object? profile = freezed,Object? priceHistory = null,Object? financials = null,Object? research = null,}) {
  return _then(_Company(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as LocalizedName,sector: freezed == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String?,market: freezed == market ? _self.market : market // ignore: cast_nullable_to_non_nullable
as CompanyMarket?,profile: freezed == profile ? _self._profile : profile // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,priceHistory: null == priceHistory ? _self._priceHistory : priceHistory // ignore: cast_nullable_to_non_nullable
as List<PricePoint>,financials: null == financials ? _self.financials : financials // ignore: cast_nullable_to_non_nullable
as CompanyFinancials,research: null == research ? _self._research : research // ignore: cast_nullable_to_non_nullable
as List<ResearchLink>,
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
 String get period; double? get revenue;@JsonKey(name: 'gross_profit') double? get grossProfit;@JsonKey(name: 'operating_income') double? get operatingIncome;@JsonKey(name: 'net_income') double? get netIncome; double? get assets; double? get liabilities; double? get equity; double? get cash; double? get debt;@JsonKey(name: 'operating_cash_flow') double? get operatingCashFlow;/// The rest of the cash flow statement, and what was paid out of it.
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
 String? get source;@JsonKey(name: 'filed_on') String? get filedOn;
/// Create a copy of FinancialPeriod
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FinancialPeriodCopyWith<FinancialPeriod> get copyWith => _$FinancialPeriodCopyWithImpl<FinancialPeriod>(this as FinancialPeriod, _$identity);

  /// Serializes this FinancialPeriod to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FinancialPeriod&&(identical(other.period, period) || other.period == period)&&(identical(other.revenue, revenue) || other.revenue == revenue)&&(identical(other.grossProfit, grossProfit) || other.grossProfit == grossProfit)&&(identical(other.operatingIncome, operatingIncome) || other.operatingIncome == operatingIncome)&&(identical(other.netIncome, netIncome) || other.netIncome == netIncome)&&(identical(other.assets, assets) || other.assets == assets)&&(identical(other.liabilities, liabilities) || other.liabilities == liabilities)&&(identical(other.equity, equity) || other.equity == equity)&&(identical(other.cash, cash) || other.cash == cash)&&(identical(other.debt, debt) || other.debt == debt)&&(identical(other.operatingCashFlow, operatingCashFlow) || other.operatingCashFlow == operatingCashFlow)&&(identical(other.investingCashFlow, investingCashFlow) || other.investingCashFlow == investingCashFlow)&&(identical(other.financingCashFlow, financingCashFlow) || other.financingCashFlow == financingCashFlow)&&(identical(other.netChangeInCash, netChangeInCash) || other.netChangeInCash == netChangeInCash)&&(identical(other.dividendsPaid, dividendsPaid) || other.dividendsPaid == dividendsPaid)&&(identical(other.capex, capex) || other.capex == capex)&&(identical(other.freeCashFlow, freeCashFlow) || other.freeCashFlow == freeCashFlow)&&(identical(other.basis, basis) || other.basis == basis)&&(identical(other.source, source) || other.source == source)&&(identical(other.filedOn, filedOn) || other.filedOn == filedOn));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,period,revenue,grossProfit,operatingIncome,netIncome,assets,liabilities,equity,cash,debt,operatingCashFlow,investingCashFlow,financingCashFlow,netChangeInCash,dividendsPaid,capex,freeCashFlow,basis,source,filedOn]);

@override
String toString() {
  return 'FinancialPeriod(period: $period, revenue: $revenue, grossProfit: $grossProfit, operatingIncome: $operatingIncome, netIncome: $netIncome, assets: $assets, liabilities: $liabilities, equity: $equity, cash: $cash, debt: $debt, operatingCashFlow: $operatingCashFlow, investingCashFlow: $investingCashFlow, financingCashFlow: $financingCashFlow, netChangeInCash: $netChangeInCash, dividendsPaid: $dividendsPaid, capex: $capex, freeCashFlow: $freeCashFlow, basis: $basis, source: $source, filedOn: $filedOn)';
}


}

/// @nodoc
abstract mixin class $FinancialPeriodCopyWith<$Res>  {
  factory $FinancialPeriodCopyWith(FinancialPeriod value, $Res Function(FinancialPeriod) _then) = _$FinancialPeriodCopyWithImpl;
@useResult
$Res call({
 String period, double? revenue,@JsonKey(name: 'gross_profit') double? grossProfit,@JsonKey(name: 'operating_income') double? operatingIncome,@JsonKey(name: 'net_income') double? netIncome, double? assets, double? liabilities, double? equity, double? cash, double? debt,@JsonKey(name: 'operating_cash_flow') double? operatingCashFlow,@JsonKey(name: 'investing_cash_flow') double? investingCashFlow,@JsonKey(name: 'financing_cash_flow') double? financingCashFlow,@JsonKey(name: 'net_change_in_cash') double? netChangeInCash,@JsonKey(name: 'dividends_paid') double? dividendsPaid, double? capex,@JsonKey(name: 'free_cash_flow') double? freeCashFlow, String? basis, String? source,@JsonKey(name: 'filed_on') String? filedOn
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
@pragma('vm:prefer-inline') @override $Res call({Object? period = null,Object? revenue = freezed,Object? grossProfit = freezed,Object? operatingIncome = freezed,Object? netIncome = freezed,Object? assets = freezed,Object? liabilities = freezed,Object? equity = freezed,Object? cash = freezed,Object? debt = freezed,Object? operatingCashFlow = freezed,Object? investingCashFlow = freezed,Object? financingCashFlow = freezed,Object? netChangeInCash = freezed,Object? dividendsPaid = freezed,Object? capex = freezed,Object? freeCashFlow = freezed,Object? basis = freezed,Object? source = freezed,Object? filedOn = freezed,}) {
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
as double?,operatingCashFlow: freezed == operatingCashFlow ? _self.operatingCashFlow : operatingCashFlow // ignore: cast_nullable_to_non_nullable
as double?,investingCashFlow: freezed == investingCashFlow ? _self.investingCashFlow : investingCashFlow // ignore: cast_nullable_to_non_nullable
as double?,financingCashFlow: freezed == financingCashFlow ? _self.financingCashFlow : financingCashFlow // ignore: cast_nullable_to_non_nullable
as double?,netChangeInCash: freezed == netChangeInCash ? _self.netChangeInCash : netChangeInCash // ignore: cast_nullable_to_non_nullable
as double?,dividendsPaid: freezed == dividendsPaid ? _self.dividendsPaid : dividendsPaid // ignore: cast_nullable_to_non_nullable
as double?,capex: freezed == capex ? _self.capex : capex // ignore: cast_nullable_to_non_nullable
as double?,freeCashFlow: freezed == freeCashFlow ? _self.freeCashFlow : freeCashFlow // ignore: cast_nullable_to_non_nullable
as double?,basis: freezed == basis ? _self.basis : basis // ignore: cast_nullable_to_non_nullable
as String?,source: freezed == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String period,  double? revenue, @JsonKey(name: 'gross_profit')  double? grossProfit, @JsonKey(name: 'operating_income')  double? operatingIncome, @JsonKey(name: 'net_income')  double? netIncome,  double? assets,  double? liabilities,  double? equity,  double? cash,  double? debt, @JsonKey(name: 'operating_cash_flow')  double? operatingCashFlow, @JsonKey(name: 'investing_cash_flow')  double? investingCashFlow, @JsonKey(name: 'financing_cash_flow')  double? financingCashFlow, @JsonKey(name: 'net_change_in_cash')  double? netChangeInCash, @JsonKey(name: 'dividends_paid')  double? dividendsPaid,  double? capex, @JsonKey(name: 'free_cash_flow')  double? freeCashFlow,  String? basis,  String? source, @JsonKey(name: 'filed_on')  String? filedOn)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FinancialPeriod() when $default != null:
return $default(_that.period,_that.revenue,_that.grossProfit,_that.operatingIncome,_that.netIncome,_that.assets,_that.liabilities,_that.equity,_that.cash,_that.debt,_that.operatingCashFlow,_that.investingCashFlow,_that.financingCashFlow,_that.netChangeInCash,_that.dividendsPaid,_that.capex,_that.freeCashFlow,_that.basis,_that.source,_that.filedOn);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String period,  double? revenue, @JsonKey(name: 'gross_profit')  double? grossProfit, @JsonKey(name: 'operating_income')  double? operatingIncome, @JsonKey(name: 'net_income')  double? netIncome,  double? assets,  double? liabilities,  double? equity,  double? cash,  double? debt, @JsonKey(name: 'operating_cash_flow')  double? operatingCashFlow, @JsonKey(name: 'investing_cash_flow')  double? investingCashFlow, @JsonKey(name: 'financing_cash_flow')  double? financingCashFlow, @JsonKey(name: 'net_change_in_cash')  double? netChangeInCash, @JsonKey(name: 'dividends_paid')  double? dividendsPaid,  double? capex, @JsonKey(name: 'free_cash_flow')  double? freeCashFlow,  String? basis,  String? source, @JsonKey(name: 'filed_on')  String? filedOn)  $default,) {final _that = this;
switch (_that) {
case _FinancialPeriod():
return $default(_that.period,_that.revenue,_that.grossProfit,_that.operatingIncome,_that.netIncome,_that.assets,_that.liabilities,_that.equity,_that.cash,_that.debt,_that.operatingCashFlow,_that.investingCashFlow,_that.financingCashFlow,_that.netChangeInCash,_that.dividendsPaid,_that.capex,_that.freeCashFlow,_that.basis,_that.source,_that.filedOn);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String period,  double? revenue, @JsonKey(name: 'gross_profit')  double? grossProfit, @JsonKey(name: 'operating_income')  double? operatingIncome, @JsonKey(name: 'net_income')  double? netIncome,  double? assets,  double? liabilities,  double? equity,  double? cash,  double? debt, @JsonKey(name: 'operating_cash_flow')  double? operatingCashFlow, @JsonKey(name: 'investing_cash_flow')  double? investingCashFlow, @JsonKey(name: 'financing_cash_flow')  double? financingCashFlow, @JsonKey(name: 'net_change_in_cash')  double? netChangeInCash, @JsonKey(name: 'dividends_paid')  double? dividendsPaid,  double? capex, @JsonKey(name: 'free_cash_flow')  double? freeCashFlow,  String? basis,  String? source, @JsonKey(name: 'filed_on')  String? filedOn)?  $default,) {final _that = this;
switch (_that) {
case _FinancialPeriod() when $default != null:
return $default(_that.period,_that.revenue,_that.grossProfit,_that.operatingIncome,_that.netIncome,_that.assets,_that.liabilities,_that.equity,_that.cash,_that.debt,_that.operatingCashFlow,_that.investingCashFlow,_that.financingCashFlow,_that.netChangeInCash,_that.dividendsPaid,_that.capex,_that.freeCashFlow,_that.basis,_that.source,_that.filedOn);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FinancialPeriod extends FinancialPeriod {
  const _FinancialPeriod({required this.period, this.revenue, @JsonKey(name: 'gross_profit') this.grossProfit, @JsonKey(name: 'operating_income') this.operatingIncome, @JsonKey(name: 'net_income') this.netIncome, this.assets, this.liabilities, this.equity, this.cash, this.debt, @JsonKey(name: 'operating_cash_flow') this.operatingCashFlow, @JsonKey(name: 'investing_cash_flow') this.investingCashFlow, @JsonKey(name: 'financing_cash_flow') this.financingCashFlow, @JsonKey(name: 'net_change_in_cash') this.netChangeInCash, @JsonKey(name: 'dividends_paid') this.dividendsPaid, this.capex, @JsonKey(name: 'free_cash_flow') this.freeCashFlow, this.basis, this.source, @JsonKey(name: 'filed_on') this.filedOn}): super._();
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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _FinancialPeriod&&(identical(other.period, period) || other.period == period)&&(identical(other.revenue, revenue) || other.revenue == revenue)&&(identical(other.grossProfit, grossProfit) || other.grossProfit == grossProfit)&&(identical(other.operatingIncome, operatingIncome) || other.operatingIncome == operatingIncome)&&(identical(other.netIncome, netIncome) || other.netIncome == netIncome)&&(identical(other.assets, assets) || other.assets == assets)&&(identical(other.liabilities, liabilities) || other.liabilities == liabilities)&&(identical(other.equity, equity) || other.equity == equity)&&(identical(other.cash, cash) || other.cash == cash)&&(identical(other.debt, debt) || other.debt == debt)&&(identical(other.operatingCashFlow, operatingCashFlow) || other.operatingCashFlow == operatingCashFlow)&&(identical(other.investingCashFlow, investingCashFlow) || other.investingCashFlow == investingCashFlow)&&(identical(other.financingCashFlow, financingCashFlow) || other.financingCashFlow == financingCashFlow)&&(identical(other.netChangeInCash, netChangeInCash) || other.netChangeInCash == netChangeInCash)&&(identical(other.dividendsPaid, dividendsPaid) || other.dividendsPaid == dividendsPaid)&&(identical(other.capex, capex) || other.capex == capex)&&(identical(other.freeCashFlow, freeCashFlow) || other.freeCashFlow == freeCashFlow)&&(identical(other.basis, basis) || other.basis == basis)&&(identical(other.source, source) || other.source == source)&&(identical(other.filedOn, filedOn) || other.filedOn == filedOn));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,period,revenue,grossProfit,operatingIncome,netIncome,assets,liabilities,equity,cash,debt,operatingCashFlow,investingCashFlow,financingCashFlow,netChangeInCash,dividendsPaid,capex,freeCashFlow,basis,source,filedOn]);

@override
String toString() {
  return 'FinancialPeriod(period: $period, revenue: $revenue, grossProfit: $grossProfit, operatingIncome: $operatingIncome, netIncome: $netIncome, assets: $assets, liabilities: $liabilities, equity: $equity, cash: $cash, debt: $debt, operatingCashFlow: $operatingCashFlow, investingCashFlow: $investingCashFlow, financingCashFlow: $financingCashFlow, netChangeInCash: $netChangeInCash, dividendsPaid: $dividendsPaid, capex: $capex, freeCashFlow: $freeCashFlow, basis: $basis, source: $source, filedOn: $filedOn)';
}


}

/// @nodoc
abstract mixin class _$FinancialPeriodCopyWith<$Res> implements $FinancialPeriodCopyWith<$Res> {
  factory _$FinancialPeriodCopyWith(_FinancialPeriod value, $Res Function(_FinancialPeriod) _then) = __$FinancialPeriodCopyWithImpl;
@override @useResult
$Res call({
 String period, double? revenue,@JsonKey(name: 'gross_profit') double? grossProfit,@JsonKey(name: 'operating_income') double? operatingIncome,@JsonKey(name: 'net_income') double? netIncome, double? assets, double? liabilities, double? equity, double? cash, double? debt,@JsonKey(name: 'operating_cash_flow') double? operatingCashFlow,@JsonKey(name: 'investing_cash_flow') double? investingCashFlow,@JsonKey(name: 'financing_cash_flow') double? financingCashFlow,@JsonKey(name: 'net_change_in_cash') double? netChangeInCash,@JsonKey(name: 'dividends_paid') double? dividendsPaid, double? capex,@JsonKey(name: 'free_cash_flow') double? freeCashFlow, String? basis, String? source,@JsonKey(name: 'filed_on') String? filedOn
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
@override @pragma('vm:prefer-inline') $Res call({Object? period = null,Object? revenue = freezed,Object? grossProfit = freezed,Object? operatingIncome = freezed,Object? netIncome = freezed,Object? assets = freezed,Object? liabilities = freezed,Object? equity = freezed,Object? cash = freezed,Object? debt = freezed,Object? operatingCashFlow = freezed,Object? investingCashFlow = freezed,Object? financingCashFlow = freezed,Object? netChangeInCash = freezed,Object? dividendsPaid = freezed,Object? capex = freezed,Object? freeCashFlow = freezed,Object? basis = freezed,Object? source = freezed,Object? filedOn = freezed,}) {
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
as double?,operatingCashFlow: freezed == operatingCashFlow ? _self.operatingCashFlow : operatingCashFlow // ignore: cast_nullable_to_non_nullable
as double?,investingCashFlow: freezed == investingCashFlow ? _self.investingCashFlow : investingCashFlow // ignore: cast_nullable_to_non_nullable
as double?,financingCashFlow: freezed == financingCashFlow ? _self.financingCashFlow : financingCashFlow // ignore: cast_nullable_to_non_nullable
as double?,netChangeInCash: freezed == netChangeInCash ? _self.netChangeInCash : netChangeInCash // ignore: cast_nullable_to_non_nullable
as double?,dividendsPaid: freezed == dividendsPaid ? _self.dividendsPaid : dividendsPaid // ignore: cast_nullable_to_non_nullable
as double?,capex: freezed == capex ? _self.capex : capex // ignore: cast_nullable_to_non_nullable
as double?,freeCashFlow: freezed == freeCashFlow ? _self.freeCashFlow : freeCashFlow // ignore: cast_nullable_to_non_nullable
as double?,basis: freezed == basis ? _self.basis : basis // ignore: cast_nullable_to_non_nullable
as String?,source: freezed == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
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
