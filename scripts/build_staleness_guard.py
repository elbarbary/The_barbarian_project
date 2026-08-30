#!/usr/bin/env python3
"""Fail the build, loudly, when the exchange archive did not actually refresh.

The EGX filing harvest is best-effort: from a datacenter IP the exchange can
reset the connection, the step is skipped, and the build would happily
republish yesterday — the exchange screen, the calendar and connecting-the-dots
all a day stale, with a green tick. This guard is the alarm.

WHAT IT TESTS, AND WHY THAT CHANGED
-----------------------------------
The first version compared the newest filing in the archive against today's
date and failed when they differed. That conflates two completely different
situations:

  * the harvest failed, so we are missing filings the exchange has published
    — a real outage, and the thing this guard exists to catch; and
  * the harvest succeeded and the exchange published nothing — a holiday, or
    simply a quiet day — where the archive is exactly as current as it can be.

It could not tell them apart, so it failed three consecutive builds on
27 August 2026, when a harvest from a residential IP returned byte-for-byte
what CI had already fetched: 1,467 filings, newest 26 August. The exchange had
filed nothing that Thursday. Nothing was wrong, and because the guard is
critical, prices, news and rates stopped updating too — an outage caused
entirely by the alarm.

So the test is now on the harvest itself, which is the part that can fail. The
archive records the date it was last written and the count the exchange said to
expect, so:

  * harvested today, with the expected number of filings → current, whatever
    the newest filing date is. If the exchange published nothing, that is an
    answer about the exchange, not a fault in the pipeline.
  * harvested today but short of `expected` → truncated mid-run → fail.
  * not harvested today → the step did not run or was refused → fall back to
    the date test, which is now a genuine signal, and fail on the same
    thresholds as before.

EGX trades Sun–Thu. `--check` runs the same test and writes nothing.
"""

from __future__ import annotations

import argparse
import datetime
import gzip
import json
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
FILINGS = REPO / "data-source" / "egx-beta" / "filings"

# Python weekday(): Mon=0 … Sun=6. The Egyptian Exchange trades Sunday–Thursday.
TRADING_WEEKDAYS = {6, 0, 1, 2, 3}
# Newest may be yesterday early on (today's filings not lodged yet); insist on
# today's only once the session has been open an hour.
SESSION_UP_HOUR_UTC = 8

FIX = (
    "   Fix: re-run the harvest from a residential IP —\n"
    "     python3 scripts/harvest_egx_beta.py --filings --from {month} --to {month}\n"
    "   then rebuild the filing-fed docs and push (see "
    "project-esthmr-harvest-staleness)."
)


def read_archive(month: str) -> dict | None:
    """The month's archive, or None when it is missing or unreadable."""
    path = FILINGS / f"{month}.json.gz"
    if not path.exists():
        return None
    try:
        return json.loads(gzip.decompress(path.read_bytes()))
    except (OSError, ValueError):
        return None


def _date(raw: object) -> datetime.date | None:
    try:
        return datetime.date.fromisoformat(str(raw)[:10])
    except (TypeError, ValueError):
        return None


def last_run() -> dict | None:
    """What `harvest_egx_beta` wrote the last time it found nothing to add.

    A separate file rather than a field on the month archive: those are
    gzipped blobs of a third of a megabyte, and stamping a date onto one four
    times a trading day would cost the repository roughly a third of a
    gigabyte a year.
    """
    path = FILINGS / "last-run.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return None


def newest_filing_date(archive: dict) -> datetime.date | None:
    stamps = [it.get("dateStamp", "") for it in archive.get("items", [])
              if it.get("dateStamp")]
    return _date(max(stamps)) if stamps else None


def check(today: datetime.date | None = None,
          hour_utc: int | None = None) -> int:
    now = datetime.datetime.now(datetime.timezone.utc)
    today = today or now.date()
    hour_utc = now.hour if hour_utc is None else hour_utc
    month = f"{today:%Y-%m}"

    if today.weekday() not in TRADING_WEEKDAYS:
        print(f"── Staleness guard: {today} is not a trading day — skipping")
        return 0

    archive = read_archive(month)
    if archive is None:
        # A month with no archive yet is normal on its first day, as long as
        # the harvest itself ran — it writes the previous month in the same
        # pass. Only an unharvested gap is an alarm.
        previous = read_archive(
            f"{(today.replace(day=1) - datetime.timedelta(days=1)):%Y-%m}")
        if previous and _date(previous.get("harvested")) == today:
            print(f"── Staleness guard: no {month} archive yet, but the harvest "
                  f"ran today — ok")
            return 0
        print(f"!! Staleness guard: no filings in the {month} archive at all\n"
              + FIX.format(month=month), file=sys.stderr)
        return 1

    harvested = _date(archive.get("harvested"))
    newest = newest_filing_date(archive)
    expected = archive.get("expected")
    held = len(archive.get("items", []))

    if harvested == today:
        # The harvest reached the exchange today, so the archive holds what the
        # exchange has. Only a short read is a fault.
        if isinstance(expected, int) and held < expected:
            print(f"!! Staleness guard: the {month} harvest ran today but stopped "
                  f"short — {held} filings held against {expected} the exchange "
                  f"reported. Failing rather than publish a truncated archive.\n"
                  + FIX.format(month=month), file=sys.stderr)
            return 1
        quiet = "" if newest == today else (
            f"; the exchange has published nothing since {newest}")
        print(f"── Staleness guard: harvest ran today, {held} filings held"
              f"{quiet} — ok")
        return 0

    # A complete archive is not rewritten, so its own `harvested` stamp goes
    # stale on every quiet day even though the harvest ran and the exchange
    # simply had nothing new. `harvest_egx_beta.note_run` records that in a few
    # bytes beside the month files; without it this guard failed the daily
    # build on 30 August 2026 with "the harvest did not run today (last
    # harvested 2026-08-28)" — minutes after a harvest that had run and
    # correctly found nothing.
    ran = last_run()
    if ran and _date(ran.get("harvested")) == today and ran.get("month") == month:
        short = (isinstance(ran.get("expected"), int)
                 and isinstance(ran.get("held"), int)
                 and ran["held"] < ran["expected"])
        if not short:
            print(f"── Staleness guard: the harvest asked today and the {month} "
                  f"archive was already complete "
                  f"({ran.get('held')}/{ran.get('expected')}); the exchange has "
                  f"published nothing since {newest} — ok")
            return 0

    # The harvest did not run today. Now a stale newest date means what the
    # guard was always meant to catch.
    if newest is None:
        print(f"!! Staleness guard: the {month} archive holds no dated filings\n"
              + FIX.format(month=month), file=sys.stderr)
        return 1

    behind = (today - newest).days
    if behind >= 2 or (behind >= 1 and hour_utc >= SESSION_UP_HOUR_UTC):
        seen = f"last harvested {harvested}" if harvested else "never harvested"
        print(
            f"!! Staleness guard: the filing archive is {behind} day(s) behind "
            f"(newest {newest}, today {today}) and the harvest did not run today "
            f"({seen}). The exchange most likely refused this runner's address. "
            f"Failing rather than republish yesterday.\n"
            + FIX.format(month=month),
            file=sys.stderr,
        )
        return 1

    print(f"── Staleness guard: archive current (newest {newest}, {behind} day(s) "
          f"behind at {hour_utc:02d}:00 UTC) — ok")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="same test, writes nothing")
    ap.parse_args()
    return check()


if __name__ == "__main__":
    raise SystemExit(main())
