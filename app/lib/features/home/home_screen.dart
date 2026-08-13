import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/cash_or_trash.dart';
import '../../core/models/company.dart';
import '../../core/models/market_snapshot.dart';
import '../../core/models/opportunity.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/charts.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/price_caption.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';

/// Home (spec §6).
///
/// The canvas leads with an editorial card labelled "Daily insight". Spec §4 is
/// explicit that the product is the **Opportunity Scanner** and must not be
/// renamed, so the card keeps its design and carries the correct name plus the
/// §6 counts.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isSample = ref.watch(isSampleDataProvider);

    return BScreenScaffold(
      blockGap: 22,
      children: [
        const _Greeting(),
        const _ScannerHero(),
        const _MarketPulse(),
        const _CashOrTrashStrip(),
        const _WatchlistBlock(),
        const _LatestResearch(),
        if (isSample) const Center(child: BSampleDataNotice()),
      ],
    );
  }
}

class _Greeting extends ConsumerWidget {
  const _Greeting();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    return Row(
      children: [
        const BAvatarHatch(size: 46),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'The Barbarian',
                style: BarbarianType.displayS.copyWith(color: c.textPrimary),
              ),
              const SizedBox(height: 3),
              Text(
                'Egyptian equities, unfiltered',
                style: BarbarianType.bodyM.copyWith(color: c.textMuted),
              ),
            ],
          ),
        ),
        BSoftIconButton(
          icon: Icons.refresh_rounded,
          semanticLabel: 'Refresh',
          onTap: () {
            ref.invalidate(marketSnapshotProvider);
            ref.invalidate(companyDirectoryProvider);
            ref.invalidate(opportunityReportProvider);
            ref.invalidate(cashOrTrashProvider);
            // Prices are the thing a reader most expects a refresh to move.
            ref.invalidate(liveQuotesProvider);
          },
        ),
      ],
    );
  }
}

/// The lead card: today's scanner status.
class _ScannerHero extends ConsumerWidget {
  const _ScannerHero();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final async = ref.watch(opportunityReportProvider);

    return BAsyncView(
      value: async,
      loading: const BSkeletonBlock(height: 220, radius: BarbarianRadius.xl),
      errorTitle: 'Scanner not downloaded yet',
      errorBody: 'Open the app with a connection to fetch the latest report.',
      data: (sourced) {
        final report = sourced.value;
        return BPressable(
          onTap: () => context.push(Routes.scannerPath(BNavTab.home)),
          child: BDarkCard(
            radius: BarbarianRadius.xl,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          'OPPORTUNITY SCANNER',
                          style: BarbarianType.labelNano.copyWith(
                            color: c.onInkMuted,
                          ),
                        ),
                      ),
                    ),
                    const BDarkCircleButton(
                      icon: Icons.arrow_outward_rounded,
                      semanticLabel: 'Open the scanner',
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  report.headline ?? 'What deserves investigation now',
                  style: BarbarianType.headlineL.copyWith(
                    color: c.onInk,
                    height: 1.18,
                  ),
                ),
                if (report.lead case final ScannedCompany lead) ...[
                  const SizedBox(height: 18),
                  _LeadName(lead: lead),
                ],
                const SizedBox(height: 14),
                Row(
                  children: [
                    _ScanCount(
                      value: report.qualifiedCount,
                      label: 'Qualified',
                      tone: c.up,
                    ),
                    const SizedBox(width: 10),
                    _ScanCount(
                      value: report.watchingCount,
                      label: 'Watching',
                      tone: c.accentOnInk,
                    ),
                    const SizedBox(width: 10),
                    _ScanCount(
                      value: report.outcomes.length,
                      label: 'Outcomes',
                      tone: c.onInkMuted,
                    ),
                  ],
                ),
                if (report.date case final String d) ...[
                  const SizedBox(height: 14),
                  BStalenessCaption('Updated · $d', onDark: true),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

/// The top-scored name on today's watch.
///
/// Carries its own price history as a sparkline — the canvas puts a chart
/// inside the hero, and this is the one series here that is real. Evidence and
/// rank, never an instruction (spec §8).
class _LeadName extends ConsumerWidget {
  const _LeadName({required this.lead});

  final ScannedCompany lead;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final history =
        ref.watch(priceHistoryProvider(lead.ticker)).whenOrNull(
          data: (s) => s.value,
        ) ??
        const <PricePoint>[];
    final spark = history.length > 2
        ? history
              .sublist(history.length > 40 ? history.length - 40 : 0)
              .map((p) => p.close)
              .toList()
        : const <double>[];

    return Container(
      padding: const EdgeInsets.fromLTRB(15, 14, 15, 14),
      decoration: BoxDecoration(
        color: c.onInk.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(BarbarianRadius.md),
        border: Border.all(color: c.onInk.withValues(alpha: 0.10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                lead.ticker,
                style: BarbarianType.titleL.copyWith(color: c.onInk),
              ),
              const SizedBox(width: 9),
              // The chip takes the slack rather than competing with a Spacer,
              // which was clipping "Persistent watch" to "Persistent w…".
              if (lead.statusLabel case final String label)
                Expanded(
                  child: Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: c.accentOnInk.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(
                        BarbarianRadius.pill,
                      ),
                    ),
                      child: Text(
                        label,
                        style: BarbarianType.pill.copyWith(
                          color: c.accentOnInk,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                )
              else
                const Spacer(),
              const SizedBox(width: 8),
              _ScoreDial(score: lead.score, max: lead.maxScore),
            ],
          ),
          if (spark.length > 1) ...[
            const SizedBox(height: 12),
            BSparkline(values: spark, height: 30, color: c.accentOnInk),
          ],
          if (lead.researchSummary case final String summary) ...[
            const SizedBox(height: 12),
            Text(
              summary,
              style: BarbarianType.bodyS.copyWith(
                color: c.onInkMuted,
                height: 1.5,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}

/// The score as a filled track plus the figure — the rank is the point, so it
/// gets a shape rather than sitting as another number in a row of numbers.
class _ScoreDial extends StatelessWidget {
  const _ScoreDial({required this.score, required this.max});

  final int score;
  final int max;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final fraction = max <= 0 ? 0.0 : (score / max).clamp(0.0, 1.0);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 34,
          height: 4,
          child: Stack(
            children: [
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: c.onInk.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              FractionallySizedBox(
                widthFactor: fraction,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: c.accentOnInk,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 9),
        BNumText(
          '$score/$max',
          style: BarbarianType.figureS.copyWith(color: c.onInk),
        ),
      ],
    );
  }
}

class _ScanCount extends StatelessWidget {
  const _ScanCount({
    required this.value,
    required this.label,
    required this.tone,
  });

  final int value;
  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: c.onInk.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(BarbarianRadius.sm),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            BNumText(
              '$value',
              style: BarbarianType.figureM.copyWith(color: tone),
            ),
            const SizedBox(height: 4),
            Text(
              label.toUpperCase(),
              style: BarbarianType.labelTiny.copyWith(color: c.onInkMuted),
              maxLines: 1,
            ),
          ],
        ),
      ),
    );
  }
}

/// What the whole exchange did today, from the closes the app already holds.
///
/// The canvas puts an index level here. There is no licensed EGX index feed,
/// but breadth — how many rose against how many fell — is a real aggregate of
/// real closes, and arguably tells you more about a session than a single
/// number does.
class _MarketPulse extends ConsumerWidget {
  const _MarketPulse();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final snapshot = ref.watch(livePricesProvider);
    if (snapshot == null || snapshot.isEmpty) return const SizedBox.shrink();

    var up = 0, down = 0, flat = 0;
    for (final q in snapshot.stocks.values) {
      final change = q.resolvedChange;
      if (change == null || change == 0) {
        flat++;
      } else if (change > 0) {
        up++;
      } else {
        down++;
      }
    }
    final total = up + down + flat;
    if (total == 0) return const SizedBox.shrink();

    return BPressable(
      onTap: () => selectTab(context, BNavTab.market),
      child: BPaperCard(
        radius: BarbarianRadius.xl,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            BSectionLabel(
              'The session',
              trailing: Text(
                snapshot.date,
                style: BarbarianType.labelS.copyWith(color: c.textMuted),
              ),
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                BNumText(
                  '$up',
                  style: BarbarianType.displayL.copyWith(color: c.up),
                ),
                const SizedBox(width: 8),
                Text(
                  'rose',
                  style: BarbarianType.bodyM.copyWith(color: c.textMuted),
                ),
                const Spacer(),
                BNumText(
                  '$down',
                  style: BarbarianType.displayS.copyWith(color: c.down),
                ),
                const SizedBox(width: 8),
                Text(
                  'fell',
                  style: BarbarianType.bodyM.copyWith(color: c.textMuted),
                ),
              ],
            ),
            const SizedBox(height: 14),
            // One bar, three shares — the shape of the day at a glance.
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: SizedBox(
                height: 8,
                // stretch, or a ColoredBox with no intrinsic size collapses to
                // zero height and the whole bar disappears.
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (up > 0) Expanded(flex: up, child: ColoredBox(color: c.up)),
                    if (flat > 0)
                      Expanded(
                        flex: flat,
                        child: ColoredBox(color: c.hairlineStrong),
                      ),
                    if (down > 0)
                      Expanded(flex: down, child: ColoredBox(color: c.down)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              '$total companies · $flat unchanged',
              style: BarbarianType.bodyS.copyWith(color: c.textFaint),
            ),
          ],
        ),
      ),
    );
  }
}

class _CashOrTrashStrip extends ConsumerWidget {
  const _CashOrTrashStrip();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final async = ref.watch(cashOrTrashProvider);

    return BAsyncView(
      value: async,
      loading: const BSkeletonBlock(height: 96, radius: BarbarianRadius.xl),
      errorTitle: 'Cash or Trash not downloaded',
      errorBody: 'Open once with a connection.',
      data: (sourced) {
        final index = sourced.value;
        return BPressable(
          onTap: () => context.push(Routes.cashOrTrashPath(BNavTab.home)),
          child: BPaperCard(
            radius: BarbarianRadius.xl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Cash or Trash',
                            style: BarbarianType.headlineM.copyWith(
                              color: c.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${index.studiedCount} of ${index.total} '
                            'companies investigated',
                            style: BarbarianType.bodyM.copyWith(
                              color: c.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.chevron_right_rounded,
                      color: c.textMuted,
                      size: 22,
                    ),
                  ],
                ),
                if (index.companies.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  _VerdictSpectrum(index: index),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Every studied company placed on the Trash-to-Cash axis.
///
/// The series' whole identity is a signed score, so the preview shows the
/// spread rather than four counts: you can see at a glance that most of what
/// has been read so far sits left of centre.
class _VerdictSpectrum extends StatelessWidget {
  const _VerdictSpectrum({required this.index});

  final CashOrTrashIndex index;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    const min = CashOrTrashEntry.minScore;
    const max = CashOrTrashEntry.maxScore;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        LayoutBuilder(
          builder: (context, box) => SizedBox(
            height: 30,
            child: Stack(
              alignment: Alignment.centerLeft,
              children: [
                Container(
                  height: 4,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        BarbarianPalette.verdict(c, Verdict.toxic)
                            .withValues(alpha: 0.6),
                        BarbarianPalette.verdict(c, Verdict.recyclable)
                            .withValues(alpha: 0.45),
                        BarbarianPalette.verdict(c, Verdict.cash)
                            .withValues(alpha: 0.6),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                // Zero, so left-of-centre reads as left-of-centre.
                PositionedDirectional(
                  start: box.maxWidth / 2 - 0.5,
                  child: Container(width: 1, height: 14, color: c.hairlineStrong),
                ),
                for (final entry in index.companies)
                  PositionedDirectional(
                    start: (box.maxWidth * entry.gaugeFraction - 5).clamp(
                      0.0,
                      box.maxWidth - 10,
                    ),
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: BarbarianPalette.verdict(c, entry.verdict),
                        shape: BoxShape.circle,
                        border: Border.all(color: c.surface, width: 2),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Trash $min',
              style: BarbarianType.labelTiny.copyWith(
                color: c.textFaint,
                letterSpacing: 0,
              ),
            ),
            Text(
              '+$max Cash',
              style: BarbarianType.labelTiny.copyWith(
                color: c.textFaint,
                letterSpacing: 0,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _WatchlistBlock extends ConsumerWidget {
  const _WatchlistBlock();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final watchlist = ref.watch(watchlistProvider).value ?? const <String>[];
    final snapshot = ref.watch(livePricesProvider);
    final directory = ref
        .watch(companyDirectoryProvider)
        .whenOrNull(data: (d) => d.value);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(
          'From your watchlist',
          trailing: watchlist.isEmpty
              ? null
              : BInlineAction(
                  'Manage',
                  onTap: () => selectTab(context, BNavTab.you),
                ),
        ),
        if (watchlist.isEmpty)
          BEmptyState(
            title: 'Follow companies to build your watchlist',
            body:
                'Follow a company and its price, filings and research land '
                'here.',
            actionLabel: 'Browse companies',
            onAction: () => selectTab(context, BNavTab.market),
          )
        else
          for (var i = 0; i < watchlist.length; i += 2) ...[
            if (i > 0) const SizedBox(height: 12),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: _WatchTile(
                      ticker: watchlist[i],
                      dark: i.isEven,
                      quote: snapshot?.quoteFor(watchlist[i]),
                      company: directory?.byTicker(watchlist[i]),
                      sessionDate: snapshot?.date,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: i + 1 < watchlist.length
                        ? _WatchTile(
                            ticker: watchlist[i + 1],
                            dark: !i.isEven,
                            quote: snapshot?.quoteFor(watchlist[i + 1]),
                            company: directory?.byTicker(watchlist[i + 1]),
                            sessionDate: snapshot?.date,
                          )
                        : const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
          ],
        if (watchlist.isNotEmpty && snapshot != null) ...[
          const SizedBox(height: 10),
          const BPriceCaption(),
        ],
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
    required this.sessionDate,
  });

  final String ticker;
  final bool dark;
  final StockQuote? quote;
  final CompanySummary? company;
  final String? sessionDate;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final change = quote?.resolvedChangePercent;
    // Real end-of-day history, not a decorative squiggle: the tile shows the
    // last 30 sessions the app actually holds for this company.
    final history = ref
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
            'No quote',
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

class _LatestResearch extends ConsumerWidget {
  const _LatestResearch();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = ref
        .watch(cashOrTrashProvider)
        .whenOrNull(data: (s) => s.value);
    final entries = index?.companies ?? const <CashOrTrashEntry>[];
    if (entries.isEmpty) return const SizedBox.shrink();

    final recent = [...entries]
      ..sort((a, b) => (b.studiedAt ?? '').compareTo(a.studiedAt ?? ''));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const BSectionLabel('Latest research'),
        SizedBox(
          height: 210,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.zero,
            itemCount: recent.length.clamp(0, 5),
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, i) {
              final entry = recent[i];
              return BResearchCard(
                width: 250,
                titleMaxLines: 2,
                kicker: 'Cash or Trash',
                title: entry.summary?.isNotEmpty ?? false
                    ? entry.summary!
                    : '${entry.ticker}: the complete study',
                meta: entry.studiedAt,
                trailing: BVerdictBadge(
                  verdict: entry.verdict,
                  score: entry.score,
                  onDark: true,
                ),
                onTap: () =>
                    context.push(Routes.companyPath(BNavTab.home, entry.ticker)),
              );
            },
          ),
        ),
      ],
    );
  }
}
