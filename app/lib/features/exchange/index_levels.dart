import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/explainer.dart';
import '../../core/models/market_history.dart';
import '../../core/models/rates.dart';
import '../../core/models/recency.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/charts.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/explainer_sheet.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// All three indices, one at a time, each with the closes the app has kept.
///
/// The Home hero prints the EGX 30 large and the other two small, which is the
/// right emphasis for a card and the wrong one for a reader who came here
/// asking about the 70. Here they are peers: a selector, and whichever is
/// chosen gets the whole panel — the level, the session's move, its own line
/// of recorded closes, the low and high of that line, and what it has done
/// across the whole stretch.
///
/// **The series is short and says so.** Nobody publishes a history of these
/// levels that we can reach, so `build_market_history.py` writes one close a
/// session and the chart grows into it. A one-session chart is a dot, and the
/// caption underneath gives the count and the date it starts from rather than
/// letting a four-point line imply a year.
class BIndexPanel extends ConsumerStatefulWidget {
  const BIndexPanel({super.key});

  @override
  ConsumerState<BIndexPanel> createState() => _BIndexPanelState();
}

class _BIndexPanelState extends ConsumerState<BIndexPanel> {
  int _selected = 0;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;

    final rates = ref.watch(ratesProvider).whenOrNull(data: (s) => s.value);
    final history = ref
        .watch(marketHistoryProvider)
        .whenOrNull(data: (s) => s.value);
    final indices = rates?.indices ?? const <RateRow>[];
    if (indices.isEmpty) {
      return const BSkeletonBlock(height: 300, radius: BarbarianRadius.xl);
    }

    final index = indices[_selected.clamp(0, indices.length - 1)];
    final series = history?.levelsOf(index.id) ?? const <double>[];
    final since = _firstDateOf(history, index.id);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.exchangeIndicesLabel, bottomGap: 10),
        if (indices.length > 1) ...[
          BSegmentedRow(
            segments: [
              for (final row in indices)
                BSegment(
                  label: row.labelFor(arabic).isEmpty
                      ? row.id
                      : row.labelFor(arabic),
                ),
            ],
            selectedIndex: _selected.clamp(0, indices.length - 1),
            onChanged: (i) => setState(() => _selected = i),
          ),
          const SizedBox(height: 12),
        ],
        _IndexCard(
          index: index,
          series: series,
          since: since,
          arabic: arabic,
        ),
        const SizedBox(height: 10),
        // The index's own published sentence, in the reader's language. It
        // arrives on the row rather than being written here, so the app cannot
        // say something the pipeline did not.
        if (index.plainFor(arabic) case final String plain when plain.isNotEmpty)
          Text(
            plain,
            style: BarbarianType.bodyM.copyWith(
              color: c.textSecondary,
              height: 1.45,
            ),
          ),
      ],
    );
  }

  /// The date of the first session that carries this index, so the caption can
  /// say where the line starts rather than implying it starts at listing.
  static String? _firstDateOf(MarketHistory? history, String id) {
    for (final session in history?.sessions ?? const <MarketSession>[]) {
      if (session.indices.containsKey(id)) return session.date;
    }
    return null;
  }
}

class _IndexCard extends StatelessWidget {
  const _IndexCard({
    required this.index,
    required this.series,
    required this.since,
    required this.arabic,
  });

  final RateRow index;
  final List<double> series;
  final String? since;
  final bool arabic;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final level = index.level;
    final change = index.changePercent;
    final rising = series.length > 1 && series.last >= series.first;
    final tone = c.direction(rising, onInkSurface: true);

    return BDarkCard(
      radius: BarbarianRadius.xl,
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            (index.labelFor(arabic).isEmpty ? index.id : index.labelFor(arabic))
                .toUpperCase(),
            style: BarbarianType.labelNano.copyWith(
              color: c.onInkMuted,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Not Expanded: the dotted underline is the app's mark for
              // "there is more behind this figure", and stretched across the
              // card it underlines the whitespace beside the number too.
              Flexible(
                child: BPressable(
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
                      notability: Notability.unjudged,
                      provenance: Provenance.fact,
                      source: index.source,
                    ),
                    series: series,
                  ),
                  child: BDottedUnderline(
                    onDark: true,
                    child: BNumText(
                      level == null ? '—' : grouped(level),
                      style: BarbarianType.displayS.copyWith(color: c.onInk),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              if (change != null)
                BChangeDelta(
                  value: '${change.abs().toStringAsFixed(2)}%',
                  direction: BDirection.of(change),
                  onDark: true,
                ),
            ],
          ),
          if (series.length > 1) ...[
            const SizedBox(height: 16),
            BSparkline(
              values: series,
              height: 132,
              fill: true,
              strokeWidth: 2.2,
              color: tone,
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                _Bound(
                  label: l.priceLow,
                  value: series.reduce((a, b) => a < b ? a : b),
                ),
                const Spacer(),
                _Bound(
                  label: l.priceHigh,
                  value: series.reduce((a, b) => a > b ? a : b),
                  alignEnd: true,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Divider(height: 1, color: c.onInk.withValues(alpha: 0.12)),
            const SizedBox(height: 11),
            _Window(series: series, since: since),
          ],
        ],
      ),
    );
  }
}

/// How long the line is, and what it did over the whole of it.
class _Window extends StatelessWidget {
  const _Window({required this.series, required this.since});

  final List<double> series;
  final String? since;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final first = series.first;
    // A calculation over recorded closes, not a published figure — and the
    // only number on this screen the exchange did not print itself.
    final move = first == 0 ? null : (series.last - first) / first * 100;

    return Row(
      children: [
        Expanded(
          child: Text(
            l.exchangeRecorded(
              series.length,
              since == null ? '—' : context.dayMonthIso(since!),
            ),
            style: BarbarianType.bodyS.copyWith(color: c.onInkMuted),
          ),
        ),
        if (move != null) ...[
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              BChangeDelta(
                value: '${move.abs().toStringAsFixed(2)}%',
                direction: BDirection.of(move),
                onDark: true,
              ),
              const SizedBox(height: 3),
              Text(
                l.exchangeWindowMove,
                style: BarbarianType.labelNano.copyWith(color: c.onInkMuted),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class _Bound extends StatelessWidget {
  const _Bound({
    required this.label,
    required this.value,
    this.alignEnd = false,
  });

  final String label;
  final double value;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: alignEnd
          ? CrossAxisAlignment.end
          : CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label.toUpperCase(),
          style: BarbarianType.labelNano.copyWith(
            color: c.onInkMuted,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 3),
        BNumText(
          grouped(value),
          style: BarbarianType.figureS.copyWith(color: c.onInk),
        ),
      ],
    );
  }
}
