import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/news.dart';
import '../../core/models/recency.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/news_thumb.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/insight.dart';
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
class BNewsBlock extends ConsumerStatefulWidget {
  const BNewsBlock({super.key});

  @override
  ConsumerState<BNewsBlock> createState() => _BNewsBlockState();
}

class _BNewsBlockState extends ConsumerState<BNewsBlock> {
  /// Rows built at once.
  ///
  /// The feed carries 400 stories and this block lives inside a Column, so
  /// every row it lists is built whether or not anybody scrolls to it. Listing
  /// all of them costs a visible stall on the tab; listing twelve — which is
  /// what it used to do — hid nine-tenths of the feed behind nothing at all.
  /// A page at a time is both.
  static const _page = 30;

  int _shown = _page;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final feed = ref.watch(newsProvider).value?.value;
    if (feed == null || feed.isEmpty) return const SizedBox.shrink();

    final checks = feed.worthAChecking;
    final all = feed.items.where((i) => i.weight != 'check').toList();
    final rest = all.take(_shown).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.theWires),
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
        if (rest.length < all.length) ...[
          const SizedBox(height: 4),
          Center(
            child: TextButton(
              onPressed: () => setState(() => _shown += _page),
              child: Text(
                '${l.showMore}  ·  ${l.showingCount(rest.length + checks.length, all.length + checks.length)}',
                style: BarbarianType.bodyM.copyWith(color: c.textSecondary),
              ),
            ),
          ),
        ],
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
    final arabic = Directionality.of(context) == TextDirection.rtl;
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
              Routes.articlePath(
                BNavTab.today,
                link,
                names.firstOrNull ?? 'Source',
              ),
            ),
      child: BPaperCard(
        padding: const EdgeInsets.fromLTRB(15, 14, 15, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // A Wrap, not a Row. Two variable-length tags beside a
            // variable-length attribution is three things competing for one
            // line, and every flex arrangement I tried moved the overflow
            // rather than removing it. Wrap cannot overflow: it takes a second
            // line when it needs one, which on a phone it sometimes does.
            Wrap(
              spacing: 8,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                if (item.weight == 'check') const _CheckTag(),
                if (item.eventTag case final String tag) _EventTag(label: tag),
                Text(
                  [
                    outlet,
                    context.newsAge(item.publishedAt),
                  ].nonNulls.join(' · '),
                  style: BarbarianType.labelNano.copyWith(color: c.textMuted),
                ),
                Icon(Icons.north_east_rounded, size: 13, color: c.textFaint),
              ],
            ),
            const SizedBox(height: 8),
            // The row runs in the headline's own direction, so the picture
            // sits where that headline begins. Pinned to the left with an
            // Arabic headline right-aligning away from it, every row had a
            // channel of blank paper down the middle.
            //
            // Per headline, not per app: the feeds are mixed — Al Borsa files
            // in Arabic, Arab Finance in English — and forcing one direction on
            // all of them laid every English headline out backwards.
            Directionality(
              textDirection: isArabic(item.headlineFor(arabic))
                  ? TextDirection.rtl
                  : TextDirection.ltr,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Collapses itself, gap included, when the outlet published
                  // no picture or the download fails.
                  BNewsThumb(url: item.image, size: 72),
                  Expanded(
                    child: Text(
                      item.headlineFor(arabic),
                      style: BarbarianType.bodyL.copyWith(
                        color: c.textPrimary,
                        height: 1.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // What this story does to somebody holding EGX shares, in the
            // same voice and the same mark as the Home rows.
            if (item.meaningFor(arabic) case final String why
                when why.isNotEmpty) ...[
              const SizedBox(height: 10),
              BInsightLine(why, maxLines: 3),
            ],

            // And the measured reason, but only where it is measured.
            //
            // `because` falls back to one generic sentence when no listed
            // company can be matched, which is most of the feed — so this box
            // printed "Names no listed company we can match…" on row after
            // row after row. Three of those stacked is not an explanation, it
            // is the app clearing its throat.
            if (item.weight != 'market' && item.because.isNotEmpty) ...[
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
  const _CheckTag();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: c.hairline,
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
      ),
      child: Text(
        // The news feed carries no volume figure of its own, so this states
        // only that the session was unusual, not how unusual.
        'UNUSUAL VOLUME',
        style: BarbarianType.labelNano.copyWith(color: c.textMuted),
      ),
    );
  }
}

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
          style: BarbarianType.bodyS.copyWith(color: c.textMuted, height: 1.5),
        ),
      ],
    );
  }
}
