import 'package:flutter/material.dart';

import '../models/cash_or_trash.dart';
import 'barbarian_colors.dart';

/// Colour that carries meaning.
///
/// Every hue here descends from the website's five — blue `#1E37E6`, violet
/// `#7C3AED`, rose `#E11D74`, lime `#CDE84A`, cyan `#22D3EE` — so a sector
/// tile and the site's own gradient belong to the same family.
///
/// Nothing here is decorative, and nothing is the only carrier of its meaning:
/// every use sits beside a word, a mark or a number (spec §42). Each entry has
/// a light and a dark variant, because the same hue at the same saturation
/// cannot serve a near-white ground and an indigo one.
@immutable
abstract final class BarbarianPalette {
  // ---------------------------------------------------------------- verdicts

  /// The five Cash or Trash bands as a diverging ramp.
  ///
  /// The scale is signed and ordered, so the colour should be too: two greens
  /// above the line, a neutral at the middle, two reds below. Previously all
  /// five collapsed into three tones and Trash looked like Toxic.
  static Color verdict(BarbarianColors c, Verdict verdict) {
    final dark = c.isDark;
    return switch (verdict) {
      // Built from the site's own five hues rather than a generic red-green
      // ramp: teal and lime read as "good" against indigo without importing a
      // colour the brand does not own.
      Verdict.cash => dark ? const Color(0xFF3ED5A8) : const Color(0xFF0F9D76),
      Verdict.looseChange =>
        dark ? const Color(0xFFAFD84F) : const Color(0xFF7D9B1F),
      Verdict.recyclable =>
        dark ? const Color(0xFFB794F6) : const Color(0xFF7C3AED),
      Verdict.trash => dark ? const Color(0xFFFF8FB8) : const Color(0xFFDB3A7B),
      Verdict.toxic => dark ? const Color(0xFFFF6B6B) : const Color(0xFFC81E4A),
    };
  }

  /// A wash of the same hue, for a pill or a card tint.
  static Color verdictWash(BarbarianColors c, Verdict v) =>
      verdict(c, v).withValues(alpha: c.isDark ? 0.18 : 0.12);

  // ----------------------------------------------------------------- sectors

  /// A stable colour per sector.
  ///
  /// The twenty EGX sectors are named explicitly rather than hashed: a hash
  /// puts Finance and Utilities next to each other as often as not, and these
  /// are the labels a reader actually scans down a list. Anything unlisted
  /// falls back to a hash over the same curated set, so a new sector still
  /// gets a sensible colour instead of grey.
  static Color sector(BarbarianColors c, String? name) {
    if (name == null || name.isEmpty) return c.textMuted;
    final index = _sectorIndex[name] ?? (name.hashCode.abs() % _sectors.length);
    final ramp = _sectors[index % _sectors.length];
    return c.isDark ? ramp.$2 : ramp.$1;
  }

  static Color sectorWash(BarbarianColors c, String? name) =>
      sector(c, name).withValues(alpha: c.isDark ? 0.20 : 0.13);

  /// (light, dark) pairs. Warm-leaning and evenly spaced round the wheel, but
  /// pulled toward the brand's earthiness so no single tile shouts.
  static const List<(Color, Color)> _sectors = [
    (Color(0xFF1E37E6), Color(0xFF8FA2FF)), // brand blue  — Finance
    (Color(0xFF7C3AED), Color(0xFFB794F6)), // violet      — Process Industries
    (Color(0xFF0E7490), Color(0xFF5FE3F7)), // deep cyan   — Non-Energy Minerals
    (Color(0xFFE11D74), Color(0xFFFF6FA8)), // rose        — Consumer Services
    (Color(0xFF6D8B12), Color(0xFFC5E05A)), // lime        — Consumer Non-Durables
    (Color(0xFF0F9D76), Color(0xFF3ED5A8)), // teal        — Industrial Services
    (Color(0xFF9333EA), Color(0xFFCBA0FA)), // purple      — Health Technology
    (Color(0xFFC2410C), Color(0xFFFB9A6B)), // ember       — Distribution Services
    (Color(0xFF2563EB), Color(0xFF8BB3FF)), // azure       — Producer Manufacturing
    (Color(0xFFBE185D), Color(0xFFF582B4)), // magenta     — Health Services
    (Color(0xFF22D3EE), Color(0xFF7DE8F8)), // brand cyan  — Technology Services
    (Color(0xFF7E22CE), Color(0xFFC08CF2)), // grape       — Consumer Durables
    (Color(0xFF4D7C0F), Color(0xFFA8CE55)), // olive       — Retail Trade
    (Color(0xFF4338CA), Color(0xFF9A93F0)), // indigo      — Transportation
    (Color(0xFF0891B2), Color(0xFF62CFE4)), // lagoon      — Commercial Services
    (Color(0xFF8B5CF6), Color(0xFFBFA3FA)), // lilac       — Utilities
    (Color(0xFF0D9488), Color(0xFF4FCFC1)), // jade        — Communications
    (Color(0xFFB91C6B), Color(0xFFEE7CAE)), // fuchsia     — Energy Minerals
    (Color(0xFF3B4FD8), Color(0xFF8C99F2)), // cobalt      — Electronic Technology
    (Color(0xFF6B6591), Color(0xFFA9A3C8)), // muted indigo— Miscellaneous
  ];

  /// Index into [_sectors], in the order the EGX sectors actually appear by
  /// company count, so the biggest sectors get the most distinct hues.
  static const Map<String, int> _sectorIndex = {
    'Finance': 0,
    'Process Industries': 1,
    'Non-Energy Minerals': 2,
    'Consumer Services': 3,
    'Consumer Non-Durables': 4,
    'Industrial Services': 5,
    'Health Technology': 6,
    'Distribution Services': 7,
    'Producer Manufacturing': 8,
    'Health Services': 9,
    'Technology Services': 10,
    'Consumer Durables': 11,
    'Retail Trade': 12,
    'Transportation': 13,
    'Commercial Services': 14,
    'Utilities': 15,
    'Communications': 16,
    'Energy Minerals': 17,
    'Electronic Technology': 18,
    'Miscellaneous': 19,
  };

  // ------------------------------------------------------------ scan status

  /// The scanner's own status vocabulary, coloured by what it means rather
  /// than by which bucket it maps to.
  static Color scanStatus(BarbarianColors c, String? label) {
    final l = (label ?? '').toLowerCase();
    final dark = c.isDark;
    if (l.contains('persistent')) {
      return dark ? const Color(0xFF8FA2FF) : const Color(0xFF1E37E6);
    }
    if (l.contains('tape')) {
      return dark ? const Color(0xFFB794F6) : const Color(0xFF7C3AED);
    }
    if (l.contains('model trade')) {
      return dark ? const Color(0xFF3ED5A8) : const Color(0xFF0F9D76);
    }
    if (l.contains('expired') || l.contains('miss')) {
      return dark ? const Color(0xFFA9A3C8) : const Color(0xFF6B6591);
    }
    if (l.contains('denied') || l.contains('reject')) {
      return dark ? const Color(0xFFFF6B6B) : const Color(0xFFC81E4A);
    }
    return dark ? const Color(0xFF5FE3F7) : const Color(0xFF0E7490);
  }
}
