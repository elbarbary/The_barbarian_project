import 'package:flutter/material.dart';

import '../theme/barbarian_theme.dart';
import '../../l10n/app_localizations.dart';

/// The non-licence statement, at the foot of every screen that shows a score.
///
/// Spec §8.12: a disclosure buried on a provenance page reaches nobody. The
/// publisher is not registered with Egypt's Financial Regulatory Authority, and
/// the statement of that has to sit where the scored thing is being read —
/// under the score, on the screen, every time.
///
/// It is deliberately one sentence and deliberately plain. It is not a link, it
/// does not collapse, and it is not behind a disclosure toggle: each of those
/// is a way of not saying it.
///
/// **Present-or-fail.** Every screen that renders a score, a band, a pillar or a
/// rule outcome must include one, and `legal_footnote_test.dart` walks the app's
/// scored routes and fails if any of them does not. Adding a scored screen
/// without one breaks the build, which is the only reliable way to keep a
/// disclosure attached to the thing it discloses.
class BLegalFootnote extends StatelessWidget {
  const BLegalFootnote({this.onDark = false, super.key});

  /// On the ink slab, where the tone has to lift instead of recede.
  final bool onDark;

  /// The sentence itself, in one place. Counsel edits this string, not a
  /// screen. Kept as a constant so a test can assert on it without importing
  /// the widget tree.
  static const String statement =
      'ESTHMR is a publisher and is not licensed by the Financial Regulatory '
      'Authority. We do not buy, we do not sell, and we do not advise. Nothing '
      'here is a recommendation to trade any security.';

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Semantics(
      container: true,
      child: Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // A rule rather than an icon: an icon in this position reads as a
            // warning about the company, which is the opposite of what this
            // says.
            Container(
              width: 2,
              height: 30,
              margin: const EdgeInsetsDirectional.only(end: 10, top: 2),
              color: onDark
                  ? c.onInk.withValues(alpha: 0.25)
                  : c.textPrimary.withValues(alpha: 0.20),
            ),
            Expanded(
              child: Text(
                AppLocalizations.of(context).legalNotLicensed,
                style: BarbarianType.bodyS.copyWith(
                  color: onDark ? c.onInkMuted : c.textMuted,
                  height: 1.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The mandatory "what would change this" card (spec §8.2).
///
/// A score with no stated way to move it is a rating. A score with the filing
/// that would change it, named, is a conditional observation about published
/// arithmetic — which is the difference between describing a scorecard and
/// grading a company.
///
/// Every file that shows a band carries one. When the data has nothing to put
/// in it, the card says that rather than disappearing: an empty card is honest
/// about a gap, a missing card silently turns the score back into a rating.
/// The one-line version, for a card that can leave the app on its own.
///
/// The full statement sits once per screen, at the foot of the scroll. But the
/// unit a reader actually screenshots and forwards is the card — a ticker, a
/// score and a coloured band — and it leaves without the sentence that says
/// what it is not. This rides on the card itself so the two cannot be
/// separated.
class BLegalMark extends StatelessWidget {
  const BLegalMark({this.onDark = false, super.key});

  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Text(
        AppLocalizations.of(context).legalNotLicensedShort,
        style: BarbarianType.labelNano.copyWith(
          color: onDark ? c.onInkMuted : c.textFaint,
        ),
      ),
    );
  }
}

class BWhatWouldChangeThis extends StatelessWidget {
  const BWhatWouldChangeThis({required this.conditions, super.key});

  /// One line per pillar that publishes a trigger. Empty is a valid state.
  final List<String> conditions;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return BPaperCardShim(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'WHAT WOULD CHANGE THIS',
            style: BarbarianType.labelNano.copyWith(color: c.textMuted),
          ),
          const SizedBox(height: 8),
          if (conditions.isEmpty)
            Text(
              'The published study does not yet name a filing that would move '
              'these pillars. Until it does, the reading below is a record of '
              'what the rule produced on its date and nothing more.',
              style: BarbarianType.bodyM.copyWith(
                color: c.textSecondary,
                height: 1.5,
              ),
            )
          else
            for (final condition in conditions)
              Padding(
                padding: const EdgeInsets.only(bottom: 7),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 4,
                      height: 4,
                      margin: const EdgeInsetsDirectional.only(
                        end: 9,
                        top: 8,
                      ),
                      decoration: BoxDecoration(
                        color: c.textFaint,
                        shape: BoxShape.circle,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        condition,
                        style: BarbarianType.bodyM.copyWith(
                          color: c.textSecondary,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}

/// Indirection so this file does not import the surfaces library, which
/// imports the theme, which would make the legal components depend on the
/// paint. They should be the last thing anybody dares delete.
class BPaperCardShim extends StatelessWidget {
  const BPaperCardShim({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(BarbarianSpace.xl),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(BarbarianRadius.lg),
        border: Border.all(color: c.cardEdge),
      ),
      child: child,
    );
  }
}

/// The six pillars as a signed ledger — the thing that replaced the dial.
///
/// Board v2 deleted the arc gauge deliberately, and the reason is the sharpest
/// sentence in either board: *"a needle sweeping toward the right edge is a
/// verdict shape, whatever the caption underneath says. Nothing to point at,
/// nothing to screenshot as a buy signal."*
///
/// That is a legal argument, not an aesthetic one. A dial has a good end and a
/// bad end and a needle that points at one of them; screenshot it without the
/// caption and it is a rating on a named issuer, published by someone with no
/// licence to rate anything. A ledger cannot be screenshotted into a verdict
/// because it has no single place the eye lands: it is six rows, each with a
/// name, a sign, and the measurement that produced it.
///
/// The total is shown as what it is — an addition — and never as a grade.
class BPillarLedger extends StatelessWidget {
  const BPillarLedger({
    required this.rows,
    required this.total,
    this.range = 10,
    super.key,
  });

  /// (name, signed score, the measurement behind it).
  final List<(String, int, String?)> rows;

  /// The sum. Stated as a sum.
  final int total;

  /// The per-pillar bound, for the bar width.
  final int range;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (name, score, basis) in rows)
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: _PillarRow(name: name, score: score, basis: basis, range: range),
          ),
        Container(
          padding: const EdgeInsets.only(top: 12),
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: c.hairlineStrong)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  // Not "score", not "rating", not "grade". The word for what
                  // this number is.
                  'Sum of the six',
                  style: BarbarianType.labelS.copyWith(color: c.textSecondary),
                ),
              ),
              Text(
                total > 0 ? '+$total' : '$total',
                style: BarbarianType.figureM.copyWith(
                  color: c.textPrimary,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PillarRow extends StatelessWidget {
  const _PillarRow({
    required this.name,
    required this.score,
    required this.basis,
    required this.range,
  });

  final String name;
  final int score;
  final String? basis;
  final int range;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final positive = score >= 0;
    final tone = positive ? c.up : c.down;

    return Semantics(
      container: true,
      label: '$name, ${positive ? 'plus' : 'minus'} ${score.abs()} of $range',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  name,
                  style: BarbarianType.bodyL.copyWith(color: c.textPrimary),
                ),
              ),
              // The sign is written, not implied by colour (spec §42).
              Text(
                score > 0 ? '+$score' : '$score',
                style: BarbarianType.figureS.copyWith(
                  color: tone,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          // A bar from the centre out, so a −3 and a +3 are mirror images
          // rather than one being "further along" than the other. There is no
          // good end.
          LayoutBuilder(
            builder: (context, box) {
              final half = box.maxWidth / 2;
              final width = (score.abs() / range).clamp(0.0, 1.0) * half;
              return SizedBox(
                height: 6,
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: c.textPrimary.withValues(alpha: 0.07),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                    PositionedDirectional(
                      start: positive ? half : half - width,
                      width: width,
                      top: 0,
                      bottom: 0,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: tone,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                    PositionedDirectional(
                      start: half - 0.5,
                      width: 1,
                      top: 0,
                      bottom: 0,
                      child: ColoredBox(color: c.hairlineStrong),
                    ),
                  ],
                ),
              );
            },
          ),
          if (basis != null) ...[
            const SizedBox(height: 7),
            Text(
              basis!,
              style: BarbarianType.bodyS.copyWith(
                color: c.textMuted,
                height: 1.5,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
