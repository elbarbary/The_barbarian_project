#!/usr/bin/env python3
"""Download F5-protected PDFs after one ephemeral browser warm-up per batch.

The browser exists only long enough to execute the site's TSPD challenge. Its
cookies stay in memory and are immediately reused by concurrent HTTP/3
requests from the same machine and user agent. No browser profile or cookie
file is retained.

This helper runs under the repository's Scrapling environment because the
normal builder Python deliberately has no browser dependencies.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import pathlib
import tempfile
import time


HOME = "https://www.egx.com.eg/"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
)
CHROME = pathlib.Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")


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


def _download_one(job: dict, cookies: list[dict]) -> dict:
    from curl_cffi import requests

    url = str(job["url"])
    output = pathlib.Path(job["output"])
    session = requests.Session(impersonate="chrome")
    for cookie in cookies:
        session.cookies.set(
            cookie["name"], cookie["value"],
            domain=cookie.get("domain"), path=cookie.get("path") or "/",
        )
    started = time.monotonic()
    try:
        response = session.get(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/pdf,*/*;q=0.8",
                "Referer": HOME,
            },
            # Several scanned EGX statements are 10-20 MB and the exchange
            # can deliver them at well under 200 KB/s.  Ninety seconds cut
            # off otherwise valid transfers after most bytes had arrived.
            timeout=240,
            http_version="v3",
        )
        data = response.content
        if response.status_code != 200 or data[:4] != b"%PDF" or len(data) < 10_000:
            raise RuntimeError(
                f"HTTP {response.status_code} returned {len(data)} non-PDF bytes"
            )
        output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=output.parent, delete=False) as handle:
            handle.write(data)
            staged = pathlib.Path(handle.name)
        staged.replace(output)
        return {
            "url": url,
            "output": str(output),
            "bytes": len(data),
            "seconds": round(time.monotonic() - started, 3),
            "ok": True,
        }
    except Exception as error:
        output.unlink(missing_ok=True)
        return {"url": url, "output": str(output), "ok": False, "error": str(error)}
    finally:
        session.close()


def download_batches(jobs: list[dict], batch_size: int = 6) -> list[dict]:
    """Warm once, then race each batch before its TSPD cookie expires."""
    results: list[dict] = []
    for offset in range(0, len(jobs), batch_size):
        batch = jobs[offset:offset + batch_size]
        cookies = None
        last_error: Exception | None = None
        for _ in range(2):
            try:
                cookies = _warm_tspd()
                break
            except Exception as error:
                last_error = error
        if cookies is None:
            results.extend({
                "url": job["url"], "output": job["output"], "ok": False,
                "error": f"F5 warm-up failed after 2 attempts: {last_error}",
            } for job in batch)
            continue
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(batch)) as pool:
            results.extend(pool.map(lambda job: _download_one(job, cookies), batch))
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
