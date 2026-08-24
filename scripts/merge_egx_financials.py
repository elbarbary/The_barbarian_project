#!/usr/bin/env python3
"""Put the exchange's own filed net profit into the company documents.

The app's financial periods come from Mubasher: a full statement per period —
assets, equity, cash flow, net income — for 227 of 280 companies. The exchange
publishes only one line of that, net profit, but it publishes it **as the
issuer filed it**, in a fixed template, stamped with the ISIN.

Where the two disagree, the exchange wins. That is the founder's call and it is
the right one: Mubasher is a redistributor and EGX is the registry.

What this does NOT do
---------------------
It does not invent the rest of the statement. A period the exchange reports and
Mubasher does not gets a row with `net_income` and nulls everywhere else, marked
with its source — never a balance sheet assembled from nothing. This repository
has shipped invented financials for a real ticker once; the guard against a
second time is that every number here traces to a filing.

Units, which is where this goes wrong quietly
---------------------------------------------
Mubasher stores **millions of EGP** (`net_income: 10238.157` is CIB's 10.2bn).
The exchange files **whole pounds** (`Net Profit : 8,426,170`). Merging without
dividing by a million overstates a company by six orders of magnitude, on the
one screen a reader would act on. So the conversion is explicit, it is tested,
and a filing denominated in anything but Egyptian pounds is skipped rather than
converted at a rate this app does not have.
"""

from __future__ import annotations

import argparse
import datetime
import glob
import gzip
import json
import pathlib
import re

import egx_dates

REPO = pathlib.Path(__file__).resolve().parent.parent
FILINGS = REPO / "data-source" / "egx-beta" / "filings"
COMPANIES = REPO / "public" / "data" / "v1" / "companies"
FIXTURES = REPO / "app" / "assets" / "fixtures" / "companies"

TICKER = re.compile(r"\(([A-Z0-9]{2,8})\.CA\)")
# Profit **and loss**: the template says "Net Loss : 19,534,187" for a negative
# and never writes a minus sign. Reading only "Net Profit" drops every loss-
# making period, which is the half a reader most needs.
NET = re.compile(r"Net\s+(Profit|Loss)\s*:?\s*\(?\s*(-?[\d,]+)(\.\d+)?\s*\)?", re.I)

# The template is not the only shape in this feed. Some filings write a rounded
# figure with its own unit — "Net profit : 25.9 Million USD", "77.7 Value In
# Million" — and reading `[\d,]+` off one of those yields 25 or 77, which then
# divides to 0.0 and publishes a company's quarter as zero. Any of these near
# the figure disqualifies the filing.
QUALIFIED = re.compile(r"(million|thousand|billion|USD|EUR|\bmn\b|\bbn\b)", re.I)
PERIOD = re.compile(
    r"Period\s*:?\s*From\s*(\d{1,2}/\d{1,2}/20\d{2})\s*To\s*(\d{1,2}/\d{1,2}/20\d{2})", re.I
)
CURRENCY = re.compile(r"Currency\s*:?\s*([^\r\n<]{1,24}?)\s*(?:F/S|ISIN|Net|Source|$)", re.I)
BASIS = re.compile(r"F/S\s+(Standalone|Consolidated)\s+Period", re.I)

# Only Egyptian pounds. The template also carries `$` and `EUR` filings, and
# converting those needs a rate on the filing's own date that this app does not
# hold — so they are skipped, and counted, rather than silently mixed into a
# column labelled EGP.
EGP = {"egp", "l.e", "l.e.", "egyptian pound", "egyptian pounds", "جنيه مصري"}

SOURCE = "https://www.egx.com.eg"


def flatten(html: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html or "")).strip()


def period_label(start: datetime.date, end: datetime.date) -> tuple[str, bool] | None:
    """The period's label, and whether it may be matched against Mubasher's.

    The exchange files **cumulative from the fiscal year's start** — three
    months, six, nine, twelve — while Mubasher files calendar quarters. Those
    two vocabularies only line up when the company's year starts in January:

      * `01/01 → 31/03` is Q1 to both, and `01/01 → 31/12` is FY to both.
      * `01/01 → 30/09` is EGX's cumulative nine months. It is **not**
        Mubasher's Q3, which is the three months from July.

    And 43 of 342 companies do not run a calendar year at all. Abu Qir's "Year
    Ended 30/06/2023" is its FY 2023; Mubasher's FY 2023 for the same ticker is
    a different twelve months. Overriding one with the other would not be
    choosing the better source — it would be comparing two different years and
    calling the difference a correction.

    So a period that does not start on 1 January is still published, with the
    end date in its label so it can never collide, and is never matched against
    a Mubasher row.
    """
    months = round((end - start).days / 30.44)
    calendar_aligned = start.month == 1 and start.day == 1
    year = end.year
    if months >= 11:
        stem = f"FY {year}"
    elif 8 <= months <= 10:
        stem = f"9M {year}"
    elif 5 <= months <= 7:
        stem = f"H1 {year}"
    elif 2 <= months <= 4:
        stem = f"Q{(end.month - 1) // 3 + 1} {year}"
    else:
        return None
    if calendar_aligned:
        return stem, True
    # A fiscal year of its own: label it by the window it actually covers.
    return f"{stem} (to {end:%-d %b})", False


def egx_rows() -> tuple[dict[tuple[str, str], dict], dict[str, int]]:
    """Every filed net profit, keyed by (ticker, period label).

    Consolidated beats standalone where a company filed both for one period:
    that is the figure Mubasher reports and the one the app's other columns
    describe, so mixing bases inside a column would be the same overstatement
    bug wearing different clothes.
    """
    rows: dict[tuple[str, str], dict] = {}
    skipped = {"currency": 0, "no_period": 0, "no_ticker": 0, "no_label": 0,
               "magnitude": 0, "qualified": 0, "zero": 0}
    for path in sorted(glob.glob(str(FILINGS / "*.json.gz"))):
        for item in json.loads(gzip.decompress(pathlib.Path(path).read_bytes())).get("items", []):
            if item.get("secId") != 6:
                continue
            body = flatten(item.get("content"))
            profit = NET.search(body)
            if not profit:
                continue
            # A decimal in the figure means it is not whole pounds.
            if profit.group(3):
                skipped["qualified"] += 1
                continue
            # ...and neither is a figure sitting next to a unit word.
            window = body[max(0, profit.start() - 40): profit.end() + 40]
            if QUALIFIED.search(window):
                skipped["qualified"] += 1
                continue
            tick = TICKER.search(item.get("heading") or "")
            if not tick:
                skipped["no_ticker"] += 1
                continue
            # An explicit Egyptian-pound currency is **required**, not merely
            # not-contradicted. A filing with no Currency line at all used to
            # pass this test, and one of them was Orascom reporting in dollars.
            found = CURRENCY.search(body)
            currency = found.group(1).strip().lower() if found else ""
            if currency not in EGP:
                skipped["currency"] += 1
                continue
            span = PERIOD.search(body)
            if not span:
                skipped["no_period"] += 1
                continue
            order = egx_dates.detect_order(body)
            start = egx_dates.parse(span.group(1), order)
            end = egx_dates.parse(span.group(2), order)
            if not start or not end or end <= start:
                skipped["no_period"] += 1
                continue
            labelled = period_label(start, end)
            if not labelled:
                skipped["no_label"] += 1
                continue
            label, comparable = labelled

            whole_pounds = int(re.sub(r"[^\d]", "", profit.group(2)) or 0)
            # "Net Loss" is how the template writes a negative.
            if profit.group(1).lower() == "loss" or profit.group(2).strip().startswith("-"):
                whole_pounds = -abs(whole_pounds)
            # Sub-million figures round to 0.0 in a column of millions, and a
            # published zero reads as "this company earned nothing".
            if whole_pounds == 0:
                skipped["zero"] += 1
                continue
            basis = (BASIS.search(body).group(1).lower() if BASIS.search(body) else "")

            key = (tick.group(1), label)
            held = rows.get(key)
            # Consolidated wins; failing that, the later filing wins, because a
            # restatement supersedes the original.
            if held:
                if held["basis"] == "consolidated" and basis != "consolidated":
                    continue
                if held["basis"] == basis and held["filed"] >= item["dateStamp"][:10]:
                    continue
            rows[key] = {
                # Millions of EGP, to match the column it lands in. This single
                # division is the difference between 8.4 and 8,426,170.
                "net_income": round(whole_pounds / 1_000_000, 3),
                "basis": basis,
                "filed": item["dateStamp"][:10],
                "period_start": start.isoformat(),
                "period_end": end.isoformat(),
                "comparable": comparable,
                "code": item["code"],
            }
    return rows, skipped


def merge(dry_run: bool) -> int:
    rows, skipped = egx_rows()
    print(f"── EGX filed net profit: {len(rows)} (ticker, period) figures")
    print(f"   skipped — non-EGP {skipped['currency']}, no period "
          f"{skipped['no_period']}, unmapped span {skipped['no_label']}, "
          f"no ticker {skipped['no_ticker']}, "
          f"non-template units {skipped['qualified']}, zero {skipped['zero']}")

    touched = overrode = added = 0
    for path in sorted(glob.glob(str(COMPANIES / "*.json"))):
        doc = json.loads(pathlib.Path(path).read_text())
        ticker = doc.get("ticker") or pathlib.Path(path).stem
        fin = doc.setdefault("financials", {})
        changed = False
        for bucket in ("annual", "quarterly"):
            periods = fin.setdefault(bucket, [])
            index = {p.get("period"): p for p in periods}
            for (tick, label), row in rows.items():
                if tick != ticker:
                    continue
                annual = label.startswith("FY")
                if annual != (bucket == "annual"):
                    continue
                existing = index.get(label) if row["comparable"] else None
                if existing:
                    held = existing.get("net_income")
                    if held == row["net_income"]:
                        continue
                    # A gap of this size is not two sources disagreeing, it is
                    # one of them denominated differently — several issuers file
                    # in thousands. Refuse rather than publish a figure a
                    # million out, and count the refusals so they stay visible.
                    if held and abs(held) > 0 and not (0.01 < row["net_income"] / held < 100):
                        skipped["magnitude"] = skipped.get("magnitude", 0) + 1
                        continue
                    existing["net_income"] = row["net_income"]
                    existing["net_income_source"] = SOURCE
                    existing["period_start"] = row["period_start"]
                    existing["period_end"] = row["period_end"]
                    overrode += 1
                    changed = True
                elif label not in index:
                    periods.append({
                        "period": label,
                        "net_income": row["net_income"],
                        "net_income_source": SOURCE,
                        "period_start": row["period_start"],
                        "period_end": row["period_end"],
                        # Everything else genuinely unknown for this period. The
                        # exchange files one line, and inventing the rest is the
                        # mistake this repository has already made once.
                        "source": SOURCE,
                    })
                    added += 1
                    changed = True
            periods.sort(key=lambda p: str(p.get("period")))
        if changed:
            touched += 1
            if not dry_run:
                body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
                pathlib.Path(path).write_text(body, encoding="utf-8")
                mirror = FIXTURES / pathlib.Path(path).name
                if mirror.parent.exists():
                    mirror.write_text(body, encoding="utf-8")

    verb = "would touch" if dry_run else "touched"
    print(f"   {verb} {touched} companies — {overrode} figures replaced by the "
          f"exchange's, {added} periods added that Mubasher never had")
    if skipped.get("magnitude"):
        print(f"   refused {skipped['magnitude']} override(s) as a likely unit "
              f"mismatch rather than publish a figure orders of magnitude out")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    return merge(ap.parse_args().dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
