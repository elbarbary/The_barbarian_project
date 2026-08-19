import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/news.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';

/// The headlines, sorted by whether anybody needs to read them.
///
/// Every other Egyptian markets product hands you a feed. A feed is a list of
/// things that happened, in the order they happened, with no claim about which
/// of them matters — which leaves the reader doing the one job they came here
/// unable to do.
///
/// This screen makes exactly one claim per headline, and it is arithmetic
/// rather than opinion: *this story names a listed company, and that company
/// traded 3.4× its own normal volume that session.* Two published facts joined.
/// Where the join does not hold the item says so — a company named on an
/// ordinary session, or a story about the economy rather than a share.
///
/// It cannot say more than that. The publisher has no FRA licence, so "this is
/// big news for the stock" is the sentence it is not allowed to write, and a
/// sentiment badge is that sentence with the words removed.
class BNewsBlock extends ConsumerWidget {
  const BNewsBlock({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final feed = ref.watch(newsProvider).value?.value;
    if (feed == null || feed.isEmpty) return const SizedBox.shrink();

    final checks = feed.worthAChecking;
    final rest = feed.items.where((i) => i.weight != 'check').take(12).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const BSectionLabel('The wires'),
        const SizedBox(height: 6),
        Text(
          checks.isEmpty
              ? 'Nothing on the wires today names a company whose session was '
                    'outside its own normal band.'
              : '${checks.length} of today’s headlines name a company that '
                    'also traded unusually.',
          style: BarbarianType.bodyM.copyWith(
            color: c.textSecondary,
            height: 1.45,
          ),
        ),
        const SizedBox(height: 12),
        for (final item in [...checks, ...rest])
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _Headline(item: item, feed: feed),
          ),
        const SizedBox(height: 4),
        _Provenance(feed: feed),
      ],
    );
  }
}

class _Headline extends StatelessWidget {
  const _Headline({required this.item, required this.feed});

  final NewsItem item;
  final NewsFeed feed;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // Every outlet that ran it, named. A story three papers carried is more
    // established than one a single paper has, and hiding that behind a
    // "sources: 3" count throws away the useful half.
    final names = [
      for (final attribution in item.sources)
        feed.sources
            .where((s) => s.id == attribution.id)
            .map((s) => s.name)
            .firstOrNull,
    ].nonNulls.toList();
    final outlet = names.isEmpty ? null : names.join(' · ');
    final link = item.sources.firstOrNull?.link ?? '';

    return BPressable(
      // Out to the outlet's own page, in the app's reader. ESTHMR carries the
      // headline and the pointer; the article belongs to whoever wrote it, and
      // it is read on their page with their name on it.
      onTap: link.isEmpty
          ? null
          : () => context.push(
              Routes.articlePath(BNavTab.today, link, names.firstOrNull ?? 'Source'),
            ),
      child: BPaperCard(
        padding: const EdgeInsets.fromLTRB(15, 14, 15, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (item.weight == 'check') const _CheckTag(),
                if (item.weight == 'check') const SizedBox(width: 8),
                if (item.eventTag case final String tag) ...[
                  _EventTag(label: tag),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Text(
                    [outlet, _ago(item.publishedAt)].nonNulls.join(' · '),
                    style: BarbarianType.labelNano.copyWith(
                      color: c.textMuted,
                    ),
                  ),
                ),
                Icon(Icons.north_east_rounded, size: 13, color: c.textFaint),
              ],
            ),
            const SizedBox(height: 8),
            // The headline runs right to left. It is somebody else's sentence
            // in their own language and it is not translated or trimmed.
            Directionality(
              textDirection: TextDirection.rtl,
              child: Text(
                item.headline,
                style: BarbarianType.bodyL.copyWith(
                  color: c.textPrimary,
                  height: 1.5,
                ),
              ),
            ),
            if (item.because.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.fromLTRB(11, 9, 11, 10),
                decoration: BoxDecoration(
                  color: c.hairline,
                  borderRadius: BorderRadius.circular(BarbarianRadius.sm),
                ),
                child: Text(
                  item.because,
                  style: BarbarianType.bodyS.copyWith(
                    color: c.textSecondary,
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  static String? _ago(DateTime? at) {
    if (at == null) return null;
    final delta = DateTime.now().toUtc().difference(at.toUtc());
    if (delta.inMinutes < 60) return '${delta.inMinutes}m ago';
    if (delta.inHours < 24) return '${delta.inHours}h ago';
    return '${delta.inDays}d ago';
  }
}

/// What kind of event it is — never whether it was good.
///
/// This is the slot where every competitor puts a sentiment badge. "Positive"
/// beside a company name is a view on that company, published by somebody with
/// no licence to hold one, and it is a price target with the number taken out.
/// "Capital change" is a fact about the story, it can be checked against the
/// article, and it is the more useful half anyway.
class _EventTag extends StatelessWidget {
  const _EventTag({required this.label});

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
      ),
    );
  }
}

class _CheckTag extends StatelessWidget {
  const _CheckTag();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: c.accent.withValues(alpha: c.isDark ? 0.20 : 0.14),
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
      ),
      child: Text(
        'WORTH A LOOK',
        style: BarbarianType.labelNano.copyWith(
          color: BarbarianPalette.onWash(c, c.accent),
        ),
      ),
    );
  }
}

/// Who the headlines came from, and who could not be reached.
///
/// The outages are published rather than hidden. A feed that quietly lost two
/// of its five sources looks identical to one that never had them, and a
/// reader deciding how much of the market this covers deserves to know which.
class _Provenance extends StatelessWidget {
  const _Provenance({required this.feed});

  final NewsFeed feed;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final live = feed.sources.map((s) => s.name).join(', ');
    final down = feed.unavailable.map((s) => s.name).join(', ');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Headlines from $live, each linked to the outlet that ran it. '
          '${feed.merged > 0 ? '${feed.merged} duplicates merged. ' : ''}'
          '${feed.droppedForAdvice > 0 ? '${feed.droppedForAdvice} withheld for carrying a recommendation. ' : ''}'
          '${down.isEmpty ? '' : 'Not reachable today: $down.'}',
          style: BarbarianType.bodyS.copyWith(
            color: c.textMuted,
            height: 1.5,
          ),
        ),
      ],
    );
  }
}
