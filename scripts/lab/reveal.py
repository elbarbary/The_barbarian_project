#!/usr/bin/env python3
"""Opening a commitment once nothing in it is still about the future.

WHAT A REVEAL IS FOR
--------------------
The commitment published on the night says only "these forecasts existed, and
here is a hash of them, and a third party will attest that the hash existed
at this moment". That is a promise. This is the part that lets a stranger
collect on it: the forecasts themselves, with the salt that hides them, so
anybody can recompute the leaves, rebuild the tree, and find the same root
that was timestamped a month earlier.

Without this the commitment is a locked box nobody ever opens, which is worth
about as much as no box.

WHEN A RUN MAY BE OPENED
------------------------
When EVERY horizon in it has matured — twenty completed sessions past the
basis, counted on the exchange's own calendar rather than the wall clock,
because a month with two feast weeks in it is not twenty sessions.

All of them, not the ones that happen to be interesting, and all horizons at
once rather than the short one first. A leaf commits a whole record, so
opening it at all opens every horizon in it: revealing after one session
would publish a twenty-session forecast for a named company that has not
happened yet, which is the exact thing the commitment exists to avoid. The
maturity gate is therefore on the LONGEST horizon, and there is no flag to
lower it.

WHAT IS OPENED
--------------
Every record in the run: every model, every company it answered, with its
nonce. Not a selection. A reveal that published the good half would be a
ranked list of companies assembled by this publisher, which is a
recommendation whatever it is called, and it would also be a lie about the
models.

THE GUARD
---------
Before anything is written, the tree is rebuilt from the revealed records and
compared with the root the authority timestamped. If they differ the reveal
is refused outright. A reveal that does not reproduce its own commitment is
either a bug or the thing the commitment was designed to catch, and in both
cases it must not be published.
"""

from __future__ import annotations

import argparse
import datetime
import glob
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import commit as cm
import evaluate as ev
import forecast as fc

REPO = pathlib.Path(__file__).resolve().parent.parent.parent
RUNS = REPO / "data-source" / "lab"
COMMITMENTS = REPO / "public" / "data" / "v1" / "research" / "commitments"
REVEALS = REPO / "public" / "data" / "v1" / "research" / "reveals"

# The longest thing any run promises. A record is opened only when this many
# sessions have completed, because the leaf commits every horizon at once.
LONGEST = max(fc.HORIZONS)

# The exchange's own calendar and the arithmetic over it live in `evaluate`,
# which needs them to decide what may be scored. One definition of a session,
# used by the file that opens commitments and the file that marks them.
calendar = ev.calendar
sessions_after = ev.sessions_after


def records_of(document: dict) -> list[dict]:
    """Every committed record, in the order `commit.py` hashed them.

    The same ordering — model then ticker — because the root depends on it.
    Rebuilding the tree in a different order produces a different root and
    the reveal would fail its own check for no reason but sorting.
    """
    nonces = document.get("nonces") or {}
    out = []
    for model in sorted(document.get("models") or {}):
        block = document["models"][model]
        for guess in block.get("forecasts") or []:
            ticker = guess.get("ticker")
            if not ticker:
                continue
            salt = (nonces.get(model) or {}).get(ticker)
            if not salt:
                # Not skipped. A record with no nonce cannot be verified by
                # anybody, and dropping it from a reveal that says it opened
                # everything would be the quiet omission this file exists to
                # make impossible.
                raise SystemExit(
                    f"reveal: {model}/{ticker} has no nonce, so nothing can "
                    "open its leaf. Refusing to publish an incomplete reveal.")
            out.append({"model": model, "nonce": salt, "forecast": guess})
    out.sort(key=lambda r: (r["model"], r["forecast"]["ticker"]))
    return out


def root_of(records: list[dict], basis: str) -> str:
    """The Merkle root these revealed records make.

    Reconstructed exactly the way the commitment built it: the leaf is over
    `{"model": …, "basis": …, **forecast}` salted with its nonce. Any drift
    between this and `commit.commitment` breaks the reveal loudly on the next
    run rather than quietly a year later.
    """
    leaves = [cm.leaf({"model": r["model"], "basis": basis, **r["forecast"]},
                      r["nonce"]) for r in records]
    return cm.merkle_root(leaves)


def stem_of(document: dict) -> str:
    """The name a night's commitment, and its reveal, are filed under.

    The run is the basis alone. A second-pass reading sealed over the same
    night — the re-rank — is the basis and its layer, because it has a root
    of its own and opening it against the run's root would fail for the
    right reason and help nobody.
    """
    basis = document["basisSession"]
    layer = document.get("layer")
    return f"{basis}.{layer}" if layer else basis


def build(document: dict, commitment: dict, sessions_since: int,
          revealed_at: str) -> dict:
    basis = document["basisSession"]
    records = records_of(document)
    rebuilt = root_of(records, basis)
    promised = commitment.get("merkleRoot")
    if rebuilt != promised:
        raise SystemExit(
            f"reveal: {stem_of(document)} does not reproduce its own commitment "
            f"({rebuilt[:16]} vs {promised[:16] if promised else 'none'}). "
            "Refusing to publish: a reveal that cannot rebuild the root it "
            "was committed to is exactly what the commitment exists to catch.")

    stamp = commitment.get("timestamp") or {}
    return {
        "schemaVersion": 1,
        "basisSession": basis,
        # Which commitment this opens, so a stranger's verifier fetches the
        # right root rather than guessing from the date.
        "stem": stem_of(document),
        **({"layer": document["layer"]} if document.get("layer") else {}),
        "ranAt": document.get("ranAt"),
        "revealedAt": revealed_at,
        "merkleRoot": rebuilt,
        "leaves": len(records),
        "matured": {"sessionsSinceBasis": sessions_since,
                    "longestHorizon": LONGEST},
        "timestamp": {"timestamped": bool(stamp.get("timestamped")),
                      "authority": stamp.get("authority"),
                      "tokenSha256": stamp.get("tokenSha256")},
        "verify": "For each record, hash the RFC 8785 canonical JSON of "
                  "{\"nonce\": nonce, \"record\": {\"model\": model, "
                  "\"basis\": basisSession, ...forecast}} with SHA-256. Sort "
                  "the leaves by model then ticker, pair them left to right "
                  "carrying a lone last leaf up unpaired, and the root is "
                  "merkleRoot — the value this project's timestamping "
                  "authority signed on the night of the run.",
        "what": "What each model said on a session that is now history, "
                "opened in full once every horizon in it had matured. Every "
                "company the models answered is here: this is a record of "
                "forecasters, published complete, not a selection by anybody "
                "and not a statement about what any security will do next.",
        "records": records,
    }


def _short(path: pathlib.Path) -> str:
    try:
        return str(path.relative_to(REPO))
    except ValueError:
        return str(path)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scans", nargs="*", type=pathlib.Path,
                        help="daily_scan_*.json files, for the session calendar")
    parser.add_argument("--runs", type=pathlib.Path, default=RUNS)
    parser.add_argument("--commitments", type=pathlib.Path, default=COMMITMENTS)
    parser.add_argument("--reveals", type=pathlib.Path, default=REVEALS)
    parser.add_argument("--check", action="store_true", help="write nothing")
    args = parser.parse_args(argv)

    scans = [p for p in args.scans if p.is_file()]
    if not scans:
        raise SystemExit("reveal: no scan given — without bars there is no "
                         "session calendar and nothing can be shown to have "
                         "matured")
    sessions = calendar(ev.bar_panel(scans))
    if not sessions:
        raise SystemExit("reveal: the scans hold no session a majority of the "
                         "market shares")
    print(f"   calendar: {len(sessions)} sessions, {sessions[0]} → {sessions[-1]}")

    revealed_at = (datetime.datetime.now(datetime.timezone.utc)
                   .isoformat(timespec="seconds").replace("+00:00", "Z"))
    opened, waiting, uncommitted = 0, 0, 0

    # The nights, then the readings sealed over them. Each has its own root,
    # so each is opened against its own commitment and filed under its stem.
    paths = (sorted(glob.glob(str(args.runs / "run-*.json")))
             + sorted(glob.glob(str(args.runs / "rerank-*.json"))))
    for path in paths:
        try:
            document = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        basis = document.get("basisSession")
        if not basis:
            continue
        stem = stem_of(document)
        promise = args.commitments / f"{stem}.json"
        if not promise.is_file() or not document.get("nonces"):
            # The back-loaded August nights and anything written before the
            # commitment existed. Genuinely frozen, but frozen only by the
            # git history, and there is no root here to open against one.
            uncommitted += 1
            continue
        out = args.reveals / f"{stem}.json"
        if out.is_file():
            continue
        since = sessions_after(sessions, basis)
        if since < LONGEST:
            print(f"   {stem}: {since}/{LONGEST} sessions — still forecasting")
            waiting += 1
            continue

        commitment = json.loads(promise.read_text(encoding="utf-8"))
        document_out = build(document, commitment, since, revealed_at)
        print(f"   {stem}: opened  {document_out['leaves']} records  "
              f"root {document_out['merkleRoot'][:16]} matches the commitment")
        opened += 1
        if args.check:
            continue
        args.reveals.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(document_out, ensure_ascii=False,
                                  separators=(",", ":")), encoding="utf-8")
        print(f"      wrote {_short(out)} ({out.stat().st_size // 1024} KB)")

    print(f"   {opened} opened, {waiting} still maturing, "
          f"{uncommitted} with no commitment to open")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
