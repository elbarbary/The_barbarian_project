import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/company.dart';
import '../../core/models/market_snapshot.dart';
import '../../core/models/opportunity.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/arc_gauge.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/charts.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/legal.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/price_caption.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import 'price_chart.dart';

/// The company screen (spec §13).
///
/// Tabs reconcile the canvas (Overview · Financials · Research · Filings ·
/// Discussion) with spec §13 (Overview · Financials · Price · Research · Pit):
/// Price is restored as its own tab, Filings folds into Research until a
/// filings feed exists, and Discussion is the in-company name for The Pit.
class CompanyScreen extends ConsumerStatefulWidget {
  const CompanyScreen({
    required this.ticker,
    required this.parentTab,
    super.key,
  });

  final String ticker;
  final BNavTab parentTab;

  @override
  ConsumerState<CompanyScreen> createState() => _CompanyScreenState();
}

enum _Tab { overview, financials, price, research, discussion }

class _CompanyScreenState extends ConsumerState<CompanyScreen> {
  _Tab _tab = _Tab.overview;
  PriceRange _range = PriceRange.y1;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(companyProvider(widget.ticker));
    final snapshot = ref.watch(livePricesProvider);
    final watchlist = ref.watch(watchlistProvider).value ?? const <String>[];
    final watched = watchlist.contains(widget.ticker);

    return BDetailScaffold(
      blockGap: 20,
      children: [
        BAsyncView(
          value: async,
          errorTitle: '${widget.ticker} is not on the device',
          errorBody:
              'Open this company once with a connection and it stays '
              'available offline.',
          data: (sourced) {
            final company = sourced.value;
            final quote = snapshot?.quoteFor(widget.ticker);

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _Header(
                  company: company,
                  quote: quote,
                  sessionDate: snapshot?.date,
                  watched: watched,
                  onToggleWatch: () => ref
                      .read(watchlistProvider.notifier)
                      .toggle(widget.ticker),
                ),
                const SizedBox(height: 18),
                BSegmentedRow(
                  style: BSegmentStyle.iconPill,
                  segments: const [
                    BSegment(label: 'Overview', icon: Icons.grid_view_rounded),
                    BSegment(label: 'Financials', icon: Icons.bar_chart_rounded),
                    BSegment(label: 'Price', icon: Icons.show_chart_rounded),
                    BSegment(label: 'Research', icon: Icons.article_outlined),
                    BSegment(label: 'Talk', icon: Icons.forum_outlined),
                  ],
                  selectedIndex: _Tab.values.indexOf(_tab),
                  onChanged: (i) => setState(() => _tab = _Tab.values[i]),
                ),
                const SizedBox(height: 20),
                switch (_tab) {
                  _Tab.overview => _Overview(
                    company: company,
                    quote: quote,
                    ticker: widget.ticker,
                  ),
                  _Tab.financials => _Financials(company: company),
                  _Tab.price => _Price(
                    ticker: widget.ticker,
                    range: _range,
                    onRange: (r) => setState(() => _range = r),
                    sessionDate: snapshot?.date,
                    session: company.market,
                  ),
                  _Tab.research => _Research(
                    ticker: widget.ticker,
                    parentTab: widget.parentTab,
                  ),
                  _Tab.discussion => const BEmptyState(
                    title: 'Discussion arrives with The Pit',
                    body:
                        'Company threads land here once the community backend '
                        'exists. Everything else on this screen works without '
                        'it.',
                  ),
                },
                const SizedBox(height: 18),
                const BLegalFootnote(),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.company,
    required this.quote,
    required this.sessionDate,
    required this.watched,
    required this.onToggleWatch,
  });

  static String _compact(num? v) {
    if (v == null) return '—';
    final d = v.toDouble();
    if (d >= 1e9) return '${(d / 1e9).toStringAsFixed(2)}bn';
    if (d >= 1e6) return '${(d / 1e6).toStringAsFixed(1)}m';
    if (d >= 1e3) return '${(d / 1e3).toStringAsFixed(1)}k';
    return d.toStringAsFixed(0);
  }

  final Company company;
  final StockQuote? quote;
  final String? sessionDate;
  final bool watched;
  final VoidCallback onToggleWatch;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final change = quote?.resolvedChange;
    final changePct = quote?.resolvedChangePercent;

    return BDarkCard(
      radius: BarbarianRadius.xl,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              BSoftIconButton(
                icon: Icons.arrow_back_ios_new_rounded,
                semanticLabel: 'Back',
                onDark: true,
                onTap: () => Navigator.of(context).maybePop(),
              ),
              const Spacer(),
              // The follow control changes its icon as well as its fill, so the
              // state is never carried by colour alone (spec §42).
              BSoftIconButton(
                icon: watched
                    ? Icons.bookmark_rounded
                    : Icons.bookmark_border_rounded,
                selected: watched,
                onDark: true,
                semanticLabel: watched
                    ? 'Following ${company.ticker}. Tap to unfollow.'
                    : 'Follow ${company.ticker}',
                onTap: onToggleWatch,
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      company.ticker,
                      style: BarbarianType.displayM.copyWith(color: c.onInk),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      company.name.en,
                      style: BarbarianType.bodyM.copyWith(
                        color: c.onInkMuted,
                      ),
                    ),
                    if (company.name.ar case final String ar) ...[
                      const SizedBox(height: 2),
                      BArabicName(ar, color: c.onInkMuted),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  BNumText(
                    quote == null
                        ? (company.market?.lastClose?.toStringAsFixed(2) ?? '—')
                        : quote!.close.toStringAsFixed(2),
                    style: BarbarianType.displayS.copyWith(color: c.onInk),
                  ),
                  if (change != null && changePct != null) ...[
                    const SizedBox(height: 6),
                    BChangeDelta(
                      value:
                          '${change.abs().toStringAsFixed(2)} '
                          '(${(changePct.abs() * 100).toStringAsFixed(2)}%)',
                      direction: BDirection.of(change),
                      onDark: true,
                      gap: 4,
                    ),
                  ],
                ],
              ),
            ],
          ),
          // The 52-week range lives in the header, as the canvas has it: the
          // price and where it sits in its own year belong together.
          if (company.priceHistory.length > 2) ...[
            const SizedBox(height: 6),
            Center(child: _RangeGauge(company: company, quote: quote)),
          ] else
            const SizedBox(height: 16),
          const SizedBox(height: 6),
          _HeaderStats(company: company, quote: quote),
          const SizedBox(height: 14),
          Row(
            children: [
              if (company.sector case final String s)
                Flexible(child: BKindChip(s, variant: BChipVariant.onDark)),
              const Spacer(),
              // The headline price on this screen is the live one, so the
              // caption beside it has to describe the live feed, not the daily
              // publish it was merged over.
              BPriceCaption(ticker: company.ticker, onDark: true),
            ],
          ),
        ],
      ),
    );
  }
}

/// The 52-week range, drawn on the dark header.
class _RangeGauge extends StatelessWidget {
  const _RangeGauge({required this.company, required this.quote});

  final Company company;
  final StockQuote? quote;

  @override
  Widget build(BuildContext context) {
    final closes = company.priceHistory.map((p) => p.close).toList();
    final low = closes.reduce((a, b) => a < b ? a : b);
    final high = closes.reduce((a, b) => a > b ? a : b);
    final last = quote?.close ?? company.market?.lastClose ?? closes.last;

    return BArcGauge(
      size: 196,
      value: last,
      min: low,
      max: high,
      big: last.toStringAsFixed(2),
      caption: '${company.priceHistory.length}-session range',
      lowLabel: low.toStringAsFixed(2),
      highLabel: high.toStringAsFixed(2),
    );
  }
}

/// Previous close · volume · market cap, on the header's own dark surface.
class _HeaderStats extends StatelessWidget {
  const _HeaderStats({required this.company, required this.quote});

  final Company company;
  final StockQuote? quote;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final cap = company.profile?['market_cap'];

    Widget cell(String label, String value) => Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: BarbarianType.labelTiny.copyWith(color: c.onInkMuted),
            maxLines: 1,
          ),
          const SizedBox(height: 5),
          BNumText(
            value,
            style: BarbarianType.figureS.copyWith(color: c.onInk),
          ),
        ],
      ),
    );

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        cell(
          'Prev close',
          quote?.previousClose?.toStringAsFixed(2) ?? '—',
        ),
        cell('Volume', _Header._compact(quote?.volume)),
        cell('Mkt cap', _Header._compact(cap is num ? cap : null)),
      ],
    );
  }
}

class _Overview extends ConsumerWidget {
  const _Overview({
    required this.company,
    required this.quote,
    required this.ticker,
  });

  final Company company;
  final StockQuote? quote;
  final String ticker;

  static String _num(Object? v, {int decimals = 2}) {
    if (v is! num) return '—';
    return v.toStringAsFixed(decimals);
  }

  static String _compact(Object? v) {
    if (v is! num) return '—';
    final d = v.toDouble();
    if (d >= 1e9) return '${(d / 1e9).toStringAsFixed(2)}bn';
    if (d >= 1e6) return '${(d / 1e6).toStringAsFixed(1)}m';
    if (d >= 1e3) return '${(d / 1e3).toStringAsFixed(1)}k';
    return d.toStringAsFixed(0);
  }

  static String _pct(Object? v) =>
      v is num ? '${v >= 0 ? '+' : ''}${v.toStringAsFixed(1)}%' : '—';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final p = company.profile ?? const <String, dynamic>{};
    final m = company.market;
    final verdict = ref
        .watch(cashOrTrashProvider)
        .whenOrNull(data: (s) => s.value.byTicker(ticker));

    // Every row the source actually carried. A field the scan did not have is
    // simply absent rather than rendered as a zero (spec §49).
    final session = <(String, String)>[
      if (m?.open != null) ('Open', _num(m!.open)),
      if (m?.high != null) ('Day high', _num(m!.high)),
      if (m?.low != null) ('Day low', _num(m!.low)),
      if (quote?.previousClose != null)
        ('Previous close', _num(quote!.previousClose)),
      if (m?.volume != null) ('Volume', _compact(m!.volume)),
      if (p['avg_volume_30d'] != null)
        ('Avg volume 30d', _compact(p['avg_volume_30d'])),
      if (p['relative_volume_10d'] != null)
        ('Relative volume', '${_num(p['relative_volume_10d'])}×'),
    ];

    final size = <(String, String)>[
      if (p['market_cap'] != null) ('Market cap', _compact(p['market_cap'])),
      if (p['shares_outstanding'] != null)
        ('Shares outstanding', _compact(p['shares_outstanding'])),
      if (p['free_float'] is num)
        ('Free float', '${((p['free_float'] as num) * 100).toStringAsFixed(1)}%'),
      if (p['float_shares'] != null)
        ('Float shares', _compact(p['float_shares'])),
      if (company.sector case final String sector) ('Sector', sector),
    ];

    final momentum = <(String, String)>[
      if (p['perf_1w'] != null) ('1 week', _pct(p['perf_1w'])),
      if (p['perf_1m'] != null) ('1 month', _pct(p['perf_1m'])),
      if (p['perf_3m'] != null) ('3 months', _pct(p['perf_3m'])),
      if (p['five_session_change'] != null)
        ('5 sessions', _pct(p['five_session_change'])),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Recent sessions, before anything else.
        //
        // The shape of the last few weeks is the first thing a reader wants
        // after tapping a name, and it used to be two taps away behind the
        // Price tab. The full chart still lives there; this is the glance.
        _RecentMoves(history: company.priceHistory),
        if (verdict != null) ...[
          const BSectionLabel('Six Pillars'),
          BPressable(
            onTap: () {},
            child: BPaperCard(
              radius: BarbarianRadius.xl,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  BVerdictBadge(verdict: verdict.verdict, score: verdict.score),
                  if (verdict.summary case final String s) ...[
                    const SizedBox(height: 12),
                    Text(
                      s,
                      style: BarbarianType.bodyM.copyWith(
                        color: c.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 22),
        ],
        if (session.isNotEmpty) ...[
          const BSectionLabel('This session'),
          _FactCard(rows: session),
          const SizedBox(height: 22),
        ],
        if (momentum.isNotEmpty) ...[
          const BSectionLabel('Performance'),
          _FactCard(rows: momentum),
          const SizedBox(height: 22),
        ],
        if (size.isNotEmpty) ...[
          const BSectionLabel('Company'),
          _FactCard(rows: size),
        ],
        if (session.isEmpty && momentum.isEmpty && size.isEmpty)
          const BEmptyState(
            title: 'No detail for this company yet',
            body:
                'The exchange scan carried only a closing price for this '
                'listing. More lands as the pipeline fills in.',
          ),
      ],
    );
  }
}

/// A label/value list on one card — the shape most of this screen wants.
class _FactCard extends StatelessWidget {
  const _FactCard({required this.rows});

  final List<(String, String)> rows;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return BPaperCard(
      radius: BarbarianRadius.xl,
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < rows.length; i++)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 13),
              foregroundDecoration:
                  i == rows.length - 1 ? null : BHairline.rowBottom(context),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      rows[i].$1,
                      style: BarbarianType.bodyM.copyWith(color: c.textMuted),
                    ),
                  ),
                  BNumText(
                    rows[i].$2,
                    style: BarbarianType.figureS.copyWith(
                      color: c.textPrimary,
                    ),
                    align: TextAlign.end,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _Financials extends StatelessWidget {
  const _Financials({required this.company});

  final Company company;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final periods = company.financials.annual;

    if (periods.isEmpty) {
      return const BEmptyState(
        title: 'No financial statements yet',
        body:
            'Reported figures are added company by company as each set of '
            'statements is read.',
      );
    }

    final revenues = periods.map((p) => p.revenue ?? 0).toList();
    final peak = revenues.isEmpty
        ? 1.0
        : revenues.reduce((a, b) => a > b ? a : b);
    final latest = periods.last;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BPaperCard(
          radius: BarbarianRadius.xl,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const BSectionLabel('Revenue, EGP m'),
              BBarChart(
                fractions: [
                  for (final r in revenues) peak == 0 ? 0.0 : r / peak,
                ],
                labels: [for (final p in periods) p.period],
                highlightIndex: periods.length - 1,
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: BStatTile(
                label: 'Revenue',
                value: _m(latest.revenue),
                unit: 'm',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: BStatTile(
                label: 'Net income',
                value: _m(latest.netIncome),
                unit: 'm',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: BStatTile(
                label: 'Net margin',
                value: latest.netMargin == null
                    ? '—'
                    : (latest.netMargin! * 100).toStringAsFixed(1),
                unit: '%',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: BStatTile(
                label: 'Net debt',
                value: _m(latest.netDebt),
                unit: 'm',
                // Rising net debt is not a gain, whatever its direction.
                delta: latest.netDebt == null
                    ? null
                    : const BChangeDelta(
                        value: 'see trend',
                        direction: BDirection.flat,
                      ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: BStatTile(
                label: 'Operating cash flow',
                value: _m(latest.operatingCashFlow),
                unit: 'm',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: BStatTile(
                label: 'Free cash flow',
                value: _m(latest.resolvedFreeCashFlow),
                unit: 'm',
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          'Figures as reported for ${latest.period}. Free cash flow is derived '
          'from operating cash flow less capital expenditure where it is not '
          'reported directly.',
          style: BarbarianType.bodyS.copyWith(color: c.textFaint),
        ),
      ],
    );
  }

  static String _m(double? v) =>
      v == null ? '—' : v.abs() >= 1000
          ? '${(v / 1000).toStringAsFixed(1)}k'
          : v.toStringAsFixed(0);
}

class _Price extends ConsumerWidget {
  const _Price({
    required this.ticker,
    required this.range,
    required this.onRange,
    required this.sessionDate,
    required this.session,
  });

  final String ticker;
  final PriceRange range;
  final ValueChanged<PriceRange> onRange;
  final String? sessionDate;
  final CompanyMarket? session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(priceHistoryProvider(ticker));

    return BAsyncView(
      value: async,
      errorTitle: 'No price history downloaded',
      errorBody: 'Open this company once with a connection.',
      data: (sourced) {
        final all = sourced.value;
        if (all.isEmpty && session?.high == null) {
          return const BEmptyState(
            title: 'No price history for this company',
            body:
                'Neither the exchange scan nor the price source publishes a '
                'series for this listing. Its latest close is still shown on '
                'Overview.',
          );
        }
        final windowed = range.apply(all);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            BPaperCard(
              radius: BarbarianRadius.xl,
              child: BPriceChart(points: windowed, session: session),
            ),
            const SizedBox(height: 14),
            BSegmentedRow(
              segments: [
                for (final r in PriceRange.values) BSegment(label: r.label),
              ],
              selectedIndex: PriceRange.values.indexOf(range),
              onChanged: (i) => onRange(PriceRange.values[i]),
            ),
            const SizedBox(height: 14),
            // Dated by the chart's own last point, not by the session the rest
            // of the screen is showing. This chart is end-of-day and the header
            // price above it is live, so they routinely end on different days —
            // naming the header's date here claimed a bar the chart does not
            // draw.
            BStalenessCaption(
              windowed.isEmpty
                  ? 'No sessions in this range'
                  : '${windowed.length} sessions · to ${windowed.last.date}',
            ),
          ],
        );
      },
    );
  }
}

class _Research extends ConsumerWidget {
  const _Research({required this.ticker, required this.parentTab});

  final String ticker;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final config = ref.watch(appConfigProvider);
    final entry = ref
        .watch(cashOrTrashProvider)
        .whenOrNull(data: (s) => s.value.byTicker(ticker));
    final scanned = ref
        .watch(opportunityReportProvider)
        .whenOrNull(data: (s) => s.value.allFor(ticker));

    if (entry == null && (scanned == null || scanned.isEmpty)) {
      return const BEmptyState(
        title: 'No study published on this company yet',
        body:
            'Companies are studied one at a time. When this one is read, the '
            'investigation appears here.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (entry != null) ...[
          const BSectionLabel('Six Pillars'),
          BPaperCard(
            radius: BarbarianRadius.xl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // The dial that used to sit here is gone. Board v2 deleted it
                // on purpose and the reason is legal rather than visual: a
                // needle sweeping toward the right edge is a verdict shape
                // whatever the caption says, and a screenshot of it, without
                // the caption, is a rating on a named issuer published by
                // somebody with no licence to rate anything.
                Text(
                  entry.verdict.sentence,
                  style: BarbarianType.headlineM.copyWith(
                    color: c.textPrimary,
                  ),
                ),
                const SizedBox(height: 14),
                BPillarLedger(
                  rows: [
                    for (final p in entry.pillars)
                      (p.pillar, p.score, p.basis),
                  ],
                  total: entry.score,
                ),
                const SizedBox(height: 16),
                // Mandatory on every file that shows a band (spec §8.2). A
                // score with no stated way to move it is a rating; a score
                // with the filing that would change it is a conditional
                // observation about published arithmetic.
                const BWhatWouldChangeThis(conditions: []),
                if (entry.summary case final String s) ...[
                  const SizedBox(height: 12),
                  Text(
                    s,
                    style: BarbarianType.bodyM.copyWith(
                      color: c.textSecondary,
                    ),
                  ),
                ],
                if (entry.hasArticle) ...[
                  const SizedBox(height: 16),
                  BPressable(
                    onTap: () => context.push(
                      Routes.articlePath(
                        parentTab,
                        config.resolveArticleUrl(entry.articleUrl!),
                        '\$ticker · Six Pillars',
                      ),
                    ),
                    child: Container(
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      decoration: BoxDecoration(
                        color: c.actionSurface,
                        borderRadius: BorderRadius.circular(
                          BarbarianRadius.pill,
                        ),
                      ),
                      child: Text(
                        'Read the full investigation',
                        style: BarbarianType.label.copyWith(color: c.onAction),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
        if (scanned != null && scanned.isNotEmpty) ...[
          const SizedBox(height: 20),
          const BSectionLabel('Opportunity Scanner history'),
          for (final s in scanned)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: BPaperCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        BKindChip(
                          switch (s.scanStatus) {
                            ScanStatus.qualified => 'Qualified',
                            ScanStatus.watching => 'Watching',
                            ScanStatus.rejected => 'Rejected',
                          },
                          variant: BChipVariant.ember,
                        ),
                        const Spacer(),
                        BNumText(
                          '${s.score} / ${s.maxScore}',
                          style: BarbarianType.pill.copyWith(
                            color: c.textMuted,
                          ),
                        ),
                      ],
                    ),
                    if (s.headline case final String h) ...[
                      const SizedBox(height: 10),
                      Text(
                        h,
                        style: BarbarianType.bodyM.copyWith(
                          color: c.textPrimary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ],
    );
  }
}

/// The last few weeks at a glance, and the last few sessions day by day.
///
/// Two different questions, both asked the moment a name is opened: "which way
/// has this been going" and "what did it do yesterday". The sparkline answers
/// the first, the day strip the second, and neither needs a tab change.
///
/// Silent when the source has no series. 25 of 282 listings publish none, and an
/// empty chart frame says less than no chart at all (spec §49).
class _RecentMoves extends StatelessWidget {
  const _RecentMoves({required this.history});

  final List<PricePoint> history;

  /// Sessions in the sparkline. About six weeks of EGX trading — long enough to
  /// show a trend, short enough that a single day still reads.
  static const int _window = 30;

  /// Days in the strip below it.
  static const int _days = 5;

  @override
  Widget build(BuildContext context) {
    if (history.length < 3) return const SizedBox.shrink();

    final window = history.length <= _window
        ? history
        : history.sublist(history.length - _window);
    final change = window.first.close == 0
        ? null
        : (window.last.close - window.first.close) / window.first.close;

    // Each day's move needs the close before it, so the strip starts one bar in.
    final strip = <({PricePoint point, double? change})>[];
    for (var i = history.length - _days; i < history.length; i++) {
      if (i < 1) continue;
      final prev = history[i - 1].close;
      strip.add((
        point: history[i],
        change: prev == 0 ? null : (history[i].close - prev) / prev,
      ));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            BSectionLabel('Last ${window.length} sessions'),
            const Spacer(),
            if (change != null)
              BChangeDelta(
                value: '${(change.abs() * 100).toStringAsFixed(1)}%',
                direction: change >= 0 ? BDirection.up : BDirection.down,
                style: BarbarianType.labelS,
                gap: 3,
              ),
          ],
        ),
        BPaperCard(
          radius: BarbarianRadius.xl,
          child: Column(
            children: [
              BSparkline(
                values: [for (final p in window) p.close],
                height: 56,
              ),
              if (strip.isNotEmpty) ...[
                const SizedBox(height: 16),
                Row(
                  children: [
                    for (final day in strip)
                      Expanded(child: _DayCell(day: day)),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}

/// One session in the day strip: how far it moved, and which way.
class _DayCell extends StatelessWidget {
  const _DayCell({required this.day});

  final ({PricePoint point, double? change}) day;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final change = day.change;
    final tone = change == null || change == 0
        ? c.textMuted
        : (change > 0 ? c.up : c.down);
    // The bar is scaled against 4%, which covers an ordinary EGX session; a
    // limit move pins it rather than flattening every other day on the strip.
    final magnitude = ((change ?? 0).abs() / 0.04).clamp(0.12, 1.0);

    return Semantics(
      label: '${day.point.date}: '
          '${change == null ? 'unchanged' : '${change >= 0 ? 'up' : 'down'} '
              '${(change.abs() * 100).toStringAsFixed(1)} percent'}',
      excludeSemantics: true,
      child: Column(
        children: [
          // 24pt of headroom so every bar sits on the same baseline.
          SizedBox(
            height: 26,
            child: Align(
              alignment: Alignment.bottomCenter,
              child: Container(
                width: 6,
                height: 26 * magnitude,
                decoration: BoxDecoration(
                  color: tone.withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            change == null
                ? '—'
                : '${change >= 0 ? '+' : '−'}'
                    '${(change.abs() * 100).toStringAsFixed(1)}',
            style: BarbarianType.labelNano.copyWith(color: tone),
          ),
          const SizedBox(height: 2),
          Text(
            // "17 Aug" is enough; the year is on the header caption.
            _shortDate(day.point.date),
            style: BarbarianType.labelTiny.copyWith(color: c.textFaint),
          ),
        ],
      ),
    );
  }

  static String _shortDate(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return iso;
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${d.day} ${months[d.month - 1]}';
  }
}
