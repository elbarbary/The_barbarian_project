#!/usr/bin/env python3
"""What moved outside Egypt, and where the exchange's own filings say it lands.

A world monitor that draws oil against the EGX index is decoration. The reader
is not asking what oil did — they can see that anywhere. They are asking *which
companies on this exchange have already told the regulator that this reaches
them, and how far.*

So this joins two things that are both documents:

  · what moved, and whether that is unusual FOR THAT SERIES — a move is placed
    against its own two years of same-length moves, so "oil fell 6% this week"
    becomes "a fall bigger than 94% of the weeks behind it". A record of the
    past, never a statement about the next one.

  · who filed a figure that the move reaches. Two channels, and only two,
    because these are the two the filings actually carry:

      RATES     borrowings, how much of them reprice within a year, and what
                the company already pays to carry them against what it earns.
      INPUTS    the gross margin — the cushion a company filed between what it
                sells for and what it cost to make. A company that filed an 8%
                margin has less room for any input cost than one that filed 60%.

WHAT THIS REFUSES TO DO
-----------------------
It does not say a move is good or bad for a share price, does not rank
companies, and does not forecast. Each list is the complete set of companies
that filed the figure — the cardinality belongs to the market, not to us — in
alphabetical order, with the filing each number came from beside it. An
exposure is a fact about a document, and the document is cited.
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import statistics

REPO = pathlib.Path(__file__).resolve().parent.parent
DATA = REPO / "public" / "data" / "v1"
RATES_HISTORY = DATA / "rates" / "history.json"
RATES_LATEST = DATA / "rates" / "latest.json"
INDEX_HISTORY = DATA / "market-history.json"
COMPANIES = DATA / "companies"
DIRECTORY = DATA / "companies.json"
INVESTORS = DATA / "investors.json"
STATEMENTS = pathlib.Path(__file__).resolve().parent / "pdf_statements_filed.json"
OUT = DATA / "world-monitor.json"

# A week, a month and a quarter of trading, in sessions.
WINDOWS = (("week", 5), ("month", 21), ("quarter", 63))
# Below this many prior observations a percentile is not a distribution, it is
# a coincidence with a number on it.
MIN_HISTORY = 120


def moves(closes: list[float], span: int) -> list[float]:
    """Every `span`-session change in the series, as percentages."""
    return [(closes[i] / closes[i - span] - 1) * 100
            for i in range(span, len(closes)) if closes[i - span]]


def unusual(change: float, history: list[float]) -> dict | None:
    """Where this move sits among the same-length moves behind it.

    Not a forecast and not a signal: the question is only whether a reader who
    saw every week of the last two years would find this one remarkable.
    """
    if len(history) < MIN_HISTORY:
        return None
    bigger = sum(1 for h in history if abs(h) > abs(change))
    return {
        "percentile": round((1 - bigger / len(history)) * 100, 1),
        "observations": len(history),
        "typical": round(statistics.median(abs(h) for h in history), 2),
    }


def series_moves(sessions: list[dict]) -> dict:
    closes = [s["close"] for s in sessions if isinstance(s.get("close"), (int, float))]
    out = {}
    for name, span in WINDOWS:
        if len(closes) <= span:
            continue
        change = (closes[-1] / closes[-1 - span] - 1) * 100 if closes[-1 - span] else None
        if change is None:
            continue
        out[name] = {"change": round(change, 2),
                     "against": unusual(change, moves(closes, span))}
    return out


def world() -> list[dict]:
    if not RATES_HISTORY.exists():
        return []
    document = json.loads(RATES_HISTORY.read_text(encoding="utf-8"))
    rows = []
    for series in document.get("series", []):
        sessions = series.get("sessions") or []
        if len(sessions) <= WINDOWS[-1][1]:
            continue
        rows.append({
            "id": series.get("id"),
            "label": series.get("label"),
            "source": series.get("source"),
            "asOf": sessions[-1]["date"],
            "close": sessions[-1]["close"],
            "moves": series_moves(sessions),
        })
    return sorted(rows, key=lambda r: r["label"] or "")


# The market history is one row per session carrying every index, rather than
# one series per index — so the series has to be lifted out of it.
EXCHANGE_INDICES = (("EGX30", "EGX 30"), ("EGX70EWI", "EGX 70"), ("EGX100EWI", "EGX 100"))


def exchange() -> list[dict]:
    """The EGX's own indices over the same windows, given the same treatment.

    The point of the monitor is the comparison: a week that was remarkable for
    oil and ordinary for this exchange is a different fact from one that was
    remarkable for both, and neither is worth anything without the other.
    """
    if not INDEX_HISTORY.exists():
        return []
    document = json.loads(INDEX_HISTORY.read_text(encoding="utf-8"))
    rows = []
    for key, label in EXCHANGE_INDICES:
        sessions = []
        for session in document.get("sessions") or []:
            level = ((session.get("indices") or {}).get(key))
            if isinstance(level, (int, float)) and session.get("date"):
                sessions.append({"date": session["date"], "close": level})
        sessions.sort(key=lambda s: s["date"])
        if len(sessions) <= WINDOWS[-1][1]:
            continue
        rows.append({"id": key, "label": label, "asOf": sessions[-1]["date"],
                     "close": sessions[-1]["close"], "sessions": len(sessions),
                     "moves": series_moves(sessions)})
    return rows


def filed_statements() -> dict:
    """The newest read statement per company."""
    if not STATEMENTS.exists():
        return {}
    document = json.loads(STATEMENTS.read_text(encoding="utf-8"))
    newest = {}
    for filing, row in (document.get("filings") or {}).items():
        ticker = row.get("ticker")
        if not ticker:
            continue
        held = newest.get(ticker)
        if held and (held.get("period_end") or "") >= (row.get("period_end") or ""):
            continue
        newest[ticker] = dict(row, filingId=filing)
    return newest


def carrying_debt(names: dict) -> list[dict]:
    """Every company whose filed balance sheet shows money owed to lenders."""
    rows = []
    for path in sorted(COMPANIES.glob("*.json")):
        try:
            document = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        debt = document.get("debt") or {}
        total = debt.get("borrowings")
        if not isinstance(total, (int, float)) or total <= 0:
            continue
        short = debt.get("short_term")
        cost = debt.get("finance_cost")
        # ACTF filed borrowings of 0.167m and a finance cost of 130m. One of
        # those two numbers does not describe the other — the debt may have
        # been repaid inside the period, or the cost may cover leases, or one
        # was misread. Whichever it is, a reader asked to judge rate exposure
        # from the balance sheet figure alone should be told the two filed
        # numbers do not sit together.
        odd = (isinstance(cost, (int, float)) and cost > total)
        shown_total = round(total, 3)
        shown_short = round(short, 3) if isinstance(short, (int, float)) else None
        rows.append({
            "ticker": document.get("ticker"),
            "name": names.get(document.get("ticker")),
            "sector": document.get("sector"),
            "borrowings": shown_total,
            "shortTerm": shown_short,
            "repricingWithinAYear": (round(shown_short / shown_total * 100, 1)
                                     if shown_short is not None and shown_total else None),
            "financeCost": cost,
            "costExceedsBorrowings": odd or None,
            "cover": debt.get("cover"),
            "period": debt.get("period"),
            "asOf": debt.get("as_of"),
            "filingId": debt.get("filing_id"),
            "source": debt.get("source"),
        })
    return rows


def margins(names: dict) -> list[dict]:
    """The cushion each company filed between what it sells for and what it cost."""
    rows = []
    for ticker, row in sorted(filed_statements().items()):
        fields = row.get("fields") or {}
        revenue, gross = fields.get("revenue"), fields.get("gross_profit")
        if not isinstance(revenue, (int, float)) or revenue <= 0:
            continue
        if not isinstance(gross, (int, float)):
            continue
        # Derived from the figures as PUBLISHED, not as read. A reader who
        # divides the two numbers printed beside the ratio has to get the
        # ratio: AMPI filed revenue of 377,000, and rounding that to three
        # places before dividing moved its margin by a sixth of a point.
        shown_revenue = round(revenue, 3)
        shown_gross = round(gross, 3)
        rows.append({
            "ticker": ticker,
            "name": names.get(ticker),
            "revenue": shown_revenue,
            "grossProfit": shown_gross,
            "grossMargin": round(shown_gross / shown_revenue * 100, 1),
            "period": row.get("period"),
            "periodEnd": row.get("period_end"),
            "filingId": row.get("filingId"),
            "source": row.get("attachment_url") or row.get("source"),
        })
    return rows


def foreign_money() -> dict | None:
    if not INVESTORS.exists():
        return None
    document = json.loads(INVESTORS.read_text(encoding="utf-8"))
    return {
        "asOf": document.get("as_of"),
        "basis": document.get("basis"),
        "source": document.get("source"),
        "byNationality": document.get("by_nationality"),
        "note": "The exchange states these for its current reporting period to "
                "date, not for one session, and resets them when it starts a "
                "new period. A rise here is not money arriving today.",
    }


def build() -> dict:
    directory = json.loads(DIRECTORY.read_text(encoding="utf-8")).get("companies", [])
    names = {c["ticker"]: c.get("name_en") or c.get("name_ar") or c["ticker"]
             for c in directory if c.get("ticker")}
    debt_rows = carrying_debt(names)
    margin_rows = margins(names)
    return {
        "schemaVersion": 1,
        "generated": datetime.datetime.now(datetime.timezone.utc)
            .isoformat(timespec="seconds").replace("+00:00", "Z"),
        "basis": "A move is placed against its own two years of same-length "
                 "moves — a record of what has already happened, never a "
                 "statement about the next one. Each list of companies is the "
                 "complete set that filed the figure, in alphabetical order, "
                 "with the filing beside it. Nothing here says what any of it "
                 "means for a share price.",
        "basisAr": "تُقاس كل حركة مقابل سنتين من حركات بالطول نفسه — سجل لما حدث "
                   "بالفعل، وليس قولاً عما سيحدث. وكل قائمة شركات هي المجموعة "
                   "الكاملة التي أودعت الرقم، بالترتيب الأبجدي، ومعها الإفصاح "
                   "الذي جاء منه. ولا شيء هنا يقول ماذا يعني ذلك لسعر أي سهم.",
        "windows": [{"id": name, "sessions": span} for name, span in WINDOWS],
        "world": world(),
        "exchange": exchange(),
        "channels": [
            {
                "id": "rates",
                "question": "Where does a change in the cost of money land?",
                "questionAr": "أين تصل تغيرات تكلفة الاقتراض؟",
                "filter": "every company whose filed balance sheet shows borrowings",
                "filterAr": "كل شركة تُظهر ميزانيتها المودعة قروضاً",
                "count": len(debt_rows),
                "companies": debt_rows,
            },
            {
                "id": "inputs",
                "question": "Where does a change in what things cost land?",
                "questionAr": "أين تصل تغيرات تكلفة المدخلات؟",
                "filter": "every company whose filed statement shows revenue and "
                          "gross profit, giving the cushion between them",
                "filterAr": "كل شركة تُظهر قوائمها المودعة إيرادات ومجمل ربح، "
                            "فيظهر الفارق بينهما",
                "count": len(margin_rows),
                "companies": margin_rows,
            },
        ],
        "foreignMoney": foreign_money(),
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="build and report, write nothing")
    args = parser.parse_args(argv)
    document = build()
    if not document["world"]:
        print("   no world history yet — run rate_history.py")
        return 0
    if not args.check:
        tmp = OUT.with_suffix(".tmp")
        tmp.write_text(json.dumps(document, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(OUT)
    counts = " · ".join(f"{c['id']} {c['count']}" for c in document["channels"])
    print(f"   World monitor: {len(document['world'])} world series, {counts}"
          + (" (check ok)" if args.check else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
