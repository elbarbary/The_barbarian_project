#!/usr/bin/env python3
"""Arabic to English through Cloud Translation.

The purpose-built tool, and for this job a better fit than a language model.

  * **It is free at our volume.** 500,000 characters a month, and roughly a
    hundred and twenty headlines plus thirty-six filing titles a day is about
    four hundred thousand. Past that it is $20 a million characters, so the
    worst case is a couple of dollars.
  * **It bills the project directly**, with no prepay pool in between — which is
    what stopped the Gemini path working. That failure is not project-specific
    and it is worth recording how far it was chased: a second Google account,
    a brand-new project, the API freshly enabled and a brand-new restricted key
    all returned the same "Your prepayment credits are depleted." So the Gemini
    API here is gated behind buying credits, and no amount of re-provisioning
    moves it. This service is metered separately and does not touch that pool.
  * **It cannot be talked into anything.** A translation endpoint takes text and
    returns text. There is no prompt to drift, no numbering to slip, and no
    chance of it answering a headline instead of translating it — which is a
    real failure mode when a model is handed a question as input.

It also keeps tickers intact: "(MOSC.CA)" survives, which a paraphrasing model
does not reliably do.

The same API key as `gemini.py`, restricted to both services.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

import gemini
import transport

ENDPOINT = "https://translation.googleapis.com/language/translate/v2"

# The API accepts many `q` values per call and the meter counts characters, not
# calls — so this is sized to keep the request body sane rather than to save
# quota. Headlines are one line each.
BATCH = 50


class TranslateUnavailable(RuntimeError):
    """No key, or the API refused. The caller keeps the Arabic."""


def available() -> bool:
    """Whether THIS service can be called — which is not `gemini.available()`.

    That function is true when either a Vertex token or an API key is present,
    because the models it serves accept either. Cloud Translation is a REST
    endpoint that takes `?key=` and nothing else, so a machine holding only a
    Vertex token can reach Gemini and cannot reach this.

    Answering `gemini.available()` here took the news feed down for two hours
    on 6 Sep 2026. Handing publish-live-data.yml a Vertex token — so it could
    finally write news insights — made this return True on a runner with no
    API key, `translate()` raised `GeminiUnavailable` from inside the URL it
    was building, `english_for` was only catching `TranslateUnavailable`, and
    the exception came up through `build_news_api.main()` before it wrote
    `latest.json`. The step ends in `|| true`, so the run stayed green and the
    published feed simply stopped moving.
    """
    try:
        gemini._key()
        return True
    except gemini.GeminiUnavailable:
        return False


def translate(texts: list[str]) -> dict[str, str]:
    """Arabic string -> English, for as many as came back.

    Returned keyed by the original so a caller cannot mis-pair them: the API
    answers in request order, and trusting order across a batch boundary is how
    a headline ends up under the wrong story.
    """
    texts = [t for t in dict.fromkeys(texts) if t and t.strip()]
    if not texts:
        return {}

    # Belt and braces: whatever `available()` said, this module raises its own
    # exception type. A caller that guards on the wrong predicate gets a
    # refusal it knows how to handle, not one that escapes it.
    try:
        key = gemini._key()
    except gemini.GeminiUnavailable as error:
        raise TranslateUnavailable(str(error)) from error

    out: dict[str, str] = {}
    for start in range(0, len(texts), BATCH):
        batch = texts[start : start + BATCH]
        body = urllib.parse.urlencode(
            [("q", t) for t in batch]
            + [("source", "ar"), ("target", "en"), ("format", "text")]
        ).encode()
        request = urllib.request.Request(
            f"{ENDPOINT}?key={key}",
            data=body,
            headers={"content-type": "application/x-www-form-urlencoded"},
        )
        try:
            payload = json.loads(urllib.request.urlopen(request, timeout=120).read())
        except urllib.error.HTTPError as error:
            detail = ""
            try:
                detail = error.read().decode()
            except Exception:
                pass
            raise TranslateUnavailable(f"HTTP {error.code}: {detail[:300]}") from error
        except transport.TRANSPORT as error:
            raise TranslateUnavailable(str(error)[:160]) from error

        rendered = payload.get("data", {}).get("translations") or []
        # Only pair when the counts agree. A short response means something was
        # dropped, and pairing by index across a gap attaches the wrong English
        # to the wrong headline — silently, and permanently, because the result
        # is then cached.
        if len(rendered) != len(batch):
            raise TranslateUnavailable(
                f"asked for {len(batch)} translations, got {len(rendered)}"
            )
        for source, result in zip(batch, rendered):
            english = (result.get("translatedText") or "").strip()
            if english:
                out[source] = english
    return out
