#!/usr/bin/env python3
"""Add the newest sessions to the crash-warning model's inputs.

Every series comes from where the research took it, parsed the way the
research parsed it, so a session added today is the same kind of number as
the 6,986 before it:

  EGX 30, EGX 70 EWI, EGX 100 EWI,   Investing.com, through this project's relay
  Egypt's 1-year yield (40640)       on CI (ingest_fragility_data.py)
  USD/EGP, CIB's London GDR          Yahoo Finance (ingest_fragility_data.py)
  VIX, EEM, DXY, US 10-year, wheat,  Yahoo Finance (ingest_global_shocks.py)
  Brent, WTI
  BIST 100, Merval, JSE Top 40,      Yahoo Finance (ingest_em_panel.py)
  Bovespa
  Gold (GC=F)                        Yahoo Finance, unrounded
  OVX                                FRED's OVXCLS, by curl over HTTP/1.1
  Gold/oil ratio, Brent's 20-day     derived from the two above
  realized volatility

Gold, OVX and the two derived series come from the world monitor study of
11 September 2026 (build_world_monitor_data.py in that session, never
committed); the functions below are its own, with only the end date freed.

A GitHub runner reaches Yahoo directly, as a probe on 17 September 2026
showed for all fourteen symbols. FRED answered curl and timed out Python's own
client from the same runner, which is why the research used curl for it.

A source that fails leaves its store as it was, and says so. The reading
reports how old each input is, and `reading.py --check-inputs` fails the job
when one falls a week behind.

    python3 scripts/fragility/fetch.py
"""
from __future__ import annotations

import datetime as dt
import json
import math
import subprocess
import sys
import time
import urllib.request

import numpy as np

import stores

sys.path.insert(0, str(stores.REPO / "scripts"))
import index_history as ih  # noqa: E402
import ingest_fragility_data as domestic  # noqa: E402

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"

INVESTING = {
    "egx30": ih.INSTRUMENTS["EGX30"],
    "egx70ewi": ih.INSTRUMENTS["EGX70EWI"],
    "egx100ewi": ih.INSTRUMENTS["EGX100EWI"],
    "egypt_1y_bond": 40640,
}

# Name, Yahoo symbol, and the first second the research asked from.
YAHOO = {
    "usd_egp": ("USDEGP=X", 946684800),
    "cib_gdr_london": ("CBKD.IL", 946684800),
    "vix": ("^VIX", 883612800),
    "msci_em": ("EEM", 883612800),
    "dxy": ("DX-Y.NYB", 883612800),
    "us10y": ("^TNX", 883612800),
    "wheat": ("ZW=F", 883612800),
    "brent": ("BZ=F", 883612800),
    "wti": ("CL=F", 883612800),
    "turkey_bist100": ("XU100.IS", 883612800),
    "argentina_merval": ("^MERV", 883612800),
    "south_africa_top40": ("^J200.JO", 883612800),
    "brazil_bovespa": ("^BVSP", 883612800),
}


def yahoo_closes(symbol: str, since: int, *, rounded: bool = True, attempts: int = 3) -> dict[str, float]:
    """Daily closes as the research's ingest scripts read them."""
    until = int(time.time()) + 86400
    url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(symbol)}"
           f"?period1={since}&period2={until}&interval=1d")
    last: Exception | None = None
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
            break
        except Exception as error:  # noqa: BLE001 — every failure is reported below
            last = error
            time.sleep(2 * (attempt + 1))
    else:
        raise RuntimeError(f"{symbol}: {last}")
    result = payload["chart"]["result"][0]
    stamps = result.get("timestamp") or []
    closes = result["indicators"]["quote"][0].get("close") or []
    out: dict[str, float] = {}
    for stamp, close in zip(stamps, closes):
        if stamp is None or close is None:
            continue
        day = dt.datetime.fromtimestamp(stamp, dt.timezone.utc).strftime("%Y-%m-%d")
        value = float(close)
        if math.isnan(value):
            continue
        if rounded:
            # ingest_*.py: positive closes, to four places.
            if value > 0:
                out[day] = round(value, 4)
        else:
            # The world monitor's gold: every close, as Yahoo gives it.
            out[day] = value
    return dict(sorted(out.items()))


def fred_ovx() -> dict[str, float]:
    """OVX closes from FRED, the way the world monitor study fetched them."""
    url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=OVXCLS"
    done = subprocess.run(["curl", "--http1.1", "-s", "--fail", "--max-time", "90", url],
                          capture_output=True, text=True, check=True)
    out: dict[str, float] = {}
    for line in done.stdout.strip().split("\n")[1:]:
        parts = line.strip().split(",")
        if len(parts) == 2 and parts[1] not in ("", "."):
            try:
                out[parts[0]] = float(parts[1])
            except ValueError:
                pass
    if not out:
        raise RuntimeError("FRED answered with no OVX rows")
    return out


def gold_oil_ratio(gold: dict[str, float], brent: dict[str, float]) -> dict[str, float]:
    """The world monitor study's ratio: gold over Brent where both closed."""
    out = {}
    for day in sorted(set(gold) & set(brent)):
        oil = float(brent[day])
        if oil > 0:
            out[day] = round(float(gold[day]) / oil, 4)
    return out


def brent_realized_vol20(brent: dict[str, float]) -> dict[str, float]:
    """The world monitor study's Brent volatility: 20 daily returns, annualised."""
    days = sorted(brent)
    prices = np.array([float(brent[day]) for day in days])
    returns = np.zeros(len(prices))
    returns[1:] = (prices[1:] - prices[:-1]) / prices[:-1]
    out = {}
    for i in range(20, len(prices)):
        out[days[i]] = round(float(np.std(returns[i - 19:i + 1]) * math.sqrt(252.0)), 4)
    return out


def main() -> int:
    cutoff = dt.datetime.now(dt.timezone.utc).date().isoformat()
    print(f"── Crash-warning inputs, sessions after {stores.COMPLETE_THROUGH} and before {cutoff}")
    fetched: dict[str, dict[str, float]] = {}
    failed: dict[str, str] = {}

    for name, instrument in INVESTING.items():
        # One request from January of the research's year; the research's own
        # chunked reader, which reports an error and returns nothing.
        got = domestic.fetch_investing_chunks(instrument, start_year=int(stores.RESEARCH_END[:4]))
        if got:
            fetched[name] = got
        else:
            failed[name] = f"Investing.com instrument {instrument} returned no sessions"
    for name, (symbol, since) in YAHOO.items():
        try:
            fetched[name] = yahoo_closes(symbol, since)
        except Exception as error:  # noqa: BLE001
            failed[name] = str(error)[:200]
    try:
        fetched["gold"] = yahoo_closes("GC=F", 1199145600, rounded=False)
    except Exception as error:  # noqa: BLE001
        failed["gold"] = str(error)[:200]
    try:
        fetched["ovx"] = fred_ovx()
    except Exception as error:  # noqa: BLE001
        failed["ovx"] = str(error)[:200]

    changed = []
    merged: dict[str, dict[str, float]] = {}
    for name in stores.STORES:
        if name in ("gold_oil_ratio", "brent_realized_vol20"):
            continue
        held = stores.read(name)
        merged[name] = stores.merge(held, fetched.get(name, {}), cutoff)
        added = sorted(set(merged[name]) - set(held))
        if stores.write(name, merged[name]):
            changed.append(name)
        print(f"   {name:20s} {'FAILED' if name in failed else 'ok':6s} newest {max(merged[name])}"
              f"{f'  +{len(added)}' if added else ''}")

    # The two derived series follow their sources, sessions after the research only.
    for name, derived in (("gold_oil_ratio", gold_oil_ratio(merged["gold"], merged["brent"])),
                          ("brent_realized_vol20", brent_realized_vol20(merged["brent"]))):
        held = stores.read(name)
        merged[name] = stores.merge(held, derived, cutoff)
        if stores.write(name, merged[name]):
            changed.append(name)
        print(f"   {name:20s} {'ok':6s} newest {max(merged[name])}")

    for name, why in sorted(failed.items()):
        # A GitHub annotation, so a failed source is seen on a green run.
        print(f"::warning title=Crash-warning input not fetched::{name}: {why}")
    print(f"   {len(changed)} stores changed, {len(failed)} sources failed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
