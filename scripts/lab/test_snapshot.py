import json
import pathlib
import unittest

import snapshot


class SnapshotTest(unittest.TestCase):
    def test_bad_gemini_payload_is_an_abstention_not_a_pipeline_crash(self):
        import rerank
        self.assertEqual(rerank.parse('{"scores": [1, 2]}', ['AAA'])["scores"], {})
        self.assertEqual(rerank.parse('{"scores": {"AAA": NaN}}', ['AAA'])["scores"], {})

    def bundle(self):
        top5 = {"horizons": [1, 5, 20], "models": {}, "builtAt": "one"}
        picks = {"latestSession": "2026-09-15", "horizons": [1, 5, 20]}
        scenes = {"basisSession": "2026-09-14", "horizons": [1, 5, 20],
                  "companies": {"AAA": {}},
                  "rerank": {"readings": {"news": {"layers": ["news"]}}}}
        readings = {"news": {"key": "news", "layers": ["news"],
                    "basisSession": "2026-09-14", "scores": {"AAA": 23}, "forecastHorizon": 5}}
        return top5, picks, scenes, readings

    def test_stable_identity_and_content_tampering(self):
        bundle = self.bundle()
        identity = snapshot.stamp(*bundle)
        snapshot.validate(*bundle)
        bundle[0]["builtAt"] = "two"
        self.assertEqual(snapshot.stamp(*bundle), identity)
        bundle[3]["news"]["scores"]["AAA"] = 24
        with self.assertRaisesRegex(ValueError, "publication ID"):
            snapshot.validate(*bundle)

    def test_mixed_missing_or_stale_reading_is_rejected(self):
        for change in [lambda b: b[3].clear(),
                       lambda b: b[3]["news"].update(basisSession="2026-09-13"),
                       lambda b: b[3]["news"].update(key="filings"),
                       lambda b: b[3]["news"].update(layers=["filings"]),
                       lambda b: b[3]["news"].update(scores={"OTHER": 3}),
                       lambda b: b[3]["news"].update(scores={"AAA": float('nan')}),
                       lambda b: b[3]["news"].update(scores={"AAA": True}),
                       lambda b: b[3]["news"].update(scores={"AAA": 101})]:
            b = self.bundle()
            change(b)
            with self.assertRaises((ValueError, TypeError)):
                snapshot.stamp(*b)

    def test_empty_refused_reading_is_preserved_not_replaced(self):
        bundle = self.bundle()
        bundle[3]["news"].update(scores={}, answered=0, abstentions={"timeout": 1})
        snapshot.stamp(*bundle)
        snapshot.validate(*bundle)

    def test_current_published_bundle_is_semantically_consistent(self):
        root = pathlib.Path(__file__).resolve().parents[2] / "public/data/v1"
        read = lambda path: json.loads(path.read_text())
        snapshot.validate(read(root / "research/top5.json"), read(root / "lab/picks.json"),
                          read(root / "lab/scenarios.json"),
                          {p.stem: read(p) for p in (root / "lab/rerank").glob('*.json')},
                          require_id=False)

    def test_ci_never_commits_unverified_or_overwrites_conflicting_records(self):
        workflow = (pathlib.Path(__file__).resolve().parents[2] / '.github/workflows/lab-nightly.yml').read_text()
        commit_step = workflow.split('- name: Commit the run')[1]
        for step in ('tests', 'publish', 'verify', 'snapshot'):
            self.assertIn(f"steps.{step}.outcome == 'success'", commit_step)
        self.assertNotIn('checkout --theirs', commit_step)
        self.assertIn('scripts/lab/snapshot.py', commit_step)
        self.assertIn('actions/upload-artifact@v4', workflow)


if __name__ == '__main__':
    unittest.main()
