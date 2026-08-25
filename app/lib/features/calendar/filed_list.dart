import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/filed.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// What was actually filed on a day — the calendar's other half.
///
/// Above it sits what a company *said* would happen: a dividend it declared, an
/// assembly it called, results it usually files around now. This is the record
/// of what did happen, read straight from the exchange's own feed for that day.
///
/// The two are deliberately not one list. A scheduled date is a promise and a
/// lodged filing is a fact, and a screen that stacked them together would be
/// asking a reader to tell them apart by reading closely.
///
/// The month document is fetched only when a month is opened. Twelve months of
/// filings is five megabytes and nobody scrolls a year.
class BFiledOnDay extends ConsumerStatefulWidget {
  const BFiledOnDay({
    required this.day,
    required this.parentTab,
    this.limit = 8,
    super.key,
  });

  final DateTime day;
  final BNavTab parentTab;

  /// How many rows to show before offering the rest. A busy Thursday on this
  /// exchange carries ninety filings, and ninety rows under a calendar is not
  /// a calendar any more — so the tail is folded behind a tap rather than cut
  /// off. Every filing that day is already loaded in the month document; the
  /// toggle only decides how many of them are drawn.
  final int limit;

  static String monthKey(DateTime day) =>
      '${day.year.toString().padLeft(4, '0')}-'
      '${day.month.toString().padLeft(2, '0')}';

  @override
  ConsumerState<BFiledOnDay> createState() => _BFiledOnDayState();
}

class _BFiledOnDayState extends ConsumerState<BFiledOnDay> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final month = ref
        .watch(filedMonthProvider(BFiledOnDay.monthKey(widget.day)))
        .value
        ?.value;
    if (month == null) return const SizedBox.shrink();

    final filings = month.on(widget.day);
    if (filings.isEmpty) return const SizedBox.shrink();

    final overflow = filings.length > widget.limit;
    final shown = _expanded ? filings : filings.take(widget.limit).toList();

    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(Icons.inventory_2_outlined, size: 14, color: c.textMuted),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  l.calFiledHeading(filings.length),
                  style: BarbarianType.labelNano.copyWith(
                    color: c.textMuted,
                    letterSpacing: 0.6,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          for (final filing in shown)
            _FiledRow(filing: filing, parentTab: widget.parentTab),
          if (overflow)
            BExpandToggle(
              expanded: _expanded,
              collapsedLabel: l.calFiledMore(filings.length - widget.limit),
              expandedLabel: l.calShowFewer,
              onTap: () => setState(() => _expanded = !_expanded),
            ),
        ],
      ),
    );
  }
}

/// The "+N more / show fewer" control the two calendars share. A centred,
/// tappable row with a chevron — an affordance, not the faint dead-end label
/// it replaced.
class BExpandToggle extends StatelessWidget {
  const BExpandToggle({
    required this.expanded,
    required this.collapsedLabel,
    required this.expandedLabel,
    required this.onTap,
    super.key,
  });

  final bool expanded;
  final String collapsedLabel;
  final String expandedLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return BPressable(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              expanded ? expandedLabel : collapsedLabel,
              style: BarbarianType.labelNano.copyWith(color: c.accent),
            ),
            const SizedBox(width: 4),
            Icon(
              expanded
                  ? Icons.keyboard_arrow_up_rounded
                  : Icons.keyboard_arrow_down_rounded,
              size: 14,
              color: c.accent,
            ),
          ],
        ),
      ),
    );
  }
}

/// One lodged filing. Quieter than a scheduled event on purpose: this is the
/// long tail of a trading day, and it should read as a list rather than as a
/// stack of cards competing with the dates above it.
class _FiledRow extends StatelessWidget {
  const _FiledRow({required this.filing, required this.parentTab});

  final FiledFiling filing;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final title = filing.titleFor(arabic);

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
              width: 54,
              child: Text(
                filing.ticker ?? '—',
                style: BarbarianType.labelS.copyWith(
                  color: filing.ticker == null ? c.textFaint : c.accent,
                ),
              ),
            ),
            Expanded(
              child: Text(
                _trim(title),
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

  /// The heading with the "(TICK.CA)" cut out — the ticker is already its own
  /// column, and printing it twice costs the width the title needs.
  static String _trim(String title) => title
      .replaceAll(RegExp(r'\s*\([A-Z0-9]+\.CA\)\s*'), ' ')
      .trim();
}
