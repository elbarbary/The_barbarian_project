import 'package:flutter/material.dart';

import '../theme/barbarian_theme.dart';
import 'motion.dart';
import 'text.dart';

/// Which way a figure moved. The glyph is part of the data, not decoration:
/// direction must survive without colour (spec §42).
enum BDirection {
  up('▲'),
  down('▼'),
  flat('·');

  const BDirection(this.glyph);

  final String glyph;

  static BDirection of(num? change) {
    if (change == null || change == 0) return BDirection.flat;
    return change > 0 ? BDirection.up : BDirection.down;
  }
}

/// A ▲/▼ and a value.
///
/// [isPositiveGood] exists because direction and desirability are not the same
/// thing. Revenue rising is good; **net debt rising is not**. The design's own
/// seed data gets this wrong — it paints "Net debt 12.9bn ▲ 8.8%" in the up
/// colour — so the caller states the polarity and the widget colours
/// accordingly, while the glyph always reports the actual direction.
class BChangeDelta extends StatelessWidget {
  const BChangeDelta({
    required this.value,
    required this.direction,
    this.style,
    this.onDark = false,
    this.isPositiveGood = true,
    this.gap = 0,
    super.key,
  });

  final String value;
  final BDirection direction;
  final TextStyle? style;
  final bool onDark;

  /// False for metrics where an increase is unwelcome — net debt, leverage,
  /// NPL ratio, days-to-exit.
  final bool isPositiveGood;

  final double gap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final good = switch (direction) {
      BDirection.flat => null,
      BDirection.up => isPositiveGood,
      BDirection.down => !isPositiveGood,
    };
    // The direction tones follow the surface. On the ink slab the paper pair
    // measures 2.87:1 and 2.78:1 — a shape, not a figure — so the theme
    // carries a second pair for exactly this, the way it does for the accent.
    // Only the flat case used to branch on [onDark], which meant every delta
    // that mattered ignored it.
    final color = switch (good) {
      null => onDark ? c.onInkMuted : c.textMuted,
      true => onDark ? c.upOnInk : c.up,
      false => onDark ? c.downOnInk : c.down,
    };
    final resolved = (style ?? BarbarianType.pill).copyWith(color: color);

    return Semantics(
      label:
          '${switch (direction) {
            BDirection.up => 'up',
            BDirection.down => 'down',
            BDirection.flat => 'unchanged',
          }} $value',
      excludeSemantics: true,
      child: Directionality(
        textDirection: TextDirection.ltr,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(direction.glyph, style: resolved),
            if (gap > 0) SizedBox(width: gap),
            BNumText(value, style: resolved, isolate: false),
          ],
        ),
      ),
    );
  }
}

enum BChipVariant {
  /// Accent text on a translucent accent wash — post kind chips.
  ember,

  /// Muted text on paper — topic chips.
  neutral,

  /// Ink fill, light text — a selected filter.
  solid,

  /// Paper fill on a dark surface.
  onDark,
}

/// The one pill chip: post kinds, topic tags, index filters, verdict marks.
class BKindChip extends StatelessWidget {
  const BKindChip(
    this.label, {
    this.variant = BChipVariant.neutral,
    this.onTap,
    this.leading,
    this.padding,
    this.center = false,
    super.key,
  });

  final String label;
  final BChipVariant variant;
  final VoidCallback? onTap;
  final Widget? leading;
  final EdgeInsetsGeometry? padding;

  /// True when the chip is stretched to a fixed width — a range selector, a
  /// segmented filter — so the label centres instead of hugging the leading
  /// edge.
  final bool center;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (bg, fg) = switch (variant) {
      // The label is the accent pulled toward the ground it sits on. Printed
      // undiluted on its own 12% wash it measures 2.7:1 at 10pt — the accent
      // is the lightest tone in the theme and the least able to carry type.
      BChipVariant.ember => (
        c.accent.withValues(alpha: c.isDark ? 0.20 : 0.14),
        BarbarianPalette.onWash(c, c.accent),
      ),
      // Not `surface`: that is the card colour, and a neutral chip inside a
      // card was drawing itself at 1.000:1 — the flags on a verdict card
      // stopped being chips and became loose words in a Wrap.
      BChipVariant.neutral => (
        c.textPrimary.withValues(alpha: c.isDark ? 0.10 : 0.06),
        c.textSecondary,
      ),
      BChipVariant.solid => (c.ink, c.onInk),
      BChipVariant.onDark => (c.onInk.withValues(alpha: 0.09), c.onInk),
    };

    final chip = Container(
      padding:
          padding ?? const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
      ),
      // Chips carry Cash or Trash flags, some of which are long
      // ("🔒 LIMIT-PRICE / EXIT RISK"). Inside a Wrap they must be able to
      // shrink; inside a horizontally scrolling row the constraints are
      // unbounded and Flexible would assert, so the fit is chosen from the
      // constraints rather than assumed.
      child: LayoutBuilder(
        builder: (context, constraints) {
          final text = Text(
            label,
            style: BarbarianType.pill.copyWith(color: fg),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          );
          return Row(
            mainAxisSize: center ? MainAxisSize.max : MainAxisSize.min,
            mainAxisAlignment: center
                ? MainAxisAlignment.center
                : MainAxisAlignment.start,
            children: [
              if (leading case final Widget l) ...[
                l,
                const SizedBox(width: BarbarianSpace.xs),
              ],
              if (constraints.hasBoundedWidth) Flexible(child: text) else text,
            ],
          );
        },
      ),
    );

    return onTap == null
        ? chip
        : BPressable(
            onTap: onTap,
            scale: 0.96,
            semanticLabel: label,
            child: chip,
          );
  }
}

/// The placeholder identity mark used everywhere instead of photos.
///
/// A diagonal hatch rather than initials, so an unknown user never reads as a
/// specific person.
class BAvatarHatch extends StatelessWidget {
  const BAvatarHatch({required this.size, this.band, super.key});

  final double size;
  final double? band;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final w = band ?? (size <= 34 ? 3.0 : 4.0);
    return SizedBox(
      width: size,
      height: size,
      child: ClipOval(
        child: CustomPaint(
          // Both branches used to resolve to `c.hairline`, and the light
          // pair was 18% ink over 8% ink — a flat grey disc rather than a
          // hatch. Ink over paper reads as the stripes it is meant to be.
          painter: _HatchPainter(
            a: c.textPrimary.withValues(alpha: c.isDark ? 0.30 : 0.22),
            b: c.textPrimary.withValues(alpha: c.isDark ? 0.10 : 0.06),
            band: w,
          ),
        ),
      ),
    );
  }
}

class _HatchPainter extends CustomPainter {
  const _HatchPainter({required this.a, required this.b, required this.band});

  final Color a;
  final Color b;
  final double band;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = b);
    final paint = Paint()
      ..color = a
      ..strokeWidth = band
      ..style = PaintingStyle.stroke;
    // 135deg stripes at 2x band pitch, matching the CSS repeating gradient.
    final pitch = band * 2;
    for (double x = -size.height; x < size.width + size.height; x += pitch) {
      canvas.drawLine(
        Offset(x, 0),
        Offset(x + size.height, size.height),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_HatchPainter old) =>
      old.a != a || old.b != b || old.band != band;
}

/// The 42px rounded-square paper button: back, refresh, overflow, save.
class BSoftIconButton extends StatelessWidget {
  const BSoftIconButton({
    required this.icon,
    this.onTap,
    this.selected = false,
    this.size = 42,
    this.semanticLabel,
    this.onDark = false,
    super.key,
  });

  final IconData icon;
  final VoidCallback? onTap;

  /// When true the button inverts. Callers must also change the icon or the
  /// label — inversion alone is a colour-only state (spec §42).
  final bool selected;

  final double size;
  final String? semanticLabel;

  /// True when the button sits on the ink slab rather than on paper.
  ///
  /// The selected fill is [BarbarianColors.actionSurface], which on this
  /// palette is the ink itself. On the company header — an ink card — that
  /// made pressing "follow" turn a 42pt square the exact colour of the card
  /// behind it: 1.000:1, with a warm-ink shadow that is equally invisible
  /// there. The state change read as a rendering fault.
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final fill = onDark
        ? (selected ? c.onInk : c.onInk.withValues(alpha: 0.10))
        : (selected ? c.actionSurface : c.surface);
    final glyph = onDark
        ? (selected ? c.ink : c.onInk)
        : (selected ? c.onAction : c.textPrimary);

    return BPressable.icon(
      onTap: onTap,
      semanticLabel: semanticLabel,
      child: AnimatedContainer(
        duration: BarbarianMotion.fast,
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: fill,
          borderRadius: BorderRadius.circular(BarbarianRadius.sm),
          boxShadow: (c.isDark || onDark) ? null : BarbarianShadow.raised,
        ),
        child: Icon(icon, size: 18, color: glyph),
      ),
    );
  }
}

/// The 38px translucent circular control that sits on dark card surfaces.
class BDarkCircleButton extends StatelessWidget {
  const BDarkCircleButton({
    required this.icon,
    this.onTap,
    this.size = 38,
    this.semanticLabel,
    super.key,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final double size;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return BPressable.icon(
      onTap: onTap,
      semanticLabel: semanticLabel,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: c.onInk.withValues(alpha: 0.09),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 16, color: c.onInk),
      ),
    );
  }
}

/// The "showing data from N ago" banner, with a dot and a label.
class BStaleDataPill extends StatelessWidget {
  const BStaleDataPill(this.text, {this.tone, super.key});

  final String text;
  final Color? tone;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: tone ?? c.textMuted,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: BarbarianSpace.sm),
          // Flexible so the pill can shrink inside a tight row rather than
          // overflowing — it is laid out beside a staleness caption on a 390pt
          // phone, where the two together exceed the content width.
          Flexible(
            child: Text(
              text,
              style: BarbarianType.labelS.copyWith(color: c.textMuted),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

/// The loading placeholder.
///
/// The design is emphatic: **static dimmed blocks at 40%, no shimmer.** A
/// shimmer would be the only perpetual motion in the app.
class BSkeletonBlock extends StatelessWidget {
  const BSkeletonBlock({
    required this.height,
    this.width,
    this.radius = BarbarianRadius.xxs,
    super.key,
  });

  final double height;
  final double? width;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        // Not `hairline * 0.4`: hairline is already an 8% ink, so the block
        // landed at 3.2% — 1.06:1 against the card, i.e. nothing.
        color: c.textPrimary.withValues(alpha: c.isDark ? 0.12 : 0.08),
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}
