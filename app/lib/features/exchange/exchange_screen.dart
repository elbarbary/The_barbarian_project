import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/company.dart';
import '../../core/models/market_history.dart';
import '../../core/models/market_snapshot.dart';
import '../../core/models/profit_movement.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/breadth_chart.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/legal.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/price_caption.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';
import '../home/busiest.dart';
import 'index_levels.dart';

/// The session, at length — what the Home hero opens.
///
/// The hero says one index level, two supporting ones and a breadth bar, which
/// is the right amount for a card at the top of a screen and leaves three
/// obvious questions unanswered: what have the *other* two indices been doing,
/// which shares actually moved, and was today wide or narrow compared with the
/// sessions before it. All three are answerable from documents the app already
/// holds — `rates/latest.json` for the levels, `market-history.json` for the
/// recorded closes and breadth, `market.json` merged with the live feed for
/// the session itself — and none of them fit on the card.
///
/// **Nothing on this screen is a view.** Every figure is either published by
/// somebody else or arithmetic over published figures, and the two are marked
/// apart (spec §50). There is no ranking of what to buy, no forecast and no
/// personalisation (spec §8).
class ExchangeScreen extends ConsumerWidget {
  const ExchangeScreen({required this.parentTab, super.key});

  final BNavTab parentTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final isSample = ref.watch(isSampleDataProvider);

    return BDetailScaffold(
      blockGap: 24,
      children: [
        Row(
          children: [
            BSoftIconButton(
              icon: Icons.arrow_back_ios_new_rounded,
              semanticLabel: l.back,
              onTap: () => Navigator.of(context).maybePop(),
            ),
          ],
        ),
        BScreenTitle(l.heroLabel),
        const BPriceCaption(),
        const BIndexPanel(),
        _Movers(parentTab: parentTab),
        const _Breadth(),
        if (isSample) const Center(child: BSampleDataNotice()),
        const BLegalFootnote(),
      ],
    );
  }
}

/// The session's biggest moves either way, named.
///
/// The one question a breadth bar provokes and cannot answer: *which ones?*
///
/// **The floor is the same one the busiest list uses, for the same reason.**
/// Today's raw ranking of risers opens with a share up 19.91% on nine
/// thousand pounds of trading — true, and not a fact about the exchange. A
/// session has to be worth [BBusiest.valueFloor] before a percentage taken
/// from it means anything, and the screen says so rather than filtering
/// quietly.
class _Movers extends ConsumerWidget {
  const _Movers({required this.parentTab});

  final BNavTab parentTab;

  static const int shown = 6;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;

    final directory = ref
        .watch(companyDirectoryProvider)
        .whenOrNull(data: (d) => d.value);
    final snapshot = ref.watch(livePricesProvider);
    if (directory == null || snapshot == null) {
      return const BSkeletonBlock(height: 200);
    }

    final rows = movers(directory: directory, snapshot: snapshot);
    if (rows.isEmpty) return const SizedBox.shrink();

    final up = rows.where((m) => m.change > 0).take(shown).toList();
    final down = rows.reversed.where((m) => m.change < 0).take(shown).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.exchangeMoversLabel, bottomGap: 6),
        Text(
          l.exchangeMoversBody(rows.length),
          style: BarbarianType.bodyM.copyWith(color: c.textSecondary),
        ),
        const SizedBox(height: 12),
        _MoverColumn(
          label: l.sortGainers,
          rows: up,
          rising: true,
          arabic: arabic,
          parentTab: parentTab,
        ),
        const SizedBox(height: 12),
        _MoverColumn(
          label: l.sortLosers,
          rows: down,
          rising: false,
          arabic: arabic,
          parentTab: parentTab,
        ),
        const SizedBox(height: 8),
        Text(
          l.busyFloorNote(egpText(BBusiest.valueFloor / 1e6, l)),
          style: BarbarianType.bodyS.copyWith(color: c.textFaint, height: 1.45),
        ),
      ],
    );
  }
}

class _MoverColumn extends StatelessWidget {
  const _MoverColumn({
    required this.label,
    required this.rows,
    required this.rising,
    required this.arabic,
    required this.parentTab,
  });

  final String label;
  final List<Mover> rows;
  final bool rising;
  final bool arabic;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (rows.isEmpty) return const SizedBox.shrink();
    final tone = c.direction(rising);

    return BPaperCard(
      padding: EdgeInsets.zero,
      clip: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(14, 9, 14, 9),
            decoration: BoxDecoration(
              color: tone.withValues(alpha: c.isDark ? 0.18 : 0.10),
              border: Border(bottom: BorderSide(color: c.hairline)),
            ),
            child: Row(
              children: [
                // Direction never rests on colour alone (spec §42): the arrow
                // says it too, and so does the heading beside it.
                Icon(
                  rising
                      ? Icons.arrow_upward_rounded
                      : Icons.arrow_downward_rounded,
                  size: 14,
                  color: tone,
                ),
                const SizedBox(width: 7),
                Text(
                  label.toUpperCase(),
                  style: BarbarianType.labelMicro.copyWith(color: tone),
                ),
              ],
            ),
          ),
          for (final (i, row) in rows.indexed)
            _MoverRow(
              mover: row,
              arabic: arabic,
              parentTab: parentTab,
              last: i == rows.length - 1,
            ),
        ],
      ),
    );
  }
}

class _MoverRow extends StatelessWidget {
  const _MoverRow({
    required this.mover,
    required this.arabic,
    required this.parentTab,
    required this.last,
  });

  final Mover mover;
  final bool arabic;
  final BNavTab parentTab;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final name = mover.nameFor(arabic);

    return BPressable(
      onTap: () =>
          context.push(Routes.companyPath(parentTab, mover.ticker)),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 11, 14, 11),
        decoration: last
            ? null
            : BoxDecoration(
                border: Border(bottom: BorderSide(color: c.hairline)),
              ),
        child: Row(
          children: [
            SizedBox(
              width: 62,
              child: Text(
                mover.ticker,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: BarbarianType.titleS.copyWith(color: c.textPrimary),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: arabic
                  ? BArabicName(name, color: c.textMuted)
                  : BLatinName(name, color: c.textMuted),
            ),
            const SizedBox(width: 8),
            BNumText(
              mover.close.toStringAsFixed(2),
              style: BarbarianType.figureS.copyWith(color: c.textPrimary),
            ),
            const SizedBox(width: 10),
            BChangeDelta(
              value: '${(mover.change.abs() * 100).toStringAsFixed(2)}%',
              direction: BDirection.of(mover.change),
            ),
          ],
        ),
      ),
    );
  }
}

/// Breadth, session by session, and the one thing it is fair to count.
class _Breadth extends ConsumerWidget {
  const _Breadth();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final history = ref
        .watch(marketHistoryProvider)
        .whenOrNull(data: (s) => s.value);
    final sessions = [
      for (final s in history?.sessions ?? const <MarketSession>[])
        if (s.breadth case final MarketBreadth b when b.isCredible) s,
    ];
    if (sessions.isEmpty) return const SizedBox.shrink();

    final counted = sessions.length;
    final wider = sessions.where((s) => s.breadth!.roseMore).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.exchangeBreadthLabel, bottomGap: 6),
        Text(
          l.exchangeBreadthBody,
          style: BarbarianType.bodyM.copyWith(color: c.textSecondary),
        ),
        const SizedBox(height: 12),
        BPaperCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              BBreadthChart(sessions: sessions),
              const SizedBox(height: 12),
              Wrap(
                spacing: 14,
                runSpacing: 6,
                children: [
                  _Key(colour: c.up, label: l.legendRose),
                  _Key(colour: c.down, label: l.legendFell),
                  _Key(colour: c.textFaint, label: l.legendUnchanged),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                counted == 1
                    ? l.exchangeOneSession
                    : l.exchangeRoseMore(wider, counted),
                style: BarbarianType.bodyS.copyWith(
                  color: c.textSecondary,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Key extends StatelessWidget {
  const _Key({required this.colour, required this.label});

  final Color colour;
  final String label;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 14, height: 3, color: colour),
        const SizedBox(width: 6),
        Text(
          label,
          style: BarbarianType.labelNano.copyWith(color: c.textMuted),
        ),
      ],
    );
  }
}

/// One share's session, for the two lists above.
@immutable
class Mover {
  const Mover({
    required this.ticker,
    required this.name,
    required this.nameAr,
    required this.close,
    required this.change,
    required this.value,
  });

  final String ticker;
  final String name;
  final String? nameAr;
  final double close;

  /// A fraction, as `StockQuote` publishes it: `-0.0325` is −3.25%.
  final double change;

  /// What the session was worth in pounds — the floor.
  final double value;

  String nameFor(bool arabic) =>
      arabic && (nameAr?.isNotEmpty ?? false) ? nameAr! : name;
}

/// Every share that moved and traded enough to count, biggest fall first.
///
/// A pure function, so a test can hold it still.
List<Mover> movers({
  required CompanyDirectory directory,
  required MarketSnapshot snapshot,
  double valueFloor = BBusiest.valueFloor,
}) {
  final rows = <Mover>[];
  for (final company in directory.companies) {
    final quote = snapshot.quoteFor(company.ticker);
    final change = quote?.resolvedChangePercent;
    if (quote == null || change == null || change == 0) continue;
    final value = (quote.volume ?? 0) * quote.close;
    if (value < valueFloor) continue;
    rows.add(
      Mover(
        ticker: company.ticker,
        name: company.nameEn,
        nameAr: company.nameAr,
        close: quote.close,
        change: change,
        value: value,
      ),
    );
  }
  rows.sort((a, b) => b.change.compareTo(a.change));
  return rows;
}
