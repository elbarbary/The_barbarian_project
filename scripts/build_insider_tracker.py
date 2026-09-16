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
import inspect
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
        canonical("Future care for medical industries (FCMI)"): "FCMI",
        canonical("Future care for medical industries"): "FCMI",
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
        canonical("Arab Real Estate Investment CO.- ALICO"): "ALIC",
        canonical("Arab Real Estate Investment CO.-ALICO"): "ALIC",
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
    }
    alias_map.update(manual)
    return by_ticker, alias_map


def resolve_ticker(co_raw: str, alias_map: dict[str, str]) -> str | None:
    if not co_raw:
        return None
    key = canonical(co_raw)
    if key in alias_map:
        return alias_map[key]
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
    """Whether a bulletin the store remembers needs asking for again.

    One that gave rows is done. One that gave none is done only for the parser
    that read it: seven of the 68 on the laptop on 16 Sep 2026 came back empty
    because the parser missed their layout — a volume printed a line below its
    trade, `Session30/07//2026` — not because nobody traded, and a parser that
    learns the layout should be handed them again.
    """
    if not isinstance(entry, dict):
        return False
    return bool(entry.get("rows")) or entry.get("parser") == PARSER


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


def unread_bulletins() -> list[dict]:
    """Session bulletins neither on this disk nor in the store, newest first.

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
        # The `_101` attachment is the Latin-headed table `pdftotext -layout`
        # can be read from; `_1` is the Arabic rendering of the same session.
        if not any(u.endswith("_101.pdf") for u in doc.get("attachments") or []):
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
        url = next(u for u in doc["attachments"] if u.endswith("_101.pdf"))
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


def bulletin_rows(text: str, filing_id: str, alias_map: dict[str, str],
                  by_ticker: dict[str, dict]) -> tuple[str | None, list[dict]]:
    """One bulletin's session date and its transactions, in the order printed."""
    records: list[dict] = []
    seen_keys: set[str] = set()

    date_m = re.search(r"Session\s*(\d{1,2})[/]+(\d{1,2})[/]+(20\d{2})", text, re.I) or re.search(r"(\d{1,2})[/]+(\d{1,2})[/]+(20\d{2})", text)
    session_date = None
    if date_m:
        day, month, year = int(date_m.group(1)), int(date_m.group(2)), int(date_m.group(3))
        session_date = f"{year:04d}-{month:02d}-{day:02d}"

    current_company = None
    for line in text.splitlines():
        l_s = line.strip()
        if not l_s or "Trading of Insiders" in l_s or "Company Name" in l_s or "\x0c" in line:
            if "\x0c" in line:
                current_company = None
            continue

        m_act = re.search(r"\b(buy|sell|sold)\b", line, re.I)
        m_vol = re.search(r"\b([\d,]{3,})\b", line)
        m_pos = re.search(r"\b(related parties|insider|main shareholder|major)\b", line, re.I)

        cutoff = m_pos.start() if m_pos else (m_act.start() if m_act else len(line))
        co_chunk = line[:cutoff].strip()
        if co_chunk and len(co_chunk) > 2 and not re.match(r"^\d+$", co_chunk):
            current_company = " ".join(co_chunk.split())

        if m_act and m_vol and current_company:
            act_str = m_act.group(1).lower()
            act = "bought" if act_str == "buy" else "sold"
            try:
                shares = int(m_vol.group(1).replace(",", ""))
            except ValueError:
                continue

            pos_raw = m_pos.group(1).lower() if m_pos else "insider"
            rel = (
                "related_party" if "related" in pos_raw else
                "major_holder" if ("main" in pos_raw or "major" in pos_raw) else
                "insider"
            )

            ticker = resolve_ticker(current_company, alias_map)
            co_meta = by_ticker.get(ticker or "", {})
            comp_display = co_meta.get("name") or current_company
            comp_ar = co_meta.get("nameAr") or current_company

            k = f"{session_date}:{ticker or current_company}:{act}:{shares}:{rel}"
            if k in seen_keys:
                continue
            seen_keys.add(k)

            records.append({
                # Numbered within its own bulletin, so a row keeps its id
                # whichever other bulletins a machine happens to hold.
                "id": f"bulletin-{filing_id}-{len(records) + 1}",
                "filingId": filing_id,
                "sourceType": "bulletin",
                "date": session_date,
                "ticker": ticker,
                "company": comp_display,
                "companyAr": comp_ar,
                "sector": co_meta.get("sector") or "",
                "sectorAr": co_meta.get("sectorAr") or "",
                "action": act,
                "actionLabel": "Bought" if act == "bought" else "Sold",
                "actionLabelAr": "شراء" if act == "bought" else "مبيعات",
                "relationship": rel,
                "relationshipLabel": (
                    "Connected Group" if rel == "related_party" else
                    "Major Shareholder" if rel == "major_holder" else
                    "Insider / Board"
                ),
                "relationshipLabelAr": (
                    "مجموعة مرتبطة" if rel == "related_party" else
                    "مساهم رئيسي" if rel == "major_holder" else
                    "مجلس إدارة / داخلي"
                ),
                "positionRaw": pos_raw,
                "shares": shares,
                "title": f"تعامل على أسهم {comp_ar} ({'شراء' if act == 'bought' else 'مبيعات'}): {shares:,} سهم",
                "titleEn": f"Transaction on {comp_display} ({act}): {shares:,} shares",
                "link": f"https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID={filing_id}" if filing_id != "0" else "",
            })

    return session_date, records


# Which parser read a bulletin that gave nothing. Its own source, so changing
# how a bulletin is read is all it takes to have the empty ones read again.
PARSER = hashlib.sha256(inspect.getsource(bulletin_rows).encode("utf-8")).hexdigest()[:12]


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
        session_date, rows = bulletin_rows(res.stdout, filing_id, alias_map, by_ticker)
        by_filing[filing_id] = rows
        store["read"][filing_id] = {"session": session_date, "rows": len(rows), "parser": PARSER}
        if not rows:
            print(f"::warning title=Session bulletin read as empty::{pdf_path.name} "
                  f"(session {session_date or 'undated'}) gave no transactions. "
                  "It is not asked for again until the parser changes.")

    # Every row's session checked against the day its bulletin was filed, the
    # rows already in the store included: 41 of them were published under a
    # date their bulletin could not have been for.
    for filing_id, rows in by_filing.items():
        doc = filed.get(filing_id)
        if not doc or not rows:
            continue
        printed = rows[0].get("date")
        session = session_of(printed, doc)
        if session == printed:
            continue
        for row in rows:
            row["date"] = session
        if isinstance(store["read"].get(filing_id), dict):
            store["read"][filing_id]["session"] = session
        if session is None:
            print(f"::warning title=Session bulletin date unclear::Bulletin {filing_id}, "
                  f"filed {doc['publishedAt'][:10]}, is dated {printed} inside and "
                  f"{doc.get('sessionDate')} in its title, and neither can be its "
                  f"session. Its {len(rows)} trades are published without a date.")

    # One trade printed in two bulletins — a session re-issued — is one trade.
    # First in filing order wins, which is the order the PDFs were always read.
    records: list[dict] = []
    seen_keys: set[str] = set()
    kept: list[dict] = []
    for filing_id in sorted(by_filing, key=lambda f: (len(f), f)):
        for row in by_filing[filing_id]:
            kept.append(row)
            # An undated trade is only ever the same trade within its bulletin.
            k = (f"{row.get('date') or 'undated-' + filing_id}:"
                 f"{row.get('ticker') or row.get('company')}:"
                 f"{row.get('action')}:{row.get('shares')}:{row.get('relationship')}")
            if k in seen_keys:
                continue
            seen_keys.add(k)
            records.append(row)

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
