import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/company.dart';
import '../../core/models/market_snapshot.dart';
import '../../core/models/price_freshness_text.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/charts.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/load_more.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import 'busiest.dart';
import '../today/rates_block.dart';
import 'market_hero.dart';
import 'scanner_hero.dart';
import 'macro_block.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// Home — the landing tab, per `docs/design-specs/home.json`.
///
/// A greeting, a dark editorial hero carrying the day's most significant
/// filing, the EGX 30 level, the watchlist as a 2×2 grid of tiles, and a rail
/// of the latest studies. It is a read-and-browse surface with no trading
/// affordance of any kind, which is what the board specifies and what §8
/// requires independently.
///
/// **Two deliberate departures from the board, both for want of data.** The
/// hero's inset area chart is not drawn: the rates document carries the index
/// level and its change but no series, and a decorative squiggle standing in
/// for a price history is the kind of thing this app exists not to do. And
/// there is no "Trending in The Pit" section, because The Pit has no backend
/// yet — a section that can only ever be empty is not a section.
///
/// This screen was deleted once, in e672c21, on the grounds that "a dashboard
/// is the wrong answer" and that the boards' navigation was اسأل/اليوم/الأبحاث/لك.
/// No such board is in this repository: all nine checked-in boards specify a
/// Home tab, `_design-system.json` types the nav as `home|market|pit|you`, and
/// spec §6 describes this screen. It is back.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final TextEditingController _search = TextEditingController();

  /// This screen's own search text. Not a shared provider: two screens
  /// searching must not share one query — see `searchResultsProvider`.
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final query = _query.trim();

    return BScreenScaffold(
      blockGap: 22,
      children: [
        const _Greeting(),
        // A live field, not a row that navigates away.
        //
        // "Somebody just sent me a name" is the single most common reason this
        // app gets opened, and the pill here used to be a display row that
        // pushed the directory — two taps and a screen change before a reader
        // could type. On a command screen the search is the first thing that
        // works, so it answers here.
        BSearchPill(
          text: l.homeSearchHint,
          controller: _search,
          onChanged: (value) => setState(() => _query = value),
        ),

        // While something is typed, the screen is the search. Showing eleven
        // blocks of market furniture under a list of results is asking a
        // reader to scroll past the answer.
        if (query.isNotEmpty)
          _SearchResults(
            query: query,
            onClear: () => setState(() {
              _query = '';
              _search.clear();
            }),
          )
        else ...[
          // Home is the market screen. Today is the reading screen — the
          // crossings, the news and the filings, and nothing else.
          //
          // The order is what a reader would ask for, loudest first:
          //
          //   1. what the whole exchange did, on one card
          //   2. which companies moved far outside their own normal
          //   3. what the published rule found
          //   4. the pound, the world, and the metals Egyptians hold
          //   5. what moves Egypt underneath all of it
          //   6. the watchlist, reached on purpose
          const BMarketHero(),
          const BBusiest(),
          const BScannerHero(parentTab: BNavTab.home),
          const BRatesBlock(),
          const BMacroBlock(),
          const _WatchlistBlock(),
        ],
      ],
    );
  }
}

/// The directory, answered where it was asked.
class _SearchResults extends ConsumerWidget {
  const _SearchResults({required this.query, required this.onClear});

  final String query;
  final VoidCallback onClear;

  /// Enough to recognise the one they meant, and a way to the rest.
  static const int shown = 6;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final results = ref.watch(searchResultsProvider(query));
    final snapshot = ref.watch(livePricesProvider);

    if (results.isEmpty) {
      return BEmptyState(
        title: l.homeSearchNone(query),
        body: l.directoryNotOnDeviceBody,
        actionLabel: l.studyClearFilters,
        onAction: onClear,
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BGroupedListCard(
          rows: [
            for (final company in results.take(shown))
              _ResultRow(
                company: company,
                quote: snapshot?.quoteFor(company.ticker),
                arabic: arabic,
              ),
          ],
        ),
        if (results.length > shown) ...[
          const SizedBox(height: 10),
          BLoadMoreButton(
            label: l.homeSearchMore(results.length),
            onTap: () => context.push(Routes.directoryPath(BNavTab.home)),
          ),
        ],
      ],
    );
  }
}

class _ResultRow extends StatelessWidget {
  const _ResultRow({
    required this.company,
    required this.quote,
    required this.arabic,
  });

  final CompanySummary company;
  final StockQuote? quote;
  final bool arabic;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final change = quote?.resolvedChangePercent;
    // The reader's own language leads, as it does in the directory.
    final lead = arabic && company.nameAr != null;

    return BListRow(
      leading: BTickerMonogram(company.ticker, sector: company.sector),
      title: lead ? company.nameAr! : company.nameEn,
      titleIsArabic: lead,
      subtitle: lead ? company.nameEn : company.nameAr,
      subtitleIsArabic: !lead && company.nameAr != null,
      onTap: () =>
          context.push(Routes.companyPath(BNavTab.home, company.ticker)),
      trailing: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisSize: MainAxisSize.min,
        children: [
          BNumText(
            quote == null ? '—' : quote!.close.toStringAsFixed(2),
            style: BarbarianType.figureS.copyWith(color: c.textPrimary),
          ),
          if (change != null) ...[
            const SizedBox(height: 4),
            BChangeDelta(
              value: '${(change.abs() * 100).toStringAsFixed(2)}%',
              direction: BDirection.of(change),
            ),
          ],
        ],
      ),
    );
  }
}

/// Avatar, greeting and refresh — the board's first row.
class _Greeting extends ConsumerWidget {
  const _Greeting();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final freshness = ref.watch(priceFreshnessProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const BAvatarHatch(size: 46),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // The board greets by name from an account. There are no
                  // accounts yet, so it greets without one rather than
                  // inventing a name to put in the slot.
                  Text(
                    l.appName,
                    style: BarbarianType.displayS.copyWith(
                      color: c.textPrimary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  Text(
                    l.appTagline,
                    style: BarbarianType.bodyM.copyWith(color: c.textMuted),
                  ),
                ],
              ),
            ),
            BSoftIconButton(
              icon: Icons.refresh_rounded,
              semanticLabel: l.refresh,
              // The same list the resume path uses. This one used to be
              // written out by hand here and had drifted: it fetched the
              // scanner and the studies, and not the news.
              onTap: () => refreshPublishedContent(
                api: ref.read(staticApiProvider),
                invalidate: ref.invalidate,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        // A screen is only as current as its stalest figure, so it quotes the
        // oldest rather than the freshest.
        Text(
          l.oldestThingHere(context.freshnessCaption(freshness)),
          style: BarbarianType.bodyS.copyWith(color: c.textMuted),
        ),
      ],
    );
  }
}

class _WatchlistBlock extends ConsumerWidget {
  const _WatchlistBlock();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final watchlist = ref.watch(watchlistProvider).value ?? const <String>[];
    final directory = ref
        .watch(companyDirectoryProvider)
        .whenOrNull(data: (s) => s.value);
    final snapshot = ref.watch(livePricesProvider);

    if (watchlist.isEmpty) {
      // Keep the heading, and give the reader a way out.
      //
      // The early return skipped the row below that draws the section label,
      // so a fresh install's last block was an unlabelled card reading "Follow
      // companies to build your watchlist" with no heading above it and no
      // control on it — an instruction with nothing to act on. `BEmptyState`
      // has taken an action since it was written, and the You screen already
      // passes one.
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          BSectionLabel(l.homeWatchlistLabel),
          const SizedBox(height: 8),
          BEmptyState(
            title: l.homeWatchlistEmpty,
            body: l.homeWatchlistEmptyBody,
            actionLabel: l.browseCompanies,
            onAction: () => context.push(Routes.directoryPath(BNavTab.home)),
          ),
        ],
      );
    }

    // Four tiles: the board draws a 2×2 and more than that stops being a
    // glance. The rest are on You.
    final shown = watchlist.take(4).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: BSectionLabel(l.homeWatchlistLabel)),
            BInlineAction(
              l.homeWatchlistManage,
              onTap: () => context.go(Routes.you),
            ),
          ],
        ),
        LayoutBuilder(
          builder: (context, constraints) {
            const gap = 12.0;
            final width = (constraints.maxWidth - gap) / 2;
            return Wrap(
              spacing: gap,
              runSpacing: gap,
              children: [
                for (var i = 0; i < shown.length; i++)
                  SizedBox(
                    width: width,
                    child: _WatchTile(
                      ticker: shown[i],
                      // Alternating fills, so the grid reads as a
                      // checkerboard rather than a block of four.
                      dark: i.isEven,
                      quote: snapshot?.quoteFor(shown[i]),
                      company: directory?.byTicker(shown[i]),
                    ),
                  ),
              ],
            );
          },
        ),
        const SizedBox(height: 10),
        Text(
          l.homePricesCaption,
          style: BarbarianType.bodyS.copyWith(color: c.textFaint),
        ),
      ],
    );
  }
}

class _WatchTile extends ConsumerWidget {
  const _WatchTile({
    required this.ticker,
    required this.dark,
    required this.quote,
    required this.company,
  });

  final String ticker;
  final bool dark;
  final StockQuote? quote;
  final CompanySummary? company;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final change = quote?.resolvedChangePercent;
    // Real end-of-day history, not a decorative squiggle: the last thirty
    // sessions the app actually holds for this company.
    final history =
        ref
            .watch(priceHistoryProvider(ticker))
            .whenOrNull(data: (s) => s.value) ??
        const [];
    final spark = history.length > 2
        ? history
              .sublist(history.length > 30 ? history.length - 30 : 0)
              .map((p) => p.close)
              .toList()
        : const <double>[];

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          ticker,
          style: BarbarianType.titleL.copyWith(
            color: dark ? c.onInk : c.textPrimary,
          ),
        ),
        if (company?.nameAr case final String ar) ...[
          const SizedBox(height: 2),
          BArabicName(ar, color: dark ? c.onInkMuted : c.textMuted),
        ],
        if (spark.length > 1)
          Padding(
            padding: const EdgeInsets.fromLTRB(0, 12, 0, 10),
            child: BSparkline(values: spark),
          )
        else
          const SizedBox(height: 16),
        BNumText(
          quote == null ? '—' : quote!.close.toStringAsFixed(2),
          style: BarbarianType.figureM.copyWith(
            color: dark ? c.onInk : c.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        if (change != null)
          BChangeDelta(
            value: '${(change.abs() * 100).toStringAsFixed(2)}%',
            direction: BDirection.of(change),
            onDark: dark,
          )
        else
          Text(
            l.noQuote,
            style: BarbarianType.bodyS.copyWith(
              color: dark ? c.onInkMuted : c.textFaint,
            ),
          ),
      ],
    );

    return BPressable(
      onTap: () => context.push(Routes.companyPath(BNavTab.home, ticker)),
      child: dark
          ? BDarkCard(padding: const EdgeInsets.all(16), child: content)
          : BPaperCard(padding: const EdgeInsets.all(16), child: content),
    );
  }
}
