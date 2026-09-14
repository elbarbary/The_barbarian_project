#!/usr/bin/env python3
"""What goes through the relay, and — the part that broke — what does not.

`macro_sources` fetches Suez traffic from ArcGIS, indicators from the World
Bank and oil from Investing through one helper. Pointing all of them at a relay
that serves three hosts turned one source's 403 into every other source's 400,
and Suez disappeared off the Exchange screen while the build went green.
"""

from __future__ import annotations

import os
import pathlib
import sys
import unittest
import unittest.mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import fetch_relay  # noqa: E402
import fetch_relay as fr  # noqa: E402

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


class PostTest(unittest.TestCase):
    """The half the relay could not carry, and the half that needed it most.

    The exchange answers a GitHub runner by resetting the connection — every
    scheduled build logs "New filings: the host would not answer" — so the
    filing archive has been fed by one scheduled laptop and nothing else. The
    host was on the relay's allowlist from the day it was written; what was
    missing is that the filing search takes its date window in a body.
    """

    def setUp(self):
        self.env = {"ESTHMR_RELAY_URL": "https://barbarian-fetch.workers.dev/",
                    "ESTHMR_RELAY_TOKEN": "a-token"}
        self._saved = {k: os.environ.get(k) for k in self.env}
        os.environ.update(self.env)

    def tearDown(self):
        for key, was in self._saved.items():
            if was is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = was

    def test_a_body_makes_it_a_post_through_the_relay(self):
        req = fr.request("https://beta.egx.com.eg/api/bff/egx/news-search",
                         {"content-type": "application/json"},
                         data=b'{"dateFrom":"2026-09-01"}')
        self.assertEqual(req.get_method(), "POST")
        self.assertTrue(req.full_url.startswith("https://barbarian-fetch.workers.dev/?u="))
        self.assertEqual(req.data, b'{"dateFrom":"2026-09-01"}')

    def test_the_body_survives_a_direct_request_too(self):
        # Unset the relay and the same call goes straight out, unchanged —
        # which is what makes adding the relay transparent rather than a
        # change to every source at once.
        for key in self.env:
            os.environ.pop(key, None)
        req = fr.request("https://beta.egx.com.eg/api/bff/egx/news-search",
                         {"content-type": "application/json"}, data=b'{"a":1}')
        self.assertEqual(req.get_method(), "POST")
        self.assertEqual(req.full_url, "https://beta.egx.com.eg/api/bff/egx/news-search")
        self.assertEqual(req.data, b'{"a":1}')

    def test_no_body_is_still_a_get(self):
        self.assertEqual(fr.request("https://beta.egx.com.eg/x").get_method(), "GET")

    def test_the_upstream_headers_are_still_prefixed_and_nothing_leaks(self):
        req = fr.request("https://beta.egx.com.eg/api/bff/egx/news-search",
                         {"content-type": "application/json",
                          "x-egx-bff-request": "1"},
                         data=b"{}")
        names = {k.lower() for k in req.headers}
        self.assertIn("x-relay-content-type", names)
        self.assertIn("x-relay-x-egx-bff-request", names)
        self.assertIn("authorization", names)
        # Nothing reaches the relay as an unprefixed upstream header, which is
        # what stops it forwarding whatever a caller happens to set.
        self.assertNotIn("content-type", names)
        self.assertNotIn("cookie", names)


class HarvestRoutingTest(unittest.TestCase):
    def test_the_egx_harvest_asks_through_the_relay_rather_than_urllib(self):
        # The wiring is the whole fix. `harvest_egx_beta` built its own
        # Request, so the relay could have carried its filings for months and
        # never been asked to.
        source = pathlib.Path(__file__).resolve().parent / "harvest_egx_beta.py"
        body = source.read_text(encoding="utf-8")
        self.assertIn("fetch_relay.request(", body)
        self.assertNotIn("urllib.request.Request(BASE", body)


if __name__ == "__main__":
    unittest.main()
