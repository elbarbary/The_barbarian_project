import 'company.dart';

/// Whether you could get your money back out, and how long it would take.
///
/// The spec calls this the one thing no competitor in Egypt has built, and
/// today's research confirmed it: FoudaLens has order-book depth and uses it
/// for trading signals; nobody uses it to answer the question a person with
/// 50,000 pounds and a tip actually has.
///
/// Everything here is arithmetic over published fields, and every assumption
/// is stated where the number is. Two rules shape it:
///
///  * **The ladder is fixed** — 10k, 50k, 250k, 1M — published and identical
///    for every reader (spec §8.7). No slider, no "enter your amount". The
///    moment it takes a user's position it becomes advice about that position,
///    and it stores nothing because it is never told anything.
///  * **It answers, it never advises.** "A quarter of a normal day's trading"
///    is a fact. "Too illiquid for you" is a view on a security, and on a
///    reader, and is the sentence this app cannot write.
class ExitLiquidity {
  const ExitLiquidity({
    required this.ticker,
    required this.normalDailyValue,
    required this.sessions,
    required this.zeroVolumeDays,
    required this.thinDays,
    this.freeFloatPercent,
    this.lastTraded,
  });

  final String ticker;

  /// What changes hands on an ordinary day, in pounds.
  final double normalDailyValue;

  /// How many sessions the arithmetic below is drawn from.
  final int sessions;

  /// Sessions in that window where **nothing traded at all**. The most useful
  /// honest fact in the app: on those days there was no price at which a
  /// holder could sell, because there was nobody on the other side.
  final int zeroVolumeDays;

  /// Sessions where fewer than a thousand shares changed hands. Not zero, but
  /// far too few for a real position to leave through.
  final int thinDays;

  final double? freeFloatPercent;

  /// The last session that actually traded, when some did not.
  final String? lastTraded;

  /// The rungs, in pounds. Fixed, published, the same for everyone.
  static const List<int> ladder = [10000, 50000, 250000, 1000000];

  /// The share of a normal day's trading each rung would represent.
  ///
  /// Above roughly a tenth of a day, selling starts to move the price against
  /// the seller — that is the mechanism, not a rule of thumb we invented.
  double shareOfDay(int amount) =>
      normalDailyValue <= 0 ? double.infinity : amount / normalDailyValue;

  /// Sessions needed to sell a rung without being more than a fifth of the
  /// day's trading.
  ///
  /// A fifth is a stated, published assumption — not a market rule. It is
  /// shown beside every figure it produces so the reader can disagree with it.
  static const double participation = 0.20;

  double sessionsToSell(int amount) => normalDailyValue <= 0
      ? double.infinity
      : amount / (normalDailyValue * participation);

  /// True when the share simply stops trading on some days.
  bool get stops => zeroVolumeDays > 0;

  /// The wait, in units a person can hold.
  ///
  /// "59,239 sessions to sell" is arithmetically right and informationally
  /// useless — past a point the reader stops reading it as a duration. Above a
  /// year it converts to years, which is still only a unit change: the EGX
  /// trades about 250 sessions a year, so the division is as factual as the
  /// figure it replaces.
  static const int sessionsPerYear = 250;

  String waitFor(int amount) {
    final sessions = sessionsToSell(amount);
    if (!sessions.isFinite) return 'no published trading to measure';
    if (sessions <= 1) return 'about a day to sell';
    if (sessions < sessionsPerYear) return '${sessions.ceil()} sessions to sell';
    final years = sessions / sessionsPerYear;
    if (years < 10) return '${years.toStringAsFixed(1)} years of trading';
    return 'over ${(years / 10).floor() * 10} years of trading';
  }

  /// The plain sentence for a rung.
  String plainFor(int amount) {
    if (normalDailyValue <= 0) {
      return 'There is not enough published trading to work this out.';
    }
    final share = shareOfDay(amount);
    if (share >= 1) {
      return 'More than a whole normal day of trading in this share.';
    }
    final pct = (share * 100).round();
    if (pct < 1) return 'Under 1% of a normal day’s trading.';
    return '$pct% of a normal day’s trading.';
  }

  /// Built from published fields only; null when the series cannot support it.
  static ExitLiquidity? of(Company company) {
    final profile = company.profile ?? const {};
    final raw = profile['normal_value_30d'];
    final value = raw is num ? raw.toDouble() : null;

    final history = company.priceHistory
        .where((p) => p.volume != null)
        .toList();
    if (history.length < 20) return null;

    final window = history.length <= 60
        ? history
        : history.sublist(history.length - 60);
    final zero = window.where((p) => (p.volume ?? 0) == 0).length;
    final thin = window.where((p) => (p.volume ?? 0) < 1000).length;
    final traded = window.where((p) => (p.volume ?? 0) > 0).toList();

    final float = profile['free_float'];
    return ExitLiquidity(
      ticker: company.ticker,
      normalDailyValue: value ?? 0,
      sessions: window.length,
      zeroVolumeDays: zero,
      thinDays: thin,
      freeFloatPercent: float is num ? float.toDouble() * 100 : null,
      lastTraded: traded.isEmpty ? null : traded.last.date,
    );
  }
}
