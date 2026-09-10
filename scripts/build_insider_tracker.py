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
import json
import pathlib
import re
import subprocess
import sys

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


def parse_bulletin_pdfs(alias_map: dict[str, str], by_ticker: dict[str, dict]) -> list[dict]:
    records: list[dict] = []
    seen_keys: set[str] = set()

    # Parse local PDFs freshly with robust carry-forward
    for pdf_path in sorted(PDF_DIR.glob("*.pdf")):
        fname = pdf_path.name
        m_filing = re.search(r"egx-(\d+)", fname)
        filing_id = m_filing.group(1) if m_filing else "0"

        try:
            res = subprocess.run(["pdftotext", "-layout", str(pdf_path), "-"], capture_output=True, text=True, timeout=30)
            if res.returncode != 0:
                continue
            text = res.stdout
        except Exception:
            continue

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

    # Fallback to cached store if no PDFs were parsed (e.g. CI runner)
    if not records and BULLETIN_STORE.exists():
        try:
            cached = json.loads(BULLETIN_STORE.read_text(encoding="utf-8"))
            if isinstance(cached, list):
                for r in cached:
                    records.append(r)
        except Exception as e:
            print(f"Warning loading cached {BULLETIN_STORE}: {e}", file=sys.stderr)

    # Save fresh records to store so CI keeps them
    if records:
        try:
            BULLETIN_STORE.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            print(f"Warning saving {BULLETIN_STORE}: {e}", file=sys.stderr)

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
                    "shares": None,
                    "title": title,
                    "titleEn": title_en or title,
                    "link": link,
                })


def main() -> int:
    parser = argparse.ArgumentParser(description="Build EGX Insider & Treasury flow dataset")
    parser.add_argument("--check", action="store_true", help="Validate without writing files")
    args = parser.parse_args()

    by_ticker, alias_map = load_company_directory()
    bulletin_records = parse_bulletin_pdfs(alias_map, by_ticker)
    print(f"Parsed {len(bulletin_records)} bulletin transactions", file=sys.stderr)

    all_records = list(bulletin_records)
    parse_latest_disclosures(by_ticker, all_records)
    print(f"Total unified records: {len(all_records)}", file=sys.stderr)

    all_records.sort(key=lambda r: (r.get("date") or "1970-01-01", r.get("ticker") or ""), reverse=True)

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
