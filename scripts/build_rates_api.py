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

Every row is dated by its own source and the document by its build — see
"freshness" below. A row whose source gave no date has none.

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
import datetime
import email.utils
import json
import pathlib
import sys
import urllib.error
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import rates_ar  # noqa: E402

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

# The wider world, and why each one is here.
#
# Taken from foudalens.com's `/api/market-context`, which is the cleverest
# thing on any Egyptian markets site: it puts the EGX beside the things that
# actually move it rather than beside more Egyptian equities. Their numbers
# come off the same TradingView feed ours do — S&P, Nasdaq, FTSE, Tadawul and
# copper all reconcile to the decimal.
#
# The framing is ours, and it is the whole point. Nobody in Cairo cares about
# the S&P for its own sake; they care whether today's fall was Egypt or was
# everywhere, because those are different facts about their own holding. And
# oil and copper are here because this index is heavy with building materials,
# fertiliser and energy — a cement company's costs are on this list.
#
# Steel is in Fouda's context object and not in ours: their 1,188 is a local
# rebar quote, and there is no free feed of it that could be checked.
WORLD = [
    ("SP:SPX", "S&P 500", "index",
     "The biggest American companies. When Cairo and New York fall on the "
     "same day, the reason is usually not Egyptian."),
    ("NASDAQ:IXIC", "Nasdaq", "index",
     "American technology. The most volatile of the big indices, and the one "
     "that moves first when risk appetite turns."),
    ("TVC:UKX", "FTSE 100", "index",
     "The biggest London-listed companies."),
    ("TADAWUL:TASI", "Tadawul", "index",
     "Saudi Arabia's exchange — the nearest large market, and the one that "
     "shares this region's news."),
    ("NYMEX:CL1!", "Oil", "commodity",
     "Crude, per barrel in dollars. Egypt both produces and imports it, and "
     "it sets the cost of everything that moves."),
    ("COMEX:HG1!", "Copper", "commodity",
     "Per pound in dollars. It is in every cable and every building, which "
     "makes it a reading on construction demand worldwide."),
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


# ----------------------------------------------------------------- freshness
#
# Until 3 September 2026 this document carried no date anywhere. The only
# freshness signal on the sixteen rate cards was the Exchange screen's static
# "Quotes delayed ~15 minutes" badge (logic.js `delayed15`) — true of a live
# TradingView read, and false of everything else on the page: open.er-api.com
# publishes once a day at 00:02 UTC, and a row `carry_forward` keeps can be
# days old. The 29 August gold outage below was invisible for exactly this
# reason, and a frozen upstream would look identical to a fresh one.
#
# So the document now says when it was built (`fetched_at`) and each row says
# what its source said about its own reading (`as_of`):
#
#   * TradingView's scanner has a `time` column — the open of the bar the
#     `close` belongs to, in epoch seconds. Read on 3 September at 06:51 UTC it
#     gave 1788332400 for every EGX index = 2026-09-02T07:00:00Z, 10:00 Cairo,
#     the open of the session whose close 55,679.70 is. It is kept as that
#     instant and not flattened to a date: oil's bar opened at 1788386400 =
#     2026-09-02T22:00:00Z, which is 18:00 New York and the START of the
#     3 September trade date, so a date cut from it is right for Cairo and
#     wrong for NYMEX. The instant is what the source said; the calendar day
#     is the screen's inference to make, in the reader's own timezone.
#   * open.er-api.com gives `time_last_update_unix` (1788393751) beside the
#     RFC-2822 `time_last_update_utc` the source line has always quoted.
#   * api.gold-api.com gives `updatedAt`, "2026-09-03T06:51:24Z".
#
# A row whose source gave no stamp gets no `as_of` at all. Filling it with
# `fetched_at` would say the reading was taken this minute — which is exactly
# the claim a frozen upstream must not be allowed to make.


def utc(stamp: datetime.datetime) -> str:
    """One shape for every stamp in the document: 2026-09-03T06:51:24+00:00."""
    return stamp.astimezone(datetime.UTC).isoformat(timespec="seconds")


def from_epoch(seconds) -> str | None:
    """Epoch seconds as a source gives them, or None when it gave none."""
    if isinstance(seconds, bool) or not isinstance(seconds, (int, float)):
        return None
    if seconds <= 0:
        return None
    return utc(datetime.datetime.fromtimestamp(seconds, datetime.UTC))


def from_iso(text) -> str | None:
    """An ISO stamp as a source gives it — "2026-09-03T06:51:24Z" — or None."""
    if not isinstance(text, str) or not text:
        return None
    try:
        stamp = datetime.datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=datetime.UTC)
    return utc(stamp)


def from_rfc2822(text) -> str | None:
    """"Thu, 03 Sep 2026 00:02:31 +0000", the form open.er-api.com writes."""
    if not isinstance(text, str) or not text:
        return None
    try:
        return utc(email.utils.parsedate_to_datetime(text))
    except (TypeError, ValueError):
        return None


def dated(row: dict, as_of: str | None) -> dict:
    """Attach `as_of` only when the source gave one. Absent is the honest gap."""
    if as_of:
        row["as_of"] = as_of
    return row


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
                "columns": ["name", "close", "change", "change_abs", "time"],
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
        # The bar's open — 07:00 UTC for every EGX session — which names the
        # session this close belongs to. See "freshness" above.
        as_of = from_epoch(row[4] if len(row) > 4 else None)
        direction = "rose" if pct >= 0 else "fell"
        out.append(dated(
            {
                "id": symbol,
                "label": label,
                "level": round(level, 2),
                "change_percent": round(pct, 2),
                "change_points": round(points, 1),
                # The sentence first, as everywhere else in the app.
                "label_ar": rates_ar.label(symbol, label),
                "plain": f"{label} {direction} {abs(pct):.2f}% in the session.",
                "plain_ar": rates_ar.index_plain(symbol, pct, label),
                "token": f"{money(level)} · {'+' if pct >= 0 else '−'}{abs(pct):.2f}%",
                "workings": (
                    f"{money(level)} now\n"
                    f"{'+' if points >= 0 else '−'} {money(abs(points), 1)} points on the session\n"
                    f"= {'+' if pct >= 0 else '−'}{abs(pct):.2f}%"
                ),
                "workings_ar": rates_ar.index_workings(
                    money(level), money(abs(points), 1), pct, points >= 0
                ),
                "yardstick": (
                    f"{what} An index move says what the market did as a whole; "
                    "it says nothing about any one company in it."
                ),
                "yardstick_ar": rates_ar.yardstick(symbol),
                "source": "TradingView, EGX index feed",
            },
            as_of,
        ))
    return out


def world() -> list[dict]:
    """The prices an Egyptian holding is priced *against*."""
    payload = get(
        "https://scanner.tradingview.com/global/scan",
        json.dumps(
            {
                "symbols": {"tickers": [w[0] for w in WORLD]},
                "columns": ["close", "change", "time"],
            }
        ).encode(),
    )
    if not payload or not payload.get("data"):
        return []

    rows = {r["s"]: r["d"] for r in payload["data"]}
    out = []
    for symbol, label, kind, what in WORLD:
        row = rows.get(symbol)
        if not row or row[0] is None:
            continue
        level, pct = row[0], row[1] or 0.0
        as_of = from_epoch(row[2] if len(row) > 2 else None)
        direction = "rose" if pct >= 0 else "fell"
        unit = {"commodity": "$", "index": ""}[kind]
        out.append(dated(
            {
                "id": symbol.replace(":", "_"),
                "label": label,
                "kind": kind,
                "level": round(level, 2),
                "change_percent": round(pct, 2),
                "label_ar": rates_ar.label(symbol, label),
                "plain": f"{label} {direction} {abs(pct):.2f}% today.",
                "plain_ar": rates_ar.world_plain(symbol, pct, label),
                "token": f"{unit}{money(level)} · {'+' if pct >= 0 else '−'}{abs(pct):.2f}%",
                "workings": f"{unit}{money(level)} now, {'+' if pct >= 0 else '−'}{abs(pct):.2f}% on the day.",
                "workings_ar": rates_ar.world_workings(
                    f"{unit}{money(level)}", pct
                ),
                "yardstick": what,
                "yardstick_ar": rates_ar.yardstick(symbol),
                "source": "TradingView",
            },
            as_of,
        ))
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
    # The feed's own reading time. The unix field is the one to trust — the
    # RFC-2822 string beside it stays on the source line where it always was,
    # and is only parsed if the number is missing.
    stamped = from_epoch(payload.get("time_last_update_unix")) or from_rfc2822(as_of)

    out = []
    for code, name in PAIRS:
        per_usd = rates.get(code)
        if not per_usd:
            continue
        # Everything is quoted per US dollar, so the cross is EGP-per-USD over
        # the other currency's per-USD rate. Written out because a reader who
        # only ever sees "EUR 59.07" has no way to check it.
        egp = usd_egp / per_usd
        out.append(dated(
            {
                "code": code,
                "label": name,
                "egp": round(egp, 4),
                # Not `name.lower()`: it turned "US dollar" into "us dollar"
                # and "UAE dirham" into "uae dirham".
                "label_ar": rates_ar.label(code, name),
                "plain": f"One {name} costs {money(egp)} pounds.",
                "plain_ar": rates_ar.currency_plain(code, money(egp), name),
                "token": f"EGP {money(egp, 4)}",
                "workings": (
                    f"{money(usd_egp, 4)} pounds to the dollar\n"
                    f"÷ {money(per_usd, 4)} {code} to the dollar\n"
                    f"= {money(egp, 4)}"
                )
                if code != "USD"
                else f"{money(usd_egp, 4)} pounds to the dollar",
                "workings_ar": rates_ar.currency_workings(
                    money(egp, 4), name, code
                ),
                "yardstick": (
                    "This is the reference rate published by the central-bank "
                    "feed, not the rate a bureau will give you at the counter."
                ),
                "yardstick_ar": rates_ar.CURRENCY_YARDSTICK,
                "source": f"open.er-api.com{f', {as_of}' if as_of else ''}",
            },
            stamped,
        ))
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
        # The metal quote's own stamp. The row is two sources multiplied, and
        # this dates the one it is named for; the pound leg dates itself on
        # the US dollar row, which is where a reader checking the working
        # would look for it.
        stamped = from_iso(payload.get("updatedAt"))

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

        out.append(dated(
            {
                "id": symbol,
                "label": name,
                "usd_ounce": round(usd_ounce, 2),
                "egp_ounce": round(egp_ounce, 2),
                "egp_gram": round(egp_gram, 2),
                "karats": karats,
                "label_ar": rates_ar.label(symbol, name),
                "plain": f"A gram of {name.lower()} costs {money(egp_gram)} pounds.",
                "plain_ar": rates_ar.metal_plain(symbol, money(egp_gram), name),
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
                "yardstick_ar": (
                    "هذا هو المعدن نفسه. يضيف المحل أجور المصنعية وهامشه، "
                    "فيكون سعر الشباك أعلى دائمًا — والفارق هو المصنعية لا "
                    "سعر ذهب مختلف."
                ),
                "source": f"api.gold-api.com{f', {as_of}Z' if as_of else ''}"
                f" · pound rate from open.er-api.com",
            },
            stamped,
        ))
    return out


def published() -> dict:
    """The document this build is about to replace, or an empty one."""
    path = OUT / "latest.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return {}


def carry_forward(fresh: list[dict], before: list[dict], what: str) -> list[dict]:
    """Keep a row the upstream would not answer for this run, and say so.

    `metals()` and `currencies()` skip a row they cannot fetch, and main wrote
    the list wholesale — so an upstream having a bad minute DELETED a published
    figure. That is what happened to gold on 29 August 2026:

        ! api.gold-api.com: <urlopen error [Errno -2] Name or service not known>

    A DNS blip took gold and its karat breakdown off the Exchange screen
    entirely, and the next build would have kept it off until the fetch
    happened to succeed. Nothing said the figure had gone.

    A dated last reading is worth more than a hole, and much more than a
    silent one. The row is kept, marked `carried`, and its source line says
    when it was actually read — so the screen can show its age rather than
    present it as this minute's price.
    """
    have = {row.get("label") for row in fresh}
    kept = list(fresh)
    for row in before:
        if row.get("label") in have:
            continue
        stale = dict(row)
        # The row's own `source` already ends in the timestamp it was actually
        # read at — "api.gold-api.com, 2026-08-29T14:12:03Z" — so it dates
        # itself and goes on dating itself for as long as it is carried. This
        # flag is the machine-readable half, for a screen that wants to say so
        # rather than let a reader work it out from the stamp. Its `as_of`
        # travels with it untouched, for the same reason: a carried gold row
        # dated 2026-08-29 beside a `fetched_at` of today IS the freeze signal.
        stale["carried"] = True
        kept.append(stale)
        print(f"   ! {what}: {row.get('label')} carried forward — the host did not answer")
    return kept


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    # Taken before the first request goes out: the moment this run asked.
    fetched_at = utc(datetime.datetime.now(datetime.UTC))

    print("── Indices")
    index_rows = indices()
    print(f"   {len(index_rows)}")

    print("── The wider world")
    world_rows = world()
    print(f"   {len(world_rows)}")

    print("── The pound")
    currency_rows, usd_egp, _ = currencies()
    print(f"   {len(currency_rows)} pairs")

    print("── Metals")
    metal_rows = metals(usd_egp)
    print(f"   {len(metal_rows)}")

    # Whatever the hosts would not answer for this run keeps its last published
    # reading rather than disappearing off the screen.
    was = published()
    currency_rows = carry_forward(currency_rows, was.get("currencies") or [], "the pound")
    metal_rows = carry_forward(metal_rows, was.get("metals") or [], "metals")

    if not (index_rows or currency_rows or metal_rows or world_rows):
        print("nothing fetched — leaving the published document alone")
        return 1

    doc = {
        "fetched_at": fetched_at,
        "indices": index_rows,
        "world": world_rows,
        "currencies": currency_rows,
        "metals": metal_rows,
    }

    print(f"── fetched_at {fetched_at}")
    for row in index_rows + world_rows + currency_rows + metal_rows:
        # The stamp beside the sentence, so a --check run shows what the
        # screen will be able to say about each card's age.
        print(f"   {row.get('label'):14} {row.get('as_of') or 'no source stamp':25}  {row['plain']}")

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
