#!/usr/bin/env python3
"""Who sits on the board and who holds the company, read off the filed form.

`build_named_insiders.py` reads post-execution forms — one trade, one name,
one before-and-after stake. Useful, and narrow: it can only ever name somebody
who happened to trade in the window we watched.

This reads the other form. Every listed company files a `نموذج تقرير إفصاح عن
مجلس الإدارة وهيكل المساهمين` — a disclosure of the board and the shareholder
structure — and it prints the whole thing at once: each director by name with
their role and who they represent, and each holder above the threshold with
their share count AND their percentage. One document covers a company; two
hundred and forty of them cover the exchange.

The forms are scans, so a model reads them. Everything it returns is checked
against arithmetic the document supplies itself:

    percent × totalShares ÷ 100 ≈ shares

MAAL's form prints 61,711,854 shares of 207,648,000 at 29.71%, and 29.71% of
207,648,000 is 61,692,020 — a quarter of one percent apart, which is rounding.
A misread digit is not. A reading whose own three numbers disagree is refused
rather than published, and so is one that hands a company more than a hundred
percent of itself.

    python3 scripts/build_ownership_structure.py --limit 40
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import subprocess
import sys

import build_named_insiders as named

REPO = pathlib.Path(__file__).resolve().parent.parent
LEDGER = REPO / "data-source" / "official" / "ownership" / "ownership-ledger.json"
STORE = REPO / "data-source" / "official" / "ownership" / "shareholder-structure.json"
PDF_DIR = REPO / "data-source" / "official" / "ownership" / "pdfs"

PROMPT = """This is an Egyptian Exchange disclosure form for a company's board
of directors and shareholder structure (نموذج تقرير إفصاح عن مجلس الإدارة
وهيكل المساهمين). Read the scan and return ONLY a JSON object, no prose and no
code fence, with exactly these keys:

{"companyArabic": string|null,
 "asOfDate": "YYYY-MM-DD"|null,
 "totalShares": number|null,
 "board": [{"nameArabic": string, "role": string|null, "representing": string|null}],
 "shareholders": [{"nameArabic": string, "percent": number, "shares": number|null,
                   "kind": "person"|"firm"}],
 "legible": true|false}

Copy every name exactly as printed, including titles like أ/ or د/. `percent`
is the holder's percentage of the company as printed. `shares` is the number of
shares printed beside it, or null if the form does not print one. `kind` is
"person" for a named individual and "firm" for a company, fund or bank.
`totalShares` is the company's total issued shares if the form states it.

Never guess. If a number is not printed, use null. If the scan is too poor to
read the names or the figures, return {"legible": false} and nothing else."""


def latest_per_company(ledger: dict) -> dict:
    """The most recent structure filing each company has made."""
    newest: dict[str, dict] = {}
    for doc in ledger.get("documents") or []:
        if doc.get("kind") != "ownership_structure":
            continue
        ticker = doc.get("ticker")
        if not ticker or not doc.get("attachments"):
            continue
        held = newest.get(ticker)
        if held is None or (doc.get("publishedAt") or "") > (held.get("publishedAt") or ""):
            newest[ticker] = doc
    return newest


def read_structure_agy(pdf: pathlib.Path) -> dict | None:
    if not named.AGY.exists():
        return None
    try:
        proc = subprocess.run(
            [str(named.AGY), "--dangerously-skip-permissions",
             "--add-dir", str(pdf.parent),
             "--model", "gemini-3.8-flash-low",
             "--print-timeout", "5m",
             "-p", f"Read the scanned PDF at {pdf}. {PROMPT}"],
            capture_output=True, text=True, timeout=420, cwd=str(pdf.parent),
        )
    except (subprocess.SubprocessError, OSError):
        return None
    return named._json_from(proc.stdout)


# A percentage and a share count that disagree by more than this are not two
# roundings of one truth. The forms print percentages to two decimals, so the
# implied share count can legitimately be out by half a basis point of the
# company; a misread digit moves it by whole percent.
RECONCILE_TOLERANCE_PP = 0.06
# The named holders of a company cannot own more of it than there is. A little
# over is rounding across a dozen rows; a lot over is one holder read twice.
OVER_ALLOWANCE_PP = 0.75


def _number(value) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value) if value == value and abs(value) != float("inf") else None


def incomplete(reading) -> bool:
    """True when the reader said nothing about the document.

    Distinct from a refusal. `{"legible": false}` is the reader looking at the
    scan and telling us it cannot read it — a fact about the document, and
    permanent. A missing object, or one carrying neither list nor a legibility
    verdict, is the reader failing to answer at all, and the document deserves
    another attempt on a quieter machine.
    """
    if not isinstance(reading, dict):
        return True
    if reading.get("legible") is False:
        return False
    return not isinstance(reading.get("board"), list) \
        and not isinstance(reading.get("shareholders"), list)


def vet(reading: dict, ticker: str, issuer: str) -> str | None:
    """The reason to refuse this reading, or None to keep it."""
    if not isinstance(reading, dict):
        return "the reader returned no object"
    if reading.get("legible") is False:
        return "the reader could not read the scan"

    board = reading.get("board") or []
    holders = reading.get("shareholders") or []
    if not isinstance(board, list) or not isinstance(holders, list):
        return "board and shareholders are not lists"
    if not board and not holders:
        return "the form yielded neither a director nor a holder"

    for row in board:
        if not isinstance(row, dict) or not named.usable_name(row.get("nameArabic")):
            return f"a director has no usable name: {row!r}"

    total = _number(reading.get("totalShares"))
    if total is not None and total <= 0:
        return f"total shares is not positive: {reading.get('totalShares')!r}"

    seen: set[str] = set()
    running = 0.0
    kept = 0
    for row in holders:
        if not isinstance(row, dict):
            return f"a holder is not an object: {row!r}"
        name = named.clean_name(row.get("nameArabic") or "")
        if not named.usable_name(name):
            return f"a holder has no usable name: {row.get('nameArabic')!r}"
        # The issuer is not a shareholder in itself here; treasury holdings are
        # a different form and are not what this one is printing.
        if named.is_the_issuer(name, issuer):
            return f"a holder is the issuer itself: {name!r}"

        percent = _number(row.get("percent"))
        # A director who owns nothing is on these forms, in the same table,
        # printed at zero — `هشام حسين الخازندار` among them. That is a fact
        # about the board, not a bad reading, and refusing the document over
        # it threw away twelve complete registers. Such a row is not a
        # shareholding, so it leaves the list; the document stays.
        if percent is None or percent == 0:
            continue
        # Out of range IS a misread, and the document goes with it.
        if not 0 < percent <= 100:
            return f"a stake outside 0-100%: {row.get('percent')!r} for {name!r}"

        key = named.skeleton(name)
        if key in seen:
            return f"the same holder is listed twice: {name!r}"
        seen.add(key)
        running += percent
        kept += 1

        shares = _number(row.get("shares"))
        if shares is not None and shares <= 0:
            return f"a share count that is not positive: {row.get('shares')!r}"
        # The form's own arithmetic, where it prints all three numbers.
        if shares is not None and total:
            implied = shares / total * 100
            if abs(implied - percent) > RECONCILE_TOLERANCE_PP:
                return (f"{name!r} holds {shares:,.0f} of {total:,.0f} shares, "
                        f"which is {implied:.2f}% and not the {percent:.2f}% printed")

    if running > 100 + OVER_ALLOWANCE_PP:
        return f"the named holders add to {running:.2f}% of the company"
    if not board and not kept:
        return "the form yielded neither a director nor a holder"
    return None


def owning(holders) -> list:
    """The rows that are actually a shareholding.

    Same rule `vet` applies, so what is published is what was checked: a row
    printed at zero, or with no percentage at all, names somebody on the form
    without naming a holding.
    """
    return [row for row in holders or []
            if isinstance(row, dict) and (_number(row.get("percent")) or 0) > 0]


def held() -> dict:
    if STORE.exists():
        try:
            return json.loads(STORE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"schemaVersion": 1, "readings": {}, "refused": {}}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=5,
                    help="how many forms to read this run")
    ap.add_argument("--refresh", default="", help="re-read one filing id")
    ap.add_argument("--engine", choices=("agy", "vertex"), default="agy")
    ap.add_argument("--check", action="store_true",
                    help="report what is outstanding and write nothing")
    args = ap.parse_args(argv)

    if not LEDGER.exists():
        print("no ownership ledger yet — run ownership_ledger.py")
        return 0
    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
    newest = latest_per_company(ledger)
    store = held()
    done = set(store["readings"]) | set(store["refused"])
    if args.refresh:
        done.discard(args.refresh)
        store["readings"].pop(args.refresh, None)
        store["refused"].pop(args.refresh, None)

    # Oldest company first, so a long backlog is worked through in a stable
    # order and a run that stops halfway leaves the same place to resume.
    queue = [d for d in sorted(newest.values(), key=lambda d: str(d.get("filingId")))
             if str(d.get("filingId")) not in done]
    print(f"   {len(newest)} companies have filed a structure form; "
          f"{len(newest) - len(queue)} read, {len(queue)} outstanding")
    if args.check or not queue:
        return 0

    PDF_DIR.mkdir(parents=True, exist_ok=True)
    reader = read_structure_agy if args.engine == "agy" else None
    kept = refused = unreachable = 0
    for doc in queue[: max(0, args.limit)]:
        filing = str(doc.get("filingId"))
        ticker = doc.get("ticker")
        url = doc["attachments"][0]
        pdf = PDF_DIR / f"structure-{filing}.pdf"
        if not pdf.exists() and not named.fetch_pdf(url, pdf):
            print(f"   {filing} {ticker}: could not fetch the document")
            unreachable += 1
            continue
        reading = reader(pdf) if reader else None
        if reading is None:
            reading = named.read_form(pdf)
        # A reader that timed out or came back truncated has told us nothing
        # about the document. Recording that as a refusal would blacklist the
        # company for good — four of the first twenty-three were lost that way,
        # to a busy machine rather than to anything on the page.
        if not incomplete(reading):
            pass
        else:
            print(f"   {filing} {ticker}: the reader gave no usable answer — will retry")
            unreachable += 1
            continue
        issuer = named.issuer_name({}, ticker) or (doc.get("title") or "")
        why = vet(reading, ticker, issuer)
        if why:
            store["refused"][filing] = why
            print(f"   {filing} {ticker}: refused — {why}")
            refused += 1
            continue
        store["readings"][filing] = {
            "filingId": filing,
            "ticker": ticker,
            "publishedAt": doc.get("publishedAt"),
            "sessionDate": doc.get("sessionDate"),
            "source": url,
            "companyArabic": reading.get("companyArabic"),
            "asOfDate": reading.get("asOfDate"),
            "totalShares": _number(reading.get("totalShares")),
            "board": reading.get("board") or [],
            "shareholders": owning(reading.get("shareholders")),
            # Named on the form with no holding — a director who owns none of
            # the company he sits on the board of. Kept apart rather than
            # dropped: it is the sort of thing worth being able to ask about.
            "namedWithoutAStake": [r.get("nameArabic") for r in (reading.get("shareholders") or [])
                                   if isinstance(r, dict) and not (_number(r.get("percent")) or 0) > 0],
        }
        seats = len(reading.get("board") or [])
        holders = len(owning(reading.get("shareholders")))
        print(f"   {filing} {ticker}: {seats} directors, {holders} holders")
        kept += 1

    STORE.parent.mkdir(parents=True, exist_ok=True)
    STORE.write_text(json.dumps(store, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"   kept {kept}, refused {refused}, unreachable {unreachable}; "
          f"{len(store['readings'])} companies read in all")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
