import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/market_history.dart';
import '../../core/models/rates.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/charts.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/explainer_sheet.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// The first thing on Home: what the whole exchange did today, on one card.
///
/// It replaces two stacked blocks — a rail of three index cards under one
/// heading and a breadth card under another — which between them were four
/// paragraphs and eleven figures on a flat beige ground, and read as a
/// document rather than as a screen. The information was right and the
/// presentation had no anchor: a reader opening the app met a greeting, a
/// search box, and then prose.
///
/// One dark card instead. The EGX 30 leads at display size with its own year
/// of closes behind it, the other two indices sit beside it as supporting
/// figures, and the day's breadth runs underneath as a bar a reader can take
/// in without counting. Colour does the work that sentences were doing.
class BMarketHero extends ConsumerWidget {
  const BMarketHero({this.parentTab = BNavTab.home, super.key});

  /// Which navigation slot stays lit when the full screen opens from here.
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;

    final rates = ref.watch(ratesProvider).whenOrNull(data: (s) => s.value);
    final history = ref
        .watch(marketHistoryProvider)
        .whenOrNull(data: (s) => s.value);
    final indices = rates?.indices ?? const <RateRow>[];
    final breadth = history?.latest?.breadth;

    if (indices.isEmpty && breadth == null) {
      return const BSkeletonBlock(height: 220, radius: BarbarianRadius.xl);
    }

    final lead = indices.isEmpty ? null : indices.first;
    final rest = indices.length > 1 ? indices.sublist(1) : const <RateRow>[];

    return BPressable(
      // The card used to open the EGX 30's explainer sheet, which explained
      // one of the three numbers on it and answered none of the questions the
      // card provokes: what the other two indices have been doing, which
      // shares actually moved, whether today was wide or narrow against the
      // sessions before it. It opens the screen that answers those. The
      // explainer is still one tap away — on the number itself, there.
      onTap: () => context.push(Routes.exchangePath(parentTab)),
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
                    l.heroLabel.toUpperCase(),
                    style: BarbarianType.labelNano.copyWith(
                      color: c.onInkMuted,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
                // A card that opens a screen has to look like one. Without a
                // mark this reads as a panel of figures, and the whole of the
                // session's detail sits behind a tap nobody makes.
                Icon(
                  Icons.arrow_outward_rounded,
                  size: 15,
                  color: c.onInkMuted,
                ),
              ],
            ),
            if (lead != null) ...[
              const SizedBox(height: 14),
              _Lead(
                index: lead,
                series: history?.levelsOf(lead.id) ?? const [],
              ),
            ],
            if (rest.isNotEmpty) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  for (final (i, index) in rest.take(2).indexed) ...[
                    if (i > 0) const SizedBox(width: 12),
                    Expanded(
                      child: _Second(index: index, arabic: arabic),
                    ),
                  ],
                ],
              ),
            ],
            if (breadth != null && !breadth.isEmpty) ...[
              const SizedBox(height: 18),
              _Breadth(breadth: breadth),
            ],
          ],
        ),
      ),
    );
  }
}

/// The headline index, at the size a headline gets.
class _Lead extends StatelessWidget {
  const _Lead({required this.index, required this.series});

  final RateRow index;
  final List<double> series;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final level = index.level;
    final change = index.changePercent;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                index.labelFor(arabic).isEmpty
                    ? index.id
                    : index.labelFor(arabic),
                style: BarbarianType.labelTiny.copyWith(
                  color: c.onInkMuted,
                  letterSpacing: 0.6,
                ),
                maxLines: 1,
              ),
              const SizedBox(height: 6),
              // The one number on the screen that is allowed to be this big.
              BDottedUnderline(
                onDark: true,
                child: BNumText(
                  level == null ? '—' : grouped(level),
                  style: BarbarianType.displayS.copyWith(color: c.onInk),
                ),
              ),
              if (change != null) ...[
                const SizedBox(height: 8),
                BChangeDelta(
                  value: '${change.abs().toStringAsFixed(2)}%',
                  direction: BDirection.of(change),
                  onDark: true,
                ),
              ],
            ],
          ),
        ),
        if (series.length > 1) ...[
          const SizedBox(width: 14),
          SizedBox(width: 118, child: BSparkline(values: series, height: 46)),
        ],
      ],
    );
  }
}

/// EGX 70 and 100 — supporting figures, and deliberately smaller.
class _Second extends StatelessWidget {
  const _Second({required this.index, required this.arabic});

  final RateRow index;
  final bool arabic;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final level = index.level;
    final change = index.changePercent;

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 11),
      decoration: BoxDecoration(
        color: c.onInk.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(BarbarianRadius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            index.labelFor(arabic).isEmpty ? index.id : index.labelFor(arabic),
            style: BarbarianType.labelNano.copyWith(color: c.onInkMuted),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 5),
          BNumText(
            level == null ? '—' : grouped(level),
            style: BarbarianType.figureS.copyWith(color: c.onInk),
          ),
          if (change != null) ...[
            const SizedBox(height: 4),
            BChangeDelta(
              value: '${change.abs().toStringAsFixed(2)}%',
              direction: BDirection.of(change),
              onDark: true,
            ),
          ],
        ],
      ),
    );
  }
}

/// How wide the day was, as a bar rather than as three sentences.
class _Breadth extends StatelessWidget {
  const _Breadth({required this.breadth});

  final MarketBreadth breadth;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final total = breadth.counted;
    if (total <= 0) return const SizedBox.shrink();

    Widget segment(int value, Color colour) => Expanded(
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: 10,
          // Stretch, or a ColoredBox with no child takes no height at all —
          // the bug that made this bar invisible for a week.
          child: Row(
            // The key the breadth-bar guard looks for. It moved with the bar:
            // the bug it exists to catch — a ColoredBox with no child taking
            // no height at all — is exactly what this re-implements.
            key: const Key('breadth-bar'),
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              segment(breadth.up, c.direction(true, onInkSurface: true)),
              segment(breadth.flat, c.onInkMuted),
              segment(breadth.down, c.direction(false, onInkSurface: true)),
            ],
          ),
        ),
        const SizedBox(height: 9),
        Row(
          children: [
            Expanded(
              child: Text(
                l.heroBreadth(breadth.up, breadth.flat, breadth.down),
                style: BarbarianType.labelNano.copyWith(color: c.onInkMuted),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              l.heroOf(total),
              style: BarbarianType.labelNano.copyWith(color: c.onInkMuted),
            ),
          ],
        ),
      ],
    );
  }
}
