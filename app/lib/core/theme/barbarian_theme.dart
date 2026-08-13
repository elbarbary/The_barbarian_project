import 'package:flutter/material.dart';

import 'barbarian_colors.dart';
import 'barbarian_shapes.dart';
import 'barbarian_typography.dart';

export 'barbarian_colors.dart';
export 'barbarian_palette.dart';
export 'barbarian_shapes.dart';
export 'barbarian_typography.dart';

/// Assembles the two themes from the token set.
@immutable
abstract final class BarbarianTheme {
  static ThemeData light() => _build(BarbarianColors.light());

  static ThemeData dark() => _build(BarbarianColors.dark());

  static ThemeData _build(BarbarianColors c) {
    final scheme =
        ColorScheme.fromSeed(
          seedColor: c.accent,
          brightness: c.brightness,
        ).copyWith(
          surface: c.background,
          primary: c.accent,
          onPrimary: c.onAccent,
          error: c.down,
        );

    return ThemeData(
      useMaterial3: true,
      brightness: c.brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: c.background,
      canvasColor: c.background,
      // There is no ink ripple anywhere in the design: every tappable surface
      // scales down by 2-6% and springs back. A ripple on a dark gradient hero
      // card or on bone paper reads as someone else's app, so Material's splash
      // is switched off globally and press feedback comes from BPressable.
      splashFactory: NoSplash.splashFactory,
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      hoverColor: Colors.transparent,
      textTheme: BarbarianType.textTheme(c.textPrimary, c.textSecondary),
      fontFamily: BarbarianType.text,
      dividerTheme: DividerThemeData(
        color: c.hairline,
        thickness: 1,
        space: 1,
      ),
      iconTheme: IconThemeData(color: c.textPrimary, size: 20),
      // The design has no AppBar anywhere: screens own their headers, which is
      // what lets the big Outfit titles scroll away naturally.
      appBarTheme: AppBarTheme(
        backgroundColor: c.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: BarbarianType.titleL.copyWith(color: c.textPrimary),
      ),
      cardTheme: CardThemeData(
        color: c.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: const RoundedRectangleBorder(borderRadius: BarbarianRadius.card),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: c.surface,
        selectedColor: c.ink,
        side: BorderSide.none,
        labelStyle: BarbarianType.label.copyWith(color: c.textMuted),
        secondaryLabelStyle: BarbarianType.label.copyWith(color: c.onInk),
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(
          horizontal: BarbarianSpace.lg,
          vertical: BarbarianSpace.sm,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.surface,
        hintStyle: BarbarianType.label.copyWith(color: c.textMuted),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: BarbarianSpace.xl,
          vertical: BarbarianSpace.lg,
        ),
        border: const OutlineInputBorder(
          borderRadius: BarbarianRadius.chip,
          borderSide: BorderSide.none,
        ),
        enabledBorder: const OutlineInputBorder(
          borderRadius: BarbarianRadius.chip,
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BarbarianRadius.chip,
          borderSide: BorderSide(color: c.accent, width: 1.5),
        ),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: const WidgetStatePropertyAll(Color(0xFFFFFFFF)),
        trackColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? c.accent
              : c.textMuted.withValues(alpha: 0.24),
        ),
        trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: c.ink,
        contentTextStyle: BarbarianType.bodyM.copyWith(color: c.onInk),
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(borderRadius: BarbarianRadius.card),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
        },
      ),
      extensions: [c],
    );
  }
}

/// Ergonomics: `context.colors.accent`, `context.isDark`.
extension BarbarianThemeContext on BuildContext {
  BarbarianColors get colors =>
      Theme.of(this).extension<BarbarianColors>() ?? BarbarianColors.light();

  bool get isDark => colors.isDark;

  /// True when the app is laid out right-to-left. Screens that place a Latin
  /// ticker beside an Arabic name need to know (spec §41).
  bool get isRtl => Directionality.of(this) == TextDirection.rtl;
}
