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
  /// **'Research'**
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
  /// **'This session'**
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
  /// **'Opportunity Scanner history'**
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
  /// **'Nothing qualified today'**
  String get scanNothingQualified;

  /// No description provided for @scanNothingWatch.
  ///
  /// In en, this message translates to:
  /// **'Nothing on the watch list'**
  String get scanNothingWatch;

  /// No description provided for @scanNothingRejected.
  ///
  /// In en, this message translates to:
  /// **'Nothing was rejected today'**
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
