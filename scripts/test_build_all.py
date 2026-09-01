#!/usr/bin/env python3
"""The build's own wiring: a step list that describes the scripts it names."""

from __future__ import annotations

import pathlib
import re
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_all

HERE = pathlib.Path(__file__).resolve().parent


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


if __name__ == "__main__":
    unittest.main()
