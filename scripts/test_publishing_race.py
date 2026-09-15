#!/usr/bin/env python3
"""The two publishing jobs colliding, replayed in a real repository.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'

`test_resolve_generated` covers the decision. This covers the part that
actually shipped: the shell inside the workflow that asks for it and acts on
the answer. The function is EXTRACTED FROM THE YAML at test time rather than
copied here, so a change to the workflow is a change to what these run.

The collision is real. publish-app-data takes about an hour and commits last;
publish-live-data commits every fifteen minutes. On 6 Sep 2026 the slow one
replayed its hour-old snapshot over the fast one and un-published the newest
story on the news feed and three of that morning's filings.
"""

from __future__ import annotations

import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent
WORKFLOWS = REPO / ".github" / "workflows"


def resolver_shell(workflow: str) -> str:
    """The `resolve_ours` function exactly as the workflow defines it."""
    source = (WORKFLOWS / workflow).read_text(encoding="utf-8")
    body = source[source.index("resolve_ours () {"):]
    body = body[:body.index("\n          for attempt in")]
    # The YAML indents the block by ten spaces; bash does not care, but the
    # heredoc below reads better dedented.
    return "\n".join(line[10:] if line.startswith(" " * 10) else line
                     for line in body.splitlines())


def commit_shell(workflow: str) -> str:
    """The functions AND the pull-and-push loop that calls them, to its last line."""
    source = (WORKFLOWS / workflow).read_text(encoding="utf-8")
    body = source[source.index("resolve_ours () {"):]
    end = "echo 'could not push after three attempts'"
    body = body[:body.index(end) + len(end)] + "\nexit 1"
    return "\n".join(line[10:] if line.startswith(" " * 10) else line
                     for line in body.splitlines())


def git(*args, cwd, **kw):
    return subprocess.run(("git",) + args, cwd=cwd, check=True,
                          capture_output=True, text=True, **kw)


class RaceTest(unittest.TestCase):
    """A slow build replaying over a fast one, in an actual git rebase."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        (self.root / "public" / "data" / "v1" / "news").mkdir(parents=True)
        (self.root / "public" / "data" / "v1" / "disclosures").mkdir(parents=True)
        (self.root / "scripts").mkdir(parents=True)
        # The resolver the workflow calls, at the path it calls it from — and
        # the fold and the audit it runs after a race, which are real here:
        # they read whatever the scratch repository publishes, and with no
        # directory or review sheet they have nothing to do.
        for script in ("resolve_generated.py", "apply_company_ratios.py",
                       "audit_accuracy.py"):
            (self.root / "scripts" / script).write_bytes((HERE / script).read_bytes())
        git("init", "-q", "-b", "main", cwd=self.root)
        git("config", "user.email", "t@example.com", cwd=self.root)
        git("config", "user.name", "test", cwd=self.root)

    # ── the two documents the jobs fight over ────────────────────────────
    NEWS = "public/data/v1/news/latest.json"
    FILINGS = "public/data/v1/disclosures/archive/2026-09.json"

    def write(self, path, payload):
        p = self.root / path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(payload), encoding="utf-8")

    def commit(self, message):
        git("add", "-A", cwd=self.root)
        git("commit", "-q", "-m", message, cwd=self.root)

    def read(self, path):
        return json.loads((self.root / path).read_text(encoding="utf-8"))

    def resolve(self, workflow):
        """Run the workflow's own `resolve_ours` over the conflict in progress.

        This suite runs inside publish-app-data, whose job env names its
        side-stores in STORES. None of those paths exist in this repository,
        and `git add` refuses a whole pathspec over one missing path, so the
        resolver's amend silently never happened on the runner while passing
        on a laptop. The stores are not part of any race here.
        """
        script = resolver_shell(workflow) + "\nresolve_ours\n"
        return subprocess.run(["bash", "-c", script], cwd=self.root,
                              capture_output=True, text=True,
                              env={**os.environ, "STORES": ""})

    def run_race(self, workflow="publish-app-data.yml"):
        """Base -> fast lane on main -> slow build rebased onto it."""
        self.write(self.NEWS, {"generated_at": "2026-09-06T06:30:00+00:00", "items": []})
        self.write(self.FILINGS, {"items": [{"id": 294338}, {"id": 294340}]})
        self.commit("base")
        base = git("rev-parse", "HEAD", cwd=self.root).stdout.strip()

        # The fifteen-minute lane publishes at 07:01, with three more filings.
        self.write(self.NEWS, {"generated_at": "2026-09-06T07:01:44+00:00",
                               "items": [{"id": "newest-story"}]})
        self.write(self.FILINGS, {"items": [{"id": i} for i in
                                            (294338, 294340, 294341, 294342, 294344)]})
        self.commit("data: live news and rates")

        # The hour-long build, which started before that and knows none of it.
        git("checkout", "-q", "-b", "slow", base, cwd=self.root)
        self.write(self.NEWS, {"generated_at": "2026-09-06T06:48:47+00:00",
                               "items": [{"id": "older-story"}]})
        self.write(self.FILINGS, {"items": [{"id": i} for i in (294338, 294340)]})
        self.commit("data: rebuild published app data")

        # Rebase it onto main exactly as the Commit step does, then run the
        # workflow's own resolver over the conflict.
        rebase = subprocess.run(["git", "rebase", "main"], cwd=self.root,
                                capture_output=True, text=True)
        self.assertNotEqual(rebase.returncode, 0, "the setup did not actually collide")
        done = self.resolve(workflow)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        return done.stdout + done.stderr

    def test_the_fresher_news_survives_the_slower_build(self):
        out = self.run_race()
        news = self.read(self.NEWS)
        self.assertEqual(news["generated_at"], "2026-09-06T07:01:44+00:00",
                         f"the hour-old snapshot won again\n{out}")
        self.assertEqual([i["id"] for i in news["items"]], ["newest-story"])

    def test_no_filing_is_un_published_by_the_collision(self):
        out = self.run_race()
        kept = {r["id"] for r in self.read(self.FILINGS)["items"]}
        self.assertEqual(kept, {294338, 294340, 294341, 294342, 294344},
                         f"filings were dropped by the merge\n{out}")

    def test_the_fast_lane_resolves_the_same_way(self):
        # Both jobs carry the same function and the same argument applies:
        # freshness is a property of the document, not of who is asking.
        out = self.run_race(workflow="publish-live-data.yml")
        self.assertEqual(self.read(self.NEWS)["generated_at"],
                         "2026-09-06T07:01:44+00:00", out)

    # ── a derived document and the one it divides by ─────────────────────
    DIRECTORY = "public/data/v1/companies.json"
    CROSSINGS = ("public/data/v1/connections.json",
                 "app/assets/fixtures/connections.json")
    # Stands in for build_connections_api.py at the path the resolver calls:
    # reads the directory on disk, writes both roots, and records the median
    # it divided by.
    BUILDER = (
        "import json, pathlib\n"
        "root = pathlib.Path(__file__).resolve().parent.parent\n"
        "directory = json.loads((root / 'public/data/v1/companies.json').read_text())\n"
        "body = json.dumps({'divided_by': directory['median']})\n"
        "for folder in ('public/data/v1', 'app/assets/fixtures'):\n"
        "    (root / folder / 'connections.json').write_text(body)\n"
    )

    # A file the daily build writes and never stages, and the fifteen-minute
    # lane commits.
    INSIGHTS = "scripts/news_insights.json"

    def race_the_directory(self, workflow, *, stashed=False):
        """The daily build's new directory replayed over the fifteen-minute
        lane's newer crossings, as at 22:02 on 10 Sep 2026. Returns the
        committed directory's median and the one each committed copy of the
        crossings divided by.

        `stashed` leaves the build's own write to the insights cache unstaged,
        so the pull's autostash collides with the lane's commit of it when
        the rebase finishes, as it did at 08:38 on 15 Sep 2026."""
        (self.root / "scripts" / "build_connections_api.py").write_text(self.BUILDER)

        def crossings(stamp, median):
            for path in self.CROSSINGS:
                self.write(path, {"updated_at": stamp, "divided_by": median})

        self.write(self.DIRECTORY, {"median": 553811.5})
        crossings("2026-09-10T21:45:00+00:00", 553811.5)
        self.write(self.INSIGHTS, {"cache": "base"})
        self.commit("base")
        base = git("rev-parse", "HEAD", cwd=self.root).stdout.strip()

        # The fifteen-minute lane rebuilds the crossings from the directory
        # already on main.
        crossings("2026-09-10T22:01:09+00:00", 553811.5)
        self.write(self.INSIGHTS, {"cache": "the fifteen-minute lane's"})
        self.commit("data: live news and rates")

        # The daily build stamped its crossings at 21:56, from the directory
        # it had just rebuilt.
        git("checkout", "-q", "-b", "slow", base, cwd=self.root)
        self.write(self.DIRECTORY, {"median": 925908.5})
        crossings("2026-09-10T21:56:45+00:00", 925908.5)
        self.commit("data: rebuild published app data")
        if stashed:
            self.write(self.INSIGHTS, {"cache": "the daily build's"})

        # `git pull --rebase --autostash origin main`, against a local main.
        rebase = subprocess.run(["git", "rebase", "--autostash", "main"], cwd=self.root,
                                capture_output=True, text=True)
        self.assertNotEqual(rebase.returncode, 0, "the setup did not actually collide")
        done = self.resolve(workflow)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)

        def committed(path):
            return json.loads(git("show", f"HEAD:{path}", cwd=self.root).stdout)

        return (committed(self.DIRECTORY)["median"],
                [committed(path)["divided_by"] for path in self.CROSSINGS],
                done.stdout + done.stderr)

    def test_the_committed_crossings_divide_by_the_committed_directory(self):
        # The resolver keeps main's crossings, which are newer, and the build's
        # directory, which nothing on main touched. Without a rebuild the
        # commit carries 11.04× where its own directory says 6.60×.
        median, divided_by, out = self.race_the_directory("publish-app-data.yml")
        self.assertEqual(median, 925908.5, f"the build's directory was lost\n{out}")
        self.assertEqual(divided_by, [median, median],
                         f"the crossings divide by a directory that was not committed\n{out}")

    def test_the_fast_lane_rebuilds_the_crossings_the_same_way(self):
        median, divided_by, out = self.race_the_directory("publish-live-data.yml")
        self.assertEqual(divided_by, [median, median], out)

    def test_a_colliding_autostash_does_not_cost_the_rebuild(self):
        # The stash comes back unmerged, `git commit --amend` refuses, and
        # without clearing it the plain rebased commit goes out: 3cc0ded.
        median, divided_by, out = self.race_the_directory("publish-app-data.yml",
                                                          stashed=True)
        self.assertEqual(divided_by, [median, median],
                         f"the rebuild never reached the commit\n{out}")
        self.assertEqual(git("diff", "--name-only", "--diff-filter=U",
                             cwd=self.root).stdout, "",
                         "a retry after a lost push cannot pull over an unmerged file")

    def test_the_fast_lane_survives_a_colliding_autostash_too(self):
        median, divided_by, out = self.race_the_directory("publish-live-data.yml",
                                                          stashed=True)
        self.assertEqual(divided_by, [median, median], out)

    # ── the directory's ratios and the review sheet they are copied from ──
    REVIEW = "public/data/v1/review/UNIP.json"
    FIXTURE = "app/assets/fixtures/companies.json"

    def sheet(self, pb):
        self.write(self.REVIEW, {"ticker": "UNIP", "metrics": [
            {"key": "pb", "value": pb, "unit": "ratio"},
            {"key": "roe", "value": 0.3071, "unit": "ratio"}]})

    def directory(self, stamp, pb, **row):
        body = {"updated_at": stamp, "ratio_units": {"pb": "ratio", "roe": "ratio"},
                "companies": [{"ticker": "UNIP", **row,
                               "ratios": {"pb": pb, "roe": 0.3071}}]}
        self.write(self.DIRECTORY, body)
        self.write(self.FIXTURE, body)

    def committed(self, path):
        return json.loads(git("show", f"HEAD:{path}", cwd=self.root).stdout)

    def unip(self, doc):
        (row,) = doc["companies"]
        return row

    def origin(self) -> pathlib.Path:
        """A bare repository outside the working one, as `origin`."""
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        origin = pathlib.Path(folder.name) / "origin.git"
        git("init", "-q", "--bare", "-b", "main", str(origin), cwd=self.root)
        git("remote", "add", "origin", str(origin), cwd=self.root)
        return origin

    def push(self):
        """The Commit step's own pull-and-push loop, with the job's shell flags
        and without the job's STORES (see `resolve`)."""
        return subprocess.run(["bash", "-e", "-c", commit_shell("publish-app-data.yml")],
                              cwd=self.root, capture_output=True, text=True,
                              env={**os.environ, "STORES": ""})

    def race_the_ratios(self):
        """142b708, in a real rebase. The build before it left UNIP at 2.8315;
        ab3c580 reached main first, repriced at 2.824; this build repriced at
        2.8315 again, so its review document matched the tree it started on,
        was not in its commit, and main's copy stood beside its directory."""
        self.sheet(2.8315)
        self.directory("2026-09-15T08:02:56.468Z", 2.8315)
        self.commit("3cc0ded: the build both started from")
        base = git("rev-parse", "HEAD", cwd=self.root).stdout.strip()

        self.sheet(2.824)
        self.directory("2026-09-15T08:39:30.638Z", 2.824)
        self.commit("ab3c580: the build that pushed first")

        git("checkout", "-q", "-b", "slow", base, cwd=self.root)
        self.sheet(2.8315)
        self.directory("2026-09-15T09:15:57.506Z", 2.8315, market_cap=866165305.068)
        self.commit("142b708: the build that pushed second")

        rebase = subprocess.run(["git", "rebase", "main"], cwd=self.root,
                                capture_output=True, text=True)
        self.assertNotEqual(rebase.returncode, 0, "the setup did not actually collide")
        self.assertNotIn(self.REVIEW, git("diff", "--name-only", "--diff-filter=U",
                                          cwd=self.root).stdout,
                         "the review document must come through without a conflict")
        return self.resolve("publish-app-data.yml")

    def test_a_race_cannot_commit_a_ratio_its_review_sheet_contradicts(self):
        done = self.race_the_ratios()
        out = done.stdout + done.stderr
        self.assertEqual(done.returncode, 0, out)
        row = self.unip(self.committed(self.DIRECTORY))
        stated = {m["key"]: m["value"] for m in self.committed(self.REVIEW)["metrics"]}
        self.assertEqual(row["ratios"]["pb"], stated["pb"],
                         f"the committed row restates another build's sheet\n{out}")
        self.assertEqual(stated["pb"], 2.824, out)
        # The build's own directory is still the one committed, re-folded.
        self.assertEqual(row["market_cap"], 866165305.068, out)
        self.assertEqual(self.committed(self.FIXTURE), self.committed(self.DIRECTORY))

    def test_the_audit_refuses_the_push_when_the_fold_does_not_repair_it(self):
        """The fold is the fix and the audit is the guarantee; each alone.

        Here the fold finds no directory to write, as a broken or missing fold
        would, and the split has to stop at the audit instead of reaching main.
        """
        fold = self.root / "scripts" / "apply_company_ratios.py"
        fold.write_text(fold.read_text(encoding="utf-8").replace(
            'DIRECTORY = V1 / "companies.json"', 'DIRECTORY = V1 / "nowhere.json"'),
            encoding="utf-8")
        done = self.race_the_ratios()
        out = done.stdout + done.stderr
        self.assertEqual(done.returncode, 1, f"a split directory was cleared to push\n{out}")
        self.assertIn("ratio_split", out)
        self.assertIn("Not pushed", out)

    def test_a_clean_replay_is_folded_and_audited_before_it_is_pushed(self):
        """No conflict at all, so `resolve_ours` never runs.

        Main's new commit rewrote the review sheet and nothing else; this
        build rewrote its directory and left the sheet as it found it. Git
        merges that without a word, and the result is the same split. The
        whole Commit loop runs here, against a bare origin.
        """
        origin = self.origin()
        self.sheet(2.8315)
        self.directory("2026-09-15T08:02:56.468Z", 2.8315)
        self.commit("base")
        git("push", "-q", "origin", "main", cwd=self.root)

        elsewhere = tempfile.TemporaryDirectory()
        self.addCleanup(elsewhere.cleanup)
        other = pathlib.Path(elsewhere.name) / "other"
        git("clone", "-q", str(origin), str(other), cwd=self.root)
        git("config", "user.email", "t@example.com", cwd=other)
        git("config", "user.name", "other", cwd=other)
        (other / self.REVIEW).write_text(json.dumps({"ticker": "UNIP", "metrics": [
            {"key": "pb", "value": 2.824, "unit": "ratio"},
            {"key": "roe", "value": 0.3071, "unit": "ratio"}]}))
        git("commit", "-q", "-am", "main moves the sheet", cwd=other)
        git("push", "-q", "origin", "main", cwd=other)

        self.directory("2026-09-15T09:15:57.506Z", 2.8315, market_cap=866165305.068)
        self.commit("data: rebuild published app data")

        done = self.push()
        out = done.stdout + done.stderr
        self.assertEqual(done.returncode, 0, out)
        self.assertNotIn("CONFLICT", out, "the setup collided; this is the clean path")
        pushed = json.loads(git("--git-dir", str(origin), "show",
                                f"main:{self.DIRECTORY}", cwd=self.root).stdout)
        sheet = json.loads(git("--git-dir", str(origin), "show",
                               f"main:{self.REVIEW}", cwd=self.root).stdout)
        self.assertEqual(self.unip(pushed)["ratios"]["pb"],
                         {m["key"]: m["value"] for m in sheet["metrics"]}["pb"],
                         f"a clean replay pushed a split directory\n{out}")
        self.assertEqual(self.unip(pushed)["market_cap"], 866165305.068, out)

    def test_a_pull_that_brings_nothing_pushes_the_build_untouched(self):
        """Nothing replayed, nothing to re-derive: no amend, the commit as built."""
        origin = self.origin()
        self.sheet(2.824)
        self.directory("2026-09-15T08:39:30.638Z", 2.824)
        self.commit("base")
        git("push", "-q", "origin", "main", cwd=self.root)
        self.directory("2026-09-15T09:15:57.506Z", 2.824, market_cap=866165305.068)
        self.commit("data: rebuild published app data")
        built = git("rev-parse", "HEAD", cwd=self.root).stdout.strip()

        done = self.push()
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        self.assertEqual(git("--git-dir", str(origin), "rev-parse", "main",
                             cwd=self.root).stdout.strip(), built)

    def test_a_conflict_outside_generated_data_still_stops_everything(self):
        # The guard that keeps this from auto-resolving source code.
        self.write(self.NEWS, {"generated_at": "2026-09-06T06:30:00+00:00"})
        (self.root / "scripts" / "build_news_api.py").write_text("print('base')\n")
        self.commit("base")
        base = git("rev-parse", "HEAD", cwd=self.root).stdout.strip()
        (self.root / "scripts" / "build_news_api.py").write_text("print('main')\n")
        self.commit("on main")
        git("checkout", "-q", "-b", "slow", base, cwd=self.root)
        (self.root / "scripts" / "build_news_api.py").write_text("print('slow')\n")
        self.commit("on the branch")
        subprocess.run(["git", "rebase", "main"], cwd=self.root,
                       capture_output=True, text=True)
        done = self.resolve("publish-app-data.yml")
        self.assertEqual(done.returncode, 1,
                         "a conflict in source code must not be auto-resolved")
        self.assertIn("conflict outside generated data", done.stdout + done.stderr)


class ShippedShellTest(unittest.TestCase):
    """What the workflows must keep saying for the above to mean anything."""

    def test_both_jobs_ask_the_resolver_rather_than_always_taking_their_own(self):
        for name in ("publish-app-data.yml", "publish-live-data.yml"):
            with self.subTest(workflow=name):
                shell = resolver_shell(name)
                self.assertIn("resolve_generated.py", shell,
                              "the job decides by who is asking again")
                self.assertIn('side=${verdict%% *}', shell)
                # The old rule survives only as the fallback for documents the
                # resolver cannot judge — it must not be the first choice.
                first = shell.index("git checkout --theirs")
                self.assertGreater(first, shell.index("resolve_generated.py"),
                                   "it takes its own copy before asking")


if __name__ == "__main__":
    unittest.main()
