import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'nav_icons.dart';
import 'package:liquid_glass_renderer/liquid_glass_renderer.dart';

import '../theme/barbarian_theme.dart';

/// The four primary destinations (spec §5). There are exactly four and no more.
enum BNavTab {
  home('Home'),
  market('Market'),
  pit('The Pit'),
  you('You');

  const BNavTab(this.label);

  final String label;
}

/// The floating liquid-glass bottom navigation.
///
/// Identical on every screen; only the lit slot moves. Transcribed from the
/// canvas: 66pt tall, inset 16 from each edge, 22 from the bottom, a 58%
/// ink fill over a 13-sigma backdrop blur, a hairline of 13% white, and a
/// hand-painted top sheen that Flutter cannot express as a shadow.
class BGlassNav extends StatelessWidget {
  const BGlassNav({required this.active, required this.onTap, super.key});

  final BNavTab active;
  final ValueChanged<BNavTab> onTap;

  static const double height = 66;
  static const double insetHorizontal = 16;
  static const double insetBottom = 22;

  @override
  Widget build(BuildContext context) {
    return PositionedDirectional(
      start: insetHorizontal,
      end: insetHorizontal,
      bottom: insetBottom,
      child: Semantics(
        container: true,
        explicitChildNodes: true,
        label: 'Main navigation',
        child: _GlassBar(active: active, onTap: onTap),
      ),
    );
  }
}

class _GlassBar extends StatelessWidget {
  const _GlassBar({required this.active, required this.onTap});

  final BNavTab active;
  final ValueChanged<BNavTab> onTap;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final barWidth = constraints.maxWidth;
        final slot = (barWidth - 12) / BNavTab.values.length;

        return LiquidGlass.withOwnLayer(
          // Real refraction, not a blur pretending to be one: the shader
          // samples and bends what is behind the bar, which is what makes iOS
          // glass read as a physical layer rather than a frosted panel.
          //
          // Flutter has no binding to the system glass, so this is
          // `liquid_glass_renderer` — a shader package, currently a dev
          // preview. If it ever misbehaves on a device, `FakeGlass` is the
          // drop-in cheap path.
          shape: const LiquidRoundedSuperellipse(
            borderRadius: BarbarianRadius.pill,
          ),
          // Tuned down from the package defaults: at high thickness and blur
          // the bar turned into an opaque grey slab and lost the content
          // behind it, which is the opposite of glass. Thin, lightly blurred
          // and strongly refractive reads as a lens.
          // White liquid glass now, to match the site's frosted panels: a pale
          // film with a bright rim rather than a dark slab.
          settings: LiquidGlassSettings(
            glassColor: context.colors.isDark
                ? const Color(0x1FFFFFFF)
                : const Color(0x66FFFFFF),
            thickness: 10,
            blur: 4,
            chromaticAberration: 0.03,
            lightAngle: 0.4 * math.pi,
            lightIntensity: 1.25,
            ambientStrength: 0.18,
            refractiveIndex: 1.44,
            saturation: 1.25,
          ),
          child: SizedBox(
            height: BGlassNav.height,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Stack(
                children: [
                  // The lit slot. The canvas cross-fades opacity and jumps
                  // position; sliding it is a deliberate improvement, on the
                  // canvas's own overshooting curve.
                  AnimatedPositionedDirectional(
                    duration: const Duration(milliseconds: 320),
                    curve: const Cubic(0.32, 1.2, 0.44, 1),
                    start: slot * active.index,
                    top: 6,
                    bottom: 6,
                    width: slot,
                    child: const _SelectionPill(),
                  ),
                  Row(
                    children: [
                      for (final tab in BNavTab.values)
                        Expanded(
                          child: _NavTab(
                            tab: tab,
                            selected: tab == active,
                            onTap: () => onTap(tab),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _SelectionPill extends StatelessWidget {
  const _SelectionPill();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
        // A wash of the brand blue rather than white-on-white, which would be
        // invisible on a pale glass bar.
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            c.accent.withValues(alpha: c.isDark ? 0.28 : 0.18),
            c.accent.withValues(alpha: c.isDark ? 0.14 : 0.08),
          ],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x2E000000),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      // The site's specular top sheen, painted rather than shadowed.
      foregroundDecoration: BoxDecoration(
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
        border: Border.all(color: c.accent.withValues(alpha: 0.22)),
      ),
    );
  }
}

class _NavTab extends StatelessWidget {
  const _NavTab({
    required this.tab,
    required this.selected,
    required this.onTap,
  });

  final BNavTab tab;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final active = c.accent;
    final inactive = c.textMuted;
    final color = selected ? active : inactive;

    return Semantics(
      button: true,
      selected: selected,
      label: tab.label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: SizedBox(
          height: BGlassNav.height,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              BNavIconMark(
                icon: switch (tab) {
                  BNavTab.home => BNavIcon.home,
                  BNavTab.market => BNavIcon.market,
                  BNavTab.pit => BNavIcon.pit,
                  BNavTab.you => BNavIcon.you,
                },
                color: color,
              ),
              const SizedBox(height: 5),
              // The lit tab is marked by a glowing dot as well as a colour, so
              // the selected destination survives without colour (spec §42);
              // the Semantics `selected` flag carries it for screen readers.
              AnimatedOpacity(
                duration: BarbarianMotion.standard,
                opacity: selected ? 1 : 0,
                child: Container(
                  width: 4,
                  height: 4,
                  decoration: BoxDecoration(
                    color: active,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: active.withValues(alpha: 0.85),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
