#!/usr/bin/env python3
"""Build the market API from the EGX daily scan.

Source is the research pipeline's own scanner output —
`../work/daily_scan_<date>.json` — which already carries, for the whole
exchange: ticker, legal company name, sector, the latest OHLCV, and up to 120
split-adjusted daily bars per company.

That makes every number the app shows a real one. Nothing here invents a price,
a name or a series; when a field is absent from the scan it stays absent in the
output and the app renders "—" (spec §49).

Usage:
    python3 scripts/build_market_api.py            # newest scan
    python3 scripts/build_market_api.py --scan ../work/daily_scan_2026-08-12.json
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import re
import shutil
import sys
import zoneinfo

REPO = pathlib.Path(__file__).resolve().parent.parent
WORK = REPO.parent / "work"
API = REPO / "public" / "data" / "v1"
FIXTURES = REPO / "app" / "assets" / "fixtures"

# Arabic legal names the app already knows. The scan carries English names only,
# so the rest stay null rather than being machine-translated — a wrong Arabic
# legal name is worse than none (spec §41).
# Arabic names, harvested from the exchange's own filing titles rather than
# typed by hand.
#
# This was a hardcoded table of fourteen. Every EGX disclosure is titled
# `ARABIC NAME (TICKER.CA) — what happened`, so the exchange publishes the
# pairing itself and `harvest_company_names.py` reads it back out. The names
# that come out are the *street* names — "أبو قير", "بالم هيلز للتعمير" — which
# is the form newspapers and readers actually use, and the form a model does
# not produce when asked (it answers with the formal registered title).
#
# Coverage grows on its own: a company that files gets a name. One that never
# files never appears, which is honest, and it is also the kind nobody writes
# about.
def _arabic_names() -> dict[str, str]:
    path = pathlib.Path(__file__).resolve().parent / "company_names_ar.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


ARABIC = _arabic_names()


# A handful of scan records fall back to the ISIN when the feed has no ticker
# (e.g. "EGS30AJ1C016-EGP"). Those are real listings but there is nothing
# sensible to show for them, so they are excluded — and counted, never dropped
# silently.
TICKER = re.compile(r"^[A-Z]{3,6}$")



def newest_scan() -> pathlib.Path | None:
    """The freshest daily scan, or None when this machine has no scan archive.

    The scan lives outside the repository — it is 2 MB a day and would bloat the
    history within weeks — so it is present on the machine that runs the EGX
    monitor and absent everywhere else, CI included. Absent is a normal state,
    not an error: see [main].
    """
    scans = sorted(WORK.glob("daily_scan_*.json"))
    return scans[-1] if scans else None


def history_union() -> dict[str, list[dict]]:
    """The best price series available for each ticker, across every scan.

    Any one scan only fetches history for part of the exchange, and which part
    varies by run. Taking the union lifts coverage from 195 companies to 245
    without touching the network, and a company whose chart appeared yesterday
    does not lose it today because this morning's run skipped it.

    Series are keyed by date, so overlapping runs merge rather than duplicate.
    """
    merged: dict[str, dict[str, dict]] = {}
    for path in sorted(WORK.glob("daily_scan_*.json")):
        try:
            scan = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        for r in scan.get("records", []):
            ticker = r.get("ticker")
            if not ticker:
                continue
            for bar in r.get("recentSplitAdjustedBars") or []:
                date, close = bar.get("date"), clean(bar.get("close"))
                if date and close is not None:
                    # Volume travels with the close. The scan has carried it
                    # all along and this dropped it, which is why the app could
                    # say what a share cost on a given day but never whether
                    # anybody actually traded it — and "it did not trade at all
                    # on 14 of the last 60 days" is the single most useful
                    # thing we can tell somebody about getting their money out.
                    volume = clean(bar.get("volume"))
                    point = {"date": date, "close": round(float(close), 4)}
                    if volume is not None:
                        point["volume"] = int(volume)
                    merged.setdefault(ticker, {})[date] = point
    # Series fetched separately for the tail the scan could not reach — see
    # scripts/history_sink.py. Merged by date, so a scan bar and a fetched bar
    # for the same session collapse rather than duplicate.
    for path in sorted((REPO / "data-source" / "prices").glob("*.json")):
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        ticker = doc.get("ticker") or path.stem
        for bar in doc.get("bars", []):
            date, close = bar.get("date"), clean(bar.get("close"))
            if date and close is not None:
                volume = clean(bar.get("volume"))
                point = {"date": date, "close": round(float(close), 4)}
                if volume is not None:
                    point["volume"] = int(volume)
                merged.setdefault(ticker, {}).setdefault(date, point)

    return {
        ticker: [bars[d] for d in sorted(bars)]
        for ticker, bars in merged.items()
    }


def clean(value):
    """Scanner nulls and NaNs both mean 'not reported'."""
    if value is None:
        return None
    if isinstance(value, float) and value != value:
        return None
    return value


def is_after_close(as_of: str | None) -> bool:
    """Whether a scan timestamp falls after the EGX close for that day.

    EGX trades Sunday to Thursday, 10:00-14:30 Cairo. A scan taken on a weekend
    or outside those hours is reading closing prices; one taken between them is
    reading a session in progress.

    Unknown timestamps are treated as **not** a close, because the honest answer
    when we cannot tell is the weaker claim.
    """
    if not as_of:
        return False
    try:
        stamp = datetime.datetime.fromisoformat(as_of.replace("Z", "+00:00"))
    except ValueError:
        return False

    cairo = stamp.astimezone(zoneinfo.ZoneInfo("Africa/Cairo"))
    # Monday=0 … Sunday=6, so Friday(4) and Saturday(5) are the weekend.
    if cairo.weekday() in (4, 5):
        return True
    return cairo.hour * 60 + cairo.minute > 14 * 60 + 30


def previous_close(
    history: list[dict], session: str, close: float, change_pct: float | None
) -> float | None:
    """The close this session's move is measured against.

    Preferred source is the exchange's own reported move: the scan states the
    change as a percentage, so the base it was computed from is
    `close / (1 + pct/100)`. Deriving it this way means the pounds figure and
    the percentage figure can never contradict each other, because both come
    from one number.

    The merged history is only a fallback, for names the scan did not price.
    It is *not* the better source despite being real closes: the union spans
    several runs and can hold a bar that was never split-adjusted. SWDY's
    12 August close appears there as 109.30 while the exchange measured the
    13 August move against 107.11 — trusting the series would have published a
    -1.19% move where the exchange reported +0.83%.

    Selecting from history goes by date rather than by offset, because a scan
    taken before the open ends on the previous session and one taken after the
    close ends on this one.
    """
    if change_pct is not None:
        factor = 1 + change_pct / 100
        # A name down 100% has no meaningful base, and nothing else divides by
        # zero here.
        if abs(factor) > 1e-9:
            return round(close / factor, 4)

    for bar in reversed(history):
        date, bar_close = bar.get("date"), bar.get("close")
        if date is None or bar_close is None:
            continue
        if date < session:
            return bar_close
    return None


def build(scan_path: pathlib.Path, write_fixtures: bool) -> int:
    scan = json.loads(scan_path.read_text(encoding="utf-8"))
    records = scan["records"]
    session = scan["asOf"][:10]

    studied_path = API / "cash-or-trash" / "index.json"
    researched = set()
    if studied_path.exists():
        studied = json.loads(studied_path.read_text(encoding="utf-8"))
        researched = {c["ticker"] for c in studied["companies"]}

    union = history_union()
    companies, stocks, details = [], {}, {}
    skipped = 0

    for r in records:
        ticker = r.get("ticker")
        close = clean(r.get("close"))
        if not ticker or close is None or not TICKER.fullmatch(ticker):
            skipped += 1
            continue

        history = union.get(ticker, [])

        # The previous close is the last bar *before* the session being
        # published — found by date, not by position.
        #
        # This used to be `history[-2]`, which silently assumed the series
        # already contained the session's own bar. That holds for a scan taken
        # after the close and fails for one taken before the open, where the
        # last bar is already the previous session. On 13 August it made
        # `previous_close` a day too old for every company with a series: ADRI
        # was published as change +0.07 against change_percent -2.93%, so the
        # Market row showed it falling while the company header showed it
        # rising. 76 of 282 tickers disagreed in sign.
        change_pct = clean(r.get("change"))
        previous = previous_close(history, session, close, change_pct)

        companies.append(
            {
                "ticker": ticker,
                "name_en": r.get("company") or ticker,
                "name_ar": ARABIC.get(ticker),
                "sector": r.get("sector"),
                "exchange": "EGX",
                "tradable": bool(r.get("thndrScope")),
                "has_cash_or_trash": ticker in researched,
                "has_research": ticker in researched,
            }
        )

        quote = {"close": round(close, 4)}
        if previous is not None:
            quote["previous_close"] = previous
            quote["change"] = round(close - previous, 4)
        if change_pct is not None:
            quote["change_percent"] = round(change_pct / 100, 6)
        elif previous:
            quote["change_percent"] = round((close - previous) / previous, 6)
        if clean(r.get("volume")) is not None:
            quote["volume"] = int(r["volume"])
        stocks[ticker] = quote

        # The session's own bar, so a company with no series still shows real
        # trading. AALR, for one, has a full day of OHLCV and a market cap but
        # no history the pipeline could fetch — that is no reason to show it
        # as an empty screen.
        market = {"last_close": round(close, 4), "date": session}
        for key in ("open", "high", "low", "volume"):
            if clean(r.get(key)) is not None:
                market[key] = r[key]

        detail = {
            "ticker": ticker,
            "name": {"en": r.get("company") or ticker},
            "sector": r.get("sector"),
            "tradable": bool(r.get("thndrScope")),
            "market": market,
            "price_history": history,
        }
        if ARABIC.get(ticker):
            detail["name"]["ar"] = ARABIC[ticker]

        # Everything else the scan knows about this company. An absent field
        # stays absent and the app renders "—" rather than a zero (spec §49).
        profile = {}
        for key, field in (
            ("market_cap", "marketCap"),
            ("shares_outstanding", "sharesOutstanding"),
            ("free_float", "freeFloat"),
            ("float_shares", "floatShares"),
            ("perf_1w", "scannerPerf1w"),
            ("perf_1m", "scannerPerf1m"),
            ("perf_3m", "scannerPerf3m"),
            ("avg_volume_30d", "scannerAverageVolume30d"),
            ("relative_volume_10d", "scannerRelativeVolume10d"),
            ("median_volume_20d", "median20Volume"),
            ("rv20", "rv20"),
            ("normal_value_30d", "normal30dValue"),
            ("five_session_change", "fiveSessionChange"),
            ("history_bars", "historyBars"),
        ):
            value = clean(r.get(field))
            if value is not None:
                profile[key] = value
        if profile:
            detail["profile"] = profile
        details[ticker] = detail

    companies.sort(key=lambda c: c["ticker"])

    def write(path: pathlib.Path, payload: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )

    directory = {
        "updated_at": scan["asOf"],
        "source": "EGX daily scan",
        "companies": companies,
    }
    # Whether these prices are closing prices or a mid-session reading.
    #
    # The scan runs on whatever schedule the monitor happens to use — today's
    # was captured at 08:57 Cairo, before the open — and the app was labelling
    # every published price "Last close · <date>" regardless. A price captured
    # at 11:20 on a trading day is not that day's close, and saying so is the
    # kind of small untruth spec §49 exists to stop.
    snapshot = {
        "date": session,
        "captured_at": scan.get("asOf"),
        "is_close": is_after_close(scan.get("asOf")),
        "stocks": stocks,
    }

    targets = [API] + ([FIXTURES] if write_fixtures else [])
    for root in targets:
        write(root / "companies.json", directory)
        write(root / "market.json", snapshot)
        prices = root / "companies"
        if prices.exists():
            shutil.rmtree(prices)
        for ticker, doc in details.items():
            write(prices / f"{ticker}.json", doc)

    with_history = sum(1 for d in details.values() if len(d["price_history"]) > 1)
    with_profile = sum(1 for d in details.values() if d.get("profile"))
    fields = sum(len(d.get("profile", {})) for d in details.values())
    print(f"scan     {scan_path.name}  ({session})")
    print(f"listed   {scan['scannerTotal']}   tradable {scan['thndrDirectoryCount']}")
    print(f"written  {len(companies)} companies, {with_history} with price history")
    print(f"profile  {with_profile} with extra fields ({fields} values total)")
    if skipped:
        print(f"skipped  {skipped} records with no usable ticker or close")
    print(f"arabic   {sum(1 for c in companies if c['name_ar'])} names")
    sectors = sorted({c['sector'] for c in companies if c['sector']})
    print(f"sectors  {len(sectors)}: {', '.join(sectors[:8])}…")

    # A quote carries the move twice — as pounds and as a percentage — and the
    # app reads whichever the screen needs. If the two disagree in sign the same
    # company shows as rising on one screen and falling on another, which is how
    # the history[-2] bug stayed invisible until a reviewer diffed two screens.
    # Refuse to publish that.
    disagree = [
        t
        for t, q in stocks.items()
        if q.get("change") is not None
        and q.get("change_percent") is not None
        and q["change"] * q["change_percent"] < 0
    ]
    if disagree:
        print(f"\nerror: {len(disagree)} tickers have change and change_percent")
        print("       disagreeing in sign — the same move in two directions.")
        for t in sorted(disagree)[:8]:
            print(f"       {t}: {stocks[t]}")
        return 1
    print("checked  change and change_percent agree in sign for every quote")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scan", type=pathlib.Path, default=None)
    ap.add_argument("--no-fixtures", action="store_true")
    args = ap.parse_args()

    scan = args.scan or newest_scan()
    if scan is None:
        published = REPO / "public" / "data" / "v1" / "market.json"
        if not published.exists():
            sys.exit(f"error: no daily_scan_*.json under {WORK}, and nothing published")
        # CI has the website's own files but not the scan archive, so it can
        # rebuild the research documents and not this one. Leaving the published
        # market data exactly as it is beats failing the run and blocking the
        # research update that CI *can* do — which is the update a reader
        # actually notices (spec §21).
        print(f"no scan under {WORK} — leaving published market data untouched")
        print(f"  {published.relative_to(REPO)} kept as published")
        return 0

    return build(scan, not args.no_fixtures)


if __name__ == "__main__":
    raise SystemExit(main())
