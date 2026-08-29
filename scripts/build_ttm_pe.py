#!/usr/bin/env python3
"""A price-to-earnings ratio over the last twelve months a company FILED.

`build_market_api.py` publishes a P/E over the newest ANNUAL filing, which on
this exchange can be twenty months old: in August 2026 most of them are struck
against FY 2024. A company whose profit has doubled since then reads as twice
as expensive as it is, and one whose profit has halved reads as half.

This adds a second ratio over the last twelve months of filed profit. It is
NOT an estimate and nothing here is forecast. EGX companies file cumulatively —
Q1, H1, 9M, then the full year — so twelve months is three filed figures and
one subtraction:

    trailing = last full year + this year to date - the same months last year

For ADIB in August 2026 that is FY 2025 12,601.0 + H1 2026 7,550.8 - H1 2025
6,233.9 = 13,917.9. Every term is a number the company filed; none is modelled,
and the arithmetic is published beside the ratio so a reader can check it.

WHAT IT REFUSES, and why each refusal is here rather than a fudge:

  * A basis that changes mid-sum. The exchange files many periods twice, once
    standalone and once consolidated, and the two disagree — sometimes by
    thousands of per cent (see `apply_statement_basis.py`). Adding a
    consolidated year to a standalone half is not a smaller error than the
    staleness it was meant to fix; it is a different company's profit.
  * A share count that does not multiply out against price and market cap.
    The same guard `build_market_api.share_count_agrees` applies: if the three
    published figures do not cohere, one is in the wrong unit and everything
    per-share is wrong with it.
  * A trailing loss. A negative P/E is not a small P/E, and to a reader who
    has not met one it reads as the cheapest share on the exchange.
  * A ratio outside the same 1-200 band the annual one uses. Below 1 the
    company earned more in a year than the market says the whole of it is
    worth, which is a units error far more often than a bargain.

It only ever ADDS fields to a company that is already in the directory. It
cannot remove one, which is the failure `build_market_api.py` has had before
when a short scan made it delete 33 companies.
"""
from __future__ import annotations

import argparse
import collections
import json
import pathlib
import re

REPO = pathlib.Path(__file__).resolve().parent.parent
V1 = REPO / "public" / "data" / "v1"
DIRECTORY = V1 / "companies.json"
COMPANIES = V1 / "companies"
MARKET = V1 / "market.json"
# The app ships a frozen copy of the published directory so it has something to
# show before its first download, and `build_fixtures.py` fails the build if the
# two differ by a byte. `build_market_api.py` writes both; so must anything that
# edits what it wrote.
FIXTURE = REPO / "app" / "assets" / "fixtures" / "companies.json"

# The same band and tolerance the annual ratio uses. Imported by value rather
# than by import so this builder does not drag in a module that talks to the
# scanner; the test asserts the two stay equal.
PE_FLOOR = 1.0
PE_CEILING = 200.0
PE_TOLERANCE = 0.05

CUMULATIVE = re.compile(r"^(Q1|H1|9M|FY)\b")


def filed_rows(doc: dict) -> list[dict]:
    """Every filed period that states a profit and says when it ended."""
    financials = doc.get("financials") or {}
    rows = []
    for kind in ("annual", "quarterly"):
        for row in financials.get(kind) or []:
            shape = CUMULATIVE.match(str(row.get("period") or ""))
            if not shape or row.get("net_income") is None or not row.get("period_end"):
                continue
            rows.append({
                "shape": shape.group(1),
                "end": str(row["period_end"]),
                "profit": row["net_income"],
                "basis": row.get("basis"),
                "label": str(row["period"]),
                "filing_id": row.get("filing_id"),
            })
    rows.sort(key=lambda r: r["end"])
    return rows


def trailing(rows: list[dict]) -> tuple[dict | None, str]:
    """The three legs of a trailing twelve months, or why there are not three.

    The windows are matched on the DAY the period ended, not on its label. A
    June year-end files "FY 2025 (to 30 Jun)" and "9M 2026 (to 31 Mar)", and
    408 of the annual filings here are not calendar years — matching on the
    year in the text would line a March window up against a December one.
    """
    if not rows:
        return None, "no filed period states a profit"
    latest = rows[-1]
    if latest["shape"] == "FY":
        return None, "the newest filing is already a full year"

    same_day = latest["end"][5:]
    year = int(latest["end"][:4])
    prior = [r for r in rows
             if r["shape"] == latest["shape"]
             and r["end"][:4] == str(year - 1)
             and r["end"][5:] == same_day]
    if not prior:
        return None, "the same months of last year were not filed"

    # The full year has to be the one that ENDS BETWEEN the two windows, and
    # nothing else will do. The identity only closes if it is:
    #
    #     FY(Y) + [start of Y+1 .. now] - [start of Y .. same months last year]
    #       = [same months last year + 1 day .. now]      — twelve months
    #
    # which needs `a year ago` inside year Y and `to date` inside year Y+1.
    # Taking the newest FY on file instead published ALUM as
    # "FY 2020 + H1 2026 - H1 2025": a five-year-old year, a recent half and a
    # subtraction that means nothing. A company that has not filed an annual
    # since 2020 has no trailing twelve months, and says so.
    full = [r for r in rows if r["shape"] == "FY"
            and prior[0]["end"] < r["end"] < latest["end"]]
    if not full:
        return None, "no full year falls between the two windows"
    full = max(full, key=lambda r: r["end"])

    legs = (full, latest, prior[0])
    stated = {r["basis"] for r in legs if r.get("basis")}
    if len(stated) > 1:
        return None, "the three periods are not all on one basis"

    return {
        "profit": full["profit"] + latest["profit"] - prior[0]["profit"],
        "full_year": full, "to_date": latest, "a_year_ago": prior[0],
        "basis": next(iter(stated), None),
    }, ""


def share_count_agrees(close, cap, shares) -> bool:
    """Price times shares is market capitalisation, by definition."""
    if not close or not cap or not shares:
        return False
    implied = close * shares
    if implied <= 0:
        return False
    return abs(cap - implied) / max(cap, implied) <= PE_TOLERANCE


def ratio_for(doc: dict, close) -> tuple[dict | None, str]:
    profile = doc.get("profile") or {}
    shares = profile.get("shares_outstanding")
    twelve, refused = trailing(filed_rows(doc))
    if twelve is None:
        return None, refused
    if not share_count_agrees(close, profile.get("market_cap"), shares):
        return None, "price, market cap and share count do not multiply out"

    # Filed figures are in EGP millions; the share count is not.
    eps = (twelve["profit"] * 1_000_000) / shares
    if eps <= 0:
        return None, "the twelve months are a loss"
    ratio = close / eps
    if not (PE_FLOOR <= ratio <= PE_CEILING):
        return None, f"the ratio is outside {PE_FLOOR:g}-{PE_CEILING:g}"

    return {
        "pe_ttm": round(ratio, 2),
        "eps_ttm": round(eps, 3),
        # The sum, in the order a reader would check it, so the figure can be
        # taken apart without opening three filings.
        "pe_ttm_window": (f"{twelve['full_year']['label']} + "
                          f"{twelve['to_date']['label']} - "
                          f"{twelve['a_year_ago']['label']}"),
        "pe_ttm_to": twelve["to_date"]["label"],
        **({"pe_ttm_basis": twelve["basis"]} if twelve["basis"] else {}),
    }, ""


def closes() -> dict:
    stocks = json.loads(MARKET.read_text(encoding="utf-8")).get("stocks")
    if isinstance(stocks, dict):
        return {t: (q or {}).get("close") for t, q in stocks.items()}
    return {q["ticker"]: q.get("close") for q in (stocks or []) if q.get("ticker")}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="report what would be written and change nothing")
    args = parser.parse_args()

    if not DIRECTORY.exists():
        print("── Trailing P/E: no directory to add to")
        return 0

    directory = json.loads(DIRECTORY.read_text(encoding="utf-8"))
    price = closes()
    refusals: collections.Counter = collections.Counter()
    written = 0

    for company in directory.get("companies", []):
        ticker = company.get("ticker")
        # Never carry a stale ratio forward: a company that stops qualifying
        # this run must lose the figure, not keep last run's.
        for field in ("pe_ttm", "eps_ttm", "pe_ttm_window", "pe_ttm_to", "pe_ttm_basis"):
            company.pop(field, None)
        path = COMPANIES / f"{ticker}.json"
        if not path.exists():
            refusals["no company document"] += 1
            continue
        found, refused = ratio_for(
            json.loads(path.read_text(encoding="utf-8")), price.get(ticker))
        if found is None:
            refusals[refused] += 1
            continue
        company.update(found)
        written += 1

    total = len(directory.get("companies", []))
    print(f"── Trailing P/E: {written} of {total} companies")
    for reason, count in refusals.most_common():
        print(f"   {count:4d} refused — {reason}")

    if not args.check:
        # The same compact form `build_market_api.py` writes, and for the same
        # two reasons: a reader downloads this file, and CI commits whatever
        # changed. Re-indenting it turned a four-field addition into a 4,952
        # line diff that every run would then re-commit in full.
        body = json.dumps(directory, ensure_ascii=False, separators=(",", ":")) + "\n"
        DIRECTORY.write_text(body, encoding="utf-8")
        if FIXTURE.exists():
            FIXTURE.write_text(body, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
