#!/usr/bin/env python3
"""The tests that guard what one workflow actually writes.

WHY THIS EXISTS

`publish-prices` ran the whole suite — every test in `scripts/` — before
writing a quote. Its own step is called "Test the parsers", and the job writes
`market.json` and the manifest and nothing else, so a test about documents it
cannot touch was standing between a trading session and its prices. Four
publishes were lost that way in two days: three price ticks on 10 Sep 2026 and
one at 07:01 on 13 Sep, all of them `test_connections` reporting a real
disagreement between two documents that job does not own and does not write.

WHAT IS SELECTED, AND WHY IT IS DERIVED RATHER THAN LISTED

A list of module names in the workflow would be a second thing to remember: add
a script to the job, forget its tests, and the gate quietly shrinks. So the
selection is read from the workflow itself — the scripts it runs — and a test
module qualifies when it imports one of them, or when it names the workflow
file (the tests that guard the workflow's own shape).

FAIL CLOSED

If the selection comes back implausibly small, this exits non-zero rather than
printing a short list. A selector that silently finds nothing would turn the
gate off altogether, which is a worse failure than the one it is fixing.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
# Below this the selection is not a narrowing, it is a breakage.
FLOOR = 5

RUNS = re.compile(r"(?:python3|node)\s+scripts/([a-z_0-9]+)\.(py|mjs)")


def scripts_run(workflow: pathlib.Path) -> set[str]:
    """Every script the workflow invokes, by module name."""
    return {name for name, _ in RUNS.findall(workflow.read_text(encoding="utf-8"))}


def guards(workflow: pathlib.Path, *, here: pathlib.Path = HERE) -> list[str]:
    """Test modules that guard those scripts, or the workflow's own shape."""
    wanted = scripts_run(workflow)
    chosen = []
    for test in sorted(here.glob("test_*.py")):
        text = test.read_text(encoding="utf-8")
        imported = set(re.findall(r"^\s*(?:import|from)\s+([a-z_0-9]+)", text, re.M))
        if (imported & wanted) or workflow.name in text:
            chosen.append(test.stem)
    return chosen


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workflow", type=pathlib.Path)
    parser.add_argument("--floor", type=int, default=FLOOR)
    args = parser.parse_args(argv)

    chosen = guards(args.workflow)
    if len(chosen) < args.floor:
        print(f"tests_for_workflow: only {len(chosen)} module(s) selected for "
              f"{args.workflow.name} — refusing to narrow the gate to that",
              file=sys.stderr)
        return 1
    print(" ".join(chosen))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
