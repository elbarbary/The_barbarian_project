#!/usr/bin/env python3
"""What each kind of EGX filing is, in plain language.

**This file is the product, and none of it is model-written.** The classifier
picks which entry applies; the words below are written once, by a person, and
reviewed. That split is the whole design: a model choosing from a closed list
is doing taxonomy, which is safe, while a model composing a sentence about a
named issuer is the app speaking, which is not.

The explanations answer the question a filing never answers for itself — not
"what does this document say" but *what does this kind of event do to somebody
holding the share*. A capital increase dilutes you. A halt means you cannot
sell. An insider form means somebody connected to the company traded it. None
of that is advice; all of it is mechanism, and almost nobody is told it.

Adding a type is a one-line entry here plus its label in `LABELS`. Anything the
classifier cannot place lands in `statement`, which says so honestly rather
than guessing.
"""

from __future__ import annotations

# key -> (English label, Arabic label, what it means for a holder)
FILING_TYPES: dict[str, tuple[str, str, str]] = {
    "results": (
        "Results",
        "نتائج أعمال",
        "The company published what it earned or lost over a period. The "
        "figures are the company's own, filed with the exchange.",
    ),
    "dividend": (
        "Cash dividend",
        "توزيعات نقدية",
        "The company is paying cash to shareholders. On the day the "
        "entitlement ends, the share price drops by roughly the amount paid — "
        "the money moves from the company to the holder, it is not created.",
    ),
    "bonus_shares": (
        "Bonus shares",
        "أسهم مجانية",
        "New shares handed to existing holders at no cost. Everyone's slice "
        "stays the same size and the price per share falls to match, so this "
        "adds no value on its own — it makes each share cheaper to buy.",
    ),
    "capital_increase": (
        "Capital increase",
        "زيادة رأس المال",
        "The company is issuing new shares to raise money. If you hold shares "
        "and do not buy more, your slice of the company gets smaller.",
    ),
    "capital_decrease": (
        "Capital reduction",
        "تخفيض رأس المال",
        "The company is cancelling shares, usually to absorb accumulated "
        "losses or return capital.",
    ),
    "halt": (
        "Trading halted",
        "إيقاف التعامل",
        "Trading in the share is suspended. While it lasts, nobody can buy or "
        "sell it at any price.",
    ),
    "resume": (
        "Trading resumed",
        "إعادة التعامل",
        "The share is trading again after a suspension.",
    ),
    "insider": (
        "Insider dealing form",
        "نموذج إفصاح",
        "Somebody connected to the company — a board member, a major holder — "
        "bought or sold its shares and is required to declare it.",
    ),
    "stake": (
        "Ownership change",
        "تغيير في الملكية",
        "A large holder's stake in the company changed hands.",
    ),
    "acquisition": (
        "Acquisition or merger",
        "استحواذ أو اندماج",
        "The company is buying, selling or merging a business.",
    ),
    "assembly": (
        "Shareholders' meeting",
        "الجمعية العامة",
        "Minutes of a shareholders' meeting, recording what was put to a vote "
        "and what was decided.",
    ),
    "board": (
        "Board decisions",
        "قرارات مجلس الإدارة",
        "The board met and recorded decisions. What was decided is in the "
        "filing itself.",
    ),
    "contract": (
        "Contract or project",
        "عقد أو مشروع",
        "The company signed an agreement or started a project. A contract is "
        "revenue that has not been earned yet.",
    ),
    "funding": (
        "Borrowing",
        "تمويل أو قرض",
        "The company is raising debt — a loan, a bond, a sukuk. It is money "
        "the company must pay back, unlike shares.",
    ),
    "auditor": (
        "Auditor or accounts",
        "مراجع الحسابات",
        "Something about who checks the company's books, or a correction to "
        "figures already filed.",
    ),
    "delisting": (
        "Listing change",
        "شطب أو قيد",
        "The share's listing status is changing. A delisting means it stops "
        "trading on the exchange entirely.",
    ),
    "statement": (
        "Statement",
        "بيان",
        "A statement to the exchange that does not fall into one of the "
        "standard categories. What it says is in the filing.",
    ),
}

LABELS = list(FILING_TYPES)


def label(key: str) -> str:
    return FILING_TYPES.get(key, FILING_TYPES["statement"])[0]


def label_ar(key: str) -> str:
    return FILING_TYPES.get(key, FILING_TYPES["statement"])[1]


def meaning(key: str) -> str:
    return FILING_TYPES.get(key, FILING_TYPES["statement"])[2]


# Deterministic patterns, tried before the model.
#
# EGX filing titles are formulaic, so most of them can be placed without
# spending a call — and a regex that fires is auditable in a way a model is
# not. The model handles what is left, which is the genuinely varied prose.
import re  # noqa: E402  (kept beside the table it serves)

RULES: list[tuple[str, re.Pattern[str]]] = [
    ("halt", re.compile(r"إيقاف التعامل|وقف التعامل")),
    ("resume", re.compile(r"إعادة التعامل|استئناف التعامل")),
    ("bonus_shares", re.compile(r"أسهم مجانية|اسهم مجانية")),
    ("capital_increase", re.compile(r"زيادة رأس ?المال|زيادة رأسمال")),
    ("capital_decrease", re.compile(r"تخفيض رأس ?المال|تخفيض رأسمال")),
    ("dividend", re.compile(r"توزيع(ات)? نقدية|كوبون|توزيع أرباح|نقدية للسهم")),
    ("insider", re.compile(r"نموذج إفصاح|إفصاح بعد التنفيذ|تعاملات المطلعين")),
    ("assembly", re.compile(r"الجمعية العامة|جمعية عامة|محضر اجتماع الجمعية")),
    ("results", re.compile(r"نتائج أعمال|القوائم المالية|نتائج الأعمال|الأرباح عن الفترة")),
    ("acquisition", re.compile(r"استحواذ|اندماج|الاستحواذ")),
    ("stake", re.compile(r"حصة|حصتها|نسبة الملكية")),
    ("funding", re.compile(r"قرض|تمويل|سندات|صكوك|توريق")),
    ("delisting", re.compile(r"شطب|قيد الشركة|إلغاء القيد")),
    ("auditor", re.compile(r"مراجع الحسابات|مراقب الحسابات|تصحيح")),
    ("board", re.compile(r"مجلس (الإدارة|إدارة)|قرارات مجلس")),
    ("contract", re.compile(r"عقد|تعاقد|مشروع|بروتوكول|أمر توريد")),
]


def classify_rules(title: str) -> str | None:
    """The type, when a published pattern settles it. None means ask the model."""
    for key, pattern in RULES:
        if pattern.search(title):
            return key
    return None
