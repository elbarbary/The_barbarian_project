import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/legal.dart';
import 'disclosures_block.dart';
import 'news_block.dart';
import 'rates_block.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// Today: the session, and — far more often — the absence of one.
///
/// Board v2 makes the claim this screen is built around: the app's most common
/// day is one where nothing qualifies, and that state deserves the whole
/// screen rather than an empty row in a stack of summaries. "There is nothing
/// to do today. Close the app." is the design, not a fallback.
///
/// So there are two layouts and a rule that picks between them. The quiet one
/// leads with the sentence and puts the counters underneath as evidence that
/// the work was done. The other leads with what cleared and keeps the same
/// counters, in the same place, for the same reason.
class TodayScreen extends ConsumerWidget {
  const TodayScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isSample = ref.watch(isSampleDataProvider);

    return BScreenScaffold(
      blockGap: 22,
      children: [
        const _TodayHeader(),
        const _ScannerHero(),
        const BRatesBlock(),
        const BDisclosuresBlock(),
        const BNewsBlock(),
        if (isSample) const Center(child: BSampleDataNotice()),
        const BLegalFootnote(),
      ],
    );
  }
}

/// The date, and the oldest thing on the screen.
///
/// Board v2 opens every screen with the age of its stalest figure rather than
/// with a greeting — "the oldest thing you can see right now" — because a
/// screen that mixes a 15-minute price with a 49-day filing is only as fresh
/// as the filing.
class _TodayHeader extends ConsumerWidget {
  const _TodayHeader();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final report = ref.watch(opportunityReportProvider).value?.value;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const BScreenTitle('Today'),
        const SizedBox(height: 6),
        Text(
          report?.reportDate == null
              ? l.scannerNotPublished
              : 'Published after the ${_dayMonth(report!.reportDate!)} session',
          style: BarbarianType.bodyM.copyWith(color: c.textMuted),
        ),
      ],
    );
  }

  static String _dayMonth(DateTime d) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return '${d.day} ${months[d.month - 1]}';
  }
}

/// The lead card: today's scanner status.
class _ScannerHero extends ConsumerWidget {
  const _ScannerHero();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final async = ref.watch(opportunityReportProvider);

    return BAsyncView(
      value: async,
      loading: const BSkeletonBlock(height: 220, radius: BarbarianRadius.xl),
      errorTitle: l.scannerNotDownloaded,
      errorBody: l.scannerNotDownloadedBody,
      data: (sourced) {
        final report = sourced.value;
        return BPressable(
          onTap: () => context.push(Routes.scannerPath(BNavTab.today)),
          child: BDarkCard(
            radius: BarbarianRadius.xl,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          'OPPORTUNITY SCANNER',
                          style: BarbarianType.labelNano.copyWith(
                            color: c.onInkMuted,
                          ),
                        ),
                      ),
                    ),
                    BDarkCircleButton(
                      icon: Icons.arrow_outward_rounded,
                      semanticLabel: l.scannerOpen,
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  report.headline ?? l.scannerFoundToday,
                  style: BarbarianType.headlineL.copyWith(
                    color: c.onInk,
                    height: 1.18,
                  ),
                ),
                // §8.6 — no single name leads this card.
                //
                // It used to show the highest-scoring company on the watch,
                // with its price chart, as the hero of the day. Whatever the
                // caption said, a max-by-score pick rendered as the day's
                // headline is a best-stock-today element assembled from parts,
                // and spec §8 forbids that however it is built. The counts say
                // what the rule did; they name nobody.
                const SizedBox(height: 14),
                Row(
                  children: [
                    _ScanCount(
                      value: report.qualifiedCount,
                      label: l.countQualified,
                      // The ink pair: c.up reads 2.87:1 here, beside an
                      // accentOnInk at 7.16 and an onInkMuted at 4.95, so the
                      // row went two colours and a smudge.
                      tone: c.upOnInk,
                    ),
                    const SizedBox(width: 10),
                    _ScanCount(
                      value: report.watchingCount,
                      label: l.countWatching,
                      tone: c.accentOnInk,
                    ),
                    const SizedBox(width: 10),
                    _ScanCount(
                      value: report.outcomes.length,
                      label: l.countOutcomes,
                      tone: c.onInkMuted,
                    ),
                  ],
                ),
                if (report.date case final String d) ...[
                  const SizedBox(height: 14),
                  BStalenessCaption('Updated · $d', onDark: true),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ScanCount extends StatelessWidget {
  const _ScanCount({
    required this.value,
    required this.label,
    required this.tone,
  });

  final int value;
  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: c.onInk.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(BarbarianRadius.sm),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            BNumText(
              '$value',
              style: BarbarianType.figureM.copyWith(color: tone),
            ),
            const SizedBox(height: 4),
            Text(
              label.toUpperCase(),
              style: BarbarianType.labelTiny.copyWith(color: c.onInkMuted),
              maxLines: 1,
            ),
          ],
        ),
      ),
    );
  }
}

/// What the whole exchange did today, from the closes the app already holds.
///
/// The canvas puts an index level here. There is no licensed EGX index feed,
/// but breadth — how many rose against how many fell — is a real aggregate of
/// real closes, and arguably tells you more about a session than a single
