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
        # The resolver the workflow calls, at the path it calls it from.
        (self.root / "scripts" / "resolve_generated.py").write_bytes(
            (HERE / "resolve_generated.py").read_bytes())
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

    def race_the_directory(self, workflow):
        """The daily build's new directory replayed over the fifteen-minute
        lane's newer crossings, as at 22:02 on 10 Sep 2026. Returns the
        committed directory's median and the one each committed copy of the
        crossings divided by."""
        (self.root / "scripts" / "build_connections_api.py").write_text(self.BUILDER)

        def crossings(stamp, median):
            for path in self.CROSSINGS:
                self.write(path, {"updated_at": stamp, "divided_by": median})

        self.write(self.DIRECTORY, {"median": 553811.5})
        crossings("2026-09-10T21:45:00+00:00", 553811.5)
        self.commit("base")
        base = git("rev-parse", "HEAD", cwd=self.root).stdout.strip()

        # The fifteen-minute lane rebuilds the crossings from the directory
        # already on main.
        crossings("2026-09-10T22:01:09+00:00", 553811.5)
        self.commit("data: live news and rates")

        # The daily build stamped its crossings at 21:56, from the directory
        # it had just rebuilt.
        git("checkout", "-q", "-b", "slow", base, cwd=self.root)
        self.write(self.DIRECTORY, {"median": 925908.5})
        crossings("2026-09-10T21:56:45+00:00", 925908.5)
        self.commit("data: rebuild published app data")

        rebase = subprocess.run(["git", "rebase", "main"], cwd=self.root,
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
