#!/usr/bin/env python3
"""Audit public execution-data coverage and ingest licensed snapshots safely.

beta.egx checkpoint files provide cumulative session OHLC, volume and value.
They do not provide historical five-minute stock bars or order-book depth. This
module makes that boundary machine-readable and offers a strict ingestion
schema for a future licensed broker/vendor export.
"""

from __future__ import annotations

import argparse
import datetime as dt
import gzip
import hashlib
import json
import pathlib
import re


REPO = pathlib.Path(__file__).resolve().parent.parent
HISTORY = REPO / "data-source" / "egx-beta" / "snapshot-history"
OUT = REPO / "data-source" / "official" / "execution"
MANIFEST = HISTORY / "manifest.jsonl"
STAMP = re.compile(r"^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$")


def observations() -> tuple[list[dict], int]:
    """Captures that carry a market, and how many carried nothing.

    This counted manifest LINES. Two of the five market-watch captures on disk
    are empty — the exchange answered, with no rows — and both were counted, so
    the document named 2026-08-31T06:21:40Z as its latest checkpoint when the
    newest capture holding an actual market was the day before. A reader of that
    field would have taken the archive for a day fresher than it is.

    `historicalSameTimeVolume` was derived from the same number, which made a
    capability claim rest partly on captures with nothing in them. An empty
    capture is a real observation about the exchange and is worth keeping; it is
    not an observation OF a market and must not be counted as one.
    """
    if not MANIFEST.exists():
        return [], 0
    rows, empty = [], 0
    for line in MANIFEST.read_text(encoding="utf-8").splitlines():
        try:
            item = json.loads(line)
        except ValueError:
            continue
        if item.get("name") != "market-watch":
            continue
        if captured_rows(item) > 0:
            rows.append(item)
        else:
            empty += 1
    return rows, empty


def captured_rows(item: dict) -> int:
    """How many securities a stored capture actually holds. Unreadable is nought."""
    path = REPO / str(item.get("path") or "")
    try:
        payload = json.loads(gzip.decompress(path.read_bytes())).get("payload") or {}
    except (OSError, ValueError, json.JSONDecodeError):
        return 0
    data = payload.get("data")
    rows = data.get("data") if isinstance(data, dict) else None
    return len(rows) if isinstance(rows, list) else 0


def validate(document: dict) -> list[dict]:
    captured = str(document.get("capturedAt") or "")
    source = str(document.get("source") or "").strip()
    rows = document.get("rows")
    if not STAMP.match(captured) or not source or not isinstance(rows, list):
        raise ValueError("snapshot requires capturedAt, source and rows")
    clean: list[dict] = []
    for number, row in enumerate(rows, start=1):
        ticker = str(row.get("ticker") or "").upper().strip()
        if not ticker:
            raise ValueError(f"row {number} has no ticker")
        entry = {"ticker": ticker}
        for field in ("last", "bid", "ask", "bidSize", "askSize", "volume", "tradedValue"):
            value = row.get(field)
            if value is None:
                entry[field] = None
                continue
            try:
                parsed = float(value)
            except (TypeError, ValueError):
                raise ValueError(f"row {number} has invalid {field}") from None
            if parsed < 0:
                raise ValueError(f"row {number} has negative {field}")
            entry[field] = parsed
        bid, ask = entry.get("bid"), entry.get("ask")
        if bid and ask and ask < bid:
            raise ValueError(f"row {number} ask is below bid")
        clean.append(entry)
    return clean


def ingest(path: pathlib.Path) -> pathlib.Path:
    raw = path.read_bytes()
    document = json.loads(raw)
    rows = validate(document)
    captured = dt.datetime.fromisoformat(document["capturedAt"].replace("Z", "+00:00"))
    destination = OUT / "licensed" / captured.strftime("%Y-%m-%d")
    destination.mkdir(parents=True, exist_ok=True)
    output = destination / f"{captured.strftime('%H%M%S')}.json"
    wrapped = {
        "schemaVersion": 1,
        "capturedAt": document["capturedAt"],
        "source": document["source"],
        "licenseOrPermission": document.get("licenseOrPermission"),
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "rows": rows,
    }
    output.write_text(json.dumps(wrapped, ensure_ascii=False, indent=2), encoding="utf-8")
    return output


def status() -> dict:
    checkpoints, empty = observations()
    licensed = list((OUT / "licensed").glob("????-??-??/*.json")) if (OUT / "licensed").exists() else []
    return {
        "schemaVersion": 1,
        "updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "publicEgx": {
            "source": "beta.egx market-watch timestamped archive",
            "checkpointObservations": len(checkpoints),
            # Kept and reported rather than hidden: the exchange answering with
            # an empty market is a fact about the exchange, and a reader
            # comparing these two numbers can see how often it happens.
            "emptyCaptures": empty,
            "firstCheckpoint": checkpoints[0].get("fetchedAt") if checkpoints else None,
            "latestCheckpoint": checkpoints[-1].get("fetchedAt") if checkpoints else None,
            "fields": {
                "cumulativeSessionOhlcv": True,
                "actualCumulativeTradedValue": True,
                "numberOfTrades": True,
                "fiveMinuteStockBars": False,
                "historicalSameTimeVolume": len(checkpoints) >= 20,
                "bestBidAsk": False,
                "orderBookDepth": False,
                "individualTradeTape": False,
            },
        },
        "licensedSnapshots": len(licensed),
        "decisionRule": (
            "Checkpoint differences may measure provisional same-time pace only after enough "
            "same-clock observations exist. They are not order-book or completed-session evidence."
        ),
        "gap": (
            "A licensed broker/vendor export is still required for five-minute stock bars, "
            "spread, depth and the individual trade tape. No public source is substituted."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ingest", type=pathlib.Path)
    parser.add_argument("--check", action="store_true",
                        help="report the coverage without writing it")
    args = parser.parse_args()

    # No archive is not the same fact as no coverage.
    #
    # `observations()` returns [] when the manifest is absent, and this wrote
    # the document anyway — so anywhere the checkpoint archive had not been
    # fetched, this published "zero observations, no execution coverage" over a
    # document that had recorded real ones. That is a claim about the exchange
    # made from the state of a directory. The repo's rule everywhere else is
    # that a script with no source leaves the last good document in place.
    if not MANIFEST.exists():
        print(f"── Execution source: no checkpoint archive at "
              f"{MANIFEST.relative_to(REPO)} — leaving the published status alone")
        return 0

    if args.ingest:
        print(f"ingested {ingest(args.ingest)}")
    document = status()
    if not args.check:
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / "source-status.json").write_text(
            json.dumps(document, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    print(json.dumps(document, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
