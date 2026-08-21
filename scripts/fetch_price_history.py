#!/usr/bin/env python3
"""Deep daily price history for every EGX listing, from Mubasher.

The Price tab offers `1M 3M 1Y 5Y MAX` (spec §13) and could fill 1Y for sixteen
companies and 5Y for none: sixteen had been fetched from Yahoo before it started
refusing, and everything else held the fifty to a hundred sessions the daily
snapshot had accumulated. So five buttons drew the same line on 94% of the
market.

Mubasher publishes the whole series as a plain CSV. Each stock page carries a
`historical-data-url` pointing at a static file keyed by an opaque hash, and
that file is **twenty years deep** — El Sewedy runs to 4,859 sessions beginning
in May 2006. Its columns are `date, open, high, low, close, volume`, which is
exactly the raw shape §15 already specifies.

Two requests per company, five seconds apart, which is the `Crawl-delay` their
robots.txt publishes. About fifty minutes for the market, once — §22 says
download history on the first run and only missing sessions after it, so this
is resumable and skips anything already collected unless asked otherwise.

**Every series is checked against prices we already hold.** The column order was
established by matching 233 overlapping sessions of El Sewedy against our own
closes, not by reading the header — there is no header. A file whose overlapping
closes disagree is a different company's file, and is dropped rather than
merged: this app has already published one chart of the wrong instrument.

Nothing existing is overwritten. Where a stored session and a fetched one cover
the same day, ours stands; Mubasher's dates disagree with our source by a
session at the very edge of the series, and the fix for that is to extend
backwards rather than to argue about yesterday.

Usage:
    python3 scripts/fetch_price_history.py [--limit N] [--refresh] [--only SWDY]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from mubasher_statements import BROWSER_UA, CRAWL_DELAY  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
STAGE = REPO / "data-source" / "prices"
COMPANIES = REPO / "public" / "data" / "v1" / "companies"
DIRECTORY = REPO / "public" / "data" / "v1" / "companies.json"

STOCK_PAGE = "https://www.mubasher.info/markets/EGX/stocks/{}"

# `<div ... historical-data-url="https://static.mubasher.info/...csv">`
CSV_URL = re.compile(r'historical-data-url="([^"]+\.csv)"')

# How much of an overlap has to agree before a series is believed, and by how
# much a close may differ.
#
# The tolerance is **one percent**, which sounds loose for two feeds of the same
# exchange and is not. Measured across the market, two honest sources of the
# same closes disagree by three or four tenths of a percent on a handful of
# sessions — Al Arafa's 1 June is 7.32 on ours and 7.35 on theirs — because
# they round differently and occasionally take a different last print. A tenth
# of a percent rejected 121 companies for that, nearly all of them at 81-89%
# agreement, while the errors this exists to catch sit at 12% and 53%. The
# check is for identity, not accuracy, and a wrong company is wrong by whole
# multiples rather than by a rounding place.
MIN_OVERLAP = 5
TOLERANCE = 0.01
MIN_AGREEMENT = 0.9


class PriceHistoryUnavailable(RuntimeError):
    """No series, or one that does not belong to this company."""


def _get(url: str, timeout: int = 45) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": BROWSER_UA,
            "Accept": "text/html,application/xhtml+xml,text/csv,*/*",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        raise PriceHistoryUnavailable(f"HTTP {error.code}") from error
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        raise PriceHistoryUnavailable(str(error)[:120]) from error


def csv_url_for(ticker: str) -> str:
    page = _get(STOCK_PAGE.format(ticker))
    found = CSV_URL.search(page)
    if not found:
        raise PriceHistoryUnavailable("page carries no historical-data-url")
    return found.group(1)


def parse_csv(body: str) -> list[dict]:
    """`date,open,high,low,close,volume`, headerless.

    There is no header line, so the column order is not self-describing and was
    settled by comparison against prices we already hold — see `verify`.
    """
    bars: list[dict] = []
    for line in body.splitlines():
        parts = line.split(",")
        if len(parts) < 6:
            continue
        day = parts[0].split("/")[0].strip()
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
            continue
        try:
            close = float(parts[4])
            volume = int(float(parts[5]))
        except (TypeError, ValueError):
            continue
        # A suspended session is published as a zero row rather than omitted.
        if close > 0:
            bars.append({"date": day, "close": round(close, 4), "volume": volume})
    bars.sort(key=lambda b: b["date"])
    return bars


def stored_closes(ticker: str) -> dict[str, float]:
    path = COMPANIES / f"{ticker}.json"
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return {
        row["date"]: float(row["close"])
        for row in doc.get("price_history") or []
        if row.get("date") and row.get("close") is not None
    }


def verify(ticker: str, bars: list[dict]) -> None:
    """Refuse a series that does not match the prices we already publish.

    An opaque hash in a URL is not a name. If the wrong file is fetched the
    result is a complete, plausible, well-formed chart of somebody else's
    company, which no amount of reading the code will catch.
    """
    if not bars:
        raise PriceHistoryUnavailable("empty series")
    ours = stored_closes(ticker)
    if not ours:
        # Nothing to check against. 23 listings have no stored history at all,
        # and taking an unverifiable series for them is how a wrong one gets in.
        raise PriceHistoryUnavailable("nothing stored to check the series against")

    theirs = {b["date"]: b["close"] for b in bars}
    shared = sorted(set(ours) & set(theirs))
    if len(shared) < MIN_OVERLAP:
        raise PriceHistoryUnavailable(
            f"only {len(shared)} overlapping sessions; cannot confirm identity"
        )
    agreed = sum(
        1 for d in shared
        if abs(theirs[d] - ours[d]) <= max(0.01, abs(ours[d]) * TOLERANCE)
    )
    ratio = agreed / len(shared)
    if ratio < MIN_AGREEMENT:
        raise PriceHistoryUnavailable(
            f"only {agreed}/{len(shared)} overlapping closes agree "
            f"({ratio:.0%}) — this is a different company's series"
        )


def tickers() -> list[str]:
    doc = json.loads(DIRECTORY.read_text(encoding="utf-8"))
    rows = doc if isinstance(doc, list) else doc.get("companies") or doc.get("items") or []
    return sorted({r["ticker"] for r in rows if r.get("ticker")})


def already_deep(ticker: str) -> bool:
    """True when this company has already been collected from Mubasher."""
    path = STAGE / f"{ticker}.json"
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    return doc.get("source") == "mubasher" and len(doc.get("bars") or []) > 0


def collect(ticker: str) -> int:
    url = csv_url_for(ticker)
    time.sleep(CRAWL_DELAY)
    bars = parse_csv(_get(url, timeout=90))
    verify(ticker, bars)
    STAGE.mkdir(parents=True, exist_ok=True)
    (STAGE / f"{ticker}.json").write_text(
        json.dumps(
            {"ticker": ticker, "source": "mubasher", "bars": bars},
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    return len(bars)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="stop after N companies")
    parser.add_argument("--refresh", action="store_true", help="refetch what is held")
    parser.add_argument("--only", default=None, help="one ticker, for checking")
    args = parser.parse_args()

    wanted = [args.only] if args.only else tickers()
    if not args.refresh:
        wanted = [t for t in wanted if not already_deep(t)]
    if args.limit:
        wanted = wanted[: args.limit]

    print("── Deep price history from Mubasher")
    print(f"   {len(wanted)} companies to collect, {CRAWL_DELAY}s apart "
          f"(~{max(1, len(wanted) * CRAWL_DELAY * 2 // 60)} min)")

    done = failed = 0
    reasons: dict[str, str] = {}
    for i, ticker in enumerate(wanted):
        if i:
            time.sleep(CRAWL_DELAY)
        try:
            rows = collect(ticker)
            done += 1
            print(f"   {ticker:8} {rows:5} sessions")
        except PriceHistoryUnavailable as error:
            failed += 1
            reasons[ticker] = str(error)
            print(f"   {ticker:8} skipped — {error}")

    print(f"\n{done} collected, {failed} skipped")
    if reasons:
        print("skipped:")
        for ticker, why in list(reasons.items())[:20]:
            print(f"   {ticker:8} {why}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
