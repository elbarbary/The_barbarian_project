#!/usr/bin/env python3
"""Where the Scrapling interpreter lives, wherever this is running.

Four scripts drive EGX through a real browser, and all four hardcoded one
absolute path inside one developer's home directory:

    /Users/barbary/Library/Application Support/pipx/venvs/scrapling/bin/python

On a GitHub runner that path does not exist. `build_disclosures_api` returned a
non-zero exit, `build_all --check` treated that as a validation failure, and
the daily build aborted **before writing anything** — so the market snapshot,
the company documents, the filings, the macro series and the crossings stopped
being rebuilt on 20 August and nobody noticed for three days, because the
fifteen-minute news job uses plain HTTP and kept succeeding.

Resolution order, first hit wins:

  1. `SCRAPLING_PYTHON` in the environment — the explicit answer, for CI.
  2. The `scrapling` CLI on PATH, whose sibling `python` is its venv.
  3. pipx's default venv, on macOS and on Linux.
  4. This interpreter, if it can import scrapling itself.

`None` means no browser is available here. That is a fact about the machine,
not an error: the callers publish nothing and leave what is already there
alone, which is the same thing they do when the exchange refuses them.
"""

from __future__ import annotations

import os
import pathlib
import shutil
import sys

CANDIDATES = [
    pathlib.Path.home()
    / "Library/Application Support/pipx/venvs/scrapling/bin/python",
    pathlib.Path.home() / ".local/pipx/venvs/scrapling/bin/python",
    pathlib.Path.home() / ".local/share/pipx/venvs/scrapling/bin/python",
]


def find() -> pathlib.Path | None:
    """The interpreter Scrapling is installed in, or None."""
    # An explicit answer is final, right or wrong.
    #
    # Falling through to a guess when the stated path is missing is how a CI
    # box silently uses something other than what it was told to, and how a
    # test of "what happens with no browser" quietly finds one.
    stated = os.environ.get("SCRAPLING_PYTHON")
    if stated:
        path = pathlib.Path(stated)
        return path if path.exists() else None

    cli = shutil.which("scrapling")
    if cli:
        sibling = pathlib.Path(cli).parent / "python"
        if sibling.exists():
            return sibling

    for candidate in CANDIDATES:
        if candidate.exists():
            return candidate

    try:
        import scrapling  # noqa: F401
    except Exception:
        return None
    return pathlib.Path(sys.executable)


def missing_note() -> str:
    return (
        "no Scrapling interpreter here — set SCRAPLING_PYTHON or "
        "`pipx install scrapling`. Leaving the published document alone."
    )
