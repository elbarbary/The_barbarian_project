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
  String get appTagline => 'الأسهم المصرية، بلا تجميل';

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
  String get countOutcomes => 'النتائج';

  @override
  String get theSession => 'الجلسة';

  @override
  String get youSubtitle => 'لا حاجة لحساب للقراءة';

  @override
  String get watchlist => 'قائمة المتابعة';

  @override
  String get watchlistPricesOnly =>
      'أسعار فقط. لا درجة ولا تصنيف ولا قراءة تظهر هنا — تلك في ملف الشركة، الذي تفتحه بنفسك.';

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
  String get homeAllFilings => 'كل الإفصاحات';

  @override
  String homeFilingsCount(int count) {
    return '$count إفصاحًا اليوم';
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
      'لم تتداول أي شركة بشكل غير معتاد مقارنة بمتوسطها يوم إفصاحها. الجلسة الهادئة إجابة حقيقية.';

  @override
  String get homeLatestNews => 'آخر الأخبار';

  @override
  String get homeAllNews => 'كل الأخبار';

  @override
  String homeVolumeKicker(String ratio) {
    return 'حجم التداول $ratio× المعتاد';
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
  String get tabResearch => 'الدراسة';

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
  String get thisSession => 'هذه الجلسة';

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
      'كل فترة تنشرها مباشر عن هذه الشركة، بملايين الجنيهات، كما أُودعت. اسحب جانبًا للفترات الأقدم.';

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
  String get unusualLabel => 'تداول غير معتاد';

  @override
  String unusualBody(int count, int total) {
    return '$count من $total إفصاح نحتفظ به جاء من شركة تداولت أيضًا خارج نطاقها المعتاد.';
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
    return '$count منها تسمّي شركة تداولت أيضًا خارج نطاقها المعتاد.';
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
  String finEgpMillionsPeriod(String period) {
    return 'مليون جنيه · $period';
  }

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
    return 'نحو $amount جنيه يمكن أن تخرج في جلسة واحدة هنا. فوق ذلك يصبح البيع أكثر من خُمس يوم عادي ويبدأ في تحريك السعر ضد البائع.';
  }

  @override
  String meansZeroDays(int days, int sessions) {
    return 'لم يتداول إطلاقًا في $days من آخر $sessions جلسة. في تلك الأيام لم يكن هناك سعر يستطيع المالك البيع عنده، لأنه لم يكن هناك مشترٍ.';
  }

  @override
  String meansNetProfit(String amount, String period) {
    return 'أعلن $amount مليون جنيه صافي ربح في $period.';
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
  String get homeFiledHero => 'مُودَع لدى البورصة';

  @override
  String get homeRoseAndFell => 'ما ارتفع وما انخفض';

  @override
  String get homeIndices => 'المؤشرات';

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
}
