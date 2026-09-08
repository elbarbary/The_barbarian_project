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
    }
    alias_map.update(manual)
    return by_ticker, alias_map


def parse_bulletin_pdfs(alias_map: dict[str, str], by_ticker: dict[str, dict]) -> list[dict]:
    records: list[dict] = []
    seen_keys: set[str] = set()

    # 1. Load cached bulletin records if available (vital for ephemeral CI runners where PDFs are gitignored)
    if BULLETIN_STORE.exists():
        try:
            cached = json.loads(BULLETIN_STORE.read_text(encoding="utf-8"))
            if isinstance(cached, list):
                for r in cached:
                    act_norm = "buy" if r.get('action') in ("buy", "bought") else "sell"
                    k = f"{r.get('date')}:{r.get('ticker') or r.get('company')}:{act_norm}:{r.get('shares')}:{r.get('relationship')}"
                    if k not in seen_keys:
                        seen_keys.add(k)
                        records.append(r)
        except Exception as e:
            print(f"Warning loading {BULLETIN_STORE}: {e}", file=sys.stderr)

    # 2. Parse any local PDFs (e.g. from local environment or new downloads)
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

        date_m = re.search(r"Session\s*(\d{1,2}/\d{1,2}/(20\d{2}))", text, re.I)
        session_date = None
        if date_m:
            day, month, year = int(date_m.group(1).split("/")[0]), int(date_m.group(1).split("/")[1]), int(date_m.group(2))
            session_date = f"{year:04d}-{month:02d}-{day:02d}"

        lines = text.splitlines()
        pos_start = 42
        tx_start = 65
        vol_start = 77
        for line in lines[:10]:
            if "Position" in line and "Transaction" in line:
                p_idx = line.find("Position")
                t_idx = line.find("Transaction") if "Transaction" in line else line.find("Transa")
                v_idx = line.find("Volume")
                if p_idx != -1: pos_start = max(35, p_idx - 6)
                if t_idx != -1: tx_start = t_idx - 4
                if v_idx != -1: vol_start = v_idx - 4
                break

        cur_lines: list[str] = []
        for line in lines:
            if "Trading of Insiders" in line or "Company Name" in line or "\x0c" in line:
                continue
            if not line.strip():
                if cur_lines:
                    parse_block(cur_lines, session_date, filing_id, fname, pos_start, tx_start, vol_start, alias_map, by_ticker, records, seen_keys)
                    cur_lines = []
            else:
                cur_lines.append(line)
        if cur_lines:
            parse_block(cur_lines, session_date, filing_id, fname, pos_start, tx_start, vol_start, alias_map, by_ticker, records, seen_keys)

    # 3. Save accumulated records back to store so CI keeps them
    if records:
        try:
            BULLETIN_STORE.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            print(f"Warning saving {BULLETIN_STORE}: {e}", file=sys.stderr)

    return records


def parse_block(block_lines: list[str], session_date: str | None, filing_id: str, fname: str,
                pos_start: int, tx_start: int, vol_start: int,
                alias_map: dict[str, str], by_ticker: dict[str, dict],
                records: list[dict], seen_keys: set[str]) -> None:
    comp_parts = []
    pos_parts = []
    action = None
    shares = None

    for line in block_lines:
        c_chunk = line[:pos_start].strip()
        pos_pat = re.compile(r"\b(related parties|insider|main|major)\b", re.I)
        if pos_pat.search(c_chunk):
            m = pos_pat.search(c_chunk)
            p_bleed = c_chunk[m.start():].strip()
            c_chunk = c_chunk[:m.start()].strip()
            if p_bleed:
                pos_parts.append(p_bleed)

        if c_chunk:
            comp_parts.append(c_chunk)

        p_chunk = line[pos_start:tx_start].strip() if len(line) > pos_start else ""
        if p_chunk:
            pos_parts.append(p_chunk)

        rest = line[tx_start:].strip() if len(line) > tx_start else ""
        m_act = re.search(r"\b(buy|sell|sold)\b", rest, re.I)
        m_vol = re.search(r"\b([\d,]+)\b", line[vol_start:] if len(line) > vol_start else rest)
        if m_act:
            action = "buy" if m_act.group(1).lower() == "buy" else "sell"
        if m_vol:
            try:
                shares = int(m_vol.group(1).replace(",", ""))
            except ValueError:
                pass

    if not action or shares is None:
        return

    company_raw = " ".join(comp_parts).strip(" -")
    position_raw = " ".join(pos_parts).strip()
    if not company_raw:
        return

    key = canonical(company_raw)
    ticker = alias_map.get(key)
    if not ticker:
        for a_k, a_tick in alias_map.items():
            if len(a_k) > 5 and (a_k in key or key in a_k):
                ticker = a_tick
                break

    rel = "insider"
    pos_lower = position_raw.lower()
    if "related" in pos_lower:
        rel = "related_party"
    elif "major" in pos_lower or "main" in pos_lower:
        rel = "major_holder"

    dedup_key = f"{session_date}:{ticker or company_raw}:{action}:{shares}:{rel}"
    if dedup_key in seen_keys:
        return
    seen_keys.add(dedup_key)

    co_meta = by_ticker.get(ticker or "", {})
    records.append({
        "id": f"bulletin-{filing_id}-{len(records) + 1}",
        "filingId": filing_id,
        "sourceType": "bulletin",
        "date": session_date,
        "ticker": ticker,
        "company": co_meta.get("name") or company_raw,
        "companyAr": co_meta.get("nameAr") or company_raw,
        "sector": co_meta.get("sector") or "",
        "sectorAr": co_meta.get("sectorAr") or "",
        "action": "bought" if action == "buy" else "sold",
        "actionLabel": "Bought" if action == "buy" else "Sold",
        "actionLabelAr": "شراء" if action == "buy" else "مبيعات",
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
        "positionRaw": position_raw,
        "shares": shares,
        "title": f"تعامل على أسهم {company_raw} ({'شراء' if action == 'buy' else 'مبيعات'}): {shares:,} سهم",
        "titleEn": f"Transaction on {company_raw} ({'bought' if action == 'buy' else 'sold'}): {shares:,} shares",
        "link": f"https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID={filing_id}" if filing_id != "0" else "",
    })


def parse_latest_disclosures(by_ticker: dict[str, dict], records: list[dict]) -> None:
    if not LATEST_DISCLOSURES.exists():
        return

    try:
        data = json.loads(LATEST_DISCLOSURES.read_text(encoding="utf-8"))
        items = data.get("items", [])
    except Exception as e:
        print(f"Warning loading latest.json: {e}", file=sys.stderr)
        return

    for it in items:
        title = it.get("title", "")
        title_en = it.get("title_en", "")
        date = it.get("date", "")
        filing_id = it.get("id", "").replace("egx-", "")
        link = it.get("link", "")
        tickers = it.get("tickers", [])
        ticker = tickers[0] if tickers else None

        if "خزينة" in title:
            is_buy = "شراء" in title
            is_sell = "بيع" in title
            is_cancel = "إعدام" in title or "تخفيض" in title
            action = "treasury_purchase" if is_buy else "treasury_sale" if is_sell else "treasury_cancel" if is_cancel else "treasury_event"
            co_meta = by_ticker.get(ticker or "", {})
            records.append({
                "id": f"filing-{filing_id}",
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
            records.append({
                "id": f"filing-{filing_id}",
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
