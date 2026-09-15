#!/usr/bin/env python3
"""Committing a lab run and pushing it, without ever losing the sealed record.

TWO KINDS OF FILE LEAVE A RUN, AND THEY FAIL DIFFERENTLY
--------------------------------------------------------
THE SEALED RECORD: `data-source/lab/run-*.json`, `data-source/lab/rerank-*.json`
and `public/data/v1/research/commitments/`. It was frozen before the outcome
existed, under a root a timestamping authority signed. It cannot be made
again, so a night that is not committed is missing from the record for good.
It is committed whatever else happened in the run.

It also has to be committed for the run after it. `run.py` and `rerank.py`
decide a night is already sealed by finding its file in the checkout, so a
sealed night left out of the repository is forecast a second time by the
retry cron: two answers for one night, both timestamped.

THE PUBLICATION: everything else the run writes, including scores, reveals, the
leaderboard, `research/top5.json` and the gated workbench documents.
`publish.py` rebuilds all of it from the sealed record and the prices, so it
goes only when its checks passed (`--publication checked`). A run whose
checks failed leaves it out and the next run rebuilds it.

WHEN SOMEBODY ELSE PUSHED FIRST
-------------------------------
Unrelated commits, like the market build's three a day, are rebased over.
A conflict on a publication file means somebody else published in the
meantime. Their copy stays and this run's publication commit is dropped:
a stale publication costs a night, and the next run rebuilds it. A conflict
on a sealed file means two different answers for one night. Nothing here
decides which one is the forecast, so the push stops and the job fails with
the run's files still on the runner for the recovery artifact.
"""
from __future__ import annotations

import argparse
import pathlib
import subprocess
import sys
import time

REPO = pathlib.Path(__file__).resolve().parents[2]

# Everything a lab run writes lives under these.
ROOTS = ("data-source/lab", "public/data/v1/research", "public/data/v1/lab")


def sealed(path: str) -> bool:
    """A file that cannot be made again once its night is over."""
    if path.startswith("public/data/v1/research/commitments/"):
        return True
    folder, _, name = path.rpartition("/")
    return (folder == "data-source/lab" and name.endswith(".json")
            and name.startswith(("run-", "rerank-")))


class Git:
    def __init__(self, repo: pathlib.Path):
        self.repo = repo

    def __call__(self, *args: str, check: bool = True) -> subprocess.CompletedProcess:
        done = subprocess.run(["git", *args], cwd=self.repo, text=True, capture_output=True)
        if check and done.returncode != 0:
            raise RuntimeError(f"git {' '.join(args)}: {done.stderr.strip()}")
        return done

    def changed(self) -> list[tuple[str, str]]:
        """(status, path) for every uncommitted change under the lab's roots."""
        out = self("status", "--porcelain=v1", "-z", "--no-renames",
                   "--untracked-files=all", "--", *ROOTS).stdout
        return [(entry[:2], entry[3:]) for entry in out.split("\0") if entry]

    def commit(self, paths: list[str], message: str) -> bool:
        if not paths:
            return False
        self("add", "-A", "--", *paths)
        if self("diff", "--cached", "--quiet", check=False).returncode == 0:
            return False
        self("commit", "--quiet", "-m", message)
        return True

    def discard(self, entries: list[tuple[str, str]]) -> None:
        """Put back what was left out, so it cannot ride along into a rebase."""
        paths = [path for _, path in entries]
        self("reset", "--quiet", "--", *paths, check=False)
        for status, path in entries:
            if status == "??":
                (self.repo / path).unlink(missing_ok=True)
            else:
                self("checkout", "HEAD", "--", path)

    def rebasing(self) -> bool:
        return any((self.repo / self("rev-parse", "--git-path", name).stdout.strip()).exists()
                   for name in ("rebase-merge", "rebase-apply"))


def settle(git: Git, branch: str) -> str:
    """Finish a rebase that stopped on a conflict.

    Returns "rebased" once it is complete, "sealed" when a sealed file is in the
    conflict, and "stuck" when no rebase was started or it could not go on.
    """
    if not git.rebasing():
        return "stuck"
    for _ in range(10):
        if not git.rebasing():
            return "rebased"
        unmerged = git("diff", "--name-only", "--diff-filter=U", check=False).stdout.split()
        if not unmerged:
            break
        if any(sealed(path) for path in unmerged):
            git("rebase", "--abort", check=False)
            print(f"::error::a sealed file conflicts with the copy already on {branch}, "
                  "so there are two answers for one night. Nothing was pushed:\n  "
                  + "\n  ".join(unmerged))
            return "sealed"
        # Somebody else published first. Theirs stays; this run's commit goes.
        print("::warning::a publication landed first, so this run's publication is "
              "dropped and the sealed record goes alone:\n  " + "\n  ".join(unmerged))
        git("rebase", "--skip", check=False)
    git("rebase", "--abort", check=False)
    return "stuck"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--publication", choices=("checked", "failed"), required=True,
                        help="whether tonight's publication passed its checks")
    parser.add_argument("--repo", type=pathlib.Path, default=REPO)
    parser.add_argument("--remote", default="origin")
    parser.add_argument("--branch", default="main")
    parser.add_argument("--attempts", type=int, default=3)
    parser.add_argument("--wait", type=float, default=5.0, help="seconds between attempts")
    args = parser.parse_args(argv)
    git = Git(args.repo)

    entries = git.changed()
    record = [path for _, path in entries if sealed(path)]
    rest = [(status, path) for status, path in entries if not sealed(path)]

    committed = git.commit(record, "lab: sealed forecasts")
    published = False
    if args.publication == "checked":
        try:
            published = git.commit([path for _, path in rest], "lab: scores, reveals and the workbench")
        except RuntimeError as error:
            print(f"::warning::the publication could not be committed ({error}), "
                  "so the sealed record is pushed alone")
            git.discard(rest)
    elif rest:
        print(f"::warning::the publication failed its checks, so its {len(rest)} changed "
              "file(s) stay out and the sealed record is pushed alone")
        git.discard(rest)
    if not committed and not published:
        print("nothing new — the basis session has not moved")
        return 0

    for attempt in range(1, args.attempts + 1):
        pulled = git("pull", "--rebase", "--autostash", args.remote, args.branch, check=False)
        state = "rebased" if pulled.returncode == 0 else settle(git, args.branch)
        if state == "stuck" and not git.rebasing() and git(
                "merge-base", "--is-ancestor", f"{args.remote}/{args.branch}", "HEAD",
                check=False).returncode == 0:
            # The rebase went through and only something after it complained.
            state = "rebased"
        if state == "sealed":
            return 1
        if state == "stuck":
            print(f"push attempt {attempt}: could not rebase onto {args.branch}: "
                  f"{pulled.stderr.strip()}")
        elif git("push", args.remote, f"HEAD:{args.branch}", check=False).returncode == 0:
            return 0
        else:
            print(f"push attempt {attempt} lost the race; retrying")
        time.sleep(args.wait)
    print(f"could not push after {args.attempts} attempts")
    return 1


if __name__ == "__main__":
    sys.exit(main())
