#!/usr/bin/env python3
"""Build a source-completeness ledger for EGX, FRA and issuer websites.

An issuer website copied from a directory is a candidate source, not proof of
an investor-relations feed. This ledger keeps that distinction visible and
supports bounded reachability probes without treating a reachable home page as
a complete disclosure archive.
"""

from __future__ import annotations

import argparse
import datetime as dt
import gzip
import json
import pathlib
import subprocess
import urllib.parse


REPO = pathlib.Path(__file__).resolve().parent.parent
FILINGS = REPO / "data-source" / "egx-beta" / "filings"
FRA = REPO / "data-source" / "official" / "fra" / "fra-ledger.json"
PROFILES = pathlib.Path(__file__).resolve().parent / "company_profiles.json"
COMPANIES = REPO / "public" / "data" / "v1" / "companies.json"
OUT = REPO / "data-source" / "official" / "filing-completeness.json"
PROBE_CACHE = REPO / "data-source" / "official" / "issuer-site-probes.json"


def normalize_url(value: str) -> str | None:
    value = (value or "").strip()
    if not value or "@" in value or "[" in value or "]" in value or " " in value:
        return None
    if not value.startswith(("http://", "https://")):
        value = "https://" + value
    try:
        parsed = urllib.parse.urlsplit(value)
    except ValueError:
        return None
    if not parsed.hostname:
        return None
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path or "/", "", ""))


def load_egx() -> tuple[list[dict], list[dict]]:
    items: list[dict] = []
    months: list[dict] = []
    for path in sorted(FILINGS.glob("????-??.json.gz")):
        try:
            document = json.loads(gzip.decompress(path.read_bytes()))
        except (OSError, ValueError):
            months.append({"month": path.name[:7], "status": "unreadable"})
            continue
        rows = document.get("items") or []
        expected = document.get("expected")
        months.append({
            "month": document.get("month") or path.name[:7],
            "harvested": document.get("harvested"),
            "items": len(rows),
            "expected": expected,
            "status": "complete" if expected is not None and len(rows) >= expected else "needs_review",
        })
        items.extend(rows)
    return items, months


def ticker_from(item: dict) -> str | None:
    heading = " ".join((item.get("heading") or "", item.get("headingArabic") or ""))
    marker = ".CA)"
    where = heading.find(marker)
    if where < 0:
        return None
    start = heading.rfind("(", 0, where)
    return heading[start + 1:where].upper() if start >= 0 else None


def probe(url: str, timeout: int = 10) -> dict:
    result = subprocess.run(
        ["curl", "--location", "--max-time", str(timeout), "--silent", "--show-error",
         "--output", "/dev/null", "--write-out", "%{http_code}|%{url_effective}|%{content_type}", url],
        capture_output=True, text=True, timeout=timeout + 5,
    )
    if result.returncode != 0:
        return {"status": "unreachable", "error": result.stderr.strip()[:180]}
    code, effective, content_type = (result.stdout.split("|", 2) + ["", ""])[:3]
    return {
        "status": "reachable" if code.isdigit() and 200 <= int(code) < 400 else "http_error",
        "httpStatus": int(code) if code.isdigit() else None,
        "effectiveUrl": effective,
        "contentType": content_type or None,
    }


def build(*, probe_sites: bool = False, budget: int = 0) -> dict:
    filings, months = load_egx()
    try:
        profiles = json.loads(PROFILES.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        profiles = {}
    try:
        companies = json.loads(COMPANIES.read_text(encoding="utf-8")).get("companies") or []
    except (OSError, ValueError):
        companies = []
    try:
        fra = json.loads(FRA.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        fra = {"items": [], "failures": {"ledger": "unavailable"}}
    try:
        probes = json.loads(PROBE_CACHE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        probes = {}

    filings_by_ticker: dict[str, list[dict]] = {}
    unattributed = 0
    for item in filings:
        if ticker := ticker_from(item):
            filings_by_ticker.setdefault(ticker, []).append(item)
        else:
            # A filing whose title carries no `(TICKER.CA)` — a market notice,
            # an index review, a general circular. It is a real filing and it
            # belongs to no issuer.
            unattributed += 1

    # A filing can name a ticker this directory does not list — a delisted
    # company, a bond, an instrument that is not one of the 282 issuers below.
    # Attributed, but to nobody here.
    listed = {company.get("ticker") for company in companies if company.get("ticker")}
    off_directory = sum(len(items) for ticker, items in filings_by_ticker.items()
                        if ticker not in listed)

    rows: list[dict] = []
    new_probes = 0
    for company in sorted(companies, key=lambda row: row.get("ticker") or ""):
        ticker = company.get("ticker")
        if not ticker:
            continue
        profile = profiles.get(ticker) or {}
        website = normalize_url(profile.get("website") or "")
        if probe_sites and website and website not in probes and (not budget or new_probes < budget):
            probes[website] = probe(website) | {"probedAt": dt.datetime.now(dt.timezone.utc).isoformat()}
            new_probes += 1
        issuer_filings = sorted(filings_by_ticker.get(ticker) or [], key=lambda item: item.get("dateStamp") or "")
        rows.append({
            "ticker": ticker,
            "egxFilingCount": len(issuer_filings),
            "latestEgxFilingId": str(issuer_filings[-1].get("code")) if issuer_filings else None,
            "latestEgxFilingAt": issuer_filings[-1].get("dateStamp") if issuer_filings else None,
            "candidateIssuerWebsite": website,
            "websiteDirectorySource": profile.get("source_url"),
            "websiteStatus": probes.get(website) if website else {"status": "not_available"},
            "irArchiveStatus": "unverified" if website else "no_candidate_website",
        })
    PROBE_CACHE.parent.mkdir(parents=True, exist_ok=True)
    if probe_sites:
        PROBE_CACHE.write_text(json.dumps(probes, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        "schemaVersion": 1,
        "builtAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "egx": {
            "source": "beta.egx.com.eg news-search",
            "items": len(filings),
            # 65,231 of 191,892 — a third of the archive — carry no ticker in
            # their heading, so the per-issuer rows below sum to two thirds of
            # the total above. Both numbers were published and the difference
            # was not, which invites a reader to conclude the ledger has lost
            # a third of the exchange's filings. It has not; they are notices
            # that belong to the market rather than to a company.
            # These three account for every filing in the archive, and they
            # are published because the alternative was two numbers that did
            # not reconcile: `items` said 191,892 while the per-issuer rows
            # summed to 126,661, and the missing third was explained nowhere.
            # It is two different things, and calling both "unattributed" would
            # have been a second wrong number rather than a fix.
            "withoutTickerInHeading": unattributed,
            "tickerNotInThisDirectory": off_directory,
            "attributedToAnIssuer": len(filings) - unattributed - off_directory,
            "months": months,
            "completeMonths": sum(month["status"] == "complete" for month in months),
        },
        "fra": {
            "source": fra.get("source"),
            "items": len(fra.get("items") or []),
            "failures": fra.get("failures") or {},
        },
        "issuers": rows,
        "coverage": {
            "issuers": len(rows),
            "withEgxFilings": sum(row["egxFilingCount"] > 0 for row in rows),
            "withCandidateWebsite": sum(bool(row["candidateIssuerWebsite"]) for row in rows),
            "websitesProbed": len(probes),
            "verifiedIrArchives": 0,
        },
        "limitations": [
            "A reachable issuer home page is not proof that it publishes a complete investor-relations archive.",
            "Candidate issuer websites originate in a secondary directory and require issuer-by-issuer verification.",
            "No filing is considered absent until EGX, FRA and the issuer source have all been checked at the decision timestamp.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--probe-ir", action="store_true")
    parser.add_argument("--budget", type=int, default=0)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    document = build(probe_sites=args.probe_ir, budget=max(0, args.budget))
    # The summary drops `fra.failures`, which is the one field that separates
    # "the regulator published nothing today" from "the regulator's API refused
    # us". Both render as fraItems: 0, and only one of them is a problem.
    print(json.dumps(document["coverage"] | {
        "egxItems": document["egx"]["items"],
        "egxWithoutTickerInHeading": document["egx"]["withoutTickerInHeading"],
        "egxTickerNotInThisDirectory": document["egx"]["tickerNotInThisDirectory"],
        "egxAttributedToAnIssuer": document["egx"]["attributedToAnIssuer"],
        "fraItems": document["fra"]["items"],
        "fraFailures": document["fra"]["failures"],
    }, ensure_ascii=False, indent=2))
    if not args.check:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(document, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
