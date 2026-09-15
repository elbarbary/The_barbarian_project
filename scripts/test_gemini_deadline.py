#!/usr/bin/env python3
"""No model call waits past GEMINI_DEADLINE, and without one nothing changes.

Publish live data is cancelled whole at fifteen minutes, and one call used to
be allowed three attempts at up to 120 s each. On 15 Sep 2026 Vertex slowed to
25-73 s a call and five runs in a row published nothing.
"""

from __future__ import annotations

import contextlib
import io
import json
import os
import pathlib
import sys
import unittest
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import gemini  # noqa: E402

WORKFLOW = (pathlib.Path(__file__).resolve().parent.parent
            / ".github" / "workflows" / "publish-live-data.yml")


class Clock:
    """`time` as gemini.py uses it, advanced only by what the test says happened."""

    def __init__(self, now: float = 1_800_000_000.0):
        self.now = now

    def time(self) -> float:
        return self.now

    def sleep(self, seconds: float) -> None:
        self.now += seconds


class Vertex:
    """urlopen, replaced: it answers after `answer_after` seconds, or hangs until
    the socket timeout it was given and then times out, as the runner saw."""

    def __init__(self, clock: Clock, answer_after: float | None = None):
        self.clock, self.answer_after = clock, answer_after
        self.timeouts: list[float] = []

    def __call__(self, request, timeout=None):
        self.timeouts.append(timeout)
        if self.answer_after is not None and self.answer_after <= timeout:
            self.clock.now += self.answer_after
            return io.BytesIO(json.dumps({"candidates": []}).encode())
        self.clock.now += timeout
        raise TimeoutError("The read operation timed out")


@contextlib.contextmanager
def model(clock: Clock, vertex: Vertex, deadline: float | None, *, vertex_configured=True, key=None):
    with mock.patch.dict(os.environ):
        os.environ.pop(gemini.DEADLINE_ENV, None)
        if deadline is not None:
            os.environ[gemini.DEADLINE_ENV] = str(int(deadline))
        no_key = mock.Mock(side_effect=gemini.GeminiUnavailable("no key"))
        with mock.patch.object(gemini, "time", clock), \
                mock.patch.object(gemini, "_access_token", lambda: "token" if vertex_configured else None), \
                mock.patch.object(gemini, "_vertex_projects", lambda: ["project"]), \
                mock.patch.object(gemini, "_key", (lambda: key) if key else no_key), \
                mock.patch.object(gemini.urllib.request, "urlopen", vertex), \
                mock.patch.object(gemini, "_VERTEX_NOTED", set()), \
                mock.patch.object(sys, "stderr", io.StringIO()):
            yield


class TheDeadline(unittest.TestCase):
    def test_without_one_the_callers_timeout_stands(self):
        clock = Clock()
        vertex = Vertex(clock, answer_after=5)
        with model(clock, vertex, None):
            self.assertEqual(gemini._post("m", b"{}", timeout=120), {"candidates": []})
        self.assertEqual(vertex.timeouts, [120])

    def test_it_cuts_the_socket_timeout_short(self):
        clock = Clock()
        vertex = Vertex(clock, answer_after=5)
        with model(clock, vertex, clock.now + 30):
            gemini._post("m", b"{}", timeout=120)
        self.assertEqual(vertex.timeouts, [30])

    def test_past_it_nothing_is_sent(self):
        clock = Clock()
        vertex = Vertex(clock, answer_after=1)
        with model(clock, vertex, clock.now - 1):
            with self.assertRaises(gemini.GeminiUnavailable) as stopped:
                gemini._post("m", b"{}", timeout=120)
        self.assertIn(gemini.DEADLINE_ENV, str(stopped.exception))
        self.assertEqual(vertex.timeouts, [])

    def test_a_hanging_model_costs_the_deadline_and_not_six_minutes(self):
        hung = Clock()
        start = hung.now
        with model(hung, Vertex(hung), None):
            with self.assertRaises(gemini.GeminiUnavailable):
                gemini._post("m", b"{}", timeout=120)
        # Three attempts at 120 s and two backoffs, then the empty fallback.
        self.assertEqual(hung.now - start, 3 * 120 + 4 + 8)

        bounded = Clock()
        start = bounded.now
        with model(bounded, Vertex(bounded), bounded.now + 150):
            with self.assertRaises(gemini.GeminiUnavailable) as stopped:
                gemini._post("m", b"{}", timeout=120)
        self.assertLessEqual(bounded.now - start, 150)
        self.assertIn(gemini.DEADLINE_ENV, str(stopped.exception))

    def test_the_api_key_fallback_keeps_it_too(self):
        clock = Clock()
        vertex = Vertex(clock, answer_after=1)
        with model(clock, vertex, clock.now - 1, vertex_configured=False, key="k"):
            with self.assertRaises(gemini.GeminiUnavailable):
                gemini._post("m", b"{}", timeout=120)
        self.assertEqual(vertex.timeouts, [])


class TheLiveJob(unittest.TestCase):
    def test_the_deadline_is_set_before_the_first_script_that_can_ask_the_model(self):
        text = WORKFLOW.read_text(encoding="utf-8")
        step = text[text.index("- name: Fetch headlines and rates"):]
        step = step[:step.index("\n      - name:", 1)]
        self.assertLess(step.index("export GEMINI_DEADLINE="),
                        step.index("python3 scripts/build_news_api.py"))

    def test_the_deadline_leaves_the_rest_of_the_run_room_under_its_ceiling(self):
        text = WORKFLOW.read_text(encoding="utf-8")
        ceiling = int(text.split("timeout-minutes:", 1)[1].split()[0]) * 60
        seconds = int(text.split("export GEMINI_DEADLINE=$(( $(date +%s) + ", 1)[1].split(" ")[0])
        # A healthy step takes about two minutes without the model, and the
        # manifest, tests, commit and deploy follow it.
        self.assertLessEqual(seconds, ceiling - 6 * 60)


if __name__ == "__main__":
    unittest.main()
