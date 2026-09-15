"""push.py against real repositories: a remote, the runner, and somebody else."""
import contextlib
import io
import os
import pathlib
import subprocess
import tempfile
import unittest
from unittest import mock

import push

RUN = "data-source/lab/run-2026-09-15.json"
ROOT = "public/data/v1/research/commitments/2026-09-15.json"
PICKS = "public/data/v1/lab/picks.json"
TOP5 = "public/data/v1/research/top5.json"
STALE = "public/data/v1/lab/rerank/news.json"
FRESH = "public/data/v1/lab/rerank/filings.json"
MARKET = "public/data/v1/market.json"


class PushTest(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = pathlib.Path(temp.name)
        (self.root / "gitconfig").write_text("")
        env = mock.patch.dict(os.environ, {
            "GIT_CONFIG_GLOBAL": str(self.root / "gitconfig"), "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_AUTHOR_NAME": "lab", "GIT_AUTHOR_EMAIL": "lab@example.com",
            "GIT_COMMITTER_NAME": "lab", "GIT_COMMITTER_EMAIL": "lab@example.com",
        })
        env.start()
        self.addCleanup(env.stop)

        self.remote = self.root / "remote.git"
        self.git(self.root, "init", "--quiet", "--bare", "-b", "main", str(self.remote))
        seed = self.root / "seed"
        self.git(self.root, "init", "--quiet", "-b", "main", str(seed))
        for path, text in {
            "data-source/lab/run-2026-09-14.json": "sealed 14",
            "data-source/lab/evaluation.json": "scores v1",
            "public/data/v1/research/commitments/2026-09-14.json": "root 14",
            TOP5: "top5 v1", PICKS: "picks v1", STALE: "news v1", MARKET: "market v1",
        }.items():
            self.write(seed, path, text)
        self.git(seed, "add", "-A")
        self.git(seed, "commit", "--quiet", "-m", "seed")
        self.git(seed, "push", "--quiet", str(self.remote), "main")

    def git(self, repo, *args):
        return subprocess.run(["git", *args], cwd=repo, check=True, text=True,
                              capture_output=True).stdout

    def write(self, repo, path, text):
        target = repo / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text)

    def clone(self, name):
        repo = self.root / name
        self.git(self.root, "clone", "--quiet", str(self.remote), str(repo))
        return repo

    def pushed_by(self, repo, message, **files):
        for path, text in files.items():
            self.write(repo, path, text)
        self.git(repo, "add", "-A")
        self.git(repo, "commit", "--quiet", "-m", message)
        self.git(repo, "push", "--quiet", "origin", "HEAD:main")

    def tonight(self, repo):
        """What a forecasting run leaves in its checkout."""
        self.write(repo, RUN, "sealed 15")
        self.write(repo, ROOT, "root 15")
        self.write(repo, PICKS, "picks v2")
        self.write(repo, TOP5, "top5 v2")
        self.write(repo, FRESH, "filings v2")
        (repo / STALE).unlink()

    def on_main(self, path):
        shown = subprocess.run(["git", "--git-dir", str(self.remote), "show", f"main:{path}"],
                               text=True, capture_output=True)
        return shown.stdout if shown.returncode == 0 else None

    def subjects(self):
        return subprocess.run(["git", "--git-dir", str(self.remote), "log", "--format=%s", "main"],
                              check=True, text=True, capture_output=True).stdout.split("\n")[:-1]

    def push(self, repo, publication):
        said = io.StringIO()
        with contextlib.redirect_stdout(said):
            code = push.main(["--publication", publication, "--repo", str(repo), "--wait", "0"])
        return code, said.getvalue()

    def test_the_sealed_record_is_told_apart_from_what_publish_rebuilds(self):
        for path in (RUN, ROOT, "data-source/lab/rerank-2026-09-15.json"):
            self.assertTrue(push.sealed(path), path)
        for path in ("data-source/lab/evaluation.json", PICKS, TOP5, FRESH,
                     "public/data/v1/research/reveals/2026-08-20.json",
                     "data-source/lab/old/run-2026-09-15.json"):
            self.assertFalse(push.sealed(path), path)

    def test_a_checked_run_pushes_the_record_and_then_the_publication(self):
        runner = self.clone("runner")
        self.tonight(runner)
        code, _ = self.push(runner, "checked")
        self.assertEqual(code, 0)
        self.assertEqual(self.subjects()[:2], ["lab: scores, reveals and the workbench",
                                               "lab: sealed forecasts"])
        self.assertEqual((self.on_main(RUN), self.on_main(ROOT)), ("sealed 15", "root 15"))
        self.assertEqual((self.on_main(PICKS), self.on_main(FRESH)), ("picks v2", "filings v2"))
        self.assertIsNone(self.on_main(STALE), "a reading publish removed stays removed")

    def test_a_publication_that_failed_its_checks_leaves_the_record_to_go_alone(self):
        runner = self.clone("runner")
        self.tonight(runner)
        code, said = self.push(runner, "failed")
        self.assertEqual(code, 0)
        self.assertIn("failed its checks", said)
        self.assertEqual(self.subjects()[0], "lab: sealed forecasts")
        self.assertEqual((self.on_main(RUN), self.on_main(ROOT)), ("sealed 15", "root 15"))
        self.assertEqual((self.on_main(PICKS), self.on_main(TOP5), self.on_main(STALE)),
                         ("picks v1", "top5 v1", "news v1"))
        self.assertIsNone(self.on_main(FRESH))
        self.assertEqual(self.git(runner, "status", "--porcelain"), "")

    def test_nothing_new_is_not_an_error(self):
        runner = self.clone("runner")
        code, said = self.push(runner, "checked")
        self.assertEqual((code, self.subjects()), (0, ["seed"]))
        self.assertIn("nothing new", said)

    def test_the_market_build_pushing_first_is_rebased_over(self):
        runner, other = self.clone("runner"), self.clone("other")
        self.tonight(runner)
        self.pushed_by(other, "data: session prices", **{MARKET: "market v2"})
        code, _ = self.push(runner, "checked")
        self.assertEqual(code, 0)
        self.assertEqual((self.on_main(MARKET), self.on_main(RUN), self.on_main(PICKS)),
                         ("market v2", "sealed 15", "picks v2"))

    def test_somebody_elses_publication_stays_and_the_record_still_goes(self):
        runner, other = self.clone("runner"), self.clone("other")
        self.tonight(runner)
        self.pushed_by(other, "lab: republished", **{PICKS: "picks from elsewhere"})
        code, said = self.push(runner, "checked")
        self.assertEqual(code, 0)
        self.assertIn("publication landed first", said)
        self.assertEqual(self.on_main(RUN), "sealed 15")
        self.assertEqual(self.on_main(PICKS), "picks from elsewhere")
        # The whole publication is dropped, never half of it: top5.json did not
        # conflict, and a mixed publication is what the snapshot check refuses.
        self.assertEqual((self.on_main(TOP5), self.on_main(STALE)), ("top5 v1", "news v1"))
        self.assertIsNone(self.on_main(FRESH))

    def test_two_answers_for_one_night_stop_the_push(self):
        runner, other = self.clone("runner"), self.clone("other")
        self.tonight(runner)
        self.pushed_by(other, "lab: sealed elsewhere", **{RUN: "sealed 15 elsewhere"})
        before = self.subjects()
        code, said = self.push(runner, "checked")
        self.assertEqual(code, 1)
        self.assertIn("two answers for one night", said)
        self.assertEqual(self.subjects(), before)
        self.assertEqual(self.on_main(RUN), "sealed 15 elsewhere")
        # Still on the runner, for the recovery artifact.
        self.assertEqual((runner / RUN).read_text(), "sealed 15")
        self.assertEqual((runner / ROOT).read_text(), "root 15")

    def test_a_push_that_loses_the_race_goes_again(self):
        runner, other = self.clone("runner"), self.clone("other")
        self.tonight(runner)
        real, raced = push.Git.__call__, []

        def racing(git, *args, check=True):
            if args[:1] == ("push",) and not raced:
                raced.append(True)
                self.pushed_by(other, "data: session prices", **{MARKET: "market v3"})
            return real(git, *args, check=check)

        with mock.patch.object(push.Git, "__call__", racing):
            code, said = self.push(runner, "checked")
        self.assertEqual(code, 0)
        self.assertIn("lost the race", said)
        self.assertEqual((self.on_main(MARKET), self.on_main(RUN), self.on_main(PICKS)),
                         ("market v3", "sealed 15", "picks v2"))


if __name__ == "__main__":
    unittest.main()
