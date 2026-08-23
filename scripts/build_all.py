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

# (name, script, supports --check, extra arguments)
#
# The two EGX-touching steps at the end carry deliberately small limits. The
# exchange rate-limits hard — it stopped answering after roughly forty requests
# in a day and has blocked us outright once before — so the archive is built by
# asking for a little every run rather than a lot once.
#
# **The limits are per run, and this now runs six times a trading day** (three
# Cairo times, each scheduled at both UTC offsets for DST). Five companies and
# eight filings a run is the same daily footprint the old fifteen-and-twenty-
# five had across two runs, spread thinner — which is the shape this host
# tolerates. Raise the cadence again and these come down again.
STEPS = [
    ("Cash or Trash", "build_cash_or_trash_api.py", True),
    ("Opportunity Scanner", "build_opportunity_api.py", True),
    # Before Market, which reads both stores when it starts. Each reads the
    # disclosures document the previous run published, so a filing found today
    # reaches the app on tomorrow's build — cumulative stores make that a lag
    # rather than a loss.
    ("Filed net profit", "build_financials_api.py", False),
    ("Market", "build_market_api.py", False),
    # News and rates run here too, so a full local build produces a complete
    # set — but their real cadence is publish-live-data.yml every 15 minutes.
    # A daily news feed is a bulletin, and an intraday metals price pinned for
    # twenty-four hours is stale data wearing today's date.
    ("Disclosures", "build_disclosures_api.py", True),
    ("News", "build_news_api.py", True),
    ("Rates", "build_rates_api.py", True),
    # After Market and Rates: it reads what they published and writes one row
    # per session, which is the only way this app will ever have an index
    # series or a breadth history.
    ("Index levels + breadth", "build_market_history.py", False),
    # After the feeds it reads, and before the fixtures that bundle it.
    ("Connecting the dots", "build_connections_api.py", True),
    ("Manifest + fixtures", "build_fixtures.py", False),
    # Last, and best-effort. Both read and extend the permanent archive, and
    # both are resumable: whatever the host refuses today is simply first in
    # the queue tomorrow. A failure here must never fail the build, because
    # the published documents above are already written and correct.
    # Mubasher, not the exchange, and a different rate limit — so it can ask
    # for more. Only companies whose name is still unknown are asked, so this
    # is a no-op the moment the map is full and a small catch-up whenever the
    # exchange lists something new.
    ("Arabic names", "harvest_names_mubasher.py", False, ["--limit", "12"]),
    ("Company filings", "harvest_company_filings.py", False,
     ["--limit", "5", "--spacing", "6"]),
    ("Filed documents", "enrich_disclosures.py", False,
     ["--limit", "8", "--spacing", "6"]),
]

# Steps whose failure is a shrug rather than a problem.
# Steps whose failure is a shrug rather than a problem.
#
# Everything that reaches the exchange is here. EGX needs a real browser, that
# browser is not on every machine this runs on, and the exchange refuses us
# outright often enough that treating a refusal as a broken build means the
# build is broken most days. Each of these leaves the last good document in
# place, so the cost of skipping one is that its data is a run older — against
# a cost, when they were fatal, of the market snapshot and every company
# document going three days without an update because a path did not exist on
# a runner.
BEST_EFFORT = {
    "Disclosures",
    "Filed net profit",
    "Arabic names",
    "Company filings",
    "Filed documents",
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    failed = []
    for step in STEPS:
        name, script, supports_check = step[0], step[1], step[2]
        extra = step[3] if len(step) > 3 else []
        cmd = [sys.executable, str(HERE / script), *extra]
        if args.check and supports_check:
            cmd.append("--check")
        elif args.check:
            # This step has no dry run; skip it rather than write during a check.
            print(f"\n── {name}: skipped (no --check mode)")
            continue

        print(f"\n── {name}")
        result = subprocess.run(cmd, cwd=HERE.parent)
        if result.returncode != 0:
            if name in BEST_EFFORT:
                print("   the host would not answer — trying again next run")
                continue
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
