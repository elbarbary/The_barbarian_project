#!/usr/bin/env python3
"""Fail the build, loudly, when the exchange archive did not move today.

The EGX filing harvest is best-effort: from a datacenter IP the exchange
intermittently resets the connection, the step is skipped, and the build
happily republishes yesterday — the exchange screen, the calendar and
connecting-the-dots all a day stale, with a green tick. This guard is the
alarm. It reads the current month's filing archive and, on a trading day once
the session is well underway, refuses to let a stale archive through: build_all
returns non-zero, the CI step fails, the Commit step never runs, and the last
good data stays live while a person gets the failure e-mail.

Two thresholds, chosen to alarm without crying wolf before the exchange has
filed anything:

  * 2+ days behind on a trading day → fail at any hour (a clear outage; the day
    before was itself a trading day and would have filed).
  * exactly 1 day behind (newest is yesterday) → fail only from 08:00 UTC
    (11:00 Cairo, an hour into the session), by when today's filings exist.

EGX trades Sun–Thu. Public holidays are not modelled, so a holiday can raise a
false alarm — safe (someone re-checks) rather than silent. `--check` runs the
same test and writes nothing, so it is safe in a validation pass.
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


def newest_filing_date(today: datetime.date) -> datetime.date | None:
    path = FILINGS / f"{today:%Y-%m}.json.gz"
    if not path.exists():
        return None
    try:
        items = json.loads(gzip.decompress(path.read_bytes())).get("items", [])
    except (OSError, ValueError):
        return None
    stamps = [it.get("dateStamp", "") for it in items if it.get("dateStamp")]
    if not stamps:
        return None
    try:
        return datetime.date.fromisoformat(max(stamps)[:10])
    except ValueError:
        return None


def check() -> int:
    now = datetime.datetime.now(datetime.timezone.utc)
    today = now.date()
    if today.weekday() not in TRADING_WEEKDAYS:
        print(f"── Staleness guard: {today} is not a trading day — skipping")
        return 0

    newest = newest_filing_date(today)
    if newest is None:
        print(f"!! Staleness guard: no filings in the {today:%Y-%m} archive at all",
              file=sys.stderr)
        return 1

    behind = (today - newest).days
    if behind >= 2 or (behind >= 1 and now.hour >= SESSION_UP_HOUR_UTC):
        print(
            f"!! Staleness guard: the filing archive is {behind} day(s) behind "
            f"(newest {newest}, today {today}). The EGX harvest did not bring in "
            f"today's filings — most likely the exchange reset the runner's IP. "
            f"Failing rather than republish yesterday.\n"
            f"   Fix: re-run the harvest from a residential IP —\n"
            f"     python3 scripts/harvest_egx_beta.py --filings "
            f"--from {today:%Y-%m} --to {today:%Y-%m}\n"
            f"   then rebuild the filing-fed docs and push (see "
            f"project-esthmr-harvest-staleness).",
            file=sys.stderr,
        )
        return 1

    print(f"── Staleness guard: archive current (newest {newest}, {behind} day(s) "
          f"behind at {now:%H:%M} UTC) — ok")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="same test, writes nothing")
    ap.parse_args()
    return check()


if __name__ == "__main__":
    raise SystemExit(main())
