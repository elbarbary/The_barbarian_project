import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/recency.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// The lead card: today's scanner status.
class BScannerHero extends ConsumerWidget {
  const BScannerHero({this.parentTab = BNavTab.today, super.key});

  /// Which navigation slot stays lit when the scanner opens from here. It
  /// lived on Today and hard-coded that; it is on Home now.
  final BNavTab parentTab;

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
          onTap: () => context.push(Routes.scannerPath(parentTab)),
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
                          // Was the literal string 'OPPORTUNITY SCANNER',
                          // which meant an Arabic reader met an English label
                          // here whatever the locale said — and it survived
                          // the rename because a hardcoded string is invisible
                          // to the ARB.
                          l.scannerTitle.toUpperCase(),
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
                  BStalenessCaption(
                    l.updatedOn(context.dayMonthIso(d)),
                    onDark: true,
                  ),
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
            // Two lines, not one. At one line "Cleared every rule" and
            // "Cleared some rules" both truncated to "CLEARED", so the hero
            // showed two different counts under the same word.
            Text(
              label.toUpperCase(),
              style: BarbarianType.labelTiny.copyWith(
                color: c.onInkMuted,
                height: 1.3,
              ),
              maxLines: 2,
            ),
          ],
        ),
      ),
    );
  }
}
