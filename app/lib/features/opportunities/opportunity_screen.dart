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

/// The two halves of the report.
///
/// A sector read answers a different question from a single-name read — "is
/// something moving through this whole group" rather than "does this company
/// deserve a look" — and it scores nothing on the rubric. Sharing a screen made
/// it look like one more card in the ranking. It gets its own tab.
enum _Tab { stocks, sector }

/// The stocks tab's four sections. "Record" is the published outcome list —
/// the half of the series that most places delete.
enum _Section { qualified, watching, rejected, record }

class _OpportunityScreenState extends ConsumerState<OpportunityScreen> {
  _Tab _tab = _Tab.stocks;
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

            final sector = report.sector;
            final hasSector = sector != null && !sector.isEmpty;

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
                const SizedBox(height: 18),
                _ScannerTabs(
                  active: _tab,
                  stocksCount: report.qualifiedCount + report.watchingCount,
                  sectorCount: hasSector ? sector.members.length : 0,
                  onChanged: (t) => setState(() => _tab = t),
                ),
                const SizedBox(height: 20),
                if (_tab == _Tab.sector)
                  if (report.sector case final SectorContext sector)
                    if (!sector.isEmpty)
                      _SectorTab(sector: sector)
                    else
                      const _NoSector()
                  else
                    const _NoSector()
                else ...[
                  if (report.headline case final String h) ...[
                    BPaperCard(
                      radius: BarbarianRadius.xl,
                      child: Text(
                        h,
                        style: BarbarianType.headlineL.copyWith(
                          color: c.textPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                  ],
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
            // When the report's narrative for a name was a model position, say
            // so. A card that has a score and no reasoning looks broken; a card
            // that says why the reasoning is absent is doing its job.
            if (entry.positionWithheld) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.fromLTRB(13, 11, 13, 12),
                decoration: BoxDecoration(
                  color: c.hairline,
                  borderRadius: BorderRadius.circular(BarbarianRadius.md),
                  border: Border(
                    left: BorderSide(color: c.textFaint, width: 3),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'NOT REPUBLISHED',
                      style: BarbarianType.labelNano.copyWith(color: c.textMuted),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "The report's note on this name describes a model "
                      'position — a size and a price. ESTHMR is not licensed to '
                      'republish that, so the score and the evidence are here '
                      'and the position is not.',
                      style: BarbarianType.bodyM.copyWith(
                        color: c.textSecondary,
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            // The decision leads, the way the report itself now leads with it.
            // A reader scanning eight cards wants "wait, and here is why" before
            // they want a score out of thirteen.
            if (entry.action?.decision case final String decision) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.fromLTRB(13, 11, 13, 12),
                decoration: BoxDecoration(
                  color: c.violet.withValues(alpha: c.isDark ? 0.15 : 0.08),
                  borderRadius: BorderRadius.circular(BarbarianRadius.md),
                  border: Border(
                    left: BorderSide(
                      color: c.violet.withValues(alpha: 0.55),
                      width: 3,
                    ),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      (entry.action?.label ?? 'Action now').toUpperCase(),
                      style: BarbarianType.labelNano.copyWith(color: c.violet),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      decision,
                      style: BarbarianType.bodyL.copyWith(
                        color: c.textPrimary,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (entry.action?.reasoning.firstOrNull ?? entry.researchSummary
                case final String s) ...[
              const SizedBox(height: 12),
              Text(
                s,
                style: BarbarianType.bodyM.copyWith(
                  color: c.textSecondary,
                  height: 1.5,
                ),
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
///
/// The record outlives the listing. MKIT was compulsorily delisted while its
/// result was still on the board, so its row survives a ticker the exchange no
/// longer carries — and tapping it opened a company screen that could only fail
/// to load. A row whose company is not in the directory is shown, and is not a
/// link: the note already says what happened to it.
class _OutcomeCard extends ConsumerWidget {
  const _OutcomeCard({required this.outcome, required this.parentTab});

  final ScanOutcome outcome;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final up = outcome.isUp;
    // Absent only once the directory has actually arrived. While it is still
    // loading every row would otherwise go dead for a frame, and a link that
    // appears late reads as a glitch.
    final directory = ref.watch(companyDirectoryProvider).value?.value;
    final listed =
        directory == null || directory.byTicker(outcome.ticker) != null;

    return BPressable(
      onTap: listed
          ? () => context.push(Routes.companyPath(parentTab, outcome.ticker))
          : null,
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

/// The report's two halves, as a top-level switch.
///
/// Deliberately heavier than the section row beneath it: they sit at different
/// levels, and reusing [BSegmentedRow] for both made "Sector" look like a peer
/// of "Rejected" rather than a peer of every stock on the list. Each half
/// carries its own count, so the choice says what is behind it.
class _ScannerTabs extends StatelessWidget {
  const _ScannerTabs({
    required this.active,
    required this.stocksCount,
    required this.sectorCount,
    required this.onChanged,
  });

  final _Tab active;
  final int stocksCount;
  final int sectorCount;
  final ValueChanged<_Tab> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _ScannerTab(
            icon: Icons.filter_center_focus_rounded,
            label: 'Stocks',
            count: stocksCount,
            caption: 'Ranked names',
            selected: active == _Tab.stocks,
            onTap: () => onChanged(_Tab.stocks),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _ScannerTab(
            icon: Icons.hub_outlined,
            label: 'Sector',
            count: sectorCount,
            caption: sectorCount == 0 ? 'None today' : 'One cohort',
            selected: active == _Tab.sector,
            onTap: () => onChanged(_Tab.sector),
          ),
        ),
      ],
    );
  }
}

class _ScannerTab extends StatelessWidget {
  const _ScannerTab({
    required this.icon,
    required this.label,
    required this.count,
    required this.caption,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final int count;
  final String caption;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // Selection is carried by fill, border and weight together, never by
    // colour alone (spec §42); the Semantics `selected` flag carries it for a
    // screen reader.
    final tone = selected ? c.accent : c.textMuted;

    return Semantics(
      button: true,
      selected: selected,
      label: '$label, $count',
      excludeSemantics: true,
      child: BPressable(
        onTap: onTap,
        child: AnimatedContainer(
          duration: BarbarianMotion.standard,
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 13),
          decoration: BoxDecoration(
            color: selected
                ? c.accent.withValues(alpha: c.isDark ? 0.18 : 0.09)
                : c.surface,
            borderRadius: BorderRadius.circular(BarbarianRadius.lg),
            border: Border.all(
              color: selected
                  ? c.accent.withValues(alpha: 0.42)
                  : c.glassBorder,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, size: 17, color: tone),
                  const SizedBox(width: 8),
                  Text(
                    label,
                    style: BarbarianType.labelS.copyWith(
                      color: selected ? c.textPrimary : c.textSecondary,
                    ),
                  ),
                  const Spacer(),
                  BNumText(
                    '$count',
                    style: BarbarianType.figureS.copyWith(color: tone),
                    isolate: false,
                  ),
                ],
              ),
              const SizedBox(height: 3),
              Text(
                caption,
                style: BarbarianType.labelNano.copyWith(color: c.textMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The sector tab.
///
/// A whole screen rather than a card, because a cohort read has a shape: a
/// claim, the names it covers, and the trail of evidence that led there. The
/// report's own framing — "zero qualification points" — leads, so nobody can
/// mistake a sector read for a ranking.
class _SectorTab extends StatelessWidget {
  const _SectorTab({required this.sector});

  final SectorContext sector;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // The claim, on the feature surface — this is the one thing on the tab
        // that is an assertion rather than a record.
        BDarkCard(
          radius: BarbarianRadius.xl,
          padding: const EdgeInsets.all(22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (sector.kicker case final String kicker)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Text(
                    kicker.toUpperCase(),
                    style: BarbarianType.labelNano.copyWith(
                      color: c.accentOnInk,
                    ),
                  ),
                ),
              Text(
                sector.title,
                style: BarbarianType.displayS.copyWith(color: c.onInk),
              ),
              if (sector.thesis case final String thesis) ...[
                const SizedBox(height: 12),
                Text(
                  thesis,
                  style: BarbarianType.bodyL.copyWith(color: c.onInkMuted),
                ),
              ],
            ],
          ),
        ),
        if (sector.members.isNotEmpty) ...[
          const SizedBox(height: 22),
          BSectionLabel('The cohort · ${sector.members.length} names'),
          for (var i = 0; i < sector.members.length; i++) ...[
            _SectorMemberRow(member: sector.members[i]),
            if (i != sector.members.length - 1) const SizedBox(height: 8),
          ],
        ],
        if (sector.timeline.isNotEmpty) ...[
          const SizedBox(height: 22),
          const BSectionLabel('How it was read'),
          BPaperCard(
            radius: BarbarianRadius.xl,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
            child: Column(
              children: [
                for (var i = 0; i < sector.timeline.length; i++)
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    foregroundDecoration: i == sector.timeline.length - 1
                        ? null
                        : BHairline.rowBottom(context),
                    child: _SectorFactRow(
                      fact: sector.timeline[i],
                      step: i + 1,
                      isLast: i == sector.timeline.length - 1,
                    ),
                  ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 18),
        // Said plainly rather than left to be inferred from the kicker.
        BPaperCard(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.info_outline_rounded, size: 17, color: c.textMuted),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'A sector read changes what gets investigated first. It '
                  'scores nothing on the rubric, and none of these names has '
                  'qualified on its own evidence.',
                  style: BarbarianType.bodyS.copyWith(color: c.textMuted),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Shown when the report carries no cohort — most days.
class _NoSector extends StatelessWidget {
  const _NoSector();

  @override
  Widget build(BuildContext context) => const BEmptyState(
    title: 'No sector read today',
    body:
        'A cohort appears when several names in one industry move for the '
        'same reason. Most days none does, and that is a result rather than '
        'a gap.',
  );
}

/// One member of the cohort, given a row rather than a chip.
class _SectorMemberRow extends StatelessWidget {
  const _SectorMemberRow({required this.member});

  final SectorMember member;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return BPaperCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          BTickerMonogram(member.ticker, size: 40),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  member.ticker,
                  style: BarbarianType.labelS.copyWith(color: c.textPrimary),
                ),
                if (member.role case final String role) ...[
                  const SizedBox(height: 3),
                  Text(
                    role,
                    style: BarbarianType.bodyS.copyWith(color: c.textMuted),
                  ),
                ],
              ],
            ),
          ),
          if (member.price case final String price)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                BNumText(
                  price,
                  style: BarbarianType.figureS.copyWith(color: c.textPrimary),
                  isolate: false,
                ),
                if (member.qualifier case final String q) ...[
                  const SizedBox(height: 2),
                  Text(
                    q.replaceAll(RegExp(r'^[·\s]+'), ''),
                    style: BarbarianType.labelNano.copyWith(color: c.textMuted),
                  ),
                ],
              ],
            ),
        ],
      ),
    );
  }
}

/// One step of the evidence trail, numbered.
///
/// The rows are a sequence — a leader moved, a peer confirmed, a filing landed
/// — and numbering them says so. Read as an unordered list they looked like
/// four unrelated facts.
class _SectorFactRow extends StatelessWidget {
  const _SectorFactRow({
    required this.fact,
    required this.step,
    required this.isLast,
  });

  final SectorFact fact;
  final int step;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: c.violet.withValues(alpha: c.isDark ? 0.20 : 0.11),
            shape: BoxShape.circle,
            border: Border.all(color: c.violet.withValues(alpha: 0.30)),
          ),
          child: Text(
            '$step',
            style: BarbarianType.labelNano.copyWith(color: c.violet),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                fact.label.toUpperCase(),
                style: BarbarianType.labelNano.copyWith(color: c.textMuted),
              ),
              const SizedBox(height: 4),
              Text(
                fact.value,
                style: BarbarianType.bodyL.copyWith(color: c.textPrimary),
              ),
              if (fact.detail case final String detail) ...[
                const SizedBox(height: 3),
                Text(
                  detail,
                  style: BarbarianType.bodyS.copyWith(color: c.textSecondary),
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
