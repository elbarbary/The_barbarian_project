#!/usr/bin/env python3
"""A delisted company stays in the directory, with a note saying what it is.

The exchange delisted fourteen companies the vendor scan still quotes — Nile
Cotton Ginning among them, final notice 14 June 2021 (NewsID 211501). Their
shares did not stop existing: they moved to the exchange's over-the-counter
system, "خارج المقصورة", and they still change hands there. So a reader who
holds one, or is offered one, should still find its page, its price and its
filings. What must not happen is the page presenting it as a company that
trades on the exchange.

So the directory row and the company document each carry a `listing` note:

    "listing": {
      "status": "delisted", "market": "OTC",
      "delisted_on": "2021-06-14", "news_id": 211501,
      "link": "https://www.egx.com.eg/en/NewsDetails.aspx?NewsID=211501",
      "kind": "voluntary",
      "note": "Delisted from the Egyptian Exchange — …",
      "note_ar": "مشطوبة من البورصة المصرية — …"
    }

Every figure in it is the exchange's own notice, read by `listing_status`; the
two sentences are fixed templates around those figures, and say no more than
the notices do. Thirteen of the fourteen notices name the over-the-counter
system outright, and the vendor still reports trades for all of them.

What a delisted company does NOT get is decided elsewhere and stays that way:
no calendar window for results it will never file with the exchange
(`build_calendar`), no unusual-volume session (`build_volume_events`), no place
on the silent-filer list (`build_signals`).

WHY A STEP OF ITS OWN
---------------------
Same reason as `apply_company_facts`: `build_market_api` recreates `companies/`
from scratch and only runs where the daily scan is. This runs after it, needs
no network, and every step after it edits the documents in place, so the note
survives to the commit. It also REMOVES a note from a company the notices no
longer name — a relisting — so a stale note cannot outlive the fact.

Usage:
    python3 scripts/apply_listing_status.py [--check]
"""

from __future__ import annotations

import argparse
import json
import pathlib

import listing_status

REPO = pathlib.Path(__file__).resolve().parent.parent
V1 = REPO / "public" / "data" / "v1"
DIRECTORY = V1 / "companies.json"
COMPANIES = V1 / "companies"
FIXTURES = REPO / "app" / "assets" / "fixtures"

KEY = "listing"


def note(record: dict) -> dict:
    """The note for one delisted company, from its final notice."""
    date, code = record["delisted_on"], record["news_id"]
    return {
        "status": "delisted",
        # The exchange's own name for where the shares went. Not a claim about
        # any particular trade.
        "market": "OTC",
        "delisted_on": date,
        "news_id": code,
        "link": record["link"],
        "kind": record.get("kind"),
        "note": (f"Delisted from the Egyptian Exchange — final delisting notice of "
                 f"{date} (EGX NewsID {code}). Its shares trade over the counter, "
                 f"not on the exchange."),
        # "خارج المقصورة" is the exchange's own phrase for the OTC system, in
        # the notices themselves (211501: "بنظام نقل الملكية (خارج المقصورة)").
        "note_ar": (f"مشطوبة من البورصة المصرية — إخطار الشطب النهائي بتاريخ {date} "
                    f"(رقم {code}). تُتداول أسهمها خارج المقصورة، وليس في البورصة."),
    }


def mark(target: dict, wanted: dict | None) -> bool:
    """Put `wanted` on a row or document, or take a stale note off. True if moved."""
    if wanted:
        if target.get(KEY) != wanted:
            target[KEY] = wanted
            return True
        return False
    if KEY in target:
        del target[KEY]
        return True
    return False


def load(path: pathlib.Path) -> tuple[dict, str]:
    try:
        raw = path.read_text(encoding="utf-8")
        return json.loads(raw), raw
    except (OSError, ValueError):
        return {}, ""


def apply(write: bool = True, *, notes: dict[str, dict] | None = None,
          disputed: dict[str, dict] | None = None) -> int:
    print("── Listing status")
    if notes is None:
        items = listing_status.load_items()
        if not items:
            # No archive, no answer — which is not the same as "nobody is
            # delisted", so the published notes are left exactly as they are.
            print("   no filings archive on disk — leaving the documents alone")
            return 0
        gone, disputed = listing_status.derive(items, listing_status.quoted_on_exchange())
        notes = {ticker: note(record) for ticker, record in gone.items()}
    disputed = disputed or {}

    directory, raw = load(DIRECTORY)
    rows = directory.get("companies") or []
    listed = {str(row.get("ticker") or "") for row in rows}
    rows_moved = sum(mark(row, notes.get(str(row.get("ticker") or ""))) for row in rows)
    if rows_moved and write:
        # The same bytes in both places: build_fixtures refuses a manifest
        # while the bundled directory differs from the published one.
        body = json.dumps(directory, ensure_ascii=False, separators=(",", ":"))
        body += "\n" if raw.endswith("\n") else ""
        DIRECTORY.write_text(body, encoding="utf-8")
        mirror = FIXTURES / "companies.json"
        if mirror.exists():
            mirror.write_text(body, encoding="utf-8")

    docs_moved = 0
    for root in (COMPANIES, FIXTURES / "companies"):
        for path in sorted(root.glob("*.json")):
            doc, _ = load(path)
            if not doc:
                continue
            ticker = str(doc.get("ticker") or path.stem)
            if not mark(doc, notes.get(ticker)):
                continue
            if root is COMPANIES:
                docs_moved += 1
            if write:
                path.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")),
                                encoding="utf-8")

    shown = sorted(t for t in notes if t in listed)
    print(f"   {len(shown)} directory companies delisted by the exchange, kept with "
          f"a note: {', '.join(f'{t} ({notes[t]['news_id']})' for t in shown) or 'none'}")
    for ticker, record in sorted(disputed.items()):
        if ticker in listed:
            print(f"   {ticker}: NOT noted — final notice {record['news_id']} of "
                  f"{record['delisted_on']}, but {record['contradicted_by']}")
    verb = " would be" if not write else ""
    print(f"   {rows_moved} directory rows and {docs_moved} company documents{verb} updated")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="report without writing")
    args = parser.parse_args()
    return apply(write=not args.check)


if __name__ == "__main__":
    raise SystemExit(main())
