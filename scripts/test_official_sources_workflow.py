#!/usr/bin/env python3
"""The official-sources workflow, checked against the scripts it names.

`test_build_all` does this for `build_all.py`'s STEPS, and it found two real
bugs the moment it existed: a step declared as taking `--check` that did not,
which had been failing CI's validate job on every run, and a step that took one
and was declared as not, so the validate pass silently skipped it.

The same class of drift is available here, and worse: a workflow's script names
are strings inside a YAML `run:` block that nothing type-checks and nothing runs
until the schedule fires at half past five in the morning. Renaming a collector
would break the job silently for a day.

Parsed with a regex rather than a YAML library on purpose - the runner's Python
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
WORKFLOW = HERE.parent / ".github" / "workflows" / "publish-official-sources.yml"

# `python3 scripts/<name>.py <flags...>` inside a run: block.
INVOCATION = re.compile(
    r"^\s*python3\s+(scripts/[a-z0-9_]+\.py)((?:\s+--?[a-z0-9-]+)*)", re.M)


def invocations() -> list[tuple[str, list[str]]]:
    body = WORKFLOW.read_text(encoding="utf-8")
    out = []
    for script, flags in INVOCATION.findall(body):
        out.append((script, re.findall(r"--?[a-z0-9-]+", flags)))
    return out


class Workflow(unittest.TestCase):
    def setUp(self):
        if not WORKFLOW.exists():
            self.skipTest("the workflow is not in this tree")

    def test_it_names_scripts_that_exist(self):
        found = invocations()
        self.assertGreater(len(found), 4, "the parser found almost nothing")
        for script, _ in found:
            self.assertTrue((HERE.parent / script).exists(), script)

    def test_every_flag_it_passes_is_a_flag_that_script_accepts(self):
        """A workflow is the one caller nobody runs by hand before shipping."""
        wrong = []
        for script, flags in invocations():
            source = (HERE.parent / script).read_text(encoding="utf-8")
            for flag in flags:
                if not re.search(rf'add_argument\(\s*["\']{re.escape(flag)}["\']',
                                 source):
                    wrong.append(f"{script} is passed {flag} and does not take it")
        self.assertEqual(wrong, [])

    def test_the_collectors_run_before_the_ledgers_that_read_them(self):
        """build_source_health reads what the others write, so it goes last."""
        order = [script for script, _ in invocations()]
        health = "scripts/build_source_health.py"
        self.assertIn(health, order)
        for reader, written_by in (
            ("scripts/build_source_health.py", "scripts/harvest_fra.py"),
            ("scripts/build_source_health.py", "scripts/harvest_cbe.py"),
            ("scripts/build_source_health.py", "scripts/harvest_mcdr.py"),
            ("scripts/build_source_health.py", "scripts/execution_source.py"),
            ("scripts/build_official_completeness.py", "scripts/harvest_fra.py"),
        ):
            self.assertLess(order.index(written_by), order.index(reader),
                            f"{reader} runs before {written_by} writes its input")

    def test_the_browser_collector_does_not_hardcode_one_developers_path(self):
        """The bug `scrapling_python` exists to end, and this was the fifth.

        An absolute path into one home directory made `build_all --check` exit
        non-zero on a runner, which aborted the daily build before it wrote
        anything at all.
        """
        for script in HERE.glob("harvest_*.py"):
            source = script.read_text(encoding="utf-8")
            self.assertNotIn("/Users/barbary/Library/Application Support/pipx",
                             source, f"{script.name} hardcodes a local interpreter")

    def test_the_collectors_it_runs_are_importable(self):
        """A syntax error in a collector is a job that fails at 05:30."""
        for script, _ in invocations():
            result = subprocess.run(
                [sys.executable, "-c",
                 f"import ast,pathlib;ast.parse(pathlib.Path({str(HERE.parent / script)!r}).read_text())"],
                capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, f"{script}: {result.stderr[-300:]}")


if __name__ == "__main__":
    unittest.main()
