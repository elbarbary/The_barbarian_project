import 'package:flutter/material.dart';

import '../models/explainer.dart';
import '../theme/barbarian_theme.dart';
import 'motion.dart';
import 'surfaces.dart';

/// A number with its meaning attached — the app's most-used surface.
///
/// Spec §6.2. The plain sentence is primary and the exact token sits under it
/// in small grey figures, dotted-underlined. Both are one tap from the
/// arithmetic. The token is never behind a toggle: hiding it talks down to the
/// reader, and somebody who reads `0.28× normal` under "traded 72% less than
/// its normal amount" for a fortnight has learned to read a tape without being
/// enrolled in anything.
///
/// This replaced a row that said `Relative volume    0.43×`. That row is the
/// product this app exists not to be: a true number that means nothing to the
/// person holding the phone.
class BPlainNumber extends StatelessWidget {
  const BPlainNumber({required this.explainer, this.last = false, super.key});

  final Explainer explainer;

  /// Suppresses the hairline under the last row in a group.
  final bool last;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return BPressable(
      onTap: () => showExplainer(context, explainer),
      scale: 0.995,
      semanticLabel:
          '${explainer.title}. ${explainer.plain} ${explainer.token}. '
          'Press for the arithmetic.',
      child: Container(
        padding: const EdgeInsets.fromLTRB(18, 15, 16, 15),
        foregroundDecoration: last ? null : BHairline.rowBottom(context),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    explainer.title,
                    style: BarbarianType.labelNano.copyWith(
                      color: c.textMuted,
                    ),
                  ),
                ),
                if (explainer.notability == Notability.notable)
                  _NotableTag(explainer: explainer),
              ],
            ),
            const SizedBox(height: 7),
            // The meaning, in the largest type in the row. This is the thing
            // being communicated; the figure is the evidence for it.
            Text(
              explainer.plain,
              style: BarbarianType.bodyL.copyWith(
                color: c.textPrimary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                // Dotted, because that is the app's one promise: anything
                // under a dotted rule opens into its own arithmetic.
                _DottedUnderline(
                  child: Text(
                    explainer.token,
                    style: BarbarianType.figureXs.copyWith(
                      color: c.textMuted,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  Icons.unfold_more_rounded,
                  size: 13,
                  color: c.textFaint,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// "Unusual", with the threshold that makes it so.
///
/// The app's whole permitted answer to "is this important?" — this figure is
/// outside the band it normally occupies, the band is published, and it is the
/// same band for all 282 companies. Never "a good sign", never "watch this".
class _NotableTag extends StatelessWidget {
  const _NotableTag({required this.explainer});

  final Explainer explainer;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: c.accent.withValues(alpha: c.isDark ? 0.20 : 0.14),
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
      ),
      child: Text(
        Notability.notable.label.toUpperCase(),
        style: BarbarianType.labelNano.copyWith(
          color: BarbarianPalette.onWash(c, c.accent),
        ),
      ),
    );
  }
}

class _DottedUnderline extends StatelessWidget {
  const _DottedUnderline({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      foregroundPainter: _DottedPainter(context.colors.textFaint),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 3),
        child: child,
      ),
    );
  }
}

class _DottedPainter extends CustomPainter {
  const _DottedPainter(this.colour);

  final Color colour;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = colour
      ..strokeWidth = 1
      ..strokeCap = StrokeCap.round;
    for (var x = 0.0; x < size.width; x += 3) {
      canvas.drawLine(
        Offset(x, size.height - 0.5),
        Offset(x + 1, size.height - 0.5),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_DottedPainter old) => old.colour != colour;
}

/// Opens the explainer over whatever the reader was looking at.
///
/// A sheet and never a route: spec §4.18 is explicit that it must never lose
/// the reader's place. Drag to dismiss, no close button, nothing to navigate
/// back from.
Future<void> showExplainer(BuildContext context, Explainer explainer) {
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (context) => BExplainerSheet(explainer: explainer),
  );
}

/// The four fixed parts, in this order, always (spec §4.18).
///
/// Fixed order matters more than it looks: a reader who opens twenty of these
/// learns where the arithmetic is, and stops having to hunt for it. Meaning,
/// then the sum with real inputs, then the yardstick, then the receipt.
class BExplainerSheet extends StatelessWidget {
  const BExplainerSheet({required this.explainer, super.key});

  final Explainer explainer;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return DraggableScrollableSheet(
      initialChildSize: 0.62,
      minChildSize: 0.35,
      maxChildSize: 0.92,
      expand: false,
      builder: (context, controller) => DecoratedBox(
        decoration: BoxDecoration(
          color: c.background,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(BarbarianRadius.xl),
          ),
        ),
        child: ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 40),
          children: [
            Center(
              child: Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: c.hairlineStrong,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 22),
            // Spec §50 — Fact, Calculation or Interpretation, beside the name
            // of the thing. An exchange-published close and this app's own
            // arithmetic over it look identical in the same typeface, and a
            // reader has no way to tell which they are being asked to trust.
            Wrap(
              spacing: 8,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  explainer.title.toUpperCase(),
                  style: BarbarianType.labelNano.copyWith(color: c.textMuted),
                ),
                BProvenanceMark(provenance: explainer.provenance),
              ],
            ),
            const SizedBox(height: 10),

            // 1 — one sentence of meaning.
            Text(
              explainer.plain,
              style: BarbarianType.headlineM.copyWith(
                color: c.textPrimary,
                height: 1.3,
              ),
            ),
            const SizedBox(height: 20),

            // 2 — the arithmetic, with THIS company's real inputs. Not a
            // formula: the actual numbers, so the sentence can be checked.
            BPaperCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'HOW IT IS WORKED OUT',
                    style: BarbarianType.labelNano.copyWith(
                      color: c.textMuted,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    explainer.workings,
                    style: BarbarianType.figureXs.copyWith(
                      color: c.textPrimary,
                      height: 1.75,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 3 — the yardstick. What counts as ordinary, what does not.
            BPaperCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'WHAT COUNTS AS UNUSUAL',
                          style: BarbarianType.labelNano.copyWith(
                            color: c.textMuted,
                          ),
                        ),
                      ),
                      Text(
                        explainer.notability.label,
                        style: BarbarianType.labelNano.copyWith(
                          color: explainer.notability == Notability.notable
                              ? BarbarianPalette.onWash(c, c.accent)
                              : c.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    explainer.yardstick,
                    style: BarbarianType.bodyM.copyWith(
                      color: c.textSecondary,
                      height: 1.55,
                    ),
                  ),
                  if (explainer.caveat case final String caveat) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.fromLTRB(12, 10, 12, 11),
                      decoration: BoxDecoration(
                        color: c.hairline,
                        borderRadius: BorderRadius.circular(BarbarianRadius.sm),
                      ),
                      child: Text(
                        // Where the figure misleads. Volunteered rather than
                        // waited for, because the reader cannot know to ask.
                        caveat,
                        style: BarbarianType.bodyS.copyWith(
                          color: c.textMuted,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 4 — the receipt.
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.description_outlined,
                  size: 15,
                  color: c.textFaint,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    explainer.source,
                    style: BarbarianType.bodyS.copyWith(color: c.textMuted),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Fact, calculation or interpretation, as a small marker (spec §50).
///
/// Deliberately quiet: it is a note about where a number came from, not a
/// warning about the number. The three are told apart by their words, not by
/// colour alone — the app has readers who cannot rely on hue (spec §42), and a
/// green "fact" beside an amber "interpretation" would be exactly that.
class BProvenanceMark extends StatelessWidget {
  const BProvenanceMark({required this.provenance, super.key});

  final Provenance provenance;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        border: Border.all(color: c.hairlineStrong),
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
      ),
      child: Text(
        provenance.label.toUpperCase(),
        style: BarbarianType.labelNano.copyWith(color: c.textMuted),
      ),
    );
  }
}
