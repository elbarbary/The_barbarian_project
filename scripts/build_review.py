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
PRICES = REPO / "public" / "data" / "v1" / "prices"
STOCK_INFO = pathlib.Path(__file__).resolve().parent / "stock_info.json"
# The natural-language read of each company's metric pattern, generated
# separately by `build_review_reads.py` under a budget and vetted like the
# briefs. Merged in here so build_review stays network-free and CI-safe; a
# read generated today reaches the app on the next build, like every other
# cumulative store in this pipeline.
READS = pathlib.Path(__file__).resolve().parent / "review_reads.json"
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


def price_series(ticker: str) -> list[tuple[str, float]]:
    """(date, close) for one company, oldest first — for a historical P/E.

    The app already holds a daily close series per company; it was only ever
    read for the price chart. A P/E for a past year needs the price *as it was*
    at that year's end, which is exactly what this carries.
    """
    doc = load(PRICES / f"{ticker}.json")
    out = [
        (str(p["date"]), float(p["close"]))
        for p in (doc.get("price_history") or [])
        if p.get("date") and p.get("close") is not None
    ]
    out.sort(key=lambda x: x[0])
    return out


def close_on(history: list[tuple[str, float]], date: str) -> float | None:
    """The close on the last session on or before `date`.

    A period ends on 31 December; the exchange does not trade that day, so the
    price that valued that year's earnings is the last one printed before it.
    Returns None when the series does not reach back that far — a P/E is left
    off rather than valued at a price from a different era.
    """
    chosen = None
    for day, close in history:
        if day <= date:
            chosen = close
        else:
            break
    return chosen


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
    return one_basis(rows)


def one_basis(rows: list[dict]) -> list[dict]:
    """Drop rows prepared on the basis this company mostly does not use.

    The exchange files many periods twice, standalone and consolidated, and the
    two disagree — 2,433 periods carry different profits, some by thousands of
    per cent. Standalone is the parent alone; consolidated is the group.
    Neither is wrong, and a series that switches between them is: the step
    between two bases reads as a collapse or a leap the business never had, and
    every direction, ratio and peer comparison built on it inherits the error.
    71 companies file on both.

    The majority basis wins and the odd rows go. Rows whose filing states no
    basis are kept — most of the archive is unlabelled, and dropping them would
    cost far more than the handful of contaminated rows this removes.
    """
    labelled = [row.get("basis") for row in rows if row.get("basis")]
    if len(set(labelled)) < 2:
        return rows
    dominant = collections.Counter(labelled).most_common(1)[0][0]
    return [row for row in rows
            if not row.get("basis") or row.get("basis") == dominant]


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
    return one_basis(rows)


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


def plabel(row: dict) -> str:
    """A short period label for a chart axis: `FY21`, `H1 24`, `Q1 26`.

    Read from `period` where the filing carries one, otherwise reconstructed
    from the period-end date so a Mubasher row without a `period` field still
    lands on the graph rather than dropping off it.
    """
    period = str(row.get("period") or "").strip()
    if period:
        parts = period.split()
        if len(parts) >= 2 and len(parts[1]) == 4 and parts[1].isdigit():
            label = f"{parts[0]} {parts[1][2:]}"
            # A second fiscal stream — "FY 2021 (to 30 Jun)" — is a real, distinct
            # period, not a duplicate. Tag it with its month so it neither
            # renders as "FY 2021 " with a dangling space nor collides on the
            # axis with the December row of the same year.
            if len(parts) > 2:
                month = parts[-1].strip("().")
                if month:
                    label += f" ({month})"
            return label
        return period[:8]
    key = period_key(row) or ""
    return key[2:] if len(key) >= 4 else key


def metrics_for(ticker: str, doc: dict, summary: dict, info: dict,
                history: list[tuple[str, float]] | None = None,
                sector: str | None = None) -> list[dict]:
    """Every metric this company has the data for. Absent is absent.

    Each series carries the period each value belongs to, not just the value —
    the graph a reader taps into is proof of the calculation, and a shape with
    no periods under it is decoration rather than evidence.
    """
    rows = annual(doc)      # flows
    held = balances(doc)    # stocks
    out: list[dict] = []

    def add(key: str, value: float | None, points: list[tuple[str, float]],
            *, signed: bool = False, unit: str = "ratio") -> None:
        value = sane(key, value)
        if value is None:
            return
        clean = [(label, s) for label, v in points
                 if (s := sane(key, v)) is not None]
        values = [v for _, v in clean]
        way, n = (growth(values) if signed else direction(values))
        out.append({
            "key": key,
            "value": round(value, 4),
            "unit": unit,
            "direction": way,
            "points": n,
            # Last ten, oldest first, each with its period for the axis.
            "series": [{"p": label, "v": round(v, 4)} for label, v in clean[-10:]],
        })

    def paired(source, field) -> list[tuple[str, float]]:
        """(`period label`, value) for a field read straight off a row."""
        return [(plabel(r), v) for r in source
                if (v := field(r)) is not None]

    def derived(source, field) -> list[tuple[str, float]]:
        """(`period label`, value) for a value computed from a row."""
        out_pts = []
        for r in source:
            v = field(r)
            if v is not None:
                out_pts.append((plabel(r), v))
        return out_pts

    market_cap = summary.get("market_cap") or info.get("egx_market_cap")
    shares = info.get("listed_shares")
    history = history or []

    # --- valuation -------------------------------------------------------
    #
    # A historical P/E, at last. It used to ship as today's level with no graph
    # because a P/E for a past year needs the price *as it was* at that year's
    # end — and both halves were already held, a daily close per company and
    # net profit per annual filing; they were simply never divided. Each point
    # is the close at a period end over that period's earnings per share. The
    # headline is the newest of them so the figure and the graph agree. A
    # company missing the price history or the share count falls back to today's
    # published multiple with no series, which is the honest degrade.
    pe_pts: list[tuple[str, float]] = []
    if shares and history:
        for r in rows:
            profit, end = r.get("net_income"), period_key(r)
            if profit is None or not end:
                continue
            eps = profit * 1e6 / shares
            price = close_on(history, end)
            if eps > 0 and price is not None:
                pe_pts.append((plabel(r), price / eps))
    add("pe", pe_pts[-1][1] if pe_pts
        else (summary.get("pe") or info.get("egx_pe")), pe_pts)

    if market_cap:
        # market_cap is whole pounds; every statement figure on this row is in
        # MILLIONS of pounds. Dividing one by the other put price-to-book near
        # 3.1e6 for every company on the exchange, outside SANE["pb"], so the
        # metric was silently dropped from all 258 review documents — while the
        # app carried finished copy for a row nothing ever produced.
        equity_now = _last(held, "equity")
        add("pb",
            market_cap / (equity_now * 1e6) if equity_now and equity_now > 0 else None,
            derived(held, lambda r: market_cap / (r["equity"] * 1e6)
                    if r.get("equity") and r["equity"] > 0 else None))

    # --- the business ----------------------------------------------------
    add("profit", newest(rows, "net_income"),
        paired(rows, lambda r: r.get("net_income")), signed=True, unit="egp_m")

    if shares:
        eps_pts = derived(rows, lambda r: r["net_income"] / shares * 1e6
                          if r.get("net_income") is not None else None)
        add("eps", eps_pts[-1][1] if eps_pts else None, eps_pts,
            signed=True, unit="egp")

    add("assets", newest(held, "assets"),
        paired(held, lambda r: r.get("assets")), unit="egp_m")

    # Cash conversion (operating cash flow over profit) is a quality-of-earnings
    # read for an operating business. It is not one for the Finance sector: a
    # bank, insurer or lessor runs its lending and investing THROUGH operating
    # cash flow, so the figure is routinely large and negative (ATLC's −6× is a
    # leasing book being funded, not profit failing to become cash) and reads as
    # a red flag it is not. Absent is more honest than misleading here.
    if (sector or "").strip().lower() != "finance":
        conv = derived(rows, lambda r: r["operating_cash_flow"] / r["net_income"]
                       if r.get("net_income") and r.get("operating_cash_flow") is not None
                       else None)
        add("cash_conversion", conv[-1][1] if conv else None, conv)

    # --- returns ---------------------------------------------------------
    roe = derived(rows, lambda r: r["net_income"] / r["equity"]
                  if r.get("equity") and r["equity"] > 0
                  and r.get("net_income") is not None else None)
    add("roe", roe[-1][1] if roe else None, roe)

    roa = derived(rows, lambda r: r["net_income"] / r["assets"]
                  if r.get("assets") and r["assets"] > 0
                  and r.get("net_income") is not None else None)
    add("roa", roa[-1][1] if roa else None, roa)

    # --- risk ------------------------------------------------------------
    # Two balances, so any period is comparable with any other.
    de = derived(held, lambda r: r["liabilities"] / r["equity"]
                 if r.get("equity") and r["equity"] > 0
                 and r.get("liabilities") is not None else None)
    add("debt_equity", de[-1][1] if de else None, de)

    # --- cash back to the holder ----------------------------------------
    if (y := info.get("dividend_yield")) is not None and y > 0:
        out.append({
            "key": "dividend_yield",
            "value": round(y, 3),
            "unit": "percent",
            "direction": "unknown",
            "points": 1,
            "series": [],
        })

    attach_causes(out)
    return out


def _last(rows: list[dict], field: str) -> float | None:
    """The newest value of a field, or None — for a one-line denominator."""
    return newest(rows, field)


# The framework's own "combine the signals" logic, made deterministic. A cause
# is never a verdict — it is a pointer at the other row a reader should read
# next, which is exactly how the founder's notes phrase every probable cause:
# "ROE up + debt up -> investigate whether it is leverage".
def attach_causes(metrics: list[dict]) -> None:
    way = {m["key"]: m["direction"] for m in metrics}
    has = way.__contains__

    for m in metrics:
        key, d = m["key"], m["direction"]
        cause = None
        if key == "profit" and d == "rising":
            cause = ("profit_ahead_of_cash"
                     if way.get("cash_conversion") == "falling"
                     else "profit_with_cash" if has("cash_conversion") else None)
        elif key == "assets" and d == "rising":
            cause = ("assets_ahead_of_profit"
                     if way.get("profit") not in ("rising", None)
                     else "assets_with_profit" if has("profit") else None)
        elif key == "eps" and d == "rising":
            cause = "eps_per_share"
        elif key == "cash_conversion" and d == "falling":
            cause = "cash_behind_profit"
        elif key == "roe" and d == "rising":
            cause = ("roe_leverage" if way.get("debt_equity") == "rising"
                     else "roe_operational" if has("debt_equity") else None)
        elif key == "roa" and d == "rising":
            cause = "roa_unlevered"
        elif key == "debt_equity" and d == "rising":
            cause = ("debt_productive" if way.get("profit") == "rising"
                     else "debt_watch")
        if cause:
            m["cause"] = cause


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
        rows = metrics_for(ticker, doc, summaries[ticker], info.get(ticker) or {},
                           price_series(ticker), sectors.get(ticker))
        if rows:
            everything[ticker] = rows

    medians = peers(everything, sectors)
    reads = load(READS)
    per_company = {}
    for ticker, rows in everything.items():
        sector = sectors.get(ticker)
        read = reads.get(ticker) or {}
        answers = read.get("answers") or {}
        for row in rows:
            # The probable answer to this metric's question, read by the model
            # off the sibling directions and vetted alongside the paragraph.
            # Absent for a metric that was flat or had no likely reason to give.
            if (answer := answers.get(row["key"])) and answer.get("en"):
                row["answer"] = answer["en"]
                if answer.get("ar"):
                    row["answer_ar"] = answer["ar"]
            median = medians.get((sector, row["key"]))
            if median is None:
                continue
            row["peer_median"] = round(median, 4)
            row["peer"] = "above" if row["value"] > median else "below"
        doc = {
            "ticker": ticker,
            "generated": today.isoformat(),
            "sector": sector,
            "metrics": rows,
            "pattern": pattern(rows),
        }
        if read.get("read"):
            doc["read"] = read["read"]
            doc["read_ar"] = read.get("read_ar", "")
        per_company[ticker] = doc

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
