// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appName => 'استثمر';

  @override
  String get appTagline => 'الأسهم المصرية، بكلام واضح';

  @override
  String get navHome => 'الرئيسية';

  @override
  String get navToday => 'اليوم';

  @override
  String get navPit => 'النقاش';

  @override
  String get navYou => 'حسابك';

  @override
  String get searchPlaceholder => 'ابحث باسم الشركة أو الرمز…';

  @override
  String oldestThingHere(String age) {
    return 'أقدم ما تراه هنا: $age';
  }

  @override
  String get refresh => 'تحديث';

  @override
  String homeTodayKicker(String event) {
    return 'اليوم · $event';
  }

  @override
  String get homeNothingFiled => 'لا توجد إفصاحات اليوم';

  @override
  String get homeNothingFiledBody =>
      'عندما تُبلغ شركة البورصة بشيء، يظهر هنا مع شرح لما يعنيه لمن يملك السهم.';

  @override
  String get homeWatchlistLabel => 'من قائمة متابعتك';

  @override
  String get homeWatchlistManage => 'إدارة';

  @override
  String get homeWatchlistEmpty => 'تابع شركات لتكوين قائمتك';

  @override
  String get homeWatchlistEmptyBody =>
      'افتح أي شركة واضغط على علامة الحفظ. ما تتابعه يظهر هنا بآخر سعر له، ولا شيء غير ذلك.';

  @override
  String get homePricesCaption => 'آخر إغلاق · بيانات البورصة في نهاية الجلسة';

  @override
  String get noQuote => 'لا يوجد سعر';

  @override
  String get financialsTitle => 'صافي الربح، كما أُعلن';

  @override
  String financialsUnitPeriod(String period) {
    return 'مليون جنيه · $period';
  }

  @override
  String get financialsNone => 'لا توجد أرقام معلنة بعد';

  @override
  String get financialsNoneBody =>
      'تُقرأ الأرقام من القوائم المالية التي تودعها كل شركة ومن النتائج التي تعلنها للبورصة. لم يُقرأ شيء لهذه الشركة بعد.';

  @override
  String get financialsLatestFiling => 'آخر إفصاح';

  @override
  String get financialsReadFiling => 'اقرأ الإفصاح';

  @override
  String get financialsByYear => 'صافي الربح سنويًا';

  @override
  String get financialsTotalAssets => 'إجمالي الأصول';

  @override
  String get financialsEquity => 'حقوق الملكية';

  @override
  String get financialsLiabilities => 'إجمالي الالتزامات';

  @override
  String get financialsOperatingCash => 'التدفق النقدي التشغيلي';

  @override
  String get financialsBasisGroup => 'مجمعة';

  @override
  String get financialsBasisCompany => 'مستقلة';

  @override
  String financialsFootnote(String source) {
    return 'الأرقام بملايين الجنيهات كما أُودعت. لا يذكر أي من المصدرين الإيرادات، لذلك لا تُعرض الهوامش بدلًا من تقديرها. المصدر: $source.';
  }

  @override
  String get sourceExchange => 'البورصة المصرية';

  @override
  String get sourceFiledAccounts => 'القوائم المالية المودعة';

  @override
  String get language => 'اللغة';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageArabic => 'العربية';

  @override
  String get languageSystem => 'لغة الجهاز';

  @override
  String get legalNotLicensed =>
      'استثمر جهة نشر وغير مرخّصة من الهيئة العامة للرقابة المالية. نحن لا نشتري، ولا نبيع، ولا نقدم نصيحة. لا شيء هنا توصية بالتعامل على أي ورقة مالية.';

  @override
  String get scannerTitle => 'الماسح';

  @override
  String get scannerSubtitle => 'ما وجدته القاعدة المنشورة، وما فاتها';

  @override
  String get scannerOpen => 'افتح الماسح';

  @override
  String get scannerNotDownloaded => 'لم يُنزَّل تقرير الماسح بعد';

  @override
  String get scannerNotDownloadedBody =>
      'افتح التطبيق ومعك اتصال لتنزيل أحدث تقرير.';

  @override
  String get scannerNotPublished => 'لم يصدر التقرير بعد';

  @override
  String get scannerFoundToday => 'ما وجدته القاعدة المنشورة اليوم';

  @override
  String get countQualified => 'استوفت كل القواعد';

  @override
  String get countWatching => 'استوفت بعض القواعد';

  @override
  String get countOutcomes => 'سجل القواعد';

  @override
  String get theSession => 'تداول اليوم';

  @override
  String get youSubtitle => 'لا حاجة لحساب للقراءة';

  @override
  String get watchlist => 'قائمة المتابعة';

  @override
  String get watchlistPricesOnly =>
      'أسعار فقط. لا درجة ولا رأي يظهر هنا — تلك في صفحة الشركة، التي تفتحها بنفسك.';

  @override
  String get watchlistEmpty => 'قائمة المتابعة فارغة';

  @override
  String get watchlistEmptyBody =>
      'تابع شركة ليظهر هنا سعرها وإفصاحاتها وأبحاثها.';

  @override
  String get browseCompanies => 'تصفح الشركات';

  @override
  String get appearance => 'المظهر';

  @override
  String get followTheSystem => 'حسب إعداد الجهاز';

  @override
  String get themeLight => 'فاتح';

  @override
  String get themeDark => 'داكن';

  @override
  String get aboutTheData => 'عن البيانات';

  @override
  String get marketData => 'بيانات السوق';

  @override
  String get notDownloaded => 'غير مُنزَّلة';

  @override
  String get companies => 'الشركات';

  @override
  String get prices => 'الأسعار';

  @override
  String get noRealTimeFeed => 'آخر إغلاق فقط. لا يوجد بث لحظي.';

  @override
  String get mostActive => 'الأكثر نشاطًا';

  @override
  String get fullDirectory => 'الدليل الكامل';

  @override
  String get searchCompanies => 'ابحث عن شركة أو رمز…';

  @override
  String get directoryMissing => 'دليل الشركات غير موجود على الجهاز بعد';

  @override
  String get researched => 'مدروسة';

  @override
  String get noCompanyMatches => 'لا توجد شركة مقيدة تطابق ذلك';

  @override
  String get clearSearch => 'امسح البحث';

  @override
  String get noMarketData => 'لم تُنزَّل بيانات السوق بعد';

  @override
  String get pitTitle => 'نقاش، بالأدلة';

  @override
  String get pitComingSoon => 'قادم في المرحلة التالية من التطوير';

  @override
  String get pitWhatItCarries => 'ما سيحتويه';

  @override
  String get pitDiscussion => 'نقاش';

  @override
  String get pitDiscussionBody => 'حوار مفتوح حول شركة';

  @override
  String get pitQuestion => 'سؤال';

  @override
  String get pitQuestionBody => 'اسأل من يقرأون الإفصاح نفسه';

  @override
  String get pitResearchNote => 'مذكرة بحثية';

  @override
  String get pitResearchNoteBody => 'عملك أنت، ومعه المصادر';

  @override
  String get couldNotLoad => 'تعذّر التحميل';

  @override
  String get couldNotLoadBody =>
      'قد تكون غير متصل. كل ما نُزِّل من قبل ما زال هنا.';

  @override
  String get tryAgain => 'أعد المحاولة';

  @override
  String get sampleData => 'بيانات تجريبية · ليست أسعارًا حية';

  @override
  String get homeAlsoFiled => 'مُودَع لدى البورصة';

  @override
  String get homeAllFilings => 'كل الإعلانات';

  @override
  String homeFilingsCount(int count) {
    return '$count إعلان اليوم';
  }

  @override
  String get legalNotLicensedShort =>
      'غير مرخّصة من الرقابة المالية. ليست توصية.';

  @override
  String get homeImportantToday => 'الأهم اليوم';

  @override
  String get homeNothingUnusual => 'لا شيء غير معتاد اليوم';

  @override
  String get homeNothingUnusualBody =>
      'لم تتداول أي شركة أكثر من المعتاد بكثير يوم إعلانها. واليوم الهادئ إجابة حقيقية.';

  @override
  String get homeLatestNews => 'آخر الأخبار';

  @override
  String get homeAllNews => 'كل الأخبار';

  @override
  String homeVolumeKicker(String ratio) {
    return 'تداول $ratio× حجمه المعتاد';
  }

  @override
  String get homeFiledToday => 'أُفصح عنه اليوم';

  @override
  String get tabOverview => 'نظرة عامة';

  @override
  String get tabFinancials => 'القوائم المالية';

  @override
  String get tabPrice => 'السعر';

  @override
  String get tabResearch => 'الملف';

  @override
  String get tabTalk => 'نقاش';

  @override
  String companyNotOnDevice(String ticker) {
    return '$ticker غير موجودة على الجهاز';
  }

  @override
  String get companyNotOnDeviceBody =>
      'افتح هذه الشركة مرة ومعك اتصال لتبقى متاحة دون إنترنت.';

  @override
  String get discussionArrives => 'النقاش يأتي مع قسم النقاش';

  @override
  String get discussionArrivesBody =>
      'تظهر هنا نقاشات الشركة عند تفعيل خدمة المجتمع. كل شيء آخر في هذه الشاشة يعمل بدونها.';

  @override
  String get back => 'رجوع';

  @override
  String followTicker(String ticker) {
    return 'تابع $ticker';
  }

  @override
  String followingTicker(String ticker) {
    return 'تتابع $ticker. اضغط لإلغاء المتابعة.';
  }

  @override
  String get prevClose => 'الإغلاق السابق';

  @override
  String get volume => 'حجم التداول';

  @override
  String get marketCap => 'القيمة السوقية';

  @override
  String get dayHigh => 'أعلى سعر';

  @override
  String get dayLow => 'أدنى سعر';

  @override
  String get previousClose => 'الإغلاق السابق';

  @override
  String get avgVolume30d => 'متوسط الحجم ٣٠ يومًا';

  @override
  String get sharesOutstanding => 'الأسهم المصدرة';

  @override
  String get floatShares => 'الأسهم الحرة';

  @override
  String get sector => 'القطاع';

  @override
  String get movedThisMonth => 'كيف تحرّك هذا الشهر';

  @override
  String get whatNumbersSay => 'ما تقوله الأرقام';

  @override
  String get whatThatMeans => 'ماذا يعني ذلك';

  @override
  String get thisSession => 'تداول هذا اليوم';

  @override
  String get performance => 'الأداء';

  @override
  String get sizeAndOwnership => 'الشركة';

  @override
  String get noDetailYet => 'لا توجد تفاصيل لهذه الشركة بعد';

  @override
  String get noPriceHistory => 'لا يوجد تاريخ أسعار لهذه الشركة';

  @override
  String get noSessionsInRange => 'لا توجد جلسات في هذه الفترة';

  @override
  String get noStudyYet => 'لم تُنشر دراسة عن هذه الشركة بعد';

  @override
  String get noStudyYetBody =>
      'تُدرس الشركات واحدة تلو الأخرى. عندما تُقرأ هذه، تظهر الدراسة هنا.';

  @override
  String get readFullInvestigation => 'اقرأ الدراسة كاملة';

  @override
  String get scannerHistory => 'سجل الماسح';

  @override
  String get studyLabel => 'الركائز الست';

  @override
  String lastSessions(int count) {
    return 'آخر $count جلسة';
  }

  @override
  String get canIGetOut => 'أقدر أخرج؟';

  @override
  String get itStopsTrading => 'يتوقف عن التداول';

  @override
  String get scanNoReport => 'لم يُنزَّل تقرير الماسح بعد';

  @override
  String get scanNoReportBody =>
      'يُنشر الماسح بعد كل جلسة. افتح هذا مرة ومعك اتصال ليبقى على الجهاز.';

  @override
  String get scanNotRunToday => 'لم يعمل الماسح اليوم';

  @override
  String get scanNotRunTodayBody =>
      'لم يستوفِ شيء الاختبار منذ الجلسة الماضية. هذه نتيجة، وليست خطأ.';

  @override
  String get scanReportDateUnknown => 'تاريخ التقرير غير معروف';

  @override
  String get scanQualifiedBlurb =>
      'استوفت كل القواعد. استيفاء قاعدة حقيقة عن القاعدة، وليس رأيًا في الشركة.';

  @override
  String get scanWatchingBlurb =>
      'استوفت بعض القواعد دون غيرها. نقص الأدلة وصف لاختبارنا، لا وصف للسهم.';

  @override
  String get scanRejectedBlurb =>
      'لم تستوفِ القواعد، وسُجّلت لتبقى نتيجة الاختبار قابلة للمراجعة.';

  @override
  String get scanLogEmpty => 'سجل القواعد فارغ';

  @override
  String get scanNothingQualified => 'لم تستوفِ أي شركة كل القواعد اليوم';

  @override
  String get scanNothingWatch => 'لا شيء تحت المتابعة';

  @override
  String get scanNothingRejected => 'لم تسقط أي شركة في القواعد اليوم';

  @override
  String get scanEmptyBlurb =>
      'القسم الفارغ إجابة حقيقية. الاختبار لا يخفّض معاييره ليملأ شاشة.';

  @override
  String get coverage => 'التغطية';

  @override
  String get coverageTradable => 'قابلة للتداول';

  @override
  String get coverageListed => 'مقيدة';

  @override
  String get coverageAdjusted => 'معدّلة';

  @override
  String get coverageBlurb =>
      'تُقرأ كل شركة مقيدة. معظمها لا يستوفي، وما لا يستوفي يُنشر أيضًا.';

  @override
  String get catalyst => 'المحفّز';

  @override
  String get fullRecord => 'السجل الكامل';

  @override
  String get sourcesLabel => 'المصادر';

  @override
  String get evidenceLabel => 'الأدلة';

  @override
  String get whatWasChecked => 'ما جرى فحصه';

  @override
  String get gatePassed => 'استوفى';

  @override
  String get gateFailed => 'لم يستوفِ';

  @override
  String get gateUnresolved => 'غير محسوم';

  @override
  String get scannerTitleFull => 'الماسح';

  @override
  String scanUpdated(String date) {
    return 'حُدِّث · $date';
  }

  @override
  String scanQualifiedCount(int count) {
    return 'استوفت الكل $count';
  }

  @override
  String scanWatchCount(int count) {
    return 'جزئيًا $count';
  }

  @override
  String scanRejectedCount(int count) {
    return 'لم تستوفِ $count';
  }

  @override
  String scanLogCount(int count) {
    return 'سجل القواعد $count';
  }

  @override
  String get scanLogBlurb =>
      'ما قالته القاعدة المنشورة، وما فعله السوق بعدها، وما غُيّر في القاعدة لاحقًا. هذه مراجعة للمنهج، وليست لوحة نتائج: لا يوجد مجموع هنا ولن يوجد.';

  @override
  String get scanLogEmptyBody =>
      'تظهر السجلات هنا مع قياس كل قاعدة منشورة على ما حدث بعدها.';

  @override
  String get scanNotRepublished => 'غير مُعاد نشره';

  @override
  String get scanNoComponent => 'لم يُسجَّل أي بند من بنود المعايير.';

  @override
  String get scanStocks => 'أسهم';

  @override
  String get scanScoredNames => 'أسماء مُقيَّمة';

  @override
  String get scanSectorNone => 'لا شيء اليوم';

  @override
  String get scanOneCohort => 'مجموعة واحدة';

  @override
  String get scanHowItWasRead => 'كيف قُرئت';

  @override
  String get scanNoSectorToday => 'لا قراءة قطاعية اليوم';

  @override
  String get statusQualified => 'استوفت كل القواعد';

  @override
  String get statusWatching => 'استوفت بعض القواعد';

  @override
  String get statusRejected => 'لم تستوفِ القواعد';

  @override
  String get figPrevClose => 'الإغلاق السابق';

  @override
  String get figDayHigh => 'أعلى سعر';

  @override
  String get figPreviousClose => 'الإغلاق السابق';

  @override
  String get figAvgVolume30d => 'متوسط الحجم ٣٠ يومًا';

  @override
  String get figSharesOutstanding => 'الأسهم المصدرة';

  @override
  String get figFloatShares => 'الأسهم الحرة';

  @override
  String get finNoFigures => 'لا توجد أرقام معلنة بعد';

  @override
  String get finNetProfitReported => 'صافي الربح، كما أُعلن';

  @override
  String get finStatements => 'القوائم المالية كما أُودعت';

  @override
  String get finAnnual => 'سنوي';

  @override
  String get finQuarterly => 'ربع سنوي';

  @override
  String get finNetProfitLine => 'صافي الربح';

  @override
  String get finStatementsNote =>
      'كل فترة تنشرها «مباشر» عن هذه الشركة، كما أُودعت. اسحب جانبًا للفترات الأقدم.';

  @override
  String get finCashInvesting => 'التدفق النقدي من الاستثمار';

  @override
  String get finCashFinancing => 'التدفق النقدي من التمويل';

  @override
  String get finNetChangeCash => 'صافي التغير في النقدية';

  @override
  String get finDividendsPaid => 'التوزيعات المدفوعة';

  @override
  String get finFiledDocuments => 'المستندات المودعة';

  @override
  String get finOpenPdf => 'فتح الملف';

  @override
  String get finNoDocuments => 'لا يوجد مستند مرفق بهذا الإفصاح.';

  @override
  String get exchangeSeeMore => 'إفصاحات أقدم';

  @override
  String exchangeShowingMonth(String month, int count) {
    return '$month · $count إفصاح';
  }

  @override
  String get exchangeArchiveNote =>
      'إفصاحات جمعناها واحتفظنا بها. البورصة لا تتيح سوى أحدث صفحة، وما هو أقدم موجود هنا لأننا حفظناه.';

  @override
  String filingOpenCompany(String ticker) {
    return 'افتح $ticker';
  }

  @override
  String get filingReadFiling => 'اقرأ الإفصاح';

  @override
  String get companyFilings => 'ما أُودع لدى البورصة';

  @override
  String companyFilingsBody(String ticker) {
    return 'كل ما أبلغت به $ticker البورصة مما احتفظنا به، الأحدث أولًا.';
  }

  @override
  String get companyNoFilings => 'لا توجد إفصاحات';

  @override
  String get companyNoFilingsBody =>
      'لم نحتفظ بعد بإفصاحات من هذه الشركة. البورصة لا تتيح سوى أحدث صفحة، ولذلك يبدأ السجل هنا من وقت بدء جمعنا له.';

  @override
  String get unusualLabel => 'تداول أكثر من المعتاد';

  @override
  String unusualBody(int count, int total) {
    return '$count من $total إعلان نحتفظ به جاء من شركة تداول سهمها أكثر بكثير من المعتاد.';
  }

  @override
  String unusualTimes(String ratio) {
    return '$ratio× المعتاد';
  }

  @override
  String get youNotAdvice =>
      'استثمر يساعدك على فهم البورصة المصرية. وهو لا يقرر عنك ما تشتريه. ولا شيء هنا نصيحة استثمارية.';

  @override
  String wiresBody(int count) {
    return '$count خبرًا من الصحافة الاقتصادية المصرية، الأحدث والأوثق صلة أولًا.';
  }

  @override
  String wiresBodyChecks(int count) {
    return '$count منها يذكر شركة تداول سهمها أكثر بكثير من المعتاد في ذلك اليوم.';
  }

  @override
  String get exchangeSourceNote =>
      'المصدر: البورصة المصرية. كل صف يرتبط بالإفصاح نفسه.';

  @override
  String watchlistRemove(String ticker) {
    return 'إزالة $ticker من المتابعة';
  }

  @override
  String directorySearchBody(int count) {
    return 'جرّب الرمز، أو الاسم القانوني بالعربية. يغطي الدليل $count شركة.';
  }

  @override
  String get directoryNoQuote => 'لا يوجد سعر';

  @override
  String directoryShareOfListings(String percent) {
    return '$percent% من الشركات المقيدة';
  }

  @override
  String get exitWaitNone => 'لا يوجد تداول منشور يكفي للقياس';

  @override
  String get exitWaitDay => 'نحو يوم واحد للبيع';

  @override
  String exitWaitSessions(int count) {
    return '$count جلسة للبيع';
  }

  @override
  String exitWaitYears(String years) {
    return '$years سنة من التداول';
  }

  @override
  String exitWaitDecades(int years) {
    return 'أكثر من $years سنة من التداول';
  }

  @override
  String get exitShareUnknown => 'لا يوجد تداول منشور يكفي لحساب ذلك.';

  @override
  String get exitShareWholeDay => 'أكثر من يوم تداول كامل معتاد في هذا السهم.';

  @override
  String get exitShareUnderOne => 'أقل من 1% من تداول يوم معتاد.';

  @override
  String exitSharePercent(int percent) {
    return '$percent% من تداول يوم معتاد.';
  }

  @override
  String get exitNeedsBuyer => 'لا يُباع السهم إلا حين يريد شخص آخر شراءه.';

  @override
  String get exitOneSession => 'هذا القدر تقريبًا يمكن أن يخرج في جلسة واحدة';

  @override
  String exitLastTraded(String date) {
    return 'آخر جلسة جرى فيها تداول: $date';
  }

  @override
  String exitNotEnough(String ticker) {
    return 'لا يوجد تداول منشور كافٍ لـ $ticker';
  }

  @override
  String exitNothingChanged(int days, int sessions) {
    return 'لم يجرِ أي تداول على الإطلاق في $days من آخر $sessions جلسة. وفي تلك الأيام لم يكن هناك سعر يستطيع المالك البيع عنده.';
  }

  @override
  String get exitHowItWorks =>
      'في هذه البورصة لا يتحرك السهم أكثر من 20% صعودًا أو هبوطًا في الجلسة. وحين يهبط سهم إلى هذا الحد الأدنى يختفي المشترون، فلا يبقى سعر يستطيع المالك البيع عنده — لأن البيع يحتاج طرفًا آخر.\n\nوبعض الأسهم هنا لا تتداول في بعض الأيام أصلًا. ليس «تداولًا قليلًا» — بل لا شيء يتغير. هذا يوضح كم يمثل مبلغ معين من يوم تداول معتاد، وكم جلسة يستغرق خروجه دون أن يكون معظم التداول.';

  @override
  String get exitPastThat =>
      'بعد ذلك يتجاوز البيع خُمس يوم معتاد هنا ويبدأ في استغراق أكثر من جلسة. وهذا الرقم يختلف من شركة إلى أخرى في هذه البورصة.';

  @override
  String get exitAssumption =>
      'يفترض رقم الجلسات ألا يتجاوز البيع خُمس تداول اليوم. وهذا افتراض معلن لا قاعدة سوقية — فالبيع الأسرع يحرّك السعر ضد البائع، وهي التكلفة التي يجري قياسها.';

  @override
  String get exitNoHistoryBody =>
      'يحتاج هذا إلى سلسلة جلسات وراءها أحجام تداول، وهذا القيد ليس لديه واحدة بعد. والغياب نفسه جدير بالمعرفة: سهم بلا تاريخ تداول منشور ليس سهمًا يستطيع أحد أن يريك مخرجًا منه.';

  @override
  String goldKaratGram(int karat) {
    return 'ذهب عيار $karat، للجرام';
  }

  @override
  String goldPerOunce(String amount) {
    return '$amount جنيه للأونصة';
  }

  @override
  String get dotsLabel => 'ما الذي يربط بينها';

  @override
  String dotsBody(int days) {
    return 'شركات ظهرت في أكثر من مكان خلال $days أيام.';
  }

  @override
  String get dotsFiling => 'إفصاح';

  @override
  String get dotsNews => 'في الصحافة';

  @override
  String get dotsSession => 'تلك الجلسة';

  @override
  String dotsVolume(String ratio) {
    return '$ratio× الحجم المعتاد';
  }

  @override
  String get filterTitle => 'ضيّق القائمة';

  @override
  String get filterAdd => 'أضف شرطًا';

  @override
  String get filterNone => 'لا شروط';

  @override
  String get filterClearAll => 'امسح الكل';

  @override
  String get filterApply => 'اعرض النتائج';

  @override
  String get filterMarketCap => 'القيمة السوقية';

  @override
  String get filterPrice => 'السعر';

  @override
  String get filterChange => 'التغير اليوم';

  @override
  String get filterVolume => 'حجم التداول اليوم';

  @override
  String get filterAvgVolume => 'متوسط حجم التداول';

  @override
  String get filterPe => 'مكرر الربحية';

  @override
  String get filterAbove => 'أكثر من';

  @override
  String get filterBelow => 'أقل من';

  @override
  String get filterBetween => 'بين';

  @override
  String get filterUnitEgp => 'جنيه';

  @override
  String get filterUnitPercent => '%';

  @override
  String get filterUnitShares => 'سهم';

  @override
  String get filterUnitTimes => '×';

  @override
  String get filterAnd => 'و';

  @override
  String filterMatchCount(int count, int total) {
    return '$count من $total شركة';
  }

  @override
  String get filterEps => 'ربحية السهم';

  @override
  String get filterProfit => 'صافي الربح';

  @override
  String get filterBusy => 'الحجم النسبي';

  @override
  String get filterUnitMillions => 'مليون جنيه';

  @override
  String get noteMarketCap =>
      'قيمة الشركة كلها بسعر اليوم — سعر السهم مضروبًا في كل الأسهم القائمة. من إعادة البناء هذا الصباح.';

  @override
  String get notePrice =>
      'آخر سعر جرى عنده تداول السهم. من التغذية المباشرة، متأخرة ربع ساعة على الأكثر.';

  @override
  String get noteChange => 'كم تحرك السعر منذ إغلاق أمس. من التغذية المباشرة.';

  @override
  String get noteVolume => 'كم سهمًا جرى تداوله اليوم. من التغذية المباشرة.';

  @override
  String get noteAvgVolume =>
      'كم سهمًا يجري تداوله في يوم عادي، بمتوسط آخر ثلاثين يومًا. من إعادة البناء هذا الصباح.';

  @override
  String get notePe =>
      'السعر مقسومًا على ما ربحته الشركة عن السهم الواحد العام الماضي. الرقم الأقل يعني أنك تدفع أقل مقابل كل جنيه ربح — وهو لا يقول شيئًا عن جودة الشركة. غائب في 121 من 280: خسارة، أو لا إيداع، أو رقم لم يجتز التحقق.';

  @override
  String get noteEps =>
      'الأرباح السنوية التي أودعتها الشركة مقسومة على عدد أسهمها. والخسارة تظهر بإشارة سالبة.';

  @override
  String get noteProfit =>
      'ما أودعته الشركة كأرباح عن العام، بملايين الجنيهات. وليس للسهم الواحد — فقد تربح شركة كبيرة أكثر بكثير وتربح أقل للسهم.';

  @override
  String get noteBusy =>
      'تداول اليوم مقابل ما تتداوله الشركة في يوم عادي. 1 يعني يومًا عاديًا، والإفصاحات تنبّه لما يتجاوز 2. وأقل من 1 يعني أهدأ من المعتاد.';

  @override
  String get finTotalAssets => 'إجمالي الأصول';

  @override
  String get finTotalLiabilities => 'إجمالي الالتزامات';

  @override
  String get finCashFromOps => 'التدفق النقدي التشغيلي';

  @override
  String get finNetProfitByYear => 'صافي الربح سنويًا';

  @override
  String get finLatestFiling => 'آخر إفصاح';

  @override
  String get finCompanyOnly => 'مستقلة';

  @override
  String get finReadFiling => 'اقرأ الإفصاح';

  @override
  String get priceNoHistoryDownloaded => 'لم يُنزَّل تاريخ الأسعار';

  @override
  String priceLastSessions(int count) {
    return 'آخر $count جلسة';
  }

  @override
  String get discussionBody =>
      'تظهر هنا نقاشات الشركة عند تفعيل خدمة المجتمع. كل شيء آخر في هذه الشاشة يعمل بدونها.';

  @override
  String get movedThisMonthLabel => 'كيف تحرّك هذا الشهر';

  @override
  String get noDetailBody =>
      'لم يحمل مسح البورصة لهذه الشركة سوى سعر الإغلاق. يظهر ما عدا ذلك عند نشر سجل أوفى.';

  @override
  String get finNoFiguresBody =>
      'تُقرأ الأرقام من القوائم المالية التي تودعها كل شركة ومن النتائج التي تعلنها للبورصة. لم يُقرأ شيء لهذه الشركة بعد.';

  @override
  String finFootnote(String source) {
    return 'الأرقام بملايين الجنيهات كما أُودعت. لا يذكر أي من المصدرين الإيرادات، لذلك لا تُعرض الهوامش بدلًا من تقديرها. المصدر: $source.';
  }

  @override
  String get sourceMubasher => 'مباشر';

  @override
  String get priceNoHistoryBody => 'افتح هذه الشركة مرة ومعك اتصال.';

  @override
  String get priceNoSeriesBody =>
      'لا مسح البورصة ولا مصدر الأسعار ينشر سلسلة صالحة لها بعد.';

  @override
  String get noStudyBody =>
      'تُدرس الشركات واحدة تلو الأخرى. عندما تُقرأ هذه، تظهر الدراسة هنا.';

  @override
  String get exitStopsTrading => 'يتوقف عن التداول';

  @override
  String get exitCanIGetOut => 'أقدر أخرج؟';

  @override
  String get scanNotRunBody =>
      'لم يستوفِ شيء الاختبار منذ الجلسة الماضية. هذه نتيجة، وليست خطأ.';

  @override
  String get scanRecordBlurb =>
      'ما قالته القاعدة المنشورة، وما فعله السوق بعدها، وما غُيّر في القاعدة لاحقًا. هذه مراجعة للمنهج، وليست لوحة نتائج: لا يوجد مجموع هنا ولن يوجد.';

  @override
  String get scanLogEmptyBlurb =>
      'تظهر السجلات هنا مع قياس كل قاعدة منشورة على ما حدث بعدها.';

  @override
  String get scanEmptySectionBlurb =>
      'القسم الفارغ إجابة حقيقية. الاختبار لا يخفّض معاييره ليملأ شاشة.';

  @override
  String get scanCoverageBlurb =>
      'تُقرأ كل شركة مقيدة. معظمها لا يستوفي، وما لا يستوفي يُنشر أيضًا.';

  @override
  String scanCohortNames(int count) {
    return 'المجموعة · $count اسمًا';
  }

  @override
  String get scanSectorBlurb =>
      'القراءة القطاعية تغيّر ما يُدرس أولًا. هي ترتيب قراءة، وليست رأيًا في أي شركة داخلها.';

  @override
  String get scanNoSectorBody =>
      'تظهر المجموعة عندما تتحرك عدة أسماء في صناعة واحدة للسبب نفسه. في معظم الأيام لا تظهر، وهذه نتيجة لا نقص.';

  @override
  String get gateUnresolvedLabel => 'غير محسوم';

  @override
  String get noDetailBodyFull =>
      'لم يحمل مسح البورصة لهذا القيد سوى سعر الإغلاق. يظهر المزيد عند نشر سجل أوفى.';

  @override
  String get finNoFiguresBodyFull =>
      'تُقرأ الأرقام من القوائم المالية التي تودعها كل شركة ومن النتائج التي تعلنها للبورصة. لم يُقرأ شيء لهذه الشركة بعد.';

  @override
  String finFootnoteFull(String source) {
    return 'الأرقام بملايين الجنيهات كما أُودعت. لا يذكر أي من المصدرين الإيرادات، لذلك لا تُعرض الهوامش بدلًا من تقديرها. المصدر: $source.';
  }

  @override
  String get priceNoHistoryTitle => 'لم يُنزَّل تاريخ الأسعار';

  @override
  String get priceNoSeriesBodyFull =>
      'لا مسح البورصة ولا مصدر الأسعار ينشر سلسلة لهذا القيد بعد.';

  @override
  String exitZeroDays(int days, int sessions) {
    return 'لم يتداول السهم إطلاقًا في $days من آخر $sessions جلسة.';
  }

  @override
  String exitFiftyK(String share) {
    return '٥٠٬٠٠٠ جنيه هنا تمثل $share';
  }

  @override
  String get exitNoPrice =>
      'في تلك الأيام لم يكن هناك سعر يستطيع المالك البيع عنده.';

  @override
  String meansSameDay(String amount) {
    return 'نحو $amount يمكن أن تخرج في جلسة واحدة هنا. فوق ذلك يصبح البيع أكثر من خُمس يوم عادي ويبدأ في تحريك السعر ضد البائع.';
  }

  @override
  String meansZeroDays(int days, int sessions) {
    return 'لم يتداول إطلاقًا في $days من آخر $sessions جلسة. في تلك الأيام لم يكن هناك سعر يستطيع المالك البيع عنده، لأنه لم يكن هناك مشترٍ.';
  }

  @override
  String meansNetProfit(String amount, String period) {
    return 'أعلن $amount صافي ربح في $period.';
  }

  @override
  String get scanLogEmptyBodyFull =>
      'تظهر السجلات هنا مع بلوغ كل قاعدة منشورة نهايتها المعلنة.';

  @override
  String get scanEmptySectionFull =>
      'القسم الفارغ إجابة حقيقية. الاختبار لا يخفّض معاييره ليملأ صفحة.';

  @override
  String get scanSectorBlurbFull =>
      'القراءة القطاعية تغيّر ما يُدرس أولًا. لا تسجّل شيئًا في السجل ولا تسمّي شيئًا للتصرف بناءً عليه.';

  @override
  String detailFirstSeen(String date) {
    return 'أول ظهور · $date';
  }

  @override
  String get detailWhyScored => 'لماذا حصل على هذه الدرجة';

  @override
  String get detailLastSession => 'آخر جلسة مكتملة';

  @override
  String get detailMoveSince => 'التغيّر منذ رصده';

  @override
  String get detailHowScored => 'كيف يُقيَّم الاسم';

  @override
  String detailOpenTicker(String ticker) {
    return 'افتح $ticker';
  }

  @override
  String get homeFiledHero => 'إعلانات الشركات';

  @override
  String get homeRoseAndFell => 'ما ارتفع وما انخفض';

  @override
  String get homeIndices => 'كيف تحرّك السوق كله';

  @override
  String get breadthUp => 'ارتفع';

  @override
  String get breadthDown => 'انخفض';

  @override
  String get breadthFlat => 'دون تغيير';

  @override
  String breadthOf(int count) {
    return 'من $count سهمًا';
  }

  @override
  String get breadthChartTitle => 'كيف انقسم السوق، جلسة بعد جلسة';

  @override
  String get breadthOneSession =>
      'جلسة واحدة مسجّلة حتى الآن. تنمو الخطوط مع تسجيل كل جلسة — لا يوجد تاريخ منشور لاتساع السوق نستعيده.';

  @override
  String get indexNoSeries =>
      'تُسجَّل المستويات جلسة بجلسة. لا توجد سلسلة منشورة للمؤشر نستعيدها.';

  @override
  String get ratesWorld => 'هل كانت مصر، أم العالم كله؟';

  @override
  String get ratesMetals => 'الذهب والفضة';

  @override
  String get ratesPound => 'الجنيه';

  @override
  String get ratesPerGram => 'للجرام';

  @override
  String get ratesIndicesMovedHome => 'مستويات المؤشرات في الصفحة الرئيسية';

  @override
  String get ageJustNow => 'الآن';

  @override
  String get ageToday => 'اليوم';

  @override
  String get ageYesterday => 'أمس';

  @override
  String ageMinutes(int count) {
    return 'قبل $count د';
  }

  @override
  String ageHours(int count) {
    return 'قبل $count س';
  }

  @override
  String ageDays(int count) {
    return 'قبل $count ي';
  }

  @override
  String get unusualVolume => 'حجم تداول غير معتاد';

  @override
  String get saved => 'المحفوظات';

  @override
  String get loading => 'جارٍ التحميل';

  @override
  String get mainNavigation => 'التنقل الرئيسي';

  @override
  String get priceLow => 'أدنى';

  @override
  String get priceHigh => 'أعلى';

  @override
  String get priceOpen => 'الافتتاح';

  @override
  String get priceClose => 'الإغلاق';

  @override
  String get showMore => 'عرض المزيد';

  @override
  String showingCount(int shown, int total) {
    return 'عرض $shown من $total';
  }

  @override
  String get theWires => 'الأخبار';

  @override
  String get sortByScore => 'حسب الدرجة';

  @override
  String get sortMostRecent => 'الأحدث';

  @override
  String get cotNoneYet => 'لا توجد دراسات بعد';

  @override
  String get cotNoMatch => 'لا شيء يطابق ذلك';

  @override
  String get readInvestigation => 'اقرأ الدراسة';

  @override
  String get articleFailed => 'تعذّر فتح الدراسة';

  @override
  String get exitHeadline => 'كم يستوعب هذا السهم، وكم يستغرق الخروج منه';

  @override
  String get exitIfYouPutIn => 'عند هذا الحجم';

  @override
  String get exitNumbersBehind => 'الأرقام وراء ذلك';

  @override
  String get companyLabel => 'الشركة';

  @override
  String get explTraded => 'حجم ما جرى تداوله';

  @override
  String get explFinished => 'أين أغلق';

  @override
  String get explBuyable => 'كم يمكن شراؤه فعليًا';

  @override
  String get explValued => 'بكم تُسعَّر الشركة بالكامل';

  @override
  String get rubricFreshDisclosure => 'إفصاح حديث';

  @override
  String get rubricEconomicImportance => 'أهمية اقتصادية';

  @override
  String get rubricVolumeConfirmation => 'تأكيد بحجم التداول';

  @override
  String get rubricOwnershipCluster => 'تجمّع في الملكية';

  @override
  String get rubricDatedCatalyst => 'محفّز مؤرَّخ';

  @override
  String get rubricAntiChasing => 'مانع المطاردة';

  @override
  String get rubricLimitUpPenalty => 'خصم بلوغ الحد الأقصى';

  @override
  String get rubricIssuerDenial => 'نفي من الشركة';

  @override
  String get rubricRiskPenalty => 'خصم المخاطر';

  @override
  String get ownersEquity => 'حقوق الملكية';

  @override
  String get homeMacro => 'ما يحرّك مصر';

  @override
  String get macroWhyItMatters => 'لماذا يصل هذا إلى الأسهم المصرية';

  @override
  String get macroMovesWith => 'تحرّك مع مؤشر EGX 30';

  @override
  String get macroWeakLink => 'بالكاد يتحرك مع مؤشر EGX 30 يومًا بيوم';

  @override
  String get macroEgyptLine => 'خط مصر نفسه';

  @override
  String macroSessions(int count) {
    return 'خلال $count جلسة';
  }

  @override
  String get macroUnavailable => 'تعذّر الوصول إلى بعض المصادر';

  @override
  String get macroCoverage => 'ما يُنشر عن ذلك';

  @override
  String get homeLeadStory => 'قصة اليوم';

  @override
  String get feedNews => 'الأخبار';

  @override
  String get feedExchange => 'من البورصة';

  @override
  String get freshLoading => 'جارٍ تحميل الأسعار';

  @override
  String get freshSample => 'بيانات تجريبية · ليست أسعارًا حقيقية';

  @override
  String get freshLastClose => 'أسعار الإغلاق';

  @override
  String get freshDuringSession => 'أسعار أثناء التداول';

  @override
  String freshOnDay(String state, String day) {
    return '$state · $day';
  }

  @override
  String get freshMarketClosed => 'السوق مغلق · أسعار الإغلاق';

  @override
  String freshMarketClosedOn(String day) {
    return 'السوق مغلق · أسعار $day';
  }

  @override
  String freshDelayed(String delay, String since) {
    return 'متأخرة $delay عن البورصة · حُدِّثت $since';
  }

  @override
  String freshDelayedShort(String delay) {
    return 'متأخرة $delay عن البورصة';
  }

  @override
  String freshDelaySeconds(int count) {
    return '$count ثانية';
  }

  @override
  String freshDelayMinutes(int count) {
    return '$count دقيقة';
  }

  @override
  String freshDelayHours(int count) {
    return '$count ساعة';
  }

  @override
  String get freshSinceJustNow => 'للتو';

  @override
  String freshSinceMinutes(int count) {
    return 'قبل $count دقيقة';
  }

  @override
  String freshSinceHours(int count) {
    return 'قبل $count ساعة';
  }

  @override
  String freshSinceDays(int count) {
    return 'قبل $count يوم';
  }

  @override
  String youCompaniesCount(int count) {
    return '$count في الدليل';
  }

  @override
  String youPricesLive(int delay, int refresh) {
    return 'متأخرة $delay دقيقة عن البورصة، وتُحدَّث كل $refresh دقائق. لا يوجد بث لحظي.';
  }

  @override
  String get youPricesClose => 'أسعار الإغلاق فقط. لا يوجد بث لحظي.';

  @override
  String get unitBillionsEgp => 'مليار جنيه';

  @override
  String get unitMillionsEgp => 'مليون جنيه';

  @override
  String get unitThousandsEgp => 'ألف جنيه';

  @override
  String get unitEgp => 'جنيه';

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
    return 'الوحدة: $unit';
  }

  @override
  String get pmToProfit => 'إلى ربح';

  @override
  String get pmToLoss => 'إلى خسارة';

  @override
  String get pmUnchanged => 'بلا تغيير';

  @override
  String get pmWiderLoss => 'خسارة أكبر';

  @override
  String get pmSmallerLoss => 'خسارة أقل';

  @override
  String pmMadeMoneyAfterBreakEven(String now, String prior) {
    return 'حقّق ربحًا في $now، بعد أن تعادل في $prior.';
  }

  @override
  String pmMadeMoneyAfterLoss(String now, String amount, String prior) {
    return 'حقّق ربحًا في $now، بعد خسارة $amount في $prior.';
  }

  @override
  String pmLostAfterProfit(String now, String amount, String prior) {
    return 'خسر في $now، بعد ربح $amount في $prior.';
  }

  @override
  String pmLossSame(String prior, String amount) {
    return 'الخسارة كما كانت في $prior، عند $amount.';
  }

  @override
  String pmLossGrew(String from, String to, String prior) {
    return 'اتّسعت الخسارة من $from إلى $to مقارنة بـ$prior.';
  }

  @override
  String pmLossShrank(String from, String to, String prior) {
    return 'تراجعت الخسارة من $from إلى $to مقارنة بـ$prior.';
  }

  @override
  String pmProfitUnchanged(String prior, String amount) {
    return 'لم يتغيّر الربح مقارنة بـ$prior، عند $amount.';
  }

  @override
  String pmTimesSentence(String times, String amount, String prior) {
    return 'أي $times أضعاف الـ$amount التي أعلنها في $prior.';
  }

  @override
  String pmRose(String prior, String amount) {
    return 'ارتفع الربح مقارنة بـ$prior، حين أعلن $amount.';
  }

  @override
  String pmFell(String prior, String amount) {
    return 'تراجع الربح مقارنة بـ$prior، حين أعلن $amount.';
  }

  @override
  String get figSharesTradedToday => 'الأسهم المتداولة اليوم';

  @override
  String get perf1Week => 'أسبوع';

  @override
  String get perf1Month => 'شهر';

  @override
  String get perf3Months => '3 أشهر';

  @override
  String get perf5Sessions => '5 جلسات';

  @override
  String get finGroupBasis => 'مجمّعة';

  @override
  String periodQuarter1(String year) {
    return 'الربع الأول $year';
  }

  @override
  String periodQuarter2(String year) {
    return 'الربع الثاني $year';
  }

  @override
  String periodQuarter3(String year) {
    return 'الربع الثالث $year';
  }

  @override
  String periodQuarter4(String year) {
    return 'الربع الرابع $year';
  }

  @override
  String periodHalf1(String year) {
    return 'النصف الأول $year';
  }

  @override
  String periodHalf2(String year) {
    return 'النصف الثاني $year';
  }

  @override
  String periodFullYear(String year) {
    return 'السنة المالية $year';
  }

  @override
  String filedCountWithChecks(int total, int count) {
    return 'إعلانات الشركات: $total. ومما أمكن فحصه، جاء $count من شركة تداول سهمها أكثر بكثير من المعتاد.';
  }

  @override
  String filedCountNoChecks(int total) {
    return 'إعلانات الشركات: $total. ولم يأتِ أي مما أمكن فحصه من شركة تداول سهمها أكثر بكثير من المعتاد.';
  }

  @override
  String todayPutTogether(String date) {
    return 'أُعدّ بعد إغلاق تداول يوم $date';
  }

  @override
  String updatedOn(String date) {
    return 'حُدِّث · $date';
  }

  @override
  String get macroUnitUsdOunce => 'دولار · للأوقية';

  @override
  String get macroUnitUsdBarrel => 'دولار · للبرميل';

  @override
  String get macroUnitVessels => 'سفينة';

  @override
  String get macroUnitPercent => 'بالمئة';

  @override
  String get macroUnitUsdBillion => 'دولار · بالمليار';

  @override
  String get explainerHowWorkedOut => 'كيف حُسب هذا';

  @override
  String get explainerWhatCountsUnusual => 'ما الذي يُعد غير معتاد';

  @override
  String get studySumOfSix => 'مجموع الركائز الست';

  @override
  String get studyWhatWouldChange => 'ما الذي قد يغيّر هذا';

  @override
  String get studyNoConditions =>
      'لم تسمِّ الدراسة المنشورة بعد إفصاحًا قد يحرّك هذه الركائز. وإلى أن تفعل، فما تحته سجل لما أنتجته القاعدة في تاريخها ولا شيء أكثر من ذلك.';

  @override
  String get studyIndexNotOnDevice => 'الدراسات ليست على الجهاز بعد';

  @override
  String get studyIndexNotOnDeviceBody =>
      'افتحها مرة واحدة وأنت متصل بالإنترنت وتبقى على الجهاز.';

  @override
  String get studyAllBand => 'الكل';

  @override
  String get studyClearFilters => 'امسح عوامل التصفية';

  @override
  String get studyNoneInBand => 'لم تقع أي شركة في هذه الفئة بعد.';

  @override
  String studyNoMatch(String query) {
    return 'لا توجد شركة مدروسة تطابق «$query». جرّب رمزًا، أو امسح عامل التصفية.';
  }

  @override
  String get studyOneAtATime =>
      'تظهر الشركات هنا واحدة تلو الأخرى، بعد قراءة كل واحدة منها كاملة.';

  @override
  String get studyFullWriteUp => 'الشرح الكامل في ملف المعايير';

  @override
  String studyScoreRange(int min, int max) {
    return 'تتراوح الدرجات من $min إلى +$max عبر ست ركائز: التقييم، وجودة الأرباح، والنمو، والمركز المالي، وقابلية التداول، والحوكمة.';
  }

  @override
  String exitNotDownloaded(String ticker) {
    return 'لا توجد بيانات مُنزَّلة لـ$ticker بعد';
  }

  @override
  String get exitNotDownloadedBody =>
      'افتحها مرة واحدة وأنت متصل بالإنترنت وتبقى على الجهاز.';

  @override
  String get exitThinSessions => 'جلسات أقل من ١٠٠٠ سهم';

  @override
  String get exitFreeToTrade => 'الأسهم المتاحة للتداول';

  @override
  String get exitDailyLimit => 'حد التغير اليومي';

  @override
  String get exitDailyLimitValue => '±٢٠٪، تحدده البورصة';

  @override
  String get directoryNotOnDevice => 'دليل الشركات ليس على الجهاز بعد';

  @override
  String get directoryNotOnDeviceBody =>
      'افتح التطبيق مرة واحدة وأنت متصل بالإنترنت ويبقى الدليل كله متاحًا دون اتصال.';

  @override
  String get directorySectors => 'القطاعات';

  @override
  String get pitSource => 'مصدر';

  @override
  String get pitSourceBody => 'إفصاح، منشور مباشرة من السجل';

  @override
  String get pitNoCalls =>
      'لا توصيات بالشراء أو البيع، ولا أسعار مستهدفة، ولا جداول لترتيب الأداء.';

  @override
  String get articleNeedsConnection =>
      'الشرح الكامل موجود على thebarbarianproject.com ويحتاج اتصالًا بالإنترنت. وكل ما نُزِّل بالفعل ما زال متاحًا دون اتصال.';

  @override
  String get articleGoBack => 'رجوع';

  @override
  String get priceNoHistory => 'لا يوجد تاريخ أسعار لهذه الشركة بعد';

  @override
  String priceSessionRange(int count) {
    return 'مدى $count جلسة';
  }

  @override
  String priceSessionsTo(int count, String date) {
    return '$count جلسة · حتى $date';
  }

  @override
  String get scanPositionWithheld =>
      'ملاحظة التقرير عن هذا السهم تصف مركزًا نموذجيًا — حجمًا وسعرًا. ولا يملك «استثمر» ترخيصًا لإعادة نشر ذلك، فالدرجة والأدلة هنا والمركز ليس هنا.';

  @override
  String newsSourcedFrom(String outlets) {
    return 'عناوين من $outlets، كل واحد منها موصول بالجهة التي نشرته.';
  }

  @override
  String newsMergedCount(int count) {
    return 'دُمج $count خبرًا مكررًا.';
  }

  @override
  String newsWithheldCount(int count) {
    return 'حُجب $count خبرًا لاحتوائه على توصية.';
  }

  @override
  String newsUnreachable(String outlets) {
    return 'تعذّر الوصول اليوم إلى: $outlets.';
  }

  @override
  String cotInvestigatedCount(int studied, int total) {
    return 'دُرست $studied من $total';
  }

  @override
  String get pitWhatItIs =>
      '«النقاش» هو المكان الذي تُناقَش فيه الأدلة. شركات وإفصاحات والبحث الذي وراءها — يتحدث عنها من يقرأون الأرقام نفسها.\n\nوكل ما عدا ذلك في التطبيق يعمل بدونه، وسيظل يعمل إن تعطّل يومًا.';

  @override
  String a11yBreadthOneSession(int up, int down, int flat) {
    return 'جلسة واحدة: ارتفع $up، وتراجع $down، وثبت $flat';
  }

  @override
  String a11yBreadthSessions(int count) {
    return '$count جلسة من اتساع السوق';
  }

  @override
  String a11yTrendRising(int count) {
    return 'اتجاه $count جلسة، صاعد';
  }

  @override
  String a11yTrendFalling(int count) {
    return 'اتجاه $count جلسة، هابط';
  }

  @override
  String a11yVerdictWithScore(String sentence, int score, int max) {
    return '$sentence مجموع الركائز الست $score من $max.';
  }

  @override
  String a11yExplainerHint(String title, String plain, String token) {
    return '$title. $plain $token. اضغط لرؤية الحساب.';
  }

  @override
  String a11ySessionUnchanged(String date) {
    return '$date: بلا تغيير';
  }

  @override
  String a11ySessionUp(String date, String percent) {
    return '$date: ارتفاع $percent بالمئة';
  }

  @override
  String a11ySessionDown(String date, String percent) {
    return '$date: تراجع $percent بالمئة';
  }

  @override
  String a11yPriceHistory(
    int count,
    String first,
    String last,
    String low,
    String high,
  ) {
    return 'تاريخ السعر، $count جلسة، من $first إلى $last، أدنى $low، أعلى $high';
  }

  @override
  String a11yRangeGauge(String caption, String value, String low, String high) {
    return '$caption: $value، المدى من $low إلى $high';
  }

  @override
  String get youTitle => 'حسابك';

  @override
  String get sortAlphabetical => 'أ–ي';

  @override
  String get sortGainers => 'الصاعدة';

  @override
  String get sortLosers => 'الهابطة';

  @override
  String get sortMostActive => 'الأكثر تداولًا';

  @override
  String directoryCompaniesSorted(String order) {
    return 'الشركات · $order';
  }

  @override
  String get newsReadStory => 'اقرأ الخبر';

  @override
  String get newsSourceHeader => 'المصدر';

  @override
  String get filingReaderHeader => 'إفصاح البورصة';

  @override
  String get companyInThePress => 'في الصحافة';

  @override
  String companyInThePressBody(String ticker) {
    return 'أخبار ذكرت $ticker، من الجهات التي نتابعها. تقاريرهم، على صفحاتهم.';
  }

  @override
  String get homeWhichCompanies => 'الأنشط مقارنة بمعتادها';

  @override
  String get volumeTeaching =>
      '«تداول غير معتاد» له معنى واحد هنا: تداول سهم الشركة بما لا يقل عن ضعف معدله المعتاد. وهذا سؤال يستحق أن يُطرح، لا حكمًا — فالأيام النشطة تحدث لأسباب جيدة وأخرى سيئة على السواء.';

  @override
  String get volumeTeachingTitle => 'ما معنى «تداول غير معتاد»';

  @override
  String get volumeTeachingWorkings =>
      'الأسهم المتداولة في الجلسة ÷ وسيط آخر 20 جلسة. وعند 2.0 فأكثر، يصف هذا التطبيق اليوم بأنه غير معتاد.';

  @override
  String get volumeTeachingYardstick =>
      'الضعف هو الحد الفاصل، وهو حد يضعه هذا التطبيق لا البورصة — فلا أحد ينشر حدًا رسميًا. وهو عند هذا الرقم لأن يومًا بضعف حجم التداول المعتاد نادر بما يكفي ليستحق النظر، ومألوف بما يكفي ليحدث دون أن يكون هناك خطب ما.';

  @override
  String get learnMore => 'ما معنى هذا؟';

  @override
  String goldKaratPlain(int karat, String price) {
    return 'جرام الذهب عيار $karat يساوي $price جنيهًا.';
  }

  @override
  String goldKaratYardstick(int karat) {
    return '$karat جزءًا من الذهب في كل 24. ومعظم المشغولات الذهبية في مصر عيار 21. سعر المعدن واحد في الحالتين؛ والعيار هو مقدار الذهب في القطعة.';
  }

  @override
  String ratesPerGramEgp(String per) {
    return 'جنيه · $per';
  }

  @override
  String get exitNormalDay => 'تداول يوم عادي';

  @override
  String get exitNotPublished => 'غير منشور';

  @override
  String exitFloatRest(String percent) {
    return '$percent٪ — والباقي لا يتحرك';
  }

  @override
  String get exitSearchHint => 'افحص شركة بالاسم أو الرمز…';

  @override
  String get studySearchHint => 'ابحث برمز السهم أو اسم الشركة';

  @override
  String get sectorFinance => 'التمويل والخدمات المالية';

  @override
  String get sectorProcessIndustries => 'الصناعات التحويلية';

  @override
  String get sectorNonEnergyMinerals => 'معادن ومواد بناء';

  @override
  String get sectorConsumerNonDurables => 'سلع استهلاكية غير معمّرة';

  @override
  String get sectorConsumerServices => 'خدمات استهلاكية';

  @override
  String get sectorIndustrialServices => 'خدمات صناعية';

  @override
  String get sectorHealthTechnology => 'أدوية وتكنولوجيا طبية';

  @override
  String get sectorProducerManufacturing => 'صناعات إنتاجية';

  @override
  String get sectorDistributionServices => 'خدمات التوزيع';

  @override
  String get sectorHealthServices => 'خدمات صحية';

  @override
  String get sectorTechnologyServices => 'خدمات تكنولوجية';

  @override
  String get sectorConsumerDurables => 'سلع استهلاكية معمّرة';

  @override
  String get sectorRetailTrade => 'تجارة التجزئة';

  @override
  String get sectorTransportation => 'النقل';

  @override
  String get sectorCommercialServices => 'خدمات تجارية';

  @override
  String get sectorUtilities => 'المرافق';

  @override
  String get sectorCommunications => 'الاتصالات';

  @override
  String get sectorEnergyMinerals => 'موارد الطاقة';

  @override
  String get sectorElectronicTechnology => 'تكنولوجيا إلكترونية';

  @override
  String get sectorMiscellaneous => 'متنوعة';

  @override
  String scanScoreOf(String status, int max) {
    return '$status · من $max';
  }

  @override
  String scanScoreSpoken(int score, int max, String status) {
    return '$score من $max، $status';
  }

  @override
  String get expRvTitle => 'كم تداول السهم';

  @override
  String get expRvNoTrade => 'لم يُتداول السهم إطلاقًا.';

  @override
  String get expRvExact => 'تداول تمامًا بقدره المعتاد.';

  @override
  String expRvMore(int pct) {
    return 'تداول بنسبة $pct٪ فوق قدره المعتاد.';
  }

  @override
  String expRvLess(int pct) {
    return 'تداول بنسبة $pct٪ دون قدره المعتاد.';
  }

  @override
  String expRvToken(String ratio) {
    return '$ratio× المعتاد';
  }

  @override
  String expRvWorkings(String volume, String median, String ratio) {
    return '$volume سهم تداولت\n÷ $median — الجلسة الوسطى في آخر 20 جلسة\n= $ratio';
  }

  @override
  String get expRvYardstickNoTrade =>
      'لم يتغير أي سهم يدًا. لم يكن هناك سعر يستطيع المالك البيع عنده، لأن البيع يحتاج طرفًا آخر.';

  @override
  String get expRvYardstick =>
      'أقل من 1 يعني هدوءًا أكثر من المعتاد. وفوق 2 غير معتاد ويستحق قراءة الإفصاحات.';

  @override
  String get expRvCaveat =>
      'المقارنة مع الجلسة الوسطى في آخر عشرين جلسة، لا مع المتوسط. وأسبوع إجازة أو إيقاف للتداول يحرّكها.';

  @override
  String get expCloseTitle => 'أين أغلق';

  @override
  String get expCloseUpper => 'أغلق في النصف الأعلى من نطاق تداوله ذلك اليوم.';

  @override
  String get expCloseLower => 'أغلق في النصف الأدنى من نطاق تداوله ذلك اليوم.';

  @override
  String expCloseToken(int pct) {
    return '$pct٪ من نطاق اليوم';
  }

  @override
  String expCloseWorkings(String close, String low, String high, int pct) {
    return 'أغلق عند $close\n− أدنى سعر لليوم $low\n÷ (أعلى $high − أدنى $low)\n= $pct٪';
  }

  @override
  String get expCloseYardstick =>
      '١٠٠٪ تعني أنه أغلق عند قمة نطاقه تمامًا، و٠٪ عند قاعه. وجلسة واحدة بمفردها لا تقول الكثير.';

  @override
  String get expFloatTitle => 'كم منه متاح للشراء فعلًا';

  @override
  String expFloatPlain(int count) {
    return '$count سهم فقط من كل 100 يُتداول فعلًا.';
  }

  @override
  String expFloatToken(String pct) {
    return '$pct٪ أسهم حرة التداول';
  }

  @override
  String expFloatWorkingsShort(String pct) {
    return '$pct٪ من الأسهم حرة التداول.';
  }

  @override
  String expFloatWorkingsHead(String shares) {
    return '$shares سهم حر التداول';
  }

  @override
  String expFloatWorkingsDiv(String shares) {
    return '÷ $shares سهم مُصدَر';
  }

  @override
  String expFloatWorkingsSum(String pct) {
    return '= $pct٪';
  }

  @override
  String get expFloatYardstick =>
      'الباقي في يد ملّاك لا يبيعون. وقلة الأسهم الحرة تعني أن السعر يتحرك أكثر أمام الأمر نفسه — في الاتجاهين — وأن البيع بكميات كبيرة قد يستغرق أيامًا.';

  @override
  String get expFloatSource => 'جدول الملكية، أحدث إفصاح';

  @override
  String get expFloatCaveat =>
      'القيمة السوقية المحسوبة على كل الأسهم ليست ما ستُباع به الشركة بينما جزء صغير منها فقط هو المتداول.';

  @override
  String get expCapTitle => 'بكم تُسعَّر الشركة كلها';

  @override
  String expCapPlainBillions(String value) {
    return 'تُسعَّر الشركة كلها بـ$value مليار جنيه.';
  }

  @override
  String expCapPlainMillions(String value) {
    return 'تُسعَّر الشركة كلها بـ$value مليون جنيه.';
  }

  @override
  String expCapWorkings(String shares, String price, String cap) {
    return '$shares سهم مُصدَر\n× $price جنيه للسهم\n= $cap جنيه';
  }

  @override
  String get expCapYardstick =>
      'هذا ما يطلبه السوق ثمنًا للشركة اليوم، وليس قياسًا لما تملكه أو لما تكسبه.';

  @override
  String get expCapSource => 'عدد الأسهم من أحدث إفصاح، والسعر من الإغلاق';

  @override
  String get expCapCaveat =>
      'يضرب كل سهم في آخر سعر تداول، بما في ذلك الأسهم التي لا تُتداول أبدًا.';

  @override
  String expMoveHigher(String pct, String window) {
    return 'سعره أعلى بنسبة $pct٪ مما كان قبل $window.';
  }

  @override
  String expMoveLower(String pct, String window) {
    return 'سعره أقل بنسبة $pct٪ مما كان قبل $window.';
  }

  @override
  String expMoveWorkings(String window) {
    return 'سعر الإغلاق الآن، مقابل سعر الإغلاق قبل $window، كنسبة من الأقدم.';
  }

  @override
  String get expMoveYardstick =>
      'الحركة وحدها تقول ماذا حدث لا لماذا. والسبب — إن كان قد نُشر — في الإفصاحات والدراسة.';

  @override
  String get expSourceSession => 'بيانات جلسة البورصة';

  @override
  String expSourceSessionOn(String date) {
    return 'بيانات جلسة البورصة، $date';
  }

  @override
  String get expSourceCloses => 'أسعار إغلاق البورصة';

  @override
  String expSourceClosesOn(String date) {
    return 'أسعار إغلاق البورصة، $date';
  }

  @override
  String get notabilityOrdinary => 'معتاد';

  @override
  String get notabilityUnusual => 'غير معتاد';

  @override
  String get notabilityUnjudged => 'لا يوجد حد منشور';

  @override
  String get provenanceFact => 'واقعة';

  @override
  String get provenanceCalculation => 'حساب';

  @override
  String get provenanceInterpretation => 'تفسير';

  @override
  String get dotsWhatTheyShare => 'ما يجمع بينها';

  @override
  String busyBody(int count) {
    return '$count شركة تداولت اليوم بضعف حجمها المعتاد على الأقل.';
  }

  @override
  String get busyNone =>
      'لم تتداول أي شركة بعيدًا عن معتادها اليوم. واليوم الهادئ إجابة حقيقية.';

  @override
  String get busyFiledToo => 'أعلنت شيئًا';

  @override
  String busyFloorNote(String amount) {
    return 'تُستبعد الجلسات التي تقل قيمتها عن $amount.';
  }

  @override
  String get homeSearchHint => 'ابحث عن شركة أو رمز';

  @override
  String homeSearchNone(String query) {
    return 'لا شيء يطابق «$query»';
  }

  @override
  String homeSearchMore(int count) {
    return 'اعرض كل النتائج ($count)';
  }

  @override
  String get volumeTeachingShort => 'التداول غير المعتاد سؤال، لا حكم.';

  @override
  String get heroLabel => 'البورصة اليوم';

  @override
  String heroBreadth(int up, int flat, int down) {
    return '$up ارتفع · $flat دون تغيير · $down انخفض';
  }

  @override
  String heroOf(int count) {
    return 'من $count سهم';
  }

  @override
  String get volumeTeachingFloor =>
      'تُستبعد من القائمة الجلسة الضئيلة القيمة مهما بلغ مضاعفها. فالترتيب الخام اليوم يبدأ بشركة تداولت 567 سهمًا مقابل معتاد قدره أربعة — أي 141 ضعف معتادها، و708,750 جنيهًا. ومضاعفة رقم صغير جدًا حساب لا خبر.';

  @override
  String get dotsExplainerTitle => 'التقاطعات';

  @override
  String get dotsExplainerPlain =>
      'شركة واحدة تظهر في أكثر من مكان في الوقت نفسه.';

  @override
  String dotsExplainerWorkings(int days) {
    return 'نقرأ ثلاثة مصادر عن $days من الأيام نفسها: ما أفصحت عنه البورصة، وما كتبته الصحافة، وما فعله السهم. وتُدرج الشركة هنا إذا ظهرت في اثنين منها على الأقل. لا شيء في البطاقة جديد — كل خيط يعود إلى المستند الذي جاء منه.';
  }

  @override
  String get dotsExplainerYardstick =>
      'خيطان أمر معتاد. أما ثلاثة — إفصاح وخبر وتداول خارج المعتاد — فيحدث لعدد قليل من الشركات في الأسبوع. التقاطع سؤال وليس حكمًا: يقول إن الشركة كانت نشطة بأكثر من طريقة، ولا يقول إن ذلك جيد.';

  @override
  String dotsThreads(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count خيطًا',
      few: '$count خيوط',
      two: 'خيطان',
      one: 'خيط واحد',
    );
    return '$_temp0';
  }

  @override
  String get exchangeIndicesLabel => 'المؤشرات الثلاثة';

  @override
  String exchangeRecorded(int count, String date) {
    return '$count جلسة مسجلة، منذ $date';
  }

  @override
  String get exchangeWindowMove => 'خلال تلك الفترة';

  @override
  String get exchangeMoversLabel => 'ما ارتفع وما انخفض';

  @override
  String exchangeMoversBody(int count) {
    return 'أكبر تحركات الجلسة، من بين $count سهم تداولت بما يكفي للحساب.';
  }

  @override
  String get exchangeBreadthLabel => 'اتساع كل جلسة';

  @override
  String get exchangeBreadthBody =>
      'المرتفع والمنخفض ودون تغيير، عبر كل جلسة سجّلها التطبيق.';

  @override
  String exchangeRoseMore(int rose, int total) {
    return 'ارتفعت أسهم أكثر مما انخفض في $rose من تلك الجلسات الـ$total.';
  }

  @override
  String get exchangeOneSession =>
      'جلسة واحدة مسجلة حتى الآن. من هنا تبدأ الخطوط.';

  @override
  String get legendRose => 'ارتفع';

  @override
  String get legendFell => 'انخفض';

  @override
  String get legendUnchanged => 'دون تغيير';

  @override
  String get priceLatestSessionOnly =>
      'آخر جلسة فقط — لا توجد سلسلة منشورة لهذا السهم';

  @override
  String directoryAllCount(int count) {
    return 'الكل $count';
  }

  @override
  String get navCalendar => 'التقويم';

  @override
  String get calendarTitle => 'مواعيد سجّلتها الإفصاحات';

  @override
  String get calViewDay => 'يوم';

  @override
  String get calViewWeek => 'أسبوع';

  @override
  String get calViewMonth => 'شهر';

  @override
  String get calNothingDay => 'لا مواعيد في هذا اليوم.';

  @override
  String get calNothingRange => 'لا مواعيد في هذه الفترة.';

  @override
  String get calUpcoming => 'التالي';

  @override
  String get calToday => 'اليوم';

  @override
  String calAnnounced(String date) {
    return 'أُعلن في $date';
  }

  @override
  String calInDays(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'خلال $days يومًا',
      few: 'خلال $days أيام',
      one: 'غدًا',
      zero: 'اليوم',
    );
    return '$_temp0';
  }

  @override
  String calAgoDays(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'منذ $days يومًا',
      few: 'منذ $days أيام',
      one: 'أمس',
    );
    return '$_temp0';
  }

  @override
  String get calExplainerTitle => 'من أين تأتي هذه المواعيد';

  @override
  String get calExplainerPlain =>
      'مواعيد أعلنتها الشركة بالفعل — وليست توقعًا.';

  @override
  String get calExplainerBody =>
      'تُعلن الشركات مواعيد التوزيعات وفترات زيادة رأس المال ومواعيد الجمعيات وإخطارات التداول قبل الحدث بأيام إلى أسابيع. يقرأ هذا التطبيق تلك المواعيد من الإفصاحات ويضعها على تقويم. كل بند يعود إلى الإفصاح الذي جاء منه؛ لا شيء هنا متوقَّع.';

  @override
  String get calKindDividendPayment => 'صرف التوزيعات';

  @override
  String get calKindExDividend => 'يوم قطع الكوبون';

  @override
  String get calKindRightsOpen => 'بدء الاكتتاب في زيادة رأس المال';

  @override
  String get calKindRightsClose => 'انتهاء الاكتتاب في زيادة رأس المال';

  @override
  String get calKindRightsEntitlement => 'آخر يوم لأحقية زيادة رأس المال';

  @override
  String get calKindAssemblyAgm => 'الجمعية العامة العادية';

  @override
  String get calKindAssemblyEgm => 'الجمعية العامة غير العادية';

  @override
  String get calKindTradingResume => 'استئناف التداول';

  @override
  String get calKindTradingSuspend => 'إيقاف التداول';

  @override
  String get calKindListingEffective => 'تغيير في القيد';

  @override
  String get calKindOther => 'موعد مجدول';

  @override
  String get calFamilyCash => 'نقدي';

  @override
  String get calFamilyRights => 'حقوق';

  @override
  String get calFamilyAssembly => 'جمعية';

  @override
  String get calFamilyTrading => 'تداول';

  @override
  String get calFamilyOther => 'أخرى';
}
