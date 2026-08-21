#!/usr/bin/env python3
"""Read filed annual financial statements off Mubasher's company pages.

Mubasher publishes each EGX company's filed statements as a JavaScript object
literal embedded in the page HTML — no API, no JS execution, no browser. The
figures are the ones the company filed with the exchange: checked line by line
against El Sewedy's own FY2024 earnings release, `Total Assets`,
`Total Liabilities`, `Total Owners' Equity` and `Net Income` match to the pound.

**The units are inconsistent and that is the dangerous part.** Within a single
company's page, some periods are stated in thousands and others in whole
pounds. El Sewedy's 2024 first quarter is whole pounds (201,164,193,251 of
assets) while its annual column is thousands (249,527,139). Getting this wrong
does not produce an obviously broken number; it produces a plausible-looking
number that is wrong by a thousand. So nothing is published on trust: every
company's figures must survive a scale check against a value we already hold
and did not get from Mubasher, and anything that fails is dropped and named.

Quarterly figures are taken too, but they are the reason this file is careful.
Within one page El Sewedy's `First Quarter` 2024 states 201,164,193,251 of
assets in whole pounds while its `annual budget` 2024 states 249,527,138.687 of
the same balance sheet in thousands — the same company, the same year, a
thousand apart, and nothing on the page saying so. So a quarter is never scaled
by the company's annual scale. Each quarterly column is scaled against the
**annual figure for its own year**, which has already survived the market-cap
test, and any quarter that cannot be brought within a sane distance of its own
year's balance sheet is dropped rather than published.

This module is pure apart from `fetch_page`, so the parsing and the scale check
can be tested without the network.
"""

from __future__ import annotations

import ast
import urllib.request

PAGE = "https://english.mubasher.info/markets/EGX/stocks/{}/financial-statements"

# Mubasher's Cloudflare answers a bare urllib or curl UA with a challenge page.
BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)

# Their robots.txt publishes `Crawl-delay: 5` and does not disallow this path.
# Five seconds is their stated rate and this job has no reason to be quick.
CRAWL_DELAY = 5

MARKER = "midata.financialStatement"

# "annual budget" is a mistranslation of الميزانية السنوية — the annual
# financials, not a forecast. It is the column that matched the filing.
ANNUAL = "annual budget"

# Mubasher's line names mapped to the app's schema. Only lines that were
# verified against the issuer's own published statements are here.
#
# Gross Profit is deliberately absent. Mubasher reports 45,918,168 for El
# Sewedy's FY2024 where the company's own release says 43,898,521 — a 4.6%
# divergence with no stated reason. It also has no revenue line anywhere on the
# page, so a gross profit could not produce a margin even if it were trusted.
#
# The four cash and dividend lines were added after counting what the page
# actually carries: ten financial lines, of which five were being read. The
# other four are not derived or inferred — they are published rows sitting
# beside the ones already trusted, and together with operating cash flow they
# are the whole cash flow statement, which means the arithmetic can be checked
# rather than believed (see `balance_check`).
LINES = {
    "Total Assets": "assets",
    "Total Liabilities": "liabilities",
    "Total Owners' Equity & Minority Interest Equity": "equity",
    "Net Income or Loss": "net_income",
    "Net Cash Flow from (Used In) Operating Activities": "operating_cash_flow",
    "Net Cash Flow from (Used In) Investing Activities": "investing_cash_flow",
    "Net Cash Flow from (Used In) Financing Activities": "financing_cash_flow",
    "Net Change In Cash & Cash Equivalents": "net_change_in_cash",
    "Total Cash Dividends Paid": "dividends_paid",
    # Not for display: it is Total Assets by another name. Kept because the
    # two arriving from different rows of the same filing is the cheapest
    # integrity check available on somebody else's numbers.
    "Total Liabilities & Shareholders' Equity": "balance_total",
}

# Lines that are checks rather than facts to publish.
INTERNAL = {"balance_total"}

# How far two published figures may disagree before the pair is worth naming.
#
# Not zero: these are rounded to thousands upstream, and a period where the
# balance sheet is off by a rounding step is not evidence of anything.
TOLERANCE = 0.005


def balance_check(period: dict) -> str | None:
    """What does not add up in this period, or None when it does.

    Three published identities, each read from separate rows:

      * assets = liabilities + equity
      * assets = the total-liabilities-and-equity row
      * net change in cash = operating + investing + financing

    None of these is derived by us, so a failure means the source disagrees
    with itself and the period should be looked at rather than shipped as if
    it were checked.
    """
    def near(left: float, right: float) -> bool:
        scale = max(abs(left), abs(right), 1.0)
        return abs(left - right) / scale <= TOLERANCE

    assets = period.get("assets")
    liabilities = period.get("liabilities")
    equity = period.get("equity")
    if assets is not None and liabilities is not None and equity is not None:
        if not near(assets, liabilities + equity):
            return (
                f"assets {assets:,.3f} against liabilities plus equity "
                f"{liabilities + equity:,.3f}"
            )

    total = period.get("balance_total")
    if assets is not None and total is not None and not near(assets, total):
        return f"assets {assets:,.3f} against the balance total {total:,.3f}"

    flows = [
        period.get("operating_cash_flow"),
        period.get("investing_cash_flow"),
        period.get("financing_cash_flow"),
    ]
    change = period.get("net_change_in_cash")
    if change is not None and all(f is not None for f in flows):
        if not near(change, sum(flows)):
            return (
                f"net change in cash {change:,.3f} against the three flows "
                f"{sum(flows):,.3f}"
            )
    return None


def fetch_page(ticker: str, timeout: int = 30) -> str | None:
    request = urllib.request.Request(
        PAGE.format(ticker),
        headers={
            "User-Agent": BROWSER_UA,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read().decode("utf-8", "replace")
    except Exception:
        return None


def extract_literal(page: str) -> dict | None:
    """The embedded statement object, or None when the page carries none.

    The literal is JavaScript rather than JSON — single-quoted keys, escaped
    apostrophes in names like "Total Owners' Equity" — so it is read with
    `ast.literal_eval` rather than `json.loads`. Its end is found by walking
    braces, because searching for a closing token would stop at the first `}`
    inside the object.
    """
    if not page or MARKER not in page:
        return None
    start = page.index("=", page.index(MARKER)) + 1
    depth = 0
    end = None
    for index in range(start, len(page)):
        char = page[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                end = index + 1
                break
    if end is None:
        return None
    literal = (
        page[start:end]
        .replace("null", "None")
        .replace("true", "True")
        .replace("false", "False")
    )
    try:
        parsed = ast.literal_eval(literal)
    except (ValueError, SyntaxError):
        return None
    return parsed if isinstance(parsed, dict) else None


# Not every EGX listing reports in pounds. Orascom Construction files in US
# dollars, and its figures would have sailed through a pounds-shaped pipeline
# looking entirely ordinary while being wrong by roughly a factor of fifty.
# The page states the currency, so it is read rather than assumed.
def reports_in_egp(statement: dict) -> bool:
    currency = (statement.get("currency") or "").upper()
    return "EGP" in currency or "EGYPTIAN" in currency


def annual_rows(statement: dict) -> dict[str, dict[str, float]]:
    """Year -> {schema field: filed value}, in whatever unit the page used."""
    rows: dict[str, dict[str, float]] = {}
    for period in statement.get("periods") or []:
        if (period.get("label") or "").strip().lower() != ANNUAL:
            continue
        for section in period.get("sections") or []:
            for record in section.get("records") or []:
                field = LINES.get((record.get("label") or "").strip())
                if not field:
                    continue
                for year, value in (record.get("values") or {}).items():
                    if value is None:
                        continue
                    rows.setdefault(str(year), {})[field] = float(value)
    return rows


# Scale is decided against market capitalisation, which is the one figure we
# hold that did not come from Mubasher. Both bands are deliberately loose: their
# job is to catch a factor of exactly 1000, not to judge whether a company is
# well run.
#
# Assets lead, because assets are stable and earnings are not. A company having
# a bad year can post a price/earnings ratio in the hundreds perfectly
# legitimately — Egypt Aluminium's 2025 profit was EGP 2m against a EGP 1.2bn
# valuation, a P/E of 601 — and an earnings-first rule threw those out as
# misreads. Total assets against market value stays inside a couple of orders of
# magnitude even for banks, which carry far more assets than they are worth.
ASSETS_TO_CAP = (0.02, 500.0)
PE_BAND = (0.3, 5000.0)


def _within(value: float, band: tuple[float, float]) -> bool:
    return band[0] <= value <= band[1]


def scale_for(rows: dict[str, dict[str, float]], market_cap: float | None) -> int | None:
    """The multiplier turning filed values into whole pounds, or None.

    Mubasher states a company either in whole pounds or in thousands and does
    not say which. Both candidates are tested against market capitalisation and
    exactly one must survive: the two differ by a thousand, so if both look
    plausible the test cannot tell them apart and guessing would be a coin toss
    on a factor of 1000.

    Returning None means publish nothing for this company. That is the point —
    a wrong scale is invisible in the output.
    """
    if not market_cap or market_cap <= 0:
        return None
    latest = max(rows, default=None)
    if latest is None:
        return None

    assets = rows[latest].get("assets")
    if assets and assets > 0:
        survivors = [
            candidate for candidate in (1, 1000)
            if _within((assets * candidate) / market_cap, ASSETS_TO_CAP)
        ]
        if len(survivors) == 1:
            return survivors[0]
        if len(survivors) > 1:
            # Ambiguous on assets. Earnings are a worse anchor but an
            # independent one, so they get to break the tie.
            profit = rows[latest].get("net_income")
            if profit and profit > 0:
                narrowed = [
                    candidate for candidate in survivors
                    if _within(market_cap / (profit * candidate), PE_BAND)
                ]
                if len(narrowed) == 1:
                    return narrowed[0]
        return None

    # No assets line: fall back to earnings alone.
    profit = rows[latest].get("net_income")
    if not profit or profit <= 0:
        return None
    survivors = [
        candidate for candidate in (1, 1000)
        if _within(market_cap / (profit * candidate), PE_BAND)
    ]
    return survivors[0] if len(survivors) == 1 else None


# Assets must equal liabilities plus equity. That is not a heuristic, it is what
# a balance sheet is, and it holds regardless of the unit everything is stated
# in — which makes it a clean check on the *parsing* to sit alongside the market
# cap check on the *scale*. Measured across the first 279 company-years
# collected, every single one balanced, so a failure means we have misread the
# page rather than found an unusual company.
BALANCE_TOLERANCE = 0.01


def balances(fields: dict[str, float]) -> bool:
    """Whether a year's balance sheet adds up, when all three lines are present."""
    assets = fields.get("assets")
    liabilities = fields.get("liabilities")
    equity = fields.get("equity")
    if assets is None or liabilities is None or equity is None:
        return True
    if assets == 0:
        return liabilities + equity == 0
    return abs((liabilities + equity) - assets) / abs(assets) <= BALANCE_TOLERANCE


# Mubasher's quarterly column labels, lower-cased. A period carries one label
# and values keyed by year, so "First Quarter" holds Q1 for every year on the
# page rather than a single quarter.
QUARTERS = {
    "first quarter": "Q1",
    "second quarter": "Q2",
    "third quarter": "Q3",
    "fourth quarter": "Q4",
    "half year": "H1",
    "nine months": "9M",
}

# How far a quarter's balance sheet may sit from its own year's annual one and
# still be believed to be in the same unit. Wide, because a balance sheet does
# move over a year — but nowhere near the factor of 1000 this is separating.
QUARTER_TO_ANNUAL = (0.15, 8.0)


def quarterly_rows(statement: dict) -> dict[str, dict[str, float]]:
    """`"Q1 2024" -> {field: filed value}`, in whatever unit the page used."""
    rows: dict[str, dict[str, float]] = {}
    for period in statement.get("periods") or []:
        short = QUARTERS.get((period.get("label") or "").strip().lower())
        if not short:
            continue
        for section in period.get("sections") or []:
            for record in section.get("records") or []:
                field = LINES.get((record.get("label") or "").strip())
                if not field:
                    continue
                for year, value in (record.get("values") or {}).items():
                    if value is None:
                        continue
                    rows.setdefault(f"{short} {year}", {})[field] = float(value)
    return rows


def scale_quarter(
    fields: dict[str, float], annual_millions: dict[str, float] | None
) -> int | None:
    """The multiplier for one quarter, judged against its own year's annual.

    The annual figures have already been scaled and checked against market
    capitalisation, so they are the firmest thing on the page to measure a
    quarter against — much firmer than market cap, which has to tolerate banks
    and loss-making years and so cannot resolve a factor of 1000 on its own.
    """
    if not annual_millions:
        return None
    reference = annual_millions.get("assets")
    quarter = fields.get("assets")
    if not reference or reference <= 0 or not quarter or quarter <= 0:
        return None
    survivors = [
        candidate for candidate in (1, 1000)
        if _within((quarter * candidate / 1_000_000) / reference, QUARTER_TO_ANNUAL)
    ]
    return survivors[0] if len(survivors) == 1 else None


def quarterly_for(
    statement: dict, annual: dict[str, dict[str, float]]
) -> dict[str, dict[str, float]]:
    """Quarterly figures in EGP millions, dropping anything unverifiable."""
    out: dict[str, dict[str, float]] = {}
    for label, fields in quarterly_rows(statement).items():
        if not balances(fields):
            continue
        year = label.split()[-1]
        scale = scale_quarter(fields, annual.get(year))
        if scale is None:
            continue
        out[label] = {
            field: round(value * scale / 1_000_000, 3)
            for field, value in fields.items()
        }
    return out


def statements_for(
    page: str, market_cap: float | None
) -> tuple[dict[str, dict[str, float]] | None, str]:
    """Annual figures in EGP millions, plus a word on why if there are none."""
    annual, _quarters, note = filed_for(page, market_cap)
    return annual, note


def filed_for(
    page: str, market_cap: float | None
) -> tuple[dict[str, dict[str, float]] | None, dict[str, dict[str, float]], str]:
    """Annual and quarterly figures in EGP millions, and why if there are none.

    Quarters ride on the annual result rather than being derived independently:
    without a year whose scale has already survived the market-cap test there
    is nothing firm enough to resolve a quarter's units against, so a company
    with no usable annual column publishes no quarters either.
    """
    statement = extract_literal(page)
    if statement is None:
        return None, {}, "no statement block on the page"
    if not reports_in_egp(statement):
        return None, {}, (
            f"reports in {statement.get('currency') or 'another currency'}"
        )
    rows = annual_rows(statement)
    if not rows:
        return None, {}, "no annual column"
    unbalanced = [year for year, fields in rows.items() if not balances(fields)]
    if unbalanced:
        return None, {}, (
            f"balance sheet does not add up ({', '.join(sorted(unbalanced))})"
        )
    scale = scale_for(rows, market_cap)
    if scale is None:
        return None, {}, "scale could not be established"
    annual = {
        year: {
            field: round(value * scale / 1_000_000, 3)
            for field, value in fields.items()
        }
        for year, fields in rows.items()
    }
    return annual, quarterly_for(statement, annual), "ok"
