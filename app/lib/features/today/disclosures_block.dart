import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/disclosure.dart';
import '../../core/models/recency.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/filed_document.dart';
import '../../core/widgets/filing_actions.dart';
import '../../core/widgets/load_more.dart';
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
class BDisclosuresBlock extends ConsumerStatefulWidget {
  const BDisclosuresBlock({super.key});

  @override
  ConsumerState<BDisclosuresBlock> createState() => _BDisclosuresBlockState();
}

class _BDisclosuresBlockState extends ConsumerState<BDisclosuresBlock> {
  /// Months of the kept record the reader has asked for, oldest request last.
  ///
  /// The window document carries thirty days. Everything before that lives in
  /// per-month documents that are downloaded only when somebody presses for
  /// them, because the archive only grows and a reader who wants this week
  /// should not pay for last spring.
  final List<String> _opened = [];

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final feed = ref.watch(disclosuresProvider).value?.value;
    if (feed == null || feed.isEmpty) return const SizedBox.shrink();

    final checks = feed.worthALook;
    // Every filing the exchange published, not a tenth of them. There are 36
    // on a normal day and the whole point of the tab is that a reader can see
    // the lot rather than a sample somebody chose for them.
    final rest = feed.items.where((i) => i.weight != 'check').toList();

    // What is behind the window, and what of it has been opened.
    final archive = ref.watch(disclosureArchiveProvider).value?.value;
    final shown = {
      for (final i in [...checks, ...rest]) i.id,
    };
    final older = <Disclosure>[];
    for (final month in _opened) {
      final loaded = ref.watch(disclosureMonthProvider(month)).value?.value;
      for (final item in loaded?.items ?? const <Disclosure>[]) {
        if (shown.add(item.id)) older.add(item);
      }
    }
    older.sort((a, b) => b.date.compareTo(a.date));

    // The next month worth offering: the newest one not already opened that
    // holds something the window does not.
    final months = archive?.newestFirst ?? const <ArchivedMonth>[];
    ArchivedMonth? next;
    for (final month in months) {
      if (_opened.contains(month.month)) continue;
      next = month;
      break;
    }
    final waiting =
        _opened.isNotEmpty &&
        ref.watch(disclosureMonthProvider(_opened.last)).isLoading;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.homeFiledHero),
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
        for (final item in [...checks, ...rest, ...older])
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _Filing(item: item),
          ),
        if (next case final ArchivedMonth month) ...[
          const SizedBox(height: 2),
          BLoadMoreButton(
            label: l.exchangeSeeMore,
            note: l.exchangeShowingMonth(month.month, month.count),
            busy: waiting,
            onTap: () => setState(() => _opened.add(month.month)),
          ),
          const SizedBox(height: 10),
          Text(
            l.exchangeArchiveNote,
            style: BarbarianType.bodyS.copyWith(
              color: c.textFaint,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 10),
        ],
        Text(
          l.exchangeSourceNote,
          style: BarbarianType.bodyS.copyWith(color: c.textMuted, height: 1.5),
        ),
      ],
    );
  }
}

class _Filing extends ConsumerWidget {
  const _Filing({required this.item});

  final Disclosure item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final arabic = Directionality.of(context) == TextDirection.rtl;
    final c = context.colors;

    return BPressable(
      // The same question Home asks, so a row behaves the same wherever it is
      // read: the company, or the filing.
      onTap: item.link.isEmpty
          ? null
          : () => showFilingActions(
              context,
              ref,
              filing: item,
              from: BNavTab.today,
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
                      // Both tags shrink. Only the type tag used to, so the
                      // volume tag held its full natural width and shoved the
                      // row over its edge.
                      if (item.weight == 'check') ...[
                        Flexible(child: _CheckTag(ratio: item.evidence?.ratio)),
                        const SizedBox(width: 8),
                      ],
                      Flexible(
                        child: _TypeTag(label: item.eventLabelFor(arabic)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Ticker and age share one slot — "MOSC · Today". They were
                // two, and the second one took enough width off the Expanded
                // beside it to ellipsise a type label that had just got longer
                // ("Listing committee decision"), overflowing the row by 89px.
                //
                // The age itself is §49: without it a filing from four days
                // ago and one from this morning looked identical, which on an
                // exchange feed is the difference between news and history.
                // EGX publishes the day and not the hour, so this says
                // "Today" and never "0h ago".
                if ([
                      if (item.tickers.isNotEmpty)
                        item.tickers.length > 1
                            ? '${item.tickers.first} +${item.tickers.length - 1}'
                            : item.tickers.first,
                      context.filingAge(item.date),
                    ].nonNulls.join(' · ')
                    case final String meta when meta.isNotEmpty) ...[
                  Text(
                    meta,
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
              textDirection: isArabic(item.titleFor(arabic))
                  ? TextDirection.rtl
                  : TextDirection.ltr,
              child: Text(
                item.titleFor(arabic),
                style: BarbarianType.bodyL.copyWith(
                  color: c.textPrimary,
                  height: 1.5,
                ),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (item.meaningFor(arabic).isNotEmpty) ...[
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
                      item.meaningFor(arabic),
                      style: BarbarianType.bodyS.copyWith(
                        color: c.textSecondary,
                        height: 1.5,
                      ),
                    ),
                    if (item.becauseFor(arabic).isNotEmpty) ...[
                      const SizedBox(height: 7),
                      Text(
                        item.becauseFor(arabic),
                        style: BarbarianType.bodyS.copyWith(
                          color: c.textMuted,
                          height: 1.5,
                        ),
                      ),
                    ],
                    // The thing the company actually lodged. Everything above
                    // is our reading of the filing; this is the filing.
                    if (item.hasDocument) ...[
                      const SizedBox(height: 10),
                      for (final (i, url) in item.attachments.indexed) ...[
                        if (i > 0) const SizedBox(height: 8),
                        BFiledDocument(
                          url: url,
                          index: i,
                          count: item.attachments.length,
                        ),
                      ],
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
    final l = AppLocalizations.of(context);
    final r = ratio;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: c.hairline,
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
      ),
      // Was two hardcoded English strings in an Arabic-first app, and the
      // Text had no ellipsis — so at its natural width ("VOLUME 3.4x NORMAL")
      // it pushed the tag row 117px past its edge once filing type labels got
      // longer.
      child: Text(
        (r == null || r <= 0
                ? l.unusualVolume
                : l.homeVolumeKicker(r.toStringAsFixed(1)))
            .toUpperCase(),
        style: BarbarianType.labelNano.copyWith(color: c.textMuted),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}
