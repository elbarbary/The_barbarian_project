#!/usr/bin/env python3
"""Exit 0 only when the browser the exchange steps drive actually opens.

The install steps used to prove a browser by importing
`scrapling.fetchers`, and an import cannot tell a browser from a missing
one. On 15 Sep 2026 at 16:49 UTC playwright 1.63.0 reached PyPI, the
unpinned install picked it up, and patchright went on asking for
`chromium-1234`, which nothing had downloaded any more. The import still
succeeded, so every run exported SCRAPLING_PYTHON, and every Scrapling step
after it failed with "Executable doesn't exist" and then exited 0: the central
bank's interbank rate and the company-filings harvest stopped for good while
every run stayed green.

So this launches patchright's Chromium, the one StealthyFetcher uses, and
reads a page back. The workflow exports the interpreter only on success and
raises a visible warning otherwise.
"""

from __future__ import annotations

import sys
import tempfile


def main() -> int:
    try:
        from patchright.sync_api import sync_playwright
    except ImportError as error:
        print(f"browser_opens: patchright is not installed ({error})", file=sys.stderr)
        return 1
    try:
        # The same call StealthyFetcher makes: a persistent context on the
        # full Chromium channel, which is a different binary from the
        # headless shell a plain `launch(headless=True)` would have proved.
        with tempfile.TemporaryDirectory() as profile, sync_playwright() as driver:
            context = driver.chromium.launch_persistent_context(profile, headless=True, channel="chromium")
            try:
                page = context.new_page()
                page.set_content("<p id='probe'>opened</p>")
                text = page.inner_text("#probe")
            finally:
                context.close()
    except Exception as error:  # the whole point is to report any failure to open
        # The tail, not the head: the useful line of a launch failure is the
        # last one, and a 200-character head is how "Executable doesn't
        # exist" stayed invisible behind a bare "Traceback (most recent…".
        print(f"browser_opens: the browser did not open: {str(error)[-600:]}", file=sys.stderr)
        return 1
    if text != "opened":
        print(f"browser_opens: the browser opened but read back {text!r}", file=sys.stderr)
        return 1
    print("browser_opens: Chromium opened and read a page")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
