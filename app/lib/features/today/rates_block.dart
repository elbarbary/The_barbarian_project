import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/explainer.dart';
import '../../core/models/rates.dart';
import '../../core/providers.dart';
import '../../core/widgets/charts.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/explainer_sheet.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// The index, the pound and the gram — in the app's own voice.
///
/// Every Egyptian markets product prints these as a wall of digits: `EGX30
/// 54,512.65 −1.38%`, `USD 50.60`, `ذهب 21 6,260.00`. All true, and all of it
/// assumes the reader already knows what a point is, which ounce a gold price
/// is quoted in, and why the jeweller charges more.
///
/// So these run through the same machinery as everything else: the sentence
/// leads, the exact figure sits under it, and pressing either opens the
/// arithmetic. The gold price is the best argument for the whole approach —
/// it is *derived*, not quoted, and the sheet shows the dollar ounce price,
/// the pound rate and the 31.1035 grams that produced it. A reader can hold
/// that against a shop's board and see that the difference is the making
/// charge rather than a different truth.
class BRatesBlock extends ConsumerWidget {
  const BRatesBlock({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final rates = ref.watch(ratesProvider).value?.value;
    if (rates == null || rates.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // The indices are not repeated here.
        //
        // They were a full-width card of three rows saying what Home already
        // says in three tappable cards with a shape behind each one. Two
        // renderings of the same three numbers on two tabs is not more
        // information, it is more scrolling.
        if (rates.world.isNotEmpty) ...[
          BSectionLabel(l.ratesWorld),
          const SizedBox(height: 10),
          // A rail rather than a stacked card: these are six or seven
          // reference points a reader skims to answer one question — was it us
          // or was it everywhere — and stacking them turned a glance into a
          // scroll past everything else on the tab.
          SizedBox(
            height: 104,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.zero,
              itemCount: rates.world.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, i) => _WorldCard(row: rates.world[i]),
            ),
          ),
          const SizedBox(height: 20),
        ],
        if (rates.metals.isNotEmpty) ...[
          BSectionLabel(l.ratesMetals),
          const SizedBox(height: 10),
          Row(
            children: [
              for (final (i, metal) in rates.metals.indexed) ...[
                if (i > 0) const SizedBox(width: 10),
                Expanded(child: _MetalCard(metal: metal)),
              ],
            ],
          ),
          if (rates.metals.where((m) => m.karats.isNotEmpty).isNotEmpty) ...[
            const SizedBox(height: 10),
            _Karats(metal: rates.metals.firstWhere((m) => m.karats.isNotEmpty)),
          ],
          const SizedBox(height: 20),
        ],
        if (rates.currencies.isNotEmpty) ...[
          BSectionLabel(l.ratesPound),
          const SizedBox(height: 10),
          // A rail rather than a stack. Five currencies down the screen pushed
          // everything below them out of reach, and a reader checking the
          // pound wants the one they care about — not all five in a column.
          SizedBox(
            // The height one explainer row occupies, and the width it needs.
            // `BPlainNumber` lays out a label, a figure and a §50 mark across
            // a full-width row; squeezed into a 168pt tile it overflowed by 25
            // points and lost the provenance mark it exists to carry.
            height: 146,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.zero,
              itemCount: rates.currencies.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, i) => SizedBox(
                width: MediaQuery.sizeOf(context).width * 0.72,
                child: _RateTile(row: rates.currencies[i]),
              ),
            ),
          ),
        ],
      ],
    );
  }

  /// The pipeline already wrote the sentence, the sum and the yardstick, so the
  /// app only reshapes them — it never composes a claim of its own.
  static Explainer _fromRate(RateRow row, bool arabic) => Explainer(
    termId: row.id.isEmpty ? row.code : row.id,
    title: row.labelFor(arabic),
    plain: row.plainFor(arabic),
    token: row.token,
    workings: row.workingsFor(arabic),
    yardstick: row.yardstickFor(arabic),
    // An index move and an exchange rate have no "unusual" threshold that
    // holds across every day, and inventing one would be the tea-leaf reading
    // this app exists to replace.
    notability: Notability.unjudged,
    // Published by the exchange or the market it names, not worked out here
    // (spec §50). The pipeline reshapes the sentence around it; the number
    // itself is somebody else's.
    provenance: Provenance.fact,
    source: row.source,
  );

  static Explainer _fromMetal(MetalRow row, bool arabic) => Explainer(
    termId: row.id,
    title: row.labelFor(arabic),
    plain: row.plainFor(arabic),
    token: row.token,
    workings: row.workingsFor(arabic),
    yardstick: row.yardstickFor(arabic),
    notability: Notability.unjudged,
    // Published by the exchange or the market it names, not worked out here
    // (spec §50). The pipeline reshapes the sentence around it; the number
    // itself is somebody else's.
    provenance: Provenance.fact,
    source: row.source,
  );
}


/// 24, 21 and 18 karat side by side.
///
/// 21 is what most Egyptian jewellery actually is, and a reader comparing our
/// number to a shop window needs the karat that matches what is in the window.
/// Each is the 24-karat price times its purity, and pressing one shows that.
class _Karats extends StatelessWidget {
  const _Karats({required this.metal});

  final MetalRow metal;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);

    return Row(
      children: [
        for (final karat in metal.karats) ...[
          Expanded(
            child: GestureDetector(
              onTap: () => showExplainer(
                context,
                Explainer(
                  termId: 'gold_${karat.karat}',
                  title: l.goldKaratGram(karat.karat),
                  plain:
                      'A gram of ${karat.karat}-karat gold costs '
                      '${karat.egpGram.toStringAsFixed(2)} pounds.',
                  token: 'EGP ${karat.egpGram.toStringAsFixed(2)}',
                  workings: karat.workings,
                  yardstick:
                      '${karat.karat} parts gold in every 24. Most Egyptian '
                      'jewellery is 21. The metal is the same price either '
                      'way; the karat is how much of it is in the piece.',
                  notability: Notability.unjudged,
                  source: metal.source,
                ),
              ),
              child: BPaperCard(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 13,
                ),
                child: Column(
                  children: [
                    Text(
                      '${karat.karat}K',
                      style: BarbarianType.labelNano.copyWith(
                        color: c.textMuted,
                      ),
                    ),
                    const SizedBox(height: 5),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        karat.egpGram.toStringAsFixed(0),
                        style: BarbarianType.figureS.copyWith(
                          color: c.textPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'a gram',
                      style: BarbarianType.labelNano.copyWith(
                        color: c.textFaint,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (karat != metal.karats.last) const SizedBox(width: 8),
        ],
      ],
    );
  }
}

/// One reference market, as a card small enough to skim six of.
class _WorldCard extends StatelessWidget {
  const _WorldCard({required this.row});

  final RateRow row;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final change = row.changePercent;

    return BPressable(
      onTap: () => showExplainer(context, BRatesBlock._fromRate(row, arabic)),
      child: BPaperCard(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        child: SizedBox(
          width: 126,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                row.labelFor(arabic).isEmpty
                    ? row.id
                    : row.labelFor(arabic),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: BarbarianType.labelTiny.copyWith(
                  color: c.textMuted,
                  letterSpacing: 1.1,
                ),
              ),
              const Spacer(),
              if (row.level case final double level)
                BNumText(
                  level >= 1000
                      ? level.toStringAsFixed(0)
                      : level.toStringAsFixed(2),
                  style: BarbarianType.figureM.copyWith(color: c.textPrimary),
                ),
              const SizedBox(height: 4),
              if (change != null)
                BChangeDelta(
                  value: '${change.abs().toStringAsFixed(2)}%',
                  direction: BDirection.of(change),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Gold or silver, on its own card.
///
/// These were two rows in a list of numbers, which is the wrong shape for the
/// figure most readers of this app check most often and the one they are most
/// likely to compare against a shop window. The gram price leads, because that
/// is the unit Egyptian jewellery is priced and sold in — the ounce is a
/// commodity-desk unit and belongs underneath.
class _MetalCard extends ConsumerWidget {
  const _MetalCard({required this.metal});

  final MetalRow metal;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final l = AppLocalizations.of(context);
    final gram = metal.egpGram;
    // The dollar-an-ounce series, which is the market these actually trade in.
    // The card's headline is pounds a gram, and charting that would need a
    // matching history of the pound we do not hold — so the shape is the
    // metal's own and the number above it stays the one a reader buys at.
    final series = ref
        .watch(marketHistoryProvider)
        .whenOrNull(data: (s) => s.value)
        ?.metalOf(metal.id) ??
        const <double>[];

    return BPressable(
      onTap: () => showExplainer(
        context,
        BRatesBlock._fromMetal(metal, arabic),
        series: series,
      ),
      child: BDarkCard(
        radius: BarbarianRadius.xl,
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              metal.labelFor(arabic),
              style: BarbarianType.labelTiny.copyWith(
                color: c.onInkMuted,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 10),
            BNumText(
              gram == null ? '—' : gram.toStringAsFixed(0),
              style: BarbarianType.displayS.copyWith(color: c.onInk),
            ),
            const SizedBox(height: 2),
            Text(
              'EGP · ${l.ratesPerGram}',
              style: BarbarianType.labelNano.copyWith(color: c.onInkMuted),
            ),
            if (metal.egpOunce case final double ounce) ...[
              const SizedBox(height: 8),
              Text(
                l.goldPerOunce(ounce.toStringAsFixed(0)),
                style: BarbarianType.bodyS.copyWith(color: c.onInkMuted),
              ),
            ],
            // Two points is the least that draws a line rather than a dot.
            if (series.length > 1) ...[
              const SizedBox(height: 10),
              BSparkline(values: series, height: 28, color: c.onInkMuted),
            ],
          ],
        ),
      ),
    );
  }
}

/// One currency against the pound, in a rail.
///
/// A rail rather than a stack, but still a **`BPlainNumber`**: the figure keeps
/// its dotted underline, its §50 provenance mark and the arithmetic behind it.
/// Replacing it with a plain number was the first attempt, and it quietly took
/// the whole explainer affordance off five rates — a test caught it, which is
/// what that test is for.
class _RateTile extends StatelessWidget {
  const _RateTile({required this.row});

  final RateRow row;

  @override
  Widget build(BuildContext context) {
      final arabic = Directionality.of(context) == TextDirection.rtl;
    return BPaperCard(
      radius: BarbarianRadius.xl,
      padding: EdgeInsets.zero,
      child: BPlainNumber(explainer: BRatesBlock._fromRate(row, arabic), last: true),
    );
  }
}
