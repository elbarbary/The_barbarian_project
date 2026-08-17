import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/company.dart';
import '../../core/models/market_snapshot.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/price_caption.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/text.dart';

/// Market (spec §11, §12).
///
/// No "top buys", no "best stocks", no "AI picks" — the tab is a browser for
/// the exchange, not a recommendation surface (spec §11).
class MarketScreen extends ConsumerStatefulWidget {
  const MarketScreen({super.key});

  @override
  ConsumerState<MarketScreen> createState() => _MarketScreenState();
}

/// How the list is ordered, and what is left in it.
///
/// Every one of these is a fact about the completed or delayed session already
/// on screen — no forecast, no ranking of what to buy (spec §8).
enum _Order {
  az('A–Z'),
  gainers('Gainers'),
  losers('Losers'),
  active('Most active');

  const _Order(this.label);

  final String label;
}

class _MarketScreenState extends ConsumerState<MarketScreen> {
  final TextEditingController _search = TextEditingController();
  String? _sector;
  _Order _order = _Order.az;
  bool _researchedOnly = false;
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final directoryAsync = ref.watch(companyDirectoryProvider);
    final snapshot = ref.watch(livePricesProvider);
    final isSample = ref.watch(isSampleDataProvider);
    final results = ref.watch(searchResultsProvider);

    return BScreenScaffold(
      blockGap: 24,
      children: [
        const BScreenTitle('Market'),
        BSearchPill(
          text: 'Search companies, tickers…',
          controller: _search,
          onChanged: (v) => ref.read(searchQueryProvider.notifier).set(v),
        ),
        BAsyncView(
          value: directoryAsync,
          errorTitle: 'The company directory is not on the device yet',
          errorBody:
              'Open the app once with a connection and the whole directory '
              'stays available offline.',
          data: (sourced) {
            final directory = sourced.value;
            final sectors = directory.sectors;

            var visible = _sector == null
                ? [...results]
                : results.where((cmp) => cmp.sector == _sector).toList();
            if (_researchedOnly) {
              visible = visible
                  .where((cmp) => cmp.hasResearch || cmp.hasCashOrTrash)
                  .toList();
            }

            // Sorting reads the same merged snapshot the rows draw from, so the
            // order always agrees with the numbers beside it. A company the feed
            // has no quote for sorts last rather than as a zero — it has no
            // move, which is not the same as a flat one.
            double? metric(CompanySummary cmp) {
              final q = snapshot?.quoteFor(cmp.ticker);
              return switch (_order) {
                _Order.gainers || _Order.losers => q?.resolvedChangePercent,
                _Order.active => q?.volume?.toDouble(),
                _Order.az => null,
              };
            }

            if (_order != _Order.az) {
              visible.sort((a, b) {
                final x = metric(a);
                final y = metric(b);
                if (x == null && y == null) return a.ticker.compareTo(b.ticker);
                if (x == null) return 1;
                if (y == null) return -1;
                return _order == _Order.losers ? x.compareTo(y) : y.compareTo(x);
              });
            }

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (sectors.isNotEmpty)
                  SizedBox(
                    height: 34,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: EdgeInsets.zero,
                      children: [
                        BKindChip(
                          'All ${directory.count}',
                          variant: _sector == null
                              ? BChipVariant.solid
                              : BChipVariant.neutral,
                          onTap: () => setState(() => _sector = null),
                        ),
                        for (final sector in sectors) ...[
                          const SizedBox(width: 8),
                          _SectorChip(
                            sector: sector,
                            selected: _sector == sector,
                            onTap: () => setState(
                              () => _sector = _sector == sector ? null : sector,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                const SizedBox(height: 14),
                SizedBox(
                  height: 34,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: EdgeInsets.zero,
                    children: [
                      for (final order in _Order.values) ...[
                        BKindChip(
                          order.label,
                          variant: _order == order
                              ? BChipVariant.solid
                              : BChipVariant.neutral,
                          onTap: () => setState(() => _order = order),
                        ),
                        const SizedBox(width: 8),
                      ],
                      BKindChip(
                        'Researched',
                        variant: _researchedOnly
                            ? BChipVariant.solid
                            : BChipVariant.neutral,
                        onTap: () =>
                            setState(() => _researchedOnly = !_researchedOnly),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                BSectionLabel(
                  'Companies · ${_order.label}',
                  trailing: Text(
                    '${visible.length}',
                    style: BarbarianType.labelS.copyWith(color: c.textMuted),
                  ),
                ),
                if (visible.isEmpty)
                  BEmptyState(
                    title: 'No listed company matches that',
                    body:
                        'Try a ticker, or the Arabic legal name. The directory '
                        'covers ${directory.count} companies.',
                    actionLabel: 'Clear search',
                    onAction: () {
                      _search.clear();
                      ref.read(searchQueryProvider.notifier).clear();
                      setState(() {
                        _sector = null;
                        _order = _Order.az;
                        _researchedOnly = false;
                      });
                    },
                  )
                else
                  for (final company in visible) ...[
                    _CompanyRow(
                      company: company,
                      quote: snapshot?.quoteFor(company.ticker),
                    ),
                    const SizedBox(height: 8),
                  ],
                const SizedBox(height: 24),
                if (_sector == null && ref.watch(searchQueryProvider).isEmpty)
                  _Sectors(directory: directory),
                const SizedBox(height: 8),
                if (snapshot != null)
                  const BPriceCaption()
                else
                  const BStalenessCaption('No market data downloaded yet'),
                if (isSample) ...[
                  const SizedBox(height: 10),
                  const BSampleDataNotice(),
                ],
              ],
            );
          },
        ),
      ],
    );
  }
}

/// The exchange by sector — a real breakdown of the 283 listings, and the
/// fastest way into a corner of the market without knowing a ticker.
/// A sector filter that shows its own colour, so the chip row doubles as the
/// legend for the coloured monograms below it.
class _SectorChip extends StatelessWidget {
  const _SectorChip({
    required this.sector,
    required this.selected,
    required this.onTap,
  });

  final String sector;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final tone = BarbarianPalette.sector(c, sector);
    return BPressable(
      onTap: onTap,
      scale: 0.96,
      semanticLabel: sector,
      child: AnimatedContainer(
        duration: BarbarianMotion.fast,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected
              ? tone
              : BarbarianPalette.sectorWash(c, sector),
          borderRadius: BorderRadius.circular(BarbarianRadius.pill),
          border: Border.all(
            color: tone.withValues(alpha: selected ? 1 : 0.30),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              sector,
              style: BarbarianType.pill.copyWith(
                color: selected ? c.surface : tone,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Sectors extends StatelessWidget {
  const _Sectors({required this.directory});

  final CompanyDirectory directory;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final counts = <String, int>{};
    for (final company in directory.companies) {
      final sector = company.sector;
      if (sector == null || sector.isEmpty) continue;
      counts[sector] = (counts[sector] ?? 0) + 1;
    }
    if (counts.isEmpty) return const SizedBox.shrink();

    final ranked = counts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final total = directory.count;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(
          'Sectors',
          trailing: Text(
            '${ranked.length}',
            style: BarbarianType.labelS.copyWith(color: c.textMuted),
          ),
        ),
        for (var i = 0; i < ranked.length; i += 2) ...[
          if (i > 0) const SizedBox(height: 12),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: _SectorTile(
                    name: ranked[i].key,
                    count: ranked[i].value,
                    total: total,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: i + 1 < ranked.length
                      ? _SectorTile(
                          name: ranked[i + 1].key,
                          count: ranked[i + 1].value,
                          total: total,
                        )
                      : const SizedBox.shrink(),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _SectorTile extends StatelessWidget {
  const _SectorTile({
    required this.name,
    required this.count,
    required this.total,
  });

  final String name;
  final int count;
  final int total;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final share = total == 0 ? 0.0 : count / total;

    final tone = BarbarianPalette.sector(c, name);

    return BPaperCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: tone, shape: BoxShape.circle),
              ),
              const SizedBox(width: 8),
              BNumText(
                '$count',
                style: BarbarianType.figureL.copyWith(color: c.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            name,
            style: BarbarianType.bodyM.copyWith(
              color: c.textPrimary,
              height: 1.3,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          // The share of the exchange, as a bar as well as a figure.
          ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: SizedBox(
              height: 3,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: ColoredBox(color: c.hairline),
                  ),
                  FractionallySizedBox(
                    widthFactor: share.clamp(0.02, 1.0),
                    child: ColoredBox(color: tone),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '${(share * 100).toStringAsFixed(1)}% of listings',
            style: BarbarianType.labelTiny.copyWith(
              color: c.textFaint,
              letterSpacing: 0,
            ),
          ),
        ],
      ),
    );
  }
}

class _CompanyRow extends StatelessWidget {
  const _CompanyRow({required this.company, required this.quote});

  final CompanySummary company;
  final StockQuote? quote;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final change = quote?.resolvedChangePercent;

    return BListRow(
      leading: BTickerMonogram(company.ticker, sector: company.sector),
      title: company.nameEn,
      subtitle: company.nameAr,
      subtitleIsArabic: company.nameAr != null,
      onTap: () =>
          context.push(Routes.companyPath(BNavTab.market, company.ticker)),
      trailing: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisSize: MainAxisSize.min,
        children: [
          BNumText(
            quote == null ? '—' : quote!.close.toStringAsFixed(2),
            style: BarbarianType.figureS.copyWith(color: c.textPrimary),
          ),
          const SizedBox(height: 4),
          if (change != null)
            BChangeDelta(
              value: '${(change.abs() * 100).toStringAsFixed(2)}%',
              direction: BDirection.of(change),
            )
          else
            Text(
              'no quote',
              style: BarbarianType.labelTiny.copyWith(
                color: c.textFaint,
                letterSpacing: 0,
              ),
            ),
          if (company.hasCashOrTrash) ...[
            const SizedBox(height: 6),
            Icon(Icons.article_outlined, size: 13, color: c.accent),
          ],
        ],
      ),
    );
  }
}
