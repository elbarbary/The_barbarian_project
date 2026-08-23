#!/usr/bin/env python3
"""Pull what the exchange's own JSON API will give us, and keep it.

`beta.egx.com.eg` is a Next.js rebuild of egx.com.eg with a BFF behind it. It
answers plain HTTP — no browser, no Scrapling, no Chromium — once one header is
set:

    Accept: application/json
    x-egx-bff-request: 1

Without it the F5 in front answers 404 or a "Request Rejected" page, which is
presumably why nobody found it. `docs/open-issues.md` §1b has the full write-up
of what it serves and why it is not yet the app's spine.

**This script is a harvester, not a builder.** It writes raw payloads into
`data-source/egx-beta/` and nothing under `public/`. Nothing the app ships
depends on it. That is deliberate: the API is beta, it is the same host that
blocked this project once, and the honest order is to collect, compare against
what the pipeline already produces, and only then migrate.

Two collections:

  * **Index history.** `index-data?interval=N` returns the last N *sessions* of
    a named index with open, high, low and close — not the five-minute intraday
    series `interval=1` gives. Asking for 6,000 returns everything there is:
    3,961 sessions of EGX 30 back to 21 March 2010. The app currently
    accumulates one close a session by hand because "no historical index feed
    is reachable", and has 204 of them.

  * **Disclosures.** `news-search` takes `dateFrom`/`dateTo` and will answer for
    any window since 2005 — 191,484 filings, against the 125 the pipeline has
    ever managed to see through the old site's single-page news list. Pulled a
    month at a time, gzipped, and skipped if already complete, so a run can be
    stopped and resumed.

**Requests are serialised and paced.** This host blocked this project at
roughly forty requests in a day once already. One request at a time, a real
pause between them, and a hard stop the moment the WAF says no — a harvester
that retries into a block is how the block becomes permanent.
"""

from __future__ import annotations

import argparse
import datetime
import gzip
import json
import pathlib
import sys
import time
import urllib.error
import urllib.request

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "data-source" / "egx-beta"

BASE = "https://beta.egx.com.eg"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
)

# Every category the feed has been seen to carry, not the three groups the
# site's own tabs offer. Those cover secIds 3–8, 10–13 and 16; asking for the
# whole range also returns 2 (Media Releases) and 9 (EGX News), and costs
# nothing.
SEC_IDS = list(range(1, 31))

# The exchange's own index keys. The first four run to 2010; EGX35-LV and
# Shariah start in 2022 and Tamayuz at the end of 2018, which is when they were
# launched rather than a gap in the feed.
INDICES = [
    "CASE30",
    "EGX70_EWI",
    "EGX100_EWI",
    "EGX30_CAP",
    "EGX30_TR",
    "EGX35LV",
    "EGX_SHARIAH",
    "TAMAYUZ",
]

# Everything the API has. Sessions, not days: 6,000 trading sessions is about
# twenty-four years and the oldest row is 2010.
ALL_SESSIONS = 6000

# The page cap the service enforces. Asking for 500 returns 200.
PAGE_SIZE = 200

# The first year that answers at all. 1995–2004 returns zero.
FIRST_YEAR = 2005


class Rejected(RuntimeError):
    """The WAF turned us away. Stop the run; do not retry into a block."""


def request(path: str, body: dict | None = None, *, timeout: int = 150,
            attempts: int = 3) -> dict:
    """One call, with a retry for the transport and none for a refusal.

    A page of 200 filings carrying both languages of every body is a few
    hundred kilobytes, and this service takes its time producing one — a
    sixty-second read timeout dropped a month mid-harvest. A timeout is the
    connection failing, not the exchange saying no, so it is worth one more
    try after a longer wait. [Rejected] is never retried.
    """
    last: Exception | None = None
    for attempt in range(attempts):
        try:
            return _once(path, body, timeout=timeout)
        except Rejected:
            raise
        except (TimeoutError, urllib.error.URLError, OSError) as error:
            last = error
            print(f"   … {type(error).__name__}, retrying in {8 * (attempt + 1)}s")
            pause(8 * (attempt + 1))
    raise RuntimeError(f"gave up after {attempts} attempts: {last}")


def _once(path: str, body: dict | None, *, timeout: int) -> dict:
    headers = {
        "user-agent": UA,
        "accept": "application/json",
        "accept-language": "en-US,en;q=0.9",
        "x-egx-bff-request": "1",
        "referer": f"{BASE}/en",
    }
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["content-type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read()
    except urllib.error.HTTPError as error:
        raw = error.read()
    # The F5 answers 200 with an HTML page rather than an error status, so the
    # status code cannot be the test.
    if raw[:6] == b"<html":
        raise Rejected(raw[:200].decode("utf-8", "ignore"))
    return json.loads(raw)


def pause(seconds: float = 2.0) -> None:
    time.sleep(seconds)


# --------------------------------------------------------------- index history


def harvest_indices(*, force: bool = False) -> int:
    out = OUT / "indices"
    out.mkdir(parents=True, exist_ok=True)
    written = 0

    for name in INDICES:
        path = out / f"{name}.json"
        if path.exists() and not force:
            print(f"   {name}: held")
            continue
        payload = request(f"/api/bff/egx/index-data?interval={ALL_SESSIONS}&indexName={name}")
        rows = (payload.get("data") or {}).get("intervalIndex") or []
        if not rows:
            print(f"   {name}: nothing returned — skipped")
            pause()
            continue
        # Oldest first, which is how every series in this repo is stored and the
        # opposite of how the API returns it.
        rows = list(reversed(rows))
        path.write_text(
            json.dumps(
                {
                    "index": name,
                    "source": "beta.egx.com.eg /api/bff/egx/index-data",
                    "harvested": datetime.date.today().isoformat(),
                    "sessions": rows,
                },
                ensure_ascii=False,
                indent=1,
            ),
            encoding="utf-8",
        )
        written += 1
        print(f"   {name}: {len(rows)} sessions, {rows[0]['indexDay'][:10]} → {rows[-1]['indexDay'][:10]}")
        pause()
    return written


# ----------------------------------------------------------------- snapshots

# The endpoints that answer with one small document rather than a series. Kept
# as reference: this is what the exchange itself says a company row, a board
# total and a metal price look like, which is what any migration has to be
# diffed against. `gold` alone (without `-market-watch`) is refused by the WAF
# and is not a real endpoint.
SNAPSHOTS = [
    ("market-watch", "/api/bff/egx/market-watch?Page=1&PageSize=500"),
    ("market-summaries", "/api/bff/egx/market-summaries"),
    ("market-status", "/api/bff/egx/market-status"),
    ("gold-market-watch", "/api/bff/egx/gold-market-watch"),
    ("silver-market-watch", "/api/bff/egx/silver-market-watch"),
    ("index-intraday-CASE30", "/api/bff/egx/index-data?interval=1&indexName=CASE30"),
]


def harvest_snapshots() -> int:
    out = OUT / "snapshots"
    out.mkdir(parents=True, exist_ok=True)
    for name, path in SNAPSHOTS:
        payload = request(path)
        (out / f"{name}.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8"
        )
        data = payload.get("data")
        if isinstance(data, dict) and isinstance(data.get("data"), list):
            size = len(data["data"])
        elif isinstance(data, list):
            size = len(data)
        else:
            size = 1
        print(f"   {name}: {size} row(s)")
        pause()
    return len(SNAPSHOTS)


# `financial-statements-filter` is a POST and pages, so it is its own call. The
# same results announcements appear in the filings harvest under secId 6; this
# is here because the endpoint separates net profit and the comparative
# period's net profit into fields, and the filings feed leaves them in the body.
def harvest_statements(pages: int = 3) -> int:
    out = OUT / "snapshots"
    out.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []
    for page in range(1, pages + 1):
        payload = request(
            "/api/bff/egx/financial-statements-filter",
            {"interval": 50, "pageNumber": page, "pageSize": PAGE_SIZE},
        )
        rows.extend(payload.get("data") or [])
        if page >= (payload.get("totalPages") or 1):
            break
        pause()
    (out / "financial-statements-filter.json").write_text(
        json.dumps({"source": "beta.egx.com.eg /api/bff/egx/financial-statements-filter",
                    "harvested": datetime.date.today().isoformat(),
                    "items": rows}, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    print(f"   financial-statements-filter: {len(rows)} announcements")
    return len(rows)


# ------------------------------------------------------------------- filings


def month_bounds(year: int, month: int) -> tuple[str, str]:
    first = datetime.date(year, month, 1)
    last = (datetime.date(year + (month == 12), month % 12 + 1, 1)
            - datetime.timedelta(days=1))
    return first.isoformat(), last.isoformat()


def search(date_from: str, date_to: str, page: int) -> dict:
    return request(
        "/api/bff/egx/news-search",
        {
            "marketSessionNews": False,
            "secIds": SEC_IDS,
            "interval": 50,
            "pageNumber": page,
            "pageSize": PAGE_SIZE,
            "count": 50,
            "dateFrom": date_from,
            "dateTo": date_to,
        },
    )


def harvest_month(year: int, month: int, *, force: bool = False) -> int | None:
    """One month of filings, or None when it was already complete."""
    out = OUT / "filings"
    out.mkdir(parents=True, exist_ok=True)
    path = out / f"{year:04d}-{month:02d}.json.gz"

    date_from, date_to = month_bounds(year, month)
    first = search(date_from, date_to, 1)
    expected = first.get("totalCount") or 0

    if path.exists() and not force:
        held = json.loads(gzip.decompress(path.read_bytes()))
        if len(held.get("items", [])) >= expected:
            print(f"   {year}-{month:02d}: held {len(held['items'])}/{expected}")
            return None

    items = list(first.get("data") or [])
    pages = first.get("totalPages") or 1
    for page in range(2, pages + 1):
        pause()
        payload = search(date_from, date_to, page)
        items.extend(payload.get("data") or [])

    # The service pages by a moving window over a live table, so a filing
    # published mid-harvest can appear twice. Keyed by the exchange's own code,
    # which is the id the rest of this repo already uses.
    unique = {}
    for item in items:
        unique.setdefault(item.get("code"), item)
    rows = sorted(unique.values(), key=lambda r: (r.get("dateStamp") or ""))

    path.write_bytes(
        gzip.compress(
            json.dumps(
                {
                    "month": f"{year:04d}-{month:02d}",
                    "source": "beta.egx.com.eg /api/bff/egx/news-search",
                    "harvested": datetime.date.today().isoformat(),
                    "expected": expected,
                    "items": rows,
                },
                ensure_ascii=False,
            ).encode(),
            mtime=0,
        )
    )
    print(f"   {year}-{month:02d}: {len(rows)} filings ({pages} pages, expected {expected})")
    return len(rows)


def months_between(start: str, end: str) -> list[tuple[int, int]]:
    y1, m1 = (int(part) for part in start.split("-"))
    y2, m2 = (int(part) for part in end.split("-"))
    out = []
    while (y1, m1) <= (y2, m2):
        out.append((y1, m1))
        m1 += 1
        if m1 == 13:
            y1, m1 = y1 + 1, 1
    return out


def main() -> int:
    today = datetime.date.today()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--indices", action="store_true", help="pull every index history")
    parser.add_argument("--filings", action="store_true", help="pull disclosures month by month")
    parser.add_argument("--snapshots", action="store_true",
                        help="pull the one-document endpoints and the statements feed")
    parser.add_argument("--from", dest="start", default=f"{today.year}-01",
                        help="first month, YYYY-MM (default: January this year)")
    parser.add_argument("--to", dest="end", default=today.strftime("%Y-%m"),
                        help="last month, YYYY-MM (default: this month)")
    parser.add_argument("--force", action="store_true", help="re-fetch months already held")
    parser.add_argument("--budget", type=int, default=0,
                        help="stop after roughly this many months (0 = no limit)")
    args = parser.parse_args()

    if not (args.indices or args.filings or args.snapshots):
        parser.error("nothing to do: pass --indices, --filings or --snapshots")

    try:
        if args.indices:
            print("── Index history")
            harvest_indices(force=args.force)
        if args.snapshots:
            print("── Snapshots")
            harvest_snapshots()
            harvest_statements()
        if args.filings:
            print(f"── Disclosures {args.start} → {args.end}")
            done = 0
            for year, month in months_between(args.start, args.end):
                if year < FIRST_YEAR:
                    continue
                pause()
                if harvest_month(year, month, force=args.force) is not None:
                    done += 1
                if args.budget and done >= args.budget:
                    print(f"   stopping at the {args.budget}-month budget")
                    break
    except Rejected as error:
        # Not a failure to retry. The whole point of pacing is that a refusal
        # means stop.
        print(f"!! the exchange refused the request — stopping: {error}", file=sys.stderr)
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
