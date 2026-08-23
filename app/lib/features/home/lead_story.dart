import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/news.dart';
import '../../core/models/recency.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// The story the screen opens with.
///
/// This app reads the exchange better than anything else does, and it opened
/// with a regulatory filing — a form somebody was obliged to submit. That is
/// the most valuable card on the screen for a reader already deep in a company
/// and the worst possible first impression for everyone else, which is why it
/// stopped feeling like a news app.
///
/// So the first thing is a story, at the size a story deserves: the picture the
/// outlet ran, its headline in its own language, and who published it. The
/// filings have not gone anywhere — they sit directly underneath, where they
/// read as depth rather than as a greeting.
///
/// **It degrades to a headline.** Roughly half the feed carries no picture, and
/// a lead card that collapses when the top story happens to be from an outlet
/// without one would be worse than no lead card at all.
/// The stories the rail leads with.
///
/// Shared, because the rail and the list underneath it were each choosing
/// their own and arriving at the same answer: the rail took the first six
/// illustrated stories of the top 24, the list took the first five outright,
/// and since almost every ranked story now carries a picture the app opened
/// with the same five headlines printed twice, in the same order, filling the
/// first screen and a half.
///
/// Illustrated only. This is the carousel — a card with a hole where the
/// photograph should be reads as broken beside five that have one.
List<NewsItem> leadStories(List<NewsItem> items) => [
  for (final item in items.take(24))
    if ((item.image ?? '').isNotEmpty) item,
].take(6).toList();

class BLeadStory extends ConsumerWidget {
  const BLeadStory({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final feed = ref.watch(newsProvider).whenOrNull(data: (s) => s.value);
    final items = feed?.items ?? const <NewsItem>[];
    if (items.isEmpty) return const SizedBox.shrink();

    // The recent stories that brought a picture with them. One card was a
    // single editor's pick that a reader could only accept or scroll past;
    // swiping lets them look at the top of the feed the way they would look at
    // a front page.
    //
    // Illustrated ones only. This is the carousel — a card with a hole where
    // the photograph should be reads as broken next to four that have one —
    // and every story, illustrated or not, is in the list directly below.
    final leads = leadStories(items);
    if (leads.isEmpty) return const SizedBox.shrink();
    // The attribution carries an outlet id; the feed carries the names. One
    // story told by three papers is credited to all of them.
    final byId = {for (final source in feed!.sources) source.id: source.name};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        BSectionLabel(l.homeLeadStory),
        SizedBox(
          // A rail needs one height for every card, so this is the tallest
          // card: a 16:9 photograph, a byline, and three lines of Arabic
          // headline. Two-line headlines leave a little air under them, which
          // is the price of the rail not resizing as it scrolls.
          height: 302,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.zero,
            itemCount: leads.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, i) => SizedBox(
              // A shade under the screen so the next card's edge shows, which
              // is the only thing that says the rail scrolls at all.
              width: MediaQuery.sizeOf(context).width * 0.82,
              child: _LeadCard(item: leads[i], byId: byId),
            ),
          ),
        ),
      ],
    );
  }
}

/// One story in the rail.
class _LeadCard extends StatelessWidget {
  const _LeadCard({required this.item, required this.byId});

  final NewsItem item;
  final Map<String, String> byId;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final outlet = <String>{
      for (final a in item.sources)
        if (byId[a.id]?.trim() case final String n when n.isNotEmpty) n,
    }.join(' · ');
    final byline = [
      if (outlet.isNotEmpty) outlet,
      context.newsAge(item.publishedAt),
    ].nonNulls.join(' · ');

    return BPressable(
      onTap: () {
        final link = item.sources
            .map((s) => s.link)
            .firstWhere((s) => s.isNotEmpty, orElse: () => '');
        if (link.isEmpty) return;
        context.push(
          Routes.articlePath(
            BNavTab.home,
            link,
            outlet.isEmpty ? l.homeLeadStory : outlet,
          ),
        );
      },
      child: BPaperCard(
        radius: BarbarianRadius.xl,
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if ((item.image ?? '').isNotEmpty)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(BarbarianRadius.xl),
                ),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.network(
                    item.image!,
                    fit: BoxFit.cover,
                    cacheWidth:
                        (MediaQuery.sizeOf(context).width *
                                MediaQuery.devicePixelRatioOf(context))
                            .round(),
                    loadingBuilder: (context, child, progress) =>
                        progress == null
                        ? child
                        : ColoredBox(color: c.hairline),
                    errorBuilder: (_, _, _) => const SizedBox.shrink(),
                  ),
                ),
              ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (byline.isNotEmpty) ...[
                      Text(
                        byline,
                        style: BarbarianType.labelNano.copyWith(
                          color: c.textMuted,
                        ),
                      ),
                      const SizedBox(height: 6),
                    ],
                    Flexible(
                      child: Directionality(
                        textDirection: isArabic(item.headlineFor(arabic))
                            ? TextDirection.rtl
                            : TextDirection.ltr,
                        child: Text(
                          item.headlineFor(arabic),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: BarbarianType.titleL.copyWith(
                            color: c.textPrimary,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
