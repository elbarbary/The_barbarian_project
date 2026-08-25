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

/// The whole market, read one sector at a time.
///
/// A company page answers "how is this one company moving". This steps back:
/// for each sector, how many of its companies are moving each way, and where a
/// typical one sits. Built entirely from figures the review sheet already
/// computes — per-company directions and the sector medians — so it carries no
/// new claim, and nothing here is a view on what to buy (§8). Sectors are
/// ordered by how many companies they hold, a structural fact, never by how
/// they are moving.
class SectorScreen extends ConsumerWidget {
  const SectorScreen({required this.parentTab, super.key});

  final BNavTab parentTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;

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
        BScreenTitle(l.sectorScreenTitle),
        Text(
          l.sectorScreenDek,
          style: BarbarianType.bodyM.copyWith(color: c.textSecondary, height: 1.5),
        ),
        BAsyncView<Sourced<SectorIndex>>(
          value: ref.watch(sectorsProvider),
          data: (sourced) => _Body(index: sourced.value, parentTab: parentTab),
          loading: const _Loading(),
        ),
        const BLegalFootnote(),
      ],
    );
  }
}

class _Loading extends StatelessWidget {
  const _Loading();

  @override
  Widget build(BuildContext context) => const Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      BSkeletonBlock(height: 132, radius: BarbarianRadius.lg),
      SizedBox(height: 12),
      BSkeletonBlock(height: 132, radius: BarbarianRadius.lg),
    ],
  );
}

class _Body extends StatelessWidget {
  const _Body({required this.index, required this.parentTab});

  final SectorIndex index;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    if (index.sectors.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (index.generated.isNotEmpty) ...[
          Text(
            l.sectorScreenAsOf(index.generated),
            style: BarbarianType.labelNano.copyWith(color: c.textFaint),
          ),
          const SizedBox(height: 4),
          Text(
            l.sectorScreenMethod,
            style: BarbarianType.bodyS.copyWith(color: c.textFaint, height: 1.45),
          ),
          const SizedBox(height: 16),
        ],
        for (final summary in index.sectors) ...[
          _SectorCard(summary: summary, parentTab: parentTab),
          const SizedBox(height: 12),
        ],
        if (index.heldBack.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            l.sectorHeldBack(
              index.heldBack.map((h) => sectorLabel(h.sector, l)).join('، '),
            ),
            style: BarbarianType.bodyS.copyWith(color: c.textFaint, height: 1.5),
          ),
        ],
        const SizedBox(height: 16),
        const _DoesNotShow(),
      ],
    );
  }
}

/// One sector, story-first: the read teaser, then how its companies are moving.
class _SectorCard extends StatelessWidget {
  const _SectorCard({required this.summary, required this.parentTab});

  final SectorSummary summary;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;

    return BPressable(
      onTap: () => context.push(
        Routes.sectorDetailPath(parentTab, summary.slug),
      ),
      child: BPaperCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    sectorLabel(summary.sector, l),
                    style: BarbarianType.titleM.copyWith(color: c.textPrimary),
                  ),
                ),
                Text(
                  l.sectorCompanyCount(summary.companies),
                  style: BarbarianType.labelNano.copyWith(color: c.textFaint),
                ),
                const SizedBox(width: 6),
                Icon(Icons.chevron_right_rounded, size: 18, color: c.textFaint),
              ],
            ),
            if (summary.readTeaser.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                summary.readTeaser,
                style: BarbarianType.bodyM.copyWith(
                  color: c.textSecondary,
                  height: 1.5,
                ),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (summary.movement.isNotEmpty) ...[
              const SizedBox(height: 16),
              for (final m in summary.movement) ...[
                BSectorMovementRow(movement: m),
                const SizedBox(height: 12),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

/// The honest floor, stated on the screen: the lines the exchange never files,
/// so the app never invents them (§50).
class _DoesNotShow extends StatefulWidget {
  const _DoesNotShow();

  @override
  State<_DoesNotShow> createState() => _DoesNotShowState();
}

class _DoesNotShowState extends State<_DoesNotShow> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        BInlineAction(
          l.sectorDoesNotShowTitle,
          onTap: () => setState(() => _open = !_open),
        ),
        if (_open) ...[
          const SizedBox(height: 8),
          Text(
            l.sectorDoesNotShowBody,
            style: BarbarianType.bodyS.copyWith(color: c.textFaint, height: 1.5),
          ),
        ],
      ],
    );
  }
}
