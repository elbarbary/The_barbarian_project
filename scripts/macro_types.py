#!/usr/bin/env python3
"""What a number outside the exchange does to somebody holding EGX shares.

**This file is the product, and none of it is model-written.** It is the same
split as `filing_types.py`: code chooses which entry applies, a person writes
the words, and the words are reviewed before they ship. That is not a stylistic
preference. A sentence about what a rise in oil does to Egyptian industry is the
strongest claim this app makes anywhere, and it has to be one somebody is
prepared to defend.

**Every entry stops at the mechanism.** "Canal earnings fall, which is dollars
Egypt does not receive" is a mechanism. "So sell industrials" is advice, and the
publisher holds no FRA licence (§8). The test is simple and it is applied to
every line here: could a reader take this sentence as an instruction to trade?
If yes, it is rewritten until the answer is no.

The chain is written out in full rather than asserted, because a reader who can
follow it can also disagree with it — and a reader who cannot follow it should
not be trusting it.

Each entry is `(label, label_ar, meaning, meaning_ar, chain, chain_ar,
yardstick, yardstick_ar)`:

  * `label` names the series
  * `meaning` is one sentence: what this is, for somebody who is not a trader
  * `chain` is how it reaches an Egyptian share, step by published step
  * `yardstick` is what would count as unusual — which for every series here
    is *nobody publishes a band*, said plainly rather than left blank. The app
    was rendering a section heading in this slot: four macro cards each opened
    a sheet whose body under "WHAT COUNTS AS UNUSUAL" read, in full, "Why this
    reaches Egyptian shares".
"""

from __future__ import annotations

MACRO_TYPES: dict[str, tuple[str, str, str, str, str, str, str, str]] = {
    "suez": (
        "Suez Canal traffic",
        "حركة قناة السويس",
        "How many ships passed through the canal. Egypt charges every one of "
        "them, in dollars.",
        "عدد السفن التي عبرت القناة. تتقاضى مصر رسومًا عن كل واحدة منها، "
        "بالدولار.",
        "Canal dues are one of the largest sources of foreign currency Egypt "
        "earns. Fewer ships means fewer dollars arriving. When dollars are "
        "scarcer, importers pay more for them — and most listed Egyptian "
        "manufacturers pay for raw materials abroad while their revenue "
        "arrives in pounds.",
        "رسوم القناة من أكبر مصادر النقد الأجنبي لمصر. عدد أقل من السفن يعني "
        "دولارات أقل تدخل البلاد. وحين يقل الدولار يدفع المستوردون أكثر للحصول "
        "عليه — ومعظم المصنّعين المقيدين بالبورصة يشترون موادهم الخام من الخارج "
        "ويبيعون في الداخل.",
        "No published band says what an ordinary week for the canal is, so "
        "this app does not call any one reading unusual. The number is here "
        "to be read against the ones before it.",
        "لا يوجد نطاق منشور يحدد ما هو الأسبوع العادي لحركة القناة، ولذلك لا "
        "يصف هذا التطبيق أي قراءة بأنها غير معتادة. الرقم هنا ليُقرأ في ضوء "
        "ما سبقه.",
    ),
    "brent": (
        "Brent crude",
        "خام برنت",
        "The price of a barrel of oil, which Egypt buys more of than it sells.",
        "سعر برميل النفط، وهو ما تشتريه مصر أكثر مما تبيعه.",
        "A higher barrel raises the import bill and the subsidy bill at the "
        "same time. It also raises what every factory pays for energy and "
        "every distributor pays for transport — costs that reach a company's "
        "results before its share price.",
        "ارتفاع سعر البرميل يرفع فاتورة الاستيراد وفاتورة الدعم معًا. كما يرفع "
        "ما يدفعه كل مصنع مقابل الطاقة وكل موزّع مقابل النقل — وهي تكاليف تصل "
        "إلى نتائج الشركة قبل أن تصل إلى سعر سهمها.",
        "No published band says what an ordinary day for oil is, so this app "
        "does not call any one day's move unusual. The number is here to be "
        "read against the ones before it.",
        "لا يوجد نطاق منشور يحدد ما هو اليوم العادي للنفط، ولذلك لا يصف هذا "
        "التطبيق حركة يوم واحد بأنها غير معتادة. الرقم هنا ليُقرأ في ضوء ما "
        "سبقه.",
    ),
    "wti": (
        "WTI crude",
        "خام غرب تكساس",
        "The American oil benchmark, quoted beside Brent so the two can be "
        "compared.",
        "المؤشر الأمريكي للنفط، ويُذكر بجانب برنت للمقارنة بينهما.",
        "Egypt prices against Brent rather than WTI, so this is here as a "
        "cross-check: when the two move apart it is usually something local to "
        "one market rather than a change in the world price of oil.",
        "تسعّر مصر مقابل برنت لا مقابل غرب تكساس، ولذلك يظهر هنا للمقارنة: حين "
        "يفترق المؤشران يكون السبب غالبًا محليًا في أحد السوقين لا تغيّرًا في "
        "سعر النفط عالميًا.",
        "No published band says what an ordinary day for oil is, so this app "
        "does not call any one day's move unusual. What is worth watching "
        "here is the gap to Brent rather than the level.",
        "لا يوجد نطاق منشور يحدد ما هو اليوم العادي للنفط، ولذلك لا يصف هذا "
        "التطبيق حركة يوم واحد بأنها غير معتادة. والجدير بالمتابعة هنا هو "
        "الفارق عن برنت لا المستوى نفسه.",
    ),
    "gold": (
        "Gold",
        "الذهب",
        "What an ounce costs. In Egypt gold is not a curiosity — it is where a "
        "great many households keep their savings.",
        "سعر الأونصة. الذهب في مصر ليس فضولًا — بل هو المكان الذي تحفظ فيه "
        "أسر كثيرة مدخراتها.",
        "Gold competes with the exchange for the same savings. When it rises "
        "hard, money that might have reached shares goes into metal instead; "
        "when it is flat, some of that money looks elsewhere. It is also the "
        "way many "
        "Egyptians hedge the pound, so it tends to move when confidence in the "
        "currency moves.",
        "ينافس الذهب البورصة على المدخرات نفسها. فحين يرتفع بقوة تتجه أموال "
        "كانت ستشتري أسهمًا إلى شراء المعدن، وحين يستقر يبحث بعضها عن وجهة "
        "أخرى. وهو أيضًا وسيلة كثير من المصريين للتحوّط من تقلب الجنيه، ولذلك "
        "يتحرك عادةً حين تتحرك الثقة في العملة.",
        "No published band says what an ordinary day for gold is, so this app "
        "does not call any one day's move unusual. The number is here to be "
        "read against the ones before it.",
        "لا يوجد نطاق منشور يحدد ما هو اليوم العادي للذهب، ولذلك لا يصف هذا "
        "التطبيق حركة يوم واحد بأنها غير معتادة. الرقم هنا ليُقرأ في ضوء ما "
        "سبقه.",
    ),
    "silver": (
        "Silver",
        "الفضة",
        "The other metal Egyptians hold, kept for the same reason as gold and "
        "used in industry as well.",
        "المعدن الآخر الذي يقتنيه المصريون، يُقتنى للسبب نفسه الذي يُقتنى "
        "من أجله الذهب، ويُستخدم في الصناعة أيضًا.",
        "It follows gold most of the time, so the interesting case is when it "
        "does not: silver is consumed by manufacturing in a way gold is not, "
        "and the two parting company usually says something about industrial "
        "demand rather than about savings.",
        "يتبع الذهب في معظم الأوقات، ولذلك فالحالة اللافتة هي حين لا يتبعه: "
        "تستهلك الصناعة الفضة على نحو لا ينطبق على الذهب، وافتراق المعدنين "
        "يقول عادةً شيئًا عن الطلب الصناعي لا عن المدخرات.",
        "No published band says what an ordinary day for silver is, so this "
        "app does not call any one day's move unusual. The case worth "
        "noticing is when it parts company with gold.",
        "لا يوجد نطاق منشور يحدد ما هو اليوم العادي للفضة، ولذلك لا يصف هذا "
        "التطبيق حركة يوم واحد بأنها غير معتادة. والحالة الجديرة بالانتباه هي "
        "حين تفترق عن الذهب.",
    ),
    "gdp_growth": (
        "Economic growth",
        "نمو الاقتصاد",
        "How much bigger the Egyptian economy got over a year.",
        "مقدار ما كبر به الاقتصاد المصري خلال عام.",
        "Listed companies sell into this economy. Growth does not lift every "
        "company and it does not lift them equally, but a year of it is the "
        "backdrop every set of results is read against.",
        "تبيع الشركات المقيدة داخل هذا الاقتصاد. والنمو لا يرفع كل شركة ولا "
        "يرفعها بالقدر نفسه، لكنه الخلفية التي تُقرأ أمامها كل نتائج الأعمال.",
        "Growth is published once a quarter by one body, and there is no band "
        "that makes a single reading ordinary or unusual. It is a backdrop, "
        "not a signal.",
        "يُنشر النمو مرة كل ربع سنة من جهة واحدة، ولا يوجد نطاق يجعل قراءة "
        "منفردة معتادة أو غير معتادة. إنه خلفية لا إشارة.",
    ),
    "inflation": (
        "Inflation",
        "التضخم",
        "How much faster prices rose over a year.",
        "مقدار تسارع ارتفاع الأسعار خلال عام.",
        "Inflation reaches a company twice and in opposite directions: it "
        "raises what it charges and it raises what it pays. Which of the two "
        "moves faster is the whole question, and it is answered in the "
        "company's own filed results rather than here.",
        "يصل التضخم إلى الشركة مرتين وفي اتجاهين متعاكسين: يرفع ما تتقاضاه "
        "ويرفع ما تدفعه. وأي الاثنين أسرع هو السؤال كله، والإجابة عنه في "
        "نتائج الشركة المودعة نفسها لا هنا.",
        "The rate is published monthly and every reading is real; there is no "
        "band that makes one of them unusual. What it does to a given company "
        "is in that company's own filed results.",
        "يُنشر المعدل شهريًا وكل قراءة منه حقيقية؛ ولا يوجد نطاق يجعل إحداها "
        "غير معتادة. وأثره على شركة بعينها موجود في نتائجها المودعة نفسها.",
    ),
    "fdi": (
        "Foreign direct investment",
        "الاستثمار الأجنبي المباشر",
        "Money brought into Egypt from abroad to build or buy something real.",
        "أموال تدخل مصر من الخارج لبناء شيء حقيقي أو شرائه.",
        "This is foreign currency arriving that does not have to be repaid on a "
        "schedule, unlike borrowing. It is the same dollar pool the canal feeds "
        "and importers draw on.",
        "هذه عملة أجنبية تدخل البلاد دون التزام بسدادها في موعد، بخلاف "
        "الاقتراض. وهي تصب في بركة الدولار نفسها التي تغذيها القناة ويسحب "
        "منها المستوردون.",
        "Published quarterly and revised afterwards, so a single reading is "
        "not a turning point and this app does not present it as one.",
        "يُنشر ربع سنوي ويُراجَع لاحقًا، ولذلك فالقراءة المنفردة ليست نقطة "
        "تحول ولا يقدّمها هذا التطبيق على أنها كذلك.",
    ),
    "remittances": (
        "Remittances",
        "تحويلات المصريين بالخارج",
        "What Egyptians working abroad sent home.",
        "ما يرسله المصريون العاملون في الخارج إلى بلادهم.",
        "The largest single flow of foreign currency into Egypt in most years, "
        "and the steadiest. It reaches the exchange the same way the canal "
        "does — through what a dollar costs an importer.",
        "أكبر تدفق منفرد للنقد الأجنبي إلى مصر في معظم السنوات، وأكثرها ثباتًا. "
        "ويصل إلى البورصة بالطريقة نفسها التي تصل بها القناة — عبر ما يكلفه "
        "الدولار للمستورد.",
        "Published monthly with a lag, and seasonal — the months around "
        "Ramadan and the summer are not comparable with the rest — so no "
        "single month is called unusual here.",
        "تُنشر شهريًا بعد فترة، وهي موسمية — فشهور رمضان والصيف لا تُقارن "
        "ببقية الشهور — ولذلك لا يوصف أي شهر منفرد هنا بأنه غير معتاد.",
    ),
}

LABELS = list(MACRO_TYPES)


def label(key: str) -> str:
    return MACRO_TYPES[key][0] if key in MACRO_TYPES else key


def label_ar(key: str) -> str:
    return MACRO_TYPES[key][1] if key in MACRO_TYPES else ""


def meaning(key: str) -> str:
    return MACRO_TYPES[key][2] if key in MACRO_TYPES else ""


def meaning_ar(key: str) -> str:
    return MACRO_TYPES[key][3] if key in MACRO_TYPES else ""


def chain(key: str) -> str:
    return MACRO_TYPES[key][4] if key in MACRO_TYPES else ""


def chain_ar(key: str) -> str:
    return MACRO_TYPES[key][5] if key in MACRO_TYPES else ""


def yardstick(key: str) -> str:
    return MACRO_TYPES[key][6] if key in MACRO_TYPES else ""


def yardstick_ar(key: str) -> str:
    return MACRO_TYPES[key][7] if key in MACRO_TYPES else ""


# Two different checks, because there are two different authors.
#
# `FORBIDDEN` is a blunt word list and it is applied to **model drafts**, where
# over-refusing costs nothing: a rejected draft falls back to the sentence a
# person already wrote. It is deliberately crude — a model that reaches for
# "cheap" is a model to stop reading.
FORBIDDEN = (
    "buy", "sell", "should", "recommend", "advice", "target price",
    "undervalued", "overvalued", "cheap", "expensive", "opportunity",
    "invest in", "avoid", "stop loss", "take profit",
)

import re  # noqa: E402  (kept beside the patterns it serves)

# `DIRECTIVE` is applied to **the prose in this file**, and it looks for the
# shape of an instruction rather than for a verb.
#
# The distinction is not pedantry. "Egypt buys more oil than it sells" is a fact
# about a country's trade balance; "buy oil companies" is advice. A word list
# cannot tell them apart, and running the blunt one over hand-written prose just
# forces the prose to get worse — the first pass here rewrote three clear
# sentences into worse ones before that became obvious.
#
# So this matches an instruction aimed at a reader: a trade verb pointed at
# somebody, an imperative opening, or a valuation judgement.
DIRECTIVE = (
    re.compile(r"\b(you|investors|traders|holders|readers)\s+(should|must|ought|can)\b", re.I),
    re.compile(r"\bshould\s+(buy|sell|hold|own|exit|enter|add|trim)\b", re.I),
    re.compile(r"(^|[.!?]\s+)(buy|sell|hold|avoid|exit)\b", re.I),
    re.compile(r"\b(cheap|expensive|undervalued|overvalued|bargain|overpriced)\b", re.I),
    re.compile(r"\b(an?\s+)?(opportunity|opportunities)\s+to\b", re.I),
    re.compile(r"\b(target price|price target|stop loss|take profit)\b", re.I),
    re.compile(r"\b(we|i)\s+(recommend|suggest|advise)\b", re.I),

    # Arabic, and the shape rather than the stem.
    #
    # Every Arabic check in `test_macro` passed vacuously: the patterns above
    # are Latin word regexes and half the prose they are run over is Arabic,
    # so `meaning_ar` and `chain_ar` were never examined by anything. The
    # sentences this file exists to stop would all have shipped.
    #
    # No `\b` anywhere. Dart's word boundary is ASCII-only and Python's is
    # barely better here — Arabic attaches proclitics directly to the word, so
    # `\bتوصية\b` misses "وتوصية بالشراء" and `\bاشترِ\b` matches nothing at
    # all, because the trailing kasra is not a word character.
    #
    # And no bare valuation adjective: "الأرخص" is a legitimate factual
    # comparison between two metals' prices. What is matched is an instruction
    # aimed at somebody — an imperative to trade, an obligation, or a target.
    re.compile("اشترِ|اشتري|اشتروا|بِع |بيعوا|احتفظ ب"),
    re.compile(r"(يجب|ينبغي|عليك|عليكم)\s*(أن\s*)?(تشتري|تبيع|تحتفظ|الشراء|البيع)"),
    re.compile(r"توصي[ةا]\s*(ب|بال)?(شراء|بيع)|نوصي|ننصح"),
    re.compile("هدف السعر|السعر المستهدف|وقف الخسارة|جني الأرباح"),
    re.compile("عائد متوقع|أرباح متوقعة"),
    re.compile("فرصة (شراء|للشراء|استثمارية)"),
)


def directive(text: str) -> str | None:
    """The instruction this sentence contains, or None when it only describes."""
    for pattern in DIRECTIVE:
        found = pattern.search(text)
        if found:
            return found.group(0).strip()
    return None
