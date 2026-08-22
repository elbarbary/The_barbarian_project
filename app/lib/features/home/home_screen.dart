import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/company.dart';
import '../../core/models/disclosure.dart';
import '../../core/models/market_history.dart';
import '../../core/models/market_snapshot.dart';
import '../../core/models/news.dart';
import '../../core/models/recency.dart';
import '../../core/models/rates.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/breadth_chart.dart';
import '../../core/widgets/charts.dart';
import '../../core/models/explainer.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/explainer_sheet.dart';
import '../../core/widgets/filed_document.dart';
import '../../core/widgets/filing_actions.dart';
import '../../core/widgets/insight.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/news_thumb.dart';
import 'macro_block.dart';
import 'feed_tabs.dart';
import 'lead_story.dart';
import 'connect_dots.dart';
import 'unusual_rail.dart';
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
        // The order answers the two questions somebody opens this app with,
        // in that order: what matters today, and what has just happened. It
        // used to open on one filing under a label that repeated itself, which
        // told a reader neither.
        // Filings lead. They are the only thing on this screen the exchange
        // itself published about a named company on the day it happened —
        // everything else is either a price or somebody's reporting of one.
        // This is a news app, and it opened with a regulatory filing — a form
        // somebody was obliged to submit. Excellent for a reader already deep
        // in a company, and the worst possible greeting for everyone else.
        //
        //   1. today's story, at the size a story deserves, with its picture
        //   2. the rest of the feed, each row carrying its own
        //   3. where the market closed and how wide the move was
        //   4. what companies told the exchange — depth, not a greeting
        //   5. what moves Egypt, which the rest is read against
        //   6. the watchlist, reached on purpose rather than stumbled on
        const BLeadStory(),
        // Both feeds behind one selector. They were stacked — a dozen
        // headlines, a market block, then ten filings further down — and both
        // answer "what happened today", so a reader after one had to scroll
        // past the other to reach it.
        const BFeedTabs(),
        const _Indices(),
        const _Breadth(),
        // Which companies, not how many. The count sat on Today without ever
        // naming one of them.
        const BUnusualRail(),
        // Where the feeds cross. Placed under the session numbers because it
        // is the thing that reads them together with everything else.
        const BConnectDots(),
        // The lead filing keeps its own card. It is not the same thing as the
        // filings list behind the tab: this one is the single disclosure worth
        // the largest card on the screen, with the measured reason it leads.
        BSectionLabel(l.homeFiledHero),
        const _DailyInsight(),
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
    final async = ref.watch(disclosuresProvider);

    // "Nothing filed yet today" is a claim about the exchange, and it was
    // being made while the document was still downloading.
    //
    // `whenOrNull(data:)` collapses loading and error into the same null as a
    // genuinely empty feed, so the landing screen asserted something false
    // about the market on every cold start — and because the manifest is
    // awaited before the cache is read, with a ten-second connect timeout,
    // that window is not brief on a bad connection. An absence we have not
    // finished checking is not an absence.
    if (async.isLoading && !async.hasValue) {
      return const BLoadingBlocks(rows: 1, height: 128);
    }

    final feed = async.whenOrNull(data: (s) => s.value);
    final item = _lead(feed);

    if (item == null) {
      return BEmptyState(
        title: l.homeNothingFiled,
        body: l.homeNothingFiledBody,
      );
    }

    final ticker = item.tickers.length == 1 ? item.tickers.first : null;
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final label = arabic && item.eventLabelAr.isNotEmpty
        ? item.eventLabelAr
        : item.eventLabel;
    final age = context.filingAge(item.date);
    final volumeKicker =
        (item.evidence?.ratio != null && item.evidence!.ratio > 0)
        ? l.homeVolumeKicker(item.evidence!.ratio.toStringAsFixed(1))
        : null;

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
                    // The kicker carries the measured reason this filing
                    // leads — the session's own volume against its normal —
                    // rather than repeating the event name that the headline
                    // underneath already states.
                    //
                    // When there is no volume reason it carries the age
                    // instead. It used to say "Filed today" flatly, and the
                    // lead is chosen by rank before date, so a filing that
                    // outranked everything from an earlier session announced
                    // itself as today's on the largest card on the screen.
                    // The whole feed was one day old when this was found.
                    (volumeKicker ?? age ?? l.homeFiledHero).toUpperCase(),
                    style: BarbarianType.labelTiny.copyWith(
                      color: c.onInkMuted,
                      letterSpacing: 0.7,
                    ),
                  ),
                ),
                // Shown here only when the kicker spent its slot on the volume
                // reason, so the age appears exactly once either way.
                if (volumeKicker != null && age != null) ...[
                  Text(
                    age.toUpperCase(),
                    style: BarbarianType.labelTiny.copyWith(
                      color: c.onInkMuted,
                      letterSpacing: 0.7,
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                if (ticker != null)
                  Icon(Icons.north_east_rounded, size: 18, color: c.onInkMuted),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              // The exchange's own headline is long. What a reader needs
              // first is the name of the event and who filed it, in their own
              // language; the filing itself is one tap away.
              ticker == null ? label : '$ticker · $label',
              // Keyed so a test can say something about *the lead* rather than
              // about every filing on the screen. The rule is that the biggest
              // card must not be spent on a bare "Statement"; a statement
              // further down the list is an ordinary filing and fine.
              key: const Key('home-lead-filing'),
              style: BarbarianType.headlineM.copyWith(color: c.onInk),
            ),
            const SizedBox(height: 10),
            Text(
              item.meaningFor(arabic),
              style: BarbarianType.bodyM.copyWith(color: c.onInkMuted),
            ),
            if (item.becauseFor(arabic).isNotEmpty) ...[
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
                  item.becauseFor(arabic),
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

/// EGX 30, 70 and 100 side by side, each with the shape we have so far.
///
/// One index told a reader whether the thirty largest listings moved, which is
/// not the same question as whether the market did — the 70 and the 100 are
/// equal-weighted, so a day where they fall while the 30 rises is a day carried
/// by a handful of heavyweights. Three cards make that visible at a glance.
///
/// The sparkline is drawn from `market-history.json`. That file used to hold a
/// single row and grow one session a day, on the belief that no index series
/// was reachable — so the cards carried a number and never a shape. A year of
/// daily closes is now backfilled from a second source, and kept honest by
/// refusing the fetch outright unless its newest close matches the level we
/// already publish. With one session there is still nothing to draw and the
/// card falls back to the level alone.
class _Indices extends ConsumerWidget {
  const _Indices();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final rates = ref.watch(ratesProvider).whenOrNull(data: (s) => s.value);
    final history = ref
        .watch(marketHistoryProvider)
        .whenOrNull(data: (s) => s.value);
    final indices = rates?.indices ?? const <RateRow>[];
    if (indices.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.homeIndices),
        SizedBox(
          height: 132,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.zero,
            itemCount: indices.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, i) => _IndexCard(
              index: indices[i],
              series: history?.levelsOf(indices[i].id) ?? const [],
            ),
          ),
        ),
      ],
    );
  }
}

class _IndexCard extends StatelessWidget {
  const _IndexCard({required this.index, required this.series});

  final RateRow index;
  final List<double> series;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final level = index.level;
    final change = index.changePercent;

    return BPressable(
      onTap: () => showExplainer(
        context,
        Explainer(
          termId: 'index.${index.id}',
          title: index.labelFor(arabic).isEmpty
              ? index.id
              : index.labelFor(arabic),
          plain: index.plainFor(arabic),
          token: index.token,
          workings: index.workingsFor(arabic),
          yardstick: index.yardstickFor(arabic),
          // An index level has no published band to be unusual against, and
          // defaulting to "ordinary" would be a claim.
          notability: Notability.unjudged,
          // The exchange publishes the level; we only reshape the sentence.
          provenance: Provenance.fact,
          source: index.source,
        ),
        series: series,
      ),
      child: BDarkCard(
        radius: BarbarianRadius.xl,
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
        child: SizedBox(
          width: 148,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                index.labelFor(arabic).isEmpty
                    ? index.id
                    : index.labelFor(arabic),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: BarbarianType.labelTiny.copyWith(
                  color: c.onInkMuted,
                  letterSpacing: 0.6,
                ),
              ),
              const SizedBox(height: 8),
              BNumText(
                level == null ? '—' : _grouped(level),
                style: BarbarianType.headlineM.copyWith(color: c.onInk),
              ),
              const SizedBox(height: 4),
              if (change != null)
                BChangeDelta(
                  value: '${change.abs().toStringAsFixed(2)}%',
                  direction: BDirection.of(change),
                  onDark: true,
                ),
              const Spacer(),
              // Two points is the minimum that says anything. One is a level
              // we have already printed above in a larger font.
              if (series.length > 1)
                BSparkline(values: series, height: 26)
              else
                const SizedBox(height: 26),
            ],
          ),
        ),
      ),
    );
  }

  static String _grouped(double value) {
    final whole = value.floor();
    final digits = whole.toString();
    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
      buffer.write(digits[i]);
    }
    return buffer.toString();
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
            onAction: () =>
                context.push(Routes.directoryPath(BNavTab.home)),
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

/// The rest of the day's filings, under the one that leads.
///
/// The hero answers "what happened today" with a single event, which left the
/// screen thinner than the boards drew it and thinner than the day actually
/// was — thirty-six companies filed. This carries the next few, each with the
/// plain sentence saying what that kind of filing does to somebody holding the
/// share, because a list of event names is a table of contents and the meaning
/// is the product.
class HomeAlsoFiled extends ConsumerWidget {
  const HomeAlsoFiled({this.limit = 10, this.showHeader = true, super.key});

  /// How many rows to show. Five under a tab, because the tab is the promise
  /// that there are more and "All filings" is where they are.
  final int limit;

  /// Suppressed when a tab selector above is already naming this feed.
  final bool showHeader;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final feed = ref
        .watch(disclosuresProvider)
        .whenOrNull(data: (s) => s.value);
    final lead = _DailyInsight._lead(feed);
    final items = (feed?.items ?? const <Disclosure>[])
        .where((i) => i.id != lead?.id && i.tickers.length == 1)
        .take(limit)
        .toList();
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (showHeader)
          Row(
            children: [
              Expanded(child: BSectionLabel(l.homeAlsoFiled)),
              BInlineAction(
                l.homeAllFilings,
                // Ask for the section first, then move. `go` alone dropped the
                // reader at the top of a long screen and left them to hunt for
                // the thing they had just tapped.
                onTap: () {
                  ref
                      .read(todaySectionRequestProvider.notifier)
                      .ask(TodaySection.filings);
                  context.go(Routes.today);
                },
              ),
            ],
          ),
        BPaperCard(
          radius: BarbarianRadius.xl,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final (i, item) in items.indexed) ...[
                if (i > 0) ...[
                  const SizedBox(height: 12),
                  Divider(height: 1, color: c.hairline),
                  const SizedBox(height: 12),
                ],
                BPressable(
                  // Ask, rather than guess. Home used to go straight to the
                  // company and Today straight to the filing, so the same row
                  // did different things depending on which tab you were on.
                  onTap: () => showFilingActions(
                    context,
                    ref,
                    filing: item,
                    from: BNavTab.home,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Wrap, not Row: a ticker beside a long Arabic event
                      // name is two variable-length things on one line.
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            item.tickers.first,
                            style: BarbarianType.titleL.copyWith(
                              color: c.textPrimary,
                            ),
                          ),
                          BKindChip(item.eventLabelFor(arabic)),
                          // §49 again. These rows sit under a hero that now
                          // dates itself, and an undated row beside a dated
                          // one reads as "this one is current".
                          if (context.filingAge(item.date) case final age?)
                            Text(
                              age,
                              style: BarbarianType.labelNano.copyWith(
                                color: c.textMuted,
                              ),
                            ),
                        ],
                      ),
                      // What was actually filed.
                      //
                      // This row used to carry the ticker, the event type, the
                      // age and the explanation — everything except the one
                      // line that says which filing it is. Mixed Oils filed
                      // two things on 20 August, its reply to the auditor and
                      // the Central Auditing Organization's report, and both
                      // rows rendered as an identical "MOSC · Auditor or
                      // accounts" one above the other. Today's feed showed the
                      // title all along; Home did not.
                      //
                      // In the title's own direction, because the exchange
                      // files in Arabic and the translation may or may not
                      // have reached this one.
                      const SizedBox(height: 7),
                      Directionality(
                        textDirection: isArabic(item.titleFor(arabic))
                            ? TextDirection.rtl
                            : TextDirection.ltr,
                        child: Text(
                          item.titleFor(arabic),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: BarbarianType.bodyM.copyWith(
                            color: c.textPrimary,
                            height: 1.4,
                          ),
                        ),
                      ),
                      // The same mark the news rows carry, so a reader
                      // switching between the two tabs is reading one thing in
                      // one voice rather than two that happen to sit together.
                      const SizedBox(height: 6),
                      BInsightLine(item.meaningFor(arabic)),
                      // The measured reason this filing is worth a look, on the
                      // same footing as the news rows beside it. A reader
                      // switching tabs should not find the explanation on one
                      // and not the other.
                      if (item.becauseFor(arabic).isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.fromLTRB(10, 8, 10, 9),
                          decoration: BoxDecoration(
                            color: c.hairline,
                            borderRadius: BorderRadius.circular(
                              BarbarianRadius.sm,
                            ),
                          ),
                          child: Text(
                            item.becauseFor(arabic),
                            style: BarbarianType.bodyS.copyWith(
                              color: c.textPrimary,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                      // The thing the company actually lodged. Everything
                      // above is our reading of the filing; this is it.
                      if (item.hasDocument) ...[
                        const SizedBox(height: 9),
                        for (final (n, url) in item.attachments.indexed) ...[
                          if (n > 0) const SizedBox(height: 8),
                          BFiledDocument(
                            url: url,
                            index: n,
                            count: item.attachments.length,
                          ),
                        ],
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// The headlines, which Home carried none of.
///
/// The app ingests a hundred and twenty stories a day and showed a reader
/// exactly zero of them on the screen they open first — which is most of why
/// opening it felt like arriving nowhere. Each row is somebody else's sentence
/// in their own language, with every outlet that ran it named, and it opens
/// out to the outlet rather than being retold here.
class HomeLatestNews extends ConsumerWidget {
  const HomeLatestNews({
    this.limit = 12,
    this.showHeader = true,
    this.excludeLeads = false,
    super.key,
  });

  final int limit;
  final bool showHeader;

  /// Whether to skip the stories the lead rail is already carrying. True only
  /// where the rail is on the same screen.
  final bool excludeLeads;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final feed = ref.watch(newsProvider).whenOrNull(data: (s) => s.value);
    final all = feed?.items ?? const <NewsItem>[];
    // Not the stories the rail above is already carrying.
    //
    // Both were picking from the top of the same ranked feed and landing on
    // the same headlines, so Home opened with five stories printed twice and
    // the first screen and a half said one thing.
    final skip = excludeLeads
        ? {for (final lead in leadStories(all)) lead.id}
        : const <String>{};
    final items = [
      for (final item in all)
        if (!skip.contains(item.id)) item,
    ].take(limit).toList();
    if (items.isEmpty) return const SizedBox.shrink();

    // Every outlet that ran it, named. A story three papers carried is more
    // established than one a single paper ran, and a "3 sources" count throws
    // away the half that says which.
    String? outletsFor(NewsItem item) {
      final byId = {for (final s in feed!.sources) s.id: s.name};
      final names = <String>{
        for (final a in item.sources)
          if (byId[a.id]?.trim() case final String n when n.isNotEmpty) n,
      };
      return names.isEmpty ? null : names.join(' · ');
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (showHeader)
          Row(
            children: [
              Expanded(child: BSectionLabel(l.homeLatestNews)),
              BInlineAction(
                l.homeAllNews,
                onTap: () {
                  ref
                      .read(todaySectionRequestProvider.notifier)
                      .ask(TodaySection.news);
                  context.go(Routes.today);
                },
              ),
            ],
          ),
        BPaperCard(
          radius: BarbarianRadius.xl,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final (i, item) in items.indexed) ...[
                if (i > 0) ...[
                  const SizedBox(height: 12),
                  Divider(height: 1, color: c.hairline),
                  const SizedBox(height: 12),
                ],
                // Tappable, out to the outlet that ran it. A headline a
                // reader cannot open is a claim they cannot check, and this
                // app does not retell somebody else's reporting.
                BPressable(
                  onTap: () {
                    final link = item.sources
                        .map((s) => s.link)
                        .firstWhere((s) => s.isNotEmpty, orElse: () => '');
                    if (link.isEmpty) return;
                    context.push(
                      Routes.articlePath(
                        BNavTab.home,
                        link,
                        outletsFor(item) ?? l.homeLatestNews,
                      ),
                    );
                  },
                  // The row runs in the headline's own direction, so the
                  // picture sits where that headline begins.
                  //
                  // It used to be pinned to the left while an Arabic headline
                  // right-aligned away from it, leaving a channel of blank
                  // paper between the two and making every row look broken.
                  // Most of this feed is Arabic, so most rows looked broken.
                  child: Directionality(
                    textDirection: isArabic(item.headlineFor(arabic))
                        ? TextDirection.rtl
                        : TextDirection.ltr,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // The outlet's own picture, where it published one. It
                        // collapses itself — gap included — when there is none
                        // or the download fails, so a row without a picture is
                        // a normal row rather than one with a hole in it.
                        BNewsThumb(url: item.image),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Why this story is worth a reader's time, above
                              // the headline rather than under it.
                              //
                              // The chip that used to sit here read "Contract
                              // or project" — the drawer the story was filed
                              // in, which a reader can see for themselves from
                              // the headline. It falls back to that chip only
                              // where there is no line, so the slot is never
                              // empty for the sake of it.
                              if (item.meaningFor(arabic) case final String why
                                  when why.isNotEmpty) ...[
                                BInsightLine(why),
                                const SizedBox(height: 7),
                              ] else if (item.eventTag case final String tag) ...[
                                BKindChip(tag),
                                const SizedBox(height: 7),
                              ],
                              Builder(
                                // The row above already runs in the headline's
                                // direction, so the text only has to follow it.
                                builder: (context) => Text(
                                  item.headlineFor(arabic),
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                  style: BarbarianType.bodyM.copyWith(
                                    color: c.textPrimary,
                                    height: 1.45,
                                  ),
                                ),
                              ),
                              // Only when it says something about *this*
                              // story.
                              //
                              // `because` is the measured reason a headline is
                              // worth a look, and it earns its space when a
                              // story names a listed company: "traded 3.4x its
                              // own normal volume that session". When none
                              // does, it falls back to one generic sentence —
                              // and every one of the 174 headlines carried the
                              // identical line, three rows running, which is
                              // noise wearing the costume of insight. The tag
                              // above is the part that varies.
                              if (item.weight != 'market' &&
                                  item.becauseFor(arabic).isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.fromLTRB(
                                    10,
                                    8,
                                    10,
                                    9,
                                  ),
                                  decoration: BoxDecoration(
                                    color: c.hairline,
                                    borderRadius: BorderRadius.circular(
                                      BarbarianRadius.sm,
                                    ),
                                  ),
                                  // In its own direction.
                                  //
                                  // The row runs in the headline's direction
                                  // and most headlines are Arabic, so an
                                  // English sentence in this box rendered
                                  // right-to-left with its full stop on the
                                  // left — visible the moment ticker matching
                                  // started working and the box appeared for
                                  // the first time.
                                  child: Directionality(
                                    textDirection:
                                        isArabic(item.becauseFor(arabic))
                                        ? TextDirection.rtl
                                        : TextDirection.ltr,
                                    child: Text(
                                      item.becauseFor(arabic),
                                      style: BarbarianType.bodyS.copyWith(
                                        color: c.textPrimary,
                                        height: 1.4,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                              // Outlet and age on one line, and the line survives if
                              // either half is missing — a story with no named outlet
                              // still has to say how old it is (§49). Home showed the
                              // outlet and no time at all, so a headline from Tuesday
                              // and one from an hour ago read exactly alike.
                              if ([
                                    outletsFor(item),
                                    context.newsAge(item.publishedAt),
                                  ].nonNulls.join(' · ')
                                  case final String byline
                                  when byline.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  byline,
                                  style: BarbarianType.labelNano.copyWith(
                                    color: c.textFaint,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// What rose and what fell — the sentence that says whether a green index was
/// the whole market or three heavyweights carrying it.
///
/// Counted from the shares themselves, not from any published breadth figure,
/// because none exists for this exchange. Tapping opens the same three counts
/// as lines over every session recorded so far.
class _Breadth extends ConsumerWidget {
  const _Breadth();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final history = ref
        .watch(marketHistoryProvider)
        .whenOrNull(data: (s) => s.value);
    final latest = history?.latest?.breadth;
    if (latest == null || latest.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.homeRoseAndFell),
        BPressable(
          onTap: () => _openChart(context, history!, l),
          child: BPaperCard(
            radius: BarbarianRadius.xl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Read in the bar's order — rose, unchanged, fell — so the
                // green, grey and red under them are the same three things in
                // the same three places. They used to run rose, fell,
                // unchanged above a bar running rose, unchanged, fell, which
                // put "17%" under "fell" and meant the unchanged column.
                Row(
                  children: [
                    _Count(
                      value: latest.up,
                      share: latest.counted,
                      label: l.breadthUp,
                      tone: c.up,
                    ),
                    const SizedBox(width: 14),
                    _Count(
                      value: latest.flat,
                      share: latest.counted,
                      label: l.breadthFlat,
                      tone: c.textFaint,
                    ),
                    const SizedBox(width: 14),
                    _Count(
                      value: latest.down,
                      share: latest.counted,
                      label: l.breadthDown,
                      tone: c.down,
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                // The proportions, as one bar. Three numbers tell a reader who
                // is counting; the bar tells one who is glancing, and it is
                // the shape of the session rather than its arithmetic.
                //
                // It was six points tall and butted straight together, which
                // on a phone is a hairline in three colours — present in the
                // widget tree, invisible on the glass, and reported missing.
                // Twelve points with a gap between the segments is a bar you
                // can read across the room, which is the only job it has.
                _BreadthBar(breadth: latest),
                const SizedBox(height: 10),
                Text(
                  l.breadthOf(latest.counted),
                  style: BarbarianType.bodyS.copyWith(color: c.textFaint),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  static void _openChart(
    BuildContext context,
    MarketHistory history,
    AppLocalizations l,
  ) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        final c = context.colors;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: BPaperCard(
              radius: BarbarianRadius.xl,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l.breadthChartTitle,
                    style: BarbarianType.headlineM.copyWith(
                      color: c.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  BBreadthChart(sessions: history.sessions),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      _Key(label: l.breadthUp, tone: c.up),
                      const SizedBox(width: 14),
                      _Key(label: l.breadthDown, tone: c.down),
                      const SizedBox(width: 14),
                      _Key(label: l.breadthFlat, tone: c.textFaint),
                    ],
                  ),
                  if (history.sessions.length < 2) ...[
                    const SizedBox(height: 14),
                    Text(
                      l.breadthOneSession,
                      style: BarbarianType.bodyS.copyWith(
                        color: c.textFaint,
                        height: 1.45,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _Count extends StatelessWidget {
  const _Count({
    required this.value,
    required this.share,
    required this.label,
    required this.tone,
  });

  final int value;

  /// The denominator the percentage is taken against — the shares counted,
  /// carried here rather than left to the reader to divide in their head.
  final int share;

  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        BNumText('$value', style: BarbarianType.displayS.copyWith(color: tone)),
        Text(
          label,
          style: BarbarianType.labelTiny.copyWith(
            color: c.textMuted,
            letterSpacing: 0.6,
          ),
        ),
        if (share > 0)
          BNumText(
            '${(value / share * 100).round()}%',
            style: BarbarianType.labelTiny.copyWith(color: c.textFaint),
          ),
      ],
    );
  }
}

class _Key extends StatelessWidget {
  const _Key({required this.label, required this.tone});

  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 14, height: 2, color: tone),
        const SizedBox(width: 6),
        Text(
          label,
          style: BarbarianType.labelNano.copyWith(color: c.textMuted),
        ),
      ],
    );
  }
}


/// The session's shape: what share of the market rose, held and fell.
///
/// Green, grey, red, left to right, each segment as wide as its share of the
/// count — and its percentage under it where the segment is wide enough to
/// carry one. A segment narrower than that gets no label rather than a
/// squeezed one, because a number cut in half is worse than no number.
class _BreadthBar extends StatelessWidget {
  const _BreadthBar({required this.breadth});

  final MarketBreadth breadth;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final total = breadth.counted > 0
        ? breadth.counted
        : breadth.up + breadth.down + breadth.flat;
    if (total <= 0) return const SizedBox.shrink();

    // Green, grey, red — rose, held, fell — in the order the counts above are
    // read in.
    final parts = <(int, Color)>[
      (breadth.up, c.up),
      (breadth.flat, c.hairlineStrong),
      (breadth.down, c.down),
    ];

    return SizedBox(
      key: const Key('breadth-bar'),
      height: 12,
      child: Row(
        // The reason this bar was invisible for as long as it existed.
        //
        // `Expanded` gives a child a tight WIDTH and a loose HEIGHT, and a
        // `ColoredBox` or `DecoratedBox` with no child takes the smallest
        // height it is allowed — which is zero. Three segments were being laid
        // out at the correct widths, 64pt, 54pt and 198pt, and painted 0pt
        // tall. The widget was in the tree and a test that only asked whether
        // it existed passed happily; nothing was ever on the glass.
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (index, part) in parts.indexed) ...[
            if (index > 0) const SizedBox(width: 3),
            if (part.$1 > 0)
              Expanded(
                flex: part.$1,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: part.$2,
                    borderRadius: BorderRadius.circular(BarbarianRadius.pill),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

