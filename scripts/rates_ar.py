#!/usr/bin/env python3
"""The rates document in Arabic.

`rates/latest.json` carried sixteen rows and not one Arabic string — the
substring `_ar` did not appear in the file at all. So an Arabic reader met
"One US dollar costs 50.89 pounds.", the gold card's karat prose, and all three
index rows on Home in English, on a screen where everything around them was
translated.

**Written by a person, chosen by code**, the same split as `filing_types`,
`macro_types` and `news_context`. The numbers are formatted by the caller and
substituted in; nothing here is generated and nothing here is a translation of
a sentence that was itself generated.

Arabic reads right to left and these sentences carry Latin digits and a Latin
ticker, so each template puts the number where it belongs in Arabic rather than
where it fell in English.
"""

from __future__ import annotations

# Index and world-row labels. The exchange's own indices keep their Latin
# names — "EGX 30" is what the exchange prints and what a reader says out loud.
LABELS = {
    "EGX30": "إيجي إكس 30",
    "EGX70EWI": "إيجي إكس 70",
    "EGX100EWI": "إيجي إكس 100",
    "SP:SPX": "ستاندرد آند بورز 500",
    "NASDAQ:IXIC": "ناسداك",
    "TVC:UKX": "فوتسي 100",
    "TADAWUL:TASI": "تاسي السعودي",
    "NYMEX:CL1!": "النفط",
    "COMEX:HG1!": "النحاس",
    "USD": "الدولار الأمريكي",
    "EUR": "اليورو",
    "GBP": "الجنيه الإسترليني",
    "SAR": "الريال السعودي",
    "AED": "الدرهم الإماراتي",
    "KWD": "الدينار الكويتي",
    "XAU": "الذهب",
    "XAG": "الفضة",
}

# What each row is, and why it is on the screen.
YARDSTICKS = {
    "EGX30": "أكبر ثلاثين شركة مقيدة وأكثرها تداولًا. حركة المؤشر تقول ما فعله "
    "السوق ككل، ولا تقول شيئًا عن أي شركة بعينها فيه.",
    "EGX70EWI": "السبعون التالية، لكل منها الوزن نفسه. حركة المؤشر تقول ما "
    "فعله السوق ككل، ولا تقول شيئًا عن أي شركة بعينها فيه.",
    "EGX100EWI": "الثلاثون والسبعون معًا. حركة المؤشر تقول ما فعله السوق ككل، "
    "ولا تقول شيئًا عن أي شركة بعينها فيه.",
    "SP:SPX": "أكبر الشركات الأمريكية. حين تهبط القاهرة ونيويورك في اليوم "
    "نفسه، يكون السبب عادةً غير مصري.",
    "NASDAQ:IXIC": "التكنولوجيا الأمريكية. أكثر المؤشرات الكبرى تقلبًا، وأولها "
    "حركة حين تتغير الشهية للمخاطرة.",
    "TVC:UKX": "أكبر الشركات المقيدة في لندن.",
    "TADAWUL:TASI": "بورصة السعودية — أقرب سوق كبير، والسوق الذي يشاركنا أخبار "
    "المنطقة.",
    "NYMEX:CL1!": "الخام، للبرميل بالدولار. مصر تنتجه وتستورده معًا، وهو يحدد "
    "تكلفة كل ما يتحرك.",
    "COMEX:HG1!": "للرطل بالدولار. وهو في كل كابل وكل مبنى، ما يجعله قراءة على "
    "الطلب على البناء في العالم.",
    "XAU": "الذهب في مصر ليس فضولًا — بل هو المكان الذي تحفظ فيه أسر كثيرة "
    "مدخراتها.",
    "XAG": "المعدن الآخر الذي يقتنيه المصريون، ويُستخدم في الصناعة أيضًا.",
}

# The reference-rate caveat, identical for every pair.
CURRENCY_YARDSTICK = (
    "هذا هو السعر المرجعي المنشور من تغذية البنك المركزي، وليس السعر الذي "
    "يعطيه لك صرّاف على الشباك."
)


def label(key: str, fallback: str = "") -> str:
    return LABELS.get(key, fallback)


def yardstick(key: str, fallback: str = "") -> str:
    return YARDSTICKS.get(key, fallback)


def index_plain(key: str, pct: float, fallback_label: str) -> str:
    """"إيجي إكس 30 ارتفع 0.41% في الجلسة." """
    name = label(key, fallback_label)
    verb = "ارتفع" if pct >= 0 else "تراجع"
    return f"{name} {verb} {abs(pct):.2f}% في الجلسة."


def world_plain(key: str, pct: float, fallback_label: str) -> str:
    name = label(key, fallback_label)
    verb = "ارتفع" if pct >= 0 else "تراجع"
    return f"{name} {verb} {abs(pct):.2f}% اليوم."


def currency_plain(code: str, money: str, fallback_label: str) -> str:
    name = label(code, fallback_label)
    return f"{name} يساوي {money} جنيهًا."


def metal_plain(key: str, money: str, fallback_label: str) -> str:
    name = label(key, fallback_label)
    return f"جرام {name} يساوي {money} جنيهًا."


def index_workings(level: str, points: str, pct: float, rising: bool) -> str:
    sign = "+" if rising else "−"
    return (
        f"{level} الآن\n"
        f"{sign} {points} نقطة في الجلسة\n"
        f"= {sign}{abs(pct):.2f}%"
    )


def world_workings(level: str, pct: float) -> str:
    sign = "+" if pct >= 0 else "−"
    return f"{level} الآن، {sign}{abs(pct):.2f}% في اليوم."


def currency_workings(money: str, fallback_label: str, code: str) -> str:
    name = label(code, fallback_label)
    return f"{money} جنيهًا مقابل {name}"


def karat_workings(pure: str, karat: int, value: str) -> str:
    return f"{pure} للجرام عيار 24\n× {karat}/24 نقاء\n= {value}"
