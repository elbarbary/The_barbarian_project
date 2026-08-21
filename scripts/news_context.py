#!/usr/bin/env python3
"""What a headline does to somebody holding EGX shares.

**Written by a person, chosen by code — never generated (§43).** The same split
as `filing_types.py` and `macro_types.py`, and for the same reason: a sentence
about what a cheaper barrel does to an Egyptian factory is the strongest claim
this app makes, and it has to be one somebody is prepared to defend.

This exists because of a measured failure. Every one of 174 published stories
carried the identical line — *"Names no listed company we can match, so this is
about the market or the economy rather than about a share."* — because the
ticker matcher resolves nine companies out of 282 and almost nothing matches. A
line repeated on every row is not insight, it is furniture, and a reader learns
within three rows to stop reading it.

The fix is not a better ticker matcher. Most Egyptian business news genuinely is
not about one issuer: it is about the canal, the pound, the rate, the wheat
bill. **A mechanism attaches to a subject rather than to a company**, so it can
explain a story without making a claim about any share — which is safer than
what the ticker path does, not riskier.

Two passes, most specific first:

  1. **Subject** — what the story is *about*. "قناة السويس" earns the canal
     mechanism whatever kind of event it is.
  2. **Event** — failing that, what *kind* of thing happened. A contract is
     revenue not yet earned, whoever signed it.

A story matching neither gets **no line at all**. That is the point of the
whole file: silence is honest, and a generic sentence is what we are replacing.

**Every entry stops at the mechanism** (§8, no FRA licence). The test applied to
every string here: could a reader take this as an instruction to trade? If yes
it is rewritten until the answer is no. `test_news_context.py` runs
`macro_types.directive()` over all of them so the answer cannot drift.
"""

from __future__ import annotations

import re


def normalise_ar(value: str) -> str:
    """Fold the letter forms Egyptian writers use interchangeably.

    The one implementation, kept here because this is the file with the most
    Arabic in it; `build_news_api` imports it rather than keeping a second
    copy. Without it "الاسكندرية" in a headline never matches "الإسكندرية" in
    the directory, and they are the same word — alef with and without hamza,
    teh marbuta against heh, and the yeh/alef-maqsura pair.
    """
    value = re.sub(r"[\u064b-\u0652\u0640]", "", value)
    value = re.sub(r"[أإآٱ]", "ا", value)
    value = value.replace("ة", "ه").replace("ى", "ي").replace("ؤ", "و")
    value = value.replace("ئ", "ي")
    return " ".join(value.split())


# Patterns are written below the way the words are actually spelled, and folded
# through `normalise_ar` at import so they match folded headlines. Writing them
# pre-folded would make this file unreadable to the person who has to review it.

# (key, pattern, meaning_en, meaning_ar)
#
# Order is priority. The canal beats the dollar because a canal story is a
# canal story even when it mentions dollar earnings; the specific subject is
# the one a reader wants explained.
SUBJECTS: list[tuple[str, str, str, str]] = [
    (
        "suez",
        r"قناة السويس|قناه السويس|الملاحة|الملاحه|البحر الأحمر|البحر الاحمر"
        r"|هيئة القناة|عبور السفن|suez",
        "Canal dues are dollars entering Egypt. Fewer ships means fewer "
        "dollars, and importers pay more for each one.",
        "رسوم القناة دولارات تدخل مصر. عدد أقل من السفن يعني دولارات أقل، "
        "ويدفع المستوردون أكثر مقابل كل دولار.",
    ),
    (
        "oil",
        r"النفط|البترول|الخام|برنت|أوبك|اوبك|البنزين|السولار|برميل"
        r"|oil|crude|brent|opec",
        "Egypt buys more oil than it sells, so a dearer barrel raises what "
        "every factory pays for energy and every distributor for transport.",
        "تشتري مصر من النفط أكثر مما تبيع، وارتفاع سعر البرميل يرفع ما يدفعه "
        "كل مصنع مقابل الطاقة وكل موزّع مقابل النقل.",
    ),
    (
        "gas",
        r"الغاز|المسال|حقل ظهر|الغاز الطبيعي|gas|lng",
        "Gas is the one thing Egypt both burns at home and sells abroad, so "
        "its price moves the import bill in both directions at once.",
        "الغاز هو ما تستهلكه مصر في الداخل وتبيعه في الخارج معًا، ولذلك يحرّك "
        "سعره فاتورة الاستيراد في الاتجاهين في وقت واحد.",
    ),
    (
        "gold",
        r"الذهب(?!ي)|الأونصة|الاونصه|عيار 21|عيار ٢١|المعدن الأصفر|gold|bullion",
        "Gold competes with the exchange for the same household savings, and "
        "it is how many Egyptians hedge the pound.",
        "ينافس الذهب البورصة على المدخرات نفسها، وهو وسيلة كثير من المصريين "
        "للتحوّط من تقلب الجنيه.",
    ),
    (
        "currency",
        r"الجنيه|الدولار|سعر الصرف|العملة الأجنبية|العمله الاجنبيه|الدولرة"
        r"|تعويم|النقد الأجنبي|النقد الاجنبي|exchange rate|egyptian pound",
        "What a dollar costs decides what listed importers pay for raw "
        "materials they still sell for pounds at home.",
        "ما يكلفه الدولار يحدد ما يدفعه المستوردون المقيدون بالبورصة مقابل "
        "موادهم الخام التي يبيعون منتجاتها بالجنيه في الداخل.",
    ),
    (
        "rates",
        r"سعر الفائدة|أسعار الفائدة|اسعار الفائده|البنك المركزي|لجنة السياسة "
        r"النقدية|المركزي المصري|interest rate|central bank|monetary policy",
        "The rate the central bank sets is what a bank deposit pays — the "
        "exchange's main competitor for the same savings.",
        "السعر الذي يحدده البنك المركزي هو عائد الوديعة المصرفية — منافس "
        "البورصة الأول على المدخرات نفسها.",
    ),
    (
        "inflation",
        r"التضخم|معدل التضخم|غلاء الأسعار|ارتفاع الأسعار|inflation|cpi",
        "Rising prices reach a company twice, in what it charges and in what "
        "it pays. Its filed results say which moved faster.",
        "يصل ارتفاع الأسعار إلى الشركة مرتين: فيما تتقاضاه وفيما تدفعه. "
        "ونتائجها المودعة هي التي تقول أيهما تحرك أسرع.",
    ),
    (
        "tourism",
        r"السياحة|السياحه|السياح|الفنادق|الفندقية|الغردقة|شرم الشيخ|tourism",
        "Tourism is one of Egypt's four large dollar earners, beside the "
        "canal, remittances and gas.",
        "السياحة أحد مصادر الدولار الأربعة الكبرى في مصر، إلى جانب القناة "
        "وتحويلات المصريين بالخارج والغاز.",
    ),
    (
        "remittances",
        r"تحويلات المصريين|التحويلات|المصريين بالخارج|العاملين بالخارج"
        r"|remittance",
        "Money sent home by Egyptians working abroad is the largest steady "
        "flow of foreign currency into the country.",
        "ما يرسله المصريون العاملون بالخارج هو أكبر تدفق ثابت للنقد الأجنبي "
        "إلى البلاد.",
    ),
    (
        "fdi",
        r"الاستثمار الأجنبي|الاستثمار الاجنبي|استثمارات أجنبية|استثمارات اجنبيه"
        r"|رؤوس الأموال الأجنبية|foreign direct investment",
        "Foreign money arriving to build or buy something real is currency "
        "that does not have to be repaid on a schedule.",
        "الأموال الأجنبية التي تدخل لبناء شيء حقيقي أو شرائه عملة لا يلزم "
        "ردّها في موعد محدد.",
    ),
    (
        "sovereign",
        r"صندوق النقد|البنك الدولي|الدين الخارجي|الديون|التصنيف الائتماني"
        r"|السندات الدولية|موديز|فيتش|ستاندرد|التصنيف|تصنف|imf|moody|fitch"
        r"|credit rating",
        "What Egypt pays to borrow sets the return every other Egyptian asset "
        "is measured against, shares included.",
        "ما تدفعه مصر مقابل الاقتراض يحدد العائد الذي تُقاس عليه كل الأصول "
        "المصرية الأخرى، ومنها الأسهم.",
    ),
    (
        "growth",
        r"الاقتصاد المصري|النمو الاقتصادي|الناتج المحلي|معدل النمو|نمو الاقتصاد"
        r"|gdp|economic growth",
        "Listed companies sell into this economy. A year of growth does not "
        "lift every company, but it is the backdrop results are read against.",
        "تبيع الشركات المقيدة داخل هذا الاقتصاد. وعام من النمو لا يرفع كل "
        "شركة، لكنه الخلفية التي تُقرأ أمامها النتائج.",
    ),
    (
        "crypto",
        r"بيتكوين|العملات المشفرة|العملات الرقمية|الكريبتو|bitcoin|crypto",
        "Crypto competes for the same speculative savings as the exchange, "
        "and it is not regulated by the FRA the way a listed share is.",
        "تنافس العملات المشفرة البورصة على المدخرات المضاربية نفسها، وهي غير "
        "خاضعة لرقابة الهيئة العامة للرقابة المالية كما يخضع السهم المقيد.",
    ),
    (
        "foreign_flows",
        r"المستثمرين الأجانب|المستثمرون الأجانب|المستثمرين الاجانب|صافي شراء"
        r"|صافي بيع|تدفقات|العرب والأجانب|foreign investors",
        "Foreign buying and selling on the exchange arrives and leaves in "
        "dollars, so it moves the currency as well as the index.",
        "شراء الأجانب وبيعهم في البورصة يدخل ويخرج بالدولار، ولذلك يحرّك "
        "العملة كما يحرّك المؤشر.",
    ),
    (
        "gulf",
        r"السعودية|السعوديه|الإمارات|الامارات|قطر|الكويت|الخليج|أبوظبي|ابوظبي"
        r"|دبي|صندوق سيادي|saudi|emirat|qatar|kuwait",
        "Gulf states are the largest foreign buyers of Egyptian assets, so "
        "what they decide reaches the exchange directly.",
        "دول الخليج أكبر المشترين الأجانب للأصول المصرية، ولذلك يصل ما تقرره "
        "إلى البورصة مباشرة.",
    ),
    (
        "global_markets",
        r"الاحتياطي الفيدرالي|الفيدرالي|وول ستريت|الأسواق العالمية|الاسواق "
        r"العالميه|الأسواق الناشئة|الاسواق الناشئه|ناسداك|داو جونز"
        r"|federal reserve|wall street|emerging market|nasdaq",
        "When money leaves emerging markets as a group, Egypt is sold with "
        "the group rather than on any news of its own.",
        "حين تخرج الأموال من الأسواق الناشئة كمجموعة، تُباع مصر مع المجموعة "
        "لا بسبب خبر يخصّها.",
    ),
    (
        "food",
        r"القمح|الغذاء|السلع الغذائية|السلع الغذائيه|الزيوت|السكر|الأعلاف"
        r"|الاعلاف|wheat|grain",
        "Egypt is among the world's largest wheat buyers, so food prices land "
        "on the import bill and on inflation together.",
        "مصر من أكبر مشتري القمح في العالم، ولذلك تصل أسعار الغذاء إلى فاتورة "
        "الاستيراد وإلى التضخم معًا.",
    ),
    (
        "power",
        r"الكهرباء|الطاقة المتجددة|الطاقه المتجدده|محطة كهرباء|الشبكة القومية"
        r"|طاقة شمسية|طاقه شمسيه|رياح|electricity|renewable|solar",
        "Electricity is an input for every listed manufacturer, and a change "
        "in what it costs reaches results before it reaches share prices.",
        "الكهرباء مدخل إنتاج لكل مصنّع مقيد بالبورصة، وتغيّر تكلفتها يصل إلى "
        "النتائج قبل أن يصل إلى أسعار الأسهم.",
    ),
    (
        "property",
        r"العقاري|العقاريه|العقارات|الإسكان|الاسكان|التطوير العقاري|وحدات سكنية"
        r"|وحدات سكنيه|أراضي|اراضي|real estate|property|housing",
        "Property developers are among the exchange's heaviest names, and "
        "they sell in pounds while building with imported materials.",
        "شركات التطوير العقاري من أثقل الأسماء في البورصة، وهي تبيع بالجنيه "
        "بينما تبني بمواد مستوردة.",
    ),
    (
        "banks",
        r"البنوك|القطاع المصرفي|المصارف|الودائع|القروض المصرفية|banking sector",
        "Banks carry the heaviest weight in the index, so what happens to "
        "them moves the whole market rather than one share.",
        "تحمل البنوك الوزن الأكبر في المؤشر، ولذلك يحرّك ما يصيبها السوق كله "
        "لا سهمًا واحدًا.",
    ),
    (
        "trade",
        r"الصادرات|الواردات|الميزان التجاري|التبادل التجاري|الجمارك"
        r"|export|import|trade balance|tariff|الرسوم الجمركية",
        "The gap between what Egypt buys abroad and what it sells there is "
        "what the country's dollar supply has to cover.",
        "الفجوة بين ما تشتريه مصر من الخارج وما تبيعه فيه هي ما يتعين على "
        "حصيلة الدولار تغطيته.",
    ),
    (
        "fiscal",
        r"الموازنة|الموازنه|الضرائب|الضريبة|الضريبه|الدعم|الإنفاق الحكومي"
        r"|الاستثمارات الحكومية|budget|tax|subsid",
        "What the state taxes, spends or subsidises changes both the costs "
        "and the customers of listed companies.",
        "ما تفرضه الدولة من ضرائب وما تنفقه وما تدعمه يغيّر تكاليف الشركات "
        "المقيدة وعملاءها معًا.",
    ),
]

_SUBJECTS = [
    (key, re.compile(normalise_ar(pattern), re.I), en, ar)
    for key, pattern, en, ar in SUBJECTS
]

# Failing a subject, what kind of thing happened. Keyed to `build_news_api.EVENTS`.
#
# "other" is deliberately absent: a story we can say nothing specific about gets
# no line, which is the whole point.
EVENT_MEANING: dict[str, tuple[str, str]] = {
    "results": (
        "Filed results are the only figures in a story a reader can check, "
        "because the company had to lodge them with the exchange.",
        "النتائج المودعة هي الأرقام الوحيدة في الخبر التي يستطيع القارئ "
        "التحقق منها، لأن الشركة ملزمة بإيداعها لدى البورصة.",
    ),
    "capital": (
        "A capital change alters how many shares exist, so each share already "
        "held comes to represent a different slice of the same company.",
        "تغيير رأس المال يغيّر عدد الأسهم القائمة، فيصبح كل سهم مملوك يمثل "
        "حصة مختلفة من الشركة نفسها.",
    ),
    "stake": (
        "A change of owner changes who decides, and the price paid is a "
        "valuation somebody actually accepted rather than an estimate.",
        "تغيّر المالك يغيّر من بيده القرار، والثمن المدفوع تقييم قبله طرف "
        "فعلًا لا تقدير على الورق.",
    ),
    "distribution": (
        "A distribution moves cash out of the company and to shareholders; "
        "the company is smaller by exactly that much afterwards.",
        "التوزيع ينقل نقدًا من الشركة إلى المساهمين، وتصبح الشركة بعده أصغر "
        "بالقدر نفسه.",
    ),
    "contract": (
        "A signed contract is revenue that has not been earned yet. The "
        "results filed later say when, and how much of it, arrived.",
        "العقد الموقّع إيراد لم يُكتسب بعد. والنتائج المودعة لاحقًا هي التي "
        "تقول متى وصل وكم وصل منه.",
    ),
    "board": (
        "Who runs a company decides what it does next, which is why the "
        "exchange requires a change at the top to be filed.",
        "من يدير الشركة هو من يقرر خطوتها التالية، ولهذا تُلزم البورصة بإيداع "
        "أي تغيير في القيادة.",
    ),
    "regulatory": (
        "A regulator's decision changes the rules a company trades under "
        "rather than the business it does.",
        "قرار الجهة الرقابية يغيّر القواعد التي تتداول الشركة في ظلها لا "
        "النشاط الذي تمارسه.",
    ),
    "funding": (
        "Borrowing brings cash in now and a repayment schedule later. Both "
        "land in the same set of accounts.",
        "الاقتراض يجلب نقدًا الآن وجدول سداد لاحقًا. وكلاهما يظهر في القوائم "
        "المالية نفسها.",
    ),
    "macro": (
        "Policy reaches every listed company at once, rather than one share "
        "at a time.",
        "تصل السياسة الاقتصادية إلى كل الشركات المقيدة دفعة واحدة، لا إلى سهم "
        "بعد سهم.",
    ),
}


# Whether the story is about Egypt at all.
#
# Added after measuring the first run of this file against the live feed. Three
# of the first six rows were wrong in the same way: a story about American beef
# tariffs carried "Egypt is among the world's largest wheat buyers", a China–EU
# subsidy dispute carried Egypt's fiscal mechanism, and Saudi–Iraq energy talks
# carried "Gulf states are the largest foreign buyers of Egyptian assets".
#
# Every one of those matched its subject correctly. The subject was simply
# about somewhere else. An Egyptian mechanism bolted onto a foreign story is
# the precise failure the ticker-gate was written to prevent, arriving by a new
# door, and it is worse than the repeated sentence it replaced because it looks
# specific.
#
# So: **a headline that names a foreign country and does not name Egypt gets no
# line.** One rule, applied to every subject, erring toward silence. It costs
# us the genuinely global stories that happen to name a country — a Chinese
# cut in oil imports does reach an Egyptian importer — and that is the cheaper
# mistake of the two.
EGYPT = re.compile(
    normalise_ar(
        r"مصر|المصري|المصرية|القاهرة|الجنيه|الإسكندرية|البورصة"
        # Egyptian institutions by name. A story can be entirely domestic and
        # never say the word "مصر" — "وزير البترول يبحث مع إنرجين اليونانية"
        # is Egypt's petroleum ministry, and the only country it names is
        # Greece. Without these it reads as a foreign story and loses its line.
        r"|مجلس الوزراء|رئيس الوزراء|مدبولي|وزير البترول|وزير المالية"
        r"|وزير الاستثمار|وزيرة التخطيط|وزيرة الإسكان|وزير الإسكان"
        r"|البنك المركزي|الرقابة المالية|مصلحة الضرائب|هيئة الاستثمار"
        r"|قناة السويس|egypt|egyptian|cairo"
    ),
    re.I,
)

FOREIGN = re.compile(
    normalise_ar(
        r"أمريك|الولايات المتحدة|واشنطن|الصين|صيني|بكين|اليابان|يابانی|ياباني"
        r"|كوريا|الهند|روسيا|روسي|أوكرانيا|بريطاني|بريطانيا|لندن|ألماني"
        r"|فرنسا|فرنسي|إيطالي|أوروب|تركيا|تركي|إسرائيل|إيران|العراق|سوريا"
        r"|لبنان|ليبيا|السودان|تونس|المغرب|الجزائر|نيجيريا|جنوب أفريقيا"
        r"|البرازيل|إندونيسيا|ماليزيا|فيتنام|تايوان|سنغافورة|أستراليا|كندا"
        r"|المكسيك|الأرجنتين|سويسرا|كوت ديفوار|تنزانيا|كينيا|إثيوبيا"
        r"|باكستان|بنغلاديش|السعودية|سعودي|الإمارات|إماراتي|قطر|الكويت"
        r"|البحرين|عُمان|الأردن|اليمن|اليوناني|اليونان"
    ),
    re.I,
)


def about_egypt(folded_headline: str) -> bool:
    """False when the story is plainly about somewhere else."""
    if EGYPT.search(folded_headline):
        return True
    return not FOREIGN.search(folded_headline)


def subject(folded_headline: str) -> str | None:
    """Which subject this headline is about, most specific first."""
    for key, pattern, _en, _ar in _SUBJECTS:
        if pattern.search(folded_headline):
            return key
    return None


def meaning_for(folded_headline: str, event: str) -> tuple[str, str, str | None]:
    """`(english, arabic, subject_key)` — empty strings when we can say nothing.

    `folded_headline` must already be through `normalise_ar`, because the
    patterns above are matched against folded text.
    """
    if about_egypt(folded_headline):
        for key, pattern, en, ar in _SUBJECTS:
            if pattern.search(folded_headline):
                return en, ar, key
    en, ar = EVENT_MEANING.get(event, ("", ""))
    return en, ar, None


# Arabic for the event labels in `build_news_api.EVENTS`, so the chip reads in
# the language the rest of the row is written in (§41).
EVENT_LABEL_AR: dict[str, str] = {
    "results": "نتائج أعمال",
    "capital": "تغيير رأس المال",
    "stake": "تغيّر ملكية",
    "distribution": "توزيعات",
    "contract": "عقد أو مشروع",
    "board": "مجلس الإدارة",
    "regulatory": "الرقابة أو البورصة",
    "funding": "تمويل أو دين",
    "macro": "الاقتصاد والسياسة",
}
