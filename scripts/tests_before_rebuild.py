#!/usr/bin/env python3
"""The parser suite before the rebuild, stopping only for what a rebuild cannot change.

WHY THIS EXISTS

`publish-app-data` ran the whole suite before `build_all.py`, and a good part
of that suite reads the documents under `public/data/` — as the LAST commit
left them, because nothing has rebuilt them yet. That made one step two wrong
things at once. A bad document went out through it green, since it was
written after the gate had looked. And once one was on main, every later run
failed at the gate, before the only step that would have rewritten it, so a
document the next rebuild would have repaired stayed broken until somebody
committed a repair by hand.

On 15 Sep 2026 that happened three ways: UNIP's ratios split from its review
sheet by a push race (runs 34955982717, 34957349579, 34961265035), NBCC listed
in `market.json` by the price job before the measures table had a row for it
(34966943749), and then that row published with no date (34971269319,
34990199243). Of the 21 runs that failed this step from 6 to 15 September, 16
failed on a document the rebuild rewrites. Five failed on code.

WHAT IT DECIDES

It runs what `python3 -m unittest discover -s scripts -p 'test_*.py'` runs and
prints what that prints. While each test runs, an audit hook notes the files
in this repository it opens, lists or stats, and whether it starts a process.

A failure stops the job only when its test touched nothing the rebuild writes
(`public/data/`, `app/assets/fixtures/`, `data-source/`, the `scripts/*.json`
stores), counting what its fixtures and the modules it imports read when they
loaded, and started no process. That failure is the code's. Forty minutes of
rebuilding would end at the same failure, so it stops here, as before.

Any other failure is named and left to "Test what is about to be published",
which runs the whole suite again after the rebuild, over the documents the
Commit step pushes, and fails on anything. A test that started a process is
left to that gate too: what the child read cannot be seen from here, and
calling it code would put the deadlock back.

WHAT IT CANNOT DO

Publish anything. Every failure it lets past is run again, strictly, before
the commit. At worst it stops a build a rebuild would have repaired (every
run did that before this existed), or lets a doomed build run to the gate
that refuses it, which costs runner minutes and never a wrong number. It
fails closed where it can: a suite that collected no tests is exit 1, and a
hook that noted nothing leaves every failure looking like the code's.

    python3 scripts/tests_before_rebuild.py -v
    python3 scripts/tests_before_rebuild.py --report verdicts.json
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import pathlib
import re
# Before `os.stat` is watched: shutil decides once, as it loads, whether its
# fd-based `rmtree` is safe, by looking for `os.stat` itself in
# `os.supports_follow_symlinks`. Loaded after the swap, it finds the wrapper
# there instead and quietly falls back for every test in the run. argparse
# happens to load it first today; this does not lean on that.
import shutil  # noqa: F401
import sys
import threading
import types
import unittest

HERE = pathlib.Path(__file__).resolve().parent

# What `build_all.py` rewrites. The Commit step stages `public/data`,
# `app/assets/fixtures` and the STORES list; the build also rewrites stores it
# never stages (`scripts/news_insights.json`) and caches git ignores. A test
# reading any of them may be reading something the rebuild is about to change.
# `test_tests_before_rebuild` holds this to the workflow's own staging lines.
REBUILT_DIRS = ("public/data/", "app/assets/fixtures/", "data-source/")
REBUILT_FILES = re.compile(r"scripts/[^/]+\.json")

# Audit events that reach the filesystem by name. `os.stat` raises none, so it
# is watched separately: a test that only asks whether a document exists is
# still asking about the document.
READS = frozenset({"open", "os.listdir", "os.scandir", "glob.glob", "glob.glob/2",
                   "shutil.copyfile", "shutil.copytree", "sqlite3.connect"})
# And the ones that start a process, whose reads this hook never sees.
SPAWNS = frozenset({"subprocess.Popen", "os.system", "os.posix_spawn", "os.spawn",
                    "os.exec", "os.fork", "os.forkpty", "pty.spawn"})

IMPORT = re.compile(r"^[ \t]*(?:from[ \t]+([\w.]+)[ \t]+import[ \t]+\(?([\w., \t]+)"
                    r"|import[ \t]+([\w., \t]+))", re.M)


def rebuilt(rel: str) -> bool:
    return (rel + "/").startswith(REBUILT_DIRS) or bool(REBUILT_FILES.fullmatch(rel))


class Tracer:
    """What each test touched, as an audit hook sees it happen."""

    def __init__(self, repo: pathlib.Path):
        self.roots = tuple(dict.fromkeys((os.path.abspath(repo), os.path.realpath(repo))))
        self.active = False
        self.test: str | None = None
        self.last_class: type | None = None
        # test id, `module.Class`, `module` or a fixture error's description
        self.touched: dict[str, set[str]] = collections.defaultdict(set)
        self.spawned: set[str] = set()
        # what ran between two tests: teardowns, then the next setUpClass
        self.between: set[str] = set()
        self.spawned_between = False
        # repo-relative source file -> documents its module body touched, and
        # the sources whose body started a process
        self.loaded: dict[str, set[str]] = collections.defaultdict(set)
        self.loaded_spawned: set[str] = set()
        self._busy = threading.local()
        self._stats: dict[str, object] = {}

    # ── noting ────────────────────────────────────────────────────────────

    def relative(self, path) -> str | None:
        if path is None or isinstance(path, int):
            return None
        try:
            path = os.fsdecode(path)
            full = os.path.normpath(path if os.path.isabs(path)
                                    else os.path.join(os.getcwd(), path))
        except (TypeError, ValueError, OSError):
            return None
        for root in self.roots:
            if full == root:
                return ""
            if full.startswith(root + os.sep):
                return full[len(root) + 1:].replace(os.sep, "/")
        return None

    def loading(self) -> list[str]:
        """Repository modules whose body is running: the imports under way.

        A module that reads a document while it loads keeps what it read for
        every test that imports it afterwards, when the import is only a
        lookup and touches nothing. `__main__` is this runner, whose body is
        under every call, so it is not an import.
        """
        sources = []
        frame = sys._getframe(2)
        while frame is not None:
            if (frame.f_code.co_name == "<module>"
                    and frame.f_globals.get("__name__") != "__main__"):
                source = self.relative(frame.f_code.co_filename)
                if source and source.endswith(".py"):
                    sources.append(source)
            frame = frame.f_back
        return sources

    def note(self, path) -> None:
        if not self.active or getattr(self._busy, "on", False):
            return
        self._busy.on = True
        try:
            rel = self.relative(path)
            if rel is None or not rebuilt(rel):
                return
            (self.touched[self.test] if self.test is not None else self.between).add(rel)
            for source in self.loading():
                self.loaded[source].add(rel)
        finally:
            self._busy.on = False

    def spawn(self) -> None:
        if self.test is not None:
            self.spawned.add(self.test)
        else:
            self.spawned_between = True
        self.loaded_spawned.update(self.loading())

    def __call__(self, event: str, args: tuple) -> None:
        if not self.active:
            return
        if event in READS:
            path = args[0] if args else None
            if event == "glob.glob/2" and len(args) > 2 and args[2] and path is not None:
                try:
                    path = os.path.join(os.fsdecode(args[2]), os.fsdecode(path))
                except TypeError:
                    return
            self.note(path)
        elif event in SPAWNS:
            self.spawn()

    def watch_stats(self) -> None:
        for name in ("stat", "lstat"):
            original = getattr(os, name)
            self._stats[name] = original

            def watched(path, *args, _original=original, **kwargs):
                if kwargs.get("dir_fd") is None:
                    self.note(path)
                return _original(path, *args, **kwargs)

            watched.__wrapped__ = original
            setattr(os, name, watched)

    def unwatch_stats(self) -> None:
        for name, original in self._stats.items():
            setattr(os, name, original)

    # ── deciding ──────────────────────────────────────────────────────────

    def where(self, test) -> tuple[str, list[str]]:
        """The module a failure belongs to, and the keys its touches are under."""
        case = getattr(test, "test_case", test)  # a subTest reports its parent
        kind = type(case).__name__
        if kind == "_FailedTest":  # an import that raised; the name is the module
            return case._testMethodName, []
        if kind == "_ErrorHolder":  # "setUpClass (test_x.Klass)"
            found = re.search(r"\(([\w.]+)\)", case.description)
            place = found.group(1) if found else ""
            module = place.split(".")[0]
            return module, [case.description, place, module]
        cls = type(case)
        return cls.__module__, [case.id(), f"{cls.__module__}.{cls.__qualname__}",
                                cls.__module__]

    def imports(self, module: str, repo: pathlib.Path) -> set[str]:
        """Every repository source file `module` imports, followed all the way down."""
        found: set[str] = set()
        queue = [f"scripts/{module.replace('.', '/')}.py"]
        while queue:
            rel = queue.pop()
            if rel in found or not (repo / rel).is_file():
                continue
            found.add(rel)
            text = (repo / rel).read_text(encoding="utf-8", errors="replace")
            for source, names, plain in IMPORT.findall(text):
                heads = [source] if source else [n.split()[0] for n in plain.split(",") if n.split()]
                for head in heads:
                    parts = head.split(".")
                    for i in range(1, len(parts) + 1):
                        queue.append("scripts/" + "/".join(parts[:i]) + ".py")
                    if source:  # `from pkg import mod`
                        queue += [f"scripts/{'/'.join(parts)}/{n.split()[0]}.py"
                                  for n in names.split(",") if n.split()]
        # And the modules it holds, however they were loaded.
        stack, seen = [sys.modules.get(module)], set()
        while stack:
            mod = stack.pop()
            if not isinstance(mod, types.ModuleType) or id(mod) in seen:
                continue
            seen.add(id(mod))
            rel = self.relative(getattr(mod, "__file__", None))
            if not rel or not rel.endswith(".py"):
                continue
            found.add(rel)
            for value in list(vars(mod).values()):
                if isinstance(value, types.ModuleType):
                    stack.append(value)
                    continue
                try:
                    owner = getattr(value, "__module__", None)
                except Exception:  # a proxy or a mock that objects to being asked
                    owner = None
                if isinstance(owner, str):
                    stack.append(sys.modules.get(owner))
        return found

    def verdict(self, test, repo: pathlib.Path) -> tuple[str, list[str]]:
        module, keys = self.where(test)
        sources = self.imports(module, repo) if module else set()
        # The test's own reads first, then its fixtures', then what its
        # imports read as they loaded: the order a person would look in.
        paths: list[str] = []
        for group in ([self.touched.get(key, set()) for key in keys]
                      + [self.loaded.get(source, set()) for source in sorted(sources)]):
            paths += sorted(group - set(paths))
        if paths:
            return "rebuilt", paths
        if any(key in self.spawned for key in keys) or sources & self.loaded_spawned:
            return "unseen", []
        return "code", []


class TracingResult(unittest.TextTestResult):
    tracer: Tracer

    def startTest(self, test):
        tracer, cls = self.tracer, type(test)
        if cls is not tracer.last_class:
            # Whatever ran since the last test was this class's setUpClass, its
            # module's setUpModule when the module changed, and the teardowns
            # before them. Crediting the class with all of it can only make it
            # look less like code.
            keys = [f"{cls.__module__}.{cls.__qualname__}"]
            if getattr(tracer.last_class, "__module__", None) != cls.__module__:
                keys.append(cls.__module__)
            for key in keys:
                tracer.touched[key] |= tracer.between
                if tracer.spawned_between:
                    tracer.spawned.add(key)
            tracer.last_class = cls
            tracer.between, tracer.spawned_between = set(), False
        tracer.test = test.id()
        super().startTest(test)

    def stopTest(self, test):
        super().stopTest(test)
        self.tracer.test = None

    def addError(self, test, err):
        # A fixture that raised is reported with no startTest: what it touched
        # is still waiting in `between`.
        if type(test).__name__ == "_ErrorHolder":
            self.tracer.touched[test.description] |= self.tracer.between
            if self.tracer.spawned_between:
                self.tracer.spawned.add(test.description)
        super().addError(test, err)


WHY = {
    "rebuilt": "read {paths}, which the rebuild rewrites",
    "unseen": "started a process, and what it read cannot be seen from here",
    "code": "read nothing the rebuild writes",
}


def build_parser() -> argparse.ArgumentParser:
    # The defaults are the gate's own `-s scripts -p 'test_*.py'`, so what this
    # lets past is exactly what the gate after the rebuild runs again.
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("-s", "--start", type=pathlib.Path, default=HERE,
                        help="directory to discover tests in (default: scripts/)")
    parser.add_argument("-p", "--pattern", default="test_*.py")
    parser.add_argument("-v", "--verbose", action="store_true")
    parser.add_argument("--report", type=pathlib.Path,
                        help="write each failure and its verdict here as JSON")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    start = args.start.resolve()
    repo = start.parent
    tracer = Tracer(repo)
    TracingResult.tracer = tracer
    sys.addaudithook(tracer)  # cannot be removed; `active` turns it off
    tracer.watch_stats()
    tracer.active = True
    try:
        suite = unittest.TestLoader().discover(str(start), pattern=args.pattern)
        # Everything imported so far is credited through `loaded`, to the
        # modules that read it. Left in `between`, it would all land on
        # whichever class happens to run first.
        tracer.between, tracer.spawned_between = set(), False
        runner = unittest.TextTestRunner(verbosity=2 if args.verbose else 1,
                                         resultclass=TracingResult,
                                         warnings=None if sys.warnoptions else "default")
        result = runner.run(suite)
    finally:
        tracer.active = False
        tracer.unwatch_stats()

    failed = ([(test, "FAIL") for test, _ in result.failures]
              + [(test, "ERROR") for test, _ in result.errors]
              + [(test, "UNEXPECTED SUCCESS") for test in result.unexpectedSuccesses])
    verdicts = []
    for test, kind in failed:
        verdict, paths = tracer.verdict(test, repo)
        verdicts.append({"test": str(test.id()), "kind": kind,
                         "verdict": verdict, "read": paths[:3]})
    stop = [v for v in verdicts if v["verdict"] == "code"]
    code = 1 if result.testsRun == 0 or stop else 0

    if args.report:
        args.report.write_text(json.dumps({"ran": result.testsRun, "exit": code,
                                           "failures": verdicts}, indent=1),
                               encoding="utf-8")
    if result.testsRun == 0:
        print("tests_before_rebuild: no tests were collected, which is not a pass",
              file=sys.stderr)
        return 1
    if not verdicts:
        return 0

    print(f"\n── before the rebuild: {len(verdicts)} failure(s)")
    for v in verdicts:
        label = "stops the build" if v["verdict"] == "code" else "left to the gate"
        print(f"   {label:<16}  {v['test']}")
        print(f"   {'':<16}  {WHY[v['verdict']].format(paths=', '.join(v['read']))}")
    names = ", ".join(v["test"] for v in (stop or verdicts))
    if stop:
        print(f"::error title=The code fails its own tests::{len(stop)} failure(s) "
              f"read nothing the rebuild writes, so rebuilding cannot change them: {names}")
        return 1
    print(f"::warning title=Left to the gate after the rebuild::{len(verdicts)} test(s) "
          f"failed where the rebuild can change the answer: {names}. "
          "'Test what is about to be published' runs them again over the rebuilt tree.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
