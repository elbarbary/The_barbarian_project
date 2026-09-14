#!/usr/bin/env python3
"""Whether a month of filings is all of it, and putting it back when it is not.

WHY THIS IS NEEDED AT ALL
-------------------------
`harvest_egx_beta.py` writes whatever it managed to read. That is right for a
harvester — a run that gets four pages of five has collected four pages — but
it means a month file can be shorter than the month. The exchange publishes
its own `totalCount` with every search, and the harvester stores it, so this
is one of the rare cases where completeness is CHECKABLE rather than
guessable: a file holding fewer filings than the exchange said the month had
is short, full stop.

A short month is worse than yesterday's copy of the same month, because the
documents that read it — the filing archive, the disclosure timeline, every
company's own page — will quietly show a gap rather than an error. So a short
file is restored from git and the run says so.

This is the second half of the guard, not the first. `build_staleness_guard.py`
refuses to PUBLISH from a short archive. This refuses to COMMIT one, which is
what keeps the short version from ever reaching the machine that publishes.
"""

from __future__ import annotations

import argparse
import gzip
import json
import pathlib
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
FILINGS = REPO / "data-source" / "egx-beta" / "filings"


def shortfall(path: pathlib.Path) -> tuple[int, int] | None:
    """(held, expected) when a month is short, else None.

    A month with no `expected` recorded is not judged. Those are the files
    written before the harvester stored the exchange's own count, and calling
    them short on no evidence would restore a good archive over and over.
    """
    try:
        held = json.loads(gzip.decompress(path.read_bytes()))
    except (OSError, ValueError, gzip.BadGzipFile):
        return None
    expected = held.get("expected")
    if not isinstance(expected, int) or expected <= 0:
        return None
    have = len(held.get("items") or [])
    return (have, expected) if have < expected else None


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--restore", action="store_true",
                        help="put a short month back to its committed copy")
    parser.add_argument("--filings", type=pathlib.Path, default=FILINGS)
    args = parser.parse_args(argv)

    if not args.filings.is_dir():
        print(f"   no filing archive at {args.filings}")
        return 0

    short = []
    for path in sorted(args.filings.glob("*.json.gz")):
        gap = shortfall(path)
        if gap:
            short.append((path, gap))

    if not short:
        print(f"   {len(list(args.filings.glob('*.json.gz')))} months, "
              "none short of what the exchange reported")
        return 0

    for path, (have, expected) in short:
        print(f"!! {path.name}: {have} filings held against {expected} the "
              "exchange reported", file=sys.stderr)
        if not args.restore:
            continue
        done = subprocess.run(["git", "checkout", "--", str(path)],
                              cwd=REPO, capture_output=True, text=True)
        if done.returncode == 0:
            print(f"   {path.name} restored to the committed copy")
        else:
            # Nothing committed to restore to: a month that has never been
            # harvested completely. Removed rather than left, so a partial
            # first read cannot become the archive by being the only one.
            path.unlink(missing_ok=True)
            print(f"   {path.name} had no committed copy and was removed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
