"""Read the stage 1 stop rule, exactly as it was written before training.

    python decide.py <data dir> <run dir> <eval dir> <out.json>

Takes the thresholds from `preregistration.json`, the two evaluations and the
training metrics, and answers go or stop. It decides nothing on its own: every
number it compares was fixed before the pilot existed.
"""

import json
import pathlib
import sys


def main(argv):
    data, run, evals, out = map(pathlib.Path, argv)
    rules = json.loads((data / "frozen" / "preregistration.json").read_text())["rules"]
    original = json.loads((evals / "original.json").read_text())
    pilot = json.loads((evals / "pilot.json").read_text())
    metrics = json.loads((run / "metrics.json").read_text())
    best = min(metrics["epochs"], key=lambda e: e["validation"]["loss"])

    checks = [
        {"rule": "pullAt20", "threshold": f"<= {rules['pullAt20']['max']}",
         "original": original["pullAt20"], "pilot": pilot["pullAt20"],
         "passed": pilot["pullAt20"] is not None and pilot["pullAt20"] <= rules["pullAt20"]["max"]},
        {"rule": "steadyRiseAt20", "threshold": f"> {rules['steadyRiseAt20']['min']}%",
         "original": original["steadyRiseAt20"], "pilot": pilot["steadyRiseAt20"],
         "passed": pilot["steadyRiseAt20"] > rules["steadyRiseAt20"]["min"]},
        {"rule": "validationLoss", "threshold": "< original",
         "original": metrics["original"]["loss"], "pilot": best["validation"]["loss"],
         "passed": best["validation"]["loss"] < metrics["original"]["loss"]},
    ]
    decision = {
        "decision": "go" if all(c["passed"] for c in checks) else "stop",
        "checks": checks,
        "bestEpoch": best["epoch"],
        "originsScored": pilot["originsScored"],
        "perOrigin": [{"origin": o["origin"], "n": o["n"], "original": r["r"], "pilot": o["r"],
                       "originalMedianH20": r["medianH20"], "pilotMedianH20": o["medianH20"],
                       "medianMove": o["medianMove"]}
                      for o, r in zip(pilot["perOrigin"], original["perOrigin"])],
        "steadyRises": {"original": original["steadyRises"], "pilot": pilot["steadyRises"]},
        "epochs": metrics["epochs"],
    }
    out.write_text(json.dumps(decision, indent=1))
    for c in checks:
        print(f"{'PASS' if c['passed'] else 'FAIL'}  {c['rule']:<16} {c['threshold']:<14} "
              f"original {c['original']} -> pilot {c['pilot']}")
    print(f"decision: {decision['decision'].upper()} (best epoch {best['epoch']}, {pilot['originsScored']} origins)")


if __name__ == "__main__":
    main(sys.argv[1:])
