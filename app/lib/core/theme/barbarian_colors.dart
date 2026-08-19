import 'package:flutter/material.dart';

/// ESTHMR's colour tokens, taken from the app design boards.
///
/// The app has been through two identities. It was drawn on a warm-paper
/// canvas, then retargeted at **thebarbarianproject.com** — a cool near-white
/// ground, indigo ink, five brand hues and translucent glass over a drifting
/// gradient. The ESTHMR boards go back to paper, and this file follows them:
///
/// ```
/// ground   #EDE8E2 → #E3DCD4   warm paper, a vertical ramp
/// card     #F7F4F0             opaque, separated by shadow rather than fill
/// ink      #242120 → #1B1917   the feature slab
/// accent   #E8621C             one orange, #FF8340 when it sits on ink
/// up/down  #3F6B52 / #A3402F   forest and brick; #6EA487 / #D97D64 on ink
/// ```
///
/// Nothing here is translucent. The old surfaces were ~52% white panes over a
/// blurred orb field; glass over flat paper is just a lighter rectangle, so the
/// orbs, the backdrop blurs and the frosted rims are gone.
///
/// ## What the boards do not settle, and how it was settled
///
/// Three tiers are **derived**, and each is marked at its field:
///
///  * The boards' two quietest text tiers do not reach AA. `#7A736D` measures
///    4.26:1 and `#9A938C` measures 2.77:1 on the card, and the boards set
///    them at 9–13px — the same sizes this app does, so there is no reading of
///    the source on which they pass. Hue and saturation are held; lightness
///    drops to the first value that clears 4.5:1.
///  * There is no dark board. The dark ramp is built here, warm, with a real
///    elevation ladder — see [BarbarianColors.dark].
///  * The boards do print white on a filled `#E8621C` pill (3.39:1) and the
///    accent as bare type. Neither clears AA at body size, so in this app the
///    accent is a mark, a fill or a large numeral, and [onAccent] is ink.
///
/// A verdict, a direction or a state is never signalled by colour alone
/// (spec §42); these accompany a word or a glyph, never replace one. That rule
/// carries more weight on this palette than it did on the last one: [up] and
/// [down] are 1.03:1 apart in luminance, which is to say a photometer cannot
/// tell a rise from a fall. The ▲/▼ is the signal.
@immutable
class BarbarianColors extends ThemeExtension<BarbarianColors> {
  const BarbarianColors({
    required this.background,
    required this.backgroundBottom,
    required this.surface,
    required this.surfaceRaised,
    required this.cardEdge,
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
    required this.iris,
    required this.up,
    required this.down,
    required this.upOnInk,
    required this.downOnInk,
    required this.brightness,
  });

  /// The boards' own palette.
  factory BarbarianColors.light() => const BarbarianColors(
    background: Color(0xFFEDE8E2),
    backgroundBottom: Color(0xFFE3DCD4),
    surface: Color(0xFFF7F4F0),
    // The one pure white in the system: a lifted segment, a pressed row.
    surfaceRaised: Color(0xFFFFFFFF),
    // Derived. The boards separate a card from the ground with a shadow and
    // nothing else — but ground to card is 1.111:1, and a shadow alone leaves
    // the card a rumour on a phone in daylight. Border.all composites over the
    // card's own fill, so an 8% ink ring reads 1.17:1 against it — a hairline
    // rather than a border, and enough to close the shape.
    cardEdge: Color(0x141B1917),
    ink: Color(0xFF1B1917),
    inkRaised: Color(0xFF242120),
    onInk: Color(0xFFF5F1EC),
    onInkMuted: Color(0xFF8E8781),
    hairline: Color(0x141B1917),
    hairlineStrong: Color(0x2E1B1917),
    textPrimary: Color(0xFF1B1917),
    textSecondary: Color(0xFF5C554F),
    // Derived from the boards' #7A736D — same hue, dark enough to read at
    // 11pt (5.31:1 on card, 4.78:1 on ground).
    textMuted: Color(0xFF6B645E),
    // Derived from the boards' #9A938C, which measures 2.77:1 (4.57:1 here).
    textFaint: Color(0xFF756E68),
    // The boards' committing action is a solid ink pill with bone type, not an
    // orange one: bone on #E8621C is 3.01:1.
    actionSurface: Color(0xFF1B1917),
    onAction: Color(0xFFF5F1EC),
    accent: Color(0xFFE8621C),
    // Derived. White on the accent is 3.39:1 and fails; ink is 5.17:1.
    onAccent: Color(0xFF1B1917),
    accentOnInk: Color(0xFFFF8340),
    // The boards run on ink, orange and a signed pair. This is the fourth
    // tone, and it exists because the app has a third *state* — "act now",
    // "gate unresolved" — that the boards' answer for unresolved (warm stone)
    // cannot also carry. Desaturated iris: at the 8–15% washes those sites
    // use, it cannot be mistaken for the accent, the brick, or dirt.
    iris: Color(0xFF5F4B6E),
    up: Color(0xFF3F6B52),
    down: Color(0xFFA3402F),
    // The boards author a second direction pair for the ink slab, exactly as
    // they do for the accent. Without it a delta on the company header sits at
    // 2.87:1; these are 6.11 and 5.90.
    upOnInk: Color(0xFF6EA487),
    downOnInk: Color(0xFFD97D64),
    brightness: Brightness.light,
  );

  /// The same identity after dark, derived.
  ///
  /// There is no dark board, so the rule is: keep the paper family's hue (~30°
  /// warm) and rebuild the elevation ladder, because the light one inverts.
  /// On paper the feature slab is the darkest thing on the screen; on a dark
  /// page it has to be the **lightest**, or [BDarkCard] stops being the
  /// feature and becomes another card.
  ///
  /// The ladder, as luminance ratios: ground → card 1.11, card → raised 1.12,
  /// card → ink 1.23, ground → ink 1.37. Every text token clears 4.5:1 on
  /// every one of those surfaces.
  ///
  /// The accent lifts past the boards' on-ink `#FF8340`, which was tuned for a
  /// `#1B1917` card; here every surface is lighter than that.
  factory BarbarianColors.dark() => const BarbarianColors(
    background: Color(0xFF141110),
    backgroundBottom: Color(0xFF0D0B0A),
    surface: Color(0xFF211C18),
    surfaceRaised: Color(0xFF2B2521),
    cardEdge: Color(0x1FF5F1EC),
    // Lighter than the page, not darker — see the class doc.
    ink: Color(0xFF332C25),
    inkRaised: Color(0xFF392F28),
    onInk: Color(0xFFF5F1EC),
    onInkMuted: Color(0xFFA39A90),
    hairline: Color(0x1FF5F1EC),
    hairlineStrong: Color(0x38F5F1EC),
    textPrimary: Color(0xFFF5F1EC),
    textSecondary: Color(0xFFC6BDB3),
    textMuted: Color(0xFFADA49A),
    textFaint: Color(0xFF9C938B),
    // The inversion of "solid ink on paper".
    actionSurface: Color(0xFFF0E9E1),
    onAction: Color(0xFF1B1917),
    accent: Color(0xFFFF9152),
    onAccent: Color(0xFF1B1917),
    accentOnInk: Color(0xFFFF9152),
    iris: Color(0xFFA794C4),
    up: Color(0xFF7FB396),
    down: Color(0xFFD8836F),
    // On a dark page every surface is ink, so these do not diverge.
    upOnInk: Color(0xFF7FB396),
    downOnInk: Color(0xFFD8836F),
    brightness: Brightness.dark,
  );

  /// Page ground. A vertical ramp, top to bottom.
  final Color background;
  final Color backgroundBottom;

  /// Paper. Opaque — the card is a sheet laid on the page, not a window.
  final Color surface;
  final Color surfaceRaised;

  /// The hairline that keeps a card from dissolving into the ground.
  final Color cardEdge;

  /// The feature slab: the Home hero, the company header, the verdict block.
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

  /// One orange. It marks, fills and underlines; it does not label.
  final Color accent;
  final Color onAccent;
  final Color accentOnInk;

  /// The third state — unresolved, in progress, act now.
  final Color iris;

  /// Price direction on paper. Always paired with a ▲/▼ mark and a signed
  /// number, because these two are 1.03:1 apart and colour carries nothing
  /// on its own (spec §42).
  final Color up;
  final Color down;

  /// Price direction on the ink slab. [up] and [down] are 2.87:1 and 2.78:1
  /// there — legible as a shape, not as a figure.
  final Color upOnInk;
  final Color downOnInk;

  final Brightness brightness;

  bool get isDark => brightness == Brightness.dark;

  /// The page ramp.
  LinearGradient get pageGradient => LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [background, backgroundBottom],
  );

  /// Direction, picked for the surface it is drawn on.
  Color direction(bool rising, {bool onInkSurface = false}) => rising
      ? (onInkSurface ? upOnInk : up)
      : (onInkSurface ? downOnInk : down);

  @override
  BarbarianColors copyWith({
    Color? background,
    Color? backgroundBottom,
    Color? surface,
    Color? surfaceRaised,
    Color? cardEdge,
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
    Color? iris,
    Color? up,
    Color? down,
    Color? upOnInk,
    Color? downOnInk,
    Brightness? brightness,
  }) => BarbarianColors(
    background: background ?? this.background,
    backgroundBottom: backgroundBottom ?? this.backgroundBottom,
    surface: surface ?? this.surface,
    surfaceRaised: surfaceRaised ?? this.surfaceRaised,
    cardEdge: cardEdge ?? this.cardEdge,
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
    iris: iris ?? this.iris,
    up: up ?? this.up,
    down: down ?? this.down,
    upOnInk: upOnInk ?? this.upOnInk,
    downOnInk: downOnInk ?? this.downOnInk,
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
      cardEdge: mix(cardEdge, other.cardEdge),
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
      iris: mix(iris, other.iris),
      up: mix(up, other.up),
      down: mix(down, other.down),
      upOnInk: mix(upOnInk, other.upOnInk),
      downOnInk: mix(downOnInk, other.downOnInk),
      brightness: t < 0.5 ? brightness : other.brightness,
    );
  }
}
