#!/usr/bin/env python3
"""Getting somebody else to say when a hash existed.

WHY THIS IS THE ONLY PART THAT MATTERS
--------------------------------------
Everything else in the commitment is arithmetic this project does to itself.
Canonical bytes and a Merkle root prove that a set of forecasts has not
changed; they prove nothing at all about WHEN it was made, because both can
be computed today over a file written today.

A timestamp token under RFC 3161 is a signed statement from an authority
that has no stake in this: *this hash was presented to me at this moment*.
It is the one artefact in the record that cannot be manufactured after the
outcome is known, and it is therefore the whole of the claim "frozen before
the fact".

WHAT IS SENT
------------
A hash. Nothing else — not the forecasts, not the company names, not the
count. A timestamping authority learns 32 bytes that mean nothing to it,
which is what makes it safe to use a public one.

WHEN IT FAILS
-------------
It records that it failed, with the reason, and the run continues. An
unreachable authority is a gap in the evidence for one night; stopping the
forecast because of it would be a gap in the record itself, which is worse.
A night with no token is a night whose timing rests on the git history
alone, and the file says so rather than leaving somebody to infer it.
"""

from __future__ import annotations

import base64
import hashlib
import urllib.error
import urllib.request

# Public RFC 3161 authorities, tried in order.
#
# Two of them, from different operators, because the point of a third party
# is lost if there is only one and it is down. Both are free and neither is
# asked for anything but a hash.
AUTHORITIES = (
    ("freetsa", "https://freetsa.org/tsr"),
    ("certum", "https://time.certum.pl"),
)

TIMEOUT = 20

# DER, hand-built. The request is one fixed shape — a version, a message
# imprint naming SHA-256 and carrying 32 bytes, and a flag asking the
# authority to return its certificate — so a library for it would be a
# dependency carrying one structure.
SHA256_OID = bytes.fromhex("06 09 60 86 48 01 65 03 04 02 01".replace(" ", ""))


def _length(n: int) -> bytes:
    if n < 0x80:
        return bytes([n])
    body = n.to_bytes((n.bit_length() + 7) // 8, "big")
    return bytes([0x80 | len(body)]) + body


def _tlv(tag: int, body: bytes) -> bytes:
    return bytes([tag]) + _length(len(body)) + body


def request_bytes(digest: bytes, *, want_certificate: bool = True) -> bytes:
    """A TimeStampReq carrying one SHA-256 imprint.

    TimeStampReq ::= SEQUENCE {
        version         INTEGER { v1(1) },
        messageImprint  SEQUENCE { hashAlgorithm, hashedMessage },
        certReq         BOOLEAN OPTIONAL }
    """
    if len(digest) != 32:
        raise ValueError("a SHA-256 imprint is 32 bytes")
    algorithm = _tlv(0x30, SHA256_OID + _tlv(0x05, b""))     # AlgorithmIdentifier
    imprint = _tlv(0x30, algorithm + _tlv(0x04, digest))     # MessageImprint
    version = _tlv(0x02, b"\x01")
    body = version + imprint
    if want_certificate:
        body += _tlv(0x01, b"\xff")                          # certReq TRUE
    return _tlv(0x30, body)


def stamp(root: str, authorities=AUTHORITIES, *, opener=None) -> dict:
    """Ask an authority to date this root. Never raises.

    Returns what happened either way. A token is stored base64-encoded and
    opaque: verifying it needs the authority's certificate chain and belongs
    in the verifier, not here — this file's job is to obtain the evidence,
    not to grade it.
    """
    digest = bytes.fromhex(root)
    body = request_bytes(digest)
    send = opener or _send
    tried = []
    for name, url in authorities:
        try:
            token = send(url, body)
        except Exception as error:  # noqa: BLE001 — any transport, same answer
            tried.append({"authority": name, "error": f"{type(error).__name__}: {error}"})
            continue
        if not token:
            tried.append({"authority": name, "error": "empty response"})
            continue
        return {
            "timestamped": True,
            "authority": name,
            "url": url,
            "root": root,
            "token": base64.b64encode(token).decode(),
            "tokenSha256": hashlib.sha256(token).hexdigest(),
            "attempts": tried,
            "note": "RFC 3161 token over the Merkle root. The authority was "
                    "sent a hash and nothing else. Verifying it needs the "
                    "authority's own certificate chain.",
        }
    return {
        "timestamped": False,
        "root": root,
        "attempts": tried,
        "note": "No authority answered. This night's forecasts are frozen "
                "only by the git history, which is weaker evidence, and the "
                "record says so rather than leaving it to be assumed.",
    }


def _send(url: str, body: bytes) -> bytes:
    ask = urllib.request.Request(url, data=body, headers={
        "content-type": "application/timestamp-query",
        "accept": "application/timestamp-reply",
        # Says truthfully who is calling. Cloudflare and others refuse a bare
        # Python user agent, and the refusal looks like the authority being
        # down when it is nothing of the kind.
        "user-agent": "esthmr-lab/1.0",
    })
    with urllib.request.urlopen(ask, timeout=TIMEOUT) as answer:
        return answer.read()
