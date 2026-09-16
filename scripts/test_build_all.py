#!/usr/bin/env python3
"""The build's own wiring: a step list that describes the scripts it names."""

from __future__ import annotations

import ast
import io
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_all
from step_outcome import NO_PROGRESS

HERE = pathlib.Path(__file__).resolve().parent


def build(codes: dict[str, int], *argv: str) -> tuple[int, str]:
    """build_all.main() with each named step exiting its code and the rest 0.

    Quietly, and away from the job summary and the run id, for the reason
    `ExitCodes._run` gives: under CI the workflow commands printed here would
    become real annotations on a green run.
    """
    def fake(cmd, cwd=None):
        script = pathlib.Path(cmd[1]).name
        names = [n for n, s, *_ in build_all.STEPS if s == script]
        return subprocess.CompletedProcess(
            cmd, next((codes[n] for n in names if n in codes), 0))

    out = io.StringIO()
    with mock.patch.object(build_all.subprocess, "run", side_effect=fake), \
         mock.patch.object(build_all.sys, "argv", ["build_all.py", *argv]), \
         mock.patch.dict(build_all.os.environ) as env, \
         redirect_stdout(out), redirect_stderr(io.StringIO()):
        env.pop("GITHUB_STEP_SUMMARY", None)
        env.pop("GITHUB_RUN_ID", None)
        code = build_all.main()
    return code, out.getvalue()


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

        # Quietly, and away from the job summary. main() prints `::error` and
        # `::warning` workflow commands and appends to GITHUB_STEP_SUMMARY, and
        # run under CI those became real annotations: a "Documents contradict
        # each other ... Refusing to publish" error on every green run of the
        # app-data and price jobs, and about 150 fake "the host would not
        # answer" warnings, all from these simulated failures.
        with mock.patch.object(build_all.subprocess, "run", side_effect=fake), \
             mock.patch.object(build_all.sys, "argv", ["build_all.py"]), \
             mock.patch.dict(build_all.os.environ) as env, \
             redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            env.pop("GITHUB_STEP_SUMMARY", None)
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


class StoresSurviveTheRunner(unittest.TestCase):
    """A store the daily build writes and does not commit is work thrown away.

    `publish-app-data` stages named paths, not `git add -A` over the tree, so a
    tracked file a step rewrites and the list does not name is left in the
    runner and discarded. Two were: `sector_reads.json`, which is a model's
    paragraph about each sector, and `extract_unit_cache.json`, which is the
    model's reading of the filings whose figures are stated in thousands. Both
    were rebuilt on every run and thrown away every run, so CI bought the same
    readings again the next time — their git history has only local commits,
    never github-actions[bot].

    The rule is mechanical, so it is checked mechanically rather than by
    keeping a list in somebody's head: find what each step writes, and require
    that anything git tracks is named. Anything untracked is derived on every
    run and is right to leave out.
    """

    REPO = pathlib.Path(__file__).resolve().parent.parent
    WORKFLOW = REPO / ".github" / "workflows" / "publish-app-data.yml"
    # `.write_text(`, `.open("w"`, or a bare `open(` on the same line as the path.
    WRITE = r'(\.write_text\s*\(|\.open\s*\(\s*["\']w|open\s*\()'
    # Staged by the workflow's own `git add -A public/data app/assets/fixtures`.
    PUBLISHED = ("public/data/", "app/assets/fixtures/")
    # Written only when the file is missing or on --refresh-tags, so a runner,
    # which checks the committed one out, never rewrites it.
    WRITTEN_ONLY_WHEN_ABSENT = {"scripts/news_tag_map.json"}

    def stores(self) -> set[str]:
        block = re.search(r"STORES: >-\n((?:\s{4}\S+\n)+)",
                          self.WORKFLOW.read_text(encoding="utf-8"))
        self.assertIsNotNone(block, "the workflow no longer lists its stores")
        return set(block.group(1).split())

    def written_by_a_step(self) -> dict[str, set[str]]:
        here = self.REPO / "scripts"
        source = (here / "build_all.py").read_text(encoding="utf-8")
        steps = {script for _, script in
                 re.findall(r'\("([^"]+)",\s*"([a-z_0-9]+\.py)"', source)}
        found: dict[str, set[str]] = {}
        for script in sorted(steps):
            path = here / script
            if not path.exists():
                continue
            text = path.read_text(encoding="utf-8")
            for node in ast.walk(ast.parse(text)):
                if not (isinstance(node, ast.Assign)
                        and isinstance(node.targets[0], ast.Name)):
                    continue
                expr = ast.unparse(node.value)
                # `REPO / "data-source" / ... / "x.json"`. The ownership stores
                # are spelled this way, and this test only knew the
                # `Path(__file__).parent / "x.json"` spelling, so it never saw
                # that the workflow did not commit either of them.
                rooted = re.fullmatch(r"REPO((?:\s*/\s*'[^']+')+)", expr)
                if rooted and expr.endswith(".json'"):
                    path = "/".join(re.findall(r"'([^']+)'", rooted.group(1)))
                else:
                    named = re.search(r"""['"]([a-z_0-9]+\.json)['"]""", expr)
                    if not named or "parent" not in expr:
                        continue
                    path = f"scripts/{named.group(1)}"
                var = node.targets[0].id
                if re.search(rf"\b{var}\b[^\n]*{self.WRITE}", text):
                    found.setdefault(path, set()).add(script)
        return found

    def test_the_detector_finds_the_stores_that_are_already_named(self):
        # Guards the test itself: a detector that finds nothing would pass the
        # one below no matter what the workflow dropped.
        written = self.written_by_a_step()
        self.assertGreaterEqual(len(written), 10, written)
        self.assertIn("scripts/sector_reads.json", written)
        self.assertIn("data-source/official/ownership/named-insiders.json", written)
        self.assertIn("data-source/official/ownership/shareholder-structure.json", written)

    def covered(self, path: str, stores: set[str]) -> bool:
        if path.startswith(self.PUBLISHED) or path in self.WRITTEN_ONLY_WHEN_ABSENT:
            return True
        return any(path == store or path.startswith(store.rstrip("/") + "/")
                   for store in stores)

    def test_every_store_a_step_writes_and_git_tracks_is_committed(self):
        stores = self.stores()
        missing = []
        for store, writers in sorted(self.written_by_a_step().items()):
            tracked = subprocess.run(
                ["git", "ls-files", "--error-unmatch", store],
                capture_output=True, cwd=self.REPO).returncode == 0
            if tracked and not self.covered(store, stores):
                missing.append(f"{store} (written by {', '.join(sorted(writers))})")
        self.assertEqual(missing, [], "the daily build rewrites these and the "
                         "job never commits them, so every run redoes the work")

    def test_every_store_exists_so_the_add_stages_anything(self):
        """`git add` refuses the whole pathspec list over one missing path.

        The workflow stages `public/data app/assets/fixtures ${STORES}` in one
        command, so a store listed before any step has written it would stage
        nothing at all, published documents included.
        """
        missing = [store for store in sorted(self.stores())
                   if subprocess.run(["git", "ls-files", "--error-unmatch", store],
                                     capture_output=True, cwd=self.REPO).returncode]
        self.assertEqual(missing, [], "listed in STORES and not in git")


class SkipStreaks(unittest.TestCase):
    """A best-effort skip is a shrug; the same shrug STUCK_AFTER runs running is red.

    Named insiders printed "0 read, 6 unreachable" and exited 0 in every build
    from 10 to 16 Sep 2026, and the Arabic names asked twelve dead tickers in
    115 of 116, so every one of those runs was green.
    """

    STEP = "Named insiders"

    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.path = pathlib.Path(tmp.name) / "best_effort_skips.json"

    def run_build(self, codes):
        return build(codes, "--skip-counter", str(self.path))

    def streak(self, name=STEP):
        doc = json.loads(self.path.read_text(encoding="utf-8"))
        return (doc["steps"].get(name) or {}).get("runs", 0)

    def test_the_steps_used_here_are_best_effort(self):
        for name in (self.STEP, "Filed documents", "Arabic names"):
            self.assertIn(name, build_all.BEST_EFFORT)

    def test_no_progress_is_a_skip_not_a_failure(self):
        code, out = self.run_build({self.STEP: NO_PROGRESS})
        self.assertEqual(code, 0)
        self.assertIn(f"::warning title=Best-effort step made no progress::{self.STEP}", out)
        self.assertEqual(self.streak(), 1)

    def test_a_skip_is_not_reported_as_every_step_succeeding(self):
        _, out = self.run_build({self.STEP: NO_PROGRESS})
        self.assertNotIn("all steps succeeded", out)
        _, out = self.run_build({})
        self.assertIn("all steps succeeded", out)

    def test_six_in_a_row_turn_the_run_red(self):
        for run in range(1, build_all.STUCK_AFTER):
            code, out = self.run_build({self.STEP: NO_PROGRESS})
            self.assertEqual(code, 0, f"red after {run} skip(s)")
            self.assertNotIn("::error", out)
        code, out = self.run_build({self.STEP: NO_PROGRESS})
        # 1, not 2: what the other steps built is still committed, and the run
        # still ends red.
        self.assertEqual(code, 1)
        self.assertIn(f"::error title=Best-effort step stuck::{self.STEP} has been "
                      f"skipped {build_all.STUCK_AFTER} runs in a row", out)

    def test_it_stays_red_until_the_step_does_something(self):
        for _ in range(build_all.STUCK_AFTER + 2):
            code, _ = self.run_build({self.STEP: NO_PROGRESS})
        self.assertEqual(code, 1)
        self.assertEqual(self.streak(), build_all.STUCK_AFTER + 2)
        code, out = self.run_build({})
        self.assertEqual(code, 0, out)
        self.assertEqual(self.streak(), 0)

    def test_one_run_that_refreshes_starts_the_count_again(self):
        for _ in range(build_all.STUCK_AFTER - 1):
            self.run_build({self.STEP: NO_PROGRESS})
        self.run_build({})
        for _ in range(build_all.STUCK_AFTER - 1):
            code, _ = self.run_build({self.STEP: NO_PROGRESS})
        self.assertEqual(code, 0)
        self.assertEqual(self.streak(), build_all.STUCK_AFTER - 1)

    def test_a_host_that_refused_counts_like_no_progress(self):
        for _ in range(build_all.STUCK_AFTER):
            code, _ = self.run_build({"Filed documents": 1})
        self.assertEqual(code, 1)
        self.assertEqual(self.streak("Filed documents"), build_all.STUCK_AFTER)

    def test_each_step_keeps_its_own_count(self):
        # Two flaky steps taking turns each refresh every other run, and
        # neither has been stuck at any point.
        for run in range(build_all.STUCK_AFTER * 2):
            skipping = self.STEP if run % 2 else "Arabic names"
            code, _ = self.run_build({skipping: NO_PROGRESS})
            self.assertEqual(code, 0, f"run {run}")
        self.assertEqual(self.streak(), 1)

    def test_a_step_the_build_never_reached_keeps_its_count(self):
        # A critical stop ends the build long before the ownership readers, and
        # not running is not the same as refreshing.
        for _ in range(3):
            self.run_build({self.STEP: NO_PROGRESS})
        code, _ = self.run_build({"Staleness guard": 1})
        self.assertEqual(code, 2)
        self.assertEqual(self.streak(), 3)

    def test_the_check_pass_counts_nothing(self):
        code, _ = build({"Shareholder structure": NO_PROGRESS},
                        "--check", "--skip-counter", str(self.path))
        self.assertEqual(code, 0)
        self.assertFalse(self.path.exists(), "the --check pass wrote the counter")

    def test_without_a_counter_nothing_is_counted(self):
        code, _ = build({self.STEP: NO_PROGRESS})
        self.assertEqual(code, 0)
        self.assertFalse(self.path.exists())

    def test_no_progress_from_a_step_that_must_succeed_is_a_failure(self):
        fatal = [n for n, *_ in build_all.STEPS if n not in
                 build_all.BEST_EFFORT | build_all.CRITICAL | build_all.NO_PUBLISH]
        code, _ = self.run_build({fatal[0]: NO_PROGRESS})
        self.assertEqual(code, 1)

    def test_a_name_no_longer_in_the_build_cannot_hold_it_red(self):
        self.path.write_text(json.dumps({"steps": {
            "A step since removed": {"runs": 40, "since": "2026-09-01T00:00:00+00:00"}}}),
            encoding="utf-8")
        code, _ = self.run_build({})
        self.assertEqual(code, 0)
        self.assertNotIn("A step since removed", self.path.read_text(encoding="utf-8"))

    def test_an_unreadable_counter_starts_again(self):
        self.path.write_text("{ not json", encoding="utf-8")
        code, _ = self.run_build({self.STEP: NO_PROGRESS})
        self.assertEqual(code, 0)
        self.assertEqual(self.streak(), 1)

    def test_a_clean_run_rewrites_the_same_bytes(self):
        """No streak, no diff: a quiet run leaves nothing of its own to commit."""
        self.run_build({})
        first = self.path.read_bytes()
        self.run_build({})
        self.assertEqual(self.path.read_bytes(), first)


class EveryStepRunsOnARunner(unittest.TestCase):
    """What the build names has to exist on the machine that runs it."""

    def test_no_step_is_handed_a_program_from_one_laptop(self):
        # `agy` is a local agent in ~/.local/bin. Named insiders and Shareholder
        # structure were given `--engine agy` in CI, which has no such thing.
        for name, script, _, *extra in build_all.STEPS:
            self.assertNotIn("agy", extra[0] if extra else [], f"{name} ({script})")

    def test_no_step_script_hardcodes_a_path_in_a_home_directory(self):
        for script in sorted({s for _, s, *_ in build_all.STEPS}):
            source = (HERE / script).read_text(encoding="utf-8")
            self.assertIsNone(re.search(r"""['"]/Users/""", source),
                              f"{script} names a path in one person's home directory")

    def test_every_best_effort_step_has_a_name_of_its_own(self):
        names = [n for n, *_ in build_all.STEPS if n in build_all.BEST_EFFORT]
        self.assertEqual(sorted({n for n in names if names.count(n) > 1}), [],
                         "the skip counter keys on the name, so these share one streak")

    def test_every_best_effort_name_is_a_step(self):
        self.assertEqual(sorted(build_all.BEST_EFFORT - {n for n, *_ in build_all.STEPS}), [],
                         "renamed out from under BEST_EFFORT, so a skip there fails the build")

    def test_a_step_that_can_report_no_progress_is_best_effort(self):
        """NO_PROGRESS from a step that must succeed fails the whole build."""
        reporting = []
        for name, script, *_ in build_all.STEPS:
            if "NO_PROGRESS" in (HERE / script).read_text(encoding="utf-8"):
                reporting.append(name)
                self.assertIn(name, build_all.BEST_EFFORT, f"{name} ({script})")
        # Guards the loop: these are the steps this exit code was made for.
        for name in ("Named insiders", "Shareholder structure", "Arabic names",
                     "Company filings harvest", "Filed documents"):
            self.assertIn(name, reporting)


def workflow_step(name: str) -> str:
    """The `run: |` block of the publish-app-data step called `name`, dedented."""
    lines = (HERE.parent / ".github" / "workflows" / "publish-app-data.yml") \
        .read_text(encoding="utf-8").splitlines()
    start = lines.index(f"      - name: {name}")
    run = next(i for i in range(start, len(lines)) if lines[i].strip() == "run: |")
    body = []
    for line in lines[run + 1:]:
        if line.strip() and not line.startswith(" " * 10):
            break
        body.append(line[10:])
    return "\n".join(body)


class TheCountSurvivesTheRunner(unittest.TestCase):
    """The counter, through the workflow's own staging, in a real repository.

    Each run is a fresh clone, the way a runner checks main out, so a count
    moves only if the workflow stages and commits it: the file has to be in
    STORES, and it has to get past "Confirm the manifest fingerprint moved",
    which failed any run whose only change was a side-store.
    """

    WORKFLOW = HERE.parent / ".github" / "workflows" / "publish-app-data.yml"
    COUNTER = "scripts/best_effort_skips.json"
    STEP = "Named insiders"

    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = pathlib.Path(tmp.name)
        text = self.WORKFLOW.read_text(encoding="utf-8")
        self.stores = re.search(r"STORES: >-\n((?:\s{4}\S+\n)+)", text).group(1).split()
        quiet = self.root / "gitconfig"
        quiet.write_text("", encoding="utf-8")
        self.env = {**os.environ, "GIT_CONFIG_GLOBAL": str(quiet), "GIT_CONFIG_NOSYSTEM": "1",
                    "GIT_AUTHOR_NAME": "barbarian-bot", "GIT_AUTHOR_EMAIL": "bot@example.com",
                    "GIT_COMMITTER_NAME": "barbarian-bot", "GIT_COMMITTER_EMAIL": "bot@example.com",
                    "STORES": " ".join(self.stores)}
        self.origin = self.root / "origin.git"
        self.git("init", "-q", "--bare", "-b", "main", str(self.origin))
        seed = self.root / "seed"
        self.git("clone", "-q", str(self.origin), str(seed))
        # Every store exists, as it does on main, or the add stages nothing.
        for store in self.stores:
            path = seed / store
            if path.suffix == ".json":
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("{}\n", encoding="utf-8")
            else:
                path.mkdir(parents=True, exist_ok=True)
                (path / "held.json").write_text("{}\n", encoding="utf-8")
        for doc in ("public/data/v1/manifest.json", "app/assets/fixtures/manifest.json"):
            (seed / doc).parent.mkdir(parents=True, exist_ok=True)
            (seed / doc).write_text('{"data_version": "a"}\n', encoding="utf-8")
        (seed / "public/data/v1/news.json").write_text('{"items": []}\n', encoding="utf-8")
        self.git("add", "-A", cwd=seed)
        self.git("commit", "-q", "-m", "seed", cwd=seed)
        self.git("push", "-q", "origin", "HEAD:main", cwd=seed)
        self.runs = 0

    def git(self, *args, cwd=None):
        return subprocess.run(("git", *args), cwd=cwd or self.root, env=self.env,
                              check=True, capture_output=True, text=True)

    def stage_and_confirm(self, runner):
        outputs = runner.parent / f"{runner.name}.outputs"
        outputs.write_text("", encoding="utf-8")
        env = {**self.env, "GITHUB_OUTPUT": str(outputs)}
        subprocess.run(["bash", "-c", workflow_step("Show what changed")],
                       cwd=runner, env=env, check=True, capture_output=True, text=True)
        if "changed=true" not in outputs.read_text(encoding="utf-8"):
            return None
        return subprocess.run(["bash", "-c", workflow_step("Confirm the manifest fingerprint moved")],
                              cwd=runner, env=env, capture_output=True, text=True)

    def ci_run(self, codes):
        """Check out, rebuild, stage, confirm, commit and push, as one run does."""
        self.runs += 1
        runner = self.root / f"runner-{self.runs}"
        self.git("clone", "-q", str(self.origin), str(runner))
        code, _ = build(codes, "--skip-counter", str(runner / self.COUNTER))
        confirm = self.stage_and_confirm(runner)
        if confirm is not None and confirm.returncode == 0:
            self.git("commit", "-q", "-m", "data: rebuild published app data", cwd=runner)
            self.git("push", "-q", "origin", "HEAD:main", cwd=runner)
        return code, confirm

    def committed_streak(self):
        shown = self.git("--git-dir", str(self.origin), "show", f"main:{self.COUNTER}").stdout
        return (json.loads(shown).get("steps", {}).get(self.STEP) or {}).get("runs", 0)

    def test_six_runs_in_a_row_are_counted_across_checkouts_and_turn_red(self):
        for run in range(1, build_all.STUCK_AFTER + 1):
            code, confirm = self.ci_run({self.STEP: NO_PROGRESS})
            self.assertIsNotNone(confirm, f"run {run}: the workflow staged no change")
            self.assertEqual(confirm.returncode, 0, confirm.stdout + confirm.stderr)
            self.assertEqual(self.committed_streak(), run)
            self.assertEqual(code, 1 if run == build_all.STUCK_AFTER else 0, f"run {run}")

    def test_a_run_that_refreshes_commits_the_end_of_the_streak(self):
        for _ in range(3):
            self.ci_run({self.STEP: NO_PROGRESS})
        self.assertEqual(self.committed_streak(), 3)
        code, confirm = self.ci_run({})
        self.assertEqual(code, 0)
        self.assertEqual(confirm.returncode, 0, confirm.stdout + confirm.stderr)
        self.assertEqual(self.committed_streak(), 0)

    def test_a_published_change_still_needs_a_new_fingerprint(self):
        # The side-store exemption must not have switched the guard off.
        runner = self.root / "by-hand"
        self.git("clone", "-q", str(self.origin), str(runner))
        (runner / "public/data/v1/news.json").write_text('{"items": [1]}\n', encoding="utf-8")
        confirm = self.stage_and_confirm(runner)
        self.assertEqual(confirm.returncode, 1, confirm.stdout + confirm.stderr)
        self.assertIn("data_version did not move", confirm.stdout)

    def test_the_rebuild_keeps_the_count_and_the_validate_pass_does_not(self):
        text = self.WORKFLOW.read_text(encoding="utf-8")
        self.assertIn(f"python3 scripts/build_all.py --skip-counter {self.COUNTER}", text)
        self.assertIn(self.COUNTER, self.stores)
        self.assertIsNone(re.search(r"build_all\.py --check[^\n]*--skip-counter", text))
