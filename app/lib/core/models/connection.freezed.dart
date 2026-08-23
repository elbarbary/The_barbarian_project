// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'connection.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ConnectionDoc {

@JsonKey(name: 'window_days') int get windowDays; double get threshold; List<Connection> get items;
/// Create a copy of ConnectionDoc
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ConnectionDocCopyWith<ConnectionDoc> get copyWith => _$ConnectionDocCopyWithImpl<ConnectionDoc>(this as ConnectionDoc, _$identity);

  /// Serializes this ConnectionDoc to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ConnectionDoc&&(identical(other.windowDays, windowDays) || other.windowDays == windowDays)&&(identical(other.threshold, threshold) || other.threshold == threshold)&&const DeepCollectionEquality().equals(other.items, items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,windowDays,threshold,const DeepCollectionEquality().hash(items));

@override
String toString() {
  return 'ConnectionDoc(windowDays: $windowDays, threshold: $threshold, items: $items)';
}


}

/// @nodoc
abstract mixin class $ConnectionDocCopyWith<$Res>  {
  factory $ConnectionDocCopyWith(ConnectionDoc value, $Res Function(ConnectionDoc) _then) = _$ConnectionDocCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'window_days') int windowDays, double threshold, List<Connection> items
});




}
/// @nodoc
class _$ConnectionDocCopyWithImpl<$Res>
    implements $ConnectionDocCopyWith<$Res> {
  _$ConnectionDocCopyWithImpl(this._self, this._then);

  final ConnectionDoc _self;
  final $Res Function(ConnectionDoc) _then;

/// Create a copy of ConnectionDoc
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? windowDays = null,Object? threshold = null,Object? items = null,}) {
  return _then(_self.copyWith(
windowDays: null == windowDays ? _self.windowDays : windowDays // ignore: cast_nullable_to_non_nullable
as int,threshold: null == threshold ? _self.threshold : threshold // ignore: cast_nullable_to_non_nullable
as double,items: null == items ? _self.items : items // ignore: cast_nullable_to_non_nullable
as List<Connection>,
  ));
}

}


/// Adds pattern-matching-related methods to [ConnectionDoc].
extension ConnectionDocPatterns on ConnectionDoc {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ConnectionDoc value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ConnectionDoc() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ConnectionDoc value)  $default,){
final _that = this;
switch (_that) {
case _ConnectionDoc():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ConnectionDoc value)?  $default,){
final _that = this;
switch (_that) {
case _ConnectionDoc() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'window_days')  int windowDays,  double threshold,  List<Connection> items)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ConnectionDoc() when $default != null:
return $default(_that.windowDays,_that.threshold,_that.items);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'window_days')  int windowDays,  double threshold,  List<Connection> items)  $default,) {final _that = this;
switch (_that) {
case _ConnectionDoc():
return $default(_that.windowDays,_that.threshold,_that.items);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'window_days')  int windowDays,  double threshold,  List<Connection> items)?  $default,) {final _that = this;
switch (_that) {
case _ConnectionDoc() when $default != null:
return $default(_that.windowDays,_that.threshold,_that.items);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ConnectionDoc implements ConnectionDoc {
  const _ConnectionDoc({@JsonKey(name: 'window_days') this.windowDays = 4, this.threshold = 2.0, final  List<Connection> items = const <Connection>[]}): _items = items;
  factory _ConnectionDoc.fromJson(Map<String, dynamic> json) => _$ConnectionDocFromJson(json);

@override@JsonKey(name: 'window_days') final  int windowDays;
@override@JsonKey() final  double threshold;
 final  List<Connection> _items;
@override@JsonKey() List<Connection> get items {
  if (_items is EqualUnmodifiableListView) return _items;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_items);
}


/// Create a copy of ConnectionDoc
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ConnectionDocCopyWith<_ConnectionDoc> get copyWith => __$ConnectionDocCopyWithImpl<_ConnectionDoc>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ConnectionDocToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ConnectionDoc&&(identical(other.windowDays, windowDays) || other.windowDays == windowDays)&&(identical(other.threshold, threshold) || other.threshold == threshold)&&const DeepCollectionEquality().equals(other._items, _items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,windowDays,threshold,const DeepCollectionEquality().hash(_items));

@override
String toString() {
  return 'ConnectionDoc(windowDays: $windowDays, threshold: $threshold, items: $items)';
}


}

/// @nodoc
abstract mixin class _$ConnectionDocCopyWith<$Res> implements $ConnectionDocCopyWith<$Res> {
  factory _$ConnectionDocCopyWith(_ConnectionDoc value, $Res Function(_ConnectionDoc) _then) = __$ConnectionDocCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'window_days') int windowDays, double threshold, List<Connection> items
});




}
/// @nodoc
class __$ConnectionDocCopyWithImpl<$Res>
    implements _$ConnectionDocCopyWith<$Res> {
  __$ConnectionDocCopyWithImpl(this._self, this._then);

  final _ConnectionDoc _self;
  final $Res Function(_ConnectionDoc) _then;

/// Create a copy of ConnectionDoc
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? windowDays = null,Object? threshold = null,Object? items = null,}) {
  return _then(_ConnectionDoc(
windowDays: null == windowDays ? _self.windowDays : windowDays // ignore: cast_nullable_to_non_nullable
as int,threshold: null == threshold ? _self.threshold : threshold // ignore: cast_nullable_to_non_nullable
as double,items: null == items ? _self._items : items // ignore: cast_nullable_to_non_nullable
as List<Connection>,
  ));
}


}


/// @nodoc
mixin _$Connection {

 String get ticker;/// Which kinds crossed — `filing`, `news`, `session`. Two or more, always;
/// one kind is not a crossing, it is whichever feed it came from.
 List<String> get kinds;/// The published facts, joined by "and" and stopping there. Written at
/// build time from fixed templates and refused if they ever read as an
/// instruction (§8).
 String get why;@JsonKey(name: 'why_ar') String get whyAr;/// What the documents have in common, as counts over the filings feed —
/// "Eight companies filed an insider dealing form that day."
///
/// This is the part that makes a card about one company a fact about the
/// day. Absent where there is nothing countable to say, which is honest:
/// a card that always has a second sentence teaches a reader to skip it.
 String? get insight;@JsonKey(name: 'insight_ar') String? get insightAr;/// The company's own name, which the card never showed — it showed four
/// letters. 266 of 280 companies carry an Arabic one.
 String? get name;@JsonKey(name: 'name_ar') String? get nameAr; String? get sector;/// The filing type every filing in the window shared, where they shared
/// one. Null when a company filed two different kinds of thing.
 String? get event;@JsonKey(name: 'event_label') String? get eventLabel;@JsonKey(name: 'event_label_ar') String? get eventLabelAr;/// The other companies that filed the same kind of thing on the same day.
 List<String> get peers;/// How many of those share this company's sector, when it is more than
/// one. Zero rather than one, because "one of them is in the same sector"
/// is a sentence about this company and says nothing.
@JsonKey(name: 'same_sector') int get sameSector; double? get ratio;@JsonKey(name: 'change_percent') double? get changePercent; List<Strand> get strands;
/// Create a copy of Connection
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ConnectionCopyWith<Connection> get copyWith => _$ConnectionCopyWithImpl<Connection>(this as Connection, _$identity);

  /// Serializes this Connection to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Connection&&(identical(other.ticker, ticker) || other.ticker == ticker)&&const DeepCollectionEquality().equals(other.kinds, kinds)&&(identical(other.why, why) || other.why == why)&&(identical(other.whyAr, whyAr) || other.whyAr == whyAr)&&(identical(other.insight, insight) || other.insight == insight)&&(identical(other.insightAr, insightAr) || other.insightAr == insightAr)&&(identical(other.name, name) || other.name == name)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.event, event) || other.event == event)&&(identical(other.eventLabel, eventLabel) || other.eventLabel == eventLabel)&&(identical(other.eventLabelAr, eventLabelAr) || other.eventLabelAr == eventLabelAr)&&const DeepCollectionEquality().equals(other.peers, peers)&&(identical(other.sameSector, sameSector) || other.sameSector == sameSector)&&(identical(other.ratio, ratio) || other.ratio == ratio)&&(identical(other.changePercent, changePercent) || other.changePercent == changePercent)&&const DeepCollectionEquality().equals(other.strands, strands));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,const DeepCollectionEquality().hash(kinds),why,whyAr,insight,insightAr,name,nameAr,sector,event,eventLabel,eventLabelAr,const DeepCollectionEquality().hash(peers),sameSector,ratio,changePercent,const DeepCollectionEquality().hash(strands));

@override
String toString() {
  return 'Connection(ticker: $ticker, kinds: $kinds, why: $why, whyAr: $whyAr, insight: $insight, insightAr: $insightAr, name: $name, nameAr: $nameAr, sector: $sector, event: $event, eventLabel: $eventLabel, eventLabelAr: $eventLabelAr, peers: $peers, sameSector: $sameSector, ratio: $ratio, changePercent: $changePercent, strands: $strands)';
}


}

/// @nodoc
abstract mixin class $ConnectionCopyWith<$Res>  {
  factory $ConnectionCopyWith(Connection value, $Res Function(Connection) _then) = _$ConnectionCopyWithImpl;
@useResult
$Res call({
 String ticker, List<String> kinds, String why,@JsonKey(name: 'why_ar') String whyAr, String? insight,@JsonKey(name: 'insight_ar') String? insightAr, String? name,@JsonKey(name: 'name_ar') String? nameAr, String? sector, String? event,@JsonKey(name: 'event_label') String? eventLabel,@JsonKey(name: 'event_label_ar') String? eventLabelAr, List<String> peers,@JsonKey(name: 'same_sector') int sameSector, double? ratio,@JsonKey(name: 'change_percent') double? changePercent, List<Strand> strands
});




}
/// @nodoc
class _$ConnectionCopyWithImpl<$Res>
    implements $ConnectionCopyWith<$Res> {
  _$ConnectionCopyWithImpl(this._self, this._then);

  final Connection _self;
  final $Res Function(Connection) _then;

/// Create a copy of Connection
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ticker = null,Object? kinds = null,Object? why = null,Object? whyAr = null,Object? insight = freezed,Object? insightAr = freezed,Object? name = freezed,Object? nameAr = freezed,Object? sector = freezed,Object? event = freezed,Object? eventLabel = freezed,Object? eventLabelAr = freezed,Object? peers = null,Object? sameSector = null,Object? ratio = freezed,Object? changePercent = freezed,Object? strands = null,}) {
  return _then(_self.copyWith(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,kinds: null == kinds ? _self.kinds : kinds // ignore: cast_nullable_to_non_nullable
as List<String>,why: null == why ? _self.why : why // ignore: cast_nullable_to_non_nullable
as String,whyAr: null == whyAr ? _self.whyAr : whyAr // ignore: cast_nullable_to_non_nullable
as String,insight: freezed == insight ? _self.insight : insight // ignore: cast_nullable_to_non_nullable
as String?,insightAr: freezed == insightAr ? _self.insightAr : insightAr // ignore: cast_nullable_to_non_nullable
as String?,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,nameAr: freezed == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String?,sector: freezed == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String?,event: freezed == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as String?,eventLabel: freezed == eventLabel ? _self.eventLabel : eventLabel // ignore: cast_nullable_to_non_nullable
as String?,eventLabelAr: freezed == eventLabelAr ? _self.eventLabelAr : eventLabelAr // ignore: cast_nullable_to_non_nullable
as String?,peers: null == peers ? _self.peers : peers // ignore: cast_nullable_to_non_nullable
as List<String>,sameSector: null == sameSector ? _self.sameSector : sameSector // ignore: cast_nullable_to_non_nullable
as int,ratio: freezed == ratio ? _self.ratio : ratio // ignore: cast_nullable_to_non_nullable
as double?,changePercent: freezed == changePercent ? _self.changePercent : changePercent // ignore: cast_nullable_to_non_nullable
as double?,strands: null == strands ? _self.strands : strands // ignore: cast_nullable_to_non_nullable
as List<Strand>,
  ));
}

}


/// Adds pattern-matching-related methods to [Connection].
extension ConnectionPatterns on Connection {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Connection value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Connection() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Connection value)  $default,){
final _that = this;
switch (_that) {
case _Connection():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Connection value)?  $default,){
final _that = this;
switch (_that) {
case _Connection() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String ticker,  List<String> kinds,  String why, @JsonKey(name: 'why_ar')  String whyAr,  String? insight, @JsonKey(name: 'insight_ar')  String? insightAr,  String? name, @JsonKey(name: 'name_ar')  String? nameAr,  String? sector,  String? event, @JsonKey(name: 'event_label')  String? eventLabel, @JsonKey(name: 'event_label_ar')  String? eventLabelAr,  List<String> peers, @JsonKey(name: 'same_sector')  int sameSector,  double? ratio, @JsonKey(name: 'change_percent')  double? changePercent,  List<Strand> strands)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Connection() when $default != null:
return $default(_that.ticker,_that.kinds,_that.why,_that.whyAr,_that.insight,_that.insightAr,_that.name,_that.nameAr,_that.sector,_that.event,_that.eventLabel,_that.eventLabelAr,_that.peers,_that.sameSector,_that.ratio,_that.changePercent,_that.strands);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String ticker,  List<String> kinds,  String why, @JsonKey(name: 'why_ar')  String whyAr,  String? insight, @JsonKey(name: 'insight_ar')  String? insightAr,  String? name, @JsonKey(name: 'name_ar')  String? nameAr,  String? sector,  String? event, @JsonKey(name: 'event_label')  String? eventLabel, @JsonKey(name: 'event_label_ar')  String? eventLabelAr,  List<String> peers, @JsonKey(name: 'same_sector')  int sameSector,  double? ratio, @JsonKey(name: 'change_percent')  double? changePercent,  List<Strand> strands)  $default,) {final _that = this;
switch (_that) {
case _Connection():
return $default(_that.ticker,_that.kinds,_that.why,_that.whyAr,_that.insight,_that.insightAr,_that.name,_that.nameAr,_that.sector,_that.event,_that.eventLabel,_that.eventLabelAr,_that.peers,_that.sameSector,_that.ratio,_that.changePercent,_that.strands);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String ticker,  List<String> kinds,  String why, @JsonKey(name: 'why_ar')  String whyAr,  String? insight, @JsonKey(name: 'insight_ar')  String? insightAr,  String? name, @JsonKey(name: 'name_ar')  String? nameAr,  String? sector,  String? event, @JsonKey(name: 'event_label')  String? eventLabel, @JsonKey(name: 'event_label_ar')  String? eventLabelAr,  List<String> peers, @JsonKey(name: 'same_sector')  int sameSector,  double? ratio, @JsonKey(name: 'change_percent')  double? changePercent,  List<Strand> strands)?  $default,) {final _that = this;
switch (_that) {
case _Connection() when $default != null:
return $default(_that.ticker,_that.kinds,_that.why,_that.whyAr,_that.insight,_that.insightAr,_that.name,_that.nameAr,_that.sector,_that.event,_that.eventLabel,_that.eventLabelAr,_that.peers,_that.sameSector,_that.ratio,_that.changePercent,_that.strands);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Connection extends Connection {
  const _Connection({this.ticker = '', final  List<String> kinds = const <String>[], this.why = '', @JsonKey(name: 'why_ar') this.whyAr = '', this.insight, @JsonKey(name: 'insight_ar') this.insightAr, this.name, @JsonKey(name: 'name_ar') this.nameAr, this.sector, this.event, @JsonKey(name: 'event_label') this.eventLabel, @JsonKey(name: 'event_label_ar') this.eventLabelAr, final  List<String> peers = const <String>[], @JsonKey(name: 'same_sector') this.sameSector = 0, this.ratio, @JsonKey(name: 'change_percent') this.changePercent, final  List<Strand> strands = const <Strand>[]}): _kinds = kinds,_peers = peers,_strands = strands,super._();
  factory _Connection.fromJson(Map<String, dynamic> json) => _$ConnectionFromJson(json);

@override@JsonKey() final  String ticker;
/// Which kinds crossed — `filing`, `news`, `session`. Two or more, always;
/// one kind is not a crossing, it is whichever feed it came from.
 final  List<String> _kinds;
/// Which kinds crossed — `filing`, `news`, `session`. Two or more, always;
/// one kind is not a crossing, it is whichever feed it came from.
@override@JsonKey() List<String> get kinds {
  if (_kinds is EqualUnmodifiableListView) return _kinds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_kinds);
}

/// The published facts, joined by "and" and stopping there. Written at
/// build time from fixed templates and refused if they ever read as an
/// instruction (§8).
@override@JsonKey() final  String why;
@override@JsonKey(name: 'why_ar') final  String whyAr;
/// What the documents have in common, as counts over the filings feed —
/// "Eight companies filed an insider dealing form that day."
///
/// This is the part that makes a card about one company a fact about the
/// day. Absent where there is nothing countable to say, which is honest:
/// a card that always has a second sentence teaches a reader to skip it.
@override final  String? insight;
@override@JsonKey(name: 'insight_ar') final  String? insightAr;
/// The company's own name, which the card never showed — it showed four
/// letters. 266 of 280 companies carry an Arabic one.
@override final  String? name;
@override@JsonKey(name: 'name_ar') final  String? nameAr;
@override final  String? sector;
/// The filing type every filing in the window shared, where they shared
/// one. Null when a company filed two different kinds of thing.
@override final  String? event;
@override@JsonKey(name: 'event_label') final  String? eventLabel;
@override@JsonKey(name: 'event_label_ar') final  String? eventLabelAr;
/// The other companies that filed the same kind of thing on the same day.
 final  List<String> _peers;
/// The other companies that filed the same kind of thing on the same day.
@override@JsonKey() List<String> get peers {
  if (_peers is EqualUnmodifiableListView) return _peers;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_peers);
}

/// How many of those share this company's sector, when it is more than
/// one. Zero rather than one, because "one of them is in the same sector"
/// is a sentence about this company and says nothing.
@override@JsonKey(name: 'same_sector') final  int sameSector;
@override final  double? ratio;
@override@JsonKey(name: 'change_percent') final  double? changePercent;
 final  List<Strand> _strands;
@override@JsonKey() List<Strand> get strands {
  if (_strands is EqualUnmodifiableListView) return _strands;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_strands);
}


/// Create a copy of Connection
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ConnectionCopyWith<_Connection> get copyWith => __$ConnectionCopyWithImpl<_Connection>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ConnectionToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Connection&&(identical(other.ticker, ticker) || other.ticker == ticker)&&const DeepCollectionEquality().equals(other._kinds, _kinds)&&(identical(other.why, why) || other.why == why)&&(identical(other.whyAr, whyAr) || other.whyAr == whyAr)&&(identical(other.insight, insight) || other.insight == insight)&&(identical(other.insightAr, insightAr) || other.insightAr == insightAr)&&(identical(other.name, name) || other.name == name)&&(identical(other.nameAr, nameAr) || other.nameAr == nameAr)&&(identical(other.sector, sector) || other.sector == sector)&&(identical(other.event, event) || other.event == event)&&(identical(other.eventLabel, eventLabel) || other.eventLabel == eventLabel)&&(identical(other.eventLabelAr, eventLabelAr) || other.eventLabelAr == eventLabelAr)&&const DeepCollectionEquality().equals(other._peers, _peers)&&(identical(other.sameSector, sameSector) || other.sameSector == sameSector)&&(identical(other.ratio, ratio) || other.ratio == ratio)&&(identical(other.changePercent, changePercent) || other.changePercent == changePercent)&&const DeepCollectionEquality().equals(other._strands, _strands));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ticker,const DeepCollectionEquality().hash(_kinds),why,whyAr,insight,insightAr,name,nameAr,sector,event,eventLabel,eventLabelAr,const DeepCollectionEquality().hash(_peers),sameSector,ratio,changePercent,const DeepCollectionEquality().hash(_strands));

@override
String toString() {
  return 'Connection(ticker: $ticker, kinds: $kinds, why: $why, whyAr: $whyAr, insight: $insight, insightAr: $insightAr, name: $name, nameAr: $nameAr, sector: $sector, event: $event, eventLabel: $eventLabel, eventLabelAr: $eventLabelAr, peers: $peers, sameSector: $sameSector, ratio: $ratio, changePercent: $changePercent, strands: $strands)';
}


}

/// @nodoc
abstract mixin class _$ConnectionCopyWith<$Res> implements $ConnectionCopyWith<$Res> {
  factory _$ConnectionCopyWith(_Connection value, $Res Function(_Connection) _then) = __$ConnectionCopyWithImpl;
@override @useResult
$Res call({
 String ticker, List<String> kinds, String why,@JsonKey(name: 'why_ar') String whyAr, String? insight,@JsonKey(name: 'insight_ar') String? insightAr, String? name,@JsonKey(name: 'name_ar') String? nameAr, String? sector, String? event,@JsonKey(name: 'event_label') String? eventLabel,@JsonKey(name: 'event_label_ar') String? eventLabelAr, List<String> peers,@JsonKey(name: 'same_sector') int sameSector, double? ratio,@JsonKey(name: 'change_percent') double? changePercent, List<Strand> strands
});




}
/// @nodoc
class __$ConnectionCopyWithImpl<$Res>
    implements _$ConnectionCopyWith<$Res> {
  __$ConnectionCopyWithImpl(this._self, this._then);

  final _Connection _self;
  final $Res Function(_Connection) _then;

/// Create a copy of Connection
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ticker = null,Object? kinds = null,Object? why = null,Object? whyAr = null,Object? insight = freezed,Object? insightAr = freezed,Object? name = freezed,Object? nameAr = freezed,Object? sector = freezed,Object? event = freezed,Object? eventLabel = freezed,Object? eventLabelAr = freezed,Object? peers = null,Object? sameSector = null,Object? ratio = freezed,Object? changePercent = freezed,Object? strands = null,}) {
  return _then(_Connection(
ticker: null == ticker ? _self.ticker : ticker // ignore: cast_nullable_to_non_nullable
as String,kinds: null == kinds ? _self._kinds : kinds // ignore: cast_nullable_to_non_nullable
as List<String>,why: null == why ? _self.why : why // ignore: cast_nullable_to_non_nullable
as String,whyAr: null == whyAr ? _self.whyAr : whyAr // ignore: cast_nullable_to_non_nullable
as String,insight: freezed == insight ? _self.insight : insight // ignore: cast_nullable_to_non_nullable
as String?,insightAr: freezed == insightAr ? _self.insightAr : insightAr // ignore: cast_nullable_to_non_nullable
as String?,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,nameAr: freezed == nameAr ? _self.nameAr : nameAr // ignore: cast_nullable_to_non_nullable
as String?,sector: freezed == sector ? _self.sector : sector // ignore: cast_nullable_to_non_nullable
as String?,event: freezed == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as String?,eventLabel: freezed == eventLabel ? _self.eventLabel : eventLabel // ignore: cast_nullable_to_non_nullable
as String?,eventLabelAr: freezed == eventLabelAr ? _self.eventLabelAr : eventLabelAr // ignore: cast_nullable_to_non_nullable
as String?,peers: null == peers ? _self._peers : peers // ignore: cast_nullable_to_non_nullable
as List<String>,sameSector: null == sameSector ? _self.sameSector : sameSector // ignore: cast_nullable_to_non_nullable
as int,ratio: freezed == ratio ? _self.ratio : ratio // ignore: cast_nullable_to_non_nullable
as double?,changePercent: freezed == changePercent ? _self.changePercent : changePercent // ignore: cast_nullable_to_non_nullable
as double?,strands: null == strands ? _self._strands : strands // ignore: cast_nullable_to_non_nullable
as List<Strand>,
  ));
}


}


/// @nodoc
mixin _$Strand {

 String get kind; String get id; String get date; String get title;@JsonKey(name: 'title_ar') String get titleAr; String get link; double? get ratio;@JsonKey(name: 'change_percent') double? get changePercent;
/// Create a copy of Strand
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StrandCopyWith<Strand> get copyWith => _$StrandCopyWithImpl<Strand>(this as Strand, _$identity);

  /// Serializes this Strand to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Strand&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.id, id) || other.id == id)&&(identical(other.date, date) || other.date == date)&&(identical(other.title, title) || other.title == title)&&(identical(other.titleAr, titleAr) || other.titleAr == titleAr)&&(identical(other.link, link) || other.link == link)&&(identical(other.ratio, ratio) || other.ratio == ratio)&&(identical(other.changePercent, changePercent) || other.changePercent == changePercent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,kind,id,date,title,titleAr,link,ratio,changePercent);

@override
String toString() {
  return 'Strand(kind: $kind, id: $id, date: $date, title: $title, titleAr: $titleAr, link: $link, ratio: $ratio, changePercent: $changePercent)';
}


}

/// @nodoc
abstract mixin class $StrandCopyWith<$Res>  {
  factory $StrandCopyWith(Strand value, $Res Function(Strand) _then) = _$StrandCopyWithImpl;
@useResult
$Res call({
 String kind, String id, String date, String title,@JsonKey(name: 'title_ar') String titleAr, String link, double? ratio,@JsonKey(name: 'change_percent') double? changePercent
});




}
/// @nodoc
class _$StrandCopyWithImpl<$Res>
    implements $StrandCopyWith<$Res> {
  _$StrandCopyWithImpl(this._self, this._then);

  final Strand _self;
  final $Res Function(Strand) _then;

/// Create a copy of Strand
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? kind = null,Object? id = null,Object? date = null,Object? title = null,Object? titleAr = null,Object? link = null,Object? ratio = freezed,Object? changePercent = freezed,}) {
  return _then(_self.copyWith(
kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,titleAr: null == titleAr ? _self.titleAr : titleAr // ignore: cast_nullable_to_non_nullable
as String,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,ratio: freezed == ratio ? _self.ratio : ratio // ignore: cast_nullable_to_non_nullable
as double?,changePercent: freezed == changePercent ? _self.changePercent : changePercent // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [Strand].
extension StrandPatterns on Strand {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Strand value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Strand() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Strand value)  $default,){
final _that = this;
switch (_that) {
case _Strand():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Strand value)?  $default,){
final _that = this;
switch (_that) {
case _Strand() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String kind,  String id,  String date,  String title, @JsonKey(name: 'title_ar')  String titleAr,  String link,  double? ratio, @JsonKey(name: 'change_percent')  double? changePercent)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Strand() when $default != null:
return $default(_that.kind,_that.id,_that.date,_that.title,_that.titleAr,_that.link,_that.ratio,_that.changePercent);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String kind,  String id,  String date,  String title, @JsonKey(name: 'title_ar')  String titleAr,  String link,  double? ratio, @JsonKey(name: 'change_percent')  double? changePercent)  $default,) {final _that = this;
switch (_that) {
case _Strand():
return $default(_that.kind,_that.id,_that.date,_that.title,_that.titleAr,_that.link,_that.ratio,_that.changePercent);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String kind,  String id,  String date,  String title, @JsonKey(name: 'title_ar')  String titleAr,  String link,  double? ratio, @JsonKey(name: 'change_percent')  double? changePercent)?  $default,) {final _that = this;
switch (_that) {
case _Strand() when $default != null:
return $default(_that.kind,_that.id,_that.date,_that.title,_that.titleAr,_that.link,_that.ratio,_that.changePercent);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Strand extends Strand {
  const _Strand({this.kind = '', this.id = '', this.date = '', this.title = '', @JsonKey(name: 'title_ar') this.titleAr = '', this.link = '', this.ratio, @JsonKey(name: 'change_percent') this.changePercent}): super._();
  factory _Strand.fromJson(Map<String, dynamic> json) => _$StrandFromJson(json);

@override@JsonKey() final  String kind;
@override@JsonKey() final  String id;
@override@JsonKey() final  String date;
@override@JsonKey() final  String title;
@override@JsonKey(name: 'title_ar') final  String titleAr;
@override@JsonKey() final  String link;
@override final  double? ratio;
@override@JsonKey(name: 'change_percent') final  double? changePercent;

/// Create a copy of Strand
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StrandCopyWith<_Strand> get copyWith => __$StrandCopyWithImpl<_Strand>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StrandToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Strand&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.id, id) || other.id == id)&&(identical(other.date, date) || other.date == date)&&(identical(other.title, title) || other.title == title)&&(identical(other.titleAr, titleAr) || other.titleAr == titleAr)&&(identical(other.link, link) || other.link == link)&&(identical(other.ratio, ratio) || other.ratio == ratio)&&(identical(other.changePercent, changePercent) || other.changePercent == changePercent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,kind,id,date,title,titleAr,link,ratio,changePercent);

@override
String toString() {
  return 'Strand(kind: $kind, id: $id, date: $date, title: $title, titleAr: $titleAr, link: $link, ratio: $ratio, changePercent: $changePercent)';
}


}

/// @nodoc
abstract mixin class _$StrandCopyWith<$Res> implements $StrandCopyWith<$Res> {
  factory _$StrandCopyWith(_Strand value, $Res Function(_Strand) _then) = __$StrandCopyWithImpl;
@override @useResult
$Res call({
 String kind, String id, String date, String title,@JsonKey(name: 'title_ar') String titleAr, String link, double? ratio,@JsonKey(name: 'change_percent') double? changePercent
});




}
/// @nodoc
class __$StrandCopyWithImpl<$Res>
    implements _$StrandCopyWith<$Res> {
  __$StrandCopyWithImpl(this._self, this._then);

  final _Strand _self;
  final $Res Function(_Strand) _then;

/// Create a copy of Strand
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? kind = null,Object? id = null,Object? date = null,Object? title = null,Object? titleAr = null,Object? link = null,Object? ratio = freezed,Object? changePercent = freezed,}) {
  return _then(_Strand(
kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,titleAr: null == titleAr ? _self.titleAr : titleAr // ignore: cast_nullable_to_non_nullable
as String,link: null == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String,ratio: freezed == ratio ? _self.ratio : ratio // ignore: cast_nullable_to_non_nullable
as double?,changePercent: freezed == changePercent ? _self.changePercent : changePercent // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}

// dart format on
