import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/brief.dart';
import '../../core/models/disclosure.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// What a company has done, what it has said it will do, and the counts.
///
/// A company page carries hundreds of Arabic filing titles. This is that pile
/// read once, at build time, into three things a person can actually use — and
/// the line under all three is that none of them says whether any of it is
/// good. A view on a named security's prospects is advice, and this publisher
/// is not licensed to give it (§8).
///
/// The line is not only stated to the reader, it is enforced upstream:
/// `build_company_briefs.py` refuses a whole brief if any sentence reads as an
/// instruction in either language, and drops any plan whose citation is not a
/// filing the company actually lodged.
class BCompanyBrief extends ConsumerWidget {
  const BCompanyBrief({required this.ticker, required this.parentTab, super.key});

  final String ticker;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final brief = ref.watch(companyBriefProvider(ticker)).value?.value;
    if (brief == null || brief.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // What the company *is*, before what its filings show it has done.
        // A reader who has never heard of the ticker needs this sentence
        // first; the record below only means something once they have it.
        if (brief.hasStory) ...[
          BSectionLabel(l.briefStoryLabel, bottomGap: 8),
          BPaperCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  brief.storyFor(arabic),
                  style: BarbarianType.bodyM.copyWith(
                    color: c.textPrimary,
                    height: 1.55,
                  ),
                ),
                if (brief.storySource.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  // Named on screen, because this is the one paragraph on the
                  // page that is not the exchange's own record.
                  Text(
                    l.briefStorySource(brief.storySource),
                    style: BarbarianType.labelNano.copyWith(color: c.textFaint),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
        BSectionLabel(l.briefHistoryLabel, bottomGap: 8),
        BPaperCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                brief.historyFor(arabic),
                style: BarbarianType.bodyM.copyWith(
                  color: c.textPrimary,
                  height: 1.55,
                ),
              ),
              if (brief.record case final BriefRecord record) ...[
                const SizedBox(height: 14),
                Divider(height: 1, color: c.hairline),
                const SizedBox(height: 12),
                _Record(record: record),
              ],
            ],
          ),
        ),
        if (brief.plans.isNotEmpty) ...[
          const SizedBox(height: 20),
          BSectionLabel(l.briefPlansLabel, bottomGap: 8),
          for (final plan in brief.plans) ...[
            _Plan(plan: plan, ticker: ticker, parentTab: parentTab),
            const SizedBox(height: 8),
          ],
        ],
        const SizedBox(height: 10),
        // Said out loud, in the reader's language, on the screen itself: this
        // is a record and not a recommendation.
        Text(
          '${l.briefSourceNote}\n${l.briefNoVerdict}',
          style: BarbarianType.bodyS.copyWith(color: c.textFaint, height: 1.5),
        ),
      ],
    );
  }
}

/// One announced intention, and the filing that announced it.
class _Plan extends ConsumerWidget {
  const _Plan({required this.plan, required this.ticker, required this.parentTab});

  final BriefPlan plan;
  final String ticker;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;
    // The filing behind the claim, so the row can open the source rather than
    // asking the reader to take our word for it.
    final documents = ref
        .watch(companyDocumentsProvider(ticker))
        .value
        ?.value
        .items;
    final source = () {
      for (final item in documents ?? const <FiledDocument>[]) {
        if (item.id == plan.id) return item;
      }
      return null;
    }();

    final row = BPaperCard(
      padding: const EdgeInsets.fromLTRB(14, 13, 14, 13),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsetsDirectional.only(top: 3, end: 10),
            child: Icon(Icons.flag_outlined, size: 16, color: c.accent),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  plan.textFor(arabic),
                  style: BarbarianType.bodyM.copyWith(
                    color: c.textPrimary,
                    height: 1.5,
                  ),
                ),
                if (source != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    source.date,
                    style: BarbarianType.labelNano.copyWith(color: c.textFaint),
                  ),
                ],
              ],
            ),
          ),
          if (source != null && source.link.isNotEmpty)
            Padding(
              padding: const EdgeInsetsDirectional.only(start: 8, top: 2),
              child: Icon(Icons.north_east, size: 14, color: c.textFaint),
            ),
        ],
      ),
    );

    if (source == null || source.link.isEmpty) return row;
    return BPressable(
      onTap: () => context.push(
        Routes.articlePath(parentTab, source.link, 'EGX filing'),
      ),
      child: row,
    );
  }
}

/// Counts, not judgements. Every one is arrived at by counting rows.
class _Record extends StatelessWidget {
  const _Record({required this.record});

  final BriefRecord record;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;

    final lines = <String>[
      [
        l.briefRecFilings(record.filings),
        if (record.firstFiling case final String since when since.isNotEmpty)
          l.briefRecSince(since.substring(0, 4)),
      ].join(' · '),
      l.briefRecSuspensions(record.suspensions),
      l.briefRecCapital(record.capitalIncreases),
      if (record.periodsReported > 0)
        l.briefRecLosses(record.lossMakingPeriods, record.periodsReported),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l.briefRecordLabel.toUpperCase(),
          style: BarbarianType.labelNano.copyWith(
            color: c.textMuted,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 8),
        for (final line in lines)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsetsDirectional.only(top: 6, end: 8),
                  child: Container(
                    width: 4,
                    height: 4,
                    decoration: BoxDecoration(
                      color: c.textFaint,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    line,
                    style: BarbarianType.bodyS.copyWith(
                      color: c.textSecondary,
                      height: 1.45,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
