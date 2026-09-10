#!/usr/bin/env python3
"""The build's own wiring: a step list that describes the scripts it names."""

from __future__ import annotations

import pathlib
import re
import subprocess
import sys
import unittest
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_all

HERE = pathlib.Path(__file__).resolve().parent


class Steps(unittest.TestCase):
    def test_every_step_names_a_script_that_exists(self):
        for step in build_all.STEPS:
            self.assertTrue((HERE / step[1]).exists(), step[1])

    def test_a_step_that_claims_check_accepts_check(self):
        """`build_all --check` is a whole CI job, and one step can fail it.

        The accuracy audit was registered as taking `--check` and did not take
        it, so "Validate before writing anything" died on `unrecognized
        arguments: --check` on every run — a red build with nothing wrong in
        the data it was validating.
        """
        wrong = []
        for name, script, supports_check, *_ in build_all.STEPS:
            if not supports_check:
                continue
            source = (HERE / script).read_text(encoding="utf-8")
            if not re.search(r'add_argument\(\s*["\']--check["\']', source):
                wrong.append(f"{name} ({script})")
        self.assertEqual(wrong, [], "these are listed as taking --check and do not")

    def test_a_step_that_does_not_claim_check_is_not_asked_for_it(self):
        """The other direction is a silent one: the flag is simply not passed."""
        for name, script, supports_check, *_ in build_all.STEPS:
            if supports_check:
                continue
            source = (HERE / script).read_text(encoding="utf-8")
            if re.search(r'add_argument\(\s*["\']--check["\']', source):
                self.fail(f"{name} ({script}) supports --check and is not "
                          f"declared as doing so, so the validate pass runs it "
                          f"for real or skips it")


class ExitCodes(unittest.TestCase):
    """What the run tells CI, and why the two failures are not the same.

    On 3 Sep 2026 a truncated read from investing.com inside "Index levels +
    breadth" made this return 1 after every other step had already produced
    correct output. The workflow reads non-zero as "publish nothing", so 107
    minutes of finished work was discarded to carry forward one stale series.

    A source that will not answer leaves its own document alone and says so.
    That is not the same event as a critical step declaring the inputs unfit,
    and collapsing both into 1 is what made the expensive answer the only one.
    """

    def _run(self, failing):
        """build_all.main() with `failing` the set of step names that exit 1."""
        def fake(cmd, cwd=None):
            script = pathlib.Path(cmd[1]).name
            names = [n for n, s, *_ in build_all.STEPS if s == script]
            bad = any(n in failing for n in names)
            return subprocess.CompletedProcess(cmd, 1 if bad else 0)

        with mock.patch.object(build_all.subprocess, "run", side_effect=fake), \
             mock.patch.object(build_all.sys, "argv", ["build_all.py"]):
            return build_all.main()

    def test_a_clean_build_is_zero(self):
        self.assertEqual(self._run(set()), 0)

    def test_a_source_that_would_not_answer_is_one(self):
        """1 means: publish what succeeded, then mark the run failed."""
        fatal = [n for n, *_ in build_all.STEPS
                 if n not in build_all.BEST_EFFORT and n not in build_all.CRITICAL
                 and n not in build_all.NO_PUBLISH]
        self.assertTrue(fatal, "no non-critical fatal step to test with")
        self.assertEqual(self._run({fatal[0]}), 1)

    def test_a_critical_step_is_two(self):
        """2 means: publish nothing — what ran before it came from bad inputs."""
        for name in build_all.CRITICAL:
            self.assertEqual(self._run({name}), 2, name)

    def test_a_best_effort_step_does_not_fail_the_run_at_all(self):
        for name in list(build_all.BEST_EFFORT)[:3]:
            self.assertEqual(self._run({name}), 0, name)

    def test_our_documents_contradicting_each_other_never_publishes(self):
        """2, not 1.

        Exit 1 tells the workflow "a source would not answer; every other step
        produced correct output", and it commits and deploys on that. The
        accuracy audit failing means something else entirely: the pipeline's own
        documents disagree about a real, named company. Publishing that and
        colouring the run red afterwards is the wrong way round.
        """
        # Named explicitly, not just iterated: `for name in NO_PUBLISH` passes
        # vacuously when the set is emptied, which is the one edit this test
        # exists to catch.
        self.assertIn("Accuracy audit", build_all.NO_PUBLISH)
        for name in build_all.NO_PUBLISH:
            self.assertEqual(self._run({name}), 2, name)

    def test_a_contradiction_still_lets_the_build_finish(self):
        """NO_PUBLISH is deliberately not CRITICAL.

        CRITICAL stops the build where it stands. Seventeen steps run after the
        accuracy audit and several rewrite the documents it just checked, so
        stopping there would both judge a half-built tree and throw away the
        rest of the run. The refusal belongs at the end, not in the middle.
        """
        self.assertTrue(build_all.NO_PUBLISH, "NO_PUBLISH must not be empty")
        self.assertFalse(build_all.NO_PUBLISH & build_all.CRITICAL)
        after = [n for n, *_ in build_all.STEPS]
        for name in build_all.NO_PUBLISH:
            self.assertIn(name, after)
            self.assertTrue(after.index(name) < len(after) - 1,
                            f"{name} is last; the distinction would be moot")

    def test_a_best_effort_skip_is_announced_not_whispered(self):
        """17 of 44 steps are best-effort.

        A bare print is a grey line in a forty-minute log, so a permanently
        refused source looked exactly like one that blipped — which is how the
        disclosures feed sat eight days stale behind four green runs a day.
        """
        source = (HERE / "build_all.py").read_text(encoding="utf-8")
        self.assertIn("::warning title=Best-effort step skipped::", source)

    def test_critical_outranks_a_plain_failure(self):
        """Both kinds at once is still 2: the unfit inputs are what matter."""
        fatal = [n for n, *_ in build_all.STEPS
                 if n not in build_all.BEST_EFFORT and n not in build_all.CRITICAL]
        critical = sorted(build_all.CRITICAL)[0]
        self.assertEqual(self._run({fatal[0], critical}), 2)


class TheManifestIsLast(unittest.TestCase):
    """`data_version` must be a hash of everything that ships with it.

    The module docstring has always said the manifest is built last "on
    purpose", because that hash is the only thing telling an installed app its
    cache is stale. It was not last. Five best-effort harvests were appended
    below it, and two of them publish: `build_company_briefs` writes (and
    unlinks from) `public/data/v1/briefs/`, and `enrich_disclosures` writes the
    disclosures window and archive. All three of those folders sit in
    `build_fixtures.UNVERSIONED` — no counter of their own, guarded by
    `data_version` alone — so every brief shipped under a fingerprint computed
    before it existed and no device ever asked for it.

    This is the guard, not the comment: anything appended after the manifest
    fails here.
    """

    def test_the_last_step_builds_the_manifest(self):
        name, script = build_all.STEPS[-1][0], build_all.STEPS[-1][1]
        self.assertEqual(
            script, "build_fixtures.py",
            f"the last step is {name} ({script}); anything that writes into "
            "public/data/v1 after the manifest ships unfingerprinted",
        )

    def test_the_unversioned_folders_are_still_the_reason(self):
        """If these ever gain counters of their own the rule can relax — until
        then they are guarded by `data_version` and nothing else."""
        import build_fixtures

        guarded = set(build_fixtures.UNVERSIONED)
        for folder in ("briefs", "disclosures/archive", "disclosures/documents"):
            self.assertIn(folder, guarded, folder)

    def test_nothing_publishes_after_it(self):
        """The two tail harvests that write into the published tree must sit
        above the final manifest, not below it."""
        scripts = [s[1] for s in build_all.STEPS]
        last = len(scripts) - 1 - scripts[::-1].index("build_fixtures.py")
        for publisher in ("build_company_briefs.py", "enrich_disclosures.py"):
            if publisher not in scripts:
                continue
            # The LAST time it runs, not the first. A step listed twice — once
            # correctly above the manifest and once appended below it — would
            # slip past a check that only looked at the first occurrence, which
            # is exactly the shape of the bug this class exists to catch.
            latest = len(scripts) - 1 - scripts[::-1].index(publisher)
            self.assertLess(
                latest, last,
                f"{publisher} writes published data after the final manifest",
            )


if __name__ == "__main__":
    unittest.main()


class LiveDataGate(unittest.TestCase):
    """The 15-minute publish must prove what it is about to commit.

    This job publishes up to 126 times a day and ran no tests at all, while the
    daily build — six to thirteen publishes — ran all of them. The sharpest
    edge of that inversion:
    `test_news_insights.PublishedInsightsTest.test_no_cached_insight_makes_a_forecast`
    audits the published `scripts/news_insights.json` cache and never ran in the
    one job that writes and commits it.
    """

    WORKFLOW = HERE.parent / ".github" / "workflows" / "publish-live-data.yml"

    def setUp(self):
        self.assertTrue(self.WORKFLOW.exists(), "publish-live-data.yml is missing")
        self.text = self.WORKFLOW.read_text(encoding="utf-8")

    def test_it_runs_the_tests_at_all(self):
        self.assertIn("python3 -m unittest", self.text)

    def test_the_tests_run_before_the_commit(self):
        """Order is the point.

        Before the fetch, the same suite would audit the PREVIOUS file and pass
        while the new one is broken.
        """
        gate = self.text.index("python3 -m unittest")
        commit = self.text.index("Commit if anything moved")
        self.assertLess(gate, commit,
                        "the gate must run before the commit, not after it")

    def test_it_covers_the_documents_this_job_writes(self):
        for module in ("test_news_insights", "test_connections",
                       "test_rates_dates", "test_flow_trackers", "test_macro"):
            self.assertIn(module, self.text, f"{module} is not in the gate")

    def test_every_named_module_exists(self):
        import re
        block = self.text[self.text.index("python3 -m unittest"):]
        block = block[:block.index("working-directory")]
        for name in re.findall(r"\btest_[a-z_]+\b", block):
            self.assertTrue((HERE / f"{name}.py").exists(),
                            f"the gate names {name}, which is not a test module")
