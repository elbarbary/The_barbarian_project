#!/usr/bin/env python3
"""One table: every listed company, every measurement a rulebook may test.

WHY THIS FILE EXISTS
--------------------
A reader writes their own rulebook — "volume at least three times normal, a
filing in the last week, not already up twenty per cent" — and the site runs
it over the whole market and shows every company that matches, with the count
and the denominator beside it. The rules run in the reader's browser; this
file is the table they run over.

That arrangement is the point. The reader chooses which measurements count,
what the thresholds are and how many names come back; the publisher supplies
arithmetic and the filings behind it. Nothing here ranks companies, scores
them, or decides how many are worth looking at.

WHAT MAY NEVER BE A COLUMN
--------------------------
**No forecast.** Not a predicted return, not a probability, not a model
output under any name. A reader selecting on a published forecast does not
make it less of a published forecast about a named security. `no_forecasts()`
below fails the build if one ever appears, and a test fails if that guard is
removed.

**No composite.** No opportunity score, no rating, no "attractiveness". The
playbook's points table assembles these components into a judgment; that
assembly is the reader's to make, or nobody's. Components only.

**Nothing the reader cannot check.** Every measurement names the session or
the filing it came from, so a row can be opened and verified.

ABSENCE IS THREE DIFFERENT ANSWERS
----------------------------------
`None` is "could not be computed" — too little history, a denominator of
zero, a figure never filed. `0` is a measured nought and is kept. There are
no sentinels. `measures.py` holds the arithmetic and the reasoning; the
comparison semantics that make `None` never match a rule live in the reader's
engine, `public/esthmr/rulebook.js`.

COVERAGE IS PUBLISHED, NOT ASSUMED
----------------------------------
Measured on 14 September 2026 against 283 listed companies: 257 have the 21
sessions relative volume needs, 26 do not (four bars, two bars — new
listings); four have a twenty-session median volume of zero, so their
relative volume is undefined rather than infinite; 245 carry a market
capitalisation and 179 a revenue figure, which is what bounds the materiality
ratios; 85 filed within the week and 38 have filed nothing in four months.
Every one of those denominators ships in the document, because a column that
is absent for a third of the market is a different instrument from one that
is absent for none, and a reader writing a rule has to be able to see which.
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

import filing_types as ft
import measures as ms

REPO = pathlib.Path(__file__).resolve().parent.parent
PRICES = REPO / "data-source" / "prices"
FILINGS = REPO / "data-source" / "egx-beta" / "filings"
DATA = REPO / "public" / "data" / "v1"
MARKET = DATA / "market.json"
DIRECTORY = DATA / "companies.json"
COMPANIES = DATA / "companies"
SIGNALS = DATA / "signals"
OUT = DATA / "measures.json"
FIXTURES = REPO / "app" / "assets" / "fixtures"

TICKER = re.compile(r"\(([A-Z0-9]{2,8})\.CA\)")

# How far back to read the filing archive for "has this company filed lately".
# Four months covers the longest cohort the playbook keeps open (twenty
# sessions of ownership follow-through) with room for a late attachment.
FILING_MONTHS = 4

# Every column this document may carry, and what it is.
#
# This is not documentation. `no_forecasts()` checks published rows against
# it, so a column added to the builder and forgotten here fails the build —
# which is the whole defence against a forecast arriving quietly as a field.
COLUMNS: dict[str, str] = {
    # — identity ——————————————————————————————————————————————————
    "ticker": "The exchange's code for the company.",
    "sector": "The sector the exchange files it under.",
    "as_of": "The date of the newest session behind this row.",
    # — the tape, from this company's own record ————————————————————
    "close": "Last completed close, in pounds.",
    "volume": "Shares traded in that session.",
    "traded_value": "Close times volume, in pounds.",
    "median_volume_20": "Median volume of the previous 20 sessions — the denominator.",
    "median_traded_value_20": "Median traded value of the previous 20 sessions, in pounds.",
    "relative_volume_20": "Volume against that median. Undefined when the median is zero.",
    "change_1": "Percentage change over 1 completed session.",
    "change_5": "Percentage change over 5 completed sessions.",
    "change_20": "Percentage change over 20 completed sessions.",
    "big_move_5": "Sessions in the last 5 that moved at least 19.5% on the close.",
    "sessions_held": "How many completed sessions this company's archive holds.",
    # — what it has filed ——————————————————————————————————————————
    "last_filing_date": "Publication date of its newest filing.",
    "sessions_since_filing": "Completed sessions since that filing.",
    "filings_30d": "Filings published in the last 30 days.",
    "last_filing_type": "The classified type of that newest filing.",
    "last_filing_title": "Its heading, as filed.",
    "last_filing_id": "The exchange's id for it, so the row opens the source.",
    # — what its statements say ————————————————————————————————————
    "market_cap": "Market capitalisation, in pounds — a materiality denominator.",
    "revenue": "Newest filed revenue, in millions of pounds.",
    "revenue_period": "The period that revenue covers.",
    "net_income": "Newest filed net profit, in millions of pounds.",
    "net_income_period": "The period that profit covers.",
    "net_income_growth": "Against the same period a year earlier. Refused out of a loss.",
    "eps": "Filed earnings per share.",
    "pe": "Price over filed earnings per share.",
    # — what its own record says is unusual, from build_signals.py ——
    "streak_break": "A first loss after profits, or a first profit after losses.",
    "streak_break_date": "When that was filed.",
    "first_in_years": "A filing type this company has not made in years.",
    "first_in_years_gap_days": "How long since the previous one.",
    "quiet_days": "Days silent, for a company that files often. Null when not unusual for it.",
    "results_due_from": "Start of the window its results are expected in, from its own history.",
    "results_due_to": "End of that window.",
    # — what is not known ——————————————————————————————————————————
    "missing": "The columns this row could not compute, so a rule can say why.",
}

# Columns that describe an EVENT rather than a measurement. They are absent
# for most companies because most companies did not break a profit streak
# this quarter — not because anything failed to collect. Reported apart from
# thin coverage so a rare column is never mistaken for a gap to go and fill.
EVENT_COLUMNS = frozenset({
    "streak_break", "streak_break_date",
    "first_in_years", "first_in_years_gap_days",
    "quiet_days",
})

# Substrings that may never appear in a column name. A forecast arriving as a
# field is the one failure that would turn this table into the product §8
# forbids, and it would arrive looking like an ordinary column.
FORECAST_WORDS = ("forecast", "predict", "target", "expected_return", "probability",
                  "score", "rank", "rating", "opportunity", "signal_strength",
                  "upside", "downside", "recommend", "conviction")


def no_forecasts(rows: list[dict]) -> None:
    """Refuse to publish a table carrying anything but declared measurements.

    Two checks, because they fail differently. An UNDECLARED column is a
    column somebody added without writing down what it is — usually harmless,
    occasionally a forecast. A column whose NAME reads like a forecast is the
    thing this table exists to keep out, and it is checked by name rather
    than by value because a probability and a ratio are both floats.

    `results_due_from` survives the name check on purpose: a window in which
    a company's own filing history says it will REPORT is a statement about a
    disclosure date, not about a price. `build_signals.py` argues that at
    length and publishes it already.
    """
    declared = set(COLUMNS)
    for row in rows:
        unknown = set(row) - declared
        if unknown:
            raise SystemExit(f"measures: undeclared column(s) {sorted(unknown)} — "
                             "add them to COLUMNS with what they are, or drop them")
    for name in declared:
        if name.startswith("results_due"):
            continue
        lowered = name.lower()
        for word in FORECAST_WORDS:
            if word in lowered:
                raise SystemExit(f"measures: column '{name}' reads as a forecast or a "
                                 "ranking. This table carries measurements only.")


def bars_for(ticker: str) -> list[dict]:
    path = PRICES / f"{ticker}.json"
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8")).get("bars") or []
    except (OSError, ValueError):
        return []


def filings_by_ticker(today: datetime.date) -> dict[str, list[dict]]:
    """The last few months of the archive, keyed by the ticker in the heading.

    The exchange puts the code in the title — "… (COMI.CA) …" — and nowhere
    else on the record, which is why this reads the heading rather than a
    field. `build_signals.py` does the same, for the same reason.
    """
    months = []
    day = today.replace(day=1)
    for _ in range(FILING_MONTHS):
        months.append(f"{day.year:04d}-{day.month:02d}")
        day = (day - datetime.timedelta(days=1)).replace(day=1)
    out: dict[str, list[dict]] = collections.defaultdict(list)
    for month in months:
        path = FILINGS / f"{month}.json.gz"
        if not path.exists():
            continue
        try:
            doc = json.loads(gzip.open(path).read())
        except (OSError, ValueError):
            continue
        for item in doc.get("items") or []:
            found = TICKER.search(item.get("heading") or "")
            if found:
                out[found.group(1)].append(item)
    for rows in out.values():
        rows.sort(key=lambda r: str(r.get("dateStamp") or ""))
    return out


def filed_figures(ticker: str) -> dict:
    """Newest revenue and net profit, and profit against the year before.

    Read from the published company file rather than recomputed, so a reader
    who opens the company screen sees the same figures this row was built
    from. 179 of 283 companies carry a revenue figure and 247 a net profit;
    the rest leave those columns absent and say so in `missing`.
    """
    path = COMPANIES / f"{ticker}.json"
    if not path.exists():
        return {}
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    periods = [row for kind in ("annual", "quarterly")
               for row in (doc.get("financials") or {}).get(kind) or []]
    periods.sort(key=lambda r: str(r.get("period_end") or r.get("filed") or ""))

    out: dict = {}
    revenue = [r for r in periods if isinstance(r.get("revenue"), (int, float))]
    if revenue:
        out["revenue"] = revenue[-1]["revenue"]
        out["revenue_period"] = revenue[-1].get("period")
    profit = [r for r in periods if isinstance(r.get("net_income"), (int, float))]
    if profit:
        newest = profit[-1]
        out["net_income"] = newest["net_income"]
        out["net_income_period"] = newest.get("period")
        # Against the same period a year earlier, not against the sequence's
        # previous entry: a quarter compared with the quarter before it reads
        # every seasonal business as collapsing and recovering by turns.
        label = str(newest.get("period") or "")
        year = re.search(r"(19|20)\d{2}", label)
        if year:
            want = label.replace(year.group(0), str(int(year.group(0)) - 1))
            prior = next((r for r in profit if str(r.get("period")) == want), None)
            if prior:
                out["net_income_growth"] = ms.growth(newest["net_income"],
                                                     prior["net_income"])
    return out


def own_signals(ticker: str) -> dict:
    """What this company's own filing record already says is unusual.

    `build_signals.py` has counted streak breaks, first-in-years events,
    unusual silence and expected reporting windows across 126,080 filings
    since long before this table existed. Recomputing any of it here would be
    a second answer to a question already answered.
    """
    path = SIGNALS / f"{ticker}.json"
    if not path.exists():
        return {}
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    out: dict = {}
    streaks = doc.get("streaks") or []
    if streaks:
        out["streak_break"] = streaks[0].get("kind")
        # `filed`, not `date`, which the streak record does not have. This is
        # the day the market LEARNED — the filing that broke the run was
        # published then — rather than the period it refers to, because a
        # reader asking "who broke a streak recently" means recently in their
        # own reading, not in the issuer's accounting calendar.
        out["streak_break_date"] = streaks[0].get("filed")
    firsts = doc.get("firsts") or []
    if firsts:
        out["first_in_years"] = firsts[0].get("type")
        out["first_in_years_gap_days"] = firsts[0].get("gap_days")
    quiet = doc.get("quiet")
    if isinstance(quiet, dict):
        # `silent_days`, which is what the signals document actually calls it.
        # This asked for `days` and got None for every company on the exchange
        # from the day it was written: a column declared, published, offered
        # to readers to build rules on, and empty in all 283 rows. Nothing
        # crashed, because a missing measurement is a legitimate answer here —
        # which is exactly why `coverage()` below now refuses a column that is
        # empty for everyone.
        out["quiet_days"] = quiet.get("silent_days")
    due = doc.get("results_due") or []
    if due:
        # `window_start` / `window_end`, which is what the signals document
        # calls them. These asked for `from` and `to` and got None for every
        # company, the same way `quiet_days` did — three declared columns,
        # published, empty in all 283 rows, and offered to readers to write
        # rules against. "Companies whose results are due in the next two
        # weeks" is one of the most useful questions this table can answer
        # and it could not be asked at all.
        out["results_due_from"] = due[0].get("window_start")
        out["results_due_to"] = due[0].get("window_end")
    return out


def row_for(ticker: str, session: dict, directory: dict,
            filings: list[dict], today: datetime.date) -> dict:
    """One company, every column it can answer for.

    A column it cannot answer for is left out of the row entirely rather than
    written as null, and its name is listed in `missing`. Two reasons: the
    document is a third of the size, and a rule that asks about a column can
    tell "this company has no revenue figure" from "this company's revenue is
    nought" without a special case at every comparison.
    """
    bars = bars_for(ticker)
    row: dict = {"ticker": ticker}

    sector = (directory.get("sector") or "").strip()
    if sector:
        row["sector"] = sector

    stamp = ms.as_of(bars)
    if stamp:
        row["as_of"] = stamp
        row["sessions_held"] = len([b for b in bars
                                    if isinstance(b.get("close"), (int, float))])

    close = session.get("close")
    if isinstance(close, (int, float)):
        row["close"] = close
    volume = session.get("volume")
    if isinstance(volume, (int, float)):
        row["volume"] = volume

    for name, value in (("traded_value", ms.traded_value(bars)),
                        ("median_volume_20", ms.median_volume(bars)),
                        ("median_traded_value_20", ms.median_traded_value(bars)),
                        ("relative_volume_20", ms.rv20(bars)),
                        ("change_1", ms.change_over(bars, 1)),
                        ("change_5", ms.change_over(bars, 5)),
                        ("change_20", ms.change_over(bars, 20)),
                        ("big_move_5", ms.big_move_sessions(bars, 5))):
        if value is not None:
            row[name] = value

    if filings:
        newest = filings[-1]
        when = str(newest.get("dateStamp") or "")[:10]
        if when:
            row["last_filing_date"] = when
            since = ms.sessions_since(bars, when)
            if since is not None:
                row["sessions_since_filing"] = since
        code = newest.get("code")
        if code is not None:
            row["last_filing_id"] = code
        heading = (newest.get("heading") or "").strip()
        if heading:
            row["last_filing_title"] = heading
        # Classified from the ARABIC heading. `filing_types.RULES` are Arabic
        # patterns — نتائج أعمال, أسهم مجانية, نموذج إفصاح — because that is
        # the language the exchange files in and the English title is a
        # translation that says "Regarding a Disclosure Form" for four
        # different kinds of event. Handing it the English one classified
        # nothing at all.
        kind = ft.classify_rules(newest.get("headingArabic") or "")
        if kind:
            row["last_filing_type"] = kind
        cutoff = (today - datetime.timedelta(days=30)).isoformat()
        row["filings_30d"] = sum(1 for f in filings
                                 if str(f.get("dateStamp") or "")[:10] >= cutoff)

    for name in ("market_cap", "eps", "pe"):
        value = directory.get(name)
        if isinstance(value, (int, float)) and value != 0:
            row[name] = value

    row.update(filed_figures(ticker))
    row.update(own_signals(ticker))

    # What this company could not answer, so a reader's rule can say why a
    # company is not in their results rather than leaving them to guess.
    row["missing"] = sorted(set(COLUMNS) - set(row) - {"missing"})
    return row


def breadth(rows: list[dict]) -> dict:
    """What the whole market did this session, with nothing left over.

    WHY THIS IS THE ONE FIGURE THE HOME SCREEN CAN LEAD WITH
    --------------------------------------------------------
    It describes the market rather than selecting from it. "168 of 269 fell"
    picks no company, ranks nothing, and cannot be read as a suggestion —
    and it is genuinely the first thing a reader wants, because it says
    whether what they are about to look at is an isolated move or the tide.

    EXHAUSTIVE AND MUTUALLY EXCLUSIVE, OR IT IS A LIE
    ------------------------------------------------
    Every listing lands in exactly one bucket and the buckets sum to the
    market. That is checked here rather than trusted, because the failure is
    silent and specific: 38 companies did not trade at all today and 9 traded
    and closed level. Folding those together into "47 unchanged" would tell a
    reader that 47 companies were steady, when 38 of them had no buyer. On
    this exchange that distinction is most of what a newcomer needs to
    understand, and it is exactly the one a tidier summary throws away.

    A company with no volume figure at all is its own bucket too. It is not
    evidence of a quiet day; it is evidence of a gap in what we hold.
    """
    rose = fell = level = idle = unmeasured = 0
    for row in rows:
        volume = row.get("volume")
        change = row.get("change_1")
        if not isinstance(volume, (int, float)):
            unmeasured += 1
        elif volume <= 0:
            idle += 1
        elif not isinstance(change, (int, float)):
            unmeasured += 1
        elif change > 0:
            rose += 1
        elif change < 0:
            fell += 1
        else:
            level += 1

    out = {
        "listed": len(rows),
        "rose": rose,
        "fell": fell,
        "level": level,
        "idle": idle,
        "unmeasured": unmeasured,
        "traded": rose + fell + level,
        "what": "Every listing in exactly one of five states. `level` traded "
                "and closed where it opened the day; `idle` found no buyer at "
                "all; `unmeasured` is a gap in what this project holds, not a "
                "quiet company. Folding the last two together would report a "
                "company nobody would buy as a company that held steady.",
    }
    counted = rose + fell + level + idle + unmeasured
    if counted != len(rows):
        raise SystemExit(
            f"measures: breadth counted {counted} of {len(rows)} listings. "
            "These states have to be exhaustive and exclusive or the summary "
            "is arithmetic that does not describe the market.")
    return out


def coverage(rows: list[dict]) -> dict:
    """How many companies can answer each column.

    Published with the table because a rule written against a column that
    two thirds of the market cannot answer is a rule about data availability
    wearing the costume of a rule about companies.
    """
    counts = {name: sum(1 for r in rows if name in r) for name in COLUMNS
              if name != "missing"}
    return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))


def build(today: datetime.date | None = None) -> dict:
    today = today or datetime.date.today()
    market = json.loads(MARKET.read_text(encoding="utf-8"))
    stocks = market.get("stocks") or {}

    listed = json.loads(DIRECTORY.read_text(encoding="utf-8"))
    listed = listed if isinstance(listed, list) else (listed.get("companies") or [])
    directory = {r["ticker"]: r for r in listed
                 if isinstance(r, dict) and r.get("ticker")}

    filings = filings_by_ticker(today)

    rows = [row_for(ticker, stocks[ticker] or {}, directory.get(ticker, {}),
                    filings.get(ticker) or [], today)
            for ticker in sorted(stocks)]
    no_forecasts(rows)

    return {
        "schemaVersion": 1,
        "generated": datetime.datetime.now(datetime.timezone.utc)
            .isoformat(timespec="seconds").replace("+00:00", "Z"),
        "market_date": market.get("date"),
        "is_close": market.get("is_close"),
        # Said in the document rather than only on the screen, because the
        # document is what the app, the site and anyone reading the JSON all
        # see, and this is the sentence that makes the table what it is.
        "basis": "Every figure is a measurement of what has already happened, "
                 "with the session or filing it came from. There is no "
                 "forecast here, no score, and no list chosen by the "
                 "publisher: a reader's own rule decides which companies "
                 "appear and how many.",
        "basis_ar": "كل رقم هنا قياس لما حدث بالفعل، ومعه الجلسة أو الإفصاح "
                    "الذي جاء منه. لا توجد توقعات ولا تقييمات ولا قائمة "
                    "يختارها الناشر: قاعدة القارئ نفسه هي التي تحدد أي "
                    "الشركات تظهر وكم عددها.",
        "columns": COLUMNS,
        "coverage": coverage(rows),
        "breadth": breadth(rows),
        "companies": len(rows),
        "rows": rows,
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="build and report, write nothing")
    args = parser.parse_args(argv)

    doc = build()
    rows = doc["rows"]
    counts = doc["coverage"]
    print(f"   {len(rows)} companies, {len(COLUMNS) - 1} measurements")
    b = doc["breadth"]
    print(f"   session: {b['rose']} rose, {b['fell']} fell, {b['level']} "
          f"traded level, {b['idle']} found no buyer"
          + (f", {b['unmeasured']} not measured" if b["unmeasured"] else ""))
    for name in ("relative_volume_20", "market_cap", "revenue",
                 "sessions_since_filing", "net_income_growth"):
        if name in counts:
            print(f"   {counts[name]:>4}/{len(rows)}  {name}")
    # A column absent because the DATA is absent, reported separately from one
    # absent because the EVENT did not happen. Twenty-three companies carry a
    # streak break not because the other 260 are missing data but because they
    # did not break a streak — that column is rare on purpose and listing it
    # as thin coverage would read as a gap to go and fill.
    thin = [n for n, c in counts.items()
            if c < len(rows) * 0.5 and n not in EVENT_COLUMNS]
    if thin:
        print(f"   thin data (under half the market): {', '.join(thin[:8])}")
    # A column NOBODY can answer is not a rare event. It is a bug, or a
    # column that should not be declared, and either way it must not sit in a
    # published table looking like a measurement a reader can build a rule on.
    #
    # Four did, for as long as this table has existed: `quiet_days` asked the
    # signals document for `days` where it says `silent_days`,
    # `streak_break_date` asked for `date` where it says `filed`, and both
    # results-due columns asked for `from`/`to` where it says
    # `window_start`/`window_end`. All four were empty in all 283 rows and
    # nothing complained, because a missing measurement is a legitimate
    # answer here — which is precisely what made them invisible. The
    # results-due pair covers 200 companies once asked correctly, and
    # "results due in the next fortnight" is among the most useful questions
    # this table can answer.
    empty = sorted(n for n, c in counts.items() if c == 0)
    if empty:
        raise SystemExit(
            "measures: no company on the exchange can answer "
            + ", ".join(empty)
            + ". A column nobody can answer is a key that does not exist or a "
              "measurement that should not be declared — not a rare event.")

    rare = {n: counts.get(n, 0) for n in EVENT_COLUMNS if n in counts}
    if rare:
        print("   rare by nature: "
              + ", ".join(f"{n} {c}" for n, c in sorted(rare.items())))

    if args.check:
        return 0
    body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    OUT.write_text(body, encoding="utf-8")
    # And the app's cold-start copy, byte for byte. `build_fixtures.py` refuses
    # to publish when the two differ: a phone that opens on one dataset and
    # refreshes into another shows a reader's rule matching two different
    # markets a second apart.
    if FIXTURES.exists():
        (FIXTURES / "measures.json").write_text(body, encoding="utf-8")
    print(f"   wrote {OUT.relative_to(REPO)} ({OUT.stat().st_size // 1024} KB)"
          + (" and the app fixture" if FIXTURES.exists() else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
