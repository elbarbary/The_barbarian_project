#!/usr/bin/env python3
"""The world outside the exchange, in the few places it reaches Egyptian shares.

The app is company-first — filings, companies, the scanner — and its one
market-wide surface is a list of numbers with nothing attached. It says gold
costs $4,520 an ounce and never says what that does to somebody holding EGX
shares. This collects the series where that sentence can actually be written.

Four of them, chosen because each one reaches the exchange by a path made of
published figures rather than opinion:

  * **Suez Canal transits** — IMF PortWatch, daily, free, no key. Canal dues are
    among Egypt's largest foreign-currency earners. Nobody else puts this in
    front of an Egyptian retail investor.
  * **Brent and WTI** — Egypt imports energy, and the canal carries it.
  * **Egypt's own macro line** — GDP growth, inflation, FDI, remittances from
    the World Bank. Annual, so backdrop rather than news.
  * The gold, silver and pound series already collected in `index_history`.

**Every source is checked before it is believed**, because a number in a
dashboard is indistinguishable from a wrong number in a dashboard. Where we
publish the figure already — gold, the indices — the check is against our own.
Where we do not, it is against the source's own labelling plus a band wide
enough to admit any real market and narrow enough to catch a mis-pointed feed.
Oil is the weakest link in that chain and is marked as such: there is no second
free source to cross it against, so it rests on the instrument naming itself
"Brent Oil Futures" and on the Brent-WTI spread staying sane.
"""

from __future__ import annotations

import datetime
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import fetch_relay  # noqa: E402

# ----------------------------------------------------------------- transport

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)


class MacroUnavailable(RuntimeError):
    """A source did not answer, or answered with something we will not publish."""


def _get(url: str, *, headers: dict | None = None, timeout: int = 60) -> bytes:
    # Investing refuses a CI runner's address and answers a laptop's, which is
    # why oil has been "unavailable — HTTP 403" in every build. The relay is
    # transparent where it is not configured; see scripts/fetch_relay.py.
    request = fetch_relay.request(
        url, {"User-Agent": UA, "Accept": "*/*", **(headers or {})}
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        raise MacroUnavailable(f"HTTP {error.code}") from error
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        raise MacroUnavailable(str(error)[:120]) from error


def _json(url: str, **kw) -> dict:
    try:
        return json.loads(_get(url, **kw))
    except ValueError as error:
        raise MacroUnavailable(f"not JSON: {error}") from error


# --------------------------------------------------------------------- Suez

# PortWatch publishes through an ArcGIS feature service. The portal's own
# GeoJSON endpoint answers 403 to anything without a browser session; this one
# does not, and returns the same rows.
PORTWATCH = (
    "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/"
    "Daily_Chokepoints_Data/FeatureServer/0/query"
)

# A quiet day is around 30 vessels and a busy one around 70. Outside this the
# feed has changed meaning — a different chokepoint, or a units change — and
# publishing it would be publishing a number we no longer understand.
SUEZ_BAND = (5, 200)


def _as_day(stamp) -> str | None:
    """ArcGIS returns this field as epoch milliseconds *or* as text.

    Which one depends on the shape of the query, not on the layer, so both are
    handled rather than assumed — an unparseable stamp drops its row instead of
    dating it wrongly.
    """
    if isinstance(stamp, (int, float)):
        return datetime.datetime.fromtimestamp(
            stamp / 1000, datetime.UTC
        ).date().isoformat()
    text = str(stamp).strip()
    for pattern in ("%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d", "%d/%m/%Y"):
        try:
            return datetime.datetime.strptime(text[:10], pattern).date().isoformat()
        except ValueError:
            continue
    return None


def suez(days: int = 400) -> list[dict]:
    """Daily transits through the canal, oldest first."""
    params = urllib.parse.urlencode(
        {
            "where": "portname='Suez Canal'",
            "outFields": "date,n_total,n_container,n_tanker,n_cargo,capacity",
            "resultRecordCount": days,
            "orderByFields": "date DESC",
            "f": "json",
        }
    )
    payload = _json(f"{PORTWATCH}?{params}")
    rows: list[dict] = []
    for feature in payload.get("features") or []:
        a = feature.get("attributes") or {}
        stamp, total = a.get("date"), a.get("n_total")
        if stamp is None or total is None:
            continue
        day = _as_day(stamp)
        if day is None:
            continue
        rows.append(
            {
                "date": day,
                "vessels": int(total),
                "container": int(a.get("n_container") or 0),
                "tanker": int(a.get("n_tanker") or 0),
                "capacity": float(a.get("capacity") or 0) or None,
            }
        )
    if not rows:
        raise MacroUnavailable("suez: no rows")

    recent = [r["vessels"] for r in rows[:30]]
    typical = sorted(recent)[len(recent) // 2]
    if not SUEZ_BAND[0] <= typical <= SUEZ_BAND[1]:
        raise MacroUnavailable(
            f"suez: a typical day reads {typical} vessels, outside {SUEZ_BAND} — "
            "this feed no longer means what it did"
        )
    rows.sort(key=lambda r: r["date"])
    return rows


# ---------------------------------------------------------------------- oil

INVESTING_PAGE = "https://www.investing.com/commodities/{}"
INVESTING_HISTORY = "https://api.investing.com/api/financialdata/historical/{}"

# Pinned by the name the page gives itself, not by the id alone. An id is a
# number in a URL and a wrong one yields a plausible chart; a page calling
# itself "Brent Oil Futures" is saying what it is.
OILS = {
    "BRENT": ("brent-oil", "Brent Oil Futures"),
    "WTI": ("crude-oil", "Crude Oil WTI Futures"),
}

# Oil has traded between $10 and $150 in living memory. Wide on purpose: this
# catches a feed pointing at something that is not a barrel, not a bad forecast.
OIL_BAND = (10.0, 300.0)

# Brent normally carries a small premium to WTI. A gap wider than this means one
# of the two is not what it says it is.
MAX_SPREAD = 25.0


def _instrument(slug: str, expect: str) -> int:
    page = _get(INVESTING_PAGE.format(slug), timeout=45).decode("utf-8", "ignore")
    where = page.find(f'"long_name":"{expect}"')
    if where < 0:
        raise MacroUnavailable(f"oil: {slug} does not call itself {expect!r}")
    window = page[max(0, where - 600) : where]
    found = re.findall(r'"instrumentId"\s*:\s*"?(\d{2,8})"?', window)
    if not found:
        raise MacroUnavailable(f"oil: no instrument id beside {expect!r}")
    return int(found[-1])


def oil(since: str, until: str) -> dict[str, dict[str, float]]:
    """`{'BRENT': {date: close}, 'WTI': {...}}`, checked for sanity."""
    out: dict[str, dict[str, float]] = {}
    for key, (slug, expect) in OILS.items():
        instrument = _instrument(slug, expect)
        payload = _json(
            f"{INVESTING_HISTORY.format(instrument)}"
            f"?start-date={since}&end-date={until}&time-frame=Daily"
            f"&add-missing-rows=false",
            headers={"domain-id": "www", "Accept": "application/json"},
        )
        points: dict[str, float] = {}
        for row in payload.get("data") or []:
            stamp = (row.get("rowDateTimestamp") or "")[:10]
            raw = row.get("last_closeRaw")
            if not stamp or raw is None:
                continue
            try:
                close = float(str(raw))
            except (TypeError, ValueError):
                continue
            if close > 0:
                points[stamp] = round(close, 2)
        if not points:
            raise MacroUnavailable(f"oil: {key} empty")
        newest = points[max(points)]
        if not OIL_BAND[0] <= newest <= OIL_BAND[1]:
            raise MacroUnavailable(
                f"oil: {key} newest close {newest} outside {OIL_BAND} — "
                "this is not a barrel of oil"
            )
        out[key] = points

    shared = set(out["BRENT"]) & set(out["WTI"])
    if shared:
        day = max(shared)
        spread = out["BRENT"][day] - out["WTI"][day]
        if abs(spread) > MAX_SPREAD:
            raise MacroUnavailable(
                f"oil: Brent and WTI are ${spread:,.2f} apart on {day} — "
                "one of these two is not the grade it claims"
            )
    return out


# ------------------------------------------------------------- Egypt's line

WORLD_BANK = "https://api.worldbank.org/v2/country/EGY/indicator/{}?format=json&per_page=8"

# Chosen because each one is a sentence an ordinary saver already understands,
# and each reaches the exchange by a path that can be written down.
INDICATORS = {
    "gdp_growth": "NY.GDP.MKTP.KD.ZG",
    "inflation": "FP.CPI.TOTL.ZG",
    "fdi": "BX.KLT.DINV.CD.WD",
    "remittances": "BX.TRF.PWKR.CD.DT",
}


def egypt_indicators() -> dict[str, dict]:
    """Latest World Bank reading per indicator, with the year it belongs to.

    Annual and revised, so this is backdrop rather than news — and it is dated
    for exactly that reason. A 2025 inflation figure sitting unlabelled beside a
    fifteen-minute price is the thing §49 was written about.
    """
    out: dict[str, dict] = {}
    for name, code in INDICATORS.items():
        try:
            payload = _json(WORLD_BANK.format(code), timeout=45)
        except MacroUnavailable:
            continue
        rows = payload[1] if len(payload) > 1 and payload[1] else []
        series = {
            r["date"]: float(r["value"])
            for r in rows
            if r.get("value") is not None and r.get("date")
        }
        if not series:
            continue
        year = max(series)
        out[name] = {"year": year, "value": series[year], "series": series}
    if not out:
        raise MacroUnavailable("world bank: nothing returned")
    return out

# ----------------------------------------------------------------- coverage

GDELT = "https://api.gdeltproject.org/api/v2/doc/doc"

# One query per series, and they are narrow on purpose.
#
# A broad Egypt query returns twelve articles of currency-rate filler — "the
# Jordanian dinar against the pound today" — from two SEO domains. The same
# service asked precisely returns *MSC Tests Transits as Container Volumes Rise
# at Suez Canal*. The difference is entirely in the asking, so these strings are
# the feature; GDELT is only the transport.
#
# `sourcelang:english` because the Arabic side is where the filler lives, and
# the Egyptian outlets this app already reads cover Arabic company news better
# than a global aggregator does.
QUERIES = {
    "suez": '"Suez Canal" (revenue OR traffic OR transits OR shipping OR tolls) '
            "sourcelang:english",
    "brent": '(oil OR crude) (Egypt OR OPEC OR supply OR demand) sourcelang:english',
    "gold": 'gold price (demand OR "central bank" OR reserves) sourcelang:english',
    "silver": 'silver price (demand OR industrial OR supply) sourcelang:english',
    "egypt": 'Egypt (inflation OR "interest rate" OR IMF OR pound OR remittances) '
             "sourcelang:english",
}

# Domains that answered the broad query with rate-table filler. Kept as a named
# list rather than a silent filter so the judgement is visible and arguable.
FILLER_DOMAINS = {"vetogate.com", "dostor.org"}

# GDELT rate-limits hard and clears quickly; one retry is usually enough.
GDELT_ATTEMPTS = 3
GDELT_PAUSE = 20


def coverage(key: str, *, days: int = 7, limit: int = 4) -> list[dict]:
    """Headlines that explain what this series has been doing.

    Somebody else's reporting, linked back to them, never rewritten. It sits
    beside a mechanism this app wrote and a correlation it measured, and it is
    the only one of the three that is not ours — which is why each item carries
    the domain that published it.
    """
    query = QUERIES.get(key)
    if not query:
        return []
    url = (
        f"{GDELT}?query={urllib.parse.quote(query)}"
        f"&mode=artlist&maxrecords={limit * 4}&format=json"
        f"&timespan={days}d&sort=hybridrel"
    )
    payload = None
    for attempt in range(GDELT_ATTEMPTS):
        try:
            payload = _json(url, timeout=60)
            break
        except MacroUnavailable:
            if attempt == GDELT_ATTEMPTS - 1:
                return []
            time.sleep(GDELT_PAUSE)
    if not payload:
        return []

    out: list[dict] = []
    seen_titles: set[str] = set()
    for article in payload.get("articles") or []:
        title = (article.get("title") or "").strip()
        domain = (article.get("domain") or "").strip().lower()
        link = (article.get("url") or "").strip()
        if not title or not link or domain in FILLER_DOMAINS:
            continue
        # The same wire story reaches a dozen sites verbatim; one is enough.
        fingerprint = title.lower()[:70]
        if fingerprint in seen_titles:
            continue
        seen_titles.add(fingerprint)
        stamp = (article.get("seendate") or "")[:8]
        out.append(
            {
                "title": title,
                "domain": domain,
                "url": link,
                "date": (
                    f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}"
                    if len(stamp) == 8
                    else ""
                ),
            }
        )
        if len(out) >= limit:
            break
    return out
