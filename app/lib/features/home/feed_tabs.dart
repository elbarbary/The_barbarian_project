import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/providers.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';
import 'home_screen.dart';

/// The two feeds this app carries, behind one selector.
///
/// They were stacked: a dozen headlines, then a market block, then ten filings
/// further down. Both are "what happened today" and a reader looking for one
/// had to scroll past the other to find it — so they share a place and the
/// reader says which.
///
/// **Five rows each.** Enough to see there is a feed and short enough that the
/// screen keeps moving; the tab is the promise that there is more, and "All
/// news" is where the rest lives. Twelve rows under a lead story turned Home
/// into a list that had to be scrolled past rather than read.
///
/// The selector is deliberately not a route. Both feeds are already loaded, and
/// making this a navigation would cost a screen transition to answer a question
/// the reader can answer by looking.
class BFeedTabs extends ConsumerStatefulWidget {
  const BFeedTabs({super.key});

  @override
  ConsumerState<BFeedTabs> createState() => _BFeedTabsState();
}

class _BFeedTabsState extends ConsumerState<BFeedTabs> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final news = _tab == 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: BSegmentedRow(
                segments: [
                  BSegment(label: l.feedNews),
                  BSegment(label: l.feedExchange),
                ],
                selectedIndex: _tab,
                onChanged: (i) => setState(() => _tab = i),
              ),
            ),
            const SizedBox(width: 10),
            // Straight to the full feed on Today, and to the section within it
            // rather than to the top of a long screen.
            BInlineAction(
              news ? l.homeAllNews : l.homeAllFilings,
              onTap: () {
                ref
                    .read(todaySectionRequestProvider.notifier)
                    .ask(news ? TodaySection.news : TodaySection.filings);
                context.go(Routes.today);
              },
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (news)
          const HomeLatestNews(limit: 5, showHeader: false)
        else
          const HomeAlsoFiled(limit: 5, showHeader: false),
      ],
    );
  }
}
