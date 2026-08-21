import 'package:flutter/material.dart';

import '../theme/barbarian_theme.dart';

/// The 34pt sparkline inside a watchlist tile.
///
/// Stroke only — no fill — at 1.6pt, coloured by direction, exactly as the
/// canvas draws it.
///
/// **Long series are averaged down to the width available.** Suez traffic is
/// 400 daily readings and a card gives it 76 points of width, so every pixel
/// was carrying five sessions and the result read as a band of noise rather
/// than a trend — a chart that is technically the data and tells you nothing.
/// A price series capped at six years has the same problem.
///
/// Averaging rather than sampling every nth point, because sampling would let
/// a single unusual session stand in for a fortnight while averaging lets it
/// register at its real weight.
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

  /// Two points of width per drawn point, so a stroke has room to be a line
  /// rather than a smear. Below this the chart is denser than the screen.
  static const double _pointsPerSample = 2.0;

  /// The series reduced to what the given width can actually show.
  ///
  /// The first and last readings always survive: they are the ones the card
  /// prints beside the chart, and a shape whose ends disagree with the numbers
  /// next to it is worse than no shape.
  static List<double> downsample(List<double> values, double width) {
    final room = (width / _pointsPerSample).floor();
    if (room < 2 || values.length <= room) return values;

    final bucket = values.length / room;
    final out = <double>[];
    for (var i = 0; i < room; i++) {
      final from = (i * bucket).floor();
      final to = ((i + 1) * bucket).ceil().clamp(from + 1, values.length);
      var sum = 0.0;
      for (var j = from; j < to; j++) {
        sum += values[j];
      }
      out.add(sum / (to - from));
    }
    out[0] = values.first;
    out[out.length - 1] = values.last;
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (values.length < 2) return SizedBox(height: height);

    final rising = values.last >= values.first;
    return Semantics(
      // The stroke's colour is the only thing on screen saying which way the
      // series went, and forest against brick is 1.03:1. Nothing here can
      // carry a glyph, so the description carries it — the direction only,
      // because every caller already prints the figure beside the chart and a
      // reader should not hear the same move twice.
      label: '${values.length}-session trend, ${rising ? 'rising' : 'falling'}',
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: RepaintBoundary(
          child: LayoutBuilder(
            builder: (context, constraints) => CustomPaint(
              painter: _AreaPainter(
                values: downsample(
                  values,
                  constraints.maxWidth.isFinite ? constraints.maxWidth : 120,
                ),
                line: color ?? (rising ? c.up : c.down),
                fillTop: null,
                fillBottom: null,
                strokeWidth: 1.6,
                padding: 3,
              ),
            ),
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
