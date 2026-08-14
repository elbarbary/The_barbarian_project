import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/opportunity.dart';
import 'scanned_detail.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';

/// The Opportunity Scanner (spec §7, §8).
///
/// Two rules shape this screen:
///
///  * **Rejected names are never hidden.** They get the same treatment as the
///    qualified ones, because the record of what failed the test is the point
///    of the series (spec §7).
///  * **No trading semantics.** No entry, no target, no stop, no expected
///    return, no "best stock today" (spec §8). What is shown is the catalyst,
///    the evidence, the rubric and the sources.
class OpportunityScreen extends ConsumerStatefulWidget {
  const OpportunityScreen({required this.parentTab, super.key});

  final BNavTab parentTab;

  @override
  ConsumerState<OpportunityScreen> createState() => _OpportunityScreenState();
}

/// The screen's four sections. "Record" is the published outcome list — the
/// half of the series that most places delete.
enum _Section { qualified, watching, rejected, record }

class _OpportunityScreenState extends ConsumerState<OpportunityScreen> {
  _Section _section = _Section.watching;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final async = ref.watch(opportunityReportProvider);
    final isSample = ref.watch(isSampleDataProvider);

    return BDetailScaffold(
      blockGap: 18,
      children: [
        Row(
          children: [
            BSoftIconButton(
              icon: Icons.arrow_back_ios_new_rounded,
              semanticLabel: 'Back',
              onTap: () => Navigator.of(context).maybePop(),
            ),
          ],
        ),
        BAsyncView(
          value: async,
          errorTitle: 'No scanner report downloaded yet',
          errorBody:
              'The scanner publishes after each session. Open this once with '
              'a connection and the latest report stays on the device.',
          data: (sourced) {
            final report = sourced.value;

            if (report.isEmpty) {
              return const BEmptyState(
                title: 'The scanner has not run today',
                body:
                    'Nothing has cleared the test since the last session. '
                    'That is a result, not an error.',
              );
            }

            final entries = switch (_section) {
              _Section.qualified => report.qualified,
              _Section.watching => report.watching,
              _Section.rejected => report.rejected,
              _Section.record => const <ScannedCompany>[],
            };

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const BScreenTitle(
                  'Opportunity Scanner',
                  subtitle: 'What deserves investigation now',
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 10,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    BStalenessCaption(
                      report.reportDate == null
                          ? 'Report date unknown'
                          : 'Updated · ${_formatDate(report.reportDate!)}',
                    ),
                    if (isSample) const BSampleDataNotice(),
                  ],
                ),
                if (report.headline case final String h) ...[
                  const SizedBox(height: 18),
                  BPaperCard(
                    radius: BarbarianRadius.xl,
                    child: Text(
                      h,
                      style: BarbarianType.headlineL.copyWith(
                        color: c.textPrimary,
                      ),
                    ),
                  ),
                ],
                if (report.sector case final SectorContext sector)
                  if (!sector.isEmpty) ...[
                    const SizedBox(height: 18),
                    _SectorCard(sector: sector),
                  ],
                const SizedBox(height: 18),
                _CoverageStrip(report: report),
                const SizedBox(height: 18),
                BSegmentedRow(
                  segments: [
                    BSegment(label: 'Qualified ${report.qualifiedCount}'),
                    BSegment(label: 'Watch ${report.watchingCount}'),
                    BSegment(label: 'Rejected ${report.rejectedCount}'),
                    BSegment(label: 'Record ${report.outcomes.length}'),
                  ],
                  selectedIndex: _Section.values.indexOf(_section),
                  onChanged: (i) =>
                      setState(() => _section = _Section.values[i]),
                ),
                const SizedBox(height: 14),
                Text(switch (_section) {
                  _Section.qualified =>
                    'Cleared the test. Worth reading the filing.',
                  _Section.watching =>
                    'Ranked accumulation watch. Something is there, but the '
                        'evidence is incomplete.',
                  _Section.rejected =>
                    'Failed the test, and kept on the record.',
                  _Section.record =>
                    'What actually happened to every name the scanner '
                        'flagged — the misses included. This is the half most '
                        'places delete.',
                }, style: BarbarianType.bodyM.copyWith(color: c.textMuted)),
                const SizedBox(height: 16),
                if (_section == _Section.record)
                  if (report.outcomes.isEmpty)
                    const BEmptyState(
                      title: 'No outcomes published yet',
                      body:
                          'Results appear here as each flagged name resolves.',
                    )
                  else
                    for (final outcome in report.outcomes) ...[
                      _OutcomeCard(
                        outcome: outcome,
                        parentTab: widget.parentTab,
                      ),
                      const SizedBox(height: 10),
                    ]
                else if (entries.isEmpty)
                  BEmptyState(
                    title: switch (_section) {
                      _Section.qualified => 'Nothing qualified today',
                      _Section.watching => 'Nothing on the watch list',
                      _ => 'Nothing was rejected today',
                    },
                    body:
                        'An empty section is a real answer. The test does not '
                        'lower its bar to fill a page.',
                  )
                else
                  for (final entry in entries) ...[
                    _ScannedCard(
                      entry: entry,
                      parentTab: widget.parentTab,
                      rubric: report.rubric,
                      scoring: report.scoring,
                    ),
                    const SizedBox(height: 12),
                  ],
              ],
            );
          },
        ),
      ],
    );
  }

  static String _formatDate(DateTime d) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${d.day} ${months[d.month - 1]} ${d.year}';
  }
}

class _CoverageStrip extends StatelessWidget {
  const _CoverageStrip({required this.report});

  final OpportunityReport report;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final coverage = report.coverage;

    return BDarkCard(
      radius: BarbarianRadius.xl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const BSectionLabel('Coverage', onDark: true),
          Row(
            children: [
              _CoverageStat(value: '${coverage.thndr}', label: 'Tradable'),
              _CoverageStat(value: '${coverage.egx}', label: 'Listed'),
              _CoverageStat(
                value: '${coverage.adjustedHistories}',
                label: 'Adjusted',
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Every listed company is read. Most of them fail, and the ones '
            'that fail are published too.',
            style: BarbarianType.bodyS.copyWith(color: c.onInkMuted),
          ),
        ],
      ),
    );
  }
}

class _CoverageStat extends StatelessWidget {
  const _CoverageStat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          BNumText(
            value,
            style: BarbarianType.figureL.copyWith(color: c.onInk),
          ),
          const SizedBox(height: 4),
          Text(
            label.toUpperCase(),
            style: BarbarianType.labelTiny.copyWith(color: c.onInkMuted),
          ),
        ],
      ),
    );
  }
}

class _ScannedCard extends StatelessWidget {
  const _ScannedCard({
    required this.entry,
    required this.parentTab,
    required this.rubric,
    required this.scoring,
  });

  final ScannedCompany entry;
  final BNavTab parentTab;
  final List<RubricComponent> rubric;
  final ScoringGuide scoring;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return BPressable(
      // The card is a summary; the sheet is the whole published record.
      onTap: () => ScannedDetailSheet.open(
        context,
        entry: entry,
        rubric: rubric,
        scoring: scoring,
        parentTab: parentTab,
      ),
      child: BPaperCard(
        radius: BarbarianRadius.xl,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                BTickerMonogram(entry.ticker, size: 44),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            entry.ticker,
                            style: BarbarianType.titleL.copyWith(
                              color: c.textPrimary,
                            ),
                          ),
                          if (entry.statusLabel case final String label) ...[
                            const SizedBox(width: 8),
                            Flexible(child: _StatusChip(label: label)),
                          ],
                        ],
                      ),
                      if (entry.headline case final String h) ...[
                        const SizedBox(height: 3),
                        Text(
                          h,
                          style: BarbarianType.bodyS.copyWith(
                            color: c.textMuted,
                            height: 1.3,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                _RubricScore(entry: entry),
              ],
            ),
            if (entry.catalyst case final String cat) ...[
              const SizedBox(height: 14),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const BKindChip('Catalyst', variant: BChipVariant.ember),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      cat,
                      style: BarbarianType.bodyM.copyWith(color: c.textPrimary),
                    ),
                  ),
                ],
              ),
            ],
            if (entry.researchSummary case final String s) ...[
              const SizedBox(height: 12),
              Text(
                s,
                style: BarbarianType.bodyM.copyWith(color: c.textSecondary),
              ),
            ],
            // The gates say *why* a name scores what it scores, which is the
            // question the score itself provokes. Worth the room on the card
            // rather than only inside the sheet.
            if (entry.gates.isNotEmpty) ...[
              const SizedBox(height: 12),
              BScanGates(gates: entry.gates),
            ],
            if (entry.scores.breakdown.any((e) => e.value != 0)) ...[
              const SizedBox(height: 14),
              _RubricBreakdown(scores: entry.scores),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Text(
                  'Full record',
                  style: BarbarianType.labelS.copyWith(color: c.accent),
                ),
                const SizedBox(width: 4),
                Icon(Icons.chevron_right_rounded, size: 16, color: c.accent),
              ],
            ),
            if (entry.sources.isNotEmpty) ...[
              const SizedBox(height: 14),
              const BSectionLabel('Sources', bottomGap: 8),
              for (final source in entry.sources)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Icon(
                        source.isLinked
                            ? Icons.link_rounded
                            : Icons.description_outlined,
                        size: 14,
                        color: c.textFaint,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          source.name,
                          style: BarbarianType.bodyS.copyWith(
                            color: c.textMuted,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

/// One published result. The return is a record of what happened, not a
/// forward-looking claim — and a loss is shown exactly like a gain.
class _OutcomeCard extends StatelessWidget {
  const _OutcomeCard({required this.outcome, required this.parentTab});

  final ScanOutcome outcome;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final up = outcome.isUp;

    return BPressable(
      onTap: () => context.push(Routes.companyPath(parentTab, outcome.ticker)),
      scale: 0.99,
      child: BPaperCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                BTickerMonogram(outcome.ticker, size: 38),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Only when the row covers more than one company: the
                      // monogram already carries a single ticker, but it cannot
                      // show that "ARVA / AMII" was one result.
                      if (outcome.label case final String pair) ...[
                        Text(
                          pair,
                          style: BarbarianType.labelS.copyWith(
                            color: c.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                      ],
                      Text(
                        outcome.statusLabel ?? '',
                        style: BarbarianType.labelS.copyWith(
                          color: BarbarianPalette.scanStatus(
                            c,
                            outcome.statusLabel,
                          ),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (outcome.returnPercent case final String r)
                  BChangeDelta(
                    value: r.replaceAll(RegExp(r'^[+-]'), ''),
                    direction: up ? BDirection.up : BDirection.down,
                    style: BarbarianType.figureS,
                    gap: 4,
                  ),
              ],
            ),
            if (outcome.note case final String n) ...[
              const SizedBox(height: 10),
              Text(
                n,
                style: BarbarianType.bodyM.copyWith(color: c.textSecondary),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// The report's status wording in its own colour — persistent watch, tape
/// watch and a denial are different things and should not all read as orange.
class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final tone = BarbarianPalette.scanStatus(c, label);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: c.isDark ? 0.20 : 0.13),
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
        border: Border.all(color: tone.withValues(alpha: 0.35)),
      ),
      child: Text(
        label,
        style: BarbarianType.pill.copyWith(color: tone),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}

class _RubricScore extends StatelessWidget {
  const _RubricScore({required this.entry});

  final ScannedCompany entry;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final colour = switch (entry.scanStatus) {
      ScanStatus.qualified => c.up,
      ScanStatus.watching => c.accent,
      ScanStatus.rejected => c.down,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        BNumText(
          '${entry.score}',
          style: BarbarianType.figureL.copyWith(color: colour),
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

/// The rubric, with penalties shown as penalties.
class _RubricBreakdown extends StatelessWidget {
  const _RubricBreakdown({required this.scores});

  final ScanScores scores;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final items = scores.breakdown.where((e) => e.value != 0).toList();

    if (items.isEmpty) {
      return Text(
        'No rubric component scored.',
        style: BarbarianType.bodyS.copyWith(color: c.textFaint),
      );
    }

    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final item in items)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: (item.value > 0 ? c.up : c.down).withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(BarbarianRadius.pill),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  item.label,
                  style: BarbarianType.pill.copyWith(color: c.textSecondary),
                ),
                const SizedBox(width: 6),
                BNumText(
                  item.value > 0 ? '+${item.value}' : '${item.value}',
                  style: BarbarianType.pill.copyWith(
                    color: item.value > 0 ? c.up : c.down,
                  ),
                  isolate: false,
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// A cohort the report read as one story.
///
/// Given its own card rather than folded into a note, because "four names moved
/// together for one reason" is a different kind of finding from "this company
/// did something" — and because the report's own framing is that it scores
/// nothing. That framing leads, so nobody reads the card as a recommendation.
class _SectorCard extends StatelessWidget {
  const _SectorCard({required this.sector});

  final SectorContext sector;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return BPaperCard(
      radius: BarbarianRadius.xl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (sector.kicker case final String kicker)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                kicker.toUpperCase(),
                style: BarbarianType.labelNano.copyWith(color: c.violet),
              ),
            ),
          Text(
            sector.title,
            style: BarbarianType.headlineM.copyWith(color: c.textPrimary),
          ),
          if (sector.thesis case final String thesis) ...[
            const SizedBox(height: 10),
            Text(
              thesis,
              style: BarbarianType.bodyM.copyWith(color: c.textSecondary),
            ),
          ],
          if (sector.members.isNotEmpty) ...[
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final member in sector.members)
                  _SectorMemberChip(member: member),
              ],
            ),
          ],
          if (sector.timeline.isNotEmpty) ...[
            const SizedBox(height: 16),
            for (var i = 0; i < sector.timeline.length; i++)
              Container(
                padding: EdgeInsets.only(
                  top: i == 0 ? 0 : 10,
                  bottom: i == sector.timeline.length - 1 ? 0 : 10,
                ),
                foregroundDecoration: i == sector.timeline.length - 1
                    ? null
                    : BHairline.rowBottom(context),
                child: _SectorFactRow(fact: sector.timeline[i]),
              ),
          ],
        ],
      ),
    );
  }
}

class _SectorMemberChip extends StatelessWidget {
  const _SectorMemberChip({required this.member});

  final SectorMember member;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.fromLTRB(11, 8, 11, 9),
      decoration: BoxDecoration(
        color: c.violet.withValues(alpha: c.isDark ? 0.16 : 0.09),
        borderRadius: BorderRadius.circular(BarbarianRadius.sm),
        border: Border.all(color: c.violet.withValues(alpha: 0.28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                member.ticker,
                style: BarbarianType.labelS.copyWith(color: c.textPrimary),
              ),
              if (member.price case final String price) ...[
                const SizedBox(width: 8),
                BNumText(
                  price,
                  style: BarbarianType.bodyS.copyWith(color: c.textSecondary),
                  isolate: false,
                ),
              ],
            ],
          ),
          if (member.role case final String role) ...[
            const SizedBox(height: 3),
            Text(
              role,
              style: BarbarianType.labelNano.copyWith(color: c.textMuted),
            ),
          ],
        ],
      ),
    );
  }
}

class _SectorFactRow extends StatelessWidget {
  const _SectorFactRow({required this.fact});

  final SectorFact fact;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 92,
          child: Text(
            fact.label,
            style: BarbarianType.labelNano.copyWith(color: c.textMuted),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                fact.value,
                style: BarbarianType.bodyM.copyWith(color: c.textPrimary),
              ),
              if (fact.detail case final String detail) ...[
                const SizedBox(height: 2),
                Text(
                  detail,
                  style: BarbarianType.bodyS.copyWith(color: c.textMuted),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// The report's evidence checklist for one name.
///
/// Each line states what was checked and how it came out, with a mark as well
/// as a colour so the result survives without it (spec §42).
class BScanGates extends StatelessWidget {
  const BScanGates({required this.gates, this.onDark = false, super.key});

  final List<ScanGate> gates;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    if (gates.isEmpty) return const SizedBox.shrink();
    final c = context.colors;

    return Wrap(
      spacing: 7,
      runSpacing: 7,
      children: [
        for (final gate in gates)
          Builder(
            builder: (context) {
              final tone = switch (gate.outcome) {
                'pass' => c.up,
                'fail' => c.down,
                _ => onDark ? c.accentOnInk : c.violet,
              };
              final mark = switch (gate.outcome) {
                'pass' => '✓',
                'fail' => '✕',
                _ => '!',
              };
              // The glyph carries the outcome for a sighted reader; a screen
              // reader hears it as punctuation or skips it entirely, leaving
              // the chip's tint as the only signal — which is exactly what
              // spec §42 forbids. Say it in words instead.
              final spoken = switch (gate.outcome) {
                'pass' => 'Passed',
                'fail' => 'Failed',
                _ => 'Unresolved',
              };
              return Semantics(
                label: '$spoken: ${gate.label}',
                excludeSemantics: true,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(9, 5, 11, 6),
                  // A gate label is a sentence fragment — "Closed too far from
                  // the high" — and on a 320pt screen the longest of them is
                  // wider than the column. Bounding the chip lets the label wrap
                  // inside it instead of overflowing the row.
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.sizeOf(context).width - 76,
                  ),
                  decoration: BoxDecoration(
                    color: tone.withValues(alpha: c.isDark ? 0.16 : 0.10),
                    borderRadius: BorderRadius.circular(BarbarianRadius.md),
                    border: Border.all(color: tone.withValues(alpha: 0.30)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        mark,
                        style: BarbarianType.labelNano.copyWith(color: tone),
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          gate.label,
                          style: BarbarianType.bodyS.copyWith(
                            color: onDark ? c.onInk : c.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }
}
