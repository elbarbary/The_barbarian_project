#!/usr/bin/env python3
"""Deciding when two filings name the same holder.

The exchange publishes a scan and somebody typed a name into it. The same
person reaches this project as `أيهاب خليل خليفه خليفه` one week and
`ايهاب خليل خليفه خليفه` the next; the same firm files once as
`شركة اموال العربيه للاقطان` and once as `شركه ...` — taa marbuta against
haa, one letter. Treated as different holders they show up as two nodes each
holding ~41% of KABO, and the company reads as 82% disclosed when the truth is
41%. One of those numbers is a claim about a real company's register.

So names are folded before they are compared. That much is spelling and
carries no judgement.

Beyond spelling it needs care, because Egyptian names are lineages. A son is
`<his name> <father> <grandfather> <family>` and his father is
`<father> <grandfather> <great-grandfather> <family>`, so the son's name very
often CONTAINS his father's — `تولين السيد صابر السيد حميد` is the daughter of
`السيد صابر السيد حميد`, and both file on the same company. Any rule that
merges a name into a longer one merges a father into his child.

Two rules, therefore, and they are deliberately different for people and for
firms:

  a person   merges only when the shorter name is a subsequence of the longer
             AND the first and last tokens are identical — an inserted middle
             name (`ابراهيم محمد ابراهيم [احمد] هيبه`), never a prepended one,
             which is what a generation looks like.

  a firm     merges on containment, because a company name is a description
             that gets abbreviated rather than a lineage: `... ثاندر للاسهم
             متعدد الاصدارات` and the same words in another order are one fund.

Both then have to survive the ledger. The candidates must file on the same
company, and their filings must join up: the later filing's opening stake has
to be within two percentage points of the earlier one's closing stake. That is
what separates `محمد تيسير محمد علي طباع` at 5.02% from `محمد تيسير محمد على
طباخ` at 0.60% — near-identical names, twelve days apart, and a gap no
undisclosed trading explains. They stay two people.
"""

from __future__ import annotations

import re
import unicodedata

# Marks, tatweel, and the Arabic-Indic/Extended digit blocks left alone.
_DIACRITIC = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")
_PUNCT = re.compile(r"[.،؛,\-–—/\\()\[\]{}«»\"'؟?!:_]+")

_LETTER_FOLD = {
    "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ٲ": "ا", "ٳ": "ا",
    "ة": "ه", "ى": "ي", "ؤ": "و", "ئ": "ي", "ك": "ك", "ی": "ي",
}

# `شركة` folds to `شركه`; both spellings are stripped by the folded form.
_LEAD_FORMS = ("شركه", "شركات", "مؤسسه", "موسسه")
_TRAIL_FORMS = ("ش م م", "ش.م.م", "ش م ك", "مساهمه مقفله", "مساهمه مصريه")

# A holder is read as a firm when the name carries a corporate marker. The
# `لل` prefix — "for/of the" — is the giveaway in Arabic company names
# (`للاستشارات`, `للتنمية`, `للاقطان`) and appears in no personal name.
_FIRM_TOKENS_AR = {
    "شركه", "شركات", "الشركه", "صندوق", "الصندوق", "صناديق", "مجموعه",
    "القابضه", "قابضه", "مؤسسه", "موسسه", "بروبرتيز", "هولدنج", "جروب",
    "بنك", "مساهمه", "مقفله", "ش م م",
}

# The transliteration the reader of the scan wrote out. It is a second,
# independent opinion on the same name, and English corporate words are
# unambiguous where an Arabic prefix can be argued about: no Egyptian
# personal name transliterates with `for`, `company`, or `holding` in it.
_FIRM_TOKENS_EN = {
    "company", "companies", "co", "corporation", "corp", "group", "holding",
    "holdings", "fund", "funds", "investment", "investments", "financial",
    "finance", "capital", "advisory", "consultancy", "consulting",
    "consultations", "consultation", "trading", "development", "properties",
    "property", "systems", "business", "sharikat", "sandooq", "sundooq",
    "sondooq", "lilistithmarat", "lilistisharat", "ltd", "llc", "plc", "inc",
    "sae", "for",
    # A register names foreign and institutional holders in Latin script, and
    # the Arabic branch has nothing to read in "Bank Misr" or "TRIQUEAR B.V".
    "bank", "banque", "assurance", "assurances", "insurance", "foundation",
    "international", "industries", "industrial", "contractors", "engineering",
    "healthcare", "pharma", "pharmaceuticals", "bv", "nv", "gmbh", "sa", "sarl",
    "ag", "spa", "pjsc", "psc", "wll", "kscc", "kscp", "limited", "partners",
    "associates", "ventures", "equity", "asset", "assets", "securities",
    "brokerage", "leasing", "mills", "poultry", "textiles", "cement", "steel",
}


# Words that say a name is a company, which is exactly why a name made of
# nothing else cannot say WHICH company.
_GENERIC_TOKENS = _FIRM_TOKENS_AR | _FIRM_TOKENS_EN

# `شركة الحصن للاستشارات (مجموعة مرتبطة)` and `الحصن للاستشارات` are one firm;
# the bracket says how the filer is related, not who they are.
_QUALIFIER = re.compile(r"[(（][^)）]*[)）]")


def _fold_letters(name: str) -> str:
    """Spelling only: diacritics, hamza shapes, taa marbuta, punctuation."""
    text = _QUALIFIER.sub(" ", unicodedata.normalize("NFKC", name or ""))
    text = _DIACRITIC.sub("", text)
    for src, dst in _LETTER_FOLD.items():
        text = text.replace(src, dst)
    text = _PUNCT.sub(" ", text).casefold()
    return " ".join(text.split())


def fold(name: str) -> str:
    """The spelling-only form of a name. Two spellings of one name agree here."""
    text = _fold_letters(name)
    for lead in _LEAD_FORMS:
        if text.startswith(lead + " "):
            text = text[len(lead) + 1:]
    for trail in _TRAIL_FORMS:
        if text.endswith(" " + trail):
            text = text[: -len(trail) - 1]
    # `عبد الفتاح` and `عبدالفتاح` are one name written two ways, and the same
    # goes for `عبد الله`. Joined, so the token counts agree too — a rule that
    # compares token lists would otherwise read one as longer than the other.
    text = re.sub(r"\bعبد\s+(?=\S)", "عبد", text)
    return " ".join(text.split())


# ── is this holder one of the listed companies? ───────────────────────────────
#
# A different question from `name_matches`, and a stricter one. That rule asks
# whether two FILINGS name the same party, where both come from the same kind
# of document and a shared-token overlap is good evidence. This asks whether a
# holder named on one company's register IS another company on the exchange —
# a claim that puts one issuer's name on another issuer's ownership — and there
# the overlap rule is wrong in a way that matters.
#
# Egyptian corporate names are a brand word followed by a legal category, and
# the category is shared by dozens of listed companies:
#
#     توسع القابضة للاستثمارات المالية      Tawasoa Holding for Financial Investments
#     راية القابضة للاستثمارات المالية      Raya  Holding for Financial Investments
#     برايم القابضة للاستثمارات المالية     Prime Holding for Financial Investments
#
# Three tokens out of four are identical and the one that differs is the only
# one that says which company it is. An overlap rule joins all three. So the
# rule here is token-set EQUALITY after the words that say how a company is
# incorporated are removed — and a key made of nothing but category words is
# refused outright, which is the same defence a second time.
_CORPORATE_NOISE = {
    "شركه", "شركات", "الشركه", "ش", "م", "مم", "شمم", "مساهمه", "مصريه",
    "مقفله", "ذ", "sae", "s", "a", "e", "sa", "plc", "ltd", "llc", "inc",
    "co", "company", "limited", "of", "the", "and", "&",
}
_ARABIC_LETTER = re.compile(r"[\u0600-\u06ff]")


def company_keys(name: str) -> set:
    """Every token set that could stand for this company's identity.

    Registers name foreign and local holders in both scripts at once —
    `بي انفستمنتس القابضة ش.م.م B-INVESTMENTS HOLDING SAE` is one company
    written twice in one field — so each script is offered as its own key and
    either may carry the match.
    """
    tokens = [t for t in _fold_letters(name).split()
              if len(t) > 1 and t not in _CORPORATE_NOISE]
    arabic = [t for t in tokens if _ARABIC_LETTER.search(t)]
    latin = [t for t in tokens if not _ARABIC_LETTER.search(t)]
    keys = set()
    for group in (tokens, arabic, latin):
        # One word is not a corporate identity, and neither is a key made
        # entirely of the words every holding company shares.
        if len(group) >= 2 and any(t not in _GENERIC_TOKENS for t in group):
            keys.add(frozenset(group))
    return keys


def names_one_company(a: str, b: str) -> bool:
    """True when both names name the same listed company."""
    return bool(company_keys(a) & company_keys(b))


def is_firm(name: str, name_en: str | None = None) -> bool:
    """True when the name reads as a company or fund rather than a person.

    Read BEFORE `fold` strips the leading `شركة`, because that word is the
    single strongest marker there is and folding it away for the identity key
    would take the classifier's best evidence with it — `شركة دراية المالية
    مساهمة مقفلة` came out of an earlier version of this as a person.
    """
    tokens = _fold_letters(name).split()
    if any(tok in _FIRM_TOKENS_AR for tok in tokens):
        return True
    # `للاستشارات`, `للتنميه`, `للاقطان` — the construction that names a firm
    # after what it does. Five characters minimum so a short fragment cannot
    # trip it.
    if any(tok.startswith("لل") and len(tok) >= 5 for tok in tokens):
        return True
    # A filed name may itself be Latin — registers list foreign institutions
    # that way — so the name is its own transliteration when none was given.
    # Without this, `is_firm` read the Arabic branch of "Goldman Sachs
    # International", found no Arabic, and called it a person; 173 of the 193
    # Latin-named holders came out that way.
    raw = unicodedata.normalize("NFKC", name_en or name or "").casefold()
    # `B.V` and `S.A.E` are one token wearing dots. Collapsed before the
    # punctuation strip, because after it they are the letters "b" and "v",
    # which match nothing. Only a dot BETWEEN two single letters is removed —
    # compacting the whole string would make a firm of anyone called Moussa.
    while True:
        joined = re.sub(r"(?<=\b[a-z])\.(?=[a-z]\b)", "", raw)
        if joined == raw:
            break
        raw = joined
    en = _PUNCT.sub(" ", raw)
    return any(tok in _FIRM_TOKENS_EN for tok in en.split())


def _fold_en(name: str | None) -> str:
    text = _PUNCT.sub(" ", unicodedata.normalize("NFKC", name or "")).casefold()
    return " ".join(text.split())


def _subsequence(short: list[str], long: list[str]) -> bool:
    it = iter(long)
    return all(tok in it for tok in short)


def name_matches(a: str, b: str, a_en: str | None = None,
                 b_en: str | None = None) -> bool:
    """Same holder by name alone — still has to be corroborated by the ledger.

    Never true for two names that differ at the front, which is what a
    generation looks like in an Arabic name.
    """
    fa, fb = fold(a), fold(b)
    if not fa or not fb or fa == fb:
        return bool(fa) and fa == fb
    # The transliteration is a second reading of the same scan. When two
    # Arabic spellings come back as one English name, the reader has already
    # judged them the same name — `اميرالد للاتصالات` against `اميرالد
    # لالتصالات`, one letter apart, both "Emerald for Communication and
    # Information Technology". The ledger still has to agree before they merge.
    ea, eb = _fold_en(a_en), _fold_en(b_en)
    if ea and ea == eb:
        return True
    ta, tb = fa.split(), fb.split()
    firm = is_firm(a, a_en) and is_firm(b, b_en)
    if firm:
        # A description, not a lineage: same words in another order, or one
        # rendering carrying nearly all the words of the other.
        sa, sb = set(ta), set(tb)
        shared = len(sa & sb)
        return shared >= 3 and shared / min(len(sa), len(sb)) >= 0.85
    short, long = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    if len(short) < 3 or short == long:
        return False
    # An inserted middle name is a fuller rendering of one person. A prepended
    # one is that person's child.
    return short[0] == long[0] and short[-1] == long[-1] and _subsequence(short, long)


CHAIN_TOLERANCE_PP = 2.0


def chain_joins(trades_a, trades_b, tolerance: float = CHAIN_TOLERANCE_PP) -> bool:
    """Do two holders' filings on one company read as one continuous holding?

    Each filing states the stake it opened and closed at. Merge the two
    sequences and step through them: wherever a filing from one side is
    followed by a filing from the other, the second one's opening stake has to
    pick up where the first left off. Undisclosed trading in between moves it a
    little; it does not move it four percentage points.

    A pair that never interleaves — every filing of one side before every
    filing of the other — is still checked at the single join between them.
    """
    rows = ([(t, "a") for t in trades_a if _paired(t)]
            + [(t, "b") for t in trades_b if _paired(t)])
    if not any(side == "a" for _, side in rows) or not any(side == "b" for _, side in rows):
        return False
    rows.sort(key=lambda r: (r[0].get("date") or "", str(r[0].get("filingId") or "")))
    for (first, side_a), (second, side_b) in zip(rows, rows[1:]):
        if side_a == side_b:
            continue
        if abs(second["stakeBefore"] - first["stakeAfter"]) > tolerance:
            return False
    return True


def _paired(trade) -> bool:
    return (isinstance(trade.get("stakeBefore"), (int, float))
            and isinstance(trade.get("stakeAfter"), (int, float)))


def resolve(people):
    """Group the filed names into holders.

    `people` is a list of dicts carrying `id`, `nameEn` and `trades`. Returns a
    list of groups, each a list of the input dicts that are one holder.

    Two passes, and only the first is automatic. Identical folded spellings are
    one holder with nothing to decide. Anything else has to look like the same
    name AND file on the same company AND have its stakes join up there; a pair
    that fails any of the three stays two holders, because two nodes for one
    person is a smaller error than one node for two people.
    """
    parent = {p["id"]: p["id"] for p in people}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[max(ra, rb)] = min(ra, rb)

    by_fold = {}
    for p in people:
        by_fold.setdefault(fold(p["id"]), []).append(p)
    for group in by_fold.values():
        for other in group[1:]:
            union(group[0]["id"], other["id"])

    for i, a in enumerate(people):
        for b in people[i + 1:]:
            if find(a["id"]) == find(b["id"]):
                continue
            if not name_matches(a["id"], b["id"], a.get("nameEn"), b.get("nameEn")):
                continue
            shared = ({t.get("ticker") for t in a["trades"]}
                      & {t.get("ticker") for t in b["trades"]})
            for ticker in shared:
                if chain_joins([t for t in a["trades"] if t.get("ticker") == ticker],
                               [t for t in b["trades"] if t.get("ticker") == ticker]):
                    union(a["id"], b["id"])
                    break

    grouped = {}
    for p in people:
        grouped.setdefault(find(p["id"]), []).append(p)
    return list(grouped.values())
