#!/usr/bin/env python3
"""The price workflow, checked against the scripts and the promises it makes.

`test_official_sources_workflow` does this for the collectors and found two real
bugs the day it existed. The same drift is available here and the stakes are
higher: this job runs six times a trading session and writes the one document
every price on every screen comes out of.

Parsed with a regex rather than a YAML library on purpose — the runner's Python
has no PyYAML, and a test that skips on the machine it is meant to protect is
not a test.
"""

from __future__ import annotations

import pathlib
import re
import subprocess
import sys
import unittest

HERE = pathlib.Path(__file__).resolve().parent
WORKFLOWS = HERE.parent / ".github" / "workflows"
PRICES = WORKFLOWS / "publish-prices.yml"
DAILY = WORKFLOWS / "publish-app-data.yml"

INVOCATION = re.compile(
    r"^\s*python3\s+(scripts/[a-z0-9_]+\.py)((?:\s+--?[a-z0-9-]+)*)", re.M)

# The four files this job owns. Anything else it staged would be another
# workflow's half-finished work.
OWNED = {
    "public/data/v1/market.json",
    "public/data/v1/manifest.json",
    "app/assets/fixtures/market.json",
    "app/assets/fixtures/manifest.json",
}


def invocations(path):
    body = path.read_text(encoding="utf-8")
    return [(s, re.findall(r"--?[a-z0-9-]+", f))
            for s, f in INVOCATION.findall(body)]


def commands(body: str) -> str:
    """The workflow with its prose removed.

    These files explain themselves at length, and the first version of this
    test searched the comments: it read "no `git add -A`" as an occurrence of
    `git add -A`, and captured that sentence instead of the real command.
    A comment saying a thing is not the workflow doing it.
    """
    return "\n".join(
        line for line in body.splitlines() if not line.lstrip().startswith("#")
    )


class Base(unittest.TestCase):
    def setUp(self):
        if not PRICES.exists():
            self.skipTest("the workflow is not in this tree")
        self.body = PRICES.read_text(encoding="utf-8")
        self.commands = commands(self.body)


class ItNamesRealThings(Base):
    def test_every_script_it_runs_exists(self):
        found = invocations(PRICES)
        self.assertGreaterEqual(len(found), 3, "the parser found almost nothing")
        for script, _ in found:
            self.assertTrue((HERE.parent / script).exists(), script)

    def test_every_flag_it_passes_is_a_flag_that_script_accepts(self):
        """A workflow is the one caller nobody runs by hand before shipping."""
        wrong = []
        for script, flags in invocations(PRICES):
            source = (HERE.parent / script).read_text(encoding="utf-8")
            for flag in flags:
                if not re.search(rf'add_argument\(\s*["\']{re.escape(flag)}["\']',
                                 source):
                    wrong.append(f"{script} is passed {flag} and does not take it")
        self.assertEqual(wrong, [])

    def test_it_builds_the_quotes_and_then_the_manifest(self):
        """A manifest written before the prices describes the previous ones."""
        order = [s for s, _ in invocations(PRICES)]
        self.assertIn("scripts/build_market_api.py", order)
        self.assertIn("scripts/build_fixtures.py", order)
        self.assertLess(order.index("scripts/build_market_api.py"),
                        order.index("scripts/build_fixtures.py"))

    def test_it_runs_the_market_build_in_quotes_only_mode(self):
        """Without the flag this rewrites `companies/` from scratch six times a
        session, stripping the financials fourteen later steps put there."""
        flags = dict(invocations(PRICES))["scripts/build_market_api.py"]
        self.assertIn("--quotes-only", flags)


class ItStaysOutOfTheOtherJobsWay(Base):
    def test_it_has_its_own_concurrency_group(self):
        """The whole point of the split. Sharing the daily group would put a
        three-minute job behind a forty-minute one and make every price tick
        cancel whatever was pending there."""
        group = re.search(r"^concurrency:\s*\n\s*group:\s*(\S+)", self.commands, re.M)
        self.assertIsNotNone(group, "no concurrency group declared")
        self.assertEqual(group.group(1), "publish-prices")

    def test_it_stages_only_the_four_files_it_owns(self):
        staged = set(re.findall(r"(?:public/data/v1|app/assets/fixtures)/[\w./-]+",
                                self._git_add_block()))
        self.assertEqual(staged, OWNED)

    def test_it_never_stages_the_whole_tree(self):
        self.assertNotIn("git add -A", self.commands)

    def test_its_conflict_resolver_refuses_anything_outside_those_four(self):
        """`resolve_ours` with a wide allowlist is how one job silently
        publishes another's work."""
        allow = re.findall(r"-e '\^([\w./\\]+)\$'", self.commands)
        self.assertEqual({a.replace("\\", "") for a in allow}, OWNED)

    def _git_add_block(self):
        m = re.search(r"git add ((?:[^\n]*\\\n)*[^\n]*)", self.commands)
        self.assertIsNotNone(m, "no git add found")
        return m.group(1)


class ItDoesNotRepeatWhatWasLearned(Base):
    def test_it_declares_one_cron_expression_per_tick(self):
        """A range like `0 7-12 * * 0-4` is one expression. Under the delivery
        drift this repository is living with, a workflow gets roughly one run
        per EXPRESSION per day — `publish-live-data` asks for 96 ticks through
        a single `*/15` line and receives about seven."""
        crons = re.findall(r"- cron: '([^']+)'", self.commands)
        self.assertGreaterEqual(len(crons), 4)
        for c in crons:
            hour = c.split()[1]
            self.assertNotIn("-", hour, f"{c} is a range, so it is one expression")
            self.assertNotIn("/", hour, f"{c} is a step, so it is one expression")

    def test_its_ticks_cover_the_cairo_session_in_both_dst_offsets(self):
        """10:00-14:30 Cairo is 07:00-11:30 UTC in summer and 08:00-12:30 in
        winter. A tick set that only covers one of them goes dark for half the
        year."""
        hours = {int(c.split()[1]) for c in re.findall(r"- cron: '([^']+)'", self.commands)}
        for offset, label in ((3, "summer"), (2, "winter")):
            in_session = {h for h in hours if 10 <= h + offset <= 14}
            self.assertGreaterEqual(len(in_session), 3,
                                    f"only {len(in_session)} ticks inside the {label} session")

    def test_it_does_not_carry_the_dead_deploy_step(self):
        """There is no CLOUDFLARE_API_TOKEN secret, so the step the other two
        workflows carry exits 0 in zero seconds and has never run. Cloudflare
        deploys this repository from its own Git integration."""
        self.assertNotIn("wrangler", self.commands)

    def test_the_quotes_build_is_not_allowed_to_fail_quietly(self):
        """Every refusal in `--quotes-only` happens before it writes, so a
        non-zero exit means nothing was published and the run should go red."""
        line = re.search(r"^\s*python3 scripts/build_market_api\.py[^\n]*$",
                         self.commands, re.M)
        self.assertIsNotNone(line)
        self.assertNotIn("|| true", line.group(0))


class TheDailyBuildGaveUpTheSession(unittest.TestCase):
    def setUp(self):
        if not DAILY.exists():
            self.skipTest("the workflow is not in this tree")
        self.body = DAILY.read_text(encoding="utf-8")
        self.commands = commands(self.body)

    def test_it_asks_for_four_ticks_not_seven(self):
        """Seven runs at a 41-minute median needed 100.4% of the cron window."""
        crons = re.findall(r"- cron: '([^']+)'", self.commands)
        self.assertEqual(len(crons), 4, crons)

    def test_it_keeps_both_dst_legs_of_both_times(self):
        """Each Cairo time is scheduled twice because GitHub cron is UTC and
        Egypt moves. Dropping a leg loses that time for half the year."""
        crons = sorted(re.findall(r"- cron: '([^']+)'", self.commands))
        hours = [int(c.split()[1]) for c in crons]
        minutes = {c.split()[0] for c in crons}
        # Two pairs, each an hour apart, sharing a minute.
        self.assertEqual(len(minutes), 2, crons)
        for m in minutes:
            legs = sorted(int(c.split()[1]) for c in crons if c.split()[0] == m)
            self.assertEqual(len(legs), 2, f"minute {m} has {len(legs)} leg(s)")
            self.assertEqual(legs[1] - legs[0], 1, f"minute {m} legs are not an hour apart")
        self.assertEqual(len(hours), 4)

    def test_its_comments_no_longer_claim_six_runs_a_day(self):
        self.assertNotIn("six times a trading day", self.body)


class TheStepsCommentMatches(unittest.TestCase):
    def test_build_all_says_four_runs_a_day(self):
        source = (HERE / "build_all.py").read_text(encoding="utf-8")
        self.assertNotIn("six times a trading day", source)
        self.assertIn("four times a trading day", source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
