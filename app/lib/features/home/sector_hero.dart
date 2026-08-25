import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/sector.dart';
import '../../core/models/sector_report.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/nav.dart';
import '../../l10n/app_localizations.dart';
import '../sectors/sector_bits.dart';

/// The home card for the sector view — the market hero's literate sibling.
///
/// It leads with one sector's read, rotated deterministically each build so it
/// reads as a front-of-book editorial rota, never "the sector to buy" (§8), and
/// pairs the breadth bar with the count in words so colour never stands alone
/// (§42). Tapping it opens the whole section.
class BSectorHero extends ConsumerWidget {
  const BSectorHero({required this.parentTab, super.key});

  final BNavTab parentTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = ref.watch(sectorsProvider).value?.value;
    if (index == null) {
      return const BSkeletonBlock(height: 150, radius: BarbarianRadius.xl);
    }
    final featured = index.featuredSector;
    if (featured == null) return const SizedBox.shrink();
    return _Card(index: index, featured: featured, parentTab: parentTab);
  }
}

class _Card extends StatelessWidget {
  const _Card({
    required this.index,
    required this.featured,
    required this.parentTab,
  });

  final SectorIndex index;
  final SectorSummary featured;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final lead = featured.lead;
    final total = lead.read;

    Widget seg(int value, Color colour) => Expanded(
      flex: value <= 0 ? 0 : value,
      child: value <= 0
          ? const SizedBox.shrink()
          : Padding(
              padding: const EdgeInsetsDirectional.only(end: 3),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: ColoredBox(color: colour),
              ),
            ),
    );

    return BPressable(
      onTap: () => context.push(Routes.sectorsPath(parentTab)),
      child: BDarkCard(
        radius: BarbarianRadius.xl,
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    l.sectorHeroLabel.toUpperCase(),
                    style: BarbarianType.labelNano.copyWith(
                      color: c.onInkMuted,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
                Icon(Icons.arrow_outward_rounded, size: 15, color: c.onInkMuted),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              sectorLabel(featured.sector, l),
              style: BarbarianType.labelS.copyWith(color: c.onInkMuted),
            ),
            const SizedBox(height: 6),
            Text(
              featured.readTeaser,
              style: BarbarianType.bodyM.copyWith(color: c.onInk, height: 1.5),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            if (total > 0) ...[
              const SizedBox(height: 16),
              SizedBox(
                height: 8,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    seg(lead.rising, c.direction(true, onInkSurface: true)),
                    seg(lead.flat, c.onInkMuted),
                    seg(lead.falling, c.direction(false, onInkSurface: true)),
                  ],
                ),
              ),
              const SizedBox(height: 9),
              Text(
                l.sectorHeroMoving(
                  lead.rising,
                  total,
                  sectorMetricLabel(lead.key, l).toLowerCase(),
                ),
                style: BarbarianType.bodyS.copyWith(color: c.onInkMuted),
              ),
            ],
            const SizedBox(height: 12),
            Text(
              l.sectorHeroFoot(index.sectorCount, index.generated),
              style: BarbarianType.labelNano.copyWith(color: c.onInkMuted),
            ),
          ],
        ),
      ),
    );
  }
}
