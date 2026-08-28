#!/usr/bin/env python3
"""Strip figures no committed filing stands behind.

`apply_pdf_statements.py` only ever fills empty cells; it never removes. That
is right for its job and leaves one hole: a value written against a store entry
that later changed stays in the document for ever, because nothing revisits it.
After a run that dropped and restored store entries, nineteen companies carried
borrowings whose filing was no longer in the store at all — figures on a public
page that nothing traceable stood behind, which is the one thing this
repository must never publish.

CI never sees this, because `build_market_api.py` recreates every company
document from scratch each build and the replay puts back exactly what the
store holds. A long-lived working copy has no such reset. This is that reset.

A row keeps its PDF-sourced fields only while the store still holds the filing
they were read from. Everything else on the row — the exchange's own announced
profit, whatever Mubasher filed — is untouched.

    python3 scripts/prune_unbacked_pdf_fields.py [--check]
"""

from __future__ import annotations

import argparse
import glob
import json
import pathlib

import egx_pdf_statements as V

REPO = pathlib.Path(__file__).resolve().parent.parent
COMPANIES = REPO / "public" / "data" / "v1" / "companies"
FIXTURES = REPO / "app" / "assets" / "fixtures" / "companies"
STORE = pathlib.Path(__file__).resolve().parent / "pdf_statements_filed.json"

# Only the fields the attachment is the sole source of.
#
# Revenue, the balance sheet and the cash flows are also filed by Mubasher for
# most of the exchange, so a row can hold them with no attachment behind it and
# be perfectly well sourced. Borrowings are different: no other source publishes
# them for any Egyptian issuer, so one on a row whose filing is not in the store
# came from a read that no longer exists.
PDF_FIELDS = {"debt", "short_term_debt", "long_term_debt", "cash",
              "finance_cost", "debt_comparative"}


def backed_codes() -> set[str]:
    try:
        store = json.loads(STORE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return set()
    return set(store.get("filings") or {})


def prune(check: bool = False) -> int:
    codes = backed_codes()
    if not codes:
        print("!! no verified filings in the store — refusing to strip anything")
        return 1

    touched = stripped = 0
    for path in sorted(glob.glob(str(COMPANIES / "*.json"))):
        doc = json.loads(pathlib.Path(path).read_text())
        changed = False
        for bucket in ("annual", "quarterly"):
            for row in doc.get("financials", {}).get(bucket) or []:
                present = PDF_FIELDS & {k for k, v in row.items() if v is not None}
                if not present:
                    continue
                code = str(row.get("filing_id") or "")[4:]
                if code in codes:
                    continue
                for name in present:
                    del row[name]
                    stripped += 1
                changed = True
        if not changed:
            continue
        touched += 1
        # The debt block is computed from those rows, so it goes with them.
        doc.pop("debt", None)
        if not check:
            body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
            pathlib.Path(path).write_text(body, encoding="utf-8")
            mirror = FIXTURES / pathlib.Path(path).name
            if mirror.parent.exists():
                mirror.write_text(body, encoding="utf-8")

    verb = "would strip" if check else "stripped"
    print(f"── Unbacked PDF figures: {verb} {stripped} field(s) from {touched} company(ies)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true")
    return prune(ap.parse_args().check)


if __name__ == "__main__":
    raise SystemExit(main())
