import 'package:flutter/material.dart';

import '../../core/models/company.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/text.dart';

/// Selectable history windows (spec §13).
enum PriceRange {
  m1('1M', 22),
  m3('3M', 66),
  y1('1Y', 250),
  y5('5Y', 1250),
  max('MAX', null);

  const PriceRange(this.label, this.sessions);

  final String label;

  /// Approximate EGX sessions in the window; null means everything held.
  final int? sessions;

  List<PricePoint> apply(List<PricePoint> points) {
    final n = sessions;
    if (n == null || points.length <= n) return points;
    return points.sublist(points.length - n);
  }
}

/// The end-of-day price line.
///
/// Drawn rather than charted: the design's charts carry no axes, no grid and no
/// tooltip, so a chart library would spend its configuration surface being
/// switched off. This is a closed area path plus a stroked polyline, which is
/// exactly what the canvas specifies.
class BPriceChart extends StatelessWidget {
  const BPriceChart({
    required this.points,
    this.height = 168,
    this.onDark = false,
    this.session,
    super.key,
  });

  final List<PricePoint> points;
  final double height;
  final bool onDark;

  /// The latest session's own bar. Used when no series exists for this
  /// company — 26 EGX listings have a full trading day but no history from
  /// either source, and one real session beats an empty panel.
  final CompanyMarket? session;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    if (points.length < 2) {
      final s = session;
      if (s != null && s.high != null && s.low != null && s.high! > s.low!) {
        return _SessionRange(session: s, height: height);
      }
      return SizedBox(
        height: height,
        child: Center(
          child: Text(
            'No price history available for this company',
            style: BarbarianType.bodyS.copyWith(color: c.textFaint),
          ),
        ),
      );
    }

    final closes = points.map((p) => p.close).toList();
    final low = closes.reduce((a, b) => a < b ? a : b);
    final high = closes.reduce((a, b) => a > b ? a : b);
    final first = closes.first;
    final last = closes.last;
    final rising = last >= first;
    final line = rising ? c.up : c.down;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          label:
              'Price history, ${points.length} sessions, '
              'from ${first.toStringAsFixed(2)} to ${last.toStringAsFixed(2)}, '
              'low ${low.toStringAsFixed(2)}, high ${high.toStringAsFixed(2)}',
          excludeSemantics: true,
          child: SizedBox(
            height: height,
            child: RepaintBoundary(
              child: CustomPaint(
                painter: _PriceLinePainter(
                  closes: closes,
                  line: line,
                  fillTop: line.withValues(alpha: 0.20),
                  fillBottom: line.withValues(alpha: 0),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            _Bound(label: 'Low', value: low),
            const Spacer(),
            _Bound(label: 'High', value: high, alignEnd: true),
          ],
        ),
      ],
    );
  }
}

/// One session drawn as a range: the day's low-to-high track, with the open
/// and the close marked on it. Real data, and honest about being one day.
class _SessionRange extends StatelessWidget {
  const _SessionRange({required this.session, required this.height});

  final CompanyMarket session;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final low = session.low!;
    final high = session.high!;
    final close = session.lastClose ?? high;
    final open = session.open ?? close;
    final span = high - low;
    double at(double v) => span == 0 ? 0.5 : (v - low) / span;
    final rising = close >= open;
    final tone = rising ? c.up : c.down;

    return SizedBox(
      height: height,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            "Latest session only — no series published for this listing",
            style: BarbarianType.bodyS.copyWith(color: c.textFaint),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          LayoutBuilder(
            builder: (context, box) => SizedBox(
              height: 34,
              child: Stack(
                alignment: Alignment.centerLeft,
                children: [
                  Container(
                    height: 6,
                    decoration: BoxDecoration(
                      color: c.hairline,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                  // Open-to-close body, so direction is visible.
                  PositionedDirectional(
                    start: box.maxWidth * at(rising ? open : close),
                    width: (box.maxWidth * (at(close) - at(open)).abs()).clamp(
                      3.0,
                      box.maxWidth,
                    ),
                    child: Container(
                      height: 6,
                      decoration: BoxDecoration(
                        color: tone,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                  PositionedDirectional(
                    start: (box.maxWidth * at(close) - 6).clamp(
                      0.0,
                      box.maxWidth - 12,
                    ),
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: tone,
                        shape: BoxShape.circle,
                        border: Border.all(color: c.surface, width: 2.5),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _Bound(label: 'Low', value: low),
              _Bound(label: 'Open', value: open),
              _Bound(label: 'Close', value: close),
              _Bound(label: 'High', value: high, alignEnd: true),
            ],
          ),
        ],
      ),
    );
  }
}

class _Bound extends StatelessWidget {
  const _Bound({
    required this.label,
    required this.value,
    this.alignEnd = false,
  });

  final String label;
  final double value;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: alignEnd
          ? CrossAxisAlignment.end
          : CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: BarbarianType.labelTiny.copyWith(color: c.textFaint),
        ),
        const SizedBox(height: 3),
        BNumText(
          value.toStringAsFixed(2),
          style: BarbarianType.figureS.copyWith(color: c.textSecondary),
        ),
      ],
    );
  }
}

class _PriceLinePainter extends CustomPainter {
  const _PriceLinePainter({
    required this.closes,
    required this.line,
    required this.fillTop,
    required this.fillBottom,
  });

  final List<double> closes;
  final Color line;
  final Color fillTop;
  final Color fillBottom;

  @override
  void paint(Canvas canvas, Size size) {
    final low = closes.reduce((a, b) => a < b ? a : b);
    final high = closes.reduce((a, b) => a > b ? a : b);
    // A flat series would divide by zero; draw it down the middle instead.
    final span = high - low;
    final stepX = size.width / (closes.length - 1);

    double yFor(double value) {
      if (span == 0) return size.height / 2;
      // Leave 8px of headroom so the peak is not clipped by the stroke.
      final t = (value - low) / span;
      return size.height - 8 - t * (size.height - 16);
    }

    final path = Path()..moveTo(0, yFor(closes.first));
    for (var i = 1; i < closes.length; i++) {
      path.lineTo(i * stepX, yFor(closes[i]));
    }

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
          colors: [fillTop, fillBottom],
        ).createShader(Offset.zero & size),
    );

    canvas.drawPath(
      path,
      Paint()
        ..color = line
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeJoin = StrokeJoin.round
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_PriceLinePainter old) =>
      old.closes != closes || old.line != line;
}
