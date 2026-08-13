import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../theme/barbarian_theme.dart';

/// The website's living gradient, behind everything.
///
/// Five soft orbs — blue, violet, rose, lime, cyan — drifting slowly over a
/// cool near-white ground, blurred and multiplied together. On the site this is
/// `.canvas` with five `.orb` spans at `mix-blend-mode: multiply`, a 30px blur
/// and a 120% saturation lift.
///
/// It is not decoration. Every surface above it is translucent white glass, and
/// glass over a flat colour is just a lighter rectangle — the gradient is what
/// gives the frosting something to refract.
class BLivingCanvas extends StatefulWidget {
  const BLivingCanvas({this.animate = true, super.key});

  /// Off for tests and for reduced-motion, where a static field is enough.
  final bool animate;

  @override
  State<BLivingCanvas> createState() => _BLivingCanvasState();
}

class _BLivingCanvasState extends State<BLivingCanvas>
    with SingleTickerProviderStateMixin {
  late final AnimationController _drift = AnimationController(
    vsync: this,
    // One slow cycle. The site's orbs run on 19–28s alternating loops; a single
    // long period with different phases per orb reads the same and costs one
    // ticker instead of five.
    duration: const Duration(seconds: 48),
  );

  @override
  void initState() {
    super.initState();
    if (widget.animate) _drift.repeat();
  }

  @override
  void dispose() {
    _drift.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final still = !widget.animate || MediaQuery.disableAnimationsOf(context);

    return IgnorePointer(
      child: DecoratedBox(
        decoration: BoxDecoration(gradient: c.pageGradient),
        child: RepaintBoundary(
          child: ImageFiltered(
            imageFilter: ui.ImageFilter.blur(sigmaX: 34, sigmaY: 34),
            child: still
                ? CustomPaint(
                    painter: _OrbPainter(phase: 0.18, colors: c),
                    child: const SizedBox.expand(),
                  )
                : AnimatedBuilder(
                    animation: _drift,
                    builder: (context, _) => CustomPaint(
                      painter: _OrbPainter(phase: _drift.value, colors: c),
                      child: const SizedBox.expand(),
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}

class _OrbPainter extends CustomPainter {
  const _OrbPainter({required this.phase, required this.colors});

  final double phase;
  final BarbarianColors colors;

  /// The site's own orbs: (colour, diameter as a fraction of the short edge,
  /// anchor, drift amplitude, phase offset).
  List<(Color, double, Alignment, double, double)> get _orbs {
    final dark = colors.isDark;
    // On dark the orbs are the only colour in the field, so they are deeper
    // and dimmer rather than pastel — a pastel wash would grey the whole app.
    Color pick(Color light, Color darkTone) => dark ? darkTone : light;

    return [
      (pick(const Color(0xFF9EC0FF), const Color(0xFF2A3A8F)), 1.15, Alignment.topLeft, 0.06, 0.00),
      (pick(const Color(0xFFD3BCFF), const Color(0xFF442E7A)), 1.02, Alignment.topRight, 0.07, 0.28),
      (pick(const Color(0xFFFFB6DA), const Color(0xFF6E2350)), 0.98, Alignment.bottomLeft, 0.05, 0.55),
      (pick(const Color(0xFFDBF29C), const Color(0xFF4A5520)), 0.70, Alignment.center, 0.08, 0.74),
      (pick(const Color(0xFFA7ECF5), const Color(0xFF16505C)), 0.86, Alignment.bottomRight, 0.06, 0.90),
    ];
  }

  @override
  void paint(Canvas canvas, Size size) {
    final short = math.min(size.width, size.height);
    // Multiply is what makes the overlaps deepen instead of washing out — the
    // same blend the site uses. On dark it has to be plus/screen instead, or
    // every orb multiplies to black.
    final blend = colors.isDark ? BlendMode.plus : BlendMode.multiply;

    canvas.saveLayer(Offset.zero & size, Paint());
    for (final (color, scale, anchor, amplitude, offset) in _orbs) {
      final t = (phase + offset) % 1.0;
      final angle = t * 2 * math.pi;
      final radius = short * scale / 2;
      final centre =
          anchor.alongSize(size) +
          Offset(
            math.cos(angle) * short * amplitude,
            math.sin(angle * 0.8) * short * amplitude,
          );

      canvas.drawCircle(
        centre,
        radius,
        Paint()
          ..blendMode = blend
          ..shader = ui.Gradient.radial(centre, radius, [
            color.withValues(alpha: colors.isDark ? 0.55 : 0.72),
            color.withValues(alpha: 0),
          ], const [0.0, 0.68]),
      );
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_OrbPainter old) =>
      old.phase != phase || old.colors.brightness != colors.brightness;
}
