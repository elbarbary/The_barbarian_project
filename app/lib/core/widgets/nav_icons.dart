import 'package:flutter/material.dart';

/// The four navigation marks, drawn as vectors.
///
/// The canvas expresses them as plain rectangles and circles, which read as
/// placeholder geometry at 21pt. These keep the same silhouettes but are drawn
/// properly: continuous curves instead of stacked boxes, optically balanced
/// weights so all four look the same size, and a secondary element at reduced
/// opacity so each mark has depth rather than being one flat blob.
///
/// Everything is authored on a 24x24 grid and scaled, so a size change never
/// shifts the alignment between them.
enum BNavIcon { ask, today, research, you }

class BNavIconPainter extends CustomPainter {
  const BNavIconPainter({required this.icon, required this.color});

  final BNavIcon icon;
  final Color color;

  static const double _grid = 24;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / _grid;
    canvas.save();
    canvas.scale(s);

    Paint fill(double opacity) => Paint()
      ..color = color.withValues(alpha: color.a * opacity)
      ..isAntiAlias = true
      ..style = PaintingStyle.fill;

    Paint stroke(double width, double opacity) => Paint()
      ..color = color.withValues(alpha: color.a * opacity)
      ..isAntiAlias = true
      ..style = PaintingStyle.stroke
      ..strokeWidth = width
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    switch (icon) {
      case BNavIcon.ask:
        _ask(canvas, fill, stroke);
      case BNavIcon.today:
        _today(canvas, fill, stroke);
      case BNavIcon.research:
        _research(canvas, fill, stroke);
      case BNavIcon.you:
        _you(canvas, fill, stroke);
    }

    canvas.restore();
  }

  /// A magnifier: the question, not a house.
  ///
  /// Transcribed from the board at 20×20 and scaled onto this file's 24 grid —
  /// `circle cx=8.6 cy=8.6 r=5.6 stroke-width=1.7`, handle a rounded bar at
  /// 45°. The board mirrors the whole mark with `scaleX(-1)` because its nav
  /// runs right to left; drawn here unmirrored the handle falls bottom-right,
  /// where a Latin reader expects it. Mirroring is what `Directionality` will
  /// do to the bar when the Arabic pass lands, so nothing here fixes a side.
  void _ask(Canvas canvas, Paint Function(double) fill, Paint Function(double, double) stroke) {
    canvas.drawCircle(const Offset(10.32, 10.32), 6.72, stroke(2.04, 1));
    // From the lens edge along the diagonal — centre + r/√2 — so the handle
    // meets the circle instead of crossing it.
    canvas.drawLine(
      const Offset(15.07, 15.07),
      const Offset(20.6, 20.6),
      stroke(2.16, 1)..strokeCap = StrokeCap.round,
    );
  }

  /// A bulletin: a sheet with two lines set on it, the second lighter.
  ///
  /// The board's `rect 3,3.5 14×13 r2.6` with bars at 6.6 and 10, the lower at
  /// 50% — a page with a headline and one line under it, which is what Today
  /// publishes on the days it has anything to publish.
  void _today(Canvas canvas, Paint Function(double) fill, Paint Function(double, double) stroke) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTRB(3.6, 4.2, 20.4, 19.8),
        const Radius.circular(3.12),
      ),
      stroke(1.92, 1),
    );
    void bar(double top, double opacity) => canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(6.96, top, 10.08, 1.8),
        const Radius.circular(0.9),
      ),
      fill(opacity),
    );
    bar(7.92, 1);
    bar(12, 0.5);
  }

  /// Three bars, ascending — the mark the board gives the studies list, and
  /// the one this file used for Market before Market stopped being a place.
  ///
  /// The baseline the old version drew is gone: the board has none, and three
  /// rounded bars read as a chart without a rule under them.
  void _research(Canvas canvas, Paint Function(double) fill, Paint Function(double, double) stroke) {
    void bar(double x, double top) => canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTRB(x, top, x + 4.08, 20.4),
        const Radius.circular(2.04),
      ),
      fill(1),
    );

    bar(3.6, 13.2);
    bar(9.96, 8.4);
    bar(16.32, 3.6);
  }

  /// Head and shoulders, with the shoulders an arc rather than a slab.
  void _you(Canvas canvas, Paint Function(double) fill, Paint Function(double, double) stroke) {
    canvas.drawCircle(const Offset(12, 8.2), 4.3, fill(1));

    final shoulders = Path()
      ..moveTo(3.9, 21.2)
      ..cubicTo(3.9, 17.0, 7.5, 14.4, 12.0, 14.4)
      ..cubicTo(16.5, 14.4, 20.1, 17.0, 20.1, 21.2)
      ..close();
    canvas.drawPath(shoulders, fill(0.62));
  }

  @override
  bool shouldRepaint(BNavIconPainter old) =>
      old.icon != icon || old.color != color;
}

/// Renders a nav mark.
///
/// It needs no layer of its own: the home mark's doorway is a subpath under
/// even-odd fill rather than a hole erased into whatever layer happens to be
/// current, so the icon is the same shape wherever it is drawn.
class BNavIconMark extends StatelessWidget {
  const BNavIconMark({
    required this.icon,
    required this.color,
    this.size = 22,
    super.key,
  });

  final BNavIcon icon;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: BNavIconPainter(icon: icon, color: color),
      ),
    );
  }
}
