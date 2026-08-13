import 'package:flutter/material.dart';

/// The Barbarian's colour tokens, taken from the website's own stylesheet.
///
/// The app used to follow the Claude Design canvas — warm bone, ink, one
/// orange. It now follows **thebarbarianproject.com**: a cool near-white
/// ground, deep indigo ink, white frosted glass, and five brand hues.
///
/// Straight from `public/style.css`:
///
/// ```
/// --bg-0   #F4F3FB   soft cool white
/// --ink    #221B3D   deep indigo ink
/// --blue   #1E37E6   --violet #7C3AED   --rose #E11D74
/// --lime   #CDE84A   --cyan   #22D3EE
/// --glass  rgba(255,255,255,.52)   --glass-strong .68   --glass-border .85
/// ```
///
/// A verdict, a direction or a state is never signalled by colour alone
/// (spec §42); these accompany a word or a mark, never replace one.
@immutable
class BarbarianColors extends ThemeExtension<BarbarianColors> {
  const BarbarianColors({
    required this.background,
    required this.backgroundBottom,
    required this.surface,
    required this.surfaceRaised,
    required this.glassBorder,
    required this.ink,
    required this.inkRaised,
    required this.onInk,
    required this.onInkMuted,
    required this.hairline,
    required this.hairlineStrong,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.textFaint,
    required this.actionSurface,
    required this.onAction,
    required this.accent,
    required this.onAccent,
    required this.accentOnInk,
    required this.violet,
    required this.rose,
    required this.lime,
    required this.cyan,
    required this.up,
    required this.down,
    required this.brightness,
  });

  /// The site's own light theme.
  factory BarbarianColors.light() => const BarbarianColors(
    background: Color(0xFFF4F3FB),
    backgroundBottom: Color(0xFFE9E6F7),
    // White glass, not a solid card. Everything sits on the living gradient.
    surface: Color(0x85FFFFFF),
    surfaceRaised: Color(0xAEFFFFFF),
    glassBorder: Color(0xD9FFFFFF),
    ink: Color(0xFF221B3D),
    inkRaised: Color(0xFF2E2551),
    onInk: Color(0xFFF4F3FB),
    onInkMuted: Color(0x99F4F3FB),
    hairline: Color(0x12221B3D),
    hairlineStrong: Color(0x24221B3D),
    textPrimary: Color(0xFF221B3D),
    textSecondary: Color(0xBD221B3D),
    textMuted: Color(0x8A221B3D),
    textFaint: Color(0x57221B3D),
    actionSurface: Color(0xFF1E37E6),
    onAction: Color(0xFFFFFFFF),
    accent: Color(0xFF1E37E6),
    onAccent: Color(0xFFFFFFFF),
    accentOnInk: Color(0xFF8FA2FF),
    violet: Color(0xFF7C3AED),
    rose: Color(0xFFE11D74),
    lime: Color(0xFFCDE84A),
    cyan: Color(0xFF22D3EE),
    // Green is not in the site's palette, so direction borrows the nearest
    // brand hues: a cool teal-green for up, the site's rose for down.
    up: Color(0xFF0F9D76),
    down: Color(0xFFE11D74),
    brightness: Brightness.light,
  );

  /// The same identity after dark.
  ///
  /// The site has no dark mode, so this is derived: the indigo ink becomes the
  /// ground, the glass becomes a white film rather than a white pane, and the
  /// blue lifts because `#1E37E6` on a dark field is nearly unreadable.
  factory BarbarianColors.dark() => const BarbarianColors(
    background: Color(0xFF120F20),
    backgroundBottom: Color(0xFF0C0A16),
    surface: Color(0x14FFFFFF),
    surfaceRaised: Color(0x1FFFFFFF),
    glassBorder: Color(0x24FFFFFF),
    ink: Color(0xFF2A2247),
    inkRaised: Color(0xFF362C59),
    onInk: Color(0xFFF4F3FB),
    onInkMuted: Color(0xA6F4F3FB),
    hairline: Color(0x1FFFFFFF),
    hairlineStrong: Color(0x33FFFFFF),
    textPrimary: Color(0xFFF4F3FB),
    textSecondary: Color(0xC7F4F3FB),
    textMuted: Color(0x94F4F3FB),
    textFaint: Color(0x5EF4F3FB),
    actionSurface: Color(0xFF6E82FF),
    onAction: Color(0xFF100E1C),
    accent: Color(0xFF8FA2FF),
    onAccent: Color(0xFF100E1C),
    accentOnInk: Color(0xFF8FA2FF),
    violet: Color(0xFFB794F6),
    rose: Color(0xFFFF6FA8),
    lime: Color(0xFFDDF06E),
    cyan: Color(0xFF5FE3F7),
    up: Color(0xFF3ED5A8),
    down: Color(0xFFFF6FA8),
    brightness: Brightness.dark,
  );

  /// Page ground, beneath the living gradient.
  final Color background;
  final Color backgroundBottom;

  /// Frosted glass. Translucent by design — it needs the gradient behind it.
  final Color surface;
  final Color surfaceRaised;

  /// The bright rim that makes glass read as an edge rather than a wash.
  final Color glassBorder;

  /// The feature surface: hero cards, the company header.
  final Color ink;
  final Color inkRaised;
  final Color onInk;
  final Color onInkMuted;

  final Color hairline;
  final Color hairlineStrong;

  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;
  final Color textFaint;

  /// Primary action fill. Never use [ink] for this — it inverts differently.
  final Color actionSurface;
  final Color onAction;

  final Color accent;
  final Color onAccent;
  final Color accentOnInk;

  /// The rest of the site's brand hues, available to the palette.
  final Color violet;
  final Color rose;
  final Color lime;
  final Color cyan;

  /// Price direction. Always paired with a ▲/▼ mark and a signed number so the
  /// information survives without colour (spec §42).
  final Color up;
  final Color down;

  final Brightness brightness;

  bool get isDark => brightness == Brightness.dark;

  /// The wash under the living gradient.
  LinearGradient get pageGradient => LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [background, backgroundBottom],
  );

  /// The site's own card shadow, cast in indigo rather than black:
  /// `0 24px 54px -26px rgba(46,34,104,.38), 0 6px 18px -12px rgba(46,34,104,.22)`.
  List<BoxShadow> get glassShadow => isDark
      ? const [
          BoxShadow(
            color: Color(0x59000000),
            blurRadius: 40,
            spreadRadius: -16,
            offset: Offset(0, 16),
          ),
        ]
      // CSS blur-radius is twice the Gaussian sigma; Flutter's blurRadius is
      // sigma / 0.57735. So the site's 54px and 18px blurs are ~47 and ~16
      // here — at 28 the halo read as a hard grey band instead of a lift.
      : const [
          BoxShadow(
            color: Color(0x4F2E2268),
            blurRadius: 47,
            spreadRadius: -22,
            offset: Offset(0, 20),
          ),
          BoxShadow(
            color: Color(0x2E2E2268),
            blurRadius: 16,
            spreadRadius: -10,
            offset: Offset(0, 5),
          ),
        ];

  Color forChange(num? change) {
    if (change == null || change == 0) return textMuted;
    return change > 0 ? up : down;
  }

  @override
  BarbarianColors copyWith({
    Color? background,
    Color? backgroundBottom,
    Color? surface,
    Color? surfaceRaised,
    Color? glassBorder,
    Color? ink,
    Color? inkRaised,
    Color? onInk,
    Color? onInkMuted,
    Color? hairline,
    Color? hairlineStrong,
    Color? textPrimary,
    Color? textSecondary,
    Color? textMuted,
    Color? textFaint,
    Color? actionSurface,
    Color? onAction,
    Color? accent,
    Color? onAccent,
    Color? accentOnInk,
    Color? violet,
    Color? rose,
    Color? lime,
    Color? cyan,
    Color? up,
    Color? down,
    Brightness? brightness,
  }) => BarbarianColors(
    background: background ?? this.background,
    backgroundBottom: backgroundBottom ?? this.backgroundBottom,
    surface: surface ?? this.surface,
    surfaceRaised: surfaceRaised ?? this.surfaceRaised,
    glassBorder: glassBorder ?? this.glassBorder,
    ink: ink ?? this.ink,
    inkRaised: inkRaised ?? this.inkRaised,
    onInk: onInk ?? this.onInk,
    onInkMuted: onInkMuted ?? this.onInkMuted,
    hairline: hairline ?? this.hairline,
    hairlineStrong: hairlineStrong ?? this.hairlineStrong,
    textPrimary: textPrimary ?? this.textPrimary,
    textSecondary: textSecondary ?? this.textSecondary,
    textMuted: textMuted ?? this.textMuted,
    textFaint: textFaint ?? this.textFaint,
    actionSurface: actionSurface ?? this.actionSurface,
    onAction: onAction ?? this.onAction,
    accent: accent ?? this.accent,
    onAccent: onAccent ?? this.onAccent,
    accentOnInk: accentOnInk ?? this.accentOnInk,
    violet: violet ?? this.violet,
    rose: rose ?? this.rose,
    lime: lime ?? this.lime,
    cyan: cyan ?? this.cyan,
    up: up ?? this.up,
    down: down ?? this.down,
    brightness: brightness ?? this.brightness,
  );

  @override
  BarbarianColors lerp(ThemeExtension<BarbarianColors>? other, double t) {
    if (other is! BarbarianColors) return this;
    Color mix(Color a, Color b) => Color.lerp(a, b, t)!;
    return BarbarianColors(
      background: mix(background, other.background),
      backgroundBottom: mix(backgroundBottom, other.backgroundBottom),
      surface: mix(surface, other.surface),
      surfaceRaised: mix(surfaceRaised, other.surfaceRaised),
      glassBorder: mix(glassBorder, other.glassBorder),
      ink: mix(ink, other.ink),
      inkRaised: mix(inkRaised, other.inkRaised),
      onInk: mix(onInk, other.onInk),
      onInkMuted: mix(onInkMuted, other.onInkMuted),
      hairline: mix(hairline, other.hairline),
      hairlineStrong: mix(hairlineStrong, other.hairlineStrong),
      textPrimary: mix(textPrimary, other.textPrimary),
      textSecondary: mix(textSecondary, other.textSecondary),
      textMuted: mix(textMuted, other.textMuted),
      textFaint: mix(textFaint, other.textFaint),
      actionSurface: mix(actionSurface, other.actionSurface),
      onAction: mix(onAction, other.onAction),
      accent: mix(accent, other.accent),
      onAccent: mix(onAccent, other.onAccent),
      accentOnInk: mix(accentOnInk, other.accentOnInk),
      violet: mix(violet, other.violet),
      rose: mix(rose, other.rose),
      lime: mix(lime, other.lime),
      cyan: mix(cyan, other.cyan),
      up: mix(up, other.up),
      down: mix(down, other.down),
      brightness: t < 0.5 ? brightness : other.brightness,
    );
  }
}
