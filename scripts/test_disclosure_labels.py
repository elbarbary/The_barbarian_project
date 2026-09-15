#!/usr/bin/env python3
"""A filing is labelled by the model once, and a slow model costs labels, not a publish.

The exchange API returns the whole window, so the fifteen-minute news job
re-fetched the same 165 filings every run and asked the model again about the
17 no rule places. On 15 Sep 2026 the model slowed to 25-73 s a call, and runs
34990634463 and 34992293709 outlived the job's ceiling with their headlines
and rates unpublished.
"""

from __future__ import annotations

import io
import json
import pathlib
import sys
import tempfile
import types
import unittest
from contextlib import redirect_stdout
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_disclosures_api as bdi  # noqa: E402
import filing_types as ft  # noqa: E402
import gemini  # noqa: E402
import translations  # noqa: E402

UNPLACED = "بيان بشأن أمر لا تعرفه القواعد"
KNOWN = "dividend"


def fetched(ident: str, title: str = UNPLACED) -> dict:
    """A filing as `fetch_beta` returns it, before anything is decided about it."""
    return {"id": ident, "title": title, "date": "2026-09-15",
            "link": "", "tickers": []}


def published() -> list[dict]:
    path = bdi.OUT / "latest.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8")).get("items") or []


def usable(item: dict) -> bool:
    """A held label this run may keep instead of asking."""
    return (item.get("by") == "model" and item.get("event") in ft.FILING_TYPES
            and not ft.classify_rules(item["title"]))


class Asking:
    """The model, replaced by a recorder so nothing leaves this machine."""

    def __init__(self, clock=None, step=0.0):
        self.prompts: list[str] = []
        self.clock, self.step = clock, step

    def __call__(self, prompt, allowed, **_):
        self.prompts.append(prompt)
        if self.clock is not None:
            self.clock[0] += self.step
        return KNOWN


def classify(items, **kwargs) -> Asking:
    asking = kwargs.pop("asking", None) or Asking()
    with mock.patch.object(gemini, "choose", asking), redirect_stdout(io.StringIO()):
        bdi.classify_all(items, **kwargs)
    return asking


class HeldLabels(unittest.TestCase):
    def setUp(self):
        self.assertIsNone(ft.classify_rules(UNPLACED), "the test title must need the model")

    def test_a_filing_the_model_labelled_before_is_not_asked_again(self):
        held = {"egx-1": {**fetched("egx-1"), "event": KNOWN, "by": "model"}}
        item = fetched("egx-1")
        self.assertEqual(classify([item], held=held).prompts, [])
        self.assertEqual((item["event"], item["by"]), (KNOWN, "model"))

    def test_a_new_title_a_dropped_type_or_a_fallback_is_asked_again(self):
        held = {
            "egx-1": {**fetched("egx-1", "عنوان قديم لا تعرفه القواعد"), "event": KNOWN, "by": "model"},
            "egx-2": {**fetched("egx-2"), "event": "no_such_type", "by": "model"},
            "egx-3": {**fetched("egx-3"), "event": "statement", "by": "fallback"},
        }
        items = [fetched("egx-1"), fetched("egx-2"), fetched("egx-3")]
        self.assertEqual(len(classify(items, held=held).prompts), 3)

    def test_a_rule_still_outranks_a_held_model_label(self):
        ruled = next((i for i in published() if ft.classify_rules(i["title"])), None)
        if ruled is None:
            self.skipTest("no published filing a rule places")
        placed = ft.classify_rules(ruled["title"])
        other = next(k for k in ft.FILING_TYPES if k != placed)
        held = {ruled["id"]: {**ruled, "event": other, "by": "model"}}
        item = fetched(ruled["id"], ruled["title"])
        self.assertEqual(classify([item], held=held).prompts, [])
        self.assertEqual((item["event"], item["by"]), (placed, "rule"))

    def test_the_published_feed_refetched_asks_only_about_what_it_has_no_answer_for(self):
        items = published()
        if not items:
            self.skipTest("no disclosures published on this machine")
        self.assertTrue(any(usable(i) for i in items),
                        "the feed holds no model label to keep, so this proves nothing")
        held = {i["id"]: i for i in items}
        refetched = [fetched(i["id"], i["title"]) for i in items]
        unanswered = [i for i in items
                      if not ft.classify_rules(i["title"]) and not usable(i)]
        self.assertEqual(len(classify(refetched, held=held).prompts), len(unanswered))


class TheBudget(unittest.TestCase):
    def test_a_spent_budget_asks_nothing_and_falls_back(self):
        items = [fetched("egx-1"), fetched("egx-2")]
        clock = types.SimpleNamespace(monotonic=lambda: 1000.0)
        with mock.patch.object(bdi, "time", clock):
            asking = classify(items, deadline=999.0)
        self.assertEqual(asking.prompts, [])
        self.assertEqual({(i["event"], i["by"]) for i in items}, {("statement", "fallback")})

    def test_the_budget_runs_out_mid_run_and_the_rest_waits(self):
        now = [0.0]
        clock = types.SimpleNamespace(monotonic=lambda: now[0])
        items = [fetched(f"egx-{n}") for n in range(5)]
        with mock.patch.object(bdi, "time", clock):
            asking = classify(items, deadline=120.0, asking=Asking(now, step=50.0))
        self.assertEqual(len(asking.prompts), 3)
        self.assertEqual([i["by"] for i in items],
                         ["model", "model", "model", "fallback", "fallback"])

    def test_without_a_deadline_every_unplaced_filing_is_asked(self):
        # harvest_company_filings calls it this way, and nothing there changed.
        now = [0.0]
        clock = types.SimpleNamespace(monotonic=lambda: now[0])
        items = [fetched(f"egx-{n}") for n in range(5)]
        with mock.patch.object(bdi, "time", clock):
            asking = classify(items, asking=Asking(now, step=500.0))
        self.assertEqual(len(asking.prompts), 5)


class TheRun(unittest.TestCase):
    def test_a_run_that_refetches_the_feed_does_not_ask_about_what_it_labelled(self):
        items = published()
        if not any(usable(i) for i in items):
            self.skipTest("no model-labelled filing published on this machine")
        refetched = [fetched(i["id"], i["title"]) for i in items]
        unanswered = [i for i in items
                      if not ft.classify_rules(i["title"]) and not usable(i)]
        asking = Asking()
        passes = []
        real = bdi.classify_all

        def spy(batch, held=None, deadline=None):
            before = len(asking.prompts)
            real(batch, held=held, deadline=deadline)
            passes.append(len(asking.prompts) - before)

        # --check returns before anything is written; the model and the
        # translator are recorders, so nothing leaves this machine either.
        with mock.patch.object(bdi, "fetch_beta", lambda days: [dict(i) for i in refetched]), \
                mock.patch.object(bdi, "learn_names", lambda batch: None), \
                mock.patch.object(bdi, "classify_all", spy), \
                mock.patch.object(translations, "english_for", lambda texts, **_: {}), \
                mock.patch.object(gemini, "choose", asking), \
                mock.patch.object(sys, "argv", ["build_disclosures_api.py", "--check"]), \
                redirect_stdout(io.StringIO()):
            self.assertEqual(bdi.main(), 0)
        # The first pass labels what was fetched; a later one re-types the
        # held filings that only ever fell back, which is not this question.
        self.assertEqual(passes[0], len(unanswered))

    def test_one_budget_covers_both_passes(self):
        # What a slow run left as `fallback` is re-asked by the second pass
        # of the next, so a budget on the first pass alone would wedge the
        # run after it instead.
        now = [0.0]
        clock = types.SimpleNamespace(monotonic=lambda: now[0], sleep=lambda s: None)
        waiting = {f"egx-old-{n}": {**fetched(f"egx-old-{n}"), "event": "statement",
                                    "by": "fallback", "weight": "file"}
                   for n in range(10)}
        asking = Asking(now, step=50.0)
        with tempfile.TemporaryDirectory() as empty, \
                mock.patch.object(bdi, "OUT", pathlib.Path(empty)), \
                mock.patch.object(bdi, "archive_read", lambda: {k: dict(v) for k, v in waiting.items()}), \
                mock.patch.object(bdi, "fetch_beta", lambda days: [fetched("egx-new")]), \
                mock.patch.object(bdi, "learn_names", lambda batch: None), \
                mock.patch.object(bdi, "time", clock), \
                mock.patch.object(translations, "english_for", lambda texts, **_: {}), \
                mock.patch.object(gemini, "choose", asking), \
                mock.patch.object(sys, "argv", ["build_disclosures_api.py", "--check"]), \
                redirect_stdout(io.StringIO()):
            self.assertEqual(bdi.main(), 0)
        # 120 s at 50 s a call: the new filing, then two of the ten waiting.
        self.assertEqual(bdi.LABEL_BUDGET_SECONDS, 120)
        self.assertEqual(len(asking.prompts), 3)


if __name__ == "__main__":
    unittest.main()
