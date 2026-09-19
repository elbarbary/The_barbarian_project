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

  · who filed a figure that the move reaches. Three channels, because these
    are the three the filings actually carry:

      RATES     borrowings, how much of them reprice within a year, and what
                the company already pays to carry them against what it earns.
      INPUTS    the gross margin — the cushion a company filed between what it
                sells for and what it cost to make. A company that filed an 8%
                margin has less room for any input cost than one that filed 60%.
      CURRENCY  the foreign-currency note: the net position held in each
                currency, and the exchange gain or loss already recognised,
                against the profit of the same filing. Read by
                build_currency_notes.py, which keeps a figure only where two
                independent reads of the filing produced it. The translation
                policy every statement carries is not an exposure and is not
                counted — it would make all 193 companies "currency exposed",
                which is true and useless.

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

import rates_ar

REPO = pathlib.Path(__file__).resolve().parent.parent
DATA = REPO / "public" / "data" / "v1"
RATES_HISTORY = DATA / "rates" / "history.json"
RATES_LATEST = DATA / "rates" / "latest.json"
INDEX_HISTORY = DATA / "market-history.json"
COMPANIES = DATA / "companies"
DIRECTORY = DATA / "companies.json"
INVESTORS = DATA / "investors.json"
CURRENCY = pathlib.Path(__file__).resolve().parent / "currency_notes.json"
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


# The four rates the MPC sets, as they are published in rates/latest.json.
#
# Keyed by the id build_rates_api gives them rather than by label, because a
# label is display text somebody will reword and an id is a join.
CORRIDOR_IDS = {"floor": "EGY_DEPOSIT", "ceiling": "EGY_LENDING",
                "main": "EGY_MAIN", "discount": "EGY_DISCOUNT",
                "paid": "EGY_ON"}


def corridor() -> dict | None:
    """Where the market's own rate sits between the walls the committee set.

    The monitor draws series, and four of these five are not series: a policy
    rate does not move between decisions, so a line of it is a flat line and a
    percentile of it is meaningless. They are published here as one figure
    instead — a floor, a ceiling, and the one number that moves shown at its
    place between them.

    The reason it belongs on this screen at all is that every other row is
    somewhere else. A reader looking at copper and the S&P to decide about an
    Egyptian company needs to know what money costs here, because that is the
    rate every listed company's borrowings are priced off and the return a
    saver gets for not owning any of them.
    """
    if not RATES_LATEST.exists():
        return None
    try:
        document = json.loads(RATES_LATEST.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    by_id = {row.get("id"): row for row in document.get("egypt") or []}
    have = {name: by_id.get(code) for name, code in CORRIDOR_IDS.items()}
    floor, ceiling = have["floor"], have["ceiling"]
    # A floor without a ceiling is not a corridor, and drawing one wall would
    # invite a reader to read the other from where the marker sits.
    if not floor or not ceiling:
        return None
    if not isinstance(floor.get("percent"), (int, float)):
        return None
    if not isinstance(ceiling.get("percent"), (int, float)):
        return None
    if ceiling["percent"] <= floor["percent"]:
        return None

    def rate(row):
        if not row or not isinstance(row.get("percent"), (int, float)):
            return None
        return {"label": row.get("label"), "labelAr": row.get("label_ar"),
                "percent": row["percent"], "token": row.get("token"),
                "asOf": row.get("as_of"),
                "carried": bool(row.get("carried"))}

    paid = rate(have["paid"])
    out = {
        "floor": rate(floor),
        "ceiling": rate(ceiling),
        "main": rate(have["main"]),
        "discount": rate(have["discount"]),
        "paid": paid,
        "source": floor.get("source"),
    }
    if paid:
        # Where the marker goes, 0 at the floor and 1 at the ceiling. Clamped,
        # because build_rates_api already refuses a reading more than a point
        # outside the walls and a marker half off the figure would be a worse
        # way to say the same thing than the number beside it.
        span = ceiling["percent"] - floor["percent"]
        raw = (paid["percent"] - floor["percent"]) / span
        out["at"] = round(min(1.0, max(0.0, raw)), 4)
        out["inside"] = 0.0 <= raw <= 1.0
    return out


def arabic_labels() -> dict[str, str]:
    """English label -> Arabic label, from every row of rates/latest.json that
    carries both. Cached after the first read."""
    if not hasattr(arabic_labels, "_map"):
        found: dict[str, str] = {}
        if RATES_LATEST.exists():
            def walk(node):
                if isinstance(node, dict):
                    if node.get("label") and node.get("label_ar"):
                        found.setdefault(str(node["label"]), str(node["label_ar"]))
                    for v in node.values():
                        walk(v)
                elif isinstance(node, list):
                    for v in node:
                        walk(v)
            walk(json.loads(RATES_LATEST.read_text(encoding="utf-8")))
        arabic_labels._map = found
    return arabic_labels._map


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
            # rates/history.json names its series in English only; the Arabic
            # lives beside the same label in rates/latest.json. Without it the
            # monitor printed "Euro" and "Copper" under Arabic headings.
            "labelAr": arabic_labels().get(series.get("label")) or rates_ar.label(series.get("id") or "", ""),
            "group": series.get("group") or "world",
            "source": series.get("source"),
            "asOf": sessions[-1]["date"],
            "close": sessions[-1]["close"],
            "moves": series_moves(sessions),
        })
    # Grouped by what the thing IS, then alphabetically inside each group. Flat
    # alphabetical put the euro between copper and the FTSE, which reads as a
    # list of unrelated numbers rather than as kinds of thing. Never by size of
    # move: that would be a ranking of what mattered today.
    #
    # Egypt's own rate first and the pound second, because this is a screen for
    # somebody deciding about Egyptian companies: what money costs here, and
    # what a pound buys, come before what copper did.
    order = {"egypt": 0, "currencies": 1, "world": 2, "metals": 3}
    return sorted(rows, key=lambda r: (order.get(r["group"], 9), r["label"] or ""))


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
        rows.append({"id": key, "label": label, "labelAr": rates_ar.label(key, label),
                     "asOf": sessions[-1]["date"],
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


def currency_notes() -> list[dict]:
    """Every company whose filed note prints a foreign-currency figure.

    Read here rather than re-derived: build_currency_notes.py owns the reading
    and the two-read agreement behind it, and a second place computing the
    share of profit is a second place for the two to drift apart.
    """
    if not CURRENCY.exists():
        return []
    try:
        document = json.loads(CURRENCY.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    return list(document.get("companies") or [])


# The exchange rate page names the currency in words; the filed note names it
# in an ISO code. Closed on purpose, like the vocabulary in the reader.
CURRENCY_CODES = {
    "US dollar": "USD", "Euro": "EUR", "Pound sterling": "GBP",
    "Saudi riyal": "SAR", "UAE dirham": "AED", "Kuwaiti dinar": "KWD",
    "Japanese yen": "JPY", "Chinese yuan": "CNY", "Swiss franc": "CHF",
}


def pound_today() -> dict | None:
    """What the pound is worth, beside the channel about the pound.

    This used to carry a paragraph explaining that the pound was the one figure
    on the screen with no history to be placed against — true when it was
    written, and the reason rate_history.py now fetches the five pairs. They
    are measured like every other row above: the dollar's week sits at the 79th
    percentile of its own two years, where the middle week moves 0.33%.

    The level stays because the channel is unreadable without it. A company
    that filed a net dollar position of 3,678 million says nothing to a reader
    who does not know what a dollar costs.
    """
    if not RATES_LATEST.exists():
        return None
    try:
        document = json.loads(RATES_LATEST.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    rows = []
    for row in document.get("currencies") or []:
        code = CURRENCY_CODES.get(row.get("label"))
        if not code or not row.get("token"):
            continue
        rows.append({"code": code, "label": row.get("label"),
                     "labelAr": row.get("label_ar"), "token": row.get("token")})
    if not rows:
        return None
    return {
        "asOf": (document.get("fetched_at") or "")[:10],
        "rates": rows,
        "note": "The rate on the day this was built, for reading the positions "
                "below against. How unusual this week's move in each of these "
                "was is at the top of the screen, measured the same way as "
                "everything else there.",
        "noteAr": "سعر الصرف يوم إعداد هذه الصفحة، لتُقرأ المراكز أدناه في ضوئه. "
                  "أما مدى استثنائية حركة كل منها هذا الأسبوع فهي أعلى الشاشة، "
                  "مقيسة بالطريقة نفسها المستعملة لكل ما هناك.",
    }


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
        # The page is Arabic by default; without this the block printed the
        # English sentence under an Arabic heading.
        "noteAr": "تنشر البورصة هذه الأرقام تراكمياً من بداية الفترة الحالية، لا "
                  "لجلسة واحدة، وتبدأ من الصفر مع كل فترة جديدة. فالارتفاع هنا "
                  "ليس مالاً وصل اليوم.",
    }


def build() -> dict:
    directory = json.loads(DIRECTORY.read_text(encoding="utf-8")).get("companies", [])
    names = {c["ticker"]: c.get("name_en") or c.get("name_ar") or c["ticker"]
             for c in directory if c.get("ticker")}
    debt_rows = carrying_debt(names)
    margin_rows = margins(names)
    currency_rows = currency_notes()
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
        "corridor": corridor(),
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
            *([{
                "id": "currency",
                "question": "Where does a move in the pound land?",
                "questionAr": "أين تصل حركة الجنيه؟",
                "filter": "every company whose filed foreign-currency note "
                          "prints a figure — a net position held in another "
                          "currency, or an exchange gain or loss already taken",
                "filterAr": "كل شركة يطبع إيضاح العملات الأجنبية في قوائمها رقماً "
                            "— صافي مركز بعملة أخرى، أو أرباح أو خسائر فروق عملة "
                            "تم الاعتراف بها",
                "count": len(currency_rows),
                "today": pound_today(),
                "companies": currency_rows,
            # A channel with nothing in it is not a channel. The reading is a
            # separate, manual harvest, so a run taken while it is part-way
            # through — or one where it has not been run at all — would
            # otherwise publish a heading, a count of nought and a search box
            # over an empty list.
            }] if currency_rows else []),
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
