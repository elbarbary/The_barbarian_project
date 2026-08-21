import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/disclosure.dart';
import '../../core/models/recency.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';

/// What companies told the exchange today.
///
/// This sits above the newspaper feed because it outranks it. A filing is the
/// company speaking to the regulator on the record; a headline is somebody
/// writing about it afterwards. The exchange also stamps the ticker into every
/// title, so the link between a filing and a company is made by EGX rather
/// than inferred by us — which is the thing newspaper matching could never do
/// safely.
///
/// Each row carries three things a reader cannot get from the filing itself:
/// **what kind of event it is**, **what that kind of event does to somebody
/// holding the share**, and **whether the company's session was unusual**. The
/// first two come from a reviewed glossary, never from a model. The third is
/// two published facts joined, never an opinion.
class BDisclosuresBlock extends ConsumerWidget {
  const BDisclosuresBlock({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final feed = ref.watch(disclosuresProvider).value?.value;
    if (feed == null || feed.isEmpty) return const SizedBox.shrink();

    final checks = feed.worthALook;
    // Every filing the exchange published, not a tenth of them. There are 36
    // on a normal day and the whole point of the tab is that a reader can see
    // the lot rather than a sample somebody chose for them.
    final rest = feed.items.where((i) => i.weight != 'check').toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.homeFiledHero),
        const SizedBox(height: 6),
        Text(
          checks.isEmpty
              ? '${feed.items.length} filings. None came from a company whose '
                    'session was outside its own normal band.'
              : '${checks.length} of ${feed.items.length} filings came from a '
                    'company that also traded unusually.',
          style: BarbarianType.bodyM.copyWith(
            color: c.textSecondary,
            height: 1.45,
          ),
        ),
        const SizedBox(height: 12),
        for (final item in [...checks, ...rest])
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _Filing(item: item),
          ),
        Text(
          'Source: the Egyptian Exchange. Each row links to the filing itself.',
          style: BarbarianType.bodyS.copyWith(color: c.textMuted, height: 1.5),
        ),
      ],
    );
  }
}

class _Filing extends StatelessWidget {
  const _Filing({required this.item});

  final Disclosure item;

  @override
  Widget build(BuildContext context) {
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final c = context.colors;

    return BPressable(
      onTap: item.link.isEmpty
          ? null
          : () => context.push(
              Routes.articlePath(BNavTab.today, item.link, 'EGX filing'),
            ),
      child: BPaperCard(
        padding: const EdgeInsets.fromLTRB(15, 14, 15, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // The tags share one Expanded rather than each being Flexible
                // beside a Spacer: a Flexible and a Spacer both take flex 1,
                // so the label was handed half the row and ellipsised to
                // "TRADING …" with space to spare.
                Expanded(
                  child: Row(
                    children: [
                      // Both tags shrink. Only the type tag used to, so the
                      // volume tag held its full natural width and shoved the
                      // row over its edge.
                      if (item.weight == 'check') ...[
                        Flexible(child: _CheckTag(ratio: item.evidence?.ratio)),
                        const SizedBox(width: 8),
                      ],
                      Flexible(child: _TypeTag(label: item.eventLabel)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Ticker and age share one slot — "MOSC · Today". They were
                // two, and the second one took enough width off the Expanded
                // beside it to ellipsise a type label that had just got longer
                // ("Listing committee decision"), overflowing the row by 89px.
                //
                // The age itself is §49: without it a filing from four days
                // ago and one from this morning looked identical, which on an
                // exchange feed is the difference between news and history.
                // EGX publishes the day and not the hour, so this says
                // "Today" and never "0h ago".
                if ([
                  if (item.tickers.isNotEmpty)
                    item.tickers.length > 1
                        ? '${item.tickers.first} +${item.tickers.length - 1}'
                        : item.tickers.first,
                  context.filingAge(item.date),
                ].nonNulls.join(' · ') case final String meta
                    when meta.isNotEmpty) ...[
                  Text(
                    meta,
                    style: BarbarianType.labelNano.copyWith(
                      color: c.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 6),
                ],
                Icon(Icons.north_east_rounded, size: 13, color: c.textFaint),
              ],
            ),
            const SizedBox(height: 9),
            // The filing's own words, in its own language and direction. Not
            // translated and not trimmed — it is a legal document, and the row
            // links to it.
            Directionality(
              // EGX files in Arabic without exception, but decided from the
              // string rather than assumed: the day the exchange publishes an
              // English title, this lays it out correctly instead of
              // backwards.
              textDirection: isArabic(item.titleFor(arabic))
                  ? TextDirection.rtl
                  : TextDirection.ltr,
              child: Text(
                item.titleFor(arabic),
                style: BarbarianType.bodyL.copyWith(
                  color: c.textPrimary,
                  height: 1.5,
                ),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (item.meaning.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.fromLTRB(11, 9, 11, 10),
                decoration: BoxDecoration(
                  color: c.hairline,
                  borderRadius: BorderRadius.circular(BarbarianRadius.sm),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // What this kind of filing means for a holder. The whole
                    // reason the screen exists: the document says what
                    // happened, this says what it does to you.
                    Text(
                      item.meaning,
                      style: BarbarianType.bodyS.copyWith(
                        color: c.textSecondary,
                        height: 1.5,
                      ),
                    ),
                    if (item.because.isNotEmpty) ...[
                      const SizedBox(height: 7),
                      Text(
                        item.because,
                        style: BarbarianType.bodyS.copyWith(
                          color: c.textMuted,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TypeTag extends StatelessWidget {
  const _TypeTag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: c.textPrimary.withValues(alpha: c.isDark ? 0.12 : 0.07),
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
      ),
      child: Text(
        label.toUpperCase(),
        style: BarbarianType.labelNano.copyWith(color: c.textSecondary),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}

class _CheckTag extends StatelessWidget {
  /// §8.6 — state the measurement, never an invitation.
  ///
  /// This chip used to read "WORTH A LOOK": the app's own judgement that a
  /// named company deserved a reader's attention today, in accent colour, on
  /// the most screenshot-friendly element of the row — and the feed then
  /// sorted those names to the top. A measurement is a fact about the session
  /// and says the same thing without recommending anything.
  const _CheckTag({this.ratio});

  final double? ratio;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final r = ratio;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: c.hairline,
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
      ),
      // Was two hardcoded English strings in an Arabic-first app, and the
      // Text had no ellipsis — so at its natural width ("VOLUME 3.4x NORMAL")
      // it pushed the tag row 117px past its edge once filing type labels got
      // longer.
      child: Text(
        (r == null || r <= 0
                ? l.unusualVolume
                : l.homeVolumeKicker(r.toStringAsFixed(1)))
            .toUpperCase(),
        style: BarbarianType.labelNano.copyWith(color: c.textMuted),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}
