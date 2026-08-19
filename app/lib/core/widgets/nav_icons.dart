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
enum BNavIcon { home, market, pit, you }

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
      case BNavIcon.market:
        _market(canvas, fill, stroke);
      case BNavIcon.pit:
        _pit(canvas, fill, stroke);
      case BNavIcon.you:
        _you(canvas, fill, stroke);
    }

    canvas.restore();
  }

  /// A roof over a body, with the eaves swept rather than mitred.
  void _home(Canvas canvas, Paint Function(double) fill, Paint Function(double, double) stroke) {
    final roof = Path()
      ..moveTo(2.4, 10.6)
      ..cubicTo(2.4, 9.8, 2.8, 9.1, 3.4, 8.7)
      ..lineTo(10.6, 3.4)
      ..cubicTo(11.4, 2.8, 12.6, 2.8, 13.4, 3.4)
      ..lineTo(20.6, 8.7)
      ..cubicTo(21.2, 9.1, 21.6, 9.8, 21.6, 10.6)
      ..lineTo(21.6, 18.4)
      ..cubicTo(21.6, 19.8, 20.5, 20.9, 19.1, 20.9)
      ..lineTo(4.9, 20.9)
      ..cubicTo(3.5, 20.9, 2.4, 19.8, 2.4, 18.4)
      ..close();
    // The doorway is a subpath of the house under even-odd fill, not a hole
    // erased afterwards. BlendMode.clear writes transparency into whatever
    // layer happens to be current, so the doorway only read as a doorway while
    // the nav bar allocated its own layer to be cleared into. Even-odd is a
    // property of the path, so the mark is the same shape wherever it is drawn.
    final house = Path()
      ..fillType = PathFillType.evenOdd
      ..addPath(roof, Offset.zero)
      ..moveTo(9.6, 20.9)
      ..lineTo(9.6, 15.4)
      ..cubicTo(9.6, 14.5, 10.3, 13.8, 11.2, 13.8)
      ..lineTo(12.8, 13.8)
      ..cubicTo(13.7, 13.8, 14.4, 14.5, 14.4, 15.4)
      ..lineTo(14.4, 20.9)
      ..close();
    canvas.drawPath(house, fill(1));
  }

  /// Three columns on a shared baseline, with the tallest carrying a marker —
  /// a chart, not three loose bars.
  void _market(Canvas canvas, Paint Function(double) fill, Paint Function(double, double) stroke) {
    void column(double x, double top) => canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTRB(x, top, x + 3.6, 19.2),
        const Radius.circular(1.8),
      ),
      fill(1),
    );

    column(3.4, 12.6);
    column(10.2, 8.4);
    column(17.0, 4.2);

    // Baseline, lighter, so the columns sit on something.
    canvas.drawLine(
      const Offset(2.6, 20.9),
      const Offset(21.4, 20.9),
      stroke(1.6, 0.45),
    );
  }

  /// Two bubbles in conversation: one solid, one behind it and lighter.
  void _pit(Canvas canvas, Paint Function(double) fill, Paint Function(double, double) stroke) {
    final back = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          const Rect.fromLTRB(9.0, 3.2, 21.4, 13.4),
          const Radius.circular(4.2),
        ),
      );
    canvas.drawPath(back, fill(0.42));

    final front = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          const Rect.fromLTRB(2.6, 7.6, 15.6, 18.4),
          const Radius.circular(4.4),
        ),
      );
    // The tail, so it reads as speech rather than a card.
    final tail = Path()
      ..moveTo(6.2, 17.6)
      ..lineTo(6.2, 21.4)
      ..lineTo(10.4, 18.2)
      ..close();
    canvas.drawPath(Path.combine(PathOperation.union, front, tail), fill(1));
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
