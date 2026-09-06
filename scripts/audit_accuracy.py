#!/usr/bin/env python3
"""What is actually wrong with each company's published data.

Coverage is easy to feel good about and easy to be wrong about. This counts
instead: for every company the site publishes, which figures exist, which ones
contradict each other, and which are old enough that a reader would be misled
by their absence of a date.

Every check here is one this repository has already been bitten by:

  * a market value that is not its own price times its own share count — the
    check that keeps per-share arithmetic honest, and the reason sixteen P/Es
    are withheld on purpose;
  * the directory and a company's own document disagreeing about the same
    period, which was 77 companies until a bare filed line stopped overwriting
    whole balance sheets;
  * a P/E that does not divide out against the EPS printed beside it;
  * a sector in the directory that is not the sector in the document;
  * a newest filing old enough that "latest" means something else.

It reads only what is published. No network, no vendor, nothing it cannot
point a reader at — so it can run in CI and say the same thing twice.

Usage:
    python3 scripts/audit_accuracy.py [--json] [--ticker COMI]
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
V1 = REPO / "public" / "data" / "v1"

# How far a derived figure may sit from the one it is derived from. The same
# 5% the P/E guard uses, for the same reason: rounding in a published document
# is not a disagreement.
TOLERANCE = 0.05

# A filed year older than this is not "the latest"; it is history. Egyptian
# annuals land through the spring, so a year and a half allows for a company
# that files late without flagging the whole exchange every January.
STALE_DAYS = 550


def load(path: pathlib.Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def near(a, b, tol=TOLERANCE) -> bool:
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        return False
    if a == 0 and b == 0:
        return True
    return abs(a - b) / max(abs(a), abs(b), 1e-9) <= tol


def newest_period_end(doc: dict) -> str | None:
    ends = []
    for bucket in ("annual", "quarterly"):
        for row in (doc.get("financials") or {}).get(bucket) or []:
            end = row.get("period_end")
            if isinstance(end, str) and len(end) >= 10:
                ends.append(end[:10])
    return max(ends) if ends else None


def audit_one(row: dict, doc: dict | None, quote: dict, today: datetime.date,
              rates: dict[str, float] | None = None) -> list[dict]:
    """Every fault found on one company, each with the figures behind it."""
    faults = []
    t = row["ticker"]

    def fault(kind, detail, **numbers):
        faults.append({"ticker": t, "kind": kind, "detail": detail, **numbers})

    profile = (doc or {}).get("profile") or {}
    close = quote.get("close")
    cap = row.get("market_cap")
    shares = profile.get("shares_outstanding")

    # ── the figures a reader is shown ────────────────────────────────────
    if not isinstance(close, (int, float)):
        fault("no_price", "no close in market.json")
    if not isinstance(cap, (int, float)) or cap <= 0:
        fault("no_market_cap", "no market value, so it cannot be sized or ranked")
    if not row.get("sector"):
        fault("no_sector", "unclassified")

    # ── figures that must agree with each other ──────────────────────────
    if all(isinstance(x, (int, float)) for x in (close, cap, shares)) and shares > 0:
        implied = close * shares
        # Eleven listings are quoted in dollars while the exchange states every
        # market value in pounds, so for those the two figures are SUPPOSED to
        # differ — by the exchange rate, and by nothing else. Checking that is
        # stronger than excusing them: the eleven implied 50.92 pounds to the
        # dollar against a published 50.87, which is how the currency was found
        # in the first place.
        rate = (rates or {}).get(str(row.get("currency") or "").strip())
        expected = implied * rate if rate else implied
        if expected > 0 and not near(cap, expected):
            # The share count the exchange's own market value implies, beside
            # the one the vendor states. That is the actionable half: SEIGA is
            # published with 2,500,000 shares against a capitalisation that
            # needs 685 million of them, and the figure feeds the free float
            # the screen prints as a percentage.
            fault("cap_vs_shares" if not rate else "cap_vs_rate",
                  "market value is not this company's own price times its own shares"
                  if not rate else
                  "the market value and the price disagree by more than the exchange rate",
                  cap=cap, implied=round(expected, 2),
                  ratio=round(cap / expected, 3),
                  shares=shares,
                  shares_implied=round(cap / (close * (rate or 1))) if close else None,
                  **({"rate": rate} if rate else {}))

    pe, eps = row.get("pe"), row.get("eps")
    # `close` here is `market.json`'s, which moves through the session; the
    # multiple is derived once when this directory is rebuilt. Dividing one by
    # the other compares two different moments and calls the gap a
    # contradiction — on 6 Sep 2026 that failed every build from mid-session,
    # with SIPC's 133.75 (off a close of 5.35) read against 6.30 after a 20%
    # move. The memory of `share_count_agrees` is the same lesson: an internal
    # consistency test stops being one the moment it reaches across sources.
    #
    # So it is checked against `pe_close`, the price the ratio was actually
    # divided from, which `build_market_api` now publishes beside it. Where
    # that is absent — a directory written before this — there is nothing to
    # check against and nothing is claimed, rather than a fault invented from
    # a price the ratio never saw.
    basis = row.get("pe_close")
    if isinstance(pe, (int, float)) and isinstance(eps, (int, float)) and eps != 0 \
            and isinstance(basis, (int, float)):
        if not near(pe, basis / eps):
            fault("pe_vs_eps", "the multiple does not divide out against the EPS beside it",
                  pe=pe, eps=eps, close=basis, implied=round(basis / eps, 2))

    if doc:
        if doc.get("sector") and row.get("sector") and doc["sector"] != row["sector"]:
            fault("sector_split", "the directory and the document name different sectors",
                  directory=row["sector"], document=doc["sector"])

        # The one that was 77 companies wide.
        period, profit = row.get("net_income_period"), row.get("net_income")
        if period and isinstance(profit, (int, float)):
            for r in (doc.get("financials") or {}).get("annual") or []:
                if r.get("period") == period and isinstance(r.get("net_income"), (int, float)):
                    if not near(profit, r["net_income"]):
                        fault("profit_split",
                              "the directory and the document disagree on the same period",
                              period=period, directory=profit, document=r["net_income"],
                              apart=round(abs(r["net_income"] - profit)
                                          / max(abs(profit), 1e-9), 3))

        end = newest_period_end(doc)
        if end:
            age = (today - datetime.date.fromisoformat(end)).days
            if age > STALE_DAYS:
                fault("stale_filings", "the newest filed period is old enough to mislead",
                      newest=end, days=age)
        elif (doc.get("financials") or {}).get("annual"):
            fault("undated_filings", "filed periods carry no period_end to age them by")

        # A profit with no balance sheet AND no basis is a figure whose meaning
        # nobody recorded — it could be a group, a parent, or a quarter, and
        # the reader cannot tell. A full statement without the word on it is
        # not the same thing: the assets and equity beside it say what it is.
        bare = [r.get("period") for r in (doc.get("financials") or {}).get("annual") or []
                if r.get("net_income") is not None and not r.get("basis")
                and r.get("assets") is None and r.get("equity") is None]
        if bare:
            fault("bare_profit", "filed profit with neither a basis nor a statement behind it",
                  periods=bare[:4], count=len(bare))
    else:
        fault("no_document", "in the directory with no company document")

    return faults


# Kinds where two of our own documents disagree about the same company. Not
# "the data is thin" — "the data is inconsistent with itself", which is a bug
# with an address. See the note in main().
#
# `profit_split` joined once it reached zero. It sat at 12 for weeks and rose to
# 33 the moment the exchange's filings took priority, because the directory's
# annual profit, EPS and P/E were derived at STEPS line 62 and the documents
# they came from were revised at line 112 — the row said one thing and the
# document beside it another. `build_ttm_pe` re-derives them after every step
# that can touch a filed figure, and the count is nought.
CONTRADICTIONS = ("sector_split", "pe_vs_eps", "profit_split")


def fx() -> dict[str, float]:
    """Pounds per unit, keyed by the SHORT NAME the exchange files a price under.

    `currShort` is "US$", not "USD" — the exchange's own label, kept verbatim
    because converting it to a code is a mapping that can go wrong silently.
    """
    doc = load(V1 / "rates" / "latest.json")
    by_code = {c.get("code"): c.get("egp") for c in (doc.get("currencies") or [])
               if isinstance(c.get("egp"), (int, float))}
    return {short: by_code[code]
            for short, code in (("US$", "USD"), ("EUR", "EUR"), ("GBP", "GBP"))
            if by_code.get(code)}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--json", action="store_true", help="the findings, machine-readable")
    ap.add_argument("--ticker", help="one company")
    # Accepted and ignored: this reads and never writes, so the validate pass
    # and the real one are the same run. It was registered in build_all as a
    # step that takes the flag and did not take it, so `build_all --check` —
    # the "Validate before writing anything" job — has failed on
    # "unrecognized arguments: --check" in every CI run since the audit landed.
    ap.add_argument("--check", action="store_true", help=argparse.SUPPRESS)
    args = ap.parse_args()

    directory = load(V1 / "companies.json") or {}
    market = (load(V1 / "market.json") or {}).get("stocks") or {}
    rates = fx()
    today = datetime.date.today()

    rows = directory.get("companies") or []
    if args.ticker:
        rows = [r for r in rows if r["ticker"] == args.ticker.upper()]

    faults = []
    for row in rows:
        doc = load(V1 / "companies" / f"{row['ticker']}.json")
        faults += audit_one(row, doc, market.get(row["ticker"]) or {}, today, rates)

    if args.json:
        print(json.dumps({"companies": len(rows), "faults": faults}, ensure_ascii=False))
        return 0

    from collections import Counter
    counts = Counter(f["kind"] for f in faults)
    affected = len({f["ticker"] for f in faults})
    print(f"── {len(rows)} companies, {affected} with something wrong, "
          f"{len(faults)} findings")
    for kind, n in counts.most_common():
        print(f"   {kind:<18} {n:>4}")
    # The worst of each kind, with its numbers, because a count is not a lead.
    for kind, _ in counts.most_common():
        worst = [f for f in faults if f["kind"] == kind][:3]
        print(f"\n   {kind}")
        for f in worst:
            extra = {k: v for k, v in f.items() if k not in ("ticker", "kind", "detail")}
            print(f"      {f['ticker']:<7}{f['detail']}")
            if extra:
                print(f"             {extra}")

    # Most of what this finds is the world being incomplete: a company the
    # exchange has not valued, a filing nobody has updated since 2016. Those are
    # reported and left alone, because the fix is upstream and a red build would
    # not move it.
    #
    # CONTRADICTIONS are different. They are two documents this pipeline wrote
    # disagreeing about the same company, which is always our own bug and always
    # fixable here. The company screen said "Finance" over a contractor while
    # the market table said "Contracting & Construction Engineering" — 217 of
    # 284 companies disagreed with themselves, for weeks, silently, because this
    # audit only ever printed.
    #
    # A kind joins this list when it reaches zero and is expected to stay there.
    broken = [k for k in CONTRADICTIONS if counts.get(k)]
    if broken:
        print("\n   These are documents this pipeline wrote disagreeing with "
              "each other, not gaps in the world:")
        for kind in broken:
            print(f"      {kind}: {counts[kind]}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
