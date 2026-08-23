import 'package:flutter/material.dart';

import '../models/explainer.dart';
import '../theme/barbarian_theme.dart';
import '../../l10n/app_localizations.dart';
import 'explainer_sheet.dart';
import 'motion.dart';

/// The one idea this whole app is organised around, said on the surface.
///
/// A company's shares changing hands far more than they normally do — 2× being
/// the line — is the thesis of the product, and it was explained on exactly one
/// screen: `Explainers.relativeVolume`, rendered deep inside an individual
/// company page. Everything a reader meets first — the Home hero's eyebrow, the
/// unusual rail, the connect-dots card, the news chips, the Today filings
/// sentence, the scanner's rules — spoke that vocabulary as if it were already
/// shared.
///
/// So somebody who opened the app, read "حجم التداول 3.45× المعتاد" on the
/// biggest card, and never tapped into a company finished their ninety seconds
/// without learning what volume is, what "usual" was measured against, why 2×
/// is the number that matters, or — the important one — that unusual volume is
/// a **question rather than a verdict**.
///
/// That was a design problem and not a data problem. The teaching material was
/// already written, by a person, in both languages, and already shipping. This
/// puts it where the reader is.
class BTeachingLine extends StatelessWidget {
  const BTeachingLine({this.onDark = false, super.key});

  final bool onDark;

  /// The full explanation, in the shape every other number in the app opens.
  static Explainer explainer(AppLocalizations l) => Explainer(
    termId: 'volume.relative',
    title: l.volumeTeachingTitle,
    plain: l.volumeTeaching,
    token: '2.0×',
    workings: l.volumeTeachingWorkings,
    yardstick: [l.volumeTeachingYardstick, l.volumeTeachingFloor].join('\n\n'),
    // The threshold is this app's own, not a published band, and the sheet
    // says which. Marking it notable would be dressing our line as the
    // exchange's.
    notability: Notability.unjudged,
    provenance: Provenance.interpretation,
    source: 'EGX',
  );

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final muted = onDark ? c.onInkMuted : c.textSecondary;

    return BPressable(
      onTap: () => showExplainer(context, explainer(l)),
      scale: 0.995,
      semanticLabel: '${l.volumeTeaching} ${l.learnMore}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l.volumeTeaching,
            style: BarbarianType.bodyM.copyWith(color: muted, height: 1.5),
          ),
          const SizedBox(height: 7),
          // The app's one mark for "there is more behind this", rather than an
          // info icon here and nothing anywhere else.
          BDottedUnderline(
            onDark: onDark,
            child: Text(
              l.learnMore,
              style: BarbarianType.labelS.copyWith(
                color: onDark ? c.accentOnInk : c.accent,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
