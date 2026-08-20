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
      'استثمر جهة نشر وغير مرخّصة من الهيئة العامة للرقابة المالية. نحن لا نشتري، ولا نبيع، ولا نقدم نصيحة.';
}
