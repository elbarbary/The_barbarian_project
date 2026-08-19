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
  static const String arabic = 'IBMPlexSansArabic';

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

  /// 16/1.65 — long-form research body.
  static TextStyle get bodyL => _body(16, height: 1.65);

  /// 13/1.5 — card body copy.
  static TextStyle get bodyM => _body(13, height: 1.5);

  /// 11/1.3 — dense supporting copy.
  static TextStyle get bodyS => _body(11, height: 1.3, weight: FontWeight.w300);

  /// 13 — tab labels, buttons.
  static TextStyle get label => _body(13);

  /// 12 — secondary labels.
  static TextStyle get labelS => _body(12);

  /// 11/.16em uppercase — the boards' signature section label.
  static TextStyle get labelMicro => _body(11, letterSpacing: 0.16);

  /// 10/.16em uppercase — the smallest label, under a gauge or a stat.
  static TextStyle get labelNano => _body(10, letterSpacing: 0.16);

  /// 9/.16em uppercase — caption under a dial.
  static TextStyle get labelTiny => _body(9, letterSpacing: 0.16);

  /// 10/500 — a value inside a pill.
  static TextStyle get pill => _body(10, weight: FontWeight.w500);

  /// 11/500 — a ticker inside an avatar.
  static TextStyle get tickerMark => _body(11, weight: FontWeight.w500);

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
