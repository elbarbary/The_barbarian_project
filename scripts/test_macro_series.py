#!/usr/bin/env python3
"""Where macro.json's oil comes from, and what happens when a series stops arriving.

From 10 to 16 Sep 2026 Brent and WTI were missing from macro.json. Investing.com
had moved the instrument id away from the name on its page, the reader looked
for it by position, and every build wrote a smaller document and stayed green.
These tests read the real page (tests one and two) and make a lost series say
so on every build (test three).

Run: python3 -m unittest discover -s scripts -p 'test_*.py'
"""

from __future__ import annotations

import contextlib
import io
import json
import pathlib
import re
import sys
import tempfile
import unittest
import unittest.mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_macro_api as build  # noqa: E402
import macro_sources as sources  # noqa: E402
import rate_history  # noqa: E402

FIXTURES = pathlib.Path(__file__).resolve().parent / "fixtures"

BRENT = ("brent-oil", "Brent Oil Futures")
WTI = ("crude-oil", "Crude Oil WTI Futures")

# What the history API returned for each id in the same CI run that saved the
# pages (35097097500). 15 Sep is the close both pages quote as the previous one.
BRENT_CLOSES = {"2026-09-11": 104.61, "2026-09-14": 105.68,
                "2026-09-15": 108.75, "2026-09-16": 107.49}
WTI_CLOSES = {"2026-09-11": 100.05, "2026-09-14": 101.39,
              "2026-09-15": 105.83, "2026-09-16": 103.87}


def page(slug: str) -> str:
    """The commodity page as CI received it (reduced; the file says how)."""
    return (FIXTURES / f"investing-{slug}.html").read_text(encoding="utf-8")


def state_of(text: str) -> dict:
    return json.loads(sources.PAGE_STATE.search(text).group(1))


def instrument_of(state: dict) -> dict:
    return state["props"]["pageProps"]["state"]["commodityStore"]["instrument"]


def edited(text: str, change) -> str:
    """The same page, with its state passed through `change`."""
    found = sources.PAGE_STATE.search(text)
    state = json.loads(found.group(1))
    change(state)
    blob = json.dumps(state, ensure_ascii=False, separators=(",", ":"))
    return text[: found.start(1)] + blob + text[found.end(1):]


class RealPageTest(unittest.TestCase):
    """The pages the build receives now, read the way the build reads them."""

    def test_each_page_gives_its_own_id_and_previous_close(self):
        expected = {"BRENT": sources.Instrument(8833, 108.75),
                    "WTI": sources.Instrument(8849, 105.83)}
        self.assertEqual(set(sources.OILS), set(expected))
        for key, (slug, name) in sources.OILS.items():
            with self.subTest(key):
                self.assertEqual(
                    sources.page_instrument(page(slug), slug, name), expected[key])

    def test_wti_is_the_id_rate_history_verified_on_its_own(self):
        # Two independent checks and one answer. rate_history accepted 8849 on
        # 30 Aug 2026 against the WTI level rates/latest.json publishes from a
        # different source; this reads it off the page's own instrument.
        verified = {ours: theirs for ours, theirs, _, _ in rate_history.INSTRUMENTS}
        self.assertEqual(
            sources.page_instrument(page(WTI[0]), *WTI).id, verified["NYMEX_CL1!"])

    def test_these_are_the_pages_that_broke_the_old_reader(self):
        """Pinned, so a friendlier page cannot be swapped in.

        The old reader took the last "instrumentId" in the 600 characters
        before `"long_name"`, which is how CI failed with "no instrument id
        beside 'Brent Oil Futures'". There is none there, and both pages carry
        other instruments' ids for a positional reading to pick up instead.
        """
        for slug, name in (BRENT, WTI):
            with self.subTest(slug):
                text = page(slug)
                at = text.find(f'"long_name":"{name}"')
                self.assertGreater(at, 0)
                self.assertNotIn("instrumentId", text[max(0, at - 600):at])

        relatives = instrument_of(state_of(page(BRENT[0])))["relatives"]["relatives"]
        others = {row["id"] for row in relatives} - {"8833"}
        self.assertGreaterEqual(len(others), 10, "the Brent page's other contracts")
        self.assertIn('"pair_id":8833', page(WTI[0]), "Brent's id on the WTI page")


class RefusalTest(unittest.TestCase):
    """A page that is not plainly about its instrument gives no id at all."""

    def test_a_neighbours_id_beside_the_name_is_not_taken(self):
        # WTI's id planted exactly where the old reader looked for Brent's.
        def plant(state):
            price = instrument_of(state)["price"]
            rows = list(price.items())
            at = [key for key, _ in rows].index("long_name")
            rows.insert(at, ("instrumentId", "8849"))
            instrument_of(state)["price"] = dict(rows)

        text = edited(page(BRENT[0]), plant)
        at = text.find('"long_name":"Brent Oil Futures"')
        self.assertIn('"instrumentId":"8849"', text[at - 40:at])
        self.assertEqual(sources.page_instrument(text, *BRENT).id, 8833)

    def test_a_page_about_anything_else_is_refused(self):
        def change(path, value):
            def apply(state):
                target = instrument_of(state)
                for key in path[:-1]:
                    target = target[key]
                if value is None:
                    target.pop(path[-1], None)
                else:
                    target[path[-1]] = value
            return apply

        def both_names(value):
            def apply(state):
                change(("name", "fullName"), value)(state)
                change(("price", "long_name"), value)(state)
            return apply

        def other_id(state):
            instrument_of(state)["base"]["id"] = "996718"

        brent = page(BRENT[0])
        cases = [
            ("the WTI page offered as Brent", page(WTI[0]), "does not call itself"),
            ("a renamed instrument",
             edited(brent, both_names("Brent Oil RTS Futures")), "does not call itself"),
            ("two names that disagree",
             edited(brent, change(("price", "long_name"), "Brent Oil Perpetual Futures")),
             "does not call itself"),
            ("no name at all", edited(brent, both_names(None)), "does not call itself"),
            ("another instrument's path",
             edited(brent, change(("base", "path"), "/commodities/brent-oil-rts")),
             "is the instrument at"),
            ("an id the page does not file itself under",
             edited(brent, other_id), "gives no single id"),
            ("no id", edited(brent, change(("base", "id"), None)), "gives no single id"),
            ("no previous close",
             edited(brent, change(("price", "lastClose"), None)), "quotes no previous close"),
            ("a zero previous close",
             edited(brent, change(("price", "lastClose"), 0)), "quotes no previous close"),
            ("a challenge page instead of the page",
             "<html><title>Just a moment...</title></html>", "carries no page state"),
            ("state that is not JSON",
             '<script id="__NEXT_DATA__" type="application/json">{"props":</script>',
             "is not JSON"),
        ]
        for label, text, reason in cases:
            with self.subTest(label):
                with self.assertRaises(sources.MacroUnavailable) as caught:
                    sources.page_instrument(text, *BRENT)
                self.assertIn(reason, str(caught.exception))


class HistoryTest(unittest.TestCase):
    """The history fetched for the id has to close where its page says it closed."""

    brent = sources.Instrument(8833, 108.75)

    def test_the_history_that_closes_where_the_page_says_is_kept(self):
        self.assertEqual(sources.checked("BRENT", self.brent, BRENT_CLOSES), BRENT_CLOSES)
        # Before today's session has a row, the quoted close is the newest.
        yesterday = {d: c for d, c in BRENT_CLOSES.items() if d < "2026-09-16"}
        self.assertEqual(sources.checked("BRENT", self.brent, yesterday), yesterday)

    def test_another_grades_history_is_refused(self):
        with self.assertRaises(sources.MacroUnavailable) as caught:
            sources.checked("BRENT", self.brent, WTI_CLOSES)
        self.assertIn("8833", str(caught.exception))
        self.assertIn("108.75", str(caught.exception))

    def test_a_match_outside_the_window_does_not_count(self):
        # Far enough back, a matching close is a coincidence with an old price.
        closes = {"2026-09-08": 108.75, "2026-09-09": 96.10,
                  "2026-09-10": 95.40, "2026-09-11": 94.90}
        with self.assertRaises(sources.MacroUnavailable):
            sources.checked("BRENT", self.brent, closes)

    def test_an_empty_or_implausible_history_is_refused(self):
        with self.assertRaises(sources.MacroUnavailable):
            sources.checked("BRENT", self.brent, {})
        # A page and a history that agree with each other about a gas price.
        gas = sources.Instrument(8862, 3.21)
        with self.assertRaises(sources.MacroUnavailable) as caught:
            sources.checked("BRENT", gas, {"2026-09-15": 3.21})
        self.assertIn("not a barrel", str(caught.exception))


class OilTest(unittest.TestCase):
    def test_the_history_is_fetched_for_the_id_the_page_gives(self):
        asked: list[int] = []

        def get(url, **_):
            return page(url.rstrip("/").rsplit("/", 1)[-1]).encode("utf-8")

        def history(url, **_):
            instrument = int(re.search(r"/historical/(\d+)\?", url).group(1))
            asked.append(instrument)
            closes = {8833: BRENT_CLOSES, 8849: WTI_CLOSES}[instrument]
            return {"data": [{"rowDateTimestamp": f"{day}T00:00:00Z",
                              "last_closeRaw": str(close)}
                             for day, close in closes.items()]}

        with unittest.mock.patch.object(sources, "_get", get), \
                unittest.mock.patch.object(sources, "_json", history):
            out = sources.oil("2025-07-13", "2026-09-16")
        self.assertEqual(asked, [8833, 8849])
        self.assertEqual(out, {"BRENT": BRENT_CLOSES, "WTI": WTI_CLOSES})


NOW = "2026-09-16T12:00:00+00:00"
FIRST_MISSED = "2026-09-10T12:06:23+00:00"


def produced(*ids: str) -> list[dict]:
    return [{"id": key} for key in ids]


class LostSeriesTest(unittest.TestCase):
    def test_a_series_the_last_document_carried_is_missing(self):
        previous = {"series": produced("suez", "brent", "wti", "gold", "silver")}
        self.assertEqual(
            build.lost(previous, produced("suez", "gold", "silver"), NOW),
            [{"id": "brent", "since": NOW}, {"id": "wti", "since": NOW}],
        )

    def test_nothing_is_missing_when_nothing_went(self):
        everything = produced("suez", "brent", "wti", "gold", "silver")
        self.assertEqual(build.lost({"series": everything}, everything, NOW), [])
        # No document before this one.
        self.assertEqual(build.lost({}, produced("suez"), NOW), [])
        # A new series is not missing from anything.
        self.assertEqual(
            build.lost({"series": produced("suez")}, produced("suez", "brent"), NOW), [])

    def test_a_loss_is_carried_until_the_series_returns(self):
        # The document before no longer has Brent in its series. Its own record
        # of the loss is what keeps Brent named, with the day it first went.
        previous = {"series": produced("suez"),
                    "missing": [{"id": "brent", "since": FIRST_MISSED}]}
        self.assertEqual(build.lost(previous, produced("suez"), NOW),
                         [{"id": "brent", "since": FIRST_MISSED}])
        self.assertEqual(build.lost(previous, produced("suez", "brent"), NOW), [])

    def test_the_warning_names_each_series_and_why(self):
        said = io.StringIO()
        with contextlib.redirect_stdout(said):
            build.warn(
                [{"id": "brent", "since": FIRST_MISSED}, {"id": "wti", "since": NOW}],
                ["oil: no instrument id beside 'Brent Oil Futures'"],
            )
        line = said.getvalue()
        self.assertTrue(line.startswith("::warning title=Macro series missing::"), line)
        self.assertEqual(line.count("\n"), 1, "one workflow command, one line")
        self.assertIn("brent (since 2026-09-10)", line)
        self.assertIn("wti (since 2026-09-16)", line)
        self.assertIn("no instrument id beside 'Brent Oil Futures'", line)

        quiet = io.StringIO()
        with contextlib.redirect_stdout(quiet):
            build.warn([], ["oil: HTTP 403"])
        self.assertEqual(quiet.getvalue(), "")

    def test_a_reason_cannot_break_out_of_its_annotation(self):
        said = io.StringIO()
        with contextlib.redirect_stdout(said):
            build.warn([{"id": "suez", "since": NOW}], ["suez: 100% refused\n::error::x"])
        line = said.getvalue()
        self.assertEqual(line.count("\n"), 1)
        self.assertIn("100%25 refused%0A::error::x", line)

    def test_a_loss_with_no_reason_still_says_so(self):
        said = io.StringIO()
        with contextlib.redirect_stdout(said):
            build.warn([{"id": "gold", "since": NOW}], [])
        self.assertIn("no source reported a failure", said.getvalue())


class BuildTest(unittest.TestCase):
    """The whole builder, offline, several builds in a row."""

    REFUSAL = "oil: no instrument id beside 'Brent Oil Futures'"

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = self.root = pathlib.Path(self.tmp.name)
        self.out = root / "macro.json"
        self.fixture = root / "fixture-macro.json"
        self.history = root / "market-history.json"
        self.history.write_text('{"sessions": []}', encoding="utf-8")
        self.out.write_text(json.dumps({
            "updated_at": "2026-09-10T09:54:11+00:00",
            "series": produced("suez", "brent", "wti"),
            "unavailable": [],
        }), encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def build(self, oil, *argv: str) -> tuple[int, list[str], dict]:
        patches = [
            unittest.mock.patch.object(build, "REPO", self.root),
            unittest.mock.patch.object(build, "OUT", self.out),
            unittest.mock.patch.object(build, "FIXTURE", self.fixture),
            unittest.mock.patch.object(build, "HISTORY", self.history),
            unittest.mock.patch.object(
                build.sources, "suez", return_value=[{"date": "2026-09-13", "vessels": 21}]),
            unittest.mock.patch.object(build.sources, "oil", side_effect=oil),
            unittest.mock.patch.object(build.sources, "egypt_indicators", return_value={}),
            unittest.mock.patch.object(build.sources, "coverage", return_value=[]),
        ]
        said = io.StringIO()
        with contextlib.ExitStack() as stack:
            for patch in patches:
                stack.enter_context(patch)
            # Captured: an uncaptured ::warning here would be a real annotation
            # on the CI run that executes this suite.
            with contextlib.redirect_stdout(said):
                code = build.main(list(argv))
        warnings = [line for line in said.getvalue().splitlines()
                    if line.startswith("::warning")]
        return code, warnings, json.loads(self.out.read_text(encoding="utf-8"))

    def refused(self, since, until):
        raise sources.MacroUnavailable(self.REFUSAL)

    @staticmethod
    def arrived(since, until):
        return {"BRENT": BRENT_CLOSES, "WTI": WTI_CLOSES}

    def test_a_lost_series_is_named_by_every_build_until_it_returns(self):
        code, warnings, doc = self.build(self.refused)
        self.assertEqual(code, 0)
        self.assertEqual([s["id"] for s in doc["series"]], ["suez"])
        self.assertEqual([m["id"] for m in doc["missing"]], ["brent", "wti"])
        self.assertEqual(doc["unavailable"], [self.REFUSAL], "prefixed once")
        self.assertEqual(len(warnings), 1)
        for text in ("brent", "wti", "no instrument id beside"):
            self.assertIn(text, warnings[0])
        first = doc["missing"]

        # The document this build replaces has no oil in its series any more,
        # which is exactly where the old pipeline went quiet.
        code, warnings, doc = self.build(self.refused)
        self.assertEqual(code, 0)
        self.assertEqual(len(warnings), 1)
        self.assertIn("brent", warnings[0])
        self.assertEqual(doc["missing"], first, "still dated from the first miss")

        code, warnings, doc = self.build(self.arrived)
        self.assertEqual(code, 0)
        self.assertEqual(warnings, [])
        self.assertEqual([s["id"] for s in doc["series"]], ["suez", "brent", "wti"])
        self.assertEqual(doc["missing"], [])
        self.assertEqual(doc["unavailable"], [])

    def test_a_check_says_so_and_writes_nothing(self):
        before = self.out.read_bytes()
        code, warnings, _ = self.build(self.refused, "--check")
        self.assertEqual(code, 0)
        self.assertEqual(len(warnings), 1)
        self.assertEqual(self.out.read_bytes(), before)
        self.assertFalse(self.fixture.exists())


if __name__ == "__main__":
    unittest.main()
