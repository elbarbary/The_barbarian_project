#!/usr/bin/env python3
"""The exception tuple that cost a build, and the guard against writing it again.

3 Sep 2026: investing.com stopped sending mid-body, Python raised
`http.client.IncompleteRead`, and the handler around the read —
`except (urllib.error.URLError, TimeoutError, OSError, ValueError)` — did not
catch it, because IncompleteRead descends from HTTPException and from none of
those four. The build died at 107 minutes and CI discarded twenty-five other
steps' correct output.

The tuple had been written out by hand in nine scripts. These tests check the
shared one actually covers what it claims, and that nobody quietly reintroduces
a narrow copy.
"""

from __future__ import annotations

import ast
import http.client
import io
import json
import pathlib
import re
import socket
import ssl
import sys
import unittest
import urllib.error
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import transport

HERE = pathlib.Path(__file__).resolve().parent


class Covers(unittest.TestCase):
    """Checked against the real classes rather than against their names."""

    def test_the_one_that_got_through(self):
        self.assertTrue(issubclass(http.client.IncompleteRead, transport.TRANSPORT))
        # And the reason it got through, pinned so the surprise is on record:
        # it is not an OSError, so the obvious handler could never have caught it.
        for missed in (OSError, ValueError, urllib.error.URLError, TimeoutError):
            self.assertFalse(issubclass(http.client.IncompleteRead, missed), missed)

    def test_the_rest_of_the_http_family(self):
        for kind in (http.client.BadStatusLine, http.client.LineTooLong,
                     http.client.ResponseNotReady, http.client.InvalidURL,
                     http.client.RemoteDisconnected):
            self.assertTrue(issubclass(kind, transport.TRANSPORT), kind.__name__)

    def test_the_ordinary_transport_failures(self):
        for kind in (urllib.error.URLError, TimeoutError, ConnectionResetError,
                     ssl.SSLError, socket.timeout, json.JSONDecodeError):
            self.assertTrue(issubclass(kind, transport.TRANSPORT), kind.__name__)

    def test_a_status_is_caught_too_so_it_must_be_handled_first(self):
        """HTTPError is an OSError, so `except TRANSPORT` swallows it.

        That is why every caller puts `except urllib.error.HTTPError` above the
        transport clause: a refused request is an answer and must not be
        retried, and a caller that omits the earlier clause will silently treat
        a 403 as a flake.
        """
        self.assertTrue(issubclass(urllib.error.HTTPError, transport.TRANSPORT))


class NobodyWritesItByHand(unittest.TestCase):
    """Read as code, not as text.

    An earlier version of this grepped the source and flagged its own
    docstring. Walking the syntax tree asks the question that actually matters
    — what does this `except` clause catch — and cannot be fooled by a comment
    or confused by line breaks inside the tuple.
    """

    @staticmethod
    def _names(node):
        """Dotted names in an `except (...)` clause, however it is written."""
        parts = node.elts if isinstance(node, ast.Tuple) else [node]
        out = []
        for part in parts:
            bits = []
            while isinstance(part, ast.Attribute):
                bits.append(part.attr)
                part = part.value
            if isinstance(part, ast.Name):
                bits.append(part.id)
            out.append(".".join(reversed(bits)))
        return out

    def test_no_handler_catches_a_narrow_transport_tuple(self):
        offenders = []
        for path in sorted(HERE.glob("*.py")):
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=path.name)
            for node in ast.walk(tree):
                if not isinstance(node, ast.ExceptHandler) or node.type is None:
                    continue
                names = self._names(node.type)
                # A handler is about the transport if it names one of these.
                if not {"urllib.error.URLError", "URLError"} & set(names):
                    continue
                covered = any(n.endswith("TRANSPORT") or n.endswith("HTTPException")
                              or n == "Exception" for n in names)
                if not covered:
                    offenders.append(f"{path.name}:{node.lineno} catches {names}")
        self.assertEqual(
            offenders, [],
            "these catch the transport without http.client.HTTPException, so a "
            "truncated read escapes them — import transport and use "
            "transport.TRANSPORT")


class SurvivesATruncatedBody(unittest.TestCase):
    """The end-to-end claim: a truncated read now degrades instead of crashing."""

    def _truncated(self, *args, **kwargs):
        raise http.client.IncompleteRead(b"12345", 42)

    def test_build_rates_api_returns_none_rather_than_raising(self):
        import build_rates_api

        class Body(io.IOBase):
            def read(self, *a): raise http.client.IncompleteRead(b"12345", 42)
            def __enter__(self): return self
            def __exit__(self, *a): return False

        with mock.patch.object(build_rates_api.urllib.request, "urlopen",
                               return_value=Body()), \
             mock.patch.object(build_rates_api.time, "sleep"):
            self.assertIsNone(build_rates_api.get("https://example.com/x"))

    def test_index_history_raises_its_own_unavailable(self):
        import index_history

        class Body(io.IOBase):
            def read(self, *a): raise http.client.IncompleteRead(b"12345", 42)
            def __enter__(self): return self
            def __exit__(self, *a): return False

        with mock.patch.object(index_history.urllib.request, "urlopen",
                               return_value=Body()), \
             mock.patch.object(index_history.time, "sleep"):
            with self.assertRaises(index_history.IndexHistoryUnavailable):
                index_history._get("https://example.com/x")


if __name__ == "__main__":
    unittest.main()
