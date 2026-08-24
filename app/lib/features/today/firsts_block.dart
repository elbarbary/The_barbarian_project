import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/signals.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// "First time since" — the market's streak breaks, in one place.
///
/// This is the archive earning its keep. A company reporting a loss is a
/// filing; a company reporting its **first** loss after twenty-seven
/// profitable periods is news, and there is no way to know it without holding
/// a decade of that company's filed figures — which this app does and almost
/// nobody else publishing to an Egyptian reader does.
///
/// The rule for what appears here is the same one the volume screens use:
/// unusual **against its own record**, never against the market's. A large
/// loss at a company that loses money every year is not on this list. A small
/// one at a company that had not lost money since 2017 is.
///
/// Nothing here is a signal to do anything. `build_signals.py` counts rows and
/// stops; the footnote says so on the screen, and the row opens the company
/// rather than a verdict.
class BFirstsBlock extends ConsumerWidget {
  const BFirstsBlock({required this.parentTab, this.limit = 5, super.key});

  final BNavTab parentTab;
  final int limit;

  /// How recent a streak break has to be to still be news. Beyond this the
  /// company page still carries it; the feed should not.
  static const int freshDays = 180;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final index =
        ref.watch(signalsProvider).value?.value ?? SignalsIndex.empty;

    final floor = DateTime.now().subtract(const Duration(days: freshDays));
    final rows = [
      for (final signal in index.firsts)
        if (DateTime.tryParse(signal.when) case final DateTime at
            when at.isAfter(floor))
          signal,
    ];
    if (rows.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.firstsLabel, bottomGap: 4),
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Text(
            l.firstsBlurb,
            style: BarbarianType.bodyS.copyWith(color: c.textMuted, height: 1.45),
          ),
        ),
        BPaperCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var i = 0; i < rows.take(limit).length; i++) ...[
                if (i > 0) ...[
                  const SizedBox(height: 12),
                  Divider(height: 1, color: c.hairline),
                  const SizedBox(height: 12),
                ],
                _SignalRow(signal: rows[i], parentTab: parentTab),
              ],
            ],
          ),
        ),
        if (rows.length > limit)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              l.firstsMore(rows.length - limit),
              style: BarbarianType.labelNano.copyWith(color: c.textFaint),
            ),
          ),
      ],
    );
  }
}

class _SignalRow extends StatelessWidget {
  const _SignalRow({required this.signal, required this.parentTab});

  final MarketSignal signal;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;

    final headline = switch (signal.kind) {
      'first_loss' => l.sigFirstLoss(signal.period, signal.run),
      'back_to_profit' => l.sigBackToProfit(signal.period, signal.run),
      _ => l.sigFirstOfType(signal.labelFor(arabic), signal.gapYears),
    };

    return BPressable(
      onTap: () => context.push(Routes.companyPath(parentTab, signal.ticker)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsetsDirectional.only(top: 1, end: 10),
            child: BTickerMonogram(signal.ticker, size: 32),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      signal.ticker,
                      style: BarbarianType.labelS.copyWith(color: c.accent),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        signal.nameFor(arabic),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textDirection: isArabic(signal.nameFor(arabic))
                            ? TextDirection.rtl
                            : TextDirection.ltr,
                        style: BarbarianType.bodyS.copyWith(color: c.textMuted),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  headline,
                  style: BarbarianType.bodyM.copyWith(
                    color: c.textPrimary,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
