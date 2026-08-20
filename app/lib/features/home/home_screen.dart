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
import '../../core/widgets/breadth_chart.dart';
import '../../core/widgets/charts.dart';
import '../../core/models/explainer.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/explainer_sheet.dart';
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
        // The order answers the two questions somebody opens this app with,
        // in that order: what matters today, and what has just happened. It
        // used to open on one filing under a label that repeated itself, which
        // told a reader neither.
        // Filings lead. They are the only thing on this screen the exchange
        // itself published about a named company on the day it happened —
        // everything else is either a price or somebody's reporting of one.
        BSectionLabel(l.homeFiledHero),
        const _DailyInsight(),
        const _AlsoFiled(),
        const _Breadth(),
        const _Indices(),
        const _LatestNews(),
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
    final feed = ref
        .watch(disclosuresProvider)
        .whenOrNull(data: (s) => s.value);
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
    final volumeKicker = (item.evidence?.ratio != null && item.evidence!.ratio > 0)
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
                      letterSpacing: 1.6,
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
                      letterSpacing: 1.6,
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
              style: BarbarianType.headlineM.copyWith(color: c.onInk),
            ),
            const SizedBox(height: 10),
            Text(
              item.meaningFor(arabic),
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

/// EGX 30, 70 and 100 side by side, each with the shape we have so far.
///
/// One index told a reader whether the thirty largest listings moved, which is
/// not the same question as whether the market did — the 70 and the 100 are
/// equal-weighted, so a day where they fall while the 30 rises is a day carried
/// by a handful of heavyweights. Three cards make that visible at a glance.
///
/// The sparkline is drawn from `market-history.json`, which is written one
/// session at a time because no index series is published anywhere we can
/// reach. Until there are two sessions there is nothing to draw and the card
/// simply carries the level, which is what it did before.
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
    final level = index.level;
    final change = index.changePercent;

    return BPressable(
      onTap: () => showExplainer(
        context,
        Explainer(
          termId: 'index.${index.id}',
          title: index.label.isEmpty ? index.id : index.label,
          plain: index.plain,
          token: index.token,
          workings: index.workings,
          yardstick: index.yardstick,
          // An index level has no published band to be unusual against, and
          // defaulting to "ordinary" would be a claim.
          notability: Notability.unjudged,
          // The exchange publishes the level; we only reshape the sentence.
          provenance: Provenance.fact,
          source: index.source,
        ),
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
                index.label.isEmpty ? index.id : index.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: BarbarianType.labelTiny.copyWith(
                  color: c.onInkMuted,
                  letterSpacing: 1.2,
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
class _AlsoFiled extends ConsumerWidget {
  const _AlsoFiled();

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
        .take(4)
        .toList();
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: BSectionLabel(l.homeAlsoFiled)),
            BInlineAction(
              l.homeAllFilings,
              onTap: () => context.go(Routes.today),
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
                  onTap: () => context.push(
                    Routes.companyPath(BNavTab.home, item.tickers.first),
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
                          BKindChip(
                            arabic && item.eventLabelAr.isNotEmpty
                                ? item.eventLabelAr
                                : item.eventLabel,
                          ),
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
                      const SizedBox(height: 6),
                      Text(
                        item.meaningFor(arabic),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: BarbarianType.bodyS.copyWith(
                          color: c.textSecondary,
                          height: 1.4,
                        ),
                      ),
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
class _LatestNews extends ConsumerWidget {
  const _LatestNews();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final feed = ref.watch(newsProvider).whenOrNull(data: (s) => s.value);
    final items = (feed?.items ?? const <NewsItem>[]).take(4).toList();
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
        Row(
          children: [
            Expanded(child: BSectionLabel(l.homeLatestNews)),
            BInlineAction(l.homeAllNews, onTap: () => context.go(Routes.today)),
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Directionality(
                        // Direction follows the string actually rendered, not
                        // the original: an English translation laid out
                        // right-to-left is the bug this replaced.
                        textDirection: isArabic(item.headlineFor(arabic))
                            ? TextDirection.rtl
                            : TextDirection.ltr,
                        child: Text(
                          item.headlineFor(arabic),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: BarbarianType.bodyM.copyWith(
                            color: c.textPrimary,
                            height: 1.45,
                          ),
                        ),
                      ),
                      // Why a reader should care, not just what happened. "A
                      // company signed a contract" is an event; "a contract is
                      // revenue that has not been earned yet" is the reason it is
                      // worth a glance. Written once per type by a person, shared
                      // with the filings feed.
                      if (item.meaningFor(arabic) case final String why
                          when why.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          why,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: BarbarianType.bodyS.copyWith(
                            color: c.textSecondary,
                            height: 1.45,
                          ),
                        ),
                      ],
                      // Outlet and age on one line, and the line survives if
                      // either half is missing — a story with no named outlet
                      // still has to say how old it is (§49). Home showed the
                      // outlet and no time at all, so a headline from Tuesday
                      // and one from an hour ago read exactly alike.
                      if ([outletsFor(item), context.newsAge(item.publishedAt)]
                          .nonNulls
                          .join(' · ') case final String byline
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
                Row(
                  children: [
                    _Count(value: latest.up, label: l.breadthUp, tone: c.up),
                    const SizedBox(width: 14),
                    _Count(
                      value: latest.down,
                      label: l.breadthDown,
                      tone: c.down,
                    ),
                    const SizedBox(width: 14),
                    _Count(
                      value: latest.flat,
                      label: l.breadthFlat,
                      tone: c.textFaint,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // The proportions, as one bar. Three numbers tell a reader who
                // is counting; the bar tells one who is glancing, and it is
                // the shape of the session rather than its arithmetic.
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: SizedBox(
                    height: 6,
                    child: Row(
                      children: [
                        Expanded(flex: latest.up, child: ColoredBox(color: c.up)),
                        Expanded(
                          flex: latest.flat,
                          child: ColoredBox(color: c.hairlineStrong),
                        ),
                        Expanded(
                          flex: latest.down,
                          child: ColoredBox(color: c.down),
                        ),
                      ],
                    ),
                  ),
                ),
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
  const _Count({required this.value, required this.label, required this.tone});

  final int value;
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
            letterSpacing: 1.2,
          ),
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
