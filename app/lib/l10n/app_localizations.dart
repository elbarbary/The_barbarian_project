import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'ESTHMR'**
  String get appName;

  /// Masthead subtitle under the wordmark
  ///
  /// In en, this message translates to:
  /// **'Egyptian equities, unfiltered'**
  String get appTagline;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get navToday;

  /// No description provided for @navPit.
  ///
  /// In en, this message translates to:
  /// **'The Pit'**
  String get navPit;

  /// No description provided for @navYou.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get navYou;

  /// No description provided for @searchPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Search by company name or symbol…'**
  String get searchPlaceholder;

  /// No description provided for @oldestThingHere.
  ///
  /// In en, this message translates to:
  /// **'The oldest thing here: {age}'**
  String oldestThingHere(String age);

  /// No description provided for @refresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get refresh;

  /// No description provided for @homeTodayKicker.
  ///
  /// In en, this message translates to:
  /// **'Today · {event}'**
  String homeTodayKicker(String event);

  /// No description provided for @homeNothingFiled.
  ///
  /// In en, this message translates to:
  /// **'Nothing filed yet today'**
  String get homeNothingFiled;

  /// No description provided for @homeNothingFiledBody.
  ///
  /// In en, this message translates to:
  /// **'When a company tells the exchange something, it lands here with what it means for anyone holding the share.'**
  String get homeNothingFiledBody;

  /// No description provided for @homeWatchlistLabel.
  ///
  /// In en, this message translates to:
  /// **'From your watchlist'**
  String get homeWatchlistLabel;

  /// No description provided for @homeWatchlistManage.
  ///
  /// In en, this message translates to:
  /// **'Manage'**
  String get homeWatchlistManage;

  /// No description provided for @homeWatchlistEmpty.
  ///
  /// In en, this message translates to:
  /// **'Follow companies to build your watchlist'**
  String get homeWatchlistEmpty;

  /// No description provided for @homeWatchlistEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Open any company and tap the bookmark. What you follow shows its last price here, and nothing else.'**
  String get homeWatchlistEmptyBody;

  /// No description provided for @homePricesCaption.
  ///
  /// In en, this message translates to:
  /// **'Last close · end-of-day EGX data'**
  String get homePricesCaption;

  /// No description provided for @noQuote.
  ///
  /// In en, this message translates to:
  /// **'No quote'**
  String get noQuote;

  /// No description provided for @financialsTitle.
  ///
  /// In en, this message translates to:
  /// **'Net profit, as reported'**
  String get financialsTitle;

  /// No description provided for @financialsUnitPeriod.
  ///
  /// In en, this message translates to:
  /// **'EGP m · {period}'**
  String financialsUnitPeriod(String period);

  /// No description provided for @financialsNone.
  ///
  /// In en, this message translates to:
  /// **'No reported figures yet'**
  String get financialsNone;

  /// No description provided for @financialsNoneBody.
  ///
  /// In en, this message translates to:
  /// **'Figures are read from each company\'s filed accounts and from the results it announces to the exchange. Nothing has been read for this company yet.'**
  String get financialsNoneBody;

  /// No description provided for @financialsLatestFiling.
  ///
  /// In en, this message translates to:
  /// **'Latest filing'**
  String get financialsLatestFiling;

  /// No description provided for @financialsReadFiling.
  ///
  /// In en, this message translates to:
  /// **'Read the filing'**
  String get financialsReadFiling;

  /// No description provided for @financialsByYear.
  ///
  /// In en, this message translates to:
  /// **'Net profit by year'**
  String get financialsByYear;

  /// No description provided for @financialsTotalAssets.
  ///
  /// In en, this message translates to:
  /// **'Total assets'**
  String get financialsTotalAssets;

  /// No description provided for @financialsEquity.
  ///
  /// In en, this message translates to:
  /// **'Owners\' equity'**
  String get financialsEquity;

  /// No description provided for @financialsLiabilities.
  ///
  /// In en, this message translates to:
  /// **'Total liabilities'**
  String get financialsLiabilities;

  /// No description provided for @financialsOperatingCash.
  ///
  /// In en, this message translates to:
  /// **'Cash from operations'**
  String get financialsOperatingCash;

  /// No description provided for @financialsBasisGroup.
  ///
  /// In en, this message translates to:
  /// **'Group'**
  String get financialsBasisGroup;

  /// No description provided for @financialsBasisCompany.
  ///
  /// In en, this message translates to:
  /// **'Company only'**
  String get financialsBasisCompany;

  /// No description provided for @financialsFootnote.
  ///
  /// In en, this message translates to:
  /// **'Figures in EGP millions, as filed. Neither source states revenue, so margins are not shown rather than estimated. Read from {source}.'**
  String financialsFootnote(String source);

  /// No description provided for @sourceExchange.
  ///
  /// In en, this message translates to:
  /// **'the Egyptian Exchange'**
  String get sourceExchange;

  /// No description provided for @sourceFiledAccounts.
  ///
  /// In en, this message translates to:
  /// **'filed accounts'**
  String get sourceFiledAccounts;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @languageArabic.
  ///
  /// In en, this message translates to:
  /// **'العربية'**
  String get languageArabic;

  /// No description provided for @languageSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get languageSystem;

  /// LEGAL. Spec §8.12. Must be reviewed by an Egyptian lawyer before release — see lib/core/widgets/legal.dart.
  ///
  /// In en, this message translates to:
  /// **'ESTHMR is a publisher and is not licensed by the Financial Regulatory Authority. We do not buy, we do not sell, and we do not advise. Nothing here is a recommendation to trade any security.'**
  String get legalNotLicensed;

  /// No description provided for @scannerTitle.
  ///
  /// In en, this message translates to:
  /// **'Opportunity Scanner'**
  String get scannerTitle;

  /// No description provided for @scannerSubtitle.
  ///
  /// In en, this message translates to:
  /// **'What the published rule found, and what it missed'**
  String get scannerSubtitle;

  /// No description provided for @scannerOpen.
  ///
  /// In en, this message translates to:
  /// **'Open the scanner'**
  String get scannerOpen;

  /// No description provided for @scannerNotDownloaded.
  ///
  /// In en, this message translates to:
  /// **'Scanner not downloaded yet'**
  String get scannerNotDownloaded;

  /// No description provided for @scannerNotDownloadedBody.
  ///
  /// In en, this message translates to:
  /// **'Open the app with a connection to fetch the latest report.'**
  String get scannerNotDownloadedBody;

  /// No description provided for @scannerNotPublished.
  ///
  /// In en, this message translates to:
  /// **'The board has not published yet'**
  String get scannerNotPublished;

  /// No description provided for @scannerFoundToday.
  ///
  /// In en, this message translates to:
  /// **'What the published rule found today'**
  String get scannerFoundToday;

  /// No description provided for @countQualified.
  ///
  /// In en, this message translates to:
  /// **'Qualified'**
  String get countQualified;

  /// No description provided for @countWatching.
  ///
  /// In en, this message translates to:
  /// **'Watching'**
  String get countWatching;

  /// No description provided for @countOutcomes.
  ///
  /// In en, this message translates to:
  /// **'Outcomes'**
  String get countOutcomes;

  /// No description provided for @theSession.
  ///
  /// In en, this message translates to:
  /// **'The session'**
  String get theSession;

  /// No description provided for @youSubtitle.
  ///
  /// In en, this message translates to:
  /// **'No account needed to read'**
  String get youSubtitle;

  /// No description provided for @watchlist.
  ///
  /// In en, this message translates to:
  /// **'Watchlist'**
  String get watchlist;

  /// No description provided for @watchlistPricesOnly.
  ///
  /// In en, this message translates to:
  /// **'Prices only. No score, no band and no reading appears here — those live on the company file, which you open yourself.'**
  String get watchlistPricesOnly;

  /// No description provided for @watchlistEmpty.
  ///
  /// In en, this message translates to:
  /// **'Empty watchlist'**
  String get watchlistEmpty;

  /// No description provided for @watchlistEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Follow a company and its price, filings and research land here.'**
  String get watchlistEmptyBody;

  /// No description provided for @browseCompanies.
  ///
  /// In en, this message translates to:
  /// **'Browse companies'**
  String get browseCompanies;

  /// No description provided for @appearance.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get appearance;

  /// No description provided for @followTheSystem.
  ///
  /// In en, this message translates to:
  /// **'Follow the system'**
  String get followTheSystem;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @aboutTheData.
  ///
  /// In en, this message translates to:
  /// **'About the data'**
  String get aboutTheData;

  /// No description provided for @marketData.
  ///
  /// In en, this message translates to:
  /// **'Market data'**
  String get marketData;

  /// No description provided for @notDownloaded.
  ///
  /// In en, this message translates to:
  /// **'Not downloaded'**
  String get notDownloaded;

  /// No description provided for @companies.
  ///
  /// In en, this message translates to:
  /// **'Companies'**
  String get companies;

  /// No description provided for @prices.
  ///
  /// In en, this message translates to:
  /// **'Prices'**
  String get prices;

  /// No description provided for @noRealTimeFeed.
  ///
  /// In en, this message translates to:
  /// **'Last close only. No real-time feed.'**
  String get noRealTimeFeed;

  /// No description provided for @mostActive.
  ///
  /// In en, this message translates to:
  /// **'Most active'**
  String get mostActive;

  /// No description provided for @fullDirectory.
  ///
  /// In en, this message translates to:
  /// **'The full directory'**
  String get fullDirectory;

  /// No description provided for @searchCompanies.
  ///
  /// In en, this message translates to:
  /// **'Search companies, tickers…'**
  String get searchCompanies;

  /// No description provided for @directoryMissing.
  ///
  /// In en, this message translates to:
  /// **'The company directory is not on the device yet'**
  String get directoryMissing;

  /// No description provided for @researched.
  ///
  /// In en, this message translates to:
  /// **'Researched'**
  String get researched;

  /// No description provided for @noCompanyMatches.
  ///
  /// In en, this message translates to:
  /// **'No listed company matches that'**
  String get noCompanyMatches;

  /// No description provided for @clearSearch.
  ///
  /// In en, this message translates to:
  /// **'Clear search'**
  String get clearSearch;

  /// No description provided for @noMarketData.
  ///
  /// In en, this message translates to:
  /// **'No market data downloaded yet'**
  String get noMarketData;

  /// No description provided for @pitTitle.
  ///
  /// In en, this message translates to:
  /// **'Discussion, with the evidence'**
  String get pitTitle;

  /// No description provided for @pitComingSoon.
  ///
  /// In en, this message translates to:
  /// **'Coming in the next development phase'**
  String get pitComingSoon;

  /// No description provided for @pitWhatItCarries.
  ///
  /// In en, this message translates to:
  /// **'What it will carry'**
  String get pitWhatItCarries;

  /// No description provided for @pitDiscussion.
  ///
  /// In en, this message translates to:
  /// **'Discussion'**
  String get pitDiscussion;

  /// No description provided for @pitDiscussionBody.
  ///
  /// In en, this message translates to:
  /// **'Open conversation about a company'**
  String get pitDiscussionBody;

  /// No description provided for @pitQuestion.
  ///
  /// In en, this message translates to:
  /// **'Question'**
  String get pitQuestion;

  /// No description provided for @pitQuestionBody.
  ///
  /// In en, this message translates to:
  /// **'Ask the people reading the same filing'**
  String get pitQuestionBody;

  /// No description provided for @pitResearchNote.
  ///
  /// In en, this message translates to:
  /// **'Research note'**
  String get pitResearchNote;

  /// No description provided for @pitResearchNoteBody.
  ///
  /// In en, this message translates to:
  /// **'Your own work, with sources'**
  String get pitResearchNoteBody;

  /// No description provided for @couldNotLoad.
  ///
  /// In en, this message translates to:
  /// **'Could not load this'**
  String get couldNotLoad;

  /// No description provided for @couldNotLoadBody.
  ///
  /// In en, this message translates to:
  /// **'You may be offline. Anything already downloaded is still here.'**
  String get couldNotLoadBody;

  /// No description provided for @tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get tryAgain;

  /// No description provided for @sampleData.
  ///
  /// In en, this message translates to:
  /// **'Sample data · not live prices'**
  String get sampleData;

  /// No description provided for @homeAlsoFiled.
  ///
  /// In en, this message translates to:
  /// **'Filed with the exchange'**
  String get homeAlsoFiled;

  /// No description provided for @homeAllFilings.
  ///
  /// In en, this message translates to:
  /// **'All filings'**
  String get homeAllFilings;

  /// No description provided for @homeFilingsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} filings today'**
  String homeFilingsCount(int count);

  /// No description provided for @legalNotLicensedShort.
  ///
  /// In en, this message translates to:
  /// **'Not licensed by the FRA. Not a recommendation.'**
  String get legalNotLicensedShort;

  /// No description provided for @homeImportantToday.
  ///
  /// In en, this message translates to:
  /// **'Important today'**
  String get homeImportantToday;

  /// No description provided for @homeNothingUnusual.
  ///
  /// In en, this message translates to:
  /// **'Nothing unusual today'**
  String get homeNothingUnusual;

  /// No description provided for @homeNothingUnusualBody.
  ///
  /// In en, this message translates to:
  /// **'No company traded unusually against its own normal volume on the day it filed. A quiet session is a real answer.'**
  String get homeNothingUnusualBody;

  /// No description provided for @homeLatestNews.
  ///
  /// In en, this message translates to:
  /// **'Latest news'**
  String get homeLatestNews;

  /// No description provided for @homeAllNews.
  ///
  /// In en, this message translates to:
  /// **'All news'**
  String get homeAllNews;

  /// No description provided for @homeVolumeKicker.
  ///
  /// In en, this message translates to:
  /// **'Volume {ratio}x normal'**
  String homeVolumeKicker(String ratio);

  /// No description provided for @homeFiledToday.
  ///
  /// In en, this message translates to:
  /// **'Filed today'**
  String get homeFiledToday;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
