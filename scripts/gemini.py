#!/usr/bin/env python3
"""A small, deliberately narrow client for Gemini.

Narrow on purpose. This exposes one function — pick a label from a closed list
— because that is the only thing the design lets a model do to a named issuer
(see the AI plan, and spec §8). There is no `summarise`, no `explain`, no
`generate`. Adding one should require an argument, not an import.

Configuration lives in `.env` at the repo root as `GEMINI_API_KEY`, which is
gitignored. Nothing here reads a key from anywhere else, and nothing here runs
on a device — every call happens at build time, so its output lands in a git
commit that a person can review before it reaches a phone.

The key is a Vertex Express key restricted to the **Gemini API**; an
account-bound key can be allowed on that or on Agent Platform but not both,
and the Agent Platform path returns BILLING_DISABLED regardless of billing.
"""

from __future__ import annotations

import json
import os
import pathlib
import urllib.error
import urllib.request

REPO = pathlib.Path(__file__).resolve().parent.parent
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"

# Benchmarked on real Arabic disclosure headlines: 5/5 correct, 1.1s, one
# output token — against 3.0s and 511 tokens with thinking left on, for the
# identical answer. Output is the expensive side of the meter, so this single
# setting is the difference between pennies and tens of dollars.
MODEL = "gemini-3.5-flash"
THINKING_OFF = {"thinkingConfig": {"thinkingBudget": 0}}


class GeminiUnavailable(RuntimeError):
    """No key, or the API refused. Callers fall back to their own rules."""


def _key() -> str:
    if env := os.environ.get("GEMINI_API_KEY"):
        return env
    path = REPO / ".env"
    if path.exists():
        for line in path.read_text().splitlines():
            if line.startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise GeminiUnavailable("no GEMINI_API_KEY in the environment or .env")


def choose(prompt: str, allowed: list[str], *, model: str = MODEL) -> str | None:
    """Return one label from `allowed`, or None.

    None on anything unexpected — a refusal, an empty response, a label that is
    not on the list. A caller that cannot tell "the model said other" from "the
    model said something we do not recognise" will eventually publish the
    latter, so this collapses both into a miss the caller must handle.
    """
    body = json.dumps(
        {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0,
                # Generous even though one token is expected: a thinking model
                # with a tight cap spends the budget reasoning and returns an
                # empty parts array with no error at all.
                "maxOutputTokens": 2000,
                **THINKING_OFF,
            },
        }
    ).encode()

    request = urllib.request.Request(
        ENDPOINT.format(model),
        data=body,
        headers={"x-goog-api-key": _key(), "content-type": "application/json"},
    )
    try:
        payload = json.loads(urllib.request.urlopen(request, timeout=60).read())
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
        raise GeminiUnavailable(str(error)[:120]) from error

    candidates = payload.get("candidates") or []
    if not candidates:
        return None
    parts = candidates[0].get("content", {}).get("parts", [])
    answer = "".join(p.get("text", "") for p in parts).strip().lower()
    # Trim the punctuation and stray words a model wraps a one-word answer in
    # — a trailing full stop was enough to reject an otherwise correct label —
    # then require exact membership. Still exact: a prefix match would let
    # "capital" stand in for "capital_increase", which are different events.
    answer = answer.strip(" .\n\t`\"'")
    if answer in allowed:
        return answer
    for token in answer.replace("\n", " ").split():
        token = token.strip(" .,`\"'")
        if token in allowed:
            return token
    return None


def available() -> bool:
    try:
        _key()
        return True
    except GeminiUnavailable:
        return False
