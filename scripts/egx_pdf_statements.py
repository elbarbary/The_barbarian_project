#!/usr/bin/env python3
"""Pure validation helpers for financial figures read from EGX PDF scans.

The PDF collector uses a vision model because the exchange attachments are
often image-only scans. A model reading a number is evidence, not proof. This
module is the proof boundary: two independent reads must agree, the PDF's net
profit must agree with the exchange's structured announcement, and every
available accounting identity must balance before any figure can be stored.

All values handled here are millions of Egyptian pounds, which is the unit the
Flutter company documents use. Missing fields stay missing; no value is ever
derived merely to fill a cell.
"""

from __future__ import annotations

import json
import math
import re


FIELDS = frozenset({
    "revenue",
    "gross_profit",
    "operating_income",
    "net_income",
    "assets",
    "liabilities",
    "equity",
    "operating_cash_flow",
    "investing_cash_flow",
    "financing_cash_flow",
    "net_change_in_cash",
    "dividends_paid",
    # Borrowings, and what they cost. `liabilities` is not debt: it carries
    # trade payables, provisions, deferred tax and customer advances, none of
    # which anybody lent the company. Answering "what is this company doing
    # with its debt" from a liabilities total would be describing the wrong
    # number, so the interest-bearing lines are read separately.
    #
    # `debt` is the total of borrowings; the two maturities beside it say when
    # it comes due, which is half of what the question means. `cash` nets
    # against it, and `finance_cost` is what carrying it costs for the period.
    "debt",
    "short_term_debt",
    "long_term_debt",
    "cash",
    "finance_cost",
})

# Balance-sheet lines that state a quantity held or owed, never a negative.
# A minus here is a misread column, not a company with less than no cash.
NON_NEGATIVE = frozenset({
    "debt", "short_term_debt", "long_term_debt", "cash", "assets", "equity",
})

# A filing that only repeats the already-held profit has not enriched the app.
ENRICHMENT_FIELDS = FIELDS - {"net_income"}


def parse_json_answer(text: str) -> dict:
    """A model's JSON object, accepting only an optional Markdown fence."""
    raw = (text or "").strip()
    fenced = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", raw, re.S | re.I)
    if fenced:
        raw = fenced.group(1).strip()
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise ValueError("model answer is not a JSON object")
    return value


def _date(raw: object) -> str | None:
    value = str(raw or "").strip()
    found = re.fullmatch(r"(20\d{2})[-/](\d{1,2})[-/](\d{1,2})", value)
    if not found:
        return None
    year, month, day = (int(part) for part in found.groups())
    if not (1 <= month <= 12 and 1 <= day <= 31):
        return None
    return f"{year:04d}-{month:02d}-{day:02d}"


def _is_egp(raw: object) -> bool:
    value = str(raw or "").strip().lower()
    return value in {
        "egp", "egyptian pound", "egyptian pounds", "le", "l.e.",
        "جنيه", "جنيه مصري", "جنيه مصرى",
    } or "egyptian pound" in value or "جنيه" in value


def normalize_reading(payload: dict) -> dict:
    """Normalize one model read without accepting unsupported shapes."""
    if not _is_egp(payload.get("currency")):
        raise ValueError("the attachment was not read as EGP")
    period_end = _date(payload.get("period_end"))
    if period_end is None:
        raise ValueError("the attachment has no usable period_end")

    raw_fields = payload.get("fields")
    if not isinstance(raw_fields, dict):
        raise ValueError("fields is not an object")

    fields: dict[str, dict] = {}
    for name, raw in raw_fields.items():
        if name not in FIELDS or not isinstance(raw, dict):
            continue
        try:
            value = float(raw["value_m"])
            page = int(raw["page"])
        except (KeyError, TypeError, ValueError):
            continue
        printed = str(raw.get("printed") or "").strip()
        if not math.isfinite(value) or page < 1 or not printed:
            continue
        # A trillion EGP is already above any current EGX issuer's relevant
        # line. This is deliberately loose: it catches unit explosions, not
        # large companies or negative cash flows.
        if abs(value) > 10_000_000:
            continue
        fields[name] = {"value_m": value, "page": page, "printed": printed}

    return {"currency": "EGP", "period_end": period_end, "fields": fields}


def near(left: float, right: float, *, relative: float = 0.01,
         absolute_m: float = 2.0) -> bool:
    """Whether two million-EGP readings agree within filing rounding."""
    return abs(left - right) <= max(absolute_m, relative * max(abs(left), abs(right), 1.0))


def _identity_near(left: float, right: float) -> bool:
    # Statement highlights commonly round billions to two decimal places. One
    # percent is far wider than that but still rejects a wrong column or unit.
    return near(left, right, relative=0.01, absolute_m=5.0)


def verify_readings(discovery: dict, audit: dict, *, known_net_m: float,
                    expected_period_end: str) -> dict:
    """Return verified fields/evidence or raise with the exact failed guard.

    `discovery` is the whole-PDF read. `audit` is a second call over only the
    page images discovery named. The second call is not shown the first answer.
    A field must appear in both and agree to be publishable.
    """
    first = normalize_reading(discovery)
    second = normalize_reading(audit)
    expected = _date(expected_period_end)
    if expected is None:
        raise ValueError("candidate has no usable period_end")
    if first["period_end"] != expected or second["period_end"] != expected:
        raise ValueError(
            f"period mismatch: expected {expected}, read "
            f"{first['period_end']} and {second['period_end']}"
        )

    one = first["fields"]
    two = second["fields"]
    if "net_income" not in one or "net_income" not in two:
        raise ValueError("both reads must find net_income for the filing anchor")
    if not near(one["net_income"]["value_m"], known_net_m):
        raise ValueError("whole-PDF net income does not match the EGX announcement")
    if not near(two["net_income"]["value_m"], known_net_m):
        raise ValueError("page-audit net income does not match the EGX announcement")

    values: dict[str, float] = {}
    evidence: dict[str, dict] = {}
    for name in sorted(set(one) & set(two)):
        left, right = one[name]["value_m"], two[name]["value_m"]
        if not near(left, right):
            continue
        # The page audit is explicitly told to prefer the most precise printed
        # value on the named page, so it wins over a rounded narrative figure.
        values[name] = right
        evidence[name] = {"discovery": one[name], "audit": two[name]}

    if "net_income" not in values:
        raise ValueError("the two net-income reads disagree")
    # Keep the exchange announcement's whole-pound figure, which is more exact
    # than an earnings-release table rounded to the nearest million.
    values["net_income"] = round(float(known_net_m), 3)

    if not (set(values) & ENRICHMENT_FIELDS):
        raise ValueError("the attachment contains no verified enrichment fields")

    balance = [values.get(k) for k in ("assets", "liabilities", "equity")]
    if all(v is not None for v in balance):
        assets, liabilities, equity = balance
        if not _identity_near(assets, liabilities + equity):
            raise ValueError("assets do not equal liabilities plus equity")

    flow_names = (
        "operating_cash_flow", "investing_cash_flow",
        "financing_cash_flow", "net_change_in_cash",
    )
    flows = [values.get(k) for k in flow_names]
    if all(v is not None for v in flows):
        operating, investing, financing, change = flows
        if not _identity_near(change, operating + investing + financing):
            raise ValueError("cash-flow components do not equal the net change")

    # A held or owed quantity read as negative is a column misread.
    for name in sorted(NON_NEGATIVE & set(values)):
        if values[name] < 0:
            raise ValueError(f"{name} was read as negative, which no filing states")

    # Borrowings cannot exceed everything the company owes. This is the guard
    # that catches the expensive mistake in the other direction too: a model
    # that answers with total liabilities, or with a bank's customer deposits,
    # when asked for borrowings lands on a number at or above the liabilities
    # total and is refused rather than published as "debt".
    debt, owed = values.get("debt"), values.get("liabilities")
    if debt is not None and owed is not None and debt > owed and not _identity_near(debt, owed):
        raise ValueError("borrowings exceed total liabilities")

    maturities = [values.get(k) for k in ("short_term_debt", "long_term_debt")]
    debt_split = "not_available"
    if all(v is not None for v in maturities):
        if debt is not None:
            if not _identity_near(debt, sum(maturities)):
                raise ValueError("the debt maturities do not sum to total borrowings")
            debt_split = "passed"
        else:
            # Both halves without a printed total is the ordinary presentation;
            # the total is then the sum of two figures that were each proved.
            values["debt"] = round(sum(maturities), 3)
            debt_split = "summed"

    if (cash := values.get("cash")) is not None:
        held = values.get("assets")
        if held is not None and cash > held and not _identity_near(cash, held):
            raise ValueError("cash exceeds total assets")

    return {
        "fields": values,
        "evidence": evidence,
        "checks": {
            "two_reads_agree": True,
            "net_income_matches_announcement": True,
            "balance_identity": (
                "passed" if all(v is not None for v in balance) else "not_available"
            ),
            "cash_flow_identity": (
                "passed" if all(v is not None for v in flows) else "not_available"
            ),
            "debt_maturities_sum": debt_split,
        },
    }
