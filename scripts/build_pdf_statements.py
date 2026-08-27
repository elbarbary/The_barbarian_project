#!/usr/bin/env python3
"""Collect verified statement fields from EGX results attachments.

The exchange's structured results announcement gives a precise net-profit
figure but not the rest of the statement. Its attachment may carry revenue,
the balance sheet, cash flow, or only a short earnings release. This collector
fills only the lines visibly present in that attachment.

Retrieval and verification are deliberately separate:

* Every company document already carries the official EGX filing code and
  source URL, so discovery starts from that auditable identifier.
* FoudaLens mirrors many EGX disclosures under stable, same-origin PDF URLs.
* For missing mirrors, the beta metadata API resolves the official PDF and one
  ephemeral Playwright visit executes F5's TSPD JavaScript. The resulting
  in-memory cookies feed concurrent HTTP downloads from the same IP and user
  agent; no persistent browser profile is used.
* Vertex reads the full scan once, then independently audits only the pages the
  first read named. The second prompt is not shown the first answer.
* Both reads must agree; net profit must match the structured EGX announcement;
  and every available accounting identity must balance.

The committed output is `pdf_statements_filed.json`, never the bulky PDFs.
`apply_pdf_statements.py` replays that store after the market builder recreates
the company documents, so a verified figure survives every daily build.

Examples:
    python3 scripts/build_pdf_statements.py --limit 1
    python3 scripts/build_pdf_statements.py --only ABUK --period "H1 2026"
    python3 scripts/build_pdf_statements.py --only ABUK --period "H1 2026" \
        --pdf /path/to/already-downloaded.pdf
"""

from __future__ import annotations

import argparse
import base64
import concurrent.futures
import datetime
import functools
import hashlib
import html
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

# This repository's funded Vertex project. The Mac's ADC quota project is
# changed by unrelated projects and was pointing at ChaosCtrl (billing
# disabled), making this collector fall back to an empty AI-Studio key despite
# ESTHMR's Vertex project being funded. A CLI option below is the deliberate
# override; an unrelated inherited environment value is not.
ESTHMR_VERTEX_PROJECT = "project-8bba98ed-6d90-45af-ab8"

import egx_pdf_statements as V
import gemini
import harvest_egx_beta as BETA
import scrapling_python


REPO = pathlib.Path(__file__).resolve().parent.parent
STORE = pathlib.Path(__file__).resolve().parent / "pdf_statements_filed.json"
FILED_STORE = pathlib.Path(__file__).resolve().parent / "financials_filed.json"
COMPANIES = REPO / "public" / "data" / "v1" / "companies"
DISCLOSURE_DOCUMENTS = REPO / "public" / "data" / "v1" / "disclosures" / "documents"
SOURCE = "https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID={}"
FOUDALENS = "https://foudalens.com"
FOUDALENS_NEWS = FOUDALENS + "/en/news/{}"
CLASSIC = "https://www.egx.com.eg"
F5_DOWNLOADER = pathlib.Path(__file__).resolve().parent / "f5_pdf_download.py"
PDF_REVIEW = REPO / "data-source" / "egx-beta" / "pdf-cache" / "review"
BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)

DISCOVERY_PROMPT = """Read this scanned filed-results attachment.

Extract only figures visibly printed for the CURRENT period ending {period_end},
in millions of Egyptian pounds. Do not calculate a missing field, do not copy a
comparative-period value, and do not infer that an earnings release contains a
complete financial statement.

Return one JSON object with currency, period_end, and fields. `fields` may use
only these keys when the figure is printed:
revenue, gross_profit, operating_income, net_income, assets, liabilities,
equity, operating_cash_flow, investing_cash_flow, financing_cash_flow,
net_change_in_cash, dividends_paid, debt, short_term_debt, long_term_debt,
cash, finance_cost.

The borrowing keys mean money that was lent to this company and carries
interest. A balance sheet almost never prints a single "total borrowings" line
— it lists them separately, so **add up the borrowing lines within each
maturity** and put every component you added in `printed`, each with its Arabic
label and its printed figure, so the arithmetic can be checked against the page.

Count as borrowings: قروض, تسهيلات ائتمانية, بنوك دائنة (overdrafts), سندات
/ صكوك, and finance-lease liabilities (التزامات عقود التأجير التمويلي / عقود
إيجار).

  short_term_debt   the current ones: قروض وتسهيلات قصيرة الأجل, بنوك دائنة,
                    the current portion of long-term borrowings (الجزء المتداول
                    من القروض طويلة الأجل), and current lease liabilities.
  long_term_debt    the non-current ones: قروض طويلة الأجل and non-current
                    lease liabilities.
  debt              ONLY when the statement itself prints a combined total.
                    Never add the two maturities together yourself.
  cash              النقدية وما في حكمها / نقدية بالصندوق ولدى البنوك.
  finance_cost      تكاليف التمويل / أعباء تمويلية / فوائد مدينة for the
                    period, as a POSITIVE number however the statement signs it.

If a maturity has exactly one borrowing line, that line is the figure. If it
has none at all, omit the key — a company with no borrowings is a real answer.

These are NOT borrowings, and must never be returned under those keys: total
liabilities, trade payables (موردون / دائنون), provisions (مخصصات), deferred
tax, customer advances (دفعات مقدمة من العملاء), and — for a bank — customer
deposits (ودائع العملاء) and amounts due to banks, which are what a bank holds
rather than money borrowed to run itself. If a filing prints no separate
borrowings line, omit these keys entirely rather than substituting a total.

Every field must be an object with:
  value_m: numeric value in EGP millions
  page: 1-based PDF page number
  printed: the exact nearby printed number and unit

Prefer the most precise printed number over rounded prose. Negative values stay
negative. Use an empty fields object when nothing is present. Return JSON only.
"""

AUDIT_PROMPT = """Independently audit these rendered pages from one filed EGX
attachment. You have not been shown another model answer.

Read only figures visibly printed for the CURRENT period ending {period_end},
in millions of Egyptian pounds. Do not calculate missing values and do not use
the comparative period. Prefer the most precise table or chart label over
rounded narrative prose.

Return one JSON object with currency, period_end, and fields. `fields` may use
only: revenue, gross_profit, operating_income, net_income, assets, liabilities,
equity, operating_cash_flow, investing_cash_flow, financing_cash_flow,
net_change_in_cash, dividends_paid, debt, short_term_debt, long_term_debt,
cash, finance_cost. Every field is
{{"value_m": number, "page": 1-based PDF page, "printed": "exact evidence"}}.

The borrowing keys mean money lent to this company that carries interest —
قروض, تسهيلات ائتمانية, بنوك دائنة, سندات, and finance-lease liabilities
(التزامات عقود التأجير التمويلي). Balance sheets list these separately rather
than as one total, so add up the borrowing lines within each maturity and put
every component you added in `printed`, with its Arabic label and figure.
`short_term_debt` covers the current ones including the current portion of
long-term borrowings; `long_term_debt` the non-current ones; `debt` only when a
combined total is itself printed — never add the two maturities yourself.
`finance_cost` (تكاليف التمويل / أعباء تمويلية) is positive however the
statement signs it. Never return total liabilities, payables, provisions,
customer advances, or a bank's customer deposits under any borrowing key —
omit the key instead.

Return JSON only.
"""


def _store() -> dict:
    empty = {"filings": {}, "failures": {}}
    if not STORE.exists():
        return empty
    try:
        loaded = json.loads(STORE.read_text())
    except (OSError, json.JSONDecodeError):
        raise RuntimeError("PDF statement store is unreadable; refusing to overwrite it")
    loaded.setdefault("filings", {})
    loaded.setdefault("failures", {})
    return loaded


def _write_store(store: dict) -> None:
    STORE.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=STORE.parent, delete=False
    ) as handle:
        json.dump(store, handle, ensure_ascii=False, indent=1, sort_keys=True)
        handle.write("\n")
        staged = pathlib.Path(handle.name)
    staged.replace(STORE)


def _year(label: str) -> int:
    years = re.findall(r"20\d{2}", label or "")
    return int(years[-1]) if years else 0


def candidates(store: dict, *, since: int, only: str | None,
               period: str | None, refresh: bool,
               retry_failures: bool = False) -> list[dict]:
    """Newest net-profit-only filed periods that still need enrichment."""
    # `build_market_api` writes the authoritative flash first and a later merge
    # only fills its provenance. Some such rows therefore carry `filing_id` but
    # no `period_end`; the cumulative filing store has the date keyed by that
    # same code. Use it rather than guessing a fiscal calendar from the label.
    filed_by_code: dict[str, dict] = {}
    if FILED_STORE.exists():
        try:
            filed_by_code = (json.loads(FILED_STORE.read_text()).get("filings") or {})
        except (OSError, json.JSONDecodeError):
            filed_by_code = {}
    found: dict[str, dict] = {}
    for path in sorted(COMPANIES.glob("*.json")):
        try:
            doc = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError):
            continue
        ticker = doc.get("ticker") or path.stem
        if only and ticker != only.upper():
            continue
        financials = doc.get("financials") or {}
        for bucket in ("annual", "quarterly"):
            for row in financials.get(bucket) or []:
                label = str(row.get("period") or "")
                if period and label != period:
                    continue
                if _year(label) < since or row.get("net_income") is None:
                    continue
                filing_id = str(row.get("filing_id") or "")
                if not filing_id.startswith("egx-"):
                    continue
                code = filing_id[4:]
                if not code.isdigit():
                    continue
                if code in store["filings"] and not refresh:
                    continue
                if code in store["failures"] and not (refresh or retry_failures):
                    continue
                # Focus the default run on the rows the user actually called
                # out: recent EGX periods carrying profit and nothing else.
                # `--refresh` can revisit a partially-filled attachment later.
                if not refresh and any(row.get(name) is not None for name in V.ENRICHMENT_FIELDS):
                    continue
                filed_record = filed_by_code.get(code) or {}
                period_end = row.get("period_end") or filed_record.get("period_end")
                if not period_end:
                    # All eligible EGX rows should carry it. Refusing a missing
                    # date is safer than asking vision to decide which column.
                    continue
                candidate = {
                    "code": code,
                    "ticker": ticker,
                    "period": label,
                    "period_end": period_end,
                    "months": 12 if bucket == "annual" else _months(label),
                    "basis": row.get("basis") or filed_record.get("basis"),
                    "known_net_m": float(row["net_income"]),
                    "filed_on": (
                        row.get("filed_on") or row.get("filed")
                        or filed_record.get("filed_on")
                    ),
                    "source": SOURCE.format(code),
                }
                held = found.get(code)
                # One filing can be inherited by a comparative row. Keep the
                # row whose period end is latest; that is the filing's own one.
                if held is None or candidate["period_end"] > held["period_end"]:
                    found[code] = candidate
    return sorted(
        found.values(),
        key=lambda row: (row.get("filed_on") or "", row["period_end"], row["ticker"]),
        reverse=True,
    )


def _months(label: str) -> int | None:
    lead = (label or "").upper().split(" ", 1)[0]
    return {"Q1": 3, "H1": 6, "Q2": 6, "9M": 9, "Q3": 9, "FY": 12,
            "Q4": 12}.get(lead)


def _disclosure_links(page: str, ticker: str) -> list[str]:
    """Rank FoudaLens copies so English statements precede ancillary files."""
    wanted = f"/disclosures/{ticker.upper()}.CA/"
    ranked: dict[str, int] = {}
    pattern = r'<a\b[^>]*href=["\']([^"\']+\.pdf)["\'][^>]*>(.*?)</a>'
    for href, label_html in re.findall(pattern, page, re.I | re.S):
        href = html.unescape(href)
        if not href.startswith(wanted):
            continue
        label = html.unescape(re.sub(r"<[^>]+>", " ", label_html)).lower()
        score = 30
        if "/financial_statement/" in href:
            score = 0
        elif "/other/" in href:
            score = 10
        elif "/board_agm/" in href:
            score = 20
        if "financial statement" in label:
            score -= 4
        if "english" in label:
            score -= 2
        if "arabic" in label:
            score += 2
        ranked[href] = min(score, ranked.get(href, score))
    return [
        FOUDALENS + href
        for href, _ in sorted(ranked.items(), key=lambda item: (item[1], item[0]))
    ]


def resolve_mirror_attachments(code: str, ticker: str) -> list[str]:
    """Downloadable disclosure copies from the FoudaLens EGX news mirror."""
    request = urllib.request.Request(
        FOUDALENS_NEWS.format(code),
        headers={"User-Agent": BROWSER_UA, "Accept": "text/html"},
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            page = response.read().decode("utf-8", "replace")
    except Exception:
        return []
    return _disclosure_links(page, ticker)


def _filed_document_attachments(document: dict, code: str) -> list[str]:
    filing_id = f"egx-{code}"
    for item in document.get("items") or []:
        if item.get("id") != filing_id:
            continue
        return [
            str(url) for url in item.get("attachments") or []
            if str(url).lower().split("?", 1)[0].endswith(".pdf")
        ]
    return []


def _sibling_document_attachments(document: dict, code: str,
                                  filed_on: str | None) -> list[str]:
    """PDFs on an immediately adjacent same-day disclosure for the ticker.

    EGX often publishes the numeric results flash and its board/statement PDF
    as separate news items a few IDs apart. The structured profit anchor later
    proves that a sibling attachment belongs to the requested results period.
    """
    if not filed_on or not str(code).isdigit():
        return []
    target = int(code)
    rows: list[tuple[int, int, list[str]]] = []
    for item in document.get("items") or []:
        filing_id = str(item.get("id") or "")
        match = re.fullmatch(r"egx-(\d+)", filing_id)
        if not match or item.get("date") != filed_on:
            continue
        sibling = int(match.group(1))
        distance = abs(sibling - target)
        if sibling == target or distance > 3:
            continue
        urls = [
            str(url) for url in item.get("attachments") or []
            if str(url).lower().split("?", 1)[0].endswith(".pdf")
        ]
        if urls:
            # Prefer the preceding item when distances tie: EGX normally files
            # the board/statement attachment immediately before its results flash.
            rows.append((distance, 0 if sibling < target else 1, urls))
    found: list[str] = []
    for _, _, urls in sorted(rows):
        for url in urls:
            if url not in found:
                found.append(url)
    return found


@functools.lru_cache(maxsize=1)
def _harvested_disclosure_index() -> dict[str, dict]:
    """The app archive knows attachment URLs and confirmed empty pages."""
    root = DISCLOSURE_DOCUMENTS.parent
    paths = sorted((root / "archive").glob("*.json")) + [root / "latest.json"]
    found: dict[str, dict] = {}
    for path in paths:
        try:
            document = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError):
            continue
        items = document.get("items") if isinstance(document, dict) else document
        for item in items or []:
            filing_id = item.get("id")
            if filing_id:
                found[filing_id] = item
    return found


def resolve_local_filing(code: str, ticker: str) -> tuple[bool, list[str]]:
    """Return whether local harvesting settled this filing and any PDF URLs."""
    item = _harvested_disclosure_index().get(f"egx-{code}") or {}
    archive_urls = [
        str(url) for url in item.get("attachments") or []
        if str(url).lower().split("?", 1)[0].endswith(".pdf")
    ]
    if archive_urls:
        return True, archive_urls
    documents: list[dict] = []
    for suffix in ("", "-all"):
        path = DISCLOSURE_DOCUMENTS / f"{ticker.upper()}{suffix}.json"
        try:
            document = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError):
            continue
        documents.append(document)
        urls = _filed_document_attachments(document, code)
        if urls:
            return True, urls
    sibling_urls: list[str] = []
    for document in documents:
        for url in _sibling_document_attachments(document, code, item.get("date")):
            if url not in sibling_urls:
                sibling_urls.append(url)
    if sibling_urls:
        return True, sibling_urls
    return item.get("detail_read") is True, []


def resolve_local_attachments(code: str, ticker: str) -> list[str]:
    """Reuse official attachment links already harvested for the app."""
    return resolve_local_filing(code, ticker)[1]


def resolve_official_attachments(code: str) -> list[str]:
    """Historical PDF URLs from the unlimited beta metadata endpoint."""
    payload = BETA.request("/api/bff/egx/news-detail", {"id": int(code)})
    items = payload.get("data") or []
    urls: list[str] = []
    for item in items:
        for key in ("content", "contentArabic"):
            body = html.unescape(item.get(key) or "")
            for href in re.findall(r'href=["\']([^"\']+\.pdf(?:\?[^"\']*)?)["\']', body, re.I):
                url = href if href.startswith("http") else CLASSIC + href
                if url not in urls:
                    urls.append(url)
    return urls


def download_mirror_pdf(url: str, output: pathlib.Path) -> None:
    """Download a same-origin FoudaLens disclosure copy without a browser."""
    request = urllib.request.Request(
        url,
        headers={"User-Agent": BROWSER_UA, "Accept": "application/pdf"},
    )
    staged = output.with_suffix(output.suffix + ".part")
    staged.unlink(missing_ok=True)
    try:
        with urllib.request.urlopen(request, timeout=120) as response, staged.open("wb") as handle:
            shutil.copyfileobj(response, handle)
        staged.replace(output)
    except Exception:
        staged.unlink(missing_ok=True)
        raise
    if output.read_bytes()[:4] != b"%PDF" or output.stat().st_size < 10_000:
        output.unlink(missing_ok=True)
        raise RuntimeError("disclosure mirror returned a non-PDF response")


def archive_refused_pdf(candidate: dict, url: str, pdf: pathlib.Path | None,
                        number: int, error: Exception) -> dict | None:
    """Keep retrieved evidence that failed verification for manual review."""
    if pdf is None or not pdf.is_file():
        return None
    try:
        content = pdf.read_bytes()
    except OSError:
        return None
    if content[:4] != b"%PDF" or len(content) < 10_000:
        return None
    sha256 = hashlib.sha256(content).hexdigest()
    ticker = re.sub(r"[^A-Z0-9_-]", "", str(candidate["ticker"]).upper())
    name = f"{ticker}-egx-{candidate['code']}-{number}-{sha256[:12]}.pdf"
    kept = PDF_REVIEW / name
    kept.parent.mkdir(parents=True, exist_ok=True)
    if not kept.exists():
        shutil.copy2(pdf, kept)
    try:
        local_path = str(kept.relative_to(REPO))
    except ValueError:
        local_path = str(kept)
    return {
        "attachment_url": url,
        "local_path": local_path,
        "pdf_sha256": sha256,
        "bytes": len(content),
        "reason": str(error)[:500],
    }


def download_official_batch(jobs: list[dict], manifest: pathlib.Path) -> dict[str, dict]:
    """Fetch official PDFs through one short-lived F5 session per small batch."""
    if not jobs:
        return {}
    python = scrapling_python.find()
    if python is None or not python.exists():
        raise RuntimeError(scrapling_python.missing_note())
    manifest.write_text(json.dumps(jobs), encoding="utf-8")
    try:
        result = subprocess.run(
            [str(python), str(F5_DOWNLOADER), str(manifest)],
            capture_output=True, text=True, timeout=max(120, len(jobs) * 30),
        )
    except subprocess.TimeoutExpired:
        return {
            job["url"]: {
                "url": job["url"], "output": job["output"], "ok": False,
                "error": "F5 batch timed out before cookies could be reused",
            }
            for job in jobs
        }
    try:
        rows = json.loads((result.stdout or "").strip())
    except json.JSONDecodeError as error:
        note = (result.stderr or result.stdout or "F5 PDF downloader failed").strip()
        raise RuntimeError(note[-500:]) from error
    by_url = {row["url"]: row for row in rows}
    return by_url


def _answer(parts: list[dict], *, timeout: int = 180) -> dict:
    body = json.dumps({
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 3000,
            **gemini.THINKING_OFF,
        },
    }).encode()
    payload = gemini._post(gemini.MODEL, body, timeout=timeout)
    candidates_ = payload.get("candidates") or []
    if not candidates_:
        raise RuntimeError("Vertex returned no candidate")
    text = "".join(
        part.get("text", "")
        for part in candidates_[0].get("content", {}).get("parts", [])
    )
    return V.parse_json_answer(text)


def discover(pdf: pathlib.Path, period_end: str) -> dict:
    return _answer([
        {"inlineData": {
            "mimeType": "application/pdf",
            "data": base64.b64encode(pdf.read_bytes()).decode(),
        }},
        {"text": DISCOVERY_PROMPT.format(period_end=period_end)},
    ])


def _page_image_parts(pages: list[tuple[int, pathlib.Path]]) -> list[dict]:
    parts: list[dict] = []
    for page, image in sorted(pages):
        parts.append({"text": f"The next image is PDF page {page}."})
        parts.append({"inlineData": {
            "mimeType": "image/png",
            "data": base64.b64encode(image.read_bytes()).decode(),
        }})
    return parts


def discover_images(pages: list[tuple[int, pathlib.Path]], period_end: str) -> dict:
    """Read browser-rendered pages when the protected PDF bytes are unavailable."""
    return _answer([
        *_page_image_parts(pages),
        {"text": DISCOVERY_PROMPT.format(period_end=period_end)},
    ])


def render_pages(pdf: pathlib.Path, pages: list[int], folder: pathlib.Path) -> list[tuple[int, pathlib.Path]]:
    rendered = []
    for page in sorted(set(pages)):
        target = folder / f"page-{page}"
        result = subprocess.run(
            ["pdftoppm", "-f", str(page), "-l", str(page), "-singlefile",
             "-r", "180", "-png", str(pdf), str(target)],
            capture_output=True, text=True,
        )
        image = target.with_suffix(".png")
        if result.returncode != 0 or not image.exists():
            raise RuntimeError(f"could not render PDF page {page}")
        rendered.append((page, image))
    return rendered


def audit(pdf: pathlib.Path, reading: dict, period_end: str,
          folder: pathlib.Path) -> dict:
    normalized = V.normalize_reading(reading)
    pages = sorted({field["page"] for field in normalized["fields"].values()})
    if not pages:
        raise RuntimeError("whole-PDF read named no evidence pages")
    if len(pages) > 8:
        raise RuntimeError("whole-PDF read named too many evidence pages")
    image_parts = _page_image_parts(render_pages(pdf, pages, folder))
    return _audit_parts(image_parts, normalized, period_end)


def _audit_parts(image_parts: list[dict], first: dict, period_end: str) -> dict:
    """Make a second model call that is never shown the first call's values."""
    normalized = V.normalize_reading(first)
    audited = _answer([
        *image_parts,
        {"text": AUDIT_PROMPT.format(period_end=period_end)},
    ])

    # A dense statement page makes omissions more likely than wrong numbers.
    # One targeted retry may recover a field the whole-PDF read saw and the
    # page audit overlooked. It is told the field NAME, never the first value,
    # so it remains an independent read rather than a rubber stamp.
    first_fields = normalized["fields"]
    audited_fields = V.normalize_reading(audited)["fields"]
    missing = sorted(set(first_fields) - set(audited_fields))
    if missing:
        target_prompt = AUDIT_PROMPT.format(period_end=period_end) + (
            "\nRe-check especially whether these lines are visibly printed: "
            + ", ".join(missing)
            + ". Do not include one unless you can read its value directly."
        )
        retry = _answer([*image_parts, {"text": target_prompt}])
        retry_fields = V.normalize_reading(retry)["fields"]
        raw = audited.setdefault("fields", {})
        for name in missing:
            if name in retry_fields:
                # Use the validated/normalized shape, not arbitrary extra keys
                # the retry may have emitted around it.
                raw[name] = retry_fields[name]
    return audited


def audit_images(pages: list[tuple[int, pathlib.Path]], reading: dict,
                 period_end: str) -> dict:
    normalized = V.normalize_reading(reading)
    evidence_pages = sorted({field["page"] for field in normalized["fields"].values()})
    if not evidence_pages:
        raise RuntimeError("page-image read named no evidence pages")
    if len(evidence_pages) > 8:
        raise RuntimeError("page-image read named too many evidence pages")
    by_number = {page: image for page, image in pages}
    missing = [page for page in evidence_pages if page not in by_number]
    if missing:
        raise RuntimeError(f"missing browser-rendered evidence page(s): {missing}")
    selected = [(page, by_number[page]) for page in evidence_pages]
    return _audit_parts(_page_image_parts(selected), normalized, period_end)


def extract(candidate: dict, pdf: pathlib.Path, folder: pathlib.Path) -> dict:
    first = discover(pdf, candidate["period_end"])
    second = audit(pdf, first, candidate["period_end"], folder)
    verified = V.verify_readings(
        first, second,
        known_net_m=candidate["known_net_m"],
        expected_period_end=candidate["period_end"],
    )
    return {
        "ticker": candidate["ticker"],
        "period": candidate["period"],
        "period_end": candidate["period_end"],
        "months": candidate.get("months"),
        "basis": candidate.get("basis"),
        "filed_on": candidate.get("filed_on"),
        "source": candidate["source"],
        "fields": verified["fields"],
        "evidence": verified["evidence"],
        "checks": verified["checks"],
        "model": gemini.MODEL,
        "pdf_sha256": hashlib.sha256(pdf.read_bytes()).hexdigest(),
        "verified_on": datetime.date.today().isoformat(),
    }


def extract_images(candidate: dict, pages: list[tuple[int, pathlib.Path]]) -> dict:
    first = discover_images(pages, candidate["period_end"])
    second = audit_images(pages, first, candidate["period_end"])
    verified = V.verify_readings(
        first, second,
        known_net_m=candidate["known_net_m"],
        expected_period_end=candidate["period_end"],
    )
    digest = hashlib.sha256()
    for page, image in sorted(pages):
        digest.update(f"page:{page}\n".encode())
        digest.update(image.read_bytes())
    return {
        "ticker": candidate["ticker"],
        "period": candidate["period"],
        "period_end": candidate["period_end"],
        "months": candidate.get("months"),
        "basis": candidate.get("basis"),
        "filed_on": candidate.get("filed_on"),
        "source": candidate["source"],
        "fields": verified["fields"],
        "evidence": verified["evidence"],
        "checks": verified["checks"],
        "model": gemini.MODEL,
        "page_images_sha256": digest.hexdigest(),
        "verified_on": datetime.date.today().isoformat(),
    }


def parse_page_images(values: list[str]) -> list[tuple[int, pathlib.Path]]:
    pages: list[tuple[int, pathlib.Path]] = []
    seen: set[int] = set()
    for value in values:
        number, separator, filename = value.partition("=")
        if not separator or not number.isdigit() or int(number) < 1:
            raise ValueError(f"invalid page image {value!r}; expected PAGE=/path/image.png")
        page = int(number)
        path = pathlib.Path(filename).expanduser().resolve()
        if page in seen:
            raise ValueError(f"duplicate page image number: {page}")
        if not path.is_file():
            raise ValueError(f"page image not found: {path}")
        if path.suffix.lower() != ".png":
            raise ValueError(f"page image must be PNG: {path}")
        seen.add(page)
        pages.append((page, path))
    return sorted(pages)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=1,
                        help="PDFs to process; one is the safe default")
    parser.add_argument("--since", type=int, default=2025)
    parser.add_argument("--only", help="one ticker")
    parser.add_argument("--period", help="exact displayed period label")
    parser.add_argument("--pdf", type=pathlib.Path,
                        help="use an already-downloaded PDF for the one target")
    parser.add_argument(
        "--page-image", action="append", default=[], metavar="PAGE=PNG",
        help="browser-rendered PDF page; repeat for one target when PDF bytes are blocked",
    )
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--retry-failures", action="store_true",
                        help="revisit prior refusals without rereading verified filings")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--keep-pdfs", action="store_true")
    parser.add_argument("--vertex-project", default=ESTHMR_VERTEX_PROJECT,
                        help="funded Google Cloud project for Vertex")
    args = parser.parse_args()

    os.environ["GOOGLE_CLOUD_PROJECT"] = args.vertex_project

    store = _store()
    todo = candidates(
        store, since=args.since, only=args.only, period=args.period,
        refresh=args.refresh, retry_failures=args.retry_failures,
    )[:max(0, args.limit)]
    if not todo:
        print(f"── EGX PDF statements: nothing to do ({len(store['filings'])} verified)")
        return 0
    try:
        page_images = parse_page_images(args.page_image)
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 2
    if args.pdf and page_images:
        print("use either --pdf or --page-image, not both", file=sys.stderr)
        return 2
    if (args.pdf or page_images) and len(todo) != 1:
        print("local evidence needs exactly one candidate; use --only and --period", file=sys.stderr)
        return 2
    if args.pdf and not args.pdf.exists():
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        return 2

    print(f"── EGX PDF statements: {len(todo)} filing(s)")
    failures = 0
    # Keep temporary disk use bounded: prefetch six filings, verify and discard
    # them, then obtain a fresh TSPD cookie for the next small group.
    group_size = 6
    for group_offset in range(0, len(todo), group_size):
        group = todo[group_offset:group_offset + group_size]
        with tempfile.TemporaryDirectory(prefix="esthmr-pdf-batch-") as batch_temp:
            batch_folder = pathlib.Path(batch_temp)
            retrievals: dict[str, list[tuple[str, str, pathlib.Path | None]]] = {}
            official_jobs: list[dict] = []

            if not args.pdf and not page_images:
                # Mirror pages are cheap to check and their same-origin files
                # avoid the F5 warm-up entirely. Resolve them concurrently for
                # every candidate, then fall back to the filed official URL.
                mirror_by_code: dict[str, list[str]] = {}
                with concurrent.futures.ThreadPoolExecutor(
                    max_workers=max(1, len(group))
                ) as pool:
                    futures = {
                        pool.submit(
                            resolve_mirror_attachments,
                            candidate["code"], candidate["ticker"],
                        ): candidate
                        for candidate in group
                    }
                    for future, candidate in futures.items():
                        mirror_by_code[candidate["code"]] = future.result()

                for candidate in group:
                    code = candidate["code"]
                    mirrors = mirror_by_code.get(code) or []
                    if mirrors:
                        retrievals[code] = [("mirror", url, None) for url in mirrors]
                        continue

                    # The app's filing archive already contains most official
                    # attachment URLs. Reuse them rather than rediscovering
                    # information already harvested from the exchange.
                    settled, official = resolve_local_filing(code, candidate["ticker"])
                    if official:
                        retrievals[code] = []
                        for number, url in enumerate(official):
                            output = batch_folder / f"egx-{code}-{number}.pdf"
                            retrievals[code].append(("official", url, output))
                            official_jobs.append({"url": url, "output": str(output)})
                        continue
                    if settled:
                        retrievals[code] = []
                        continue

                    official = resolve_official_attachments(code)
                    retrievals[code] = []
                    for number, url in enumerate(official):
                        output = batch_folder / f"egx-{code}-{number}.pdf"
                        retrievals[code].append(("official", url, output))
                        official_jobs.append({"url": url, "output": str(output)})

            official_results: dict[str, dict] = {}
            if official_jobs:
                print(f"   F5 warm-up → {len(official_jobs)} official PDF(s)")
                official_results = download_official_batch(
                    official_jobs, batch_folder / "manifest.json"
                )

            for local_index, candidate in enumerate(group):
                index = group_offset + local_index
                code = candidate["code"]
                print(f"   {candidate['ticker']} {candidate['period']} (egx-{code})")
                with tempfile.TemporaryDirectory(prefix="esthmr-pdf-") as temp:
                    folder = pathlib.Path(temp)
                    attachment = None
                    used_pdf = args.pdf
                    review_pdfs: list[dict] = []
                    try:
                        if page_images:
                            urls = resolve_local_attachments(code, candidate["ticker"])
                            if not urls:
                                urls = resolve_mirror_attachments(code, candidate["ticker"])
                            if not urls:
                                urls = resolve_official_attachments(code)
                            attachment = urls[0] if urls else "browser-rendered-pages"
                            record = extract_images(candidate, page_images)
                        elif not args.pdf:
                            sources = retrievals.get(code) or []
                            if not sources:
                                raise RuntimeError(
                                    "no PDF attachment in the filing archive, mirror, or beta metadata"
                                )
                            last_error = None
                            record = None
                            for number, (kind, url, cached) in enumerate(sources):
                                try:
                                    if kind == "mirror":
                                        used_pdf = folder / f"egx-{code}-{number}.pdf"
                                        download_mirror_pdf(url, used_pdf)
                                    else:
                                        result = official_results.get(url) or {}
                                        if not result.get("ok") or cached is None or not cached.exists():
                                            raise RuntimeError(
                                                result.get("error") or "official PDF failed"
                                            )
                                        used_pdf = cached
                                    attachment = url
                                    record = extract(candidate, used_pdf, folder)
                                    break
                                except Exception as error:  # try another filed attachment
                                    last_error = error
                                    review = archive_refused_pdf(
                                        candidate, url, used_pdf, number, error,
                                    )
                                    if review and review not in review_pdfs:
                                        review_pdfs.append(review)
                            if record is None:
                                raise RuntimeError(f"no attachment verified: {last_error}")
                        else:
                            # The bytes may already be cached locally, but provenance
                            # must still point at a public filing attachment.
                            urls = resolve_local_attachments(code, candidate["ticker"])
                            if not urls:
                                urls = resolve_mirror_attachments(code, candidate["ticker"])
                            if not urls:
                                urls = resolve_official_attachments(code)
                            attachment = urls[0] if urls else "local-proof:" + args.pdf.name
                            record = extract(candidate, args.pdf, folder)

                        record["attachment_url"] = attachment
                        if review_pdfs:
                            record["refused_attachment_reviews"] = review_pdfs
                        store["filings"][code] = record
                        store["failures"].pop(code, None)
                        print("     verified " + ", ".join(sorted(record["fields"])))
                        if args.keep_pdfs and not args.pdf and not page_images and used_pdf is not None:
                            kept = REPO / "data-source" / "egx-beta" / "pdf-cache" / f"egx-{code}.pdf"
                            kept.parent.mkdir(parents=True, exist_ok=True)
                            shutil.copy2(used_pdf, kept)
                            print(f"     kept {kept.relative_to(REPO)}")
                    except Exception as error:
                        failures += 1
                        reason = str(error)[:500]
                        store["failures"][code] = {
                            "ticker": candidate["ticker"],
                            "period": candidate["period"],
                            "attempted_on": datetime.date.today().isoformat(),
                            "reason": reason,
                        }
                        if review_pdfs:
                            store["failures"][code]["review_pdfs"] = review_pdfs
                            print(
                                f"     kept {len(review_pdfs)} refused PDF(s) for review"
                            )
                        print(f"     refused: {reason}")

                if not args.dry_run:
                    _write_store(store)
                if index + 1 < len(todo) and not args.pdf and not page_images:
                    time.sleep(2)

    print(f"\n   {len(store['filings'])} verified filings in {STORE.name}; "
          f"{failures} refused this run")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
