#!/usr/bin/env python3
"""Download F5-protected PDFs after ephemeral browser warm-ups per batch.

The browser exists only long enough to execute the site's TSPD challenge. Its
cookies stay in memory and are immediately reused by concurrent HTTP requests
from the same machine and user agent. Interrupted PDF bytes are retained in a
sidecar and resumed after a fresh warm-up. No browser profile or cookie file is
retained.

This helper runs under the repository's Scrapling environment because the
normal builder Python deliberately has no browser dependencies.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import pathlib
import time


HOME = "https://www.egx.com.eg/"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
)
CHROME = pathlib.Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
TRANSFER_PROTOCOLS = ("v3", "v2", "v1")
TRANSFER_TIMEOUT = 240


def _warm_tspd() -> list[dict]:
    """Execute the F5 JavaScript challenge and return its short-lived cookies."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        launch = {
            "headless": True,
            "args": ["--disable-blink-features=AutomationControlled"],
        }
        if CHROME.exists():
            launch["executable_path"] = str(CHROME)
        browser = playwright.chromium.launch(**launch)
        try:
            context = browser.new_context(
                user_agent=USER_AGENT,
                locale="en-US",
                timezone_id="Africa/Cairo",
            )
            page = context.new_page()
            page.goto(HOME, wait_until="domcontentloaded", timeout=30_000)
            deadline = time.monotonic() + 20
            while time.monotonic() < deadline:
                cookies = context.cookies()
                names = {cookie["name"] for cookie in cookies}
                # The challenge intentionally redirects while this loop is
                # polling. Reading content during that instant raises even
                # though the solve is progressing normally.
                try:
                    body = page.content()
                except Exception:
                    page.wait_for_timeout(100)
                    continue
                if (
                    "homepage.aspx" in page.url.lower()
                    and "TSPD_101" in names
                    and not ("bobcmn" in body and "TSPD" in body)
                ):
                    return cookies
                page.wait_for_timeout(250)
            raise RuntimeError("F5 TSPD challenge did not settle")
        finally:
            browser.close()


def _valid_pdf(path: pathlib.Path) -> bool:
    if not path.is_file() or path.stat().st_size < 10_000:
        return False
    with path.open("rb") as handle:
        return handle.read(4) == b"%PDF"


def _partial_path(output: pathlib.Path) -> pathlib.Path:
    return output.with_name(output.name + ".part")


def _download_one(job: dict, cookies: list[dict], http_version: str) -> dict:
    from curl_cffi import requests

    url = str(job["url"])
    output = pathlib.Path(job["output"])
    output.parent.mkdir(parents=True, exist_ok=True)
    partial = _partial_path(output)
    if _valid_pdf(output):
        return {
            "url": url, "output": str(output), "bytes": output.stat().st_size,
            "seconds": 0, "protocol": "cached", "ok": True,
        }
    output.unlink(missing_ok=True)
    if partial.exists() and not _valid_pdf(partial):
        partial.unlink(missing_ok=True)
    resume_at = partial.stat().st_size if partial.exists() else 0
    session = requests.Session(impersonate="chrome")
    for cookie in cookies:
        session.cookies.set(
            cookie["name"], cookie["value"],
            domain=cookie.get("domain"), path=cookie.get("path") or "/",
        )
    started = time.monotonic()
    try:
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/pdf,*/*;q=0.8",
            "Referer": HOME,
        }
        if resume_at:
            headers["Range"] = f"bytes={resume_at}-"
        response = session.get(
            url,
            headers=headers,
            timeout=TRANSFER_TIMEOUT,
            http_version=http_version,
            stream=True,
        )
        if response.status_code == 416 and _valid_pdf(partial):
            partial.replace(output)
            return {
                "url": url, "output": str(output), "bytes": output.stat().st_size,
                "seconds": round(time.monotonic() - started, 3),
                "protocol": http_version, "resumed": True, "ok": True,
            }
        if resume_at and response.status_code == 206:
            mode = "ab"
        elif response.status_code == 200:
            # Some origins ignore Range. Restarting is safe; appending a full
            # response to a partial PDF would silently corrupt the document.
            resume_at = 0
            mode = "wb"
        else:
            raise RuntimeError(
                f"HTTP {response.status_code} did not return a PDF transfer"
            )

        expected_total = None
        if response.status_code == 206:
            content_range = response.headers.get("content-range") or ""
            total = content_range.rsplit("/", 1)[-1]
            if total.isdigit():
                expected_total = int(total)
        else:
            content_length = response.headers.get("content-length") or ""
            if content_length.isdigit():
                expected_total = int(content_length)

        first = True
        with partial.open(mode) as handle:
            for chunk in response.iter_content(chunk_size=256 * 1024):
                if not chunk:
                    continue
                if first and resume_at == 0 and chunk[:4] != b"%PDF":
                    handle.close()
                    partial.unlink(missing_ok=True)
                    raise RuntimeError(
                        f"HTTP {response.status_code} returned non-PDF bytes"
                    )
                first = False
                handle.write(chunk)
        if not _valid_pdf(partial):
            raise RuntimeError("transfer ended without a complete PDF header")
        if expected_total is not None and partial.stat().st_size != expected_total:
            raise RuntimeError(
                f"transfer ended at {partial.stat().st_size} of {expected_total} bytes"
            )
        partial.replace(output)
        return {
            "url": url,
            "output": str(output),
            "bytes": output.stat().st_size,
            "seconds": round(time.monotonic() - started, 3),
            "protocol": http_version,
            "resumed": bool(resume_at),
            "ok": True,
        }
    except Exception as error:
        partial_bytes = partial.stat().st_size if partial.exists() else 0
        return {
            "url": url, "output": str(output), "ok": False,
            "protocol": http_version, "partial_bytes": partial_bytes,
            "error": str(error),
        }
    finally:
        session.close()


def download_batches(jobs: list[dict], batch_size: int = 6) -> list[dict]:
    """Race each batch, resuming failures after fresh warm-ups."""
    results: list[dict] = []
    for offset in range(0, len(jobs), batch_size):
        batch = jobs[offset:offset + batch_size]
        pending = list(batch)
        latest: dict[str, dict] = {}
        for http_version in TRANSFER_PROTOCOLS:
            if not pending:
                break
            cookies = None
            last_error: Exception | None = None
            for _ in range(2):
                try:
                    cookies = _warm_tspd()
                    break
                except Exception as error:
                    last_error = error
            if cookies is None:
                for job in pending:
                    latest[str(job["url"])] = {
                        "url": job["url"], "output": job["output"], "ok": False,
                        "protocol": http_version,
                        "error": f"F5 warm-up failed after 2 attempts: {last_error}",
                    }
                continue
            with concurrent.futures.ThreadPoolExecutor(max_workers=len(pending)) as pool:
                attempt = list(pool.map(
                    lambda job: _download_one(job, cookies, http_version), pending
                ))
            latest.update({str(item["url"]): item for item in attempt})
            pending = [
                job for job in pending
                if not latest[str(job["url"])].get("ok")
            ]
        results.extend(latest[str(job["url"])] for job in batch)
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=pathlib.Path,
                        help="JSON list of {url, output} objects")
    parser.add_argument("--batch-size", type=int, default=6)
    args = parser.parse_args()
    jobs = json.loads(args.manifest.read_text(encoding="utf-8"))
    if not isinstance(jobs, list):
        raise SystemExit("manifest must contain a JSON list")
    results = download_batches(jobs, max(1, min(args.batch_size, 8))) if jobs else []
    print(json.dumps(results))
    return 0 if all(item.get("ok") for item in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
