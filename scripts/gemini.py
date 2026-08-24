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

TWO BILLING PATHS, AND ONLY ONE OF THEM CAN SPEND THE FREE CREDITS
------------------------------------------------------------------
These are different products that both answer to the name "Gemini":

  * **AI Studio** (`generativelanguage.googleapis.com`) takes an API key and
    spends *prepay credits you buy inside AI Studio*.
  * **Vertex AI** (`aiplatform.googleapis.com`) takes an OAuth token and spends
    the *Google Cloud billing account* — which is where a $300 free-trial grant
    actually sits.

The free credits cannot be spent through AI Studio. That is the whole reason
every model on this project answered "prepayment credits are depleted" while
$300 sat unused: the pipeline was asking the one endpoint the money could not
reach. So Vertex is tried first and the API key is the fallback.

Location matters as much as the model: `us-central1` serves none of the current
Gemini flash models to this project, and `global` serves all of them. A wrong
region reports itself as "Publisher model ... was not found", which reads like
a bad model name and is not one.
"""

from __future__ import annotations

import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

REPO = pathlib.Path(__file__).resolve().parent.parent
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"

# Vertex, the path the Cloud billing account can actually pay for.
VERTEX_ENDPOINT = (
    "https://aiplatform.googleapis.com/v1beta1/projects/{project}"
    "/locations/global/publishers/google/models/{model}:generateContent"
)
VERTEX_PROJECT_ENV = "GOOGLE_CLOUD_PROJECT"
# A new project's per-minute quota is easily tripped by a tight loop, and the
# answer to that is to wait rather than to give up on the endpoint that is
# actually funded.
VERTEX_ATTEMPTS = 3
VERTEX_BACKOFF = 4
OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"

# Benchmarked on real Arabic disclosure headlines: 5/5 correct, 1.1s, one
# output token — against 3.0s and 511 tokens with thinking left on, for the
# identical answer. Output is the expensive side of the meter, so `THINKING_OFF`
# below is the difference between pennies and tens of dollars.
#
# 3.7 rather than 3.5 because it is **cheaper on both sides of the meter**, not
# merely newer: $0.75/$3.75 per million in/out against 3.5's $1.50/$9.00. The
# 3.7 figure is introductory and rises to $1.50/$7.50 on 1 Jan 2027 — still at
# parity on input and cheaper on output, which is the side this workload
# actually spends.
MODEL = "gemini-3.7-flash"

# Translation gets the cheapest model in the generation, deliberately. Turning
# a headline into English is mechanical work — no reasoning, no judgement, a
# closed task with a right answer — and it is the highest-volume thing this
# pipeline does: every headline and filing title, every day. Paying the
# reasoning-model rate for it is the one place the meter would actually notice.
#
# Kept on `-lite` rather than moved to 3.7: there is no 3.7 lite, and this is
# the highest-volume call in the pipeline. Paying a reasoning model's rate to
# render a headline in English is the one place the meter would notice.
TRANSLATE_MODEL = "gemini-3.5-flash-lite"
THINKING_OFF = {"thinkingConfig": {"thinkingBudget": 0}}


class GeminiUnavailable(RuntimeError):
    """No key, or the API refused. Callers fall back to their own rules."""


def _vertex_project() -> str | None:
    """The Cloud project to bill, from the environment or from ADC itself."""
    if env := os.environ.get(VERTEX_PROJECT_ENV):
        return env.strip()
    adc = _adc_document()
    return (adc or {}).get("quota_project_id")


def _adc_document() -> dict | None:
    """Application Default Credentials, if this machine has any.

    Read as a file rather than shelled out to `gcloud`, because the build runs
    on machines that have the credentials and not the CLI.
    """
    explicit = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    candidates = [pathlib.Path(explicit)] if explicit else []
    candidates.append(
        pathlib.Path.home() / ".config" / "gcloud"
        / "application_default_credentials.json"
    )
    for path in candidates:
        try:
            if path.exists():
                return json.loads(path.read_text())
        except (OSError, ValueError):
            continue
    return None


def _access_token() -> str | None:
    """An OAuth token for Vertex, or None if this machine cannot mint one.

    Three sources, cheapest first. A pre-minted token in the environment is how
    CI passes one in without a key file; otherwise a stored refresh token is
    exchanged directly against Google's token endpoint, which needs no SDK and
    no `gcloud` on the box.
    """
    if token := os.environ.get("GOOGLE_VERTEX_ACCESS_TOKEN"):
        return token.strip()

    adc = _adc_document()
    if not adc or adc.get("type") != "authorized_user":
        return None
    form = urllib.parse.urlencode({
        "client_id": adc.get("client_id", ""),
        "client_secret": adc.get("client_secret", ""),
        "refresh_token": adc.get("refresh_token", ""),
        "grant_type": "refresh_token",
    }).encode()
    request = urllib.request.Request(
        OAUTH_TOKEN_URL,
        data=form,
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    try:
        payload = json.loads(urllib.request.urlopen(request, timeout=30).read())
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        return None
    return payload.get("access_token")


def _note_vertex(code: int | None, detail: str) -> None:
    """Say why Vertex was abandoned, once per reason.

    The fallback used to swallow this. That is how a rate limit and an expired
    token and a disabled API all present as the same thing — "Gemini is down"
    — which is exactly the confusion that let a depleted API key look like a
    broken pipeline for weeks.
    """
    reason = f"{code or 'transport'}: {detail.strip()[:150]}"
    if reason in _VERTEX_NOTED:
        return
    _VERTEX_NOTED.add(reason)
    print(f"   vertex unavailable ({reason}) — falling back to the API key",
          file=sys.stderr)


_VERTEX_NOTED: set[str] = set()


def _post(model: str, body: bytes, *, timeout: int) -> dict:
    """One generateContent call, over whichever transport is paid for.

    Vertex first, because that is the endpoint the Cloud billing account — and
    therefore any free-credit grant — can settle. The API key is the fallback,
    and it is genuinely a fallback rather than a preference: it bills a
    separate prepay balance that a Cloud grant never touches.
    """
    token = _access_token()
    project = _vertex_project()
    if token and project:
        for attempt in range(VERTEX_ATTEMPTS):
            request = urllib.request.Request(
                VERTEX_ENDPOINT.format(project=project, model=model),
                data=body,
                headers={
                    "authorization": f"Bearer {token}",
                    "content-type": "application/json",
                    # ADC without a quota project is refused outright by Vertex.
                    "x-goog-user-project": project,
                },
            )
            try:
                return json.loads(
                    urllib.request.urlopen(request, timeout=timeout).read()
                )
            except urllib.error.HTTPError as error:
                # 429 here is a per-minute quota on the project, not an empty
                # wallet — three calls fired back to back will trip it. Waiting
                # is the fix; falling through to the API key would swap a
                # transient limit for a permanently dead endpoint.
                if error.code == 429 and attempt < VERTEX_ATTEMPTS - 1:
                    time.sleep(VERTEX_BACKOFF * (attempt + 1))
                    continue
                _note_vertex(error.code, error.read()[:200].decode("utf-8", "ignore"))
                break
            except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
                _note_vertex(None, str(error)[:120])
                break

    request = urllib.request.Request(
        ENDPOINT.format(model),
        data=body,
        headers={"x-goog-api-key": _key(), "content-type": "application/json"},
    )
    try:
        return json.loads(urllib.request.urlopen(request, timeout=timeout).read())
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
        raise GeminiUnavailable(str(error)[:120]) from error


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

    payload = _post(model, body, timeout=60)

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
    try:
        payload = _post(model, body, timeout=120)
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
    """True when either transport can be reached.

    A machine with Cloud credentials and no API key is fully configured — the
    key is the fallback, not the requirement.
    """
    if _access_token() and _vertex_project():
        return True
    try:
        _key()
        return True
    except GeminiUnavailable:
        return False
