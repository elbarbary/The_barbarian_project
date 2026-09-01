#!/usr/bin/env python3
"""Build the monitor-facing contract for every official data layer.

The monitor reads this before ranking. It tells it what can be used, what is
stale, and which absent fields must earn zero rather than being inferred.
"""

from __future__ import annotations

import argparse

import datetime as dt
import json
import pathlib


REPO = pathlib.Path(__file__).resolve().parent.parent
OFFICIAL = REPO / "data-source" / "official"


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def age_hours(value: str | None, now: dt.datetime) -> float | None:
    if not value:
        return None
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = dt.datetime.fromisoformat(value).replace(tzinfo=dt.timezone.utc)
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return round((now - parsed.astimezone(dt.timezone.utc)).total_seconds() / 3600, 3)


def build(*, now: dt.datetime | None = None) -> dict:
    current = (now or dt.datetime.now(dt.timezone.utc)).astimezone(dt.timezone.utc)
    execution = load(OFFICIAL / "execution" / "source-status.json")
    ownership = load(OFFICIAL / "ownership" / "ownership-ledger.json")
    fra = load(OFFICIAL / "fra" / "fra-ledger.json")
    mcdr = load(OFFICIAL / "mcdr" / "issuer-registry.json")
    completeness = load(OFFICIAL / "filing-completeness.json")
    cbe = load(OFFICIAL / "cbe" / "cbe-context.json")
    checkpoints = (execution.get("publicEgx") or {}).get("checkpointObservations") or 0
    ownership_coverage = ownership.get("coverage") or {}
    mcdr_rec = mcdr.get("egxReconciliation") or {}
    sources = {
        "egxCheckpointArchive": {
            "path": "data-source/egx-beta/snapshot-history/manifest.jsonl",
            "observedAt": (execution.get("publicEgx") or {}).get("latestCheckpoint"),
            "observations": checkpoints,
            "status": "available" if checkpoints else "missing",
        },
        "ownershipLedger": {
            "path": "data-source/official/ownership/ownership-ledger.json",
            "observedAt": ownership.get("builtAt"),
            "documents": ownership_coverage.get("sourceDocuments", 0),
            "parsedDailySummaries": ownership_coverage.get("dailySummaryDocumentsParsed", 0),
            "dailySummaries": ownership_coverage.get("dailySummaryDocuments", 0),
            "status": "partial" if ownership else "missing",
        },
        "fraLedger": {
            "path": "data-source/official/fra/fra-ledger.json",
            "observedAt": fra.get("fetchedAt"),
            "items": (fra.get("coverage") or {}).get("items", 0),
            "status": "available" if fra.get("items") else "missing",
        },
        "mcdrRegistry": {
            "path": "data-source/official/mcdr/issuer-registry.json",
            "observedAt": mcdr.get("fetchedAt"),
            "matchedAtMcdr": mcdr_rec.get("matchedAtMcdr", 0),
            "exactIsinsQueried": mcdr_rec.get("exactIsinsQueried", 0),
            "notYetIndividuallyQueried": len(mcdr_rec.get("notYetIndividuallyQueried") or {}),
            "status": "partial" if mcdr else "missing",
        },
        "filingCompleteness": {
            "path": "data-source/official/filing-completeness.json",
            "observedAt": completeness.get("builtAt"),
            "issuers": (completeness.get("coverage") or {}).get("issuers", 0),
            "verifiedIrArchives": (completeness.get("coverage") or {}).get("verifiedIrArchives", 0),
            "status": "partial" if completeness else "missing",
        },
        "cbeContext": {
            "path": "data-source/official/cbe/cbe-context.json",
            "observedAt": cbe.get("fetchedAt"),
            "officialFxDate": (cbe.get("exchangeRates") or {}).get("ratesForDate"),
            "status": "available" if (cbe.get("exchangeRates") or {}).get("currencies") else "missing",
        },
    }
    for item in sources.values():
        item["ageHours"] = age_hours(item.get("observedAt"), current)
    fields = (execution.get("publicEgx") or {}).get("fields") or {}
    capabilities = {
        "officialCheckpointOhlcv": bool(fields.get("cumulativeSessionOhlcv")),
        "officialCumulativeTradedValue": bool(fields.get("actualCumulativeTradedValue")),
        "sameClockVolumePace": bool(fields.get("historicalSameTimeVolume")),
        "fiveMinuteStockBars": bool(fields.get("fiveMinuteStockBars")),
        "bestBidAsk": bool(fields.get("bestBidAsk")),
        "orderBookDepth": bool(fields.get("orderBookDepth")),
        "namedInvestorFromDailySummary": False,
        "completePublicShareholderRegister": False,
        "verifiedIssuerIrArchiveCoverage": bool(
            (completeness.get("coverage") or {}).get("verifiedIrArchives")
        ),
        "officialMacroContext": sources["cbeContext"]["status"] == "available",
    }
    return {
        "schemaVersion": 1,
        "builtAt": current.isoformat(),
        "sources": sources,
        "capabilities": capabilities,
        "monitorRules": [
            "Unavailable capabilities award zero evidence, confirmation or liquidity points.",
            "A daily insider summary cannot establish the buyer's identity.",
            "Same-clock volume pace stays disabled until at least 20 comparable checkpoint observations exist.",
            "CBE and index data are context only and transfer zero qualification points to a stock.",
            "MCDR not-yet-queried ISINs are unknown, never missing.",
        ],
    }


def main() -> int:
    # This took no arguments at all, so `--check` was accepted in the sense that
    # `sys.argv` was never read — and the file was written anyway. A validate
    # pass that writes is not a validate pass, and build_all would have run this
    # one for real during "Validate before writing anything".
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="report the contract without writing it")
    args = parser.parse_args()

    document = build()
    if not args.check:
        output = OFFICIAL / "source-health.json"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(document, ensure_ascii=False, indent=2),
                          encoding="utf-8")
    print(json.dumps({"sources": {key: value["status"] for key, value in document["sources"].items()},
                      "capabilities": document["capabilities"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
