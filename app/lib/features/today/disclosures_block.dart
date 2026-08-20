import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/disclosure.dart';
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
    final c = context.colors;
    final feed = ref.watch(disclosuresProvider).value?.value;
    if (feed == null || feed.isEmpty) return const SizedBox.shrink();

    final checks = feed.worthALook;
    final rest = feed.items.where((i) => i.weight != 'check').take(10).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const BSectionLabel('Filed with the exchange'),
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
                      if (item.weight == 'check') ...[
                        _CheckTag(ratio: item.evidence?.ratio),
                        const SizedBox(width: 8),
                      ],
                      Flexible(child: _TypeTag(label: item.eventLabel)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                if (item.tickers.isNotEmpty) ...[
                  Text(
                    item.tickers.length > 1
                        ? '${item.tickers.first} +${item.tickers.length - 1}'
                        : item.tickers.first,
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
              textDirection: isArabic(item.title)
                  ? TextDirection.rtl
                  : TextDirection.ltr,
              child: Text(
                item.title,
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
    final r = ratio;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: c.hairline,
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
      ),
      child: Text(
        r == null || r <= 0
            ? 'UNUSUAL VOLUME'
            : 'VOLUME ${r.toStringAsFixed(1)}x NORMAL',
        style: BarbarianType.labelNano.copyWith(color: c.textMuted),
      ),
    );
  }
}
