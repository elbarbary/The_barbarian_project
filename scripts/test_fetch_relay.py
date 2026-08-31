#!/usr/bin/env python3
"""What goes through the relay, and — the part that broke — what does not.

`macro_sources` fetches Suez traffic from ArcGIS, indicators from the World
Bank and oil from Investing through one helper. Pointing all of them at a relay
that serves three hosts turned one source's 403 into every other source's 400,
and Suez disappeared off the Exchange screen while the build went green.
"""

from __future__ import annotations

import pathlib
import sys
import unittest
import unittest.mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import fetch_relay  # noqa: E402

CONFIGURED = {"ESTHMR_RELAY_URL": "https://relay.example/", "ESTHMR_RELAY_TOKEN": "t"}


class RoutingTest(unittest.TestCase):
    def test_only_the_blocked_hosts_are_relayed(self):
        with unittest.mock.patch.dict("os.environ", CONFIGURED):
            wrapped = fetch_relay.request("https://api.investing.com/api/x")
            self.assertTrue(wrapped.full_url.startswith("https://relay.example/?u="))
            self.assertEqual(wrapped.headers["Authorization"], "Bearer t")

    def test_every_other_source_goes_straight_out(self):
        # The regression: these are fetched by the same helper as oil, and a
        # relay that refuses them takes them off the screen.
        for url in (
            "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/x",
            "https://api.worldbank.org/v2/country/EGY/indicator/x",
            "https://api.gdeltproject.org/api/v2/doc/doc",
            "https://quotes.thebarbarianproject.com/quotes.json",
        ):
            with unittest.mock.patch.dict("os.environ", CONFIGURED):
                direct = fetch_relay.request(url, {"Accept": "*/*"})
            self.assertEqual(direct.full_url, url, url)
            self.assertNotIn("Authorization", direct.headers)

    def test_with_no_relay_configured_nothing_is_wrapped(self):
        with unittest.mock.patch.dict("os.environ", {"ESTHMR_RELAY_URL": "",
                                                     "ESTHMR_RELAY_TOKEN": ""}):
            direct = fetch_relay.request("https://api.investing.com/api/x")
        self.assertEqual(direct.full_url, "https://api.investing.com/api/x")

    def test_the_caller_names_itself(self):
        # Cloudflare's workers.dev protection refuses `Python-urllib` with a
        # 1010, which looks exactly like the upstream block being routed around.
        with unittest.mock.patch.dict("os.environ", CONFIGURED):
            wrapped = fetch_relay.request("https://api.investing.com/api/x")
        self.assertEqual(wrapped.headers["User-agent"], fetch_relay.CALLER)
        self.assertNotIn("urllib", fetch_relay.CALLER.lower())


class AllowlistTest(unittest.TestCase):
    def test_it_matches_the_worker_that_enforces_it(self):
        # Two lists, one meaning. They drift silently: the Python side sending
        # a host the Worker refuses is a 400 that looks like an outage.
        worker = (pathlib.Path(__file__).resolve().parent.parent
                  / "worker" / "fetchrelay" / "src" / "index.js").read_text(encoding="utf-8")
        line = next(l for l in worker.splitlines() if "const HOSTS" in l)
        declared = set(part.strip().strip("'\"") for part in
                       line[line.index("[") + 1:line.index("]")].split(","))
        self.assertEqual(declared, set(fetch_relay.HOSTS))


if __name__ == "__main__":
    unittest.main()
