#!/usr/bin/env python3
"""Replay the verified EGX-PDF statement store into company documents.

`build_market_api.py` recreates every company document from the latest market
scan. A one-off edit therefore disappears on the next build. This deterministic
step runs after that recreation and fills only missing fields from
`pdf_statements_filed.json`; it never overwrites a non-null Mubasher or EGX
value. The bundled fixture mirrors are updated at the same time.

`--check` validates the store and reports what would change without writing.
"""

from __future__ import annotations

import argparse
import json
import pathlib

import egx_pdf_statements as V


REPO = pathlib.Path(__file__).resolve().parent.parent
STORE = pathlib.Path(__file__).resolve().parent / "pdf_statements_filed.json"
COMPANIES = REPO / "public" / "data" / "v1" / "companies"
FIXTURES = REPO / "app" / "assets" / "fixtures" / "companies"


def _find(doc: dict, label: str) -> tuple[str | None, dict | None]:
    financials = doc.get("financials") or {}
    for bucket in ("annual", "quarterly"):
        for row in financials.get(bucket) or []:
            if row.get("period") == label:
                return bucket, row
    return None, None


def apply(check: bool = False) -> int:
    if not STORE.exists():
        print("── EGX PDF statements: no verified store yet")
        return 0
    try:
        store = json.loads(STORE.read_text())
    except (OSError, json.JSONDecodeError):
        print("   verified PDF statement store is unreadable")
        return 1

    touched: dict[str, dict] = {}
    filled = skipped = 0
    for code, record in sorted((store.get("filings") or {}).items()):
        ticker = record.get("ticker")
        label = record.get("period")
        fields = record.get("fields") or {}
        if not ticker or not label or not isinstance(fields, dict):
            print(f"   skip egx-{code}: incomplete record")
            skipped += 1
            continue
        if any(name not in V.FIELDS or not isinstance(value, (int, float))
               for name, value in fields.items()):
            print(f"   skip egx-{code}: invalid field set")
            skipped += 1
            continue
        path = COMPANIES / f"{ticker}.json"
        if not path.exists():
            print(f"   skip {ticker} {label}: no company document")
            skipped += 1
            continue

        doc = touched.get(ticker) or json.loads(path.read_text())
        bucket, row = _find(doc, label)
        if row is None:
            bucket = "annual" if record.get("months") == 12 else "quarterly"
            row = {
                "period": label,
                "source": record.get("source"),
                "filed_on": record.get("filed_on"),
                "basis": record.get("basis"),
            }
            row = {k: v for k, v in row.items() if v is not None}
            doc.setdefault("financials", {}).setdefault(bucket, []).append(row)

        changes = []
        for name, value in fields.items():
            # Existing structured figures win. The PDF route exists to fill
            # gaps, not to create a third source fight over a populated cell.
            if row.get(name) is None:
                row[name] = round(float(value), 3)
                changes.append(name)
        # The balance sheet's own prior column, carried onto the row so the
        # debt step can say which way borrowings moved without a second filing
        # — the interim announcements a year earlier carry no attachment at
        # all, so this is the only route to a direction. Set before the
        # early exit below: a row whose figures are all already filled has no
        # `changes`, and that is exactly the common case here.
        comparative = record.get("comparative")
        if comparative and row.get("debt_comparative") != comparative:
            row["debt_comparative"] = comparative
            changes.append("debt_comparative")
        if not changes:
            continue

        row.setdefault("source", record.get("source"))
        row.setdefault("filed_on", record.get("filed_on"))
        if record.get("basis"):
            row.setdefault("basis", record["basis"])
        if not check:
            touched[ticker] = doc
        filled += len(changes)
        print(f"   {ticker} {label}: " + ", ".join(sorted(changes)))

    if not check:
        for ticker, doc in touched.items():
            for bucket in ("annual", "quarterly"):
                (doc.get("financials") or {}).get(bucket, []).sort(
                    key=lambda row: str(row.get("period") or "")
                )
            body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
            (COMPANIES / f"{ticker}.json").write_text(body, encoding="utf-8")
            mirror = FIXTURES / f"{ticker}.json"
            if mirror.parent.exists():
                mirror.write_text(body, encoding="utf-8")

    verb = "would fill" if check else "filled"
    print(f"── EGX PDF statements: {verb} {filled} fields across "
          f"{len(touched) if not check else 'checked'} companies; {skipped} skipped")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    return apply(parser.parse_args().check)


if __name__ == "__main__":
    raise SystemExit(main())
