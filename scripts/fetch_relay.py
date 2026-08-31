#!/usr/bin/env python3
"""One HTTP GET, through this project's own relay when there is one.

Two of the pipeline's sources answer a GitHub Actions runner with 403 and a
laptop with 200. Investing.com is the one that costs something: `rate_history`
fetches seven daily series from it, and every CI build since that step existed
has logged seven 403s and carried the previous file forward — so the curves on
the Exchange screen have been frozen at the day they were committed, quietly,
while the build went green.

It is not a policy about us. Investing's robots.txt disallows a dozen paths and
no API path among them; this is a blanket block on cloud IP ranges. A runner
sits in one and a Cloudflare Worker does not, and the same request that is
refused from CI answers in 36 milliseconds from there.

So when `ESTHMR_RELAY_URL` and `ESTHMR_RELAY_TOKEN` are both set — they are set
for CI and for nothing else — the request goes through `worker/fetchrelay`,
which will only fetch the two hosts this pipeline declares. Unset, which is
every laptop, the request goes straight out exactly as it did before. Nothing
about the caller changes either way, and neither does what is fetched.
"""

from __future__ import annotations

import os
import urllib.parse
import urllib.request

# The headers the relay is willing to carry, prefixed so it can tell a header
# meant for the upstream from one meant for itself.
RELAY_PREFIX = "x-relay-"

# What this build calls ITSELF when it talks to its own relay.
#
# Not decoration: Cloudflare's default protection on workers.dev refuses a
# `Python-urllib/3.14` user agent outright — error 1010, a 403 that looks
# exactly like the upstream block this whole relay exists to route around and
# is nothing of the kind. It cost an hour to tell the two apart, so the header
# is set here, once, and says truthfully who is calling rather than dressing
# the build up as a browser.
# No contact URL in it: the only thing that ever sees this header is our own
# Worker, and a URL here reads to the source catalogue as a host the pipeline
# fetches — which it is not.
CALLER = "esthmr-build/1.0"


def relay() -> tuple[str, str] | None:
    """`(url, token)` when the build has a relay configured, else None."""
    url = (os.environ.get("ESTHMR_RELAY_URL") or "").strip()
    token = (os.environ.get("ESTHMR_RELAY_TOKEN") or "").strip()
    return (url, token) if url and token else None


def request(url: str, headers: dict | None = None) -> urllib.request.Request:
    """The Request to send: direct, or wrapped for the relay."""
    headers = dict(headers or {})
    configured = relay()
    if not configured:
        return urllib.request.Request(url, headers=headers)
    endpoint, token = configured
    wrapped = {RELAY_PREFIX + k.lower(): v for k, v in headers.items()}
    wrapped["authorization"] = f"Bearer {token}"
    wrapped["user-agent"] = CALLER
    joiner = "&" if "?" in endpoint else "?"
    return urllib.request.Request(
        f"{endpoint}{joiner}u={urllib.parse.quote(url, safe='')}",
        headers=wrapped,
    )


def get(url: str, headers: dict | None = None, *, timeout: int = 60) -> bytes:
    """The body, or whatever urllib raises. Deliberately thin: every caller
    already has its own idea of what a failure means and how long to wait."""
    with urllib.request.urlopen(request(url, headers), timeout=timeout) as response:
        return response.read()
