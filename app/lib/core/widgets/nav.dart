import 'package:flutter/material.dart';

import '../theme/barbarian_theme.dart';
import 'nav_icons.dart';
import '../../l10n/app_localizations.dart';

/// The four primary destinations (spec §5). There are exactly four and no more.
/// The four destinations, in the boards' order.
///
/// The boards open on **Ask**, not on a dashboard: the app's premise is that
/// somebody has just been sent a name and wants to know what it is, so the
/// first screen is the question rather than a summary of everything.
///
/// What moved when this replaced Home / Market / The Pit / You:
///
///  * **Market** stopped being a destination. A 282-row alphabetical list is a
///    reference, not a place you go — it is now behind Ask's search and its
///    own "full directory" route.
///  * **The Pit** is a phase-gated placeholder for a discussion feature that
///    does not exist yet. It kept its route and left the bar; a quarter of the
///    navigation should not be a coming-soon page.
///  * **Home** was five stacked summaries. Its scanner hero and session
///    breadth are Today; its studies and verdict strip are Research; its
///    watchlist block was already duplicated on You.
enum BNavTab {
  home('Home'),
  today('Today'),
  pit('The Pit'),
  you('You');

  const BNavTab(this.label);

  /// The English name. Used by tests to address a tab, and as the fallback
  /// when no localisations are in scope.
  final String label;
}

/// The floating bottom navigation: an ink bar on a pale page.
///
/// Identical on every screen; only the lit slot moves. 66pt tall, inset 16
/// from each edge and 22 from the bottom, with a rim of 13% white and a
/// hand-painted top sheen — all as the boards draw it.
///
/// **The fill is opaque, and the boards' is not.** They specify 58% ink over a
/// backdrop blur, which is a real translucency and the one place in this theme
/// where a blur would still have something to sample. It composites over pale
/// paper to `#6F6B66` — a mid-grey — and on that the lit tab's `#FF8340`
/// measures 2.2:1, or 1.6:1 where it actually sits on the selection pill,
/// while the three tabs that are *not* selected sit at 3.5:1. The selected
/// destination becomes the faintest mark in the bar. Opaque ink puts the lit
/// tab at 7.2:1, and 4.8:1 over the pill.
///
/// The blur went with the translucency: at the opacity this needs, it would be
/// an offscreen layer per frame sampling pixels nothing can see.
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
        child: _SmokedBar(active: active, onTap: onTap),
      ),
    );
  }
}

class _SmokedBar extends StatelessWidget {
  const _SmokedBar({required this.active, required this.onTap});

  final BNavTab active;
  final ValueChanged<BNavTab> onTap;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final barWidth = constraints.maxWidth;
        final slot = (barWidth - 12) / BNavTab.values.length;

        // The shadow sits on the outside, the blur on the inside: a shadow
        // drawn within the ClipRRect is clipped away with everything else.
        return DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(BarbarianRadius.pill),
            boxShadow: const [
              BoxShadow(
                color: Color(0x421B1917),
                blurRadius: 34,
                offset: Offset(0, 16),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(BarbarianRadius.pill),
            child: DecoratedBox(
              decoration: BoxDecoration(
                // Ink on light, and the raised ink on dark so the bar still
                // lifts off a near-black page rather than sinking into it.
                color: context.colors.isDark
                    ? context.colors.inkRaised
                    : context.colors.ink,
                borderRadius: BorderRadius.circular(BarbarianRadius.pill),
                border: Border.all(color: const Color(0x21FFFFFF)),
              ),
              child: SizedBox(
                height: BGlassNav.height,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: Stack(
                    children: [
                      // The lit slot. The canvas cross-fades opacity and
                      // jumps position; sliding it is a deliberate
                      // improvement, on the boards' own overshooting curve.
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
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
        // A lit panel of the bar rather than a wash of the accent. An
        // accent wash under an accent icon left the selected tab reading at
        // 2.5:1 — the faintest mark in the bar.
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0x33FFFFFF), Color(0x12FFFFFF)],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x2E000000),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      // The specular top rim, painted rather than shadowed.
      foregroundDecoration: BoxDecoration(
        borderRadius: BorderRadius.circular(BarbarianRadius.pill),
        border: const Border(top: BorderSide(color: Color(0x52FFFFFF))),
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
    // The bar is smoked ink on every theme, so neither tone follows the page.
    final active = c.accentOnInk;
    final inactive = c.onInk.withValues(alpha: 0.76);
    final color = selected ? active : inactive;

    return Semantics(
      button: true,
      selected: selected,
      label: tab.labelFor(context),
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
                  BNavTab.today => BNavIcon.today,
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

/// The tab's name in the reader's language.
///
/// A separate extension rather than a field on the enum: an enum constant is
/// built at compile time and a translation needs a BuildContext. This is the
/// screen-reader label, so in an Arabic-first app it is exactly the string
/// that must not stay English.
extension BNavTabLabel on BNavTab {
  String labelFor(BuildContext context) {
    final l = AppLocalizations.of(context);
    return switch (this) {
      BNavTab.home => l.navHome,
      BNavTab.today => l.navToday,
      BNavTab.pit => l.navPit,
      BNavTab.you => l.navYou,
    };
  }
}
