import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/connection.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/controls.dart';
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
class BConnectDots extends ConsumerWidget {
  const BConnectDots({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final doc = ref.watch(connectionsProvider).value?.value;
    final items = doc?.items ?? const <Connection>[];
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.dotsLabel),
        const SizedBox(height: 6),
        Text(
          l.dotsBody(doc?.windowDays ?? 4),
          style: BarbarianType.bodyM.copyWith(
            color: c.textSecondary,
            height: 1.45,
          ),
        ),
        const SizedBox(height: 12),
        for (final (i, item) in items.indexed) ...[
          if (i > 0) const SizedBox(height: 10),
          _Crossing(item: item),
        ],
      ],
    );
  }
}

class _Crossing extends StatelessWidget {
  const _Crossing({required this.item});

  final Connection item;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;

    return BPaperCard(
      radius: BarbarianRadius.xl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // The company, and a way to it.
          BPressable(
            onTap: () =>
                context.push(Routes.companyPath(BNavTab.home, item.ticker)),
            child: Row(
              children: [
                Text(
                  item.ticker,
                  style: BarbarianType.titleL.copyWith(color: c.textPrimary),
                ),
                const SizedBox(width: 8),
                Icon(Icons.north_east, size: 14, color: c.textFaint),
              ],
            ),
          ),
          const SizedBox(height: 7),
          BInsightLine(item.whyFor(arabic), maxLines: 3),
          const SizedBox(height: 12),
          for (final (n, strand) in item.strands.indexed) ...[
            if (n > 0) ...[
              const SizedBox(height: 10),
              Divider(height: 1, color: c.hairline),
              const SizedBox(height: 10),
            ],
            _StrandRow(strand: strand),
          ],
        ],
      ),
    );
  }
}

/// One thread, and the document behind it.
class _StrandRow extends StatelessWidget {
  const _StrandRow({required this.strand});

  final Strand strand;

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

    final row = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsetsDirectional.only(top: 2, end: 10),
          child: Icon(icon, size: 16, color: c.accent),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 2,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  BKindChip(label),
                  if (strand.date.isNotEmpty)
                    Text(
                      strand.date,
                      style: BarbarianType.labelNano.copyWith(
                        color: c.textMuted,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 5),
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
          ),
        ),
        if (strand.link.isNotEmpty)
          Padding(
            padding: const EdgeInsetsDirectional.only(start: 8, top: 2),
            child: Icon(Icons.north_east, size: 14, color: c.textFaint),
          ),
      ],
    );

    if (strand.link.isEmpty) return row;
    return BPressable(
      onTap: () => context.push(
        Routes.articlePath(
          BNavTab.home,
          strand.link,
          strand.kind == 'filing' ? 'EGX filing' : '',
        ),
      ),
      child: row,
    );
  }
}
