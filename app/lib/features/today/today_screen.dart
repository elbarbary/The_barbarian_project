import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/legal.dart';
import 'disclosures_block.dart';
import 'news_block.dart';
import 'rates_block.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
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
  final _filings = GlobalKey();
  final _news = GlobalKey();

  /// Bring the section the reader asked for into view.
  ///
  /// Both blocks are fed by documents that arrive after the first frame, so
  /// the anchor usually has no context yet when the request lands. Rather than
  /// guess at a delay this retries for a short while and then gives up — the
  /// cost of failing is that the reader is at the top of Today, which is
  /// exactly where they used to be.
  void _reveal(TodaySection section, {int attempt = 0}) {
    final key = section == TodaySection.filings ? _filings : _news;
    final target = key.currentContext;
    if (target == null) {
      if (attempt < 20 && mounted) {
        Future<void>.delayed(const Duration(milliseconds: 100), () {
          if (mounted) _reveal(section, attempt: attempt + 1);
        });
      }
      return;
    }
    Scrollable.ensureVisible(
      target,
      duration: const Duration(milliseconds: 420),
      curve: Curves.easeOutCubic,
      // A little air above it, so the section label is not flush against the
      // top edge and the reader can see what they landed on.
      alignment: 0.04,
    );
  }

  @override
  void initState() {
    super.initState();
    // Listened to rather than read during `build`.
    //
    // Clearing the request inside `build` modified a provider while the widget
    // tree was building, which Riverpod refuses outright — and it took the
    // whole Today tab down with a red screen. The rule exists because two
    // widgets watching the same provider could otherwise disagree about its
    // value within one frame.
    ref.listenManual(todaySectionRequestProvider, (_, next) {
      if (next == null) return;
      // Clear on the next microtask, outside the notification, then scroll
      // once the frame that follows has laid the anchors out.
      Future.microtask(
        () => ref.read(todaySectionRequestProvider.notifier).clear(),
      );
      WidgetsBinding.instance.addPostFrameCallback((_) => _reveal(next));
    }, fireImmediately: true);
  }

  @override
  Widget build(BuildContext context) {
    final isSample = ref.watch(isSampleDataProvider);

    // One-shot. Cleared immediately so returning to this tab later leaves the
    // reader where they were rather than yanking them down the page again.

    return BScreenScaffold(
      blockGap: 22,
      children: [
        const _TodayHeader(),
        const _ScannerHero(),
        const BRatesBlock(),
        // The same two feeds, the same selector. Today is the full version —
        // Home shows five of each and sends the reader here for the rest — so
        // both anchors stay live for the scroll-to-section request even while
        // only one feed is on screen.
        BTodayFeeds(filingsKey: _filings, newsKey: _news),
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
    final report = ref.watch(opportunityReportProvider).value?.value;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        BScreenTitle(l.navToday),
        const SizedBox(height: 6),
        Text(
          report?.reportDate == null
              ? l.scannerNotPublished
              : l.todayPutTogether(context.dayMonth(report!.reportDate!)),
          style: BarbarianType.bodyM.copyWith(color: c.textMuted),
        ),
      ],
    );
  }
}

/// The lead card: today's scanner status.
class _ScannerHero extends ConsumerWidget {
  const _ScannerHero();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final async = ref.watch(opportunityReportProvider);

    return BAsyncView(
      value: async,
      loading: const BSkeletonBlock(height: 220, radius: BarbarianRadius.xl),
      errorTitle: l.scannerNotDownloaded,
      errorBody: l.scannerNotDownloadedBody,
      data: (sourced) {
        final report = sourced.value;
        return BPressable(
          onTap: () => context.push(Routes.scannerPath(BNavTab.today)),
          child: BDarkCard(
            radius: BarbarianRadius.xl,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          // Was the literal string 'OPPORTUNITY SCANNER',
                          // which meant an Arabic reader met an English label
                          // here whatever the locale said — and it survived
                          // the rename because a hardcoded string is invisible
                          // to the ARB.
                          l.scannerTitle.toUpperCase(),
                          style: BarbarianType.labelNano.copyWith(
                            color: c.onInkMuted,
                          ),
                        ),
                      ),
                    ),
                    BDarkCircleButton(
                      icon: Icons.arrow_outward_rounded,
                      semanticLabel: l.scannerOpen,
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  report.headline ?? l.scannerFoundToday,
                  style: BarbarianType.headlineL.copyWith(
                    color: c.onInk,
                    height: 1.18,
                  ),
                ),
                // §8.6 — no single name leads this card.
                //
                // It used to show the highest-scoring company on the watch,
                // with its price chart, as the hero of the day. Whatever the
                // caption said, a max-by-score pick rendered as the day's
                // headline is a best-stock-today element assembled from parts,
                // and spec §8 forbids that however it is built. The counts say
                // what the rule did; they name nobody.
                const SizedBox(height: 14),
                Row(
                  children: [
                    _ScanCount(
                      value: report.qualifiedCount,
                      label: l.countQualified,
                      // The ink pair: c.up reads 2.87:1 here, beside an
                      // accentOnInk at 7.16 and an onInkMuted at 4.95, so the
                      // row went two colours and a smudge.
                      tone: c.upOnInk,
                    ),
                    const SizedBox(width: 10),
                    _ScanCount(
                      value: report.watchingCount,
                      label: l.countWatching,
                      tone: c.accentOnInk,
                    ),
                    const SizedBox(width: 10),
                    _ScanCount(
                      value: report.outcomes.length,
                      label: l.countOutcomes,
                      tone: c.onInkMuted,
                    ),
                  ],
                ),
                if (report.date case final String d) ...[
                  const SizedBox(height: 14),
                  BStalenessCaption(
                    l.updatedOn(context.dayMonthIso(d)),
                    onDark: true,
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ScanCount extends StatelessWidget {
  const _ScanCount({
    required this.value,
    required this.label,
    required this.tone,
  });

  final int value;
  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: c.onInk.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(BarbarianRadius.sm),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            BNumText(
              '$value',
              style: BarbarianType.figureM.copyWith(color: tone),
            ),
            const SizedBox(height: 4),
            Text(
              label.toUpperCase(),
              style: BarbarianType.labelTiny.copyWith(color: c.onInkMuted),
              maxLines: 1,
            ),
          ],
        ),
      ),
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
  const BTodayFeeds({
    required this.filingsKey,
    required this.newsKey,
    super.key,
  });

  final Key filingsKey;
  final Key newsKey;

  @override
  ConsumerState<BTodayFeeds> createState() => _BTodayFeedsState();
}

class _BTodayFeedsState extends ConsumerState<BTodayFeeds> {
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    // A reader who tapped "All filings" on Home asked for the filings, so the
    // selector answers that rather than making them ask twice.
    ref.listenManual(todaySectionRequestProvider, (_, next) {
      if (next == null || !mounted) return;
      setState(() => _tab = next == TodaySection.filings ? 1 : 0);
    }, fireImmediately: true);
  }

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
        if (_tab == 0)
          BNewsBlock(key: widget.newsKey)
        else
          BDisclosuresBlock(key: widget.filingsKey),
      ],
    );
  }
}
