#!/usr/bin/env python3
"""The run before the rebuild, and the gate after it, held to what they promise.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'

`tests_before_rebuild.py` lets a failure past the step before the rebuild when
the failing test read a document the rebuild rewrites. Loosening a gate is only
safe if the loosening is checked from both sides: it must not let the code's
own failures through, and what it lets through must meet a strict gate before
anything is committed. So these run the real runner as a process over scratch
suites whose failures are known, then run the workflow's own steps, extracted
from the YAML, in a real repository with a real origin, through to the push.
"""

from __future__ import annotations

import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
import unittest

import tests_before_rebuild as runner

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent
WORKFLOW = REPO / ".github" / "workflows" / "publish-app-data.yml"
RUNNER = HERE / "tests_before_rebuild.py"


def write_tree(root: pathlib.Path, files: dict[str, str]) -> None:
    for rel, body in files.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(body).lstrip("\n"), encoding="utf-8")


def run_runner(root: pathlib.Path, *prelude: str) -> tuple[int, str, dict]:
    """The real runner, over `root/scripts`, as its own process.

    `prelude` is Python run before `main()`, for the tests that break the
    runner on purpose to see which way it falls.
    """
    report = root / "verdicts.json"
    args = ["-s", str(root / "scripts"), "--report", str(report)]
    code = ("import sys; sys.path.insert(0, sys.argv[1]); import tests_before_rebuild as t\n"
            + "\n".join(prelude) + "\nraise SystemExit(t.main(sys.argv[2:]))")
    done = subprocess.run([sys.executable, "-c", code, str(HERE), *args], cwd=root,
                          capture_output=True, text=True, timeout=300,
                          env={**os.environ, "STORES": ""})
    verdicts = json.loads(report.read_text()) if report.exists() else {}
    return done.returncode, done.stdout + done.stderr, verdicts


# A market the price job has moved on, and a table from before it did: the
# shape of 34966943749.
MARKET = '{"stocks": {"AAA": {}, "BBB": {}, "CCC": {}}}'
STALE_TABLE = '{"rows": [{"ticker": "AAA"}, {"ticker": "BBB"}]}'

CORPUS = {
    "public/data/v1/market.json": MARKET,
    "public/data/v1/measures.json": STALE_TABLE,
    "public/data/v1/broken.json": "{ this is not json",
    "data-source/archive/AAA.json": "[]",
    "scripts/names_store.json": '{"AAA": "one"}',
    "scripts/fixtures/sample.json": '{"expected": 2}',
    "scripts/common.py": """
        import json, pathlib
        REPO = pathlib.Path(__file__).resolve().parent.parent
        def load(rel):
            return json.loads((REPO / rel).read_text(encoding="utf-8"))
        """,
    # A module that reads a store as it loads, like the builders that load
    # their name maps at import.
    "scripts/names.py": """
        import json, pathlib
        NAMES = json.loads((pathlib.Path(__file__).resolve().parent
                            / "names_store.json").read_text(encoding="utf-8"))
        """,
    "scripts/arithmetic.py": """
        def add(a, b):
            return a + b + 1
        """,
    "scripts/test_a_document.py": """
        import unittest
        from common import load
        class Cardinality(unittest.TestCase):
            def test_the_table_holds_every_listed_company(self):
                rows = {r["ticker"] for r in load("public/data/v1/measures.json")["rows"]}
                self.assertEqual(rows, set(load("public/data/v1/market.json")["stocks"]))
        """,
    # Sorted first, so it is the class that runs right after discovery: what
    # the other modules read as they were imported must not land on it.
    "scripts/test_0_code.py": """
        import unittest
        from arithmetic import add
        class Arithmetic(unittest.TestCase):
            def test_one_and_one(self):
                self.assertEqual(add(1, 1), 2)
        """,
    "scripts/test_c_hand_written_fixture.py": """
        import unittest
        from common import load
        class Fixture(unittest.TestCase):
            def test_the_sample_expects_three(self):
                self.assertEqual(load("scripts/fixtures/sample.json")["expected"], 3)
        """,
    "scripts/test_d_first_import.py": """
        import unittest
        import names
        class FirstImport(unittest.TestCase):
            def test_the_names_loaded(self):
                self.assertIsInstance(names.NAMES, dict)
        """,
    # By now `names` is cached: importing it reads nothing.
    "scripts/test_e_cached_import.py": """
        import unittest
        from names import NAMES
        class CachedImport(unittest.TestCase):
            def test_every_listed_company_has_a_name(self):
                self.assertIn("BBB", NAMES)
        """,
    "scripts/test_f_class_fixture.py": """
        import unittest
        from common import load
        class ClassFixture(unittest.TestCase):
            @classmethod
            def setUpClass(cls):
                cls.table = load("public/data/v1/measures.json")
            def test_three_rows(self):
                self.assertEqual(len(self.table["rows"]), 3)
        """,
    "scripts/test_g_fixture_raises.py": """
        import unittest
        from common import load
        class Raises(unittest.TestCase):
            @classmethod
            def setUpClass(cls):
                cls.doc = load("public/data/v1/broken.json")
            def test_never_reached(self):
                pass
        """,
    "scripts/test_h_import_raises.py": """
        import unittest
        from common import load
        DOC = load("public/data/v1/broken.json")
        class NeverCollected(unittest.TestCase):
            def test_never_reached(self):
                pass
        """,
    "scripts/test_i_only_asks_if_it_exists.py": """
        import pathlib, unittest
        REPO = pathlib.Path(__file__).resolve().parent.parent
        class Exists(unittest.TestCase):
            def test_the_fixture_mirror_is_there(self):
                self.assertTrue((REPO / "app/assets/fixtures/measures.json").exists())
        """,
    # A bare scandir, which is what glob, walk and iterdir are built on and
    # which stats nothing: the listing alone has to be noticed.
    "scripts/test_j_lists_a_folder.py": """
        import os, pathlib, unittest
        REPO = pathlib.Path(__file__).resolve().parent.parent
        class Listing(unittest.TestCase):
            def test_every_listed_company_has_an_archive(self):
                with os.scandir(REPO / "data-source/archive") as entries:
                    held = sorted(e.name[:-5] for e in entries if e.name.endswith(".json"))
                self.assertEqual(held, ["AAA", "BBB", "CCC"])
        """,
    "scripts/test_k_subtests.py": """
        import unittest
        from common import load
        class PerCompany(unittest.TestCase):
            def test_each_listed_company_has_a_row(self):
                rows = {r["ticker"] for r in load("public/data/v1/measures.json")["rows"]}
                for ticker in load("public/data/v1/market.json")["stocks"]:
                    with self.subTest(ticker=ticker):
                        self.assertIn(ticker, rows)
        """,
    "scripts/test_l_starts_a_process.py": """
        import subprocess, sys, unittest
        class Child(unittest.TestCase):
            def test_the_child_succeeds(self):
                done = subprocess.run([sys.executable, "-c", "raise SystemExit(3)"])
                self.assertEqual(done.returncode, 0)
        """,
    # Watching `os.stat` must not change what the tests themselves get.
    "scripts/test_n_leaves_the_stdlib_alone.py": """
        import shutil, unittest
        class Stdlib(unittest.TestCase):
            def test_shutil_keeps_its_fd_based_rmtree(self):
                self.assertEqual(shutil._use_fd_functions, EXPECTED)
        """,
    "scripts/test_m_green_and_skipped.py": """
        import unittest
        class Fine(unittest.TestCase):
            def test_fine(self):
                self.assertTrue(True)
            def test_skipped(self):
                self.skipTest("not on this machine")
        """,
}


class WhatEachFailureIsCalled(unittest.TestCase):
    """One suite, every way a test reaches a document, one verdict each."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        root = pathlib.Path(cls.tmp.name)
        write_tree(root, CORPUS)
        stdlib = root / "scripts" / "test_n_leaves_the_stdlib_alone.py"
        stdlib.write_text(stdlib.read_text().replace(
            "EXPECTED", repr(shutil._use_fd_functions)), encoding="utf-8")
        cls.code, cls.out, cls.report = run_runner(root)
        cls.verdicts = {v["test"]: v for v in cls.report.get("failures", [])}

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def called(self, test_id: str) -> dict:
        found = [v for name, v in self.verdicts.items() if name.startswith(test_id)]
        self.assertTrue(found, f"{test_id} did not fail. Report: {self.report}\n{self.out}")
        return found[0]

    def test_a_stale_document_is_left_to_the_gate(self):
        v = self.called("test_a_document.Cardinality.test_the_table_holds_every_listed_company")
        self.assertEqual(v["verdict"], "rebuilt")
        self.assertIn("public/data/v1/measures.json", v["read"])

    def test_a_failure_in_the_code_stops_the_build(self):
        self.assertEqual(self.called("test_0_code.Arithmetic.test_one_and_one")["verdict"], "code")
        self.assertEqual(self.code, 1, self.out)

    def test_a_hand_written_test_fixture_is_code_not_a_document(self):
        # scripts/fixtures/ is written by a person, not by build_all.
        v = self.called("test_c_hand_written_fixture.Fixture.test_the_sample_expects_three")
        self.assertEqual(v["verdict"], "code")

    def test_a_store_read_when_a_module_loaded_counts_for_a_later_import(self):
        # test_e imports `names` after test_d did: the import is a dictionary
        # lookup and touches nothing, but the test is about that store.
        v = self.called("test_e_cached_import.CachedImport.test_every_listed_company_has_a_name")
        self.assertEqual(v["verdict"], "rebuilt")
        self.assertIn("scripts/names_store.json", v["read"])

    def test_what_a_class_fixture_read_counts_for_its_tests(self):
        v = self.called("test_f_class_fixture.ClassFixture.test_three_rows")
        self.assertEqual(v["verdict"], "rebuilt")

    def test_a_class_fixture_that_raised_over_a_document(self):
        v = self.called("setUpClass (test_g_fixture_raises.Raises)")
        self.assertEqual(v["verdict"], "rebuilt")
        self.assertIn("public/data/v1/broken.json", v["read"])

    def test_an_import_that_raised_over_a_document(self):
        v = self.called("unittest.loader._FailedTest.test_h_import_raises")
        self.assertEqual(v["verdict"], "rebuilt")
        self.assertIn("public/data/v1/broken.json", v["read"])

    def test_asking_whether_a_document_exists_is_about_the_document(self):
        v = self.called("test_i_only_asks_if_it_exists.Exists.test_the_fixture_mirror_is_there")
        self.assertEqual(v["verdict"], "rebuilt")

    def test_listing_the_archive_is_about_the_archive(self):
        v = self.called("test_j_lists_a_folder.Listing.test_every_listed_company_has_an_archive")
        self.assertEqual(v["verdict"], "rebuilt")

    def test_a_subtest_answers_for_its_parent(self):
        v = self.called("test_k_subtests.PerCompany.test_each_listed_company_has_a_row")
        self.assertEqual(v["verdict"], "rebuilt")

    def test_a_child_process_is_not_guessed_to_be_code(self):
        v = self.called("test_l_starts_a_process.Child.test_the_child_succeeds")
        self.assertEqual(v["verdict"], "unseen")

    def test_a_skip_is_not_a_failure(self):
        self.assertFalse([name for name in self.verdicts if "test_m_green" in name])

    def test_the_tests_get_the_standard_library_they_would_get_anyway(self):
        self.assertFalse([name for name in self.verdicts if "test_n_leaves" in name], self.out)

    def test_it_runs_what_discover_runs_and_prints_what_it_prints(self):
        root = pathlib.Path(self.tmp.name)
        plain = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", "scripts",
                                "-p", "test_*.py"], cwd=root, capture_output=True, text=True,
                               timeout=300, env={**os.environ, "STORES": ""})
        ran = re.search(r"^Ran (\d+) tests? in", plain.stderr, re.M)
        self.assertIsNotNone(ran, plain.stderr)
        self.assertEqual(self.report["ran"], int(ran.group(1)))
        self.assertRegex(self.out, rf"(?m)^Ran {ran.group(1)} tests? in")
        failing = lambda text: sorted(set(re.findall(r"^(?:FAIL|ERROR): .*$", text, re.M)))
        self.assertEqual(failing(self.out), failing(plain.stderr))


class WhenItStops(unittest.TestCase):
    """The exit code, which is all the workflow reads."""

    def run_suite(self, files: dict[str, str], *prelude: str):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = pathlib.Path(tmp.name)
        write_tree(root, {k: v for k, v in CORPUS.items() if not k.startswith("scripts/test_")})
        write_tree(root, files)
        return run_runner(root, *prelude)

    def test_documents_alone_do_not_stop_the_build(self):
        code, out, report = self.run_suite({k: CORPUS[k] for k in (
            "scripts/test_a_document.py", "scripts/test_f_class_fixture.py",
            "scripts/test_m_green_and_skipped.py")})
        self.assertEqual(code, 0, out)
        self.assertEqual(len(report["failures"]), 2)
        self.assertIn("::warning title=Left to the gate after the rebuild::", out)

    def test_one_code_failure_among_documents_stops_it_and_is_named(self):
        code, out, _ = self.run_suite({k: CORPUS[k] for k in (
            "scripts/test_a_document.py", "scripts/test_0_code.py")})
        self.assertEqual(code, 1, out)
        error = next(line for line in out.splitlines() if line.startswith("::error"))
        self.assertIn("test_0_code.Arithmetic.test_one_and_one", error)
        self.assertNotIn("test_a_document", error)

    def test_a_green_suite_passes_quietly(self):
        code, out, report = self.run_suite(
            {"scripts/test_m_green_and_skipped.py": CORPUS["scripts/test_m_green_and_skipped.py"]})
        self.assertEqual((code, report["failures"]), (0, []), out)
        self.assertNotIn("::warning", out)

    def test_no_tests_is_not_a_pass(self):
        code, out, _ = self.run_suite({})
        self.assertEqual(code, 1, out)

    def test_a_hook_that_notes_nothing_stops_on_everything(self):
        # Fail closed: with the watching broken, a document failure has no
        # evidence of being one, and is treated as the code's.
        code, out, report = self.run_suite(
            {"scripts/test_a_document.py": CORPUS["scripts/test_a_document.py"]},
            "t.READS = frozenset(); t.SPAWNS = frozenset()",
            "t.Tracer.watch_stats = lambda self: None")
        self.assertEqual(code, 1, out)
        self.assertEqual([v["verdict"] for v in report["failures"]], ["code"])


def steps(text: str) -> list[tuple[str, str]]:
    """(name, run script) for every named step, in workflow order."""
    found = []
    for block in re.split(r"\n      - ", text)[1:]:
        name = re.match(r"name:\s*(.+)", block)
        run = re.search(r"\n        run:[ \t]*(\|[^\n]*\n((?:[ \t]*\n| {10}[^\n]*\n)*)|[^\n|][^\n]*)",
                        block + "\n")
        if name and run:
            body = (textwrap.dedent(run.group(2)) if run.group(1).startswith("|")
                    else run.group(1))
            found.append((name.group(1).strip(), body))
    return found


def commands(text: str) -> str:
    return "\n".join(l for l in text.splitlines() if not l.lstrip().startswith("#"))


class WhereTheGatesStand(unittest.TestCase):
    """The daily build's order, which is the whole fix."""

    @classmethod
    def setUpClass(cls):
        cls.text = WORKFLOW.read_text(encoding="utf-8")
        cls.steps = steps(cls.text)
        cls.names = [name for name, _ in cls.steps]
        cls.script = dict(cls.steps)

    def at(self, name: str) -> int:
        self.assertIn(name, self.names)
        return self.names.index(name)

    def step_block(self, name: str) -> str:
        block = self.text[self.text.index(f"- name: {name}\n"):]
        return commands(block[:block.find("\n      - ", 1)])

    def test_the_parsers_run_through_the_runner_before_the_rebuild(self):
        self.assertEqual(self.script["Test the parsers"].strip(),
                         "python3 scripts/tests_before_rebuild.py -v")
        self.assertLess(self.at("Test the parsers"), self.at("Validate before writing anything"))
        self.assertLess(self.at("Test the parsers"), self.at("Rebuild published data"))

    def test_the_folds_still_run_before_the_parsers(self):
        for fold in ("Fold the directory's ratios before testing them",
                     "Rebuild the measures table before testing it"):
            self.assertLess(self.at(fold), self.at("Test the parsers"))

    def test_every_test_runs_again_after_the_rebuild_and_before_anything_is_staged(self):
        gate = self.at("Test what is about to be published")
        self.assertEqual(self.script["Test what is about to be published"].strip(),
                         "python3 -m unittest discover -s scripts -p 'test_*.py' -v")
        self.assertGreater(gate, self.at("Rebuild published data"))
        self.assertLess(gate, self.at("Show what changed"))
        self.assertLess(gate, self.at("Commit"))

    def test_the_gate_cannot_be_waved_through(self):
        for name in ("Test what is about to be published", "Test the website against it"):
            block = self.step_block(name)
            self.assertNotIn("continue-on-error", block, name)
            self.assertNotIn("if:", block, name)
            self.assertNotIn("|| true", block, name)

    def test_both_runs_cover_the_same_suite(self):
        # What the runner lets past has to be what the gate runs again: the
        # runner is called with no narrowing, and its defaults are the gate's.
        gate = self.script["Test what is about to be published"]
        start = re.search(r"\s-s\s+(\S+)", gate).group(1)
        pattern = re.search(r"\s-p\s+'([^']+)'", gate).group(1)
        self.assertNotRegex(self.script["Test the parsers"], r"\s(-s|-p|--start|--pattern)\b")
        defaults = runner.build_parser()
        self.assertEqual(pathlib.Path(defaults.get_default("start")).relative_to(REPO).as_posix(),
                         start)
        self.assertEqual(defaults.get_default("pattern"), pattern)

    def test_the_website_is_tested_after_the_rebuild_and_not_before(self):
        runs = [name for name, body in self.steps if "node --test site-worker/test/" in body]
        self.assertEqual(runs, ["Test the website against it"])
        self.assertGreater(self.at("Test the website against it"), self.at("Rebuild published data"))
        self.assertLess(self.at("Test the website against it"), self.at("Show what changed"))

    def test_everything_the_job_commits_counts_as_rebuilt(self):
        stores = re.search(r"STORES: >-\n((?:\s{4}\S+\n)+)", self.text)
        self.assertIsNotNone(stores, "the workflow no longer lists its stores")
        staged = re.search(r"git add -A ([^\n]+)", self.script["Show what changed"])
        self.assertIsNotNone(staged)
        paths = stores.group(1).split() + [p for p in staged.group(1).split() if "$" not in p]
        self.assertGreater(len(paths), 10)
        outside = [p for p in paths if not runner.rebuilt(p)]
        self.assertEqual(outside, [], "the job commits these, and a test that reads "
                         "them would be told the rebuild cannot change them")


class TheNextRunRepairsIt(unittest.TestCase):
    """The workflow's own steps, in a real repository, pushing to a real origin.

    The price job lists a company; the table on main does not have it yet.
    Before, every daily run stopped at its first test step on that table and
    nothing but a hand commit could move it. Here the same steps, as the YAML
    writes them, run in order and stop at the first that fails, as a runner
    does.
    """

    JOB = ["Test the parsers", "Rebuild published data", "Test what is about to be published",
           "Show what changed", "Commit"]

    # A stand-in for build_all: rebuilds the table from the market it finds,
    # or leaves a company out when told to, like a builder with a bug.
    BUILD = """
        import json, pathlib, sys
        REPO = pathlib.Path(__file__).resolve().parent.parent
        (REPO / "rebuild-ran").write_text("yes")
        market = json.loads((REPO / "public/data/v1/market.json").read_text())
        tickers = sorted(market["stocks"])
        if (REPO / "scripts" / "builder_bug").exists():
            tickers = tickers[:-1]
        table = json.dumps({"rows": [{"ticker": t} for t in tickers]})
        for where in ("public/data/v1/measures.json", "app/assets/fixtures/measures.json"):
            (REPO / where).write_text(table)
        """

    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.tmp = pathlib.Path(tmp.name)
        self.origin = self.tmp / "origin.git"
        self.git("init", "-q", "--bare", "-b", "main", str(self.origin), cwd=self.tmp)
        seed = self.tmp / "seed"
        seed.mkdir()
        write_tree(seed, {
            "public/data/v1/market.json": MARKET,
            "public/data/v1/measures.json": STALE_TABLE,
            "app/assets/fixtures/measures.json": STALE_TABLE,
            "scripts/common.py": CORPUS["scripts/common.py"],
            "scripts/test_a_document.py": CORPUS["scripts/test_a_document.py"],
            "scripts/build_all.py": self.BUILD,
            ".gitignore": "__pycache__/\nrebuild-ran\n",
        })
        (seed / "scripts" / "tests_before_rebuild.py").write_bytes(RUNNER.read_bytes())
        self.seed = seed
        self.git("init", "-q", "-b", "main", cwd=seed)
        self.git("remote", "add", "origin", str(self.origin), cwd=seed)
        self.publish("data: session prices (a listing the table lacks)")
        # python3 inside the steps is this interpreter, as setup-python makes it.
        self.bin = self.tmp / "bin"
        self.bin.mkdir()
        (self.bin / "python3").symlink_to(sys.executable)

    def git(self, *args, cwd):
        env = {**os.environ, "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@example.com",
               "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@example.com"}
        return subprocess.run(("git",) + args, cwd=cwd, check=True, capture_output=True,
                              text=True, env=env)

    def publish(self, message: str, **files) -> None:
        write_tree(self.seed, files)
        self.git("add", "-A", cwd=self.seed)
        self.git("commit", "-q", "-m", message, cwd=self.seed)
        self.git("push", "-q", "origin", "main", cwd=self.seed)

    def checkout(self, name: str, **files) -> pathlib.Path:
        work = self.tmp / name
        self.git("clone", "-q", str(self.origin), str(work), cwd=self.tmp)
        write_tree(work, files)
        return work

    def job(self, work: pathlib.Path) -> tuple[str | None, str]:
        """Run the steps in order; return the step that failed (or None) and the log."""
        written = steps(WORKFLOW.read_text(encoding="utf-8"))
        found = dict(written)
        self.assertEqual([name for name, _ in written if name in self.JOB], self.JOB,
                         "the workflow's steps moved")
        output = self.tmp / f"{work.name}.output"
        log = []
        env = {**os.environ, "STORES": "", "GITHUB_OUTPUT": str(output),
               "PATH": f"{self.bin}{os.pathsep}{os.environ['PATH']}"}
        for name in self.JOB:
            done = subprocess.run(["bash", "-e", "-c", found[name]], cwd=work, env=env,
                                  capture_output=True, text=True, timeout=300)
            log.append(f"── {name} ({done.returncode})\n{done.stdout}{done.stderr}")
            if done.returncode != 0:
                return name, "\n".join(log)
        return None, "\n".join(log)

    def on_origin(self, rel: str) -> list[str]:
        shown = self.git("show", f"main:{rel}", cwd=self.origin).stdout
        return [row["ticker"] for row in json.loads(shown)["rows"]]

    def test_a_stale_table_on_main_is_rebuilt_and_pushed_by_the_next_run(self):
        work = self.checkout("run")
        # The deadlock being fixed: the step as it was fails on this checkout.
        before = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", "scripts",
                                 "-p", "test_*.py"], cwd=work, capture_output=True, text=True,
                                env={**os.environ, "STORES": ""})
        self.assertNotEqual(before.returncode, 0, "the checkout is not stale")

        stopped, log = self.job(work)
        self.assertIsNone(stopped, log)
        self.assertIn("left to the gate", log)
        self.assertEqual(self.on_origin("public/data/v1/measures.json"), ["AAA", "BBB", "CCC"])

        # And the run after that has nothing left to hand on.
        after = self.checkout("next")
        clean = subprocess.run([sys.executable, "scripts/tests_before_rebuild.py"], cwd=after,
                               capture_output=True, text=True, env={**os.environ, "STORES": ""})
        self.assertEqual(clean.returncode, 0, clean.stdout + clean.stderr)
        self.assertNotIn("left to the gate", clean.stdout + clean.stderr)

    def test_a_rebuild_that_writes_a_bad_table_is_stopped_before_the_commit(self):
        # Main agrees with itself, so the run before the rebuild has nothing
        # to find. That green is what 2b0685d38 went out through.
        whole = '{"rows": [{"ticker": "AAA"}, {"ticker": "BBB"}, {"ticker": "CCC"}]}'
        self.publish("data: rebuild published app data", **{
            "public/data/v1/measures.json": whole, "app/assets/fixtures/measures.json": whole})
        head = self.git("rev-parse", "main", cwd=self.origin).stdout
        work = self.checkout("run", **{"scripts/builder_bug": ""})
        stopped, log = self.job(work)
        self.assertEqual(stopped, "Test what is about to be published", log)
        self.assertNotIn("left to the gate", log.split("── Rebuild published data")[0])
        self.assertEqual(self.git("rev-parse", "main", cwd=self.origin).stdout, head)

    def test_a_failure_in_the_code_stops_before_the_rebuild_runs(self):
        head = self.git("rev-parse", "main", cwd=self.origin).stdout
        work = self.checkout("run", **{
            "scripts/arithmetic.py": CORPUS["scripts/arithmetic.py"],
            "scripts/test_0_code.py": CORPUS["scripts/test_0_code.py"]})
        stopped, log = self.job(work)
        self.assertEqual(stopped, "Test the parsers", log)
        self.assertFalse((work / "rebuild-ran").exists(), "the rebuild ran on broken code")
        self.assertEqual(self.git("rev-parse", "main", cwd=self.origin).stdout, head)


if __name__ == "__main__":
    unittest.main()
