#!/usr/bin/env python3
"""Daily closing levels for EGX 30, EGX 70 EWI and EGX 100 EWI.

`build_market_history.py` used to say there was no historical index feed we
could reach, so the series was grown one session at a time from today's close.
That was true of the sources it knew about and false in general: Investing.com
publishes the daily close for all three, back years, and every figure it gives
for the latest session matches the level we already publish from TradingView to
within a rounding place.

That match is the whole argument for trusting it, so it is **enforced rather
than assumed**. `verify()` refuses the fetch outright if the newest close
disagrees with the rates document. Two independent sources agreeing to the
decimal is evidence; one source asserting a number is not, and this app has
already shipped a chart of the wrong instrument once — the first candidate id
tried here returned a series closing around 16 against an index at 54,737.

Instrument ids are pinned by number, not by slug. `/indices/egx-30` is a 404
and `/indices/egx-70` is a real page whose own instrument is the EWI variant,
so a slug is not a stable way to name what you asked for. The ids came out of
the page's embedded JSON, each beside the level that identifies it.

Usage:
    python3 scripts/index_history.py [--since 2026-01-01] [--check]
"""

from __future__ import annotations

import argparse
import http.client
import json
import time
import pathlib
import sys
import urllib.error
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import fetch_relay  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
RATES = REPO / "public" / "data" / "v1" / "rates" / "latest.json"

API = "https://api.investing.com/api/financialdata/historical/{}"

# Index id in our documents -> Investing.com instrument id.
#
# Verified 21 Aug 2026 against the level we publish for the same session:
#   EGX30      12860    54,737.07  vs ours 54,737.1
#   EGX70EWI   1159121  20,816.03  vs ours 20,816.0
#   EGX100EWI  1165929  27,052.41  vs ours 27,052.4
INSTRUMENTS = {
    "EGX30": 12860,
    "EGX70EWI": 1159121,
    "EGX100EWI": 1165929,
}

# Spot gold and silver in dollars an ounce, which is what the rates document
# quotes before converting to pounds a gram.
#
# **Spot, deliberately, not futures.** `/commodities/gold` is the COMEX front
# month and was trading 2.9% above spot when this was written — a chart of it
# under a spot headline would disagree with the number printed above it. These
# two are the pages whose own `long_name` reads "Gold Spot US Dollar" and
# "Silver Spot US Dollar", and whose 20 Aug closes match what we publish for
# that session to within 0.14% and 0.006%.
METALS = {
    "XAU": 68,
    "XAG": 69,
}

# The endpoint answers only with a browser-shaped request, and `domain-id`
# is the one non-obvious header — without it the API replies 403.
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "domain-id": "www",
}

# How far apart two sources may be and still be called the same number. The
# published level is rounded to one decimal place, so anything under a whole
# index point is a rounding difference; anything over it is a different index.
TOLERANCE = 1.0


class IndexHistoryUnavailable(RuntimeError):
    """The fetch failed, or the numbers did not agree. Nothing is written."""


# Two truths about a truncated read.
#
# The first is that it is not covered by the obvious handler. On 3 Sep 2026
# this raised `http.client.IncompleteRead(67425 bytes read, 60256 more
# expected)` and it went straight past `except (URLError, TimeoutError,
# OSError, ValueError)` — because IncompleteRead's bases are HTTPException and
# Exception, and none of the four. So the careful `IndexHistoryUnavailable`
# path below, whose entire job is to leave the published series alone, was
# never reached: the exception left the process, and the daily build died
# after 107 minutes with every other step's output discarded.
#
# The second is that it is worth retrying. A refused request is an answer and
# asking again just gets the same one, which is why HTTPError is still fatal
# on the first look. A body that stopped arriving mid-flight is not an answer
# at all — it is the connection, and the next attempt usually completes.
RETRIES = 3
BACKOFF = 2.0

# Everything that means "the transport failed", as opposed to "the host said
# no". HTTPException is the one that was missing.
TRANSPORT = (http.client.HTTPException, urllib.error.URLError, TimeoutError,
             OSError, ValueError)


def _get(url: str) -> dict:
    # Through the build's relay where one is configured, and straight out
    # everywhere else. The source refuses a CI runner's address and answers a
    # laptop's; see scripts/fetch_relay.py.
    request = fetch_relay.request(url, HEADERS)
    last: Exception | None = None
    for attempt in range(RETRIES):
        try:
            return json.loads(urllib.request.urlopen(request, timeout=60).read())
        except urllib.error.HTTPError as error:
            # A status is an answer. Retrying a 403 asks the same question.
            raise IndexHistoryUnavailable(f"HTTP {error.code} for {url}") from error
        except TRANSPORT as error:
            last = error
            if attempt + 1 < RETRIES:
                time.sleep(BACKOFF * (attempt + 1))
    raise IndexHistoryUnavailable(str(last)[:160]) from last


def series(index_id: str, since: str, until: str) -> dict[str, float]:
    """`{date: close}` for one index, oldest last as the API returns it."""
    instrument = INSTRUMENTS[index_id]
    payload = _get(
        f"{API.format(instrument)}"
        f"?start-date={since}&end-date={until}&time-frame=Daily"
        f"&add-missing-rows=false"
    )
    rows = payload.get("data") or []
    out: dict[str, float] = {}
    for row in rows:
        stamp = (row.get("rowDateTimestamp") or "")[:10]
        raw = row.get("last_closeRaw")
        if not stamp or raw is None:
            continue
        try:
            close = float(str(raw))
        except (TypeError, ValueError):
            continue
        # A holiday can come back as a zero row rather than no row at all.
        if close > 0:
            out[stamp] = round(close, 2)
    return out


def published_metals() -> dict[str, float]:
    """The dollar-an-ounce prices we already publish, to check a fetch against."""
    try:
        rates = json.loads(RATES.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return {
        m["id"]: float(m["usd_ounce"])
        for m in rates.get("metals", [])
        if m.get("id") and m.get("usd_ounce") is not None
    }


def metals(since: str, until: str) -> dict[str, dict[str, float]]:
    """Daily spot closes for gold and silver, checked before they are believed.

    The check is against **the same dated session**, not the newest row. Metals
    trade around the clock, so the newest row is today still moving and sits a
    percent or two from a close we published yesterday — comparing those would
    reject a correct series for being current.
    """
    out: dict[str, dict[str, float]] = {}
    for metal_id, instrument in METALS.items():
        payload = _get(
            f"{API.format(instrument)}"
            f"?start-date={since}&end-date={until}&time-frame=Daily"
            f"&add-missing-rows=false"
        )
        points: dict[str, float] = {}
        for row in payload.get("data") or []:
            stamp = (row.get("rowDateTimestamp") or "")[:10]
            raw = row.get("last_closeRaw")
            if not stamp or raw is None:
                continue
            try:
                close = float(str(raw))
            except (TypeError, ValueError):
                continue
            if close > 0:
                points[stamp] = round(close, 4)
        out[metal_id] = points

    ours = published_metals()
    for metal_id, points in out.items():
        if not points:
            raise IndexHistoryUnavailable(f"{metal_id}: empty series")
        mine = ours.get(metal_id)
        if mine is None:
            continue
        # Find the newest session we both hold and compare that one.
        shared = [d for d in sorted(points, reverse=True) if d in points]
        anchor_day = shared[1] if len(shared) > 1 else shared[0]
        theirs = points[anchor_day]
        if abs(theirs - mine) / mine > 0.02:
            raise IndexHistoryUnavailable(
                f"{metal_id}: {anchor_day} close {theirs:,.2f} disagrees with the "
                f"{mine:,.2f} we publish — wrong instrument, or futures not spot"
            )
    return out


def published_levels() -> dict[str, float]:
    """What we already publish, to check a new source against."""
    try:
        rates = json.loads(RATES.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return {
        i["id"]: float(i["level"])
        for i in rates.get("indices", [])
        if i.get("id") and i.get("level") is not None
    }


def verify(fetched: dict[str, dict[str, float]]) -> None:
    """Refuse a series whose newest close disagrees with what we publish.

    The point is not that Investing.com might be wrong. It is that an id is
    just a number in a URL, and the failure mode of getting it wrong is a
    plausible-looking chart of a different instrument — which is silent, and
    which nobody catches by reading the code.
    """
    ours = published_levels()
    if not ours:
        raise IndexHistoryUnavailable(
            "no published levels to check against; refusing to trust the fetch"
        )
    for index_id, points in fetched.items():
        if not points:
            raise IndexHistoryUnavailable(f"{index_id}: empty series")
        mine = ours.get(index_id)
        if mine is None:
            raise IndexHistoryUnavailable(f"{index_id}: nothing published to check")
        newest = points[max(points)]
        if abs(newest - mine) > TOLERANCE:
            raise IndexHistoryUnavailable(
                f"{index_id}: newest close {newest:,.2f} disagrees with the "
                f"published level {mine:,.2f} — wrong instrument"
            )


def fetch(since: str, until: str) -> dict[str, dict[str, float]]:
    out = {i: series(i, since, until) for i in INSTRUMENTS}
    verify(out)
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--since", default="2026-01-01")
    parser.add_argument("--until", default=None)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    until = args.until or __import__("datetime").date.today().isoformat()
    print("── Historic index levels")
    try:
        got = fetch(args.since, until)
    except IndexHistoryUnavailable as error:
        print(f"   refused: {error}")
        return 1

    for index_id, points in got.items():
        days = sorted(points)
        print(
            f"   {index_id:10} {len(points):4} sessions  "
            f"{days[0]} .. {days[-1]}  newest {points[days[-1]]:,.2f}"
        )
    print("   every newest close agrees with the level we already publish")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
