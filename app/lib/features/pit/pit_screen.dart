import 'package:flutter/material.dart';

import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';

/// The Pit, phase 4.
///
/// Spec §56 says the community placeholder must not hold up a working app, and
/// §30 says the read-only product works without an account. So this tab states
/// plainly what is coming rather than pretending to be broken or empty.
class PitScreen extends StatelessWidget {
  const PitScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return BScreenScaffold(
      blockGap: 20,
      children: [
        const BScreenTitle('The Pit', subtitle: 'Discussion, with the evidence'),
        const BEmptyState(
          title: 'Coming in the next development phase',
          body:
              'The Pit is where the evidence gets argued over. Companies, '
              'filings and the research behind them — discussed by people '
              'reading the same numbers.\n\n'
              'Everything else in the app works without it, and will keep '
              'working if it ever goes down.',
        ),
        BPaperCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const BSectionLabel('What it will carry'),
              for (final kind in const [
                ('Discussion', 'Open conversation about a company'),
                ('Question', 'Ask the people reading the same filing'),
                ('Research note', 'Your own work, with sources'),
                ('Source', 'A disclosure, posted straight from the record'),
              ]) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 7),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 5,
                        height: 5,
                        margin: const EdgeInsetsDirectional.only(
                          top: 7,
                          end: 12,
                        ),
                        decoration: BoxDecoration(
                          color: c.accent,
                          shape: BoxShape.circle,
                        ),
                      ),
                      Expanded(
                        child: RichText(
                          text: TextSpan(
                            style: BarbarianType.bodyM.copyWith(
                              color: c.textSecondary,
                            ),
                            children: [
                              TextSpan(
                                text: '${kind.$1} — ',
                                style: BarbarianType.bodyM.copyWith(
                                  color: c.textPrimary,
                                ),
                              ),
                              TextSpan(text: kind.$2),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: BarbarianSpace.md),
              Text(
                'No buy or sell calls, no price targets, no performance '
                'leaderboards.',
                style: BarbarianType.bodyS.copyWith(color: c.textFaint),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
