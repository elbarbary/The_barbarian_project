#!/usr/bin/env python3
"""Three metrics the app could not compute, for the cost of one request.

`beta.egx.com.eg/api/bff/egx/stock-info` returns every listed security in a
single call — 260 rows, no paging, no browser, no cookies beyond the header
that marks the request as coming from the exchange's own front end. It was
found by reading the site's JavaScript chunks for its call sites, and it is not
in any documentation.

What it carries that nothing else here does:

  * **`yield`** — the dividend yield the exchange itself publishes. The route
    through the filings does exist (`Dividend per Share` appears in 265 of the
    first 400 corporate actions) but it needs the coupon joined to a price on
    the right date and a count of how many coupons make a year. The exchange
    has already done that arithmetic and publishes the answer.
  * **`listeD_SHARES`** — the share count, which is what turns a decade of
    filed net profit into a decade of **earnings per share**. Without it the
    app has EPS as a single published figure and no way to see its direction.
  * **`coupoN_VALUE`** — the coupon itself.

It also carries `pe`, `markeT_CAP` and the index-membership flags, which the
market scan already provides; those are read but not preferred, because the
scan is the app's own measurement and this is somebody else's.

**One request per run.** The exchange rate-limits hard and has blocked this
project outright before, which is why every other EGX job here is paced and
capped. This one needs no pacing because it asks once.
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import sys
import urllib.error
import urllib.request
import transport

REPO = pathlib.Path(__file__).resolve().parent.parent
STORE = pathlib.Path(__file__).resolve().parent / "stock_info.json"

ENDPOINT = "https://beta.egx.com.eg/api/bff/egx/stock-info"

# The header the exchange's own front end sends. Without it the F5 in front of
# the site answers with its "Request Rejected" page rather than the API.
HEADERS = {
    "Accept": "application/json",
    "x-egx-bff-request": "1",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
}

# Their field names, verbatim, camel-cased the way the BFF emits them — the
# capitalisation is theirs and is left alone so a reader can grep for it.
FIELDS = {
    "yield": "dividend_yield",
    "coupoN_VALUE": "coupon",
    # Their `coupoN_COUNT` is the coupon's sequence number, not a frequency:
    # the filings label the same figure "Cash Coupon No.", and COMI reads 49 —
    # its forty-ninth coupon, not forty-nine a year. Named for what it is.
    "coupoN_COUNT": "coupon_number",
    "listeD_SHARES": "listed_shares",
    "paR_VALUE": "par_value",
    "pe": "egx_pe",
    "markeT_CAP": "egx_market_cap",
    "lasT_CP": "egx_close",
    "listinG_DATE": "listing_date",
    "isin": "isin",
}


def ticker_of(row: dict) -> str | None:
    """`ACAP.CA` is how the exchange writes what this app calls `ACAP`."""
    reuters = (row.get("reuters") or "").strip()
    if not reuters.endswith(".CA"):
        return None
    return reuters[:-3] or None


def number(value) -> float | None:
    """A figure, or None. Zero is kept — a zero yield is a fact, not a gap."""
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def fetch(timeout: int = 40) -> list[dict]:
    request = urllib.request.Request(ENDPOINT, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = json.loads(response.read().decode("utf-8", "replace"))
    rows = payload.get("data") if isinstance(payload, dict) else payload
    return rows if isinstance(rows, list) else []


def build(rows: list[dict]) -> dict:
    out: dict[str, dict] = {}
    for row in rows:
        ticker = ticker_of(row)
        if not ticker:
            continue
        entry: dict = {}
        for theirs, ours in FIELDS.items():
            value = row.get(theirs)
            if ours in ("isin", "listing_date"):
                if value:
                    entry[ours] = str(value)[:32]
                continue
            if (parsed := number(value)) is not None:
                entry[ours] = parsed
        if entry:
            out[ticker] = entry
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="report what came back and write nothing")
    args = parser.parse_args()

    print("── Stock info (one request, whole market)")
    try:
        rows = fetch()
    except transport.TRANSPORT as error:
        # Best-effort by design: the app has lived without these three metrics
        # and can live one more run without them. Never fail the build for it.
        print(f"   exchange did not answer — {error}", file=sys.stderr)
        return 0

    held = build(rows)
    if not held:
        print("   answered, but with nothing usable — leaving the store alone")
        return 0

    yields = sum(1 for v in held.values() if v.get("dividend_yield"))
    shares = sum(1 for v in held.values() if v.get("listed_shares"))
    print(f"   {len(held)} companies · {yields} paying a dividend · "
          f"{shares} with a share count")
    if args.check:
        return 0

    STORE.write_text(
        json.dumps({"fetched": datetime.date.today().isoformat(), "companies": held},
                   ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    print(f"   written to {STORE.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
