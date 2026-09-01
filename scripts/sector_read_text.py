#!/usr/bin/env python3
"""A sector's read, written from its own counts. No model, no key, no budget.

`build_sector_reads.py` asks Gemini for this paragraph under three guards: say
where the companies move together, never quote a figure, never advise. Those
guards describe a function. The counts are already computed, the vocabulary is
fixed, and the only judgement involved is which of eight metrics leads — so the
paragraph can be *derived* rather than generated, and then it cannot hallucinate
a figure, cannot slip into advice, and cannot fail to exist.

That last one is why this is here. The sectors were re-keyed to the exchange's
own taxonomy, every slug changed, and the model reads — cached per slug, behind
a Gemini key with no credit on it — stopped resolving for fourteen of seventeen
sectors. Those fourteen fell back to a one-line "N of M rose" and the sector
screen had nothing to open. The three that still matched were worse: a slug
collision served Finance a four-sentence read written when Finance held
eighty-three companies and a quarter of them were property developers.

So a read is derived here for every sector, and a stored model read is used only
when it still describes the companies now in the sector (see `build_sectors`).

The output passes the same `vet()` the model's does — no digits, no directive —
and `test_sector_read_text` runs that vetting over every shape this can emit.
"""

from __future__ import annotations

# Rising and falling, as a phrase about companies. The verb carries the
# direction, so no sentence here needs a number to say which way it went.
PHRASE = {
    "profit":    ("reporting higher net profit", "reporting lower net profit"),
    "eps":       ("earning more per share", "earning less per share"),
    "assets":    ("widening their asset base", "shrinking their asset base"),
    "roe":       ("improving return on equity", "giving up return on equity"),
    "roa":       ("improving return on assets", "giving up return on assets"),
    "cash_conversion": ("converting more of their reported profit into cash",
                        "converting less of their reported profit into cash"),
    "debt_equity": ("carrying more debt against equity",
                    "carrying less debt against equity"),
    "pe":        ("trading at a higher multiple of earnings",
                  "trading at a lower multiple of earnings"),
}

PHRASE_AR = {
    "profit":    ("تسجل أرباحاً صافية أعلى", "تسجل أرباحاً صافية أقل"),
    "eps":       ("تحقق ربحية أعلى للسهم", "تحقق ربحية أقل للسهم"),
    "assets":    ("توسّع قاعدة أصولها", "تقلّص قاعدة أصولها"),
    "roe":       ("تحسّن العائد على حقوق الملكية",
                  "تتراجع في العائد على حقوق الملكية"),
    "roa":       ("تحسّن العائد على الأصول", "تتراجع في العائد على الأصول"),
    "cash_conversion": ("تحوّل قدراً أكبر من أرباحها المعلنة إلى نقد",
                        "تحوّل قدراً أقل من أرباحها المعلنة إلى نقد"),
    "debt_equity": ("تحمل ديوناً أكبر مقابل حقوق الملكية",
                    "تحمل ديوناً أقل مقابل حقوق الملكية"),
    "pe":        ("تتداول عند مضاعف ربحية أعلى", "تتداول عند مضاعف ربحية أقل"),
}

NOUN = {
    "profit": "net profit", "eps": "earnings per share",
    "assets": "the asset base", "roe": "return on equity",
    "roa": "return on assets", "cash_conversion": "cash conversion",
    "debt_equity": "debt to equity", "pe": "the price-to-earnings multiple",
}

# Arabic verbs agree with their subject. "قاعدة" and "ربحية" are feminine and
# take تظل; the rest take يظل. Without this the split sentence said
# "ويظل قاعدة الأصول", which is the kind of error that makes a reader stop
# trusting the whole paragraph.
FEMININE_AR = {"assets", "eps"}

NOUN_AR = {
    "profit": "صافي الربح", "eps": "ربحية السهم",
    "assets": "قاعدة الأصول", "roe": "العائد على حقوق الملكية",
    "roa": "العائد على الأصول", "cash_conversion": "التحويل النقدي",
    "debt_equity": "الدين إلى حقوق الملكية", "pe": "مضاعف الربحية",
}

# Which metric leads when two are equally one-sided. The balance sheet and the
# income line before the market's own reading of them.
ORDER = ["profit", "eps", "assets", "roe", "roa",
         "cash_conversion", "debt_equity", "pe"]

# The question the paragraph ends on, keyed by what contradicts the lead. A
# question carries a reader into the companies without telling them anything.
QUESTION = {
    "cash_conversion": ("Is the reported profit arriving as cash?",
                        "هل تصل الأرباح المعلنة إلى النقد؟"),
    "profit": ("Is the movement reaching the income line?",
               "هل تصل هذه الحركة إلى خط الدخل؟"),
    "eps": ("Is the movement reaching what a share earns?",
            "هل تصل هذه الحركة إلى ما يكسبه السهم؟"),
    "assets": ("Is the balance sheet moving with it?",
               "هل تتحرك الميزانية معها؟"),
    "roe": ("Is the equity earning its keep?",
            "هل تحقق حقوق الملكية عائدها؟"),
    "roa": ("Are the assets earning their keep?",
            "هل تحقق الأصول عائدها؟"),
    "debt_equity": ("What is the borrowing paying for?",
                    "فيمَ يُنفَق الاقتراض؟"),
    "pe": ("Where do the multiples sit against that movement?",
           "أين تقف المضاعفات من هذه الحركة؟"),
}

FALLBACK_Q = ("Which companies are moving against the sector?",
              "أي الشركات تتحرك عكس القطاع؟")

def _word(count: int, readable: int, ar: bool = False) -> str:
    """A proportion in words. Never a figure — that is the whole point.

    Exactly half is "about half", not "more than half", so the two sides of a
    split never read as adding to more than the sector.
    """
    share = (count / readable) if readable else 0.0
    if share >= 0.85:
        return "الغالبية العظمى من" if ar else "nearly all"
    if share >= 0.60:
        return "معظم" if ar else "most"
    if share > 0.50:
        return "أكثر من نصف" if ar else "more than half"
    if share >= 0.40:
        return "نحو نصف" if ar else "about half"
    if share >= 0.25:
        return "بعض" if ar else "some"
    return "قلة من" if ar else "a handful"


def _definite(name: str | None) -> str:
    """The exchange's Arabic sector names, with the article they are filed without.

    EGX publishes "بنوك" and "عقارات", so the sentence read "in a sector called
    banks". Arabic script only — a Latin fallback name takes no article.
    """
    text = (name or "").strip()
    if not text or text.startswith("ال") or not any("\u0600" <= c <= "\u06ff" for c in text):
        return text
    return "ال" + text


def _rows(movement: list[dict]) -> list[dict]:
    """Movement rows that carry a direction and at least one readable company."""
    out = []
    for row in movement or []:
        key = row.get("key")
        if key not in PHRASE:
            continue
        rising = int(row.get("rising") or 0)
        falling = int(row.get("falling") or 0)
        flat = int(row.get("flat") or 0)
        readable = rising + falling + flat
        if readable <= 0:
            continue
        lean = max(rising, falling) / readable
        out.append({"key": key, "rising": rising, "falling": falling,
                    "flat": flat, "readable": readable, "lean": lean,
                    "up": rising >= falling})
    return out


def _one_sided(row: dict, sector: str, ar: bool) -> str:
    """<word> of the companies are <doing the thing>."""
    key, up = row["key"], row["up"]
    count = row["rising"] if up else row["falling"]
    word = _word(count, row["readable"], ar)
    phrase = (PHRASE_AR if ar else PHRASE)[key][0 if up else 1]
    if ar:
        return f"في قطاع {sector}، {word} الشركات التي لها قراءة {phrase}."
    return f"Across {sector}, {word} of the companies with a reading are {phrase}."


def _split(row: dict, ar: bool) -> str:
    """A metric that does not move together, said as a split rather than a lean."""
    key, up = row["key"], row["up"]
    count = row["rising"] if up else row["falling"]
    word = _word(count, row["readable"], ar)
    phrase = (PHRASE_AR if ar else PHRASE)[key][0 if up else 1]
    noun = (NOUN_AR if ar else NOUN)[key]
    if ar:
        verb = "وتظل" if key in FEMININE_AR else "ويظل"
        return (f"{verb} {noun} القراءة المنقسمة: {word} الشركات {phrase}، "
                f"والبقية تتحرك في الاتجاه الآخر.")
    return (f"{noun[0].upper() + noun[1:]} is the split reading, with {word} "
            f"{phrase} and the rest moving the other way.")


def describe(sector: str, movement: list[dict],
             sector_ar: str | None = None) -> dict | None:
    """The sector's read in English and Arabic, or None when too little moves."""
    rows = _rows(movement)
    if len(rows) < 2 or not (sector or "").strip():
        return None
    sector = str(sector).strip()
    name_ar = _definite(sector_ar) or sector

    rows.sort(key=lambda r: (-r["lean"], ORDER.index(r["key"])))
    lead = rows[0]
    rest = rows[1:]

    # The sentence that follows the lead: the next metric that moves the same
    # way it does, so the paragraph opens with what the sector shares.
    agrees = next((r for r in rest if r["lean"] >= 0.5 and r["up"] == lead["up"]), None)
    # And the one that does not — a split, or a lean the other way. This is the
    # sentence a reader actually needs; it is where the sector disagrees with
    # itself.
    against = next((r for r in rest if r["lean"] < 0.6), None)
    if against is None:
        against = next((r for r in rest if r["up"] != lead["up"]), None)

    def build(ar: bool) -> str:
        parts = [_one_sided(lead, name_ar if ar else sector, ar)]
        if agrees is not None and agrees is not against:
            key, up = agrees["key"], agrees["up"]
            count = agrees["rising"] if up else agrees["falling"]
            word = _word(count, agrees["readable"], ar)
            phrase = (PHRASE_AR if ar else PHRASE)[key][0 if up else 1]
            parts.append(f"و{word} الشركات {phrase} كذلك." if ar
                         else f"{word[0].upper() + word[1:]} are also {phrase}.")
        if against is not None:
            if against["lean"] < 0.6:
                parts.append(_split(against, ar))
            else:
                key, up = against["key"], against["up"]
                count = against["rising"] if up else against["falling"]
                word = _word(count, against["readable"], ar)
                phrase = (PHRASE_AR if ar else PHRASE)[key][0 if up else 1]
                parts.append(f"وفي المقابل، {word} الشركات {phrase}." if ar
                             else f"Against that, {word} are {phrase}.")
        question = QUESTION.get(against["key"] if against else "", FALLBACK_Q)
        parts.append(question[1 if ar else 0])
        return " ".join(parts)

    return {"read": build(False), "read_ar": build(True), "source": "computed"}
