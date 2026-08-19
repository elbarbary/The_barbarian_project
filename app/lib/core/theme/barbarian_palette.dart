import 'package:flutter/material.dart';

import '../models/cash_or_trash.dart';
import 'barbarian_colors.dart';

/// Colour that carries meaning.
///
/// The rule the ESTHMR boards work by, read off what they draw rather than
/// what they say: **hue means outcome**. Ink, one orange, and a signed pair.
/// Chips are semantic or stateful — pass, fail, unresolved, selected — and
/// never taxonomic. Nothing on either board is coloured because of what
/// category it belongs to.
///
/// That is why there is no sector ramp here any more. See [sector].
///
/// Nothing below is the only carrier of its meaning (spec §42). The verdict
/// bands are two hues apart at their extremes and every consumer renders the
/// band's name; the scan statuses are five tones and every consumer renders
/// the status word.
@immutable
abstract final class BarbarianPalette {
  // ---------------------------------------------------------------- verdicts

  /// The five Cash or Trash bands as a diverging ramp.
  ///
  /// Anchored to the boards' own direction pair at the ends and walked through
  /// olive and stone in between, so the scale belongs to one colour system
  /// rather than importing a second.
  ///
  /// The ramp is *glanceable*, not readable: confined to warm hues and held
  /// above 4.5:1 on paper, the best achievable separation between adjacent
  /// bands is about 1.08:1 in luminance, and Cash against Trash is 1.03:1 —
  /// the two ends are the same brightness. The band **name** is what makes it
  /// readable, and every consumer draws one.
  static Color verdict(BarbarianColors c, Verdict verdict) {
    final dark = c.isDark;
    return switch (verdict) {
      Verdict.cash => dark ? const Color(0xFF8FC0A3) : const Color(0xFF3F6B52),
      Verdict.looseChange =>
        dark ? const Color(0xFF9CA95A) : const Color(0xFF607023),
      // The middle band is the boards' own answer for "no direction": warm
      // stone, drawn from the text ramp rather than invented as a sixth hue.
      Verdict.recyclable =>
        dark ? const Color(0xFF9C938B) : const Color(0xFF756E68),
      Verdict.trash => dark ? const Color(0xFFD2725C) : const Color(0xFFA3402F),
      Verdict.toxic => dark ? const Color(0xFFF0705A) : const Color(0xFF7C2C22),
    };
  }

  /// A wash of the same hue, for a pill or a card tint.
  ///
  /// Raised from the old 0.12/0.18: these bands are deeper than the hues they
  /// replace, and on opaque paper — rather than over a moving gradient — a
  /// 12% wash of a dark forest is nearly the card colour.
  static Color verdictWash(BarbarianColors c, Verdict v) =>
      verdict(c, v).withValues(alpha: c.isDark ? 0.24 : 0.16);

  /// The band drawn on the ink slab.
  ///
  /// [verdict] deepens both ends toward paper, which puts Toxic within 1.07:1
  /// of ink — the badge stops being a badge. On ink the whole ramp lifts.
  static Color verdictOnInk(BarbarianColors c, Verdict verdict) =>
      switch (verdict) {
        Verdict.cash => const Color(0xFF8FC0A3),
        Verdict.looseChange => const Color(0xFFB9C46F),
        Verdict.recyclable => const Color(0xFFB0A79E),
        Verdict.trash => const Color(0xFFD97D64),
        Verdict.toxic => const Color(0xFFF08A72),
      };

  // ------------------------------------------------------------- on a wash

  /// A tone's own label, when it is printed on a wash of itself.
  ///
  /// The pattern is everywhere in this app and on both boards: a chip filled
  /// with 12–16% of a tone, labelled in that same tone. It is a good-looking
  /// construction and, at the sizes used here, an illegible one — a chip label
  /// is 9–11pt, which needs 4.5:1, and a tone against its own wash lands
  /// between 2.6:1 (the accent) and 4.5:1 (brick). The boards draw their chips
  /// at the same weights, so following them exactly means shipping the failure.
  ///
  /// Pulling the label toward the ground it is printed on — ink on paper, bone
  /// on a dark card — keeps the chip's hue and buys the contrast: the worst
  /// case goes from 2.60:1 to 5.10:1 in light and to 4.94:1 in dark. The fill,
  /// the border and any glyph keep the undiluted tone.
  static Color onWash(BarbarianColors c, Color tone) => Color.lerp(
    tone,
    c.isDark ? c.onInk : c.ink,
    c.isDark ? 0.28 : 0.40,
  )!;

  // ----------------------------------------------------------------- sectors

  /// A sector's tone — now the ink of the page, at every band.
  ///
  /// This used to be twenty hand-picked hues spread evenly round the wheel,
  /// so that a list of forty tinted monogram tiles showed at a glance which
  /// sectors a screen was mostly made of. Three things retired it:
  ///
  ///  * **Neither board tints anything by category.** Sector strings are drawn
  ///    as plain quiet text beside the company name, and the ticker monogram
  ///    is a flat ink tile with bone letters.
  ///  * **Twelve of the twenty hues were cool** — brand blue, violet, cyan,
  ///    magenta, grape, cobalt. On warm paper they read as imported. Twenty
  ///    *warm* hues is not a thing that exists: it is about 18° of spacing
  ///    across the usable warm wheel, below what a 40pt tile can distinguish.
  ///  * **Colour was the sole carrier, which §42 forbids.** Only one call site
  ///    in the app ever passed a sector to the monogram — the Market row —
  ///    and that row shows ticker, both names, price and delta, and never the
  ///    sector itself. Every other consumer (the filter chip, the sector tile)
  ///    renders the sector's *name*, which is what actually distinguishes it.
  ///
  /// The tiles keep their shape: a wash and a ring, twenty of them, all ink.
  static Color sector(BarbarianColors c, String? name) =>
      name == null || name.isEmpty ? c.textMuted : c.textPrimary;

  /// The monogram tile fill.
  ///
  /// A tile of ink needs different weight from a tile of colour: the old
  /// 0.13 was a hue over a moving gradient, and at that strength plain ink
  /// over one fixed cream is a grey block — forty of them down a list read as
  /// a ladder of holes. 0.10 leaves a tile that is a shape, with the ring and
  /// the ticker itself carrying the edge.
  static Color sectorWash(BarbarianColors c, String? name) =>
      sector(c, name).withValues(alpha: c.isDark ? 0.16 : 0.10);

  // ------------------------------------------------------------ scan status

  /// The scanner's own status vocabulary, coloured by what it means.
  ///
  /// Drawn entirely from tones that exist elsewhere in the theme, so a status
  /// never introduces a hue of its own. **Deliberately no orange**: the accent
  /// means "measured" or "pressable", never an outcome, and at 3.09:1 it
  /// cannot be the bare 13pt text one consumer renders.
  static Color scanStatus(BarbarianColors c, String? label) {
    final l = (label ?? '').toLowerCase();
    final dark = c.isDark;
    if (l.contains('persistent')) return c.iris;
    if (l.contains('tape')) {
      return dark ? const Color(0xFF9CA95A) : const Color(0xFF607023);
    }
    if (l.contains('model trade')) return c.up;
    if (l.contains('expired') || l.contains('miss')) {
      return dark ? const Color(0xFF9C938B) : const Color(0xFF756E68);
    }
    if (l.contains('denied') || l.contains('reject')) return c.down;
    return c.textSecondary;
  }
}
