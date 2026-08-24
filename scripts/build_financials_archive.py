#!/usr/bin/env python3
"""Extract the filed financial numbers out of the results announcements we hold.

`financial-statements-filter` on the API turns out to be a "latest 34" view, not
an archive — a dead end for history. But the results announcements themselves
are already in the disclosure harvest under secId 6 ("Financial Results"):
22,881 of them, 2010→today, 382 companies. Each carries the exchange's fixed
results template, and that template states the reported net profit and the
same figure for the year-earlier period as **labelled fields**, in both
languages.

This reads those fields. It is a primary source — the issuer's own filed number,
published by the exchange, in text — with no PDF, no OCR and no model. It fills
net profit, the comparative, the reporting period, the currency and the audit
status, and nothing it cannot read from a labelled field.

Where the number lives only in the attached PDF (about 40% — banks and
insurers use a different template, and some filings just say "reports 6-month
results" with the figures in the attachment), the row is still emitted with its
metadata and PDF link, and `net_profit` is left null. Those attachments are
1-bit scans behind the exchange's firewall; getting them is a separate problem
and reading them is an Arabic-OCR one.

Output: data-source/egx-beta/financials/ — a CSV and a JSON, every results
announcement with whatever numbers were on its face.
"""
from __future__ import annotations

import argparse
import csv
import datetime
import glob
import gzip
import json
import pathlib
import re

REPO = pathlib.Path(__file__).resolve().parent.parent
FILINGS = REPO / "data-source" / "egx-beta" / "filings"
OUT = REPO / "data-source" / "egx-beta" / "financials"

TICKER = re.compile(r"\(([A-Z0-9]{2,8})\.CA\)")
PERIOD = re.compile(r"Period\s*:?\s*From\s*(\d{2}/\d{2}/\d{4})\s*To\s*(\d{2}/\d{2}/\d{4})", re.I)
NET = re.compile(r"Net\s+Profit\s*:?\s*\(?\s*(-?[\d,]+)\s*\)?", re.I)
COMP = re.compile(r"Net\s+Comparative\s+Profit\s*:?\s*\(?\s*(-?[\d,]+)\s*\)?", re.I)
CURR = re.compile(r"Currency\s*:?\s*([^\r\n<]{1,24}?)\s*(?:F/S|ISIN|Net|Source|$)", re.I)
AUDIT = re.compile(r"Audit\s+Status\s*:?\s*([A-Za-z ]{3,20})", re.I)
ISIN = re.compile(r"ISIN\s*Code\s*:?\s*([A-Z0-9]{10,14})", re.I)
BASIS = re.compile(r"F/S\s+(Standalone|Consolidated)\s+Period", re.I)


def num(raw: str | None) -> int | None:
    if not raw:
        return None
    neg = raw.strip().startswith("-")
    digits = re.sub(r"[^\d]", "", raw)
    if not digits:
        return None
    return -int(digits) if neg else int(digits)


def flatten(html: str) -> str:
    # The template packs label and value with no space between records once the
    # tags are gone, so keep a separator where a tag was.
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html or "")).strip()


def rows():
    out = []
    for path in sorted(glob.glob(str(FILINGS / "*.json.gz"))):
        for it in json.loads(gzip.decompress(pathlib.Path(path).read_bytes())).get("items", []):
            if it.get("secId") != 6:
                continue
            body = flatten(it.get("content"))
            heading = it.get("heading") or ""
            tick = TICKER.search(heading)
            # The template lists the current period first, the comparative
            # second; take the first period match as the reporting one.
            periods = PERIOD.findall(body)
            curr = CURR.search(body)
            basis = BASIS.search(body)
            pdf = re.search(r'href="([^"]+\.pdf)"', it.get("content") or "", re.I)
            out.append({
                "ticker": tick.group(1) if tick else "",
                "company": (it.get("companyName") or "").strip(),
                "company_ar": (it.get("companyNameArabic") or "").strip(),
                "isin": (it.get("isin") or (ISIN.search(body).group(1) if ISIN.search(body) else "")),
                "filed": it["dateStamp"][:10],
                "period_from": periods[0][0] if periods else "",
                "period_to": periods[0][1] if periods else "",
                "basis": basis.group(1) if basis else "",
                "currency": curr.group(1).strip() if curr else "",
                "net_profit": num(NET.search(body).group(1) if NET.search(body) else None),
                "net_profit_prior": num(COMP.search(body).group(1) if COMP.search(body) else None),
                "audit": (AUDIT.search(body).group(1).strip() if AUDIT.search(body) else ""),
                "pdf": ("https://www.egx.com.eg" + pdf.group(1)) if pdf else "",
                "link": f"https://www.egx.com.eg/en/NewsDetails.aspx?NewsID={it['code']}",
                "heading": heading.strip(),
            })
    return out


def main() -> int:
    argparse.ArgumentParser(description=__doc__).parse_args()
    data = sorted(rows(), key=lambda r: (r["filed"], r["ticker"]))
    OUT.mkdir(parents=True, exist_ok=True)

    cols = ["filed", "ticker", "company", "isin", "period_from", "period_to",
            "basis", "currency", "net_profit", "net_profit_prior", "audit",
            "pdf", "link"]
    with (OUT / "financials.csv").open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(data)
    (OUT / "financials.json").write_text(
        json.dumps({"generated": datetime.date.today().isoformat(),
                    "count": len(data), "statements": data},
                   ensure_ascii=False, indent=1),
        encoding="utf-8")

    have = sum(1 for r in data if r["net_profit"] is not None)
    pdfonly = sum(1 for r in data if r["net_profit"] is None and r["pdf"])
    print(f"{len(data)} results announcements")
    print(f"  net profit on the face:   {have} ({have*100//len(data)}%)")
    print(f"  number only in the PDF:   {len(data)-have} "
          f"({pdfonly} of them link a PDF)")
    print(f"  companies:                {len({r['ticker'] for r in data if r['ticker']})}")
    print(f"  -> {OUT/'financials.csv'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
