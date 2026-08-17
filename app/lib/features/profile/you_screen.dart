import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/config/app_config.dart';
import '../../core/config/feature_flags.dart';
import '../../core/models/market_snapshot.dart';
import '../../core/models/price_freshness.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';

/// You (spec §30, §33, §56).
///
/// No account exists and none is required. The watchlist and bookmarks are on
/// the device, and a watchlist entry is a ticker and nothing else — this screen
/// never asks how many shares you hold or what you paid (spec §33).
class YouScreen extends ConsumerWidget {
  const YouScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final watchlist = ref.watch(watchlistProvider).value ?? const <String>[];
    final bookmarks = ref.watch(bookmarksProvider).value ?? const [];
    final snapshot = ref.watch(livePricesProvider);
    final directory = ref
        .watch(companyDirectoryProvider)
        .whenOrNull(data: (d) => d.value);
    final themeMode = ref.watch(themeModeProvider);

    return BScreenScaffold(
      blockGap: 22,
      children: [
        Row(
          children: [
            const BAvatarHatch(size: 56),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'You',
                    style: BarbarianType.displayM.copyWith(
                      color: c.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    'No account needed to read',
                    style: BarbarianType.bodyM.copyWith(color: c.textMuted),
                  ),
                ],
              ),
            ),
          ],
        ),
        Row(
          children: [
            Expanded(
              child: BStatTile(
                label: 'Watchlist',
                labelAbove: false,
                value: '${watchlist.length}',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: BStatTile(
                label: 'Saved',
                labelAbove: false,
                value: '${bookmarks.length}',
              ),
            ),
          ],
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const BSectionLabel('Watchlist'),
            if (watchlist.isEmpty)
              BEmptyState(
                title: 'Empty watchlist',
                body:
                    'Follow a company and its price, filings and research land '
                    'here.',
                actionLabel: 'Browse companies',
                onAction: () => selectTab(context, BNavTab.market),
              )
            else
              BGroupedListCard(
                rows: [
                  for (final ticker in watchlist)
                    _WatchRow(
                      ticker: ticker,
                      nameEn: directory?.byTicker(ticker)?.nameEn,
                      quote: snapshot?.quoteFor(ticker),
                      onRemove: () => ref
                          .read(watchlistProvider.notifier)
                          .remove(ticker),
                      onOpen: () => context.push(
                        Routes.companyPath(BNavTab.you, ticker),
                      ),
                    ),
                ],
              ),
          ],
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const BSectionLabel('Appearance'),
            BPaperCard(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              child: Column(
                children: [
                  for (final mode in ThemeMode.values)
                    _ChoiceRow(
                      label: switch (mode) {
                        ThemeMode.system => 'Follow the system',
                        ThemeMode.light => 'Light',
                        ThemeMode.dark => 'Dark',
                      },
                      selected: themeMode == mode,
                      isLast: mode == ThemeMode.values.last,
                      onTap: () =>
                          ref.read(themeModeProvider.notifier).set(mode),
                    ),
                ],
              ),
            ),
          ],
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const BSectionLabel('About the data'),
            BPaperCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Fact(
                    label: 'Market data',
                    // Says what is on screen right now, not what the daily
                    // publish holds. While the feed is reachable these prices
                    // are minutes old, and calling them "End of day" was
                    // straightforwardly untrue.
                    value: snapshot == null
                        ? 'Not downloaded'
                        : ref.watch(priceFreshnessProvider).caption,
                  ),
                  _Fact(
                    label: 'Companies',
                    value: '${directory?.count ?? 0} in the directory',
                  ),
                  _Fact(
                    label: 'Prices',
                    // Reads the feed's own delay rather than restating a number
                    // that could drift from what the app is actually serving.
                    value: switch (ref.watch(priceFreshnessProvider)) {
                      PriceFreshness(isLive: true, :final delay) =>
                        '${delay.inMinutes} minutes behind the exchange, '
                            'refreshed every '
                            '${AppConfig.quoteRefresh.inMinutes} minutes. '
                            'No real-time feed.',
                      _ => 'Last close only. No real-time feed.',
                    },
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'ESTHMR helps you understand the EGX. It does not '
                    'decide what you should buy. Nothing here is investment '
                    'advice.',
                    style: BarbarianType.bodyS.copyWith(color: c.textFaint),
                  ),
                ],
              ),
            ),
          ],
        ),
        // Every flag in FeatureFlags is false and stays false; this is the one
        // place the app admits they exist, as text rather than hidden UI.
        if (FeatureFlags.enablePublicCalls ||
            FeatureFlags.enableBrokerConnections ||
            FeatureFlags.enablePortfolios)
          const SizedBox.shrink(),
      ],
    );
  }
}

class _WatchRow extends StatelessWidget {
  const _WatchRow({
    required this.ticker,
    required this.nameEn,
    required this.quote,
    required this.onRemove,
    required this.onOpen,
  });

  final String ticker;
  final String? nameEn;
  final StockQuote? quote;
  final VoidCallback onRemove;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return BListRow(
      asCard: false,
      padding: const EdgeInsets.symmetric(vertical: 14),
      leading: BTickerMonogram(ticker, size: 40),
      title: ticker,
      subtitle: nameEn,
      onTap: onOpen,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          BNumText(
            quote == null ? '—' : quote!.close.toStringAsFixed(2),
            style: BarbarianType.figureS.copyWith(color: c.textSecondary),
          ),
          const SizedBox(width: 10),
          BPressable(
            onTap: onRemove,
            scale: 0.9,
            semanticLabel: 'Remove $ticker from watchlist',
            child: Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: c.textPrimary.withValues(alpha: 0.06),
                shape: BoxShape.circle,
              ),
              // U+2212 MINUS SIGN, not a hyphen.
              child: Text(
                '−',
                style: BarbarianType.titleS.copyWith(color: c.textMuted),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChoiceRow extends StatelessWidget {
  const _ChoiceRow({
    required this.label,
    required this.selected,
    required this.isLast,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final bool isLast;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return BPressable(
      onTap: onTap,
      scale: 0.99,
      semanticLabel: label,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 15),
        foregroundDecoration: isLast ? null : BHairline.rowBottom(context),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: BarbarianType.label.copyWith(color: c.textPrimary),
              ),
            ),
            // A check as well as a colour.
            Icon(
              selected
                  ? Icons.radio_button_checked_rounded
                  : Icons.radio_button_unchecked_rounded,
              size: 18,
              color: selected ? c.accent : c.textFaint,
            ),
          ],
        ),
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: BarbarianType.bodyS.copyWith(color: c.textMuted),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: BarbarianType.bodyM.copyWith(color: c.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
