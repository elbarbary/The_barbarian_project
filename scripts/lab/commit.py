#!/usr/bin/env python3
"""Proving a forecast was made before its outcome existed.

WHAT A COMMITMENT HAS TO SURVIVE
--------------------------------
The claim the Arena eventually makes is "these models said this, and then
this happened". Every cheap version of that claim fails the same way: it is
made by the same person who could have changed the forecast afterwards.

A git commit date does not fix it — an author date is whatever the machine
said, and history can be rewritten. A hash of the file does not fix it
either: nothing stops a hash being computed today over a file written today
and described as September's.

Two things do:

  **Canonical bytes.** RFC 8785 says exactly how a JSON value becomes one
  sequence of bytes — property order, number formatting, escaping — so that
  the same forecast always hashes the same and a different forecast never
  does. `json.dumps(sort_keys=True)` is close and not the same: it formats
  floats by Python's rules, which are not the ones a verifier in another
  language will use.

  **A timestamp somebody else issued.** RFC 3161 is a signed statement from
  a third party that a given hash existed at a given moment. It is the only
  part of this that cannot be produced after the fact, and it is what turns
  "we say we forecast this in September" into something a stranger can check.

WHAT IS COMMITTED, AND WHAT IS NOT
----------------------------------
The Merkle root, the counts, the model versions and the timestamp receipt
are public. The forecasts themselves are not: a predicted return for a named
security is the thing an unlicensed publisher may not publish, and that does
not change because it is six hours old.

Each leaf is salted with its own nonce before hashing. Without a salt, a
forecast drawn from a small space — a direction, a rounded percentage — can
be guessed and checked against the published leaf, which would publish by
brute force exactly what the commitment was supposed to keep private until
the horizons matured.
"""

from __future__ import annotations

import hashlib
import json
import math
import secrets


def canonical(value) -> bytes:
    """RFC 8785 canonical JSON.

    Property names sorted by their UTF-16 code units, no insignificant
    whitespace, and numbers formatted the way ECMAScript would — which is
    what makes a hash computed here checkable by somebody with a different
    language and no access to this code.
    """
    return _write(value).encode("utf-8")


def _write(value) -> str:
    if value is True:
        return "true"
    if value is False:
        return "false"
    if value is None:
        return "null"
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, (int,)) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, float):
        return _number(value)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(_write(v) for v in value) + "]"
    if isinstance(value, dict):
        # Sorted by UTF-16 code unit, which is what the specification says
        # and what a JavaScript verifier will do. For every key this project
        # writes it is the same as sorting the string, but the rule is the
        # rule and the difference only appears on the day it matters.
        pairs = sorted(value.items(), key=lambda kv: _utf16(kv[0]))
        return "{" + ",".join(f"{_write(k)}:{_write(v)}" for k, v in pairs) + "}"
    raise TypeError(f"cannot canonicalise {type(value).__name__}")


def _utf16(text: str) -> list[int]:
    return list(text.encode("utf-16-be"))


def _number(value: float) -> str:
    """A float the way ECMAScript prints it.

    Refuses NaN and infinity outright rather than writing something a parser
    will read differently: neither is a forecast, and both arrive from a
    division nobody meant to do.
    """
    if math.isnan(value) or math.isinf(value):
        raise ValueError("a forecast cannot be NaN or infinite")
    if value == 0:
        return "0"
    if value == int(value) and abs(value) < 1e21:
        return str(int(value))
    out = repr(value)
    return out.replace("e+", "e").replace("E", "e")


def leaf(record: dict, nonce: str) -> str:
    """One committed forecast: its canonical bytes, salted.

    The nonce is what stops the commitment leaking what it hides. A
    one-session direction is one bit; a rounded percentage is a few hundred
    possibilities. Either can be enumerated against an unsalted leaf until it
    matches, which would publish the forecast the moment it was committed.
    """
    return hashlib.sha256(canonical({"nonce": nonce, "record": record})).hexdigest()


def nonce() -> str:
    """128 bits from the system's own source. Never a counter, never a seed."""
    return secrets.token_hex(16)


def merkle_root(leaves: list[str]) -> str:
    """One hash over every committed forecast.

    A lone leaf at the end of a level is carried up rather than paired with
    itself. Duplicating it is the classic malleability bug: two different
    leaf sets produce the same root, so a reveal can be made to match a
    commitment it was not part of.
    """
    if not leaves:
        return hashlib.sha256(b"").hexdigest()
    level = list(leaves)
    while len(level) > 1:
        above = []
        for i in range(0, len(level) - 1, 2):
            above.append(hashlib.sha256(
                bytes.fromhex(level[i]) + bytes.fromhex(level[i + 1])).hexdigest())
        if len(level) % 2:
            above.append(level[-1])
        level = above
    return level[0]


def proof(leaves: list[str], index: int) -> list[dict]:
    """The path that shows one leaf is in the root, without the other leaves.

    So a single forecast can be revealed and checked on its own — which is
    what lets the record be opened one matured horizon at a time instead of
    all at once.
    """
    if not 0 <= index < len(leaves):
        raise IndexError("no such leaf")
    path, level, at = [], list(leaves), index
    while len(level) > 1:
        above = []
        for i in range(0, len(level) - 1, 2):
            if i == at:
                path.append({"side": "right", "hash": level[i + 1]})
            elif i + 1 == at:
                path.append({"side": "left", "hash": level[i]})
            above.append(hashlib.sha256(
                bytes.fromhex(level[i]) + bytes.fromhex(level[i + 1])).hexdigest())
        if len(level) % 2:
            above.append(level[-1])
        level, at = above, at // 2
    return path


def verify(leaf_hash: str, path: list[dict], root: str) -> bool:
    """Whether a leaf and its path really do make that root."""
    running = leaf_hash
    for step in path:
        pair = (bytes.fromhex(step["hash"]) + bytes.fromhex(running)
                if step.get("side") == "left"
                else bytes.fromhex(running) + bytes.fromhex(step["hash"]))
        running = hashlib.sha256(pair).hexdigest()
    return running == root


def commitment(document: dict) -> tuple[dict, dict]:
    """The public commitment, and the private nonces that open it.

    Returns `(public, secret)`. The public half is safe to publish the same
    night: a root, counts per model, the pinned versions and the basis
    session. It contains no forecast and no company name.

    The secret half — every nonce, keyed by model and ticker — is what makes
    a later reveal checkable. It is kept beside the private forecasts and
    published only with them, horizon by horizon, once nothing in it is
    still a statement about what a share will do next.
    """
    records, secret = [], {}
    for model in sorted(document.get("models") or {}):
        block = document["models"][model]
        for forecast in block.get("forecasts") or []:
            salt = nonce()
            record = {"model": model, "basis": document["basisSession"],
                      **{k: v for k, v in forecast.items()}}
            records.append({"model": model, "ticker": forecast["ticker"],
                            "leaf": leaf(record, salt)})
            secret.setdefault(model, {})[forecast["ticker"]] = salt

    # Ordered by model then ticker, so the same run always builds the same
    # tree. An order that depended on a dict's insertion would make the root
    # a fact about this process rather than about the forecasts.
    records.sort(key=lambda r: (r["model"], r["ticker"]))
    leaves = [r["leaf"] for r in records]

    public = {
        "schemaVersion": 1,
        "basisSession": document["basisSession"],
        "ranAt": document.get("ranAt"),
        "merkleRoot": merkle_root(leaves),
        "leaves": len(leaves),
        "universeSize": document.get("universeSize"),
        "horizons": document.get("horizons"),
        "perModel": {m: {"forecasts": document["models"][m]["answered"],
                         "abstentions": document["models"][m]["abstained"]}
                     for m in sorted(document.get("models") or {})},
        "note": "A commitment to forecasts that are not published. The root "
                "fixes what every model said at this basis session; the "
                "forecasts themselves are private until their horizons have "
                "matured. Counts include abstentions, so a model cannot "
                "quietly answer fewer companies than it was asked about.",
    }
    return public, {"basisSession": document["basisSession"], "nonces": secret}
