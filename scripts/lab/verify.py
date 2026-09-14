#!/usr/bin/env python3
"""Checking this project's own evidence the way a stranger would.

WHY THE PROJECT SHIPS THE CHECKER
---------------------------------
A commitment nobody can open is a locked box, and a reveal nobody can check
is a box with the lid off and no way to tell whether the contents were
swapped. The `verify` field in every reveal describes the procedure in
English; this is that procedure in code, so the claim is testable rather than
merely stated — and so this project finds out first when it stops being true.

It reads only published files. No private run, no nonce store, nothing that
is not on the website: a reveal, and the commitment it was made against.

THE THREE THINGS IT CHECKS
--------------------------
  1. Every revealed record rehashes to a leaf, and the leaves rebuild the
     root the reveal claims. This catches a forecast edited after the fact.

  2. That root is the one in the commitment published on the night. This
     catches a whole reveal swapped for a different one.

  3. The RFC 3161 token really carries that root, and says when. This is the
     only check that establishes WHEN, and it is the only one that cannot be
     satisfied by rewriting the repository.

WHAT IT DOES NOT CHECK, AND WHY IT SAYS SO
------------------------------------------
The token's SIGNATURE. Verifying that needs the authority's certificate
chain and a real CMS implementation, which is a dependency this file will not
take on to be wrong about quietly. So it reports what the token SAYS — this
digest, at this instant, from this authority — and states plainly that the
signature is unchecked. A reader who wants that can take the base64 token to
`openssl ts -verify`, which is what it is for.

That distinction matters: an unsigned assertion that a hash existed at a time
is worth nothing on its own. What this establishes is that the token is ABOUT
the root in question, which is the part a rewritten repository could fake and
`openssl` could not tell you.
"""

from __future__ import annotations

import argparse
import base64
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import commit as cm

REPO = pathlib.Path(__file__).resolve().parent.parent.parent
RESEARCH = REPO / "public" / "data" / "v1" / "research"


# ── just enough DER to read a timestamp token ────────────────────────────────
#
# Hand-rolled for the same reason the request is: this reads one structure,
# and a general ASN.1 library would be a dependency carrying it.

def _read(data: bytes, at: int) -> tuple[int, int, int, int]:
    """(tag, start of contents, end of contents, next) at an offset."""
    tag = data[at]
    length = data[at + 1]
    at += 2
    if length & 0x80:
        count = length & 0x7F
        length = int.from_bytes(data[at:at + count], "big")
        at += count
    return tag, at, at + length, at + length


def _walk(data: bytes, start: int, end: int):
    at = start
    while at < end:
        tag, body, stop, nxt = _read(data, at)
        yield tag, body, stop
        at = nxt


def _find_tstinfo(token: bytes) -> bytes | None:
    """The signed TSTInfo inside the CMS wrapper.

    Located by shape rather than by path: it is the only OCTET STRING in the
    token that itself parses as a SEQUENCE beginning with INTEGER 1 and an
    OBJECT IDENTIFIER. Walking every constructed node and testing the leaves
    is shorter than modelling ContentInfo, SignedData and EncapsulatedContent
    correctly, and it fails closed — an unrecognised token returns None.
    """
    found = []

    def descend(start: int, end: int, depth: int) -> None:
        if depth > 12:
            return
        try:
            for tag, body, stop in _walk(token, start, end):
                if tag == 0x04:                       # OCTET STRING
                    inner = token[body:stop]
                    if inner[:1] == b"\x30":
                        found.append(inner)
                if tag & 0x20:                        # constructed
                    descend(body, stop, depth + 1)
        except (IndexError, ValueError):
            return

    try:
        descend(0, len(token), 0)
    except RecursionError:
        return None
    for candidate in found:
        if _tstinfo_fields(candidate):
            return candidate
    return None


def _tstinfo_fields(blob: bytes) -> dict | None:
    """{'digest': hex, 'genTime': str} from a TSTInfo, or None.

    TSTInfo ::= SEQUENCE {
        version INTEGER { v1(1) }, policy OID,
        messageImprint MessageImprint, serialNumber INTEGER,
        genTime GeneralizedTime, ... }
    """
    try:
        tag, body, stop, _ = _read(blob, 0)
        if tag != 0x30:
            return None
        parts = list(_walk(blob, body, stop))
        if len(parts) < 5:
            return None
        if parts[0][0] != 0x02 or blob[parts[0][1]:parts[0][2]] != b"\x01":
            return None
        if parts[1][0] != 0x06:                       # policy OID
            return None
        imprint = parts[2]
        if imprint[0] != 0x30:
            return None
        inside = list(_walk(blob, imprint[1], imprint[2]))
        digest = next((blob[b:e] for t, b, e in inside if t == 0x04), None)
        gen = next((blob[b:e] for t, b, e in parts if t == 0x18), None)
        if not digest or not gen:
            return None
        return {"digest": digest.hex(), "genTime": gen.decode("ascii", "replace")}
    except (IndexError, ValueError):
        return None


def token_says(token_b64: str) -> dict | None:
    """What an RFC 3161 token asserts, without checking who signed it."""
    try:
        token = base64.b64decode(token_b64, validate=True)
    except Exception:  # noqa: BLE001
        return None
    blob = _find_tstinfo(token)
    return _tstinfo_fields(blob) if blob else None


# ── the reveal ───────────────────────────────────────────────────────────────

def check(reveal: dict, commitment: dict | None) -> dict:
    """Every question this project's evidence claims to answer."""
    basis = reveal.get("basisSession")
    records = reveal.get("records") or []

    leaves = []
    malformed = 0
    for record in records:
        guess, salt = record.get("forecast"), record.get("nonce")
        if not isinstance(guess, dict) or not isinstance(salt, str):
            malformed += 1
            continue
        leaves.append(cm.leaf({"model": record.get("model"), "basis": basis,
                               **guess}, salt))
    rebuilt = cm.merkle_root(leaves)

    out = {
        "basisSession": basis,
        "records": len(records),
        "malformed": malformed,
        "rebuiltRoot": rebuilt,
        "claimedRoot": reveal.get("merkleRoot"),
        "recordsRebuildTheRoot": bool(rebuilt) and rebuilt == reveal.get("merkleRoot"),
    }

    if commitment is None:
        out["matchesTheCommitment"] = None
        out["note"] = ("no published commitment for this session was given, so "
                       "this checks only that the reveal is internally whole")
    else:
        out["matchesTheCommitment"] = commitment.get("merkleRoot") == rebuilt
        stamp = commitment.get("timestamp") or {}
        said = token_says(stamp.get("token") or "")
        if not said:
            out["timestamp"] = {
                "checked": False,
                "why": "no token, or a token this reader could not parse",
            }
        else:
            out["timestamp"] = {
                "checked": True,
                "authority": stamp.get("authority"),
                "coversThisRoot": said["digest"] == rebuilt,
                "genTime": said["genTime"],
                "signatureChecked": False,
                "how": "the token asserts this digest at this instant. Its "
                       "SIGNATURE is not verified here — that needs the "
                       "authority's certificate chain: openssl ts -verify.",
            }
    return out


def verdict(result: dict) -> bool:
    if not result["recordsRebuildTheRoot"] or result["malformed"]:
        return False
    if result.get("matchesTheCommitment") is False:
        return False
    stamp = result.get("timestamp") or {}
    return not (stamp.get("checked") and stamp.get("coversThisRoot") is False)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reveals", nargs="*", type=pathlib.Path,
                        help="published reveal files (default: all of them)")
    parser.add_argument("--commitments", type=pathlib.Path,
                        default=RESEARCH / "commitments")
    args = parser.parse_args(argv)

    paths = args.reveals or sorted((RESEARCH / "reveals").glob("*.json"))
    if not paths:
        print("   nothing revealed yet — every commitment is still maturing")
        return 0

    bad = 0
    for path in paths:
        reveal = json.loads(path.read_text(encoding="utf-8"))
        promise = args.commitments / f"{reveal.get('basisSession')}.json"
        commitment = (json.loads(promise.read_text(encoding="utf-8"))
                      if promise.is_file() else None)
        result = check(reveal, commitment)
        ok = verdict(result)
        bad += 0 if ok else 1
        stamp = result.get("timestamp") or {}
        print(f"   {result['basisSession']}  {result['records']:>5} records  "
              f"root {result['rebuiltRoot'][:16]}  "
              f"{'rebuilds' if result['recordsRebuildTheRoot'] else 'DOES NOT REBUILD'}"
              f"  · commitment "
              f"{ {True: 'matches', False: 'DIFFERS', None: 'not given'}[result['matchesTheCommitment']] }"
              f"  · token "
              + ("covers it, " + stamp.get("genTime", "") if stamp.get("coversThisRoot")
                 else "DOES NOT COVER IT" if stamp.get("checked")
                 else "not checked"))
        if not ok:
            print(f"      {json.dumps(result, indent=1)}")

    print(f"   {len(paths) - bad}/{len(paths)} verified"
          + ("" if not bad else f", {bad} FAILED"))
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
