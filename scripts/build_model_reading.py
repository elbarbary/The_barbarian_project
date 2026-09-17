#!/usr/bin/env python3
"""The crash-warning model's last reading, in one file small enough for the app.

The app's Tools tab showed this reading from 9 Sep 2026 as figures typed into
logic.js: the score, the two engines, the stress groups, the EGX 30 close and
the V5 engine's hit rates. They could not move with the research, and some of
them disagreed with the page the tab opened. On 16 Sep the card was removed
for that reason; on 17 Sep the owner asked for it back. The only thing wrong
was that the figures were typed in, so this file carries them and the tab
reads it.

Every value here is copied, not computed, from three published research files:

  backtest/world_monitor_simulation_series.json  latest_live: the score, the
                                                 outside pressure, the volatility,
                                                 where each approach stood
  backtest/v5_simulation_series.json             its last row: the two engines,
                                                 the stress groups, transmission
  data/v1/backtest/v5_experiment_results.json    the V5 engine's recommended
                                                 production run: hits, false
                                                 alarms, time in warning

site-worker/test/fragility-overview.test.mjs holds the output to those files,
so a rerun of the research that is not followed by this script fails the
suite rather than leaving the app on the old reading.

    python3 scripts/build_model_reading.py
"""

from __future__ import annotations

import json
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = REPO / "public" / "esthmr" / "backtest"
SERIES = PUBLIC / "world_monitor_simulation_series.json"
ENGINE = PUBLIC / "v5_simulation_series.json"
RESULTS = REPO / "public" / "data" / "v1" / "backtest" / "v5_experiment_results.json"
OUT = PUBLIC / "model_reading.json"

# How many stress groups the V5 engine counts. The series' stress_count never
# goes above it, which build() checks.
STRESS_GROUPS = 7
# The rule's trigger, as the notebook states it: the score at or above this on
# two sessions in a row. fragility-overview.js holds the same number as
# ALERT_LINE, and the test holds the two together.
ALERT_LINE = 0.93


def build() -> dict:
    series = json.loads(SERIES.read_text(encoding="utf-8"))
    engine = json.loads(ENGINE.read_text(encoding="utf-8"))
    results = json.loads(RESULTS.read_text(encoding="utf-8"))

    live = series["latest_live"]
    last = dict(zip(engine["columns"], engine["series"][-1]))
    if last["date"] != live["date"]:
        raise SystemExit(f"the engine series ends on {last['date']} and the reading is for {live['date']}")
    counts = [row[engine["columns"].index("stress_count")] for row in engine["series"]]
    if max(counts) > STRESS_GROUPS:
        raise SystemExit(f"a stress count of {max(counts)} is more groups than the engine has")
    production = results["v5_recommended_production"]

    return {
        "schemaVersion": 1,
        "date": live["date"],
        "egx30": live["price"],
        "warning": bool(live["al_v2"]),
        "score": live["s_v4"],
        "alertLine": ALERT_LINE,
        "engineInternal": last["u_int"],
        "engineExternal": last["u_ext"],
        "stressGroups": last["stress_count"],
        "stressGroupsOf": STRESS_GROUPS,
        "transmission": bool(last["has_trans"]),
        "outside": live["wm_p"],
        "gold": live["gold_stress"],
        "oil": live["petrol_stress"],
        "swings": live["vol_stress"],
        "vol20": live["vol20"],
        "volBrakeActive": bool(live["vol_brake_active"]),
        "equityPercent": live["active_equity_exposure"],
        "partialPercent": live["dynamic_hedge_p"],
        "v5": {
            "model": results["metadata"]["recommended_model_name"],
            "years": results["metadata"]["eval_years"],
            "earlyHits": production["early"],
            "crises": production["total_crises"],
            "hardFalseAlarmsPerYear": production["hard_fa_yr"],
            "occupancyPercent": production["occ"],
            "precisionPercent": production["precision"],
            "leadSessions": production["lead"],
            "utility": production["utility"],
        },
    }


def main() -> int:
    reading = build()
    text = json.dumps(reading, ensure_ascii=False, indent=1) + "\n"
    held = OUT.read_text(encoding="utf-8") if OUT.exists() else None
    if held != text:
        OUT.write_text(text, encoding="utf-8")
    print(f"model reading for {reading['date']}: score {reading['score']}, "
          f"warning {'on' if reading['warning'] else 'off'} -> {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
