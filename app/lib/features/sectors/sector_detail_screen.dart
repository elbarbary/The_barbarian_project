import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/data/sourced.dart';
import '../../core/models/sector.dart';
import '../../core/models/sector_report.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/legal.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';
import 'sector_bits.dart';

/// One sector in full: the read, the movement of every metric it can measure,
/// the medians a typical company sits at, the companies with the most measures
/// moving together, and every member. Every figure is a count or a median —
/// there is no sector grade, and the members are listed by how many of their
/// own measures are improving, never ranked as a tip (§8).
class SectorDetailScreen extends ConsumerWidget {
  const SectorDetailScreen({
    required this.slug,
    required this.parentTab,
    super.key,
  });

  final String slug;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);

    return BDetailScaffold(
      blockGap: 22,
      children: [
        Row(
          children: [
            BSoftIconButton(
              icon: Icons.arrow_back_ios_new_rounded,
              semanticLabel: l.back,
              onTap: () => Navigator.of(context).maybePop(),
            ),
          ],
        ),
        BAsyncView<Sourced<SectorReport>>(
          value: ref.watch(sectorProvider(slug)),
          data: (sourced) => _Body(report: sourced.value, parentTab: parentTab),
          loading: const BSkeletonBlock(height: 320, radius: BarbarianRadius.lg),
        ),
        const BLegalFootnote(),
      ],
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.report, required this.parentTab});

  final SectorReport report;
  final BNavTab parentTab;

  String? _medianText(String key) {
    for (final m in report.medians) {
      if (m.key == key) return sectorFigure(m.value, m.unit, m.key);
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final read = report.readFor(arabic);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          sectorLabel(report.sector, l),
          style: BarbarianType.displayS.copyWith(color: c.textPrimary),
        ),
        const SizedBox(height: 6),
        Text(
          '${l.sectorCompanyCount(report.companies)} · '
          '${l.sectorScreenAsOf(report.generated)}',
          style: BarbarianType.bodyS.copyWith(color: c.textFaint),
        ),

        // The read — the sector's story before its counts.
        const SizedBox(height: 22),
        BPaperCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l.sectorReadLabel.toUpperCase(),
                style: BarbarianType.labelNano.copyWith(
                  color: c.textMuted,
                  letterSpacing: 0.6,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                read ?? _fallbackRead(l),
                style: BarbarianType.bodyM.copyWith(
                  color: c.textPrimary,
                  height: 1.55,
                ),
              ),
            ],
          ),
        ),

        // How its companies are moving — every measurable metric.
        if (report.movement.isNotEmpty) ...[
          const SizedBox(height: 24),
          BSectionLabel(l.sectorMovingLabel),
          BPaperCard(
            child: Column(
              children: [
                for (var i = 0; i < report.movement.length; i++) ...[
                  BSectorMovementRow(
                    movement: report.movement[i],
                    trailing: _medianText(report.movement[i].key),
                  ),
                  if (i != report.movement.length - 1)
                    const SizedBox(height: 16),
                ],
              ],
            ),
          ),
        ],

        // Typical for the sector — the medians, including any without movement.
        if (report.medians.isNotEmpty) ...[
          const SizedBox(height: 24),
          BSectionLabel(l.sectorMediansLabel),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final m in report.medians)
                _MedianTile(median: m),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            l.sectorMedianNote,
            style: BarbarianType.bodyS.copyWith(color: c.textFaint, height: 1.45),
          ),
        ],

        // Standouts — the companies with the most measures moving together.
        if (report.standouts.isNotEmpty) ...[
          const SizedBox(height: 24),
          BSectionLabel(l.sectorStandoutLabel),
          for (final s in report.standouts)
            _CompanyRow(
              ticker: s.ticker,
              name: s.nameFor(arabic),
              trailing: l.sectorMeasuresImproving(s.improving, s.readable),
              parentTab: parentTab,
            ),
        ],

        // Every company in the sector.
        if (report.members.isNotEmpty) ...[
          const SizedBox(height: 24),
          BSectionLabel(l.sectorMembersLabel),
          BPaperCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (final m in report.members)
                  _CompanyRow(
                    ticker: m.ticker,
                    name: m.nameFor(arabic),
                    trailing: m.hasPattern
                        ? l.sectorMeasuresImproving(m.improving, m.readable)
                        : l.sectorNotEnoughHistory,
                    peer: m.peer,
                    dense: true,
                    parentTab: parentTab,
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  String _fallbackRead(AppLocalizations l) {
    final lead = report.movement.firstWhere(
      (m) => m.key == 'assets',
      orElse: () => report.movement.isEmpty
          ? const SectorMovement()
          : report.movement.first,
    );
    return l.sectorReadFallback(
      lead.rising,
      report.companies,
      lead.falling,
      sectorMetricLabel(lead.key, l),
    );
  }
}

class _MedianTile extends StatelessWidget {
  const _MedianTile({required this.median});

  final SectorMedian median;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(BarbarianRadius.md),
        border: Border.all(color: c.hairline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            sectorMetricLabel(median.key, l),
            style: BarbarianType.labelNano.copyWith(color: c.textMuted),
          ),
          const SizedBox(height: 3),
          BNumText(
            sectorFigure(median.value, median.unit, median.key),
            style: BarbarianType.titleS.copyWith(color: c.textPrimary),
          ),
        ],
      ),
    );
  }
}

/// A company row — a standout or a member — that opens its review sheet.
class _CompanyRow extends StatelessWidget {
  const _CompanyRow({
    required this.ticker,
    required this.name,
    required this.trailing,
    required this.parentTab,
    this.peer,
    this.dense = false,
  });

  final String ticker;
  final String name;
  final String trailing;
  final String? peer;
  final bool dense;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;

    return BPressable(
      onTap: () => context.push(Routes.companyPath(parentTab, ticker)),
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: dense ? 14 : 0,
          vertical: dense ? 12 : 8,
        ),
        decoration: dense
            ? BoxDecoration(
                border: Border(bottom: BorderSide(color: c.hairline, width: 0.5)),
              )
            : null,
        // Ticker and name on the first line, the reading beneath it. The
        // reading ("3 of 5 measures improving", "Not enough history…") is too
        // long to sit on the right of a narrow row without running off the
        // edge, so it lives under the name where it has the full width and can
        // ellipsize instead of overflow.
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 52,
              child: Text(
                ticker,
                style: BarbarianType.labelS.copyWith(color: c.accent),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: BarbarianType.bodyS.copyWith(color: c.textSecondary),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    trailing,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: BarbarianType.labelNano.copyWith(color: c.textMuted),
                  ),
                ],
              ),
            ),
            if (peer != null) ...[
              const SizedBox(width: 10),
              Text(
                peer == 'above' ? l.revAboveSector : l.revBelowSector,
                style: BarbarianType.labelNano.copyWith(color: c.textFaint),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
