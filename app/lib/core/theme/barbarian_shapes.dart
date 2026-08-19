import 'package:flutter/material.dart';

/// Radii, elevation, spacing and motion, transcribed from the design boards.
///
/// The boards' radii: 999 for every pill, 28 for a wide or hero card, 24 for
/// the default card, 20 for a small one and 16 for a tile.
@immutable
abstract final class BarbarianRadius {
  /// Pills, avatars, the floating nav, segmented controls. By far the most
  /// used shape in the design — 67 occurrences against 22 for the next.
  static const double pill = 999;

  /// The hero card and the company header.
  static const double xl = 28;

  /// The default card.
  static const double lg = 24;

  /// A small card.
  static const double md = 20;

  /// A tile: the ticker monogram, a soft icon button.
  static const double sm = 16;
  static const double xs = 12;
  static const double xxs = 10;
  static const double hair = 8;

  static BorderRadius all(double r) => BorderRadius.circular(r);

  static const BorderRadius card = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius hero = BorderRadius.all(Radius.circular(xl));
  static const BorderRadius chip = BorderRadius.all(Radius.circular(pill));
}

@immutable
abstract final class BarbarianShadow {
  /// The default card lift. `0 8px 24px rgba(27,25,23,.06)`.
  static const List<BoxShadow> card = [
    BoxShadow(
      color: Color(0x0F1B1917),
      blurRadius: 24,
      offset: Offset(0, 8),
    ),
  ];

  /// A card that sits above another. `0 8px 24px rgba(27,25,23,.08)`.
  static const List<BoxShadow> raised = [
    BoxShadow(
      color: Color(0x141B1917),
      blurRadius: 24,
      offset: Offset(0, 8),
    ),
  ];

  /// The selected segment in the floating nav. `0 8px 20px rgba(27,25,23,.16)`.
  static const List<BoxShadow> lifted = [
    BoxShadow(
      color: Color(0x291B1917),
      blurRadius: 20,
      offset: Offset(0, 8),
    ),
  ];

  /// The selected tab in a segmented row. `0 4px 12px rgba(27,25,23,.10)`.
  static const List<BoxShadow> tab = [
    BoxShadow(
      color: Color(0x1A1B1917),
      blurRadius: 12,
      offset: Offset(0, 4),
    ),
  ];
}

/// The boards work on a 4px rhythm, with 16–20px as the standard card inset.
@immutable
abstract final class BarbarianSpace {
  static const double xxs = 4;
  static const double xs = 6;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 14;
  static const double xl = 18;
  static const double xxl = 20;
  static const double xxxl = 28;

  /// Standard horizontal inset for a screen's content.
  static const double screenInset = 18;

  /// Vertical gap between stacked cards.
  static const double cardGap = 14;

  /// Room to leave at the bottom of a scroll view so the floating nav never
  /// covers the last row.
  static const double navClearance = 108;

  static const EdgeInsets card = EdgeInsets.all(xl);
  static const EdgeInsets screen = EdgeInsets.symmetric(horizontal: screenInset);
}

/// The canvas animates everything at `220ms ease-out`, with a `200ms` variant
/// for colour-only changes and a 9ms stagger on the gauge ticks.
@immutable
abstract final class BarbarianMotion {
  static const Duration fast = Duration(milliseconds: 200);
  static const Duration standard = Duration(milliseconds: 220);
  static const Duration slow = Duration(milliseconds: 420);

  /// Per-tick delay when the arc gauge fills.
  static const Duration tickStagger = Duration(milliseconds: 9);

  static const Curve easeOut = Curves.easeOut;
}
