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
class BLeadStory extends ConsumerWidget {
  const BLeadStory({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final feed = ref.watch(newsProvider).whenOrNull(data: (s) => s.value);
    final items = feed?.items ?? const <NewsItem>[];
    if (items.isEmpty) return const SizedBox.shrink();

    // The newest story that brought a picture with it, falling back to the
    // newest story at all. A lead is about being first, not about being
    // illustrated — the picture only decides *which* of the recent ones leads.
    final lead = items.firstWhere(
      (i) => (i.image ?? '').isNotEmpty,
      orElse: () => items.first,
    );
    // The attribution carries an outlet id; the feed carries the names. One
    // story told by three papers is credited to all of them.
    final byId = {for (final source in feed!.sources) source.id: source.name};
    final outlet = <String>{
      for (final a in lead.sources)
        if (byId[a.id]?.trim() case final String n when n.isNotEmpty) n,
    }.join(' · ');
    final byline = [
      if (outlet.isNotEmpty) outlet,
      context.newsAge(lead.publishedAt),
    ].nonNulls.join(' · ');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        BSectionLabel(l.homeLeadStory),
        BPressable(
          onTap: () {
            final link = lead.sources
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
                if ((lead.image ?? '').isNotEmpty)
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(BarbarianRadius.xl),
                    ),
                    child: AspectRatio(
                      // Wide enough to read as a photograph rather than as a
                      // thumbnail that got out of hand.
                      aspectRatio: 16 / 9,
                      child: Image.network(
                        lead.image!,
                        fit: BoxFit.cover,
                        // Decoded near the width it is painted at. A newspaper
                        // lead image is routinely 1600px across.
                        cacheWidth:
                            (MediaQuery.sizeOf(context).width *
                                    MediaQuery.devicePixelRatioOf(context))
                                .round(),
                        loadingBuilder: (context, child, progress) =>
                            progress == null
                            ? child
                            : ColoredBox(color: c.hairline),
                        // A dead link leaves the headline, which is the story.
                        errorBuilder: (_, _, _) => const SizedBox.shrink(),
                      ),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
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
                        const SizedBox(height: 8),
                      ],
                      // Direction follows the string actually rendered: an
                      // English translation laid out right-to-left is the bug
                      // this pattern replaced everywhere else.
                      Directionality(
                        textDirection: isArabic(lead.headlineFor(arabic))
                            ? TextDirection.rtl
                            : TextDirection.ltr,
                        child: Text(
                          lead.headlineFor(arabic),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: BarbarianType.headlineM.copyWith(
                            color: c.textPrimary,
                            height: 1.3,
                          ),
                        ),
                      ),
                      if (lead.meaningFor(arabic) case final String why
                          when why.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          why,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: BarbarianType.bodyS.copyWith(
                            color: c.textSecondary,
                            height: 1.45,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
