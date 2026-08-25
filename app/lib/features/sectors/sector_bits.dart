import 'package:flutter/material.dart';

import '../../core/models/sector_report.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../l10n/app_localizations.dart';

/// Shared pieces of the sector view: the metric names, the figure formatter,
/// and the movement bar that shape, word and number all carry (§42) — reused on
/// the section card, the sector detail, and the home hero.

/// The plain name for a metric, borrowed from the review sheet's own strings so
/// a reader meets the same words on both screens.
String sectorMetricLabel(String key, AppLocalizations l) => switch (key) {
  'pe' => l.revPe,
  'pb' => l.revPb,
  'dividend_yield' => l.revYield,
  'profit' => l.revProfit,
  'eps' => l.revEps,
  'assets' => l.revAssets,
  'cash_conversion' => l.revCash,
  'roe' => l.revRoe,
  'roa' => l.revRoa,
  'debt_equity' => l.revDebt,
  _ => key,
};

/// A median figure printed the way the review sheet prints it: a percentage, a
/// compacted pound figure, a per-share number, or a multiple.
String sectorFigure(double v, String unit, String key) => switch (unit) {
  'percent' => '${v.toStringAsFixed(2)}%',
  'egp_m' => _compact(v),
  'egp' => v.toStringAsFixed(2),
  _ when key == 'roe' || key == 'roa' => '${(v * 100).toStringAsFixed(1)}%',
  _ => '${v.toStringAsFixed(2)}×',
};

String _compact(double v) {
  final a = v.abs();
  if (a >= 1e6) return '${(v / 1e6).toStringAsFixed(2)}tn';
  if (a >= 1e3) return '${(v / 1e3).toStringAsFixed(1)}bn';
  return '${v.toStringAsFixed(0)}m';
}

/// One metric's movement across a sector: the name, a segmented bar, and the
/// rising/falling counts spelled out beside it. Colour never stands alone — the
/// bar is paired with an up/down glyph and the number, so the reading survives
/// for a reader who cannot tell the two colours apart (§42).
class BSectorMovementRow extends StatelessWidget {
  const BSectorMovementRow({
    required this.movement,
    this.trailing,
    this.onInk = false,
    super.key,
  });

  final SectorMovement movement;

  /// An optional figure shown to the right of the name — the sector median for
  /// this metric, on the detail screen.
  final String? trailing;

  /// True on a dark surface (the home hero), which flips the palette.
  final bool onInk;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final text = onInk ? c.onInk : c.textPrimary;
    final muted = onInk ? c.onInkMuted : c.textMuted;
    final total = movement.read;

    Widget seg(int value, Color colour) => Expanded(
      flex: value <= 0 ? 0 : value,
      child: value <= 0
          ? const SizedBox.shrink()
          : Padding(
              padding: const EdgeInsetsDirectional.only(end: 3),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: ColoredBox(color: colour),
              ),
            ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                sectorMetricLabel(movement.key, l),
                style: BarbarianType.bodyS.copyWith(color: text),
              ),
            ),
            if (trailing != null)
              Text(
                trailing!,
                style: BarbarianType.labelS.copyWith(color: muted),
              ),
          ],
        ),
        const SizedBox(height: 7),
        if (total > 0)
          SizedBox(
            height: 8,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                seg(movement.rising, c.direction(true, onInkSurface: onInk)),
                seg(movement.flat, onInk ? c.onInkMuted : c.hairline),
                seg(movement.falling, c.direction(false, onInkSurface: onInk)),
              ],
            ),
          ),
        const SizedBox(height: 6),
        Row(
          children: [
            Icon(Icons.north_rounded,
                size: 11, color: c.direction(true, onInkSurface: onInk)),
            const SizedBox(width: 3),
            Text('${movement.rising}',
                style: BarbarianType.labelNano.copyWith(color: muted)),
            const SizedBox(width: 12),
            Icon(Icons.south_rounded,
                size: 11, color: c.direction(false, onInkSurface: onInk)),
            const SizedBox(width: 3),
            Text('${movement.falling}',
                style: BarbarianType.labelNano.copyWith(color: muted)),
            if (movement.flat > 0) ...[
              const SizedBox(width: 12),
              Icon(Icons.remove_rounded, size: 11, color: muted),
              const SizedBox(width: 3),
              Text('${movement.flat}',
                  style: BarbarianType.labelNano.copyWith(color: muted)),
            ],
          ],
        ),
      ],
    );
  }
}
