import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/barbarian_theme.dart';
import 'text.dart';

/// How the blades fill.
enum BGaugeMode {
  /// West-anchored, like the boards: blade 0 lights first and the arc fills
  /// clockwise. Correct for a bounded range with no meaningful midpoint —
  /// a 52-week price range, a rubric score out of 13.
  fromStart,

  /// Centre-anchored: nothing is lit at zero, positives grow clockwise from
  /// the top and negatives grow anticlockwise.
  ///
  /// Required for the Cash or Trash verdict, whose scale is **signed**
  /// (−60..+60 across six pillars). Feeding a signed score to [fromStart]
  /// would draw −50 as a left-hand stub that reads like a small positive
  /// score, which would misrepresent published research.
  fromCentre,
}

/// The 56-blade 180° tick gauge.
///
/// One [CustomPainter] inside a [RepaintBoundary], never 56 widgets: at 56
/// transformed children this would rebuild the whole subtree on every frame of
/// the fill animation.
///
/// Geometry, transcribed from the boards:
///  * box is `size × (size / 2 + 46)`, pivot at `(size / 2, height − 22)`
///  * blade *i* sits at `−90° + i × 180/55`, so `i = 0` is due west and
///    `i = 55` is due east
///  * because 56 is even there is **no centre blade** — the vertical axis falls
///    between `i = 27` and `i = 28`, which is where the zero marker goes
///  * each blade is a `2 × round(size × 0.145)` rounded rect at the far end of
///    a `size / 2` rod, not a radial line from the pivot
class BArcGauge extends StatefulWidget {
  const BArcGauge({
    required this.size,
    required this.value,
    required this.min,
    required this.max,
    required this.big,
    required this.caption,
    required this.lowLabel,
    required this.highLabel,
    this.mode = BGaugeMode.fromStart,
    this.litColor,
    this.onDark = true,
    this.animate = true,
    super.key,
  });

  /// How far the arc's pivot sits above the bottom of the box.
  ///
  /// Shared by the painter and the label layout so the reading stays put inside
  /// the bowl at any [size]. The two used to carry the number separately, and
  /// the labels were anchored 24pt above the pivot — which pushed the reading up
  /// into the blades and left the bottom of the bowl empty.
  static const double pivotInset = 22;

  final double size;
  final double value;
  final double min;
  final double max;

  /// Pre-formatted so the gauge never guesses at decimal places or grouping.
  final String big;

  final String caption;
  final String lowLabel;
  final String highLabel;
  final BGaugeMode mode;
  final Color? litColor;
  final bool onDark;
  final bool animate;

  static const int bladeCount = 56;

  @override
  State<BArcGauge> createState() => _BArcGaugeState();
}

class _BArcGaugeState extends State<BArcGauge>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  /// The last blade starts at `(lit − 1) × 9ms` and runs 220ms.
  static const Duration _total = Duration(
    milliseconds: 220 + (BArcGauge.bladeCount - 1) * 9,
  );

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: _total);
    if (widget.animate) {
      _controller.forward();
    } else {
      _controller.value = 1;
    }
  }

  @override
  void didUpdateWidget(BArcGauge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value && widget.animate) {
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final height = widget.size / 2 + 46;
    // The boards' gauge is ember and always sits on the ink slab, where a lit
    // blade against a 16%-bone track clears the 3:1 a meter needs — 3.24:1 for
    // the boards' own #E8621C, 4.49:1 for the lifted #FF8340 used here.
    //
    // On paper the same ember cannot get there. The accent is light enough
    // that NO ink-alpha track clears 3:1 against it: the best available is
    // 2.63:1, and a darker track makes it worse rather than better. A meter
    // whose two halves are 2.6:1 apart is decoration, so on paper the default
    // lit blade is ink.
    final lit =
        widget.litColor ?? (widget.onDark ? c.accentOnInk : c.textPrimary);
    final unlit = widget.onDark
        ? c.onInk.withValues(alpha: 0.16)
        : c.textPrimary.withValues(alpha: 0.10);
    final fg = widget.onDark ? c.onInk : c.textPrimary;
    final muted = widget.onDark ? c.onInkMuted : c.textMuted;

    final reduceMotion = MediaQuery.disableAnimationsOf(context);

    return Semantics(
      label: '${widget.caption}: ${widget.big}, '
          'range ${widget.lowLabel} to ${widget.highLabel}',
      excludeSemantics: true,
      // The gauge is a chart of Latin numerals; it never mirrors.
      child: Directionality(
        textDirection: TextDirection.ltr,
        child: SizedBox(
          width: widget.size,
          height: height,
          child: Stack(
            children: [
              Positioned.fill(
                child: RepaintBoundary(
                  child: AnimatedBuilder(
                    animation: _controller,
                    builder: (context, _) => CustomPaint(
                      painter: _ArcGaugePainter(
                        progress: reduceMotion ? 1 : _controller.value,
                        totalMs: _total.inMilliseconds.toDouble(),
                        size: widget.size,
                        value: widget.value,
                        min: widget.min,
                        max: widget.max,
                        mode: widget.mode,
                        lit: lit,
                        unlit: unlit,
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                // Seated just above the arc's own centre line, so the reading
                // and its caption sit in the middle of the bowl rather than
                // riding up against the blades.
                bottom: BArcGauge.pivotInset + 4,
                left: 0,
                right: 0,
                child: Column(
                  children: [
                    BNumText(
                      widget.big,
                      style: TextStyle(
                        fontFamily: BarbarianType.display,
                        fontSize: (widget.size * 0.2).roundToDouble(),
                        height: 1,
                        fontWeight: FontWeight.w200,
                        fontVariations: const [FontVariation('wght', 200)],
                        letterSpacing: widget.size * 0.2 * -0.03,
                        fontFeatures: const [FontFeature.tabularFigures()],
                        color: fg,
                      ),
                      isolate: false,
                    ),
                    const SizedBox(height: 7),
                    Text(
                      widget.caption.toUpperCase(),
                      style: BarbarianType.labelTiny.copyWith(color: muted),
                    ),
                  ],
                ),
              ),
              Positioned(
                left: 2,
                bottom: 0,
                child: BNumText(
                  widget.lowLabel,
                  style: BarbarianType.labelNano.copyWith(
                    color: muted,
                    letterSpacing: 0,
                  ),
                  isolate: false,
                ),
              ),
              Positioned(
                right: 2,
                bottom: 0,
                child: BNumText(
                  widget.highLabel,
                  style: BarbarianType.labelNano.copyWith(
                    color: muted,
                    letterSpacing: 0,
                  ),
                  isolate: false,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ArcGaugePainter extends CustomPainter {
  const _ArcGaugePainter({
    required this.progress,
    required this.totalMs,
    required this.size,
    required this.value,
    required this.min,
    required this.max,
    required this.mode,
    required this.lit,
    required this.unlit,
  });

  final double progress;
  final double totalMs;
  final double size;
  final double value;
  final double min;
  final double max;
  final BGaugeMode mode;
  final Color lit;
  final Color unlit;

  static const int _n = BArcGauge.bladeCount;

  /// Which blades are lit, and in what order they light.
  ///
  /// Returned as a map of blade index to its position in the fill sequence, so
  /// the stagger runs outward from wherever the fill starts rather than always
  /// from the west.
  Map<int, int> _litBlades() {
    final result = <int, int>{};

    switch (mode) {
      case BGaugeMode.fromStart:
        final span = max - min;
        final ratio = span == 0 ? 0.0 : ((value - min) / span).clamp(0.0, 1.0);
        final count = (_n * ratio).round();
        for (var i = 0; i < count; i++) {
          result[i] = i;
        }

      case BGaugeMode.fromCentre:
        // 28 blades per side; zero sits between index 27 and 28.
        const half = _n ~/ 2;
        if (value > 0 && max > 0) {
          final count = (half * (value / max).clamp(0.0, 1.0)).round();
          for (var k = 0; k < count; k++) {
            result[half + k] = k;
          }
        } else if (value < 0 && min < 0) {
          final count = (half * (value / min).clamp(0.0, 1.0)).round();
          for (var k = 0; k < count; k++) {
            result[half - 1 - k] = k;
          }
        }
    }

    return result;
  }

  @override
  void paint(Canvas canvas, Size canvasSize) {
    final pivot = Offset(size / 2, canvasSize.height - BArcGauge.pivotInset);
    final rod = size / 2;
    final tick = (size * 0.145).roundToDouble();
    final litBlades = _litBlades();

    for (var i = 0; i < _n; i++) {
      final degrees = -90 + i * 180 / (_n - 1);
      final radians = degrees * math.pi / 180;

      // The blade occupies the far end of the rod, from `rod - tick` to `rod`.
      final direction = Offset(math.sin(radians), -math.cos(radians));
      final centre = pivot + direction * (rod - tick / 2);

      final order = litBlades[i];
      final Color color;
      if (order == null) {
        color = unlit;
      } else {
        // Each blade runs its own 220ms lerp, delayed 9ms behind the last.
        final start = order * 9 / totalMs;
        final end = (order * 9 + 220) / totalMs;
        final t = ((progress - start) / (end - start)).clamp(0.0, 1.0);
        color = Color.lerp(unlit, lit, Curves.easeOut.transform(t))!;
      }

      canvas
        ..save()
        ..translate(centre.dx, centre.dy)
        ..rotate(radians);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(center: Offset.zero, width: 2, height: tick),
          const Radius.circular(1),
        ),
        Paint()..color = color,
      );
      canvas.restore();
    }

    // In signed mode the origin must be visible, otherwise an empty gauge and
    // a gauge at exactly zero are indistinguishable from a small one.
    if (mode == BGaugeMode.fromCentre) {
      final marker = Paint()
        ..color = unlit
        ..strokeWidth = 1
        ..strokeCap = StrokeCap.round;
      canvas.drawLine(
        pivot + const Offset(0, -1) * (rod - tick - 6),
        pivot + const Offset(0, -1) * (rod - tick - 1),
        marker,
      );
    }
  }

  @override
  bool shouldRepaint(_ArcGaugePainter old) =>
      old.progress != progress ||
      old.value != value ||
      old.min != min ||
      old.max != max ||
      old.mode != mode ||
      old.lit != lit ||
      old.unlit != unlit;
}
