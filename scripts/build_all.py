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
    # Immediately after Market, because Market rebuilds `companies/` from
    # scratch on every run — `shutil.rmtree` then rewrite — and this is an
    # enrichment applied on top of it. It was run once by hand in August and
    # was gone by the next build: 11,336 filed net-profit figures back down to
    # 4,062, and nobody noticed because the file still looked full. Anything
    # that edits a published company document has to run here, in the list,
    # after the step that recreates it.
    ("EGX filed net profit", "merge_egx_financials.py", False),
    # What is unusual about a company against its own record — streak breaks,
    # silence measured against its own filing rhythm, first-in-years filings,
    # and when results are next due. Pure arithmetic over the committed
    # harvest, so it is safe in CI, and it reads the financials the step above
    # just merged.
    ("Signals", "build_signals.py", True),
    # News and rates run here too, so a full local build produces a complete
    # set — but their real cadence is publish-live-data.yml every 15 minutes.
    # A daily news feed is a bulletin, and an intraday metals price pinned for
    # twenty-four hours is stale data wearing today's date.
    ("Disclosures", "build_disclosures_api.py", True),
    ("News", "build_news_api.py", True),
    ("Rates", "build_rates_api.py", True),
    # The world outside the exchange.
    #
    # This was in no STEPS list and in no workflow: `macro.json` had four
    # commits in its life, none of them from CI, so Suez transits and the oil
    # price moved only when somebody remembered to run the script. The app was
    # meanwhile told to expect a maintained document — build_fixtures.py gives
    # it a manifest counter like every other resource.
    ("Macro", "build_macro_api.py", True),
    # The deep price series, a pure projection of the committed stage — no
    # network, and the same orphan story as Macro: 231 published files, two
    # commits, neither from CI. It is a no-op on every run where the stage has
    # not moved, which is most of them.
    ("Deep prices", "build_prices_api.py", True),
    # After Market and Rates: it reads what they published and writes one row
    # per session, which is the only way this app will ever have an index
    # series or a breadth history.
    ("Index levels + breadth", "build_market_history.py", False),
    # After the feeds it reads, and before the fixtures that bundle it.
    ("Connecting the dots", "build_connections_api.py", True),
    # The forward calendar, read out of the committed EGX filings harvest — no
    # network, so it is safe in CI. Best-effort: a checkout without the harvest
    # (data-source/egx-beta/) simply produces an empty calendar rather than
    # failing the build.
    ("Calendar", "build_calendar.py", False),
    # Every filing a company ever lodged, on its own page. Reads the committed
    # harvest off disk — no network — and is best-effort so a checkout without
    # `data-source/egx-beta/` simply leaves the published documents alone.
    ("Company filings", "build_company_filings.py", False),
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
    "Calendar",
    "Company filings",
    "Disclosures",
    # Egyptian news outlets, over a browser, and they time out. Today a
    # `Page.goto: Timeout 120000ms` inside News failed the whole build twice,
    # which meant the price-history recovery and the filed financials did not
    # publish — because one outlet was slow.
    #
    # The same script is already best-effort where its cadence actually
    # matters: `publish-live-data.yml` runs `build_news_api.py || true` every
    # fifteen minutes, so the feed a reader sees is never more than a quarter
    # of an hour old regardless of what this daily build does. Fatal here and
    # non-fatal there, for the same script against the same hosts, was an
    # inconsistency rather than a decision — and the expensive half was here.
    #
    # It already leaves the previously published document in place on failure.
    "News",
    "Filed net profit",
    # Three third parties — IMF PortWatch, investing.com, the World Bank — none
    # of which owes this project an answer. A refusal leaves the last good
    # macro.json in place, which is dated and labelled like everything else.
    "Macro",
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
