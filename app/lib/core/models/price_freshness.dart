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
    this.publishedIsClose = true,
  });

  /// Nothing has loaded yet.
  const PriceFreshness.unknown() : this(kind: PriceFreshnessKind.unknown);

  /// The bundled snapshot, shown only in fixture builds.
  const PriceFreshness.sample() : this(kind: PriceFreshnessKind.sample);

  /// The daily publish, with no live feed reached.
  ///
  /// [isClose] false means the scan behind these prices was taken while the
  /// exchange was still trading, so they are a reading from that session rather
  /// than its closing prices.
  const PriceFreshness.published(String? date, {bool isClose = true})
    : this(
        kind: PriceFreshnessKind.published,
        sessionDate: date,
        publishedIsClose: isClose,
      );

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

  /// For [PriceFreshnessKind.published]: whether the published prices are that
  /// session's closing prices rather than a mid-session reading.
  final bool publishedIsClose;

  bool get isLive => kind == PriceFreshnessKind.live;

  /// The wording lives in `price_freshness_text.dart`, as an extension on
  /// [BuildContext], because every one of these sentences has to reach the
  /// reader in their own language and dated in their own calendar. This class
  /// carries the facts; that one says them.

  /// The delay assumed when the feed does not state one.
  ///
  /// Mirrors `ASSUMED_DELAY_SECONDS` in the quotes Worker. Belt and braces: the
  /// Worker already fails closed, and this makes a zero arriving from anywhere
  /// else — an old Worker version, a hand-edited response, a future feed —
  /// unable to produce a false claim on screen.
  static const Duration assumedDelay = Duration(minutes: 15);
}

enum PriceFreshnessKind { unknown, sample, published, live }
