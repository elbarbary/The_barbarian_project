import 'package:freezed_annotation/freezed_annotation.dart';

part 'cash_or_trash.freezed.dart';
part 'cash_or_trash.g.dart';

/// The Cash or Trash leaderboard (spec §9).
@freezed
abstract class CashOrTrashIndex with _$CashOrTrashIndex {
  const factory CashOrTrashIndex({
    @JsonKey(name: 'updated_at') String? updatedAt,
    @Default(0) int studied,
    @Default(0) int total,
    @Default(<CashOrTrashEntry>[]) List<CashOrTrashEntry> companies,
  }) = _CashOrTrashIndex;

  const CashOrTrashIndex._();

  factory CashOrTrashIndex.fromJson(Map<String, dynamic> json) =>
      _$CashOrTrashIndexFromJson(json);

  static const CashOrTrashIndex empty = CashOrTrashIndex();

  bool get isEmpty => companies.isEmpty;

  /// The screen header reads "6 / 224 investigated". Derive the numerator from
  /// the list so the header can never claim more studies than it can show.
  int get studiedCount => companies.isNotEmpty ? companies.length : studied;

  CashOrTrashEntry? byTicker(String ticker) {
    for (final c in companies) {
      if (c.ticker == ticker) return c;
    }
    return null;
  }

  List<CashOrTrashEntry> withVerdict(Verdict verdict) =>
      companies.where((c) => c.verdict == verdict).toList();

  /// Verdicts present in the data, in Cash-to-Toxic order, so a filter row only
  /// ever offers bands that actually contain something.
  List<Verdict> get presentVerdicts {
    final present = companies.map((c) => c.verdict).toSet();
    return Verdict.values.where(present.contains).toList();
  }
}

/// One studied company.
///
/// [score] is **signed**. The six pillars each run roughly −10..+10, so the
/// total runs −60..+60: KWIN scored −50, CIRA −1, GBCO −6, MCQE +20. The
/// design canvas mocked a 0..100 gauge, which would misstate published
/// research, so the gauge is driven from this signed range with zero at centre.
@freezed
abstract class CashOrTrashEntry with _$CashOrTrashEntry {
  const factory CashOrTrashEntry({
    required String ticker,
    required String name,
    @Default(0) int score,
    @Default('recyclable') String verdictId,
    String? summary,
    @JsonKey(name: 'article_url') String? articleUrl,
    @JsonKey(name: 'studied_at') String? studiedAt,
    @Default(<String>[]) List<String> flags,
    @Default(<PillarScore>[]) List<PillarScore> pillars,
  }) = _CashOrTrashEntry;

  const CashOrTrashEntry._();

  factory CashOrTrashEntry.fromJson(Map<String, dynamic> json) =>
      _$CashOrTrashEntryFromJson(json);

  static const int minScore = -60;
  static const int maxScore = 60;

  Verdict get verdict => Verdict.parse(verdictId);

  bool get hasArticle => (articleUrl ?? '').isNotEmpty;

  /// Position on the Trash→Cash axis as 0..1, with an unscored company sitting
  /// exactly at the centre.
  double get gaugeFraction {
    const span = maxScore - minScore;
    final f = (score - minScore) / span;
    return f.clamp(0.0, 1.0);
  }
}

/// One of the six pillars (spec §9).
@freezed
abstract class PillarScore with _$PillarScore {
  const factory PillarScore({
    required String pillar,
    required int score,
    String? basis,
  }) = _PillarScore;

  const PillarScore._();

  factory PillarScore.fromJson(Map<String, dynamic> json) =>
      _$PillarScoreFromJson(json);

  static const List<String> canonicalOrder = [
    'Valuation',
    'Earnings quality',
    'Growth',
    'Balance sheet',
    'Tradability',
    'Governance',
  ];
}

/// The five verdict bands (spec §9), ordered best to worst.
///
/// Each carries a word and a mark so the verdict is never communicated by
/// colour alone (spec §42).
/// The five bands, named for **what the scorecard did** — never for what the
/// company is worth and never for an action (spec §8.2).
///
/// They used to be Cash · Loose change · Recyclable · Trash · Toxic, with a
/// money bag at one end and a skull at the other. Every one of those is a
/// verdict on a named issuer delivered in one word, and "Trash" is a sell call
/// in one word: there is no version of it that survives being read aloud in a
/// hearing. The publisher is not licensed by Egypt's FRA, so a public band on a
/// named issuer has to be a statement about the arithmetic or it is a rating.
///
/// What replaces them describes the ledger and nothing else. The subject of
/// every sentence below is *the pillars*, not the security. Price-versus-
/// filings language survives only inside the valuation pillar, where it is a
/// described relationship with its arithmetic attached — never as the headline
/// band (spec §8.2).
///
/// The wire values are unchanged: they are the published document's keys, not
/// words anybody reads.
enum Verdict {
  @JsonValue('cash')
  cash('cash', 'Nearly all positive', '＋＋',
      'Nearly all six pillars are positive.'),
  @JsonValue('loose_change')
  looseChange('loose_change', 'Mostly positive', '＋',
      'Most of the six pillars are positive.'),
  @JsonValue('recyclable')
  recyclable('recyclable', 'Balanced', '＝',
      'The six pillars are balanced.'),
  @JsonValue('trash')
  trash('trash', 'Mostly negative', '−',
      'Most of the six pillars are negative.'),
  @JsonValue('toxic')
  toxic('toxic', 'Nearly all negative', '−−',
      'Nearly all six pillars are negative.');

  const Verdict(this.id, this.label, this.mark, this.sentence);

  final String id;

  /// The short form, for a chip. Still about the pillars.
  final String label;

  /// A sign, not a symbol. The glyph carries the band for a reader who cannot
  /// use the colour (spec §42) without carrying a judgement: it states which
  /// way the ledger summed, which is a fact about the arithmetic.
  final String mark;

  /// The band written out, for anywhere with room for a sentence.
  final String sentence;

  static Verdict parse(String? raw) => switch (raw) {
    'cash' => Verdict.cash,
    'loose_change' => Verdict.looseChange,
    'recyclable' => Verdict.recyclable,
    'trash' => Verdict.trash,
    'toxic' => Verdict.toxic,
    _ => Verdict.recyclable,
  };
}
