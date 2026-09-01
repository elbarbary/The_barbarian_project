#!/usr/bin/env python3
"""Build an auditable EGX ownership/insider/treasury ledger.

The exchange publishes two different evidence levels and they must not be
blurred together:

* daily insider summaries contain company, relationship, buy/sell and volume;
* post-implementation disclosure forms contain the named investor, price and
  before/after ownership, usually inside a PDF.

This builder records every source document first. It extracts transaction rows
only from text-readable English daily-summary PDFs and leaves Article 29 fields
null until their own attachment is independently parsed. Missing detail is a
visible extraction gap, never a guessed buyer or percentage.
"""

from __future__ import annotations

import argparse
import datetime as dt
import gzip
import hashlib
import html
import json
import pathlib
import re
import subprocess
import sys
import tempfile

import scrapling_python


REPO = pathlib.Path(__file__).resolve().parent.parent
FILINGS = REPO / "data-source" / "egx-beta" / "filings"
OUT = REPO / "data-source" / "official" / "ownership"
PDFS = OUT / "pdfs"
COMPANIES = REPO / "public" / "data" / "v1" / "companies.json"
F5_DOWNLOADER = pathlib.Path(__file__).resolve().parent / "f5_pdf_download.py"

TICKER = re.compile(r"\(([A-Z0-9.]{2,12})\.CA\)", re.I)
HREF = re.compile(r'href=["\']([^"\']+\.pdf)["\']', re.I)
DATE = re.compile(r"\b(\d{1,2})/(\d{1,2})/(20\d{2})\b")
TAG = re.compile(r"<[^>]+>")

DAILY_MARKERS = (
    "trading of insiders, major shareholders",
    "تعاملات الداخليين والمساهمين الرئيسيين",
)
DISCLOSURE_MARKERS = (
    "disclosure form",
    "نموذج إفصاح بعد التنفيذ",
    "نموذج الافصاح بعد التنفيذ",
)
POST_EXECUTION_MARKERS = (
    "post implementation disclosure form",
    "نموذج إفصاح بعد التنفيذ",
    "نموذج الافصاح بعد التنفيذ",
)

# The exchange files this form in two English wordings, and the regex knew one.
#
# Five of the eight sample disclosures say "related parties FOR insider" and
# "Major Shareholder"; three say "of" and "Main Shareholder". Matching only the
# second set silently dropped every transaction row in the majority of
# documents — not an error, not a failure, just a shorter ledger.
POSITION = (
    r"related parties\s+(?:for|of)\s+(?:insider|(?:main|major)\s*shareholder)|"
    r"(?:main|major)\s*shareholder|insider"
)
ENTRY = re.compile(
    rf"(?P<company>.+?)\s+(?P<position>{POSITION})\s+"
    r"(?P<action>buy|sold)\s+(?P<volume>\d+)\b",
    re.I | re.S,
)


def clean_text(value: str) -> str:
    return " ".join(html.unescape(TAG.sub(" ", value or "")).split())


def canonical_name(value: str) -> str:
    value = html.unescape(value or "").lower()
    value = value.replace("&", " and ")
    value = re.sub(r"\b(?:s\.a\.e|sae|co\.?|company|the)\b", " ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def iso_date(value: str) -> str | None:
    found = DATE.search(value or "")
    if not found:
        return None
    day, month, year = (int(part) for part in found.groups())
    try:
        return dt.date(year, month, day).isoformat()
    except ValueError:
        return None


def attachment_urls(item: dict) -> list[str]:
    urls: list[str] = []
    for body in (item.get("content"), item.get("contentArabic")):
        for link in HREF.findall(body or ""):
            if link.startswith("http"):
                url = link
            else:
                url = "https://www.egx.com.eg" + (link if link.startswith("/") else "/" + link)
            if url not in urls:
                urls.append(url)
    return urls


def read_filings(months: set[str] | None = None) -> list[dict]:
    rows: list[dict] = []
    for path in sorted(FILINGS.glob("????-??.json.gz")):
        if months and path.stem.replace(".json", "") not in months:
            continue
        try:
            document = json.loads(gzip.decompress(path.read_bytes()))
        except (OSError, ValueError):
            continue
        rows.extend(document.get("items") or [])
    return rows


def item_ticker(item: dict) -> str | None:
    text = " ".join((item.get("heading") or "", item.get("headingArabic") or ""))
    found = TICKER.search(text)
    return found.group(1).upper() if found else None


def alias_map(items: list[dict]) -> dict[str, str]:
    claims: dict[str, set[str]] = {}

    def claim(name: str, ticker: str) -> None:
        key = canonical_name(name)
        if key:
            claims.setdefault(key, set()).add(ticker)

    for item in items:
        ticker = item_ticker(item)
        if not ticker:
            continue
        for field in ("companyNameArabic", "companyName"):
            if item.get(field):
                claim(str(item[field]), ticker)
        heading = item.get("heading") or ""
        prefix = heading.split(f"({ticker}.CA)", 1)[0].strip(" -")
        if prefix:
            claim(prefix, ticker)
    try:
        companies = json.loads(COMPANIES.read_text(encoding="utf-8")).get("companies") or []
    except (OSError, ValueError):
        companies = []
    for company in companies:
        if company.get("ticker") and company.get("name_en"):
            claim(company["name_en"], company["ticker"])
    return {key: next(iter(tickers)) for key, tickers in claims.items() if len(tickers) == 1}


def classify(item: dict) -> str | None:
    text = " ".join(
        str(item.get(field) or "")
        for field in ("heading", "headingArabic", "content", "contentArabic")
    ).lower()
    if any(marker in text for marker in DAILY_MARKERS):
        return "daily_insider_summary"
    if "proceeds from the capital increase" in text or "حصيلة زيادة رأس المال" in text:
        return None
    if "shareholders' structure" in text or "هيكل المساهمين" in text:
        return "ownership_structure"
    if any(marker in text for marker in POST_EXECUTION_MARKERS):
        return "post_execution_disclosure"
    if any(marker.lower() in text for marker in DISCLOSURE_MARKERS):
        return "ownership_disclosure_unclassified"
    ticker = item_ticker(item)
    if ticker and ("treasury stocks" in text or "treasury shares" in text or "أسهم خزينة" in text):
        if "purchase" in text or "buy" in text or "شراء" in text:
            return "treasury_purchase"
        if "sale" in text or "sell" in text or "بيع" in text:
            return "treasury_sale"
        return "treasury_event"
    return None


def document_record(item: dict) -> dict | None:
    kind = classify(item)
    if kind is None:
        return None
    heading = item.get("heading") or item.get("headingArabic") or ""
    combined = " ".join((heading, item.get("content") or "", item.get("contentArabic") or ""))
    return {
        "filingId": str(item.get("code")),
        "publishedAt": item.get("dateStamp"),
        "sessionDate": iso_date(combined),
        "kind": kind,
        "ticker": item_ticker(item),
        "isin": item.get("isin"),
        "title": heading,
        "titleArabic": item.get("headingArabic"),
        "attachments": attachment_urls(item),
        "isCorrection": heading.lower().startswith("correction") or "استدراك" in (item.get("headingArabic") or ""),
        "source": "EGX beta news-search",
    }


def strip_summary_header(text: str) -> str:
    text = text.replace("\f", " ")
    text = re.sub(
        r"Trading of Insiders, Major Shareholders.*?Session\s+\d{1,2}/\d{1,2}/20\d{2}",
        " ", text, flags=re.I | re.S,
    )
    text = re.sub(r"Company Name\s+Position\s+Transa\s+Volume", " ", text, flags=re.I)
    return " ".join(text.split())


def parse_daily_summary(text: str, *, aliases: dict[str, str], filing_id: str,
                        session_date: str | None, source_pdf: str) -> list[dict]:
    body = strip_summary_header(text)
    rows: list[dict] = []
    for sequence, match in enumerate(ENTRY.finditer(body), start=1):
        company = " ".join(match.group("company").split()).strip(" -")
        position = " ".join(match.group("position").lower().split())
        action = "buy" if match.group("action").lower() == "buy" else "sell"
        key = canonical_name(company)
        rows.append({
            "id": f"egx-{filing_id}-{sequence}",
            "filingId": filing_id,
            "sessionDate": session_date,
            "company": company,
            "ticker": aliases.get(key),
            "relationship": position,
            "action": action,
            "shares": int(match.group("volume")),
            "investorName": None,
            "price": None,
            "ownershipBeforePercent": None,
            "ownershipAfterPercent": None,
            "sourcePdf": source_pdf,
            "evidenceLevel": "official_daily_summary_unnamed_party",
        })
    return rows


def english_summary_url(document: dict) -> str | None:
    candidates = [url for url in document.get("attachments") or [] if "_101.pdf" in url.lower()]
    return candidates[0] if candidates else None


def pdf_name(document: dict, url: str) -> str:
    suffix = pathlib.PurePosixPath(url).name
    return f"egx-{document['filingId']}-{suffix}"


def download_summaries(documents: list[dict]) -> dict[str, pathlib.Path]:
    PDFS.mkdir(parents=True, exist_ok=True)
    jobs = []
    lookup: dict[str, pathlib.Path] = {}
    for document in documents:
        if document["kind"] != "daily_insider_summary":
            continue
        url = english_summary_url(document)
        if not url:
            continue
        output = PDFS / pdf_name(document, url)
        lookup[document["filingId"]] = output
        if output.exists() and output.stat().st_size >= 10_000:
            continue
        jobs.append({"url": url, "output": str(output)})
    if not jobs:
        return lookup
    python = scrapling_python.find()
    if python is None:
        return lookup
    with tempfile.NamedTemporaryFile("w", suffix=".json", encoding="utf-8", delete=False) as handle:
        json.dump(jobs, handle)
        manifest = pathlib.Path(handle.name)
    try:
        try:
            subprocess.run(
                [str(python), str(F5_DOWNLOADER), str(manifest), "--batch-size", "2"],
                check=False, timeout=max(180, len(jobs) * 35),
            )
        except subprocess.TimeoutExpired:
            # The PDFs completed before the timeout remain valid and are used.
            # A protected attachment must not prevent the document-level ledger
            # and explicit extraction gaps from being written.
            pass
    finally:
        manifest.unlink(missing_ok=True)
    return lookup


def extract_pdf(path: pathlib.Path) -> str:
    if not path.exists() or path.stat().st_size < 1_000:
        return ""
    result = subprocess.run(
        ["pdftotext", "-raw", str(path), "-"], capture_output=True, text=True, timeout=30
    )
    return result.stdout if result.returncode == 0 else ""


def build(items: list[dict], *, download: bool = False) -> dict:
    documents = [record for item in items if (record := document_record(item))]
    documents.sort(key=lambda row: (row.get("publishedAt") or "", row["filingId"]))
    aliases = alias_map(items)
    pdfs = download_summaries(documents) if download else {
        document["filingId"]: PDFS / pdf_name(document, english_summary_url(document))
        for document in documents
        if document["kind"] == "daily_insider_summary" and english_summary_url(document)
    }
    transactions: list[dict] = []
    parsed_documents = 0
    for document in documents:
        path = pdfs.get(document["filingId"])
        if not path:
            continue
        text = extract_pdf(path)
        if not text:
            continue
        rows = parse_daily_summary(
            text,
            aliases=aliases,
            filing_id=document["filingId"],
            session_date=document.get("sessionDate"),
            source_pdf=str(path.relative_to(REPO)),
        )
        if rows:
            parsed_documents += 1
            transactions.extend(rows)
            document["attachmentSha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
            document["transactionRowsExtracted"] = len(rows)
    unresolved = sum(1 for row in transactions if not row.get("ticker"))
    disclosures = [row for row in documents if row["kind"] == "post_execution_disclosure"]
    unclassified = [row for row in documents if row["kind"] == "ownership_disclosure_unclassified"]
    return {
        "schemaVersion": 1,
        "builtAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "source": "official EGX filing archive and text-readable attachments",
        "documents": documents,
        "transactions": transactions,
        "postExecutionDisclosures": disclosures,
        "coverage": {
            "sourceDocuments": len(documents),
            "dailySummaryDocuments": sum(row["kind"] == "daily_insider_summary" for row in documents),
            "dailySummaryDocumentsParsed": parsed_documents,
            "transactionRows": len(transactions),
            "transactionRowsWithoutResolvedTicker": unresolved,
            "postExecutionDocumentsAwaitingStructuredExtraction": len(disclosures),
            "unclassifiedOwnershipDisclosureDocuments": len(unclassified),
            "ownershipStructureDocuments": sum(
                row["kind"] == "ownership_structure" for row in documents
            ),
            "treasuryStockDocuments": sum(
                row["kind"].startswith("treasury_") for row in documents
            ),
            "namedInvestorRegistryPubliclyAvailable": False,
        },
        "limitations": [
            "Daily EGX summaries identify the party relationship but not the party name.",
            "Named investor, price and ownership percentages remain null until the individual post-execution attachment is parsed and verified.",
            "Generic 'disclosure form' notices remain unclassified until their attachment establishes the legal form; they are not assumed to be post-execution trades.",
            "MCDR's complete shareholder register is not a public dataset available to this collector.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--month", action="append", help="limit to YYYY-MM; repeatable")
    parser.add_argument("--download-pdfs", action="store_true")
    parser.add_argument("--output", type=pathlib.Path, default=OUT / "ownership-ledger.json")
    args = parser.parse_args()
    items = read_filings(set(args.month or []) or None)
    ledger = build(items, download=args.download_pdfs)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(ledger, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(ledger["coverage"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
