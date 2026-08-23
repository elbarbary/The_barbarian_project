import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

import '../../l10n/app_localizations.dart';

/// How old a thing is, said in the reader's language (spec §49).
///
/// §49 is a standing rule — *every screen shows its data age; stale is
/// labelled, never disguised* — and filings were breaking it outright: a
/// disclosure card carried the company, the type and the plain-language
/// meaning, and nothing at all about **when**. A filing from four days ago and
/// one from this morning looked identical, which on an exchange feed is the
/// difference between news and history.
///
/// Two entry points, because the two sources do not know the same amount.
///
///   * [newsAge] takes a full timestamp. Outlets publish one, so minutes and
///     hours are real and are shown.
///   * [filingAge] takes a **date only**. EGX publishes the day and not the
///     hour, so this never renders a time. A filing that landed today says
///     "Today"; it does not say "0h ago", which would be a precision we do not
///     have and cannot support.
///
/// Anything older than yesterday becomes a plain date — "20 Aug" — because
/// "17d ago" stops being a useful unit long before it stops being accurate.
class Recency {
  const Recency._();

  /// Relative age for something with a real publication timestamp.
  static String? newsAge(DateTime? at, AppLocalizations l, {String? locale}) {
    if (at == null) return null;
    final now = DateTime.now().toUtc();
    final when = at.toUtc();
    // A clock skew between the device and the publisher must not print
    // "-3m ago". Anything at or ahead of now reads as brand new.
    if (!when.isBefore(now)) return l.ageJustNow;

    final delta = now.difference(when);
    if (delta.inMinutes < 1) return l.ageJustNow;
    if (delta.inMinutes < 60) return l.ageMinutes(delta.inMinutes);
    if (delta.inHours < 24) return l.ageHours(delta.inHours);

    // Past a day, days are counted in the reader's own calendar, not in UTC.
    return _calendarAge(at.toLocal(), DateTime.now(), l, locale: locale);
  }

  /// Age for something that publishes a day and no time, such as an EGX filing.
  static String? filingAge(
    String? isoDate,
    AppLocalizations l, {
    String? locale,
  }) {
    if (isoDate == null || isoDate.isEmpty) return null;
    final when = DateTime.tryParse(isoDate);
    if (when == null) return null;
    // Deliberately *not* converted to UTC. "2026-08-21" has no time and no
    // zone: `DateTime.parse` reads it as local midnight, and `.toUtc()` then
    // walks it backwards by the offset — so in Egypt, at UTC+3, every filing
    // made today announced itself as "Yesterday". A bare date is a calendar
    // day, and the only sane thing to compare it against is the reader's
    // calendar day.
    return _calendarAge(
      DateTime(when.year, when.month, when.day),
      DateTime.now(),
      l,
      locale: locale,
      dayOnly: true,
    );
  }

  /// Whole-day distance, so "yesterday" means the previous calendar day rather
  /// than "between 24 and 48 hours ago". A filing published at 21:00 and read
  /// at 08:00 the next morning is eleven hours old and is still yesterday's.
  static String _calendarAge(
    DateTime when,
    DateTime now,
    AppLocalizations l, {
    String? locale,
    bool dayOnly = false,
  }) {
    final today = DateTime(now.year, now.month, now.day);
    final that = DateTime(when.year, when.month, when.day);
    final days = today.difference(that).inDays;

    if (days <= 0) return dayOnly ? l.ageToday : l.ageJustNow;
    if (days == 1) return l.ageYesterday;
    // Within the week a count still reads naturally; past that a date is
    // easier to place than an ever-growing number of days.
    if (days < 7) return l.ageDays(days);
    return westernDigits(DateFormat.MMMd(locale).format(when));
  }
}

/// Arabic-Indic digits rewritten as the ones this app counts in.
///
/// `intl` formats Arabic dates with ٠١٢٣٤٥٦٧٨٩, which is correct for prose and
/// wrong here: every other number in this app — prices, percentages, volumes,
/// index levels — is Western, because that is what Egyptian price screens use.
/// A price chart whose bars read "+2.3" over labels reading "١٦ أغسطس" is two
/// numeral systems in one card.
String westernDigits(String text) {
  if (!text.contains(RegExp('[٠-٩۰-۹]'))) return text;
  final out = StringBuffer();
  for (final rune in text.runes) {
    if (rune >= 0x0660 && rune <= 0x0669) {
      out.writeCharCode(0x30 + rune - 0x0660); // Arabic-Indic
    } else if (rune >= 0x06F0 && rune <= 0x06F9) {
      out.writeCharCode(0x30 + rune - 0x06F0); // Eastern Arabic-Indic
    } else {
      out.writeCharCode(rune);
    }
  }
  return out.toString();
}

/// Convenience for widgets that already have a [BuildContext].
extension RecencyContext on BuildContext {
  String? newsAge(DateTime? at) => Recency.newsAge(
    at,
    AppLocalizations.of(this),
    locale: Localizations.localeOf(this).toLanguageTag(),
  );

  String? filingAge(String? isoDate) => Recency.filingAge(
    isoDate,
    AppLocalizations.of(this),
    locale: Localizations.localeOf(this).toLanguageTag(),
  );

  /// "17 Aug" / "١٧ أغسطس" — a day and a month in the reader's calendar.
  ///
  /// Three screens each carried their own `const months = ['January', …]`
  /// array, so an Arabic reader got English month names on the second line of
  /// Today, on the scanner's date stamp, and under every bar of the company
  /// price chart.
  String dayMonth(DateTime at) => westernDigits(
    DateFormat.MMMd(Localizations.localeOf(this).toLanguageTag()).format(at),
  );

  /// The same with the year, for something dated once at the top of a screen.
  String dayMonthYear(DateTime at) => westernDigits(
    DateFormat.yMMMd(Localizations.localeOf(this).toLanguageTag()).format(at),
  );

  /// [dayMonth] from an ISO string, returned untouched when it will not parse
  /// — a date this app cannot read is better shown as filed than guessed at.
  String dayMonthIso(String iso) {
    final at = DateTime.tryParse(iso);
    return at == null ? iso : dayMonth(at);
  }
}
