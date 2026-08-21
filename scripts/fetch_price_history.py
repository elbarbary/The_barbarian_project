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
MIN_OVERLAP = 1
TOLERANCE = 0.02
MIN_AGREEMENT = 0.8

# Identity is judged on the most recent sessions, not the whole overlap.
#
# Our stored closes are **split- and dividend-adjusted**; Mubasher publishes the
# raw print. After a corporate action the two agree, and before it they differ
# by the adjustment factor — Assiut Islamic Trading sits at 0.257 on ours
# against 0.310 on theirs in May and matches exactly by August. Judged over the
# whole overlap that reads as a different company; judged over the seam, where
# both are on today's basis, it reads as what it is.
SEAM_SESSIONS = 20

# How far the ratio may wander across the seam before the two are called
# different companies, and how far from 1 the ratio itself may sit. The spread
# is the real test; the factor bound only rules out a series at a completely
# different price level that happens to be quiet.
RATIO_SPREAD = 0.04
MAX_FACTOR = 4.0


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


# Mubasher answers a page it is perfectly willing to serve with a **404** when
# it has seen too much of us, and the same URL loads a minute later. Left
# unretried that cost 27 companies on the first pass, all of them real.
PAGE_ATTEMPTS = 3
BACKOFF = 20


def pace(seconds: int) -> None:
    """Set the gap between requests for this run.

    Their robots.txt asks for five seconds and five is enough for a short one.
    A run long enough to walk the whole market trips something slower, and what
    it returns is not a 429 but a **404** on a page that loads perfectly a
    minute later — which is why the first pass lost 27 real companies.
    """
    global CRAWL_DELAY
    CRAWL_DELAY = seconds


def csv_url_for(ticker: str) -> str:
    last = ""
    for attempt in range(PAGE_ATTEMPTS):
        try:
            page = _get(STOCK_PAGE.format(ticker))
        except PriceHistoryUnavailable as error:
            last = str(error)
            # Only a 404 is worth waiting out; a 403 or a timeout will not
            # improve by asking again the same way.
            if "404" not in last or attempt == PAGE_ATTEMPTS - 1:
                raise
            time.sleep(BACKOFF * (attempt + 1))
            continue
        found = CSV_URL.search(page)
        if found:
            return found.group(1)
        raise PriceHistoryUnavailable("page carries no historical-data-url")
    raise PriceHistoryUnavailable(last or "page could not be fetched")


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


MARKET = REPO / "public" / "data" / "v1" / "market.json"


def stored_closes(ticker: str) -> dict[str, float]:
    """Every close we already hold for this company, to check a fetch against.

    Two places, because 23 listings have no `price_history` at all and were
    being refused for having nothing to compare — while the market snapshot
    held a close for all 282 of them the whole time. One dated close is a
    weaker anchor than sixty, and it is enough to catch a series belonging to
    somebody else.
    """
    closes: dict[str, float] = {}
    try:
        snapshot = json.loads(MARKET.read_text(encoding="utf-8"))
        day = snapshot.get("date")
        row = (snapshot.get("stocks") or {}).get(ticker) or {}
        if day and row.get("close") is not None:
            closes[day] = float(row["close"])
    except (OSError, json.JSONDecodeError, TypeError, ValueError):
        pass

    path = COMPANIES / f"{ticker}.json"
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return closes
    for row in doc.get("price_history") or []:
        if row.get("date") and row.get("close") is not None:
            closes[row["date"]] = float(row["close"])
    return closes


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
    # Identity is **co-movement**, not agreement.
    #
    # Asking whether the closes match rejected a pile of real companies. Golden
    # Pyramids sits at a rock-steady 1.053 of ours on every single session it
    # shares — one price stale where the other is not, on a share that barely
    # trades — and Juhayna matches to the millieme but was thrown out for older
    # sessions that predate a corporate action. Neither is a different company.
    #
    # Two different companies do not hold a constant ratio, because they do not
    # move together. So the test is whether the ratio *stays put*: a tight
    # spread means one instrument on two bases, which `align` then reconciles.
    # A scattered one means two instruments, and no scaling can fix that.
    seam = shared[-SEAM_SESSIONS:]
    ratios = [theirs[d] / ours[d] for d in seam if ours[d]]
    if len(ratios) < MIN_OVERLAP:
        raise PriceHistoryUnavailable("too few usable closes to confirm identity")
    if len(ratios) == 1:
        # A single dated close cannot show co-movement, so it is held to
        # matching outright rather than to holding a steady ratio.
        only = ratios[0]
        if abs(only - 1.0) > TOLERANCE:
            raise PriceHistoryUnavailable(
                f"the one close we hold differs by {abs(only - 1) * 100:.1f}% "
                f"— cannot confirm this is the same company"
            )
        return
    ratios.sort()
    middle = ratios[len(ratios) // 2]
    if middle <= 0:
        raise PriceHistoryUnavailable("non-positive prices; cannot compare")
    spread = max(abs(r / middle - 1.0) for r in ratios)
    if spread > RATIO_SPREAD:
        raise PriceHistoryUnavailable(
            f"the ratio to our closes swings {spread:.0%} across the last "
            f"{len(ratios)} sessions — these two do not move together, so this "
            f"is a different company's series"
        )
    # A ratio far from 1 is a different price level, not a different basis: a
    # corporate action moves a price by a factor, not by two orders of it.
    if not (1 / MAX_FACTOR) <= middle <= MAX_FACTOR:
        raise PriceHistoryUnavailable(
            f"their closes run {middle:.2f}x ours — that is a different "
            f"instrument, not an adjustment"
        )


def align(bars: list[dict], ours: dict[str, float]) -> list[dict]:
    """Put a raw series onto the same basis as the closes we already publish.

    Mubasher prints what traded; our stored closes are adjusted for splits and
    dividends. Joining the two unchanged puts a step in the chart on the day of
    every corporate action — a price that never happened, at the exact moment a
    reader is most likely to be looking.

    So the ratio between the two is measured on every session they share and
    carried backwards: a bar older than the whole overlap takes the oldest
    factor we could observe. Actions **before** the overlap stay unadjusted,
    because nothing here can see them; that is a real limit and it is the same
    limit any unadjusted series has.

    The common case is a factor of exactly 1.0 all the way, and then this
    returns the bars untouched.
    """
    if not ours:
        return bars
    factors: dict[str, float] = {}
    for bar in bars:
        mine = ours.get(bar["date"])
        if mine and bar["close"]:
            factors[bar["date"]] = mine / bar["close"]
    if not factors:
        return bars

    days = sorted(factors)
    oldest = factors[days[0]]
    out: list[dict] = []
    for bar in bars:
        day = bar["date"]
        if day in factors:
            factor = factors[day]
        else:
            # The newest factor at or before this bar, or the oldest one we
            # have when the bar predates the overlap entirely.
            earlier = [d for d in days if d <= day]
            factor = factors[earlier[-1]] if earlier else oldest
        # A factor that is not near 1 or a clean corporate-action ratio is
        # noise between two feeds, not an adjustment. Leave those alone.
        adjusted = bar["close"] * factor if abs(factor - 1.0) > 0.03 else bar["close"]
        out.append({**bar, "close": round(adjusted, 4)})
    return out


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
    bars = align(bars, stored_closes(ticker))
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
    parser.add_argument(
        "--delay",
        type=int,
        default=0,
        help="seconds between requests; their robots.txt asks for 5, but a run "
             "long enough to cover the market trips a slower limit that answers "
             "a perfectly good page with a 404",
    )
    args = parser.parse_args()
    pace(max(CRAWL_DELAY, args.delay))

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
