import 'package:flutter/material.dart';

import '../theme/barbarian_theme.dart';

/// The single screen-entry motion in the app: a 4px rise and a fade, played
/// once when a route mounts.
///
/// The canvas defines exactly one entry animation (`bRise`, 240ms ease-out) and
/// uses it everywhere. Adding a second entry motion anywhere would break the
/// product's rhythm, so screens compose this rather than rolling their own.
class BRiseIn extends StatefulWidget {
  const BRiseIn({
    required this.child,
    this.duration = const Duration(milliseconds: 240),
    this.offset = 4,
    this.delay = Duration.zero,
    super.key,
  });

  final Widget child;
  final Duration duration;
  final double offset;

  /// Stagger for lists. Keep small — the design does not cascade.
  final Duration delay;

  @override
  State<BRiseIn> createState() => _BRiseInState();
}

class _BRiseInState extends State<BRiseIn> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: widget.duration,
  );

  @override
  void initState() {
    super.initState();
    if (widget.delay == Duration.zero) {
      _controller.forward();
    } else {
      Future<void>.delayed(widget.delay, () {
        if (mounted) _controller.forward();
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Respect the platform's reduce-motion setting: the content still appears,
    // it simply does not travel (spec §42).
    if (MediaQuery.disableAnimationsOf(context)) return widget.child;

    final curved = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    return FadeTransition(
      opacity: curved,
      child: AnimatedBuilder(
        animation: curved,
        builder: (context, child) => Transform.translate(
          offset: Offset(0, widget.offset * (1 - curved.value)),
          child: child,
        ),
        child: widget.child,
      ),
    );
  }
}

/// The house press feedback: the surface scales down and springs back.
///
/// There is no ink ripple anywhere in this design, which is why the theme sets
/// [NoSplash]. Use this instead of [InkWell] for every tappable surface.
class BPressable extends StatefulWidget {
  const BPressable({
    required this.child,
    this.onTap,
    this.scale = 0.98,
    this.duration = BarbarianMotion.standard,
    this.semanticLabel,
    this.button = true,
    super.key,
  });

  /// The tighter 0.94 used by the 42px icon buttons.
  const BPressable.icon({
    required this.child,
    this.onTap,
    this.duration = BarbarianMotion.fast,
    this.semanticLabel,
    this.button = true,
    super.key,
  }) : scale = 0.94;

  final Widget child;
  final VoidCallback? onTap;
  final double scale;
  final Duration duration;
  final String? semanticLabel;
  final bool button;

  @override
  State<BPressable> createState() => _BPressableState();
}

class _BPressableState extends State<BPressable> {
  bool _down = false;

  void _set(bool value) {
    if (widget.onTap == null || _down == value) return;
    setState(() => _down = value);
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onTap != null;

    return Semantics(
      button: widget.button && enabled,
      enabled: enabled,
      label: widget.semanticLabel,
      // A label needs its own semantics node, otherwise it merges into whatever
      // the child already announces and the description is lost — a screen
      // reader would read an icon-only button as nothing at all.
      container: widget.semanticLabel != null,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onTap,
        onTapDown: (_) => _set(true),
        onTapUp: (_) => _set(false),
        onTapCancel: () => _set(false),
        child: AnimatedScale(
          scale: _down ? widget.scale : 1,
          duration: widget.duration,
          curve: BarbarianMotion.easeOut,
          child: widget.child,
        ),
      ),
    );
  }
}
