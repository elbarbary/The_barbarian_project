#!/usr/bin/env python3
"""Fetch the session bulletins no machine that builds this has opened yet.

Every insider trade on the Ownership lens that says which way it went and how
many shares changed hands is read out of one PDF a session: the exchange's
insider-dealings bulletin. Only `build_insider_tracker.py --fetch` downloads
them, and only a laptop ever passed it. Its last run was on 11 Sep 2026, so
every build after that published trades up to the 9th, plus a share-less notice
for each filing since. Meanwhile the bulletins for the 10th, 13th and 14th sat
unopened in the ledger.

This is a step of its own, and best-effort, because it is the half that asks
the exchange. `Insider tracker` after it only transforms what is on disk and in
the store, and it must not go quiet when the host does.

    python3 scripts/fetch_insider_bulletins.py --limit 6
"""

from __future__ import annotations

import argparse
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import build_insider_tracker as tracker  # noqa: E402
import scrapling_python  # noqa: E402
from step_outcome import NO_PROGRESS  # noqa: E402


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=6,
                    help="how many bulletins to ask for this run, newest first")
    # Two, as for the named insiders: a refusal is about the host rather than
    # one document, and each costs up to three minutes of the build.
    ap.add_argument("--patience", type=int, default=2,
                    help="refusals in a row before the run stops asking")
    args = ap.parse_args(argv)

    pending = tracker.unread_bulletins()
    # Flushed, or a runner's log prints it after the fetch lines, which go to
    # stderr unbuffered.
    print(f"── {len(pending)} session bulletin(s) not yet read", flush=True)
    if not pending:
        return 0
    if scrapling_python.find() is None:
        print(f"   {scrapling_python.missing_note()}")
        return NO_PROGRESS
    got = tracker.fetch_bulletins(args.limit, patience=args.patience)
    print(f"   {got} fetched; the Insider tracker step reads them")
    if not got:
        print("   none of the bulletins asked for came back — no progress this run")
        return NO_PROGRESS
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
