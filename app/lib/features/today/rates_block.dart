import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/explainer.dart';
import '../../core/models/rates.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/explainer_sheet.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';

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
    final rates = ref.watch(ratesProvider).value?.value;
    if (rates == null || rates.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (rates.indices.isNotEmpty) ...[
          const BSectionLabel('The market as a whole'),
          const SizedBox(height: 10),
          _Card(rows: [for (final i in rates.indices) _fromRate(i)]),
          const SizedBox(height: 20),
        ],
        if (rates.world.isNotEmpty) ...[
          const BSectionLabel('Was it Egypt, or everywhere?'),
          const SizedBox(height: 10),
          _Card(rows: [for (final w in rates.world) _fromRate(w)]),
          const SizedBox(height: 20),
        ],
        if (rates.metals.isNotEmpty) ...[
          const BSectionLabel('Gold and silver'),
          const SizedBox(height: 10),
          _Card(rows: [for (final m in rates.metals) _fromMetal(m)]),
          if (rates.metals.where((m) => m.karats.isNotEmpty).isNotEmpty) ...[
            const SizedBox(height: 10),
            _Karats(metal: rates.metals.firstWhere((m) => m.karats.isNotEmpty)),
          ],
          const SizedBox(height: 20),
        ],
        if (rates.currencies.isNotEmpty) ...[
          const BSectionLabel('The pound'),
          const SizedBox(height: 10),
          _Card(rows: [for (final c in rates.currencies) _fromRate(c)]),
        ],
      ],
    );
  }

  /// The pipeline already wrote the sentence, the sum and the yardstick, so the
  /// app only reshapes them — it never composes a claim of its own.
  static Explainer _fromRate(RateRow row) => Explainer(
    termId: row.id.isEmpty ? row.code : row.id,
    title: row.label,
    plain: row.plain,
    token: row.token,
    workings: row.workings,
    yardstick: row.yardstick,
    // An index move and an exchange rate have no "unusual" threshold that
    // holds across every day, and inventing one would be the tea-leaf reading
    // this app exists to replace.
    notability: Notability.unjudged,
    source: row.source,
  );

  static Explainer _fromMetal(MetalRow row) => Explainer(
    termId: row.id,
    title: row.label,
    plain: row.plain,
    token: row.token,
    workings: row.workings,
    yardstick: row.yardstick,
    notability: Notability.unjudged,
    source: row.source,
  );
}

class _Card extends StatelessWidget {
  const _Card({required this.rows});

  final List<Explainer> rows;

  @override
  Widget build(BuildContext context) => BPaperCard(
    padding: EdgeInsets.zero,
    child: Column(
      children: [
        for (var i = 0; i < rows.length; i++)
          BPlainNumber(explainer: rows[i], last: i == rows.length - 1),
      ],
    ),
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

    return Row(
      children: [
        for (final karat in metal.karats) ...[
          Expanded(
            child: GestureDetector(
              onTap: () => showExplainer(
                context,
                Explainer(
                  termId: 'gold_${karat.karat}',
                  title: '${karat.karat} karat gold, a gram',
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
