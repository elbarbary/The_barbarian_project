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
  String get appTagline => 'Egyptian shares, in plain words';

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
      'When a company tells the exchange something, it appears here with what it means for anyone who owns the shares.';

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
  String get countOutcomes => 'Rule log';

  @override
  String get theSession => 'The day\'s trading';

  @override
  String get youSubtitle => 'No account needed to read';

  @override
  String get watchlist => 'Watchlist';

  @override
  String get watchlistPricesOnly =>
      'Prices only. No score and no opinion appears here — those live on the company page, which you open yourself.';

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
  String get homeAllFilings => 'All announcements';

  @override
  String homeFilingsCount(int count) {
    return '$count announcements today';
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
      'No company traded much more than usual on the day it announced something. A quiet day is a real answer.';

  @override
  String get homeLatestNews => 'Latest news';

  @override
  String get homeAllNews => 'All news';

  @override
  String homeVolumeKicker(String ratio) {
    return 'Traded $ratio× its usual volume';
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
  String get tabResearch => 'The file';

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
  String get thisSession => 'This day\'s trading';

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
  String get finStatements => 'The statements as filed';

  @override
  String get finAnnual => 'Annual';

  @override
  String get finQuarterly => 'Quarterly';

  @override
  String get finNetProfitLine => 'Net profit';

  @override
  String get finStatementsNote =>
      'Every period Mubasher publishes for this company, as filed. Scroll sideways for older periods.';

  @override
  String get finCashInvesting => 'Cash from investing';

  @override
  String get finCashFinancing => 'Cash from financing';

  @override
  String get finNetChangeCash => 'Net change in cash';

  @override
  String get finDividendsPaid => 'Dividends paid';

  @override
  String get finFiledDocuments => 'The filed documents';

  @override
  String get finOpenPdf => 'Open PDF';

  @override
  String get finNoDocuments => 'No document is attached to this filing.';

  @override
  String get exchangeSeeMore => 'See earlier filings';

  @override
  String exchangeShowingMonth(String month, int count) {
    return '$month · $count filings';
  }

  @override
  String get exchangeArchiveNote =>
      'Filings we have collected and kept. The exchange serves only its newest page, so anything older than that exists here because we saved it.';

  @override
  String filingOpenCompany(String ticker) {
    return 'Open $ticker';
  }

  @override
  String get filingReadFiling => 'Read the filing';

  @override
  String get companyFilings => 'Filed with the exchange';

  @override
  String companyFilingsBody(String ticker) {
    return 'Everything $ticker has told the exchange that we have kept, newest first.';
  }

  @override
  String get companyNoFilings => 'Nothing filed';

  @override
  String get companyNoFilingsBody =>
      'We have kept no filings from this company yet. The exchange serves only its newest page, so the record here starts when we started collecting.';

  @override
  String get unusualLabel => 'Busier than usual';

  @override
  String unusualBody(int count, int total) {
    return '$count of the $total announcements we hold came from a company whose shares changed hands far more than they normally do.';
  }

  @override
  String unusualTimes(String ratio) {
    return '$ratio× normal';
  }

  @override
  String get youNotAdvice =>
      'ESTHMR helps you understand the EGX. It does not decide what you should buy. Nothing here is investment advice.';

  @override
  String wiresBody(int count) {
    return '$count headlines from the Egyptian financial press, newest and most relevant first.';
  }

  @override
  String wiresBodyChecks(int count) {
    return '$count of them name a company whose shares changed hands far more than usual that day.';
  }

  @override
  String get exchangeSourceNote =>
      'Source: the Egyptian Exchange. Each row links to the filing itself.';

  @override
  String watchlistRemove(String ticker) {
    return 'Remove $ticker from watchlist';
  }

  @override
  String directorySearchBody(int count) {
    return 'Try a ticker, or the Arabic legal name. The directory covers $count companies.';
  }

  @override
  String get directoryNoQuote => 'no quote';

  @override
  String directoryShareOfListings(String percent) {
    return '$percent% of listings';
  }

  @override
  String get exitWaitNone => 'no published trading to measure';

  @override
  String get exitWaitDay => 'about a day to sell';

  @override
  String exitWaitSessions(int count) {
    return '$count sessions to sell';
  }

  @override
  String exitWaitYears(String years) {
    return '$years years of trading';
  }

  @override
  String exitWaitDecades(int years) {
    return 'over $years years of trading';
  }

  @override
  String get exitShareUnknown =>
      'There is not enough published trading to work this out.';

  @override
  String get exitShareWholeDay =>
      'More than a whole normal day of trading in this share.';

  @override
  String get exitShareUnderOne => 'Under 1% of a normal day’s trading.';

  @override
  String exitSharePercent(int percent) {
    return '$percent% of a normal day’s trading.';
  }

  @override
  String get exitNeedsBuyer =>
      'A share only sells when somebody else wants to buy it.';

  @override
  String get exitOneSession => 'About this much can leave in one session';

  @override
  String exitLastTraded(String date) {
    return 'Last session that traded: $date';
  }

  @override
  String exitNotEnough(String ticker) {
    return 'Not enough published trading for $ticker';
  }

  @override
  String exitNothingChanged(int days, int sessions) {
    return 'Nothing at all changed hands on $days of the last $sessions sessions. On those days there was no price at which a holder could sell.';
  }

  @override
  String get exitHowItWorks =>
      'On this exchange a share can move at most 20% up or down in a session. When a name falls to that lower limit the buyers stop appearing, and there is no price at which a holder can sell — because selling needs somebody on the other side.\n\nSome shares here do not trade on some days at all. Not “traded a little” — nothing changed hands. This shows how much of a normal day a given sum would be, and how many sessions it would take to leave without being most of the trading.';

  @override
  String get exitPastThat =>
      'Past that, selling is more than a fifth of a normal day here and starts to take more than one session. That figure is different for every company on this exchange.';

  @override
  String get exitAssumption =>
      'The sessions figure assumes no more than a fifth of a day’s trading. That is a stated assumption rather than a market rule — selling faster moves the price against the seller, which is the cost being measured.';

  @override
  String get exitNoHistoryBody =>
      'This needs a run of sessions with volume behind them and this listing does not have one yet. The absence is worth knowing on its own: a share with no published trading history is not one anybody can show an exit for.';

  @override
  String goldKaratGram(int karat) {
    return '$karat karat gold, a gram';
  }

  @override
  String goldPerOunce(String amount) {
    return 'EGP $amount / oz';
  }

  @override
  String get dotsLabel => 'What ties these together';

  @override
  String dotsBody(int days) {
    return 'Companies that turned up in more than one place in $days days.';
  }

  @override
  String get dotsFiling => 'Filing';

  @override
  String get dotsNews => 'In the press';

  @override
  String get dotsSession => 'That session';

  @override
  String dotsVolume(String ratio) {
    return '$ratio× normal volume';
  }

  @override
  String get filterTitle => 'Narrow the list';

  @override
  String get filterAdd => 'Add a filter';

  @override
  String get filterNone => 'No filters';

  @override
  String get filterClearAll => 'Clear all';

  @override
  String get filterApply => 'Show results';

  @override
  String get filterMarketCap => 'Market cap';

  @override
  String get filterPrice => 'Price';

  @override
  String get filterChange => 'Change today';

  @override
  String get filterVolume => 'Volume today';

  @override
  String get filterAvgVolume => 'Average volume';

  @override
  String get filterPe => 'P/E';

  @override
  String get filterAbove => 'more than';

  @override
  String get filterBelow => 'less than';

  @override
  String get filterBetween => 'between';

  @override
  String get filterUnitEgp => 'EGP';

  @override
  String get filterUnitPercent => '%';

  @override
  String get filterUnitShares => 'shares';

  @override
  String get filterUnitTimes => '×';

  @override
  String get filterAnd => 'and';

  @override
  String filterMatchCount(int count, int total) {
    return '$count of $total companies';
  }

  @override
  String get filterEps => 'EPS';

  @override
  String get filterProfit => 'Net profit';

  @override
  String get filterBusy => 'Relative volume';

  @override
  String get filterUnitMillions => 'million EGP';

  @override
  String get noteMarketCap =>
      'What the whole company is worth at today’s price — the share price times every share in existence. From this morning’s rebuild.';

  @override
  String get notePrice =>
      'The last price a share changed hands at. From the live feed, fifteen minutes behind at worst.';

  @override
  String get noteChange =>
      'How far the price has moved since yesterday’s close. From the live feed.';

  @override
  String get noteVolume =>
      'How many shares have changed hands today. From the live feed.';

  @override
  String get noteAvgVolume =>
      'How many shares change hands on an ordinary day, averaged over the last thirty. From this morning’s rebuild.';

  @override
  String get notePe =>
      'The price divided by what the company earned per share last year. A lower number means you are paying less for each pound of profit — it says nothing about whether the company is a good one. Absent for 121 of 280: a loss, nothing filed, or the figure did not check out.';

  @override
  String get noteEps =>
      'The company’s own filed annual profit divided by the number of its shares. A loss shows as a minus.';

  @override
  String get noteProfit =>
      'What the company filed as its profit for the year, in millions of pounds. Not per share — a big company can earn far more and still earn less per share.';

  @override
  String get noteBusy =>
      'Today’s trading against what this company trades on an ordinary day. 1 is a normal day; the filings feed points out anything above 2. Below 1 means quieter than usual.';

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
    return 'About $amount can leave in one session here. Above that, selling is more than a fifth of a normal day and starts to move the price against whoever is selling.';
  }

  @override
  String meansZeroDays(int days, int sessions) {
    return 'It did not trade at all on $days of the last $sessions sessions. On those days there was no price at which a holder could sell, because there was nobody on the other side.';
  }

  @override
  String meansNetProfit(String amount, String period) {
    return 'It reported $amount of net profit in $period.';
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
  String get homeFiledHero => 'Company announcements';

  @override
  String get homeRoseAndFell => 'What rose and what fell';

  @override
  String get homeIndices => 'How the whole market moved';

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

  @override
  String get ageJustNow => 'just now';

  @override
  String get ageToday => 'Today';

  @override
  String get ageYesterday => 'Yesterday';

  @override
  String ageMinutes(int count) {
    return '${count}m ago';
  }

  @override
  String ageHours(int count) {
    return '${count}h ago';
  }

  @override
  String ageDays(int count) {
    return '${count}d ago';
  }

  @override
  String get unusualVolume => 'Unusual volume';

  @override
  String get saved => 'Saved';

  @override
  String get loading => 'Loading';

  @override
  String get mainNavigation => 'Main navigation';

  @override
  String get priceLow => 'Low';

  @override
  String get priceHigh => 'High';

  @override
  String get priceOpen => 'Open';

  @override
  String get priceClose => 'Close';

  @override
  String get showMore => 'Show more';

  @override
  String showingCount(int shown, int total) {
    return 'Showing $shown of $total';
  }

  @override
  String get theWires => 'News';

  @override
  String get sortByScore => 'By score';

  @override
  String get sortMostRecent => 'Most recent';

  @override
  String get cotNoneYet => 'No investigations yet';

  @override
  String get cotNoMatch => 'Nothing matches that';

  @override
  String get readInvestigation => 'Read investigation';

  @override
  String get articleFailed => 'Could not open the investigation';

  @override
  String get exitHeadline =>
      'How much this share absorbs, and how long it takes to leave';

  @override
  String get exitIfYouPutIn => 'At this size';

  @override
  String get exitNumbersBehind => 'The numbers behind it';

  @override
  String get companyLabel => 'Company';

  @override
  String get explTraded => 'How much it traded';

  @override
  String get explFinished => 'Where it finished';

  @override
  String get explBuyable => 'How much of it can actually be bought';

  @override
  String get explValued => 'What the whole company is priced at';

  @override
  String get rubricFreshDisclosure => 'Fresh disclosure';

  @override
  String get rubricEconomicImportance => 'Economic importance';

  @override
  String get rubricVolumeConfirmation => 'Volume confirmation';

  @override
  String get rubricOwnershipCluster => 'Ownership cluster';

  @override
  String get rubricDatedCatalyst => 'Dated catalyst';

  @override
  String get rubricAntiChasing => 'Anti-chasing';

  @override
  String get rubricLimitUpPenalty => 'Limit-up penalty';

  @override
  String get rubricIssuerDenial => 'Issuer denial';

  @override
  String get rubricRiskPenalty => 'Risk penalty';

  @override
  String get ownersEquity => 'Owners\' equity';

  @override
  String get homeMacro => 'What moves Egypt';

  @override
  String get macroWhyItMatters => 'Why this reaches Egyptian shares';

  @override
  String get macroMovesWith => 'Moved with the EGX 30';

  @override
  String get macroWeakLink => 'Barely moves with the EGX 30 day to day';

  @override
  String get macroEgyptLine => 'Egypt\'s own line';

  @override
  String macroSessions(int count) {
    return 'over $count sessions';
  }

  @override
  String get macroUnavailable => 'Some sources could not be reached';

  @override
  String get macroCoverage => 'What is being reported';

  @override
  String get homeLeadStory => 'Today\'s story';

  @override
  String get feedNews => 'News';

  @override
  String get feedExchange => 'From the exchange';

  @override
  String get freshLoading => 'Prices loading';

  @override
  String get freshSample => 'Sample data · not real prices';

  @override
  String get freshLastClose => 'Closing prices';

  @override
  String get freshDuringSession => 'Prices from while trading was open';

  @override
  String freshOnDay(String state, String day) {
    return '$state · $day';
  }

  @override
  String get freshMarketClosed => 'Market closed · closing prices';

  @override
  String freshMarketClosedOn(String day) {
    return 'Market closed · prices from $day';
  }

  @override
  String freshDelayed(String delay, String since) {
    return '$delay behind the exchange · updated $since';
  }

  @override
  String freshDelayedShort(String delay) {
    return '$delay behind the exchange';
  }

  @override
  String freshDelaySeconds(int count) {
    return '$count sec';
  }

  @override
  String freshDelayMinutes(int count) {
    return '$count min';
  }

  @override
  String freshDelayHours(int count) {
    return '$count hr';
  }

  @override
  String get freshSinceJustNow => 'just now';

  @override
  String freshSinceMinutes(int count) {
    return '$count min ago';
  }

  @override
  String freshSinceHours(int count) {
    return '$count hr ago';
  }

  @override
  String freshSinceDays(int count) {
    return '$count days ago';
  }

  @override
  String youCompaniesCount(int count) {
    return '$count in the directory';
  }

  @override
  String youPricesLive(int delay, int refresh) {
    return '$delay minutes behind the exchange, refreshed every $refresh minutes. There is no live feed.';
  }

  @override
  String get youPricesClose => 'Closing prices only. There is no live feed.';

  @override
  String get unitBillionsEgp => 'billion EGP';

  @override
  String get unitMillionsEgp => 'million EGP';

  @override
  String get unitThousandsEgp => 'thousand EGP';

  @override
  String get unitEgp => 'EGP';

  @override
  String moneyWithUnit(String value, String unit) {
    return '$value $unit';
  }

  @override
  String finUnitPeriod(String unit, String period) {
    return '$unit · $period';
  }

  @override
  String finFiguresUnit(String unit) {
    return 'Unit: $unit';
  }

  @override
  String get pmToProfit => 'to a profit';

  @override
  String get pmToLoss => 'to a loss';

  @override
  String get pmUnchanged => 'unchanged';

  @override
  String get pmWiderLoss => 'wider loss';

  @override
  String get pmSmallerLoss => 'smaller loss';

  @override
  String pmMadeMoneyAfterBreakEven(String now, String prior) {
    return 'It made money in $now, after breaking even in $prior.';
  }

  @override
  String pmMadeMoneyAfterLoss(String now, String amount, String prior) {
    return 'It made money in $now, after losing $amount in $prior.';
  }

  @override
  String pmLostAfterProfit(String now, String amount, String prior) {
    return 'It lost money in $now, after making $amount in $prior.';
  }

  @override
  String pmLossSame(String prior, String amount) {
    return 'The loss was the same as in $prior, at $amount.';
  }

  @override
  String pmLossGrew(String from, String to, String prior) {
    return 'The loss grew, from $from to $to against $prior.';
  }

  @override
  String pmLossShrank(String from, String to, String prior) {
    return 'The loss shrank, from $from to $to against $prior.';
  }

  @override
  String pmProfitUnchanged(String prior, String amount) {
    return 'Profit was unchanged against $prior, at $amount.';
  }

  @override
  String pmTimesSentence(String times, String amount, String prior) {
    return 'That is $times times the $amount it reported in $prior.';
  }

  @override
  String pmRose(String prior, String amount) {
    return 'Profit rose against $prior, when it reported $amount.';
  }

  @override
  String pmFell(String prior, String amount) {
    return 'Profit fell against $prior, when it reported $amount.';
  }

  @override
  String get figSharesTradedToday => 'Shares traded today';

  @override
  String get perf1Week => '1 week';

  @override
  String get perf1Month => '1 month';

  @override
  String get perf3Months => '3 months';

  @override
  String get perf5Sessions => '5 sessions';

  @override
  String get finGroupBasis => 'Group';

  @override
  String periodQuarter1(String year) {
    return 'Q1 $year';
  }

  @override
  String periodQuarter2(String year) {
    return 'Q2 $year';
  }

  @override
  String periodQuarter3(String year) {
    return 'Q3 $year';
  }

  @override
  String periodQuarter4(String year) {
    return 'Q4 $year';
  }

  @override
  String periodHalf1(String year) {
    return 'H1 $year';
  }

  @override
  String periodHalf2(String year) {
    return 'H2 $year';
  }

  @override
  String periodFullYear(String year) {
    return 'FY $year';
  }

  @override
  String filedCountWithChecks(int total, int count) {
    return 'Company announcements: $total. Of the ones we could check, $count came from a company whose shares changed hands far more than usual.';
  }

  @override
  String filedCountNoChecks(int total) {
    return 'Company announcements: $total. None of the ones we could check came from a company whose shares changed hands far more than usual.';
  }

  @override
  String todayPutTogether(String date) {
    return 'Put together after trading closed on $date';
  }

  @override
  String updatedOn(String date) {
    return 'Updated · $date';
  }

  @override
  String get macroUnitUsdOunce => 'USD · an ounce';

  @override
  String get macroUnitUsdBarrel => 'USD · a barrel';

  @override
  String get macroUnitVessels => 'ships';

  @override
  String get macroUnitPercent => 'per cent';

  @override
  String get macroUnitUsdBillion => 'USD · billions';

  @override
  String get explainerHowWorkedOut => 'How it is worked out';

  @override
  String get explainerWhatCountsUnusual => 'What counts as unusual';

  @override
  String get studySumOfSix => 'Sum of the six';

  @override
  String get studyWhatWouldChange => 'What would change this';

  @override
  String get studyNoConditions =>
      'The published study does not yet name a filing that would move these pillars. Until it does, the reading below is a record of what the rule produced on its date and nothing more.';

  @override
  String get studyIndexNotOnDevice => 'The studies are not on the device yet';

  @override
  String get studyIndexNotOnDeviceBody =>
      'Open it once with a connection and it stays on the device.';

  @override
  String get studyAllBand => 'All';

  @override
  String get studyClearFilters => 'Clear filters';

  @override
  String get studyNoneInBand => 'No company has landed in that band yet.';

  @override
  String studyNoMatch(String query) {
    return 'No investigated company matches “$query”. Try a ticker, or clear the filter.';
  }

  @override
  String get studyOneAtATime =>
      'Companies appear here one at a time, after each has been read in full.';

  @override
  String get studyFullWriteUp => 'Full write-up in the criteria file';

  @override
  String studyScoreRange(int min, int max) {
    return 'Scores run from $min to +$max across six pillars: valuation, earnings quality, growth, balance sheet, tradability and governance.';
  }

  @override
  String exitNotDownloaded(String ticker) {
    return 'Nothing downloaded for $ticker yet';
  }

  @override
  String get exitNotDownloadedBody =>
      'Open this once with a connection and it stays on the device.';

  @override
  String get exitThinSessions => 'Sessions under 1,000 shares';

  @override
  String get exitFreeToTrade => 'Shares free to trade';

  @override
  String get exitDailyLimit => 'Daily price limit';

  @override
  String get exitDailyLimitValue => '±20%, set by the exchange';

  @override
  String get directoryNotOnDevice =>
      'The company directory is not on the device yet';

  @override
  String get directoryNotOnDeviceBody =>
      'Open the app once with a connection and the whole directory stays available offline.';

  @override
  String get directorySectors => 'Sectors';

  @override
  String get pitSource => 'Source';

  @override
  String get pitSourceBody => 'A disclosure, posted straight from the record';

  @override
  String get pitNoCalls =>
      'No buy or sell calls, no price targets, no performance leaderboards.';

  @override
  String get articleNeedsConnection =>
      'The full write-up lives on thebarbarianproject.com and needs a connection. Everything already downloaded is still available offline.';

  @override
  String get articleGoBack => 'Go back';

  @override
  String get priceNoHistory => 'No price history for this company yet';

  @override
  String priceSessionRange(int count) {
    return '$count-session range';
  }

  @override
  String priceSessionsTo(int count, String date) {
    return '$count sessions · to $date';
  }

  @override
  String get scanPositionWithheld =>
      'The report\'s note on this name describes a model position — a size and a price. ESTHMR is not licensed to republish that, so the score and the evidence are here and the position is not.';

  @override
  String newsSourcedFrom(String outlets) {
    return 'Headlines from $outlets, each linked to the outlet that ran it.';
  }

  @override
  String newsMergedCount(int count) {
    return '$count duplicates merged.';
  }

  @override
  String newsWithheldCount(int count) {
    return '$count withheld for carrying a recommendation.';
  }

  @override
  String newsUnreachable(String outlets) {
    return 'Not reachable today: $outlets.';
  }

  @override
  String cotInvestigatedCount(int studied, int total) {
    return '$studied of $total investigated';
  }

  @override
  String get pitWhatItIs =>
      'The Pit is where the evidence gets argued over. Companies, filings and the research behind them — discussed by people reading the same numbers.\n\nEverything else in the app works without it, and will keep working if it ever goes down.';

  @override
  String a11yBreadthOneSession(int up, int down, int flat) {
    return 'One session: $up rose, $down fell, $flat unchanged';
  }

  @override
  String a11yBreadthSessions(int count) {
    return '$count sessions of market breadth';
  }

  @override
  String a11yTrendRising(int count) {
    return '$count-session trend, rising';
  }

  @override
  String a11yTrendFalling(int count) {
    return '$count-session trend, falling';
  }

  @override
  String a11yVerdictWithScore(String sentence, int score, int max) {
    return '$sentence The six sum to $score out of $max.';
  }

  @override
  String a11yExplainerHint(String title, String plain, String token) {
    return '$title. $plain $token. Press for the arithmetic.';
  }

  @override
  String a11ySessionUnchanged(String date) {
    return '$date: unchanged';
  }

  @override
  String a11ySessionUp(String date, String percent) {
    return '$date: up $percent per cent';
  }

  @override
  String a11ySessionDown(String date, String percent) {
    return '$date: down $percent per cent';
  }

  @override
  String a11yPriceHistory(
    int count,
    String first,
    String last,
    String low,
    String high,
  ) {
    return 'Price history, $count sessions, from $first to $last, low $low, high $high';
  }

  @override
  String a11yRangeGauge(String caption, String value, String low, String high) {
    return '$caption: $value, range $low to $high';
  }

  @override
  String get youTitle => 'You';

  @override
  String get sortAlphabetical => 'A–Z';

  @override
  String get sortGainers => 'Risers';

  @override
  String get sortLosers => 'Fallers';

  @override
  String get sortMostActive => 'Most traded';

  @override
  String directoryCompaniesSorted(String order) {
    return 'Companies · $order';
  }

  @override
  String get newsReadStory => 'Read the story';

  @override
  String get newsSourceHeader => 'Source';

  @override
  String get filingReaderHeader => 'EGX filing';

  @override
  String get companyInThePress => 'In the press';

  @override
  String companyInThePressBody(String ticker) {
    return 'Stories that named $ticker, from the outlets we read. Their reporting, on their pages.';
  }

  @override
  String get homeWhichCompanies => 'Busiest against their own normal';

  @override
  String get volumeTeaching =>
      '“Traded unusually” means one thing here: the company\'s shares changed hands at least twice as often as they normally do. That is a question worth asking, not a verdict — busy days happen for good reasons and bad ones alike.';

  @override
  String get volumeTeachingTitle => 'What “traded unusually” means';

  @override
  String get volumeTeachingWorkings =>
      'Shares traded in the session ÷ the median of the last 20 sessions. At 2.0 or above, this app says the day was unusual.';

  @override
  String get volumeTeachingYardstick =>
      'Twice the usual is the line, and it is this app\'s line rather than the exchange\'s — nobody publishes an official one. It is set where it is because a day at twice a company\'s normal volume is uncommon enough to be worth a look and common enough to happen without anything being wrong.';

  @override
  String get learnMore => 'What does this mean?';

  @override
  String goldKaratPlain(int karat, String price) {
    return 'A gram of $karat-karat gold costs $price pounds.';
  }

  @override
  String goldKaratYardstick(int karat) {
    return '$karat parts gold in every 24. Most Egyptian jewellery is 21. The metal is the same price either way; the karat is how much of it is in the piece.';
  }

  @override
  String ratesPerGramEgp(String per) {
    return 'EGP · $per';
  }

  @override
  String get exitNormalDay => 'A normal day’s trading';

  @override
  String get exitNotPublished => 'not published';

  @override
  String exitFloatRest(String percent) {
    return '$percent% — the rest do not move';
  }

  @override
  String get exitSearchHint => 'Check a company by name or symbol…';

  @override
  String get studySearchHint => 'Search ticker or company';

  @override
  String get sectorFinance => 'Finance';

  @override
  String get sectorProcessIndustries => 'Process Industries';

  @override
  String get sectorNonEnergyMinerals => 'Non-Energy Minerals';

  @override
  String get sectorConsumerNonDurables => 'Consumer Non-Durables';

  @override
  String get sectorConsumerServices => 'Consumer Services';

  @override
  String get sectorIndustrialServices => 'Industrial Services';

  @override
  String get sectorHealthTechnology => 'Health Technology';

  @override
  String get sectorProducerManufacturing => 'Producer Manufacturing';

  @override
  String get sectorDistributionServices => 'Distribution Services';

  @override
  String get sectorHealthServices => 'Health Services';

  @override
  String get sectorTechnologyServices => 'Technology Services';

  @override
  String get sectorConsumerDurables => 'Consumer Durables';

  @override
  String get sectorRetailTrade => 'Retail Trade';

  @override
  String get sectorTransportation => 'Transportation';

  @override
  String get sectorCommercialServices => 'Commercial Services';

  @override
  String get sectorUtilities => 'Utilities';

  @override
  String get sectorCommunications => 'Communications';

  @override
  String get sectorEnergyMinerals => 'Energy Minerals';

  @override
  String get sectorElectronicTechnology => 'Electronic Technology';

  @override
  String get sectorMiscellaneous => 'Miscellaneous';

  @override
  String scanScoreOf(String status, int max) {
    return '$status · of $max';
  }

  @override
  String scanScoreSpoken(int score, int max, String status) {
    return '$score of $max, $status';
  }

  @override
  String get expRvTitle => 'How much it traded';

  @override
  String get expRvNoTrade => 'It did not trade at all.';

  @override
  String get expRvExact => 'Traded exactly its normal amount.';

  @override
  String expRvMore(int pct) {
    return 'Traded $pct% more than its normal amount.';
  }

  @override
  String expRvLess(int pct) {
    return 'Traded $pct% less than its normal amount.';
  }

  @override
  String expRvToken(String ratio) {
    return '$ratio× normal';
  }

  @override
  String expRvWorkings(String volume, String median, String ratio) {
    return '$volume shares traded\n÷ $median — the middle session of the last 20\n= $ratio';
  }

  @override
  String get expRvYardstickNoTrade =>
      'Nothing changed hands. There was no price at which a holder could sell, because selling needs somebody on the other side.';

  @override
  String get expRvYardstick =>
      'Below 1 is quieter than usual. Above 2 is unusual and worth reading the filings for.';

  @override
  String get expRvCaveat =>
      'The comparison is against the middle session of the last twenty, not the average. A holiday week or a trading halt moves it.';

  @override
  String get expCloseTitle => 'Where it finished';

  @override
  String get expCloseUpper =>
      'Finished in the upper half of the day it traded in.';

  @override
  String get expCloseLower =>
      'Finished in the lower half of the day it traded in.';

  @override
  String expCloseToken(int pct) {
    return '$pct% of the day’s range';
  }

  @override
  String expCloseWorkings(String close, String low, String high, int pct) {
    return 'Closed at $close\n− the day’s low $low\n÷ (high $high − low $low)\n= $pct%';
  }

  @override
  String get expCloseYardstick =>
      '100% means it closed at the very top of its range, 0% at the very bottom. One session on its own says little.';

  @override
  String get expFloatTitle => 'How much of it can actually be bought';

  @override
  String expFloatPlain(int count) {
    return 'Only $count shares in every 100 actually trade.';
  }

  @override
  String expFloatToken(String pct) {
    return '$pct% free float';
  }

  @override
  String expFloatWorkingsShort(String pct) {
    return '$pct% of the shares are free to trade.';
  }

  @override
  String expFloatWorkingsHead(String shares) {
    return '$shares shares are free to trade';
  }

  @override
  String expFloatWorkingsDiv(String shares) {
    return '÷ $shares shares in issue';
  }

  @override
  String expFloatWorkingsSum(String pct) {
    return '= $pct%';
  }

  @override
  String get expFloatYardstick =>
      'The rest sit with owners who do not sell. A small float means the price moves further on the same order — in both directions — and that selling in size can take days.';

  @override
  String get expFloatSource => 'Ownership table, most recent filing';

  @override
  String get expFloatCaveat =>
      'A market value calculated on all the shares is not what the company would fetch when only a fraction of them trade.';

  @override
  String get expCapTitle => 'What the whole company is priced at';

  @override
  String expCapPlainBillions(String value) {
    return 'The whole company is priced at $value billion pounds.';
  }

  @override
  String expCapPlainMillions(String value) {
    return 'The whole company is priced at $value million pounds.';
  }

  @override
  String expCapWorkings(String shares, String price, String cap) {
    return '$shares shares in issue\n× EGP $price a share\n= EGP $cap';
  }

  @override
  String get expCapYardstick =>
      'This is what the market is charging for the company today, not a measure of what it owns or earns.';

  @override
  String get expCapSource =>
      'Shares in issue from the latest filing, price from the close';

  @override
  String get expCapCaveat =>
      'It multiplies every share by the last traded price, including the shares that never trade.';

  @override
  String expMoveHigher(String pct, String window) {
    return 'Priced $pct% higher than it was $window ago.';
  }

  @override
  String expMoveLower(String pct, String window) {
    return 'Priced $pct% lower than it was $window ago.';
  }

  @override
  String expMoveWorkings(String window) {
    return 'The closing price now, against the closing price $window ago, as a percentage of the older one.';
  }

  @override
  String get expMoveYardstick =>
      'A move on its own says what happened, not why. The reason — if one was published — is in the filings and the study.';

  @override
  String get expSourceSession => 'EGX session data';

  @override
  String expSourceSessionOn(String date) {
    return 'EGX session data, $date';
  }

  @override
  String get expSourceCloses => 'EGX closing prices';

  @override
  String expSourceClosesOn(String date) {
    return 'EGX closing prices, $date';
  }

  @override
  String get notabilityOrdinary => 'Ordinary';

  @override
  String get notabilityUnusual => 'Unusual';

  @override
  String get notabilityUnjudged => 'No published threshold';

  @override
  String get provenanceFact => 'Fact';

  @override
  String get provenanceCalculation => 'Calculation';

  @override
  String get provenanceInterpretation => 'Interpretation';

  @override
  String get dotsWhatTheyShare => 'What they share';

  @override
  String busyBody(int count) {
    return '$count traded at least twice their usual volume today.';
  }

  @override
  String get busyNone =>
      'No company traded far outside its own normal today. A quiet day is a real answer.';

  @override
  String get busyFiledToo => 'Announced something';

  @override
  String busyFloorNote(String amount) {
    return 'Sessions worth under $amount are left out.';
  }

  @override
  String get homeSearchHint => 'Search a company, or a symbol';

  @override
  String homeSearchNone(String query) {
    return 'Nothing matches “$query”';
  }

  @override
  String homeSearchMore(int count) {
    return 'See all $count results';
  }

  @override
  String get volumeTeachingShort =>
      'Unusual volume is a question, not a verdict.';

  @override
  String get heroLabel => 'The exchange today';

  @override
  String heroBreadth(int up, int flat, int down) {
    return '$up rose · $flat unchanged · $down fell';
  }

  @override
  String heroOf(int count) {
    return 'of $count shares';
  }

  @override
  String get volumeTeachingFloor =>
      'A session worth very little is left off the list however large the multiple is. Today the raw ranking opens with a company that traded 567 shares against a usual four — 141 times its normal, and 708,750 pounds. A multiple of a very small number is arithmetic, not news.';

  @override
  String get dotsExplainerTitle => 'Crossings';

  @override
  String get dotsExplainerPlain =>
      'One company turning up in more than one place at once.';

  @override
  String dotsExplainerWorkings(int days) {
    return 'Three feeds are read for the same $days days: what the exchange published, what the press wrote, and what the shares did. A company is listed here when at least two of them carry it. Nothing on the card is new — every thread links back to the document it came from.';
  }

  @override
  String get dotsExplainerYardstick =>
      'Two threads is common. Three — a filing, a story and a session outside its own normal — happens to a handful of companies a week. A crossing is a question, not a verdict: it says a company was busy in more than one way, and nothing about whether that was good.';

  @override
  String dotsThreads(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count threads',
      one: '1 thread',
    );
    return '$_temp0';
  }

  @override
  String get exchangeIndicesLabel => 'The three indices';

  @override
  String exchangeRecorded(int count, String date) {
    return '$count sessions recorded, since $date';
  }

  @override
  String get exchangeWindowMove => 'over that stretch';

  @override
  String get exchangeMoversLabel => 'What rose and what fell';

  @override
  String exchangeMoversBody(int count) {
    return 'The session\'s biggest moves, from the $count shares that traded enough to count.';
  }

  @override
  String get exchangeBreadthLabel => 'How wide each session was';

  @override
  String get exchangeBreadthBody =>
      'Rose, fell and unchanged, across every session this app has recorded.';

  @override
  String exchangeRoseMore(int rose, int total) {
    return 'More shares rose than fell in $rose of those $total sessions.';
  }

  @override
  String get exchangeOneSession =>
      'One session recorded so far. The lines start here.';

  @override
  String get legendRose => 'Rose';

  @override
  String get legendFell => 'Fell';

  @override
  String get legendUnchanged => 'Unchanged';

  @override
  String get priceLatestSessionOnly =>
      'Latest session only — no series published for this listing';

  @override
  String directoryAllCount(int count) {
    return 'All $count';
  }

  @override
  String get navCalendar => 'Calendar';

  @override
  String get calendarTitle => 'Dates the filings put on the record';

  @override
  String get calViewDay => 'Day';

  @override
  String get calViewWeek => 'Week';

  @override
  String get calViewMonth => 'Month';

  @override
  String get calNothingDay => 'Nothing scheduled for this day.';

  @override
  String get calNothingRange => 'Nothing scheduled in this stretch.';

  @override
  String get calUpcoming => 'Next up';

  @override
  String get calToday => 'Today';

  @override
  String calAnnounced(String date) {
    return 'announced $date';
  }

  @override
  String calInDays(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'in $days days',
      one: 'tomorrow',
      zero: 'today',
    );
    return '$_temp0';
  }

  @override
  String calAgoDays(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: '$days days ago',
      one: 'yesterday',
    );
    return '$_temp0';
  }

  @override
  String get calExplainerTitle => 'Where these dates come from';

  @override
  String get calExplainerPlain =>
      'Dates a company already filed — not a forecast.';

  @override
  String get calExplainerBody =>
      'Companies file dividend dates, rights-issue windows, meeting dates and trading notices days to weeks ahead of the event. This reads those dates out of the filings and lays them on a calendar. Every entry links back to the filing it came from; nothing here is predicted.';

  @override
  String get calKindDividendPayment => 'Dividend paid';

  @override
  String get calKindExDividend => 'Ex-dividend';

  @override
  String get calKindRightsOpen => 'Rights issue opens';

  @override
  String get calKindRightsClose => 'Rights issue closes';

  @override
  String get calKindRightsEntitlement => 'Rights entitlement cutoff';

  @override
  String get calKindAssemblyAgm => 'Annual general assembly';

  @override
  String get calKindAssemblyEgm => 'Extraordinary assembly';

  @override
  String get calKindTradingResume => 'Trading resumes';

  @override
  String get calKindTradingSuspend => 'Trading suspended';

  @override
  String get calKindListingEffective => 'Listing change';

  @override
  String get calKindOther => 'Scheduled event';

  @override
  String get calFamilyCash => 'Cash';

  @override
  String get calFamilyRights => 'Rights';

  @override
  String get calFamilyAssembly => 'Meeting';

  @override
  String get calFamilyTrading => 'Trading';

  @override
  String get calFamilyOther => 'Other';

  @override
  String get briefHistoryLabel => 'What this company has done';

  @override
  String get briefPlansLabel => 'What it has said it will do';

  @override
  String get briefRecordLabel => 'The record, in counts';

  @override
  String get briefSourceNote =>
      'Read from this company\'s own filings. Every plan links to the filing that announced it.';

  @override
  String get briefNoVerdict =>
      'No view on whether any of this is good — that would be advice, and we are not licensed to give it.';

  @override
  String get briefOpenFiling => 'Open the filing';

  @override
  String briefRecFilings(int count) {
    return '$count filings lodged';
  }

  @override
  String briefRecSince(String date) {
    return 'since $date';
  }

  @override
  String briefRecSuspensions(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'suspended from trading $count times',
      one: 'suspended from trading once',
      zero: 'never suspended from trading',
    );
    return '$_temp0';
  }

  @override
  String briefRecCapital(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count capital increases',
      one: 'one capital increase',
      zero: 'no capital increases',
    );
    return '$_temp0';
  }

  @override
  String briefRecLosses(int count, int total) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count loss-making periods',
      one: 'one loss-making period',
      zero: 'no loss-making period reported',
    );
    return '$_temp0 of $total reported';
  }

  @override
  String filingsAllOf(int shown, int total) {
    return 'Showing $shown of $total';
  }
}
