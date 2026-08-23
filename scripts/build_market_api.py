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

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import mubasher_statements  # noqa: E402

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



# How many months each of Mubasher's interim columns covers, which is what
# decides whether a period is filed as annual or quarterly downstream.
QUARTER_MONTHS = {"Q1": 3, "Q2": 3, "Q3": 3, "Q4": 3, "H1": 6, "9M": 9}

# Where each part-year period ends. Mubasher labels the column and states no
# date, so without this every quarter was offered with `end=None`, the emit
# sort key below collapsed to the empty string, and the array shipped ordered
# by quarter number across years — Q1 2021, Q1 2022, … Q4 2024. The company
# screen labels the last element "Latest filing", so a company whose newest
# filing was Q1 2025 was shown Q4 2023 under that heading.
QUARTER_END = {
    "Q1": "03-31",
    "Q2": "06-30",
    "H1": "06-30",
    "Q3": "09-30",
    "9M": "09-30",
    "Q4": "12-31",
}

def _filed_financials(
    filings_store: pathlib.Path | None = None,
    statements_store: pathlib.Path | None = None,
) -> dict[str, dict]:
    """Reported figures per ticker, from the two sources we have.

    **The exchange first.** `financials_filed.json` holds net profit read
    straight from EGX's own results announcements — the issuer's figure,
    published by the exchange, ticker-stamped. It covers only net profit and
    only the filings we have managed to read, but where it exists it is the
    most authoritative thing we have and it wins.

    **Mubasher for the balance sheet.** `statements_filed.json` holds filed
    annual statements — assets, liabilities, equity, net income, operating cash
    flow — going back roughly five years. Verified against El Sewedy's own
    FY2024 and FY2021 earnings releases, where the figures match to the pound.
    There is no revenue line anywhere in that source, so margins remain
    underivable and are left null rather than approximated.

    Two filings for one period is normal and consolidated wins; see `rank`.
    Each EGX filing also states the year-earlier comparative, which becomes its
    own period when nothing better supplies it.
    """
    here = pathlib.Path(__file__).resolve().parent
    filings_store = filings_store or (here / "financials_filed.json")
    statements_store = statements_store or (here / "statements_filed.json")

    def load(path: pathlib.Path) -> dict:
        if not path.exists():
            return {}
        try:
            return json.loads(path.read_text())
        except (json.JSONDecodeError, OSError):
            return {}

    # (ticker, period) -> the best figures seen for it so far.
    picked: dict[tuple[str, str], dict] = {}

    def rank(basis: str | None, comparative: bool, exchange: bool) -> tuple:
        """How much a figure is preferred when two describe the same period.

        The exchange's own publication outranks an aggregator's — not because
        the aggregator is wrong (it matches the filings where both exist) but
        because when they ever disagree the exchange is the one we can point a
        reader at. Then consolidated over standalone, since companies file both
        and the group figure is the one the company is discussed as. Then a
        company's own filing over the same period quoted as a comparative
        inside a later one.

        A score rather than branch order, so adding a fourth consideration
        cannot silently reorder the first three.
        """
        return (
            1 if exchange else 0,
            1 if basis == "consolidated" else 0,
            0 if comparative else 1,
        )

    def offer(ticker: str, period: str, fields: dict, *, basis: str | None,
              source: str | None, filed_on: str | None, end: str | None,
              months: int | None, comparative: bool = False,
              exchange: bool = False) -> None:
        key = (ticker, period)
        score = rank(basis, comparative, exchange)
        existing = picked.get(key)
        if existing is not None:
            if score < existing["_rank"]:
                return
            if score == existing["_rank"]:
                # Same standing: keep what is there but let the newcomer fill
                # lines it does not have. This is how the exchange's net profit
                # and Mubasher's balance sheet end up on one period.
                for name, value in fields.items():
                    existing.setdefault(name, value)
                return
            # Outranked: the better source leads, but a line only it lacks is
            # still worth keeping rather than throwing away.
            merged = dict(fields)
            for name, value in existing.items():
                if not name.startswith("_") and name not in merged:
                    merged.setdefault(name, value)
            fields = merged
        picked[key] = {
            "period": period,
            **fields,
            "_rank": score,
            "_end": end,
            "_months": months,
            "basis": basis,
            "source": source,
            "filed_on": filed_on,
        }

    # Mubasher's annual statements, labelled to match the exchange's own "FY"
    # naming so the two sources land on the same period rather than beside it.
    for ticker, years in load(statements_store).get("companies", {}).items():
        for year, fields in years.items():
            offer(
                ticker,
                f"FY {year}",
                {
                    k: v
                    for k, v in fields.items()
                    if v is not None and k not in mubasher_statements.INTERNAL
                },
                basis=None,
                source=(
                    "https://english.mubasher.info/markets/EGX/stocks/"
                    f"{ticker}/financial-statements"
                ),
                filed_on=None,
                end=f"{year}-12-31",
                months=12,
            )

    # Mubasher's quarterly columns, which `bucket` sorts by their length.
    # Kept separate from the years above because the two are scaled by
    # different rules: within one page a quarter can be stated in whole pounds
    # while its own annual column is in thousands, so each quarter is scaled
    # against the year it belongs to and dropped if that cannot be settled.
    for ticker, periods in load(statements_store).get("quarterly", {}).items():
        for label, fields in periods.items():
            part, _, year = label.partition(" ")
            months = QUARTER_MONTHS.get(part)
            if not months or not year:
                continue
            offer(
                ticker,
                label,
                {
                    k: v
                    for k, v in fields.items()
                    if v is not None and k not in mubasher_statements.INTERNAL
                },
                basis=None,
                source=(
                    "https://english.mubasher.info/markets/EGX/stocks/"
                    f"{ticker}/financial-statements"
                ),
                filed_on=None,
                # A real date, so the sort below orders these by time rather
                # than alphabetically by label. Q2 and H1 share an end, which
                # `months` breaks the tie on.
                end=(
                    f"{year}-{QUARTER_END[part]}" if part in QUARTER_END else None
                ),
                months=months,
            )

    for record in load(filings_store).get("filings", {}).values():
        ticker = record.get("ticker")
        net = record.get("net_profit_egp")
        if not ticker or net is None:
            continue
        offer(ticker, record["period"],
              {"net_income": round(net / 1_000_000, 3)},
              basis=record.get("basis"), source=record.get("source"),
              filed_on=record.get("filed_on"), end=record.get("period_end"),
              months=record.get("months"), exchange=True)
        prior = record.get("prior_net_profit_egp")
        if prior is not None and record.get("prior_period"):
            offer(ticker, record["prior_period"],
                  {"net_income": round(prior / 1_000_000, 3)},
                  basis=record.get("basis"), source=record.get("source"),
                  filed_on=record.get("filed_on"),
                  end=record.get("prior_period_end"),
                  months=record.get("months"),
                  comparative=True, exchange=True)

    out: dict[str, dict] = {}
    for (ticker, _period), period in sorted(
        picked.items(),
        key=lambda kv: (kv[0][0], kv[1]["_end"] or "", kv[1]["_months"] or 0),
    ):
        months = period.pop("_months")
        period.pop("_rank"), period.pop("_end")
        bucket = "annual" if months == 12 else "quarterly"
        out.setdefault(ticker, {"annual": [], "quarterly": []})[bucket].append(
            {k: v for k, v in period.items() if v is not None}
        )
    return out


FILED_FINANCIALS = _filed_financials()


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


# One year of sessions. The company screen offers 1M/3M/1Y and this fills the
# longest of them; 5Y and MAX come from the split document, not from here.
KEEP_SESSIONS = 260


def published_profile(ticker: str) -> dict:
    """The profile last published for this company, or an empty one."""
    path = API / "companies" / f"{ticker}.json"
    try:
        return json.loads(path.read_text(encoding="utf-8")).get("profile") or {}
    except (OSError, json.JSONDecodeError):
        return {}


# Fields worth keeping when a scan arrives without them.
#
# Only the ones derived from price history, which is the part of a scan that
# can fail on its own — the socket times out, or a runner cannot reach it. The
# scanner's own columns are all-or-nothing: if those are missing there is no
# record at all, and carrying a stale market cap forward would be inventing a
# company rather than filling a gap.
CARRIED = (
    "median_volume_20d",
    "rv20",
    "normal_value_30d",
    "five_session_change",
    "history_bars",
    "free_float",
)


def carry_forward(ticker: str, profile: dict) -> list[str]:
    """Fill gaps from the last published profile. Returns what was filled."""
    previous = published_profile(ticker)
    filled = []
    for key in CARRIED:
        if key in profile or key not in previous:
            continue
        profile[key] = previous[key]
        filled.append(key)
    return sorted(filled)


def tradable_flag(record: dict, scan_has_scope: bool) -> bool | None:
    """Whether this name is on the broker's list, or None when we cannot know.

    `thndrScope` comes from a scraped broker page that only exists on the
    machine running the research monitor. A scan produced anywhere else — CI,
    for instance — carries the field for nobody, and `bool(None)` would then
    publish `tradable: false` against all 291 companies: a confident false
    statement about every listing on the exchange, produced by an absence.

    Nothing in the app reads this field today, which makes it exactly the kind
    of thing that would stay wrong for months. Absent stays absent.
    """
    if not scan_has_scope:
        return None
    return bool(record.get("thndrScope"))


# Above this, the ratio is arithmetic on a rounding artefact rather than a
# valuation. AALR's latest filed net income rounds to zero in EGP millions, so
# its "P/E" comes out at 39,873 — a number with the shape of a fact and none of
# the content.
PE_CEILING = 200

# How far the two routes to the same ratio may differ before neither is trusted.
PE_TOLERANCE = 0.05

# Below this the company earned more in a year than the market says the whole
# of it is worth.
#
# The two-route check cannot catch this one, because both routes divide by the
# same net income — if that figure is filed in the wrong unit they agree with
# each other and are both wrong. RTVC survives every other guard at 0.37: a
# 1.0bn company reporting 2.8bn of profit. That is a units error in a filing
# far more often than it is a bargain, and on a "lowest P/E" sort it would be
# the first thing a reader saw.
PE_FLOOR = 1.0


def price_earnings(close, profile: dict, filed: dict | None):
    """`(ratio, the period it is earned over)`, or `(None, None)`.

    Two published figures divided: the last traded price, and the company's own
    filed net income spread over the shares it says are outstanding. Not a view
    about whether a share is worth having — this app has no licence to hold one.

    **Worked out twice, from different inputs, and published only when the two
    agree.** Price ÷ earnings-per-share uses the share count; market cap ÷ total
    earnings does not. Where the filed units or the share count are wrong the
    two diverge wildly, and they diverge for sixteen companies today:

        EGBE   price/EPS 0.11   cap/earnings 5.76
        EGSA   price/EPS 5.62   cap/earnings 292.11

    A single route would have published the first number in each pair without
    hesitating. FAITA came out at 0.03 — a company earning thirty pounds a share
    on a ninety-nine piastre listing — which is not a cheap share, it is a
    broken figure, and on a filter screen it would have sorted straight to the
    top of "lowest P/E".

    Omitted, deliberately, in five cases: a loss (a negative P/E is not a small
    one, and to a reader who has not met one it reads as the cheapest share on
    the exchange), no filed net income or share count, a ratio outside
    `PE_FLOOR`–`PE_CEILING`, and the two routes disagreeing.

    The period is returned with it because the newest annual filing can be
    eighteen months old, and "P/E 8" against 2023 earnings is a different claim
    from the same number against 2025.
    """
    if not close or not filed:
        return None, None
    shares = profile.get("shares_outstanding")
    cap = profile.get("market_cap")
    if not shares or not cap:
        return None, None
    annual = filed.get("annual") or []
    latest = next(
        (a for a in reversed(annual) if a.get("net_income") is not None), None
    )
    if latest is None:
        return None, None
    net_income = latest["net_income"]
    if net_income <= 0:
        return None, None

    # Filed figures are in EGP millions; neither the share count nor the market
    # cap is.
    earnings = net_income * 1_000_000
    by_share = close / (earnings / shares)
    by_cap = cap / earnings
    if by_share <= 0 or by_cap <= 0:
        return None, None
    if abs(by_share - by_cap) / max(by_share, by_cap) > PE_TOLERANCE:
        return None, None
    if not (PE_FLOOR <= by_share <= PE_CEILING):
        return None, None
    return round(by_share, 2), latest.get("period")


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
    # Whether this scan knows about broker scope at all — see `tradable_flag`.
    scan_has_scope = any("thndrScope" in r for r in records)
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

        # Capped, because these files ship inside the app binary. Mubasher
        # publishes twenty years a share — El Sewedy runs to 4,859 sessions
        # from 2006 — and 282 companies of that is fourteen megabytes of JSON
        # in the bundle. §19: "Do not make these files unnecessarily huge. If
        # price history becomes large, split it."
        #
        # A year is what the company screen needs to fill its longest offered
        # window, and the full series stays in `data-source/prices` for the
        # deeper document to be built from.
        history = union.get(ticker, [])[-KEEP_SESSIONS:]

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

        cap = clean(r.get("marketCap"))
        avg_volume = clean(r.get("scannerAverageVolume30d"))
        pe, pe_period = price_earnings(
            close,
            {
                "shares_outstanding": clean(r.get("sharesOutstanding")),
                "market_cap": cap,
            },
            FILED_FINANCIALS.get(ticker),
        )

        companies.append(
            {
                "ticker": ticker,
                "name_en": r.get("company") or ticker,
                "name_ar": ARABIC.get(ticker),
                "sector": r.get("sector"),
                "exchange": "EGX",
                # Numbers the directory itself can filter on.
                #
                # The list screen had none: every figure lived in one of 282
                # per-company documents it does not load, so "companies worth
                # more than a billion" meant opening 282 files to answer. These
                # three are small, slow-moving and enough to narrow a list of
                # 280 names down to something a reader can read.
                #
                # Volume is deliberately NOT here — it changes through the
                # session and the screen already watches the live snapshot for
                # it, which is fresher than this document will ever be.
                **({"market_cap": cap} if cap else {}),
                **({"avg_volume_30d": avg_volume} if avg_volume else {}),
                **({"pe": pe} if pe is not None else {}),
                **({"pe_period": pe_period} if pe is not None else {}),
                **(
                    {"tradable": flag}
                    if (flag := tradable_flag(r, scan_has_scope)) is not None
                    else {}
                ),
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
            **(
                {"tradable": flag}
                if (flag := tradable_flag(r, scan_has_scope)) is not None
                else {}
            ),
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
        # What this scan did not carry, kept from the last one that did.
        #
        # The company documents are deleted and rewritten every run, and an
        # absent field stays absent — so a scan that reaches the exchange but
        # not TradingView's history socket would silently delete
        # `median_volume_20d` from all 282 companies. That is the figure behind
        # "traded 3.45x its own normal volume", so the app would not degrade,
        # it would lose the feature and say nothing.
        #
        # A twenty-day median volume from yesterday is a fair stand-in for the
        # same figure today; a missing one is not. What is carried is named on
        # the document rather than blended in, so nothing here can quietly
        # present last week's number as this morning's.
        carried = carry_forward(ticker, profile)
        if profile:
            detail["profile"] = profile
        if carried:
            detail["profile_carried"] = carried
        filed = FILED_FINANCIALS.get(ticker)
        if filed:
            detail["financials"] = filed
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
    listed = scan.get("scannerTotal", len(records))
    scope = scan.get("thndrDirectoryCount")
    print(f"listed   {listed}   tradable {scope if scope is not None else 'not known here'}")
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
