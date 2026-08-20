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
  /// **'ESTHMR is a publisher and is not licensed by the Financial Regulatory Authority. We do not buy, we do not sell, and we do not advise.'**
  String get legalNotLicensed;
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
