#!/usr/bin/env python3
"""Every host the pipeline calls has to be named in the source catalogue.

A catalogue is only worth publishing if it cannot quietly fall out of date. This
walks `scripts/` for external hosts and fails when one is missing from
`docs/data-sources.md` — so adding a source without declaring it breaks the
build rather than shipping an undisclosed upstream.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import pathlib
import re
import unittest

REPO = pathlib.Path(__file__).resolve().parent.parent
SCRIPTS = REPO / "scripts"
CATALOGUE = REPO / "docs" / "data-sources.md"

# Hosts that are not upstream sources and so have nothing to declare.
NOT_A_SOURCE = {
    "127.0.0.1",          # the local history sink, used in development
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    "www.w3.org",         # SVG namespaces in generated markup
    "schema.org",
}

HOST = re.compile(r"https?://([a-zA-Z0-9._-]+)")


def hosts_in_scripts() -> set[str]:
    found: set[str] = set()
    for path in SCRIPTS.glob("*.py"):
        if path.name.startswith("test_"):
            continue
        for match in HOST.finditer(path.read_text(encoding="utf-8")):
            host = match.group(1).lower().rstrip(".")
            if host and host not in NOT_A_SOURCE:
                found.add(host)
    return found


class CatalogueTest(unittest.TestCase):
    def setUp(self):
        self.assertTrue(CATALOGUE.exists(), "the source catalogue is missing")
        self.text = CATALOGUE.read_text(encoding="utf-8").lower()

    def test_every_host_the_pipeline_calls_is_declared(self):
        missing = []
        for host in sorted(hosts_in_scripts()):
            # A catalogue entry may name the registrable domain rather than
            # every subdomain — `mubasher.info` covers `static.mubasher.info`.
            stem = ".".join(host.split(".")[-3:]) if host.count(".") > 2 else host
            bare = ".".join(host.split(".")[-2:])
            if host not in self.text and stem not in self.text and bare not in self.text:
                missing.append(host)
        self.assertEqual(
            missing, [],
            f"these are called but not declared in docs/data-sources.md: {missing}",
        )

    def test_the_catalogue_records_what_was_tried_and_failed(self):
        # A catalogue that lists only what works is marketing. These were tried,
        # did not work, and are named for it.
        for tried in ("al mal", "zawya", "gdelt"):
            self.assertIn(tried, self.text, f"{tried} is not accounted for")

    def test_it_says_when_it_was_last_reviewed(self):
        self.assertIn("last reviewed", self.text)


if __name__ == "__main__":
    unittest.main()
