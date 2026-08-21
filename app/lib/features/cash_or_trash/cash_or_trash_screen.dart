import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/cash_or_trash.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/arc_gauge.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/legal.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';

/// Cash or Trash (spec §9, §10).
///
/// The scale is signed: six pillars at roughly −10..+10 each, so a company
/// lands somewhere in −60..+60. The gauge is centre-anchored for exactly that
/// reason — see [BGaugeMode.fromCentre].
class CashOrTrashScreen extends ConsumerStatefulWidget {
  const CashOrTrashScreen({required this.parentTab, super.key});

  final BNavTab parentTab;

  @override
  ConsumerState<CashOrTrashScreen> createState() => _CashOrTrashScreenState();
}

enum _Sort { score, recent, ticker }

class _CashOrTrashScreenState extends ConsumerState<CashOrTrashScreen> {
  final TextEditingController _search = TextEditingController();
  String _query = '';
  Verdict? _filter;
  _Sort _sort = _Sort.score;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<CashOrTrashEntry> _visible(CashOrTrashIndex index) {
    final q = _query.trim().toLowerCase();
    final entries = index.companies.where((e) {
      if (_filter != null && e.verdict != _filter) return false;
      if (q.isEmpty) return true;
      return e.ticker.toLowerCase().contains(q) ||
          e.name.toLowerCase().contains(q);
    }).toList();

    entries.sort(switch (_sort) {
      _Sort.score => (a, b) => b.score.compareTo(a.score),
      _Sort.recent => (a, b) => (b.studiedAt ?? '').compareTo(
        a.studiedAt ?? '',
      ),
      _Sort.ticker => (a, b) => a.ticker.compareTo(b.ticker),
    });
    return entries;
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final async = ref.watch(cashOrTrashProvider);

    return BDetailScaffold(
      blockGap: 18,
      children: [
        Row(
          children: [
            BSoftIconButton(
              icon: Icons.arrow_back_ios_new_rounded,
              semanticLabel: l.back,
              onTap: () => Navigator.of(context).maybePop(),
            ),
          ],
        ),
        BAsyncView(
          value: async,
          errorTitle: 'The pillar index is not on the device yet',
          errorBody:
              'Open it once with a connection and it stays on the device.',
          data: (sourced) {
            final index = sourced.value;
            if (index.isEmpty) {
              return BEmptyState(
                title: l.cotNoneYet,
                body:
                    'Companies appear here one at a time, after each has been '
                    'read in full.',
              );
            }

            final entries = _visible(index);

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                BScreenTitle(
                  'Six Pillars',
                  subtitle:
                      '${index.studiedCount} of ${index.total} investigated',
                ),
                const SizedBox(height: 18),
                BSearchPill(
                  text: 'Search ticker or company',
                  controller: _search,
                  onChanged: (v) => setState(() => _query = v),
                ),
                const SizedBox(height: 14),
                _VerdictFilter(
                  present: index.presentVerdicts,
                  selected: _filter,
                  counts: {
                    for (final v in index.presentVerdicts)
                      v: index.withVerdict(v).length,
                  },
                  onChanged: (v) => setState(() => _filter = v),
                ),
                const SizedBox(height: 12),
                _SortRow(
                  sort: _sort,
                  onChanged: (s) => setState(() => _sort = s),
                ),
                const SizedBox(height: 18),
                if (entries.isEmpty)
                  BEmptyState(
                    title: l.cotNoMatch,
                    body: _query.isEmpty
                        ? 'No company has landed in that band yet.'
                        : 'No investigated company matches "$_query". Try a '
                              'ticker, or clear the filter.',
                    actionLabel: 'Clear filters',
                    onAction: () => setState(() {
                      _query = '';
                      _search.clear();
                      _filter = null;
                    }),
                  )
                else
                  for (final entry in entries) ...[
                    _VerdictCard(entry: entry, parentTab: widget.parentTab),
                    const SizedBox(height: 12),
                  ],
                const SizedBox(height: 6),
                Text(
                  'Scores run from ${CashOrTrashEntry.minScore} to '
                  '+${CashOrTrashEntry.maxScore} across six pillars: '
                  'valuation, earnings quality, growth, balance sheet, '
                  'tradability and governance.',
                  // On the page ramp rather than on a card, where textFaint
                  // measures 3.7–4.1:1 at this size.
                  style: BarbarianType.bodyS.copyWith(color: c.textSecondary),
                ),
                const SizedBox(height: 14),
                const BLegalFootnote(),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _VerdictFilter extends StatelessWidget {
  const _VerdictFilter({
    required this.present,
    required this.selected,
    required this.counts,
    required this.onChanged,
  });

  final List<Verdict> present;
  final Verdict? selected;
  final Map<Verdict, int> counts;
  final ValueChanged<Verdict?> onChanged;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 34,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.zero,
        children: [
          BKindChip(
            'All',
            variant: selected == null
                ? BChipVariant.solid
                : BChipVariant.neutral,
            onTap: () => onChanged(null),
          ),
          for (final verdict in present) ...[
            const SizedBox(width: 8),
            _VerdictChip(
              verdict: verdict,
              count: counts[verdict] ?? 0,
              selected: selected == verdict,
              onTap: () => onChanged(selected == verdict ? null : verdict),
            ),
          ],
        ],
      ),
    );
  }
}

/// A band filter in that band's own colour, so the row reads as the scale.
class _VerdictChip extends StatelessWidget {
  const _VerdictChip({
    required this.verdict,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  final Verdict verdict;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final tone = BarbarianPalette.verdict(c, verdict);
    return BPressable(
      onTap: onTap,
      scale: 0.96,
      // The count and the word are in the label, so the chip never relies on
      // its fill to say what it is (spec §42).
      semanticLabel: '${verdict.label}, $count companies',
      child: AnimatedContainer(
        duration: BarbarianMotion.fast,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? tone : BarbarianPalette.verdictWash(c, verdict),
          borderRadius: BorderRadius.circular(BarbarianRadius.pill),
          border: Border.all(
            color: tone.withValues(alpha: selected ? 1 : 0.35),
          ),
        ),
        child: Text(
          '${verdict.mark} ${verdict.label} $count',
          style: BarbarianType.pill.copyWith(
            // Unselected, the chip is a wash of this same band, and four of
            // the five bands fail 4.5:1 printed undiluted on it at 10pt.
            color: selected ? c.surface : BarbarianPalette.onWash(c, tone),
          ),
        ),
      ),
    );
  }
}

class _SortRow extends StatelessWidget {
  const _SortRow({required this.sort, required this.onChanged});

  final _Sort sort;
  final ValueChanged<_Sort> onChanged;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return BSegmentedRow(
      segments: [
        BSegment(label: l.sortByScore),
        BSegment(label: l.sortMostRecent),
        const BSegment(label: 'A–Z'),
      ],
      selectedIndex: _Sort.values.indexOf(sort),
      onChanged: (i) => onChanged(_Sort.values[i]),
    );
  }
}

class _VerdictCard extends ConsumerWidget {
  const _VerdictCard({required this.entry, required this.parentTab});

  final CashOrTrashEntry entry;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final config = ref.watch(appConfigProvider);

    return BPressable(
      onTap: () => context.push(Routes.companyPath(parentTab, entry.ticker)),
      child: BPaperCard(
        radius: BarbarianRadius.xl,
        // A hairline in the band's colour: enough to group the list visually
        // without turning seven cards into seven blocks of colour.
        foregroundDecoration: BoxDecoration(
          borderRadius: BorderRadius.circular(BarbarianRadius.xl),
          border: Border.all(
            color: BarbarianPalette.verdict(
              c,
              entry.verdict,
            ).withValues(alpha: 0.28),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                BTickerMonogram(
                  entry.ticker,
                  size: 44,
                  tone: BarbarianPalette.verdict(c, entry.verdict),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entry.ticker,
                        style: BarbarianType.titleL.copyWith(
                          color: c.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        entry.name,
                        style: BarbarianType.bodyS.copyWith(
                          color: c.textMuted,
                          height: 1.3,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                _ScoreMark(entry: entry),
              ],
            ),
            const SizedBox(height: 14),
            BVerdictBadge(verdict: entry.verdict, score: entry.score),
            if (entry.summary case final String s) ...[
              const SizedBox(height: 12),
              Text(
                s,
                style: BarbarianType.bodyM.copyWith(color: c.textSecondary),
              ),
            ],
            if (entry.flags.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [for (final flag in entry.flags) BKindChip(flag)],
              ),
            ],
            if (entry.pillars.isNotEmpty) ...[
              const SizedBox(height: 14),
              _PillarBars(pillars: entry.pillars),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                if (entry.hasArticle)
                  Expanded(
                    child: _CardAction(
                      label: l.readInvestigation,
                      filled: true,
                      onTap: () => context.push(
                        Routes.articlePath(
                          parentTab,
                          config.resolveArticleUrl(entry.articleUrl!),
                          '${entry.ticker} · Six Pillars',
                        ),
                      ),
                    ),
                  )
                else
                  Expanded(
                    child: Text(
                      'Full write-up in the criteria file',
                      style: BarbarianType.bodyS.copyWith(color: c.textFaint),
                    ),
                  ),
                const SizedBox(width: 10),
                _CardAction(
                  label: l.companyLabel,
                  onTap: () =>
                      context.push(Routes.companyPath(parentTab, entry.ticker)),
                ),
              ],
            ),
            // Travels with the card. A ticker, a signed score and a coloured
            // band is what gets screenshotted and forwarded, and the full
            // statement at the foot of the scroll does not go with it.
            const BLegalMark(),
          ],
        ),
      ),
    );
  }
}

/// The signed score, shown as a number *and* a position on the band.
class _ScoreMark extends StatelessWidget {
  const _ScoreMark({required this.entry});

  final CashOrTrashEntry entry;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final positive = entry.score > 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        BNumText(
          positive ? '+${entry.score}' : '${entry.score}',
          style: BarbarianType.figureL.copyWith(
            color: BarbarianPalette.verdict(c, entry.verdict),
          ),
        ),
        Text(
          'of ${CashOrTrashEntry.maxScore}',
          style: BarbarianType.labelTiny.copyWith(
            color: c.textFaint,
            letterSpacing: 0,
          ),
        ),
      ],
    );
  }
}

/// Six pillars as a diverging bar row, zero at the centre line.
class _PillarBars extends StatelessWidget {
  const _PillarBars({required this.pillars});

  final List<PillarScore> pillars;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final p in pillars)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 3),
            child: Semantics(
              label: '${p.pillar} ${p.score > 0 ? "plus" : ""} ${p.score}',
              excludeSemantics: true,
              child: Row(
                children: [
                  SizedBox(
                    width: 96,
                    child: Text(
                      p.pillar,
                      style: BarbarianType.labelTiny.copyWith(
                        color: c.textMuted,
                        letterSpacing: 0,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Expanded(
                    child: CustomPaint(
                      size: const Size.fromHeight(8),
                      painter: _DivergingBarPainter(
                        // Pillars run about −10..+10.
                        fraction: (p.score / 10).clamp(-1.0, 1.0),
                        positive: c.up,
                        negative: c.down,
                        track: c.hairline,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 26,
                    child: BNumText(
                      p.score > 0 ? '+${p.score}' : '${p.score}',
                      align: TextAlign.end,
                      style: BarbarianType.labelTiny.copyWith(
                        color: p.score == 0
                            ? c.textMuted
                            : (p.score > 0 ? c.up : c.down),
                        letterSpacing: 0,
                      ),
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

class _DivergingBarPainter extends CustomPainter {
  const _DivergingBarPainter({
    required this.fraction,
    required this.positive,
    required this.negative,
    required this.track,
  });

  final double fraction;
  final Color positive;
  final Color negative;
  final Color track;

  @override
  void paint(Canvas canvas, Size size) {
    final mid = size.width / 2;
    final y = size.height / 2;

    canvas.drawLine(
      Offset(0, y),
      Offset(size.width, y),
      Paint()
        ..color = track
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round,
    );

    if (fraction == 0) return;
    final extent = mid * fraction.abs();
    canvas.drawLine(
      Offset(mid, y),
      Offset(fraction > 0 ? mid + extent : mid - extent, y),
      Paint()
        ..color = fraction > 0 ? positive : negative
        ..strokeWidth = 4
        ..strokeCap = StrokeCap.round,
    );

    // The zero tick, so an empty bar and a missing bar are distinguishable.
    canvas.drawLine(
      Offset(mid, 0),
      Offset(mid, size.height),
      Paint()
        ..color = track
        ..strokeWidth = 1,
    );
  }

  @override
  bool shouldRepaint(_DivergingBarPainter old) => old.fraction != fraction;
}

class _CardAction extends StatelessWidget {
  const _CardAction({
    required this.label,
    required this.onTap,
    this.filled = false,
  });

  final String label;
  final VoidCallback onTap;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return BPressable(
      onTap: onTap,
      semanticLabel: label,
      child: Container(
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        decoration: BoxDecoration(
          color: filled
              ? c.actionSurface
              : c.textPrimary.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(BarbarianRadius.pill),
        ),
        child: Text(
          label,
          style: BarbarianType.label.copyWith(
            color: filled ? c.onAction : c.textPrimary,
          ),
        ),
      ),
    );
  }
}
