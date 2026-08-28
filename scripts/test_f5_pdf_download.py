import pathlib
import tempfile
import unittest
from unittest import mock

import f5_pdf_download as F5


class ResumableDownloaderTest(unittest.TestCase):
    def test_partial_path_stays_next_to_the_requested_output(self):
        output = pathlib.Path("/tmp/example.pdf")
        self.assertEqual(F5._partial_path(output), pathlib.Path("/tmp/example.pdf.part"))

    def test_pdf_header_check_rejects_small_or_non_pdf_files(self):
        with tempfile.TemporaryDirectory() as folder:
            path = pathlib.Path(folder) / "statement.pdf.part"
            path.write_bytes(b"not a pdf" * 2000)
            self.assertFalse(F5._valid_pdf(path))
            path.write_bytes(b"%PDF" + b"0" * 10_000)
            self.assertTrue(F5._valid_pdf(path))

    def test_failed_jobs_fall_through_protocols_without_retrying_successes(self):
        jobs = [
            {"url": "https://example.test/a.pdf", "output": "/tmp/a.pdf"},
            {"url": "https://example.test/b.pdf", "output": "/tmp/b.pdf"},
        ]
        calls = []

        def download(job, cookies, protocol):
            calls.append((job["url"], protocol))
            ok = job["url"].endswith("a.pdf") or protocol == "v2"
            return {"url": job["url"], "output": job["output"], "ok": ok}

        with mock.patch.object(F5, "_warm_tspd", return_value=[]), mock.patch.object(
            F5, "_download_one", side_effect=download
        ):
            result = F5.download_batches(jobs, batch_size=2)

        self.assertTrue(all(item["ok"] for item in result))
        self.assertEqual(
            sorted(calls),
            sorted([
                (jobs[0]["url"], "v3"),
                (jobs[1]["url"], "v3"),
                (jobs[1]["url"], "v2"),
            ]),
        )


if __name__ == "__main__":
    unittest.main()
