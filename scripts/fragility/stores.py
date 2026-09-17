#!/usr/bin/env python3
"""The crash-warning model's inputs on disk, and the one rule for adding to them.

WHY NOTHING UP TO 8 SEPTEMBER 2026 IS EVER REWRITTEN
----------------------------------------------------
The owner's research run ended on 9 September 2026. Its dataset, its scores
and every figure the research page and the videos quote were computed from the
inputs in this folder as they stood that day. They can be computed again:
build_v2_dataset.py, fed the inputs committed on 9 September, gives back 6,985
of the dataset's 6,986 rows exactly (the other, 8 September, differs in the
fourth decimal of two features because one stock's bar changed between the
build and the commit), and run_v5_precision_engine.py gives back the published
scores to the last digit.

What cannot be done is rebuild that history from today's files. The stock
prices it reads moved on: 294 files became 300 and every one was revised. A
rebuild would move scores the research published. So every input up to
COMPLETE_THROUGH stays exactly as the research read it, and the daily job only
adds the sessions after it. The engine fits each year's models on sessions
at least 25 before that year starts, so the added sessions change nothing
already scored; test_reading.py holds that.

THE RESEARCH'S LAST DAY WAS READ BEFORE IT ENDED
------------------------------------------------
Every input for 9 September itself was taken during that session. The EGX 30
reads 56,280.40 where the day closed at 56,500.74; wheat 746.50 against a
close of 711.25; EEM, the Merval and the Bovespa had no bar for the day yet;
and 248 of the exchange's stocks had no 9 September bar either, so the
dataset's row for that day fell back to its defaults (breadth 1.0 where the
day's own stocks give 0.77). The published reading of 9 September is that
snapshot, and research_2026-09-09_inputs.json keeps its inputs so the replay
can still give it back exactly. The model going forward takes 9 September
like any other session: from its closes.

NOTHING FROM TODAY
------------------
A daily bar for a day that has not finished is a price, not a close: a futures
contract trades on through the night, and the exchange's own index moves until
14:30 in Cairo. So a session is only taken once its date is behind the day the
job runs, by the UTC calendar. The reading therefore covers the sessions up to
yesterday, each with every market's close for that day.
"""
from __future__ import annotations

import json
import pathlib

REPO = pathlib.Path(__file__).resolve().parents[2]
FRAGILITY = REPO / "data-source" / "fragility"

# The research run's last session, and the last one whose inputs it read in
# full. Everything up to COMPLETE_THROUGH is kept exactly; 9 September is
# taken again from its closes.
RESEARCH_END = "2026-09-09"
COMPLETE_THROUGH = "2026-09-08"

# Every input the reading reads: where it lives, and the indent it was
# written with, so that adding a session adds lines and rewrites nothing.
STORES = {
    "egx30": ("egx30.json", 1),
    "egx70ewi": ("egx70ewi.json", 1),
    "egx100ewi": ("egx100ewi.json", 1),
    "usd_egp": ("usd_egp.json", 1),
    "cib_gdr_london": ("cib_gdr_london.json", 1),
    "egypt_1y_bond": ("egypt_1y_bond.json", 1),
    "vix": ("global_shocks/vix.json", 1),
    "msci_em": ("global_shocks/msci_em.json", 1),
    "dxy": ("global_shocks/dxy.json", 1),
    "us10y": ("global_shocks/us10y.json", 1),
    "wheat": ("global_shocks/wheat.json", 1),
    "brent": ("global_shocks/brent.json", 1),
    "wti": ("global_shocks/wti.json", 1),
    "turkey_bist100": ("em_panel/turkey_bist100.json", 1),
    "argentina_merval": ("em_panel/argentina_merval.json", 1),
    "south_africa_top40": ("em_panel/south_africa_top40.json", 1),
    "brazil_bovespa": ("em_panel/brazil_bovespa.json", 1),
    "gold": ("world_monitor/gold.json", 2),
    "ovx": ("world_monitor/ovx.json", 2),
    "gold_oil_ratio": ("world_monitor/gold_oil_ratio.json", 2),
    "brent_realized_vol20": ("world_monitor/brent_realized_vol20.json", 2),
}


def path(name: str) -> pathlib.Path:
    return FRAGILITY / STORES[name][0]


def read(name: str) -> dict[str, float]:
    return json.loads(path(name).read_text(encoding="utf-8"))


def merge(held: dict[str, float], fetched: dict[str, float], cutoff: str) -> dict[str, float]:
    """The research's sessions as they were, then the newest word on the rest.

    Up to COMPLETE_THROUGH, `held` is kept exactly, whatever `fetched` says.
    After it, a fetched value replaces a held one and a session the fetch did
    not return is kept. Nothing on or after `cutoff` is taken from either.
    """
    out = {day: value for day, value in held.items() if day <= COMPLETE_THROUGH}
    later = {day: value for day, value in held.items() if COMPLETE_THROUGH < day < cutoff}
    later.update({day: value for day, value in fetched.items() if COMPLETE_THROUGH < day < cutoff})
    out.update(later)
    return dict(sorted(out.items()))


def write(name: str, series: dict[str, float]) -> bool:
    """Write a store only when its bytes change. True if they did."""
    target = path(name)
    body = json.dumps(dict(sorted(series.items())), indent=STORES[name][1])
    held = target.read_text(encoding="utf-8") if target.exists() else None
    if held == body:
        return False
    target.write_text(body, encoding="utf-8")
    return True
