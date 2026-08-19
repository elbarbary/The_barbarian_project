import 'package:flutter/material.dart';

import '../models/cash_or_trash.dart';
import '../theme/barbarian_theme.dart';
import 'controls.dart';
import 'motion.dart';
import 'surfaces.dart';
import 'text.dart';

/// The 48×48 tile carrying a ticker. Used wherever a company appears in a
/// list, standing in for a logo the app does not have rights to.
///
/// The boards draw it as solid ink with bone letters. This is a wash of the
/// same ink with the ticker in full strength on top — the same object at a
/// weight a list of 282 rows can carry, where a column of solid black squares
/// reads as a ladder of holes. The boards never show more than four rows.
class BTickerMonogram extends StatelessWidget {
  const BTickerMonogram(
    this.ticker, {
    this.size = 48,
    this.sector,
    this.tone,
    super.key,
  });

  final String ticker;
  final double size;

  /// Kept for the callers that pass it; it no longer changes the hue.
  ///
  /// This used to tint the tile per sector, on the theory that twenty coloured
  /// squares let you see a screen was mostly Finance before reading a word.
  /// The row it appears on never names the sector, so hue was that fact's only
  /// carrier — which is what spec §42 forbids — and neither design board tints
  /// anything by category. See [BarbarianPalette.sector].
  final String? sector;

  /// Overrides the sector colour where a different dimension matters more —
  /// on Cash or Trash the verdict band is the thing being scanned for.
  final Color? tone;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // The verdict tile still carries a hue, because on Cash or Trash the band
    // IS the dimension being scanned for and every row prints its name.
    final resolved = tone ?? BarbarianPalette.sector(c, sector);
    final wash = tone != null
        ? tone!.withValues(alpha: c.isDark ? 0.24 : 0.16)
        : BarbarianPalette.sectorWash(c, sector);

    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: wash,
        borderRadius: BorderRadius.circular(BarbarianRadius.sm),
        border: Border.all(color: resolved.withValues(alpha: 0.30)),
      ),
      // EGX tickers run to five and six letters. Shrinking to fit keeps every
      // row the same height instead of letting ACAMD wrap and grow its row.
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          ticker,
          maxLines: 1,
          style: BarbarianType.titleS.copyWith(
            // The tile is a wash of this same tone, so the letters have to be
            // pulled off it — three of the five verdict bands fail at 12pt
            // printed undiluted on their own wash.
            color: tone == null ? resolved : BarbarianPalette.onWash(c, resolved),
            fontSize: 12,
            letterSpacing: 0.72,
          ),
        ),
      ),
    );
  }
}

/// The metric tile: a large light numeral with a label above or below.
class BStatTile extends StatelessWidget {
  const BStatTile({
    required this.label,
    required this.value,
    this.labelAbove = true,
    this.unit,
    this.caption,
    this.delta,
    this.radius = BarbarianRadius.md,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    super.key,
  });

  final String label;
  final String value;
  final bool labelAbove;
  final String? unit;
  final String? caption;
  final Widget? delta;
  final double radius;
  final EdgeInsets padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    final valueRow = Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Flexible(
          child: BNumText(
            value,
            style: BarbarianType.figureL.copyWith(color: c.textPrimary),
          ),
        ),
        if (unit case final String u) ...[
          const SizedBox(width: 4),
          Text(
            u,
            style: BarbarianType.bodyS.copyWith(color: c.textMuted),
          ),
        ],
      ],
    );

    final labelText = Text(
      label.toUpperCase(),
      style: BarbarianType.labelNano.copyWith(
        color: c.textMuted,
        letterSpacing: 1.2,
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );

    final card = BPaperCard(
      radius: radius,
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (labelAbove) ...[labelText, const SizedBox(height: 10)],
          valueRow,
          if (!labelAbove && caption != null) ...[
            const SizedBox(height: 6),
            Text(
              caption!,
              style: BarbarianType.bodyS.copyWith(
                color: c.textMuted,
                height: 1.3,
              ),
            ),
          ],
          if (!labelAbove && caption == null) ...[
            const SizedBox(height: 6),
            labelText,
          ],
          if (delta case final Widget d) ...[
            const SizedBox(height: 8),
            d,
          ],
        ],
      ),
    );

    return onTap == null ? card : BPressable(onTap: onTap, child: card);
  }
}

/// A leading block, a two-line middle, and a trailing block.
class BListRow extends StatelessWidget {
  const BListRow({
    required this.leading,
    required this.title,
    this.subtitle,
    this.subtitleIsArabic = false,
    this.trailing,
    this.onTap,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    this.asCard = true,
    super.key,
  });

  final Widget leading;
  final String title;
  final String? subtitle;
  final bool subtitleIsArabic;
  final Widget? trailing;
  final VoidCallback? onTap;
  final EdgeInsets padding;
  final bool asCard;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    final row = Row(
      children: [
        leading,
        const SizedBox(width: BarbarianSpace.lg),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                style: BarbarianType.titleM.copyWith(color: c.textPrimary),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (subtitle case final String s) ...[
                const SizedBox(height: 3),
                if (subtitleIsArabic)
                  BArabicName(s)
                else
                  Text(
                    s,
                    style: BarbarianType.bodyS.copyWith(
                      color: c.textMuted,
                      height: 1.3,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ],
          ),
        ),
        if (trailing case final Widget t) ...[
          const SizedBox(width: BarbarianSpace.md),
          t,
        ],
      ],
    );

    final content = asCard
        ? BPaperCard(padding: padding, child: row)
        : Padding(padding: padding, child: row);

    if (onTap == null) return content;
    return BPressable(
      onTap: onTap,
      scale: 0.99,
      // One merged label per row rather than six fragments read in sequence.
      semanticLabel: [
        title,
        if (subtitle != null && !subtitleIsArabic) subtitle,
      ].whereType<String>().join(', '),
      child: content,
    );
  }
}

/// Turns rows into a single card with hairline dividers between them.
class BGroupedListCard extends StatelessWidget {
  const BGroupedListCard({
    required this.rows,
    this.radius = BarbarianRadius.lg,
    this.horizontalPadding = 18,
    super.key,
  });

  final List<Widget> rows;
  final double radius;
  final double horizontalPadding;

  @override
  Widget build(BuildContext context) {
    return BPaperCard(
      radius: radius,
      padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < rows.length; i++)
            DecoratedBox(
              // foregroundDecoration so the divider costs no layout — see
              // BHairline for why this matters down a long list.
              decoration: const BoxDecoration(),
              position: DecorationPosition.foreground,
              child: Container(
                foregroundDecoration: i == rows.length - 1
                    ? null
                    : BHairline.rowBottom(context),
                child: rows[i],
              ),
            ),
        ],
      ),
    );
  }
}

enum BSegmentStyle { text, iconPill }

class BSegment {
  const BSegment({required this.label, this.icon});

  final String label;
  final IconData? icon;
}

/// The segmented selector, in the boards' two forms.
///
/// The design cross-fades each segment's own decoration rather than sliding a
/// shared indicator — the opposite of the bottom nav, deliberately.
class BSegmentedRow extends StatelessWidget {
  const BSegmentedRow({
    required this.segments,
    required this.selectedIndex,
    required this.onChanged,
    this.style = BSegmentStyle.text,
    super.key,
  });

  final List<BSegment> segments;
  final int selectedIndex;
  final ValueChanged<int> onChanged;
  final BSegmentStyle style;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    if (style == BSegmentStyle.text) {
      return BPaperCard(
        radius: BarbarianRadius.pill,
        padding: const EdgeInsets.all(4),
        child: Row(
          children: [
            for (var i = 0; i < segments.length; i++)
              Expanded(
                child: _TextSegment(
                  label: segments[i].label,
                  selected: i == selectedIndex,
                  onTap: () => onChanged(i),
                ),
              ),
          ],
        ),
      );
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        for (var i = 0; i < segments.length; i++)
          _IconPillSegment(
            segment: segments[i],
            selected: i == selectedIndex,
            onTap: () => onChanged(i),
            colors: c,
          ),
      ],
    );
  }
}

class _TextSegment extends StatelessWidget {
  const _TextSegment({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: AnimatedContainer(
          duration: BarbarianMotion.standard,
          curve: BarbarianMotion.easeOut,
          padding: const EdgeInsets.symmetric(vertical: 11),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? c.surfaceRaised : Colors.transparent,
            borderRadius: BorderRadius.circular(BarbarianRadius.pill),
            boxShadow: selected && !c.isDark ? BarbarianShadow.tab : null,
          ),
          child: Text(
            label,
            style: BarbarianType.label.copyWith(
              color: selected ? c.textPrimary : c.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}

class _IconPillSegment extends StatelessWidget {
  const _IconPillSegment({
    required this.segment,
    required this.selected,
    required this.onTap,
    required this.colors,
  });

  final BSegment segment;
  final bool selected;
  final VoidCallback onTap;
  final BarbarianColors colors;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: segment.label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: AnimatedContainer(
          duration: BarbarianMotion.standard,
          curve: BarbarianMotion.easeOut,
          width: 56,
          height: 62,
          decoration: BoxDecoration(
            color: selected
                ? colors.surfaceRaised
                : colors.textPrimary.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(BarbarianRadius.pill),
            boxShadow: selected && !colors.isDark
                ? BarbarianShadow.lifted
                : null,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                segment.icon ?? Icons.circle_outlined,
                size: 16,
                color: selected ? colors.textPrimary : colors.textMuted,
              ),
              const SizedBox(height: 6),
              Text(
                segment.label,
                style: BarbarianType.labelTiny.copyWith(
                  color: selected ? colors.textPrimary : colors.textMuted,
                  letterSpacing: 0,
                ),
                maxLines: 1,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The centred empty-state card (spec §49 — never a blank screen).
class BEmptyState extends StatelessWidget {
  const BEmptyState({
    required this.title,
    required this.body,
    this.actionLabel,
    this.onAction,
    this.ghost,
    super.key,
  });

  final String title;
  final String body;
  final String? actionLabel;
  final VoidCallback? onAction;

  /// A dimmed preview of what would be here, at 40% on the wrapper.
  final Widget? ghost;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return BPaperCard(
      radius: BarbarianRadius.xl,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (ghost case final Widget g) ...[
            // The ghost is drawn IN the card, so fading it toward transparent
            // fades it toward the card colour: at 0.4 a paper preview came out
            // at exactly the card's own cream. Desaturating and dimming leaves
            // a shape.
            Opacity(
              opacity: 0.55,
              child: ColorFiltered(
                colorFilter: const ColorFilter.matrix(<double>[
                  0.33, 0.33, 0.33, 0, 0,
                  0.33, 0.33, 0.33, 0, 0,
                  0.33, 0.33, 0.33, 0, 0,
                  0, 0, 0, 1, 0,
                ]),
                child: g,
              ),
            ),
            const SizedBox(height: 20),
          ],
          Text(
            title,
            textAlign: TextAlign.center,
            style: BarbarianType.headlineL.copyWith(color: c.textPrimary),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            textAlign: TextAlign.center,
            style: BarbarianType.bodyM.copyWith(color: c.textMuted),
          ),
          if (actionLabel case final String a) ...[
            const SizedBox(height: 18),
            BPressable(
              onTap: onAction,
              semanticLabel: a,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 22,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: c.actionSurface,
                  borderRadius: BorderRadius.circular(BarbarianRadius.pill),
                ),
                child: Text(
                  a,
                  style: BarbarianType.label.copyWith(color: c.onAction),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// The capsule search affordance.
class BSearchPill extends StatelessWidget {
  const BSearchPill({
    required this.text,
    this.isPlaceholder = true,
    this.onTap,
    this.controller,
    this.onChanged,
    super.key,
  });

  final String text;
  final bool isPlaceholder;
  final VoidCallback? onTap;

  /// When supplied the pill becomes a live field; otherwise it is a display row
  /// that opens search elsewhere.
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    final icon = Icon(Icons.search_rounded, size: 18, color: c.textMuted);

    if (controller != null) {
      return BPaperCard(
        radius: BarbarianRadius.pill,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
        child: Row(
          children: [
            icon,
            const SizedBox(width: BarbarianSpace.md),
            Expanded(
              child: TextField(
                controller: controller,
                onChanged: onChanged,
                style: BarbarianType.label.copyWith(color: c.textPrimary),
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  isDense: true,
                  filled: false,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  hintText: text,
                  hintStyle: BarbarianType.label.copyWith(color: c.textMuted),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return BPressable(
      onTap: onTap,
      scale: 0.99,
      semanticLabel: text,
      child: BPaperCard(
        radius: BarbarianRadius.pill,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        child: Row(
          children: [
            icon,
            const SizedBox(width: BarbarianSpace.md),
            Expanded(
              child: Text(
                text,
                style: BarbarianType.label.copyWith(
                  color: isPlaceholder ? c.textMuted : c.textPrimary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The Cash or Trash verdict mark.
///
/// Always emoji + word + score. Never colour alone (spec §42).
class BVerdictBadge extends StatelessWidget {
  const BVerdictBadge({
    required this.verdict,
    this.score,
    this.onDark = false,
    super.key,
  });

  final Verdict verdict;
  final int? score;
  final bool onDark;

  /// The band's own colour, from the diverging five-step ramp. The label
  /// still carries the meaning; this makes the ordering visible.
  Color tint(BarbarianColors c) => BarbarianPalette.verdict(c, verdict);

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // On ink the ramp lifts. [BarbarianPalette.verdict] deepens both ends
    // toward paper, which puts Toxic within 1.07:1 of the slab — a badge that
    // stops being a badge on precisely the card that shouts loudest.
    final colour = onDark
        ? BarbarianPalette.verdictOnInk(c, verdict)
        : tint(c);

    return Semantics(
      label: score == null
          ? verdict.sentence
          : '${verdict.sentence} The six sum to $score out of '
                '${CashOrTrashEntry.maxScore}.',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
        decoration: BoxDecoration(
          color: colour.withValues(alpha: onDark ? 0.24 : 0.16),
          borderRadius: BorderRadius.circular(BarbarianRadius.pill),
          border: Border.all(color: colour.withValues(alpha: 0.35)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(verdict.mark, style: const TextStyle(fontSize: 11)),
            const SizedBox(width: 5),
            // The bands describe the scorecard now — "Nearly all negative"
            // rather than "Toxic" — so the label is a phrase and not a word,
            // and a fixed-width badge on a research card cannot hold one. It
            // shrinks rather than overflowing; the sentence is on the file.
            Flexible(
              child: Text(
                verdict.label.toUpperCase(),
                style: BarbarianType.pill.copyWith(
                  color: onDark ? c.onInk : BarbarianPalette.onWash(c, colour),
                  letterSpacing: 0.8,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (score case final int s) ...[
              const SizedBox(width: 6),
              BNumText(
                s > 0 ? '+$s' : '$s',
                style: BarbarianType.pill.copyWith(
                  color: BarbarianPalette.onWash(c, colour),
                ),
                isolate: false,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// The research entry card, in its dark and light skins.
class BResearchCard extends StatelessWidget {
  const BResearchCard({
    required this.kicker,
    required this.title,
    this.meta,
    this.dark = true,
    this.trailing,
    this.width,
    this.onTap,
    this.titleMaxLines = 3,
    super.key,
  });

  final String kicker;
  final String title;
  final String? meta;
  final bool dark;
  final Widget? trailing;
  final double? width;
  final VoidCallback? onTap;
  final int titleMaxLines;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          kicker.toUpperCase(),
          style: BarbarianType.labelTiny.copyWith(
            color: dark ? c.onInkMuted : c.textMuted,
          ),
        ),
        const SizedBox(height: 12),
        // Flexible, not a bare Text: the card is used inside a fixed-height
        // horizontal rail, and a long editorial title would otherwise push the
        // meta line and the verdict badge past the bottom edge.
        Flexible(
          child: Text(
            title,
            style: BarbarianType.headlineM.copyWith(
              color: dark ? c.onInk : c.textPrimary,
            ),
            maxLines: titleMaxLines,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        if (meta case final String m) ...[
          const SizedBox(height: 10),
          Text(
            m,
            style: BarbarianType.bodyS.copyWith(
              color: dark ? c.onInkMuted : c.textMuted,
            ),
          ),
        ],
        if (trailing case final Widget t) ...[
          const SizedBox(height: 12),
          t,
        ],
      ],
    );

    final card = SizedBox(
      width: width,
      child: dark
          ? BDarkCard(child: content)
          : BPaperCard(child: content),
    );

    return onTap == null ? card : BPressable(onTap: onTap, child: card);
  }
}

/// The community discussion card.
class BPostCard extends StatelessWidget {
  const BPostCard({
    required this.title,
    this.kind,
    this.ticker,
    this.excerpt,
    this.author,
    this.ago,
    this.footer,
    this.onTap,
    super.key,
  });

  final String title;
  final String? kind;
  final String? ticker;
  final String? excerpt;
  final String? author;
  final String? ago;
  final Widget? footer;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return BPressable(
      onTap: onTap,
      child: BPaperCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (kind != null || ticker != null) ...[
              Row(
                children: [
                  if (kind case final String k)
                    BKindChip(k, variant: BChipVariant.ember),
                  if (kind != null && ticker != null)
                    const SizedBox(width: BarbarianSpace.sm),
                  if (ticker case final String t)
                    BKindChip(t, variant: BChipVariant.solid),
                ],
              ),
              const SizedBox(height: BarbarianSpace.lg),
            ],
            Text(
              title,
              style: BarbarianType.headlineM.copyWith(color: c.textPrimary),
            ),
            if (excerpt case final String e) ...[
              const SizedBox(height: 10),
              Text(
                e,
                style: BarbarianType.bodyM.copyWith(color: c.textSecondary),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (author case final String a) ...[
              const SizedBox(height: BarbarianSpace.lg),
              Row(
                children: [
                  const BAvatarHatch(size: 26),
                  const SizedBox(width: BarbarianSpace.sm),
                  Text(
                    ago == null ? a : '$a · $ago',
                    style: BarbarianType.bodyS.copyWith(color: c.textMuted),
                  ),
                ],
              ),
            ],
            if (footer case final Widget f) ...[
              const SizedBox(height: BarbarianSpace.lg),
              f,
            ],
          ],
        ),
      ),
    );
  }
}

/// The unlabelled column chart: company revenue history, quarterly margins.
///
/// A `CustomPaint` rather than `fl_chart` because the design's bars carry no
/// axes, no grid, no tooltip and no legend — configuring a chart library to
/// remove all of that costs more than drawing eight rectangles.
class BBarChart extends StatelessWidget {
  const BBarChart({
    required this.fractions,
    required this.labels,
    this.highlightIndex,
    this.height = 128,
    this.gap = 8,
    super.key,
  });

  /// Each bar's height as 0..1 of the plot.
  final List<double> fractions;

  final List<String> labels;
  final int? highlightIndex;
  final double height;
  final double gap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: height,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              for (var i = 0; i < fractions.length; i++) ...[
                if (i > 0) SizedBox(width: gap),
                Expanded(
                  child: FractionallySizedBox(
                    heightFactor: fractions[i].clamp(0.04, 1.0),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: i == highlightIndex
                            ? c.accent
                            : c.textPrimary.withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(
                          BarbarianRadius.xxs,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: BarbarianSpace.sm),
        Row(
          children: [
            for (var i = 0; i < labels.length; i++) ...[
              if (i > 0) SizedBox(width: gap),
              Expanded(
                child: Text(
                  labels[i],
                  textAlign: TextAlign.center,
                  style: BarbarianType.labelTiny.copyWith(
                    // The bar above it is the accent; the label under it is
                    // ink. At 9pt the accent measures 3.09:1 on paper, and
                    // the highlighted label is the one that has to be read.
                    color: i == highlightIndex ? c.textPrimary : c.textFaint,
                    letterSpacing: 0,
                  ),
                  maxLines: 1,
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}
