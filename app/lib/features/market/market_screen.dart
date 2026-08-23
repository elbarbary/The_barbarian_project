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
import '../../l10n/app_localizations.dart';
import 'filter_sheet.dart';
import 'numeric_filter.dart';

/// Market (spec §11, §12).
///
/// No "top buys", no "best stocks", no "AI picks" — the tab is a browser for
/// the exchange, not a recommendation surface (spec §11).
class MarketScreen extends ConsumerStatefulWidget {
  const MarketScreen({required this.parentTab, super.key});

  /// Which navigation slot stays lit while this is open. Market used to BE a
  /// slot; it is now a reference reached from Ask, so it inherits the caller's.
  final BNavTab parentTab;

  @override
  ConsumerState<MarketScreen> createState() => _MarketScreenState();
}

/// How the list is ordered, and what is left in it.
///
/// Every one of these is a fact about the completed or delayed session already
/// on screen — no forecast, no ranking of what to buy (spec §8).
enum _Order {
  az,
  gainers,
  losers,
  active;

  /// The chips were enum literals, so the sort a reader picks was named in
  /// English whatever the locale said.
  String labelFor(AppLocalizations l) => switch (this) {
    _Order.az => l.sortAlphabetical,
    _Order.gainers => l.sortGainers,
    _Order.losers => l.sortLosers,
    _Order.active => l.sortMostActive,
  };
}

class _MarketScreenState extends ConsumerState<MarketScreen> {
  final TextEditingController _search = TextEditingController();
  String? _sector;

  /// This screen's own search text — see `searchResultsProvider`.
  String _query = '';

  /// Conditions on the numbers, all of which have to pass.
  final List<NumericFilter> _filters = [];
  _Order _order = _Order.az;
  bool _researchedOnly = false;
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final directoryAsync = ref.watch(companyDirectoryProvider);
    final snapshot = ref.watch(livePricesProvider);
    final isSample = ref.watch(isSampleDataProvider);
    final results = ref.watch(searchResultsProvider(_query));

    return BScreenScaffold(
      blockGap: 24,
      children: [
        BScreenTitle(l.fullDirectory),
        BSearchPill(
          text: l.searchCompanies,
          controller: _search,
          onChanged: (v) => setState(() => _query = v),
        ),
        BAsyncView(
          value: directoryAsync,
          errorTitle: l.directoryNotOnDevice,
          errorBody: l.directoryNotOnDeviceBody,
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
            // The numbers, last, so the count beside the heading is the count
            // of what is actually on screen.
            final beforeFilters = visible.length;
            visible = applyFilters(
              visible,
              _filters,
              (ticker) => snapshot?.quoteFor(ticker),
            );

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
                return _order == _Order.losers
                    ? x.compareTo(y)
                    : y.compareTo(x);
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
                          order.labelFor(l),
                          variant: _order == order
                              ? BChipVariant.solid
                              : BChipVariant.neutral,
                          onTap: () => setState(() => _order = order),
                        ),
                        const SizedBox(width: 8),
                      ],
                      BKindChip(
                        l.researched,
                        variant: _researchedOnly
                            ? BChipVariant.solid
                            : BChipVariant.neutral,
                        onTap: () =>
                            setState(() => _researchedOnly = !_researchedOnly),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                // The numbers a reader can narrow by, and what they have set.
                //
                // Under the sorts rather than beside them: a sort reorders 280
                // rows and a filter removes most of them, which is a bigger
                // thing to do by accident.
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    BKindChip(
                      l.filterAdd,
                      variant: BChipVariant.ember,
                      leading: const Icon(Icons.tune, size: 15),
                      onTap: () async {
                        final added = await showFilterBuilder(context);
                        if (added != null) setState(() => _filters.add(added));
                      },
                    ),
                    for (final (index, filter) in _filters.indexed)
                      BKindChip(
                        _describe(filter, l),
                        variant: BChipVariant.solid,
                        leading: const Icon(Icons.close, size: 14),
                        onTap: () => setState(() => _filters.removeAt(index)),
                      ),
                    if (_filters.isNotEmpty)
                      Text(
                        l.filterMatchCount(visible.length, beforeFilters),
                        style: BarbarianType.labelNano.copyWith(
                          color: c.textFaint,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 18),
                BSectionLabel(
                  l.directoryCompaniesSorted(_order.labelFor(l)),
                  trailing: Text(
                    '${visible.length}',
                    style: BarbarianType.labelS.copyWith(color: c.textMuted),
                  ),
                ),
                if (visible.isEmpty)
                  BEmptyState(
                    title: l.noCompanyMatches,
                    body: l.directorySearchBody(directory.count),
                    actionLabel: l.clearSearch,
                    onAction: () {
                      _search.clear();
                      setState(() {
                        _query = '';
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
                      parentTab: widget.parentTab,
                    ),
                    const SizedBox(height: 8),
                  ],
                const SizedBox(height: 24),
                if (_sector == null && _query.isEmpty)
                  _Sectors(directory: directory),
                const SizedBox(height: 8),
                if (snapshot != null)
                  const BPriceCaption()
                else
                  BStalenessCaption(l.noMarketData),
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
          color: selected ? tone : BarbarianPalette.sectorWash(c, sector),
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
    final l = AppLocalizations.of(context);
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
          l.directorySectors,
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
    final l = AppLocalizations.of(context);
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
                  Positioned.fill(child: ColoredBox(color: c.hairline)),
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
            l.directoryShareOfListings((share * 100).toStringAsFixed(1)),
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
  const _CompanyRow({
    required this.company,
    required this.quote,
    required this.parentTab,
  });

  final CompanySummary company;
  final StockQuote? quote;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final change = quote?.resolvedChangePercent;

    // In the Arabic build the Arabic name leads and the English sits under
    // it. 266 of the 280 entries carry one; the rest fall back to English in
    // both positions rather than showing a blank line.
    final arabic =
        Directionality.of(context) == TextDirection.rtl &&
        company.nameAr != null;

    return BListRow(
      leading: BTickerMonogram(company.ticker, sector: company.sector),
      title: arabic ? company.nameAr! : company.nameEn,
      titleIsArabic: arabic,
      subtitle: arabic ? company.nameEn : company.nameAr,
      subtitleIsArabic: !arabic && company.nameAr != null,
      onTap: () => context.push(Routes.companyPath(parentTab, company.ticker)),
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
              l.directoryNoQuote,
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

/// A set filter, in the words it was set with.
///
/// "What the company is worth more than 1000000000" is unreadable, so the
/// figure is abbreviated the way the rows themselves abbreviate it — a reader
/// who typed a billion should see a billion back.
String _describe(NumericFilter filter, AppLocalizations l) {
  String number(double value) {
    final magnitude = value.abs();
    if (magnitude >= 1e9) return '${(value / 1e9).toStringAsFixed(1)}bn';
    if (magnitude >= 1e6) return '${(value / 1e6).toStringAsFixed(1)}m';
    if (magnitude >= 1e3) return '${(value / 1e3).toStringAsFixed(0)}k';
    return value == value.roundToDouble()
        ? value.toStringAsFixed(0)
        : value.toStringAsFixed(2);
  }

  final field = filter.field.labelFor(l);
  final how = filter.operator.labelFor(l);
  if (filter.operator == FilterOperator.between) {
    final (low, high) = filter.bounds;
    return '$field $how ${number(low)} ${l.filterAnd} ${number(high)}';
  }
  return '$field $how ${number(filter.low)}';
}
