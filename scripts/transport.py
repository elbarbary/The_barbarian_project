#!/usr/bin/env python3
"""What "the network failed" actually means, in one place.

WHY THIS EXISTS

On 3 Sep 2026 the daily build died after 107 minutes. investing.com stopped
sending mid-body and Python raised `http.client.IncompleteRead(67425 bytes
read, 60256 more expected)`. The fetch was wrapped in what looks like a
thorough handler:

    except (urllib.error.URLError, TimeoutError, OSError, ValueError)

`IncompleteRead` is none of those. Its bases are `HTTPException` and
`Exception`, and it inherits from no OS-level error at all — so it walked past
a handler whose entire job was to leave the previously published document
alone, and killed the process instead. Twenty-five other steps had already
produced correct output. CI reads a non-zero build as "publish nothing", so
all of it was discarded to carry forward one stale series.

That same four-name tuple was written out by hand in five scripts and the
three-name version in a sixth. Each was a reasonable guess, and each has the
same hole. This module is here so the guess is made once.

WHAT IS IN IT AND WHAT IS NOT

`TRANSPORT` is for the leg between us and the host: DNS, connection, TLS,
timeouts, a body that stopped arriving, a response that did not parse. Every
one of those means "ask again later", and every caller in this pipeline
answers them the same way — return None, or raise its own Unavailable, and
leave what is already published exactly where it is.

`urllib.error.HTTPError` is deliberately NOT here even though it would be
caught by `OSError`. A status code is an answer: the host understood and said
no. Catch it first, separately, and do not retry it — a 403 asks the same
question and gets the same reply. This is why every user of this tuple has an
`except urllib.error.HTTPError` clause ABOVE the `except TRANSPORT` one.

Already covered, so do not add them: `ssl.SSLError` and `socket.timeout` are
`OSError` subclasses; `json.JSONDecodeError` is a `ValueError`;
`http.client.RemoteDisconnected` is both an `HTTPException` and a
`ConnectionResetError`.
"""

from __future__ import annotations

import http.client
import urllib.error

TRANSPORT: tuple[type[BaseException], ...] = (
    # The one that was missing: IncompleteRead, BadStatusLine, LineTooLong,
    # ResponseNotReady, InvalidURL. None of these is an OSError.
    http.client.HTTPException,
    # DNS, refused connections, unreachable hosts.
    urllib.error.URLError,
    # Sockets, TLS, resets, and the timeouts that reach us as OSError.
    TimeoutError,
    OSError,
    # A body that arrived and did not parse. json.JSONDecodeError is one of
    # these, and a truncated response often shows up here rather than as an
    # IncompleteRead.
    ValueError,
)
