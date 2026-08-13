import 'package:flutter/material.dart';

import '../theme/barbarian_theme.dart';

/// The 34pt sparkline inside a watchlist tile.
///
/// Stroke only — no fill — at 1.6pt, coloured by direction, exactly as the
/// canvas draws it.
class BSparkline extends StatelessWidget {
  const BSparkline({
    required this.values,
    this.height = 34,
    this.color,
    super.key,
  });

  final List<double> values;
  final double height;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (values.length < 2) return SizedBox(height: height);

    final rising = values.last >= values.first;
    return SizedBox(
      height: height,
      width: double.infinity,
      child: RepaintBoundary(
        child: CustomPaint(
          painter: _AreaPainter(
            values: values,
            line: color ?? (rising ? c.up : c.down),
            fillTop: null,
            fillBottom: null,
            strokeWidth: 1.6,
            padding: 3,
          ),
        ),
      ),
    );
  }
}

class _AreaPainter extends CustomPainter {
  const _AreaPainter({
    required this.values,
    required this.line,
    required this.fillTop,
    required this.fillBottom,
    this.strokeWidth = 2,
    this.padding = 10,
  });

  final List<double> values;
  final Color line;
  final Color? fillTop;
  final Color? fillBottom;
  final double strokeWidth;
  final double padding;

  @override
  void paint(Canvas canvas, Size size) {
    final low = values.reduce((a, b) => a < b ? a : b);
    final high = values.reduce((a, b) => a > b ? a : b);
    final span = high - low;
    final stepX = size.width / (values.length - 1);

    double yFor(double v) {
      if (span == 0) return size.height / 2;
      final t = (v - low) / span;
      return size.height - padding - t * (size.height - padding * 2);
    }

    final path = Path()..moveTo(0, yFor(values.first));
    for (var i = 1; i < values.length; i++) {
      path.lineTo(i * stepX, yFor(values[i]));
    }

    if (fillTop != null && fillBottom != null) {
      final area = Path.from(path)
        ..lineTo(size.width, size.height)
        ..lineTo(0, size.height)
        ..close();
      canvas.drawPath(
        area,
        Paint()
          ..shader = LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [fillTop!, fillBottom!],
          ).createShader(Offset.zero & size),
      );
    }

    canvas.drawPath(
      path,
      Paint()
        ..color = line
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeJoin = StrokeJoin.round
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_AreaPainter old) =>
      old.values != values || old.line != line;
}
