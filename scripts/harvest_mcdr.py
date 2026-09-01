#!/usr/bin/env python3
"""Snapshot MCDR's public issuer registry and reconcile it to EGX ISINs.

MCDR's public site exposes issuer names and security codes. Its complete
shareholder register and scheduled-operations inquiry are authenticated
services, so this collector does not claim public access to either. The public
registry is still valuable as an independent ISIN/issuer cross-check and as a
hard boundary describing what MCDR does *not* publish anonymously.
"""

from __future__ import annotations

import argparse
import datetime as dt
import gzip
import hashlib
import html
import json
import pathlib
import re
import subprocess
import time
import urllib.parse
import urllib.request


REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "data-source" / "official" / "mcdr"
STOCK_INFO = pathlib.Path(__file__).resolve().parent / "stock_info.json"
URL = "https://www.mcdr.com.eg/en/members-subscribers/issuing-companies"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36"
ROW = re.compile(
    r"<tr[^>]*>\s*<td[^>]*>(.*?)</td>\s*<td[^>]*>\s*<button[^>]*>"
    r"([A-Z0-9]{10,16})</button>",
    re.I | re.S,
)
TAG = re.compile(r"<[^>]+>")


def fetch_url(url: str, timeout: int = 60) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read()
    except OSError as error:
        # Some Homebrew Python builds do not inherit the macOS trust store,
        # while the system curl does. Use curl's verified TLS path; never turn
        # certificate verification off just to make a collector appear green.
        result = subprocess.run(
            ["curl", "--fail", "--location", "--max-time", str(timeout),
             "--user-agent", UA, url],
            capture_output=True, timeout=timeout + 5,
        )
        if result.returncode != 0:
            raise error
        return result.stdout


def fetch(timeout: int = 60) -> bytes:
    return fetch_url(URL, timeout=timeout)


def parse(page: str) -> list[dict]:
    rows: dict[tuple[str, str], dict] = {}
    for raw_name, code in ROW.findall(page):
        name = " ".join(html.unescape(TAG.sub(" ", raw_name)).split())
        code = code.upper()
        if name and code.startswith("EG"):
            rows[(code, name)] = {"isin": code, "issuerName": name}
    return sorted(rows.values(), key=lambda row: (row["isin"], row["issuerName"]))


def egx_isins() -> dict[str, str]:
    try:
        document = json.loads(STOCK_INFO.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return {
        ticker: str(values["isin"]).upper()
        for ticker, values in (document.get("companies") or {}).items()
        if values.get("isin")
    }


def build(page: bytes, *, fetched_at: str | None = None,
          lookup_rows: list[dict] | None = None,
          lookup_status: dict[str, dict] | None = None) -> dict:
    when = fetched_at or dt.datetime.now(dt.timezone.utc).isoformat()
    registry = parse(page.decode("utf-8", "replace"))
    unique = {(row["isin"], row["issuerName"]): row for row in registry}
    for row in lookup_rows or []:
        unique[(row["isin"], row["issuerName"])] = row
    registry = sorted(unique.values(), key=lambda row: (row["isin"], row["issuerName"]))
    public_isins = {row["isin"] for row in registry}
    listed = egx_isins()
    matched = {ticker: isin for ticker, isin in listed.items() if isin in public_isins}
    statuses = lookup_status or {}
    searched = {isin for isin in listed.values() if isin in statuses}
    not_found = {
        ticker: isin for ticker, isin in listed.items()
        if (statuses.get(isin) or {}).get("status") == "not_found"
    }
    transport_errors = {
        ticker: isin for ticker, isin in listed.items()
        if (statuses.get(isin) or {}).get("status") == "transport_error"
    }
    unqueried = {
        ticker: isin for ticker, isin in listed.items()
        if isin not in searched and isin not in public_isins
    }
    return {
        "schemaVersion": 2,
        "fetchedAt": when,
        "source": URL,
        "sourceSha256": hashlib.sha256(page).hexdigest(),
        "issuers": registry,
        "egxReconciliation": {
            "egxTickersWithIsin": len(listed),
            "matchedAtMcdr": len(matched),
            "exactIsinsQueried": len(searched),
            "confirmedNotFoundAfterExactSearch": not_found,
            "transportErrors": transport_errors,
            "notYetIndividuallyQueried": unqueried,
            "note": (
                "The unfiltered MCDR page is paginated. An ISIN absent from its first page "
                "is not treated as missing; only an exact completed search can establish not-found status."
            ),
        },
        "publicCoverage": {
            "issuerAndIsinDirectory": True,
            "corporateActionDefinitionsAndProcedures": True,
            "datedCorporateActionCalendar": False,
            "completeShareholderRegister": False,
            "investorTransactionHistory": False,
        },
        "limitations": [
            "MCDR's complete shareholder register is delivered to authorized issuers, not published anonymously.",
            "MCDR's scheduled-operations inquiry is an authenticated subscriber service; dates must continue to come from EGX/issuer disclosures unless licensed access is supplied.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--lookup-egx", action="store_true",
                        help="serially verify every EGX ISIN against MCDR search")
    parser.add_argument("--budget", type=int, default=0,
                        help="maximum new ISIN lookups; zero means all")
    args = parser.parse_args()
    page = fetch()
    lookup_rows: list[dict] = []
    cache_path = OUT / "lookup-cache.json"
    try:
        cache = json.loads(cache_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        cache = {}
    if args.lookup_egx:
        OUT.mkdir(parents=True, exist_ok=True)
        new = 0
        for ticker, isin in sorted(egx_isins().items()):
            held = cache.get(isin)
            if held is None:
                if args.budget and new >= args.budget:
                    continue
                query = URL + "?search=" + urllib.parse.quote(isin)
                try:
                    rows = [row for row in parse(fetch_url(query).decode("utf-8", "replace"))
                            if row["isin"] == isin]
                except OSError as error:
                    cache[isin] = {"ticker": ticker, "status": "transport_error",
                                   "error": str(error)[:160]}
                else:
                    cache[isin] = {"ticker": ticker, "status": "matched" if rows else "not_found",
                                   "rows": rows, "fetchedAt": dt.datetime.now(dt.timezone.utc).isoformat()}
                new += 1
                time.sleep(0.35)
            lookup_rows.extend((cache.get(isin) or {}).get("rows") or [])
        cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        for held in cache.values():
            lookup_rows.extend(held.get("rows") or [])
    document = build(page, lookup_rows=lookup_rows, lookup_status=cache)
    print(json.dumps({
        "mcdrIssuers": len(document["issuers"]),
        **document["egxReconciliation"],
    }, ensure_ascii=False, indent=2))
    if args.check:
        return 0
    OUT.mkdir(parents=True, exist_ok=True)
    latest = OUT / "issuer-registry.json"
    latest.write_text(json.dumps(document, ensure_ascii=False, indent=2), encoding="utf-8")
    stamp = dt.datetime.fromisoformat(document["fetchedAt"]).strftime("%Y%m%dT%H%M%SZ")
    (OUT / f"issuer-registry-{stamp}.json.gz").write_bytes(gzip.compress(
        json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode(), mtime=0
    ))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
