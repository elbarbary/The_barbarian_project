import 'package:flutter/widgets.dart';

import '../../l10n/app_localizations.dart';
import 'price_freshness.dart';
import 'recency.dart';

/// [PriceFreshness] said in the reader's own language.
///
/// The wording used to live on the model as a string getter, which meant the
/// single most-rendered sentence in the product — it appears on Home, under
/// every price in the directory, on every company header, and on the settings
/// screen twenty lines below the Arabic/English switch — was hardcoded English.
/// An Arabic reader's first full-width line on Home read
/// "أقدم ما تراه هنا: During session · 2026-08-23": the one sentence whose
/// entire job is to say *this number is not live*, in a language they may not
/// read, ending in a machine date.
///
/// It lives on [BuildContext] rather than on the model because saying "today"
/// instead of "2026-08-23" needs the reader's calendar, and that comparison
/// already belongs to [Recency].
extension PriceFreshnessText on BuildContext {
  /// The line shown under a price.
  ///
  /// [short] drops the collection time and keeps the delay, for tight rows.
  String freshnessCaption(PriceFreshness f, {bool short = false}) {
    final l = AppLocalizations.of(this);
    return switch (f.kind) {
      PriceFreshnessKind.unknown => short ? '' : l.freshLoading,
      PriceFreshnessKind.sample => short ? l.freshSample : l.freshSample,
      PriceFreshnessKind.published => _published(l, f),
      // Outside trading hours a "delayed" quote is just the closing price, and
      // calling it delayed would imply a tape that is not running. Say what it
      // is.
      PriceFreshnessKind.live when !f.sessionOpen =>
        short ? l.freshMarketClosed : _closed(l, f),
      PriceFreshnessKind.live when short => l.freshDelayedShort(_delay(l, f)),
      PriceFreshnessKind.live => l.freshDelayed(_delay(l, f), _since(l, f)),
    };
  }

  /// A published price is only a "close" if the session it came from had ended.
  String _published(AppLocalizations l, PriceFreshness f) {
    final state = f.publishedIsClose ? l.freshLastClose : l.freshDuringSession;
    final day = _day(f.sessionDate);
    return day == null ? state : l.freshOnDay(state, day);
  }

  String _closed(AppLocalizations l, PriceFreshness f) {
    final day = _day(f.sessionDate);
    return day == null ? l.freshMarketClosed : l.freshMarketClosedOn(day);
  }

  /// The session date as a person would say it — "today", "أمس", "17 Aug".
  String? _day(String? iso) => filingAge(iso);

  String _delay(AppLocalizations l, PriceFreshness f) {
    // Never "real-time". Zero here means the feed did not tell us its tier, and
    // the app has no licence for a real-time EGX feed, so zero is far more
    // likely to be a missing field than a genuine upgrade. Claiming real-time
    // on a delayed price is the one error spec §49 exists to prevent, so the
    // unknown case reads as the delay we actually have.
    final effective = f.delay.inSeconds <= 0
        ? PriceFreshness.assumedDelay
        : f.delay;
    final minutes = effective.inMinutes;
    if (minutes < 1) return l.freshDelaySeconds(effective.inSeconds);
    if (minutes < 60) return l.freshDelayMinutes(minutes);
    return l.freshDelayHours(effective.inHours);
  }

  String _since(AppLocalizations l, PriceFreshness f) {
    final elapsed = f.since;
    if (elapsed == null || elapsed.inSeconds < 90) return l.freshSinceJustNow;
    if (elapsed.inMinutes < 60) return l.freshSinceMinutes(elapsed.inMinutes);
    if (elapsed.inHours < 24) return l.freshSinceHours(elapsed.inHours);
    return l.freshSinceDays(elapsed.inDays);
  }
}
