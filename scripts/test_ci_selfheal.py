#!/usr/bin/env python3
"""The self-healer's refusals, which are the only reason it is safe to run.

Every test here fails if its guard is removed. That is the point of the file:
the healer is an automated hand inside a financial publication, and each of
these is one thing it must not be able to do.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import pathlib
import tempfile
import unittest

import ci_selfheal as heal


class PathPolicyTest(unittest.TestCase):
    def test_it_will_not_edit_a_test(self):
        # The one move that always makes a failing suite pass and is always
        # wrong. If this ever returns True the healer can delete its own judge.
        for rel in ("scripts/test_sources.py",
                    "site-worker/test/template.test.mjs",
                    "worker/quotes/test/quotes.test.mjs"):
            ok, why = heal.path_allowed(rel)
            self.assertFalse(ok, f"{rel} must be refused")
            self.assertIn("test", why)

    def test_it_will_not_edit_published_data(self):
        for rel in ("public/data/v1/market.json",
                    "app/assets/fixtures/manifest.json",
                    "data-source/fragility/em_panel/turkey_etf.json"):
            ok, _ = heal.path_allowed(rel)
            self.assertFalse(ok, f"{rel} must be refused")

    def test_it_will_not_edit_the_section_8_guards(self):
        ok, _ = heal.path_allowed("scripts/macro_types.py")
        self.assertFalse(ok)

    def test_it_will_not_edit_its_own_workflow(self):
        # Otherwise the first repair it proposes can be "remove my guardrails".
        ok, _ = heal.path_allowed(".github/workflows/self-repair.yml")
        self.assertFalse(ok)

    def test_it_will_not_escape_the_repository(self):
        for rel in ("../../.ssh/id_rsa", "/etc/passwd", "scripts/../../x"):
            ok, _ = heal.path_allowed(rel)
            self.assertFalse(ok, f"{rel} must be refused")

    def test_it_will_not_touch_paths_outside_the_allow_list(self):
        ok, _ = heal.path_allowed("README.md")
        self.assertFalse(ok)

    def test_it_may_edit_ordinary_code_and_docs(self):
        for rel in ("docs/data-sources.md", "scripts/build_sectors.py",
                    "public/esthmr/journal.css"):
            ok, why = heal.path_allowed(rel)
            self.assertTrue(ok, f"{rel} should be allowed, got {why}")


class GateTest(unittest.TestCase):
    def r(self, ok, ran):
        return heal.SuiteResult(ok=ok, ran=ran, output="")

    def test_a_red_suite_never_passes(self):
        passed, _ = heal.gate(self.r(False, 679), self.r(False, 679))
        self.assertFalse(passed)

    def test_green_with_the_same_count_passes(self):
        passed, why = heal.gate(self.r(False, 679), self.r(True, 679))
        self.assertTrue(passed, why)

    def test_green_with_more_tests_passes(self):
        passed, _ = heal.gate(self.r(False, 679), self.r(True, 681))
        self.assertTrue(passed)

    def test_green_by_running_fewer_tests_is_refused(self):
        # The subtle one, and the reason `ran` is compared at all. Deleting the
        # failing test turns the suite green; it does not fix anything.
        passed, why = heal.gate(self.r(False, 679), self.r(True, 678))
        self.assertFalse(passed)
        self.assertIn("quieter", why)


class ApplyEditsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        (self.root / "docs").mkdir()
        (self.root / "scripts").mkdir()
        self._real = heal.REPO
        heal.REPO = self.root
        self.addCleanup(self._restore)

    def _restore(self):
        heal.REPO = self._real
        self.tmp.cleanup()

    def write(self, rel, body):
        p = self.root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(body, encoding="utf-8")
        return p

    def test_a_unique_anchor_is_applied(self):
        p = self.write("docs/a.md", "alpha\nbeta\ngamma\n")
        written, refused = heal.apply_edits(
            [{"path": "docs/a.md", "find": "beta", "replace": "BETA"}])
        self.assertEqual(written, ["docs/a.md"])
        self.assertEqual(refused, [])
        self.assertEqual(p.read_text(encoding="utf-8"), "alpha\nBETA\ngamma\n")

    def test_an_ambiguous_anchor_changes_nothing(self):
        # Two matches means the model did not say which one, and guessing is
        # how an automated edit lands in the wrong place.
        p = self.write("docs/a.md", "x\nx\n")
        written, refused = heal.apply_edits(
            [{"path": "docs/a.md", "find": "x", "replace": "y"}])
        self.assertEqual(written, [])
        self.assertIn("appears 2 times", refused[0])
        self.assertEqual(p.read_text(encoding="utf-8"), "x\nx\n")

    def test_a_missing_anchor_changes_nothing(self):
        p = self.write("docs/a.md", "alpha\n")
        written, refused = heal.apply_edits(
            [{"path": "docs/a.md", "find": "nowhere", "replace": "z"}])
        self.assertEqual(written, [])
        self.assertIn("appears 0 times", refused[0])
        self.assertEqual(p.read_text(encoding="utf-8"), "alpha\n")

    def test_a_denied_path_is_not_written_even_with_a_good_anchor(self):
        p = self.write("scripts/test_sources.py", "assert True\n")
        written, refused = heal.apply_edits(
            [{"path": "scripts/test_sources.py", "find": "assert True",
              "replace": "assert False"}])
        self.assertEqual(written, [])
        self.assertTrue(refused)
        self.assertEqual(p.read_text(encoding="utf-8"), "assert True\n")

    def test_one_denied_edit_does_not_block_an_allowed_one(self):
        good = self.write("docs/a.md", "alpha\n")
        self.write("scripts/test_x.py", "pass\n")
        written, refused = heal.apply_edits([
            {"path": "scripts/test_x.py", "find": "pass", "replace": "raise"},
            {"path": "docs/a.md", "find": "alpha", "replace": "omega"},
        ])
        self.assertEqual(written, ["docs/a.md"])
        self.assertEqual(len(refused), 1)
        self.assertEqual(good.read_text(encoding="utf-8"), "omega\n")

    def test_a_flood_of_edits_is_refused_whole(self):
        self.write("docs/a.md", "alpha\n")
        edits = [{"path": "docs/a.md", "find": "alpha", "replace": "b"}] * (heal.MAX_EDITS + 1)
        written, refused = heal.apply_edits(edits)
        self.assertEqual(written, [])
        self.assertIn("more than", refused[0])

    def test_an_oversized_replacement_is_refused(self):
        self.write("docs/a.md", "alpha\n")
        written, refused = heal.apply_edits(
            [{"path": "docs/a.md", "find": "alpha", "replace": "x" * (heal.MAX_EDIT_BYTES + 1)}])
        self.assertEqual(written, [])
        self.assertIn("larger than", refused[0])

    def test_a_file_that_does_not_exist_is_refused_not_created(self):
        written, refused = heal.apply_edits(
            [{"path": "docs/new.md", "find": "a", "replace": "b"}])
        self.assertEqual(written, [])
        self.assertFalse((self.root / "docs/new.md").exists())


class FailureParsingTest(unittest.TestCase):
    def test_it_names_the_failing_tests(self):
        out = ("FAIL: test_every_host_the_pipeline_calls_is_declared "
               "(test_sources.CatalogueTest.test_every_host...)\n"
               "ERROR: test_other (test_thing.T.test_other)\n"
               "Ran 679 tests in 8.0s\nFAILED (failures=1)\n")
        self.assertEqual(
            heal.failing_tests(out),
            ["test_every_host_the_pipeline_calls_is_declared", "test_other"])


if __name__ == "__main__":
    unittest.main()


class WebsiteGateTest(unittest.TestCase):
    """A repair that fixes Python by breaking the website is not a repair.

    `public/esthmr/` and `site-worker/` are both writable by the healer, and
    the failure it diagnoses is always a Python one — so nothing but this stops
    an edit that trades one suite for the other.
    """

    def r(self, ok, ran=0):
        return heal.SuiteResult(ok=ok, ran=ran, output="")

    def test_a_broken_website_suite_refuses_the_edit(self):
        passed, why = heal.gate(self.r(False, 679), self.r(True, 679), self.r(False, 0))
        self.assertFalse(passed)
        self.assertIn("website", why)

    def test_a_green_website_suite_lets_it_through(self):
        passed, why = heal.gate(self.r(False, 679), self.r(True, 679), self.r(True, 120))
        self.assertTrue(passed, why)

    def test_node_missing_counts_as_unproved_not_as_permission(self):
        # run_node_suite reports ok=False when node cannot run at all. That has
        # to block, or a runner without node silently loses half the proof.
        passed, _ = heal.gate(self.r(False, 679), self.r(True, 679),
                              heal.SuiteResult(ok=False, ran=0, output="could not run node"))
        self.assertFalse(passed)


class ContextTest(unittest.TestCase):
    """What the model is shown decides whether its edit can even be legal.

    The first end-to-end run of the repair pass diagnosed the failure exactly
    right and then had its edit refused, because it was asked to change a file
    it had never been shown and invented an anchor for it. A guard compares the
    code against something — a catalogue, a schema, a fixture — and that
    something is where the repair belongs, so it has to travel with the
    traceback.
    """

    def test_it_follows_a_guard_to_what_the_guard_reads(self):
        refs = heal.referenced_paths(heal.SCRIPTS / "test_sources.py")
        self.assertIn("docs/data-sources.md", refs)

    def test_it_does_not_invent_files(self):
        refs = heal.referenced_paths(heal.SCRIPTS / "test_sources.py")
        for rel in refs:
            self.assertTrue((heal.REPO / rel).is_file(), f"{rel} does not exist")

    def test_a_traceback_names_its_own_files(self):
        out = ("FAIL: test_x (test_sources.CatalogueTest.test_x)\n"
               "Ran 1 test in 0.0s\nFAILED (failures=1)\n")
        ctx = heal.failure_context(heal.SuiteResult(ok=False, ran=1, output=out))
        self.assertIn("scripts/test_sources.py", ctx)
        self.assertIn("docs/data-sources.md", ctx)


class NodeCountTest(unittest.TestCase):
    def test_it_reads_both_shapes_of_node_summary(self):
        # Node writes "# pass 474" on some versions and "\u2139 pass 474" on
        # others. Missing the count reports zero passing website tests for a
        # green suite, which reads as "no coverage" rather than "474 passed".
        import re as _re
        pattern = _re.compile(r"^(?:#|\u2139)\s*pass (\d+)", _re.M)
        for text in ("# pass 474\n# fail 0\n", "\u2139 pass 474\n\u2139 fail 0\n"):
            m = pattern.search(text)
            self.assertIsNotNone(m, f"did not match {text!r}")
            self.assertEqual(m.group(1), "474")


class FailingModuleTest(unittest.TestCase):
    def test_the_module_comes_from_the_dotted_path_not_the_method_name(self):
        # `FAIL: test_x (test_sources.CatalogueTest.test_x)` — the module is
        # `test_sources`, and reading `test_x` instead sends the context
        # gatherer looking for scripts/test_x.py, which does not exist.
        out = "FAIL: test_x (test_sources.CatalogueTest.test_x)\n"
        self.assertEqual(heal.failing_modules(out), ["test_sources"])

    def test_a_line_without_a_dotted_path_still_yields_something(self):
        self.assertEqual(heal.failing_modules("ERROR: test_sources\n"), ["test_sources"])
