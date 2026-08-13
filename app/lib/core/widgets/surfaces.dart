import 'dart:ui' as ui;

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
    border: Border.all(
      color: context.colors.accent.withValues(alpha: 0.55),
    ),
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

    // Real frosted glass, as the site has it: a translucent white pane over a
    // backdrop blur, with a bright rim. A solid card on the living gradient
    // would block the thing that makes the design work.
    return BGlassShadow(
      radius: radius,
      child: ClipRRect(
        borderRadius: shape,
        child: BackdropFilter(
          filter: ui.ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: padding,
            clipBehavior: clip ? Clip.antiAlias : Clip.none,
            foregroundDecoration: foregroundDecoration,
            decoration: BoxDecoration(
              color: color ?? c.surface,
              borderRadius: shape,
              border: Border.all(color: c.glassBorder),
            ),
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
        // A trace of the accent in the top corner: the canvas's feature cards
        // are a gradient, not a flat fill, and a whisper of warmth keeps a
        // large dark block from reading as a hole in the page.
        // The feature card keeps the site's indigo ink, warmed toward violet
        // in one corner so a large dark block reads as part of the gradient
        // rather than a hole punched in it.
        gradient: gradient
            ? LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color.lerp(c.inkRaised, c.violet, 0.22)!,
                  c.ink,
                  Color.lerp(c.ink, c.accent, 0.10)!,
                ],
                stops: const [0, 0.55, 1],
              )
            : null,
        borderRadius: BorderRadius.circular(radius),
        boxShadow: c.glassShadow,
        border: Border.all(color: c.onInk.withValues(alpha: 0.08)),
      ),
      child: child,
    );
  }
}

/// Casts the site's card shadow **outside** the shape only.
///
/// A normal `BoxShadow` is painted across the widget's whole rect and then the
/// child is drawn on top. That is invisible under an opaque card, but these
/// cards are ~50% white glass — so the shadow showed straight through the
/// frosting and the pane looked dirty rather than clear. Clipping the shape
/// out of the shadow layer leaves only the halo around the edge.
class BGlassShadow extends StatelessWidget {
  const BGlassShadow({
    required this.child,
    required this.radius,
    super.key,
  });

  final Widget child;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return CustomPaint(
      painter: _OutsideShadowPainter(radius: radius, shadows: c.glassShadow),
      child: child,
    );
  }
}

class _OutsideShadowPainter extends CustomPainter {
  const _OutsideShadowPainter({required this.radius, required this.shadows});

  final double radius;
  final List<BoxShadow> shadows;

  @override
  void paint(Canvas canvas, Size size) {
    if (shadows.isEmpty) return;
    final rrect = RRect.fromRectAndRadius(
      Offset.zero & size,
      Radius.circular(radius),
    );

    canvas.save();
    // Everything except the card itself, so the shadow can only land outside.
    canvas.clipPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(Rect.fromLTRB(
          -200,
          -200,
          size.width + 200,
          size.height + 200,
        )),
        Path()..addRRect(rrect),
      ),
    );
    for (final shadow in shadows) {
      canvas.drawRRect(
        rrect.shift(shadow.offset).inflate(shadow.spreadRadius),
        shadow.toPaint(),
      );
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_OutsideShadowPainter old) =>
      old.radius != radius || old.shadows != shadows;
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
              c.backgroundBottom.withValues(alpha: 0.34),
              c.backgroundBottom.withValues(alpha: 0.62),
            ],
            stops: const [0, 0.52, 1],
          ),
        ),
      ),
    );
  }
}
