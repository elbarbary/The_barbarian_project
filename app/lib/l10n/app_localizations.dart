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
  /// **'Egyptian shares, in plain words'**
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
  /// **'When a company tells the exchange something, it appears here with what it means for anyone who owns the shares.'**
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
  /// **'Scanner'**
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
  /// **'Cleared every rule'**
  String get countQualified;

  /// No description provided for @countWatching.
  ///
  /// In en, this message translates to:
  /// **'Cleared some rules'**
  String get countWatching;

  /// No description provided for @countOutcomes.
  ///
  /// In en, this message translates to:
  /// **'Rule log'**
  String get countOutcomes;

  /// No description provided for @theSession.
  ///
  /// In en, this message translates to:
  /// **'The day\'s trading'**
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
  /// **'Prices only. No score and no opinion appears here — those live on the company page, which you open yourself.'**
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
  /// **'All announcements'**
  String get homeAllFilings;

  /// No description provided for @homeFilingsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} announcements today'**
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
  /// **'No company traded much more than usual on the day it announced something. A quiet day is a real answer.'**
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
  /// **'Traded {ratio}× its usual volume'**
  String homeVolumeKicker(String ratio);

  /// No description provided for @homeFiledToday.
  ///
  /// In en, this message translates to:
  /// **'Filed today'**
  String get homeFiledToday;

  /// No description provided for @tabOverview.
  ///
  /// In en, this message translates to:
  /// **'Overview'**
  String get tabOverview;

  /// No description provided for @tabFinancials.
  ///
  /// In en, this message translates to:
  /// **'Financials'**
  String get tabFinancials;

  /// No description provided for @tabPrice.
  ///
  /// In en, this message translates to:
  /// **'Price'**
  String get tabPrice;

  /// No description provided for @tabResearch.
  ///
  /// In en, this message translates to:
  /// **'The file'**
  String get tabResearch;

  /// No description provided for @tabTalk.
  ///
  /// In en, this message translates to:
  /// **'Talk'**
  String get tabTalk;

  /// No description provided for @companyNotOnDevice.
  ///
  /// In en, this message translates to:
  /// **'{ticker} is not on the device'**
  String companyNotOnDevice(String ticker);

  /// No description provided for @companyNotOnDeviceBody.
  ///
  /// In en, this message translates to:
  /// **'Open this company once with a connection and it stays available offline.'**
  String get companyNotOnDeviceBody;

  /// No description provided for @discussionArrives.
  ///
  /// In en, this message translates to:
  /// **'Discussion arrives with The Pit'**
  String get discussionArrives;

  /// No description provided for @discussionArrivesBody.
  ///
  /// In en, this message translates to:
  /// **'Company threads land here once the community backend exists. Everything else on this screen works without it.'**
  String get discussionArrivesBody;

  /// No description provided for @back.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get back;

  /// No description provided for @followTicker.
  ///
  /// In en, this message translates to:
  /// **'Follow {ticker}'**
  String followTicker(String ticker);

  /// No description provided for @followingTicker.
  ///
  /// In en, this message translates to:
  /// **'Following {ticker}. Tap to unfollow.'**
  String followingTicker(String ticker);

  /// No description provided for @prevClose.
  ///
  /// In en, this message translates to:
  /// **'Prev close'**
  String get prevClose;

  /// No description provided for @volume.
  ///
  /// In en, this message translates to:
  /// **'Volume'**
  String get volume;

  /// No description provided for @marketCap.
  ///
  /// In en, this message translates to:
  /// **'Mkt cap'**
  String get marketCap;

  /// No description provided for @dayHigh.
  ///
  /// In en, this message translates to:
  /// **'Day high'**
  String get dayHigh;

  /// No description provided for @dayLow.
  ///
  /// In en, this message translates to:
  /// **'Day low'**
  String get dayLow;

  /// No description provided for @previousClose.
  ///
  /// In en, this message translates to:
  /// **'Previous close'**
  String get previousClose;

  /// No description provided for @avgVolume30d.
  ///
  /// In en, this message translates to:
  /// **'Avg volume 30d'**
  String get avgVolume30d;

  /// No description provided for @sharesOutstanding.
  ///
  /// In en, this message translates to:
  /// **'Shares outstanding'**
  String get sharesOutstanding;

  /// No description provided for @floatShares.
  ///
  /// In en, this message translates to:
  /// **'Float shares'**
  String get floatShares;

  /// No description provided for @sector.
  ///
  /// In en, this message translates to:
  /// **'Sector'**
  String get sector;

  /// No description provided for @movedThisMonth.
  ///
  /// In en, this message translates to:
  /// **'How it has moved this month'**
  String get movedThisMonth;

  /// No description provided for @whatNumbersSay.
  ///
  /// In en, this message translates to:
  /// **'What the numbers say'**
  String get whatNumbersSay;

  /// No description provided for @whatThatMeans.
  ///
  /// In en, this message translates to:
  /// **'What that means'**
  String get whatThatMeans;

  /// No description provided for @thisSession.
  ///
  /// In en, this message translates to:
  /// **'This day\'s trading'**
  String get thisSession;

  /// No description provided for @performance.
  ///
  /// In en, this message translates to:
  /// **'Performance'**
  String get performance;

  /// No description provided for @sizeAndOwnership.
  ///
  /// In en, this message translates to:
  /// **'Company'**
  String get sizeAndOwnership;

  /// No description provided for @noDetailYet.
  ///
  /// In en, this message translates to:
  /// **'No detail for this company yet'**
  String get noDetailYet;

  /// No description provided for @noPriceHistory.
  ///
  /// In en, this message translates to:
  /// **'No price history for this company'**
  String get noPriceHistory;

  /// No description provided for @noSessionsInRange.
  ///
  /// In en, this message translates to:
  /// **'No sessions in this range'**
  String get noSessionsInRange;

  /// No description provided for @noStudyYet.
  ///
  /// In en, this message translates to:
  /// **'No study published on this company yet'**
  String get noStudyYet;

  /// No description provided for @noStudyYetBody.
  ///
  /// In en, this message translates to:
  /// **'Companies are studied one at a time. When this one is read, the investigation appears here.'**
  String get noStudyYetBody;

  /// No description provided for @readFullInvestigation.
  ///
  /// In en, this message translates to:
  /// **'Read the full investigation'**
  String get readFullInvestigation;

  /// No description provided for @scannerHistory.
  ///
  /// In en, this message translates to:
  /// **'Scanner history'**
  String get scannerHistory;

  /// No description provided for @studyLabel.
  ///
  /// In en, this message translates to:
  /// **'Six Pillars'**
  String get studyLabel;

  /// No description provided for @lastSessions.
  ///
  /// In en, this message translates to:
  /// **'Last {count} sessions'**
  String lastSessions(int count);

  /// No description provided for @canIGetOut.
  ///
  /// In en, this message translates to:
  /// **'Can I get out?'**
  String get canIGetOut;

  /// No description provided for @itStopsTrading.
  ///
  /// In en, this message translates to:
  /// **'It stops trading'**
  String get itStopsTrading;

  /// No description provided for @scanNoReport.
  ///
  /// In en, this message translates to:
  /// **'No scanner report downloaded yet'**
  String get scanNoReport;

  /// No description provided for @scanNoReportBody.
  ///
  /// In en, this message translates to:
  /// **'The scanner publishes after each session. Open this once with a connection and it stays on the device.'**
  String get scanNoReportBody;

  /// No description provided for @scanNotRunToday.
  ///
  /// In en, this message translates to:
  /// **'The scanner has not run today'**
  String get scanNotRunToday;

  /// No description provided for @scanNotRunTodayBody.
  ///
  /// In en, this message translates to:
  /// **'Nothing has cleared the test since the last session. That is a result, not an error.'**
  String get scanNotRunTodayBody;

  /// No description provided for @scanReportDateUnknown.
  ///
  /// In en, this message translates to:
  /// **'Report date unknown'**
  String get scanReportDateUnknown;

  /// No description provided for @scanQualifiedBlurb.
  ///
  /// In en, this message translates to:
  /// **'Cleared every rule. Clearing a rule is a fact about the rule, not a view on the company.'**
  String get scanQualifiedBlurb;

  /// No description provided for @scanWatchingBlurb.
  ///
  /// In en, this message translates to:
  /// **'Cleared some rules and not others. Incomplete evidence is a statement about our test, not about the share.'**
  String get scanWatchingBlurb;

  /// No description provided for @scanRejectedBlurb.
  ///
  /// In en, this message translates to:
  /// **'Did not clear the rules, and kept on the record so the test can be audited.'**
  String get scanRejectedBlurb;

  /// No description provided for @scanLogEmpty.
  ///
  /// In en, this message translates to:
  /// **'The rule log is empty'**
  String get scanLogEmpty;

  /// No description provided for @scanNothingQualified.
  ///
  /// In en, this message translates to:
  /// **'Nothing cleared every rule today'**
  String get scanNothingQualified;

  /// No description provided for @scanNothingWatch.
  ///
  /// In en, this message translates to:
  /// **'Nothing on the watch list'**
  String get scanNothingWatch;

  /// No description provided for @scanNothingRejected.
  ///
  /// In en, this message translates to:
  /// **'Nothing failed the rules today'**
  String get scanNothingRejected;

  /// No description provided for @scanEmptyBlurb.
  ///
  /// In en, this message translates to:
  /// **'An empty section is a real answer. The test does not lower itself to fill a screen.'**
  String get scanEmptyBlurb;

  /// No description provided for @coverage.
  ///
  /// In en, this message translates to:
  /// **'Coverage'**
  String get coverage;

  /// No description provided for @coverageTradable.
  ///
  /// In en, this message translates to:
  /// **'Tradable'**
  String get coverageTradable;

  /// No description provided for @coverageListed.
  ///
  /// In en, this message translates to:
  /// **'Listed'**
  String get coverageListed;

  /// No description provided for @coverageAdjusted.
  ///
  /// In en, this message translates to:
  /// **'Adjusted'**
  String get coverageAdjusted;

  /// No description provided for @coverageBlurb.
  ///
  /// In en, this message translates to:
  /// **'Every listed company is read. Most of them fail, and the ones that fail are published too.'**
  String get coverageBlurb;

  /// No description provided for @catalyst.
  ///
  /// In en, this message translates to:
  /// **'Catalyst'**
  String get catalyst;

  /// No description provided for @fullRecord.
  ///
  /// In en, this message translates to:
  /// **'Full record'**
  String get fullRecord;

  /// No description provided for @sourcesLabel.
  ///
  /// In en, this message translates to:
  /// **'Sources'**
  String get sourcesLabel;

  /// No description provided for @evidenceLabel.
  ///
  /// In en, this message translates to:
  /// **'Evidence'**
  String get evidenceLabel;

  /// No description provided for @whatWasChecked.
  ///
  /// In en, this message translates to:
  /// **'What was checked'**
  String get whatWasChecked;

  /// No description provided for @gatePassed.
  ///
  /// In en, this message translates to:
  /// **'Passed'**
  String get gatePassed;

  /// No description provided for @gateFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed'**
  String get gateFailed;

  /// No description provided for @gateUnresolved.
  ///
  /// In en, this message translates to:
  /// **'Unresolved'**
  String get gateUnresolved;

  /// No description provided for @scannerTitleFull.
  ///
  /// In en, this message translates to:
  /// **'Scanner'**
  String get scannerTitleFull;

  /// No description provided for @scanUpdated.
  ///
  /// In en, this message translates to:
  /// **'Updated · {date}'**
  String scanUpdated(String date);

  /// No description provided for @scanQualifiedCount.
  ///
  /// In en, this message translates to:
  /// **'Cleared all {count}'**
  String scanQualifiedCount(int count);

  /// No description provided for @scanWatchCount.
  ///
  /// In en, this message translates to:
  /// **'Partly {count}'**
  String scanWatchCount(int count);

  /// No description provided for @scanRejectedCount.
  ///
  /// In en, this message translates to:
  /// **'Not cleared {count}'**
  String scanRejectedCount(int count);

  /// No description provided for @scanLogCount.
  ///
  /// In en, this message translates to:
  /// **'Rule log {count}'**
  String scanLogCount(int count);

  /// No description provided for @scanLogBlurb.
  ///
  /// In en, this message translates to:
  /// **'What the published rule said, what the tape did next, and what was changed in the rule afterwards. It is an audit of the method, not a scoreboard: there is no total here and there never will be.'**
  String get scanLogBlurb;

  /// No description provided for @scanLogEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Entries appear here as each published rule is measured against what happened next.'**
  String get scanLogEmptyBody;

  /// No description provided for @scanNotRepublished.
  ///
  /// In en, this message translates to:
  /// **'Not republished'**
  String get scanNotRepublished;

  /// No description provided for @scanNoComponent.
  ///
  /// In en, this message translates to:
  /// **'No rubric component scored.'**
  String get scanNoComponent;

  /// No description provided for @scanStocks.
  ///
  /// In en, this message translates to:
  /// **'Stocks'**
  String get scanStocks;

  /// No description provided for @scanScoredNames.
  ///
  /// In en, this message translates to:
  /// **'Scored names'**
  String get scanScoredNames;

  /// No description provided for @scanSectorNone.
  ///
  /// In en, this message translates to:
  /// **'None today'**
  String get scanSectorNone;

  /// No description provided for @scanOneCohort.
  ///
  /// In en, this message translates to:
  /// **'One cohort'**
  String get scanOneCohort;

  /// No description provided for @scanHowItWasRead.
  ///
  /// In en, this message translates to:
  /// **'How it was read'**
  String get scanHowItWasRead;

  /// No description provided for @scanNoSectorToday.
  ///
  /// In en, this message translates to:
  /// **'No sector read today'**
  String get scanNoSectorToday;

  /// No description provided for @statusQualified.
  ///
  /// In en, this message translates to:
  /// **'Cleared every rule'**
  String get statusQualified;

  /// No description provided for @statusWatching.
  ///
  /// In en, this message translates to:
  /// **'Cleared some rules'**
  String get statusWatching;

  /// No description provided for @statusRejected.
  ///
  /// In en, this message translates to:
  /// **'Did not clear the rules'**
  String get statusRejected;

  /// No description provided for @figPrevClose.
  ///
  /// In en, this message translates to:
  /// **'Prev close'**
  String get figPrevClose;

  /// No description provided for @figDayHigh.
  ///
  /// In en, this message translates to:
  /// **'Day high'**
  String get figDayHigh;

  /// No description provided for @figPreviousClose.
  ///
  /// In en, this message translates to:
  /// **'Previous close'**
  String get figPreviousClose;

  /// No description provided for @figAvgVolume30d.
  ///
  /// In en, this message translates to:
  /// **'Avg volume 30d'**
  String get figAvgVolume30d;

  /// No description provided for @figSharesOutstanding.
  ///
  /// In en, this message translates to:
  /// **'Shares outstanding'**
  String get figSharesOutstanding;

  /// No description provided for @figFloatShares.
  ///
  /// In en, this message translates to:
  /// **'Float shares'**
  String get figFloatShares;

  /// No description provided for @finNoFigures.
  ///
  /// In en, this message translates to:
  /// **'No reported figures yet'**
  String get finNoFigures;

  /// No description provided for @finNetProfitReported.
  ///
  /// In en, this message translates to:
  /// **'Net profit, as reported'**
  String get finNetProfitReported;

  /// No description provided for @finStatements.
  ///
  /// In en, this message translates to:
  /// **'The statements as filed'**
  String get finStatements;

  /// No description provided for @finAnnual.
  ///
  /// In en, this message translates to:
  /// **'Annual'**
  String get finAnnual;

  /// No description provided for @finQuarterly.
  ///
  /// In en, this message translates to:
  /// **'Quarterly'**
  String get finQuarterly;

  /// No description provided for @finRevenueLine.
  ///
  /// In en, this message translates to:
  /// **'Revenue'**
  String get finRevenueLine;

  /// No description provided for @finGrossProfitLine.
  ///
  /// In en, this message translates to:
  /// **'Gross profit'**
  String get finGrossProfitLine;

  /// No description provided for @finOperatingProfitLine.
  ///
  /// In en, this message translates to:
  /// **'Operating profit'**
  String get finOperatingProfitLine;

  /// No description provided for @finNetProfitLine.
  ///
  /// In en, this message translates to:
  /// **'Net profit'**
  String get finNetProfitLine;

  /// No description provided for @finStatementsNote.
  ///
  /// In en, this message translates to:
  /// **'Every filed period collected from EGX and Mubasher. Scroll sideways for older periods.'**
  String get finStatementsNote;

  /// No description provided for @finCashInvesting.
  ///
  /// In en, this message translates to:
  /// **'Cash from investing'**
  String get finCashInvesting;

  /// No description provided for @finCashFinancing.
  ///
  /// In en, this message translates to:
  /// **'Cash from financing'**
  String get finCashFinancing;

  /// No description provided for @finNetChangeCash.
  ///
  /// In en, this message translates to:
  /// **'Net change in cash'**
  String get finNetChangeCash;

  /// No description provided for @finDividendsPaid.
  ///
  /// In en, this message translates to:
  /// **'Dividends paid'**
  String get finDividendsPaid;

  /// No description provided for @finFiledDocuments.
  ///
  /// In en, this message translates to:
  /// **'The filed documents'**
  String get finFiledDocuments;

  /// No description provided for @finFiledStatements.
  ///
  /// In en, this message translates to:
  /// **'Financial statements filed'**
  String get finFiledStatements;

  /// No description provided for @finOpenPdf.
  ///
  /// In en, this message translates to:
  /// **'Open PDF'**
  String get finOpenPdf;

  /// No description provided for @finNoDocuments.
  ///
  /// In en, this message translates to:
  /// **'No document is attached to this filing.'**
  String get finNoDocuments;

  /// No description provided for @exchangeSeeMore.
  ///
  /// In en, this message translates to:
  /// **'See earlier filings'**
  String get exchangeSeeMore;

  /// No description provided for @exchangeShowingMonth.
  ///
  /// In en, this message translates to:
  /// **'{month} · {count} filings'**
  String exchangeShowingMonth(String month, int count);

  /// No description provided for @exchangeArchiveNote.
  ///
  /// In en, this message translates to:
  /// **'Filings we have collected and kept. The exchange serves only its newest page, so anything older than that exists here because we saved it.'**
  String get exchangeArchiveNote;

  /// No description provided for @filingOpenCompany.
  ///
  /// In en, this message translates to:
  /// **'Open {ticker}'**
  String filingOpenCompany(String ticker);

  /// No description provided for @filingReadFiling.
  ///
  /// In en, this message translates to:
  /// **'Read the filing'**
  String get filingReadFiling;

  /// No description provided for @companyFilings.
  ///
  /// In en, this message translates to:
  /// **'Filed with the exchange'**
  String get companyFilings;

  /// No description provided for @companyFilingsBody.
  ///
  /// In en, this message translates to:
  /// **'Everything {ticker} has told the exchange that we have kept, newest first.'**
  String companyFilingsBody(String ticker);

  /// No description provided for @companyNoFilings.
  ///
  /// In en, this message translates to:
  /// **'Nothing filed'**
  String get companyNoFilings;

  /// No description provided for @companyNoFilingsBody.
  ///
  /// In en, this message translates to:
  /// **'We have kept no filings from this company yet. The exchange serves only its newest page, so the record here starts when we started collecting.'**
  String get companyNoFilingsBody;

  /// No description provided for @unusualLabel.
  ///
  /// In en, this message translates to:
  /// **'Busier than usual'**
  String get unusualLabel;

  /// No description provided for @unusualBody.
  ///
  /// In en, this message translates to:
  /// **'{count} of the {total} announcements we hold came from a company whose shares changed hands far more than they normally do.'**
  String unusualBody(int count, int total);

  /// No description provided for @unusualTimes.
  ///
  /// In en, this message translates to:
  /// **'{ratio}× normal'**
  String unusualTimes(String ratio);

  /// No description provided for @youNotAdvice.
  ///
  /// In en, this message translates to:
  /// **'ESTHMR helps you understand the EGX. It does not decide what you should buy. Nothing here is investment advice.'**
  String get youNotAdvice;

  /// No description provided for @wiresBody.
  ///
  /// In en, this message translates to:
  /// **'{count} headlines from the Egyptian financial press, newest and most relevant first.'**
  String wiresBody(int count);

  /// No description provided for @wiresBodyChecks.
  ///
  /// In en, this message translates to:
  /// **'{count} of them name a company whose shares changed hands far more than usual that day.'**
  String wiresBodyChecks(int count);

  /// No description provided for @exchangeSourceNote.
  ///
  /// In en, this message translates to:
  /// **'Source: the Egyptian Exchange. Each row links to the filing itself.'**
  String get exchangeSourceNote;

  /// No description provided for @watchlistRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove {ticker} from watchlist'**
  String watchlistRemove(String ticker);

  /// No description provided for @directorySearchBody.
  ///
  /// In en, this message translates to:
  /// **'Try a ticker, or the Arabic legal name. The directory covers {count} companies.'**
  String directorySearchBody(int count);

  /// No description provided for @directoryNoQuote.
  ///
  /// In en, this message translates to:
  /// **'no quote'**
  String get directoryNoQuote;

  /// No description provided for @directoryShareOfListings.
  ///
  /// In en, this message translates to:
  /// **'{percent}% of listings'**
  String directoryShareOfListings(String percent);

  /// No description provided for @exitWaitNone.
  ///
  /// In en, this message translates to:
  /// **'no published trading to measure'**
  String get exitWaitNone;

  /// No description provided for @exitWaitDay.
  ///
  /// In en, this message translates to:
  /// **'about a day to sell'**
  String get exitWaitDay;

  /// No description provided for @exitWaitSessions.
  ///
  /// In en, this message translates to:
  /// **'{count} sessions to sell'**
  String exitWaitSessions(int count);

  /// No description provided for @exitWaitYears.
  ///
  /// In en, this message translates to:
  /// **'{years} years of trading'**
  String exitWaitYears(String years);

  /// No description provided for @exitWaitDecades.
  ///
  /// In en, this message translates to:
  /// **'over {years} years of trading'**
  String exitWaitDecades(int years);

  /// No description provided for @exitShareUnknown.
  ///
  /// In en, this message translates to:
  /// **'There is not enough published trading to work this out.'**
  String get exitShareUnknown;

  /// No description provided for @exitShareWholeDay.
  ///
  /// In en, this message translates to:
  /// **'More than a whole normal day of trading in this share.'**
  String get exitShareWholeDay;

  /// No description provided for @exitShareUnderOne.
  ///
  /// In en, this message translates to:
  /// **'Under 1% of a normal day’s trading.'**
  String get exitShareUnderOne;

  /// No description provided for @exitSharePercent.
  ///
  /// In en, this message translates to:
  /// **'{percent}% of a normal day’s trading.'**
  String exitSharePercent(int percent);

  /// No description provided for @exitNeedsBuyer.
  ///
  /// In en, this message translates to:
  /// **'A share only sells when somebody else wants to buy it.'**
  String get exitNeedsBuyer;

  /// No description provided for @exitOneSession.
  ///
  /// In en, this message translates to:
  /// **'About this much can leave in one session'**
  String get exitOneSession;

  /// No description provided for @exitLastTraded.
  ///
  /// In en, this message translates to:
  /// **'Last session that traded: {date}'**
  String exitLastTraded(String date);

  /// No description provided for @exitNotEnough.
  ///
  /// In en, this message translates to:
  /// **'Not enough published trading for {ticker}'**
  String exitNotEnough(String ticker);

  /// No description provided for @exitNothingChanged.
  ///
  /// In en, this message translates to:
  /// **'Nothing at all changed hands on {days} of the last {sessions} sessions. On those days there was no price at which a holder could sell.'**
  String exitNothingChanged(int days, int sessions);

  /// No description provided for @exitHowItWorks.
  ///
  /// In en, this message translates to:
  /// **'On this exchange a share can move at most 20% up or down in a session. When a name falls to that lower limit the buyers stop appearing, and there is no price at which a holder can sell — because selling needs somebody on the other side.\n\nSome shares here do not trade on some days at all. Not “traded a little” — nothing changed hands. This shows how much of a normal day a given sum would be, and how many sessions it would take to leave without being most of the trading.'**
  String get exitHowItWorks;

  /// No description provided for @exitPastThat.
  ///
  /// In en, this message translates to:
  /// **'Past that, selling is more than a fifth of a normal day here and starts to take more than one session. That figure is different for every company on this exchange.'**
  String get exitPastThat;

  /// No description provided for @exitAssumption.
  ///
  /// In en, this message translates to:
  /// **'The sessions figure assumes no more than a fifth of a day’s trading. That is a stated assumption rather than a market rule — selling faster moves the price against the seller, which is the cost being measured.'**
  String get exitAssumption;

  /// No description provided for @exitNoHistoryBody.
  ///
  /// In en, this message translates to:
  /// **'This needs a run of sessions with volume behind them and this listing does not have one yet. The absence is worth knowing on its own: a share with no published trading history is not one anybody can show an exit for.'**
  String get exitNoHistoryBody;

  /// No description provided for @goldKaratGram.
  ///
  /// In en, this message translates to:
  /// **'{karat} karat gold, a gram'**
  String goldKaratGram(int karat);

  /// No description provided for @goldPerOunce.
  ///
  /// In en, this message translates to:
  /// **'EGP {amount} / oz'**
  String goldPerOunce(String amount);

  /// No description provided for @dotsLabel.
  ///
  /// In en, this message translates to:
  /// **'What ties these together'**
  String get dotsLabel;

  /// No description provided for @dotsBody.
  ///
  /// In en, this message translates to:
  /// **'Companies that turned up in more than one place in {days} days.'**
  String dotsBody(int days);

  /// No description provided for @dotsFiling.
  ///
  /// In en, this message translates to:
  /// **'Filing'**
  String get dotsFiling;

  /// No description provided for @dotsNews.
  ///
  /// In en, this message translates to:
  /// **'In the press'**
  String get dotsNews;

  /// No description provided for @dotsSession.
  ///
  /// In en, this message translates to:
  /// **'That session'**
  String get dotsSession;

  /// No description provided for @dotsVolume.
  ///
  /// In en, this message translates to:
  /// **'{ratio}× normal volume'**
  String dotsVolume(String ratio);

  /// No description provided for @filterTitle.
  ///
  /// In en, this message translates to:
  /// **'Narrow the list'**
  String get filterTitle;

  /// No description provided for @filterAdd.
  ///
  /// In en, this message translates to:
  /// **'Add a filter'**
  String get filterAdd;

  /// No description provided for @filterNone.
  ///
  /// In en, this message translates to:
  /// **'No filters'**
  String get filterNone;

  /// No description provided for @filterClearAll.
  ///
  /// In en, this message translates to:
  /// **'Clear all'**
  String get filterClearAll;

  /// No description provided for @filterApply.
  ///
  /// In en, this message translates to:
  /// **'Show results'**
  String get filterApply;

  /// No description provided for @filterMarketCap.
  ///
  /// In en, this message translates to:
  /// **'Market cap'**
  String get filterMarketCap;

  /// No description provided for @filterPrice.
  ///
  /// In en, this message translates to:
  /// **'Price'**
  String get filterPrice;

  /// No description provided for @filterChange.
  ///
  /// In en, this message translates to:
  /// **'Change today'**
  String get filterChange;

  /// No description provided for @filterVolume.
  ///
  /// In en, this message translates to:
  /// **'Volume today'**
  String get filterVolume;

  /// No description provided for @filterAvgVolume.
  ///
  /// In en, this message translates to:
  /// **'Average volume'**
  String get filterAvgVolume;

  /// No description provided for @filterPe.
  ///
  /// In en, this message translates to:
  /// **'P/E'**
  String get filterPe;

  /// No description provided for @filterAbove.
  ///
  /// In en, this message translates to:
  /// **'more than'**
  String get filterAbove;

  /// No description provided for @filterBelow.
  ///
  /// In en, this message translates to:
  /// **'less than'**
  String get filterBelow;

  /// No description provided for @filterBetween.
  ///
  /// In en, this message translates to:
  /// **'between'**
  String get filterBetween;

  /// No description provided for @filterUnitEgp.
  ///
  /// In en, this message translates to:
  /// **'EGP'**
  String get filterUnitEgp;

  /// No description provided for @filterUnitPercent.
  ///
  /// In en, this message translates to:
  /// **'%'**
  String get filterUnitPercent;

  /// No description provided for @filterUnitShares.
  ///
  /// In en, this message translates to:
  /// **'shares'**
  String get filterUnitShares;

  /// No description provided for @filterUnitTimes.
  ///
  /// In en, this message translates to:
  /// **'×'**
  String get filterUnitTimes;

  /// No description provided for @filterAnd.
  ///
  /// In en, this message translates to:
  /// **'and'**
  String get filterAnd;

  /// No description provided for @filterMatchCount.
  ///
  /// In en, this message translates to:
  /// **'{count} of {total} companies'**
  String filterMatchCount(int count, int total);

  /// No description provided for @filterEps.
  ///
  /// In en, this message translates to:
  /// **'EPS'**
  String get filterEps;

  /// No description provided for @filterProfit.
  ///
  /// In en, this message translates to:
  /// **'Net profit'**
  String get filterProfit;

  /// No description provided for @filterBusy.
  ///
  /// In en, this message translates to:
  /// **'Relative volume'**
  String get filterBusy;

  /// No description provided for @filterUnitMillions.
  ///
  /// In en, this message translates to:
  /// **'million EGP'**
  String get filterUnitMillions;

  /// No description provided for @noteMarketCap.
  ///
  /// In en, this message translates to:
  /// **'What the whole company is worth at today’s price — the share price times every share in existence. From this morning’s rebuild.'**
  String get noteMarketCap;

  /// No description provided for @notePrice.
  ///
  /// In en, this message translates to:
  /// **'The last price a share changed hands at. From the live feed, fifteen minutes behind at worst.'**
  String get notePrice;

  /// No description provided for @noteChange.
  ///
  /// In en, this message translates to:
  /// **'How far the price has moved since yesterday’s close. From the live feed.'**
  String get noteChange;

  /// No description provided for @noteVolume.
  ///
  /// In en, this message translates to:
  /// **'How many shares have changed hands today. From the live feed.'**
  String get noteVolume;

  /// No description provided for @noteAvgVolume.
  ///
  /// In en, this message translates to:
  /// **'How many shares change hands on an ordinary day, averaged over the last thirty. From this morning’s rebuild.'**
  String get noteAvgVolume;

  /// No description provided for @notePe.
  ///
  /// In en, this message translates to:
  /// **'The price divided by what the company earned per share last year. A lower number means you are paying less for each pound of profit — it says nothing about whether the company is a good one. Absent for 121 of 280: a loss, nothing filed, or the figure did not check out.'**
  String get notePe;

  /// No description provided for @noteEps.
  ///
  /// In en, this message translates to:
  /// **'The company’s own filed annual profit divided by the number of its shares. A loss shows as a minus.'**
  String get noteEps;

  /// No description provided for @noteProfit.
  ///
  /// In en, this message translates to:
  /// **'What the company filed as its profit for the year, in millions of pounds. Not per share — a big company can earn far more and still earn less per share.'**
  String get noteProfit;

  /// No description provided for @noteBusy.
  ///
  /// In en, this message translates to:
  /// **'Today’s trading against what this company trades on an ordinary day. 1 is a normal day; the filings feed points out anything above 2. Below 1 means quieter than usual.'**
  String get noteBusy;

  /// No description provided for @finTotalAssets.
  ///
  /// In en, this message translates to:
  /// **'Total assets'**
  String get finTotalAssets;

  /// No description provided for @finTotalLiabilities.
  ///
  /// In en, this message translates to:
  /// **'Total liabilities'**
  String get finTotalLiabilities;

  /// No description provided for @finCashFromOps.
  ///
  /// In en, this message translates to:
  /// **'Cash from operations'**
  String get finCashFromOps;

  /// No description provided for @finNetProfitByYear.
  ///
  /// In en, this message translates to:
  /// **'Net profit by year'**
  String get finNetProfitByYear;

  /// No description provided for @finLatestFiling.
  ///
  /// In en, this message translates to:
  /// **'Latest filing'**
  String get finLatestFiling;

  /// No description provided for @finCompanyOnly.
  ///
  /// In en, this message translates to:
  /// **'Company only'**
  String get finCompanyOnly;

  /// No description provided for @finReadFiling.
  ///
  /// In en, this message translates to:
  /// **'Read the filing'**
  String get finReadFiling;

  /// No description provided for @priceNoHistoryDownloaded.
  ///
  /// In en, this message translates to:
  /// **'No price history downloaded'**
  String get priceNoHistoryDownloaded;

  /// No description provided for @priceLastSessions.
  ///
  /// In en, this message translates to:
  /// **'Last {count} sessions'**
  String priceLastSessions(int count);

  /// No description provided for @discussionBody.
  ///
  /// In en, this message translates to:
  /// **'Company threads land here once the community backend exists. Everything else on this screen works without it.'**
  String get discussionBody;

  /// No description provided for @movedThisMonthLabel.
  ///
  /// In en, this message translates to:
  /// **'How it has moved this month'**
  String get movedThisMonthLabel;

  /// No description provided for @noDetailBody.
  ///
  /// In en, this message translates to:
  /// **'The exchange scan carried only a closing price for this company. Everything else appears once a fuller record is published.'**
  String get noDetailBody;

  /// No description provided for @finNoFiguresBody.
  ///
  /// In en, this message translates to:
  /// **'Figures are read from each company\'s filed accounts and from the results it announces to the exchange. Nothing has been read for this company yet.'**
  String get finNoFiguresBody;

  /// No description provided for @finFootnote.
  ///
  /// In en, this message translates to:
  /// **'Figures in EGP millions, as filed. Neither source states revenue, so margins are not shown rather than estimated. Read from {source}.'**
  String finFootnote(String source);

  /// No description provided for @sourceMubasher.
  ///
  /// In en, this message translates to:
  /// **'Mubasher'**
  String get sourceMubasher;

  /// No description provided for @priceNoHistoryBody.
  ///
  /// In en, this message translates to:
  /// **'Open this company once with a connection.'**
  String get priceNoHistoryBody;

  /// No description provided for @priceNoSeriesBody.
  ///
  /// In en, this message translates to:
  /// **'Neither the exchange scan nor the price source publishes a usable series for it yet.'**
  String get priceNoSeriesBody;

  /// No description provided for @noStudyBody.
  ///
  /// In en, this message translates to:
  /// **'Companies are studied one at a time. When this one is read, the investigation appears here.'**
  String get noStudyBody;

  /// No description provided for @exitStopsTrading.
  ///
  /// In en, this message translates to:
  /// **'It stops trading'**
  String get exitStopsTrading;

  /// No description provided for @exitCanIGetOut.
  ///
  /// In en, this message translates to:
  /// **'Can I get out?'**
  String get exitCanIGetOut;

  /// No description provided for @scanNotRunBody.
  ///
  /// In en, this message translates to:
  /// **'Nothing has cleared the test since the last session. That is a result, not an error.'**
  String get scanNotRunBody;

  /// No description provided for @scanRecordBlurb.
  ///
  /// In en, this message translates to:
  /// **'What the published rule said, what the tape did next, and what was changed in the rule afterwards. It is an audit of the method, not a scoreboard: there is no total here and there never will be.'**
  String get scanRecordBlurb;

  /// No description provided for @scanLogEmptyBlurb.
  ///
  /// In en, this message translates to:
  /// **'Entries appear here as each published rule is measured against what happened next.'**
  String get scanLogEmptyBlurb;

  /// No description provided for @scanEmptySectionBlurb.
  ///
  /// In en, this message translates to:
  /// **'An empty section is a real answer. The test does not lower itself to fill a screen.'**
  String get scanEmptySectionBlurb;

  /// No description provided for @scanCoverageBlurb.
  ///
  /// In en, this message translates to:
  /// **'Every listed company is read. Most of them fail, and the ones that fail are published too.'**
  String get scanCoverageBlurb;

  /// No description provided for @scanCohortNames.
  ///
  /// In en, this message translates to:
  /// **'The cohort · {count} names'**
  String scanCohortNames(int count);

  /// No description provided for @scanSectorBlurb.
  ///
  /// In en, this message translates to:
  /// **'A sector read changes what gets investigated first. It is a reading order, not a view on any company in it.'**
  String get scanSectorBlurb;

  /// No description provided for @scanNoSectorBody.
  ///
  /// In en, this message translates to:
  /// **'A cohort appears when several names in one industry move for the same reason. Most days none does, and that is a result rather than a gap.'**
  String get scanNoSectorBody;

  /// No description provided for @gateUnresolvedLabel.
  ///
  /// In en, this message translates to:
  /// **'Unresolved'**
  String get gateUnresolvedLabel;

  /// No description provided for @noDetailBodyFull.
  ///
  /// In en, this message translates to:
  /// **'The exchange scan carried only a closing price for this listing. More lands as a fuller record is published.'**
  String get noDetailBodyFull;

  /// No description provided for @finNoFiguresBodyFull.
  ///
  /// In en, this message translates to:
  /// **'Figures are read from each company\'s filed accounts and from the results it announces to the exchange. Nothing has been read for this company yet.'**
  String get finNoFiguresBodyFull;

  /// No description provided for @finFootnoteFull.
  ///
  /// In en, this message translates to:
  /// **'Figures in EGP millions, as filed. A line stays blank when its source attachment did not state it. Read from {source}.'**
  String finFootnoteFull(String source);

  /// No description provided for @priceNoHistoryTitle.
  ///
  /// In en, this message translates to:
  /// **'No price history downloaded'**
  String get priceNoHistoryTitle;

  /// No description provided for @priceNoSeriesBodyFull.
  ///
  /// In en, this message translates to:
  /// **'Neither the exchange scan nor the price source publishes a series for this listing yet.'**
  String get priceNoSeriesBodyFull;

  /// No description provided for @exitZeroDays.
  ///
  /// In en, this message translates to:
  /// **'Nothing traded at all on {days} of the last {sessions} sessions.'**
  String exitZeroDays(int days, int sessions);

  /// No description provided for @exitFiftyK.
  ///
  /// In en, this message translates to:
  /// **'EGP 50,000 here is {share}'**
  String exitFiftyK(String share);

  /// No description provided for @exitNoPrice.
  ///
  /// In en, this message translates to:
  /// **'On those days there was no price at which a holder could sell.'**
  String get exitNoPrice;

  /// No description provided for @meansSameDay.
  ///
  /// In en, this message translates to:
  /// **'About {amount} can leave in one session here. Above that, selling is more than a fifth of a normal day and starts to move the price against whoever is selling.'**
  String meansSameDay(String amount);

  /// No description provided for @meansZeroDays.
  ///
  /// In en, this message translates to:
  /// **'It did not trade at all on {days} of the last {sessions} sessions. On those days there was no price at which a holder could sell, because there was nobody on the other side.'**
  String meansZeroDays(int days, int sessions);

  /// No description provided for @meansNetProfit.
  ///
  /// In en, this message translates to:
  /// **'It reported {amount} of net profit in {period}.'**
  String meansNetProfit(String amount, String period);

  /// No description provided for @scanLogEmptyBodyFull.
  ///
  /// In en, this message translates to:
  /// **'Entries appear here as each published rule reaches its stated end.'**
  String get scanLogEmptyBodyFull;

  /// No description provided for @scanEmptySectionFull.
  ///
  /// In en, this message translates to:
  /// **'An empty section is a real answer. The test does not lower its bar to fill a page.'**
  String get scanEmptySectionFull;

  /// No description provided for @scanSectorBlurbFull.
  ///
  /// In en, this message translates to:
  /// **'A sector read changes what gets investigated first. It scores nothing on the record and names nothing to act on.'**
  String get scanSectorBlurbFull;

  /// No description provided for @detailFirstSeen.
  ///
  /// In en, this message translates to:
  /// **'First seen · {date}'**
  String detailFirstSeen(String date);

  /// No description provided for @detailWhyScored.
  ///
  /// In en, this message translates to:
  /// **'Why it scored what it scored'**
  String get detailWhyScored;

  /// No description provided for @detailLastSession.
  ///
  /// In en, this message translates to:
  /// **'Last completed session'**
  String get detailLastSession;

  /// No description provided for @detailMoveSince.
  ///
  /// In en, this message translates to:
  /// **'Move since it was flagged'**
  String get detailMoveSince;

  /// No description provided for @detailHowScored.
  ///
  /// In en, this message translates to:
  /// **'How a name is scored'**
  String get detailHowScored;

  /// No description provided for @detailOpenTicker.
  ///
  /// In en, this message translates to:
  /// **'Open {ticker}'**
  String detailOpenTicker(String ticker);

  /// No description provided for @homeFiledHero.
  ///
  /// In en, this message translates to:
  /// **'Company announcements'**
  String get homeFiledHero;

  /// No description provided for @homeRoseAndFell.
  ///
  /// In en, this message translates to:
  /// **'What rose and what fell'**
  String get homeRoseAndFell;

  /// No description provided for @homeIndices.
  ///
  /// In en, this message translates to:
  /// **'How the whole market moved'**
  String get homeIndices;

  /// No description provided for @breadthUp.
  ///
  /// In en, this message translates to:
  /// **'rose'**
  String get breadthUp;

  /// No description provided for @breadthDown.
  ///
  /// In en, this message translates to:
  /// **'fell'**
  String get breadthDown;

  /// No description provided for @breadthFlat.
  ///
  /// In en, this message translates to:
  /// **'unchanged'**
  String get breadthFlat;

  /// No description provided for @breadthOf.
  ///
  /// In en, this message translates to:
  /// **'of {count} shares'**
  String breadthOf(int count);

  /// No description provided for @breadthChartTitle.
  ///
  /// In en, this message translates to:
  /// **'How the market split, session by session'**
  String get breadthChartTitle;

  /// No description provided for @breadthOneSession.
  ///
  /// In en, this message translates to:
  /// **'One session recorded so far. The lines grow as each session is written down — there is no published breadth history to backfill from.'**
  String get breadthOneSession;

  /// No description provided for @indexNoSeries.
  ///
  /// In en, this message translates to:
  /// **'Levels are recorded one session at a time. No index series is published to backfill from.'**
  String get indexNoSeries;

  /// No description provided for @ratesWorld.
  ///
  /// In en, this message translates to:
  /// **'Was it Egypt, or everywhere?'**
  String get ratesWorld;

  /// No description provided for @ratesMetals.
  ///
  /// In en, this message translates to:
  /// **'Gold and silver'**
  String get ratesMetals;

  /// No description provided for @ratesPound.
  ///
  /// In en, this message translates to:
  /// **'The pound'**
  String get ratesPound;

  /// No description provided for @ratesPerGram.
  ///
  /// In en, this message translates to:
  /// **'per gram'**
  String get ratesPerGram;

  /// No description provided for @ratesIndicesMovedHome.
  ///
  /// In en, this message translates to:
  /// **'Index levels are on Home'**
  String get ratesIndicesMovedHome;

  /// No description provided for @ageJustNow.
  ///
  /// In en, this message translates to:
  /// **'just now'**
  String get ageJustNow;

  /// No description provided for @ageToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get ageToday;

  /// No description provided for @ageYesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get ageYesterday;

  /// No description provided for @ageMinutes.
  ///
  /// In en, this message translates to:
  /// **'{count}m ago'**
  String ageMinutes(int count);

  /// No description provided for @ageHours.
  ///
  /// In en, this message translates to:
  /// **'{count}h ago'**
  String ageHours(int count);

  /// No description provided for @ageDays.
  ///
  /// In en, this message translates to:
  /// **'{count}d ago'**
  String ageDays(int count);

  /// No description provided for @unusualVolume.
  ///
  /// In en, this message translates to:
  /// **'Unusual volume'**
  String get unusualVolume;

  /// No description provided for @saved.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get saved;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading'**
  String get loading;

  /// No description provided for @mainNavigation.
  ///
  /// In en, this message translates to:
  /// **'Main navigation'**
  String get mainNavigation;

  /// No description provided for @priceLow.
  ///
  /// In en, this message translates to:
  /// **'Low'**
  String get priceLow;

  /// No description provided for @priceHigh.
  ///
  /// In en, this message translates to:
  /// **'High'**
  String get priceHigh;

  /// No description provided for @priceOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get priceOpen;

  /// No description provided for @priceClose.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get priceClose;

  /// No description provided for @showMore.
  ///
  /// In en, this message translates to:
  /// **'Show more'**
  String get showMore;

  /// No description provided for @showingCount.
  ///
  /// In en, this message translates to:
  /// **'Showing {shown} of {total}'**
  String showingCount(int shown, int total);

  /// No description provided for @theWires.
  ///
  /// In en, this message translates to:
  /// **'News'**
  String get theWires;

  /// No description provided for @sortByScore.
  ///
  /// In en, this message translates to:
  /// **'By score'**
  String get sortByScore;

  /// No description provided for @sortMostRecent.
  ///
  /// In en, this message translates to:
  /// **'Most recent'**
  String get sortMostRecent;

  /// No description provided for @cotNoneYet.
  ///
  /// In en, this message translates to:
  /// **'No investigations yet'**
  String get cotNoneYet;

  /// No description provided for @cotNoMatch.
  ///
  /// In en, this message translates to:
  /// **'Nothing matches that'**
  String get cotNoMatch;

  /// No description provided for @readInvestigation.
  ///
  /// In en, this message translates to:
  /// **'Read investigation'**
  String get readInvestigation;

  /// No description provided for @articleFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not open the investigation'**
  String get articleFailed;

  /// No description provided for @exitHeadline.
  ///
  /// In en, this message translates to:
  /// **'How much this share absorbs, and how long it takes to leave'**
  String get exitHeadline;

  /// No description provided for @exitIfYouPutIn.
  ///
  /// In en, this message translates to:
  /// **'At this size'**
  String get exitIfYouPutIn;

  /// No description provided for @exitNumbersBehind.
  ///
  /// In en, this message translates to:
  /// **'The numbers behind it'**
  String get exitNumbersBehind;

  /// No description provided for @companyLabel.
  ///
  /// In en, this message translates to:
  /// **'Company'**
  String get companyLabel;

  /// No description provided for @explTraded.
  ///
  /// In en, this message translates to:
  /// **'How much it traded'**
  String get explTraded;

  /// No description provided for @explFinished.
  ///
  /// In en, this message translates to:
  /// **'Where it finished'**
  String get explFinished;

  /// No description provided for @explBuyable.
  ///
  /// In en, this message translates to:
  /// **'How much of it can actually be bought'**
  String get explBuyable;

  /// No description provided for @explValued.
  ///
  /// In en, this message translates to:
  /// **'What the whole company is priced at'**
  String get explValued;

  /// No description provided for @rubricFreshDisclosure.
  ///
  /// In en, this message translates to:
  /// **'Fresh disclosure'**
  String get rubricFreshDisclosure;

  /// No description provided for @rubricEconomicImportance.
  ///
  /// In en, this message translates to:
  /// **'Economic importance'**
  String get rubricEconomicImportance;

  /// No description provided for @rubricVolumeConfirmation.
  ///
  /// In en, this message translates to:
  /// **'Volume confirmation'**
  String get rubricVolumeConfirmation;

  /// No description provided for @rubricOwnershipCluster.
  ///
  /// In en, this message translates to:
  /// **'Ownership cluster'**
  String get rubricOwnershipCluster;

  /// No description provided for @rubricDatedCatalyst.
  ///
  /// In en, this message translates to:
  /// **'Dated catalyst'**
  String get rubricDatedCatalyst;

  /// No description provided for @rubricAntiChasing.
  ///
  /// In en, this message translates to:
  /// **'Anti-chasing'**
  String get rubricAntiChasing;

  /// No description provided for @rubricLimitUpPenalty.
  ///
  /// In en, this message translates to:
  /// **'Limit-up penalty'**
  String get rubricLimitUpPenalty;

  /// No description provided for @rubricIssuerDenial.
  ///
  /// In en, this message translates to:
  /// **'Issuer denial'**
  String get rubricIssuerDenial;

  /// No description provided for @rubricRiskPenalty.
  ///
  /// In en, this message translates to:
  /// **'Risk penalty'**
  String get rubricRiskPenalty;

  /// No description provided for @ownersEquity.
  ///
  /// In en, this message translates to:
  /// **'Owners\' equity'**
  String get ownersEquity;

  /// No description provided for @homeMacro.
  ///
  /// In en, this message translates to:
  /// **'What moves Egypt'**
  String get homeMacro;

  /// No description provided for @macroWhyItMatters.
  ///
  /// In en, this message translates to:
  /// **'Why this reaches Egyptian shares'**
  String get macroWhyItMatters;

  /// No description provided for @macroMovesWith.
  ///
  /// In en, this message translates to:
  /// **'Moved with the EGX 30'**
  String get macroMovesWith;

  /// No description provided for @macroWeakLink.
  ///
  /// In en, this message translates to:
  /// **'Barely moves with the EGX 30 day to day'**
  String get macroWeakLink;

  /// No description provided for @macroEgyptLine.
  ///
  /// In en, this message translates to:
  /// **'Egypt\'s own line'**
  String get macroEgyptLine;

  /// No description provided for @macroSessions.
  ///
  /// In en, this message translates to:
  /// **'over {count} sessions'**
  String macroSessions(int count);

  /// No description provided for @macroUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Some sources could not be reached'**
  String get macroUnavailable;

  /// No description provided for @macroCoverage.
  ///
  /// In en, this message translates to:
  /// **'What is being reported'**
  String get macroCoverage;

  /// No description provided for @homeLeadStory.
  ///
  /// In en, this message translates to:
  /// **'Today\'s story'**
  String get homeLeadStory;

  /// No description provided for @feedNews.
  ///
  /// In en, this message translates to:
  /// **'News'**
  String get feedNews;

  /// No description provided for @feedExchange.
  ///
  /// In en, this message translates to:
  /// **'From the exchange'**
  String get feedExchange;

  /// No description provided for @freshLoading.
  ///
  /// In en, this message translates to:
  /// **'Prices loading'**
  String get freshLoading;

  /// No description provided for @freshSample.
  ///
  /// In en, this message translates to:
  /// **'Sample data · not real prices'**
  String get freshSample;

  /// No description provided for @freshLastClose.
  ///
  /// In en, this message translates to:
  /// **'Closing prices'**
  String get freshLastClose;

  /// No description provided for @freshDuringSession.
  ///
  /// In en, this message translates to:
  /// **'Prices from while trading was open'**
  String get freshDuringSession;

  /// No description provided for @freshOnDay.
  ///
  /// In en, this message translates to:
  /// **'{state} · {day}'**
  String freshOnDay(String state, String day);

  /// No description provided for @freshMarketClosed.
  ///
  /// In en, this message translates to:
  /// **'Market closed · closing prices'**
  String get freshMarketClosed;

  /// No description provided for @freshMarketClosedOn.
  ///
  /// In en, this message translates to:
  /// **'Market closed · prices from {day}'**
  String freshMarketClosedOn(String day);

  /// No description provided for @freshDelayed.
  ///
  /// In en, this message translates to:
  /// **'{delay} behind the exchange · updated {since}'**
  String freshDelayed(String delay, String since);

  /// No description provided for @freshDelayedShort.
  ///
  /// In en, this message translates to:
  /// **'{delay} behind the exchange'**
  String freshDelayedShort(String delay);

  /// No description provided for @freshDelaySeconds.
  ///
  /// In en, this message translates to:
  /// **'{count} sec'**
  String freshDelaySeconds(int count);

  /// No description provided for @freshDelayMinutes.
  ///
  /// In en, this message translates to:
  /// **'{count} min'**
  String freshDelayMinutes(int count);

  /// No description provided for @freshDelayHours.
  ///
  /// In en, this message translates to:
  /// **'{count} hr'**
  String freshDelayHours(int count);

  /// No description provided for @freshSinceJustNow.
  ///
  /// In en, this message translates to:
  /// **'just now'**
  String get freshSinceJustNow;

  /// No description provided for @freshSinceMinutes.
  ///
  /// In en, this message translates to:
  /// **'{count} min ago'**
  String freshSinceMinutes(int count);

  /// No description provided for @freshSinceHours.
  ///
  /// In en, this message translates to:
  /// **'{count} hr ago'**
  String freshSinceHours(int count);

  /// No description provided for @freshSinceDays.
  ///
  /// In en, this message translates to:
  /// **'{count} days ago'**
  String freshSinceDays(int count);

  /// No description provided for @youCompaniesCount.
  ///
  /// In en, this message translates to:
  /// **'{count} in the directory'**
  String youCompaniesCount(int count);

  /// No description provided for @youPricesLive.
  ///
  /// In en, this message translates to:
  /// **'{delay} minutes behind the exchange, refreshed every {refresh} minutes. There is no live feed.'**
  String youPricesLive(int delay, int refresh);

  /// No description provided for @youPricesClose.
  ///
  /// In en, this message translates to:
  /// **'Closing prices only. There is no live feed.'**
  String get youPricesClose;

  /// No description provided for @unitBillionsEgp.
  ///
  /// In en, this message translates to:
  /// **'billion EGP'**
  String get unitBillionsEgp;

  /// No description provided for @unitMillionsEgp.
  ///
  /// In en, this message translates to:
  /// **'million EGP'**
  String get unitMillionsEgp;

  /// No description provided for @unitThousandsEgp.
  ///
  /// In en, this message translates to:
  /// **'thousand EGP'**
  String get unitThousandsEgp;

  /// No description provided for @unitEgp.
  ///
  /// In en, this message translates to:
  /// **'EGP'**
  String get unitEgp;

  /// No description provided for @moneyWithUnit.
  ///
  /// In en, this message translates to:
  /// **'{value} {unit}'**
  String moneyWithUnit(String value, String unit);

  /// No description provided for @finUnitPeriod.
  ///
  /// In en, this message translates to:
  /// **'{unit} · {period}'**
  String finUnitPeriod(String unit, String period);

  /// No description provided for @finBalanceAsOf.
  ///
  /// In en, this message translates to:
  /// **'Balance sheet · {period}'**
  String finBalanceAsOf(String period);

  /// No description provided for @finFiguresUnit.
  ///
  /// In en, this message translates to:
  /// **'Unit: {unit}'**
  String finFiguresUnit(String unit);

  /// No description provided for @pmToProfit.
  ///
  /// In en, this message translates to:
  /// **'to a profit'**
  String get pmToProfit;

  /// No description provided for @pmToLoss.
  ///
  /// In en, this message translates to:
  /// **'to a loss'**
  String get pmToLoss;

  /// No description provided for @pmUnchanged.
  ///
  /// In en, this message translates to:
  /// **'unchanged'**
  String get pmUnchanged;

  /// No description provided for @pmWiderLoss.
  ///
  /// In en, this message translates to:
  /// **'wider loss'**
  String get pmWiderLoss;

  /// No description provided for @pmSmallerLoss.
  ///
  /// In en, this message translates to:
  /// **'smaller loss'**
  String get pmSmallerLoss;

  /// No description provided for @pmMadeMoneyAfterBreakEven.
  ///
  /// In en, this message translates to:
  /// **'It made money in {now}, after breaking even in {prior}.'**
  String pmMadeMoneyAfterBreakEven(String now, String prior);

  /// No description provided for @pmMadeMoneyAfterLoss.
  ///
  /// In en, this message translates to:
  /// **'It made money in {now}, after losing {amount} in {prior}.'**
  String pmMadeMoneyAfterLoss(String now, String amount, String prior);

  /// No description provided for @pmLostAfterProfit.
  ///
  /// In en, this message translates to:
  /// **'It lost money in {now}, after making {amount} in {prior}.'**
  String pmLostAfterProfit(String now, String amount, String prior);

  /// No description provided for @pmLossSame.
  ///
  /// In en, this message translates to:
  /// **'The loss was the same as in {prior}, at {amount}.'**
  String pmLossSame(String prior, String amount);

  /// No description provided for @pmLossGrew.
  ///
  /// In en, this message translates to:
  /// **'The loss grew, from {from} to {to} against {prior}.'**
  String pmLossGrew(String from, String to, String prior);

  /// No description provided for @pmLossShrank.
  ///
  /// In en, this message translates to:
  /// **'The loss shrank, from {from} to {to} against {prior}.'**
  String pmLossShrank(String from, String to, String prior);

  /// No description provided for @pmProfitUnchanged.
  ///
  /// In en, this message translates to:
  /// **'Profit was unchanged against {prior}, at {amount}.'**
  String pmProfitUnchanged(String prior, String amount);

  /// No description provided for @pmTimesSentence.
  ///
  /// In en, this message translates to:
  /// **'That is {times} times the {amount} it reported in {prior}.'**
  String pmTimesSentence(String times, String amount, String prior);

  /// No description provided for @pmRose.
  ///
  /// In en, this message translates to:
  /// **'Profit rose against {prior}, when it reported {amount}.'**
  String pmRose(String prior, String amount);

  /// No description provided for @pmFell.
  ///
  /// In en, this message translates to:
  /// **'Profit fell against {prior}, when it reported {amount}.'**
  String pmFell(String prior, String amount);

  /// No description provided for @figSharesTradedToday.
  ///
  /// In en, this message translates to:
  /// **'Shares traded today'**
  String get figSharesTradedToday;

  /// No description provided for @perf1Week.
  ///
  /// In en, this message translates to:
  /// **'1 week'**
  String get perf1Week;

  /// No description provided for @perf1Month.
  ///
  /// In en, this message translates to:
  /// **'1 month'**
  String get perf1Month;

  /// No description provided for @perf3Months.
  ///
  /// In en, this message translates to:
  /// **'3 months'**
  String get perf3Months;

  /// No description provided for @perf5Sessions.
  ///
  /// In en, this message translates to:
  /// **'5 sessions'**
  String get perf5Sessions;

  /// No description provided for @finGroupBasis.
  ///
  /// In en, this message translates to:
  /// **'Group'**
  String get finGroupBasis;

  /// No description provided for @periodQuarter1.
  ///
  /// In en, this message translates to:
  /// **'Q1 {year}'**
  String periodQuarter1(String year);

  /// No description provided for @periodQuarter2.
  ///
  /// In en, this message translates to:
  /// **'Q2 {year}'**
  String periodQuarter2(String year);

  /// No description provided for @periodQuarter3.
  ///
  /// In en, this message translates to:
  /// **'Q3 {year}'**
  String periodQuarter3(String year);

  /// No description provided for @periodQuarter4.
  ///
  /// In en, this message translates to:
  /// **'Q4 {year}'**
  String periodQuarter4(String year);

  /// No description provided for @periodHalf1.
  ///
  /// In en, this message translates to:
  /// **'H1 {year}'**
  String periodHalf1(String year);

  /// No description provided for @periodHalf2.
  ///
  /// In en, this message translates to:
  /// **'H2 {year}'**
  String periodHalf2(String year);

  /// No description provided for @periodFullYear.
  ///
  /// In en, this message translates to:
  /// **'FY {year}'**
  String periodFullYear(String year);

  /// No description provided for @filedCountWithChecks.
  ///
  /// In en, this message translates to:
  /// **'Company announcements: {total}. Of the ones we could check, {count} came from a company whose shares changed hands far more than usual.'**
  String filedCountWithChecks(int total, int count);

  /// No description provided for @filedCountNoChecks.
  ///
  /// In en, this message translates to:
  /// **'Company announcements: {total}. None of the ones we could check came from a company whose shares changed hands far more than usual.'**
  String filedCountNoChecks(int total);

  /// No description provided for @todayPutTogether.
  ///
  /// In en, this message translates to:
  /// **'Put together after trading closed on {date}'**
  String todayPutTogether(String date);

  /// No description provided for @updatedOn.
  ///
  /// In en, this message translates to:
  /// **'Updated · {date}'**
  String updatedOn(String date);

  /// No description provided for @macroUnitUsdOunce.
  ///
  /// In en, this message translates to:
  /// **'USD · an ounce'**
  String get macroUnitUsdOunce;

  /// No description provided for @macroUnitUsdBarrel.
  ///
  /// In en, this message translates to:
  /// **'USD · a barrel'**
  String get macroUnitUsdBarrel;

  /// No description provided for @macroUnitVessels.
  ///
  /// In en, this message translates to:
  /// **'ships'**
  String get macroUnitVessels;

  /// No description provided for @macroUnitPercent.
  ///
  /// In en, this message translates to:
  /// **'per cent'**
  String get macroUnitPercent;

  /// No description provided for @macroUnitUsdBillion.
  ///
  /// In en, this message translates to:
  /// **'USD · billions'**
  String get macroUnitUsdBillion;

  /// No description provided for @explainerHowWorkedOut.
  ///
  /// In en, this message translates to:
  /// **'How it is worked out'**
  String get explainerHowWorkedOut;

  /// No description provided for @explainerWhatCountsUnusual.
  ///
  /// In en, this message translates to:
  /// **'What counts as unusual'**
  String get explainerWhatCountsUnusual;

  /// No description provided for @studySumOfSix.
  ///
  /// In en, this message translates to:
  /// **'Sum of the six'**
  String get studySumOfSix;

  /// No description provided for @studyWhatWouldChange.
  ///
  /// In en, this message translates to:
  /// **'What would change this'**
  String get studyWhatWouldChange;

  /// No description provided for @studyNoConditions.
  ///
  /// In en, this message translates to:
  /// **'The published study does not yet name a filing that would move these pillars. Until it does, the reading below is a record of what the rule produced on its date and nothing more.'**
  String get studyNoConditions;

  /// No description provided for @studyIndexNotOnDevice.
  ///
  /// In en, this message translates to:
  /// **'The studies are not on the device yet'**
  String get studyIndexNotOnDevice;

  /// No description provided for @studyIndexNotOnDeviceBody.
  ///
  /// In en, this message translates to:
  /// **'Open it once with a connection and it stays on the device.'**
  String get studyIndexNotOnDeviceBody;

  /// No description provided for @studyAllBand.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get studyAllBand;

  /// No description provided for @studyClearFilters.
  ///
  /// In en, this message translates to:
  /// **'Clear filters'**
  String get studyClearFilters;

  /// No description provided for @studyNoneInBand.
  ///
  /// In en, this message translates to:
  /// **'No company has landed in that band yet.'**
  String get studyNoneInBand;

  /// No description provided for @studyNoMatch.
  ///
  /// In en, this message translates to:
  /// **'No investigated company matches “{query}”. Try a ticker, or clear the filter.'**
  String studyNoMatch(String query);

  /// No description provided for @studyOneAtATime.
  ///
  /// In en, this message translates to:
  /// **'Companies appear here one at a time, after each has been read in full.'**
  String get studyOneAtATime;

  /// No description provided for @studyFullWriteUp.
  ///
  /// In en, this message translates to:
  /// **'Full write-up in the criteria file'**
  String get studyFullWriteUp;

  /// No description provided for @studyScoreRange.
  ///
  /// In en, this message translates to:
  /// **'Scores run from {min} to +{max} across six pillars: valuation, earnings quality, growth, balance sheet, tradability and governance.'**
  String studyScoreRange(int min, int max);

  /// No description provided for @exitNotDownloaded.
  ///
  /// In en, this message translates to:
  /// **'Nothing downloaded for {ticker} yet'**
  String exitNotDownloaded(String ticker);

  /// No description provided for @exitNotDownloadedBody.
  ///
  /// In en, this message translates to:
  /// **'Open this once with a connection and it stays on the device.'**
  String get exitNotDownloadedBody;

  /// No description provided for @exitThinSessions.
  ///
  /// In en, this message translates to:
  /// **'Sessions under 1,000 shares'**
  String get exitThinSessions;

  /// No description provided for @exitFreeToTrade.
  ///
  /// In en, this message translates to:
  /// **'Shares free to trade'**
  String get exitFreeToTrade;

  /// No description provided for @exitDailyLimit.
  ///
  /// In en, this message translates to:
  /// **'Daily price limit'**
  String get exitDailyLimit;

  /// No description provided for @exitDailyLimitValue.
  ///
  /// In en, this message translates to:
  /// **'±20%, set by the exchange'**
  String get exitDailyLimitValue;

  /// No description provided for @directoryNotOnDevice.
  ///
  /// In en, this message translates to:
  /// **'The company directory is not on the device yet'**
  String get directoryNotOnDevice;

  /// No description provided for @directoryNotOnDeviceBody.
  ///
  /// In en, this message translates to:
  /// **'Open the app once with a connection and the whole directory stays available offline.'**
  String get directoryNotOnDeviceBody;

  /// No description provided for @directorySectors.
  ///
  /// In en, this message translates to:
  /// **'Sectors'**
  String get directorySectors;

  /// No description provided for @pitSource.
  ///
  /// In en, this message translates to:
  /// **'Source'**
  String get pitSource;

  /// No description provided for @pitSourceBody.
  ///
  /// In en, this message translates to:
  /// **'A disclosure, posted straight from the record'**
  String get pitSourceBody;

  /// No description provided for @pitNoCalls.
  ///
  /// In en, this message translates to:
  /// **'No buy or sell calls, no price targets, no performance leaderboards.'**
  String get pitNoCalls;

  /// No description provided for @articleNeedsConnection.
  ///
  /// In en, this message translates to:
  /// **'The full write-up lives on thebarbarianproject.com and needs a connection. Everything already downloaded is still available offline.'**
  String get articleNeedsConnection;

  /// No description provided for @articleGoBack.
  ///
  /// In en, this message translates to:
  /// **'Go back'**
  String get articleGoBack;

  /// No description provided for @priceNoHistory.
  ///
  /// In en, this message translates to:
  /// **'No price history for this company yet'**
  String get priceNoHistory;

  /// No description provided for @priceSessionRange.
  ///
  /// In en, this message translates to:
  /// **'{count}-session range'**
  String priceSessionRange(int count);

  /// No description provided for @priceSessionsTo.
  ///
  /// In en, this message translates to:
  /// **'{count} sessions · to {date}'**
  String priceSessionsTo(int count, String date);

  /// No description provided for @scanPositionWithheld.
  ///
  /// In en, this message translates to:
  /// **'The report\'s note on this name describes a model position — a size and a price. ESTHMR is not licensed to republish that, so the score and the evidence are here and the position is not.'**
  String get scanPositionWithheld;

  /// No description provided for @newsSourcedFrom.
  ///
  /// In en, this message translates to:
  /// **'Headlines from {outlets}, each linked to the outlet that ran it.'**
  String newsSourcedFrom(String outlets);

  /// No description provided for @newsMergedCount.
  ///
  /// In en, this message translates to:
  /// **'{count} duplicates merged.'**
  String newsMergedCount(int count);

  /// No description provided for @newsWithheldCount.
  ///
  /// In en, this message translates to:
  /// **'{count} withheld for carrying a recommendation.'**
  String newsWithheldCount(int count);

  /// No description provided for @newsUnreachable.
  ///
  /// In en, this message translates to:
  /// **'Not reachable today: {outlets}.'**
  String newsUnreachable(String outlets);

  /// No description provided for @cotInvestigatedCount.
  ///
  /// In en, this message translates to:
  /// **'{studied} of {total} investigated'**
  String cotInvestigatedCount(int studied, int total);

  /// No description provided for @pitWhatItIs.
  ///
  /// In en, this message translates to:
  /// **'The Pit is where the evidence gets argued over. Companies, filings and the research behind them — discussed by people reading the same numbers.\n\nEverything else in the app works without it, and will keep working if it ever goes down.'**
  String get pitWhatItIs;

  /// No description provided for @a11yBreadthOneSession.
  ///
  /// In en, this message translates to:
  /// **'One session: {up} rose, {down} fell, {flat} unchanged'**
  String a11yBreadthOneSession(int up, int down, int flat);

  /// No description provided for @a11yBreadthSessions.
  ///
  /// In en, this message translates to:
  /// **'{count} sessions of market breadth'**
  String a11yBreadthSessions(int count);

  /// No description provided for @a11yTrendRising.
  ///
  /// In en, this message translates to:
  /// **'{count}-session trend, rising'**
  String a11yTrendRising(int count);

  /// No description provided for @a11yTrendFalling.
  ///
  /// In en, this message translates to:
  /// **'{count}-session trend, falling'**
  String a11yTrendFalling(int count);

  /// No description provided for @a11yVerdictWithScore.
  ///
  /// In en, this message translates to:
  /// **'{sentence} The six sum to {score} out of {max}.'**
  String a11yVerdictWithScore(String sentence, int score, int max);

  /// No description provided for @a11yExplainerHint.
  ///
  /// In en, this message translates to:
  /// **'{title}. {plain} {token}. Press for the arithmetic.'**
  String a11yExplainerHint(String title, String plain, String token);

  /// No description provided for @a11ySessionUnchanged.
  ///
  /// In en, this message translates to:
  /// **'{date}: unchanged'**
  String a11ySessionUnchanged(String date);

  /// No description provided for @a11ySessionUp.
  ///
  /// In en, this message translates to:
  /// **'{date}: up {percent} per cent'**
  String a11ySessionUp(String date, String percent);

  /// No description provided for @a11ySessionDown.
  ///
  /// In en, this message translates to:
  /// **'{date}: down {percent} per cent'**
  String a11ySessionDown(String date, String percent);

  /// No description provided for @a11yPriceHistory.
  ///
  /// In en, this message translates to:
  /// **'Price history, {count} sessions, from {first} to {last}, low {low}, high {high}'**
  String a11yPriceHistory(
    int count,
    String first,
    String last,
    String low,
    String high,
  );

  /// No description provided for @a11yRangeGauge.
  ///
  /// In en, this message translates to:
  /// **'{caption}: {value}, range {low} to {high}'**
  String a11yRangeGauge(String caption, String value, String low, String high);

  /// No description provided for @youTitle.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get youTitle;

  /// No description provided for @sortAlphabetical.
  ///
  /// In en, this message translates to:
  /// **'A–Z'**
  String get sortAlphabetical;

  /// No description provided for @sortGainers.
  ///
  /// In en, this message translates to:
  /// **'Risers'**
  String get sortGainers;

  /// No description provided for @sortLosers.
  ///
  /// In en, this message translates to:
  /// **'Fallers'**
  String get sortLosers;

  /// No description provided for @sortMostActive.
  ///
  /// In en, this message translates to:
  /// **'Most traded'**
  String get sortMostActive;

  /// No description provided for @directoryCompaniesSorted.
  ///
  /// In en, this message translates to:
  /// **'Companies · {order}'**
  String directoryCompaniesSorted(String order);

  /// No description provided for @newsReadStory.
  ///
  /// In en, this message translates to:
  /// **'Read the story'**
  String get newsReadStory;

  /// No description provided for @newsSourceHeader.
  ///
  /// In en, this message translates to:
  /// **'Source'**
  String get newsSourceHeader;

  /// No description provided for @filingReaderHeader.
  ///
  /// In en, this message translates to:
  /// **'EGX filing'**
  String get filingReaderHeader;

  /// No description provided for @companyInThePress.
  ///
  /// In en, this message translates to:
  /// **'In the press'**
  String get companyInThePress;

  /// No description provided for @companyInThePressBody.
  ///
  /// In en, this message translates to:
  /// **'Stories that named {ticker}, from the outlets we read. Their reporting, on their pages.'**
  String companyInThePressBody(String ticker);

  /// No description provided for @homeWhichCompanies.
  ///
  /// In en, this message translates to:
  /// **'Busiest against their own normal'**
  String get homeWhichCompanies;

  /// No description provided for @volumeTeaching.
  ///
  /// In en, this message translates to:
  /// **'“Traded unusually” means one thing here: the company\'s shares changed hands at least twice as often as they normally do. That is a question worth asking, not a verdict — busy days happen for good reasons and bad ones alike.'**
  String get volumeTeaching;

  /// No description provided for @volumeTeachingTitle.
  ///
  /// In en, this message translates to:
  /// **'What “traded unusually” means'**
  String get volumeTeachingTitle;

  /// No description provided for @volumeTeachingWorkings.
  ///
  /// In en, this message translates to:
  /// **'Shares traded in the session ÷ the median of the last 20 sessions. At 2.0 or above, this app says the day was unusual.'**
  String get volumeTeachingWorkings;

  /// No description provided for @volumeTeachingYardstick.
  ///
  /// In en, this message translates to:
  /// **'Twice the usual is the line, and it is this app\'s line rather than the exchange\'s — nobody publishes an official one. It is set where it is because a day at twice a company\'s normal volume is uncommon enough to be worth a look and common enough to happen without anything being wrong.'**
  String get volumeTeachingYardstick;

  /// No description provided for @learnMore.
  ///
  /// In en, this message translates to:
  /// **'What does this mean?'**
  String get learnMore;

  /// No description provided for @goldKaratPlain.
  ///
  /// In en, this message translates to:
  /// **'A gram of {karat}-karat gold costs {price} pounds.'**
  String goldKaratPlain(int karat, String price);

  /// No description provided for @goldKaratYardstick.
  ///
  /// In en, this message translates to:
  /// **'{karat} parts gold in every 24. Most Egyptian jewellery is 21. The metal is the same price either way; the karat is how much of it is in the piece.'**
  String goldKaratYardstick(int karat);

  /// No description provided for @ratesPerGramEgp.
  ///
  /// In en, this message translates to:
  /// **'EGP · {per}'**
  String ratesPerGramEgp(String per);

  /// No description provided for @exitNormalDay.
  ///
  /// In en, this message translates to:
  /// **'A normal day’s trading'**
  String get exitNormalDay;

  /// No description provided for @exitNotPublished.
  ///
  /// In en, this message translates to:
  /// **'not published'**
  String get exitNotPublished;

  /// No description provided for @exitFloatRest.
  ///
  /// In en, this message translates to:
  /// **'{percent}% — the rest do not move'**
  String exitFloatRest(String percent);

  /// No description provided for @exitSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Check a company by name or symbol…'**
  String get exitSearchHint;

  /// No description provided for @studySearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search ticker or company'**
  String get studySearchHint;

  /// No description provided for @sectorFinance.
  ///
  /// In en, this message translates to:
  /// **'Finance'**
  String get sectorFinance;

  /// No description provided for @sectorProcessIndustries.
  ///
  /// In en, this message translates to:
  /// **'Process Industries'**
  String get sectorProcessIndustries;

  /// No description provided for @sectorNonEnergyMinerals.
  ///
  /// In en, this message translates to:
  /// **'Non-Energy Minerals'**
  String get sectorNonEnergyMinerals;

  /// No description provided for @sectorConsumerNonDurables.
  ///
  /// In en, this message translates to:
  /// **'Consumer Non-Durables'**
  String get sectorConsumerNonDurables;

  /// No description provided for @sectorConsumerServices.
  ///
  /// In en, this message translates to:
  /// **'Consumer Services'**
  String get sectorConsumerServices;

  /// No description provided for @sectorIndustrialServices.
  ///
  /// In en, this message translates to:
  /// **'Industrial Services'**
  String get sectorIndustrialServices;

  /// No description provided for @sectorHealthTechnology.
  ///
  /// In en, this message translates to:
  /// **'Health Technology'**
  String get sectorHealthTechnology;

  /// No description provided for @sectorProducerManufacturing.
  ///
  /// In en, this message translates to:
  /// **'Producer Manufacturing'**
  String get sectorProducerManufacturing;

  /// No description provided for @sectorDistributionServices.
  ///
  /// In en, this message translates to:
  /// **'Distribution Services'**
  String get sectorDistributionServices;

  /// No description provided for @sectorHealthServices.
  ///
  /// In en, this message translates to:
  /// **'Health Services'**
  String get sectorHealthServices;

  /// No description provided for @sectorTechnologyServices.
  ///
  /// In en, this message translates to:
  /// **'Technology Services'**
  String get sectorTechnologyServices;

  /// No description provided for @sectorConsumerDurables.
  ///
  /// In en, this message translates to:
  /// **'Consumer Durables'**
  String get sectorConsumerDurables;

  /// No description provided for @sectorRetailTrade.
  ///
  /// In en, this message translates to:
  /// **'Retail Trade'**
  String get sectorRetailTrade;

  /// No description provided for @sectorTransportation.
  ///
  /// In en, this message translates to:
  /// **'Transportation'**
  String get sectorTransportation;

  /// No description provided for @sectorCommercialServices.
  ///
  /// In en, this message translates to:
  /// **'Commercial Services'**
  String get sectorCommercialServices;

  /// No description provided for @sectorUtilities.
  ///
  /// In en, this message translates to:
  /// **'Utilities'**
  String get sectorUtilities;

  /// No description provided for @sectorCommunications.
  ///
  /// In en, this message translates to:
  /// **'Communications'**
  String get sectorCommunications;

  /// No description provided for @sectorEnergyMinerals.
  ///
  /// In en, this message translates to:
  /// **'Energy Minerals'**
  String get sectorEnergyMinerals;

  /// No description provided for @sectorElectronicTechnology.
  ///
  /// In en, this message translates to:
  /// **'Electronic Technology'**
  String get sectorElectronicTechnology;

  /// No description provided for @sectorMiscellaneous.
  ///
  /// In en, this message translates to:
  /// **'Miscellaneous'**
  String get sectorMiscellaneous;

  /// No description provided for @sectorHeroLabel.
  ///
  /// In en, this message translates to:
  /// **'Sector analysis'**
  String get sectorHeroLabel;

  /// No description provided for @sectorHeroMoving.
  ///
  /// In en, this message translates to:
  /// **'{rising} of {total} companies show rising {metric}.'**
  String sectorHeroMoving(int rising, int total, String metric);

  /// No description provided for @sectorHeroFoot.
  ///
  /// In en, this message translates to:
  /// **'{count} sectors · as filed {date}'**
  String sectorHeroFoot(int count, String date);

  /// No description provided for @sectorScreenTitle.
  ///
  /// In en, this message translates to:
  /// **'Sector analysis'**
  String get sectorScreenTitle;

  /// No description provided for @sectorScreenDek.
  ///
  /// In en, this message translates to:
  /// **'Each sector read against its own companies — which way the group is moving, and the middle of its range. Medians, not verdicts.'**
  String get sectorScreenDek;

  /// No description provided for @sectorScreenMethod.
  ///
  /// In en, this message translates to:
  /// **'Counts are of companies that filed. A median is the middle company of the five or more that report each figure.'**
  String get sectorScreenMethod;

  /// No description provided for @sectorScreenAsOf.
  ///
  /// In en, this message translates to:
  /// **'As filed with the exchange · built {date}.'**
  String sectorScreenAsOf(String date);

  /// No description provided for @sectorCompanyCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{1 company} other{{count} companies}}'**
  String sectorCompanyCount(int count);

  /// No description provided for @sectorReadLabel.
  ///
  /// In en, this message translates to:
  /// **'The sector read'**
  String get sectorReadLabel;

  /// No description provided for @sectorReadFallback.
  ///
  /// In en, this message translates to:
  /// **'{rising} of {total} companies show rising {metric}; {falling} are falling.'**
  String sectorReadFallback(int rising, int total, int falling, String metric);

  /// No description provided for @sectorMovingLabel.
  ///
  /// In en, this message translates to:
  /// **'How its companies are moving'**
  String get sectorMovingLabel;

  /// No description provided for @sectorMoveCounts.
  ///
  /// In en, this message translates to:
  /// **'{rising} rising · {falling} falling'**
  String sectorMoveCounts(int rising, int falling);

  /// No description provided for @sectorMediansLabel.
  ///
  /// In en, this message translates to:
  /// **'Typical for the sector'**
  String get sectorMediansLabel;

  /// No description provided for @sectorMedianNote.
  ///
  /// In en, this message translates to:
  /// **'A median is the middle company of the five or more that report each figure.'**
  String get sectorMedianNote;

  /// No description provided for @sectorStandoutLabel.
  ///
  /// In en, this message translates to:
  /// **'Where the most measures move together'**
  String get sectorStandoutLabel;

  /// No description provided for @sectorMeasuresImproving.
  ///
  /// In en, this message translates to:
  /// **'{improving} of {readable} measures improving'**
  String sectorMeasuresImproving(int improving, int readable);

  /// No description provided for @sectorMembersLabel.
  ///
  /// In en, this message translates to:
  /// **'All companies'**
  String get sectorMembersLabel;

  /// No description provided for @sectorNotEnoughHistory.
  ///
  /// In en, this message translates to:
  /// **'Not enough history to read yet'**
  String get sectorNotEnoughHistory;

  /// No description provided for @sectorHeldBack.
  ///
  /// In en, this message translates to:
  /// **'{names} each hold fewer than five companies here — too few to read as a group.'**
  String sectorHeldBack(String names);

  /// No description provided for @sectorDoesNotShowTitle.
  ///
  /// In en, this message translates to:
  /// **'What this doesn\'t show'**
  String get sectorDoesNotShowTitle;

  /// No description provided for @sectorDoesNotShowBody.
  ///
  /// In en, this message translates to:
  /// **'No revenue, margins, market value, free float or price return — the exchange\'s filings don\'t carry them, so ESTHMR doesn\'t compute them.'**
  String get sectorDoesNotShowBody;

  /// No description provided for @scanScoreOf.
  ///
  /// In en, this message translates to:
  /// **'{status} · of {max}'**
  String scanScoreOf(String status, int max);

  /// No description provided for @scanScoreSpoken.
  ///
  /// In en, this message translates to:
  /// **'{score} of {max}, {status}'**
  String scanScoreSpoken(int score, int max, String status);

  /// No description provided for @expRvTitle.
  ///
  /// In en, this message translates to:
  /// **'How much it traded'**
  String get expRvTitle;

  /// No description provided for @expRvNoTrade.
  ///
  /// In en, this message translates to:
  /// **'It did not trade at all.'**
  String get expRvNoTrade;

  /// No description provided for @expRvExact.
  ///
  /// In en, this message translates to:
  /// **'Traded exactly its normal amount.'**
  String get expRvExact;

  /// No description provided for @expRvMore.
  ///
  /// In en, this message translates to:
  /// **'Traded {pct}% more than its normal amount.'**
  String expRvMore(int pct);

  /// No description provided for @expRvLess.
  ///
  /// In en, this message translates to:
  /// **'Traded {pct}% less than its normal amount.'**
  String expRvLess(int pct);

  /// No description provided for @expRvToken.
  ///
  /// In en, this message translates to:
  /// **'{ratio}× normal'**
  String expRvToken(String ratio);

  /// No description provided for @expRvWorkings.
  ///
  /// In en, this message translates to:
  /// **'{volume} shares traded\n÷ {median} — the middle session of the last 20\n= {ratio}'**
  String expRvWorkings(String volume, String median, String ratio);

  /// No description provided for @expRvYardstickNoTrade.
  ///
  /// In en, this message translates to:
  /// **'Nothing changed hands. There was no price at which a holder could sell, because selling needs somebody on the other side.'**
  String get expRvYardstickNoTrade;

  /// No description provided for @expRvYardstick.
  ///
  /// In en, this message translates to:
  /// **'Below 1 is quieter than usual. Above 2 is unusual and worth reading the filings for.'**
  String get expRvYardstick;

  /// No description provided for @expRvCaveat.
  ///
  /// In en, this message translates to:
  /// **'The comparison is against the middle session of the last twenty, not the average. A holiday week or a trading halt moves it.'**
  String get expRvCaveat;

  /// No description provided for @expCloseTitle.
  ///
  /// In en, this message translates to:
  /// **'Where it finished'**
  String get expCloseTitle;

  /// No description provided for @expCloseUpper.
  ///
  /// In en, this message translates to:
  /// **'Finished in the upper half of the day it traded in.'**
  String get expCloseUpper;

  /// No description provided for @expCloseLower.
  ///
  /// In en, this message translates to:
  /// **'Finished in the lower half of the day it traded in.'**
  String get expCloseLower;

  /// No description provided for @expCloseToken.
  ///
  /// In en, this message translates to:
  /// **'{pct}% of the day’s range'**
  String expCloseToken(int pct);

  /// No description provided for @expCloseWorkings.
  ///
  /// In en, this message translates to:
  /// **'Closed at {close}\n− the day’s low {low}\n÷ (high {high} − low {low})\n= {pct}%'**
  String expCloseWorkings(String close, String low, String high, int pct);

  /// No description provided for @expCloseYardstick.
  ///
  /// In en, this message translates to:
  /// **'100% means it closed at the very top of its range, 0% at the very bottom. One session on its own says little.'**
  String get expCloseYardstick;

  /// No description provided for @expFloatTitle.
  ///
  /// In en, this message translates to:
  /// **'How much of it can actually be bought'**
  String get expFloatTitle;

  /// No description provided for @expFloatPlain.
  ///
  /// In en, this message translates to:
  /// **'Only {count} shares in every 100 actually trade.'**
  String expFloatPlain(int count);

  /// No description provided for @expFloatToken.
  ///
  /// In en, this message translates to:
  /// **'{pct}% free float'**
  String expFloatToken(String pct);

  /// No description provided for @expFloatWorkingsShort.
  ///
  /// In en, this message translates to:
  /// **'{pct}% of the shares are free to trade.'**
  String expFloatWorkingsShort(String pct);

  /// No description provided for @expFloatWorkingsHead.
  ///
  /// In en, this message translates to:
  /// **'{shares} shares are free to trade'**
  String expFloatWorkingsHead(String shares);

  /// No description provided for @expFloatWorkingsDiv.
  ///
  /// In en, this message translates to:
  /// **'÷ {shares} shares in issue'**
  String expFloatWorkingsDiv(String shares);

  /// No description provided for @expFloatWorkingsSum.
  ///
  /// In en, this message translates to:
  /// **'= {pct}%'**
  String expFloatWorkingsSum(String pct);

  /// No description provided for @expFloatYardstick.
  ///
  /// In en, this message translates to:
  /// **'The rest sit with owners who do not sell. A small float means the price moves further on the same order — in both directions — and that selling in size can take days.'**
  String get expFloatYardstick;

  /// No description provided for @expFloatSource.
  ///
  /// In en, this message translates to:
  /// **'Ownership table, most recent filing'**
  String get expFloatSource;

  /// No description provided for @expFloatCaveat.
  ///
  /// In en, this message translates to:
  /// **'A market value calculated on all the shares is not what the company would fetch when only a fraction of them trade.'**
  String get expFloatCaveat;

  /// No description provided for @expCapTitle.
  ///
  /// In en, this message translates to:
  /// **'What the whole company is priced at'**
  String get expCapTitle;

  /// No description provided for @expCapPlainBillions.
  ///
  /// In en, this message translates to:
  /// **'The whole company is priced at {value} billion pounds.'**
  String expCapPlainBillions(String value);

  /// No description provided for @expCapPlainMillions.
  ///
  /// In en, this message translates to:
  /// **'The whole company is priced at {value} million pounds.'**
  String expCapPlainMillions(String value);

  /// No description provided for @expCapWorkings.
  ///
  /// In en, this message translates to:
  /// **'{shares} shares in issue\n× EGP {price} a share\n= EGP {cap}'**
  String expCapWorkings(String shares, String price, String cap);

  /// No description provided for @expCapYardstick.
  ///
  /// In en, this message translates to:
  /// **'This is what the market is charging for the company today, not a measure of what it owns or earns.'**
  String get expCapYardstick;

  /// No description provided for @expCapSource.
  ///
  /// In en, this message translates to:
  /// **'Shares in issue from the latest filing, price from the close'**
  String get expCapSource;

  /// No description provided for @expCapCaveat.
  ///
  /// In en, this message translates to:
  /// **'It multiplies every share by the last traded price, including the shares that never trade.'**
  String get expCapCaveat;

  /// No description provided for @expMoveHigher.
  ///
  /// In en, this message translates to:
  /// **'Priced {pct}% higher than it was {window} ago.'**
  String expMoveHigher(String pct, String window);

  /// No description provided for @expMoveLower.
  ///
  /// In en, this message translates to:
  /// **'Priced {pct}% lower than it was {window} ago.'**
  String expMoveLower(String pct, String window);

  /// No description provided for @expMoveWorkings.
  ///
  /// In en, this message translates to:
  /// **'The closing price now, against the closing price {window} ago, as a percentage of the older one.'**
  String expMoveWorkings(String window);

  /// No description provided for @expMoveYardstick.
  ///
  /// In en, this message translates to:
  /// **'A move on its own says what happened, not why. The reason — if one was published — is in the filings and the study.'**
  String get expMoveYardstick;

  /// No description provided for @expSourceSession.
  ///
  /// In en, this message translates to:
  /// **'EGX session data'**
  String get expSourceSession;

  /// No description provided for @expSourceSessionOn.
  ///
  /// In en, this message translates to:
  /// **'EGX session data, {date}'**
  String expSourceSessionOn(String date);

  /// No description provided for @expSourceCloses.
  ///
  /// In en, this message translates to:
  /// **'EGX closing prices'**
  String get expSourceCloses;

  /// No description provided for @expSourceClosesOn.
  ///
  /// In en, this message translates to:
  /// **'EGX closing prices, {date}'**
  String expSourceClosesOn(String date);

  /// No description provided for @notabilityOrdinary.
  ///
  /// In en, this message translates to:
  /// **'Ordinary'**
  String get notabilityOrdinary;

  /// No description provided for @notabilityUnusual.
  ///
  /// In en, this message translates to:
  /// **'Unusual'**
  String get notabilityUnusual;

  /// No description provided for @notabilityUnjudged.
  ///
  /// In en, this message translates to:
  /// **'No published threshold'**
  String get notabilityUnjudged;

  /// No description provided for @provenanceFact.
  ///
  /// In en, this message translates to:
  /// **'Fact'**
  String get provenanceFact;

  /// No description provided for @provenanceCalculation.
  ///
  /// In en, this message translates to:
  /// **'Calculation'**
  String get provenanceCalculation;

  /// No description provided for @provenanceInterpretation.
  ///
  /// In en, this message translates to:
  /// **'Interpretation'**
  String get provenanceInterpretation;

  /// No description provided for @dotsWhatTheyShare.
  ///
  /// In en, this message translates to:
  /// **'What they share'**
  String get dotsWhatTheyShare;

  /// No description provided for @busyBody.
  ///
  /// In en, this message translates to:
  /// **'{count} traded at least twice their usual volume today.'**
  String busyBody(int count);

  /// No description provided for @busyNone.
  ///
  /// In en, this message translates to:
  /// **'No company traded far outside its own normal today. A quiet day is a real answer.'**
  String get busyNone;

  /// No description provided for @busyFiledToo.
  ///
  /// In en, this message translates to:
  /// **'Announced something'**
  String get busyFiledToo;

  /// No description provided for @busyFloorNote.
  ///
  /// In en, this message translates to:
  /// **'Sessions worth under {amount} are left out.'**
  String busyFloorNote(String amount);

  /// No description provided for @homeSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search a company, or a symbol'**
  String get homeSearchHint;

  /// No description provided for @homeSearchNone.
  ///
  /// In en, this message translates to:
  /// **'Nothing matches “{query}”'**
  String homeSearchNone(String query);

  /// No description provided for @homeSearchMore.
  ///
  /// In en, this message translates to:
  /// **'See all {count} results'**
  String homeSearchMore(int count);

  /// No description provided for @volumeTeachingShort.
  ///
  /// In en, this message translates to:
  /// **'Unusual volume is a question, not a verdict.'**
  String get volumeTeachingShort;

  /// No description provided for @heroLabel.
  ///
  /// In en, this message translates to:
  /// **'The exchange today'**
  String get heroLabel;

  /// No description provided for @heroBreadth.
  ///
  /// In en, this message translates to:
  /// **'{up} rose · {flat} unchanged · {down} fell'**
  String heroBreadth(int up, int flat, int down);

  /// No description provided for @heroOf.
  ///
  /// In en, this message translates to:
  /// **'of {count} shares'**
  String heroOf(int count);

  /// No description provided for @volumeTeachingFloor.
  ///
  /// In en, this message translates to:
  /// **'A session worth very little is left off the list however large the multiple is. Today the raw ranking opens with a company that traded 567 shares against a usual four — 141 times its normal, and 708,750 pounds. A multiple of a very small number is arithmetic, not news.'**
  String get volumeTeachingFloor;

  /// No description provided for @dotsExplainerTitle.
  ///
  /// In en, this message translates to:
  /// **'Crossings'**
  String get dotsExplainerTitle;

  /// No description provided for @dotsExplainerPlain.
  ///
  /// In en, this message translates to:
  /// **'One company turning up in more than one place at once.'**
  String get dotsExplainerPlain;

  /// No description provided for @dotsExplainerWorkings.
  ///
  /// In en, this message translates to:
  /// **'Three feeds are read for the same {days} days: what the exchange published, what the press wrote, and what the shares did. A company is listed here when at least two of them carry it. Nothing on the card is new — every thread links back to the document it came from.'**
  String dotsExplainerWorkings(int days);

  /// No description provided for @dotsExplainerYardstick.
  ///
  /// In en, this message translates to:
  /// **'Two threads is common. Three — a filing, a story and a session outside its own normal — happens to a handful of companies a week. A crossing is a question, not a verdict: it says a company was busy in more than one way, and nothing about whether that was good.'**
  String get dotsExplainerYardstick;

  /// No description provided for @dotsThreads.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 thread} other{{count} threads}}'**
  String dotsThreads(int count);

  /// No description provided for @exchangeIndicesLabel.
  ///
  /// In en, this message translates to:
  /// **'The three indices'**
  String get exchangeIndicesLabel;

  /// No description provided for @exchangeRecorded.
  ///
  /// In en, this message translates to:
  /// **'{count} sessions recorded, since {date}'**
  String exchangeRecorded(int count, String date);

  /// No description provided for @exchangeWindowMove.
  ///
  /// In en, this message translates to:
  /// **'over that stretch'**
  String get exchangeWindowMove;

  /// No description provided for @exchangeMoversLabel.
  ///
  /// In en, this message translates to:
  /// **'What rose and what fell'**
  String get exchangeMoversLabel;

  /// No description provided for @exchangeMoversBody.
  ///
  /// In en, this message translates to:
  /// **'The session\'s biggest moves, from the {count} shares that traded enough to count.'**
  String exchangeMoversBody(int count);

  /// No description provided for @exchangeBreadthLabel.
  ///
  /// In en, this message translates to:
  /// **'How wide each session was'**
  String get exchangeBreadthLabel;

  /// No description provided for @exchangeBreadthBody.
  ///
  /// In en, this message translates to:
  /// **'Rose, fell and unchanged, across every session this app has recorded.'**
  String get exchangeBreadthBody;

  /// No description provided for @exchangeRoseMore.
  ///
  /// In en, this message translates to:
  /// **'More shares rose than fell in {rose} of those {total} sessions.'**
  String exchangeRoseMore(int rose, int total);

  /// No description provided for @exchangeOneSession.
  ///
  /// In en, this message translates to:
  /// **'One session recorded so far. The lines start here.'**
  String get exchangeOneSession;

  /// No description provided for @legendRose.
  ///
  /// In en, this message translates to:
  /// **'Rose'**
  String get legendRose;

  /// No description provided for @legendFell.
  ///
  /// In en, this message translates to:
  /// **'Fell'**
  String get legendFell;

  /// No description provided for @legendUnchanged.
  ///
  /// In en, this message translates to:
  /// **'Unchanged'**
  String get legendUnchanged;

  /// No description provided for @priceLatestSessionOnly.
  ///
  /// In en, this message translates to:
  /// **'Latest session only — no series published for this listing'**
  String get priceLatestSessionOnly;

  /// No description provided for @directoryAllCount.
  ///
  /// In en, this message translates to:
  /// **'All {count}'**
  String directoryAllCount(int count);

  /// No description provided for @navCalendar.
  ///
  /// In en, this message translates to:
  /// **'Calendar'**
  String get navCalendar;

  /// No description provided for @calendarTitle.
  ///
  /// In en, this message translates to:
  /// **'Dates the filings put on the record'**
  String get calendarTitle;

  /// No description provided for @calViewDay.
  ///
  /// In en, this message translates to:
  /// **'Day'**
  String get calViewDay;

  /// No description provided for @calViewWeek.
  ///
  /// In en, this message translates to:
  /// **'Week'**
  String get calViewWeek;

  /// No description provided for @calViewMonth.
  ///
  /// In en, this message translates to:
  /// **'Month'**
  String get calViewMonth;

  /// No description provided for @calNothingDay.
  ///
  /// In en, this message translates to:
  /// **'Nothing scheduled for this day.'**
  String get calNothingDay;

  /// No description provided for @calNothingRange.
  ///
  /// In en, this message translates to:
  /// **'Nothing scheduled in this stretch.'**
  String get calNothingRange;

  /// No description provided for @calUpcoming.
  ///
  /// In en, this message translates to:
  /// **'Next up'**
  String get calUpcoming;

  /// No description provided for @calToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get calToday;

  /// No description provided for @calAnnounced.
  ///
  /// In en, this message translates to:
  /// **'announced {date}'**
  String calAnnounced(String date);

  /// No description provided for @calInDays.
  ///
  /// In en, this message translates to:
  /// **'{days, plural, =0{today} =1{tomorrow} other{in {days} days}}'**
  String calInDays(int days);

  /// No description provided for @calAgoDays.
  ///
  /// In en, this message translates to:
  /// **'{days, plural, =1{yesterday} other{{days} days ago}}'**
  String calAgoDays(int days);

  /// No description provided for @calExplainerTitle.
  ///
  /// In en, this message translates to:
  /// **'Where these dates come from'**
  String get calExplainerTitle;

  /// No description provided for @calExplainerPlain.
  ///
  /// In en, this message translates to:
  /// **'Dates a company already filed — not a forecast.'**
  String get calExplainerPlain;

  /// No description provided for @calExplainerBody.
  ///
  /// In en, this message translates to:
  /// **'Companies file dividend dates, rights-issue windows, meeting dates and trading notices days to weeks ahead of the event. This reads those dates out of the filings and lays them on a calendar, with every entry linking back to the filing it came from. One kind of row is different and says so: a company\'s expected results date is not filed by anybody — it is worked out from the dates that company filed the same period in previous years, shown as a range, and marked Estimated wherever it appears. Under both sits what actually landed on the day.'**
  String get calExplainerBody;

  /// No description provided for @calKindDividendPayment.
  ///
  /// In en, this message translates to:
  /// **'Dividend paid'**
  String get calKindDividendPayment;

  /// No description provided for @calKindExDividend.
  ///
  /// In en, this message translates to:
  /// **'Ex-dividend'**
  String get calKindExDividend;

  /// No description provided for @calKindRightsOpen.
  ///
  /// In en, this message translates to:
  /// **'Rights issue opens'**
  String get calKindRightsOpen;

  /// No description provided for @calKindRightsClose.
  ///
  /// In en, this message translates to:
  /// **'Rights issue closes'**
  String get calKindRightsClose;

  /// No description provided for @calKindRightsEntitlement.
  ///
  /// In en, this message translates to:
  /// **'Rights entitlement cutoff'**
  String get calKindRightsEntitlement;

  /// No description provided for @calKindAssemblyAgm.
  ///
  /// In en, this message translates to:
  /// **'Annual general assembly'**
  String get calKindAssemblyAgm;

  /// No description provided for @calKindAssemblyEgm.
  ///
  /// In en, this message translates to:
  /// **'Extraordinary assembly'**
  String get calKindAssemblyEgm;

  /// No description provided for @calKindTradingResume.
  ///
  /// In en, this message translates to:
  /// **'Trading resumes'**
  String get calKindTradingResume;

  /// No description provided for @calKindTradingSuspend.
  ///
  /// In en, this message translates to:
  /// **'Trading suspended'**
  String get calKindTradingSuspend;

  /// No description provided for @calKindListingEffective.
  ///
  /// In en, this message translates to:
  /// **'Listing change'**
  String get calKindListingEffective;

  /// No description provided for @calKindOther.
  ///
  /// In en, this message translates to:
  /// **'Scheduled event'**
  String get calKindOther;

  /// No description provided for @calFamilyCash.
  ///
  /// In en, this message translates to:
  /// **'Cash'**
  String get calFamilyCash;

  /// No description provided for @calFamilyRights.
  ///
  /// In en, this message translates to:
  /// **'Rights'**
  String get calFamilyRights;

  /// No description provided for @calFamilyAssembly.
  ///
  /// In en, this message translates to:
  /// **'Meeting'**
  String get calFamilyAssembly;

  /// No description provided for @calFamilyTrading.
  ///
  /// In en, this message translates to:
  /// **'Trading'**
  String get calFamilyTrading;

  /// No description provided for @calFamilyOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get calFamilyOther;

  /// No description provided for @briefHistoryLabel.
  ///
  /// In en, this message translates to:
  /// **'What this company has done'**
  String get briefHistoryLabel;

  /// No description provided for @briefPlansLabel.
  ///
  /// In en, this message translates to:
  /// **'What it has said it will do'**
  String get briefPlansLabel;

  /// No description provided for @briefRecordLabel.
  ///
  /// In en, this message translates to:
  /// **'The record, in counts'**
  String get briefRecordLabel;

  /// No description provided for @briefSourceNote.
  ///
  /// In en, this message translates to:
  /// **'Read from this company\'s own filings. Every plan links to the filing that announced it.'**
  String get briefSourceNote;

  /// No description provided for @briefNoVerdict.
  ///
  /// In en, this message translates to:
  /// **'No view on whether any of this is good — that would be advice, and we are not licensed to give it.'**
  String get briefNoVerdict;

  /// No description provided for @briefOpenFiling.
  ///
  /// In en, this message translates to:
  /// **'Open the filing'**
  String get briefOpenFiling;

  /// No description provided for @briefRecFilings.
  ///
  /// In en, this message translates to:
  /// **'{count} filings lodged'**
  String briefRecFilings(int count);

  /// No description provided for @briefRecSince.
  ///
  /// In en, this message translates to:
  /// **'since {date}'**
  String briefRecSince(String date);

  /// No description provided for @briefRecSuspensions.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{never suspended from trading} =1{suspended from trading once} other{suspended from trading {count} times}}'**
  String briefRecSuspensions(int count);

  /// No description provided for @briefRecCapital.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{no capital increases} =1{one capital increase} other{{count} capital increases}}'**
  String briefRecCapital(int count);

  /// No description provided for @briefRecLosses.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{no loss-making period reported} =1{one loss-making period} other{{count} loss-making periods}} of {total} reported'**
  String briefRecLosses(int count, int total);

  /// No description provided for @filingsAllOf.
  ///
  /// In en, this message translates to:
  /// **'Showing {shown} of {total}'**
  String filingsAllOf(int shown, int total);

  /// No description provided for @tabCalendar.
  ///
  /// In en, this message translates to:
  /// **'Calendar'**
  String get tabCalendar;

  /// No description provided for @calEstimated.
  ///
  /// In en, this message translates to:
  /// **'Estimated'**
  String get calEstimated;

  /// No description provided for @calKindResultsExpected.
  ///
  /// In en, this message translates to:
  /// **'Results expected'**
  String get calKindResultsExpected;

  /// No description provided for @calExpectedHeading.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 company usually reports around now} other{{count} companies usually report around now}}'**
  String calExpectedHeading(int count);

  /// No description provided for @calExpectedWindow.
  ///
  /// In en, this message translates to:
  /// **'Filed between {start} and {end} in past years.'**
  String calExpectedWindow(String start, String end);

  /// No description provided for @calExpectedBasis.
  ///
  /// In en, this message translates to:
  /// **'{years, plural, =1{From 1 past filing of the same period} other{From {years} past filings of the same period}}'**
  String calExpectedBasis(int years);

  /// No description provided for @calFiledHeading.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 filing landed} other{{count} filings landed}}'**
  String calFiledHeading(int count);

  /// No description provided for @calFiledMore.
  ///
  /// In en, this message translates to:
  /// **'+{count} more that day'**
  String calFiledMore(int count);

  /// No description provided for @calShowFewer.
  ///
  /// In en, this message translates to:
  /// **'Show fewer'**
  String get calShowFewer;

  /// No description provided for @ccalScheduled.
  ///
  /// In en, this message translates to:
  /// **'Dates it filed'**
  String get ccalScheduled;

  /// No description provided for @ccalExpected.
  ///
  /// In en, this message translates to:
  /// **'When results are next due'**
  String get ccalExpected;

  /// No description provided for @ccalFiled.
  ///
  /// In en, this message translates to:
  /// **'What it has filed'**
  String get ccalFiled;

  /// No description provided for @ccalNothingScheduled.
  ///
  /// In en, this message translates to:
  /// **'Nothing scheduled ahead. Every date this company put on the record has passed.'**
  String get ccalNothingScheduled;

  /// No description provided for @ccalNoRhythm.
  ///
  /// In en, this message translates to:
  /// **'Not enough past results filings to read a rhythm from.'**
  String get ccalNoRhythm;

  /// No description provided for @ccalNoFilings.
  ///
  /// In en, this message translates to:
  /// **'No filings held for this company yet.'**
  String get ccalNoFilings;

  /// No description provided for @ccalResultsDue.
  ///
  /// In en, this message translates to:
  /// **'{label} results'**
  String ccalResultsDue(String label);

  /// No description provided for @ccalFiledCount.
  ///
  /// In en, this message translates to:
  /// **'Showing {shown} of {total} filings.'**
  String ccalFiledCount(int shown, int total);

  /// No description provided for @ccalShowAll.
  ///
  /// In en, this message translates to:
  /// **'Show all filings'**
  String get ccalShowAll;

  /// No description provided for @ccalShowingAll.
  ///
  /// In en, this message translates to:
  /// **'Showing all {total} filings.'**
  String ccalShowingAll(int total);

  /// No description provided for @ccalFootnote.
  ///
  /// In en, this message translates to:
  /// **'Scheduled dates are the company\'s own, quoted from its filings. The expected window is worked out from the dates it filed the same period in previous years — it is when a document is likely to arrive, not what will be in it.'**
  String get ccalFootnote;

  /// No description provided for @sigLabel.
  ///
  /// In en, this message translates to:
  /// **'Unusual against its own record'**
  String get sigLabel;

  /// No description provided for @sigFirstLoss.
  ///
  /// In en, this message translates to:
  /// **'{period} was its first loss after {run} profitable reported periods.'**
  String sigFirstLoss(String period, int run);

  /// No description provided for @sigBackToProfit.
  ///
  /// In en, this message translates to:
  /// **'{period} returned to profit after {run} loss-making reported periods.'**
  String sigBackToProfit(String period, int run);

  /// No description provided for @sigStreakSince.
  ///
  /// In en, this message translates to:
  /// **'The run had held since {year}.'**
  String sigStreakSince(String year);

  /// No description provided for @sigFirstOfType.
  ///
  /// In en, this message translates to:
  /// **'Its first {label} in {years} years.'**
  String sigFirstOfType(String label, int years);

  /// No description provided for @sigLastSeen.
  ///
  /// In en, this message translates to:
  /// **'The one before was in {year}.'**
  String sigLastSeen(String year);

  /// No description provided for @sigQuiet.
  ///
  /// In en, this message translates to:
  /// **'It has filed nothing for {days} days, and normally files every {gap}.'**
  String sigQuiet(int days, int gap);

  /// No description provided for @sigQuietSince.
  ///
  /// In en, this message translates to:
  /// **'Last filing {date}.'**
  String sigQuietSince(String date);

  /// No description provided for @sigFootnote.
  ///
  /// In en, this message translates to:
  /// **'Counts off the exchange\'s own record. A first loss is not a signal to sell and a return to profit is not a signal to buy — this is what happened, and what you make of it is yours.'**
  String get sigFootnote;

  /// No description provided for @firstsLabel.
  ///
  /// In en, this message translates to:
  /// **'First time since'**
  String get firstsLabel;

  /// No description provided for @firstsBlurb.
  ///
  /// In en, this message translates to:
  /// **'Runs that just ended, measured against each company\'s own record — not the market\'s.'**
  String get firstsBlurb;

  /// No description provided for @firstsMore.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 more on the companies\' own pages} other{{count} more on the companies\' own pages}}'**
  String firstsMore(int count);

  /// No description provided for @finFiguresPerRow.
  ///
  /// In en, this message translates to:
  /// **'Each line is in the unit shown beside it, as filed.'**
  String get finFiguresPerRow;

  /// No description provided for @briefStoryLabel.
  ///
  /// In en, this message translates to:
  /// **'Who the company is'**
  String get briefStoryLabel;

  /// No description provided for @briefStorySource.
  ///
  /// In en, this message translates to:
  /// **'From {source}'**
  String briefStorySource(String source);

  /// No description provided for @languageSwitch.
  ///
  /// In en, this message translates to:
  /// **'Switch language'**
  String get languageSwitch;

  /// No description provided for @volBusy.
  ///
  /// In en, this message translates to:
  /// **'It has traded {ratio} its usual volume today.'**
  String volBusy(String ratio);

  /// No description provided for @volAlsoThisWeek.
  ///
  /// In en, this message translates to:
  /// **'Also on this company in the last few days:'**
  String get volAlsoThisWeek;

  /// No description provided for @volNothingFiled.
  ///
  /// In en, this message translates to:
  /// **'Nothing was filed and no headline named it in the last few days.'**
  String get volNothingFiled;

  /// No description provided for @volFootnote.
  ///
  /// In en, this message translates to:
  /// **'Volume measured against this company\'s own 20-session median. What is listed here happened in the same few days — the app is not saying it caused anything.'**
  String get volFootnote;

  /// No description provided for @volKindFiling.
  ///
  /// In en, this message translates to:
  /// **'Filing'**
  String get volKindFiling;

  /// No description provided for @volKindNews.
  ///
  /// In en, this message translates to:
  /// **'Headline'**
  String get volKindNews;

  /// No description provided for @volKindResult.
  ///
  /// In en, this message translates to:
  /// **'Reported result'**
  String get volKindResult;

  /// No description provided for @revLabel.
  ///
  /// In en, this message translates to:
  /// **'The numbers, and what to ask'**
  String get revLabel;

  /// No description provided for @revRising.
  ///
  /// In en, this message translates to:
  /// **'rising'**
  String get revRising;

  /// No description provided for @revFalling.
  ///
  /// In en, this message translates to:
  /// **'falling'**
  String get revFalling;

  /// No description provided for @revFlat.
  ///
  /// In en, this message translates to:
  /// **'flat'**
  String get revFlat;

  /// No description provided for @revAboveSector.
  ///
  /// In en, this message translates to:
  /// **'above its sector'**
  String get revAboveSector;

  /// No description provided for @revBelowSector.
  ///
  /// In en, this message translates to:
  /// **'below its sector'**
  String get revBelowSector;

  /// No description provided for @revSectorMedian.
  ///
  /// In en, this message translates to:
  /// **'{sector} median'**
  String revSectorMedian(String sector);

  /// No description provided for @revOverPeriods.
  ///
  /// In en, this message translates to:
  /// **'over {n} reported periods'**
  String revOverPeriods(int n);

  /// No description provided for @revAgree.
  ///
  /// In en, this message translates to:
  /// **'{n} of {readable} readable metrics moved the same way.'**
  String revAgree(int n, int readable);

  /// No description provided for @revDisagree.
  ///
  /// In en, this message translates to:
  /// **'{up} moved one way, {down} the other.'**
  String revDisagree(int up, int down);

  /// No description provided for @revAgreeAsk.
  ///
  /// In en, this message translates to:
  /// **'When they all agree, ask what the market already knows that you do not.'**
  String get revAgreeAsk;

  /// No description provided for @revDisagreeAsk.
  ///
  /// In en, this message translates to:
  /// **'When they disagree, the disagreement is the story. Which one is early?'**
  String get revDisagreeAsk;

  /// No description provided for @revMissingNote.
  ///
  /// In en, this message translates to:
  /// **'Revenue is not published by the exchange or by any data source reachable from Egypt, so revenue growth and profit margin cannot be shown. Asset growth and cash conversion ask the same questions of figures that are published. Free float is not published anywhere and has no substitute.'**
  String get revMissingNote;

  /// No description provided for @revPe.
  ///
  /// In en, this message translates to:
  /// **'Price to earnings'**
  String get revPe;

  /// No description provided for @revPeAsk.
  ///
  /// In en, this message translates to:
  /// **'Why is it priced this way against its sector — and what are earnings doing underneath it?'**
  String get revPeAsk;

  /// No description provided for @revPeBody.
  ///
  /// In en, this message translates to:
  /// **'Market value divided by profit: how much you pay for each pound the company earns. A falling P/E can mean the price got cheaper or the earnings got better — those are different stories. Rising with fast growth can mean the market is paying for what comes next; rising with flat growth is a stretch. Never read it without the earnings line below it.'**
  String get revPeBody;

  /// No description provided for @revPb.
  ///
  /// In en, this message translates to:
  /// **'Price to book'**
  String get revPb;

  /// No description provided for @revPbAsk.
  ///
  /// In en, this message translates to:
  /// **'You are paying this much for each pound of company equity. Are those assets earning anything?'**
  String get revPbAsk;

  /// No description provided for @revPbBody.
  ///
  /// In en, this message translates to:
  /// **'Market value divided by shareholders\' equity. Below 1 means the market values the company under its accounting equity — which is only a bargain if the assets are productive. Read it beside return on equity: low price to book with a high return is a different company from low price to book with a poor one.'**
  String get revPbBody;

  /// No description provided for @revYield.
  ///
  /// In en, this message translates to:
  /// **'Dividend yield'**
  String get revYield;

  /// No description provided for @revYieldAsk.
  ///
  /// In en, this message translates to:
  /// **'Is the dividend supported by profit and cash — or by a share price that fell?'**
  String get revYieldAsk;

  /// No description provided for @revYieldBody.
  ///
  /// In en, this message translates to:
  /// **'The annual dividend against the share price, as the exchange publishes it. A yield can climb simply because the price collapsed, and a company paying out heavily may be keeping too little to invest. Read it beside profit and debt.'**
  String get revYieldBody;

  /// No description provided for @revProfit.
  ///
  /// In en, this message translates to:
  /// **'Net profit'**
  String get revProfit;

  /// No description provided for @revProfitAsk.
  ///
  /// In en, this message translates to:
  /// **'Where did the change come from — the business, or something that will not repeat?'**
  String get revProfitAsk;

  /// No description provided for @revProfitBody.
  ///
  /// In en, this message translates to:
  /// **'What the company filed as profit for the full year, as the exchange received it. Direction is read from the sign of each year\'s move rather than a percentage, because a percentage off a loss is meaningless: going from a loss to a profit is not growth of some number, it is a company that stopped losing money.'**
  String get revProfitBody;

  /// No description provided for @revEps.
  ///
  /// In en, this message translates to:
  /// **'Earnings per share'**
  String get revEps;

  /// No description provided for @revEpsAsk.
  ///
  /// In en, this message translates to:
  /// **'Profit rose — but did the earnings belonging to each share rise with it?'**
  String get revEpsAsk;

  /// No description provided for @revEpsBody.
  ///
  /// In en, this message translates to:
  /// **'Profit divided by the shares in issue. This is the number that survives a company issuing more shares: total profit can climb while each share earns less. When you hear that profits increased, this is the follow-up question.'**
  String get revEpsBody;

  /// No description provided for @revAssets.
  ///
  /// In en, this message translates to:
  /// **'Total assets'**
  String get revAssets;

  /// No description provided for @revAssetsAsk.
  ///
  /// In en, this message translates to:
  /// **'Is the business actually getting bigger, and is profit keeping pace with it?'**
  String get revAssetsAsk;

  /// No description provided for @revAssetsBody.
  ///
  /// In en, this message translates to:
  /// **'What the company holds, from its filed balance sheet. This stands in for revenue growth, which no Egyptian source publishes: assets growing while profit does not is the same warning a falling margin would give — the company is putting more in to get the same out.'**
  String get revAssetsBody;

  /// No description provided for @revCash.
  ///
  /// In en, this message translates to:
  /// **'Cash conversion'**
  String get revCash;

  /// No description provided for @revCashAsk.
  ///
  /// In en, this message translates to:
  /// **'Of every pound of reported profit, how much actually arrived as cash?'**
  String get revCashAsk;

  /// No description provided for @revCashBody.
  ///
  /// In en, this message translates to:
  /// **'Operating cash flow divided by reported profit. Above 1 means the company collected more cash than it booked as profit. This stands in for profit margin, which needs revenue nobody publishes — and it arguably answers the question better: when profit climbs and the cash does not follow, that is the thing worth investigating.'**
  String get revCashBody;

  /// No description provided for @revRoe.
  ///
  /// In en, this message translates to:
  /// **'Return on equity'**
  String get revRoe;

  /// No description provided for @revRoeAsk.
  ///
  /// In en, this message translates to:
  /// **'Good returns on shareholders\' money — or on borrowed money? Check the debt row.'**
  String get revRoeAsk;

  /// No description provided for @revRoeBody.
  ///
  /// In en, this message translates to:
  /// **'Profit as a share of shareholders\' equity: how much the company earns on the money its owners left in it. A high return is not automatically impressive — debt shrinks equity, which lifts the ratio without the business improving. Always read it beside debt to equity.'**
  String get revRoeBody;

  /// No description provided for @revRoa.
  ///
  /// In en, this message translates to:
  /// **'Return on assets'**
  String get revRoa;

  /// No description provided for @revRoaAsk.
  ///
  /// In en, this message translates to:
  /// **'How hard is everything the company owns actually working?'**
  String get revRoaAsk;

  /// No description provided for @revRoaBody.
  ///
  /// In en, this message translates to:
  /// **'Profit as a share of total assets. Unlike return on equity, borrowing cannot flatter it — the assets stay on the books either way. The gap between the two is roughly how much of the return is coming from leverage.'**
  String get revRoaBody;

  /// No description provided for @revDebt.
  ///
  /// In en, this message translates to:
  /// **'Debt to equity'**
  String get revDebt;

  /// No description provided for @revDebtAsk.
  ///
  /// In en, this message translates to:
  /// **'What did management do with the borrowed money — and is it earning more than it costs?'**
  String get revDebtAsk;

  /// No description provided for @revDebtBody.
  ///
  /// In en, this message translates to:
  /// **'Total liabilities against shareholders\' equity. The absolute amount of debt says surprisingly little: a company owing ten billion can be sounder than one owing one, depending on the size of the business behind it. Rising debt is not automatically a problem either — what matters is what moved alongside it. Debt up a fifth while earnings rose by half is borrowed money doing work. Debt up by four fifths while profit crept 5% is the case to look at.'**
  String get revDebtBody;

  /// No description provided for @revNowRising.
  ///
  /// In en, this message translates to:
  /// **'Right now it\'s rising'**
  String get revNowRising;

  /// No description provided for @revNowFalling.
  ///
  /// In en, this message translates to:
  /// **'Right now it\'s falling'**
  String get revNowFalling;

  /// No description provided for @revNowFlat.
  ///
  /// In en, this message translates to:
  /// **'Right now it\'s holding steady'**
  String get revNowFlat;

  /// No description provided for @revProofTitle.
  ///
  /// In en, this message translates to:
  /// **'The figure, period by period'**
  String get revProofTitle;

  /// No description provided for @revProofNote.
  ///
  /// In en, this message translates to:
  /// **'These are the values the direction was read from — the exchange\'s filed figures, oldest first.'**
  String get revProofNote;

  /// No description provided for @revCauseTitle.
  ///
  /// In en, this message translates to:
  /// **'Probable cause'**
  String get revCauseTitle;

  /// No description provided for @revMeansTitle.
  ///
  /// In en, this message translates to:
  /// **'What it is'**
  String get revMeansTitle;

  /// No description provided for @revAskTitle.
  ///
  /// In en, this message translates to:
  /// **'Worth asking'**
  String get revAskTitle;

  /// No description provided for @revAnswerTitle.
  ///
  /// In en, this message translates to:
  /// **'A probable answer'**
  String get revAnswerTitle;

  /// No description provided for @revOnePoint.
  ///
  /// In en, this message translates to:
  /// **'One published figure — not enough history to read a direction.'**
  String get revOnePoint;

  /// No description provided for @revDirProfitRising.
  ///
  /// In en, this message translates to:
  /// **'Profit has been climbing year on year.'**
  String get revDirProfitRising;

  /// No description provided for @revDirProfitFalling.
  ///
  /// In en, this message translates to:
  /// **'Profit has been shrinking year on year.'**
  String get revDirProfitFalling;

  /// No description provided for @revDirEpsRising.
  ///
  /// In en, this message translates to:
  /// **'Each share is earning more — the growth is reaching shareholders rather than being diluted away.'**
  String get revDirEpsRising;

  /// No description provided for @revDirEpsFalling.
  ///
  /// In en, this message translates to:
  /// **'Each share is earning less, even if the company\'s total profit has not fallen.'**
  String get revDirEpsFalling;

  /// No description provided for @revDirAssetsRising.
  ///
  /// In en, this message translates to:
  /// **'The company is bigger than it was — more plant, inventory or cash on the books.'**
  String get revDirAssetsRising;

  /// No description provided for @revDirAssetsFalling.
  ///
  /// In en, this message translates to:
  /// **'The company\'s asset base is shrinking.'**
  String get revDirAssetsFalling;

  /// No description provided for @revDirCashRising.
  ///
  /// In en, this message translates to:
  /// **'More of the reported profit is arriving as actual cash.'**
  String get revDirCashRising;

  /// No description provided for @revDirCashFalling.
  ///
  /// In en, this message translates to:
  /// **'Less of the reported profit is turning into cash — the gap is worth watching.'**
  String get revDirCashFalling;

  /// No description provided for @revDirRoeRising.
  ///
  /// In en, this message translates to:
  /// **'The company is earning more on the money its owners left in it.'**
  String get revDirRoeRising;

  /// No description provided for @revDirRoeFalling.
  ///
  /// In en, this message translates to:
  /// **'The return on shareholders\' money is slipping.'**
  String get revDirRoeFalling;

  /// No description provided for @revDirRoaRising.
  ///
  /// In en, this message translates to:
  /// **'Everything the company owns is working harder.'**
  String get revDirRoaRising;

  /// No description provided for @revDirRoaFalling.
  ///
  /// In en, this message translates to:
  /// **'The assets are producing less than they were.'**
  String get revDirRoaFalling;

  /// No description provided for @revDirDebtRising.
  ///
  /// In en, this message translates to:
  /// **'The company is carrying more debt relative to its own equity.'**
  String get revDirDebtRising;

  /// No description provided for @revDirDebtFalling.
  ///
  /// In en, this message translates to:
  /// **'The company is leaning on debt less than it used to.'**
  String get revDirDebtFalling;

  /// No description provided for @revDirPbRising.
  ///
  /// In en, this message translates to:
  /// **'The market is paying more for each pound of book value than it was.'**
  String get revDirPbRising;

  /// No description provided for @revDirPbFalling.
  ///
  /// In en, this message translates to:
  /// **'The market is paying less for each pound of book value.'**
  String get revDirPbFalling;

  /// No description provided for @revDirFlat.
  ///
  /// In en, this message translates to:
  /// **'This has held roughly steady across the periods on record.'**
  String get revDirFlat;

  /// No description provided for @revCauseProfitAheadOfCash.
  ///
  /// In en, this message translates to:
  /// **'Profit is rising, but cash conversion is falling — some of the reported profit has not arrived as cash. Read the cash-conversion row.'**
  String get revCauseProfitAheadOfCash;

  /// No description provided for @revCauseProfitWithCash.
  ///
  /// In en, this message translates to:
  /// **'Profit is rising and cash conversion is holding up, so the profit is backed by cash.'**
  String get revCauseProfitWithCash;

  /// No description provided for @revCauseAssetsAheadOfProfit.
  ///
  /// In en, this message translates to:
  /// **'The asset base is growing faster than profit — the company is putting more in for a similar return, which is what a falling margin would tell you.'**
  String get revCauseAssetsAheadOfProfit;

  /// No description provided for @revCauseAssetsWithProfit.
  ///
  /// In en, this message translates to:
  /// **'Assets and profit are growing together.'**
  String get revCauseAssetsWithProfit;

  /// No description provided for @revCauseEpsPerShare.
  ///
  /// In en, this message translates to:
  /// **'Total profit and per-share earnings are both rising, so the growth is not being diluted by new shares.'**
  String get revCauseEpsPerShare;

  /// No description provided for @revCauseCashBehindProfit.
  ///
  /// In en, this message translates to:
  /// **'Cash is lagging reported profit. When the two diverge, the reported profit is the number to question.'**
  String get revCauseCashBehindProfit;

  /// No description provided for @revCauseRoeLeverage.
  ///
  /// In en, this message translates to:
  /// **'Return on equity is rising while debt is too — some of the lift may be borrowing rather than the business. Return on assets, which debt cannot flatter, is the check.'**
  String get revCauseRoeLeverage;

  /// No description provided for @revCauseRoeOperational.
  ///
  /// In en, this message translates to:
  /// **'Return on equity is rising without more debt, so the improvement is operational.'**
  String get revCauseRoeOperational;

  /// No description provided for @revCauseRoaUnlevered.
  ///
  /// In en, this message translates to:
  /// **'The assets are earning more, and unlike return on equity, borrowing cannot flatter this figure.'**
  String get revCauseRoaUnlevered;

  /// No description provided for @revCauseDebtProductive.
  ///
  /// In en, this message translates to:
  /// **'Debt is rising, but so is profit — the borrowed money may be doing work. Compare how fast each grew.'**
  String get revCauseDebtProductive;

  /// No description provided for @revCauseDebtWatch.
  ///
  /// In en, this message translates to:
  /// **'Debt is rising while profit is not keeping pace. Ask what the borrowing is for.'**
  String get revCauseDebtWatch;

  /// No description provided for @revGroupValuation.
  ///
  /// In en, this message translates to:
  /// **'What you pay'**
  String get revGroupValuation;

  /// No description provided for @revGroupBusiness.
  ///
  /// In en, this message translates to:
  /// **'The business'**
  String get revGroupBusiness;

  /// No description provided for @revGroupReturns.
  ///
  /// In en, this message translates to:
  /// **'What it earns on'**
  String get revGroupReturns;

  /// No description provided for @revGroupRisk.
  ///
  /// In en, this message translates to:
  /// **'How it\'s financed'**
  String get revGroupRisk;

  /// No description provided for @revReadLabel.
  ///
  /// In en, this message translates to:
  /// **'The read'**
  String get revReadLabel;

  /// No description provided for @signInLead.
  ///
  /// In en, this message translates to:
  /// **'Read the exchange in plain words. Sign in to keep your own watchlist and see the live feed, or look around first as a guest.'**
  String get signInLead;

  /// No description provided for @signInApple.
  ///
  /// In en, this message translates to:
  /// **'Continue with Apple'**
  String get signInApple;

  /// No description provided for @signInGoogle.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get signInGoogle;

  /// No description provided for @signInGuest.
  ///
  /// In en, this message translates to:
  /// **'Continue as guest'**
  String get signInGuest;

  /// No description provided for @signInGuestNote.
  ///
  /// In en, this message translates to:
  /// **'Guests browse sample data. Signing in switches on the live feed.'**
  String get signInGuestNote;

  /// No description provided for @signInFailed.
  ///
  /// In en, this message translates to:
  /// **'That didn’t work. Please try again.'**
  String get signInFailed;

  /// No description provided for @account.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get account;

  /// No description provided for @accountGuest.
  ///
  /// In en, this message translates to:
  /// **'Guest'**
  String get accountGuest;

  /// No description provided for @accountSignedIn.
  ///
  /// In en, this message translates to:
  /// **'Signed in'**
  String get accountSignedIn;

  /// No description provided for @accountLive.
  ///
  /// In en, this message translates to:
  /// **'Live exchange feed'**
  String get accountLive;

  /// No description provided for @accountSample.
  ///
  /// In en, this message translates to:
  /// **'Sample data on this device'**
  String get accountSample;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signIn;

  /// No description provided for @revOrientLabel.
  ///
  /// In en, this message translates to:
  /// **'Which way reads better'**
  String get revOrientLabel;

  /// No description provided for @revOrientPe.
  ///
  /// In en, this message translates to:
  /// **'Lower is the cheaper side. A P/E below its sector means you pay less than for similar companies for the same profit; above its sector means you pay more. Watch one thing: a very low reading can also mean the market expects the profit to drop.'**
  String get revOrientPe;

  /// No description provided for @revOrientPb.
  ///
  /// In en, this message translates to:
  /// **'Lower is the cheaper side. Below its sector means you pay less for each pound of the company\'s book value than its peers do; above its sector means more. A very low reading can also flag assets the market doubts are worth what the books say.'**
  String get revOrientPb;

  /// No description provided for @revOrientYield.
  ///
  /// In en, this message translates to:
  /// **'Higher pays you more. Above its sector means more cash back each year per pound than its peers pay; below its sector means less. But a very high yield often comes from a share price that has dropped, or a payout that may be cut — so higher is not always steadier.'**
  String get revOrientYield;

  /// No description provided for @revOrientHigherMore.
  ///
  /// In en, this message translates to:
  /// **'Higher is simply more — more profit, or more earnings for each share. Above its sector means more than its peers, but the direction over time matters most: rising reads better than falling.'**
  String get revOrientHigherMore;

  /// No description provided for @revOrientCash.
  ///
  /// In en, this message translates to:
  /// **'Higher is healthier. Above its sector means more of the reported profit actually arrived as cash than for its peers — money in the bank, not just profit on paper; below its sector means more of it is still on paper.'**
  String get revOrientCash;

  /// No description provided for @revOrientReturn.
  ///
  /// In en, this message translates to:
  /// **'Higher is the stronger side. Above its sector means the company turns each pound put into it into more profit than its peers do; below its sector is weaker. Steady-and-high reads better than high-but-jumpy.'**
  String get revOrientReturn;

  /// No description provided for @revOrientDebt.
  ///
  /// In en, this message translates to:
  /// **'Lower is the safer side. Below its sector means the company has borrowed less against its own money than its peers; above its sector carries more debt — which can fund growth but adds risk if conditions tighten.'**
  String get revOrientDebt;

  /// No description provided for @revOrientAssets.
  ///
  /// In en, this message translates to:
  /// **'Higher just means bigger — more owned than its peers, nothing more. Size only counts if those assets earn a return, which the profit and return rows show; bigger is not automatically stronger.'**
  String get revOrientAssets;

  /// No description provided for @debtTitle.
  ///
  /// In en, this message translates to:
  /// **'What it does with its borrowings'**
  String get debtTitle;

  /// No description provided for @debtTitleFinance.
  ///
  /// In en, this message translates to:
  /// **'How it funds itself'**
  String get debtTitleFinance;

  /// No description provided for @debtAsFiled.
  ///
  /// In en, this message translates to:
  /// **'As filed for {period}'**
  String debtAsFiled(String period);

  /// No description provided for @debtBorrowings.
  ///
  /// In en, this message translates to:
  /// **'Borrowings'**
  String get debtBorrowings;

  /// No description provided for @debtDueWithinYear.
  ///
  /// In en, this message translates to:
  /// **'Falls due within a year'**
  String get debtDueWithinYear;

  /// No description provided for @debtDueLater.
  ///
  /// In en, this message translates to:
  /// **'Falls due later'**
  String get debtDueLater;

  /// No description provided for @debtCashHeld.
  ///
  /// In en, this message translates to:
  /// **'Cash held'**
  String get debtCashHeld;

  /// No description provided for @debtNet.
  ///
  /// In en, this message translates to:
  /// **'Borrowings net of cash'**
  String get debtNet;

  /// No description provided for @debtNetCash.
  ///
  /// In en, this message translates to:
  /// **'It holds more cash than it owes'**
  String get debtNetCash;

  /// No description provided for @debtCost.
  ///
  /// In en, this message translates to:
  /// **'Cost over the period'**
  String get debtCost;

  /// No description provided for @debtCoverLine.
  ///
  /// In en, this message translates to:
  /// **'Operating profit was {times} times that cost'**
  String debtCoverLine(String times);

  /// No description provided for @debtCoverUnder.
  ///
  /// In en, this message translates to:
  /// **'That cost was more than the operating profit for the period'**
  String get debtCoverUnder;

  /// No description provided for @debtUpFrom.
  ///
  /// In en, this message translates to:
  /// **'Higher than the same period a year earlier'**
  String get debtUpFrom;

  /// No description provided for @debtDownFrom.
  ///
  /// In en, this message translates to:
  /// **'Lower than the same period a year earlier'**
  String get debtDownFrom;

  /// No description provided for @debtFlatFrom.
  ///
  /// In en, this message translates to:
  /// **'About the same as a year earlier'**
  String get debtFlatFrom;

  /// No description provided for @debtWhatMoved.
  ///
  /// In en, this message translates to:
  /// **'What moved'**
  String get debtWhatMoved;

  /// No description provided for @debtPatternRaisedInvested.
  ///
  /// In en, this message translates to:
  /// **'It raised money and spent on assets over the same period.'**
  String get debtPatternRaisedInvested;

  /// No description provided for @debtPatternRaisedShortfall.
  ///
  /// In en, this message translates to:
  /// **'It raised money while its operations were using cash rather than producing it.'**
  String get debtPatternRaisedShortfall;

  /// No description provided for @debtPatternRaisedHeld.
  ///
  /// In en, this message translates to:
  /// **'It raised money without spending it on assets.'**
  String get debtPatternRaisedHeld;

  /// No description provided for @debtPatternRepaidFromOps.
  ///
  /// In en, this message translates to:
  /// **'It repaid or returned money, and its operations produced cash over the same period.'**
  String get debtPatternRepaidFromOps;

  /// No description provided for @debtPatternRepaidNoOps.
  ///
  /// In en, this message translates to:
  /// **'It repaid or returned money while its operations were not producing cash.'**
  String get debtPatternRepaidNoOps;

  /// No description provided for @debtPatternFlat.
  ///
  /// In en, this message translates to:
  /// **'Its borrowings barely moved.'**
  String get debtPatternFlat;

  /// No description provided for @debtPatternFundingRaised.
  ///
  /// In en, this message translates to:
  /// **'It took in more funding than it repaid.'**
  String get debtPatternFundingRaised;

  /// No description provided for @debtPatternFundingRepaid.
  ///
  /// In en, this message translates to:
  /// **'It repaid more funding than it took in.'**
  String get debtPatternFundingRepaid;

  /// No description provided for @debtFinanceNote.
  ///
  /// In en, this message translates to:
  /// **'This is a lender, so borrowing is the raw material of the business rather than a load on it. Customer deposits are not counted here.'**
  String get debtFinanceNote;

  /// No description provided for @debtFootnote.
  ///
  /// In en, this message translates to:
  /// **'Read from the borrowing lines of the company\'s own filed statement, not from its total liabilities. ESTHMR does not rate credit or say whether this position is sound.'**
  String get debtFootnote;

  /// No description provided for @debtNoneFiled.
  ///
  /// In en, this message translates to:
  /// **'This company\'s last filed statement states no borrowings.'**
  String get debtNoneFiled;
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
