"""Read stage 2's pass rule, exactly as it was written before the test ran.

    python decide_test.py <data dir> <report.json> <out.json>

Takes the two conditions from `test-preregistration.json` and the scores from
the report, and answers ship or stop. It decides nothing on its own.

The rule, from the plan:

  1. The pull at 20 sessions is 0.5 or less on the test origins.
  2. Rank IC at 5 and at 20 sessions is not lower than the original's, and it
     is above zero at 5 sessions.
  3. From reading 2: rank IC at 5 and at 20 is also not lower than any rival
     named in `notBelowAt` — `reversal90`, the subtraction that beat both
     Kronos variants at 20 sessions in reading 1.

One reading per window. A failed test is not retuned against the months that
read it, and `readings` carries the count so a second attempt cannot be
mistaken for a first.
"""

import json
import pathlib
import sys


def main(argv):
    data, report_path, out = map(pathlib.Path, argv)
    prereg = json.loads((data / "frozen" / "test-preregistration.json").read_text())
    rules = prereg["rules"]
    report = json.loads(report_path.read_text())
    egx = report["models"]["kronos_egx"]
    original = report["models"]["kronos_original"]

    def ic(block, horizon):
        return block["horizons"][str(horizon)]["rankIC"]["mean"]

    checks = [{
        "rule": "pullAt20",
        "threshold": f"<= {rules['pullAt20']['max']}",
        "original": original["pullAt20"],
        "kronos_egx": egx["pullAt20"],
        "passed": egx["pullAt20"] is not None and egx["pullAt20"] <= rules["pullAt20"]["max"],
    }]
    for horizon in rules["rankIC"]["notBelowOriginalAt"]:
        mine, theirs = ic(egx, horizon), ic(original, horizon)
        checks.append({
            "rule": f"rankIC at {horizon} not below original",
            "threshold": "kronos_egx >= kronos_original",
            "original": theirs, "kronos_egx": mine,
            # An undefined IC is not a pass. A model that could not be
            # distinguished on these months has not cleared anything.
            "passed": mine is not None and theirs is not None and mine >= theirs,
        })
    # Whatever else the challenger must clear. Reading 1's rule had only the
    # original in it; `notBelowAt` is absent from that file, so this loop does
    # nothing there and reading 1's decision still reproduces exactly.
    for name, horizons in rules["rankIC"].get("notBelowAt", {}).items():
        rival = report["models"].get(name)
        for horizon in horizons:
            mine = ic(egx, horizon)
            theirs = ic(rival, horizon) if rival else None
            checks.append({
                "rule": f"rankIC at {horizon} not below {name}",
                "threshold": f"kronos_egx >= {name}",
                name: theirs, "kronos_egx": mine,
                # A rival that was not scored is not a walkover. If the gate
                # names a model, the reading has to have run it.
                "passed": mine is not None and theirs is not None and mine >= theirs,
            })

    for horizon in rules["rankIC"]["aboveZeroAt"]:
        mine = ic(egx, horizon)
        checks.append({
            "rule": f"rankIC at {horizon} above zero",
            "threshold": "> 0",
            "original": ic(original, horizon), "kronos_egx": mine,
            "passed": mine is not None and mine > 0,
        })

    decision = {
        "decision": "ship" if all(c["passed"] for c in checks) else "stop",
        "readings": prereg.get("reading", 1),
        "checks": checks,
        "checkpoint": report["checkpoint"],
        "origins": report["origins"],
        "window": [report["first"], report["last"]],
        "paired": report.get("kronosEgxAgainstOriginal"),
        "baselines": {name: {str(h): block["horizons"][str(h)]["rankIC"]["mean"] for h in (1, 5, 20)}
                      for name, block in report["models"].items()
                      if not name.startswith("kronos")},
    }
    out.write_text(json.dumps(decision, indent=1))
    for c in checks:
        against = c.get("original", c.get("reversal90"))
        print(f"{'PASS' if c['passed'] else 'FAIL'}  {c['rule']:<40} {c['threshold']:<30} "
              f"{against} -> kronos_egx {c['kronos_egx']}")
    print(f"decision: {decision['decision'].upper()} "
          f"({report['origins']} origins, {report['first']} to {report['last']})")


if __name__ == "__main__":
    main(sys.argv[1:])
