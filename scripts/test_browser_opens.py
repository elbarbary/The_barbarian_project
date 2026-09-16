#!/usr/bin/env python3
"""A browser is claimed only once it has opened, and its packages move together.

publish-app-data.yml and publish-official-sources.yml both install Scrapling
for the steps that need a real browser. Until 16 Sep 2026 they installed it
unpinned and proved it by importing `scrapling.fetchers`. Playwright 1.63.0
reached PyPI at 16:49 UTC on 15 Sep, patchright kept asking for a Chromium
build nothing downloaded any more, and the import went on succeeding: every
exchange step failed and exited 0 in every run after it.
"""

from __future__ import annotations

import io
import pathlib
import re
import sys
import types
import unittest
from contextlib import redirect_stderr
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import browser_opens  # noqa: E402

WORKFLOWS = pathlib.Path(__file__).resolve().parent.parent / ".github" / "workflows"
USERS = ("publish-app-data.yml", "publish-official-sources.yml")


def install_step(name: str) -> str:
    text = (WORKFLOWS / name).read_text(encoding="utf-8")
    start = text.index("      - name: Install Scrapling")
    end = text.find("\n      - ", start + 1)
    return text[start:end if end > 0 else None]


class TheWorkflows(unittest.TestCase):
    def test_the_three_packages_are_pinned_in_one_install(self):
        for name in USERS:
            step = install_step(name)
            pins = re.findall(r'"(scrapling\[fetchers\]|patchright|playwright)==([\d.]+)"', step)
            self.assertEqual({p for p, _ in pins}, {"scrapling[fetchers]", "patchright", "playwright"}, name)
            self.assertNotRegex(step, r'pip install[^\n]*"scrapling\[(fetchers|all)\]"(?!==)', f"{name} installs Scrapling unpinned")

    def test_patchrights_own_chromium_is_installed(self):
        for name in USERS:
            self.assertIn("python3 -m patchright install --with-deps chromium", install_step(name), name)

    def test_the_interpreter_is_exported_only_after_a_browser_opened(self):
        for name in USERS:
            step = install_step(name)
            self.assertNotIn("from scrapling.fetchers import StealthyFetcher", step,
                             f"{name} proves a browser with an import again")
            branch = re.search(r"if python3 scripts/browser_opens\.py; then\n(.*?)\n\s*else\n(.*?)\n\s*fi", step, re.S)
            self.assertIsNotNone(branch, f"{name} does not run the launch check")
            self.assertIn("SCRAPLING_PYTHON=", branch.group(1), name)
            self.assertNotIn("SCRAPLING_PYTHON=", branch.group(2), name)
            self.assertIn("::warning", branch.group(2), f"{name} says nothing when no browser opens")
            self.assertEqual(step.count("SCRAPLING_PYTHON="), 1, name)


class TheCheck(unittest.TestCase):
    def test_no_patchright_is_no_browser(self):
        with mock.patch.dict(sys.modules, {"patchright": None, "patchright.sync_api": None}), \
                redirect_stderr(io.StringIO()) as said:
            self.assertEqual(browser_opens.main(), 1)
        self.assertIn("not installed", said.getvalue())

    def test_a_browser_that_will_not_start_is_reported_by_the_line_that_matters(self):
        long_failure = "Traceback (most recent call last):\n" + ("  frame\n" * 200) + \
            "BrowserType.launch_persistent_context: Executable doesn't exist at /home/runner/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome"

        class Driver:
            def __enter__(self):
                raise RuntimeError(long_failure)

            def __exit__(self, *exc):
                return False

        fake = types.ModuleType("patchright.sync_api")
        fake.sync_playwright = Driver
        with mock.patch.dict(sys.modules, {"patchright": types.ModuleType("patchright"), "patchright.sync_api": fake}), \
                redirect_stderr(io.StringIO()) as said:
            self.assertEqual(browser_opens.main(), 1)
        self.assertIn("Executable doesn't exist", said.getvalue())
        self.assertNotIn("Traceback", said.getvalue(), "the head of the failure hid its reason once already")

    def test_a_page_that_reads_back_wrong_is_not_a_browser(self):
        class Page:
            def set_content(self, html):
                pass

            def inner_text(self, selector):
                return ""

        class Context:
            def new_page(self):
                return Page()

            def close(self):
                pass

        class Chromium:
            def launch_persistent_context(self, *args, **kwargs):
                self.kwargs = kwargs
                return Context()

        class Driver:
            chromium = Chromium()

            def __enter__(self):
                return self

            def __exit__(self, *exc):
                return False

        fake = types.ModuleType("patchright.sync_api")
        fake.sync_playwright = Driver
        with mock.patch.dict(sys.modules, {"patchright": types.ModuleType("patchright"), "patchright.sync_api": fake}), \
                redirect_stderr(io.StringIO()):
            self.assertEqual(browser_opens.main(), 1)
        self.assertEqual(Driver.chromium.kwargs.get("channel"), "chromium",
                         "the check must launch the binary the fetcher launches, not the headless shell")


if __name__ == "__main__":
    unittest.main()
