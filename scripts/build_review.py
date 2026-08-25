#!/usr/bin/env python3
"""The stock review sheet: every metric, its direction, and the question to ask.

The founder's Investing 101 framework, computed for every listed company and
kept current by the same pipeline as everything else. Its central claim is the
one this file is built around:

    No single number tells you anything. The story appears when the numbers
    agree — or when they contradict each other.

So this does not publish ten independent figures. It publishes, per metric, a
**value**, the **direction** it has been moving in this company's own history,
where it sits against its **sector**, and — the part that keeps this legal and
also makes it useful — the **question** a reader should ask next.

WHY EVERY ROW ENDS IN A QUESTION
--------------------------------
"P/E fell and earnings rose, potentially interesting" is a view on a named
security. This publisher has no FRA licence and §8 forbids it. "P/E fell while
earnings rose — why is it cheaper than its sector?" is the same information
with the reader left holding the judgement, which is where it belongs.

There is deliberately **no score**. The moment ten arrows become a number out
of ten, it is a recommendation wearing arithmetic. Patterns are named, never
graded: "five of eight moved together this year" is an observation; "8/10" is
advice.

WHAT IS NOT HERE, AND WHY
-------------------------
**Revenue growth and profit margin are absent because revenue is not
published.** Not by us, by anyone: the exchange's 22,881 Financial Results
filings contain the word zero times — their template runs Company Name, Audit
Status, Currency, Period, Net Profit, and stops — and Mubasher's statement page
carries ten financial lines, none of them a top line. It cannot be derived
either: everything held is a stock (assets, liabilities, equity) or a *net*
flow, and a gross top line is not recoverable from net figures. The only way to
produce one is to borrow a sector-typical asset turnover, which is inventing a
number and printing it against a real ticker.

Two substitutes answer the same questions from figures that are published:

  * **Asset growth** for "is the business actually getting bigger".
  * **Cash conversion** — operating cash flow over reported profit — for "where
    did the profit come from". It arguably beats margin at that job: when
    profit climbs and the cash does not follow, that is the signal.

**Free float is absent with no substitute.** The exchange publishes
`listeD_SHARES` (total listed, not float), the 14,480 Shareholding Structure
filings are pointers to PDFs, and Mubasher does not carry it. Nothing implies
it, so nothing is shown.

**Volume is absent from this document on purpose.** It is a live figure and
`BVolumeExplainer` already reads it against the same 20-session median at the
moment a reader opens the page. A build-time copy would be yesterday's.
"""

from __future__ import annotations

import argparse
import collections
import datetime
import glob
import json
import pathlib
import statistics

REPO = pathlib.Path(__file__).resolve().parent.parent
COMPANIES = REPO / "public" / "data" / "v1" / "companies"
DIRECTORY = REPO / "public" / "data" / "v1" / "companies.json"
STOCK_INFO = pathlib.Path(__file__).resolve().parent / "stock_info.json"
OUT = REPO / "public" / "data" / "v1" / "review"
INDEX = REPO / "public" / "data" / "v1" / "review.json"
FIXTURES = REPO / "app" / "assets" / "fixtures"

# How many reported periods a direction needs before it is called one. Two
# points is a line through anything; three is the least that can disagree with
# itself.
MIN_POINTS = 3

# How much of a move counts as a move. Below this the metric is flat, because
# a 2% wobble in a ratio built from rounded figures is noise wearing a trend's
# clothes.
FLOOR = 0.05

# A sector median needs a sector. The median EGX sector here holds four
# companies and the smallest holds one — comparing a company against three
# others and calling it "below its sector" would be a number with the shape of
# a fact and none of the content.
MIN_PEERS = 5

# Ratios beyond these are arithmetic on a near-zero denominator rather than a
# measurement. The same reasoning, and roughly the same bounds, as
# `build_market_api.PE_CEILING`.
SANE = {
    "pe": (0.5, 200.0),
    "pb": (0.02, 50.0),
    "roe": (-3.0, 3.0),
    "roa": (-1.5, 1.5),
    "debt_equity": (0.0, 30.0),
    "cash_conversion": (-10.0, 10.0),
}


# The calendar day each period label ends on. Egyptian issuers file
# year-to-date, so "H1 2024" is the six months to 30 June 2024.
LABEL_ENDS = {"Q1": "-03-31", "H1": "-06-30", "9M": "-09-30", "FY": "-12-31"}


def period_key(row: dict) -> str | None:
    """A sortable end-date for a period, however the row happens to carry it.

    `period_end` exists only on rows the exchange merge wrote — 577 of the
    4,063 rows holding a balance sheet. The other 3,486 come from Mubasher and
    carry a label and nothing else, so filtering on `period_end` silently threw
    away six sevenths of the balance-sheet data and left 105 companies with a
    debt ratio where 228 have the figures for one.
    """
    if end := row.get("period_end"):
        return str(end)
    label = str(row.get("period") or "").strip().split()
    if len(label) == 2 and label[0] in LABEL_ENDS and label[1].isdigit():
        return label[1] + LABEL_ENDS[label[0]]
    return None


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def annual(doc: dict) -> list[dict]:
    """Full-year periods, oldest first — for **flows**.

    A flow has a span. The exchange's quarterlies are cumulative year-to-date,
    so a series mixing Q1 with FY compares three months against twelve and
    reads as violent seasonality that is really a unit change. Profit, cash
    flow, and every ratio built on them use these rows only.
    """
    rows = [
        row for row in ((doc.get("financials") or {}).get("annual") or [])
        if period_key(row)
    ]
    rows.sort(key=period_key)
    return rows


def balances(doc: dict) -> list[dict]:
    """Every period, oldest first — for **stocks**.

    A balance has no span: assets on 31 March and assets on 31 December are
    both "what it held on that date", and comparing them is exactly right.
    Restricting these to annual rows was a mistake that cost 128 companies —
    equity and assets appear in 228 companies' filings but in only 100 of
    their *annual* rows, because Mubasher files the balance sheet quarterly
    while the exchange's merge adds annual profit-only rows.
    """
    financials = doc.get("financials") or {}
    rows = [
        row
        for bucket in ("annual", "quarterly")
        for row in (financials.get(bucket) or [])
        if period_key(row)
    ]
    rows.sort(key=period_key)
    return rows


def newest(rows: list[dict], field: str) -> float | None:
    """The most recent value of one field, not the field of the most recent row.

    Those are different, and the difference cost 59 companies their asset
    figure: their newest annual period comes from the exchange's merge, which
    files net profit and nothing else, so the row exists and the field is null.
    """
    for row in reversed(rows):
        if (value := row.get(field)) is not None:
            return value
    return None


def sane(key: str, value: float | None) -> float | None:
    if value is None:
        return None
    low, high = SANE.get(key, (float("-inf"), float("inf")))
    return value if low <= value <= high else None


def direction(series: list[float]) -> tuple[str, int]:
    """Which way this metric has been going, and over how many points.

    Compares the latest reading against the median of what came before rather
    than fitting a line: a median is not dragged around by the one exceptional
    year that most of these series contain, and the question being answered is
    "is where it is now different from where it has been".
    """
    if len(series) < MIN_POINTS:
        return "unknown", len(series)
    latest, prior = series[-1], series[:-1]
    base = statistics.median(prior)
    if base == 0:
        return "unknown", len(series)
    change = (latest - base) / abs(base)
    if change > FLOOR:
        return "rising", len(series)
    if change < -FLOOR:
        return "falling", len(series)
    return "flat", len(series)


def growth(series: list[float]) -> tuple[str, int]:
    """Direction for a level that can be negative — profit, most of all.

    A percentage change off a negative base is meaningless: −100 to +50 is not
    "+150%", it is a company that stopped losing money. So this reads the sign
    of the moves rather than their size, and `build_signals` already publishes
    the crossing itself as a streak break.
    """
    if len(series) < MIN_POINTS:
        return "unknown", len(series)
    moves = [1 if b > a else (-1 if b < a else 0)
             for a, b in zip(series, series[1:])]
    recent = moves[-3:]
    if sum(recent) >= 2:
        return "rising", len(series)
    if sum(recent) <= -2:
        return "falling", len(series)
    return "flat", len(series)


def metrics_for(ticker: str, doc: dict, summary: dict, info: dict) -> list[dict]:
    """Every metric this company has the data for. Absent is absent."""
    rows = annual(doc)      # flows
    held = balances(doc)    # stocks
    out: list[dict] = []

    def series_of(field, source=None) -> list[float]:
        return [
            v for v in (field(r) for r in (source if source is not None else rows))
            if v is not None
        ]

    def add(key: str, value: float | None, series: list[float],
            *, signed: bool = False, unit: str = "ratio") -> None:
        value = sane(key, value)
        if value is None:
            return
        clean = [s for s in (sane(key, v) for v in series) if s is not None]
        way, points = (growth(clean) if signed else direction(clean))
        out.append({
            "key": key,
            "value": round(value, 4),
            "unit": unit,
            "direction": way,
            "points": points,
            "series": [round(v, 4) for v in clean[-10:]],
        })

    market_cap = summary.get("market_cap") or info.get("egx_market_cap")
    shares = info.get("listed_shares")

    # --- valuation -------------------------------------------------------
    #
    # P/E ships as today's level with no direction. A historical P/E needs a
    # historical price per year, and the app holds a price *series* but not one
    # aligned to each period end. Rather than reconstruct it approximately, the
    # sheet shows today's multiple beside the earnings direction underneath it
    # — which is the comparison the framework actually asks for: "is the P/E
    # reasonable against the company's growth", not "which way has the P/E
    # been drifting".
    add("pe", summary.get("pe") or info.get("egx_pe"), [])

    if market_cap:
        book = [r["equity"] for r in held if r.get("equity") and r["equity"] > 0]
        add("pb", market_cap / book[-1] if book else None,
            [market_cap / b for b in book])

    # --- the business ----------------------------------------------------
    add("profit", newest(rows, "net_income"),
        series_of(lambda r: r.get("net_income")), signed=True, unit="egp_m")

    if shares:
        eps = [r["net_income"] / shares * 1e6 for r in rows
               if r.get("net_income") is not None]
        add("eps", eps[-1] if eps else None, eps, signed=True, unit="egp")

    add("assets", newest(held, "assets"),
        series_of(lambda r: r.get("assets"), held), unit="egp_m")

    conv = [
        r["operating_cash_flow"] / r["net_income"]
        for r in rows
        if r.get("net_income") and r.get("operating_cash_flow") is not None
    ]
    add("cash_conversion", conv[-1] if conv else None, conv)

    # --- returns ---------------------------------------------------------
    roe = [r["net_income"] / r["equity"] for r in rows
           if r.get("equity") and r["equity"] > 0 and r.get("net_income") is not None]
    add("roe", roe[-1] if roe else None, roe)

    roa = [r["net_income"] / r["assets"] for r in rows
           if r.get("assets") and r["assets"] > 0 and r.get("net_income") is not None]
    add("roa", roa[-1] if roa else None, roa)

    # --- risk ------------------------------------------------------------
    # Two balances, so any period is comparable with any other.
    de = [r["liabilities"] / r["equity"] for r in held
          if r.get("equity") and r["equity"] > 0 and r.get("liabilities") is not None]
    add("debt_equity", de[-1] if de else None, de)

    # --- cash back to the holder ----------------------------------------
    if (y := info.get("dividend_yield")) is not None and y > 0:
        out.append({
            "key": "dividend_yield",
            "value": round(y, 3),
            "unit": "percent",
            # One published figure, so there is no direction to read. Said
            # plainly rather than dressed as flat.
            "direction": "unknown",
            "points": 1,
            "series": [],
        })

    return out


def peers(everything: dict[str, list[dict]], sectors: dict[str, str]) -> dict:
    """Sector medians, for the sectors big enough to have one."""
    buckets: dict[tuple[str, str], list[float]] = collections.defaultdict(list)
    for ticker, rows in everything.items():
        sector = sectors.get(ticker)
        if not sector:
            continue
        for row in rows:
            buckets[(sector, row["key"])].append(row["value"])
    return {
        pair: statistics.median(values)
        for pair, values in buckets.items()
        if len(values) >= MIN_PEERS
    }


# Which way each metric has to move for the two sides of a pattern to count as
# agreeing. Not "good" and "bad" — the words are deliberately mechanical, and
# what a reader makes of a company where everything is improving is theirs.
IMPROVING = {
    "profit": "rising", "eps": "rising", "assets": "rising",
    "roe": "rising", "roa": "rising", "cash_conversion": "rising",
    "debt_equity": "falling", "pe": "falling", "pb": "falling",
}


def pattern(rows: list[dict]) -> dict | None:
    """Where the numbers agree, and where they contradict each other.

    The whole point of the sheet, and the reason it is not ten separate
    readings. Counts only — no verdict, no score.
    """
    readable = [r for r in rows if r["direction"] in ("rising", "falling")]
    if len(readable) < 3:
        return None
    same, against = [], []
    for row in rows:
        want = IMPROVING.get(row["key"])
        if want is None or row["direction"] not in ("rising", "falling"):
            continue
        (same if row["direction"] == want else against).append(row["key"])
    if not same and not against:
        return None
    return {
        "readable": len(readable),
        "improving": sorted(same),
        "deteriorating": sorted(against),
    }


def build(today: datetime.date) -> tuple[dict, dict]:
    directory = load(DIRECTORY).get("companies") or []
    summaries = {c["ticker"]: c for c in directory if c.get("ticker")}
    sectors = {c["ticker"]: c.get("sector") for c in directory if c.get("ticker")}
    info = (load(STOCK_INFO).get("companies") or {})

    everything: dict[str, list[dict]] = {}
    for path in sorted(glob.glob(str(COMPANIES / "*.json"))):
        doc = load(pathlib.Path(path))
        ticker = doc.get("ticker") or pathlib.Path(path).stem
        if ticker not in summaries:
            continue
        rows = metrics_for(ticker, doc, summaries[ticker], info.get(ticker) or {})
        if rows:
            everything[ticker] = rows

    medians = peers(everything, sectors)
    per_company = {}
    for ticker, rows in everything.items():
        sector = sectors.get(ticker)
        for row in rows:
            median = medians.get((sector, row["key"]))
            if median is None:
                continue
            row["peer_median"] = round(median, 4)
            row["peer"] = "above" if row["value"] > median else "below"
        per_company[ticker] = {
            "ticker": ticker,
            "generated": today.isoformat(),
            "sector": sector,
            "metrics": rows,
            "pattern": pattern(rows),
        }

    index = {
        "generated": today.isoformat(),
        "companies": len(per_company),
        "source": "EGX filed statements, the exchange's stock-info, and the market scan",
        "sector_medians": {
            f"{sector}|{key}": round(value, 4)
            for (sector, key), value in medians.items()
        },
    }
    return per_company, index


def write(per_company: dict, index: dict) -> None:
    for root in (REPO / "public" / "data" / "v1", FIXTURES):
        if not root.exists():
            continue
        folder = root / "review"
        folder.mkdir(parents=True, exist_ok=True)
        for stale in folder.glob("*.json"):
            if stale.stem not in per_company:
                stale.unlink()
        for ticker, doc in per_company.items():
            (folder / f"{ticker}.json").write_text(
                json.dumps(doc, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
        (root / "review.json").write_text(
            json.dumps(index, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    today = datetime.date.today()
    per_company, index = build(today)
    if not per_company:
        print("── Review: no company financials to read — leaving it alone")
        return 0

    counts: collections.Counter = collections.Counter()
    for doc in per_company.values():
        for row in doc["metrics"]:
            counts[row["key"]] += 1
    patterned = sum(1 for d in per_company.values() if d["pattern"])

    print(f"── Review: {len(per_company)} companies")
    for key, n in counts.most_common():
        print(f"   {key:<16} {n}")
    print(f"   {patterned} have enough readable directions to name a pattern")
    print(f"   {len(index['sector_medians'])} sector medians "
          f"(sectors of {MIN_PEERS}+ only)")
    if args.check:
        return 0
    write(per_company, index)
    print(f"   written to {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
