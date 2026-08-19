import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/opportunity.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/legal.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import 'opportunity_screen.dart';

/// The full record behind one scanned name.
///
/// The list card is a summary; this is everything the report published about
/// it — the whole rationale rather than two clipped lines, its rank, the date
/// it was first seen, its sources, and the scoring rubric so the reader can
/// see what "8/13" is out of.
///
/// Still no entry, target or stop: those are stripped at ingestion (spec §8).
class ScannedDetailSheet extends ConsumerWidget {
  const ScannedDetailSheet({
    required this.entry,
    required this.rubric,
    required this.scoring,
    required this.parentTab,
    super.key,
  });

  final ScannedCompany entry;
  final List<RubricComponent> rubric;
  final ScoringGuide scoring;
  final BNavTab parentTab;

  /// Opened as a sheet rather than a route: it is a detail *about* the card,
  /// and the reader should come straight back to the list they were scanning.
  static Future<void> open(
    BuildContext context, {
    required ScannedCompany entry,
    required List<RubricComponent> rubric,
    required ScoringGuide scoring,
    required BNavTab parentTab,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      // The floating navigation is drawn by the router's shell, above the
      // branch navigator — so a sheet pushed on the branch renders *under* it
      // and the bottom action ends up behind the glass. The root navigator is
      // above the shell.
      useRootNavigator: true,
      builder: (_) => ScannedDetailSheet(
        entry: entry,
        rubric: rubric,
        scoring: scoring,
        parentTab: parentTab,
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;

    return DraggableScrollableSheet(
      initialChildSize: 0.86,
      minChildSize: 0.5,
      maxChildSize: 0.96,
      expand: false,
      builder: (context, controller) => DecoratedBox(
        decoration: BoxDecoration(
          color: c.background,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(BarbarianRadius.xl),
          ),
        ),
        child: ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 40),
          children: [
            Center(
              child: Container(
                width: 42,
                height: 4,
                margin: const EdgeInsets.only(bottom: 18),
                decoration: BoxDecoration(
                  color: c.hairlineStrong,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                BTickerMonogram(entry.ticker, size: 46),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entry.ticker,
                        style: BarbarianType.displayS.copyWith(
                          color: c.textPrimary,
                        ),
                      ),
                      if (entry.statusLabel case final String label) ...[
                        const SizedBox(height: 6),
                        Builder(
                          builder: (context) {
                            final tone = BarbarianPalette.scanStatus(c, label);
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 11,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: tone.withValues(
                                  alpha: c.isDark ? 0.20 : 0.13,
                                ),
                                borderRadius: BorderRadius.circular(
                                  BarbarianRadius.pill,
                                ),
                                border: Border.all(
                                  color: tone.withValues(alpha: 0.35),
                                ),
                              ),
                              child: Text(
                                label,
                                style: BarbarianType.pill.copyWith(
          color: BarbarianPalette.onWash(c, tone),
        ),
                              ),
                            );
                          },
                        ),
                      ],
                    ],
                  ),
                ),
                _ScoreBlock(entry: entry),
              ],
            ),
            if (entry.seenAt case final String seen) ...[
              const SizedBox(height: 14),
              BStalenessCaption('First seen · $seen'),
            ],
            if (entry.headline case final String h) ...[
              const SizedBox(height: 20),
              Text(
                h,
                style: BarbarianType.headlineM.copyWith(color: c.textPrimary),
              ),
            ],
            if (entry.action case final ScanAction action) ...[
              const SizedBox(height: 20),
              BPaperCard(
                radius: BarbarianRadius.xl,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      (action.label ?? 'What the rule produced')
                          .toUpperCase(),
                      style: BarbarianType.labelNano.copyWith(color: c.iris),
                    ),
                    if (action.decision case final String decision) ...[
                      const SizedBox(height: 6),
                      Text(
                        decision,
                        style: BarbarianType.headlineM.copyWith(
                          color: c.textPrimary,
                        ),
                      ),
                    ],
                    for (final para in action.reasoning) ...[
                      const SizedBox(height: 12),
                      Text(
                        para,
                        style: BarbarianType.bodyM.copyWith(
                          color: c.textSecondary,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
            if (entry.tape case final ScanTape tape) ...[
              const SizedBox(height: 16),
              BPaperCard(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tape.label ?? 'Last completed session',
                            style: BarbarianType.labelNano.copyWith(
                              color: c.textMuted,
                            ),
                          ),
                          if (tape.detail case final String detail) ...[
                            const SizedBox(height: 4),
                            Text(
                              detail,
                              style: BarbarianType.bodyS.copyWith(
                                color: c.textSecondary,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (tape.price case final String price) ...[
                      const SizedBox(width: 12),
                      BNumText(
                        price,
                        style: BarbarianType.figureS.copyWith(
                          color: c.textPrimary,
                        ),
                        isolate: false,
                      ),
                    ],
                  ],
                ),
              ),
            ],
            if (entry.gates.isNotEmpty) ...[
              const SizedBox(height: 22),
              const BSectionLabel('What was checked'),
              BScanGates(gates: entry.gates),
            ],
            if (entry.research.isNotEmpty) ...[
              const SizedBox(height: 22),
              const BSectionLabel('Evidence'),
              BPaperCard(
                radius: BarbarianRadius.xl,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (var i = 0; i < entry.research.length; i++) ...[
                      if (i > 0) const SizedBox(height: 18),
                      if (entry.research[i].heading case final String h) ...[
                        Text(
                          h,
                          style: BarbarianType.labelS.copyWith(
                            color: c.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 6),
                      ],
                      for (final para in entry.research[i].body) ...[
                        Text(
                          para,
                          style: BarbarianType.bodyM.copyWith(
                            color: c.textSecondary,
                          ),
                        ),
                        if (para != entry.research[i].body.last)
                          const SizedBox(height: 10),
                      ],
                    ],
                  ],
                ),
              ),
            ],
            if (entry.researchSummary case final String summary) ...[
              const SizedBox(height: 16),
              BPaperCard(
                radius: BarbarianRadius.xl,
                child: Text(
                  summary,
                  style: BarbarianType.bodyL.copyWith(color: c.textSecondary),
                ),
              ),
            ],
            if (entry.movePercent case final String move) ...[
              const SizedBox(height: 14),
              BPaperCard(
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Move since it was flagged',
                        style: BarbarianType.bodyM.copyWith(
                          color: c.textMuted,
                        ),
                      ),
                    ),
                    BChangeDelta(
                      value: move.replaceAll(RegExp(r'^[+-]'), ''),
                      direction: move.startsWith('-')
                          ? BDirection.down
                          : BDirection.up,
                      style: BarbarianType.figureS,
                      gap: 4,
                    ),
                  ],
                ),
              ),
            ],
            if (entry.sources.isNotEmpty) ...[
              const SizedBox(height: 22),
              const BSectionLabel('Sources'),
              BPaperCard(
                radius: BarbarianRadius.xl,
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Column(
                  children: [
                    for (var i = 0; i < entry.sources.length; i++)
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        foregroundDecoration: i == entry.sources.length - 1
                            ? null
                            : BHairline.rowBottom(context),
                        child: Row(
                          children: [
                            Icon(
                              entry.sources[i].isLinked
                                  ? Icons.link_rounded
                                  : Icons.description_outlined,
                              size: 15,
                              color: c.textFaint,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                entry.sources[i].name,
                                style: BarbarianType.bodyM.copyWith(
                                  color: c.textPrimary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
            if (rubric.isNotEmpty) ...[
              const SizedBox(height: 22),
              const BSectionLabel('How a name is scored'),
              if (scoring.bands.isNotEmpty) ...[
                _ScaleCard(scoring: scoring, score: entry.score),
                const SizedBox(height: 12),
              ],
              _Rubric(rubric: rubric),
              for (final note in scoring.notes) ...[
                const SizedBox(height: 12),
                Text(
                  note,
                  style: BarbarianType.bodyM.copyWith(
                    color: c.textSecondary,
                    height: 1.55,
                  ),
                ),
              ],
            ],
            const SizedBox(height: 22),
            BPressable(
              onTap: () {
                Navigator.of(context).pop();
                context.push(Routes.companyPath(parentTab, entry.ticker));
              },
              child: Container(
                alignment: Alignment.center,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: c.actionSurface,
                  borderRadius: BorderRadius.circular(BarbarianRadius.pill),
                ),
                child: Text(
                  'Open ${entry.ticker}',
                  style: BarbarianType.label.copyWith(color: c.onAction),
                ),
              ),
            ),
            const SizedBox(height: 18),
            const BLegalFootnote(),
          ],
        ),
      ),
    );
  }
}

/// The scale the score sits on: worst, the research line, best — and where
/// this name falls. Without it "8/13" is a number with no frame.
class _ScaleCard extends StatelessWidget {
  const _ScaleCard({required this.scoring, required this.score});

  final ScoringGuide scoring;
  final int score;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final worst = scoring.worst;
    final best = scoring.best;
    final span = (best - worst).abs();
    double at(int v) => span == 0 ? 0.5 : ((v - worst) / span).clamp(0.0, 1.0);
    final line = scoring.researchLine;

    return BPaperCard(
      radius: BarbarianRadius.xl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LayoutBuilder(
            builder: (context, box) => SizedBox(
              height: 40,
              child: Stack(
                alignment: Alignment.centerLeft,
                children: [
                  Container(
                    height: 6,
                    decoration: BoxDecoration(
                      color: c.hairline,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                  // Everything above the research line.
                  if (line != null)
                    PositionedDirectional(
                      start: box.maxWidth * at(line.score),
                      width: box.maxWidth * (1 - at(line.score)),
                      child: Container(
                        height: 6,
                        decoration: BoxDecoration(
                          // 35% forest on an 8%-ink track is 1.40:1 — the
                          // "above the line" segment stopped separating from
                          // the track it is measured against.
                          color: c.up.withValues(alpha: 0.60),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                  if (line != null)
                    PositionedDirectional(
                      start: box.maxWidth * at(line.score) - 1,
                      child: Container(width: 2, height: 18, color: c.up),
                    ),
                  PositionedDirectional(
                    start: (box.maxWidth * at(score) - 8).clamp(
                      0.0,
                      box.maxWidth - 16,
                    ),
                    child: Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        color: c.accent,
                        shape: BoxShape.circle,
                        border: Border.all(color: c.surface, width: 3),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          for (final band in scoring.bands)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 38,
                    child: BNumText(
                      band.score > 0 ? '+${band.score}' : '${band.score}',
                      style: BarbarianType.figureS.copyWith(
                        color: band.score >= 0 ? c.up : c.down,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      band.label,
                      style: BarbarianType.bodyM.copyWith(
                        color: c.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _ScoreBlock extends StatelessWidget {
  const _ScoreBlock({required this.entry});

  final ScannedCompany entry;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        BNumText(
          '${entry.score}',
          style: BarbarianType.displayS.copyWith(color: c.accent),
        ),
        Text(
          'of ${entry.maxScore}',
          style: BarbarianType.labelTiny.copyWith(
            color: c.textFaint,
            letterSpacing: 0,
          ),
        ),
      ],
    );
  }
}

/// The nine components, credits above penalties, each with its weight.
class _Rubric extends StatelessWidget {
  const _Rubric({required this.rubric});

  final List<RubricComponent> rubric;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final credits = rubric.where((r) => r.isCredit).toList();
    final penalties = rubric.where((r) => !r.isCredit).toList();

    Widget row(RubricComponent r, bool last) => Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      foregroundDecoration: last ? null : BHairline.rowBottom(context),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 34,
            child: BNumText(
              r.weight > 0 ? '+${r.weight}' : '${r.weight}',
              style: BarbarianType.figureS.copyWith(
                color: r.isCredit ? c.up : c.down,
              ),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  r.label,
                  style: BarbarianType.bodyM.copyWith(color: c.textPrimary),
                ),
                if (r.detail case final String d) ...[
                  const SizedBox(height: 3),
                  Text(
                    d,
                    style: BarbarianType.bodyS.copyWith(
                      color: c.textMuted,
                      height: 1.4,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BPaperCard(
          radius: BarbarianRadius.xl,
          padding: const EdgeInsets.symmetric(horizontal: 18),
          child: Column(
            children: [
              for (var i = 0; i < credits.length; i++)
                row(credits[i], i == credits.length - 1),
            ],
          ),
        ),
        if (penalties.isNotEmpty) ...[
          const SizedBox(height: 12),
          BPaperCard(
            radius: BarbarianRadius.xl,
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Column(
              children: [
                for (var i = 0; i < penalties.length; i++)
                  row(penalties[i], i == penalties.length - 1),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
