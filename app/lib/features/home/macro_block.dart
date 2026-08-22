import 'package:flutter/material.dart';
import '../../core/widgets/nav.dart';
import '../../app/router.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/macro.dart';
import '../../core/models/recency.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/charts.dart';
import '../../core/widgets/explainer_sheet.dart';
import '../../core/models/explainer.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// What moves Egypt, and why it reaches a share.
///
/// The rest of Home starts from a company — a filing, a price, a watchlist. This
/// block is the only place that starts from the country, and it exists because
/// most of what moves the EGX is not company news: it is the canal, the barrel,
/// the metal people save in, and the pound.
///
/// **Suez leads.** Canal dues are among Egypt's largest foreign-currency
/// earners and nobody else puts the daily transit count in front of an Egyptian
/// retail investor. It also lags about five days, which is why every card here
/// carries its own date rather than borrowing the screen's (§49).
///
/// Each card carries three different kinds of claim and keeps them apart (§50):
/// the reading is a published fact, the correlation is arithmetic over two
/// published series, and the chain is ours. The correlation sits beside the
/// chain **so the two can disagree in front of the reader** — Suez has a
/// compelling mechanism and a correlation near zero, which says the canal
/// reaches the exchange over months rather than sessions. Hiding that would
/// turn an explanation into a claim.
class BMacroBlock extends ConsumerWidget {
  const BMacroBlock({super.key});

  /// What is shown, not what order it is shown in. WTI is collected as a
  /// cross-check on Brent rather than displayed twice.
  static const _shown = ['suez', 'brent', 'gold', 'silver'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final doc = ref.watch(macroProvider).whenOrNull(data: (s) => s.value);
    if (doc == null || doc.series.isEmpty) return const SizedBox.shrink();

    final shown = [
      for (final id in _shown)
        if (doc.byId(id) case final MacroSeries s) s,
    ];
    if (shown.isEmpty) return const SizedBox.shrink();

    // Ordered by how much each one actually moved, so the card that leads is
    // the one worth looking at today rather than whichever was listed first.
    // A fixed order puts the canal at the top on a day it did not budge and
    // gold third on a day it jumped three percent.
    shown.sort((a, b) {
      final byMove = (b.changePercent?.abs() ?? -1)
          .compareTo(a.changePercent?.abs() ?? -1);
      // Ties fall back to the listed order, so a quiet day is still stable
      // rather than reshuffling itself between builds.
      return byMove != 0
          ? byMove
          : _shown.indexOf(a.id).compareTo(_shown.indexOf(b.id));
    });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        BSectionLabel(l.homeMacro),
        for (final (i, series) in shown.indexed) ...[
          if (i > 0) const SizedBox(height: 10),
          _MacroCard(
            series: series,
            correlation: doc.correlationFor(series.id),
            lead: i == 0,
          ),
        ],
      ],
    );
  }
}

class _MacroCard extends StatelessWidget {
  const _MacroCard({
    required this.series,
    required this.correlation,
    required this.lead,
  });

  final MacroSeries series;
  final MacroCorrelation? correlation;

  /// The card that moved most gets the space: it shows the chain in full.
  final bool lead;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final change = series.changePercent;

    return BPressable(
      onTap: () => showExplainer(
        context,
        Explainer(
          termId: 'macro.${series.id}',
          title: series.labelFor(arabic),
          plain: series.meaningFor(arabic),
          token: _reading(series),
          workings: series.chainFor(arabic),
          yardstick: _yardstick(l),
          // No published band says what an ordinary day for the canal is, and
          // inventing one would be a claim rather than a reading.
          notability: Notability.unjudged,
          // The chain is the app's own reasoning over published figures. It is
          // the strongest thing said anywhere in here and it is marked as such.
          provenance: Provenance.interpretation,
          source: series.source,
        ),
        series: series.values,
      ),
      child: BPaperCard(
        radius: BarbarianRadius.xl,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    series.labelFor(arabic),
                    style: BarbarianType.labelNano.copyWith(color: c.textMuted),
                  ),
                ),
                // Its own date, never the screen's. Suez lags about five days
                // and a stale number beside a live price is exactly what §49
                // was written about.
                if (context.filingAge(series.asOf) case final age?)
                  Text(
                    age,
                    style: BarbarianType.labelNano.copyWith(color: c.textFaint),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                // The reading takes what it needs and the shape takes the
                // rest. "41 vessels" beside a percentage and a line overflowed
                // a phone by 28px when all three insisted on their full width.
                Flexible(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Flexible(
                        child: BNumText(
                          _reading(series),
                          style: BarbarianType.headlineM.copyWith(
                            color: c.textPrimary,
                          ),
                        ),
                      ),
                      if (change != null) ...[
                        const SizedBox(width: 8),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 3),
                          child: Text(
                            '${change >= 0 ? '+' : ''}'
                            '${change.toStringAsFixed(1)}%',
                            style: BarbarianType.labelNano.copyWith(
                              color: c.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (series.values.length > 1) ...[
                  const SizedBox(width: 10),
                  SizedBox(
                    width: 76,
                    child: BSparkline(values: series.values, height: 26),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 10),
            Text(
              series.meaningFor(arabic),
              style: BarbarianType.bodyS.copyWith(
                color: c.textSecondary,
                height: 1.45,
              ),
            ),
            if (lead) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 11),
                decoration: BoxDecoration(
                  color: c.hairline,
                  borderRadius: BorderRadius.circular(BarbarianRadius.md),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l.macroWhyItMatters.toUpperCase(),
                      style: BarbarianType.labelNano.copyWith(
                        color: c.textMuted,
                        letterSpacing: 0.6,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      series.chainFor(arabic),
                      style: BarbarianType.bodyS.copyWith(
                        color: c.textPrimary,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            // Somebody else's reporting on what this series has been doing.
            // Only on the lead card: four headlines under every macro row is a
            // news feed with a chart on top, and the news feed is upstairs.
            if (lead && series.coverage.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                l.macroCoverage.toUpperCase(),
                style: BarbarianType.labelNano.copyWith(
                  color: c.textMuted,
                  letterSpacing: 0.6,
                ),
              ),
              for (final item in series.coverage.take(3)) ...[
                const SizedBox(height: 8),
                _CoverageRow(item: item),
              ],
            ],
            if (correlation case final MacroCorrelation r) ...[
              const SizedBox(height: 10),
              Text(
                r.isMeaningful
                    ? '${l.macroMovesWith} ${r.r >= 0 ? '+' : ''}'
                          '${r.r.toStringAsFixed(2)} · '
                          '${l.macroSessions(r.sessions)}'
                    : '${l.macroWeakLink} · ${l.macroSessions(r.sessions)}',
                style: BarbarianType.labelNano.copyWith(color: c.textFaint),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _reading(MacroSeries s) {
    final v = s.latest;
    final shown = v >= 1000
        ? v.toStringAsFixed(0)
        : v >= 100
        ? v.toStringAsFixed(1)
        : v.toStringAsFixed(2);
    return s.unit == 'vessels' ? '${v.toStringAsFixed(0)} ${s.unit}' : shown;
  }

  String _yardstick(AppLocalizations l) => l.macroWhyItMatters;
}

/// One outlet's headline, credited and linked.
///
/// Their sentence, in their words, with their name on it. The app does not
/// summarise it, translate it, or tell a reader what to make of it — the
/// mechanism above already says what the number does, and this is the
/// reporting a reader can go and check for themselves.
class _CoverageRow extends StatelessWidget {
  const _CoverageRow({required this.item});

  final MacroCoverage item;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return BPressable(
      onTap: item.url.isEmpty
          ? null
          : () => context.push(
              Routes.articlePath(BNavTab.home, item.url, item.domain),
            ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Container(
              width: 4,
              height: 4,
              decoration: BoxDecoration(
                color: c.textFaint,
                shape: BoxShape.circle,
              ),
            ),
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: BarbarianType.bodyS.copyWith(
                    color: c.textPrimary,
                    height: 1.4,
                  ),
                ),
                if (item.domain.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    item.domain,
                    style: BarbarianType.labelNano.copyWith(color: c.textFaint),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
