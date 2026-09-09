#!/usr/bin/env python3
"""Ingest and persist clean historical feeds for the EGX Fragility Engine.

Pulls:
1. EGX30, EGX70EWI, EGX100EWI daily closes from Investing.com (chunked to bypass 5000-row limit).
2. USD/EGP daily exchange rate from Yahoo Finance (USDEGP=X) back to 2001.
3. CIB London GDR daily closes from Yahoo Finance (CBKD.IL) back to 2001.
4. Egypt 1-Year Sovereign Bond Yield from Investing.com (instrument 40640) back to 2010.

Saves normalized JSON files into `data-source/fragility/`.
"""

from __future__ import annotations

import datetime as dt
import json
import pathlib
import sys
import time
import urllib.request

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = REPO / "data-source" / "fragility"
OUT_DIR.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(REPO / "scripts"))
import index_history as ih  # noqa: E402


def fetch_investing_chunks(instrument_id: int, start_year: int = 1997, end_year: int = 2026) -> dict[str, float]:
    """Fetch all daily bars for an instrument id across 8-year chunks."""
    all_data: dict[str, float] = {}
    current = start_year
    today_str = dt.date.today().isoformat()
    
    while current <= end_year:
        chunk_start = f"{current}-01-01"
        chunk_end = min(f"{current + 7}-12-31", today_str)
        url = (
            f"{ih.API.format(instrument_id)}"
            f"?start-date={chunk_start}&end-date={chunk_end}&time-frame=Daily"
            f"&add-missing-rows=false"
        )
        try:
            payload = ih._get(url)
            rows = payload.get("data") or []
            for row in rows:
                stamp = (row.get("rowDateTimestamp") or "")[:10]
                raw = row.get("last_closeRaw")
                if not stamp or raw is None:
                    continue
                try:
                    close = float(str(raw))
                    if close > 0:
                        all_data[stamp] = round(close, 4)
                except (ValueError, TypeError):
                    continue
        except Exception as e:
            print(f"   [warn] error fetching {instrument_id} ({chunk_start}..{chunk_end}): {e}")
        current += 8
        time.sleep(0.5)

    return dict(sorted(all_data.items()))


def fetch_yahoo_history(ticker: str) -> dict[str, float]:
    """Fetch daily closes for a Yahoo Finance symbol back to 2000."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?period1=946684800&period2=1800000000&interval=1d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        d = json.loads(resp.read().decode("utf-8"))
    
    result = d["chart"]["result"][0]
    stamps = result.get("timestamp", [])
    closes = result["indicators"]["quote"][0].get("close", [])
    
    out: dict[str, float] = {}
    for ts, close in zip(stamps, closes):
        if ts is None or close is None:
            continue
        day = dt.datetime.fromtimestamp(ts, dt.timezone.utc).strftime("%Y-%m-%d")
        try:
            val = float(close)
            if val > 0:
                out[day] = round(val, 4)
        except (ValueError, TypeError):
            continue
            
    return dict(sorted(out.items()))


def main() -> int:
    print("── 1. Fetching Indices from Investing.com")
    # EGX30
    print("   Fetching EGX30 (1997-2026)...", flush=True)
    egx30 = fetch_investing_chunks(ih.INSTRUMENTS["EGX30"], start_year=1997)
    (OUT_DIR / "egx30.json").write_text(json.dumps(egx30, indent=1), encoding="utf-8")
    days30 = sorted(egx30)
    print(f"   EGX30 saved: {len(egx30)} sessions ({days30[0]} .. {days30[-1]})")

    # EGX70EWI
    print("   Fetching EGX70EWI (2017-2026)...", flush=True)
    egx70 = fetch_investing_chunks(ih.INSTRUMENTS["EGX70EWI"], start_year=2017)
    (OUT_DIR / "egx70ewi.json").write_text(json.dumps(egx70, indent=1), encoding="utf-8")
    days70 = sorted(egx70)
    print(f"   EGX70 saved: {len(egx70)} sessions ({days70[0]} .. {days70[-1]})")

    # EGX100EWI
    print("   Fetching EGX100EWI (2006-2026)...", flush=True)
    egx100 = fetch_investing_chunks(ih.INSTRUMENTS["EGX100EWI"], start_year=2006)
    (OUT_DIR / "egx100ewi.json").write_text(json.dumps(egx100, indent=1), encoding="utf-8")
    days100 = sorted(egx100)
    print(f"   EGX100 saved: {len(egx100)} sessions ({days100[0]} .. {days100[-1]})")

    print("\n── 2. Fetching FX and GDR from Yahoo Finance")
    # USD/EGP
    print("   Fetching USD/EGP (USDEGP=X)...", flush=True)
    usdegp = fetch_yahoo_history("USDEGP=X")
    (OUT_DIR / "usd_egp.json").write_text(json.dumps(usdegp, indent=1), encoding="utf-8")
    days_fx = sorted(usdegp)
    print(f"   USD/EGP saved: {len(usdegp)} sessions ({days_fx[0]} .. {days_fx[-1]})")

    # CIB GDR (CBKD.IL)
    print("   Fetching CIB London GDR (CBKD.IL)...", flush=True)
    cbkd = fetch_yahoo_history("CBKD.IL")
    (OUT_DIR / "cib_gdr_london.json").write_text(json.dumps(cbkd, indent=1), encoding="utf-8")
    days_gdr = sorted(cbkd)
    print(f"   CIB GDR saved: {len(cbkd)} sessions ({days_gdr[0]} .. {days_gdr[-1]})")

    print("\n── 3. Fetching Sovereign Yield from Investing.com")
    print("   Fetching Egypt 1Y Bond Yield (40640)...", flush=True)
    bond1y = fetch_investing_chunks(40640, start_year=2010)
    (OUT_DIR / "egypt_1y_bond.json").write_text(json.dumps(bond1y, indent=1), encoding="utf-8")
    days_bond = sorted(bond1y)
    print(f"   Egypt 1Y Bond Yield saved: {len(bond1y)} sessions ({days_bond[0]} .. {days_bond[-1]})")

    print("\n✓ Ingestion complete. Raw files saved to data-source/fragility/.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
