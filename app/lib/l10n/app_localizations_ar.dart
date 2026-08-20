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
  String get scannerTitle => 'ماسح الفرص';

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
  String get countQualified => 'مستوفية';

  @override
  String get countWatching => 'تحت المتابعة';

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
  String get homeAlsoFiled => 'أُفصح عنه اليوم أيضًا';

  @override
  String get homeAllFilings => 'كل الإفصاحات';

  @override
  String homeFilingsCount(int count) {
    return '$count إفصاحًا اليوم';
  }

  @override
  String get legalNotLicensedShort =>
      'غير مرخّصة من الرقابة المالية. ليست توصية.';
}
