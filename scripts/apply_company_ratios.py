#!/usr/bin/env python3
"""The review sheet's ratios, folded onto the row a reader can already filter.

The market screen filters and sorts `companies.json`. That row carries a
sector, a market value, a thirty-day volume, an EPS, a net profit and a P/E —
and nothing else. So "show me the companies trading under book", "the ones
whose profit is not turning into cash", "the ones carrying six times their
equity in liabilities" are questions the table has no column to answer.

Every one of those answers already exists. `build_review.py` computes them and
publishes them one document per company — 259 of them today — as
`review/<TICKER>.json`, under `metrics: [{key, value, unit, ...}]`. The app
reads that document when a reader opens a single company, which is the right
shape for one company and the wrong shape for a table: filtering 284 rows out
of it means fetching 259 documents to draw one screen. That is not a filter,
and it is why these ratios have been computable-but-unreachable in aggregate
since the review sheet shipped.

This folds six of them back onto the row. Nothing is computed here and no
figure is derived: it copies what the review document states, and a company
whose document does not state a ratio simply does not get one.

WHY ONE KEY AND NOT SIX TOP-LEVEL FIELDS

`ratios` is a nested object because the row already has `eps`, `net_income`
and `pe` on it from a different path, and a flat `pb`/`roe`/`roa` beside them
invites exactly the collision this repository keeps paying for — two producers,
one field name, and no way to tell from the file which one won. Under one key,
everything here is visibly the review sheet's answer, and the fields above it
are visibly not.

WHY `pe` IS NOT IN IT, THOUGH THE REVIEW SHEET PUBLISHES ONE

The row's `pe` and the review sheet's `pe` are both real and they are not the
same number. The review sheet prices each year at THAT year's close — COMI's
newest point is 4.2637, the close on 31 December 2025 over FY 2025 earnings —
while the row's 5.8 is TODAY's close over the same FY 2025 earnings. Same
company, same filing, two prices. Copying the review value in beside it would
put "P/E 5.8" and "P/E 4.2637" on one row with nothing to say which the filter
means. The row already has its own, and it stays the only one.

WHAT AN ABSENT RATIO MEANS, AND WHY IT IS ABSENT RATHER THAN NULL OR ZERO

Coverage is genuinely partial, and unevenly so: of the 259 published review
documents, 233 carry a debt-to-equity, 227 a return on assets, 223 a
price-to-book and only 80 a dividend yield — because the exchange's stock-info
is the only source of a yield and it names one for a third of the market. 16
documents carry none of the six at all.

A missing ratio is therefore a fact about the company's published figures, not
a gap to be filled. Nulling it would be harmless in JSON and lethal in a
filter, where `null` sorts somewhere and a "roe under 5%" screen would return
226 companies that published a return on equity plus 58 that did not. Zeroing
it is worse: 32 of the published returns on equity ARE negative and 66 of the
cash conversions are, so a zero is not even a safely-outside-the-range
sentinel — it lands in the middle of the real distribution. Absent is the only
value that cannot be mistaken for an answer.

WHY THE UNITS ARE PUBLISHED ONCE, AT THE TOP

The review documents state a `unit` per metric, and the six here do not share
one: `dividend_yield` is a `percent` (COMI's 4.32 means 4.32%) and the other
five are bare `ratio`s (COMI's roe of 0.3612 means 36.12%). A filter that
assumes one convention mislabels the other by a factor of a hundred, and a
column that sorted the two together would rank a 4.32% yield above a 36%
return on equity.

So `ratio_units` goes on the document once, read off the documents rather than
hardcoded here, and a key whose documents do not AGREE on a unit is refused
whole — no values on any row, no label. Half a column in percent and half in
ratios cannot be filtered, cannot be sorted, and gives a reader no way to see
which row is which; publishing the majority's label over the minority's
numbers is how you get a mislabelled figure against a real ticker. Today all
223 price-to-book documents say "ratio" and all 80 yields say "percent", so
nothing is refused — this is the guard for the day `build_review` changes its
mind about a unit and only some documents have been rebuilt.

WHY IT IS ITS OWN STEP, RUN WHERE IT IS

It reads what `build_review.py` writes, so it runs immediately after it.

It cannot live inside `build_market_api.py` — the step that creates these rows
— for the reason `apply_company_facts.py` documents: that build needs the
daily scan, a 2 MB file outside the repository that exists only on the machine
running the monitor, so in CI it does not run at all. A ratio that only reaches
the row on one laptop is not published.

It clears `ratios` off every row before writing, for the reason
`build_ttm_pe.py` clears its own fields: `build_review` DELETES the document
of a company that drops out of its coverage, and a row that keeps last run's
price-to-book after the sheet stopped publishing one is a figure with no
source behind it. Carrying nothing forward also makes the step idempotent —
two runs over the same inputs produce the same bytes.

Network-free, and it only ever adds a key to a row that already exists: like
the trailing P/E, it cannot repeat `build_market_api`'s failure of deleting 33
companies off a short scan.
"""

from __future__ import annotations

import argparse
import collections
import json
import math
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
V1 = REPO / "public" / "data" / "v1"
DIRECTORY = V1 / "companies.json"
REVIEW = V1 / "review"
# The app ships a frozen copy of the published directory so it has something to
# show before its first download, and `build_fixtures.py` fails the build if
# the two differ by a byte. Anything that edits one edits both.
FIXTURE = REPO / "app" / "assets" / "fixtures" / "companies.json"

# The six the review sheet computes that the row does not already carry, in the
# order they are written, so the output does not depend on the order the
# metrics happen to appear in a document.
#
# `pe` is deliberately not here (see above), and neither are `profit`, `eps`
# and `assets`: the first two are already on the row as `net_income` and `eps`
# from the filings themselves, and re-publishing them under a second name is
# the same two-producers-one-answer trap in a different costume.
RATIOS = ("pb", "roe", "roa", "debt_equity", "dividend_yield", "cash_conversion")

# What the row's own fields are called, so a future addition to RATIOS that
# collides with one of them fails a test rather than overwriting a figure that
# came off a filing.
ROW_FIELDS = ("pe", "eps", "net_income", "market_cap", "avg_volume_30d",
              "sector")


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def stated(doc: dict) -> dict[str, tuple[float, str]]:
    """The ratios one review document states, with the unit it states them in.

    A value has to be a real, finite number to be carried. `json.loads` accepts
    the bare literals `NaN` and `Infinity`, and `json.dumps` writes them back
    out — so one of those reaching `companies.json` would produce a file that
    every browser's `JSON.parse` refuses, taking the whole market screen down
    rather than one column of it. `True` is an `int` in Python and is not a
    ratio, hence the explicit exclusion.
    """
    out: dict[str, tuple[float, str]] = {}
    for metric in doc.get("metrics") or []:
        if not isinstance(metric, dict):
            continue
        key, value, unit = metric.get("key"), metric.get("value"), metric.get("unit")
        if key not in RATIOS or not unit:
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            continue
        if not math.isfinite(value):
            continue
        out[key] = (value, str(unit))
    return out


def published() -> tuple[dict[str, dict[str, float]], dict[str, str], dict[str, set]]:
    """Every review document on disk, as ratios per ticker and units per key.

    The value is carried through EXACTLY as the document states it. It is
    already rounded — `build_review` rounds to four decimals, and the yield to
    three — and rounding it again here would make the company screen and the
    market table disagree about the same company in the fourth decimal, which
    is a contradiction with no upside. Rescaling it would be worse: a `ratio`
    turned into a percentage for display would then be a percentage in the
    file, and the next reader of the file has no way to know.
    """
    ratios: dict[str, dict[str, float]] = {}
    units: dict[str, set] = collections.defaultdict(set)
    for path in sorted(REVIEW.glob("*.json")):
        found = stated(load(path))
        if not found:
            continue
        ticker = str(path.stem).strip().upper()
        ratios[ticker] = {k: v for k, (v, _) in found.items()}
        for key, (_, unit) in found.items():
            units[key].add(unit)

    # One unit per key or no key at all — see the header. A disagreement is
    # loud rather than resolved: there is no honest way to pick between two
    # units for the same column.
    disputed = {k: u for k, u in units.items() if len(u) > 1}
    for key in disputed:
        for held in ratios.values():
            held.pop(key, None)
    agreed = {key: next(iter(units[key])) for key in RATIOS
              if key in units and len(units[key]) == 1}
    return {t: held for t, held in ratios.items() if held}, agreed, disputed


def relabel(directory: dict, units: dict[str, str]) -> dict:
    """`ratio_units` beside the document's other facts, not after 284 rows.

    Rebuilt in a fixed order so a second run over the same inputs writes the
    same bytes rather than the same JSON in a different order, which CI would
    commit as a change every time.
    """
    out = {key: value for key, value in directory.items()
           if key not in ("ratio_units", "companies")}
    if units:
        out["ratio_units"] = {key: units[key] for key in RATIOS if key in units}
    if "companies" in directory:
        out["companies"] = directory["companies"]
    return out


def apply(write: bool = True) -> int:
    print("── Company ratios")
    if not DIRECTORY.exists():
        print("   no directory to add to")
        return 0

    directory = load(DIRECTORY)
    rows = directory.get("companies") or []
    ratios, units, disputed = published()

    if not ratios:
        # The same shrug `apply_company_facts` makes over a missing session: a
        # checkout without the review sheet, or a run where `build_review`
        # found no financials to read, must leave what is published alone
        # rather than strip a column off every row.
        where = REVIEW.relative_to(REPO) if REVIEW.is_relative_to(REPO) else REVIEW
        print(f"   no review documents under {where} — "
              f"leaving the directory alone")
        return 0

    for key, seen in sorted(disputed.items()):
        print(f"   {key} refused on every row — its documents state "
              f"{len(seen)} different units ({', '.join(sorted(seen))})")

    # The two reasons a row gets nothing are worth telling apart in the log:
    # 25 companies have no review document at all, and 16 more have one that
    # states none of these six. The first is the review sheet's coverage, the
    # second is the company's own filings, and only the first would be fixed
    # by rebuilding the sheet.
    on_disk = {path.stem.strip().upper() for path in REVIEW.glob("*.json")}
    coverage: collections.Counter = collections.Counter()
    carried = unreviewed = silent = 0
    for row in rows:
        # Cleared before it is set: a company that has dropped out of the
        # review sheet loses the ratios rather than keeping the last run's.
        row.pop("ratios", None)
        ticker = str(row.get("ticker") or "").strip().upper()
        held = ratios.get(ticker)
        if not held:
            if ticker in on_disk:
                silent += 1
            else:
                unreviewed += 1
            continue
        row["ratios"] = {key: held[key] for key in RATIOS if key in held}
        for key in row["ratios"]:
            coverage[key] += 1
        carried += 1

    directory = relabel(directory, units)

    print(f"   {carried} of {len(rows)} rows carry a ratio, from "
          f"{len(on_disk)} review documents")
    print(f"   {unreviewed} rows have no review document and {silent} have one "
          f"that states none of these six")
    for key in RATIOS:
        label = units.get(key, "—")
        print(f"   {key:<16} {coverage[key]:4d}  {label}")

    if write:
        # The compact form `build_market_api.py` writes, because a reader
        # downloads this file and CI commits whatever changed: re-indenting it
        # would turn a one-key addition into a whole-file diff on every run.
        body = json.dumps(directory, ensure_ascii=False, separators=(",", ":")) + "\n"
        DIRECTORY.write_text(body, encoding="utf-8")
        if FIXTURE.exists():
            FIXTURE.write_text(body, encoding="utf-8")
    else:
        print("   (checking — nothing written)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="report what would be written and change nothing")
    args = parser.parse_args()
    return apply(write=not args.check)


if __name__ == "__main__":
    raise SystemExit(main())
