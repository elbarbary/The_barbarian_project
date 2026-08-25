import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/explainer.dart';
import '../../core/models/review.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/explainer_sheet.dart';
import '../../core/widgets/motion.dart';
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
    final review = ref.watch(companyReviewProvider(ticker)).value?.value;
    if (review == null || review.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.revLabel, bottomGap: 8),
        if (review.pattern case final ReviewPattern pattern)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _PatternCard(pattern: pattern),
          ),
        BPaperCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var i = 0; i < review.ordered.length; i++) ...[
                if (i > 0) ...[
                  const SizedBox(height: 12),
                  Divider(height: 1, color: c.hairline),
                  const SizedBox(height: 12),
                ],
                _MetricRow(metric: review.ordered[i]),
              ],
            ],
          ),
        ),
        const SizedBox(height: 10),
        Text(
          // The two absences, stated rather than left as a puzzle. A reader
          // who knows the framework will look for margin, and the reason it is
          // missing is more useful than a number we invented to fill the row.
          l.revMissingNote,
          style: BarbarianType.bodyS.copyWith(color: c.textFaint, height: 1.5),
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}

/// How many moved together, and how many did not. Never a total.
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

class _MetricRow extends StatelessWidget {
  const _MetricRow({required this.metric});

  final ReviewMetric metric;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final face = _faceOf(metric.key, l);
    if (face.label.isEmpty) return const SizedBox.shrink();

    return BPressable(
      onTap: () => showExplainer(context, _explainer(metric, l)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  face.label,
                  style: BarbarianType.bodyM.copyWith(color: c.textPrimary),
                ),
              ),
              if (metric.way.isKnown) ...[
                Icon(
                  switch (metric.way) {
                    ReviewDirection.rising => Icons.north_rounded,
                    ReviewDirection.falling => Icons.south_rounded,
                    _ => Icons.remove_rounded,
                  },
                  size: 13,
                  color: c.textMuted,
                ),
                const SizedBox(width: 4),
                Text(
                  _wayWord(metric.way, l),
                  style: BarbarianType.labelNano.copyWith(color: c.textMuted),
                ),
                const SizedBox(width: 10),
              ],
              BNumText(
                _format(metric, l),
                style: BarbarianType.titleS.copyWith(color: c.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 5),
          Row(
            children: [
              if (metric.hasPeers) ...[
                Text(
                  metric.isAbovePeers ? l.revAboveSector : l.revBelowSector,
                  style: BarbarianType.labelNano.copyWith(color: c.textFaint),
                ),
                const SizedBox(width: 8),
              ],
              if (metric.points > 1)
                Text(
                  l.revOverPeriods(metric.points),
                  style: BarbarianType.labelNano.copyWith(color: c.textFaint),
                ),
            ],
          ),
          const SizedBox(height: 6),
          // The question. Not a footnote to the number — the reason the number
          // is on the screen at all.
          Text(
            face.question,
            style: BarbarianType.bodyS.copyWith(
              color: c.accent,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  static String _wayWord(ReviewDirection way, AppLocalizations l) =>
      switch (way) {
        ReviewDirection.rising => l.revRising,
        ReviewDirection.falling => l.revFalling,
        _ => l.revFlat,
      };

  /// The figure, in the unit the builder said it was in.
  static String _format(ReviewMetric metric, AppLocalizations l) {
    final v = metric.value;
    return switch (metric.unit) {
      'percent' => '${v.toStringAsFixed(2)}%',
      'egp_m' => _compact(v),
      'egp' => v.toStringAsFixed(2),
      // A return is a ratio in the data and a percentage to a reader.
      _ when metric.key == 'roe' || metric.key == 'roa' =>
        '${(v * 100).toStringAsFixed(1)}%',
      _ => '${v.toStringAsFixed(2)}×',
    };
  }

  static String _compact(double v) {
    final a = v.abs();
    if (a >= 1e6) return '${(v / 1e6).toStringAsFixed(2)}tn';
    if (a >= 1e3) return '${(v / 1e3).toStringAsFixed(1)}bn';
    return '${v.toStringAsFixed(0)}m';
  }

  static ({String label, String question}) _faceOf(
    String key,
    AppLocalizations l,
  ) => switch (key) {
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
    // taught yet. Showing the raw key would be a bug on screen; showing
    // nothing is the honest degrade.
    _ => (label: '', question: ''),
  };

  static Explainer _explainer(ReviewMetric metric, AppLocalizations l) {
    final body = switch (metric.key) {
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
    final face = _faceOf(metric.key, l);
    return Explainer(
      termId: 'review.${metric.key}',
      title: face.label,
      plain: face.question,
      token: '',
      workings: body,
      yardstick: '',
      // A ratio we computed from published figures, which is what
      // `Provenance.calculation` means — and it is the constructor's default,
      // so saying it again is noise.
      notability: Notability.unjudged,
      source: 'EGX',
    );
  }
}
