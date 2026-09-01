#!/usr/bin/env python3
"""Put the exchange's own filed net profit into the company documents.

The app's financial periods come from Mubasher: a full statement per period —
assets, equity, cash flow, net income — for 227 of 280 companies. The exchange
publishes only one line of that, net profit, but it publishes it **as the
issuer filed it**, in a fixed template, stamped with the ISIN.

Where the two disagree ON THE SAME BASIS, the exchange wins: Mubasher is a
redistributor and EGX is the registry.

Where they disagree because they are reporting different things, it does not.
That distinction was missing and it mattered: TMGH's FY 2024 came through at
801.961m against a filed statement of 10,723.074m — thirteen times apart, which
is not two sources disagreeing about a number but two different numbers, a
group's consolidated result and its parent's. Its own FY 2023 row is labelled
`consolidated` and agrees to one per cent, which is what agreement looks like.

77 companies were publishing one figure in the directory and another in their
own document for the same year; 75 of the 77 had a full balance sheet behind
the directory's. So a bare line of UNSTATED basis no longer overwrites a period
that has assets, equity and a cash flow behind it. It is kept beside it under
its own name, so nothing is lost and nothing is silently swapped, and the
figure that wins now records the basis it was filed on.

What this does NOT do
---------------------
It does not invent the rest of the statement. A period the exchange reports and
Mubasher does not gets a row with `net_income` and nulls everywhere else, marked
with its source — never a balance sheet assembled from nothing. This repository
has shipped invented financials for a real ticker once; the guard against a
second time is that every number here traces to a filing.

Units, which is where this goes wrong quietly
---------------------------------------------
Mubasher stores **millions of EGP** (`net_income: 10238.157` is CIB's 10.2bn).
The exchange files **whole pounds** (`Net Profit : 8,426,170`). Merging without
dividing by a million overstates a company by six orders of magnitude, on the
one screen a reader would act on. So the conversion is explicit, it is tested,
and a filing denominated in anything but Egyptian pounds is skipped rather than
converted at a rate this app does not have.
"""

from __future__ import annotations

import argparse
import datetime
import glob
import gzip
import json
import pathlib
import re

import egx_dates

REPO = pathlib.Path(__file__).resolve().parent.parent
FILINGS = REPO / "data-source" / "egx-beta" / "filings"
COMPANIES = REPO / "public" / "data" / "v1" / "companies"
FIXTURES = REPO / "app" / "assets" / "fixtures" / "companies"

TICKER = re.compile(r"\(([A-Z0-9]{2,8})\.CA\)")
# Profit **and loss**: the template says "Net Loss : 19,534,187" for a negative
# and never writes a minus sign. Reading only "Net Profit" drops every loss-
# making period, which is the half a reader most needs.
NET = re.compile(r"Net\s+(Profit|Loss)\s*:?\s*\(?\s*(-?[\d,]+)(\.\d+)?\s*\)?", re.I)

# The template is not the only shape in this feed. Some filings write a rounded
# figure with its own unit — "Net profit : 25.9 Million USD", "77.7 Value In
# Million" — and reading `[\d,]+` off one of those yields 25 or 77, which then
# divides to 0.0 and publishes a company's quarter as zero. Any of these near
# the figure disqualifies the filing.
QUALIFIED = re.compile(r"(million|thousand|billion|USD|EUR|\bmn\b|\bbn\b)", re.I)
PERIOD = re.compile(
    r"Period\s*:?\s*From\s*(\d{1,2}/\d{1,2}/20\d{2})\s*To\s*(\d{1,2}/\d{1,2}/20\d{2})", re.I
)
CURRENCY = re.compile(r"Currency\s*:?\s*([^\r\n<]{1,24}?)\s*(?:F/S|ISIN|Net|Source|$)", re.I)
# The exchange files this line in two templates and this knew one.
#
#     F/S Consolidated Period : From 01/01/2024 To 31/12/2024     <- matched
#     F/S (Standalone) Period: From 01/01/2024 to 31/12/2024      <- did not
#
# 2,468 filings — 1,244 standalone and 1,224 consolidated — stated their basis
# in the parenthesised form and were recorded as "unstated". That is 22% of
# every basis-bearing filing in the archive, and it disabled the rule directly
# below this one: `egx_rows` prefers a consolidated filing over a standalone
# one for the same period, and it cannot prefer what it cannot see.
#
# TMGH filed both for FY 2024 — standalone 801,960,651 and consolidated
# 14,467,525,731 — and the site published the parent's 801.961m beside the
# group's 356,781m of assets, because the standalone line was the only one
# whose basis was legible.
BASIS = re.compile(r"F/S\s*\(?\s*(Standalone|Consolidated)\s*\)?\s*Period", re.I)

# Only Egyptian pounds. The template also carries `$` and `EUR` filings, and
# converting those needs a rate on the filing's own date that this app does not
# hold — so they are skipped, and counted, rather than silently mixed into a
# column labelled EGP.
EGP = {"egp", "l.e", "l.e.", "egyptian pound", "egyptian pounds", "جنيه مصري"}

SOURCE = "https://www.egx.com.eg"

# The exchange template for this delayed NEDA filing advances both displayed
# years by one: it was filed in February 2026 but says the current nine-month
# period ends in September 2026. Its Q1/H1 filings from the same batch, the
# prior 9M filing, and the comparative figures establish the intended window.
# Keep the correction keyed to the source filing instead of weakening date
# parsing for every issuer.
KNOWN_PERIOD_CORRECTIONS: dict[str, tuple[str, str]] = {
    "283236": ("2025-01-01", "2025-09-30"),
}


def flatten(html: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html or "")).strip()


def corrected_period(code: str, start: datetime.date,
                     end: datetime.date) -> tuple[datetime.date, datetime.date]:
    correction = KNOWN_PERIOD_CORRECTIONS.get(str(code))
    if not correction:
        return start, end
    return tuple(datetime.date.fromisoformat(value) for value in correction)


def period_label(start: datetime.date, end: datetime.date) -> tuple[str, bool] | None:
    """The period's label, and whether it may be matched against Mubasher's.

    The exchange files **cumulative from the fiscal year's start** — three
    months, six, nine, twelve — while Mubasher files calendar quarters. Those
    two vocabularies only line up when the company's year starts in January:

      * `01/01 → 31/03` is Q1 to both, and `01/01 → 31/12` is FY to both.
      * `01/01 → 30/09` is EGX's cumulative nine months. It is **not**
        Mubasher's Q3, which is the three months from July.

    And 43 of 342 companies do not run a calendar year at all. Abu Qir's "Year
    Ended 30/06/2023" is its FY 2023; Mubasher's FY 2023 for the same ticker is
    a different twelve months. Overriding one with the other would not be
    choosing the better source — it would be comparing two different years and
    calling the difference a correction.

    So a period that does not start on 1 January is still published, with the
    end date in its label so it can never collide, and is never matched against
    a Mubasher row.
    """
    months = round((end - start).days / 30.44)
    calendar_aligned = start.month == 1 and start.day == 1
    year = end.year
    if months >= 11:
        stem = f"FY {year}"
    elif 8 <= months <= 10:
        stem = f"9M {year}"
    elif 5 <= months <= 7:
        stem = f"H1 {year}"
    elif 2 <= months <= 4:
        stem = f"Q{(end.month - 1) // 3 + 1} {year}"
    else:
        return None
    if calendar_aligned:
        return stem, True
    # A fiscal year of its own: label it by the window it actually covers.
    return f"{stem} (to {end:%-d %b})", False


def _when(period: dict) -> tuple:
    """A sortable position for a filed period, label first, end date after."""
    label = str(period.get("period") or "")
    year = re.search(r"(19|20)\d{2}", label)
    return (int(year.group(0)) if year else 0,
            str(period.get("period_end") or ""), label)


def indicted_by_its_own_series(periods: list[dict], label: str,
                               incoming, held) -> bool:
    """Do the periods either side say the STORED figure is the wrong one?

    A gap of four hundred times is either a scale error or one source being
    badly wrong, and the ratio alone cannot tell which — refusing on size
    protects a stored error exactly as readily as it blocks an incoming one.
    Housing & Development Bank stood at 27.992m for FY 2024 with 6,559.603m
    filed either side of it in 2023 and 18,714.779m in 2025, while its own
    filing reads "Net Profit : 12,453,812,253" consolidated. The exchange was
    right and the guard was keeping it out.

    The neighbours are asked rather than the whole history, because a company
    that grew from 306m to 18,715m has no single typical year to be measured
    against. The incoming figure must sit in the range its neighbours span and
    the stored one must sit far outside it — both, or this returns False and
    the size guard stands.

    Eastern Tobacco is the case that must keep standing: its stored 6,048.733m
    belongs beside its neighbours and the exchange's 6.048m does not, because
    that filing states thousands.
    """
    ordered = [p for p in periods
               if isinstance(p.get("net_income"), (int, float)) and p["net_income"]]
    # By the year the period is OF, not by `period_end` — 3 of HDBK's 12 annual
    # rows carry no end date, and sorting on the string put them after 2025,
    # which handed FY 2024 the neighbours from 2020 and 2022.
    ordered.sort(key=_when)
    spot = next((i for i, p in enumerate(ordered) if p.get("period") == label), None)
    if spot is None:
        return False
    neighbours = [abs(p["net_income"]) for p in
                  ordered[max(0, spot - 2):spot] + ordered[spot + 1:spot + 3]]
    if len(neighbours) < 2:
        return False
    low, high = min(neighbours), max(neighbours)
    if not low:
        return False
    # A little room either side of the range the neighbours actually span.
    inside = low / 3 <= abs(incoming) <= high * 3
    outside = abs(held) < low / 10 or abs(held) > high * 10
    return inside and outside


def breaks_the_income_statement(existing: dict, filed) -> bool:
    """Would taking this figure leave a row that cannot be true?

    Replacing only the bottom line is safe when the bottom line is all the row
    has. It is not safe when the row also carries revenue, because those lines
    were filed on their own basis: a consolidated profit dropped onto a
    parent's revenue gives TMGH's H1 2026 a profit of 9,945.756m over revenue
    of 336.025m, which is the TMGH hazard arriving through a different door.

    Net income above revenue is not impossible in itself — a holding company
    earns most of its money below that line, and ten such rows were already
    published. So the test is not "is this row odd" but "does this change MAKE
    it odd": a row whose stored profit fitted its revenue and whose incoming
    one does not is a row this step would be breaking.
    """
    revenue = existing.get("revenue")
    stated = existing.get("net_income")
    if not isinstance(revenue, (int, float)) or revenue <= 0:
        return False
    if not isinstance(stated, (int, float)) or not isinstance(filed, (int, float)):
        return False
    # Signed on both sides, because a LOSS larger than revenue is ordinary — a
    # company can lose more than it earns — while a PROFIT larger than revenue
    # is the shape that needs a reason. Comparing magnitudes let EPCO and CNFN
    # through: each stored a loss bigger than its revenue, which read as
    # "already odd, leave it", and each then took a consolidated profit six
    # times its revenue.
    return filed > revenue and stated <= revenue


def keep_statement_figure(existing: dict, filed) -> bool:
    """Put the statement's own profit beside the exchange's. True when it moved.

    The exchange wins the figure a reader sees, which is what the owner asked
    for and what the filing deserves — it is the company's own submission to
    its own regulator. But the statement's number is not wrong for being
    second: it is what a balance sheet in the same row was built from, and
    losing it would leave a reader unable to see that the two disagree at all.

    So it is kept, named, and only where a statement actually exists. A period
    with no balance sheet has nothing to preserve.
    """
    complete = existing.get("assets") is not None or existing.get("equity") is not None
    stated = existing.get("net_income")
    if not complete or stated is None or stated == filed:
        return False
    # And only when the figure standing there IS the statement's.
    #
    # This step is idempotent, so on a second run the value it finds is often
    # its own from the first — an exchange figure. Recording that under
    # `statement_net_income_source: mubasher` publishes an EGX standalone
    # number under a redistributor's name, which is a worse lie than dropping
    # it. TMGH FY 2024 carried 801.961 that way, and Mubasher never said
    # 801.961: it said 10,723.074.
    if existing.get("net_income_source") == SOURCE:
        return False
    existing["statement_net_income"] = stated
    existing["statement_net_income_source"] = existing.get("source")
    return True


def egx_rows() -> tuple[dict[tuple[str, str], dict], dict[str, int]]:
    """Every filed net profit, keyed by (ticker, period label).

    Consolidated beats standalone where a company filed both for one period:
    that is the figure Mubasher reports and the one the app's other columns
    describe, so mixing bases inside a column would be the same overstatement
    bug wearing different clothes.
    """
    rows: dict[tuple[str, str], dict] = {}
    skipped = {"currency": 0, "no_period": 0, "no_ticker": 0, "no_label": 0,
               "magnitude": 0, "qualified": 0, "zero": 0}
    for path in sorted(glob.glob(str(FILINGS / "*.json.gz"))):
        for item in json.loads(gzip.decompress(pathlib.Path(path).read_bytes())).get("items", []):
            if item.get("secId") != 6:
                continue
            body = flatten(item.get("content"))
            profit = NET.search(body)
            if not profit:
                continue
            # A decimal in the figure means it is not whole pounds.
            if profit.group(3):
                skipped["qualified"] += 1
                continue
            # ...and neither is a figure sitting next to a unit word.
            window = body[max(0, profit.start() - 40): profit.end() + 40]
            if QUALIFIED.search(window):
                skipped["qualified"] += 1
                continue
            tick = TICKER.search(item.get("heading") or "")
            if not tick:
                skipped["no_ticker"] += 1
                continue
            # An explicit Egyptian-pound currency is **required**, not merely
            # not-contradicted. A filing with no Currency line at all used to
            # pass this test, and one of them was Orascom reporting in dollars.
            found = CURRENCY.search(body)
            currency = found.group(1).strip().lower() if found else ""
            if currency not in EGP:
                skipped["currency"] += 1
                continue
            span = PERIOD.search(body)
            if not span:
                skipped["no_period"] += 1
                continue
            order = egx_dates.detect_order(body)
            start = egx_dates.parse(span.group(1), order)
            end = egx_dates.parse(span.group(2), order)
            if not start or not end or end <= start:
                skipped["no_period"] += 1
                continue
            start, end = corrected_period(str(item.get("code") or ""), start, end)
            labelled = period_label(start, end)
            if not labelled:
                skipped["no_label"] += 1
                continue
            label, comparable = labelled

            whole_pounds = int(re.sub(r"[^\d]", "", profit.group(2)) or 0)
            # "Net Loss" is how the template writes a negative.
            if profit.group(1).lower() == "loss" or profit.group(2).strip().startswith("-"):
                whole_pounds = -abs(whole_pounds)
            # Sub-million figures round to 0.0 in a column of millions, and a
            # published zero reads as "this company earned nothing".
            if whole_pounds == 0:
                skipped["zero"] += 1
                continue
            basis = (BASIS.search(body).group(1).lower() if BASIS.search(body) else "")

            key = (tick.group(1), label)
            held = rows.get(key)
            # Consolidated wins; failing that, the later filing wins, because a
            # restatement supersedes the original.
            if held:
                if held["basis"] == "consolidated" and basis != "consolidated":
                    continue
                if held["basis"] == basis and held["filed"] >= item["dateStamp"][:10]:
                    continue
            rows[key] = {
                # Millions of EGP, to match the column it lands in. This single
                # division is the difference between 8.4 and 8,426,170.
                "net_income": round(whole_pounds / 1_000_000, 3),
                "basis": basis,
                "filed": item["dateStamp"][:10],
                "period_start": start.isoformat(),
                "period_end": end.isoformat(),
                "comparable": comparable,
                "code": item["code"],
            }
    return rows, skipped


def write_rows(rows: dict, skipped: dict, dry_run: bool,
               force_keys: frozenset = frozenset()) -> tuple[int, int, int]:
    """Write a `{(ticker, label): row}` set into the company docs and fixtures.

    Factored out of `merge()` so a second source of the same-shaped rows — the
    unit-qualified figures a model reads in `extract_unit_financials.py` — lands
    through the identical override guard, add rule and provenance stamping,
    rather than a parallel writer that could drift from this one.

    `force_keys` names the `(ticker, label)` pairs whose override may skip the
    magnitude guard. The guard exists to stop a figure filed in a different unit
    from overstating a company a million-fold — but the unit reader supplies
    figures that are already verbatim-checked, regex-agreed and band-limited, so
    for those the guard would do the opposite of its job: it would preserve a
    stored value that is itself the thousand-fold error (a bank's half-year at
    16m instead of 33bn) and refuse the corrected one. Only keys the caller has
    verified belong here; everything else still faces the guard.
    """
    touched = overrode = added = kept_statement = 0
    for path in sorted(glob.glob(str(COMPANIES / "*.json"))):
        doc = json.loads(pathlib.Path(path).read_text())
        ticker = doc.get("ticker") or pathlib.Path(path).stem
        fin = doc.setdefault("financials", {})
        changed = False
        for bucket in ("annual", "quarterly"):
            periods = fin.setdefault(bucket, [])
            index = {p.get("period"): p for p in periods}
            for (tick, label), row in rows.items():
                if tick != ticker:
                    continue
                annual = label.startswith("FY")
                if annual != (bucket == "annual"):
                    continue
                # If a source-level period correction moves an existing filing
                # to another label, remove its stale generated row first. A
                # single EGX filing represents one period and must never remain
                # published under both the erroneous and corrected dates.
                filing_id = f"egx-{row['code']}"
                stale = [
                    period_row for period_row in periods
                    if period_row.get("filing_id") == filing_id
                    and period_row.get("period") != label
                ]
                if stale:
                    periods[:] = [period_row for period_row in periods if period_row not in stale]
                    index = {period_row.get("period"): period_row for period_row in periods}
                    changed = True
                # A non-calendar (fiscal) label is normally never matched — its
                # end-date suffix keeps it from colliding with a Mubasher row.
                # But two EGX filings CAN share one fiscal label (a "Value In
                # Thousand" one and a later unlabelled one the plain path scaled
                # a thousandfold too small), so a verified force key is allowed
                # to find and correct that stored twin.
                existing = (index.get(label)
                            if row["comparable"] or (tick, label) in force_keys
                            else None)
                if existing:
                    held = existing.get("net_income")
                    if held == row["net_income"]:
                        # The figure already agrees, but the provenance may not
                        # be on it yet — this pass also carries the filing date
                        # and id, and a row written before they existed would
                        # otherwise never get them.
                        if existing.get("filed") != row["filed"]:
                            existing["filed"] = row["filed"]
                            existing["filing_id"] = f"egx-{row['code']}"
                            changed = True
                        continue
                    # A gap of this size is not two sources disagreeing, it is
                    # one of them denominated differently — several issuers file
                    # in thousands. Refuse rather than publish a figure a
                    # million out, and count the refusals so they stay visible.
                    #
                    # Eastern Tobacco is the one to picture: its half-year
                    # filing reads "Net Profit : 6,048,458" against a statement
                    # of 6,048.7 million. Identical digits, one template stating
                    # thousands. This guard is why giving the exchange priority
                    # below is safe — without it that period would publish a
                    # real company's profit a thousandfold light.
                    #
                    # The ratio is taken on the MAGNITUDES. It used to be
                    # signed, so a profit where the other source recorded a
                    # loss came out negative, failed `0.01 < r < 100`, and was
                    # refused as a unit mismatch — 48 of 58 refusals were that,
                    # counted and printed as scale errors. They are the
                    # opposite: two sources contradicting each other about
                    # whether a company made money, which is the single most
                    # important thing on the row and exactly what the exchange's
                    # own filing should settle. DAPH's FY 2025 filing reads
                    # "Net Loss : 140,758,402" and the site published +17.946m.
                    if (held and abs(held) > 0
                            and not (0.01 < abs(row["net_income"] / held) < 100)
                            and (tick, label) not in force_keys
                            and not indicted_by_its_own_series(
                                periods, label, row["net_income"], held)):
                        skipped["magnitude"] = skipped.get("magnitude", 0) + 1
                        continue
                    # THE EXCHANGE WINS WHERE THE TWO SOURCES INTERSECT.
                    #
                    # The previous rule was the opposite: a complete statement
                    # was never overruled by a filing of unstated basis, because
                    # TMGH's FY 2024 came out at 801.961m against a statement of
                    # 10,723.074m and that is not a disagreement about a number,
                    # it is a parent's result standing where a group's belongs.
                    #
                    # That reasoning was right and the remedy was aimed at the
                    # wrong thing. TMGH filed BOTH figures for FY 2024 —
                    # standalone 801,960,651 and consolidated 14,467,525,731 —
                    # and `egx_rows` already prefers the consolidated one. It
                    # could not, because the basis regex read `F/S Consolidated
                    # Period` and the exchange had written `F/S (Standalone)
                    # Period:`. 2,468 filings stated a basis that was recorded
                    # as "unstated", and the preference that would have picked
                    # the right figure was blind for all of them.
                    #
                    # And the guard never fired once: `egx_net_income` appears
                    # in none of the 282 published documents. The balance sheet
                    # it tested for is added by `apply_pdf_statements`, which
                    # runs AFTER this step, so `complete` was always False and
                    # the bare line overwrote anyway. The protection was
                    # ordered out of existence, and TMGH's parent profit went
                    # to readers beside the group's assets regardless.
                    #
                    # With the basis legible, the exchange's own filing is the
                    # better figure for the 153 periods where the two genuinely
                    # differ, and it wins. What the statement said is kept
                    # beside it rather than discarded.
                    complete = existing.get("assets") is not None or existing.get("equity") is not None
                    stated = existing.get("net_income")

                    if breaks_the_income_statement(existing, row["net_income"]):
                        skipped["incoherent"] = skipped.get("incoherent", 0) + 1
                        continue
                    if keep_statement_figure(existing, row["net_income"]):
                        kept_statement += 1
                    existing["net_income"] = row["net_income"]
                    # What basis the figure that WON was filed on, so a reader
                    # is never shown a profit whose basis nobody recorded.
                    existing["basis"] = row["basis"] or existing.get("basis") or "unstated"
                    existing["net_income_source"] = SOURCE
                    existing["period_start"] = row["period_start"]
                    existing["period_end"] = row["period_end"]
                    # The day the exchange received it, and the filing itself.
                    # `build_signals.py` reads both: the lag between period end
                    # and filing is what makes "results are due" computable,
                    # and the id is what lets a streak break link to the
                    # document that broke it rather than assert it.
                    existing["filed"] = row["filed"]
                    existing["filing_id"] = f"egx-{row['code']}"
                    overrode += 1
                    changed = True
                elif label not in index:
                    periods.append({
                        "period": label,
                        "net_income": row["net_income"],
                        "net_income_source": SOURCE,
                        "period_start": row["period_start"],
                        "period_end": row["period_end"],
                        "filed": row["filed"],
                        "filing_id": f"egx-{row['code']}",
                        # No statement exists for this period, so the
                        # exchange's line is all there is — and it says which
                        # basis it was filed on rather than leaving a reader to
                        # assume it matches the years around it.
                        "basis": row["basis"] or "unstated",
                        # Everything else genuinely unknown for this period. The
                        # exchange files one line, and inventing the rest is the
                        # mistake this repository has already made once.
                        "source": SOURCE,
                    })
                    added += 1
                    changed = True
            periods.sort(key=lambda p: str(p.get("period")))
        if changed:
            touched += 1
            if not dry_run:
                body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
                pathlib.Path(path).write_text(body, encoding="utf-8")
                mirror = FIXTURES / pathlib.Path(path).name
                if mirror.parent.exists():
                    mirror.write_text(body, encoding="utf-8")

    verb = "would touch" if dry_run else "touched"
    print(f"   {verb} {touched} companies — {overrode} figures replaced by the "
          f"exchange's, {added} periods added that Mubasher never had")
    if kept_statement:
        print(f"   took the exchange's figure on {kept_statement} period(s) that "
              f"had a statement, and kept the statement's own beside it")
    if skipped.get("magnitude"):
        print(f"   refused {skipped['magnitude']} override(s) as a likely unit "
              f"mismatch rather than publish a figure orders of magnitude out")
    return touched, overrode, added, kept_statement


def merge(dry_run: bool) -> int:
    rows, skipped = egx_rows()
    print(f"── EGX filed net profit: {len(rows)} (ticker, period) figures")
    print(f"   skipped — non-EGP {skipped['currency']}, no period "
          f"{skipped['no_period']}, unmapped span {skipped['no_label']}, "
          f"no ticker {skipped['no_ticker']}, "
          f"non-template units {skipped['qualified']}, zero {skipped['zero']}")
    write_rows(rows, skipped, dry_run)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    return merge(ap.parse_args().dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
