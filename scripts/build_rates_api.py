#!/usr/bin/env python3
"""Build the rates API: EGX index levels, the pound, and metals.

These are the numbers an ordinary Egyptian actually checks — the dollar, the
gram of gold — and every competitor prints them as a wall of digits. This
publishes each one with the sentence that says what it means, the arithmetic
that produced it, and what counts as an ordinary move, in the same shape as
every other figure in the app (spec §4.18, §6.2).

The gold prices are **derived, not quoted**, and that is the point. There is no
free feed of "gold per gram in Egyptian pounds"; there is a dollar price per
troy ounce and a dollar-pound rate, and the gram price is the two multiplied
and divided by 31.1035. Publishing the working means a reader can check our
number against the jeweller's, and see for themselves that the difference is
the shop's margin rather than a different truth.

Sources, all free, all checked 19 August 2026:
  * EGX index levels — TradingView's public scanner, the same upstream the
    quotes Worker uses. A direct POST works from here; only the per-company
    stock query is IP-blocked, which is why that one goes through the Worker.
  * USD/EGP and the other pairs — open.er-api.com, no key, updated daily.
  * XAU/USD and XAG/USD — api.gold-api.com, no key, updated intraday.

Usage:
    python3 scripts/build_rates_api.py [--check]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import urllib.error
import urllib.request

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "public" / "data" / "v1" / "rates"
FIXTURES = REPO / "app" / "assets" / "fixtures" / "rates"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ESTHMR/1.0"

# A troy ounce, which is not the ounce in a kitchen and is the reason a gram
# price never looks like a round fraction of the headline number.
TROY_OUNCE_GRAMS = 31.1034768

SCANNER = "https://scanner.tradingview.com/egypt/scan"
FX = "https://open.er-api.com/v6/latest/USD"
METAL = "https://api.gold-api.com/price/{}"

# The three indices a reader recognises, in the order they are usually quoted.
# TradingView carries five; TAMAYUZ and the capped variant are omitted because
# naming an index nobody follows is noise dressed as completeness.
INDICES = [
    ("EGX30", "EGX 30", "The thirty largest and most traded listings."),
    ("EGX70EWI", "EGX 70", "The next seventy, each weighted equally."),
    ("EGX100EWI", "EGX 100", "The thirty and the seventy together."),
]

# What the pound is quoted against, in the order an Egyptian reader expects.
PAIRS = [
    ("USD", "US dollar"),
    ("EUR", "Euro"),
    ("GBP", "Pound sterling"),
    ("SAR", "Saudi riyal"),
    ("AED", "UAE dirham"),
]


def get(url: str, body: bytes | None = None, timeout: int = 25):
    headers = {"User-Agent": UA}
    if body is not None:
        headers["content-type"] = "application/json"
    request = urllib.request.Request(url, data=body, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read())
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
        print(f"   ! {url.split('/')[2]}: {error}")
        return None


def money(value: float, dp: int = 2) -> str:
    whole, _, frac = f"{value:,.{dp}f}".partition(".")
    return f"{whole}.{frac}" if frac else whole


# ------------------------------------------------------------------- indices


def indices() -> list[dict]:
    payload = get(
        SCANNER,
        json.dumps(
            {
                "filter": [
                    {"left": "exchange", "operation": "equal", "right": "EGX"}
                ],
                "options": {"lang": "en"},
                "symbols": {"query": {"types": ["index"]}, "tickers": []},
                "columns": ["name", "close", "change", "change_abs"],
                "range": [0, 20],
            }
        ).encode(),
    )
    if not payload or not payload.get("data"):
        return []

    rows = {r["d"][0]: r["d"] for r in payload["data"]}
    out = []
    for symbol, label, what in INDICES:
        row = rows.get(symbol)
        if not row or row[1] is None:
            continue
        level, pct, points = row[1], row[2] or 0.0, row[3] or 0.0
        direction = "rose" if pct >= 0 else "fell"
        out.append(
            {
                "id": symbol,
                "label": label,
                "level": round(level, 2),
                "change_percent": round(pct, 2),
                "change_points": round(points, 1),
                # The sentence first, as everywhere else in the app.
                "plain": f"{label} {direction} {abs(pct):.2f}% in the session.",
                "token": f"{money(level)} · {'+' if pct >= 0 else '−'}{abs(pct):.2f}%",
                "workings": (
                    f"{money(level)} now\n"
                    f"{'+' if points >= 0 else '−'} {money(abs(points), 1)} points on the session\n"
                    f"= {'+' if pct >= 0 else '−'}{abs(pct):.2f}%"
                ),
                "yardstick": (
                    f"{what} An index move says what the market did as a whole; "
                    "it says nothing about any one company in it."
                ),
                "source": "TradingView, EGX index feed",
            }
        )
    return out


# ------------------------------------------------------------------- the pound


def currencies() -> tuple[list[dict], float | None, str]:
    payload = get(FX)
    if not payload or "rates" not in payload:
        return [], None, ""

    rates = payload["rates"]
    usd_egp = rates.get("EGP")
    if not usd_egp:
        return [], None, ""
    as_of = payload.get("time_last_update_utc", "")

    out = []
    for code, name in PAIRS:
        per_usd = rates.get(code)
        if not per_usd:
            continue
        # Everything is quoted per US dollar, so the cross is EGP-per-USD over
        # the other currency's per-USD rate. Written out because a reader who
        # only ever sees "EUR 59.07" has no way to check it.
        egp = usd_egp / per_usd
        out.append(
            {
                "code": code,
                "label": name,
                "egp": round(egp, 4),
                # Not `name.lower()`: it turned "US dollar" into "us dollar"
                # and "UAE dirham" into "uae dirham".
                "plain": f"One {name} costs {money(egp)} pounds.",
                "token": f"EGP {money(egp, 4)}",
                "workings": (
                    f"{money(usd_egp, 4)} pounds to the dollar\n"
                    f"÷ {money(per_usd, 4)} {code} to the dollar\n"
                    f"= {money(egp, 4)}"
                )
                if code != "USD"
                else f"{money(usd_egp, 4)} pounds to the dollar",
                "yardstick": (
                    "This is the reference rate published by the central-bank "
                    "feed, not the rate a bureau will give you at the counter."
                ),
                "source": f"open.er-api.com{f', {as_of}' if as_of else ''}",
            }
        )
    return out, usd_egp, as_of


# --------------------------------------------------------------------- metals

KARATS = [(24, 24 / 24), (21, 21 / 24), (18, 18 / 24)]


def metals(usd_egp: float | None) -> list[dict]:
    if not usd_egp:
        return []

    out = []
    for symbol, name in (("XAU", "Gold"), ("XAG", "Silver")):
        payload = get(METAL.format(symbol))
        if not payload or not payload.get("price"):
            continue
        usd_ounce = float(payload["price"])
        egp_ounce = usd_ounce * usd_egp
        egp_gram = egp_ounce / TROY_OUNCE_GRAMS
        as_of = (payload.get("updatedAt") or "")[:19]

        karats = (
            [
                {
                    "karat": k,
                    "egp_gram": round(egp_gram * purity, 2),
                    # Every karat is the 24-karat price times its purity, and
                    # saying so is the whole difference between a price a
                    # reader can check and a price they must take on faith.
                    "workings": (
                        f"{money(egp_gram)} a gram at 24 karat\n"
                        f"× {k}/24 pure\n"
                        f"= {money(egp_gram * purity)}"
                    ),
                }
                for k, purity in KARATS
            ]
            if symbol == "XAU"
            else []
        )

        out.append(
            {
                "id": symbol,
                "label": name,
                "usd_ounce": round(usd_ounce, 2),
                "egp_ounce": round(egp_ounce, 2),
                "egp_gram": round(egp_gram, 2),
                "karats": karats,
                "plain": f"A gram of {name.lower()} costs {money(egp_gram)} pounds.",
                "token": f"EGP {money(egp_gram)} a gram",
                # Derived, not quoted — and the derivation is published so the
                # number can be checked against a jeweller's board.
                "workings": (
                    f"${money(usd_ounce)} an ounce\n"
                    f"× {money(usd_egp, 4)} pounds to the dollar\n"
                    f"= {money(egp_ounce)} an ounce\n"
                    f"÷ {TROY_OUNCE_GRAMS:.4f} grams in a troy ounce\n"
                    f"= {money(egp_gram)} a gram"
                ),
                "yardstick": (
                    "This is the metal itself. A shop adds making charges and "
                    "its own margin, so the counter price is always higher — "
                    "the gap is the workmanship, not a different gold price."
                ),
                "source": f"api.gold-api.com{f', {as_of}Z' if as_of else ''}"
                f" · pound rate from open.er-api.com",
            }
        )
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    print("── Indices")
    index_rows = indices()
    print(f"   {len(index_rows)}")

    print("── The pound")
    currency_rows, usd_egp, _ = currencies()
    print(f"   {len(currency_rows)} pairs")

    print("── Metals")
    metal_rows = metals(usd_egp)
    print(f"   {len(metal_rows)}")

    if not (index_rows or currency_rows or metal_rows):
        print("nothing fetched — leaving the published document alone")
        return 1

    doc = {
        "indices": index_rows,
        "currencies": currency_rows,
        "metals": metal_rows,
    }

    for row in index_rows + currency_rows + metal_rows:
        print(f"   {row.get('label'):14} {row['plain']}")

    if args.check:
        return 0

    for directory in (OUT, FIXTURES):
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "latest.json").write_text(
            json.dumps(doc, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
    print(f"\nwrote {OUT / 'latest.json'} and the app fixture")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
