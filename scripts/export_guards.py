#!/usr/bin/env python3
"""Write the three §8 pattern lists where the JS suite can read them.

`macro_types.DIRECTIVE`, `SPECULATIVE` and `CAUSAL` are the guards the
builders run over every sentence before it ships. The site tests need the same
lists — a Latin `DIRECTIVE` copied by hand into site.test.mjs was the state
before this, which meant the JS suite tested a guard nobody was running. This
writes `macro_types.exported_guards()` to `site-worker/test/guards.json`, which
is committed; `test_macro.py` fails when the file and the live patterns drift.

Run: python3 scripts/export_guards.py
"""

from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import macro_types  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "site-worker" / "test" / "guards.json"


def render() -> str:
    """The file's exact bytes: stable key order, real Arabic, one trailing newline."""
    return json.dumps(
        macro_types.exported_guards(), indent=2, ensure_ascii=False, sort_keys=True
    ) + "\n"


def main() -> int:
    OUT.write_text(render(), encoding="utf-8")
    print(f"wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
