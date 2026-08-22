import 'package:flutter/material.dart';

/// The Barbarian's type scale, transcribed from the design canvas.
///
/// Two families, with a strict division of labour:
///
///   * **Bricolage Grotesque** — display and headings, as on board v1's
///     ESTHMR wordmark. It has more character than a neutral grotesk and
///     carries the brand's voice.
///   * **Space Grotesk** — labels, captions, body and numerals.
///   * **IBM Plex Sans Arabic** — Arabic only. Neither Latin face covers the
///     script (spec §41).
///
/// Bricolage Grotesque and Space Grotesk both ship as variable fonts, so
/// weights are set through [FontVariation] for exact axis values rather than
/// relying on Flutter picking a nearby static instance.
///
/// ## Tabular figures — verified, and not what you would guess
///
/// Both families are given [FontFeature.tabularFigures], for opposite reasons.
/// Measured from the bundled binaries at 1000 upem:
///
/// | family | `tnum` feature | default digit advances |
/// |---|---|---|
/// | Bricolage Grotesque | present | proportional |
/// | Space Grotesk | present | proportional |
/// | IBM Plex Sans Arabic | absent | already monospaced |
///
/// Both site faces need the feature and have it; Plex does not need it and the
/// call is a harmless no-op. A price column that reflows as digits change is
/// the failure this prevents.
@immutable
abstract final class BarbarianType {
  static const String display = 'BricolageGrotesque';
  static const String text = 'SpaceGrotesk';

  /// Arabic keeps IBM Plex, which Bricolage and Space Grotesk do not cover.
  ///
  /// Declared as a *fallback* on every style rather than swapped in by the
  /// caller. Neither Latin face carries an Arabic glyph, so without this an
  /// Arabic string falls through to whatever the platform picks — a different
  /// face on iOS and Android, at a different optical size, inside a type scale
  /// that was measured. With it, any Arabic run in any style resolves to Plex
  /// automatically and the Latin text is untouched, which is what an
  /// Arabic-first app needs from a scale drawn in Latin.
  static const String arabic = 'IBMPlexSansArabic';

  static const List<String> _fallback = [arabic];

  static List<FontVariation> _wght(double value) => [
    FontVariation('wght', value),
  ];

  // `weight` is required rather than defaulted: in a type scale the weight is
  // half the definition, so every style states it at the call site.
  static TextStyle _display(
    double size, {
    required double weight,
    double height = 1,
    double letterSpacing = 0,
  }) => TextStyle(
    fontFamily: display,
    fontFamilyFallback: _fallback,
    fontSize: size,
    height: height,
    fontWeight: FontWeight.values[(weight ~/ 100) - 1],
    fontVariations: _wght(weight),
    letterSpacing: letterSpacing * size,
    // Figures must not jitter as prices tick.
    fontFeatures: const [FontFeature.tabularFigures()],
  );

  static TextStyle _body(
    double size, {
    FontWeight weight = FontWeight.w400,
    double height = 1,
    double letterSpacing = 0,
  }) => TextStyle(
    fontFamily: text,
    fontFamilyFallback: _fallback,
    fontSize: size,
    height: height,
    fontWeight: weight,
    letterSpacing: letterSpacing * size,
    fontFeatures: const [FontFeature.tabularFigures()],
  );

  // ---------------------------------------------------------------- display

  /// 56/200 — the brand mark. One per screen at most.
  static TextStyle get displayXL =>
      _display(56, weight: 200, letterSpacing: -0.03);

  /// 42/200 — the index level on Home, the gauge figure.
  static TextStyle get displayL =>
      _display(42, weight: 200, letterSpacing: -0.03);

  /// 32/200 — screen titles: "Market", "The Pit", a ticker.
  static TextStyle get displayM =>
      _display(32, weight: 200, letterSpacing: -0.02);

  /// 26/300 — card headlines.
  static TextStyle get displayS =>
      _display(26, weight: 300, letterSpacing: -0.02);

  /// 22/300 1.2 — editorial headline inside a card, wraps to two lines.
  static TextStyle get headlineL =>
      _display(22, weight: 300, height: 1.2, letterSpacing: -0.01);

  /// 20/300 — section headings and post titles.
  static TextStyle get headlineM => _display(20, weight: 300, height: 1.25);

  /// 17/400 — company name in a row.
  static TextStyle get titleL => _display(17, weight: 400);

  /// 15/400 — list titles.
  static TextStyle get titleM => _display(15, weight: 400, height: 1.2);

  /// 13/400 — compact titles.
  static TextStyle get titleS => _display(13, weight: 400);

  // ------------------------------------------------------------------ data

  /// 26 — a stat tile's value.
  static TextStyle get figureL => _display(26, weight: 300, letterSpacing: -0.02);

  /// 20 — a price in a row.
  static TextStyle get figureM => _display(20, weight: 300);

  /// 15 — an inline figure.
  static TextStyle get figureS => _display(15, weight: 400);

  /// 12.5 — the exact token under a plain sentence, and the arithmetic inside
  /// an explainer sheet. Small on purpose: the sentence is what is being said
  /// and the figure is the evidence for it, but it is never hidden (spec §6.2).
  static TextStyle get figureXs => _display(12.5, weight: 400);

  // ------------------------------------------------------------------ text
  //
  // ## Raised once, after watching people read it
  //
  // The scale was transcribed from a design canvas, where type is judged at
  // whatever size the artboard is being viewed at. On a phone in a hand it was
  // too small to read comfortably: card prose at 13, supporting copy at 11 in
  // a **300 weight**, and captions at 9. Readers given the app said the fonts
  // were hard to read, and they were right — iOS sets its own body at 17.
  //
  // Every size below moved up, and the one light weight became regular. A
  // 300-weight face at 11 points is thin strokes at the size where the eye has
  // least to work with, which is the worst place in a type scale to save
  // space.
  //
  // Nothing above `bodyL` moved: the display sizes were never the problem, and
  // enlarging headings as well would have shifted the proportions rather than
  // the legibility.

  /// 17/1.6 — long-form research body. iOS sets its own body text at 17.
  static TextStyle get bodyL => _body(17, height: 1.6);

  /// 15/1.5 — card body copy. The size most of the app's sentences are read at.
  static TextStyle get bodyM => _body(15, height: 1.5);

  /// 13/1.45 — dense supporting copy. Regular, not light: the 300 weight this
  /// carried at 11 points was the single hardest thing in the app to read.
  static TextStyle get bodyS => _body(13, height: 1.45);

  /// 14 — tab labels, buttons.
  static TextStyle get label => _body(14);

  /// 13 — secondary labels.
  static TextStyle get labelS => _body(13);

  /// 12/.12em uppercase — the boards' signature section label.
  ///
  /// Tracking came down with the size increase. Wide letter-spacing on capitals
  /// is a display effect: it separates the letters of a word a reader is
  /// scanning, and it costs most on the labels that name a section to somebody
  /// who does not already know what is in it.
  static TextStyle get labelMicro => _body(12, letterSpacing: 0.12);

  /// 11/.12em uppercase — the smallest label, under a gauge or a stat.
  static TextStyle get labelNano => _body(11, letterSpacing: 0.12);

  /// 10.5/.12em uppercase — caption under a dial.
  static TextStyle get labelTiny => _body(10.5, letterSpacing: 0.12);

  /// 11/500 — a value inside a pill.
  static TextStyle get pill => _body(11, weight: FontWeight.w500);

  /// 12/500 — a ticker inside an avatar.
  static TextStyle get tickerMark => _body(12, weight: FontWeight.w500);

  /// Applied to Material's own text theme so stray widgets inherit the brand
  /// rather than Roboto.
  static TextTheme textTheme(Color primary, Color secondary) => TextTheme(
    displayLarge: displayXL.copyWith(color: primary),
    displayMedium: displayL.copyWith(color: primary),
    displaySmall: displayM.copyWith(color: primary),
    headlineLarge: headlineL.copyWith(color: primary),
    headlineMedium: headlineM.copyWith(color: primary),
    headlineSmall: titleL.copyWith(color: primary),
    titleLarge: titleL.copyWith(color: primary),
    titleMedium: titleM.copyWith(color: primary),
    titleSmall: titleS.copyWith(color: primary),
    bodyLarge: bodyL.copyWith(color: primary),
    bodyMedium: bodyM.copyWith(color: secondary),
    bodySmall: bodyS.copyWith(color: secondary),
    labelLarge: label.copyWith(color: primary),
    labelMedium: labelS.copyWith(color: secondary),
    labelSmall: labelMicro.copyWith(color: secondary),
  );
}
