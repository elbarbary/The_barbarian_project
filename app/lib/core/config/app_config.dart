/// Every infrastructure assumption the app makes lives here and nowhere else.
///
/// Spec §26: "The base data URL must be configurable in Flutter. Never hardcode
/// infrastructure assumptions throughout the application. Use one configuration
/// object."
///
/// Override at build time without touching code:
///
/// ```sh
/// flutter run --dart-define=BARBARIAN_DATA_BASE=https://data.thebarbarian.trade
/// ```
library;

import 'package:flutter/foundation.dart';

@immutable
class AppConfig {
  const AppConfig({
    required this.dataBaseUrl,
    required this.siteBaseUrl,
    required this.communityApiBaseUrl,
    required this.connectTimeout,
    required this.receiveTimeout,
    required this.useBundledFixtures,
  });

  /// Production defaults.
  ///
  /// The website is served by Cloudflare from the repo's `public/` directory,
  /// and `public/.assetsignore` does not exclude `data/`, so the build pipeline's
  /// output at `public/data/v1/` is reachable at `<site>/data/v1/`.
  factory AppConfig.fromEnvironment() {
    const dataBase = String.fromEnvironment(
      'BARBARIAN_DATA_BASE',
      defaultValue: 'https://thebarbarianproject.com',
    );
    const siteBase = String.fromEnvironment(
      'BARBARIAN_SITE_BASE',
      defaultValue: 'https://thebarbarianproject.com',
    );
    // The Pit's Worker does not exist yet (spec §54 phase 4). Empty means
    // "community backend unavailable", which the app must survive (spec §56).
    const communityBase = String.fromEnvironment('BARBARIAN_COMMUNITY_API');
    // Phase 1 ran entirely off bundled fixtures (spec §57). The pipeline now
    // publishes real JSON to the site, so the default is the network — with the
    // bundled copy kept as a cold-start seed, not as the source.
    //
    // This defaulted to `true` for longer than it should have, which is exactly
    // why installed builds froze on whatever was bundled at compile time and
    // never saw a website update. Leave it false.
    const fixtures = bool.fromEnvironment('BARBARIAN_USE_FIXTURES');

    return const AppConfig(
      dataBaseUrl: dataBase,
      siteBaseUrl: siteBase,
      communityApiBaseUrl: communityBase,
      connectTimeout: Duration(seconds: 10),
      receiveTimeout: Duration(seconds: 20),
      useBundledFixtures: fixtures,
    );
  }

  /// Origin serving the static app API. No trailing slash.
  final String dataBaseUrl;

  /// Origin serving the existing website. Cash or Trash investigations open
  /// against this in a WebView (spec §10).
  final String siteBaseUrl;

  /// Cloudflare Worker origin for The Pit. Empty until phase 4.
  final String communityApiBaseUrl;

  final Duration connectTimeout;
  final Duration receiveTimeout;

  /// When true the app reads `assets/fixtures/` instead of the network.
  final bool useBundledFixtures;

  /// Origin serving live quotes. A Cloudflare Worker that re-reads the market
  /// at most once every [quoteRefresh] and hands out its cached copy in
  /// between, so the exchange feed is pulled once for everyone rather than once
  /// per device.
  static const String quotesUrl = String.fromEnvironment(
    'BARBARIAN_QUOTES_URL',
    defaultValue: 'https://quotes.thebarbarianproject.com/quotes.json',
  );

  /// How often the app asks for a new quote snapshot while it is in front.
  ///
  /// There is no point going faster: the underlying feed is itself delayed
  /// (see `QuoteSnapshot.delay`), so a tighter poll would re-fetch the same
  /// numbers and spend the reader's battery to do it.
  static const Duration quoteRefresh = Duration(minutes: 5);

  /// Schema version segment of the static API (spec §16, §17).
  static const String schemaVersion = 'v1';

  String get dataRoot => '$dataBaseUrl/data/$schemaVersion';

  String get manifestUrl => '$dataRoot/manifest.json';
  String get marketSnapshotUrl => '$dataRoot/market.json';
  String get companiesUrl => '$dataRoot/companies.json';
  String get opportunitiesLatestUrl => '$dataRoot/opportunities/latest.json';
  String get cashOrTrashIndexUrl => '$dataRoot/cash-or-trash/index.json';

  String companyUrl(String ticker) => '$dataRoot/companies/$ticker.json';
  String priceHistoryUrl(String ticker) => '$dataRoot/prices/$ticker.json';
  String opportunitiesHistoryUrl(String date) =>
      '$dataRoot/opportunities/history/$date.json';

  /// Resolves a research link that may be site-relative (`/kwin-investigation.html`)
  /// or already absolute.
  String resolveArticleUrl(String articleUrl) {
    if (articleUrl.startsWith('http://') || articleUrl.startsWith('https://')) {
      return articleUrl;
    }
    final path = articleUrl.startsWith('/') ? articleUrl : '/$articleUrl';
    return '$siteBaseUrl$path';
  }

  bool get hasCommunityBackend => communityApiBaseUrl.isNotEmpty;
}
