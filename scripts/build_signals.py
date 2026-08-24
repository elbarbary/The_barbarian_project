#!/usr/bin/env python3
"""What is unusual about a company *against its own record*.

The app's whole thesis, everywhere else, is "unusual against its own normal" —
a session is worth a look because this share traded twice its own median
volume, not because a number is large. That idea was applied to trading and
nowhere else. This applies it to the **filing record**, which is the larger
pile: 126,080 ticker-tagged filings and 10,073 filed net-profit figures, all
already on disk.

Four things come out of it, and every one is arithmetic — there is no model in
this file (§43 keeps models off the phone; this keeps one out of the pipeline
entirely, because counting does not need one).

**1. Streak breaks — "first time since".**
    A loss is a fact. A *first* loss after twenty-one profitable reported
    periods is news, and nobody who has not read the whole archive can know it.
    The same machinery reads the other direction: a return to profit after a
    run of losses.

**2. Silence, measured against the company's own filing rhythm.**
    Not "has not filed in 180 days" — that turned out to be a delisting
    detector. Every company it flagged was already `tradable: false`, which the
    app knows without any of this. What is worth flagging is a company that
    files every five days and has not filed in six weeks: quiet *for it*.

**3. First of its kind in years.**
    A company's first capital increase since 2014, its first dividend in six
    years. The type comes from `filing_types.classify_rules` — published
    patterns, no guessing — and the gap comes from counting.

**4. When results are next due.**
    Not a forecast about a security: a forecast about a **disclosure date**,
    computed from the dates this company filed the same period in previous
    years. Published as a window with the number of observations behind it,
    never as a bare date, because the median spread of that lag across the
    market is 31 days and a point estimate would be a lie of precision.

WHAT THIS DELIBERATELY DOES NOT DO
----------------------------------
It does not say whether any of it is good, and it does not rank companies
against each other. A first loss is not a sell signal, a return to profit is
not a buy one, and this publisher is not licensed to imply either (§8). Every
row is a count with the filing behind it.

Output
------
`public/data/v1/signals/<TICKER>.json` — one company's signals, fetched with
its page. `public/data/v1/signals.json` — the market-wide roll-up of recent
streak breaks and current silences, small enough to ship with the feed.

`expected_results()` is also imported by `build_calendar.py`, which is why the
prediction lives here beside the rest of the arithmetic rather than there.
"""

from __future__ import annotations

import argparse
import collections
import datetime
import glob
import gzip
import json
import pathlib
import re
import statistics

import filing_types as ft
import merge_egx_financials as filed

REPO = pathlib.Path(__file__).resolve().parent.parent
FILINGS = REPO / "data-source" / "egx-beta" / "filings"
COMPANIES = REPO / "public" / "data" / "v1" / "companies"
DIRECTORY = REPO / "public" / "data" / "v1" / "companies.json"
OUT = REPO / "public" / "data" / "v1" / "signals"
INDEX = REPO / "public" / "data" / "v1" / "signals.json"
FIXTURES = REPO / "app" / "assets" / "fixtures"

TICKER = re.compile(r"\(([A-Z0-9]{2,8})\.CA\)")
DETAIL = "https://www.egx.com.eg/en/NewsDetails.aspx?NewsID={}"

# A run has to be long enough that breaking it means something. Four reported
# periods is a year of cumulative filings; below that "first loss in three
# quarters" is noise dressed as a finding.
RUN = 4

# How long a streak break stays interesting. A first loss reported eighteen
# months ago is history, not a signal, and the company page shows the whole
# series anyway.
FRESH_DAYS = 400

# Silence is measured in multiples of the company's own median gap, with a
# floor so that a company filing twice a year is not "quiet" three weeks later.
SILENT_MULTIPLE = 4
SILENT_FLOOR = 45
SILENT_MIN_FILINGS = 20

# "First X in N years" needs a gap worth printing.
GAP_YEARS = 3

# Types where "the first one in years" is a fact a reader would want. Insider
# forms and board minutes arrive constantly; their gaps mean nothing.
NOTABLE_TYPES = {
    "capital_increase": "capital increase",
    "capital_decrease": "capital decrease",
    "dividend": "cash dividend",
    "bonus_shares": "bonus shares",
    "acquisition": "acquisition or merger",
    "halt": "trading halt",
    "funding": "borrowing or bond issue",
}

# The four cumulative periods the exchange's filings report, and the calendar
# day each one ends on. Egyptian issuers file year-to-date, so "H1" is the six
# months to 30 June rather than a second quarter.
PERIOD_ENDS = [("Q1", 3, 31), ("H1", 6, 30), ("9M", 9, 30), ("FY", 12, 31)]

# Fewer than this many past filings of the same period and there is no rhythm
# to read — one or two observations is an anecdote, not a pattern.
MIN_OBSERVATIONS = 3

# A results filing lands somewhere between a week and half a year after the
# period it reports. Outside that the pair is mismatched, not late.
LAG_BAND = (5, 200)


# --------------------------------------------------------------- the archive


def load_filings() -> dict[str, list[dict]]:
    """Every ticker-tagged filing, newest first, deduplicated on its code."""
    by_ticker: dict[str, dict[str, dict]] = collections.defaultdict(dict)
    for path in sorted(glob.glob(str(FILINGS / "*.json.gz"))):
        doc = json.loads(gzip.decompress(pathlib.Path(path).read_bytes()))
        for item in doc.get("items", []):
            head = (item.get("heading") or "") + " " + (item.get("headingArabic") or "")
            for ticker in set(TICKER.findall(head)):
                by_ticker[ticker][item["code"]] = item
    return {
        t: sorted(v.values(), key=lambda i: i.get("dateStamp") or "", reverse=True)
        for t, v in by_ticker.items()
    }


def directory() -> dict[str, dict]:
    try:
        doc = json.loads(DIRECTORY.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return {c["ticker"]: c for c in doc.get("companies", []) if c.get("ticker")}


def day(stamp: str | None) -> datetime.date | None:
    try:
        return datetime.date.fromisoformat((stamp or "")[:10])
    except ValueError:
        return None


# -------------------------------------------------------------- 1. streaks


def reported_periods(ticker: str) -> list[dict]:
    """Every period this company reported a profit or loss for, oldest first.

    Both buckets together and sorted by the period's own end date, because a
    streak is a run through time and the annual/quarterly split is a storage
    detail. Periods with no `period_end` are dropped rather than ordered by
    their label, which would sort "FY 2020" before "Q1 2019".
    """
    path = COMPANIES / f"{ticker}.json"
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    rows = []
    financials = doc.get("financials") or {}
    for bucket in ("annual", "quarterly"):
        for row in financials.get(bucket) or []:
            if row.get("net_income") is None or not row.get("period_end"):
                continue
            rows.append(row)
    rows.sort(key=lambda r: r["period_end"])
    return rows


def _filing_link(row: dict) -> str:
    """The filing that reported this period, when the merge recorded which one.

    `net_income_source` is the constant naming the exchange, not a document —
    linking a reader to it lands them on the homepage. The id is the document.
    """
    ident = (row.get("filing_id") or "").removeprefix("egx-")
    if ident.isdigit():
        return DETAIL.format(ident)
    return ""


def streak_breaks(ticker: str, today: datetime.date) -> list[dict]:
    """Where a run of profits or of losses ended, and how long it had run."""
    rows = reported_periods(ticker)
    out: list[dict] = []
    profits = losses = 0
    run_from: str | None = None

    for row in rows:
        value = row["net_income"]
        negative = value < 0
        if negative and profits >= RUN:
            out.append({
                "kind": "first_loss",
                "period": row.get("period") or "",
                "period_end": row["period_end"],
                "value": value,
                "run": profits,
                "since": run_from or "",
                "filed": row.get("filed") or "",
                "id": row.get("filing_id") or "",
                "link": _filing_link(row),
            })
        elif not negative and losses >= RUN:
            out.append({
                "kind": "back_to_profit",
                "period": row.get("period") or "",
                "period_end": row["period_end"],
                "value": value,
                "run": losses,
                "since": run_from or "",
                "filed": row.get("filed") or "",
                "id": row.get("filing_id") or "",
                "link": _filing_link(row),
            })
        if negative:
            if losses == 0:
                run_from = row["period_end"]
            losses, profits = losses + 1, 0
        else:
            if profits == 0:
                run_from = row["period_end"]
            profits, losses = profits + 1, 0

    floor = (today - datetime.timedelta(days=FRESH_DAYS)).isoformat()
    return [row for row in out if row["period_end"] >= floor]


# --------------------------------------------------------------- 2. silence


def silence(filings: list[dict], today: datetime.date) -> dict | None:
    """Quiet for *this* company, measured against its own filing rhythm.

    The median of the last forty gaps rather than the mean: one three-month
    summer lull should not redefine normal for a company that otherwise files
    weekly.
    """
    days = sorted({(i.get("dateStamp") or "")[:10] for i in filings if i.get("dateStamp")})
    if len(days) < SILENT_MIN_FILINGS:
        return None
    dates = [d for d in (day(x) for x in days[-40:]) if d]
    gaps = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]
    if not gaps:
        return None
    typical = statistics.median(gaps)
    silent = (today - dates[-1]).days
    if typical < 1 or silent < max(SILENT_FLOOR, typical * SILENT_MULTIPLE):
        return None
    return {
        "last_filed": dates[-1].isoformat(),
        "silent_days": silent,
        "typical_gap": round(typical),
        "filings": len(filings),
    }


# ------------------------------------------------------- 3. first in years


def firsts_of_kind(filings: list[dict], today: datetime.date) -> list[dict]:
    """A filing type that had not been seen for years, and just was."""
    by_type: dict[str, list[dict]] = collections.defaultdict(list)
    for item in filings:
        arabic = (item.get("headingArabic") or "").strip()
        english = (item.get("heading") or "").strip()
        kind = ft.classify_rules(arabic) or ft.classify_rules(english)
        if kind in NOTABLE_TYPES and item.get("dateStamp"):
            by_type[kind].append(item)

    out = []
    for kind, items in by_type.items():
        items.sort(key=lambda i: i["dateStamp"], reverse=True)
        latest, previous = items[0], (items[1] if len(items) > 1 else None)
        when = day(latest["dateStamp"])
        if not when or (today - when).days > FRESH_DAYS:
            continue
        if previous is None:
            # Nothing to measure a gap against, and "the only one ever" is a
            # different claim than "the first in years" — say neither.
            continue
        before = day(previous["dateStamp"])
        if not before:
            continue
        gap = (when - before).days
        if gap < GAP_YEARS * 365:
            continue
        out.append({
            "kind": "first_of_type",
            "type": kind,
            "label": NOTABLE_TYPES[kind],
            "date": when.isoformat(),
            "previous": before.isoformat(),
            "gap_days": gap,
            "title": (latest.get("heading") or "").strip(),
            "title_ar": (latest.get("headingArabic") or "").strip(),
            "id": f"egx-{latest['code']}",
            "link": DETAIL.format(latest["code"]),
        })
    return sorted(out, key=lambda r: r["date"], reverse=True)


# ------------------------------------------------------- 4. results timing


def _lags() -> dict[str, dict[str, list[int]]]:
    """ticker → period label → the lags, in days, between period end and filing.

    Read from the same parse that builds the filed-profit figures, so the pair
    of dates is one the exchange itself published rather than two joined by a
    guess.
    """
    rows, _ = filed.egx_rows()
    out: dict[str, dict[str, list[int]]] = collections.defaultdict(
        lambda: collections.defaultdict(list)
    )
    for (ticker, label), row in rows.items():
        end, lodged = day(row.get("period_end")), day(row.get("filed"))
        if not end or not lodged:
            continue
        lag = (lodged - end).days
        if LAG_BAND[0] <= lag <= LAG_BAND[1]:
            out[ticker][label.split()[0]].append(lag)
    return out


def _next_ends(today: datetime.date, count: int = 2):
    """The next few period ends, soonest first."""
    ends = []
    for year in (today.year, today.year + 1):
        for label, month, dom in PERIOD_ENDS:
            end = datetime.date(year, month, dom)
            if end > today:
                ends.append((label, end))
    return sorted(ends, key=lambda pair: pair[1])[:count]


def expected_results(today: datetime.date | None = None) -> dict[str, list[dict]]:
    """ticker → the next results filings due, as windows rather than dates.

    A window, because the spread of a company's own lag is a month wide at the
    median. Printing "6 November" would claim a precision the record does not
    support; printing "between 28 October and 20 November, on the last twelve
    years of this company filing its nine-month figures" is what the data
    actually says.
    """
    today = today or datetime.date.today()
    out: dict[str, list[dict]] = {}
    for ticker, per_label in _lags().items():
        rows = []
        for label, end in _next_ends(today):
            lags = per_label.get(label) or []
            if len(lags) < MIN_OBSERVATIONS:
                continue
            middle = int(statistics.median(lags))
            rows.append({
                "label": label,
                "period_end": end.isoformat(),
                "expected": (end + datetime.timedelta(days=middle)).isoformat(),
                "window_start": (end + datetime.timedelta(days=min(lags))).isoformat(),
                "window_end": (end + datetime.timedelta(days=max(lags))).isoformat(),
                "observations": len(lags),
            })
        if rows:
            out[ticker] = rows
    return out


# ------------------------------------------------------------------- profile


def published_results_due() -> dict[str, list[dict]]:
    """`results_due` as the Signals step last published it.

    `build_calendar.py` wants these and nothing else in this file. Computing
    them means re-parsing 126,080 filing bodies, which the Signals step three
    entries earlier in `build_all` has already done — so read its answer, and
    only fall back to doing the work when there is no answer to read.
    """
    due: dict[str, list[dict]] = {}
    for path in sorted(glob.glob(str(OUT / "*.json"))):
        try:
            doc = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if rows := doc.get("results_due"):
            due[doc.get("ticker") or pathlib.Path(path).stem] = rows
    return due


def profile(ticker: str, filings: list[dict]) -> dict:
    """The facts that make this company's record different from any other's.

    Written for two readers: a person, on the company page, and the brief
    prompt in `build_company_briefs.py`. That second reader is the reason this
    exists in this shape — asked to *summarise* a filing list, a model produces
    the same paragraph for every issuer, because every issuer files results and
    holds assemblies. Sixty-eight of the first hundred and ten briefs contained
    the phrase "and extraordinary general meetings". Handed a company's
    distinguishing counts instead, it has something to say.
    """
    types: collections.Counter = collections.Counter()
    years: collections.Counter = collections.Counter()
    for item in filings:
        arabic = (item.get("headingArabic") or "").strip()
        english = (item.get("heading") or "").strip()
        kind = ft.classify_rules(arabic) or ft.classify_rules(english)
        if kind:
            types[kind] += 1
        stamp = (item.get("dateStamp") or "")[:4]
        if stamp:
            years[stamp] += 1

    rows = reported_periods(ticker)
    profits = [r for r in rows if r["net_income"] > 0]
    losses = [r for r in rows if r["net_income"] < 0]
    best = max(rows, key=lambda r: r["net_income"], default=None)
    worst = min(rows, key=lambda r: r["net_income"], default=None)
    busiest = years.most_common(1)[0] if years else None

    return {
        "filings": len(filings),
        "first_filing": (filings[-1].get("dateStamp") or "")[:10] if filings else None,
        "last_filing": (filings[0].get("dateStamp") or "")[:10] if filings else None,
        "busiest_year": busiest[0] if busiest else None,
        "busiest_year_filings": busiest[1] if busiest else 0,
        "by_type": dict(types.most_common(12)),
        "periods_reported": len(rows),
        "loss_making_periods": len(losses),
        "profitable_periods": len(profits),
        "best_period": {"period": best.get("period"), "net_income": best["net_income"]}
        if best else None,
        "worst_period": {"period": worst.get("period"), "net_income": worst["net_income"]}
        if worst else None,
        "first_reported": rows[0]["period_end"] if rows else None,
        "last_reported": rows[-1]["period_end"] if rows else None,
    }


# --------------------------------------------------------------------- build


def build(today: datetime.date) -> tuple[dict[str, dict], dict]:
    known = directory()
    archive = load_filings()
    due = expected_results(today)

    per_company: dict[str, dict] = {}
    recent_firsts: list[dict] = []
    quiet_now: list[dict] = []

    for ticker, filings in archive.items():
        company = known.get(ticker)
        if not company:
            continue
        breaks = streak_breaks(ticker, today)
        kinds = firsts_of_kind(filings, today)
        # Silence is only a signal for a company somebody can still trade. For
        # a delisted one it is the delisting, which the directory already says.
        hush = silence(filings, today) if company.get("tradable") else None
        signals = {
            "ticker": ticker,
            "generated": today.isoformat(),
            "streaks": breaks,
            "firsts": kinds,
            "quiet": hush,
            "results_due": due.get(ticker) or [],
            "profile": profile(ticker, filings),
        }
        per_company[ticker] = signals

        name = company.get("name_en") or ticker
        name_ar = company.get("name_ar") or ""
        for row in breaks:
            recent_firsts.append({"ticker": ticker, "name": name, "name_ar": name_ar, **row})
        for row in kinds:
            recent_firsts.append({"ticker": ticker, "name": name, "name_ar": name_ar, **row})
        if hush:
            quiet_now.append({"ticker": ticker, "name": name, "name_ar": name_ar, **hush})

    recent_firsts.sort(
        key=lambda r: r.get("date") or r.get("period_end") or "", reverse=True
    )
    quiet_now.sort(key=lambda r: -r["silent_days"])

    index = {
        "generated": today.isoformat(),
        "source": "EGX filings and filed net profit — counted, not judged",
        "firsts": recent_firsts[:120],
        "quiet": quiet_now,
        "companies": len(per_company),
    }
    return per_company, index


def write(per_company: dict[str, dict], index: dict) -> None:
    for root in (REPO / "public" / "data" / "v1", FIXTURES):
        if not root.exists():
            continue
        folder = root / "signals"
        folder.mkdir(parents=True, exist_ok=True)
        for ticker, doc in per_company.items():
            (folder / f"{ticker}.json").write_text(
                json.dumps(doc, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
        (root / "signals.json").write_text(
            json.dumps(index, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="report what would be written and write nothing")
    args = parser.parse_args()

    today = datetime.date.today()
    if not FILINGS.exists():
        print("── Signals: no filings harvest on disk — leaving the published "
              "documents alone")
        return 0

    per_company, index = build(today)
    streaks = sum(len(d["streaks"]) for d in per_company.values())
    kinds = sum(len(d["firsts"]) for d in per_company.values())
    due = sum(len(d["results_due"]) for d in per_company.values())
    print(f"── Signals: {len(per_company)} companies")
    print(f"   {streaks} streak breaks in the last {FRESH_DAYS} days")
    print(f"   {kinds} first-in-{GAP_YEARS}-years filings")
    print(f"   {len(index['quiet'])} tradable companies quiet against their own rhythm")
    print(f"   {due} results filings due, each as a window")
    if args.check:
        return 0
    write(per_company, index)
    print(f"   written to {OUT} and {INDEX.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
