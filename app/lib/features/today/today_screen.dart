import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/company.dart';
import '../../core/models/opportunity.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/charts.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/legal.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
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
        const _MarketPulse(),
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
    final c = context.colors;
    final report = ref.watch(opportunityReportProvider).value?.value;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const BScreenTitle('Today'),
        const SizedBox(height: 6),
        Text(
          report?.reportDate == null
              ? 'The board has not published yet'
              : 'Published after the ${_dayMonth(report!.reportDate!)} session',
          style: BarbarianType.bodyM.copyWith(color: c.textMuted),
        ),
      ],
    );
  }

  static String _dayMonth(DateTime d) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return '${d.day} ${months[d.month - 1]}';
  }
}
/// The lead card: today's scanner status.
class _ScannerHero extends ConsumerWidget {
  const _ScannerHero();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final async = ref.watch(opportunityReportProvider);

    return BAsyncView(
      value: async,
      loading: const BSkeletonBlock(height: 220, radius: BarbarianRadius.xl),
      errorTitle: 'Scanner not downloaded yet',
      errorBody: 'Open the app with a connection to fetch the latest report.',
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
                    const BDarkCircleButton(
                      icon: Icons.arrow_outward_rounded,
                      semanticLabel: 'Open the scanner',
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  report.headline ?? 'What deserves investigation now',
                  style: BarbarianType.headlineL.copyWith(
                    color: c.onInk,
                    height: 1.18,
                  ),
                ),
                if (report.lead case final ScannedCompany lead) ...[
                  const SizedBox(height: 18),
                  _LeadName(lead: lead),
                ],
                const SizedBox(height: 14),
                Row(
                  children: [
                    _ScanCount(
                      value: report.qualifiedCount,
                      label: 'Qualified',
                      // The ink pair: c.up reads 2.87:1 here, beside an
                      // accentOnInk at 7.16 and an onInkMuted at 4.95, so the
                      // row went two colours and a smudge.
                      tone: c.upOnInk,
                    ),
                    const SizedBox(width: 10),
                    _ScanCount(
                      value: report.watchingCount,
                      label: 'Watching',
                      tone: c.accentOnInk,
                    ),
                    const SizedBox(width: 10),
                    _ScanCount(
                      value: report.outcomes.length,
                      label: 'Outcomes',
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

/// The top-scored name on today's watch.
///
/// Carries its own price history as a sparkline — the canvas puts a chart
/// inside the hero, and this is the one series here that is real. Evidence and
/// rank, never an instruction (spec §8).
class _LeadName extends ConsumerWidget {
  const _LeadName({required this.lead});

  final ScannedCompany lead;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final history =
        ref.watch(priceHistoryProvider(lead.ticker)).whenOrNull(
          data: (s) => s.value,
        ) ??
        const <PricePoint>[];
    final spark = history.length > 2
        ? history
              .sublist(history.length > 40 ? history.length - 40 : 0)
              .map((p) => p.close)
              .toList()
        : const <double>[];

    return Container(
      padding: const EdgeInsets.fromLTRB(15, 14, 15, 14),
      decoration: BoxDecoration(
        color: c.onInk.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(BarbarianRadius.md),
        border: Border.all(color: c.onInk.withValues(alpha: 0.10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                lead.ticker,
                style: BarbarianType.titleL.copyWith(color: c.onInk),
              ),
              const SizedBox(width: 9),
              // The chip takes the slack rather than competing with a Spacer,
              // which was clipping "Persistent watch" to "Persistent w…".
              if (lead.statusLabel case final String label)
                Expanded(
                  child: Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: c.accentOnInk.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(
                        BarbarianRadius.pill,
                      ),
                    ),
                      child: Text(
                        label,
                        style: BarbarianType.pill.copyWith(
                          color: c.accentOnInk,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                )
              else
                const Spacer(),
              const SizedBox(width: 8),
              _ScoreDial(score: lead.score, max: lead.maxScore),
            ],
          ),
          if (spark.length > 1) ...[
            const SizedBox(height: 12),
            BSparkline(values: spark, height: 30, color: c.accentOnInk),
          ],
          if (lead.researchSummary case final String summary) ...[
            const SizedBox(height: 12),
            Text(
              summary,
              style: BarbarianType.bodyS.copyWith(
                color: c.onInkMuted,
                height: 1.5,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}

/// The score as a filled track plus the figure — the rank is the point, so it
/// gets a shape rather than sitting as another number in a row of numbers.
class _ScoreDial extends StatelessWidget {
  const _ScoreDial({required this.score, required this.max});

  final int score;
  final int max;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final fraction = max <= 0 ? 0.0 : (score / max).clamp(0.0, 1.0);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 34,
          height: 4,
          child: Stack(
            children: [
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: c.onInk.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              FractionallySizedBox(
                widthFactor: fraction,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: c.accentOnInk,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 9),
        BNumText(
          '$score/$max',
          style: BarbarianType.figureS.copyWith(color: c.onInk),
        ),
      ],
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
/// number does.
class _MarketPulse extends ConsumerWidget {
  const _MarketPulse();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final snapshot = ref.watch(livePricesProvider);
    if (snapshot == null || snapshot.isEmpty) return const SizedBox.shrink();

    var up = 0, down = 0, flat = 0;
    for (final q in snapshot.stocks.values) {
      final change = q.resolvedChange;
      if (change == null || change == 0) {
        flat++;
      } else if (change > 0) {
        up++;
      } else {
        down++;
      }
    }
    final total = up + down + flat;
    if (total == 0) return const SizedBox.shrink();

    return BPressable(
      onTap: () => selectTab(context, BNavTab.today),
      child: BPaperCard(
        radius: BarbarianRadius.xl,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            BSectionLabel(
              'The session',
              trailing: Text(
                snapshot.date,
                style: BarbarianType.labelS.copyWith(color: c.textMuted),
              ),
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                BNumText(
                  '$up',
                  style: BarbarianType.displayL.copyWith(color: c.up),
                ),
                const SizedBox(width: 8),
                Text(
                  'rose',
                  style: BarbarianType.bodyM.copyWith(color: c.textMuted),
                ),
                const Spacer(),
                BNumText(
                  '$down',
                  style: BarbarianType.displayS.copyWith(color: c.down),
                ),
                const SizedBox(width: 8),
                Text(
                  'fell',
                  style: BarbarianType.bodyM.copyWith(color: c.textMuted),
                ),
              ],
            ),
            const SizedBox(height: 14),
            // One bar, three shares — the shape of the day at a glance.
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: SizedBox(
                height: 8,
                // stretch, or a ColoredBox with no intrinsic size collapses to
                // zero height and the whole bar disappears.
                // A 2pt paper gap between the shares. Forest and brick are
                // 1.03:1 apart, so on a session where nothing closed unchanged
                // the two segments abutted and the bar read as one solid rule
                // — the counts above it were the only thing saying otherwise.
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (up > 0) Expanded(flex: up, child: ColoredBox(color: c.up)),
                    if (up > 0 && (flat > 0 || down > 0))
                      SizedBox(width: 2, child: ColoredBox(color: c.surface)),
                    if (flat > 0)
                      Expanded(
                        flex: flat,
                        // Not `hairlineStrong`: an 18% ink is 1.45:1 against
                        // the card and against the paper gaps either side, so
                        // the unchanged share was a hole rather than a share.
                        child: ColoredBox(
                          color: c.textPrimary.withValues(alpha: 0.30),
                        ),
                      ),
                    if (flat > 0 && down > 0)
                      SizedBox(width: 2, child: ColoredBox(color: c.surface)),
                    if (down > 0)
                      Expanded(flex: down, child: ColoredBox(color: c.down)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              '$total companies · $flat unchanged',
              style: BarbarianType.bodyS.copyWith(color: c.textFaint),
            ),
          ],
        ),
      ),
    );
  }
}
