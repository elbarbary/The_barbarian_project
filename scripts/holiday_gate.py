#!/usr/bin/env python3
"""Decide whether a scheduled run should do the heavy rebuild, or stand down.

The app-data build runs four times a trading day. On a market holiday nothing
it touches changes, so the second, third and fourth runs are pure no-ops that
still spend twenty-five minutes of a runner each. This collapses a closed day
to its morning run.

It prints one line for `$GITHUB_OUTPUT`:

    build=true    # go ahead
    build=false   # confirmed closed session, past the morning — skip the rebuild

**Fail-safe by construction.** Every uncertainty resolves to `build=true`. The
danger to avoid is the opposite of wasted minutes: skipping a real trading-day
update leaves the app stale, which is the failure this whole schedule exists to
prevent. So a run only stands down when the exchange has positively said the
session is closed — never on a missing scan, an unreadable one, a fetch that
failed, or simply not knowing.

The reasoning, in order:

  * Before 11:00 Cairo every run builds. The pre-open run is the one run a
    holiday should still get, and in the first half-hour after the 10:00 open a
    real session may not have printed a bar into the scan yet. Both regimes of
    the DST-doubled cron put their morning ticks here.
  * Otherwise it reads the freshest `daily_scan_<date>.json` the scan step just
    wrote. `runDate` is today; each record's `date` is the session bar it
    carries, which equals `runDate` the moment the market is trading. If any
    record is stamped today, the session is live — build. If the scan is
    absent, empty or unreadable (a refused fetch, a local run), build anyway.
  * Only when the scan is present and readable and *no* record is stamped today
    — the exchange returned yesterday's session well after this morning's open —
    is the day a confirmed holiday, and the rebuild stands down.
"""

from __future__ import annotations

import datetime
import glob
import json
import sys
from pathlib import Path

# `../work`, the same directory build_market_api.py reads the scan from.
WORK = Path(__file__).resolve().parents[1].parent / "work"

# Before this Cairo hour, always build (pre-open + early session).
MORNING_UNTIL = 11


def _cairo_now() -> datetime.datetime | None:
    try:
        from zoneinfo import ZoneInfo

        return datetime.datetime.now(ZoneInfo("Africa/Cairo"))
    except Exception:
        return None


def decide() -> tuple[bool, str]:
    now = _cairo_now()
    if now is None:
        return True, "no Cairo clock available — build (fail-safe)"
    if now.hour < MORNING_UNTIL:
        return True, f"{now:%H:%M} Cairo — morning run always builds"

    scans = sorted(glob.glob(str(WORK / "daily_scan_*.json")))
    if not scans:
        return True, f"no scan under {WORK} — build (fail-safe)"
    try:
        data = json.loads(Path(scans[-1]).read_text())
    except (OSError, json.JSONDecodeError):
        return True, "scan unreadable — build (fail-safe)"

    run_date = data.get("runDate")
    records = data.get("records") or []
    if not run_date or not records:
        return True, "scan carried no session — build (fail-safe)"

    if any(rec.get("date") == run_date for rec in records):
        return True, f"session {run_date} is trading — build"
    latest = max((rec.get("date") or "" for rec in records), default="")
    return False, (
        f"no record stamped {run_date}; freshest session is {latest or 'unknown'} "
        f"— market closed today, standing down"
    )


def main() -> int:
    build, why = decide()
    print(f"build={'true' if build else 'false'}")
    sys.stderr.write(why + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
