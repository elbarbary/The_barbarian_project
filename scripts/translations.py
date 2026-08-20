#!/usr/bin/env python3
"""English for the Arabic the exchange and the outlets publish.

The app is Arabic-first, but its content is Arabic *only* — EGX files in Arabic
and most Egyptian outlets write in Arabic, so an English reader got an English
interface wrapped around text they could not read. This closes that.

**Cached, permanently.** A headline is translated once and the result is written
to `translations_en.json`, which is committed. The news feed rebuilds every
fifteen minutes and re-translating a hundred and twenty unchanged headlines each
time would cost real money for no new information. Cache hits cost nothing.

**Committed on purpose, not incidentally.** The file is the review surface: a
person can read exactly what a model produced before it ships, and correct a
line by editing it here. Nothing regenerates a string that already has an entry.

**Only somebody else's words.** Headlines and filing titles, never this app's
own analysis — see the argument in `gemini.py`. The Arabic is always kept beside
the English, so a reader who can check it, can.

**A machine is not required to fill it.** The store is a plain reviewed file, so
a hand translation is as valid an entry as a generated one — and for a while it
was the only kind available, after the Gemini project was denied access
outright. Entries are not marked by origin on purpose: every line is meant to be
read and corrected on its merits, not trusted because of where it came from.
"""

from __future__ import annotations

import json
import pathlib
import re
import time

import cloud_translate
import gemini

STORE = pathlib.Path(__file__).resolve().parent / "translations_en.json"

# The key meters against `generate_content_free_tier_requests`: **20 requests a
# minute**, not a token budget. So the thing to minimise is the number of calls,
# not their size — forty headlines in one request costs the same quota as one,
# and forty lines is still few enough that the numbering holds.
#
# When it does refuse, the response says "Please retry in 51.9s". Honouring the
# server's own number beats guessing at a backoff, which is what my first two
# attempts here did.
BATCH = 40
PAUSE = 4
ATTEMPTS = 4


def _retry_after(error: str) -> float | None:
    """The wait the server asked for, when it asked for one."""
    if "429" not in error:
        return None
    found = re.search(r"retry in ([\d.]+)s", error)
    return float(found.group(1)) if found else 55.0


# Arabic, and the ranges around it. Used only to answer "is this Arabic at all".
ARABIC = re.compile(r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]")


def needs_english(text: str) -> bool:
    """Whether this string is Arabic enough to be worth translating.

    A third of the feed is already published in English — Egyptian outlets run
    English desks, and EGX titles some filings in English. Those strings arrive
    here looking "untranslated" purely because they have no cache entry, and
    sending them to a translator is spend for a round trip that returns the
    input. Worse, an ar->en model handed English tends to paraphrase it.
    """
    return bool(ARABIC.search(text))


def _load() -> dict[str, str]:
    try:
        return json.loads(STORE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def _save(cache: dict[str, str]) -> None:
    STORE.write_text(
        json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True),
        encoding="utf-8",
    )


def english_for(texts: list[str], *, label: str = "strings") -> dict[str, str]:
    """Arabic string -> English, translating only what is not already cached.

    Returns whatever it has. A string the model dropped, or a run with no key
    or no network, simply has no entry and the caller keeps the Arabic — which
    is the pre-existing behaviour, not a new failure.
    """
    cache = _load()
    wanted = [t for t in dict.fromkeys(texts) if t and t.strip()]
    # Already-English strings are their own translation. They are not cached as
    # identity entries — that would bloat the review surface with lines nobody
    # needs to check — they are simply never asked for.
    missing = [t for t in wanted if t not in cache and needs_english(t)]

    if missing:
        # Cloud Translation first. It is the purpose-built service, it keeps
        # tickers like "(MOSC.CA)" intact, and it cannot be talked into
        # answering a headline instead of translating it. It needs billing on
        # the project; when there is none it refuses and we fall through.
        if missing and cloud_translate.available():
            try:
                rendered = cloud_translate.translate(missing)
                if rendered:
                    cache.update(rendered)
                    _save(cache)
                    missing = [t for t in missing if t not in cache]
                    print(f"   translated {len(rendered)} {label} "
                          f"via Cloud Translation")
            except cloud_translate.TranslateUnavailable as error:
                print(f"   cloud translation unavailable: "
                      f"{str(error).splitlines()[0][:100]}")

    if missing:
        if not gemini.available():
            print(f"   no key — {len(missing)} {label} stay Arabic")
        else:
            done = 0
            for start in range(0, len(missing), BATCH):
                if start:
                    time.sleep(PAUSE)
                batch = missing[start : start + BATCH]
                for attempt in range(ATTEMPTS):
                    try:
                        cache.update(gemini.translate(batch))
                        done += len(batch)
                        break
                    except gemini.GeminiUnavailable as error:
                        wait = _retry_after(str(error))
                        if wait and attempt < ATTEMPTS - 1:
                            print(f"   rate limited — waiting {wait:.0f}s")
                            time.sleep(wait + 2)
                            continue
                        # Give up on the rest: a partial cache is fine because
                        # the next run picks up exactly where this one stopped,
                        # and the untranslated items keep their Arabic.
                        print(f"   translation stopped after {done}: {error}")
                        _save(cache)
                        return {t: cache[t] for t in wanted if t in cache}
            _save(cache)
            fresh = sum(1 for t in missing if t in cache)
            print(f"   translated {fresh} new {label} "
                  f"({len(cache)} cached in total)")

    return {t: cache[t] for t in wanted if t in cache}
