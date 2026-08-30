#!/usr/bin/env python3
"""Who is actually buying and selling on the exchange.

The exchange publishes, and has always published, a breakdown of the market by
who traded it: Egyptians, Arabs and non-Arab foreigners, each split into
individuals and institutions, with the value bought, the value sold and the net
between them. Nothing in this repo read it, so the site could say how much
changed hands and never who changed it.

`beta.egx.com.eg/api/bff/egx/investor-full-statistics`, the same host and the
same request path the filing archive already uses. It answers a single GET and
carries both languages of every label, so nothing here is translated by us.

WHAT IT IS AND IS NOT
The figures are the exchange's own, period-to-date, in Egyptian pounds. They
are NOT intraday: the app screenshot's minute-by-minute curve is built from a
feed this endpoint does not carry, and this publishes no series pretending
otherwise. `bonds`, `bills` and `noBonds` are the same split over different
instrument sets and are carried through unread rather than dropped, because a
figure that exists and is thrown away is a figure somebody will later
reconstruct badly.

The net figures sum to zero across the three nationalities by construction —
every pound bought is a pound sold — so "Arabs & Foreigners" is the exchange's
own convenience row, not a fourth party, and is carried with a flag saying so.
"""
from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import harvest_egx_beta as beta          # noqa: E402  the WAF-aware request path

REPO = HERE.parent
OUT = REPO / "public" / "data" / "v1" / "investors.json"
FIXTURE = REPO / "app" / "assets" / "fixtures" / "investors.json"
ENDPOINT = "/api/bff/egx/investor-full-statistics"

# The exchange's own convenience total: Arabs plus non-Arab foreigners. Useful
# on a card, wrong in a sum — including it beside its two parts double-counts.
COMBINED = "Arabs & Foreigners"


def party(row: dict) -> dict:
    """One nationality's buy, sell and net, with the exchange's own labels."""
    return {
        "party": row.get("nationalityEnglish") or row.get("clientType"),
        "party_ar": row.get("nationality") or row.get("clientTypeA"),
        "buy": row.get("buyValue"),
        "sell": row.get("sellValue"),
        "net": row.get("netValue"),
        # True for the exchange's combined row, which is the sum of the two
        # beside it rather than a party of its own.
        "combined": (row.get("nationalityEnglish") or row.get("clientType")) == COMBINED,
    }


def share(row: dict) -> dict:
    """A nationality's share of everything traded, as the exchange states it."""
    return {
        "party": row.get("clientType"),
        "party_ar": row.get("clientTypeA"),
        "buy_percent": row.get("buyPerc"),
        "sell_percent": row.get("sellPerc"),
        "percent": row.get("totalPerc"),
        "buy": row.get("buyValue"),
        "sell": row.get("sellValue"),
        "net": row.get("netValue"),
        "combined": row.get("clientType") == COMBINED,
    }


def build(payload: dict) -> dict | None:
    data = (payload or {}).get("data") or {}
    types = data.get("investorsType") or []
    individuals = data.get("individiualInvestorsByNationality") or []   # the exchange's spelling
    institutions = data.get("institutionInvestorsByNationality") or []
    if not (types and individuals and institutions):
        return None

    return {
        "updated_at": datetime.datetime.now(datetime.timezone.utc)
                              .replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source": f"beta.egx.com.eg {ENDPOINT}",
        "currency": "EGP",
        # What the exchange states this covers. It is period-to-date, not one
        # session, and the screen has to say so rather than let a reader take
        # it for today.
        "basis": "period to date, as published by the exchange",
        "by_nationality": [share(r) for r in types],
        "individuals": [party(r) for r in individuals],
        "institutions": [party(r) for r in institutions],
        # The same split over instrument subsets, carried unread.
        "excluding_bonds": [share(r) for r in (data.get("investorsTypeNoBonds") or [])],
        "bonds": [share(r) for r in (data.get("investorsTypeBonds") or [])],
        "bills": [share(r) for r in (data.get("investorsTypeBills") or [])],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="fetch and report, write nothing")
    args = parser.parse_args()

    print("── Investors")
    try:
        payload = beta.request(ENDPOINT)
    except Exception as error:                          # noqa: BLE001 — best effort
        print(f"   ! {type(error).__name__}: {error}")
        print("   the exchange did not answer — leaving the published document alone")
        return 0

    doc = build(payload)
    if doc is None:
        print("   the reply carried no investor blocks — leaving the published "
              "document alone")
        return 0

    for row in doc["by_nationality"]:
        note = " (the exchange's own combined row)" if row["combined"] else ""
        print(f"   {str(row['party']):22} {row['percent']:>6}% of value traded{note}")

    if args.check:
        return 0
    for path in (OUT, FIXTURE):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n",
                        encoding="utf-8")
    print(f"   wrote {OUT.relative_to(REPO)} and the app fixture")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
