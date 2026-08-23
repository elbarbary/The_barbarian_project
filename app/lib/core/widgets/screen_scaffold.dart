import 'package:flutter/material.dart';

import '../theme/barbarian_theme.dart';
import 'motion.dart';
import 'nav.dart';
import 'surfaces.dart';

/// The frame every route shares.
///
/// Layering, bottom to top: the scrolling body, the scrim that dissolves
/// content behind the navigation, then any pinned overlay the screen supplies.
///
/// The floating navigation is **not** here — it lives once in the router's
/// shell, above the branch stack. A screen never draws it and never decides
/// which slot is lit; the shell already knows.
///
/// The bottom scroll padding is not arbitrary: 22 (nav inset) + 66 (nav height)
/// + 36 (clearance) = 124, so the last row of any list clears the bar rather
/// than hiding beneath it.
class BScreenScaffold extends StatelessWidget {
  const BScreenScaffold({
    required this.children,
    required this.blockGap,
    this.overlay,
    this.floatingAction,
    this.controller,
    this.animateIn = true,
    super.key,
  });

  final List<Widget> children;

  /// Vertical rhythm between blocks. Deliberately per-screen rather than a
  /// token: the boards use 22/24/20/20/18/20/22/22 across their eight screens,
  /// and flattening that to one number visibly changes several of them.
  final double blockGap;

  /// Pinned above the scrim and below the nav — a composer bar, a filter row.
  final Widget? overlay;

  /// Pinned above everything — the Pit's compose button.
  final Widget? floatingAction;

  final ScrollController? controller;
  final bool animateIn;

  static const double topInset = 54;
  static const double bottomInset = 124;
  static const double horizontalInset = 16;

  @override
  Widget build(BuildContext context) {
    return _Frame(
      blockGap: blockGap,
      overlay: overlay,
      floatingAction: floatingAction,
      controller: controller,
      animateIn: animateIn,
      children: children,
    );
  }
}

/// A pushed detail route. Same frame; the shell keeps the parent's slot lit.
class BDetailScaffold extends StatelessWidget {
  const BDetailScaffold({
    required this.children,
    required this.blockGap,
    this.overlay,
    this.padded = true,
    super.key,
  });

  final List<Widget> children;
  final double blockGap;
  final Widget? overlay;

  /// False when the screen's first block is a full-bleed header that must run
  /// edge to edge.
  final bool padded;

  @override
  Widget build(BuildContext context) {
    return _Frame(
      blockGap: blockGap,
      overlay: overlay,
      padded: padded,
      children: children,
    );
  }
}

class _Frame extends StatelessWidget {
  const _Frame({
    required this.children,
    required this.blockGap,
    this.overlay,
    this.floatingAction,
    this.controller,
    this.animateIn = true,
    this.padded = true,
  });

  final List<Widget> children;
  final double blockGap;
  final Widget? overlay;
  final Widget? floatingAction;
  final ScrollController? controller;
  final bool animateIn;
  final bool padded;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final topPadding = MediaQuery.paddingOf(context).top;
    final inset = padded ? BScreenScaffold.horizontalInset : 0.0;

    final column = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < children.length; i++) ...[
          if (i > 0) SizedBox(height: blockGap),
          children[i],
        ],
      ],
    );

    return Scaffold(
      backgroundColor: c.background,
      body: Stack(
        children: [
          // The page ramp. This was five blurred orbs drifting on a 48-second
          // loop, because every surface above it was translucent and needed
          // something to refract. Nothing above it is translucent now, so the
          // orbs cost a full-screen 34-sigma blur and an offscreen buffer per
          // frame to tint a paper ground the boards draw flat.
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(gradient: c.pageGradient),
            ),
          ),
          // The canvas hides scrollbars globally; on device the content is the
          // chrome, so a track down the edge would be the only hard line in it.
          ScrollConfiguration(
            behavior: ScrollConfiguration.of(
              context,
            ).copyWith(scrollbars: false, overscroll: false),
            child: SingleChildScrollView(
              controller: controller,
              padding: EdgeInsets.fromLTRB(
                inset,
                (topPadding > 0 ? topPadding : BScreenScaffold.topInset) + 8,
                inset,
                BScreenScaffold.bottomInset,
              ),
              child: animateIn ? BRiseIn(child: column) : column,
            ),
          ),
          const PositionedDirectional(
            start: 0,
            end: 0,
            bottom: 0,
            child: BBottomScrim(),
          ),
          if (overlay case final Widget o)
            PositionedDirectional(start: 0, end: 0, bottom: 0, child: o),
          if (floatingAction case final Widget f)
            PositionedDirectional(
              end: BScreenScaffold.horizontalInset + 6,
              bottom: BGlassNav.insetBottom + BGlassNav.height + 16,
              child: f,
            ),
        ],
      ),
    );
  }
}
