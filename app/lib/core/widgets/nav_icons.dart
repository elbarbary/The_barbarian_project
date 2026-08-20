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
enum BNavIcon { home, today, research, you }

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
      case BNavIcon.home:
        _home(canvas, fill, stroke);
      case BNavIcon.today:
        _today(canvas, fill, stroke);
      case BNavIcon.research:
        _research(canvas, fill, stroke);
      case BNavIcon.you:
        _you(canvas, fill, stroke);
    }

    canvas.restore();
  }

  /// The board's home mark: a rounded body with a smaller cap above it.
  ///
  /// Transcribed from the board's own SVG — `rect x=3 y=8 w=14 h=9 rx=3` and
  /// `rect x=7 y=3 w=6 h=4 rx=2` on a 20x20 viewBox — and scaled onto this
  /// file's 24 grid by 1.2. The cap is drawn at reduced opacity exactly as the
  /// board draws it, which is what separates the two shapes without a stroke
  /// between them.
  void _home(Canvas canvas, Paint Function(double) fill,
      Paint Function(double, double) stroke) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(3.6, 9.6, 16.8, 10.8),
        const Radius.circular(3.6),
      ),
      fill(1),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(8.4, 3.6, 7.2, 4.8),
        const Radius.circular(2.4),
      ),
      fill(0.55),
    );
  }

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
