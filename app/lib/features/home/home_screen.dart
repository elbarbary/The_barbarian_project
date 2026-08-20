import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/company.dart';
import '../../core/models/disclosure.dart';
import '../../core/models/market_snapshot.dart';
import '../../core/models/rates.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/charts.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
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
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    return BScreenScaffold(
      blockGap: 22,
      children: [
        const _Greeting(),
        // Not on the board, and here on purpose. The boards give the directory
        // and its search their own tab; until that is settled this is the only
        // way to reach 282 companies, and "somebody just sent me a name" is
        // the single most common reason this app gets opened.
        BSearchPill(
          text: l.searchPlaceholder,
          onTap: () => context.push(Routes.directoryPath(BNavTab.home)),
        ),
        const _DailyInsight(),
        const _IndexStrip(),
        const _WatchlistBlock(),
      ],
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
              onTap: () {
                ref.read(staticApiProvider).invalidateManifest();
                ref.invalidate(marketSnapshotProvider);
                ref.invalidate(companyDirectoryProvider);
                ref.invalidate(opportunityReportProvider);
                ref.invalidate(cashOrTrashProvider);
                ref.invalidate(disclosuresProvider);
                ref.invalidate(ratesProvider);
                ref.invalidate(liveQuotesProvider);
              },
            ),
          ],
        ),
        const SizedBox(height: 14),
        // A screen is only as current as its stalest figure, so it quotes the
        // oldest rather than the freshest.
        Text(
          l.oldestThingHere(freshness.caption),
          style: BarbarianType.bodyS.copyWith(color: c.textMuted),
        ),
      ],
    );
  }
}

/// The dark editorial hero: what actually happened today, and why it matters.
///
/// The board fills this with a written daily insight. We do not have an editor,
/// but we do have something better suited to the promise: the exchange's own
/// filings, already classified and already carrying a plain sentence saying why
/// this one is worth looking at. The loudest filing of the session leads.
class _DailyInsight extends ConsumerWidget {
  const _DailyInsight();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final feed = ref.watch(disclosuresProvider).whenOrNull(
      data: (s) => s.value,
    );
    final item = _lead(feed);

    if (item == null) {
      return BEmptyState(
        title: l.homeNothingFiled,
        body: l.homeNothingFiledBody,
      );
    }

    final ticker = item.tickers.length == 1 ? item.tickers.first : null;

    return BPressable(
      onTap: ticker == null
          ? null
          : () => context.push(Routes.companyPath(BNavTab.home, ticker)),
      child: BDarkCard(
        radius: BarbarianRadius.xl,
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    l.homeTodayKicker(item.eventLabel).toUpperCase(),
                    style: BarbarianType.labelTiny.copyWith(
                      color: c.onInkMuted,
                      letterSpacing: 1.6,
                    ),
                  ),
                ),
                if (ticker != null)
                  Icon(
                    Icons.north_east_rounded,
                    size: 18,
                    color: c.onInkMuted,
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              // The exchange's own headline is Arabic and long. What a reader
              // needs first is the plain-English name of the event and who
              // filed it; the filing itself is one tap away.
              ticker == null
                  ? item.eventLabel
                  : '$ticker · ${item.eventLabel}',
              style: BarbarianType.headlineM.copyWith(color: c.onInk),
            ),
            const SizedBox(height: 10),
            Text(
              item.meaning,
              style: BarbarianType.bodyM.copyWith(color: c.onInkMuted),
            ),
            if (item.because.isNotEmpty) ...[
              const SizedBox(height: 14),
              // Why this one and not the other thirty-five. It is a measured
              // statement about the session, never a view about the share.
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: c.onInk.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(BarbarianRadius.md),
                ),
                child: Text(
                  item.because,
                  style: BarbarianType.bodyS.copyWith(color: c.onInkMuted),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// The filing worth leading with.
  ///
  /// `check` means the company's own volume was unusual on the day it filed,
  /// which is the only signal here that is measured rather than assumed. Those
  /// lead; otherwise the newest filing that names exactly one company does,
  /// because a headline about "several companies" tells a reader nothing.
  static Disclosure? _lead(DisclosureFeed? feed) {
    final items = feed?.items ?? const <Disclosure>[];
    if (items.isEmpty) return null;
    final named = items.where((i) => i.tickers.length == 1).toList();
    if (named.isEmpty) return items.first;
    // Two things decide the lead, in this order. An unusual session is the
    // only signal here that was measured rather than assumed. And a filing the
    // classifier could actually place beats a bare "Statement", which by
    // definition says nothing about what happened — leading with one wastes
    // the largest card on the screen.
    int rank(Disclosure d) =>
        (d.weight == 'check' ? 2 : 0) + (d.event == 'statement' ? 0 : 1);
    named.sort((a, b) {
      final byRank = rank(b).compareTo(rank(a));
      return byRank != 0 ? byRank : b.date.compareTo(a.date);
    });
    return named.first;
  }
}

/// The EGX 30, on a flat black card.
///
/// The board splits the level into a large integer part and a smaller decimal
/// part, which is worth keeping: it makes a five-figure index readable at a
/// glance without rounding away what moved.
class _IndexStrip extends ConsumerWidget {
  const _IndexStrip();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final rates = ref.watch(ratesProvider).whenOrNull(data: (s) => s.value);
    final index = _egx30(rates);
    if (index == null || index.level == null) return const SizedBox.shrink();

    final level = index.level!;
    final whole = level.floor();
    final decimals = ((level - whole) * 100).round().toString().padLeft(2, '0');
    final change = index.changePercent;

    return BDarkCard(
      radius: BarbarianRadius.xl,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    // Split so a five-figure index stays readable without
                    // rounding away the part that moved.
                    BNumText(
                      _grouped(whole),
                      style: BarbarianType.displayS.copyWith(color: c.onInk),
                    ),
                    BNumText(
                      '.$decimals',
                      style: BarbarianType.bodyM.copyWith(color: c.onInkMuted),
                    ),
                    const SizedBox(width: 10),
                    Flexible(child: BKindChip(index.id)),
                  ],
                ),
                // No label line: the chip beside the level already says
                // EGX30, and printing "EGX 30" under it says it twice.
              ],
            ),
          ),
          if (change != null) ...[
            const SizedBox(width: 12),
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

  static RateRow? _egx30(RatesDoc? rates) {
    for (final row in rates?.indices ?? const <RateRow>[]) {
      if (row.id == 'EGX30') return row;
    }
    return (rates?.indices ?? const <RateRow>[]).firstOrNull;
  }

  static String _grouped(int value) {
    final digits = value.toString();
    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
      buffer.write(digits[i]);
    }
    return buffer.toString();
  }
}

/// The watchlist, as the board's 2×2 checkerboard of tiles.
///
/// §8.4 governs what may appear here: a watchlist row is a price, not a
/// reading. A list the reader assembled, each row carrying this app's
/// assessment, is a personalised recommendation list however it was built. So
/// these tiles carry ticker, name, trend, price and change, and nothing else.
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
      return BEmptyState(
        title: l.homeWatchlistEmpty,
        body: l.homeWatchlistEmptyBody,
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
        ref.watch(priceHistoryProvider(ticker)).whenOrNull(
          data: (s) => s.value,
        ) ??
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
