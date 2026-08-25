import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'app/router.dart';
import 'core/auth/auth_controller.dart';
import 'core/providers.dart';
import 'core/theme/barbarian_theme.dart';
import 'features/auth/sign_in_screen.dart';
import 'l10n/app_localizations.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Read the stored identity before the first frame so the app opens straight
  // on the gate or straight into the content, never on a flash of the wrong
  // one. It is injected, not fetched inside a provider, so everything that
  // branches on it can do so synchronously.
  final identity = await AuthController.load();
  runApp(
    ProviderScope(
      overrides: [authInitialProvider.overrideWithValue(identity)],
      child: const BarbarianApp(),
    ),
  );
}

class BarbarianApp extends ConsumerStatefulWidget {
  const BarbarianApp({super.key});

  @override
  ConsumerState<BarbarianApp> createState() => _BarbarianAppState();
}

class _BarbarianAppState extends ConsumerState<BarbarianApp> {
  late final GoRouter _router = buildRouter();

  /// The reader's text-scale preference, honoured but bounded so a large
  /// setting cannot break the designed layout (spec §42). Shared by both the
  /// gate and the app so the two look like one product.
  Widget _scaled(BuildContext context, Widget? child) {
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
  }

  @override
  Widget build(BuildContext context) {
    // The gate is all-or-nothing: signed-out shows the sign-in screen, every
    // other identity shows the app. Both are full MaterialApps sharing theme,
    // locale and text scaling, so choosing an identity swaps one for the other
    // without either borrowing the wrong chrome.
    final signedOut = ref.watch(authControllerProvider).isSignedOut;
    final themeMode = ref.watch(themeModeProvider);
    final locale = ref.watch(localeProvider);

    if (signedOut) {
      return MaterialApp(
        title: 'ESTHMR',
        debugShowCheckedModeBanner: false,
        theme: BarbarianTheme.light(),
        darkTheme: BarbarianTheme.dark(),
        themeMode: themeMode,
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        locale: locale,
        home: const SignInScreen(),
        builder: _scaled,
      );
    }

    return MaterialApp.router(
      title: 'ESTHMR',
      debugShowCheckedModeBanner: false,
      routerConfig: _router,
      theme: BarbarianTheme.light(),
      darkTheme: BarbarianTheme.dark(),
      themeMode: themeMode,
      // Arabic is wired from the start so RTL is exercised in development
      // rather than discovered at translation time (spec §41).
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      // null follows the phone. Both languages are one tap apart on You.
      locale: locale,
      builder: _scaled,
    );
  }
}
