#!/usr/bin/env python3
"""Read an EGX disclosure detail page.

Every disclosure in the feed links a detail page, and for results filings the
exchange renders a **fixed template** whose fields include the reported net
profit and the same figure for the year-earlier period. That is a primary
source: the exchange publishing the issuer's own filed number, stamped with the
ISIN, in HTML. No PDF, no OCR, no model.

What the template gives, and what it does not
---------------------------------------------
It gives net profit only. There is no revenue line, no balance sheet and no
cash flow — those exist solely inside the filed attachment, and the attachments
are 1-bit CCITT fax scans at 200 dpi with zero extractable characters (checked
across five of them: `pdftotext` returns 0 chars, `pdffonts` returns none).
Reading those is an Arabic OCR plus table-understanding problem with a real
error rate, over numbers people would put money behind, so it is deliberately
not attempted here.

The honest consequence: this fills `net_income` and nothing else. Every other
line stays null and renders as "—", which is what the nullable model was built
for.

This module is pure — HTML in, dicts out — so the parsing is testable without a
browser, which matters because the network side of this is slow and rate-limited
and cannot be exercised in CI.
"""

from __future__ import annotations

import html as html_lib
import re

# ASP.NET renders these with stable ids. Matched by id alone rather than by
# surrounding markup, and without assuming attribute order, because the page is
# a WebForms template whose wrapper markup shifts between filing types.
SPAN = "<span[^>]*id=[\"']?ctl00_C_N_{}[\"']?[^>]*>(.*?)</span>"
TITLE = re.compile(SPAN.format("lblTitle"), re.S)
DATE = re.compile(SPAN.format("lblDate"), re.S)
DETAILS = re.compile(SPAN.format("lblDetails"), re.S)

# The WAF answers with a challenge stub that is still HTTP 200, and a reset
# yields Chrome's own error page. Both are "successful" fetches that contain no
# filing. Presence of the details span is the only trustworthy signal.
SENTINEL = "ctl00_C_N_lblDetails"

# U+066B is the Arabic decimal separator and U+066C the thousands separator.
# They are one codepoint apart and mapping both to "." turns 12٬500٬000 into
# 12.500.000, which then fails to parse as a number at all.
ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩٫٬", "0123456789.,")


def looks_like_a_filing(page: str) -> bool:
    """Whether this HTML is a filing at all, rather than a block page.

    Guarding on this is not optional. A reset returns Chrome's error document
    and the F5 challenge returns a 7 KB stub, both with HTTP 200 — parse either
    without checking and the run publishes empty records over good ones.
    """
    return SENTINEL in page


def _text(raw: str) -> str:
    return " ".join(html_lib.unescape(re.sub(r"<[^>]+>", " ", raw or "")).split())


def parse_detail(page: str) -> dict | None:
    """The title, date, key/value body and attachments of one detail page.

    The body is `key : value` lines separated by `<br>`, so it is split on the
    breaks first and partitioned on the first colon second. Splitting on colons
    alone would cut times and ratios in half.
    """
    if not looks_like_a_filing(page):
        return None

    body = DETAILS.search(page)
    if not body:
        return None
    raw_body = body.group(1)

    fields: dict[str, str] = {}
    lines: list[str] = []
    for chunk in re.split(r"<br\s*/?>", raw_body):
        line = _text(chunk)
        if not line:
            continue
        lines.append(line)
        key, colon, value = line.partition(":")
        if colon and key.strip():
            fields[" ".join(key.split())] = value.strip()

    title = TITLE.search(page)
    date = DATE.search(page)
    return {
        "title": _text(title.group(1)) if title else None,
        "date": _text(date.group(1)) if date else None,
        "fields": fields,
        "lines": lines,
        # Read the anchors, never the prose. A filing can say the review report
        # is "مرفق" (attached) and render no link at all — verified on ELKA's
        # H1 filing, where the word is present and the anchor list is empty.
        "attachments": [
            href if href.startswith("http") else f"https://www.egx.com.eg{href}"
            for href in re.findall(r'href="([^"]+\.pdf)"', raw_body, re.I)
        ],
    }


def _number(raw: str) -> float | None:
    """A filed figure as a number, or None when the field is not one.

    Losses are filed in parentheses, and occasionally with a trailing sign, so
    both are read as negative rather than dropped.
    """
    if not raw:
        return None
    value = raw.translate(ARABIC_DIGITS).strip()
    negative = value.startswith("(") and value.endswith(")")
    value = value.strip("()").replace(",", "").replace(" ", "")
    if value.endswith("-"):
        negative, value = True, value[:-1]
    if not re.fullmatch(r"-?\d+(\.\d+)?", value):
        return None
    number = float(value)
    if negative:
        number = -abs(number)
    return number


DATE_RANGE = re.compile(r"(\d{2})/(\d{2})/(\d{4})\D+(\d{2})/(\d{2})/(\d{4})")


def _period(raw: str) -> dict | None:
    """`من 01/01/2026 الى 30/06/2026` as a labelled period.

    EGX filings are cumulative from the start of the financial year, so the
    span length is what names the period: three months is Q1, six is the half,
    twelve is the full year.
    """
    found = DATE_RANGE.search(raw or "")
    if not found:
        return None
    d1, m1, y1, d2, m2, y2 = (int(x) for x in found.groups())
    start, end = f"{y1:04d}-{m1:02d}-{d1:02d}", f"{y2:04d}-{m2:02d}-{d2:02d}"
    months = (y2 - y1) * 12 + (m2 - m1) + 1
    label = {3: "Q1", 6: "H1", 9: "9M", 12: "FY"}.get(months)
    if label is None:
        # A non-standard span is real — a stub period after incorporation, or a
        # changed year end. Name it by its length rather than forcing it into a
        # quarter it is not.
        label = f"{months}M"
    return {
        "start": start,
        "end": end,
        "months": months,
        "label": f"{label} {y2}",
    }


def _year_earlier(period: dict) -> dict:
    """The same span, one year back."""
    def shift(date: str) -> str:
        year, rest = date.split("-", 1)
        return f"{int(year) - 1:04d}-{rest}"

    end = shift(period["end"])
    label = period["label"].rsplit(" ", 1)[0]
    return {
        "start": shift(period["start"]),
        "end": end,
        "months": period["months"],
        "label": f"{label} {end[:4]}",
    }


# The template's own field names. Matched by substring because the exchange
# pads them inconsistently ("اسم الشركة       :") and occasionally extends them
# ("صافي الربح (الخسارة)").
KEY_ISIN = "كود الترقيم الدولي"
KEY_REUTERS = "كود رويترز"
KEY_NAME = "اسم الشركة"
KEY_CURRENCY = "العملة"
KEY_STATEMENTS = "القوائم المالية"
KEY_COMPARATIVE_PERIOD = "أرقام المقارنة"
COMPARATIVE = "المقارنة"
KEY_PROFIT_COMPARATIVE = "لفترة المقارنة"
KEY_PROFIT = "صافي الربح"

# "غير المجمعة" is standalone, "المجمعة" is consolidated. The negation is a
# prefix on the same word, so the negated form has to be tested first.
STANDALONE = "غير المجمعة"
CONSOLIDATED = "المجمعة"


def _find(fields: dict[str, str], needle: str) -> tuple[str, str] | None:
    for key, value in fields.items():
        if needle in key:
            return key, value
    return None


def financials_from_detail(detail: dict) -> dict | None:
    """The reported net profit in a results filing, or None if it is not one.

    Returns None rather than a partial record for anything that is not the
    results template — a delay notice, a covering statement, an auditor's
    letter. Those are real filings and the feed still carries them; they simply
    contain no figure.
    """
    fields = detail.get("fields") or {}

    period_field = _find(fields, KEY_STATEMENTS)
    profit_field = None
    for key, value in fields.items():
        # The comparative carries the same words plus "لفترة المقارنة", so it
        # has to be excluded explicitly or it wins on iteration order.
        if KEY_PROFIT in key and KEY_PROFIT_COMPARATIVE not in key:
            profit_field = (key, value)
            break
    if not period_field or not profit_field:
        return None

    period = _period(period_field[1] or period_field[0])
    net = _number(profit_field[1])
    if period is None or net is None:
        return None

    basis = "standalone" if STANDALONE in period_field[0] else (
        "consolidated" if CONSOLIDATED in period_field[0] else None
    )

    record: dict = {
        "period": period["label"],
        "period_start": period["start"],
        "period_end": period["end"],
        "months": period["months"],
        "basis": basis,
        # Filed in whole pounds. Kept whole here and converted once, at the
        # point of publication, so the stored record stays the filed figure.
        "net_profit_egp": net,
    }

    isin = _find(fields, KEY_ISIN)
    if isin:
        record["isin"] = isin[1]
    reuters = _find(fields, KEY_REUTERS)
    if reuters and reuters[1]:
        record["ticker"] = reuters[1].replace(".CA", "").strip()
    name = _find(fields, KEY_NAME)
    if name and name[1]:
        record["name_ar"] = name[1]
    currency = _find(fields, KEY_CURRENCY)
    if currency and currency[1]:
        record["currency"] = currency[1]

    comparative_profit = None
    for key, value in fields.items():
        if KEY_PROFIT_COMPARATIVE in key:
            comparative_profit = value
            break
    prior_net = _number(comparative_profit or "")

    # Any field naming the comparison and carrying a date range. Matching the
    # exact phrase "أرقام المقارنة" worked for standalone filings and silently
    # missed every consolidated one, which words the line differently — the
    # figure was read and the period it belonged to was not, so the comparison
    # was dropped on exactly the filings that matter most.
    prior = None
    for key, value in fields.items():
        if COMPARATIVE not in key or KEY_PROFIT in key:
            continue
        prior = _period(value or key)
        if prior:
            break

    if prior is None and prior_net is not None:
        # A comparative figure with no readable period. EGX comparatives are
        # the same span one year earlier — that is what a comparative is — so
        # the period is derived rather than the figure discarded.
        prior = _year_earlier(period)

    if prior:
        record["prior_period"] = prior["label"]
        record["prior_period_start"] = prior["start"]
        record["prior_period_end"] = prior["end"]
    if prior_net is not None:
        record["prior_net_profit_egp"] = prior_net

    return record
