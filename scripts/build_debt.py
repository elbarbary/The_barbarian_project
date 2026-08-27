#!/usr/bin/env python3
"""What each company is doing with its borrowings, from its own filed figures.

A debt total on its own answers almost nothing. The questions a holder actually
has are *when does it fall due*, *what does carrying it cost against what the
business earns*, *which way is it moving*, and *where did the money go*. All
four are arithmetic on figures the issuer filed, so all four are computed here
rather than described by a model.

The inputs come from the attachment reader (`build_pdf_statements.py`), which
reads the borrowing lines off the filed balance sheet and sums them by
maturity. **`liabilities` is deliberately not used as a debt measure** — it
carries trade payables, provisions, deferred tax and customer advances, none of
which anybody lent the company.

What lands on each company document under `debt`:

    period, as_of, filing_id     which filing every figure below came from
    borrowings, short_term,      the balance itself
      long_term, cash, net_debt
    due_within_year              share of borrowings falling due inside a year
    finance_cost, cover          the period's charge, and operating profit ÷ it
    gearing                      borrowings ÷ equity
    change                       against the same period a year earlier
    movement                     the three cash flows, and dividends paid
    pattern                      which of a closed set of shapes this is
    frame                        `finance` or `operating` — see below

**Banks are framed differently, not excluded.** For a lender, borrowing is raw
material rather than a burden: it funds the book it lends out of, and the
deposit side is not borrowing at all (the reader is told never to return
customer deposits as debt). So the same figures carry a different question —
what it costs to fund the book, not whether the company can carry a load — and
`frame` says which reading applies. Cash conversion was dropped for Finance for
the same reason; this is the other available answer, which is to reframe.

Nothing here judges. `pattern` names what the cash-flow statement shows, in the
exchange's own arithmetic; §8 forbids this app from telling anybody what to do
about it, and no wording here does.

Usage:
    python3 scripts/build_debt.py [--check]
"""

from __future__ import annotations

import argparse
import glob
import json
import pathlib
import re

REPO = pathlib.Path(__file__).resolve().parent.parent
COMPANIES = REPO / "public" / "data" / "v1" / "companies"
FIXTURES = REPO / "app" / "assets" / "fixtures" / "companies"
READS = pathlib.Path(__file__).resolve().parent / "debt_reads.json"

# A period label and the same period one year earlier: "H1 2026" -> "H1 2025",
# and "9M 2026 (to 31 Mar)" -> "9M 2025 (to 31 Mar)", so a fiscal-year company
# is compared against its own equivalent window rather than a calendar one.
YEAR_IN_LABEL = re.compile(r"\b(20\d{2})\b")


def prior_label(label: str) -> str | None:
    found = YEAR_IN_LABEL.search(label or "")
    if not found:
        return None
    return label[:found.start()] + str(int(found.group(1)) - 1) + label[found.end():]


def borrowings_of(row: dict) -> float | None:
    """Total borrowings for a period, or None when the filing states none.

    The maturities are preferred over a printed total because they are what the
    balance sheet actually lists; the reader only stores a `debt` total when the
    statement prints one itself.
    """
    total = row.get("debt")
    if isinstance(total, (int, float)):
        return float(total)
    halves = [row.get("short_term_debt"), row.get("long_term_debt")]
    present = [float(v) for v in halves if isinstance(v, (int, float))]
    return sum(present) if present else None


def _ratio(top: float | None, bottom: float | None) -> float | None:
    if top is None or bottom in (None, 0):
        return None
    return round(top / bottom, 3)


def pattern_of(row: dict, frame: str) -> str | None:
    """Which shape the period's cash flows make, from a closed set.

    Named for what the statement shows, never for what it would mean for a
    holder. The financing line is the money raised or returned; reading it
    beside the operating line is what separates borrowing that went into the
    business from borrowing that covered a shortfall in it.
    """
    fin = row.get("financing_cash_flow")
    op = row.get("operating_cash_flow")
    inv = row.get("investing_cash_flow")
    if fin is None:
        return None
    if frame == "finance":
        # A lender's operating line carries its lending, so the operating sign
        # says nothing about whether funding was needed. Only the direction of
        # the funding itself is reported.
        return "funding_raised" if fin > 0 else "funding_repaid"
    if fin > 0:
        if op is not None and op < 0:
            return "raised_while_operations_consumed_cash"
        if inv is not None and inv < 0:
            return "raised_and_invested"
        return "raised_and_held"
    if fin < 0:
        if op is not None and op > 0:
            return "repaid_from_operating_cash"
        return "repaid_without_operating_cash"
    return "little_movement"


def debt_block(doc: dict) -> dict | None:
    financials = doc.get("financials") or {}
    rows = [
        (bucket, row)
        for bucket in ("annual", "quarterly")
        for row in (financials.get(bucket) or [])
        if borrowings_of(row) is not None
    ]
    if not rows:
        return None

    # The freshest filing that states borrowings, by the date the period ended
    # rather than by label order, which sorts "H1 2026" under "Q4 2024".
    def ended(pair: tuple[str, dict]) -> str:
        row = pair[1]
        return str(row.get("period_end") or row.get("filed_on") or row.get("period") or "")

    bucket, row = max(rows, key=ended)
    frame = "finance" if (doc.get("sector") or "") == "Finance" else "operating"

    borrowings = borrowings_of(row)
    short = row.get("short_term_debt")
    long_ = row.get("long_term_debt")
    cash = row.get("cash")
    cost = row.get("finance_cost")
    equity = row.get("equity")
    operating = row.get("operating_income")

    block = {
        "period": row.get("period"),
        "as_of": row.get("period_end"),
        "filing_id": row.get("filing_id"),
        "source": row.get("source") or row.get("net_income_source"),
        "frame": frame,
        "borrowings": round(borrowings, 3),
        "short_term": short,
        "long_term": long_,
        "cash": cash,
        "finance_cost": cost,
        "pattern": pattern_of(row, frame),
        "movement": {
            key: row.get(key)
            for key in ("operating_cash_flow", "investing_cash_flow",
                        "financing_cash_flow", "dividends_paid")
            if row.get(key) is not None
        },
    }
    if cash is not None:
        block["net_debt"] = round(borrowings - float(cash), 3)
    if short is not None and borrowings:
        block["due_within_year"] = round(float(short) / borrowings, 3)
    # Operating profit against the period's own finance charge. Both are for the
    # same window, so the ratio needs no annualising.
    if (cover := _ratio(operating, cost)) is not None:
        block["cover"] = cover
    if (gearing := _ratio(borrowings, equity)) is not None:
        block["gearing"] = gearing

    # Which way borrowings moved. The balance sheet's own prior column is
    # preferred and is usually the last year-end rather than the same period a
    # year earlier — a shorter window, but the one the company itself presents,
    # and the only one obtainable: the interim filings a year back carry no
    # attachment to read. Whatever is used, the date is published with it so
    # the screen can name the window instead of implying a year.
    if (prior := row.get("debt_comparative")) and isinstance(prior, dict):
        was = prior.get("fields", {}).get("debt")
        if isinstance(was, (int, float)):
            block["change"] = {
                "since": prior.get("date"),
                "basis": "balance_sheet",
                "borrowings": round(float(was), 3),
                "delta": round(borrowings - float(was), 3),
                "direction": ("up" if borrowings > was
                              else "down" if borrowings < was else "flat"),
            }
            return block

    # Failing that, the same period a year earlier, which holds for a company
    # whose year does not start in January.
    if label := prior_label(str(row.get("period") or "")):
        for candidate in (financials.get(bucket) or []):
            if candidate.get("period") != label:
                continue
            was = borrowings_of(candidate)
            if was is None:
                break
            block["change"] = {
                "period": label,
                "basis": "year_earlier",
                "borrowings": round(was, 3),
                "delta": round(borrowings - was, 3),
                "direction": ("up" if borrowings > was
                              else "down" if borrowings < was else "flat"),
            }
            break
    return block


def build(check: bool = False) -> int:
    written = 0
    counts: dict[str, int] = {}
    # Written by build_debt_reads.py and committed. Keyed by ticker and the
    # period it described, so a company that has since filed again loses the
    # old sentence rather than carrying it onto figures it never saw.
    try:
        reads = json.loads(READS.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        reads = {}
    for path in sorted(glob.glob(str(COMPANIES / "*.json"))):
        doc = json.loads(pathlib.Path(path).read_text())
        block = debt_block(doc)
        if block is None:
            if doc.pop("debt", None) is not None and not check:
                body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
                pathlib.Path(path).write_text(body, encoding="utf-8")
                mirror = FIXTURES / pathlib.Path(path).name
                if mirror.parent.exists():
                    mirror.write_text(body, encoding="utf-8")
            continue
        if held := reads.get(f'{doc.get("ticker")}:{block["period"]}'):
            block["read"] = held
        counts[block["pattern"] or "unclassified"] = counts.get(
            block["pattern"] or "unclassified", 0) + 1
        doc["debt"] = block
        written += 1
        if not check:
            body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
            pathlib.Path(path).write_text(body, encoding="utf-8")
            mirror = FIXTURES / pathlib.Path(path).name
            if mirror.parent.exists():
                mirror.write_text(body, encoding="utf-8")

    verb = "would describe" if check else "described"
    print(f"── Debt: {verb} borrowings for {written} companies")
    for name, count in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"   {count:4}  {name}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    return build(parser.parse_args().check)


if __name__ == "__main__":
    raise SystemExit(main())
