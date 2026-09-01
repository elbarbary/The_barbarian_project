#!/usr/bin/env python3
"""Snapshot official CBE exchange-rate and interbank context.

The CBE pages are protected by a browser challenge. This collector uses the
same real-browser path as the official EGX collectors, stores the source HTML
immutably, and parses only labelled tables. Empty future dates remain null.
"""

from __future__ import annotations

import argparse
import datetime as dt
import gzip
from html.parser import HTMLParser
import json
import pathlib
import re
import subprocess
import tempfile


import scrapling_python


REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "data-source" / "official" / "cbe"
# Where the Scrapling interpreter is, wherever this is running.
#
# This hardcoded one absolute path inside one developer's home directory. That
# is the exact bug `scrapling_python` was written to end: four scripts did the
# same thing, the path does not exist on a GitHub runner, and the resulting
# non-zero exit made `build_all --check` abort the daily build before writing
# anything at all. This was the fifth.
SCRAPLING_PYTHON = scrapling_python.find()
FX_URL = "https://www.cbe.org.eg/en/economic-research/statistics/cbe-exchange-rates"
INTERBANK_URL = (
    "https://www.cbe.org.eg/en/economic-research/statistics/"
    "daily-interbank-rates-and-volumes"
)


class TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tables: list[list[list[str]]] = []
        self._table: list[list[str]] | None = None
        self._row: list[str] | None = None
        self._cell: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag == "table":
            self._table = []
        elif tag == "tr" and self._table is not None:
            self._row = []
        elif tag in {"td", "th"} and self._row is not None:
            self._cell = []

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"td", "th"} and self._cell is not None and self._row is not None:
            self._row.append(" ".join("".join(self._cell).split()))
            self._cell = None
        elif tag == "tr" and self._row is not None and self._table is not None:
            if any(self._row):
                self._table.append(self._row)
            self._row = None
        elif tag == "table" and self._table is not None:
            if self._table:
                self.tables.append(self._table)
            self._table = None


def tables(page: str) -> list[list[list[str]]]:
    parser = TableParser()
    parser.feed(page)
    return parser.tables


def numeric(value: str, *, percent: bool = False) -> float | None:
    clean = value.replace(",", "").replace("%", "").strip()
    if not clean:
        return None
    try:
        result = float(clean)
    except ValueError:
        return None
    return result / 100 if percent else result


def parse_fx(page: str) -> dict:
    match = re.search(r"Rates for Date:\s*(\d{2}/\d{2}/\d{4})", page, re.I)
    table = next((item for item in tables(page)
                  if item and item[0][:3] == ["Currency", "Buy", "Sell"]), [])
    rows = []
    for row in table[1:]:
        if len(row) >= 3 and row[0]:
            rows.append({"currency": row[0], "buy": numeric(row[1]),
                         "sell": numeric(row[2])})
    return {"ratesForDate": match.group(1) if match else None, "currencies": rows}


def _matrix(table: list[list[str]], *, percent: bool,
            zero_means_no_trade: bool = False) -> list[dict]:
    """The tenor rows of a CBE matrix.

    `zero_means_no_trade` is for the RATE table only. The CBE prints "0.000%"
    at a tenor nothing traded at that day — eight of the ten observations on
    "One Month" are that — and storing it as 0.0 puts a rate of zero per cent
    into a market whose overnight rate is 19.5%. Anything averaging the tenor
    is then dragged toward zero by the days nobody dealt.

    Not applied to the VOLUME table, where a zero is the fact itself: no
    trades is a volume of nought, and that is worth recording.
    """
    if not table or len(table[0]) < 2:
        return []
    dates = table[0][1:]
    output = []
    for row in table[1:]:
        if not row:
            continue
        values = row[1:]
        output.append({
            "tenor": row[0],
            "observations": [
                {"date": date, "value": _reading(
                    values[index] if index < len(values) else "",
                    percent=percent, zero_means_no_trade=zero_means_no_trade)}
                for index, date in enumerate(dates)
            ],
        })
    return output


def _reading(raw: str, *, percent: bool, zero_means_no_trade: bool) -> float | None:
    value = numeric(raw, percent=percent)
    if zero_means_no_trade and value == 0:
        return None
    return value


def parse_interbank(page: str) -> dict:
    year_match = re.search(r"Daily Interbank Rates\* on EGP for\s*(\d{4})", page, re.I)
    candidates = [item for item in tables(page) if item and item[0]
                  and item[0][0] == "Date"]
    rates = _matrix(candidates[0], percent=True,
                    zero_means_no_trade=True) if candidates else []
    volumes = _matrix(candidates[1], percent=False) if len(candidates) > 1 else []
    return {"year": int(year_match.group(1)) if year_match else None,
            "rates": rates, "volumesEgpMillions": volumes}


def fetch_pages() -> dict[str, str]:
    helper = """
import json, sys
from scrapling.fetchers import StealthyFetcher
out = {}
for url in sys.argv[1:]:
    response = StealthyFetcher.fetch(url, headless=True, network_idle=True, timeout=90000)
    out[url] = response.html_content
print(json.dumps(out))
"""
    with tempfile.NamedTemporaryFile("w", suffix=".py", encoding="utf-8") as handle:
        handle.write(helper)
        handle.flush()
        if not SCRAPLING_PYTHON:
            raise RuntimeError(scrapling_python.missing_note())
        result = subprocess.run(
            [str(SCRAPLING_PYTHON), handle.name, FX_URL, INTERBANK_URL],
            capture_output=True, text=True, timeout=240,
        )
    if result.returncode:
        raise RuntimeError((result.stderr or result.stdout)[-1000:])
    line = next((line for line in reversed(result.stdout.splitlines())
                 if line.lstrip().startswith("{")), "")
    return json.loads(line)


def build(pages: dict[str, str], *, fetched_at: str | None = None) -> dict:
    return {
        "schemaVersion": 1,
        "fetchedAt": fetched_at or dt.datetime.now(dt.timezone.utc).isoformat(),
        "sources": {"exchangeRates": FX_URL, "interbank": INTERBANK_URL},
        "exchangeRates": parse_fx(pages.get(FX_URL, "")),
        "interbank": parse_interbank(pages.get(INTERBANK_URL, "")),
        "units": {
            "exchangeRates": "EGP per unit of foreign currency",
            "interbankRates": "decimal fraction; 0.19623 means 19.623%. "
                              "A tenor nothing traded at is null, never zero: "
                              "the CBE prints 0.000% there and this market's "
                              "overnight rate is 19.5%.",
            "interbankVolumes": "EGP millions",
        },
        "limitations": [
            "This is market context, not a stock catalyst and awards zero opportunity-score points.",
            "CBE publication dates can lag the collector timestamp; each observation retains the official date.",
        ],
    }


# How many stored page captures to keep, per page.
#
# ~40 KB of gzipped HTML per page per run. Nightly that is an unbounded pile of
# files nothing reads: the parsed context is the record, and these are the
# evidence behind it. A fortnight answers "what did the page actually say".
KEEP_CAPTURES = 14


def prune_captures() -> int:
    """Drop all but the newest KEEP_CAPTURES of each page. Returns how many went."""
    dropped = 0
    for label in ("exchange-rates", "interbank"):
        held = sorted(OUT.glob(f"{label}-*.html.gz"))
        for path in held[:-KEEP_CAPTURES] if len(held) > KEEP_CAPTURES else []:
            path.unlink()
            dropped += 1
    return dropped


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    # An unreachable source is not a failed build.
    #
    # This let the RuntimeError out of main() and exited 1 — on a runner with
    # no browser, on a day the WAF turns us away, on any transport fault. Every
    # other collector in this repo answers that by saying so and leaving the
    # last good document in place; `build_disclosures_api` does exactly this.
    try:
        pages = fetch_pages()
    except Exception as error:  # noqa: BLE001 — any transport fault, same answer
        note = str(error).strip()
        if "leaving the published" not in note.lower():
            note += " — leaving the published context alone"
        print(f"── CBE context: {note}")
        return 0
    document = build(pages)
    summary = {
        "fxDate": document["exchangeRates"]["ratesForDate"],
        "currencies": len(document["exchangeRates"]["currencies"]),
        "interbankRateTenors": len(document["interbank"]["rates"]),
        "interbankVolumeTenors": len(document["interbank"]["volumesEgpMillions"]),
    }
    print(json.dumps(summary, indent=2))
    if args.check:
        return 0
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "cbe-context.json").write_text(
        json.dumps(document, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    stamp = dt.datetime.fromisoformat(document["fetchedAt"]).strftime("%Y%m%dT%H%M%SZ")
    for label, url in (("exchange-rates", FX_URL), ("interbank", INTERBANK_URL)):
        raw = pages.get(url, "").encode()
        (OUT / f"{label}-{stamp}.html.gz").write_bytes(gzip.compress(raw, mtime=0))
    prune_captures()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
