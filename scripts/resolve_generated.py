#!/usr/bin/env python3
"""Which side of a conflict in generated data is the right answer.

Both publishing jobs rebuild News, Rates and Disclosures, and until now both
resolved a collision the same way: `git checkout --theirs`, the commit being
replayed — which is to say, whoever pushed last. The comment above that line
argued it was safe because "this job just generated them from the current
sources". That holds for the fifteen-minute job. It does not hold for
publish-app-data, which takes about an hour, so "the current sources" means
the sources as they were when it started.

On 6 Sep 2026 the app-data build committed at 07:10:37Z and published a
snapshot it had collected sixteen minutes earlier over the top of the
fifteen-minute lane's newer one. News `generated_at` went BACKWARD from
07:01:44 to 06:48:47, the newest story on the feed was un-published, and
three of that morning's filings — Arab Moltaka's board decisions, Cleopatra
Hospital's minutes, Delta Insurance's consolidated results — were deleted
from the disclosures feed. They were not retractions; the exchange was still
listing them. The manifest fingerprint moved along with it, so every
installed app was told to refetch and handed the older document.

So the winner is decided by what the documents say about themselves, not by
which job is asking:

  * a document that stamps itself — news `generated_at`, rates `fetched_at`,
    connections `updated_at` — is compared on that stamp, and the newer one
    wins.
  * a document that carries CUMULATIVE records with stable ids — the
    disclosures feed — is UNIONED, because a filing is not withdrawn by the
    exchange and neither side's absence is evidence. Losing one is the
    failure this exists to stop.
  * anything else is left to the caller, which keeps the behaviour it has
    always had. This never has an opinion it cannot justify.

Every failure path returns "no opinion" rather than raising: a resolver that
throws inside a commit step stops the whole pipeline publishing, which is far
worse than the staleness it is here to prevent.
"""

from __future__ import annotations

import datetime
import gzip
import json
import sys

# What a document calls the moment it describes. Ordered: the first one both
# sides carry is the one compared.
STAMPS = ("generated_at", "fetched_at", "updated_at", "captured_at", "as_of")

# Where cumulative records live, and what identifies one.
RECORDS = ("items", "filings", "rows")
IDENTITY = ("id", "filing_id", "ticker", "code")


def _load(raw: bytes):
    """The document, whether or not it is gzipped. None if it is not JSON."""
    try:
        if raw[:2] == b"\x1f\x8b":
            raw = gzip.decompress(raw)
        return json.loads(raw)
    except Exception:
        return None


def _moment(doc) -> datetime.datetime | None:
    """When this document says it was made."""
    if not isinstance(doc, dict):
        return None
    for key in STAMPS:
        value = doc.get(key)
        if not isinstance(value, str) or not value.strip():
            continue
        try:
            parsed = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            continue
        # A naive stamp and an aware one cannot be compared, and guessing a
        # zone here would silently reorder them. Treat naive as UTC, which is
        # what every writer in this repository actually means.
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=datetime.UTC)
        return parsed
    return None


def _records(doc):
    """(key, list, id-field) for the cumulative records, or None."""
    if not isinstance(doc, dict):
        return None
    for key in RECORDS:
        rows = doc.get(key)
        if not isinstance(rows, list) or not rows:
            continue
        if not all(isinstance(r, dict) for r in rows):
            continue
        for field in IDENTITY:
            if all(r.get(field) is not None for r in rows):
                return key, rows, field
    return None


def decide(ours: bytes, theirs: bytes) -> tuple[str | None, bytes | None, str]:
    """Which side to keep, and the bytes when neither side alone is right.

    Returns (choice, payload, reason). `choice` is "ours", "theirs", "merged"
    or None, and None means the caller should do whatever it did before.
    """
    try:
        a, b = _load(ours), _load(theirs)
        if a is None or b is None:
            return None, None, "not both JSON"

        at, bt = _moment(a), _moment(b)
        if at and bt and at != bt:
            if at > bt:
                return "ours", None, f"ours is newer ({at.isoformat()} > {bt.isoformat()})"
            return "theirs", None, f"theirs is newer ({bt.isoformat()} > {at.isoformat()})"

        ar, br = _records(a), _records(b)
        if ar and br and ar[0] == br[0] and ar[2] == br[2]:
            key, arows, field = ar
            _, brows, _ = br
            merged = {}
            # Theirs first so ours overwrites on a tie: where the same record
            # exists on both sides, the copy from the side we are replaying is
            # no worse, and this keeps the choice deterministic.
            for row in list(brows) + list(arows):
                merged[row[field]] = row
            if len(merged) == len(arows) == len(brows):
                return None, None, "same records on both sides"
            # Keep the frame of whichever side stamped itself later, or of the
            # one with more records when neither did, then union the records
            # into it. A count is not a date, but a feed that only grows makes
            # it the same ordering.
            frame = a if (at and bt and at >= bt) or len(arows) >= len(brows) else b
            out = dict(frame)
            out[key] = list(merged.values())
            gained = len(merged) - max(len(arows), len(brows))
            payload = json.dumps(out, ensure_ascii=False, separators=(",", ":")).encode()
            return ("merged", payload,
                    f"unioned {len(arows)} and {len(brows)} records into "
                    f"{len(merged)} (+{gained} that one side would have dropped)")

        if at and bt:
            return None, None, "same stamp on both sides"
        return None, None, "nothing to compare"
    except Exception as error:                       # never break publishing
        return None, None, f"no opinion ({type(error).__name__}: {error})"


def main(argv: list[str]) -> int:
    """`resolve_generated.py <ours> <theirs> <out>` — prints the choice."""
    if len(argv) != 4:
        print("usage: resolve_generated.py <ours> <theirs> <out>", file=sys.stderr)
        return 2
    ours_path, theirs_path, out_path = argv[1:]
    try:
        ours = open(ours_path, "rb").read()
        theirs = open(theirs_path, "rb").read()
    except OSError as error:
        print(f"none  could not read a side ({error})")
        return 0

    choice, payload, reason = decide(ours, theirs)
    if choice == "merged" and payload is not None:
        try:
            # The filing archive is stored gzipped. Writing plain JSON over a
            # `.gz` path would leave an archive nothing can read, which is a
            # worse outcome than the staleness this is preventing.
            if out_path.endswith(".gz"):
                payload = gzip.compress(payload)
            with open(out_path, "wb") as handle:
                handle.write(payload)
        except OSError as error:
            print(f"none  could not write the merge ({error})")
            return 0
    print(f"{choice or 'none'}  {reason}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
