import 'package:flutter/material.dart';

import '../theme/barbarian_theme.dart';

/// Hairline separators.
///
/// The design draws every divider as a CSS **inset** box-shadow, e.g.
/// `inset 0 -1px 0 rgba(27,25,23,.08)`. Flutter has no inset shadow, and the
/// obvious substitute — a `Border` inside a `BoxDecoration` — is wrong in a way
/// that is easy to miss: a CSS inset shadow costs **zero layout box**, while a
/// Flutter `Border` insets the child by its width, shifting every row by a
/// pixel and compounding down a long list.
///
/// So hairlines are painted through [BoxDecoration] on **`foregroundDecoration`**,
/// which draws over the child without consuming any layout space. Use these
/// factories rather than hand-rolling a Border.
@immutable
abstract final class BHairline {
  /// `inset 0 -1px 0 rgba(27,25,23,.08)` — the standard row separator.
  static BoxDecoration rowBottom(BuildContext context) => BoxDecoration(
    border: Border(bottom: BorderSide(color: context.colors.hairline)),
  );

  /// `inset 0 -1px 0 rgba(27,25,23,.10)` — a slightly stronger separator.
  static BoxDecoration rowBottomStrong(BuildContext context) => BoxDecoration(
    border: Border(bottom: BorderSide(color: context.colors.hairlineStrong)),
  );

  /// `inset 0 0 0 1px rgba(27,25,23,.18)` — a full outline on a paper surface.
  static BoxDecoration outline(BuildContext context, {double radius = 24}) =>
      BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: context.colors.hairlineStrong),
      );

  /// `inset 0 0 0 1px rgba(232,98,28,.55)` — the accent outline on a selected
  /// chip. Paired with a label change so selection is never colour-only.
  static BoxDecoration accentOutline(
    BuildContext context, {
    double radius = BarbarianRadius.pill,
  }) => BoxDecoration(
    borderRadius: BorderRadius.circular(radius),
    border: Border.all(color: context.colors.accent.withValues(alpha: 0.55)),
  );
}

/// The light "paper" surface behind every ordinary card, tile and row group.
class BPaperCard extends StatelessWidget {
  const BPaperCard({
    required this.child,
    this.radius = BarbarianRadius.lg,
    this.padding = BarbarianSpace.card,
    this.shadow = BarbarianShadow.card,
    this.color,
    this.foregroundDecoration,
    this.clip = false,
    super.key,
  });

  final Widget child;
  final double radius;
  final EdgeInsetsGeometry padding;
  final List<BoxShadow> shadow;
  final Color? color;

  /// Painted over the child without affecting layout — this is where a
  /// [BHairline] goes.
  final BoxDecoration? foregroundDecoration;

  final bool clip;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final shape = BorderRadius.circular(radius);

    // A sheet laid on the page. This was a translucent pane over a backdrop
    // blur, because the ground underneath was a drifting orb field and the
    // frosting is what made the design work. The ground is now flat paper, so
    // the blur sampled a colour it could not change, and every card paid for
    // an offscreen layer that rendered no visible pixel.
    //
    // The shadow is on the outer box and the clip is inside it: a shadow drawn
    // within the ClipRRect is clipped away, which would leave the card at
    // 1.11:1 against the ground with nothing but a hairline to find it by.
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color ?? c.surface,
        borderRadius: shape,
        border: Border.all(color: c.cardEdge),
        boxShadow: shadow,
      ),
      // The outer ClipRRect is what `clip` asks for. Handing clipBehavior to a
      // Container that no longer carries a decoration trips one of Container's
      // own asserts — the decoration moved out to the box above, and the clip
      // had to follow it rather than stay behind.
      child: ClipRRect(
        borderRadius: shape,
        clipBehavior: clip ? Clip.antiAlias : Clip.hardEdge,
        child: Padding(
          padding: padding,
          child: foregroundDecoration == null
              ? child
              : DecoratedBox(
                  position: DecorationPosition.foreground,
                  decoration: foregroundDecoration!,
                  child: child,
                ),
        ),
      ),
    );
  }
}

/// The "raised dark" editorial surface: the Home hero, the company header, the
/// verdict block, the dark watchlist tiles.
///
/// On the light theme this is near-black against bone. On the dark theme it
/// lifts *above* the background rather than sinking below it, so it stays the
/// most prominent block on the screen either way.
class BDarkCard extends StatelessWidget {
  const BDarkCard({
    required this.child,
    this.radius = BarbarianRadius.lg,
    this.padding = BarbarianSpace.card,
    this.gradient = true,
    this.onTap,
    this.clip = false,
    super.key,
  });

  final Widget child;
  final double radius;
  final EdgeInsetsGeometry padding;

  /// The canvas uses `linear-gradient(180deg,#242120,#1B1917)` on feature cards
  /// and a flat `#1B1917` on the index strip. Both appear; this picks.
  final bool gradient;

  final VoidCallback? onTap;
  final bool clip;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: padding,
      clipBehavior: clip ? Clip.antiAlias : Clip.none,
      decoration: BoxDecoration(
        color: gradient ? null : c.ink,
        // The boards draw this as a plain vertical ramp, lighter at the top.
        // It used to be a diagonal with a corner lerped 22% toward violet and
        // another 10% toward the accent — warmth borrowed to keep a dark block
        // from reading as a hole punched in the orb field. There is no orb
        // field, and on the dark theme that violet corner became the lightest
        // and only cool surface in the app.
        gradient: gradient
            ? LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [c.inkRaised, c.ink],
              )
            : null,
        borderRadius: BorderRadius.circular(radius),
        // No shadow. Against paper the slab is 16:1 and needs no help; on the
        // dark theme it lifts by being lighter than the page.
        border: Border.all(color: c.onInk.withValues(alpha: 0.08)),
      ),
      child: child,
    );
  }
}

/// The non-interactive fade that dissolves scrolling content behind the
/// floating navigation.
class BBottomScrim extends StatelessWidget {
  const BBottomScrim({this.height = 118, super.key});

  final double height;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return IgnorePointer(
      child: Container(
        height: height,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              c.backgroundBottom.withValues(alpha: 0),
              c.backgroundBottom.withValues(alpha: 0.55),
              c.backgroundBottom,
            ],
            // Ends opaque. It stopped at 62% because the glass nav refracted
            // the remaining 38%; the bar is opaque now, so rows would otherwise
            // ghost through in the strips either side of it.
            stops: const [0, 0.5, 1],
          ),
        ),
      ),
    );
  }
}
