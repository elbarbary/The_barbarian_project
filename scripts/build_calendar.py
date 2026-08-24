#!/usr/bin/env python3
"""A forward calendar of scheduled events, read out of filings already lodged.

The exchange does not publish a "what is coming" feed — its own site has an
Events tab that returns an empty list. But **29% of disclosures name a date
after they were filed**: a dividend's payment date, a rights issue's
subscription window, the day a suspended share resumes, the date of a called
general assembly. Those are facts the issuer has already put on the record, and
between them they are a calendar.

This reads that calendar out of the disclosure bodies harvested by
`harvest_egx_beta.py`. It is **not a prediction**. Every row is a date a
company or the exchange has already published, quoted from the filing, with a
link back to it. Nothing here is inferred, scored or forecast — §8 forbids that
and it would be the wrong tool anyway: the exchange has told us the dates.

How a date becomes a row
------------------------
Each event type is matched by the **labelled field** the exchange's own
template uses, not by grabbing any date in the body. "Payment Date : 21/06/2026"
in a Cash Dividend filing is a dividend payment; a date sitting loose in a
sentence is not trusted. This is the difference between a calendar and a pile of
numbers — the label is the event's meaning, and a field with no label is
skipped rather than guessed at.

A row is kept only when its date is **after the filing that announced it** (a
minute recording a past assembly is not a future event) and, for the published
calendar, **on or after today**. The historical rows stay in the raw harvest;
what ships is what has not happened yet.

Output
------
`public/data/v1/calendar.json` — every upcoming event, soonest first, each with
its company, type, date, the one line the exchange wrote, and the filing link.
Also written to the app fixtures, like every other builder.

This does not touch the network. It reads the harvest on disk, so it is cheap
to run as often as the harvest refreshes.
"""

from __future__ import annotations

import argparse
import datetime
import glob
import gzip
import json
import pathlib
import re

import build_signals
import egx_dates
import filing_types as ft

REPO = pathlib.Path(__file__).resolve().parent.parent
FILINGS = REPO / "data-source" / "egx-beta" / "filings"
OUT = REPO / "public" / "data" / "v1" / "calendar.json"
# One document per month of filings that have already been lodged. The
# scheduled half of this screen answers "what is coming"; a reader looking at a
# past week wants the other half — what actually landed. Month-sharded and
# fetched on demand, like the disclosure archive, because a year of them is
# five megabytes and nobody opens a year.
FILED = REPO / "public" / "data" / "v1" / "calendar" / "filed"
FILED_MONTHS = 12
# Written in both places, like every other builder: build_fixtures verifies the
# bundled copy matches the published one and fails the build if it drifts.
FIXTURE = REPO / "app" / "assets" / "fixtures" / "calendar.json"
FIXTURE_FILED = REPO / "app" / "assets" / "fixtures" / "calendar" / "filed"

TICKER = re.compile(r"\(([A-Z0-9]{2,8})\.CA\)")
# The heading of a filing that names two listings writes them inside one pair
# of brackets — "(FAITA.CA-FAIT.CA)" — which the pattern above will not match
# at all, so 64 filings on a single day came through with no company against
# them. This one takes the first ticker in the group.
ANY_TICKER = re.compile(r"\(([A-Z0-9]{2,8})\.CA\b")


def strip(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html or "")
    return re.sub(r"\s+", " ", text).strip()


def labelled(body: str, *labels: str) -> datetime.date | None:
    """The date after one of these field labels, first match wins.

    Order-aware: the exchange writes some filings month-first, and reading one
    of those day-first either raises — losing the event silently — or, worse,
    lands eleven months out. `egx_dates` settles the format per filing from the
    filing's own evidence.
    """
    return egx_dates.after_label(body, *labels)


def effective(body: str) -> datetime.date | None:
    """`effective DD/MM/YYYY trading session` — the trading-notice phrasing."""
    return egx_dates.after_label(body, "effective")


# One extractor per event type. Each returns a list of (kind, date, note),
# reading only labelled fields so an unlabelled date is never mistaken for a
# scheduled one. `section` is the exchange's own category; `body` is stripped.
def events_for(section: str, heading: str, body: str):
    out = []
    low = heading.lower()

    if section == "Corporate Actions":
        pay = labelled(body, "Payment Date", "Dividend Date", "Dividend (Due) Date",
                       "Distribution Date", "Distribution (payment) date", "Due Date")
        if pay:
            out.append(("dividend_payment", pay, "Cash dividend payment"))
        ex = labelled(body, "Ex-Dividend Date", "Ex Dividend Date")
        if ex:
            out.append(("ex_dividend", ex, "Ex-dividend — last day to own for the coupon"))
        begin = labelled(body, "Beginning Date Of Subscription to Rights Issue",
                         "Beginning Date of Subscription to Rights Issue")
        end = labelled(body, "Ending Date of Subscription to Rights Issue")
        till = labelled(body, "Entitled to Rights Issue till")
        if begin:
            out.append(("rights_open", begin, "Rights issue subscription opens"))
        if end:
            out.append(("rights_close", end, "Rights issue subscription closes"))
        if till and not begin:
            out.append(("rights_entitlement", till, "Last day to be entitled to the rights issue"))

    elif section == "General Assemblies":
        # Only invitations look forward; minutes and decisions record a meeting
        # that already happened, and their "Assembly Date" is in the past.
        if "invitation" in low or "invite" in low or "call" in low:
            when = labelled(body, "Assembly Date", "Meeting Date", "Date")
            kind = "egm" if "egm" in low else "agm"
            label = "Extraordinary General Assembly" if kind == "egm" else "Annual General Assembly"
            if when:
                out.append((f"assembly_{kind}", when, label))

    elif section == "Trading Notices":
        when = effective(body)
        if when:
            if "resume" in low:
                out.append(("trading_resume", when, "Trading resumes"))
            elif "suspen" in low:
                out.append(("trading_suspend", when, "Trading suspended"))

    elif section == "Listing Announcements":
        when = labelled(body, "Listing Date", "Effective Date")
        if when:
            out.append(("listing_effective", when, "Listing change takes effect"))

    return out


def harvested_filings():
    for path in sorted(glob.glob(str(FILINGS / "*.json.gz"))):
        doc = json.loads(gzip.decompress(pathlib.Path(path).read_bytes()))
        yield from doc.get("items", [])


def build(*, on_or_after: datetime.date | None) -> list[dict]:
    rows: dict[tuple, dict] = {}
    for item in harvested_filings():
        try:
            filed = datetime.date.fromisoformat(item["dateStamp"][:10])
        except (KeyError, ValueError):
            continue
        heading = item.get("heading") or ""
        arabic = item.get("headingArabic") or ""
        body = strip(item.get("content"))
        section = (item.get("section") or "").strip()
        tick = TICKER.search(heading)
        ticker = tick.group(1) if tick else None

        for kind, when, note in events_for(section, heading, body):
            # A scheduled event is after the filing that announced it. This drops
            # the minutes/decisions whose date is the meeting already held.
            if when <= filed:
                continue
            if on_or_after and when < on_or_after:
                continue
            key = (ticker, kind, when.isoformat())
            # Keep the most recently filed announcement of the same event: a
            # correction supersedes the original.
            if key in rows and rows[key]["filed"] >= item["dateStamp"][:10]:
                continue
            rows[key] = {
                "date": when.isoformat(),
                "kind": kind,
                "note": note,
                "ticker": ticker,
                "title": heading.strip(),
                "title_ar": arabic.strip(),
                "filed": item["dateStamp"][:10],
                "section": section,
                "link": f"https://www.egx.com.eg/en/NewsDetails.aspx?NewsID={item['code']}",
                "id": f"egx-{item['code']}",
            }
    return sorted(rows.values(), key=lambda r: (r["date"], r["ticker"] or "", r["kind"]))


def company_names() -> dict[str, str]:
    """ticker → English name, for the companies the app actually lists."""
    try:
        doc = json.loads(
            (REPO / "public" / "data" / "v1" / "companies.json").read_text(encoding="utf-8")
        )
    except (OSError, json.JSONDecodeError):
        return {}
    return {
        c["ticker"]: c.get("name_en") or c["ticker"]
        for c in doc.get("companies", [])
        if c.get("ticker")
    }


def expected_rows(today: datetime.date, known: dict[str, str]) -> list[dict]:
    """When each company's next results are due — a window, plainly labelled.

    This is the one thing on the calendar that the exchange has not published.
    It is included because the alternative is a calendar with five entries on
    it, and because the claim is narrow enough to stand up: *this company has
    filed its nine-month figures between 5 and 27 November in each of the last
    twelve years*. That is a statement about a disclosure date, computed from
    that company's own filing history, and it carries `estimated: true` plus
    the number of years behind it so a reader is never asked to mistake it for
    a date somebody filed.

    It is not, and must not become, a statement about the figures themselves.
    """
    # Read from what the Signals step published rather than recomputed here:
    # the arithmetic is the same, and doing it twice means parsing the whole
    # harvest twice in one build.
    due_by_ticker = build_signals.published_results_due()
    if not due_by_ticker:
        due_by_ticker = build_signals.expected_results(today)

    rows = []
    for ticker, due in due_by_ticker.items():
        if ticker not in known:
            continue
        for entry in due:
            rows.append({
                "date": entry["expected"],
                "kind": "results_expected",
                "note": f"{entry['label']} results usually filed around now",
                "ticker": ticker,
                "title": f"{known[ticker]} — {entry['label']} results expected",
                "title_ar": "",
                "filed": "",
                "section": "Estimated",
                "link": "",
                "id": f"due-{ticker}-{entry['label']}-{entry['period_end']}",
                # Everything below this line is what makes the row honest.
                "estimated": True,
                "period_end": entry["period_end"],
                "window_start": entry["window_start"],
                "window_end": entry["window_end"],
                "observations": entry["observations"],
            })
    return rows


def filed_rows() -> dict[str, list[dict]]:
    """Every filing already lodged, bucketed by the month it was lodged in.

    The scheduled half of the calendar is what a company said would happen.
    This is what did: the exchange's own record, the same rows the company
    pages show, indexed by date instead of by company.
    """
    months: dict[str, list[dict]] = {}
    for item in harvested_filings():
        stamp = (item.get("dateStamp") or "")[:10]
        if len(stamp) != 10:
            continue
        heading = (item.get("heading") or "").strip()
        arabic = (item.get("headingArabic") or "").strip()
        tick = ANY_TICKER.search(heading) or ANY_TICKER.search(arabic)
        months.setdefault(stamp[:7], []).append({
            "date": stamp,
            "ticker": tick.group(1) if tick else None,
            "title": arabic or heading,
            "title_en": heading,
            "type": ft.classify_rules(arabic) or ft.classify_rules(heading),
            "section": (item.get("section") or "").strip(),
            "id": f"egx-{item['code']}",
            "link": f"https://www.egx.com.eg/en/NewsDetails.aspx?NewsID={item['code']}",
        })
    return months


def write_filed(months: dict[str, list[dict]], today: datetime.date) -> list[dict]:
    """The most recent [FILED_MONTHS] months, one document each, plus an index.

    Published in full; **bundled one month deep**. The fixtures are a
    cold-start fallback compiled into the app binary, and twelve months of
    filings is seven megabytes of it — for eleven months a reader would have
    to scroll back to before they would see. The current month is worth
    carrying; the rest is a download, which is what sharding was for.
    """
    wanted = sorted(months, reverse=True)[:FILED_MONTHS]
    bundled = wanted[:1]
    index = []
    for root in (FILED, FIXTURE_FILED):
        mirror = root is FIXTURE_FILED
        if mirror and not root.parent.parent.exists():
            continue
        root.mkdir(parents=True, exist_ok=True)
        keep = bundled if mirror else wanted
        # Months that fell out of the window are deleted rather than left to
        # rot: a stale shard is a month the index does not offer and nothing
        # ever refreshes.
        for stale in root.glob("*.json"):
            if stale.stem not in keep and stale.stem != "index":
                stale.unlink()
        for month in keep:
            rows = sorted(months[month], key=lambda r: (r["date"], r["ticker"] or ""))
            (root / f"{month}.json").write_text(
                json.dumps({"month": month, "count": len(rows), "items": rows},
                           ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
    for month in wanted:
        rows = months[month]
        index.append({
            "month": month,
            "count": len(rows),
            "first": min(r["date"] for r in rows),
            "last": max(r["date"] for r in rows),
        })
    payload = json.dumps(
        {"generated": today.isoformat(), "months": index},
        ensure_ascii=False, separators=(",", ":"),
    )
    for root in (FILED, FIXTURE_FILED):
        if root.exists():
            (root / "index.json").write_text(payload, encoding="utf-8")
    return index


def main() -> int:
    today = datetime.date.today()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true",
                        help="every scheduled event ever, past included")
    parser.add_argument("--past-days", type=int, default=90,
                        help="how many days of recent events to keep for context "
                             "(default 90; ignored with --all)")
    parser.add_argument("--horizon", type=int, default=0,
                        help="only events within this many days (0 = no limit)")
    parser.add_argument("--no-estimates", action="store_true",
                        help="only dates an issuer filed; no expected results")
    parser.add_argument("--no-filed", action="store_true",
                        help="skip the month shards of already-lodged filings")
    args = parser.parse_args()

    # The published calendar is a window around now: recent events give the
    # day and month views something to show today, and everything scheduled
    # ahead is kept unbounded. --all dumps the whole history instead.
    floor = None if args.all else today - datetime.timedelta(days=args.past_days)
    rows = build(on_or_after=floor)

    # The estimated half, kept separate right up to the last moment so it is
    # obvious in this file which rows the exchange published and which ones we
    # computed. `--no-estimates` drops them entirely.
    known = company_names()
    estimates = [] if args.no_estimates else expected_rows(today, known)
    rows = sorted(rows + estimates,
                  key=lambda r: (r["date"], r["ticker"] or "", r["kind"]))

    if args.horizon:
        cutoff = today + datetime.timedelta(days=args.horizon)
        rows = [r for r in rows if datetime.date.fromisoformat(r["date"]) <= cutoff]

    doc = {
        "generated": today.isoformat(),
        "source": "EGX disclosures — scheduled dates the issuer has filed",
        "past_days": None if args.all else args.past_days,
        "count": len(rows),
        "estimated": len(estimates),
        "events": rows,
    }
    payload = json.dumps(doc, ensure_ascii=False, indent=1)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(payload, encoding="utf-8")
    if FIXTURE.parent.exists():
        FIXTURE.write_text(payload, encoding="utf-8")

    months = [] if args.no_filed else write_filed(filed_rows(), today)

    import collections
    by_kind = collections.Counter(r["kind"] for r in rows)
    upcoming = sum(1 for r in rows if r["date"] >= today.isoformat())
    scope = "scheduled (all time)" if args.all else f"in window ({upcoming} upcoming)"
    print(f"── Calendar: {len(rows)} events {scope}")
    for kind, n in by_kind.most_common():
        print(f"   {kind:<20} {n}")
    if months:
        lodged = sum(m["count"] for m in months)
        print(f"   {lodged} filings already lodged, in {len(months)} monthly shards")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
