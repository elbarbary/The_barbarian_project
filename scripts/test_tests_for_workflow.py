#!/usr/bin/env python3
"""The gate that decides which tests gate a publish.

Narrowing a publish gate is only safe if the narrowing is itself checked. The
two ways it goes wrong are opposite: it selects too little and the job
publishes behind a gate that is not there, or it drifts from what the job runs
and stops guarding a script somebody added.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import pathlib
import re
import tempfile
import unittest

import tests_for_workflow as selector

REPO = pathlib.Path(__file__).resolve().parent.parent
WORKFLOWS = REPO / ".github" / "workflows"
PRICES = WORKFLOWS / "publish-prices.yml"


class WhatTheWorkflowRuns(unittest.TestCase):
    def test_it_reads_the_scripts_out_of_the_workflow(self):
        found = selector.scripts_run(PRICES)
        self.assertIn("build_market_api", found)
        self.assertIn("build_fixtures", found)
        self.assertIn("egx_scan", found, "the node scan is a script this job runs")

    def test_a_workflow_that_runs_nothing_selects_nothing(self):
        with tempfile.TemporaryDirectory() as folder:
            empty = pathlib.Path(folder) / "empty.yml"
            empty.write_text("on: push\njobs: {}\n", encoding="utf-8")
            self.assertEqual(selector.scripts_run(empty), set())


class WhatIsSelected(unittest.TestCase):
    def setUp(self):
        self.chosen = set(selector.guards(PRICES))

    def test_the_quote_guards_are_in(self):
        for module in ("test_quotes_only", "test_market_api", "test_market_scan_shape"):
            self.assertIn(module, self.chosen)

    def test_the_workflow_s_own_guard_is_in(self):
        # test_prices_workflow reads this very file; it imports none of the
        # scripts, so it is selected by naming the workflow instead.
        self.assertIn("test_prices_workflow", self.chosen)

    def test_nothing_left_out_touches_what_this_job_writes(self):
        # The whole claim of the narrowing, checked rather than asserted.
        here = pathlib.Path(__file__).resolve().parent
        runs = selector.scripts_run(PRICES)
        stranded = []
        for test in sorted(here.glob("test_*.py")):
            if test.stem in self.chosen:
                continue
            imports = set(re.findall(r"^\s*(?:import|from)\s+([a-z_0-9]+)",
                                     test.read_text(encoding="utf-8"), re.M))
            if imports & runs:
                stranded.append(test.stem)
        self.assertEqual(stranded, [], "these guard the price path and the gate "
                         "no longer runs them")

    def test_the_crossings_test_is_not_in_the_price_gate(self):
        # The reason this exists. It compares two documents this job cannot
        # write, and it stopped four publishes in two trading days.
        self.assertNotIn("test_connections", self.chosen)


class ItFailsClosed(unittest.TestCase):
    def test_too_few_modules_is_an_error_not_a_short_list(self):
        with tempfile.TemporaryDirectory() as folder:
            empty = pathlib.Path(folder) / "empty.yml"
            empty.write_text("on: push\n", encoding="utf-8")
            self.assertEqual(selector.main([str(empty)]), 1)

    def test_a_real_workflow_clears_the_floor(self):
        self.assertEqual(selector.main([str(PRICES)]), 0)
        self.assertGreaterEqual(len(selector.guards(PRICES)), selector.FLOOR)


if __name__ == "__main__":
    unittest.main()
