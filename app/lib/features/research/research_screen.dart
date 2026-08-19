import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/cash_or_trash.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/legal.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
/// Research: every study the series has published, and the record it keeps.
///
/// This is Home's lower half given its own destination — the Cash or Trash
/// investigations and the spread of their scores, then the studies themselves.
/// On Home they were the fourth and fifth things on a scroll; they are the
/// reason the app exists.
class ResearchScreen extends ConsumerWidget {
  const ResearchScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isSample = ref.watch(isSampleDataProvider);

    return BScreenScaffold(
      blockGap: 22,
      children: [
        const BScreenTitle(
          'Research',
          subtitle: 'Every study, and what happened after it',
        ),
        const _CashOrTrashStrip(),
        const _LatestResearch(),
        if (isSample) const Center(child: BSampleDataNotice()),
        const BLegalFootnote(),
      ],
    );
  }
}
class _CashOrTrashStrip extends ConsumerWidget {
  const _CashOrTrashStrip();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final async = ref.watch(cashOrTrashProvider);

    return BAsyncView(
      value: async,
      loading: const BSkeletonBlock(height: 96, radius: BarbarianRadius.xl),
      errorTitle: 'The pillar index is not downloaded',
      errorBody: 'Open once with a connection.',
      data: (sourced) {
        final index = sourced.value;
        return BPressable(
          onTap: () => context.push(Routes.cashOrTrashPath(BNavTab.research)),
          child: BPaperCard(
            radius: BarbarianRadius.xl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Six Pillars',
                            style: BarbarianType.headlineM.copyWith(
                              color: c.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${index.studiedCount} of ${index.total} '
                            'companies investigated',
                            style: BarbarianType.bodyM.copyWith(
                              color: c.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.chevron_right_rounded,
                      color: c.textMuted,
                      size: 22,
                    ),
                  ],
                ),
                if (index.companies.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  _VerdictSpectrum(index: index),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Every studied company placed on the Trash-to-Cash axis.
///
/// The series' whole identity is a signed score, so the preview shows the
/// spread rather than four counts: you can see at a glance that most of what
/// has been read so far sits left of centre.
class _VerdictSpectrum extends StatelessWidget {
  const _VerdictSpectrum({required this.index});

  final CashOrTrashIndex index;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    const min = CashOrTrashEntry.minScore;
    const max = CashOrTrashEntry.maxScore;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        LayoutBuilder(
          builder: (context, box) => SizedBox(
            height: 30,
            child: Stack(
              alignment: Alignment.centerLeft,
              children: [
                Container(
                  height: 4,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        BarbarianPalette.verdict(c, Verdict.toxic)
                            .withValues(alpha: 0.6),
                        BarbarianPalette.verdict(c, Verdict.recyclable)
                            .withValues(alpha: 0.45),
                        BarbarianPalette.verdict(c, Verdict.cash)
                            .withValues(alpha: 0.6),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                // Zero, so left-of-centre reads as left-of-centre.
                PositionedDirectional(
                  start: box.maxWidth / 2 - 0.5,
                  child: Container(width: 1, height: 14, color: c.hairlineStrong),
                ),
                // Each dot is a company at its score. The band's hue is not
                // the carrier here — Cash and Toxic sit at 1.03:1, and the dot
                // has no label beside it — so the *position* on the axis is,
                // and the spoken label states the band and the score outright.
                for (final entry in index.companies)
                  PositionedDirectional(
                    start: (box.maxWidth * entry.gaugeFraction - 5).clamp(
                      0.0,
                      box.maxWidth - 10,
                    ),
                    child: Semantics(
                      label:
                          '${entry.ticker}, ${entry.verdict.label}, '
                          'score ${entry.score}',
                      child: Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: BarbarianPalette.verdict(c, entry.verdict),
                          shape: BoxShape.circle,
                          border: Border.all(color: c.surface, width: 2),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Trash $min',
              style: BarbarianType.labelTiny.copyWith(
                color: c.textFaint,
                letterSpacing: 0,
              ),
            ),
            Text(
              '+$max Cash',
              style: BarbarianType.labelTiny.copyWith(
                color: c.textFaint,
                letterSpacing: 0,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _LatestResearch extends ConsumerWidget {
  const _LatestResearch();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = ref
        .watch(cashOrTrashProvider)
        .whenOrNull(data: (s) => s.value);
    final entries = index?.companies ?? const <CashOrTrashEntry>[];
    if (entries.isEmpty) return const SizedBox.shrink();

    final recent = [...entries]
      ..sort((a, b) => (b.studiedAt ?? '').compareTo(a.studiedAt ?? ''));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const BSectionLabel('Latest research'),
        SizedBox(
          height: 210,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.zero,
            itemCount: recent.length.clamp(0, 5),
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, i) {
              final entry = recent[i];
              return BResearchCard(
                width: 250,
                titleMaxLines: 2,
                kicker: 'Six Pillars',
                title: entry.summary?.isNotEmpty ?? false
                    ? entry.summary!
                    : '${entry.ticker}: the complete study',
                meta: entry.studiedAt,
                trailing: BVerdictBadge(
                  verdict: entry.verdict,
                  score: entry.score,
                  onDark: true,
                ),
                onTap: () =>
                    context.push(Routes.companyPath(BNavTab.research, entry.ticker)),
              );
            },
          ),
        ),
      ],
    );
  }
}
