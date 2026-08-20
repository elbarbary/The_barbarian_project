#!/usr/bin/env python3
"""Rebuild every published dataset, in dependency order.

    criteria.md            -> cash-or-trash/index.json
    egx-insights.html      -> opportunities/latest.json + history/
    ../work/daily_scan_*   -> companies.json, market.json, companies/*.json
    all of the above       -> manifest.json  (the fingerprint that updates apps)

The manifest is built last on purpose: its `data_version` is a hash of the
other documents, and that hash is the only thing that tells an installed app
its cached copy is stale. Build it out of order and the app keeps serving
yesterday's research.

Any step that fails leaves the previously published data untouched (spec §21).

Usage:
    python3 scripts/build_all.py
    python3 scripts/build_all.py --check     # validate, write nothing
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

STEPS = [
    ("Cash or Trash", "build_cash_or_trash_api.py", True),
    ("Opportunity Scanner", "build_opportunity_api.py", True),
    ("Market", "build_market_api.py", False),
    # News and rates run here too, so a full local build produces a complete
    # set — but their real cadence is publish-live-data.yml every 15 minutes.
    # A daily news feed is a bulletin, and an intraday metals price pinned for
    # twenty-four hours is stale data wearing today's date.
    ("Disclosures", "build_disclosures_api.py", True),
    ("News", "build_news_api.py", True),
    ("Rates", "build_rates_api.py", True),
    ("Manifest + fixtures", "build_fixtures.py", False),
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    failed = []
    for name, script, supports_check in STEPS:
        cmd = [sys.executable, str(HERE / script)]
        if args.check and supports_check:
            cmd.append("--check")
        elif args.check:
            # This step has no dry run; skip it rather than write during a check.
            print(f"\n── {name}: skipped (no --check mode)")
            continue

        print(f"\n── {name}")
        result = subprocess.run(cmd, cwd=HERE.parent)
        if result.returncode != 0:
            failed.append(name)
            print(f"   FAILED — previously published data left in place")

    print()
    if failed:
        print(f"build_all: {len(failed)} step(s) failed: {', '.join(failed)}")
        return 1
    print("build_all: all steps succeeded")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
