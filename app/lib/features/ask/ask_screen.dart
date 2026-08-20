import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/company.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';

/// Ask: the first ten seconds.
///
/// The boards open here rather than on a dashboard, and the reason is the whole
/// premise of the app: nobody launches this to browse. Somebody has just been
/// sent a name — in a WhatsApp group, in a screenshot, from a cousin — and
/// wants to know what it is. A summary of everything is the wrong answer to
/// that; a box you can put the name into is the right one.
///
/// So this screen is a question and four ways to ask it: paste the picture you
/// were sent, type the name, read what happened in the session, or start from
/// the one question that comes before every other one.
class AskScreen extends ConsumerStatefulWidget {
  const AskScreen({super.key});

  @override
  ConsumerState<AskScreen> createState() => _AskScreenState();
}

class _AskScreenState extends ConsumerState<AskScreen> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = ref.watch(searchQueryProvider);
    final results = ref.watch(searchResultsProvider);
    final isSample = ref.watch(isSampleDataProvider);

    return BScreenScaffold(
      blockGap: 20,
      children: [
        const _Masthead(),
        BSearchPill(
          text: 'Search by company name or symbol…',
          controller: _search,
          onChanged: (v) => ref.read(searchQueryProvider.notifier).set(v),
        ),
        // The results take the screen while there is a query, because at that
        // point the question has been asked and everything else is furniture.
        if (query.isNotEmpty)
          _Results(results: results, query: query)
        else ...[
          const _PasteCard(),
          const _StandingQuestions(),
          const _WaysIn(),
        ],
        if (isSample) const Center(child: BSampleDataNotice()),
      ],
    );
  }
}

/// The wordmark, and the age of the oldest thing on the screen.
///
/// Board v2 replaces the greeting with a staleness line — "the oldest thing you
/// can see right now" — and the rule it settles on is that the oldest figure
/// wins. A screen carrying a 15-minute price and a 49-day filing is a 49-day
/// screen; saying "15 minutes" there would be true about the price and false
/// about the screen.
class _Masthead extends ConsumerWidget {
  const _Masthead();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const BAvatarHatch(size: 44),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'ESTHMR',
                    style: BarbarianType.displayS.copyWith(
                      color: c.textPrimary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  Text(
                    'Egyptian equities, unfiltered',
                    style: BarbarianType.bodyM.copyWith(color: c.textMuted),
                  ),
                ],
              ),
            ),
            const _Refresh(),
          ],
        ),
        const SizedBox(height: 14),
        const _OldestOnScreen(),
      ],
    );
  }
}

/// Paste the picture you were sent.
///
/// The board's flow: a screenshot arrives in a group, you paste it here, the
/// phone reads a name out of it and offers to open that company's file. The
/// reading is on-device and the board says so on the card, because the promise
/// only means anything if it is made where the picture is handed over.
///
/// Forget the manifest, then everything it decides the version of.
///
/// Invalidating only the providers re-asked the cached manifest, got the same
/// versions back and re-served the same documents — a Refresh that could not
/// refresh.
class _Refresh extends ConsumerWidget {
  const _Refresh();

  @override
  Widget build(BuildContext context, WidgetRef ref) => BSoftIconButton(
    icon: Icons.refresh_rounded,
    semanticLabel: 'Refresh',
    onTap: () {
      ref.read(staticApiProvider).invalidateManifest();
      ref.invalidate(marketSnapshotProvider);
      ref.invalidate(companyDirectoryProvider);
      ref.invalidate(opportunityReportProvider);
      ref.invalidate(cashOrTrashProvider);
      ref.invalidate(liveQuotesProvider);
    },
  );
}

/// "The oldest thing you can see right now."
///
/// Board v2 leaves the rule for this deliberately open — "it needs a real rule
/// for which age wins when a screen mixes a 15-minute price with a 49-day
/// filing" — and settles on the oldest. That is the honest one: a screen is
/// only as current as its stalest figure, and quoting the freshest would be
/// true about one number and false about the screen.
class _OldestOnScreen extends ConsumerWidget {
  const _OldestOnScreen();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final freshness = ref.watch(priceFreshnessProvider);

    return Text(
      'The oldest thing here: ${freshness.caption}',
      style: BarbarianType.bodyS.copyWith(color: c.textMuted),
    );
  }
}

/// Paste the picture you were sent.
///
/// The board's flow: a screenshot arrives in a group, you paste it here, the
/// phone reads a name out of it and offers to open that company's file. The
/// reading is on-device and the board says so on the card itself, because the
/// promise only means anything where the picture is handed over.
///
/// The reader is not wired up yet — this is the affordance and the copy, and
/// pressing it says so rather than pretending. What it must never do is send
/// the image anywhere; the recogniser, when it lands, will be a local one.
class _PasteCard extends StatelessWidget {
  const _PasteCard();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return BPaperCard(
      radius: BarbarianRadius.xl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: c.accent.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(BarbarianRadius.sm),
                ),
                child: Icon(
                  Icons.image_outlined,
                  size: 18,
                  color: BarbarianPalette.onWash(c, c.accent),
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Text(
                  'Were you sent a picture with a name in it?',
                  style: BarbarianType.titleS.copyWith(color: c.textPrimary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Paste it exactly as it is. The picture is read on your phone and '
            'is not sent anywhere.',
            style: BarbarianType.bodyM.copyWith(
              color: c.textSecondary,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 14),
          BPressable(
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Reading a pasted picture is not built yet'),
              ),
            ),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 13),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: c.ink,
                borderRadius: BorderRadius.circular(BarbarianRadius.pill),
              ),
              child: Text(
                'Paste a screenshot',
                style: BarbarianType.labelS.copyWith(color: c.onInk),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The two questions that come before any name.
///
/// Both boards lead with "Can I get out?" — exit liquidity — ahead of anything
/// about a company, on the reasoning that on this exchange the way money comes
/// back is the thing most likely to go wrong and the thing least likely to be
/// asked about. Neither question is a view on a company, which is why they can
/// be asked in the app's own voice at all.
class _StandingQuestions extends StatelessWidget {
  const _StandingQuestions();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const BSectionLabel('Before a name'),
        const SizedBox(height: 10),
        _Question(
          title: 'Can I get out?',
          body:
              'Before you buy anything: how the money comes back to your hand, '
              'and what decides whether it can.',
          onTap: () => context.push(Routes.exitPath(BNavTab.ask)),
        ),
        const SizedBox(height: 10),
        _Question(
          title: 'How the scoring works',
          body:
              'Six pillars, a published rule for each, and the filing that '
              'would change it. Nothing here is a recommendation.',
          onTap: () =>
              context.push(Routes.cashOrTrashPath(BNavTab.ask)),
        ),
        const SizedBox(height: 12),
        Text(
          'We are a publisher, not licensed by the Financial Regulatory '
          'Authority. We do not buy, we do not sell, and we do not advise.',
          style: BarbarianType.bodyS.copyWith(
            color: c.textMuted,
            height: 1.5,
          ),
        ),
      ],
    );
  }

}

class _Question extends StatelessWidget {
  const _Question({
    required this.title,
    required this.body,
    required this.onTap,
  });

  final String title;
  final String body;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return BPressable(
      onTap: onTap,
      child: BPaperCard(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: BarbarianType.titleS.copyWith(color: c.textPrimary),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    body,
                    style: BarbarianType.bodyM.copyWith(
                      color: c.textSecondary,
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: c.textFaint,
            ),
          ],
        ),
      ),
    );
  }
}

/// The rest of the app, as a list of places rather than a bar of them.
class _WaysIn extends ConsumerWidget {
  const _WaysIn();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final directory = ref.watch(companyDirectoryProvider).value?.value;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const BSectionLabel('Everything else'),
        const SizedBox(height: 10),
        BPaperCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              _Way(
                label: 'The full directory',
                trailing: '${directory?.count ?? 282}',
                onTap: () =>
                    context.push(Routes.directoryPath(BNavTab.ask)),
              ),
              _Way(
                label: 'The rule record',
                trailing: 'every rule, and what happened after it',
                onTap: () => context.push(Routes.scannerPath(BNavTab.ask)),
              ),
              _Way(
                label: 'Discussion',
                trailing: 'not open yet',
                last: true,
                onTap: () => context.push(Routes.pitPath(BNavTab.ask)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Way extends StatelessWidget {
  const _Way({
    required this.label,
    required this.trailing,
    required this.onTap,
    this.last = false,
  });

  final String label;
  final String trailing;
  final VoidCallback onTap;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return BPressable(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(18, 15, 16, 15),
        foregroundDecoration: last ? null : BHairline.rowBottom(context),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: BarbarianType.bodyL.copyWith(color: c.textPrimary),
              ),
            ),
            Flexible(
              child: Text(
                trailing,
                textAlign: TextAlign.end,
                style: BarbarianType.bodyS.copyWith(color: c.textMuted),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 6),
            Icon(Icons.chevron_right_rounded, size: 18, color: c.textFaint),
          ],
        ),
      ),
    );
  }
}

/// What the search found.
class _Results extends StatelessWidget {
  const _Results({required this.results, required this.query});

  final List<CompanySummary> results;
  final String query;

  @override
  Widget build(BuildContext context) {
    if (results.isEmpty) {
      return BEmptyState(
        title: 'Nothing on the exchange matches "$query"',
        body:
            'The directory carries every listed company. If a name is not '
            'here, it is not listed — check the spelling, or try the symbol.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel('${results.length} found'),
        const SizedBox(height: 10),
        for (final company in results.take(40))
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: BPressable(
              onTap: () => context.push(
                Routes.companyPath(BNavTab.ask, company.ticker),
              ),
              child: BPaperCard(
                padding: const EdgeInsets.all(13),
                child: Row(
                  children: [
                    BTickerMonogram(company.ticker, size: 40),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            company.nameEn,
                            style: BarbarianType.bodyL.copyWith(
                              color: context.colors.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            company.sector ?? 'Sector not published',
                            style: BarbarianType.bodyS.copyWith(
                              color: context.colors.textMuted,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
