#!/usr/bin/env python3
"""Who is actually in EGX 30, EGX 70 EWI and EGX 100 EWI.

The site can already say what the three indices DID — `market-history.json`
carries 260 sessions of closing levels. It has never been able to say what
they are made OF, so a screen that wanted to show the thirty largest names on
the exchange had to guess at the membership, and a guess published under a
real index name is a fabricated fact about a real index. That is the one thing
this publisher must never emit, so the membership comes from the exchange or
it does not exist.

`/api/bff/egx/index-constituents?indexName=…` answers with the exchange's own
list, one row per company, each carrying its own membership flags. The row
also carries a price and a market capitalisation; both are ignored. Prices
belong to the market scan and to the live feed, and two sources for one figure
on one screen is how a site ends up disagreeing with itself.

WHAT THE COUNTS ARE
Not thirty, seventy and a hundred. The exchange answers 31, 70 and 101, and
31 + 70 = 101 exactly — EGX 100 is the other two put together, which is the
strongest evidence available that the three lists are internally consistent.
The counts are published as they come and the screen prints them; rounding
them to their names would be correcting the exchange about its own index.

Usage:
    python3 scripts/build_indices_api.py [--check]
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import harvest_egx_beta as beta  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "public" / "data" / "v1" / "indices.json"

SOURCE = "beta.egx.com.eg /api/bff/egx/index-constituents"

# Our id, the exchange's name for it, the flag its own rows carry, and the
# label in both languages. The flag is checked rather than trusted: a list is
# asked for by name and every row is expected to say it belongs to it.
INDICES = [
    ("EGX30", "CASE30", "casE30", "EGX 30", "إيجي إكس 30"),
    ("EGX70EWI", "EGX70_EWI", "egX70", "EGX 70 EWI", "إيجي إكس 70 متساوي الأوزان"),
    ("EGX100EWI", "EGX100_EWI", "egX100", "EGX 100 EWI", "إيجي إكس 100 متساوي الأوزان"),
]

# The same shape build_market_api.py and the quotes Worker accept. A row keyed
# by an ISIN is not a ticker, and about ten of them come back that way.
TICKER = re.compile(r"^[A-Z]{3,6}$")


def tickers(rows: list[dict], flag: str) -> list[str]:
    """`RAYA.CA` → `RAYA`, for the rows that say they are in this index.

    The `.CA` suffix is the exchange's own convention and the same one its
    filing titles use. Order is the exchange's, which is by weight rather than
    alphabetical, and is kept: it is information we did not have to compute.
    """
    out: list[str] = []
    for row in rows:
        if row.get(flag) != "Y":
            continue
        reuters = str(row.get("reuters") or "")
        ticker = reuters.split(".")[0].strip().upper()
        if TICKER.match(ticker) and ticker not in out:
            out.append(ticker)
    return out


def fetch(name: str, flag: str) -> list[str]:
    payload = beta.request(f"/api/bff/egx/index-constituents?indexName={name}")
    rows = payload.get("data")
    if not isinstance(rows, list):
        raise RuntimeError(f"{name}: no data array")
    found = tickers(rows, flag)
    if not found:
        raise RuntimeError(f"{name}: {len(rows)} rows, none of them in the index")
    return found


def held() -> dict:
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def build() -> dict:
    """The three lists, keeping the last good one for anything that refuses.

    An index does not lose thirty companies because a host had a bad minute.
    A carried list says so and says when it was read, the same bargain
    build_rates_api.py makes with a gold price: a dated last reading beats a
    hole, and beats a silent hole by much more.
    """
    before = {i.get("id"): i for i in held().get("indices", [])}
    today = datetime.date.today().isoformat()
    out = []
    for our_id, name, flag, label, label_ar in INDICES:
        try:
            found = fetch(name, flag)
            out.append({"id": our_id, "index_name": name, "label": label,
                        "label_ar": label_ar, "count": len(found),
                        "as_of": today, "tickers": found})
            print(f"   {label}: {len(found)} companies")
        except Exception as error:                        # noqa: BLE001
            kept = before.get(our_id)
            if not kept or not kept.get("tickers"):
                print(f"   ! {label}: {error} — and nothing held to fall back on")
                continue
            carried = dict(kept)
            carried["carried"] = True
            out.append(carried)
            print(f"   ! {label}: {error} — held {kept.get('as_of')}"
                  f" ({len(kept['tickers'])} companies)")
    return {"as_of": today, "source": SOURCE, "indices": out}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="fetch and report, writing nothing")
    args = parser.parse_args()

    document = build()
    if not document["indices"]:
        print("! no index answered and nothing is held — writing nothing")
        return 1
    if args.check:
        print(json.dumps({i["id"]: i["count"] for i in document["indices"]}, indent=1))
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")
    print(f"   wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
