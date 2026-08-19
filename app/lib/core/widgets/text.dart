import 'package:flutter/material.dart';

import '../theme/barbarian_theme.dart';
import 'motion.dart';

/// Numeric text.
///
/// Two jobs, both invisible until they are missing:
///
///  * **Tabular figures**, so a price column does not reflow as digits change.
///    See `BarbarianType` for why both families are safe here.
///  * **Bidi isolation.** A Latin price sitting inside an Arabic sentence or
///    beside an RTL company name will otherwise be reordered by the bidi
///    algorithm — `65.42` can render as `42.65` next to Arabic text. Wrapping
///    in an LTR isolate pins it (spec §41).
class BNumText extends StatelessWidget {
  const BNumText(
    this.value, {
    this.style,
    this.color,
    this.align,
    this.isolate = true,
    this.semanticsLabel,
    super.key,
  });

  final String value;
  final TextStyle? style;
  final Color? color;
  final TextAlign? align;

  /// Set false only when the surrounding widget already forces LTR.
  final bool isolate;

  final String? semanticsLabel;

  @override
  Widget build(BuildContext context) {
    final resolved = (style ?? BarbarianType.figureM).copyWith(color: color);

    final text = Text(
      value,
      style: resolved,
      textAlign: align,
      semanticsLabel: semanticsLabel,
    );

    if (!isolate) return text;

    // Directionality is a stronger guarantee than the U+2066 isolate character,
    // because it also governs how the paragraph itself is laid out.
    return Directionality(textDirection: TextDirection.ltr, child: text);
  }
}

/// An Arabic company name that sits beside Latin text.
///
/// Forces RTL for the name itself so it renders correctly even while the app is
/// in English, which is the normal case: the directory is bilingual long before
/// the interface is (spec §41).
class BArabicName extends StatelessWidget {
  const BArabicName(
    this.text, {
    this.style,
    this.color,
    this.maxLines = 1,
    super.key,
  });

  final String text;
  final TextStyle? style;
  final Color? color;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Text(
        text,
        style: (style ?? BarbarianType.bodyS).copyWith(
          color: color ?? context.colors.textMuted,
        ),
        maxLines: maxLines,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}

/// The uppercase tracked eyebrow that heads every block in the design, with an
/// optional trailing action on the same line.
class BSectionLabel extends StatelessWidget {
  const BSectionLabel(
    this.label, {
    this.trailing,
    this.onDark = false,
    this.bottomGap = 12,
    super.key,
  });

  final String label;
  final Widget? trailing;
  final bool onDark;
  final double bottomGap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final labelWidget = Text(
      // Arabic has no case, so uppercasing is gated on the script rather than
      // applied blindly (spec §41).
      _shouldUppercase(label) ? label.toUpperCase() : label,
      style: BarbarianType.labelMicro.copyWith(
        color: onDark ? c.onInkMuted : c.textMuted,
      ),
    );

    return Padding(
      padding: EdgeInsets.only(bottom: bottomGap),
      child: trailing == null
          ? labelWidget
          : Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [labelWidget, trailing!],
            ),
    );
  }

  static bool _shouldUppercase(String value) =>
      !RegExp(r'[؀-ۿ]').hasMatch(value);
}

/// The low-emphasis text action: "Manage", "Edit", "See all". No chrome.
class BInlineAction extends StatelessWidget {
  const BInlineAction(this.label, {this.onTap, this.onDark = false, super.key});

  final String label;
  final VoidCallback? onTap;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return BPressable(
      onTap: onTap,
      scale: 0.94,
      semanticLabel: label,
      child: Padding(
        // The visible text is small, so pad out to a 44px-tall target without
        // moving the text itself (spec §42).
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
        child: Text(
          label,
          style: BarbarianType.labelS.copyWith(
            color: onDark ? c.onInk : c.textPrimary,
          ),
        ),
      ),
    );
  }
}

/// The big display-light screen heading, with a reserved trailing slot.
class BScreenTitle extends StatelessWidget {
  const BScreenTitle(
    this.text, {
    this.subtitle,
    this.trailing,
    this.style,
    super.key,
  });

  final String text;
  final String? subtitle;
  final Widget? trailing;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final title = Text(
      text,
      style: (style ?? BarbarianType.displayM).copyWith(color: c.textPrimary),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (trailing == null)
          title
        else
          Row(
            children: [Expanded(child: title), trailing!],
          ),
        if (subtitle case final String s) ...[
          const SizedBox(height: BarbarianSpace.xs),
          Text(
            s,
            style: BarbarianType.bodyM.copyWith(color: c.textMuted),
          ),
        ],
      ],
    );
  }
}

/// The data-age line.
///
/// **Product rule:** no price, index level or financial figure renders without
/// one of these within sight of it. Stale data is always labelled as stale and
/// never dressed as live (spec §49). Fixture builds say so explicitly.
class BStalenessCaption extends StatelessWidget {
  const BStalenessCaption(this.text, {this.onDark = false, super.key});

  /// "Last close · 11 Aug 2026" — the honest phrasing for an end-of-day feed.
  factory BStalenessCaption.lastClose(String date, {bool onDark = false}) =>
      BStalenessCaption('Last close · $date', onDark: onDark);

  /// Used whenever the app is reading bundled fixtures, so sample prices are
  /// never mistaken for real ones.
  factory BStalenessCaption.sample({bool onDark = false}) =>
      BStalenessCaption('Sample data · not live prices', onDark: onDark);

  final String text;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Text(
      text,
      style: BarbarianType.bodyS.copyWith(
        color: onDark ? c.onInkMuted : c.textFaint,
      ),
    );
  }
}
