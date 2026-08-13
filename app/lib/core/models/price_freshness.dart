import 'package:flutter/foundation.dart';

/// How old the prices on screen are, and how to say so.
///
/// Spec §49: the app must never present stale data as live. The prices here are
/// never live — the free feed the project can reach runs fifteen minutes behind
/// the tape — so the caption has two jobs, and both matter:
///
///   * say how far behind the exchange the number is ("15-min delayed"), and
///   * say how long ago the app last collected it ("updated 2 min ago").
///
/// Those are different quantities and reporting only one of them is misleading.
/// A price collected two minutes ago is still a fifteen-minute-old price.
@immutable
class PriceFreshness {
  const PriceFreshness({
    required this.kind,
    this.delay = Duration.zero,
    this.readAt,
    this.sessionDate,
    this.sessionOpen = false,
  });

  /// Nothing has loaded yet.
  const PriceFreshness.unknown() : this(kind: PriceFreshnessKind.unknown);

  /// The bundled snapshot, shown only in fixture builds.
  const PriceFreshness.sample() : this(kind: PriceFreshnessKind.sample);

  /// The daily publish, with no live feed reached.
  const PriceFreshness.published(String? date)
    : this(kind: PriceFreshnessKind.published, sessionDate: date);

  final PriceFreshnessKind kind;

  /// How far behind the exchange the feed itself is.
  final Duration delay;

  /// When the server collected the snapshot.
  ///
  /// Stored as an instant rather than an elapsed time so the caption can be
  /// rebuilt on a ticker and stay true. Holding a pre-computed `Duration` meant
  /// "updated just now" sat on screen unchanged until the next poll five
  /// minutes later — the one claim this class exists to prevent.
  final DateTime? readAt;

  /// How long ago the server collected the snapshot, as of this moment.
  Duration? get since {
    final at = readAt;
    if (at == null) return null;
    final elapsed = DateTime.now().difference(at);
    return elapsed.isNegative ? Duration.zero : elapsed;
  }

  /// Session the published closes belong to.
  final String? sessionDate;

  /// Whether the exchange was trading when the snapshot was taken.
  final bool sessionOpen;

  bool get isLive => kind == PriceFreshnessKind.live;

  /// The line shown under a price.
  String get caption => switch (kind) {
    PriceFreshnessKind.unknown => 'Prices loading',
    PriceFreshnessKind.sample => 'Sample data · not live prices',
    PriceFreshnessKind.published =>
      sessionDate == null ? 'Last close' : 'Last close · $sessionDate',
    // Outside trading hours a "delayed" quote is just the closing price, and
    // calling it delayed would imply a tape that is not running. Say what it is.
    PriceFreshnessKind.live when !sessionOpen =>
      sessionDate == null ? 'Market closed · last close' : 'Market closed · last close $sessionDate',
    PriceFreshnessKind.live => '$_delayLabel delayed · updated $_sinceLabel',
  };

  /// A short form for tight rows, where the delay still has to appear but the
  /// collection time does not fit.
  String get shortCaption => switch (kind) {
    PriceFreshnessKind.unknown => '',
    PriceFreshnessKind.sample => 'Sample',
    PriceFreshnessKind.published =>
      sessionDate == null ? 'Last close' : 'Last close · $sessionDate',
    PriceFreshnessKind.live when !sessionOpen => 'Market closed',
    PriceFreshnessKind.live => '$_delayLabel delayed',
  };

  String get _delayLabel {
    final minutes = delay.inMinutes;
    if (minutes <= 0) return 'Real-time';
    if (minutes < 60) return '$minutes-min';
    final hours = delay.inHours;
    return '$hours-hr';
  }

  String get _sinceLabel {
    final elapsed = since;
    if (elapsed == null) return 'just now';
    if (elapsed.inSeconds < 90) return 'just now';
    if (elapsed.inMinutes < 60) return '${elapsed.inMinutes} min ago';
    if (elapsed.inHours < 24) {
      return '${elapsed.inHours} hr${elapsed.inHours == 1 ? '' : 's'} ago';
    }
    return '${elapsed.inDays} day${elapsed.inDays == 1 ? '' : 's'} ago';
  }
}

enum PriceFreshnessKind { unknown, sample, published, live }
