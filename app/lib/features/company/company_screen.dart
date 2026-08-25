import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/company.dart';
import '../../core/models/exit_liquidity.dart';
import '../../core/models/explainer.dart';
import '../../core/models/market_snapshot.dart';
import '../../core/models/news.dart';
import '../../core/models/profit_movement.dart';
import '../../core/models/disclosure.dart';
import '../../core/models/recency.dart';
import '../../core/models/sector.dart';
import '../../core/widgets/filed_document.dart';
import '../../core/widgets/insight.dart';
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
import 'company_brief.dart';
import 'company_calendar.dart';
import 'company_signals.dart';
import 'review_sheet.dart';
import 'volume_explainer.dart';
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

enum _Tab { overview, financials, price, calendar, research, discussion }

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
                      label: l.tabCalendar,
                      icon: Icons.event_note_outlined,
                    ),
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
                    onOpenStudy: () => setState(() => _tab = _Tab.research),
                  ),
                  _Tab.financials => Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Above the statements, because the sheet is the reading
                      // and the statements are the evidence for it.
                      BReviewSheet(ticker: widget.ticker),
                      _Financials(
                    company: company,
                    parentTab: widget.parentTab,
                  ),
                    ],
                  ),
                  _Tab.price => _Price(
                    ticker: widget.ticker,
                    range: _range,
                    onRange: (r) => setState(() => _range = r),
                    sessionDate: snapshot?.date,
                    session: company.market,
                  ),
                  _Tab.calendar => BCompanyCalendar(
                    ticker: widget.ticker,
                    parentTab: widget.parentTab,
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
    final arabic = Directionality.of(context) == TextDirection.rtl;

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
                    BLatinName(
                      company.ticker,
                      style: BarbarianType.displayM,
                      color: c.onInk,
                      maxLines: 1,
                    ),
                    const SizedBox(height: 4),
                    // The reader's own language leads, as in the directory.
                    // 266 of the 280 companies carry an Arabic name; the rest
                    // show the English one in both slots rather than a gap.
                    if (arabic && company.name.ar != null) ...[
                      BArabicName(
                        company.name.ar!,
                        style: BarbarianType.bodyM,
                        color: c.onInkMuted,
                        maxLines: 2,
                      ),
                      const SizedBox(height: 2),
                      BLatinName(company.name.en, color: c.onInkMuted),
                    ] else ...[
                      BLatinName(
                        company.name.en,
                        style: BarbarianType.bodyM,
                        color: c.onInkMuted,
                      ),
                      if (company.name.ar case final String ar) ...[
                        const SizedBox(height: 2),
                        BArabicName(ar, color: c.onInkMuted),
                      ],
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
          // Wrap, not Row.
          //
          // A sector name and a data-age caption are both variable-length, and
          // `Spacer` between two of those guarantees a horizontal overflow the
          // moment either grows — "Distribution Services" beside a
          // "15-min delayed · updated 4 hr ago" ran 35pt past the edge as soon
          // as the type scale went up. Wrapping puts the caption on its own
          // line instead of off the screen.
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 10,
            runSpacing: 8,
            children: [
              if (company.sector case final String s)
                BKindChip(sectorLabel(s, l), variant: BChipVariant.onDark),
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
    final l = AppLocalizations.of(context);
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
      caption: l.priceSessionRange(company.priceHistory.length),
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

    Widget cell(String label, String value, String unit) => Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: BarbarianType.labelTiny.copyWith(color: c.onInkMuted),
            maxLines: 2,
          ),
          const SizedBox(height: 5),
          // The figure and its unit on one baseline, so the number is never
          // read as a bare quantity of nothing in particular.
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Flexible(
                child: BNumText(
                  value,
                  style: BarbarianType.figureS.copyWith(color: c.onInk),
                ),
              ),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  unit,
                  style: BarbarianType.labelTiny.copyWith(color: c.onInkMuted),
                  maxLines: 1,
                ),
              ),
            ],
          ),
        ],
      ),
    );

    // Two cells, not three. The market cap said nothing a reader could use at
    // 10.5pt with no unit, and it is stated in a full sentence further down
    // this same screen. Both survivors also appeared again in the session
    // card below, which now carries only the figures these two do not.
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        cell(
          l.figPrevClose,
          quote?.previousClose?.toStringAsFixed(2) ?? '—',
          l.filterUnitEgp,
        ),
        cell(
          l.figSharesTradedToday,
          _Header._compact(quote?.volume),
          l.filterUnitShares,
        ),
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
    required this.onOpenStudy,
  });

  /// Opens the Research tab, where the study this card summarises lives.
  final VoidCallback onOpenStudy;

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
    // Previous close and the day's volume are both in the header, three
    // inches up the same screen, so they are not repeated here.
    final session = <(String, String)>[
      if (m?.open != null) (l.priceOpen, _num(m!.open)),
      if (m?.high != null) (l.figDayHigh, _num(m!.high)),
      if (m?.low != null) (l.dayLow, _num(m!.low)),
      if (p['avg_volume_30d'] != null)
        (l.figAvgVolume30d, _compact(p['avg_volume_30d'])),
    ];

    final size = <(String, String)>[
      if (p['shares_outstanding'] != null)
        (l.figSharesOutstanding, _compact(p['shares_outstanding'])),
      if (p['float_shares'] != null)
        (l.figFloatShares, _compact(p['float_shares'])),
      if (company.sector case final String sector)
        (l.sector, sectorLabel(sector, l)),
    ];

    // Built from published operands only: a builder returns null when an
    // input is missing, so a row never appears without the arithmetic behind
    // it. That is the whole discipline — the sentence is only as good as the
    // sum it can show.
    final explained = <Explainer?>[
      Explainers.relativeVolume(company, l),
      Explainers.freeFloat(company, l),
      Explainers.closeStrength(company, l),
      Explainers.move(
        title: l.movedThisMonthLabel,
        window: l.perf1Month,
        percent: p['perf_1m'] is num ? (p['perf_1m'] as num).toDouble() : null,
        asOf: m?.date,
        l: l,
      ),
      Explainers.marketCap(company, l),
    ].nonNulls.toList();

    final momentum = <(String, String)>[
      if (p['perf_1w'] != null) (l.perf1Week, _pct(p['perf_1w'])),
      if (p['perf_1m'] != null) (l.perf1Month, _pct(p['perf_1m'])),
      if (p['perf_3m'] != null) (l.perf3Months, _pct(p['perf_3m'])),
      if (p['five_session_change'] != null)
        (l.perf5Sessions, _pct(p['five_session_change'])),
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
        // What the filing record says this company has done and announced.
        //
        // It sits high because it is the only block on the page that answers
        // "what *is* this company" — everything else is a number about it. It
        // renders nothing at all for a company the briefs have not reached, so
        // a page is never padded with an empty heading.
        const SizedBox(height: 20),
        // First on the page when it applies, and absent when it does not.
        // Somebody opening a company from the busiest list arrived asking one
        // question; this is where it gets answered.
        BVolumeExplainer(
          company: company,
          quote: quote,
          parentTab: parentTab,
        ),
        // Before the brief, because "first loss after 27 profitable periods"
        // is the strongest thing this page knows and it is arithmetic, while
        // the brief below it is a model reading the same record.
        BCompanySignals(ticker: ticker, parentTab: parentTab),
        BCompanyBrief(ticker: ticker, parentTab: parentTab),
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
            onTap: onOpenStudy,
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
          // The prose comes before the rows it explains. It used to sit under
          // them, which meant a reader met five measurements and only then the
          // paragraph telling them what any of it was.
          _WhatThatMeans(company: company),
          const SizedBox(height: 14),
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
          BSectionLabel(l.companyLabel),
          _FactCard(rows: size),
        ],
        if (session.isEmpty && momentum.isEmpty && size.isEmpty)
          BEmptyState(title: l.noDetailYet, body: l.noDetailBodyFull),
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
/// The newest filed balance sheet — which is very often not the newest row.
///
/// The exchange announces a year's net profit months before the audited
/// balance sheet is transcribed, so the last annual row is frequently a
/// profit-only figure with assets, equity and liabilities all absent. Reading
/// the balance off that row blanked the whole balance-sheet block for 150 of
/// 249 companies, even when a complete statement sat one row back on disk.
///
/// This walks back to the most recent period that actually carries a balance —
/// the audited annual first, then an interim — and returns it so the block can
/// render under *its own* period label. Nothing from one date is relabelled as
/// another: the profit headline keeps its period, the balance keeps its own.
FinancialPeriod? _latestBalance(
  List<FinancialPeriod> annual,
  List<FinancialPeriod> interim,
) {
  bool carries(FinancialPeriod p) => p.assets != null || p.equity != null;
  for (final period in annual.reversed) {
    if (carries(period)) return period;
  }
  for (final period in interim.reversed) {
    if (carries(period)) return period;
  }
  return null;
}

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
    final move = profitMovement(latest, prior, l);
    final headline = egpMillions(latest.netIncome);
    // The balance sheet is dated separately from the profit headline, because
    // it is filed later: the newest row with a balance is often a year behind
    // the newest row with a profit.
    final balance = _latestBalance(annual, interim);

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
                headline.figure,
                style: BarbarianType.displayS.copyWith(color: c.textPrimary),
              ),
              const SizedBox(height: 2),
              Text(
                // The unit is whatever this figure's own size makes it —
                // billions for a bank, thousands for a small holding company —
                // rather than a fixed "millions" the number then contradicts.
                headline.scale == null
                    ? periodLabel(latest.period, l)
                    : l.finUnitPeriod(
                        egpUnit(headline.scale!, l),
                        periodLabel(latest.period, l),
                      ),
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

        if (balance != null) ...[
          const SizedBox(height: 14),
          Builder(
            builder: (context) {
              final scale = egpScaleFor([
                balance.assets,
                balance.equity,
                balance.liabilities,
                balance.operatingCashFlow,
              ]);
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Its own period, so a balance a year behind the profit
                  // headline reads as exactly that rather than as this year's.
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Text(
                      l.finBalanceAsOf(periodLabel(balance.period, l)),
                      style: BarbarianType.labelNano.copyWith(
                        color: c.textMuted,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: BStatTile(
                          label: l.finTotalAssets,
                          value: egpIn(balance.assets, scale),
                          unit: egpUnit(scale, l),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: BStatTile(
                          label: l.ownersEquity,
                          value: egpIn(balance.equity, scale),
                          unit: egpUnit(scale, l),
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
                          value: egpIn(balance.liabilities, scale),
                          unit: egpUnit(scale, l),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: BStatTile(
                          label: l.finCashFromOps,
                          value: egpIn(balance.operatingCashFlow, scale),
                          unit: egpUnit(scale, l),
                        ),
                      ),
                    ],
                  ),
                ],
              );
            },
          ),
        ],

        // The filed statements themselves, every period and every line we
        // hold — not the one year the card above happens to lead with.
        //
        // This replaced a list of net profit by year. The figures for the
        // other four lines were already collected for all 228 companies that
        // file them, and were being thrown away at the point of drawing: a
        // reader could see what a company earned in 2023 but not what it owed.
        if (annual.length > 1 || interim.length > 1) ...[
          const SizedBox(height: 14),
          _StatementTable(annual: annual, quarterly: interim),
        ],

        // The filings themselves, as the company lodged them.
        //
        // Everything above this is somebody's reading of the accounts —
        // Mubasher's transcription, our scaling, our arithmetic. This is the
        // signed document, and a reader who wants to check a number against
        // the source can now do it without leaving for a search engine.
        const SizedBox(height: 14),
        _FiledDocuments(ticker: company.ticker),

        const SizedBox(height: 16),
        Text(
          l.finFootnoteFull(_sourceName(context, latest.source)),
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
    final move = profitMovement(period, prior, l);
    final headline = egpMillions(period.netIncome);

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
                  period.basis == 'consolidated'
                      ? l.finGroupBasis
                      : l.finCompanyOnly,
                ),
            ],
          ),
          const SizedBox(height: 10),
          BNumText(
            headline.figure,
            style: BarbarianType.headlineM.copyWith(color: c.textPrimary),
          ),
          const SizedBox(height: 2),
          Text(
            headline.scale == null
                ? periodLabel(period.period, l)
                : l.finUnitPeriod(
                    egpUnit(headline.scale!, l),
                    periodLabel(period.period, l),
                  ),
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
                  '${company.ticker} · ${periodLabel(period.period, l)}',
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
            body: l.priceNoSeriesBodyFull,
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
            // Only the windows this company's series can actually fill. Every
            // company used to offer all five and draw the same line for the
            // last three, because most EGX listings here hold a few months
            // rather than five years.
            if (PriceRange.offeredFor(all.length) case final offered
                when offered.length > 1)
              BSegmentedRow(
                segments: [for (final r in offered) BSegment(label: r.label)],
                // The selection can outlive the company it was made on, so a
                // range this series cannot fill falls back to the longest it
                // can rather than throwing on an index of -1.
                selectedIndex: offered.contains(range)
                    ? offered.indexOf(range)
                    : offered.length - 1,
                onChanged: (i) => onRange(offered[i]),
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
                  : l.priceSessionsTo(
                      windowed.length,
                      context.dayMonthIso(windowed.last.date),
                    ),
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

    // What the company itself has told the exchange.
    //
    // This tab used to be empty for 266 of 282 companies, because only eight
    // have a study — while the filings this issuer lodged were already on the
    // device and simply never joined to it.
    // A filing is not our opinion of a company, which is exactly why it can
    // sit here without a licence.
    final filings = ref
        .watch(companyDocumentsProvider(ticker))
        .value
        ?.value
        .items;
    final filed = filings ?? const <FiledDocument>[];

    // What the press wrote about this company.
    //
    // The whole feed is already in memory and was never joined to a company
    // page. Computed above the empty-state guard, not below it: 20 of the 27
    // companies the feed tags have no study and no scanner row, so under the
    // guard it would never have rendered for the ones it exists for.
    final news = ref.watch(newsProvider).whenOrNull(data: (s) => s.value);
    final press = [
      for (final item in news?.items ?? const <NewsItem>[])
        if (item.tickers.contains(ticker)) item,
    ];

    if (entry == null && filed.isEmpty && press.isEmpty) {
      return BEmptyState(title: l.noStudyYet, body: l.noStudyBody);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (press.isNotEmpty) ...[
          BSectionLabel(l.companyInThePress),
          const SizedBox(height: 6),
          Text(
            l.companyInThePressBody(ticker),
            style: BarbarianType.bodyM.copyWith(
              color: c.textSecondary,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 12),
          for (final item in press.take(6)) ...[
            _PressRow(item: item, feed: news!, parentTab: parentTab),
            const SizedBox(height: 8),
          ],
          const SizedBox(height: 14),
        ],
        if (filed.isNotEmpty) ...[
          BSectionLabel(l.companyFilings),
          const SizedBox(height: 6),
          Text(
            l.companyFilingsBody(ticker),
            style: BarbarianType.bodyM.copyWith(
              color: c.textSecondary,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 12),
          for (final item in filed) ...[
            _CompanyFiling(item: item, parentTab: parentTab),
            const SizedBox(height: 8),
          ],
          const SizedBox(height: 8),
        ],
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
                        '$ticker · ${l.studyLabel}',
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
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final change = day.change;
    final tone = change == null || change == 0
        ? c.textMuted
        : (change > 0 ? c.up : c.down);
    // The bar is scaled against 4%, which covers an ordinary EGX session; a
    // limit move pins it rather than flattening every other day on the strip.
    final magnitude = ((change ?? 0).abs() / 0.04).clamp(0.12, 1.0);

    return Semantics(
      label: switch (change) {
        null => l.a11ySessionUnchanged(day.point.date),
        final pct when pct >= 0 => l.a11ySessionUp(
          day.point.date,
          (pct * 100).toStringAsFixed(1),
        ),
        final pct => l.a11ySessionDown(
          day.point.date,
          (pct.abs() * 100).toStringAsFixed(1),
        ),
      },
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
          // A signed figure has to be laid out left-to-right whatever the
          // page does: in the Arabic build "−0.6" rendered as "0.6 −", with
          // the sign trailing the number it belongs to.
          BNumText(
            change == null
                ? '—'
                : '${change >= 0 ? '+' : '−'}${(change.abs() * 100).toStringAsFixed(1)}',
            style: BarbarianType.labelNano.copyWith(color: tone),
          ),
          const SizedBox(height: 2),
          Text(
            // "17 Aug" is enough; the year is on the header caption.
            context.dayMonthIso(day.point.date),
            style: BarbarianType.labelTiny.copyWith(color: c.textFaint),
          ),
        ],
      ),
    );
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
                          : l.exitFiftyK(exit.plainFor(50000, l).toLowerCase()),
                      style: BarbarianType.bodyL.copyWith(
                        color: alarming ? c.textPrimary : c.textPrimary,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      alarming ? l.exitNoPrice : exit.waitFor(50000, l),
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
        lines.add(l.meansSameDay(egpFromPounds(exit.sameDayLimit, l)));
      }
      if (exit.zeroVolumeDays > 0) {
        lines.add(l.meansZeroDays(exit.zeroVolumeDays, exit.sessions));
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
      final move = profitMovement(latest, prior, l);
      if (latest.netIncome case final double net) {
        lines.add(
          l.meansNetProfit(egpText(net, l), periodLabel(latest.period, l)) +
              (move == null ? '' : ' ${move.sentence}'),
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
}

/// Every filed period, side by side.
///
/// Laid out as a table with the periods running sideways because that is the
/// shape of the thing being shown — a reader compares one line across years,
/// not one year across lines. The label column stays put while the figures
/// scroll, so the row being read never loses its name.
///
/// A line with nothing in it for any period is dropped rather than printed as
/// a row of dashes. Mubasher publishes five lines for most companies and
/// fewer for some, and an empty row says only that we went looking.
class _StatementTable extends StatefulWidget {
  const _StatementTable({required this.annual, required this.quarterly});

  final List<FinancialPeriod> annual;
  final List<FinancialPeriod> quarterly;

  @override
  State<_StatementTable> createState() => _StatementTableState();
}

class _StatementTableState extends State<_StatementTable> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final hasBoth = widget.annual.isNotEmpty && widget.quarterly.isNotEmpty;
    final periods =
        (_tab == 0 && widget.annual.isNotEmpty
                ? widget.annual
                : widget.quarterly)
            .reversed
            .toList();

    // The balance sheet, then the cash flow statement in the order it is
    // filed: operating, investing, financing, and the change the three of them
    // come to. A line nobody filed for any period on show is dropped rather
    // than printed as a row of dashes.
    final lines = <(String, double? Function(FinancialPeriod))>[
      (l.finNetProfitLine, (p) => p.netIncome),
      (l.finTotalAssets, (p) => p.assets),
      (l.finTotalLiabilities, (p) => p.liabilities),
      (l.ownersEquity, (p) => p.equity),
      (l.finCashFromOps, (p) => p.operatingCashFlow),
      (l.finCashInvesting, (p) => p.investingCashFlow),
      (l.finCashFinancing, (p) => p.financingCashFlow),
      (l.finNetChangeCash, (p) => p.netChangeInCash),
      (l.finDividendsPaid, (p) => p.dividendsPaid),
    ].where((line) => periods.any((p) => line.$2(p) != null)).toList();

    if (periods.isEmpty || lines.isEmpty) return const SizedBox.shrink();

    // One scale per **row**, not one per table.
    //
    // A single table-wide scale is what real published accounts do, and it is
    // right when every line is the same order of magnitude. These lines are
    // not: total assets sit three orders above net profit for most issuers, so
    // the largest cell dragged the whole grid to billions and AJWA's profit —
    // 2.80 million as filed — printed as `0.00`. The headline number on the
    // financials tab read zero.
    //
    // The reason for holding one scale still stands, but it is about the axis
    // a reader actually compares along, which is the row: FY 2024 against
    // FY 2025 for the same line. Nobody compares net profit against total
    // liabilities. So each row picks its own scale and states it beside its
    // own label, and every period within that row is in it.
    final scales = <int, EgpScale>{
      for (var i = 0; i < lines.length; i++)
        i: egpScaleFor([for (final p in periods) lines[i].$2(p)]),
    };

    return BPaperCard(
      radius: BarbarianRadius.xl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          BSectionLabel(l.finStatements),
          if (hasBoth) ...[
            const SizedBox(height: 10),
            BSegmentedRow(
              segments: [
                BSegment(label: l.finAnnual),
                BSegment(label: l.finQuarterly),
              ],
              selectedIndex: _tab,
              onChanged: (i) => setState(() => _tab = i),
            ),
          ],
          const SizedBox(height: 10),
          Text(
            l.finFiguresPerRow,
            style: BarbarianType.bodyS.copyWith(color: c.textFaint),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                // Wider than it was, because each label now carries its own
                // unit under it and the line above has one line instead of
                // two: "التدفق النقدى التشغيلي" needs the room.
                width: 142,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 22),
                    for (var i = 0; i < lines.length; i++)
                      SizedBox(
                        height: 30,
                        child: Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                lines[i].$1,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: BarbarianType.bodyS.copyWith(
                                  color: c.textSecondary,
                                  height: 1.15,
                                ),
                              ),
                              Text(
                                egpUnit(scales[i]!, l),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: BarbarianType.labelNano.copyWith(
                                  color: c.textFaint,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final p in periods)
                        Padding(
                          padding: const EdgeInsetsDirectional.only(start: 18),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              SizedBox(
                                height: 22,
                                child: Text(
                                  periodLabel(p.period, l),
                                  style: BarbarianType.labelS.copyWith(
                                    color: c.textFaint,
                                  ),
                                ),
                              ),
                              for (var i = 0; i < lines.length; i++)
                                SizedBox(
                                  height: 30,
                                  child: Align(
                                    alignment: AlignmentDirectional.centerEnd,
                                    child: BNumText(
                                      egpIn(lines[i].$2(p), scales[i]!),
                                      style: BarbarianType.bodyM.copyWith(
                                        color: lines[i].$2(p) == null
                                            ? c.textFaint
                                            : c.textPrimary,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            l.finStatementsNote,
            style: BarbarianType.bodyS.copyWith(color: c.textFaint),
          ),
        ],
      ),
    );
  }
}

/// Everything this company has filed that carries a document.
///
/// Read from a per-company index built with the archive, so it covers the
/// whole kept record rather than the thirty-day window the feed shows. Absent
/// entirely when the company has filed nothing with a document attached —
/// which for most companies, most of the time, is the honest answer.
class _FiledDocuments extends ConsumerWidget {
  const _FiledDocuments({required this.ticker});

  final String ticker;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final docs = ref.watch(companyDocumentsProvider(ticker)).value?.value;
    final items = docs?.items ?? const <FiledDocument>[];
    if (items.isEmpty) return const SizedBox.shrink();

    return BPaperCard(
      radius: BarbarianRadius.xl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          BSectionLabel(
            l.finFiledDocuments,
            // "50 of 704" rather than a bare list, so the page never implies
            // that fifty is all this company ever filed. The rest is a
            // separate document, fetched only if a reader asks for it.
            trailing: (docs?.total ?? 0) > items.length
                ? Text(
                    l.filingsAllOf(items.length, docs!.total),
                    style: BarbarianType.labelNano.copyWith(color: c.textMuted),
                  )
                : null,
          ),
          const SizedBox(height: 10),
          for (final (i, item) in items.indexed) ...[
            if (i > 0) ...[
              const SizedBox(height: 12),
              Divider(height: 1, color: c.hairline),
              const SizedBox(height: 12),
            ],
            Wrap(
              spacing: 8,
              runSpacing: 4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                if (item.labelFor(arabic).isNotEmpty)
                  BKindChip(item.labelFor(arabic)),
                // "17 Aug", not "2026-08-17". A filing dated in ISO on a card
                // whose siblings say "Today" is a machine's way of speaking.
                if (context.filingAge(item.date) case final age?)
                  Text(
                    age,
                    style: BarbarianType.labelNano.copyWith(color: c.textMuted),
                  ),
              ],
            ),
            const SizedBox(height: 7),
            Directionality(
              textDirection: isArabic(item.titleFor(arabic))
                  ? TextDirection.rtl
                  : TextDirection.ltr,
              child: Text(
                item.titleFor(arabic),
                style: BarbarianType.bodyM.copyWith(
                  color: c.textPrimary,
                  height: 1.4,
                ),
              ),
            ),
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
    );
  }
}

/// One filing on the company's own screen.
///
/// The same three things every filing row in the app carries — what kind it
/// is, when it landed, and what that kind of filing does to somebody holding
/// the share — plus the document itself where the company lodged one.
class _CompanyFiling extends StatelessWidget {
  const _CompanyFiling({required this.item, required this.parentTab});

  final FiledDocument item;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;

    // Tapping opens the filing itself.
    //
    // These rows carried no `onTap` at all, so pressing one did nothing — the
    // worst kind of dead control, because every other row in the app that
    // looks like this opens something. There is no "open the company" choice
    // to offer here: the reader is already on it.
    return BPressable(
      onTap: item.link.isEmpty
          ? null
          : () => context.push(
              Routes.articlePath(parentTab, item.link, 'EGX filing'),
            ),
      child: BPaperCard(
        padding: const EdgeInsets.fromLTRB(15, 14, 15, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                if (item.labelFor(arabic).isNotEmpty)
                  BKindChip(item.labelFor(arabic)),
                // "17 Aug", not "2026-08-17". A filing dated in ISO on a card
                // whose siblings say "Today" is a machine's way of speaking.
                if (context.filingAge(item.date) case final age?)
                  Text(
                    age,
                    style: BarbarianType.labelNano.copyWith(color: c.textMuted),
                  ),
                Icon(Icons.north_east, size: 13, color: c.textFaint),
              ],
            ),
            const SizedBox(height: 7),
            Directionality(
              textDirection: isArabic(item.titleFor(arabic))
                  ? TextDirection.rtl
                  : TextDirection.ltr,
              child: Text(
                item.titleFor(arabic),
                style: BarbarianType.bodyM.copyWith(
                  color: c.textPrimary,
                  height: 1.4,
                ),
              ),
            ),
            if (item.meaningFor(arabic).isNotEmpty) ...[
              const SizedBox(height: 7),
              BInsightLine(item.meaningFor(arabic), maxLines: 3),
            ],
            for (final (n, url) in item.attachments.indexed) ...[
              SizedBox(height: n == 0 ? 10 : 8),
              BFiledDocument(
                url: url,
                index: n,
                count: item.attachments.length,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// One story about this company, credited to whoever wrote it.
///
/// Carries `meaningFor` — what the story is about — rather than `becauseFor`,
/// which prints the relative-volume arithmetic that put the story in the feed
/// and says nothing about the reporting.
class _PressRow extends StatelessWidget {
  const _PressRow({
    required this.item,
    required this.feed,
    required this.parentTab,
  });

  final NewsItem item;
  final NewsFeed feed;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final outlet = [
      for (final attribution in item.sources)
        feed.sources
            .where((NewsSource s) => s.id == attribution.id)
            .map((NewsSource s) => s.name)
            .firstOrNull,
    ].nonNulls.firstOrNull;
    final link = item.sources.firstOrNull?.link ?? '';
    final headline = item.headlineFor(arabic);

    return BPressable(
      onTap: link.isEmpty
          ? null
          : () => context.push(
              Routes.articlePath(parentTab, link, outlet ?? l.newsSourceHeader),
            ),
      child: BPaperCard(
        padding: const EdgeInsets.fromLTRB(15, 13, 15, 13),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              [outlet, context.newsAge(item.publishedAt)].nonNulls.join(' · '),
              style: BarbarianType.labelNano.copyWith(color: c.textMuted),
            ),
            const SizedBox(height: 7),
            // The headline runs in its own direction, whatever the app is set
            // to: an Arabic headline in an English build still reads
            // right-to-left.
            Directionality(
              textDirection: isArabic(headline)
                  ? TextDirection.rtl
                  : TextDirection.ltr,
              child: Text(
                headline,
                style: BarbarianType.titleS.copyWith(color: c.textPrimary),
              ),
            ),
            if (item.meaningFor(arabic) case final String meaning
                when meaning.isNotEmpty) ...[
              const SizedBox(height: 7),
              Text(
                meaning,
                style: BarbarianType.bodyS.copyWith(
                  color: c.textSecondary,
                  height: 1.45,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
