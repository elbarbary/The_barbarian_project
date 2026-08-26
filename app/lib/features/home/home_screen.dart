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
import '../../core/widgets/controls.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import 'busiest.dart';
import '../today/rates_block.dart';
import 'market_hero.dart';
import 'sector_hero.dart';
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
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);

    return BScreenScaffold(
      blockGap: 22,
      children: [
        const _Greeting(),
        // A link, not a field.
        //
        // Home grew its own live search for one build, and the six rows it
        // could show were a worse answer than the screen that already exists:
        // the directory carries the sector chips, the four sorts, the
        // researched-only toggle and the numeric filters, and none of that
        // fits under a pill on the front door. Tapping here opens that screen
        // with the keyboard already up, so the cost is one frame rather than
        // a second tap.
        BSearchPill(
          text: l.homeSearchHint,
          onTap: () =>
              context.push(Routes.directoryPath(BNavTab.home, focus: true)),
        ),

        // Home is the market screen. Today is the reading screen — the
        // crossings, the news and the filings, and nothing else.
        //
        // The order is what a reader would ask for, loudest first:
        //
        //   1. what the whole exchange did, on one card
        //   2. which companies moved far outside their own normal
        //   3. the pound, the world, and the metals Egyptians hold
        //   4. what moves Egypt underneath all of it
        //   5. the watchlist, reached on purpose
        const BMarketHero(),
        const BBusiest(),
        const BSectorHero(parentTab: BNavTab.home),
        const BRatesBlock(),
        const BMacroBlock(),
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
            // The language switch, where an empty avatar used to sit.
            //
            // That avatar was a hatched placeholder for an account system that
            // does not exist and greeted nobody — the slot cost 46 points at
            // the top of the first screen and gave a reader nothing. The one
            // control that genuinely belongs there is the language: this app
            // is read in two, its Arabic is the primary one, and the switch
            // was three taps deep in You.
            const _LanguageToggle(),
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

/// Arabic or English, in one tap, from the top of the first screen.
///
/// Each side is written in its own script, so a reader who has landed in the
/// language they cannot read can still find the way out — the same reason the
/// full setting in You names them that way. The current one is filled and the
/// other is not, which is a shape difference and not only a colour one (§42).
class _LanguageToggle extends ConsumerWidget {
  const _LanguageToggle();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    // The locale actually in force, which is the system's until somebody
    // chooses. Reading the stored preference alone would leave both halves
    // looking unselected on a fresh install.
    final arabic = Localizations.localeOf(context).languageCode == 'ar';

    return Semantics(
      button: true,
      label: l.languageSwitch,
      excludeSemantics: true,
      child: BPressable(
        onTap: () => ref
            .read(localeProvider.notifier)
            .set(Locale(arabic ? 'en' : 'ar')),
        child: Container(
          height: 46,
          padding: const EdgeInsets.symmetric(horizontal: 5),
          decoration: BoxDecoration(
            color: c.textPrimary.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(BarbarianRadius.pill),
          ),
          // Physical order, not directional: the pair reads the same way round
          // in both languages, so the half a reader is looking for does not
          // move when the app flips.
          child: Row(
            textDirection: TextDirection.ltr,
            mainAxisSize: MainAxisSize.min,
            children: [
              _Half(label: 'EN', on: !arabic),
              _Half(label: 'ع', on: arabic),
            ],
          ),
        ),
      ),
    );
  }
}

class _Half extends StatelessWidget {
  const _Half({required this.label, required this.on});

  final String label;
  final bool on;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AnimatedContainer(
      duration: BarbarianMotion.standard,
      curve: BarbarianMotion.easeOut,
      width: 34,
      height: 36,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: on ? c.surface : Colors.transparent,
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
        boxShadow: on && !c.isDark ? BarbarianShadow.lifted : null,
      ),
      child: Text(
        label,
        style: BarbarianType.labelS.copyWith(
          color: on ? c.textPrimary : c.textMuted,
          fontWeight: on ? FontWeight.w600 : FontWeight.w400,
        ),
      ),
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

    // Every followed company, two to a row, flowing down as far as the list
    // goes. The reader put each one here on purpose, so the home board shows
    // all of them rather than four with the rest hidden away on You.
    final shown = watchlist;

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
