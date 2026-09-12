#!/usr/bin/env python3
"""What the pound does to a company, out of the note where it is written down.

The world monitor can say the dollar moved and say how unusual that move was.
What it could not say is who on this exchange it reaches — and guessing from
the industry is worthless, because an exporter with dollar borrowings and an
exporter that invoices in pounds look identical from the outside.

The filings answer it. Every Egyptian statement carries a foreign-currency
note, and two things in it are figures rather than prose:

  THE POSITION   a table of monetary assets and liabilities held in currencies
                 other than the pound, usually as a surplus / deficit per
                 currency (فائض / عجز). A company with a net surplus in dollars
                 holds more dollars than it owes; one with a deficit owes more.

  THE RESULT     the foreign-exchange gain or loss already recognised in the
                 period. Placed against the same filing's net income it says
                 how much of the profit was currency rather than trade.

WHAT IS REFUSED, AND WHY THE REFUSAL IS THE POINT
-------------------------------------------------
Every single statement also carries the translation POLICY: "monetary assets
and liabilities in foreign currency are translated at the rate ruling at the
balance-sheet date". It is boilerplate, it is in all of them, and a reader that
counted it would report that all 193 companies are currency-exposed, which is
both true and useless. So a policy paragraph is never an exposure here. No
figure, no entry.

HOW A FIGURE EARNS ITS PLACE
----------------------------
Two readings of the same filing must agree, and they are taken through
different eyes on purpose: the first reads the whole PDF and names the pages,
the second is shown only those pages rendered as images and is never told what
the first found. A number both produce independently is a number that is
printed. A number only one produces is dropped.

Where the PDF carries a real Arabic text layer there is a third, harder check:
the figure must appear as a printed number in that text. That is the
build_exposures guard — quote what is there or be dropped — finally pointed at
a source that can carry the claim. The company "descriptions" it was written
against turned out to be incorporation dates and shareholder lists; a
foreign-currency note is the document the question was always about.

Nothing here says what a move in any currency means for a share price.
"""

from __future__ import annotations

import argparse
import base64
import datetime
import functools
import hashlib
import json
import math
import pathlib
import re
import subprocess
import sys
import tempfile
import unicodedata

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import gemini  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
DATA = REPO / "public" / "data" / "v1"
DIRECTORY = DATA / "companies.json"
STATEMENTS = pathlib.Path(__file__).resolve().parent / "pdf_statements_filed.json"
STORE = pathlib.Path(__file__).resolve().parent / "currency_notes_read.json"
# Beside the store rather than in public/data/v1, and for a specific reason:
# the world monitor is its only reader, and it copies the whole company list
# into its own channel. A second copy under the published directory would be a
# hundred kilobytes nobody fetches, swept into the Flutter app's fixtures, and
# carrying no manifest counter of its own — which is the orphan-document story
# build_all tells about macro.json. Derived on every build from the store,
# which IS committed.
OUT = pathlib.Path(__file__).resolve().parent / "currency_notes.json"
CACHE = REPO / "data-source" / "egx-beta" / "pdf-cache"
NOTES_CACHE = CACHE / "notes"
REVIEW = CACHE / "review"

# This repository's funded Vertex project, for the same reason
# build_pdf_statements.py pins it: the Mac's ADC quota project is moved by
# unrelated projects and silently bills a project with billing disabled.
VERTEX_PROJECT = "project-8bba98ed-6d90-45af-ab8"

# Closed, like the factor vocabulary in build_exposures.py. An open one would
# give the same currency three spellings and nothing would join.
CURRENCIES = {
    "USD", "EUR", "GBP", "SAR", "AED", "KWD", "QAR", "OMR", "BHD", "JOD",
    "JPY", "CNY", "CHF", "ZAR", "TRY", "SDG", "LYD", "CAD", "AUD", "SEK",
    "DKK", "NOK", "RUB", "INR", "MAD", "TND", "OTHER",
}

# Reported as printed, then brought to the millions of pounds everything else
# on this site is stated in.
SCALE = {"units": 1e-6, "thousands": 1e-3, "millions": 1.0}

SCHEMA = """{"position": {"page": <pdf page number>,
              "asOf": "<YYYY-MM-DD of the column you read>",
              "unit": "units|thousands|millions",
              "denominatedIn": "EGP|foreign",
              "currencies": [{"code": "<ISO code: USD, EUR, GBP, SAR, ...>",
                              "printed": "<the currency exactly as printed>",
                              "assets": <number as printed, or null>,
                              "liabilities": <number as printed, or null>,
                              "net": <surplus positive, deficit negative, or null>}]},
 "fxResult": {"page": <pdf page number>, "unit": "units|thousands|millions",
              "amount": <number as printed; a loss is negative>,
              "printed": "<the line as printed>"}}"""

DISCOVERY_PROMPT = """You are reading one filed Egyptian financial statement, in Arabic.

Find the note stating the company's FOREIGN CURRENCY POSITION: the table of
monetary assets and liabilities held in currencies other than the Egyptian
pound. It is usually a surplus / deficit column (فائض / عجز) against a list of
currencies (دولار أمريكي، يورو، جنيه إسترليني، ريال سعودي).

Find also the foreign exchange gain or loss recognised in the period
(أرباح / خسائر فروق عملة، فروق تقييم عملات أجنبية) as a single amount.

DO NOT report the accounting policy paragraph that explains how foreign
currency transactions are translated. Every statement carries it, it states no
amount, and it is not what is being asked for. You are looking only for
FIGURES that are printed in the document.

Return ONLY this JSON object, no prose and no code fence:

%s

Use null for "position" if no such table of figures is printed, and null for
"fxResult" if no such amount is printed. Report every number exactly as it is
printed, without rescaling it, and set "unit" from the column heading. Set
"denominatedIn" to "foreign" when the table is in the foreign currency itself
and "EGP" when it is the Egyptian pound equivalent. Never report a figure you
did not read.""" % SCHEMA

AUDIT_PROMPT = """These images are pages from one filed Egyptian financial statement,
in Arabic. Read the foreign-currency figures printed on them.

Report the foreign currency position table (monetary assets and liabilities by
currency, or the surplus / deficit per currency) and the foreign exchange gain
or loss recognised in the period, if each is printed on these pages.

Ignore any paragraph that only explains how foreign currency is translated. It
states no amount.

Return ONLY this JSON object, no prose and no code fence:

%s

Report every number exactly as printed, without rescaling it. Use null for
anything that is not printed on these pages.""" % SCHEMA

BIDI = dict.fromkeys(map(ord, "​‌‍‎‏‪‫"
                              "‬‭‮⁦⁧⁨⁩ـ"))
ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")


def flatten(text: str) -> str:
    """Presentation forms back to letters, Arabic-Indic digits back to digits.

    pdftotext hands these PDFs their glyphs, not their characters: the word
    الأجنبية comes out as a run of U+FB50-block presentation forms wrapped in
    bidi controls, so searching for the word finds nothing at all. NFKC is what
    turns the glyphs back into the letters, and it is the same normalisation
    build_exposures.py uses for the same reason.
    """
    text = unicodedata.normalize("NFKC", text or "").translate(BIDI)
    return text.translate(ARABIC_DIGITS)


def _shapes(cleaned: str) -> set[str]:
    cleaned = cleaned.strip(".,")
    if not cleaned:
        return set()
    found = {cleaned}
    if "." in cleaned:
        found.add(cleaned.split(".")[0])
        # 71.711.402 is seventy-one million in a filing that groups with
        # periods, and 9.034 is nine-point-nought-three-four in one that does
        # not. Both readings are offered; the figure has to match one of them.
        found.add(cleaned.replace(".", ""))
    else:
        found.add(f"{cleaned}.0")
    return found


def number_tokens(text: str) -> set[str]:
    """Every number printed in the source, canonicalised — both ways it reads.

    Kept as whole tokens rather than a stripped digit soup: with the separators
    taken out of the whole document, 785782 would be "found" inside 1785782 and
    the check would wave through a figure that is not there.

    The hard part is that a space means two opposite things in these documents.
    LCSW prints four million as `4 248 345`, and ASCM's note prints two
    different table cells as `349,543,948   186,321,432` — read the space as a
    separator there and the check invents an eighteen-digit number that is in
    no filing, which is exactly what happened: every figure ASCM and ADIB filed
    was dropped as "not printed" while both readers had read it correctly.

    So the text is cut at every newline and every column gap first, and inside
    what is left BOTH readings are offered: the fragment with its single spaces
    closed up, and each comma- or period-grouped run on its own.
    """
    tokens: set[str] = set()
    for fragment in re.split(r"\n|\s{2,}", text):
        for run in re.findall(r"\d[\d ,٫٬.]*\d|\d", fragment):
            tokens |= _shapes(re.sub(r"[ ,٬]", "", run).replace("٫", "."))
            for piece in re.findall(r"\d[\d,٬.]*\d|\d", run):
                tokens |= _shapes(re.sub(r"[,٬]", "", piece))
    return tokens


def printed(value, tokens: set[str]) -> bool:
    """True when a figure really is printed in the document's own text.

    The sign is not looked for: a deficit is printed as (232 981) and the minus
    in front of it is ours. The full decimal expansion is, because "%g" stops
    at six significant figures and turned 71.711402 into 71.7114 — a number
    printed in no filing, so a true figure read off a filing that states
    piastres was reported as absent from it.
    """
    if not isinstance(value, (int, float)) or not tokens:
        return False
    size = abs(float(value))
    forms = {f"{size:.0f}", f"{size:.10f}".rstrip("0").rstrip(".") or "0"}
    if size.is_integer():
        forms.add(f"{size:.0f}.0")
    return bool(forms & tokens)


# A page that prints fewer numbers than this is prose with a heading on it,
# not a table. ADIB's currency note is a page of Arabic text with the table
# pasted into it as a picture: it extracts 1,928 characters and twenty numbers,
# every one of them a note number or a year. Checking a filed figure against
# that page is checking it against nothing, and it dropped all five currencies
# the bank had disclosed and both readers had agreed on.
NUMERIC_PAGE = 25


def page_text(pdf: pathlib.Path, pages: list[int]) -> str:
    """The text of the pages a figure was read from — not of the whole file.

    ADCI's filing has a text layer on exactly one of its thirty-five pages, and
    it is not the page the currency figure is on. A document-wide text layer is
    not evidence about a page it does not cover.

    -layout because without it a table's columns are joined by the same space
    that groups the digits inside one number, and the two cannot be told apart.
    """
    found = []
    for page in sorted(set(pages)):
        try:
            done = subprocess.run(
                ["pdftotext", "-enc", "UTF-8", "-layout",
                 "-f", str(page), "-l", str(page), str(pdf), "-"],
                capture_output=True, timeout=120)
        except (subprocess.SubprocessError, OSError):
            continue
        found.append(flatten(done.stdout.decode("utf-8", "replace")))
    return "\n".join(found)


def checkable(text: str) -> set[str]:
    """The numbers to check against, or nothing when the page prints none."""
    tokens = number_tokens(text)
    return tokens if len(tokens) >= NUMERIC_PAGE else set()


def in_millions(value, unit: str):
    scale = SCALE.get(unit)
    if not isinstance(value, (int, float)) or scale is None:
        return None
    return round(float(value) * scale, 6)


def _json_from(text: str) -> dict | None:
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n", "", raw)
        raw = re.sub(r"\n```\s*$", "", raw)
    start, end = raw.find("{"), raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        return json.loads(raw[start:end + 1])
    except json.JSONDecodeError:
        return None


def _ask(parts: list[dict], *, timeout: int = 300) -> dict | None:
    body = json.dumps({
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 6000,
                             **gemini.THINKING_OFF},
    }).encode()
    payload = gemini._post(gemini.MODEL, body, timeout=timeout)
    candidates = payload.get("candidates") or []
    if not candidates:
        return None
    text = "".join(part.get("text", "")
                   for part in candidates[0].get("content", {}).get("parts", []))
    return _json_from(text)


def discover(pdf: pathlib.Path) -> dict | None:
    return _ask([
        {"inlineData": {"mimeType": "application/pdf",
                        "data": base64.b64encode(pdf.read_bytes()).decode()}},
        {"text": DISCOVERY_PROMPT},
    ])


def render(pdf: pathlib.Path, pages: list[int], folder: pathlib.Path) -> list[tuple[int, pathlib.Path]]:
    out = []
    for page in sorted(set(pages)):
        target = folder / f"page-{page}"
        done = subprocess.run(
            ["pdftoppm", "-f", str(page), "-l", str(page), "-singlefile",
             "-r", "180", "-png", str(pdf), str(target)],
            capture_output=True, text=True, timeout=180)
        image = target.with_suffix(".png")
        if done.returncode == 0 and image.exists():
            out.append((page, image))
    return out


def audit(pages: list[tuple[int, pathlib.Path]]) -> dict | None:
    """The second pair of eyes — the pages only, never the first read's answer.

    Handing the audit the numbers to confirm is how a two-read check becomes
    one read with a witness. It is told which pages to look at, because the
    first read is what found them, and nothing else.
    """
    parts: list[dict] = []
    for page, image in sorted(pages):
        parts.append({"text": f"The next image is PDF page {page}."})
        parts.append({"inlineData": {"mimeType": "image/png",
                                     "data": base64.b64encode(image.read_bytes()).decode()}})
    parts.append({"text": AUDIT_PROMPT})
    return _ask(parts)


def _net(row: dict):
    """The net position, taken as printed or as the two sides it was printed as."""
    net = row.get("net")
    if isinstance(net, (int, float)):
        return float(net)
    assets, debts = row.get("assets"), row.get("liabilities")
    if isinstance(assets, (int, float)) and isinstance(debts, (int, float)):
        return float(assets) - float(debts)
    return None


def _positions(reading) -> dict[str, float]:
    """Currency code -> net position in millions, from one reading."""
    block = (reading or {}).get("position")
    if not isinstance(block, dict):
        return {}
    unit = block.get("unit")
    found = {}
    for row in block.get("currencies") or []:
        if not isinstance(row, dict):
            continue
        code = str(row.get("code") or "").strip().upper()
        if code not in CURRENCIES:
            continue
        value = in_millions(_net(row), unit)
        if value is not None:
            found[code] = value
    return found


def _denomination(reading) -> str | None:
    block = (reading or {}).get("position")
    if not isinstance(block, dict):
        return None
    value = str(block.get("denominatedIn") or "").strip().lower()
    return value if value in {"egp", "foreign"} else None


def _result(reading):
    block = (reading or {}).get("fxResult")
    if not isinstance(block, dict):
        return None
    return in_millions(block.get("amount"), block.get("unit"))


def _same(a, b) -> bool:
    """Two readings of one printed number, at the precision it was PRINTED to.

    Not at the precision it is published to. Rounding to the three decimal
    places of a million these figures are published in compares them to the
    nearest thousand pounds, so a reader that misread 785 782 as 785 872 would
    be agreed with. The published figure is rounded; the check is not.
    """
    if a is None or b is None:
        return False
    return math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-12)


def agree(first: dict, second: dict, tokens: set[str]) -> tuple[dict, list[dict]]:
    """What both reads saw, and what fell out on the way."""
    kept: dict = {"position": {}, "fxResult": None}
    dropped: list[dict] = []

    # A position table can be printed in the foreign currency itself or in its
    # pound equivalent, and the two differ by roughly fifty times. Taking the
    # first read's word for which would publish a dollar figure labelled as
    # pounds, so the denomination is agreed like every other part of the
    # reading — and when it is not agreed, there is no position to publish.
    one_in, two_in = _denomination(first), _denomination(second)
    if one_in != two_in:
        dropped.append({"what": "position", "why": "the two reads disagree about "
                        f"what the table is denominated in: {one_in} against {two_in}"})
        one, two = {}, {}
    else:
        one, two = _positions(first), _positions(second)
    for code in sorted(set(one) | set(two)):
        if code not in one or code not in two:
            dropped.append({"what": f"position {code}",
                            "why": "only one of the two reads saw it"})
            continue
        if not _same(one[code], two[code]):
            dropped.append({"what": f"position {code}", "why": "the two reads "
                            f"disagree: {one[code]} against {two[code]}"})
            continue
        raw = _raw_position(first, code)
        if tokens and not printed(raw, tokens):
            dropped.append({"what": f"position {code}",
                            "why": "the figure is not printed in the document's text"})
            continue
        kept["position"][code] = one[code]

    one_result, two_result = _result(first), _result(second)
    if one_result is None or two_result is None:
        if one_result is not None or two_result is not None:
            dropped.append({"what": "fxResult",
                            "why": "only one of the two reads saw it"})
    elif not _same(one_result, two_result):
        dropped.append({"what": "fxResult", "why": "the two reads disagree: "
                        f"{one_result} against {two_result}"})
    elif tokens and not printed((first.get("fxResult") or {}).get("amount"), tokens):
        dropped.append({"what": "fxResult",
                        "why": "the figure is not printed in the document's text"})
    else:
        kept["fxResult"] = one_result
    return kept, dropped


def _raw_position(reading: dict, code: str):
    block = (reading or {}).get("position") or {}
    for row in block.get("currencies") or []:
        if isinstance(row, dict) and str(row.get("code") or "").upper() == code:
            return _net(row)
    return None


def held(path: pathlib.Path | None = None) -> dict:
    path = path or STORE
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"schemaVersion": 1, "readings": {}}


def save(store: dict, path: pathlib.Path | None = None) -> None:
    """Written after every document, because a killed run keeps its readings.

    And written to the shard's OWN file when it has one: a store that is read
    once at the start and written once at the end loses a whole worker's work
    the moment two of them share it.
    """
    (path or STORE).write_text(json.dumps(store, ensure_ascii=False, indent=1) + "\n",
                               encoding="utf-8")


def merge(paths: list[pathlib.Path]) -> dict:
    store = held()
    for path in paths:
        for filing, reading in (held(path).get("readings") or {}).items():
            store["readings"].setdefault(filing, reading)
    save(store)
    return store


@functools.cache
def _cached_documents() -> dict[str, pathlib.Path]:
    """Everything already on disk, indexed by what it IS rather than its name."""
    index: dict[str, pathlib.Path] = {}
    for folder, pattern in ((CACHE, "egx-*.pdf"), (NOTES_CACHE, "*.pdf"),
                            (REVIEW, "*.pdf")):
        for path in sorted(folder.glob(pattern)):
            try:
                index.setdefault(hashlib.sha256(path.read_bytes()).hexdigest(), path)
            except OSError:
                continue
    return index


def local_pdf(row: dict) -> pathlib.Path | None:
    """The document the STATEMENT was read from, identified by its content.

    One filing id names several attachments, and they are different documents:
    LCSW's filing carries five, and the consolidated one puts the company's net
    dollar position at 785,782 where the standalone one puts it at 376,446.
    Picking by filename took the wrong document for 24 of the 65 filings that
    had one on disk — and the currency figure would then have been divided by
    a net income out of a different set of accounts.

    So the only local file accepted is one whose sha256 is the sha256 the
    statements store recorded when it read that filing. Anything else is
    downloaded from the attachment the store names.
    """
    want = row.get("pdf_sha256")
    return _cached_documents().get(want) if want else None


def fetch_pdf(url: str, filing: str, ticker: str) -> pathlib.Path | None:
    import build_pdf_statements as statements
    NOTES_CACHE.mkdir(parents=True, exist_ok=True)
    target = NOTES_CACHE / f"{ticker}-egx-{filing}.pdf"
    try:
        statements.download_mirror_pdf(url, target)
    except Exception:
        if target.exists():
            target.unlink()
        return None
    return target if target.is_file() else None


def read_filing(pdf: pathlib.Path) -> tuple[dict | None, list[dict]]:
    first = discover(pdf)
    if not isinstance(first, dict):
        return None, []
    pages = []
    for block in ("position", "fxResult"):
        page = (first.get(block) or {}).get("page") if isinstance(first.get(block), dict) else None
        if isinstance(page, int) and page > 0:
            pages.append(page)
    if not pages:
        # Nothing was found to check. That is an answer — most statements
        # print the policy and no position table at all.
        return {"position": {}, "fxResult": None, "pages": []}, []
    with tempfile.TemporaryDirectory() as folder:
        images = render(pdf, pages, pathlib.Path(folder))
        if not images:
            return None, []
        second = audit(images)
    if not isinstance(second, dict):
        return None, []
    kept, dropped = agree(first, second, checkable(page_text(pdf, pages)))
    kept["pages"] = sorted(set(pages))
    kept["asOf"] = (first.get("position") or {}).get("asOf") if isinstance(first.get("position"), dict) else None
    kept["denominatedIn"] = _denomination(first) if kept["position"] else None
    kept["printed"] = ((first.get("fxResult") or {}).get("printed")
                       if isinstance(first.get("fxResult"), dict) else None)
    return kept, dropped


def statements_index() -> dict:
    if not STATEMENTS.exists():
        return {}
    document = json.loads(STATEMENTS.read_text(encoding="utf-8"))
    return document.get("filings") or {}


def by_ticker(filings: dict) -> dict[str, list[dict]]:
    """Every read filing a company has, newest first."""
    grouped: dict[str, list[dict]] = {}
    for filing, row in filings.items():
        ticker = row.get("ticker")
        if not ticker:
            continue
        grouped.setdefault(ticker, []).append(dict(row, filingId=filing))
    for rows in grouped.values():
        rows.sort(key=lambda r: r.get("period_end") or "", reverse=True)
    return grouped


def has_a_figure(reading) -> bool:
    if not isinstance(reading, dict):
        return False
    return bool(reading.get("position")) or reading.get("fxResult") is not None


def outstanding(filings: dict, store: dict, wanted: set, again: set) -> list[tuple]:
    """One company at a time, newest filing first, and stop when one answers.

    A quarterly statement often prints the numbers and not the notes behind
    them — ABUK's H1 attachment is seventeen pages and carries no currency note
    at all — while the annual one that precedes it carries the full set. So a
    company whose newest filing says nothing is asked its previous one rather
    than written off, and publish() takes the newest reading that HAS a figure.

    Round-robin rather than company-by-company, so that a run cut short by
    --limit has given every company its best filing before it gives any company
    a second one.
    """
    grouped = by_ticker(filings)
    queue: list[tuple] = []
    depth = 0
    while True:
        added = False
        for ticker in sorted(grouped):
            if wanted and ticker not in wanted:
                continue
            rows = grouped[ticker]
            if depth >= len(rows):
                continue
            added = True
            if depth and any(has_a_figure(store["readings"].get(r["filingId"]))
                             for r in rows[:depth]):
                continue
            filing = rows[depth]["filingId"]
            if filing in store["readings"] and filing not in again:
                continue
            queue.append((ticker, filing, rows[depth]))
        if not added:
            return queue
        depth += 1


def publish(store: dict, filings: dict) -> dict:
    directory = json.loads(DIRECTORY.read_text(encoding="utf-8")).get("companies", [])
    names = {c["ticker"]: c.get("name_en") or c.get("name_ar") or c["ticker"]
             for c in directory if c.get("ticker")}
    sectors = {c["ticker"]: c.get("sector") for c in directory if c.get("ticker")}

    best: dict = {}
    for filing, reading in store["readings"].items():
        row = filings.get(filing) or {}
        ticker = row.get("ticker")
        if not ticker:
            continue
        if not reading.get("position") and reading.get("fxResult") is None:
            continue
        current = best.get(ticker)
        if current and (current[1].get("period_end") or "") >= (row.get("period_end") or ""):
            continue
        best[ticker] = (dict(reading, filingId=filing), row)

    companies = []
    for ticker in sorted(best):
        reading, row = best[ticker]
        fields = row.get("fields") or {}
        income = fields.get("net_income")
        result = reading.get("fxResult")
        # Derived from the figures as PUBLISHED, for the reason margins() gives:
        # a reader dividing the two numbers printed beside the share has to get
        # the share back.
        shown_result = round(result, 3) if isinstance(result, (int, float)) else None
        shown_income = round(income, 3) if isinstance(income, (int, float)) else None
        share = None
        if shown_result is not None and shown_income is not None and shown_income > 0:
            share = round(shown_result / shown_income * 100, 1)
        # Not a contradiction, but the one case where reading the currency line
        # as a footnote to the result would be wrong: the period's profit is
        # smaller than the currency movement inside it.
        dominant = bool(share is not None and abs(share) > 100) or None
        position = [{"currency": code, "net": round(value, 3)}
                    for code, value in sorted((reading.get("position") or {}).items())]
        companies.append({
            "ticker": ticker,
            "name": names.get(ticker),
            "sector": sectors.get(ticker),
            "fxResult": shown_result,
            "netIncome": shown_income,
            "shareOfNetIncome": share,
            "largerThanTheProfit": dominant,
            "position": position,
            "denominatedIn": reading.get("denominatedIn"),
            "positionAsOf": reading.get("asOf"),
            "printed": reading.get("printed"),
            "period": row.get("period"),
            "periodEnd": row.get("period_end"),
            "filingId": reading.get("filingId"),
            "source": row.get("attachment_url") or row.get("source"),
        })

    document = {
        "schemaVersion": 1,
        "generated": datetime.datetime.now(datetime.timezone.utc)
            .isoformat(timespec="seconds").replace("+00:00", "Z"),
        "basis": "Read from the foreign-currency note of the company's own filed "
                 "statement, and kept only where two independent reads of that "
                 "filing produced the same figure — and, where the document "
                 "carries its own text, only where the figure is printed in it. "
                 "The translation policy every statement carries is not an "
                 "exposure and is never counted. Nothing here says what a move "
                 "in any currency means for a share price.",
        "basisAr": "مقروء من إيضاح العملات الأجنبية في القوائم المالية المودعة "
                   "للشركة، ولا يُحتفظ بالرقم إلا إذا اتفقت عليه قراءتان مستقلتان "
                   "للإفصاح نفسه، وإذا كان النص متاحاً في المستند فلا بد أن يكون "
                   "الرقم مطبوعاً فيه. أما سياسة الترجمة التي تحملها كل قائمة "
                   "مالية فليست تعرضاً ولا تُحتسب. ولا شيء هنا يقول ماذا تعني أي "
                   "حركة في أي عملة لسعر أي سهم.",
        "read": len(store["readings"]),
        "companyCount": len(companies),
        "companies": companies,
    }
    OUT.write_text(json.dumps(document, ensure_ascii=False, indent=1) + "\n",
                   encoding="utf-8")
    return document


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=6,
                        help="how many filings to read this run")
    parser.add_argument("--only", default="", help="read these tickers only")
    parser.add_argument("--refresh", default="",
                        help="read these filing ids again, whatever is held")
    parser.add_argument("--local-only", action="store_true",
                        help="never download; read only what is already cached")
    parser.add_argument("--shard", default="",
                        help="read only this slice of the queue, as i/n")
    parser.add_argument("--store", default="",
                        help="read and write this store instead of the shared one")
    parser.add_argument("--merge", default="",
                        help="fold these shard stores into the shared one and stop")
    parser.add_argument("--check", action="store_true",
                        help="report what is outstanding and read nothing")
    parser.add_argument("--publish", action="store_true",
                        help="rebuild the published document from the store only")
    args = parser.parse_args(argv)

    filings = statements_index()

    if args.merge:
        store = merge([pathlib.Path(p) for p in args.merge.split(",") if p.strip()])
        document = publish(store, filings)
        print(f"   merged into {len(store['readings'])} readings; "
              f"{document['companyCount']} companies carry a filed currency figure")
        return 0

    where = pathlib.Path(args.store) if args.store else None
    store = held(where)

    wanted = {t.strip().upper() for t in args.only.split(",") if t.strip()}
    again = {f.strip() for f in args.refresh.split(",") if f.strip()}
    queue = outstanding(filings, held(), wanted, again)
    if args.shard:
        index, count = (int(part) for part in args.shard.split("/"))
        # Sliced round-robin so each shard still walks newest-filing-first:
        # handing one worker the first third of the queue would give it every
        # company beginning with A and nobody else a newest filing at all.
        queue = [row for n, row in enumerate(queue) if n % count == index]
    answered = {r.get("ticker") for r in store["readings"].values() if has_a_figure(r)}

    print(f"   {len(by_ticker(filings))} companies have a read statement; "
          f"{len(store['readings'])} filings read for currency, "
          f"{len(answered)} answered, {len(queue)} filings outstanding")
    # Before --publish on purpose: build_all runs this step with both --publish
    # and --check, and a dry run that rewrites the published document is not a
    # dry run.
    if args.check:
        cached = sum(1 for _, _, row in queue if local_pdf(row))
        print(f"   {cached} of those have the filing on disk already")
        return 0

    if args.publish:
        document = publish(store, filings)
        print(f"   {document['companyCount']} companies carry a filed "
              f"currency figure, from {document['read']} readings")
        return 0

    read = dropped_total = 0
    for ticker, filing, row in queue[: max(0, args.limit)]:
        pdf = local_pdf(row)
        if pdf is None and not args.local_only:
            pdf = fetch_pdf(row.get("attachment_url") or "", filing, ticker)
        if pdf is None:
            print(f"   {ticker} {filing}: the filing could not be reached — will retry")
            continue
        try:
            reading, dropped = read_filing(pdf)
        except Exception as error:  # a reader that fell over is a retry, not a reading
            print(f"   {ticker} {filing}: {type(error).__name__} — will retry")
            continue
        if reading is None:
            print(f"   {ticker} {filing}: the reader gave no usable answer — will retry")
            continue
        store["readings"][filing] = dict(reading, ticker=ticker, dropped=dropped)
        save(store, where)
        read += 1
        dropped_total += len(dropped)
        currencies = ", ".join(f"{c} {v:+.3f}m" for c, v in
                               sorted((reading.get("position") or {}).items()))
        result = reading.get("fxResult")
        parts = [p for p in (currencies,
                             f"fx result {result:+.3f}m" if result is not None else "")
                 if p]
        print(f"   {ticker} {filing}: " + ("; ".join(parts) or "no figure printed")
              + (f"  ({len(dropped)} dropped)" if dropped else ""))

    document = publish(held() if where else store, filings)
    print(f"   read {read}, dropped {dropped_total} figures the two reads did not share; "
          f"{document['companyCount']} companies carry a filed currency figure")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
