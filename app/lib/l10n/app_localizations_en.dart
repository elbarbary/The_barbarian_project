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
      'ESTHMR is a publisher and is not licensed by the Financial Regulatory Authority. We do not buy, we do not sell, and we do not advise. Nothing here is a recommendation to trade any security.';

  @override
  String get scannerTitle => 'Scanner';

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
  String get countQualified => 'Cleared every rule';

  @override
  String get countWatching => 'Cleared some rules';

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

  @override
  String get homeAlsoFiled => 'Filed with the exchange';

  @override
  String get homeAllFilings => 'All filings';

  @override
  String homeFilingsCount(int count) {
    return '$count filings today';
  }

  @override
  String get legalNotLicensedShort =>
      'Not licensed by the FRA. Not a recommendation.';

  @override
  String get homeImportantToday => 'Important today';

  @override
  String get homeNothingUnusual => 'Nothing unusual today';

  @override
  String get homeNothingUnusualBody =>
      'No company traded unusually against its own normal volume on the day it filed. A quiet session is a real answer.';

  @override
  String get homeLatestNews => 'Latest news';

  @override
  String get homeAllNews => 'All news';

  @override
  String homeVolumeKicker(String ratio) {
    return 'Volume ${ratio}x normal';
  }

  @override
  String get homeFiledToday => 'Filed today';

  @override
  String get tabOverview => 'Overview';

  @override
  String get tabFinancials => 'Financials';

  @override
  String get tabPrice => 'Price';

  @override
  String get tabResearch => 'Research';

  @override
  String get tabTalk => 'Talk';

  @override
  String companyNotOnDevice(String ticker) {
    return '$ticker is not on the device';
  }

  @override
  String get companyNotOnDeviceBody =>
      'Open this company once with a connection and it stays available offline.';

  @override
  String get discussionArrives => 'Discussion arrives with The Pit';

  @override
  String get discussionArrivesBody =>
      'Company threads land here once the community backend exists. Everything else on this screen works without it.';

  @override
  String get back => 'Back';

  @override
  String followTicker(String ticker) {
    return 'Follow $ticker';
  }

  @override
  String followingTicker(String ticker) {
    return 'Following $ticker. Tap to unfollow.';
  }

  @override
  String get prevClose => 'Prev close';

  @override
  String get volume => 'Volume';

  @override
  String get marketCap => 'Mkt cap';

  @override
  String get dayHigh => 'Day high';

  @override
  String get dayLow => 'Day low';

  @override
  String get previousClose => 'Previous close';

  @override
  String get avgVolume30d => 'Avg volume 30d';

  @override
  String get sharesOutstanding => 'Shares outstanding';

  @override
  String get floatShares => 'Float shares';

  @override
  String get sector => 'Sector';

  @override
  String get movedThisMonth => 'How it has moved this month';

  @override
  String get whatNumbersSay => 'What the numbers say';

  @override
  String get whatThatMeans => 'What that means';

  @override
  String get thisSession => 'This session';

  @override
  String get performance => 'Performance';

  @override
  String get sizeAndOwnership => 'Company';

  @override
  String get noDetailYet => 'No detail for this company yet';

  @override
  String get noPriceHistory => 'No price history for this company';

  @override
  String get noSessionsInRange => 'No sessions in this range';

  @override
  String get noStudyYet => 'No study published on this company yet';

  @override
  String get noStudyYetBody =>
      'Companies are studied one at a time. When this one is read, the investigation appears here.';

  @override
  String get readFullInvestigation => 'Read the full investigation';

  @override
  String get scannerHistory => 'Scanner history';

  @override
  String get studyLabel => 'Six Pillars';

  @override
  String lastSessions(int count) {
    return 'Last $count sessions';
  }

  @override
  String get canIGetOut => 'Can I get out?';

  @override
  String get itStopsTrading => 'It stops trading';

  @override
  String get scanNoReport => 'No scanner report downloaded yet';

  @override
  String get scanNoReportBody =>
      'The scanner publishes after each session. Open this once with a connection and it stays on the device.';

  @override
  String get scanNotRunToday => 'The scanner has not run today';

  @override
  String get scanNotRunTodayBody =>
      'Nothing has cleared the test since the last session. That is a result, not an error.';

  @override
  String get scanReportDateUnknown => 'Report date unknown';

  @override
  String get scanQualifiedBlurb =>
      'Cleared every rule. Clearing a rule is a fact about the rule, not a view on the company.';

  @override
  String get scanWatchingBlurb =>
      'Cleared some rules and not others. Incomplete evidence is a statement about our test, not about the share.';

  @override
  String get scanRejectedBlurb =>
      'Did not clear the rules, and kept on the record so the test can be audited.';

  @override
  String get scanLogEmpty => 'The rule log is empty';

  @override
  String get scanNothingQualified => 'Nothing cleared every rule today';

  @override
  String get scanNothingWatch => 'Nothing on the watch list';

  @override
  String get scanNothingRejected => 'Nothing failed the rules today';

  @override
  String get scanEmptyBlurb =>
      'An empty section is a real answer. The test does not lower itself to fill a screen.';

  @override
  String get coverage => 'Coverage';

  @override
  String get coverageTradable => 'Tradable';

  @override
  String get coverageListed => 'Listed';

  @override
  String get coverageAdjusted => 'Adjusted';

  @override
  String get coverageBlurb =>
      'Every listed company is read. Most of them fail, and the ones that fail are published too.';

  @override
  String get catalyst => 'Catalyst';

  @override
  String get fullRecord => 'Full record';

  @override
  String get sourcesLabel => 'Sources';

  @override
  String get evidenceLabel => 'Evidence';

  @override
  String get whatWasChecked => 'What was checked';

  @override
  String get gatePassed => 'Passed';

  @override
  String get gateFailed => 'Failed';

  @override
  String get gateUnresolved => 'Unresolved';

  @override
  String get scannerTitleFull => 'Scanner';

  @override
  String scanUpdated(String date) {
    return 'Updated · $date';
  }

  @override
  String scanQualifiedCount(int count) {
    return 'Cleared all $count';
  }

  @override
  String scanWatchCount(int count) {
    return 'Partly $count';
  }

  @override
  String scanRejectedCount(int count) {
    return 'Not cleared $count';
  }

  @override
  String scanLogCount(int count) {
    return 'Rule log $count';
  }

  @override
  String get scanLogBlurb =>
      'What the published rule said, what the tape did next, and what was changed in the rule afterwards. It is an audit of the method, not a scoreboard: there is no total here and there never will be.';

  @override
  String get scanLogEmptyBody =>
      'Entries appear here as each published rule is measured against what happened next.';

  @override
  String get scanNotRepublished => 'Not republished';

  @override
  String get scanNoComponent => 'No rubric component scored.';

  @override
  String get scanStocks => 'Stocks';

  @override
  String get scanScoredNames => 'Scored names';

  @override
  String get scanSectorNone => 'None today';

  @override
  String get scanOneCohort => 'One cohort';

  @override
  String get scanHowItWasRead => 'How it was read';

  @override
  String get scanNoSectorToday => 'No sector read today';

  @override
  String get statusQualified => 'Cleared every rule';

  @override
  String get statusWatching => 'Cleared some rules';

  @override
  String get statusRejected => 'Did not clear the rules';

  @override
  String get figPrevClose => 'Prev close';

  @override
  String get figDayHigh => 'Day high';

  @override
  String get figPreviousClose => 'Previous close';

  @override
  String get figAvgVolume30d => 'Avg volume 30d';

  @override
  String get figSharesOutstanding => 'Shares outstanding';

  @override
  String get figFloatShares => 'Float shares';

  @override
  String get finNoFigures => 'No reported figures yet';

  @override
  String get finNetProfitReported => 'Net profit, as reported';

  @override
  String get finTotalAssets => 'Total assets';

  @override
  String get finTotalLiabilities => 'Total liabilities';

  @override
  String get finCashFromOps => 'Cash from operations';

  @override
  String get finNetProfitByYear => 'Net profit by year';

  @override
  String get finLatestFiling => 'Latest filing';

  @override
  String get finCompanyOnly => 'Company only';

  @override
  String get finReadFiling => 'Read the filing';

  @override
  String finEgpMillionsPeriod(String period) {
    return 'EGP m · $period';
  }

  @override
  String get priceNoHistoryDownloaded => 'No price history downloaded';

  @override
  String priceLastSessions(int count) {
    return 'Last $count sessions';
  }

  @override
  String get discussionBody =>
      'Company threads land here once the community backend exists. Everything else on this screen works without it.';

  @override
  String get movedThisMonthLabel => 'How it has moved this month';

  @override
  String get noDetailBody =>
      'The exchange scan carried only a closing price for this company. Everything else appears once a fuller record is published.';

  @override
  String get finNoFiguresBody =>
      'Figures are read from each company\'s filed accounts and from the results it announces to the exchange. Nothing has been read for this company yet.';

  @override
  String finFootnote(String source) {
    return 'Figures in EGP millions, as filed. Neither source states revenue, so margins are not shown rather than estimated. Read from $source.';
  }

  @override
  String get sourceMubasher => 'Mubasher';

  @override
  String get priceNoHistoryBody => 'Open this company once with a connection.';

  @override
  String get priceNoSeriesBody =>
      'Neither the exchange scan nor the price source publishes a usable series for it yet.';

  @override
  String get noStudyBody =>
      'Companies are studied one at a time. When this one is read, the investigation appears here.';

  @override
  String get exitStopsTrading => 'It stops trading';

  @override
  String get exitCanIGetOut => 'Can I get out?';

  @override
  String get scanNotRunBody =>
      'Nothing has cleared the test since the last session. That is a result, not an error.';

  @override
  String get scanRecordBlurb =>
      'What the published rule said, what the tape did next, and what was changed in the rule afterwards. It is an audit of the method, not a scoreboard: there is no total here and there never will be.';

  @override
  String get scanLogEmptyBlurb =>
      'Entries appear here as each published rule is measured against what happened next.';

  @override
  String get scanEmptySectionBlurb =>
      'An empty section is a real answer. The test does not lower itself to fill a screen.';

  @override
  String get scanCoverageBlurb =>
      'Every listed company is read. Most of them fail, and the ones that fail are published too.';

  @override
  String scanCohortNames(int count) {
    return 'The cohort · $count names';
  }

  @override
  String get scanSectorBlurb =>
      'A sector read changes what gets investigated first. It is a reading order, not a view on any company in it.';

  @override
  String get scanNoSectorBody =>
      'A cohort appears when several names in one industry move for the same reason. Most days none does, and that is a result rather than a gap.';

  @override
  String get gateUnresolvedLabel => 'Unresolved';

  @override
  String get noDetailBodyFull =>
      'The exchange scan carried only a closing price for this listing. More lands as a fuller record is published.';

  @override
  String get finNoFiguresBodyFull =>
      'Figures are read from each company\'s filed accounts and from the results it announces to the exchange. Nothing has been read for this company yet.';

  @override
  String finFootnoteFull(String source) {
    return 'Figures in EGP millions, as filed. Neither source states revenue, so margins are not shown rather than estimated. Read from $source.';
  }

  @override
  String get priceNoHistoryTitle => 'No price history downloaded';

  @override
  String get priceNoSeriesBodyFull =>
      'Neither the exchange scan nor the price source publishes a series for this listing yet.';

  @override
  String exitZeroDays(int days, int sessions) {
    return 'Nothing traded at all on $days of the last $sessions sessions.';
  }

  @override
  String exitFiftyK(String share) {
    return 'EGP 50,000 here is $share';
  }

  @override
  String get exitNoPrice =>
      'On those days there was no price at which a holder could sell.';

  @override
  String meansSameDay(String amount) {
    return 'About EGP $amount can leave in one session here. Above that, selling is more than a fifth of a normal day and starts to move the price against whoever is selling.';
  }

  @override
  String meansZeroDays(int days, int sessions) {
    return 'It did not trade at all on $days of the last $sessions sessions. On those days there was no price at which a holder could sell, because there was nobody on the other side.';
  }

  @override
  String meansNetProfit(String amount, String period) {
    return 'It reported $amount EGP m of net profit in $period.';
  }

  @override
  String get scanLogEmptyBodyFull =>
      'Entries appear here as each published rule reaches its stated end.';

  @override
  String get scanEmptySectionFull =>
      'An empty section is a real answer. The test does not lower its bar to fill a page.';

  @override
  String get scanSectorBlurbFull =>
      'A sector read changes what gets investigated first. It scores nothing on the record and names nothing to act on.';

  @override
  String detailFirstSeen(String date) {
    return 'First seen · $date';
  }

  @override
  String get detailWhyScored => 'Why it scored what it scored';

  @override
  String get detailLastSession => 'Last completed session';

  @override
  String get detailMoveSince => 'Move since it was flagged';

  @override
  String get detailHowScored => 'How a name is scored';

  @override
  String detailOpenTicker(String ticker) {
    return 'Open $ticker';
  }

  @override
  String get homeFiledHero => 'Filed with the exchange';

  @override
  String get homeRoseAndFell => 'What rose and what fell';

  @override
  String get homeIndices => 'The indices';

  @override
  String get breadthUp => 'rose';

  @override
  String get breadthDown => 'fell';

  @override
  String get breadthFlat => 'unchanged';

  @override
  String breadthOf(int count) {
    return 'of $count shares';
  }

  @override
  String get breadthChartTitle => 'How the market split, session by session';

  @override
  String get breadthOneSession =>
      'One session recorded so far. The lines grow as each session is written down — there is no published breadth history to backfill from.';

  @override
  String get indexNoSeries =>
      'Levels are recorded one session at a time. No index series is published to backfill from.';

  @override
  String get ratesWorld => 'Was it Egypt, or everywhere?';

  @override
  String get ratesMetals => 'Gold and silver';

  @override
  String get ratesPound => 'The pound';

  @override
  String get ratesPerGram => 'per gram';

  @override
  String get ratesIndicesMovedHome => 'Index levels are on Home';
}
