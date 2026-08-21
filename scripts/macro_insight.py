#!/usr/bin/env python3
"""A drafted line on what a macro reading means, checked before it ships.

The founder asked for the app to say what a number means for an ordinary
investor. This drafts that line with a model — and then treats the draft as a
suspect rather than an author.

**Why it is built this way.** §43 says no AI in V1, and the reason is not
squeamishness: this publisher holds no FRA licence, and a sentence about what
oil does to Egyptian industry is the strongest claim the app makes anywhere. A
model that writes "so industrials look attractive" has committed the one act
§8 forbids, and it will do it fluently and without warning. So:

  * The model may only **draft**, never publish. Every draft is written to
    `macro_insight.json`, which is committed, so a person reads it before a
    reader does — the same arrangement as the translation cache.
  * Every draft is **refused unless it passes the same guard the hand-written
    glossary passes**: no buy, sell, should, target, cheap, opportunity, avoid.
    A rejected draft is recorded with its reason rather than silently dropped,
    because a model that keeps reaching for advice is a thing worth seeing.
  * A reading with no accepted draft falls back to `macro_types`, which was
    written by a person and needs no permission from anybody.

So the app is never worse than the glossary and never publishes an unreviewed
model sentence. Today it is exactly the glossary, because the key has no
credits — which is a good way to find out that the fallback works.

Usage:
    python3 scripts/macro_insight.py [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import macro_types as glossary  # noqa: E402

STORE = pathlib.Path(__file__).resolve().parent / "macro_insight.json"

# What the model is allowed to be asked for. Deliberately narrow: it is given
# the numbers and the mechanism a person already wrote, and asked to join them
# for one reading. It is not asked what it thinks.
PROMPT = """You are writing one sentence for an Egyptian retail investor.

Series: {label}
Latest reading: {latest} {unit} on {as_of}
Previous reading: {previous}
Measured correlation with the EGX 30 index: {correlation}

The mechanism, already written and verified by an analyst:
{chain}

Write ONE sentence, at most 30 words, saying what this particular reading means
for somebody who holds Egyptian shares. State the mechanism and stop.

You must NOT: recommend buying or selling, say anything is cheap, expensive,
undervalued or an opportunity, predict a price, or suggest an action. Describe
what happens, never what to do. If the correlation is near zero, say the link
is weak rather than implying one.

Reply with the sentence only."""


def load() -> dict:
    try:
        return json.loads(STORE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"accepted": {}, "refused": {}}


def save(store: dict) -> None:
    STORE.write_text(
        json.dumps(store, ensure_ascii=False, indent=1, sort_keys=True),
        encoding="utf-8",
    )


def acceptable(text: str) -> str | None:
    """None when the draft is publishable, otherwise why it is not."""
    if not text or len(text.split()) > 45:
        return "empty or too long"
    lowered = text.lower()
    for word in glossary.FORBIDDEN:
        if word in lowered:
            return f"reaches for advice: {word!r}"
    # A model asked for one sentence that returns a list is not answering the
    # question it was asked, and the rest of the list is unreviewed.
    if text.count("\n") > 1:
        return "more than one sentence"
    return None


def key_for(series_id: str, as_of: str) -> str:
    """One draft per reading, not per series — the sentence is about the number."""
    return f"{series_id}@{as_of}"


def draft_for(entry: dict, correlation: dict | None) -> tuple[str | None, str]:
    """Ask the model for one line. Returns `(sentence, note)`."""
    import gemini

    if not gemini.available():
        return None, "no key"
    r = correlation.get("r") if correlation else None
    prompt = PROMPT.format(
        label=entry["label"],
        latest=entry["latest"],
        unit=entry["unit"],
        as_of=entry["as_of"],
        previous=entry.get("previous"),
        correlation=(
            f"{r:+.3f} over {correlation['sessions']} sessions"
            if r is not None
            else "not measured"
        ),
        chain=entry["chain"],
    )
    # `gemini` exposes `choose` and `translate`; the free-text call lives here
    # rather than in that module so the no-AI default stays the default.
    #
    # One handler around the whole attempt, because a failure raised *inside* a
    # narrower handler escapes it — which is how a 429 got out of here and took
    # the build with it, when the entire point of this function is that it can
    # fail and the glossary still ships.
    try:
        text = (_ask(prompt) or "").strip()
    except Exception as error:  # noqa: BLE001 - any failure means fall back
        return None, f"unavailable: {str(error)[:80]}"
    if not text:
        return None, "empty reply"
    why = acceptable(text)
    if why:
        return None, why
    return text, "ok"


def _ask(prompt: str) -> str | None:
    """One free-text completion, kept local to this file on purpose."""
    import json as _json
    import urllib.request

    import gemini

    body = _json.dumps(
        {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 120, **gemini.THINKING_OFF},
        }
    ).encode()
    request = urllib.request.Request(
        gemini.ENDPOINT.format(gemini.TRANSLATE_MODEL),
        data=body,
        headers={"x-goog-api-key": gemini._key(), "content-type": "application/json"},
    )
    payload = _json.loads(urllib.request.urlopen(request, timeout=60).read())
    parts = payload["candidates"][0]["content"].get("parts") or []
    return "".join(p.get("text", "") for p in parts)


def annotate(doc: dict, *, dry_run: bool = False) -> dict:
    """Attach `insight` to each series that has an accepted draft."""
    store = load()
    correlations = {c["id"]: c for c in doc.get("correlations") or []}
    fresh = 0

    for entry in doc.get("series") or []:
        key = key_for(entry["id"], entry["as_of"])
        if key in store["accepted"]:
            entry["insight"] = store["accepted"][key]
            continue
        if dry_run:
            continue
        text, note = draft_for(entry, correlations.get(entry["id"]))
        if text:
            store["accepted"][key] = text
            entry["insight"] = text
            fresh += 1
        else:
            store["refused"][key] = note

    if fresh or store["refused"]:
        save(store)
    print(f"   insight: {fresh} drafted, "
          f"{len(store['accepted'])} held, {len(store['refused'])} refused")
    return doc


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    macro = pathlib.Path(__file__).resolve().parent.parent / "public/data/v1/macro.json"
    try:
        doc = json.loads(macro.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"no macro document: {error}")
        return 1

    print("── Macro insight")
    annotate(doc, dry_run=args.dry_run)
    if not args.dry_run:
        macro.write_text(
            json.dumps(doc, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
