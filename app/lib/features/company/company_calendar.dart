import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/calendar.dart';
import '../../core/models/disclosure.dart';
import '../../core/models/recency.dart';
import '../../core/models/signals.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';
import '../calendar/filed_list.dart' show BExpandToggle;

/// One company's dates: what is coming, and what it has already filed.
///
/// The market calendar answers "what is happening this week". Standing on a
/// company's page a reader is asking something narrower — *when does this one
/// report, and what has it been filing* — and answering that meant joining
/// three things the app already holds and had never put on one screen.
///
/// Three sections, in descending order of how firm the claim is:
///
///   1. **Scheduled.** Dates this company filed: a dividend it declared, an
///      assembly it called, a rights-issue window. Facts on the record.
///   2. **Expected.** When its results are next due, worked out from the dates
///      it filed the same period in previous years. Marked as an estimate
///      everywhere it appears, shown as a window rather than a date, and
///      carrying the number of past filings the window is drawn from.
///   3. **Filed.** The record itself, newest first.
///
/// The second is the only computed thing on the screen, and it is a claim
/// about a **disclosure date** — never about the figures inside it, which
/// would be a view on a named security and is not this publisher's to give
/// (§8).
class BCompanyCalendar extends ConsumerStatefulWidget {
  const BCompanyCalendar({
    required this.ticker,
    required this.parentTab,
    super.key,
  });

  final String ticker;
  final BNavTab parentTab;

  /// How many past filings the tab shows before offering the rest.
  static const int recent = 25;

  @override
  ConsumerState<BCompanyCalendar> createState() => _BCompanyCalendarState();
}

class _BCompanyCalendarState extends ConsumerState<BCompanyCalendar> {
  /// Whether the reader has asked to see the whole record. Off by default: the
  /// full document is larger than the page and fetched only on request.
  bool _showAll = false;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final today = DateTime.now();
    final ticker = widget.ticker;
    final parentTab = widget.parentTab;
    const recent = BCompanyCalendar.recent;

    final calendar =
        ref.watch(calendarProvider).value?.value ?? CalendarDoc.empty;
    final signals =
        ref.watch(companySignalsProvider(ticker)).value?.value ??
        CompanySignals.empty;
    final documents = ref.watch(companyDocumentsProvider(ticker)).value?.value;

    // Only what is still ahead — a dividend paid three weeks ago is history,
    // and the filings list below already carries the announcement.
    final scheduled = [
      for (final event in calendar.forTicker(ticker))
        if (!event.estimated)
          if (event.parsedDate case final DateTime at
              when !at.isBefore(DateTime(today.year, today.month, today.day)))
            event,
    ];

    final filings = documents?.items ?? const <FiledDocument>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.ccalScheduled, bottomGap: 8),
        if (scheduled.isEmpty)
          _Empty(text: l.ccalNothingScheduled)
        else
          for (final event in scheduled) ...[
            _ScheduledCard(event: event, parentTab: parentTab),
            const SizedBox(height: 8),
          ],

        const SizedBox(height: 20),
        BSectionLabel(l.ccalExpected, bottomGap: 8),
        if (signals.resultsDue.isEmpty)
          _Empty(text: l.ccalNoRhythm)
        else
          for (final due in signals.resultsDue) ...[
            _ExpectedCard(due: due),
            const SizedBox(height: 8),
          ],

        const SizedBox(height: 20),
        BSectionLabel(l.ccalFiled, bottomGap: 8),
        if (filings.isEmpty)
          _Empty(text: l.ccalNoFilings)
        else if (_showAll) ...[
          // The complete record is a separate, larger document fetched only
          // when the reader asks for it. While it loads — or offline, where it
          // is not bundled — the newest window we already hold stands in.
          Builder(
            builder: (context) {
              final full = ref
                  .watch(companyDocumentsAllProvider(ticker))
                  .value
                  ?.value
                  .items;
              final all = (full != null && full.isNotEmpty) ? full : filings;
              return _FiledCard(rows: all, parentTab: parentTab);
            },
          ),
          const SizedBox(height: 8),
          BExpandToggle(
            expanded: true,
            collapsedLabel: l.ccalShowAll,
            expandedLabel: l.calShowFewer,
            onTap: () => setState(() => _showAll = false),
          ),
        ] else ...[
          _FiledCard(
            rows: filings.take(recent).toList(),
            parentTab: parentTab,
          ),
          // Offer the rest unless we can see the newest window is the whole
          // record. `total` is not always published, so an unknown total is
          // treated as "there may be more" rather than hiding the record.
          if (filings.length > recent ||
              documents?.total == null ||
              (documents?.total ?? 0) > recent) ...[
            const SizedBox(height: 8),
            BExpandToggle(
              expanded: false,
              collapsedLabel: l.ccalShowAll,
              expandedLabel: l.calShowFewer,
              onTap: () => setState(() => _showAll = true),
            ),
          ],
        ],
        const SizedBox(height: 12),
        Text(
          l.ccalFootnote,
          style: BarbarianType.bodyS.copyWith(color: c.textFaint, height: 1.5),
        ),
      ],
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 2),
    child: Text(
      text,
      style: BarbarianType.bodyM.copyWith(color: context.colors.textFaint),
    ),
  );
}

/// A date this company filed.
class _ScheduledCard extends StatelessWidget {
  const _ScheduledCard({required this.event, required this.parentTab});

  final CalendarEvent event;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final card = BPaperCard(
      padding: const EdgeInsets.fromLTRB(14, 13, 14, 13),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsetsDirectional.only(top: 2, end: 12),
            child: Icon(_icon(event.kindOf), size: 18, color: c.accent),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _label(event.kindOf, l),
                  style: BarbarianType.titleS.copyWith(color: c.textPrimary),
                ),
                const SizedBox(height: 4),
                Text(
                  context.dayMonthIso(event.date),
                  style: BarbarianType.bodyS.copyWith(color: c.textSecondary),
                ),
                if (event.filed.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    l.calAnnounced(context.dayMonthIso(event.filed)),
                    style: BarbarianType.labelNano.copyWith(color: c.textFaint),
                  ),
                ],
              ],
            ),
          ),
          if (event.link.isNotEmpty)
            Icon(Icons.north_east, size: 14, color: c.textFaint),
        ],
      ),
    );
    if (event.link.isEmpty) return card;
    return BPressable(
      onTap: () => context.push(
        Routes.articlePath(parentTab, event.link, l.filingReaderHeader),
      ),
      child: card,
    );
  }

  static IconData _icon(CalendarKind kind) => switch (kind) {
    CalendarKind.dividendPayment => Icons.payments_outlined,
    CalendarKind.exDividend => Icons.content_cut_rounded,
    CalendarKind.rightsOpen => Icons.add_circle_outline_rounded,
    CalendarKind.rightsClose => Icons.do_not_disturb_on_outlined,
    CalendarKind.rightsEntitlement => Icons.how_to_reg_outlined,
    CalendarKind.assemblyAgm => Icons.groups_outlined,
    CalendarKind.assemblyEgm => Icons.gavel_rounded,
    CalendarKind.tradingResume => Icons.play_circle_outline_rounded,
    CalendarKind.tradingSuspend => Icons.pause_circle_outline_rounded,
    CalendarKind.listingEffective => Icons.playlist_add_check_rounded,
    CalendarKind.resultsExpected => Icons.assessment_outlined,
    CalendarKind.other => Icons.event_outlined,
  };

  static String _label(CalendarKind kind, AppLocalizations l) => switch (kind) {
    CalendarKind.dividendPayment => l.calKindDividendPayment,
    CalendarKind.exDividend => l.calKindExDividend,
    CalendarKind.rightsOpen => l.calKindRightsOpen,
    CalendarKind.rightsClose => l.calKindRightsClose,
    CalendarKind.rightsEntitlement => l.calKindRightsEntitlement,
    CalendarKind.assemblyAgm => l.calKindAssemblyAgm,
    CalendarKind.assemblyEgm => l.calKindAssemblyEgm,
    CalendarKind.tradingResume => l.calKindTradingResume,
    CalendarKind.tradingSuspend => l.calKindTradingSuspend,
    CalendarKind.listingEffective => l.calKindListingEffective,
    CalendarKind.resultsExpected => l.calKindResultsExpected,
    CalendarKind.other => l.calKindOther,
  };
}

/// A date nobody filed — drawn as an outline so it cannot be mistaken for one.
class _ExpectedCard extends StatelessWidget {
  const _ExpectedCard({required this.due});

  final ResultsDue due;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 13, 14, 13),
      decoration: BoxDecoration(
        border: Border.all(color: c.cardEdge, width: 1.2),
        borderRadius: BorderRadius.circular(BarbarianRadius.lg),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsetsDirectional.only(top: 2, end: 12),
            child: Icon(
              Icons.assessment_outlined,
              size: 18,
              color: c.textMuted,
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        l.ccalResultsDue(due.label),
                        style: BarbarianType.titleS.copyWith(
                          color: c.textPrimary,
                        ),
                      ),
                    ),
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
                ),
                const SizedBox(height: 5),
                Text(
                  l.calExpectedWindow(
                    context.dayMonthIso(due.windowStart),
                    context.dayMonthIso(due.windowEnd),
                  ),
                  style: BarbarianType.bodyS.copyWith(color: c.textSecondary),
                ),
                const SizedBox(height: 4),
                Text(
                  l.calExpectedBasis(due.observations),
                  style: BarbarianType.labelNano.copyWith(color: c.textFaint),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// The filed-documents list as one card — the same shape whether it holds the
/// newest window or, expanded, the whole record.
class _FiledCard extends StatelessWidget {
  const _FiledCard({required this.rows, required this.parentTab});

  final List<FiledDocument> rows;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) => BPaperCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final filing in rows)
          _FiledRow(filing: filing, parentTab: parentTab),
      ],
    ),
  );
}

class _FiledRow extends StatelessWidget {
  const _FiledRow({required this.filing, required this.parentTab});

  final FiledDocument filing;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final title = (arabic || (filing.titleEn ?? '').isEmpty)
        ? filing.title
        : filing.titleEn!;

    return BPressable(
      onTap: filing.link.isEmpty
          ? null
          : () => context.push(
              Routes.articlePath(
                parentTab,
                filing.link,
                AppLocalizations.of(context).filingReaderHeader,
              ),
            ),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 7),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 62,
              child: Text(
                context.dayMonthIso(filing.date),
                style: BarbarianType.labelNano.copyWith(color: c.textFaint),
              ),
            ),
            Expanded(
              child: Text(
                title.replaceAll(RegExp(r'\s*\([A-Z0-9]+\.CA\)\s*'), ' ').trim(),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textDirection: isArabic(title)
                    ? TextDirection.rtl
                    : TextDirection.ltr,
                style: BarbarianType.bodyS.copyWith(
                  color: c.textSecondary,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
