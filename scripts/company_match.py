#!/usr/bin/env python3
"""Which listed company an Arabic headline is about.

Zero of four hundred published stories carried a ticker. The matcher looked
only at Al Borsa's own company tags, which resolve **nine** names out of 282 —
so `triage()` stamped `weight: "market"` on every story, the "which company
does this touch" layer never fired once, and the app could not join a headline
to a company screen, to a filing, or to a session.

**The previous free-text attempt failed and its lesson stands.** Splitting each
Arabic legal name into words and accepting any long one tagged a cotton-export
story with a medical-services company and a factory investment with Talaat
Moustafa on the word "مصطفى". A wrong company against a story is worse than no
company at all, because the whole value of the join is that it can be trusted.

So this is neither of those. The exchange gives us each company's full legal
name — "ابوقير للاسمدة والصناعات الكيماوية" — and a newspaper writes the street
name, "أبوقير للأسمدة". The bridge is a **discriminative key**: the first one or
two words of the legal name that are not generic corporate furniture, kept only
when no other listed company produces the same key, and matched as a whole
token run rather than as a substring.

Three rules, and each is there because dropping it breaks precision:

  * **Generic words are removed first.** "الشركة المصرية للاتصالات" leads with
    two words that name a hundred companies; the key has to reach "للاتصالات".
  * **A key shared by two companies is discarded**, not guessed between.
  * **Token-run matching, not substring.** "مصر" inside "مصراوي" is not a
    match, and Arabic's attached prefixes make substring tests dangerous.

Coverage is a function of how many Arabic names we hold — 86 today, harvested
free from the exchange's own filing titles and growing every run. This gets
better on its own without anybody writing a rule.
"""

from __future__ import annotations

import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
NAMES = HERE / "company_names_ar.json"

# Words that name no company on their own. Every one of these appears in the
# legal names of dozens of Egyptian listings.
GENERIC = {
    "الشركة", "الشركه", "العامة", "العامه", "المصرية", "المصريه",
    "الوطنية", "الوطنيه", "العربية", "العربيه", "القابضة", "القابضه",
    "المالية", "الماليه", "الدولية", "الدوليه", "المتحدة", "المتحده",
    "الحديثة", "الحديثه", "الصناعية", "الصناعيه", "التجارية", "التجاريه",
    "للاستثمار", "للاستثمارات", "الاستثمار", "والاستثمار",
    "للتنمية", "للتنميه", "والتنمية", "والتنميه",
    "للصناعات", "للصناعة", "للصناعه", "والصناعات",
    "للتجارة", "للتجاره", "والتجارة", "والتجاره",
    "للخدمات", "والخدمات", "للتعمير", "والتعمير", "للمقاولات",
    "مجموعة", "مجموعه", "شركة", "شركه", "مصر", "و", "في", "من", "على",
    # Legal-form suffixes Mubasher prints: "ش م م" is SAE.
    "ش", "م", "بنك", "البنك", "مصرف", "ذ",
    # Regions, which are where a company is rather than who it is.
    #
    # MEGM is "الشرق الأوسط لصناعة الزجاج", and its key came out as
    # "الشرق الاوسط" — so a headline about the industry minister opening a
    # plant "in the Middle East" was tagged with a glass maker. The industry
    # words are deliberately NOT here: dropping "لصناعة" as well would have
    # cost MICH and RAKT their keys and gained nothing.
    "الشرق", "الاوسط", "الغرب", "الشمال", "الجنوب",
    "افريقيا", "اسيا", "اوروبا", "العالم",
}

# Below this a key is a fragment rather than a name.
MIN_KEY_LETTERS = 6


def _fold(value: str) -> str:
    """The same fold the news pipeline uses, kept local so this module stands
    alone and can be tested without the whole builder."""
    value = re.sub(r"[ً-ْـ]", "", value)
    value = re.sub(r"[أإآٱ]", "ا", value)
    value = value.replace("ة", "ه").replace("ى", "ي").replace("ؤ", "و")
    value = value.replace("ئ", "ي")
    # Brackets and punctuation are not part of a name.
    value = re.sub(r"[^\w؀-ۿ ]+", " ", value)
    return " ".join(value.split())


def key_for(name: str) -> str | None:
    """The distinctive head of a legal name, or None when there is not one.

    **Two words, always.** A single word was allowed at first and every one it
    produced was a category rather than a name: ICID reduced to "العالمية"
    (global) and matched a story about Forbes and one about world food prices;
    ARCC reduced to "للاسمنت" (for cement) and would match any cement company
    on the exchange. A newspaper naming a company uses at least two words —
    "بالم هيلز", "نهر الخير", "القاهرة للإسكان" — and a one-word reference is
    ambiguous in the source, not just to us.

    The cost is real and it is the right side to err on: companies whose legal
    name yields only one distinctive word are simply not matched.
    """
    words = [w for w in _fold(name).split() if w not in GENERIC]
    if len(words) < 2:
        return None
    key = " ".join(words[:2])
    if len(key.replace(" ", "")) < MIN_KEY_LETTERS:
        return None
    return key


# A short name in brackets, which is how Mubasher prints the one a paper uses:
# "أبو قير للاسمدة و الصناعات الكيماوية (ابوقير للاسمدة)".
BRACKETED = re.compile(r"[（(]([^)）]{4,60})[)）]")


def keys_for(name: str) -> list[str]:
    """Every distinct key this name offers — the head, and any short form.

    A company gets more than one shot because the papers do not agree on which
    name to use. "طلعت مصطفى" and "مجموعة طلعت مصطفى القابضة" are the same
    company to a reader and different strings to a matcher.
    """
    found: list[str] = []
    for part in [BRACKETED.sub(" ", name), *BRACKETED.findall(name)]:
        key = key_for(part)
        if key and key not in found:
            found.append(key)
    return found


def build(names: dict[str, str]) -> dict[str, str]:
    """key → ticker, for the keys that name exactly one company."""
    claimed: dict[str, list[str]] = {}
    for ticker, name in names.items():
        for key in keys_for(name):
            claimed.setdefault(key, []).append(ticker)
    # A key two companies answer to is a key that identifies neither.
    unique = {k: v[0] for k, v in claimed.items() if len(set(v)) == 1}

    # And a key that sits inside somebody else's name identifies neither.
    #
    # Two companies can produce different keys and still be confusable: Mixed
    # Oils reduces to "للزيوت والصابون", which is most of Cairo Oils & Soap's
    # name, so a headline about Cairo Oils came back carrying both. The keys
    # were distinct; the discrimination was not.
    #
    # Eight keys go this way and every one is an industry descriptor —
    # "لحليج الاقطان", "للتاجير التمويلي", "اسمنت بورتلاند". Those companies
    # are simply not matched from a headline, which is the cheaper mistake:
    # this whole file exists because a wrong company against a story is worse
    # than no company at all.
    folded = {ticker: _fold(name) for ticker, name in names.items()}
    return {
        key: ticker
        for key, ticker in unique.items()
        if not any(
            other != ticker and key in name for other, name in folded.items()
        )
    }


def load() -> dict[str, str]:
    try:
        names = json.loads(NAMES.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return build(names)


def match(headline: str, keys: dict[str, str]) -> list[str]:
    """Tickers this headline names, by whole token runs."""
    tokens = _fold(headline).split()
    if not tokens:
        return []
    found: set[str] = set()
    for start in range(len(tokens) - 1):
        ticker = keys.get(" ".join(tokens[start : start + 2]))
        if ticker:
            found.add(ticker)
    return sorted(found)
