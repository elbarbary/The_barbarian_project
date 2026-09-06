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
        script = resolver_shell(workflow) + "\nresolve_ours\n"
        done = subprocess.run(["bash", "-c", script], cwd=self.root,
                              capture_output=True, text=True)
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
        script = resolver_shell("publish-app-data.yml") + "\nresolve_ours\n"
        done = subprocess.run(["bash", "-c", script], cwd=self.root,
                              capture_output=True, text=True)
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
