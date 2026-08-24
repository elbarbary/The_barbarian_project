import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../../app/router.dart';
import '../../core/models/calendar.dart';
import '../../core/models/explainer.dart';
import '../../core/models/recency.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/explainer_sheet.dart';
import '../../core/widgets/legal.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';
import 'filed_list.dart';

/// Calendar — the dates the filings put on the record.
///
/// This tab replaced The Pit, a phase-gated "coming soon" placeholder that was
/// a quarter of the navigation spent saying "not yet". In its place: the one
/// thing the app can build from published fact that nothing else surfaces — a
/// forward view of what a company has already scheduled. Dividend and
/// ex-dividend dates, rights-issue windows, called assemblies, trading
/// suspensions and resumptions, each read out of a filing by `build_calendar.py`
/// and linked back to it.
///
/// **It is not a forecast.** Every date on the screen is one an issuer or the
/// exchange already filed; the calendar only collects them. Three views —
/// month, week, day — because "what is happening this month" and "what is on
/// today" are different questions a reader asks of a calendar.
class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({required this.parentTab, super.key});

  final BNavTab parentTab;

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

enum _View { month, week, day }

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  _View _view = _View.month;

  /// The day in focus. In month view it selects the day whose events show
  /// below the grid; in week view it anchors the seven days shown; in day view
  /// it is the day. Starts at today.
  late DateTime _cursor = _today();

  static DateTime _today() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  void _shift(int units) {
    setState(() {
      _cursor = switch (_view) {
        _View.month => DateTime(_cursor.year, _cursor.month + units),
        _View.week => _cursor.add(Duration(days: 7 * units)),
        _View.day => _cursor.add(Duration(days: units)),
      };
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final doc = ref.watch(calendarProvider).value?.value ?? CalendarDoc.empty;
    final isSample = ref.watch(isSampleDataProvider);

    return BScreenScaffold(
      blockGap: 18,
      children: [
        BScreenTitle(
          l.navCalendar,
          subtitle: l.calendarTitle,
          trailing: BPressable(
            onTap: () => showExplainer(context, _explainer(l)),
            child: Icon(
              Icons.info_outline_rounded,
              size: 20,
              color: context.colors.textMuted,
            ),
          ),
        ),
        _ViewBar(
          view: _view,
          onChanged: (v) => setState(() => _view = v),
          onToday: () => setState(() => _cursor = _today()),
          isToday: _sameDay(_cursor, _today()),
        ),
        _Period(
          view: _view,
          cursor: _cursor,
          onPrev: () => _shift(-1),
          onNext: () => _shift(1),
        ),
        if (_view == _View.month)
          _MonthGrid(
            doc: doc,
            cursor: _cursor,
            onPick: (day) => setState(() => _cursor = day),
          ),
        _Agenda(
          doc: doc,
          cursor: _cursor,
          view: _view,
          parentTab: widget.parentTab,
        ),
        if (isSample) const Center(child: BSampleDataNotice()),
        const BLegalFootnote(),
      ],
    );
  }

  static Explainer _explainer(AppLocalizations l) => Explainer(
    termId: 'calendar.scheduled',
    title: l.calExplainerTitle,
    plain: l.calExplainerPlain,
    token: '',
    workings: l.calExplainerBody,
    yardstick: '',
    notability: Notability.unjudged,
    provenance: Provenance.fact,
    source: 'EGX',
  );
}

/// Month / Week / Day, and a jump back to today.
class _ViewBar extends StatelessWidget {
  const _ViewBar({
    required this.view,
    required this.onChanged,
    required this.onToday,
    required this.isToday,
  });

  final _View view;
  final ValueChanged<_View> onChanged;
  final VoidCallback onToday;
  final bool isToday;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    return Row(
      children: [
        Expanded(
          child: BSegmentedRow(
            segments: [
              BSegment(label: l.calViewMonth),
              BSegment(label: l.calViewWeek),
              BSegment(label: l.calViewDay),
            ],
            selectedIndex: view.index,
            onChanged: (i) => onChanged(_View.values[i]),
          ),
        ),
        if (!isToday) ...[
          const SizedBox(width: 10),
          BPressable(
            onTap: onToday,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              decoration: BoxDecoration(
                color: c.actionSurface,
                borderRadius: BorderRadius.circular(BarbarianRadius.pill),
              ),
              child: Text(
                l.calToday,
                style: BarbarianType.labelS.copyWith(color: c.onAction),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// The period label with a way to step through it.
class _Period extends StatelessWidget {
  const _Period({
    required this.view,
    required this.cursor,
    required this.onPrev,
    required this.onNext,
  });

  final _View view;
  final DateTime cursor;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final label = switch (view) {
      _View.month => westernDigits(DateFormat.yMMMM(locale).format(cursor)),
      _View.week => _weekLabel(context, cursor),
      _View.day => westernDigits(DateFormat.yMMMMEEEEd(locale).format(cursor)),
    };
    // In RTL the chevrons keep their calendar meaning — left steps back — by
    // sitting in a physical Row, not a directional one.
    return Row(
      textDirection: TextDirection.ltr,
      children: [
        _Chevron(icon: Icons.chevron_left_rounded, onTap: onPrev),
        Expanded(
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: BarbarianType.titleM.copyWith(color: c.textPrimary),
          ),
        ),
        _Chevron(icon: Icons.chevron_right_rounded, onTap: onNext),
      ],
    );
  }

  static String _weekLabel(BuildContext context, DateTime cursor) {
    final start = _weekStart(cursor);
    final end = start.add(const Duration(days: 6));
    return '${context.dayMonth(start)} – ${context.dayMonth(end)}';
  }
}

class _Chevron extends StatelessWidget {
  const _Chevron({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return BPressable(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.surface,
          shape: BoxShape.circle,
          border: Border.all(color: c.cardEdge),
        ),
        child: Icon(icon, size: 22, color: c.textSecondary),
      ),
    );
  }
}

/// A month as a 7×6 grid. Days that carry events show a dot; the day in focus
/// and today are marked. Colour never carries meaning on its own — the grid
/// says "something is scheduled here", and the agenda below names it.
class _MonthGrid extends ConsumerWidget {
  const _MonthGrid({
    required this.doc,
    required this.cursor,
    required this.onPick,
  });

  final CalendarDoc doc;
  final DateTime cursor;
  final ValueChanged<DateTime> onPick;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final today = _CalendarScreenState._today();
    final counts = _countsByDay(doc);
    // A day with nothing scheduled can still have had sixty filings land on
    // it, and a grid that showed nothing there hid the whole lower half of
    // this screen behind a day nobody would think to tap.
    final lodged = ref
            .watch(filedMonthProvider(BFiledOnDay.monthKey(cursor)))
            .value
            ?.value
            .countsByDay ??
        const <String, int>{};

    final first = DateTime(cursor.year, cursor.month);
    // Egyptian week starts Saturday. Dart weekday: Mon=1..Sun=7, Sat=6.
    final lead = (first.weekday - DateTime.saturday + 7) % 7;
    final gridStart = first.subtract(Duration(days: lead));

    final headers = [
      for (var i = 0; i < 7; i++)
        DateFormat.E(locale).format(gridStart.add(Duration(days: i))),
    ];

    return BPaperCard(
      child: Column(
        children: [
          Row(
            children: [
              for (final h in headers)
                Expanded(
                  child: Text(
                    h,
                    textAlign: TextAlign.center,
                    style: BarbarianType.labelNano.copyWith(color: c.textFaint),
                    maxLines: 1,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          for (var week = 0; week < 6; week++)
            Row(
              children: [
                for (var d = 0; d < 7; d++)
                  Builder(
                    builder: (context) {
                      final day = gridStart.add(Duration(days: week * 7 + d));
                      final inMonth = day.month == cursor.month;
                      return Expanded(
                        child: _DayCell(
                          day: day,
                          inMonth: inMonth,
                          count: counts[_key(day)] ?? 0,
                          filed: lodged[_iso(day)] ?? 0,
                          isToday: _sameDay(day, today),
                          isSelected: _sameDay(day, cursor),
                          onTap: () => onPick(day),
                        ),
                      );
                    },
                  ),
              ],
            ),
        ],
      ),
    );
  }

  static Map<int, int> _countsByDay(CalendarDoc doc) {
    final out = <int, int>{};
    for (final e in doc.events) {
      if (e.parsedDate case final DateTime at) {
        out.update(_key(at), (n) => n + 1, ifAbsent: () => 1);
      }
    }
    return out;
  }

  static int _key(DateTime d) => d.year * 10000 + d.month * 100 + d.day;

  static String _iso(DateTime d) => d.toIso8601String().split('T').first;
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.inMonth,
    required this.count,
    required this.filed,
    required this.isToday,
    required this.isSelected,
    required this.onTap,
  });

  final DateTime day;
  final bool inMonth;

  /// Dates an issuer scheduled — the filled mark.
  final int count;

  /// Filings that landed that day — the hollow one. Two shapes rather than two
  /// colours, because colour is never a fact's only carrier here (§42), and
  /// the same outline convention marks an estimate further down the screen.
  final int filed;
  final bool isToday;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final has = count > 0;
    final onlyFiled = !has && filed > 0;
    final numberColor = isSelected
        ? c.onAccent
        : (inMonth ? c.textPrimary : c.textFaint);

    return BPressable(
      onTap: onTap,
      scale: 0.94,
      child: AspectRatio(
        aspectRatio: 1,
        child: Container(
          margin: const EdgeInsets.all(2),
          decoration: BoxDecoration(
            color: isSelected
                ? c.accent
                : (isToday ? c.actionSurface : Colors.transparent),
            borderRadius: BorderRadius.circular(BarbarianRadius.md),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                westernDigits('${day.day}'),
                style: BarbarianType.label.copyWith(
                  color: numberColor,
                  fontWeight: isToday || isSelected
                      ? FontWeight.w600
                      : FontWeight.w400,
                ),
              ),
              const SizedBox(height: 3),
              // A dot when the day carries events, so an empty day and a busy
              // one are told apart. The exact count is spoken to a screen
              // reader and shown on tap, so the mark is never the sole carrier.
              SizedBox(
                height: 5,
                child: switch ((has, onlyFiled)) {
                  (true, _) => Semantics(
                    label: '$count',
                    child: Container(
                      width: count > 1 ? 14 : 5,
                      height: 5,
                      decoration: BoxDecoration(
                        color: isSelected ? c.onAccent : c.accent,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                  (false, true) => Semantics(
                    label: '$filed',
                    child: Container(
                      width: 5,
                      height: 5,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSelected ? c.onAccent : c.textFaint,
                        ),
                      ),
                    ),
                  ),
                  _ => null,
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The list under the grid: the events on the focused day (month/day view) or
/// across the focused week (week view), grouped by day.
class _Agenda extends ConsumerWidget {
  const _Agenda({
    required this.doc,
    required this.cursor,
    required this.view,
    required this.parentTab,
  });

  final CalendarDoc doc;
  final DateTime cursor;
  final _View view;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;

    final days = switch (view) {
      _View.week => [
        for (var i = 0; i < 7; i++) _weekStart(cursor).add(Duration(days: i)),
      ],
      _ => [cursor],
    };

    final blocks = <Widget>[];
    for (final day in days) {
      final events = doc.on(day)..sort((a, b) => a.kind.compareTo(b.kind));
      // Two lists, never one. A date an issuer filed is a promise on the
      // record; a date this app worked out from that issuer's filing habits is
      // an expectation. Mixing them into one column would leave a reader to
      // tell them apart by reading the small print on each card.
      final scheduled = [
        for (final e in events)
          if (!e.estimated) e,
      ];
      final expected = [
        for (final e in events)
          if (e.estimated) e,
      ];
      // A day with nothing scheduled can still have had twenty filings land
      // on it, and in week view that is exactly the day a reader is looking
      // for. Ask the month document before deciding the day is empty.
      final lodged = ref
              .watch(filedMonthProvider(BFiledOnDay.monthKey(day)))
              .value
              ?.value
              .on(day)
              .length ??
          0;
      if (view == _View.week && events.isEmpty && lodged == 0) continue;
      blocks.add(_DayHeading(day: day));
      if (events.isEmpty) {
        if (lodged == 0) {
          blocks.add(
            Padding(
              padding: const EdgeInsets.only(top: 6, bottom: 4),
              child: Text(
                l.calNothingDay,
                style: BarbarianType.bodyM.copyWith(color: c.textFaint),
              ),
            ),
          );
        }
      } else {
        for (final e in scheduled) {
          blocks.add(
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: _EventCard(event: e, parentTab: parentTab),
            ),
          );
        }
        if (expected.isNotEmpty) {
          blocks.add(
            Padding(
              padding: const EdgeInsets.only(top: 14, bottom: 2),
              child: Text(
                l.calExpectedHeading(expected.length).toUpperCase(),
                style: BarbarianType.labelNano.copyWith(
                  color: c.textMuted,
                  letterSpacing: 0.6,
                ),
              ),
            ),
          );
          for (final e in expected) {
            blocks.add(
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: _EventCard(event: e, parentTab: parentTab),
              ),
            );
          }
        }
      }
      // And under both: what actually landed that day.
      blocks.add(BFiledOnDay(day: day, parentTab: parentTab));
      blocks.add(const SizedBox(height: 18));
    }

    if (view == _View.week && blocks.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Text(
          l.calNothingRange,
          textAlign: TextAlign.center,
          style: BarbarianType.bodyM.copyWith(color: c.textFaint),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: blocks,
    );
  }
}

class _DayHeading extends StatelessWidget {
  const _DayHeading({required this.day});

  final DateTime day;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final today = _CalendarScreenState._today();
    final delta = day.difference(today).inDays;
    final relative = switch (delta) {
      0 => l.calToday,
      > 0 => l.calInDays(delta),
      _ => l.calAgoDays(-delta),
    };

    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Expanded(child: BSectionLabel(context.dayMonth(day), bottomGap: 0)),
          Text(
            relative,
            style: BarbarianType.labelNano.copyWith(color: c.textMuted),
          ),
        ],
      ),
    );
  }
}

/// One scheduled event, and the filing behind it.
class _EventCard extends StatelessWidget {
  const _EventCard({required this.event, required this.parentTab});

  final CalendarEvent event;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final (icon, label) = _face(event.kindOf, l);

    return BPressable(
      onTap: event.link.isEmpty
          ? null
          : () => context.push(
              Routes.articlePath(parentTab, event.link, 'EGX filing'),
            ),
      child: BPaperCard(
        padding: const EdgeInsets.fromLTRB(14, 13, 14, 13),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 38,
              height: 38,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                // An estimate is drawn as an outline, a filed date as a solid
                // tile — so the two are told apart by shape and not only by
                // colour (§42), and before any label is read.
                color: event.estimated
                    ? Colors.transparent
                    : c.accent.withValues(alpha: c.isDark ? 0.16 : 0.10),
                border: event.estimated
                    ? Border.all(color: c.cardEdge, width: 1.2)
                    : null,
                borderRadius: BorderRadius.circular(BarbarianRadius.md),
              ),
              child: Icon(
                icon,
                size: 19,
                color: event.estimated ? c.textMuted : c.accent,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          label,
                          style: BarbarianType.titleS.copyWith(
                            color: c.textPrimary,
                          ),
                        ),
                      ),
                      if (event.estimated) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(color: c.cardEdge),
                            borderRadius: BorderRadius.circular(
                              BarbarianRadius.pill,
                            ),
                          ),
                          child: Text(
                            l.calEstimated,
                            style: BarbarianType.labelNano.copyWith(
                              color: c.textMuted,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (event.ticker case final String t when t.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Text(
                          t,
                          style: BarbarianType.labelS.copyWith(color: c.accent),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _company(event.titleFor(arabic)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textDirection: isArabic(event.titleFor(arabic))
                                ? TextDirection.rtl
                                : TextDirection.ltr,
                            style: BarbarianType.bodyS.copyWith(
                              color: c.textMuted,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (event.filed.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      l.calAnnounced(context.dayMonthIso(event.filed)),
                      style: BarbarianType.labelNano.copyWith(
                        color: c.textFaint,
                      ),
                    ),
                  ],
                  // The estimated row says three things a filed row never
                  // needs to: that nobody filed this, the range it has
                  // actually landed in before, and how many years that range
                  // is drawn from. A window from three years is a weaker claim
                  // than one from twelve and the reader is told which it is.
                  if (event.estimated) ...[
                    const SizedBox(height: 6),
                    Text(
                      l.calExpectedWindow(
                        context.dayMonthIso(event.windowStart),
                        context.dayMonthIso(event.windowEnd),
                      ),
                      style: BarbarianType.bodyS.copyWith(color: c.textMuted),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l.calExpectedBasis(event.observations),
                      style: BarbarianType.labelNano.copyWith(
                        color: c.textFaint,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (event.link.isNotEmpty)
              Padding(
                padding: const EdgeInsetsDirectional.only(start: 6, top: 2),
                child: Icon(Icons.north_east, size: 14, color: c.textFaint),
              ),
          ],
        ),
      ),
    );
  }

  /// The company name with the "(TICK.CA)" and the boilerplate tail trimmed —
  /// the heading is the filing's, not written for this row.
  static String _company(String title) {
    var out = title.replaceAll(RegExp(r'\s*\([A-Z0-9]+\.CA\)\s*'), ' ');
    final cut = out.indexOf(' - ');
    if (cut > 0) out = out.substring(0, cut);
    return out.trim();
  }

  static (IconData, String) _face(CalendarKind kind, AppLocalizations l) =>
      switch (kind) {
        CalendarKind.dividendPayment => (
          Icons.payments_outlined,
          l.calKindDividendPayment,
        ),
        CalendarKind.exDividend => (
          Icons.content_cut_rounded,
          l.calKindExDividend,
        ),
        CalendarKind.rightsOpen => (
          Icons.add_circle_outline_rounded,
          l.calKindRightsOpen,
        ),
        CalendarKind.rightsClose => (
          Icons.do_not_disturb_on_outlined,
          l.calKindRightsClose,
        ),
        CalendarKind.rightsEntitlement => (
          Icons.how_to_reg_outlined,
          l.calKindRightsEntitlement,
        ),
        CalendarKind.assemblyAgm => (Icons.groups_outlined, l.calKindAssemblyAgm),
        CalendarKind.assemblyEgm => (Icons.gavel_rounded, l.calKindAssemblyEgm),
        CalendarKind.tradingResume => (
          Icons.play_circle_outline_rounded,
          l.calKindTradingResume,
        ),
        CalendarKind.tradingSuspend => (
          Icons.pause_circle_outline_rounded,
          l.calKindTradingSuspend,
        ),
        CalendarKind.listingEffective => (
          Icons.playlist_add_check_rounded,
          l.calKindListingEffective,
        ),
        CalendarKind.resultsExpected => (
          Icons.assessment_outlined,
          l.calKindResultsExpected,
        ),
        CalendarKind.other => (Icons.event_outlined, l.calKindOther),
      };
}

DateTime _weekStart(DateTime day) {
  final lead = (day.weekday - DateTime.saturday + 7) % 7;
  final s = day.subtract(Duration(days: lead));
  return DateTime(s.year, s.month, s.day);
}

bool _sameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;
