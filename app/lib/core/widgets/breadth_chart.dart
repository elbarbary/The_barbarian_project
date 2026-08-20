import 'package:flutter/material.dart';

import '../models/market_history.dart';
import '../theme/barbarian_theme.dart';

/// How many shares rose, fell and did not move, session by session.
///
/// Three lines against one scale, and the scale is the number of shares that
/// were counted — not the tallest line. That matters: on a scale of its own the
/// "unchanged" line would look as large as the other two, when what it actually
/// says is that a sixth of the market did not trade meaningfully. A shared
/// denominator is the whole point of a breadth chart.
///
/// The series is accumulated one session at a time because nobody publishes a
/// breadth history for this exchange. One session draws one dot, which is
/// honest about what we hold.
class BBreadthChart extends StatelessWidget {
  const BBreadthChart({required this.sessions, this.height = 150, super.key});

  final List<MarketSession> sessions;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final rows = [
      for (final s in sessions)
        if (s.breadth case final MarketBreadth b when !b.isEmpty) (s.date, b),
    ];
    if (rows.isEmpty) return SizedBox(height: height);

    // The denominator is the largest count of shares seen, so a session where
    // fewer companies reported does not stretch the chart.
    final scale = rows
        .map((r) => r.$2.counted)
        .reduce((a, b) => a > b ? a : b)
        .toDouble();

    return Semantics(
      label: rows.length == 1
          ? 'One session: ${rows.last.$2.up} rose, ${rows.last.$2.down} fell, '
                '${rows.last.$2.flat} unchanged'
          : '${rows.length} sessions of market breadth',
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: RepaintBoundary(
          child: CustomPaint(
            painter: _BreadthPainter(
              rows: [for (final r in rows) r.$2],
              scale: scale,
              up: c.up,
              down: c.down,
              // Grey, and deliberately not a third hue: "unchanged" is the
              // absence of a move, and giving it a colour of its own would
              // make it read as a third outcome competing with the other two.
              flat: c.textFaint,
              grid: c.hairline,
            ),
          ),
        ),
      ),
    );
  }
}

class _BreadthPainter extends CustomPainter {
  const _BreadthPainter({
    required this.rows,
    required this.scale,
    required this.up,
    required this.down,
    required this.flat,
    required this.grid,
  });

  final List<MarketBreadth> rows;
  final double scale;
  final Color up;
  final Color down;
  final Color flat;
  final Color grid;

  @override
  void paint(Canvas canvas, Size size) {
    if (scale <= 0) return;

    canvas.drawLine(
      Offset(0, size.height),
      Offset(size.width, size.height),
      Paint()
        ..color = grid
        ..strokeWidth = 1,
    );

    double y(int value) => size.height - (value / scale) * size.height;
    double x(int i) =>
        rows.length == 1 ? size.width / 2 : (i / (rows.length - 1)) * size.width;

    void series(int Function(MarketBreadth) pick, Color colour) {
      final paint = Paint()
        ..color = colour
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke;

      if (rows.length == 1) {
        // A single session is a point, not a line. Drawing a flat rule across
        // the width would imply a run of sessions we have not recorded.
        canvas.drawCircle(
          Offset(x(0), y(pick(rows.first))),
          3.5,
          Paint()..color = colour,
        );
        return;
      }
      final path = Path();
      for (var i = 0; i < rows.length; i++) {
        final point = Offset(x(i), y(pick(rows[i])));
        i == 0 ? path.moveTo(point.dx, point.dy) : path.lineTo(point.dx, point.dy);
      }
      canvas.drawPath(path, paint);
    }

    series((b) => b.flat, flat);
    series((b) => b.down, down);
    series((b) => b.up, up);
  }

  @override
  bool shouldRepaint(_BreadthPainter old) =>
      old.rows.length != rows.length || old.scale != scale;
}
