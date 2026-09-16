#!/usr/bin/env python3
"""The exchange's own session figures: market value, trades and turnover.

The directory's market value came from TradingView's `marketCap` column, and
on 30 August 2026 five companies disagreed with the exchange's own figure by
half to two thirds:

    FAIT   ours 30.93bn   exchange  9.88bn
    VLMRA  ours 29.61bn   exchange 10.50bn
    AMES   ours 36.14bn   exchange 17.32bn
    SVCE   ours 10.61bn   exchange  5.18bn
    ASPI   ours  1.87bn   exchange  0.95bn

FAIT settles it: the exchange's figure is exactly its own price times its own
share count, and ours is 3.15 times that — so ours was simply wrong, on a real
ticker, in a column readers sort by. The rest are share-count disagreements
where our number is at least internally consistent, and the exchange is still
the better authority on how many shares of an Egyptian company are listed.

So the exchange wins where it has an answer, and the vendor fills the rest:
`/api/bff/egx/market-watch` covers 221 securities against a directory of 282,
including eight the vendor gave no market value at all.

It also carries two figures nothing else on this site has: how many TRADES a
share went through, and the VALUE those trades came to. The quotes Worker
serves both live during a session, and a live-only figure disappears at the
close — so the last harvest of the day, which runs at 14:45 against a 14:30
close, is what makes them survive into the evening.

Carried forward on refusal, like every other best-effort read of this host: a
company does not lose its market value because a WAF had a bad minute.

That protection was per-RUN and the gap was per-ROW. This endpoint returns a
different set of securities every time it is asked — 227 rows on 1 September,
221 on 2 September, 202 on 3 September, against a directory of 284 — and a
listing that fell out of one capture lost the currency it is quoted in, which
is a listing fact and not a session figure. SAIB and GPPL both published as
pound listings that way. `carry_currency` holds that one field for a ticker
today's capture does not carry, and only that one.

And which code the exchange gives each ISIN (`isins`), for the market scan.
The vendor files National Printing and Ferchem Misr under their ISINs, not
NAPR and FERC, so neither had ever been published; every market-watch row
carries the ISIN beside the Reuters code. That pairing is a listing fact too,
and a capture that leaves a row out is no reason to forget it. Of the 30
captures with rows archived from 28 August to 16 September 2026, SPHT is in
11, MMAT in 14 and EPPK in 15; a scan that could not name a published company
would have the daily build delete it. So `isins` holds every pairing a capture
has stated, the archived ones under `snapshot-history/` included, the newest
statement winning.

Usage:
    python3 scripts/harvest_egx_session.py [--check]
"""

from __future__ import annotations

import argparse
import datetime
import gzip
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import harvest_egx_beta as beta  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "data-source" / "egx-beta" / "session.json"
ARCHIVE = REPO / "data-source" / "egx-beta" / "snapshot-history"
PATH = "/api/bff/egx/market-watch?Page=1&PageSize=500"
SOURCE = "beta.egx.com.eg /api/bff/egx/market-watch"
TICKER = re.compile(r"^[A-Z]{3,6}$")
ISIN = re.compile(r"^EG[A-Z0-9]{10}$")
# `123251-market-watch.json.gz`, and not the gold or silver market watch that
# share the suffix and carry no listings.
CAPTURE = re.compile(r"^\d{6}-market-watch\.json\.gz$")


def number(value, *, whole: bool = False):
    """A positive number, or None. Zero is a fact and is kept."""
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return None
    if value < 0:
        return None
    return int(round(value)) if whole else float(value)


def fetch() -> tuple[dict[str, dict], str | None]:
    """One call to the exchange, then the pure part."""
    return extract(beta.request(PATH))


def extract(payload: dict) -> tuple[dict[str, dict], str | None]:
    """What the market-watch payload says, without going near a socket.

    Separated from the request so the rules below — which currency counts as
    foreign, when a share count is exact enough to publish — can be tested
    against a row rather than against the exchange's mood.
    """
    rows = ((payload.get("data") or {}).get("data")) or []
    if not isinstance(rows, list) or not rows:
        raise RuntimeError("market-watch returned no rows")
    out: dict[str, dict] = {}
    written = None
    for row in rows:
        ticker = str(row.get("reuters") or "").split(".")[0].strip().upper()
        # `mc` is whole pounds; `mcMillion` is the same number in millions and
        # is NOT used, because two units for one figure in one document is how
        # a market value ends up a thousand times wrong.
        cap = number(row.get("mc"))
        if not TICKER.match(ticker) or not cap:
            continue
        if row.get("writeTime"):
            written = str(row["writeTime"])
        held = {"market_cap": cap}
        # The exchange's own classification, in both languages.
        #
        # The vendor's taxonomy files real estate developers, banks, brokers,
        # contractors, hotels and a textile company all under one word:
        # "Finance". On 1 September that made a 75-company bucket out of seven
        # industries — MASR, TMGH and OCDI are property developers and were
        # being read, ranked and drawn as financials. 218 of the 220 companies
        # the exchange names a sector for disagreed with the vendor.
        #
        # The exchange publishes 18 sectors against the vendor's coarser set,
        # and it is the authority on how an Egyptian listing is classified.
        # The Arabic name comes with it, which retires a hand-kept map that had
        # to be extended by hand every time a sector appeared.
        # WHICH CURRENCY THE PRICE IS IN.
        #
        # Eleven of the exchange's listings are quoted in dollars, not pounds
        # — CFGH at $0.117, GPPL at $1.34 — and the site printed those in a
        # column every other figure on it denominates in EGP. The market value
        # beside them is in pounds, so `shares x close` came out 51.28 times
        # smaller than the published capitalisation, which is not a data error:
        # it is the exchange rate, and it is the only reason anybody noticed.
        #
        # Deliberately recorded rather than converted. Converting a price is a
        # claim about a rate on a day, and this file is a record of what the
        # exchange published. The screen can say "US$" for the cost of a word.
        currency = (row.get("currShort") or "").strip()
        sector = (row.get("sector") or "").strip()
        sector_ar = (row.get("sectorA") or "").strip()
        # Only where it is NOT the pound: absent means EGP, which is 216 of
        # the 227 and does not need saying on every row.
        if currency and currency != "L.E":
            held["currency"] = currency
        if sector:
            held["sector"] = sector
            if sector_ar:
                held["sector_ar"] = sector_ar
        # HOW MANY SHARES THE EXCHANGE HAS LISTED, recovered rather than guessed.
        #
        # The vendor's share count is wrong for nineteen companies, by three to
        # two hundred and seventy-four times: SEIGA is published with 2,500,000
        # shares against a capitalisation that needs 685 million of them, and
        # that figure feeds the free float printed on the company screen.
        #
        # The exchange does not publish a share count, but it publishes `mc`
        # and `closePrice` in the same row of the same document, and it
        # computes the first as the second times the listed shares. Dividing
        # returns an EXACT INTEGER for every pound-quoted listing in every
        # capture on disk — 221 of 221 — which is what proves the relation
        # rather than assumes it. So this is arithmetic on two of the
        # exchange's own figures, not an inference about a company.
        #
        # Not attempted for the eleven dollar listings: there `mc` is in pounds
        # and `closePrice` in dollars, so the quotient is shares times the
        # exchange rate. CFGH and GTEX both come out at 23,615,014,500, which
        # is the tell — two different companies cannot have one share count.
        close = number(row.get("closePrice"))
        if close and not held.get("currency"):
            shares = cap / close
            # An exact integer or it is not the relation we think it is, and a
            # number this feeds must never be a rounding.
            if abs(shares - round(shares)) < 1e-6 * max(1.0, shares):
                held["listed_shares"] = int(round(shares))

        trades = number(row.get("trades"), whole=True)
        value = number(row.get("value"), whole=True)
        if trades is not None:
            held["trades"] = trades
        if value is not None:
            held["value"] = value
        out[ticker] = held
    if not out:
        raise RuntimeError(f"market-watch returned {len(rows)} rows and no usable cap")
    return out, written


def load() -> dict:
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def carry_currency(rows: dict[str, dict], held: dict) -> dict[str, str]:
    """A currency the exchange stated, held through a capture that dropped the row.

    Everything else in this file is a figure about a MOMENT and is replaced
    wholesale — a stale trade count is worse than none. The currency a listing
    is quoted in is not: it is a listing fact, it changes by announcement and
    not by session, and it is the one field here whose absence is read as an
    answer rather than a gap.

    Which made it hostage to whichever securities the last capture happened to
    return. SAIB was in the 28 August capture at `currShort` "US$" and in no
    capture since; GPPL was in the 1 September capture at "US$" and gone the
    next morning. Both were republished as pound listings — a dollar price in
    a column of pounds, because a row was missing for a day. On 3 September it
    took eight minutes: the 10:00 capture held 223 rows and ten dollar
    listings, the 10:08 harvest held 202 and three.

    Only for a ticker TODAY'S capture does not carry. A ticker that comes back
    quoting the pound has no `currency` key and keeps none — this cannot pin a
    stale flag on a company that redenominates, because the exchange saying
    "L.E" today still beats anything held from before.
    """
    carried: dict[str, str] = {}
    for ticker, before in (held.get("securities") or {}).items():
        currency = (before or {}).get("currency")
        if not currency or ticker in rows:
            continue
        # Dated with the capture that STATED it, not the run that carried it,
        # so a currency held for a month cannot read as a fresh observation.
        rows[ticker] = {"currency": currency,
                        "currency_stated": before.get("currency_stated")
                        or held.get("harvested")}
        carried[ticker] = currency
    return carried


def pairs(payload: dict) -> list[tuple[str, str]]:
    """(ISIN, code) for every row of one market-watch capture that states both.

    Market value is not asked for: a row names its listing whether or not it
    carries a capitalisation. A bond (`EGBKRSK01CV`), the EGX 30 ETF
    (`EGX30ETF.CA`) and a subscription right (`LUTS_r1.CA`) have no code of
    the shape a share has, and state nothing here.
    """
    data = payload.get("data") if isinstance(payload, dict) else None
    rows = data.get("data") if isinstance(data, dict) else data
    found = []
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, dict):
            continue
        code = str(row.get("reuters") or "").split(".")[0].strip().upper()
        isin = str(row.get("isin") or "").strip().upper()
        if TICKER.match(code) and ISIN.match(isin):
            found.append((isin, code))
    return found


def archived(archive: pathlib.Path | None = None) -> list[tuple[str, str, str]]:
    """(stated, ISIN, code) from every capture `harvest_egx_beta` archived.

    `stated` is the archive's own `fetchedAt`. A capture that will not read is
    passed over: every other one still states what it states.
    """
    statements = []
    for path in sorted((archive or ARCHIVE).glob("*/*-market-watch.json.gz")):
        if not CAPTURE.match(path.name):
            continue
        try:
            wrapped = json.loads(gzip.decompress(path.read_bytes()))
        except (OSError, ValueError, EOFError):
            continue
        stated = wrapped.get("fetchedAt") if isinstance(wrapped, dict) else None
        if not isinstance(stated, str) or not stated:
            continue
        statements.extend((stated, isin, code) for isin, code in pairs(wrapped.get("payload")))
    return statements


def isin_codes(held, statements) -> dict[str, dict]:
    """ISIN → {code, stated}, from what is held and what has been stated since.

    The newest statement about an ISIN decides its code, and the newest about a
    code decides its ISIN; a pairing is kept only where the two agree. So a
    code the exchange moves to another ISIN, or an ISIN it gives another code,
    leaves one pairing behind and not two, and no code is ever claimed twice.
    Nothing is dropped for being old: a listing a capture leaves out keeps the
    code the exchange last gave it, exactly as `carry_currency` keeps its
    currency. Across the 30 captures with rows archived by 16 September 2026,
    226 ISINs and 226 codes paired one to one, and no statement contradicted
    another.
    """
    by_isin: dict[str, tuple[str, str]] = {}
    by_code: dict[str, tuple[str, str]] = {}

    def state(stated, isin, code) -> None:
        if not (isinstance(stated, str) and stated and isinstance(isin, str)
                and ISIN.match(isin) and isinstance(code, str) and TICKER.match(code)):
            return
        if (stated, code) > by_isin.get(isin, ("", "")):
            by_isin[isin] = (stated, code)
        if (stated, isin) > by_code.get(code, ("", "")):
            by_code[code] = (stated, isin)

    for isin, entry in (held.items() if isinstance(held, dict) else ()):
        if isinstance(entry, dict):
            state(entry.get("stated"), isin, entry.get("code"))
    for stated, isin, code in statements:
        state(stated, isin, code)
    return {isin: {"code": code, "stated": stated}
            for isin, (stated, code) in sorted(by_isin.items())
            if by_code[code][1] == isin}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fetch and report, write nothing")
    args = parser.parse_args()

    held = load()
    try:
        payload = beta.request(PATH)
        rows, written = extract(payload)
    except Exception as error:                                # noqa: BLE001
        kept = held.get("securities") or {}
        if not kept:
            print(f"! {error} — and nothing held to fall back on")
            return 0
        print(f"! {error} — holding {len(kept)} from {held.get('harvested')}")
        return 0
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    stated = [(stamp, isin, code) for isin, code in pairs(payload)]
    isins = isin_codes(held.get("isins"), archived() + stated)

    # Counted before the carry, so `count` keeps meaning what the capture
    # returned and a held currency cannot inflate it.
    captured = len(rows)
    carried = carry_currency(rows, held)

    document = {
        "harvested": datetime.date.today().isoformat(),
        "source": SOURCE,
        # The exchange stamps the rows itself, in Cairo time. Kept because a
        # trade count is a figure about a MOMENT, and one with no moment on it
        # is the thing §49 is about.
        "write_time": written,
        "count": captured,
        "securities": {k: rows[k] for k in sorted(rows)},
        # Which code the exchange gives each ISIN — see the module docstring.
        # The market scan names a row the vendor files under an ISIN by it.
        "isins": isins,
    }
    traded = sum(1 for v in rows.values() if v.get("trades"))
    classified = sum(1 for v in rows.values() if v.get("sector"))
    foreign = sum(1 for v in rows.values() if v.get("currency"))
    print(f"   {captured} securities carry a market value, {traded} a trade count,"
          f" {classified} the exchange's own sector, {foreign} a price not in pounds"
          f"{f' (written {written})' if written else ''}")
    if carried:
        print(f"   {len(carried)} not in this capture, currency held from an "
              f"earlier one: {', '.join(sorted(carried))}")
    today = {isin for _, isin, _ in stated}
    print(f"   {len(isins)} ISINs paired with the exchange's code, {len(today & set(isins))} "
          f"stated by this capture and {len(set(isins) - today)} by an earlier one")
    if args.check:
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(document, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"   wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
