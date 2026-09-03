#!/usr/bin/env python3
"""Say which meter the Gemini key is billing against, and whether it is paid.

Written because "translation stopped: HTTP 429" took a long investigation to
turn into a useful sentence, and the useful sentence was: *this key is not
billing the project that holds the credit*. That is worth one command.

It never prints the key. Length, prefix and a short hash are enough to tell two
keys apart, and none of the three can be used to make a call.

Usage:
    python3 scripts/check_gemini.py
"""

from __future__ import annotations

import hashlib
import json
import pathlib
import re
import sys
import urllib.error
import urllib.request
import transport

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import gemini  # noqa: E402

# The two key shapes, because they behave differently and the difference is the
# whole point of this script.
SHAPES = {
    "AIza": "AI Studio / Generative Language key",
    "AQ.": "Vertex AI Express Mode key",
}


def shape(key: str) -> str:
    for prefix, name in SHAPES.items():
        if key.startswith(prefix):
            return name
    return "unrecognised key format"


def main() -> int:
    try:
        key = gemini._key()
    except gemini.GeminiUnavailable as error:
        print(f"no key: {error}")
        return 1

    digest = hashlib.sha256(key.encode()).hexdigest()[:12]
    print("key")
    print(f"   shape       {shape(key)}")
    print(f"   length      {len(key)}")
    print(f"   fingerprint {digest}   (sha256 prefix — not the key)")

    print(f"\ncalling {gemini.MODEL}")
    body = json.dumps(
        {
            "contents": [{"role": "user", "parts": [{"text": "Reply with: ok"}]}],
            "generationConfig": {"maxOutputTokens": 20, **gemini.THINKING_OFF},
        }
    ).encode()
    request = urllib.request.Request(
        gemini.ENDPOINT.format(gemini.MODEL),
        data=body,
        headers={"x-goog-api-key": key, "content-type": "application/json"},
    )

    try:
        urllib.request.urlopen(request, timeout=60).read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode()
        print(f"   refused     HTTP {error.code}")
        # The quota metric names the tier outright. `free_tier` in it means the
        # project behind this key has no billing attached, whatever balance sits
        # on some other project.
        if metric := re.search(r"metric: (\S+)", detail):
            name = metric.group(1)
            print(f"   metric      {name}")
            if "free_tier" in name:
                print("\n   This key bills the FREE tier. Whatever credit exists")
                print("   is on a different project, and no call here draws on it.")
        if limit := re.search(r"limit: (\d+)", detail):
            print(f"   limit       {limit.group(1)} per minute")
        if wait := re.search(r"retry in ([\d.]+)s", detail):
            print(f"   retry in    {float(wait.group(1)):.0f}s")
        return 1
    except transport.TRANSPORT as error:
        print(f"   unreachable {str(error)[:120]}")
        return 1

    print("   accepted    the call went through")
    cache = pathlib.Path(__file__).resolve().parent / "translations_en.json"
    if cache.exists():
        try:
            print(f"\ntranslations cached: {len(json.loads(cache.read_text()))}")
        except (json.JSONDecodeError, OSError):
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
