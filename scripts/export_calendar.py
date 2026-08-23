#!/usr/bin/env python3
"""Export the forward-looking filings — the ones that name a date still ahead —
as a spreadsheet and a linked document, from what harvest_egx_beta.py holds.

Not the PDFs (those are 1-bit scans behind an F5 wall). The filing *text* the
exchange published is already in the harvest, and it carries the scheduled date
and the reasoning. This writes it out with a direct link to each filing.
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

import build_calendar as cal

REPO = pathlib.Path(__file__).resolve().parent.parent
FILINGS = REPO / "data-source" / "egx-beta" / "filings"
OUT = REPO / "data-source" / "egx-beta" / "calendar-export"

KIND_LABEL = {
    "dividend_payment": "Dividend payment",
    "ex_dividend": "Ex-dividend",
    "rights_open": "Rights issue opens",
    "rights_close": "Rights issue closes",
    "rights_entitlement": "Rights entitlement cutoff",
    "assembly_agm": "Annual general assembly",
    "assembly_egm": "Extraordinary general assembly",
    "trading_resume": "Trading resumes",
    "trading_suspend": "Trading suspended",
    "listing_effective": "Listing change effective",
}


def rows(*, upcoming_only: bool):
    today = datetime.date.today()
    seen = {}
    for path in sorted(glob.glob(str(FILINGS / "*.json.gz"))):
        doc = json.loads(gzip.decompress(pathlib.Path(path).read_bytes()))
        for item in doc.get("items", []):
            try:
                filed = datetime.date.fromisoformat(item["dateStamp"][:10])
            except (KeyError, ValueError):
                continue
            heading = item.get("heading") or ""
            body = cal.strip(item.get("content"))
            section = (item.get("section") or "").strip()
            tick = cal.TICKER.search(heading)
            ticker = tick.group(1) if tick else ""
            for kind, when, note in cal.events_for(section, heading, body):
                if when <= filed:
                    continue
                if upcoming_only and when < today:
                    continue
                key = (ticker, kind, when.isoformat())
                if key in seen and seen[key]["announced"] >= item["dateStamp"][:10]:
                    continue
                seen[key] = {
                    "date": when.isoformat(),
                    "days_away": (when - today).days,
                    "event": KIND_LABEL.get(kind, kind),
                    "ticker": ticker,
                    "company": re.sub(r"\s*\([A-Z0-9]+\.CA\).*", "", heading).strip(),
                    "detail": note,
                    "announced": item["dateStamp"][:10],
                    "link": f"https://www.egx.com.eg/en/NewsDetails.aspx?NewsID={item['code']}",
                    "heading": heading.strip(),
                    "heading_ar": (item.get("headingArabic") or "").strip(),
                    "text": body,
                    "text_ar": cal.strip(item.get("contentArabic")),
                }
    return sorted(seen.values(), key=lambda r: (r["date"], r["ticker"], r["event"]))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--all", action="store_true",
                    help="every forward-dated filing, not only those still ahead")
    args = ap.parse_args()

    data = rows(upcoming_only=not args.all)
    OUT.mkdir(parents=True, exist_ok=True)
    scope = "all" if args.all else "upcoming"

    # 1. Spreadsheet — opens in Sheets/Excel, the link column is clickable.
    csv_path = OUT / f"calendar-{scope}.csv"
    with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["Date", "Days away", "Event", "Ticker", "Company",
                    "Detail", "Announced", "Link"])
        for r in data:
            w.writerow([r["date"], r["days_away"], r["event"], r["ticker"],
                        r["company"], r["detail"], r["announced"], r["link"]])

    # 2. Full filings with links — the text the exchange published, both
    #    languages, so the PDF is not needed to read what was filed.
    md_path = OUT / f"calendar-{scope}.md"
    with md_path.open("w", encoding="utf-8") as f:
        f.write(f"# EGX scheduled events — {scope}\n\n")
        f.write(f"Generated {datetime.date.today().isoformat()} · {len(data)} events\n\n")
        for r in data:
            f.write(f"## {r['date']} — {r['event']} — {r['ticker']}\n\n")
            f.write(f"**{r['company']}** · announced {r['announced']} · "
                    f"{r['days_away']} days away\n\n")
            f.write(f"[Open the filing on EGX]({r['link']})\n\n")
            if r["text"]:
                f.write(f"> {r['text'][:600]}\n\n")
            f.write("---\n\n")

    # 3. The full records as JSON, for anything downstream.
    json_path = OUT / f"calendar-{scope}.json"
    json_path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"{len(data)} {scope} events")
    print(f"  {csv_path}")
    print(f"  {md_path}")
    print(f"  {json_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
