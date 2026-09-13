#!/usr/bin/env python3
"""The harvest that feeds the staleness guard, and the one thing that stops it.

`harvest_local.sh` runs on a Mac that has usually just woken up, and it is the
only thing that tells the daily build the filing archive is current. From
08:00 UTC the guard it feeds stops the build outright, so a harvest that gives
up on its first network call costs a whole session's published data — which is
what nearly happened on Sunday 13 September 2026.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import pathlib
import re
import subprocess
import unittest

REPO = pathlib.Path(__file__).resolve().parent.parent
SCRIPT = REPO / "scripts" / "harvest_local.sh"


class HarvestLocal(unittest.TestCase):
    def setUp(self):
        self.source = SCRIPT.read_text(encoding="utf-8")

    def test_the_script_parses(self):
        done = subprocess.run(["bash", "-n", str(SCRIPT)],
                              capture_output=True, text=True)
        self.assertEqual(done.returncode, 0, done.stderr)

    def test_the_first_network_call_is_retried(self):
        """A lid opens, launchd fires, and Wi-Fi is not up yet.

        On 13 Sep 2026 the 09:00 run reached `git fetch` before the network
        did, failed with "Could not resolve host: github.com", and exited
        having harvested nothing. The next slot was two hours later; the guard
        turns strict at 08:00 UTC, an hour before it.
        """
        # The COMMAND, not a mention of it: the comment above the retry says
        # the words "git fetch" and a search for those found the comment.
        fetch = re.search(r"^(?!\s*#).*git fetch.*$", self.source, re.M)
        self.assertIsNotNone(fetch, "the script no longer fetches at all")
        window = self.source[max(0, fetch.start() - 800): fetch.end() + 400]
        self.assertRegex(window, r"for attempt in", "the fetch is not retried")
        self.assertRegex(window, r"sleep \d+", "the retry does not wait between tries")

    def test_it_still_fails_loudly_when_the_network_never_comes_up(self):
        """Retrying is not the same as pretending. A harvest that never ran
        must not look like one that ran and found nothing — that distinction
        is the whole reason the guard can tell a quiet day from a refused one.
        """
        self.assertIn("!! fetch failed", self.source)
        self.assertRegex(self.source, r'!! fetch failed[^\n]*"; exit 1')

    def test_the_installed_copy_is_the_one_in_the_repository(self):
        """The agent runs a copy outside ~/Documents, because macOS refuses to
        launch anything inside it. A fix committed here and not installed there
        changes nothing at all.
        """
        installed = (pathlib.Path.home() / "Library" / "Application Support"
                     / "esthmr" / "harvest_local.sh")
        if not installed.exists():
            self.skipTest("no installed copy on this machine")
        self.assertEqual(installed.read_text(encoding="utf-8"), self.source,
                         "the installed harvest differs from the one in the "
                         "repository — reinstall it")


if __name__ == "__main__":
    unittest.main()
