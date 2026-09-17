"""Non-optional venue checks, separate from a model's opinion.

Read the site's verified listing overlay. Never apply today's exclusions to
the evaluation of an old sealed run: these checks are for new runs and the
current workbench, not for rewriting the performance ledger.
"""
import datetime
import json
import pathlib
import re
import gzip

DATA = pathlib.Path(__file__).resolve().parents[2] / "public/data/v1"


def directory(data=DATA):
    doc = json.loads((data / "companies.json").read_text(encoding="utf-8"))
    return {r["ticker"]: r for r in doc["companies"]}


def exclusion(row, basis=None):
    listing = row.get("listing") or {}
    effective = listing.get("effective_on") or listing.get("delisted_on")
    if basis and effective and effective > basis:
        return None
    if (listing.get("status") in {"delisted", "unlisted", "suspended"}
            or str(listing.get("market", "")).upper() in {"OTC", "UNLISTED"}):
        return f"{listing.get('status', 'non-ordinary venue')}: {listing.get('market', 'not ordinary trading')}"
    return None


def financial_end(period):
    """Only supported, explicit period labels; unknown is never 'current'."""
    match = re.fullmatch(r"(FY|H1|H2|Q[1-4]|9M) (\d{4})", str(period or ""))
    if not match:
        return None
    month = {"FY": 12, "H1": 6, "H2": 12, "Q1": 3, "Q2": 6,
             "Q3": 9, "Q4": 12, "9M": 9}[match[1]]
    import calendar
    return datetime.date(int(match[2]), month, calendar.monthrange(int(match[2]), month)[1])


def issuer_clarifications(basis, folder=DATA.parents[2] / "data-source/egx-beta/filings"):
    """Dated primary-source denials, not inferred misconduct.

    Keep a 90-day trail outside the optional 14-day headline window. A later
    material filing may supersede it; the reader must reconcile the dates.
    Only explicit text in the archived release body qualifies, not its title.
    """
    start = (datetime.date.fromisoformat(basis) - datetime.timedelta(days=90)).isoformat()
    result = {}
    for file in sorted(folder.glob("*.json.gz")):
        if not start[:7] <= file.name[:7] <= basis[:7]:
            continue
        try:
            items = json.loads(gzip.decompress(file.read_bytes())).get("items", [])
        except (OSError, ValueError):
            continue
        for item in items:
            date = str(item.get("dateStamp") or "")[:10]
            text = re.sub(r"<[^>]+>", " ", item.get("content") or "")
            if not start <= date <= basis or not re.search(
                    r"no (?:material|undisclosed) information.{0,100}(?:stock|price|movement)", text, re.I):
                continue
            match = re.search(r"Reuters(?: Code)?\s*:\s*([A-Z0-9]+)\.CA", text)
            if match:
                result.setdefault(match[1], []).append({"date": date, "id": item.get("code"),
                    "kind": "issuer_no_material_information",
                    "link": f"https://www.egx.com.eg/en/NewsDetails.aspx?NewsID={item.get('code')}",
                    "excerpt": "Company reported no material information explaining the price movement."})
    return result


def risk_facts(row, measure, basis, events=()):
    period = measure.get("net_income_period") or row.get("net_income_period")
    end = financial_end(period)
    age = (datetime.date.fromisoformat(basis) - end).days if end else None
    flags = []
    if age is None or age < 0:
        flags.append("financial recency unverified")
    elif age > 270:
        flags.append("financial period over 270 days old")
    change = measure.get("change_20")
    if isinstance(change, (int, float)) and abs(change) >= 20:
        flags.append("large 20-session move; reversal is not evidence of recovery")
    growth = measure.get("net_income_growth")
    if isinstance(growth, (int, float)) and growth < 0:
        flags.append("reported net income declined")
    if events:
        flags.append("dated issuer clarification: no material information explaining the move; check later filings")
    arabic = {"financial recency unverified": "حداثة القوائم غير موثّقة",
              "financial period over 270 days old": "الفترة المالية أقدم من 270 يوماً",
              "large 20-session move; reversal is not evidence of recovery": "حركة كبيرة خلال 20 جلسة؛ الانعكاس ليس دليل تعافٍ",
              "reported net income declined": "تراجع صافي الربح المعلن",
              "dated issuer clarification: no material information explaining the move; check later filings":
                  "إيضاح مؤرّخ من الشركة: لا معلومات جوهرية تفسر الحركة؛ راجع الإفصاحات اللاحقة"}
    return {"financialPeriod": period, "financialAgeDays": age,
            "change20": change, "netIncomeGrowth": growth, "flags": flags,
            "flagsAr": [arabic[f] for f in flags], "events": list(events)}
