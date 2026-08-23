import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/legal.dart';
import 'disclosures_block.dart';
import 'news_block.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/text.dart';
import '../home/lead_story.dart';
import '../home/connect_dots.dart';
import '../../l10n/app_localizations.dart';
import '../../core/models/recency.dart';

/// Today: the session, and — far more often — the absence of one.
///
/// Board v2 makes the claim this screen is built around: the app's most common
/// day is one where nothing qualifies, and that state deserves the whole
/// screen rather than an empty row in a stack of summaries. "There is nothing
/// to do today. Close the app." is the design, not a fallback.
///
/// So there are two layouts and a rule that picks between them. The quiet one
/// leads with the sentence and puts the counters underneath as evidence that
/// the work was done. The other leads with what cleared and keeps the same
/// counters, in the same place, for the same reason.
class TodayScreen extends ConsumerStatefulWidget {
  const TodayScreen({super.key});

  @override
  ConsumerState<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends ConsumerState<TodayScreen> {
  @override
  Widget build(BuildContext context) {
    final isSample = ref.watch(isSampleDataProvider);

    return BScreenScaffold(
      blockGap: 22,
      children: [
        const _TodayHeader(),
        // The reading screen, and only that: what several documents have in
        // common, then the stories, then everything the exchange published.
        //
        // The scanner and the rates rails moved to Home, where the rest of the
        // market furniture lives. This screen is now one thing.
        const BConnectDots(parentTab: BNavTab.today),
        // The day's stories, at the size a story deserves.
        const BLeadStory(parentTab: BNavTab.today),
        // Both feeds, complete and paged, behind one selector.
        const BTodayFeeds(),
        if (isSample) const Center(child: BSampleDataNotice()),
        const BLegalFootnote(),
      ],
    );
  }
}

/// The date, and the oldest thing on the screen.
///
/// Board v2 opens every screen with the age of its stalest figure rather than
/// with a greeting — "the oldest thing you can see right now" — because a
/// screen that mixes a 15-minute price with a 49-day filing is only as fresh
/// as the filing.
class _TodayHeader extends ConsumerWidget {
  const _TodayHeader();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    // `.value?.value` collapses loading, error and a genuinely absent report
    // into the same null, so the second line of the screen said "the board has
    // not published yet" on the first frame — an affirmative claim about the
    // publisher, made before the document had been asked for. The same mistake
    // `_DailyInsight` made, in a second place.
    final async = ref.watch(opportunityReportProvider);
    final report = async.value?.value;
    final subtitle = switch (report?.reportDate) {
      final DateTime at => l.todayPutTogether(context.dayMonth(at)),
      // Nothing to say yet is said by saying nothing.
      null when async.isLoading => null,
      null => l.scannerNotPublished,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        BScreenTitle(l.navToday),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: BarbarianType.bodyM.copyWith(color: c.textMuted),
          ),
        ],
      ],
    );
  }
}

/// What the whole exchange did today, from the closes the app already holds.
///
/// The canvas puts an index level here. There is no licensed EGX index feed,
/// but breadth — how many rose against how many fell — is a real aggregate of
/// real closes, and arguably tells you more about a session than a single

/// Today's two feeds, behind the selector Home uses.
///
/// Stacked, they made the screen a scroll: every filing of the session, then
/// every headline. The reader picks now, and "All filings" from Home still
/// lands on the right one because the request selects the tab as well as
/// scrolling to it.
class BTodayFeeds extends ConsumerStatefulWidget {
  const BTodayFeeds({super.key});

  @override
  ConsumerState<BTodayFeeds> createState() => _BTodayFeedsState();
}

class _BTodayFeedsState extends ConsumerState<BTodayFeeds> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSegmentedRow(
          segments: [
            BSegment(label: l.feedNews),
            BSegment(label: l.feedExchange),
          ],
          selectedIndex: _tab,
          onChanged: (i) => setState(() => _tab = i),
        ),
        const SizedBox(height: 14),
        if (_tab == 0) const BNewsBlock() else const BDisclosuresBlock(),
      ],
    );
  }
}
