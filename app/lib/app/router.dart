import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/providers.dart';
import '../core/widgets/nav.dart';
import '../features/cash_or_trash/cash_or_trash_screen.dart';
import '../features/company/company_screen.dart';
import '../features/exit/exit_screen.dart';
import '../features/home/home_screen.dart';
import '../features/market/market_screen.dart';
import '../features/opportunities/opportunity_screen.dart';
import '../features/pit/pit_screen.dart';
import '../features/today/today_screen.dart';
import '../features/profile/you_screen.dart';
import '../features/research/article_screen.dart';

/// Route paths, in one place so nothing hard-codes a string.
abstract final class Routes {
  static const String home = '/';
  static const String today = '/today';
  static const String pit = '/pit';
  static const String you = '/you';

  /// The full directory and its search. The boards give this its own tab;
  /// until that is settled it is reached from Home.
  static const String directory = 'directory';

  /// «أقدر أخرج؟» — the exit question, for one company or as the primer.
  static const String exit = 'exit';
  static const String exitFor = 'exit/:ticker';

  static const String scanner = 'scanner';
  static const String cashOrTrash = 'cash-or-trash';
  static const String company = 'company/:ticker';
  static const String article = 'article';

  static String directoryPath(BNavTab from) => '${_root(from)}directory';

  static String exitPath(BNavTab from, [String? ticker]) =>
      '${_root(from)}exit${ticker == null ? '' : '/$ticker'}';

  static String companyPath(BNavTab from, String ticker) =>
      '${_root(from)}company/$ticker'.replaceAll('//', '/');

  static String scannerPath(BNavTab from) => '${_root(from)}scanner';

  static String cashOrTrashPath(BNavTab from) => '${_root(from)}cash-or-trash';

  static String articlePath(BNavTab from, String url, String title) =>
      Uri(
        path: '${_root(from)}article',
        queryParameters: {'url': url, 'title': title},
      ).toString();

  static String _root(BNavTab tab) => switch (tab) {
    BNavTab.home => '/',
    BNavTab.today => '/today/',
    BNavTab.pit => '/pit/',
    BNavTab.you => '/you/',
  };
}

/// Which navigation slot a route belongs to.
///
/// The rule the design is explicit about: opening a company from Home keeps
/// **Home** lit. A detail route never moves the app to another tab, which is
/// why every branch carries its own copy of the detail routes.
final _rootKey = GlobalKey<NavigatorState>();

GoRouter buildRouter() {
  List<RouteBase> detailRoutes(BNavTab tab) => [
    GoRoute(
      path: Routes.exit,
      builder: (context, state) => ExitScreen(parentTab: tab),
    ),
    GoRoute(
      path: Routes.exitFor,
      builder: (context, state) => ExitScreen(
        parentTab: tab,
        ticker: state.pathParameters['ticker'],
      ),
    ),
    GoRoute(
      path: Routes.directory,
      builder: (context, state) => MarketScreen(parentTab: tab),
    ),
    GoRoute(
      path: Routes.scanner,
      builder: (context, state) => OpportunityScreen(parentTab: tab),
    ),
    GoRoute(
      path: Routes.cashOrTrash,
      builder: (context, state) => CashOrTrashScreen(parentTab: tab),
    ),
    GoRoute(
      path: Routes.company,
      builder: (context, state) => CompanyScreen(
        ticker: state.pathParameters['ticker']!,
        parentTab: tab,
      ),
    ),
    GoRoute(
      path: Routes.article,
      builder: (context, state) => ArticleScreen(
        url: state.uri.queryParameters['url'] ?? '',
        title: state.uri.queryParameters['title'] ?? 'Research',
        parentTab: tab,
      ),
    ),
  ];

  // Development affordance: start on any route without tapping there.
  //   flutter run --dart-define=BARBARIAN_INITIAL_ROUTE=/market
  // Empty in every normal build, so production always opens on Home.
  const initial = String.fromEnvironment(
    'BARBARIAN_INITIAL_ROUTE',
    defaultValue: Routes.home,
  );

  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: initial,
    routes: [
      StatefulShellRoute.indexedStack(
        // The navigation lives here, once, above the branch stack — not inside
        // each screen. `indexedStack` keeps every visited branch alive, so a
        // per-screen nav would mean several nav bars in the tree at once, each
        // with its own idea of which slot is lit.
        builder: (context, state, shell) => _Shell(shell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.home,
                builder: (context, state) => const HomeScreen(),
                routes: detailRoutes(BNavTab.home),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.today,
                builder: (context, state) => const TodayScreen(),
                routes: detailRoutes(BNavTab.today),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.pit,
                builder: (context, state) =>
                    const PitScreen(parentTab: BNavTab.pit),
                routes: detailRoutes(BNavTab.pit),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.you,
                builder: (context, state) => const YouScreen(),
                routes: detailRoutes(BNavTab.you),
              ),
            ],
          ),
        ],
      ),
    ],
  );
}

/// The app frame: the branch stack with the one floating navigation over it.
class _Shell extends ConsumerWidget {
  const _Shell({required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Kept alive by the shell so it lives as long as the app is on screen:
    // this is what re-reads the published research on resume.
    ref.watch(contentRefreshProvider);

    return Stack(
      children: [
        shell,
        BGlassNav(
          active: BNavTab.values[shell.currentIndex],
          onTap: (tab) => shell.goBranch(
            tab.index,
            // Tapping the lit tab returns that branch to its root, which is
            // the platform convention on both iOS and Android.
            initialLocation: tab.index == shell.currentIndex,
          ),
        ),
      ],
    );
  }
}

/// Moves between primary destinations, preserving each branch's own stack.
///
/// Used by in-content actions such as the empty watchlist's "Browse companies".
void selectTab(BuildContext context, BNavTab tab) {
  final shell = StatefulNavigationShell.of(context);
  shell.goBranch(
    tab.index,
    initialLocation: tab.index == shell.currentIndex,
  );
}
