import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'app/router.dart';
import 'core/providers.dart';
import 'core/theme/barbarian_theme.dart';
import 'l10n/app_localizations.dart';

void main() {
  runApp(const ProviderScope(child: BarbarianApp()));
}

class BarbarianApp extends ConsumerStatefulWidget {
  const BarbarianApp({super.key});

  @override
  ConsumerState<BarbarianApp> createState() => _BarbarianAppState();
}

class _BarbarianAppState extends ConsumerState<BarbarianApp> {
  late final GoRouter _router = buildRouter();

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'ESTHMR',
      debugShowCheckedModeBanner: false,
      routerConfig: _router,
      theme: BarbarianTheme.light(),
      darkTheme: BarbarianTheme.dark(),
      themeMode: ref.watch(themeModeProvider),
      // Arabic is wired from the start so RTL is exercised in development
      // rather than discovered at translation time (spec §41).
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      // null follows the phone. Both languages are one tap apart on You.
      locale: ref.watch(localeProvider),
      builder: (context, child) {
        // Typography is a designed scale, so it is allowed to grow with the
        // reader's preference but not to a size that destroys the layout
        // (spec §42).
        final media = MediaQuery.of(context);
        return MediaQuery(
          data: media.copyWith(
            textScaler: media.textScaler.clamp(
              minScaleFactor: 0.9,
              maxScaleFactor: 1.4,
            ),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
