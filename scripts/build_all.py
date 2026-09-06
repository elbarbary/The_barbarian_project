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
import datetime
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

# The month before this one, as YYYY-MM. Corrections and late filings land in
# the previous month often enough that harvesting only the current one leaves
# holes that nothing ever fills.
_TODAY = datetime.date.today()
LAST_MONTH = (_TODAY.replace(day=1) - datetime.timedelta(days=1)).strftime("%Y-%m")

# (name, script, supports --check, extra arguments)
#
# The two EGX-touching steps at the end carry deliberately small limits. The
# exchange rate-limits hard — it stopped answering after roughly forty requests
# in a day and has blocked us outright once before — so the archive is built by
# asking for a little every run rather than a lot once.
#
# **The limits are per run, and this now runs four times a trading day** (two
# Cairo times — one before the open, one after the close — each scheduled at
# both UTC offsets for DST). It was six until the session ticks moved to
# `publish-prices.yml`, which rebuilds prices in three minutes and asks this
# host for nothing at all.
#
# The limits are deliberately NOT raised to compensate. Four runs instead of
# six is about a third less archive a day, and the archive is cumulative, so
# that is a slower fill rather than a hole. Raising the per-run numbers to
# claw it back would push more requests into each burst at a host that
# "stopped answering after roughly forty requests in a day and has blocked us
# outright once before" — the opposite of the "a little every run" shape these
# limits exist to hold. If the fill turns out too slow, raise them then, on
# their own, where the effect can be attributed.
STEPS = [
    ("Cash or Trash", "build_cash_or_trash_api.py", True),
    # Before Market, which reads both stores when it starts. Each reads the
    # disclosures document the previous run published, so a filing found today
    # reaches the app on tomorrow's build — cumulative stores make that a lag
    # rather than a loss.
    ("Filed net profit", "build_financials_api.py", False),
    # Before Market, which reads the file it writes. The exchange's own market
    # values beat the vendor's where the two disagree — and on 30 August 2026
    # they disagreed by up to two thirds on five companies, one of which was
    # simply wrong. Best-effort and carried forward: a missing file means the
    # vendor's figure stands, exactly as before this existed.
    ("EGX session figures", "harvest_egx_session.py", True),
    ("Market", "build_market_api.py", False),
    # And the same classification on the company screen as on the market table.
    #
    # The market build already resolves the exchange's sector — and then wrote
    # the vendor's raw column into the per-company document, so 217 of 284
    # companies contradicted themselves between two screens. That one line is
    # fixed, but the market build only runs where the daily scan exists, which
    # is not CI. This runs everywhere and costs nothing, so the rule holds
    # rather than depending on an optional input.
    ("Company facts", "apply_company_facts.py", True),
    # New filings, before anything that reads them.
    #
    # The archive under `data-source/egx-beta/filings` is what the calendar's
    # lodged months, the signals engine and the briefs all read — and nothing
    # in CI had ever grown it. It was last extended by hand, so every one of
    # those features was serving an archive frozen on the day somebody
    # remembered to run the harvester. The calendar cannot "show new filings"
    # if no new filings ever arrive.
    #
    # Two months rather than the year the script defaults to: the current one,
    # and the one before it because corrections land late. When a month is
    # already complete the script asks once for its count and skips, so a quiet
    # run costs two requests; a month that grew costs seven more. Best-effort,
    # like everything else that touches this host — a refusal means the archive
    # is a build older, not that the build failed.
    #
    # It is here, above the readers, rather than at the end with the other
    # EGX steps, because a filing harvested after the calendar is built does
    # not reach a reader until the next run — which, now that this runs twice a
    # trading day rather than six times, is the next session.
    ("New filings", "harvest_egx_beta.py", False, ["--filings", "--from", LAST_MONTH]),
    # The alarm on that harvest. It is best-effort — the exchange resets the
    # runner's IP and the step is skipped — so on a trading day, once the
    # session is an hour old, this refuses to let a day-stale archive through:
    # it stops the build here, before a single stale document is rebuilt, the
    # Commit step never runs, the last good data stays live, and the failure
    # e-mail goes out. See CRITICAL below. supports_check=False on purpose: the
    # --check validation pass runs BEFORE the harvest, when the archive is still
    # yesterday's by design, so checking it there would fail every build. It
    # runs only in the real pass, after New filings.
    # It has a --check mode; declaring otherwise made `build_all --check` skip
    # the guard entirely, so the validate pass never once checked whether the
    # archive it was validating was stale.
    ("Staleness guard", "build_staleness_guard.py", True),
    # Immediately after Market, because Market rebuilds `companies/` from
    # scratch on every run — `shutil.rmtree` then rewrite — and this is an
    # enrichment applied on top of it. It was run once by hand in August and
    # was gone by the next build: 11,336 filed net-profit figures back down to
    # 4,062, and nobody noticed because the file still looked full. Anything
    # that edits a published company document has to run here, in the list,
    # after the step that recreates it.
    ("EGX filed net profit", "merge_egx_financials.py", False),
    # The other half of that merge: the figures the template carries WITH a unit
    # word — "17,738,347 Value In Thousand" — which the step above skips on
    # purpose because reading them as whole pounds would divide a bank to a
    # thousandth of its size. A model reads each, three guards verify it, and it
    # lands through the same writer. Cached by filing code, so a warm run makes
    # a handful of reads for genuinely new filings; best-effort, because a model
    # the host cannot reach is one build stale, not a broken build.
    ("Unit-scaled net profit", "extract_unit_financials.py", False),
    # The reviewed hand-corrections for the filings neither path can scale on
    # its own — the exchange's bare, unit-word-less figures that would otherwise
    # store a bank a thousandfold small, plus the two the exchange itself misfiled
    # and are better left blank than published wrong. Deterministic: it replays a
    # committed table, re-proving each figure against the archive, and touches a
    # period only while the automatic path still produces the value it targets.
    ("Filing corrections", "apply_filing_corrections.py", True),
    # Full statement fields read from the issuer's own scanned attachment.
    # Collection is manual/local because the PDF host requires headed Chrome;
    # this deterministic replay is safe in CI and restores the committed,
    # verified fields after Market has recreated every company document.
    ("EGX PDF statements", "apply_pdf_statements.py", True),
    ("Statement basis", "apply_statement_basis.py", True),
    # After every step that writes a filed row, and after the basis is named
    # on them — not after Market, which is only where the field it adds LANDS.
    #
    # It sat straight after Market and reported "0 of 282 — no filed period
    # states a profit" on every CI run, because Market has just rewritten the
    # company documents and the five steps above are what put the financials
    # back into them. It looked right locally only because the checked-out
    # documents still held the previous run's figures.
    #
    # The basis matters as much as the profits: this refuses a twelve months
    # whose three legs are not all on one basis, and `apply_statement_basis`
    # is what names it.
    #
    # The P/E Market publishes is over the newest ANNUAL filing, which on this
    # exchange is up to twenty months old — most are struck against FY 2024.
    # This adds a second over the last twelve months a company actually filed:
    # three filed figures and a subtraction, never an estimate. It only ADDS
    # fields to a company already in the directory, so it cannot repeat
    # Market's own failure of deleting 33 of them from a short scan.
    ("Trailing P/E", "build_ttm_pe.py", True),
    # What the company is doing with its borrowings: how much, when it falls
    # due, what it costs against what the business earns, and which way it
    # moved. Arithmetic over the borrowing lines the step above just restored,
    # so it has to run after it. The sentence beside the figures is written by
    # `build_debt_reads.py` into a committed store and merged here — that step
    # calls a model, so it stays out of the build like every other read.
    ("Debt", "build_debt.py", True),
    # What is unusual about a company against its own record — streak breaks,
    # silence measured against its own filing rhythm, first-in-years filings,
    # and when results are next due. Pure arithmetic over the committed
    # harvest, so it is safe in CI, and it reads the financials the step above
    # just merged.
    ("Signals", "build_signals.py", True),
    # One request for the whole market: the dividend yield the exchange
    # publishes, and the share count that turns a decade of filed profit into
    # a decade of earnings per share. Best-effort — the app lived without
    # these and can live one more run without them.
    ("Stock info", "harvest_stock_info.py", True),
    # The review sheet, after both: it reads the merged financials, the share
    # count above, and the market scan. No network of its own.
    ("Review sheet", "build_review.py", True),
    # Immediately after it, because it reads the documents that step just
    # wrote. The review sheet's ratios — price-to-book, the two returns,
    # debt-to-equity, dividend yield, cash conversion — live one document per
    # company, which is the right shape for the company screen and the wrong
    # one for the market table: filtering 284 rows out of them means fetching
    # 259 documents to draw one screen. This copies them onto the row under a
    # `ratios` key, so the table can filter on what was already computed.
    #
    # No network, no arithmetic, and it only ever adds a key to a row that
    # already exists. It runs here rather than inside build_market_api for the
    # same reason Company facts does: that build needs the daily scan, which
    # CI does not have, so a ratio folded in there would reach the row on one
    # laptop and nowhere else.
    ("Company ratios", "apply_company_ratios.py", True),
    # The natural-language read of each company's metric pattern. Gated by a
    # budget and vetted like the briefs; a read generated today reaches the app
    # on the next build, when build_review merges the store back in.
    ("Review reads", "build_review_reads.py", False,
     ["--limit", "8", "--budget", "0.60"]),
    # The sector view, after the review sheet it reads: per-sector movement
    # counts and medians, a pure aggregation of the review docs. No network.
    ("Sectors", "build_sectors.py", True),
    # The natural-language read of each sector's movement — budgeted and vetted
    # like the review reads, and merged back by build_sectors on the next build.
    ("Sector reads", "build_sector_reads.py", False,
     ["--limit", "8", "--budget", "0.60"]),
    # News and rates run here too, so a full local build produces a complete
    # set — but their real cadence is publish-live-data.yml every 15 minutes.
    # A daily news feed is a bulletin, and an intraday metals price pinned for
    # twenty-four hours is stale data wearing today's date.
    ("Disclosures", "build_disclosures_api.py", True),
    ("News", "build_news_api.py", True),
    # Who traded, not just how much. The exchange has always published the
    # market split by nationality and by individual-versus-institution, and
    # nothing here read it — so the site could say what changed hands and
    # never who changed it. One GET against the same host the filing archive
    # uses; best-effort, because a screen losing a section beats a build
    # stopping over it.
    ("Investors", "build_investors_api.py", True),
    # Who is in EGX 30, EGX 70 and EGX 100. Membership is not derivable —
    # "the thirty biggest by market value" is a plausible rule and not the
    # exchange's — so a heat map of an index either has the exchange's own
    # list or it has no business drawing one. Best-effort and carry-forward,
    # for the same reason as Investors: an index does not lose thirty
    # companies because a host had a bad minute.
    ("Index constituents", "build_indices_api.py", True),
    ("Rates", "build_rates_api.py", True),
    # After Rates, because it checks every series it fetches against the level
    # Rates just published and refuses the ones that disagree. An instrument id
    # is not a name, and the site has already shipped a chart of the wrong
    # instrument once.
    ("Rate history", "rate_history.py", True),
    # Last, and reporting only. It reads what every step above published and
    # counts what is wrong with it — a market value that is not its own price
    # times its own shares, a directory and a document disagreeing about the
    # same period, a multiple that does not divide out. Every check is one this
    # repository has already been bitten by, so the count going up is a
    # regression and the log is where it shows.
    ("Accuracy audit", "audit_accuracy.py", True),
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
    # Sessions where a share traded far more than it usually does, and the
    # date each one happened on. Reads the committed daily bars off disk — no
    # network — and is best-effort, so a checkout without `data-source/prices/`
    # leaves the published document alone.
    ("Unusual volume", "build_volume_events.py", True),
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
    # Who each company is — industry, incorporation, owners, subsidiaries.
    # The only whole-market source of it anyone found, and the app held
    # nothing of the kind before: the exchange publishes no business
    # description on any surface, and the filings archive answers "is engaged
    # in" zero times across 191,484 rows.
    #
    # Only companies with no profile yet are asked for, so this is a no-op the
    # moment the set is full and a small catch-up whenever the exchange lists
    # something new. Six seconds apart, one at a time, against a host whose
    # robots.txt asks for five.
    ("Company profiles", "harvest_company_profiles.py", False, ["--limit", "8"]),
    # And the brief written from them, which had never run here either — the
    # 255 published ones exist because somebody ran the script by hand. A
    # company the exchange listed tomorrow would have had no brief, ever, and
    # a brief the guards refused would never have been retried.
    #
    # After the profiles it reads and after Signals, whose counts it quotes.
    # Six a run and fifty cents a run: only companies with no brief yet are
    # asked for, so it is a no-op once the set is full. With no Gemini
    # transport it prints so and leaves the published briefs alone.
    ("Company briefs", "build_company_briefs.py", False,
     ["--limit", "6", "--budget", "0.50"]),
    ("Company filings", "harvest_company_filings.py", False,
     ["--limit", "5", "--spacing", "6"]),
    ("Filed documents", "enrich_disclosures.py", False,
     ["--limit", "8", "--spacing", "6"]),
    # The manifest again, and this time it is last.
    #
    # This module's own docstring says "The manifest is built last on purpose:
    # its `data_version` is a hash of the other documents, and that hash is the
    # only thing that tells an installed app its cached copy is stale." That
    # stopped being true when the harvests were appended below it. Two of them
    # publish: `build_company_briefs.py` writes `public/data/v1/briefs/` — and
    # unlinks the briefs a later run refused — and `enrich_disclosures.py`
    # writes the disclosures window and archive. `briefs`, `disclosures/archive`
    # and `disclosures/documents` are all in `build_fixtures.UNVERSIONED`, which
    # means they have no counter of their own and are guarded by `data_version`
    # alone.
    #
    # So every brief and every newly attached document was shipping under a
    # fingerprint computed before it existed, and no phone asked for it until
    # some later run happened to move the hash for another reason. Measured: a
    # single byte changed in one brief moves `data_version`, so the gap is real
    # and not theoretical.
    #
    # It costs nothing to close. `build_fixtures.py` makes no network call and
    # is byte-stable when the content has not moved, so on a run where the
    # harvests found nothing this rewrites the identical file and the commit
    # step sees no diff. `test_build_all` now refuses to let anything be
    # appended after it.
    ("Manifest + fixtures", "build_fixtures.py", False),
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
    "Stock info",
    "Review reads",
    "Sector reads",
    "Company profiles",
    "Company briefs",
    "Company filings",
    "Filed documents",
    # The exchange's own BFF, paced and serialized. It blocked this project
    # once; a refusal here means the archive is one build older, which is the
    # cost the pacing exists to keep small.
    "New filings",
    # A model read of the unit-carrying filings. Cached, so a warm build barely
    # touches it; when the host cannot reach the model the banks are one build
    # stale, which is the same trade as the harvest above — not a failed build.
    "Unit-scaled net profit",
    "Investors",
}

# Steps whose failure should stop the build immediately rather than press on and
# publish. The staleness guard is the one: once it says the archive is a day old,
# every document after it would be rebuilt from that stale source.
CRITICAL = {
    "Staleness guard",
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    failed = []
    stopped = None
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
            if name in CRITICAL:
                # No point rebuilding thirty minutes of documents from a source
                # this step just declared unfit to publish. Stop now, and say so
                # with an exit code the workflow can tell apart from the other
                # kind of failure.
                print("   critical — stopping before anything is rebuilt")
                stopped = name
                break

    print()
    # TWO KINDS OF FAILURE, AND THEY DESERVE DIFFERENT ANSWERS.
    #
    # 2 — a critical step said the inputs are unfit. Whatever ran before it
    #     was built from those inputs, so none of it should be published.
    #
    # 1 — a source would not answer. That step left its previously published
    #     document exactly where it was, and every other step in this run
    #     produced correct output from sources that did answer. Discarding all
    #     of it is the expensive mistake: on 3 Sep 2026 a truncated read from
    #     investing.com threw away 107 minutes of finished work, because the
    #     only signal this function had was "non-zero", and the workflow reads
    #     non-zero as "publish nothing".
    #
    #     The comment beside News in BEST_EFFORT records the same accident from
    #     the other direction — one slow outlet, twice, and the filed
    #     financials did not publish. That was fixed by naming News as
    #     best-effort. This is the same bug arriving through a step nobody had
    #     named yet, and it will keep arriving that way, because the list is a
    #     list of sources that have already failed once.
    #
    #     So the workflow publishes what succeeded and still ends red. Loud and
    #     lossless, rather than the choice between them.
    if stopped:
        print(f"build_all: stopped at a critical step: {stopped}")
        return 2
    if failed:
        print(f"build_all: {len(failed)} step(s) did not refresh: {', '.join(failed)}")
        print("build_all: every other step's output is fit to publish")
        return 1
    print("build_all: all steps succeeded")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
