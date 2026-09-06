#!/usr/bin/env python3
"""The model that writes news insights, and the two things that went wrong.

Run: python3 -m unittest discover -s scripts -p 'test_*.py'

`directive()` was the only §8 gate in front of these sentences, and it looks
for an instruction. It has nothing to say about a forecast, so one shipped:
"…potentially opening new revenue streams and export channels", about a named
company, on the news feed. `speculative()` is the check for that shape.

The second fault is quieter. A headline the model could not be asked about —
no credential, a rate limit — was written into the permanent cache as an empty
answer, and both paths in `enrich()` skip a headline already in the cache. One
unreachable minute blacklisted those headlines for good.
"""

from __future__ import annotations

import io
import json
import pathlib
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import macro_types  # noqa: E402
import news_insights  # noqa: E402


class SpeculativeTest(unittest.TestCase):
    """The claim §8 forbids and `directive()` cannot see."""

    FORECASTS = (
        # The sentence that shipped, and its Arabic half.
        "The discussions reflect an expansion of manufacturing capabilities, "
        "potentially opening new revenue streams and export channels.",
        "يساهم تعزيز التعاون الزراعي في فتح مسارات تجارية قد تدعم زيادة الصادرات.",
        "The acquisition will boost the group's margins over the coming year.",
        "Lower rates are expected to improve credit demand across the sector.",
        "Higher input costs may compress margins at the plant.",
        "The listing could unlock value for holders.",
        "من المتوقع أن تزيد الإيرادات بعد التشغيل الكامل للمصنع.",
        "من شأنه أن يعزز الطلب على منتجات الشركة.",
        "قد يرفع القرار أرباح البنوك في الربع المقبل.",
        # A claim about the security needs no change verb to be a forecast.
        "The share price may re-rate once the merger closes.",
    )

    # Every one of these is a fact, and a guard that refuses them makes the
    # feature useless — which is the failure mode of a word list. A scheduled
    # meeting is not a forecast because it contains "will".
    FACTS = (
        "The company reported a 12% rise in net profit for the year.",
        "Localizing vaccine production expands domestic manufacturing capacity.",
        "The general assembly will meet on 15 October to vote on the dividend.",
        "The capital increase raises the free float from 18% to 24%.",
        "Gold competes with the exchange for the same savings. When it rises "
        "hard, money that might have reached shares goes into metal instead.",
        "ارتفع صافي ربح الشركة بنسبة ١٢٪ خلال العام.",
        "يعقد اجتماع الجمعية العامة في ١٥ أكتوبر للتصويت على التوزيعات.",
        "تزيد الزيادة في رأس المال نسبة الأسهم الحرة من ١٨٪ إلى ٢٤٪.",
        "يوضح الإفصاح أن الشركة وقّعت عقداً لتوريد المعدات.",
    )

    def test_a_forecast_is_caught_in_either_language(self):
        for text in self.FORECASTS:
            with self.subTest(text=text[:60]):
                self.assertIsNotNone(macro_types.speculative(text),
                                     f"forecast let through: {text!r}")

    def test_a_fact_is_not_refused(self):
        for text in self.FACTS:
            with self.subTest(text=text[:60]):
                self.assertIsNone(macro_types.speculative(text),
                                  f"description wrongly refused: {text!r}")

    def test_the_two_halves_are_only_a_forecast_together(self):
        # Neither half can be banned on its own: "may" is ordinary English and
        # "revenue" is the subject matter. Banning either makes the guard a
        # word list, which is the thing this file exists to avoid.
        self.assertIsNone(macro_types.speculative("The plant may be idle in August."))
        self.assertIsNone(macro_types.speculative("Revenue rose to EGP 4.1bn."))
        self.assertIsNotNone(macro_types.speculative("Revenue may rise to EGP 4.1bn."))

    def test_the_published_glossary_survives_it(self):
        # The macro glossary is hand-written prose, and an over-eager guard run
        # over it is how three clear sentences got rewritten into worse ones.
        for key in macro_types.MACRO_TYPES:
            for text in (macro_types.chain(key), macro_types.chain_ar(key),
                         macro_types.meaning(key), macro_types.meaning_ar(key)):
                with self.subTest(key=key, text=text[:50]):
                    self.assertIsNone(macro_types.speculative(text))


def _reply(meaning, meaning_ar):
    return json.dumps({"meaning": meaning, "meaning_ar": meaning_ar}), None


class GenerateInsightTest(unittest.TestCase):
    """What the model is allowed to have written."""

    def test_a_forecast_is_refused_not_published(self):
        with mock.patch.object(news_insights.gemini, "available", return_value=True), \
             mock.patch.object(news_insights.gemini, "generate", return_value=_reply(
                 "The deal will boost revenue next year.", "من المتوقع أن تزيد الإيرادات.")), \
             redirect_stderr(io.StringIO()):
            result, why = news_insights.generate_insight("headline")
        self.assertIsNone(result)
        self.assertEqual(why, news_insights.REFUSED)

    def test_arabic_alone_is_enough_to_refuse(self):
        # Half the prose these produce is Arabic, and a guard that only reads
        # the English half is the bug `DIRECTIVE` already had once.
        with mock.patch.object(news_insights.gemini, "available", return_value=True), \
             mock.patch.object(news_insights.gemini, "generate", return_value=_reply(
                 "The plant adds a second production line.",
                 "من شأنه أن يعزز الطلب على منتجات الشركة.")), \
             redirect_stderr(io.StringIO()):
            result, why = news_insights.generate_insight("headline")
        self.assertIsNone(result)
        self.assertEqual(why, news_insights.REFUSED)

    def test_a_mechanism_in_the_present_tense_is_kept(self):
        with mock.patch.object(news_insights.gemini, "available", return_value=True), \
             mock.patch.object(news_insights.gemini, "generate", return_value=_reply(
                 "Localising production adds a second manufacturing line.",
                 "يضيف توطين الإنتاج خط تصنيع ثانياً.")):
            result, why = news_insights.generate_insight("headline")
        self.assertEqual(why, news_insights.OK)
        self.assertEqual(result[0], "Localising production adds a second manufacturing line.")

    def test_an_unreachable_model_is_not_a_refusal(self):
        with mock.patch.object(news_insights.gemini, "available", return_value=False):
            self.assertEqual(news_insights.generate_insight("headline")[1],
                             news_insights.UNREACHABLE)
        with mock.patch.object(news_insights.gemini, "available", return_value=True), \
             mock.patch.object(news_insights.gemini, "generate",
                               side_effect=RuntimeError("429 rate limited")), \
             redirect_stderr(io.StringIO()):
            self.assertEqual(news_insights.generate_insight("headline")[1],
                             news_insights.UNREACHABLE)


class CacheTest(unittest.TestCase):
    """A failure to reach the model is not an answer about the headline."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        store = pathlib.Path(self.tmp.name) / "news_insights.json"
        patch = mock.patch.object(news_insights, "STORE", store)
        patch.start()
        self.addCleanup(patch.stop)
        self.store = store

    def items(self):
        return [{"headline": "first story"}, {"headline": "second story"}]

    def read_store(self):
        return json.loads(self.store.read_text()) if self.store.exists() else {}

    def test_an_unreachable_run_leaves_no_trace_to_skip_later(self):
        # The regression. These headlines must still be askable tomorrow.
        items = self.items()
        with mock.patch.object(news_insights.gemini, "available", return_value=True), \
             mock.patch.object(news_insights.gemini, "generate",
                               side_effect=RuntimeError("429")), \
             redirect_stderr(io.StringIO()), redirect_stdout(io.StringIO()):
            news_insights.enrich(items, limit=5)
        self.assertEqual(self.read_store(), {},
                         "an unreachable model was cached as an answer")

        # Tomorrow, with the credential working, they are asked and filled.
        items = self.items()
        with mock.patch.object(news_insights.gemini, "available", return_value=True), \
             mock.patch.object(news_insights.gemini, "generate", return_value=_reply(
                 "The plant adds a line.", "يضيف المصنع خطاً.")), \
             redirect_stdout(io.StringIO()):
            news_insights.enrich(items, limit=5)
        self.assertEqual(items[0]["meaning"], "The plant adds a line.")
        self.assertEqual(len(self.read_store()), 2)

    def test_an_unreachable_model_stops_the_run_rather_than_asking_again(self):
        calls = []

        def blow_up(_prompt):
            calls.append(1)
            raise RuntimeError("429")

        with mock.patch.object(news_insights.gemini, "available", return_value=True), \
             mock.patch.object(news_insights.gemini, "generate", side_effect=blow_up), \
             redirect_stderr(io.StringIO()), redirect_stdout(io.StringIO()):
            news_insights.enrich(self.items(), limit=5)
        self.assertEqual(len(calls), 1, "it kept asking a model that cannot answer")

    def test_a_long_run_is_saved_as_it_goes(self):
        # A backfill is hundreds of paid calls over twenty minutes. Writing
        # once at the end means an interruption at call 190 buys nothing.
        items = [{"headline": f"story {n}"} for n in range(25)]
        seen = []

        def answer(_prompt):
            seen.append(1)
            if len(seen) == 15:      # the run dies mid-way
                raise KeyboardInterrupt
            return _reply(f"Line {len(seen)} adds capacity.", "يضيف خطاً.")

        with mock.patch.object(news_insights.gemini, "available", return_value=True), \
             mock.patch.object(news_insights.gemini, "generate", side_effect=answer), \
             redirect_stderr(io.StringIO()), redirect_stdout(io.StringIO()):
            with self.assertRaises(KeyboardInterrupt):
                news_insights.enrich(items, limit=25)
        self.assertGreaterEqual(len(self.read_store()), 10,
                                "an interrupted backfill kept none of its paid work")

    def test_a_refused_headline_is_asked_again_because_the_model_samples(self):
        # The first backfill refused four headlines, and re-asking one produced
        # a clean present-tense mechanism. Retiring a headline on one unlucky
        # draw throws away a story the feed could have explained.
        drew = []

        def unlucky_then_fine(_prompt):
            drew.append(1)
            if len(drew) == 1:
                return _reply("The deal will boost revenue.", "سوف تزيد الإيرادات.")
            return _reply("The plant adds a second line.", "يضيف المصنع خطاً ثانياً.")

        one = [{"headline": "first story"}]
        with mock.patch.object(news_insights.gemini, "available", return_value=True), \
             mock.patch.object(news_insights.gemini, "generate", side_effect=unlucky_then_fine), \
             redirect_stderr(io.StringIO()), redirect_stdout(io.StringIO()):
            news_insights.enrich(one, limit=5)
            self.assertNotIn("meaning", one[0], "a forecast reached a reader")
            again = [{"headline": "first story"}]
            news_insights.enrich(again, limit=5)

        self.assertEqual(again[0]["meaning"], "The plant adds a second line.")

    def test_a_headline_that_keeps_being_refused_is_eventually_left_alone(self):
        # The other half: a story that cannot be described without forecasting
        # must not be paid for on every run for the rest of time.
        calls = []

        def always_bad(_prompt):
            calls.append(1)
            return _reply("The deal will boost revenue.", "سوف تزيد الإيرادات.")

        for _ in range(news_insights.MAX_REFUSALS + 3):
            with mock.patch.object(news_insights.gemini, "available", return_value=True), \
                 mock.patch.object(news_insights.gemini, "generate", side_effect=always_bad), \
                 redirect_stderr(io.StringIO()), redirect_stdout(io.StringIO()):
                news_insights.enrich([{"headline": "first story"}], limit=5)

        self.assertEqual(len(calls), news_insights.MAX_REFUSALS,
                         "a hopeless headline is still being paid for")
        held = self.read_store()["first story"]
        self.assertEqual(held["refused"], news_insights.MAX_REFUSALS)
        self.assertFalse(held.get("meaning"))

    def test_an_old_boolean_refusal_still_has_attempts_left(self):
        # `refused` was a bool before it was a count. True == 1, so an entry
        # written by the old code is not read as "already exhausted".
        self.store.write_text(json.dumps(
            {"first story": {"meaning": "", "meaning_ar": "", "refused": True}}),
            encoding="utf-8")
        items = [{"headline": "first story"}]
        with mock.patch.object(news_insights.gemini, "available", return_value=True), \
             mock.patch.object(news_insights.gemini, "generate", return_value=_reply(
                 "The plant adds a line.", "يضيف المصنع خطاً.")), \
             redirect_stdout(io.StringIO()):
            news_insights.enrich(items, limit=5)
        self.assertEqual(items[0]["meaning"], "The plant adds a line.")

    def test_a_refused_sentence_is_never_served_to_a_reader(self):
        # Whatever the retry policy, the refused sentence itself never reaches
        # a reader: the store holds an empty meaning for it, and the fill pass
        # copies only entries that have one.
        self.store.write_text(json.dumps({
            "first story": {"meaning": "", "meaning_ar": "",
                            "refused": news_insights.MAX_REFUSALS},
        }), encoding="utf-8")
        items = [{"headline": "first story"}]
        with mock.patch.object(news_insights.gemini, "available", return_value=False), \
             redirect_stdout(io.StringIO()):
            news_insights.enrich(items, limit=5)
        self.assertNotIn("meaning", items[0],
                         "an exhausted refusal was served as an insight")

    def test_an_exhausted_headline_is_not_asked_again(self):
        self.store.write_text(json.dumps({
            "first story": {"meaning": "", "meaning_ar": "",
                            "refused": news_insights.MAX_REFUSALS},
        }), encoding="utf-8")
        with mock.patch.object(news_insights.gemini, "available", return_value=True), \
             mock.patch.object(news_insights.gemini, "generate",
                               side_effect=AssertionError("asked an exhausted headline")), \
             redirect_stdout(io.StringIO()):
            news_insights.enrich([{"headline": "first story"}], limit=5)


class CredentialTest(unittest.TestCase):
    """The job that writes the insights must be able to pay for them.

    Parsed with a regex rather than PyYAML, as `test_prices_workflow` does and
    for the same reason: the runner has no PyYAML, and a test that skips on the
    machine it protects is not a test.

    Both faults here were live. `publish-live-data.yml` is the only workflow
    that builds the news, and the only credential it offered was
    `GEMINI_API_KEY` — a secret that does not exist on this repository — so
    `gemini.available()` was false on every run it has ever made. And
    `google-github-actions/auth` mints an OIDC token, which needs
    `id-token: write`; the step is `continue-on-error`, so without that
    permission it fails in silence and the only symptom is a news feed whose
    stories carry no insight.
    """

    WORKFLOWS = pathlib.Path(__file__).resolve().parent.parent / ".github" / "workflows"

    def test_every_workflow_that_authenticates_may_request_a_token(self):
        for path in sorted(self.WORKFLOWS.glob("*.yml")):
            source = path.read_text(encoding="utf-8")
            if "google-github-actions/auth" not in source:
                continue
            with self.subTest(workflow=path.name):
                self.assertRegex(
                    source, r"(?m)^\s*id-token:\s*write",
                    f"{path.name} authenticates to Google Cloud but cannot "
                    "request an OIDC token, and the step fails silently")

    def test_the_news_build_is_given_the_credential_that_has_credit(self):
        source = (self.WORKFLOWS / "publish-live-data.yml").read_text(encoding="utf-8")
        step = source[source.index("- name: Fetch headlines and rates"):]
        step = step[:step.index("\n      - name:", 10)]
        self.assertIn("build_news_api.py", step, "the news is built elsewhere now")
        self.assertIn("GOOGLE_VERTEX_ACCESS_TOKEN", step,
                      "the news build cannot reach the credential that has credit")
        self.assertLess(source.index("- name: Authenticate to Google Cloud"),
                        source.index("- name: Fetch headlines and rates"),
                        "the token is minted after the step that needs it")


class PublishedInsightsTest(unittest.TestCase):
    """What is already in the cache, checked against the rule that is now on."""

    def test_no_cached_insight_makes_a_forecast(self):
        store = news_insights.load_store()
        offenders = []
        for headline, cached in store.items():
            for field in ("meaning", "meaning_ar"):
                text = cached.get(field) or ""
                broke = macro_types.speculative(text) or macro_types.directive(text)
                if broke:
                    offenders.append(f"{headline[:50]}… [{field}: {broke!r}]")
        self.assertEqual(offenders, [], "cached insights that break §8: "
                         + "; ".join(offenders))


if __name__ == "__main__":
    unittest.main()


class TranslationFallbackTest(unittest.TestCase):
    """The news document must be written even when nothing can translate.

    On 6 Sep 2026 the news feed froze for two hours and the runs stayed green.
    Giving `publish-live-data.yml` a Vertex token so it could write news
    insights made `cloud_translate.available()` — which answered
    `gemini.available()` — return True on a runner holding no API key. Cloud
    Translation takes `?key=` and nothing else, so `translate()` raised
    `GeminiUnavailable` while building the URL; `english_for` catches only
    `TranslateUnavailable`; and the exception reached `main()` before
    `latest.json` was written. `|| true` hid it.
    """

    def test_the_translator_reports_its_own_credential(self):
        import cloud_translate
        with mock.patch.object(cloud_translate.gemini, "_key",
                               side_effect=cloud_translate.gemini.GeminiUnavailable("no key")):
            self.assertFalse(cloud_translate.available(),
                             "it claims to be reachable without the key it uses")

    def test_a_missing_key_is_a_translate_refusal_not_a_gemini_one(self):
        # Whatever the caller guarded on, this module raises the type its
        # callers catch. This is the assertion that keeps the feed publishing.
        import cloud_translate
        with mock.patch.object(cloud_translate.gemini, "_key",
                               side_effect=cloud_translate.gemini.GeminiUnavailable("no key")):
            with self.assertRaises(cloud_translate.TranslateUnavailable):
                cloud_translate.translate(["عنوان عربي"])

    def test_headlines_stay_arabic_rather_than_stopping_the_build(self):
        import cloud_translate
        import translations
        with mock.patch.object(cloud_translate.gemini, "_key",
                               side_effect=cloud_translate.gemini.GeminiUnavailable("no key")), \
             mock.patch.object(translations.gemini, "available", return_value=False), \
             mock.patch.object(translations, "_load", return_value={}), \
             mock.patch.object(translations, "_save", lambda *a, **k: None), \
             redirect_stdout(io.StringIO()):
            rendered = translations.english_for(["عنوان عربي جديد"], label="headlines")
        self.assertEqual(rendered, {}, "it should return nothing, not raise")
