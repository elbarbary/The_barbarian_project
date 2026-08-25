import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/recency.dart';
import '../../core/models/review.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/charts.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// The review sheet: what each number is, which way it moved, what to ask.
///
/// Nine metrics, and none of them is allowed to stand alone — which is the
/// point the framework this implements keeps making. A low P/E means nothing
/// until you know whether earnings are rising or collapsing underneath it, and
/// the sheet is arranged so those two facts are never more than a row apart.
///
/// **Every row ends in a question, and that is the design.** "Cheap" and
/// "expensive" are views on a named security, which this publisher may not
/// give (§8). "Why is it cheaper than its sector?" is the same information
/// handed over with the judgement attached to the reader. It is also, in
/// practice, the more useful sentence.
///
/// **There is no score.** Nine arrows summed into a number out of ten would be
/// a recommendation whatever it was called. What the top of the sheet says
/// instead is how many metrics moved together and how many did not — a count,
/// which a reader can check.
class BReviewSheet extends ConsumerWidget {
  const BReviewSheet({required this.ticker, super.key});

  final String ticker;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final review = ref.watch(companyReviewProvider(ticker)).value?.value;
    if (review == null || review.isEmpty) return const SizedBox.shrink();

    final read = review.readFor(arabic);
    final byKey = {for (final m in review.metrics) m.key: m};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.revLabel, bottomGap: 10),

        // The considered paragraph first — one read of the whole pattern, so
        // the section opens with the story rather than a wall of questions.
        if (read.isNotEmpty) ...[
          _ReadCard(read: read, pattern: review.pattern),
          const SizedBox(height: 16),
        ] else if (review.pattern case final ReviewPattern pattern) ...[
          _PatternCard(pattern: pattern),
          const SizedBox(height: 16),
        ],

        // The metrics as a scannable grid, grouped the way the framework
        // teaches them. Every tile is a number and a direction; the words live
        // one tap away.
        for (final group in _groups) ...[
          if (group.keys.any(byKey.containsKey)) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: 8, top: 4),
              child: Text(
                group.title(l).toUpperCase(),
                style: BarbarianType.labelNano.copyWith(
                  color: c.textMuted,
                  letterSpacing: 0.7,
                ),
              ),
            ),
            LayoutBuilder(
              builder: (context, box) {
                const gap = 10.0;
                final w = (box.maxWidth - gap) / 2;
                return Wrap(
                  spacing: gap,
                  runSpacing: gap,
                  children: [
                    for (final key in group.keys)
                      if (byKey[key] case final ReviewMetric m)
                        SizedBox(width: w, child: _MetricTile(metric: m)),
                  ],
                );
              },
            ),
            const SizedBox(height: 16),
          ],
        ],

        Text(
          // The two absences, stated rather than left as a puzzle.
          l.revMissingNote,
          style: BarbarianType.bodyS.copyWith(color: c.textFaint, height: 1.5),
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}

/// The four questions the framework reduces everything to, and the metrics
/// under each. A metric the company lacks simply does not appear.
class _Group {
  const _Group(this.title, this.keys);
  final String Function(AppLocalizations) title;
  final List<String> keys;
}

final _groups = <_Group>[
  _Group((l) => l.revGroupValuation, ['pe', 'pb', 'dividend_yield']),
  _Group((l) => l.revGroupBusiness, ['profit', 'eps', 'assets', 'cash_conversion']),
  _Group((l) => l.revGroupReturns, ['roe', 'roa']),
  _Group((l) => l.revGroupRisk, ['debt_equity']),
];

/// How many moved together, and how many did not. Never a total./// How many moved together, and how many did not. Never a total.
class _PatternCard extends StatelessWidget {
  const _PatternCard({required this.pattern});

  final ReviewPattern pattern;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final agrees = pattern.agrees;

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 13, 14, 13),
      decoration: BoxDecoration(
        color: c.textPrimary.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(BarbarianRadius.lg),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsetsDirectional.only(top: 2, end: 10),
            child: Icon(
              // Shape carries the difference, not colour: agreement is one
              // arrow, disagreement is the fork (§42).
              agrees ? Icons.trending_flat_rounded : Icons.call_split_rounded,
              size: 17,
              color: c.textSecondary,
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  agrees
                      ? l.revAgree(pattern.improving.length +
                          pattern.deteriorating.length, pattern.readable)
                      : l.revDisagree(pattern.improving.length,
                          pattern.deteriorating.length),
                  style: BarbarianType.bodyM.copyWith(
                    color: c.textPrimary,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  agrees ? l.revAgreeAsk : l.revDisagreeAsk,
                  style: BarbarianType.bodyS.copyWith(color: c.textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}



/// One reading formatted for display, in the unit the builder recorded.
String reviewValue(ReviewMetric metric) => _fmt(metric, metric.value);

String reviewFigure(ReviewMetric metric, double v) => _fmt(metric, v);

String _fmt(ReviewMetric metric, double v) => switch (metric.unit) {
  'percent' => '${v.toStringAsFixed(2)}%',
  'egp_m' => _compact(v),
  'egp' => v.toStringAsFixed(2),
  // A return is a ratio in the data and a percentage to a reader.
  _ when metric.key == 'roe' || metric.key == 'roa' =>
    '${(v * 100).toStringAsFixed(1)}%',
  _ => '${v.toStringAsFixed(2)}×',
};

String _compact(double v) {
  final a = v.abs();
  if (a >= 1e6) return '${(v / 1e6).toStringAsFixed(2)}tn';
  if (a >= 1e3) return '${(v / 1e3).toStringAsFixed(1)}bn';
  return '${v.toStringAsFixed(0)}m';
}

({String label, String question}) _faceOf(String key, AppLocalizations l) =>
    switch (key) {
  'pe' => (label: l.revPe, question: l.revPeAsk),
  'pb' => (label: l.revPb, question: l.revPbAsk),
  'dividend_yield' => (label: l.revYield, question: l.revYieldAsk),
  'profit' => (label: l.revProfit, question: l.revProfitAsk),
  'eps' => (label: l.revEps, question: l.revEpsAsk),
  'assets' => (label: l.revAssets, question: l.revAssetsAsk),
  'cash_conversion' => (label: l.revCash, question: l.revCashAsk),
  'roe' => (label: l.revRoe, question: l.revRoeAsk),
  'roa' => (label: l.revRoa, question: l.revRoaAsk),
  'debt_equity' => (label: l.revDebt, question: l.revDebtAsk),
  // A key with no face is a builder that grew a metric the app has not been
  // taught yet. Showing nothing is the honest degrade.
  _ => (label: '', question: ''),
};

/// The plain-language body for a metric, for the sheet.
String _metricBody(String key, AppLocalizations l) => switch (key) {
  'pe' => l.revPeBody,
  'pb' => l.revPbBody,
  'dividend_yield' => l.revYieldBody,
  'profit' => l.revProfitBody,
  'eps' => l.revEpsBody,
  'assets' => l.revAssetsBody,
  'cash_conversion' => l.revCashBody,
  'roe' => l.revRoeBody,
  'roa' => l.revRoaBody,
  'debt_equity' => l.revDebtBody,
  _ => '',
};

/// What it means for THIS metric to be moving the way it is.
String? _directionNote(ReviewMetric m, AppLocalizations l) {
  if (m.way == ReviewDirection.flat) return l.revDirFlat;
  final rising = m.way == ReviewDirection.rising;
  return switch (m.key) {
    'profit' => rising ? l.revDirProfitRising : l.revDirProfitFalling,
    'eps' => rising ? l.revDirEpsRising : l.revDirEpsFalling,
    'assets' => rising ? l.revDirAssetsRising : l.revDirAssetsFalling,
    'cash_conversion' => rising ? l.revDirCashRising : l.revDirCashFalling,
    'roe' => rising ? l.revDirRoeRising : l.revDirRoeFalling,
    'roa' => rising ? l.revDirRoaRising : l.revDirRoaFalling,
    'debt_equity' => rising ? l.revDirDebtRising : l.revDirDebtFalling,
    'pb' => rising ? l.revDirPbRising : l.revDirPbFalling,
    _ => null,
  };
}

/// The probable cause the builder computed from the sibling metrics.
String? _causeNote(String? cause, AppLocalizations l) => switch (cause) {
  'profit_ahead_of_cash' => l.revCauseProfitAheadOfCash,
  'profit_with_cash' => l.revCauseProfitWithCash,
  'assets_ahead_of_profit' => l.revCauseAssetsAheadOfProfit,
  'assets_with_profit' => l.revCauseAssetsWithProfit,
  'eps_per_share' => l.revCauseEpsPerShare,
  'cash_behind_profit' => l.revCauseCashBehindProfit,
  'roe_leverage' => l.revCauseRoeLeverage,
  'roe_operational' => l.revCauseRoeOperational,
  'roa_unlevered' => l.revCauseRoaUnlevered,
  'debt_productive' => l.revCauseDebtProductive,
  'debt_watch' => l.revCauseDebtWatch,
  _ => null,
};

void _showMetricSheet(BuildContext context, ReviewMetric metric) {
  showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (context) => _MetricSheet(metric: metric),
  );
}

/// What opens when a metric is tapped: what it is, which way it is moving and
/// why, and the graph that proves the direction with every figure printed.
class _MetricSheet extends StatelessWidget {
  const _MetricSheet({required this.metric});

  final ReviewMetric metric;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final face = _faceOf(metric.key, l);
    final body = _metricBody(metric.key, l);
    final dir = _directionNote(metric, l);
    final cause = _causeNote(metric.cause, l);

    return DraggableScrollableSheet(
      initialChildSize: 0.72,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, controller) => Container(
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(BarbarianRadius.xl),
          ),
        ),
        child: ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: c.hairline,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    face.label,
                    style: BarbarianType.titleM.copyWith(color: c.textPrimary),
                  ),
                ),
                BNumText(
                  reviewValue(metric),
                  style: BarbarianType.titleL.copyWith(color: c.textPrimary),
                ),
              ],
            ),
            if (metric.way.isKnown) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(
                    switch (metric.way) {
                      ReviewDirection.rising => Icons.north_rounded,
                      ReviewDirection.falling => Icons.south_rounded,
                      _ => Icons.remove_rounded,
                    },
                    size: 14,
                    color: c.textMuted,
                  ),
                  const SizedBox(width: 5),
                  Text(
                    switch (metric.way) {
                      ReviewDirection.rising => l.revNowRising,
                      ReviewDirection.falling => l.revNowFalling,
                      _ => l.revNowFlat,
                    },
                    style: BarbarianType.labelS.copyWith(color: c.textMuted),
                  ),
                ],
              ),
            ],

            // The proof: every figure the direction was read from.
            if (metric.series.length >= 2) ...[
              const SizedBox(height: 20),
              Text(
                l.revProofTitle,
                style: BarbarianType.labelNano.copyWith(
                  color: c.textMuted,
                  letterSpacing: 0.6,
                ),
              ),
              const SizedBox(height: 10),
              _ProofBars(metric: metric),
              const SizedBox(height: 8),
              Text(
                l.revProofNote,
                style: BarbarianType.bodyS.copyWith(color: c.textFaint, height: 1.4),
              ),
            ] else ...[
              const SizedBox(height: 16),
              Text(
                l.revOnePoint,
                style: BarbarianType.bodyS.copyWith(color: c.textFaint, height: 1.4),
              ),
            ],

            _block(context, l.revMeansTitle, body),
            if (dir != null)
              _block(
                context,
                switch (metric.way) {
                  ReviewDirection.rising => l.revNowRising,
                  ReviewDirection.falling => l.revNowFalling,
                  _ => l.revNowFlat,
                },
                dir,
              ),
            if (cause != null) _block(context, l.revCauseTitle, cause, accent: true),
            _block(context, l.revAskTitle, face.question, accent: true),
          ],
        ),
      ),
    );
  }

  static Widget _block(
    BuildContext context,
    String title,
    String body, {
    bool accent = false,
  }) {
    final c = context.colors;
    if (body.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: BarbarianType.labelNano.copyWith(
              color: c.textMuted,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            body,
            style: BarbarianType.bodyM.copyWith(
              color: accent ? c.accent : c.textSecondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

/// The series as a bar per period, each bar labelled with its own figure.
///
/// A common baseline at the lowest reading, so a taller bar is a higher value
/// and the shape of the direction is the shape of the bars — the proof the
/// row's arrow is asserting. The exact figure sits above every bar, because
/// "show me it is rising" is answered by the numbers, not the silhouette.
class _ProofBars extends StatelessWidget {
  const _ProofBars({required this.metric});

  final ReviewMetric metric;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final pts = metric.series;
    final vals = [for (final p in pts) p.value];
    final lo = vals.reduce((a, b) => a < b ? a : b);
    final hi = vals.reduce((a, b) => a > b ? a : b);
    final range = (hi - lo).abs() < 1e-9 ? 1.0 : hi - lo;
    const barMax = 84.0;

    return SizedBox(
      height: 132,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        reverse: Directionality.of(context) == TextDirection.rtl,
        itemCount: pts.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final p = pts[i];
          final h = (8 + (p.value - lo) / range * barMax).clamp(8.0, barMax + 8);
          final newest = i == pts.length - 1;
          return SizedBox(
            width: 52,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  reviewFigure(metric, p.value),
                  maxLines: 1,
                  overflow: TextOverflow.visible,
                  style: BarbarianType.labelNano.copyWith(
                    color: newest ? c.textPrimary : c.textMuted,
                    fontWeight: newest ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  width: 26,
                  height: h,
                  decoration: BoxDecoration(
                    // The newest bar is solid; the history is a wash of it, so
                    // the eye lands on where the series ended without colour
                    // being the only thing saying so.
                    color: newest
                        ? c.accent
                        : c.accent.withValues(alpha: 0.28),
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(4),
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  westernDigits(p.period),
                  maxLines: 1,
                  style: BarbarianType.labelNano.copyWith(color: c.textFaint),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// The lead paragraph: one read of the whole pattern, with the count under it.
class _ReadCard extends StatelessWidget {
  const _ReadCard({required this.read, required this.pattern});

  final String read;
  final ReviewPattern? pattern;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    return BPaperCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l.revReadLabel.toUpperCase(),
            style: BarbarianType.labelNano.copyWith(
              color: c.textMuted,
              letterSpacing: 0.7,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            read,
            style: BarbarianType.bodyM.copyWith(color: c.textPrimary, height: 1.55),
          ),
          if (pattern case final ReviewPattern p) ...[
            const SizedBox(height: 12),
            Divider(height: 1, color: c.hairline),
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(
                  p.agrees
                      ? Icons.trending_flat_rounded
                      : Icons.call_split_rounded,
                  size: 15,
                  color: c.textMuted,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    p.agrees
                        ? l.revAgree(p.improving.length + p.deteriorating.length,
                            p.readable)
                        : l.revDisagree(p.improving.length, p.deteriorating.length),
                    style: BarbarianType.labelS.copyWith(color: c.textSecondary),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// One metric, as a tile you can scan: the figure, an arrow, the shape, and
/// where it sits against its sector. The words are one tap away.
class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.metric});

  final ReviewMetric metric;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final face = _faceOf(metric.key, l);
    if (face.label.isEmpty) return const SizedBox.shrink();

    return BPressable(
      onTap: () => _showMetricSheet(context, metric),
      child: Container(
        padding: const EdgeInsets.fromLTRB(13, 12, 13, 12),
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(BarbarianRadius.lg),
          border: Border.all(color: c.cardEdge),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    face.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: BarbarianType.labelS.copyWith(color: c.textMuted),
                  ),
                ),
                if (metric.way.isKnown)
                  Icon(
                    switch (metric.way) {
                      ReviewDirection.rising => Icons.north_rounded,
                      ReviewDirection.falling => Icons.south_rounded,
                      _ => Icons.remove_rounded,
                    },
                    size: 13,
                    color: c.textMuted,
                  ),
              ],
            ),
            const SizedBox(height: 8),
            BNumText(
              reviewValue(metric),
              style: BarbarianType.titleM.copyWith(color: c.textPrimary),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 24,
              child: metric.values.length >= 2
                  ? BSparkline(values: metric.values, color: c.accent, height: 24)
                  : const SizedBox.shrink(),
            ),
            if (metric.hasPeers) ...[
              const SizedBox(height: 6),
              Text(
                metric.isAbovePeers ? l.revAboveSector : l.revBelowSector,
                style: BarbarianType.labelNano.copyWith(color: c.textFaint),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
