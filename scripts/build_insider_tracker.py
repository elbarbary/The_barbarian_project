#!/usr/bin/env python3
"""Build the official Insider & Treasury Share Flow Tracker dataset for EGX.

Combines two official EGX disclosure streams:
1. Daily session official bulletins ("تعاملات الداخليين والمساهمين الرئيسيين والمجموعات المرتبطة")
   with exact extracted transaction rows (ticker, shares, buy/sell, relationship).
2. Company-specific post-execution disclosure forms ("نموذج إفصاح بعد التنفيذ") and
   treasury share actions ("شراء أسهم خزينة", "مبيعات أسهم خزينة", "إعدام أسهم خزينة").

Publishes to:
  public/data/v1/insiders.json
"""

from __future__ import annotations

import argparse
import datetime as dt
import glob
import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import sys
import time

import build_named_insiders as named_insiders

REPO = pathlib.Path(__file__).resolve().parent.parent
COMPANIES_FILE = REPO / "public" / "data" / "v1" / "companies.json"
LATEST_DISCLOSURES = REPO / "public" / "data" / "v1" / "disclosures" / "latest.json"
PDF_DIR = REPO / "data-source" / "official" / "ownership" / "pdfs"
BULLETIN_STORE = REPO / "scripts" / "insider_bulletin_rows.json"
OUT_JSON = REPO / "public" / "data" / "v1" / "insiders.json"
FIXTURE_JSON = REPO / "app" / "assets" / "fixtures" / "insiders.json"

TICKER_RE = re.compile(r"\(([A-Z0-9.]{2,12})\.CA\)", re.I)
DATE_RE = re.compile(r"\b(\d{1,2})/(\d{1,2})/(20\d{2})\b")


def canonical(s: str) -> str:
    s = (s or "").lower().replace("&", " and ")
    s = re.sub(r"\b(?:s\.a\.e|sae|co\.?|company|the|for|holding|group|plc|bank)\b", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def load_company_directory() -> tuple[dict[str, dict], dict[str, str]]:
    by_ticker: dict[str, dict] = {}
    alias_map: dict[str, str] = {}
    try:
        data = json.loads(COMPANIES_FILE.read_text(encoding="utf-8"))
        for co in data.get("companies", []):
            ticker = co.get("ticker")
            if not ticker:
                continue
            by_ticker[ticker] = {
                "ticker": ticker,
                "name": co.get("name_en") or (co.get("name", {}).get("en") if isinstance(co.get("name"), dict) else "") or ticker,
                "nameAr": co.get("name_ar") or (co.get("name", {}).get("ar") if isinstance(co.get("name"), dict) else "") or ticker,
                "sector": co.get("sector") or "",
                "sectorAr": co.get("sector_ar") or "",
                "close": co.get("close"),
            }
            if co.get("name_en"):
                alias_map[canonical(co["name_en"])] = ticker
            if isinstance(co.get("name"), dict) and co["name"].get("en"):
                alias_map[canonical(co["name"]["en"])] = ticker
    except Exception as e:
        print(f"Warning loading companies.json: {e}", file=sys.stderr)

    manual = {
        canonical("Atlas for Investment & Food Industries"): "AIFI",
        canonical("Industrial & Engineering Enterprises Co."): "IEEC",
        canonical("Industrial & Engineering Enterprises"): "IEEC",
        canonical("Golden Textiles & Clothes Wool"): "GTWO",
        canonical("Oriental Weavers"): "ORWE",
        canonical("Sabaa International Company For Pharmaceutical and Chemical"): "SIPC",
        canonical("Arabian Metal Industries And Industrial Investments"): "AMII",
        # AMII's name until 22 Jul 2026, when the exchange listed its new name
        # and code, ARVA.CA to AMII.CA (NewsID 291839). The bulletins printed
        # it from October 2025 to the session of 20 Jul 2026.
        canonical("Arab Valves Company"): "AMII",
        canonical("Ibnsina Pharma"): "ISPH",
        canonical("Commercial International Bank- Egypt (CIB)"): "COMI",
        canonical("Commercial International Bank"): "COMI",
        canonical("Suez Canal Bank"): "CANA",
        canonical("El Obour Real Estate Investment"): "OBRI",
        canonical("Heliopolis Housing"): "HELI",
        canonical("Palm Hills Development Company"): "PHDC",
        canonical("Palm Hills Development"): "PHDC",
        canonical("Arabia for Investment and Development"): "AIDC",
        canonical("GB Corp"): "GBCO",
        canonical("Raya Holding For financial Investments"): "RAYA",
        canonical("EGX 30 INDEX ETF"): "EGX30ETF",
        canonical("The Egyptian Modern Education Systems"): "MOED",
        canonical("Egyptian Modern Education Systems"): "MOED",
        canonical("Gogreen for Agricultural Investment"): "GGRN",
        canonical("Alexandria Spinning & Weaving (SPINALEX)"): "SPIN",
        canonical("Alexandria Spinning & Weaving"): "SPIN",
        canonical("Eastern Tobacco"): "EAST",
        canonical("Eastern Company"): "EAST",
        canonical("Delta For Printing & Packaging"): "DTPP",
        canonical("The Arab Dairy Products Co. Arab Dairy - Panda"): "ADPC",
        canonical("The Arab Dairy Products Co. Arab Dairy"): "ADPC",
        canonical("Arab Dairy Products"): "ADPC",
        canonical("Creast Mark For Contracting And Real Estate Development"): "CRMK",
        canonical("Creast Mark For Contracting"): "CRMK",
        canonical("Tenth Of Ramadan Pharmaceutical Industries&Diagnostic-Rameda"): "RMDA",
        canonical("Tenth Of Ramadan Pharmaceutical Industries"): "RMDA",
        canonical("Rameda"): "RMDA",
        canonical("TMG Holding"): "TMGH",
        canonical("Talaat Moustafa Group"): "TMGH",
        canonical("Fawry For Banking Technology And Electronic Payment"): "FWRY",
        canonical("Fawry"): "FWRY",
        canonical("MM Group Industrial & International Trade (In Kind)"): "MTIE",
        canonical("MM Group Industrial & International Trade"): "MTIE",
        canonical("MM Group"): "MTIE",
        # The directory lists it as FCMD. Until April 2026 the bulletins
        # printed its earlier name, and the calendar still files it under
        # ICMI.CA.
        canonical("Future care for medical industries (FCMI)"): "FCMD",
        canonical("Future care for medical industries"): "FCMD",
        canonical("International company For Medical Industries -ICMI"): "FCMD",
        canonical("Union Pharmacist Company For Medical Services and Investment"): "UPMS",
        canonical("Egyptians For Housing Development & Reconstruction"): "EHDR",
        canonical("Egyptians Housing Development & Reconstruction"): "EHDR",
        canonical("Egyptians Housing"): "EHDR",
        canonical("Pyramisa Hotels"): "PHTV",
        canonical("Cleopatra Hospital Company"): "CLHO",
        canonical("Cleopatra Hospital"): "CLHO",
        canonical("El Nasr For Manufacturing Agricultural Crops"): "ELNA",
        canonical("International Company For Fertilizers & Chemicals"): "ICFC",
        canonical("Abu Dhabi Islamic Bank- Egypt"): "ADIB",
        canonical("Mohandes Insurance"): "MOIN",
        # ALICO is Arab Real Estate Investment, RREI; there is no ALIC.
        canonical("Arab Real Estate Investment CO.- ALICO"): "RREI",
        canonical("Arab Real Estate Investment CO.-ALICO"): "RREI",
        canonical("Catalyst Partners Middle East – CPME"): "CPME",
        canonical("Arab Cotton Ginning"): "ACGC",
        canonical("Arab Pharmaceuticals"): "ADCI",
        canonical("Prime Holding"): "PRMH",
        canonical("Heibco for commercial investments & real estate development"): "HBCO",
        canonical("Ismailia National Food Industries"): "INFI",
        canonical("Lotus For Agricultural Investments And Development"): "LUTS",
        canonical("Lotus For Agricultural"): "LUTS",
        canonical("Sharkia National Food"): "SNFC",
        canonical("Arabian Cement Company"): "ARCC",
        canonical("Arabian Cement"): "ARCC",
        canonical("Misr Cement (Qena)"): "MCQE",
        canonical("Misr Cement Qena"): "MCQE",
        canonical("Misr Beni Suef Cement"): "MBSC",
        canonical("Arab Co. for Asset Management And Development"): "ACAMD",
        canonical("Arab Company for Asset Management"): "ACAMD",
        canonical("Copper For Commercial Investment & Real Estate Development"): "COPR",
        canonical("Copper For Commercial Investment"): "COPR",
        canonical("Nozha International Hospital"): "NINH",
        canonical("Pioneers Properties For Urban Development"): "PRDC",
        canonical("Pioneers Properties"): "PRDC",
        canonical("Madinet Masr For Housing And Development"): "MASR",
        canonical("Madinet Masr"): "MASR",
        canonical("Medical Packaging"): "MEPA",
        canonical("Fitness Prime"): "FTNS",
        canonical("Giza General Contracting"): "GGCC",
        canonical("First Investment & Real Estate Development"): "FIRE",
        canonical("El Nasr Clothing & Textiles - KABO"): "KABO",
        canonical("KABO"): "KABO",
        canonical("Universal For Paper & Packaging Materials - Unipack"): "UNIP",
        canonical("Odin Investments"): "ODIN",
        canonical("Al Ahram Printing & Packaging"): "EPPK",
        canonical("Arabia Investments Holding"): "AIH",
        canonical("Digitize for Investment and Technology"): "DGTZ",
        canonical("Al Ahly For Development & Investment"): "AFDI",
        canonical("Alexandria Pharmaceuticals"): "AXPH",
        canonical("El Wadi For Touristic Investment"): "ELWA",
        canonical("Arab Engineering Industries"): "EEII",
        canonical("Egytrans"): "ETRS",
        canonical("TMG Holding"): "TMGH",
        canonical("Heibco for commercial investments & real estate development"): "HBCO",
        canonical("Heibco for commercial investments"): "HBCO",
        canonical("International Co For Investment & Development"): "ICID",
        canonical("International Co For Investment"): "ICID",
        canonical("Egyptians For Housing Development & Reconstruction"): "EHDR",
        canonical("Egyptians For Housing"): "EHDR",
        canonical("MM Group Industrial & International Trade"): "MTIE",
        canonical("MM Group Industrial & International"): "MTIE",
        canonical("Universal For Paper and Packaging Material"): "UNIP",
        canonical("Universal For Paper & Packaging"): "UNIP",
        canonical("Asec Company for Mining \"ASCOM\""): "ASCM",
        canonical("FERCHEM MISR CO. FOR FERTILIZERS & CHEMICALS"): "FERC",
        canonical("FERCHEM MISR CO. FOR"): "FERC",
        canonical("El-Nile Co. For Pharmaceuticals And Chemical Industries"): "NIPH",
        canonical("El-Nile Co. For Pharmaceuticals And"): "NIPH",
        canonical("EGX 30 INDEX ETF"): "EGX30ETF",
        canonical("Valmore Holding"): "VLMR",
        canonical("Valmore"): "VLMR",
        canonical("Utopia For Real Estate & Tourism"): "UTOP",
        canonical("Memphis Pharmaceuticals"): "MPCI",
        canonical("Contact Financial Holding ESOP"): "CNFN",
        canonical("El Nasr Clothes & Textiles (Kabo)"): "KABO",
        canonical("ODIN Financial Investments"): "ODIN",
        # Names the session bulletins print, read whole since 16 Sep 2026,
        # that the directory spells otherwise. Each checked against the
        # directory's Arabic name where the English left room for doubt.
        canonical("E-Finance For Digital and Financial Investements SAE"): "EFIH",
        canonical("Medinet MASR Housing"): "MASR",
        canonical("Egyptian Arabian (cmar) Securities Brokerage and Bonds EAC"): "EASB",
        canonical("Alexandria Medical Services"): "AMES",
        canonical("C I Capital Holding For financial Investments"): "CICH",
        canonical("Al Khair River For Development Agricultural Investment&Envir"): "KRDI",
        canonical("Engineering Industries (ICON)"): "ENGC",
        canonical("Egyptian International Pharmaceuticals (EIPICO)"): "PHAR",
        canonical("Elsaeed Contracting & Real Estate Investment Company SCCD"): "UEGC",
        canonical("Abu Qir Fertilizers"): "ABUK",
        canonical("El Ezz Porcelain (Gemma)"): "ECAP",
        canonical("Raya Customer Experience"): "RACC",
        canonical("El Ahli Investment and Development"): "AFDI",
        canonical("Dice Sport & Casual Wear"): "DSCW",
        canonical("cairo for investment and real estate development CIRA Educat"): "CIRA",
    }
    alias_map.update(manual)
    return by_ticker, alias_map


def resolve_ticker(co_raw: str, alias_map: dict[str, str]) -> str | None:
    if not co_raw:
        return None
    key = canonical(co_raw)
    if key in alias_map:
        return alias_map[key]
    # Nothing to match on is no match. A name with no Latin letters left in it
    # (an Arabic one) is an empty key, and an empty key is inside every alias:
    # it took whichever came first, General Co. for Land Reclamation. "#N/A"
    # left "n a", inside Delta Construction & Rebuilding.
    if len(key) <= 4:
        return None
    for a_k, a_tick in alias_map.items():
        if len(a_k) > 4 and (a_k in key or key in a_k):
            return a_tick
    return None


LEDGER = REPO / "data-source" / "official" / "ownership" / "ownership-ledger.json"
# The exchange answers a steady trickle and resets a burst.
PAUSE_SECONDS = 2.0
STOP_AFTER = 8


def load_store() -> dict:
    """The transactions read out of the session bulletins, and which were read.

    `rows` are the transactions. `read` names every bulletin that produced
    them — and every one that produced none — because a runner keeps no PDFs:
    between builds this file is its only memory of what it has opened. Until
    16 Sep 2026 it was a bare list of rows, so a machine without the PDFs could
    only publish it whole or, the moment it read one bulletin of its own,
    overwrite it with that bulletin alone.
    """
    try:
        doc = json.loads(BULLETIN_STORE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        doc = None
    if isinstance(doc, list):
        rows = [r for r in doc if isinstance(r, dict)]
        read: dict[str, dict] = {}
        for row in rows:
            entry = read.setdefault(str(row.get("filingId")), {"session": row.get("date"), "rows": 0})
            entry["rows"] += 1
        return {"schemaVersion": 2, "read": read, "rows": rows}
    if isinstance(doc, dict):
        return {"schemaVersion": 2, "read": dict(doc.get("read") or {}),
                "rows": [r for r in doc.get("rows") or [] if isinstance(r, dict)]}
    return {"schemaVersion": 2, "read": {}, "rows": []}


def is_read(entry: dict | None) -> bool:
    """Whether a bulletin the store remembers is read, or needs asking for again.

    It is read if the parser that read it is this one. Until 16 Sep 2026 one
    that gave any rows was done for good and only an empty one was asked for
    again. But rows are not a reading: 294700 gave 26 of the 29 trades it
    prints, and not one row held carried a related party, because the parser
    read none. A runner keeps no PDFs, so rows remembered
    were rows kept for as long as the store is. Asked for again, newest first and
    a few a build, they are read by whatever reads bulletins now; the laptop,
    which holds the PDFs, saves the exchange that by committing the store it
    read them into.
    """
    return isinstance(entry, dict) and entry.get("parser") == PARSER


def ledger_bulletins() -> list[dict] | None:
    """The session bulletins the ownership ledger lists, or None without one."""
    if not LEDGER.exists():
        return None
    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
    documents = ledger.get("documents") or []
    if isinstance(documents, dict):
        documents = list(documents.values())
    return [d for d in documents if d.get("kind") == "daily_insider_summary"]


# How long before its bulletin was filed a session can have been. One to three
# days is usual; around Eid al-Adha in 2026 one came fourteen days late.
SESSION_WITHIN_DAYS = 21


def session_of(printed: str | None, filed: dict | None) -> str | None:
    """The session a bulletin is for, checked against the day it was filed.

    The date inside the PDF and the date in the filing's title have each been
    wrong while the other was right. 289403, filed on 4 Jun 2026, prints
    `03/06/2025` inside and `03/06/2026` in its title, so 26 trades were
    published a year early. 292658, filed on 9 Aug 2026, prints `06/07/2026`
    inside and `06/08/2026` in its title. Six titles filed between 23 and 30
    Nov 2025 name sessions in October, three of them on a Friday or a Saturday.
    A session can only fall in the weeks before its bulletin was filed, so the
    first date that does is the session. When neither does, the session is
    unknown: no date is better than a wrong one.
    """
    if not filed or not filed.get("publishedAt"):
        return printed
    day = dt.date.fromisoformat(filed["publishedAt"][:10])
    for candidate in (printed, filed.get("sessionDate")):
        try:
            if 0 <= (day - dt.date.fromisoformat(candidate)).days <= SESSION_WITHIN_DAYS:
                return candidate
        except (TypeError, ValueError):
            continue
    return None


def english_table(doc: dict) -> str | None:
    """The attachment `pdftotext -layout` can read a bulletin's trades from.

    That is the Latin-headed table, `_101.pdf` beside `_1.pdf`, the Arabic
    rendering of the same session. Three sessions file it under a name of its
    own — `20-08-2026_english.pdf`, `25-05-2026_in_english.pdf`,
    `insiders_en_12-03-2026_english.pdf` — and were never asked for.
    """
    attachments = doc.get("attachments") or []
    return (next((u for u in attachments if u.endswith("_101.pdf")), None)
            or next((u for u in attachments if "english" in u.rsplit("/", 1)[-1].lower()), None))


def unread_bulletins() -> list[dict]:
    """Session bulletins neither on this disk nor read by this parser, newest first.

    Newest first, so a run that is cut short leaves the most recent sessions
    read rather than the oldest.
    """
    bulletins = ledger_bulletins()
    if bulletins is None:
        print("no ownership ledger yet — run ownership_ledger.py", file=sys.stderr)
        return []
    bulletins.sort(key=lambda d: d.get("publishedAt") or "", reverse=True)

    held = {n.name for n in PDF_DIR.glob("egx-*.pdf")}
    read = load_store()["read"]
    unread = []
    for doc in bulletins:
        filing = str(doc.get("filingId") or "")
        if not filing or any(n.startswith(f"egx-{filing}-") for n in held):
            continue
        if is_read(read.get(filing)):
            continue
        if english_table(doc) is None:
            continue
        unread.append(doc)
    return unread


def fetch_bulletins(limit: int = 0, patience: int = STOP_AFTER) -> int:
    """Download the session bulletins this machine has never opened.

    Every row on the tracker that says which way a trade went — the direction,
    the share count, whether it was an insider or a major holder — is read out
    of one document a session: the exchange's insider-dealings bulletin, pulled
    through `pdftotext`. Nothing was fetching them. Fourteen had been
    downloaded by hand and the other two hundred and sixteen sat in the ledger
    as documents we knew existed and had never opened, so every filing after 19
    August reached the screen present and silent about what it said.

    `limit` is how many to ask for, not how many to get, so a host that refuses
    costs a run no more than that; `patience` is how many refusals in a row end
    the run early.
    """
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    got = misses = asked = 0
    for doc in unread_bulletins():
        filing = str(doc.get("filingId"))
        url = english_table(doc)
        target = PDF_DIR / f"egx-{filing}-{url.rsplit('/', 1)[-1]}"
        asked += 1
        if named_insiders.fetch_pdf(url, target):
            got, misses = got + 1, 0
            print(f"   {filing} {(doc.get('publishedAt') or '')[:10]}: bulletin fetched",
                  file=sys.stderr)
        else:
            # A refused fetch writes the challenge page it was served. Left
            # there, the slot reads as filled and the bulletin is never asked
            # for again — while `pdftotext` quietly fails on it every build.
            if target.exists() and target.read_bytes()[:4] != b"%PDF":
                target.unlink()
            misses += 1
            if misses >= patience:
                print(f"   the exchange stopped answering after {got} — "
                      f"leaving the rest for the next run", file=sys.stderr)
                break
        if limit and asked >= limit:
            break
        # A burst of fifty-odd is what turns a served document into a
        # connection reset. One at a time, with a breath between.
        time.sleep(PAUSE_SECONDS)
    print(f"   fetched {got} session bulletins", file=sys.stderr)
    return got


# ── How a session bulletin is read ───────────────────────────────────────────
#
# The bulletin is an Excel table printed to PDF, a row a trade: Company Name,
# Position, Transaction, Volume. `pdftotext -layout` keeps its columns and drops
# the rules between its rows, and a row is not a line. Every cell is centred in
# its row on its own: a name that wraps prints half of itself above the trade
# and half below, "related parties for" sits a line above the trade and
# "insider" a line below, and in 33 of the 233 bulletins filed since October
# 2025 most volumes are printed at the foot of their row, a line or two under
# the transaction. Read a line at a time, 7 of the 68 bulletins on the laptop
# on 16 Sep 2026 gave no trades, trades under 100 shares were dropped, and no
# related party was ever published as one.
#
# So a row is anchored on its volume, which every row prints exactly once, and
# on its position, which every row prints once however it wraps; the k-th of
# each on a page are one row. Its transaction is the one printed between them,
# and its company name is the text centred on its position.

# The Position column, as printed in the 233 bulletins filed from 1 Oct 2025 to
# 15 Sep 2026: "insider"; "Major Shareholder", also printed "main shareholder",
# "Majorshareholder", "Major Sharholder", "main share holder" and "main
# sharehloder"; "ESOP", once "EPOS"; an Excel "#N/A"; any of them after
# "related parties of" or "related parties for". A cell wraps at any word, so a
# line can hold "for insider", or "Major" alone.
_POSITION_WORDS = {
    "related": re.compile(r"related", re.I),
    "parties": re.compile(r"part(?:y|ies)", re.I),
    "of": re.compile(r"of|for", re.I),
    "sole": re.compile(r"insider|esop|epos|#n/a", re.I),
    "major": re.compile(r"main|major", re.I),
    "shareholder": re.compile(r"(?:main|major)?share?h(?:ol|lo)der", re.I),
    "share": re.compile(r"(?:main|major)?share?", re.I),
    "holder": re.compile(r"h(?:ol|lo)der", re.I),
}
_POSITIONS = [lead + holder
              for lead in ((), ("related", "parties", "of"))
              for holder in (("sole",), ("shareholder",), ("major", "shareholder"),
                             ("share", "holder"), ("major", "share", "holder"))]
# Words no listed company's name uses. "for", "of", "major" and "main" are in
# plenty of them — "FERCHEM MISR CO. FOR" wraps onto a line of its own.
_ONLY_POSITIONS = {"related", "parties", "sole", "shareholder"}

_TRADE = re.compile(r"(?<![A-Za-z])(buy|sell|sold)(?![A-Za-z])", re.I)
_DIRECTIONS = {"buy": "bought", "sell": "sold", "sold": "sold"}
_DATE_AT_END = re.compile(r"(?:^|(?<=\s))(\d{1,2})/+(\d{1,2})/+(20\d{2})\s*$")
_VOLUME_AT_END = re.compile(r"(?:^|(?<=\s))(\d[\d,]*)\s*$")
_TRADE_AT_END = re.compile(r"(?:^|(?<=\s))(buy|sell|sold)\s*$", re.I)
_WORD_AT_END = re.compile(r"(?:^|(?<=\s))(\S+)\s*$")
_TITLE = re.compile(r"Trading of Insiders|Listed Companies|Sessions?\s*\d{1,2}\s*/", re.I)
_HEADER_TAIL = re.compile(r"^\s*(?:Transa\w*|Trans|Volume|Position|session)"
                          r"(?:\s+(?:Transa\w*|Trans|Volume|Position|session))*\s*$", re.I)
_EXCEL_ERROR = re.compile(r"#(?:N/A|REF!|VALUE!|NAME\?|DIV/0!|NULL!|NUM!)", re.I)
_RIGHTS = re.compile(r"subscription\s+rights\b", re.I)
# An Arabic company name comes out wrapped in embedding marks.
_BIDI = re.compile("[\u202a-\u202e\u2066-\u2069]")

_RELATIONSHIPS = {
    "insider": ("Insider / Board", "مجلس إدارة / داخلي"),
    "major_holder": ("Major Shareholder", "مساهم رئيسي"),
    "related_party": ("Connected Group", "مجموعة مرتبطة"),
    # The exchange's own Arabic for the ESOP rows, «نظام الإثابة والتحفيز».
    "esop": ("Employee Incentive Scheme (ESOP)", "نظام الإثابة والتحفيز"),
    # "#N/A" in the English table. The Arabic bulletin had the position all
    # along (294409: related parties of the main shareholder), and the English
    # one does not say, so neither does this.
    "unstated": ("Position Not Stated", "الصفة غير مذكورة"),
}


def _position_kinds(word: str) -> set[str]:
    return {kind for kind, pattern in _POSITION_WORDS.items() if pattern.fullmatch(word)}


def _is_position(words: list[str], whole: bool = False) -> bool:
    """Whether these words are a whole Position cell, or part of one in order."""
    kinds = [_position_kinds(word) for word in words]
    if not kinds or not all(kinds):
        return False
    for shape in _POSITIONS:
        if whole and len(shape) != len(kinds):
            continue
        for start in ([0] if whole else range(len(shape) - len(kinds) + 1)):
            if all(shape[start + i] in kind for i, kind in enumerate(kinds)):
                return True
    return False


def _split_line(line: str, columns: dict) -> dict:
    """One line of the table taken apart from the right: session, volume,
    transaction, position, and what is left, which is company name."""
    rest, cells = line.rstrip(), {}
    first_trade, last_trade = columns["trades"]
    date = _DATE_AT_END.search(rest)
    if date and date.start() > first_trade:
        # A supplement covering two sessions (286467) dates every row.
        day, month, year = (int(g) for g in date.groups())
        cells["date"] = f"{year:04d}-{month:02d}-{day:02d}"
        rest = rest[:date.start()].rstrip()
    # A number is a volume only right of the Transaction column: a company's
    # name can end in one.
    volume = _VOLUME_AT_END.search(rest)
    if volume and volume.start(1) > first_trade:
        cells["volume"] = int(volume.group(1).replace(",", ""))
        rest = rest[:volume.start(1)].rstrip()
    trade = _TRADE_AT_END.search(rest)
    if not trade:
        # A Transaction cell holding something else — 289734 prints "bs". It
        # is still that row's transaction, not the end of a company's name.
        trade = _WORD_AT_END.search(rest)
        if trade and not (first_trade - 2 <= trade.start(1) <= last_trade + 2
                          and not _position_kinds(trade.group(1))):
            trade = None
    if trade:
        cells["trade"] = trade.group(1)
        rest = rest[:trade.start(1)].rstrip()
    words = [(m.start(), m.group()) for m in re.finditer(r"\S+", rest)]
    position: list[tuple[int, str]] = []
    while words:
        column, word = words[-1]
        if not _is_position([word] + [w for _, w in position]):
            break
        # A word that could end a company's name belongs to the position only
        # when it is joined to the rest of it by one space, or stands alone in
        # the Position column.
        joined = bool(position) and position[0][0] == column + len(word) + 1
        alone = (not position and columns["positions"] is not None
                 and column >= columns["positions"])
        if not (_position_kinds(word) & _ONLY_POSITIONS or joined or alone):
            break
        position.insert(0, words.pop())
    if position:
        cells["position"] = [word for _, word in position]
    company = _BIDI.sub("", " ".join(word for _, word in words)).strip()
    if company:
        cells["company"] = company
    return cells


def _page_trades(page: str) -> tuple[list[dict], int, str | None]:
    """The rows one page prints, how many it prints, and why none were read.

    A page that cannot be put together — more volumes than positions, a
    transaction outside every row — gives no rows rather than rows that might
    carry another row's company or direction.
    """
    body = list(enumerate(page.split("\n")))
    for n, (_, line) in enumerate(body):
        if "Company Name" in line:
            body = body[n + 1:]
            while body and _HEADER_TAIL.match(body[0][1]):
                body = body[1:]
            break
    body = [(i, line) for i, line in body if not _TITLE.search(line)]
    trade_columns = [m.start(1) for _, line in body for m in _TRADE.finditer(line)]
    if not trade_columns:
        return [], 0, None
    first_trade = min(trade_columns)
    only = [m.start() for _, line in body for m in re.finditer(r"\S+", line[:first_trade])
            if _position_kinds(m.group()) & _ONLY_POSITIONS]
    columns = {"trades": (first_trade, max(trade_columns)),
               "positions": min(only) if only else None}
    split = [(i, _split_line(line, columns)) for i, line in body]

    volumes = [(i, cells["volume"]) for i, cells in split if "volume" in cells]
    dates = [(i, cells["date"]) for i, cells in split if "date" in cells]
    # A position is its pieces, in order, until they make a whole one.
    positions, pending = [], []
    for i, cells in split:
        if "position" not in cells:
            continue
        pending.append((i, cells["position"]))
        words = [word for _, piece in pending for word in piece]
        if _is_position(words, whole=True):
            positions.append(([j for j, _ in pending], " ".join(words)))
            pending = []
    printed = len(volumes)
    if pending:
        return [], printed, "a position that never finishes: " + " / ".join(
            " ".join(piece) for _, piece in pending)
    if len(positions) != printed or (dates and len(dates) != printed):
        return [], printed, (f"{printed} volumes against {len(positions)} positions"
                             + (f" and {len(dates)} session dates" if dates else ""))

    rows = []
    for k, ((line, shares), (lines, position)) in enumerate(zip(volumes, positions)):
        rows.append({"span": [line, *lines, *([dates[k][0]] if dates else [])],
                     "centre": sum(lines) / len(lines), "shares": shares,
                     "position": position, "date": dates[k][1] if dates else None,
                     "trade": None, "company": ""})
    if not rows:
        return [], 0, "a transaction printed with no volume or position"
    bands = [(min(row["span"]), max(row["span"])) for row in rows]
    if any(bands[k - 1][1] >= bands[k][0] for k in range(1, len(bands))):
        return [], printed, "two rows' volumes and positions interleave"
    for line, cells in split:
        if "trade" not in cells:
            continue
        k = next((k for k, (top, bottom) in enumerate(bands) if top <= line <= bottom), None)
        if k is None or rows[k]["trade"] is not None:
            return [], printed, f"the transaction \"{cells['trade']}\" belongs to no one row"
        rows[k]["trade"] = cells["trade"]

    # Company text inside a row's span is that row's. Text between two rows
    # goes to whichever split centres both names on their positions: 290139
    # prints "Creast Mark For Contracting And Real Estate" over one row's trade
    # and "Development" beside it, and the nearest row for each line would have
    # given half a name to each.
    n = len(rows)
    inside: list[list[tuple[int, str]]] = [[] for _ in rows]
    between: list[list[tuple[int, str]]] = [[] for _ in range(n + 1)]
    for line, cells in split:
        if "company" not in cells:
            continue
        k = next((k for k, (top, bottom) in enumerate(bands) if top <= line <= bottom), None)
        if k is not None:
            inside[k].append((line, cells["company"]))
        else:
            below = next((k for k, (top, _) in enumerate(bands) if line < top), n)
            between[below].append((line, cells["company"]))

    def off_centre(k: int, lines: list[int]) -> float:
        if not lines:
            return float(len(body) * (n + 1))  # a row with no name loses to any split
        return abs(sum(lines) / len(lines) - rows[k]["centre"])

    # best[s]: the least total for the rows so far, s lines of the gap above
    # row k having gone to the row before it.
    best: dict[int | None, tuple[float, list[int | None]]] = {0: (0.0, [])}
    for k in range(n):
        reached: dict[int | None, tuple[float, list[int | None]]] = {}
        for taken, (total, splits) in best.items():
            above = between[k][taken:]
            for kept in ([None] if k == n - 1 else range(len(between[k + 1]) + 1)):
                below = between[n] if kept is None else between[k + 1][:kept]
                cost = total + off_centre(k, [line for line, _ in above + inside[k] + below])
                if kept not in reached or cost < reached[kept][0]:
                    reached[kept] = (cost, splits + [kept])
        best = reached
    splits = best[None][1]
    for k, row in enumerate(rows):
        above = between[k][splits[k - 1]:] if k else between[0]
        below = between[n] if k == n - 1 else between[k + 1][:splits[k]]
        row["company"] = " ".join(text for _, text in sorted(above + inside[k] + below))
    return rows, printed, None


def _relationship(position: str) -> str:
    words = position.lower()
    if words.startswith("related"):
        return "related_party"
    if words == "insider":
        return "insider"
    if words in ("esop", "epos"):
        return "esop"
    if words == "#n/a":
        return "unstated"
    return "major_holder"


def bulletin_rows(text: str, filing_id: str, alias_map: dict[str, str],
                  by_ticker: dict[str, dict]) -> tuple[str | None, list[dict], list[str]]:
    """One bulletin's session date, its transactions in the order printed, and
    each thing it printed that gave no transaction.

    A row printed with no direction is not a transaction anyone can publish:
    290042 leaves three of FCMI's Transaction cells empty. Nor is one with no
    company: 294355 prints "#N/A" where the name goes, and that buy of 60,000
    shares was published as Delta Construction & Rebuilding's. Each is kept
    out, and said, rather than guessed.
    """
    date_m = re.search(r"Session\s*(\d{1,2})[/]+(\d{1,2})[/]+(20\d{2})", text, re.I) or re.search(r"(\d{1,2})[/]+(\d{1,2})[/]+(20\d{2})", text)
    session_date = None
    if date_m:
        day, month, year = int(date_m.group(1)), int(date_m.group(2)), int(date_m.group(3))
        session_date = f"{year:04d}-{month:02d}-{day:02d}"

    records: list[dict] = []
    unread: list[str] = []
    printed = 0
    for page_number, page in enumerate(text.split("\x0c"), 1):
        rows, count, problem = _page_trades(page)
        if problem:
            unread.append(f"page {page_number}, {count} row(s): {problem}")
        # Numbered by its place in the bulletin, not among the rows read, so a
        # row keeps its id whichever other bulletins a machine happens to hold
        # and whichever rows beside it could be read.
        for number, row in enumerate(rows, printed + 1):
            act = _DIRECTIONS.get((row["trade"] or "").lower())
            company = row["company"]
            if act is None or not company or _EXCEL_ERROR.fullmatch(company):
                unread.append(f"{company}, {row['position']}, {row['shares']:,} shares: "
                              + ("no company name printed" if act
                                 else f"the transaction reads \"{row['trade']}\"" if row["trade"]
                                 else "no transaction printed"))
                continue
            rel = _relationship(row["position"])
            # Subscription rights are not the company's shares. Given its
            # ticker, 33,000,000 rights in Creast Mark would be published as
            # Creast Mark shares, under its name, with the word "rights" gone.
            ticker = None if _RIGHTS.match(company) else resolve_ticker(company, alias_map)
            co_meta = by_ticker.get(ticker or "", {})
            comp_display = co_meta.get("name") or company
            comp_ar = co_meta.get("nameAr") or company
            shares = row["shares"]
            records.append({
                "id": f"bulletin-{filing_id}-{number}",
                "filingId": filing_id,
                "sourceType": "bulletin",
                "date": row["date"] or session_date,
                "ticker": ticker,
                "company": comp_display,
                "companyAr": comp_ar,
                "sector": co_meta.get("sector") or "",
                "sectorAr": co_meta.get("sectorAr") or "",
                "action": act,
                "actionLabel": "Bought" if act == "bought" else "Sold",
                "actionLabelAr": "شراء" if act == "bought" else "مبيعات",
                "relationship": rel,
                "relationshipLabel": _RELATIONSHIPS[rel][0],
                "relationshipLabelAr": _RELATIONSHIPS[rel][1],
                "positionRaw": row["position"].lower(),
                "shares": shares,
                "title": f"تعامل على أسهم {comp_ar} ({'شراء' if act == 'bought' else 'مبيعات'}): {shares:,} سهم",
                "titleEn": f"Transaction on {comp_display} ({act}): {shares:,} shares",
                "link": f"https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID={filing_id}" if filing_id != "0" else "",
            })
        printed += count
    return session_date, records, unread

# ── end of how a session bulletin is read ────────────────────────────────────


def _reading_source() -> str:
    """The section above, as written."""
    text = pathlib.Path(__file__).read_text(encoding="utf-8")
    start = text.index("# ── How a session bulletin is read ")
    return text[start:text.index("# ── end of how a session bulletin is read ", start)]


# Which parser read a bulletin: the source of everything above that reads one,
# so any change to how a bulletin is read has every bulletin read again.
PARSER = hashlib.sha256(_reading_source().encode("utf-8")).hexdigest()[:12]


def as_published(row: dict, alias_map: dict[str, str], by_ticker: dict[str, dict]) -> dict:
    """A trade the store holds, as the lens is given it.

    A row keeps the ticker it was read with, and a bulletin is read again only
    when the parser changes. The aliases are not the parser, so a name no alias
    matched stayed unmatched however many were added after it: the 169 trades
    the bulletins printed as Arab Valves Company, AMII's name until 22 Jul
    2026, were published with no ticker and attached to no company. A row read
    with no ticker still holds the name its bulletin printed, so it is matched
    again each time it is published, and named the way the reader names a
    match. Subscription rights stay unmatched, as the reader leaves them.
    """
    # Which parser read it is the store's business, not the lens's.
    record = {field: value for field, value in row.items() if field != "parser"}
    printed = record.get("company") or ""
    if record.get("ticker") or _RIGHTS.match(printed):
        return record
    ticker = resolve_ticker(printed, alias_map)
    if ticker is None:
        return record
    co_meta = by_ticker.get(ticker, {})
    company = co_meta.get("name") or printed
    company_ar = co_meta.get("nameAr") or printed
    act, shares = record["action"], record["shares"]
    record.update(
        ticker=ticker, company=company, companyAr=company_ar,
        sector=co_meta.get("sector") or "", sectorAr=co_meta.get("sectorAr") or "",
        title=f"تعامل على أسهم {company_ar} ({'شراء' if act == 'bought' else 'مبيعات'}): {shares:,} سهم",
        titleEn=f"Transaction on {company} ({act}): {shares:,} shares")
    return record


def parse_bulletin_pdfs(alias_map: dict[str, str], by_ticker: dict[str, dict],
                        write: bool = True) -> list[dict]:
    """Every transaction held, with whatever this machine has on disk read afresh.

    The store is the base and a bulletin on disk replaces its own rows in it,
    so a runner that fetched three bulletins adds three sessions. It used to
    replace the store with whatever was on disk, which is harmless on the
    laptop that holds every PDF and would have cut 1,605 rows to one session's
    thirty the first time a runner fetched anything.
    """
    store = load_store()
    by_filing: dict[str, list[dict]] = {}
    for row in store["rows"]:
        by_filing.setdefault(str(row.get("filingId")), []).append(row)
    # Without the ledger — the live job — dates stay as they were read.
    filed = {str(d.get("filingId")): d for d in ledger_bulletins() or []}

    pdfs = sorted(PDF_DIR.glob("egx-*.pdf"))
    # Loud, because the quiet version already happened: a missing binary is an
    # exception inside the read, and the read used to swallow every exception
    # and publish the store as though nothing had arrived.
    if pdfs and shutil.which("pdftotext") is None:
        raise SystemExit(f"pdftotext is not installed, and {len(pdfs)} session "
                         f"bulletin(s) in {PDF_DIR} are waiting to be read")
    for pdf_path in pdfs:
        filing_id = re.search(r"egx-(\d+)", pdf_path.name).group(1)
        try:
            res = subprocess.run(["pdftotext", "-layout", str(pdf_path), "-"],
                                 capture_output=True, text=True, timeout=30)
        except subprocess.TimeoutExpired:
            continue
        if res.returncode != 0:
            continue
        session_date, rows, unread = bulletin_rows(res.stdout, filing_id, alias_map, by_ticker)
        for row in rows:
            row["parser"] = PARSER
        by_filing[filing_id] = rows
        store["read"][filing_id] = {"session": session_date, "rows": len(rows), "parser": PARSER}
        # Kept with the rows, so a machine without the PDF can still say what
        # the bulletin printed that is not on the lens.
        if unread:
            store["read"][filing_id]["unread"] = unread
        if not rows:
            print(f"::warning title=Session bulletin read as empty::{pdf_path.name} "
                  f"(session {session_date or 'undated'}) gave no transactions"
                  + (f": {'; '.join(unread)}" if unread else "")
                  + ". It is not asked for again until the parser changes.")
        elif unread:
            print(f"::warning title=Session bulletin partly read::{pdf_path.name} "
                  f"(session {session_date or 'undated'}) gave {len(rows)} transactions "
                  f"and left out: {'; '.join(unread)}.")

    # A bulletin's rows are one reading's. Two builds that race have the
    # resolver union this store's rows by id, so a build that read a bulletin
    # with an older parser — under that parser's numbering — leaves its rows
    # beside this reading's, while the read record names this parser alone and
    # nothing would ever read the bulletin again to clear them. Every row says
    # which parser gave it, and rows the recorded reading did not give go.
    for filing_id, rows in by_filing.items():
        reader = (store["read"].get(filing_id) or {}).get("parser")
        if reader and any(row.get("parser") == reader for row in rows):
            by_filing[filing_id] = [row for row in rows if row.get("parser") == reader]

    # Every row's session checked against the day its bulletin was filed, the
    # rows already in the store included: 41 of them were published under a
    # date their bulletin could not have been for. Each date a bulletin prints
    # is checked, not its first for all of them: a supplement (286467) prints
    # two sessions.
    for filing_id, rows in by_filing.items():
        doc = filed.get(filing_id)
        if not doc or not rows:
            continue
        moved = {}
        for printed in dict.fromkeys(row.get("date") for row in rows):
            session = session_of(printed, doc)
            if session != printed:
                moved[printed] = session
        if not moved:
            continue
        for printed, session in moved.items():
            if session is None:
                count = sum(1 for row in rows if row.get("date") == printed)
                print(f"::warning title=Session bulletin date unclear::Bulletin {filing_id}, "
                      f"filed {doc['publishedAt'][:10]}, is dated {printed} inside and "
                      f"{doc.get('sessionDate')} in its title, and neither can be its "
                      f"session. Its {count} trades are published without a date.")
        for row in rows:
            if row.get("date") in moved:
                row["date"] = moved[row["date"]]
        entry = store["read"].get(filing_id)
        if isinstance(entry, dict) and entry.get("session") in moved:
            entry["session"] = moved[entry["session"]]

    # One trade printed in two bulletins — a session re-issued — is one trade.
    # A trade printed twice in one bulletin is two: 294700 prints an insider of
    # Palm Hills buying 100,000 shares twice, on two rows, and they used to be
    # published as one. So a later bulletin adds only the copies of a trade
    # beyond those an earlier one already printed. First in filing order wins,
    # which is the order the PDFs were always read.
    records: list[dict] = []
    published: dict[str, int] = {}
    kept: list[dict] = []
    for filing_id in sorted(by_filing, key=lambda f: (len(f), f)):
        here: dict[str, int] = {}
        for row in by_filing[filing_id]:
            kept.append(row)
            # Matched first, so a session re-issued after an alias was added
            # is the same trade under its old reading and its new one.
            record = as_published(row, alias_map, by_ticker)
            # An undated trade is only ever the same trade within its bulletin.
            k = (f"{record.get('date') or 'undated-' + filing_id}:"
                 f"{record.get('ticker') or record.get('company')}:"
                 f"{record.get('action')}:{record.get('shares')}:{record.get('relationship')}")
            here[k] = here.get(k, 0) + 1
            if here[k] <= published.get(k, 0):
                continue
            records.append(record)
        for k, copies in here.items():
            published[k] = max(published.get(k, 0), copies)

    updated = {"schemaVersion": 2,
               "read": dict(sorted(store["read"].items(), key=lambda kv: (len(kv[0]), kv[0]))),
               "rows": kept}
    text = json.dumps(updated, ensure_ascii=False, indent=2)
    if write:
        try:
            held = BULLETIN_STORE.read_text(encoding="utf-8")
        except OSError:
            held = None
        if held != text:
            BULLETIN_STORE.write_text(text, encoding="utf-8")
    return records


def parse_latest_disclosures(by_ticker: dict[str, dict], records: list[dict]) -> None:
    seen_ids = {r.get("id") for r in records if r.get("id")}
    seen_keys = {f"{r.get('date')}:{r.get('ticker')}:{r.get('action')}" for r in records if r.get("ticker")}

    files_to_read = []
    if LATEST_DISCLOSURES.exists():
        files_to_read.append(LATEST_DISCLOSURES)
    for p in sorted(REPO.glob("public/data/v1/disclosures/archive/2026-*.json")):
        if p not in files_to_read:
            files_to_read.append(p)

    for file_p in files_to_read:
        try:
            data = json.loads(file_p.read_text(encoding="utf-8"))
            items = data.get("items", [])
        except Exception as e:
            print(f"Warning loading {file_p}: {e}", file=sys.stderr)
            continue

        for it in items:
            title = it.get("title", "")
            title_en = it.get("title_en", "")
            date = it.get("date", "")
            filing_id = str(it.get("id", "")).replace("egx-", "")
            link = it.get("link", "")
            tickers = it.get("tickers", [])
            ticker = tickers[0] if tickers else None

            # Attempt to extract ticker from title if not set
            if not ticker:
                m_tick = TICKER_RE.search(title)
                if m_tick:
                    ticker = m_tick.group(1).upper()
                elif "فالمور" in title or "VLMR" in title:
                    ticker = "VLMR"

            if "خزينة" in title:
                is_buy = "شراء" in title
                is_sell = "بيع" in title
                is_cancel = "إعدام" in title or "تخفيض" in title
                action = "treasury_purchase" if is_buy else "treasury_sale" if is_sell else "treasury_cancel" if is_cancel else "treasury_event"
                co_meta = by_ticker.get(ticker or "", {})
                rec_id = f"filing-{filing_id}"
                if rec_id in seen_ids:
                    continue
                seen_ids.add(rec_id)

                records.append({
                    "id": rec_id,
                    "filingId": filing_id,
                    "sourceType": "treasury_filing",
                    "date": date,
                    "ticker": ticker,
                    "company": co_meta.get("name") or (ticker or "Treasury Stock"),
                    "companyAr": co_meta.get("nameAr") or (ticker or "أسهم خزينة"),
                    "sector": co_meta.get("sector") or "",
                    "sectorAr": co_meta.get("sectorAr") or "",
                    "action": action,
                    "actionLabel": (
                        "Treasury Purchase" if action == "treasury_purchase" else
                        "Treasury Sale" if action == "treasury_sale" else
                        "Treasury Cancellation" if action == "treasury_cancel" else
                        "Treasury Notice"
                    ),
                    "actionLabelAr": (
                        "شراء أسهم خزينة" if action == "treasury_purchase" else
                        "مبيعات أسهم خزينة" if action == "treasury_sale" else
                        "إعدام أسهم خزينة" if action == "treasury_cancel" else
                        "إفصاح أسهم خزينة"
                    ),
                    "relationship": "treasury",
                    "relationshipLabel": "Company Treasury",
                    "relationshipLabelAr": "الشركة (أسهم خزينة)",
                    "positionRaw": "Treasury Shares",
                    "investorName": (co_meta.get("name") or ticker or "Company") + " Treasury",
                    "investorNameAr": "خزينة " + (co_meta.get("nameAr") or ticker or "الشركة"),
                    "shares": None,
                    "title": title,
                    "titleEn": title_en or title,
                    "link": link,
                })

            elif "إفصاح بعد التنفيذ" in title and ticker:
                co_meta = by_ticker.get(ticker or "", {})
                rec_id = f"filing-{filing_id}"
                if rec_id in seen_ids:
                    continue
                seen_ids.add(rec_id)

                records.append({
                    "id": rec_id,
                    "filingId": filing_id,
                    "sourceType": "post_execution_filing",
                    "date": date,
                    "ticker": ticker,
                    "company": co_meta.get("name") or ticker,
                    "companyAr": co_meta.get("nameAr") or ticker,
                    "sector": co_meta.get("sector") or "",
                    "sectorAr": co_meta.get("sectorAr") or "",
                    "action": "disclosure",
                    "actionLabel": "Post-Execution Trade Form",
                    "actionLabelAr": "إفصاح بعد التنفيذ",
                    "relationship": "insider",
                    "relationshipLabel": "Insider / Major Holder",
                    "relationshipLabelAr": "متصل / مساهم رئيسي",
                    "positionRaw": "Post-Implementation Disclosure",
                    "investorName": (co_meta.get("name") or ticker or "Company") + " Disclosed Insiders",
                    "investorNameAr": "داخليو " + (co_meta.get("nameAr") or ticker or "الشركة"),
                    "shares": None,
                    "title": title,
                    "titleEn": title_en or title,
                    "link": link,
                })


def main() -> int:
    parser = argparse.ArgumentParser(description="Build EGX Insider & Treasury flow dataset")
    parser.add_argument("--check", action="store_true", help="Validate without writing files")
    parser.add_argument("--fetch", nargs="?", type=int, const=0, default=None,
                        metavar="N",
                        help="download session bulletins this machine has not "
                             "read yet (all of them, or the newest N)")
    args = parser.parse_args()

    # A check writes nothing, and in the daily build it runs before the rebuild
    # does the same work again; the network half is left to that pass.
    if args.fetch is not None and not args.check:
        fetch_bulletins(args.fetch)

    by_ticker, alias_map = load_company_directory()
    bulletin_records = parse_bulletin_pdfs(alias_map, by_ticker, write=not args.check)
    print(f"Parsed {len(bulletin_records)} bulletin transactions", file=sys.stderr)

    all_records = list(bulletin_records)
    parse_latest_disclosures(by_ticker, all_records)
    print(f"Total unified records: {len(all_records)}", file=sys.stderr)

    all_records.sort(key=lambda r: (1 if r.get("shares") else 0, r.get("date") or "1970-01-01", r.get("ticker") or ""), reverse=True)

    if args.check:
        if len(all_records) == 0:
            print("check failed: no insider records found", file=sys.stderr)
            return 1
        print(f"check passed: {len(all_records)} insider records ready", file=sys.stderr)
        return 0

    buy_count = sum(1 for r in all_records if r["action"] in ("bought", "treasury_purchase"))
    sell_count = sum(1 for r in all_records if r["action"] in ("sold", "treasury_sale"))
    treasury_buys = sum(1 for r in all_records if r["action"] == "treasury_purchase")
    treasury_sells = sum(1 for r in all_records if r["action"] == "treasury_sale")
    total_buy_shares = sum(r["shares"] or 0 for r in all_records if r["action"] == "bought")
    total_sell_shares = sum(r["shares"] or 0 for r in all_records if r["action"] == "sold")
    active_tickers = sorted({r["ticker"] for r in all_records if r.get("ticker")})
    active_treasury_tickers = sorted({r["ticker"] for r in all_records if r.get("ticker") and r["action"] == "treasury_purchase"})

    sessions = sorted({r["date"] for r in all_records if r.get("date")}, reverse=True)

    dataset = {
        "updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "asOf": sessions[0] if sessions else None,
        "source": "Official EGX Daily Bulletins & Post-Execution Disclosures",
        "basis": "Official exchange disclosures filed under Capital Market Law Articles 29 & 38",
        "basisAr": "إفصاحات رسمية مودعة لدى البورصة وفق المادتين ٢٩ و٣٨ من قواعد القيد",
        "summary": {
            "totalRecords": len(all_records),
            "buyCount": buy_count,
            "sellCount": sell_count,
            "treasuryBuyCount": treasury_buys,
            "treasurySellCount": treasury_sells,
            "totalBuyShares": total_buy_shares,
            "totalSellShares": total_sell_shares,
            "activeCompaniesCount": len(active_tickers),
            "activeTreasuryCompanies": active_treasury_tickers,
            "latestSession": sessions[0] if sessions else None,
            "earliestSession": sessions[-1] if sessions else None,
        },
        "sessions": sessions,
        "items": all_records,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(dataset, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(all_records)} items to {OUT_JSON}", file=sys.stderr)

    FIXTURE_JSON.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE_JSON.write_text(json.dumps(dataset, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote fixture to {FIXTURE_JSON}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
