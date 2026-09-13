#!/usr/bin/env python3
"""Where trading attention has moved between sectors, and what followed before.

THE QUESTION THIS WAS ASKED
    "Show if there's a pattern of money moving from one sector to another, and
     the probable next sector."

The second half cannot be published: §8 of Capital Market Law 95/1992 leaves a
publisher that is not FRA-licensed no room to forecast. But the first half
turned out to be the more interesting problem, because it was tested and the
answer is no.

WHAT WAS TESTED, AND WHY NO ARROWS ARE DRAWN
    Same-month pairs — sector A's share falls while B's rises — are arithmetic.
    Shares sum to a hundred, so somebody falls whenever somebody rises, and a
    chart of that is a chart of subtraction.

    Lead-lag pairs are the real question: A falls this month, B rises next. The
    strongest such pair over fourteen years is Food & Beverages → IT & Media,
    11 of 24, a lift of +16.8 points over that sector's own base rate. Each
    sector's own monthly series was then shuffled two hundred times — keeping
    how often it rises and falls, destroying when — and the best pair in pure
    noise had a median lift of +16.7 points. p ≈ 0.49.

    The strongest rotation pair in the record is the median of noise, because
    it is the best of some nine hundred pairs. So this file publishes no pair,
    no arrow, no Sankey, and no "flow" between sectors. Turnover does not
    establish that anybody moved money from one sector into another; it
    establishes only where the trading was.

WHAT IS IN THE RECORD, AND IS PUBLISHED
    Share of turnover reverts. A sector that takes at least a point more of
    the market's turnover in a month gives it back the next month about seven
    times in ten — 2018-2022 and 2022-2026 agree to within a point. That is a
    frequency over the record, stated as a frequency, and every case behind it
    is listed with its date so a reader can count them rather than trust it.

WHY THE ARCHIVE IS SEVEN TIMES DEEPER THAN THE SCREEN SHOWED
    `build_flow_trackers.py` publishes fourteen months because it trims each
    sector to its own coverage. The deep price store holds twenty-five years of
    daily close and volume for nearly three hundred companies, and once the
    month is required to cover 70% of today's listings there are ninety-four of
    them. Fourteen months cannot evidence a base rate. Ninety-four can.
"""

from __future__ import annotations

import argparse
import collections
import datetime
import json
import pathlib
import statistics

REPO = pathlib.Path(__file__).resolve().parent.parent
DEEP = REPO / "data-source" / "prices"
DIRECTORY = REPO / "public" / "data" / "v1" / "companies.json"
OUT = REPO / "public" / "data" / "v1" / "sector-rotation.json"

# A month has to carry this much of today's listed universe before its sector
# shares mean anything. Below it the shares describe the archive filling up.
COVERAGE = 0.70
# A move smaller than this is the market breathing, not attention moving.
NOTABLE = 1.0
# What the "what followed" panel asks about, in points of share.
QUALIFY = 2.0
# Two sectors is not a market. Below this the shares are not comparable.
MIN_SECTORS = 8


def listed() -> dict[str, str]:
    """Ticker → sector, for the companies listed today."""
    document = json.loads(DIRECTORY.read_text(encoding="utf-8"))
    return {c["ticker"]: (c.get("sector") or "Unclassified")
            for c in document.get("companies", []) if c.get("ticker")}


def turnover(sectors: dict[str, str]) -> tuple[dict, dict]:
    """Monthly turnover per sector, and which tickers reported in each month.

    Turnover is close × volume. The deep store carries no exact turnover, and
    this is the same estimate build_flow_trackers.py makes from the same bars —
    a different one here would put two numbers for one month on one site.
    """
    months: dict[str, dict[str, float]] = collections.defaultdict(
        lambda: collections.defaultdict(float))
    reported: dict[str, set] = collections.defaultdict(set)
    for path in sorted(DEEP.glob("*.json")):
        try:
            document = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        ticker = document.get("ticker")
        sector = sectors.get(ticker)
        if not sector:
            continue
        for bar in document.get("bars") or []:
            close, volume = bar.get("close"), bar.get("volume")
            date = bar.get("date") or ""
            if not date or not isinstance(close, (int, float)):
                continue
            if not isinstance(volume, (int, float)) or volume <= 0:
                continue
            months[date[:7]][sector] += close * volume
            reported[date[:7]].add(ticker)
    return months, reported


def covered(months: dict, reported: dict, universe: int) -> list[str]:
    """The months whose shares are worth comparing, in order."""
    need = universe * COVERAGE
    return sorted(m for m in months
                  if len(reported[m]) >= need and len(months[m]) >= MIN_SECTORS)


def shares(months: dict, keys: list[str]) -> dict[str, dict[str, float]]:
    out = {}
    for month in keys:
        total = sum(months[month].values())
        if total <= 0:
            continue
        out[month] = {s: v / total * 100 for s, v in months[month].items()}
    return out


def changes(share: dict, keys: list[str]) -> dict[str, dict[str, float]]:
    """Month-on-month change in share, in points — never across a gap.

    Consecutive in the covered list is not the same as consecutive in the
    calendar. A change measured across a month that failed the coverage bar
    would compare two different archives and call the difference rotation.
    """
    out = {}
    for before, after in zip(keys, keys[1:]):
        if not _adjacent(before, after):
            continue
        out[after] = {s: share[after].get(s, 0.0) - share[before].get(s, 0.0)
                      for s in set(share[after]) | set(share[before])}
    return out


def _adjacent(before: str, after: str) -> bool:
    y1, m1 = (int(p) for p in before.split("-"))
    y2, m2 = (int(p) for p in after.split("-"))
    return (y2 * 12 + m2) - (y1 * 12 + m1) == 1


def what_followed(delta: dict, keys: list[str], sector: str,
                  qualify: float = QUALIFY) -> dict:
    """Every month this sector's share rose by `qualify`, and what came next.

    The cases are listed, not just counted. A percentage with nothing behind it
    is a badge; a reader who can see the dates can check it, and can see for
    themselves when there are too few to mean anything.
    """
    order = [m for m in keys if m in delta]
    cases = []
    for now, nxt in zip(order, order[1:]):
        if not _adjacent(now, nxt):
            continue
        rise = delta[now].get(sector)
        if rise is None or rise < qualify:
            continue
        after = delta[nxt].get(sector)
        if after is None:
            continue
        cases.append({"month": now, "rose": round(rise, 2),
                      "next": nxt, "then": round(after, 2)})
    gave_back = sum(1 for c in cases if c["then"] < 0)
    return {
        "qualify": qualify,
        "cases": cases,
        "count": len(cases),
        "gaveBack": gave_back,
        # Stated only where there is something to state it over. One case is a
        # case, not a rate, and rounding it to "100%" is how a single month
        # becomes a claim about the market.
        "share": round(gave_back / len(cases) * 100) if len(cases) >= 5 else None,
    }


def across_the_market(delta: dict, keys: list[str], threshold: float) -> dict:
    """The same question pooled over every sector — the headline frequency."""
    order = [m for m in keys if m in delta]
    up = back = 0
    for now, nxt in zip(order, order[1:]):
        if not _adjacent(now, nxt):
            continue
        for sector, rise in delta[now].items():
            if rise < threshold or sector not in delta[nxt]:
                continue
            if delta[nxt][sector] < 0:
                back += 1
            else:
                up += 1
    total = up + back
    return {"threshold": threshold, "cases": total, "gaveBack": back,
            "share": round(back / total * 100) if total >= 30 else None}


def eras(delta: dict, keys: list[str]) -> list[dict]:
    """The headline frequency in each half of the record.

    A base rate that holds in one half and not the other is a period, not a
    pattern, and the reader is owed the split rather than the average.
    """
    order = [m for m in keys if m in delta]
    half = len(order) // 2
    out = []
    for label, slice_ in (("first", order[:half]), ("second", order[half:])):
        stat = across_the_market(delta, slice_, NOTABLE)
        out.append({"half": label, "from": slice_[0], "to": slice_[-1],
                    **{k: stat[k] for k in ("cases", "gaveBack", "share")}})
    return out


def build() -> dict:
    sectors = listed()
    months, reported = turnover(sectors)
    keys = covered(months, reported, len(sectors))
    share = shares(months, keys)
    keys = [m for m in keys if m in share]
    delta = changes(share, keys)
    names = sorted({s for m in keys for s in share[m]})

    grid = [{
        "month": month,
        "reported": len(reported[month]),
        "turnover": round(sum(months[month].values()) / 1e6, 3),
        "shares": {s: round(share[month].get(s, 0.0), 2) for s in names},
        "changes": ({s: round(delta[month].get(s, 0.0), 2) for s in names}
                    if month in delta else None),
    } for month in keys]

    return {
        "schemaVersion": 1,
        "generated": datetime.datetime.now(datetime.timezone.utc)
            .isoformat(timespec="seconds").replace("+00:00", "Z"),
        "basis": "Each month's share of the exchange's traded value, by sector, "
                 "and how that share changed from the month before. Turnover is "
                 "close times volume from the daily archive. A month is only "
                 "included when the companies reporting in it cover at least "
                 f"{COVERAGE:.0%} of today's listings, and a change is only "
                 "measured between two months that are next to each other in "
                 "the calendar and both included.",
        "basisAr": "نصيب كل قطاع من قيمة التداول شهرياً، وكيف تغير هذا النصيب عن "
                   "الشهر السابق. قيمة التداول هي سعر الإغلاق مضروباً في الكمية من "
                   "الأرشيف اليومي. ولا يُحتسب الشهر إلا إذا غطت الشركات المتداولة "
                   "فيه ما لا يقل عن ٧٠٪ من الشركات المقيدة اليوم، ولا يُقاس التغير "
                   "إلا بين شهرين متتاليين في التقويم وكلاهما محتسب.",
        "refuses": "No arrow, flow or pair between sectors is published. The "
                   "strongest lead-lag pair in this record lifts a sector's own "
                   "base rate by 16.8 points, and shuffling each sector's months "
                   "two hundred times — keeping how often it moves, destroying "
                   "when — produces a best pair of 16.7. It is the best of some "
                   "nine hundred pairs, which is to say it is noise. Turnover "
                   "shows where trading happened, not that money left one sector "
                   "for another.",
        "refusesAr": "لا يُنشر هنا أي سهم أو تدفق أو اقتران بين القطاعات. أقوى "
                     "اقتران متتابع في السجل يرفع المعدل الأساسي للقطاع بـ١٦٫٨ "
                     "نقطة، وخلط شهور كل قطاع مئتي مرة يعطي أفضل اقتران ١٦٫٧ "
                     "نقطة. إنه أفضل نحو تسعمائة اقتران، أي أنه ضجيج. قيمة "
                     "التداول تبيّن أين جرى التداول، لا أن مالاً انتقل من قطاع "
                     "إلى آخر.",
        "coverageFloor": round(COVERAGE * 100),
        "notable": NOTABLE,
        "universe": len(sectors),
        "months": grid,
        "sectors": names,
        "reverted": across_the_market(delta, keys, NOTABLE),
        "byEra": eras(delta, keys),
        "followed": {s: what_followed(delta, keys, s) for s in names},
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="report what would be published and write nothing")
    args = parser.parse_args(argv)

    document = build()
    grid = document["months"]
    if not grid:
        print("!! Sector rotation: no month clears the coverage floor")
        return 1
    rev = document["reverted"]
    print(f"   {len(grid)} months {grid[0]['month']} → {grid[-1]['month']}, "
          f"{len(document['sectors'])} sectors")
    if rev["share"] is not None:
        print(f"   a sector taking {NOTABLE:.0f}pp more of the turnover gave it "
              f"back the next month in {rev['gaveBack']} of {rev['cases']} "
              f"cases ({rev['share']}%)")
    for era in document["byEra"]:
        print(f"     {era['from']} → {era['to']}: {era['gaveBack']}/{era['cases']}"
              + (f" ({era['share']}%)" if era["share"] is not None else ""))
    if args.check:
        return 0
    OUT.write_text(json.dumps(document, ensure_ascii=False, indent=1) + "\n",
                   encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
