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
}
