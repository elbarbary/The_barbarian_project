import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/company.dart';
import '../../core/models/exit_liquidity.dart';
import '../../core/models/explainer.dart';
import '../../core/models/market_snapshot.dart';
import '../../core/models/opportunity.dart';
import '../../core/models/profit_movement.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/arc_gauge.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/charts.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/explainer_sheet.dart';
import '../../core/widgets/legal.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/price_caption.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import 'price_chart.dart';
import '../../l10n/app_localizations.dart';

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
    final l = AppLocalizations.of(context);
    final async = ref.watch(companyProvider(widget.ticker));
    final snapshot = ref.watch(livePricesProvider);
    final watchlist = ref.watch(watchlistProvider).value ?? const <String>[];
    final watched = watchlist.contains(widget.ticker);

    return BDetailScaffold(
      blockGap: 20,
      children: [
        BAsyncView(
          value: async,
          errorTitle: l.companyNotOnDevice(widget.ticker),
          errorBody: l.companyNotOnDeviceBody,
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
                  segments: [
                    BSegment(
                      label: l.tabOverview,
                      icon: Icons.grid_view_rounded,
                    ),
                    BSegment(
                      label: l.tabFinancials,
                      icon: Icons.bar_chart_rounded,
                    ),
                    BSegment(label: l.tabPrice, icon: Icons.show_chart_rounded),
                    BSegment(
                      label: l.tabResearch,
                      icon: Icons.article_outlined,
                    ),
                    BSegment(label: l.tabTalk, icon: Icons.forum_outlined),
                  ],
                  selectedIndex: _Tab.values.indexOf(_tab),
                  onChanged: (i) => setState(() => _tab = _Tab.values[i]),
                ),
                const SizedBox(height: 20),
                switch (_tab) {
                  _Tab.overview => _Overview(
                    parentTab: widget.parentTab,
                    company: company,
                    quote: quote,
                    ticker: widget.ticker,
                  ),
                  _Tab.financials => _Financials(
                    company: company,
                    parentTab: widget.parentTab,
                  ),
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
                  _Tab.discussion => BEmptyState(
                    title: l.discussionArrives,
                    body: l.discussionBody,
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
    final l = AppLocalizations.of(context);
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
                semanticLabel: l.back,
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
                    ? l.followingTicker(company.ticker)
                    : l.followTicker(company.ticker),
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
                      style: BarbarianType.bodyM.copyWith(color: c.onInkMuted),
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
                          '${change.abs().toStringAsFixed(2)} (${(changePct.abs() * 100).toStringAsFixed(2)}%)',
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
            Center(
              child: _RangeGauge(company: company, quote: quote),
            ),
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
    final l = AppLocalizations.of(context);
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
        cell(l.figPrevClose, quote?.previousClose?.toStringAsFixed(2) ?? '—'),
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
    required this.parentTab,
  });

  final Company company;
  final StockQuote? quote;
  final String ticker;

  /// Which slot stays lit when the exit answer is opened from here.
  final BNavTab parentTab;

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
    final l = AppLocalizations.of(context);
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
      if (m?.high != null) (l.figDayHigh, _num(m!.high)),
      if (m?.low != null) ('Day low', _num(m!.low)),
      if (quote?.previousClose != null)
        (l.figPreviousClose, _num(quote!.previousClose)),
      if (m?.volume != null) ('Volume', _compact(m!.volume)),
      if (p['avg_volume_30d'] != null)
        (l.figAvgVolume30d, _compact(p['avg_volume_30d'])),
    ];

    final size = <(String, String)>[
      if (p['shares_outstanding'] != null)
        (l.figSharesOutstanding, _compact(p['shares_outstanding'])),
      if (p['float_shares'] != null)
        (l.figFloatShares, _compact(p['float_shares'])),
      if (company.sector case final String sector) ('Sector', sector),
    ];

    // Built from published operands only: a builder returns null when an
    // input is missing, so a row never appears without the arithmetic behind
    // it. That is the whole discipline — the sentence is only as good as the
    // sum it can show.
    final explained = <Explainer?>[
      Explainers.relativeVolume(company),
      Explainers.freeFloat(company),
      Explainers.closeStrength(company),
      Explainers.move(
        title: l.movedThisMonthLabel,
        window: 'a month',
        percent: p['perf_1m'] is num ? (p['perf_1m'] as num).toDouble() : null,
        asOf: m?.date,
      ),
      Explainers.marketCap(company),
    ].nonNulls.toList();

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
        // The exit question, placed by severity rather than by habit.
        //
        // A share that stops trading gets this above everything, because
        // somebody reading about a company they cannot sell needs that before
        // they read anything else about it. A share that trades every day gets
        // a quiet row further down, next to the other measurements. Same rule
        // the rest of the app follows: emphasis is set by a measured fact and
        // a published threshold, never by what we would like to draw attention
        // to.
        if (ExitLiquidity.of(company) case final ExitLiquidity exit)
          if (exit.stops) _ExitSummary(exit: exit, parentTab: parentTab),
        if (verdict != null) ...[
          BSectionLabel(l.studyLabel),
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
        // The figures that mean something, said in words first.
        //
        // These four rows used to be part of the fact tables below — "Relative
        // volume  0.43×", "Free float  2.9%". Both are true and neither means
        // anything to somebody who has not been taught to read a tape, which
        // makes them exactly the product this app exists not to be. Each one
        // now leads with a sentence, carries its exact figure underneath, and
        // opens into the arithmetic that produced it (spec §4.18, §6.2).
        if (ExitLiquidity.of(company) case final ExitLiquidity exit)
          if (!exit.stops) ...[
            _ExitSummary(exit: exit, parentTab: parentTab),
            const SizedBox(height: 22),
          ],
        if (explained.isNotEmpty) ...[
          BSectionLabel(l.whatNumbersSay),
          BPaperCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (var i = 0; i < explained.length; i++)
                  BPlainNumber(
                    explainer: explained[i],
                    last: i == explained.length - 1,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _WhatThatMeans(company: company),
          const SizedBox(height: 22),
        ],
        if (session.isNotEmpty) ...[
          BSectionLabel(l.thisSession),
          _FactCard(rows: session),
          const SizedBox(height: 22),
        ],
        if (momentum.isNotEmpty) ...[
          BSectionLabel(l.performance),
          _FactCard(rows: momentum),
          const SizedBox(height: 22),
        ],
        if (size.isNotEmpty) ...[
          const BSectionLabel('Company'),
          _FactCard(rows: size),
        ],
        if (session.isEmpty && momentum.isEmpty && size.isEmpty)
          BEmptyState(
            title: l.noDetailYet,
            body:
                'The exchange scan carried only a closing price for this listing. More lands as the pipeline fills in.',
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
              foregroundDecoration: i == rows.length - 1
                  ? null
                  : BHairline.rowBottom(context),
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
                    style: BarbarianType.figureS.copyWith(color: c.textPrimary),
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

/// What the company reported, and what it means.
///
/// Two sources, both filed. Annual statements — assets, liabilities, equity,
/// net income, operating cash flow — come from the company's filed accounts and
/// were checked line by line against El Sewedy's own published FY2024 and
/// FY2021 releases, where they match to the pound. Interim net profit comes
/// from the exchange's own results announcements.
///
/// There is no revenue line in either source, so there are no margins here.
/// The previous version of this screen drew a revenue bar chart from numbers
/// nobody had ever filed; an absent line is now absent rather than invented.
class _Financials extends StatelessWidget {
  const _Financials({required this.company, required this.parentTab});

  final Company company;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final annual = company.financials.annual;
    final interim = company.financials.quarterly;

    if (annual.isEmpty && interim.isEmpty) {
      return BEmptyState(title: l.finNoFigures, body: l.finNoFiguresBodyFull);
    }

    final latest = annual.isNotEmpty ? annual.last : interim.last;
    final prior = comparablePrior(annual.isNotEmpty ? annual : interim, latest);
    final move = profitMovement(latest, prior);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BPaperCard(
          radius: BarbarianRadius.xl,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              BSectionLabel(l.finNetProfitReported),
              const SizedBox(height: 10),
              BNumText(
                formatMillions(latest.netIncome),
                style: BarbarianType.displayS.copyWith(color: c.textPrimary),
              ),
              const SizedBox(height: 2),
              Text(
                l.finEgpMillionsPeriod(latest.period),
                style: BarbarianType.bodyS.copyWith(color: c.textFaint),
              ),
              if (move != null) ...[
                const SizedBox(height: 12),
                BChangeDelta(
                  value: move.delta,
                  direction: switch (move.direction) {
                    ProfitDirection.up => BDirection.up,
                    ProfitDirection.down => BDirection.down,
                    ProfitDirection.flat => BDirection.flat,
                  },
                ),
                const SizedBox(height: 6),
                Text(
                  move.sentence,
                  style: BarbarianType.bodyM.copyWith(color: c.textSecondary),
                ),
              ],
            ],
          ),
        ),

        // The exchange's own announcement of a part-year result. It lands
        // months before the audited annual accounts do, so it is usually the
        // freshest thing on this screen and deserves its own place rather than
        // being sorted in among the years.
        // Only when the headline is showing an annual figure. With no annual
        // data the headline is already the latest filing, and this would
        // print the same number twice.
        if (interim.isNotEmpty && annual.isNotEmpty) ...[
          const SizedBox(height: 14),
          _InterimCard(
            period: interim.last,
            prior: comparablePrior(interim, interim.last),
            company: company,
            parentTab: parentTab,
          ),
        ],

        if (latest.assets != null || latest.equity != null) ...[
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: BStatTile(
                  label: l.finTotalAssets,
                  value: formatMillions(latest.assets),
                  unit: 'm',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: BStatTile(
                  label: 'Owners\' equity',
                  value: formatMillions(latest.equity),
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
                  label: l.finTotalLiabilities,
                  value: formatMillions(latest.liabilities),
                  unit: 'm',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: BStatTile(
                  label: l.finCashFromOps,
                  value: formatMillions(latest.operatingCashFlow),
                  unit: 'm',
                ),
              ),
            ],
          ),
        ],

        if (annual.length > 1) ...[
          const SizedBox(height: 14),
          BPaperCard(
            radius: BarbarianRadius.xl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                BSectionLabel(l.finNetProfitByYear),
                const SizedBox(height: 8),
                for (final p in annual.reversed)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 5),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            p.period,
                            style: BarbarianType.bodyM.copyWith(
                              color: c.textSecondary,
                            ),
                          ),
                        ),
                        BNumText(
                          formatMillions(p.netIncome),
                          style: BarbarianType.bodyM.copyWith(
                            color: c.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 16),
        Text(
          'Figures in EGP millions, as filed. Neither source states revenue, so margins are not shown rather than estimated. Read from ${_sourceName(context, latest.source)}.',
          style: BarbarianType.bodyS.copyWith(color: c.textFaint),
        ),
      ],
    );
  }

  /// Named from the URL so the attribution cannot drift from the link.
  ///
  /// Takes a context rather than being static: the source name is shown to a
  /// reader, so it is translated like everything else they read.
  static String _sourceName(BuildContext context, String? url) {
    final l = AppLocalizations.of(context);
    if (url == null) return l.sourceFiledAccounts;
    if (url.contains('egx.com.eg')) return l.sourceExchange;
    if (url.contains('mubasher')) return l.sourceMubasher;
    return l.sourceFiledAccounts;
  }
}

/// The most recent part-year result the exchange announced.
class _InterimCard extends StatelessWidget {
  const _InterimCard({
    required this.period,
    required this.prior,
    required this.company,
    required this.parentTab,
  });

  final FinancialPeriod period;
  final FinancialPeriod? prior;
  final Company company;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final move = profitMovement(period, prior);

    return BPaperCard(
      radius: BarbarianRadius.xl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Wrap rather than Row: the label and the basis chip are both
          // variable length and collided on a narrow phone.
          Wrap(
            spacing: 8,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              BSectionLabel(l.finLatestFiling),
              if (period.basis != null)
                BKindChip(
                  period.basis == 'consolidated' ? 'Group' : l.finCompanyOnly,
                ),
            ],
          ),
          const SizedBox(height: 10),
          BNumText(
            formatMillions(period.netIncome),
            style: BarbarianType.headlineM.copyWith(color: c.textPrimary),
          ),
          const SizedBox(height: 2),
          Text(
            l.finEgpMillionsPeriod(period.period),
            style: BarbarianType.bodyS.copyWith(color: c.textFaint),
          ),
          if (move != null) ...[
            const SizedBox(height: 8),
            Text(
              move.sentence,
              style: BarbarianType.bodyM.copyWith(color: c.textSecondary),
            ),
          ],
          if (period.source != null) ...[
            const SizedBox(height: 10),
            // Spec §50: the reader can go and read the filing itself.
            BInlineAction(
              l.finReadFiling,
              onTap: () => context.push(
                Routes.articlePath(
                  parentTab,
                  period.source!,
                  '${company.ticker} · ${period.period}',
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
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
    final l = AppLocalizations.of(context);
    final async = ref.watch(priceHistoryProvider(ticker));

    return BAsyncView(
      value: async,
      errorTitle: l.priceNoHistoryTitle,
      errorBody: l.priceNoHistoryBody,
      data: (sourced) {
        final all = sourced.value;
        if (all.isEmpty && session?.high == null) {
          return BEmptyState(
            title: l.noPriceHistory,
            body:
                'Neither the exchange scan nor the price source publishes a series for this listing. Its latest close is still shown on Overview.',
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
                  ? l.noSessionsInRange
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
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final config = ref.watch(appConfigProvider);
    final entry = ref
        .watch(cashOrTrashProvider)
        .whenOrNull(data: (s) => s.value.byTicker(ticker));
    final scanned = ref
        .watch(opportunityReportProvider)
        .whenOrNull(data: (s) => s.value.allFor(ticker));

    if (entry == null && (scanned == null || scanned.isEmpty)) {
      return BEmptyState(title: l.noStudyYet, body: l.noStudyBody);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (entry != null) ...[
          BSectionLabel(l.studyLabel),
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
                  style: BarbarianType.headlineM.copyWith(color: c.textPrimary),
                ),
                const SizedBox(height: 14),
                BPillarLedger(
                  rows: [
                    for (final p in entry.pillars) (p.pillar, p.score, p.basis),
                  ],
                  total: entry.score,
                ),
                const SizedBox(height: 16),
                // Mandatory on every file that shows a band (spec §8.2). A
                // score with no stated way to move it is a rating; a score
                // with the filing that would change it is a conditional
                // observation about published arithmetic.
                BWhatWouldChangeThis(
                  // Built from the study's own published basis for each
                  // pillar, not from a trigger nobody wrote. Every line here
                  // is the stated reason a pillar scores what it scores, so
                  // "what would change this" is answered by what the reason
                  // rests on — which is the only honest answer available from
                  // published data. It was rendering an empty list on every
                  // studied company since the card was written, which made
                  // §8.2's one anti-rating mechanism a heading with nothing
                  // under it.
                  conditions: [
                    for (final p in entry.pillars)
                      if ((p.basis ?? '').trim().isNotEmpty)
                        '${p.pillar} (${p.score > 0 ? '+' : ''}${p.score}) rests on: ${p.basis}',
                  ],
                ),
                if (entry.summary case final String s) ...[
                  const SizedBox(height: 12),
                  Text(
                    s,
                    style: BarbarianType.bodyM.copyWith(color: c.textSecondary),
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
                        l.readFullInvestigation,
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
          BSectionLabel(l.scannerHistory),
          for (final s in scanned)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: BPaperCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        BKindChip(switch (s.scanStatus) {
                          ScanStatus.qualified => 'Qualified',
                          ScanStatus.watching => 'Watching',
                          ScanStatus.rejected => 'Rejected',
                        }, variant: BChipVariant.ember),
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
    final l = AppLocalizations.of(context);
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
            BSectionLabel(l.priceLastSessions(window.length)),
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
              BSparkline(values: [for (final p in window) p.close], height: 56),
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
      label:
          '${day.point.date}: ${change == null ? 'unchanged' : '${change >= 0 ? 'up' : 'down'} ${(change.abs() * 100).toStringAsFixed(1)} percent'}',
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
                : '${change >= 0 ? '+' : '−'}${(change.abs() * 100).toStringAsFixed(1)}',
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
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${d.day} ${months[d.month - 1]}';
  }
}

/// "Can I get out?" in one row, opening the full answer.
///
/// Deliberately not the whole ladder. A company screen is already dense, and
/// the job here is to put the question in front of somebody at the moment it
/// would occur to them — standing on the page of a share they are considering
/// — rather than to answer it in full where there is no room for the
/// assumptions the answer rests on.
class _ExitSummary extends StatelessWidget {
  const _ExitSummary({required this.exit, required this.parentTab});

  final ExitLiquidity exit;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final alarming = exit.stops;

    return Padding(
      padding: EdgeInsets.only(bottom: alarming ? 22 : 0),
      child: BPressable(
        onTap: () => context.push(Routes.exitPath(parentTab, exit.ticker)),
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 15, 14, 16),
          decoration: BoxDecoration(
            color: alarming
                ? c.down.withValues(alpha: c.isDark ? 0.18 : 0.12)
                : c.surface,
            borderRadius: BorderRadius.circular(BarbarianRadius.lg),
            border: alarming
                ? Border(left: BorderSide(color: c.down, width: 3))
                : Border.all(color: c.cardEdge),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      alarming
                          ? l.exitStopsTrading.toUpperCase()
                          : l.exitCanIGetOut.toUpperCase(),
                      style: BarbarianType.labelNano.copyWith(
                        color: alarming
                            ? BarbarianPalette.onWash(c, c.down)
                            : c.textMuted,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      alarming
                          ? l.exitZeroDays(exit.zeroVolumeDays, exit.sessions)
                          : l.exitFiftyK(exit.plainFor(50000).toLowerCase()),
                      style: BarbarianType.bodyL.copyWith(
                        color: alarming ? c.textPrimary : c.textPrimary,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      alarming ? l.exitNoPrice : exit.waitFor(50000),
                      style: BarbarianType.bodyS.copyWith(
                        color: c.textMuted,
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: alarming ? c.down : c.textFaint,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// What the figures above add up to, in sentences.
///
/// "What the numbers say" gives a reader eight rows and their arithmetic, which
/// is honest and still leaves the work of joining them up undone — the founder's
/// point exactly: we say a company did X, and never why anybody should care.
///
/// Every sentence here is assembled from figures already on the screen, and
/// each one is a fact with its own mechanism attached. None of them is a view
/// on the share: what a company earned and whether its stock trades are things
/// that happened, and saying what they mean for somebody holding it is the
/// whole reason this app exists.
class _WhatThatMeans extends ConsumerWidget {
  const _WhatThatMeans({required this.company});

  final Company company;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final lines = <String>[];

    // Can the money get back out, and does the share ever simply stop.
    if (ExitLiquidity.of(company) case final ExitLiquidity exit) {
      if (exit.sameDayLimit > 0) {
        lines.add(
          'About EGP ${_money(exit.sameDayLimit)} can leave in one session here. Above that, selling is more than a fifth of a normal day and starts to move the price against whoever is selling.',
        );
      }
      if (exit.zeroVolumeDays > 0) {
        lines.add(
          'It did not trade at all on ${exit.zeroVolumeDays} of the last ${exit.sessions} sessions. On those days there was no price at which a holder could sell, because there was nobody on the other side.',
        );
      }
    }

    // What it last earned, and which way that moved.
    final periods = [
      ...company.financials.annual,
      ...company.financials.quarterly,
    ];
    if (periods.isNotEmpty) {
      final latest = periods.last;
      final prior = comparablePrior(periods, latest);
      final move = profitMovement(latest, prior);
      if (latest.netIncome case final double net) {
        lines.add(
          'It reported ${formatMillions(net)} EGP m of net profit in ${latest.period}.${move == null ? '' : ' ${move.sentence}'}',
        );
      }
    }

    if (lines.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.whatThatMeans),
        BPaperCard(
          radius: BarbarianRadius.xl,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final (i, line) in lines.indexed) ...[
                if (i > 0) const SizedBox(height: 12),
                Text(
                  line,
                  style: BarbarianType.bodyM.copyWith(
                    color: c.textSecondary,
                    height: 1.5,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  static String _money(double value) {
    if (value >= 1e9) return '${(value / 1e9).toStringAsFixed(2)}bn';
    if (value >= 1e6) return '${(value / 1e6).toStringAsFixed(1)}m';
    if (value >= 1e3) return '${(value / 1e3).round()}k';
    return value.toStringAsFixed(0);
  }
}
