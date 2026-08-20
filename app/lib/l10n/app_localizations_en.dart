// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'ESTHMR';

  @override
  String get appTagline => 'Egyptian equities, unfiltered';

  @override
  String get navHome => 'Home';

  @override
  String get navToday => 'Today';

  @override
  String get navPit => 'The Pit';

  @override
  String get navYou => 'You';

  @override
  String get searchPlaceholder => 'Search by company name or symbol…';

  @override
  String oldestThingHere(String age) {
    return 'The oldest thing here: $age';
  }

  @override
  String get refresh => 'Refresh';

  @override
  String homeTodayKicker(String event) {
    return 'Today · $event';
  }

  @override
  String get homeNothingFiled => 'Nothing filed yet today';

  @override
  String get homeNothingFiledBody =>
      'When a company tells the exchange something, it lands here with what it means for anyone holding the share.';

  @override
  String get homeWatchlistLabel => 'From your watchlist';

  @override
  String get homeWatchlistManage => 'Manage';

  @override
  String get homeWatchlistEmpty => 'Follow companies to build your watchlist';

  @override
  String get homeWatchlistEmptyBody =>
      'Open any company and tap the bookmark. What you follow shows its last price here, and nothing else.';

  @override
  String get homePricesCaption => 'Last close · end-of-day EGX data';

  @override
  String get noQuote => 'No quote';

  @override
  String get financialsTitle => 'Net profit, as reported';

  @override
  String financialsUnitPeriod(String period) {
    return 'EGP m · $period';
  }

  @override
  String get financialsNone => 'No reported figures yet';

  @override
  String get financialsNoneBody =>
      'Figures are read from each company\'s filed accounts and from the results it announces to the exchange. Nothing has been read for this company yet.';

  @override
  String get financialsLatestFiling => 'Latest filing';

  @override
  String get financialsReadFiling => 'Read the filing';

  @override
  String get financialsByYear => 'Net profit by year';

  @override
  String get financialsTotalAssets => 'Total assets';

  @override
  String get financialsEquity => 'Owners\' equity';

  @override
  String get financialsLiabilities => 'Total liabilities';

  @override
  String get financialsOperatingCash => 'Cash from operations';

  @override
  String get financialsBasisGroup => 'Group';

  @override
  String get financialsBasisCompany => 'Company only';

  @override
  String financialsFootnote(String source) {
    return 'Figures in EGP millions, as filed. Neither source states revenue, so margins are not shown rather than estimated. Read from $source.';
  }

  @override
  String get sourceExchange => 'the Egyptian Exchange';

  @override
  String get sourceFiledAccounts => 'filed accounts';

  @override
  String get language => 'Language';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageArabic => 'العربية';

  @override
  String get languageSystem => 'System';

  @override
  String get legalNotLicensed =>
      'ESTHMR is a publisher and is not licensed by the Financial Regulatory Authority. We do not buy, we do not sell, and we do not advise.';

  @override
  String get scannerTitle => 'Opportunity Scanner';

  @override
  String get scannerSubtitle =>
      'What the published rule found, and what it missed';

  @override
  String get scannerOpen => 'Open the scanner';

  @override
  String get scannerNotDownloaded => 'Scanner not downloaded yet';

  @override
  String get scannerNotDownloadedBody =>
      'Open the app with a connection to fetch the latest report.';

  @override
  String get scannerNotPublished => 'The board has not published yet';

  @override
  String get scannerFoundToday => 'What the published rule found today';

  @override
  String get countQualified => 'Qualified';

  @override
  String get countWatching => 'Watching';

  @override
  String get countOutcomes => 'Outcomes';

  @override
  String get theSession => 'The session';

  @override
  String get youSubtitle => 'No account needed to read';

  @override
  String get watchlist => 'Watchlist';

  @override
  String get watchlistPricesOnly =>
      'Prices only. No score, no band and no reading appears here — those live on the company file, which you open yourself.';

  @override
  String get watchlistEmpty => 'Empty watchlist';

  @override
  String get watchlistEmptyBody =>
      'Follow a company and its price, filings and research land here.';

  @override
  String get browseCompanies => 'Browse companies';

  @override
  String get appearance => 'Appearance';

  @override
  String get followTheSystem => 'Follow the system';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get aboutTheData => 'About the data';

  @override
  String get marketData => 'Market data';

  @override
  String get notDownloaded => 'Not downloaded';

  @override
  String get companies => 'Companies';

  @override
  String get prices => 'Prices';

  @override
  String get noRealTimeFeed => 'Last close only. No real-time feed.';

  @override
  String get mostActive => 'Most active';

  @override
  String get fullDirectory => 'The full directory';

  @override
  String get searchCompanies => 'Search companies, tickers…';

  @override
  String get directoryMissing =>
      'The company directory is not on the device yet';

  @override
  String get researched => 'Researched';

  @override
  String get noCompanyMatches => 'No listed company matches that';

  @override
  String get clearSearch => 'Clear search';

  @override
  String get noMarketData => 'No market data downloaded yet';

  @override
  String get pitTitle => 'Discussion, with the evidence';

  @override
  String get pitComingSoon => 'Coming in the next development phase';

  @override
  String get pitWhatItCarries => 'What it will carry';

  @override
  String get pitDiscussion => 'Discussion';

  @override
  String get pitDiscussionBody => 'Open conversation about a company';

  @override
  String get pitQuestion => 'Question';

  @override
  String get pitQuestionBody => 'Ask the people reading the same filing';

  @override
  String get pitResearchNote => 'Research note';

  @override
  String get pitResearchNoteBody => 'Your own work, with sources';

  @override
  String get couldNotLoad => 'Could not load this';

  @override
  String get couldNotLoadBody =>
      'You may be offline. Anything already downloaded is still here.';

  @override
  String get tryAgain => 'Try again';

  @override
  String get sampleData => 'Sample data · not live prices';
}
