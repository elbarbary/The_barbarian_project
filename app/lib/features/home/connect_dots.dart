import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/connection.dart';
import '../../core/models/explainer.dart';
import '../../core/models/recency.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/explainer_sheet.dart';
import '../../core/widgets/insight.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// Where one company turned up in more than one feed in the same few days.
///
/// The app files everything under the surface it came from — filings in the
/// filings feed, headlines in the news feed, the session on the company
/// screen — so noticing that one company did all three on one day was work a
/// reader had to do themselves across three screens.
///
/// **Every strand is a link back to the thing it came from.** That is the
/// whole design: this section makes no claim of its own beyond "these
/// happened, and they were the same company". The sentence is written at build
/// time from fixed templates and refused if it ever reads as an instruction —
/// see `build_connections_api.py`.
///
/// The card was a stack of grey paragraphs for its first few builds and read
/// as a footnote. What it actually holds is a company, one line of why, the
/// count that makes it a fact about the day, and two or three documents — so
/// it is now built in that order: an identified header, a dark panel for the
/// shared fact, and the documents on a drawn thread. The thread is not
/// decoration. "Connecting the dots" is the name of the section; a reader
/// should be able to see the connection without reading the heading.
class BConnectDots extends ConsumerWidget {
  const BConnectDots({this.parentTab = BNavTab.home, super.key});

  /// Which navigation slot stays lit when a company or a document opens from
  /// here. Hard-coded to Home while this block lived only on Home; it is on
  /// Today now, and a push that lights the wrong tab is the one navigation
  /// rule `router.dart` is explicit about.
  final BNavTab parentTab;

  /// The explanation, in the shape every other number in the app opens.
  ///
  /// On the screen this is one line and a dotted link. The three paragraphs
  /// that used to sit above the first card are all still here, one tap away —
  /// which is where a definition belongs once a reader has read it once.
  static Explainer explainer(AppLocalizations l, int days) => Explainer(
    termId: 'connection.crossing',
    title: l.dotsExplainerTitle,
    plain: l.dotsExplainerPlain,
    token: '2+',
    workings: l.dotsExplainerWorkings(days),
    yardstick: l.dotsExplainerYardstick,
    // Being in two feeds at once is not a published band and this app is not
    // going to invent one.
    notability: Notability.unjudged,
    source: 'EGX',
  );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final doc = ref.watch(connectionsProvider).value?.value;
    final items = doc?.items ?? const <Connection>[];
    if (items.isEmpty) return const SizedBox.shrink();
    final days = doc?.windowDays ?? 4;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(
          l.dotsLabel,
          bottomGap: 6,
          trailing: BPressable(
            onTap: () => showExplainer(context, explainer(l, days)),
            child: BDottedUnderline(
              child: Text(
                l.learnMore,
                style: BarbarianType.labelS.copyWith(color: c.accent),
              ),
            ),
          ),
        ),
        Text(
          l.dotsBody(days),
          style: BarbarianType.bodyM.copyWith(color: c.textSecondary),
        ),
        const SizedBox(height: 12),
        for (final (i, item) in items.indexed) ...[
          if (i > 0) const SizedBox(height: 12),
          _Crossing(item: item, parentTab: parentTab),
        ],
      ],
    );
  }
}

class _Crossing extends StatelessWidget {
  const _Crossing({required this.item, required this.parentTab});

  final Connection item;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final arabic = Directionality.of(context) == TextDirection.rtl;

    return BPaperCard(
      radius: BarbarianRadius.xl,
      padding: EdgeInsets.zero,
      clip: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Header(item: item, parentTab: parentTab, arabic: arabic),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 13, 16, 15),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                BInsightLine(item.whyFor(arabic), maxLines: 3),
                // What the documents have in common, which is the reason they
                // are on one card. Absent where there is nothing countable to
                // say — a card that always has a second sentence teaches a
                // reader to skip it.
                if (item.insightFor(arabic) case final String note) ...[
                  const SizedBox(height: 12),
                  _Shared(note: note),
                ],
                const SizedBox(height: 14),
                _Thread(strands: item.strands, parentTab: parentTab),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// The company, and a way to it — on its own tinted band.
///
/// The card used to open with four letters in the same beige as everything
/// under them, so a screenful of crossings was a screenful of identical
/// rectangles. A monogram, the name and the session's own figures give each
/// one a face before a word is read.
class _Header extends StatelessWidget {
  const _Header({
    required this.item,
    required this.parentTab,
    required this.arabic,
  });

  final Connection item;
  final BNavTab parentTab;
  final bool arabic;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final change = item.changePercent;
    final name = item.nameFor(arabic);

    return BPressable(
      onTap: () => context.push(Routes.companyPath(parentTab, item.ticker)),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 13, 14, 13),
        decoration: BoxDecoration(
          color: c.accent.withValues(alpha: c.isDark ? 0.13 : 0.07),
          border: Border(bottom: BorderSide(color: c.hairline)),
        ),
        child: Row(
          children: [
            BTickerMonogram(item.ticker, size: 40, sector: item.sector),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          item.ticker,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: BarbarianType.titleM.copyWith(
                            color: c.textPrimary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Icon(Icons.north_east, size: 13, color: c.textFaint),
                    ],
                  ),
                  if (name != null) ...[
                    const SizedBox(height: 1),
                    if (arabic)
                      BArabicName(name, color: c.textMuted)
                    else
                      BLatinName(name, color: c.textMuted),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (change != null)
                  BChangeDelta(
                    value: '${(change.abs() * 100).toStringAsFixed(2)}%',
                    direction: BDirection.of(change),
                  ),
                // Only where the session is one of the strands. Every card
                // carries a ratio, and printing 1.09× beside a company whose
                // crossing was a filing and a headline contradicts the number
                // the rest of the app teaches: 2× is the line, and a figure
                // under it is not what put this company on the screen.
                if (item.kinds.contains('session'))
                  if (item.ratio case final double ratio) ...[
                    if (change != null) const SizedBox(height: 5),
                    Text(
                      l.dotsVolume(ratio.toStringAsFixed(2)),
                      style: BarbarianType.labelNano.copyWith(
                        color: c.textMuted,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// The count that turns a card about one company into a fact about the day.
///
/// Dark, because it is the one line on the card the reader could not have got
/// from any single document — and because a grey box inside a beige card is
/// invisible at arm's length, which is what this was.
class _Shared extends StatelessWidget {
  const _Shared({required this.note});

  final String note;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);

    return BDarkCard(
      radius: BarbarianRadius.md,
      padding: const EdgeInsets.fromLTRB(13, 11, 13, 12),
      gradient: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.hub_outlined, size: 13, color: c.accentOnInk),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  l.dotsWhatTheyShare.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: BarbarianType.labelNano.copyWith(
                    color: c.accentOnInk,
                    letterSpacing: 0.7,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 7),
          Text(
            note,
            style: BarbarianType.bodyM.copyWith(color: c.onInk, height: 1.5),
          ),
        ],
      ),
    );
  }
}

/// The documents, on a drawn thread.
///
/// The rows were separated by full-width dividers, which said "these are three
/// unrelated things" on a card whose entire claim is that they are not. A
/// line through a dot per document says the opposite, in less ink.
class _Thread extends StatelessWidget {
  const _Thread({required this.strands, required this.parentTab});

  final List<Strand> strands;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (n, strand) in strands.indexed)
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _ThreadGutter(first: n == 0, last: n == strands.length - 1),
                const SizedBox(width: 11),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(
                      bottom: n == strands.length - 1 ? 0 : 14,
                    ),
                    child: _StrandRow(strand: strand, parentTab: parentTab),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// The dot, and the line to the next one.
class _ThreadGutter extends StatelessWidget {
  const _ThreadGutter({required this.first, required this.last});

  final bool first;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return SizedBox(
      width: 9,
      child: Column(
        children: [
          // A stub above the first dot would dangle from nothing.
          SizedBox(
            height: 5,
            child: first
                ? null
                : Center(child: Container(width: 1.5, color: c.hairlineStrong)),
          ),
          Container(
            width: 9,
            height: 9,
            decoration: BoxDecoration(color: c.accent, shape: BoxShape.circle),
          ),
          if (!last)
            Expanded(
              child: Center(
                child: Container(width: 1.5, color: c.hairlineStrong),
              ),
            ),
        ],
      ),
    );
  }
}

/// One thread, and the document behind it.
class _StrandRow extends StatelessWidget {
  const _StrandRow({required this.strand, required this.parentTab});

  final Strand strand;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final arabic = Directionality.of(context) == TextDirection.rtl;

    final (label, icon) = switch (strand.kind) {
      'filing' => (l.dotsFiling, Icons.description_outlined),
      'news' => (l.dotsNews, Icons.article_outlined),
      _ => (l.dotsSession, Icons.show_chart),
    };

    // A session is a number rather than a document, so it says the number.
    final title = strand.kind == 'session'
        ? l.dotsVolume((strand.ratio ?? 0).toStringAsFixed(2))
        : strand.titleFor(arabic);

    final row = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 13, color: c.textMuted),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label.toUpperCase(),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: BarbarianType.labelNano.copyWith(
                  color: c.textMuted,
                  letterSpacing: 0.7,
                ),
              ),
            ),
            if (context.filingAge(strand.date) case final age?) ...[
              const SizedBox(width: 7),
              Flexible(
                child: Text(
                  age,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: BarbarianType.labelNano.copyWith(color: c.textFaint),
                ),
              ),
            ],
            const Spacer(),
            if (strand.link.isNotEmpty)
              Icon(Icons.north_east, size: 13, color: c.textFaint),
          ],
        ),
        const SizedBox(height: 4),
        Directionality(
          textDirection: isArabic(title)
              ? TextDirection.rtl
              : TextDirection.ltr,
          child: Text(
            title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: BarbarianType.bodyM.copyWith(
              color: c.textPrimary,
              height: 1.4,
            ),
          ),
        ),
      ],
    );

    if (strand.link.isEmpty) return row;
    return BPressable(
      onTap: () => context.push(
        Routes.articlePath(
          parentTab,
          strand.link,
          strand.kind == 'filing' ? 'EGX filing' : '',
        ),
      ),
      child: row,
    );
  }
}
