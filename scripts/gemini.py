#!/usr/bin/env python3
"""A small, deliberately narrow client for Gemini.

Narrow on purpose. There is no `summarise`, no `explain`, no `generate` —
composing a sentence about a named issuer is the app speaking, and this
publisher is not licensed to speak. Adding a capability here should require an
argument, not an import.

Two are allowed, and the argument for each is the same shape: neither invents a
claim.

  * `choose` picks a label from a closed list, which is taxonomy.
  * `translate` renders somebody else's sentence in another language. It is
    applied only to headlines and filing titles — words the exchange or an
    outlet wrote — and never to this app's own analysis. The original is always
    kept beside the translation, and every result is cached into a file that
    ships in a commit, so a person can read what a model produced before it
    reaches a phone. The failure mode is a mistranslation of a third party's
    words, which is why the source text stays.

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
import re
import urllib.error
import urllib.request

REPO = pathlib.Path(__file__).resolve().parent.parent
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"

# Benchmarked on real Arabic disclosure headlines: 5/5 correct, 1.1s, one
# output token — against 3.0s and 511 tokens with thinking left on, for the
# identical answer. Output is the expensive side of the meter, so this single
# setting is the difference between pennies and tens of dollars.
MODEL = "gemini-3.5-flash"

# Translation gets the cheapest model in the generation, deliberately. Turning
# a headline into English is mechanical work — no reasoning, no judgement, a
# closed task with a right answer — and it is the highest-volume thing this
# pipeline does: every headline and filing title, every day. Paying the
# reasoning-model rate for it is the one place the meter would actually notice.
#
# It buys availability nowhere. Every model on this account, lite included,
# refuses with "prepayment credits are depleted" until credits are bought; the
# cheap model only makes the bill smaller once they are.
TRANSLATE_MODEL = "gemini-3.5-flash-lite"
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


def translate(texts: list[str], *, model: str = TRANSLATE_MODEL) -> dict[str, str]:
    """Arabic in, English out, keyed by the original string.

    Batched, because the meter charges per call as well as per token and these
    are one-line headlines. Numbered in and numbered out so a dropped or
    reordered line is detectable rather than silently attached to the wrong
    story — anything that does not come back cleanly numbered is simply absent
    from the result, and the caller keeps the Arabic.
    """
    texts = [t for t in dict.fromkeys(texts) if t.strip()]
    if not texts:
        return {}

    numbered = "\n".join(f"{i + 1}. {t}" for i, t in enumerate(texts))
    prompt = (
        "Translate each numbered Arabic line into natural English.\n"
        "Rules: keep the meaning exactly; do not summarise, explain or add "
        "anything; keep company names, tickers and numbers as they are; "
        "translate a headline as a headline.\n"
        "Reply with the same numbering, one line each, and nothing else.\n\n"
        + numbered
    )

    body = json.dumps(
        {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": 8000,
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
        payload = json.loads(urllib.request.urlopen(request, timeout=120).read())
    except urllib.error.HTTPError as error:
        # The quota response carries "Please retry in 51.9s". Passing that back
        # is the difference between a backoff that guesses and one that knows.
        detail = ""
        try:
            detail = error.read().decode()
        except Exception:
            pass
        raise GeminiUnavailable(f"HTTP {error.code}: {detail[:400]}") from error
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
        raise GeminiUnavailable(str(error)[:120]) from error

    candidates = payload.get("candidates") or []
    if not candidates:
        return {}
    parts = candidates[0].get("content", {}).get("parts", [])
    answer = "".join(p.get("text", "") for p in parts)

    out: dict[str, str] = {}
    for line in answer.splitlines():
        line = line.strip()
        match = re.match(r"^(\d+)[.)]\s*(.+)$", line)
        if not match:
            continue
        index = int(match.group(1)) - 1
        english = match.group(2).strip()
        if 0 <= index < len(texts) and english:
            out[texts[index]] = english
    return out


def available() -> bool:
    try:
        _key()
        return True
    except GeminiUnavailable:
        return False
